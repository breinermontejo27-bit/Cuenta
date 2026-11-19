// Detalle de un apartado: abonos, comprobante, WhatsApp, editar, entregar (solo pagado) y cancelar (L1459–1533).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { cerrarTodasLasHojas } from '../../core/navigation.js';
import { hoy } from '../../core/clock.js';
import { html } from '../../ui/html.js';
import { dinero, fecha, etiquetaMedio } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, valor, acciones, botonTexto } from '../../ui/components/fields.js';
import { segmentos, conectarSegmentos } from '../../ui/components/segmented.js';
import { lineas, tarjetaLineas, seccion, nota } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { abonar, entregar } from '../../operations/orders.js';
import { totalApartado, abonadoPendiente } from '../../business/orders-rules.js';
import { lineasItems, recordarPorWhatsApp, mostrarComprobante, confirmarCancelacion } from './pending-detail.js';
import { abrirFormularioPendiente } from './pending-form.js';

export function abrirDetalleApartado(id) {
  const p = coleccion('pedidos').find((x) => x.id === id);
  if (!p) return;
  const total = totalApartado(p, obtenerAjustes().impuesto), abonado = abonadoPendiente(p), saldo = Math.max(0, total - abonado);
  const abonos = (p.abonos || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const capa = abrirHoja({
    titulo: p.clienteNombre,
    paso: 'Apartado · sin fecha fija de entrega',
    cuerpo: html`
      <div class="tarjeta">${lineasItems(p)}${lineas([['Total', dinero(total), 'fuerte'], ['Abonado', dinero(abonado), '', 'pos'], ['Saldo pendiente', dinero(saldo), 'fuerte', saldo > 0 ? 'neg' : 'pos']])}</div>
      ${seccion('Abonos', abonos.length ? tarjetaLineas(abonos.map((a) => [`${fecha(a.fecha)}${etiquetaMedio(a.metodo) ? ' · ' + etiquetaMedio(a.metodo) : ''}`, dinero(a.monto), '', 'pos'])) : nota('Aún no hay abonos.'))}
      ${saldo > 0 ? html`<div class="tarjeta">
        ${filaCampos(campo({ id: 'ab_monto', etiqueta: 'Monto', tipo: 'number', dinero: true, placeholder: '0' }), campo({ id: 'ab_fecha', etiqueta: 'Fecha del abono', tipo: 'date', valor: hoy() }))}
        ${segmentos('medio', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], 'efectivo')}
        <button type="button" class="btn btn-primario btn-bloque" data-accion="abonar">Registrar abono</button></div>` : ''}
      <div class="botones-detalle">
        ${abonado > 0 ? html`<button type="button" class="btn btn-secundario" data-accion="comprobante">Comprobante de abono</button>` : ''}
        <button type="button" class="btn btn-secundario" data-accion="whatsapp">WhatsApp</button>
        <button type="button" class="btn btn-secundario" data-accion="editar">Editar</button>
      </div>
      ${botonTexto('Cancelar apartado', 'cancelar', true)}`,
    pie: acciones([{ texto: saldo > 0 ? 'Falta pagar para entregar' : 'Entregar productos', accion: 'entregar', tipo: 'primario', deshabilitado: saldo > 0 }]),
  });
  const el = capa.elemento;
  const en = (n, fn) => { const b = el.querySelector(`[data-accion="${n}"]`); if (b) b.addEventListener('click', fn); };
  const medio = conectarSegmentos(el, 'medio');
  en('abonar', async (e) => {
    const r = await operar(el, e.currentTarget, () => abonar(p.id, { monto: valor(el, 'ab_monto'), fecha: valor(el, 'ab_fecha'), metodo: medio() || 'efectivo' }, dinero));
    if (r.ok) { notificar('Abono registrado.', { tipo: 'exito' }); await capa.cerrar(); abrirDetalleApartado(id); }
  });
  en('editar', async () => { await capa.cerrar(); abrirFormularioPendiente(p.id); });
  en('whatsapp', () => recordarPorWhatsApp(p, saldo));
  en('comprobante', () => mostrarComprobante(p, capa));
  en('cancelar', () => confirmarCancelacion(p));
  en('entregar', async (e) => {
    if (saldo > 0) return;
    const r = await operar(el, e.currentTarget, () => entregar(p.id, undefined));
    if (r.ok) { await cerrarTodasLasHojas(); notificar('Pedido entregado y registrado como venta. Puedes generar su factura desde Ventas.', { tipo: 'exito', duracion: 7000 }); }
  });
}
