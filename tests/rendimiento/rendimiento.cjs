// Etapa 9 · Rendimiento: mismos datos y mismo método en la app ORIGINAL (9300dfa) y en Orisma.
// Datos ficticios generados igual que en la Etapa 1 (docs/orisma-2.0/etapa-1/pruebas/perf.js).
// Tiempo de una pantalla = desde el toque hasta que el contenido cambió y el navegador calculó el diseño.
// Uso: node tests/rendimiento/rendimiento.cjs   (requiere playwright y git). Resultado en JSON.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const RAIZ = path.join(__dirname, '..', '..');
const VIEJO = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-original-'));
execSync(`git -C "${RAIZ}" archive 9300dfa | tar -x -C "${VIEJO}"`);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PUERTO = 8800;
const srv = http.createServer((q, r) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  const [raiz, rel] = url.startsWith('/viejo/') ? [VIEJO, url.slice(7)] : [RAIZ, url.slice(1)];
  const p = path.join(raiz, rel || 'index.html');
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
}).listen(PUERTO);
function datos(N){ // N = escala
  const C=N*0.3|0, P=N*0.2|0, V=N, G=N*0.5|0, PD=N*0.1|0;
  const d=i=>`2026-${String(1+i%11).padStart(2,'0')}-${String(1+i%28).padStart(2,'0')}`;
  const clientes=[...Array(C)].map((_,i)=>({id:'c'+i,nombre:'Cliente '+i,telefono:'300'+i}));
  const inventario=[...Array(P)].map((_,i)=>({id:'p'+i,nombre:'Producto '+i,precio:1000+i,costo:600,stock:i%7,categoria:'Cat'+(i%9)}));
  const ventas=[...Array(V)].map((_,i)=>({id:'v'+i,folio:i%2?i:null,clienteId:'c'+(i%C),clienteNombre:'Cliente '+(i%C),fecha:d(i),creadoTs:i,items:[{productoId:'p'+(i%P),nombre:'Producto '+(i%P),cantidad:1+i%3,precio:1000}],total:3000,costoTotal:1800,fiado:i%4===0,metodoPago:i%4===0?'credito':'efectivo',abonos:i%4===0?[{id:'a'+i,fecha:d(i),monto:1000,metodo:'efectivo'}]:[{id:'a'+i,fecha:d(i),monto:3000,metodo:'efectivo'}]}));
  const gastos=[...Array(G)].map((_,i)=>({id:'g'+i,tipo:i%3?'general':'compra',productoId:'p'+(i%P),cantidad:2,descripcion:'Gasto '+i,monto:500,fecha:d(i),categoria:'X',metodo:'efectivo'}));
  const pedidos=[...Array(PD)].map((_,i)=>({id:'pd'+i,tipo:['pedido','encargo','apartado'][i%3],estado:'pendiente',clienteId:'c'+(i%C),clienteNombre:'Cliente '+(i%C),fechaEntrega:d(i),creadoTs:i,items:[{productoId:'p'+(i%P),nombre:'Producto',cantidad:1,precio:1000}],anticipo:0,abonos:[]}));
  return {cuentas_clientes:clientes,cuentas_inventario:inventario,cuentas_ventas:ventas,cuentas_gastos:gastos,cuentas_pedidos:pedidos,cuentas_movimientos:[],cuentas_config:{nombre:'X',moneda:'$',impuesto:0,siguienteFolio:1}};
}
const FOTO = 'data:image/jpeg;base64,' + Buffer.alloc(30000, 7).toString('base64'); // ~40 KB por foto (no se decodifica)

// Espera a que cambie el contenido y fuerza el cálculo del diseño. Devuelve ms.
const medir = (page, accion, sel) => page.evaluate(([accion, sel]) => new Promise((ok) => {
  const cont = document.querySelector(sel);
  const t = performance.now();
  const obs = new MutationObserver(() => { obs.disconnect(); void document.body.offsetHeight; ok(Math.round(performance.now() - t)); });
  obs.observe(cont, { childList: true, subtree: true, characterData: true });
  new Function(accion)();
}), [accion, sel]);

