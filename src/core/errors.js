// Tipos de error, captura global y mensajes para el usuario (Etapa 2, §10).
// Ningún error se queda solo en la consola: todo error no controlado se registra y se avisa.

import { eventos, EVENTOS } from './events.js';

/** Dato mal escrito o faltante en un formulario. `campo` indica dónde mostrar el mensaje. */
export class ErrorDeValidacion extends Error {
  constructor(mensaje, campo = null) { super(mensaje); this.name = 'ErrorDeValidacion'; this.campo = campo; }
}

/** La operación no se puede hacer por una regla del negocio (p. ej. no hay stock). */
export class ErrorDeNegocio extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorDeNegocio'; }
}

/** No se pudo leer o guardar en el almacenamiento. Los datos quedan como estaban. */
export class ErrorDeAlmacenamiento extends Error {
  constructor(mensaje, causa = null) { super(mensaje); this.name = 'ErrorDeAlmacenamiento'; this.causa = causa; }
}

const MAX_REGISTRO = 50;
const registro = [];

/** Últimos errores registrados (más reciente al final). */
export function erroresRegistrados() {
  return registro.slice();
}

/** Guarda un error en el registro local de diagnóstico. */
export function registrarError(error, contexto = '') {
  registro.push({
    fecha: new Date().toISOString(),
    tipo: (error && error.name) || 'Error',
    mensaje: String((error && error.message) || error),
    contexto,
  });
  if (registro.length > MAX_REGISTRO) registro.shift();
}

/** Traduce un error a un texto entendible para el dueño del negocio. */
export function mensajeParaUsuario(error) {
  if (error instanceof ErrorDeValidacion || error instanceof ErrorDeNegocio) return error.message;
  if (error instanceof ErrorDeAlmacenamiento || (error && error.name === 'QuotaExceededError')) {
    return 'No se pudo guardar. El almacenamiento del teléfono puede estar lleno. Tus datos anteriores están a salvo.';
  }
  return 'Algo salió mal. Si se repite, descarga un respaldo y avísanos qué estabas haciendo.';
}

/** ¿Es un error grave (no se debe cerrar el aviso solo)? */
export function esGrave(error) {
  return !(error instanceof ErrorDeValidacion || error instanceof ErrorDeNegocio);
}

/** Trata un error: lo registra (si es inesperado) y lo anuncia para que la interfaz lo muestre. */
export function informarError(error, contexto = '') {
  if (esGrave(error)) registrarError(error, contexto);
  eventos.emitir(EVENTOS.ERROR, { error, mensaje: mensajeParaUsuario(error), grave: esGrave(error) });
}

/** Captura los errores no controlados de toda la app. Se llama una vez al arrancar. */
export function iniciarCapturaErrores(ventana = globalThis) {
  ventana.addEventListener('error', (e) => informarError(e.error || new Error(e.message), 'global'));
  ventana.addEventListener('unhandledrejection', (e) => informarError(e.reason instanceof Error ? e.reason : new Error(String(e.reason)), 'promesa'));
}
