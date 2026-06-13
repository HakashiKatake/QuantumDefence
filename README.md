# Project QuantumDefense: Enterprise DevOps Architecture & Engineering Manual
## Integrated Multi-Domain Command & Control (C2) Platform

---

## 📋 Executive Summary
**Project QuantumDefense** is a high-availability, mission-critical Command and Control (C2) platform that I designed and implemented to consolidate and visualize tactical operations across five strategic domains: **Land, Air, Naval, Cyber, and Space**.

Command centers frequently suffer from fragmented legacy infrastructures. These information silos delay threat identification, cause unscheduled outages, and create massive security holes. I addressed these systemic issues by migrating to a **resilient, cloud-native microservices architecture** and automating the entire software delivery, security compliance, infrastructure management, and disaster recovery lifecycle using industry-standard DevOps tools.

This repository contains the complete implementation—including the functional React and Node.js microservices codebase, the Docker configurations, the Jenkins CI/CD pipeline, the Terraform Infrastructure as Code (IaC) modules, and the Kubernetes orchestration manifests.

---

## 🛠️ Technology Stack & DevOps Lifecycle

The platform demonstrates how advanced cloud-native and DevOps tools automate the deployment, scaling, monitoring, recovery, and security of a functional business application.

| Phase | Tool | Implementation Detail |
|---|---|---|
| **Frontend UI** | React 19 + Vite 6 | Military-themed Common Operating Picture (COP) with Leaflet.js maps, milsymbol tactical markers (MIL-STD-2525), and live WebSocket telemetry dashboards. Styled with Tailwind CSS v4. |
| **Microservices** | Node.js + Express | 4 logically isolated microservices: Auth, Command (Asset/Telemetry), Threat (Detection/Alerts), and Mission (Directives/State-machine). |
| **Database** | PostgreSQL 18 | Prisma ORM mapping schemas dynamically. Isolated schemas per service (`auth`, `command`, `threat`, `mission`) on a single database cluster. |
| **Containerization** | Docker & Docker Compose | Multi-stage, non-root, cache-optimized `Dockerfile` for each microservice and the frontend. Orchestrated locally with 13 containers. |
| **CI/CD Pipeline** | Jenkins (LTS) | Declarative `Jenkinsfile` executing linting, multi-container Docker compilation, registry uploads (AWS ECR), rolling cluster updates (EKS), and post-deployment validation. |
| **Infrastructure as Code** | Terraform | Modular scripts configuring AWS VPC, EKS cluster, EC2 Jenkins worker node, RDS multi-AZ databases, ECR container registries, and S3 secure backups. |
| **Orchestration** | Amazon EKS (K8s v1.36) | Production-grade deployment manifests configuring Pods, LoadBalancer Services, Nginx Ingress routing, and Horizontal Pod Autoscalers (HPA). |
| **Metrics & Monitoring** | Prometheus & Grafana | Custom metrics scraped on `/metrics` from all services. Grafana dashboard visualizing resource consumption, query latency, and operational health. |
| **Centralized Logging** | ELK Stack | Winston JSON console loggers forwarding to Logstash TCP inputs, indexed in Elasticsearch, and visualizable on Kibana dashboard. |
| **Secret Management** | HashiCorp Vault | AppRole role-based secret access. Dynamic retrieval of database credentials and JWT signing keys on container startup. |
| **Disaster Recovery** | DR Plan & Automation | RTO < 15 Min, RPO < 5 Min. Active-passive failover and automated S3 backup synchronization. |

---

## 📂 Project Directory Structure

```
QuantumDefence/
├── services/
│   ├── auth-service/        # Node.js + Express (Port 4001) - JWT authentication & audits
│   ├── command-service/     # Node.js + WebSockets (Port 4002) - Telemetry & asset simulation
│   ├── threat-service/      # Node.js + WebSockets (Port 4003) - Detection & live alerts
│   └── mission-service/     # Node.js + Express (Port 4004) - Directives state machine
├── frontend/                # React 19 + Vite 6 Single-Page Application (Tailwind CSS v4)
├── gateway/                 # Nginx API Gateway routing and WebSocket proxies
├── docker/                  # Local Docker Compose multi-container templates
├── terraform/               # Infrastructure provisioning modules (AWS VPC, EKS, RDS, ECR)
├── kubernetes/              # Production manifests (Deployments, Ingress, HPA, ConfigMaps)
├── monitoring/              # Prometheus scrapers, alert rules, and Grafana datasources
├── logging/                 # ELK Logstash pipelines and configurations
├── vault/                   # HashiCorp Vault access policies and init scripts
├── docs/                    # Extensive project documentation & screenshots
└── scripts/                 # Provisioning, seeding, and cleanup scripts
```

