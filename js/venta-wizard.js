// Asistente para registrar una venta nueva.
import { renderList } from './app.js';
import { generarFactura } from './facturas.js';
import { unidadesReservadas } from './pedidos.js';
import { config, db, save, ui } from './state.js';
import { imagePickerHtml, openOverlay, segHtml, wireImagePicker } from './ui.js';
import { METODOS, escapeHtml, fmtDate, money, todayStr, uid } from './utils.js';

// ============================================================
// FACTURAS — flujo de nueva venta/factura
// ============================================================
export function openVentaWizard(){
  if(db.clientes.length === 0){
    openOverlay(`
        <div class="sheet-handle"></div>
        <h2>Necesitas un cliente</h2>
        <p style="color:var(--ink-soft); font-size:14px; line-height:1.5;">Antes de registrar una venta, registra al menos un cliente en la pestaña Clientes.</p>
        <div class="sheet-actions"><button class="btn btn-primary" id="okBtn" style="flex:1;">Entendido</button></div>
      `, (overlay) => overlay.querySelector('#okBtn').addEventListener('click', () => overlay.remove()));
    return;
  }
  const cart = [];
  let selectedCliente = null;
  let notas = '';
  let descuentoTipo = 'monto';
  let descuentoValor = 0;
  let metodoPago = 'efectivo';
  let tipoOp = 'venta';
  let abonoIni = 0;
  let abonoMet = 'efectivo';
  let mixEf = 0;
  let mixTj = 0;

  function sumaItems(){ return cart.reduce((s,it) => s + it.precioUnit * it.cantidad, 0); }
  function descuentoMonto(){
    if(descuentoTipo === 'monto') return Math.min(Math.max(0, Number(descuentoValor) || 0), sumaItems());
    return sumaItems() * (Number(descuentoValor) || 0) / 100;
  }
  function descuentoPctEf(){
    const s0 = sumaItems();
    return s0 > 0 ? Math.round(descuentoMonto() / s0 * 10000) / 100 : 0;
  }
  function subtotal(){ return sumaItems() - descuentoMonto(); }
  function impuestoMonto(){ return subtotal() * (Number(config.impuesto)||0) / 100; }
  function total(){ return subtotal() + impuestoMonto(); }
  function stockMax(productoId){
    const p = db.inventario.find(x => x.id === productoId);
    if(!p || p.stock === '' || p.stock === null || p.stock === undefined) return Infinity;
    return Math.max(0, (Number(p.stock) || 0) - unidadesReservadas(productoId));
  }
  function sinStockMsg(nombre, max){
    return max <= 0 ? `${nombre} no tiene stock disponible (puede estar reservado para pedidos).` : `Solo tienes ${max} unid. disponibles de ${nombre} (el resto está reservado para pedidos).`;
  }

  const overlay = openOverlay(bodyStep1(), mountStep1);

  function bodyStep1(){
    return `
        <div class="sheet-handle"></div>
        <h2>Nueva venta</h2>
        <div class="step-note">Paso 1 de 2 · elige el cliente</div>
        <div class="pick-list">
          ${db.clientes.map(c => `<div class="pick-row" data-id="${c.id}"><span class="name">${escapeHtml(c.nombre)}</span><span class="meta">${escapeHtml(c.telefono||'')}</span></div>`).join('')}
        </div>
        <div class="sheet-actions"><button class="btn btn-secondary" id="cancelBtn" style="flex:1;">Cancelar</button></div>
      `;
  }
  function mountStep1(ov, sheet){
    sheet.querySelector('#cancelBtn').addEventListener('click', () => ov.remove());
    sheet.querySelectorAll('.pick-row').forEach(row => row.addEventListener('click', () => {
      selectedCliente = db.clientes.find(c => c.id === row.getAttribute('data-id'));
      sheet.innerHTML = bodyStep2();
      mountStep2(ov, sheet);
    }));
  }

  function bodyStep2(){
    return `
        <div class="sheet-handle"></div>
        <h2>Nueva venta</h2>
        <div class="step-note">Paso 2 de 2 · cliente: ${escapeHtml(selectedCliente.nombre)}</div>
        <div class="add-item-row"><input type="text" id="prodSearch" placeholder="Buscar producto..."></div>
        <div class="pick-list" id="prodPickList" style="display:none;"></div>
        <button class="link-btn" id="svcBtn" style="display:block; margin:8px 0 0;">+ Agregar servicio o producto libre</button>
        <button class="link-btn" id="medidaBtn" style="display:block; margin:4px 0 0;">+ Prenda a medida (con materiales del stock)</button>
        <div id="cartWrap"></div>
        <div class="field" style="margin-top:14px;"><label>Notas para el cliente (opcional)</label><textarea id="f_notas" rows="2" placeholder="Ej. Forma de pago, garantía, condiciones de entrega">${escapeHtml(notas)}</textarea></div>
        <div class="section-label" style="margin:14px 0 8px;">¿Qué estás registrando?</div>
        ${segHtml('tipoop', [['venta','Venta'],['pedido','Pedido'],['encargo','Encargo'],['apartado','Apartado']], tipoOp)}
        <div id="opWrap" style="margin-top:12px;"></div>
        <div id="payBlock">
          <div class="section-label" style="margin:14px 0 8px;">Forma de pago</div>
          ${segHtml('pago', [['efectivo','Efectivo'],['tarjeta','Tarjeta'],['credito','A crédito'],['mixto','Mixto']], metodoPago)}
          <div id="abonoWrap" style="margin-top:12px;"></div>
        </div>
        <div class="totals-box" id="totalsBox"></div>
        <div id="gananciaWrap"></div>
        <div class="sheet-actions" style="margin-top:14px;">
          <button class="btn btn-secondary" id="backBtn">Atrás</button>
          <button class="btn btn-primary" id="saveVentaBtn">Registrar venta</button>
        </div>
      `;
  }
  function mountStep2(ov, sheet){
    const prodSearch = sheet.querySelector('#prodSearch');
    const prodPickList = sheet.querySelector('#prodPickList');
    const cartWrap = sheet.querySelector('#cartWrap');
    const totalsBox = sheet.querySelector('#totalsBox');
    const saveBtn = sheet.querySelector('#saveVentaBtn');
    let opMetodo = 'efectivo';
    function renderOpWrap(){
      const wrap = sheet.querySelector('#opWrap');
      const pay = sheet.querySelector('#payBlock');
      const btn = sheet.querySelector('#saveVentaBtn');
      if(tipoOp === 'venta'){
        wrap.innerHTML = '';
        pay.style.display = '';
        btn.textContent = 'Registrar venta';
        return;
      }
      pay.style.display = 'none';
      const esPedido = tipoOp === 'pedido', esEnc = tipoOp === 'encargo', esApa = tipoOp === 'apartado';
      wrap.innerHTML = `
          ${esApa ? '' : `<div class="row2"><div class="field"><label>${esEnc ? 'Llegada estimada (opcional)' : 'Fecha de entrega'}</label><input type="date" id="op_fecha" value="${esEnc ? '' : todayStr()}"></div></div>`}
          <div class="row2">
            <div class="field mono"><label>${esApa ? 'Abono inicial' : 'Anticipo'} (${config.moneda})</label><input type="number" inputmode="decimal" id="op_anticipo" placeholder="0"></div>
            <div class="field"><label>Fecha del abono</label><input type="date" id="op_fechaAnt" value="${todayStr()}"></div>
          </div>
          <div class="section-label" style="margin:10px 0 6px;">Forma de pago del ${esApa ? 'abono' : 'anticipo'}</div>
          ${segHtml('opmet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], opMetodo)}
          <div class="step-note">${esPedido ? 'Los productos quedan reservados hasta la fecha de entrega.' : esEnc ? 'No descuenta stock. Lo entregas cuando el producto llegue y lo registres en inventario.' : 'Los productos quedan reservados. Los abonos los registras cuando lleguen.'}</div>`;
      btn.textContent = esPedido ? 'Agendar pedido' : esEnc ? 'Registrar encargo' : 'Crear apartado';
    }
    function guardarPendiente(){
      if(cart.length === 0){ alert('Agrega productos primero.'); return; }
      const msgMat = validarMateriales(cart.map(it => ({ ...it, productoId: null })));
      if(msgMat){ alert(msgMat); return; }
      if(tipoOp !== 'encargo'){
        const excedido = cart.find(it => it.cantidad > stockMax(it.productoId));
        if(excedido){ alert(sinStockMsg(excedido.nombre, stockMax(excedido.productoId))); return; }
      }
      const fechaEl = sheet.querySelector('#op_fecha');
      const fecha = fechaEl ? fechaEl.value : '';
      if(tipoOp === 'pedido' && !fecha){ fechaEl.focus(); return; }
      const anticipo = Number(sheet.querySelector('#op_anticipo').value) || 0;
      const fechaAnt = sheet.querySelector('#op_fechaAnt').value || todayStr();
      const abonos = anticipo > 0
        ? [{ id: uid(), fecha: fechaAnt, monto: anticipo, metodo: opMetodo, nota: tipoOp === 'apartado' ? 'Abono inicial' : 'Anticipo' }]
        : [];
      const nuevo = {
        id: uid(), clienteId: selectedCliente.id, clienteNombre: selectedCliente.nombre,
        tipo: tipoOp,
        fechaEntrega: tipoOp === 'apartado' ? '' : fecha,
        anticipo: tipoOp === 'apartado' ? abonos.reduce((s,a) => s + a.monto, 0) : anticipo,
        fechaAnticipo: fechaAnt,
        abonos,
        items: cart.map(it => ({ productoId: it.productoId, nombre: it.nombre, cantidad: it.cantidad, precio: it.precioUnit, caracteristicas: it.caracteristicas || '', foto: it.foto || '', materiales: it.materiales || [], costo: Number(it.costo) || 0 })),
        notas: notas || '',
        estado: 'pendiente',
        creadoTs: Date.now(),
      };
      db.pedidos = [...db.pedidos, nuevo];
      save('cuentas_pedidos', db.pedidos);
      ov.remove();
      ui.ventasVista = 'pedidos';
      renderList();
      alert(tipoOp === 'pedido' ? 'Pedido agendado. Los productos quedan reservados hasta la entrega.'
        : tipoOp === 'encargo' ? 'Encargo registrado. Lo entregas cuando el producto llegue.'
        : 'Apartado creado. Los productos quedan reservados hasta que se paguen.');
    }
    sheet.querySelectorAll('[data-group="tipoop"] button').forEach(b => b.addEventListener('click', () => {
      tipoOp = b.dataset.val;
      sheet.querySelectorAll('[data-group="tipoop"] button').forEach(x => x.classList.toggle('on', x === b));
      renderOpWrap();
    }));
    sheet.querySelector('#opWrap').addEventListener('click', (e) => {
      const b = e.target.closest('[data-group="opmet"] button');
      if(!b) return;
      opMetodo = b.dataset.val;
      sheet.querySelectorAll('[data-group="opmet"] button').forEach(x => x.classList.toggle('on', x === b));
    });
    renderOpWrap();
    const notasInput = sheet.querySelector('#f_notas');
    const gananciaWrap = sheet.querySelector('#gananciaWrap');
    let gananciaOpen = false;
    notasInput.addEventListener('input', () => { notas = notasInput.value; });
    const abonoWrap = sheet.querySelector('#abonoWrap');
    function renderAbonoWrap(){
      sheet.querySelectorAll('[data-group="pago"] button').forEach(b => b.classList.toggle('on', b.dataset.val === metodoPago));
      if(metodoPago === 'credito'){
        abonoWrap.innerHTML = `
            <div class="field mono"><label>Abono inicial (${config.moneda}) · opcional</label><input type="number" inputmode="decimal" id="f_abonoIni" value="${abonoIni || ''}" placeholder="0"></div>
            <div class="field"><label>Medio del abono inicial</label>${segHtml('abmet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], abonoMet)}</div>
            <div class="step-note">Saldo a crédito: <strong id="restVal"></strong></div>`;
      } else if(metodoPago === 'mixto'){
        abonoWrap.innerHTML = `
            <div class="row2">
              <div class="field mono"><label>Efectivo (${config.moneda})</label><input type="number" inputmode="decimal" id="f_efectivo" value="${mixEf || ''}" placeholder="0"></div>
              <div class="field mono"><label>Tarjeta (${config.moneda})</label><input type="number" inputmode="decimal" id="f_tarjeta" value="${mixTj || ''}" placeholder="0"></div>
            </div>
            <div class="step-note">Lo que quede se registra como saldo a crédito: <strong id="restVal"></strong></div>`;
      } else {
        abonoWrap.innerHTML = '';
      }
      updateRest();
    }
    function updateRest(){
      const el = abonoWrap.querySelector('#restVal');
      if(!el) return;
      const t = total();
      let rest;
      if(metodoPago === 'credito'){ rest = t - Math.min(abonoIni, t); }
      else { const ef = Math.min(mixEf, t); rest = t - ef - Math.min(mixTj, t - ef); }
      el.textContent = money(Math.max(0, rest));
    }
    function openConfirmarVenta(onConfirm){
      const pg = calcPagos();
      const sub = sumaItems();
      const dMonto = descuentoMonto();
      const imp = impuestoMonto();
      const tot = total();
      const filas = cart.map(it => `<div class="totals-row"><span>${it.cantidad} × ${escapeHtml(it.nombre)}</span><span>${money(it.precioUnit * it.cantidad)}</span></div>`).join('');
      const pagado = pg.pagos.reduce((s2, a) => s2 + (Number(a.monto) || 0), 0);
      let pagoTxt;
      if(metodoPago === 'credito') pagoTxt = `A crédito · abono inicial ${money(pagado)} · saldo ${money(tot - pagado)}`;
      else if(metodoPago === 'mixto') pagoTxt = pg.pagos.map(a => `${a.metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo'} ${money(a.monto)}`).join(' · ');
      else pagoTxt = `${METODOS[metodoPago] || metodoPago} · pagado completo`;
      openOverlay(`
          <div class="sheet-handle"></div>
          <h2>Confirmar venta</h2>
          <div class="step-note">Revisa antes de cobrar. Estos datos no se pueden editar aquí.</div>
          <div class="totals-box" style="margin-top:8px;">
            <div class="totals-row"><span>Cliente</span><span>${escapeHtml(selectedCliente.nombre)}</span></div>
            <div class="totals-row"><span>Fecha</span><span>${fmtDate(todayStr())}</span></div>
          </div>
          <div class="section-label" style="margin:12px 0 6px;">Productos</div>
          <div class="totals-box" style="margin-top:0;">${filas}</div>
          <div class="section-label" style="margin:12px 0 6px;">Cobro</div>
          <div class="totals-box" style="margin-top:0;">
            <div class="totals-row"><span>Suma de productos</span><span>${money(sub)}</span></div>
            ${dMonto > 0 ? `<div class="totals-row"><span>Descuento</span><span>-${money(dMonto)}</span></div>` : ''}
            ${imp > 0 ? `<div class="totals-row"><span>Impuesto (${config.impuesto}%)</span><span>${money(imp)}</span></div>` : ''}
            <div class="totals-row grand"><span>Total a cobrar</span><span>${money(tot)}</span></div>
            <div class="totals-row"><span>Forma de pago</span><span>${escapeHtml(pagoTxt)}</span></div>
          </div>
          ${notas ? `<div class="step-note" style="margin-top:10px;"><strong>Notas:</strong> ${escapeHtml(notas)}</div>` : ''}
          <div class="sheet-actions" style="margin-top:14px;">
            <button class="btn btn-secondary" id="cfVolver">Volver</button>
            <button class="btn btn-primary" id="cfConfirmar">Confirmar cobro</button>
          </div>
        `, (cf) => {
        cf.querySelector('#cfVolver').addEventListener('click', () => cf.remove());
        cf.querySelector('#cfConfirmar').addEventListener('click', (e) => {
          e.currentTarget.disabled = true;
          cf.remove();
          onConfirm();
        });
      });
    }

    function calcPagos(){
      const t = total();
      const hoy = todayStr();
      if(metodoPago === 'efectivo' || metodoPago === 'tarjeta'){
        return { fiado: false, pagos: [{ id: uid(), fecha: hoy, monto: t, metodo: metodoPago, nota: '' }] };
      }
      if(metodoPago === 'credito'){
        const ini = Math.min(abonoIni, t);
        return { fiado: true, pagos: ini > 0 ? [{ id: uid(), fecha: hoy, monto: ini, metodo: abonoMet, nota: 'Abono inicial' }] : [] };
      }
      const ef = Math.min(mixEf, t);
      const tj = Math.min(mixTj, t - ef);
      const pagos = [];
      if(ef > 0) pagos.push({ id: uid(), fecha: hoy, monto: ef, metodo: 'efectivo', nota: 'Mixto' });
      if(tj > 0) pagos.push({ id: uid(), fecha: hoy, monto: tj, metodo: 'tarjeta', nota: 'Mixto' });
      return { fiado: (t - ef - tj) > 0, pagos };
    }
    sheet.querySelectorAll('[data-group="pago"] button').forEach(b => b.addEventListener('click', () => {
      metodoPago = b.dataset.val;
      renderAbonoWrap();
    }));
    abonoWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-group="abmet"] button');
      if(!b) return;
      abonoMet = b.dataset.val;
      renderAbonoWrap();
    });
    abonoWrap.addEventListener('input', (e) => {
      if(e.target.id === 'f_abonoIni') abonoIni = Number(e.target.value) || 0;
      else if(e.target.id === 'f_efectivo') mixEf = Number(e.target.value) || 0;
      else if(e.target.id === 'f_tarjeta') mixTj = Number(e.target.value) || 0;
      updateRest();
    });
    sheet.addEventListener('click', updateRest);
    sheet.addEventListener('input', updateRest);
    renderAbonoWrap();

    function costoTotal(){ return cart.reduce((s,it) => s + (Number(it.costo)||0) * it.cantidad, 0); }
    function gananciaEstimada(){ return subtotal() - costoTotal(); }

    function renderGanancia(){
      const g = gananciaEstimada();
      const ct = costoTotal();
      const margenPct = ct > 0 ? Math.round((g / ct) * 100) : null;
      gananciaWrap.innerHTML = `
          <div class="ganancia-panel">
            <div class="ganancia-toggle" id="gananciaToggle">
              <span class="g-label">Ganancia estimada de esta venta</span>
              <span><span class="g-value ${g >= 0 ? 'pos' : 'neg'}">${money(g)}</span><span class="chev">${gananciaOpen ? '▲' : '▼'}</span></span>
            </div>
            ${gananciaOpen ? `
              <div class="ganancia-body">
                <div class="totals-row"><span>Costo de los productos</span><span>${money(ct)}</span></div>
                ${descuentoMonto() > 0 ? `<div class="totals-row"><span>Descuento aplicado</span><span>-${money(descuentoMonto())}</span></div>` : ''}
                <div class="totals-row"><span>Ingreso (después de descuento)</span><span>${money(subtotal())}</span></div>
                ${margenPct !== null ? `<div class="totals-row"><span>Margen sobre el costo</span><span>${margenPct}%</span></div>` : ''}
              </div>
            ` : ''}
          </div>
        `;
      gananciaWrap.querySelector('#gananciaToggle').addEventListener('click', () => { gananciaOpen = !gananciaOpen; renderGanancia(); });
    }

    sheet.querySelector('#backBtn').addEventListener('click', () => {
      selectedCliente = null;
      sheet.innerHTML = bodyStep1();
      mountStep1(ov, sheet);
    });

    function renderProdPick(){
      const term = prodSearch.value.trim().toLowerCase();
      if(!term){ prodPickList.style.display = 'none'; prodPickList.innerHTML=''; return; }
      const matches = db.inventario.filter(p => p.nombre.toLowerCase().includes(term)).slice(0,8);
      if(matches.length === 0){
        prodPickList.style.display = 'block';
        prodPickList.innerHTML = `<div class="pick-row" style="cursor:default;"><span class="name">Sin productos con ese nombre</span></div>`;
        return;
      }
      prodPickList.style.display = 'block';
      prodPickList.innerHTML = matches.map(p => `<div class="pick-row" data-id="${p.id}"><span class="name">${escapeHtml(p.nombre)}</span><span class="meta">${money(p.precio)}</span></div>`).join('');
      prodPickList.querySelectorAll('.pick-row[data-id]').forEach(row => row.addEventListener('click', () => {
        const p = db.inventario.find(x => x.id === row.getAttribute('data-id'));
        const existing = cart.find(it => it.productoId === p.id);
        const enCarrito = existing ? existing.cantidad : 0;
        if(enCarrito + 1 > stockMax(p.id)){ alert(sinStockMsg(p.nombre, stockMax(p.id))); return; }
        if(existing) existing.cantidad += 1;
        else cart.push({ productoId: p.id, nombre: p.nombre, precioCatalogo: p.precio, precioUnit: p.precio, costo: Number(p.costo)||0, cantidad: 1, stockDisponible: p.stock });
        prodSearch.value = '';
        prodPickList.style.display = 'none';
        renderCart();
      }));
    }
    prodSearch.addEventListener('input', renderProdPick);

    sheet.querySelector('#svcBtn').addEventListener('click', () => {
      let foto = '';
      openOverlay(`
          <div class="sheet-handle"></div>
          <h2>Servicio o producto libre</h2>
          <div class="step-note">Para algo que no está en tu inventario, como una asesoría o un mantenimiento. No descuenta stock.</div>
          ${imagePickerHtml('sv_foto', 'Foto de la pieza (opcional)', '', 'Sin foto')}
          <div class="field"><label>Nombre</label><input type="text" id="sv_nombre" placeholder="Ej. Asesoría, mantenimiento, envío"></div>
          <div class="field"><label>Trabajo a realizar (opcional)</label><textarea id="sv_car" rows="2" placeholder="Ej. Cambiar cierre y ajustar eslabones"></textarea></div>
          <div class="row2">
            <div class="field mono"><label>Precio (${config.moneda})</label><input type="number" inputmode="decimal" id="sv_precio" placeholder="0"></div>
            <div class="field mono"><label>Cantidad</label><input type="number" inputmode="numeric" id="sv_cant" value="1"></div>
          </div>
          <div class="field mono"><label>Costo (opcional, ${config.moneda})</label><input type="number" inputmode="decimal" id="sv_costo" placeholder="0"></div>
          <div class="sheet-actions">
            <button class="btn btn-secondary" id="svVolver">Volver</button>
            <button class="btn btn-primary" id="svAgregar">Agregar</button>
          </div>
        `, (svOv) => {
        svOv.querySelector('#svVolver').addEventListener('click', () => svOv.remove());
        wireImagePicker(svOv, 'sv_foto', 'Sin foto', 300, (d) => { foto = d; });
        svOv.querySelector('#svAgregar').addEventListener('click', () => {
          const nombre = svOv.querySelector('#sv_nombre').value.trim();
          const car = svOv.querySelector('#sv_car').value.trim();
          const precio = Number(svOv.querySelector('#sv_precio').value) || 0;
          const cant = Number(svOv.querySelector('#sv_cant').value) || 0;
          const costo = Number(svOv.querySelector('#sv_costo').value) || 0;
          if(!nombre){ svOv.querySelector('#sv_nombre').focus(); return; }
          if(cant <= 0){ svOv.querySelector('#sv_cant').focus(); return; }
          cart.push({ productoId: null, nombre, caracteristicas: car, foto, precioCatalogo: precio, precioUnit: precio, costo, cantidad: cant, stockDisponible: '' });
          svOv.remove();
          renderCart();
        });
      });
    });

    sheet.querySelector('#medidaBtn').addEventListener('click', () => {
      let foto = '';
      let mats = [{ productoId: '', cantidad: 1 }];
      openOverlay(`
          <div class="sheet-handle"></div>
          <h2>Prenda a medida</h2>
          <div class="step-note">${tipoOp === 'venta' ? 'Descuenta los materiales del stock.' : 'Los materiales quedan reservados y se descuentan al entregar.'} La prenda no se guarda como producto del inventario.</div>
          ${imagePickerHtml('ma_foto', 'Foto de la prenda (opcional)', '', 'Sin foto')}
          <div class="field"><label>Nombre</label><input type="text" id="ma_nombre" placeholder="Ej. Manilla roja y negra"></div>
          <div class="field"><label>Características</label><textarea id="ma_car" rows="2" placeholder="Ej. Cierre ajustable, talla única"></textarea></div>
          <div class="field mono"><label>Cantidad de prendas</label><input type="number" inputmode="numeric" id="ma_cant" value="1"></div>
          <div class="section-label" style="margin:12px 0 6px;">Materiales que usa por prenda</div>
          <div id="ma_lista"></div>
          <button type="button" class="link-btn" id="ma_addMat" style="display:block; margin:6px 0 0;">+ Agregar material</button>
          <div class="totals-box" id="ma_precio_box" style="margin-top:12px;"></div>
          <div id="ma_err" style="color:#b42318; font-size:13px; margin-top:8px;"></div>
          <div class="sheet-actions" style="margin-top:14px;">
            <button class="btn btn-secondary" id="maVolver">Volver</button>
            <button class="btn btn-primary" id="maAgregar">Agregar</button>
          </div>
        `, (maOv) => {
        const lista = maOv.querySelector('#ma_lista');
        const err = maOv.querySelector('#ma_err');
        const precioPrenda = () => mats.reduce((s, m) => {
          const pr = db.inventario.find(x => x.id === m.productoId);
          return s + (pr ? (Number(pr.precio) || 0) * (Number(m.cantidad) || 0) : 0);
        }, 0);
        const pintarPrecio = () => {
          maOv.querySelector('#ma_precio_box').innerHTML = `
              <div class="tr"><span>Precio por prenda</span><strong>${money(precioPrenda())}</strong></div>
              <div style="font-size:12px; color:var(--ink-soft); margin-top:4px;">Se calcula sumando el precio de cada material elegido.</div>`;
        };
        const pintar = () => {
          lista.innerHTML = mats.map((m, i) => `
              <div class="row2">
                <div class="field"><label>Material ${i + 1}</label><select class="mat-prod" data-mat="${i}"><option value="">Elegir…</option>${db.inventario.map(x => `<option value="${x.id}" ${x.id === m.productoId ? 'selected' : ''}>${escapeHtml(x.nombre)} · ${money(x.precio)}</option>`).join('')}</select></div>
                <div class="field mono"><label>Cantidad</label><input type="number" inputmode="numeric" class="mat-cant" data-mat="${i}" value="${m.cantidad}"></div>
              </div>
              <button type="button" class="link-btn danger mat-del" data-mat="${i}" style="margin:-4px 0 10px;">Quitar este material</button>`).join('');
          pintarPrecio();
        };
        pintar();
        wireImagePicker(maOv, 'ma_foto', 'Sin foto', 300, (d) => { foto = d; });
        maOv.querySelector('#ma_addMat').addEventListener('click', () => { mats.push({ productoId: '', cantidad: 1 }); pintar(); });
        lista.addEventListener('change', (e) => {
          if(e.target.classList.contains('mat-prod')){ mats[Number(e.target.dataset.mat)].productoId = e.target.value; pintarPrecio(); }
        });
        lista.addEventListener('input', (e) => {
          if(e.target.classList.contains('mat-cant')){ mats[Number(e.target.dataset.mat)].cantidad = Number(e.target.value) || 0; pintarPrecio(); }
        });
        lista.addEventListener('click', (e) => {
          if(e.target.classList.contains('mat-del')){
            mats.splice(Number(e.target.dataset.mat), 1);
            if(!mats.length) mats.push({ productoId: '', cantidad: 1 });
            pintar();
          }
        });
        maOv.querySelector('#maVolver').addEventListener('click', () => maOv.remove());
        maOv.querySelector('#maAgregar').addEventListener('click', () => {
          const nombre = maOv.querySelector('#ma_nombre').value.trim();
          const car = maOv.querySelector('#ma_car').value.trim();
          const cant = Number(maOv.querySelector('#ma_cant').value) || 0;
          const faltan = [];
          if(!nombre) faltan.push('nombre de la prenda');
          if(cant <= 0) faltan.push('cantidad de prendas (mayor que 0)');
          mats.forEach((m, i) => {
            if(!m.productoId) faltan.push(`elegir el material ${i + 1} (o quitarlo)`);
            else if(!(m.cantidad > 0)) faltan.push(`cantidad del material ${i + 1} (mayor que 0)`);
          });
          if(!mats.some(m => m.productoId && m.cantidad > 0)) faltan.push('al menos un material del inventario');
          if(faltan.length){
            err.innerHTML = 'Falta: ' + faltan.join(' · ');
            return;
          }
          const agrupados = mats.reduce((acc, m) => {
            const ex = acc.find(x => x.productoId === m.productoId);
            if(ex) ex.cantidad += m.cantidad; else acc.push({ productoId: m.productoId, cantidad: m.cantidad });
            return acc;
          }, []);
          const materiales = agrupados.map(m => ({ productoId: m.productoId, nombre: (db.inventario.find(x => x.id === m.productoId) || {}).nombre || '', cantidad: m.cantidad }));
          const costoMat = agrupados.reduce((sum, m) => { const pr = db.inventario.find(x => x.id === m.productoId); return sum + (pr ? (Number(pr.costo) || 0) * m.cantidad : 0); }, 0);
          const precio = precioPrenda();
          const msg = validarMateriales([{ productoId: null, cantidad: cant, materiales }, ...cart]);
          if(msg){ err.innerHTML = msg; return; }
          cart.push({ productoId: null, nombre, caracteristicas: car, foto, materiales, precioCatalogo: precio, precioUnit: precio, costo: costoMat, cantidad: cant, stockDisponible: '' });
          maOv.remove();
          renderCart();
        });
      });
    });

    function validarMateriales(items){
      const need = {};
      items.forEach(it => {
        if(it.productoId) need[it.productoId] = (need[it.productoId] || 0) + it.cantidad;
        (it.materiales || []).forEach(m => { need[m.productoId] = (need[m.productoId] || 0) + m.cantidad * it.cantidad; });
      });
      for(const id of Object.keys(need)){
        const pr = db.inventario.find(x => x.id === id);
        const max = stockMax(id);
        if(pr && max !== Infinity && need[id] > max) return `No hay suficiente ${pr.nombre}. Disponibles: ${max}, necesitas: ${need[id]}.`;
      }
      return '';
    }

    function renderCart(){
      if(cart.length === 0){
        cartWrap.innerHTML = `<div class="empty-state" style="margin-top:16px;"><p>Busca productos arriba y tócalos para agregarlos a la factura.</p></div>`;
      } else {
        cartWrap.innerHTML = cart.map((it, idx) => `
            <div class="cart-item" data-idx="${idx}">
              <div class="cart-row1">
                <div class="name">${escapeHtml(it.nombre)}</div>
                <button class="remove">×</button>
              </div>
              <div class="cart-row2">
                <div class="qty-ctrl"><button class="qtyMinus">−</button><span class="qty">${it.cantidad}</span><button class="qtyPlus">+</button></div>
                <input type="number" inputmode="decimal" class="unit-price ${it.precioUnit < it.precioCatalogo ? 'discounted' : ''}" value="${it.precioUnit}">
                <div class="line-total">${money(it.precioUnit * it.cantidad)}</div>
              </div>
            </div>`).join('');
        cartWrap.querySelectorAll('.cart-item').forEach(el => {
          const idx = Number(el.getAttribute('data-idx'));
          el.querySelector('.qtyPlus').addEventListener('click', () => {
            if(cart[idx].cantidad + 1 > stockMax(cart[idx].productoId)){ alert(sinStockMsg(cart[idx].nombre, stockMax(cart[idx].productoId))); return; }
            cart[idx].cantidad += 1; renderCart();
          });
          el.querySelector('.qtyMinus').addEventListener('click', () => { cart[idx].cantidad -= 1; if(cart[idx].cantidad <= 0) cart.splice(idx,1); renderCart(); });
          el.querySelector('.remove').addEventListener('click', () => { cart.splice(idx,1); renderCart(); });
          el.querySelector('.unit-price').addEventListener('change', (e) => {
            cart[idx].precioUnit = Number(e.target.value) || 0;
            renderCart();
          });
        });
      }
      totalsBox.innerHTML = `
          <div class="totals-row"><span>Suma de productos</span><span>${money(sumaItems())}</span></div>
          <div class="discount-field"><label>Descuento sobre la venta (%)</label><input type="number" inputmode="decimal" id="descuentoInput" value="${descuentoPctEf() || ''}" placeholder="0"></div>
          ${descuentoMonto() > 0 ? `<div class="totals-row"><span>Descuento</span><span>-${money(descuentoMonto())}</span></div>` : ''}
          ${Number(config.impuesto) > 0 ? `<div class="totals-row"><span>Impuesto (${config.impuesto}%)</span><span>${money(impuestoMonto())}</span></div>` : ''}
          <div class="totals-row grand"><span>Total a cobrar</span><input type="number" inputmode="decimal" id="totalInput" value="${Math.round(total())}" style="width:46%; text-align:right; font:inherit; font-weight:800; background:transparent; border:1px solid var(--line, #d0d5dd); border-radius:8px; padding:4px 8px;"></div>
        `;
      const descInput = totalsBox.querySelector('#descuentoInput');
      descInput.addEventListener('change', () => {
        descuentoTipo = 'pct';
        descuentoValor = Math.min(100, Math.max(0, Number(descInput.value) || 0));
        renderCart();
      });
      const totalInput = totalsBox.querySelector('#totalInput');
      totalInput.addEventListener('change', () => {
        const nuevoTotal = Number(totalInput.value);
        if(totalInput.value === '' || isNaN(nuevoTotal)){ descuentoValor = 0; renderCart(); return; }
        const base = nuevoTotal / (1 + (Number(config.impuesto) || 0) / 100);
        if(base > sumaItems()){
          totalInput.value = Math.round(total());
          alert(`El total no puede ser mayor que la suma de productos (${money(sumaItems())}).`);
          return;
        }
        descuentoTipo = 'monto';
        descuentoValor = Math.max(0, sumaItems() - base);
        renderCart();
      });
      renderGanancia();
      saveBtn.disabled = cart.length === 0;
    }
    renderCart();

    saveBtn.addEventListener('click', () => {
      if(tipoOp !== 'venta'){ guardarPendiente(); return; }
      if(cart.length === 0) return;
      const excedido = cart.find(it => it.cantidad > stockMax(it.productoId));
      if(excedido){ alert(sinStockMsg(excedido.nombre, stockMax(excedido.productoId))); return; }
      const msgMat = validarMateriales(cart);
      if(msgMat){ alert(msgMat); return; }
      openConfirmarVenta(() => {
      const pg = calcPagos();
      const venta = {
        id: uid(), folio: null, creadoTs: Date.now(),
        clienteId: selectedCliente.id, clienteNombre: selectedCliente.nombre,
        clienteDireccion: selectedCliente.direccion || '', clienteTelefono: selectedCliente.telefono || '', clienteEmail: selectedCliente.email || '',
        items: cart.map(it => ({ productoId: it.productoId, nombre: it.nombre, precio: it.precioUnit, cantidad: it.cantidad, caracteristicas: it.caracteristicas || '', foto: it.foto || '', materiales: it.materiales || [] })),
        sumaItems: sumaItems(), descuentoTipo, descuentoPct: descuentoPctEf(), descuentoMonto: descuentoMonto(),
        subtotal: subtotal(), impuesto: impuestoMonto(), total: total(),
        costoTotal: costoTotal(), gananciaEstimada: gananciaEstimada(),
        notas, fecha: todayStr(),
        metodoPago, fiado: pg.fiado,
        abonos: pg.pagos,
      };
      db.ventas.push(venta);
      db.inventario = db.inventario.map(p => {
        let st = p.stock;
        const it = cart.find(c => c.productoId === p.id);
        if(it && st !== '' && st !== null) st = Math.max(0, Number(st) - it.cantidad);
        cart.forEach(c => (c.materiales || []).forEach(m => {
          if(m.productoId === p.id && st !== '' && st !== null) st = Math.max(0, Number(st) - m.cantidad * c.cantidad);
        }));
        return st === p.stock ? p : { ...p, stock: st };
      });
      save('cuentas_ventas', db.ventas);
      save('cuentas_inventario', db.inventario);
      ov.remove();
      renderList();
      openVentaSavedConfirm(venta.id);
      });
    });
  }
}

