// Pedidos y apartados (encargos dentro de Ventas).
import { renderList } from './app.js';
import { listWrap, searchInput } from './dom.js';
import { buildInvoiceHtml, compartirFacturaPDF } from './facturas.js';
import { config, db, save, ui } from './state.js';
import { emptyState, openOverlay, segHtml } from './ui.js';
import { escapeHtml, fmtDate, metodoLabel, money, todayStr, uid, waUrl } from './utils.js';
import { renderVentas } from './ventas.js';

// ============================================================
// PEDIDOS (agenda de entregas dentro de Ventas)
// ============================================================
export function reservadoSinEncargos(productoId){
  return db.pedidos
    .filter(p => p.estado === 'pendiente')
    .reduce((s,p) => s + p.items.reduce((a,it) => {
      let u = 0;
      if(it.productoId === productoId && p.tipo !== 'encargo') u += Number(it.cantidad) || 0;
      (it.materiales || []).forEach(m => { if(m.productoId === productoId) u += (Number(m.cantidad) || 0) * (Number(it.cantidad) || 0); });
      return a + u;
    }, 0), 0);
}
// Un encargo aparta sus unidades solo cuando el stock ya alcanza para completarlo.
export function reservadoPorEncargos(productoId){
  const prod = db.inventario.find(x => x.id === productoId);
  if(!prod || prod.stock === '' || prod.stock === null || prod.stock === undefined) return 0;
  let libre = (Number(prod.stock) || 0) - reservadoSinEncargos(productoId);
  const encargos = db.pedidos
    .filter(p => p.estado === 'pendiente' && p.tipo === 'encargo')
    .sort((a,b) => (a.creadoTs || 0) - (b.creadoTs || 0));
  let total = 0;
  for(const p of encargos){
    const q = p.items.reduce((s,it) => s + (it.productoId === productoId ? (Number(it.cantidad) || 0) : 0), 0);
    if(q <= 0) continue;
    if(q > libre) break;
    total += q;
    libre -= q;
  }
  return total;
}
export function unidadesReservadas(productoId){
  return reservadoPorEncargos(productoId) + db.pedidos
    .filter(p => p.estado === 'pendiente')
    .reduce((s,p) => s + p.items.reduce((a,it) => {
      let u = 0;
      if(it.productoId === productoId && p.tipo !== 'encargo') u += Number(it.cantidad) || 0;
      (it.materiales || []).forEach(m => { if(m.productoId === productoId) u += (Number(m.cantidad) || 0) * (Number(it.cantidad) || 0); });
      return a + u;
    }, 0), 0);
}

export function segVentas(){
  return `<div class="inv-sub">${segHtml('ventasvista', [['ventas','Ventas'],['pedidos','Pendientes']], ui.ventasVista)}</div>`;
}
export function bindVentasSeg(){
  listWrap.querySelectorAll('[data-group="ventasvista"] button').forEach(b => b.addEventListener('click', () => { ui.ventasVista = b.dataset.val; renderVentas(); }));
}

export function pedidoEstadoInfo(p){
  const hoy = todayStr();
  if(!p.fechaEntrega) return { txt: 'Sin fecha', cls: '', hoy: false };
  if(p.fechaEntrega < hoy) return { txt: 'Vencido · ' + fmtDate(p.fechaEntrega), cls: 'low', hoy: false };
  if(p.fechaEntrega === hoy) return { txt: 'Hoy', cls: '', hoy: true };
  return { txt: fmtDate(p.fechaEntrega), cls: '', hoy: false };
}

