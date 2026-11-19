// Pendientes: pedidos, encargos y apartados (Etapa 1, Documento 2 §6: RP-01 … RP-17).
//
// ATENCIÓN · Total de un pendiente (D4-02, decisión 1 pendiente): la versión original lo calcula de TRES formas
// según la pantalla. Se conservan las tres, con nombre propio, hasta que el dueño decida:
//   totalFormularioPendiente()  → formulario y entrega: (suma − descuento %) × (1 + impuesto %)
//   totalApartado()             → apartados en lista y detalle: suma × (1 + impuesto %), sin descuento
//   sumaPendiente()             → pedidos/encargos en lista, detalle, abono, cancelación y flujo: suma sin descuento ni impuesto

import { num, sumar, limitar } from './numbers.js';
import { cantidadesNecesarias, descontarStock, tieneControlStock } from './inventory-rules.js';

/** Nombre de cada tipo de pendiente en los textos. */
export const NOMBRE_TIPO = Object.freeze({ pedido: 'pedido', encargo: 'encargo', apartado: 'apartado' });

/** Tipo de un pendiente (sin tipo = pedido, como en la versión original). */
export function tipoDe(p) {
  return p.tipo || 'pedido';
}

/** RP-05 · Suma de productos de un pendiente, sin descuento ni impuesto (provisional, ver arriba). */
export function sumaPendiente(p) {
  return sumar(p.items, (it) => num(it.precio) * num(it.cantidad));
}

/** RP-06 · Total de un apartado: suma × (1 + impuesto %), sin descuento (apartadoTotal, L1422; provisional). */
export function totalApartado(p, impuestoPct) {
  return sumaPendiente(p) * (1 + num(impuestoPct) / 100);
}

/** Total abonado según la lista de abonos (apartadoAbonado, L1426). */
export function abonadoPendiente(p) {
  return sumar(p.abonos, (a) => num(a.monto));
}

/**
 * RP-04 · Resumen del formulario: subtotal, descuento %, total con impuesto, anticipo (limitado al total) y saldo (L1071–1079).
 */
export function totalFormularioPendiente(items, descuentoPctEscrito, impuestoPct, anticipoEscrito) {
  const sub = items.reduce((s, it) => s + num(it.precio) * num(it.cantidad), 0);
  const pct = limitar(num(descuentoPctEscrito), 0, 100);
  const desc = sub * pct / 100;
  const base = sub - desc;
  const total = base + base * num(impuestoPct) / 100;
  const ant = Math.min(num(anticipoEscrito), total);
  return { sub, pct, desc, total, ant, saldo: total - ant };
}

/**
 * Abonos de un pendiente; si no tiene lista pero sí anticipo, el anticipo cuenta como un abono en efectivo
 * en su fecha (patrón repetido en la versión original: L1267, L1623, L1668).
 */
export function abonosConAnticipo(p, hoy) {
  if (p.abonos && p.abonos.length) return p.abonos;
  return num(p.anticipo) > 0 ? [{ fecha: p.fechaAnticipo || hoy, monto: Number(p.anticipo), metodo: 'efectivo' }] : [];
}

/** RP-01 · Estado de un pedido según su fecha de entrega (pedidoEstadoInfo, L896). */
export function estadoPorFecha(p, hoy) {
  if (!p.fechaEntrega) return 'sin-fecha';
  if (p.fechaEntrega < hoy) return 'vencido';
  if (p.fechaEntrega === hoy) return 'hoy';
  return 'proximo';
}

