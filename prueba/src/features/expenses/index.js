// Módulo Gastos: lista con búsqueda (renderGastos, L1576–1598).

import { coleccion } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { html, montar } from '../../ui/html.js';
import { dinero, fecha, etiquetaMedio } from '../../ui/format.js';
import { estadoVacio, fila, lista, alTocarFila, paginar, botonMostrarMas, conectarMostrarMas, etiquetaGrupo } from '../../ui/components/list.js';
import { resumenCaja, rangoMes } from '../../business/accounting.js';
import { mesDe } from '../../business/dates.js';
import { filtrarGastos } from '../../business/expenses-rules.js';
import { abrirNuevoGasto, abrirEditarGasto } from './expense-form.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nombreMes = (m) => (m ? `${MESES[Number(m.slice(5, 7)) - 1] || ''} ${m.slice(0, 4)}`.replace(/^./, (c) => c.toUpperCase()) : 'Sin fecha');

export default {
  id: 'gastos',
  titulo: 'Gastos',
  icono: 'gastos',
  orden: 50,
  grupo: 'Negocio',
  padre: 'mas',
  buscador: 'Buscar gasto o categoría',
  subvistas: [],
  usa: ['gastos'],
  accionPrincipal: { texto: 'Nuevo gasto', ejecutar: () => abrirNuevoGasto() },
  hojas: { 'gasto:nuevo': () => abrirNuevoGasto() },
  encabezado: () => ({ subtitulo: nombreMes(mesDe(hoy())) }),
  dibujar(contenedor, { busqueda }) {
    const todos = coleccion('gastos');
    const items = filtrarGastos(todos, busqueda);
    if (!items.length) {
      montar(contenedor, estadoVacio(todos.length
        ? { icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro término.' }
        : { icono: 'gastos', titulo: 'Aún no tienes gastos registrados', texto: 'Toca "Nuevo gasto" para registrar el primero.' }));
      return;
    }
    const pag = paginar(items, `gastos|${busqueda || ''}`);
    // Resumen del mes con las mismas cifras de Reportes › Caja (gastos totales, compras y otros gastos).
    const mes = mesDe(hoy());
    const C = resumenCaja({ ventas: coleccion('ventas'), pedidos: coleccion('pedidos'), gastos: todos }, rangoMes(mes), hoy());
    const resumen = busqueda ? '' : html`<div class="tarjeta resumen-lista"><div><div class="etq">Gastado este mes</div><div class="val">${dinero(C.gastosTot)}</div><div class="det">Compras de inventario ${dinero(C.compras)} · Otros gastos ${dinero(C.otros)}</div></div></div>`;
    const grupos = [];
    for (const g of pag.visibles) {
      const m = mesDe(g.fecha);
      if (!grupos.length || grupos[grupos.length - 1].mes !== m) grupos.push({ mes: m, gastos: [] });
      grupos[grupos.length - 1].gastos.push(g);
    }
    montar(contenedor, html`${resumen}${grupos.map((gr) => html`${etiquetaGrupo(nombreMes(gr.mes), `${gr.gastos.length} · ${dinero(gr.gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0))}`)}${lista(gr.gastos.map((g) => fila({
      datos: { id: g.id }, icono: g.tipo === 'compra' ? 'inventario' : 'gastos', titulo: g.descripcion,
      sub: `${g.categoria || 'General'} · ${fecha(g.fecha)}${etiquetaMedio(g.metodo || 'efectivo') ? ' · ' + etiquetaMedio(g.metodo || 'efectivo') : ''}`,
      valor: '-' + dinero(g.monto), valorClase: 'neg',
    })))}`)}${botonMostrarMas(pag)}`);
    alTocarFila(contenedor, 'id', abrirEditarGasto);
    conectarMostrarMas(contenedor, () => this.dibujar(contenedor, { busqueda }));
  },
};
