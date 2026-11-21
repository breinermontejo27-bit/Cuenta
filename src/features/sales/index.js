// Módulo Ventas: subvistas Ventas y Pendientes (pedidos, encargos y apartados) (L1535–1574).

import { informarError } from '../../core/errors.js';
import { dibujarVentas } from './sales-list.js';
import { dibujarPendientes, elegirTipoPendiente } from './pending-list.js';
import { abrirAsistente } from './sale-wizard.js';
import { confirmarAnulacion, abrirDetalleVenta } from './sale-detail.js';
import { abrirDetallePendiente } from './pending-detail.js';
import { abrirDetalleApartado } from './layaway-detail.js';
import { coleccion } from '../../core/state.js';

export default {
  id: 'ventas',
  titulo: 'Ventas',
  icono: 'ventas',
  orden: 10,
  barra: 2,
  grupo: 'Día a día',
  buscador: (sub) => (sub === 'pendientes' ? 'Buscar por cliente' : 'Buscar por cliente o folio'),
  subvistas: [{ id: 'ventas', titulo: 'Ventas' }, { id: 'pendientes', titulo: 'Pendientes' }],
  usa: ['ventas', 'pedidos', 'clientes', 'inventario'],
  hojas: {
    'venta:anular': ({ ventaId }) => confirmarAnulacion(ventaId),
    // Para abrirlas desde Inicio (ajuste visual final).
    'venta:nueva': () => abrirAsistente(),
    'venta:ver': ({ ventaId }) => abrirDetalleVenta(ventaId),
    'pendiente:nuevo': () => elegirTipoPendiente(),
    'pendiente:ver': ({ pendienteId }) => {
      const p = coleccion('pedidos').find((x) => x.id === pendienteId);
      if (p && p.tipo === 'apartado') abrirDetalleApartado(pendienteId); else abrirDetallePendiente(pendienteId);
    },
  },
  encabezado: ({ sub }) => {
    if (sub === 'pendientes') { const n = coleccion('pedidos').filter((p) => p.estado === 'pendiente').length; return { subtitulo: `${n} ${n === 1 ? 'pendiente' : 'pendientes'} por entregar` }; }
    const v = coleccion('ventas'); return { subtitulo: v.length ? `${v.length} ${v.length === 1 ? 'venta registrada' : 'ventas registradas'}` : '' };
  },
  accionPrincipal: {
    texto: (sub) => (sub === 'pendientes' ? 'Nuevo pendiente' : 'Nueva venta'),
    ejecutar: ({ sub }) => { try { (sub === 'pendientes' ? elegirTipoPendiente : abrirAsistente)(); } catch (e) { informarError(e, 'ventas'); } },
  },
  dibujar(contenedor, { sub, busqueda }) {
    if (sub === 'pendientes') dibujarPendientes(contenedor, busqueda);
    else dibujarVentas(contenedor, busqueda);
  },
};
