// Inventario: productos, stock, historial y compras.
import { renderList } from './app.js';
import { listWrap, searchInput } from './dom.js';
import { unidadesReservadas } from './pedidos.js';
import { config, db, save, ui } from './state.js';
import { emptyState, imagePickerHtml, openOverlay, segHtml, toggleRowHtml, wireImagePicker } from './ui.js';
import { escapeHtml, fmtDate, money, todayStr, uid } from './utils.js';

export function getCategorias(){
  const set = new Set();
  db.inventario.forEach(p => { if(p.categoria) set.add(p.categoria); });
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

export function bindInvSub(){
  listWrap.querySelectorAll('[data-group="invsub"] button').forEach(b => b.addEventListener('click', () => { ui.invSub = b.dataset.val; renderInventario(); }));
}

export function movimientosInventario(){
  const ev = [];
  db.ventas.forEach(v => (v.items||[]).forEach(it => ev.push({
    tipo: 'venta', fecha: v.fecha, ts: v.creadoTs || 0, nombre: it.nombre,
    cantidad: Number(it.cantidad) || 0,
    detalle: `${v.clienteNombre}${v.folio ? ' · F-' + String(v.folio).padStart(4,'0') : ''} · ${money(it.precio)} c/u`,
  })));
  db.gastos.filter(g => g.tipo === 'compra').forEach(g => {
    const prod = db.inventario.find(p => p.id === g.productoId);
    ev.push({
      tipo: 'compra', fecha: g.fecha, ts: 0, nombre: prod ? prod.nombre : (g.descripcion || 'Producto'),
      cantidad: Number(g.cantidad) || 0,
      detalle: `${money(g.cantidad ? g.monto / g.cantidad : 0)} c/u · total ${money(g.monto)}`,
    });
  });
  db.movimientos.forEach(m => {
    const tipo = m.tipo || 'ajuste';
    ev.push({
      tipo, fecha: m.fecha, ts: m.ts || 0, nombre: m.productoNombre || m.nombre || 'Producto',
      stockAnterior: m.stockAnterior, stockNuevo: m.stockNuevo, cantidad: m.cantidad,
      detalle: m.motivo || (tipo === 'alta' ? 'Producto agregado' : tipo === 'baja' ? 'Producto eliminado' : 'Ajuste manual'),
    });
  });
  return ev.sort((a,b) => b.fecha.localeCompare(a.fecha) || b.ts - a.ts);
}

export function renderHistorialHtml(){
  const term = searchInput.value.trim().toLowerCase();
  const evs = movimientosInventario().filter(e => (e.nombre || '').toLowerCase().includes(term));
  if(evs.length === 0){
    return emptyState(
      db.movimientos.length + db.ventas.length + db.gastos.length === 0 ? 'Sin movimientos' : 'Sin resultados',
      db.movimientos.length + db.ventas.length + db.gastos.length === 0 ? 'Aquí aparecerán tus ventas, compras, ajustes y productos agregados o eliminados.' : 'Prueba con otro nombre de producto.'
    );
  }
  const TIPO_LABEL = { venta:'Venta', compra:'Compra', ajuste:'Ajuste de stock', alta:'Producto nuevo', baja:'Producto eliminado', devolucion:'Devolución' };
  const qty = (e) => {
    if(e.tipo === 'venta') return { t: `-${e.cantidad}`, c: 'neg' };
    if(e.tipo === 'devolucion') return { t: `+${e.cantidad}`, c: 'pos' };
    if(e.tipo === 'compra') return { t: `+${e.cantidad}`, c: 'pos' };
    if(e.tipo === 'ajuste'){ const d = (Number(e.stockNuevo) || 0) - (Number(e.stockAnterior) || 0); return { t: `${d > 0 ? '+' : ''}${d}`, c: d >= 0 ? 'pos' : 'neg' }; }
    if(e.tipo === 'alta') return { t: (e.stockNuevo !== undefined && e.stockNuevo !== '') ? `Stock ${e.stockNuevo}` : '', c: '' };
    return { t: '', c: 'neg' };
  };
  return `<div class="rep-card">${evs.slice(0, 200).map(e => {
    const q = qty(e);
    return `
        <div class="rep-line">
          <span style="min-width:0;"><span class="credit-title" style="display:block;">${escapeHtml(e.nombre)}</span><span class="credit-sub" style="display:block;">${fmtDate(e.fecha)} · ${TIPO_LABEL[e.tipo] || e.tipo}${e.detalle ? ' · ' + escapeHtml(e.detalle) : ''}</span></span>
          <span class="${q.c}" style="font-weight:700; white-space:nowrap;">${q.t}</span>
        </div>`;
  }).join('')}</div>`;
}

export function umbralStock(p){
  if(p.sinAlerta) return null;
  const u = p.stockMinimo;
  return (u === '' || u === undefined || u === null) ? (Number(config.stockMinimo) || 0) : Number(u);
}
export function esPocoStock(p){
  const st = (p.stock === '' || p.stock === null || p.stock === undefined) ? null : Number(p.stock);
  const um = umbralStock(p);
  return st !== null && um !== null && st <= um;
}
export function bindPocoBanner(){
  const b = listWrap.querySelector('#pocoBanner');
  if(b) b.addEventListener('click', () => openPocoStock());
}
export function openPocoStock(){
  const lista = db.inventario.filter(esPocoStock).sort((a,b) => Number(a.stock) - Number(b.stock));
  const sinAviso = db.inventario.filter(p => p.sinAlerta);
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Poco stock</h2>
      <div class="step-note">Productos por debajo de su límite. Toca uno para cambiar su límite o quitarle el aviso.</div>
      ${lista.length ? `<ul class="list">${lista.map(p => `
        <li class="row" data-pid="${p.id}">
          <div class="row-main">
            <div class="row-title">${escapeHtml(p.nombre)}</div>
            <div class="row-sub">Avisa desde ${umbralStock(p)} unid.</div>
          </div>
          <div class="row-value-wrap"><div class="row-value low">${p.stock} unid.</div></div>
        </li>`).join('')}</ul>` : emptyState('Todo bien', 'Ningún producto está por debajo de su límite.')}
      ${sinAviso.length ? `<div class="section-label" style="margin-top:14px;">Sin aviso de poco stock</div><ul class="list">${sinAviso.map(p => `
        <li class="row" data-pid="${p.id}">
          <div class="row-main"><div class="row-title">${escapeHtml(p.nombre)}</div><div class="row-sub">No te avisamos de este producto</div></div>
        </li>`).join('')}</ul>` : ''}
      <div class="sheet-actions" style="margin-top:16px;"><button class="btn btn-secondary" id="pocoCerrar">Cerrar</button></div>
    `, (overlay) => {
    overlay.querySelector('#pocoCerrar').addEventListener('click', () => overlay.remove());
    overlay.querySelectorAll('[data-pid]').forEach(row => row.addEventListener('click', () => { overlay.remove(); openProductoForm(row.getAttribute('data-pid')); }));
  });
}

export function renderStockHtml(){
  if(db.inventario.length === 0) return emptyState('Aún no tienes productos', 'Agrega productos en la pestaña Productos.');
  const enStock = (p) => (p.stock === '' || p.stock === null) ? null : Number(p.stock);
  const unidades = db.inventario.reduce((s,p) => s + (enStock(p) || 0), 0);
  const valorCosto = db.inventario.reduce((s,p) => s + (enStock(p) || 0) * (Number(p.costo) || 0), 0);
  const valorVenta = db.inventario.reduce((s,p) => s + (enStock(p) || 0) * (Number(p.precio) || 0), 0);
  const sinControl = db.inventario.filter(p => enStock(p) === null).length;
  const reservadasTot = db.inventario.reduce((s,p) => s + unidadesReservadas(p.id), 0);
  const bajos = db.inventario.filter(esPocoStock).length;
  const detalle = db.inventario
    .map(p => ({ p, stock: enStock(p), valor: (enStock(p) || 0) * (Number(p.costo) || 0) }))
    .sort((a,b) => b.valor - a.valor);
  return `
      <div class="rep-hero">
        <div class="rep-hero-label">Costo total del inventario</div>
        <div class="rep-hero-value">${money(valorCosto)}</div>
        <div class="rep-hero-sub">${db.inventario.length} productos · ${unidades} unidades en stock</div>
      </div>
      <div class="rep-grid" style="margin-top:10px;">
        <div class="rep-stat"><div class="rep-stat-label">Cantidad de productos</div><div class="rep-stat-value">${db.inventario.length}</div></div>
        <div class="rep-stat"><div class="rep-stat-label">Unidades en stock</div><div class="rep-stat-value">${unidades}</div></div>
        <div class="rep-stat"><div class="rep-stat-label">Valor a precio de venta</div><div class="rep-stat-value">${money(valorVenta)}</div></div>
        <div class="rep-stat"><div class="rep-stat-label">Reservadas para pedidos</div><div class="rep-stat-value">${reservadasTot}</div></div>
        <div class="rep-stat"><div class="rep-stat-label">Poco stock</div><div class="rep-stat-value ${bajos > 0 ? 'neg' : ''}">${bajos}</div></div>
      </div>
      ${sinControl ? `<div class="step-note" style="margin-top:8px;">${sinControl} producto(s) sin control de stock no se cuentan en las unidades.</div>` : ''}
      <div class="section-label">Detalle por producto</div>
      <div class="rep-card">
        ${detalle.map(d => `
          <div class="rep-line">
            <span style="min-width:0;"><span class="credit-title" style="display:block;">${escapeHtml(d.p.nombre)}</span><span class="credit-sub" style="display:block;">${d.stock === null ? 'Sin control de stock' : d.stock + ' unid. × ' + money(Number(d.p.costo) || 0) + (unidadesReservadas(d.p.id) > 0 ? ' · ' + unidadesReservadas(d.p.id) + ' reservadas · ' + Math.max(0, d.stock - unidadesReservadas(d.p.id)) + ' disponibles' : '')}</span></span>
            <span>${money(d.valor)}</span>
          </div>`).join('')}
      </div>`;
}

export function renderInventario(){
  const subSeg = `<div class="inv-sub">${segHtml('invsub', [['productos','Productos'],['stock','Stock'],['historial','Historial']], ui.invSub)}</div>`;
  if(ui.invSub === 'stock'){ listWrap.innerHTML = subSeg + renderStockHtml(); bindInvSub(); return; }
  if(ui.invSub === 'historial'){ listWrap.innerHTML = subSeg + renderHistorialHtml(); bindInvSub(); return; }
  const term = searchInput.value.trim().toLowerCase();
  const categorias = getCategorias();
  if(ui.categoriaFiltro && !categorias.includes(ui.categoriaFiltro)) ui.categoriaFiltro = '';
  let items = db.inventario.filter(p => p.nombre.toLowerCase().includes(term));
  if(ui.categoriaFiltro) items = items.filter(p => p.categoria === ui.categoriaFiltro);
  const lowStockItems = db.inventario.filter(esPocoStock);
  const lowStockBanner = lowStockItems.length > 0
    ? `<div class="summary-card neg" id="pocoBanner" style="margin-bottom:14px; cursor:pointer;"><div class="label">⚠ Poco stock (${lowStockItems.length}) · toca para revisar</div><div class="value" style="font-size:13px; font-weight:600;">${lowStockItems.map(p => escapeHtml(p.nombre)).join(', ')}</div></div>`
    : '';
  const chipRow = categorias.length > 0 ? `
      <div class="chip-row" id="catChipRow">
        <div class="chip ${ui.categoriaFiltro === '' ? 'active' : ''}" data-cat="">Todas</div>
        ${categorias.map(c => `<div class="chip ${ui.categoriaFiltro === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</div>`).join('')}
      </div>` : '';
  if(items.length === 0){
    listWrap.innerHTML = subSeg + chipRow + lowStockBanner + emptyState(
      db.inventario.length === 0 ? 'Aún no tienes productos' : 'Sin resultados',
      db.inventario.length === 0 ? 'Toca el botón + para agregar tu primer producto.' : 'Prueba con otro nombre o categoría.'
    );
    if(chipRow) bindCatChips();
    bindInvSub();
    bindPocoBanner();
    return;
  }
  listWrap.innerHTML = subSeg + chipRow + lowStockBanner + '<ul class="list">' + items.map(p => {
    const lowStock = esPocoStock(p);
    const costo = Number(p.costo) || 0;
    const gananciaUnit = costo > 0 ? (p.precio - costo) : null;
    const margenPct = (costo > 0) ? Math.round((gananciaUnit / costo) * 100) : null;
    const reservadas = unidadesReservadas(p.id);
    const stockLine = p.stock === '' || p.stock === null ? 'Sin control de stock' : 'Stock: ' + p.stock + ' unid.' + (reservadas > 0 ? ` · ${reservadas} reservadas · ${Math.max(0, p.stock - reservadas)} disponibles` : '');
    return `
      <li class="row" data-id="${p.id}">
        ${p.foto ? `<img src="${p.foto}" alt="" style="width:48px;height:48px;border-radius:10px;object-fit:cover;margin-right:12px;flex:none;">` : ''}
        <div class="row-main">
          <div class="row-title">${escapeHtml(p.nombre)}</div>
          <div class="row-sub">${stockLine}${costo > 0 ? ' · Costo: ' + money(costo) : ''}</div>
          ${p.categoria ? `<div class="row-cat">${escapeHtml(p.categoria)}</div>` : ''}
        </div>
        <div class="row-value-wrap">
          <div class="row-value ${lowStock ? 'low' : ''}">${money(p.precio)}</div>
          ${margenPct !== null ? `<div class="row-badge ${margenPct < 0 ? 'neg' : ''}">${margenPct >= 0 ? '+' : ''}${margenPct}% · ${money(gananciaUnit)}</div>` : ''}
        </div>
      </li>`;
  }).join('') + '</ul>';
  listWrap.querySelectorAll('.row').forEach(row => row.addEventListener('click', () => openProductoForm(row.getAttribute('data-id'))));
  if(chipRow) bindCatChips();
  bindInvSub();
  bindPocoBanner();
}

export function bindCatChips(){
  listWrap.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
    ui.categoriaFiltro = chip.getAttribute('data-cat');
    renderInventario();
  }));
}

// ============================================================
// INVENTARIO form
// ============================================================
export function openProductoForm(id){
  const record = id ? db.inventario.find(p => p.id === id) : null;
  const compras = record ? db.gastos.filter(g => g.tipo === 'compra' && g.productoId === record.id).sort((a,b) => b.fecha.localeCompare(a.fecha)) : [];
  const unidCompradas = compras.reduce((s,g) => s + (Number(g.cantidad)||0), 0);
  const invertido = compras.reduce((s,g) => s + (Number(g.monto)||0), 0);
  const unidVendidas = record ? db.ventas.reduce((s,v) => s + (v.items||[]).filter(it => it.productoId === record.id).reduce((a,it) => a + (Number(it.cantidad)||0), 0), 0) : 0;
  const historialHtml = record ? `
      <div class="section-label" style="margin-top:6px;">Historial de compras</div>
      ${compras.length ? `
        <div class="rep-card">
          <div class="rep-line strong"><span>Unidades compradas</span><span>${unidCompradas}</span></div>
          <div class="rep-line"><span>Total invertido</span><span>${money(invertido)}</span></div>
          <div class="rep-line"><span>Costo promedio por unidad</span><span>${money(unidCompradas ? invertido / unidCompradas : 0)}</span></div>
          <div class="rep-line"><span>Unidades vendidas</span><span>${unidVendidas}</span></div>
        </div>
        <div class="rep-card" style="margin-top:10px;">
          ${compras.map(g => `
            <div class="rep-line">
              <span><span class="credit-title" style="display:block;">${fmtDate(g.fecha)} · ${g.cantidad} unid.</span><span class="credit-sub" style="display:block;">${money(g.cantidad ? g.monto / g.cantidad : 0)} por unidad</span></span>
              <span>${money(g.monto)}</span>
            </div>`).join('')}
        </div>` : `<div class="step-note">Aún no hay compras registradas para este producto. Usa "Registrar compra" para agregarlas.</div>`}
    ` : '';
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>${record ? 'Editar' : 'Nuevo'} producto</h2>
      <div class="field"><label>Nombre del producto</label><input type="text" id="f_nombre" value="${escapeHtml(record ? record.nombre : '')}" placeholder="Nombre"></div>
      ${imagePickerHtml('pfoto', 'Foto del producto (opcional)', record && record.foto ? record.foto : '', 'Sin foto')}
      <div class="field">
        <label>Categoría (opcional)</label>
        <input type="text" id="f_categoria" list="catList" value="${escapeHtml(record ? (record.categoria||'') : '')}" placeholder="Ej. Bebidas, Ropa, Accesorios">
        <datalist id="catList">${getCategorias().map(c => `<option value="${escapeHtml(c)}">`).join('')}</datalist>
      </div>
      <div class="field">
        <label>Descripción para la factura (opcional)</label>
        <textarea id="f_descripcion" rows="2" placeholder="Ej. Balines #4 en oro 18k, nacional, diamantado">${escapeHtml(record ? (record.descripcion||'') : '')}</textarea>
      </div>
      <div class="row2">
        <div class="field mono"><label>Costo (${config.moneda})</label><input type="number" inputmode="decimal" id="f_costo" value="${record && record.costo ? record.costo : ''}" placeholder="¿Cuánto te cuesta?"></div>
        <div class="field mono"><label>Ganancia deseada (%)</label><input type="number" inputmode="decimal" id="f_margen" value="${record ? (record.margen || '') : (config.margenDefault || '')}" placeholder="Ej. 40"></div>
      </div>
      <div class="row2">
        <div class="field mono"><label>Precio de venta (${config.moneda})</label><input type="number" inputmode="decimal" id="f_precio" value="${record ? record.precio : ''}" placeholder="0.00"></div>
        <div class="field mono"><label>Stock (opcional)</label><input type="number" inputmode="numeric" id="f_stock" value="${record && record.stock !== '' ? record.stock : ''}" placeholder="—"></div>
      </div>
      <div class="step-note" id="gananciaPreview" style="margin-top:-6px;"></div>
      <div class="row2">
        <div class="field mono"><label>Avisar si baja de (unid.)</label><input type="number" inputmode="numeric" id="f_umbral" value="${record && record.stockMinimo !== undefined && record.stockMinimo !== '' && record.stockMinimo !== null ? record.stockMinimo : ''}" placeholder="${config.stockMinimo}"></div>
      </div>
      <div class="step-note" style="margin-top:-6px;">Déjalo vacío para usar el límite general (${config.stockMinimo} unid.).</div>
      ${toggleRowHtml('f_sinAlerta', 'No avisar de poco stock para este producto', record && record.sinAlerta)}
      ${record ? `<div class="field" id="stockMotivoField" style="display:none;"><label>Motivo del ajuste de stock (opcional)</label><input type="text" id="f_stockMotivo" placeholder="Ej. producto dañado, conteo físico, devolución"></div>` : ''}
      ${record ? `<button class="link-btn" id="compraBtn" style="display:block; margin:4px 0 16px;">📦 Registrar compra (reabastecer stock)</button>` : ''}
      ${historialHtml}
      <div class="sheet-actions">
        <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveBtn">Guardar</button>
      </div>
      ${record ? '<button class="btn-danger-text" id="deleteBtn">Eliminar</button>' : ''}
      <div id="delConfirm"></div>
    `, (overlay) => {
    let foto = record && record.foto ? record.foto : '';
    wireImagePicker(overlay, 'pfoto', 'Sin foto', 300, (d) => { foto = d; });
    const costoInput = overlay.querySelector('#f_costo');
    const margenInput = overlay.querySelector('#f_margen');
    const precioInput = overlay.querySelector('#f_precio');
    const preview = overlay.querySelector('#gananciaPreview');
    let lastEdited = (!record && config.margenDefault) ? 'margen' : 'precio';

    function updatePreview(){
      const costo = Number(costoInput.value) || 0;
      const precio = Number(precioInput.value) || 0;
      if(costo > 0 && precio > 0){
        const ganancia = precio - costo;
        const pct = Math.round((ganancia / costo) * 100);
        preview.textContent = `Ganas ${money(ganancia)} por unidad (${pct}% sobre el costo)`;
      } else {
        preview.textContent = '';
      }
    }
    function recalc(source){
      const costo = Number(costoInput.value) || 0;
      if(source === 'costo' || source === 'margen'){
        const margen = Number(margenInput.value) || 0;
        if(costo > 0 && margen !== 0) precioInput.value = (costo * (1 + margen/100)).toFixed(2);
      } else if(source === 'precio'){
        const precio = Number(precioInput.value) || 0;
        if(costo > 0) margenInput.value = Math.round(((precio - costo) / costo) * 100);
      }
      updatePreview();
    }
    costoInput.addEventListener('input', () => recalc(lastEdited === 'precio' ? 'precio' : 'costo'));
    margenInput.addEventListener('input', () => { lastEdited = 'margen'; recalc('margen'); });
    precioInput.addEventListener('input', () => { lastEdited = 'precio'; recalc('precio'); });
    updatePreview();

    const stockInput = overlay.querySelector('#f_stock');
    const stockMotivoField = overlay.querySelector('#stockMotivoField');
    const stockOriginal = (record && record.stock !== '' && record.stock !== null) ? Number(record.stock) : null;
    function checkStockChanged(){
      if(!stockMotivoField) return;
      const val = stockInput.value === '' ? null : Number(stockInput.value);
      stockMotivoField.style.display = (val !== stockOriginal) ? 'block' : 'none';
    }
    if(stockInput) stockInput.addEventListener('input', checkStockChanged);
    checkStockChanged();

    overlay.querySelector('#cancelBtn').addEventListener('click', () => overlay.remove());
    const compraBtn = overlay.querySelector('#compraBtn');
    if(compraBtn) compraBtn.addEventListener('click', () => { overlay.remove(); openCompraForm(record.id); });
    overlay.querySelector('#saveBtn').addEventListener('click', () => {
      const nombre = overlay.querySelector('#f_nombre').value.trim();
      if(!nombre){ overlay.querySelector('#f_nombre').focus(); return; }
      const precioVal = precioInput.value;
      const stockVal = stockInput.value;
      const data = {
        id: record ? record.id : uid(),
        nombre,
        categoria: overlay.querySelector('#f_categoria').value.trim(),
        descripcion: overlay.querySelector('#f_descripcion').value.trim(),
        costo: costoInput.value === '' ? 0 : Number(costoInput.value),
        margen: margenInput.value === '' ? 0 : Number(margenInput.value),
        precio: precioVal === '' ? 0 : Number(precioVal),
        stock: stockVal === '' ? '' : Number(stockVal),
        foto,
        stockMinimo: overlay.querySelector('#f_umbral').value === '' ? '' : Number(overlay.querySelector('#f_umbral').value),
        sinAlerta: overlay.querySelector('#f_sinAlerta').checked,
      };
      if(record){
        const stockAnterior = stockOriginal === null ? 0 : stockOriginal;
        const stockNuevoVal = stockVal === '' ? 0 : Number(stockVal);
        if(stockAnterior !== stockNuevoVal){
          const motivoInput = overlay.querySelector('#f_stockMotivo');
          db.movimientos = [...db.movimientos, {
            id: uid(), tipo: 'ajuste', ts: Date.now(), productoId: data.id, productoNombre: nombre,
            stockAnterior, stockNuevo: stockNuevoVal,
            motivo: motivoInput ? motivoInput.value.trim() : '',
            fecha: todayStr(),
          }];
          save('cuentas_movimientos', db.movimientos);
        }
      }
      if(!record){
        db.movimientos = [...db.movimientos, { id: uid(), tipo: 'alta', ts: Date.now(), productoId: data.id, productoNombre: nombre, stockNuevo: data.stock === '' ? '' : data.stock, fecha: todayStr() }];
        save('cuentas_movimientos', db.movimientos);
      }
      db.inventario = record ? db.inventario.map(p => p.id === record.id ? data : p) : [...db.inventario, data];
      save('cuentas_inventario', db.inventario);
      overlay.remove();
      renderList();
    });
    const del = overlay.querySelector('#deleteBtn');
    if(del) del.addEventListener('click', () => {
      const confirmBox = overlay.querySelector('#delConfirm');
      confirmBox.innerHTML = `
          <div class="rep-card" style="margin-top:14px; padding:14px;">
            <p style="font-size:14px; line-height:1.5; margin-bottom:12px;">¿Seguro que quieres eliminar <strong>${escapeHtml(record.nombre)}</strong> del inventario? Esta acción no se puede deshacer.</p>
            <div class="sheet-actions" style="margin-top:0;">
              <button class="btn btn-secondary" id="delNo">No, cancelar</button>
              <button class="btn btn-primary" id="delSi" style="background:var(--danger);">Sí, eliminar</button>
            </div>
          </div>`;
      overlay.querySelector('#delNo').addEventListener('click', () => { confirmBox.innerHTML = ''; });
      overlay.querySelector('#delSi').addEventListener('click', () => {
        db.movimientos = [...db.movimientos, { id: uid(), tipo: 'baja', ts: Date.now(), productoId: record.id, productoNombre: record.nombre, stockAnterior: record.stock, fecha: todayStr() }];
        save('cuentas_movimientos', db.movimientos);
        db.inventario = db.inventario.filter(p => p.id !== record.id);
        save('cuentas_inventario', db.inventario);
        overlay.remove();
        renderList();
      });
    });
  });
}

