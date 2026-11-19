// Ventas: totales, descuento, impuesto, costo, ganancia, pagos, armado de la venta y anulación
// (Etapa 1, Documento 2 §4 y §8: RV-01 … RV-14, RA-01 … RA-03).
// Un "carrito" es una lista de ítems { productoId, nombre, precioCatalogo, precioUnit, costo, cantidad, ... }.

import { num, limitar } from './numbers.js';
import { cantidadesNecesarias, tieneControlStock } from './inventory-rules.js';

/** RV-02 · Suma de productos (sumaItems, L2609). */
export function sumaCarrito(carrito) {
  return carrito.reduce((s, it) => s + it.precioUnit * it.cantidad, 0);
}

/**
 * RV-03, RV-04 · Totales de la venta (L2610–2620).
 * @param {{ tipo: 'monto'|'pct', valor: number }} descuento
 */
export function totalesVenta(carrito, descuento, impuestoPct) {
  const suma = sumaCarrito(carrito);
  const descuentoMonto = descuento.tipo === 'monto'
    ? Math.min(Math.max(0, num(descuento.valor)), suma)
    : suma * num(descuento.valor) / 100;
  const descuentoPct = suma > 0 ? Math.round(descuentoMonto / suma * 10000) / 100 : 0;
  const subtotal = suma - descuentoMonto;
  const impuesto = subtotal * num(impuestoPct) / 100;
  return { suma, descuentoMonto, descuentoPct, subtotal, impuesto, total: subtotal + impuesto };
}

/** RV-03 · Descuento escrito en % (se limita a 0–100) (L3110–3111). */
export function descuentoPorcentaje(valorEscrito) {
  return { tipo: 'pct', valor: limitar(num(valorEscrito), 0, 100) };
}

/**
 * RV-05 · Total escrito a mano → descuento en monto (L3114–3126).
 * @returns {{ ok: true, descuento } | { ok: false, error: 'mayor-que-suma' }}  Texto vacío: descuento 0 conservando el tipo.
 */
export function descuentoDesdeTotal(textoTotal, descuentoActual, suma, impuestoPct) {
  const nuevoTotal = Number(textoTotal);
  if (textoTotal === '' || Number.isNaN(nuevoTotal)) return { ok: true, descuento: { tipo: descuentoActual.tipo, valor: 0 } };
  const base = nuevoTotal / (1 + num(impuestoPct) / 100);
  if (base > suma) return { ok: false, error: 'mayor-que-suma' };
  return { ok: true, descuento: { tipo: 'monto', valor: Math.max(0, suma - base) } };
}

/** RV-06 · Costo del carrito (L2873). */
export function costoCarrito(carrito) {
  return carrito.reduce((s, it) => s + num(it.costo) * it.cantidad, 0);
}

/** RV-07 · Ganancia estimada = base sin impuesto − costo (L2874). */
export function gananciaVenta(carrito, totales) {
  return totales.subtotal - costoCarrito(carrito);
}

/** Margen sobre el costo para el panel de ganancia, o null si no hay costo (L2879). */
export function margenSobreCosto(ganancia, costo) {
  return costo > 0 ? Math.round((ganancia / costo) * 100) : null;
}

/**
 * RV-08 · Prenda a medida: agrupa materiales repetidos, precio = Σ precio × cantidad (sin agrupar),
 * costo = Σ costo × cantidad (L2989–2992, L3040–3047).
 * @param {Array<{productoId, cantidad}>} materiales  tal como se escribieron en el formulario
 */
export function prendaAMedida(materiales, inventario) {
  const precio = materiales.reduce((s, m) => {
    const pr = inventario.find((x) => x.id === m.productoId);
    return s + (pr ? num(pr.precio) * num(m.cantidad) : 0);
  }, 0);
  const agrupados = materiales.reduce((acc, m) => {
    const ex = acc.find((x) => x.productoId === m.productoId);
    if (ex) ex.cantidad += m.cantidad; else acc.push({ productoId: m.productoId, cantidad: m.cantidad });
    return acc;
  }, []);
  const lista = agrupados.map((m) => ({ productoId: m.productoId, nombre: (inventario.find((x) => x.id === m.productoId) || {}).nombre || '', cantidad: m.cantidad }));
  const costo = agrupados.reduce((s, m) => { const pr = inventario.find((x) => x.id === m.productoId); return s + (pr ? num(pr.costo) * m.cantidad : 0); }, 0);
  return { precio, costo, materiales: lista };
}

/** Faltantes del formulario de prenda a medida (L3028–3035). Lista vacía si está completo. */
export function faltantesPrenda({ nombre, cantidad, materiales }) {
  const faltan = [];
  if (!String(nombre || '').trim()) faltan.push('nombre de la prenda');
  if (num(cantidad) <= 0) faltan.push('cantidad de prendas (mayor que 0)');
  materiales.forEach((m, i) => {
    if (!m.productoId) faltan.push(`elegir el material ${i + 1} (o quitarlo)`);
    else if (!(m.cantidad > 0)) faltan.push(`cantidad del material ${i + 1} (mayor que 0)`);
  });
  if (!materiales.some((m) => m.productoId && m.cantidad > 0)) faltan.push('al menos un material del inventario');
  return faltan;
}

/**
 * RV-10, RV-11 · Pagos según el medio (calcPagos, L2836–2852).
 * @param {'efectivo'|'tarjeta'|'credito'|'mixto'} medio
 * @param {{ abonoInicial?, medioAbono?, efectivo?, tarjeta? }} montos
 * @returns {{ fiado: boolean, pagos: Array }}
 */
