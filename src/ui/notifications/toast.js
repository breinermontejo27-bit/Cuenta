// Avisos emergentes (reemplazan alert()). Los graves no se cierran solos.

import { html, icono, montar } from '../html.js';

const DURACION = 4500;

function contenedor() {
  let c = document.getElementById('notificaciones');
  if (!c) {
    c = document.createElement('div');
    c.id = 'notificaciones';
    c.className = 'notificaciones';
    c.setAttribute('aria-live', 'polite');
    document.body.appendChild(c);
  }
  return c;
}

/**
 * Muestra un aviso.
 * @param {string} texto
 * @param {{ tipo?: 'normal'|'exito'|'grave', accion?: { texto: string, alPulsar: Function }, duracion?: number }} opciones
 * @returns {Function} cierra el aviso
 */
export function notificar(texto, { tipo = 'normal', accion = null, duracion = DURACION } = {}) {
  const grave = tipo === 'grave';
  const el = document.createElement('div');
  el.className = 'toast' + (grave ? ' grave' : '');
  el.setAttribute('role', grave ? 'alert' : 'status');
  montar(el, html`
    ${icono(grave ? 'alerta' : 'ok', 'sm')}
    <span class="toast-texto">${texto}</span>
    ${accion ? html`<button type="button" class="accion" data-accion="principal">${accion.texto}</button>` : ''}
    ${grave ? html`<button type="button" class="accion" data-accion="cerrar" aria-label="Cerrar aviso">${icono('cerrar', 'sm')}</button>` : ''}`);
  contenedor().appendChild(el);
  let temporizador = null;
  const cerrar = () => { clearTimeout(temporizador); el.remove(); };
  if (accion) el.querySelector('[data-accion="principal"]').addEventListener('click', () => { cerrar(); accion.alPulsar(); });
  if (grave) el.querySelector('[data-accion="cerrar"]').addEventListener('click', cerrar);
  else temporizador = setTimeout(cerrar, duracion);
  return cerrar;
}
