// Módulo Clientes: lista con deuda por cliente (L624–643).

import { coleccion } from '../../core/state.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { estadoVacio, fila, lista, insignia, alTocarFila, paginar, botonMostrarMas, conectarMostrarMas } from '../../ui/components/list.js';
import { filtrarClientes } from '../../business/clients-rules.js';
import { deudasPorCliente } from '../../business/payments.js';
import { abrirFormularioCliente } from './client-form.js';

export default {
  id: 'clientes',
  titulo: 'Clientes',
  icono: 'clientes',
  orden: 10,
  buscador: 'Buscar cliente',
  subvistas: [],
  usa: ['clientes', 'ventas'],
  accionPrincipal: { texto: 'Nuevo cliente', ejecutar: () => abrirFormularioCliente(null) },
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
    const pag = paginar(items, `clientes|${busqueda || ''}`);
    montar(contenedor, html`${lista(pag.visibles.map((c) => {
      const deuda = deudas.get(c.id) || 0;
      return fila({ datos: { id: c.id }, iniciales: c.nombre, titulo: c.nombre, sub: c.telefono || c.email || 'Sin datos de contacto', insignias: deuda > 0 ? [insignia('deuda', 'Debe ' + dinero(deuda))] : [] });
    }))}${botonMostrarMas(pag)}`);
    alTocarFila(contenedor, 'id', abrirFormularioCliente);
    conectarMostrarMas(contenedor, () => this.dibujar(contenedor, { busqueda }));
  },
};
