#!/bin/sh
set -e

echo "=== Initializing HashiCorp Vault secrets ==="

# Check if vault CLI is installed in container or host
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="root-dev-token"

# Enable KV v2 secret engine
docker exec -e VAULT_ADDR="http://127.0.0.1:8200" qdefense-vault vault secrets enable -path=secret kv-v2 || true

# Write postgres credentials
docker exec -e VAULT_ADDR="http://127.0.0.1:8200" qdefense-vault vault kv put secret/quantum-defense/postgres \
  username="postgres" \
  password="postgrespassword" \
  host="postgres" \
  database="qdefense"

# Write JWT credentials
docker exec -e VAULT_ADDR="http://127.0.0.1:8200" qdefense-vault vault kv put secret/quantum-defense/jwt \
  secret="c2-top-secret-signing-key"

# Apply read policies
docker exec -e VAULT_ADDR="http://127.0.0.1:8200" -i qdefense-vault vault policy write c2-policy - <<EOF
path "secret/data/quantum-defense/*" {
  capabilities = ["read"]
}
EOF

echo "=== HashiCorp Vault Secrets Pre-populated! ==="
