// Etapa 9 · Las versiones optimizadas dan exactamente el mismo resultado que el cálculo directo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarDatos, generarEncargos } from './generador.js';
import { deudaCliente, deudasPorCliente } from '../../src/business/payments.js';
import { resumenStock, unidadesReservadas } from '../../src/business/inventory-rules.js';

test('deudasPorCliente = deudaCliente para cada cliente (400 conjuntos aleatorios)', () => {
  for (let s = 1; s <= 400; s++) {
    const d = generarDatos(s);
    const m = deudasPorCliente(d.ventas);
    for (const c of d.clientes) assert.equal(m.get(c.id) || 0, deudaCliente(d.ventas, c.id), `semilla ${s}, cliente ${c.id}`);
  }
});

test('resumenStock: reservas iguales al cálculo producto por producto (400 + 400 conjuntos, con encargos)', () => {
  for (let s = 1; s <= 400; s++) {
    for (const d of [generarDatos(s), generarEncargos(s)]) {
      const r = resumenStock(d.inventario, d.pedidos, d.config || {});
      const directo = d.inventario.reduce((t, p) => t + unidadesReservadas(d.pedidos, d.inventario, p.id), 0);
      assert.equal(r.reservadas, directo, `semilla ${s}`);
      for (const x of r.detalle) assert.equal(x.reservadas, unidadesReservadas(d.pedidos, d.inventario, x.producto.id), `semilla ${s}, ${x.producto.id}`);
    }
  }
});
