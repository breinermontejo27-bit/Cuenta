// Recuadro para firmar con el dedo o el mouse (L3997–4052). Devuelve la firma como PNG.

import { html } from '../html.js';

export function recuadroFirma(id) {
  return html`<canvas id="${id}" class="lienzo-firma" aria-label="Recuadro para firmar"></canvas>`;
}

/**
 * Conecta el recuadro. `actual` es la firma guardada (data URL o dirección), que se dibuja al prepararlo.
 * @returns {{ preparar: Function, borrar: Function, resultado: () => (string|null) }}  resultado: null si no cambió
 */
export function conectarFirma(lienzo, actual) {
  const cx = lienzo.getContext('2d');
  let cambiada = false, vacia = false, dibujando = false, listo = false;
  const ratio = window.devicePixelRatio || 1;
  const preparar = () => {
    if (listo) return;
    const r = lienzo.getBoundingClientRect();
    if (!r.width) return;
    listo = true;
    lienzo.width = Math.round(r.width * ratio); lienzo.height = Math.round(r.height * ratio);
    cx.setTransform(ratio, 0, 0, ratio, 0, 0);
    cx.lineWidth = 2.4; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#111';
    if (actual) {
      const im = new Image();
      im.onload = () => {
        const sc = Math.min(r.width / im.width, r.height / im.height);
        cx.drawImage(im, (r.width - im.width * sc) / 2, (r.height - im.height * sc) / 2, im.width * sc, im.height * sc);
      };
      im.src = actual;
    }
  };
  const pos = (e) => { const r = lienzo.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  lienzo.addEventListener('pointerdown', (e) => {
    preparar();
    dibujando = true; cambiada = true; vacia = false;
    lienzo.setPointerCapture(e.pointerId);
    const q = pos(e); cx.beginPath(); cx.moveTo(q.x, q.y);
  });
  lienzo.addEventListener('pointermove', (e) => { if (!dibujando) return; const q = pos(e); cx.lineTo(q.x, q.y); cx.stroke(); });
  const acabar = () => { dibujando = false; };
  lienzo.addEventListener('pointerup', acabar);
  lienzo.addEventListener('pointercancel', acabar);
  return {
    preparar,
    borrar() { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, lienzo.width, lienzo.height); cx.restore(); cambiada = true; vacia = true; },
    resultado() { return cambiada ? (vacia ? '' : lienzo.toDataURL('image/png')) : null; },
  };
}
