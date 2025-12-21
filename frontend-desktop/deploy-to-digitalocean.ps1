# =============================================================================
# NALA KREDI - DEPLOYMENT SCRIPT POU DIGITALOCEAN
# =============================================================================
# Script konplè pou build, package epi upload desktop app sou serveur
# Complete script to build, package and upload desktop app to server
# =============================================================================

param(
    [Parameter(Mandatory=$true, HelpMessage="Nimewo vèsyon (ex: 1.0.1)")]
    [string]$Version,
    
    [Parameter(Mandatory=$true, HelpMessage="IP oswa hostname serveur DigitalOcean")]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUser = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$ReleaseNotes = "Nouvo vèsyon ak koreksyon",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipUpload,
    
    [Parameter(Mandatory=$false)]
    [switch]$Mandatory
)

# =============================================================================
# KONFIGIRASYON
# =============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$ProjectPath = "$PSScriptRoot\NalaCreditDesktop"
$PublishPath = "$PSScriptRoot\publish"
$SetupScript = "$PSScriptRoot\setup-script.iss"
$OutputInstaller = "$PSScriptRoot\NalaDesktop-Setup.exe"
$VersionJsonLocal = "$PSScriptRoot\version.json"

$RemoteDownloadsPath = "/var/www/downloads/desktop"
$RemoteVersionJson = "/var/www/downloads/version.json"

# =============================================================================
# FONKSYON UTILITE
# =============================================================================

function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Prefix = ""
    )
    
    if ($Prefix) {
        Write-Host "$Prefix " -NoNewline -ForegroundColor $Color
    }
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-ColorMessage "═══════════════════════════════════════════════════════" "Cyan"
    Write-ColorMessage " $Message" "Cyan"
    Write-ColorMessage "═══════════════════════════════════════════════════════" "Cyan"
}

function Write-Success {
    param([string]$Message)
    Write-ColorMessage $Message "Green" "✅"
}

function Write-Info {
    param([string]$Message)
    Write-ColorMessage $Message "Cyan" "ℹ️ "
}

function Write-Warning {
    param([string]$Message)
    Write-ColorMessage $Message "Yellow" "⚠️ "
}

function Write-Error {
    param([string]$Message)
    Write-ColorMessage $Message "Red" "❌"
}

# =============================================================================
# BANNER
# =============================================================================

Clear-Host
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "║     NALA KREDI - DESKTOP DEPLOYMENT v$Version            ║" -ForegroundColor Cyan
Write-Host "║              → DigitalOcean Cloud                         ║" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# ETAP 0: VERIFIKASYON
# =============================================================================

Write-Step "ETAP 0: Verifikasyon Anviwònman"

# Tcheke si projet egziste
if (-not (Test-Path $ProjectPath)) {
    Write-Error "Projet pa jwenn: $ProjectPath"
    exit 1
}
Write-Success "Projet jwenn: $ProjectPath"

# Tcheke si .NET SDK enstale
try {
    $dotnetVersion = dotnet --version
    Write-Success ".NET SDK enstale: v$dotnetVersion"
} catch {
    Write-Error ".NET SDK pa enstale. Telechaje sou: https://dotnet.microsoft.com/download"
    exit 1
}

# Tcheke si Inno Setup enstale
$InnoSetupPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $InnoSetupPath)) {
    Write-Warning "Inno Setup pa jwenn. Telechaje sou: https://jrsoftware.org/isdl.php"
    Write-Info "Ap kontinye san installer..."
    $InnoSetupPath = $null
} else {
    Write-Success "Inno Setup jwenn"
}

# Tcheke koneksyon SSH ak serveur
Write-Info "Ap teste koneksyon SSH ak $ServerIP..."
$sshTest = ssh -o ConnectTimeout=5 -o BatchMode=yes "${ServerUser}@${ServerIP}" "echo 'OK'" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Koneksyon SSH OK"
} else {
    Write-Warning "Pa ka konekte ak serveur via SSH"
    Write-Info "Asire w ke:"
    Write-Info "  1. Serveur ap kouri"
    Write-Info "  2. SSH key konfigire kòrèkteman"
    Write-Info "  3. Firewall ouvè pou SSH (port 22)"
    
    $continue = Read-Host "`nKontinye menm si pa gen koneksyon? (Y/N)"
    if ($continue -ne "Y") {
        exit 1
    }
}

# =============================================================================
# ETAP 1: BACKUP
# =============================================================================

