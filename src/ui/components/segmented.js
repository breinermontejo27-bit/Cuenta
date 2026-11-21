// Selector segmentado (2–4 opciones) y chips de filtro.

import { html } from '../html.js';

/** Selector: opciones [[valor, texto]]. Se reconoce por data-grupo. */
export function segmentos(grupo, opciones, seleccionado) {
  return html`<div class="segmentos" role="group" data-grupo="${grupo}">${opciones.map(([v, t]) => html`<button type="button" data-valor="${v}" aria-pressed="${v === seleccionado}">${t}</button>`)}</div>`;
}

/** Conecta un selector: marca la opción tocada y llama fn(valor). Devuelve una función para leer el valor actual. */
export function conectarSegmentos(contenedor, grupo, fn = () => {}) {
  const raiz = contenedor.querySelector(`[data-grupo="${grupo}"]`);
  if (!raiz) return () => null;
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-valor]');
    if (!b) return;
    raiz.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    fn(b.dataset.valor);
  });
  return () => { const b = raiz.querySelector('button[aria-pressed="true"]'); return b ? b.dataset.valor : null; };
}

/** Chips de filtro: opciones [[valor, texto]]. */
export function chips(grupo, opciones, seleccionado) {
  return html`<div class="chips" role="group" data-grupo="${grupo}">${opciones.map(([v, t]) => html`<button type="button" class="chip" data-valor="${v}" aria-pressed="${v === seleccionado}">${t}</button>`)}</div>`;
}
