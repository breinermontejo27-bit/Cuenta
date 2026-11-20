// Detalle de un pedido o encargo: abonar, comprobante, WhatsApp, editar, entregar y cancelar (L1350–1420).
// También la cancelación con devolución (L1266–1304), que usa el detalle de apartados.

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { pedirHoja, cerrarTodasLasHojas } from '../../core/navigation.js';
import { hoy } from '../../core/clock.js';
import { html, montar, imagenSegura } from '../../ui/html.js';
import { dinero, fecha } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, valor, acciones, botonTexto } from '../../ui/components/fields.js';
import { segmentos, conectarSegmentos } from '../../ui/components/segmented.js';
import { insignia } from '../../ui/components/list.js';
import { lineas, tarjetaLineas, nota } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { abonar, entregar, cancelar, generarComprobante } from '../../operations/orders.js';
import { sumaPendiente, costoPendiente, estadoPorFecha, saldoDetallePendiente, abonosConAnticipo, cancelarPendiente, mensajeRecordatorio, NOMBRE_TIPO } from '../../business/orders-rules.js';
import { abrirWhatsApp } from '../../services/whatsapp.js';
import { abrirFormularioPendiente } from './pending-form.js';

/** Líneas de los productos de un pendiente (con materiales y foto). */
export function lineasItems(p) {
  return lineas((p.items || []).map((it) => [
    html`<span class="linea-titulo">${it.cantidad} × ${it.nombre}</span><span class="linea-sub">${it.caracteristicas || 'Sin características'}</span>${(it.materiales || []).length ? html`<span class="linea-sub">Materiales: ${it.materiales.map((m) => `${(Number(m.cantidad) || 0) * (Number(it.cantidad) || 0)} × ${m.nombre}`).join(', ')}</span>` : ''}${imagenSegura(it.foto) ? html`<img class="foto-item" src="${imagenSegura(it.foto)}" alt="">` : ''}`,
    it.precio ? dinero(it.precio * it.cantidad) : '—',
  ]));
}

/** Recordatorio por WhatsApp (avisarPendienteWA, L1152–1162). */
export function recordarPorWhatsApp(p, saldo) {
  const cli = coleccion('clientes').find((c) => c.id === p.clienteId);
  if (!cli || !cli.telefono) { notificar('Este cliente no tiene teléfono guardado. Agrégalo en Clientes.', { tipo: 'error' }); return; }
  abrirWhatsApp(cli.telefono, mensajeRecordatorio(p, saldo, obtenerAjustes().nombre, { dinero, fecha }));
}

/** Genera y muestra el comprobante de abono (consume un número, como la original). */
export async function mostrarComprobante(p, capa) {
  const r = await operar(capa.elemento, null, () => generarComprobante(p.id));
  if (r.ok) { await capa.cerrar(); pedirHoja('comprobante:ver', { documento: r.valor }); }
}

