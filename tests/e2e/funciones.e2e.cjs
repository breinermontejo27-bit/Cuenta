// Etapa 10 · Funciones que no tenían prueba propia y prueba de estrés.
// G. Tema oscuro, importar contacto, poco stock y categorías, detalles del asistente de venta, apartado sin pagar,
//    imprimir, compartir PDF (con y sin "compartir" del teléfono) y reducción de fotos.
// S. Estrés: 600 operaciones al azar con la lógica real; después de CADA una, los datos deben seguir siendo
//    válidos; al final, recargar y respaldar/restaurar no debe cambiar nada.
// Uso: node tests/e2e/funciones.e2e.cjs   (requiere playwright). Datos ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8830, BASE = `http://localhost:${PUERTO}`;
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
const DATOS = {
  cuentas_config: { nombre: 'Tienda G', moneda: '$', impuesto: 0, siguienteFolio: 12, stockMinimo: 3 },
  cuentas_clientes: [{ id: 'c1', nombre: 'Ana', telefono: '3001112233', email: '', direccion: '' }],
  cuentas_inventario: [
    { id: 'p1', nombre: 'Camisa', precio: 50000, costo: 30000, stock: 20, categoria: 'Ropa' },
    { id: 'p2', nombre: 'Gorra', precio: 20000, costo: 8000, stock: 2, categoria: 'Accesorios' },
    { id: 'p3', nombre: 'Anillo', precio: 90000, costo: 40000, stock: 1, categoria: 'Joyería', sinAlerta: true },
  ],
  cuentas_ventas: [{ id: 'v1', folio: 11, creadoTs: 1, clienteId: 'c1', clienteNombre: 'Ana', fecha: '2026-11-01', items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 1 }], total: 50000, costoTotal: 30000, metodoPago: 'efectivo', fiado: false, abonos: [] }],
  cuentas_gastos: [{ id: 'g1', tipo: 'compra', productoId: 'p1', cantidad: 4, descripcion: 'Compra de inventario: Camisa', monto: 120000, fecha: '2026-10-01', categoria: 'Inventario', metodo: 'efectivo' }],
  cuentas_movimientos: [],
  cuentas_pedidos: [{ id: 'pd1', tipo: 'apartado', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana', fechaEntrega: '', anticipo: 0, descuentoPct: 0, abonos: [{ id: 'a1', fecha: '2026-11-01', monto: 10000, metodo: 'efectivo', nota: '' }], items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 1 }], notas: '', creadoTs: 1 }],
};

async function pagina(nav, opciones = {}, preparar = null) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true, ...opciones });
  if (preparar) await ctx.addInitScript(preparar);
  const p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', (e) => p.errores.push(e.message));
  await p.goto(BASE + '/index.html');
  await p.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, DATOS);
  await p.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('orisma'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await p.reload();
  await p.waitForSelector('#contenido .lista');
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  return p;
}
const ir = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await p.waitForTimeout(120); };
const cerrar = (p) => p.evaluate(() => import('./src/core/navigation.js').then((m) => m.cerrarTodasLasHojas()));

