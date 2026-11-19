// Recorrido comparativo: abre dos versiones de la app con los mismos datos ficticios, recorre
// pestañas, sub-vistas, filas, botón + y ajustes, y compara el HTML de cada paso.
// Uso: node recorrido.js <carpeta-version-A> <carpeta-version-B>
// Recorre la app (original vs reestructurada) y compara el HTML de cada paso.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

function serve(dir, port) {
  return new Promise(res => {
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
    const srv = http.createServer((req, r) => {
      const p = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
      fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
    }).listen(port, () => res(srv));
  });
}

const hoy = new Date(); const iso = d => d.toISOString().slice(0, 10);
const t = iso(hoy); const ayer = iso(new Date(hoy - 864e5)); const man = iso(new Date(+hoy + 864e5 * 3));
const SEED = {
  cuentas_config: { nombre: 'Tienda Prueba', moneda: '$', impuesto: 0, siguienteFolio: 3, telefono: '3001234567' },
  cuentas_clientes: [
    { id: 'c1', nombre: 'Ana Pérez', telefono: '3001112233', email: 'ana@x.co', notas: '' },
    { id: 'c2', nombre: 'Luis Gómez', telefono: '3004445566', email: '', notas: 'VIP' },
  ],
  cuentas_inventario: [
    { id: 'p1', nombre: 'Camisa', precio: 50000, costo: 30000, stock: 10, categoria: 'Ropa', margen: '' },
    { id: 'p2', nombre: 'Gorra', precio: 20000, costo: 8000, stock: 1, categoria: 'Accesorios' },
    { id: 'p3', nombre: 'Servicio', precio: 15000, costo: 0, stock: '', categoria: '' },
  ],
  cuentas_ventas: [
    { id: 'v1', folio: 1, clienteId: 'c1', clienteNombre: 'Ana Pérez', fecha: t, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 2, precioUnit: 50000, costo: 30000 }], total: 100000, metodoPago: 'efectivo', gananciaEstimada: 40000, abonos: [{ id: 'a1', fecha: t, monto: 100000, metodo: 'efectivo' }] },
    { id: 'v2', clienteId: 'c2', clienteNombre: 'Luis Gómez', fecha: ayer, items: [{ productoId: 'p2', nombre: 'Gorra', cantidad: 1, precioUnit: 20000, costo: 8000 }], total: 20000, fiado: true, metodoPago: 'credito', gananciaEstimada: 12000, abonos: [{ id: 'a2', fecha: ayer, monto: 5000, metodo: 'tarjeta' }] },
  ],
  cuentas_gastos: [
    { id: 'g1', tipo: 'general', metodo: 'efectivo', descripcion: 'Arriendo', monto: 300000, fecha: t, categoria: 'Local' },
  ],
  cuentas_movimientos: [
    { id: 'm1', tipo: 'alta', ts: Date.now() - 1e6, productoId: 'p1', productoNombre: 'Camisa', stockNuevo: 12, fecha: ayer },
  ],
  cuentas_pedidos: [
    { id: 'pd1', tipo: 'pedido', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana Pérez', fechaEntrega: man, creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precioUnit: 50000 }], total: 50000, anticipo: 10000, abonos: [{ id: 'ab1', fecha: t, monto: 10000, metodo: 'efectivo' }] },
    { id: 'pd2', tipo: 'apartado', estado: 'pendiente', clienteId: 'c2', clienteNombre: 'Luis Gómez', fechaEntrega: '', creadoTs: 2, items: [{ productoId: 'p2', nombre: 'Gorra', cantidad: 1, precioUnit: 20000 }], total: 20000, anticipo: 0, abonos: [] },
  ],
};

