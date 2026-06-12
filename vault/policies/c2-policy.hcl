# Read database credentials
path "secret/data/quantum-defense/postgres" {
  capabilities = ["read"]
}

# Read JWT signing secrets
path "secret/data/quantum-defense/jwt" {
  capabilities = ["read"]
}
