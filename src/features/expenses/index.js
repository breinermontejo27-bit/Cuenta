// Módulo Gastos: lista con búsqueda (renderGastos, L1576–1598).

import { coleccion } from '../../core/state.js';
import { montar } from '../../ui/html.js';
import { dinero, fecha, etiquetaMedio } from '../../ui/format.js';
import { estadoVacio, fila, lista, alTocarFila } from '../../ui/components/list.js';
import { filtrarGastos } from '../../business/expenses-rules.js';
import { abrirNuevoGasto, abrirEditarGasto } from './expense-form.js';

export default {
  id: 'gastos',
  titulo: 'Gastos',
  icono: 'gastos',
  orden: 50,
  buscador: 'Buscar gasto o categoría',
  subvistas: [],
  usa: ['gastos'],
  accionPrincipal: { texto: 'Nuevo gasto', ejecutar: () => abrirNuevoGasto() },
  dibujar(contenedor, { busqueda }) {
    const todos = coleccion('gastos');
    const items = filtrarGastos(todos, busqueda);
    if (!items.length) {
      montar(contenedor, estadoVacio(todos.length
        ? { icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro término.' }
        : { icono: 'gastos', titulo: 'Aún no tienes gastos registrados', texto: 'Toca "Nuevo gasto" para registrar el primero.' }));
      return;
    }
    montar(contenedor, lista(items.map((g) => fila({
      datos: { id: g.id }, icono: g.tipo === 'compra' ? 'inventario' : 'gastos', titulo: g.descripcion,
      sub: `${g.categoria || 'General'} · ${fecha(g.fecha)}${etiquetaMedio(g.metodo || 'efectivo') ? ' · ' + etiquetaMedio(g.metodo || 'efectivo') : ''}`,
      valor: '-' + dinero(g.monto), valorClase: 'neg',
    }))));
    alTocarFila(contenedor, 'id', abrirEditarGasto);
  },
};