if (-not $SkipBuild) {
    Write-Step "ETAP 1: Backup Vèsyon Anvan"

    # Backup lokal
    if (Test-Path $PublishPath) {
        $backupPath = "$PSScriptRoot\backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Write-Info "Ap kreye backup lokal: $backupPath"
        Copy-Item -Path $PublishPath -Destination $backupPath -Recurse -Force
        Write-Success "Backup lokal kreye"
    }

    # Backup sou serveur
    if (-not $SkipUpload) {
        Write-Info "Ap kreye backup sou serveur..."
        $remoteBackup = ssh "${ServerUser}@${ServerIP}" @"
if [ -f $RemoteDownloadsPath/NalaDesktop-Setup.exe ]; then
    mkdir -p /var/www/downloads/backups
    cp $RemoteDownloadsPath/NalaDesktop-Setup.exe /var/www/downloads/backups/NalaDesktop-Setup-backup-\$(date +%Y%m%d-%H%M%S).exe
    echo 'Backup OK'
fi
"@
        if ($remoteBackup -like "*Backup OK*") {
            Write-Success "Backup serveur kreye"
        }
    }
}

# =============================================================================
# ETAP 2: CLEAN
# =============================================================================

if (-not $SkipBuild) {
    Write-Step "ETAP 2: Netwayaj Dosye Build"

    Write-Info "Ap efase dosye bin ak obj..."
    if (Test-Path "$ProjectPath\bin") { Remove-Item "$ProjectPath\bin" -Recurse -Force }
    if (Test-Path "$ProjectPath\obj") { Remove-Item "$ProjectPath\obj" -Recurse -Force }
    if (Test-Path $PublishPath) { Remove-Item $PublishPath -Recurse -Force }

    Write-Success "Netwayaj konplè"
}

# =============================================================================
# ETAP 3: BUILD
# =============================================================================

if (-not $SkipBuild) {
    Write-Step "ETAP 3: Build Aplikasyon"

    Write-Info "Ap konpile projet la..."
    Set-Location $ProjectPath

    # Mizajou vèsyon nan App.xaml.cs
    Write-Info "Ap mizajou nimewo vèsyon..."
    $appXamlCs = Get-Content "App.xaml.cs" -Raw
    $appXamlCs = $appXamlCs -replace 'private const string CurrentVersion = "[\d\.]+"', "private const string CurrentVersion = `"$Version`""
    $appXamlCs | Set-Content "App.xaml.cs" -NoNewline

    # Build
    dotnet build -c Release -v quiet

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build echwe!"
        exit 1
    }

    Write-Success "Build reyisi"
}

# =============================================================================
# ETAP 4: PUBLISH
# =============================================================================

if (-not $SkipBuild) {
    Write-Step "ETAP 4: Publish Aplikasyon"

    Write-Info "Ap kreye publish package..."
    
    dotnet publish `
        -c Release `
        -r win-x64 `
        --self-contained true `
        -p:PublishSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true `
        -p:EnableCompressionInSingleFile=true `
        -o $PublishPath `
        -v quiet

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Publish echwe!"
        exit 1
    }

    Set-Location $PSScriptRoot

    # Verifye fichye prensipal la
    $mainExe = "$PublishPath\NalaCreditDesktop.exe"
    if (-not (Test-Path $mainExe)) {
        Write-Error "Fichye executable pa jwenn: $mainExe"
        exit 1
    }

    $exeSize = (Get-Item $mainExe).Length / 1MB
    Write-Success "Publish konplè (Gwosè: $([math]::Round($exeSize, 2)) MB)"
}

# =============================================================================
# ETAP 5: KREYE INSTALLER
# =============================================================================

