// Importación de los datos de la versión original ("Cuentas"), guardados en localStorage.
// Pasos (documento maestro, Etapa 9 · aplicados desde la Etapa 5):
//  1. Respaldo original: copia literal de las 7 claves dentro de la base (almacén "respaldos", motivo "legado").
//  2. Validar el formato.  3. Reconocer la versión de origen.  4. Transformar solo lo necesario (imágenes aparte).
//  5. Evitar duplicados: se importa una sola vez y nunca sobre una base con datos.
//  6. Verificar cantidades.  7. Comprobar integridad: lo guardado, leído de vuelta, debe ser idéntico al original.
//  8. Si algo falla, se deshace todo y localStorage queda intacto.
// localStorage NUNCA se modifica ni se borra aquí.

import { COLECCIONES, revisarDatos } from './schema.js';
import { leerTodo, reemplazarTodo, transaccion, cargarEnMemoria } from './database.js';
import { inflarImagenes, dataUrlDeArchivo } from './files.js';

export const CLAVES = Object.freeze({
  clientes: 'cuentas_clientes', inventario: 'cuentas_inventario', ventas: 'cuentas_ventas', gastos: 'cuentas_gastos',
  movimientos: 'cuentas_movimientos', pedidos: 'cuentas_pedidos', ajustes: 'cuentas_config',
});

/** ¿Hay datos de la versión original en este navegador? */
export function hayDatosLegado(almacen = globalThis.localStorage) {
  try { return Object.values(CLAVES).some((k) => almacen.getItem(k) !== null); } catch (_) { return false; }
}

/**
 * Lee y valida los datos originales sin modificarlos.
 * @returns {{ crudo: Object<string, string|null>, datos: { colecciones, ajustes }, errores: string[], advertencias: string[], conteos, origen }}
 */
export function leerLegado(almacen = globalThis.localStorage) {
  const crudo = {}, errores = [], colecciones = {};
  let ajustes = null;
  for (const [nombre, clave] of Object.entries(CLAVES)) {
    const texto = almacen.getItem(clave);
    crudo[clave] = texto;
    let valor = nombre === 'ajustes' ? null : [];
    if (texto !== null && texto !== '') {
      try { valor = JSON.parse(texto); } catch (_) { errores.push(`${clave}: el contenido no es JSON válido`); }
    }
    if (nombre === 'ajustes') {
      if (valor !== null && (typeof valor !== 'object' || Array.isArray(valor))) errores.push(`${clave}: los ajustes no tienen forma de objeto`);
      else ajustes = valor;
    } else colecciones[nombre] = valor;
  }
  const revision = errores.length ? { errores: [], advertencias: [], conteos: {} } : revisarDatos({ colecciones, ajustes }, 'legado');
  return { crudo, datos: { colecciones, ajustes }, errores: [...errores, ...revision.errores], advertencias: revision.advertencias, conteos: revision.conteos, origen: detectarOrigen(crudo, colecciones) };
}

/** Reconoce la versión de origen por la forma de los datos (la versión original no guardaba número de versión). */
export function detectarOrigen(crudo, colecciones) {
  const rasgos = [];
  if (crudo[CLAVES.pedidos] != null) rasgos.push('pedidos');
  if (crudo[CLAVES.movimientos] != null) rasgos.push('movimientos');
  const ventas = Array.isArray(colecciones.ventas) ? colecciones.ventas : [];
  if (ventas.some((v) => v && Array.isArray(v.abonos))) rasgos.push('abonos en ventas');
  if (ventas.some((v) => v && v.sumaItems !== undefined)) rasgos.push('descuentos');
  const gastos = Array.isArray(colecciones.gastos) ? colecciones.gastos : [];
  if (gastos.some((g) => g && g.tipo === 'compra')) rasgos.push('compras de inventario');
  return { app: 'Cuentas', almacenamiento: 'localStorage', rasgos };
}

/**
 * Importa los datos originales a IndexedDB.
 * @returns {Promise<{ estado: 'sin-datos'|'ya-importado'|'base-con-datos'|'error'|'importado', ... }>}
 */
export async function importarLegado(almacen = globalThis.localStorage, ahora = () => new Date()) {
  const actual = await leerTodo();
  if (actual.meta.migracionLegado) return { estado: 'ya-importado', detalle: actual.meta.migracionLegado };
  if (!hayDatosLegado(almacen)) return { estado: 'sin-datos' };
  const hayDatos = actual.ajustes || COLECCIONES.some((c) => actual.filas[c].length);
  if (hayDatos) return { estado: 'base-con-datos' };

  const lectura = leerLegado(almacen);
  if (lectura.errores.length) return { estado: 'error', errores: lectura.errores };

  const detalle = { fecha: ahora().toISOString(), origen: lectura.origen, conteos: lectura.conteos, advertencias: lectura.advertencias.length };
  try {
    await reemplazarTodo({
      colecciones: lectura.datos.colecciones,
      ajustes: lectura.datos.ajustes,
      respaldoPrevio: JSON.stringify({ app: 'cuentas', origen: 'localStorage', fecha: detalle.fecha, claves: lectura.crudo }),
      motivo: 'legado',
      meta: { migracionLegado: detalle },
    });
    const verificacion = await verificarContra(lectura.datos);
    if (!verificacion.ok) {
      await deshacerImportacion();
      return { estado: 'error', errores: verificacion.diferencias };
    }
  } catch (e) {
    await deshacerImportacion().catch(() => {});
    return { estado: 'error', errores: [String((e && e.message) || e)] };
  }
  // localStorage sigue igual: se comprueba por si acaso.
  const intacto = Object.entries(lectura.crudo).every(([k, v]) => almacen.getItem(k) === v);
  return { estado: 'importado', ...detalle, advertenciasDetalle: lectura.advertencias, localStorageIntacto: intacto };
}

/** Lee de vuelta lo guardado (con las imágenes reconstruidas) y lo compara, registro por registro, con lo original. */
export async function verificarContra(original) {
  const { filas, ajustes, archivos } = await leerTodo();
  const imagenes = new Map();
  for (const a of archivos) imagenes.set(a.id, await dataUrlDeArchivo(a));
  const resolver = (id) => imagenes.get(id) || '';
  const diferencias = [];
  for (const c of COLECCIONES) {
    const esperado = original.colecciones[c];
    const leido = filas[c].map((f) => inflarImagenes(c, f.r, resolver));
    if (leido.length !== esperado.length) { diferencias.push(`${c}: se esperaban ${esperado.length} y hay ${leido.length}`); continue; }
    leido.forEach((r, i) => { if (JSON.stringify(r) !== JSON.stringify(esperado[i])) diferencias.push(`${c}[${i}] (${esperado[i].id}) no coincide`); });
  }
  const ajustesLeidos = ajustes ? inflarImagenes('ajustes', ajustes, resolver) : null;
  if (JSON.stringify(ajustesLeidos) !== JSON.stringify(original.ajustes)) diferencias.push('ajustes no coinciden');
  return { ok: diferencias.length === 0, diferencias };
}

/** Borra lo importado (no toca localStorage ni el respaldo original). */
async function deshacerImportacion() {
  await transaccion([...COLECCIONES, 'ajustes', 'archivos', 'meta'], 'readwrite', (almacen) => {
    for (const c of COLECCIONES) almacen(c).clear();
    almacen('ajustes').clear();
    almacen('archivos').clear();
    almacen('meta').delete('migracionLegado');
  });
  await cargarEnMemoria();
}
