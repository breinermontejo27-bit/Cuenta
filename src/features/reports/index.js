// Módulo Reportes: Resumen, Caja y Flujo (renderReportes, L1813–1905).

import { dibujarResumen } from './summary-view.js';
import { dibujarCaja } from './cash-view.js';
import { dibujarFlujo } from './flow-view.js';

export default {
  id: 'reportes',
  titulo: 'Reportes',
  icono: 'reportes',
  orden: 60,
  grupo: 'Negocio',
  padre: 'mas',
  encabezado: () => ({ subtitulo: 'Cómo va el negocio' }),
  buscador: null,
  subvistas: [{ id: 'resumen', titulo: 'Resumen' }, { id: 'caja', titulo: 'Caja' }, { id: 'flujo', titulo: 'Flujo' }],
  usa: ['ventas', 'gastos', 'pedidos', 'inventario'],
  accionPrincipal: null,
  dibujar(contenedor, { sub }) {
    if (sub === 'caja') dibujarCaja(contenedor);
    else if (sub === 'flujo') dibujarFlujo(contenedor);
    else dibujarResumen(contenedor);
  },
};
