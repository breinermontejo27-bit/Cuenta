// Pruebas de ejecución sobre la app ORIGINAL (commit 9300dfa) para confirmar hallazgos de la auditoría.
// Uso: git archive 9300dfa | tar -x -C /tmp/orig && node probes.js /tmp/orig  (requiere playwright)
// Todos los datos son ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = process.argv[2];
const srv = http.createServer((q, r) => {
  const p = path.join(DIR, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); r.end(d); });
}).listen(8711);
const URL = 'http://localhost:8711/index.html';
const hoy = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
const base = () => ({
  cuentas_config: { nombre: 'Prueba', moneda: '$', impuesto: 0, siguienteFolio: 1 },
  cuentas_clientes: [{ id: 'c1', nombre: 'Ana', telefono: '3001112233', email: '', direccion: '' }],
  cuentas_inventario: [{ id: 'p1', nombre: 'Camisa', precio: 100, costo: 60, stock: 10, categoria: '' }],
  cuentas_ventas: [], cuentas_gastos: [], cuentas_movimientos: [], cuentas_pedidos: [],
});
const results = [];
function rec(id, titulo, ok, detalle) { results.push({ id, titulo, confirmado: ok, detalle }); console.log(`${ok ? 'CONFIRMADO' : 'NO REPRODUCIDO'} ${id}: ${titulo}\n   ${detalle}`); }

async function withPage(seed, fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => { page.__dialogs = (page.__dialogs || []).concat(d.message()); d.accept(); });
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.goto(URL);
  await page.evaluate(s => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, seed);
  await page.reload();
  const ls = k => page.evaluate(k => JSON.parse(localStorage.getItem(k)), k);
  try { await fn(page, ls); } finally { page.__errs = errs; await browser.close(); }
  return errs;
}
const pend = async page => { await page.click('#listWrap [data-group="ventasvista"] button[data-val="pedidos"]'); await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach(d => d.open = true)); };
const tab = (page, v) => page.click(`.tab[data-view="${v}"]`);
const ov = page => page.locator('.overlay').last();
const text = async (page, sel) => (await page.locator(sel).last().innerText()).replace(/\s+/g, ' ');

