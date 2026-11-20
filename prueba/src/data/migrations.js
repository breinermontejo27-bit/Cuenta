// Versiones de la estructura de la base (IndexedDB). Cada paso crea o cambia almacenes;
// el navegador los ejecuta en orden al abrir una base más antigua. Nunca se edita un paso ya publicado:
// los cambios futuros se agregan como pasos nuevos.

import { COLECCIONES } from './schema.js';

export const PASOS = [
  {
    version: 1,
    descripcion: 'Almacenes iniciales: una por colección (en orden de la versión original), ajustes, imágenes, respaldos automáticos y datos internos',
    aplicar(db) {
      for (const c of COLECCIONES) {
        // Cada fila es { k: id, n: posición, r: registro tal cual }. La posición conserva el orden de la versión original.
        db.createObjectStore(c, { keyPath: 'k' }).createIndex('n', 'n');
      }
      db.createObjectStore('ajustes', { keyPath: 'k' });
      db.createObjectStore('archivos', { keyPath: 'id' });
      db.createObjectStore('respaldos', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('meta', { keyPath: 'k' });
    },
  },
];

export const VERSION_BD = PASOS[PASOS.length - 1].version;

/** Ejecuta los pasos pendientes (se llama dentro de onupgradeneeded). */
export function actualizarEstructura(db, versionAnterior) {
  for (const paso of PASOS) if (paso.version > versionAnterior) paso.aplicar(db);
}