export function openVentaSavedConfirm(id){
  const v = db.ventas.find(x => x.id === id);
  if(!v) return;
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Venta registrada</h2>
      <div class="step-note">Cliente: ${escapeHtml(v.clienteNombre)} · ${fmtDate(v.fecha)}</div>
      <div class="totals-box" style="margin-top:0;">
        <div class="totals-row grand"><span>Total cobrado</span><span>${money(v.total)}</span></div>
      </div>
      <div class="ganancia-panel" style="margin-top:10px;">
        <div class="ganancia-toggle" style="cursor:default;">
          <span class="g-label">Ganancia de esta venta</span>
          <span class="g-value ${v.gananciaEstimada >= 0 ? 'pos' : 'neg'}">${money(v.gananciaEstimada)}</span>
        </div>
      </div>
      <p style="color:var(--ink-soft); font-size:13.5px; line-height:1.5; margin:14px 2px 0;">La factura es opcional — puedes generarla ahora para enviársela al cliente, o hacerlo más tarde desde esta misma venta.</p>
      <div class="sheet-actions" style="margin-top:16px;">
        <button class="btn btn-secondary" id="laterBtn">Listo, sin factura</button>
        <button class="btn btn-primary" id="genBtn">Generar factura</button>
      </div>
    `, (overlay) => {
    overlay.querySelector('#laterBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#genBtn').addEventListener('click', () => {
      overlay.remove();
      generarFactura(v.id);
    });
  });
}

