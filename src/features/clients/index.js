// Módulo Clientes: descripción para el registro de módulos (Etapa 2, §3.5).
// Etapa 4: solo registra la pestaña y la acción principal. La pantalla real se construye en la Etapa 7.

import { html, montar } from '../../ui/html.js';
import { estadoVacio } from '../../ui/components/list.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';

export default {
  id: 'clientes',
  titulo: 'Clientes',
  icono: 'clientes',
  orden: 10,
  buscador: 'Buscar cliente',
  subvistas: [],
  usa: ['clientes', 'ventas'],
  accionPrincipal: { texto: 'Nuevo cliente', ejecutar: ({ sub }) => abrirPendiente(sub) },
  dibujar(contenedor) {
    montar(contenedor, estadoVacio({
      icono: 'clientes',
      titulo: 'Se reconstruye en la Etapa 7',
      texto: 'Lista de clientes, deudas, formulario e importación de contactos.',
    }));
  },
};

function abrirPendiente(sub) {
  const capa = abrirHoja({
    titulo: 'Clientes',
    paso: sub ? `Vista: ${sub}` : '',
    cuerpo: estadoVacio({ icono: 'clientes', titulo: 'Formulario en construcción', texto: 'Este formulario se construye en la Etapa 7. La hoja ya funciona: se cierra con la X, tocando fuera, con Escape o con el botón atrás del teléfono.' }),
    pie: html`<div class="acciones"><button type="button" class="btn btn-secundario" data-accion="entendido">Entendido</button></div>`,
  });
  capa.elemento.querySelector('[data-accion="entendido"]').addEventListener('click', capa.cerrar);
}
