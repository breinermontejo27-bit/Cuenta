// Elegir / quitar una imagen (foto de producto, logo, foto de perfil, foto de una pieza).
// El procesamiento (reducir tamaño) lo hace quien lo usa, con services/images.js.

import { html, imagenSegura, montar } from '../html.js';

export function selectorImagen(prefijo, titulo, actual, vacio) {
  const src = imagenSegura(actual);
  return html`<div class="selector-imagen" data-imagen="${prefijo}">
    <div class="vista-imagen" data-vista>${src ? html`<img src="${src}" alt="">` : html`<span>${vacio}</span>`}</div>
    <div class="datos-imagen">
      <label class="etiqueta-campo" for="${prefijo}Archivo">${titulo}</label>
      <input type="file" accept="image/*" id="${prefijo}Archivo" class="control">
      <button type="button" class="btn btn-texto peligro" data-quitar${src ? '' : html` hidden`}>Quitar</button>
    </div>
  </div>`;
}

/**
 * @param {(archivo: File) => Promise<string>} procesar  devuelve el data URL listo
 * @param {(dataUrl: string) => void} alCambiar
 * @param {(error: Error) => void} alFallar
 */
export function conectarSelectorImagen(contenedor, prefijo, vacio, { procesar, alCambiar, alFallar }) {
  const raiz = contenedor.querySelector(`[data-imagen="${prefijo}"]`);
  const vista = raiz.querySelector('[data-vista]');
  const quitar = raiz.querySelector('[data-quitar]');
  const entrada = raiz.querySelector('input[type="file"]');
  entrada.addEventListener('change', async () => {
    const archivo = entrada.files && entrada.files[0];
    entrada.value = '';
    if (!archivo) return;
    try {
      const dataUrl = await procesar(archivo);
      alCambiar(dataUrl);
      montar(vista, html`<img src="${imagenSegura(dataUrl)}" alt="">`);
      quitar.hidden = false;
    } catch (e) { alFallar(e); }
  });
  quitar.addEventListener('click', () => {
    alCambiar('');
    montar(vista, html`<span>${vacio}</span>`);
    quitar.hidden = true;
  });
}