export function openNuevoPendiente(){
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>¿Qué quieres registrar?</h2>
      <div class="step-note">Elige según el caso.</div>
      <ul class="list">
        <li class="row" data-tipo="pedido"><div class="row-main"><div class="row-title">Pedido</div><div class="row-sub">Productos que tienes en stock, con fecha de entrega.</div></div></li>
        <li class="row" data-tipo="encargo"><div class="row-main"><div class="row-title">Encargo</div><div class="row-sub">Productos que todavía no tienes. Se entregan cuando llegan.</div></div></li>
        <li class="row" data-tipo="apartado"><div class="row-main"><div class="row-title">Apartado</div><div class="row-sub">Productos del stock sin fecha, que se pagan por abonos.</div></div></li>
      </ul>
      <div class="sheet-actions" style="margin-top:12px;"><button class="btn btn-secondary" id="npCerrar">Cancelar</button></div>
    `, (ov) => {
    ov.querySelector('#npCerrar').addEventListener('click', () => ov.remove());
    ov.querySelectorAll('[data-tipo]').forEach(r => r.addEventListener('click', () => { ov.remove(); openPedidoForm(null, r.getAttribute('data-tipo')); }));
  });
}

export function renderPedidosHtml(){
  const term = searchInput.value.trim().toLowerCase();
  const todos = db.pedidos.filter(p => p.estado === 'pendiente');
  const activos = todos.filter(p => p.clienteNombre.toLowerCase().includes(term));
  if(activos.length === 0){
    return emptyState(
      todos.length ? 'Sin resultados' : 'Sin pendientes',
      todos.length ? 'Prueba con otro nombre de cliente.' : 'Toca + para registrar un pedido, un encargo o un apartado.'
    );
  }
  const hoy = todayStr();
  const porCreado = (a,b) => (a.creadoTs || 0) - (b.creadoTs || 0);
  const porFecha = (a,b) => a.fechaEntrega.localeCompare(b.fechaEntrega) || porCreado(a,b);
  const ped = activos.filter(p => (p.tipo || 'pedido') === 'pedido');
  const enc = activos.filter(p => p.tipo === 'encargo');
  const apa = activos.filter(p => p.tipo === 'apartado');
  const conFechaP = ped.filter(p => p.fechaEntrega).sort(porFecha);
  const pedVencidos = conFechaP.filter(p => p.fechaEntrega < hoy);
  const pedHoy = conFechaP.filter(p => p.fechaEntrega === hoy);
  const pedProx = conFechaP.filter(p => p.fechaEntrega > hoy);
  const encConFecha = enc.filter(p => p.fechaEntrega).sort(porFecha);
  const encSinFecha = enc.filter(p => !p.fechaEntrega).sort(porCreado);
  const apaOrd = apa.slice().sort(porCreado);
  const fila = (p) => {
    const resumen = p.items.map(it => `${it.cantidad} × ${it.nombre}`).join(', ');
    if(p.tipo === 'apartado'){
      const total = apartadoTotal(p);
      const abonado = apartadoAbonado(p);
      const saldo = Math.max(0, total - abonado);
      return `
          <li class="row" data-pid="${p.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(p.clienteNombre)}</div>
              <div class="row-sub">${escapeHtml(resumen)}</div>
              <div class="row-sub">Abonado ${money(abonado)} de ${money(total)}</div>
            </div>
            <div class="row-value-wrap"><div class="row-value" style="font-size:12.5px;">${saldo <= 0 ? 'Pagado' : 'Falta ' + money(saldo)}</div></div>
          </li>`;
    }
    const info = pedidoEstadoInfo(p);
    const subtotal = p.items.reduce((s,it) => s + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
    const anticipo = Number(p.anticipo) || 0;
    return `
        <li class="row" data-pid="${p.id}">
          <div class="row-main">
            <div class="row-title">${escapeHtml(p.clienteNombre)}</div>
            <div class="row-sub">${escapeHtml(resumen)}</div>
            ${anticipo > 0 ? `<div class="row-sub">Abono ${money(anticipo)} · Resto ${money(Math.max(0, subtotal - anticipo))}</div>` : ''}
          </div>
          <div class="row-value-wrap">
            <div class="row-value ${info.cls}" style="font-size:12.5px;${info.hoy ? 'color:var(--accent-ink);' : ''}">${escapeHtml(info.txt)}</div>
          </div>
        </li>`;
  };
  const subgrupo = (titulo, arr) => arr.length ? `<div class="section-label" style="margin-top:8px;">${titulo}</div><ul class="list">${arr.map(fila).join('')}</ul>` : '';
  const lista = (arr) => arr.length ? `<ul class="list">${arr.map(fila).join('')}</ul>` : '';
  const seccion = (titulo, n, contenido) => `
      <details class="pend-sec" style="margin-top:12px;">
        <summary style="list-style:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border:1px solid var(--border-strong, #d6dbe3); border-radius:14px; font-weight:700; font-size:15px;">
          <span>${titulo}</span>
          <span style="display:flex; align-items:center; gap:10px;">
            <span style="background:var(--accent-soft, #E9F0FC); color:var(--accent-ink, #16386F); border-radius:999px; padding:2px 10px; font-size:13px;">${n}</span>
            <span style="color:var(--ink-soft, #667);">▾</span>
          </span>
        </summary>
        <div style="padding:4px 0 6px;">${n ? contenido : '<div class="step-note" style="margin:8px 0;">Sin registros.</div>'}</div>
      </details>`;
  return seccion('Pedidos', ped.length,
      subgrupo('Vencidos', pedVencidos) + subgrupo('Para hoy', pedHoy) + subgrupo('Próximas entregas', pedProx))
    + seccion('Encargos', enc.length,
      subgrupo('Con llegada estimada', encConFecha) + subgrupo('Sin fecha estimada', encSinFecha))
    + seccion('Apartados', apa.length, lista(apaOrd));
}

export function openPedidoForm(id, tipoNuevo){
  const record = id ? db.pedidos.find(p => p.id === id) : null;
  const tipoP = record ? (record.tipo || 'pedido') : (tipoNuevo || 'pedido');
  const esApartado = tipoP === 'apartado';
  const esEncargo = tipoP === 'encargo';
  if(db.clientes.length === 0){
    alert('Primero registra un cliente en la pestaña Clientes.');
    return;
  }
  let items = record ? record.items.map(it => ({ ...it })) : [];
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>${record ? 'Editar' : 'Nuevo'} ${esApartado ? 'apartado' : esEncargo ? 'encargo' : 'pedido'}</h2>
      <div class="step-note">${esApartado ? 'Aparta productos para alguien que paga por partes. Los abonos los registras cuando llegan.' : esEncargo ? 'Productos que no tienes todavía. Déjalo con su abono y entrégalo cuando llegue.' : 'Agenda cuándo debe entregarse y qué lleva cada pedido.'}</div>
      <div class="field"><label>Cliente</label>
        <select id="pd_cliente">${db.clientes.map(c => `<option value="${c.id}" ${record && record.clienteId === c.id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('')}</select>
      </div>
      <div class="section-label" style="margin-top:6px;">Productos del pedido</div>
      <div id="pdItems" style="margin-top:0;"></div>
      <button class="btn btn-secondary" id="pdAddToggle" type="button" style="width:100%; display:none; margin-bottom:8px;">+ Agregar otro producto</button>
      <div class="field" id="pdAddPanel" style="margin-top:4px; padding:12px; border:1px dashed var(--border-strong); border-radius:12px;">
        <label>Agregar producto</label>
        <input type="text" id="pd_nombre" list="pdProdList" placeholder="Nombre del producto">
        <datalist id="pdProdList">${db.inventario.map(p => `<option value="${escapeHtml(p.nombre)}">`).join('')}</datalist>
        <div class="row2" style="margin-top:8px;">
          <div class="field mono" style="margin-bottom:8px;"><label>Cantidad</label><input type="number" inputmode="numeric" id="pd_cant" value="1"></div>
          <div class="field mono" style="margin-bottom:8px;"><label>Precio c/u (${config.moneda})</label><input type="number" inputmode="decimal" id="pd_precio" placeholder="0"></div>
        </div>
        <div class="field" style="margin-bottom:8px;"><label>Características</label><input type="text" id="pd_car" placeholder="Ej. talla M, color azul, sin azúcar"></div>
        <div class="field mono" style="margin-bottom:8px;"><label>Costo c/u (opcional, para la ganancia)</label><input type="number" inputmode="decimal" id="pd_costo" placeholder="0"></div>
        <button class="btn btn-secondary" id="pd_add" style="width:100%;">Agregar al pedido</button>
      </div>
      <div class="field"><label>Notas generales (opcional)</label><textarea id="pd_notas" rows="2" placeholder="Ej. Entregar en la oficina, llamar antes">${escapeHtml(record ? (record.notas || '') : '')}</textarea></div>
      <div class="row2">
        <div class="field"><label>Fecha de entrega</label><input type="date" id="pd_fecha" value="${record ? record.fechaEntrega : todayStr()}"></div>
        <div class="field mono"><label>Anticipo (${config.moneda})</label><input type="number" inputmode="decimal" id="pd_anticipo" value="${record && record.anticipo ? record.anticipo : ''}" placeholder="0"></div>
        <div class="field mono"><label>Descuento (%)</label><input type="number" inputmode="decimal" id="pd_desc" value="${record && record.descuentoPct ? record.descuentoPct : ''}" placeholder="0"></div>
      </div>
      <div class="field"><label>Fecha del anticipo</label><input type="date" id="pd_fechaAnt" value="${record && record.fechaAnticipo ? record.fechaAnticipo : todayStr()}"></div>
      <div class="field" id="pdMetWrap"><label>Forma de pago del anticipo</label>${segHtml('pdmet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], record && record.anticipoMetodo ? record.anticipoMetodo : 'efectivo')}</div>
      <div id="pdResumen" style="margin-top:12px;"></div>
      <div class="sheet-actions">
        <button class="btn btn-secondary" id="pd_cancel">Cancelar</button>
        <button class="btn btn-primary" id="pd_save">Guardar pedido</button>
      </div>
    `, (overlay) => {
    if(esEncargo){ const lbl = overlay.querySelector('#pd_fecha').previousElementSibling; if(lbl) lbl.textContent = 'Llegada estimada (opcional)'; }
    if(esApartado){
      ['#pd_fecha','#pd_anticipo','#pd_fechaAnt'].forEach(sel => { const el = overlay.querySelector(sel); if(el) el.parentElement.style.display = 'none'; });
      overlay.querySelector('#pdMetWrap').style.display = 'none';
    }
    overlay.querySelectorAll('[data-group="pdmet"] button').forEach(b => b.addEventListener('click', () => {
      overlay.querySelectorAll('[data-group="pdmet"] button').forEach(x => x.classList.toggle('on', x === b));
    }));
    const itemsWrap = overlay.querySelector('#pdItems');
    const nombreInput = overlay.querySelector('#pd_nombre');
    const precioInput = overlay.querySelector('#pd_precio');
    let addOpen = items.length === 0;
    const renderItems = () => {
      itemsWrap.innerHTML = items.length ? `<div class="rep-card">${items.map((it, i) => `
          <div class="rep-line">
            <span style="min-width:0;"><span class="credit-title" style="display:block;">${it.cantidad} × ${escapeHtml(it.nombre)}</span><span class="credit-sub" style="display:block;">${it.caracteristicas ? escapeHtml(it.caracteristicas) : 'Sin características'}${it.precio ? ' · ' + money(it.precio) + ' c/u' : ''}</span></span>
            <button class="link-btn danger" data-rm="${i}">Quitar</button>
          </div>`).join('')}</div>` : `<div class="step-note">Aún no has agregado productos.</div>`;
      const resEl = overlay.querySelector('#pdResumen');
      if(items.length){
        const r = resumenPedido();
        resEl.innerHTML = `<div class="rep-card"><div class="rep-line"><span>Subtotal</span><span>${money(r.sub)}</span></div>${r.pct > 0 ? `<div class="rep-line"><span>Descuento (${r.pct}%)</span><span>−${money(r.desc)}</span></div>` : ''}<div class="rep-line strong"><span>Total del pedido</span><span>${money(r.total)}</span></div><div class="rep-line"><span>Anticipo</span><span>${money(r.ant)}</span></div><div class="rep-line strong"><span>Saldo por pagar</span><span>${money(r.saldo)}</span></div></div>`;
      } else resEl.innerHTML = '';
      const panel = overlay.querySelector('#pdAddPanel');
      const tog = overlay.querySelector('#pdAddToggle');
      const mostrarPanel = items.length === 0 || addOpen;
      panel.style.display = mostrarPanel ? '' : 'none';
      tog.style.display = (items.length > 0 && !addOpen) ? '' : 'none';
      itemsWrap.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { items.splice(Number(b.dataset.rm), 1); renderItems(); }));
    };
    const resumenPedido = () => {
      const sub = items.reduce((s,it) => s + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
      const pct = Math.min(100, Math.max(0, Number(overlay.querySelector('#pd_desc').value) || 0));
      const desc = sub * pct / 100;
      const base = sub - desc;
      const total = base + base * (Number(config.impuesto) || 0) / 100;
      const ant = Math.min(Number(overlay.querySelector('#pd_anticipo').value) || 0, total);
      return { sub, pct, desc, total, ant, saldo: total - ant };
    };
    overlay.querySelector('#pd_anticipo').addEventListener('input', renderItems);
    overlay.querySelector('#pd_desc').addEventListener('input', renderItems);
    nombreInput.addEventListener('input', () => {
      const prod = db.inventario.find(x => x.nombre.toLowerCase() === nombreInput.value.trim().toLowerCase());
      if(prod && !precioInput.value) precioInput.value = prod.precio || '';
    });
    overlay.querySelector('#pd_add').addEventListener('click', () => {
      const nombre = nombreInput.value.trim();
      const cant = Number(overlay.querySelector('#pd_cant').value) || 0;
      if(!nombre){ nombreInput.focus(); return; }
      if(cant <= 0){ overlay.querySelector('#pd_cant').focus(); return; }
      const prod = db.inventario.find(x => x.nombre.toLowerCase() === nombre.toLowerCase());
      items.push({
        productoId: prod ? prod.id : null,
        nombre: prod ? prod.nombre : nombre,
        cantidad: cant,
        precio: Number(precioInput.value) || 0,
        caracteristicas: overlay.querySelector('#pd_car').value.trim() || (prod && prod.descripcion) || '',
        costo: Number(overlay.querySelector('#pd_costo').value) || 0,
      });
      nombreInput.value = '';
      precioInput.value = '';
      overlay.querySelector('#pd_car').value = '';
      overlay.querySelector('#pd_costo').value = '';
      overlay.querySelector('#pd_cant').value = 1;
      addOpen = false;
      renderItems();
    });
    overlay.querySelector('#pd_cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#pdAddToggle').addEventListener('click', () => { addOpen = true; renderItems(); nombreInput.focus(); });
    overlay.querySelector('#pd_save').addEventListener('click', () => {
      const cli = db.clientes.find(c => c.id === overlay.querySelector('#pd_cliente').value);
      const fecha = overlay.querySelector('#pd_fecha').value;
      if(!cli) return;
      if(!fecha && !esApartado && !esEncargo){ overlay.querySelector('#pd_fecha').focus(); return; }
      if(items.length === 0){ nombreInput.focus(); return; }
      const antVal = Number(overlay.querySelector('#pd_anticipo').value) || 0;
      const metAnt = overlay.querySelector('[data-group="pdmet"] button.on')?.dataset.val || 'efectivo';
      const fechaAntVal = overlay.querySelector('#pd_fechaAnt').value || todayStr();
      const abonosPed = (record && record.abonos && record.abonos.length) ? record.abonos : (antVal > 0 ? [{ id: uid(), fecha: fechaAntVal, monto: antVal, metodo: metAnt, nota: tipoP === 'apartado' ? 'Abono inicial' : 'Anticipo' }] : []);
      const data = {
        id: record ? record.id : uid(),
        clienteId: cli.id,
        clienteNombre: cli.nombre,
        fechaEntrega: esApartado ? '' : fecha,
        tipo: tipoP,
        abonos: abonosPed,
        anticipo: antVal,
        anticipoMetodo: metAnt,
        descuentoPct: Math.min(100, Math.max(0, Number(overlay.querySelector('#pd_desc').value) || 0)),
        fechaAnticipo: fechaAntVal,
        items,
        notas: overlay.querySelector('#pd_notas').value.trim(),
        estado: 'pendiente',
        creadoTs: record ? (record.creadoTs || Date.now()) : Date.now(),
      };
      db.pedidos = record ? db.pedidos.map(x => x.id === record.id ? data : x) : [...db.pedidos, data];
      save('cuentas_pedidos', db.pedidos);
      overlay.remove();
      renderList();
    });
    renderItems();
  });
}

export function costoPedido(p){
  return p.items.reduce((s,it) => {
    const prod = db.inventario.find(x => x.id === it.productoId);
    const c = prod ? (Number(prod.costo) || 0) : (Number(it.costo) || 0);
    return s + c * (Number(it.cantidad) || 0);
  }, 0);
}
export function avisarPendienteWA(p, saldo){
  const cli = db.clientes.find(c => c.id === p.clienteId);
  if(!cli || !cli.telefono){ alert('Este cliente no tiene teléfono guardado. Agrégalo en Clientes.'); return; }
  const sal = saldo > 0 ? ` Saldo pendiente: ${money(saldo)}.` : '';
  const texto = p.tipo === 'apartado'
    ? `Hola ${p.clienteNombre}, te escribimos de ${config.nombre} para recordarte el saldo de tu apartado.${sal} Cuando quieras lo completamos. ¡Gracias!`
    : p.tipo === 'encargo'
      ? `Hola ${p.clienteNombre}, te escribimos de ${config.nombre}: tu encargo ya llegó.${sal} ¿Cuándo te lo podemos entregar? ¡Gracias!`
      : `Hola ${p.clienteNombre}, te recordamos tu pedido${p.fechaEntrega ? ' para el ' + fmtDate(p.fechaEntrega) : ''} en ${config.nombre}.${sal} ¡Gracias!`;
  window.open(waUrl(cli.telefono, texto), '_blank');
}

export function entregarPedido(p, opts){
  const cantPorProd = {};
  p.items.forEach(it => {
    if(it.productoId) cantPorProd[it.productoId] = (cantPorProd[it.productoId] || 0) + (Number(it.cantidad) || 0);
    (it.materiales || []).forEach(m => { cantPorProd[m.productoId] = (cantPorProd[m.productoId] || 0) + (Number(m.cantidad) || 0) * (Number(it.cantidad) || 0); });
  });
  const faltante = Object.keys(cantPorProd).map(pid => {
    const prod = db.inventario.find(x => x.id === pid);
    return prod && prod.stock !== '' && prod.stock !== null && Number(prod.stock) < cantPorProd[pid] ? prod : null;
  }).find(Boolean);
  if(faltante){
    alert(`No hay suficiente stock de ${faltante.nombre} para entregar este pedido (disponibles: ${faltante.stock}).`);
    return;
  }
  const items = p.items.map(it => ({ productoId: it.productoId, nombre: it.nombre, precio: Number(it.precio) || 0, cantidad: Number(it.cantidad) || 0, caracteristicas: it.caracteristicas || '', foto: it.foto || '', materiales: it.materiales || [] }));
  const sumaItems = items.reduce((s,it) => s + it.precio * it.cantidad, 0);
  const descPct = Math.min(100, Math.max(0, Number(p.descuentoPct) || 0));
  const descMonto = sumaItems * descPct / 100;
  const baseVenta = sumaItems - descMonto;
  const impuesto = baseVenta * (Number(config.impuesto) || 0) / 100;
  const total = baseVenta + impuesto;
  const costoTotal = costoPedido(p);
  const anticipo = Math.min(Number(p.anticipo) || 0, total);
  const saldo = total - anticipo;
  const hoy = todayStr();
  const cli = db.clientes.find(c => c.id === p.clienteId) || {};
  const detalles = p.items.filter(it => it.caracteristicas).map(it => `${it.nombre}: ${it.caracteristicas}`);
  const pagaAhora = !!(opts && opts.pagaAhora) && saldo > 0;
  const metodoSaldo = (opts && opts.metodo) || 'efectivo';
  const quedaCredito = saldo > 0 && !pagaAhora;
  const abonosVenta = [];
  if((p.abonos || []).length) (p.abonos).forEach(a => abonosVenta.push({ ...a, id: uid() }));
  else if(anticipo > 0) abonosVenta.push({ id: uid(), fecha: p.fechaAnticipo || hoy, monto: anticipo, metodo: 'efectivo', nota: 'Anticipo del pedido' });
  if(pagaAhora) abonosVenta.push({ id: uid(), fecha: hoy, monto: saldo, metodo: metodoSaldo, nota: 'Pago al entregar' });
  let metodoVenta;
  if(quedaCredito) metodoVenta = 'credito';
  else if(p.tipo === 'apartado') { const mets = [...new Set(abonosVenta.map(a => a.metodo))]; metodoVenta = mets.length > 1 ? 'mixto' : (mets[0] || 'efectivo'); }
  else if(pagaAhora && anticipo > 0 && metodoSaldo !== 'efectivo') metodoVenta = 'mixto';
  else metodoVenta = pagaAhora ? metodoSaldo : 'efectivo';
  const venta = {
    id: uid(), folio: null, creadoTs: Date.now(),
    clienteId: p.clienteId, clienteNombre: p.clienteNombre,
    clienteDireccion: cli.direccion || '', clienteTelefono: cli.telefono || '', clienteEmail: cli.email || '',
    items, sumaItems, descuentoTipo: 'pct', descuentoPct: descPct, descuentoMonto: descMonto, subtotal: sumaItems,
    impuesto, total, costoTotal, gananciaEstimada: baseVenta - costoTotal,
    notas: [p.notas, ...detalles].filter(Boolean).join(' · '),
    fecha: hoy,
    metodoPago: metodoVenta,
    fiado: quedaCredito,
    abonos: abonosVenta,
  };
  db.inventario = db.inventario.map(x => {
    const cant = cantPorProd[x.id];
    if(!cant || x.stock === '' || x.stock === null) return x;
    return { ...x, stock: Math.max(0, Number(x.stock) - cant) };
  });
  db.ventas = [...db.ventas, venta];
  db.pedidos = db.pedidos.map(x => x.id === p.id ? { ...x, estado: 'entregado' } : x);
  save('cuentas_ventas', db.ventas);
  save('cuentas_inventario', db.inventario);
  save('cuentas_pedidos', db.pedidos);
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  renderList();
  alert('Pedido entregado y registrado como venta. Puedes generar su factura desde Ventas.');
}

export function comprobanteDeAbono(p){
  const cli = db.clientes.find(c => c.id === p.clienteId) || {};
  const items = p.items.map(it => ({ productoId: it.productoId, nombre: it.nombre, precio: Number(it.precio) || 0, cantidad: Number(it.cantidad) || 0, caracteristicas: it.caracteristicas || '' }));
  const total = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const abonos = p.tipo === 'apartado'
    ? (p.abonos || []).map(a => ({ fecha: a.fecha, monto: Number(a.monto) || 0, metodo: a.metodo }))
    : ((Number(p.anticipo) || 0) > 0 ? [{ fecha: p.fechaAnticipo || todayStr(), monto: Number(p.anticipo) || 0, metodo: null }] : []);
  const numero = config.siguienteComprobante || 1;
  config.siguienteComprobante = numero + 1;
  save('cuentas_config', config);
  return { id: p.id, folio: numero, tituloDoc: 'COMPROBANTE DE ABONO', tipoDoc: 'Comprobante', fecha: todayStr(),
    clienteId: p.clienteId, clienteNombre: p.clienteNombre,
    clienteDireccion: cli.direccion || '', clienteTelefono: cli.telefono || '', clienteEmail: cli.email || '',
    items, sumaItems: total, subtotal: total, descuentoPct: 0, descuentoMonto: 0, impuesto: 0, total,
    fiado: true, abonos, metodoPago: '', notas: '' };
}

export function openComprobante(pedidoId){
  const p = db.pedidos.find(x => x.id === pedidoId);
  if(!p) return;
  const v = comprobanteDeAbono(p);
  openOverlay(`
      <div class="sheet-handle"></div>
      <div id="printArea">${buildInvoiceHtml(v)}</div>
      <div class="sheet-actions" style="margin-top:16px;">
        <button class="btn btn-secondary" id="closeBtn">Cerrar</button>
        <button class="btn btn-primary" id="printBtn">Guardar / Imprimir PDF</button>
      </div>
      <button class="btn btn-primary" id="pdfWaBtn" style="width:100%; margin-top:10px;">Compartir PDF por WhatsApp</button>
    `, (overlay) => {
    overlay.querySelector('#closeBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#printBtn').addEventListener('click', () => window.print());
    overlay.querySelector('#pdfWaBtn').addEventListener('click', () => compartirFacturaPDF(v, overlay));
  });
}

export function cancelarPedidoConEfecto(p){
  const base = (p.abonos && p.abonos.length) ? p.abonos
    : ((Number(p.anticipo) || 0) > 0 ? [{ fecha: p.fechaAnticipo || todayStr(), monto: Number(p.anticipo), metodo: null }] : []);
  const porMetodo = { efectivo: 0, tarjeta: 0 };
  base.forEach(a => { porMetodo[a.metodo === 'tarjeta' ? 'tarjeta' : 'efectivo'] += Number(a.monto) || 0; });
  const total = porMetodo.efectivo + porMetodo.tarjeta;
  const hoy = todayStr();
  const tipoTxt = p.tipo === 'apartado' ? 'apartado' : p.tipo === 'encargo' ? 'encargo' : 'pedido';
  const detalleDevolucion = total > 0
    ? `Se devolverán ${money(total)}: efectivo ${money(porMetodo.efectivo)}${porMetodo.tarjeta > 0 ? ' · tarjeta ' + money(porMetodo.tarjeta) : ''}. Se registrará como salida de caja hoy (${fmtDate(hoy)}).`
    : 'No tiene abonos, así que no hay dinero que devolver.';
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>¿Cancelar el ${tipoTxt}?</h2>
      <div class="step-note">${escapeHtml(p.clienteNombre)}</div>
      <div class="totals-box" style="margin-top:10px;">
        <div class="totals-row"><span>Total del ${tipoTxt}</span><span>${money((p.items || []).reduce((s2, it) => s2 + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0))}</span></div>
        <div class="totals-row grand"><span>A devolver</span><span>${money(total)}</span></div>
      </div>
      <div class="step-note" style="margin-top:10px;">${detalleDevolucion}</div>
      <div class="sheet-actions" style="margin-top:14px;">
        <button class="btn btn-secondary" id="ccNo">No, volver</button>
        <button class="btn btn-primary" id="ccSi" style="background:var(--danger);">${total > 0 ? 'Sí, cancelar y devolver' : 'Sí, cancelar'}</button>
      </div>
    `, (cf) => {
    cf.querySelector('#ccNo').addEventListener('click', () => cf.remove());
    cf.querySelector('#ccSi').addEventListener('click', (e) => {
      e.currentTarget.disabled = true;
      ['efectivo', 'tarjeta'].forEach(m => {
        if(porMetodo[m] > 0) db.gastos = [...db.gastos, { id: uid(), tipo: 'general', metodo: m, descripcion: `Devolución por ${tipoTxt} cancelado · ${p.clienteNombre}`, monto: porMetodo[m], fecha: hoy, categoria: 'Devolución' }];
      });
      db.pedidos = db.pedidos.map(x => x.id === p.id ? { ...x, estado: 'cancelado', canceladoFecha: hoy } : x);
      save('cuentas_gastos', db.gastos);
      save('cuentas_pedidos', db.pedidos);
      document.querySelectorAll('.overlay').forEach(o => o.remove());
      renderList();
    });
  });
}

export function registrarAbonoPedido(pedidoId){
  const p = db.pedidos.find(x => x.id === pedidoId);
  if(!p) return;
  const total = p.items.reduce((s,it) => s + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
  // Si aún no hay lista de abonos, el anticipo pasa a ser el primer abono (así no se pierde al sumar otro).
  const base = (p.abonos && p.abonos.length) ? p.abonos.slice()
    : ((Number(p.anticipo) || 0) > 0 ? [{ id: uid(), fecha: p.fechaAnticipo || todayStr(), monto: Number(p.anticipo), metodo: 'efectivo', nota: 'Anticipo' }] : []);
  const abonado = base.reduce((s,a) => s + (Number(a.monto) || 0), 0);
  const saldo = Math.max(0, total - abonado);
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Registrar abono</h2>
      <div class="step-note">${escapeHtml(p.clienteNombre)} · saldo pendiente ${money(saldo)}</div>
      <div class="field mono"><label>Monto (${config.moneda})</label><input type="number" inputmode="decimal" id="pa_monto" placeholder="0"></div>
      <div class="field"><label>Fecha</label><input type="date" id="pa_fecha" value="${todayStr()}"></div>
      <div class="section-label" style="margin:12px 0 8px;">Medio de pago</div>
      ${segHtml('pamet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], 'efectivo')}
      <div class="sheet-actions" style="margin-top:14px;">
        <button class="btn btn-secondary" id="paVolver">Volver</button>
        <button class="btn btn-primary" id="paSave">Registrar abono</button>
      </div>
    `, (ov) => {
    let met = 'efectivo';
    ov.querySelectorAll('[data-group="pamet"] button').forEach(b => b.addEventListener('click', () => {
      met = b.dataset.val;
      ov.querySelectorAll('[data-group="pamet"] button').forEach(x => x.classList.toggle('on', x === b));
    }));
    ov.querySelector('#paVolver').addEventListener('click', () => { ov.remove(); openPedidoDetalle(p.id); });
    ov.querySelector('#paSave').addEventListener('click', () => {
      const monto = Number(ov.querySelector('#pa_monto').value) || 0;
      const fecha = ov.querySelector('#pa_fecha').value;
      if(monto <= 0){ ov.querySelector('#pa_monto').focus(); return; }
      if(!fecha){ ov.querySelector('#pa_fecha').focus(); return; }
      if(monto > saldo){ alert(`El abono es mayor que el saldo (${money(saldo)}).`); return; }
      const nuevos = [...base, { id: uid(), fecha, monto, metodo: met, nota: 'Abono' }];
      db.pedidos = db.pedidos.map(x => x.id === p.id ? { ...x, abonos: nuevos, anticipo: nuevos.reduce((s,a) => s + (Number(a.monto) || 0), 0) } : x);
      save('cuentas_pedidos', db.pedidos);
      ov.remove();
      renderList();
      openPedidoDetalle(p.id);
    });
  });
}

export function openPedidoDetalle(id){
  const p = db.pedidos.find(x => x.id === id);
  if(!p) return;
  const total = p.items.reduce((s,it) => s + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
  const anticipo = Number(p.anticipo) || 0;
  const info = pedidoEstadoInfo(p);
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>${escapeHtml(p.clienteNombre)}</h2>
      <div class="step-note">${p.tipo === 'encargo' ? 'Encargo' : 'Pedido'} · ${p.fechaEntrega ? 'Entrega: <strong>' + fmtDate(p.fechaEntrega) + '</strong>' + (info.txt !== fmtDate(p.fechaEntrega) ? ' · ' + escapeHtml(info.txt) : '') : 'Sin fecha estimada'}</div>
      <div class="rep-card">
        ${p.items.map(it => `
          <div class="rep-line">
            <span style="min-width:0;"><span class="credit-title" style="display:block;">${it.cantidad} × ${escapeHtml(it.nombre)}</span><span class="credit-sub" style="display:block;">${it.caracteristicas ? escapeHtml(it.caracteristicas) : 'Sin características'}</span>${(it.materiales || []).length ? `<span class="credit-sub" style="display:block;">Materiales: ${it.materiales.map(m => `${(Number(m.cantidad) || 0) * (Number(it.cantidad) || 0)} × ${escapeHtml(m.nombre)}`).join(', ')}</span>` : ''}</span>
            ${it.foto ? `<img src="${it.foto}" alt="" style="width:56px; height:56px; object-fit:cover; border-radius:8px; margin:0 8px;">` : ''}
            <span>${it.precio ? money(it.precio * it.cantidad) : '—'}</span>
          </div>`).join('')}
        <div class="rep-line strong"><span>Total estimado</span><span>${money(total)}</span></div>
        <div class="rep-line"><span>Anticipo${p.fechaAnticipo ? ' · ' + fmtDate(p.fechaAnticipo) : ''}</span><span>${money(anticipo)}</span></div>
        <div class="rep-line"><span>Saldo al entregar</span><span>${money(Math.max(0, total - anticipo))}</span></div>
        <div class="rep-line"><span>Ganancia estimada</span><span class="${total - costoPedido(p) < 0 ? 'neg' : 'pos'}">${money(total - costoPedido(p))}</span></div>
      </div>
      ${p.notas ? `<div class="inv-notes" style="margin-top:12px;"><strong>Notas:</strong> ${escapeHtml(p.notas)}</div>` : ''}
      ${total - anticipo > 0 ? '<button class="btn btn-secondary" id="pdAbono" style="width:100%; margin-bottom:10px;">Registrar abono</button>' : ''}
      ${anticipo > 0 ? '<button class="btn btn-secondary" id="pdComp" style="width:100%; margin-bottom:10px;">Generar comprobante de abono</button>' : ''}
      <div class="sheet-actions" style="margin-top:16px;">
        <button class="btn btn-secondary" id="pdEditar">Editar</button>
        <button class="btn btn-secondary" id="pdWa">WhatsApp</button>
        <button class="btn btn-primary" id="pdEntregar">Marcar entregado</button>
      </div>
      <div id="pdConfirm"></div>
      <button class="btn-danger-text" id="pdCancelar">Cancelar pedido</button>
    `, (overlay) => {
    const confirmBox = overlay.querySelector('#pdConfirm');
    overlay.querySelector('#pdEditar').addEventListener('click', () => { overlay.remove(); openPedidoForm(p.id); });
    overlay.querySelector('#pdWa').addEventListener('click', () => avisarPendienteWA(p, Math.max(0, total - anticipo)));
    const pdComp = overlay.querySelector('#pdComp');
    if(pdComp) pdComp.addEventListener('click', () => { overlay.remove(); openComprobante(p.id); });
    const pdAbono = overlay.querySelector('#pdAbono');
    if(pdAbono) pdAbono.addEventListener('click', () => { overlay.remove(); registrarAbonoPedido(p.id); });
    overlay.querySelector('#pdEntregar').addEventListener('click', () => {
      const saldoPend = Math.max(0, total - anticipo);
      confirmBox.innerHTML = `
          <div class="rep-card" style="margin-top:12px; padding:14px;">
            <p style="font-size:14px; line-height:1.5; margin-bottom:10px;">Entrega a ${escapeHtml(p.clienteNombre)}. Saldo al entregar: <strong>${money(saldoPend)}</strong></p>
            ${saldoPend > 0 ? `
              ${segHtml('pdpago', [['pagado','Pagó el saldo'],['credito','Queda a crédito']], 'pagado')}
              <div id="pdMetWrap" style="margin-top:10px;">${segHtml('pdmet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], 'efectivo')}</div>` : ''}
            <div class="sheet-actions" style="margin-top:14px;">
              <button class="btn btn-secondary" id="pdNo">No</button>
              <button class="btn btn-primary" id="pdSi">Entregar</button>
            </div>
          </div>`;
      let modo = 'pagado';
      let met = 'efectivo';
      overlay.querySelectorAll('[data-group="pdpago"] button').forEach(b => b.addEventListener('click', () => {
        modo = b.dataset.val;
        overlay.querySelectorAll('[data-group="pdpago"] button').forEach(x => x.classList.toggle('on', x === b));
        const wrap = overlay.querySelector('#pdMetWrap');
        if(wrap) wrap.style.display = modo === 'pagado' ? '' : 'none';
      }));
      overlay.querySelectorAll('[data-group="pdmet"] button').forEach(b => b.addEventListener('click', () => {
        met = b.dataset.val;
        overlay.querySelectorAll('[data-group="pdmet"] button').forEach(x => x.classList.toggle('on', x === b));
      }));
      overlay.querySelector('#pdNo').addEventListener('click', () => { confirmBox.innerHTML = ''; });
      overlay.querySelector('#pdSi').addEventListener('click', () => entregarPedido(p, { pagaAhora: modo === 'pagado', metodo: met }));
    });
    overlay.querySelector('#pdCancelar').addEventListener('click', () => cancelarPedidoConEfecto(p));
  });
}

export function apartadoTotal(p){
  const sub = p.items.reduce((s,it) => s + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
  return sub * (1 + (Number(config.impuesto) || 0) / 100);
}
export function apartadoAbonado(p){ return (p.abonos || []).reduce((s,a) => s + (Number(a.monto) || 0), 0); }

export function renderApartadosHtml(){
  const term = searchInput.value.trim().toLowerCase();
  const todos = db.pedidos.filter(p => p.tipo === 'apartado' && p.estado === 'pendiente');
  const lista = todos.filter(p => p.clienteNombre.toLowerCase().includes(term))
    .sort((a,b) => (a.creadoTs || 0) - (b.creadoTs || 0));
  if(lista.length === 0){
    return emptyState(
      todos.length ? 'Sin resultados' : 'Sin apartados',
      todos.length ? 'Prueba con otro nombre de cliente.' : 'Toca + para apartar productos para alguien que paga por partes.'
    );
  }
  return '<ul class="list">' + lista.map(p => {
    const total = apartadoTotal(p);
    const abonado = apartadoAbonado(p);
    const saldo = Math.max(0, total - abonado);
    const ultimo = (p.abonos || []).slice().sort((a,b) => a.fecha.localeCompare(b.fecha)).pop();
    const resumen = p.items.map(it => `${it.cantidad} × ${it.nombre}`).join(', ');
    return `
        <li class="row" data-aid="${p.id}">
          <div class="row-main">
            <div class="row-title">${escapeHtml(p.clienteNombre)}</div>
            <div class="row-sub">${escapeHtml(resumen)}</div>
            <div class="row-sub">Abonado ${money(abonado)} de ${money(total)}${ultimo ? ' · último ' + fmtDate(ultimo.fecha) : ''}</div>
          </div>
          <div class="row-value-wrap">
            <div class="row-value" style="font-size:12.5px;${saldo <= 0 ? 'color:var(--accent-ink);' : ''}">${saldo <= 0 ? 'Pagado' : 'Falta ' + money(saldo)}</div>
          </div>
        </li>`;
  }).join('') + '</ul>';
}

export function openApartadoDetalle(id){
  const p = db.pedidos.find(x => x.id === id);
  if(!p) return;
  const total = apartadoTotal(p);
  const abonado = apartadoAbonado(p);
  const saldo = Math.max(0, total - abonado);
  const abonosOrd = (p.abonos || []).slice().sort((a,b) => a.fecha.localeCompare(b.fecha));
  const abonosHtml = abonosOrd.length
    ? abonosOrd.map(a => `<div class="rep-line"><span>${fmtDate(a.fecha)} · ${metodoLabel(a.metodo)}</span><span class="pos">${money(a.monto)}</span></div>`).join('')
    : '<div class="step-note" style="margin:0;">Aún no hay abonos.</div>';
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>${escapeHtml(p.clienteNombre)}</h2>
      <div class="step-note">Apartado · sin fecha fija de entrega</div>
      <div class="rep-card">
        ${p.items.map(it => `
          <div class="rep-line">
            <span style="min-width:0;"><span class="credit-title" style="display:block;">${it.cantidad} × ${escapeHtml(it.nombre)}</span><span class="credit-sub" style="display:block;">${it.caracteristicas ? escapeHtml(it.caracteristicas) : 'Sin características'}</span>${(it.materiales || []).length ? `<span class="credit-sub" style="display:block;">Materiales: ${it.materiales.map(m => `${(Number(m.cantidad) || 0) * (Number(it.cantidad) || 0)} × ${escapeHtml(m.nombre)}`).join(', ')}</span>` : ''}</span>
            ${it.foto ? `<img src="${it.foto}" alt="" style="width:56px; height:56px; object-fit:cover; border-radius:8px; margin:0 8px;">` : ''}
            <span>${it.precio ? money(it.precio * it.cantidad) : '—'}</span>
          </div>`).join('')}
        <div class="rep-line strong"><span>Total</span><span>${money(total)}</span></div>
        <div class="rep-line"><span>Abonado</span><span class="pos">${money(abonado)}</span></div>
        <div class="rep-line strong"><span>Saldo pendiente</span><span>${money(saldo)}</span></div>
      </div>
      <div class="section-label" style="margin-top:14px;">Abonos</div>
      <div class="rep-card">${abonosHtml}</div>
      ${saldo > 0 ? `
        <div class="rep-card" style="margin-top:12px; padding:14px;">
          <div class="row2">
            <div class="field mono"><label>Monto (${config.moneda})</label><input type="number" inputmode="decimal" id="ab_monto" placeholder="0"></div>
            <div class="field"><label>Fecha del abono</label><input type="date" id="ab_fecha" value="${todayStr()}"></div>
          </div>
          ${segHtml('abmet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], 'efectivo')}
          <div class="sheet-actions" style="margin-top:12px;"><button class="btn btn-primary" id="abSave">Registrar abono</button></div>
        </div>` : ''}
      ${abonado > 0 ? '<button class="btn btn-secondary" id="abComp" style="width:100%; margin-bottom:10px;">Generar comprobante de abono</button>' : ''}
      <div class="sheet-actions" style="margin-top:14px;">
        <button class="btn btn-secondary" id="abEditar">Editar</button>
        <button class="btn btn-secondary" id="abWa">WhatsApp</button>
        <button class="btn btn-primary" id="abEntregar" ${saldo > 0 ? 'disabled' : ''}>${saldo > 0 ? 'Falta pagar para entregar' : 'Entregar productos'}</button>
      </div>
      <button class="btn-danger-text" id="abCancelar">Cancelar apartado</button>
    `, (overlay) => {
    let met = 'efectivo';
    overlay.querySelectorAll('[data-group="abmet"] button').forEach(b => b.addEventListener('click', () => {
      met = b.dataset.val;
      overlay.querySelectorAll('[data-group="abmet"] button').forEach(x => x.classList.toggle('on', x === b));
    }));
    const saveBtn = overlay.querySelector('#abSave');
    if(saveBtn) saveBtn.addEventListener('click', () => {
      const monto = Number(overlay.querySelector('#ab_monto').value) || 0;
      const fecha = overlay.querySelector('#ab_fecha').value;
      if(monto <= 0){ overlay.querySelector('#ab_monto').focus(); return; }
      if(!fecha){ overlay.querySelector('#ab_fecha').focus(); return; }
      if(monto > saldo){ alert(`El abono es mayor que el saldo (${money(saldo)}).`); return; }
      const nuevos = [...(p.abonos || []), { id: uid(), fecha, monto, metodo: met, nota: 'Abono' }];
      db.pedidos = db.pedidos.map(x => x.id === p.id ? { ...x, abonos: nuevos, anticipo: nuevos.reduce((s,a) => s + (Number(a.monto) || 0), 0) } : x);
      save('cuentas_pedidos', db.pedidos);
      overlay.remove();
      renderList();
      openApartadoDetalle(p.id);
    });
    overlay.querySelector('#abEditar').addEventListener('click', () => { overlay.remove(); openPedidoForm(p.id); });
    overlay.querySelector('#abWa').addEventListener('click', () => avisarPendienteWA(p, saldo));
    const abComp = overlay.querySelector('#abComp');
    if(abComp) abComp.addEventListener('click', () => { overlay.remove(); openComprobante(p.id); });
    overlay.querySelector('#abEntregar').addEventListener('click', () => {
      if(saldo > 0) return;
      overlay.remove();
      entregarPedido(p);
    });
    overlay.querySelector('#abCancelar').addEventListener('click', () => cancelarPedidoConEfecto(p));
  });
}

