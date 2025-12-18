# 🌐 GID DEPLOYMENT DESKTOP - LAPTOP + DIGITALOCEAN

## 🎯 Sitiyasyon Ou

- ✅ **Backend**: DigitalOcean Droplet
- 💻 **Siksyal**: Laptop (mobil)
- 🌍 **Koneksyon**: Internet (pa LAN)
- 🔒 **Sekirite**: HTTPS/SSL obligatwa

## ⚠️ CLICKONCE PA APWOPRIYE POU OU!

ClickOnce pa bon pou w paske:
- ❌ Li desine pou LAN (Local Area Network)
- ❌ Li pa travay byen atravè Internet
- ❌ Firewall ak proxy bloke li
- ❌ Pa sekirize pou cloud deployment

## ✅ SOLISYON KI BON POU OU

### Opsyon 1: 🏆 **INSTALASYON EXECUTABLE + AUTO-UPDATE WEB** (REKÒMANDE)

#### Poukisa sa se pi bon?
- ✅ Fonksyone atravè Internet
- ✅ Laptop ka konekte nenpòt kote
- ✅ Mizajou otomatik ak API
- ✅ Sekirize ak HTTPS
- ✅ Pa bezwen VPN
- ✅ Fasil distribute

#### Kijan li mache?

```
┌─────────────┐         Internet          ┌──────────────────┐
│   Laptop    │ ←─────── HTTPS ─────────→ │  DigitalOcean    │
│  Siksyal    │                            │   Droplet        │
│             │  1. Download .exe          │                  │
│ Desktop App │  2. Check version          │  Backend API     │
│             │  3. Auto-update            │  + Downloads     │
└─────────────┘                            └──────────────────┘
```

## 📋 ENPLEMANTASYON: INSTALASYON EXECUTABLE + AUTO-UPDATE

### ETAP 1: Konfigire DigitalOcean pou Host Aplikasyon

#### 1.1 Kreye Dosye Downloads sou Serveur

```bash
# Konekte sou DigitalOcean droplet
ssh root@votre-ip-digitalocean

# Kreye dosye pou aplikasyon
mkdir -p /var/www/downloads/desktop
cd /var/www/downloads/desktop

# Konfigire permissions
chown -R www-data:www-data /var/www/downloads
chmod -R 755 /var/www/downloads
```

#### 1.2 Konfigire Nginx pou Serve Downloads

```bash
# Edit nginx config
nano /etc/nginx/sites-available/nalacredit
```

Ajoute sa:
```nginx
server {
    listen 443 ssl http2;
    server_name api.nalacredit.com;

    ssl_certificate /etc/letsencrypt/live/api.nalacredit.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nalacredit.com/privkey.pem;

    # Existing API location
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        # ... other settings ...
    }

    # NEW: Downloads endpoint
    location /downloads/ {
        alias /var/www/downloads/;
        autoindex on;
        autoindex_exact_size off;
        autoindex_format html;
        
        # Enable downloads
        add_header Content-Disposition 'attachment';
        
        # Cache control
        expires 1d;
        add_header Cache-Control "public, must-revalidate";
    }

    # Version check endpoint (pou auto-update)
    location /downloads/version.json {
        alias /var/www/downloads/version.json;
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }
}
```

```bash
# Teste config
nginx -t

# Reload nginx
systemctl reload nginx
```

### ETAP 2: Kreye System Auto-Update

#### 2.1 Kreye version.json sou Serveur

```bash
# Sou DigitalOcean
cat > /var/www/downloads/version.json << 'EOF'
{
  "latestVersion": "1.0.0",
  "releaseDate": "2025-12-17",
  "downloadUrl": "https://api.nalacredit.com/downloads/desktop/NalaDesktop-Setup.exe",
  "fileSize": 45678900,
  "minimumVersion": "1.0.0",
  "releaseNotes": "Premye vèsyon Desktop App",
  "mandatory": false
}
EOF

chmod 644 /var/www/downloads/version.json
```

#### 2.2 Modifye Desktop App pou Check Updates

Kreye `Services/UpdateService.cs` nan desktop project:

