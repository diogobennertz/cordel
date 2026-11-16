# Atualiza o numero de versao dos arquivos no index.html, para o navegador nunca usar JS/CSS antigo do cache.
# Uso: python test/versao.py
import os
import re
import time

p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'index.html')
s = open(p, encoding='utf8').read()
v = str(int(time.time()))
novo, n = re.subn(r'\?v=\d+"', '?v=' + v + '"', s)
# seguranca: so grava se todas as 18 referencias (17 scripts + 1 css) continuam inteiras
ok = n == 18 and novo.count('src="src/') == 17 and 'href="style.css?v=' in novo
if ok:
    open(p, 'w', encoding='utf8').write(novo)
    print('versao', v)
else:
    print('ERRO: index.html fora do esperado, nada foi alterado (', n, 'referencias )')
    raise SystemExit(1)
