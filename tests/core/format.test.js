// La capa de formato debe dar exactamente el mismo texto que la versión original (commit 9300dfa).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dinero, fecha, iniciales, folio, numeroDocumento, etiquetaMedio } from '../../src/ui/format.js';
import { escapar } from '../../src/ui/html.js';

// --- Copias literales de la versión original (index.html) ---
const config = { moneda: '$' };
function money(n) { // L494
  const num = Number(n) || 0;
  const abs = Math.abs(num).toFixed(2);
  const [ent, dec] = abs.split('.');
  const grupos = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return config.moneda + ' ' + (num < 0 ? '-' : '') + grupos + ',' + dec;
}
function fmtDate(iso) { // L508
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}
function initials(name) { // L504
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
function escapeHtml(s) { // L501
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

test('dinero() coincide con money() en 20.000 valores', () => {
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const valores = [0, -0, 1, -1, 0.005, 0.015, 1.005, 999.995, 1000, 1234.5, -1234.5, 1e9, 123456789.987, NaN, undefined, null, '', '1500', 'abc', Infinity, -Infinity, 0.1 + 0.2];
  for (let i = 0; i < 20000; i++) valores.push((azar() - 0.3) * 10 ** Math.floor(azar() * 10));
  for (const v of valores) assert.equal(dinero(v, '$'), money(v), `valor ${v}`);
});

test('dinero() usa el símbolo indicado', () => {
  assert.equal(dinero(1234.5, 'COP'), 'COP 1.234,50');
});

test('fecha() coincide con fmtDate() en todos los días de 2025 a 2027', () => {
  for (let d = new Date(2025, 0, 1); d.getFullYear() < 2028; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    assert.equal(fecha(iso), fmtDate(iso));
  }
});

test('iniciales() coincide con initials()', () => {
  for (const n of ['Ana Pérez', '  carlos  ruiz  gómez ', 'Ñandú', '', null, undefined, 'x', 'éclair ñu']) assert.equal(iniciales(n), initials(n));
});

test('escapar() coincide con escapeHtml()', () => {
  for (const s of ['<b>"hola" & \'chao\'</b>', null, undefined, 0, 12.5, '', 'normal']) assert.equal(escapar(s), escapeHtml(s));
});

test('folio y número de documento con 4 dígitos (RG-04)', () => {
  assert.equal(folio(7), 'F-0007');
  assert.equal(folio(12345), 'F-12345');
  assert.equal(numeroDocumento(42), '0042');
});

test('etiquetaMedio() recibe el medio y no la venta (corrige D4-04)', () => {
  assert.equal(etiquetaMedio('tarjeta'), 'Tarjeta');
  assert.equal(etiquetaMedio('credito'), 'A crédito');
  assert.equal(etiquetaMedio('otro'), '');
  assert.equal(etiquetaMedio(undefined), '');
});
