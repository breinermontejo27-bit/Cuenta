// Módulo Facturas: lista, facturar una venta y hojas de factura y comprobante (L3220–3277).

import { coleccion } from '../../core/state.js';
import { html, montar } from '../../ui/html.js';
import { dinero, fecha, folio } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { acciones } from '../../ui/components/fields.js';
import { estadoVacio, fila, lista, insignia, alTocarFila } from '../../ui/components/list.js';
import { banner, nota } from '../../ui/components/cards.js';
import { operar } from '../../ui/operar.js';
import { generarFactura } from '../../operations/invoices.js';
import { filtrarFacturas, ventasSinFactura } from '../../business/invoicing.js';
import { saldoVenta } from '../../business/payments.js';
import { verFactura, verComprobante } from './invoice-view.js';

function elegirVentaParaFacturar() {
  const pendientes = ventasSinFactura(coleccion('ventas'));
  const capa = abrirHoja({
    titulo: pendientes.length ? 'Generar factura' : 'Sin ventas pendientes',
    paso: pendientes.length ? 'Elige la venta a facturar' : '',
    cuerpo: pendientes.length
      ? lista(pendientes.map((v) => fila({ datos: { venta: v.id }, titulo: v.clienteNombre, sub: fecha(v.fecha), valor: dinero(v.total) })))
      : nota('Todas tus ventas ya tienen factura. Registra una venta nueva desde la pestaña Ventas.'),
    pie: acciones([{ texto: pendientes.length ? 'Cancelar' : 'Entendido', accion: 'cerrar-lista' }]),
  });
  capa.elemento.querySelector('[data-accion="cerrar-lista"]').addEventListener('click', capa.cerrar);
  alTocarFila(capa.elemento, 'venta', async (id) => {
    const r = await operar(capa.elemento, null, () => generarFactura(id));
    if (r.ok) { await capa.cerrar(); notificar('Factura generada.', { tipo: 'exito' }); verFactura(id); }
  });
}

export default {
  id: 'facturas',
  titulo: 'Facturas',
  icono: 'facturas',
  orden: 40,
  buscador: 'Buscar por cliente o folio',
  subvistas: [],
  usa: ['ventas'],
  hojas: {
    'factura:ver': ({ ventaId }) => verFactura(ventaId),
    'comprobante:ver': ({ documento }) => verComprobante(documento),
  },
  accionPrincipal: { texto: 'Facturar venta', ejecutar: elegirVentaParaFacturar },
  dibujar(contenedor, { busqueda }) {
    const r = filtrarFacturas(coleccion('ventas'), busqueda);
    const aviso = r.sinFactura > 0 ? banner('info', `${r.sinFactura} venta(s) sin factura`, ' · toca "Facturar venta" para facturar una', 'facturar') : '';
    montar(contenedor, html`${aviso}${r.facturas.length
      ? lista(r.facturas.map((v) => fila({ datos: { id: v.id }, titulo: `${folio(v.folio)} · ${v.clienteNombre}`, sub: fecha(v.fecha), valor: dinero(v.total), extra: [saldoVenta(v) > 0 ? insignia('deuda', 'Con saldo') : insignia('pagado', 'Pagada')] })))
      : estadoVacio(r.hayFacturas
        ? { icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro nombre o folio.' }
        : { icono: 'facturas', titulo: 'Aún no tienes facturas', texto: 'Toca "Facturar venta" para generar una a partir de una venta registrada.' })}`);
    alTocarFila(contenedor, 'id', verFactura);
    const b = contenedor.querySelector('[data-accion="facturar"]');
    if (b) b.addEventListener('click', elegirVentaParaFacturar);
  },
};
