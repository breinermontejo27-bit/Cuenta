// Ajustes › Respaldo: resumen de lo guardado, descargar respaldo y restaurar desde un archivo.

import { prepararRespaldo, analizarRespaldo, restaurarRespaldo, resumenDatos } from '../../operations/backup.js';
import { descargar } from '../../services/export.js';
import { informarError, erroresRegistrados } from '../../core/errors.js';
import { VERSION_APP } from '../../core/config.js';
import { html, montar } from '../../ui/html.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { confirmar } from '../../ui/overlays/dialog.js';
import { notificar } from '../../ui/notifications/toast.js';

const NOMBRES = { clientes: 'Clientes', inventario: 'Productos', ventas: 'Ventas', gastos: 'Gastos', pedidos: 'Pendientes', movimientos: 'Movimientos de inventario' };
const MOTIVOS = { legado: 'Copia original de Cuentas (antes de importar)', 'antes de restaurar': 'Antes de restaurar un respaldo' };
const megas = (b) => (b / 1048576).toLocaleString('es', { maximumFractionDigits: 1 }) + ' MB';
const fechaHora = (iso) => new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function lineasConteo(conteos) {
  return html`<dl class="lineas">${Object.entries(NOMBRES).map(([c, n]) => html`<div class="linea"><dt>${n}</dt><dd>${conteos[c] ?? 0}</dd></div>`)}</dl>`;
}

/** Abre la sección de respaldo. */
export async function abrirRespaldo() {
  let r;
  try { r = await resumenDatos(); } catch (e) { informarError(e, 'respaldo'); return; }
  const capa = abrirHoja({
    titulo: 'Respaldo',
    cuerpo: html`
      <p class="nota">Tus datos se guardan en este dispositivo. Descarga un respaldo de vez en cuando para no perder nada si cambias de teléfono o borras el navegador.</p>
      <section class="seccion"><h3 class="seccion-titulo">Datos guardados</h3>
        <div class="tarjeta">${lineasConteo(r.conteos)}</div>
        ${r.espacio ? html`<p class="nota">Espacio usado: ${megas(r.espacio.usado)}.</p>` : ''}
        ${r.migracion ? html`<p class="nota">Datos traídos de la versión anterior el ${fechaHora(r.migracion.fecha)}. Los originales siguen intactos en este navegador.</p>` : ''}
      </section>
      <button type="button" class="btn btn-primario btn-bloque" data-accion="descargar">Descargar respaldo</button>
      <section class="seccion"><h3 class="seccion-titulo">Restaurar desde un respaldo</h3>
        <p class="nota">Tus datos actuales se reemplazan por los del archivo. Antes se guarda una copia automática de lo que tienes.</p>
        <label class="campo"><span class="etiqueta-campo">Archivo de respaldo (.json)</span><input type="file" class="control" accept="application/json,.json" data-accion="archivo"></label>
        <div data-zona="analisis"></div>
      </section>
      ${r.respaldos.length ? html`<section class="seccion"><h3 class="seccion-titulo">Copias automáticas</h3>
        <div class="tarjeta"><dl class="lineas">${r.respaldos.slice().reverse().map((b) => html`<div class="linea"><dt>${MOTIVOS[b.motivo] || b.motivo}</dt><dd>${fechaHora(b.fecha)}</dd></div>`)}</dl></div></section>` : ''}
      ${erroresRegistrados().length ? html`<section class="seccion"><h3 class="seccion-titulo">Diagnóstico</h3>
        <p class="nota">La app anotó ${erroresRegistrados().length} ${erroresRegistrados().length === 1 ? 'error' : 'errores'} en este dispositivo. Si algo falla, descarga el registro y compártelo con quien te ayude con la app. No se envía solo a ningún lado.</p>
        <button type="button" class="btn btn-secundario btn-bloque" data-accion="diagnostico">Descargar registro de errores</button></section>` : ''}`,
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="descargar"]').addEventListener('click', async () => {
    try {
      const { texto, nombre } = await prepararRespaldo();
      descargar(texto, nombre, 'application/json');
      notificar('Respaldo descargado. Revisa la carpeta de Descargas.', { tipo: 'exito' });
    } catch (e) { informarError(e, 'descargar respaldo'); }
  });
  const diag = el.querySelector('[data-accion="diagnostico"]');
  if (diag) diag.addEventListener('click', () => {
    const texto = [`Orisma ${VERSION_APP} · ${navigator.userAgent}`, ...erroresRegistrados().map((e) => `${e.fecha} · ${e.tipo} · ${e.contexto} · ${e.mensaje}`)].join('\n');
    descargar(texto, 'orisma-registro-de-errores.txt', 'text/plain');
  });
  el.querySelector('[data-accion="archivo"]').addEventListener('change', async (ev) => {
    const archivo = ev.target.files && ev.target.files[0];
    const zona = el.querySelector('[data-zona="analisis"]');
    if (!archivo) return;
    const analisis = analizarRespaldo(await archivo.text());
    if (!analisis.ok) {
      montar(zona, html`<div class="banner error" role="alert"><div><strong>No se puede restaurar este archivo.</strong>
        <ul class="lista-problemas">${analisis.errores.slice(0, 8).map((e) => html`<li>${e}</li>`)}</ul>
        ${analisis.errores.length > 8 ? html`<span>… y ${analisis.errores.length - 8} problemas más.</span>` : ''}</div></div>`);
      return;
    }
    montar(zona, html`<div class="tarjeta"><p class="nota">${analisis.formato}${analisis.fecha ? html` · ${analisis.fecha}` : ''}</p>${lineasConteo(analisis.conteos)}</div>
      <button type="button" class="btn btn-peligro btn-bloque" data-accion="restaurar">Reemplazar mis datos con este respaldo</button>`);
    zona.querySelector('[data-accion="restaurar"]').addEventListener('click', async () => {
      const si = await confirmar({ titulo: '¿Reemplazar tus datos?', mensaje: `Se reemplazarán tus datos actuales por los del respaldo (${analisis.conteos.clientes} clientes, ${analisis.conteos.inventario} productos, ${analisis.conteos.ventas} ventas, ${analisis.conteos.gastos} gastos). Antes se guardará una copia automática.`, aceptar: 'Sí, reemplazar', peligro: true });
      if (!si) return;
      try {
        await restaurarRespaldo(analisis);
        capa.cerrar();
        notificar('Datos restaurados.', { tipo: 'exito' });
      } catch (e) { informarError(e, 'restaurar respaldo'); }
    });
  });
}
