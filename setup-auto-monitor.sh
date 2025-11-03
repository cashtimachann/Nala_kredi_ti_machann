#!/bin/bash

# ============================================
# Setup Auto-Monitoring for Docker Containers
# ============================================
# Installs health monitor as cron job to run every 5 minutes

set -e

SERVER_IP="${SERVER_IP:-142.93.78.111}"

echo "======================================"
echo "  Setup Container Auto-Monitor"
echo "======================================"
echo ""

# Check if monitor-containers.sh exists locally
if [ ! -f "monitor-containers.sh" ]; then
    echo "❌ Error: monitor-containers.sh not found!"
    exit 1
fi

echo "📦 Copying monitor script to server..."
scp monitor-containers.sh root@$SERVER_IP:/var/www/nala-credit/

echo "🔧 Making script executable..."
ssh root@$SERVER_IP "chmod +x /var/www/nala-credit/monitor-containers.sh"

echo "📅 Setting up cron job (every 5 minutes)..."
ssh root@$SERVER_IP 'bash -s' << 'ENDSSH'
    # Add cron job if it doesn't exist
    CRON_JOB="*/5 * * * * /var/www/nala-credit/monitor-containers.sh >> /var/log/nala-health-monitor.log 2>&1"
    
    # Check if cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "monitor-containers.sh"; then
        # Add to crontab
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo "✅ Cron job added successfully"
    else
        echo "ℹ️  Cron job already exists"
    fi
    
    # Show current crontab
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep monitor-containers || echo "No monitor cron jobs found"
ENDSSH

echo ""
echo "✅ Auto-monitor setup complete!"
echo ""
echo "📊 Monitor Status:"
echo "   - Script: /var/www/nala-credit/monitor-containers.sh"
echo "   - Logs: /var/log/nala-health-monitor.log"
echo "   - Frequency: Every 5 minutes"
echo ""
echo "Commands to manage:"
echo "   • View logs: ssh root@$SERVER_IP 'tail -f /var/log/nala-health-monitor.log'"
echo "   • Test now:  ssh root@$SERVER_IP '/var/www/nala-credit/monitor-containers.sh'"
echo "   • Remove:    ssh root@$SERVER_IP 'crontab -l | grep -v monitor-containers.sh | crontab -'"
echo ""
