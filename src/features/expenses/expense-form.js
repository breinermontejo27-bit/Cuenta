// Gastos: nuevo (general o compra de inventario de un producto existente o nuevo) y edición (L2277–2582).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { confirmar } from '../../ui/overlays/dialog.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, valor, acciones, botonTexto } from '../../ui/components/fields.js';
import { segmentos, conectarSegmentos, chips } from '../../ui/components/segmented.js';
import { banner } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { crearGasto, editarGasto, eliminarGasto } from '../../operations/expenses.js';
import { comprarDesdeGastos } from '../../operations/purchases.js';
import { sincronizarCompra, tieneControlStock } from '../../business/inventory-rules.js';

const MEDIOS = [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']];

export function abrirEditarGasto(id) {
  const g = coleccion('gastos').find((x) => x.id === id);
  if (!g) return;
  const aj = obtenerAjustes();
  const capa = abrirHoja({
    titulo: 'Editar gasto',
    cuerpo: html`
      ${g.tipo === 'compra' ? banner('info', 'Este gasto viene de una compra de inventario.', ' Editar el monto aquí no ajusta el stock ni el costo del producto: eso se hace desde Inventario.') : ''}
      ${campo({ id: 'f_descripcion', etiqueta: 'Descripción', valor: g.descripcion, placeholder: '¿En qué se gastó?' })}
      ${filaCampos(campo({ id: 'f_monto', etiqueta: `Monto (${aj.moneda})`, tipo: 'number', dinero: true, valor: g.monto }), campo({ id: 'f_fecha', etiqueta: 'Fecha', tipo: 'date', valor: g.fecha }))}
      ${campo({ id: 'f_categoria', etiqueta: 'Categoría (opcional)', valor: g.categoria || '', placeholder: 'Ej. Renta, Insumos, Transporte' })}
      <div class="campo"><span class="etiqueta-campo">¿Con qué lo pagaste?</span>${segmentos('medio', MEDIOS, g.metodo || 'efectivo')}</div>
      ${botonTexto('Eliminar gasto', 'eliminar', true)}`,
    pie: acciones([{ texto: 'Cancelar', accion: 'cancelar' }, { texto: 'Guardar', accion: 'guardar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  const medio = conectarSegmentos(el, 'medio');
  el.querySelector('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="guardar"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => editarGasto(g.id, { descripcion: valor(el, 'f_descripcion'), monto: valor(el, 'f_monto'), fecha: valor(el, 'f_fecha'), categoria: valor(el, 'f_categoria'), metodo: medio() }));
    if (r.ok) { await capa.cerrar(); notificar('Gasto actualizado.', { tipo: 'exito' }); }
  });
  const borrar = el.querySelector('[data-accion="eliminar"]');
  borrar.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Eliminar este gasto?', mensaje: `${g.descripcion} · ${dinero(g.monto)}.${g.tipo === 'compra' ? ' El stock y el costo del producto no cambian.' : ''} Esta acción no se puede deshacer.`, aceptar: 'Eliminar', peligro: true }))) return;
    const r = await operar(el, borrar, () => eliminarGasto(g.id));
    if (r.ok) { await capa.cerrar(); notificar('Gasto eliminado.'); }
  });
}

export function abrirNuevoGasto() {
  const aj = obtenerAjustes();
  const estado = { tipo: 'general', producto: null, esNuevo: false, nombreNuevo: '', medio: 'efectivo', ultimo: 'precio' };
  const capa = abrirHoja({
    titulo: 'Nuevo gasto',
    cuerpo: html`${chips('tipo', [['general', 'Gasto general'], ['compra', 'Compra de inventario']], 'general')}<div data-zona="cuerpo"></div>`,
    pie: acciones([{ texto: 'Cancelar', accion: 'cancelar' }, { texto: 'Guardar', accion: 'guardar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  const zona = el.querySelector('[data-zona="cuerpo"]');
  const medioHtml = () => html`<div class="campo"><span class="etiqueta-campo">¿Con qué lo pagaste?</span>${segmentos('medio', MEDIOS, estado.medio)}</div>`;

  function pintar() {
    if (estado.tipo === 'general') {
      montar(zona, html`
        ${campo({ id: 'f_descripcion', etiqueta: 'Descripción', placeholder: '¿En qué se gastó?' })}
        ${filaCampos(campo({ id: 'f_monto', etiqueta: `Monto (${aj.moneda})`, tipo: 'number', dinero: true, placeholder: '0' }), campo({ id: 'f_fecha', etiqueta: 'Fecha', tipo: 'date', valor: hoy() }))}
        ${campo({ id: 'f_categoria', etiqueta: 'Categoría (opcional)', placeholder: 'Ej. Renta, Insumos, Transporte' })}
        ${medioHtml()}`);
    } else {
      const p = estado.producto;
      const listo = estado.esNuevo ? estado.nombreNuevo.trim().length > 0 : !!p;
      montar(zona, html`
        ${medioHtml()}
        ${estado.esNuevo ? html`
          ${campo({ id: 'f_nombreNuevo', etiqueta: 'Nombre del producto nuevo', valor: estado.nombreNuevo, placeholder: 'Nombre' })}
          ${botonTexto('Usar un producto ya registrado', 'usar-existente')}`
        : p ? html`<div class="campo"><span class="etiqueta-campo">Producto</span><div class="producto-elegido"><strong>${p.nombre}</strong>${botonTexto('Cambiar', 'cambiar')}</div></div>`
          : html`
            ${campo({ id: 'f_buscarProducto', etiqueta: 'Producto', placeholder: 'Buscar producto…' })}
            <ul class="lista" data-zona="resultados" hidden></ul>
            ${botonTexto('+ Registrar producto nuevo', 'nuevo-producto')}`}
        ${listo ? html`
          ${filaCampos(campo({ id: 'c_cantidad', etiqueta: 'Cantidad comprada', tipo: 'number', placeholder: 'Ej. 10' }), campo({ id: 'c_costo', etiqueta: `Costo unitario (${aj.moneda})`, tipo: 'number', dinero: true, valor: p ? (Number(p.costo) || '') : '', placeholder: '0' }))}
          ${campo({ id: 'c_fecha', etiqueta: 'Fecha de la compra', tipo: 'date', valor: hoy() })}
          <p class="nota" data-promedio></p>
          ${filaCampos(campo({ id: 'c_precioNuevo', etiqueta: `Precio de venta (${aj.moneda})`, tipo: 'number', dinero: true, valor: p ? (p.precio || '') : '', placeholder: '0' }), campo({ id: 'c_margenNuevo', etiqueta: 'Ganancia (%)', tipo: 'number', dinero: true, valor: p ? (p.margen || '') : '', placeholder: 'Ej. 40' }))}
          <p class="nota" data-ganancia></p>` : ''}`);
      conectarCompra(listo);
    }
    conectarSegmentos(zona, 'medio', (v) => { estado.medio = v; });
  }

  function conectarCompra(listo) {
    const $ = (s) => zona.querySelector(s);
    const buscar = $('#f_buscarProducto');
    if (buscar) buscar.addEventListener('input', () => {
      const t = buscar.value.trim().toLowerCase();
      const res = $('[data-zona="resultados"]');
      if (!t) { res.hidden = true; return; }
      const encontrados = coleccion('inventario').filter((x) => x.nombre.toLowerCase().includes(t)).slice(0, 8);
      res.hidden = false;
      montar(res, encontrados.length
        ? html`${encontrados.map((x) => html`<li><button type="button" class="fila" data-producto="${x.id}"><span class="fila-principal"><span class="fila-titulo">${x.nombre}</span></span><span class="fila-valor"><span class="monto">${dinero(x.precio)}</span></span></button></li>`)}`
        : html`<li class="nota">Sin productos con ese nombre</li>`);
      res.querySelectorAll('[data-producto]').forEach((b) => b.addEventListener('click', () => {
        estado.producto = coleccion('inventario').find((x) => x.id === b.dataset.producto);
        estado.ultimo = Number(estado.producto.margen) ? 'margen' : 'precio';
        pintar();
      }));
    });
    const accion = (n, fn) => { const b = zona.querySelector(`[data-accion="${n}"]`); if (b) b.addEventListener('click', fn); };
    accion('cambiar', () => { estado.producto = null; pintar(); });
    accion('nuevo-producto', () => { estado.esNuevo = true; estado.producto = null; estado.ultimo = 'precio'; pintar(); });
    accion('usar-existente', () => { estado.esNuevo = false; pintar(); });
    const nombre = $('#f_nombreNuevo');
    if (nombre) nombre.addEventListener('input', () => {
      estado.nombreNuevo = nombre.value;
      if ((estado.nombreNuevo.trim().length > 0) !== !!$('#c_cantidad')) {
        pintar();
        const campoNombre = zona.querySelector('#f_nombreNuevo');
        campoNombre.focus();
        campoNombre.setSelectionRange(campoNombre.value.length, campoNombre.value.length); // el cursor sigue al final
      }
    });
    if (!listo) return;
    const p = estado.producto;
    const stockActual = p && tieneControlStock(p) ? Number(p.stock) : 0;
    const costoActual = p ? (Number(p.costo) || 0) : 0;
    const promedio = () => {
      const cant = Number($('#c_cantidad').value) || 0, costo = Number($('#c_costo').value) || 0;
      if (!(cant > 0 && costo > 0)) { $('[data-promedio]').textContent = ''; return; }
      const r = sincronizarCompra('precio', stockActual, costoActual, cant, costo, '', '');
      $('[data-promedio]').textContent = (stockActual > 0 && costoActual > 0) ? `Nuevo costo promedio: ${dinero(r.nuevoCosto)} por unidad (antes ${dinero(costoActual)})` : `Costo por unidad: ${dinero(r.nuevoCosto)}`;
    };
    const sincronizar = () => {
      const r = sincronizarCompra(estado.ultimo, stockActual, costoActual, $('#c_cantidad').value, $('#c_costo').value, $('#c_precioNuevo').value, $('#c_margenNuevo').value);
      $('#c_precioNuevo').value = r.precio; $('#c_margenNuevo').value = r.margen;
      $('[data-ganancia]').textContent = r.gananciaUnidad !== null ? `Con este precio ganas ${dinero(r.gananciaUnidad)} por unidad` : '';
    };
    $('#c_cantidad').addEventListener('input', () => { promedio(); sincronizar(); });
    $('#c_costo').addEventListener('input', () => { promedio(); sincronizar(); });
    $('#c_margenNuevo').addEventListener('input', () => { estado.ultimo = 'margen'; sincronizar(); });
    $('#c_precioNuevo').addEventListener('input', () => { estado.ultimo = 'precio'; sincronizar(); });
    promedio();
    sincronizar();
  }

  el.querySelectorAll('[data-grupo="tipo"] .chip').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('[data-grupo="tipo"] .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    estado.tipo = b.dataset.valor;
    pintar();
  }));
  el.querySelector('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="guardar"]').addEventListener('click', async (e) => {
    if (estado.tipo === 'compra' && !zona.querySelector('#c_cantidad')) return;
    const r = await operar(el, e.currentTarget, () => (estado.tipo === 'general'
      ? crearGasto({ descripcion: valor(el, 'f_descripcion'), monto: valor(el, 'f_monto'), fecha: valor(el, 'f_fecha'), categoria: valor(el, 'f_categoria'), metodo: estado.medio })
      : comprarDesdeGastos(estado.esNuevo ? null : estado.producto.id, {
        nombreNuevo: estado.nombreNuevo, cantidad: valor(el, 'c_cantidad'), costoUnitario: valor(el, 'c_costo'), fecha: valor(el, 'c_fecha'),
        precioNuevo: valor(el, 'c_precioNuevo'), margenNuevo: valor(el, 'c_margenNuevo'), metodo: estado.medio,
      })));
    if (r.ok) { await capa.cerrar(); notificar(estado.tipo === 'general' ? 'Gasto registrado.' : 'Compra registrada.', { tipo: 'exito' }); }
  });
  pintar();
}
