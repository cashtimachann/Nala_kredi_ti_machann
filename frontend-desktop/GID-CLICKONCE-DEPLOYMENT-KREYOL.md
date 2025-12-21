# 🚀 GID CLICKONCE DEPLOYMENT - SEKIRIZE EPI OTOMATIK

## 🎯 Kisa ClickOnce Ye?

ClickOnce se yon teknoloji Microsoft pou distribiye aplikasyon Windows fasil epi sekirize. Li pèmèt:
- ✅ Enstalasyon yon-klik
- ✅ Mizajou otomatik
- ✅ Pa bezwen admin rights
- ✅ Version control otomatik
- ✅ Rollback fasil

## 📋 ETAP 1: KONFIGIRE PROJET LA

### 1.1 Modifye `.csproj`

Ajoute konfigirasyon ClickOnce nan `NalaCreditDesktop.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    
    <!-- ClickOnce Configuration -->
    <GenerateAssemblyInfo>false</GenerateAssemblyInfo>
    <PublishUrl>\\serveur\NalaDesktopApp\</PublishUrl>
    <InstallUrl>\\serveur\NalaDesktopApp\</InstallUrl>
    <ApplicationVersion>1.0.0.*</ApplicationVersion>
    <IsWebBootstrapper>false</IsWebBootstrapper>
    <UseApplicationTrust>true</UseApplicationTrust>
    <PublishWizardCompleted>true</PublishWizardCompleted>
    <BootstrapperEnabled>true</BootstrapperEnabled>
    
    <!-- Auto-Update Settings -->
    <UpdateEnabled>true</UpdateEnabled>
    <UpdateMode>Foreground</UpdateMode>
    <UpdateInterval>7</UpdateInterval>
    <UpdateIntervalUnits>Days</UpdateIntervalUnits>
    <UpdatePeriodically>false</UpdatePeriodically>
    <UpdateRequired>false</UpdateRequired>
    <MinimumRequiredVersion>1.0.0.0</MinimumRequiredVersion>
    
    <!-- Publish Settings -->
    <PublisherName>Nala Kredi Ti Machann</PublisherName>
    <ProductName>Nala Desktop</ProductName>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.SignalR.Client" Version="8.0.0" />
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
    <PackageReference Include="System.Net.Http" Version="4.3.4" />
    <PackageReference Include="ScottPlot.WPF" Version="4.1.71" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Hosting" Version="8.0.0" />
    <PackageReference Include="CommunityToolkit.Mvvm" Version="8.2.2" />
  </ItemGroup>

</Project>
```

## 📋 ETAP 2: KREYE SHARED FOLDER SOU SERVEUR

### 2.1 Sou Serveur (Windows Server oswa PC Principal)

```powershell
# Kreye dosye pou aplikasyon
New-Item -Path "C:\NalaDesktopApp" -ItemType Directory -Force

# Pataje dosye la sou rezo
New-SmbShare -Name "NalaDesktopApp" -Path "C:\NalaDesktopApp" -FullAccess "Everyone"

# Verifye partaj la
Get-SmbShare -Name "NalaDesktopApp"
```

### 2.2 Konfigire Permissions

```powershell
# Bay permission Read pou tout itilizatè
$acl = Get-Acl "C:\NalaDesktopApp"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users","Read","Allow")
$acl.SetAccessRule($accessRule)
Set-Acl "C:\NalaDesktopApp" $acl
```

## 📋 ETAP 3: PUBLISH APLIKASYON AN

### 3.1 Via Visual Studio (Pi Fasil)

1. **Open Project** nan Visual Studio
2. **Right-click** sou `NalaCreditDesktop` project
3. **Chwazi "Publish"**
4. **Select Target**: Folder oswa Network Location
5. **Location**: `\\serveur\NalaDesktopApp\`
6. **Click "Publish"**

### 3.2 Via PowerShell (Pou Automatize)

```powershell
# Navigate to project
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann\frontend-desktop\NalaCreditDesktop"

# Publish with ClickOnce
dotnet publish `
    -c Release `
    -r win-x64 `
    --self-contained false `
    -p:PublishSingleFile=false `
    -p:PublishDir="\\serveur\NalaDesktopApp\" `
    -p:PublishUrl="\\serveur\NalaDesktopApp\" `
    -p:ApplicationVersion="1.0.0.0"

