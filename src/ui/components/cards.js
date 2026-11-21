// Tarjetas: líneas de detalle, cifra destacada, cuadrícula de cifras y avisos (banners).

import { html, icono } from '../html.js';

/** Líneas "concepto · valor". Cada línea: [concepto, valor, clase?] (clase: 'fuerte', 'total'; valorClase en el 4.º). */
export function lineas(filas) {
  return html`<dl class="lineas">${filas.filter(Boolean).map(([a, b, c = '', d = '']) => html`<div class="linea ${c}"><dt>${a}</dt><dd class="${d}">${b}</dd></div>`)}</dl>`;
}

/** Tarjeta con líneas. */
export function tarjetaLineas(filas, clase = '') {
  return html`<div class="tarjeta ${clase}">${lineas(filas)}</div>`;
}

/** Cifra principal: { etiqueta, valor, clase ('pos'/'neg'), detalle (HTML o texto) }. */
export function destacada({ etiqueta, valor, clase = '', detalle = '' }) {
  return html`<div class="destacada"><div class="etq">${etiqueta}</div><div class="val ${clase}">${valor}</div>${detalle ? html`<div class="sub">${detalle}</div>` : ''}</div>`;
}

/** Cuadrícula de cifras: [{ etiqueta, valor, clase }]. */
export function cifras(lista) {
  return html`<div class="cifras">${lista.map((c) => html`<div class="tarjeta cifra"><div class="etq">${c.etiqueta}</div><div class="val ${c.clase || ''}">${c.valor}</div></div>`)}</div>`;
}

/** Aviso destacado: tipo 'aviso' | 'error' | 'info'. `accion` agrega data-accion para hacerlo tocable. */
export function banner(tipo, titulo, texto = '', accion = '') {
  const contenido = html`${icono(tipo === 'info' ? 'facturas' : 'alerta')}<div><strong>${titulo}</strong>${texto}</div>`;
  return accion
    ? html`<button type="button" class="banner ${tipo} banner-boton" data-accion="${accion}">${contenido}</button>`
    : html`<div class="banner ${tipo}" role="status">${contenido}</div>`;
}

/** Sección con título. */
export function seccion(titulo, contenido) {
  return html`<section class="seccion"><h3 class="seccion-titulo">${titulo}</h3>${contenido}</section>`;
}

/** Nota pequeña de ayuda. */
export function nota(texto) {
  return html`<p class="nota">${texto}</p>`;
}
