#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="$ROOT_DIR/.env.docker"
EXAMPLE_FILE="$ROOT_DIR/.env.docker.example"

if [ ! -f "$ENV_FILE" ]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  VAULT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  POSTGRES_PASSWORD=$(openssl rand -hex 24 | tr -d '\n')

  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
  sed -i.bak "s|^VAULT_ENCRYPTION_SECRET=.*|VAULT_ENCRYPTION_SECRET=$VAULT_SECRET|" "$ENV_FILE"
  sed -i.bak "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
  echo "Created .env.docker with random local secrets."
fi

if ! grep -q '^POSTGRES_PASSWORD=' "$ENV_FILE"; then
  {
    echo "POSTGRES_DB=sysadmin_notes"
    echo "POSTGRES_USER=sysadmin_notes"
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 24 | tr -d '\n')"
    echo "POSTGRES_PORT=5432"
  } >> "$ENV_FILE"
  echo "Added PostgreSQL settings to .env.docker."
fi

cd "$ROOT_DIR"
docker compose --env-file "$ENV_FILE" up -d --build
docker compose --env-file "$ENV_FILE" ps
