// Gastos generales (Etapa 1, Documento 2 §9: RG-07, RG-09). Las compras de inventario están en inventory-rules.js.

import { num } from './numbers.js';

/** RG-07 · Gasto general nuevo (L2514–2524). Solo la descripción es obligatoria; el monto se acepta como venga. */
export function gastoGeneral({ descripcion, monto, fecha, categoria, metodo }, { hoy, nuevoId }) {
  const d = String(descripcion || '').trim();
  if (!d) return { ok: false, campo: 'descripcion' };
  return { ok: true, gasto: { id: nuevoId(), tipo: 'general', metodo, descripcion: d, monto: num(monto), fecha: fecha || hoy, categoria: String(categoria || '').trim() } };
}

/** RG-09 · Editar un gasto (L2309–2318). Si es una compra, no cambia stock ni costo. */
export function editarGasto(anterior, { descripcion, monto, fecha, categoria, metodo }, { hoy }) {
  const d = String(descripcion || '').trim();
  if (!d) return { ok: false, campo: 'descripcion' };
  return { ok: true, gasto: { ...anterior, descripcion: d, monto: num(monto), fecha: fecha || hoy, categoria: String(categoria || '').trim(), metodo } };
}

/** Lista de gastos: búsqueda en descripción o categoría, más recientes primero (L1578–1580). */
export function filtrarGastos(gastos, termino) {
  const t = String(termino || '').trim().toLowerCase();
  return gastos.filter((g) => g.descripcion.toLowerCase().includes(t) || (g.categoria || '').toLowerCase().includes(t))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}