/** RP-02 · Pendientes agrupados y ordenados como en la lista (renderPedidosHtml, L921–943). */
export function agruparPendientes(pedidos, hoy, termino = '') {
  const t = String(termino).trim().toLowerCase();
  const todos = pedidos.filter((p) => p.estado === 'pendiente');
  const activos = todos.filter((p) => p.clienteNombre.toLowerCase().includes(t));
  const porCreado = (a, b) => (a.creadoTs || 0) - (b.creadoTs || 0);
  const porFecha = (a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega) || porCreado(a, b);
  const ped = activos.filter((p) => tipoDe(p) === 'pedido');
  const enc = activos.filter((p) => p.tipo === 'encargo');
  const apa = activos.filter((p) => p.tipo === 'apartado');
  const conFecha = ped.filter((p) => p.fechaEntrega).sort(porFecha);
  return {
    hayPendientes: todos.length > 0,
    hayResultados: activos.length > 0,
    pedidos: { total: ped.length, vencidos: conFecha.filter((p) => p.fechaEntrega < hoy), hoy: conFecha.filter((p) => p.fechaEntrega === hoy), proximos: conFecha.filter((p) => p.fechaEntrega > hoy) },
    encargos: { total: enc.length, conFecha: enc.filter((p) => p.fechaEntrega).sort(porFecha), sinFecha: enc.filter((p) => !p.fechaEntrega).sort(porCreado) },
    apartados: { total: apa.length, lista: apa.slice().sort(porCreado) },
  };
}

/** Saldo que muestra el detalle de un pedido/encargo: suma − anticipo (L1369; provisional, D4-02). */
export function saldoDetallePendiente(p) {
  return Math.max(0, sumaPendiente(p) - num(p.anticipo));
}

/** RP-10 · Costo de un pendiente: costo actual del producto, o el escrito si no está en inventario (costoPedido, L1145). */
export function costoPendiente(p, inventario) {
  return p.items.reduce((s, it) => {
    const prod = inventario.find((x) => x.id === it.productoId);
    const c = prod ? num(prod.costo) : num(it.costo);
    return s + c * num(it.cantidad);
  }, 0);
}

// ---------------- Crear y editar (RP-03) ----------------

/** Ítem agregado en el formulario de pendientes (L1086–1099). El producto se busca por nombre exacto (sin mayúsculas). */
export function itemDeFormulario({ nombre, cantidad, precio, caracteristicas, costo }, inventario) {
  const n = String(nombre || '').trim();
  const cant = num(cantidad);
  if (!n) return { ok: false, campo: 'nombre' };
  if (cant <= 0) return { ok: false, campo: 'cantidad' };
  const prod = inventario.find((x) => x.nombre.toLowerCase() === n.toLowerCase());
  return {
    ok: true,
    item: { productoId: prod ? prod.id : null, nombre: prod ? prod.nombre : n, cantidad: cant, precio: num(precio), caracteristicas: String(caracteristicas || '').trim() || (prod && prod.descripcion) || '', costo: num(costo) },
  };
}

/**
 * RP-03 · Guarda un pendiente desde su formulario (L1110–1135). Conserva el comportamiento actual: al editar, si ya tiene
 * abonos se conservan y `anticipo` toma el valor escrito (D4-09).
 */
export function guardarPendienteFormulario(anterior, { tipoNuevo, cliente, fecha, items, anticipo, metodoAnticipo, descuentoPct, fechaAnticipo, notas }, { hoy, ahora, nuevoId }) {
  const tipo = anterior ? tipoDe(anterior) : (tipoNuevo || 'pedido');
  const esApartado = tipo === 'apartado', esEncargo = tipo === 'encargo';
  if (!cliente) return { ok: false, campo: 'cliente' };
  if (!fecha && !esApartado && !esEncargo) return { ok: false, campo: 'fecha' };
  if (items.length === 0) return { ok: false, campo: 'items' };
  const antVal = num(anticipo);
  const met = metodoAnticipo || 'efectivo';
  const fechaAnt = fechaAnticipo || hoy;
  const abonos = (anterior && anterior.abonos && anterior.abonos.length) ? anterior.abonos
    : (antVal > 0 ? [{ id: nuevoId(), fecha: fechaAnt, monto: antVal, metodo: met, nota: tipo === 'apartado' ? 'Abono inicial' : 'Anticipo' }] : []);
  return {
    ok: true,
    pendiente: {
      id: anterior ? anterior.id : nuevoId(),
      clienteId: cliente.id, clienteNombre: cliente.nombre,
      fechaEntrega: esApartado ? '' : fecha,
      tipo, abonos, anticipo: antVal, anticipoMetodo: met,
      descuentoPct: limitar(num(descuentoPct), 0, 100),
      fechaAnticipo: fechaAnt, items, notas: String(notas || '').trim(),
      estado: 'pendiente',
      creadoTs: anterior ? (anterior.creadoTs || ahora) : ahora,
    },
  };
}

