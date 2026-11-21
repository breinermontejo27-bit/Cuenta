// El oráculo (original/funciones-originales.js) debe ser una copia LITERAL de la versión original (commit 9300dfa).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { FUNCIONES } from './original/funciones-originales.js';

test('cada función del oráculo es idéntica a la de la versión original', (t) => {
  let original;
  try { original = execSync('git show 9300dfa:index.html', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (_) { t.skip('git o el commit 9300dfa no están disponibles'); return; }
  const oraculo = readFileSync(new URL('./original/funciones-originales.js', import.meta.url), 'utf8');
  for (const nombre of FUNCIONES) {
    const m = oraculo.match(new RegExp(`// ${nombre} · index\\.html L(\\d+)\\n  (function ${nombre}\\([\\s\\S]*?)\\n\\n  // `)) || oraculo.match(new RegExp(`// ${nombre} · index\\.html L(\\d+)\\n  (function ${nombre}\\([\\s\\S]*?)\\n\\n  return \\{`));
    assert.ok(m, `no se encontró ${nombre} en el oráculo`);
    assert.ok(original.includes(m[2]), `${nombre} no es una copia literal`);
    assert.ok(original.split('\n')[Number(m[1]) - 1].includes(`function ${nombre}(`), `${nombre}: la línea L${m[1]} no corresponde`);
  }
});