(async () => {
  // T1: compra desde el formulario del producto
  await withPage(base(), async (page, ls) => {
    await tab(page, 'inventario');
    await page.click('#listWrap li.row[data-id="p1"]');
    await page.click('#compraBtn');
    await page.fill('#c_cantidad', '5'); await page.fill('#c_costo', '60');
    await page.click('#saveCompraBtn');
    const g = (await ls('cuentas_gastos'))[0];
    await tab(page, 'reportes');
    const rep = await text(page, '#listWrap');
    const otros = rep.match(/Otros gastos \$ ([\d.,]+)/);
    await tab(page, 'inventario'); await page.click('#listWrap li.row[data-id="p1"]');
    const hist = await text(page, '.overlay');
    rec('T1', 'La compra registrada desde el producto no queda marcada como compra',
      !g.tipo && !g.productoId,
      `gasto guardado: ${JSON.stringify({ tipo: g.tipo, metodo: g.metodo, productoId: g.productoId, cantidad: g.cantidad, monto: g.monto })}; Reportes "Otros gastos" = ${otros && otros[1]}; historial del producto: "${hist.includes('Aún no hay compras') ? 'sin compras' : 'con compras'}"`);
  });

  // T2: apartado con descuento 10%
  await withPage(base(), async (page, ls) => {
    await tab(page, 'ventas');
    await pend(page);
    await page.click('#fabBtn'); await page.click('.overlay li[data-tipo="apartado"]');
    await page.fill('#pd_nombre', 'Camisa'); await page.fill('#pd_precio', '100'); await page.click('#pd_add');
    await page.fill('#pd_desc', '10');
    const resumenForm = await text(page, '#pdResumen');
    await page.click('#pd_save');
    await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach(d => d.open = true)); await page.click('#listWrap li[data-pid]');
    const det = await text(page, '.overlay');
    // Intentar abonar 90 (total con descuento)
    await page.fill('#ab_monto', '90'); await page.click('#abSave');
    const det2 = await text(page, '.overlay');
    const btnDis = await page.locator('#abEntregar').isDisabled();
    rec('T2', 'Apartado con descuento: el detalle ignora el descuento y exige pagar el total sin descuento',
      det.includes('Total $ 100,00') && btnDis,
      `formulario: "${resumenForm}" | detalle: Total ${det.match(/Total \$ [\d.,]+/)[0]} | tras abonar 90: botón entregar deshabilitado=${btnDis}, "${det2.match(/Saldo pendiente \$ [\d.,]+/)[0]}"`);
  });

  // T3: pedido creado desde el asistente de venta con descuento
  await withPage(base(), async (page, ls) => {
    await tab(page, 'ventas'); await page.click('#fabBtn');
    await page.click('.overlay .pick-row[data-id="c1"]');
    await page.fill('#prodSearch', 'Cam'); await page.click('#prodPickList .pick-row[data-id="p1"]');
    await page.fill('#descuentoInput', '20'); await page.locator('#descuentoInput').dispatchEvent('change');
    const totalWizard = await page.inputValue('#totalInput');
    await page.click('[data-group="tipoop"] button[data-val="pedido"]');
    await page.click('#saveVentaBtn');
    const p = (await ls('cuentas_pedidos'))[0];
    rec('T3', 'El descuento del asistente se pierde al guardar un pedido/encargo/apartado',
      p && !p.descuentoPct,
      `total mostrado en el asistente: ${totalWizard}; pedido guardado: descuentoPct=${p && p.descuentoPct}, items=${JSON.stringify(p && p.items.map(i => i.precio))}`);
  });

  // T4: medio de pago de los abonos en el detalle del apartado
  const s4 = base();
  s4.cuentas_pedidos = [{ id: 'a1', tipo: 'apartado', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana', fechaEntrega: '', creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }], anticipo: 30, abonos: [{ id: 'x', fecha: hoy, monto: 30, metodo: 'tarjeta' }] }];
  await withPage(s4, async (page) => {
    await tab(page, 'ventas');
    await pend(page);
    await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach(d => d.open = true)); await page.click('#listWrap li[data-pid="a1"]');
    const linea = (await page.locator('.overlay .rep-card').nth(1).innerText()).replace(/\s+/g, ' ');
    rec('T4', 'El detalle del apartado no muestra el medio de pago de cada abono',
      !linea.includes('Tarjeta'), `línea del abono: "${linea}" (el abono se hizo con tarjeta)`);
  });

  // T5: eliminar cliente con deuda
  const s5 = base();
  s5.cuentas_ventas = [{ id: 'v1', clienteId: 'c1', clienteNombre: 'Ana', fecha: hoy, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }], total: 100, fiado: true, metodoPago: 'credito', abonos: [], creadoTs: 1 }];
  await withPage(s5, async (page) => {
    await tab(page, 'clientes'); await page.click('#listWrap li[data-id="c1"]');
    await page.click('#deleteBtn');
    const huboConfirm = (page.__dialogs || []).length > 0;
    await page.click('#gearBtn');
    const menu = await text(page, '.overlay');
    await page.click('.row[data-sec="creditos"]');
    const cred = await text(page, '.overlay');
    rec('T5', 'Eliminar un cliente con deuda: sin confirmación y el crédito queda huérfano',
      !huboConfirm && menu.includes('Por cobrar $ 100,00') && cred.includes('Total por cobrar $ 0,00'),
      `pidió confirmación=${huboConfirm}; menú Ajustes: "${menu.match(/Créditos [^◑▦]*?(Por cobrar[^▦]*?|Sin deudas pendientes)(?= ›)/)?.[1]}"; pantalla Créditos: "${cred.match(/Total por cobrar \$ [\d.,]+/)[0]}"`);
  });

  // T6: editar el anticipo de un pedido que ya tiene abonos
  const s6 = base();
  s6.cuentas_pedidos = [{ id: 'pd1', tipo: 'pedido', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana', fechaEntrega: hoy, creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }], anticipo: 30, fechaAnticipo: hoy, abonos: [{ id: 'x', fecha: hoy, monto: 30, metodo: 'efectivo', nota: 'Anticipo' }] }];
  await withPage(s6, async (page, ls) => {
    await tab(page, 'ventas');
    await pend(page);
    await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach(d => d.open = true)); await page.click('#listWrap li[data-pid="pd1"]'); await page.click('#pdEditar');
    await page.fill('#pd_anticipo', '80'); await page.click('#pd_save');
    const p = (await ls('cuentas_pedidos'))[0];
    await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach(d => d.open = true)); await page.click('#listWrap li[data-pid="pd1"]');
    const det = await text(page, '.overlay');
    await page.locator('.overlay').evaluateAll(o => o.forEach(x => x.remove()));
    await tab(page, 'reportes'); await page.click('#listWrap [data-group="vista"] button[data-val="caja"]');
    const caja = await text(page, '#listWrap');
    rec('T6', 'Editar el anticipo de un pedido con abonos deja anticipo y abonos descuadrados',
      p.anticipo === 80 && p.abonos.reduce((s, a) => s + a.monto, 0) === 30,
      `anticipo=${p.anticipo}, suma de abonos=${p.abonos.reduce((s, a) => s + a.monto, 0)}; detalle: "${det.match(/Saldo al entregar \$ [\d.,]+/)[0]}"; caja del día: "${caja.match(/Total ingresos \$ [\d.,]+/)[0]}"`);
  });

  // T7: almacenamiento lleno
  await withPage(base(), async (page, ls) => {
    await page.evaluate(() => { const big = 'x'.repeat(1024 * 1024); try { for (let i = 0; i < 20; i++) localStorage.setItem('r' + i, big); } catch (e) { } const m = 'x'.repeat(10000); try { for (let j = 0; ; j++) localStorage.setItem('f' + j, m); } catch (e) { } try { for (let k = 0; ; k++) localStorage.setItem('g' + k, 'y'); } catch (e) { } });
    await tab(page, 'clientes'); await page.click('#fabBtn');
    await page.fill('#f_nombre', 'Cliente Nuevo'); await page.click('#saveBtn');
    const enPantalla = (await text(page, '#listWrap')).includes('Cliente Nuevo');
    const dialogs = (page.__dialogs || []).length;
    await page.reload();
    const trasRecargar = (await text(page, '#listWrap')).includes('Cliente Nuevo');
    rec('T7', 'Con el almacenamiento lleno, los datos se pierden en silencio',
      enPantalla && !trasRecargar && dialogs === 0,
      `cliente visible tras guardar=${enPantalla}; avisos al usuario=${dialogs}; cliente presente tras recargar=${trasRecargar}`);
  });

  // T8: numeración de comprobantes
  const s8 = base();
  s8.cuentas_pedidos = [{ id: 'a1', tipo: 'apartado', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana', fechaEntrega: '', creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }], anticipo: 30, abonos: [{ id: 'x', fecha: hoy, monto: 30, metodo: 'efectivo' }] }];
  await withPage(s8, async (page, ls) => {
    await tab(page, 'ventas'); await pend(page);
    const nums = [];
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach(d => d.open = true)); await page.click('#listWrap li[data-pid="a1"]'); await page.click('#abComp');
      nums.push((await text(page, '.overlay')).match(/Nº (\d+)/)[1]);
      await page.click('#closeBtn');
    }
    rec('T8', 'Cada vez que se abre un comprobante de abono se consume un número nuevo',
      new Set(nums).size === 3, `números obtenidos al abrir 3 veces el mismo comprobante: ${nums.join(', ')}`);
  });

  // T9: ganancia en reportes con impuesto
  const s9 = base(); s9.cuentas_config.impuesto = 19;
  await withPage(s9, async (page, ls) => {
    await tab(page, 'ventas'); await page.click('#fabBtn');
    await page.click('.overlay .pick-row[data-id="c1"]');
    await page.fill('#prodSearch', 'Cam'); await page.click('#prodPickList .pick-row[data-id="p1"]');
    await page.click('#saveVentaBtn'); await page.click('#cfConfirmar');
    const v = (await ls('cuentas_ventas'))[0];
    await page.click('#laterBtn');
    await tab(page, 'reportes');
    const g = (await text(page, '#listWrap')).match(/Ganancia de este mes \$ ([\d.,]+)/)[1];
    rec('T9', 'La ganancia de Reportes incluye el impuesto cobrado; la de la venta no',
      g === '59,00' && v.gananciaEstimada === 40,
      `venta: total=${v.total}, impuesto=${v.impuesto}, costo=${v.costoTotal}, gananciaEstimada=${v.gananciaEstimada}; Reportes "Ganancia de este mes" = ${g}`);
  });

  // T10: respaldo manipulado ejecuta código (XSS)
  await withPage(base(), async (page) => {
    const evil = { app: 'cuentas', version: 2, datos: { clientes: [], inventario: [], ventas: [], gastos: [], config: { logo: 'x" onerror="window.__xss=1' } } };
    const f = path.join(require('os').tmpdir(), 'evil.json'); fs.writeFileSync(f, JSON.stringify(evil));
    await page.click('#gearBtn'); await page.click('.row[data-sec="respaldo"]');
    await page.setInputFiles('#resFile', f); await page.click('#resSi');
    await page.waitForTimeout(300);
    const xss = await page.evaluate(() => window.__xss === 1);
    rec('T10', 'Un respaldo manipulado puede ejecutar código al restaurarse', xss, `window.__xss tras restaurar = ${xss}`);
  });

  // T11: anular una venta que vino de un pedido con anticipo
  const s11 = base();
  s11.cuentas_pedidos = [{ id: 'pd1', tipo: 'pedido', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana', fechaEntrega: hoy, creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }], anticipo: 40, fechaAnticipo: hoy, abonos: [{ id: 'x', fecha: hoy, monto: 40, metodo: 'efectivo', nota: 'Anticipo' }] }];
  await withPage(s11, async (page, ls) => {
    await tab(page, 'ventas'); await pend(page);
    await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach(d => d.open = true)); await page.click('#listWrap li[data-pid="pd1"]'); await page.click('#pdEntregar');
    await page.click('[data-group="pdpago"] button[data-val="credito"]'); await page.click('#pdSi');
    await tab(page, 'reportes'); await page.click('#listWrap [data-group="vista"] button[data-val="caja"]');
    const antes = (await text(page, '#listWrap')).match(/Total ingresos \$ [\d.,]+/)[0];
    await tab(page, 'ventas'); await page.click('#listWrap [data-group="ventasvista"] button[data-val="ventas"]');
    await page.click('#listWrap li.row'); await page.click('#deleteVentaBtn'); await page.click('#anSi');
    await tab(page, 'reportes'); await page.click('#listWrap [data-group="vista"] button[data-val="caja"]');
    const despues = (await text(page, '#listWrap')).match(/Total ingresos \$ [\d.,]+/)[0];
    const ped = (await ls('cuentas_pedidos'))[0]; const gastos = await ls('cuentas_gastos');
    rec('T11', 'Anular una venta borra de la caja el dinero ya recibido, sin registrar devolución',
      antes !== despues && gastos.length === 0,
      `caja del día antes: "${antes}", después: "${despues}"; gastos de devolución=${gastos.length}; estado del pedido=${ped.estado}`);
  });

  // T12: entrega con stock reservado para otro pedido
  const s12 = base(); s12.cuentas_inventario[0].stock = 1;
  s12.cuentas_pedidos = [
    { id: 'pA', tipo: 'pedido', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana', fechaEntrega: hoy, creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }], anticipo: 0, abonos: [] },
  ];
  await withPage(s12, async (page, ls) => {
    // vender esa única unidad reservada desde el asistente debe bloquearse
    await tab(page, 'ventas'); await page.click('#fabBtn'); await page.click('.overlay .pick-row[data-id="c1"]');
    await page.fill('#prodSearch', 'Cam'); await page.click('#prodPickList .pick-row[data-id="p1"]');
    const bloqueo = (page.__dialogs || []).slice(-1)[0] || '';
    rec('T12', 'La reserva de pedidos bloquea la venta de unidades reservadas (regla confirmada, no error)',
      /reservad/.test(bloqueo), `mensaje: "${bloqueo}"`);
  });

  // T13: validaciones mínimas en gastos
  await withPage(base(), async (page, ls) => {
    await tab(page, 'gastos'); await page.click('#fabBtn');
    await page.fill('#f_desc', 'Prueba'); await page.fill('#f_monto', '-500'); await page.click('#saveBtn');
    const g = (await ls('cuentas_gastos'))[0];
    await page.click('#listWrap li.row'); await page.click('#deleteBtn');
    const quedan = (await ls('cuentas_gastos')).length;
    rec('T13', 'Gastos: acepta montos negativos y se eliminan sin confirmación',
      g && g.monto === -500 && quedan === 0 && !(page.__dialogs || []).length, `monto guardado=${g && g.monto}; gastos tras tocar Eliminar=${quedan}`);
  });

  // T14: restauración no reemplaza toda la configuración
  const s14 = base(); s14.cuentas_config.firmaImg = 'data:image/png;base64,AAAA'; s14.cuentas_config.tengaTexto = 'Texto viejo';
  await withPage(s14, async (page, ls) => {
    const bk = { app: 'cuentas', version: 2, datos: { clientes: [], inventario: [], ventas: [], gastos: [], config: { nombre: 'Otro negocio' } } };
    const f = path.join(require('os').tmpdir(), 'bk.json'); fs.writeFileSync(f, JSON.stringify(bk));
    await page.click('#gearBtn'); await page.click('.row[data-sec="respaldo"]');
    await page.setInputFiles('#resFile', f); await page.click('#resSi');
    const c = await ls('cuentas_config');
    rec('T14', 'Restaurar un respaldo mezcla la configuración en vez de reemplazarla',
      c.nombre === 'Otro negocio' && c.tengaTexto === 'Texto viejo', `tras restaurar: nombre="${c.nombre}", tengaTexto="${c.tengaTexto}", firma conservada=${!!c.firmaImg}`);
  });

  // T15: funcionamiento sin conexión (service worker)
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await page.goto(URL);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await ctx.setOffline(true);
    let ok = true; try { await page.reload(); await page.waitForSelector('nav.tabbar', { timeout: 5000 }); } catch (e) { ok = false; }
    // PDF sin conexión
    let pdfMsg = '';
    if (ok) {
      await page.evaluate(() => { localStorage.setItem('cuentas_clientes', JSON.stringify([{ id: 'c1', nombre: 'Ana', telefono: '3001112233' }])); localStorage.setItem('cuentas_ventas', JSON.stringify([{ id: 'v1', folio: 1, clienteId: 'c1', clienteNombre: 'Ana', fecha: '2026-01-01', items: [{ nombre: 'X', cantidad: 1, precio: 10 }], total: 10, abonos: [] }])); });
      await page.reload();
      page.on('dialog', d => { pdfMsg = d.message(); d.accept(); });
      await page.click('.tab[data-view="facturas"]'); await page.click('#listWrap li.row'); await page.click('#pdfWaBtn');
      await page.waitForTimeout(1500);
    }
    rec('T15', 'Sin conexión: la app abre; el PDF depende de librerías externas',
      ok && /PDF/.test(pdfMsg), `la app abre sin conexión=${ok}; al compartir PDF sin conexión: "${pdfMsg}"`);
    await browser.close();
  }


  // R1: venta a crédito con abono inicial + abono posterior + liquidación
  await withPage(base(), async (page, ls) => {
    await tab(page, 'ventas'); await page.click('#fabBtn'); await page.click('.overlay .pick-row[data-id="c1"]');
    await page.fill('#prodSearch', 'Cam'); await page.click('#prodPickList .pick-row[data-id="p1"]');
    await page.locator('.overlay .qtyPlus').click();
    await page.click('[data-group="pago"] button[data-val="credito"]');
    await page.fill('#f_abonoIni', '50');
    await page.click('#saveVentaBtn'); await page.click('#cfConfirmar'); await page.click('#laterBtn');
    let v = (await ls('cuentas_ventas'))[0]; const stock = (await ls('cuentas_inventario'))[0].stock;
    await tab(page, 'clientes'); await page.click('#listWrap li[data-id="c1"]');
    await page.click('.overlay [data-abonar]'); await page.fill('#ab_monto', '70'); await page.click('#abSave');
    v = (await ls('cuentas_ventas'))[0];
    const tras70 = v.abonos.map(a => a.monto);
    await page.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.remove()));
    await page.click('#gearBtn'); await page.click('.row[data-sec="creditos"]'); await page.click('.overlay li[data-cli="c1"]');
    await page.click('#ccLiquidar'); await page.click('[data-group="liq"] button[data-val="tarjeta"]'); await page.click('#ccSi');
    v = (await ls('cuentas_ventas'))[0];
    const abon = v.abonos.map(a => `${a.monto}/${a.metodo}`);
    rec('R1', 'Crédito: abono inicial, abono posterior y liquidación',
      v.fiado === true && v.metodoPago === 'credito' && stock === 8 && abon.join() === '50/efectivo,70/efectivo,80/tarjeta',
      `total=${v.total}, stock 10→${stock}, abonos tras abono de 70: ${tras70.join('+')}; tras liquidar con tarjeta: ${abon.join(', ')} (saldo ${v.total - v.abonos.reduce((s, a) => s + a.monto, 0)})`);
  });

  // R2: pago mixto incompleto → queda saldo a crédito
  await withPage(base(), async (page, ls) => {
    await tab(page, 'ventas'); await page.click('#fabBtn'); await page.click('.overlay .pick-row[data-id="c1"]');
    await page.fill('#prodSearch', 'Cam'); await page.click('#prodPickList .pick-row[data-id="p1"]');
    await page.click('[data-group="pago"] button[data-val="mixto"]');
    await page.fill('#f_efectivo', '30'); await page.fill('#f_tarjeta', '50');
    await page.click('#saveVentaBtn'); await page.click('#cfConfirmar'); await page.click('#laterBtn');
    const v = (await ls('cuentas_ventas'))[0];
    rec('R2', 'Pago mixto que no cubre el total deja el resto como crédito',
      v.fiado === true && v.metodoPago === 'mixto' && v.abonos.length === 2,
      `total=${v.total}, fiado=${v.fiado}, metodoPago=${v.metodoPago}, abonos=${v.abonos.map(a => a.monto + '/' + a.metodo).join(', ')}`);
  });

  // R3: generar factura asigna folio consecutivo una sola vez
  const s3r = base();
  s3r.cuentas_config.siguienteFolio = 7;
  s3r.cuentas_ventas = [{ id: 'v1', clienteId: 'c1', clienteNombre: 'Ana', fecha: hoy, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }], total: 100, abonos: [{ id: 'a', fecha: hoy, monto: 100, metodo: 'efectivo' }], creadoTs: 1 }];
  await withPage(s3r, async (page, ls) => {
    await tab(page, 'facturas'); await page.click('#fabBtn'); await page.click('.overlay .pick-row[data-id="v1"]');
    await page.click('#closeBtn');
    await tab(page, 'ventas'); await page.click('#listWrap li[data-id="v1"]'); await page.click('#closeBtn');
    const v = (await ls('cuentas_ventas'))[0]; const c = await ls('cuentas_config');
    rec('R3', 'Generar factura asigna el siguiente folio y no lo vuelve a cambiar',
      v.folio === 7 && c.siguienteFolio === 8, `folio=${v.folio}, siguienteFolio=${c.siguienteFolio}`);
  });

  // R4: cancelar pedido con anticipo registra devolución como gasto por medio de pago
  const s4r = base();
  s4r.cuentas_pedidos = [{ id: 'pd1', tipo: 'pedido', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana', fechaEntrega: hoy, creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }], anticipo: 50, abonos: [{ id: 'x', fecha: hoy, monto: 20, metodo: 'efectivo' }, { id: 'y', fecha: hoy, monto: 30, metodo: 'tarjeta' }] }];
  await withPage(s4r, async (page, ls) => {
    await tab(page, 'ventas'); await pend(page);
    await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach(d => d.open = true)); await page.click('#listWrap li[data-pid="pd1"]');
    await page.click('#pdCancelar'); await page.click('#ccSi');
    const g = await ls('cuentas_gastos'); const p = (await ls('cuentas_pedidos'))[0];
    rec('R4', 'Cancelar un pedido con abonos registra la devolución como gasto, separado por medio',
      p.estado === 'cancelado' && g.length === 2, `estado=${p.estado}; gastos=${g.map(x => x.monto + '/' + x.metodo + '/' + x.categoria).join(', ')}`);
  });

  // R5: compra desde Gastos recalcula costo promedio ponderado y stock
  await withPage(base(), async (page, ls) => {
    await tab(page, 'gastos'); await page.click('#fabBtn'); await page.click('.overlay .chip[data-tipo="compra"]');
    await page.fill('#prodSearchG', 'Cam'); await page.click('#prodPickListG .pick-row[data-id="p1"]');
    await page.fill('#c_cantidad', '10'); await page.fill('#c_costo', '80');
    await page.click('#saveBtn');
    const p = (await ls('cuentas_inventario'))[0]; const g = (await ls('cuentas_gastos'))[0];
    rec('R5', 'Compra desde Gastos: costo promedio ponderado, stock y gasto tipo compra',
      p.stock === 20 && p.costo === 70 && g.tipo === 'compra' && g.monto === 800,
      `stock 10→${p.stock}; costo 60→${p.costo} ((10×60+10×80)/20); precio=${p.precio}, margen=${p.margen}; gasto=${JSON.stringify({ tipo: g.tipo, monto: g.monto, cantidad: g.cantidad, productoId: g.productoId })}`);
  });

  srv.close();
  fs.writeFileSync(path.join(__dirname, 'resultados-pruebas.json'), JSON.stringify(results, null, 1));
})();
