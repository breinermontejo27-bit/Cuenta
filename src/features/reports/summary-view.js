// Reportes › Resumen: ganancia del período, comparación, movimiento, histórico, inventario y más vendidos.

import { coleccion, obtenerAjustes, leerInterfaz, escribirInterfaz } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { chips } from '../../ui/components/segmented.js';
import { destacada, cifras, seccion, tarjetaLineas, nota } from '../../ui/components/cards.js';
import { resumenReportes } from '../../business/accounting.js';

const ETIQUETA = { mes: 'este mes', anterior: 'el mes anterior', todo: 'todo el tiempo' };

export function dibujarResumen(contenedor) {
  const periodo = leerInterfaz('reportes:periodo', 'mes');
  const r = resumenReportes({ ventas: coleccion('ventas'), gastos: coleccion('gastos'), inventario: coleccion('inventario') }, periodo, obtenerAjustes(), hoy());
  const P = r.periodo, A = r.historico;
  const cmp = r.comparacion ? (r.comparacion.sinDatos ? 'Sin datos del mes anterior para comparar'
    : `${r.comparacion.diferencia >= 0 ? '▲' : '▼'} ${dinero(Math.abs(r.comparacion.diferencia))} frente al mes anterior`) : '';
  montar(contenedor, html`
    ${chips('periodo', [['mes', 'Este mes'], ['anterior', 'Mes anterior'], ['todo', 'Todo']], periodo)}
    ${destacada({ etiqueta: `Ganancia de ${ETIQUETA[periodo]}`, valor: dinero(P.ganancia), clase: P.ganancia >= 0 ? 'pos' : 'neg', detalle: html`${dinero(P.ventasTot)} en ventas · ${dinero(P.costo)} de costo de lo vendido${cmp ? html`<br>${cmp}` : ''}` })}
    ${nota('Ganancia = ventas − costo de lo vendido − otros gastos. Las compras de inventario no restan hasta que se venden.')}
    ${seccion('Movimiento', html`${cifras([{ etiqueta: 'Ventas', valor: dinero(P.ventasTot), clase: 'pos' }, { etiqueta: 'Gastos totales', valor: dinero(P.gastosTot) }])}${tarjetaLineas([['Costo de lo vendido', dinero(P.costo)], ['Compras de inventario', dinero(P.compras)], ['Otros gastos', dinero(P.otros)]])}`)}
    ${seccion('Histórico total', tarjetaLineas([['Ventas', dinero(A.ventasTot), '', 'pos'], ['Por cobrar (créditos)', dinero(r.porCobrar), '', r.porCobrar > 0 ? 'neg' : ''], ['Ganancia', dinero(A.ganancia), 'fuerte', A.ganancia >= 0 ? 'pos' : 'neg']]))}
    ${seccion('Inventario', cifras([{ etiqueta: 'Valor de costo en stock', valor: dinero(r.valorInventario) }, { etiqueta: 'Productos con poco stock', valor: r.pocoStock, clase: r.pocoStock > 0 ? 'neg' : '' }]))}
    ${r.masVendidos.length ? seccion('Productos más vendidos', tarjetaLineas(r.masVendidos.map(([nombre, cant], i) => [`${i + 1} · ${nombre}`, `${cant} unid.`])))
      : nota('Cuando registres ventas en este período, aquí verás tus productos más vendidos.')}`);
  contenedor.querySelectorAll('[data-grupo="periodo"] .chip').forEach((b) => b.addEventListener('click', () => {
    escribirInterfaz('reportes:periodo', b.dataset.valor);
    dibujarResumen(contenedor);
  }));
}
