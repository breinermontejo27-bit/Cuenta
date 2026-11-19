// Fechas del negocio (AAAA-MM-DD). Sin formato visual: eso está en ui/format.js.
// La fecha de hoy siempre se recibe como parámetro (core/clock.js la da), para poder probar con fechas fijas.

/** Mes de una fecha: "2026-11-19" → "2026-11" (monthKey, L512). */
export function mesDe(iso) {
  return iso.slice(0, 7);
}

/** Mes anterior al de hoy (mesAnteriorKey, L1800). */
export function mesAnterior(hoy) {
  const [y, m] = hoy.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
