// Módulo Inventario: Productos, Stock e Historial (L785–845).

import { coleccion, obtenerAjustes, leerInterfaz, escribirInterfaz } from '../../core/state.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { estadoVacio, fila, lista, insignia, alTocarFila, paginar, botonMostrarMas, conectarMostrarMas } from '../../ui/components/list.js';
import { chips } from '../../ui/components/segmented.js';
import { banner } from '../../ui/components/cards.js';
import { categorias, esPocoStock, gananciaUnitaria, unidadesReservadas, tieneControlStock } from '../../business/inventory-rules.js';
import { abrirFormularioProducto } from './product-form.js';
import { abrirPocoStock } from './low-stock.js';
import { dibujarStock } from './stock-view.js';
import { dibujarHistorial } from './history-view.js';
import { contiene } from '../../business/text.js';

function dibujarProductos(contenedor, busqueda) {
  const inv = coleccion('inventario'), pedidos = coleccion('pedidos'), aj = obtenerAjustes();
  const cats = categorias(inv);
  let cat = leerInterfaz('inventario:categoria', '');
  if (cat && !cats.includes(cat)) { cat = ''; escribirInterfaz('inventario:categoria', ''); }
  const termino = String(busqueda || '').trim().toLowerCase();
  let items = inv.filter((p) => contiene(p.nombre, termino));
  if (cat) items = items.filter((p) => p.categoria === cat);
  const bajos = inv.filter((p) => esPocoStock(p, aj));
  const pag = paginar(items, `productos|${cat}|${termino}`);
  const filas = pag.visibles.map((p) => {
    const g = gananciaUnitaria(p);
    const res = unidadesReservadas(pedidos, inv, p.id);
    const control = tieneControlStock(p);
    const bajo = esPocoStock(p, aj);
    const costo = Number(p.costo) || 0;
    const etiquetaStock = !control ? insignia('neutra', 'Sin control de stock') : bajo ? insignia('aviso', `${p.stock} · poco stock`) : insignia('pagado', `${p.stock} en stock`);
    return fila({
      datos: { id: p.id }, foto: p.foto, iniciales: p.foto ? undefined : p.nombre,
      titulo: p.nombre, sub: [p.categoria, costo > 0 ? 'Costo ' + dinero(costo) : ''].filter(Boolean).join(' · ') || 'Sin categoría',
      sub2: g ? `Gana ${dinero(g.ganancia)} por unidad (${g.porcentaje >= 0 ? '+' : ''}${g.porcentaje}%)` : '', sub2Clase: g ? (g.ganancia < 0 ? 'neg' : 'pos') : '',
      valor: dinero(p.precio), insignias: [etiquetaStock],
      extra: control && res > 0 ? [insignia('info', `${res} reservadas · ${Math.max(0, p.stock - res)} disponibles`)] : [],
    });
  });
  montar(contenedor, html`
    ${cats.length ? chips('categoria', [['', 'Todas'], ...cats.map((c) => [c, c])], cat) : ''}
    ${bajos.length ? banner('aviso', `Poco stock (${bajos.length}) · toca para revisar`, bajos.map((p) => p.nombre).join(', '), 'poco-stock') : ''}
    ${items.length ? html`${lista(filas)}${botonMostrarMas(pag)}` : estadoVacio(inv.length
      ? { icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro nombre o categoría.' }
      : { icono: 'inventario', titulo: 'Aún no tienes productos', texto: 'Toca "Nuevo producto" para agregar el primero.' })}`);
  alTocarFila(contenedor, 'id', abrirFormularioProducto);
  conectarMostrarMas(contenedor, () => dibujarProductos(contenedor, busqueda));
  contenedor.querySelectorAll('[data-grupo="categoria"] .chip').forEach((b) => b.addEventListener('click', () => {
    escribirInterfaz('inventario:categoria', b.dataset.valor);
    dibujarProductos(contenedor, busqueda);
  }));
  const ban = contenedor.querySelector('[data-accion="poco-stock"]');
  if (ban) ban.addEventListener('click', abrirPocoStock);
}

export default {
  id: 'inventario',
  titulo: 'Inventario',
  icono: 'inventario',
  orden: 40,
  barra: 3,
  grupo: 'Negocio',
  buscador: 'Buscar producto',
  subvistas: [{ id: 'productos', titulo: 'Productos' }, { id: 'stock', titulo: 'Stock' }, { id: 'historial', titulo: 'Historial' }],
  usa: ['inventario', 'pedidos', 'ventas', 'gastos', 'movimientos'],
  accionPrincipal: { texto: 'Nuevo producto', subvistas: ['productos'], ejecutar: () => abrirFormularioProducto(null) },
  encabezado: () => {
    const inv = coleccion('inventario');
    const unidades = inv.filter(tieneControlStock).reduce((s, p) => s + (Number(p.stock) || 0), 0);
    return { subtitulo: inv.length ? `${inv.length} ${inv.length === 1 ? 'producto' : 'productos'} · ${unidades} unidades en stock` : '' };
  },
  dibujar(contenedor, { sub, busqueda }) {
    if (sub === 'stock') dibujarStock(contenedor);
    else if (sub === 'historial') dibujarHistorial(contenedor, busqueda);
    else dibujarProductos(contenedor, busqueda);
  },
};
