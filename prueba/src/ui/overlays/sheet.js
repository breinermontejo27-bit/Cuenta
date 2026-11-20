// Hojas emergentes: suben desde abajo en el teléfono y son un panel lateral en el computador.
// Se apilan en la navegación (botón atrás), se cierran con la X, tocando fuera o con Escape,
// y devuelven el foco a donde estaba.

import { apilarHoja, cerrarHoja } from '../../core/navigation.js';
import { html, icono, montar, esSeguro } from '../html.js';

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function contenedorCapas() {
  let c = document.getElementById('capas');
  if (!c) { c = document.createElement('div'); c.id = 'capas'; document.body.appendChild(c); }
  return c;
}

/**
 * Abre una capa genérica (base de hojas y diálogos).
 * @param {HtmlSeguro} contenido  HTML del panel
 * @param {{ centrada?: boolean, alCerrar?: Function }} opciones
 * @returns {{ elemento: HTMLElement, cerrar: Function }}
 */
export function abrirCapa(contenido, { centrada = false, alCerrar } = {}) {
  if (!esSeguro(contenido)) throw new TypeError('abrirCapa() necesita HTML creado con html`...`');
  const previo = document.activeElement;
  const velo = document.createElement('div');
  velo.className = 'velo' + (centrada ? ' centrado' : '');
  montar(velo, contenido);
  contenedorCapas().appendChild(velo);

  let cerrada = false;
  const quitar = () => {
    if (cerrada) return;
    cerrada = true;
    velo.remove();
    if (previo && typeof previo.focus === 'function' && document.contains(previo)) previo.focus();
    if (alCerrar) alCerrar();
  };
  const id = apilarHoja(quitar);
  const cerrar = () => cerrarHoja(id);

  velo.addEventListener('click', (e) => { if (e.target === velo) cerrar(); });
  velo.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
    if (e.key === 'Tab') mantenerFoco(e, velo);
  });
  const primero = velo.querySelector('[autofocus]') || velo.querySelector(ENFOCABLES);
  if (primero) primero.focus();
  return { elemento: velo, cerrar };
}

function mantenerFoco(e, velo) {
  const lista = [...velo.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null);
  if (!lista.length) return;
  const [primero, ultimo] = [lista[0], lista[lista.length - 1]];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
}

/**
 * Abre una hoja con cabecera (título, paso, atrás, cerrar), cuerpo y pie fijo opcional.
 * @param {{ titulo: string, paso?: string, cuerpo: HtmlSeguro, pie?: HtmlSeguro, alAtras?: Function, alCerrar?: Function }} o
 */
export function abrirHoja({ titulo, paso = '', cuerpo, pie = null, alAtras = null, alCerrar }) {
  const capa = abrirCapa(html`
    <section class="hoja" role="dialog" aria-modal="true" aria-label="${titulo}">
      <header class="hoja-cabecera">
        ${alAtras ? html`<button type="button" class="boton-icono" data-accion="atras" aria-label="Atrás">${icono('atras')}</button>` : ''}
        <h2>${titulo}${paso ? html`<span class="paso">${paso}</span>` : ''}</h2>
        <button type="button" class="boton-icono" data-accion="cerrar" aria-label="Cerrar">${icono('cerrar')}</button>
      </header>
      <div class="hoja-cuerpo">${cuerpo}</div>
      ${pie ? html`<div class="hoja-pie">${pie}</div>` : ''}
    </section>`, { alCerrar });
  capa.elemento.querySelector('[data-accion="cerrar"]').addEventListener('click', capa.cerrar);
  const atras = capa.elemento.querySelector('[data-accion="atras"]');
  if (atras) atras.addEventListener('click', alAtras);
  return capa;
}
