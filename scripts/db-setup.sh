#!/bin/bash
set -e

# Load environment variables from .env if present
if [ -f /Users/saurabhyadav/Desktop/QuantumDefence/.env ]; then
  export $(grep -v '^#' /Users/saurabhyadav/Desktop/QuantumDefence/.env | xargs)
fi

echo "=== QuantumDefense Database Setup & Seeding ==="

# Check if docker is running
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

echo "1. Launching database and secrets manager containers..."
docker compose -f /Users/saurabhyadav/Desktop/QuantumDefence/docker/docker-compose.yml up -d postgres vault

echo "2. Waiting for PostgreSQL database to be healthy..."
until docker exec qdefense-postgres pg_isready -U postgres >/dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo ""
echo "PostgreSQL is healthy!"

echo "3. Pushing Prisma schemas to database..."
SERVICES=("auth-service" "command-service" "threat-service" "mission-service")
for SERVICE in "${SERVICES[@]}"; do
  SCHEMA_NAME=$(echo $SERVICE | cut -d'-' -f1)
  echo "Pushing schema for services/${SERVICE} with schema=${SCHEMA_NAME}..."
  cd "/Users/saurabhyadav/Desktop/QuantumDefence/services/${SERVICE}"
  DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/qdefense?schema=${SCHEMA_NAME}" npx prisma db push --accept-data-loss
done

echo "4. Seeding initial military personnel and data records..."
cd /Users/saurabhyadav/Desktop/QuantumDefence/services/auth-service
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/qdefense?schema=auth" npx prisma db seed

# Seed other domain entities if database needs initial records
echo "Seeding default domain structures..."
# Let's seed default domains via sql
docker exec -i qdefense-postgres psql -U postgres -d qdefense -c "
SET search_path TO command;
INSERT INTO \"Domain\" (id, name, status, description) VALUES
(1, 'Land Force', 'Nominal', 'Ground combat operations and armored assets'),
(2, 'Air Force', 'Nominal', 'Air space defense and air assets'),
(3, 'Naval Fleet', 'Nominal', 'Maritime defense and surface/subsurface assets'),
(4, 'Cyber Warfare Command', 'Nominal', 'Digital network defense and cyber assets'),
(5, 'Space Command', 'Nominal', 'Satellite tracking and orbital assets')
ON CONFLICT (name) DO NOTHING;
"

docker exec -i qdefense-postgres psql -U postgres -d qdefense -c "
SET search_path TO command;
INSERT INTO \"MilitaryUnit\" (id, name, callsign, \"domainId\", type, status, strength, lat, lng) VALUES
(1, '1st Armored Division', 'IRONCLAD', 1, 'Armor', 'Operational', 95, 28.6139, 77.2090),
(2, '101st Airborne', 'EAGLE', 2, 'FighterSquadron', 'Operational', 100, 20.5937, 78.9629),
(3, '7th Naval Fleet', 'TRIDENT', 3, 'Fleet', 'Operational', 88, 15.3173, 75.7139),
(4, 'Cyber Defense Unit 4', 'FIREWALL', 4, 'CyberUnit', 'Operational', 92, 12.9716, 77.5946),
(5, 'Space Control Team 9', 'ORBIT', 5, 'SpaceControl', 'Operational', 97, 13.0827, 80.2707)
ON CONFLICT (callsign) DO NOTHING;
"

docker exec -i qdefense-postgres psql -U postgres -d qdefense -c "
SET search_path TO command;
INSERT INTO \"Asset\" (id, name, type, \"unitId\", \"domainId\", status, lat, lng, speed, heading, fuel, ammo) VALUES
(1, 'MBT-Alpha', 'Tank', 1, 1, 'Active', 28.6139, 77.2090, 45.0, 90.0, 100.0, 100.0),
(2, 'Raptor-Strike', 'Jet', 2, 2, 'Active', 20.5937, 78.9629, 650.0, 180.0, 100.0, 100.0),
(3, 'Aegis-Destroyer', 'Destroyer', 3, 3, 'Active', 15.3173, 75.7139, 28.0, 270.0, 100.0, 100.0),
(4, 'Sentinel-V', 'Satellite', 5, 5, 'Active', 13.0827, 80.2707, 18000.0, 0.0, 100.0, 100.0)
ON CONFLICT (id) DO NOTHING;
"

echo "=== Database Setup and Seeding Complete! ==="
