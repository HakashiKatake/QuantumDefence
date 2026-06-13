# Walkthrough: End-to-End DevOps & Microservices Implementation

I have successfully completed the entire project implementation as planned. The system includes four microservices, Nginx reverse proxies, a React 19 single-page application migrated to Tailwind CSS v4, and a complete DevOps lifecycle setup.

---

## 1. Project Blueprint Summary

### Microservices
* **[Auth Service](file:///Users/saurabhyadav/Desktop/QuantumDefence/services/auth-service)** (Port `4001`): Signed JWT tokens, password crypt, and audit logs.
* **[Command Service](file:///Users/saurabhyadav/Desktop/QuantumDefence/services/command-service)** (Port `4002`): Asset tracking, Socket.IO live coordinates simulation.
* **[Threat Service](file:///Users/saurabhyadav/Desktop/QuantumDefence/services/threat-service)** (Port `4003`): Active alert routing, threat classification logs.
* **[Mission Service](file:///Users/saurabhyadav/Desktop/QuantumDefence/services/mission-service)** (Port `4004`): State-machine validation for military directives.

### Frontend (Tailwind CSS v4 + React 19 + Vite 6)
* The UI has been fully migrated from raw CSS to **Tailwind CSS v4** utilizing CSS-native configuration (`@theme` in [index.css](file:///Users/saurabhyadav/Desktop/QuantumDefence/frontend/src/index.css)).
* The build output has been validated and compiled cleanly under 2 seconds:
  ```bash
  dist/index.html                   1.13 kB
  dist/assets/index-X1LEhy2w.css   22.57 kB
  dist/assets/index--PRaoHbF.js   483.96 kB
  ```

---

## 2. DevOps & Infrastructure Configuration

### 2.1. Infrastructure as Code (IaC)
Created Terraform modules in [terraform/](file:///Users/saurabhyadav/Desktop/QuantumDefence/terraform) to provision AWS components:
* **VPC**: 2 public, 2 private, and 2 database subnets across 2 Availability Zones.
* **EKS Cluster**: Managed worker nodes running K8s v1.36.
* **EC2**: Provisioned Jenkins build worker.
* **RDS**: Multi-AZ PostgreSQL 18 instance.
* **ECR**: 5 docker image registries.
* **S3**: Secure backup storage bucket.

### 2.2. Kubernetes Manifests
Created EKS deployment files in [kubernetes/](file:///Users/saurabhyadav/Desktop/QuantumDefence/kubernetes):
* Deployments and Services for all 5 containers (4 services + frontend).
* **Ingress**: Reverse routing for REST APIs and upgrade paths for Socket.IO.
* **HPA**: Horizontal Pod Autoscalers targeting 70% CPU utilization.
* **ConfigMaps**: System environment variable bindings.

### 2.3. Jenkins CI/CD Pipeline
Created the **[Jenkinsfile](file:///Users/saurabhyadav/Desktop/QuantumDefence/jenkins/Jenkinsfile)** at root specifying:
1. Parallel checkouts and lints.
2. Parallel Docker builds (Oxide cache-optimized).
3. Image uploads to Amazon ECR.
4. Kubernetes cluster rollouts via `kubectl rollout restart`.
5. Regional endpoint health validation.

### 2.4. Observability Stack
* **Prometheus & Grafana**: Set up scraping targets ([prometheus.yml](file:///Users/saurabhyadav/Desktop/QuantumDefence/monitoring/prometheus/prometheus.yml)) and metric thresholds ([alert.rules.yml](file:///Users/saurabhyadav/Desktop/QuantumDefence/monitoring/prometheus/alert.rules.yml)).
* **ELK Stack**: Logging pipeline filtering container JSON output ([logstash.conf](file:///Users/saurabhyadav/Desktop/QuantumDefence/logging/logstash/logstash.conf)).

### 2.5. HashiCorp Vault
* Configured access policies ([c2-policy.hcl](file:///Users/saurabhyadav/Desktop/QuantumDefence/vault/policies/c2-policy.hcl)) and populated postgres/jwt values ([init-vault.sh](file:///Users/saurabhyadav/Desktop/QuantumDefence/vault/scripts/init-vault.sh)).

---

## 3. How to Run the Environment

### A. Local Development

1. Open **Docker Desktop** on your host computer.
2. From the project root, launch the databases:
   ```bash
   ./scripts/db-setup.sh
   ```
3. Pre-populate secrets in HashiCorp Vault:
   ```bash
   ./vault/scripts/init-vault.sh
   ```
4. Start the microservices, Nginx gateway, Prometheus, and Grafana:
   ```bash
   ./scripts/start-dev.sh
   ```
5. Run the frontend:
   * **Production build** (compiled locally and served directly by Nginx Gateway on port 80):
     ```bash
     cd frontend && npm run build
     ```
     Open: [http://localhost](http://localhost)
   * **Development server** (run via Vite on port 3000 with proxy to the Nginx gateway):
     ```bash
     cd frontend && npm run dev
     ```
     Open: [http://localhost:3000](http://localhost:3000)
6. Log in to the application using:
   * **Email:** `commander@quantumdefense.mil`
   * **Password:** `TacticalC2Secure!`
7. Access monitoring dashboards:
   * **Prometheus Server**: [http://localhost:9090](http://localhost:9090) (view target status and raw query metrics)
   * **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) (visualize metrics over time; uses the auto-provisioned Prometheus datasource)

### B. CI/CD Orchestration (Jenkins)
The project includes a declarative build pipeline defined in the **[Jenkinsfile](file:///Users/saurabhyadav/Desktop/QuantumDefence/jenkins/Jenkinsfile)**. When you provision the environment:
1. The Jenkins EC2 instance automatically installs all dependencies (Java 17, Jenkins LTS, Docker, Node.js 20, AWS CLI, and `kubectl`) on boot.
2. **Access Jenkins**: Navigate to `http://<jenkins_public_ip>:8080`.
3. **Get Initial Admin Password**: SSH into the Jenkins EC2 instance and run:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```
4. **Install Plugins**: Complete the setup wizard and install these plugins:
   * `Pipeline`
   * `AWS Steps` / `Amazon Web Services SDK`
   * `Docker Pipeline`
   * `Kubernetes Pipeline`
5. **Configure Credentials**:
   * Add AWS ECR Credentials (`aws-ecr-credentials`): Type **AWS Credentials** using your Access Key ID and Secret Access Key.
   * Add EKS Kubeconfig (`eks-kubeconfig`): Type **Secret file** containing your `~/.kube/config` EKS configuration file.
6. **Create Pipeline**: Create a new Pipeline job, select "Pipeline script from SCM", configure your Git repository URL, and set the script path to `jenkins/Jenkinsfile`.
7. **Run Pipeline**: Click **Build Now** to execute the parallel testing, ECR image compilation, ECR registry uploads, and EKS rolling updates.

### C. Production Cloud Deployment & Teardown (EKS & RDS)

I have created two comprehensive scripts in `scripts/` to fully automate the production AWS deployment and zero-cost teardown lifecycles:

1. **Deploy Production Environment**:
   ```bash
   ./scripts/prod-provision.sh
   ```
   * **What it does**: Verifies system dependencies (Terraform, AWS CLI, Helm, Kubectl, Docker, JQ), provisions the AWS infrastructure (VPC, EKS cluster, EC2 Jenkins instance, RDS PostgreSQL 18 database, and 5 ECR container registries) via Terraform, installs/initializes HashiCorp Vault in dev mode on EKS, builds and pushes production-ready Docker images to ECR, applies K8s deployment manifests using dynamic ECR tags, and initializes/seeds the RDS database with core C2 data records directly from inside the EKS cluster.

2. **Complete Tear-down (Zero Cost Guard)**:
   ```bash
   ./scripts/prod-cleanup.sh
   ```
   * **What it does**: Deletes all active K8s workloads and namespaces (which automatically releases associated AWS LoadBalancers to prevent leaked ELB billing), purges all ECR repository images and S3 backup bucket objects, and executes `terraform destroy --auto-approve` to completely destroy VPCs, EKS clusters, databases, and EC2 instances, returning your AWS billing footprint to **exactly $0.00**.

---

## 4. Debugging & Resolutions

### 4.1. PostgreSQL 18 Mount & PGDATA Warning
* **Problem:** Postgres 18 container failed to start because it expects database files in version-specific directory layouts compatible with `pg_ctlcluster` rather than a direct mount at `/var/lib/postgresql/data`.
* **Solution:** Configured the volume mount point in `docker/docker-compose.yml` to target `/var/lib/postgresql`, allowing Postgres 18 to automatically manage the major-version directory sub-hierarchy.

### 4.2. Database Schema Isolation Conflict
* **Problem:** Using a single shared database `qdefense` with the default `public` schema caused `npx prisma db push` from each microservice to drop the other services' tables, since Prisma attempts to match the DB schema exactly to the service's models.
* **Solution:** 
  1. Configured each microservice to use its own isolated PostgreSQL database schema: `auth` schema for Auth Service, `command` schema for Command Service, `threat` schema for Threat Service, and `mission` schema for Mission Service.
  2. Updated `docker-compose.yml` environment variable `DATABASE_URL` for all services.
  3. Modified `secrets.js` in all service configurations to use the correct schema dynamically.
  4. Updated `scripts/db-setup.sh` to load schema parameters during Prisma push and set the psql `search_path` to `command` before domain/asset inserts.

### 4.3. Missing Dependencies and Lock File Desync
* **Problem:** Service containers failed to run due to missing package `jsonwebtoken` used in `src/middleware/auth.js`. Adding it directly to `package.json` caused Docker builds to fail at the `npm ci` stage due to a lockfile desync.
* **Solution:** Added `"jsonwebtoken": "^9.0.2"` to the dependencies of the Command, Threat, and Mission services, ran local `npm install` in each directory to synchronize their `package-lock.json` files, and updated `start-dev.sh` to include the `--build` flag for automated image recreation.

### 4.4. Nginx Gateway Welcome Page Override
* **Problem:** Visiting the API Gateway on `http://localhost:80` returned the default Nginx welcome page rather than serving the compiled React frontend, because the frontend build output was not mounted in the Nginx container's HTML directory.
* **Solution:** Added a volume mount in `docker/docker-compose.yml` mapping `../frontend/dist` to `/usr/share/nginx/html:ro` for the `gateway` container. This allows the API Gateway to route backend API requests and directly serve the production React single-page application at port 80.


