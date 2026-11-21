// Operaciones de créditos: abono a una venta fiada y liquidación de la deuda de un cliente.

import { coleccion } from '../core/state.js';
import { guardarCambios } from '../data/database.js';
import { abonarVenta as reglaAbonar, liquidarDeuda as reglaLiquidar } from '../business/payments.js';
import { contexto } from './contexto.js';
import { exigir, buscar, reemplazar } from './comun.js';

export async function abonarVenta(ventaId, formulario) {
  const r = reglaAbonar(buscar('ventas', ventaId), formulario, contexto());
  exigir(r.ok ? r : { ok: false, campo: 'monto' });
  await guardarCambios({ colecciones: { ventas: reemplazar(coleccion('ventas'), r.venta) } });
  return r.venta;
}

export async function liquidarDeuda(clienteId, metodo) {
  await guardarCambios({ colecciones: { ventas: reglaLiquidar(coleccion('ventas'), clienteId, metodo, contexto()) } });
}
