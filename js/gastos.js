// Gastos: lista y formulario (incluye compras de mercancía).
import { renderList } from './app.js';
import { listWrap, searchInput } from './dom.js';
import { config, db, save } from './state.js';
import { emptyState, openOverlay, segHtml } from './ui.js';
import { escapeHtml, fmtDate, money, todayStr, uid } from './utils.js';

export function renderGastos(){
  const term = searchInput.value.trim().toLowerCase();
  const items = db.gastos
    .filter(g => g.descripcion.toLowerCase().includes(term) || (g.categoria||'').toLowerCase().includes(term))
    .sort((a,b) => b.fecha.localeCompare(a.fecha));

  if(items.length === 0){
    listWrap.innerHTML = emptyState(
      db.gastos.length === 0 ? 'Aún no tienes gastos registrados' : 'Sin resultados',
      db.gastos.length === 0 ? 'Toca el botón + para registrar tu primer gasto.' : 'Prueba con otro término.'
    );
    return;
  }
  listWrap.innerHTML = '<ul class="list">' + items.map(g => `
      <li class="row" data-id="${g.id}">
        <div class="row-main">
          <div class="row-title">${g.tipo === 'compra' ? '📦 ' : ''}${escapeHtml(g.descripcion)}</div>
          <div class="row-sub">${escapeHtml(g.categoria || 'General')} · ${fmtDate(g.fecha)}</div>
        </div>
        <div class="row-value neg">-${money(g.monto)}</div>
      </li>`).join('') + '</ul>';
  listWrap.querySelectorAll('.row').forEach(row => row.addEventListener('click', () => openGastoForm(row.getAttribute('data-id'))));
}
export function openGastoForm(id){
  const record = id ? db.gastos.find(g => g.id === id) : null;

  // Editar un gasto existente: formulario simple, sin cambiar de tipo
  let emet = record ? (record.metodo || 'efectivo') : 'efectivo';
  if(record){
    openOverlay(`
        <div class="sheet-handle"></div>
        <h2>Editar gasto</h2>
        ${record.tipo === 'compra' ? `<div class="step-note">📦 Este gasto viene de una compra de inventario. Editar el monto aquí no ajusta el stock ni el costo del producto — eso se hace desde Inventario.</div>` : ''}
        <div class="field"><label>Descripción</label><input type="text" id="f_desc" value="${escapeHtml(record.descripcion)}" placeholder="¿En qué se gastó?"></div>
        <div class="row2">
          <div class="field mono"><label>Monto (${config.moneda})</label><input type="number" inputmode="decimal" id="f_monto" value="${record.monto}" placeholder="0.00"></div>
          <div class="field"><label>Fecha</label><input type="date" id="f_fecha" value="${record.fecha}"></div>
        </div>
        <div class="field"><label>Categoría (opcional)</label><input type="text" id="f_cat" value="${escapeHtml(record.categoria)}" placeholder="Ej. Renta, Insumos, Transporte"></div>
        <div class="section-label" style="margin:8px 0 6px;">¿Con qué lo pagaste?</div>
        ${segHtml('gmet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], emet)}
        <div class="sheet-actions">
          <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
          <button class="btn btn-primary" id="saveBtn">Guardar</button>
        </div>
        <button class="btn-danger-text" id="deleteBtn">Eliminar</button>
      `, (overlay) => {
      overlay.addEventListener('click', (e) => {
        const b = e.target.closest('[data-group="gmet"] button');
        if(!b) return;
        emet = b.dataset.val;
        overlay.querySelectorAll('[data-group="gmet"] button').forEach(x => x.classList.toggle('on', x === b));
      });
      overlay.querySelector('#cancelBtn').addEventListener('click', () => overlay.remove());
      overlay.querySelector('#saveBtn').addEventListener('click', () => {
        const descripcion = overlay.querySelector('#f_desc').value.trim();
        if(!descripcion){ overlay.querySelector('#f_desc').focus(); return; }
        const data = {
          ...record,
          descripcion,
          monto: Number(overlay.querySelector('#f_monto').value) || 0,
          fecha: overlay.querySelector('#f_fecha').value || todayStr(),
          categoria: overlay.querySelector('#f_cat').value.trim(),
          metodo: emet,
        };
        db.gastos = db.gastos.map(g => g.id === record.id ? data : g);
        save('cuentas_gastos', db.gastos);
        overlay.remove();
        renderList();
      });
      overlay.querySelector('#deleteBtn').addEventListener('click', () => {
        db.gastos = db.gastos.filter(g => g.id !== record.id);
        save('cuentas_gastos', db.gastos);
        overlay.remove();
        renderList();
      });
    });
    return;
  }

  // Nuevo gasto: elegir entre gasto general o compra de inventario
  let tipo = 'general';
  let compraProducto = null;
  let compraEsNuevo = false;
  let compraNuevoNombre = '';
  let gMetodo = 'efectivo';

  const overlay = openOverlay(bodyMain(), mountMain);

  function bodyMain(){
    return `
        <div class="sheet-handle"></div>
        <h2>Nuevo gasto</h2>
        <div class="chip-row" style="margin-bottom:4px;">
          <div class="chip ${tipo === 'general' ? 'active' : ''}" data-tipo="general">Gasto general</div>
          <div class="chip ${tipo === 'compra' ? 'active' : ''}" data-tipo="compra">📦 Compra de inventario</div>
        </div>
        <div id="gastoBody"></div>
        <div class="sheet-actions" style="margin-top:14px;">
          <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
          <button class="btn btn-primary" id="saveBtn">Guardar</button>
        </div>
      `;
  }

  function bodyGeneral(){
    return `
        <div class="field"><label>Descripción</label><input type="text" id="f_desc" placeholder="¿En qué se gastó?"></div>
        <div class="row2">
          <div class="field mono"><label>Monto (${config.moneda})</label><input type="number" inputmode="decimal" id="f_monto" placeholder="0.00"></div>
          <div class="field"><label>Fecha</label><input type="date" id="f_fecha" value="${todayStr()}"></div>
        </div>
        <div class="field"><label>Categoría (opcional)</label><input type="text" id="f_cat" placeholder="Ej. Renta, Insumos, Transporte"></div>
        <div class="section-label" style="margin:8px 0 6px;">¿Con qué lo pagaste?</div>
        ${segHtml('gmet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], gMetodo)}
      `;
  }

  function bodyCompra(){
    const stockActual = compraProducto ? ((compraProducto.stock === '' || compraProducto.stock === null) ? 0 : Number(compraProducto.stock)) : 0;
    const costoActual = compraProducto ? (Number(compraProducto.costo) || 0) : 0;
    const productoListo = compraEsNuevo ? compraNuevoNombre.trim().length > 0 : !!compraProducto;
    return `
        <div class="section-label" style="margin:0 0 6px;">¿Con qué lo pagaste?</div>
        ${segHtml('gmet', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], gMetodo)}
        ${!compraEsNuevo ? `
          <div class="field"><label>Producto</label></div>
          ${compraProducto ? `
            <div class="pick-row" style="border:1px solid var(--border); border-radius:10px; margin-bottom:14px;">
              <span class="name">${escapeHtml(compraProducto.nombre)}</span>
              <button class="link-btn" id="changeProdBtn">Cambiar</button>
            </div>
          ` : `
            <div class="add-item-row"><input type="text" id="prodSearchG" placeholder="Buscar producto..."></div>
            <div class="pick-list" id="prodPickListG" style="display:none;"></div>
          `}
          ${!compraProducto ? `<button class="link-btn" id="nuevoProdBtn" style="display:block; margin:-8px 0 14px;">+ Registrar producto nuevo</button>` : ''}
        ` : `
          <div class="field"><label>Nombre del producto nuevo</label><input type="text" id="f_nuevoNombre" value="${escapeHtml(compraNuevoNombre)}" placeholder="Nombre"></div>
          <button class="link-btn" id="usarExistenteBtn" style="display:block; margin:-8px 0 14px;">Usar un producto ya registrado</button>
        `}
        ${productoListo ? `
          <div class="row2">
            <div class="field mono"><label>Cantidad comprada</label><input type="number" inputmode="numeric" id="c_cantidad" placeholder="Ej. 10"></div>
            <div class="field mono"><label>Costo unitario (${config.moneda})</label><input type="number" inputmode="decimal" id="c_costo" value="${costoActual || ''}" placeholder="0.00"></div>
          </div>
          <div class="field"><label>Fecha de la compra</label><input type="date" id="c_fecha" value="${todayStr()}"></div>
          <div class="step-note" id="promedioPreview" style="margin-top:-6px;"></div>
          <div class="row2">
            <div class="field mono"><label>Precio de venta (${config.moneda})</label><input type="number" inputmode="decimal" id="c_precioNuevo" value="${compraProducto ? (compraProducto.precio || '') : ''}" placeholder="0.00"></div>
            <div class="field mono"><label>Ganancia (%)</label><input type="number" inputmode="decimal" id="c_margenNuevo" value="${compraProducto ? (compraProducto.margen || '') : ''}" placeholder="Ej. 40"></div>
          </div>
          <div class="step-note" id="gananciaNuevaPreview" style="margin-top:-6px;"></div>
        ` : ''}
      `;
  }

  function renderGastoBody(sheet){
    const gastoBody = sheet.querySelector('#gastoBody');
    gastoBody.innerHTML = tipo === 'general' ? bodyGeneral() : bodyCompra();
    if(tipo === 'compra') mountCompraBody(sheet, gastoBody);
  }

  function mountCompraBody(sheet, gastoBody){
    const stockActual = compraProducto ? ((compraProducto.stock === '' || compraProducto.stock === null) ? 0 : Number(compraProducto.stock)) : 0;
    const costoActual = compraProducto ? (Number(compraProducto.costo) || 0) : 0;

    const prodSearch = gastoBody.querySelector('#prodSearchG');
    if(prodSearch){
      const prodPickList = gastoBody.querySelector('#prodPickListG');
      prodSearch.addEventListener('input', () => {
        const term = prodSearch.value.trim().toLowerCase();
        if(!term){ prodPickList.style.display = 'none'; prodPickList.innerHTML = ''; return; }
        const matches = db.inventario.filter(p => p.nombre.toLowerCase().includes(term)).slice(0,8);
        prodPickList.style.display = 'block';
        prodPickList.innerHTML = matches.length === 0
          ? `<div class="pick-row" style="cursor:default;"><span class="name">Sin productos con ese nombre</span></div>`
          : matches.map(p => `<div class="pick-row" data-id="${p.id}"><span class="name">${escapeHtml(p.nombre)}</span><span class="meta">${money(p.precio)}</span></div>`).join('');
        prodPickList.querySelectorAll('.pick-row[data-id]').forEach(row => row.addEventListener('click', () => {
          compraProducto = db.inventario.find(x => x.id === row.getAttribute('data-id'));
          renderGastoBody(sheet);
        }));
      });
    }
    const changeBtn = gastoBody.querySelector('#changeProdBtn');
    if(changeBtn) changeBtn.addEventListener('click', () => { compraProducto = null; renderGastoBody(sheet); });
    const nuevoProdBtn = gastoBody.querySelector('#nuevoProdBtn');
    if(nuevoProdBtn) nuevoProdBtn.addEventListener('click', () => { compraEsNuevo = true; compraProducto = null; renderGastoBody(sheet); });
    const usarExistenteBtn = gastoBody.querySelector('#usarExistenteBtn');
    if(usarExistenteBtn) usarExistenteBtn.addEventListener('click', () => { compraEsNuevo = false; renderGastoBody(sheet); });
    const nuevoNombreInput = gastoBody.querySelector('#f_nuevoNombre');
    if(nuevoNombreInput) nuevoNombreInput.addEventListener('input', () => {
      compraNuevoNombre = nuevoNombreInput.value;
      const listo = compraNuevoNombre.trim().length > 0;
      const hasExtra = !!gastoBody.querySelector('#c_cantidad');
      if(listo !== hasExtra) renderGastoBody(sheet);
    });

    const cantidadInput = gastoBody.querySelector('#c_cantidad');
    if(!cantidadInput) return;
    const costoInput = gastoBody.querySelector('#c_costo');
    const preview = gastoBody.querySelector('#promedioPreview');
    const precioNuevoInput = gastoBody.querySelector('#c_precioNuevo');
    const margenNuevoInput = gastoBody.querySelector('#c_margenNuevo');
    const gananciaNuevaPreview = gastoBody.querySelector('#gananciaNuevaPreview');
    let lastEditedPrecio = (compraProducto && Number(compraProducto.margen)) ? 'margen' : 'precio';

    function calcularNuevoCosto(cant, costoCompra){
      if(stockActual > 0 && costoActual > 0) return ((stockActual * costoActual) + (cant * costoCompra)) / (stockActual + cant);
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
      } else { preview.textContent = ''; }
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
        gananciaNuevaPreview.textContent = `Con este precio ganas ${money(precioFinal - nuevoCosto)} por unidad`;
      } else { gananciaNuevaPreview.textContent = ''; }
    }
    cantidadInput.addEventListener('input', () => { updatePreview(); syncPrecioNuevo(); });
    costoInput.addEventListener('input', () => { updatePreview(); syncPrecioNuevo(); });
    margenNuevoInput.addEventListener('input', () => { lastEditedPrecio = 'margen'; syncPrecioNuevo(); });
    precioNuevoInput.addEventListener('input', () => { lastEditedPrecio = 'precio'; syncPrecioNuevo(); });
    updatePreview();
    syncPrecioNuevo();
  }

  function mountMain(ov, sheet){
    renderGastoBody(sheet);
    sheet.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
      tipo = chip.getAttribute('data-tipo');
      sheet.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
      renderGastoBody(sheet);
    }));
    sheet.addEventListener('click', (e) => {
      const b = e.target.closest('[data-group="gmet"] button');
      if(!b) return;
      gMetodo = b.dataset.val;
      sheet.querySelectorAll('[data-group="gmet"] button').forEach(x => x.classList.toggle('on', x === b));
    });
    sheet.querySelector('#cancelBtn').addEventListener('click', () => ov.remove());
    sheet.querySelector('#saveBtn').addEventListener('click', () => {
      if(tipo === 'general'){
        const descInput = sheet.querySelector('#f_desc');
        const descripcion = descInput.value.trim();
        if(!descripcion){ descInput.focus(); return; }
        db.gastos = [...db.gastos, {
          id: uid(), tipo: 'general', metodo: gMetodo,
          descripcion,
          monto: Number(sheet.querySelector('#f_monto').value) || 0,
          fecha: sheet.querySelector('#f_fecha').value || todayStr(),
          categoria: sheet.querySelector('#f_cat').value.trim(),
        }];
        save('cuentas_gastos', db.gastos);
        ov.remove();
        renderList();
        return;
      }

      // tipo === 'compra'
      const cantidadInput = sheet.querySelector('#c_cantidad');
      if(!cantidadInput){ return; }
      const cant = Number(cantidadInput.value) || 0;
      const costoCompra = Number(sheet.querySelector('#c_costo').value) || 0;
      const fecha = sheet.querySelector('#c_fecha').value || todayStr();
      if(cant <= 0){ cantidadInput.focus(); return; }

      let producto = compraProducto;
      let nombreProducto = compraEsNuevo ? compraNuevoNombre.trim() : (producto ? producto.nombre : '');
      if(compraEsNuevo && !nombreProducto){ sheet.querySelector('#f_nuevoNombre').focus(); return; }

      const precioNuevoInput = sheet.querySelector('#c_precioNuevo');
      const margenNuevoInput = sheet.querySelector('#c_margenNuevo');
      const precioFinal = Number(precioNuevoInput.value) || costoCompra || 0;
      const margenFinal = Number(margenNuevoInput.value) || 0;

      let productoId;
      if(compraEsNuevo){
        const nuevoProducto = {
          id: uid(), nombre: nombreProducto, categoria: '',
          costo: costoCompra, margen: margenFinal, precio: precioFinal, stock: cant,
        };
        db.inventario = [...db.inventario, nuevoProducto];
        db.movimientos = [...db.movimientos, { id: uid(), tipo: 'alta', ts: Date.now(), productoId: nuevoProducto.id, productoNombre: nombreProducto, stockNuevo: cant, motivo: 'Creado desde una compra', fecha: todayStr() }];
        save('cuentas_movimientos', db.movimientos);
        productoId = nuevoProducto.id;
      } else {
        const stockActual = (producto.stock === '' || producto.stock === null) ? 0 : Number(producto.stock);
        const costoActual = Number(producto.costo) || 0;
        const nuevoCosto = (stockActual > 0 && costoActual > 0)
          ? ((stockActual * costoActual) + (cant * costoCompra)) / (stockActual + cant)
          : (costoCompra || costoActual);
        const nuevoStock = stockActual + cant;
        db.inventario = db.inventario.map(x => x.id === producto.id ? { ...x, stock: nuevoStock, costo: nuevoCosto, precio: precioFinal, margen: margenFinal } : x);
        productoId = producto.id;
      }

      db.gastos = [...db.gastos, {
        id: uid(), tipo: 'compra', metodo: gMetodo, productoId, cantidad: cant,
        descripcion: `Compra de inventario: ${nombreProducto} x${cant}`,
        monto: cant * costoCompra,
        fecha,
        categoria: 'Inventario',
      }];
      save('cuentas_inventario', db.inventario);
      save('cuentas_gastos', db.gastos);
      ov.remove();
      renderList();
    });
  }
}