export function openCompraForm(productId){
  const p = db.inventario.find(x => x.id === productId);
  if(!p) return;
  const stockActual = (p.stock === '' || p.stock === null) ? 0 : Number(p.stock);
  const costoActual = Number(p.costo) || 0;
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Registrar compra</h2>
      <div class="step-note">${escapeHtml(p.nombre)} · Stock actual: ${p.stock === '' || p.stock === null ? 'sin control' : stockActual + ' unid.'}${costoActual > 0 ? ' · Costo actual: ' + money(costoActual) : ''}</div>
      <div class="row2">
        <div class="field mono"><label>Cantidad comprada</label><input type="number" inputmode="numeric" id="c_cantidad" placeholder="Ej. 10"></div>
        <div class="field mono"><label>Costo unitario (${config.moneda})</label><input type="number" inputmode="decimal" id="c_costo" value="${costoActual || ''}" placeholder="0.00"></div>
      </div>
      <div class="field"><label>Fecha de la compra</label><input type="date" id="c_fecha" value="${todayStr()}"></div>
      <div class="step-note" id="promedioPreview" style="margin-top:-6px;"></div>
      <div class="row2">
        <div class="field mono"><label>Nuevo precio de venta (${config.moneda})</label><input type="number" inputmode="decimal" id="c_precioNuevo" value="${p.precio || ''}" placeholder="0.00"></div>
        <div class="field mono"><label>Ganancia (%)</label><input type="number" inputmode="decimal" id="c_margenNuevo" value="${p.margen || ''}" placeholder="Ej. 40"></div>
      </div>
      <div class="step-note" id="gananciaNuevaPreview" style="margin-top:-6px;"></div>
      <div class="sheet-actions">
        <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveCompraBtn">Registrar compra</button>
      </div>
    `, (overlay) => {
    const cantidadInput = overlay.querySelector('#c_cantidad');
    const costoInput = overlay.querySelector('#c_costo');
    const preview = overlay.querySelector('#promedioPreview');
    const precioNuevoInput = overlay.querySelector('#c_precioNuevo');
    const margenNuevoInput = overlay.querySelector('#c_margenNuevo');
    const gananciaNuevaPreview = overlay.querySelector('#gananciaNuevaPreview');
    let lastEditedPrecio = Number(p.margen) ? 'margen' : 'precio';

    function calcularNuevoCosto(cant, costoCompra){
      if(stockActual > 0 && costoActual > 0){
        return ((stockActual * costoActual) + (cant * costoCompra)) / (stockActual + cant);
      }
      return costoCompra || costoActual;
    }
    function updatePreview(){
      const cant = Number(cantidadInput.value) || 0;
      const costoCompra = Number(costoInput.value) || 0;
      if(cant > 0 && costoCompra > 0){
        const nuevoCosto = calcularNuevoCosto(cant, costoCompra);
        preview.textContent = (stockActual > 0 && costoActual > 0)
          ? `Nuevo costo promedio: ${money(nuevoCosto)} por unidad (antes ${money(costoActual)})`
          : `Costo por unidad: ${money(nuevoCosto)}`;
      } else {
        preview.textContent = '';
      }
    }
    function syncPrecioNuevo(){
      const cant = Number(cantidadInput.value) || 0;
      const costoCompra = Number(costoInput.value) || 0;
      const nuevoCosto = calcularNuevoCosto(cant, costoCompra);
      if(lastEditedPrecio === 'margen'){
        const margen = Number(margenNuevoInput.value) || 0;
        if(nuevoCosto > 0) precioNuevoInput.value = (nuevoCosto * (1 + margen/100)).toFixed(2);
      } else {
        const precio = Number(precioNuevoInput.value) || 0;
        if(nuevoCosto > 0) margenNuevoInput.value = Math.round(((precio - nuevoCosto) / nuevoCosto) * 100);
      }
      const precioFinal = Number(precioNuevoInput.value) || 0;
      if(nuevoCosto > 0 && precioFinal > 0){
        const ganancia = precioFinal - nuevoCosto;
        gananciaNuevaPreview.textContent = `Con este precio ganas ${money(ganancia)} por unidad`;
      } else {
        gananciaNuevaPreview.textContent = '';
      }
    }
    cantidadInput.addEventListener('input', () => { updatePreview(); syncPrecioNuevo(); });
    costoInput.addEventListener('input', () => { updatePreview(); syncPrecioNuevo(); });
    margenNuevoInput.addEventListener('input', () => { lastEditedPrecio = 'margen'; syncPrecioNuevo(); });
    precioNuevoInput.addEventListener('input', () => { lastEditedPrecio = 'precio'; syncPrecioNuevo(); });
    syncPrecioNuevo();

    overlay.querySelector('#cancelBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveCompraBtn').addEventListener('click', () => {
      const cant = Number(cantidadInput.value) || 0;
      const costoCompra = Number(costoInput.value) || 0;
      const fecha = overlay.querySelector('#c_fecha').value || todayStr();
      if(cant <= 0){ cantidadInput.focus(); return; }
      const nuevoCosto = calcularNuevoCosto(cant, costoCompra);
      const nuevoStock = stockActual + cant;
      const precioFinal = Number(precioNuevoInput.value) || p.precio || 0;
      const margenFinal = Number(margenNuevoInput.value) || 0;
      db.inventario = db.inventario.map(x => {
        if(x.id !== p.id) return x;
        return { ...x, stock: nuevoStock, costo: nuevoCosto, precio: precioFinal, margen: margenFinal };
      });
      db.gastos = [...db.gastos, {
        id: uid(),
        descripcion: `Compra de inventario: ${p.nombre} x${cant}`,
        monto: cant * costoCompra,
        fecha,
        categoria: 'Inventario',
      }];
      save('cuentas_inventario', db.inventario);
      save('cuentas_gastos', db.gastos);
      overlay.remove();
      renderList();
    });
    updatePreview();
  });
}

