// Marco de la app: barra lateral (computador), encabezado, buscador, acción principal, pestañas (teléfono)
// y zona de contenido. Todo sale del registro de módulos (Etapa 2, §3.5); este archivo no conoce ninguno.

import { MODO_PRUEBA } from '../../core/config.js';
import { eventos, EVENTOS } from '../../core/events.js';
import { obtenerAjustes, leerInterfaz, escribirInterfaz } from '../../core/state.js';
import { rutaActual, irA, ruta } from '../../core/navigation.js';
import { informarError } from '../../core/errors.js';
import { html, icono, montar, imagenSegura } from '../html.js';
import { iniciales } from '../format.js';
import { estadoVacio } from '../components/list.js';

let raiz = null;
let modulos = [];
let porId = new Map();

/**
 * Monta el marco.
 * @param {HTMLElement} elemento  contenedor (#app)
 * @param {Array} lista  descripciones de módulos (ver features/<modulo>/index.js)
 */
export function iniciarMarco(elemento, lista) {
  raiz = elemento;
  modulos = lista.slice().sort((a, b) => a.orden - b.orden);
  porId = new Map(modulos.map((m) => [m.id, m]));
  montar(raiz, estructura());
  conectar();
  eventos.escuchar(EVENTOS.NAVEGACION, actualizarTodo);
  eventos.escuchar(EVENTOS.AJUSTES_CAMBIADOS, () => { pintarNegocio(); dibujarModulo(); });
  eventos.escuchar(EVENTOS.DATOS_CAMBIADOS, ({ colecciones }) => {
    const m = porId.get(rutaActual().modulo);
    if (m && (m.usa || []).some((c) => colecciones.includes(c))) dibujarModulo();
  });
}

// Navegación del Estilo 1 (ajuste visual final aprobado):
// - Teléfono: barra de abajo con los módulos que declaran `barra` (Inicio, Ventas, Inventario, Clientes, Más);
//   los demás (Facturas, Gastos, Reportes, Ajustes) se abren desde "Más" y muestran "Volver".
// - Computador: barra lateral agrupada por `grupo` ("Día a día", "Negocio"); Ajustes abajo.
// - Encabezado: título, una línea de contexto (`encabezado()` del módulo) y el engranaje de Ajustes.
function estructura() {
  const enBarra = modulos.filter((m) => m.barra).sort((a, b) => a.barra - b.barra);
  const enLateral = modulos.filter((m) => m.pestana !== false && m.lateral !== false);
  const grupos = [];
  for (const m of enLateral) {
    const g = m.grupo || '';
    if (!grupos.length || grupos[grupos.length - 1].nombre !== g) grupos.push({ nombre: g, modulos: [] });
    grupos[grupos.length - 1].modulos.push(m);
  }
  const enlace = (m, clase) => html`
    <a href="${ruta(m.id)}" class="${clase}" data-modulo="${m.id}">
      ${clase === 'pestana' ? html`<span class="icono-fondo">${icono(m.icono)}</span>` : icono(m.icono)}<span>${m.titulo}</span>
    </a>`;
  return html`
    <aside class="lateral" aria-label="Navegación principal">
      <div class="negocio" data-negocio></div>
      <nav>${grupos.map((g) => html`${g.nombre ? html`<div class="grupo-lateral">${g.nombre}</div>` : ''}${g.modulos.map((m) => enlace(m, 'enlace-lateral'))}`)}</nav>
      <div class="pie"><a href="${ruta('ajustes')}" class="enlace-lateral" data-modulo="ajustes">${icono('ajustes')}<span>Ajustes</span></a></div>
    </aside>
    <div class="principal">
      ${MODO_PRUEBA ? html`<p class="aviso-prueba" role="note"><strong>Copia de prueba.</strong> Lo que hagas aquí no cambia tu app real ni sus datos.</p>` : ''}
      <header class="barra-sup">
        <div class="fila">
          <a href="${ruta('mas')}" class="boton-icono volver" id="botonVolver" aria-label="Volver" hidden>${icono('atras')}</a>
          <div class="negocio" data-negocio></div>
          <div class="titulos"><h1 class="titulo-pantalla" id="tituloPantalla"></h1><p class="subtitulo-pantalla" id="subtituloPantalla" hidden></p></div>
          <button type="button" class="btn btn-primario solo-escritorio" id="accionEscritorio">${icono('mas', 'sm')}<span></span></button>
          <a href="${ruta('ajustes')}" class="boton-icono ajustes" aria-label="Ajustes">${icono('ajustes')}</a>
        </div>
        <label class="buscador" id="buscador">${icono('buscar', 'sm')}<span class="oculto-visual">Buscar</span><input id="campoBuscar" type="search" autocomplete="off"></label>
      </header>
      <main class="contenido" id="contenido" tabindex="-1"></main>
    </div>
    <button type="button" class="accion-principal" id="accionMovil">${icono('mas')}<span></span></button>
    <nav class="pestanas" aria-label="Secciones">${enBarra.map((m) => enlace(m, 'pestana'))}</nav>`;
}

