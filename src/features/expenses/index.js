// Módulo Gastos: descripción para el registro de módulos (Etapa 2, §3.5).
// Etapa 4: solo registra la pestaña y la acción principal. La pantalla real se construye en la Etapa 7.

import { html, montar } from '../../ui/html.js';
import { estadoVacio } from '../../ui/components/list.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';

export default {
  id: 'gastos',
  titulo: 'Gastos',
  icono: 'gastos',
  orden: 50,
  buscador: 'Buscar gasto o categoría',
  subvistas: [],
  usa: ['gastos'],
  accionPrincipal: { texto: 'Nuevo gasto', ejecutar: ({ sub }) => abrirPendiente(sub) },
  dibujar(contenedor) {
    montar(contenedor, estadoVacio({
      icono: 'gastos',
      titulo: 'Se reconstruye en la Etapa 7',
      texto: 'Gastos generales y compras de inventario.',
    }));
  },
};

function abrirPendiente(sub) {
  const capa = abrirHoja({
    titulo: 'Gastos',
    paso: sub ? `Vista: ${sub}` : '',
    cuerpo: estadoVacio({ icono: 'gastos', titulo: 'Formulario en construcción', texto: 'Este formulario se construye en la Etapa 7. La hoja ya funciona: se cierra con la X, tocando fuera, con Escape o con el botón atrás del teléfono.' }),
    pie: html`<div class="acciones"><button type="button" class="btn btn-secundario" data-accion="entendido">Entendido</button></div>`,
  });
  capa.elemento.querySelector('[data-accion="entendido"]').addEventListener('click', capa.cerrar);
}
