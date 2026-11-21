// Caja, flujo de dinero y ganancia (Etapa 1, Documento 2 §10–12: RK-01 … RK-07, RL-01 … RL-03, RR-01 … RR-04).
// Criterio de caja: el dinero cuenta el día que se recibe (abonos), no el día de la venta.

import { num } from './numbers.js';
import { mesDe, mesAnterior } from './dates.js';
import { saldoVenta, totalPorCobrar } from './payments.js';
import { abonosConAnticipo, sumaPendiente } from './orders-rules.js';
import { esPocoStock, stockDe } from './inventory-rules.js';

const cuentaEnCaja = (p) => p.estado === 'pendiente' || p.estado === 'cancelado';

/**
 * RK-01 … RK-06 · Resumen de caja para un rango de fechas (cajaResumen, L1608–1643).
 * @param {{ ventas, pedidos, gastos }} datos
 * @param {(fecha: string) => boolean} enRango
 */
export function resumenCaja({ ventas, pedidos, gastos }, enRango, hoy) {
  let efectivo = 0, tarjeta = 0, abonosCred = 0;
  ventas.forEach((x) => {
    (x.abonos || []).forEach((a) => {
      if (!enRango(a.fecha)) return;
      const monto = num(a.monto);
      if (a.metodo === 'tarjeta') tarjeta += monto; else efectivo += monto;
      if (x.fiado) abonosCred += monto;
    });
    if (enRango(x.fecha) && !x.fiado && !(x.abonos && x.abonos.length)) efectivo += num(x.total); // RK-02
  });
  pedidos.forEach((p) => {
    if (!cuentaEnCaja(p)) return;
    abonosConAnticipo(p, hoy).forEach((a) => {
      if (!enRango(a.fecha)) return;
      const monto = num(a.monto);
      if (a.metodo === 'tarjeta') tarjeta += monto; else efectivo += monto;
    });
  });
  const ventasTot = ventas.filter((x) => enRango(x.fecha)).reduce((s, x) => s + num(x.total), 0);
  const creditoNuevo = ventas.filter((x) => x.fiado && enRango(x.fecha)).reduce((s, x) => s + num(x.total), 0);
  const gs = gastos.filter((g) => enRango(g.fecha));
  const gastosTot = gs.reduce((s, g) => s + num(g.monto), 0);
  const gastosEf = gs.filter((g) => (g.metodo || 'efectivo') === 'efectivo').reduce((s, g) => s + num(g.monto), 0);
  const gastosTj = gastosTot - gastosEf;
  const compras = gs.filter((g) => g.tipo === 'compra').reduce((s, g) => s + num(g.monto), 0);
  const ingresos = efectivo + tarjeta;
  return {
    efectivo, tarjeta, ingresos, abonosCred, ventasTot, creditoNuevo,
    gastosTot, compras, otros: gastosTot - compras,
    neto: ingresos - gastosTot, efectivoCaja: efectivo - gastosEf, tarjetaCaja: tarjeta - gastosTj,
  };
}

/** Rango de un día (para resumenCaja). */
export const rangoDia = (dia) => (f) => f === dia;
/** Rango de un mes AAAA-MM (para resumenCaja). */
export const rangoMes = (mes) => (f) => mesDe(f) === mes;

/**
 * Movimientos de caja de un día, en el orden de la versión original (L1655–1671). Datos sin formato:
 * tipo 'venta' | 'abono-credito' | 'venta-anterior' | 'abono-pendiente' | 'gasto'.
 */
export function movimientosDelDia({ ventas, pedidos, gastos }, dia, hoy) {
  const movs = [];
  ventas.forEach((x) => {
    (x.abonos || []).forEach((a) => {
      if (a.fecha !== dia) return;
      movs.push({ ingreso: true, tipo: x.fiado ? 'abono-credito' : 'venta', cliente: x.clienteNombre || '', folio: x.folio || null, metodo: a.metodo, monto: num(a.monto) });
    });
    if (x.fecha === dia && !x.fiado && !(x.abonos && x.abonos.length)) movs.push({ ingreso: true, tipo: 'venta-anterior', cliente: x.clienteNombre || '', folio: x.folio || null, metodo: 'efectivo', monto: num(x.total) });
  });
  pedidos.forEach((p) => {
    if (!cuentaEnCaja(p)) return;
    abonosConAnticipo(p, hoy).forEach((a) => {
      if (a.fecha !== dia) return;
      movs.push({ ingreso: true, tipo: 'abono-pendiente', tipoPendiente: p.tipo === 'apartado' ? 'apartado' : p.tipo === 'encargo' ? 'encargo' : 'pedido', cancelado: p.estado === 'cancelado', cliente: p.clienteNombre || '', metodo: a.metodo, monto: num(a.monto) });
    });
  });
  gastos.forEach((g) => { if (g.fecha === dia) movs.push({ ingreso: false, tipo: 'gasto', categoria: g.categoria || '', descripcion: g.descripcion || 'Gasto', metodo: g.metodo || 'efectivo', monto: num(g.monto) }); });
  return movs;
}

