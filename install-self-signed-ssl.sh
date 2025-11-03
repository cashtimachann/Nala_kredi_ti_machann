#!/bin/bash

# ============================================
# Install Self-Signed SSL Certificate
# ============================================
# For use BEFORE you have a domain name
# Browser will show warning but traffic is encrypted

set -e

SERVER_IP="${1:-142.93.78.111}"

echo "🔒 Installing Self-Signed SSL Certificate on $SERVER_IP"
echo ""

ssh root@$SERVER_IP << 'ENDSSH'

echo "📁 Creating SSL directory..."
mkdir -p /etc/nginx/ssl
cd /etc/nginx/ssl

echo "🔐 Generating self-signed certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx-selfsigned.key \
  -out /etc/nginx/ssl/nginx-selfsigned.crt \
  -subj "/C=HT/ST=Haiti/L=Port-au-Prince/O=Nala Credit/OU=IT/CN=142.93.78.111"

echo "🔐 Generating Diffie-Hellman parameters (this may take a few minutes)..."
openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048

echo "✅ SSL certificate generated"

echo ""
echo "📝 Updating Nginx configuration..."

# Backup original nginx.conf
cp /var/www/nala-credit/nginx.conf /var/www/nala-credit/nginx.conf.backup

# Update nginx.conf with SSL
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

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # API Backend Upstream
    upstream backend_api {
        server api:5000;
    }
    
    # Frontend Upstream
    upstream frontend {
        server frontend:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
        ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;
        ssl_dhparam /etc/nginx/ssl/dhparam.pem;

        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_session_timeout 10m;
        ssl_session_cache shared:SSL:10m;
        ssl_session_tickets off;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Health check endpoint
        location /health {
            return 200 "Healthy";
            add_header Content-Type text/plain;
        }

        # API Routes - Redirect to backend
        location /api/ {
            proxy_pass http://backend_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS handling for API
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
            
            if ($request_method = 'OPTIONS') {
                return 204;
            }
        }

        # All frontend traffic
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_cache_bypass $http_upgrade;
        }

        # Error pages
        error_page 404 /404.html;
        error_page 500 502 503 504 /50x.html;
    }
}
EOF

echo "✅ Nginx configuration updated"

echo ""
echo "🔄 Restarting Nginx..."
cd /var/www/nala-credit
docker compose restart nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ SSL Certificate Installed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Your application is now available at:"
echo "   https://142.93.78.111"
echo ""
echo "⚠️  NOTE: This is a self-signed certificate."
echo "   Your browser will show a security warning."
echo "   This is normal and safe to bypass for testing."
echo ""
echo "🔒 To access:"
echo "   1. Visit https://142.93.78.111"
echo "   2. Click 'Advanced' or 'Show Details'"
echo "   3. Click 'Proceed to 142.93.78.111' or 'Accept Risk'"
echo ""
echo "💡 For production, get a real certificate with:"
echo "   ./install-letsencrypt-ssl.sh yourdomain.com"
echo ""

ENDSSH

echo "✅ Done! Visit https://$SERVER_IP"
