// Etapa 9 · Migración y optimización, de extremo a extremo en Chromium.
// M. Paso real de la app anterior a Orisma en la MISMA dirección, con el service worker de la app anterior activo.
// V. La versión anterior cambia después de importar: aviso, comparación y "traer de nuevo" (con copia previa).
// I. Limpieza de imágenes sin uso (sin tocar las que se usan ni los respaldos).
// L. Listas largas por partes ("Mostrar más") y búsqueda en todos los registros.
// Uso: node tests/e2e/migracion.e2e.cjs   (requiere playwright y git). Todos los datos son ficticios.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const VIEJO = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-original-'));
execSync(`git -C "${RAIZ}" archive 9300dfa | tar -x -C "${VIEJO}"`);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8810, BASE = `http://localhost:${PUERTO}`;
let servir = RAIZ; // qué app se publica en "/" (se cambia a mitad de la prueba, como al publicar Orisma)
const servidor = http.createServer((q, r) => {
  const rel = decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html';
  const p = path.join(servir, rel);
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(d); });
}).listen(PUERTO);

const resultados = [];
async function caso(nombre, fn) {
  const t = Date.now();
  try { await fn(); resultados.push(['OK', nombre, '', Date.now() - t]); } catch (e) { resultados.push(['FALLA', nombre, e.message.split('\n')[0], Date.now() - t]); }
}
const afirmar = (c, m) => { if (!c) throw new Error(m); };
const estado = (p) => p.evaluate(() => import('./src/core/state.js').then((m) => Object.fromEntries(['clientes', 'inventario', 'ventas', 'gastos', 'pedidos'].map((c) => [c, m.coleccion(c).length]))));
const PNG = (n) => { // PNG 1×1 de color distinto según n
  const zlib = require('zlib');
  const crcT = []; for (let k = 0; k < 256; k++) { let c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[k] = c >>> 0; }
  const crc = (b) => { let r = 0xffffffff; for (const x of b) r = crcT[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const trozo = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', ihdr), trozo('IDAT', zlib.deflateSync(Buffer.from([0, n & 255, 100, 50]))), trozo('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
};
const SEMILLA = {
  cuentas_config: { nombre: 'Tienda Migración', moneda: '$', impuesto: 0, siguienteFolio: 2 },
  cuentas_clientes: [{ id: 'c1', nombre: 'Ana', telefono: '3001112233', email: '', direccion: '' }],
  cuentas_inventario: [{ id: 'p1', nombre: 'Camisa', precio: 50000, costo: 30000, stock: 10, categoria: '' }],
  cuentas_ventas: [{ id: 'v1', folio: 1, creadoTs: 1, clienteId: 'c1', clienteNombre: 'Ana', fecha: '2026-11-01', items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 1 }], total: 50000, costoTotal: 30000, metodoPago: 'efectivo', fiado: false, abonos: [] }],
  cuentas_gastos: [], cuentas_movimientos: [], cuentas_pedidos: [],
};

