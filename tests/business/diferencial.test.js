// Pruebas diferenciales: las reglas de src/business/ deben dar EXACTAMENTE lo mismo que las funciones de la versión
// original (copiadas literalmente en original/funciones-originales.js) sobre cientos de conjuntos de datos aleatorios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearOriginal } from './original/funciones-originales.js';
import { generarDatos, generarEncargos } from './generador.js';
import { dinero, fecha as fmtFecha, folio as fmtFolio } from '../../src/ui/format.js';
import * as pagos from '../../src/business/payments.js';
import * as inv from '../../src/business/inventory-rules.js';
import * as ped from '../../src/business/orders-rules.js';
import * as cont from '../../src/business/accounting.js';
import * as fac from '../../src/business/invoicing.js';
import { mesAnterior } from '../../src/business/dates.js';

const SEMILLAS = Array.from({ length: 400 }, (_, i) => i + 1);
const $ = (n) => dinero(n, '$');
// Normaliza identificadores y marcas de tiempo generados (la original y la nueva los generan distinto).
const normalizar = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => ((k === 'id' || k === 'creadoTs' || k === 'ts') && typeof v !== 'object' ? '·' : v)));
// Todos los montos con formato de dinero que aparecen en un HTML, en orden.
const montos = (texto) => texto.match(/-?\$ -?[\d.]+,\d\d/g) || [];

function paraCada(fn) {
  for (const s of SEMILLAS) {
    const d = generarDatos(s);
    try { fn(d, crearOriginal(d), s); } catch (e) { e.message = `[semilla ${s}] ${e.message}`; throw e; }
  }
}

test('RC · abonado, saldo, deuda por cliente y total por cobrar', () => paraCada((d, o) => {
  for (const v of d.ventas) {
    assert.equal(pagos.abonadoVenta(v), o.abonadoVenta(v));
    assert.equal(pagos.saldoVenta(v), o.saldoVenta(v));
  }
  for (const c of [...d.clientes, { id: 'borrado' }]) assert.equal(pagos.deudaCliente(d.ventas, c.id), o.clienteSaldo(c.id));
  assert.equal(pagos.totalPorCobrar(d.ventas), o.totalPorCobrarAll());
}));

test('RI · categorías, límite y poco stock', () => paraCada((d, o) => {
  assert.deepEqual(inv.categorias(d.inventario), o.getCategorias());
  for (const p of d.inventario) {
    assert.equal(inv.umbralStock(p, d.config), o.umbralStock(p));
    assert.equal(inv.esPocoStock(p, d.config), o.esPocoStock(p));
  }
}));

test('RI-13/14 · reservas de stock por pedidos, apartados y encargos', () => paraCada((d, o) => {
  for (const p of d.inventario) {
    assert.equal(inv.reservadoSinEncargos(d.pedidos, p.id), o.reservadoSinEncargos(p.id));
    assert.equal(inv.reservadoPorEncargos(d.pedidos, d.inventario, p.id), o.reservadoPorEncargos(p.id));
    assert.equal(inv.unidadesReservadas(d.pedidos, d.inventario, p.id), o.unidadesReservadas(p.id));
  }
}));

test('RI-14 · encargos: reservan por orden de llegada solo si el stock alcanza (datos enfocados)', () => {
  for (const s of SEMILLAS) {
    const d = generarEncargos(s);
    const o = crearOriginal(d);
    for (const p of d.inventario) {
      assert.equal(inv.reservadoPorEncargos(d.pedidos, d.inventario, p.id), o.reservadoPorEncargos(p.id), `semilla ${s}`);
      assert.equal(inv.unidadesReservadas(d.pedidos, d.inventario, p.id), o.unidadesReservadas(p.id), `semilla ${s}`);
    }
  }
});

test('RI-11 · resumen de stock (todas las cifras de la pantalla Stock)', () => paraCada((d, o) => {
  const r = inv.resumenStock(d.inventario, d.pedidos, d.config);
  const html = o.renderStockHtml();
  if (!d.inventario.length) return;
  assert.deepEqual(montos(html), [$(r.valorCosto), $(r.valorVenta), ...r.detalle.flatMap((x) => (x.stock === null ? [$(x.valor)] : [$(x.producto.costo || 0), $(x.valor)]))]);
  assert.ok(html.includes(`${r.productos} productos · ${r.unidades} unidades en stock`));
  assert.ok(html.includes(`Reservadas para pedidos</div><div class="rep-stat-value">${r.reservadas}<`));
  assert.ok(html.includes(`Poco stock</div><div class="rep-stat-value ${r.bajos > 0 ? 'neg' : ''}">${r.bajos}<`));
}));

