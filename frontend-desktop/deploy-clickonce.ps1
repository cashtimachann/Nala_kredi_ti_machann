# =============================================================================
# NALA KREDI - CLICKONCE DEPLOYMENT SCRIPT
# =============================================================================
# Script pou publish desktop application ak ClickOnce
# Dat: 17 Desanm 2025
# =============================================================================

param(
    [string]$Version = "1.0.0.0",
    [string]$PublishPath = "\\serveur\NalaDesktopApp",
    [switch]$LocalTest,
    [switch]$SignCode
)

# Koulè pou output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

# Banner
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   NALA KREDI - CLICKONCE DEPLOYMENT v$Version   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Konfigirasyon
$ProjectPath = "$PSScriptRoot\NalaCreditDesktop"
$ProjectFile = "$ProjectPath\NalaCreditDesktop.csproj"

# Si test lokal, itilize dosye lokal
if ($LocalTest) {
    $PublishPath = "$PSScriptRoot\publish-test"
    Write-Warning "Mode TEST: Publish nan $PublishPath"
}

# Verifye si projet egziste
if (-not (Test-Path $ProjectFile)) {
    Write-Error "Projet pa jwenn: $ProjectFile"
    exit 1
}

Write-Info "Projet: $ProjectFile"
Write-Info "Version: $Version"
Write-Info "Destinasyon: $PublishPath"
Write-Host ""

# =============================================================================
# ETAP 1: BACKUP VÈSYON ANVAN AN
# =============================================================================

if (Test-Path $PublishPath -and -not $LocalTest) {
    Write-Info "Ap kreye backup vèsyon anvan an..."
    
    $BackupPath = "$PublishPath-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    try {
        Copy-Item -Path $PublishPath -Destination $BackupPath -Recurse -Force
        Write-Success "Backup kreye: $BackupPath"
    } catch {
        Write-Warning "Pa ka kreye backup: $_"
    }
}

# =============================================================================
# ETAP 2: NETWAYE BUILD FOLDER
# =============================================================================

Write-Info "Ap netwaye dosye build yo..."

$BinPath = "$ProjectPath\bin"
$ObjPath = "$ProjectPath\obj"

if (Test-Path $BinPath) { Remove-Item $BinPath -Recurse -Force }
if (Test-Path $ObjPath) { Remove-Item $ObjPath -Recurse -Force }

Write-Success "Dosye netwaye"

# =============================================================================
# ETAP 3: BUILD PROJET LA
# =============================================================================

Write-Info "Ap build projet la..."

Set-Location $ProjectPath

$buildResult = dotnet build -c Release 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build echwe!"
    Write-Host $buildResult
    exit 1
}

Write-Success "Build reyisi"

# =============================================================================
# ETAP 4: PUBLISH AK CLICKONCE
# =============================================================================

Write-Info "Ap publish aplikasyon..."

# Kreye dosye destinasyon si li pa egziste
if (-not (Test-Path $PublishPath)) {
    New-Item -Path $PublishPath -ItemType Directory -Force | Out-Null
}

# Publish command
$publishArgs = @(
    "publish"
    "-c", "Release"
    "-r", "win-x64"
    "--self-contained", "false"
    "-p:PublishSingleFile=false"
    "-p:PublishDir=$PublishPath\"
    "-p:ApplicationVersion=$Version"
    "-p:PublishUrl=$PublishPath\"
)

$publishResult = dotnet @publishArgs 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Publish echwe!"
    Write-Host $publishResult
    exit 1
}

Write-Success "Publish reyisi"

# =============================================================================
# ETAP 5: CODE SIGNING (Opsyonèl)
# =============================================================================

if ($SignCode) {
    Write-Info "Ap siyen aplikasyon..."
    
    $CertPath = "$PSScriptRoot\NalaCodeSigning.pfx"
    
    if (Test-Path $CertPath) {
        $SignToolPath = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"
        
        if (Test-Path $SignToolPath) {
            # Siyen manifest yo
            $manifestFiles = Get-ChildItem -Path $PublishPath -Filter "*.application" -Recurse
            
            foreach ($manifest in $manifestFiles) {
                Write-Info "Ap siyen: $($manifest.Name)"
                
                $signArgs = @(
                    "sign"
                    "/f", $CertPath
                    "/p", "VotreMotDePasse"
                    "/t", "http://timestamp.digicert.com"
                    $manifest.FullName
                )
                
                & $SignToolPath @signArgs | Out-Null
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Siyen: $($manifest.Name)"
                } else {
                    Write-Warning "Pa ka siyen: $($manifest.Name)"
                }
            }
        } else {
            Write-Warning "SignTool pa jwenn. Code signing skip."
        }
    } else {
        Write-Warning "Certificate pa jwenn: $CertPath"
    }
}

