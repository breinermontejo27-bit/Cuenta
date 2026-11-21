// Prueba de viabilidad de IndexedDB: transacción que se deshace, imágenes binarias, cuota, convivencia con localStorage.
// Uso: node indexeddb-spike.js  (requiere playwright)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(fs.readFileSync(__dirname + "/indexeddb-spike.html")); }).listen(8720);
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8720/'); await p.evaluate(() => localStorage.setItem('cuentas_clientes', '[{"id":"c1"}]'));
  await p.reload(); await p.waitForFunction(() => window.__out, null, { timeout: 60000 });
  console.log(JSON.stringify(await p.evaluate(() => window.__out), null, 1)); await b.close(); srv.close(); })();