test('RI-12 · historial de inventario: mismos eventos, mismo orden, mismas cantidades y detalles', () => paraCada((d, o) => {
  const evs = inv.historialInventario(d.ventas, d.gastos, d.movimientos, d.inventario);
  const orig = o.movimientosInventario();
  assert.equal(evs.length, orig.length);
  const ETQ = { alta: 'Producto agregado', baja: 'Producto eliminado' };
  evs.forEach((e, i) => {
    const x = orig[i];
    assert.deepEqual([e.tipo, e.fecha, e.ts, e.nombre, e.cantidad], [x.tipo, x.fecha, x.ts, x.nombre, x.cantidad]);
    const detalle = e.tipo === 'venta' ? `${e.cliente}${e.folio ? ' · ' + fmtFolio(e.folio) : ''} · ${$(e.precio)} c/u`
      : e.tipo === 'compra' ? `${$(e.unitario)} c/u · total ${$(e.total)}`
        : (e.motivo || ETQ[e.tipo] || 'Ajuste manual');
    assert.equal(detalle, x.detalle);
    const q = inv.variacionHistorial(e);
    assert.ok(o.renderHistorialHtml().includes(`<span class="${q.signo}" style="font-weight:700; white-space:nowrap;">${q.texto}</span>`), `variación ${q.texto}`);
  });
}));

test('RP-01 · estado del pedido por fecha', () => paraCada((d, o) => {
  for (const p of d.pedidos) {
    const info = o.pedidoEstadoInfo(p);
    const esperado = info.txt === 'Sin fecha' ? 'sin-fecha' : info.cls === 'low' ? 'vencido' : info.hoy ? 'hoy' : 'proximo';
    assert.equal(ped.estadoPorFecha(p, d.hoy), esperado);
  }
}));

test('RP-05/06/10 · totales provisionales de pendientes y costo', () => paraCada((d, o) => {
  for (const p of d.pedidos) {
    assert.equal(ped.totalApartado(p, d.config.impuesto), o.apartadoTotal(p));
    assert.equal(ped.abonadoPendiente(p), o.apartadoAbonado(p));
    assert.equal(ped.costoPendiente(p, d.inventario), o.costoPedido(p));
  }
}));

test('RP-10 … RP-14 · entregar un pendiente: misma venta, mismo stock, mismo estado o mismo aviso de faltante', () => paraCada((d, o0) => {
  const opciones = [undefined, { pagaAhora: true, metodo: 'efectivo' }, { pagaAhora: true, metodo: 'tarjeta' }, { pagaAhora: false, metodo: 'efectivo' }];
  d.pedidos.filter((p) => p.estado === 'pendiente').forEach((p, k) => {
    const opc = opciones[k % opciones.length];
    const o = crearOriginal(d);
    o.entregarPedido(structuredClone(p), opc);
    let n = 0;
    const r = ped.entregarPendiente(p, opc, { inventario: d.inventario, clientes: d.clientes, impuestoPct: d.config.impuesto, hoy: d.hoy, ahora: 1, nuevoId: () => 'n' + (++n) });
    if (!r.ok) {
      assert.equal(o.avisos[0], `No hay suficiente stock de ${r.faltante.nombre} para entregar este pedido (disponibles: ${r.faltante.stock}).`);
      assert.equal(o.estado.ventas.length, d.ventas.length);
      return;
    }
    const final = o.estado;
    assert.deepEqual(normalizar(r.venta), normalizar(final.ventas[final.ventas.length - 1]));
    assert.deepEqual(r.inventario, final.inventario);
    assert.deepEqual(r.pendiente, final.pedidos.find((x) => x.id === p.id));
  });
}));

test('RP-16/17 · comprobante de abono y su numeración', () => paraCada((d, o) => {
  for (const p of d.pedidos) {
    const antes = o.estado.config.siguienteComprobante;
    const doc = o.comprobanteDeAbono(p);
    const { numero, ajustes } = fac.siguienteComprobante({ siguienteComprobante: antes });
    assert.deepEqual(fac.comprobanteDeAbono(p, d.clientes.find((c) => c.id === p.clienteId), numero, d.hoy), doc);
    assert.equal(ajustes.siguienteComprobante, o.estado.config.siguienteComprobante);
  }
}));

test('RK · caja por día, por mes y de toda la historia', () => paraCada((d, o) => {
  const datos = { ventas: d.ventas, pedidos: d.pedidos, gastos: d.gastos };
  const fechas = new Set([d.hoy, ...d.ventas.map((v) => v.fecha), ...d.gastos.map((g) => g.fecha), ...d.pedidos.flatMap((p) => (p.abonos || []).map((a) => a.fecha))]);
  for (const f of fechas) {
    assert.deepEqual(cont.resumenCaja(datos, cont.rangoDia(f), d.hoy), o.cajaResumen((x) => x === f), `día ${f}`);
    const m = f.slice(0, 7);
    assert.deepEqual(cont.resumenCaja(datos, cont.rangoMes(m), d.hoy), o.cajaResumen((x) => x.slice(0, 7) === m), `mes ${m}`);
  }
  assert.deepEqual(cont.resumenCaja(datos, () => true, d.hoy), o.cajaResumen(() => true));
}));