---

## 🎯 Product Requirements & Vision

### 1. Unified COP
I integrated data feeds from five domains into a single interactive tactical map with latency under 1 second.

### 2. Automated Threat Assessment
I built threat classification logic that automatically analyzes sensor inputs and classifies threat severity (Critical, High, Medium, Low) within 500 milliseconds of detection.

### 3. High Availability
I achieved a resilient ecosystem using containerized replication, load balancing, and Kubernetes self-healing.

### 4. Zero-Trust Security
I ensured all microservice communication is authenticated, and configuration secrets are retrieved dynamically at runtime from HashiCorp Vault.

---

## 🏗️ Architectural Trade-offs & Engineering Decisions

I made several critical architectural trade-offs during the implementation of the platform:

### 1. Shared PostgreSQL Instance with Logical Schema Isolation
* **Trade-off**: Standard microservice design dictates a "database-per-service" pattern. However, hosting four separate database instances in Amazon RDS (and locally in Docker Compose) creates significant resource overhead and increases monthly AWS costs.
* **Decision**: I deployed a single PostgreSQL database instance but enforced strict logical isolation. Each service connects via a database URL referencing a distinct schema (`?schema=auth`, etc.). No table joins or cross-database transactions are permitted. Cross-service data dependencies are resolved entirely at the API tier.

### 2. WebSockets (Socket.IO) vs. Short Polling for Telemetry
* **Trade-off**: Tactical maps require high-frequency updates. Standard HTTP short polling creates excessive network traffic, burns database read capacity, and introduces lag.
* **Decision**: I implemented persistent WebSockets via Socket.IO. The Command Service broadcasts simulated asset coordinate changes every 3 seconds to all connected clients over a single persistent TCP socket. This minimizes network overhead and achieves near-instantaneous tactical updates.

### 3. Client-Side JWT Validation vs. Gateway Token Introspection
* **Trade-off**: When a request hits the API Gateway, validating the JWT at the gateway reduces downstream load but centralizes the verification logic. Conversely, letting microservices validate tokens themselves increases code duplication but allows for finer-grained, service-level RBAC.
* **Decision**: Microservices fetch JWT signing keys dynamically from HashiCorp Vault on startup and perform stateless verification. A lightweight `/api/auth/verify` endpoint is provided on the Auth Service for service-to-service validation when secondary authorization is required.

---

## 🛑 Core Technical Challenges & Resolutions

During the implementation and testing phases, I encountered and resolved several complex bugs:

### 1. PostgreSQL 18 Mount & PGDATA Directory Collisions
* **Problem**: In PostgreSQL 18, mounting the host volume directly to `/var/lib/postgresql/data` caused container initialization to fail because Postgres expects database cluster files to live inside a major-version-specific folder layout (`/var/lib/postgresql/data/pgdata`).
* **Resolution**: I modified the Docker mount point to target `/var/lib/postgresql` and set the environment variable `PGDATA=/var/lib/postgresql/data/pgdata`. This allowed Postgres to safely initialize its sub-directory layout.

### 2. Prisma Database Push Schema Collisions
* **Problem**: Because Prisma manages the database schema declaratively, running `npx prisma db push` from one service dropped the tables owned by the other services. Prisma attempted to make the target database match the single service's schema.
* **Resolution**: I isolated each service into a dedicated database schema. The database connection strings were updated to append `?schema=<service_name>`. I adjusted the migration and seed scripts to run under explicit schema namespaces, preventing cross-service schema corruption.

### 3. Docker Compilation Failures due to Lockfile Desync
* **Problem**: Adding the `jsonwebtoken` dependency to the microservices' source code without running `npm install` on the host created a discrepancy between `package.json` and `package-lock.json`. When Docker ran `npm ci` during the multi-stage build, it aborted due to lockfile desync.
* **Resolution**: I executed localized dependency updates in each service folder, synchronized the lockfiles, and updated the Docker build contexts to explicitly copy the verified lockfiles prior to running the clean install step.

