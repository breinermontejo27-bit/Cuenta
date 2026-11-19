// Panel de poco stock (openPocoStock, L723–747).

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { html } from '../../ui/html.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { acciones } from '../../ui/components/fields.js';
import { fila, lista, alTocarFila, estadoVacio } from '../../ui/components/list.js';
import { seccion } from '../../ui/components/cards.js';
import { pocoStock, umbralStock } from '../../business/inventory-rules.js';
import { abrirFormularioProducto } from './product-form.js';

export function abrirPocoStock() {
  const aj = obtenerAjustes();
  const { bajos, sinAviso } = pocoStock(coleccion('inventario'), aj);
  const capa = abrirHoja({
    titulo: 'Poco stock',
    paso: 'Toca un producto para cambiar su límite o quitarle el aviso',
    cuerpo: html`
      ${bajos.length ? lista(bajos.map((p) => fila({ datos: { id: p.id }, titulo: p.nombre, sub: `Avisa desde ${umbralStock(p, aj)} unid.`, valor: `${p.stock} unid.`, valorClase: 'neg' })))
        : estadoVacio({ icono: 'ok', titulo: 'Todo bien', texto: 'Ningún producto está por debajo de su límite.' })}
      ${sinAviso.length ? seccion('Sin aviso de poco stock', lista(sinAviso.map((p) => fila({ datos: { id: p.id }, titulo: p.nombre, sub: 'No te avisamos de este producto' })))) : ''}`,
    pie: acciones([{ texto: 'Cerrar', accion: 'cerrar-panel' }]),
  });
  capa.elemento.querySelector('[data-accion="cerrar-panel"]').addEventListener('click', capa.cerrar);
  alTocarFila(capa.elemento, 'id', async (id) => { await capa.cerrar(); abrirFormularioProducto(id); });
}