async function run(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.addInitScript(seed => {
    if (!sessionStorage.getItem('seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v)); sessionStorage.setItem('seeded', '1'); }
  }, SEED);
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.goto(url);
  await page.waitForSelector('#listWrap');
  const snaps = [];
  const norm = s => s.replace(/data-(id|aid)="[a-z0-9]{8,}"/g, 'data-$1="X"').replace(/id="[a-z0-9]{10,}"/g, 'id="X"');
  const snap = async label => snaps.push([label, norm(await page.evaluate(() => document.getElementById('app').innerHTML + '\n@@OVERLAYS@@\n' + [...document.querySelectorAll('body > :not(#app):not(script)')].map(e => e.outerHTML).join('\n')))]);
  const closeOverlays = () => page.evaluate(() => document.querySelectorAll('body > :not(#app):not(script)').forEach(e => e.remove()));
  const clickAll = async (sel, label, after) => {
    const n = await page.locator(sel).count();
    for (let i = 0; i < n; i++) {
      await page.locator(sel).nth(i).click({ force: true }).catch(e => errors.push('click ' + sel + ': ' + e.message.split('\n')[0]));
      await page.waitForTimeout(30);
      await snap(`${label} #${i}`);
      if (after) await after();
    }
  };

  for (const view of ['clientes', 'inventario', 'ventas', 'facturas', 'gastos', 'reportes']) {
    await page.click(`.tab[data-view="${view}"]`);
    await snap('tab ' + view);
    // sub-vistas
    for (const g of ['invsub', 'ventasvista', 'rep', 'vista', 'cajamodo']) {
      const n = await page.locator(`#listWrap [data-group="${g}"] button`).count();
      for (let i = 0; i < n; i++) {
        await page.locator(`#listWrap [data-group="${g}"] button`).nth(i).click();
        await snap(`${view} ${g} #${i}`);
        await clickAll('#listWrap li.row', `${view} ${g} #${i} fila`, closeOverlays);
        // sub-grupos anidados (caja modo dentro de reportes)
        const m = await page.locator('#listWrap [data-group="cajamodo"] button').count();
        if (g === 'rep') for (let j = 0; j < m; j++) { await page.locator('#listWrap [data-group="cajamodo"] button').nth(j).click(); await snap(`${view} rep ${i} caja ${j}`); }
      }
    }
    await clickAll('#listWrap li.row', `${view} fila`, closeOverlays);
    if (await page.locator('#fabBtn').isVisible()) {
      await page.click('#fabBtn', { force: true });
      await snap(`${view} fab`);
      // en overlays de selección, abrir la primera opción
      const opt = page.locator('body > :not(#app) li.row');
      if (await opt.count()) { await opt.first().click(); await snap(`${view} fab opcion`); }
      await closeOverlays();
    }
    if (await page.locator('#searchInput').isVisible()) {
      await page.fill('#searchInput', 'a');
      await snap(`${view} buscar`);
      await page.fill('#searchInput', '');
    }
  }
  // ajustes
  await page.click('#gearBtn');
  await snap('ajustes');
  const secs = await page.locator('.row[data-sec]').evaluateAll(els => els.map(e => e.dataset.sec));
  for (const s of secs) {
    await closeOverlays();
    await page.click('#gearBtn');
    await page.click(`.row[data-sec="${s}"]`);
    await snap('ajustes ' + s);
    const save = page.locator('body > :not(#app) .btn-primary').last();
    if (await save.count()) { await save.click({ force: true }); await snap('ajustes guardar ' + s); }
  }
  await closeOverlays();
  // flujo de abono y anulación sobre una venta
  await page.click('.tab[data-view="ventas"]');
  const ls = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
  await browser.close();
  return { snaps, errors, ls };
}

(async () => {
  const [a, b] = await Promise.all([serve(process.argv[2], 8701), serve(process.argv[3], 8702)]);
  const A = await run('http://localhost:8701/index.html');
  const B = await run('http://localhost:8702/index.html');
  a.close(); b.close();
  console.log('pasos:', A.snaps.length, B.snaps.length);
  console.log('errores original:', A.errors);
  console.log('errores nuevo:', B.errors);
  let diffs = 0;
  for (let i = 0; i < Math.max(A.snaps.length, B.snaps.length); i++) {
    const x = A.snaps[i], y = B.snaps[i];
    if (!x || !y || x[0] !== y[0] || x[1] !== y[1]) {
      diffs++;
      if (diffs <= 5) {
        console.log('DIFF en', x && x[0], '/', y && y[0]);
        if (x && y) { let k = 0; while (x[1][k] === y[1][k]) k++; console.log(" orig:", JSON.stringify(x[1].slice(k - 30, k + 60))); console.log(" new :", JSON.stringify(y[1].slice(k - 30, k + 60))); }
      }
    }
  }
  console.log('localStorage final igual:', A.ls === B.ls);
  console.log(diffs ? `${diffs} pasos distintos` : 'TODOS LOS PASOS IDÉNTICOS');
})();
