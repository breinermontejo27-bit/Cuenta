// Formato de valores para mostrar. Sin reglas de negocio.

import { obtenerAjustes } from '../core/state.js';

/**
 * Dinero: símbolo + espacio + signo + miles con punto + coma + 2 decimales (RG-02).
 * Copia exacta de money() de la versión original (L494).
 */
export function dinero(n, moneda = obtenerAjustes().moneda) {
  const num = Number(n) || 0;
  const abs = Math.abs(num).toFixed(2);
  const [ent, dec] = abs.split('.');
  const grupos = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return moneda + ' ' + (num < 0 ? '-' : '') + grupos + ',' + dec;
}

/** Fecha AAAA-MM-DD → "19 nov 2026" (igual que fmtDate, L508). */
export function fecha(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Número de documento con 4 dígitos: 7 → "0007". */
export function numeroDocumento(n) {
  return String(n).padStart(4, '0');
}

/** Folio visible de una factura: 7 → "F-0007" (RG-04). */
export function folio(n) {
  return 'F-' + numeroDocumento(n);
}

/** Iniciales de un nombre: "Ana Pérez" → "AP" (igual que initials, L504). */
export function iniciales(nombre) {
  return (String(nombre == null ? '' : nombre) || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** Nombres de los medios de pago (RV-14). */
export const MEDIOS = Object.freeze({ efectivo: 'Efectivo', tarjeta: 'Tarjeta', credito: 'A crédito', mixto: 'Mixto' });

/** Nombre de un medio de pago; vacío si no se conoce. Recibe el medio (texto), no la venta (corrige D4-04). */
export function etiquetaMedio(medio) {
  return medio ? (MEDIOS[medio] || '') : '';
}
