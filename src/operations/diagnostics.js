// Registro de errores guardado en el dispositivo (Etapa 8; antes solo vivía en memoria, Etapa 5 §8).
// Sirve para diagnosticar fallos: nunca se envía a ningún lado; el dueño puede descargarlo desde Ajustes › Respaldo.

import { leerMeta, guardarMeta } from '../data/database.js';

const CLAVE = 'registroErrores';

export function leerRegistroErrores() {
  return leerMeta(CLAVE, []);
}

/** Guarda la lista completa. Se encadena para que dos errores seguidos no se pisen. */
let cola = Promise.resolve();
export function guardarRegistroErrores(lista) {
  cola = cola.then(() => guardarMeta(CLAVE, lista)).catch(() => { /* si no se puede guardar, sigue en memoria */ });
  return cola;
}
