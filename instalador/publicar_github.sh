#!/bin/bash
# Publica uma nova versão: gera o instalador, sobe o código pro repositório privado,
# sobe os arquivos de atualização e o instalador pro repositório público (cordelame-jogo),
# e cria uma "release" com o Cordelame-Instalar.exe anexado.
#
# Uso: rode da raiz do projeto: bash instalador/publicar_github.sh "mensagem do commit"
set -e
cd "$(dirname "$0")/.."
GH="$LOCALAPPDATA/Microsoft/WinGet/Packages/GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe/bin/gh.exe"
MSG="${1:-Atualiza o jogo}"

echo "== 1/5 código-fonte -> repositório privado =="
git add -A
git -c user.name="Diogo" -c user.email="diogo.bennertz@gmail.com" commit -q -m "$MSG

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" || echo "(nada novo para gravar)"
git push origin master

echo "== 2/5 montando o instalador =="
rm -rf dist/jogo
python instalador/publicar.py
VERSAO=$(cat dist/versao.txt)

echo "== 3/5 arquivos de atualização -> repositório público =="
PUB=/tmp/cdl-pub-repo
if [ ! -d "$PUB/.git" ]; then
  rm -rf "$PUB"
  git clone https://github.com/diogobennertz/cordelame-jogo.git "$PUB"
fi
cp dist/versao.txt dist/jogo.zip "$PUB"/
(cd "$PUB" && git add -A && git -c user.name="Diogo" -c user.email="diogo.bennertz@gmail.com" commit -q -m "Versão $VERSAO

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" && git push origin main)

echo "== 4/5 instalador -> release no repositório público =="
"$GH" release create "v$VERSAO" dist/Cordelame-Instalar.exe \
  --repo diogobennertz/cordelame-jogo \
  --title "Cordelame $VERSAO" \
  --notes "Instalador de teste do Cordelame. Baixe e rode — não precisa de senha de administrador." \
  --latest

echo "== 5/5 pronto =="
echo "Link para os colegas: https://github.com/diogobennertz/cordelame-jogo/releases/latest"
echo "Versão: $VERSAO"
