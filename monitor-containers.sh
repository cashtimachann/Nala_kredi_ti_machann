#!/bin/bash

# ============================================
# Docker Container Health Monitor & Auto-Restart
# ============================================
# Monitors all containers and auto-restarts unhealthy/stopped ones
# Run this as a cron job for automatic recovery

set -e

APP_DIR="/var/www/nala-credit"
LOG_FILE="/var/log/nala-health-monitor.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Health Monitor ==="

# Check if docker is running
if ! systemctl is-active --quiet docker; then
    log "❌ Docker service is not running! Starting..."
    systemctl start docker
    sleep 5
fi

cd "$APP_DIR" || exit 1

# Get list of all services
SERVICES=$(docker compose config --services)

log "Checking services: $SERVICES"

RESTARTED=0
UNHEALTHY=0

for service in $SERVICES; do
    # Get container status
    CONTAINER_INFO=$(docker compose ps "$service" --format json 2>/dev/null)
    
    if [[ -z "$CONTAINER_INFO" ]]; then
        STATUS="not-found"
        HEALTH=""
    else
        STATUS=$(echo "$CONTAINER_INFO" | jq -r 'if type == "array" then .[0].State else .State end' 2>/dev/null || echo "unknown")
        HEALTH=$(echo "$CONTAINER_INFO" | jq -r 'if type == "array" then .[0].Health else .Health end' 2>/dev/null || echo "")
    fi
    
    log "Service: $service | Status: $STATUS | Health: $HEALTH"
    
    # Check if container is not running
    if [[ "$STATUS" != "running" ]]; then
        log "⚠️  Service $service is $STATUS - Restarting..."
        docker compose restart "$service"
        RESTARTED=$((RESTARTED + 1))
        sleep 3
    # Check if container is unhealthy
    elif [[ "$HEALTH" == "unhealthy" ]]; then
        log "⚠️  Service $service is unhealthy - Restarting..."
        docker compose restart "$service"
        UNHEALTHY=$((UNHEALTHY + 1))
        sleep 3
    else
        log "✅ Service $service is healthy"
    fi
done

# Summary
if [[ $RESTARTED -gt 0 ]] || [[ $UNHEALTHY -gt 0 ]]; then
    log "📊 Summary: Restarted $RESTARTED stopped containers, $UNHEALTHY unhealthy containers"
else
    log "✅ All services are healthy"
fi

log "=== Health Monitor Complete ==="
echo ""
