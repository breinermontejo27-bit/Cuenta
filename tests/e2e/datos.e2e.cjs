// Prueba de extremo a extremo de la capa de datos (Etapa 5) con la app ORIGINAL y Orisma en el mismo dominio.
// La versión original se toma del commit 9300dfa (git archive) y se sirve en /viejo/.
// Uso: node tests/e2e/datos.e2e.cjs   (requiere playwright y git). Todos los datos son ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const VIEJO = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-original-'));
execSync(`git -C "${RAIZ}" archive 9300dfa | tar -x -C "${VIEJO}"`);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8750, BASE = `http://localhost:${PUERTO}`;
const servidor = http.createServer((q, r) => {
  let url = decodeURIComponent(q.url.split('?')[0]);
  const [raiz, rel] = url.startsWith('/viejo/') ? [VIEJO, url.slice(7)] : [RAIZ, url.slice(1)];
  const p = path.join(raiz, rel || 'index.html');
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
}).listen(PUERTO);

const resultados = [];
async function caso(nombre, fn) {
  const t = Date.now();
  try { await fn(); resultados.push(['OK', nombre, '', Date.now() - t]); }
  catch (e) { resultados.push(['FALLA', nombre, e.message.split('\n')[0], Date.now() - t]); }
}
const afirmar = (c, m) => { if (!c) throw new Error(m); };
const hoy = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

// PNG de 64×48 (degradado) para subir como foto con el formulario de la app original.
function pngPrueba() {
  const zlib = require('zlib');
  const w = 64, h = 48, filas = [];
  for (let y = 0; y < h; y++) { const f = [0]; for (let x = 0; x < w; x++) f.push(x * 4, y * 5, 128); filas.push(Buffer.from(f)); }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const trozo = (tipo, datos) => { const l = Buffer.alloc(4); l.writeUInt32BE(datos.length); const td = Buffer.concat([Buffer.from(tipo), datos]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  const f = path.join(os.tmpdir(), 'foto-prueba.png');
  fs.writeFileSync(f, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', ihdr), trozo('IDAT', zlib.deflateSync(Buffer.concat(filas))), trozo('IEND', Buffer.alloc(0))]));
  return f;
}

const SEMILLA = {
  cuentas_config: { nombre: 'Tienda Prueba', moneda: '$', impuesto: 0, siguienteFolio: 3, direccion: 'Calle 1', telefono: '3001234567', email: '', logo: '', tengaTexto: 'Cambios en 8 días' },
  cuentas_clientes: [{ id: 'c1', nombre: 'Ana Pérez', telefono: '3001112233', email: 'ana@x.co', direccion: '' }, { id: 'c2', nombre: 'Luis <b>Gómez</b>', telefono: '', email: '', direccion: 'Cra "7"' }],
  cuentas_inventario: [{ id: 'p1', nombre: 'Camisa', precio: 50000, costo: 30000, stock: 10, categoria: 'Ropa', margen: 67 }, { id: 'p3', nombre: 'Servicio', precio: 15000, costo: 0, stock: '', categoria: '' }],
  cuentas_ventas: [{ id: 'v1', folio: 1, clienteId: 'c1', clienteNombre: 'Ana Pérez', fecha: '2026-11-01', items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 2, precio: 50000 }], total: 100000, metodoPago: 'efectivo', gananciaEstimada: 40000, abonos: [{ id: 'a1', fecha: '2026-11-01', monto: 100000, metodo: 'efectivo' }] },
    { id: 'v0', clienteId: 'zz', clienteNombre: 'Cliente borrado', fecha: '2026-10-01', items: [], total: 5000 }],
  cuentas_gastos: [{ id: 'g1', tipo: 'general', metodo: 'efectivo', descripcion: 'Arriendo', monto: 300000, fecha: '2026-11-02', categoria: 'Local' }, { id: 'g0', descripcion: 'Compra de inventario: Camisa x5', monto: 150000, fecha: '2026-10-20', categoria: 'Inventario' }],
  cuentas_movimientos: [{ id: 'm1', tipo: 'alta', ts: 1, productoId: 'p1', productoNombre: 'Camisa', stockNuevo: 10, fecha: '2026-10-01' }],
  cuentas_pedidos: [{ id: 'pd1', tipo: 'apartado', estado: 'pendiente', clienteId: 'c1', clienteNombre: 'Ana Pérez', fechaEntrega: '', creadoTs: 1, items: [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 50000 }], anticipo: 10000, abonos: [{ id: 'x', fecha: '2026-11-03', monto: 10000, metodo: 'tarjeta' }] }],
};

