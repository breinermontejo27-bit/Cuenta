// Módulo Ventas: descripción para el registro de módulos (Etapa 2, §3.5).
// Etapa 4: solo registra la pestaña, las subvistas y la acción principal. La pantalla real se construye en la Etapa 7.

import { html, montar } from '../../ui/html.js';
import { estadoVacio } from '../../ui/components/list.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';

export default {
  id: 'ventas',
  titulo: 'Ventas',
  icono: 'ventas',
  orden: 30,
  buscador: (sub) => (sub === 'pendientes' ? 'Buscar por cliente' : 'Buscar por cliente o folio'),
  subvistas: [{ id: 'ventas', titulo: 'Ventas' }, { id: 'pendientes', titulo: 'Pendientes' }],
  usa: ['ventas', 'pedidos', 'clientes', 'inventario'],
  accionPrincipal: { texto: (sub) => (sub === 'pendientes' ? 'Nuevo pendiente' : 'Nueva venta'), ejecutar: ({ sub }) => abrirPendiente(sub) },
  dibujar(contenedor) {
    montar(contenedor, estadoVacio({
      icono: 'ventas',
      titulo: 'Se reconstruye en la Etapa 7',
      texto: 'Ventas, asistente de venta, pedidos, encargos y apartados.',
    }));
  },
};

function abrirPendiente(sub) {
  const capa = abrirHoja({
    titulo: 'Ventas',
    paso: sub ? `Vista: ${sub}` : '',
    cuerpo: estadoVacio({ icono: 'ventas', titulo: 'Formulario en construcción', texto: 'Este formulario se construye en la Etapa 7. La hoja ya funciona: se cierra con la X, tocando fuera, con Escape o con el botón atrás del teléfono.' }),
    pie: html`<div class="acciones"><button type="button" class="btn btn-secundario" data-accion="entendido">Entendido</button></div>`,
  });
  capa.elemento.querySelector('[data-accion="entendido"]').addEventListener('click', capa.cerrar);
}
