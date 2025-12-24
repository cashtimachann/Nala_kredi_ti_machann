#!/bin/bash
# Auto-setup downloads page

echo "Setting up downloads directory..."

# Create downloads directory
mkdir -p /var/www/downloads
chown -R www-data:www-data /var/www/downloads
chmod -R 755 /var/www/downloads

# Copy download page HTML
if [ -f "/tmp/download-page.html" ]; then
    cp /tmp/download-page.html /var/www/downloads/
    chown www-data:www-data /var/www/downloads/download-page.html
    chmod 644 /var/www/downloads/download-page.html
    echo "HTML page copied successfully"
else
    echo "Warning: download-page.html not found in /tmp/"
fi

# Backup and update nginx config
if [ -f "/tmp/nginx.conf" ]; then
    if [ -f "/etc/nginx/nginx.conf" ]; then
        cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)
        echo "Nginx config backed up"
    fi
    
    cp /tmp/nginx.conf /etc/nginx/nginx.conf
    echo "Nginx config updated"
    
    # Test nginx config
    nginx -t
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        echo "Nginx reloaded successfully"
    else
        echo "Error: Nginx config test failed!"
        # Restore backup if available
        if [ -f "/etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)" ]; then
            cp /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx/nginx.conf
            echo "Restored previous config"
        fi
        exit 1
    fi
else
    echo "Warning: nginx.conf not found in /tmp/"
fi

echo "Setup complete!"