```csharp
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;

namespace NalaCreditDesktop.Services
{
    public class UpdateService
    {
        private readonly HttpClient _httpClient;
        private readonly string _versionCheckUrl;
        private readonly string _currentVersion;

        public UpdateService(string baseUrl, string currentVersion)
        {
            _httpClient = new HttpClient();
            _versionCheckUrl = $"{baseUrl}/downloads/version.json";
            _currentVersion = currentVersion;
        }

        public async Task<UpdateInfo?> CheckForUpdatesAsync()
        {
            try
            {
                var response = await _httpClient.GetStringAsync(_versionCheckUrl);
                var updateInfo = JsonSerializer.Deserialize<UpdateInfo>(response);

                if (updateInfo != null && IsNewerVersion(updateInfo.LatestVersion))
                {
                    return updateInfo;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error checking updates: {ex.Message}");
            }

            return null;
        }

        private bool IsNewerVersion(string latestVersion)
        {
            var current = new Version(_currentVersion);
            var latest = new Version(latestVersion);
            return latest > current;
        }

        public async Task<bool> DownloadAndInstallUpdateAsync(string downloadUrl)
        {
            try
            {
                var tempPath = Path.Combine(Path.GetTempPath(), "NalaDesktop-Update.exe");
                
                // Download
                var fileBytes = await _httpClient.GetByteArrayAsync(downloadUrl);
                await File.WriteAllBytesAsync(tempPath, fileBytes);

                // Launch installer
                Process.Start(new ProcessStartInfo
                {
                    FileName = tempPath,
                    Arguments = "/silent",
                    UseShellExecute = true
                });

                // Exit current app
                Application.Current.Shutdown();
                return true;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error installing update: {ex.Message}");
                return false;
            }
        }
    }

    public class UpdateInfo
    {
        public string LatestVersion { get; set; } = string.Empty;
        public string ReleaseDate { get; set; } = string.Empty;
        public string DownloadUrl { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string MinimumVersion { get; set; } = string.Empty;
        public string ReleaseNotes { get; set; } = string.Empty;
        public bool Mandatory { get; set; }
    }
}
```

#### 2.3 Ajoute Check Updates nan App.xaml.cs

```csharp
using NalaCreditDesktop.Services;
using System.Windows;

namespace NalaCreditDesktop
{
    public partial class App : Application
    {
        private const string CurrentVersion = "1.0.0";
        private const string ApiBaseUrl = "https://api.nalacredit.com";

        protected override async void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Check for updates
            await CheckForUpdatesAsync();
        }

        private async Task CheckForUpdatesAsync()
        {
            var updateService = new UpdateService(ApiBaseUrl, CurrentVersion);
            var updateInfo = await updateService.CheckForUpdatesAsync();

            if (updateInfo != null)
            {
                var result = MessageBox.Show(
                    $"Nouvo vèsyon disponib: {updateInfo.LatestVersion}\n\n" +
                    $"Release Notes:\n{updateInfo.ReleaseNotes}\n\n" +
                    $"Èske w vle telechaje epi enstale mizajou?",
                    "Mizajou Disponib",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Information
                );

                if (result == MessageBoxResult.Yes)
                {
                    await updateService.DownloadAndInstallUpdateAsync(updateInfo.DownloadUrl);
                }
                else if (updateInfo.Mandatory)
                {
                    MessageBox.Show(
                        "Mizajou sa obligatwa. Aplikasyon pral fèmen.",
                        "Mizajou Obligatwa",
                        MessageBoxButton.OK,
                        MessageBoxImage.Warning
                    );
                    Shutdown();
                }
            }
        }
    }
}
```

### ETAP 3: Kreye Installer Executable

#### 3.1 Build Desktop App

```powershell
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann\frontend-desktop\NalaCreditDesktop"

# Build Release version
dotnet publish `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -o ".\publish"
```

#### 3.2 Opsyon A: Itilize Inno Setup (Rekòmande)

**Download Inno Setup**: https://jrsoftware.org/isdl.php

Kreye `setup-script.iss`:

```inno
[Setup]
AppName=Nala Kredi Desktop
AppVersion=1.0.0
DefaultDirName={autopf}\Nala Kredi
DefaultGroupName=Nala Kredi
OutputDir=.
OutputBaseFilename=NalaDesktop-Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "publish\NalaCreditDesktop.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\Nala Kredi Desktop"; Filename: "{app}\NalaCreditDesktop.exe"
Name: "{autodesktop}\Nala Kredi"; Filename: "{app}\NalaCreditDesktop.exe"

