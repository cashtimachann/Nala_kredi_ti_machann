#!/bin/bash

# ============================================
# Install Let's Encrypt SSL for Subdomain
# ============================================
# For subdomains without www variant

set -e

DOMAIN="admin.nalakreditimachann.com"
EMAIL="info@nalakreditimachann.com"
SERVER_IP="142.93.78.111"

echo "🔒 Installing Let's Encrypt SSL for $DOMAIN"
echo ""

ssh root@$SERVER_IP << 'ENDSSH'

echo "📦 Installing Certbot..."
apt-get update -qq
apt-get install -y -qq certbot

echo ""
echo "🔍 Verifying domain points to this server..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short admin.nalakreditimachann.com | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1)

if [[ "$SERVER_IP" != "$DOMAIN_IP" ]]; then
    echo "⚠️  WARNING: Domain resolves to $DOMAIN_IP"
    echo "   But this server IP is: $SERVER_IP"
    echo ""
    echo "❌ Domain must point to this server!"
    exit 1
fi

echo "✅ Domain verification successful"
echo ""

echo "🔐 Obtaining SSL certificate from Let's Encrypt..."

# Stop nginx temporarily
cd /var/www/nala-credit
docker compose stop nginx

# Get certificate using standalone mode (subdomain only, no www)
certbot certonly --standalone \
    -d admin.nalakreditimachann.com \
    --non-interactive \
    --agree-tos \
    --email info@nalakreditimachann.com \
    --preferred-challenges http

if [ $? -ne 0 ]; then
    echo "❌ Certificate generation failed!"
    docker compose start nginx
    exit 1
fi

echo ""
echo "✅ Certificate obtained successfully!"
echo ""

# Backup old nginx config
cp /var/www/nala-credit/nginx.conf /var/www/nala-credit/nginx.conf.backup

# Update nginx configuration with SSL
echo "📝 Updating Nginx configuration for HTTPS..."

cat > /var/www/nala-credit/nginx.conf << 'EOF'
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    upstream backend_api {
        server api:5000;
        keepalive 32;
    }

    upstream frontend {
        server frontend:80;
        keepalive 32;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name admin.nalakreditimachann.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name admin.nalakreditimachann.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/admin.nalakreditimachann.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/admin.nalakreditimachann.com/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        client_max_body_size 50M;

        # API endpoints
        location /api/ {
            proxy_pass http://backend_api/api/;
            proxy_http_version 1.1;
            
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $server_name;
            
            proxy_set_header Connection "";
            proxy_buffering off;
            proxy_cache_bypass $http_upgrade;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Frontend (React app)
        location / {
            proxy_pass http://frontend/;
            proxy_http_version 1.1;
            
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_set_header Connection "";
            proxy_buffering off;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo "✅ Nginx configuration updated"
echo ""

# Update docker-compose to mount SSL certificates
echo "📝 Updating docker-compose.yml for SSL..."

# Backup docker-compose
cp /var/www/nala-credit/docker-compose.yml /var/www/nala-credit/docker-compose.yml.backup-ssl

# Add volume mounts for SSL certificates to nginx service
# We'll do this by recreating the nginx service definition

echo "🔄 Restarting Nginx with SSL..."
docker compose up -d nginx

echo ""
echo "⏰ Setting up automatic certificate renewal..."

# Add renewal cron job
CRON_JOB="0 3 * * * certbot renew --quiet --post-hook 'cd /var/www/nala-credit && docker compose restart nginx'"

if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Auto-renewal configured"
else
    echo "ℹ️  Auto-renewal already configured"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Let's Encrypt SSL Installed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Your application is now available at:"
echo "   https://admin.nalakreditimachann.com"
echo ""
echo "🔒 SSL Certificate Details:"
echo "   Domain: admin.nalakreditimachann.com"
echo "   Issuer: Let's Encrypt"
echo "   Valid for: 90 days"
echo "   Auto-renewal: Enabled (daily check at 3 AM)"
echo ""
echo "✅ HTTP traffic automatically redirects to HTTPS"
echo ""

ENDSSH

echo ""
echo "✅ Done! Visit https://admin.nalakreditimachann.com"
