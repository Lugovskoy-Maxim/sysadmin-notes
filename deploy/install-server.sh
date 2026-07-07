#!/usr/bin/env bash
# One-time server bootstrap for lugodev.ru (run as root on the VPS).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sysadmin-notes}"
DOMAIN="${DOMAIN:-lugodev.ru}"
REPO_URL="${REPO_URL:-https://github.com/Lugovskoy-Maxim/sysadmin-notes.git}"

echo "==> Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git nginx certbot python3-certbot-nginx ufw

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
apt-get install -y -qq docker-compose-plugin || true

echo "==> Stopping old manga translator stack if present"
for dir in /opt/manhwa-translator /opt/manga-translator /opt/translator /var/www/manga /root/manga-translator; do
  if [ -d "$dir" ] && [ -f "$dir/docker-compose.yml" ]; then
    (cd "$dir" && docker compose down -v --remove-orphans) || true
  fi
done
docker ps -a --format '{{.Names}}' | grep -Ei 'manga|translator' | xargs -r docker rm -f || true
systemctl disable --now manga-translator 2>/dev/null || true
rm -rf /etc/nginx/sites-enabled/manga* /etc/nginx/sites-available/manga* 2>/dev/null || true

echo "==> Preparing app directory"
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" reset --hard origin/main
fi

echo "==> Nginx site"
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
  install -m 644 "$APP_DIR/deploy/nginx/lugodev.ru.conf" /etc/nginx/sites-available/lugodev.ru
else
  install -m 644 "$APP_DIR/deploy/nginx/lugodev.ru.http.conf" /etc/nginx/sites-available/lugodev.ru
fi
ln -sf /etc/nginx/sites-available/lugodev.ru /etc/nginx/sites-enabled/lugodev.ru
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl start nginx

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Create .env.production if missing"
if [ ! -f "$APP_DIR/.env.production" ]; then
  cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.production"
  JWT=$(openssl rand -base64 48 | tr -d '\n')
  VAULT=$(openssl rand -base64 48 | tr -d '\n')
  PG=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT|" "$APP_DIR/.env.production"
  sed -i "s|VAULT_ENCRYPTION_SECRET=.*|VAULT_ENCRYPTION_SECRET=$VAULT|" "$APP_DIR/.env.production"
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PG|" "$APP_DIR/.env.production"
  echo "Generated secrets in $APP_DIR/.env.production"
fi

echo "==> Starting application"
cd "$APP_DIR"
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi
bash deploy/deploy.sh
systemctl reload nginx

if [ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
  echo "==> Requesting TLS certificate"
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" --redirect || true
  if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    install -m 644 "$APP_DIR/deploy/nginx/lugodev.ru.conf" /etc/nginx/sites-available/lugodev.ru
    nginx -t && systemctl reload nginx
  fi
fi

echo "Done. Open https://$DOMAIN and register the first account — it becomes admin."