function conectar() {
  const campo = raiz.querySelector('#campoBuscar');
  campo.addEventListener('input', () => {
    escribirInterfaz(claveBusqueda(), campo.value);
    dibujarModulo();
  });
  const accion = () => {
    const m = porId.get(rutaActual().modulo);
    if (!m || !m.accionPrincipal) return;
    try { m.accionPrincipal.ejecutar(contexto()); } catch (e) { informarError(e, `accion:${m.id}`); }
  };
  raiz.querySelector('#accionEscritorio').addEventListener('click', accion);
  raiz.querySelector('#accionMovil').addEventListener('click', accion);
}

const claveBusqueda = () => `busqueda:${rutaActual().modulo}:${rutaActual().sub}`;

function contexto() {
  const { modulo, sub } = rutaActual();
  return { modulo, sub, busqueda: leerInterfaz(claveBusqueda(), ''), irA };
}

function actualizarTodo() {
  const { modulo, sub } = rutaActual();
  const m = porId.get(modulo);
  if (!m) return;
  document.title = `${m.titulo} · Orisma`;
  pintarEncabezado();
  // En la barra de abajo, los módulos que se abren desde "Más" marcan "Más".
  const marcado = (destino) => destino === modulo || (destino === m.padre && !porId.get(modulo).barra);
  raiz.querySelectorAll('[data-modulo]').forEach((a) => {
    const activo = a.classList.contains('pestana') ? marcado(a.dataset.modulo) : a.dataset.modulo === modulo;
    if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  raiz.querySelector('#botonVolver').hidden = !m.padre;
  raiz.classList.toggle('en-inicio', modulo === 'inicio');
  const textoBuscar = typeof m.buscador === 'function' ? m.buscador(sub) : m.buscador;
  const buscador = raiz.querySelector('#buscador');
  buscador.hidden = !textoBuscar;
  const campo = raiz.querySelector('#campoBuscar');
  campo.placeholder = textoBuscar || '';
  campo.value = leerInterfaz(claveBusqueda(), '');
  const a = m.accionPrincipal;
  const visible = !!a && (!a.subvistas || a.subvistas.includes(sub));
  const texto = a ? (typeof a.texto === 'function' ? a.texto(sub) : a.texto) : '';
  for (const id of ['#accionEscritorio', '#accionMovil']) {
    const b = raiz.querySelector(id);
    b.hidden = !visible;
    b.querySelector('span').textContent = texto;
  }
  pintarNegocio();
  dibujarModulo();
}

/** Título y línea de contexto del módulo actual (p. ej. "5 clientes · 3 con deuda"). */
function pintarEncabezado() {
  const m = porId.get(rutaActual().modulo);
  if (!m || !raiz) return;
  let e = { titulo: m.titulo, subtitulo: '' };
  try { if (m.encabezado) e = { ...e, ...m.encabezado(contexto()) }; } catch (err) { informarError(err, `encabezado:${m.id}`); }
  raiz.querySelector('#tituloPantalla').textContent = e.titulo;
  const sub = raiz.querySelector('#subtituloPantalla');
  sub.textContent = e.subtitulo || '';
  sub.hidden = !e.subtitulo;
}

function pintarNegocio() {
  const aj = obtenerAjustes();
  const foto = imagenSegura(aj.fotoPerfil || aj.logo);
  const contenido = html`
    ${foto ? html`<img class="avatar" src="${foto}" alt="">` : html`<div class="avatar" aria-hidden="true">${iniciales(aj.nombre)}</div>`}
    <div class="negocio-nombre">${aj.nombre || 'Mi negocio'}</div>`;
  raiz.querySelectorAll('[data-negocio]').forEach((el) => montar(el, contenido));
}

/** Dibuja el módulo actual (con su selector de subvistas, si tiene). */
export function dibujarModulo() {
  const { modulo, sub } = rutaActual();
  const m = porId.get(modulo);
  const zona = raiz && raiz.querySelector('#contenido');
  if (!m || !zona) return;
  const selector = (m.subvistas || []).length ? html`
    <div class="selector-vista segmentos" role="tablist" aria-label="Vistas de ${m.titulo}">
      ${m.subvistas.map((s) => html`<button type="button" role="tab" data-sub="${s.id}" aria-selected="${s.id === sub}" aria-pressed="${s.id === sub}">${s.titulo}</button>`)}
    </div>` : '';
  try {
    pintarEncabezado();
    montar(zona, html`${selector}<div id="vista"></div>`);
    zona.querySelectorAll('[data-sub]').forEach((b) => b.addEventListener('click', () => irA(modulo, b.dataset.sub)));
    m.dibujar(zona.querySelector('#vista'), contexto());
  } catch (e) {
    informarError(e, `dibujar:${modulo}`);
    montar(zona, estadoVacio({ icono: 'alerta', titulo: 'No se pudo mostrar esta pantalla', texto: 'Tus datos no se modificaron. Prueba de nuevo o cambia de sección.' }));
  }
}
