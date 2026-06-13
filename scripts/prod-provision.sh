#!/bin/bash
set -e

# Add local bin to PATH for local Terraform binary
export PATH="/Users/saurabhyadav/Desktop/QuantumDefence/bin:$PATH"

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting QuantumDefense AWS Production Provisioning ===${NC}"

# 1. Prerequisite Checks
echo -e "${CYAN}1. Verifying system prerequisites...${NC}"
PREREQS=("aws" "terraform" "kubectl" "helm" "docker" "jq")
for CMD in "${PREREQS[@]}"; do
  if ! command -v "$CMD" &> /dev/null; then
    echo -e "${RED}ERROR: '$CMD' is not installed. Please install it and try again.${NC}"
    exit 1
  fi
done
echo -e "${GREEN}Prerequisites OK.${NC}"

# Check AWS Credentials
if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}ERROR: Invalid or missing AWS credentials. Run 'aws configure' first.${NC}"
  exit 1
fi
echo -e "${GREEN}AWS credentials verified.${NC}"

# Function to refresh AWS session credentials
refresh_aws_credentials() {
  if aws configure export-credentials &> /dev/null; then
    echo -e "${CYAN}Refreshing AWS session credentials...${NC}"
    CREDS=$(aws configure export-credentials)
    export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r '.AccessKeyId')
    export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r '.SecretAccessKey')
    export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r '.SessionToken')
  else
    echo -e "${CYAN}No session credentials exported; using default credentials profile.${NC}"
  fi
}

# Initial credentials export
refresh_aws_credentials

# 2. Terraform Infrastructure Provisioning
echo -e "${CYAN}2. Provisioning AWS Infrastructure via Terraform...${NC}"
cd /Users/saurabhyadav/Desktop/QuantumDefence/terraform
terraform init
terraform apply -auto-approve

# Retrieve Terraform Outputs
CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
RDS_HOST=$(echo "$RDS_ENDPOINT" | cut -d':' -f1)
ECR_REGISTRY_URLS=$(terraform output -json ecr_repository_urls)
REGISTRY_URL=$(echo "$ECR_REGISTRY_URLS" | jq -r '.["auth-service"]' | cut -d'/' -f1)

echo -e "${GREEN}Infrastructure provisioned successfully!${NC}"
echo -e "EKS Cluster: $CLUSTER_NAME"
echo -e "RDS Endpoint: $RDS_HOST"
echo -e "ECR Registry: $REGISTRY_URL"

# 3. Kubeconfig Configuration
echo -e "${CYAN}3. Configuring kubectl context for EKS...${NC}"
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region us-east-1

# 4. Deploy HashiCorp Vault via Helm
echo -e "${CYAN}4. Deploying Vault to Kubernetes cluster...${NC}"
kubectl apply -f ../kubernetes/namespace.yaml
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Delete conflicting webhook configuration from previous failed runs to prevent upgrade conflicts
kubectl delete mutatingwebhookconfiguration vault-agent-injector-cfg --ignore-not-found || true

helm upgrade --install vault hashicorp/vault \
  --set "server.dev.enabled=true" \
  --set "server.dev.devRootToken=root-dev-token" \
  -n quantum-defense \
  --create-namespace

echo -e "Waiting for Vault pod to be ready..."
kubectl wait --for=condition=Ready pod/vault-0 -n quantum-defense --timeout=180s

# Deploy Nginx Ingress Controller via Helm
echo -e "${CYAN}4.1. Deploying Nginx Ingress Controller...${NC}"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb"

echo -e "Waiting for Nginx Ingress Controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s

# Populate Vault Secrets with RDS and JWT values
echo -e "Populating Vault secrets in Kubernetes..."
kubectl exec vault-0 -n quantum-defense -- env VAULT_TOKEN="root-dev-token" vault kv put secret/quantum-defense/postgres \
  username="postgres" \
  password="TacticalC2SecureDBPass!" \
  host="$RDS_HOST" \
  database="qdefense"

kubectl exec vault-0 -n quantum-defense -- env VAULT_TOKEN="root-dev-token" vault kv put secret/quantum-defense/jwt \
  secret="c2-top-secret-signing-key"

