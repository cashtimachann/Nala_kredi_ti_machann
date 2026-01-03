#!/bin/bash
# Quick setup downloads page - pas besoin de git

echo "========================================="
echo "  Setup Downloads Page"
echo "========================================="
echo ""

# Etap 1: Kreye dosye downloads
echo "[1/4] Creating downloads directory..."
mkdir -p /var/www/downloads
chown -R www-data:www-data /var/www/downloads
chmod -R 755 /var/www/downloads
echo "  ✓ Directory created"

# Etap 2: Kreye download page HTML
echo ""
echo "[2/4] Creating download-page.html..."

cat > /var/www/downloads/download-page.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="ht">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telechaje Nala Credit Desktop App</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            padding: 40px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .logo {
            font-size: 48px;
            margin-bottom: 10px;
        }
        
        h1 {
            color: #333;
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        
        .download-cards {
            display: grid;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 30px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .card:hover {
            border-color: #667eea;
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
        }
        
        .download-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            font-size: 18px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .download-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">💰</div>
            <h1>Nala Credit Ti Machann</h1>
            <p class="subtitle">Telechaje Aplikasyon Desktop</p>
        </div>
        
        <div class="download-cards">
            <div class="card">
                <h2>🪟 Windows</h2>
                <p>Windows 10/11 (64-bit)</p>
                <br>
                <a href="/downloads/nala-credit-setup.exe" class="download-button">Telechaje pou Windows</a>
            </div>
        </div>
    </div>
</body>
</html>
HTMLEOF

chown www-data:www-data /var/www/downloads/download-page.html
chmod 644 /var/www/downloads/download-page.html
echo "  ✓ HTML page created"

# Etap 3: Backup epi update nginx config
echo ""
echo "[3/4] Updating nginx configuration..."

# Backup config actuel
if [ -f /etc/nginx/nginx.conf ]; then
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)
    echo "  ✓ Backup created"
fi

# Tcheke si downloads location deja la
if grep -q "location /downloads/" /etc/nginx/nginx.conf; then
    echo "  ℹ Downloads location already configured"
else
    echo "  Adding downloads location to nginx config..."
    # M ap ajoute seksyon downloads apre "location /uploads/"
    
    # Note: Ou ka bezwen edit manyèlman si structure pa egzakteman sa
    echo "  ⚠ Please manually add this to nginx.conf after '/uploads/' section:"
    echo ""
    cat << 'NGINXEOF'
        # Desktop App Downloads
        location /downloads/ {
            alias /var/www/downloads/;
            autoindex on;
            autoindex_exact_size off;
            autoindex_localtime on;
            
            location = /downloads/ {
                alias /var/www/downloads/;
                index download-page.html;
                try_files /download-page.html =404;
            }
            
            location ~* \.json$ {
                add_header Access-Control-Allow-Origin * always;
                add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
                add_header Content-Type "application/json; charset=utf-8";
            }
            
            location ~* \.(exe|msi|zip)$ {
                add_header Content-Disposition "attachment";
                add_header X-Content-Type-Options "nosniff";
            }
            
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
NGINXEOF
fi

# Etap 4: Test and reload nginx
echo ""
echo "[4/4] Testing and reloading nginx..."

# Premye test si config bon
nginx -t 2>&1 | head -5

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    systemctl reload nginx
    echo "  ✓ Nginx reloaded successfully"
    echo ""
    echo "========================================="
    echo "  ✓ Setup Complete!"
    echo "========================================="
    echo ""
    echo "Visit: https://admin.nalakreditimachann.com/downloads/"
    echo ""
else
    echo "  ⚠ Nginx config has errors. Please fix manually."
    echo "  Backup saved, original config restored"
fi
