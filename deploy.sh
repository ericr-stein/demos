#!/usr/bin/env bash
set -euo pipefail

cd /srv/projects/demos

git fetch origin
git reset --hard origin/main

docker compose build
docker compose up -d

echo "Waiting for 'demos' container to become healthy..."
deadline=$((SECONDS + 90))
while true; do
  status="$(docker inspect --format '{{.State.Health.Status}}' demos 2>/dev/null || echo "unknown")"
  if [ "$status" = "healthy" ]; then
    break
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "Timed out waiting for 'demos' to become healthy (last status: $status)" >&2
    exit 1
  fi
  sleep 3
done

echo "Deployed $(git rev-parse --short HEAD) — demos is healthy."