async function contexto(nav) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
  const page = await ctx.newPage();
  page.errores = [];
  page.on('pageerror', (e) => page.errores.push(e.message));
  page.on('dialog', (d) => d.accept());
  return { ctx, page };
}
const leerLS = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
const abrirOrisma = async (page) => { await page.goto(BASE + '/index.html'); await page.waitForSelector('#contenido .vacio, #contenido .lista'); };
// Lee lo guardado en IndexedDB con las imágenes reconstruidas (usando los módulos de la app).
const leerOrisma = (page) => page.evaluate(async () => {
  const db = await import('./src/data/database.js'); const f = await import('./src/data/files.js');
  const t = await db.leerTodo(); const img = new Map();
  for (const a of t.archivos) img.set(a.id, await f.dataUrlDeArchivo(a));
  const r = (id) => img.get(id) || '';
  const col = {}; for (const [c, filas] of Object.entries(t.filas)) col[c] = filas.map((x) => f.inflarImagenes(c, x.r, r));
  return { col, ajustes: t.ajustes ? f.inflarImagenes('ajustes', t.ajustes, r) : null, meta: t.meta, archivos: t.archivos.length, crudos: t.filas };
});
const COLS = { clientes: 'cuentas_clientes', inventario: 'cuentas_inventario', ventas: 'cuentas_ventas', gastos: 'cuentas_gastos', movimientos: 'cuentas_movimientos', pedidos: 'cuentas_pedidos' };

