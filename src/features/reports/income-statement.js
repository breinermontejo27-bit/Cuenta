// Reportes › Resumen › botón "Estado de resultados" (actualización contable, nov-2026).
// Ventana para elegir el mes (también meses anteriores), mostrar con qué mes se compara y generar el documento.
// El documento se ve, descarga, comparte e imprime igual que una factura (mismo visor, pdf.js e impresión).
// Las cifras salen de estadoDeResultados() (business/accounting.js), que reutiliza resumenReportes()/gananciaDe().

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { informarError } from '../../core/errors.js';
import { html, imagenSegura } from '../../ui/html.js';
import { dinero, iniciales } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, acciones, botonTexto, valor } from '../../ui/components/fields.js';
import { nota } from '../../ui/components/cards.js';
import { conectarVisor, colorDocumento } from '../../ui/components/document-viewer.js';
import { estadoDeResultados } from '../../business/accounting.js';
import { mesDe, mesAnterior } from '../../business/dates.js';
import { crearPdf, compartirArchivo } from '../../services/pdf.js';
import { descargar } from '../../services/export.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nombreMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;
const conMayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const pct = (n) => `${n > 0 ? '+' : ''}${n.toLocaleString('es', { maximumFractionDigits: 1 })} %`;
const conSigno = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + dinero(Math.abs(n));