[Run]
Filename: "{app}\NalaCreditDesktop.exe"; Description: "Lanse Nala Kredi"; Flags: nowait postinstall skipifsilent
```

Konpile:
```powershell
# Si Inno Setup enstale
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" setup-script.iss
```

#### 3.2 Opsyon B: Simple ZIP (Fasil men mwens pwofesyonèl)

```powershell
# Kreye ZIP pou distribution
Compress-Archive `
    -Path ".\publish\*" `
    -DestinationPath "NalaDesktop-v1.0.0.zip" `
    -Force
```

### ETAP 4: Upload sou DigitalOcean

```powershell
# Upload installer sou serveur
scp "NalaDesktop-Setup.exe" root@votre-ip:/var/www/downloads/desktop/

# Upload version info
scp "version.json" root@votre-ip:/var/www/downloads/
```

Oswa itilize script:

```powershell
# upload-to-server.ps1
param(
    [string]$Version = "1.0.0",
    [string]$ServerIP = "votre-ip",
    [string]$ReleaseNotes = "Nouvo vèsyon"
)

Write-Host "📦 Ap upload vèsyon $Version..." -ForegroundColor Cyan

# Upload executable
Write-Host "Uploading installer..."
scp "NalaDesktop-Setup.exe" "root@${ServerIP}:/var/www/downloads/desktop/"

# Update version.json
$versionInfo = @{
    latestVersion = $Version
    releaseDate = (Get-Date -Format "yyyy-MM-dd")
    downloadUrl = "https://api.nalacredit.com/downloads/desktop/NalaDesktop-Setup.exe"
    fileSize = (Get-Item "NalaDesktop-Setup.exe").Length
    minimumVersion = "1.0.0"
    releaseNotes = $ReleaseNotes
    mandatory = $false
} | ConvertTo-Json

$versionInfo | ssh "root@${ServerIP}" "cat > /var/www/downloads/version.json"

Write-Host "✅ Upload konplè!" -ForegroundColor Green
```

### ETAP 5: Distribiye nan Siksyal yo

#### Metòd 1: Direct Download Link

Kreye HTML page senp:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Download Nala Desktop</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; }
        .download-btn { 
            background: #2563eb; 
            color: white; 
            padding: 20px 40px; 
            font-size: 20px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>🏦 Nala Kredi Desktop</h1>
    <p>Telechaje epi enstale aplikasyon desktop la</p>
    
    <a href="https://api.nalacredit.com/downloads/desktop/NalaDesktop-Setup.exe" 
       class="download-btn">
        📥 Download Aplikasyon
    </a>
    
    <p>Vèsyon Aktyèl: 1.0.0</p>
</body>
</html>
```

Bay lyen sa bay anplwaye siksyal yo:
```
https://api.nalacredit.com/downloads/
```

#### Metòd 2: Email Lyen

Voye email bay chak siksyal:

```
Objet: Enstale Desktop App Nala Kredi

Bonjou,

Pou enstale aplikasyon desktop Nala Kredi:

1. Klike sou lyen sa: https://api.nalacredit.com/downloads/desktop/NalaDesktop-Setup.exe
2. Kouri fichye NalaDesktop-Setup.exe
3. Swiv enstriksyon enstalasyon yo
4. Lanse aplikasyon epi konekte

Enfòmasyon Koneksyon:
- URL Backend: https://api.nalacredit.com/api
- Itilize email ak password travay ou

Si w gen pwoblèm, kontakte ekip IT.
```

#### Metòd 3: USB Drive (Si Internet lant nan siksyal)

```powershell
# Prepare USB drive
$usbPath = "E:\"  # Adjust drive letter

# Kopi installer
Copy-Item "NalaDesktop-Setup.exe" "$usbPath\"

# Kreye README
@"
NALA KREDI DESKTOP - ENSTALASYON
=================================

1. Double-click sou NalaDesktop-Setup.exe
2. Swiv enstriksyon yo
3. Apre enstalasyon, lanse aplikasyon
4. Konekte avèk email ak password w

Support: support@nalacredit.com
"@ | Out-File "$usbPath\README.txt"

Write-Host "✅ USB drive ready!" -ForegroundColor Green
```

### ETAP 6: Konfigire Desktop App pou DigitalOcean

Kreye `appsettings.json` nan desktop project:

```json
{
  "ApiSettings": {
    "BaseUrl": "https://api.nalacredit.com/api",
    "Timeout": 30,
    "RetryAttempts": 3
  },
  "UpdateSettings": {
    "CheckOnStartup": true,
    "CheckInterval": 86400,
    "UpdateUrl": "https://api.nalacredit.com/downloads/version.json"
  }
}
```

## 📊 KONPAREZON SOLISYON YO

| Solisyon | Bon Pou | Move Pou | Sekirite | Fasil |
|----------|---------|----------|----------|--------|
| **Executable + Auto-Update** | ✅✅✅ Internet | ❌ LAN | ✅✅✅ | ✅✅✅ |
| ClickOnce | ✅✅✅ LAN | ❌ Internet | ✅✅ | ✅✅✅ |
| Manual Install | ✅ Tout | ❌ Updates | ✅ | ⚠️ |
| Web-Only (PWA) | ✅✅ Internet | ❌ Offline | ✅✅ | ✅✅✅ |

## 🔒 SEKIRITE ENPÒTAN

### 1. HTTPS Obligatwa
```bash
# Asire w SSL active sou DigitalOcean
certbot certificates
```

### 2. Validate Downloads
Ajoute checksum verification:

```csharp
public async Task<bool> ValidateDownloadAsync(string filePath, string expectedHash)
{
    using var sha256 = SHA256.Create();
    using var stream = File.OpenRead(filePath);
    var hash = await sha256.ComputeHashAsync(stream);
    var hashString = BitConverter.ToString(hash).Replace("-", "").ToLower();
    return hashString == expectedHash;
}
```

Update `version.json`:
```json
{
  "latestVersion": "1.0.0",
  "downloadUrl": "...",
  "sha256Hash": "abc123..."
}
```

## 🚀 SCRIPT KONPLÈ POU DEPLOYMENT

Kreye `deploy-to-digitalocean.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [string]$ReleaseNotes = "Nouvo vèsyon"
)

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DEPLOYMENT DESKTOP → DIGITALOCEAN     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

