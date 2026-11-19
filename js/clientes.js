// Clientes: lista y formulario.
import { renderList } from './app.js';
import { abonadoVenta, clienteSaldo, openAbonoForm, saldoVenta } from './creditos.js';
import { listWrap, searchInput } from './dom.js';
import { db, save } from './state.js';
import { emptyState, openOverlay } from './ui.js';
import { escapeHtml, fmtDate, money, uid } from './utils.js';

export function renderClientes(){
  const term = searchInput.value.trim().toLowerCase();
  const items = db.clientes.filter(c => c.nombre.toLowerCase().includes(term));
  if(items.length === 0){
    listWrap.innerHTML = emptyState(
      db.clientes.length === 0 ? 'Aún no tienes clientes' : 'Sin resultados',
      db.clientes.length === 0 ? 'Toca el botón + para registrar tu primer cliente.' : 'Prueba con otro nombre.'
    );
    return;
  }
  listWrap.innerHTML = '<ul class="list">' + items.map(c => `
      <li class="row" data-id="${c.id}">
        <div class="row-main">
          <div class="row-title">${escapeHtml(c.nombre)}</div>
          <div class="row-sub">${escapeHtml(c.telefono || c.email || 'Sin datos de contacto')}</div>
        </div>
        ${clienteSaldo(c.id) > 0 ? `<span class="saldo-tag">Debe ${money(clienteSaldo(c.id))}</span>` : ''}
      </li>`).join('') + '</ul>';
  listWrap.querySelectorAll('.row').forEach(row => row.addEventListener('click', () => openClienteForm(row.getAttribute('data-id'))));
}

// ============================================================
// CLIENTES form
// ============================================================
export function puedeContactos(){
  return typeof navigator !== 'undefined' && !!navigator.contacts && typeof navigator.contacts.select === 'function';
}
export function openClienteForm(id){
  const record = id ? db.clientes.find(c => c.id === id) : null;
  const fiadosCli = record ? db.ventas.filter(v => v.clienteId === record.id && v.fiado).sort((a,b) => b.fecha.localeCompare(a.fecha)) : [];
  const deudaCli = fiadosCli.reduce((s,v) => s + saldoVenta(v), 0);
  const cuentaHtml = fiadosCli.length ? `
      <div class="section-label" style="margin-top:16px;">Créditos</div>
      <div class="rep-card">
        <div class="rep-line strong"><span>Saldo pendiente</span><span class="${deudaCli > 0 ? 'neg' : 'pos'}">${money(deudaCli)}</span></div>
        ${fiadosCli.map(v => `
          <div class="rep-line credit-row" data-abonar="${v.id}">
            <span><span class="credit-title" style="display:block;">${fmtDate(v.fecha)} · ${v.folio ? 'F-' + String(v.folio).padStart(4,'0') : 'Sin factura'}</span><span class="credit-sub" style="display:block;">Abonado ${money(abonadoVenta(v))} de ${money(v.total)}</span></span>
            <span class="${saldoVenta(v) > 0 ? 'neg' : 'pos'}">${saldoVenta(v) > 0 ? money(saldoVenta(v)) : 'Pagado'}</span>
          </div>`).join('')}
      </div>
      <div class="step-note" style="margin-top:6px;">Toca una venta para registrar un abono.</div>` : '';
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>${record ? 'Editar' : 'Nuevo'} cliente</h2>
      <div class="field"><label>Nombre</label><input type="text" id="f_nombre" value="${escapeHtml(record ? record.nombre : '')}" placeholder="Nombre del cliente"></div>
      ${puedeContactos() ? '<button class="link-btn" id="contactoBtn" type="button" style="display:block; margin:-4px 0 12px;">Importar de contactos</button>' : ''}
      <div class="field"><label>Teléfono</label><input type="tel" id="f_telefono" value="${escapeHtml(record ? record.telefono : '')}" placeholder="Opcional"></div>
      <div class="field"><label>Correo</label><input type="email" id="f_email" value="${escapeHtml(record ? record.email : '')}" placeholder="Opcional"></div>
      <div class="field"><label>Dirección de facturación</label><textarea id="f_direccion" rows="2" placeholder="Opcional">${escapeHtml(record ? record.direccion : '')}</textarea></div>
      ${cuentaHtml}
      <div class="sheet-actions">
        <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveBtn">Guardar</button>
      </div>
      ${record ? '<button class="btn-danger-text" id="deleteBtn">Eliminar</button>' : ''}
    `, (overlay) => {
    overlay.querySelector('#cancelBtn').addEventListener('click', () => overlay.remove());
    const contactoBtn = overlay.querySelector('#contactoBtn');
    if(contactoBtn) contactoBtn.addEventListener('click', async () => {
      try {
        const [c] = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: false });
        if(!c) return;
        if(c.name && c.name[0]) overlay.querySelector('#f_nombre').value = c.name[0];
        if(c.tel && c.tel[0]) overlay.querySelector('#f_telefono').value = c.tel[0];
        if(c.email && c.email[0]) overlay.querySelector('#f_email').value = c.email[0];
      } catch(err){ /* el usuario canceló o el navegador no lo permite */ }
    });
    overlay.querySelector('#saveBtn').addEventListener('click', () => {
      const nombre = overlay.querySelector('#f_nombre').value.trim();
      if(!nombre){ overlay.querySelector('#f_nombre').focus(); return; }
      const data = {
        id: record ? record.id : uid(),
        nombre,
        telefono: overlay.querySelector('#f_telefono').value.trim(),
        email: overlay.querySelector('#f_email').value.trim(),
        direccion: overlay.querySelector('#f_direccion').value.trim(),
      };
      db.clientes = record ? db.clientes.map(c => c.id === record.id ? data : c) : [...db.clientes, data];
      save('cuentas_clientes', db.clientes);
      overlay.remove();
      renderList();
    });
    overlay.querySelectorAll('[data-abonar]').forEach(r => r.addEventListener('click', () => { overlay.remove(); openAbonoForm(r.getAttribute('data-abonar')); }));
    const del = overlay.querySelector('#deleteBtn');
    if(del) del.addEventListener('click', () => {
      db.clientes = db.clientes.filter(c => c.id !== record.id);
      save('cuentas_clientes', db.clientes);
      overlay.remove();
      renderList();
    });
  });
}

