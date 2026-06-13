# Project QuantumDefense: End-to-End Operational Guide & Engineering Manual
## System Operations, Architectural Decisions, Challenges, and Commands Reference

---

## 1. Introduction & System Blueprint

**Project QuantumDefense** is a high-availability, zero-trust Command and Control (C2) platform designed to aggregate and visualize operational metrics across five key combat domains: **Land, Air, Naval, Cyber, and Space**. 

Modern military C2 systems are historically fragmented, operating on isolated networks. This fragmentation delays threat detection and limits mission readiness. QuantumDefense solves this by adopting a **resilient, cloud-native microservices architecture** that automates the software delivery and infrastructure lifecycle using modern DevOps practices.

### 1.1. Bounded Contexts & Services
The platform decouples operations into four discrete services, an Nginx API Gateway, and a React frontend:
1. **Auth Service (Port 4001)**: Handles user registration, cryptographically hashes passwords using bcrypt, generates JWT access tokens, and keeps audit logs.
2. **Command Service (Port 4002)**: Tracks active combat units and domain assets, executing a telemetry simulator that pushes live coordinate drift via Socket.IO.
3. **Threat Service (Port 4003)**: Classifies sensor inputs using threat analysis algorithms and emits real-time alert logs over Socket.IO.
4. **Mission Service (Port 4004)**: Directs state-machine changes (Planning -> Active -> Completed/Failed) for tactical objectives.
5. **React Frontend (Port 80/3000)**: Serves a military-style Common Operating Picture (COP) map (Leaflet.js) utilizing MIL-STD-2525 milsymbol tactical tags and live telemetry panels.
6. **Nginx API Gateway (Port 80)**: Serves static assets, routes API paths to respective services, and upgrades Socket.IO connections.

---

## 2. How I Made It Happen (Implementation Timeline)

I designed and built the ecosystem from scratch through eight distinct engineering phases:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Phase 1     │───>│  Phase 2     │───>│  Phase 3     │───>│  Phase 4     │
│  Local Core  │    │  Schema Iso  │    │  Docker/GW   │    │  Local Obs   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Phase 8     │<───│  Phase 7     │<───│  Phase 6     │<───│  Phase 5     │
│  Jenkins CD  │    │  Kubernetes  │    │  Terraform   │    │  Hashi Vault │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

1. **Phase 1: Local Core**: Wrote Express-based Node.js backends for the four microservices, drafted database schemas, and built the React client application.
2. **Phase 2: Database Schema Isolation**: Migrated all microservices to use PostgreSQL 18. Configured separate namespaces to avoid table dropping during migrations.
3. **Phase 3: Dockerization & Nginx Gateway**: Authored optimized multi-stage Dockerfiles and Nginx routing configs. Integrated Nginx as the primary gateway.
4. **Phase 4: Local Observability**: Integrated Prometheus clients in microservices, configured alert rules, designed Grafana dashboards, and configured local ELK pipelines.
5. **Phase 5: Secrets Integration**: Configured HashiCorp Vault local instances, created AppRole policies, and updated microservices to retrieve database credentials dynamically at startup.
6. **Phase 6: Infrastructure as Code (IaC)**: Configured Terraform modules to provision target environments on AWS.
7. **Phase 7: Kubernetes Orchestration**: Created YAML manifests to deploy, scale, and route microservices on EKS.
8. **Phase 8: CI/CD Pipeline Automation**: Wrote a declarative Jenkins pipeline to automate linting, compilation, pushes to AWS ECR, and rollouts to AWS EKS.

---

## 3. Local Development (Operational Command Reference)

Follow these steps to spin up the local development cluster.

### 3.1. Prerequisites Installation
Install command-line utilities (macOS Homebrew example):
```bash
brew install docker node npm jq awscli terraform kubernetes-cli helm
```

### 3.2. Initial Setup & Environment Configuration
Clone the repository and create the local environment file from the template:
```bash
git clone https://github.com/HakashiKatake/QuantumDefence.git
cd QuantumDefence

# Create local secrets.env
cp scripts/secrets.env.example scripts/secrets.env
```
Ensure your `scripts/secrets.env` file contains the following configurations (never commit this file):
```bash
# PostgreSQL Configuration
DB_USER=postgres
DB_PASSWORD=TacticalC2SecureDBPass!
DB_HOST=postgres
DB_PORT=5432
DB_NAME=qdefense

# Vault Configuration
VAULT_DEV_TOKEN=root-dev-token
VAULT_ADDR=http://vault:8200

# Security Configurations
JWT_SECRET=c2-top-secret-signing-key
GRAFANA_PASSWORD=QuantumC2Grafana2024!
```