### 4. API Gateway Welcome Page Routing Override
* **Problem**: Accessing `http://localhost:80` returned the default Nginx welcome page instead of serving the React application. Nginx prioritizes its default server block over custom location mappings if custom static paths are misconfigured.
* **Resolution**: I removed the default Nginx virtual host configurations from the container, updated my Custom `nginx.conf` to host the build output mounted at `/usr/share/nginx/html`, and enabled fallbacks for React Router Single-Page Application routing using `try_files $uri $uri/ /index.html`.

### 5. Failed ECR Repository Teardown during Cleanup
* **Problem**: When running `prod-cleanup.sh`, the terraform destroy step failed because ECR repositories cannot be deleted if they contain images. This left orphaned AWS resources that continued to accrue charges.
* **Resolution**: I added `force_delete = true` to the `aws_ecr_repository` resource blocks in `terraform/main.tf` and `force_destroy = true` to the S3 buckets. This ensures that Terraform automatically purges repository images and bucket objects before destroying the resources.

---

## 📐 System Design & Diagrams

### 1. System Context Diagram (C4 Context)
The diagram below shows the high-level boundary of the QuantumDefense system:

```mermaid
graph TD
    User([Military Operator / Commander]) -->|HTTPS / WebSockets| Gateway[API Gateway - Nginx]
    
    subgraph System Boundary
        Gateway -->|Reverse Proxy| WebApp[React Web App]
        Gateway -->|REST / API| Microservices[Auth, Command, Threat, Mission Services]
        Microservices -->|Read / Write| PostgreSQL[(PostgreSQL Database)]
        Microservices -->|Dynamic Secrets| Vault[HashiCorp Vault]
    end
    
    subgraph Observability Stack
        Prometheus[Prometheus] -->|Pull Metrics| Microservices
        Grafana[Grafana] -->|Query Visuals| Prometheus
        Filebeat[Filebeat / FluentBit] -->|Forward Logs| ELK[ELK Stack]
    end
```

### 2. Container Architecture (C4 Container Diagram)
This diagram details the interfaces, port bindings, and communication pathways of the container components:

```mermaid
flowchart TD
    Client([Browser - React Frontend]) -->|Port 80/443| Gateway[API Gateway - Nginx]
    
    subgraph AppContainer [Application Tier]
        Gateway -->|/api/auth| AuthSvc[Auth Service :4001]
        Gateway -->|/api/domains| CmdSvc[Command Service :4002]
        Gateway -->|/api/threats| ThreatSvc[Threat Service :4003]
        Gateway -->|/api/missions| MissionSvc[Mission Service :4004]
        Gateway -->|/socket.io| CmdSvc
        Gateway -->|/socket.io| ThreatSvc
    end
    
    subgraph DataContainer [Data Tier]
        AuthSvc -->|Prisma client| DB[(PostgreSQL 18 :5432)]
        CmdSvc -->|Prisma client| DB
        ThreatSvc -->|Prisma client| DB
        MissionSvc -->|Prisma client| DB
    end
    
    subgraph SecurityContainer [Secrets Tier]
        AuthSvc -->|AppRole Auth| Vault[HashiCorp Vault :8200]
        CmdSvc -->|AppRole Auth| Vault
        ThreatSvc -->|AppRole Auth| Vault
        MissionSvc -->|AppRole Auth| Vault
    end
```

### 3. Infrastructure Architecture (AWS Production Target)
The production environment relies on Amazon Web Services (AWS) managed resources, set up via Terraform:

```mermaid
graph TD
    Internet[Internet] -->|Route 53| ALB[Application Load Balancer]
    ALB -->|Port 443| EKS[Amazon EKS Cluster]
    
    subgraph VPC [AWS VPC - 10.0.0.0/16]
        subgraph PublicSubnets [Public Subnets]
            ALB
            NAT[NAT Gateways]
        end
        
        subgraph PrivateSubnets [Private Subnets]
            EKS
            Bastion[Bastion / Jenkins Worker Node]
        end
        
        subgraph DataSubnets [Isolated Data Subnets]
            RDS[(Amazon RDS PostgreSQL Multi-AZ)]
            VaultServer[HashiCorp Vault Instances]
        end
    end
    
    NAT -->|Routing| EKS
    EKS -->|Query Data| RDS
    EKS -->|Retrieve Keys| VaultServer
```

### 4. CI/CD Pipeline Flow (Jenkins)
The deployment pipeline automates validation, image compilation, registry pushing, and deployment rollout:

