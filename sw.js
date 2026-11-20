// Service worker de Orisma: funcionamiento sin conexión y actualizaciones (Etapa 2, §12).
// La lista de archivos y la versión salen de src/precache-list.js (generado por tools/precache.js).
// - Navegación: la página guardada (index.html); si no está, la red.
// - Archivos de la app: primero la copia guardada, luego la red.
// - Nunca se responde con index.html a algo que no sea una navegación (corrige D4-12).
// - La versión nueva espera hasta que el usuario acepta "Actualizar" (salvo la primera instalación).

importScripts('./src/precache-list.js');
const { version, archivos } = self.ORISMA_PRECACHE;
const CACHE = 'orisma-' + version;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(archivos))
    // Primera instalación de Orisma (incluido el paso desde la app anterior "Cuentas", cuyo caché se llama
    // "cuentas-…"): se activa enseguida. No hay una versión de Orisma a mitad de una operación que proteger.
    // Las actualizaciones de Orisma a Orisma siguen esperando a que el usuario toque "Actualizar".
    .then(() => caches.keys())
    .then((claves) => { if (!claves.some((k) => k.startsWith('orisma-') && k !== CACHE)) return self.skipWaiting(); return undefined; }));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'ACTIVAR') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html', { cacheName: CACHE }).then((guardada) => guardada || fetch(req)),
    );
    return;
  }
  e.respondWith(
    caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((guardada) => guardada || fetch(req)),
  );
});
