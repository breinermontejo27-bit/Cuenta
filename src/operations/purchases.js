// Compras de inventario (desde el producto y desde Gastos). Se conservan los dos comportamientos de la versión
// original (D4-01, decisión 4 pendiente).

import { coleccion } from '../core/state.js';
import { guardarCambios } from '../data/database.js';
import { compraDesdeProducto as reglaProducto, compraDesdeGastos as reglaGastos } from '../business/inventory-rules.js';
import { contexto } from './contexto.js';
import { exigir, buscar, reemplazar } from './comun.js';

export async function comprarDesdeProducto(productoId, formulario) {
  const p = buscar('inventario', productoId);
  const r = reglaProducto(p, formulario, contexto());
  exigir(r.ok ? r : { ok: false, campo: 'cantidad' });
  await guardarCambios({ colecciones: { inventario: reemplazar(coleccion('inventario'), r.producto), gastos: [...coleccion('gastos'), r.gasto] } });
  return r;
}

export async function comprarDesdeGastos(productoId, formulario) {
  const p = productoId ? buscar('inventario', productoId) : null;
  const r = exigir(reglaGastos(p, formulario, contexto()));
  const inv = coleccion('inventario');
  const cambios = { inventario: r.esNuevo ? [...inv, r.producto] : reemplazar(inv, r.producto), gastos: [...coleccion('gastos'), r.gasto] };
  if (r.movimiento) cambios.movimientos = [...coleccion('movimientos'), r.movimiento];
  await guardarCambios({ colecciones: cambios });
  return r;
}