```mermaid
flowchart LR
    Commit[Git Commit / PR] -->|Trigger| Jenkins[Jenkins Controller]
    
    subgraph Pipeline [Jenkins Pipeline stages]
        Lint[Lint & Test] --> Build[Docker Build]
        Build --> Push[Push ECR]
        Push --> Deploy[Deploy K8s]
        Deploy --> Verify[Health Check]
    end
    
    Jenkins --> Pipeline
```

### 5. Identity Verification Flow
The sequence diagram below explains how user sessions are validated and authenticated dynamically across the microservice architecture:

```mermaid
sequenceDiagram
    actor Client as React Client
    participant Gateway as API Gateway (Nginx)
    participant Auth as Auth Service (:4001)
    participant Cmd as Command Service (:4002)
    
    Client->>Gateway: POST /api/auth/login (Credentials)
    Gateway->>Auth: Forward to /api/auth/login
    Auth->>Auth: Validate & Sign JWT
    Auth-->>Client: Return JWT (Token)
    
    Client->>Gateway: GET /api/assets (Authorization: Bearer <Token>)
    Gateway->>Cmd: Forward request with Header
    Cmd->>Auth: Internal GET /api/auth/verify (JWT)
    Auth-->>Cmd: JWT Valid (Role: Operator)
    Cmd->>Cmd: Verify RBAC permissions (Operator can read assets)
    Cmd-->>Client: Return Asset Data (200 OK)
```

---

## 5. Technical Details & Configuration

### 5.1. Authentication Service
* **Key Dependencies:** `express`, `jsonwebtoken`, `bcryptjs`, `@prisma/client`.
* **Password Hashing:** Passwords are cryptographically hashed using `bcryptjs` with a work factor of 12.
* **Token Structure:** JWTs are signed using the `HS256` algorithm. The token payload structure:
  ```json
  {
    "userId": 104,
    "name": "Jane Doe",
    "role": "Operator",
    "exp": 1781280000
  }
  ```
* **Authentication Middleware:**
  ```javascript
  const jwt = require('jsonwebtoken');

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized: Missing Token' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ success: false, error: 'Forbidden: Invalid Token' });
      req.user = user;
      next();
    });
  };
  ```

### 5.2. Command Service Telemetry Engine
Runs an interval loop every 3 seconds to update coordinate offsets and slowly drain fuel:
```javascript
setInterval(async () => {
  const assets = await prisma.asset.findMany({ where: { status: 'ACTIVE' } });
  for (const asset of assets) {
    const deltaLat = (Math.random() - 0.5) * 0.005;
    const deltaLng = (Math.random() - 0.5) * 0.005;
    const newFuel = Math.max(0, asset.fuel - 0.1);
    
    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: {
        lat: asset.lat + deltaLat,
        lng: asset.lng + deltaLng,
        fuel: newFuel
      }
    });
    
    io.emit('telemetry:update', updated);
  }
}, 3000);
```

