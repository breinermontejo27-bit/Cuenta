const CACHE = "cuentas-v4";
const FILES = [
  "./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./css/styles.css",
  "./js/ajustes.js",
  "./js/app.js",
  "./js/clientes.js",
  "./js/creditos.js",
  "./js/dom.js",
  "./js/facturas.js",
  "./js/gastos.js",
  "./js/inventario.js",
  "./js/main.js",
  "./js/pedidos.js",
  "./js/reportes.js",
  "./js/respaldo.js",
  "./js/state.js",
  "./js/ui.js",
  "./js/utils.js",
  "./js/venta-wizard.js",
  "./js/ventas.js",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero intenta la versión de internet (así llegan las actualizaciones);
// si no hay conexión, usa la copia guardada en el teléfono.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
  );
});
