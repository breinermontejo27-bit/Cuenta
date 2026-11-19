// Verifica el contraste (WCAG 2.1) de las combinaciones de color usadas en el sistema de diseño.
// Uso: node contraste.js   · Sale con error si alguna combinación no cumple su mínimo.
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '../prototipo/tokens.css'), 'utf8');
function vars(bloque) { const o = {}; for (const m of bloque.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) o[m[1]] = m[2]; return o; }
const claro = vars(css.split('@media')[0]);
const oscuro = { ...claro, ...vars(css.split(':root[data-tema="oscuro"]')[1].split('}')[0]) };
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
// [texto, fondo, mínimo, uso]
const pares = [
  ['texto', 'superficie', 4.5, 'texto principal'], ['texto', 'fondo', 4.5, 'texto sobre el fondo'],
  ['texto-2', 'superficie', 4.5, 'texto secundario'], ['texto-2', 'fondo', 4.5, 'texto secundario sobre fondo'],
  ['texto-3', 'superficie', 4.5, 'texto terciario'], ['texto-3', 'superficie-2', 4.5, 'ayuda dentro de campos'],
  ['marca', 'superficie', 4.5, 'enlaces y botón secundario'], ['sobre-marca', 'marca', 4.5, 'botón principal'],
  ['marca', 'marca-suave', 4.5, 'insignia informativa'],
  ['positivo', 'superficie', 4.5, 'cifras positivas'], ['positivo', 'positivo-suave', 4.5, 'insignia pagado'],
  ['negativo', 'superficie', 4.5, 'cifras negativas'], ['negativo', 'negativo-suave', 4.5, 'insignia deuda'],
  ['aviso', 'superficie', 4.5, 'texto de aviso'], ['aviso', 'aviso-suave', 4.5, 'banner poco stock'],
  ['borde-campo', 'superficie', 3, 'contorno de campos (WCAG 1.4.11)'], ['borde-campo', 'superficie-2', 3, 'contorno de campos sobre gris'],
  ['marca', 'superficie', 3, 'anillo de foco'], ['marca', 'fondo', 3, 'anillo de foco sobre fondo'],
];
let fallos = 0;
for (const [nombre, t] of [['claro', claro], ['oscuro', oscuro]]) {
  console.log(`\nTema ${nombre}`);
  for (const [a, b, min, uso] of pares) {
    const r = ratio(t[a], t[b]); const ok = r >= min; if (!ok) fallos++;
    console.log(`${ok ? 'OK  ' : 'FALLA'} ${r.toFixed(2).padStart(5)}:1 (mín ${min}) ${a} sobre ${b} · ${uso}`);
  }
}
if (fallos) { console.log(`\n${fallos} combinaciones no cumplen`); process.exit(1); }
console.log('\nTodas las combinaciones cumplen.');
