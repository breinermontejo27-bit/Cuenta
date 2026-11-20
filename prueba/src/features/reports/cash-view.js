// Reportes › Caja: cierre diario y mensual, movimientos del día y cierre de cada día (renderCajaHtml, L1645–1740).

import { coleccion, leerInterfaz, escribirInterfaz } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero, fecha, folio } from '../../ui/format.js';
import { segmentos } from '../../ui/components/segmented.js';
import { campo } from '../../ui/components/fields.js';
import { destacada, cifras, seccion, tarjetaLineas, nota } from '../../ui/components/cards.js';
import { insignia } from '../../ui/components/list.js';
import { resumenCaja, rangoDia, rangoMes, movimientosDelDia, diasConMovimiento } from '../../business/accounting.js';

const nombreMes = (m) => new Date(m + '-01T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

function tituloMovimiento(m) {
  const ref = m.folio ? ` · ${folio(m.folio)}` : '';
  if (m.tipo === 'venta') return `Venta · ${m.cliente}${ref}`;
  if (m.tipo === 'abono-credito') return `Abono de crédito · ${m.cliente}${ref}`;
  if (m.tipo === 'venta-anterior') return `Venta anterior · ${m.cliente}${ref}`;
  if (m.tipo === 'abono-pendiente') return `Abono de ${m.tipoPendiente} · ${m.cliente}${m.cancelado ? ' (cancelado)' : ''}`;
  return `${m.categoria ? m.categoria + ' · ' : ''}${m.descripcion}`;
}

export function dibujarCaja(contenedor) {
  const dia = hoy();
  const modo = leerInterfaz('caja:modo', 'dia');
  const fechaDia = leerInterfaz('caja:fecha', dia);
  const mes = leerInterfaz('caja:mes', dia.slice(0, 7));
  const datos = { ventas: coleccion('ventas'), pedidos: coleccion('pedidos'), gastos: coleccion('gastos') };
  const esDia = modo === 'dia';
  const C = resumenCaja(datos, esDia ? rangoDia(fechaDia) : rangoMes(mes), dia);
  let detalle = '';
  if (esDia) {
    const movs = movimientosDelDia(datos, fechaDia, dia);
    detalle = html`<details class="plegable"><summary>Movimientos del día ${insignia('neutra', String(movs.length))}</summary>
      ${movs.length ? tarjetaLineas(movs.map((m) => [html`<span class="linea-titulo">${tituloMovimiento(m)}</span><span class="linea-sub">${m.metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}</span>`, `${m.ingreso ? '' : '−'}${dinero(m.monto)}`, '', m.ingreso ? 'pos' : 'neg'])) : nota('No hay movimientos este día.')}</details>`;
  } else {
    const dias = diasConMovimiento(datos, mes);
    if (dias.length) detalle = seccion('Cierre de cada día', tarjetaLineas(dias.map((d) => {
      const r = resumenCaja(datos, rangoDia(d), dia);
      return [html`<span class="linea-titulo">${fecha(d)}</span><span class="linea-sub">Efectivo ${dinero(r.efectivo)} · Tarjeta ${dinero(r.tarjeta)} · Gastos ${dinero(r.gastosTot)}</span>`, dinero(r.neto), '', r.neto < 0 ? 'neg' : 'pos'];
    })));
  }
  montar(contenedor, html`
    ${segmentos('modo-caja', [['dia', 'Diario'], ['mes', 'Mensual']], modo)}
    ${campo({ id: 'caja_fecha', etiqueta: esDia ? 'Día' : 'Mes', tipo: esDia ? 'date' : 'month', valor: esDia ? fechaDia : mes })}
    ${destacada({ etiqueta: `Cierre de caja · ${esDia ? fecha(fechaDia) : nombreMes(mes)}`, valor: dinero(C.neto), clase: C.neto < 0 ? 'neg' : 'pos', detalle: `${dinero(C.ingresos)} en ingresos · ${dinero(C.gastosTot)} en egresos` })}
    ${nota('Se calcula sola con tus ventas, abonos y gastos. No tienes que cerrar nada: siempre está al día.')}
    ${seccion('Ingresos', html`${cifras([{ etiqueta: 'Efectivo', valor: dinero(C.efectivo) }, { etiqueta: 'Tarjeta', valor: dinero(C.tarjeta) }])}${tarjetaLineas([['Total ingresos', dinero(C.ingresos), 'fuerte']])}${nota(`De los ingresos, ${dinero(C.abonosCred)} son abonos de créditos.`)}`)}
    ${seccion('Egresos', tarjetaLineas([['Compras de inventario', dinero(C.compras)], ['Otros gastos', dinero(C.otros)], ['Total egresos', dinero(C.gastosTot), 'fuerte']]))}
    ${detalle}`);
  contenedor.querySelectorAll('[data-grupo="modo-caja"] button').forEach((b) => b.addEventListener('click', () => { escribirInterfaz('caja:modo', b.dataset.valor); dibujarCaja(contenedor); }));
  contenedor.querySelector('#caja_fecha').addEventListener('change', (e) => {
    if (esDia) escribirInterfaz('caja:fecha', e.target.value || fechaDia); else escribirInterfaz('caja:mes', e.target.value || mes);
    dibujarCaja(contenedor);
  });
}