### 3.3. Database Initialization (PostgreSQL & HashiCorp Vault)
Launch backing databases and Vault:
```bash
# Setup permissions and launch database containers
chmod +x scripts/*.sh
./scripts/db-setup.sh
```
Initialize Vault secrets, policies, and AppRole access:
```bash
# Mount key-value store, upload database secrets, and write permissions policy
./vault/scripts/init-vault.sh
```
*Note: This script mounts the KV-V2 engine at `secret/`, creates policy definitions inside `vault/policies/c2-policy.hcl`, and writes database configurations to `secret/data/quantum-defense/postgres`.*

### 3.4. Docker Container Compilations
Build and run the entire 13-container microservices network locally:
```bash
# Build multi-stage optimized docker containers
docker compose -f docker/docker-compose.yml build

# Start services (Nginx, Services, Postgres, Vault, Prometheus, Grafana, ELK)
docker compose -f docker/docker-compose.yml up -d
```
Verify container runtimes:
```bash
docker compose -f docker/docker-compose.yml ps
```

### 3.5. Frontend Launch
* **Option A: Production Build** (Served directly through the Nginx gateway at `http://localhost`):
  ```bash
  cd frontend
  npm install
  npm run build
  ```
* **Option B: Development Server** (Runs Vite-hot-reload on `http://localhost:3000` with proxies):
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
Access the application with:
* **Email**: `commander@quantumdefense.mil`
* **Password**: `TacticalC2Secure!`

---

## 4. Production AWS Cloud (Operational Command Reference)

Follow these steps to deploy to the production AWS cloud.

### 4.1. AWS SSO & Local Credentials Setup
Authenticate with AWS (ensure your IAM User has AdministratorAccess):
```bash
aws configure
# Verify active credentials
aws sts get-caller-identity
```

### 4.2. Infrastructure Provisioning via Terraform
Initialize Terraform, target workspace, plan, and deploy infrastructure:
```bash
cd terraform
# Initialize AWS & Local providers
terraform init

# Create or target workspace
terraform workspace select production || terraform workspace new production

# Perform dry-run plan
terraform plan -out=tfplan

# Apply configuration (Deploys VPC, EKS Cluster, RDS Postgres, Jenkins Instance, S3, ECR)
terraform apply tfplan
```

### 4.3. Update Local Kubectl config
Link your local Kubernetes CLI to the new Amazon EKS cluster:
```bash
aws eks update-kubeconfig --name quantum-defense-cluster --region us-east-1
# Verify nodes are active
kubectl get nodes
```

### 4.4. Vault Provisioning & Policy Initialization on EKS
Deploy Vault via Helm:
```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Vault in dev-mode (simple for verification)
helm upgrade --install vault hashicorp/vault \
  --namespace quantum-defense \
  --set "server.dev.enabled=true" \
  --set "server.dev.token=root-dev-token"
```
Wait for Vault pod initialization and verify status:
```bash
kubectl wait --for=condition=Ready pod/vault-0 -n quantum-defense --timeout=120s
```
Inject production databases and JWT secrets into the EKS Vault container:
```bash
# Exec into Vault pod and write policies
kubectl exec -it vault-0 -n quantum-defense -- vault kv put secret/quantum-defense/postgres \
  username="postgres" \
  password="TacticalC2SecureDBPass!" \
  host="rds-postgres-endpoint.amazonaws.com" \
  database="qdefense"
```

### 4.5. Nginx Ingress Controller Installation
Install Nginx Ingress Controller to manage EKS external application routing:
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install ingress controller (automatically requests AWS Classic LoadBalancer)
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```
Retrieve LoadBalancer public address:
```bash
kubectl get service ingress-nginx-controller -n ingress-nginx
```

### 4.6. Prometheus & Grafana Monitoring Deployments
Deploy Prometheus Community Stack using custom Helm values:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install stack under monitoring namespace
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values ../monitoring/helm-values.yaml
```
Apply the monitoring ingress to map route rules:
```bash
kubectl apply -f ../monitoring/monitoring-ingress.yaml
```

