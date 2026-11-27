// Instalación real (día de la publicación): la app anterior "Cuentas" instalada con datos y la copia de prueba ya
// abierta; se publica Orisma en la misma dirección. Comprueba que trae los datos, sin avisos falsos, que retira el caché
// de la app anterior, que funciona sin conexión y que la copia de prueba sigue aparte.
// Uso: node tests/e2e/instalacion.e2e.cjs   (requiere playwright y git). Datos ficticios.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const RAIZ = path.join(__dirname, '..', '..');
const c_VERSION = require('../../package.json').version;
const VIEJO = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-original-'));
execSync(`git -C "${RAIZ}" archive 9300dfa | tar -x -C "${VIEJO}"`);
let R = VIEJO; const NUEVO = RAIZ;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const sv = http.createServer((q, r) => { let rel = decodeURIComponent(q.url.split('?')[0]).slice(1); if (!rel || rel.endsWith('/')) rel += 'index.html'; let raiz = R; if (rel.startsWith('prueba/')) { raiz = RAIZ; rel = rel.slice(7); } fs.readFile(path.join(raiz, rel), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(d); }); }).listen(8890);
const D = { cuentas_config: { nombre: 'Orisma Accesorios', moneda: '$', siguienteFolio: 3 }, cuentas_clientes: [{ id: 'c1', nombre: 'Laura', telefono: '3105556677', email: '', direccion: '' }, { id: 'c2', nombre: 'Andrés', telefono: '', email: '', direccion: '' }],
  cuentas_inventario: [{ id: 'p1', nombre: 'Manilla', precio: 35000, costo: 15000, stock: 10, categoria: '' }], cuentas_ventas: [{ id: 'v1', folio: 2, creadoTs: 1, clienteId: 'c1', clienteNombre: 'Laura', fecha: '2026-11-18', items: [{ productoId: 'p1', nombre: 'Manilla', precio: 35000, cantidad: 2 }], total: 70000, costoTotal: 30000, metodoPago: 'credito', fiado: true, abonos: [{ id: 'a1', fecha: '2026-11-18', monto: 20000, metodo: 'efectivo', nota: '' }] }],
  cuentas_gastos: [], cuentas_movimientos: [], cuentas_pedidos: [] };
let correctos = 0, total = 0;
const ok = (c, m) => { total++; if (!c) { console.log('FALLA', m); process.exitCode = 1; } else { correctos++; console.log('OK   ', m); } };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const err = []; p.on('pageerror', (e) => err.push(e.message));
  // Hoy: app "Cuentas" instalada con datos y la copia de prueba ya abierta alguna vez.
  await p.goto('http://localhost:8890/'); await p.evaluate((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, D);
  await p.reload(); await p.waitForSelector('#listWrap'); await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });
  await p.goto('http://localhost:8890/prueba/'); await p.waitForSelector('.pestanas', { timeout: 15000 });
  await p.evaluate(async () => { const m = await import('./src/operations/clients.js'); await m.guardarCliente(null, { nombre: 'Solo en prueba', telefono: '', email: '', direccion: '' }); });
  const lsAntes = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
  // Se publica Orisma en la dirección principal.
  R = NUEVO;
  await p.goto('http://localhost:8890/'); await p.waitForSelector('.pestanas [data-modulo="inicio"]', { timeout: 15000 }); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => { const st = await import('./src/core/state.js'); const c = await import('./src/core/config.js'); return { version: c.VERSION_APP, clientes: st.coleccion('clientes').map((x) => x.nombre), ventas: st.coleccion('ventas').length, aviso: [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim().slice(0, 70)), prueba: !!document.querySelector('.aviso-prueba'), titulo: document.querySelector('#tituloPantalla').textContent }; });
  ok(r.version === c_VERSION, 'abre Orisma ' + c_VERSION + ' en la dirección principal: ' + r.version);
  ok(JSON.stringify(r.clientes) === '["Laura","Andrés"]' && r.ventas === 1, 'trae los datos de la app anterior (no los de la prueba): ' + JSON.stringify(r.clientes));
  ok(r.aviso.some((t) => t.startsWith('Se trajeron tus datos')) && !r.aviso.some((t) => t.includes('versión nueva')), 'avisa "Se trajeron tus datos" y ningún aviso falso: ' + JSON.stringify(r.aviso));
  ok(!r.prueba && r.titulo === 'Hola, Orisma Accesorios', 'sin franja de prueba; Inicio con el nombre del negocio');
  const lsDespues = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
  ok(lsAntes === lsDespues, 'los datos de la app anterior siguen intactos en el teléfono');
  // El caché de la app anterior se retira al instalarse Orisma o, si el service worker anterior lo volvió a crear en
  // esa primera carga, en el mantenimiento de la siguiente vez que se abre.
  await p.waitForFunction(() => caches.keys().then((k) => k.some((x) => /^orisma-(?!prueba)/.test(x))), null, { timeout: 15000 });
  await p.reload(); await p.waitForSelector('.pestanas [data-modulo="inicio"]', { timeout: 15000 });
  await p.waitForFunction(() => caches.keys().then((k) => !k.includes('cuentas-v3')), null, { timeout: 10000 }).catch(() => {});
  const cajas = await p.evaluate(() => caches.keys());
  ok(!cajas.includes('cuentas-v3') && cajas.some((x) => x.startsWith('orisma-prueba-')), 'retira el caché de la app anterior y conserva el de la prueba: ' + cajas.join(','));
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.pestanas [data-modulo="inicio"]', { timeout: 15000 });
  ok(await p.evaluate(() => import('./src/core/state.js').then((m) => m.coleccion('clientes').length === 2)), 'sin conexión abre Orisma con los datos');
  await p.goto('http://localhost:8890/prueba/'); await p.waitForSelector('.aviso-prueba', { timeout: 15000 });
  ok(await p.evaluate(() => import('./src/core/state.js').then((m) => m.coleccion('clientes').some((c) => c.nombre === 'Solo en prueba'))), 'la copia de prueba sigue aparte, con lo suyo, también sin conexión');
  ok(!err.length, 'sin errores de JavaScript ' + err.join(' | '));
  await b.close(); sv.close();
  console.log(`
${correctos}/${total} casos correctos`);
})();