kubectl exec -i vault-0 -n quantum-defense -- env VAULT_TOKEN="root-dev-token" vault policy write c2-policy - <<EOF
path "secret/data/quantum-defense/*" {
  capabilities = ["read"]
}
EOF

# 5. Build and Push Container Images to ECR
echo -e "${CYAN}5. Building and pushing container images to ECR...${NC}"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$REGISTRY_URL"

SERVICES=("auth-service" "command-service" "threat-service" "mission-service" "frontend")
for SERVICE in "${SERVICES[@]}"; do
  echo -e "Building $SERVICE..."
  REPO_URL=$(echo "$ECR_REGISTRY_URLS" | jq -r ".[\"$SERVICE\"]")
  
  if [ "$SERVICE" = "frontend" ]; then
    # Compile production build of React app
    cd /Users/saurabhyadav/Desktop/QuantumDefence/frontend
    npm ci
    npm run build
    
    # Create production Nginx Dockerfile for Frontend inside the container
    cat <<EOF > Dockerfile
FROM nginx:stable-alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
    
    # Create matching nginx config
    cat <<EOF > nginx.conf
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
    
    docker build -t "$REPO_URL:latest" .
  else
    cd "/Users/saurabhyadav/Desktop/QuantumDefence/services/$SERVICE"
    docker build -t "$REPO_URL:latest" .
  fi
  
  echo -e "Pushing $SERVICE image to ECR..."
  docker push "$REPO_URL:latest"
done

# 6. Apply Kubernetes Application Manifests
echo -e "${CYAN}6. Deploying Application services to EKS...${NC}"
refresh_aws_credentials
cd /Users/saurabhyadav/Desktop/QuantumDefence

# Deploy ConfigMap, Ingress and Autoscalers
kubectl apply -f kubernetes/app/configmap.yaml
kubectl apply -f kubernetes/app/ingress.yaml
kubectl apply -f kubernetes/app/hpa.yaml

# Apply deployments using the dynamic ECR repo tags
SERVICES_MAP=("auth-service:auth" "command-service:command" "threat-service:threat" "mission-service:mission")
for ITEM in "${SERVICES_MAP[@]}"; do
  SVC=$(echo "$ITEM" | cut -d':' -f1)
  SCHEMA=$(echo "$ITEM" | cut -d':' -f2)
  REPO_URL=$(echo "$ECR_REGISTRY_URLS" | jq -r ".[\"$SVC\"]")
  
  # Inject ECR repo, RDS Host and custom schema parameter dynamically
  sed -e "s|quantum-defense/$SVC:latest|$REPO_URL:latest|g" \
      -e "s|db-service.quantum-defense.svc.cluster.local|$RDS_HOST|g" \
      -e "s|postgrespassword|TacticalC2SecureDBPass!|g" \
      -e "s|schema=public|schema=$SCHEMA|g" \
      "kubernetes/app/$SVC-deployment.yaml" | kubectl apply -f -
done

# Deploy Frontend
FRONTEND_REPO=$(echo "$ECR_REGISTRY_URLS" | jq -r '.["frontend"]')
sed -e "s|quantum-defense/frontend:latest|$FRONTEND_REPO:latest|g" \
    "kubernetes/app/frontend-deployment.yaml" | kubectl apply -f -

# 7. Database Initialization and Seeding
echo -e "${CYAN}7. Initializing and Seeding Database inside EKS...${NC}"
refresh_aws_credentials
echo -e "Waiting for microservice pods to be ready..."
kubectl rollout status deployment/auth-service -n quantum-defense --timeout=180s
kubectl rollout status deployment/command-service -n quantum-defense --timeout=180s

AUTH_POD=$(kubectl get pods -n quantum-defense -l app=auth-service -o jsonpath="{.items[0].metadata.name}")
COMMAND_POD=$(kubectl get pods -n quantum-defense -l app=command-service -o jsonpath="{.items[0].metadata.name}")

echo -e "Pushing Prisma Database Schemas..."
# We run schema push inside the pods so they connect through the VPC to the RDS Database
kubectl exec -n quantum-defense "$AUTH_POD" -- npx prisma db push --accept-data-loss
kubectl exec -n quantum-defense "$COMMAND_POD" -- npx prisma db push --accept-data-loss
kubectl exec -n quantum-defense "$COMMAND_POD" -- npx prisma generate

