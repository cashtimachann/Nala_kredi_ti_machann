# SOLUTION PWOBLEM DOWNLOADS REDIRECT
# =====================================

## PWOBLEM
Lè w klike sou lyen download nan paj https://admin.nalakreditimachann.com/downloads/
Li redirije w sou https://admin.nalakreditimachann.com/login

## CAUSE
- React Router ap kapte tout rout yo ak redirije sou /login
- Lyen downloads yo ap pase nan React avan nginx ka sèvi yo

## SOLUTION APLIKYE
Nou te fè 3 chanjman:

### 1. NGINX.CONF - Deplase lokasyon /downloads/ anlè
Ann mete lokasyon `/downloads/` AVAN lokasyon `/` pou nginx sèvi li dirèkteman

```nginx
# Desktop App Downloads - MUST BE BEFORE root location
location /downloads/ {
    alias /var/www/downloads/;
    autoindex on;
    autoindex_exact_size off;
    autoindex_localtime on;
    
    # Serve HTML page for /downloads/
    location = /downloads/ {
        alias /var/www/downloads/;
        index download-page.html;
        try_files /download-page.html =404;
    }
    
    # Headers for executables
    location ~* \.(exe|msi|zip)$ {
        add_header Content-Disposition "attachment";
        add_header X-Content-Type-Options "nosniff";
    }
    
    # Cache for static files
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}

# Root location - Frontend React App
location / {
    proxy_pass http://frontend_app;
    ...
}
```

### 2. DOWNLOAD-PAGE.HTML - Chanje lyen yo
Chanje lyen yo nan HTML pou yo pa absolute:

**AVANT:**
```html
<a href="https://admin.nalakreditimachann.com/downloads/desktop/NalaCreditDesktop-v1.0.5.zip">
```

**APRE:**
```html
<a href="/downloads/desktop/NalaCreditDesktop-v1.0.5.zip" download>
```

### 3. APP.TSX - Retire useEffect ki pa itil
Retire useEffect ki tcheke /downloads men pa fè anyen

## KIJAN POU APLIYE MANYÈLMAN

### Opsyon 1: Via SSH (SI W GEN ACCESS)
```bash
# 1. Upload nouvo nginx.conf
scp nginx.conf root@164.90.207.45:/tmp/

# 2. Upload nouvo download-page.html
scp frontend-desktop/download-page.html root@164.90.207.45:/tmp/

# 3. Konekte sou sèvè
ssh root@164.90.207.45

# 4. Apliye chanjman yo
cd /var/www/nala-credit

# Backup config kounye a
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Apliye nouvo nginx config
cp /tmp/nginx.conf /etc/nginx/nginx.conf

# Test config
nginx -t

# Reload nginx
systemctl reload nginx

# Kopye nouvo download page
cp /tmp/download-page.html /var/www/downloads/
chown www-data:www-data /var/www/downloads/download-page.html
chmod 644 /var/www/downloads/download-page.html

# 5. Rebuild frontend-web (pou App.tsx)
cd /var/www/nala-credit
docker compose build frontend
docker compose up -d frontend
```

### Opsyon 2: Via DigitalOcean Console
1. Konekte sou sèvè via DigitalOcean Console
2. Egzekite kòmand yo anwo a

### Opsyon 3: Via FTP/SFTP
1. Itilize FileZilla oswa WinSCP
2. Upload fichye yo manyèlman

## TESTING
Apre w apliye chanjman yo, ale sou:
https://admin.nalakreditimachann.com/downloads/

Klike sou yon lyen download - li ta dwe telechaje dirèkteman san redireksyon sou /login

## FICHYE KI MODIFYE
1. nginx.conf - Lokasyon /downloads/ deplase
2. frontend-desktop/download-page.html - Lyen chanje
3. frontend-web/src/App.tsx - useEffect retire

Si ou bezwen edremake koneksyon SSH, tcheke:
- Firewall rules sou DigitalOcean
- Security Group settings
- SSH daemon status sou sèvè