### 4.7. ECR Image Builds & Registry Pushing
Authenticate Docker CLI with Amazon ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 032667094119.dkr.ecr.us-east-1.amazonaws.com
```
Build, tag, and upload microservice images:
```bash
SERVICES=("auth-service" "command-service" "threat-service" "mission-service" "frontend")
REGISTRY="032667094119.dkr.ecr.us-east-1.amazonaws.com/quantum-defense"

for SVC in "${SERVICES[@]}"; do
  # Build using context
  if [ "$SVC" == "frontend" ]; then
    docker build -t "$REGISTRY/$SVC:latest" ./frontend
  else
    docker build -t "$REGISTRY/$SVC:latest" ./services/$SVC
  fi
  
  # Push to ECR
  docker push "$REGISTRY/$SVC:latest"
done
```

### 4.8. Kubernetes Workloads Orchestration
Apply namespaces, ConfigMaps, HPAs, Ingress, and Deployments:
```bash
cd ../kubernetes
kubectl apply -f namespace.yaml
kubectl apply -f app/configmap.yaml
kubectl apply -f app/auth-deployment.yaml
kubectl apply -f app/command-deployment.yaml
kubectl apply -f app/threat-deployment.yaml
kubectl apply -f app/mission-deployment.yaml
kubectl apply -f app/frontend-deployment.yaml
kubectl apply -f app/ingress.yaml
kubectl apply -f app/hpa.yaml
```
Verify Pod and Deployment statuses:
```bash
kubectl get pods -n quantum-defense
kubectl get hpa -n quantum-defense
kubectl get ingress -n quantum-defense
```

### 4.9. AWS RDS Database Migration & Seeding
Trigger Prisma migrations and seed records against the production AWS RDS Postgres DB:
```bash
# Local port-forward to secure RDS instance via EKS proxy
kubectl port-forward svc/auth-service 4001:4001 -n quantum-defense &
PID=$!

# Run seed scripts targeting local proxy (which forwards to EKS -> RDS)
cd ../services/auth-service
DATABASE_URL="postgresql://postgres:TacticalC2SecureDBPass!@localhost:5432/qdefense?schema=auth" npx prisma db push
DATABASE_URL="postgresql://postgres:TacticalC2SecureDBPass!@localhost:5432/qdefense?schema=auth" npx prisma db seed

# Repeat migrations for other schemas
# Kill port-forward
kill $PID
```

---

## 5. Jenkins CI/CD Pipeline Automation

The declarative pipeline is defined inside `jenkins/Jenkinsfile`. 

### 5.1. Stage-by-Stage Breakdown
1. **Stage 1: Checkout Source**: Pulls fresh code branches directly from GitHub.
2. **Stage 2: Static Analysis & Test**: Runs ESLint and test suites in parallel for all 4 microservices and the React frontend to prevent linting or compiler issues from reaching production.
3. **Stage 3: Docker Compilation**: Runs Docker builds on the Jenkins agent.
4. **Stage 4: Registry Upload**: Runs AWS authentication and uploads images to Amazon ECR repositories.
5. **Stage 5: Kubernetes Orchestration**: Invokes `kubectl apply` commands using EKS credentials to deploy new manifests. Runs `rollout restart` to force pods to pull the latest images.
6. **Stage 6: Health Validation**: Waits for rolling updates to complete, failing the build if a pod crashes within 90 seconds.

### 5.2. Jenkins Configuration Steps
To configure the Jenkins pipeline:
1. Navigate to `http://<jenkins_public_ip>:8080` and fetch the Admin Password:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```
2. Install recommended plugins along with `Amazon Web Services SDK`, `Docker Pipeline`, and `Kubernetes Pipeline`.
3. Add credentials under Manage Jenkins:
   * **AWS Credentials ID (`aws-ecr-credentials`)**: Access Key and Secret Key for AWS ECR pushes.
   * **Secret File ID (`eks-kubeconfig`)**: Paste the target EKS kubeconfig file content.
4. Create a Pipeline Job, set SCM to Git, reference the repo URL, and specify `jenkins/Jenkinsfile` as the script path.

