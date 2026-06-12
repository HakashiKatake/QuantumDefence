#!/bin/bash
set -e

echo "=== Starting QuantumDefense Local Dev Environment ==="

# Navigate to docker compose directory and launch containers
docker compose -f /Users/saurabhyadav/Desktop/QuantumDefence/docker/docker-compose.yml up -d --build

echo ""
echo "=== Dev Environment Containers Launched ==="
echo "Access points:"
echo "- API Gateway / React UI: http://localhost:80"
echo "- Auth Microservice API:  http://localhost:4001"
echo "- Command Microservice API: http://localhost:4002"
echo "- Threat Microservice API:  http://localhost:4003"
echo "- Mission Microservice API: http://localhost:4004"
echo "- HashiCorp Vault Server:  http://localhost:8200"
echo "- Prometheus Server:       http://localhost:9090"
echo "- Grafana Dashboard:       http://localhost:3001"
echo "============================================="