/** Días de un mes con ventas, abonos de ventas o gastos (cierre de cada día, L1683–1689). */
export function diasConMovimiento({ ventas, gastos }, mes) {
  const dias = new Set();
  ventas.forEach((x) => {
    if (mesDe(x.fecha) === mes) dias.add(x.fecha);
    (x.abonos || []).forEach((a) => { if (mesDe(a.fecha) === mes) dias.add(a.fecha); });
  });
  gastos.forEach((g) => { if (mesDe(g.fecha) === mes) dias.add(g.fecha); });
  return Array.from(dias).sort();
}

/**
 * RL-01 … RL-03 · Flujo: dinero disponible, por cobrar y acumulado por mes (renderFlujoHtml, L1742–1761).
 * Por cobrar de pendientes usa la suma sin descuento ni impuesto (provisional, D4-02).
 */
export function flujo(datos, hoy) {
  const { ventas, pedidos, gastos } = datos;
  const todo = resumenCaja(datos, () => true, hoy);
  const porCredito = ventas.reduce((s, v) => s + saldoVenta(v), 0);
  const porPedidos = pedidos.filter((p) => p.estado === 'pendiente').reduce((s, p) => {
    const total = sumaPendiente(p);
    const abonado = (p.abonos && p.abonos.length) ? p.abonos.reduce((a, x) => a + num(x.monto), 0) : num(p.anticipo);
    return s + Math.max(0, total - abonado);
  }, 0);
  const meses = new Set();
  ventas.forEach((v) => { if (v.fecha) meses.add(mesDe(v.fecha)); (v.abonos || []).forEach((a) => a.fecha && meses.add(mesDe(a.fecha))); });
  pedidos.forEach((p) => (p.abonos || []).forEach((a) => a.fecha && meses.add(mesDe(a.fecha))));
  gastos.forEach((g) => g.fecha && meses.add(mesDe(g.fecha)));
  let acum = 0;
  const filas = [...meses].sort().map((m) => {
    const C = resumenCaja(datos, rangoMes(m), hoy);
    acum += C.ingresos - C.gastosTot;
    return { mes: m, entradas: C.ingresos, salidas: C.gastosTot, acumulado: acum, efectivo: C.efectivoCaja, tarjeta: C.tarjetaCaja };
  });
  return { disponible: todo.efectivoCaja + todo.tarjetaCaja, efectivo: todo.efectivoCaja, tarjeta: todo.tarjetaCaja, porCredito, porPedidos, porCobrar: porCredito + porPedidos, filas };
}

/**
 * RR-02 · Ganancia = ventas − costo de lo vendido − otros gastos (gananciaDe, L1804).
 * Conserva el comportamiento actual: "ventas" usa el total CON impuesto (D4-05, decisión 3 pendiente).
 */
export function gananciaDe(ventas, gastos) {
  const ventasTot = ventas.reduce((s, v) => s + num(v.total), 0);
  const costo = ventas.reduce((s, v) => s + num(v.costoTotal), 0);
  const gastosTot = gastos.reduce((s, g) => s + num(g.monto), 0);
  const compras = gastos.filter((g) => g.tipo === 'compra').reduce((s, g) => s + num(g.monto), 0);
  const otros = gastosTot - compras;
  return { ventasTot, costo, gastosTot, compras, otros, ganancia: ventasTot - costo - otros };
}

/** RR-04 · Los 5 productos más vendidos por unidades, agrupados por nombre (L1840–1842). */
export function masVendidos(ventas, cantidad = 5) {
  const contador = {};
  ventas.forEach((v) => (v.items || []).forEach((it) => { contador[it.nombre] = (contador[it.nombre] || 0) + it.cantidad; }));
  return Object.entries(contador).sort((a, b) => b[1] - a[1]).slice(0, cantidad);
}

/**
 * RR-01 … RR-04 · Resumen de Reportes (renderReportes, L1824–1853).
 * @param {'mes'|'anterior'|'todo'} periodo
 */
export function resumenReportes({ ventas, gastos, inventario }, periodo, ajustes, hoy) {
  const hoyKey = mesDe(hoy);
  const prevKey = mesAnterior(hoy);
  const clave = periodo === 'mes' ? hoyKey : prevKey;
  const ventasP = periodo === 'todo' ? ventas : ventas.filter((v) => mesDe(v.fecha) === clave);
  const gastosP = periodo === 'todo' ? gastos : gastos.filter((g) => mesDe(g.fecha) === clave);
  const P = gananciaDe(ventasP, gastosP);
  const prev = gananciaDe(ventas.filter((v) => mesDe(v.fecha) === prevKey), gastos.filter((g) => mesDe(g.fecha) === prevKey));
  let comparacion = null;
  if (periodo === 'mes') comparacion = (prev.ventasTot === 0 && prev.gastosTot === 0) ? { sinDatos: true } : { sinDatos: false, diferencia: P.ganancia - prev.ganancia };
  return {
    periodo: P, historico: gananciaDe(ventas, gastos), comparacion,
    porCobrar: totalPorCobrar(ventas),
    valorInventario: inventario.reduce((s, p) => s + (stockDe(p) || 0) * num(p.costo), 0),
    pocoStock: inventario.filter((p) => esPocoStock(p, ajustes)).length,
    masVendidos: masVendidos(ventasP),
  };
}