/** Ventana: elegir mes y generar. */
export function abrirEstadoResultados() {
  const mesActual = mesDe(hoy());
  const capa = abrirHoja({
    titulo: 'Estado de resultados',
    paso: 'Ventas, costos, gastos y utilidad de un mes, comparados con el mes anterior',
    cuerpo: html`
      ${campo({ id: 'er_mes', etiqueta: 'Mes y año', tipo: 'month', valor: mesActual })}
      <div class="tarjeta er-periodo" data-zona="periodo"></div>
      ${nota('Puedes elegir cualquier mes, también meses anteriores. Las compras de inventario se muestran aparte: no son un gasto del mes.')}`,
    pie: acciones([{ texto: 'Cancelar', accion: 'cancelar' }, { texto: 'Generar estado de resultados', accion: 'generar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  const campoMes = el.querySelector('#er_mes');
  campoMes.max = mesActual;
  const pintarPeriodo = () => {
    const m = /^\d{4}-\d{2}$/.test(campoMes.value) ? campoMes.value : mesActual;
    const zona = el.querySelector('[data-zona="periodo"]');
    zona.textContent = '';
    for (const [etq, txt] of [['Período analizado', conMayuscula(nombreMes(m))], ['Se compara con', conMayuscula(nombreMes(mesAnterior(`${m}-15`)))]]) {
      const fila = document.createElement('div'); fila.className = 'linea';
      const a = document.createElement('dt'); a.textContent = etq;
      const b = document.createElement('dd'); b.textContent = txt;
      fila.append(a, b); zona.append(fila);
    }
  };
  campoMes.addEventListener('input', pintarPeriodo);
  pintarPeriodo();
  el.querySelector('[data-accion="cancelar"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="generar"]').addEventListener('click', async () => {
    const m = valor(el, 'er_mes');
    if (!/^\d{4}-\d{2}$/.test(m)) { campoMes.focus(); return; }
    await capa.cerrar();
    verEstadoResultados(m);
  });
}

/** Documento generado, con Descargar PDF, Compartir PDF e Imprimir. */
export function verEstadoResultados(mes) {
  const aj = obtenerAjustes();
  const e = estadoDeResultados({ ventas: coleccion('ventas'), gastos: coleccion('gastos'), inventario: coleccion('inventario'), pedidos: coleccion('pedidos') }, mes, aj, hoy());
  const capa = abrirHoja({
    titulo: 'Estado de resultados',
    paso: conMayuscula(nombreMes(mes)),
    cuerpo: html`
      <div id="zonaImpresion" class="visor-doc"><div class="escala-doc">${documentoEstado(e, aj)}</div></div>
      <div class="acciones-doc">${botonTexto('Ver a tamaño real', 'ampliar')}</div>`,
    pie: html`<div class="acciones-er">${acciones([{ texto: 'Imprimir', accion: 'imprimir', icono: 'imprimir' }, { texto: 'Descargar PDF', accion: 'descargar' }, { texto: 'Compartir PDF', accion: 'compartir', tipo: 'primario', icono: 'compartir' }])}</div>`,
  });
  const el = capa.elemento;
  colorDocumento(el, aj.colorFactura);
  conectarVisor(el);
  const nombre = `Estado-de-resultados-${mes}.pdf`;
  el.querySelector('[data-accion="imprimir"]').addEventListener('click', () => window.print());
  el.querySelector('[data-accion="descargar"]').addEventListener('click', (ev) => conPdf(ev.currentTarget, e, aj, async (blob) => {
    descargar(blob, nombre, 'application/pdf');
    notificar('Se descargó el estado de resultados. Revisa la carpeta de Descargas.', { tipo: 'exito' });
  }));
  el.querySelector('[data-accion="compartir"]').addEventListener('click', (ev) => conPdf(ev.currentTarget, e, aj, async (blob) => {
    if (await compartirArchivo(blob, nombre, `Estado de resultados de ${nombreMes(mes)} · ${aj.nombre}`)) return;
    descargar(blob, nombre, 'application/pdf');
    notificar('Este teléfono no permite compartir archivos desde aquí: se descargó el PDF para que lo envíes.', { tipo: 'exito', duracion: 7000 });
  }));
}

/** Arma el PDF fuera de pantalla (una página por hoja) y se lo pasa a `usar`. */
async function conPdf(boton, e, aj, usar) {
  const texto = boton.textContent;
  boton.disabled = true; boton.textContent = 'Preparando PDF…';
  const nodo = document.createElement('div');
  nodo.className = 'documento-pdf';
  try {
    nodo.insertAdjacentHTML('beforeend', documentoEstado(e, aj).texto);
    colorDocumento(nodo, aj.colorFactura);
    document.body.appendChild(nodo);
    const blob = await crearPdf(nodo);
    nodo.remove();
    await usar(blob);
  } catch (err) {
    nodo.remove();
    if (!(err && err.name === 'AbortError')) informarError(new Error('No pude preparar el PDF. ' + ((err && err.message) || 'Intenta de nuevo.')), 'pdf');
  } finally {
    boton.disabled = false; boton.textContent = texto;
  }
}

/** El documento: dos hojas (resultado del mes; comparación e información complementaria). */
export function documentoEstado(e, aj) {
  const logo = imagenSegura(aj.logo);
  const A = e.actual;
  const metaNegocio = [aj.direccion, aj.telefono, aj.email].filter(Boolean);
  const cabecera = html`
    <div class="doc-cabecera">
      ${logo ? html`<img class="doc-logo" src="${logo}" alt="">` : html`<div class="doc-logo-vacio">${iniciales(aj.nombre)}</div>`}
      <div class="doc-negocio"><div class="doc-nombre">${aj.nombre}</div><div class="doc-meta">${metaNegocio.map((x, i) => html`${i ? html`<br>` : ''}${x}`)}</div></div>
    </div>`;
  const periodo = (hoja) => html`<div class="er-periodo-doc"><span>Período: <strong>${conMayuscula(nombreMes(e.mes))}</strong></span><span>Hoja ${hoja} de 2</span></div>`;
  const fila = (etq, val, clase = '') => html`<tr class="${clase}"><td>${etq}</td><td class="num">${val}</td></tr>`;
  const hoja1 = html`
    <article class="documento er">
      ${cabecera}
      <div class="doc-titulo">Estado de Resultados</div>
      ${periodo(1)}
      <div class="er-seccion">Resumen financiero</div>
      <div class="er-cifras">
        <div><span>Ventas</span><b class="num">${dinero(A.ventas)}</b></div>
        <div><span>Utilidad bruta</span><b class="num">${dinero(A.utilidadBruta)}</b></div>
        <div><span>Gastos operativos</span><b class="num">${dinero(A.gastosOperativos)}</b></div>
        <div class="${A.utilidadNeta < 0 ? 'neg' : 'pos'}"><span>Utilidad neta</span><b class="num">${dinero(A.utilidadNeta)}</b></div>
      </div>
      <div class="er-seccion">Ingresos, costos y gastos</div>
      <table class="er-tabla">
        <tbody>
          ${fila('Ventas del período', dinero(A.ventas), 'fuerte')}
          ${fila('(−) Costo de la mercancía vendida', dinero(A.costo))}
          ${fila('= Utilidad bruta', dinero(A.utilidadBruta), 'subtotal')}
          ${fila('(−) Gastos operativos', dinero(A.gastosOperativos))}
        </tbody>
      </table>
      <div class="er-neto ${A.utilidadNeta < 0 ? 'neg' : ''}"><span>Utilidad neta del período</span><b class="num">${dinero(A.utilidadNeta)}</b></div>
      <div class="er-nota-doc">
        <div class="er-seccion">Compras de inventario (información aparte)</div>
        <p>En el mes se compró inventario por <strong>${dinero(A.compras)}</strong>. No es un gasto operativo: esas compras se vuelven costo cuando se venden los productos.</p>
        ${e.impuestoIncluido > 0 ? html`<p>Las ventas incluyen ${dinero(e.impuestoIncluido)} de impuesto cobrado, como en Reportes.</p>` : ''}
      </div>
    </article>`;
  const C = e.comparacion;
  const filaCmp = (etq, k) => html`<tr><td>${etq}</td><td class="num">${dinero(C[k].actual)}</td><td class="num">${dinero(C[k].anterior)}</td><td class="num">${conSigno(C[k].diferencia)}</td><td class="num">${C[k].porcentaje === null ? '—' : pct(C[k].porcentaje)}</td></tr>`;
  const caja = e.caja;
  const hoja2 = html`
    <article class="documento er">
      ${cabecera}
      <div class="doc-titulo er-titulo-2">Estado de Resultados</div>
      ${periodo(2)}
      <div class="er-seccion">Comparación con ${nombreMes(e.mesAnterior)}</div>
      ${e.sinDatosAnterior ? html`<p class="er-aviso">${conMayuscula(nombreMes(e.mesAnterior))} no tiene ventas ni gastos registrados: no hay con qué comparar y no se muestran porcentajes.</p>` : ''}
      <table class="er-tabla er-comparacion">
        <thead><tr><th>Concepto</th><th class="num">${conMayuscula(MESES[Number(e.mes.slice(5, 7)) - 1])}</th><th class="num">${conMayuscula(MESES[Number(e.mesAnterior.slice(5, 7)) - 1])}</th><th class="num">Diferencia</th><th class="num">Variación</th></tr></thead>
        <tbody>
          ${filaCmp('Ventas', 'ventas')}
          ${filaCmp('Costo de lo vendido', 'costo')}
          ${filaCmp('Utilidad bruta', 'utilidadBruta')}
          ${filaCmp('Gastos operativos', 'gastosOperativos')}
          ${filaCmp('Utilidad neta', 'utilidadNeta')}
          ${filaCmp('Compras de inventario', 'compras')}
        </tbody>
      </table>
      <p class="er-pie-tabla">La variación solo se muestra cuando el mes anterior tiene un valor distinto de cero.</p>
      <div class="er-seccion">Información complementaria</div>
      <table class="er-tabla">
        <tbody>
          ${fila('Número de ventas del mes', String(e.numeroVentas))}
          ${fila('Margen bruto', e.margenBruto === null ? '—' : `${e.margenBruto.toLocaleString('es', { maximumFractionDigits: 1 })} %`)}
          ${fila('Margen neto', e.margenNeto === null ? '—' : `${e.margenNeto.toLocaleString('es', { maximumFractionDigits: 1 })} %`)}
          ${fila('Dinero recibido en el mes (efectivo)', dinero(caja.efectivo))}
          ${fila('Dinero recibido en el mes (tarjeta)', dinero(caja.tarjeta))}
          ${fila('De lo recibido, abonos de créditos', dinero(caja.abonosCred))}
          ${fila('Salidas de dinero del mes (gastos y compras)', dinero(caja.gastosTot))}
        </tbody>
      </table>
      ${e.masVendidos.length ? html`<div class="er-seccion">Productos más vendidos del mes</div>
        <table class="er-tabla"><tbody>${e.masVendidos.map(([n, c], i) => fila(`${i + 1}. ${n}`, `${c} unid.`))}</tbody></table>` : ''}
      <p class="er-pie-tabla">Ventas y costos según la fecha de cada venta; el dinero recibido, según la fecha de cada pago (como en Reportes › Caja). Generado con Orisma el ${hoy().split('-').reverse().join('/')}.</p>
    </article>`;
  return html`${hoja1}${hoja2}`;
}
