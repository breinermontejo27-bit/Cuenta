// Inventario: stock, poco stock, reservas, costo promedio, precio y ganancia, compras, historial
// (Etapa 1, Documento 2 §3: RI-01 … RI-17). Funciones puras: reciben los datos y devuelven resultados nuevos.

import { num } from './numbers.js';

/** RI-01 · ¿El producto controla stock? (stock vacío = sin control; ver "diferencias de borde" en la documentación). */
export function tieneControlStock(p) {
  return !!p && p.stock !== '' && p.stock !== null && p.stock !== undefined;
}

/** Stock como número, o null si no tiene control. */
export function stockDe(p) {
  return tieneControlStock(p) ? Number(p.stock) : null;
}

/** Categorías distintas, en orden alfabético (getCategorias, L645). */
export function categorias(inventario) {
  const set = new Set();
  inventario.forEach((p) => { if (p.categoria) set.add(p.categoria); });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** RI-04 · Límite de poco stock del producto, o null si no avisa (umbralStock, L709). */
export function umbralStock(p, ajustes) {
  if (p.sinAlerta) return null;
  const u = p.stockMinimo;
  return (u === '' || u === undefined || u === null) ? (num(ajustes.stockMinimo)) : Number(u);
}

/** RI-04 · ¿Está en poco stock? (esPocoStock, L714). */
export function esPocoStock(p, ajustes) {
  const st = stockDe(p);
  const um = umbralStock(p, ajustes);
  return st !== null && um !== null && st <= um;
}

/** Productos en poco stock (de menor a mayor stock) y productos sin aviso (openPocoStock, L724–725). */
export function pocoStock(inventario, ajustes) {
  return {
    bajos: inventario.filter((p) => esPocoStock(p, ajustes)).sort((a, b) => Number(a.stock) - Number(b.stock)),
    sinAviso: inventario.filter((p) => p.sinAlerta),
  };
}

// ---------------- Reservas por pendientes (RI-13, RI-14) ----------------

/** Unidades de un producto que un ítem de pendiente usa (el producto mismo y como material). */
function unidadesEnItem(it, productoId, contarProducto) {
  let u = 0;
  if (contarProducto && it.productoId === productoId) u += num(it.cantidad);
  (it.materiales || []).forEach((m) => { if (m.productoId === productoId) u += num(m.cantidad) * num(it.cantidad); });
  return u;
}

/** RI-13 · Reservado por pedidos y apartados pendientes (y por materiales de cualquier pendiente) (L850). */
export function reservadoSinEncargos(pedidos, productoId) {
  return pedidos.filter((p) => p.estado === 'pendiente')
    .reduce((s, p) => s + p.items.reduce((a, it) => a + unidadesEnItem(it, productoId, p.tipo !== 'encargo'), 0), 0);
}

/** RI-14 · Un encargo aparta sus unidades solo si el stock libre alcanza, por orden de creación (L861). */
export function reservadoPorEncargos(pedidos, inventario, productoId) {
  const prod = inventario.find((x) => x.id === productoId);
  if (!tieneControlStock(prod)) return 0;
  let libre = num(prod.stock) - reservadoSinEncargos(pedidos, productoId);
  const encargos = pedidos.filter((p) => p.estado === 'pendiente' && p.tipo === 'encargo')
    .sort((a, b) => (a.creadoTs || 0) - (b.creadoTs || 0));
  let total = 0;
  for (const p of encargos) {
    const q = p.items.reduce((s, it) => s + (it.productoId === productoId ? num(it.cantidad) : 0), 0);
    if (q <= 0) continue;
    if (q > libre) break;
    total += q;
    libre -= q;
  }
  return total;
}

/** RI-13 + RI-14 · Unidades reservadas de un producto (unidadesReservadas, L878). */
export function unidadesReservadas(pedidos, inventario, productoId) {
  return reservadoPorEncargos(pedidos, inventario, productoId) + reservadoSinEncargos(pedidos, productoId);
}

/** RI-15 · Disponible para vender: stock − reservadas, o Infinity sin control de stock (stockMax, L2621). */
export function disponible(pedidos, inventario, productoId) {
  const p = inventario.find((x) => x.id === productoId);
  if (!tieneControlStock(p)) return Infinity;
  return Math.max(0, num(p.stock) - unidadesReservadas(pedidos, inventario, productoId));
}

/** Mensaje cuando no alcanza el disponible (sinStockMsg, L2626). */
export function mensajeSinStock(nombre, max) {
  return max <= 0 ? `${nombre} no tiene stock disponible (puede estar reservado para pedidos).` : `Solo tienes ${max} unid. disponibles de ${nombre} (el resto está reservado para pedidos).`;
}

/**
 * Unidades que necesitan unos ítems, por producto: el producto mismo + cada material × cantidad de prendas.
 * @param {Array<{productoId, cantidad, materiales?}>} items
 * @returns {Object<string, number>}
 */
export function cantidadesNecesarias(items) {
  const need = {};
  items.forEach((it) => {
    if (it.productoId) need[it.productoId] = (need[it.productoId] || 0) + num(it.cantidad);
    (it.materiales || []).forEach((m) => { need[m.productoId] = (need[m.productoId] || 0) + num(m.cantidad) * num(it.cantidad); });
  });
  return need;
}

/** RI-16 · Valida que alcance el disponible para los materiales (validarMateriales, L3057). Devuelve '' o el mensaje. */
export function validarMateriales(items, pedidos, inventario) {
  const need = {};
  items.forEach((it) => {
    if (it.productoId) need[it.productoId] = (need[it.productoId] || 0) + it.cantidad;
    (it.materiales || []).forEach((m) => { need[m.productoId] = (need[m.productoId] || 0) + m.cantidad * it.cantidad; });
  });
  for (const id of Object.keys(need)) {
    const pr = inventario.find((x) => x.id === id);
    const max = disponible(pedidos, inventario, id);
    if (pr && max !== Infinity && need[id] > max) return `No hay suficiente ${pr.nombre}. Disponibles: ${max}, necesitas: ${need[id]}.`;
  }
  return '';
}

/**
 * Descuenta unidades del stock (venta L3155–3163 y entrega L1215–1219). Nunca baja de 0; sin control de stock no cambia.
 * @param {Object<string, number>} cantidades  producto → unidades
 */
export function descontarStock(inventario, cantidades) {
  return inventario.map((x) => {
    const cant = cantidades[x.id];
    if (!cant || !tieneControlStock(x)) return x;
    return { ...x, stock: Math.max(0, Number(x.stock) - cant) };
  });
}

// ---------------- Precio, ganancia y costo (RI-02, RI-07 … RI-10) ----------------

/**
 * RI-02 · Precio sugerido desde costo y ganancia % (2 decimales). null si no aplica.
 * Formulario de producto (L2081): exige ganancia distinta de 0. Formularios de compra (L2229, L2481): no la exigen.
 */
export function precioDesdeMargen(costo, margen, { exigirMargen = true } = {}) {
  if (!(num(costo) > 0) || (exigirMargen && num(margen) === 0)) return null;
  return Number((num(costo) * (1 + num(margen) / 100)).toFixed(2));
}

/** RI-02 · Ganancia % desde costo y precio (redondeada). null si no hay costo (L2084). */
export function margenDesdePrecio(costo, precio) {
  return num(costo) > 0 ? Math.round(((num(precio) - num(costo)) / num(costo)) * 100) : null;
}

/** Ganancia por unidad y % sobre el costo, como en la lista de productos (L815–817). null si no hay costo. */
export function gananciaUnitaria(p) {
  const costo = num(p.costo);
  if (!(costo > 0)) return null;
  const ganancia = p.precio - costo;
  return { ganancia, porcentaje: Math.round((ganancia / costo) * 100) };
}

/** RI-07 · Costo promedio ponderado tras una compra (calcularNuevoCosto, L2205). */
export function costoPromedio(stockActual, costoActual, cantidad, costoCompra) {
  if (stockActual > 0 && costoActual > 0) return ((stockActual * costoActual) + (cantidad * costoCompra)) / (stockActual + cantidad);
  return costoCompra || costoActual;
}

/**
 * RI-07 … RI-10 · Compra registrada desde el PRODUCTO (openCompraForm, L2249–2268).
 * Conserva el comportamiento actual: el gasto no lleva tipo, medio, producto ni cantidad (D4-01, decisión 4 pendiente).
 * @returns {{ ok: false } | { ok: true, producto: Object, gasto: Object }}
 */
export function compraDesdeProducto(p, { cantidad, costoUnitario, fecha, precioNuevo, margenNuevo }, { hoy, nuevoId }) {
  const cant = num(cantidad);
  const costoCompra = num(costoUnitario);
  if (cant <= 0) return { ok: false };
  const stockActual = tieneControlStock(p) ? Number(p.stock) : 0;
  const costoActual = num(p.costo);
  const producto = {
    ...p,
    stock: stockActual + cant,
    costo: costoPromedio(stockActual, costoActual, cant, costoCompra),
    precio: num(precioNuevo) || p.precio || 0,
    margen: num(margenNuevo),
  };
  const gasto = { id: nuevoId(), descripcion: `Compra de inventario: ${p.nombre} x${cant}`, monto: cant * costoCompra, fecha: fecha || hoy, categoria: 'Inventario' };
  return { ok: true, producto, gasto };
}

/**
 * RI-07 … RI-10, RG-08 · Compra registrada desde GASTOS, de un producto existente o nuevo (L2531–2580).
 * @param {Object|null} p  producto existente, o null para crear uno nuevo con `nombreNuevo`
 * @returns {{ ok: false, campo: string } | { ok: true, producto: Object, esNuevo: boolean, gasto: Object, movimiento: Object|null }}
 */
export function compraDesdeGastos(p, { nombreNuevo, cantidad, costoUnitario, fecha, precioNuevo, margenNuevo, metodo }, { hoy, ahora, nuevoId }) {
  const cant = num(cantidad);
  const costoCompra = num(costoUnitario);
  if (cant <= 0) return { ok: false, campo: 'cantidad' };
  const nombre = p ? p.nombre : String(nombreNuevo || '').trim();
  if (!p && !nombre) return { ok: false, campo: 'nombreNuevo' };
  const precioFinal = num(precioNuevo) || costoCompra || 0;
  const margenFinal = num(margenNuevo);
  let producto, movimiento = null;
  if (!p) {
    producto = { id: nuevoId(), nombre, categoria: '', costo: costoCompra, margen: margenFinal, precio: precioFinal, stock: cant };
    movimiento = { id: nuevoId(), tipo: 'alta', ts: ahora, productoId: producto.id, productoNombre: nombre, stockNuevo: cant, motivo: 'Creado desde una compra', fecha: hoy };
  } else {
    const stockActual = tieneControlStock(p) ? Number(p.stock) : 0;
    producto = { ...p, stock: stockActual + cant, costo: costoPromedio(stockActual, num(p.costo), cant, costoCompra), precio: precioFinal, margen: margenFinal };
  }
  const gasto = {
    id: nuevoId(), tipo: 'compra', metodo, productoId: producto.id, cantidad: cant,
    descripcion: `Compra de inventario: ${nombre} x${cant}`, monto: cant * costoCompra, fecha: fecha || hoy, categoria: 'Inventario',
  };
  return { ok: true, producto, esNuevo: !p, gasto, movimiento };
}

// ---------------- Alta, edición y baja de productos (RI-05, RI-06) ----------------

/**
 * Guarda un producto desde su formulario (L2107–2144). Los valores del formulario llegan como texto.
 * @returns {{ ok: false, campo: 'nombre' } | { ok: true, producto: Object, movimiento: Object|null }}
 */
export function guardarProducto(anterior, f, { hoy, ahora, nuevoId }) {
  const nombre = String(f.nombre || '').trim();
  if (!nombre) return { ok: false, campo: 'nombre' };
  const producto = {
    id: anterior ? anterior.id : nuevoId(),
    nombre,
    categoria: String(f.categoria || '').trim(),
    descripcion: String(f.descripcion || '').trim(),
    costo: f.costo === '' ? 0 : Number(f.costo),
    margen: f.margen === '' ? 0 : Number(f.margen),
    precio: f.precio === '' ? 0 : Number(f.precio),
    stock: f.stock === '' ? '' : Number(f.stock),
    foto: f.foto || '',
    stockMinimo: f.stockMinimo === '' ? '' : Number(f.stockMinimo),
    sinAlerta: !!f.sinAlerta,
  };
  let movimiento = null;
  if (anterior) {
    const stockOriginal = (anterior.stock !== '' && anterior.stock !== null) ? Number(anterior.stock) : null;
    const stockAnterior = stockOriginal === null ? 0 : stockOriginal;
    const stockNuevo = f.stock === '' ? 0 : Number(f.stock);
    if (stockAnterior !== stockNuevo) {
      movimiento = { id: nuevoId(), tipo: 'ajuste', ts: ahora, productoId: producto.id, productoNombre: nombre, stockAnterior, stockNuevo, motivo: String(f.motivo || '').trim(), fecha: hoy };
    }
  } else {
    movimiento = { id: nuevoId(), tipo: 'alta', ts: ahora, productoId: producto.id, productoNombre: nombre, stockNuevo: producto.stock === '' ? '' : producto.stock, fecha: hoy };
  }
  return { ok: true, producto, movimiento };
}

/** RI-06 · Movimiento de baja al eliminar un producto (L2161). */
export function movimientoBaja(p, { hoy, ahora, nuevoId }) {
  return { id: nuevoId(), tipo: 'baja', ts: ahora, productoId: p.id, productoNombre: p.nombre, stockAnterior: p.stock, fecha: hoy };
}

/** Historial de compras de un producto (L1999–2002). */
export function comprasDeProducto(p, gastos, ventas) {
  const compras = gastos.filter((g) => g.tipo === 'compra' && g.productoId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const unidades = compras.reduce((s, g) => s + num(g.cantidad), 0);
  const invertido = compras.reduce((s, g) => s + num(g.monto), 0);
  const vendidas = ventas.reduce((s, v) => s + (v.items || []).filter((it) => it.productoId === p.id).reduce((a, it) => a + num(it.cantidad), 0), 0);
  return { compras, unidades, invertido, costoPromedio: unidades ? invertido / unidades : 0, vendidas };
}

// ---------------- Resumen de stock e historial (RI-11, RI-12) ----------------

/** RI-11 · Resumen de stock (renderStockHtml, L749–760). */
export function resumenStock(inventario, pedidos, ajustes) {
  const enStock = (p) => ((p.stock === '' || p.stock === null) ? null : Number(p.stock));
  const reservadas = (p) => unidadesReservadas(pedidos, inventario, p.id);
  return {
    productos: inventario.length,
    unidades: inventario.reduce((s, p) => s + (enStock(p) || 0), 0),
    valorCosto: inventario.reduce((s, p) => s + (enStock(p) || 0) * num(p.costo), 0),
    valorVenta: inventario.reduce((s, p) => s + (enStock(p) || 0) * num(p.precio), 0),
    sinControl: inventario.filter((p) => enStock(p) === null).length,
    reservadas: inventario.reduce((s, p) => s + reservadas(p), 0),
    bajos: inventario.filter((p) => esPocoStock(p, ajustes)).length,
    detalle: inventario.map((p) => ({ producto: p, stock: enStock(p), valor: (enStock(p) || 0) * num(p.costo), reservadas: reservadas(p) }))
      .sort((a, b) => b.valor - a.valor),
  };
}

/**
 * RI-12 · Historial de inventario: ventas (−), compras (+), ajustes, altas, bajas y devoluciones (movimientosInventario, L655).
 * Devuelve datos; el texto lo arma la pantalla.
 */
export function historialInventario(ventas, gastos, movimientos, inventario) {
  const ev = [];
  ventas.forEach((v) => (v.items || []).forEach((it) => ev.push({
    tipo: 'venta', fecha: v.fecha, ts: v.creadoTs || 0, nombre: it.nombre, cantidad: num(it.cantidad),
    cliente: v.clienteNombre, folio: v.folio || null, precio: it.precio,
  })));
  gastos.filter((g) => g.tipo === 'compra').forEach((g) => {
    const prod = inventario.find((p) => p.id === g.productoId);
    ev.push({ tipo: 'compra', fecha: g.fecha, ts: 0, nombre: prod ? prod.nombre : (g.descripcion || 'Producto'), cantidad: num(g.cantidad), unitario: g.cantidad ? g.monto / g.cantidad : 0, total: g.monto });
  });
  movimientos.forEach((m) => {
    const tipo = m.tipo || 'ajuste';
    ev.push({ tipo, fecha: m.fecha, ts: m.ts || 0, nombre: m.productoNombre || m.nombre || 'Producto', stockAnterior: m.stockAnterior, stockNuevo: m.stockNuevo, cantidad: m.cantidad, motivo: m.motivo || '' });
  });
  return ev.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.ts - a.ts);
}

/** Variación de unidades que muestra el historial para cada evento (qty, L691–698). */
export function variacionHistorial(e) {
  if (e.tipo === 'venta') return { texto: `-${e.cantidad}`, signo: 'neg' };
  if (e.tipo === 'devolucion' || e.tipo === 'compra') return { texto: `+${e.cantidad}`, signo: 'pos' };
  if (e.tipo === 'ajuste') { const d = num(e.stockNuevo) - num(e.stockAnterior); return { texto: `${d > 0 ? '+' : ''}${d}`, signo: d >= 0 ? 'pos' : 'neg' }; }
  if (e.tipo === 'alta') return { texto: (e.stockNuevo !== undefined && e.stockNuevo !== '') ? `Stock ${e.stockNuevo}` : '', signo: '' };
  return { texto: '', signo: 'neg' };
}
