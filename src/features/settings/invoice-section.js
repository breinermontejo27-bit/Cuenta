// Ajustes › Factura: título, pie, color, "Tenga en cuenta", datos visibles, secciones y firma (L3971–4071).

import { obtenerAjustes, urlArchivo } from '../../core/state.js';
import { html } from '../../ui/html.js';
import { campo, interruptor, valor } from '../../ui/components/fields.js';
import { recuadroFirma, conectarFirma } from '../../ui/components/signature-pad.js';
import { abrirSeccion } from './section.js';

export function abrirFactura() {
  const aj = obtenerAjustes();
  let firma = null;
  abrirSeccion({
    titulo: 'Factura', nota: 'Cómo se ve tu factura y qué datos incluye.',
    campos: html`
      ${campo({ id: 'sf_titulo', etiqueta: 'Título del documento', valor: aj.facturaTitulo || '', placeholder: 'FACTURA' })}
      ${interruptor('sf_pieOn', 'Mostrar pie de página', aj.mostrarPie !== false)}
      <div data-zona="pie">${campo({ id: 'sf_pie', etiqueta: 'Pie de página', valor: aj.facturaPie || '', placeholder: 'Ej. Gracias por su compra' })}</div>
      ${campo({ id: 'sf_color', etiqueta: 'Color de la factura', tipo: 'color', valor: aj.colorFactura || '#1E4FA0' })}
      ${interruptor('sf_tenga', 'Mostrar "Tenga en cuenta" en la factura', aj.mostrarTenga !== false)}
      <div data-zona="tenga">${campo({ id: 'sf_tengaTxt', etiqueta: 'Texto en "Tenga en cuenta" (opcional)', tipo: 'textarea', valor: aj.tengaTexto || '', placeholder: 'Ej. Cambios y devoluciones dentro de 8 días con factura' })}</div>
      <h3 class="seccion-titulo">Datos del negocio en el encabezado</h3>
      ${interruptor('sf_dir', 'Mostrar dirección', aj.mostrarDireccion !== false)}
      ${interruptor('sf_tel', 'Mostrar teléfono', aj.mostrarTelefono !== false)}
      ${interruptor('sf_mail', 'Mostrar correo', aj.mostrarEmail !== false)}
      <h3 class="seccion-titulo">Secciones de la factura</h3>
      ${interruptor('sf_pagos', 'Tabla de pagos recibidos', aj.mostrarPagos !== false)}
      ${interruptor('sf_sello', 'Mostrar sello PAGADA', aj.mostrarSello !== false)}
      ${interruptor('sf_fotos', 'Foto de cada producto', aj.mostrarFotos === true)}
      <details class="plegable" data-zona="firma"><summary>Firma para la factura</summary><div class="contenido-plegable">
        ${interruptor('sf_firma', 'Mostrar firma en la factura', aj.mostrarFirma !== false)}
        ${recuadroFirma('sf_lienzo')}
        <button type="button" class="btn btn-secundario" data-accion="borrar-firma">Borrar firma</button>
        <p class="nota">Firma con el dedo o el mouse dentro del recuadro. Aparecerá encima de la línea de firma en la factura.</p>
      </div></details>`,
    alMontar: (el) => {
      const atar = (t, z) => { const s = () => { el.querySelector(`[data-zona="${z}"]`).hidden = !el.querySelector('#' + t).checked; }; el.querySelector('#' + t).addEventListener('change', s); s(); };
      atar('sf_pieOn', 'pie');
      atar('sf_tenga', 'tenga');
      const actual = aj.firmaImg ? (aj.firmaImg.startsWith('archivo:') ? urlArchivo(aj.firmaImg) : aj.firmaImg) : '';
      firma = conectarFirma(el.querySelector('#sf_lienzo'), actual);
      el.querySelector('[data-zona="firma"]').addEventListener('toggle', (e) => { if (e.target.open) firma.preparar(); });
      el.querySelector('[data-accion="borrar-firma"]').addEventListener('click', () => firma.borrar());
    },
    leer: (el) => {
      const cambios = {
        tengaTexto: valor(el, 'sf_tengaTxt').trim(),
        facturaTitulo: valor(el, 'sf_titulo').trim() || 'FACTURA', facturaPie: valor(el, 'sf_pie').trim(), colorFactura: valor(el, 'sf_color') || '#1E4FA0',
        mostrarDireccion: valor(el, 'sf_dir'), mostrarTelefono: valor(el, 'sf_tel'), mostrarEmail: valor(el, 'sf_mail'),
        mostrarTenga: valor(el, 'sf_tenga'), mostrarPagos: valor(el, 'sf_pagos'), mostrarFirma: valor(el, 'sf_firma'),
        mostrarPie: valor(el, 'sf_pieOn'), mostrarSello: valor(el, 'sf_sello'), mostrarFotos: valor(el, 'sf_fotos'),
      };
      const nueva = firma.resultado();
      if (nueva !== null) cambios.firmaImg = nueva;
      return cambios;
    },
  });
}