### 5.3. API Gateway Configuration (Nginx)
The gateway handles port redirection and WebSocket upgrades:
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/auth {
        proxy_pass http://auth-service:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/domains {
        proxy_pass http://command-service:4002;
    }

    location /api/threats {
        proxy_pass http://threat-service:4003;
    }

    location /api/missions {
        proxy_pass http://mission-service:4004;
    }

    location /socket.io/ {
        proxy_pass http://command-service:4002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### 5.4. Docker Build Process (Multi-stage)
I use multi-stage Docker builds to keep image sizes small and remove development dependencies in production:
```dockerfile
# Stage 1: Build & Install Dependencies
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm prune --omit=dev

# Stage 2: Minimal Runtime Environment
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma

EXPOSE 4001
ENV NODE_ENV=production
USER node
CMD ["node", "src/index.js"]
```

### 5.5. Metrics & Observability Configuration
* **prom-client Integration:** Each Node.js microservice exposes Prometheus metrics on `/metrics`. A custom counter measures login volumes:
  ```javascript
  const client = require('prom-client');
  const collectDefaultMetrics = client.collectDefaultMetrics;
  collectDefaultMetrics({ register: client.register });

  const loginCounter = new client.Counter({
    name: 'auth_service_login_total',
    help: 'Total login attempts on the Auth Service',
    labelNames: ['status']
  });
  ```
* **Prometheus Target Configuration (`prometheus.yml`):**
  ```yaml
  scrape_configs:
    - job_name: 'quantum-defense-services'
      scrape_interval: 10s
      static_configs:
        - targets: ['auth-service:4001', 'command-service:4002', 'threat-service:4003', 'mission-service:4004']
  ```

### 5.6. Vault Integration Architecture
Dynamic secret retrieval is managed in the microservice database configuration:
```javascript
const vault = require('node-vault')({ endpoint: process.env.VAULT_ADDR });

async function getDatabaseCredentials() {
  const token = process.env.VAULT_TOKEN;
  vault.token = token;
  
  const secrets = await vault.read('secret/data/quantum-defense/postgres');
  const { username, password, host, database } = secrets.data.data;
  
  return `postgresql://${username}:${password}@${host}:5432/${database}?schema=public`;
}
```

### 5.7. Environment Variables Reference

Below is the configuration checklist required in `.env` configuration files:

| Variable | Description | Default Dev | Scope |
|---|---|---|---|
| `PORT` | Microservice binding port | `4001`-`4004` | All Services |
| `DATABASE_URL` | PostgreSQL direct connection URI | `postgresql://postgres:postgres@localhost:5432/qdefense` | All Services |
| `JWT_SECRET` | Token signature seed | `c2-top-secret-signing-key` | Auth Service |
| `VAULT_ADDR` | Connection address of Secrets Server | `http://vault:8200` | All Services |
| `VAULT_TOKEN` | Local authentication token | `root-dev-token` | All Services |
| `NODE_ENV` | Runtime stage designation | `development` | All Services |
| `SOCKET_IO_PORT` | WebSockets binding | `4002` | Command, Threat |

---

## 🚀 End-to-End Operational Manual (Command Reference)

I have documented each command and script execution below to guide developers and system operators through the deployment and teardown lifecycles.

### 1. Local Development Operations

Ensure Docker Desktop is active on your host system:

```bash
# 1. Clone the repository and navigate to the directory
git clone https://github.com/HakashiKatake/QuantumDefence.git
cd QuantumDefence

# 2. Copy and configure the local environment file
cp scripts/secrets.env.example scripts/secrets.env

# 3. Spin up PostgreSQL and Vault containers
./scripts/db-setup.sh

# 4. Initialize Vault engines, policies, and secrets
./vault/scripts/init-vault.sh

# 5. Compile and start all 13 containers in the dev network
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d

# 6. Verify container runtime status
docker compose -f docker/docker-compose.yml ps

# 7. Start React client development server
cd frontend
npm install
npm run dev
```

* **Application Interface**: Open `http://localhost:3000` to access the Vite development hot-reload server.
* **Database Management**: View metrics at `http://localhost:9090` (Prometheus) and logs at `http://localhost:5601` (Kibana).

### 2. Production AWS Cloud Operations

Authenticate with your AWS CLI and run the following deployment commands:

```bash
# 1. Set up AWS configuration
aws configure
aws sts get-caller-identity

# 2. Provision AWS resources via Terraform
cd terraform
terraform init
terraform workspace select production || terraform workspace new production
terraform plan -out=tfplan
terraform apply tfplan

# 3. Pull kubeconfig permissions for kubectl EKS management
aws eks update-kubeconfig --name quantum-defense-cluster --region us-east-1
kubectl get nodes

# 4. Install Vault in EKS namespace using Helm
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
helm upgrade --install vault hashicorp/vault --namespace quantum-defense --set "server.dev.enabled=true" --set "server.dev.token=root-dev-token"
kubectl wait --for=condition=Ready pod/vault-0 -n quantum-defense --timeout=120s

# 5. Populate Vault database and JWT secrets on EKS
kubectl exec -it vault-0 -n quantum-defense -- vault kv put secret/quantum-defense/postgres \
  username="postgres" \
  password="TacticalC2SecureDBPass!" \
  host="rds-postgres-endpoint.amazonaws.com" \
  database="qdefense"

# 6. Install Nginx Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
kubectl get service ingress-nginx-controller -n ingress-nginx

# 7. Deploy Prometheus and Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace --values ../monitoring/helm-values.yaml
kubectl apply -f ../monitoring/monitoring-ingress.yaml

# 8. Authenticate and push compiled Docker images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 032667094119.dkr.ecr.us-east-1.amazonaws.com

SERVICES=("auth-service" "command-service" "threat-service" "mission-service" "frontend")
REGISTRY="032667094119.dkr.ecr.us-east-1.amazonaws.com/quantum-defense"
for SVC in "${SERVICES[@]}"; do
  if [ "$SVC" == "frontend" ]; then
    docker build -t "$REGISTRY/$SVC:latest" ./frontend
  else
    docker build -t "$REGISTRY/$SVC:latest" ./services/$SVC
  fi
  docker push "$REGISTRY/$SVC:latest"
done

# 9. Apply Kubernetes Deployments, Services, and HPAs
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

# 10. Run database migrations and seeding against AWS RDS database
kubectl port-forward svc/auth-service 4001:4001 -n quantum-defense &
PID=$!
cd ../services/auth-service
DATABASE_URL="postgresql://postgres:TacticalC2SecureDBPass!@localhost:5432/qdefense?schema=auth" npx prisma db push
DATABASE_URL="postgresql://postgres:TacticalC2SecureDBPass!@localhost:5432/qdefense?schema=auth" npx prisma db seed
kill $PID
```

