#!/bin/bash
# =============================================================================
# NALA KREDI - NGINX CONFIGURATION SCRIPT
# =============================================================================
# Script pou konfigire Nginx pou serve desktop downloads
# Configure Nginx to serve desktop downloads
# =============================================================================

set -e  # Exit on error

# Colors pou output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
}

# Banner
clear
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║     NALA KREDI - NGINX CONFIGURATION                      ║"
echo "║              Desktop Downloads Setup                      ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# ETAP 0: VERIFIKASYON
# =============================================================================

print_step "ETAP 0: Verifikasyon Sistèm"

# Tcheke si nginx enstale
if ! command -v nginx &> /dev/null; then
    print_error "Nginx pa enstale!"
    print_info "Enstale nginx: sudo apt update && sudo apt install nginx"
    exit 1
fi
print_success "Nginx enstale"

# Tcheke si root
if [ "$EUID" -ne 0 ]; then
    print_warning "Script sa dwe egzekite kòm root (sudo)"
    print_info "Relanse: sudo $0"
    exit 1
fi
print_success "Privileges root OK"

# =============================================================================
# ETAP 1: KREYE DOSYE DOWNLOADS
# =============================================================================

print_step "ETAP 1: Kreye Dosye Downloads"

DOWNLOADS_DIR="/var/www/downloads"
DESKTOP_DIR="${DOWNLOADS_DIR}/desktop"
BACKUPS_DIR="${DOWNLOADS_DIR}/backups"

print_info "Ap kreye dosye: $DOWNLOADS_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$BACKUPS_DIR"

