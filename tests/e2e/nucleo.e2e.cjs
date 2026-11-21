// Prueba de extremo a extremo del núcleo (Etapa 4) en Chromium.
// Uso: node tests/e2e/nucleo.e2e.cjs   (requiere playwright instalado; usa el navegador incluido)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8740, URL_APP = `http://localhost:${PUERTO}/index.html`;
let versionNueva = false; // simula publicar una versión nueva (cambia la lista de precarga)
const servidor = http.createServer((q, r) => {
  const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(RAIZ)) { r.writeHead(403); return r.end(); }
  fs.readFile(p, (e, d) => {
    if (e) { r.writeHead(404); return r.end('no existe'); }
    if (versionNueva && p.endsWith('precache-list.js')) d = Buffer.from(String(d).replace(/"version": "(\w+)"/, '"version": "$1nueva"'));
    r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(d);
  });
}).listen(PUERTO);

const resultados = [];
async function caso(nombre, fn) {
  try { await fn(); resultados.push(['OK', nombre]); }
  catch (e) { resultados.push(['FALLA', nombre, e.message.split('\n')[0]]); }
}
function afirmar(cond, msg) { if (!cond) throw new Error(msg); }

async function nuevaPagina(navegador, vp = { width: 390, height: 844 }) {
  const contexto = await navegador.newContext({ viewport: vp, serviceWorkers: 'block' });
  const page = await contexto.newPage();
  page.errores = [];
  page.on('pageerror', (e) => page.errores.push('error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errores.push('consola: ' + m.text()); });
  await page.goto(URL_APP);
  await page.waitForSelector('#contenido .vacio, #contenido .lista, #contenido .panel-hoy');
  return page;
}
const hash = (page) => page.evaluate(() => location.hash);
const titulo = (page) => page.textContent('#tituloPantalla');
const hojas = (page) => page.locator('#capas .velo').count();
// La navegación ocurre en el evento hashchange (un instante después del clic): esperar a que se pinte.
async function ir(page, selector, hashEsperado, tituloEsperado) {
  await page.click(selector);
  const sub = hashEsperado.split('/')[2] || '';
  await page.waitForFunction(([h, t, sub]) => location.hash === h
    && (!t || document.getElementById('tituloPantalla').textContent === t)
    && (!sub || (document.querySelector('#contenido [aria-selected="true"]') || {}).dataset?.sub === sub), [hashEsperado, tituloEsperado, sub], { timeout: 3000 });
}

(async () => {
  const nav = await chromium.launch();

  // ---------- Teléfono ----------
  const p = await nuevaPagina(nav);
  // Navegación del ajuste visual final (Estilo 1): arranca en Inicio; barra de 5 destinos; Facturas, Gastos y
  // Reportes se abren desde "Más" (con botón Volver); en el computador, barra lateral agrupada.
  await caso('arranca en #/inicio sin errores ni bloqueos de la política de seguridad', async () => {
    afirmar(await hash(p) === '#/inicio', 'ruta inicial ' + await hash(p));
    afirmar(await titulo(p) === 'Hola, Mi negocio', 'título: ' + await titulo(p));
    afirmar(p.errores.length === 0, p.errores.join(' | '));
  });
  await caso('encabezado con iniciales del negocio por defecto', async () => {
    afirmar((await p.textContent('.barra-sup .avatar')).trim() === 'MN', 'iniciales');
    afirmar((await p.textContent('.barra-sup .negocio-nombre')).trim() === 'Mi negocio', 'nombre');
  });
  await caso('los 5 destinos de la barra navegan y marcan el activo', async () => {
    const esperado = [['ventas', 'Ventas'], ['inventario', 'Inventario'], ['clientes', 'Clientes'], ['mas', 'Más'], ['inicio', 'Hola, Mi negocio']];
    const orden = await p.$$eval('.pestanas .pestana', (x) => x.map((a) => a.dataset.modulo).join());
    afirmar(orden === 'inicio,ventas,inventario,clientes,mas', 'barra: ' + orden);
    const porDefecto = { inventario: '/productos', ventas: '/ventas' };
    for (const [id, t] of esperado) {
      await ir(p, `.pestanas [data-modulo="${id}"]`, '#/' + id + (porDefecto[id] || ''), t);
      afirmar(await p.getAttribute(`.pestanas [data-modulo="${id}"]`, 'aria-current') === 'page', `activa ${id}`);
    }
  });
  await caso('"Más" abre Facturas, Gastos, Reportes y Ajustes; marca "Más" y muestra Volver', async () => {
    const porDefecto = { reportes: '/resumen' };
    for (const [id, t] of [['facturas', 'Facturas'], ['gastos', 'Gastos'], ['reportes', 'Reportes'], ['ajustes', 'Ajustes']]) {
      await ir(p, '.pestanas [data-modulo="mas"]', '#/mas', 'Más');
      await ir(p, `#contenido [data-destino="${id}"]`, '#/' + id + (porDefecto[id] || ''), t);
      afirmar(await p.getAttribute('.pestanas [data-modulo="mas"]', 'aria-current') === 'page', `"Más" marcado en ${id}`);
      afirmar(await p.isVisible('#botonVolver'), `Volver en ${id}`);
    }
    await ir(p, '#botonVolver', '#/mas', 'Más');
    afirmar(!(await p.isVisible('#botonVolver')), 'Volver en Más');
  });
  await caso('el engranaje de Ajustes está arriba a la derecha en todas las pantallas principales', async () => {
    for (const id of ['inicio', 'ventas', 'inventario', 'clientes', 'mas']) {
      await p.evaluate((h) => { location.hash = '#/' + h; }, id); await p.waitForTimeout(60);
      afirmar(await p.isVisible('.barra-sup a.ajustes'), 'sin engranaje en ' + id);
    }
    await ir(p, '.barra-sup a.ajustes', '#/ajustes', 'Ajustes');
  });
  await caso('subvistas de Inventario y botón principal solo en Productos', async () => {
    await ir(p, '.pestanas [data-modulo="inventario"]', '#/inventario/productos', 'Inventario');
    afirmar(await p.isVisible('#accionMovil'), 'botón visible en productos');
    afirmar((await p.textContent('#accionMovil')).includes('Nuevo producto'), 'texto del botón');
    await ir(p, '[data-sub="stock"]', '#/inventario/stock');
    afirmar(!(await p.isVisible('#accionMovil')), 'botón oculto en stock');
    afirmar(await p.getAttribute('[data-sub="stock"]', 'aria-selected') === 'true', 'subvista marcada');
  });
  await caso('Ventas › Pendientes cambia el buscador y el botón', async () => {
    await ir(p, '.pestanas [data-modulo="ventas"]', '#/ventas/ventas', 'Ventas');
    afirmar(await p.getAttribute('#campoBuscar', 'placeholder') === 'Buscar por cliente o folio', 'buscador ventas');
    await ir(p, '[data-sub="pendientes"]', '#/ventas/pendientes');
    afirmar(await p.getAttribute('#campoBuscar', 'placeholder') === 'Buscar por cliente', 'buscador pendientes');
    afirmar((await p.textContent('#accionMovil')).includes('Nuevo pendiente'), 'botón pendientes');
  });
  await caso('Reportes oculta buscador y botón principal', async () => {
    await ir(p, '.pestanas [data-modulo="mas"]', '#/mas', 'Más');
    await ir(p, '#contenido [data-destino="reportes"]', '#/reportes/resumen', 'Reportes');
    afirmar(!(await p.isVisible('#buscador')), 'buscador visible');
    afirmar(!(await p.isVisible('#accionMovil')), 'botón visible');
    afirmar(await p.locator('[data-sub]').count() === 3, 'tres subvistas');
  });
  await caso('ruta inválida vuelve a Inicio', async () => {
    await p.evaluate(() => { location.hash = '#/no-existe'; });
    await p.waitForFunction(() => location.hash === '#/inicio');
  });
  await caso('la búsqueda se recuerda por pantalla', async () => {
    await ir(p, '.pestanas [data-modulo="clientes"]', '#/clientes', 'Clientes');
    await p.fill('#campoBuscar', 'ana');
    await ir(p, '.pestanas [data-modulo="ventas"]', '#/ventas/ventas', 'Ventas');
    afirmar(await p.inputValue('#campoBuscar') === '', 'ventas vacío');
    await ir(p, '.pestanas [data-modulo="clientes"]', '#/clientes', 'Clientes');
    afirmar(await p.inputValue('#campoBuscar') === 'ana', 'clientes conserva "ana"');
    await p.fill('#campoBuscar', '');
  });
  await caso('atrás del navegador entre pantallas', async () => {
    await ir(p, '.pestanas [data-modulo="inventario"]', '#/inventario/productos', 'Inventario');
    await ir(p, '.pestanas [data-modulo="clientes"]', '#/clientes', 'Clientes');
    await p.goBack();
    await p.waitForFunction(() => location.hash === '#/inventario/productos');
  });
  await caso('recargar conserva la pantalla', async () => {
    await p.evaluate(() => { location.hash = '#/ventas/pendientes'; });
    await p.reload(); await p.waitForSelector('#contenido .vacio');
    afirmar(await hash(p) === '#/ventas/pendientes', await hash(p));
    afirmar(await p.getAttribute('[data-sub="pendientes"]', 'aria-selected') === 'true', 'subvista marcada tras recargar');
  });
  await caso('hoja: abre con foco dentro; el botón atrás del teléfono la cierra sin cambiar de pantalla', async () => {
    await p.click('#accionMovil');
    afirmar(await hojas(p) === 1, 'no abrió');
    afirmar(await p.evaluate(() => !!document.activeElement.closest('.hoja')), 'foco fuera de la hoja');
    await p.goBack();
    await p.waitForFunction(() => !document.querySelector('#capas .velo'));
    afirmar(await hash(p) === '#/ventas/pendientes', 'cambió de pantalla: ' + await hash(p));
    afirmar(await p.evaluate(() => document.activeElement && document.activeElement.id === 'accionMovil'), 'el foco no volvió al botón');
  });
  await caso('hoja: se cierra con X, con Escape, tocando fuera y con su botón; sin dejar entradas de historial', async () => {
    await ir(p, '.pestanas [data-modulo="mas"]', '#/mas', 'Más');
    await ir(p, '#contenido [data-destino="gastos"]', '#/gastos', 'Gastos');
    for (const forma of ['x', 'escape', 'fuera', 'boton']) {
      await p.click('#accionMovil');
      afirmar(await hojas(p) === 1, 'no abrió (' + forma + ')');
      if (forma === 'x') await p.click('#capas [data-accion="cerrar"]');
      if (forma === 'escape') await p.keyboard.press('Escape');
      if (forma === 'fuera') await p.mouse.click(195, 30);
      if (forma === 'boton') await p.click('#capas [data-accion="cancelar"]');
      await p.waitForFunction(() => !document.querySelector('#capas .velo'), null, { timeout: 3000 });
    }
    await p.goBack();
    await p.waitForFunction(() => location.hash === '#/mas', null, { timeout: 3000 });
  });
  await caso('diálogo de confirmación: Aceptar → true; Cancelar, Escape y atrás → false', async () => {
    const abrir = () => p.evaluate(() => { window.__resp = 'pendiente'; import('./src/ui/overlays/dialog.js').then((m) => m.confirmar({ titulo: '¿Eliminar?', mensaje: 'No se puede deshacer.', aceptar: 'Eliminar', peligro: true }).then((r) => { window.__resp = r; })); });
    const esperar = (v) => p.waitForFunction((v) => window.__resp === v, v, { timeout: 3000 });
    await abrir(); await p.waitForSelector('#capas .dialogo');
    afirmar(await p.evaluate(() => document.activeElement.dataset.accion === 'no'), 'el foco inicial debe estar en Cancelar');
    await p.click('#capas [data-accion="si"]'); await esperar(true);
    await abrir(); await p.waitForSelector('#capas .dialogo'); await p.click('#capas [data-accion="no"]'); await esperar(false);
    await abrir(); await p.waitForSelector('#capas .dialogo'); await p.keyboard.press('Escape'); await esperar(false);
    await abrir(); await p.waitForSelector('#capas .dialogo'); await p.goBack(); await esperar(false);
    afirmar(await hash(p) === '#/mas', 'cambió de pantalla: ' + await hash(p));
  });
  await caso('avisos: el normal se cierra solo; el grave no, hasta cerrarlo', async () => {
    const antes = await p.locator('.toast').count();
    await p.evaluate(() => import('./src/ui/notifications/toast.js').then((m) => { m.notificar('Guardado', { duracion: 300 }); m.notificar('No se pudo guardar', { tipo: 'grave' }); }));
    afirmar(antes === 0, `había ${antes} avisos antes de empezar: ` + (await p.locator('.toast').allTextContents()).join(' | ').replace(/\s+/g, ' '));
    afirmar(await p.locator('.toast').count() === 2, 'no aparecieron');
    await p.waitForTimeout(500);
    afirmar(await p.locator('.toast').count() === 1, 'el normal no se cerró');
    afirmar(await p.getAttribute('.toast.grave', 'role') === 'alert', 'el grave debe ser role=alert');
    await p.click('.toast.grave [data-accion="cerrar"]');
    afirmar(await p.locator('.toast').count() === 0, 'el grave no se cerró');
  });
  await caso('un error no controlado se registra y se avisa (no se queda en la consola)', async () => {
    p.errores.length = 0;
    await p.evaluate(() => setTimeout(() => { throw new Error('fallo de prueba'); }));
    await p.waitForSelector('.toast.grave');
    afirmar((await p.textContent('.toast.grave')).includes('Algo salió mal'), 'mensaje');
    await p.click('.toast.grave [data-accion="cerrar"]');
  });
  await caso('Ajustes desde el encabezado: resúmenes reales y sección en hoja', async () => {
    await ir(p, '.barra-sup a.ajustes', '#/ajustes', 'Ajustes');
    const texto = await p.textContent('#contenido');
    afirmar(texto.includes('$ · Impuesto 0%') && texto.includes('Poco stock desde 3 unid.'), 'resúmenes');
    await p.click('[data-seccion="moneda"]');
    afirmar(await hojas(p) === 1, 'no abrió la sección');
    await p.click('#capas [data-accion="volver"]');
    await p.waitForFunction(() => !document.querySelector('#capas .velo'));
  });
  await caso('los cambios de ajustes se reflejan en el encabezado', async () => {
    await p.evaluate(() => import('./src/core/state.js').then((m) => m.reemplazarAjustes({ nombre: 'Orisma' })));
    afirmar((await p.textContent('.barra-sup .negocio-nombre')).trim() === 'Orisma', 'nombre no cambió');
    afirmar((await p.textContent('.barra-sup .avatar')).trim() === 'O', 'iniciales');
  });
  await caso('todo botón y enlace tiene nombre accesible', async () => {
    const sinNombre = await p.evaluate(() => [...document.querySelectorAll('button, a')].filter((e) => e.offsetParent !== null).filter((e) => !(e.textContent.trim() || e.getAttribute('aria-label'))).map((e) => e.outerHTML.slice(0, 80)));
    afirmar(sinNombre.length === 0, sinNombre.join(' | '));
  });
  await caso('ningún error de JavaScript en todo el recorrido del teléfono', async () => {
    const reales = p.errores.filter((e) => !e.includes('fallo de prueba'));
    afirmar(reales.length === 0, reales.join(' | '));
  });
  await p.context().close();

  // ---------- Computador ----------
  const d = await nuevaPagina(nav, { width: 1280, height: 800 });
  await caso('computador: barra lateral y botón en el encabezado; sin pestañas ni botón flotante', async () => {
    afirmar(await d.isVisible('.lateral'), 'barra lateral');
    afirmar(!(await d.isVisible('.pestanas')), 'pestañas visibles');
    afirmar(!(await d.isVisible('#accionMovil')), 'botón flotante visible');
    afirmar(await d.isVisible('#accionEscritorio'), 'botón del encabezado');
  });
  await caso('computador: cambiar de sección con una hoja abierta la cierra y navega', async () => {
    await d.click('#accionEscritorio');
    afirmar(await hojas(d) === 1, 'no abrió');
    const ancho = await d.evaluate(() => document.querySelector('#capas .hoja').getBoundingClientRect().width);
    afirmar(ancho === 480, 'la hoja debe ser un panel de 480 px: ' + ancho);
    await d.evaluate(() => import('./src/core/navigation.js').then((m) => m.irA('gastos')));
    await d.waitForFunction(() => location.hash === '#/gastos' && !document.querySelector('#capas .velo'), null, { timeout: 3000 });
    await d.goBack();
    await d.waitForFunction(() => location.hash === '#/inicio', null, { timeout: 3000 });
  });
  await caso('computador: barra lateral agrupada en "Día a día" y "Negocio", sin "Más"', async () => {
    const t = await d.$$eval('.lateral nav > *', (x) => x.map((e) => e.dataset.modulo || e.textContent.trim()).join());
    afirmar(t === 'inicio,Día a día,ventas,facturas,clientes,Negocio,inventario,gastos,reportes', t);
    afirmar(!(await d.isVisible('#botonVolver')), 'Volver visible en el computador');
  });
  await caso('computador: Ajustes al pie de la barra lateral', async () => {
    await ir(d, '.lateral a[data-modulo="ajustes"]', '#/ajustes', 'Ajustes');
    afirmar(await d.getAttribute('.lateral a[data-modulo="ajustes"]', 'aria-current') === 'page', 'marcado');
  });
  afirmar(d.errores.length === 0, d.errores.join(' | '));
  await d.context().close();

  // ---------- 320 px ----------
  await caso('320 px: ninguna pantalla se desborda a lo ancho', async () => {
    const s = await nuevaPagina(nav, { width: 320, height: 640 });
    const malas = [];
    for (const r of ['inicio', 'mas', 'clientes', 'inventario/productos', 'inventario/stock', 'ventas/ventas', 'ventas/pendientes', 'facturas', 'gastos', 'reportes/resumen', 'ajustes']) {
      await s.evaluate((r) => { location.hash = '#/' + r; }, r);
      await s.waitForTimeout(50);
      const w = await s.evaluate(() => document.documentElement.scrollWidth);
      if (w > 320) malas.push(`${r}: ${w}px`);
    }
    await s.context().close();
    afirmar(malas.length === 0, malas.join(', '));
  });

  // ---------- Sin conexión (service worker) ----------
  await caso('sin conexión: la app abre, navega, y un archivo inexistente no recibe index.html', async () => {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const s = await ctx.newPage();
    await s.goto(URL_APP);
    await s.evaluate(() => navigator.serviceWorker.ready);
    await s.reload();
    await s.waitForFunction(() => !!navigator.serviceWorker.controller);
    await ctx.setOffline(true);
    await s.reload(); await s.waitForSelector('#contenido .panel-hoy');
    await ir(s, '.pestanas [data-modulo="mas"]', '#/mas', 'Más');
    await ir(s, '#contenido [data-destino="reportes"]', '#/reportes/resumen', 'Reportes');
    const r = await s.evaluate(() => fetch('./src/no-existe.js').then((x) => ({ ok: x.ok, tipo: x.headers.get('content-type') })).catch(() => ({ ok: false, tipo: 'error de red' })));
    afirmar(!r.ok && !(r.tipo || '').includes('html'), 'respondió ' + JSON.stringify(r));
    await ctx.close();
  });

  await caso('versión nueva: avisa, no se activa sola y al pulsar "Actualizar" recarga con la nueva', async () => {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    const s = await ctx.newPage();
    await s.goto(URL_APP);
    await s.evaluate(() => navigator.serviceWorker.ready);
    await s.reload(); await s.waitForFunction(() => !!navigator.serviceWorker.controller);
    const cacheAntes = await s.evaluate(() => caches.keys());
    versionNueva = true;
    await s.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    await s.waitForSelector('.toast:has-text("Hay una versión nueva")', { timeout: 10000 });
    afirmar(JSON.stringify(await s.evaluate(() => caches.keys())).includes(cacheAntes[0]), 'la versión vieja dejó de funcionar antes de aceptar');
    await Promise.all([s.waitForEvent('load', { timeout: 10000 }), s.click('.toast [data-accion="principal"]')]);
    await s.waitForFunction(() => !!navigator.serviceWorker.controller);
    const cacheDespues = await s.evaluate(() => caches.keys());
    afirmar(cacheDespues.length === 1 && cacheDespues[0].endsWith('nueva'), 'cachés tras actualizar: ' + cacheDespues);
    versionNueva = false;
    await ctx.close();
  });

  await nav.close(); servidor.close();
  const fallas = resultados.filter((r) => r[0] !== 'OK');
  for (const r of resultados) console.log(r[0].padEnd(5), r[1], r[2] ? '→ ' + r[2] : '');
  console.log(`\n${resultados.length - fallas.length}/${resultados.length} casos correctos`);
  process.exitCode = fallas.length ? 1 : 0;
})();
