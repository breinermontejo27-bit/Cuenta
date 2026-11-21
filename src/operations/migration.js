// Migración desde la versión anterior ("Cuentas") y mantenimiento del almacenamiento (Etapa 9).

import { estadoLegado, reimportarLegado } from '../data/legacy-import.js';
import { exportar } from '../data/backup.js';
import { limpiarArchivosSinUso, guardarMeta, leerMeta } from '../data/database.js';

/** Estado de la migración (solo lectura). */
export function estadoMigracion() {
  return estadoLegado();
}

/** Reemplaza los datos de Orisma por los de la versión anterior (con respaldo automático previo y verificación). */
export async function traerDeNuevoDatosAnteriores() {
  return reimportarLegado(await exportar());
}

/** Borra las imágenes que ya no usa ningún registro y anota el resultado. */
export async function limpiarImagenes(ahora = () => new Date()) {
  const r = await limpiarArchivosSinUso();
  const previo = (await leerMeta('limpiezaImagenes')) || { borradas: 0, bytes: 0 };
  const acumulado = { fecha: ahora().toISOString(), borradas: previo.borradas + r.borradas, bytes: previo.bytes + r.bytes };
  if (r.borradas) await guardarMeta('limpiezaImagenes', acumulado);
  return { ...r, acumulado };
}
