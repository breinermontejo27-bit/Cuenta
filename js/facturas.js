// Facturas: lista, detalle, PDF y edición.
import { renderList } from './app.js';
import { abonadoVenta, saldoVenta } from './creditos.js';
import { listWrap, searchInput } from './dom.js';
import { config, db, save } from './state.js';
import { emptyState, openOverlay } from './ui.js';
import { escapeHtml, fmtDate, initials, metodoLabel, money, waUrl } from './utils.js';
import { anularVenta } from './ventas.js';

export function generarFactura(id){
  const idx = db.ventas.findIndex(x => x.id === id);
  if(idx === -1) return;
  if(!db.ventas[idx].folio){
    db.ventas[idx] = { ...db.ventas[idx], folio: config.siguienteFolio };
    config.siguienteFolio += 1;
    save('cuentas_ventas', db.ventas);
    save('cuentas_config', config);
    renderList();
  }
  openVentaDetail(id);
}

// ============================================================
// FACTURAS — lista separada, detalle y edición
// ============================================================
export function renderFacturas(){
  const term = searchInput.value.trim().toLowerCase();
  const items = db.ventas
    .filter(v => v.folio)
    .filter(v => v.clienteNombre.toLowerCase().includes(term) || ('f' + v.folio).includes(term) || String(v.folio).padStart(4,'0').includes(term))
    .sort((a,b) => b.folio - a.folio);
  const pendientes = db.ventas.filter(v => !v.folio).length;
  const banner = pendientes > 0
    ? `<div class="summary-card" style="margin-bottom:14px;"><div class="label">Ventas sin factura</div><div class="value" style="font-size:14px;">${pendientes} · toca + para facturar una</div></div>`
    : '';
  const hayFacturas = db.ventas.some(v => v.folio);
  if(items.length === 0){
    listWrap.innerHTML = banner + emptyState(
      hayFacturas ? 'Sin resultados' : 'Aún no tienes facturas',
      hayFacturas ? 'Prueba con otro nombre o folio.' : 'Toca + para generar una factura a partir de una venta registrada.'
    );
    return;
  }
  listWrap.innerHTML = banner + '<ul class="list">' + items.map(v => `
      <li class="row" data-id="${v.id}">
        <div class="row-main">
          <div class="row-title">F-${String(v.folio).padStart(4,'0')} · ${escapeHtml(v.clienteNombre)}</div>
          <div class="row-sub">${fmtDate(v.fecha)}</div>
        </div>
        <div class="row-value">${money(v.total)}</div>
      </li>`).join('') + '</ul>';
  listWrap.querySelectorAll('.row').forEach(row => row.addEventListener('click', () => openVentaDetail(row.getAttribute('data-id'))));
}

