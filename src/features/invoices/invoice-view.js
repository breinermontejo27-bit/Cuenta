// Ver factura o comprobante: imprimir, compartir PDF por WhatsApp, editar y anular (L3425–3514, L1247–1264).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { pedirHoja } from '../../core/navigation.js';
import { informarError } from '../../core/errors.js';
import { html } from '../../ui/html.js';
import { dinero, numeroDocumento } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { acciones, botonTexto } from '../../ui/components/fields.js';
import { textoCompartirFactura } from '../../business/invoicing.js';
import { crearPdf, compartirArchivo } from '../../services/pdf.js';
import { descargar } from '../../services/export.js';
import { abrirWhatsApp } from '../../services/whatsapp.js';
import { documento, aplicarColor } from './invoice-document.js';
import { conectarVisor } from '../../ui/components/document-viewer.js';
import { abrirEdicionFactura } from './invoice-edit.js';

export function verFactura(ventaId) {
  const v = coleccion('ventas').find((x) => x.id === ventaId);
  if (v) abrirDocumento(v, { esFactura: true });
}

export function verComprobante(doc) {
  abrirDocumento(doc, { esFactura: false });
}

function abrirDocumento(v, { esFactura }) {
  const capa = abrirHoja({
    titulo: esFactura ? `Factura ${numeroDocumento(v.folio)}` : `Comprobante ${numeroDocumento(v.folio)}`,
    cuerpo: html`
      <div id="zonaImpresion" class="visor-doc"><div class="escala-doc">${documento(v)}</div></div>
      <div class="acciones-doc">${botonTexto('Ver a tamaño real', 'ampliar')}</div>
      ${esFactura ? html`<div class="acciones-texto">${botonTexto('Editar datos de la factura', 'editar')}${botonTexto('Anular factura', 'anular', true)}</div>` : ''}`,
    pie: html`${acciones([{ texto: 'Imprimir', accion: 'imprimir', icono: 'imprimir' }, { texto: 'Compartir PDF', accion: 'pdf', tipo: 'primario', icono: 'compartir' }])}`,
  });
  const el = capa.elemento;
  aplicarColor(el);
  conectarVisor(el);
  el.querySelector('[data-accion="imprimir"]').addEventListener('click', () => window.print());
  el.querySelector('[data-accion="pdf"]').addEventListener('click', (e) => compartirPdf(v, e.currentTarget));
  const editar = el.querySelector('[data-accion="editar"]');
  if (editar) editar.addEventListener('click', async () => { await capa.cerrar(); abrirEdicionFactura(v.id, () => verFactura(v.id)); });
  const anular = el.querySelector('[data-accion="anular"]');
  if (anular) anular.addEventListener('click', () => pedirHoja('venta:anular', { ventaId: v.id }));
}

/** Genera el PDF y lo comparte; si el teléfono no permite compartir archivos, lo descarga y abre el chat (L3467–3514). */
async function compartirPdf(v, boton) {
  const textoBoton = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Preparando PDF…';
  const nombre = `${v.tipoDoc || 'Factura'}-${numeroDocumento(v.folio)}.pdf`;
  const texto = textoCompartirFactura(v, obtenerAjustes().nombre, numeroDocumento(v.folio), dinero);
  const nodo = document.createElement('div');
  nodo.className = 'documento-pdf';
  try {
    nodo.insertAdjacentHTML('beforeend', documento(v).texto);
    aplicarColor(nodo);
    document.body.appendChild(nodo);
    const blob = await crearPdf(nodo);
    nodo.remove();
    if (await compartirArchivo(blob, nombre, texto)) return;
    descargar(blob, nombre, 'application/pdf');
    const cli = coleccion('clientes').find((c) => c.id === v.clienteId);
    notificar('Se descargó el PDF. Ábrelo y compártelo en WhatsApp. Te abrimos el chat del cliente.', { tipo: 'exito', duracion: 7000 });
    abrirWhatsApp(cli ? cli.telefono : v.clienteTelefono, texto);
  } catch (e) {
    nodo.remove();
    if (e && e.name === 'AbortError') return;
    informarError(new Error('No pude preparar el PDF. ' + ((e && e.message) || 'Intenta de nuevo.')), 'pdf');
  } finally {
    boton.disabled = false;
    boton.textContent = textoBoton;
  }
}
