// Acceso centralizado a IndexedDB: abrir, leer todo, transacciones y guardar cambios.
// Reglas (Etapa 2, A4 y A5):
//  - Todo lo que se escribe en una operación va en UNA transacción: o se guarda completo o no se guarda nada.
//  - La copia en memoria (core/state) solo se actualiza después de que la transacción se confirma.
//  - Ningún error se silencia: se convierte en ErrorDeAlmacenamiento y sube a quien llamó.
// Estado propio de este módulo: la conexión abierta y la posición de cada registro (orden de las listas).

import { NOMBRE_BD } from '../core/config.js';
import { ErrorDeAlmacenamiento } from '../core/errors.js';
import { coleccion, reemplazarColecciones, reemplazarAjustes, registrarArchivo } from '../core/state.js';
import { COLECCIONES, VERSION_ESQUEMA, revisarRegistro, revisarDatos } from './schema.js';
import { VERSION_BD, actualizarEstructura } from './migrations.js';
import { extraerImagenes, registroDeArchivo, urlDeArchivo } from './files.js';

let db = null;
const posiciones = Object.fromEntries(COLECCIONES.map((c) => [c, new Map()]));
export const MAX_RESPALDOS_AUTOMATICOS = 5;

const aError = (e, contexto) => (e instanceof ErrorDeAlmacenamiento ? e
  : new ErrorDeAlmacenamiento(`${contexto}: ${(e && (e.name + ' ' + e.message)) || e}`, e));

/** Abre (y si hace falta crea o actualiza) la base. */
export function abrir(nombre = NOMBRE_BD) {
  if (db) return Promise.resolve(db);
  if (!globalThis.indexedDB) return Promise.reject(new ErrorDeAlmacenamiento('Este navegador no permite guardar datos (IndexedDB no disponible).'));
  return new Promise((ok, ko) => {
    const pet = indexedDB.open(nombre, VERSION_BD);
    pet.onupgradeneeded = (e) => actualizarEstructura(pet.result, e.oldVersion);
    pet.onblocked = () => ko(new ErrorDeAlmacenamiento('Orisma está abierta en otra pestaña con una versión anterior. Ciérrala y vuelve a intentar.'));
    pet.onerror = () => ko(aError(pet.error, 'No se pudo abrir la base de datos'));
    pet.onsuccess = () => {
      db = pet.result;
      db.onversionchange = () => { db.close(); db = null; };
      ok(db);
    };
  });
}

/** Cierra la conexión (para pruebas y para borrar la base). */
export function cerrar() {
  if (db) { db.close(); db = null; }
  for (const c of COLECCIONES) posiciones[c].clear();
}

/**
 * Ejecuta una transacción. `fn(almacen)` debe hacer las peticiones de forma síncrona (sin await dentro):
 * todo cálculo asíncrono va antes. Si fn lanza un error, la transacción se deshace completa.
 * @returns {Promise<*>} lo que devuelva fn, cuando la transacción se confirma
 */
export async function transaccion(almacenes, modo, fn) {
  const base = await abrir();
  return new Promise((ok, ko) => {
    let resultado, fallo = null;
    let tx;
    try { tx = base.transaction(almacenes, modo); } catch (e) { ko(aError(e, 'No se pudo iniciar la transacción')); return; }
    tx.oncomplete = () => ok(resultado);
    tx.onabort = () => ko(fallo || aError(tx.error, 'La operación no se guardó'));
    tx.onerror = (e) => { e.preventDefault(); if (!fallo) fallo = aError(e.target.error, 'Error al guardar'); try { tx.abort(); } catch (_) { /* ya abortada */ } };
    try {
      const almacen = (nombre) => tx.objectStore(nombre);
      resultado = fn(almacen);
      if (resultado && typeof resultado.then === 'function') throw new Error('transaccion(): fn no puede ser asíncrona');
    } catch (e) {
      fallo = e;
      try { tx.abort(); } catch (_) { /* ya abortada */ }
    }
  });
}

const pedir = (peticion) => new Promise((ok, ko) => { peticion.onsuccess = () => ok(peticion.result); peticion.onerror = () => ko(peticion.error); });

/** Lee todo lo guardado: colecciones (en su orden), ajustes, datos internos y archivos. */
export async function leerTodo() {
  const base = await abrir();
  const tx = base.transaction([...COLECCIONES, 'ajustes', 'meta', 'archivos'], 'readonly');
  const filas = await Promise.all(COLECCIONES.map((c) => pedir(tx.objectStore(c).index('n').getAll())));
  const [ajustes, meta, archivos] = await Promise.all([
    pedir(tx.objectStore('ajustes').get('ajustes')),
    pedir(tx.objectStore('meta').getAll()),
    pedir(tx.objectStore('archivos').getAll()),
  ]);
  return {
    filas: Object.fromEntries(COLECCIONES.map((c, i) => [c, filas[i]])),
    ajustes: ajustes ? ajustes.r : null,
    meta: Object.fromEntries(meta.map((m) => [m.k, m.v])),
    archivos,
  };
}

