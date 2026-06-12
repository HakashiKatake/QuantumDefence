# Technical Documentation
## Project QuantumDefense: Integrated Multi-Domain Military Command & Control Platform

**Version:** 1.0.0  
**Date:** June 2026  
**Status:** Approved  
**Author:** Technical Operations Lead  

---

## 1. System Requirements
### Hardware Requirements
* **Minimum Dev Environment:** 4 Cores CPU, 8 GB RAM, 20 GB free disk space.
* **Recommended Dev Environment:** 8 Cores CPU (Apple M-series or Intel/AMD equivalent), 16 GB RAM.
* **Production Cluster (EKS):** 3x `t3.medium` worker nodes (minimum) to support the 13 replicated containers.

### Software Prerequisites
* **Operating System:** macOS (M1/M2/Intel) or Linux (Ubuntu 22.04+).
* **Runtimes:** Node.js v24 LTS, npm v10+.
* **Containers:** Docker v29.x, Docker Compose v5+.
* **Orchestration (Production):** Kubernetes CLI (kubectl v1.36+), Helm v4.x+.
* **IaC:** Terraform v1.15.x+.

---

## 2. Development Environment Setup
To initialize the system locally, execute the following commands:

```bash
# 1. Clone the project repository and change directory
git clone https://github.com/your-repo/QuantumDefence.git
cd QuantumDefence

# 2. Run the environment setup script to create local .env files
./scripts/setup.sh

# 3. Build container images and pull backing databases
docker compose -f docker/docker-compose.yml build

# 4. Launch backing databases and apply migrations (done automatically on startup)
docker compose -f docker/docker-compose.yml up -d postgres vault

# 5. Initialize database tables and seed sample records
docker compose -f docker/docker-compose.yml run --rm auth-service npx prisma db push
docker compose -f docker/docker-compose.yml run --rm auth-service npx prisma db seed

# 6. Bring up all microservices and frontend application
docker compose -f docker/docker-compose.yml up -d
```

---

## 3. Directory Layout
The structure of the codebase is organized as follows:

```
QuantumDefence/
├── services/
│   ├── auth-service/        # Node.js + Express (Port 4001)
│   ├── command-service/     # Node.js + WebSockets + Simulator (Port 4002)
│   ├── threat-service/      # Node.js + Alerts (Port 4003)
│   └── mission-service/     # Node.js + Mission Management (Port 4004)
├── frontend/                # React 19 + Vite 8 SPA
├── gateway/                 # Nginx API Gateway configuration
├── docker/                  # Docker Compose configuration templates
├── terraform/               # Infrastructure provisioning modules
├── kubernetes/              # Manifests for EKS deployments
├── monitoring/              # Prometheus config & Grafana dashboards
├── logging/                 # ELK Logstash filters and configurations
└── scripts/                 # Automation and helper scripts
```

---

## 4. Microservices Technical Details

### 4.1. Authentication Service
* **Key Library dependencies:** `express`, `jsonwebtoken`, `bcryptjs`, `@prisma/client`.
* **Password Hashing:** Passwords are processed using `bcryptjs` with a work factor (salt rounds) of 12.
* **Token Structure:** JWTs are signed using the `HS256` algorithm. The token payload structure:
  ```json
  {
    "userId": 104,
    "name": "Jane Doe",
    "role": "Operator",
    "exp": 1781280000
  }
  ```
* **Authentication Middleware:**
  ```javascript
  const jwt = require('jsonwebtoken');

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized: Missing Token' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ success: false, error: 'Forbidden: Invalid Token' });
      req.user = user;
      next();
    });
  };
  ```

### 4.2. Command Service
* **Prisma Schema Excerpt:**
  ```prisma
  model Asset {
    id        Int      @id @default(autoincrement())
    name      String
    type      String   // E.g., RADAR, DRONE, JET, SHIP
    unitId    Int
    domainId  Int
    status    String   // E.g., ACTIVE, MAINTENANCE, RETIRED
    lat       Float
    lng       Float
    speed     Float
    heading   Float
    fuel      Float    // Value in %
    ammo      Float    // Value in %
  }
  ```
