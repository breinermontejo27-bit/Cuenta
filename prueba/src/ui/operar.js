// Ejecutar una operación desde un formulario: bloquea el botón mientras se guarda (evita registros duplicados
// por doble toque), muestra el error junto al campo si es de validación, o como aviso si es otro error.

import { ErrorDeValidacion, informarError } from '../core/errors.js';
import { limpiarErrores, mostrarError } from './components/fields.js';

/**
 * @param {HTMLElement} contenedor  formulario u hoja (para buscar los campos con error)
 * @param {HTMLButtonElement|null} boton  botón que se deshabilita mientras tanto
 * @param {() => Promise<*>} fn
 * @returns {Promise<{ ok: boolean, valor?: * }>}
 */
export async function operar(contenedor, boton, fn) {
  if (boton) { if (boton.disabled) return { ok: false }; boton.disabled = true; }
  limpiarErrores(contenedor);
  try {
    return { ok: true, valor: await fn() };
  } catch (e) {
    if (!(e instanceof ErrorDeValidacion && e.campo && mostrarError(contenedor, e.campo, e.message))) informarError(e, 'operación');
    return { ok: false, error: e };
  } finally {
    if (boton && boton.isConnected) boton.disabled = false;
  }
}
