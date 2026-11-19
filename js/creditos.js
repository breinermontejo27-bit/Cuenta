// Ventas a crédito, abonos y cartera por cliente.
import { renderList } from './app.js';
import { openClienteForm } from './clientes.js';
import { config, db, save } from './state.js';
import { openOverlay, segHtml } from './ui.js';
import { escapeHtml, fmtDate, money, todayStr, uid, waUrl } from './utils.js';

export function abonadoVenta(v){ return (v.abonos||[]).reduce((s,a) => s + (Number(a.monto)||0), 0); }
export function saldoVenta(v){ return v.fiado ? Math.max(0, (Number(v.total)||0) - abonadoVenta(v)) : 0; }
export function clienteSaldo(id){ return db.ventas.filter(v => v.clienteId === id).reduce((s,v) => s + saldoVenta(v), 0); }

export function openAbonoForm(ventaId, volver){
  const v = db.ventas.find(x => x.id === ventaId);
  if(!v) return;
  const saldo = saldoVenta(v);
  const abonos = (v.abonos||[]).slice().sort((a,b) => b.fecha.localeCompare(a.fecha));
  let metodoAb = 'efectivo';
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Registrar abono</h2>
      <div class="step-note">${escapeHtml(v.clienteNombre)} · ${v.folio ? 'F-' + String(v.folio).padStart(4,'0') + ' · ' : ''}${fmtDate(v.fecha)}</div>
      <div class="rep-card" style="margin-bottom:14px;">
        <div class="rep-line"><span>Total de la venta</span><span>${money(v.total)}</span></div>
        <div class="rep-line"><span>Abonado</span><span class="pos">${money(abonadoVenta(v))}</span></div>
        <div class="rep-line strong"><span>Saldo pendiente</span><span class="${saldo > 0 ? 'neg' : 'pos'}">${money(saldo)}</span></div>
      </div>
      ${saldo > 0 ? `
        <div class="row2">
          <div class="field mono"><label>Monto (${config.moneda})</label><input type="number" inputmode="decimal" id="ab_monto" value="${saldo}"></div>
          <div class="field"><label>Fecha</label><input type="date" id="ab_fecha" value="${todayStr()}"></div>
        </div>
        <div class="field"><label>Nota (opcional)</label><input type="text" id="ab_nota" placeholder="Ej. Nequi, transferencia, número de recibo"></div>
        <div class="field"><label>Medio de pago</label>${segHtml('abm', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], 'efectivo')}</div>
        <div class="sheet-actions">
          <button class="btn btn-secondary" id="abVolver">Volver</button>
          <button class="btn btn-primary" id="abSave">Registrar abono</button>
        </div>
      ` : `
        <p style="color:var(--ink-soft); font-size:14px; line-height:1.5;">Esta venta ya está pagada por completo.</p>
        <div class="sheet-actions"><button class="btn btn-secondary" id="abVolver" style="flex:1;">Volver</button></div>
      `}
      ${abonos.length ? `
        <div class="section-label">Abonos registrados</div>
        <div class="rep-card">
          ${abonos.map(a => `<div class="rep-line"><span>${fmtDate(a.fecha)}${a.nota ? ' · ' + escapeHtml(a.nota) : ''}</span><span>${money(a.monto)}</span></div>`).join('')}
        </div>` : ''}
    `, (overlay) => {
    const volverFn = () => { overlay.remove(); if(volver) volver(); else if(v.clienteId) openClienteForm(v.clienteId); };
    overlay.querySelector('#abVolver').addEventListener('click', volverFn);
    overlay.querySelectorAll('[data-group="abm"] button').forEach(b => b.addEventListener('click', () => {
      metodoAb = b.dataset.val;
      overlay.querySelectorAll('[data-group="abm"] button').forEach(x => x.classList.toggle('on', x.dataset.val === metodoAb));
    }));
    const sb = overlay.querySelector('#abSave');
    if(sb) sb.addEventListener('click', () => {
      const montoInput = overlay.querySelector('#ab_monto');
      const monto = Math.min(Number(montoInput.value) || 0, saldo);
      if(monto <= 0){ montoInput.focus(); return; }
      db.ventas = db.ventas.map(x => x.id !== v.id ? x : {
        ...x,
        abonos: [...(x.abonos||[]), {
          id: uid(),
          fecha: overlay.querySelector('#ab_fecha').value || todayStr(),
          monto,
          nota: overlay.querySelector('#ab_nota').value.trim(),
          metodo: metodoAb,
        }]
      });
      save('cuentas_ventas', db.ventas);
      overlay.remove();
      renderList();
      if(volver) volver(); else if(v.clienteId) openClienteForm(v.clienteId);
    });
  });
}

export function totalPorCobrarAll(){ return db.ventas.reduce((s,v) => s + saldoVenta(v), 0); }

export function openCreditosAjustes(back){
  const deudores = db.clientes
    .map(c => ({ c, deuda: clienteSaldo(c.id) }))
    .filter(x => x.deuda > 0)
    .sort((a,b) => b.deuda - a.deuda);
  const total = deudores.reduce((s,x) => s + x.deuda, 0);
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Créditos</h2>
      <div class="step-note">Clientes que te deben dinero. Toca uno para abonar o liquidar su deuda.</div>
      <div class="rep-hero ${total > 0 ? 'neg' : ''}" style="margin-top:6px;">
        <div class="rep-hero-label">Total por cobrar</div>
        <div class="rep-hero-value">${money(total)}</div>
        <div class="rep-hero-sub">${deudores.length} ${deudores.length === 1 ? 'cliente con saldo pendiente' : 'clientes con saldo pendiente'}</div>
      </div>
      ${deudores.length ? `
        <ul class="list" style="margin-top:12px;">
          ${deudores.map(({c, deuda}) => `
            <li class="row" data-cli="${c.id}">
              <div class="row-main">
                <div class="row-title">${escapeHtml(c.nombre)}</div>
                <div class="row-sub">${db.ventas.filter(v => v.clienteId === c.id && saldoVenta(v) > 0).length} venta(s) a crédito pendientes</div>
              </div>
              <div class="row-value" style="color:var(--danger);">${money(deuda)}</div>
            </li>`).join('')}
        </ul>` : `<div class="empty-state"><p>No tienes créditos pendientes. Cuando registres una venta a crédito, aparecerá aquí.</p></div>`}
      <div class="sheet-actions" style="margin-top:16px;">
        <button class="btn btn-secondary" id="credCerrar" style="flex:1;">Cerrar</button>
      </div>
    `, (overlay) => {
    overlay.querySelector('#credCerrar').addEventListener('click', () => { overlay.remove(); back(); });
    overlay.querySelectorAll('[data-cli]').forEach(r => r.addEventListener('click', () => {
      overlay.remove();
      openCreditoCliente(r.getAttribute('data-cli'), () => openCreditosAjustes(back));
    }));
  });
}

