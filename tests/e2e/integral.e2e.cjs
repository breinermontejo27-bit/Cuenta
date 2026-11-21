// Etapa 10 · Pruebas integrales: lo que VE el dueño, pantalla contra pantalla, en la app original (9300dfa) y en
// Orisma con los mismos datos.
// R. Reportes: todas las cifras de Resumen (3 períodos), Caja (día y mes) y Flujo, con 12 conjuntos de datos al azar.
// W. Mensajes de WhatsApp: recordatorio de pedido, encargo, apartado y de deuda; mismo número y mismo texto.
// Uso: node tests/e2e/integral.e2e.cjs   (requiere playwright y git). Datos ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const VIEJO = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-original-'));
execSync(`git -C "${RAIZ}" archive 9300dfa | tar -x -C "${VIEJO}"`);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8820, BASE = `http://localhost:${PUERTO}`;
const servidor = http.createServer((q, r) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  const [raiz, rel] = url.startsWith('/viejo/') ? [VIEJO, url.slice(7)] : [RAIZ, url.slice(1)];
  fs.readFile(path.join(raiz, rel || 'index.html'), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(rel || '.html')] || 'text/html' }); r.end(d); });
}).listen(PUERTO);

const resultados = [];
async function caso(nombre, fn) {
  const t = Date.now();
  try { await fn(); resultados.push(['OK', nombre, '', Date.now() - t]); } catch (e) { resultados.push(['FALLA', nombre, e.message.split('\n')[0], Date.now() - t]); }
}
const afirmar = (c, m) => { if (!c) throw new Error(m); };
const hoy = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

async function abrir(nav, app, datos) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { window.__wa = []; window.open = (u) => { window.__wa.push(String(u)); return null; }; });
  const p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', (e) => p.errores.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto(BASE + (app === 'viejo' ? '/viejo/index.html' : '/index.html'));
  await p.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) if (v !== undefined) localStorage.setItem(k, JSON.stringify(v)); }, datos);
  await p.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('orisma'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await p.reload();
  if (app === 'nuevo') { await p.waitForSelector('#contenido .lista, #contenido .vacio, #contenido .panel-hoy'); await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); }
  else await p.waitForSelector('#listWrap');
  return p;
}

// Todas las cifras de dinero de una zona, como números con signo, ordenadas (el diseño cambió; las cifras no deben).
const cifras = (p, sel) => p.evaluate((sel) => {
  const t = document.querySelector(sel).innerText;
  return (t.match(/-?\s?\$\s?-?[\d.]+,\d{2}/g) || []).map((x) => {
    const neg = x.includes('-');
    const n = Number(x.replace(/[^\d,]/g, '').replace(',', '.'));
    return neg ? -n : n;
  }).sort((a, b) => a - b);
}, sel);
const espera = (p) => p.waitForTimeout(120);

async function reportesOriginal(p) {
  const r = {};
  await p.click('.tab[data-view="reportes"]'); await espera(p);
  for (const per of ['mes', 'anterior', 'todo']) { await p.click(`[data-group="rep"] button[data-val="${per}"]`); await espera(p); r['resumen ' + per] = await cifras(p, '#listWrap'); }
  await p.click('[data-group="vista"] button[data-val="caja"]'); await espera(p);
  await p.click('[data-group="cajamodo"] button[data-val="dia"]'); await espera(p); r['caja día'] = await cifras(p, '#listWrap');
  await p.click('[data-group="cajamodo"] button[data-val="mes"]'); await espera(p); r['caja mes'] = await cifras(p, '#listWrap');
  await p.click('[data-group="vista"] button[data-val="flujo"]'); await espera(p); r.flujo = await cifras(p, '#listWrap');
  return r;
}
async function reportesOrisma(p) {
  const r = {};
  const ir = async (h) => { await p.evaluate((h) => { location.hash = h; }, h); await espera(p); };
  await ir('#/reportes/resumen');
  for (const per of ['mes', 'anterior', 'todo']) { await p.click(`#contenido [data-grupo="periodo"] [data-valor="${per}"]`); await espera(p); r['resumen ' + per] = await cifras(p, '#contenido'); }
  await ir('#/reportes/caja');
  await p.click('#contenido [data-grupo="modo-caja"] [data-valor="dia"]'); await espera(p); r['caja día'] = await cifras(p, '#contenido');
  await p.click('#contenido [data-grupo="modo-caja"] [data-valor="mes"]'); await espera(p); r['caja mes'] = await cifras(p, '#contenido');
  await ir('#/reportes/flujo'); r.flujo = await cifras(p, '#contenido');
  return r;
}
const aLocal = (d) => ({
  cuentas_config: d.config, cuentas_clientes: d.clientes, cuentas_inventario: d.inventario, cuentas_ventas: d.ventas,
  cuentas_gastos: d.gastos, cuentas_movimientos: d.movimientos, cuentas_pedidos: d.pedidos,
});

