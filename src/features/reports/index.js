// Módulo Reportes: descripción para el registro de módulos (Etapa 2, §3.5).
// Etapa 4: solo registra la pestaña y las subvistas (Reportes no tiene acción principal). La pantalla real se construye en la Etapa 7.

import { montar } from '../../ui/html.js';
import { estadoVacio } from '../../ui/components/list.js';

export default {
  id: 'reportes',
  titulo: 'Reportes',
  icono: 'reportes',
  orden: 60,
  buscador: null,
  subvistas: [{ id: 'resumen', titulo: 'Resumen' }, { id: 'caja', titulo: 'Caja' }, { id: 'flujo', titulo: 'Flujo' }],
  usa: ['ventas', 'gastos', 'pedidos', 'inventario'],
  accionPrincipal: null,
  dibujar(contenedor) {
    montar(contenedor, estadoVacio({
      icono: 'reportes',
      titulo: 'Se reconstruye en la Etapa 7',
      texto: 'Ganancia, caja diaria y mensual, y flujo de dinero.',
    }));
  },
};
