// Asistente de venta: agregar un servicio o producto libre, o una prenda a medida (L2930–3055).
// Se abren encima del asistente y, al terminar, entregan el ítem del carrito.

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { informarError } from '../../core/errors.js';
import { html, montar } from '../../ui/html.js';
import { dinero } from '../../ui/format.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { campo, filaCampos, valor, acciones, botonTexto, mostrarError } from '../../ui/components/fields.js';
import { selectorImagen, conectarSelectorImagen } from '../../ui/components/image-picker.js';
import { lineas } from '../../ui/components/cards.js';
import { prendaAMedida, faltantesPrenda } from '../../business/sales-rules.js';
import { validarMateriales } from '../../business/inventory-rules.js';
import { prepararImagen } from '../../services/images.js';

/** Servicio o producto libre: no descuenta stock. `alAgregar(item)`. */
export function abrirServicioLibre(alAgregar) {
  const aj = obtenerAjustes();
  let foto = '';
  const capa = abrirHoja({
    titulo: 'Servicio o producto libre',
    paso: 'Para algo que no está en tu inventario. No descuenta stock.',
    cuerpo: html`
      ${selectorImagen('svfoto', 'Foto de la pieza (opcional)', '', 'Sin foto')}
      ${campo({ id: 'sv_nombre', etiqueta: 'Nombre', placeholder: 'Ej. Asesoría, mantenimiento, envío' })}
      ${campo({ id: 'sv_car', etiqueta: 'Trabajo a realizar (opcional)', tipo: 'textarea', placeholder: 'Ej. Cambiar cierre y ajustar eslabones' })}
      ${filaCampos(campo({ id: 'sv_precio', etiqueta: `Precio (${aj.moneda})`, tipo: 'number', dinero: true, placeholder: '0' }), campo({ id: 'sv_cant', etiqueta: 'Cantidad', tipo: 'number', valor: 1 }))}
      ${campo({ id: 'sv_costo', etiqueta: `Costo (opcional, ${aj.moneda})`, tipo: 'number', dinero: true, placeholder: '0' })}`,
    pie: acciones([{ texto: 'Volver', accion: 'volver' }, { texto: 'Agregar', accion: 'agregar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  conectarSelectorImagen(el, 'svfoto', 'Sin foto', { procesar: (a) => prepararImagen(a, 300), alCambiar: (d) => { foto = d; }, alFallar: (e) => informarError(e, 'foto') });
  el.querySelector('[data-accion="volver"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="agregar"]').addEventListener('click', async () => {
    const nombre = valor(el, 'sv_nombre').trim();
    const cant = Number(valor(el, 'sv_cant')) || 0;
    const precio = Number(valor(el, 'sv_precio')) || 0;
    if (!nombre) { mostrarError(el, 'sv_nombre', 'Escribe el nombre.'); return; }
    if (cant <= 0) { mostrarError(el, 'sv_cant', 'La cantidad debe ser mayor que 0.'); return; }
    await capa.cerrar();
    alAgregar({ productoId: null, nombre, caracteristicas: valor(el, 'sv_car').trim(), foto, precioCatalogo: precio, precioUnit: precio, costo: Number(valor(el, 'sv_costo')) || 0, cantidad: cant, stockDisponible: '' });
  });
}

/** Prenda a medida con materiales del inventario. `carrito` actual (para validar materiales); `alAgregar(item)`. */
export function abrirPrendaAMedida(carrito, esVenta, alAgregar) {
  const inv = coleccion('inventario');
  let foto = '';
  const mats = [{ productoId: '', cantidad: 1 }];
  const capa = abrirHoja({
    titulo: 'Prenda a medida',
    paso: `${esVenta ? 'Descuenta los materiales del stock.' : 'Los materiales quedan reservados y se descuentan al entregar.'} La prenda no se guarda como producto.`,
    cuerpo: html`
      ${selectorImagen('mafoto', 'Foto de la prenda (opcional)', '', 'Sin foto')}
      ${campo({ id: 'ma_nombre', etiqueta: 'Nombre', placeholder: 'Ej. Manilla roja y negra' })}
      ${campo({ id: 'ma_car', etiqueta: 'Características', tipo: 'textarea', placeholder: 'Ej. Cierre ajustable, talla única' })}
      ${campo({ id: 'ma_cant', etiqueta: 'Cantidad de prendas', tipo: 'number', valor: 1 })}
      <h3 class="seccion-titulo">Materiales que usa por prenda</h3>
      <div data-zona="materiales"></div>
      ${botonTexto('+ Agregar material', 'agregar-material')}
      <div class="totales" data-zona="precio"></div>
      <div class="banner error" data-zona="errores" role="alert" hidden></div>`,
    pie: acciones([{ texto: 'Volver', accion: 'volver' }, { texto: 'Agregar', accion: 'agregar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  const zonaMats = el.querySelector('[data-zona="materiales"]');
  const errores = el.querySelector('[data-zona="errores"]');
  const opciones = [['', 'Elegir…'], ...inv.map((x) => [x.id, `${x.nombre} · ${dinero(x.precio)}`])];
  const pintarPrecio = () => montar(el.querySelector('[data-zona="precio"]'), html`${lineas([['Precio por prenda', dinero(prendaAMedida(mats, inv).precio), 'fuerte']])}<p class="nota">Se calcula sumando el precio de cada material elegido.</p>`);
  const pintar = () => {
    montar(zonaMats, html`${mats.map((m, i) => html`
      ${filaCampos(campo({ id: `mat_${i}`, etiqueta: `Material ${i + 1}`, tipo: 'select', opciones, valor: m.productoId }), campo({ id: `matc_${i}`, etiqueta: 'Cantidad', tipo: 'number', valor: m.cantidad }))}
      <button type="button" class="btn btn-texto peligro" data-quitar="${i}">Quitar este material</button>`)}`);
    pintarPrecio();
  };
  pintar();
  conectarSelectorImagen(el, 'mafoto', 'Sin foto', { procesar: (a) => prepararImagen(a, 300), alCambiar: (d) => { foto = d; }, alFallar: (e) => informarError(e, 'foto') });
  zonaMats.addEventListener('change', (e) => { const m = /^mat_(\d+)$/.exec(e.target.id); if (m) { mats[Number(m[1])].productoId = e.target.value; pintarPrecio(); } });
  zonaMats.addEventListener('input', (e) => { const m = /^matc_(\d+)$/.exec(e.target.id); if (m) { mats[Number(m[1])].cantidad = Number(e.target.value) || 0; pintarPrecio(); } });
  zonaMats.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quitar]');
    if (!b) return;
    mats.splice(Number(b.dataset.quitar), 1);
    if (!mats.length) mats.push({ productoId: '', cantidad: 1 });
    pintar();
  });
  el.querySelector('[data-accion="agregar-material"]').addEventListener('click', () => { mats.push({ productoId: '', cantidad: 1 }); pintar(); });
  el.querySelector('[data-accion="volver"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="agregar"]').addEventListener('click', async () => {
    const nombre = valor(el, 'ma_nombre').trim();
    const cant = Number(valor(el, 'ma_cant')) || 0;
    const mostrar = (texto) => { errores.hidden = false; errores.textContent = texto; errores.scrollIntoView({ block: 'nearest' }); };
    const faltan = faltantesPrenda({ nombre, cantidad: cant, materiales: mats });
    if (faltan.length) { mostrar('Falta: ' + faltan.join(' · ')); return; }
    const pr = prendaAMedida(mats, inv);
    const msg = validarMateriales([{ productoId: null, cantidad: cant, materiales: pr.materiales }, ...carrito], coleccion('pedidos'), inv);
    if (msg) { mostrar(msg); return; }
    await capa.cerrar();
    alAgregar({ productoId: null, nombre, caracteristicas: valor(el, 'ma_car').trim(), foto, materiales: pr.materiales, precioCatalogo: pr.precio, precioUnit: pr.precio, costo: pr.costo, cantidad: cant, stockDisponible: '' });
  });
}