/**
 * Pendiente creado desde el asistente de venta (guardarPendiente, L2720–2736). Conserva el comportamiento actual:
 * no guarda el descuento del asistente (D4-03, decisión 2 pendiente).
 */
export function pendienteDesdeAsistente({ tipo, cliente, carrito, fecha, anticipo, fechaAnticipo, metodo, notas }, { hoy, ahora, nuevoId }) {
  const ant = num(anticipo);
  const fechaAnt = fechaAnticipo || hoy;
  const abonos = ant > 0 ? [{ id: nuevoId(), fecha: fechaAnt, monto: ant, metodo, nota: tipo === 'apartado' ? 'Abono inicial' : 'Anticipo' }] : [];
  return {
    id: nuevoId(), clienteId: cliente.id, clienteNombre: cliente.nombre,
    tipo,
    fechaEntrega: tipo === 'apartado' ? '' : fecha,
    anticipo: tipo === 'apartado' ? abonos.reduce((s, a) => s + a.monto, 0) : ant,
    fechaAnticipo: fechaAnt,
    abonos,
    items: carrito.map((it) => ({ productoId: it.productoId, nombre: it.nombre, cantidad: it.cantidad, precio: it.precioUnit, caracteristicas: it.caracteristicas || '', foto: it.foto || '', materiales: it.materiales || [], costo: num(it.costo) })),
    notas: notas || '',
    estado: 'pendiente',
    creadoTs: ahora,
  };
}

// ---------------- Abonos (RP-07, RP-08) ----------------

/**
 * RP-07 · Abono a un pedido o encargo (registrarAbonoPedido, L1306–1342). Si aún no tenía lista de abonos, el anticipo
 * pasa a ser el primero. El saldo se calcula con la suma sin descuento ni impuesto (provisional).
 * @returns {{ ok: false, error: 'monto'|'fecha'|'mayor-que-saldo', saldo } | { ok: true, pendiente }}
 */
export function abonarPendiente(p, { monto, fecha, metodo }, { hoy, nuevoId }) {
  const total = sumaPendiente(p);
  const base = (p.abonos && p.abonos.length) ? p.abonos.slice()
    : (num(p.anticipo) > 0 ? [{ id: nuevoId(), fecha: p.fechaAnticipo || hoy, monto: Number(p.anticipo), metodo: 'efectivo', nota: 'Anticipo' }] : []);
  const saldo = Math.max(0, total - sumar(base, (a) => num(a.monto)));
  const m = num(monto);
  if (m <= 0) return { ok: false, error: 'monto', saldo };
  if (!fecha) return { ok: false, error: 'fecha', saldo };
  if (m > saldo) return { ok: false, error: 'mayor-que-saldo', saldo };
  const nuevos = [...base, { id: nuevoId(), fecha, monto: m, metodo, nota: 'Abono' }];
  return { ok: true, pendiente: { ...p, abonos: nuevos, anticipo: nuevos.reduce((s, a) => s + num(a.monto), 0) } };
}