export function pagosVenta(medio, total, montos, { hoy, nuevoId }) {
  const t = total;
  if (medio === 'efectivo' || medio === 'tarjeta') {
    return { fiado: false, pagos: [{ id: nuevoId(), fecha: hoy, monto: t, metodo: medio, nota: '' }] };
  }
  if (medio === 'credito') {
    const ini = Math.min(num(montos.abonoInicial), t);
    return { fiado: true, pagos: ini > 0 ? [{ id: nuevoId(), fecha: hoy, monto: ini, metodo: montos.medioAbono || 'efectivo', nota: 'Abono inicial' }] : [] };
  }
  const ef = Math.min(num(montos.efectivo), t);
  const tj = Math.min(num(montos.tarjeta), t - ef);
  const pagos = [];
  if (ef > 0) pagos.push({ id: nuevoId(), fecha: hoy, monto: ef, metodo: 'efectivo', nota: 'Mixto' });
  if (tj > 0) pagos.push({ id: nuevoId(), fecha: hoy, monto: tj, metodo: 'tarjeta', nota: 'Mixto' });
  return { fiado: (t - ef - tj) > 0, pagos };
}

/** Saldo que queda a crédito según lo escrito (updateRest, L2782–2789). */
export function saldoACredito(medio, total, montos) {
  let rest;
  if (medio === 'credito') rest = total - Math.min(num(montos.abonoInicial), total);
  else { const ef = Math.min(num(montos.efectivo), total); rest = total - ef - Math.min(num(montos.tarjeta), total - ef); }
  return Math.max(0, rest);
}

/**
 * Arma la venta del asistente (L3141–3153). Los ids de los pagos se generan antes que el de la venta, como en la original.
 * @returns {Object} venta
 */
export function construirVenta({ cliente, carrito, descuento, impuestoPct, notas, medio, montos }, { hoy, ahora, nuevoId }) {
  const tot = totalesVenta(carrito, descuento, impuestoPct);
  const pg = pagosVenta(medio, tot.total, montos, { hoy, nuevoId });
  return {
    id: nuevoId(), folio: null, creadoTs: ahora,
    clienteId: cliente.id, clienteNombre: cliente.nombre,
    clienteDireccion: cliente.direccion || '', clienteTelefono: cliente.telefono || '', clienteEmail: cliente.email || '',
    items: carrito.map((it) => ({ productoId: it.productoId, nombre: it.nombre, precio: it.precioUnit, cantidad: it.cantidad, caracteristicas: it.caracteristicas || '', foto: it.foto || '', materiales: it.materiales || [] })),
    sumaItems: tot.suma, descuentoTipo: descuento.tipo, descuentoPct: tot.descuentoPct, descuentoMonto: tot.descuentoMonto,
    subtotal: tot.subtotal, impuesto: tot.impuesto, total: tot.total,
    costoTotal: costoCarrito(carrito), gananciaEstimada: gananciaVenta(carrito, tot),
    notas, fecha: hoy,
    metodoPago: medio, fiado: pg.fiado,
    abonos: pg.pagos,
  };
}

/** RV-09 · Unidades a descontar del inventario por una venta (productos + materiales). */
export function unidadesDeVenta(items) {
  return cantidadesNecesarias(items);
}

/**
 * RA-01 … RA-03 · Anular una venta (anularVenta, L3649–3663): devuelve unidades y materiales al stock (solo productos
 * que existen y controlan stock) y registra movimientos "devolucion". La venta se borra; no se registra devolución de
 * dinero (comportamiento actual; D4-08, decisión 5 pendiente).
 * @returns {{ ventas: Array, inventario: Array, movimientos: Array }}  movimientos = solo los nuevos
 */
export function anularVenta(venta, { ventas, inventario }, { hoy, ahora, nuevoId }) {
  let inv = inventario;
  const nuevos = [];
  const motivo = `Venta anulada · ${venta.clienteNombre}`;
  (venta.items || []).forEach((it) => {
    const cant = num(it.cantidad);
    (it.materiales || []).forEach((m) => {
      const mp = inv.find((x) => x.id === m.productoId);
      if (!mp) return;
      const dev = num(m.cantidad) * cant;
      if (tieneControlStock(mp)) inv = inv.map((x) => (x.id === mp.id ? { ...x, stock: Number(x.stock) + dev } : x));
      nuevos.push({ id: nuevoId(), tipo: 'devolucion', ts: ahora, productoId: mp.id, productoNombre: mp.nombre, cantidad: dev, motivo, fecha: hoy });
    });
    const p = inv.find((x) => x.id === it.productoId);
    if (!p) return;
    if (tieneControlStock(p)) inv = inv.map((x) => (x.id === p.id ? { ...x, stock: Number(x.stock) + cant } : x));
    nuevos.push({ id: nuevoId(), tipo: 'devolucion', ts: ahora, productoId: p.id, productoNombre: p.nombre, cantidad: cant, motivo, fecha: hoy });
  });
  return { ventas: ventas.filter((x) => x.id !== venta.id), inventario: inv, movimientos: nuevos };
}

/** Unidades de una venta (texto de confirmación de anulación, L3636). */
export function unidadesVendidas(venta) {
  return (venta.items || []).reduce((s, it) => s + num(it.cantidad), 0);
}

/** Lista de ventas para la pantalla: búsqueda por cliente o "f<folio>", más recientes primero (L1555–1557). */
export function filtrarVentas(ventas, termino) {
  const t = String(termino || '').trim().toLowerCase();
  return ventas.filter((v) => v.clienteNombre.toLowerCase().includes(t) || (v.folio && ('f' + v.folio).includes(t)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creadoTs || 0) - (a.creadoTs || 0));
}
