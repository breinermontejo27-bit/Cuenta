// Genera src/precache-list.js: la lista de archivos que el service worker guarda para funcionar sin conexión
// y una versión calculada a partir de su contenido (si cambia cualquier archivo, cambia la versión).
// Uso: node tools/precache.js            → escribe la lista
//      node tools/precache.js --comprobar → falla si la lista guardada no coincide con los archivos actuales

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(import.meta.url), '..', '..');
const SALIDA = join(RAIZ, 'src', 'precache-list.js');
const CARPETAS = ['assets', 'src', 'styles'];
const SUELTOS = ['index.html', 'manifest.json'];
const EXCLUIR = new Set(['src/precache-list.js']);

function recorrer(carpeta) {
  return readdirSync(carpeta).flatMap((n) => {
    const ruta = join(carpeta, n);
    return statSync(ruta).isDirectory() ? recorrer(ruta) : [ruta];
  });
}

export function calcularLista() {
  const archivos = [
    ...SUELTOS.map((f) => join(RAIZ, f)),
    ...CARPETAS.filter((c) => existsSync(join(RAIZ, c))).flatMap((c) => recorrer(join(RAIZ, c))),
  ].map((f) => relative(RAIZ, f).split(sep).join('/'))
    .filter((f) => !EXCLUIR.has(f) && !f.split('/').some((p) => p.startsWith('.')))
    .sort();
  const hash = createHash('sha256');
  for (const f of archivos) { hash.update(f); hash.update(readFileSync(join(RAIZ, f))); }
  return { version: hash.digest('hex').slice(0, 12), archivos: ['./', ...archivos.map((f) => './' + f)] };
}

export function textoLista({ version, archivos }) {
  return `// GENERADO por tools/precache.js — no editar a mano.\n// Archivos que el service worker guarda para funcionar sin conexión.\nself.ORISMA_PRECACHE = ${JSON.stringify({ version, archivos }, null, 2)};\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const texto = textoLista(calcularLista());
  if (process.argv.includes('--comprobar')) {
    const actual = existsSync(SALIDA) ? readFileSync(SALIDA, 'utf8') : '';
    if (actual !== texto) { console.error('src/precache-list.js está desactualizado. Ejecuta: node tools/precache.js'); process.exit(1); }
    console.log('Lista de precarga al día.');
  } else {
    writeFileSync(SALIDA, texto);
    console.log(`src/precache-list.js escrito (${calcularLista().archivos.length} archivos).`);
  }
}
