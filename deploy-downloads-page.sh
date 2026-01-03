#!/bin/bash
# Script pou deplwaye paj telechajman Desktop App

echo "🚀 Deplwaye paj downloads..."

# Kreye dosye downloads si li pa egziste
if [ ! -d "/var/www/downloads" ]; then
    echo "📁 Kreye dosye /var/www/downloads..."
    sudo mkdir -p /var/www/downloads
    sudo chown -R www-data:www-data /var/www/downloads
    sudo chmod -R 755 /var/www/downloads
fi

# Kopye paj HTML la
echo "📄 Kopye download-page.html..."
sudo cp frontend-desktop/download-page.html /var/www/downloads/

# Asire premisyon yo bon
sudo chown www-data:www-data /var/www/downloads/download-page.html
sudo chmod 644 /var/www/downloads/download-page.html

# Recharje nginx
echo "🔄 Recharje nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deplwaman konplete!"
echo ""
echo "Paj downloads disponib sou:"
echo "  https://admin.nalakreditimachann.com/downloads/"