/** RP-08 · Abono a un apartado (L1509–1516). Saldo según el total del apartado (provisional). */
export function abonarApartado(p, { monto, fecha, metodo }, { impuestoPct, nuevoId }) {
  const saldo = Math.max(0, totalApartado(p, impuestoPct) - abonadoPendiente(p));
  const m = num(monto);
  if (m <= 0) return { ok: false, error: 'monto', saldo };
  if (!fecha) return { ok: false, error: 'fecha', saldo };
  if (m > saldo) return { ok: false, error: 'mayor-que-saldo', saldo };
  const nuevos = [...(p.abonos || []), { id: nuevoId(), fecha, monto: m, metodo, nota: 'Abono' }];
  return { ok: true, pendiente: { ...p, abonos: nuevos, anticipo: nuevos.reduce((s, a) => s + num(a.monto), 0) } };
}

/** RP-09 · Saldo de un apartado; solo se entrega con saldo 0. */
export function saldoApartado(p, impuestoPct) {
  return Math.max(0, totalApartado(p, impuestoPct) - abonadoPendiente(p));
}

// ---------------- Entrega (RP-10 … RP-14) ----------------

/** RP-11 · Primer producto sin stock suficiente para entregar (no descuenta reservas de otros; D4-15). null si alcanza. */
export function faltanteParaEntregar(p, inventario) {
  const cant = cantidadesNecesarias(p.items);
  for (const pid of Object.keys(cant)) {
    const prod = inventario.find((x) => x.id === pid);
    if (prod && tieneControlStock(prod) && Number(prod.stock) < cant[pid]) return prod;
  }
  return null;
}

/**
 * RP-10, RP-12 … RP-14 · Entregar un pendiente (entregarPedido, L1164–1224): crea la venta, descuenta stock y marca
 * el pendiente como entregado. El total usa el descuento guardado y el impuesto ACTUAL de los ajustes.
 * @returns {{ ok: false, faltante } | { ok: true, venta, inventario, pendiente }}
 */
export function entregarPendiente(p, opciones, { inventario, clientes, impuestoPct, hoy, ahora, nuevoId }) {
  const faltante = faltanteParaEntregar(p, inventario);
  if (faltante) return { ok: false, faltante };
  const items = p.items.map((it) => ({ productoId: it.productoId, nombre: it.nombre, precio: num(it.precio), cantidad: num(it.cantidad), caracteristicas: it.caracteristicas || '', foto: it.foto || '', materiales: it.materiales || [] }));
  const sumaItems = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const descPct = limitar(num(p.descuentoPct), 0, 100);
  const descMonto = sumaItems * descPct / 100;
  const baseVenta = sumaItems - descMonto;
  const impuesto = baseVenta * num(impuestoPct) / 100;
  const total = baseVenta + impuesto;
  const costoTotal = costoPendiente(p, inventario);
  const anticipo = Math.min(num(p.anticipo), total);
  const saldo = total - anticipo;
  const cli = clientes.find((c) => c.id === p.clienteId) || {};
  const detalles = p.items.filter((it) => it.caracteristicas).map((it) => `${it.nombre}: ${it.caracteristicas}`);
  const pagaAhora = !!(opciones && opciones.pagaAhora) && saldo > 0;
  const metodoSaldo = (opciones && opciones.metodo) || 'efectivo';
  const quedaCredito = saldo > 0 && !pagaAhora;
  const abonosVenta = [];
  if ((p.abonos || []).length) p.abonos.forEach((a) => abonosVenta.push({ ...a, id: nuevoId() }));
  else if (anticipo > 0) abonosVenta.push({ id: nuevoId(), fecha: p.fechaAnticipo || hoy, monto: anticipo, metodo: 'efectivo', nota: 'Anticipo del pedido' });
  if (pagaAhora) abonosVenta.push({ id: nuevoId(), fecha: hoy, monto: saldo, metodo: metodoSaldo, nota: 'Pago al entregar' });
  let metodoVenta;
  if (quedaCredito) metodoVenta = 'credito';
  else if (p.tipo === 'apartado') { const mets = [...new Set(abonosVenta.map((a) => a.metodo))]; metodoVenta = mets.length > 1 ? 'mixto' : (mets[0] || 'efectivo'); }
  else if (pagaAhora && anticipo > 0 && metodoSaldo !== 'efectivo') metodoVenta = 'mixto';
  else metodoVenta = pagaAhora ? metodoSaldo : 'efectivo';
  const venta = {
    id: nuevoId(), folio: null, creadoTs: ahora,
    clienteId: p.clienteId, clienteNombre: p.clienteNombre,
    clienteDireccion: cli.direccion || '', clienteTelefono: cli.telefono || '', clienteEmail: cli.email || '',
    items, sumaItems, descuentoTipo: 'pct', descuentoPct: descPct, descuentoMonto: descMonto, subtotal: sumaItems,
    impuesto, total, costoTotal, gananciaEstimada: baseVenta - costoTotal,
    notas: [p.notas, ...detalles].filter(Boolean).join(' · '),
    fecha: hoy,
    metodoPago: metodoVenta,
    fiado: quedaCredito,
    abonos: abonosVenta,
  };
  return {
    ok: true,
    venta,
    inventario: descontarStock(inventario, cantidadesNecesarias(p.items)),
    pendiente: { ...p, estado: 'entregado' },
  };
}

