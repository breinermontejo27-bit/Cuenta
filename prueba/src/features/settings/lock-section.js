// Ajustes › Bloqueo: activar, cambiar o quitar el PIN (Etapa 8, decisión del dueño: PIN opcional con salida).

import { informarError } from '../../core/errors.js';
import { html } from '../../ui/html.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { notificar } from '../../ui/notifications/toast.js';
import { campo, valor, acciones, mostrarError, limpiarErrores } from '../../ui/components/fields.js';
import { nota } from '../../ui/components/cards.js';
import { pinValido, crearHuellaPin, comprobarPin } from '../../services/pin.js';
import { leerBloqueo, guardarBloqueo, quitarBloqueo } from '../../operations/lock.js';

const AVISO = 'El PIN evita que otra persona abra la app por casualidad en tu teléfono. No cifra tus datos: alguien con el teléfono desbloqueado y conocimientos técnicos podría leerlos igual. Se pide al abrir la app y al volver después de 5 minutos.';
const pinCampo = (id, etiqueta) => campo({ id, etiqueta, tipo: 'password', modo: 'numeric', autocompletar: 'new-password', placeholder: '4 a 8 números' });

/** Resumen para el menú de Ajustes. */
export async function resumenBloqueo() {
  try { return (await leerBloqueo()) ? 'PIN activado' : 'Sin PIN'; } catch (_) { return 'Sin PIN'; }
}

/** `alCambiar()` se llama cuando se activa, cambia o quita el PIN (para refrescar el resumen del menú). */
export async function abrirBloqueo(alCambiar = () => {}) {
  let registro;
  try { registro = await leerBloqueo(); } catch (e) { informarError(e, 'bloqueo'); return; }
  const activo = !!registro;
  const capa = abrirHoja({
    titulo: 'Bloqueo con PIN',
    paso: activo ? 'El PIN está activado.' : 'El PIN está desactivado.',
    cuerpo: html`
      ${nota(AVISO)}
      ${activo ? pinCampo('b_actual', 'PIN actual') : ''}
      ${pinCampo('b_nuevo', activo ? 'PIN nuevo' : 'PIN')}
      ${pinCampo('b_repite', 'Repite el PIN')}
      ${activo ? html`<button type="button" class="btn btn-texto peligro" data-accion="quitar">Quitar el PIN</button>` : ''}`,
    pie: acciones([{ texto: 'Volver', accion: 'volver' }, { texto: activo ? 'Cambiar PIN' : 'Activar PIN', accion: 'guardar', tipo: 'primario' }]),
  });
  const el = capa.elemento;
  el.querySelector('[data-accion="volver"]').addEventListener('click', capa.cerrar);

  const actualCorrecto = async () => {
    if (await comprobarPin(valor(el, 'b_actual'), registro)) return true;
    mostrarError(el, 'b_actual', 'El PIN actual no es correcto.');
    return false;
  };

  el.querySelector('[data-accion="guardar"]').addEventListener('click', async (e) => {
    const boton = e.currentTarget;
    limpiarErrores(el);
    const nuevo = valor(el, 'b_nuevo');
    if (!pinValido(nuevo)) { mostrarError(el, 'b_nuevo', 'El PIN debe tener de 4 a 8 números.'); return; }
    if (valor(el, 'b_repite') !== nuevo) { mostrarError(el, 'b_repite', 'Los dos PIN no son iguales.'); return; }
    boton.disabled = true;
    try {
      if (activo && !(await actualCorrecto())) return;
      await guardarBloqueo(await crearHuellaPin(nuevo));
      await capa.cerrar();
      alCambiar();
      notificar(activo ? 'PIN cambiado.' : 'PIN activado. Se pedirá al abrir la app.', { tipo: 'exito' });
    } catch (err) { informarError(err, 'guardar PIN'); } finally { boton.disabled = false; }
  });

  const quitar = el.querySelector('[data-accion="quitar"]');
  if (quitar) quitar.addEventListener('click', async () => {
    limpiarErrores(el);
    try {
      if (!(await actualCorrecto())) return;
      await quitarBloqueo();
      await capa.cerrar();
      alCambiar();
      notificar('PIN quitado. La app ya no lo pedirá.', { tipo: 'exito' });
    } catch (err) { informarError(err, 'quitar PIN'); }
  });
}