export function openCreditoCliente(clienteId, volver){
  const c = db.clientes.find(x => x.id === clienteId);
  if(!c) return volver();
  const pendientes = db.ventas
    .filter(v => v.clienteId === clienteId && saldoVenta(v) > 0)
    .sort((a,b) => a.fecha.localeCompare(b.fecha));
  const deuda = pendientes.reduce((s,v) => s + saldoVenta(v), 0);
  if(pendientes.length === 0){
    openOverlay(`
        <div class="sheet-handle"></div>
        <h2>${escapeHtml(c.nombre)}</h2>
        <p style="color:var(--ink-soft); font-size:14px; line-height:1.5;">Este cliente no tiene deudas pendientes.</p>
        <div class="sheet-actions"><button class="btn btn-secondary" id="ccVolver" style="flex:1;">Volver</button></div>
      `, (overlay) => overlay.querySelector('#ccVolver').addEventListener('click', () => { overlay.remove(); volver(); }));
    return;
  }
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>${escapeHtml(c.nombre)}</h2>
      <div class="step-note">Debe en total <strong style="color:var(--danger);">${money(deuda)}</strong>. Toca una venta para abonar.</div>
      <div class="rep-card">
        ${pendientes.map(v => `
          <div class="rep-line credit-row" data-abonar="${v.id}">
            <span><span class="credit-title" style="display:block;">${fmtDate(v.fecha)} · ${v.folio ? 'F-' + String(v.folio).padStart(4,'0') : 'Sin factura'}</span><span class="credit-sub" style="display:block;">Abonado ${money(abonadoVenta(v))} de ${money(v.total)}</span></span>
            <span style="color:var(--danger); font-weight:600;">${money(saldoVenta(v))}</span>
          </div>`).join('')}
      </div>
      <button class="link-btn" id="ccWa" style="display:block; margin:12px auto 0; text-align:center;">Enviar recordatorio por WhatsApp</button>
      <div id="ccConfirm"></div>
      <div class="sheet-actions" style="margin-top:14px;">
        <button class="btn btn-secondary" id="ccVolver">Volver</button>
        <button class="btn btn-primary" id="ccLiquidar">Liquidar deuda</button>
      </div>
    `, (overlay) => {
    overlay.querySelector('#ccVolver').addEventListener('click', () => { overlay.remove(); volver(); });
    overlay.querySelector('#ccWa').addEventListener('click', () => {
      const texto = `Hola ${c.nombre}, tienes un saldo pendiente de ${money(deuda)} en ${config.nombre}. ¡Gracias!`;
      window.open(waUrl(c.telefono, texto), '_blank');
    });
    overlay.querySelectorAll('[data-abonar]').forEach(r => r.addEventListener('click', () => {
      overlay.remove();
      openAbonoForm(r.getAttribute('data-abonar'), () => openCreditoCliente(clienteId, volver));
    }));
    let metodoLiq = 'efectivo';
    overlay.querySelector('#ccLiquidar').addEventListener('click', () => {
      overlay.querySelector('#ccConfirm').innerHTML = `
          <div class="rep-card" style="margin-top:14px; padding:14px;">
            <p style="font-size:14px; line-height:1.5; margin-bottom:12px;">Se registrará un abono por ${money(deuda)} para cerrar todas las ventas de ${escapeHtml(c.nombre)}. ¿Continuar?</p>
            <div class="field"><label>Medio de pago</label>${segHtml('liq', [['efectivo','Efectivo'],['tarjeta','Tarjeta']], 'efectivo')}</div>
            <div class="sheet-actions" style="margin-top:0;">
              <button class="btn btn-secondary" id="ccNo">No</button>
              <button class="btn btn-primary" id="ccSi">Sí, liquidar</button>
            </div>
          </div>`;
      overlay.querySelector('#ccNo').addEventListener('click', () => { overlay.querySelector('#ccConfirm').innerHTML = ''; });
      overlay.querySelectorAll('[data-group="liq"] button').forEach(b => b.addEventListener('click', () => {
        metodoLiq = b.dataset.val;
        overlay.querySelectorAll('[data-group="liq"] button').forEach(x => x.classList.toggle('on', x.dataset.val === metodoLiq));
      }));
      overlay.querySelector('#ccSi').addEventListener('click', () => {
        const hoy = todayStr();
        db.ventas = db.ventas.map(x => {
          if(x.clienteId !== clienteId || !x.fiado) return x;
          const saldo = saldoVenta(x);
          if(saldo <= 0) return x;
          return { ...x, abonos: [...(x.abonos||[]), { id: uid(), fecha: hoy, monto: saldo, nota: 'Liquidación', metodo: metodoLiq }] };
        });
        save('cuentas_ventas', db.ventas);
        overlay.remove();
        renderList();
        volver();
      });
    });
  });
}

