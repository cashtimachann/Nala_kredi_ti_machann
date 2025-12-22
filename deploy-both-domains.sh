#!/bin/bash

# Deploy Both Admin and Branch Domains
# Deploy de domain yo: admin.nalakreditimachann.com ak branch.nalakreditimachann.com

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Nala Credit - Dual Domain Deployment"
echo "  Admin + Branch Manager Dashboards"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuration
SERVER_IP="142.93.78.111"
DEPLOY_PATH="/var/www/nala-credit"
ADMIN_DOMAIN="admin.nalakreditimachann.com"
BRANCH_DOMAIN="branch.nalakreditimachann.com"
SSH_KEY="$HOME/.ssh/nala_deployment_rsa"

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at $SSH_KEY"
    echo "Please ensure your SSH key is properly configured"
    exit 1
fi

echo ""
echo "📋 Deployment Configuration:"
echo "   Server IP: $SERVER_IP"
echo "   Deploy Path: $DEPLOY_PATH"
echo "   Admin Domain: https://$ADMIN_DOMAIN"
echo "   Branch Domain: https://$BRANCH_DOMAIN"
echo ""

# Test SSH connection
echo "🔐 Testing SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$SERVER_IP "echo 'Connected successfully'" > /dev/null 2>&1; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    exit 1
fi

echo ""
echo "🏗️  Step 1: Building deployment package..."
tar czf deploy-dual.tar.gz \
    --exclude='.git' \
    --exclude='.github' \
    --exclude='node_modules' \
    --exclude='frontend-web/node_modules' \
    --exclude='backend/NalaCreditAPI/bin' \
    --exclude='backend/NalaCreditAPI/obj' \
    --exclude='*.md' \
    --exclude='deploy*.tar.gz' \
    . 2>/dev/null || true

if [ ! -f deploy-dual.tar.gz ]; then
    echo "❌ Failed to create deployment package"
    exit 1
fi

echo "✅ Deployment package created"

echo ""
echo "📤 Step 2: Uploading to server..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no deploy-dual.tar.gz root@$SERVER_IP:/tmp/
echo "✅ Upload complete"

echo ""
echo "🚀 Step 3: Deploying on server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'
set -e

DEPLOY_PATH="/var/www/nala-credit"
ADMIN_DOMAIN="admin.nalakreditimachann.com"
BRANCH_DOMAIN="branch.nalakreditimachann.com"

cd $DEPLOY_PATH

echo "📦 Creating backup..."
BACKUP_DIR="/var/backups/nala-credit/dual-deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup critical files
[ -f .env ] && cp .env "$BACKUP_DIR/"
[ -f nginx.conf ] && cp nginx.conf "$BACKUP_DIR/"
[ -f docker-compose.yml ] && cp docker-compose.yml "$BACKUP_DIR/"

echo "✅ Backup saved to: $BACKUP_DIR"

echo "📦 Extracting new code..."
tar xzf /tmp/deploy-dual.tar.gz -C $DEPLOY_PATH
rm /tmp/deploy-dual.tar.gz

# Restore critical files
[ -f "$BACKUP_DIR/.env" ] && cp "$BACKUP_DIR/.env" .env
[ -f "$BACKUP_DIR/nginx.conf" ] && cp "$BACKUP_DIR/nginx.conf" nginx.conf

echo "🛑 Stopping existing containers..."
docker compose down || true

echo "🏗️  Building Docker images..."
docker compose build --no-cache

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 20

echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "🏥 Health Checks:"
echo "   API: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/health || echo 'Failed')"
echo "   Admin Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:80 || echo 'Failed')"
echo "   Branch Frontend: $(docker compose exec -T frontend-branch curl -s -o /dev/null -w '%{http_code}' http://localhost || echo 'Failed')"

echo ""
echo "🔐 Checking SSL certificates..."
if [ -d "/etc/letsencrypt/live/$ADMIN_DOMAIN" ]; then
    echo "   ✅ Admin SSL: Certificate exists"
else
    echo "   ⚠️  Admin SSL: Certificate NOT found - needs installation"
fi

if [ -d "/etc/letsencrypt/live/$BRANCH_DOMAIN" ]; then
    echo "   ✅ Branch SSL: Certificate exists"
else
    echo "   ⚠️  Branch SSL: Certificate NOT found - needs installation"
fi

echo ""
echo "✅ Deployment complete!"
ENDSSH

echo ""
echo "🧹 Cleanup local files..."
rm -f deploy-dual.tar.gz

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ DEPLOYMENT SUCCESSFUL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Install SSL certificates (if needed):"
echo ""
echo "   For Admin Domain:"
echo "   ssh root@$SERVER_IP"
echo "   certbot certonly --nginx -d $ADMIN_DOMAIN -d www.$ADMIN_DOMAIN"
echo ""
echo "   For Branch Domain:"
echo "   certbot certonly --nginx -d $BRANCH_DOMAIN -d www.$BRANCH_DOMAIN"
echo ""
echo "2️⃣  Restart Nginx after SSL installation:"
echo "   docker compose restart nginx"
echo ""
echo "3️⃣  Test the applications:"
echo "   Admin: https://$ADMIN_DOMAIN"
echo "   Branch: https://$BRANCH_DOMAIN"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
