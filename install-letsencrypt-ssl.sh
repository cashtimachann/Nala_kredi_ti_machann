#!/bin/bash

# ============================================
# Install Let's Encrypt SSL Certificate
# ============================================
# REQUIRES: A domain name pointing to your server
# This will NOT work with just an IP address

set -e

DOMAIN="${1}"
EMAIL="${2}"

if [[ -z "$DOMAIN" ]]; then
    echo "❌ Error: Domain name required"
    echo ""
    echo "Usage: $0 yourdomain.com your@email.com"
    echo ""
    echo "Example: $0 nalacredit.com admin@nalacredit.com"
    exit 1
fi

if [[ -z "$EMAIL" ]]; then
    echo "❌ Error: Email required for Let's Encrypt"
    echo ""
    echo "Usage: $0 yourdomain.com your@email.com"
    exit 1
fi

echo "🔒 Installing Let's Encrypt SSL for $DOMAIN"
echo ""

ssh root@142.93.78.111 << ENDSSH

echo "📦 Installing Certbot..."
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

echo ""
echo "🔍 Verifying domain points to this server..."
SERVER_IP=\$(curl -s ifconfig.me)
DOMAIN_IP=\$(dig +short $DOMAIN | tail -n1)

if [[ "\$SERVER_IP" != "\$DOMAIN_IP" ]]; then
    echo "⚠️  WARNING: Domain $DOMAIN resolves to \$DOMAIN_IP"
    echo "   But this server IP is: \$SERVER_IP"
    echo ""
    echo "❌ Domain must point to this server before continuing!"
    echo ""
    echo "Please update your DNS settings:"
    echo "   Type: A Record"
    echo "   Name: @ (or your subdomain)"
    echo "   Value: \$SERVER_IP"
    echo ""
    exit 1
fi

echo "✅ Domain verification successful"
echo ""

echo "🔐 Obtaining SSL certificate from Let's Encrypt..."

# Stop nginx temporarily
cd /var/www/nala-credit
docker compose stop nginx

# Get certificate using standalone mode
certbot certonly --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --preferred-challenges http

# Update nginx configuration
echo "📝 Updating Nginx configuration..."

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

    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    upstream backend_api {
        server api:5000;
    }
    
    upstream frontend {
        server frontend:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;
        
        # Allow Let's Encrypt challenges
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name $DOMAIN www.$DOMAIN;

        # Let's Encrypt SSL Certificates
        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

        # SSL Security
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

        location /health {
            return 200 "Healthy";
            add_header Content-Type text/plain;
        }

        location /api/ {
            proxy_pass http://backend_api;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
            
            if (\$request_method = 'OPTIONS') {
                return 204;
            }
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_cache_bypass \$http_upgrade;
        }

        error_page 404 /404.html;
        error_page 500 502 503 504 /50x.html;
    }
}
EOF

# Update docker-compose.yml to mount SSL certificates
sed -i 's|# SSL certificates mount|      - /etc/letsencrypt:/etc/letsencrypt:ro|g' /var/www/nala-credit/docker-compose.yml || true

# Start nginx
docker compose start nginx

echo ""
echo "⏰ Setting up automatic renewal..."
# Add renewal cron job
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && cd /var/www/nala-credit && docker compose restart nginx") | crontab -

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Let's Encrypt SSL Installed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Your application is now available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "🔒 SSL Certificate Details:"
echo "   Issuer: Let's Encrypt"
echo "   Valid for: 90 days"
echo "   Auto-renewal: Enabled (checks twice daily)"
echo ""
echo "✅ Your site now has a valid SSL certificate!"
echo ""

ENDSSH

echo "✅ Done! Visit https://$DOMAIN"