export function abrirDetallePendiente(id) {
  const p = coleccion('pedidos').find((x) => x.id === id);
  if (!p) return;
  const total = sumaPendiente(p), anticipo = Number(p.anticipo) || 0, saldo = saldoDetallePendiente(p);
  const estado = estadoPorFecha(p, hoy());
  const capa = abrirHoja({
    titulo: p.clienteNombre,
    cuerpo: html`
      <div class="fila-extra">${insignia('info', p.tipo === 'encargo' ? 'Encargo' : 'Pedido')}${p.fechaEntrega ? insignia(estado === 'vencido' ? 'vencido' : 'neutra', `${estado === 'vencido' ? 'Vencido · ' : estado === 'hoy' ? 'Hoy · ' : 'Entrega: '}${fecha(p.fechaEntrega)}`) : insignia('neutra', 'Sin fecha estimada')}</div>
      <div class="tarjeta">${lineasItems(p)}${lineas([
        ['Total estimado', dinero(total), 'fuerte'],
        [`Anticipo${p.fechaAnticipo ? ' · ' + fecha(p.fechaAnticipo) : ''}`, dinero(anticipo)],
        ['Saldo al entregar', dinero(saldo), 'fuerte', saldo > 0 ? 'neg' : ''],
        ['Ganancia estimada', dinero(total - costoPendiente(p, coleccion('inventario'))), '', total - costoPendiente(p, coleccion('inventario')) < 0 ? 'neg' : 'pos'],
      ])}</div>
      ${p.notas ? nota(`Notas: ${p.notas}`) : ''}
      <div class="botones-detalle">
        ${total - anticipo > 0 ? html`<button type="button" class="btn btn-secundario" data-accion="abonar">Registrar abono</button>` : ''}
        ${anticipo > 0 ? html`<button type="button" class="btn btn-secundario" data-accion="comprobante">Comprobante de abono</button>` : ''}
        <button type="button" class="btn btn-secundario" data-accion="whatsapp">WhatsApp</button>
        <button type="button" class="btn btn-secundario" data-accion="editar">Editar</button>
      </div>
      <div data-zona="entrega"></div>
      ${botonTexto(`Cancelar ${NOMBRE_TIPO[p.tipo] || 'pedido'}`, 'cancelar', true)}`,
    pie: acciones([{ texto: 'Marcar entregado', accion: 'entregar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  const en = (n, fn) => { const b = el.querySelector(`[data-accion="${n}"]`); if (b) b.addEventListener('click', fn); };
  en('editar', async () => { await capa.cerrar(); abrirFormularioPendiente(p.id); });
  en('whatsapp', () => recordarPorWhatsApp(p, saldo));
  en('comprobante', () => mostrarComprobante(p, capa));
  en('abonar', async () => { await capa.cerrar(); abrirAbonoPendiente(p.id); });
  en('cancelar', () => confirmarCancelacion(p));
  let entregaLista = false;
  en('entregar', async (e) => {
    const zona = el.querySelector('[data-zona="entrega"]');
    if (!entregaLista) {
      entregaLista = true;
      montar(zona, html`<div class="tarjeta">${nota(`Entrega a ${p.clienteNombre}. Saldo al entregar: ${dinero(saldo)}. Toca de nuevo "Marcar entregado" para confirmar.`)}
        ${saldo > 0 ? html`${segmentos('pago-entrega', [['pagado', 'Pagó el saldo'], ['credito', 'Queda a crédito']], 'pagado')}<div data-zona="medio-entrega">${segmentos('medio-entrega', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], 'efectivo')}</div>` : ''}</div>`);
      conectarSegmentos(zona, 'pago-entrega', (v) => { zona.querySelector('[data-zona="medio-entrega"]').hidden = v !== 'pagado'; });
      conectarSegmentos(zona, 'medio-entrega');
      zona.scrollIntoView({ block: 'nearest' });
      return;
    }
    const modo = zona.querySelector('[data-grupo="pago-entrega"] [aria-pressed="true"]');
    const medio = zona.querySelector('[data-grupo="medio-entrega"] [aria-pressed="true"]');
    const r = await operar(el, e.currentTarget, () => entregar(p.id, { pagaAhora: modo ? modo.dataset.valor === 'pagado' : true, metodo: medio ? medio.dataset.valor : 'efectivo' }));
    if (r.ok) { await cerrarTodasLasHojas(); notificar('Pedido entregado y registrado como venta. Puedes generar su factura desde Ventas.', { tipo: 'exito', duracion: 7000 }); }
  });
}

/** Abono a un pedido o encargo (registrarAbonoPedido, L1306–1348). */
export function abrirAbonoPendiente(id) {
  const p = coleccion('pedidos').find((x) => x.id === id);
  if (!p) return;
  const base = (p.abonos && p.abonos.length) ? p.abonos : abonosConAnticipo(p, hoy());
  const saldo = Math.max(0, sumaPendiente(p) - base.reduce((s, a) => s + (Number(a.monto) || 0), 0));
  const volver = async () => { await capa.cerrar(); abrirDetallePendiente(id); };
  const capa = abrirHoja({
    titulo: 'Registrar abono',
    paso: `${p.clienteNombre} · saldo pendiente ${dinero(saldo)}`,
    cuerpo: html`
      ${filaCampos(campo({ id: 'pa_monto', etiqueta: 'Monto', tipo: 'number', dinero: true, placeholder: '0' }), campo({ id: 'pa_fecha', etiqueta: 'Fecha', tipo: 'date', valor: hoy() }))}
      <div class="campo"><span class="etiqueta-campo">Medio de pago</span>${segmentos('medio', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], 'efectivo')}</div>`,
    pie: acciones([{ texto: 'Volver', accion: 'volver' }, { texto: 'Registrar abono', accion: 'guardar', tipo: 'primario' }]),
    alAtras: volver,
  });
  const el = capa.elemento;
  const medio = conectarSegmentos(el, 'medio');
  el.querySelector('[data-accion="volver"]').addEventListener('click', volver);
  el.querySelector('[data-accion="guardar"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => abonar(p.id, { monto: valor(el, 'pa_monto'), fecha: valor(el, 'pa_fecha'), metodo: medio() || 'efectivo' }, dinero));
    if (r.ok) { notificar('Abono registrado.', { tipo: 'exito' }); await volver(); }
  });
}

/** Cancelar con devolución de lo abonado (cancelarPedidoConEfecto, L1266–1304). */
export function confirmarCancelacion(p) {
  const vista = cancelarPendiente(p, { hoy: hoy(), nuevoId: () => '' });
  const tipoTxt = NOMBRE_TIPO[p.tipo] || 'pedido';
  const capa = abrirHoja({
    titulo: `¿Cancelar el ${tipoTxt}?`,
    paso: p.clienteNombre,
    cuerpo: html`
      ${tarjetaLineas([[`Total del ${tipoTxt}`, dinero(vista.sumaProductos)], ['A devolver', dinero(vista.total), 'fuerte total']])}
      ${nota(vista.total > 0 ? `Se devolverán ${dinero(vista.total)}: efectivo ${dinero(vista.porMedio.efectivo)}${vista.porMedio.tarjeta > 0 ? ' · tarjeta ' + dinero(vista.porMedio.tarjeta) : ''}. Se registrará como salida de caja hoy (${fecha(hoy())}).` : 'No tiene abonos, así que no hay dinero que devolver.')}`,
    pie: acciones([{ texto: 'No, volver', accion: 'no' }, { texto: vista.total > 0 ? 'Sí, cancelar y devolver' : 'Sí, cancelar', accion: 'si', tipo: 'peligro' }]),
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="no"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="si"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => cancelar(p.id));
    if (r.ok) { await cerrarTodasLasHojas(); notificar(`${tipoTxt[0].toUpperCase() + tipoTxt.slice(1)} cancelado.`); }
  });
}
