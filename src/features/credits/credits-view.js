// Créditos: clientes que deben y deuda de un cliente (liquidar y recordatorio por WhatsApp).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { html } from '../../ui/html.js';
import { dinero, fecha, folio } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { confirmar } from '../../ui/overlays/dialog.js';
import { notificar } from '../../ui/notifications/toast.js';
import { acciones, botonTexto } from '../../ui/components/fields.js';
import { segmentos } from '../../ui/components/segmented.js';
import { fila, lista, alTocarFila, estadoVacio } from '../../ui/components/list.js';
import { destacada, nota } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { liquidarDeuda } from '../../operations/credits.js';
import { deudores, ventasConSaldo, saldoVenta, abonadoVenta } from '../../business/payments.js';
import { abrirWhatsApp } from '../../services/whatsapp.js';
import { abrirAbono } from './payment-form.js';

export function abrirDeudores(alVolver) {
  const ventas = coleccion('ventas');
  const lista_ = deudores(coleccion('clientes'), ventas);
  const total = lista_.reduce((s, x) => s + x.deuda, 0);
  const volver = async () => { await capa.cerrar(); if (alVolver) alVolver(); };
  const capa = abrirHoja({
    titulo: 'Créditos',
    paso: 'Clientes que te deben dinero',
    cuerpo: html`
      ${destacada({ etiqueta: 'Total por cobrar', valor: dinero(total), clase: total > 0 ? 'neg' : '', detalle: `${lista_.length} ${lista_.length === 1 ? 'cliente con saldo pendiente' : 'clientes con saldo pendiente'}` })}
      ${lista_.length ? lista(lista_.map(({ cliente, deuda }) => fila({ datos: { cliente: cliente.id }, iniciales: cliente.nombre, titulo: cliente.nombre, sub: `${ventas.filter((v) => v.clienteId === cliente.id && saldoVenta(v) > 0).length} venta(s) a crédito pendientes`, valor: dinero(deuda), valorClase: 'neg' })))
        : estadoVacio({ icono: 'caja', titulo: 'Sin créditos pendientes', texto: 'Cuando registres una venta a crédito, aparecerá aquí.' })}`,
    pie: acciones([{ texto: 'Volver', accion: 'volver' }]),
    alAtras: alVolver ? volver : null,
  });
  capa.elemento.querySelector('[data-accion="volver"]').addEventListener('click', volver);
  alTocarFila(capa.elemento, 'cliente', async (clienteId) => { await capa.cerrar(); abrirDeudaCliente(clienteId, () => abrirDeudores(alVolver)); });
}

export function abrirDeudaCliente(clienteId, alVolver) {
  const c = coleccion('clientes').find((x) => x.id === clienteId);
  if (!c) { if (alVolver) alVolver(); return; }
  const pendientes = ventasConSaldo(coleccion('ventas'), clienteId);
  const deuda = pendientes.reduce((s, v) => s + saldoVenta(v), 0);
  const volver = async () => { await capa.cerrar(); if (alVolver) alVolver(); };
  const capa = abrirHoja({
    titulo: c.nombre,
    paso: pendientes.length ? `Debe en total ${dinero(deuda)}` : 'Sin deudas pendientes',
    cuerpo: pendientes.length ? html`
      ${lista(pendientes.map((v) => fila({ datos: { venta: v.id }, titulo: `${fecha(v.fecha)} · ${v.folio ? folio(v.folio) : 'Sin factura'}`, sub: `Abonado ${dinero(abonadoVenta(v))} de ${dinero(v.total)}`, valor: dinero(saldoVenta(v)), valorClase: 'neg' })))}
      ${nota('Toca una venta para abonar.')}
      ${botonTexto('Enviar recordatorio por WhatsApp', 'whatsapp')}
      <div data-zona="liquidar"></div>` : nota('Este cliente no tiene deudas pendientes.'),
    pie: acciones(pendientes.length ? [{ texto: 'Volver', accion: 'volver' }, { texto: 'Liquidar deuda', accion: 'liquidar', tipo: 'primario' }] : [{ texto: 'Volver', accion: 'volver' }]),
    alAtras: alVolver ? volver : null,
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="volver"]').addEventListener('click', volver);
  alTocarFila(el, 'venta', async (ventaId) => { await capa.cerrar(); abrirAbono(ventaId, () => abrirDeudaCliente(clienteId, alVolver)); });
  const wa = el.querySelector('[data-accion="whatsapp"]');
  if (wa) wa.addEventListener('click', () => abrirWhatsApp(c.telefono, `Hola ${c.nombre}, tienes un saldo pendiente de ${dinero(deuda)} en ${obtenerAjustes().nombre}. ¡Gracias!`));
  const liq = el.querySelector('[data-accion="liquidar"]');
  if (liq) liq.addEventListener('click', async () => {
    const zona = el.querySelector('[data-zona="liquidar"]');
    if (!zona.childElementCount) {
      zona.insertAdjacentHTML('beforeend', html`<div class="tarjeta">${nota(`Se registrará un abono por ${dinero(deuda)} para cerrar todas las ventas de ${c.nombre}. Elige el medio y toca de nuevo "Liquidar deuda".`)}${segmentos('liq', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], 'efectivo')}</div>`.texto);
      zona.scrollIntoView({ block: 'nearest' });
      return;
    }
    const medio = zona.querySelector('[data-grupo="liq"] [aria-pressed="true"]').dataset.valor;
    if (!(await confirmar({ titulo: '¿Liquidar la deuda?', mensaje: `Abono de ${dinero(deuda)} con ${medio === 'tarjeta' ? 'tarjeta' : 'efectivo'}.`, aceptar: 'Sí, liquidar' }))) return;
    const r = await operar(el, liq, () => liquidarDeuda(c.id, medio));
    if (r.ok) { notificar('Deuda liquidada.', { tipo: 'exito' }); await volver(); }
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-grupo="liq"] button');
    if (!b) return;
    el.querySelectorAll('[data-grupo="liq"] button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
}
