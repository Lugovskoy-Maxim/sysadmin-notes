#!/usr/bin/env bash
# Generate a deploy key for GitHub Actions -> lugodev.ru VPS.
# Run locally, then follow the printed steps.
set -euo pipefail

KEY_PATH="${1:-$HOME/.ssh/sysadmin-notes-deploy}"
SSH_USER="${SSH_USER:-root}"
SSH_HOST="${SSH_HOST:-lugodev.ru}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/sysadmin-notes}"

if [ -f "$KEY_PATH" ]; then
  echo "Key already exists: $KEY_PATH"
else
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "github-actions-sysadmin-notes-deploy"
  echo "Created $KEY_PATH"
fi

echo ""
echo "=== 1. Add public key to the server ==="
echo "Run on your machine (enter server password if asked):"
echo ""
echo "  ssh-copy-id -i ${KEY_PATH}.pub ${SSH_USER}@${SSH_HOST}"
echo ""
echo "Or manually append to ~/.ssh/authorized_keys on the server:"
echo ""
cat "${KEY_PATH}.pub"
echo ""

echo "=== 2. Test SSH login ==="
echo "  ssh -i ${KEY_PATH} ${SSH_USER}@${SSH_HOST} 'cd ${DEPLOY_PATH} && git rev-parse --short HEAD'"
echo ""

echo "=== 3. GitHub repository secrets ==="
echo "Open: https://github.com/Lugovskoy-Maxim/sysadmin-notes/settings/secrets/actions"
echo ""
echo "Create or update these secrets:"
echo "  SSH_HOST     = ${SSH_HOST}"
echo "  SSH_USER     = ${SSH_USER}"
echo "  SSH_PORT     = 22"
echo "  DEPLOY_PATH  = ${DEPLOY_PATH}"
echo "  SSH_PRIVATE_KEY = entire file below (including BEGIN/END lines):"
echo ""
cat "$KEY_PATH"
echo ""
echo "=== 4. Re-run deploy ==="
echo "  GitHub -> Actions -> Deploy to production -> Run workflow"
echo ""
echo "Tip: when pasting SSH_PRIVATE_KEY, copy the full key block with newlines intact."