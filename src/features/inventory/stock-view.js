// Inventario › Stock: resumen y detalle por producto (renderStockHtml, L749–783).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { estadoVacio } from '../../ui/components/list.js';
import { destacada, cifras, nota, seccion, tarjetaLineas } from '../../ui/components/cards.js';
import { resumenStock } from '../../business/inventory-rules.js';

export function dibujarStock(contenedor) {
  const inv = coleccion('inventario');
  if (!inv.length) { montar(contenedor, estadoVacio({ icono: 'inventario', titulo: 'Aún no tienes productos', texto: 'Agrega productos en la pestaña Productos.' })); return; }
  const r = resumenStock(inv, coleccion('pedidos'), obtenerAjustes());
  montar(contenedor, html`
    ${destacada({ etiqueta: 'Costo total del inventario', valor: dinero(r.valorCosto), detalle: `${r.productos} productos · ${r.unidades} unidades en stock` })}
    ${cifras([
      { etiqueta: 'Cantidad de productos', valor: r.productos }, { etiqueta: 'Unidades en stock', valor: r.unidades },
      { etiqueta: 'Valor a precio de venta', valor: dinero(r.valorVenta) }, { etiqueta: 'Reservadas para pedidos', valor: r.reservadas },
      { etiqueta: 'Poco stock', valor: r.bajos, clase: r.bajos > 0 ? 'neg' : '' },
    ])}
    ${r.sinControl ? nota(`${r.sinControl} producto(s) sin control de stock no se cuentan en las unidades.`) : ''}
    ${seccion('Detalle por producto', tarjetaLineas(r.detalle.map((d) => [
      html`<span class="linea-titulo">${d.producto.nombre}</span><span class="linea-sub">${d.stock === null ? 'Sin control de stock' : `${d.stock} unid. × ${dinero(Number(d.producto.costo) || 0)}${d.reservadas > 0 ? ` · ${d.reservadas} reservadas · ${Math.max(0, d.stock - d.reservadas)} disponibles` : ''}`}</span>`,
      dinero(d.valor),
    ])))}`);
}