/** ¿La base no tiene ningún registro del negocio ni ajustes? */
export async function estaVacia() {
  const { filas, ajustes } = await leerTodo();
  return !ajustes && COLECCIONES.every((c) => filas[c].length === 0);
}

/** Carga todo lo guardado en la memoria de la app (core/state) y prepara las imágenes para mostrarse. */
export async function cargarEnMemoria() {
  const { filas, ajustes, meta, archivos } = await leerTodo();
  for (const a of archivos) registrarArchivo(a.id, urlDeArchivo(a));
  const cambios = {};
  for (const c of COLECCIONES) {
    posiciones[c] = new Map(filas[c].map((f) => [f.k, f.n]));
    cambios[c] = filas[c].map((f) => f.r);
  }
  reemplazarColecciones(cambios);
  reemplazarAjustes(ajustes || undefined);
  return { meta, conteos: Object.fromEntries(COLECCIONES.map((c) => [c, cambios[c].length])) };
}

/**
 * Calcula qué filas escribir y cuáles borrar para pasar de la lista actual (en memoria) a la nueva,
 * conservando la posición de los registros que no cambian de orden.
 */
export function planDeCambios(vieja, posVieja, nueva) {
  const ids = new Set();
  for (const r of nueva) {
    if (!r || typeof r.id !== 'string' || !r.id) throw new Error('Registro sin identificador');
    if (ids.has(r.id)) throw new Error(`Identificador repetido: ${r.id}`);
    ids.add(r.id);
  }
  const anteriores = new Map(vieja.map((r) => [r.id, r]));
  // ¿Se puede conservar la numeración? Solo si los registros que siguen mantienen su orden y los nuevos van al final.
  let estable = true, ultimo = -Infinity, hayNuevo = false;
  for (const r of nueva) {
    if (posVieja.has(r.id)) {
      const n = posVieja.get(r.id);
      if (hayNuevo || n <= ultimo) { estable = false; break; }
      ultimo = n;
    } else hayNuevo = true;
  }
  const poner = [];
  const posNueva = new Map();
  if (estable) {
    let max = Math.max(-1, ...posVieja.values());
    for (const r of nueva) {
      const n = posVieja.has(r.id) ? posVieja.get(r.id) : ++max;
      posNueva.set(r.id, n);
      if (anteriores.get(r.id) !== r) poner.push({ k: r.id, n, r });
    }
  } else {
    nueva.forEach((r, n) => { posNueva.set(r.id, n); if (anteriores.get(r.id) !== r || posVieja.get(r.id) !== n) poner.push({ k: r.id, n, r }); });
  }
  const quitar = [...posVieja.keys()].filter((id) => !ids.has(id));
  return { poner, quitar, posNueva };
}

/**
 * Guarda cambios de una operación en una sola transacción y, si se confirma, actualiza la memoria.
 * @param {{ colecciones?: Object<string, Array>, ajustes?: Object }} cambios  listas completas nuevas (como en la versión original)
 */
export async function guardarCambios({ colecciones = {}, ajustes = undefined }) {
  const planes = {};
  const archivos = new Map();
  const listas = {};
  for (const [c, nueva] of Object.entries(colecciones)) {
    if (!COLECCIONES.includes(c)) throw new Error(`Colección desconocida: ${c}`);
    const plan = planDeCambios(coleccion(c), posiciones[c], nueva);
    const reemplazos = new Map();
    for (const fila of plan.poner) {
      const problemas = revisarRegistro(c, fila.r);
      if (problemas.length) throw new Error(`Registro no válido: ${problemas.join('; ')}`);
      const { registro, archivos: arch } = await extraerImagenes(c, fila.r);
      for (const [id, d] of arch) archivos.set(id, d);
      reemplazos.set(fila.k, registro);
      fila.r = registro;
    }
    planes[c] = plan;
    listas[c] = nueva.map((r) => reemplazos.get(r.id) || r);
  }
  let ajustesGuardar = null;
  if (ajustes !== undefined) {
    const problemas = revisarRegistro('ajustes', ajustes);
    if (problemas.length) throw new Error(`Ajustes no válidos: ${problemas.join('; ')}`);
    const { registro, archivos: arch } = await extraerImagenes('ajustes', ajustes);
    for (const [id, d] of arch) archivos.set(id, d);
    ajustesGuardar = registro;
  }
  const filasArchivo = [...archivos].map(([id, d]) => registroDeArchivo(id, d));
  const almacenes = [...Object.keys(planes), ...(ajustesGuardar ? ['ajustes'] : []), ...(filasArchivo.length ? ['archivos'] : [])];
  if (!almacenes.length) return;
  await transaccion(almacenes, 'readwrite', (almacen) => {
    for (const a of filasArchivo) almacen('archivos').put(a);
    for (const [c, plan] of Object.entries(planes)) {
      for (const fila of plan.poner) almacen(c).put(fila);
      for (const id of plan.quitar) almacen(c).delete(id);
    }
    if (ajustesGuardar) almacen('ajustes').put({ k: 'ajustes', r: ajustesGuardar });
  });
  // Confirmado: actualizar la memoria.
  for (const a of filasArchivo) registrarArchivo(a.id, urlDeArchivo(a));
  for (const [c, plan] of Object.entries(planes)) posiciones[c] = plan.posNueva;
  if (Object.keys(listas).length) reemplazarColecciones(listas);
  if (ajustesGuardar) reemplazarAjustes(ajustesGuardar);
}

