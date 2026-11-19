// Reglas con valores conocidos (los mismos que se verificaron en la auditoría de la Etapa 1) y las únicas
// diferencias con la versión original, que solo ocurren con datos que la app nunca produce.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearOriginal } from './original/funciones-originales.js';
import * as V from '../../src/business/sales-rules.js';
import * as P from '../../src/business/payments.js';
import * as I from '../../src/business/inventory-rules.js';
import * as D from '../../src/business/orders-rules.js';
import * as C from '../../src/business/accounting.js';

const ctx = () => { let n = 0; return { hoy: '2026-11-19', ahora: 1, nuevoId: () => 'n' + (++n) }; };

test('R1 · crédito: 2 camisas de 100 con abono inicial de 50; abono de 70; liquidación con tarjeta', () => {
  const carrito = [{ productoId: 'p1', nombre: 'Camisa', precioCatalogo: 100, precioUnit: 100, costo: 60, cantidad: 2 }];
  const v = V.construirVenta({ cliente: { id: 'c1', nombre: 'Ana' }, carrito, descuento: { tipo: 'monto', valor: 0 }, impuestoPct: 0, notas: '', medio: 'credito', montos: { abonoInicial: 50, medioAbono: 'efectivo' } }, ctx());
  assert.deepEqual([v.total, v.fiado, v.metodoPago, P.saldoVenta(v)], [200, true, 'credito', 150]);
  const v2 = P.abonarVenta(v, { monto: 70, metodo: 'efectivo' }, ctx()).venta;
  const [v3] = P.liquidarDeuda([v2], 'c1', 'tarjeta', ctx());
  assert.deepEqual(v3.abonos.map((a) => `${a.monto}/${a.metodo}`), ['50/efectivo', '70/efectivo', '80/tarjeta']);
  assert.equal(P.saldoVenta(v3), 0);
  assert.equal(P.abonarVenta(v3, { monto: 10 }, ctx()).ok, false, 'sin saldo no se aceptan abonos');
});

test('R2 · pago mixto que no cubre el total deja el resto a crédito', () => {
  const r = V.pagosVenta('mixto', 100, { efectivo: 30, tarjeta: 50 }, ctx());
  assert.deepEqual([r.fiado, r.pagos.map((p) => `${p.monto}/${p.metodo}`).join()], [true, '30/efectivo,50/tarjeta']);
  assert.equal(V.saldoACredito('mixto', 100, { efectivo: 30, tarjeta: 50 }), 20);
  assert.equal(V.pagosVenta('mixto', 100, { efectivo: 80, tarjeta: 80 }, ctx()).pagos[1].monto, 20, 'la tarjeta se limita a lo que falta');
});

test('R5 · costo promedio ponderado: 10 a 60 + 10 a 80 = 70', () => {
  assert.equal(I.costoPromedio(10, 60, 10, 80), 70);
  assert.equal(I.costoPromedio(0, 60, 10, 80), 80, 'sin stock, el costo de la compra');
  assert.equal(I.costoPromedio(0, 60, 10, 0), 60, 'compra en 0: se conserva el costo anterior');
});

test('T9 · con impuesto 19 %, la venta gana 40 y Reportes (comportamiento conservado, decisión 3) muestra 59', () => {
  const carrito = [{ productoId: 'p1', nombre: 'Camisa', precioCatalogo: 100, precioUnit: 100, costo: 60, cantidad: 1 }];
  const v = V.construirVenta({ cliente: { id: 'c1', nombre: 'Ana' }, carrito, descuento: { tipo: 'monto', valor: 0 }, impuestoPct: 19, notas: '', medio: 'efectivo', montos: {} }, ctx());
  assert.deepEqual([v.total, v.gananciaEstimada, C.gananciaDe([v], []).ganancia], [119, 40, 59]);
});

