#!/bin/bash
set -e

# Add local bin to PATH for local Terraform binary
export PATH="/Users/saurabhyadav/Desktop/QuantumDefence/bin:$PATH"
export AWS_DEFAULT_REGION="us-east-1"

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}=== QuantumDefense DB Seed & Schema Push ===${NC}"

# ── Hardcoded from last terraform output ─────────────────────────────────────
CLUSTER_NAME="quantum-defense-cluster"
RDS_HOST="quantum-defense-db.ccr6wqyca8p3.us-east-1.rds.amazonaws.com"
AUTH_IMAGE="032667094119.dkr.ecr.us-east-1.amazonaws.com/quantum-defense/auth-service:latest"
COMMAND_IMAGE="032667094119.dkr.ecr.us-east-1.amazonaws.com/quantum-defense/command-service:latest"
DB_PASS="TacticalC2SecureDBPass!"

AUTH_DB_URL="postgresql://postgres:${DB_PASS}@${RDS_HOST}:5432/qdefense?schema=auth"
COMMAND_DB_URL="postgresql://postgres:${DB_PASS}@${RDS_HOST}:5432/qdefense?schema=command"
# ─────────────────────────────────────────────────────────────────────────────

# Ensure kubeconfig points to the right cluster
echo -e "${CYAN}Configuring kubectl context...${NC}"
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region us-east-1

echo -e "${CYAN}Waiting for microservice pods to be ready...${NC}"
kubectl rollout status deployment/auth-service    -n quantum-defense --timeout=180s
kubectl rollout status deployment/command-service -n quantum-defense --timeout=180s

echo -e "${CYAN}Pushing Prisma schema (auth) via temporary root pod...${NC}"
# Uses runAsUser:0 (root) to avoid EACCES on node_modules/.prisma owned by root from build stage.
# --skip-generate because prisma generate already ran at image build time (Dockerfile line 7).
AUTH_OVERRIDES=$(printf \
  '{"spec":{"securityContext":{"runAsUser":0},"containers":[{"name":"prisma-auth-push","image":"%s","command":["npx","prisma","db","push","--accept-data-loss","--skip-generate"],"env":[{"name":"DATABASE_URL","value":"%s"}]}]}}' \
  "$AUTH_IMAGE" "$AUTH_DB_URL")

kubectl run prisma-auth-push --rm -i --restart=Never -n quantum-defense \
  --image="$AUTH_IMAGE" \
  --overrides="$AUTH_OVERRIDES"

echo -e "${CYAN}Pushing Prisma schema (command) via temporary root pod...${NC}"
COMMAND_OVERRIDES=$(printf \
  '{"spec":{"securityContext":{"runAsUser":0},"containers":[{"name":"prisma-command-push","image":"%s","command":["npx","prisma","db","push","--accept-data-loss","--skip-generate"],"env":[{"name":"DATABASE_URL","value":"%s"}]}]}}' \
  "$COMMAND_IMAGE" "$COMMAND_DB_URL")

kubectl run prisma-command-push --rm -i --restart=Never -n quantum-defense \
  --image="$COMMAND_IMAGE" \
  --overrides="$COMMAND_OVERRIDES"

echo -e "${CYAN}Running auth seed (users & roles)...${NC}"
AUTH_POD=$(kubectl get pods -n quantum-defense -l app=auth-service -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n quantum-defense "$AUTH_POD" -- sh -c "DATABASE_URL='$AUTH_DB_URL' npx prisma db seed"

echo -e "${CYAN}Seeding Domain data...${NC}"
kubectl run pg-client --rm -i --restart=Never --image=postgres:16-alpine -n quantum-defense \
  --env="PGPASSWORD=${DB_PASS}" -- \
  psql -h "$RDS_HOST" -U postgres -d qdefense -c "
  CREATE SCHEMA IF NOT EXISTS command;
  SET search_path TO command;
  INSERT INTO \"Domain\" (id, name, status, description) VALUES
  (1, 'Land Force',             'Nominal', 'Ground combat operations and armored assets'),
  (2, 'Air Force',              'Nominal', 'Air space defense and air assets'),
  (3, 'Naval Fleet',            'Nominal', 'Maritime defense and surface/subsurface assets'),
  (4, 'Cyber Warfare Command',  'Nominal', 'Digital network defense and cyber assets'),
  (5, 'Space Command',          'Nominal', 'Satellite tracking and orbital assets')
  ON CONFLICT (name) DO NOTHING;
  "

echo -e "${CYAN}Seeding MilitaryUnit data...${NC}"
kubectl run pg-client-units --rm -i --restart=Never --image=postgres:16-alpine -n quantum-defense \
  --env="PGPASSWORD=${DB_PASS}" -- \
  psql -h "$RDS_HOST" -U postgres -d qdefense -c "
  SET search_path TO command;
  INSERT INTO \"MilitaryUnit\" (id, name, callsign, \"domainId\", type, status, strength, lat, lng) VALUES
  (1, '1st Armored Division',   'IRONCLAD', 1, 'Armor',         'Operational', 95,  28.6139, 77.2090),
  (2, '101st Airborne',         'EAGLE',    2, 'FighterSquadron','Operational', 100, 20.5937, 78.9629),
  (3, '7th Naval Fleet',        'TRIDENT',  3, 'Fleet',         'Operational', 88,  15.3173, 75.7139),
  (4, 'Cyber Defense Unit 4',   'FIREWALL', 4, 'CyberUnit',     'Operational', 92,  12.9716, 77.5946),
  (5, 'Space Control Team 9',   'ORBIT',    5, 'SpaceControl',  'Operational', 97,  13.0827, 80.2707)
  ON CONFLICT (callsign) DO NOTHING;
  "

echo -e "${CYAN}Seeding Asset data...${NC}"
kubectl run pg-client-assets --rm -i --restart=Never --image=postgres:16-alpine -n quantum-defense \
  --env="PGPASSWORD=${DB_PASS}" -- \
  psql -h "$RDS_HOST" -U postgres -d qdefense -c "
  SET search_path TO command;
  INSERT INTO \"Asset\" (id, name, type, \"unitId\", \"domainId\", status, lat, lng, speed, heading, fuel, ammo) VALUES
  (1, 'MBT-Alpha',       'Tank',       1, 1, 'Active', 28.6139, 77.2090,    45.0, 90.0,  100.0, 100.0),
  (2, 'Raptor-Strike',   'Jet',        2, 2, 'Active', 20.5937, 78.9629,   650.0, 180.0, 100.0, 100.0),
  (3, 'Aegis-Destroyer', 'Destroyer',  3, 3, 'Active', 15.3173, 75.7139,    28.0, 270.0, 100.0, 100.0),
  (4, 'Sentinel-V',      'Satellite',  5, 5, 'Active', 13.0827, 80.2707, 18000.0, 0.0,   100.0, 100.0)
  ON CONFLICT (id) DO NOTHING;
  "

echo -e "${CYAN}Rolling out fresh deployments...${NC}"
kubectl rollout restart deployment/auth-service    -n quantum-defense
kubectl rollout restart deployment/command-service -n quantum-defense
kubectl rollout restart deployment/threat-service  -n quantum-defense
kubectl rollout restart deployment/mission-service -n quantum-defense
kubectl rollout restart deployment/frontend        -n quantum-defense

echo -e "${GREEN}=== DB Seed Complete! ===${NC}"
echo ""
echo -e "${CYAN}Load balancer URL (may take a few minutes to provision):${NC}"
kubectl get ingress c2-ingress -n quantum-defense
