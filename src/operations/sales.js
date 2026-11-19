// Operaciones de ventas: registrar (asistente) y anular.

import { coleccion, obtenerAjustes } from '../core/state.js';
import { ErrorDeNegocio } from '../core/errors.js';
import { guardarCambios } from '../data/database.js';
import { construirVenta, unidadesDeVenta, anularVenta as reglaAnular } from '../business/sales-rules.js';
import { descontarStock, disponible, mensajeSinStock, validarMateriales } from '../business/inventory-rules.js';
import { contexto } from './contexto.js';
import { buscar } from './comun.js';

/** Comprueba que el carrito quepa en el disponible (RI-16). Lanza ErrorDeNegocio con el mensaje de la original. */
export function verificarDisponible(carrito) {
  const pedidos = coleccion('pedidos'), inventario = coleccion('inventario');
  const excedido = carrito.find((it) => it.cantidad > disponible(pedidos, inventario, it.productoId));
  if (excedido) throw new ErrorDeNegocio(mensajeSinStock(excedido.nombre, disponible(pedidos, inventario, excedido.productoId)));
  const msg = validarMateriales(carrito, pedidos, inventario);
  if (msg) throw new ErrorDeNegocio(msg);
}

/**
 * Registra una venta del asistente: la venta y el descuento de stock, en una sola transacción.
 * @param {{ clienteId, carrito, descuento, notas, medio, montos }} datos
 */
export async function registrarVenta({ clienteId, carrito, descuento, notas, medio, montos }) {
  if (!carrito.length) throw new ErrorDeNegocio('Agrega productos primero.');
  verificarDisponible(carrito);
  const cliente = buscar('clientes', clienteId);
  const venta = construirVenta({ cliente, carrito, descuento, impuestoPct: obtenerAjustes().impuesto, notas, medio, montos }, contexto());
  await guardarCambios({ colecciones: {
    ventas: [...coleccion('ventas'), venta],
    inventario: descontarStock(coleccion('inventario'), unidadesDeVenta(venta.items)),
  } });
  return venta;
}

/** Anula una venta: la borra y devuelve las unidades al inventario (comportamiento actual; decisión 5 pendiente). */
export async function anularVenta(id) {
  const venta = buscar('ventas', id);
  const r = reglaAnular(venta, { ventas: coleccion('ventas'), inventario: coleccion('inventario') }, contexto());
  await guardarCambios({ colecciones: { ventas: r.ventas, inventario: r.inventario, movimientos: [...coleccion('movimientos'), ...r.movimientos] } });
}
