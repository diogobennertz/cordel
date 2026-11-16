# Junta o jogo inteiro (HTML + CSS + todos os scripts) num unico arquivo: publicar/index.html
# Serve para publicar online ou mandar o jogo para alguem como um arquivo so.
# Uso: python test/empacotar.py
import os
import re

raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
html = open(os.path.join(raiz, 'index.html'), encoding='utf8').read()
css = open(os.path.join(raiz, 'style.css'), encoding='utf8').read()

html, n_css = re.subn(r'<link rel="stylesheet" href="style\.css(\?v=\d+)?">', lambda m: '<style>\n' + css + '\n</style>', html)

def inline(m):
    caminho = m.group(1)
    js = open(os.path.join(raiz, caminho), encoding='utf8').read()
    if '</script' in js.lower():
        raise SystemExit('ERRO: ' + caminho + ' contem </script> e nao pode ser embutido')
    return '<script>\n// ---- ' + caminho + ' ----\n' + js + '\n</script>'

html, n_js = re.subn(r'<script src="(src/[^"?]+\.js)(?:\?v=\d+)?"></script>', inline, html)
if n_css != 1 or n_js != 17 or 'src="src/' in html:
    raise SystemExit('ERRO: index.html fora do esperado (css %d, scripts %d)' % (n_css, n_js))

os.makedirs(os.path.join(raiz, 'publicar'), exist_ok=True)
saida = os.path.join(raiz, 'publicar', 'index.html')
open(saida, 'w', encoding='utf8').write(html)
print('ok: publicar/index.html com %d scripts, %.0f KB' % (n_js, os.path.getsize(saida) / 1024))
