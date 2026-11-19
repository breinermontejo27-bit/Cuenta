// Piezas de lista: estado vacío, filas, grupos e insignias.

import { html, icono, imagenSegura } from '../html.js';
import { iniciales } from '../format.js';

/** Estado vacío con ícono, título y texto de ayuda. */
export function estadoVacio({ icono: nombreIcono = 'clientes', titulo, texto }) {
  return html`<div class="vacio">${icono(nombreIcono)}<h3>${titulo}</h3><p>${texto}</p></div>`;
}

/** Insignia de color: tipo 'deuda' | 'pagado' | 'aviso' | 'info' | 'neutra' | 'vencido'. */
export function insignia(tipo, texto) {
  return html`<span class="insignia ${tipo}">${texto}</span>`;
}

/**
 * Fila tocable de una lista. `datos` son atributos data-* (p. ej. { id: 'c1' }) para reconocerla al tocar.
 * @param {{ datos?: Object, foto?: string, iniciales?: string, icono?: string, titulo, sub?, sub2?, valor?, valorClase?, insignias?: Array, extra?: Array, flecha?: boolean }} f
 */
export function fila(f) {
  const atributos = Object.entries(f.datos || {}).map(([k, v]) => html` data-${k}="${v}"`);
  const foto = f.foto ? imagenSegura(f.foto) : '';
  const miniatura = foto ? html`<img class="miniatura" src="${foto}" alt="">`
    : f.iniciales !== undefined ? html`<span class="miniatura" aria-hidden="true">${iniciales(f.iniciales)}</span>`
      : f.icono ? html`<span class="miniatura" aria-hidden="true">${icono(f.icono, 'sm')}</span>` : '';
  return html`<li><button type="button" class="fila"${atributos}>
    ${miniatura}
    <span class="fila-principal">
      <span class="fila-titulo">${f.titulo}</span>
      ${f.sub ? html`<span class="fila-sub">${f.sub}</span>` : ''}
      ${f.sub2 ? html`<span class="fila-sub">${f.sub2}</span>` : ''}
      ${(f.extra || []).length ? html`<span class="fila-extra">${f.extra}</span>` : ''}
    </span>
    <span class="fila-valor">
      ${f.valor !== undefined && f.valor !== '' ? html`<span class="monto ${f.valorClase || ''}">${f.valor}</span>` : ''}
      ${(f.insignias || []).length ? html`<span class="fila-insignias">${f.insignias}</span>` : ''}
    </span>
    ${f.flecha === false ? '' : icono('derecha', 'sm ter')}
  </button></li>`;
}

/** Lista de filas. */
export function lista(filas) {
  return html`<ul class="lista">${filas}</ul>`;
}

/** Título de un grupo dentro de una lista ("HOY", "VENCIDOS"…). */
export function etiquetaGrupo(texto) {
  return html`<h3 class="etiqueta-grupo">${texto}</h3>`;
}

/** Conecta el toque de las filas: `fn(valor)` con el valor del atributo data-<clave>. */
export function alTocarFila(contenedor, clave, fn) {
  contenedor.querySelectorAll(`.fila[data-${clave}]`).forEach((b) => b.addEventListener('click', () => fn(b.dataset[clave])));
}
