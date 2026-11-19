// Ventas › Pendientes: pedidos (vencidos / hoy / próximos), encargos y apartados (renderPedidosHtml, L921–993).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar, icono } from '../../ui/html.js';
import { dinero, fecha } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { acciones } from '../../ui/components/fields.js';
import { estadoVacio, fila, lista, insignia, etiquetaGrupo, alTocarFila } from '../../ui/components/list.js';
import { agruparPendientes, estadoPorFecha, sumaPendiente, totalApartado, abonadoPendiente } from '../../business/orders-rules.js';
import { abrirFormularioPendiente } from './pending-form.js';
import { abrirDetallePendiente } from './pending-detail.js';
import { abrirDetalleApartado } from './layaway-detail.js';

function filaPendiente(p, dia) {
  const resumen = p.items.map((it) => `${it.cantidad} × ${it.nombre}`).join(', ');
  if (p.tipo === 'apartado') {
    const total = totalApartado(p, obtenerAjustes().impuesto), abonado = abonadoPendiente(p), saldo = Math.max(0, total - abonado);
    return fila({ datos: { pendiente: p.id }, titulo: p.clienteNombre, sub: resumen, sub2: `Abonado ${dinero(abonado)} de ${dinero(total)}`, insignias: [saldo <= 0 ? insignia('pagado', 'Pagado') : insignia('deuda', 'Falta ' + dinero(saldo))] });
  }
  const estado = estadoPorFecha(p, dia);
  const anticipo = Number(p.anticipo) || 0;
  const etiqueta = { 'sin-fecha': insignia('neutra', 'Sin fecha'), vencido: insignia('vencido', 'Vencido · ' + fecha(p.fechaEntrega)), hoy: insignia('info', 'Hoy'), proximo: insignia('neutra', p.fechaEntrega ? fecha(p.fechaEntrega) : '') }[estado];
  return fila({ datos: { pendiente: p.id }, titulo: p.clienteNombre, sub: resumen, sub2: anticipo > 0 ? `Abono ${dinero(anticipo)} · Resto ${dinero(Math.max(0, sumaPendiente(p) - anticipo))}` : '', insignias: [etiqueta] });
}

function seccion(titulo, n, contenido) {
  return html`<details class="plegable"><summary>${titulo} ${insignia('info', String(n))}${icono('abajo')}</summary>${n ? contenido : html`<p class="nota">Sin registros.</p>`}</details>`;
}

export function dibujarPendientes(contenedor, busqueda) {
  const dia = hoy();
  const g = agruparPendientes(coleccion('pedidos'), dia, busqueda);
  if (!g.hayResultados) {
    montar(contenedor, estadoVacio(g.hayPendientes
      ? { icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro nombre de cliente.' }
      : { icono: 'calendario', titulo: 'Sin pendientes', texto: 'Toca "Nuevo pendiente" para registrar un pedido, un encargo o un apartado.' }));
    return;
  }
  const subgrupo = (titulo, arr) => (arr.length ? html`${etiquetaGrupo(titulo)}${lista(arr.map((p) => filaPendiente(p, dia)))}` : '');
  montar(contenedor, html`
    ${seccion('Pedidos', g.pedidos.total, html`${subgrupo('Vencidos', g.pedidos.vencidos)}${subgrupo('Para hoy', g.pedidos.hoy)}${subgrupo('Próximas entregas', g.pedidos.proximos)}`)}
    ${seccion('Encargos', g.encargos.total, html`${subgrupo('Con llegada estimada', g.encargos.conFecha)}${subgrupo('Sin fecha estimada', g.encargos.sinFecha)}`)}
    ${seccion('Apartados', g.apartados.total, lista(g.apartados.lista.map((p) => filaPendiente(p, dia))))}`);
  alTocarFila(contenedor, 'pendiente', (id) => {
    const p = coleccion('pedidos').find((x) => x.id === id);
    if (p && p.tipo === 'apartado') abrirDetalleApartado(id); else abrirDetallePendiente(id);
  });
}

/** ¿Qué registrar? Pedido, encargo o apartado (openNuevoPendiente, L904–919). */
export function elegirTipoPendiente() {
  const capa = abrirHoja({
    titulo: '¿Qué quieres registrar?',
    paso: 'Elige según el caso',
    cuerpo: lista([
      fila({ datos: { tipo: 'pedido' }, icono: 'calendario', titulo: 'Pedido', sub: 'Productos que tienes en stock, con fecha de entrega.' }),
      fila({ datos: { tipo: 'encargo' }, icono: 'inventario', titulo: 'Encargo', sub: 'Productos que todavía no tienes. Se entregan cuando llegan.' }),
      fila({ datos: { tipo: 'apartado' }, icono: 'caja', titulo: 'Apartado', sub: 'Productos del stock sin fecha, que se pagan por abonos.' }),
    ]),
    pie: acciones([{ texto: 'Cancelar', accion: 'cancelar' }]),
  });
  capa.elemento.querySelector('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
  alTocarFila(capa.elemento, 'tipo', async (tipo) => { await capa.cerrar(); abrirFormularioPendiente(null, tipo); });
}