# 1. Build
Write-Host "`n[1/5] 🔨 Building application..." -ForegroundColor Yellow
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ".\publish"

# 2. Create Installer
Write-Host "`n[2/5] 📦 Creating installer..." -ForegroundColor Yellow
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" setup-script.iss

# 3. Calculate Hash
Write-Host "`n[3/5] 🔐 Calculating hash..." -ForegroundColor Yellow
$hash = (Get-FileHash "NalaDesktop-Setup.exe" -Algorithm SHA256).Hash.ToLower()

# 4. Upload to Server
Write-Host "`n[4/5] ⬆️  Uploading to DigitalOcean..." -ForegroundColor Yellow
scp "NalaDesktop-Setup.exe" "root@${ServerIP}:/var/www/downloads/desktop/"

# 5. Update version.json
Write-Host "`n[5/5] 📝 Updating version info..." -ForegroundColor Yellow
$versionInfo = @{
    latestVersion = $Version
    releaseDate = (Get-Date -Format "yyyy-MM-dd")
    downloadUrl = "https://api.nalacredit.com/downloads/desktop/NalaDesktop-Setup.exe"
    fileSize = (Get-Item "NalaDesktop-Setup.exe").Length
    sha256Hash = $hash
    minimumVersion = "1.0.0"
    releaseNotes = $ReleaseNotes
    mandatory = $false
} | ConvertTo-Json

$versionInfo | ssh "root@${ServerIP}" "cat > /var/www/downloads/version.json"

Write-Host "`n✅ DEPLOYMENT KONPLÈ!" -ForegroundColor Green
Write-Host "Version $Version disponib sou: https://api.nalacredit.com/downloads/" -ForegroundColor White
```

## 📱 BONUS: PWA (Progressive Web App) Opsyon

Si laptop yo toujou konekte, ou ka konsidere PWA:

Avantaj:
- ✅ Pa bezwen enstale
- ✅ Auto-update otomatik
- ✅ Travay sou tout sistèm
- ✅ Access offline (limited)

Men sa pa gen tout pouvwa yon desktop app natif.

## 📞 SIPÒ

### Pwoblèm Komen

**"Can't download installer"**
```
Solisyon: Tcheke firewall/antivirus. Bay link HTTPS.
```

**"Update check fails"**
```
Solisyon: Verifye koneksyon Internet. Ping api.nalacredit.com
```

**"Installer won't run"**
```
Solisyon: Right-click → Run as Administrator
```

---

**Ki solisyon w prefere? Mwen ka ede w enplemante li!**
