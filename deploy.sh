#!/usr/bin/env bash
set -euo pipefail

cd /srv/projects/demos

git fetch origin
git reset --hard origin/main

# Secrets live in Infisical and are only injected by the systemd unit
# (infisical-run). Compose interpolates ${...:?} even for build, so give the
# build a dummy value — it never reaches the image — and let the unit restart
# with the real one.
DEMOS_DB_PASSWORD="${DEMOS_DB_PASSWORD:-build-only-dummy}" \
CF_TUNNEL_TOKEN="${CF_TUNNEL_TOKEN:-build-only-dummy}" \
  docker compose build
sudo systemctl restart demos.service

for c in demos demos-api; do
  echo "Waiting for '$c' to become healthy..."
  deadline=$((SECONDS + 90))
  while true; do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$c" 2>/dev/null || echo "unknown")"
    if [ "$status" = "healthy" ]; then
      break
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "Timed out waiting for '$c' to become healthy (last status: $status)" >&2
      exit 1
    fi
    sleep 3
  done
done

echo "Deployed $(git rev-parse --short HEAD) — demos and demos-api are healthy."
