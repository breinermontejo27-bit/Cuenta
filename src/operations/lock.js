// Bloqueo con PIN (Etapa 8): lo que se guarda en el dispositivo (almacén "meta"). La huella la calcula
// services/pin.js; aquí solo se guarda, se quita y se controlan los intentos fallidos.
// No viaja en los respaldos: el bloqueo es de este dispositivo, no de los datos.

import { leerMeta, guardarMeta } from '../data/database.js';

const CLAVE = 'bloqueo';
const CLAVE_INTENTOS = 'bloqueoIntentos';
export const FALLOS_SIN_ESPERA = 5;
const ESPERA_BASE_MS = 30000;
const ESPERA_MAX_MS = 15 * 60000;
/** Tiempo en segundo plano tras el cual se vuelve a pedir el PIN. */
export const BLOQUEAR_TRAS_MS = 5 * 60000;

/** Espera obligatoria tras `fallos` intentos seguidos: 0 hasta 5; luego 30 s, 1 min, 2 min… hasta 15 min. */
export function esperaTrasFallos(fallos) {
  if (fallos < FALLOS_SIN_ESPERA) return 0;
  return Math.min(ESPERA_BASE_MS * 2 ** (fallos - FALLOS_SIN_ESPERA), ESPERA_MAX_MS);
}

/** Registro del PIN guardado, o null si el bloqueo está desactivado. */
export async function leerBloqueo() {
  const r = await leerMeta(CLAVE);
  return r && typeof r.huella === 'string' && typeof r.sal === 'string' && Number(r.iteraciones) > 0 ? r : null;
}

/** Activa el bloqueo (o cambia el PIN) con la huella ya calculada. */
export async function guardarBloqueo(registro) {
  await guardarMeta(CLAVE, registro);
  await guardarMeta(CLAVE_INTENTOS, undefined);
}

/** Desactiva el bloqueo. Los datos del negocio no se tocan. */
export async function quitarBloqueo() {
  await guardarMeta(CLAVE, undefined);
  await guardarMeta(CLAVE_INTENTOS, undefined);
}

/** Intentos fallidos guardados: { fallos, hasta } (hasta = momento en que se puede volver a intentar). */
export async function leerIntentos() {
  const r = await leerMeta(CLAVE_INTENTOS);
  return { fallos: Number(r && r.fallos) || 0, hasta: Number(r && r.hasta) || 0 };
}

/** Anota un intento fallido y devuelve el nuevo estado. Se guarda para que recargar la página no lo reinicie. */
export async function anotarFallo(ahora = Date.now()) {
  const { fallos } = await leerIntentos();
  const nuevo = { fallos: fallos + 1, hasta: ahora + esperaTrasFallos(fallos + 1) };
  await guardarMeta(CLAVE_INTENTOS, nuevo);
  return nuevo;
}

/** Tras entrar con el PIN correcto. */
export function reiniciarIntentos() {
  return guardarMeta(CLAVE_INTENTOS, undefined);
}

