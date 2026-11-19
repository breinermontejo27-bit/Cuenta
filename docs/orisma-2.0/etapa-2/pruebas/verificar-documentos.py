# Verifica la coherencia de los documentos de la Etapa 2:
#  1. las 98 funciones de la versión original (anexo del Documento 3 de la Etapa 1) tienen destino en 03-trazabilidad.md
#  2. las 92 reglas del Documento 2 de la Etapa 1 tienen módulo responsable
#  3. todo archivo citado en 01-arquitectura.md y 03-trazabilidad.md existe en el árbol de 02-estructura-carpetas.md
# Uso: python3 verificar-documentos.py   (desde esta carpeta)
import re, sys
E1 = '../../etapa-1/'; E2 = '../'
fallos = []
orig = re.findall(r'^\| `(\w+)` \| (\d+) \|', open(E1 + '03-mapa-dependencias.md').read().split('## 10.')[1], re.M)
traz = open(E2 + '03-trazabilidad.md').read()
destino = dict(re.findall(r'^\| `(\w+)` \| \d+ \| (.+?) \|', traz, re.M))
sin = [n for n, _ in orig if n not in destino]
if sin: fallos.append(f'funciones sin destino: {sin}')
reglas = re.findall(r'^\| (R[A-Z]-\d+) \|', open(E1 + '02-reglas-comerciales.md').read(), re.M)
asignadas = set(re.findall(r'^\| (R[A-Z]-\d+) \|', traz, re.M))
if set(reglas) - asignadas: fallos.append(f'reglas sin módulo: {sorted(set(reglas) - asignadas)}')
arbol = open(E2 + '02-estructura-carpetas.md').read().split('```')[1]
rutas, pila = set(), []
for linea in arbol.splitlines():
    m = re.match(r'^([│ ]*)(?:├── |└── )(\S+)', linea)
    if not m: continue
    pila = pila[:len(m.group(1)) // 4] + [m.group(2).rstrip('/')]
    rutas.add('/'.join(pila))
src = {r[4:] for r in rutas if r.startswith('src/') and r.endswith('.js')}
texto = open(E2 + '01-arquitectura.md').read() + traz
citados = set(re.findall(r'\b((?:core|data|business|operations|services|features|ui)/[\w/-]+\.js)', texto))
for m in re.finditer(r'features/(\w+)/[\w-]+\.js((?:, [\w-]+\.js)+)', texto):
    citados |= {f'features/{m.group(1)}/{f}' for f in re.findall(r'[\w-]+\.js', m.group(2))}
if citados - src: fallos.append(f'archivos citados que no están en el árbol: {sorted(citados - src)}')
print(f'funciones: {len(orig) - len(sin)}/{len(orig)} · reglas: {len(set(reglas) & asignadas)}/{len(set(reglas))} · archivos citados en el árbol: {len(citados & src)}/{len(citados)} · archivos en src/: {len(src)}')
if fallos:
    print('\n'.join(fallos)); sys.exit(1)
print('OK')
