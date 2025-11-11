#!/usr/bin/env bash
# Safe helper to update the Postgres `nalauser` password inside the docker-compose
# environment. Usage:
#   ./scripts/update_db_user_password.sh <OLD_PASSWORD> <NEW_PASSWORD>
# The script will try to run psql inside the `postgres` container using the OLD password
# and execute ALTER USER nalauser WITH PASSWORD '<NEW_PASSWORD>';

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <OLD_PASSWORD> <NEW_PASSWORD>"
  exit 2
fi

OLD_PASS="$1"
NEW_PASS="$2"

COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "Using compose directory: $COMPOSE_DIR"

echo "Attempting to update DB user password inside postgres container..."

docker -v >/dev/null 2>&1 || { echo "docker is required" >&2; exit 1; }
docker compose -v >/dev/null 2>&1 || { echo "docker compose is required" >&2; exit 1; }

cd "$COMPOSE_DIR"

# We run psql as the existing DB user (nalauser) using OLD_PASS to issue ALTER USER
# If the OLD password is wrong, psql will fail and the script will exit with non-zero.

export PGPASSWORD="$OLD_PASS"

echo "Running ALTER USER to set new password..."
# Use a guarded quoted command to avoid local shell interpolation
docker compose exec -T postgres bash -lc \
  "PGPASSWORD='${OLD_PASS//'"'/"'\\"'"'}' psql -v ON_ERROR_STOP=1 -U nalauser -d nalakreditimachann_db -c \"ALTER USER nalauser WITH PASSWORD '$NEW_PASS';\""

if [ $? -eq 0 ]; then
  echo "✅ Password updated for user 'nalauser'."
  echo "Don't forget to update your .env / secrets (DB_PASSWORD) and restart services."
  exit 0
else
  echo "❌ Failed to update password. Ensure OLD_PASSWORD is correct and the postgres container is running." >&2
  exit 1
fi