export function openSinFacturaPicker(){
  const pendientes = db.ventas
    .filter(v => !v.folio)
    .sort((a,b) => b.fecha.localeCompare(a.fecha) || (b.creadoTs||0) - (a.creadoTs||0));
  if(pendientes.length === 0){
    openOverlay(`
        <div class="sheet-handle"></div>
        <h2>Sin ventas pendientes</h2>
        <p style="color:var(--ink-soft); font-size:14px; line-height:1.5;">Todas tus ventas ya tienen factura. Registra una venta nueva desde la pestaña Ventas.</p>
        <div class="sheet-actions"><button class="btn btn-primary" id="okBtn" style="flex:1;">Entendido</button></div>
      `, (ov) => ov.querySelector('#okBtn').addEventListener('click', () => ov.remove()));
    return;
  }
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Generar factura</h2>
      <div class="step-note">Elige la venta a facturar</div>
      <div class="pick-list">
        ${pendientes.map(v => `<div class="pick-row" data-id="${v.id}"><span class="name">${escapeHtml(v.clienteNombre)} · ${fmtDate(v.fecha)}</span><span class="meta">${money(v.total)}</span></div>`).join('')}
      </div>
      <div class="sheet-actions"><button class="btn btn-secondary" id="cancelBtn" style="flex:1;">Cancelar</button></div>
    `, (overlay) => {
    overlay.querySelector('#cancelBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelectorAll('.pick-row').forEach(row => row.addEventListener('click', () => {
      overlay.remove();
      generarFactura(row.getAttribute('data-id'));
    }));
  });
}

export function buildInvoiceHtml(v){
  const color = config.colorFactura || '#1E4FA0';
  const logoBlock = config.logo
    ? `<img class="inv-logo" src="${config.logo}" alt="">`
    : `<div class="inv-logo-placeholder" style="background:${color};">${escapeHtml(initials(config.nombre))}</div>`;
  const bizMetaLines = [
    config.mostrarDireccion !== false ? config.direccion : '',
    config.mostrarTelefono !== false ? config.telefono : '',
    config.mostrarEmail !== false ? config.email : '',
  ].filter(Boolean).map(escapeHtml).join('<br>');
  const clienteMetaLines = [v.clienteDireccion, v.clienteTelefono, v.clienteEmail].filter(Boolean).map(escapeHtml).join('<br>');
  const medioNombre = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', credito: 'A crédito', mixto: 'Mixto' };
  const on = k => config[k] !== false;
  const onOpt = k => config[k] === true;
  const descItem = it => it.caracteristicas || ((db.inventario.find(x => x.id === it.productoId) || {}).descripcion) || '';
  const fotosBox = (() => {
    if(!onOpt('mostrarFotos')) return '';
    const fs = v.items.map(it => { const pr = db.inventario.find(x => x.id === it.productoId); const src = it.foto || (pr && pr.foto); return src ? { src, nombre: it.nombre } : null; }).filter(Boolean);
    if(!fs.length) return '';
    return `<div class="inv-fotos">${fs.map(x => `<figure><img src="${x.src}" alt=""><figcaption>${escapeHtml(x.nombre)}</figcaption></figure>`).join('')}</div>`;
  })();
  const mNW = n => money(n).replace(/([\d.,]+)$/, '<span class="nw">$1</span>');
  const saldo = v.fiado ? saldoVenta(v) : 0;
  const pagada = saldo <= 0;
  const abonos = (v.abonos || []).slice().sort((a,b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const sumaProd = v.sumaItems !== undefined ? v.sumaItems : v.subtotal;
  const pagosHtml = abonos.length && on('mostrarPagos') ? `
        <div class="inv-section-title">Pagos recibidos</div>
        <table class="inv-table inv-pagos">
          <thead><tr><th>Fecha</th><th>Medio</th><th class="num">Monto</th></tr></thead>
          <tbody>${abonos.map(a => `<tr><td>${fmtDate(a.fecha)}</td><td>${medioNombre[a.metodo] || '—'}</td><td class="num">${mNW(a.monto)}</td></tr>`).join('')}</tbody>
        </table>` : '';
  return `
      <div class="invoice-doc" style="--inv-color:${color};">
        <div class="inv-header">
          <div class="inv-biz">
            ${logoBlock}
            <div>
              <div class="inv-biz-name">${escapeHtml(config.nombre)}</div>
              <div class="inv-biz-meta">${bizMetaLines}</div>
            </div>
          </div>
        </div>
        <div class="inv-title-big">${escapeHtml(v.tituloDoc || config.facturaTitulo || 'FACTURA')}</div>
        <div class="inv-meta-row">
          <div class="inv-parties">
            <div class="p-label">Facturar a</div>
            <div class="p-name">${escapeHtml(v.clienteNombre)}</div>
            <div class="p-meta">${clienteMetaLines}</div>
          </div>
          <div>
            <div class="inv-num-big">Nº ${String(v.folio).padStart(4,'0')}</div>
            <div class="inv-date">${fmtDate(v.fecha)}</div>
            ${metodoLabel(v) ? `<div class="inv-pago">Forma de pago: ${metodoLabel(v)}</div>` : ''}
          </div>
        </div>
        <table class="inv-table inv-items">
          <thead><tr><th>Nº</th><th>Producto</th><th class="num">Cantidad</th><th class="num">Tarifa</th><th class="num">Monto</th></tr></thead>
          <tbody>
            ${v.items.map((it, i) => `<tr><td>${i + 1}</td><td><div class="inv-item-name">${escapeHtml(it.nombre)}</div>${descItem(it) ? `<div class="inv-item-sub">${escapeHtml(descItem(it))}</div>` : ''}</td><td class="num">${it.cantidad}</td><td class="num">${mNW(it.precio)}</td><td class="num">${mNW(it.precio * it.cantidad)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="inv-bottom">
          <div class="inv-left">
          ${on('mostrarTenga') ? `<div class="inv-note-box">
            <div class="inv-section-title">Tenga en cuenta</div>
            ${config.tengaTexto ? `<div>${escapeHtml(config.tengaTexto).replace(/\n/g, '<br>')}</div>` : ''}
            ${v.notas ? `<div>${escapeHtml(v.notas)}</div>` : ''}
          </div>` : ''}
          </div>
          <div class="inv-totals2">
            <div class="tr"><span>Suma de productos</span><span>${mNW(sumaProd)}</span></div>
            ${v.descuentoMonto > 0 ? `<div class="tr"><span>${v.descuentoTipo === 'monto' ? 'Descuento' : `Descuento (${v.descuentoPct}%)`}</span><span>-${mNW(v.descuentoMonto)}</span></div>` : ''}
            ${v.impuesto > 0 ? `<div class="tr"><span>Impuesto</span><span>${mNW(v.impuesto)}</span></div>` : ''}
            <div class="tr gran"><span>Gran total</span><span>${mNW(v.total)}</span></div>
            ${abonos.length ? `<div class="tr"><span>Pagado</span><span>-${mNW(abonadoVenta(v))}</span></div>` : ''}
            ${v.fiado ? `<div class="tr saldo"><span>Saldo</span><span>${mNW(saldo)}</span></div>` : ''}
          </div>
        </div>
        ${pagosHtml}
        ${(on('mostrarFirma') || (on('mostrarSello') && pagada)) ? `<div class="inv-signrow">
          ${on('mostrarSello') && pagada ? `<div class="inv-stamp">PAGADA</div>` : '<div></div>'}
          ${on('mostrarFirma') ? `<div class="inv-sign">
          ${config.firmaImg ? `<img class="inv-firma-img" src="${config.firmaImg}" alt="">` : ''}
          <div class="inv-sign-line"></div>
          <div>${escapeHtml(config.nombre)}</div>
          <div><strong>Firma</strong></div>
        </div>` : ''}
        </div>` : ''}
        ${on('mostrarPie') && config.facturaPie ? `<div class="inv-footer">${escapeHtml(config.facturaPie)}</div>` : ''}
        ${fotosBox}
      </div>
    `;
}

export function buildVentaSummaryHtml(v){
  return `
      <div class="invoice-doc">
        <div class="inv-header">
          <div class="inv-biz"><div><div class="inv-biz-name">${escapeHtml(v.clienteNombre)}</div><div class="inv-biz-meta">${fmtDate(v.fecha)} · Sin factura generada</div></div></div>
        </div>
        <table class="inv-table">
          <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead>
          <tbody>
            ${v.items.map(it => `<tr><td>${escapeHtml(it.nombre)}</td><td class="num">${it.cantidad}</td><td class="num">${money(it.precio)}</td><td class="num">${money(it.precio*it.cantidad)}</td></tr>`).join('')}
          </tbody>
        </table>
        ${v.notas ? `<div class="inv-notes"><strong>Notas:</strong> ${escapeHtml(v.notas)}</div>` : ''}
        <div class="inv-totals">
          <div class="t-row"><span>Suma de productos</span><span>${money(v.sumaItems !== undefined ? v.sumaItems : v.subtotal)}</span></div>
          ${v.descuentoMonto > 0 ? `<div class="t-row"><span>${v.descuentoTipo === 'monto' ? 'Descuento' : `Descuento (${v.descuentoPct}%)`}</span><span>-${money(v.descuentoMonto)}</span></div>` : ''}
          ${v.impuesto > 0 ? `<div class="t-row"><span>Impuesto</span><span>${money(v.impuesto)}</span></div>` : ''}
          <div class="t-row grand"><span>Total</span><span>${money(v.total)}</span></div>
        </div>
      </div>
    `;
}

export function openVentaDetail(id){
  const v = db.ventas.find(x => x.id === id);
  if(!v) return;

  if(!v.folio){
    openOverlay(`
        <div class="sheet-handle"></div>
        ${buildVentaSummaryHtml(v)}
        ${v.gananciaEstimada !== undefined ? `
          <div class="ganancia-panel" style="margin-top:12px;">
            <div class="ganancia-toggle" style="cursor:default;">
              <span class="g-label">Ganancia de esta venta</span>
              <span class="g-value ${v.gananciaEstimada >= 0 ? 'pos' : 'neg'}">${money(v.gananciaEstimada)}</span>
            </div>
          </div>` : ''}
        <div class="sheet-actions" style="margin-top:16px;">
          <button class="btn btn-secondary" id="closeBtn">Cerrar</button>
          <button class="btn btn-primary" id="genBtn">Generar factura</button>
        </div>
        <button class="btn-danger-text" id="deleteVentaBtn">Anular venta</button>
      `, (overlay) => {
      overlay.querySelector('#closeBtn').addEventListener('click', () => overlay.remove());
      overlay.querySelector('#genBtn').addEventListener('click', () => { overlay.remove(); generarFactura(v.id); });
      overlay.querySelector('#deleteVentaBtn').addEventListener('click', () => anularVenta(v.id));
    });
    return;
  }

  openOverlay(`
      <div class="sheet-handle"></div>
      <div id="printArea">${buildInvoiceHtml(v)}</div>
      <div class="sheet-actions" style="margin-top:16px;">
        <button class="btn btn-secondary" id="closeBtn">Cerrar</button>
        <button class="btn btn-primary" id="printBtn">Guardar / Imprimir PDF</button>
      </div>
      <button class="btn btn-secondary" id="editFacBtn" style="width:100%; margin-top:10px;">Editar factura</button>
      <button class="btn btn-primary" id="pdfWaBtn" style="width:100%; margin-top:10px;">Compartir PDF por WhatsApp</button>
      <button class="btn-danger-text" id="deleteVentaBtn">Anular factura</button>
    `, (overlay) => {
    overlay.querySelector('#closeBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#printBtn').addEventListener('click', () => window.print());
    overlay.querySelector('#editFacBtn').addEventListener('click', () => { overlay.remove(); openFacturaEdit(v.id); });
    overlay.querySelector('#pdfWaBtn').addEventListener('click', () => compartirFacturaPDF(v, overlay));
    overlay.querySelector('#deleteVentaBtn').addEventListener('click', () => anularVenta(v.id));
  });
}

export function cargarLibsPDF(){
  if(window.jspdf && window.html2canvas) return Promise.resolve();
  const añadir = (src) => new Promise((ok, fail) => {
    const sc = document.createElement('script');
    sc.src = src;
    sc.onload = ok;
    sc.onerror = () => fail(new Error('No se pudo cargar el generador de PDF. Revisa tu conexión.'));
    document.head.appendChild(sc);
  });
  return añadir('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
    .then(() => añadir('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'));
}
export async function descargarArchivo(blob, nombre){
  try{
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if(dl){ await dl.save({ filename: nombre, data: blob }); return; }
  } catch(e){ /* sigue con el enlace normal */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export async function compartirFacturaPDF(v, overlay){
  const btn = overlay.querySelector('#pdfWaBtn');
  const textoBoton = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Preparando PDF…';
  const folio = String(v.folio).padStart(4,'0');
  const nombreArchivo = `${v.tipoDoc || 'Factura'}-${folio}.pdf`;
  try{
    await cargarLibsPDF();
    const nodo = document.createElement('div');
    nodo.style.cssText = 'position:fixed; left:-10000px; top:0; width:760px; background:#ffffff; padding:24px; box-sizing:border-box;';
    nodo.className = 'inv-pdf';
    nodo.innerHTML = buildInvoiceHtml(v);
    document.body.appendChild(nodo);
    let canvas;
    try { canvas = await window.html2canvas(nodo, { scale: 2, backgroundColor: '#ffffff' }); }
    finally { nodo.remove(); }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const margen = 8, anchoPag = 210, altoPag = 297;
    const imgW = anchoPag - margen * 2;
    const imgH = canvas.height * imgW / canvas.width;
    const altoUtil = altoPag - margen * 2;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    for(let k = 0; k * altoUtil < imgH; k++){
      if(k > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margen, margen - k * altoUtil, imgW, imgH);
    }
    const blob = pdf.output('blob');
    const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });
    const saldo = v.fiado ? saldoVenta(v) : 0;
    const texto = `Factura ${folio} de ${config.nombre}. Total: ${money(v.total)}${saldo > 0 ? '. Saldo pendiente: ' + money(saldo) : ''}.`;
    if(navigator.canShare && navigator.canShare({ files: [archivo] })){
      await navigator.share({ files: [archivo], title: nombreArchivo, text: texto });
      return;
    }
    await descargarArchivo(blob, nombreArchivo);
    const cli = db.clientes.find(c => c.id === v.clienteId);
    alert('Se descargó el PDF. Ábrelo y compártelo en WhatsApp. Ahora te abrimos el chat del cliente.');
    window.open(waUrl(cli ? cli.telefono : v.clienteTelefono, texto), '_blank');
  } catch(err){
    if(err && err.name === 'AbortError') return;
    alert('No pude preparar el PDF. ' + (err && err.message ? err.message : 'Intenta de nuevo.'));
  } finally {
    btn.disabled = false;
    btn.textContent = textoBoton;
  }
}

export function openFacturaEdit(id){
  const v = db.ventas.find(x => x.id === id);
  if(!v) return;
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Editar F-${String(v.folio).padStart(4,'0')}</h2>
      <div class="step-note">Puedes cambiar los datos del cliente, la fecha y las notas. Los productos y precios no se editan para no descuadrar el inventario ni los reportes.</div>
      <div class="field"><label>Nombre del cliente</label><input type="text" id="fe_nombre" value="${escapeHtml(v.clienteNombre)}"></div>
      <div class="field"><label>Dirección</label><textarea id="fe_direccion" rows="2" placeholder="Opcional">${escapeHtml(v.clienteDireccion || '')}</textarea></div>
      <div class="row2">
        <div class="field"><label>Teléfono</label><input type="tel" id="fe_telefono" value="${escapeHtml(v.clienteTelefono || '')}" placeholder="Opcional"></div>
        <div class="field"><label>Correo</label><input type="email" id="fe_email" value="${escapeHtml(v.clienteEmail || '')}" placeholder="Opcional"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Fecha de la factura</label><input type="date" id="fe_fecha" value="${v.fecha}"></div>
      </div>
      <div class="field"><label>Tenga en cuenta (recomendaciones y notas)</label><textarea id="fe_notas" rows="3" placeholder="Ej. Cambios dentro de 8 días con factura, cuidados del producto">${escapeHtml(v.notas || '')}</textarea></div>
      <div class="sheet-actions">
        <button class="btn btn-secondary" id="feBack">Volver</button>
        <button class="btn btn-primary" id="feSave">Guardar cambios</button>
      </div>
    `, (overlay) => {
    overlay.querySelector('#feBack').addEventListener('click', () => { overlay.remove(); openVentaDetail(id); });
    overlay.querySelector('#feSave').addEventListener('click', () => {
      const nombre = overlay.querySelector('#fe_nombre').value.trim();
      if(!nombre){ overlay.querySelector('#fe_nombre').focus(); return; }
      db.ventas = db.ventas.map(x => x.id !== id ? x : {
        ...x,
        clienteNombre: nombre,
        clienteDireccion: overlay.querySelector('#fe_direccion').value.trim(),
        clienteTelefono: overlay.querySelector('#fe_telefono').value.trim(),
        clienteEmail: overlay.querySelector('#fe_email').value.trim(),
        fecha: overlay.querySelector('#fe_fecha').value || x.fecha,
        notas: overlay.querySelector('#fe_notas').value.trim(),
      });
      save('cuentas_ventas', db.ventas);
      overlay.remove();
      renderList();
      openVentaDetail(id);
    });
  });
}

