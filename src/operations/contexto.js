// Contexto que reciben las reglas: fecha de hoy, momento actual y generador de identificadores.

import { hoy } from '../core/clock.js';
import { nuevoId } from '../data/database.js';

export function contexto() {
  return { hoy: hoy(), ahora: Date.now(), nuevoId };
}