Write-Host "✅ Aplikasyon pibliye! Itilizatè ka enstale li kounye a." -ForegroundColor Green
```

## 📋 ETAP 4: ENSTALASYON NAN SIKSYAL

### 4.1 Premye Enstalasyon (Chak Ordinatè)

**Metòd A - Direkteman:**
```
1. Ouvri Windows Explorer
2. Tape: \\serveur\NalaDesktopApp
3. Double-click sou "setup.exe"
4. Klike "Install"
```

**Metòd B - Script Enstalasyon:**

Kreye `install-nala-desktop.bat`:
```batch
@echo off
echo ========================================
echo    NALA KREDI - ENSTALASYON DESKTOP
echo ========================================
echo.

REM Tcheke si aplikasyon deja enstale
if exist "%LOCALAPPDATA%\Apps\2.0\*NalaCreditDesktop.exe" (
    echo Aplikasyon deja enstale!
    echo Ap lanse aplikasyon...
    start "" "%LOCALAPPDATA%\Apps\2.0\*NalaCreditDesktop.exe"
) else (
    echo Ap enstale aplikasyon...
    start /wait \\serveur\NalaDesktopApp\setup.exe
    echo.
    echo Enstalasyon konplet!
)

echo.
echo Shortcut kreye sou Desktop ak Start Menu.
pause
```

### 4.2 Distribye Script la

Ou ka:
- Mete script la sou USB
- Email li bay anplwaye yo
- Pataje sou netwòk lan

## 📋 ETAP 5: AUTO-UPDATE (Otomatik!)

### 5.1 Kijan Auto-Update Fonksyone

Chak fwa itilizatè lanse aplikasyon:
1. Aplikasyon tcheke si gen nouvo vèsyon
2. Si gen, li telechaje mizajou
3. Li enstale epi restart

### 5.2 Pou Pibliye Mizajou

```powershell
# Chanje vèsyon nan .csproj
# Egzanp: 1.0.0.0 → 1.0.1.0

# Pibliye nouvo vèsyon
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann\frontend-desktop\NalaCreditDesktop"

dotnet publish `
    -c Release `
    -p:PublishDir="\\serveur\NalaDesktopApp\" `
    -p:ApplicationVersion="1.0.1.0"

Write-Host "✅ Nouvo vèsyon disponib! Itilizatè pral resevwa mizajou." -ForegroundColor Green
```

Tou senpleman! Lè itilizatè yo lanse aplikasyon, yo pral wè:
```
📦 Nouvo vèsyon disponib!
   Vèsyon 1.0.1.0 pral enstale...
   [████████░░] 80% Complete
```

## 🔒 ETAP 6: CODE SIGNING (Pou Sekirite)

### 6.1 Poukisa Code Signing Enpòtan?

- ✅ Montre aplikasyon sòti nan yon sous fiab
- ✅ Anpeche modifikasyon pa moun mal-entansyone
- ✅ Windows pa bloke aplikasyon an

### 6.2 Jwenn Sètifika

Opsyon 1: **Achte Sètifika Ofisyèl**
- DigiCert (~$400/an)
- Sectigo (~$200/an)
- GoDaddy (~$150/an)

Opsyon 2: **Kreye Self-Signed Certificate** (Pou test)

```powershell
# Kreye sètifika pou test
$cert = New-SelfSignedCertificate `
    -Subject "CN=Nala Kredi Ti Machann" `
    -Type CodeSigning `
    -CertStoreLocation Cert:\CurrentUser\My

# Export certificate
$password = ConvertTo-SecureString -String "VotreMotDePasse" -Force -AsPlainText
Export-PfxCertificate `
    -Cert $cert `
    -FilePath "C:\NalaCodeSigning.pfx" `
    -Password $password

Write-Host "✅ Sètifika kreye: C:\NalaCodeSigning.pfx" -ForegroundColor Green
```

### 6.3 Siyen Aplikasyon

```powershell
# Siyen manifest yo
$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"

& $signtool sign /f "C:\NalaCodeSigning.pfx" /p "VotreMotDePasse" /t "http://timestamp.digicert.com" "\\serveur\NalaDesktopApp\*.application"

& $signtool sign /f "C:\NalaCodeSigning.pfx" /p "VotreMotDePasse" /t "http://timestamp.digicert.com" "\\serveur\NalaDesktopApp\Application Files\*\*.exe.deploy"
```

## 📊 ETAP 7: MONITORING EPI ESTATISTIK

### 7.1 Suiv Ki Itilizatè Gen Ki Vèsyon

Kreye script `check-versions.ps1`:

```powershell
# Tcheke ki vèsyon chak siksyal ap itilize
$branches = @("PC-PAP-01", "PC-CAP-01", "PC-GNA-01")

Write-Host "📊 ESTATISTIK VÈSYON DESKTOP APP" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

