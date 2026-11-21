// Operaciones de facturas: asignar folio y editar datos.

import { coleccion, obtenerAjustes } from '../core/state.js';
import { guardarCambios } from '../data/database.js';
import { asignarFolio, editarFactura as reglaEditar } from '../business/invoicing.js';
import { exigir, buscar, reemplazar } from './comun.js';

/** Asigna el siguiente folio si la venta no lo tiene (RF-01). Venta y contador en la misma transacción. */
export async function generarFactura(ventaId) {
  const r = asignarFolio(buscar('ventas', ventaId), obtenerAjustes());
  if (r.asignado) await guardarCambios({ colecciones: { ventas: reemplazar(coleccion('ventas'), r.venta) }, ajustes: r.ajustes });
  return r.venta;
}

export async function editarFactura(ventaId, formulario) {
  const { venta } = exigir(reglaEditar(buscar('ventas', ventaId), formulario));
  await guardarCambios({ colecciones: { ventas: reemplazar(coleccion('ventas'), venta) } });
  return venta;
}
