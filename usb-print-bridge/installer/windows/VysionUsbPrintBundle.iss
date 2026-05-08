; Vysion USB Print Bundle — Inno Setup 6
; Één setup.exe: usb-print-bridge + optioneel Epson TM multi-model installer.
;
; Optioneel (niet in git): plaats officiële Epson-setup als:
;   installer\windows\vendor\Epson_TM_Driver.exe
; Ontbreekt die bij compileren? Dan alleen bridge in het pakket.

#define MyAppName "Vysion USB Print Bundle"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Vysion"
#define BridgeRoot "..\.."

#ifexist "vendor\Epson_TM_Driver.exe"
#define IncludeEpsonDriver
#endif

[Setup]
AppId={{C8A501F4-9E2B-4D71-A063-4B19E7F3D420}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Vysion\UsbPrintBridge
DefaultGroupName=Vysion USB Print
DisableProgramGroupPage=no
OutputDir=output
OutputBaseFilename=VysionUsbPrintBundle-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
SetupLogging=yes

[Languages]
Name: "dutch"; MessagesFile: "compiler:Languages\Dutch.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#BridgeRoot}\package.json"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "{#BridgeRoot}\package-lock.json"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "{#BridgeRoot}\server.mjs"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "{#BridgeRoot}\list-ports.mjs"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "{#BridgeRoot}\start-bridge.bat"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "{#BridgeRoot}\README.md"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "{#BridgeRoot}\config.example.json"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "{#BridgeRoot}\lib\receipt-escpos.mjs"; DestDir: "{app}\bridge\lib"; Flags: ignoreversion
#ifdef IncludeEpsonDriver
Source: "vendor\Epson_TM_Driver.exe"; DestDir: "{tmp}"; DestName: "epson_tm_setup.exe"; Flags: deleteafterinstall
#endif

[Icons]
Name: "{group}\{#MyAppName} — bridge starten"; Filename: "{sys}\cmd.exe"; Parameters: "/k cd /d ""{app}\bridge"" && node server.mjs"; WorkingDir: "{app}\bridge"
Name: "{group}\Bridge-map openen"; Filename: "{explorer}"; Parameters: "{app}\bridge"
Name: "{group}\Printer COM-poorten (lijst)"; Filename: "{sys}\cmd.exe"; Parameters: "/k cd /d ""{app}\bridge"" && node list-ports.mjs"; WorkingDir: "{app}\bridge"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{sys}\cmd.exe"; Parameters: "/k cd /d ""{app}\bridge"" && node server.mjs"; WorkingDir: "{app}\bridge"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Snelkoppeling op het bureaublad"; GroupDescription: "Snelkoppelingen:"; Flags: unchecked

[Run]
#ifdef IncludeEpsonDriver
Filename: "{tmp}\epson_tm_setup.exe"; StatusMsg: "Epson stuurprogramma voor bonprinter installeren..."; Flags: waituntilterminated shellexec
#endif
Filename: "{sys}\cmd.exe"; Parameters: "/c cd /d ""{app}\bridge"" && npm ci --omit=dev"; StatusMsg: "npm ci (bridge)..."; Flags: waituntilterminated; Check: NodeOnPath

[Code]
function NodeOnPath: Boolean;
var
  Code: Integer;
begin
  Exec(ExpandConstant('{sys}\cmd.exe'), '/c where node', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Result := Code = 0;
end;