// ---------------- Cancelación (RP-15) ----------------

/**
 * RP-15 · Cancelar: lo abonado se devuelve como gasto "Devolución", uno por medio de pago (L1266–1297).
 * @returns {{ pendiente, devoluciones: Array, porMedio: { efectivo, tarjeta }, total: number, sumaProductos: number }}
 */
export function cancelarPendiente(p, { hoy, nuevoId }) {
  const base = abonosConAnticipo(p, hoy);
  const porMedio = { efectivo: 0, tarjeta: 0 };
  base.forEach((a) => { porMedio[a.metodo === 'tarjeta' ? 'tarjeta' : 'efectivo'] += num(a.monto); });
  const tipoTxt = NOMBRE_TIPO[p.tipo] || 'pedido';
  const devoluciones = [];
  ['efectivo', 'tarjeta'].forEach((m) => {
    if (porMedio[m] > 0) devoluciones.push({ id: nuevoId(), tipo: 'general', metodo: m, descripcion: `Devolución por ${tipoTxt} cancelado · ${p.clienteNombre}`, monto: porMedio[m], fecha: hoy, categoria: 'Devolución' });
  });
  return {
    pendiente: { ...p, estado: 'cancelado', canceladoFecha: hoy },
    devoluciones, porMedio, total: porMedio.efectivo + porMedio.tarjeta,
    sumaProductos: (p.items || []).reduce((s, it) => s + num(it.precio) * num(it.cantidad), 0),
  };
}

// ---------------- Mensajes (WhatsApp) ----------------

/**
 * Recordatorio de un pendiente por WhatsApp (avisarPendienteWA, L1155–1160).
 * @param {{ dinero: Function, fecha: Function }} formato  funciones de formato de la pantalla
 */
export function mensajeRecordatorio(p, saldo, negocio, formato) {
  const sal = saldo > 0 ? ` Saldo pendiente: ${formato.dinero(saldo)}.` : '';
  if (p.tipo === 'apartado') return `Hola ${p.clienteNombre}, te escribimos de ${negocio} para recordarte el saldo de tu apartado.${sal} Cuando quieras lo completamos. ¡Gracias!`;
  if (p.tipo === 'encargo') return `Hola ${p.clienteNombre}, te escribimos de ${negocio}: tu encargo ya llegó.${sal} ¿Cuándo te lo podemos entregar? ¡Gracias!`;
  return `Hola ${p.clienteNombre}, te recordamos tu pedido${p.fechaEntrega ? ' para el ' + formato.fecha(p.fechaEntrega) : ''} en ${negocio}.${sal} ¡Gracias!`;
}
