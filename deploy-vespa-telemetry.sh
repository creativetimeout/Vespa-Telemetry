#!/bin/bash
set -e

REPO_DIR="$HOME/websites/vespa-telemetry"
COMPOSE_FILE="$HOME/websites/docker-compose.yml"
IMAGE_NAME="creative_timeout/vespa-telemetry"
SERVICE="vespa-telemetry"

CURRENT=$(grep -oP "(?<=${IMAGE_NAME}:)\S+" "$COMPOSE_FILE")
MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
NEXT_VERSION="${MAJOR}.$((MINOR + 1))"
NEW_IMAGE="${IMAGE_NAME}:${NEXT_VERSION}"

echo "==> Pulling latest code"
BEFORE_PULL=$(git -C "$REPO_DIR" rev-parse HEAD)
git -C "$REPO_DIR" pull

# Bash keeps running the old copy of this file after the pull replaces it,
# so restart once if the pull changed the script.
if [ -z "$DEPLOY_RESTARTED" ] && ! git -C "$REPO_DIR" diff --quiet "$BEFORE_PULL" HEAD -- deploy-vespa-telemetry.sh; then
  echo "==> Deploy script changed, restarting with the new version"
  DEPLOY_RESTARTED=1 exec bash "$REPO_DIR/deploy-vespa-telemetry.sh" "$@"
fi

echo "==> Building ${NEW_IMAGE}"
docker build --build-arg VITE_APP_VERSION="$NEXT_VERSION" -t "$NEW_IMAGE" "$REPO_DIR"

echo "==> Updating docker-compose.yml (${CURRENT} -> ${NEXT_VERSION})"
sed -i "s|${IMAGE_NAME}:${CURRENT}|${NEW_IMAGE}|" "$COMPOSE_FILE"

echo "==> Deploying"
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE"

echo "==> Cleaning up old image"
docker rmi "${IMAGE_NAME}:${CURRENT}" 2>/dev/null || true

echo ""
echo "Done — ${NEW_IMAGE} is live."
