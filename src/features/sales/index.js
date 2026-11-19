// Módulo Ventas: subvistas Ventas y Pendientes (pedidos, encargos y apartados) (L1535–1574).

import { informarError } from '../../core/errors.js';
import { dibujarVentas } from './sales-list.js';
import { dibujarPendientes, elegirTipoPendiente } from './pending-list.js';
import { abrirAsistente } from './sale-wizard.js';
import { confirmarAnulacion } from './sale-detail.js';

export default {
  id: 'ventas',
  titulo: 'Ventas',
  icono: 'ventas',
  orden: 30,
  buscador: (sub) => (sub === 'pendientes' ? 'Buscar por cliente' : 'Buscar por cliente o folio'),
  subvistas: [{ id: 'ventas', titulo: 'Ventas' }, { id: 'pendientes', titulo: 'Pendientes' }],
  usa: ['ventas', 'pedidos', 'clientes', 'inventario'],
  hojas: { 'venta:anular': ({ ventaId }) => confirmarAnulacion(ventaId) },
  accionPrincipal: {
    texto: (sub) => (sub === 'pendientes' ? 'Nuevo pendiente' : 'Nueva venta'),
    ejecutar: ({ sub }) => { try { (sub === 'pendientes' ? elegirTipoPendiente : abrirAsistente)(); } catch (e) { informarError(e, 'ventas'); } },
  },
  dibujar(contenedor, { sub, busqueda }) {
    if (sub === 'pendientes') dibujarPendientes(contenedor, busqueda);
    else dibujarVentas(contenedor, busqueda);
  },
};
