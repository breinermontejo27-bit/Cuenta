// Editar datos de una factura: cliente, fecha y notas (no productos ni precios) (openFacturaEdit, L3516–3557).

import { coleccion } from '../../core/state.js';
import { html } from '../../ui/html.js';
import { numeroDocumento } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, filaCampos, valor, acciones } from '../../ui/components/fields.js';
import { operar } from '../../ui/operar.js';
import { editarFactura } from '../../operations/invoices.js';

export function abrirEdicionFactura(ventaId, alVolver) {
  const v = coleccion('ventas').find((x) => x.id === ventaId);
  if (!v) return;
  const volver = async () => { await capa.cerrar(); alVolver(); };
  const capa = abrirHoja({
    titulo: `Editar factura ${numeroDocumento(v.folio)}`,
    paso: 'Datos del cliente, fecha y notas. Los productos y precios no se editan para no descuadrar el inventario ni los reportes.',
    cuerpo: html`
      ${campo({ id: 'fe_nombre', etiqueta: 'Nombre del cliente', valor: v.clienteNombre })}
      ${campo({ id: 'fe_direccion', etiqueta: 'Dirección', tipo: 'textarea', valor: v.clienteDireccion || '', placeholder: 'Opcional' })}
      ${filaCampos(campo({ id: 'fe_telefono', etiqueta: 'Teléfono', tipo: 'tel', valor: v.clienteTelefono || '', placeholder: 'Opcional' }), campo({ id: 'fe_email', etiqueta: 'Correo', tipo: 'email', valor: v.clienteEmail || '', placeholder: 'Opcional' }))}
      ${campo({ id: 'fe_fecha', etiqueta: 'Fecha de la factura', tipo: 'date', valor: v.fecha })}
      ${campo({ id: 'fe_notas', etiqueta: 'Tenga en cuenta (recomendaciones y notas)', tipo: 'textarea', filas: 3, valor: v.notas || '', placeholder: 'Ej. Cambios dentro de 8 días con factura, cuidados del producto' })}`,
    pie: acciones([{ texto: 'Volver', accion: 'volver' }, { texto: 'Guardar cambios', accion: 'guardar', tipo: 'primario' }]),
    alAtras: volver,
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="volver"]').addEventListener('click', volver);
  el.querySelector('[data-accion="guardar"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => editarFactura(v.id, { nombre: valor(el, 'fe_nombre'), direccion: valor(el, 'fe_direccion'), telefono: valor(el, 'fe_telefono'), email: valor(el, 'fe_email'), fecha: valor(el, 'fe_fecha'), notas: valor(el, 'fe_notas') }));
    if (r.ok) { notificar('Factura actualizada.', { tipo: 'exito' }); await volver(); }
  });
}