test('RK · pantalla Caja (día y mes): mismos movimientos y cierres', () => paraCada((d) => {
  const datos = { ventas: d.ventas, pedidos: d.pedidos, gastos: d.gastos };
  for (const dia of [d.hoy, ...d.ventas.slice(0, 3).map((v) => v.fecha)]) {
    const o = crearOriginal({ ...d, cajaModo: 'dia', cajaFecha: dia });
    const html = o.renderCajaHtml();
    const C = cont.resumenCaja(datos, cont.rangoDia(dia), d.hoy);
    const movs = cont.movimientosDelDia(datos, dia, d.hoy);
    assert.ok(html.includes(`Ver movimientos del día (${movs.length})`), 'cantidad de movimientos');
    assert.deepEqual(montos(html), [$(C.neto), $(C.ingresos), $(C.gastosTot), $(C.efectivo), $(C.tarjeta), $(C.ingresos), $(C.abonosCred), $(C.compras), $(C.otros), $(C.gastosTot), ...movs.map((m) => $(m.monto))]);
  }
  const mes = d.hoy.slice(0, 7);
  const o = crearOriginal({ ...d, cajaModo: 'mes', cajaMes: mes });
  const html = o.renderCajaHtml();
  const dias = cont.diasConMovimiento(datos, mes);
  const C = cont.resumenCaja(datos, cont.rangoMes(mes), d.hoy);
  const porDia = dias.flatMap((x) => { const r = cont.resumenCaja(datos, cont.rangoDia(x), d.hoy); return [$(r.efectivo), $(r.tarjeta), $(r.gastosTot), $(r.neto)]; });
  assert.deepEqual(montos(html), [$(C.neto), $(C.ingresos), $(C.gastosTot), $(C.efectivo), $(C.tarjeta), $(C.ingresos), $(C.abonosCred), $(C.compras), $(C.otros), $(C.gastosTot), ...porDia]);
}));

test('RL · flujo: disponible, por cobrar y acumulado por mes', () => paraCada((d, o) => {
  const f = cont.flujo({ ventas: d.ventas, pedidos: d.pedidos, gastos: d.gastos }, d.hoy);
  const filas = f.filas.slice().reverse().flatMap((x) => [$(x.entradas), $(x.salidas), $(x.efectivo), $(x.tarjeta), $(x.acumulado)]);
  assert.deepEqual(montos(o.renderFlujoHtml()), [$(f.disponible), $(f.efectivo), $(f.tarjeta), $(f.porCredito), $(f.porPedidos), $(f.porCobrar), ...filas]);
}));

test('RR · ganancia, comparación, histórico, inventario y más vendidos (pantalla Resumen, 3 períodos)', () => paraCada((d) => {
  for (const periodo of ['mes', 'anterior', 'todo']) {
    const o = crearOriginal({ ...d, repPeriodo: periodo });
    o.renderReportes();
    const html = o.listWrap.innerHTML;
    const r = cont.resumenReportes(d, periodo, d.config, d.hoy);
    const P = r.periodo, A = r.historico;
    const cmp = r.comparacion && !r.comparacion.sinDatos ? [$(Math.abs(r.comparacion.diferencia))] : [];
    assert.deepEqual(montos(html), [$(P.ganancia), $(P.ventasTot), $(P.costo), ...cmp, $(P.ventasTot), $(P.gastosTot), $(P.costo), $(P.compras), $(P.otros), $(A.ventasTot), $(r.porCobrar), $(A.ganancia), $(r.valorInventario)], periodo);
    if (r.comparacion && r.comparacion.sinDatos) assert.ok(html.includes('Sin datos del mes anterior'));
    if (r.comparacion && !r.comparacion.sinDatos) assert.ok(html.includes(r.comparacion.diferencia >= 0 ? '▲' : '▼'));
    assert.ok(html.includes(`Productos con poco stock</div><div class="rep-stat-value ${r.pocoStock > 0 ? 'neg' : ''}">${r.pocoStock}<`));
    const top = [...html.matchAll(/<span class="rep-rank">(\d)<\/span>(.*?)<\/span>\s*<span>([\d.]+) unid.<\/span>/g)].map((m) => [m[2], Number(m[3])]);
    assert.deepEqual(top.map(([n, c]) => [n.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'), c]), r.masVendidos);
  }
}));

test('fechas: mes anterior', () => {
  const o = crearOriginal(generarDatos(1, { hoy: '2026-01-10' }));
  assert.equal(mesAnterior('2026-01-10'), o.mesAnteriorKey());
  for (const h of ['2026-03-31', '2026-12-01', '2027-01-01']) assert.equal(mesAnterior(h), crearOriginal(generarDatos(1, { hoy: h })).mesAnteriorKey());
});

test('formato de fechas en mensajes de pendientes', () => {
  assert.equal(ped.mensajeRecordatorio({ clienteNombre: 'Ana', tipo: 'pedido', fechaEntrega: '2026-11-20' }, 5000, 'Orisma', { dinero: $, fecha: fmtFecha }),
    `Hola Ana, te recordamos tu pedido para el ${fmtFecha('2026-11-20')} en Orisma. Saldo pendiente: $ 5.000,00. ¡Gracias!`);
});
