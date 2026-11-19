// Navegación: ruta en la dirección (#/modulo/subvista) y pila de hojas abiertas.
// Cada hoja abierta agrega una entrada al historial, así el botón "atrás" del teléfono
// cierra la hoja en vez de salir de la app (Etapa 3, §10).

import { eventos, EVENTOS } from './events.js';
import { escribirInterfaz } from './state.js';

let modulos = new Map();   // id -> { subvistas: [id...] }
let inicial = '';
let actual = { modulo: '', sub: '' };
const pila = [];           // hojas abiertas: { id, cerrar }
let contador = 0;
let alTerminarRetroceso = null;

/** Convierte "#/ventas/pendientes" en { modulo, sub }. Devuelve null si la ruta no existe. */
export function interpretarRuta(hash, mapa = modulos) {
  const [modulo = '', sub = ''] = String(hash || '').replace(/^#\/?/, '').split('/');
  const def = mapa.get(modulo);
  if (!def) return null;
  const subs = def.subvistas || [];
  if (!subs.length) return sub ? null : { modulo, sub: '' };
  if (!sub) return { modulo, sub: subs[0] };
  return subs.includes(sub) ? { modulo, sub } : null;
}

/** Arma la ruta de un módulo y subvista. */
export function ruta(modulo, sub = '') {
  return `#/${modulo}${sub ? '/' + sub : ''}`;
}

/** Ruta actual. */
export function rutaActual() {
  return { ...actual };
}

/**
 * Inicia la navegación.
 * @param {{ modulos: Array<{id: string, subvistas?: Array<{id: string}>}>, inicial: string }} opciones
 */
export function iniciarNavegacion(opciones) {
  modulos = new Map(opciones.modulos.map((m) => [m.id, { subvistas: (m.subvistas || []).map((s) => s.id) }]));
  inicial = opciones.inicial;
  window.addEventListener('hashchange', aplicarRuta);
  window.addEventListener('popstate', alRetroceder);
  aplicarRuta();
}

/** Va a un módulo (y subvista). Si hay hojas abiertas, primero las cierra. */
export function irA(modulo, sub = '') {
  const destino = ruta(modulo, sub);
  if (pila.length) {
    alTerminarRetroceso = () => { if (location.hash !== destino) location.hash = destino; else aplicarRuta(); };
    history.go(-pila.length);
  } else if (location.hash !== destino) {
    location.hash = destino;
  }
}

function aplicarRuta() {
  const r = interpretarRuta(location.hash);
  if (!r) {
    history.replaceState(history.state, '', ruta(inicial, (modulos.get(inicial).subvistas || [])[0] || ''));
    return aplicarRuta();
  }
  const canonica = ruta(r.modulo, r.sub);
  if (location.hash !== canonica) history.replaceState(history.state, '', canonica);
  if (r.modulo === actual.modulo && r.sub === actual.sub) return;
  actual = r;
  escribirInterfaz('ruta', r);
  eventos.emitir(EVENTOS.NAVEGACION, { ...r });
}

function alRetroceder(e) {
  const quedan = (e.state && e.state.orismaHojas) || 0;
  while (pila.length > quedan) pila.pop().cerrar();
  if (alTerminarRetroceso) { const fn = alTerminarRetroceso; alTerminarRetroceso = null; fn(); }
}

/**
 * Registra una hoja recién abierta. `cerrar` quita la hoja de la pantalla.
 * @returns {number} identificador para cerrarla con cerrarHoja()
 */
export function apilarHoja(cerrar) {
  const id = ++contador;
  pila.push({ id, cerrar });
  history.pushState({ orismaHojas: pila.length }, '');
  return id;
}

/** Cierra una hoja (y las que estén encima) pasando por el historial. */
export function cerrarHoja(id) {
  const i = pila.findIndex((h) => h.id === id);
  if (i === -1) return;
  history.go(-(pila.length - i));
}

/** Cantidad de hojas abiertas. */
export function hojasAbiertas() {
  return pila.length;
}
