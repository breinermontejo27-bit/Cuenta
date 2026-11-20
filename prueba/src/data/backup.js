// Respaldos: exportar, analizar y restaurar.
// - Formato 3 (Orisma): { app: 'orisma', version: 3, esquema, fecha, datos: { clientes, inventario, ventas, gastos,
//   movimientos, pedidos, config } } con las imágenes incluidas. La versión original también puede leerlo
//   (solo usa "datos"), así que un respaldo de Orisma sirve para volver a la app anterior si hiciera falta.
// - Formato 2 (versión original, RB-01) se sigue aceptando.
// - Restaurar: validación estricta (D4-11), respaldo automático previo (D4-14) y una sola transacción.
//   La configuración se MEZCLA con la actual, como en la versión original (RB-03); cambiarlo es la decisión 9.

import { completarAjustes } from '../core/config.js';
import { coleccion, obtenerAjustes } from '../core/state.js';
import { COLECCIONES, VERSION_ESQUEMA, revisarDatos } from './schema.js';
import { leerTodo, reemplazarTodo } from './database.js';
import { inflarImagenes, dataUrlDeArchivo } from './files.js';

/** Datos actuales con las imágenes incluidas, en el formato 3. */
export async function exportar(ahora = () => new Date()) {
  const { archivos } = await leerTodo();
  const imagenes = new Map();
  for (const a of archivos) imagenes.set(a.id, await dataUrlDeArchivo(a));
  const resolver = (id) => imagenes.get(id) || '';
  const datos = {};
  for (const c of COLECCIONES) datos[c] = coleccion(c).map((r) => inflarImagenes(c, r, resolver));
  datos.config = inflarImagenes('ajustes', obtenerAjustes(), resolver);
  const f = ahora();
  const fecha = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  return { app: 'orisma', version: 3, esquema: VERSION_ESQUEMA, fecha, datos };
}

/** Nombre del archivo de respaldo. */
export function nombreArchivo(respaldo) {
  return `orisma-respaldo-${respaldo.fecha}.json`;
}

/**
 * Analiza un archivo de respaldo (texto) sin aplicar nada.
 * @returns {{ ok: boolean, formato: string, datos?: { colecciones, ajustes }, conteos?: Object, errores: string[], advertencias: string[] }}
 */
export function analizar(texto) {
  let obj;
  try { obj = JSON.parse(texto); } catch (_) { return { ok: false, formato: 'desconocido', errores: ['El archivo no es un respaldo (no es JSON válido).'], advertencias: [] }; }
  const d = obj && obj.datos;
  // Mismo requisito mínimo que la versión original (RB-02).
  if (!d || !Array.isArray(d.clientes) || !Array.isArray(d.inventario) || !Array.isArray(d.ventas) || !Array.isArray(d.gastos)) {
    return { ok: false, formato: 'desconocido', errores: ['Ese archivo no es un respaldo válido de Orisma ni de Cuentas.'], advertencias: [] };
  }
  const formato = obj.app === 'orisma' ? `Orisma (formato ${obj.version || '?'})` : `Cuentas (formato ${obj.version || 2})`;
  if (obj.app === 'orisma' && Number(obj.esquema) > VERSION_ESQUEMA) {
    return { ok: false, formato, errores: ['El respaldo es de una versión más nueva de Orisma. Actualiza la app antes de restaurarlo.'], advertencias: [] };
  }
  const colecciones = {
    clientes: d.clientes, inventario: d.inventario, ventas: d.ventas, gastos: d.gastos,
    pedidos: Array.isArray(d.pedidos) ? d.pedidos : [], movimientos: Array.isArray(d.movimientos) ? d.movimientos : [],
  };
  const ajustes = d.config && typeof d.config === 'object' && !Array.isArray(d.config) ? d.config : null;
  const { errores, advertencias, conteos } = revisarDatos({ colecciones, ajustes }, 'estricto');
  return { ok: errores.length === 0, formato, fecha: obj.fecha || '', datos: { colecciones, ajustes }, conteos, errores, advertencias };
}

/**
 * Restaura un respaldo ya analizado. Antes guarda un respaldo automático de lo actual.
 * La configuración se mezcla con la actual y se completa con los valores por defecto (igual que L3855–3856).
 */
export async function restaurar(analisis) {
  if (!analisis || !analisis.ok) throw new Error('El respaldo no pasó la validación');
  const respaldoActual = await exportar();
  const previo = JSON.stringify(respaldoActual);
  // Se mezcla con los ajustes actuales CON sus imágenes (las referencias "archivo:" dejan de existir al reemplazar todo).
  const ajustes = completarAjustes({ ...respaldoActual.datos.config, ...(analisis.datos.ajustes || {}) });
  return reemplazarTodo({ colecciones: analisis.datos.colecciones, ajustes, respaldoPrevio: previo, motivo: 'antes de restaurar' });
}
