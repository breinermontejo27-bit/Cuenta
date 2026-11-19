// Módulo Inventario: descripción para el registro de módulos (Etapa 2, §3.5).
// Etapa 4: solo registra la pestaña, las subvistas y la acción principal. La pantalla real se construye en la Etapa 7.

import { html, montar } from '../../ui/html.js';
import { estadoVacio } from '../../ui/components/list.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';

export default {
  id: 'inventario',
  titulo: 'Inventario',
  icono: 'inventario',
  orden: 20,
  buscador: 'Buscar producto',
  subvistas: [{ id: 'productos', titulo: 'Productos' }, { id: 'stock', titulo: 'Stock' }, { id: 'historial', titulo: 'Historial' }],
  usa: ['inventario', 'pedidos', 'ventas', 'gastos', 'movimientos'],
  accionPrincipal: { texto: 'Nuevo producto', subvistas: ['productos'], ejecutar: ({ sub }) => abrirPendiente(sub) },
  dibujar(contenedor) {
    montar(contenedor, estadoVacio({
      icono: 'inventario',
      titulo: 'Se reconstruye en la Etapa 7',
      texto: 'Productos, poco stock, reservas, compras, resumen de stock e historial.',
    }));
  },
};

function abrirPendiente(sub) {
  const capa = abrirHoja({
    titulo: 'Inventario',
    paso: sub ? `Vista: ${sub}` : '',
    cuerpo: estadoVacio({ icono: 'inventario', titulo: 'Formulario en construcción', texto: 'Este formulario se construye en la Etapa 7. La hoja ya funciona: se cierra con la X, tocando fuera, con Escape o con el botón atrás del teléfono.' }),
    pie: html`<div class="acciones"><button type="button" class="btn btn-secundario" data-accion="entendido">Entendido</button></div>`,
  });
  capa.elemento.querySelector('[data-accion="entendido"]').addEventListener('click', capa.cerrar);
}
