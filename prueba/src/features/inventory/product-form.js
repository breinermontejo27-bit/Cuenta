// Formulario de producto: crear, editar (con ajuste de stock), eliminar, historial de compras (L1997–2170).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { informarError } from '../../core/errors.js';
import { html } from '../../ui/html.js';
import { dinero, fecha } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { confirmar } from '../../ui/overlays/dialog.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, interruptor, valor, acciones, botonTexto } from '../../ui/components/fields.js';
import { selectorImagen, conectarSelectorImagen } from '../../ui/components/image-picker.js';
import { seccion, tarjetaLineas, nota } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { guardarProducto, eliminarProducto } from '../../operations/products.js';
import { categorias, comprasDeProducto, recalcularProducto, vistaPreviaProducto, tieneControlStock } from '../../business/inventory-rules.js';
import { prepararImagen } from '../../services/images.js';
import { abrirCompra } from './purchase-form.js';

export function abrirFormularioProducto(id) {
  const p = id ? coleccion('inventario').find((x) => x.id === id) : null;
  if (id && !p) return;
  const aj = obtenerAjustes();
  let foto = p && p.foto ? p.foto : '';
  const hist = p ? comprasDeProducto(p, coleccion('gastos'), coleccion('ventas')) : null;
  const historial = p ? seccion('Historial de compras', hist.compras.length ? html`
    ${tarjetaLineas([['Unidades compradas', hist.unidades, 'fuerte'], ['Total invertido', dinero(hist.invertido)], ['Costo promedio por unidad', dinero(hist.costoPromedio)], ['Unidades vendidas', hist.vendidas]])}
    ${tarjetaLineas(hist.compras.map((g) => [html`<span class="linea-titulo">${fecha(g.fecha)} · ${g.cantidad} unid.</span><span class="linea-sub">${dinero(g.cantidad ? g.monto / g.cantidad : 0)} por unidad</span>`, dinero(g.monto)]))}`
    : nota('Aún no hay compras registradas para este producto. Usa "Registrar compra" para agregarlas.')) : '';
  const capa = abrirHoja({
    titulo: p ? 'Editar producto' : 'Nuevo producto',
    cuerpo: html`
      ${campo({ id: 'f_nombre', etiqueta: 'Nombre del producto', valor: p ? p.nombre : '', placeholder: 'Nombre' })}
      ${selectorImagen('pfoto', 'Foto del producto (opcional)', foto, 'Sin foto')}
      ${campo({ id: 'f_categoria', etiqueta: 'Categoría (opcional)', valor: p ? (p.categoria || '') : '', placeholder: 'Ej. Bebidas, Ropa, Accesorios', lista: 'listaCategorias' })}
      <datalist id="listaCategorias">${categorias(coleccion('inventario')).map((c) => html`<option value="${c}">`)}</datalist>
      ${campo({ id: 'f_descripcion', etiqueta: 'Descripción para la factura (opcional)', tipo: 'textarea', valor: p ? (p.descripcion || '') : '', placeholder: 'Ej. Balines #4 en oro 18k, nacional, diamantado' })}
      ${filaCampos(
        campo({ id: 'f_costo', etiqueta: `Costo (${aj.moneda})`, tipo: 'number', dinero: true, valor: p && p.costo ? p.costo : '', placeholder: '¿Cuánto te cuesta?' }),
        campo({ id: 'f_margen', etiqueta: 'Ganancia deseada (%)', tipo: 'number', dinero: true, valor: p ? (p.margen || '') : (aj.margenDefault || ''), placeholder: 'Ej. 40' }))}
      ${filaCampos(
        campo({ id: 'f_precio', etiqueta: `Precio de venta (${aj.moneda})`, tipo: 'number', dinero: true, valor: p ? p.precio : '', placeholder: '0' }),
        campo({ id: 'f_stock', etiqueta: 'Stock (opcional)', tipo: 'number', valor: p && p.stock !== '' ? p.stock : '', placeholder: '—' }))}
      <p class="nota" data-vista-ganancia></p>
      ${campo({ id: 'f_umbral', etiqueta: 'Avisar si baja de (unid.)', tipo: 'number', valor: p && p.stockMinimo !== undefined && p.stockMinimo !== '' && p.stockMinimo !== null ? p.stockMinimo : '', placeholder: String(aj.stockMinimo), ayuda: `Déjalo vacío para usar el límite general (${aj.stockMinimo} unid.).` })}
      ${interruptor('f_sinAlerta', 'No avisar de poco stock para este producto', p && p.sinAlerta)}
      ${p ? html`<div data-zona-motivo hidden>${campo({ id: 'f_stockMotivo', etiqueta: 'Motivo del ajuste de stock (opcional)', placeholder: 'Ej. producto dañado, conteo físico, devolución' })}</div>` : ''}
      ${p ? botonTexto('Registrar compra (reabastecer stock)', 'compra') : ''}
      ${historial}
      ${p ? botonTexto('Eliminar producto', 'eliminar', true) : ''}`,
    pie: acciones([{ texto: 'Cancelar', accion: 'cancelar' }, { texto: 'Guardar', accion: 'guardar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  const $ = (sel) => el.querySelector(sel);
  conectarSelectorImagen(el, 'pfoto', 'Sin foto', { procesar: (a) => prepararImagen(a, 300), alCambiar: (d) => { foto = d; }, alFallar: (e) => informarError(e, 'foto') });
  // Precio ↔ ganancia (L2064–2091)
  let ultimo = (!p && aj.margenDefault) ? 'margen' : 'precio';
  const vista = () => {
    const v = vistaPreviaProducto($('#f_costo').value, $('#f_precio').value);
    $('[data-vista-ganancia]').textContent = v ? `Ganas ${dinero(v.ganancia)} por unidad (${v.porcentaje}% sobre el costo)` : '';
  };
  const recalcular = (fuente) => {
    const r = recalcularProducto(fuente, $('#f_costo').value, $('#f_margen').value, $('#f_precio').value);
    $('#f_precio').value = r.precio; $('#f_margen').value = r.margen;
    vista();
  };
  $('#f_costo').addEventListener('input', () => recalcular(ultimo === 'precio' ? 'precio' : 'costo'));
  $('#f_margen').addEventListener('input', () => { ultimo = 'margen'; recalcular('margen'); });
  $('#f_precio').addEventListener('input', () => { ultimo = 'precio'; recalcular('precio'); });
  vista();
  // Motivo del ajuste si cambia el stock
  const stockOriginal = p && tieneControlStock(p) ? Number(p.stock) : null;
  const motivo = $('[data-zona-motivo]');
  if (motivo) $('#f_stock').addEventListener('input', () => { const v = $('#f_stock').value === '' ? null : Number($('#f_stock').value); motivo.hidden = v === stockOriginal; });

  $('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
  $('[data-accion="guardar"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => guardarProducto(id, {
      nombre: valor(el, 'f_nombre'), categoria: valor(el, 'f_categoria'), descripcion: valor(el, 'f_descripcion'),
      costo: valor(el, 'f_costo'), margen: valor(el, 'f_margen'), precio: valor(el, 'f_precio'), stock: valor(el, 'f_stock'),
      foto, stockMinimo: valor(el, 'f_umbral'), sinAlerta: valor(el, 'f_sinAlerta'), motivo: valor(el, 'f_stockMotivo'),
    }));
    if (r.ok) { await capa.cerrar(); notificar(p ? 'Producto actualizado.' : 'Producto agregado.', { tipo: 'exito' }); }
  });
  const compra = $('[data-accion="compra"]');
  if (compra) compra.addEventListener('click', async () => { await capa.cerrar(); abrirCompra(p.id); });
  const borrar = $('[data-accion="eliminar"]');
  if (borrar) borrar.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: `¿Eliminar ${p.nombre}?`, mensaje: '¿Seguro que quieres eliminarlo del inventario? Esta acción no se puede deshacer.', aceptar: 'Sí, eliminar', peligro: true }))) return;
    const r = await operar(el, borrar, () => eliminarProducto(p.id));
    if (r.ok) { await capa.cerrar(); notificar('Producto eliminado.'); }
  });
}
