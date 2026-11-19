// Asistente de nueva venta (openVentaWizard, L2587–3172): paso 1 cliente; paso 2 carrito, descuento, total,
// tipo de registro (venta, pedido, encargo, apartado) y forma de pago.

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { irA, cerrarTodasLasHojas } from '../../core/navigation.js';
import { hoy } from '../../core/clock.js';
import { informarError } from '../../core/errors.js';
import { html, montar, icono } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, acciones, botonTexto, valor } from '../../ui/components/fields.js';
import { segmentos, conectarSegmentos } from '../../ui/components/segmented.js';
import { fila, lista, alTocarFila, estadoVacio } from '../../ui/components/list.js';
import { lineas } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { registrarVenta, verificarDisponible } from '../../operations/sales.js';
import { crearPendienteDesdeAsistente } from '../../operations/orders.js';
import { totalesVenta, descuentoPorcentaje, descuentoDesdeTotal, costoCarrito, gananciaVenta, margenSobreCosto } from '../../business/sales-rules.js';
import { disponible, mensajeSinStock } from '../../business/inventory-rules.js';
import { abrirServicioLibre, abrirPrendaAMedida } from './sale-items.js';
import { pintarPago, leerMontosPago, actualizarResto, confirmarCobro, mostrarVentaRegistrada } from './sale-payment.js';

const TEXTO_GUARDAR = { venta: 'Registrar venta', pedido: 'Agendar pedido', encargo: 'Registrar encargo', apartado: 'Crear apartado' };
const AVISO_PENDIENTE = {
  pedido: 'Pedido agendado. Los productos quedan reservados hasta la entrega.',
  encargo: 'Encargo registrado. Lo entregas cuando el producto llegue.',
  apartado: 'Apartado creado. Los productos quedan reservados hasta que se paguen.',
};

