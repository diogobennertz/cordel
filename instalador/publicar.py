# Monta a versão para distribuir, na pasta dist/:
#   jogo.zip + versao.txt     o que o atualizador baixa (suba os dois no mesmo lugar)
#   Cordelame-Instalar.exe    o instalador (motor + jogo + atalho)
# Uso:  python instalador/publicar.py [endereço-das-atualizações]
# O endereço também pode ficar guardado em instalador/endereco.txt.
import os, shutil, subprocess, sys, tempfile, time, zipfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RAIZ)
url = ''
if len(sys.argv) > 1: url = sys.argv[1]
elif os.path.exists('instalador/endereco.txt'): url = open('instalador/endereco.txt').read().strip()
versao = time.strftime('%Y.%m.%d.%H%M')

# monta numa pasta temporária de caminho curto (o Windows não aceita caminho comprido demais no instalador)
FONTE = os.path.join(tempfile.gettempdir(), 'cdl_pub')
shutil.rmtree(FONTE, ignore_errors=True)
os.makedirs('dist', exist_ok=True)

def fora(pasta, nomes):
    return [n for n in nomes if n.startswith('shot_') or n.startswith('preview') or n.endswith('.tmp') or n == 'LEIA-ME.md']

shutil.copytree('godot', os.path.join(FONTE, 'jogo'), ignore=fora)
for destino in ('dist', FONTE):
    open(os.path.join(destino, 'versao.txt'), 'w').write(versao + '\n')
    open(os.path.join(destino, 'atualizacao.txt'), 'w').write(url + '\n')

base_jogo = os.path.join(FONTE, 'jogo')
with zipfile.ZipFile('dist/jogo.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for r, _, arqs in os.walk(base_jogo):
        for a in arqs:
            c = os.path.join(r, a)
            z.write(c, os.path.relpath(c, base_jogo).replace(os.sep, '/'))
print('versao', versao, '| jogo.zip', round(os.path.getsize('dist/jogo.zip') / 1e6, 1), 'MB | atualiza de:', url or '(nenhum endereco ainda)')

iscc = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Programs', 'Inno Setup 6', 'ISCC.exe')
if not os.path.exists(iscc): iscc = os.path.join('C:' + os.sep, 'Program Files (x86)', 'Inno Setup 6', 'ISCC.exe')
if not os.path.exists(iscc):
    print('Inno Setup nao encontrado: o instalador nao foi gerado'); sys.exit(0)
shutil.copy('instalador/Cordelame.iss', FONTE)
shutil.copy('instalador/Jogar.ps1', FONTE)
r = subprocess.run([iscc, '/Q', '/DVersao=' + versao, '/DFonte=' + FONTE, '/DRaiz=' + RAIZ, '/DSaida=' + FONTE, os.path.join(FONTE, 'Cordelame.iss')])
if r.returncode != 0:
    print('ERRO ao montar o instalador'); sys.exit(1)
shutil.copy(os.path.join(FONTE, 'Cordelame-Instalar.exe'), 'dist/Cordelame-Instalar.exe')
print('instalador', round(os.path.getsize('dist/Cordelame-Instalar.exe') / 1e6, 1), 'MB')
