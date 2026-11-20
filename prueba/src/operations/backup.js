// Operaciones de respaldo: descargar y restaurar.

import { exportar, nombreArchivo, analizar, restaurar } from '../data/backup.js';
import { listarRespaldos, espacio, leerTodo } from '../data/database.js';
import { coleccion } from '../core/state.js';
import { COLECCIONES } from '../core/config.js';

/** Prepara el respaldo de todos los datos. Devuelve { texto, nombre } para descargarlo. */
export async function prepararRespaldo() {
  const r = await exportar();
  return { texto: JSON.stringify(r), nombre: nombreArchivo(r) };
}

/** Analiza el texto de un archivo de respaldo (no cambia nada). */
export function analizarRespaldo(texto) {
  return analizar(texto);
}

/** Restaura un respaldo analizado. Guarda antes un respaldo automático de lo actual. */
export function restaurarRespaldo(analisis) {
  return restaurar(analisis);
}

/** Resumen del almacenamiento: cantidades, espacio y respaldos automáticos. */
export async function resumenDatos() {
  const conteos = Object.fromEntries(COLECCIONES.map((c) => [c, coleccion(c).length]));
  const [esp, respaldos, todo] = await Promise.all([espacio(), listarRespaldos(), leerTodo()]);
  return { conteos, espacio: esp, respaldos, migracion: todo.meta.migracionLegado || null, persistente: !!todo.meta.persistente, limpieza: todo.meta.limpiezaImagenes || null };
}
