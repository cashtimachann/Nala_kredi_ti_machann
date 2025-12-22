#!/bin/bash

# Install SSL Certificates for Both Domains
# Enstale sètifika SSL pou de domain yo

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SSL Certificate Installation"
echo "  Nala Credit - Dual Domain Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuration
ADMIN_DOMAIN="admin.nalakreditimachann.com"
BRANCH_DOMAIN="branch.nalakreditimachann.com"
EMAIL="your-email@example.com"  # Change this to your email

echo ""
echo "⚠️  IMPORTANT: Before running this script:"
echo "   1. Make sure both domains are pointing to your server IP"
echo "   2. Nginx must be running"
echo "   3. Ports 80 and 443 must be open"
echo ""
read -p "Press ENTER to continue or Ctrl+C to cancel..."

echo ""
echo "📧 Email for SSL notifications: $EMAIL"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    echo "✅ Certbot installed"
else
    echo "✅ Certbot already installed"
fi

echo ""
echo "🔐 Step 1: Installing SSL for Admin Domain..."
echo "   Domain: $ADMIN_DOMAIN"
echo ""

if certbot certonly --nginx \
    -d $ADMIN_DOMAIN \
    -d www.$ADMIN_DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect; then
    echo "✅ Admin domain SSL certificate installed successfully"
else
    echo "❌ Failed to install SSL for admin domain"
    echo "   Check DNS settings and try again"
fi

echo ""
echo "🔐 Step 2: Installing SSL for Branch Domain..."
echo "   Domain: $BRANCH_DOMAIN"
echo ""

if certbot certonly --nginx \
    -d $BRANCH_DOMAIN \
    -d www.$BRANCH_DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect; then
    echo "✅ Branch domain SSL certificate installed successfully"
else
    echo "❌ Failed to install SSL for branch domain"
    echo "   Check DNS settings and try again"
fi

echo ""
echo "🔄 Step 3: Restarting services..."
cd /var/www/nala-credit
docker compose restart nginx

echo ""
echo "⏳ Waiting for services to restart..."
sleep 10

echo ""
echo "🧪 Step 4: Testing SSL certificates..."

# Test Admin HTTPS
echo "Testing Admin domain..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$ADMIN_DOMAIN || echo "Failed")
echo "   Admin HTTPS: $ADMIN_STATUS"

# Test Branch HTTPS
echo "Testing Branch domain..."
BRANCH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$BRANCH_DOMAIN || echo "Failed")
echo "   Branch HTTPS: $BRANCH_STATUS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ SSL INSTALLATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Certificate Locations:"
echo "   Admin:  /etc/letsencrypt/live/$ADMIN_DOMAIN/"
echo "   Branch: /etc/letsencrypt/live/$BRANCH_DOMAIN/"
echo ""
echo "🌐 Your applications:"
echo "   Admin Dashboard:  https://$ADMIN_DOMAIN"
echo "   Branch Dashboard: https://$BRANCH_DOMAIN"
echo ""
echo "📅 Auto-renewal:"
echo "   Certbot will automatically renew certificates before expiration"
echo "   Test renewal: certbot renew --dry-run"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
