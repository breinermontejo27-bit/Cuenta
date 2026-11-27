// Etapa 7 · Comparación de extremo a extremo: las MISMAS tareas hechas con clics en la app original (commit 9300dfa)
// y en Orisma 2.0, partiendo de los mismos datos. Se compara lo que guarda cada una (registro por registro).
// Uso: node tests/e2e/modulos.e2e.cjs   (requiere playwright y git). Datos ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const VIEJO = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-original-'));
execSync(`git -C "${RAIZ}" archive 9300dfa | tar -x -C "${VIEJO}"`);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8780, BASE = `http://localhost:${PUERTO}`;
const servidor = http.createServer((q, r) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  const [raiz, rel] = url.startsWith('/viejo/') ? [VIEJO, url.slice(7)] : [RAIZ, url.slice(1)];
  fs.readFile(path.join(raiz, rel || 'index.html'), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(rel || '.html')] || 'text/html' }); r.end(d); });
}).listen(PUERTO);

const SEMBRADOS = new Set(['p1', 'p2', 'p3', 'p4', 'c1', 'c2', 'v1', 'v2', 'pd1']);
const normalizar = (o) => JSON.parse(JSON.stringify(o, (k, v) => {
  if ((k === 'id' || k === 'creadoTs' || k === 'ts') && typeof v !== 'object') return SEMBRADOS.has(v) ? v : '·';
  if ((k === 'productoId' || k === 'clienteId') && typeof v === 'string' && !SEMBRADOS.has(v)) return '·nuevo';
  return v;
}));
const SEMILLA = () => ({
  cuentas_config: { nombre: 'Prueba', moneda: '$', impuesto: 0, siguienteFolio: 41, stockMinimo: 3, siguienteComprobante: 3 },
  cuentas_clientes: [{ id: 'c1', nombre: 'Ana Pérez', telefono: '3001112233', email: 'ana@x.co', direccion: 'Calle 1' }, { id: 'c2', nombre: 'Luis', telefono: '', email: '', direccion: '' }],
  cuentas_inventario: [
    { id: 'p1', nombre: 'Camisa', precio: 50000, costo: 30000, stock: 20, categoria: 'Ropa', margen: 67 },
    { id: 'p2', nombre: 'Gorra', precio: 20000, costo: 8000, stock: 9, categoria: '' },
    { id: 'p3', nombre: 'Servicio', precio: 15000, costo: 0, stock: '', categoria: '' },
    { id: 'p4', nombre: 'Hilo', precio: 3000, costo: 1250, stock: 50, categoria: 'Materiales', margen: 140 },
  ],
  cuentas_ventas: [
    { id: 'v1', clienteId: 'c1', clienteNombre: 'Ana Pérez', fecha: '2026-11-01', creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 2 }], sumaItems: 100000, total: 100000, costoTotal: 60000, gananciaEstimada: 40000, fiado: true, metodoPago: 'credito', abonos: [{ id: 'a1', fecha: '2026-11-01', monto: 20000, metodo: 'efectivo' }] },
    { id: 'v2', clienteId: 'c1', clienteNombre: 'Ana Pérez', fecha: '2026-11-02', creadoTs: 2, items: [{ productoId: 'p2', nombre: 'Gorra', precio: 20000, cantidad: 1 }], sumaItems: 20000, total: 20000, costoTotal: 8000, gananciaEstimada: 12000, fiado: true, metodoPago: 'credito', abonos: [] },
  ],
  cuentas_gastos: [], cuentas_movimientos: [], cuentas_pedidos: [],
});
// Valores por defecto que ambas apps completan al cargar (CONFIG_DEFAULTS, L474). La original guarda solo lo tocado.
const DEFECTOS = { nombre: 'Mi negocio', moneda: '$', impuesto: 0, siguienteFolio: 1, direccion: '', telefono: '', email: '', logo: '', fotoPerfil: '', margenDefault: '', stockMinimo: 3, facturaTitulo: 'FACTURA', facturaPie: 'Gracias por su compra', mostrarDireccion: true, mostrarTelefono: true, mostrarEmail: true, colorFactura: '#1E4FA0', mostrarTenga: true, mostrarPagos: true, mostrarFirma: true, mostrarPie: true, mostrarFotos: false, mostrarSello: true, firmaImg: '', tengaTexto: '' };
const completar = (c) => { const r = { ...c }; for (const [k, v] of Object.entries(DEFECTOS)) if (r[k] === undefined) r[k] = v; return Object.fromEntries(Object.entries(r).sort()); };
const CLAVES = { clientes: 'cuentas_clientes', inventario: 'cuentas_inventario', ventas: 'cuentas_ventas', gastos: 'cuentas_gastos', movimientos: 'cuentas_movimientos', pedidos: 'cuentas_pedidos', config: 'cuentas_config' };

