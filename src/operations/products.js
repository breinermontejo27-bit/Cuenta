// Operaciones de productos.

import { coleccion } from '../core/state.js';
import { guardarCambios } from '../data/database.js';
import { guardarProducto as reglaGuardar, movimientoBaja } from '../business/inventory-rules.js';
import { contexto } from './contexto.js';
import { exigir, buscar, reemplazar } from './comun.js';

export async function guardarProducto(id, formulario) {
  const anterior = id ? buscar('inventario', id) : null;
  const { producto, movimiento } = exigir(reglaGuardar(anterior, formulario, contexto()));
  const inv = coleccion('inventario');
  const cambios = { inventario: anterior ? reemplazar(inv, producto) : [...inv, producto] };
  if (movimiento) cambios.movimientos = [...coleccion('movimientos'), movimiento];
  await guardarCambios({ colecciones: cambios });
  return producto;
}

export async function eliminarProducto(id) {
  const p = buscar('inventario', id);
  await guardarCambios({ colecciones: {
    movimientos: [...coleccion('movimientos'), movimientoBaja(p, contexto())],
    inventario: coleccion('inventario').filter((x) => x.id !== id),
  } });
}