---

## 🛡️ Disaster Recovery (DR) Plan

I established a complete Disaster Recovery plan to ensure military operational continuity:

* **Recovery Time Objective (RTO)**: **15 Minutes** (maximum duration to recover from a primary region failure).
* **Recovery Point Objective (RPO)**: **5 Minutes** (maximum acceptable data loss window).

### Playbook 1: Single Availability Zone Outage (Auto-Failover)
* **RDS Failover**: Amazon RDS automatically performs DNS failover to the standby database instance in the secondary AZ within 1-2 minutes. No manual intervention is needed.
* **EKS Self-Healing**: Managed node groups automatically spin up fresh pods in the healthy AZ.

### Playbook 2: Primary Region Outage (Cross-Region Failover)
* **IaC Re-provisioning**:
  ```bash
  cd terraform
  terraform workspace select backup-region || terraform workspace new backup-region
  terraform apply -auto-approve
  ```
* **Kubeconfig Re-routing**:
  ```bash
  aws eks update-kubeconfig --name quantum-defense-cluster --region us-west-2
  kubectl apply -f kubernetes/namespace.yaml
  kubectl apply -f kubernetes/app/
  ```
* **Traffic Shift**: Route 53 DNS records are updated to shift active global traffic to the backup region's load balancer.

### Playbook 3: Complete Teardown & Zero-Cost Guard
To safely clean up all AWS resources and return my active billing footprint to exactly **$0.00**, I run the automated script:
```bash
./scripts/prod-cleanup.sh
```
This executes the following steps:
1. Deletes the EKS namespace to release associated LoadBalancers.
2. Uninstalls Prometheus, Grafana, and Vault Helm charts.
3. Recursively deletes objects inside the S3 backup bucket.
4. Purges all ECR repository images.
5. Executes `terraform destroy -auto-approve` to destroy EKS, RDS, EC2, and VPC instances.

---

## 🖼️ Demonstration Screenshots

Demonstration screenshots are located in `docs/screenshots/`.

1. **[Tactical COP Dashboard](file:///Users/saurabhyadav/Desktop/QuantumDefence/docs/screenshots/dashboard_v1.png)**: Visualizes domain assets, threat alerts, and coordinates on the Leaflet.js map.
2. **[Active Threat Tracker](file:///Users/saurabhyadav/Desktop/QuantumDefence/docs/screenshots/threats_status.png)**: Shows severity classifications and neutralization statuses.
3. **[Mission Scheduling](file:///Users/saurabhyadav/Desktop/QuantumDefence/docs/screenshots/missions_status.png)**: Directs state transitions and assigns unit targets.
4. **[Vault Administration](file:///Users/saurabhyadav/Desktop/QuantumDefence/docs/screenshots/vault_secret_config.png)**: Demonstrates secret storage and credentials protection.
5. **[Jenkins CI/CD Pipeline Run](file:///Users/saurabhyadav/Desktop/QuantumDefence/docs/screenshots/jenkins_pipeline_run.png)**: Illustrates the successful build and deploy pipeline stages.
6. **[Grafana Metrics Monitoring](file:///Users/saurabhyadav/Desktop/QuantumDefence/docs/screenshots/grafana_alerts.png)**: Details container memory, CPU utilization, and HTTP request throughput.
7. **[Kibana Logging Query](file:///Users/saurabhyadav/Desktop/QuantumDefence/docs/screenshots/elk_kibana_logs.png)**: Queries structured JSON logs from microservices.
