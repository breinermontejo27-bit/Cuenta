// Registrar compra desde el producto (openCompraForm, L2172–2276). Conserva el comportamiento original
// (el gasto no queda marcado como compra: D4-01, decisión 4 pendiente).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, valor, acciones } from '../../ui/components/fields.js';
import { operar } from '../../ui/operar.js';
import { comprarDesdeProducto } from '../../operations/purchases.js';
import { sincronizarCompra, tieneControlStock } from '../../business/inventory-rules.js';

export function abrirCompra(productoId) {
  const p = coleccion('inventario').find((x) => x.id === productoId);
  if (!p) return;
  const aj = obtenerAjustes();
  const stockActual = tieneControlStock(p) ? Number(p.stock) : 0;
  const costoActual = Number(p.costo) || 0;
  const capa = abrirHoja({
    titulo: 'Registrar compra',
    paso: `${p.nombre} · Stock actual: ${tieneControlStock(p) ? stockActual + ' unid.' : 'sin control'}${costoActual > 0 ? ' · Costo actual: ' + dinero(costoActual) : ''}`,
    cuerpo: html`
      ${filaCampos(campo({ id: 'c_cantidad', etiqueta: 'Cantidad comprada', tipo: 'number', placeholder: 'Ej. 10' }), campo({ id: 'c_costo', etiqueta: `Costo unitario (${aj.moneda})`, tipo: 'number', dinero: true, valor: costoActual || '', placeholder: '0' }))}
      ${campo({ id: 'c_fecha', etiqueta: 'Fecha de la compra', tipo: 'date', valor: hoy() })}
      <p class="nota" data-promedio></p>
      ${filaCampos(campo({ id: 'c_precioNuevo', etiqueta: `Nuevo precio de venta (${aj.moneda})`, tipo: 'number', dinero: true, valor: p.precio || '', placeholder: '0' }), campo({ id: 'c_margenNuevo', etiqueta: 'Ganancia (%)', tipo: 'number', dinero: true, valor: p.margen || '', placeholder: 'Ej. 40' }))}
      <p class="nota" data-ganancia></p>`,
    pie: acciones([{ texto: 'Cancelar', accion: 'cancelar' }, { texto: 'Registrar compra', accion: 'guardar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  const $ = (s) => el.querySelector(s);
  let ultimo = Number(p.margen) ? 'margen' : 'precio';
  const promedio = () => {
    const cant = Number($('#c_cantidad').value) || 0, costo = Number($('#c_costo').value) || 0;
    if (!(cant > 0 && costo > 0)) { $('[data-promedio]').textContent = ''; return; }
    const r = sincronizarCompra(ultimo, stockActual, costoActual, cant, costo, '', '');
    $('[data-promedio]').textContent = (stockActual > 0 && costoActual > 0) ? `Nuevo costo promedio: ${dinero(r.nuevoCosto)} por unidad (antes ${dinero(costoActual)})` : `Costo por unidad: ${dinero(r.nuevoCosto)}`;
  };
  const sincronizar = () => {
    const r = sincronizarCompra(ultimo, stockActual, costoActual, $('#c_cantidad').value, $('#c_costo').value, $('#c_precioNuevo').value, $('#c_margenNuevo').value);
    $('#c_precioNuevo').value = r.precio; $('#c_margenNuevo').value = r.margen;
    $('[data-ganancia]').textContent = r.gananciaUnidad !== null ? `Con este precio ganas ${dinero(r.gananciaUnidad)} por unidad` : '';
  };
  $('#c_cantidad').addEventListener('input', () => { promedio(); sincronizar(); });
  $('#c_costo').addEventListener('input', () => { promedio(); sincronizar(); });
  $('#c_margenNuevo').addEventListener('input', () => { ultimo = 'margen'; sincronizar(); });
  $('#c_precioNuevo').addEventListener('input', () => { ultimo = 'precio'; sincronizar(); });
  sincronizar();
  promedio();
  $('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
  $('[data-accion="guardar"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => comprarDesdeProducto(p.id, {
      cantidad: valor(el, 'c_cantidad'), costoUnitario: valor(el, 'c_costo'), fecha: valor(el, 'c_fecha'),
      precioNuevo: valor(el, 'c_precioNuevo'), margenNuevo: valor(el, 'c_margenNuevo'),
    }));
    if (r.ok) { await capa.cerrar(); notificar('Compra registrada.', { tipo: 'exito' }); }
  });
}