/**
 * Reemplaza TODOS los datos (restaurar respaldo o importar). Una sola transacción.
 * Antes de borrar, guarda un respaldo automático con `respaldoPrevio` (texto) si se indica.
 */
export async function reemplazarTodo({ colecciones, ajustes, respaldoPrevio = null, motivo = '', meta = {} }) {
  const { errores } = revisarDatos({ colecciones, ajustes });
  if (errores.length) throw new ErrorDeAlmacenamiento('Datos con errores: ' + errores.slice(0, 5).join('; '));
  const archivos = new Map();
  const filas = {};
  for (const c of COLECCIONES) {
    filas[c] = [];
    for (const [n, r] of colecciones[c].entries()) {
      const { registro, archivos: arch } = await extraerImagenes(c, r);
      for (const [id, d] of arch) archivos.set(id, d);
      filas[c].push({ k: r.id, n, r: registro });
    }
  }
  let ajustesGuardar = null;
  if (ajustes) {
    const { registro, archivos: arch } = await extraerImagenes('ajustes', ajustes);
    for (const [id, d] of arch) archivos.set(id, d);
    ajustesGuardar = registro;
  }
  const filasArchivo = [...archivos].map(([id, d]) => registroDeArchivo(id, d));
  await transaccion([...COLECCIONES, 'ajustes', 'archivos', 'respaldos', 'meta'], 'readwrite', (almacen) => {
    if (respaldoPrevio) agregarRespaldo(almacen, motivo, respaldoPrevio);
    for (const c of COLECCIONES) { almacen(c).clear(); for (const f of filas[c]) almacen(c).put(f); }
    almacen('ajustes').clear();
    if (ajustesGuardar) almacen('ajustes').put({ k: 'ajustes', r: ajustesGuardar });
    almacen('archivos').clear();
    for (const a of filasArchivo) almacen('archivos').put(a);
    almacen('meta').put({ k: 'esquema', v: VERSION_ESQUEMA });
    for (const [k, v] of Object.entries(meta)) almacen('meta').put({ k, v });
  });
  return cargarEnMemoria();
}

/** Agrega un respaldo automático dentro de una transacción abierta (almacén "respaldos"). */
export function agregarRespaldo(almacen, motivo, contenido) {
  almacen('respaldos').add({ fecha: new Date().toISOString(), motivo, contenido });
  // Conservar los últimos MAX_RESPALDOS_AUTOMATICOS (el respaldo original de la migración nunca se borra).
  const cursor = almacen('respaldos').openCursor(null, 'prev');
  let vistos = 0;
  cursor.onsuccess = () => {
    const c = cursor.result;
    if (!c) return;
    if (c.value.motivo !== 'legado') { vistos++; if (vistos > MAX_RESPALDOS_AUTOMATICOS) c.delete(); }
    c.continue();
  };
}

/** Lista de respaldos automáticos (sin su contenido). */
export async function listarRespaldos() {
  const base = await abrir();
  const todos = await pedir(base.transaction('respaldos').objectStore('respaldos').getAll());
  return todos.map(({ id, fecha, motivo, contenido }) => ({ id, fecha, motivo, tamano: contenido.length }));
}

/** Contenido de un respaldo automático. */
export async function leerRespaldo(id) {
  const base = await abrir();
  const r = await pedir(base.transaction('respaldos').objectStore('respaldos').get(id));
  return r ? r.contenido : null;
}

/** Pide al navegador que no borre los datos por falta de espacio. Devuelve si quedó persistente. */
export async function pedirPersistencia() {
  try { return !!(navigator.storage && navigator.storage.persist && await navigator.storage.persist()); } catch (_) { return false; }
}

/** Espacio usado y disponible (si el navegador lo informa). */
export async function espacio() {
  try { const e = await navigator.storage.estimate(); return { usado: e.usage || 0, cuota: e.quota || 0 }; } catch (_) { return null; }
}
