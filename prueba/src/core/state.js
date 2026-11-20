// Estado de la aplicación en memoria (Etapa 2, decisión A5).
// - Datos del negocio: copia de lo guardado. Solo la escriben el arranque y operations/ (tras confirmar la transacción).
// - Ajustes del negocio.
// - Estado de la interfaz: pestaña, sub-vistas, búsquedas, filtros (no se guarda).

import { COLECCIONES, completarAjustes } from './config.js';
import { eventos, EVENTOS } from './events.js';

const datos = Object.fromEntries(COLECCIONES.map((c) => [c, []]));
let ajustes = completarAjustes();
const interfaz = new Map();
const archivos = new Map(); // id de imagen → dirección para mostrarla (blob: o data:)

/** Lista de una colección. No modificarla: para cambiar datos se usa una operación. */
export function coleccion(nombre) {
  if (!(nombre in datos)) throw new Error(`Colección desconocida: ${nombre}`);
  return datos[nombre];
}

/**
 * Reemplaza colecciones completas y avisa del cambio.
 * @param {Object<string, Array>} cambios  p. ej. { ventas: [...], inventario: [...] }
 */
export function reemplazarColecciones(cambios) {
  const nombres = Object.keys(cambios);
  for (const n of nombres) {
    if (!(n in datos)) throw new Error(`Colección desconocida: ${n}`);
    if (!Array.isArray(cambios[n])) throw new Error(`La colección ${n} debe ser una lista`);
  }
  for (const n of nombres) datos[n] = cambios[n];
  if (nombres.length) eventos.emitir(EVENTOS.DATOS_CAMBIADOS, { colecciones: nombres });
}

/** Ajustes actuales del negocio (solo lectura). */
export function obtenerAjustes() {
  return ajustes;
}

/** Reemplaza los ajustes (completándolos con los valores por defecto) y avisa del cambio. */
export function reemplazarAjustes(nuevos) {
  ajustes = Object.freeze(completarAjustes(nuevos));
  eventos.emitir(EVENTOS.AJUSTES_CAMBIADOS, {});
}

/** Estado de la interfaz: lee un valor, con un valor por defecto si no existe. */
export function leerInterfaz(clave, porDefecto) {
  return interfaz.has(clave) ? interfaz.get(clave) : porDefecto;
}

/** Estado de la interfaz: guarda un valor (no se persiste). */
export function escribirInterfaz(clave, valor) {
  interfaz.set(clave, valor);
}

/** Registra la dirección con la que se muestra una imagen guardada (la llama data/ al cargar o guardar). */
export function registrarArchivo(id, url) {
  archivos.set(id, url);
}

/** Dirección para mostrar una referencia "archivo:<id>"; vacía si no existe. */
export function urlArchivo(referencia) {
  const id = String(referencia || '').replace(/^archivo:/, '');
  return archivos.get(id) || '';
}

ajustes = Object.freeze(ajustes);