(async () => {
  const nav = await chromium.launch();

  // ================= G. Funciones sin prueba propia =================
  await caso('G1 · tema oscuro automático (0.7): fondo oscuro, texto claro y contraste suficiente en todas las pestañas', async () => {
    const p = await pagina(nav, { colorScheme: 'dark' });
    for (const h of ['#/clientes', '#/inventario/productos', '#/ventas/ventas', '#/facturas', '#/gastos', '#/reportes/resumen', '#/ajustes']) {
      await ir(p, h);
      const r = await p.evaluate(() => {
        const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const fondo = getComputedStyle(document.body).backgroundColor;
        const titulo = document.querySelector('#contenido .fila-titulo, #contenido h2, #contenido h3, #contenido strong') || document.querySelector('h1');
        const texto = getComputedStyle(titulo).color;
        const [a, b] = [lum(fondo), lum(texto)].sort((x, y) => y - x);
        return { fondo: lum(fondo), contraste: (a + 0.05) / (b + 0.05) };
      });
      afirmar(r.fondo < 0.05, `${h}: el fondo no es oscuro`);
      afirmar(r.contraste >= 4.5, `${h}: contraste ${r.contraste.toFixed(2)}`);
    }
    afirmar(!p.errores.length, p.errores.join(' | '));
    await p.context().close();
  });

  await caso('G2 · importar un contacto del teléfono (1.5) llena el formulario de cliente', async () => {
    const p = await pagina(nav, {}, () => { navigator.contacts = { select: async () => [{ name: ['Marta Ríos'], tel: ['310 555 6677'], email: ['marta@x.co'] }] }; });
    await ir(p, '#/clientes');
    await p.click('#accionMovil');
    await p.click(`${ULT} [data-accion="contactos"]`);
    await p.waitForFunction(() => document.querySelector('#capas #f_nombre').value === 'Marta Ríos');
    afirmar(await p.inputValue(`${ULT} #f_telefono`) === '310 555 6677' && await p.inputValue(`${ULT} #f_email`) === 'marta@x.co', 'teléfono o correo');
    await p.context().close();
  });

  const p = await pagina(nav);
  await caso('G3 · aviso de poco stock (2.1.4–2.1.5): cuenta, abre el panel con los bajos y los sin aviso', async () => {
    await ir(p, '#/inventario/productos');
    const aviso = await p.textContent('#contenido [data-accion="poco-stock"]');
    afirmar(aviso.includes('Poco stock (1)') && aviso.includes('Gorra'), aviso);
    await p.click('#contenido [data-accion="poco-stock"]');
    const t = await p.textContent(ULT);
    afirmar(t.includes('Gorra') && t.includes('Anillo'), 'el panel no muestra bajos y sin aviso: ' + t.slice(0, 200));
    await cerrar(p);
  });
  await caso('G4 · filtro por categoría (2.1.2) y búsqueda dentro de la categoría', async () => {
    await ir(p, '#/inventario/productos');
    await p.click('#contenido [data-grupo="categoria"] [data-valor="Accesorios"]');
    const nombres = await p.$$eval('#contenido .fila .fila-titulo', (x) => x.map((e) => e.textContent));
    afirmar(nombres.join() === 'Gorra', nombres.join());
    await p.click('#contenido [data-grupo="categoria"] [data-valor=""]');
    afirmar((await p.$$eval('#contenido .fila', (x) => x.length)) === 3, 'Todas');
  });
  await caso('G5 · historial de compras del producto (2.1.9): unidades, invertido y costo promedio', async () => {
    await ir(p, '#/inventario/productos');
    await p.click('#contenido .fila[data-id="p1"]');
    const t = await p.textContent(ULT);
    afirmar(t.includes('4 unid.') && t.includes('120.000,00') && t.includes('30.000,00'), t.slice(0, 400));
    await cerrar(p);
  });
  await caso('G6 · asistente (3.2.4, 3.2.11, 3.2.18): +/−, tope de stock, precio rebajado marcado, ganancia y "Atrás" conserva el carrito', async () => {
    await ir(p, '#/ventas/ventas');
    await p.click('#accionMovil');
    await p.click(`${ULT} .fila[data-cliente="c1"]`);
    await p.fill(`${ULT} #w_producto`, 'gor');
    await p.click(`${ULT} [data-producto="p2"]`);
    await p.click(`${ULT} .item-carrito [data-mas]`);
    await p.click(`${ULT} .item-carrito [data-mas]`); // la Gorra tiene 2 en stock: el tercer "+" se rechaza
    afirmar((await p.textContent(`${ULT} .item-carrito .cantidad span`)).trim() === '2', 'pasó el tope de stock');
    await p.fill(`${ULT} .item-carrito .precio-unit`, '15000');
    await p.dispatchEvent(`${ULT} .item-carrito .precio-unit`, 'change');
    await p.waitForSelector(`${ULT} .item-carrito .precio-unit.rebajado`);
    await p.click(`${ULT} [data-accion="ganancia"]`);
    const g = await p.textContent(`${ULT} [data-zona="ganancia"]`);
    afirmar(g.includes('14.000,00'), 'ganancia: ' + g.slice(0, 200)); // 2 × (15.000 − 8.000)
    await p.click(`${ULT} [data-accion="atras"]`);
    await p.click(`${ULT} .fila[data-cliente="c1"]`);
    afirmar((await p.$$eval(`${ULT} .item-carrito`, (x) => x.length)) === 1, 'se perdió el carrito');
    await p.click(`${ULT} .item-carrito [data-menos]`);
    await p.click(`${ULT} .item-carrito [data-menos]`);
    afirmar(!(await p.$$eval(`${ULT} .item-carrito`, (x) => x.length)), 'el − no quitó el producto');
    await cerrar(p);
  });
  await caso('G7 · apartado sin pagar (3.3.12): no se puede entregar', async () => {
    await ir(p, '#/ventas/pendientes');
    await p.evaluate(() => document.querySelectorAll('#contenido details').forEach((d) => { d.open = true; }));
    await p.click('#contenido .fila[data-pendiente="pd1"]');
    afirmar(await p.isDisabled(`${ULT} [data-accion="entregar"]`), 'el botón de entregar está activo');
    afirmar((await p.textContent(`${ULT} [data-accion="entregar"]`)).includes('Falta pagar'), 'texto');
    await cerrar(p);
  });
  await caso('G8 · búsqueda de facturas (4.2) por nombre, "f11" y "0011"', async () => {
    await ir(p, '#/facturas');
    for (const t of ['ana', 'f11', '0011']) {
      await p.fill('#campoBuscar', t);
      await p.waitForFunction(() => document.querySelectorAll('#contenido .fila[data-id]').length === 1);
    }
    await p.fill('#campoBuscar', 'f99');
    await p.waitForSelector('#contenido .vacio');
    await p.fill('#campoBuscar', '');
  });
  await caso('G9 · imprimir (4.6) abre el diálogo del navegador; la hoja de impresión solo muestra la factura', async () => {
    await p.evaluate(() => { window.__impreso = 0; window.print = () => { window.__impreso++; }; });
    await p.evaluate(() => import('./src/core/navigation.js').then((m) => m.pedirHoja('factura:ver', { ventaId: 'v1' })));
    await p.click(`${ULT} [data-accion="imprimir"]`);
    afirmar(await p.evaluate(() => window.__impreso) === 1, 'no llamó a imprimir');
    await p.emulateMedia({ media: 'print' });
    const visibles = await p.evaluate(() => [...document.querySelectorAll('.barra-sup, .pestanas, #accionMovil, .hoja-pie')].filter((e) => e.offsetParent !== null).length);
    await p.emulateMedia({ media: 'screen' });
    afirmar(visibles === 0, `al imprimir se ven ${visibles} elementos de la app`);
    await cerrar(p);
  });
  await caso('G10 · compartir PDF (4.7) con "compartir" del teléfono: envía un PDF con nombre y texto', async () => {
    await p.evaluate(() => {
      window.__compartido = null;
      navigator.canShare = () => true;
      navigator.share = async (d) => { const f = d.files[0]; window.__compartido = { nombre: f.name, tipo: f.type, tam: f.size, texto: d.text }; };
    });
    await p.evaluate(() => import('./src/core/navigation.js').then((m) => m.pedirHoja('factura:ver', { ventaId: 'v1' })));
    await p.click(`${ULT} [data-accion="pdf"]`);
    await p.waitForFunction(() => window.__compartido, null, { timeout: 15000 });
    const c = await p.evaluate(() => window.__compartido);
    afirmar(c.nombre === 'Factura-0011.pdf' && c.tipo === 'application/pdf' && c.tam > 5000 && c.texto.includes('Tienda G'), JSON.stringify(c));
    await cerrar(p);
  });
  await caso('G11 · compartir PDF sin "compartir" del teléfono: descarga el PDF y abre el chat del cliente', async () => {
    await p.evaluate(() => { delete navigator.share; navigator.canShare = undefined; window.__wa = null; window.open = (u) => { window.__wa = u; return null; }; });
    await p.evaluate(() => import('./src/core/navigation.js').then((m) => m.pedirHoja('factura:ver', { ventaId: 'v1' })));
    const [descarga] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click(`${ULT} [data-accion="pdf"]`)]);
    afirmar(descarga.suggestedFilename() === 'Factura-0011.pdf', descarga.suggestedFilename());
    await p.waitForFunction(() => window.__wa);
    afirmar((await p.evaluate(() => window.__wa)).startsWith('https://wa.me/573001112233?text='), 'no abrió el chat del cliente');
    await cerrar(p);
  });
  await caso('G12 · fotos (9.4): se reducen a 300 px (productos) y 400 px (logo) en JPEG; más de 15 MB se rechaza con mensaje', async () => {
    const r = await p.evaluate(async () => {
      const { prepararImagen } = await import('./src/services/images.js');
      const lienzo = document.createElement('canvas'); lienzo.width = 2000; lienzo.height = 1500;
      const ctx = lienzo.getContext('2d'); ctx.fillStyle = '#c33'; ctx.fillRect(0, 0, 2000, 1500);
      const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/png'));
      const archivo = new File([blob], 'foto.png', { type: 'image/png' });
      const medir = (url) => new Promise((ok) => { const i = new Image(); i.onload = () => ok([i.width, i.height]); i.src = url; });
      const a = await prepararImagen(archivo, 300), b = await prepararImagen(archivo, 400);
      let error = '';
      try { await prepararImagen({ size: 16 * 1024 * 1024 }, 300); } catch (e) { error = e.message; }
      return { a: [a.slice(0, 23), ...(await medir(a))], b: [b.slice(0, 23), ...(await medir(b))], error };
    });
    afirmar(JSON.stringify(r.a) === JSON.stringify(['data:image/jpeg;base64,', 300, 225]), JSON.stringify(r.a));
    afirmar(JSON.stringify(r.b) === JSON.stringify(['data:image/jpeg;base64,', 400, 300]), JSON.stringify(r.b));
    afirmar(r.error.includes('15 MB'), r.error);
    afirmar(!p.errores.length, p.errores.join(' | '));
  });
  await caso('G14 · eliminar cliente (1.7): pide confirmación, lo quita y conserva sus ventas', async () => {
    await ir(p, '#/clientes');
    await p.click('#contenido .fila[data-id="c1"]');
    await p.click(`${ULT} [data-accion="eliminar"]`);
    await p.click('#capas [data-accion="no"]');
    afirmar(await p.evaluate(() => import('./src/core/state.js').then((m) => m.coleccion('clientes').length)) === 1, 'borró sin confirmar');
    await p.click(`${ULT} [data-accion="eliminar"]`);
    await p.click('#capas [data-accion="si"]');
    await p.waitForFunction(() => import('./src/core/state.js').then((m) => m.coleccion('clientes').length === 0));
    afirmar(await p.evaluate(() => import('./src/core/state.js').then((m) => m.coleccion('ventas').length)) === 1, 'se perdieron sus ventas');
    await cerrar(p);
  });
  await caso('G15 · búsqueda en el historial de inventario (2.3.2): muestra solo los movimientos de ese producto', async () => {
    await ir(p, '#/inventario/historial');
    const total = await p.$$eval('#contenido .linea', (x) => x.length);
    // En estos datos todos los movimientos son de la Camisa (una venta y una compra).
    await p.fill('#campoBuscar', 'cami');
    await p.waitForTimeout(150);
    const nombres = await p.$$eval('#contenido .linea .linea-titulo', (x) => [...new Set(x.map((e) => e.textContent))]);
    afirmar(nombres.join() === 'Camisa' && total >= 2 && (await p.$$eval('#contenido .linea', (x) => x.length)) === total, `${total} → ${nombres.join()}`);
    await p.fill('#campoBuscar', 'gorra');
    await p.waitForFunction(() => !document.querySelectorAll('#contenido .linea').length);
    await p.fill('#campoBuscar', '');
  });
  await p.context().close();

  await caso('G13 · teléfono angosto (320 px): ninguna pantalla ni hoja se sale por los lados', async () => {
    const q = await pagina(nav, { viewport: { width: 320, height: 640 } });
    const desborde = () => q.evaluate(() => {
      const ancho = document.documentElement.clientWidth;
      // Lo que está dentro de una fila deslizable (p. ej. las categorías) puede quedar fuera: se ve deslizando.
      const enDeslizable = (e) => { for (let x = e.parentElement; x; x = x.parentElement) if (['auto', 'scroll'].includes(getComputedStyle(x).overflowX)) return true; return false; };
      const fuera = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > ancho + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.oculto-visual, .solo-escritorio, .documento-pdf, [hidden]') && !enDeslizable(e); });
      return { scroll: document.documentElement.scrollWidth > ancho, fuera: fuera.slice(0, 3).map((e) => e.tagName + '.' + e.className) };
    });
    const revisar = async (donde) => { const d = await desborde(); afirmar(!d.scroll && !d.fuera.length, `${donde}: ${JSON.stringify(d)}`); };
    for (const h of ['#/clientes', '#/inventario/productos', '#/inventario/stock', '#/inventario/historial', '#/ventas/ventas', '#/ventas/pendientes', '#/facturas', '#/gastos', '#/reportes/resumen', '#/reportes/caja', '#/reportes/flujo', '#/ajustes']) {
      await ir(q, h); await revisar(h);
      if (await q.isVisible('#accionMovil')) { await q.click('#accionMovil'); await q.waitForTimeout(150); await revisar(h + ' (+)'); await cerrar(q); }
    }
    for (const [hoja, params] of [['factura:ver', { ventaId: 'v1' }], ['creditos:lista', {}]]) {
      await q.evaluate(([h, x]) => import('./src/core/navigation.js').then((m) => m.pedirHoja(h, x)), [hoja, params]);
      await q.waitForTimeout(200); await revisar(hoja); await cerrar(q);
    }
    for (const sec of ['negocio', 'factura', 'productos', 'moneda', 'respaldo', 'bloqueo']) {
      await ir(q, '#/ajustes'); await q.click(`[data-seccion="${sec}"]`); await q.waitForTimeout(150); await revisar('ajustes ' + sec); await cerrar(q);
    }
    await q.context().close();
  });

  // ================= S. Estrés =================
  await caso('S1 · 600 operaciones al azar: después de cada una los datos son válidos y ningún error inesperado', async () => {
    const s = await pagina(nav);
    const r = await s.evaluate(async () => {
      const [cl, pr, pu, ex, sa, or, cr, inv, sch, st, err] = await Promise.all(['clients', 'products', 'purchases', 'expenses', 'sales', 'orders', 'credits', 'invoices'].map((m) => import(`./src/operations/${m}.js`))
        .concat([import('./src/data/schema.js'), import('./src/core/state.js'), import('./src/core/errors.js')]));
      let semilla = 20261120;
      const azar = () => ((semilla = (semilla * 1664525 + 1013904223) >>> 0) / 4294967296);
      const ent = (a, b) => a + Math.floor(azar() * (b - a + 1));
      // Si no hay nada que elegir (p. ej. ninguna venta a crédito), la operación no aplica: no es un error.
      const elegir = (l) => { if (!l.length) { const e = new Error('nada que elegir'); e.name = 'SinCandidatos'; throw e; } return l[Math.floor(azar() * l.length)]; };
      const hoy = new Date().toISOString().slice(0, 10);
      const cuenta = { hechas: 0, rechazadas: 0, porTipo: {} };
      const inesperados = [], invalidos = [];
      const ops = [
        ['cliente', () => cl.guardarCliente(null, { nombre: 'Cliente ' + ent(1, 999), telefono: '300' + ent(1000000, 9999999), email: '', direccion: '' })],
        ['producto', () => pr.guardarProducto(null, { nombre: 'Prod ' + ent(1, 999), categoria: elegir(['', 'A', 'B']), descripcion: '', costo: String(ent(0, 50) * 1000), margen: '', precio: String(ent(1, 90) * 1000), stock: elegir(['', String(ent(0, 30))]), foto: '', stockMinimo: '', sinAlerta: false, motivo: '' })],
        ['ajuste', () => { const p = elegir(st.coleccion('inventario')); return pr.guardarProducto(p.id, { ...p, costo: String(p.costo), precio: String(p.precio), stock: p.stock === '' ? '' : String(ent(0, 40)), margen: String(p.margen ?? ''), stockMinimo: String(p.stockMinimo ?? ''), motivo: 'Conteo' }); }],
        ['venta', () => {
          const inv = st.coleccion('inventario').filter((p) => p.stock === '' || Number(p.stock) > 0);
          const carrito = Array.from({ length: ent(1, 3) }, () => { const p = elegir(inv); return { productoId: p.id, nombre: p.nombre, precioCatalogo: p.precio, precioUnit: p.precio, costo: Number(p.costo) || 0, cantidad: 1, stockDisponible: p.stock }; });
          const medio = elegir(['efectivo', 'tarjeta', 'transferencia', 'credito', 'mixto']);
          return sa.registrarVenta({ clienteId: elegir(st.coleccion('clientes')).id, carrito, descuento: elegir([{ tipo: 'monto', valor: 0 }, { tipo: 'pct', valor: ent(1, 30) }, { tipo: 'monto', valor: ent(1, 20) * 1000 }]), notas: '', medio, montos: { abonoInicial: ent(0, 50) * 1000, medioAbono: elegir(['efectivo', 'tarjeta']), efectivo: ent(0, 60) * 1000, tarjeta: ent(0, 60) * 1000 } });
        }],
        ['abono venta', () => { const v = elegir(st.coleccion('ventas').filter((x) => x.fiado)); return cr.abonarVenta(v.id, { monto: String(ent(1, 80) * 1000), fecha: hoy, nota: '', metodo: elegir(['efectivo', 'tarjeta']) }); }],
        ['liquidar', () => cr.liquidarDeuda(elegir(st.coleccion('clientes')).id, elegir(['efectivo', 'tarjeta']))],
        ['gasto', () => ex.crearGasto({ descripcion: 'Gasto ' + ent(1, 99), monto: String(ent(1, 90) * 1000), fecha: hoy, categoria: elegir(['', 'Local']), metodo: elegir(['efectivo', 'tarjeta']) })],
        ['compra', () => { const p = elegir(st.coleccion('inventario')); return pu.comprarDesdeProducto(p.id, { cantidad: String(ent(1, 10)), costoUnitario: String(ent(1, 50) * 1000), fecha: hoy, precioNuevo: '', margenNuevo: '' }); }],
        ['compra gastos', () => pu.comprarDesdeGastos(azar() < 0.5 ? null : elegir(st.coleccion('inventario')).id, { nombreNuevo: 'Nuevo ' + ent(1, 999), cantidad: String(ent(1, 5)), costoUnitario: String(ent(1, 20) * 1000), fecha: hoy, precioNuevo: String(ent(21, 40) * 1000), margenNuevo: '', metodo: 'efectivo' })],
        ['pendiente', () => {
          const p = elegir(st.coleccion('inventario'));
          return or.crearPendienteDesdeAsistente({ tipo: elegir(['pedido', 'encargo', 'apartado']), clienteId: elegir(st.coleccion('clientes')).id, carrito: [{ productoId: p.id, nombre: p.nombre, precioCatalogo: p.precio, precioUnit: p.precio, costo: Number(p.costo) || 0, cantidad: ent(1, 2), stockDisponible: p.stock }], fecha: hoy, anticipo: String(ent(0, 3) * 5000), fechaAnticipo: hoy, metodo: 'efectivo', notas: '' });
        }],
        ['abono pendiente', () => or.abonar(elegir(st.coleccion('pedidos').filter((x) => x.estado === 'pendiente')).id, { monto: String(ent(1, 60) * 1000), fecha: hoy, metodo: elegir(['efectivo', 'tarjeta']) }, (n) => String(n))],
        ['entregar', () => { const x = elegir(st.coleccion('pedidos').filter((y) => y.estado === 'pendiente')); return or.entregar(x.id, x.tipo === 'apartado' ? undefined : { pagaAhora: azar() < 0.5, metodo: elegir(['efectivo', 'tarjeta']) }); }],
        ['cancelar', () => or.cancelar(elegir(st.coleccion('pedidos').filter((y) => y.estado === 'pendiente')).id)],
        ['comprobante', () => or.generarComprobante(elegir(st.coleccion('pedidos')).id)],
        ['factura', () => inv.generarFactura(elegir(st.coleccion('ventas').filter((v) => !v.folio)).id)],
        ['editar factura', () => { const v = elegir(st.coleccion('ventas').filter((x) => x.folio)); return inv.editarFactura(v.id, { nombre: v.clienteNombre + ' ', direccion: 'Calle ' + ent(1, 99), telefono: v.clienteTelefono || '', email: '', fecha: hoy, notas: 'n' }); }],
        ['anular', () => sa.anularVenta(elegir(st.coleccion('ventas')).id)],
        ['borrar gasto', () => ex.eliminarGasto(elegir(st.coleccion('gastos')).id)],
        ['borrar producto', () => pr.eliminarProducto(elegir(st.coleccion('inventario')).id)],
      ];
      for (let i = 0; i < 600; i++) {
        const [nombre, fn] = i < 15 ? ops[i % 2] : elegir(ops);
        try {
          await fn();
          cuenta.hechas++;
          cuenta.porTipo[nombre] = (cuenta.porTipo[nombre] || 0) + 1;
        } catch (e) {
          // Un rechazo de negocio o de validación es correcto (p. ej. no hay stock).
          if (e instanceof err.ErrorDeNegocio || e instanceof err.ErrorDeValidacion || e.name === 'SinCandidatos') cuenta.rechazadas++;
          else inesperados.push(`${i} ${nombre}: ${e.name} ${e.message} @ ${(e.stack || '').split('\n')[1]}`);
        }
        const colecciones = Object.fromEntries(['clientes', 'inventario', 'ventas', 'gastos', 'pedidos', 'movimientos'].map((c) => [c, st.coleccion(c)]));
        const rev = sch.revisarDatos({ colecciones, ajustes: st.obtenerAjustes() }, 'estricto');
        if (rev.errores.length) invalidos.push(`${i} ${nombre}: ${rev.errores.slice(0, 2).join('; ')}`);
        if (inesperados.length + invalidos.length > 3) break;
      }
      const memoria = JSON.stringify(Object.fromEntries(['clientes', 'inventario', 'ventas', 'gastos', 'pedidos', 'movimientos'].map((c) => [c, st.coleccion(c)])));
      const conteos = Object.fromEntries(['clientes', 'inventario', 'ventas', 'gastos', 'pedidos', 'movimientos'].map((c) => [c, st.coleccion(c).length]));
      return { cuenta, inesperados, invalidos, memoria, conteos, ajustes: JSON.stringify(st.obtenerAjustes()) };
    });
    afirmar(!r.inesperados.length, 'errores inesperados: ' + r.inesperados.join(' | '));
    afirmar(!r.invalidos.length, 'datos inválidos: ' + r.invalidos.join(' | '));
    afirmar(r.cuenta.hechas >= 300 && Object.keys(r.cuenta.porTipo).length >= 17, 'pocas operaciones distintas: ' + JSON.stringify(r.cuenta));
    console.log('      estrés:', JSON.stringify(r.cuenta), JSON.stringify(r.conteos));
    // Recargar: lo guardado es exactamente lo que había en memoria.
    await s.reload(); await s.waitForSelector('#contenido');
    const tras = await s.evaluate(() => import('./src/core/state.js').then((st) => [JSON.stringify(Object.fromEntries(['clientes', 'inventario', 'ventas', 'gastos', 'pedidos', 'movimientos'].map((c) => [c, st.coleccion(c)]))), JSON.stringify(st.obtenerAjustes())]));
    afirmar(tras[0] === r.memoria && tras[1] === r.ajustes, 'al recargar los datos no son iguales a los de memoria');
    // Respaldo → restaurar: los mismos datos.
    const ida = await s.evaluate(async () => {
      const b = await import('./src/operations/backup.js');
      const { texto } = await b.prepararRespaldo();
      const a = b.analizarRespaldo(texto);
      if (!a.ok) return 'respaldo inválido: ' + a.errores.slice(0, 3).join('; ');
      await b.restaurarRespaldo(a);
      const st = await import('./src/core/state.js');
      return JSON.stringify(Object.fromEntries(['clientes', 'inventario', 'ventas', 'gastos', 'pedidos', 'movimientos'].map((c) => [c, st.coleccion(c)])));
    });
    afirmar(ida === r.memoria, typeof ida === 'string' && ida.startsWith('respaldo') ? ida : 'el respaldo restaurado no es igual');
    // Todas las pantallas se dibujan con estos datos.
    for (const h of ['#/clientes', '#/inventario/productos', '#/inventario/stock', '#/inventario/historial', '#/ventas/ventas', '#/ventas/pendientes', '#/facturas', '#/gastos', '#/reportes/resumen', '#/reportes/caja', '#/reportes/flujo']) await ir(s, h);
    const anotados = await s.evaluate(() => import('./src/core/errors.js').then((m) => m.erroresRegistrados()));
    afirmar(!anotados.length && !s.errores.length, JSON.stringify(anotados).slice(0, 300) + s.errores.join(' | '));
    await s.context().close();
  });

  await nav.close();
  servidor.close();
  for (const [e, nombre, d, ms] of resultados) console.log(`${e.padEnd(5)} ${nombre} ${d ? '→ ' + d : ''} (${ms} ms)`);
  const ok = resultados.filter((r) => r[0] === 'OK').length;
  console.log(`\n${ok}/${resultados.length} casos correctos`);
  process.exit(ok === resultados.length ? 0 : 1);
})();
