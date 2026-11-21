// Documento de factura o comprobante de abono (buildInvoiceHtml, L3279–3372). Mismas secciones y opciones de Ajustes.

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { html, imagenSegura } from '../../ui/html.js';
import { dinero, fecha, iniciales, numeroDocumento, etiquetaMedio, MEDIOS } from '../../ui/format.js';
import { datosDocumento } from '../../business/invoicing.js';

/**
 * HTML del documento. `v` es una venta con folio o un comprobante (comprobanteDeAbono).
 * Distribución de la factura original (propuesta A aprobada): encabezado con línea negra, título centrado,
 * "Facturar a" y número/fecha a los lados, tabla con encabezado de color, "Tenga en cuenta" al lado de los
 * totales (gran total en franja de color, saldo en rojo), pagos, sello y firma, y pie.
 * Es una hoja de ancho fijo: se ve igual en pantalla (a escala), al imprimir y en el PDF.
 */
export function documento(v) {
  const aj = obtenerAjustes();
  const d = datosDocumento(v, aj, coleccion('inventario'));
  const logo = imagenSegura(aj.logo);
  const metaNegocio = [d.mostrar('mostrarDireccion') ? aj.direccion : '', d.mostrar('mostrarTelefono') ? aj.telefono : '', d.mostrar('mostrarEmail') ? aj.email : ''].filter(Boolean);
  const metaCliente = [v.clienteDireccion, v.clienteTelefono, v.clienteEmail].filter(Boolean);
  const firma = imagenSegura(aj.firmaImg);
  const lineas = (l) => l.map((x, i) => html`${i ? html`<br>` : ''}${x}`);
  const tenga = d.mostrar('mostrarTenga') ? html`<div class="doc-nota">
      <div class="doc-seccion">Tenga en cuenta</div>
      ${aj.tengaTexto ? html`<div>${lineas(aj.tengaTexto.split('\n'))}</div>` : ''}${v.notas ? html`<div>${v.notas}</div>` : ''}
    </div>` : html`<div></div>`;
  return html`
    <article class="documento" data-color="${d.color}">
      <div class="doc-cabecera">
        ${logo ? html`<img class="doc-logo" src="${logo}" alt="">` : html`<div class="doc-logo-vacio">${iniciales(aj.nombre)}</div>`}
        <div class="doc-negocio"><div class="doc-nombre">${aj.nombre}</div><div class="doc-meta">${lineas(metaNegocio)}</div></div>
      </div>
      <div class="doc-titulo">${d.titulo}</div>
      <div class="doc-fila">
        <div class="doc-cliente-caja"><div class="doc-etq">Facturar a</div><div class="doc-cliente">${v.clienteNombre}</div><div class="doc-meta">${lineas(metaCliente)}</div></div>
        <div class="doc-derecha"><div class="doc-numero">Nº ${numeroDocumento(v.folio)}</div><div class="doc-fecha">${fecha(v.fecha)}</div>${etiquetaMedio(v.metodoPago) ? html`<div class="doc-pago">Forma de pago: ${etiquetaMedio(v.metodoPago)}</div>` : ''}</div>
      </div>
      <table class="doc-items">
        <thead><tr><th class="c-n">Nº</th><th>Producto</th><th class="num c-cant">Cantidad</th><th class="num c-din">Tarifa</th><th class="num c-din">Monto</th></tr></thead>
        <tbody>${(v.items || []).map((it, i) => html`<tr><td>${i + 1}</td><td><div class="doc-item">${it.nombre}</div>${d.descripcion(it) ? html`<div class="doc-item-sub">${d.descripcion(it)}</div>` : ''}</td><td class="num">${it.cantidad}</td><td class="num">${dinero(it.precio)}</td><td class="num">${dinero(it.precio * it.cantidad)}</td></tr>`)}</tbody>
      </table>
      <div class="doc-pie-tabla">
        ${tenga}
        <div class="doc-totales">
          <div><span>Suma de productos</span><span class="num">${dinero(d.sumaProductos)}</span></div>
          ${v.descuentoMonto > 0 ? html`<div><span>${d.descuentoEtiqueta}</span><span class="num">-${dinero(v.descuentoMonto)}</span></div>` : ''}
          ${v.impuesto > 0 ? html`<div><span>Impuesto</span><span class="num">${dinero(v.impuesto)}</span></div>` : ''}
          <div class="gran"><span>Gran total</span><span class="num">${dinero(v.total)}</span></div>
          ${d.abonos.length ? html`<div><span>Pagado</span><span class="num">-${dinero(d.abonado)}</span></div>` : ''}
          ${v.fiado ? html`<div class="saldo"><span>Saldo</span><span class="num">${dinero(d.saldo)}</span></div>` : ''}
        </div>
      </div>
      ${d.abonos.length && d.mostrar('mostrarPagos') ? html`
        <div class="doc-pagos"><div class="doc-seccion">Pagos recibidos</div>
        <table><thead><tr><th>Fecha</th><th>Medio</th><th class="num c-din">Monto</th></tr></thead>
        <tbody>${d.abonos.map((a) => html`<tr><td>${fecha(a.fecha)}</td><td>${MEDIOS[a.metodo] || '—'}</td><td class="num">${dinero(a.monto)}</td></tr>`)}</tbody></table></div>` : ''}
      ${d.mostrar('mostrarFirma') || (d.mostrar('mostrarSello') && d.pagada) ? html`<div class="doc-firmas">
        ${d.mostrar('mostrarSello') && d.pagada ? html`<div class="doc-sello">PAGADA</div>` : html`<div></div>`}
        ${d.mostrar('mostrarFirma') ? html`<div class="doc-firma"><div class="doc-firma-espacio">${firma ? html`<img src="${firma}" alt="">` : ''}</div><div class="doc-firma-linea"></div><div>${aj.nombre}</div><div><strong>Firma</strong></div></div>` : ''}
      </div>` : ''}
      ${d.mostrar('mostrarPie') && aj.facturaPie ? html`<div class="doc-pie">${aj.facturaPie}</div>` : ''}
      ${d.mostrarOpcional('mostrarFotos') && d.fotos.length ? html`<div class="doc-fotos">${d.fotos.map((f) => imagenSegura(f.src) ? html`<figure><img src="${imagenSegura(f.src)}" alt=""><figcaption>${f.nombre}</figcaption></figure>` : '')}</div>` : ''}
    </article>`;
}

/** Aplica el color elegido (sin estilos en línea: la política de seguridad no los permite). */
export function aplicarColor(contenedor) {
  // Solo colores "#rrggbb": un valor raro (p. ej. de datos antiguos) no puede inyectar otras reglas de estilo.
  contenedor.querySelectorAll('.documento[data-color]').forEach((d) => d.style.setProperty('--color-factura', /^#[0-9a-fA-F]{6}$/.test(d.dataset.color) ? d.dataset.color : '#1E4FA0'));
}
