// Operaciones de pendientes: pedidos, encargos y apartados.

import { coleccion, obtenerAjustes } from '../core/state.js';
import { ErrorDeNegocio, ErrorDeValidacion } from '../core/errors.js';
import { guardarCambios } from '../data/database.js';
import * as R from '../business/orders-rules.js';
import { siguienteComprobante, comprobanteDeAbono } from '../business/invoicing.js';
import { MENSAJES, mensajeAbono } from '../business/validation.js';
import { validarMateriales } from '../business/inventory-rules.js';
import { contexto } from './contexto.js';
import { exigir, buscar, reemplazar } from './comun.js';
import { verificarDisponible } from './sales.js';

/** Crea o edita un pendiente desde su formulario (sin validar stock, como la versión original: D4-18). */
export async function guardarPendiente(id, formulario) {
  const anterior = id ? buscar('pedidos', id) : null;
  if (!coleccion('clientes').length) throw new ErrorDeNegocio(MENSAJES.sinClientes);
  const cliente = coleccion('clientes').find((c) => c.id === formulario.clienteId) || null;
  const { pendiente } = exigir(R.guardarPendienteFormulario(anterior, { ...formulario, cliente }, contexto()));
  const lista = coleccion('pedidos');
  await guardarCambios({ colecciones: { pedidos: anterior ? reemplazar(lista, pendiente) : [...lista, pendiente] } });
  return pendiente;
}

/** Pendiente desde el asistente de venta (valida stock salvo en encargos; no guarda el descuento: D4-03). */
export async function crearPendienteDesdeAsistente(datos) {
  if (!datos.carrito.length) throw new ErrorDeNegocio('Agrega productos primero.');
  const msg = validarMateriales(datos.carrito.map((it) => ({ ...it, productoId: null })), coleccion('pedidos'), coleccion('inventario'));
  if (msg) throw new ErrorDeNegocio(msg);
  if (datos.tipo !== 'encargo') verificarDisponible(datos.carrito);
  if (datos.tipo === 'pedido' && !datos.fecha) throw new ErrorDeValidacion(MENSAJES.fecha, 'fecha');
  const cliente = buscar('clientes', datos.clienteId);
  const pendiente = R.pendienteDesdeAsistente({ ...datos, cliente }, contexto());
  await guardarCambios({ colecciones: { pedidos: [...coleccion('pedidos'), pendiente] } });
  return pendiente;
}

/** Abono a un pedido o encargo (RP-07) o a un apartado (RP-08). `formatoDinero` arma el mensaje de error. */
export async function abonar(id, formulario, formatoDinero) {
  const p = buscar('pedidos', id);
  const ctx = contexto();
  const r = p.tipo === 'apartado'
    ? R.abonarApartado(p, formulario, { impuestoPct: obtenerAjustes().impuesto, nuevoId: ctx.nuevoId })
    : R.abonarPendiente(p, formulario, ctx);
  if (!r.ok) throw new ErrorDeValidacion(mensajeAbono(r.error, r.saldo, formatoDinero), r.error === 'fecha' ? 'fecha' : 'monto');
  await guardarCambios({ colecciones: { pedidos: reemplazar(coleccion('pedidos'), r.pendiente) } });
  return r.pendiente;
}

/** Entrega: crea la venta, descuenta stock y marca entregado, en una transacción (RP-10 … RP-14). */
export async function entregar(id, opciones) {
  const p = buscar('pedidos', id);
  const r = R.entregarPendiente(p, opciones, { inventario: coleccion('inventario'), clientes: coleccion('clientes'), impuestoPct: obtenerAjustes().impuesto, ...contexto() });
  if (!r.ok) throw new ErrorDeNegocio(`No hay suficiente stock de ${r.faltante.nombre} para entregar este pedido (disponibles: ${r.faltante.stock}).`);
  await guardarCambios({ colecciones: { ventas: [...coleccion('ventas'), r.venta], inventario: r.inventario, pedidos: reemplazar(coleccion('pedidos'), r.pendiente) } });
  return r.venta;
}

/** Cancela y registra la devolución de lo abonado como gasto (RP-15). */
export async function cancelar(id) {
  const r = R.cancelarPendiente(buscar('pedidos', id), contexto());
  await guardarCambios({ colecciones: { gastos: [...coleccion('gastos'), ...r.devoluciones], pedidos: reemplazar(coleccion('pedidos'), r.pendiente) } });
  return r;
}

/** Comprobante de abono: consume un número cada vez que se genera, como la versión original (D4-07). */
export async function generarComprobante(id) {
  const p = buscar('pedidos', id);
  const { numero, ajustes } = siguienteComprobante(obtenerAjustes());
  await guardarCambios({ ajustes });
  return comprobanteDeAbono(p, coleccion('clientes').find((c) => c.id === p.clienteId), numero, contexto().hoy);
}