# Kreye index.html pou landing page
cat > "${DOWNLOADS_DIR}/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nala Kredi - Downloads</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 50px;
            text-align: center;
        }
        
        .logo {
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 32px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 40px;
            font-size: 16px;
        }
        
        .download-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 18px 40px;
            font-size: 18px;
            border-radius: 50px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        .version-info {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 14px;
        }
        
        .version-badge {
            background: #f0f0f0;
            padding: 5px 15px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 10px;
            font-weight: 500;
        }
        
        .features {
            text-align: left;
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .features h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .features ul {
            list-style: none;
        }
        
        .features li {
            padding: 8px 0;
            color: #555;
        }
        
        .features li:before {
            content: "✓ ";
            color: #667eea;
            font-weight: bold;
            margin-right: 10px;
        }
        
        @media (max-width: 600px) {
            .container {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .download-btn {
                padding: 15px 30px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏦</div>
        <h1>Nala Kredi Desktop</h1>
        <p class="subtitle">Aplikasyon Desktop pou Siksyal yo</p>
        
        <div class="features">
            <h3>📦 Karakteristik:</h3>
            <ul>
                <li>Interface rapid ak responsif</li>
                <li>Synchronisation online</li>
                <li>Mizajou otomatik</li>
                <li>Sekirite avanse</li>
                <li>Support offline limit</li>
            </ul>
        </div>
        
        <a href="desktop/NalaDesktop-Setup.exe" class="download-btn">
            📥 Telechaje Desktop App
        </a>
        
        <div class="version-info">
            <p>Sistèm Operasyon: Windows 10/11 (64-bit)</p>
            <p>Requirements: .NET 8.0 Desktop Runtime</p>
            <div class="version-badge" id="version-display">Loading...</div>
        </div>
    </div>
    
    <script>
        // Fetch version info
        fetch('version.json')
            .then(response => response.json())
            .then(data => {
                document.getElementById('version-display').textContent = 
                    `Vèsyon ${data.latestVersion} - ${data.releaseDate}`;
            })
            .catch(() => {
                document.getElementById('version-display').textContent = 'Vèsyon 1.0.0';
            });
    </script>
</body>
</html>
EOF

print_success "index.html kreye"

# Kreye README
cat > "${DOWNLOADS_DIR}/README.txt" << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║           NALA KREDI - DESKTOP APPLICATION                ║
║                  Downloads Directory                      ║
╚═══════════════════════════════════════════════════════════╝

📁 STRUCTURE:
  /downloads/
    ├── index.html          - Landing page
    ├── version.json        - Version info (auto-update)
    ├── desktop/
    │   └── NalaDesktop-Setup.exe
    └── backups/
        └── (old versions)

🌐 ACCESS:
  https://api.nalacredit.com/downloads/

📝 NOTES:
  - version.json mizajou chak deployment
  - Backups kenbe nan /backups/
  - Downloads logs nan nginx access logs

Dat kreye: $(date)
EOF

print_success "Dosye yo kreye"

# Konfigire permissions
print_info "Ap konfigire permissions..."
chown -R www-data:www-data "$DOWNLOADS_DIR"
chmod -R 755 "$DOWNLOADS_DIR"
print_success "Permissions konfigire"

# =============================================================================
# ETAP 2: KONFIGIRE NGINX
# =============================================================================

print_step "ETAP 2: Konfigire Nginx"

# Backup config existant
if [ -f /etc/nginx/sites-available/nalacredit ]; then
    print_info "Backup config Nginx existant..."
    cp /etc/nginx/sites-available/nalacredit "/etc/nginx/sites-available/nalacredit.backup.$(date +%Y%m%d-%H%M%S)"
    print_success "Backup kreye"
fi

# Kreye oswa mizajou config
print_info "Ap konfigire virtual host..."

cat > /etc/nginx/sites-available/nalacredit-downloads << 'NGINXCONF'
# Nala Kredi - Downloads Configuration
# Auto-generated configuration for desktop app downloads

server {
    listen 443 ssl http2;
    server_name api.nalacredit.com;

    # SSL Configuration (asire w sa deja konfigire)
    ssl_certificate /etc/letsencrypt/live/api.nalacredit.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nalacredit.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logs
    access_log /var/log/nginx/nalacredit-downloads-access.log;
    error_log /var/log/nginx/nalacredit-downloads-error.log;

    # Backend API (si w gen deja)
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Downloads Directory - NOUVEAUTE
    location /downloads/ {
        alias /var/www/downloads/;
        
        # Enable directory listing (opsyonèl)
        autoindex on;
        autoindex_exact_size off;
        autoindex_format html;
        autoindex_localtime on;
        
        # Cache control
        expires 1d;
        add_header Cache-Control "public, must-revalidate";
        
        # Allow downloads
        add_header Content-Disposition 'inline';
        
        # CORS pou version.json
        location ~ /downloads/version\.json$ {
            add_header Access-Control-Allow-Origin * always;
            add_header Content-Type application/json;
            expires -1;
        }
        
        # Executable files
        location ~ \.exe$ {
            add_header Content-Type application/octet-stream;
            add_header Content-Disposition 'attachment';
        }
    }

    # Root location
    location / {
        return 301 /downloads/;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.nalacredit.com;
    return 301 https://$server_name$request_uri;
}
NGINXCONF

print_success "Config Nginx kreye"

# Enable site
print_info "Ap aktive config..."
ln -sf /etc/nginx/sites-available/nalacredit-downloads /etc/nginx/sites-enabled/
print_success "Config aktive"

# =============================================================================
# ETAP 3: TESTE CONFIG
# =============================================================================

print_step "ETAP 3: Teste Konfigirasyon"

print_info "Ap teste Nginx config..."
if nginx -t; then
    print_success "Nginx config valide"
else
    print_error "Nginx config pa valide! Tcheke erè yo."
    exit 1
fi

# =============================================================================
# ETAP 4: RELOAD NGINX
# =============================================================================

print_step "ETAP 4: Reload Nginx"

print_info "Ap reload Nginx..."
systemctl reload nginx

if [ $? -eq 0 ]; then
    print_success "Nginx reload avèk siksè"
else
    print_error "Reload Nginx echwe"
    exit 1
fi

# =============================================================================
# ETAP 5: VERIFYE STATUS
# =============================================================================

print_step "ETAP 5: Verifikasyon Final"

# Tcheke Nginx status
if systemctl is-active --quiet nginx; then
    print_success "Nginx ap kouri"
else
    print_warning "Nginx pa ap kouri!"
fi

# Tcheke permissions
if [ -d "$DOWNLOADS_DIR" ] && [ -r "$DOWNLOADS_DIR" ]; then
    print_success "Downloads directory aksesib"
else
    print_warning "Permissions pwoblèm ak downloads directory"
fi

# =============================================================================
# REZIME
# =============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              ✅ KONFIGIRASYON KONPLE! ✅                   ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

print_success "Nginx konfigire pou serve desktop downloads!"
echo ""

print_info "URL YO:"
echo "  🌐 Landing page: https://api.nalacredit.com/downloads/"
echo "  📦 Installer: https://api.nalacredit.com/downloads/desktop/NalaDesktop-Setup.exe"
echo "  📄 Version info: https://api.nalacredit.com/downloads/version.json"
echo ""

print_info "DOSYE YO:"
echo "  📁 Downloads: $DOWNLOADS_DIR"
echo "  💾 Backups: $BACKUPS_DIR"
echo "  📋 Nginx config: /etc/nginx/sites-available/nalacredit-downloads"
echo "  📝 Logs: /var/log/nginx/nalacredit-downloads-*.log"
echo ""

print_info "PWOCHEN ETAP:"
echo "  1. Upload installer: scp NalaDesktop-Setup.exe root@server:/var/www/downloads/desktop/"
echo "  2. Upload version.json: scp version.json root@server:/var/www/downloads/"
echo "  3. Teste download: curl -I https://api.nalacredit.com/downloads/"
echo ""

print_warning "PA BLIYE:"
echo "  - Asire w SSL certificate valide (certbot)"
echo "  - Teste telechajman sou yon browser"
echo "  - Monitore logs: tail -f /var/log/nginx/nalacredit-downloads-access.log"
echo ""

print_success "Tout bagay pare! 🎉"
echo ""
