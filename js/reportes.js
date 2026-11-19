// Reportes, caja diaria/mensual y flujo de dinero.
import { saldoVenta } from './creditos.js';
import { listWrap } from './dom.js';
import { esPocoStock } from './inventario.js';
import { db, ui } from './state.js';
import { segHtml } from './ui.js';
import { escapeHtml, fmtDate, money, monthKey, todayStr } from './utils.js';

export function cajaResumen(enRango){
  let efectivo = 0, tarjeta = 0, abonosCred = 0;
  db.ventas.forEach(x => {
    (x.abonos || []).forEach(a => {
      if(!enRango(a.fecha)) return;
      const monto = Number(a.monto) || 0;
      if(a.metodo === 'tarjeta') tarjeta += monto; else efectivo += monto;
      if(x.fiado) abonosCred += monto;
    });
    if(enRango(x.fecha) && !x.fiado && !(x.abonos && x.abonos.length)){
      efectivo += Number(x.total) || 0; // ventas anteriores a los medios de pago: se cuentan como efectivo
    }
  });
  db.pedidos.forEach(p => {
    if(p.estado !== 'pendiente' && p.estado !== 'cancelado') return;
    const lstAb = (p.abonos && p.abonos.length) ? p.abonos : ((Number(p.anticipo) || 0) > 0 ? [{ fecha: p.fechaAnticipo || todayStr(), monto: p.anticipo, metodo: 'efectivo' }] : []);
    lstAb.forEach(a => {
      if(!enRango(a.fecha)) return;
      const monto = Number(a.monto) || 0;
      if(a.metodo === 'tarjeta') tarjeta += monto; else efectivo += monto;
    });
  });
  const ventasTot = db.ventas.filter(x => enRango(x.fecha)).reduce((s,x) => s + (Number(x.total)||0), 0);
  const creditoNuevo = db.ventas.filter(x => x.fiado && enRango(x.fecha)).reduce((s,x) => s + (Number(x.total)||0), 0);
  const gs = db.gastos.filter(g => enRango(g.fecha));
  const gastosTot = gs.reduce((s,g) => s + (Number(g.monto)||0), 0);
  const gastosEf = gs.filter(g => (g.metodo || 'efectivo') === 'efectivo').reduce((s,g) => s + (Number(g.monto)||0), 0);
  const gastosTj = gastosTot - gastosEf;
  const compras = gs.filter(g => g.tipo === 'compra').reduce((s,g) => s + (Number(g.monto)||0), 0);
  const ingresos = efectivo + tarjeta;
  return {
    efectivo, tarjeta, ingresos, abonosCred, ventasTot, creditoNuevo,
    gastosTot, compras, otros: gastosTot - compras,
    neto: ingresos - gastosTot, efectivoCaja: efectivo - gastosEf, tarjetaCaja: tarjeta - gastosTj,
  };
}

