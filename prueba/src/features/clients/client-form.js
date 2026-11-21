// Formulario de cliente: crear, editar, eliminar, importar de contactos y créditos del cliente (L1927–1991).

import { coleccion } from '../../core/state.js';
import { pedirHoja } from '../../core/navigation.js';
import { html } from '../../ui/html.js';
import { dinero, fecha, folio } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { confirmar } from '../../ui/overlays/dialog.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, valor, acciones, botonTexto } from '../../ui/components/fields.js';
import { fila, lista, alTocarFila, insignia } from '../../ui/components/list.js';
import { lineas, seccion, nota } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { guardarCliente, eliminarCliente } from '../../operations/clients.js';
import { ventasFiadasCliente, saldoVenta, abonadoVenta, deudaCliente } from '../../business/payments.js';
import { puedeImportarContactos, elegirContacto } from '../../services/contacts.js';
import { abrirWhatsApp, numeroWhatsApp } from '../../services/whatsapp.js';
import { icono } from '../../ui/html.js';

export function abrirFormularioCliente(id) {
  const c = id ? coleccion('clientes').find((x) => x.id === id) : null;
  if (id && !c) return;
  const ventas = coleccion('ventas');
  const fiadas = c ? ventasFiadasCliente(ventas, c.id) : [];
  const deuda = fiadas.reduce((s, v) => s + saldoVenta(v), 0);
  const pendientes = c ? coleccion('pedidos').filter((p) => p.clienteId === c.id && p.estado === 'pendiente').length : 0;
  const creditos = fiadas.length ? seccion('Créditos', html`
    ${lineas([['Saldo pendiente', dinero(deuda), 'fuerte', deuda > 0 ? 'neg' : 'pos']])}
    ${lista(fiadas.map((v) => fila({ datos: { venta: v.id }, titulo: `${fecha(v.fecha)} · ${v.folio ? folio(v.folio) : 'Sin factura'}`, sub: `Abonado ${dinero(abonadoVenta(v))} de ${dinero(v.total)}`, valor: saldoVenta(v) > 0 ? dinero(saldoVenta(v)) : 'Pagado', valorClase: saldoVenta(v) > 0 ? 'neg' : 'pos' })))}
    ${nota('Toca una venta para registrar un abono.')}`) : '';
  const tel = c ? numeroWhatsApp(c.telefono) : '';
  const cabecera = c ? html`
    ${deuda > 0 ? html`<section class="tarjeta cabecera-detalle"><div class="arriba"><div><div class="etq">Debe</div><div class="val neg">${dinero(deuda)}</div></div>${insignia('deuda', `${fiadas.filter((v) => saldoVenta(v) > 0).length} a crédito`)}</div>
      <button type="button" class="btn btn-primario btn-bloque" data-accion="ver-creditos">Ver créditos y abonar</button></section>` : ''}
    ${tel ? html`<div class="acciones-contacto"><button type="button" class="btn btn-secundario" data-accion="whatsapp-cliente">${icono('mensaje', 'sm')}WhatsApp</button><a class="btn btn-secundario" href="tel:${tel}">${icono('telefono', 'sm')}Llamar</a></div>` : ''}` : '';
  const capa = abrirHoja({
    titulo: c ? c.nombre : 'Nuevo cliente',
    paso: c ? 'Datos del cliente y sus créditos' : '',
    cuerpo: html`
      ${cabecera}
      ${campo({ id: 'f_nombre', etiqueta: 'Nombre', valor: c ? c.nombre : '', placeholder: 'Nombre del cliente' })}
      ${puedeImportarContactos() ? botonTexto('Importar de contactos', 'contactos') : ''}
      ${filaCampos(campo({ id: 'f_telefono', etiqueta: 'Teléfono', tipo: 'tel', valor: c ? c.telefono : '', placeholder: 'Opcional' }), campo({ id: 'f_email', etiqueta: 'Correo', tipo: 'email', valor: c ? c.email : '', placeholder: 'Opcional' }))}
      ${campo({ id: 'f_direccion', etiqueta: 'Dirección de facturación', tipo: 'textarea', valor: c ? c.direccion : '', placeholder: 'Opcional' })}
      ${creditos}
      ${c ? botonTexto('Eliminar cliente', 'eliminar', true) : ''}`,
    pie: acciones([{ texto: 'Cancelar', accion: 'cancelar' }, { texto: 'Guardar', accion: 'guardar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
  const btnContactos = el.querySelector('[data-accion="contactos"]');
  if (btnContactos) btnContactos.addEventListener('click', async () => {
    const r = await elegirContacto();
    if (!r) return;
    if (r.nombre) el.querySelector('#f_nombre').value = r.nombre;
    if (r.telefono) el.querySelector('#f_telefono').value = r.telefono;
    if (r.email) el.querySelector('#f_email').value = r.email;
  });
  el.querySelector('[data-accion="guardar"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => guardarCliente(id, {
      nombre: valor(el, 'f_nombre'), telefono: valor(el, 'f_telefono'), email: valor(el, 'f_email'), direccion: valor(el, 'f_direccion'),
    }));
    if (r.ok) { await capa.cerrar(); notificar(c ? 'Cliente actualizado.' : 'Cliente registrado.', { tipo: 'exito' }); }
  });
  alTocarFila(el, 'venta', async (ventaId) => {
    await capa.cerrar();
    pedirHoja('credito:abono', { ventaId, alVolver: () => abrirFormularioCliente(id) });
  });
  const verCreditos = el.querySelector('[data-accion="ver-creditos"]');
  if (verCreditos) verCreditos.addEventListener('click', async () => { await capa.cerrar(); pedirHoja('creditos:cliente', { clienteId: c.id, alVolver: () => abrirFormularioCliente(id) }); });
  const wa = el.querySelector('[data-accion="whatsapp-cliente"]');
  if (wa) wa.addEventListener('click', () => abrirWhatsApp(c.telefono, ''));
  const btnEliminar = el.querySelector('[data-accion="eliminar"]');
  if (btnEliminar) btnEliminar.addEventListener('click', async () => {
    const deudaTotal = deudaCliente(ventas, c.id);
    const avisos = [deudaTotal > 0 ? `Tiene una deuda de ${dinero(deudaTotal)}.` : '', pendientes ? `Tiene ${pendientes} pendiente(s).` : ''].filter(Boolean).join(' ');
    const si = await confirmar({ titulo: `¿Eliminar a ${c.nombre}?`, mensaje: `${avisos} Sus ventas y pendientes se conservan. Esta acción no se puede deshacer.`.trim(), aceptar: 'Eliminar', peligro: true });
    if (!si) return;
    const r = await operar(el, btnEliminar, () => eliminarCliente(c.id));
    if (r.ok) { await capa.cerrar(); notificar('Cliente eliminado.'); }
  });
}
