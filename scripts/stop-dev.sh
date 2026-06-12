#!/bin/bash
set -e

echo "=== Stopping QuantumDefense Local Dev Environment ==="

# Navigate to docker compose directory and spin down containers
docker compose -f /Users/saurabhyadav/Desktop/QuantumDefence/docker/docker-compose.yml down

echo "=== Dev Environment Stopped Successfully ==="
