// Ajustes › Productos (ganancia por defecto, límite de poco stock) y Moneda e impuestos (L4073–4104).

import { obtenerAjustes } from '../../core/state.js';
import { html } from '../../ui/html.js';
import { campo, filaCampos, valor } from '../../ui/components/fields.js';
import { nota } from '../../ui/components/cards.js';
import { abrirSeccion } from './section.js';

export function abrirProductos() {
  const aj = obtenerAjustes();
  abrirSeccion({
    titulo: 'Productos', nota: 'Valores que la app usa al crear y revisar tus productos.',
    campos: html`
      ${filaCampos(campo({ id: 's_margenDefault', etiqueta: 'Ganancia por defecto (%)', tipo: 'number', dinero: true, valor: aj.margenDefault || '', placeholder: 'Ej. 40' }), campo({ id: 's_stockMin', etiqueta: 'Avisar poco stock desde', tipo: 'number', valor: aj.stockMinimo, placeholder: '3' }))}
      ${nota('Al crear un producto nuevo se usará esta ganancia para calcular su precio de venta. Te avisaremos cuando el stock llegue a esta cantidad o menos.')}`,
    leer: (el) => {
      const m = valor(el, 's_margenDefault'), s = valor(el, 's_stockMin');
      return { margenDefault: m === '' ? '' : Number(m), stockMinimo: s === '' ? 3 : Number(s) };
    },
  });
}

export function abrirMoneda() {
  const aj = obtenerAjustes();
  abrirSeccion({
    titulo: 'Moneda e impuestos', nota: 'Se aplican a tus ventas y facturas.',
    campos: filaCampos(campo({ id: 's_moneda', etiqueta: 'Símbolo de moneda', valor: aj.moneda, placeholder: '$' }), campo({ id: 's_impuesto', etiqueta: 'Impuesto (%)', tipo: 'number', dinero: true, valor: aj.impuesto, placeholder: '0' })),
    leer: (el) => ({ moneda: valor(el, 's_moneda').trim() || '$', impuesto: Number(valor(el, 's_impuesto')) || 0 }),
  });
}
