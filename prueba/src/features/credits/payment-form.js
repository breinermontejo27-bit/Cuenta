// Abono a una venta a crédito (RC-04): monto (se limita al saldo), fecha, nota y medio.

import { coleccion } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html } from '../../ui/html.js';
import { dinero, fecha, folio, etiquetaMedio } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, valor, acciones } from '../../ui/components/fields.js';
import { segmentos, conectarSegmentos } from '../../ui/components/segmented.js';
import { seccion, tarjetaLineas, nota } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { abonarVenta } from '../../operations/credits.js';
import { saldoVenta, abonadoVenta } from '../../business/payments.js';
import { compararTexto } from '../../business/text.js';

export function abrirAbono(ventaId, alVolver) {
  const v = coleccion('ventas').find((x) => x.id === ventaId);
  if (!v) return;
  const saldo = saldoVenta(v);
  const abonos = (v.abonos || []).slice().sort((a, b) => compararTexto(b.fecha, a.fecha));
  const volver = async () => { await capa.cerrar(); if (alVolver) alVolver(); };
  const capa = abrirHoja({
    titulo: 'Registrar abono',
    paso: `${v.clienteNombre} · ${v.folio ? folio(v.folio) + ' · ' : ''}${fecha(v.fecha)}`,
    cuerpo: html`
      ${tarjetaLineas([['Total de la venta', dinero(v.total)], ['Abonado', dinero(abonadoVenta(v)), '', 'pos'], ['Saldo pendiente', dinero(saldo), 'fuerte', saldo > 0 ? 'neg' : 'pos']])}
      ${saldo > 0 ? html`
        ${filaCampos(campo({ id: 'ab_monto', etiqueta: 'Monto', tipo: 'number', dinero: true, valor: saldo }), campo({ id: 'ab_fecha', etiqueta: 'Fecha', tipo: 'date', valor: hoy() }))}
        ${campo({ id: 'ab_nota', etiqueta: 'Nota (opcional)', placeholder: 'Ej. Nequi, transferencia, número de recibo' })}
        <div class="campo"><span class="etiqueta-campo">Medio de pago</span>${segmentos('medio', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], 'efectivo')}</div>`
        : nota('Esta venta ya está pagada por completo.')}
      ${abonos.length ? seccion('Abonos registrados', tarjetaLineas(abonos.map((a) => [`${fecha(a.fecha)}${a.nota ? ' · ' + a.nota : ''}${etiquetaMedio(a.metodo) ? ' · ' + etiquetaMedio(a.metodo) : ''}`, dinero(a.monto)]))) : ''}`,
    pie: acciones(saldo > 0 ? [{ texto: 'Volver', accion: 'volver' }, { texto: 'Registrar abono', accion: 'guardar', tipo: 'primario' }] : [{ texto: 'Volver', accion: 'volver' }]),
    alAtras: alVolver ? volver : null,
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="volver"]').addEventListener('click', volver);
  const medio = conectarSegmentos(el, 'medio');
  const guardar = el.querySelector('[data-accion="guardar"]');
  if (guardar) guardar.addEventListener('click', async () => {
    const r = await operar(el, guardar, () => abonarVenta(v.id, { monto: valor(el, 'ab_monto'), fecha: valor(el, 'ab_fecha'), nota: valor(el, 'ab_nota'), metodo: medio() || 'efectivo' }));
    if (r.ok) { notificar('Abono registrado.', { tipo: 'exito' }); await volver(); }
  });
}
