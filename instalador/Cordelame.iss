; Instalador do Cordelame (Inno Setup). Quem monta é o instalador/publicar.py.
; Instala só para o usuário, sem pedir senha de administrador.
[Setup]
AppId={{6C0E3F0A-2B7B-4C55-9D51-C0DE1A4E0001}
AppName=Cordelame
AppVersion={#Versao}
AppPublisher=Cordelame
DefaultDirName={localappdata}\Programs\Cordelame
DefaultGroupName=Cordelame
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
OutputDir={#Saida}
OutputBaseFilename=Cordelame-Instalar
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Cordelame

[Languages]
Name: "pt"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[InstallDelete]
Type: filesandordirs; Name: "{app}\jogo"

[Files]
Source: "{#Raiz}\motor\Godot_v4.3-stable_win64.exe"; DestDir: "{app}\motor"; DestName: "Cordelame.exe"; Flags: ignoreversion
Source: "{#Fonte}\jogo\*"; DestDir: "{app}\jogo"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#Fonte}\Jogar.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Fonte}\versao.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Fonte}\atualizacao.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Raiz}\COMO-JOGAR.txt"; DestDir: "{app}"; Flags: ignoreversion

; AVISO: o atalho da Área de Trabalho SÓ deve ser testado com /DSemAtalho=1 (nunca na máquina de quem
; está desenvolvendo — ele sobrescreve e, no desinstalar, apaga o atalho real do JOGAR.bat).
[Icons]
#ifndef SemAtalho
Name: "{autodesktop}\Cordelame"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\Jogar.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\motor\Cordelame.exe"
#endif
Name: "{group}\Cordelame"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\Jogar.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\motor\Cordelame.exe"
Name: "{group}\Desinstalar o Cordelame"; Filename: "{uninstallexe}"

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\Jogar.ps1"""; Description: "Jogar agora"; Flags: postinstall nowait skipifsilent
