#!/usr/bin/env bash
# Script pou verifye eta migrations EF Core vs sa ki aplike nan baz done PostgreSQL.
# Itilize: ./backend/check-migrations-status.sh
# Fallback: si Docker pa disponib li ap eseye itilize 'dotnet' + 'psql' lokal.

set -euo pipefail

PROJECT_DIR="backend/NalaCreditAPI"
CONTEXT="ApplicationDbContext"

color() { # $1=color $2=text
  local c="$1"; shift
  local t="$*"
  if [[ -t 1 ]]; then
    case "$c" in
      red) echo -e "\033[31m$t\033[0m";;
      green) echo -e "\033[32m$t\033[0m";;
      yellow) echo -e "\033[33m$t\033[0m";;
      blue) echo -e "\033[34m$t\033[0m";;
      *) echo "$t";;
    esac
  else
    echo "$t"
  fi
}

use_docker=false
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  use_docker=true
fi

if $use_docker; then
  api_up=$(docker compose ps api >/dev/null 2>&1 && echo true || echo false)
  pg_up=$(docker compose ps postgres >/dev/null 2>&1 && echo true || echo false)
  if [[ "$api_up" != true || "$pg_up" != true ]]; then
    color yellow "[AVÈTISMAN] Docker prezan men containers yo pa tout leve. Y ap itilize mode lokal si posib." 
    use_docker=false
  fi
fi

if ! $use_docker; then
  color yellow "[INFO] Docker pa disponib: ap swiv fallback lokal (dotnet + psql)."
  if ! command -v dotnet &>/dev/null; then
    color red "[ERÈ] 'dotnet' pa disponib. Enstale .NET SDK avan."
    exit 1
  fi
  # Chèche connection string lokal nan appsettings.json
  CONN_STRING=$(grep -E 'DefaultConnection' backend/NalaCreditAPI/appsettings.json | head -1 | sed 's/.*DefaultConnection" *: *"//; s/",*$//') || true
  if [[ -z "${CONN_STRING}" ]]; then
    color red "[ERÈ] Pa jwenn connection string nan appsettings.json."
    exit 1
  fi
  # Parse Host=...,Database=...,Username=...,Password=...
  db_host=$(echo "$CONN_STRING" | tr ';' '\n' | grep -i '^Host=' | cut -d= -f2)
  db_name=$(echo "$CONN_STRING" | tr ';' '\n' | grep -i '^Database=' | cut -d= -f2)
  db_user=$(echo "$CONN_STRING" | tr ';' '\n' | grep -i '^Username=' | cut -d= -f2)
  db_pass=$(echo "$CONN_STRING" | tr ';' '\n' | grep -i '^Password=' | cut -d= -f2)
  export PGPASSWORD="$db_pass"
  if ! command -v psql &>/dev/null; then
    color yellow "[AVÈTISMAN] 'psql' pa jwenn. Enstale li: brew install libpq && brew link --force libpq"
  fi
fi

echo "====================================================="
echo "[1/4] Ranmase lis migrations lokal." 
echo "====================================================="
if $use_docker; then
  LOCAL_MIGRATIONS=$(docker compose exec -T api sh -c "dotnet ef migrations list --context $CONTEXT" | sed '1,/^$/d' || true)
else
  LOCAL_MIGRATIONS=$(cd "$PROJECT_DIR" && dotnet ef migrations list --context "$CONTEXT" 2>&1 | sed '1,/^$/d' || true)
fi

if [ -z "${LOCAL_MIGRATIONS:-}" ]; then
  color red "[ERÈ] Pa jwenn migrations lokal yo. Asire EF Tools enstale: 'dotnet tool install --global dotnet-ef'"
  exit 1
fi
printf '%s\n' "$LOCAL_MIGRATIONS" | sed 's/^/  - /'
LOCAL_CLEAN=$(printf '%s\n' "$LOCAL_MIGRATIONS" | awk '{print $1}' | sed 's/\r//' )

echo "====================================================="
echo "[2/4] Ranmase migrations ki aplike nan baz done." 
echo "====================================================="
if $use_docker; then
  APPLIED_MIGRATIONS=$(docker compose exec -T postgres psql -U nalauser -d nalakreditimachann_db -t -A -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";' | sed 's/\r//' || true)
else
  if command -v psql &>/dev/null; then
    APPLIED_MIGRATIONS=$(psql -h "$db_host" -U "$db_user" -d "$db_name" -t -A -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";' | sed 's/\r//' || true)
  else
    APPLIED_MIGRATIONS=""
    color yellow "[AVÈTISMAN] Pa kapab li migrations aplike paske 'psql' pa disponib."
  fi
fi

if [ -z "${APPLIED_MIGRATIONS}" ]; then
  color yellow "[AVÈTISMAN] Pa gen done retounen nan '__EFMigrationsHistory' oswa tab la pa egziste." 
else
  printf '%s\n' "$APPLIED_MIGRATIONS" | sed 's/^/  - /'
fi

echo "====================================================="
echo "[3/4] Konpare pou detekte migrations ki manke." 
echo "====================================================="
MISSING=()
while IFS= read -r mig; do
  if [ -n "${APPLIED_MIGRATIONS}" ] && ! printf '%s\n' "$APPLIED_MIGRATIONS" | grep -q "${mig}"; then
    MISSING+=("$mig")
  fi
done < <(printf '%s\n' "$LOCAL_CLEAN")

if [ ${#MISSING[@]} -eq 0 ]; then
  if [ -z "${APPLIED_MIGRATIONS}" ]; then
    color yellow "[INFO] Pa gen lis ki aplike; verifye si baz done a init oswa si kredans yo kòrèk."
  else
    color green "[OK] Pa gen migration ki manke." 
  fi
else
  color red "[MANKE] Migrations ki pa aplike:" 
  for m in "${MISSING[@]}"; do
    echo "  * $m"
  done
fi

echo "====================================================="
echo "[4/4] Rekòmandasyon koreksyon." 
echo "====================================================="
cat <<'REKOM'
Si migrations manke:
- Mode Docker:
  docker compose build api && docker compose up -d api
  docker compose exec api sh -c "dotnet ef database update --context ApplicationDbContext"
- Mode Lokal:
  cd backend/NalaCreditAPI
  dotnet ef database update --context ApplicationDbContext
Si chanjman modèl pa gen migration:
  dotnet ef migrations add SyncMissingChanges --context ApplicationDbContext
  dotnet ef database update --context ApplicationDbContext
Verifikasyon rapid tablo:
  psql -h <host> -U <user> -d <db> -c '\dt'
  psql -h <host> -U <user> -d <db> -c '\d "SavingsAccounts"'
REKOM

echo "Fini."
