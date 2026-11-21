// Mide tiempos de renderizado de cada pestaña con volúmenes grandes de datos ficticios.
// Uso: node perf.js <carpeta-de-la-app>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = process.argv[2];
const srv = http.createServer((q, r) => { const p = path.join(DIR, q.url.split('?')[0].replace(/\/$/, '/index.html')); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, {'Content-Type': p.endsWith('.html')?'text/html':'text/javascript'}); r.end(d); }); }).listen(8713);
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
(async()=>{
  const b=await chromium.launch();const out={};
  for(const N of [1000,5000]){
    const page=await b.newPage();await page.route(/fonts/,r=>r.abort());
    await page.goto('http://localhost:8713/index.html');
    const seed=datos(N);
    const bytes=await page.evaluate(s=>{localStorage.clear();let t=0;for(const[k,v]of Object.entries(s)){const j=JSON.stringify(v);t+=j.length;localStorage.setItem(k,j);}return t;},seed);
    const t0=Date.now();await page.reload();await page.waitForSelector('#listWrap .row');const carga=Date.now()-t0;
    const r={kb:Math.round(bytes/1024),carga_ms:carga};
    for(const v of ['clientes','inventario','ventas','facturas','gastos','reportes']){
      const ms=await page.evaluate(v=>{const t=performance.now();document.querySelector(`.tab[data-view="${v}"]`).click();return Math.round(performance.now()-t);},v);r[v]=ms;}
    for(const [g,val] of [['invsub','stock'],['invsub','historial']]){await page.click('.tab[data-view="inventario"]');r['inv_'+val]=await page.evaluate(([g,val])=>{const t=performance.now();document.querySelector(`[data-group="${g}"] button[data-val="${val}"]`).click();return Math.round(performance.now()-t);},[g,val]);}
    await page.click('.tab[data-view="reportes"]');
    for(const val of ['caja','flujo']) r['rep_'+val]=await page.evaluate(val=>{const t=performance.now();document.querySelector(`[data-group="vista"] button[data-val="${val}"]`).click();return Math.round(performance.now()-t);},val);
    await page.click('[data-group="vista"] button[data-val="caja"]');
    r.rep_caja_mes=await page.evaluate(()=>{const t=performance.now();document.querySelector('[data-group="cajamodo"] button[data-val="mes"]').click();return Math.round(performance.now()-t);});
    r.tecla_busqueda_clientes=await page.evaluate(()=>{document.querySelector('.tab[data-view="clientes"]').click();const i=document.getElementById('searchInput');const t=performance.now();i.value='Cliente 1';i.dispatchEvent(new Event('input'));return Math.round(performance.now()-t);});
    out['ventas='+N]=r;await page.close();
  }
  console.log(JSON.stringify(out,null,1));await b.close();srv.close();
})();
