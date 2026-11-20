// Pantalla de bloqueo con PIN (Etapa 8). Se muestra al abrir la app y al volver tras 5 minutos en segundo plano,
// solo si el dueño activó el PIN en Ajustes › Bloqueo. Tapa toda la app (lo de debajo queda inerte).
// Protege del uso casual: no cifra los datos. Si se olvida el PIN, se puede quitar escribiendo "QUITAR PIN"
// (decisión del dueño, Etapa 8): los datos no se borran.

import { obtenerAjustes } from '../../core/state.js';
import { informarError } from '../../core/errors.js';
import { html, icono, montar } from '../../ui/html.js';
import { campo, valor } from '../../ui/components/fields.js';
import { notificar } from '../../ui/notifications/toast.js';
import { comprobarPin } from '../../services/pin.js';
import { leerBloqueo, leerIntentos, anotarFallo, reiniciarIntentos, quitarBloqueo, BLOQUEAR_TRAS_MS } from '../../operations/lock.js';

export const FRASE_QUITAR = 'QUITAR PIN';
let abierta = null;

const segundos = (ms) => Math.max(1, Math.ceil(ms / 1000));

/** Si el bloqueo está activo, muestra la pantalla y espera a que se entre. Si no, termina enseguida. */
export async function protegerConPin() {
  if (abierta) return abierta;
  let registro;
  try { registro = await leerBloqueo(); } catch (e) { informarError(e, 'leer bloqueo'); return undefined; }
  if (!registro) return undefined;
  abierta = mostrar(registro).finally(() => { abierta = null; });
  return abierta;
}

/** Vuelve a pedir el PIN cuando la app regresa tras más de 5 minutos en segundo plano. */
export function vigilarSegundoPlano(documento = document) {
  let ocultaDesde = 0;
  documento.addEventListener('visibilitychange', () => {
    if (documento.visibilityState === 'hidden') { ocultaDesde = Date.now(); return; }
    if (ocultaDesde && Date.now() - ocultaDesde >= BLOQUEAR_TRAS_MS) protegerConPin();
    ocultaDesde = 0;
  });
}

function mostrar(registro) {
  return new Promise((listo) => {
    const tapados = [...document.body.children];
    for (const el of tapados) el.inert = true;
    const caja = document.createElement('div');
    caja.className = 'bloqueo';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-labelledby', 'bloqueo-titulo');
    document.body.append(caja);
    let reloj = null;

    const terminar = () => {
      clearInterval(reloj);
      caja.remove();
      for (const el of tapados) el.inert = false;
      listo();
    };

    const pintarPin = () => {
      montar(caja, html`<form class="bloqueo-caja" data-zona="pin" novalidate>
        <span class="bloqueo-icono">${icono('candado')}</span>
        <h1 id="bloqueo-titulo" class="bloqueo-titulo">${obtenerAjustes().nombre || 'Mi negocio'}</h1>
        <p class="nota">Escribe tu PIN para entrar.</p>
        ${campo({ id: 'pin_entrar', etiqueta: 'PIN', tipo: 'password', modo: 'numeric', autocompletar: 'off' })}
        <p class="bloqueo-aviso" data-zona="aviso" role="alert" hidden></p>
        <button type="submit" class="btn btn-primario btn-bloque" data-accion="entrar">Entrar</button>
        <button type="button" class="btn btn-texto" data-accion="olvide">Olvidé mi PIN</button>
      </form>`);
      const form = caja.querySelector('form');
      const entrada = caja.querySelector('#pin_entrar');
      const aviso = caja.querySelector('[data-zona="aviso"]');
      const boton = caja.querySelector('[data-accion="entrar"]');
      const avisar = (t) => { aviso.hidden = !t; aviso.textContent = t; };
      const esperar = (hasta) => {
        clearInterval(reloj);
        const tick = () => {
          const falta = hasta - Date.now();
          if (falta <= 0) { clearInterval(reloj); boton.disabled = false; avisar(''); return; }
          boton.disabled = true;
          avisar(`Demasiados intentos. Espera ${segundos(falta)} s para volver a intentar.`);
        };
        tick();
        reloj = setInterval(tick, 1000);
      };
      leerIntentos().then((i) => { if (i.hasta > Date.now()) esperar(i.hasta); }).catch(() => {});
      caja.querySelector('[data-accion="olvide"]').addEventListener('click', pintarOlvido);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (boton.disabled) return;
        boton.disabled = true;
        try {
          const intentos = await leerIntentos();
          if (intentos.hasta > Date.now()) { esperar(intentos.hasta); return; }
          if (await comprobarPin(entrada.value, registro)) { await reiniciarIntentos(); terminar(); return; }
          const nuevo = await anotarFallo();
          entrada.value = '';
          entrada.focus();
          if (nuevo.hasta > Date.now()) esperar(nuevo.hasta);
          else { boton.disabled = false; avisar('PIN incorrecto.'); }
        } catch (e) { boton.disabled = false; informarError(e, 'desbloquear'); }
      });
      entrada.focus();
    };

    const pintarOlvido = () => {
      clearInterval(reloj);
      montar(caja, html`<form class="bloqueo-caja" data-zona="olvido" novalidate>
        <span class="bloqueo-icono">${icono('candado')}</span>
        <h1 id="bloqueo-titulo" class="bloqueo-titulo">¿Olvidaste tu PIN?</h1>
        <p class="nota">Puedes quitar el PIN. <strong>Tus datos no se borran</strong>: solo se desactiva el bloqueo y luego puedes crear uno nuevo en Ajustes › Bloqueo.</p>
        ${campo({ id: 'pin_frase', etiqueta: `Para confirmar, escribe ${FRASE_QUITAR}`, autocompletar: 'off' })}
        <p class="bloqueo-aviso" data-zona="aviso" role="alert" hidden></p>
        <button type="submit" class="btn btn-peligro btn-bloque" data-accion="quitar">Quitar el PIN</button>
        <button type="button" class="btn btn-texto" data-accion="volver">Volver</button>
      </form>`);
      caja.querySelector('[data-accion="volver"]').addEventListener('click', pintarPin);
      caja.querySelector('form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const aviso = caja.querySelector('[data-zona="aviso"]');
        if (valor(caja, 'pin_frase').trim().toUpperCase() !== FRASE_QUITAR) {
          aviso.hidden = false; aviso.textContent = `Escribe exactamente ${FRASE_QUITAR}.`; return;
        }
        try {
          await quitarBloqueo();
          terminar();
          notificar('Se quitó el PIN. Puedes crear uno nuevo en Ajustes › Bloqueo.', { tipo: 'exito', duracion: 8000 });
        } catch (e) { informarError(e, 'quitar PIN'); }
      });
      caja.querySelector('#pin_frase').focus();
    };

    pintarPin();
  });
}