* **Telemetry Simulator Engine:**
  Runs an interval loop every 3 seconds to update coordinate offsets and slowly drain fuel:
  ```javascript
  setInterval(async () => {
    const assets = await prisma.asset.findMany({ where: { status: 'ACTIVE' } });
    for (const asset of assets) {
      // Calculate random heading drift and coordinate change
      const deltaLat = (Math.random() - 0.5) * 0.005;
      const deltaLng = (Math.random() - 0.5) * 0.005;
      const newFuel = Math.max(0, asset.fuel - 0.1);
      
      const updated = await prisma.asset.update({
        where: { id: asset.id },
        data: {
          lat: asset.lat + deltaLat,
          lng: asset.lng + deltaLng,
          fuel: newFuel
        }
      });
      
      // Broadcast update over socket
      io.emit('telemetry:update', updated);
    }
  }, 3000);
  ```

### 4.3. Threat Service
* **Threat Classification Logic:** Incoming sensor entries are mapped to severity values based on velocity, proximity, and signature:
  * Speed > Mach 2 AND Target altitude < 10,000 ft -> Severity: `CRITICAL`
  * Speed > Mach 1 OR Threat within 50 miles -> Severity: `HIGH`
  * Speed <= Mach 1 AND Target distance > 100 miles -> Severity: `MEDIUM`
* **Alert Generation:** Alerts trigger database inserts and propagate instantly via WebSocket `alert:new` messages, prompting high-priority UI alarms.

### 4.4. Mission Service
* **Mission State Machine:** Valid status transitions are restricted by a state manager:
  ```
          ┌───────────────┐
          │   PLANNING    │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │    ACTIVE     │
          └───────┬───────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
    ┌───────────┐   ┌───────────┐
    │ COMPLETED │   │  FAILED   │
    └───────────┘   └───────────┘
  ```
  Transitions are verified using a validation middleware during `PUT /api/missions/:id/status` execution.

---

## 5. API Gateway Configuration (Nginx)
The gateway handles port redirection and WebSocket upgrades:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/auth {
        proxy_pass http://auth-service:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/domains {
        proxy_pass http://command-service:4002;
    }

    location /api/threats {
        proxy_pass http://threat-service:4003;
    }

    location /api/missions {
        proxy_pass http://mission-service:4004;
    }

    location /socket.io/ {
        proxy_pass http://command-service:4002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 6. Docker Build Process
We use multi-stage Docker builds to keep image sizes small and remove development dependencies in production:

```dockerfile
# Stage 1: Build & Install Dependencies
FROM node:24-lts-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate

# Stage 2: Minimal Runtime Environment
FROM node:24-lts-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma

EXPOSE 4001
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
```

---

## 7. Metrics & Observability Configuration
* **prom-client Integration:** Each Node.js microservice exposes Prometheus metrics on `/metrics`. A custom counter measures login volumes:
  ```javascript
  const client = require('prom-client');
  const collectDefaultMetrics = client.collectDefaultMetrics;
  collectDefaultMetrics({ register: client.register });

  const loginCounter = new client.Counter({
    name: 'auth_service_login_total',
    help: 'Total login attempts on the Auth Service',
    labelNames: ['status']
  });
  ```
* **Prometheus Target Configuration (`prometheus.yml`):**
  ```yaml
  scrape_configs:
    - job_name: 'quantum-defense-services'
      scrape_interval: 10s
      static_configs:
        - targets: ['auth-service:4001', 'command-service:4002', 'threat-service:4003', 'mission-service:4004']
  ```

---

## 8. Vault Integration Architecture
Dynamic secret retrieval is managed in the microservice database configuration:

```javascript
const vault = require('node-vault')({ endpoint: process.env.VAULT_ADDR });

async function getDatabaseCredentials() {
  const token = process.env.VAULT_TOKEN;
  vault.token = token;
  
  const secrets = await vault.read('secret/data/quantum-defense/postgres');
  const { username, password, host, database } = secrets.data.data;
  
  return `postgresql://${username}:${password}@${host}:5432/${database}?schema=public`;
}
```

---

## 9. Environment Variables Reference
Below is the configuration checklist required in `.env` configuration files:

| Variable | Description | Default Dev | Scope |
|----------|-------------|-------------|-------|
| `PORT` | Microservice binding port | `4001`-`4004` | All Services |
| `DATABASE_URL` | PostgreSQL direct connection URI | `postgresql://postgres:postgres@localhost:5432/qdefense` | All Services |
| `JWT_SECRET` | Token signature seed | `c2-top-secret-signing-key` | Auth Service |
| `VAULT_ADDR` | Connection address of Secrets Server | `http://vault:8200` | All Services |
| `VAULT_TOKEN` | Local authentication token | `root-dev-token` | All Services |
| `NODE_ENV` | Runtime stage designation | `development` | All Services |
| `SOCKET_IO_PORT` | WebSockets binding | `4002` | Command, Threat |
