// Reportes › Resumen: ganancia del período, comparación, movimiento, histórico, inventario y más vendidos.

import { coleccion, obtenerAjustes, leerInterfaz, escribirInterfaz } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { chips } from '../../ui/components/segmented.js';
import { destacada, cifras, seccion, tarjetaLineas, nota } from '../../ui/components/cards.js';
import { resumenReportes } from '../../business/accounting.js';
import { mesDe, mesAnterior } from '../../business/dates.js';
import { insignia } from '../../ui/components/list.js';

const ETIQUETA = { mes: 'este mes', anterior: 'el mes anterior', todo: 'todo el tiempo' };

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Ganancia de los últimos 6 meses en barras. Usa el mismo cálculo de "Este mes" (resumenReportes), mes por mes:
 * no hay cálculos nuevos. Las cifras exactas están en el resumen de cada mes; el gráfico muestra la tendencia.
 */
function graficoSeisMeses() {
  const datos = { ventas: coleccion('ventas'), gastos: coleccion('gastos'), inventario: coleccion('inventario') };
  const meses = [mesDe(hoy())];
  while (meses.length < 6) meses.unshift(mesAnterior(`${meses[0]}-15`));
  const valores = meses.map((m) => resumenReportes(datos, 'mes', obtenerAjustes(), `${m}-15`).periodo.ganancia);
  const max = Math.max(...valores.map((v) => Math.abs(v)), 1);
  return seccion('Ganancia de los últimos 6 meses', html`<div class="tarjeta"><div class="barras" role="img" aria-label="Ganancia de cada uno de los últimos 6 meses">${meses.map((m, i) => html`
    <div class="barra-mes"><i class="${valores[i] < 0 ? 'neg' : ''}${i === meses.length - 1 ? ' actual' : ''}" data-alto="${Math.round(Math.abs(valores[i]) / max * 100)}"></i><small>${MES_CORTO[Number(m.slice(5, 7)) - 1]}</small></div>`)}</div></div>`);
}

export function dibujarResumen(contenedor) {
  const periodo = leerInterfaz('reportes:periodo', 'mes');
  const r = resumenReportes({ ventas: coleccion('ventas'), gastos: coleccion('gastos'), inventario: coleccion('inventario') }, periodo, obtenerAjustes(), hoy());
  const P = r.periodo, A = r.historico;
  const cmp = r.comparacion ? (r.comparacion.sinDatos ? 'Sin datos del mes anterior para comparar'
    : `${r.comparacion.diferencia >= 0 ? '▲' : '▼'} ${dinero(Math.abs(r.comparacion.diferencia))} frente al mes anterior`) : '';
  const cmpEtiqueta = cmp ? insignia(!r.comparacion || r.comparacion.sinDatos ? 'neutra' : r.comparacion.diferencia >= 0 ? 'pagado' : 'deuda', cmp) : '';
  montar(contenedor, html`
    ${chips('periodo', [['mes', 'Este mes'], ['anterior', 'Mes anterior'], ['todo', 'Todo']], periodo)}
    ${destacada({ etiqueta: `Ganancia de ${ETIQUETA[periodo]}`, valor: dinero(P.ganancia), clase: P.ganancia >= 0 ? 'pos' : 'neg', detalle: html`${dinero(P.ventasTot)} en ventas · ${dinero(P.costo)} de costo de lo vendido${cmpEtiqueta ? html`<span class="destacada-cmp">${cmpEtiqueta}</span>` : ''}` })}
    ${graficoSeisMeses()}
    ${nota('Ganancia = ventas − costo de lo vendido − otros gastos. Las compras de inventario no restan hasta que se venden.')}
    ${seccion('Movimiento', html`${cifras([{ etiqueta: 'Ventas', valor: dinero(P.ventasTot), clase: 'pos' }, { etiqueta: 'Gastos totales', valor: dinero(P.gastosTot) }])}${tarjetaLineas([['Costo de lo vendido', dinero(P.costo)], ['Compras de inventario', dinero(P.compras)], ['Otros gastos', dinero(P.otros)]])}`)}
    ${seccion('Histórico total', tarjetaLineas([['Ventas', dinero(A.ventasTot), '', 'pos'], ['Por cobrar (créditos)', dinero(r.porCobrar), '', r.porCobrar > 0 ? 'neg' : ''], ['Ganancia', dinero(A.ganancia), 'fuerte', A.ganancia >= 0 ? 'pos' : 'neg']]))}
    ${seccion('Inventario', cifras([{ etiqueta: 'Valor de costo en stock', valor: dinero(r.valorInventario) }, { etiqueta: 'Productos con poco stock', valor: r.pocoStock, clase: r.pocoStock > 0 ? 'neg' : '' }]))}
    ${r.masVendidos.length ? seccion('Productos más vendidos', tarjetaLineas(r.masVendidos.map(([nombre, cant], i) => [`${i + 1} · ${nombre}`, `${cant} unid.`])))
      : nota('Cuando registres ventas en este período, aquí verás tus productos más vendidos.')}`);
  contenedor.querySelectorAll('.barra-mes i[data-alto]').forEach((b) => { b.style.height = `${Math.max(2, Number(b.dataset.alto) || 0)}%`; });
  contenedor.querySelectorAll('[data-grupo="periodo"] .chip').forEach((b) => b.addEventListener('click', () => {
    escribirInterfaz('reportes:periodo', b.dataset.valor);
    dibujarResumen(contenedor);
  }));
}
