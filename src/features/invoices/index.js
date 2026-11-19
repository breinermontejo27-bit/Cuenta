// Módulo Facturas: descripción para el registro de módulos (Etapa 2, §3.5).
// Etapa 4: solo registra la pestaña y la acción principal. La pantalla real se construye en la Etapa 7.

import { html, montar } from '../../ui/html.js';
import { estadoVacio } from '../../ui/components/list.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';

export default {
  id: 'facturas',
  titulo: 'Facturas',
  icono: 'facturas',
  orden: 40,
  buscador: 'Buscar por cliente o folio',
  subvistas: [],
  usa: ['ventas'],
  accionPrincipal: { texto: 'Facturar venta', ejecutar: ({ sub }) => abrirPendiente(sub) },
  dibujar(contenedor) {
    montar(contenedor, estadoVacio({
      icono: 'facturas',
      titulo: 'Se reconstruye en la Etapa 7',
      texto: 'Lista de facturas, documento, PDF, impresión, edición y anulación.',
    }));
  },
};

function abrirPendiente(sub) {
  const capa = abrirHoja({
    titulo: 'Facturas',
    paso: sub ? `Vista: ${sub}` : '',
    cuerpo: estadoVacio({ icono: 'facturas', titulo: 'Formulario en construcción', texto: 'Este formulario se construye en la Etapa 7. La hoja ya funciona: se cierra con la X, tocando fuera, con Escape o con el botón atrás del teléfono.' }),
    pie: html`<div class="acciones"><button type="button" class="btn btn-secundario" data-accion="entendido">Entendido</button></div>`,
  });
  capa.elemento.querySelector('[data-accion="entendido"]').addEventListener('click', capa.cerrar);
}
