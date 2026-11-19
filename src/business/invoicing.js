// Facturas y comprobantes (Etapa 1, Documento 2 §7: RF-01 … RF-08, RP-16, RP-17).

import { num } from './numbers.js';
import { abonadoVenta, saldoVenta } from './payments.js';

/** RF-01 · Asigna folio si la venta no lo tiene; el contador sube 1 (generarFactura, L3204–3211). */
export function asignarFolio(venta, ajustes) {
  if (venta.folio) return { venta, ajustes, asignado: false };
  return { venta: { ...venta, folio: ajustes.siguienteFolio }, ajustes: { ...ajustes, siguienteFolio: ajustes.siguienteFolio + 1 }, asignado: true };
}

/**
 * RP-16 · Número para un comprobante de abono. Conserva el comportamiento actual: se consume uno nuevo
 * cada vez que se abre un comprobante (D4-07, decisión 6 pendiente).
 */
export function siguienteComprobante(ajustes) {
  const numero = ajustes.siguienteComprobante || 1;
  return { numero, ajustes: { ...ajustes, siguienteComprobante: numero + 1 } };
}

/** RP-17 · Documento "Comprobante de abono" de un pendiente (comprobanteDeAbono, L1230–1244). */
export function comprobanteDeAbono(p, cliente, numero, hoy) {
  const cli = cliente || {};
  const items = p.items.map((it) => ({ productoId: it.productoId, nombre: it.nombre, precio: num(it.precio), cantidad: num(it.cantidad), caracteristicas: it.caracteristicas || '' }));
  const total = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const abonos = p.tipo === 'apartado'
    ? (p.abonos || []).map((a) => ({ fecha: a.fecha, monto: num(a.monto), metodo: a.metodo }))
    : (num(p.anticipo) > 0 ? [{ fecha: p.fechaAnticipo || hoy, monto: num(p.anticipo), metodo: null }] : []);
  return {
    id: p.id, folio: numero, tituloDoc: 'COMPROBANTE DE ABONO', tipoDoc: 'Comprobante', fecha: hoy,
    clienteId: p.clienteId, clienteNombre: p.clienteNombre,
    clienteDireccion: cli.direccion || '', clienteTelefono: cli.telefono || '', clienteEmail: cli.email || '',
    items, sumaItems: total, subtotal: total, descuentoPct: 0, descuentoMonto: 0, impuesto: 0, total,
    fiado: true, abonos, metodoPago: '', notas: '',
  };
}

/** RF-04 … RF-07 · Datos calculados para dibujar una factura o comprobante (buildInvoiceHtml, L3279–3304). */
export function datosDocumento(v, ajustes, inventario) {
  const saldo = v.fiado ? saldoVenta(v) : 0;
  const producto = (it) => inventario.find((x) => x.id === it.productoId);
  return {
    color: ajustes.colorFactura || '#1E4FA0',
    titulo: v.tituloDoc || ajustes.facturaTitulo || 'FACTURA',
    saldo, pagada: saldo <= 0,
    abonos: (v.abonos || []).slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')),
    abonado: abonadoVenta(v),
    sumaProductos: v.sumaItems !== undefined ? v.sumaItems : v.subtotal,
    descuentoEtiqueta: v.descuentoTipo === 'monto' ? 'Descuento' : `Descuento (${v.descuentoPct}%)`,
    descripcion: (it) => it.caracteristicas || ((producto(it) || {}).descripcion) || '',
    fotos: v.items.map((it) => { const pr = producto(it); const src = it.foto || (pr && pr.foto); return src ? { src, nombre: it.nombre } : null; }).filter(Boolean),
    mostrar: (clave) => ajustes[clave] !== false,
    mostrarOpcional: (clave) => ajustes[clave] === true,
  };
}

/** RF-08 · Texto al compartir la factura (L3497–3498). `dinero` formatea montos. */
export function textoCompartirFactura(v, negocio, numeroDoc, dinero) {
  const saldo = v.fiado ? saldoVenta(v) : 0;
  return `Factura ${numeroDoc} de ${negocio}. Total: ${dinero(v.total)}${saldo > 0 ? '. Saldo pendiente: ' + dinero(saldo) : ''}.`;
}

/** RF-03 · Editar factura: solo datos del cliente, fecha y notas (L3540–3550). */
export function editarFactura(v, { nombre, direccion, telefono, email, fecha, notas }) {
  const n = String(nombre || '').trim();
  if (!n) return { ok: false, campo: 'nombre' };
  return { ok: true, venta: { ...v, clienteNombre: n, clienteDireccion: String(direccion || '').trim(), clienteTelefono: String(telefono || '').trim(), clienteEmail: String(email || '').trim(), fecha: fecha || v.fecha, notas: String(notas || '').trim() } };
}

/** Lista de facturas: con folio, búsqueda por cliente, "f12" o "0012", de mayor a menor folio (L3222–3226). */
export function filtrarFacturas(ventas, termino) {
  const t = String(termino || '').trim().toLowerCase();
  return {
    facturas: ventas.filter((v) => v.folio)
      .filter((v) => v.clienteNombre.toLowerCase().includes(t) || ('f' + v.folio).includes(t) || String(v.folio).padStart(4, '0').includes(t))
      .sort((a, b) => b.folio - a.folio),
    sinFactura: ventas.filter((v) => !v.folio).length,
    hayFacturas: ventas.some((v) => v.folio),
  };
}

/** Ventas sin factura, más recientes primero (openSinFacturaPicker, L3250–3252). */
export function ventasSinFactura(ventas) {
  return ventas.filter((v) => !v.folio).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creadoTs || 0) - (a.creadoTs || 0));
}
