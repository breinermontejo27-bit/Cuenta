// Actualización contable (nov-2026), de extremo a extremo en Chromium:
// C. Compras desde Inventario y desde Gastos con el mismo registro contable; las compras no restan utilidad y los
//    gastos operativos sí; stock y costo.
// E. Botón "Estado de resultados" en Reportes › Resumen: ventana, meses anteriores, comparación, mes sin datos,
//    PDF (dos páginas), descargar, compartir e imprimir; y Reportes sigue igual.
// Uso: node tests/e2e/contable.e2e.cjs   (requiere playwright). Datos ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8840, BASE = `http://localhost:${PUERTO}`;
const servidor = http.createServer((q, r) => {
  const rel = decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html';
  fs.readFile(path.join(RAIZ, rel), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(rel)] || 'application/octet-stream' }); r.end(d); });
}).listen(PUERTO);

const resultados = [];
async function caso(nombre, fn) {
  const t = Date.now();
  try { await fn(); resultados.push(['OK', nombre, '', Date.now() - t]); } catch (e) { resultados.push(['FALLA', nombre, e.message.split('\n')[0], Date.now() - t]); }
}
const afirmar = (c, m) => { if (!c) throw new Error(m); };
const ULT = '#capas .velo:last-child';
const hoy = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const mes = hoy.slice(0, 7);
const mesAnt = (() => { const [y, m] = mes.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();
const v = (id, f, t, costo) => ({ id, creadoTs: 1, clienteId: 'c1', clienteNombre: 'Laura', fecha: f, items: [{ productoId: 'p1', nombre: 'Manilla', precio: t, cantidad: 1, costo }], sumaItems: t, subtotal: t, impuesto: 0, total: t, costoTotal: costo, gananciaEstimada: t - costo, metodoPago: 'efectivo', fiado: false, abonos: [] });
const DATOS = {
  cuentas_config: { nombre: 'Tienda Contable', moneda: '$', impuesto: 0, siguienteFolio: 1 },
  cuentas_clientes: [{ id: 'c1', nombre: 'Laura', telefono: '', email: '', direccion: '' }],
  cuentas_inventario: [{ id: 'p1', nombre: 'Manilla', precio: 35000, costo: 15000, stock: 10, categoria: '' }, { id: 'p2', nombre: 'Collar', precio: 90000, costo: 40000, stock: 4, categoria: '' }],
  cuentas_ventas: [v('v1', `${mes}-01`, 100000, 40000), v('v0', `${mesAnt}-10`, 80000, 30000)],
  cuentas_gastos: [{ id: 'g0', tipo: 'general', metodo: 'efectivo', descripcion: 'Arriendo', monto: 20000, fecha: `${mesAnt}-02`, categoria: 'Local' }],
  cuentas_movimientos: [], cuentas_pedidos: [],
};

(async () => {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
  await ctx.addInitScript(() => { window.__impreso = 0; window.print = () => { window.__impreso++; }; });
  const p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', (e) => p.errores.push(e.message));
  await p.goto(BASE + '/index.html');
  await p.evaluate((s) => { localStorage.clear(); for (const [k, x] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(x)); }, DATOS);
  await p.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('orisma'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await p.reload(); await p.waitForSelector('.pestanas');
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  const ir = async (h) => { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(150); };
  const cerrar = () => p.evaluate(() => import('./src/core/navigation.js').then((m) => m.cerrarTodasLasHojas()));
  const estado = () => p.evaluate(() => import('./src/core/state.js').then((m) => ({ gastos: m.coleccion('gastos'), inventario: m.coleccion('inventario') })));
  const ganancia = async () => { await ir('#/reportes/resumen'); await p.click('#contenido [data-grupo="periodo"] [data-valor="mes"]'); return (await p.textContent('#contenido .destacada .val')).trim(); };

  // ================= C. Compras =================
  let gananciaAntes;
  await caso('C1 · la ganancia del mes antes de comprar', async () => { gananciaAntes = await ganancia(); afirmar(gananciaAntes === '$ 60.000,00', gananciaAntes); });
  await caso('C2 · compra desde Inventario (con medio Tarjeta): queda como compra de inventario, con producto y cantidad', async () => {
    await ir('#/inventario/productos');
    await p.click('#contenido .fila[data-id="p1"]');
    await p.click(`${ULT} [data-accion="compra"]`);
    await p.fill(`${ULT} #c_cantidad`, '5'); await p.fill(`${ULT} #c_costo`, '17000');
    await p.click(`${ULT} [data-grupo="medio-compra"] [data-valor="tarjeta"]`);
    await p.click(`${ULT} [data-accion="guardar"]`);
    await p.waitForFunction(() => !document.querySelector('#capas .velo'));
    const g = (await estado()).gastos.find((x) => x.descripcion === 'Compra de inventario: Manilla x5');
    afirmar(g && g.tipo === 'compra' && g.metodo === 'tarjeta' && g.productoId === 'p1' && g.cantidad === 5 && g.monto === 85000 && g.categoria === 'Inventario', JSON.stringify(g));
  });
  await caso('C3 · compra desde Gastos: el registro tiene exactamente los mismos campos que la de Inventario', async () => {
    await p.evaluate(() => import('./src/operations/purchases.js').then((m) => m.comprarDesdeGastos('p2', { cantidad: '2', costoUnitario: '40000', fecha: '', precioNuevo: '90000', margenNuevo: '', metodo: 'efectivo' })));
    const gs = (await estado()).gastos.filter((x) => x.tipo === 'compra');
    afirmar(gs.length === 2 && JSON.stringify(Object.keys(gs[0])) === JSON.stringify(Object.keys(gs[1])), JSON.stringify(gs.map((x) => Object.keys(x))));
  });
  await caso('C4 · las compras no reducen la utilidad', async () => {
    afirmar(await ganancia() === gananciaAntes, 'cambió la ganancia: ' + await ganancia());
  });
  await caso('C5 · un gasto operativo sí reduce la utilidad', async () => {
    await p.evaluate(() => import('./src/operations/expenses.js').then((m) => m.crearGasto({ descripcion: 'Publicidad', monto: '15000', fecha: '', categoria: 'Publicidad', metodo: 'efectivo' })));
    afirmar(await ganancia() === '$ 45.000,00', await ganancia());
  });
  await caso('C6 · stock y costo promedio actualizados; la compra aparece en el historial del producto', async () => {
    const p1 = (await estado()).inventario.find((x) => x.id === 'p1');
    afirmar(p1.stock === 15 && Math.abs(p1.costo - (10 * 15000 + 5 * 17000) / 15) < 1e-9, JSON.stringify(p1));
    await ir('#/inventario/productos'); await p.click('#contenido .fila[data-id="p1"]');
    afirmar((await p.textContent(ULT)).includes('5 unid.'), 'la compra no aparece en el historial de compras del producto');
    await cerrar();
  });

  // ================= E. Estado de resultados =================
  await caso('E1 · el botón está en Reportes › Resumen y abre la ventana con el mes actual y el mes de comparación', async () => {
    await ir('#/reportes/resumen');
    afirmar(await p.locator('#contenido [data-sub]').count() === 3, 'cambiaron las subvistas');
    await p.click('#contenido [data-accion="estado-resultados"]');
    await p.waitForSelector(`${ULT} #er_mes`);
    afirmar((await p.textContent(`${ULT} .hoja-cabecera`)).includes('Estado de resultados'), 'título');
    afirmar(await p.inputValue(`${ULT} #er_mes`) === mes, 'mes por defecto');
    const t = await p.textContent(`${ULT} [data-zona="periodo"]`);
    afirmar(/Período analizado/.test(t) && /Se compara con/.test(t), t);
    afirmar(await p.isVisible(`${ULT} [data-accion="generar"]`), 'falta "Generar estado de resultados"');
  });
  await caso('E2 · se puede elegir un mes anterior: cambia el período y el mes de comparación', async () => {
    await p.fill(`${ULT} #er_mes`, mesAnt); await p.dispatchEvent(`${ULT} #er_mes`, 'input');
    const t = await p.textContent(`${ULT} [data-zona="periodo"]`);
    const nombre = new Date(mesAnt + '-15T12:00:00').toLocaleDateString('es', { month: 'long' });
    afirmar(t.toLowerCase().includes(nombre), t);
    await p.click(`${ULT} [data-accion="generar"]`);
    await p.waitForSelector(`${ULT} .documento.er`);
    const d = await p.textContent(`${ULT} #zonaImpresion`);
    afirmar(d.includes('$ 80.000,00') && d.includes('$ 30.000,00') && d.includes('$ 50.000,00'), 'cifras del mes anterior: ' + d.slice(0, 400));
    await cerrar();
  });
  await caso('E3 · mes actual: resultados, compras aparte y comparación correcta con el mes anterior', async () => {
    const r = await p.evaluate(async (m) => {
      const st = await import('./src/core/state.js'); const ac = await import('./src/business/accounting.js');
      return ac.estadoDeResultados({ ventas: st.coleccion('ventas'), gastos: st.coleccion('gastos'), inventario: st.coleccion('inventario'), pedidos: [] }, m, st.obtenerAjustes(), '2099-01-01');
    }, mes);
    afirmar(r.actual.ventas === 100000 && r.actual.costo === 40000 && r.actual.utilidadBruta === 60000 && r.actual.gastosOperativos === 15000 && r.actual.utilidadNeta === 45000, JSON.stringify(r.actual));
    afirmar(r.actual.compras === 165000, 'compras aparte: ' + r.actual.compras);
    afirmar(r.comparacion.ventas.diferencia === 20000 && r.comparacion.ventas.porcentaje === 25 && r.comparacion.utilidadNeta.diferencia === 15000 && r.comparacion.utilidadNeta.porcentaje === 50, JSON.stringify(r.comparacion));
    await ir('#/reportes/resumen'); await p.click('#contenido [data-accion="estado-resultados"]'); await p.click(`${ULT} [data-accion="generar"]`);
    await p.waitForSelector(`${ULT} .documento.er`);
    const d = await p.textContent(`${ULT} #zonaImpresion`);
    afirmar(d.includes('Utilidad neta del período') && d.includes('$ 45.000,00') && d.includes('+25 %') && d.includes('+50 %') && d.includes('$ 165.000,00'), d.slice(0, 500));
  });
  await caso('E4 · descargar PDF: archivo de dos páginas con el nombre del mes', async () => {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click(`${ULT} [data-accion="descargar"]`)]);
    afirmar(dl.suggestedFilename() === `Estado-de-resultados-${mes}.pdf`, dl.suggestedFilename());
    const b = fs.readFileSync(await dl.path());
    const paginas = (b.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
    afirmar(b.slice(0, 5).toString() === '%PDF-' && paginas === 2 && b.length > 20000, `páginas ${paginas}, ${b.length} bytes`);
  });
  await caso('E5 · compartir PDF con "compartir" del teléfono', async () => {
    await p.evaluate(() => { window.__compartido = null; navigator.canShare = () => true; navigator.share = async (d) => { const f = d.files[0]; window.__compartido = { nombre: f.name, tipo: f.type, tam: f.size, texto: d.text }; }; });
    await p.click(`${ULT} [data-accion="compartir"]`);
    await p.waitForFunction(() => window.__compartido, null, { timeout: 20000 });
    const c = await p.evaluate(() => window.__compartido);
    afirmar(c.nombre === `Estado-de-resultados-${mes}.pdf` && c.tipo === 'application/pdf' && c.tam > 20000 && c.texto.includes('Tienda Contable'), JSON.stringify(c));
  });
  await caso('E6 · sin "compartir" en el teléfono, descarga el PDF', async () => {
    await p.evaluate(() => { delete navigator.share; navigator.canShare = undefined; });
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click(`${ULT} [data-accion="compartir"]`)]);
    afirmar(dl.suggestedFilename().endsWith('.pdf'), dl.suggestedFilename());
  });
  await caso('E7 · imprimir: abre el diálogo; se imprimen las dos hojas con sus colores y sin la app', async () => {
    await p.click(`${ULT} [data-accion="imprimir"]`);
    afirmar(await p.evaluate(() => window.__impreso) === 1, 'no llamó a imprimir');
    await p.emulateMedia({ media: 'print' });
    const r = await p.evaluate(() => {
      const hojas = [...document.querySelectorAll('#zonaImpresion .documento')];
      const vis = (e) => !!e && e.offsetParent !== null && e.getBoundingClientRect().height > 0;
      return { hojas: hojas.filter(vis).length, salto: getComputedStyle(hojas[1]).breakBefore, colores: getComputedStyle(hojas[0].querySelector('.er-neto')).printColorAdjust, app: [...document.querySelectorAll('.barra-sup, .pestanas, #capas .hoja-pie')].filter(vis).length };
    });
    await p.emulateMedia({ media: 'screen' });
    afirmar(r.hojas === 2 && r.salto === 'page' && r.colores === 'exact' && r.app === 0, JSON.stringify(r));
    await cerrar();
  });
  await caso('E8 · un mes cuyo anterior no tiene datos: lo indica y no muestra porcentajes', async () => {
    await ir('#/reportes/resumen'); await p.click('#contenido [data-accion="estado-resultados"]');
    await p.fill(`${ULT} #er_mes`, mesAnt); await p.click(`${ULT} [data-accion="generar"]`);
    await p.waitForSelector(`${ULT} .documento.er`);
    const t = await p.textContent(`${ULT} .er-comparacion`);
    afirmar((await p.textContent(`${ULT} #zonaImpresion`)).includes('no hay con qué comparar') && !/%/.test(t), t.slice(0, 300));
    await cerrar();
  });
  await caso('E9 · Reportes sigue igual: Resumen, Caja y Flujo se dibujan sin errores', async () => {
    for (const h of ['#/reportes/resumen', '#/reportes/caja', '#/reportes/flujo']) await ir(h);
    const anotados = await p.evaluate(() => import('./src/core/errors.js').then((m) => m.erroresRegistrados()));
    afirmar(!anotados.length && !p.errores.length, JSON.stringify(anotados).slice(0, 200) + p.errores.join(' | '));
  });
  await caso('E10 · teléfono angosto (320 px): la ventana y el documento no se salen de la pantalla', async () => {
    await p.setViewportSize({ width: 320, height: 640 });
    await ir('#/reportes/resumen'); await p.click('#contenido [data-accion="estado-resultados"]');
    const a = await p.evaluate(() => document.documentElement.scrollWidth <= 320);
    await p.click(`${ULT} [data-accion="generar"]`); await p.waitForSelector(`${ULT} .documento.er`); await p.waitForTimeout(300);
    const b = await p.evaluate(() => document.documentElement.scrollWidth <= 320 && [...document.querySelectorAll('#capas .hoja-pie .btn')].every((x) => x.getBoundingClientRect().right <= 320));
    afirmar(a && b, `ventana ${a}, documento y botones ${b}`);
  });

  await nav.close();
  servidor.close();
  for (const [e, n, d, ms] of resultados) console.log(`${e.padEnd(5)} ${n} ${d ? '→ ' + d : ''} (${ms} ms)`);
  const ok = resultados.filter((r) => r[0] === 'OK').length;
  console.log(`\n${ok}/${resultados.length} casos correctos`);
  process.exit(ok === resultados.length ? 0 : 1);
})();
