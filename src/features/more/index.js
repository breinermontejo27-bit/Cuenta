// Más (ajuste visual final, Estilo 1 aprobado): en el teléfono reúne lo que no cabe en la barra de abajo:
// Facturas, Gastos, Reportes, Créditos, Pendientes y Ajustes. En el computador no aparece: todo está en la barra lateral.

import { irA, pedirHoja } from '../../core/navigation.js';
import { html, icono, montar } from '../../ui/html.js';

const DESTINOS = [
  ['facturas', 'Facturas', 'facturas'], ['gastos', 'Gastos', 'gastos'], ['reportes', 'Reportes', 'reportes'],
  ['creditos', 'Créditos', 'caja'], ['pendientes', 'Pendientes', 'calendario'], ['ajustes', 'Ajustes', 'ajustes'],
];

export default {
  id: 'mas',
  titulo: 'Más',
  icono: 'mas-menu',
  orden: 95,
  barra: 5,
  lateral: false,
  buscador: null,
  subvistas: [],
  usa: [],
  accionPrincipal: null,
  encabezado: () => ({ subtitulo: 'Facturas, gastos, reportes y ajustes' }),
  dibujar(contenedor) {
    montar(contenedor, html`<div class="menu-mas">${DESTINOS.map(([id, t, i]) => html`<button type="button" class="acceso" data-destino="${id}"><span class="acceso-icono">${icono(i)}</span>${t}</button>`)}</div>`);
    contenedor.querySelectorAll('[data-destino]').forEach((b) => b.addEventListener('click', () => {
      const d = b.dataset.destino;
      if (d === 'creditos') pedirHoja('creditos:lista', {});
      else if (d === 'pendientes') irA('ventas', 'pendientes');
      else irA(d);
    }));
  },
};
