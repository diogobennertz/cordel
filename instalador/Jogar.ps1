# Abre o Cordelame. Antes, se houver um endereço em atualizacao.txt, confere se saiu versão nova e baixa sozinho.
$ErrorActionPreference = 'SilentlyContinue'
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = ''
$cfg = Join-Path $base 'atualizacao.txt'
if (Test-Path $cfg) { $url = ("" + (Get-Content $cfg -TotalCount 1)).Trim().TrimEnd('/') }
if ($url) {
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $wc = New-Object Net.WebClient
    $rem = $wc.DownloadString("$url/versao.txt").Trim()
    $loc = ("" + (Get-Content (Join-Path $base 'versao.txt') -TotalCount 1)).Trim()
    if ($rem -and ($rem -ne $loc) -and ($rem.Length -lt 40)) {
      $zip = Join-Path $env:TEMP 'cordelame-jogo.zip'
      $wc.DownloadFile("$url/jogo.zip", $zip)
      $novo = Join-Path $base 'jogo_novo'
      if (Test-Path $novo) { Remove-Item -Recurse -Force $novo }
      Expand-Archive -Path $zip -DestinationPath $novo -Force
      if (Test-Path (Join-Path $novo 'project.godot')) {
        $velho = Join-Path $base 'jogo'
        if (Test-Path $velho) { Remove-Item -Recurse -Force $velho }
        Rename-Item $novo 'jogo'
        Set-Content -Path (Join-Path $base 'versao.txt') -Value $rem
      }
      Remove-Item -Force $zip
    }
  } catch {}
}
Start-Process -FilePath (Join-Path $base 'motor\Cordelame.exe') -ArgumentList @('--path', ('"' + (Join-Path $base 'jogo') + '"'))
