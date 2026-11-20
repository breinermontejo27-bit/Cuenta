// Abonos, saldos y créditos de ventas (Etapa 1, Documento 2 §5: RC-01 … RC-06).

import { num, sumar } from './numbers.js';
import { compararTexto } from './text.js';

/** RC-01 · Total abonado a una venta (abonadoVenta, L555). */
export function abonadoVenta(venta) {
  return sumar(venta.abonos, (a) => num(a.monto));
}

/** RC-02 · Saldo de una venta: solo las fiadas tienen saldo (saldoVenta, L556). */
export function saldoVenta(venta) {
  return venta.fiado ? Math.max(0, num(venta.total) - abonadoVenta(venta)) : 0;
}

/** RC-03 · Deuda de un cliente (clienteSaldo, L557). */
export function deudaCliente(ventas, clienteId) {
  return ventas.filter((v) => v.clienteId === clienteId).reduce((s, v) => s + saldoVenta(v), 0);
}

/** RC-03 · Total por cobrar de todas las ventas (totalPorCobrarAll, L3673). */
export function totalPorCobrar(ventas) {
  return ventas.reduce((s, v) => s + saldoVenta(v), 0);
}

/** Clientes con deuda, de mayor a menor (openCreditosAjustes, L3676). Solo clientes que existen. */
export function deudores(clientes, ventas) {
  return clientes.map((c) => ({ cliente: c, deuda: deudaCliente(ventas, c.id) }))
    .filter((x) => x.deuda > 0)
    .sort((a, b) => b.deuda - a.deuda);
}

/** Ventas con saldo de un cliente, de la más antigua a la más nueva (openCreditoCliente, L3716). */
export function ventasConSaldo(ventas, clienteId) {
  return ventas.filter((v) => v.clienteId === clienteId && saldoVenta(v) > 0).sort((a, b) => compararTexto(a.fecha, b.fecha));
}

/** Ventas fiadas de un cliente, de la más nueva a la más antigua (formulario de cliente, L1929). */
export function ventasFiadasCliente(ventas, clienteId) {
  return ventas.filter((v) => v.clienteId === clienteId && v.fiado).sort((a, b) => compararTexto(b.fecha, a.fecha));
}

/**
 * RC-04 · Abono a una venta a crédito (openAbonoForm, L602–616).
 * El monto se limita en silencio al saldo; un monto ≤ 0 no se acepta.
 * @returns {{ ok: false } | { ok: true, venta: Object }}
 */
export function abonarVenta(venta, { monto, fecha, nota, metodo }, { hoy, nuevoId }) {
  const montoFinal = Math.min(num(monto), saldoVenta(venta));
  if (montoFinal <= 0) return { ok: false };
  return {
    ok: true,
    venta: { ...venta, abonos: [...(venta.abonos || []), { id: nuevoId(), fecha: fecha || hoy, monto: montoFinal, nota: String(nota || '').trim(), metodo }] },
  };
}

/**
 * RC-05 · Liquidar la deuda de un cliente: un abono por el saldo de cada venta fiada (L3772–3779).
 * @returns {Array} lista de ventas nueva
 */
export function liquidarDeuda(ventas, clienteId, metodo, { hoy, nuevoId }) {
  return ventas.map((x) => {
    if (x.clienteId !== clienteId || !x.fiado) return x;
    const saldo = saldoVenta(x);
    if (saldo <= 0) return x;
    return { ...x, abonos: [...(x.abonos || []), { id: nuevoId(), fecha: hoy, monto: saldo, nota: 'Liquidación', metodo }] };
  });
}
