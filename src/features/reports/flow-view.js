// Reportes › Flujo: dinero disponible, por cobrar y acumulado por mes (renderFlujoHtml, L1742–1786).

import { coleccion } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { destacada, seccion, tarjetaLineas, nota } from '../../ui/components/cards.js';
import { flujo } from '../../business/accounting.js';

const nombreMes = (m) => { const n = new Date(m + '-01T12:00:00').toLocaleDateString('es-CO', { month: 'long' }); return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + m.slice(0, 4); };

export function dibujarFlujo(contenedor) {
  const f = flujo({ ventas: coleccion('ventas'), pedidos: coleccion('pedidos'), gastos: coleccion('gastos') }, hoy());
  montar(contenedor, html`
    ${destacada({ etiqueta: 'Dinero disponible hoy', valor: dinero(f.disponible), clase: f.disponible < 0 ? 'neg' : 'pos', detalle: `${dinero(f.efectivo)} en efectivo · ${dinero(f.tarjeta)} en tarjeta` })}
    ${seccion('Por cobrar', tarjetaLineas([['Créditos de clientes', dinero(f.porCredito)], ['Saldos de encargos y apartados', dinero(f.porPedidos)], ['Total por cobrar', dinero(f.porCobrar), 'fuerte']]))}
    ${seccion('Flujo por mes', f.filas.length ? tarjetaLineas(f.filas.slice().reverse().map((x) => [
      html`<span class="linea-titulo">${nombreMes(x.mes)}</span><span class="linea-sub">entró ${dinero(x.entradas)} · salió ${dinero(x.salidas)}</span><span class="linea-sub">Efectivo ${dinero(x.efectivo)} · Tarjeta ${dinero(x.tarjeta)}</span>`,
      dinero(x.acumulado), '', x.acumulado < 0 ? 'neg' : 'pos',
    ])) : nota('Aún no hay movimientos.'))}
    ${nota('El número de cada mes es el dinero acumulado hasta ese mes. Los abonos cuentan desde el día en que se reciben.')}`);
}
