// Piezas de lista: estado vacío. (Filas, insignias y demás se agregan con los módulos en la Etapa 7.)

import { html, icono } from '../html.js';

/** Estado vacío con ícono, título y texto de ayuda. */
export function estadoVacio({ icono: nombreIcono = 'clientes', titulo, texto }) {
  return html`<div class="vacio">${icono(nombreIcono)}<h3>${titulo}</h3><p>${texto}</p></div>`;
}