---

## 6. Architectural Trade-offs & Decisions Analysis

| Design Choice | Approach Taken | Advantages | Trade-offs |
|---|---|---|---|
| **System Layout** | Microservices Architecture | Isolated fault domains, independent scalability. | Increased operational and networking complexity. |
| **Data Separation** | Single RDS Instance + Schema Isolation | Dramatically lower monthly RDS costs ($15 vs $60+), simple backup management. | Logical boundary only; heavy DB load can impact all services. |
| **Real-Time Data** | WebSockets (Socket.IO) | High-speed telemetry updates, minimal network overhead. | Stateful routing at API Gateway, increased memory footprint. |
| **Token Validation** | Client-Side Cryptographic Decryption | High performance, no auth gateway latency bottleneck. | Key rotation requires restarting services to reload variables. |
| **Replica Strategy** | Multi-AZ DB Deployment | Active-passive auto-failover, zero RPO, high availability. | Doubled RDS compute costs. |

---

## 7. Operational Difficulties & Bug Resolutions

### 7.1. PostgreSQL Volume PGDATA directory mismatch
* **Description**: Mounting host directory directly to `/var/lib/postgresql/data` blocked database startup because PostgreSQL 18 expects directory sub-structures for write-ahead logging (WAL).
* **Resolution**: Reconfigured Docker Compose volumes to map to `/var/lib/postgresql` and added `PGDATA=/var/lib/postgresql/data/pgdata` to the environment block.

### 7.2. Prisma Shared Database Schema Collision
* **Description**: Running migrations dropped other services' tables because Prisma expects the model schema to match the database exactly.
* **Resolution**: Added isolated schemas (`auth`, `command`, `threat`, `mission`) via URL parameters (`postgresql://.../qdefense?schema=auth`) and modified seed files to reference correct schemas.

### 7.3. JWT Lockfile Desync on clean installation
* **Description**: Appending `jsonwebtoken` to package files without rebuilding lockfiles caused Docker's `npm ci` stage to crash during CI compiles.
* **Resolution**: Re-ran dependencies locally, generated updated lockfiles, and verified lockfile consistency before committing.

### 7.4. Nginx Welcome Page Route Priority
* **Description**: Nginx default configurations overrode the proxy routing, serving the standard Nginx page.
* **Resolution**: Removed default server configs from `/etc/nginx/conf.d/`, updated paths to serve static bundles from `/usr/share/nginx/html`, and added routing exceptions.

### 7.5. Empty ECR Repositories failing Terraform Destroy
* **Description**: `terraform destroy` failed to delete ECR repositories that contained compiled images.
* **Resolution**: Added `force_delete = true` to `aws_ecr_repository` blocks and `force_destroy = true` to the S3 bucket configuration.

---

## 8. Production Teardown & Clean-up (Zero-Cost Guard)

To safely delete all AWS resources and ensure your billing footprint returns to exactly **$0.00**, run:
```bash
./scripts/prod-cleanup.sh
```

### 8.1. Teardown Commands Reference
This script executes the following commands sequentially:
```bash
# 1. Delete K8s App Namespace (Releases AWS ALB)
kubectl delete namespace quantum-defense --ignore-not-found --timeout=120s

# 2. Uninstall Monitoring Helm Stack
helm uninstall monitoring -n monitoring
kubectl delete namespace monitoring --ignore-not-found

# 3. Empty S3 Bucket
aws s3 rm s3://quantum-defense-backups-saurabhyadav --recursive

# 4. Purge ECR Repository Images
REPOS=("frontend" "auth-service" "command-service" "threat-service" "mission-service")
for REPO in "${REPOS[@]}"; do
  IMAGE_IDS=$(aws ecr list-images --repository-name "quantum-defense/$REPO" --query 'imageIds[*]' --output json)
  if [ "$IMAGE_IDS" != "[]" ] && [ "$IMAGE_IDS" != "null" ]; then
    aws ecr batch-delete-image --repository-name "quantum-defense/$REPO" --image-ids "$IMAGE_IDS"
  fi
done

# 5. Destroy Infrastructure via Terraform
cd terraform
terraform destroy -auto-approve
```
Following these steps ensures that no orphaned AWS resources remain active.