(async () => {
  const nav = await chromium.launch();
  const { generarDatos, generarEncargos } = await import(path.join(RAIZ, 'tests/business/generador.js'));

  // ================= R. Reportes pantalla contra pantalla =================
  const SEMILLAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (const s of SEMILLAS) {
    await caso(`R · reportes con datos al azar #${s}: Resumen (3 períodos), Caja (día y mes) y Flujo muestran las mismas cifras`, async () => {
      const d = s % 4 === 0 ? { ...generarDatos(s, { hoy }), pedidos: generarEncargos(s, { hoy }).pedidos } : generarDatos(s, { hoy });
      const v = await abrir(nav, 'viejo', aLocal(d));
      const a = await reportesOriginal(v);
      const n = await abrir(nav, 'nuevo', aLocal(d));
      const b = await reportesOrisma(n);
      const dif = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
      afirmar(!dif.length, dif.map((k) => `${k}: original ${JSON.stringify(a[k]).slice(0, 160)} · orisma ${JSON.stringify(b[k]).slice(0, 160)}`).join(' || '));
      afirmar(Object.values(a).some((x) => x.length > 3), 'sin cifras que comparar');
      afirmar(!n.errores.length && !v.errores.length, [...n.errores, ...v.errores].join(' | '));
      await v.context().close(); await n.context().close();
    });
  }

  // ================= B. Búsquedas =================
  // Mismos datos y mismo texto buscado: deben aparecer exactamente los mismos registros (por su identificador).
  const ids = (p, sel) => p.evaluate((sel) => [...new Set([...document.querySelectorAll(sel)].map((e) => e.dataset.id || e.dataset.pid || e.dataset.pendiente || e.dataset.cli))].filter(Boolean).sort(), sel);
  for (const s of [3, 8]) {
    await caso(`B · búsquedas en clientes, productos, ventas, pendientes, facturas y gastos (datos #${s}): mismos resultados`, async () => {
      const d = generarDatos(s, { hoy });
      d.pedidos = d.pedidos.map((x) => ({ ...x, fechaEntrega: x.fechaEntrega || hoy })); // la original oculta pedidos sin fecha (también Orisma)
      const v = await abrir(nav, 'viejo', aLocal(d));
      const n = await abrir(nav, 'nuevo', aLocal(d));
      const vistas = [
        ['clientes', () => v.click('.tab[data-view="clientes"]'), '#/clientes'],
        ['productos', async () => { await v.click('.tab[data-view="inventario"]'); await v.click('[data-group="invsub"] button[data-val="productos"]'); }, '#/inventario/productos'],
        ['ventas', async () => { await v.click('.tab[data-view="ventas"]'); await v.click('[data-group="ventasvista"] button[data-val="ventas"]'); }, '#/ventas/ventas'],
        ['pendientes', async () => { await v.click('.tab[data-view="ventas"]'); await v.click('[data-group="ventasvista"] button[data-val="pedidos"]'); }, '#/ventas/pendientes'],
        ['facturas', () => v.click('.tab[data-view="facturas"]'), '#/facturas'],
        ['gastos', () => v.click('.tab[data-view="gastos"]'), '#/gastos'],
      ];
      const terminos = ['', 'a', 'ana', 'producto 1', 'f1', '00', 'pepe', 'ñ', 'compra', 'zzz'];
      const dif = [];
      let comparados = 0;
      for (const [nombre, abrirV, ruta] of vistas) {
        await abrirV();
        await n.evaluate((h) => { location.hash = h; }, ruta); await n.waitForTimeout(100);
        for (const t of terminos) {
          await v.fill('#searchInput', t); await v.dispatchEvent('#searchInput', 'input');
          await n.fill('#campoBuscar', t);
          await v.waitForTimeout(60); await n.waitForTimeout(60);
          await v.evaluate(() => document.querySelectorAll('#listWrap details').forEach((x) => { x.open = true; }));
          await n.evaluate(() => document.querySelectorAll('#contenido details').forEach((x) => { x.open = true; }));
          const [a, b] = [await ids(v, '#listWrap [data-id], #listWrap [data-pid]'), await ids(n, '#contenido .fila[data-id], #contenido .fila[data-pendiente], #contenido tr[data-id]')];
          comparados += a.length;
          if (JSON.stringify(a) !== JSON.stringify(b)) dif.push(`${nombre} "${t}": original ${a.join(',')} · orisma ${b.join(',')}`);
        }
        await v.fill('#searchInput', ''); await v.dispatchEvent('#searchInput', 'input'); await n.fill('#campoBuscar', '');
      }
      afirmar(!dif.length, dif.slice(0, 4).join(' || '));
      afirmar(comparados > 20, `pocos resultados comparados (${comparados})`);
      await v.context().close(); await n.context().close();
    });
  }

  // ================= W. Mensajes de WhatsApp =================
  const W = {
    cuentas_config: { nombre: 'Tienda Ñ & Cía', moneda: '$', impuesto: 0, siguienteFolio: 5 },
    cuentas_clientes: [{ id: 'c1', nombre: 'Ana Pérez', telefono: '300 111 2233', email: '', direccion: '' }, { id: 'c2', nombre: 'Luis', telefono: '+57 (310) 555-6677', email: '', direccion: '' }],
    cuentas_inventario: [{ id: 'p1', nombre: 'Camisa', precio: 50000, costo: 30000, stock: 10, categoria: '' }],
    cuentas_ventas: [{ id: 'v1', creadoTs: 1, clienteId: 'c2', clienteNombre: 'Luis', fecha: '2026-11-02', items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 2 }], total: 100000, costoTotal: 60000, metodoPago: 'credito', fiado: true, abonos: [{ id: 'a1', fecha: '2026-11-02', monto: 12345.5, metodo: 'efectivo', nota: '' }] }],
    cuentas_gastos: [], cuentas_movimientos: [],
    cuentas_pedidos: [
      { id: 'pd1', tipo: 'pedido', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana Pérez', fechaEntrega: '2026-12-24', anticipo: 10000, anticipoMetodo: 'efectivo', fechaAnticipo: '2026-11-01', descuentoPct: 0, abonos: [], items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 1 }], notas: '', creadoTs: 1 },
      { id: 'pd2', tipo: 'encargo', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana Pérez', fechaEntrega: '', anticipo: 0, descuentoPct: 0, abonos: [], items: [{ productoId: null, nombre: 'Gorra', precio: 20000, cantidad: 1 }], notas: '', creadoTs: 2 },
      { id: 'pd3', tipo: 'apartado', estado: 'pendiente', clienteId: 'c2', clienteNombre: 'Luis', fechaEntrega: '', anticipo: 5000, anticipoMetodo: 'efectivo', fechaAnticipo: '2026-11-01', descuentoPct: 0, abonos: [], items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 1 }], notas: '', creadoTs: 3 },
      { id: 'pd4', tipo: 'pedido', estado: 'pendiente', clienteId: 'c2', clienteNombre: 'Luis', fechaEntrega: hoy, anticipo: 50000, anticipoMetodo: 'tarjeta', fechaAnticipo: '2026-11-01', descuentoPct: 0, abonos: [], items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 1 }], notas: '', creadoTs: 4 },
    ],
  };
  const v = await abrir(nav, 'viejo', W);
  const n = await abrir(nav, 'nuevo', W);
  const ultimo = (p) => p.evaluate(() => window.__wa[window.__wa.length - 1]);
  for (const id of ['pd1', 'pd2', 'pd3', 'pd4']) {
    await caso(`W · recordatorio de ${W.cuentas_pedidos.find((x) => x.id === id).tipo} (${id}): mismo número y mismo texto`, async () => {
      await v.evaluate(() => document.querySelectorAll('.overlay').forEach((x) => x.remove()));
      await v.click('.tab[data-view="ventas"]'); await v.click('[data-group="ventasvista"] button[data-val="pedidos"]');
      await v.evaluate(() => document.querySelectorAll('#listWrap details').forEach((d) => { d.open = true; }));
      await v.click(`#listWrap [data-pid="${id}"]`);
      await v.click('.overlay #pdWa, .overlay #abWa');
      await n.evaluate(() => import('./src/core/navigation.js').then((m) => m.cerrarTodasLasHojas()));
      await n.evaluate(() => { location.hash = '#/ventas/pendientes'; }); await n.waitForTimeout(150);
      await n.evaluate(() => document.querySelectorAll('#contenido details').forEach((d) => { d.open = true; }));
      await n.click(`#contenido .fila[data-pendiente="${id}"]`);
      await n.click('#capas .velo:last-child [data-accion="whatsapp"]');
      const [a, b] = [await ultimo(v), await ultimo(n)];
      afirmar(a && a === b, `original ${decodeURIComponent(a || '')} · orisma ${decodeURIComponent(b || '')}`);
    });
  }
  await caso('W · recordatorio de deuda de un cliente: mismo número y mismo texto (con centavos)', async () => {
    await v.evaluate(() => document.querySelectorAll('.overlay').forEach((x) => x.remove()));
    await v.click('#gearBtn'); await v.click('.row[data-sec="creditos"]'); await v.click('.overlay li[data-cli="c2"]'); await v.click('.overlay #ccWa');
    await n.evaluate(() => import('./src/core/navigation.js').then((m) => m.cerrarTodasLasHojas()));
    await n.evaluate(() => import('./src/core/navigation.js').then((m) => m.pedirHoja('creditos:cliente', { clienteId: 'c2' })));
    await n.click('#capas .velo:last-child [data-accion="whatsapp"]');
    const [a, b] = [await ultimo(v), await ultimo(n)];
    afirmar(a && a === b, `original ${decodeURIComponent(a || '')} · orisma ${decodeURIComponent(b || '')}`);
    afirmar(!n.errores.length, n.errores.join(' | '));
  });
  await v.context().close(); await n.context().close();

  await nav.close();
  servidor.close();
  for (const [e, nombre, d, ms] of resultados) console.log(`${e.padEnd(5)} ${nombre} ${d ? '→ ' + d : ''} (${ms} ms)`);
  const ok = resultados.filter((r) => r[0] === 'OK').length;
  console.log(`\n${ok}/${resultados.length} casos correctos`);
  process.exit(ok === resultados.length ? 0 : 1);
})();