test('T2 · apartado de 100 con 10 % de descuento: tres totales distintos (conservados, decisión 1)', () => {
  const items = [{ productoId: 'p1', nombre: 'Camisa', cantidad: 1, precio: 100 }];
  assert.equal(D.totalFormularioPendiente(items, 10, 0, 0).total, 90);
  assert.equal(D.totalApartado({ items }, 0), 100);
  const p = { tipo: 'apartado', items, descuentoPct: 10, abonos: [{ monto: 100, metodo: 'efectivo', fecha: '2026-11-19' }], anticipo: 100 };
  const e = D.entregarPendiente(p, undefined, { inventario: [], clientes: [], impuestoPct: 0, ...ctx() });
  assert.deepEqual([e.venta.total, e.venta.fiado], [90, false]);
});

test('descuento escrito como total: base sin impuesto, nunca mayor que la suma', () => {
  assert.deepEqual(V.descuentoDesdeTotal('119', { tipo: 'pct', valor: 0 }, 200, 19), { ok: true, descuento: { tipo: 'monto', valor: 100 } });
  assert.deepEqual(V.descuentoDesdeTotal('300', { tipo: 'pct', valor: 0 }, 200, 19), { ok: false, error: 'mayor-que-suma' });
  assert.deepEqual(V.descuentoDesdeTotal('', { tipo: 'pct', valor: 5 }, 200, 0), { ok: true, descuento: { tipo: 'pct', valor: 0 } });
  assert.deepEqual(V.descuentoPorcentaje('150'), { tipo: 'pct', valor: 100 });
});

test('reservas: el encargo que no cabe detiene la reserva de los siguientes (RI-14)', () => {
  const inventario = [{ id: 'p', stock: 5 }];
  const enc = (id, q, ts) => ({ id, tipo: 'encargo', estado: 'pendiente', creadoTs: ts, items: [{ productoId: 'p', cantidad: q }] });
  assert.equal(I.reservadoPorEncargos([enc('a', 3, 1), enc('b', 3, 2), enc('c', 1, 3)], inventario, 'p'), 3);
  assert.equal(I.disponible([enc('a', 3, 1)], inventario, 'p'), 2);
  assert.equal(I.disponible([], [{ id: 'q', stock: '' }], 'q'), Infinity);
});

// ---------------- Diferencias con la versión original (datos que la app nunca produce) ----------------

test('borde 1 · producto SIN campo stock: la original produce NaN; Orisma lo trata como "sin control de stock"', () => {
  const p = { id: 'p', nombre: 'Raro', precio: 10, costo: 5 }; // sin "stock": la app nunca lo crea así
  const o = crearOriginal({ clientes: [], inventario: [p], ventas: [], gastos: [], movimientos: [], pedidos: [{ id: 'x', tipo: 'pedido', estado: 'pendiente', clienteId: 'c', clienteNombre: 'A', items: [{ productoId: 'p', nombre: 'Raro', cantidad: 2, precio: 10 }], abonos: [] }], config: { impuesto: 0, moneda: '$' }, hoy: '2026-11-19' });
  o.entregarPedido(o.estado.pedidos[0], { pagaAhora: true });
  assert.ok(Number.isNaN(o.estado.inventario[0].stock), 'la original deja el stock en NaN (se guardaría como null)');
  const r = D.entregarPendiente({ id: 'x', tipo: 'pedido', items: [{ productoId: 'p', nombre: 'Raro', cantidad: 2, precio: 10 }], abonos: [] }, { pagaAhora: true }, { inventario: [p], clientes: [], impuestoPct: 0, ...ctx() });
  assert.equal(r.inventario[0].stock, undefined, 'Orisma no lo toca');
});

test('borde 2 · totales guardados como TEXTO (solo posible con un respaldo editado a mano): la original concatena', () => {
  const o = crearOriginal({ clientes: [], inventario: [], ventas: [], gastos: [], movimientos: [], pedidos: [], config: {}, hoy: '2026-11-19' });
  const ventas = [{ total: '100', costoTotal: 0 }, { total: '50', costoTotal: 0 }];
  assert.equal(o.gananciaDe(ventas, []).ventasTot, '010050', 'la original une los textos');
  assert.equal(C.gananciaDe(ventas, []).ventasTot, 150, 'Orisma suma');
});
