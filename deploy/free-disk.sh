#!/usr/bin/env bash
# Free disk space before Docker builds on small VPS instances.
set -euo pipefail

echo "==> Disk usage before cleanup"
df -h / | tail -1

echo "==> Stopping unused containers"
docker ps -aq | xargs -r docker stop 2>/dev/null || true

echo "==> Removing build cache and dangling images"
docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker container prune -f 2>/dev/null || true
docker volume prune -f 2>/dev/null || true
docker system prune -af 2>/dev/null || true

echo "==> Cleaning package caches"
apt-get clean 2>/dev/null || true
journalctl --vacuum-time=3d 2>/dev/null || true
rm -rf /tmp/* /var/tmp/* 2>/dev/null || true

echo "==> Disk usage after cleanup"
df -h / | tail -1

available_kb="$(df -Pk / | awk 'NR==2 {print $4}')"
min_kb=$((3 * 1024 * 1024)) # 3 GB
if [ "$available_kb" -lt "$min_kb" ]; then
  echo "WARNING: less than 3 GB free on /. Docker build may still fail."
  echo "Consider: resize disk, remove old projects, or delete unused images manually."
fi