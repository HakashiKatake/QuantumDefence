#!/bin/bash
set -e

# Add local bin to PATH for local Terraform binary
export PATH="/Users/saurabhyadav/Desktop/QuantumDefence/bin:$PATH"

# Always target us-east-1 — all resources live here.
# Prevents 'cluster not found' errors when ~/.aws/config defaults to another region.
export AWS_DEFAULT_REGION="us-east-1"

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${RED}=== Starting QuantumDefense AWS Production Cleanup (Zero Cost Guard) ===${NC}"

# 1. Verify Prerequisites
PREREQS=("aws" "terraform" "kubectl" "helm")
for CMD in "${PREREQS[@]}"; do
  if ! command -v "$CMD" &> /dev/null; then
    echo -e "${RED}WARNING: '$CMD' not found — some cleanup steps may be skipped.${NC}"
  fi
done

# Export SSO session credentials so Terraform can authenticate
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
if aws configure export-credentials &> /dev/null; then
  echo -e "${CYAN}Exporting session credentials for Terraform...${NC}"
  CREDS=$(aws configure export-credentials)
  export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r '.AccessKeyId')
  export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r '.SecretAccessKey')
  export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r '.SessionToken')
fi

# 2. Delete Kubernetes app namespace
# Must be first — deleting the namespace triggers AWS to deregister and delete
# the Nginx Ingress load balancer (ELB), preventing orphaned paid resources.
echo -e "${CYAN}2. Deleting Kubernetes app namespace (releases ELB load balancer)...${NC}"
kubectl delete namespace quantum-defense --ignore-not-found --timeout=120s || true
kubectl delete -f /Users/saurabhyadav/Desktop/QuantumDefence/kubernetes/namespace.yaml --ignore-not-found || true
echo -e "${GREEN}App namespace deleted.${NC}"

# 3. Uninstall all Helm releases
echo -e "${CYAN}3. Uninstalling Helm releases...${NC}"

# Vault
helm uninstall vault -n quantum-defense &>/dev/null || true

# Nginx Ingress Controller + its namespace
helm uninstall ingress-nginx -n ingress-nginx &>/dev/null || true
kubectl delete namespace ingress-nginx --ignore-not-found --timeout=120s || true

# Monitoring stack — Prometheus + Grafana (added in prod-provision.sh Step 8)
helm uninstall monitoring -n monitoring &>/dev/null || true
kubectl delete namespace monitoring --ignore-not-found --timeout=120s || true

echo -e "${GREEN}All Helm releases uninstalled.${NC}"

# 4. Empty S3 bucket (must be empty before Terraform can delete it)
echo -e "${CYAN}4. Emptying S3 backups bucket...${NC}"
aws s3 rm s3://quantum-defense-backups-saurabhyadav --recursive &>/dev/null || true
echo -e "${GREEN}S3 bucket emptied.${NC}"

# 5. Purge ECR images (must be empty before Terraform can delete the repositories)
echo -e "${CYAN}5. Purging ECR image repositories...${NC}"
REPOS=("frontend" "auth-service" "command-service" "threat-service" "mission-service")
for REPO in "${REPOS[@]}"; do
  echo -e "  Purging quantum-defense/${REPO}..."
  IMAGE_IDS=$(aws ecr list-images \
    --repository-name "quantum-defense/$REPO" \
    --query 'imageIds[*]' \
    --output json 2>/dev/null || echo "[]")
  if [ "$IMAGE_IDS" != "[]" ] && [ "$IMAGE_IDS" != "null" ] && [ -n "$IMAGE_IDS" ]; then
    aws ecr batch-delete-image \
      --repository-name "quantum-defense/$REPO" \
      --image-ids "$IMAGE_IDS" &>/dev/null || true
  fi
done
echo -e "${GREEN}ECR repositories purged.${NC}"

# 6. Terraform Destroy — tears down EKS, RDS, EC2 (Jenkins), VPC, IAM roles, ECR repos, S3
echo -e "${CYAN}6. Running Terraform Destroy...${NC}"
cd /Users/saurabhyadav/Desktop/QuantumDefence/terraform
terraform destroy -auto-approve

echo -e ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         QuantumDefense AWS Cleanup Complete!                ║${NC}"
echo -e "${GREEN}║         Current AWS cost footprint: \$0.00                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
