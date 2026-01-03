# Setup Paj Downloads

## Pwoblèm
Paj downloads la pa disponib sou: https://admin.nalakreditimachann.com/downloads/

## Solisyon

### Chanjman ki fèt:
1. ✅ **nginx.conf** - Ajoute seksyon `/downloads/` pou admin.nalakreditimachann.com
2. ✅ **download-page.html** - Paj HTML ki deja egziste nan `frontend-desktop/`

### Pou Deplwaye:

#### Opsyon 1: SSH dirèkteman (si w gen aksè)
```bash
# 1. Konekte sou server la
ssh root@164.90.207.45

# 2. Kreye dosye downloads
mkdir -p /var/www/downloads
chown -R www-data:www-data /var/www/downloads
chmod -R 755 /var/www/downloads

# 3. Upload HTML file (soti sou local machine)
# Nan yon lòt terminal:
scp frontend-desktop/download-page.html root@164.90.207.45:/var/www/downloads/

# 4. Upload nginx config
scp nginx.conf root@164.90.207.45:/tmp/nginx.conf

# 5. Retounen sou SSH epi apliye config
ssh root@164.90.207.45
cp /tmp/nginx.conf /etc/nginx/nginx.conf
nginx -t
systemctl reload nginx
```

#### Opsyon 2: Via Docker (si app la roule nan Docker)
```bash
# 1. Rebuild nginx kontènè ak nouvo config
docker-compose down
docker-compose up -d --build

# 2. Copy HTML file nan kontènè
docker cp frontend-desktop/download-page.html nginx:/var/www/downloads/
```

#### Opsyon 3: Via DigitalOcean Console
1. Konekte sou DigitalOcean Droplet la via Console
2. Kreye dosye: `mkdir -p /var/www/downloads`
3. Upload files atravè panel la oswa git pull

### Verifye Deplwaman
Apre deplwaman, vizite:
- https://admin.nalakreditimachann.com/downloads/

### Fichye ki enpòtan:
- `nginx.conf` - Konfigirasyon nginx prensipal (update)
- `frontend-desktop/download-page.html` - Paj HTML pou downloads
- `deploy-downloads-page.ps1` - Script PowerShell pou deplwaye (nesesite SSH access)

### Nòt:
- Konfigirasyon nginx la sipòte:
  - Autoindex (listing files)
  - CORS headers pou version.json
  - Download headers pou .exe, .msi, .zip
  - Custom HTML page pou `/downloads/`
