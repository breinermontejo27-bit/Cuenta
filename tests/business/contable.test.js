// Actualización contable (nov-2026): compras desde Inventario y desde Gastos equivalentes y estado de resultados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compraDesdeProducto, compraDesdeGastos, comprasAntiguasSinMarcar } from '../../src/business/inventory-rules.js';
import { gananciaDe, resumenReportes, resumenCaja, rangoMes, estadoDeResultados } from '../../src/business/accounting.js';

let n = 0;
const ctx = { hoy: '2026-11-20', ahora: 1, nuevoId: () => 'id' + (++n) };
const P = { id: 'p1', nombre: 'Manilla', precio: 35000, costo: 15000, stock: 10, categoria: 'Manillas', margen: 0 };
const F = { cantidad: '5', costoUnitario: '17000', fecha: '2026-11-10', precioNuevo: '', margenNuevo: '' };
const venta = (id, fecha, total, costo) => ({ id, fecha, total, costoTotal: costo, items: [{ nombre: 'Manilla', cantidad: 1, precio: total }], fiado: false, abonos: [] });

test('1 · la compra desde Inventario guarda lo mismo que la compra desde Gastos (mismos campos, mismo orden)', () => {
  const a = compraDesdeProducto(P, { ...F, metodo: 'tarjeta' }, ctx);
  const b = compraDesdeGastos(P, { ...F, metodo: 'tarjeta' }, ctx);
  const sinId = (g) => { const { id, ...r } = g; return r; };
  assert.deepEqual(Object.keys(a.gasto), Object.keys(b.gasto));
  assert.deepEqual(sinId(a.gasto), sinId(b.gasto));
  assert.equal(a.gasto.tipo, 'compra'); assert.equal(a.gasto.productoId, 'p1'); assert.equal(a.gasto.cantidad, 5); assert.equal(a.gasto.metodo, 'tarjeta');
});

test('1b · sin medio elegido, la compra desde Inventario queda en efectivo (como la caja ya la contaba)', () => {
  assert.equal(compraDesdeProducto(P, F, ctx).gasto.metodo, 'efectivo');
});

test('2 · una compra no reduce la utilidad; 3 · un gasto operativo sí', () => {
  const ventas = [venta('v1', '2026-11-05', 100000, 40000)];
  const compra = compraDesdeProducto(P, F, ctx).gasto;
  const arriendo = { id: 'g1', tipo: 'general', metodo: 'efectivo', descripcion: 'Arriendo', monto: 30000, fecha: '2026-11-02', categoria: 'Local' };
  assert.equal(gananciaDe(ventas, []).ganancia, 60000);
  assert.equal(gananciaDe(ventas, [compra]).ganancia, 60000, 'la compra restó utilidad');
  assert.equal(gananciaDe(ventas, [compra]).compras, 85000);
  assert.equal(gananciaDe(ventas, [compra, arriendo]).ganancia, 30000, 'el gasto operativo no restó');
});

test('4 · stock y costo promedio iguales por las dos rutas', () => {
  const a = compraDesdeProducto(P, F, ctx).producto, b = compraDesdeGastos(P, { ...F, metodo: 'efectivo' }, ctx).producto;
  assert.equal(a.stock, 15); assert.equal(b.stock, 15);
  assert.equal(a.costo, (10 * 15000 + 5 * 17000) / 15); assert.equal(a.costo, b.costo);
});

test('4b · la caja trata igual las dos rutas (mismo egreso, mismo medio)', () => {
  const g1 = compraDesdeProducto(P, { ...F, metodo: 'tarjeta' }, ctx).gasto, g2 = compraDesdeGastos(P, { ...F, metodo: 'tarjeta' }, ctx).gasto;
  const c = (g) => resumenCaja({ ventas: [], pedidos: [], gastos: [g] }, rangoMes('2026-11'), '2026-11-20');
  assert.deepEqual(c(g1), c(g2));
});

const DATOS = () => ({
  ventas: [venta('v1', '2026-11-05', 100000, 40000), venta('v2', '2026-11-18', 50000, 20000), venta('v0', '2026-10-10', 80000, 30000), venta('vs', '2026-09-03', 10000, 5000)],
  gastos: [
    { id: 'g1', tipo: 'general', metodo: 'efectivo', descripcion: 'Arriendo', monto: 30000, fecha: '2026-11-02', categoria: 'Local' },
    { id: 'g2', tipo: 'compra', metodo: 'efectivo', productoId: 'p1', cantidad: 2, descripcion: 'Compra de inventario: Manilla x2', monto: 30000, fecha: '2026-11-03', categoria: 'Inventario' },
    { id: 'g3', tipo: 'general', metodo: 'tarjeta', descripcion: 'Publicidad', monto: 20000, fecha: '2026-10-12', categoria: 'Publicidad' },
  ],
  inventario: [P], pedidos: [],
});

test('estado de resultados · las cifras son las de Reportes › Resumen para ese mes (sin fórmulas nuevas)', () => {
  const d = DATOS();
  const e = estadoDeResultados(d, '2026-11', { stockMinimo: 3 }, '2026-11-20');
  const r = resumenReportes(d, 'mes', { stockMinimo: 3 }, '2026-11-20').periodo;
  assert.equal(e.actual.ventas, r.ventasTot); assert.equal(e.actual.costo, r.costo); assert.equal(e.actual.utilidadNeta, r.ganancia);
  assert.equal(e.actual.gastosOperativos, r.otros); assert.equal(e.actual.compras, r.compras);
  assert.equal(e.actual.utilidadBruta, 150000 - 60000);
  assert.equal(e.actual.utilidadNeta, e.actual.utilidadBruta - e.actual.gastosOperativos);
  assert.equal(e.actual.compras, 30000); assert.equal(e.actual.gastosOperativos, 30000);
});

