// Ventas › Ventas: lista agrupada por día (teléfono) y tabla (computador) (renderVentasLista, L1553–1574).

import { coleccion } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero, fecha, folio, etiquetaMedio } from '../../ui/format.js';
import { estadoVacio, fila, lista, insignia, etiquetaGrupo, alTocarFila, paginar, botonMostrarMas, conectarMostrarMas } from '../../ui/components/list.js';
import { filtrarVentas } from '../../business/sales-rules.js';
import { saldoVenta } from '../../business/payments.js';
import { abrirDetalleVenta } from './sale-detail.js';

export function dibujarVentas(contenedor, busqueda) {
  const todas = coleccion('ventas');
  const items = filtrarVentas(todas, busqueda);
  if (!items.length) {
    montar(contenedor, estadoVacio(todas.length
      ? { icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro nombre o folio.' }
      : { icono: 'ventas', titulo: 'Aún no tienes ventas', texto: 'Toca "Nueva venta" para registrar la primera.' }));
    return;
  }
  const pag = paginar(items, `ventas|${busqueda || ''}`);
  const grupos = [];
  for (const v of pag.visibles) {
    if (!grupos.length || grupos[grupos.length - 1].fecha !== v.fecha) grupos.push({ fecha: v.fecha, ventas: [] });
    grupos[grupos.length - 1].ventas.push(v);
  }
  const sub = (v) => `${v.folio ? 'Factura ' + folio(v.folio) : 'Sin factura'}${etiquetaMedio(v.metodoPago) ? ' · ' + etiquetaMedio(v.metodoPago) : ''}`;
  montar(contenedor, html`
    <div class="solo-movil">${grupos.map((g) => html`${etiquetaGrupo(g.fecha === hoy() ? 'Hoy' : fecha(g.fecha), `${g.ventas.length} · ${dinero(g.ventas.reduce((s, v) => s + (Number(v.total) || 0), 0))}`)}${lista(g.ventas.map((v) => fila({
      datos: { id: v.id }, iniciales: v.clienteNombre, titulo: v.clienteNombre, sub: sub(v), valor: dinero(v.total),
      insignias: saldoVenta(v) > 0 ? [insignia('deuda', 'Debe ' + dinero(saldoVenta(v)))] : [],
    })))}`)}</div>
    <table class="tabla solo-escritorio">
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Factura</th><th>Pago</th><th class="der">Total</th><th class="der">Saldo</th></tr></thead>
      <tbody>${pag.visibles.map((v) => html`<tr data-id="${v.id}" tabindex="0"><td>${fecha(v.fecha)}</td><td><strong>${v.clienteNombre}</strong></td><td>${v.folio ? folio(v.folio) : insignia('neutra', 'Sin factura')}</td><td>${etiquetaMedio(v.metodoPago)}</td><td class="der num">${dinero(v.total)}</td><td class="der num ${saldoVenta(v) > 0 ? 'neg' : 'ter'}">${saldoVenta(v) > 0 ? dinero(saldoVenta(v)) : '—'}</td></tr>`)}</tbody>
    </table>
    ${botonMostrarMas(pag)}`);
  alTocarFila(contenedor, 'id', abrirDetalleVenta);
  conectarMostrarMas(contenedor, () => dibujarVentas(contenedor, busqueda));
  contenedor.querySelectorAll('tr[data-id]').forEach((tr) => {
    tr.addEventListener('click', () => abrirDetalleVenta(tr.dataset.id));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrirDetalleVenta(tr.dataset.id); });
  });
}
