#!/usr/bin/env bash
# Executed on the VPS by GitHub Actions (appleboy/ssh-action).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Lugovskoy-Maxim/sysadmin-notes.git}"
DEFAULT_APP_DIR="/opt/sysadmin-notes"

resolve_app_dir() {
  if [ -n "${DEPLOY_PATH:-}" ] && [ -d "${DEPLOY_PATH}/.git" ]; then
    printf '%s' "$DEPLOY_PATH"
    return 0
  fi

  for candidate in "$DEFAULT_APP_DIR" "$HOME/sysadmin-notes" "/var/www/sysadmin-notes"; do
    if [ -d "$candidate/.git" ]; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  if [ -n "${DEPLOY_PATH:-}" ]; then
    printf '%s' "$DEPLOY_PATH"
    return 0
  fi

  printf '%s' "$DEFAULT_APP_DIR"
}

APP_DIR="$(resolve_app_dir)"
echo "Deploy directory: $APP_DIR"

if [ ! -d "$APP_DIR" ]; then
  echo "Creating $APP_DIR"
  mkdir -p "$APP_DIR"
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Bootstrapping repository in $APP_DIR"
  if [ -n "$(ls -A "$APP_DIR" 2>/dev/null || true)" ]; then
    echo "ERROR: $APP_DIR exists but is not a git repository."
    ls -la "$APP_DIR" || true
    exit 1
  fi
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main
bash deploy/deploy.sh
docker image prune -f

echo "Remote deploy complete."