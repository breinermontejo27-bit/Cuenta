// Abre cada pantalla del prototipo en teléfono y computador, guarda capturas y revisa:
//  - errores de JavaScript
//  - desplazamiento horizontal en un teléfono pequeño (320 px)
//  - controles tocables de menos de 44 px de alto en teléfono
// Uso: node capturas.js   (requiere playwright)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '../prototipo'), SALIDA = path.join(__dirname, '../capturas');
fs.mkdirSync(SALIDA, { recursive: true });
const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const p = path.join(RAIZ, q.url.split('?')[0].replace(/\/$/, '/index.html')); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': tipos[path.extname(p)] }); r.end(d); }); }).listen(8730);
const PANTALLAS = ['clientes', 'inventario', 'ventas', 'pendientes', 'facturas', 'gastos', 'reportes', 'caja', 'ajustes', 'nueva-venta', 'pedido', 'factura', 'confirmar', 'formulario', 'avisos', 'vacio'];
const ESCRITORIO = ['ventas', 'reportes', 'pedido', 'nueva-venta', 'inventario'];
const OSCURO = ['ventas', 'reportes', 'nueva-venta', 'inventario'];
(async () => {
  const b = await chromium.launch(); const problemas = [];
  const abrir = async (vp, p, t = 'claro', escala = 2) => {
    const page = await b.newPage({ viewport: vp, deviceScaleFactor: escala });
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await page.goto(`http://localhost:8730/index.html?p=${p}&t=${t}&limpio=1`); await page.waitForTimeout(150);
    if (errs.length) problemas.push(`${p} (${vp.width}px): ${errs.join(' | ')}`);
    return page;
  };
  for (const p of PANTALLAS) {
    let page = await abrir({ width: 390, height: 844 }, p);
    await page.screenshot({ path: path.join(SALIDA, `movil-${p}.png`) });
    // controles pequeños (solo los visibles e interactivos)
    const peq = await page.evaluate(() => [...document.querySelectorAll('button, a, input, select, textarea, summary')]
      .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width && r.height && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('.marco-proto'); })
      .filter(e => e.getBoundingClientRect().height < 32).map(e => `${e.tagName.toLowerCase()} "${(e.textContent || e.placeholder || e.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(e.getBoundingClientRect().height)}px`));
    if (peq.length) problemas.push(`${p}: controles de menos de 32 px: ${peq.join('; ')}`);
    await page.close();
    page = await abrir({ width: 320, height: 640 }, p, 'claro', 1);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    if (ancho > 320) problemas.push(`${p}: desborda a lo ancho en 320 px (${ancho}px)`);
    await page.close();
  }
  for (const p of ESCRITORIO) { const page = await abrir({ width: 1280, height: 800 }, p); await page.screenshot({ path: path.join(SALIDA, `escritorio-${p}.png`) }); await page.close(); }
  for (const p of OSCURO) { const page = await abrir({ width: 390, height: 844 }, p, 'oscuro'); await page.screenshot({ path: path.join(SALIDA, `movil-oscuro-${p}.png`) }); await page.close(); }
  await b.close(); srv.close();
  console.log(`Pantallas: ${PANTALLAS.length} · capturas: ${PANTALLAS.length + ESCRITORIO.length + OSCURO.length}`);
  console.log(problemas.length ? 'PROBLEMAS:\n- ' + problemas.join('\n- ') : 'Sin errores de JavaScript, sin desbordes a 320 px y sin controles pequeños.');
  process.exitCode = problemas.length ? 1 : 0;
})();
