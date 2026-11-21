// Etapa 8 · Integración y seguridad, de extremo a extremo en Chromium.
// A. Datos con código malicioso (en la versión anterior y en respaldos): nada se ejecuta en ninguna pantalla.
// B. Respaldos manipulados: se rechazan sin cambiar nada.
// C. Bloqueo con PIN: activar, pedir al abrir, intentos con espera, cambiar, quitar y "olvidé mi PIN".
// D. Registro de errores: sobrevive a recargar y se puede descargar.
// E. Recorrido integrado sin conexión: importar, vender, facturar, PDF y respaldo, sin red.
// Uso: node tests/e2e/seguridad.e2e.cjs   (requiere playwright). Todos los datos son ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

const RAIZ = path.join(__dirname, '..', '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const PUERTO = 8790, BASE = `http://localhost:${PUERTO}`;
const servidor = http.createServer((q, r) => {
  const rel = decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html';
  const p = path.join(RAIZ, rel);
  if (!p.startsWith(RAIZ)) { r.writeHead(403); return r.end(); }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
}).listen(PUERTO);

const resultados = [];
async function caso(nombre, fn) {
  const t = Date.now();
  try { await fn(); resultados.push(['OK', nombre, '', Date.now() - t]); } catch (e) { resultados.push(['FALLA', nombre, e.message.split('\n')[0], Date.now() - t]); }
}
const afirmar = (c, m) => { if (!c) throw new Error(m); };

// Cada texto lleva un intento distinto de inyectar código. Si alguno se ejecuta, window.__xss cambia.
const X = [
  '<img src=x onerror="window.__xss=(window.__xss||0)+1">',
  '"><svg onload="window.__xss=(window.__xss||0)+1">',
  "'><script>window.__xss=(window.__xss||0)+1</script>",
  '<a href="javascript:window.__xss=1">enlace</a>',
  '<iframe srcdoc="<script>parent.__xss=1</script>"></iframe>',
  '{{constructor.constructor("window.__xss=1")()}}',
];
const x = (i, base) => `${base} ${X[i % X.length]}`;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SEMILLA = {
  cuentas_config: {
    nombre: x(0, 'Tienda'), moneda: x(1, '$'), impuesto: 0, siguienteFolio: 3, siguienteComprobante: 2, direccion: x(2, 'Calle'),
    telefono: x(3, '300'), email: x(4, 'a@b.co'), logo: 'javascript:window.__xss=1', fotoPerfil: 'x" onerror="window.__xss=1',
    firmaImg: 'data:text/html;base64,PHNjcmlwdD5wYXJlbnQuX194c3M9MTwvc2NyaXB0Pg==', facturaTitulo: x(5, 'FACTURA'), facturaPie: x(0, 'Gracias'),
    tengaTexto: x(1, 'Cambios'), colorFactura: 'red;background:url(http://ejemplo.invalido/x.png)', mostrarFotos: true, mostrarFirma: true, mostrarSello: true,
  },
  cuentas_clientes: [
    { id: 'c1', nombre: x(0, 'Ana'), telefono: 'javascript:window.__xss=1//3001112233', email: x(1, 'ana'), direccion: x(2, 'Cra') },
    { id: 'c2', nombre: x(3, 'Luis'), telefono: '3009998877', email: '', direccion: '' },
  ],
  cuentas_inventario: [
    { id: 'p1', nombre: x(4, 'Camisa'), precio: 50000, costo: 30000, stock: 10, categoria: x(5, 'Ropa'), descripcion: x(0, 'Algodón'), foto: PNG, margen: 67 },
    { id: 'p2', nombre: x(1, 'Gorra'), precio: 20000, costo: 8000, stock: 1, categoria: '', foto: 'x" onerror="window.__xss=1' },
  ],
  cuentas_ventas: [
    { id: 'v1', folio: 1, creadoTs: 1, clienteId: 'c1', clienteNombre: x(0, 'Ana'), clienteDireccion: x(2, 'Cra'), clienteTelefono: x(3, '300'), clienteEmail: x(4, 'e'), fecha: '2026-11-01',
      items: [{ productoId: 'p1', nombre: x(1, 'Camisa'), precio: 50000, cantidad: 2, caracteristicas: x(2, 'Talla M'), foto: PNG, costo: 30000 }],
      sumaItems: 100000, descuentoTipo: 'pct', descuentoPct: 0, descuentoMonto: 0, subtotal: 100000, impuesto: 0, total: 100000, costoTotal: 60000, gananciaEstimada: 40000,
      notas: x(3, 'Nota'), metodoPago: 'credito', fiado: true, abonos: [{ id: 'a1', fecha: '2026-11-01', monto: 30000, metodo: 'efectivo', nota: x(4, 'Abono') }] },
    { id: 'v2', creadoTs: 2, clienteId: 'c2', clienteNombre: x(3, 'Luis'), fecha: '2026-11-02', items: [{ productoId: 'p2', nombre: x(5, 'Gorra'), precio: 20000, cantidad: 1, costo: 8000 }],
      sumaItems: 20000, subtotal: 20000, impuesto: 0, total: 20000, costoTotal: 8000, gananciaEstimada: 12000, notas: '', metodoPago: 'efectivo', fiado: false, abonos: [] },
  ],
  cuentas_gastos: [{ id: 'g1', tipo: 'general', metodo: 'efectivo', descripcion: x(0, 'Arriendo'), monto: 300000, fecha: '2026-11-02', categoria: x(1, 'Local') }],
  cuentas_movimientos: [{ id: 'm1', tipo: 'ajuste', ts: 1, productoId: 'p1', productoNombre: x(2, 'Camisa'), fecha: '2026-11-01', stockAnterior: 8, stockNuevo: 10, cantidad: 2, motivo: x(3, 'Conteo') }],
  cuentas_pedidos: [
    { id: 'pd1', tipo: 'pedido', estado: 'pendiente', clienteId: 'c1', clienteNombre: x(4, 'Ana'), fechaEntrega: '2026-11-30', anticipo: 10000, anticipoMetodo: 'efectivo', fechaAnticipo: '2026-11-01',
      descuentoPct: 0, abonos: [{ id: 'a2', fecha: '2026-11-03', monto: 5000, metodo: 'tarjeta', nota: x(5, 'Abono') }], items: [{ productoId: 'p1', nombre: x(0, 'Camisa'), precio: 50000, cantidad: 1, caracteristicas: x(1, 'Roja') }], notas: x(2, 'Urgente'), creadoTs: 3 },
    { id: 'pd2', tipo: 'apartado', estado: 'pendiente', clienteId: 'c2', clienteNombre: x(3, 'Luis'), fechaEntrega: '', anticipo: 0, descuentoPct: 0, abonos: [], items: [{ productoId: 'p2', nombre: x(4, 'Gorra'), precio: 20000, cantidad: 1 }], notas: '', creadoTs: 4 },
  ],
};

async function nuevaPagina(nav, opciones = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true, ...opciones });
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    window.__abiertas = [];
    window.open = (u) => { window.__abiertas.push(String(u)); return null; };
  });
  const p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', (e) => p.errores.push(e.message));
  p.peticionesExternas = [];
  p.on('request', (q) => { if (!q.url().startsWith(BASE) && !q.url().startsWith('data:') && !q.url().startsWith('blob:')) p.peticionesExternas.push(q.url()); });
  return p;
}
async function sembrar(p, datos) {
  await p.goto(BASE + '/index.html');
  await p.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, datos);
  await p.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('orisma'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await p.reload();
  await p.waitForSelector('#contenido .lista, #contenido .vacio, #contenido .panel-hoy');
}
// Revisión de la página: nada se ejecutó, no hay atributos de evento, ni scripts, ni marcos, ni enlaces javascript:.
async function revisar(p, donde) {
  const r = await p.evaluate(() => {
    const raros = [];
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes) {
        if (/^on/i.test(a.name)) raros.push(`${el.tagName} ${a.name}`);
        if (/^(href|src|xlink:href|action|formaction)$/i.test(a.name) && /^\s*(javascript|data:text)/i.test(a.value)) raros.push(`${el.tagName} ${a.name}=${a.value.slice(0, 30)}`);
      }
    }
    const scripts = [...document.scripts].map((s) => s.getAttribute('src') || 'EN LÍNEA').filter((s) => !/^(src\/app\.js|assets\/vendor\/(html2canvas|jspdf\.umd)\.min\.js)$/.test(s));
    const marcos = document.querySelectorAll('iframe, object, embed').length;
    return { xss: window.__xss, raros, scripts, marcos, csp: window.__csp.slice() };
  });
  afirmar(!r.xss, `${donde}: se ejecutó código inyectado`);
  afirmar(!r.raros.length, `${donde}: atributos peligrosos: ${r.raros.slice(0, 3).join(' | ')}`);
  afirmar(!r.scripts.length, `${donde}: scripts inesperados: ${r.scripts.join(' | ')}`);
  afirmar(!r.marcos, `${donde}: marcos insertados`);
  afirmar(!r.csp.length, `${donde}: violaciones de la política de seguridad: ${r.csp.slice(0, 3).join(' | ')}`);
}
const cerrarHojas = (p) => p.evaluate(() => import('./src/core/navigation.js').then((m) => m.cerrarTodasLasHojas()));
const irA = async (p, hash) => { await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForTimeout(150); };

