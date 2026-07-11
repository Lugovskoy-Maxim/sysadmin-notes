#!/usr/bin/env bash
# Use docker compose v2 when available, otherwise docker-compose v1.
set -euo pipefail

if docker compose version >/dev/null 2>&1; then
  exec docker compose "$@"
fi

if command -v docker-compose >/dev/null 2>&1; then
  exec docker-compose "$@"
fi

echo "ERROR: neither 'docker compose' nor 'docker-compose' is available." >&2
echo "Run: bash deploy/install-server.sh" >&2
exit 1