foreach ($pc in $branches) {
    $version = Invoke-Command -ComputerName $pc -ScriptBlock {
        Get-ChildItem "$env:LOCALAPPDATA\Apps\2.0\" -Recurse -Filter "NalaCreditDesktop.exe" -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty VersionInfo | 
        Select-Object -ExpandProperty FileVersion
    } -ErrorAction SilentlyContinue
    
    if ($version) {
        Write-Host "$pc : v$version ✅" -ForegroundColor Green
    } else {
        Write-Host "$pc : Pa enstale ❌" -ForegroundColor Red
    }
}
```

### 7.2 Force Update (Si Nesesè)

Nan `.csproj`, chanje:
```xml
<UpdateRequired>true</UpdateRequired>
<MinimumRequiredVersion>1.0.1.0</MinimumRequiredVersion>
```

Sa pral fòse tout moun pou mizajou anvan yo ka itilize aplikasyon.

## 🎯 AVANTAJ CLICKONCE VS LÒT METÒD

| Karakteristik | ClickOnce | Manual Install | MSI Installer |
|--------------|-----------|----------------|---------------|
| **Auto-Update** | ✅ Wi | ❌ Non | ⚠️ Depann |
| **Admin Rights** | ❌ Non | ✅ Wi | ✅ Wi |
| **Sekirite** | ✅✅✅ Egzèlan | ⚠️ Mwayen | ✅✅ Bon |
| **Rollback** | ✅ Fasil | ❌ Difisil | ⚠️ Mwayen |
| **Network Deploy** | ✅ Wi | ✅ Wi | ✅ Wi |
| **Offline Install** | ⚠️ Premye fwa sèlman | ✅ Wi | ✅ Wi |
| **Fasil Deploy** | ✅✅✅ | ⚠️ | ✅✅ |

## 🔧 DEPANNAJ KOMEN

### Pwoblèm 1: "Application cannot be started"

**Solisyon:**
```powershell
# Netwaye ClickOnce cache
%LOCALAPPDATA%\Apps\2.0\
# Efase tout dosye epi re-enstale
```

### Pwoblèm 2: "Update failed"

**Solisyon:**
```powershell
# Verifye koneksyon netwòk
Test-Connection serveur

# Verifye permissions
Get-Acl "\\serveur\NalaDesktopApp"
```

### Pwoblèm 3: "Trust not granted"

**Solisyon:**
- Siyen aplikasyon avèk code signing certificate
- Oswa: Konfigire Group Policy pou make aplikasyon kòm trusted

## 📋 CHECKLIST FINAL

### Pou Devlopè:
- [ ] Konfigire `.csproj` ak ClickOnce settings
- [ ] Kreye shared folder sou serveur
- [ ] Publish premye vèsyon
- [ ] Teste enstalasyon sou 1 PC test
- [ ] Siyen aplikasyon (si posib)
- [ ] Kreye script enstalasyon fasil

### Pou IT/Admin:
- [ ] Konfigire permissions sou shared folder
- [ ] Teste aksè netwòk nan chak siksyal
- [ ] Distribye script enstalasyon
- [ ] Enstale sou 1-2 PC test
- [ ] Verifye auto-update ap fonksyone
- [ ] Prepare documentation pou itilizatè yo

### Pou Chak Mizajou:
- [ ] Chanje `ApplicationVersion` nan `.csproj`
- [ ] Test nouvo vèsyon lokalman
- [ ] Publish nan shared folder
- [ ] Verifye auto-update ap detekte mizajou
- [ ] Monitore adoption rate

## 📞 KIJAN POU JWENN SIPÒ

Si w gen pwoblèm:

1. **Tcheke Logs:**
   ```
   %LOCALAPPDATA%\Apps\2.0\Data\
   ```

2. **Reset Application:**
   ```powershell
   Remove-Item "$env:LOCALAPPDATA\Apps\2.0\*" -Recurse -Force
   ```

3. **Kontakte Ekip Teknik:**
   - Email: support@nalacredit.ht
   - Tel: +509 XXXX-XXXX

## 🎉 REZILTA FINAL

Avèk ClickOnce:
- ✅ **Itilizatè** jis klike "Install" yon fwa
- ✅ **Mizajou** fet otomatikman chak semèn
- ✅ **Sekirite** garanti ak code signing
- ✅ **Administrasyon** senp epi santral
- ✅ **Zero downtime** pou deployment

---

**Dat Kreyasyon:** 17 Desanm 2025  
**Vèsyon:** 1.0  
**Otè:** Nala Kredi Ti Machann IT Team
