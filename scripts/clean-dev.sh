#!/bin/bash
set -e

echo "=== Cleaning Up QuantumDefense Dev Environment ==="

# Define compose file path
COMPOSE_FILE="/Users/saurabhyadav/Desktop/QuantumDefence/docker/docker-compose.yml"

# Stop and remove containers, networks, and volumes
echo "Stopping and removing containers, networks, and volumes..."
docker compose -f "$COMPOSE_FILE" down -v

# Clean up dangling images
echo "Cleaning up dangling images..."
docker image prune -f

echo "=== Cleanup Complete! Environment is fully reset. ==="
