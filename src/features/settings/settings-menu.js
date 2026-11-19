// Ajustes: menú de secciones (no es pestaña; se abre desde el encabezado o el pie de la barra lateral).
// Etapa 4: el menú y sus resúmenes funcionan. Etapa 5: Respaldo funciona. Las demás secciones, en la Etapa 7.

import { obtenerAjustes } from '../../core/state.js';
import { VERSION_APP } from '../../core/config.js';
import { html, icono, montar } from '../../ui/html.js';
import { estadoVacio } from '../../ui/components/list.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { abrirRespaldo } from './backup-section.js';

function secciones(aj) {
  return [
    { id: 'negocio', icono: 'clientes', titulo: 'Negocio', resumen: (aj.nombre || 'Mi negocio') + (aj.fotoPerfil ? ' · con foto' : '') },
    { id: 'creditos', icono: 'caja', titulo: 'Créditos', resumen: 'Clientes que te deben' },
    { id: 'factura', icono: 'facturas', titulo: 'Factura', resumen: aj.facturaTitulo || 'FACTURA' },
    { id: 'productos', icono: 'inventario', titulo: 'Productos', resumen: `Poco stock desde ${aj.stockMinimo} unid.` + (aj.margenDefault ? ` · Ganancia por defecto ${aj.margenDefault}%` : '') },
    { id: 'moneda', icono: 'gastos', titulo: 'Moneda e impuestos', resumen: `${aj.moneda} · Impuesto ${aj.impuesto}%` },
    { id: 'respaldo', icono: 'compartir', titulo: 'Respaldo', resumen: 'Descargar o restaurar tus datos' },
  ];
}

export default {
  id: 'ajustes',
  titulo: 'Ajustes',
  icono: 'ajustes',
  orden: 90,
  pestana: false,
  buscador: null,
  subvistas: [],
  usa: [],
  accionPrincipal: null,
  dibujar(contenedor) {
    const lista = secciones(obtenerAjustes());
    montar(contenedor, html`
      <ul class="lista">
        ${lista.map((s) => html`
          <li><button type="button" class="fila" data-seccion="${s.id}">
            <span class="miniatura">${icono(s.icono, 'sm')}</span>
            <span class="fila-principal"><span class="fila-titulo">${s.titulo}</span><span class="fila-sub">${s.resumen}</span></span>
            ${icono('derecha', 'sm ter')}
          </button></li>`)}
      </ul>
      <p class="pie-version">Orisma ${VERSION_APP}</p>`);
    contenedor.querySelectorAll('[data-seccion]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.seccion === 'respaldo') { abrirRespaldo(); return; }
      const s = lista.find((x) => x.id === b.dataset.seccion);
      const capa = abrirHoja({
        titulo: s.titulo,
        cuerpo: estadoVacio({ icono: s.icono, titulo: 'Sección en construcción', texto: 'Esta sección de ajustes se construye en la Etapa 7.' }),
        pie: html`<div class="acciones"><button type="button" class="btn btn-secundario" data-accion="volver">Volver</button></div>`,
        alAtras: () => capa.cerrar(),
      });
      capa.elemento.querySelector('[data-accion="volver"]').addEventListener('click', capa.cerrar);
    }));
  },
};
