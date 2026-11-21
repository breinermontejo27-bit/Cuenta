// Orisma 2.0 · Prototipo de pantallas (Etapa 3). Datos ficticios; no guarda nada.
// ?p=<pantalla>&t=claro|oscuro

const ic = (n, cls = '') => `<svg class="icono ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const $ = (v) => '$ ' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PESTANAS = [
  ['clientes', 'Clientes'], ['inventario', 'Inventario'], ['ventas', 'Ventas'],
  ['facturas', 'Facturas'], ['gastos', 'Gastos'], ['reportes', 'Reportes'],
];

// ---------- Datos ficticios ----------
const CLIENTES = [
  ['Ana Pérez', '300 111 2233', 85000], ['Carlos Ruiz', '310 222 3344', 0], ['Diana Gómez', 'diana@correo.co', 0],
  ['Esteban Mora', '315 444 5566', 240000], ['Fernanda Ríos', 'Sin datos de contacto', 0], ['Gabriel Torres', '320 666 7788', 0],
];
const PRODUCTOS = [
  ['Manilla tejida', 'Accesorios', 35000, 14000, 2, 0, 'MT'], ['Collar de plata', 'Joyería', 120000, 70000, 8, 2, 'CP'],
  ['Aretes de oro 18k', 'Joyería', 280000, 190000, 5, 0, 'AO'], ['Hilo encerado', 'Materiales', 4000, 1500, 120, 10, 'HE'],
  ['Estuche regalo', '', 8000, 3000, '', 0, 'ER'],
];
const VENTAS = [
  ['Ana Pérez', 'F-0042', '19 nov 2026', 'A crédito', 120000, 85000], ['Carlos Ruiz', 'Sin factura', '19 nov 2026', 'Efectivo', 35000, 0],
  ['Esteban Mora', 'F-0041', '18 nov 2026', 'Mixto', 480000, 240000], ['Diana Gómez', 'F-0040', '17 nov 2026', 'Tarjeta', 280000, 0],
  ['Gabriel Torres', 'Sin factura', '15 nov 2026', 'Efectivo', 43000, 0],
];

// ---------- Piezas ----------
const fila = ({ ini, titulo, sub, valor, insignia, extra, flecha = true }) => `
  <li class="fila" tabindex="0">
    ${ini ? `<div class="miniatura">${ini}</div>` : ''}
    <div class="fila-principal"><div class="fila-titulo">${titulo}</div>${sub ? `<div class="fila-sub">${sub}</div>` : ''}${extra ? `<div class="fila-extra">${extra}</div>` : ''}</div>
    <div class="fila-valor">${valor ? `<div class="monto">${valor}</div>` : ''}${insignia || ''}</div>
    ${flecha ? ic('derecha', 'sm ter') : ''}
  </li>`;
const segmentos = (ops, on) => `<div class="segmentos" role="group">${ops.map(o => `<button type="button" aria-pressed="${o === on}">${o}</button>`).join('')}</div>`;
const lineas = (arr) => `<dl class="lineas">${arr.map(([a, b, c = '']) => `<div class="linea ${c}"><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>`;
const hoja = (titulo, cuerpo, pie, { paso = '', atras = false } = {}) => `
  <div class="velo"><section class="hoja" role="dialog" aria-modal="true" aria-label="${titulo}">
    <header class="hoja-cabecera">${atras ? `<button class="boton-icono" aria-label="Atrás">${ic('atras')}</button>` : ''}
      <h2>${titulo}${paso ? `<span class="paso">${paso}</span>` : ''}</h2>
      <button class="boton-icono" aria-label="Cerrar">${ic('cerrar')}</button></header>
    ${cuerpo}
    ${pie ? `<div class="hoja-pie">${pie}</div>` : ''}
  </section></div>`;

// ---------- Pantallas ----------
const P = {};

P.clientes = {
  tab: 'clientes', titulo: 'Clientes', buscar: 'Buscar cliente', fab: 'Nuevo cliente',
  cuerpo: () => `<ul class="lista">${CLIENTES.map(([n, s, d]) => fila({
    ini: n.split(' ').map(w => w[0]).join(''), titulo: n, sub: s,
    insignia: d ? `<span class="insignia deuda">Debe ${$(d)}</span>` : '' })).join('')}</ul>`,
};

P.inventario = {
  tab: 'inventario', titulo: 'Inventario', buscar: 'Buscar producto', fab: 'Nuevo producto',
  cuerpo: () => `
    <div style="margin-bottom:12px">${segmentos(['Productos', 'Stock', 'Historial'], 'Productos')}</div>
    <div class="banner aviso" role="status">${ic('alerta')}<div><strong>2 productos con poco stock</strong>Manilla tejida, Aretes de oro 18k · Revisar</div></div>
    <div class="chips" role="group" aria-label="Categorías">${['Todas', 'Accesorios', 'Joyería', 'Materiales'].map((c, i) => `<button class="chip" aria-pressed="${i === 0}">${c}</button>`).join('')}</div>
    <ul class="lista">${PRODUCTOS.map(([n, cat, pr, co, st, res, ini]) => {
      const pct = co ? Math.round((pr - co) / co * 100) : null;
      const stock = st === '' ? 'Sin control de stock' : `${st} unid.${res ? ` · ${res} reservadas · ${st - res} disponibles` : ''}`;
      const poco = st !== '' && st <= 3;
      return fila({ ini, titulo: n, sub: `${stock}${cat ? ' · ' + cat : ''}`, valor: $(pr),
        extra: `${poco ? '<span class="insignia aviso">Poco stock</span>' : ''}${pct !== null ? `<span class="insignia pagado">Ganas +${pct}% · ${$(pr - co)}</span>` : ''}` });
    }).join('')}</ul>`,
};

P.ventas = {
  tab: 'ventas', titulo: 'Ventas', buscar: 'Buscar por cliente o folio', fab: 'Nueva venta',
  cuerpo: () => `
    <div style="margin-bottom:12px">${segmentos(['Ventas', 'Pendientes'], 'Ventas')}</div>
    <div class="solo-movil">
      <div class="etiqueta-grupo">Hoy</div>
      <ul class="lista">${VENTAS.slice(0, 2).map(filaVenta).join('')}</ul>
      <div class="etiqueta-grupo">Esta semana</div>
      <ul class="lista">${VENTAS.slice(2).map(filaVenta).join('')}</ul>
    </div>
    <table class="tabla solo-escritorio">
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Factura</th><th>Pago</th><th class="der">Total</th><th class="der">Saldo</th></tr></thead>
      <tbody>${VENTAS.map(([c, f, d, m, t, s], i) => `<tr ${i === 0 ? 'aria-selected="true"' : ''}><td>${d}</td><td><strong>${c}</strong></td><td>${f === 'Sin factura' ? '<span class="insignia neutra">Sin factura</span>' : f}</td><td>${m}</td><td class="der num">${$(t)}</td><td class="der num ${s ? 'neg' : 'ter'}">${s ? $(s) : '—'}</td></tr>`).join('')}</tbody>
    </table>`,
};
function filaVenta([c, f, d, m, t, s]) {
  return fila({ titulo: c, sub: `${f} · ${d} · ${m}`, valor: $(t), extra: s ? `<span class="insignia deuda">Saldo ${$(s)}</span>` : '' });
}

P.pendientes = {
  tab: 'ventas', titulo: 'Ventas', buscar: 'Buscar por cliente', fab: 'Nuevo pendiente',
  cuerpo: () => `
    <div style="margin-bottom:12px">${segmentos(['Ventas', 'Pendientes'], 'Pendientes')}</div>
    <details class="plegable" open><summary>Pedidos <span class="insignia info">3</span>${ic('abajo')}</summary>
      <div class="etiqueta-grupo" style="margin:12px 16px 6px">Vencidos</div>
      <ul class="lista">${fila({ titulo: 'Esteban Mora', sub: '2 × Collar de plata · Abono $ 100.000,00', insignia: '<span class="insignia vencido">Vencido · 17 nov</span>' })}</ul>
      <div class="etiqueta-grupo" style="margin:12px 16px 6px">Para hoy</div>
      <ul class="lista">${fila({ titulo: 'Ana Pérez', sub: '1 × Aretes de oro 18k', insignia: '<span class="insignia info">Hoy</span>' })}</ul>
      <div class="etiqueta-grupo" style="margin:12px 16px 6px">Próximas entregas</div>
      <ul class="lista">${fila({ titulo: 'Diana Gómez', sub: '3 × Manilla tejida', insignia: '<span class="insignia neutra">24 nov</span>' })}</ul>
    </details>
    <details class="plegable"><summary>Encargos <span class="insignia info">1</span>${ic('abajo')}</summary></details>
    <details class="plegable" open><summary>Apartados <span class="insignia info">1</span>${ic('abajo')}</summary>
      <ul class="lista">${fila({ titulo: 'Fernanda Ríos', sub: '1 × Collar de plata · Abonado $ 40.000,00 de $ 120.000,00', insignia: '<span class="insignia deuda">Falta $ 80.000,00</span>' })}</ul>
    </details>`,
};

P.facturas = {
  tab: 'facturas', titulo: 'Facturas', buscar: 'Buscar por cliente o folio', fab: 'Facturar venta',
  cuerpo: () => `
    <div class="banner info">${ic('facturas')}<div><strong>2 ventas sin factura</strong>Toca "Facturar venta" para generar una.</div></div>
    <ul class="lista">${VENTAS.filter(v => v[1] !== 'Sin factura').map(([c, f, d, , t, s]) => fila({ titulo: `${f} · ${c}`, sub: d, valor: $(t), extra: s ? '<span class="insignia deuda">Con saldo</span>' : '<span class="insignia pagado">Pagada</span>' })).join('')}</ul>`,
};

P.gastos = {
  tab: 'gastos', titulo: 'Gastos', buscar: 'Buscar gasto o categoría', fab: 'Nuevo gasto',
  cuerpo: () => `
    <div class="etiqueta-grupo">Noviembre 2026</div>
    <ul class="lista">
      ${fila({ ini: ic('inventario', 'sm'), titulo: 'Compra de inventario: Hilo encerado x50', sub: 'Inventario · 18 nov · Efectivo', valor: `<span class="neg">−${$(75000)}</span>` })}
      ${fila({ ini: ic('gastos', 'sm'), titulo: 'Arriendo del local', sub: 'Local · 5 nov · Tarjeta', valor: `<span class="neg">−${$(900000)}</span>` })}
      ${fila({ ini: ic('gastos', 'sm'), titulo: 'Devolución por pedido cancelado · Gabriel Torres', sub: 'Devolución · 3 nov · Efectivo', valor: `<span class="neg">−${$(20000)}</span>` })}
    </ul>`,
};

P.reportes = {
  tab: 'reportes', titulo: 'Reportes', sinBuscar: true,
  cuerpo: () => `
    <div style="margin-bottom:10px">${segmentos(['Resumen', 'Caja', 'Flujo'], 'Resumen')}</div>
    <div class="chips">${['Este mes', 'Mes anterior', 'Todo'].map((c, i) => `<button class="chip" aria-pressed="${i === 0}">${c}</button>`).join('')}</div>
    <div class="destacada"><div class="etq">Ganancia de este mes</div><div class="val pos">${$(1245000)}</div>
      <div class="sub">${$(3980000)} en ventas · ${$(2035000)} de costo de lo vendido</div>
      <div class="sub" style="margin-top:6px"><span class="insignia pagado">▲ ${$(210000)}</span> frente al mes anterior</div></div>
    <p class="ter" style="font-size:13px;margin:8px 4px 0">Ganancia = ventas − costo de lo vendido − otros gastos. Las compras de inventario no restan hasta que se venden.</p>
    <div class="seccion"><div class="seccion-titulo">Movimiento</div>
      <div class="cifras"><div class="tarjeta cifra"><div class="etq">Ventas</div><div class="val pos">${$(3980000)}</div></div>
      <div class="tarjeta cifra"><div class="etq">Gastos totales</div><div class="val">${$(1675000)}</div></div></div>
      <div class="tarjeta" style="margin-top:12px">${lineas([['Costo de lo vendido', $(2035000)], ['Compras de inventario', $(975000)], ['Otros gastos', $(700000)]])}</div></div>
    <div class="seccion"><div class="seccion-titulo">Productos más vendidos</div>
      <div class="tarjeta">${lineas([['1 · Manilla tejida', '42 unid.'], ['2 · Collar de plata', '18 unid.'], ['3 · Aretes de oro 18k', '6 unid.']])}</div></div>`,
};

P.caja = {
  tab: 'reportes', titulo: 'Reportes', sinBuscar: true,
  cuerpo: () => `
    <div style="margin-bottom:10px">${segmentos(['Resumen', 'Caja', 'Flujo'], 'Caja')}</div>
    <div class="fila-campos" style="align-items:end">${segmentos(['Diario', 'Mensual'], 'Diario')}
      <div class="campo" style="margin:0"><label for="dia">Día</label><input id="dia" class="control" type="date" value="2026-11-19"></div></div>
    <div class="destacada" style="margin-top:12px"><div class="etq">Cierre de caja · 19 nov 2026</div><div class="val pos">${$(155000)}</div>
      <div class="sub">${$(155000)} en ingresos · ${$(0)} en egresos</div></div>
    <div class="cifras" style="margin-top:12px"><div class="tarjeta cifra"><div class="etq">Efectivo</div><div class="val">${$(70000)}</div></div>
      <div class="tarjeta cifra"><div class="etq">Tarjeta</div><div class="val">${$(85000)}</div></div></div>
    <p class="ter" style="font-size:13px;margin:8px 4px 0">De los ingresos, ${$(35000)} son abonos de créditos.</p>
    <details class="plegable" style="margin-top:16px"><summary>Movimientos del día <span class="insignia neutra">3</span>${ic('abajo')}</summary></details>`,
};

P.ajustes = {
  tab: '', titulo: 'Ajustes', sinBuscar: true,
  cuerpo: () => `<ul class="lista">${[
    ['clientes', 'Negocio', 'Orisma · con foto'], ['caja', 'Créditos', `Por cobrar ${$(325000)}`],
    ['facturas', 'Factura', 'FACTURA · color, firma y secciones'], ['inventario', 'Productos', 'Poco stock desde 3 unid.'],
    ['gastos', 'Moneda e impuestos', '$ · Impuesto 0%'], ['compartir', 'Respaldo', 'Último respaldo: hace 3 días'],
  ].map(([i, t, s]) => fila({ ini: ic(i, 'sm'), titulo: t, sub: s })).join('')}</ul>`,
};

// --- Hojas sobre otras pantallas ---
P['nueva-venta'] = {
  ...P.ventas,
  capa: () => hoja('Nueva venta', `
    <div class="banner info" style="margin-top:4px;align-items:center">${ic('clientes')}<div style="flex:1"><strong>Ana Pérez</strong>300 111 2233</div><button class="btn btn-texto" style="margin:-8px -8px -8px 0">Cambiar</button></div>
    <div class="buscador" style="border-radius:var(--r-sm)">${ic('buscar', 'sm')}<input placeholder="Buscar producto para agregar" aria-label="Buscar producto"></div>
    <div style="display:flex;gap:16px;margin:10px 2px 4px"><button class="btn-texto btn" style="min-height:32px;padding:0">${ic('mas', 'sm')} Servicio o libre</button><button class="btn-texto btn" style="min-height:32px;padding:0">${ic('mas', 'sm')} Prenda a medida</button></div>
    <div>
      <div class="item-carrito"><div class="nombre">Collar de plata</div><button class="boton-icono" aria-label="Quitar">${ic('borrar', 'sm')}</button>
        <div class="cantidad"><button aria-label="Menos">−</button><span>1</span><button aria-label="Más">+</button></div><input class="precio-unit" value="120.000" aria-label="Precio unitario"></div>
      <div class="item-carrito"><div class="nombre">Manilla tejida</div><button class="boton-icono" aria-label="Quitar">${ic('borrar', 'sm')}</button>
        <div class="cantidad"><button aria-label="Menos">−</button><span>2</span><button aria-label="Más">+</button></div><input class="precio-unit rebajado" value="30.000" aria-label="Precio unitario (rebajado)"></div>
    </div>
    <div class="fila-campos" style="margin-top:12px"><div class="campo"><label for="desc">Descuento (%)</label><input id="desc" class="control dinero" value="10"></div>
      <div class="campo"><label for="tot">Total a cobrar</label><input id="tot" class="control dinero" value="162.000"></div></div>
    <div class="campo"><label>¿Qué estás registrando?</label>${segmentos(['Venta', 'Pedido', 'Encargo', 'Apartado'], 'Venta')}</div>
    <div class="campo"><label>Forma de pago</label>${segmentos(['Efectivo', 'Tarjeta', 'Crédito', 'Mixto'], 'Crédito')}</div>
    <div class="fila-campos"><div class="campo"><label for="ab">Abono inicial</label><input id="ab" class="control dinero" value="50.000"></div>
      <div class="campo"><label>Medio del abono</label>${segmentos(['Efectivo', 'Tarjeta'], 'Efectivo')}</div></div>
    <div class="totales">${lineas([['Suma de productos', $(180000)], ['Descuento (10%)', '−' + $(18000)], ['Total a cobrar', $(162000), 'fuerte total'], ['Queda a crédito', `<span class="neg">${$(112000)}</span>`]])}</div>
    <div class="ganancia"><span>Ganancia estimada</span><strong class="pos num">${$(64000)}</strong></div>`,
    `<div class="acciones"><button class="btn btn-secundario">Atrás</button><button class="btn btn-primario">Revisar y cobrar</button></div>`,
    { paso: 'Paso 2 de 2 · productos y pago', atras: true }),
};

P.pedido = {
  ...P.pendientes,
  capa: () => hoja('Esteban Mora', `
    <div style="display:flex;gap:8px;margin:4px 0 12px"><span class="insignia info">Pedido</span><span class="insignia vencido">Vencido · 17 nov 2026</span></div>
    <div class="tarjeta">${lineas([['2 × Collar de plata<br><span class="ter" style="font-size:13px">Cadena de 45 cm</span>', $(240000)], ['Total estimado', $(240000), 'fuerte'], ['Anticipo · 10 nov', $(100000)], ['Saldo al entregar', `<span class="neg">${$(140000)}</span>`, 'fuerte'], ['Ganancia estimada', `<span class="pos">${$(100000)}</span>`]])}</div>
    <div class="seccion"><div class="seccion-titulo">Abonos</div><div class="tarjeta">${lineas([['10 nov 2026 · Efectivo', `<span class="pos">${$(100000)}</span>`]])}</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
      <button class="btn btn-secundario">${ic('caja', 'sm')} Registrar abono</button><button class="btn btn-secundario">${ic('facturas', 'sm')} Comprobante</button>
      <button class="btn btn-secundario">${ic('mensaje', 'sm')} WhatsApp</button><button class="btn btn-secundario">${ic('editar', 'sm')} Editar</button></div>
    <button class="btn btn-texto peligro btn-bloque" style="margin-top:12px">Cancelar pedido</button>`,
    `<button class="btn btn-primario btn-bloque">${ic('ok', 'sm')} Marcar entregado</button>`),
};

P.factura = {
  ...P.facturas,
  capa: () => hoja('Factura F-0041', `
    <article class="factura" aria-label="Vista de la factura">
      <div class="cab"><div style="display:flex;gap:12px;align-items:center"><div class="logo">O</div><div><strong style="font-size:15px">Orisma</strong><br><span style="color:#4A5261">Calle 10 # 4-21 · 300 000 0000</span></div></div>
        <div style="text-align:right"><div class="titulo">FACTURA</div><div>Nº 0041 · 18 nov 2026</div></div></div>
      <p style="margin-top:12px"><span style="color:#4A5261">Facturar a</span><br><strong>Esteban Mora</strong> · 315 444 5566</p>
      <table><thead><tr><th>Producto</th><th class="der">Cant.</th><th class="der">Tarifa</th><th class="der">Monto</th></tr></thead>
        <tbody><tr><td>Collar de plata<br><span style="color:#646C7A">Plata 950, cadena 45 cm</span></td><td class="der">4</td><td class="der">${$(120000)}</td><td class="der">${$(480000)}</td></tr></tbody></table>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px">
        <div style="color:#4A5261;max-width:50%"><strong style="color:#141820">Tenga en cuenta</strong><br>Cambios dentro de 8 días con factura.</div>
        <div style="min-width:210px">${lineas([['Gran total', $(480000), 'fuerte'], ['Pagado', '−' + $(240000)], ['Saldo', $(240000), 'fuerte']])}</div></div>
    </article>`,
    `<div class="acciones"><button class="btn btn-secundario">${ic('imprimir', 'sm')} Imprimir</button><button class="btn btn-primario">${ic('compartir', 'sm')} Compartir PDF</button></div>
     <div style="display:flex;justify-content:space-between;margin-top:8px"><button class="btn btn-texto">${ic('editar', 'sm')} Editar datos</button><button class="btn btn-texto peligro">Anular factura</button></div>`),
};

P.confirmar = {
  ...P.clientes,
  capa: () => `<div class="velo centrado" style="align-items:center;justify-content:center"><div class="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dt">
    <h2 id="dt">¿Eliminar a Esteban Mora?</h2>
    <p>Tiene una deuda de <strong class="neg">${$(240000)}</strong> y 1 pedido pendiente. Esta acción no se puede deshacer.</p>
    <div class="acciones"><button class="btn btn-secundario">Cancelar</button><button class="btn btn-peligro">Eliminar</button></div></div></div>`,
};

P.avisos = {
  ...P.ventas,
  capa: () => `<div class="notificaciones" role="status">
    <div class="toast">${ic('ok', 'sm')}<span>Venta registrada · ${$(162000)}</span><button class="accion">Ver factura</button></div>
    <div class="toast grave" role="alert">${ic('alerta', 'sm')}<span><strong>No se pudo guardar.</strong> El almacenamiento del teléfono está lleno. Tus datos anteriores están a salvo.</span><button class="accion">Descargar respaldo</button></div></div>`,
};

P.formulario = {
  ...P.clientes,
  capa: () => hoja('Nuevo cliente', `
    <div class="campo error"><label for="n">Nombre</label><input id="n" class="control" aria-invalid="true" aria-describedby="n-err"><span class="mensaje" id="n-err">${ic('alerta', 'sm')} Escribe el nombre del cliente.</span></div>
    <button class="btn btn-texto" style="padding:0;margin:-6px 0 12px">Importar de contactos</button>
    <div class="fila-campos"><div class="campo"><label for="t">Teléfono</label><input id="t" class="control" type="tel" placeholder="Opcional"></div>
      <div class="campo"><label for="c">Correo</label><input id="c" class="control" type="email" placeholder="Opcional"></div></div>
    <div class="campo"><label for="d">Dirección de facturación</label><textarea id="d" class="control" rows="2" placeholder="Opcional"></textarea></div>`,
    `<div class="acciones"><button class="btn btn-secundario">Cancelar</button><button class="btn btn-primario">Guardar</button></div>`),
};

P.vacio = {
  ...P.clientes,
  cuerpo: () => `<div class="vacio">${ic('clientes')}<h3>Aún no tienes clientes</h3><p>Toca "Nuevo cliente" para registrar el primero.</p></div>`,
};

// ---------- Montaje ----------
function pintar(nombre) {
  const p = P[nombre] || P.clientes;
  const nav = (cls) => PESTANAS.map(([k, t]) => `<a href="#" class="${cls}" ${p.tab === k ? 'aria-current="page"' : ''}>${cls === 'pestana' ? `<span class="icono-fondo">${ic(k)}</span>` : ic(k)}<span>${t}</span></a>`).join('');
  document.getElementById('app').innerHTML = `
    <aside class="lateral" aria-label="Navegación">
      <div class="negocio"><div class="avatar">OR</div><div class="negocio-nombre">Orisma</div></div>
      <nav>${nav('enlace-lateral')}</nav>
      <div class="pie"><a href="#" class="enlace-lateral" ${nombre === 'ajustes' ? 'aria-current="page"' : ''}>${ic('ajustes')}<span>Ajustes</span></a></div>
    </aside>
    <div class="principal">
      <header class="barra-sup">
        <div class="fila"><div class="negocio"><div class="avatar">OR</div><div class="negocio-nombre">Orisma</div></div>
          <button class="boton-icono ajustes" aria-label="Ajustes">${ic('ajustes')}</button></div>
        <h1 class="titulo-pantalla">${p.titulo}</h1>
        ${p.sinBuscar ? '' : `<label class="buscador">${ic('buscar', 'sm')}<span class="oculto-visual">Buscar</span><input placeholder="${p.buscar}"></label>`}
        ${p.fab ? `<button class="btn btn-primario solo-escritorio">${ic('mas', 'sm')} ${p.fab}</button>` : ''}
      </header>
      <main class="contenido">${p.cuerpo()}</main>
    </div>
    ${p.fab ? `<button class="accion-principal">${ic('mas')} ${p.fab}</button>` : ''}
    <nav class="pestanas" aria-label="Secciones">${nav('pestana')}</nav>`;
  document.getElementById('capa').innerHTML = p.capa ? p.capa() : '';
}

const q = new URLSearchParams(location.search);
const sel = document.getElementById('selPantalla');
sel.innerHTML = Object.keys(P).map(k => `<option ${k === (q.get('p') || 'clientes') ? 'selected' : ''}>${k}</option>`).join('');
sel.onchange = () => { q.set('p', sel.value); location.search = q; };
const selT = document.getElementById('selTema');
selT.value = q.get('t') || '';
if (selT.value) document.documentElement.dataset.tema = selT.value;
selT.onchange = () => { q.set('t', selT.value); location.search = q; };
if (q.get('limpio')) document.querySelector('.marco-proto').remove();
pintar(q.get('p') || 'clientes');
