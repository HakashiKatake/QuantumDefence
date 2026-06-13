#!/bin/bash
set -e

# Add local bin to PATH for local Terraform binary
export PATH="/Users/saurabhyadav/Desktop/QuantumDefence/bin:$PATH"

# Explicitly target us-east-1 — all AWS resources (EKS, RDS, ECR) are deployed here.
export AWS_DEFAULT_REGION="us-east-1"

# Load secrets from gitignored secrets.env — never hardcode credentials in this file.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_FILE="${SCRIPT_DIR}/secrets.env"
if [ ! -f "$SECRETS_FILE" ]; then
  echo -e "\033[0;31mERROR: $SECRETS_FILE not found.\033[0m"
  echo -e "Copy scripts/secrets.env.example to scripts/secrets.env and fill in real values."
  exit 1
fi
# shellcheck source=scripts/secrets.env
source "$SECRETS_FILE"
echo -e "\033[0;32mSecrets loaded from secrets.env\033[0m"

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

# Function to refresh AWS session credentials (no-op to prevent overriding permanent credentials)
refresh_aws_credentials() {
  echo -e "${CYAN}Using active AWS credentials provider chain...${NC}"
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
  --set "server.dev.devRootToken=${VAULT_DEV_TOKEN}" \
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
kubectl exec vault-0 -n quantum-defense -- env VAULT_TOKEN="${VAULT_DEV_TOKEN}" vault kv put secret/quantum-defense/postgres \
  username="postgres" \
  password="${DB_PASSWORD}" \
  host="$RDS_HOST" \
  database="qdefense"

kubectl exec vault-0 -n quantum-defense -- env VAULT_TOKEN="${VAULT_DEV_TOKEN}" vault kv put secret/quantum-defense/jwt \
  secret="${JWT_SECRET}"

kubectl exec -i vault-0 -n quantum-defense -- env VAULT_TOKEN="${VAULT_DEV_TOKEN}" vault policy write c2-policy - <<EOF
path "secret/data/quantum-defense/*" {
  capabilities = ["read"]
}
EOF

# 5. Build and Push Container Images to ECR
if [ "$SKIP_BUILD" = "true" ]; then
  echo -e "${GREEN}5. Skipping building and pushing container images to ECR (SKIP_BUILD=true).${NC}"
else
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
      
      docker build --platform linux/amd64 -t "$REPO_URL:latest" .
    else
      cd "/Users/saurabhyadav/Desktop/QuantumDefence/services/$SERVICE"
      docker build --platform linux/amd64 -t "$REPO_URL:latest" .
    fi
    
    echo -e "Pushing $SERVICE image to ECR..."
    docker push "$REPO_URL:latest"
  done
fi

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
      -e "s|postgrespassword|${DB_PASSWORD}|g" \
      -e "s|schema=public|schema=$SCHEMA|g" \
      "kubernetes/app/$SCHEMA-deployment.yaml" | kubectl apply -f -
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

# Retrieve ECR image URLs for temporary root pods
AUTH_IMAGE=$(echo "$ECR_REGISTRY_URLS" | jq -r '.["auth-service"]')
COMMAND_IMAGE=$(echo "$ECR_REGISTRY_URLS" | jq -r '.["command-service"]')

echo -e "Pushing Prisma Database Schemas..."
# Run prisma db push via temporary root pods (runAsUser: 0) to avoid EACCES on node_modules.
# The running service pods use USER node but node_modules is owned by root from the build stage.
# NOTE: --skip-generate is used since prisma generate already ran at image build time.

AUTH_DB_URL="postgresql://postgres:${DB_PASSWORD}@${RDS_HOST}:5432/qdefense?schema=auth"
COMMAND_DB_URL="postgresql://postgres:${DB_PASSWORD}@${RDS_HOST}:5432/qdefense?schema=command"

AUTH_OVERRIDES=$(printf '{"spec":{"securityContext":{"runAsUser":0},"containers":[{"name":"prisma-auth-push","image":"%s","command":["npx","prisma","db","push","--accept-data-loss","--skip-generate"],"env":[{"name":"DATABASE_URL","value":"%s"}]}]}}' "$AUTH_IMAGE" "$AUTH_DB_URL")
kubectl run prisma-auth-push --rm -i --restart=Never -n quantum-defense \
  --image="$AUTH_IMAGE" \
  --overrides="$AUTH_OVERRIDES"

COMMAND_OVERRIDES=$(printf '{"spec":{"securityContext":{"runAsUser":0},"containers":[{"name":"prisma-command-push","image":"%s","command":["npx","prisma","db","push","--accept-data-loss","--skip-generate"],"env":[{"name":"DATABASE_URL","value":"%s"}]}]}}' "$COMMAND_IMAGE" "$COMMAND_DB_URL")
kubectl run prisma-command-push --rm -i --restart=Never -n quantum-defense \
  --image="$COMMAND_IMAGE" \
  --overrides="$COMMAND_OVERRIDES"

echo -e "Running seeding commands..."
# Seed auth users via a temporary root pod
AUTH_POD=$(kubectl get pods -n quantum-defense -l app=auth-service -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n quantum-defense "$AUTH_POD" -- sh -c "DATABASE_URL='$AUTH_DB_URL' npx prisma db seed"

# Seed default domain structures via a temporary postgres client inside K8s
kubectl run pg-client --rm -i --restart=Never --image=postgres:16-alpine -n quantum-defense \
  --env="PGPASSWORD=${DB_PASSWORD}" -- \
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

kubectl run pg-client-seed --rm -i --restart=Never --image=postgres:16-alpine -n quantum-defense \
  --env="PGPASSWORD=${DB_PASSWORD}" -- \
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

kubectl run pg-client-assets --rm -i --restart=Never --image=postgres:16-alpine -n quantum-defense \
  --env="PGPASSWORD=${DB_PASSWORD}" -- \
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

# 8. Deploy Monitoring Stack (Prometheus + Grafana)
echo -e "${CYAN}8. Deploying Prometheus + Grafana monitoring stack...${NC}"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true
helm repo update

# Scale app deployments to 1 replica temporarily to free pod slots on t3.medium nodes
# (EKS t3.medium max-pods=17; running 2 replicas of 5 services fills the nodes)
echo -e "Temporarily scaling app deployments to 1 replica to free pod slots for monitoring..."
kubectl scale deployment auth-service command-service threat-service mission-service frontend \
  -n quantum-defense --replicas=1

# Delete any lingering failed monitoring release before installing
helm uninstall monitoring -n monitoring --ignore-not-found 2>/dev/null || true
kubectl delete job -n monitoring --all --ignore-not-found 2>/dev/null || true
kubectl delete alertmanager --all -n monitoring --ignore-not-found 2>/dev/null || true
sleep 5

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values /Users/saurabhyadav/Desktop/QuantumDefence/monitoring/helm-values.yaml \
  --set grafana.adminPassword="${GRAFANA_PASSWORD}" \
  --set prometheusOperator.admissionWebhooks.enabled=false \
  --set prometheusOperator.admissionWebhooks.patch.enabled=false \
  --set prometheusOperator.tls.enabled=false \
  --timeout 5m

echo -e "Waiting for Grafana pod to be ready..."
kubectl wait --for=condition=Ready pod \
  --selector=app.kubernetes.io/name=grafana \
  -n monitoring \
  --timeout=300s

# Scale app deployments back to 2 replicas now that monitoring is scheduled
echo -e "Scaling app deployments back to 2 replicas..."
kubectl scale deployment auth-service command-service threat-service mission-service frontend \
  -n quantum-defense --replicas=2

# 9. Expose Monitoring via Nginx Ingress
echo -e "${CYAN}9. Exposing Grafana and Prometheus via Nginx Ingress...${NC}"
kubectl apply -f /Users/saurabhyadav/Desktop/QuantumDefence/monitoring/monitoring-ingress.yaml

# 10. Automate Jenkins: plugins + credentials + pipeline job
echo -e "${CYAN}10. Configuring Jenkins CI/CD (plugins, credentials, pipeline job)...${NC}"

JENKINS_IP=$(terraform -chdir=/Users/saurabhyadav/Desktop/QuantumDefence/terraform output -raw jenkins_public_ip 2>/dev/null || echo "")
JENKINS_URL="http://${JENKINS_IP}:8080"

# Wait for Jenkins HTTP to be reachable (EC2 may still be booting)
echo -e "Waiting for Jenkins at ${JENKINS_URL}..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" "${JENKINS_URL}/login" | grep -qE "200|403"; then
    echo -e "Jenkins is up."
    break
  fi
  echo -e "  Attempt $i/30 — Jenkins not ready yet, retrying in 15s..."
  sleep 15
done

# Fetch initial admin password via SSM
JENKINS_INSTANCE_ID=$(aws ec2 describe-instances --region us-east-1 \
  --filters "Name=tag:Name,Values=quantum-defense-jenkins" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)

SSM_CMD_ID=$(aws ssm send-command \
  --instance-ids "$JENKINS_INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cat /var/lib/jenkins/secrets/initialAdminPassword"]' \
  --region us-east-1 \
  --query 'Command.CommandId' --output text)

sleep 8

JENKINS_PASS=$(aws ssm get-command-invocation \
  --command-id "$SSM_CMD_ID" \
  --instance-id "$JENKINS_INSTANCE_ID" \
  --region us-east-1 \
  --query 'StandardOutputContent' --output text | tr -d '[:space:]')

echo -e "Jenkins admin password retrieved."

# Create or retrieve permanent IAM access key for Jenkins ECR access
EXISTING_KEYS=$(aws iam list-access-keys --user-name saurabhy --region us-east-1 \
  --query 'AccessKeyMetadata[?Status==`Active`].AccessKeyId' --output text)

if [ -z "$EXISTING_KEYS" ]; then
  echo -e "Creating IAM access key for Jenkins..."
  IAM_KEY_OUTPUT=$(aws iam create-access-key --user-name saurabhy --region us-east-1)
  JENKINS_AWS_KEY_ID=$(echo "$IAM_KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
  JENKINS_AWS_SECRET=$(echo "$IAM_KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')
  # Persist new keys back to secrets.env for future runs
  sed -i '' "s|^JENKINS_AWS_KEY_ID=.*|JENKINS_AWS_KEY_ID=\"${JENKINS_AWS_KEY_ID}\"|" "$SECRETS_FILE"
  sed -i '' "s|^JENKINS_AWS_SECRET=.*|JENKINS_AWS_SECRET=\"${JENKINS_AWS_SECRET}\"|" "$SECRETS_FILE"
else
  # Reuse keys from secrets.env (already loaded above)
  echo -e "Using existing IAM key from secrets.env: ${JENKINS_AWS_KEY_ID}"
fi

# --- Install Required Plugins via Jenkins Script Console ---
echo -e "Installing Jenkins plugins (aws-credentials, kubernetes-cli)..."
# Get CSRF crumb
CRUMB_JSON=$(curl -s -u "admin:${JENKINS_PASS}" "${JENKINS_URL}/crumbIssuer/api/json")
CRUMB=$(echo "$CRUMB_JSON" | jq -r '.crumb')
CRUMB_FIELD=$(echo "$CRUMB_JSON" | jq -r '.crumbRequestField')

# Install plugins via Script Console
curl -s -X POST -u "admin:${JENKINS_PASS}" \
  -H "${CRUMB_FIELD}:${CRUMB}" \
  "${JENKINS_URL}/scriptText" \
  --data-urlencode 'script=
import jenkins.model.*
def pm = Jenkins.instance.pluginManager
def uc = Jenkins.instance.updateCenter
uc.updateAllSites()
["aws-credentials", "kubernetes-cli", "pipeline-stage-view", "git", "workflow-aggregator"].each { pluginName ->
  if (!pm.getPlugin(pluginName)) {
    def plugin = uc.getPlugin(pluginName)
    if (plugin) { plugin.deploy(true) }
  }
}
Jenkins.instance.save()
println "Plugins queued for installation"
' > /dev/null

echo -e "Waiting 60s for plugins to install and Jenkins to restart..."
sleep 60

# Re-fetch crumb after potential restart
CRUMB_JSON=$(curl -s -u "admin:${JENKINS_PASS}" "${JENKINS_URL}/crumbIssuer/api/json")
CRUMB=$(echo "$CRUMB_JSON" | jq -r '.crumb')
CRUMB_FIELD=$(echo "$CRUMB_JSON" | jq -r '.crumbRequestField')

# --- Create AWS Credentials via Script Console ---
echo -e "Creating AWS credentials in Jenkins..."
curl -s -X POST -u "admin:${JENKINS_PASS}" \
  -H "${CRUMB_FIELD}:${CRUMB}" \
  "${JENKINS_URL}/scriptText" \
  --data-urlencode "script=
import jenkins.model.*
import com.cloudbees.plugins.credentials.*
import com.cloudbees.plugins.credentials.domains.*
import com.cloudbees.jenkins.plugins.awscredentials.*

def domain = Domain.global()
def store = Jenkins.instance.getExtensionList(
  'com.cloudbees.plugins.credentials.SystemCredentialsProvider')[0].getStore()

// Remove existing credential with same ID to avoid duplicates
store.getCredentials(domain).findAll { it.id == 'aws-ecr-credentials' }.each {
  store.removeCredentials(domain, it)
}

def awsCreds = new AmazonWebServicesCredentials(
  CredentialsScope.GLOBAL,
  'aws-ecr-credentials',
  'AWS credentials for ECR push',
  '${JENKINS_AWS_KEY_ID}',
  '${JENKINS_AWS_SECRET}'
)
store.addCredentials(domain, awsCreds)
Jenkins.instance.save()
println 'AWS credentials created'
" > /dev/null

# --- Create EKS Kubeconfig as Secret File ---
echo -e "Creating EKS kubeconfig credential in Jenkins..."
KUBECONFIG_B64=$(cat ~/.kube/config | base64 | tr -d '\n')

curl -s -X POST -u "admin:${JENKINS_PASS}" \
  -H "${CRUMB_FIELD}:${CRUMB}" \
  "${JENKINS_URL}/scriptText" \
  --data-urlencode "script=
import jenkins.model.*
import com.cloudbees.plugins.credentials.*
import com.cloudbees.plugins.credentials.domains.*
import org.jenkinsci.plugins.plaincredentials.impl.*
import hudson.util.Secret

def domain = Domain.global()
def store = Jenkins.instance.getExtensionList(
  'com.cloudbees.plugins.credentials.SystemCredentialsProvider')[0].getStore()

store.getCredentials(domain).findAll { it.id == 'eks-kubeconfig' }.each {
  store.removeCredentials(domain, it)
}

def secretBytes = com.cloudbees.plugins.credentials.SecretBytes.fromBytes(
  '${KUBECONFIG_B64}'.decodeBase64()
)
def fileCreds = new FileCredentialsImpl(
  CredentialsScope.GLOBAL,
  'eks-kubeconfig',
  'EKS Kubeconfig for kubectl deployments',
  'kubeconfig',
  secretBytes
)
store.addCredentials(domain, fileCreds)
Jenkins.instance.save()
println 'Kubeconfig credential created'
" > /dev/null

# --- Create the Pipeline Job ---
echo -e "Creating QuantumDefense-CI-CD pipeline job in Jenkins..."
JOB_XML='<?xml version="1.0" encoding="UTF-8"?>
<flow-definition plugin="workflow-job">
  <description>QuantumDefense CI/CD - Build, push to ECR, deploy to EKS</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <com.cloudbees.jenkins.GitHubPushTrigger>
          <spec></spec>
        </com.cloudbees.jenkins.GitHubPushTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition">
    <scm class="hudson.plugins.git.GitSCM">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/HakashiKatake/QuantumDefence.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/main</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>jenkins/Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <disabled>false</disabled>
</flow-definition>'

# Delete job if exists, then recreate
curl -s -X POST -u "admin:${JENKINS_PASS}" \
  -H "${CRUMB_FIELD}:${CRUMB}" \
  "${JENKINS_URL}/job/QuantumDefense-CI-CD/doDelete" > /dev/null 2>&1 || true

curl -s -X POST -u "admin:${JENKINS_PASS}" \
  -H "${CRUMB_FIELD}:${CRUMB}" \
  -H "Content-Type: application/xml" \
  "${JENKINS_URL}/createItem?name=QuantumDefense-CI-CD" \
  --data "${JOB_XML}" > /dev/null

echo -e "${GREEN}Jenkins configured successfully!${NC}"
echo -e "  Job URL: ${JENKINS_URL}/job/QuantumDefense-CI-CD/"
echo -e "  GitHub webhook URL: ${JENKINS_URL}/github-webhook/"

# Retrieve the load balancer hostname for final output
LB_URL=$(kubectl get ingress c2-ingress -n quantum-defense \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "<pending>")

echo -e "${GREEN}"
echo -e "╔══════════════════════════════════════════════════════════════╗"
echo -e "║       QuantumDefense Production Deployment Complete!        ║"
echo -e "╚══════════════════════════════════════════════════════════════╝${NC}"
echo -e ""
echo -e "${CYAN}── Application ─────────────────────────────────────────────────${NC}"
echo -e "  C2 Dashboard : http://${LB_URL}"
echo -e ""
echo -e "${CYAN}── Monitoring ──────────────────────────────────────────────────${NC}"
echo -e "  Grafana      : http://${LB_URL}/grafana/   (admin / ${GRAFANA_PASSWORD})"
echo -e "  Prometheus   : http://${LB_URL}/prometheus/"
echo -e ""
echo -e "${CYAN}── CI/CD ────────────────────────────────────────────────────────${NC}"
echo -e "  Jenkins      : ${JENKINS_URL}"
echo -e "  Pipeline Job : ${JENKINS_URL}/job/QuantumDefense-CI-CD/"
echo -e "  GitHub Webhook (add to GitHub repo settings):"
echo -e "    ${JENKINS_URL}/github-webhook/"
echo -e ""
echo -e "${CYAN}── Vault ────────────────────────────────────────────────────────${NC}"
echo -e "  Vault        : kubectl port-forward svc/vault 8200:8200 -n quantum-defense"
echo -e "  Token        : ${VAULT_DEV_TOKEN}"
echo -e "${NC}"

