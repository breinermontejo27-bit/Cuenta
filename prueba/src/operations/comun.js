// Utilidades de las operaciones: errores de validación con mensaje y búsqueda de registros.

import { ErrorDeValidacion, ErrorDeNegocio } from '../core/errors.js';
import { coleccion } from '../core/state.js';
import { MENSAJES } from '../business/validation.js';

/** Si una regla devolvió { ok: false, campo }, lanza el error con el mensaje para ese campo. */
export function exigir(resultado) {
  if (!resultado.ok) throw new ErrorDeValidacion(MENSAJES[resultado.campo || resultado.error] || 'Revisa los datos.', resultado.campo || null);
  return resultado;
}

/** Registro de una colección por id; si no existe (p. ej. se borró en otra pestaña), error entendible. */
export function buscar(nombreColeccion, id) {
  const r = coleccion(nombreColeccion).find((x) => x.id === id);
  if (!r) throw new ErrorDeNegocio('Ese registro ya no existe. Puede que se haya borrado.');
  return r;
}

/** Reemplaza un registro por id en una lista (la lista nueva conserva el orden). */
export function reemplazar(lista, nuevo) {
  return lista.map((x) => (x.id === nuevo.id ? nuevo : x));
}
