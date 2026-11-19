// Imágenes: se guardan aparte, en el almacén "archivos", y los registros guardan una referencia
// "archivo:img-<huella>". Una misma imagen repetida (p. ej. la foto de un servicio copiada en cada venta)
// se guarda una sola vez. Al exportar un respaldo, las referencias se vuelven a convertir en la imagen.

import { CAMPOS_IMAGEN, PREFIJO_ARCHIVO } from './schema.js';

const IMAGEN_DATOS = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/]+=*)$/;

/** Huella SHA-256 (hex) de un texto. */
export async function huella(texto) {
  const bytes = new TextEncoder().encode(texto);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Identificador del archivo para una imagen en formato data:. */
export async function idDeImagen(dataUrl) {
  return 'img-' + (await huella(dataUrl)).slice(0, 32);
}

function recorrer(obj, ruta, fn) {
  if (obj == null) return;
  const [paso, ...resto] = ruta;
  if (paso === '*') { if (Array.isArray(obj)) obj.forEach((el) => recorrer(el, resto, fn)); return; }
  if (!resto.length) { fn(obj, paso); return; }
  recorrer(obj[paso], resto, fn);
}

/**
 * Saca las imágenes data: de un registro y las reemplaza por referencias. No modifica el original.
 * @returns {Promise<{ registro: Object, archivos: Map<string, string> }>} archivos: id → data URL
 */
export async function extraerImagenes(coleccion, registro) {
  const copia = structuredClone(registro);
  const archivos = new Map();
  const pendientes = [];
  for (const ruta of CAMPOS_IMAGEN[coleccion] || []) {
    recorrer(copia, ruta, (padre, campo) => {
      const v = padre[campo];
      if (typeof v === 'string' && IMAGEN_DATOS.test(v)) {
        pendientes.push(idDeImagen(v).then((id) => { archivos.set(id, v); padre[campo] = PREFIJO_ARCHIVO + id; }));
      }
    });
  }
  await Promise.all(pendientes);
  return { registro: copia, archivos };
}

/** Reemplaza las referencias "archivo:" por la imagen (data URL). `resolver(id)` devuelve el data URL o ''. No modifica el original. */
export function inflarImagenes(coleccion, registro, resolver) {
  const copia = structuredClone(registro);
  for (const ruta of CAMPOS_IMAGEN[coleccion] || []) {
    recorrer(copia, ruta, (padre, campo) => {
      const v = padre[campo];
      if (typeof v === 'string' && v.startsWith(PREFIJO_ARCHIVO)) padre[campo] = resolver(v.slice(PREFIJO_ARCHIVO.length)) || '';
    });
  }
  return copia;
}

/** data URL → { tipo, bytes } (sin usar fetch, permitido por la política de seguridad). */
export function decodificarDataUrl(dataUrl) {
  const m = IMAGEN_DATOS.exec(dataUrl);
  if (!m) throw new Error('No es una imagen válida');
  const binario = atob(m[2]);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return { tipo: m[1], bytes };
}

/** { tipo, bytes } → data URL. */
export function codificarDataUrl(tipo, bytes) {
  let binario = '';
  const PASO = 0x8000;
  for (let i = 0; i < bytes.length; i += PASO) binario += String.fromCharCode.apply(null, bytes.subarray(i, i + PASO));
  return `data:${tipo};base64,${btoa(binario)}`;
}

/**
 * Registro de archivo listo para el almacén "archivos". Se guarda en binario (Blob) salvo que al volver a
 * codificarlo no dé exactamente el mismo texto; en ese caso se guarda el texto tal cual (nunca se altera una imagen).
 */
export function registroDeArchivo(id, dataUrl) {
  const { tipo, bytes } = decodificarDataUrl(dataUrl);
  if (codificarDataUrl(tipo, bytes) === dataUrl) return { id, tipo, datos: new Blob([bytes], { type: tipo }) };
  return { id, tipo, texto: dataUrl };
}

/** Registro del almacén "archivos" → data URL (para respaldos). */
export async function dataUrlDeArchivo(reg) {
  if (reg.texto) return reg.texto;
  return codificarDataUrl(reg.tipo, new Uint8Array(await reg.datos.arrayBuffer()));
}

/** Registro del almacén "archivos" → dirección para mostrar en pantalla. */
export function urlDeArchivo(reg) {
  return reg.texto || URL.createObjectURL(reg.datos);
}