(async () => {
  const nav = await chromium.launch();

  // ================= M. Paso real de la app anterior a Orisma =================
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', (e) => p.errores.push(e.message));
  p.on('dialog', (d) => d.accept());
  await caso('M1 · la app anterior funciona instalada (con su service worker) y tiene datos', async () => {
    servir = VIEJO;
    await p.goto(BASE + '/index.html');
    await p.evaluate((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, SEMILLA);
    await p.reload();
    await p.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
    afirmar(await p.evaluate(() => caches.keys().then((k) => k.includes('cuentas-v3'))), 'no está el caché de la app anterior');
    afirmar(await p.locator('#listWrap .row').count() > 0, 'la app anterior no muestra datos');
  });
  await caso('M2 · se publica Orisma en la misma dirección: al abrir con conexión, carga Orisma e importa los datos', async () => {
    servir = RAIZ;
    await p.reload();
    await p.waitForSelector('#contenido .lista', { timeout: 15000 });
    const n = await estado(p);
    afirmar(n.clientes === 1 && n.ventas === 1 && n.inventario === 1, JSON.stringify(n));
  });
  await caso('M3 · el service worker de Orisma reemplaza al anterior sin esperar ni recargar a mitad de algo', async () => {
    await p.waitForFunction(() => navigator.serviceWorker.controller && caches.keys().then((k) => k.some((x) => x.startsWith('orisma-'))), null, { timeout: 15000 });
    await p.waitForFunction(() => caches.keys().then((k) => !k.includes('cuentas-v3')), null, { timeout: 15000 });
    const sw = await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => ({ activo: !!r.active, esperando: !!r.waiting })));
    afirmar(sw.activo && !sw.esperando, JSON.stringify(sw));
  });
  await caso('M4 · después, sin conexión, abre Orisma (no la app anterior) con todos los datos', async () => {
    await ctx.setOffline(true);
    await p.reload();
    await p.waitForSelector('#contenido .lista', { timeout: 15000 });
    afirmar(await p.locator('#listWrap').count() === 0, 'abrió la app anterior');
    afirmar((await estado(p)).ventas === 1, 'faltan datos');
    await ctx.setOffline(false);
  });
  await caso('M5 · los datos de la versión anterior siguen intactos en el navegador y no hay aviso de cambios', async () => {
    const intacto = await p.evaluate((s) => Object.entries(s).every(([k, v]) => localStorage.getItem(k) === JSON.stringify(v)), SEMILLA);
    afirmar(intacto, 'localStorage cambió');
    await p.waitForTimeout(2500);
    afirmar(!(await p.locator('.toast.grave').count()), 'avisó cambios sin haberlos');
    await p.evaluate(() => { location.hash = '#/ajustes'; });
    await p.click('[data-seccion="migracion"]');
    await p.waitForSelector('#capas .velo');
    afirmar((await p.textContent('#capas')).includes('no cambiaron'), 'la sección no indica que no hubo cambios');
    await p.evaluate(() => import('./src/core/navigation.js').then((m) => m.cerrarTodasLasHojas()));
  });

  // ================= V. La versión anterior cambia después de importar =================
  await caso('V1 · si la app anterior se siguió usando, Orisma avisa al abrir', async () => {
    await p.evaluate(() => {
      const v = JSON.parse(localStorage.getItem('cuentas_ventas'));
      v.push({ id: 'v2', creadoTs: 2, clienteId: 'c1', clienteNombre: 'Ana', fecha: '2026-11-03', items: [{ productoId: 'p1', nombre: 'Camisa', precio: 50000, cantidad: 2 }], total: 100000, costoTotal: 60000, metodoPago: 'efectivo', fiado: false, abonos: [] });
      localStorage.setItem('cuentas_ventas', JSON.stringify(v));
    });
    await p.reload();
    await p.waitForSelector('.toast.grave', { timeout: 6000 });
    afirmar((await p.textContent('.toast.grave')).includes('versión anterior'), 'mensaje');
  });
  await caso('V2 · "Revisar" muestra la comparación de cantidades', async () => {
    await p.click('.toast.grave [data-accion]:not([data-accion="cerrar"])');
    await p.waitForSelector('#capas [data-accion="traer"]');
    const t = await p.textContent('#capas');
    afirmar(t.includes('Anterior 2 · Orisma 1'), t.slice(0, 300));
  });
  await caso('V3 · "Traer de nuevo": reemplaza con lo anterior, guarda copia de lo que había y localStorage no cambia', async () => {
    const antes = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
    await p.click('#capas [data-accion="traer"]');
    await p.click('#capas [data-accion="si"]');
    await p.waitForSelector('.toast:has-text("traídos de nuevo")', { timeout: 8000 });
    const r = await p.evaluate(async () => {
      const db = await import('./src/data/database.js');
      const lista = await db.listarRespaldos();
      const copia = lista.find((x) => x.motivo === 'antes de traer de nuevo');
      const contenido = copia ? JSON.parse(await db.leerRespaldo(copia.id)) : null;
      return { copiaVentas: contenido && contenido.datos.ventas.length, legado: lista.filter((x) => x.motivo === 'legado').length, meta: await db.leerMeta('migracionLegado') };
    });
    afirmar(r.copiaVentas === 1, 'la copia previa no tiene lo que había');
    afirmar(r.legado === 2 && r.meta.vez === 2, JSON.stringify(r).slice(0, 200));
    const despues = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
    afirmar(antes === despues, 'localStorage cambió');
  });
  await caso('V4 · después de traerlos, al abrir ya no avisa', async () => {
    await p.reload();
    await p.waitForSelector('#contenido .lista');
    await p.waitForTimeout(2500);
    afirmar(!(await p.locator('.toast.grave').count()), 'sigue avisando');
    afirmar(!p.errores.length, p.errores.join(' | '));
  });
  await ctx.close();

  // ================= I. Limpieza de imágenes sin uso =================
  const ci = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const q = await ci.newPage();
  q.errores = [];
  q.on('pageerror', (e) => q.errores.push(e.message));
  await caso('I1 · al cambiar y quitar fotos, las que ya no se usan se borran al abrir; las demás siguen y se ven', async () => {
    await q.goto(BASE + '/index.html');
    await q.evaluate(() => { localStorage.clear(); });
    await q.evaluate(() => new Promise((r) => { const x = indexedDB.deleteDatabase('orisma'); x.onsuccess = x.onerror = x.onblocked = () => r(); }));
    await q.reload(); await q.waitForSelector('#contenido');
    const [A, B, C, D] = [PNG(1), PNG(2), PNG(3), PNG(4)];
    await q.evaluate(async ([A, B, C, D]) => {
      const db = await import('./src/data/database.js');
      await db.guardarCambios({ colecciones: { inventario: [{ id: 'p1', nombre: 'Uno', precio: 1, costo: 0, stock: 1, foto: A }, { id: 'p2', nombre: 'Dos', precio: 1, costo: 0, stock: 1, foto: B }, { id: 'p3', nombre: 'Tres', precio: 1, costo: 0, stock: 1, foto: C }] }, ajustes: { nombre: 'X', logo: D } });
      const st = await import('./src/core/state.js');
      const inv = st.coleccion('inventario');
      // p1 cambia de foto (A queda sin uso), p2 se elimina (B sin uso), p3 sigue igual. El logo sigue.
      await db.guardarCambios({ colecciones: { inventario: [{ ...inv[0], foto: D }, inv[2]] } });
    }, [A, B, C, D]);
    const antes = await q.evaluate(() => import('./src/data/database.js').then((m) => m.leerTodo()).then((t) => t.archivos.length));
    afirmar(antes === 4, `había ${antes} imágenes guardadas`);
    await q.reload(); await q.waitForSelector('#contenido');
    await q.waitForFunction(() => import('./src/data/database.js').then((m) => m.leerTodo()).then((t) => t.archivos.length === 2), null, { timeout: 8000 });
    await q.evaluate(() => { location.hash = '#/inventario/productos'; });
    await q.waitForSelector('#contenido img.miniatura');
    const fotos = await q.evaluate(() => [...document.querySelectorAll('#contenido img.miniatura')].map((i) => i.complete && i.naturalWidth > 0));
    afirmar(fotos.length === 2 && fotos.every(Boolean), 'las fotos en uso no se ven: ' + JSON.stringify(fotos));
    const r = await q.evaluate(async () => { const b = await import('./src/data/backup.js'); const x = await b.exportar(); return x.datos.inventario.map((p) => p.foto.slice(0, 22)).concat(x.datos.config.logo.slice(0, 22)); });
    afirmar(r.every((s) => s.startsWith('data:image/png;base64')), 'el respaldo perdió imágenes: ' + r.join(','));
  });
  await caso('I2 · Ajustes › Respaldo informa lo que se limpió', async () => {
    await q.evaluate(() => { location.hash = '#/ajustes'; });
    await q.click('[data-seccion="respaldo"]');
    await q.waitForSelector('#capas .velo');
    afirmar((await q.textContent('#capas')).includes('se borraron solas: 2'), 'no informa la limpieza');
    afirmar(!q.errores.length, q.errores.join(' | '));
  });
  await ci.close();

  // ================= L. Listas largas por partes =================
  const cl = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const l = await cl.newPage();
  await caso('L1 · 250 ventas: se ven 100, "Mostrar más" agrega de 100 en 100 y al final desaparece', async () => {
    const ventas = [...Array(250)].map((_, i) => ({ id: 'v' + i, creadoTs: i, clienteId: 'c1', clienteNombre: i === 7 ? 'Zoe Única' : 'Cliente ' + i, fecha: `2026-${String(1 + (i % 11)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, items: [{ productoId: null, nombre: 'X', precio: 1000, cantidad: 1 }], total: 1000, costoTotal: 0, metodoPago: 'efectivo', fiado: false, abonos: [] }));
    await l.goto(BASE + '/index.html');
    await l.evaluate((v) => { localStorage.clear(); localStorage.setItem('cuentas_ventas', JSON.stringify(v)); localStorage.setItem('cuentas_clientes', '[]'); }, ventas);
    await l.evaluate(() => new Promise((r) => { const x = indexedDB.deleteDatabase('orisma'); x.onsuccess = x.onerror = x.onblocked = () => r(); }));
    await l.reload(); await l.waitForSelector('#contenido');
    await l.evaluate(() => { location.hash = '#/ventas/ventas'; });
    await l.waitForSelector('#contenido [data-mas]');
    const filas = () => l.locator('#contenido .solo-movil .fila').count();
    afirmar(await filas() === 100, `se ven ${await filas()}`);
    afirmar((await l.textContent('#contenido [data-mas]')).includes('quedan 150'), 'texto del botón');
    await l.click('#contenido [data-mas]');
    afirmar(await filas() === 200, `tras uno: ${await filas()}`);
    await l.click('#contenido [data-mas]');
    afirmar(await filas() === 250, `tras dos: ${await filas()}`);
    afirmar(!(await l.locator('#contenido [data-mas]').count()), 'el botón sigue');
  });
  await caso('L2 · la búsqueda encuentra registros que no estaban entre los primeros 100', async () => {
    await l.evaluate(() => { location.hash = '#/ventas/ventas'; });
    await l.fill('#campoBuscar', 'zoe');
    await l.waitForFunction(() => document.querySelectorAll('#contenido .solo-movil .fila').length === 1);
    afirmar((await l.textContent('#contenido .solo-movil')).includes('Zoe Única'), 'no la encontró');
    // Al borrar la búsqueda se vuelve a la lista completa, con lo que ya se había ampliado.
    await l.fill('#campoBuscar', '');
    await l.waitForFunction(() => document.querySelectorAll('#contenido .solo-movil .fila').length === 250);
  });
  await cl.close();

  await nav.close();
  servidor.close();
  for (const [e, n, d, ms] of resultados) console.log(`${e.padEnd(5)} ${n} ${d ? '→ ' + d : ''} (${ms} ms)`);
  const ok = resultados.filter((r) => r[0] === 'OK').length;
  console.log(`\n${ok}/${resultados.length} casos correctos`);
  process.exit(ok === resultados.length ? 0 : 1);
})();
