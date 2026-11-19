// GENERADO a partir de index.html del commit 9300dfa (versión original "Cuentas"). NO EDITAR.
// Contiene COPIAS LITERALES de funciones de cálculo de la versión original, para comparar sus resultados con
// src/business/ (pruebas diferenciales). tests/business/original.test.js verifica que cada copia sea literal.
// Las dependencias de pantalla (guardar, redibujar, avisos, DOM) se reemplazan por sustitutos inofensivos.

export const FUNCIONES = ["escapeHtml","money","fmtDate","monthKey","emptyState","metodoLabel","segHtml","abonadoVenta","saldoVenta","clienteSaldo","getCategorias","movimientosInventario","renderHistorialHtml","umbralStock","esPocoStock","renderStockHtml","reservadoSinEncargos","reservadoPorEncargos","unidadesReservadas","pedidoEstadoInfo","costoPedido","entregarPedido","comprobanteDeAbono","apartadoTotal","apartadoAbonado","cajaResumen","renderCajaHtml","renderFlujoHtml","mesAnteriorKey","gananciaDe","renderReportes","totalPorCobrarAll","waUrl"];

export function crearOriginal(estado) {
  let { clientes, inventario, ventas, gastos, movimientos, pedidos, config } = structuredClone(estado);
  const hoy = estado.hoy;
  const avisos = [];
  let contador = 0;
  function uid(){ return 'id' + (++contador); }
  function todayStr(){ return hoy; }
  function save(){}
  function renderList(){}
  function alert(m){ avisos.push(m); }
  const document = { querySelectorAll: () => [] };
  const searchInput = { value: estado.busqueda || '' };
  const listWrap = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
  let repVista = estado.repVista || 'resumen', cajaModo = estado.cajaModo || 'dia', cajaFecha = estado.cajaFecha || hoy, cajaMes = estado.cajaMes || hoy.slice(0, 7), repPeriodo = estado.repPeriodo || 'mes';
  function bindVistaReportes(){}

  // escapeHtml · index.html L501
  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // money · index.html L494
  function money(n){
    const num = Number(n) || 0;
    const abs = Math.abs(num).toFixed(2);
    const [ent, dec] = abs.split('.');
    const grupos = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return config.moneda + ' ' + (num < 0 ? '-' : '') + grupos + ',' + dec;
  }

  // fmtDate · index.html L508
  function fmtDate(iso){
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' });
  }

  // monthKey · index.html L512
  function monthKey(iso){ return iso.slice(0,7); }

  // emptyState · index.html L530
  function emptyState(title, text){
    return `<div class="empty-state"><div class="stamp">${escapeHtml(title)}</div><p>${escapeHtml(text)}</p></div>`;
  }

  // metodoLabel · index.html L550
  function metodoLabel(v){ return v.metodoPago ? (METODOS[v.metodoPago] || '') : ''; }

  // segHtml · index.html L551
  function segHtml(group, opts, selected){
    return `<div class="seg" data-group="${group}">${opts.map(([val, label]) => `<button type="button" data-val="${val}" class="${val === selected ? 'on' : ''}">${label}</button>`).join('')}</div>`;
  }

  // abonadoVenta · index.html L555
  function abonadoVenta(v){ return (v.abonos||[]).reduce((s,a) => s + (Number(a.monto)||0), 0); }

  // saldoVenta · index.html L556
  function saldoVenta(v){ return v.fiado ? Math.max(0, (Number(v.total)||0) - abonadoVenta(v)) : 0; }

  // clienteSaldo · index.html L557
  function clienteSaldo(id){ return ventas.filter(v => v.clienteId === id).reduce((s,v) => s + saldoVenta(v), 0); }

  // getCategorias · index.html L645
  function getCategorias(){
    const set = new Set();
    inventario.forEach(p => { if(p.categoria) set.add(p.categoria); });
    return Array.from(set).sort((a,b) => a.localeCompare(b));
  }

  // movimientosInventario · index.html L655
  function movimientosInventario(){
    const ev = [];
    ventas.forEach(v => (v.items||[]).forEach(it => ev.push({
      tipo: 'venta', fecha: v.fecha, ts: v.creadoTs || 0, nombre: it.nombre,
      cantidad: Number(it.cantidad) || 0,
      detalle: `${v.clienteNombre}${v.folio ? ' · F-' + String(v.folio).padStart(4,'0') : ''} · ${money(it.precio)} c/u`,
    })));
    gastos.filter(g => g.tipo === 'compra').forEach(g => {
      const prod = inventario.find(p => p.id === g.productoId);
      ev.push({
        tipo: 'compra', fecha: g.fecha, ts: 0, nombre: prod ? prod.nombre : (g.descripcion || 'Producto'),
        cantidad: Number(g.cantidad) || 0,
        detalle: `${money(g.cantidad ? g.monto / g.cantidad : 0)} c/u · total ${money(g.monto)}`,
      });
    });
    movimientos.forEach(m => {
      const tipo = m.tipo || 'ajuste';
      ev.push({
        tipo, fecha: m.fecha, ts: m.ts || 0, nombre: m.productoNombre || m.nombre || 'Producto',
        stockAnterior: m.stockAnterior, stockNuevo: m.stockNuevo, cantidad: m.cantidad,
        detalle: m.motivo || (tipo === 'alta' ? 'Producto agregado' : tipo === 'baja' ? 'Producto eliminado' : 'Ajuste manual'),
      });
    });
    return ev.sort((a,b) => b.fecha.localeCompare(a.fecha) || b.ts - a.ts);
  }

  // renderHistorialHtml · index.html L681
  function renderHistorialHtml(){
    const term = searchInput.value.trim().toLowerCase();
    const evs = movimientosInventario().filter(e => (e.nombre || '').toLowerCase().includes(term));
    if(evs.length === 0){
      return emptyState(
        movimientos.length + ventas.length + gastos.length === 0 ? 'Sin movimientos' : 'Sin resultados',
        movimientos.length + ventas.length + gastos.length === 0 ? 'Aquí aparecerán tus ventas, compras, ajustes y productos agregados o eliminados.' : 'Prueba con otro nombre de producto.'
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

  // umbralStock · index.html L709
  function umbralStock(p){
    if(p.sinAlerta) return null;
    const u = p.stockMinimo;
    return (u === '' || u === undefined || u === null) ? (Number(config.stockMinimo) || 0) : Number(u);
  }

  // esPocoStock · index.html L714
  function esPocoStock(p){
    const st = (p.stock === '' || p.stock === null || p.stock === undefined) ? null : Number(p.stock);
    const um = umbralStock(p);
    return st !== null && um !== null && st <= um;
  }

  // renderStockHtml · index.html L749
  function renderStockHtml(){
    if(inventario.length === 0) return emptyState('Aún no tienes productos', 'Agrega productos en la pestaña Productos.');
    const enStock = (p) => (p.stock === '' || p.stock === null) ? null : Number(p.stock);
    const unidades = inventario.reduce((s,p) => s + (enStock(p) || 0), 0);
    const valorCosto = inventario.reduce((s,p) => s + (enStock(p) || 0) * (Number(p.costo) || 0), 0);
    const valorVenta = inventario.reduce((s,p) => s + (enStock(p) || 0) * (Number(p.precio) || 0), 0);
    const sinControl = inventario.filter(p => enStock(p) === null).length;
    const reservadasTot = inventario.reduce((s,p) => s + unidadesReservadas(p.id), 0);
    const bajos = inventario.filter(esPocoStock).length;
    const detalle = inventario
      .map(p => ({ p, stock: enStock(p), valor: (enStock(p) || 0) * (Number(p.costo) || 0) }))
      .sort((a,b) => b.valor - a.valor);
    return `
      <div class="rep-hero">
        <div class="rep-hero-label">Costo total del inventario</div>
        <div class="rep-hero-value">${money(valorCosto)}</div>
        <div class="rep-hero-sub">${inventario.length} productos · ${unidades} unidades en stock</div>
      </div>
      <div class="rep-grid" style="margin-top:10px;">
        <div class="rep-stat"><div class="rep-stat-label">Cantidad de productos</div><div class="rep-stat-value">${inventario.length}</div></div>
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

  // reservadoSinEncargos · index.html L850
  function reservadoSinEncargos(productoId){
    return pedidos
      .filter(p => p.estado === 'pendiente')
      .reduce((s,p) => s + p.items.reduce((a,it) => {
        let u = 0;
        if(it.productoId === productoId && p.tipo !== 'encargo') u += Number(it.cantidad) || 0;
        (it.materiales || []).forEach(m => { if(m.productoId === productoId) u += (Number(m.cantidad) || 0) * (Number(it.cantidad) || 0); });
        return a + u;
      }, 0), 0);
  }

  // reservadoPorEncargos · index.html L861
  function reservadoPorEncargos(productoId){
    const prod = inventario.find(x => x.id === productoId);
    if(!prod || prod.stock === '' || prod.stock === null || prod.stock === undefined) return 0;
    let libre = (Number(prod.stock) || 0) - reservadoSinEncargos(productoId);
    const encargos = pedidos
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

  // unidadesReservadas · index.html L878
  function unidadesReservadas(productoId){
    return reservadoPorEncargos(productoId) + pedidos
      .filter(p => p.estado === 'pendiente')
      .reduce((s,p) => s + p.items.reduce((a,it) => {
        let u = 0;
        if(it.productoId === productoId && p.tipo !== 'encargo') u += Number(it.cantidad) || 0;
        (it.materiales || []).forEach(m => { if(m.productoId === productoId) u += (Number(m.cantidad) || 0) * (Number(it.cantidad) || 0); });
        return a + u;
      }, 0), 0);
  }

  // pedidoEstadoInfo · index.html L896
  function pedidoEstadoInfo(p){
    const hoy = todayStr();
    if(!p.fechaEntrega) return { txt: 'Sin fecha', cls: '', hoy: false };
    if(p.fechaEntrega < hoy) return { txt: 'Vencido · ' + fmtDate(p.fechaEntrega), cls: 'low', hoy: false };
    if(p.fechaEntrega === hoy) return { txt: 'Hoy', cls: '', hoy: true };
    return { txt: fmtDate(p.fechaEntrega), cls: '', hoy: false };
  }

  // costoPedido · index.html L1145
  function costoPedido(p){
    return p.items.reduce((s,it) => {
      const prod = inventario.find(x => x.id === it.productoId);
      const c = prod ? (Number(prod.costo) || 0) : (Number(it.costo) || 0);
      return s + c * (Number(it.cantidad) || 0);
    }, 0);
  }

  // entregarPedido · index.html L1164
  function entregarPedido(p, opts){
    const cantPorProd = {};
    p.items.forEach(it => {
      if(it.productoId) cantPorProd[it.productoId] = (cantPorProd[it.productoId] || 0) + (Number(it.cantidad) || 0);
      (it.materiales || []).forEach(m => { cantPorProd[m.productoId] = (cantPorProd[m.productoId] || 0) + (Number(m.cantidad) || 0) * (Number(it.cantidad) || 0); });
    });
    const faltante = Object.keys(cantPorProd).map(pid => {
      const prod = inventario.find(x => x.id === pid);
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
    const cli = clientes.find(c => c.id === p.clienteId) || {};
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
    inventario = inventario.map(x => {
      const cant = cantPorProd[x.id];
      if(!cant || x.stock === '' || x.stock === null) return x;
      return { ...x, stock: Math.max(0, Number(x.stock) - cant) };
    });
    ventas = [...ventas, venta];
    pedidos = pedidos.map(x => x.id === p.id ? { ...x, estado: 'entregado' } : x);
    save('cuentas_ventas', ventas);
    save('cuentas_inventario', inventario);
    save('cuentas_pedidos', pedidos);
    document.querySelectorAll('.overlay').forEach(o => o.remove());
    renderList();
    alert('Pedido entregado y registrado como venta. Puedes generar su factura desde Ventas.');
  }

  // comprobanteDeAbono · index.html L1230
  function comprobanteDeAbono(p){
    const cli = clientes.find(c => c.id === p.clienteId) || {};
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

  // apartadoTotal · index.html L1422
  function apartadoTotal(p){
    const sub = p.items.reduce((s,it) => s + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
    return sub * (1 + (Number(config.impuesto) || 0) / 100);
  }

  // apartadoAbonado · index.html L1426
  function apartadoAbonado(p){ return (p.abonos || []).reduce((s,a) => s + (Number(a.monto) || 0), 0); }

  // cajaResumen · index.html L1608
  function cajaResumen(enRango){
    let efectivo = 0, tarjeta = 0, abonosCred = 0;
    ventas.forEach(x => {
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
    pedidos.forEach(p => {
      if(p.estado !== 'pendiente' && p.estado !== 'cancelado') return;
      const lstAb = (p.abonos && p.abonos.length) ? p.abonos : ((Number(p.anticipo) || 0) > 0 ? [{ fecha: p.fechaAnticipo || todayStr(), monto: p.anticipo, metodo: 'efectivo' }] : []);
      lstAb.forEach(a => {
        if(!enRango(a.fecha)) return;
        const monto = Number(a.monto) || 0;
        if(a.metodo === 'tarjeta') tarjeta += monto; else efectivo += monto;
      });
    });
    const ventasTot = ventas.filter(x => enRango(x.fecha)).reduce((s,x) => s + (Number(x.total)||0), 0);
    const creditoNuevo = ventas.filter(x => x.fiado && enRango(x.fecha)).reduce((s,x) => s + (Number(x.total)||0), 0);
    const gs = gastos.filter(g => enRango(g.fecha));
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

  // renderCajaHtml · index.html L1645
  function renderCajaHtml(){
    const esDia = cajaModo === 'dia';
    const rango = esDia ? (f => f === cajaFecha) : (f => monthKey(f) === cajaMes);
    const C = cajaResumen(rango);
    const titulo = esDia
      ? fmtDate(cajaFecha)
      : new Date(cajaMes + '-01T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    let movHtml = '';
    if(esDia){
      const movs = [];
      ventas.forEach(x => {
        const ref = x.folio ? ` · F-${String(x.folio).padStart(4,'0')}` : '';
        (x.abonos || []).forEach(a => {
          if(a.fecha !== cajaFecha) return;
          movs.push({ ingreso: true, titulo: `${x.fiado ? 'Abono de crédito' : 'Venta'} · ${x.clienteNombre || ''}${ref}`, metodo: a.metodo, monto: Number(a.monto) || 0 });
        });
        if(x.fecha === cajaFecha && !x.fiado && !(x.abonos && x.abonos.length)) movs.push({ ingreso: true, titulo: `Venta anterior · ${x.clienteNombre || ''}${ref}`, metodo: 'efectivo', monto: Number(x.total) || 0 });
      });
      pedidos.forEach(p => {
        if(p.estado !== 'pendiente' && p.estado !== 'cancelado') return;
        const tipoTxt = p.tipo === 'apartado' ? 'apartado' : p.tipo === 'encargo' ? 'encargo' : 'pedido';
        const estadoTxt = p.estado === 'cancelado' ? ' (cancelado)' : '';
        const lst = (p.abonos && p.abonos.length) ? p.abonos : ((Number(p.anticipo) || 0) > 0 ? [{ fecha: p.fechaAnticipo || todayStr(), monto: p.anticipo, metodo: 'efectivo' }] : []);
        lst.forEach(a => { if(a.fecha !== cajaFecha) return; movs.push({ ingreso: true, titulo: `Abono de ${tipoTxt} · ${p.clienteNombre || ''}${estadoTxt}`, metodo: a.metodo, monto: Number(a.monto) || 0 }); });
      });
      gastos.forEach(g => { if(g.fecha !== cajaFecha) return; movs.push({ ingreso: false, titulo: `${g.categoria ? g.categoria + ' · ' : ''}${g.descripcion || 'Gasto'}`, metodo: g.metodo || 'efectivo', monto: Number(g.monto) || 0 }); });
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
      ventas.forEach(x => {
        if(monthKey(x.fecha) === cajaMes) dias.add(x.fecha);
        (x.abonos || []).forEach(a => { if(monthKey(a.fecha) === cajaMes) dias.add(a.fecha); });
      });
      gastos.forEach(g => { if(monthKey(g.fecha) === cajaMes) dias.add(g.fecha); });
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
      <div style="margin-top:14px;">${segHtml('vista', [['resumen','Resumen'],['caja','Caja'],['flujo','Flujo']], repVista)}</div>
      <div style="margin-top:10px;">${segHtml('cajamodo', [['dia','Diario'],['mes','Mensual']], cajaModo)}</div>
      <div class="field" style="margin-top:12px;">
        <label>${esDia ? 'Día' : 'Mes'}</label>
        <input type="${esDia ? 'date' : 'month'}" id="cajaFechaInput" value="${esDia ? cajaFecha : cajaMes}">
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

  // renderFlujoHtml · index.html L1742
  function renderFlujoHtml(){
    const todo = cajaResumen(() => true);
    const disponible = todo.efectivoCaja + todo.tarjetaCaja;
    const porCredito = ventas.reduce((s,v) => s + saldoVenta(v), 0);
    const porPedidos = pedidos.filter(p => p.estado === 'pendiente').reduce((s,p) => {
      const total = p.items.reduce((a,it) => a + (Number(it.precio)||0) * (Number(it.cantidad)||0), 0);
      const abonado = (p.abonos && p.abonos.length) ? p.abonos.reduce((a,x) => a + (Number(x.monto)||0), 0) : (Number(p.anticipo)||0);
      return s + Math.max(0, total - abonado);
    }, 0);
    const meses = new Set();
    ventas.forEach(v => { if(v.fecha) meses.add(monthKey(v.fecha)); (v.abonos||[]).forEach(a => a.fecha && meses.add(monthKey(a.fecha))); });
    pedidos.forEach(p => (p.abonos||[]).forEach(a => a.fecha && meses.add(monthKey(a.fecha))));
    gastos.forEach(g => g.fecha && meses.add(monthKey(g.fecha)));
    let acum = 0;
    const filas = [...meses].sort().map(m => {
      const C = cajaResumen(f => monthKey(f) === m);
      const neto = C.ingresos - C.gastosTot;
      acum += neto;
      return { m, entradas: C.ingresos, salidas: C.gastosTot, acum, efectivo: C.efectivoCaja, tarjeta: C.tarjetaCaja };
    });
    const nombreMes = m => { const n = new Date(m + '-01T12:00:00').toLocaleDateString('es-CO', { month: 'long' }); return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + m.slice(0,4); };
    return `
      <div style="margin-top:14px;">${segHtml('vista', [['resumen','Resumen'],['caja','Caja'],['flujo','Flujo']], repVista)}</div>
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

  // mesAnteriorKey · index.html L1800
  function mesAnteriorKey(){
    const [y, m] = todayStr().split('-').map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  }

  // gananciaDe · index.html L1804
  function gananciaDe(vs, gs){
    const ventasTot = vs.reduce((s,v) => s + v.total, 0);
    const costo = vs.reduce((s,v) => s + (Number(v.costoTotal) || 0), 0);
    const gastosTot = gs.reduce((s,g) => s + g.monto, 0);
    const compras = gs.filter(g => g.tipo === 'compra').reduce((s,g) => s + g.monto, 0);
    const otros = gastosTot - compras;
    return { ventasTot, costo, gastosTot, compras, otros, ganancia: ventasTot - costo - otros };
  }

  // renderReportes · index.html L1813
  function renderReportes(){
    if(repVista === 'caja'){
      listWrap.innerHTML = renderCajaHtml();
      bindVistaReportes();
      return;
    }
    if(repVista === 'flujo'){
      listWrap.innerHTML = renderFlujoHtml();
      bindVistaReportes();
      return;
    }
    const hoyKey = todayStr().slice(0,7);
    const prevKey = mesAnteriorKey();
    const clave = repPeriodo === 'mes' ? hoyKey : prevKey;
    const ventasP = repPeriodo === 'todo' ? ventas : ventas.filter(v => monthKey(v.fecha) === clave);
    const gastosP = repPeriodo === 'todo' ? gastos : gastos.filter(g => monthKey(g.fecha) === clave);
    const P = gananciaDe(ventasP, gastosP);
    const A = gananciaDe(ventas, gastos);
    const prev = gananciaDe(ventas.filter(v => monthKey(v.fecha) === prevKey), gastos.filter(g => monthKey(g.fecha) === prevKey));
    const porCobrar = ventas.reduce((s,v) => s + saldoVenta(v), 0);

    const valorInventario = inventario.reduce((s,p) => {
      const stockNum = (p.stock === '' || p.stock === null) ? 0 : Number(p.stock);
      return s + stockNum * (Number(p.costo) || 0);
    }, 0);
    const bajoStockCount = inventario.filter(esPocoStock).length;

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
      <div style="margin-top:14px;">${segHtml('vista', [['resumen','Resumen'],['caja','Caja'],['flujo','Flujo']], repVista)}</div>
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

  // totalPorCobrarAll · index.html L3673
  function totalPorCobrarAll(){ return ventas.reduce((s,v) => s + saldoVenta(v), 0); }

  // waUrl · index.html L3628
  function waUrl(telefono, texto){
    let d = String(telefono || '').replace(/\D/g, '');
    if(d.length === 10 && d.startsWith('3')) d = '57' + d;
    return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
  }

  return {
    escapeHtml, money, fmtDate, monthKey, emptyState, metodoLabel, segHtml, abonadoVenta, saldoVenta, clienteSaldo, getCategorias, movimientosInventario, renderHistorialHtml, umbralStock, esPocoStock, renderStockHtml, reservadoSinEncargos, reservadoPorEncargos, unidadesReservadas, pedidoEstadoInfo, costoPedido, entregarPedido, comprobanteDeAbono, apartadoTotal, apartadoAbonado, cajaResumen, renderCajaHtml, renderFlujoHtml, mesAnteriorKey, gananciaDe, renderReportes, totalPorCobrarAll, waUrl,
    get estado() { return { clientes, inventario, ventas, gastos, movimientos, pedidos, config }; },
    avisos, listWrap,
  };
}