async function original(nav, N) {
  const page = await nav.newPage();
  await page.goto(`http://localhost:${PUERTO}/viejo/index.html`);
  const seed = datos(N);
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, seed);
  let t0 = Date.now(); await page.reload(); await page.waitForSelector('#listWrap .row'); const carga = Date.now() - t0;
  const r = { carga_ms: carga };
  const tab = (v) => `document.querySelector('.tab[data-view="${v}"]').click()`;
  const C = '#listWrap';
  await page.evaluate(tab('ventas'));
  for (const v of ['clientes', 'inventario', 'ventas', 'facturas', 'gastos']) r[v] = await medir(page, tab(v), C);
  await page.evaluate(tab('inventario'));
  for (const val of ['stock', 'historial']) r['inv_' + val] = await medir(page, `document.querySelector('[data-group="invsub"] button[data-val="${val}"]').click()`, C);
  r.reportes = await medir(page, tab('reportes'), C);
  for (const val of ['caja', 'flujo']) r['rep_' + val] = await medir(page, `document.querySelector('[data-group="vista"] button[data-val="${val}"]').click()`, C);
  await page.evaluate(tab('clientes'));
  r.tecla_busqueda = await medir(page, "const i=document.getElementById('searchInput');i.value='Cliente 1';i.dispatchEvent(new Event('input'))", C);
  await page.evaluate(tab('ventas'));
  r.tecla_busqueda_ventas = await medir(page, "const i=document.getElementById('searchInput');i.value='Cliente 1';i.dispatchEvent(new Event('input'))", C);
  await page.close();
  return r;
}

async function orisma(nav, N, fotos) {
  const ctx = await nav.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PUERTO}/index.html`);
  const seed = datos(N);
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, seed);
  await page.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('orisma'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  let t0 = Date.now(); await page.reload(); await page.waitForSelector('#contenido .lista'); const importacion = Date.now() - t0;
  // Las fotos no caben en el almacenamiento de la versión original (D4-10): se agregan ya en Orisma.
  if (fotos) await page.evaluate(async ([n, foto]) => {
    const db = await import('./src/data/database.js'); const st = await import('./src/core/state.js');
    const inv = st.coleccion('inventario').map((p, i) => (i < n ? { ...p, foto: foto.slice(0, -8) + String(i).padStart(8, 'A') } : p));
    await db.guardarCambios({ colecciones: { inventario: inv } });
  }, [fotos, FOTO]);
  t0 = Date.now(); await page.reload(); await page.waitForSelector('#contenido .lista'); const carga = Date.now() - t0;
  const r = { importacion_ms: importacion, carga_ms: carga };
  const ir = (h) => `location.hash='${h}'`;
  const C = '#contenido';
  await page.evaluate(ir('#/ventas/ventas')); await page.waitForTimeout(300);
  for (const [k, h] of [['clientes', '#/clientes'], ['inventario', '#/inventario/productos'], ['ventas', '#/ventas/ventas'], ['facturas', '#/facturas'], ['gastos', '#/gastos'], ['inv_stock', '#/inventario/stock'], ['inv_historial', '#/inventario/historial'], ['reportes', '#/reportes/resumen'], ['rep_caja', '#/reportes/caja'], ['rep_flujo', '#/reportes/flujo']]) {
    r[k] = await medir(page, ir(h), C);
    await page.waitForTimeout(100);
  }
  for (const [k, h] of [['tecla_busqueda', '#/clientes'], ['tecla_busqueda_ventas', '#/ventas/ventas']]) {
    await page.evaluate(ir(h)); await page.waitForTimeout(200);
    r[k] = await medir(page, "const i=document.getElementById('campoBuscar');i.value='Cliente 1';i.dispatchEvent(new Event('input'))", C);
    await page.evaluate("const i=document.getElementById('campoBuscar');i.value='';i.dispatchEvent(new Event('input'))"); await page.waitForTimeout(400);
  }
  r.nodos_ventas = await page.evaluate(() => { location.hash = '#/ventas/ventas'; return new Promise((ok) => setTimeout(() => ok(document.querySelectorAll('#contenido *').length), 300)); });
  r.errores = await page.evaluate(() => import('./src/core/errors.js').then((m) => m.erroresRegistrados().length));
  await ctx.close();
  return r;
}

(async () => {
  const nav = await chromium.launch();
  const out = {};
  const REP = 3; // se toma la mediana de 3 corridas
  const mediana = (lista) => { const r = {}; for (const k of Object.keys(lista[0])) { const v = lista.map((x) => x[k]).sort((a, b) => a - b); r[k] = v[Math.floor(v.length / 2)]; } return r; };
  for (const N of [1000, 5000]) {
    const o = [], n = [];
    for (let i = 0; i < REP; i++) { o.push(await original(nav, N)); n.push(await orisma(nav, N, 0)); }
    out[`original ${N} ventas`] = mediana(o);
    out[`orisma ${N} ventas`] = mediana(n);
  }
  out['orisma 5000 ventas + 200 fotos'] = await orisma(nav, 5000, 200);
  console.log(JSON.stringify(out, null, 1));
  await nav.close(); srv.close();
})();
