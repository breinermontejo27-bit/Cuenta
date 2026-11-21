// Inventario › Historial: ventas, compras, ajustes, altas, bajas y devoluciones (renderHistorialHtml, L681–707).

import { coleccion } from '../../core/state.js';
import { html, montar } from '../../ui/html.js';
import { dinero, fecha, folio } from '../../ui/format.js';
import { estadoVacio } from '../../ui/components/list.js';
import { historialInventario, variacionHistorial } from '../../business/inventory-rules.js';
import { contiene } from '../../business/text.js';

const TIPO = { venta: 'Venta', compra: 'Compra', ajuste: 'Ajuste de stock', alta: 'Producto nuevo', baja: 'Producto eliminado', devolucion: 'Devolución' };
const POR_DEFECTO = { alta: 'Producto agregado', baja: 'Producto eliminado' };

function detalle(e) {
  if (e.tipo === 'venta') return `${e.cliente}${e.folio ? ' · ' + folio(e.folio) : ''} · ${dinero(e.precio)} c/u`;
  if (e.tipo === 'compra') return `${dinero(e.unitario)} c/u · total ${dinero(e.total)}`;
  return e.motivo || POR_DEFECTO[e.tipo] || 'Ajuste manual';
}

export function dibujarHistorial(contenedor, busqueda) {
  const ventas = coleccion('ventas'), gastos = coleccion('gastos'), movimientos = coleccion('movimientos');
  const termino = String(busqueda || '').trim().toLowerCase();
  const evs = historialInventario(ventas, gastos, movimientos, coleccion('inventario')).filter((e) => contiene(e.nombre, termino));
  if (!evs.length) {
    const nada = movimientos.length + ventas.length + gastos.length === 0;
    montar(contenedor, estadoVacio(nada
      ? { icono: 'inventario', titulo: 'Sin movimientos', texto: 'Aquí aparecerán tus ventas, compras, ajustes y productos agregados o eliminados.' }
      : { icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro nombre de producto.' }));
    return;
  }
  montar(contenedor, html`<div class="tarjeta"><dl class="lineas">${evs.slice(0, 200).map((e) => {
    const q = variacionHistorial(e);
    return html`<div class="linea"><dt><span class="linea-titulo">${e.nombre}</span><span class="linea-sub">${fecha(e.fecha)} · ${TIPO[e.tipo] || e.tipo}${detalle(e) ? ' · ' + detalle(e) : ''}</span></dt><dd class="${q.signo} num-fuerte">${q.texto}</dd></div>`;
  })}</dl></div>`);
}