test('5 · se puede consultar un mes anterior (octubre) y compara con el suyo (septiembre)', () => {
  const e = estadoDeResultados(DATOS(), '2026-10', { stockMinimo: 3 }, '2026-11-20');
  assert.equal(e.mes, '2026-10'); assert.equal(e.mesAnterior, '2026-09');
  assert.equal(e.actual.ventas, 80000); assert.equal(e.actual.utilidadNeta, 80000 - 30000 - 20000);
  assert.equal(e.anterior.ventas, 10000);
});

test('6 · comparación con el mes anterior: diferencias correctas en ventas, costos, gastos y utilidad', () => {
  const e = estadoDeResultados(DATOS(), '2026-11', { stockMinimo: 3 }, '2026-11-20');
  assert.equal(e.mesAnterior, '2026-10');
  assert.equal(e.comparacion.ventas.diferencia, 150000 - 80000);
  assert.equal(e.comparacion.costo.diferencia, 60000 - 30000);
  assert.equal(e.comparacion.gastosOperativos.diferencia, 30000 - 20000);
  assert.equal(e.comparacion.utilidadNeta.diferencia, 60000 - 30000);
});

test('8 · porcentaje solo con base válida; con base 0 no se muestra', () => {
  const e = estadoDeResultados(DATOS(), '2026-11', { stockMinimo: 3 }, '2026-11-20');
  assert.equal(Math.round(e.comparacion.ventas.porcentaje * 100) / 100, 87.5);
  assert.equal(e.comparacion.utilidadNeta.porcentaje, 100);
  assert.equal(e.comparacion.compras.anterior, 0);
  assert.equal(e.comparacion.compras.porcentaje, null, 'porcentaje sobre base 0');
});

test('8b · con utilidad anterior negativa, el porcentaje usa la base en valor absoluto (sube = positivo)', () => {
  const d = DATOS(); d.gastos.push({ id: 'g9', tipo: 'general', metodo: 'efectivo', descripcion: 'Reparación', monto: 100000, fecha: '2026-10-20', categoria: 'Local' });
  const e = estadoDeResultados(d, '2026-11', { stockMinimo: 3 }, '2026-11-20');
  assert.equal(e.anterior.utilidadNeta, -70000);
  assert.ok(e.comparacion.utilidadNeta.porcentaje > 0);
});

test('7 · mes anterior sin datos: se indica y no hay porcentajes', () => {
  const e = estadoDeResultados(DATOS(), '2026-09', { stockMinimo: 3 }, '2026-11-20');
  assert.equal(e.sinDatosAnterior, true);
  assert.ok(Object.values(e.comparacion).every((c) => c.porcentaje === null));
  assert.equal(e.comparacion.ventas.diferencia, 10000);
});

test('indicadores complementarios: márgenes, número de ventas, caja del mes y más vendidos', () => {
  const e = estadoDeResultados(DATOS(), '2026-11', { stockMinimo: 3 }, '2026-11-20');
  assert.equal(e.numeroVentas, 2);
  assert.equal(e.margenBruto, 60); assert.equal(e.margenNeto, 40);
  assert.equal(e.caja.ingresos, 150000); assert.equal(e.caja.gastosTot, 60000);
  assert.deepEqual(e.masVendidos, [['Manilla', 2]]);
  assert.equal(estadoDeResultados({ ventas: [], gastos: [], inventario: [] }, '2026-11', {}, '2026-11-20').margenBruto, null);
});

test('compras antiguas: se detectan y se PROPONE la corrección sin cambiar nada', () => {
  const vieja = { id: 'gv', descripcion: 'Compra de inventario: Manilla x5', monto: 75000, fecha: '2026-08-01', categoria: 'Inventario' };
  const renombrado = { id: 'gr', descripcion: 'Compra de inventario: Collar viejo x2', monto: 10000, fecha: '2026-08-02', categoria: 'Inventario' };
  const nueva = compraDesdeGastos(P, { ...F, metodo: 'efectivo' }, ctx).gasto;
  const general = { id: 'gg', tipo: 'general', descripcion: 'Compra de inventario: Manilla x5', monto: 1, fecha: '2026-08-01', categoria: 'Local' };
  const copia = JSON.stringify([vieja, renombrado, nueva, general]);
  const r = comprasAntiguasSinMarcar([vieja, renombrado, nueva, general], [P]);
  assert.equal(JSON.stringify([vieja, renombrado, nueva, general]), copia, 'modificó los datos');
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].confiable, r[0].productoId, r[0].cantidad], [true, 'p1', 5]);
  assert.deepEqual(r[0].corregido, { ...vieja, tipo: 'compra', metodo: 'efectivo', productoId: 'p1', cantidad: 5 });
  assert.deepEqual([r[1].confiable, r[1].corregido], [false, null]);
  // Con la corrección aplicada, la ganancia deja de restar esa compra.
  assert.equal(gananciaDe([], [vieja]).ganancia, -75000);
  assert.equal(gananciaDe([], [r[0].corregido]).ganancia, 0);
});
