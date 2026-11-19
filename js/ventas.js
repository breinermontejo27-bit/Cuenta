// Ventas: lista, sub-vistas y anulación.
import { renderList } from './app.js';
import { listWrap, searchInput } from './dom.js';
import { openVentaDetail } from './facturas.js';
import { bindVentasSeg, openApartadoDetalle, openPedidoDetalle, renderApartadosHtml, renderPedidosHtml, segVentas } from './pedidos.js';
import { db, save, ui } from './state.js';
import { emptyState, openOverlay } from './ui.js';
import { escapeHtml, fmtDate, metodoLabel, money, todayStr, uid } from './utils.js';

export function renderVentas(){
  if(ui.ventasVista === 'apartados'){
    listWrap.innerHTML = segVentas() + renderApartadosHtml();
    bindVentasSeg();
    listWrap.querySelectorAll('[data-aid]').forEach(row => row.addEventListener('click', () => openApartadoDetalle(row.getAttribute('data-aid'))));
    return;
  }
  if(ui.ventasVista === 'pedidos'){
    listWrap.innerHTML = segVentas() + renderPedidosHtml();
    bindVentasSeg();
    listWrap.querySelectorAll('[data-pid]').forEach(row => row.addEventListener('click', () => { const pp = db.pedidos.find(x => x.id === row.getAttribute('data-pid')); if(pp && pp.tipo === 'apartado') openApartadoDetalle(pp.id); else openPedidoDetalle(row.getAttribute('data-pid')); }));
    return;
  }
  renderVentasLista();
  listWrap.insertAdjacentHTML('afterbegin', segVentas());
  bindVentasSeg();
}

export function renderVentasLista(){
  const term = searchInput.value.trim().toLowerCase();
  const items = db.ventas
    .filter(v => v.clienteNombre.toLowerCase().includes(term) || (v.folio && ('f' + v.folio).includes(term)))
    .sort((a,b) => b.fecha.localeCompare(a.fecha) || (b.creadoTs||0) - (a.creadoTs||0));
  if(items.length === 0){
    listWrap.innerHTML = emptyState(
      db.ventas.length === 0 ? 'Aún no tienes ventas' : 'Sin resultados',
      db.ventas.length === 0 ? 'Toca el botón + para registrar tu primera venta.' : 'Prueba con otro nombre o folio.'
    );
    return;
  }
  listWrap.innerHTML = '<ul class="list">' + items.map(v => `
      <li class="row" data-id="${v.id}">
        <div class="row-main">
          <div class="row-title">${escapeHtml(v.clienteNombre)}</div>
          <div class="row-sub">${v.folio ? 'Factura F-' + String(v.folio).padStart(4,'0') : 'Sin factura'} · ${fmtDate(v.fecha)}${metodoLabel(v) ? ' · ' + metodoLabel(v) : ''}</div>
        </div>
        <div class="row-value">${money(v.total)}</div>
      </li>`).join('') + '</ul>';
  listWrap.querySelectorAll('.row').forEach(row => row.addEventListener('click', () => openVentaDetail(row.getAttribute('data-id'))));
}
export function anularVenta(id){
  const v = db.ventas.find(x => x.id === id);
  if(!v) return;
  const unidades = (v.items||[]).reduce((s,it) => s + (Number(it.cantidad)||0), 0);
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Anular venta</h2>
      <div class="step-note">${escapeHtml(v.clienteNombre)} · ${money(v.total)} · ${fmtDate(v.fecha)}</div>
      <p style="font-size:14px; line-height:1.5;">Se quitará la venta del historial y de los créditos. ${unidades} unidad(es) volverán al inventario${v.folio ? ` y la factura F-${String(v.folio).padStart(4,'0')} quedará anulada` : ''}. Esta acción no se puede deshacer.</p>
      <div class="sheet-actions">
        <button class="btn btn-secondary" id="anNo">No, cancelar</button>
        <button class="btn btn-primary" id="anSi" style="background:var(--danger);">Sí, anular</button>
      </div>
    `, (ov) => {
    ov.querySelector('#anNo').addEventListener('click', () => ov.remove());
    ov.querySelector('#anSi').addEventListener('click', () => {
      (v.items||[]).forEach(it => {
        const cant = Number(it.cantidad) || 0;
        (it.materiales || []).forEach(m => {
          const mp = db.inventario.find(x => x.id === m.productoId);
          if(!mp) return;
          const dev = (Number(m.cantidad) || 0) * cant;
          if(mp.stock !== '' && mp.stock !== null) db.inventario = db.inventario.map(x => x.id === mp.id ? { ...x, stock: Number(x.stock) + dev } : x);
          db.movimientos = [...db.movimientos, { id: uid(), tipo: 'devolucion', ts: Date.now(), productoId: mp.id, productoNombre: mp.nombre, cantidad: dev, motivo: `Venta anulada · ${v.clienteNombre}`, fecha: todayStr() }];
        });
        const p = db.inventario.find(x => x.id === it.productoId);
        if(!p) return;
        if(p.stock !== '' && p.stock !== null) db.inventario = db.inventario.map(x => x.id === p.id ? { ...x, stock: Number(x.stock) + cant } : x);
        db.movimientos = [...db.movimientos, { id: uid(), tipo: 'devolucion', ts: Date.now(), productoId: p.id, productoNombre: p.nombre, cantidad: cant, motivo: `Venta anulada · ${v.clienteNombre}`, fecha: todayStr() }];
      });
      db.ventas = db.ventas.filter(x => x.id !== v.id);
      save('cuentas_ventas', db.ventas);
      save('cuentas_inventario', db.inventario);
      save('cuentas_movimientos', db.movimientos);
      document.querySelectorAll('.overlay').forEach(o => o.remove());
      renderList();
    });
  });
}

