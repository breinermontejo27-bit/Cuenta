// Plantillas HTML con escape automático (corrige D4-11).
// Todo valor insertado con html`...` se escapa salvo que ya sea HTML seguro (otra plantilla, un ícono
// o un texto marcado con seguro()). Para pintar en la página se usa montar(): no acepta texto sin escapar.

import { urlArchivo } from '../core/state.js';

class HtmlSeguro {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa un texto para insertarlo en HTML (igual que escapeHtml de la versión original, L501). */
export function escapar(valor) {
  return String(valor == null ? '' : valor).replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

function convertir(valor) {
  if (valor instanceof HtmlSeguro) return valor.texto;
  if (Array.isArray(valor)) return valor.map(convertir).join('');
  if (valor == null || valor === false) return '';
  return escapar(valor);
}

/** Plantilla etiquetada: html`<p>${texto}</p>` → HtmlSeguro con los valores escapados. */
export function html(partes, ...valores) {
  let salida = partes[0];
  for (let i = 0; i < valores.length; i++) salida += convertir(valores[i]) + partes[i + 1];
  return new HtmlSeguro(salida);
}

/** Marca como seguro un HTML escrito en el código (nunca datos del usuario o de un respaldo). */
export function seguro(texto) {
  return new HtmlSeguro(String(texto));
}

/** ¿Es HTML seguro? */
export function esSeguro(valor) {
  return valor instanceof HtmlSeguro;
}

const IMAGEN_DATOS = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Devuelve la dirección si es una imagen propia: data:image/..., blob: o una referencia "archivo:" a una imagen
 * guardada (Etapa 5). Cualquier otra cosa devuelve cadena vacía.
 */
export function imagenSegura(src) {
  const s = String(src || '');
  if (/^archivo:img-[0-9a-f]{16,64}$/.test(s)) return imagenSegura(urlArchivo(s));
  if (IMAGEN_DATOS.test(s)) return s;
  if (/^blob:/.test(s)) return s;
  return '';
}

/** Ícono del conjunto propio (ver <svg> en index.html). */
export function icono(nombre, clase = '') {
  if (!/^[a-z-]+$/.test(nombre)) throw new Error(`Ícono inválido: ${nombre}`);
  return html`<svg class="icono ${clase}" aria-hidden="true"><use href="#i-${seguro(nombre)}"/></svg>`;
}

/** Pinta HTML seguro dentro de un elemento. */
export function montar(elemento, contenido) {
  if (!(contenido instanceof HtmlSeguro)) throw new TypeError('montar() solo acepta HTML creado con html`...`');
  elemento.innerHTML = contenido.texto;
}