(async () => {
  const nav = await chromium.launch();

  // ================= A. Migración de datos creados con la app original =================
  let { ctx, page } = await contexto(nav);
  let antes = null;
  await caso('A1 · la app original crea datos reales (cliente, producto con foto subida, venta a crédito con abono)', async () => {
    await page.goto(BASE + '/viejo/index.html');
    await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, SEMILLA);
    await page.reload();
    await page.click('.tab[data-view="clientes"]'); await page.click('#fabBtn');
    await page.fill('#f_nombre', 'María Ríos'); await page.fill('#f_telefono', '3105556677'); await page.click('#saveBtn');
    await page.click('.tab[data-view="inventario"]'); await page.click('#fabBtn');
    await page.fill('#f_nombre', 'Collar'); await page.fill('#f_costo', '20000'); await page.fill('#f_precio', '45000'); await page.fill('#f_stock', '4');
    await page.setInputFiles('#pfotoInput', pngPrueba());
    await page.waitForSelector('#pfotoPreview img');
    await page.click('#saveBtn');
    await page.click('.tab[data-view="ventas"]'); await page.click('#fabBtn');
    await page.click('.overlay .pick-row >> text=María Ríos');
    await page.fill('#prodSearch', 'Coll'); await page.click('#prodPickList .pick-row');
    await page.click('[data-group="pago"] button[data-val="credito"]'); await page.fill('#f_abonoIni', '15000');
    await page.click('#saveVentaBtn'); await page.click('#cfConfirmar'); await page.click('#laterBtn');
    antes = await leerLS(page);
    const inv = JSON.parse(antes.cuentas_inventario);
    afirmar(inv.find((p) => p.nombre === 'Collar').foto.startsWith('data:image/jpeg;base64,'), 'la app original no guardó la foto');
    afirmar(JSON.parse(antes.cuentas_ventas).length === 3, 'ventas');
    afirmar(page.errores.length === 0, page.errores.join('|'));
  });

  await caso('A2 · Orisma importa al abrir y avisa', async () => {
    await abrirOrisma(page);
    await page.waitForSelector('.toast:has-text("Se trajeron tus datos")');
    const t = await page.textContent('.toast');
    afirmar(t.includes('3 clientes') && t.includes('3 productos') && t.includes('3 ventas') && t.includes('2 gastos'), t);
  });

  await caso('A3 · cada registro guardado es idéntico al original (incluidas fotos, orden y datos con < " >)', async () => {
    const o = await leerOrisma(page);
    for (const [c, k] of Object.entries(COLS)) afirmar(JSON.stringify(o.col[c]) === antes[k], `${c} no coincide`);
    afirmar(JSON.stringify(o.ajustes) === antes.cuentas_config, 'ajustes no coinciden');
  });

  await caso('A4 · localStorage queda exactamente igual (no se borra ni se modifica)', async () => {
    const despues = await leerLS(page);
    afirmar(JSON.stringify(despues) === JSON.stringify(antes), 'localStorage cambió');
  });

  await caso('A5 · se guardó la copia original literal de las 7 claves', async () => {
    const r = await page.evaluate(async () => { const db = await import('./src/data/database.js'); const l = await db.listarRespaldos(); const leg = l.find((x) => x.motivo === 'legado'); return leg ? JSON.parse(await db.leerRespaldo(leg.id)) : null; });
    afirmar(r && r.app === 'cuentas', 'no hay respaldo original');
    for (const k of Object.keys(antes)) afirmar(r.claves[k] === antes[k], `la copia de ${k} no es literal`);
  });

  await caso('A6 · las fotos se guardan aparte (una vez) y se muestran desde el archivo', async () => {
    const o = await leerOrisma(page);
    const fila = o.crudos.inventario.find((f) => f.r.nombre === 'Collar');
    afirmar(/^archivo:img-[0-9a-f]{32}$/.test(fila.r.foto), 'la foto no quedó como referencia: ' + String(fila.r.foto).slice(0, 30));
    afirmar(o.archivos === 1, 'archivos guardados: ' + o.archivos);
    const ok = await page.evaluate(async (ref) => { const h = await import('./src/ui/html.js'); const u = h.imagenSegura(ref); if (!u.startsWith('blob:')) return 'url ' + u; return new Promise((r) => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0 ? 'ok' : 'vacía'); i.onerror = () => r('no carga'); i.src = u; }); }, fila.r.foto);
    afirmar(ok === 'ok', ok);
  });

  await caso('A7 · al reabrir no se vuelve a importar ni se duplica nada', async () => {
    await abrirOrisma(page); await page.waitForTimeout(400);
    afirmar(!(await page.locator('.toast:has-text("Se trajeron")').count()), 'volvió a importar');
    const o = await leerOrisma(page);
    afirmar(o.col.clientes.length === 3 && o.col.ventas.length === 3, 'cantidades cambiaron');
    afirmar(o.meta.migracionLegado && o.meta.migracionLegado.origen.rasgos.includes('pedidos'), 'sin registro de la migración');
  });

  await caso('A8 · Ajustes › Respaldo muestra las cantidades y el origen', async () => {
    await page.goto(BASE + '/index.html#/ajustes'); await page.waitForSelector('[data-seccion="respaldo"]');
    await page.click('[data-seccion="respaldo"]'); await page.waitForSelector('#capas .hoja');
    const t = (await page.innerText('#capas .hoja')).replace(/\s+/g, ' ');
    afirmar(t.includes('Clientes 3') && t.includes('Ventas 3') && t.includes('Pendientes 1'), t.slice(0, 200));
    afirmar(t.includes('Copia original de Cuentas'), 'no lista la copia original');
  });

  // ================= B. Respaldo de Orisma → app original (camino de regreso) =================
  let archivoOrisma = null;
  await caso('B1 · Orisma descarga un respaldo (formato 3) con las fotos incluidas', async () => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.click('#capas [data-accion="descargar"]')]);
    archivoOrisma = path.join(os.tmpdir(), 'respaldo-orisma.json');
    await d.saveAs(archivoOrisma);
    const r = JSON.parse(fs.readFileSync(archivoOrisma, 'utf8'));
    afirmar(r.app === 'orisma' && r.version === 3 && d.suggestedFilename().startsWith('orisma-respaldo-'), 'formato');
    for (const [c, k] of Object.entries(COLS)) afirmar(JSON.stringify(r.datos[c]) === antes[k], `${c} distinto en el respaldo`);
    afirmar(r.datos.inventario.find((p) => p.nombre === 'Collar').foto.startsWith('data:image/jpeg'), 'foto no incluida');
  });
  await ctx.close();

  await caso('B2 · la app original restaura el respaldo de Orisma y queda con los mismos datos', async () => {
    const { ctx: c2, page: v } = await contexto(nav);
    await v.goto(BASE + '/viejo/index.html');
    await v.click('#gearBtn'); await v.click('.row[data-sec="respaldo"]');
    await v.setInputFiles('#resFile', archivoOrisma); await v.click('#resSi');
    const ls = await leerLS(v);
    for (const k of Object.values(COLS)) afirmar(ls[k] === antes[k], `${k} distinto tras restaurar en la app original`);
    const cfg = JSON.parse(ls.cuentas_config);
    afirmar(cfg.nombre === 'Tienda Prueba' && cfg.tengaTexto === 'Cambios en 8 días', 'ajustes');
    await v.click('.tab[data-view="inventario"]');
    afirmar((await v.textContent('#listWrap')).includes('Collar'), 'no muestra el producto');
    afirmar(v.errores.length === 0, v.errores.join('|'));
    await c2.close();
  });

  // ================= C. Restaurar en Orisma =================
  let archivoViejo = null;
  await caso('C1 · restaurar en Orisma un respaldo hecho con la app original (formato 2)', async () => {
    const { ctx: c3, page: v } = await contexto(nav);
    await v.goto(BASE + '/viejo/index.html');
    await v.evaluate((s) => { localStorage.clear(); for (const [k, x] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(x)); }, SEMILLA);
    await v.reload(); await v.click('#gearBtn'); await v.click('.row[data-sec="respaldo"]');
    const [d] = await Promise.all([v.waitForEvent('download'), v.click('#resExport')]);
    archivoViejo = path.join(os.tmpdir(), 'respaldo-cuentas.json');
    await d.saveAs(archivoViejo);
    // Orisma con otros datos: borrar la base y dejar solo 1 cliente distinto (sin datos de la versión anterior)
    await v.evaluate(() => localStorage.clear());
    await abrirOrisma(v);
    await v.evaluate(async () => { const db = await import('./src/data/database.js'); const st = await import('./src/core/state.js'); await db.guardarCambios({ colecciones: { clientes: [{ id: 'zz9', nombre: 'Otro' }] }, ajustes: { ...st.obtenerAjustes(), nombre: 'Negocio actual', siguienteComprobante: 9, firmaImg: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' } }); });
    await v.goto(BASE + '/index.html#/ajustes'); await v.waitForSelector('[data-seccion="respaldo"]');
    await v.click('[data-seccion="respaldo"]'); await v.waitForSelector('#capas [data-accion="archivo"]');
    await v.setInputFiles('#capas [data-accion="archivo"]', archivoViejo);
    await v.waitForSelector('#capas [data-accion="restaurar"]');
    const resumen = (await v.innerText('#capas [data-zona="analisis"]')).replace(/\s+/g, ' ');
    afirmar(resumen.includes('Cuentas (formato 2)') && resumen.includes('Clientes 2'), resumen);
    await v.click('#capas [data-accion="restaurar"]'); await v.click('#capas [data-accion="si"]');
    await v.waitForSelector('.toast:has-text("Datos restaurados")');
    const o = await leerOrisma(v);
    for (const [c, k] of Object.entries(COLS)) afirmar(JSON.stringify(o.col[c]) === JSON.stringify(SEMILLA[k]), `${c} no coincide con el respaldo`);
    // RB-03: la configuración se MEZCLA como en la versión original: lo que el respaldo trae se reemplaza
    // (la app original exporta firmaImg: '' → queda sin firma, igual que allá) y lo que no trae se conserva.
    const exportado = JSON.parse(fs.readFileSync(archivoViejo, 'utf8')).datos.config;
    afirmar(exportado.firmaImg === '' && !('siguienteComprobante' in exportado), 'el respaldo original no tiene la forma esperada');
    afirmar(o.ajustes.nombre === 'Tienda Prueba' && o.ajustes.firmaImg === '' && o.ajustes.siguienteComprobante === 9, 'mezcla de ajustes: ' + JSON.stringify({ n: o.ajustes.nombre, f: o.ajustes.firmaImg.slice(0, 20), s: o.ajustes.siguienteComprobante }));
    const resp = await v.evaluate(async () => (await import('./src/data/database.js')).listarRespaldos());
    afirmar(resp.some((r) => r.motivo === 'antes de restaurar'), 'no guardó copia automática previa');
    const previa = await v.evaluate(async () => { const db = await import('./src/data/database.js'); const l = await db.listarRespaldos(); return JSON.parse(await db.leerRespaldo(l.find((r) => r.motivo === 'antes de restaurar').id)); });
    afirmar(previa.datos.clientes[0].nombre === 'Otro', 'la copia previa no contiene los datos anteriores');
    await c3.close();
  });

  await caso('C2 · un respaldo manipulado se rechaza: no ejecuta código ni cambia nada (D4-11)', async () => {
    const { ctx: c4, page: v } = await contexto(nav);
    await abrirOrisma(v);
    await v.evaluate(async () => { const db = await import('./src/data/database.js'); await db.guardarCambios({ colecciones: { clientes: [{ id: 'k1', nombre: 'Queda' }] } }); });
    const malo = path.join(os.tmpdir(), 'respaldo-malo.json');
    fs.writeFileSync(malo, JSON.stringify({ app: 'cuentas', version: 2, datos: { clientes: [{ id: 'x" onmouseover="window.__xss=1', nombre: '<img src=x onerror=window.__xss=1>' }], inventario: [], ventas: [], gastos: [], config: { logo: 'x" onerror="window.__xss=1' } } }));
    await v.goto(BASE + '/index.html#/ajustes'); await v.waitForSelector('[data-seccion="respaldo"]');
    await v.click('[data-seccion="respaldo"]'); await v.setInputFiles('#capas [data-accion="archivo"]', malo);
    await v.waitForSelector('#capas .banner.error');
    afirmar(!(await v.locator('#capas [data-accion="restaurar"]').count()), 'ofreció restaurar');
    afirmar(!(await v.evaluate(() => window.__xss)), 'se ejecutó código');
    const o = await leerOrisma(v);
    afirmar(o.col.clientes.length === 1 && o.col.clientes[0].nombre === 'Queda', 'cambió los datos');
    await c4.close();
  });

  // ================= D. Datos dañados en la versión anterior =================
  for (const [id, nombre, preparar] of [
    ['D1', 'JSON dañado en una clave', (ls) => { ls.cuentas_ventas = '[{"id":"v1",'; }],
    ['D2', 'identificadores repetidos', (ls) => { ls.cuentas_clientes = JSON.stringify([{ id: 'c1', nombre: 'A' }, { id: 'c1', nombre: 'B' }]); }],
  ]) {
    await caso(`${id} · ${nombre}: no importa nada, avisa y deja localStorage intacto`, async () => {
      const { ctx: c5, page: v } = await contexto(nav);
      await v.goto(BASE + '/index.html');
      const ls = Object.fromEntries(Object.entries(SEMILLA).map(([k, x]) => [k, JSON.stringify(x)])); preparar(ls);
      await v.evaluate((ls) => { localStorage.clear(); for (const [k, x] of Object.entries(ls)) localStorage.setItem(k, x); }, ls);
      await v.evaluate(() => new Promise((r) => { const p = indexedDB.deleteDatabase('orisma'); p.onsuccess = p.onerror = p.onblocked = () => r(); }));
      await abrirOrisma(v);
      await v.waitForSelector('.toast.grave:has-text("No se pudieron traer")');
      const o = await leerOrisma(v);
      afirmar(Object.values(o.col).every((l) => l.length === 0) && !o.meta.migracionLegado, 'importó algo');
      afirmar(JSON.stringify(await leerLS(v)) === JSON.stringify(Object.fromEntries(Object.entries(ls).sort())), 'localStorage cambió');
      await c5.close();
    });
  }

  // ================= E. Guardar cambios: atomicidad, orden, imágenes =================
  await caso('E1 · guardarCambios escribe solo lo necesario, conserva el orden y sobrevive a recargar', async () => {
    const { ctx: c6, page: v } = await contexto(nav);
    await abrirOrisma(v);
    await v.evaluate(async () => {
      const db = await import('./src/data/database.js'); const st = await import('./src/core/state.js');
      await db.guardarCambios({ colecciones: { clientes: [{ id: 'b', nombre: 'B' }, { id: 'a', nombre: 'A' }, { id: 'c', nombre: 'C' }] } });
      const lista = st.coleccion('clientes');
      await db.guardarCambios({ colecciones: { clientes: [lista[0], { ...lista[1], nombre: 'A2' }, lista[2], { id: 'd', nombre: 'D' }].filter((x) => x.id !== 'c') } });
    });
    await abrirOrisma(v);
    const nombres = await v.evaluate(async () => (await import('./src/core/state.js')).coleccion('clientes').map((c) => c.nombre));
    afirmar(nombres.join() === 'B,A2,D', nombres.join());
    await c6.close();
  });

  await caso('E2 · una operación que falla a mitad no deja nada guardado ni cambia la memoria', async () => {
    const { ctx: c7, page: v } = await contexto(nav);
    await abrirOrisma(v);
    const r = await v.evaluate(async () => {
      const db = await import('./src/data/database.js'); const st = await import('./src/core/state.js');
      await db.guardarCambios({ colecciones: { clientes: [{ id: 'k', nombre: 'Antes' }] } });
      const res = {};
      try { await db.guardarCambios({ colecciones: { clientes: [{ id: 'k', nombre: 'Después' }], ventas: [{ id: 'v', nombre: 'mal' }, { id: 'v' }] } }); res.a = 'guardó'; } catch (e) { res.a = e.message; }
      try { await db.transaccion(['clientes', 'ventas'], 'readwrite', (al) => { al('clientes').put({ k: 'k', n: 0, r: { id: 'k', nombre: 'Medio' } }); al('ventas').put({ k: 'v9', n: 0, r: { id: 'v9' } }); throw new Error('falla a mitad'); }); res.b = 'guardó'; } catch (e) { res.b = e.message; }
      const t = await db.leerTodo();
      return { ...res, memoria: st.coleccion('clientes')[0].nombre, base: t.filas.clientes[0].r.nombre, ventas: t.filas.ventas.length };
    });
    afirmar(/repetido/.test(r.a), 'no rechazó ids repetidos: ' + r.a);
    afirmar(r.b === 'falla a mitad', 'transacción: ' + r.b);
    afirmar(r.memoria === 'Antes' && r.base === 'Antes' && r.ventas === 0, JSON.stringify(r));
    await c7.close();
  });

  // ================= F. Volumen =================
  await caso('F1 · migración de 5.000 ventas, 1.000 productos con 200 fotos: completa, idéntica y en tiempo razonable', async () => {
    const { ctx: c8, page: v } = await contexto(nav);
    await v.goto(BASE + '/viejo/index.html');
    const fotos = await v.evaluate(() => { const r = []; for (let i = 0; i < 200; i++) { const c = document.createElement('canvas'); c.width = 300; c.height = 300; const x = c.getContext('2d'); x.fillStyle = `hsl(${i * 7},60%,50%)`; x.fillRect(0, 0, 300, 300); x.fillStyle = '#fff'; x.fillText('Producto ' + i, 20, 150); r.push(c.toDataURL('image/jpeg', 0.85)); } return r; });
    const datos = await v.evaluate((fotos) => {
      const d = (i) => `2026-${String(1 + i % 11).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`;
      const cl = [...Array(1500)].map((_, i) => ({ id: 'c' + i, nombre: 'Cliente ' + i, telefono: '300' + i }));
      const inv = [...Array(1000)].map((_, i) => ({ id: 'p' + i, nombre: 'Producto ' + i, precio: 1000 + i, costo: 600, stock: i % 7, categoria: 'C' + (i % 9), foto: i < 200 ? fotos[i] : '' }));
      const ve = [...Array(5000)].map((_, i) => ({ id: 'v' + i, folio: i % 2 ? i : null, clienteId: 'c' + (i % 1500), clienteNombre: 'Cliente ' + (i % 1500), fecha: d(i), creadoTs: i, items: [{ productoId: 'p' + (i % 1000), nombre: 'Producto', cantidad: 1, precio: 1000, foto: i % 10 === 0 ? fotos[i % 200] : '' }], total: 1000, fiado: i % 4 === 0, abonos: [{ id: 'a' + i, fecha: d(i), monto: 500, metodo: 'efectivo' }] }));
      const ls = { cuentas_clientes: cl, cuentas_inventario: inv, cuentas_ventas: ve, cuentas_gastos: [], cuentas_movimientos: [], cuentas_pedidos: [] };
      localStorage.clear(); let tam = 0;
      for (const [k, x] of Object.entries(ls)) { const s = JSON.stringify(x); tam += s.length; try { localStorage.setItem(k, s); } catch (e) { return { error: 'no cabe en localStorage: ' + (tam / 1e6).toFixed(1) + ' M caracteres' }; } }
      return { tam };
    }, fotos);
    afirmar(!datos.error, datos.error);
    const ls = await leerLS(v);
    const t0 = Date.now();
    await abrirOrisma(v);
    await v.waitForSelector('.toast:has-text("Se trajeron")', { timeout: 60000 });
    const ms = Date.now() - t0;
    const o = await leerOrisma(v);
    for (const [c, k] of Object.entries(COLS)) if (ls[k]) afirmar(JSON.stringify(o.col[c]) === ls[k], `${c} no coincide`);
    afirmar(o.archivos === 200, 'fotos distintas guardadas: ' + o.archivos);
    resultados.push(['INFO', `F1 · ${(datos.tam / 1e6).toFixed(2)} M caracteres en localStorage; migración + verificación + carga: ${ms} ms`, '', 0]);
    afirmar(ms < 30000, 'tardó ' + ms + ' ms');
    await c8.close();
  });

  await nav.close(); servidor.close(); fs.rmSync(VIEJO, { recursive: true, force: true });
  for (const r of resultados) console.log(r[0].padEnd(5), r[1], r[2] ? '→ ' + r[2] : '', r[3] ? `(${r[3]} ms)` : '');
  const fallas = resultados.filter((r) => r[0] === 'FALLA');
  const casos = resultados.filter((r) => r[0] !== 'INFO');
  console.log(`\n${casos.length - fallas.length}/${casos.length} casos correctos`);
  process.exitCode = fallas.length ? 1 : 0;
})();
