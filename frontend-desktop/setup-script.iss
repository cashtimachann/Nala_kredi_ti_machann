; =============================================================================
; NALA KREDI TI MACHANN DESKTOP - INNO SETUP SCRIPT
; =============================================================================
; Script pou kreye installer Windows ki pwofesyonèl
; Creates professional Windows installer
; =============================================================================

#define MyAppName "Nala Kredi Ti Machann Desktop"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Nala Kredi Ti Machann"
#define MyAppURL "https://nalacredit.com"
#define MyAppExeName "NalaCreditDesktop.exe"

[Setup]
; Enfòmasyon aplikasyon
AppId={{8F7D4A2B-3C5E-4B6F-9A8D-1E2F3C4D5E6F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Destinasyon enstalasyon
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Privileges
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Output
OutputDir=.
OutputBaseFilename=NalaDesktop-Setup
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

; Konpresyon
Compression=lzma2/max
SolidCompression=yes
DiskSpanning=no

; Visual settings
WizardStyle=modern
WizardImageFile=installer-image.bmp
WizardSmallImageFile=installer-small.bmp

; Platform
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; Languages
ShowLanguageDialog=auto

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
french.WelcomeLabel2=Sa pral enstale [name/ver] sou òdinatè w.%n%nLi rekòmande pou fèmen tout lòt aplikasyon anvan kontinye.
english.WelcomeLabel2=This will install [name/ver] on your computer.%n%nIt is recommended that you close all other applications before continuing.

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "Kreye shortcut Quick Launch"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Fichye prensipal yo
Source: "publish\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Configuration files
Source: "appsettings.json"; DestDir: "{app}"; Flags: ignoreversion

; NOTE: Pa itilize "Flags: ignoreversion" sou fichye ki pa dwe ranplase

[Icons]
; Start Menu shortcuts
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

; Quick Launch shortcut
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Registry]
; Ajoute nan Apps & Features
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "DisplayName"; ValueData: "{#MyAppName}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "DisplayVersion"; ValueData: "{#MyAppVersion}"
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "URLInfoAbout"; ValueData: "{#MyAppURL}"
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}"; ValueType: string; ValueName: "DisplayIcon"; ValueData: "{app}\{#MyAppExeName}"

[Run]
; Lanse aplikasyon apre enstalasyon
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Efase dosye data apre uninstall
Type: filesandordirs; Name: "{localappdata}\NalaCreditDesktop"

[Code]
// =============================================================================
// CODE PASCAL POU FONKSYON ESPESYAL
// =============================================================================

// Tcheke si .NET 8.0 Desktop Runtime enstale
function IsDotNetInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := RegKeyExists(HKLM, 'SOFTWARE\dotnet\Setup\InstalledVersions\x64\desktopruntime');
  if not Result then
    Result := RegKeyExists(HKLM, 'SOFTWARE\WOW6432Node\dotnet\Setup\InstalledVersions\x64\desktopruntime');
end;

// Verifye dependans anvan enstalasyon
function InitializeSetup(): Boolean;
begin
  Result := True;
  
  if not IsDotNetInstalled() then
  begin
    if MsgBox('.NET 8.0 Desktop Runtime pa enstale sou òdinatè sa.' + #13#10 + #13#10 +
              'Aplikasyon an pa pral fonksyone san li.' + #13#10 + #13#10 +
              'Èske w vle kontinye enstalasyon?', 
              mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
    end
    else
    begin
      // Afiche mesaj pou download .NET
      MsgBox('Apre enstalasyon, ou pral dwe telechaje .NET 8.0 Desktop Runtime sou:' + #13#10 + #13#10 +
             'https://dotnet.microsoft.com/download/dotnet/8.0' + #13#10 + #13#10 +
             'Chwazi: ".NET Desktop Runtime 8.0.x - Windows x64"',
             mbInformation, MB_OK);
    end;
  end;
end;

// Verifye si aplikasyon deja ap kouri
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Result := '';
  
  // Eseye fèmen aplikasyon si li ap kouri
  if CheckForMutex('Global\NalaCreditDesktopMutex') then
  begin
    if MsgBox('Nala Kredi Desktop ap kouri aktyèlman.' + #13#10 + #13#10 +
              'Èske w vle fèmen li pou kontinye enstalasyon?',
              mbConfirmation, MB_YESNO) = IDYES then
    begin
      // Eseye fèmen aplikasyon
      Exec('taskkill', '/F /IM NalaCreditDesktop.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Sleep(2000); // Tann 2 segonn
    end
    else
    begin
      Result := 'Enstalasyon annile. Fèmen aplikasyon epi eseye ankò.';
    end;
  end;
end;

// Afiche mesaj final
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Kreye dosye logs si li pa egziste
    ForceDirectories(ExpandConstant('{localappdata}\NalaCreditDesktop\Logs'));
  end;
end;

// Custom finish message
procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpFinished then
  begin
    WizardForm.FinishedLabel.Caption := 
      'Nala Kredi Desktop enstale avèk siksè!' + #13#10 + #13#10 +
      'Klike sou Finish pou fèmen Setup Wizard la.' + #13#10 + #13#10 +
      'Si w ankoche "Lanse Nala Kredi Desktop", ' +
      'aplikasyon an pral ouvri otomatikman.';
  end;
end;