(async () => {
  const nav = await chromium.launch();

  // ================= A. Código inyectado en los datos =================
  const p = await nuevaPagina(nav);
  await sembrar(p, SEMILLA);
  await caso('A1 · la importación conserva los textos tal cual; solo los ajustes dañados vuelven al valor por defecto (la copia literal queda)', async () => {
    const nombre = await p.evaluate(() => import('./src/core/state.js').then((m) => m.coleccion('clientes')[0].nombre));
    afirmar(nombre === SEMILLA.cuentas_clientes[0].nombre, 'el texto cambió al importar');
    const aj = await p.evaluate(() => import('./src/core/state.js').then((m) => m.obtenerAjustes()));
    afirmar(aj.nombre === SEMILLA.cuentas_config.nombre && aj.logo === '' && aj.fotoPerfil === '' && aj.firmaImg === '' && aj.colorFactura === '#1E4FA0', 'ajustes dañados no se sanearon');
    const copia = await p.evaluate(async () => { const db = await import('./src/data/database.js'); const [r] = await db.listarRespaldos(); return db.leerRespaldo(r.id); });
    afirmar(copia.includes('javascript:window.__xss=1'), 'la copia literal de lo original no se conservó');
    await revisar(p, 'inicio');
  });
  const rutas = ['#/clientes', '#/inventario/productos', '#/inventario/stock', '#/inventario/historial', '#/ventas/ventas', '#/ventas/pendientes', '#/facturas', '#/gastos', '#/reportes/resumen', '#/reportes/caja', '#/reportes/flujo', '#/ajustes'];
  await caso(`A2 · ${rutas.length} pantallas y cada una de sus filas abiertas: nada se ejecuta y el texto se ve literal`, async () => {
    let filas = 0;
    for (const r of rutas) {
      await irA(p, r);
      await p.evaluate(() => document.querySelectorAll('#contenido details').forEach((d) => { d.open = true; }));
      await revisar(p, r);
      const n = await p.locator('#contenido button.fila').count();
      for (let i = 0; i < n; i++) {
        await p.evaluate(() => document.querySelectorAll('#contenido details').forEach((d) => { d.open = true; }));
        const b = p.locator('#contenido button.fila').nth(i);
        if (!(await b.isVisible())) continue;
        await b.click();
        await p.waitForTimeout(120);
        await revisar(p, `${r} fila ${i + 1}`);
        filas++;
        await cerrarHojas(p);
        await irA(p, r);
      }
    }
    afirmar(filas >= 15, `solo se abrieron ${filas} filas`);
    const texto = await p.evaluate(() => { location.hash = '#/clientes'; return new Promise((ok) => setTimeout(() => ok(document.querySelector('#contenido').textContent), 150)); });
    afirmar(texto.includes('<img src=x onerror='), 'el texto no se muestra literal');
  });
  await caso('A3 · factura, comprobante y vista de créditos con datos maliciosos', async () => {
    await p.evaluate(() => import('./src/core/navigation.js').then((m) => m.pedirHoja('factura:ver', { ventaId: 'v1' })));
    await p.waitForSelector('#capas .documento');
    await revisar(p, 'factura');
    const color = await p.evaluate(() => getComputedStyle(document.querySelector('#capas .documento')).getPropertyValue('--color-factura').trim());
    afirmar(color === '#1E4FA0', `color no saneado: ${color}`);
    await cerrarHojas(p);
    await p.evaluate(() => import('./src/core/navigation.js').then((m) => m.pedirHoja('creditos:lista', {})));
    await p.waitForTimeout(200);
    await revisar(p, 'créditos');
    await cerrarHojas(p);
    await irA(p, '#/ventas/pendientes');
    await p.evaluate(() => document.querySelectorAll('#contenido details').forEach((d) => { d.open = true; }));
    await p.click('#contenido .fila[data-pendiente="pd1"]');
    await p.waitForTimeout(150);
    await p.click('#capas [data-accion="comprobante"]');
    await p.waitForSelector('#capas .documento');
    await revisar(p, 'comprobante');
    await cerrarHojas(p);
  });
  await caso('A4 · WhatsApp con un teléfono malicioso solo abre wa.me con dígitos', async () => {
    const u = await p.evaluate(() => import('./src/services/whatsapp.js').then((m) => { m.abrirWhatsApp('javascript:window.__xss=1//3001112233', '<b>hola</b>'); return window.__abiertas.pop(); }));
    afirmar(/^https:\/\/wa\.me\/\d*\?text=/.test(u) && !u.includes('javascript'), u);
  });
  await caso('A5 · PDF de la factura con datos maliciosos: se genera sin red y sin violar la política de seguridad', async () => {
    const r = await p.evaluate(async () => {
      const pdf = await import('./src/services/pdf.js');
      const doc = await import('./src/features/invoices/invoice-document.js');
      const st = await import('./src/core/state.js');
      const { html, montar } = await import('./src/ui/html.js');
      const nodo = document.createElement('div');
      nodo.className = 'documento-pdf';
      document.body.append(nodo);
      montar(nodo, html`${doc.documento(st.coleccion('ventas').find((v) => v.id === 'v1'))}`);
      doc.aplicarColor(nodo);
      const blob = await pdf.crearPdf(nodo);
      nodo.remove();
      const cabecera = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 5).arrayBuffer()));
      return { tam: blob.size, cabecera };
    });
    afirmar(r.cabecera === '%PDF-' && r.tam > 5000, `PDF inválido (${r.cabecera}, ${r.tam} bytes)`);
    await revisar(p, 'tras generar PDF');
  });
  await caso('A6 · ninguna petición a otro servidor y ningún error de JavaScript en todo el recorrido', async () => {
    afirmar(!p.peticionesExternas.length, p.peticionesExternas.slice(0, 3).join(' | '));
    afirmar(!p.errores.length, p.errores.slice(0, 3).join(' | '));
  });
  await p.context().close();

  // D4-23: en la original, un registro sin fecha o sin nombre impedía abrir una pestaña.
  await caso('A7 · registros antiguos incompletos (sin fecha, sin nombre, números como texto) no rompen ninguna pantalla', async () => {
    const q = await nuevaPagina(nav);
    await sembrar(q, {
      cuentas_clientes: [{ id: 'c1' }, { id: 'c2', nombre: 12345 }],
      cuentas_inventario: [{ id: 'p1', nombre: null, precio: '5000', costo: 'abc', stock: '3' }, { id: 'p2' }],
      cuentas_ventas: [{ id: 'v1', items: [{ nombre: 'X', precio: '100', cantidad: '2' }], total: '200' }, { id: 'v2', clienteNombre: null, fecha: null, folio: 7 }],
      cuentas_gastos: [{ id: 'g1', monto: '50' }, { id: 'g2', descripcion: 'Sin fecha', monto: 10 }],
      cuentas_pedidos: [{ id: 'pd1', items: [{ nombre: 'Y' }] }],
      cuentas_movimientos: [{ id: 'm1' }],
    });
    for (const r of rutas) {
      await irA(q, r);
      await q.evaluate(() => document.querySelectorAll('#contenido details').forEach((d) => { d.open = true; }));
      const n = await q.locator('#contenido button.fila').count();
      for (let i = 0; i < n; i++) {
        const b = q.locator('#contenido button.fila').nth(i);
        if (!(await b.isVisible())) continue;
        await b.click(); await q.waitForTimeout(100);
        await cerrarHojas(q); await irA(q, r);
        await q.evaluate(() => document.querySelectorAll('#contenido details').forEach((d) => { d.open = true; }));
      }
    }
    afirmar(!q.errores.length, q.errores.slice(0, 3).join(' | '));
    const anotados = await q.evaluate(() => import('./src/core/errors.js').then((m) => m.erroresRegistrados().map((e) => `${e.contexto}: ${e.mensaje}`)));
    afirmar(!anotados.length, anotados.slice(0, 3).join(' | '));
    afirmar(!(await q.locator('.toast.grave').count()), 'apareció un aviso de error: ' + (await q.locator('.toast.grave').allTextContents()).join(' | '));
    await q.context().close();
  });

  // ================= B. Respaldos manipulados =================
  const b = await nuevaPagina(nav);
  await sembrar(b, { cuentas_clientes: [{ id: 'k1', nombre: 'Queda' }], cuentas_inventario: [], cuentas_ventas: [], cuentas_gastos: [] });
  const respaldoBase = () => ({ app: 'orisma', version: 3, esquema: 1, fecha: '2026-11-20', datos: { clientes: [{ id: 'c1', nombre: 'Nuevo' }], inventario: [], ventas: [], gastos: [], pedidos: [], movimientos: [], config: { nombre: 'X' } } });
  const MALOS = [
    ['contaminación de prototipos en la configuración', (r) => r.replace('"config":{', '"config":{"__proto__":{"esAdmin":true},')],
    ['clave "constructor" en un cliente', (r) => r.replace('"nombre":"Nuevo"', '"nombre":"Nuevo","constructor":{"prototype":{"x":1}}')],
    ['imagen con javascript:', (r) => r.replace('"config":{', '"config":{"logo":"javascript:alert(1)",')],
    ['imagen data:text/html', (r) => r.replace('"config":{', '"config":{"firmaImg":"data:text/html;base64,PHNjcmlwdD4=",')],
    ['color con reglas de estilo', (r) => r.replace('"config":{', '"config":{"colorFactura":"red;background:url(x)",')],
    ['identificador con comillas', (r) => r.replace('"id":"c1"', '"id":"c1\\" onclick=\\"x"')],
    ['número que no es número', (r) => r.replace('"ventas":[]', '"ventas":[{"id":"v1","clienteNombre":"A","fecha":"2026-11-01","items":[],"total":"mucho"}]')],
    ['esquema de una versión futura', (r) => r.replace('"esquema":1', '"esquema":99')],
    ['no es JSON', () => '{"app":"orisma",'],
  ];
  for (const [nombre, dañar] of MALOS) {
    await caso(`B · respaldo con ${nombre}: se rechaza y no cambia nada`, async () => {
      const archivo = path.join(os.tmpdir(), 'respaldo-malo.json');
      fs.writeFileSync(archivo, dañar(JSON.stringify(respaldoBase())));
      await irA(b, '#/ajustes'); await cerrarHojas(b);
      await b.click('[data-seccion="respaldo"]');
      await b.setInputFiles('#capas [data-accion="archivo"]', archivo);
      await b.waitForSelector('#capas .banner.error', { timeout: 3000 });
      afirmar(!(await b.locator('#capas [data-accion="restaurar"]').count()), 'ofreció restaurar');
      const r = await b.evaluate(() => import('./src/core/state.js').then((m) => ({ c: m.coleccion('clientes').map((c) => c.nombre), proto: ({}).esAdmin, x: ({}).x })));
      afirmar(r.c.length === 1 && r.c[0] === 'Queda', 'cambió los datos');
      afirmar(r.proto === undefined && r.x === undefined, 'se contaminó el prototipo');
      await revisar(b, nombre);
      await cerrarHojas(b);
    });
  }
  await caso('B · el mismo respaldo sin daños sí se restaura (el control no bloquea lo válido)', async () => {
    const archivo = path.join(os.tmpdir(), 'respaldo-bueno.json');
    fs.writeFileSync(archivo, JSON.stringify(respaldoBase()));
    await irA(b, '#/ajustes'); await cerrarHojas(b);
    await b.click('[data-seccion="respaldo"]');
    await b.setInputFiles('#capas [data-accion="archivo"]', archivo);
    await b.click('#capas [data-accion="restaurar"]');
    await b.click('#capas [data-accion="si"]');
    await b.waitForFunction(() => import('./src/core/state.js').then((m) => m.coleccion('clientes')[0].nombre === 'Nuevo'), null, { timeout: 5000 });
  });
  await b.context().close();

  // ================= C. Bloqueo con PIN =================
  const c = await nuevaPagina(nav);
  await sembrar(c, { cuentas_config: { nombre: 'Tienda Candado' }, cuentas_clientes: [{ id: 'k1', nombre: 'Cliente Secreto' }], cuentas_inventario: [], cuentas_ventas: [], cuentas_gastos: [] });
  const abrirSeccionBloqueo = async () => { await irA(c, '#/ajustes'); await cerrarHojas(c); await c.click('[data-seccion="bloqueo"]'); await c.waitForSelector('#capas #b_nuevo'); };
  const recargar = async () => { await c.reload(); await c.waitForSelector('.bloqueo, #contenido .lista, #contenido .vacio'); };
  const entrarCon = async (pin) => { await c.fill('.bloqueo #pin_entrar', pin); await c.click('.bloqueo [data-accion="entrar"]'); };
  await caso('C1 · sin PIN la app abre directo y Ajustes dice "Sin PIN"', async () => {
    afirmar(!(await c.locator('.bloqueo').count()), 'pidió PIN sin estar activado');
    await irA(c, '#/ajustes');
    await c.waitForFunction(() => document.querySelector('[data-resumen="bloqueo"]').textContent === 'Sin PIN');
  });
  await caso('C2 · validaciones al activar: menos de 4 números, letras y PIN distintos', async () => {
    await abrirSeccionBloqueo();
    for (const [pin, rep, campo] of [['12', '12', 'b_nuevo'], ['12ab', '12ab', 'b_nuevo'], ['1234', '1243', 'b_repite']]) {
      await c.fill('#capas #b_nuevo', pin); await c.fill('#capas #b_repite', rep);
      await c.click('#capas [data-accion="guardar"]');
      await c.waitForSelector(`#capas #${campo}-error:not([hidden])`, { timeout: 2000 });
    }
    afirmar(!(await c.evaluate(() => import('./src/operations/lock.js').then((m) => m.leerBloqueo()))), 'se guardó un PIN inválido');
  });
  await caso('C3 · activar el PIN: se guarda solo una huella (nunca el PIN) y el menú lo indica', async () => {
    await c.fill('#capas #b_nuevo', '2468'); await c.fill('#capas #b_repite', '2468');
    await c.click('#capas [data-accion="guardar"]');
    await c.waitForFunction(() => document.querySelector('[data-resumen="bloqueo"]').textContent === 'PIN activado', null, { timeout: 5000 });
    const guardado = await c.evaluate(() => import('./src/data/database.js').then((m) => m.leerMeta('bloqueo')));
    const texto = JSON.stringify(guardado);
    afirmar(guardado.alg === 'PBKDF2-SHA256' && guardado.iteraciones >= 100000 && !texto.includes('2468'), texto.slice(0, 120));
  });
  await caso('C4 · al abrir pide el PIN y no muestra ningún dato (ni en el HTML) hasta escribirlo', async () => {
    await recargar();
    await c.waitForSelector('.bloqueo #pin_entrar');
    const r = await c.evaluate(() => ({ html: document.body.innerHTML, inerte: [...document.body.children].filter((e) => !e.classList.contains('bloqueo')).every((e) => e.inert) }));
    afirmar(!r.html.includes('Cliente Secreto'), 'el nombre del cliente está en la página');
    afirmar(r.inerte, 'lo de debajo no quedó inerte');
    afirmar(await c.textContent('.bloqueo-titulo') === 'Tienda Candado', 'título');
  });
  await caso('C5 · PIN incorrecto: avisa; al 5.º fallo obliga a esperar y recargar no reinicia la espera', async () => {
    for (let i = 1; i <= 4; i++) { await entrarCon('1111'); await c.waitForFunction((n) => document.querySelector('.bloqueo [data-zona="aviso"]').textContent === 'PIN incorrecto.' && !document.querySelector('.bloqueo #pin_entrar').value, i); }
    await entrarCon('1111');
    await c.waitForFunction(() => /Espera \d+ s/.test(document.querySelector('.bloqueo [data-zona="aviso"]').textContent));
    afirmar(await c.isDisabled('.bloqueo [data-accion="entrar"]'), 'el botón sigue activo');
    await recargar();
    await c.waitForFunction(() => /Espera \d+ s/.test(document.querySelector('.bloqueo [data-zona="aviso"]').textContent));
    afirmar(await c.isDisabled('.bloqueo [data-accion="entrar"]'), 'recargar reinició la espera');
  });
  await caso('C6 · pasada la espera, el PIN correcto abre la app y reinicia los intentos', async () => {
    await c.evaluate(() => import('./src/data/database.js').then((m) => m.guardarMeta('bloqueoIntentos', { fallos: 5, hasta: Date.now() - 1 })));
    await recargar();
    await entrarCon('2468');
    await c.waitForSelector('#contenido .lista');
    afirmar(!(await c.locator('.bloqueo').count()), 'la pantalla de bloqueo sigue');
    await irA(c, '#/clientes');
    afirmar((await c.textContent('#contenido')).includes('Cliente Secreto'), 'no se ven los datos');
    afirmar(await c.evaluate(() => [...document.body.children].every((e) => !e.inert)), 'quedó algo inerte');
    afirmar((await c.evaluate(() => import('./src/operations/lock.js').then((m) => m.leerIntentos()))).fallos === 0, 'no reinició los intentos');
  });
  await caso('C7 · tras más de 5 minutos en segundo plano vuelve a pedir el PIN (y no antes)', async () => {
    const ocultar = (ms) => c.evaluate((ms) => {
      const real = Date.now;
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      Date.now = () => real() + ms;
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      Date.now = real;
    }, ms);
    await ocultar(60000);
    await c.waitForTimeout(200);
    afirmar(!(await c.locator('.bloqueo').count()), 'bloqueó tras 1 minuto');
    await ocultar(6 * 60000);
    await c.waitForSelector('.bloqueo #pin_entrar');
    await entrarCon('2468');
    await c.waitForFunction(() => !document.querySelector('.bloqueo'));
  });
  await caso('C8 · cambiar el PIN exige el actual; luego entra solo el nuevo', async () => {
    await abrirSeccionBloqueo();
    await c.fill('#capas #b_actual', '0000'); await c.fill('#capas #b_nuevo', '13579'); await c.fill('#capas #b_repite', '13579');
    await c.click('#capas [data-accion="guardar"]');
    await c.waitForSelector('#capas #b_actual-error:not([hidden])');
    await c.fill('#capas #b_actual', '2468');
    await c.click('#capas [data-accion="guardar"]');
    await c.waitForFunction(() => !document.querySelector('#capas .velo'));
    await recargar();
    await entrarCon('2468');
    await c.waitForFunction(() => document.querySelector('.bloqueo [data-zona="aviso"]').textContent === 'PIN incorrecto.');
    await entrarCon('13579');
    await c.waitForFunction(() => !document.querySelector('.bloqueo'));
  });
  await caso('C9 · "Olvidé mi PIN": exige la frase exacta, quita el PIN y no borra ningún dato', async () => {
    await recargar();
    await c.click('.bloqueo [data-accion="olvide"]');
    await c.fill('.bloqueo #pin_frase', 'quitar');
    await c.click('.bloqueo [data-accion="quitar"]');
    await c.waitForFunction(() => /exactamente/.test(document.querySelector('.bloqueo [data-zona="aviso"]').textContent));
    await c.fill('.bloqueo #pin_frase', 'quitar pin');
    await c.click('.bloqueo [data-accion="quitar"]');
    await c.waitForSelector('#contenido .lista');
    await irA(c, '#/clientes');
    afirmar((await c.textContent('#contenido')).includes('Cliente Secreto'), 'se perdieron datos');
    await recargar();
    afirmar(!(await c.locator('.bloqueo').count()), 'sigue pidiendo PIN');
  });
  await caso('C10 · quitar el PIN desde Ajustes exige el PIN actual', async () => {
    await abrirSeccionBloqueo();
    await c.fill('#capas #b_nuevo', '8642'); await c.fill('#capas #b_repite', '8642');
    await c.click('#capas [data-accion="guardar"]');
    await c.waitForFunction(() => !document.querySelector('#capas .velo'));
    await abrirSeccionBloqueo();
    await c.fill('#capas #b_actual', '1111');
    await c.click('#capas [data-accion="quitar"]');
    await c.waitForSelector('#capas #b_actual-error:not([hidden])');
    await c.fill('#capas #b_actual', '8642');
    await c.click('#capas [data-accion="quitar"]');
    await c.waitForFunction(() => document.querySelector('[data-resumen="bloqueo"]').textContent === 'Sin PIN', null, { timeout: 5000 });
  });
  await caso('C11 · el PIN no viaja en los respaldos', async () => {
    const r = await c.evaluate(async () => { const m = await import('./src/data/backup.js'); return JSON.stringify(await m.exportar()); });
    afirmar(!/bloqueo|PBKDF2|huella/.test(r), 'el respaldo incluye datos del PIN');
    afirmar(!c.errores.length, c.errores.join(' | '));
  });
  await c.context().close();

  // ================= D. Registro de errores =================
  const d = await nuevaPagina(nav);
  await sembrar(d, { cuentas_clientes: [], cuentas_inventario: [], cuentas_ventas: [], cuentas_gastos: [] });
  await caso('D1 · un error inesperado queda anotado y sobrevive a recargar la app', async () => {
    await d.evaluate(() => setTimeout(() => { throw new Error('fallo de diagnóstico'); }));
    await d.waitForSelector('.toast.grave');
    await d.waitForTimeout(300);
    await d.reload(); await d.waitForSelector('#contenido .vacio, #contenido .lista, #contenido .panel-hoy');
    const r = await d.evaluate(() => import('./src/core/errors.js').then((m) => m.erroresRegistrados()));
    afirmar(r.some((e) => e.mensaje === 'fallo de diagnóstico'), JSON.stringify(r).slice(0, 200));
  });
  await caso('D2 · Ajustes › Respaldo permite descargar el registro de errores', async () => {
    await irA(d, '#/ajustes');
    await d.click('[data-seccion="respaldo"]');
    await d.waitForSelector('#capas [data-accion="diagnostico"]');
    const [descarga] = await Promise.all([d.waitForEvent('download'), d.click('#capas [data-accion="diagnostico"]')]);
    const texto = fs.readFileSync(await descarga.path(), 'utf8');
    afirmar(texto.includes('fallo de diagnóstico') && texto.startsWith('Orisma '), texto.slice(0, 120));
  });
  await d.context().close();

  // ================= E. Recorrido integrado sin conexión =================
  await caso('E1 · con el service worker: importar, recargar sin red, vender, facturar, PDF y respaldo, todo sin conexión', async () => {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const e = await ctx.newPage();
    const errores = [];
    e.on('pageerror', (er) => errores.push(er.message));
    await e.goto(BASE + '/index.html');
    await e.evaluate((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, {
      cuentas_clientes: [{ id: 'c1', nombre: 'Ana', telefono: '', email: '', direccion: '' }],
      cuentas_inventario: [{ id: 'p1', nombre: 'Camisa', precio: 50000, costo: 30000, stock: 5, categoria: '' }], cuentas_ventas: [], cuentas_gastos: [],
    });
    await e.reload();
    await e.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 }).catch(async () => { await e.reload(); await e.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 }); });
    await ctx.setOffline(true);
    await e.reload();
    await e.waitForSelector('#contenido .panel-hoy');
    const r = await e.evaluate(async () => {
      const ventas = await import('./src/operations/sales.js');
      const fact = await import('./src/operations/invoices.js');
      const st = await import('./src/core/state.js');
      const est = { clienteId: 'c1', carrito: [{ productoId: 'p1', nombre: 'Camisa', precioCatalogo: 50000, precioUnit: 50000, costo: 30000, cantidad: 2, stockDisponible: 5 }], descuento: { tipo: 'pct', valor: 0 }, medio: 'efectivo', montos: {}, notas: '' };
      const v = await ventas.registrarVenta(est);
      await fact.generarFactura(v.id);
      const pdf = await import('./src/services/pdf.js');
      const doc = await import('./src/features/invoices/invoice-document.js');
      const { html, montar } = await import('./src/ui/html.js');
      const nodo = document.createElement('div'); document.body.append(nodo);
      montar(nodo, html`${doc.documento(st.coleccion('ventas').find((x) => x.id === v.id))}`);
      const blob = await pdf.crearPdf(nodo); nodo.remove();
      const resp = await (await import('./src/data/backup.js')).exportar();
      return { stock: st.coleccion('inventario')[0].stock, folio: st.coleccion('ventas')[0].folio, pdf: blob.size, ventasRespaldo: resp.datos.ventas.length };
    });
    afirmar(r.stock === 3 && r.folio === 1 && r.pdf > 5000 && r.ventasRespaldo === 1, JSON.stringify(r));
    await e.reload();
    await e.waitForSelector('#contenido .panel-hoy');
    const tras = await e.evaluate(() => import('./src/core/state.js').then((m) => m.coleccion('ventas').length));
    afirmar(tras === 1, 'la venta no sobrevivió a recargar sin red');
    afirmar(!errores.length, errores.join(' | '));
    await ctx.close();
  });

  await nav.close();
  servidor.close();
  for (const [estado, nombre, detalle, ms] of resultados) console.log(`${estado.padEnd(5)} ${nombre} ${detalle ? '→ ' + detalle : ''} (${ms} ms)`);
  const ok = resultados.filter((r) => r[0] === 'OK').length;
  console.log(`\n${ok}/${resultados.length} casos correctos`);
  process.exit(ok === resultados.length ? 0 : 1);
})();