echo -e "Running seeding commands..."
kubectl exec -n quantum-defense "$AUTH_POD" -- npx prisma db seed

# Seed default domain structures via a temporary postgres client inside K8s
kubectl run pg-client --rm -i --restart=Never --image=postgres:18-alpine -n quantum-defense \
  --env="PGPASSWORD=TacticalC2SecureDBPass!" -- \
  psql -h "$RDS_HOST" -U postgres -d qdefense -c "
  SET search_path TO command;
  INSERT INTO \"Domain\" (id, name, status, description) VALUES
  (1, 'Land Force', 'Nominal', 'Ground combat operations and armored assets'),
  (2, 'Air Force', 'Nominal', 'Air space defense and air assets'),
  (3, 'Naval Fleet', 'Nominal', 'Maritime defense and surface/subsurface assets'),
  (4, 'Cyber Warfare Command', 'Nominal', 'Digital network defense and cyber assets'),
  (5, 'Space Command', 'Nominal', 'Satellite tracking and orbital assets')
  ON CONFLICT (name) DO NOTHING;
  "

kubectl run pg-client-seed --rm -i --restart=Never --image=postgres:18-alpine -n quantum-defense \
  --env="PGPASSWORD=TacticalC2SecureDBPass!" -- \
  psql -h "$RDS_HOST" -U postgres -d qdefense -c "
  SET search_path TO command;
  INSERT INTO \"MilitaryUnit\" (id, name, callsign, \"domainId\", type, status, strength, lat, lng) VALUES
  (1, '1st Armored Division', 'IRONCLAD', 1, 'Armor', 'Operational', 95, 28.6139, 77.2090),
  (2, '101st Airborne', 'EAGLE', 2, 'FighterSquadron', 'Operational', 100, 20.5937, 78.9629),
  (3, '7th Naval Fleet', 'TRIDENT', 3, 'Fleet', 'Operational', 88, 15.3173, 75.7139),
  (4, 'Cyber Defense Unit 4', 'FIREWALL', 4, 'CyberUnit', 'Operational', 92, 12.9716, 77.5946),
  (5, 'Space Control Team 9', 'ORBIT', 5, 'SpaceControl', 'Operational', 97, 13.0827, 80.2707)
  ON CONFLICT (callsign) DO NOTHING;
  "

kubectl run pg-client-assets --rm -i --restart=Never --image=postgres:18-alpine -n quantum-defense \
  --env="PGPASSWORD=TacticalC2SecureDBPass!" -- \
  psql -h "$RDS_HOST" -U postgres -d qdefense -c "
  SET search_path TO command;
  INSERT INTO \"Asset\" (id, name, type, \"unitId\", \"domainId\", status, lat, lng, speed, heading, fuel, ammo) VALUES
  (1, 'MBT-Alpha', 'Tank', 1, 1, 'Active', 28.6139, 77.2090, 45.0, 90.0, 100.0, 100.0),
  (2, 'Raptor-Strike', 'Jet', 2, 2, 'Active', 20.5937, 78.9629, 650.0, 180.0, 100.0, 100.0),
  (3, 'Aegis-Destroyer', 'Destroyer', 3, 3, 'Active', 15.3173, 75.7139, 28.0, 270.0, 100.0, 100.0),
  (4, 'Sentinel-V', 'Satellite', 5, 5, 'Active', 13.0827, 80.2707, 18000.0, 0.0, 100.0, 100.0)
  ON CONFLICT (id) DO NOTHING;
  "

# Force rollouts to reload the newly pushed images
kubectl rollout restart deployment/auth-service -n quantum-defense
kubectl rollout restart deployment/command-service -n quantum-defense
kubectl rollout restart deployment/threat-service -n quantum-defense
kubectl rollout restart deployment/mission-service -n quantum-defense
kubectl rollout restart deployment/frontend -n quantum-defense

echo -e "${GREEN}=== QuantumDefense AWS Production Provisioning Complete! ===${NC}"
echo -e "${CYAN}Fetch EKS ingress load balancer URL to view dashboard:${NC}"
echo -e "kubectl get ingress c2-ingress -n quantum-defense"
