// Módulo Clientes: lista con deuda por cliente (L624–643).

import { coleccion } from '../../core/state.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { estadoVacio, fila, lista, insignia, alTocarFila, paginar, botonMostrarMas, conectarMostrarMas } from '../../ui/components/list.js';
import { filtrarClientes } from '../../business/clients-rules.js';
import { deudasPorCliente, totalPorCobrar } from '../../business/payments.js';
import { pedirHoja } from '../../core/navigation.js';
import { abrirFormularioCliente } from './client-form.js';

export default {
  id: 'clientes',
  titulo: 'Clientes',
  icono: 'clientes',
  orden: 30,
  barra: 4,
  grupo: 'Día a día',
  buscador: 'Buscar cliente',
  subvistas: [],
  usa: ['clientes', 'ventas'],
  accionPrincipal: { texto: 'Nuevo cliente', ejecutar: () => abrirFormularioCliente(null) },
  encabezado: () => {
    const n = coleccion('clientes').length;
    const deben = [...deudasPorCliente(coleccion('ventas')).entries()].filter(([id, d]) => d > 0 && coleccion('clientes').some((c) => c.id === id)).length;
    return { subtitulo: n ? `${n} ${n === 1 ? 'cliente' : 'clientes'}${deben ? ` · ${deben} con deuda` : ''}` : '' };
  },
  dibujar(contenedor, { busqueda }) {
    const todos = coleccion('clientes');
    const ventas = coleccion('ventas');
    const items = filtrarClientes(todos, busqueda);
    if (!items.length) {
      montar(contenedor, estadoVacio(todos.length
        ? { icono: 'buscar', titulo: 'Sin resultados', texto: 'Prueba con otro nombre.' }
        : { icono: 'clientes', titulo: 'Aún no tienes clientes', texto: 'Toca "Nuevo cliente" para registrar el primero.' }));
      return;
    }
    const deudas = deudasPorCliente(ventas);
    const porCobrar = totalPorCobrar(ventas);
    const resumen = !busqueda && porCobrar > 0 ? html`<div class="tarjeta resumen-lista"><div><div class="etq">Total por cobrar</div><div class="val neg">${dinero(porCobrar)}</div></div><button type="button" class="btn btn-secundario" data-accion="creditos">Ver créditos</button></div>` : '';
    const pag = paginar(items, `clientes|${busqueda || ''}`);
    montar(contenedor, html`${resumen}${lista(pag.visibles.map((c) => {
      const deuda = deudas.get(c.id) || 0;
      return fila({ datos: { id: c.id }, iniciales: c.nombre, titulo: c.nombre, sub: c.telefono || c.email || 'Sin datos de contacto', valor: deuda > 0 ? dinero(deuda) : '', valorClase: 'neg', insignias: deuda > 0 ? [insignia('deuda', 'Debe')] : [] });
    }))}${botonMostrarMas(pag)}`);
    alTocarFila(contenedor, 'id', abrirFormularioCliente);
    const cred = contenedor.querySelector('[data-accion="creditos"]');
    if (cred) cred.addEventListener('click', () => pedirHoja('creditos:lista', {}));
    conectarMostrarMas(contenedor, () => this.dibujar(contenedor, { busqueda }));
  },
};
