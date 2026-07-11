#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

COMPOSE_SH="$(cd "$(dirname "$0")" && pwd)/compose.sh"
chmod +x "$COMPOSE_SH"
DC=("$COMPOSE_SH")

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

rm -rf "$APP_DIR/.npm-cache"
bash "$(dirname "$0")/free-disk.sh"

export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-1}"

# Build one service at a time to reduce peak disk usage on small VPS disks.
"${DC[@]}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build api
docker builder prune -af >/dev/null 2>&1 || true
"${DC[@]}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build web
docker builder prune -af >/dev/null 2>&1 || true

"${DC[@]}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans
"${DC[@]}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile tools run --rm migrate

if [ -f deploy/nginx/lugodev.ru.conf ] && [ -d /etc/nginx/sites-available ]; then
  if [ -f /etc/letsencrypt/live/lugodev.ru/fullchain.pem ]; then
    install -m 644 deploy/nginx/lugodev.ru.conf /etc/nginx/sites-available/lugodev.ru
  else
    install -m 644 deploy/nginx/lugodev.ru.http.conf /etc/nginx/sites-available/lugodev.ru
  fi
  ln -sf /etc/nginx/sites-available/lugodev.ru /etc/nginx/sites-enabled/lugodev.ru
  nginx -t && systemctl reload nginx
fi

echo "Deploy complete."