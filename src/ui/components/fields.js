// Campos de formulario, interruptores y mensajes de error junto al campo.

import { html, icono } from '../html.js';

/**
 * Campo con etiqueta. tipo: 'text' | 'number' | 'tel' | 'email' | 'date' | 'month' | 'textarea' | 'select' | 'color'.
 * dinero: alinea a la derecha con cifras tabulares. opciones (select): [[valor, texto]].
 */
export function campo({ id, etiqueta, tipo = 'text', valor = '', placeholder = '', ayuda = '', dinero = false, filas = 2, opciones = [], lista = '', modo = '', autocompletar = '' }) {
  const clase = `control${dinero ? ' dinero' : ''}`;
  const inputmode = modo || (tipo === 'number' ? (dinero ? 'decimal' : 'numeric') : '');
  let control;
  if (tipo === 'textarea') control = html`<textarea id="${id}" name="${id}" class="${clase}" rows="${filas}" placeholder="${placeholder}">${valor}</textarea>`;
  else if (tipo === 'select') control = html`<select id="${id}" name="${id}" class="${clase}">${opciones.map(([v, t]) => html`<option value="${v}"${String(v) === String(valor) ? html` selected` : ''}>${t}</option>`)}</select>`;
  else control = html`<input id="${id}" name="${id}" class="${clase}" type="${tipo}" value="${valor}" placeholder="${placeholder}"${inputmode ? html` inputmode="${inputmode}"` : ''}${lista ? html` list="${lista}"` : ''}${autocompletar ? html` autocomplete="${autocompletar}"` : ''}${tipo === 'number' ? html` step="any"` : ''}>`;
  return html`<div class="campo" data-campo="${id}"><label for="${id}">${etiqueta}</label>${control}${ayuda ? html`<span class="ayuda">${ayuda}</span>` : ''}<span class="mensaje" id="${id}-error" hidden></span></div>`;
}

/** Interruptor (casilla con aspecto de switch). */
export function interruptor(id, etiqueta, marcado) {
  return html`<label class="interruptor"><span>${etiqueta}</span><input type="checkbox" id="${id}" name="${id}"${marcado ? html` checked` : ''}></label>`;
}

/** Dos campos en una fila. */
export function filaCampos(...campos) {
  return html`<div class="fila-campos">${campos}</div>`;
}

/** Valor de un campo (texto tal cual; checkbox → booleano). */
export function valor(contenedor, id) {
  const el = contenedor.querySelector('#' + id);
  if (!el) return '';
  return el.type === 'checkbox' ? el.checked : el.value;
}

/** Muestra un error junto a un campo y le pone el foco. Si el campo no existe, devuelve false. */
export function mostrarError(contenedor, id, mensaje) {
  // El campo puede llamarse igual que en la regla ("nombre") o con prefijo de formulario ("f_nombre").
  const caja = contenedor.querySelector(`[data-campo="${id}"]`) || contenedor.querySelector(`[data-campo$="_${id}"]`);
  if (!caja) return false;
  caja.classList.add('error');
  const msg = caja.querySelector('.mensaje');
  const idCampo = caja.dataset.campo;
  msg.hidden = false;
  msg.replaceChildren();
  msg.insertAdjacentHTML('beforeend', icono('alerta', 'sm').texto);
  msg.append(' ' + mensaje);
  const control = caja.querySelector('input, select, textarea');
  if (control) { control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', idCampo + '-error'); control.focus(); }
  return true;
}

/** Quita los errores mostrados. */
export function limpiarErrores(contenedor) {
  contenedor.querySelectorAll('.campo.error').forEach((c) => {
    c.classList.remove('error');
    c.querySelector('.mensaje').hidden = true;
    const control = c.querySelector('[aria-invalid]');
    if (control) control.removeAttribute('aria-invalid');
  });
}

/** Botones de acción al pie: [{ texto, accion, tipo: 'primario'|'secundario'|'peligro' }]. */
export function acciones(botones) {
  return html`<div class="acciones">${botones.map((b) => html`<button type="button" class="btn btn-${b.tipo || 'secundario'}" data-accion="${b.accion}"${b.deshabilitado ? html` disabled` : ''}>${b.icono ? icono(b.icono, 'sm') : ''}${b.texto}</button>`)}</div>`;
}

/** Botón de texto (enlace de acción). */
export function botonTexto(texto, accion, peligro = false) {
  return html`<button type="button" class="btn btn-texto${peligro ? ' peligro' : ''}" data-accion="${accion}">${texto}</button>`;
}