export function abrirAsistente() {
  if (!coleccion('clientes').length) {
    const c = abrirHoja({ titulo: 'Necesitas un cliente', cuerpo: html`<p class="nota">Antes de registrar una venta, registra al menos un cliente en la pestaña Clientes.</p>`, pie: acciones([{ texto: 'Entendido', accion: 'ok', tipo: 'primario' }]) });
    c.elemento.querySelector('[data-accion="ok"]').addEventListener('click', c.cerrar);
    return;
  }
  const est = {
    cliente: null, carrito: [], notas: '', descuento: { tipo: 'monto', valor: 0 }, medio: 'efectivo',
    montos: { abonoInicial: 0, medioAbono: 'efectivo', efectivo: 0, tarjeta: 0 }, tipoOp: 'venta', opMedio: 'efectivo', gananciaAbierta: false,
  };
  const capa = abrirHoja({ titulo: 'Nueva venta', paso: 'Paso 1 de 2 · elige el cliente', cuerpo: html`<div data-paso></div>`, pie: html`<div data-pie></div>` });
  const el = capa.elemento;
  const zonaPaso = el.querySelector('[data-paso]');
  const zonaPie = el.querySelector('[data-pie]');
  const ponerPaso = (texto) => { el.querySelector('.hoja-cabecera .paso').textContent = texto; };

  // ---------- Paso 1: cliente ----------
  function paso1() {
    ponerPaso('Paso 1 de 2 · elige el cliente');
    const pintarClientes = (t) => {
      const term = t.trim().toLowerCase();
      const items = coleccion('clientes').filter((c) => c.nombre.toLowerCase().includes(term));
      montar(zonaPaso.querySelector('[data-zona="clientes"]'), items.length
        ? lista(items.map((c) => fila({ datos: { cliente: c.id }, iniciales: c.nombre, titulo: c.nombre, sub: c.telefono || '' })))
        : estadoVacio({ icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro nombre.' }));
      alTocarFila(zonaPaso, 'cliente', (id) => { est.cliente = coleccion('clientes').find((c) => c.id === id); paso2(); });
    };
    montar(zonaPaso, html`${campo({ id: 'w_buscarCliente', etiqueta: 'Buscar cliente', placeholder: 'Nombre' })}<div data-zona="clientes"></div>`);
    montar(zonaPie, acciones([{ texto: 'Cancelar', accion: 'cancelar' }]));
    zonaPie.querySelector('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
    zonaPaso.querySelector('#w_buscarCliente').addEventListener('input', (e) => pintarClientes(e.target.value));
    pintarClientes('');
  }

  // ---------- Paso 2: productos, tipo y pago ----------
  function paso2() {
    ponerPaso(`Paso 2 de 2 · cliente: ${est.cliente.nombre}`);
    const aj = obtenerAjustes();
    montar(zonaPaso, html`
      <div class="banner info cliente-elegido">${icono('clientes')}<div><strong>${est.cliente.nombre}</strong>${est.cliente.telefono || ''}</div>${botonTexto('Cambiar', 'cambiar-cliente')}</div>
      ${campo({ id: 'w_producto', etiqueta: 'Agregar producto', placeholder: 'Buscar producto…' })}
      <ul class="lista" data-zona="resultados" hidden></ul>
      <div class="acciones-texto">${botonTexto('+ Servicio o producto libre', 'servicio')}${botonTexto('+ Prenda a medida', 'prenda')}</div>
      <div data-zona="carrito"></div>
      ${campo({ id: 'f_notas', etiqueta: 'Notas para el cliente (opcional)', tipo: 'textarea', valor: est.notas, placeholder: 'Ej. Forma de pago, garantía, condiciones de entrega' })}
      <div class="campo"><span class="etiqueta-campo">¿Qué estás registrando?</span>${segmentos('tipo-op', [['venta', 'Venta'], ['pedido', 'Pedido'], ['encargo', 'Encargo'], ['apartado', 'Apartado']], est.tipoOp)}</div>
      <div data-zona="op"></div>
      <div data-zona="pago-bloque">
        <div class="campo"><span class="etiqueta-campo">Forma de pago</span>${segmentos('medio', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta'], ['credito', 'A crédito'], ['mixto', 'Mixto']], est.medio)}</div>
        <div data-zona="pago"></div>
      </div>
      <div class="totales" data-zona="totales"></div>
      <div data-zona="ganancia"></div>`);
    montar(zonaPie, acciones([{ texto: 'Atrás', accion: 'atras' }, { texto: TEXTO_GUARDAR[est.tipoOp], accion: 'guardar', tipo: 'primario' }]));
    const $ = (s) => zonaPaso.querySelector(s);
    const btnGuardar = zonaPie.querySelector('[data-accion="guardar"]');

    const pintarTodo = () => { pintarCarrito(); pintarTotales(); pintarGanancia(); actualizarResto($('[data-zona="pago"]'), est); btnGuardar.disabled = est.carrito.length === 0; };
    const agregar = (item) => { est.carrito.push(item); pintarTodo(); };
    const maximo = (productoId) => disponible(coleccion('pedidos'), coleccion('inventario'), productoId);
    const avisoStock = (nombre, productoId) => notificar(mensajeSinStock(nombre, maximo(productoId)), { tipo: 'error' });

    function pintarCarrito() {
      const zona = $('[data-zona="carrito"]');
      if (!est.carrito.length) { montar(zona, html`<p class="nota">Busca productos arriba y tócalos para agregarlos.</p>`); return; }
      montar(zona, html`${est.carrito.map((it, i) => html`
        <div class="item-carrito" data-indice="${i}">
          <div class="nombre">${it.nombre}</div>
          <button type="button" class="boton-icono" data-quitar aria-label="Quitar ${it.nombre}">${icono('borrar', 'sm')}</button>
          <div class="cantidad"><button type="button" data-menos aria-label="Menos">−</button><span>${it.cantidad}</span><button type="button" data-mas aria-label="Más">+</button></div>
          <input type="number" inputmode="decimal" step="any" class="precio-unit${it.precioUnit < it.precioCatalogo ? ' rebajado' : ''}" value="${it.precioUnit}" aria-label="Precio unitario de ${it.nombre}">
          <div class="total-item num">${dinero(it.precioUnit * it.cantidad)}</div>
        </div>`)}`);
      zona.querySelectorAll('.item-carrito').forEach((fila_) => {
        const i = Number(fila_.dataset.indice);
        const it = est.carrito[i];
        fila_.querySelector('[data-mas]').addEventListener('click', () => {
          if (it.cantidad + 1 > maximo(it.productoId)) { avisoStock(it.nombre, it.productoId); return; }
          it.cantidad += 1; pintarTodo();
        });
        fila_.querySelector('[data-menos]').addEventListener('click', () => { it.cantidad -= 1; if (it.cantidad <= 0) est.carrito.splice(i, 1); pintarTodo(); });
        fila_.querySelector('[data-quitar]').addEventListener('click', () => { est.carrito.splice(i, 1); pintarTodo(); });
        fila_.querySelector('.precio-unit').addEventListener('change', (e) => { it.precioUnit = Number(e.target.value) || 0; pintarTodo(); });
      });
    }

    function pintarTotales() {
      const t = totalesVenta(est.carrito, est.descuento, aj.impuesto);
      montar($('[data-zona="totales"]'), html`
        ${lineas([['Suma de productos', dinero(t.suma)]])}
        ${filaCampos(campo({ id: 'w_descuento', etiqueta: 'Descuento sobre la venta (%)', tipo: 'number', dinero: true, valor: t.descuentoPct || '', placeholder: '0' }), campo({ id: 'w_total', etiqueta: 'Total a cobrar', tipo: 'number', dinero: true, valor: Math.round(t.total) }))}
        ${lineas([
          t.descuentoMonto > 0 ? ['Descuento', '-' + dinero(t.descuentoMonto)] : null,
          Number(aj.impuesto) > 0 ? [`Impuesto (${aj.impuesto}%)`, dinero(t.impuesto)] : null,
          ['Total a cobrar', dinero(t.total), 'fuerte total'],
        ])}`);
      $('#w_descuento').addEventListener('change', (e) => { est.descuento = descuentoPorcentaje(e.target.value); pintarTodo(); });
      $('#w_total').addEventListener('change', (e) => {
        const r = descuentoDesdeTotal(e.target.value, est.descuento, t.suma, aj.impuesto);
        if (!r.ok) { e.target.value = Math.round(t.total); notificar(`El total no puede ser mayor que la suma de productos (${dinero(t.suma)}).`, { tipo: 'error' }); return; }
        est.descuento = r.descuento; pintarTodo();
      });
    }

    function pintarGanancia() {
      const t = totalesVenta(est.carrito, est.descuento, aj.impuesto);
      const g = gananciaVenta(est.carrito, t), ct = costoCarrito(est.carrito), m = margenSobreCosto(g, ct);
      montar($('[data-zona="ganancia"]'), html`
        <button type="button" class="ganancia" data-accion="ganancia" aria-expanded="${est.gananciaAbierta}"><span>Ganancia estimada de esta venta</span><strong class="num ${g >= 0 ? 'pos' : 'neg'}">${dinero(g)}</strong></button>
        ${est.gananciaAbierta ? html`<div class="totales">${lineas([['Costo de los productos', dinero(ct)], t.descuentoMonto > 0 ? ['Descuento aplicado', '-' + dinero(t.descuentoMonto)] : null, ['Ingreso (después de descuento)', dinero(t.subtotal)], m !== null ? ['Margen sobre el costo', `${m}%`] : null])}</div>` : ''}`);
      $('[data-accion="ganancia"]').addEventListener('click', () => { est.gananciaAbierta = !est.gananciaAbierta; pintarGanancia(); });
    }

    function pintarOp() {
      const zona = $('[data-zona="op"]');
      $('[data-zona="pago-bloque"]').hidden = est.tipoOp !== 'venta';
      btnGuardar.textContent = TEXTO_GUARDAR[est.tipoOp];
      if (est.tipoOp === 'venta') { montar(zona, html``); return; }
      const esApa = est.tipoOp === 'apartado', esEnc = est.tipoOp === 'encargo';
      montar(zona, html`
        ${esApa ? '' : campo({ id: 'op_fecha', etiqueta: esEnc ? 'Llegada estimada (opcional)' : 'Fecha de entrega', tipo: 'date', valor: esEnc ? '' : hoy() })}
        ${filaCampos(campo({ id: 'op_anticipo', etiqueta: `${esApa ? 'Abono inicial' : 'Anticipo'} (${aj.moneda})`, tipo: 'number', dinero: true, placeholder: '0' }), campo({ id: 'op_fechaAnt', etiqueta: 'Fecha del abono', tipo: 'date', valor: hoy() }))}
        <div class="campo"><span class="etiqueta-campo">Forma de pago del ${esApa ? 'abono' : 'anticipo'}</span>${segmentos('op-medio', [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], est.opMedio)}</div>
        <p class="nota">${est.tipoOp === 'pedido' ? 'Los productos quedan reservados hasta la fecha de entrega.' : esEnc ? 'No descuenta stock. Lo entregas cuando el producto llegue y lo registres en inventario.' : 'Los productos quedan reservados. Los abonos los registras cuando lleguen.'}</p>`);
      conectarSegmentos(zona, 'op-medio', (v) => { est.opMedio = v; });
    }

    // Buscar y agregar productos
    $('#w_producto').addEventListener('input', (e) => {
      const t = e.target.value.trim().toLowerCase();
      const res = $('[data-zona="resultados"]');
      if (!t) { res.hidden = true; return; }
      const encontrados = coleccion('inventario').filter((p) => p.nombre.toLowerCase().includes(t)).slice(0, 8);
      res.hidden = false;
      montar(res, encontrados.length ? html`${encontrados.map((p) => html`<li><button type="button" class="fila" data-producto="${p.id}"><span class="fila-principal"><span class="fila-titulo">${p.nombre}</span></span><span class="fila-valor"><span class="monto">${dinero(p.precio)}</span></span></button></li>`)}` : html`<li class="nota">Sin productos con ese nombre</li>`);
      res.querySelectorAll('[data-producto]').forEach((b) => b.addEventListener('click', () => {
        const p = coleccion('inventario').find((x) => x.id === b.dataset.producto);
        const existente = est.carrito.find((it) => it.productoId === p.id);
        if ((existente ? existente.cantidad : 0) + 1 > maximo(p.id)) { avisoStock(p.nombre, p.id); return; }
        if (existente) existente.cantidad += 1;
        else est.carrito.push({ productoId: p.id, nombre: p.nombre, precioCatalogo: p.precio, precioUnit: p.precio, costo: Number(p.costo) || 0, cantidad: 1, stockDisponible: p.stock });
        e.target.value = ''; res.hidden = true;
        pintarTodo();
      }));
    });
    zonaPaso.querySelector('[data-accion="servicio"]').addEventListener('click', () => abrirServicioLibre(agregar));
    zonaPaso.querySelector('[data-accion="prenda"]').addEventListener('click', () => abrirPrendaAMedida(est.carrito, est.tipoOp === 'venta', agregar));
    zonaPaso.querySelector('[data-accion="cambiar-cliente"]').addEventListener('click', () => { est.cliente = null; paso1(); });
    $('#f_notas').addEventListener('input', (e) => { est.notas = e.target.value; });
    conectarSegmentos(zonaPaso, 'tipo-op', (v) => { est.tipoOp = v; pintarOp(); });
    conectarSegmentos(zonaPaso, 'medio', (v) => { est.medio = v; pintarPago($('[data-zona="pago"]'), est); });
    $('[data-zona="pago"]').addEventListener('input', (e) => { leerMontosPago(e, est); actualizarResto($('[data-zona="pago"]'), est); });
    zonaPie.querySelector('[data-accion="atras"]').addEventListener('click', () => { est.cliente = null; paso1(); });
    btnGuardar.addEventListener('click', () => guardar(btnGuardar));
    pintarPago($('[data-zona="pago"]'), est);
    pintarOp();
    pintarTodo();
  }

  async function guardar(boton) {
    if (est.tipoOp !== 'venta') {
      const r = await operar(el, boton, () => crearPendienteDesdeAsistente({
        tipo: est.tipoOp, clienteId: est.cliente.id, carrito: est.carrito, fecha: valor(el, 'op_fecha'),
        anticipo: valor(el, 'op_anticipo'), fechaAnticipo: valor(el, 'op_fechaAnt'), metodo: est.opMedio, notas: est.notas,
      }));
      if (r.ok) { await cerrarTodasLasHojas(); irA('ventas', 'pendientes'); notificar(AVISO_PENDIENTE[est.tipoOp], { tipo: 'exito' }); }
      return;
    }
    if (!est.carrito.length) return;
    try { verificarDisponible(est.carrito); } catch (e) { informarError(e, 'venta'); return; }
    confirmarCobro(est, async (capaConfirmar, boton2) => {
      const r = await operar(capaConfirmar.elemento, boton2, () => registrarVenta({ clienteId: est.cliente.id, carrito: est.carrito, descuento: est.descuento, notas: est.notas, medio: est.medio, montos: est.montos }));
      if (r.ok) { await cerrarTodasLasHojas(); mostrarVentaRegistrada(r.valor); }
    });
  }

  paso1();
}
