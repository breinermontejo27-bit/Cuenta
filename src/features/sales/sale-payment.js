// Asistente de venta: forma de pago, confirmación antes de cobrar y "Venta registrada" (L2763–2834, L3174–3202).

import { obtenerAjustes } from '../../core/state.js';
import { pedirHoja } from '../../core/navigation.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero, fecha, MEDIOS } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, acciones } from '../../ui/components/fields.js';
import { segmentos, conectarSegmentos } from '../../ui/components/segmented.js';
import { lineas, seccion, nota } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { generarFactura } from '../../operations/invoices.js';
import { pagosVenta, saldoACredito, totalesVenta } from '../../business/sales-rules.js';

/** Pinta los campos según el medio (crédito: abono inicial; mixto: efectivo + tarjeta). */
export function pintarPago(zona, est) {
  const aj = obtenerAjustes();
  const m = est.montos;
  let contenido = '';
  if (est.medio === 'credito') {
    contenido = html`
      ${campo({ id: 'f_abonoIni', etiqueta: `Abono inicial (${aj.moneda}) · opcional`, tipo: 'number', dinero: true, valor: m.abonoInicial || '', placeholder: '0' })}
      <div class="campo"><span class="etiqueta-campo">Medio del abono inicial</span>${segmentos('medio-abono', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], m.medioAbono)}</div>
      <p class="nota">Saldo a crédito: <strong data-resto></strong></p>`;
  } else if (est.medio === 'mixto') {
    contenido = html`
      ${filaCampos(campo({ id: 'f_efectivo', etiqueta: `Efectivo (${aj.moneda})`, tipo: 'number', dinero: true, valor: m.efectivo || '', placeholder: '0' }), campo({ id: 'f_tarjeta', etiqueta: `Tarjeta (${aj.moneda})`, tipo: 'number', dinero: true, valor: m.tarjeta || '', placeholder: '0' }))}
      <p class="nota">Lo que quede se registra como saldo a crédito: <strong data-resto></strong></p>`;
  }
  montar(zona, html`${contenido}`);
  conectarSegmentos(zona, 'medio-abono', (v) => { m.medioAbono = v; });
  actualizarResto(zona, est);
}

/** Guarda en el estado lo que se escribe en los montos de pago (se conecta una sola vez a la zona). */
export function leerMontosPago(e, est) {
  const m = est.montos;
  if (e.target.id === 'f_abonoIni') m.abonoInicial = Number(e.target.value) || 0;
  if (e.target.id === 'f_efectivo') m.efectivo = Number(e.target.value) || 0;
  if (e.target.id === 'f_tarjeta') m.tarjeta = Number(e.target.value) || 0;
}

/** Actualiza el saldo a crédito que se muestra (updateRest, L2782–2789). */
export function actualizarResto(zona, est) {
  const el = zona.querySelector('[data-resto]');
  if (!el) return;
  const t = totalesVenta(est.carrito, est.descuento, obtenerAjustes().impuesto).total;
  el.textContent = dinero(saldoACredito(est.medio, t, est.montos));
}

/** Pantalla de confirmación antes de cobrar (openConfirmarVenta, L2791–2834). Llama a `alConfirmar` al aceptar. */
export function confirmarCobro(est, alConfirmar) {
  const aj = obtenerAjustes();
  const t = totalesVenta(est.carrito, est.descuento, aj.impuesto);
  const pg = pagosVenta(est.medio, t.total, est.montos, { hoy: hoy(), nuevoId: () => '' });
  const pagado = pg.pagos.reduce((s, a) => s + (Number(a.monto) || 0), 0);
  let pagoTxt;
  if (est.medio === 'credito') pagoTxt = `A crédito · abono inicial ${dinero(pagado)} · saldo ${dinero(t.total - pagado)}`;
  else if (est.medio === 'mixto') pagoTxt = pg.pagos.map((a) => `${a.metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo'} ${dinero(a.monto)}`).join(' · ');
  else pagoTxt = `${MEDIOS[est.medio] || est.medio} · pagado completo`;
  const capa = abrirHoja({
    titulo: 'Confirmar venta',
    paso: 'Revisa antes de cobrar',
    cuerpo: html`
      <div class="totales">${lineas([['Cliente', est.cliente.nombre], ['Fecha', fecha(hoy())]])}</div>
      ${seccion('Productos', html`<div class="totales">${lineas(est.carrito.map((it) => [`${it.cantidad} × ${it.nombre}`, dinero(it.precioUnit * it.cantidad)]))}</div>`)}
      ${seccion('Cobro', html`<div class="totales">${lineas([
        ['Suma de productos', dinero(t.suma)],
        t.descuentoMonto > 0 ? ['Descuento', '-' + dinero(t.descuentoMonto)] : null,
        t.impuesto > 0 ? [`Impuesto (${aj.impuesto}%)`, dinero(t.impuesto)] : null,
        ['Total a cobrar', dinero(t.total), 'fuerte total'],
        ['Forma de pago', pagoTxt],
      ])}</div>`)}
      ${est.notas ? nota(`Notas: ${est.notas}`) : ''}`,
    pie: acciones([{ texto: 'Volver', accion: 'volver' }, { texto: 'Confirmar cobro', accion: 'confirmar', tipo: 'primario' }]),
  });
  capa.elemento.querySelector('[data-accion="volver"]').addEventListener('click', capa.cerrar);
  capa.elemento.querySelector('[data-accion="confirmar"]').addEventListener('click', (e) => alConfirmar(capa, e.currentTarget));
}

/** "Venta registrada": total, ganancia y opción de generar la factura ahora (L3174–3202). */
export function mostrarVentaRegistrada(v) {
  const capa = abrirHoja({
    titulo: 'Venta registrada',
    paso: `Cliente: ${v.clienteNombre} · ${fecha(v.fecha)}`,
    cuerpo: html`
      <div class="totales">${lineas([['Total cobrado', dinero(v.total), 'fuerte total'], ['Ganancia de esta venta', dinero(v.gananciaEstimada), '', v.gananciaEstimada >= 0 ? 'pos' : 'neg']])}</div>
      ${nota('La factura es opcional: puedes generarla ahora para enviársela al cliente, o hacerlo más tarde desde esta misma venta.')}`,
    pie: acciones([{ texto: 'Listo, sin factura', accion: 'listo' }, { texto: 'Generar factura', accion: 'factura', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="listo"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="factura"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => generarFactura(v.id));
    if (r.ok) { await capa.cerrar(); notificar('Factura generada.', { tipo: 'exito' }); pedirHoja('factura:ver', { ventaId: v.id }); }
  });
}