# =============================================================================
# ETAP 6: KREYE SETUP INSTRUCTIONS
# =============================================================================

Write-Info "Ap kreye fichye README..."

$ReadmeContent = @"
╔════════════════════════════════════════════════════════════╗
║           NALA KREDI - DESKTOP APPLICATION                 ║
║                  Version $Version                             ║
╚════════════════════════════════════════════════════════════╝

📦 ENSTALASYON
═══════════════

Pou enstale aplikasyon:

1. Double-click sou 'setup.exe'
2. Swiv enstriksyon yo
3. Klike 'Install'

⚙️  KONFIGIRASYON
═════════════════

Apre enstalasyon, aplikasyon pral:
- Kreye shortcut sou Desktop
- Ajoute aplikasyon nan Start Menu
- Konfigire auto-update

🔄 AUTO-UPDATE
═══════════════

Aplikasyon tcheke mizajou chak fwa li lanse.
Si gen nouvo vèsyon, li pral telechaje epi enstale otomatikman.

📞 SIPÒ
════════

Si w gen pwoblèm:
- Email: support@nalacredit.ht
- Tel: +509 XXXX-XXXX

Genyen: $(Get-Date -Format 'dd/MM/yyyy HH:mm')
"@

$ReadmeContent | Out-File -FilePath "$PublishPath\README.txt" -Encoding UTF8

Write-Success "README.txt kreye"

# =============================================================================
# ETAP 7: KREYE INSTALL SCRIPT
# =============================================================================

Write-Info "Ap kreye script enstalasyon..."

$InstallScript = @"
@echo off
echo ========================================
echo    NALA KREDI - ENSTALASYON DESKTOP
echo           Version $Version
echo ========================================
echo.

REM Tcheke si deja enstale
if exist "%LOCALAPPDATA%\Apps\2.0\*NalaCreditDesktop.exe" (
    echo [✅] Aplikasyon deja enstale!
    echo.
    echo Ap lanse aplikasyon...
    timeout /t 2 /nobreak >nul
    start "" "%LOCALAPPDATA%\Apps\2.0\*NalaCreditDesktop.exe"
    exit /b 0
)

echo [📦] Ap enstale aplikasyon...
echo.

REM Lanse setup
if exist "%~dp0setup.exe" (
    start /wait "" "%~dp0setup.exe"
    echo.
    echo [✅] Enstalasyon konplet!
    echo.
    echo Shortcut kreye sou:
    echo   - Desktop
    echo   - Start Menu
    echo.
) else (
    echo [❌] setup.exe pa jwenn!
    echo.
    pause
    exit /b 1
)

echo Peze Enter pou fèmen...
pause >nul
"@

$InstallScript | Out-File -FilePath "$PublishPath\install.bat" -Encoding ASCII

Write-Success "install.bat kreye"

# =============================================================================
# REZIME
# =============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           DEPLOYMENT KONPLE!                   ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Success "Aplikasyon pibliye nan: $PublishPath"
Write-Success "Version: $Version"

Write-Host ""
Write-Info "PWOCHEN ETAP:"
Write-Host "  1. Pataje dosye $PublishPath sou rezo" -ForegroundColor White
Write-Host "  2. Distribye install.bat bay itilizatè yo" -ForegroundColor White
Write-Host "  3. Itilizatè egzekite install.bat pou enstale" -ForegroundColor White
Write-Host ""

if ($LocalTest) {
    Write-Info "Mode TEST: Verifye dosye nan $PublishPath"
    Write-Host ""
    Write-Host "Pou teste enstalasyon:" -ForegroundColor Yellow
    Write-Host "  cd '$PublishPath'" -ForegroundColor White
    Write-Host "  .\setup.exe" -ForegroundColor White
} else {
    Write-Host "Pou teste enstalasyon:" -ForegroundColor Cyan
    Write-Host "  1. Ouvri \\serveur\NalaDesktopApp" -ForegroundColor White
    Write-Host "  2. Egzekite install.bat" -ForegroundColor White
}

Write-Host ""
Write-Success "Tout bagay OK! 🎉"
Write-Host ""

# Estatistik
$PublishedFiles = Get-ChildItem -Path $PublishPath -Recurse -File
$TotalSize = ($PublishedFiles | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "📊 ESTATISTIK:" -ForegroundColor Cyan
Write-Host "   Fichye pibliye: $($PublishedFiles.Count)" -ForegroundColor White
Write-Host "   Gwosè total: $([math]::Round($TotalSize, 2)) MB" -ForegroundColor White
Write-Host ""
