// Pruebas diferenciales en navegador: se opera la app ORIGINAL (commit 9300dfa) con clics reales y se compara lo que
// guarda con lo que calculan las reglas de src/business/ con las mismas entradas. Cubre la lógica que en la versión
// original vive dentro de botones y formularios (no se puede copiar como función suelta).
// Uso: node tests/e2e/reglas.e2e.cjs   (requiere playwright y git). Datos ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const VIEJO = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-original-'));
execSync(`git -C "${RAIZ}" archive 9300dfa | tar -x -C "${VIEJO}"`);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8760, BASE = `http://localhost:${PUERTO}`;
const servidor = http.createServer((q, r) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  const [raiz, rel] = url.startsWith('/viejo/') ? [VIEJO, url.slice(7)] : [RAIZ, url.slice(1)];
  fs.readFile(path.join(raiz, rel || 'index.html'), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(rel)] || 'text/html' }); r.end(d); });
}).listen(PUERTO);

let semilla = 12345;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
const entero = (a, b) => a + Math.floor(azar() * (b - a + 1));
const elegir = (l) => l[Math.floor(azar() * l.length)];

const resultados = [];
async function caso(nombre, fn) {
  try { await fn(); resultados.push(['OK', nombre]); } catch (e) { resultados.push(['FALLA', nombre, e.message.slice(0, 1500)]); }
}
const afirmarIgual = (a, b, msg) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg}\n nueva:    ${x.slice(0, 600)}\n original: ${y.slice(0, 600)}`); };
// Los códigos generados (ids, marcas de tiempo y referencias a un producto recién creado) son aleatorios: se igualan.
const SEMBRADOS = new Set(['p1', 'p2', 'p3', 'p4', 'c1', 'c2']);
const normalizar = (o) => JSON.parse(JSON.stringify(o, (k, v) => {
  if ((k === 'id' || k === 'creadoTs' || k === 'ts') && typeof v !== 'object') return '·';
  if ((k === 'productoId' || k === 'clienteId') && typeof v === 'string' && !SEMBRADOS.has(v)) return '·nuevo';
  return v;
}));

const BASEDATOS = (imp = 0) => ({
  cuentas_config: { nombre: 'Prueba', moneda: '$', impuesto: imp, siguienteFolio: 41, stockMinimo: 3, siguienteComprobante: 3 },
  cuentas_clientes: [{ id: 'c1', nombre: 'Ana Pérez', telefono: '3001112233', email: 'ana@x.co', direccion: 'Calle 1' }, { id: 'c2', nombre: 'Luis', telefono: '', email: '', direccion: '' }],
  cuentas_inventario: [
    { id: 'p1', nombre: 'Camisa', precio: 50000, costo: 30000, stock: 20, categoria: 'Ropa', margen: 67 },
    { id: 'p2', nombre: 'Gorra', precio: 20000, costo: 8000, stock: 9, categoria: '' },
    { id: 'p3', nombre: 'Servicio', precio: 15000, costo: 0, stock: '', categoria: '' },
    { id: 'p4', nombre: 'Hilo', precio: 3000, costo: 1250, stock: 50, categoria: 'Materiales', margen: 140 },
  ],
  cuentas_ventas: [], cuentas_gastos: [], cuentas_movimientos: [], cuentas_pedidos: [],
});

async function nuevaPagina(nav, datos) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  page.avisos = [];
  page.on('dialog', (d) => { page.avisos.push(d.message()); d.accept(); });
  page.on('pageerror', (e) => page.avisos.push('ERROR ' + e.message));
  await page.goto(BASE + '/viejo/index.html');
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, datos);
  await page.reload();
  return page;
}
const ls = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, JSON.parse(localStorage.getItem(k))])));
const hoyDe = (page) => page.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
// Ejecuta una función con los módulos de reglas cargados en la página (mismo dominio).
const conReglas = (page, fn, arg) => page.evaluate(async ({ fn, arg }) => {
  const R = {
    ventas: await import('/src/business/sales-rules.js'), pagos: await import('/src/business/payments.js'),
    inv: await import('/src/business/inventory-rules.js'), ped: await import('/src/business/orders-rules.js'),
    fac: await import('/src/business/invoicing.js'), gas: await import('/src/business/expenses-rules.js'), cli: await import('/src/business/clients-rules.js'),
  };
  let n = 0; const ctx = { hoy: arg.hoy, ahora: 1, nuevoId: () => 'n' + (++n) };
  return new Function('R', 'ctx', 'arg', `return (${fn})(R, ctx, arg);`)(R, ctx, arg);
}, { fn: fn.toString(), arg });

(async () => {
  const nav = await chromium.launch();

  // ---------- 1. Ventas con el asistente (aleatorias) ----------
  for (let i = 0; i < 30; i++) {
    const imp = elegir([0, 0, 19]);
    const datos = BASEDATOS(imp);
    const medio = elegir(['efectivo', 'tarjeta', 'credito', 'mixto']);
    const plan = { productos: [], edicion: null, descuento: null, medio, montos: {}, cliente: elegir(['c1', 'c2']), notas: azar() < 0.3 ? 'Garantía 1 mes' : '' };
    const usados = new Set();
    for (let k = 0; k < entero(1, 3); k++) { const p = elegir(['p1', 'p2', 'p3', 'p4']); if (usados.has(p)) continue; usados.add(p); plan.productos.push({ id: p, extra: entero(0, 2) }); }
    if (azar() < 0.4) plan.edicion = { idx: 0, precio: entero(5, 60) * 1000 };
    const r = azar();
    if (r < 0.35) plan.descuento = { tipo: 'pct', texto: String(elegir([5, 10, 12.5, 33, 100, 150])) };
    else if (r < 0.6) plan.descuento = { tipo: 'total', factor: elegir([0.5, 0.9, 0.97, 1.2]) };
    await caso(`venta ${i + 1}: ${plan.productos.map((p) => p.id + '×' + (1 + p.extra)).join(' ')}${plan.edicion ? ' precio editado' : ''}${plan.descuento ? ' desc ' + (plan.descuento.texto ? plan.descuento.texto + '%' : 'total×' + plan.descuento.factor) : ''} · ${medio} · impuesto ${imp}%`, async () => {
      const page = await nuevaPagina(nav, datos);
      await page.click('.tab[data-view="ventas"]'); await page.click('#fabBtn');
      await page.click(`.overlay .pick-row[data-id="${plan.cliente}"]`);
      const nombres = { p1: 'Camisa', p2: 'Gorra', p3: 'Servicio', p4: 'Hilo' };
      for (const p of plan.productos) {
        await page.fill('#prodSearch', nombres[p.id]); await page.click(`#prodPickList .pick-row[data-id="${p.id}"]`);
        const idx = plan.productos.indexOf(p);
        for (let e = 0; e < p.extra; e++) await page.click(`.cart-item[data-idx="${idx}"] .qtyPlus`);
      }
      if (plan.edicion) { await page.fill('.cart-item[data-idx="0"] .unit-price', String(plan.edicion.precio)); await page.dispatchEvent('.cart-item[data-idx="0"] .unit-price', 'change'); }
      let textoTotal = null;
      if (plan.descuento && plan.descuento.tipo === 'pct') { await page.fill('#descuentoInput', plan.descuento.texto); await page.dispatchEvent('#descuentoInput', 'change'); }
      if (plan.descuento && plan.descuento.tipo === 'total') {
        const actual = Number(await page.inputValue('#totalInput'));
        textoTotal = String(Math.round(actual * plan.descuento.factor));
        await page.fill('#totalInput', textoTotal); await page.dispatchEvent('#totalInput', 'change');
      }
      if (plan.notas) await page.fill('#f_notas', plan.notas);
      await page.click(`[data-group="pago"] button[data-val="${medio}"]`);
      if (medio === 'credito') { plan.montos = { abonoInicial: entero(0, 3) * 20000, medioAbono: elegir(['efectivo', 'tarjeta']) }; await page.click(`[data-group="abmet"] button[data-val="${plan.montos.medioAbono}"]`); await page.fill('#f_abonoIni', String(plan.montos.abonoInicial)); }
      if (medio === 'mixto') { plan.montos = { efectivo: entero(0, 4) * 15000, tarjeta: entero(0, 4) * 15000 }; await page.fill('#f_efectivo', String(plan.montos.efectivo)); await page.fill('#f_tarjeta', String(plan.montos.tarjeta)); }
      await page.click('#saveVentaBtn'); await page.click('#cfConfirmar'); await page.click('#laterBtn');
      const fin = await ls(page);
      const hoy = await hoyDe(page);
      const calc = await conReglas(page, (R, ctx, a) => {
        const prod = (id) => a.inv.find((p) => p.id === id);
        const carrito = a.plan.productos.map((p) => { const x = prod(p.id); return { productoId: x.id, nombre: x.nombre, precioCatalogo: x.precio, precioUnit: x.precio, costo: Number(x.costo) || 0, cantidad: 1 + p.extra, stockDisponible: x.stock }; });
        if (a.plan.edicion) carrito[0].precioUnit = a.plan.edicion.precio;
        let descuento = { tipo: 'monto', valor: 0 };
        if (a.plan.descuento && a.plan.descuento.tipo === 'pct') descuento = R.ventas.descuentoPorcentaje(a.plan.descuento.texto);
        if (a.textoTotal !== null) { const r = R.ventas.descuentoDesdeTotal(a.textoTotal, descuento, R.ventas.sumaCarrito(carrito), a.imp); if (r.ok) descuento = r.descuento; }
        const venta = R.ventas.construirVenta({ cliente: a.cli, carrito, descuento, impuestoPct: a.imp, notas: a.plan.notas, medio: a.plan.medio, montos: a.plan.montos }, ctx);
        return { venta, inventario: R.inv.descontarStock(a.inv, R.ventas.unidadesDeVenta(venta.items)) };
      }, { hoy, plan, textoTotal, imp, inv: datos.cuentas_inventario, cli: datos.cuentas_clientes.find((c) => c.id === plan.cliente) });
      afirmarIgual(normalizar(calc.venta), normalizar(fin.cuentas_ventas[0]), 'venta distinta');
      afirmarIgual(calc.inventario, fin.cuentas_inventario, 'stock distinto');
      if (page.avisos.some((a) => a.startsWith('ERROR'))) throw new Error(page.avisos.join('|'));
      await page.context().close();
    });
  }

  // ---------- 2. Abono a una venta a crédito y liquidación ----------
  await caso('abonos a crédito (montos dentro y por encima del saldo) y liquidación con tarjeta', async () => {
    const datos = BASEDATOS();
    datos.cuentas_ventas = [
      { id: 'v1', clienteId: 'c1', clienteNombre: 'Ana Pérez', fecha: '2026-11-01', items: [], total: 120000, fiado: true, abonos: [{ id: 'a', fecha: '2026-11-01', monto: 20000, metodo: 'efectivo' }] },
      { id: 'v2', clienteId: 'c1', clienteNombre: 'Ana Pérez', fecha: '2026-11-03', items: [], total: 50000, fiado: true, abonos: [] },
      { id: 'v3', clienteId: 'c2', clienteNombre: 'Luis', fecha: '2026-11-03', items: [], total: 9000, fiado: true, abonos: [] },
    ];
    const page = await nuevaPagina(nav, datos);
    const hoy = await hoyDe(page);
    let esperado = structuredClone(datos.cuentas_ventas);
    for (const [vid, monto, metodo, nota] of [['v1', '30000', 'tarjeta', 'Nequi'], ['v2', '999999', 'efectivo', ''], ['v1', '0', 'efectivo', '']]) {
      await page.click('.tab[data-view="clientes"]'); await page.click('#listWrap li[data-id="c1"]');
      await page.click(`.overlay [data-abonar="${vid}"]`);
      if (!(await page.locator('#ab_monto').count())) { await page.evaluate(() => document.querySelectorAll('.overlay').forEach((o) => o.remove())); continue; }
      await page.fill('#ab_monto', monto); await page.fill('#ab_nota', nota); await page.click(`[data-group="abm"] button[data-val="${metodo}"]`);
      await page.click('#abSave');
      await page.evaluate(() => document.querySelectorAll('.overlay').forEach((o) => o.remove()));
      esperado = await conReglas(page, (R, ctx, a) => a.ventas.map((v) => { if (v.id !== a.vid) return v; const r = R.pagos.abonarVenta(v, { monto: a.monto, fecha: a.hoy, nota: a.nota, metodo: a.metodo }, ctx); return r.ok ? r.venta : v; }), { hoy, ventas: esperado, vid, monto, metodo, nota });
    }
    await page.click('#gearBtn'); await page.click('.row[data-sec="creditos"]'); await page.click('.overlay li[data-cli="c1"]');
    await page.click('#ccLiquidar'); await page.click('[data-group="liq"] button[data-val="tarjeta"]'); await page.click('#ccSi');
    esperado = await conReglas(page, (R, ctx, a) => R.pagos.liquidarDeuda(a.ventas, 'c1', 'tarjeta', ctx), { hoy, ventas: esperado });
    afirmarIgual(normalizar(esperado), normalizar((await ls(page)).cuentas_ventas), 'ventas tras abonos y liquidación');
    await page.context().close();
  });

  // ---------- 3. Compras de inventario ----------
  for (const [cant, costo, precio, margen] of [['5', '40000', '', ''], ['3', '0', '70000', ''], ['10', '12000', '', '25'], ['0', '9000', '', '']]) {
    await caso(`compra desde el producto: ${cant} × ${costo} (precio "${precio}", ganancia "${margen}")`, async () => {
      const page = await nuevaPagina(nav, BASEDATOS());
      await page.click('.tab[data-view="inventario"]'); await page.click('#listWrap li[data-id="p1"]'); await page.click('#compraBtn');
      await page.fill('#c_cantidad', cant); await page.fill('#c_costo', costo);
      if (margen) await page.fill('#c_margenNuevo', margen);
      if (precio) await page.fill('#c_precioNuevo', precio);
      const enviados = { precio: await page.inputValue('#c_precioNuevo'), margen: await page.inputValue('#c_margenNuevo') };
      await page.click('#saveCompraBtn');
      const fin = await ls(page); const hoy = await hoyDe(page);
      const r = await conReglas(page, (R, ctx, a) => R.inv.compraDesdeProducto(a.p, { cantidad: a.cant, costoUnitario: a.costo, fecha: a.hoy, precioNuevo: a.env.precio, margenNuevo: a.env.margen }, ctx), { hoy, p: BASEDATOS().cuentas_inventario[0], cant, costo, env: enviados });
      if (!r.ok) { afirmarIgual(fin.cuentas_gastos, [], 'no debía registrar'); return page.context().close(); }
      afirmarIgual(r.producto, fin.cuentas_inventario[0], 'producto');
      // Desviación autorizada (actualización contable, nov-2026): Orisma agrega tipo, metodo, productoId y cantidad
      // para que la compra no cuente como gasto operativo. El resto del registro sigue idéntico a la original.
      const { tipo, metodo, productoId, cantidad, ...resto } = r.gasto;
      afirmarIgual(normalizar(resto), normalizar(fin.cuentas_gastos[0]), 'gasto (campos de la original)');
      afirmarIgual({ tipo, metodo, productoId, cantidad }, { tipo: 'compra', metodo: 'efectivo', productoId: 'p1', cantidad: Number(cant) }, 'campos contables nuevos');
      // el precio/ganancia que muestra el formulario también se calcula con las reglas
      const nuevoCosto = await conReglas(page, (R, ctx, a) => R.inv.costoPromedio(20, 30000, Number(a.cant), Number(a.costo)), { hoy, cant, costo });
      if (Number(cant) > 0) afirmarIgual(nuevoCosto, fin.cuentas_inventario[0].costo, 'costo promedio');
      await page.context().close();
    });
  }
  for (const [nuevo, cant, costo, precio, metodo] of [[false, '4', '35000', '', 'tarjeta'], [true, '6', '2000', '', 'efectivo'], [true, '2', '5000', '9000', 'efectivo']]) {
    await caso(`compra desde Gastos: ${nuevo ? 'producto nuevo' : 'Gorra'} ${cant} × ${costo} · ${metodo}`, async () => {
      const page = await nuevaPagina(nav, BASEDATOS());
      await page.click('.tab[data-view="gastos"]'); await page.click('#fabBtn'); await page.click('.overlay .chip[data-tipo="compra"]');
      await page.click(`[data-group="gmet"] button[data-val="${metodo}"]`);
      if (nuevo) { await page.click('#nuevoProdBtn'); await page.fill('#f_nuevoNombre', 'Botones'); await page.waitForSelector('#c_cantidad'); }
      else { await page.fill('#prodSearchG', 'Gor'); await page.click('#prodPickListG .pick-row[data-id="p2"]'); }
      await page.fill('#c_cantidad', cant); await page.fill('#c_costo', costo); if (precio) await page.fill('#c_precioNuevo', precio);
      const env = { precio: await page.inputValue('#c_precioNuevo'), margen: await page.inputValue('#c_margenNuevo') };
      await page.click('.overlay #saveBtn');
      const fin = await ls(page); const hoy = await hoyDe(page);
      const r = await conReglas(page, (R, ctx, a) => R.inv.compraDesdeGastos(a.nuevo ? null : a.p, { nombreNuevo: 'Botones', cantidad: a.cant, costoUnitario: a.costo, fecha: a.hoy, precioNuevo: a.env.precio, margenNuevo: a.env.margen, metodo: a.metodo }, ctx), { hoy, nuevo, p: BASEDATOS().cuentas_inventario[1], cant, costo, env, metodo });
      const prodFinal = nuevo ? fin.cuentas_inventario[4] : fin.cuentas_inventario[1];
      afirmarIgual(normalizar(r.producto), normalizar(prodFinal), 'producto');
      afirmarIgual(normalizar(r.gasto), normalizar(fin.cuentas_gastos[0]), 'gasto');
      if (nuevo) afirmarIgual(normalizar(r.movimiento), normalizar(fin.cuentas_movimientos[0]), 'movimiento');
      await page.context().close();
    });
  }

  // ---------- 4. Productos: alta y edición con ajuste de stock ----------
  await caso('producto nuevo y edición con cambio de stock y motivo', async () => {
    const page = await nuevaPagina(nav, BASEDATOS());
    await page.click('.tab[data-view="inventario"]'); await page.click('#fabBtn');
    const f1 = { nombre: '  Aretes  ', categoria: 'Joyería', descripcion: 'Oro 18k', costo: '100000', margen: '', precio: '180000', stock: '3', stockMinimo: '1', sinAlerta: false, foto: '' };
    await page.fill('#f_nombre', f1.nombre); await page.fill('#f_categoria', f1.categoria); await page.fill('#f_descripcion', f1.descripcion);
    await page.fill('#f_costo', f1.costo); await page.fill('#f_precio', f1.precio); await page.fill('#f_stock', f1.stock); await page.fill('#f_umbral', f1.stockMinimo);
    f1.margen = await page.inputValue('#f_margen');
    await page.click('#saveBtn');
    await page.click('#listWrap li[data-id="p2"]');
    const f2 = { nombre: 'Gorra', categoria: '', descripcion: '', costo: '8000', margen: await page.inputValue('#f_margen'), precio: '20000', stock: '4', stockMinimo: '', sinAlerta: true, foto: '', motivo: 'Conteo físico' };
    await page.fill('#f_stock', f2.stock); await page.fill('#f_stockMotivo', f2.motivo); await page.check('#f_sinAlerta');
    await page.click('#saveBtn');
    const fin = await ls(page); const hoy = await hoyDe(page);
    const r = await conReglas(page, (R, ctx, a) => [R.inv.guardarProducto(null, a.f1, ctx), R.inv.guardarProducto(a.p2, a.f2, ctx)], { hoy, f1, f2, p2: BASEDATOS().cuentas_inventario[1] });
    afirmarIgual(normalizar(r[0].producto), normalizar(fin.cuentas_inventario[4]), 'producto nuevo');
    afirmarIgual(normalizar(r[1].producto), normalizar(fin.cuentas_inventario[1]), 'producto editado');
    afirmarIgual(normalizar([r[0].movimiento, r[1].movimiento]), normalizar(fin.cuentas_movimientos), 'movimientos (alta y ajuste)');
    await page.context().close();
  });

  // ---------- 5. Pendientes: crear, editar, abonar, cancelar, entregar ----------
  for (const tipo of ['pedido', 'encargo', 'apartado']) {
    await caso(`${tipo}: crear con anticipo y descuento, abonar (incluido uno mayor que el saldo) y cancelar con devolución`, async () => {
      const page = await nuevaPagina(nav, BASEDATOS(19));
      const hoy = await hoyDe(page);
      await page.click('.tab[data-view="ventas"]'); await page.click('[data-group="ventasvista"] button[data-val="pedidos"]');
      await page.click('#fabBtn'); await page.click(`.overlay li[data-tipo="${tipo}"]`);
      await page.selectOption('#pd_cliente', 'c1');
      await page.fill('#pd_nombre', 'camisa'); await page.fill('#pd_precio', '50000'); await page.fill('#pd_cant', '2'); await page.fill('#pd_car', 'talla M'); await page.click('#pd_add');
      await page.click('#pdAddToggle'); await page.fill('#pd_nombre', 'Arreglo'); await page.fill('#pd_precio', '8000'); await page.fill('#pd_costo', '2000'); await page.click('#pd_add');
      if (tipo !== 'apartado') { await page.fill('#pd_anticipo', '30000'); await page.click('[data-group="pdmet"] button[data-val="tarjeta"]'); }
      await page.fill('#pd_desc', '10'); await page.fill('#pd_notas', 'Llamar antes');
      if (tipo === 'encargo') await page.fill('#pd_fecha', '');
      const form = { fecha: await page.inputValue('#pd_fecha'), anticipo: await page.inputValue('#pd_anticipo'), fechaAnticipo: await page.inputValue('#pd_fechaAnt') };
      await page.click('#pd_save');
      let fin = await ls(page);
      const creado = await conReglas(page, (R, ctx, a) => {
        const i1 = R.ped.itemDeFormulario({ nombre: 'camisa', cantidad: '2', precio: '50000', caracteristicas: 'talla M', costo: '' }, a.inv).item;
        const i2 = R.ped.itemDeFormulario({ nombre: 'Arreglo', cantidad: '1', precio: '8000', caracteristicas: '', costo: '2000' }, a.inv).item;
        return R.ped.guardarPendienteFormulario(null, { tipoNuevo: a.tipo, cliente: a.cli, fecha: a.form.fecha, items: [i1, i2], anticipo: a.form.anticipo, metodoAnticipo: a.tipo === 'apartado' ? 'efectivo' : 'tarjeta', descuentoPct: '10', fechaAnticipo: a.form.fechaAnticipo, notas: 'Llamar antes' }, ctx).pendiente;
      }, { hoy, tipo, form, inv: BASEDATOS().cuentas_inventario, cli: BASEDATOS().cuentas_clientes[0] });
      afirmarIgual(normalizar(creado), normalizar(fin.cuentas_pedidos[0]), 'pendiente creado');
      // abonos
      const p0 = fin.cuentas_pedidos[0];
      let esperado = p0;
      for (const monto of ['20000', '999999', '15000']) {
        await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach((d) => { d.open = true; }));
        await page.click(`#listWrap li[data-pid="${p0.id}"]`);
        const avisosAntes = page.avisos.length;
        if (tipo === 'apartado') { await page.fill('#ab_monto', monto); await page.click('[data-group="abmet"] button[data-val="tarjeta"]'); await page.click('#abSave'); }
        else { await page.click('#pdAbono'); await page.fill('#pa_monto', monto); await page.click('[data-group="pamet"] button[data-val="tarjeta"]'); await page.click('#paSave'); }
        const r = await conReglas(page, (R, ctx, a) => (a.tipo === 'apartado'
          ? R.ped.abonarApartado(a.p, { monto: a.monto, fecha: a.hoy, metodo: 'tarjeta' }, { impuestoPct: 19, nuevoId: ctx.nuevoId })
          : R.ped.abonarPendiente(a.p, { monto: a.monto, fecha: a.hoy, metodo: 'tarjeta' }, ctx)), { hoy, tipo, p: esperado, monto });
        if (r.ok) esperado = r.pendiente;
        else if (page.avisos.length === avisosAntes) throw new Error('la original no avisó del abono rechazado');
        else if (r.error === 'mayor-que-saldo' && !page.avisos[page.avisos.length - 1].includes('mayor que el saldo')) throw new Error('aviso distinto: ' + page.avisos[page.avisos.length - 1]);
        await page.evaluate(() => document.querySelectorAll('.overlay').forEach((o) => o.remove()));
        await page.click('.tab[data-view="clientes"]'); await page.click('.tab[data-view="ventas"]');
      }
      fin = await ls(page);
      afirmarIgual(normalizar(esperado), normalizar(fin.cuentas_pedidos[0]), 'pendiente tras abonos');
      // cancelar
      await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach((d) => { d.open = true; }));
      await page.click(`#listWrap li[data-pid="${p0.id}"]`);
      await page.click(tipo === 'apartado' ? '#abCancelar' : '#pdCancelar'); await page.click('#ccSi');
      fin = await ls(page);
      const c = await conReglas(page, (R, ctx, a) => R.ped.cancelarPendiente(a.p, ctx), { hoy, p: esperado });
      afirmarIgual(normalizar(c.pendiente), normalizar(fin.cuentas_pedidos[0]), 'pendiente cancelado');
      afirmarIgual(normalizar(c.devoluciones), normalizar(fin.cuentas_gastos), 'devoluciones');
      await page.context().close();
    });
  }

  await caso('editar el anticipo de un pedido con abonos (comportamiento actual D4-09 conservado)', async () => {
    const datos = BASEDATOS();
    datos.cuentas_pedidos = [{ id: 'pd1', clienteId: 'c1', clienteNombre: 'Ana Pérez', fechaEntrega: '2026-12-01', tipo: 'pedido', abonos: [{ id: 'x', fecha: '2026-11-01', monto: 30000, metodo: 'efectivo', nota: 'Anticipo' }], anticipo: 30000, anticipoMetodo: 'efectivo', descuentoPct: 0, fechaAnticipo: '2026-11-01', items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 50000, caracteristicas: '', costo: 0 }], notas: '', estado: 'pendiente', creadoTs: 5 }];
    const page = await nuevaPagina(nav, datos);
    const hoy = await hoyDe(page);
    await page.click('.tab[data-view="ventas"]'); await page.click('[data-group="ventasvista"] button[data-val="pedidos"]');
    await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach((d) => { d.open = true; }));
    await page.click('#listWrap li[data-pid="pd1"]'); await page.click('#pdEditar');
    await page.fill('#pd_anticipo', '45000'); await page.click('#pd_save');
    const fin = await ls(page);
    const r = await conReglas(page, (R, ctx, a) => R.ped.guardarPendienteFormulario(a.p, { cliente: a.cli, fecha: a.p.fechaEntrega, items: a.p.items, anticipo: '45000', metodoAnticipo: 'efectivo', descuentoPct: '', fechaAnticipo: a.p.fechaAnticipo, notas: '' }, ctx).pendiente, { hoy, p: datos.cuentas_pedidos[0], cli: datos.cuentas_clientes[0] });
    afirmarIgual(r, fin.cuentas_pedidos[0], 'pedido editado');
    await page.context().close();
  });

  await caso('pedido desde el asistente con descuento (comportamiento actual D4-03 conservado) y entrega pagando con tarjeta', async () => {
    const page = await nuevaPagina(nav, BASEDATOS(19));
    const hoy = await hoyDe(page);
    await page.click('.tab[data-view="ventas"]'); await page.click('#fabBtn'); await page.click('.overlay .pick-row[data-id="c1"]');
    await page.fill('#prodSearch', 'Cam'); await page.click('#prodPickList .pick-row[data-id="p1"]'); await page.click('.cart-item[data-idx="0"] .qtyPlus');
    await page.fill('#descuentoInput', '20'); await page.dispatchEvent('#descuentoInput', 'change');
    await page.click('[data-group="tipoop"] button[data-val="pedido"]');
    await page.fill('#op_anticipo', '25000'); await page.click('[data-group="opmet"] button[data-val="efectivo"]');
    const fecha = await page.inputValue('#op_fecha');
    await page.click('#saveVentaBtn');
    let fin = await ls(page);
    const p = await conReglas(page, (R, ctx, a) => R.ped.pendienteDesdeAsistente({ tipo: 'pedido', cliente: a.cli, carrito: [{ productoId: 'p1', nombre: 'Camisa', precioUnit: 50000, costo: 30000, cantidad: 2 }], fecha: a.fecha, anticipo: '25000', fechaAnticipo: a.hoy, metodo: 'efectivo', notas: '' }, ctx), { hoy, fecha, cli: BASEDATOS().cuentas_clientes[0] });
    afirmarIgual(normalizar(p), normalizar(fin.cuentas_pedidos[0]), 'pedido del asistente');
    await page.evaluate(() => document.querySelectorAll('#listWrap details').forEach((d) => { d.open = true; }));
    await page.click(`#listWrap li[data-pid="${fin.cuentas_pedidos[0].id}"]`);
    await page.click('#pdEntregar'); await page.click('[data-group="pdmet"] button[data-val="tarjeta"]'); await page.click('#pdSi');
    const antes = fin; fin = await ls(page);
    const e = await conReglas(page, (R, ctx, a) => R.ped.entregarPendiente(a.p, { pagaAhora: true, metodo: 'tarjeta' }, { inventario: a.inv, clientes: a.cli, impuestoPct: 19, ...ctx }), { hoy, p: antes.cuentas_pedidos[0], inv: antes.cuentas_inventario, cli: antes.cuentas_clientes });
    afirmarIgual(normalizar(e.venta), normalizar(fin.cuentas_ventas[0]), 'venta de la entrega');
    afirmarIgual(e.inventario, fin.cuentas_inventario, 'stock tras entregar');
    await page.context().close();
  });

  // ---------- 6. Prenda a medida y anulación ----------
  await caso('prenda a medida con materiales repetidos: venta, costo y stock; luego anular (devoluciones y stock)', async () => {
    const page = await nuevaPagina(nav, BASEDATOS());
    const hoy = await hoyDe(page);
    await page.click('.tab[data-view="ventas"]'); await page.click('#fabBtn'); await page.click('.overlay .pick-row[data-id="c2"]');
    await page.click('#medidaBtn');
    await page.fill('#ma_nombre', 'Manilla'); await page.fill('#ma_car', 'Roja'); await page.fill('#ma_cant', '2');
    await page.selectOption('.mat-prod[data-mat="0"]', 'p4'); await page.fill('.mat-cant[data-mat="0"]', '3');
    await page.click('#ma_addMat'); await page.selectOption('.mat-prod[data-mat="1"]', 'p2'); await page.fill('.mat-cant[data-mat="1"]', '1');
    await page.click('#ma_addMat'); await page.selectOption('.mat-prod[data-mat="2"]', 'p4'); await page.fill('.mat-cant[data-mat="2"]', '2');
    await page.click('#maAgregar');
    await page.fill('#prodSearch', 'Cam'); await page.click('#prodPickList .pick-row[data-id="p1"]');
    await page.click('#saveVentaBtn'); await page.click('#cfConfirmar'); await page.click('#laterBtn');
    let fin = await ls(page);
    const r = await conReglas(page, (R, ctx, a) => {
      const pr = R.ventas.prendaAMedida([{ productoId: 'p4', cantidad: 3 }, { productoId: 'p2', cantidad: 1 }, { productoId: 'p4', cantidad: 2 }], a.inv);
      const carrito = [
        { productoId: null, nombre: 'Manilla', caracteristicas: 'Roja', foto: '', materiales: pr.materiales, precioCatalogo: pr.precio, precioUnit: pr.precio, costo: pr.costo, cantidad: 2 },
        { productoId: 'p1', nombre: 'Camisa', precioCatalogo: 50000, precioUnit: 50000, costo: 30000, cantidad: 1 },
      ];
      const venta = R.ventas.construirVenta({ cliente: a.cli, carrito, descuento: { tipo: 'monto', valor: 0 }, impuestoPct: 0, notas: '', medio: 'efectivo', montos: {} }, ctx);
      return { venta, inventario: R.inv.descontarStock(a.inv, R.ventas.unidadesDeVenta(venta.items)) };
    }, { hoy, inv: BASEDATOS().cuentas_inventario, cli: BASEDATOS().cuentas_clientes[1] });
    afirmarIgual(normalizar(r.venta), normalizar(fin.cuentas_ventas[0]), 'venta con prenda a medida');
    afirmarIgual(r.inventario, fin.cuentas_inventario, 'stock con materiales');
    const antes = fin;
    await page.click('#listWrap li.row'); await page.click('#deleteVentaBtn'); await page.click('#anSi');
    fin = await ls(page);
    const an = await conReglas(page, (R, ctx, a) => R.ventas.anularVenta(a.v, { ventas: a.ventas, inventario: a.inv }, ctx), { hoy, v: antes.cuentas_ventas[0], ventas: antes.cuentas_ventas, inv: antes.cuentas_inventario });
    afirmarIgual(an.ventas, fin.cuentas_ventas, 'ventas tras anular');
    afirmarIgual(an.inventario, fin.cuentas_inventario, 'stock tras anular');
    afirmarIgual(normalizar(an.movimientos), normalizar(fin.cuentas_movimientos), 'devoluciones de inventario');
    await page.context().close();
  });

  // ---------- 7. Facturas, gastos y clientes ----------
  await caso('generar factura (folio), editar factura, gasto general (crear y editar) y cliente (crear y editar)', async () => {
    const datos = BASEDATOS();
    datos.cuentas_ventas = [{ id: 'v1', clienteId: 'c1', clienteNombre: 'Ana Pérez', fecha: '2026-11-01', creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 1 }], total: 50000, fiado: false, abonos: [] }];
    const page = await nuevaPagina(nav, datos);
    const hoy = await hoyDe(page);
    await page.click('.tab[data-view="facturas"]'); await page.click('#fabBtn'); await page.click('.overlay .pick-row[data-id="v1"]');
    await page.click('#editFacBtn');
    const form = { nombre: ' Ana P. ', direccion: 'Calle 9', telefono: '311', email: '', fecha: '2026-11-02', notas: ' Cambios 8 días ' };
    await page.fill('#fe_nombre', form.nombre); await page.fill('#fe_direccion', form.direccion); await page.fill('#fe_telefono', form.telefono); await page.fill('#fe_email', form.email); await page.fill('#fe_fecha', form.fecha); await page.fill('#fe_notas', form.notas);
    await page.click('#feSave');
    await page.evaluate(() => document.querySelectorAll('.overlay').forEach((o) => o.remove()));
    await page.click('.tab[data-view="gastos"]'); await page.click('#fabBtn');
    await page.fill('#f_desc', ' Arriendo '); await page.fill('#f_monto', '-500'); await page.fill('#f_cat', 'Local'); await page.click('[data-group="gmet"] button[data-val="tarjeta"]'); await page.click('.overlay #saveBtn');
    await page.click('#listWrap li.row'); await page.fill('#f_monto', '900000'); await page.fill('#f_fecha', ''); await page.click('[data-group="gmet"] button[data-val="efectivo"]'); await page.click('.overlay #saveBtn');
    await page.click('.tab[data-view="clientes"]'); await page.click('#fabBtn');
    await page.fill('#f_nombre', '  Marta  '); await page.fill('#f_telefono', ' 300 '); await page.click('.overlay #saveBtn');
    await page.click('#listWrap li[data-id="c2"]'); await page.fill('#f_email', 'luis@x.co'); await page.click('.overlay #saveBtn');
    const fin = await ls(page);
    const r = await conReglas(page, (R, ctx, a) => {
      const f = R.fac.asignarFolio(a.v, a.cfg);
      const e = R.fac.editarFactura(f.venta, a.form).venta;
      const g1 = R.gas.gastoGeneral({ descripcion: ' Arriendo ', monto: '-500', fecha: a.hoy, categoria: 'Local', metodo: 'tarjeta' }, ctx).gasto;
      const g2 = R.gas.editarGasto(g1, { descripcion: ' Arriendo ', monto: '900000', fecha: '', categoria: 'Local', metodo: 'efectivo' }, ctx).gasto;
      const c1 = R.cli.guardarCliente(null, { nombre: '  Marta  ', telefono: ' 300 ', email: '', direccion: '' }, ctx).cliente;
      const c2 = R.cli.guardarCliente(a.c2, { nombre: 'Luis', telefono: '', email: 'luis@x.co', direccion: '' }, ctx).cliente;
      return { venta: e, cfg: f.ajustes, gastos: [g2], clientes: [a.c1, c2, c1] };
    }, { hoy, v: datos.cuentas_ventas[0], cfg: datos.cuentas_config, form, c1: datos.cuentas_clientes[0], c2: datos.cuentas_clientes[1] });
    afirmarIgual(r.venta, fin.cuentas_ventas[0], 'factura generada y editada');
    afirmarIgual(r.cfg.siguienteFolio, fin.cuentas_config.siguienteFolio, 'contador de folio');
    afirmarIgual(normalizar(r.gastos), normalizar(fin.cuentas_gastos), 'gasto creado y editado');
    afirmarIgual(normalizar(r.clientes), normalizar(fin.cuentas_clientes), 'clientes');
    await page.context().close();
  });

  await nav.close(); servidor.close(); fs.rmSync(VIEJO, { recursive: true, force: true });
  for (const r of resultados) console.log(r[0].padEnd(5), r[1], r[2] ? '\n      → ' + r[2] : '');
  const fallas = resultados.filter((r) => r[0] !== 'OK');
  console.log(`\n${resultados.length - fallas.length}/${resultados.length} casos correctos`);
  process.exitCode = fallas.length ? 1 : 0;
})();
