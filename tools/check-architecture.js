// Verifica las reglas de dependencia entre capas (Etapa 2, §2.2) leyendo los import de src/.
// Uso: node tools/check-architecture.js   · Sale con error y lista las infracciones.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, sep, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(RAIZ, 'src');

// Capa → capas de las que puede importar.
export const PERMITIDO = {
  core: ['core'],
  data: ['core', 'data'],
  business: ['business'],
  operations: ['business', 'data', 'core', 'operations'],
  services: ['core', 'services'],
  features: ['operations', 'business', 'ui', 'services', 'core', 'features'],
  ui: ['core', 'ui'],
  app: ['core', 'data', 'business', 'operations', 'services', 'features', 'ui'],
};

function recorrer(c) {
  return readdirSync(c).flatMap((n) => { const r = join(c, n); return statSync(r).isDirectory() ? recorrer(r) : [r]; });
}
const capaDe = (rel) => (rel.includes('/') ? rel.split('/')[0] : 'app');

export function revisar() {
  const problemas = [];
  const archivos = recorrer(SRC).filter((f) => f.endsWith('.js')).map((f) => relative(SRC, f).split(sep).join('/'));
  for (const rel of archivos) {
    if (rel === 'precache-list.js') continue;
    const texto = readFileSync(join(SRC, rel), 'utf8');
    const capa = capaDe(rel);
    if (!PERMITIDO[capa]) { problemas.push(`${rel}: carpeta desconocida "${capa}"`); continue; }
    if (/\bwindow\.(?:cuentas|ORISMA)\b|\bglobalThis\.\w+\s*=/.test(texto)) problemas.push(`${rel}: crea variables globales`);
    for (const m of texto.matchAll(/^\s*import\s[^'"]*?['"]([^'"]+)['"]/gm)) {
      const destino = m[1];
      if (!destino.startsWith('.')) { problemas.push(`${rel}: importa un paquete externo "${destino}"`); continue; }
      if (!destino.endsWith('.js')) problemas.push(`${rel}: la importación "${destino}" debe terminar en .js`);
      const absoluto = normalize(join(dirname(join(SRC, rel)), destino));
      const destRel = relative(SRC, absoluto).split(sep).join('/');
      if (destRel.startsWith('..')) { problemas.push(`${rel}: importa fuera de src/ (${destino})`); continue; }
      if (!existsSync(absoluto)) problemas.push(`${rel}: importa un archivo que no existe (${destino})`);
      const capaDestino = capaDe(destRel);
      if (!PERMITIDO[capa].includes(capaDestino)) problemas.push(`${rel}: la capa "${capa}" no puede importar de "${capaDestino}" (${destino})`);
      if (capa === 'features' && capaDestino === 'features' && rel.split('/')[1] !== destRel.split('/')[1]) {
        problemas.push(`${rel}: un módulo no puede importar de otro módulo (${destino})`);
      }
    }
  }
  return { archivos: archivos.length, listado: archivos, problemas };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { archivos, problemas } = revisar();
  if (problemas.length) { console.error(`Infracciones de arquitectura (${problemas.length}):\n- ` + problemas.join('\n- ')); process.exit(1); }
  console.log(`Arquitectura correcta: ${archivos} archivos revisados.`);
}
