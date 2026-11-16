# Testa o instalador (compila, instala, confere a atualização, desinstala) numa pasta à parte,
# SEM NUNCA tocar no atalho real da Área de Trabalho de quem está desenvolvendo (usa /DSemAtalho=1).
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$fonte = Join-Path $env:TEMP 'cdl_pub'
$iscc = Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'
$saida = Join-Path $env:TEMP 'cdl_teste'
New-Item -ItemType Directory -Force $saida | Out-Null
& $iscc /Q /DVersao=teste /DSemAtalho=1 "/DFonte=$fonte" "/DRaiz=$raiz" "/DSaida=$saida" (Join-Path $fonte 'Cordelame.iss')
if ($LASTEXITCODE -ne 0) { throw "ISCC falhou" }

$dest = Join-Path $env:TEMP 'cdl_inst_teste'
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
$p = Start-Process (Join-Path $saida 'Cordelame-Instalar.exe') -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NOICONS',"/DIR=`"$dest`"" -Wait -PassThru
Write-Host "instalou: $($p.ExitCode)"

$verReal = Get-Content (Join-Path $dest 'versao.txt')
Write-Host "versão instalada: $verReal"
Set-Content (Join-Path $dest 'versao.txt') '2000.01.01.0000'
Remove-Item (Join-Path $dest 'jogo\scripts\World.gd')
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dest 'Jogar.ps1')
Start-Sleep -Seconds 10
$jogo = Get-Process | Where-Object { $_.Path -like "$dest*" }
Write-Host "jogo abriu: $($jogo.Count -gt 0) | versão após atualizar: $(Get-Content (Join-Path $dest 'versao.txt')) | arquivo voltou: $(Test-Path (Join-Path $dest 'jogo\scripts\World.gd'))"
$jogo | ForEach-Object { Stop-Process -Id $_.Id -Force }

Start-Process (Join-Path $dest 'unins000.exe') -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES' -Wait | Out-Null
Start-Sleep 2
Remove-Item -Recurse -Force $dest -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $saida -ErrorAction SilentlyContinue
Write-Host "limpo."
