// Fecha y hora de la app. Único lugar que consulta el reloj del sistema,
// para poder fijarlo en las pruebas.

let relojFijo = null;

/** Momento actual (Date). */
export function ahora() {
  return relojFijo ? new Date(relojFijo.getTime()) : new Date();
}

/** Fecha local de hoy en formato AAAA-MM-DD (RG-03; igual que todayStr, L507). */
export function hoy() {
  const d = ahora();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Solo para pruebas: fija el reloj en una fecha. Sin argumento, vuelve al reloj real. */
export function fijarReloj(fecha) {
  relojFijo = fecha ? new Date(fecha) : null;
}
