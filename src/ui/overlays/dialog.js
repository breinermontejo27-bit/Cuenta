// Diálogo de confirmación uniforme (reemplaza confirmaciones sueltas y alert()).

import { html } from '../html.js';
import { abrirCapa } from './sheet.js';

/**
 * Pide confirmación. Se resuelve con true si acepta y false si cancela o cierra.
 * @param {{ titulo: string, mensaje: string|HtmlSeguro, aceptar?: string, cancelar?: string, peligro?: boolean }} o
 * @returns {Promise<boolean>}
 */
export function confirmar({ titulo, mensaje, aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
  return new Promise((resolver) => {
    let respuesta = false;
    const capa = abrirCapa(html`
      <div class="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dialogoTitulo" aria-describedby="dialogoMensaje">
        <h2 id="dialogoTitulo">${titulo}</h2>
        <p id="dialogoMensaje">${mensaje}</p>
        <div class="acciones">
          <button type="button" class="btn btn-secundario" data-accion="no" autofocus>${cancelar}</button>
          <button type="button" class="btn ${peligro ? 'btn-peligro' : 'btn-primario'}" data-accion="si">${aceptar}</button>
        </div>
      </div>`, { centrada: true, alCerrar: () => resolver(respuesta) });
    capa.elemento.querySelector('[data-accion="no"]').addEventListener('click', capa.cerrar);
    capa.elemento.querySelector('[data-accion="si"]').addEventListener('click', () => { respuesta = true; capa.cerrar(); });
  });
}
