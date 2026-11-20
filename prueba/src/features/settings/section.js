// Hoja común de una sección de ajustes: título, nota, campos, Volver/Guardar.

import { html } from '../../ui/html.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { acciones } from '../../ui/components/fields.js';
import { operar } from '../../ui/operar.js';
import { guardarAjustes } from '../../operations/settings.js';

/** `leer(el)` devuelve los cambios a guardar. `alMontar(el)` conecta lo propio de la sección. */
export function abrirSeccion({ titulo, nota, campos, leer, alMontar }) {
  const capa = abrirHoja({ titulo, paso: nota, cuerpo: html`${campos}`, pie: acciones([{ texto: 'Volver', accion: 'volver' }, { texto: 'Guardar', accion: 'guardar', tipo: 'primario' }]) });
  const el = capa.elemento;
  if (alMontar) alMontar(el);
  el.querySelector('[data-accion="volver"]').addEventListener('click', capa.cerrar);
  el.querySelector('[data-accion="guardar"]').addEventListener('click', async (e) => {
    const r = await operar(el, e.currentTarget, () => guardarAjustes(leer(el)));
    if (r.ok) { await capa.cerrar(); notificar('Ajustes guardados.', { tipo: 'exito' }); }
  });
  return capa;
}