if (-not $SkipBuild -and $InnoSetupPath) {
    Write-Step "ETAP 5: Kreye Installer"

    Write-Info "Ap konpile Inno Setup script..."

    # Mizajou vèsyon nan setup script
    $setupContent = Get-Content $SetupScript -Raw
    $setupContent = $setupContent -replace '#define MyAppVersion "[\d\.]+"', "#define MyAppVersion `"$Version`""
    $setupContent | Set-Content $SetupScript -NoNewline

    # Konpile
    & $InnoSetupPath $SetupScript /Q

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Inno Setup konpilasyon echwe!"
        exit 1
    }

    if (-not (Test-Path $OutputInstaller)) {
        Write-Error "Installer pa kreye: $OutputInstaller"
        exit 1
    }

    $installerSize = (Get-Item $OutputInstaller).Length / 1MB
    Write-Success "Installer kreye (Gwosè: $([math]::Round($installerSize, 2)) MB)"
}

# =============================================================================
# ETAP 6: KALKILE HASH
# =============================================================================

if (-not $SkipBuild) {
    Write-Step "ETAP 6: Kalkile SHA256 Hash"

    Write-Info "Ap kalkile checksum pou sekirite..."
    
    $installerPath = if (Test-Path $OutputInstaller) { $OutputInstaller } else { "$PublishPath\NalaCreditDesktop.exe" }
    $hash = (Get-FileHash $installerPath -Algorithm SHA256).Hash.ToLower()
    $fileSize = (Get-Item $installerPath).Length

    Write-Success "Hash: $hash"
    Write-Info "Gwosè: $fileSize bytes"
}

# =============================================================================
# ETAP 7: KREYE VERSION.JSON
# =============================================================================

Write-Step "ETAP 7: Kreye version.json"

$versionInfo = @{
    latestVersion = $Version
    releaseDate = (Get-Date -Format "yyyy-MM-dd")
    downloadUrl = "https://api.nalacredit.com/downloads/desktop/NalaDesktop-Setup.exe"
    fileSize = $fileSize
    sha256Hash = $hash
    minimumVersion = "1.0.0"
    releaseNotes = $ReleaseNotes
    mandatory = $Mandatory.IsPresent
} | ConvertTo-Json -Depth 10

$versionInfo | Out-File $VersionJsonLocal -Encoding UTF8 -NoNewline

Write-Success "version.json kreye"
Write-Info "Kontni:"
Write-Host $versionInfo -ForegroundColor Gray

# =============================================================================
# ETAP 8: UPLOAD SOU SERVEUR
# =============================================================================

if (-not $SkipUpload) {
    Write-Step "ETAP 8: Upload sou DigitalOcean"

    # Kreye dosye downloads si li pa egziste
    Write-Info "Ap kreye dosye sou serveur..."
    ssh "${ServerUser}@${ServerIP}" "mkdir -p $RemoteDownloadsPath"

    # Upload installer
    Write-Info "Ap upload installer..."
    $installerPath = if (Test-Path $OutputInstaller) { $OutputInstaller } else { "$PublishPath\NalaCreditDesktop.exe" }
    
    scp $installerPath "${ServerUser}@${ServerIP}:$RemoteDownloadsPath/NalaDesktop-Setup.exe"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Upload installer echwe!"
        exit 1
    }
    Write-Success "Installer upload"

    # Upload version.json
    Write-Info "Ap upload version.json..."
    scp $VersionJsonLocal "${ServerUser}@${ServerIP}:$RemoteVersionJson"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Upload version.json echwe!"
        exit 1
    }
    Write-Success "version.json upload"

    # Konfigire permissions
    Write-Info "Ap konfigire permissions..."
    ssh "${ServerUser}@${ServerIP}" @"
chown -R www-data:www-data /var/www/downloads
chmod -R 755 /var/www/downloads
"@
    Write-Success "Permissions konfigire"
}

# =============================================================================
# REZIME FINAL
# =============================================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                           ║" -ForegroundColor Green
Write-Host "║              ✅ DEPLOYMENT KONPLE! ✅                      ║" -ForegroundColor Green
Write-Host "║                                                           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Success "Vèsyon $Version disponib sou serveur!"
Write-Host ""

Write-Info "ENFÒMASYON DEPLOYMENT:"
Write-Host "  📦 Vèsyon: $Version" -ForegroundColor White
Write-Host "  📅 Dat: $(Get-Date -Format 'dd/MM/yyyy HH:mm')" -ForegroundColor White
Write-Host "  🔒 SHA256: $hash" -ForegroundColor White
Write-Host "  📏 Gwosè: $([math]::Round($fileSize / 1MB, 2)) MB" -ForegroundColor White
Write-Host "  ⚠️  Obligatwa: $(if ($Mandatory) { 'Wi' } else { 'Non' })" -ForegroundColor White
Write-Host ""

Write-Info "URL TELECHAJMAN:"
Write-Host "  🌐 https://api.nalacredit.com/downloads/desktop/NalaDesktop-Setup.exe" -ForegroundColor Cyan
Write-Host "  📄 https://api.nalacredit.com/downloads/version.json" -ForegroundColor Cyan
Write-Host ""

Write-Info "PWOCHEN ETAP:"
Write-Host "  1. Teste telechajman sou: https://api.nalacredit.com/downloads/" -ForegroundColor White
Write-Host "  2. Voye lyen bay anplwaye siksyal yo" -ForegroundColor White
Write-Host "  3. Yo pral resevwa mizajou lè yo lanse aplikasyon" -ForegroundColor White
Write-Host ""

# Test download link
Write-Info "Teste lyen telechajman..."
try {
    $response = Invoke-WebRequest -Uri "https://api.nalacredit.com/downloads/version.json" -Method Head -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "Lyen telechajman fonksyone! ✓"
    }
} catch {
    Write-Warning "Pa ka verifye lyen telechajman. Teste manyèlman."
}

Write-Host ""
Write-Success "Tout bagay bon! 🎉"
Write-Host ""
