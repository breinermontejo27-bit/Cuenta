// Piezas de lista: estado vacío, filas, grupos e insignias.

import { html, icono, imagenSegura } from '../html.js';
import { iniciales } from '../format.js';
import { leerInterfaz, escribirInterfaz } from '../../core/state.js';

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
      ${f.sub2 ? html`<span class="fila-sub ${f.sub2Clase || ''}">${f.sub2}</span>` : ''}
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

/** Título de un grupo dentro de una lista ("HOY", "VENCIDOS"…), con un detalle opcional a la derecha. */
export function etiquetaGrupo(texto, detalle = '') {
  return html`<h3 class="etiqueta-grupo"><span>${texto}</span>${detalle ? html`<span class="etiqueta-grupo-det">${detalle}</span>` : ''}</h3>`;
}

/** Conecta el toque de las filas: `fn(valor)` con el valor del atributo data-<clave>. */
export function alTocarFila(contenedor, clave, fn) {
  contenedor.querySelectorAll(`.fila[data-${clave}]`).forEach((b) => b.addEventListener('click', () => fn(b.dataset[clave])));
}

// ----- Listas largas por partes (Etapa 9, D4-27) -----
// Con miles de registros, dibujar todo de una vez tardaba ~0,5 s por pantalla. Se muestran las primeras filas
// y un botón "Mostrar más". El buscador sigue buscando en TODOS los registros.
export const POR_PAGINA = 100;

/**
 * Parte visible de una lista. `clave` identifica la lista y su búsqueda (p. ej. `ventas|ana`): al cambiar la
 * búsqueda se vuelve a empezar por las primeras filas.
 * @returns {{ visibles: Array, restantes: number, clave: string }}
 */
export function paginar(items, clave) {
  const limite = leerInterfaz(`limite:${clave}`, POR_PAGINA);
  return { visibles: items.slice(0, limite), restantes: Math.max(0, items.length - limite), clave };
}

/** Botón "Mostrar más" (vacío si ya se ve todo). */
export function botonMostrarMas({ restantes, clave }) {
  if (!restantes) return '';
  const siguiente = Math.min(restantes, POR_PAGINA);
  return html`<button type="button" class="btn btn-secundario btn-bloque mostrar-mas" data-mostrar-mas="${clave}">Mostrar ${siguiente} más (quedan ${restantes})</button>`;
}

/** Conecta los botones "Mostrar más": amplía el límite y llama a `redibujar()`. */
export function conectarMostrarMas(contenedor, redibujar) {
  contenedor.querySelectorAll('[data-mostrar-mas]').forEach((b) => b.addEventListener('click', () => {
    const clave = `limite:${b.dataset.mostrarMas}`;
    escribirInterfaz(clave, leerInterfaz(clave, POR_PAGINA) + POR_PAGINA);
    redibujar();
    const otro = contenedor.querySelector('[data-mostrar-mas]');
    if (otro) otro.focus({ preventScroll: true });
  }));
}
