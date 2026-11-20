// Formulario de pedido, encargo o apartado: crear y editar (openPedidoForm, L995–1143).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, valor, acciones, botonTexto, mostrarError, limpiarErrores } from '../../ui/components/fields.js';
import { segmentos, conectarSegmentos } from '../../ui/components/segmented.js';
import { lineas, seccion } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { guardarPendiente } from '../../operations/orders.js';
import { itemDeFormulario, totalFormularioPendiente, tipoDe } from '../../business/orders-rules.js';
import { MENSAJES } from '../../business/validation.js';

const NOTA = {
  apartado: 'Aparta productos para alguien que paga por partes. Los abonos los registras cuando llegan.',
  encargo: 'Productos que no tienes todavía. Déjalo con su abono y entrégalo cuando llegue.',
  pedido: 'Agenda cuándo debe entregarse y qué lleva cada pedido.',
};

export function abrirFormularioPendiente(id, tipoNuevo) {
  const r = id ? coleccion('pedidos').find((p) => p.id === id) : null;
  const clientes = coleccion('clientes');
  if (!clientes.length) { notificar(MENSAJES.sinClientes, { tipo: 'error' }); return; }
  const tipo = r ? tipoDe(r) : (tipoNuevo || 'pedido');
  const esApa = tipo === 'apartado', esEnc = tipo === 'encargo';
  const aj = obtenerAjustes();
  const items = r ? (r.items || []).map((it) => ({ ...it })) : [];
  let panelAbierto = items.length === 0;
  const capa = abrirHoja({
    titulo: `${r ? 'Editar' : 'Nuevo'} ${tipo}`,
    paso: NOTA[tipo],
    cuerpo: html`
      ${campo({ id: 'pd_cliente', etiqueta: 'Cliente', tipo: 'select', opciones: clientes.map((c) => [c.id, c.nombre]), valor: r ? r.clienteId : clientes[0].id })}
      ${seccion('Productos', html`<div data-zona="items"></div>`)}
      ${botonTexto('+ Agregar otro producto', 'abrir-panel')}
      <div class="tarjeta panel-agregar" data-zona="panel">
        ${campo({ id: 'pd_nombre', etiqueta: 'Producto', placeholder: 'Nombre del producto', lista: 'pdProductos' })}
        <datalist id="pdProductos">${coleccion('inventario').map((p) => html`<option value="${p.nombre}">`)}</datalist>
        ${filaCampos(campo({ id: 'pd_cant', etiqueta: 'Cantidad', tipo: 'number', valor: 1 }), campo({ id: 'pd_precio', etiqueta: `Precio c/u (${aj.moneda})`, tipo: 'number', dinero: true, placeholder: '0' }))}
        ${campo({ id: 'pd_car', etiqueta: 'Características', placeholder: 'Ej. talla M, color azul, sin azúcar' })}
        ${campo({ id: 'pd_costo', etiqueta: 'Costo c/u (opcional, para la ganancia)', tipo: 'number', dinero: true, placeholder: '0' })}
        <button type="button" class="btn btn-secundario btn-bloque" data-accion="agregar-item">Agregar al ${tipo}</button>
      </div>
      ${campo({ id: 'pd_notas', etiqueta: 'Notas generales (opcional)', tipo: 'textarea', valor: r ? (r.notas || '') : '', placeholder: 'Ej. Entregar en la oficina, llamar antes' })}
      <div${esApa ? html` hidden` : ''}>
        ${campo({ id: 'pd_fecha', etiqueta: esEnc ? 'Llegada estimada (opcional)' : 'Fecha de entrega', tipo: 'date', valor: r ? r.fechaEntrega : hoy() })}
        ${filaCampos(campo({ id: 'pd_anticipo', etiqueta: `Anticipo (${aj.moneda})`, tipo: 'number', dinero: true, valor: r && r.anticipo ? r.anticipo : '', placeholder: '0' }), campo({ id: 'pd_fechaAnt', etiqueta: 'Fecha del anticipo', tipo: 'date', valor: r && r.fechaAnticipo ? r.fechaAnticipo : hoy() }))}
        <div class="campo"><span class="etiqueta-campo">Forma de pago del anticipo</span>${segmentos('pd-medio', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], r && r.anticipoMetodo ? r.anticipoMetodo : 'efectivo')}</div>
      </div>
      ${campo({ id: 'pd_desc', etiqueta: 'Descuento (%)', tipo: 'number', dinero: true, valor: r && r.descuentoPct ? r.descuentoPct : '', placeholder: '0' })}
      <div class="totales" data-zona="resumen"></div>`,
    pie: acciones([{ texto: 'Cancelar', accion: 'cancelar' }, { texto: `Guardar ${tipo}`, accion: 'guardar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  const $ = (s) => el.querySelector(s);
  const medio = conectarSegmentos(el, 'pd-medio');
  const pintar = () => {
    montar($('[data-zona="items"]'), items.length ? html`<div class="tarjeta">${lineas(items.map((it, i) => [html`<span class="linea-titulo">${it.cantidad} × ${it.nombre}</span><span class="linea-sub">${it.caracteristicas || 'Sin características'}${it.precio ? ' · ' + dinero(it.precio) + ' c/u' : ''}</span>`, html`<button type="button" class="btn btn-texto peligro" data-quitar="${i}">Quitar</button>`]))}</div>` : html`<p class="nota">Aún no has agregado productos.</p>`);
    $('[data-zona="panel"]').hidden = !(items.length === 0 || panelAbierto);
    $('[data-accion="abrir-panel"]').hidden = !(items.length > 0 && !panelAbierto);
    const rs = totalFormularioPendiente(items, $('#pd_desc').value, aj.impuesto, $('#pd_anticipo').value);
    montar($('[data-zona="resumen"]'), items.length ? lineas([['Subtotal', dinero(rs.sub)], rs.pct > 0 ? [`Descuento (${rs.pct}%)`, '−' + dinero(rs.desc)] : null, [`Total del ${tipo}`, dinero(rs.total), 'fuerte'], ['Anticipo', dinero(rs.ant)], ['Saldo por pagar', dinero(rs.saldo), 'fuerte']]) : html``);
    $('[data-zona="items"]').querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => { items.splice(Number(b.dataset.quitar), 1); pintar(); }));
  };
  $('#pd_anticipo').addEventListener('input', pintar);
  $('#pd_desc').addEventListener('input', pintar);
  $('#pd_nombre').addEventListener('input', () => {
    const prod = coleccion('inventario').find((x) => x.nombre.toLowerCase() === $('#pd_nombre').value.trim().toLowerCase());
    if (prod && !$('#pd_precio').value) $('#pd_precio').value = prod.precio || '';
  });
  $('[data-accion="agregar-item"]').addEventListener('click', () => {
    limpiarErrores(el);
    const res = itemDeFormulario({ nombre: valor(el, 'pd_nombre'), cantidad: valor(el, 'pd_cant'), precio: valor(el, 'pd_precio'), caracteristicas: valor(el, 'pd_car'), costo: valor(el, 'pd_costo') }, coleccion('inventario'));
    if (!res.ok) { mostrarError(el, res.campo === 'nombre' ? 'pd_nombre' : 'pd_cant', MENSAJES[res.campo === 'nombre' ? 'nombre' : 'cantidad']); return; }
    items.push(res.item);
    ['#pd_nombre', '#pd_precio', '#pd_car', '#pd_costo'].forEach((s) => { $(s).value = ''; });
    $('#pd_cant').value = 1;
    panelAbierto = false;
    pintar();
  });
  $('[data-accion="abrir-panel"]').addEventListener('click', () => { panelAbierto = true; pintar(); $('#pd_nombre').focus(); });
  $('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
  $('[data-accion="guardar"]').addEventListener('click', async (e) => {
    if (!items.length) { mostrarError(el, 'pd_nombre', MENSAJES.items); return; }
    const res = await operar(el, e.currentTarget, () => guardarPendiente(id, {
      tipoNuevo: tipo, clienteId: valor(el, 'pd_cliente'), fecha: valor(el, 'pd_fecha'), items,
      anticipo: valor(el, 'pd_anticipo'), metodoAnticipo: medio() || 'efectivo', descuentoPct: valor(el, 'pd_desc'), fechaAnticipo: valor(el, 'pd_fechaAnt'), notas: valor(el, 'pd_notas'),
    }));
    if (res.ok) { await capa.cerrar(); notificar(r ? 'Cambios guardados.' : `${tipo[0].toUpperCase() + tipo.slice(1)} registrado.`, { tipo: 'exito' }); }
  });
  pintar();
}