export function renderCajaHtml(){
  const esDia = ui.cajaModo === 'dia';
  const rango = esDia ? (f => f === ui.cajaFecha) : (f => monthKey(f) === ui.cajaMes);
  const C = cajaResumen(rango);
  const titulo = esDia
    ? fmtDate(ui.cajaFecha)
    : new Date(ui.cajaMes + '-01T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  let movHtml = '';
  if(esDia){
    const movs = [];
    db.ventas.forEach(x => {
      const ref = x.folio ? ` · F-${String(x.folio).padStart(4,'0')}` : '';
      (x.abonos || []).forEach(a => {
        if(a.fecha !== ui.cajaFecha) return;
        movs.push({ ingreso: true, titulo: `${x.fiado ? 'Abono de crédito' : 'Venta'} · ${x.clienteNombre || ''}${ref}`, metodo: a.metodo, monto: Number(a.monto) || 0 });
      });
      if(x.fecha === ui.cajaFecha && !x.fiado && !(x.abonos && x.abonos.length)) movs.push({ ingreso: true, titulo: `Venta anterior · ${x.clienteNombre || ''}${ref}`, metodo: 'efectivo', monto: Number(x.total) || 0 });
    });
    db.pedidos.forEach(p => {
      if(p.estado !== 'pendiente' && p.estado !== 'cancelado') return;
      const tipoTxt = p.tipo === 'apartado' ? 'apartado' : p.tipo === 'encargo' ? 'encargo' : 'pedido';
      const estadoTxt = p.estado === 'cancelado' ? ' (cancelado)' : '';
      const lst = (p.abonos && p.abonos.length) ? p.abonos : ((Number(p.anticipo) || 0) > 0 ? [{ fecha: p.fechaAnticipo || todayStr(), monto: p.anticipo, metodo: 'efectivo' }] : []);
      lst.forEach(a => { if(a.fecha !== ui.cajaFecha) return; movs.push({ ingreso: true, titulo: `Abono de ${tipoTxt} · ${p.clienteNombre || ''}${estadoTxt}`, metodo: a.metodo, monto: Number(a.monto) || 0 }); });
    });
    db.gastos.forEach(g => { if(g.fecha !== ui.cajaFecha) return; movs.push({ ingreso: false, titulo: `${g.categoria ? g.categoria + ' · ' : ''}${g.descripcion || 'Gasto'}`, metodo: g.metodo || 'efectivo', monto: Number(g.monto) || 0 }); });
    const linea = m => `
        <div class="rep-line"><span><span class="credit-title" style="display:block;">${escapeHtml(m.titulo)}</span><span class="credit-sub" style="display:block;">${m.metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}</span></span><span class="${m.ingreso ? 'pos' : 'neg'}">${m.ingreso ? '' : '−'}${money(m.monto)}</span></div>`;
    movHtml = `
        <details class="rep-card" style="margin-top:12px;">
          <summary style="padding:14px 16px; cursor:pointer; font-weight:600;">Ver movimientos del día (${movs.length})</summary>
          ${movs.length ? movs.map(linea).join('') : '<div class="step-note" style="padding:0 16px 14px;">No hay movimientos este día.</div>'}
        </details>`;
  }

  let detalleDias = '';
  if(!esDia){
    const dias = new Set();
    db.ventas.forEach(x => {
      if(monthKey(x.fecha) === ui.cajaMes) dias.add(x.fecha);
      (x.abonos || []).forEach(a => { if(monthKey(a.fecha) === ui.cajaMes) dias.add(a.fecha); });
    });
    db.gastos.forEach(g => { if(monthKey(g.fecha) === ui.cajaMes) dias.add(g.fecha); });
    const lista = Array.from(dias).sort();
    if(lista.length){
      detalleDias = `
          <div class="section-label">Cierre de cada día</div>
          <div class="rep-card">
            ${lista.map(d => {
            const r = cajaResumen(f => f === d);
            return `
                <div class="rep-line">
                  <span><span class="credit-title" style="display:block;">${fmtDate(d)}</span><span class="credit-sub" style="display:block;">Efectivo ${money(r.efectivo)} · Tarjeta ${money(r.tarjeta)} · Gastos ${money(r.gastosTot)}</span></span>
                  <span class="${r.neto < 0 ? 'neg' : 'pos'}">${money(r.neto)}</span>
                </div>`;
          }).join('')}
          </div>`;
    }
  }

  return `
      <div style="margin-top:14px;">${segHtml('vista', [['resumen','Resumen'],['caja','Caja'],['flujo','Flujo']], ui.repVista)}</div>
      <div style="margin-top:10px;">${segHtml('cajamodo', [['dia','Diario'],['mes','Mensual']], ui.cajaModo)}</div>
      <div class="field" style="margin-top:12px;">
        <label>${esDia ? 'Día' : 'Mes'}</label>
        <input type="${esDia ? 'date' : 'month'}" id="cajaFechaInput" value="${esDia ? ui.cajaFecha : ui.cajaMes}">
      </div>

      <div class="rep-hero ${C.neto < 0 ? 'neg' : ''}" style="margin-top:8px;">
        <div class="rep-hero-label">Cierre de caja · ${escapeHtml(titulo)}</div>
        <div class="rep-hero-value">${money(C.neto)}</div>
        <div class="rep-hero-sub">${money(C.ingresos)} en ingresos · ${money(C.gastosTot)} en egresos</div>
      </div>
      <div class="step-note" style="margin-top:8px;">Se calcula sola con tus ventas, abonos y gastos. No tienes que cerrar nada: siempre está al día.</div>

      <div class="section-label">Ingresos</div>
      <div class="rep-card">
        <div class="rep-line"><span>Efectivo</span><span>${money(C.efectivo)}</span></div>
        <div class="rep-line"><span>Tarjeta</span><span>${money(C.tarjeta)}</span></div>
        <div class="rep-line strong"><span>Total ingresos</span><span>${money(C.ingresos)}</span></div>
      </div>
      <div class="step-note">De los ingresos, ${money(C.abonosCred)} son abonos de créditos.</div>

      <div class="section-label">Egresos</div>
      <div class="rep-card">
        <div class="rep-line"><span>Compras de inventario</span><span>${money(C.compras)}</span></div>
        <div class="rep-line"><span>Otros gastos</span><span>${money(C.otros)}</span></div>
        <div class="rep-line strong"><span>Total egresos</span><span>${money(C.gastosTot)}</span></div>
      </div>


      ${movHtml}
      ${detalleDias}
    `;
}

export function renderFlujoHtml(){
  const todo = cajaResumen(() => true);
  const disponible = todo.efectivoCaja + todo.tarjetaCaja;
  const porCredito = db.ventas.reduce((s,v) => s + saldoVenta(v), 0);
  const porPedidos = db.pedidos.filter(p => p.estado === 'pendiente').reduce((s,p) => {
    const total = p.items.reduce((a,it) => a + (Number(it.precio)||0) * (Number(it.cantidad)||0), 0);
    const abonado = (p.abonos && p.abonos.length) ? p.abonos.reduce((a,x) => a + (Number(x.monto)||0), 0) : (Number(p.anticipo)||0);
    return s + Math.max(0, total - abonado);
  }, 0);
  const meses = new Set();
  db.ventas.forEach(v => { if(v.fecha) meses.add(monthKey(v.fecha)); (v.abonos||[]).forEach(a => a.fecha && meses.add(monthKey(a.fecha))); });
  db.pedidos.forEach(p => (p.abonos||[]).forEach(a => a.fecha && meses.add(monthKey(a.fecha))));
  db.gastos.forEach(g => g.fecha && meses.add(monthKey(g.fecha)));
  let acum = 0;
  const filas = [...meses].sort().map(m => {
    const C = cajaResumen(f => monthKey(f) === m);
    const neto = C.ingresos - C.gastosTot;
    acum += neto;
    return { m, entradas: C.ingresos, salidas: C.gastosTot, acum, efectivo: C.efectivoCaja, tarjeta: C.tarjetaCaja };
  });
  const nombreMes = m => { const n = new Date(m + '-01T12:00:00').toLocaleDateString('es-CO', { month: 'long' }); return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + m.slice(0,4); };
  return `
      <div style="margin-top:14px;">${segHtml('vista', [['resumen','Resumen'],['caja','Caja'],['flujo','Flujo']], ui.repVista)}</div>
      <div class="rep-hero ${disponible < 0 ? 'neg' : ''}" style="margin-top:12px;">
        <div class="rep-hero-label">Dinero disponible hoy</div>
        <div class="rep-hero-value">${money(disponible)}</div>
        <div class="rep-hero-sub">${money(todo.efectivoCaja)} en efectivo · ${money(todo.tarjetaCaja)} en tarjeta</div>
      </div>
      <div class="section-label" style="margin-top:14px;">Por cobrar</div>
      <div class="rep-card">
        <div class="rep-line"><span>Créditos de clientes</span><span>${money(porCredito)}</span></div>
        <div class="rep-line"><span>Saldos de encargos y apartados</span><span>${money(porPedidos)}</span></div>
        <div class="rep-line strong"><span>Total por cobrar</span><span>${money(porCredito + porPedidos)}</span></div>
      </div>
      <div class="section-label" style="margin-top:14px;">Flujo por mes</div>
      <div class="rep-card">
        ${filas.length ? filas.slice().reverse().map(f => `
          <div class="rep-line">
            <span style="min-width:0;"><span style="display:block;">${nombreMes(f.m)}</span><span class="credit-sub" style="display:block;">entró ${money(f.entradas)} · salió ${money(f.salidas)}</span><span class="credit-sub" style="display:block;">Efectivo ${money(f.efectivo)} · Tarjeta ${money(f.tarjeta)}</span></span>
            <span class="${f.acum < 0 ? 'neg' : 'pos'}">${money(f.acum)}</span>
          </div>`).join('') : '<div class="step-note" style="margin:0;">Aún no hay movimientos.</div>'}
      </div>
      <div class="step-note">El número de cada mes es el dinero acumulado hasta ese mes. Los abonos cuentan desde el día en que se reciben.</div>
    `;
}

export function bindVistaReportes(){
  listWrap.querySelectorAll('[data-group="vista"] button').forEach(b => b.addEventListener('click', () => { ui.repVista = b.dataset.val; renderReportes(); }));
  listWrap.querySelectorAll('[data-group="cajamodo"] button').forEach(b => b.addEventListener('click', () => { ui.cajaModo = b.dataset.val; renderReportes(); }));
  const inp = listWrap.querySelector('#cajaFechaInput');
  if(inp) inp.addEventListener('change', () => {
    if(ui.cajaModo === 'dia') ui.cajaFecha = inp.value || ui.cajaFecha;
    else ui.cajaMes = inp.value || ui.cajaMes;
    renderReportes();
  });
}

export let repPeriodo = 'mes';
export function mesAnteriorKey(){
  const [y, m] = todayStr().split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
export function gananciaDe(vs, gs){
  const ventasTot = vs.reduce((s,v) => s + v.total, 0);
  const costo = vs.reduce((s,v) => s + (Number(v.costoTotal) || 0), 0);
  const gastosTot = gs.reduce((s,g) => s + g.monto, 0);
  const compras = gs.filter(g => g.tipo === 'compra').reduce((s,g) => s + g.monto, 0);
  const otros = gastosTot - compras;
  return { ventasTot, costo, gastosTot, compras, otros, ganancia: ventasTot - costo - otros };
}

export function renderReportes(){
  if(ui.repVista === 'caja'){
    listWrap.innerHTML = renderCajaHtml();
    bindVistaReportes();
    return;
  }
  if(ui.repVista === 'flujo'){
    listWrap.innerHTML = renderFlujoHtml();
    bindVistaReportes();
    return;
  }
  const hoyKey = todayStr().slice(0,7);
  const prevKey = mesAnteriorKey();
  const clave = repPeriodo === 'mes' ? hoyKey : prevKey;
  const ventasP = repPeriodo === 'todo' ? db.ventas : db.ventas.filter(v => monthKey(v.fecha) === clave);
  const gastosP = repPeriodo === 'todo' ? db.gastos : db.gastos.filter(g => monthKey(g.fecha) === clave);
  const P = gananciaDe(ventasP, gastosP);
  const A = gananciaDe(db.ventas, db.gastos);
  const prev = gananciaDe(db.ventas.filter(v => monthKey(v.fecha) === prevKey), db.gastos.filter(g => monthKey(g.fecha) === prevKey));
  const porCobrar = db.ventas.reduce((s,v) => s + saldoVenta(v), 0);

  const valorInventario = db.inventario.reduce((s,p) => {
    const stockNum = (p.stock === '' || p.stock === null) ? 0 : Number(p.stock);
    return s + stockNum * (Number(p.costo) || 0);
  }, 0);
  const bajoStockCount = db.inventario.filter(esPocoStock).length;

  const contadorProd = {};
  ventasP.forEach(v => (v.items||[]).forEach(it => { contadorProd[it.nombre] = (contadorProd[it.nombre] || 0) + it.cantidad; }));
  const topProd = Object.entries(contadorProd).sort((a,b) => b[1]-a[1]).slice(0,5);

  const etiqueta = repPeriodo === 'mes' ? 'este mes' : repPeriodo === 'anterior' ? 'el mes anterior' : 'todo el tiempo';
  const gColor = (n) => n >= 0 ? 'pos' : 'neg';
  let cmpHtml = '';
  if(repPeriodo === 'mes'){
    if(prev.ventasTot === 0 && prev.gastosTot === 0) cmpHtml = `<div class="rep-hero-sub">Sin datos del mes anterior para comparar</div>`;
    else {
      const diff = P.ganancia - prev.ganancia;
      cmpHtml = `<div class="rep-hero-sub"><strong>${diff >= 0 ? '▲' : '▼'} ${money(Math.abs(diff))}</strong> frente al mes anterior</div>`;
    }
  }

  const topHtml = topProd.length ? `
      <div class="section-label">Productos más vendidos</div>
      <div class="rep-card">
        ${topProd.map(([nombre, cant], idx) => `
          <div class="rep-line">
            <span class="rep-rank-wrap"><span class="rep-rank">${idx + 1}</span>${escapeHtml(nombre)}</span>
            <span>${cant} unid.</span>
          </div>`).join('')}
      </div>` : `<div class="empty-state"><p>Cuando registres ventas en este período, aquí verás tus productos más vendidos.</p></div>`;

  listWrap.innerHTML = `
      <div style="margin-top:14px;">${segHtml('vista', [['resumen','Resumen'],['caja','Caja'],['flujo','Flujo']], ui.repVista)}</div>
      <div style="margin-top:10px;">${segHtml('rep', [['mes','Este mes'],['anterior','Mes anterior'],['todo','Todo']], repPeriodo)}</div>

      <div class="rep-hero ${gColor(P.ganancia)}" style="margin-top:12px;">
        <div class="rep-hero-label">Ganancia de ${etiqueta}</div>
        <div class="rep-hero-value">${money(P.ganancia)}</div>
        <div class="rep-hero-sub">${money(P.ventasTot)} en ventas · ${money(P.costo)} de costo de lo vendido</div>
        ${cmpHtml}
      </div>
      <div class="step-note" style="margin-top:8px;">Ganancia = ventas − costo de lo vendido − otros gastos. Las compras de inventario no restan hasta que se venden.</div>

      <div class="section-label">Movimiento</div>
      <div class="rep-grid">
        <div class="rep-stat"><div class="rep-stat-label">Ventas</div><div class="rep-stat-value pos">${money(P.ventasTot)}</div></div>
        <div class="rep-stat"><div class="rep-stat-label">Gastos totales</div><div class="rep-stat-value">${money(P.gastosTot)}</div></div>
      </div>
      <div class="rep-card" style="margin-top:10px;">
        <div class="rep-line"><span>Costo de lo vendido</span><span>${money(P.costo)}</span></div>
        <div class="rep-line"><span>Compras de inventario</span><span>${money(P.compras)}</span></div>
        <div class="rep-line"><span>Otros gastos</span><span>${money(P.otros)}</span></div>
      </div>

      <div class="section-label">Histórico total</div>
      <div class="rep-card">
        <div class="rep-line"><span>Ventas</span><span class="pos">${money(A.ventasTot)}</span></div>
        <div class="rep-line"><span>Por cobrar (créditos)</span><span class="${porCobrar > 0 ? 'neg' : ''}">${money(porCobrar)}</span></div>
        <div class="rep-line strong"><span>Ganancia</span><span class="${gColor(A.ganancia)}">${money(A.ganancia)}</span></div>
      </div>

      <div class="section-label">Inventario</div>
      <div class="rep-grid">
        <div class="rep-stat"><div class="rep-stat-label">Valor de costo en stock</div><div class="rep-stat-value">${money(valorInventario)}</div></div>
        <div class="rep-stat"><div class="rep-stat-label">Productos con poco stock</div><div class="rep-stat-value ${bajoStockCount > 0 ? 'neg' : ''}">${bajoStockCount}</div></div>
      </div>

      ${topHtml}
    `;
  listWrap.querySelectorAll('[data-group="rep"] button').forEach(b => b.addEventListener('click', () => { repPeriodo = b.dataset.val; renderReportes(); }));
  bindVistaReportes();
}

