// Ajustes: menú de secciones (no es pestaña; se abre desde el encabezado o el pie de la barra lateral).
// Menú de secciones con su resumen (openSettings, L3875–3908). Cada sección se abre en una hoja.

import { obtenerAjustes, coleccion } from '../../core/state.js';
import { pedirHoja } from '../../core/navigation.js';
import { dinero } from '../../ui/format.js';
import { totalPorCobrar } from '../../business/payments.js';
import { VERSION_APP } from '../../core/config.js';
import { html, icono, montar } from '../../ui/html.js';
import { abrirRespaldo } from './backup-section.js';
import { abrirNegocio } from './business-section.js';
import { abrirFactura } from './invoice-section.js';
import { abrirProductos, abrirMoneda } from './products-section.js';
import { abrirBloqueo, resumenBloqueo } from './lock-section.js';
import { abrirMigracion, hayMigracion } from './migration-section.js';

let pintarResumenBloqueo = () => {};
const ABRIR = { migracion: abrirMigracion, bloqueo: () => abrirBloqueo(() => pintarResumenBloqueo()), negocio: abrirNegocio, factura: abrirFactura, productos: abrirProductos, moneda: abrirMoneda, respaldo: abrirRespaldo, creditos: () => pedirHoja('creditos:lista', {}) };

function secciones(aj) {
  return [
    { id: 'negocio', icono: 'clientes', titulo: 'Negocio', resumen: (aj.nombre || 'Mi negocio') + (aj.fotoPerfil ? ' · con foto' : '') },
    { id: 'creditos', icono: 'caja', titulo: 'Créditos', resumen: totalPorCobrar(coleccion('ventas')) > 0 ? `Por cobrar ${dinero(totalPorCobrar(coleccion('ventas')))}` : 'Sin deudas pendientes' },
    { id: 'factura', icono: 'facturas', titulo: 'Factura', resumen: aj.facturaTitulo || 'FACTURA' },
    { id: 'productos', icono: 'inventario', titulo: 'Productos', resumen: `Poco stock desde ${aj.stockMinimo} unid.` + (aj.margenDefault ? ` · Ganancia por defecto ${aj.margenDefault}%` : '') },
    { id: 'moneda', icono: 'gastos', titulo: 'Moneda e impuestos', resumen: `${aj.moneda} · Impuesto ${aj.impuesto}%` },
    { id: 'respaldo', icono: 'compartir', titulo: 'Respaldo', resumen: 'Descargar o restaurar tus datos' },
    { id: 'bloqueo', icono: 'candado', titulo: 'Bloqueo con PIN', resumen: '…' },
    { id: 'migracion', icono: 'atras', titulo: 'Versión anterior', resumen: 'Datos traídos de la app "Cuentas"' },
  ];
}

export default {
  id: 'ajustes',
  titulo: 'Ajustes',
  icono: 'ajustes',
  orden: 90,
  pestana: false,
  padre: 'mas',
  buscador: null,
  subvistas: [],
  usa: ['ventas'],
  accionPrincipal: null,
  dibujar(contenedor) {
    const lista = secciones(obtenerAjustes());
    montar(contenedor, html`
      <ul class="lista">
        ${lista.map((s) => html`
          <li><button type="button" class="fila" data-seccion="${s.id}">
            <span class="miniatura">${icono(s.icono, 'sm')}</span>
            <span class="fila-principal"><span class="fila-titulo">${s.titulo}</span><span class="fila-sub" data-resumen="${s.id}">${s.resumen}</span></span>
            ${icono('derecha', 'sm ter')}
          </button></li>`)}
      </ul>
      <p class="pie-version">Orisma ${VERSION_APP}</p>`);
    contenedor.querySelectorAll('[data-seccion]').forEach((b) => b.addEventListener('click', () => ABRIR[b.dataset.seccion]()));
    pintarResumenBloqueo = async () => {
      const texto = await resumenBloqueo();
      const el = contenedor.querySelector('[data-resumen="bloqueo"]');
      if (el) el.textContent = texto;
    };
    pintarResumenBloqueo();
    // "Versión anterior" solo aparece si hay algo que mostrar.
    const filaMigracion = contenedor.querySelector('[data-seccion="migracion"]');
    filaMigracion.closest('li').hidden = true;
    hayMigracion().then((si) => { filaMigracion.closest('li').hidden = !si; });
  },
};
