// Detalle de una venta sin factura (resumen, ganancia, generar factura, anular) (L3374–3423, L3633–3671).
// Si ya tiene factura, abre la factura (módulo Facturas).

import { coleccion } from '../../core/state.js';
import { pedirHoja, cerrarTodasLasHojas } from '../../core/navigation.js';
import { html } from '../../ui/html.js';
import { dinero, fecha, folio } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { acciones, botonTexto } from '../../ui/components/fields.js';
import { tarjetaLineas, seccion } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { generarFactura } from '../../operations/invoices.js';
import { anularVenta } from '../../operations/sales.js';
import { unidadesVendidas } from '../../business/sales-rules.js';
import { abonadoVenta, saldoVenta } from '../../business/payments.js';
import { insignia } from '../../ui/components/list.js';

/** Total, estado y (si es a crédito) cuánto se ha pagado, con una barra de avance. */
function cabeceraVenta(v) {
  const saldo = saldoVenta(v), pagado = abonadoVenta(v), total = Number(v.total) || 0;
  const pct = v.fiado && total > 0 ? Math.max(0, Math.min(100, Math.round(pagado / total * 100))) : 100;
  return html`<section class="tarjeta cabecera-detalle">
    <div class="arriba"><div><div class="etq">Total</div><div class="val">${dinero(total)}</div></div>${saldo > 0 ? insignia('deuda', 'Debe ' + dinero(saldo)) : insignia('pagado', 'Pagada')}</div>
    ${v.fiado ? html`<div class="avance" role="img" aria-label="Pagado ${pct}%"><span class="avance-barra" data-ancho="${pct}"></span></div><div class="avance-pie"><span>Pagado ${dinero(pagado)}</span><span>${pct}%</span></div>` : ''}
  </section>`;
}

/** La barra de avance toma su ancho del atributo (sin estilos en línea: la política de seguridad no los permite). */
function anchoAvance(el) {
  el.querySelectorAll('.avance-barra[data-ancho]').forEach((b) => { b.style.width = `${Number(b.dataset.ancho) || 0}%`; });
}

export function abrirDetalleVenta(id) {
  const v = coleccion('ventas').find((x) => x.id === id);
  if (!v) return;
  if (v.folio) { pedirHoja('factura:ver', { ventaId: v.id }); return; }
  const capa = abrirHoja({
    titulo: v.clienteNombre,
    paso: `${fecha(v.fecha)} · Sin factura generada`,
    cuerpo: html`
      ${cabeceraVenta(v)}
      ${tarjetaLineas((v.items || []).map((it) => [html`<span class="linea-titulo">${it.cantidad} × ${it.nombre}</span><span class="linea-sub">${dinero(it.precio)} c/u</span>`, dinero(it.precio * it.cantidad)]))}
      ${v.notas ? html`<p class="nota"><strong>Notas:</strong> ${v.notas}</p>` : ''}
      ${tarjetaLineas([
        ['Suma de productos', dinero(v.sumaItems !== undefined ? v.sumaItems : v.subtotal)],
        v.descuentoMonto > 0 ? [v.descuentoTipo === 'monto' ? 'Descuento' : `Descuento (${v.descuentoPct}%)`, '-' + dinero(v.descuentoMonto)] : null,
        v.impuesto > 0 ? ['Impuesto', dinero(v.impuesto)] : null,
        ['Total', dinero(v.total), 'fuerte total'],
      ])}
      ${v.gananciaEstimada !== undefined ? seccion('Ganancia de esta venta', tarjetaLineas([['Ganancia', dinero(v.gananciaEstimada), 'fuerte', v.gananciaEstimada >= 0 ? 'pos' : 'neg']])) : ''}
      ${botonTexto('Anular venta', 'anular', true)}`,
    pie: acciones([{ texto: 'Cerrar', accion: 'cerrar-detalle' }, { texto: 'Generar factura', accion: 'factura', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  anchoAvance(el);
  el.querySelector('[data-accion="cerrar-detalle"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="factura"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => generarFactura(v.id));
    if (r.ok) { await capa.cerrar(); notificar('Factura generada.', { tipo: 'exito' }); pedirHoja('factura:ver', { ventaId: v.id }); }
  });
  el.querySelector('[data-accion="anular"]').addEventListener('click', () => confirmarAnulacion(v.id));
}

/** Confirmar y anular una venta (L3633–3671). Hoja con nombre 'venta:anular' (también la pide Facturas). */
export function confirmarAnulacion(ventaId) {
  const v = coleccion('ventas').find((x) => x.id === ventaId);
  if (!v) return;
  const capa = abrirHoja({
    titulo: 'Anular venta',
    paso: `${v.clienteNombre} · ${dinero(v.total)} · ${fecha(v.fecha)}`,
    cuerpo: html`<p class="nota">Se quitará la venta del historial y de los créditos. ${unidadesVendidas(v)} unidad(es) volverán al inventario${v.folio ? ` y la factura ${folio(v.folio)} quedará anulada` : ''}. Esta acción no se puede deshacer.</p>`,
    pie: acciones([{ texto: 'No, cancelar', accion: 'no' }, { texto: 'Sí, anular', accion: 'si', tipo: 'peligro' }]),
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="no"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="si"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => anularVenta(v.id));
    if (r.ok) { await cerrarTodasLasHojas(); notificar('Venta anulada. Las unidades volvieron al inventario.'); }
  });
}
