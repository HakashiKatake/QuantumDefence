#!/bin/bash
set -e

echo "=== Initializing Project Dependencies & Prisma Clients ==="

# Services list
SERVICES=("auth-service" "command-service" "threat-service" "mission-service")

for SERVICE in "${SERVICES[@]}"; do
  echo "Installing dependencies for services/${SERVICE}..."
  cd "/Users/saurabhyadav/Desktop/QuantumDefence/services/${SERVICE}"
  npm install
  echo "Generating Prisma client for services/${SERVICE}..."
  npx prisma generate
done

echo "=== Dependencies Installed & Prisma Clients Generated ==="