async function abrir(nav, app, datos) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.errores = [];
  page.on('pageerror', (e) => page.errores.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(BASE + (app === 'viejo' ? '/viejo/index.html' : '/index.html'));
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, datos);
  await page.evaluate(() => new Promise((r) => { const p = indexedDB.deleteDatabase('orisma'); p.onsuccess = p.onerror = p.onblocked = () => r(); }));
  await page.reload();
  if (app === 'nuevo') { await page.waitForSelector('#contenido .lista, #contenido .vacio, #contenido .panel-hoy'); await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); }
  return page;
}
async function leer(page, app) {
  if (app === 'viejo') return page.evaluate((C) => Object.fromEntries(Object.entries(C).map(([c, k]) => [c, JSON.parse(localStorage.getItem(k) || (c === 'config' ? '{}' : '[]'))])), CLAVES);
  return page.evaluate(async () => {
    const st = await import('./src/core/state.js'); const db = await import('./src/data/database.js'); const f = await import('./src/data/files.js');
    const t = await db.leerTodo(); const img = new Map(); for (const a of t.archivos) img.set(a.id, await f.dataUrlDeArchivo(a));
    const r = (id) => img.get(id) || '';
    const out = {}; for (const c of ['clientes', 'inventario', 'ventas', 'gastos', 'movimientos', 'pedidos']) out[c] = t.filas[c].map((x) => f.inflarImagenes(c, x.r, r));
    out.config = f.inflarImagenes('ajustes', st.obtenerAjustes(), r);
    return out;
  });
}

// ---------- Ayudas para Orisma ----------
const ULT = '#capas .velo:last-child';
const n = {
  ir: async (p, ruta) => { await p.evaluate((r) => { location.hash = '#/' + r; }, ruta); await p.waitForTimeout(120); },
  mas: (p) => p.click('#accionMovil'),
  accion: (p, a) => p.click(`${ULT} [data-accion="${a}"]`),
  llenar: (p, id, v) => p.fill(`${ULT} #${id}`, String(v)),
  cambiar: async (p, id, v) => { await p.fill(`${ULT} #${id}`, String(v)); await p.dispatchEvent(`${ULT} #${id}`, 'change'); },
  seg: (p, grupo, v) => p.click(`${ULT} [data-grupo="${grupo}"] [data-valor="${v}"]`),
  fila: (p, attr, v) => p.click(`${ULT} .fila[data-${attr}="${v}"]`),
  filaLista: async (p, attr, v) => { await p.evaluate(() => document.querySelectorAll('#contenido details').forEach((d) => { d.open = true; })); await p.click(`#contenido .fila[data-${attr}="${v}"]`); },
  sinHojas: (p) => p.waitForFunction(() => !document.querySelector('#capas .velo'), null, { timeout: 5000 }),
  hojas: (p, k) => p.waitForFunction((k) => document.querySelectorAll('#capas .velo').length === k, k, { timeout: 5000 }),
};
// ---------- Ayudas para la original ----------
const o = {
  tab: (p, v) => p.click(`.tab[data-view="${v}"]`),
  quitar: (p) => p.evaluate(() => document.querySelectorAll('.overlay').forEach((x) => x.remove())),
  pend: async (p) => { await p.click('[data-group="ventasvista"] button[data-val="pedidos"]'); await p.evaluate(() => document.querySelectorAll('#listWrap details').forEach((d) => { d.open = true; })); },
};

