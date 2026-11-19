// Arranque de Orisma 2.0 y lista de módulos.
// Para agregar un módulo: crear su carpeta en features/ e incluirlo en MODULOS (Etapa 2, §3.5).

import { eventos, EVENTOS } from './core/events.js';
import { iniciarCapturaErrores, registrarError } from './core/errors.js';
import { iniciarNavegacion } from './core/navigation.js';
import { iniciarMarco } from './ui/layouts/app-shell.js';
import { notificar } from './ui/notifications/toast.js';

import clientes from './features/clients/index.js';
import inventario from './features/inventory/index.js';
import ventas from './features/sales/index.js';
import facturas from './features/invoices/index.js';
import gastos from './features/expenses/index.js';
import reportes from './features/reports/index.js';
import ajustes from './features/settings/settings-menu.js';

const MODULOS = [clientes, inventario, ventas, facturas, gastos, reportes, ajustes];

function iniciar() {
  iniciarCapturaErrores(window);
  eventos.escuchar(EVENTOS.ERROR, ({ mensaje, grave }) => notificar(mensaje, { tipo: grave ? 'grave' : 'normal' }));
  eventos.escuchar(EVENTOS.ACTUALIZACION, ({ activar }) => notificar('Hay una versión nueva de Orisma.', {
    duracion: 15000, accion: { texto: 'Actualizar', alPulsar: activar },
  }));
  // Etapa 5: aquí se cargarán los datos y ajustes guardados antes de pintar.
  iniciarMarco(document.getElementById('app'), MODULOS);
  iniciarNavegacion({ modulos: MODULOS, inicial: 'clientes' });
  registrarServiceWorker();
}

/**
 * Registra el service worker y avisa cuando hay una versión nueva esperando (no actualiza a mitad de una operación).
 * Si el navegador no lo permite (p. ej. algunas ventanas privadas), se anota en el registro sin alarmar al usuario.
 */
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) location.reload();
  });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const avisar = (trabajador) => eventos.emitir(EVENTOS.ACTUALIZACION, {
      activar: () => { recargando = true; trabajador.postMessage('ACTIVAR'); },
    });
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisar(nuevo);
      });
    });
  }).catch((e) => registrarError(e, 'service-worker')); // la app funciona igual; solo no habrá modo sin conexión
}

iniciar();
