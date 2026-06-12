# Project QuantumDefense — Disaster Recovery (DR) Plan

This document defines the Disaster Recovery (DR) procedures and recovery playbooks for the Integrated Multi-Domain Military Command & Control (C2) Platform (`QuantumDefense`).

---

## 1. DR Metrics & Targets

National defense operations require high availability and resilience. The platform targets the following metrics:

* **Recovery Time Objective (RTO):** **15 Minutes** (Maximum acceptable duration to restore the platform to an operational state after a major failure).
* **Recovery Point Objective (RPO):** **5 Minutes** (Maximum acceptable data loss period, ensuring data is backed up or synchronized every 5 minutes).

---

## 2. Backup & Data Redundancy Strategy

### A. Database Redundancy (PostgreSQL 18)
1. **Multi-AZ Replication (RDS)**: In the production AWS environment, the database runs as an Amazon RDS PostgreSQL instance configured with **Multi-AZ replication**. Data is synchronously replicated to a standby database instance in a separate Availability Zone (AZ).
2. **Transaction Logs**: Database transaction write-ahead logs (WAL) are automatically archived to Amazon S3 every 5 minutes, satisfying the 5-minute RPO.
3. **Automated Snapshots**: Daily full backups (snapshots) are taken automatically and stored in an encrypted Amazon S3 bucket with versioning and Object Lock enabled to prevent ransomware modification.

### B. Configuration & Secrets Redundancy
1. **Infrastructure as Code (IaC)**: All VPC, EKS, RDS, and ECR infrastructure configurations are versioned in Git.
2. **Secret Store Backup**: HashiCorp Vault secrets are backed up via raft snapshotting to secure, cross-region S3 buckets.

---

## 3. Disaster Recovery Playbooks

### Playbook 1: Single Availability Zone Outage (Auto-Failover)
* **Scenario**: An AWS Availability Zone in the primary region (e.g., `us-east-1a`) experiences an outage.
* **Procedures**:
  1. **RDS Database**: Amazon RDS automatically detects the failure and performs a DNS failover to the standby database instance in `us-east-1b` (typically takes 1-2 minutes). No application-side configuration changes are required because the DB endpoint hostname remains identical.
  2. **EKS Cluster**: EKS managed node groups are distributed across multiple AZs (`us-east-1a` and `us-east-1b`). Auto Scaling Groups automatically spin up new pods in the healthy AZ to replace lost pods.
  3. **RTO achieved**: < 2 minutes.
  4. **RPO achieved**: 0 minutes (replication is synchronous).

### Playbook 2: Primary Region Outage (Cross-Region Failover)
* **Scenario**: The entire primary AWS region (`us-east-1`) goes offline.
* **Procedures**:
  1. **Infrastructure Provisioning**: Initialize and apply Terraform scripts to provision resources in the backup region (e.g., `us-west-2`):
     ```bash
     cd terraform/
     terraform workspace select backup-region || terraform workspace new backup-region
     terraform apply -auto-approve
     ```
  2. **Database Recovery**: Restore the database from the latest cross-region S3 snapshot to the new RDS instance.
  3. **Kubeconfig Re-routing**: Update local `kubectl` to point to the new cluster:
     ```bash
     aws eks update-kubeconfig --name quantum-defense-cluster --region us-west-2
     ```
  4. **Kubernetes Rollout**: Deploy K8s manifests in the backup cluster:
     ```bash
     kubectl apply -f kubernetes/namespace.yaml
     kubectl apply -f kubernetes/app/
     ```
  5. **DNS Traffic Shift**: Update Amazon Route 53 active-passive failover routing policy to direct all incoming global C2 traffic to the backup region's load balancer.
  6. **RTO achieved**: < 12 minutes.
  7. **RPO achieved**: < 5 minutes (based on latest WAL transaction log backup).

### Playbook 3: Cyber Intrusion & Ransomware Attack
* **Scenario**: A security breach compromises running containers or encrypts the database.
* **Procedures**:
  1. **Isolate Traffic**: Immediately scale down compromise-suspected deployments to 0 to prevent further spread:
     ```bash
     kubectl scale deployment/auth-service --replicas=0 -n quantum-defense
     ```
  2. **Audit & Secrets Rotation**: Rotate JWT secrets and postgres credentials in HashiCorp Vault.
  3. **Build Purge & Recompile**: Run the Jenkins CI/CD pipeline to pull clean, verified code from Git, compile clean Docker images, and push them to ECR.
  4. **Restore Database**: Restore the database to a clean, pre-compromise state using the S3 snapshot.
  5. **Redeploy Workloads**: Scale the deployments back up to pull clean, rebuilt images from ECR:
     ```bash
     kubectl rollout restart deployment/auth-service -n quantum-defense
     ```

---

## 4. DR Drill & Verification Schedule

To ensure operational readiness, defense administrators execute a monthly dry-run drill using the automated lifecycle scripts:
1. Provision the primary environment: `./scripts/prod-provision.sh`.
2. Simulate failure and run cleanup: `./scripts/prod-cleanup.sh`.
3. Verify that all resources are cleanly terminated to maintain a zero-cost footprint between drills.
