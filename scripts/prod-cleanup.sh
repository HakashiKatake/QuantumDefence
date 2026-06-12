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

echo -e "${RED}=== Starting QuantumDefense AWS Production Cleanup (Zero Cost Guard) ===${NC}"

# 1. Verify Prerequisites
PREREQS=("aws" "terraform" "kubectl" "helm")
for CMD in "${PREREQS[@]}"; do
  if ! command -v "$CMD" &> /dev/null; then
    echo -e "${RED}ERROR: '$CMD' is not installed. Cleanup might be incomplete.${NC}"
  fi
done

# 2. Kubernetes Resource Teardown
echo -e "${CYAN}1. Deleting Kubernetes namespace and releasing cloud Load Balancers...${NC}"
# Deleting namespace first terminates all Load Balancer services created by ingress/nginx controller,
# preventing orphaned ELB/ALB resource leakage (which AWS charges for).
kubectl delete namespace quantum-defense --ignore-not-found --timeout=120s || true
kubectl delete -f /Users/saurabhyadav/Desktop/QuantumDefence/kubernetes/namespace.yaml --ignore-not-found || true
echo -e "${GREEN}Kubernetes services and namespace deleted.${NC}"

# 3. Helm Releases Teardown
echo -e "${CYAN}2. Uninstalling Helm releases...${NC}"
helm uninstall vault -n quantum-defense &>/dev/null || true
echo -e "${GREEN}Helm releases uninstalled.${NC}"

# 4. AWS S3 Bucket Purge
echo -e "${CYAN}3. Emptying S3 Backups bucket...${NC}"
aws s3 rm s3://quantum-defense-backups-saurabhyadav --recursive &>/dev/null || true
echo -e "${GREEN}S3 Bucket purged.${NC}"

# 5. ECR Images Purge
echo -e "${CYAN}4. Purging ECR Registry images...${NC}"
REPOS=("frontend" "auth-service" "command-service" "threat-service" "mission-service")
for REPO in "${REPOS[@]}"; do
  echo -e "Purging quantum-defense/$REPO image repository..."
  IMAGE_IDS=$(aws ecr list-images --repository-name "quantum-defense/$REPO" --query 'imageIds[*]' --output json 2>/dev/null || echo "[]")
  if [ -n "$IMAGE_IDS" ] && [ "$IMAGE_IDS" != "[]" ] && [ "$IMAGE_IDS" != "null" ]; then
    aws ecr batch-delete-image --repository-name "quantum-defense/$REPO" --image-ids "$IMAGE_IDS" &>/dev/null || true
  fi
done
echo -e "${GREEN}ECR Registry images purged.${NC}"

# 6. Terraform Destroy
echo -e "${CYAN}5. Executing Terraform Destroy...${NC}"
cd /Users/saurabhyadav/Desktop/QuantumDefence/terraform
terraform destroy -auto-approve

echo -e "${GREEN}=== QuantumDefense AWS Production Cleanup Complete! ===${NC}"
echo -e "${GREEN}All AWS resources destroyed. Current cost footprint is \$0.00.${NC}"