const ESCENARIOS = [
  {
    nombre: 'Clientes y créditos: crear y editar cliente, abono con tarjeta, abono por encima del saldo, liquidar deuda',
    viejo: async (p) => {
      await o.tab(p, 'clientes'); await p.click('#fabBtn'); await p.fill('#f_nombre', ' Marta Ríos '); await p.fill('#f_telefono', '3105556677'); await p.click('#saveBtn');
      await p.click('#listWrap li[data-id="c2"]'); await p.fill('#f_email', 'luis@x.co'); await p.click('#saveBtn');
      await p.click('#listWrap li[data-id="c1"]'); await p.click('.overlay [data-abonar="v1"]'); await p.fill('#ab_monto', '30000'); await p.fill('#ab_nota', 'Nequi'); await p.click('[data-group="abm"] button[data-val="tarjeta"]'); await p.click('#abSave'); await o.quitar(p);
      await p.click('#listWrap li[data-id="c1"]'); await p.click('.overlay [data-abonar="v2"]'); await p.fill('#ab_monto', '999999'); await p.click('#abSave'); await o.quitar(p);
      await p.click('#gearBtn'); await p.click('.row[data-sec="creditos"]'); await p.click('.overlay li[data-cli="c1"]'); await p.click('#ccLiquidar'); await p.click('[data-group="liq"] button[data-val="efectivo"]'); await p.click('#ccSi');
    },
    nuevo: async (p) => {
      await n.ir(p, 'clientes'); await n.mas(p); await n.llenar(p, 'f_nombre', ' Marta Ríos '); await n.llenar(p, 'f_telefono', '3105556677'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('#contenido .fila[data-id="c2"]'); await n.llenar(p, 'f_email', 'luis@x.co'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('#contenido .fila[data-id="c1"]'); await n.fila(p, 'venta', 'v1'); await p.waitForSelector(`${ULT} #ab_monto`); await n.llenar(p, 'ab_monto', 30000); await n.llenar(p, 'ab_nota', 'Nequi'); await n.seg(p, 'medio', 'tarjeta'); await n.accion(p, 'guardar');
      await p.waitForSelector(`${ULT} #f_nombre`); await n.fila(p, 'venta', 'v2'); await p.waitForSelector(`${ULT} #ab_monto`); await n.llenar(p, 'ab_monto', 999999); await n.accion(p, 'guardar');
      await p.waitForSelector(`${ULT} #f_nombre`); await n.accion(p, 'cancelar'); await n.sinHojas(p);
      await n.ir(p, 'ajustes'); await p.click('[data-seccion="creditos"]'); await n.fila(p, 'cliente', 'c1'); await p.waitForSelector(`${ULT} [data-accion="liquidar"]`);
      await n.accion(p, 'liquidar'); await n.accion(p, 'liquidar'); await p.click('#capas [data-accion="si"]');
      // Igual que la original: tras liquidar vuelve a la lista de créditos.
      await p.waitForFunction(() => { const h = document.querySelectorAll('#capas .velo'); return h.length === 1 && h[0].textContent.includes('Total por cobrar'); }, null, { timeout: 5000 });
    },
  },
  {
    nombre: 'Productos: alta con ganancia, edición de stock con motivo, compra desde el producto y eliminación',
    viejo: async (p) => {
      await o.tab(p, 'inventario'); await p.click('#fabBtn');
      await p.fill('#f_nombre', 'Aretes'); await p.fill('#f_categoria', 'Joyería'); await p.fill('#f_costo', '100000'); await p.fill('#f_margen', '40'); await p.fill('#f_stock', '3'); await p.fill('#f_umbral', '1'); await p.click('#saveBtn');
      await p.click('#listWrap li[data-id="p2"]'); await p.fill('#f_stock', '4'); await p.fill('#f_stockMotivo', 'Conteo'); await p.check('#f_sinAlerta'); await p.click('#saveBtn');
      await p.click('#listWrap li[data-id="p1"]'); await p.click('#compraBtn'); await p.fill('#c_cantidad', '10'); await p.fill('#c_costo', '36000'); await p.click('#saveCompraBtn');
      await p.click('#listWrap li[data-id="p4"]'); await p.click('#deleteBtn'); await p.click('#delSi');
    },
    nuevo: async (p) => {
      await n.ir(p, 'inventario/productos'); await n.mas(p);
      await n.llenar(p, 'f_nombre', 'Aretes'); await n.llenar(p, 'f_categoria', 'Joyería'); await n.llenar(p, 'f_costo', 100000); await n.llenar(p, 'f_margen', 40); await n.llenar(p, 'f_stock', 3); await n.llenar(p, 'f_umbral', 1); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('#contenido .fila[data-id="p2"]'); await n.llenar(p, 'f_stock', 4); await p.dispatchEvent(`${ULT} #f_stock`, 'input'); await n.llenar(p, 'f_stockMotivo', 'Conteo'); await p.check(`${ULT} #f_sinAlerta`); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('#contenido .fila[data-id="p1"]'); await n.accion(p, 'compra'); await p.waitForSelector(`${ULT} #c_cantidad`); await p.type(`${ULT} #c_cantidad`, '10'); await n.llenar(p, 'c_costo', ''); await p.type(`${ULT} #c_costo`, '36000'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('#contenido .fila[data-id="p4"]'); await n.accion(p, 'eliminar'); await p.click('#capas [data-accion="si"]'); await n.sinHojas(p);
    },
  },
  {
    nombre: 'Gastos: general (crear, editar, eliminar) y compras desde Gastos (producto existente y nuevo)',
    viejo: async (p) => {
      await o.tab(p, 'gastos'); await p.click('#fabBtn'); await p.fill('#f_desc', 'Arriendo'); await p.fill('#f_monto', '900000'); await p.fill('#f_cat', 'Local'); await p.click('[data-group="gmet"] button[data-val="tarjeta"]'); await p.click('.overlay #saveBtn');
      await p.click('#fabBtn'); await p.fill('#f_desc', 'Taxi'); await p.fill('#f_monto', '12000'); await p.click('.overlay #saveBtn');
      await p.click('#listWrap li.row >> nth=0'); await p.fill('#f_monto', '950000'); await p.click('.overlay #saveBtn');
      await p.click('#listWrap li.row >> text=Taxi'); await p.click('#deleteBtn');
      await p.click('#fabBtn'); await p.click('.overlay .chip[data-tipo="compra"]'); await p.fill('#prodSearchG', 'Gor'); await p.click('#prodPickListG .pick-row[data-id="p2"]'); await p.fill('#c_cantidad', '5'); await p.fill('#c_costo', '9000'); await p.click('.overlay #saveBtn');
      await p.click('#fabBtn'); await p.click('.overlay .chip[data-tipo="compra"]'); await p.click('[data-group="gmet"] button[data-val="tarjeta"]'); await p.click('#nuevoProdBtn'); await p.fill('#f_nuevoNombre', 'Botones'); await p.waitForSelector('#c_cantidad'); await p.fill('#c_cantidad', '100'); await p.fill('#c_costo', '200'); await p.click('.overlay #saveBtn');
    },
    nuevo: async (p) => {
      await n.ir(p, 'gastos'); await n.mas(p); await n.llenar(p, 'f_descripcion', 'Arriendo'); await n.llenar(p, 'f_monto', 900000); await n.llenar(p, 'f_categoria', 'Local'); await n.seg(p, 'medio', 'tarjeta'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await n.mas(p); await n.llenar(p, 'f_descripcion', 'Taxi'); await n.llenar(p, 'f_monto', 12000); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('#contenido .fila >> nth=0'); await n.llenar(p, 'f_monto', 950000); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('#contenido .fila >> text=Taxi'); await n.accion(p, 'eliminar'); await p.click('#capas [data-accion="si"]'); await n.sinHojas(p);
      await n.mas(p); await p.click(`${ULT} [data-grupo="tipo"] [data-valor="compra"]`); await p.type(`${ULT} #f_buscarProducto`, 'Gor'); await p.click(`${ULT} [data-producto="p2"]`); await p.type(`${ULT} #c_cantidad`, '5'); await n.llenar(p, 'c_costo', ''); await p.type(`${ULT} #c_costo`, '9000'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await n.mas(p); await p.click(`${ULT} [data-grupo="tipo"] [data-valor="compra"]`); await n.seg(p, 'medio', 'tarjeta'); await n.accion(p, 'nuevo-producto'); await p.type(`${ULT} #f_nombreNuevo`, 'Botones'); await p.waitForSelector(`${ULT} #c_cantidad`); await p.type(`${ULT} #c_cantidad`, '100'); await p.type(`${ULT} #c_costo`, '200'); await n.accion(p, 'guardar'); await n.sinHojas(p);
    },
  },
  ...[
    { medio: 'efectivo', desc: '10', total: null, extra: false },
    { medio: 'credito', desc: null, total: null, extra: false, abono: '30000', medioAbono: 'tarjeta' },
    { medio: 'mixto', desc: null, total: '150000', extra: true, ef: '50000', tj: '40000' },
  ].map((c) => ({
    nombre: `Venta con el asistente · ${c.medio}${c.desc ? ' · descuento ' + c.desc + '%' : ''}${c.total ? ' · total escrito ' + c.total : ''}${c.extra ? ' · servicio libre y prenda a medida' : ''}`,
    viejo: async (p) => {
      await o.tab(p, 'ventas'); await p.click('#fabBtn'); await p.click('.overlay .pick-row[data-id="c1"]');
      await p.fill('#prodSearch', 'Cam'); await p.click('#prodPickList .pick-row[data-id="p1"]'); await p.click('.cart-item[data-idx="0"] .qtyPlus');
      await p.fill('#prodSearch', 'Gor'); await p.click('#prodPickList .pick-row[data-id="p2"]');
      if (c.extra) {
        await p.click('#svcBtn'); await p.fill('#sv_nombre', 'Arreglo'); await p.fill('#sv_car', 'Cierre'); await p.fill('#sv_precio', '15000'); await p.fill('#sv_costo', '5000'); await p.click('#svAgregar');
        await p.click('#medidaBtn'); await p.fill('#ma_nombre', 'Manilla'); await p.fill('#ma_cant', '2'); await p.selectOption('.mat-prod[data-mat="0"]', 'p4'); await p.fill('.mat-cant[data-mat="0"]', '3'); await p.click('#maAgregar');
      }
      await p.fill('.cart-item[data-idx="1"] .unit-price', '18000'); await p.dispatchEvent('.cart-item[data-idx="1"] .unit-price', 'change');
      if (c.desc) { await p.fill('#descuentoInput', c.desc); await p.dispatchEvent('#descuentoInput', 'change'); }
      if (c.total) { await p.fill('#totalInput', c.total); await p.dispatchEvent('#totalInput', 'change'); }
      await p.fill('#f_notas', 'Garantía 1 mes');
      await p.click(`[data-group="pago"] button[data-val="${c.medio}"]`);
      if (c.medio === 'credito') { await p.click(`[data-group="abmet"] button[data-val="${c.medioAbono}"]`); await p.fill('#f_abonoIni', c.abono); }
      if (c.medio === 'mixto') { await p.fill('#f_efectivo', c.ef); await p.fill('#f_tarjeta', c.tj); }
      await p.click('#saveVentaBtn'); await p.click('#cfConfirmar'); await p.click('#laterBtn');
    },
    nuevo: async (p) => {
      await n.ir(p, 'ventas/ventas'); await n.mas(p); await n.fila(p, 'cliente', 'c1');
      await p.type(`${ULT} #w_producto`, 'Cam'); await p.click(`${ULT} [data-producto="p1"]`); await p.click(`${ULT} .item-carrito[data-indice="0"] [data-mas]`);
      await p.type(`${ULT} #w_producto`, 'Gor'); await p.click(`${ULT} [data-producto="p2"]`);
      if (c.extra) {
        await n.accion(p, 'servicio'); await n.llenar(p, 'sv_nombre', 'Arreglo'); await n.llenar(p, 'sv_car', 'Cierre'); await n.llenar(p, 'sv_precio', 15000); await n.llenar(p, 'sv_costo', 5000); await n.accion(p, 'agregar'); await n.hojas(p, 1);
        await n.accion(p, 'prenda'); await n.llenar(p, 'ma_nombre', 'Manilla'); await n.llenar(p, 'ma_cant', 2); await p.selectOption(`${ULT} #mat_0`, 'p4'); await n.llenar(p, 'matc_0', 3); await p.dispatchEvent(`${ULT} #matc_0`, 'input'); await n.accion(p, 'agregar'); await n.hojas(p, 1);
      }
      await n.cambiar(p, 'w_producto', ''); await p.fill(`${ULT} .item-carrito[data-indice="1"] .precio-unit`, '18000'); await p.dispatchEvent(`${ULT} .item-carrito[data-indice="1"] .precio-unit`, 'change');
      if (c.desc) await n.cambiar(p, 'w_descuento', c.desc);
      if (c.total) await n.cambiar(p, 'w_total', c.total);
      await n.llenar(p, 'f_notas', 'Garantía 1 mes');
      await n.seg(p, 'medio', c.medio);
      if (c.medio === 'credito') { await n.seg(p, 'medio-abono', c.medioAbono); await n.llenar(p, 'f_abonoIni', c.abono); }
      if (c.medio === 'mixto') { await n.llenar(p, 'f_efectivo', c.ef); await n.llenar(p, 'f_tarjeta', c.tj); }
      await n.accion(p, 'guardar'); await p.waitForSelector(`${ULT} [data-accion="confirmar"]`); await n.accion(p, 'confirmar');
      await p.waitForSelector(`${ULT} [data-accion="listo"]`); await n.accion(p, 'listo'); await n.sinHojas(p);
    },
  })),
  {
    nombre: 'Pendientes: pedido con anticipo y descuento → abono → entrega pagando con tarjeta; apartado → abono → entrega; encargo → cancelar con devolución',
    viejo: async (p) => {
      await o.tab(p, 'ventas'); await o.pend(p);
      await p.click('#fabBtn'); await p.click('.overlay li[data-tipo="pedido"]'); await p.selectOption('#pd_cliente', 'c1');
      await p.fill('#pd_nombre', 'camisa'); await p.fill('#pd_precio', '50000'); await p.fill('#pd_cant', '2'); await p.fill('#pd_car', 'talla M'); await p.click('#pd_add');
      await p.fill('#pd_anticipo', '30000'); await p.click('[data-group="pdmet"] button[data-val="tarjeta"]'); await p.fill('#pd_desc', '10'); await p.fill('#pd_notas', 'Llamar'); await p.click('#pd_save');
      const id1 = await p.evaluate(() => JSON.parse(localStorage.cuentas_pedidos)[0].id);
      await o.pend(p); await p.click(`#listWrap li[data-pid="${id1}"]`); await p.click('#pdAbono'); await p.fill('#pa_monto', '20000'); await p.click('#paSave'); await o.quitar(p);
      await o.pend(p); await p.click(`#listWrap li[data-pid="${id1}"]`); await p.click('#pdEntregar'); await p.click('[data-group="pdmet"] button[data-val="tarjeta"]'); await p.click('#pdSi');
      await o.pend(p); await p.click('#fabBtn'); await p.click('.overlay li[data-tipo="apartado"]'); await p.selectOption('#pd_cliente', 'c2');
      await p.fill('#pd_nombre', 'Gorra'); await p.fill('#pd_precio', '20000'); await p.click('#pd_add'); await p.click('#pd_save');
      const id2 = await p.evaluate(() => JSON.parse(localStorage.cuentas_pedidos)[1].id);
      await o.pend(p); await p.click(`#listWrap li[data-pid="${id2}"]`); await p.fill('#ab_monto', '20000'); await p.click('[data-group="abmet"] button[data-val="tarjeta"]'); await p.click('#abSave'); await p.click('#abEntregar');
      await o.pend(p); await p.click('#fabBtn'); await p.click('.overlay li[data-tipo="encargo"]'); await p.selectOption('#pd_cliente', 'c1');
      await p.fill('#pd_nombre', 'Reloj'); await p.fill('#pd_precio', '120000'); await p.fill('#pd_costo', '80000'); await p.click('#pd_add'); await p.fill('#pd_fecha', ''); await p.fill('#pd_anticipo', '40000'); await p.click('#pd_save');
      const id3 = await p.evaluate(() => JSON.parse(localStorage.cuentas_pedidos)[2].id);
      await o.pend(p); await p.click(`#listWrap li[data-pid="${id3}"]`); await p.click('#pdCancelar'); await p.click('#ccSi');
    },
    nuevo: async (p) => {
      await n.ir(p, 'ventas/pendientes');
      await n.mas(p); await n.fila(p, 'tipo', 'pedido'); await p.waitForSelector(`${ULT} #pd_cliente`); await p.selectOption(`${ULT} #pd_cliente`, 'c1');
      await n.llenar(p, 'pd_nombre', 'camisa'); await n.llenar(p, 'pd_precio', 50000); await n.llenar(p, 'pd_cant', 2); await n.llenar(p, 'pd_car', 'talla M'); await n.accion(p, 'agregar-item');
      await n.llenar(p, 'pd_anticipo', 30000); await n.seg(p, 'pd-medio', 'tarjeta'); await n.llenar(p, 'pd_desc', 10); await n.llenar(p, 'pd_notas', 'Llamar'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      const id1 = await p.evaluate(async () => (await import('./src/core/state.js')).coleccion('pedidos')[0].id);
      await n.filaLista(p, 'pendiente', id1); await n.accion(p, 'abonar'); await p.waitForSelector(`${ULT} #pa_monto`); await n.llenar(p, 'pa_monto', 20000); await n.accion(p, 'guardar');
      await p.waitForSelector(`${ULT} [data-accion="entregar"]`); await n.accion(p, 'entregar'); await n.seg(p, 'medio-entrega', 'tarjeta'); await n.accion(p, 'entregar'); await n.sinHojas(p);
      await n.mas(p); await n.fila(p, 'tipo', 'apartado'); await p.waitForSelector(`${ULT} #pd_cliente`); await p.selectOption(`${ULT} #pd_cliente`, 'c2');
      await n.llenar(p, 'pd_nombre', 'Gorra'); await n.llenar(p, 'pd_precio', 20000); await n.accion(p, 'agregar-item'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      const id2 = await p.evaluate(async () => (await import('./src/core/state.js')).coleccion('pedidos')[1].id);
      await n.filaLista(p, 'pendiente', id2); await n.llenar(p, 'ab_monto', 20000); await n.seg(p, 'medio', 'tarjeta'); await n.accion(p, 'abonar');
      await p.waitForSelector(`${ULT} [data-accion="entregar"]:not([disabled])`); await n.accion(p, 'entregar'); await n.sinHojas(p);
      await n.mas(p); await n.fila(p, 'tipo', 'encargo'); await p.waitForSelector(`${ULT} #pd_cliente`); await p.selectOption(`${ULT} #pd_cliente`, 'c1');
      await n.llenar(p, 'pd_nombre', 'Reloj'); await n.llenar(p, 'pd_precio', 120000); await n.llenar(p, 'pd_costo', 80000); await n.accion(p, 'agregar-item'); await n.llenar(p, 'pd_fecha', ''); await n.llenar(p, 'pd_anticipo', 40000); await n.accion(p, 'guardar'); await n.sinHojas(p);
      const id3 = await p.evaluate(async () => (await import('./src/core/state.js')).coleccion('pedidos')[2].id);
      await n.filaLista(p, 'pendiente', id3); await n.accion(p, 'cancelar'); await p.waitForSelector(`${ULT} [data-accion="si"]`); await n.accion(p, 'si'); await n.sinHojas(p);
    },
  },
  {
    nombre: 'Pedido desde el asistente con anticipo; factura de una venta, edición de la factura y anulación de otra venta',
    viejo: async (p) => {
      await o.tab(p, 'ventas'); await p.click('#fabBtn'); await p.click('.overlay .pick-row[data-id="c2"]');
      await p.fill('#prodSearch', 'Gor'); await p.click('#prodPickList .pick-row[data-id="p2"]'); await p.click('[data-group="tipoop"] button[data-val="pedido"]');
      await p.fill('#op_anticipo', '5000'); await p.click('[data-group="opmet"] button[data-val="tarjeta"]'); await p.click('#saveVentaBtn');
      await o.tab(p, 'facturas'); await p.click('#fabBtn'); await p.click('.overlay .pick-row[data-id="v1"]'); await p.click('#editFacBtn');
      await p.fill('#fe_nombre', 'Ana P.'); await p.fill('#fe_notas', 'Cambios 8 días'); await p.click('#feSave'); await o.quitar(p);
      await o.tab(p, 'ventas'); await p.click('[data-group="ventasvista"] button[data-val="ventas"]'); await p.click('#listWrap li[data-id="v2"]'); await p.click('#deleteVentaBtn'); await p.click('#anSi');
    },
    nuevo: async (p) => {
      await n.ir(p, 'ventas/ventas'); await n.mas(p); await n.fila(p, 'cliente', 'c2');
      await p.type(`${ULT} #w_producto`, 'Gor'); await p.click(`${ULT} [data-producto="p2"]`); await n.seg(p, 'tipo-op', 'pedido');
      await n.llenar(p, 'op_anticipo', 5000); await n.seg(p, 'op-medio', 'tarjeta'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await n.ir(p, 'facturas'); await n.mas(p); await n.fila(p, 'venta', 'v1'); await p.waitForSelector(`${ULT} [data-accion="editar"]`); await n.accion(p, 'editar');
      await p.waitForSelector(`${ULT} #fe_nombre`); await n.llenar(p, 'fe_nombre', 'Ana P.'); await n.llenar(p, 'fe_notas', 'Cambios 8 días'); await n.accion(p, 'guardar');
      await p.waitForSelector(`${ULT} [data-accion="pdf"]`); await p.click(`${ULT} [data-accion="cerrar"]`); await n.sinHojas(p);
      await n.ir(p, 'ventas/ventas'); await p.click('#contenido .fila[data-id="v2"]'); await n.accion(p, 'anular'); await p.waitForSelector(`${ULT} [data-accion="si"]`); await n.accion(p, 'si'); await n.sinHojas(p);
    },
  },
  {
    nombre: 'Ajustes: negocio, moneda e impuesto, productos y factura',
    viejo: async (p) => {
      await p.click('#gearBtn'); await p.click('.row[data-sec="usuario"]'); await p.fill('#s_nombre', 'Orisma'); await p.fill('#s_direccion', 'Calle 10'); await p.click('#saveSetBtn'); await o.quitar(p);
      await p.click('#gearBtn'); await p.click('.row[data-sec="ventas"]'); await p.fill('#s_moneda', 'COP'); await p.fill('#s_impuesto', '19'); await p.click('#saveSetBtn'); await o.quitar(p);
      await p.click('#gearBtn'); await p.click('.row[data-sec="productos"]'); await p.fill('#s_margenDefault', '45'); await p.fill('#s_stockMin', ''); await p.click('#saveSetBtn'); await o.quitar(p);
      await p.click('#gearBtn'); await p.click('.row[data-sec="factura"]'); await p.fill('#sf_titulo', 'CUENTA DE COBRO'); await p.uncheck('#sf_selloOn'); await p.check('#sf_fotos'); await p.fill('#sf_tengaTxt', 'Sin devoluciones'); await p.click('#saveSetBtn');
    },
    nuevo: async (p) => {
      await n.ir(p, 'ajustes');
      await p.click('[data-seccion="negocio"]'); await n.llenar(p, 's_nombre', 'Orisma'); await n.llenar(p, 's_direccion', 'Calle 10'); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('[data-seccion="moneda"]'); await n.llenar(p, 's_moneda', 'COP'); await n.llenar(p, 's_impuesto', 19); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('[data-seccion="productos"]'); await n.llenar(p, 's_margenDefault', 45); await n.llenar(p, 's_stockMin', ''); await n.accion(p, 'guardar'); await n.sinHojas(p);
      await p.click('[data-seccion="factura"]'); await n.llenar(p, 'sf_titulo', 'CUENTA DE COBRO'); await p.uncheck(`${ULT} #sf_sello`); await p.check(`${ULT} #sf_fotos`); await n.llenar(p, 'sf_tengaTxt', 'Sin devoluciones'); await n.accion(p, 'guardar'); await n.sinHojas(p);
    },
  },
];

(async () => {
  const nav = await chromium.launch();
  const resultados = [];
  for (const e of ESCENARIOS) {
    try {
      const pv = await abrir(nav, 'viejo', SEMILLA()); await e.viejo(pv); const dv = await leer(pv, 'viejo');
      const pn = await abrir(nav, 'nuevo', SEMILLA()); await e.nuevo(pn); const dn = await leer(pn, 'nuevo');
      const graves = await pn.locator('.toast.grave').allTextContents();
      const difs = [];
      // Desviación autorizada (actualización contable, nov-2026): la compra hecha desde el producto lleva además
      // tipo 'compra', metodo, productoId y cantidad. Se comprueban y se quitan para comparar el resto con la original.
      (dn.gastos || []).forEach((g, i) => {
        const o = (dv.gastos || [])[i];
        if (o && !o.tipo && o.categoria === 'Inventario' && g.tipo === 'compra') {
          if (!g.metodo || !g.productoId || !(g.cantidad > 0)) difs.push('compra sin los campos contables: ' + JSON.stringify(g));
          for (const k of ['tipo', 'metodo', 'productoId', 'cantidad']) delete g[k];
        }
      });
      for (const c of Object.keys(CLAVES)) {
        const a = JSON.stringify(normalizar(c === 'config' ? completar(dn[c]) : dn[c])), b = JSON.stringify(normalizar(c === 'config' ? completar(dv[c]) : dv[c]));
        if (a !== b) difs.push(`${c}\n   Orisma:   ${a.slice(0, 700)}\n   original: ${b.slice(0, 700)}`);
      }
      if (pn.errores.length || pv.errores.length || graves.length) difs.push('errores: ' + [...pn.errores, ...pv.errores, ...graves].join(' | '));
      resultados.push([difs.length ? 'FALLA' : 'OK', e.nombre, difs.join('\n')]);
      await pv.context().close(); await pn.context().close();
    } catch (err) { resultados.push(['FALLA', e.nombre, err.message.split('\n').slice(0, 3).join(' ')]); }
  }
  await nav.close(); servidor.close(); fs.rmSync(VIEJO, { recursive: true, force: true });
  for (const r of resultados) console.log(r[0].padEnd(5), r[1], r[2] ? '\n   ' + r[2] : '');
  const fallas = resultados.filter((r) => r[0] !== 'OK').length;
  console.log(`\n${resultados.length - fallas}/${resultados.length} escenarios iguales a la versión original`);
  process.exitCode = fallas ? 1 : 0;
})();
