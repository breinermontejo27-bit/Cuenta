// Arranque de Orisma 2.0 y lista de módulos.
// Para agregar un módulo: crear su carpeta en features/ e incluirlo en MODULOS (Etapa 2, §3.5).

import { eventos, EVENTOS } from './core/events.js';
import { MODO_PRUEBA } from './core/config.js';
import { iniciarCapturaErrores, registrarError, informarError, conectarRegistro, ErrorDeAlmacenamiento } from './core/errors.js';
import { iniciarNavegacion, registrarHoja } from './core/navigation.js';
import { iniciarMarco } from './ui/layouts/app-shell.js';
import { notificar } from './ui/notifications/toast.js';
import { cargarEnMemoria, pedirPersistencia, transaccion } from './data/database.js';
import { importarLegado } from './data/legacy-import.js';
import { leerRegistroErrores, guardarRegistroErrores } from './operations/diagnostics.js';
import { protegerConPin, vigilarSegundoPlano } from './features/settings/lock-screen.js';
import { avisarSiCambioLaVersionAnterior } from './features/settings/migration-section.js';
import { limpiarImagenes } from './operations/migration.js';

import clientes from './features/clients/index.js';
import inventario from './features/inventory/index.js';
import ventas from './features/sales/index.js';
import facturas from './features/invoices/index.js';
import gastos from './features/expenses/index.js';
import reportes from './features/reports/index.js';
import ajustes from './features/settings/settings-menu.js';
import creditos from './features/credits/index.js';
import inicio from './features/home/index.js';
import mas from './features/more/index.js';

const MODULOS = [inicio, clientes, inventario, ventas, facturas, gastos, reportes, ajustes, mas];
// Módulos sin pestaña propia que solo aportan hojas (se abren desde otros módulos).
const MODULOS_DE_HOJAS = [creditos];

async function iniciar() {
  iniciarCapturaErrores(window);
  eventos.escuchar(EVENTOS.ERROR, ({ mensaje, grave }) => notificar(mensaje, { tipo: grave ? 'grave' : 'error' }));
  eventos.escuchar(EVENTOS.ACTUALIZACION, ({ activar }) => notificar('Hay una versión nueva de Orisma.', {
    duracion: 15000, accion: { texto: 'Actualizar', alPulsar: activar },
  }));
  await conectarRegistroGuardado();
  await cargarDatos();
  // Con PIN activado, nada de la app se pinta hasta escribirlo (Etapa 8).
  await protegerConPin();
  vigilarSegundoPlano();
  for (const m of [...MODULOS, ...MODULOS_DE_HOJAS]) for (const [nombre, abrir] of Object.entries(m.hojas || {})) registrarHoja(nombre, abrir);
  iniciarMarco(document.getElementById('app'), MODULOS);
  iniciarNavegacion({ modulos: MODULOS, inicial: 'inicio' });
  registrarServiceWorker();
  mantenimiento();
}

/** Tareas tranquilas después de abrir: avisar si la versión anterior cambió y borrar imágenes que ya no se usan. */
function mantenimiento() {
  const luego = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  luego(() => {
    avisarSiCambioLaVersionAnterior();
    limpiarImagenes().catch((e) => registrarError(e, 'limpiar imágenes'));
    retirarCacheDeLaAppAnterior().catch((e) => registrarError(e, 'caché anterior'));
  });
}

/**
 * El service worker de Orisma borra el caché de la app anterior ("cuentas-…") al instalarse, pero el de la app
 * anterior, que todavía atiende esa primera carga, puede volver a crearlo. Cuando Orisma ya controla la página y
 * tiene su caché completo, se borra lo que haya quedado: no sirve para nada y ocupa espacio. En la copia de prueba
 * no se toca (la app anterior sigue en uso en la dirección principal).
 */
async function retirarCacheDeLaAppAnterior() {
  if (MODO_PRUEBA || !('caches' in window) || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
  const claves = await caches.keys();
  if (!claves.some((k) => k.startsWith('orisma-') && !k.startsWith('orisma-prueba-'))) return;
  await Promise.all(claves.filter((k) => k.startsWith('cuentas-')).map((k) => caches.delete(k)));
}

/** El registro de errores sobrevive a recargar la app (se guarda en el dispositivo; nunca se envía). */
async function conectarRegistroGuardado() {
  let anteriores = [];
  try { anteriores = await leerRegistroErrores(); } catch (_) { /* sin almacenamiento: queda solo en memoria */ }
  conectarRegistro(anteriores, guardarRegistroErrores);
}

/**
 * Carga los datos guardados. La primera vez trae los datos de la versión anterior (localStorage) sin borrarlos.
 * Si algo falla, la app arranca vacía y lo avisa: nunca se pierde lo que estaba guardado.
 */
async function cargarDatos() {
  try {
    const importacion = await importarLegado();
    if (importacion.estado === 'importado') {
      const c = importacion.conteos;
      notificar(`Se trajeron tus datos de la versión anterior: ${c.clientes} clientes, ${c.inventario} productos, ${c.ventas} ventas y ${c.gastos} gastos. Los originales no se borraron.`, { tipo: 'exito', duracion: 9000 });
    } else if (importacion.estado === 'error') {
      registrarError(new Error(importacion.errores.join(' | ')), 'importar datos anteriores');
      notificar('No se pudieron traer los datos de la versión anterior. Siguen intactos donde estaban; no se cambió nada.', { tipo: 'grave' });
    }
    await cargarEnMemoria();
    pedirPersistencia().then((ok) => transaccion(['meta'], 'readwrite', (a) => a('meta').put({ k: 'persistente', v: ok }))).catch(() => {});
  } catch (e) {
    informarError(e instanceof ErrorDeAlmacenamiento ? e : new ErrorDeAlmacenamiento(String(e && e.message), e), 'cargar datos');
  }
}

/**
 * Registra el service worker y avisa cuando hay una versión nueva esperando (no actualiza a mitad de una operación).
 * Si el navegador no lo permite (p. ej. algunas ventanas privadas), se anota en el registro sin alarmar al usuario.
 */
async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) location.reload();
  });
  // ¿Ya había una versión de Orisma funcionando en esta dirección? Se mira ANTES de registrar, por su caché propio
  // ("orisma-…", o "orisma-prueba-…" en la copia de prueba). No sirve mirar si hay un service worker activo: el de la
  // app anterior "Cuentas" usa el mismo archivo sw.js y la misma dirección. Solo así "Hay una versión nueva" no aparece
  // en la primera instalación, ni el día en que Orisma reemplaza a la app anterior.
  const prefijo = MODO_PRUEBA ? 'orisma-prueba-' : 'orisma-';
  let habiaVersion = false;
  try { habiaVersion = (await caches.keys()).some((k) => k.startsWith(prefijo) && (MODO_PRUEBA || !k.startsWith('orisma-prueba-'))); } catch (_) { /* sin caché: se trata como primera vez */ }
  navigator.serviceWorker.register('sw.js').then((reg) => {
    if (!reg) return; // algunos navegadores (o modos de prueba) lo bloquean sin dar error
    const avisar = (trabajador) => { if (habiaVersion) eventos.emitir(EVENTOS.ACTUALIZACION, { activar: () => { recargando = true; trabajador.postMessage('ACTIVAR'); } }); };
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisar(nuevo);
      });
    });
  }).catch((e) => registrarError(e, 'service-worker')); // la app funciona igual; solo no habrá modo sin conexión
}

iniciar().catch((e) => informarError(e, 'arranque'));
