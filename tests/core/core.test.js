import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEmisor, eventos, EVENTOS } from '../../src/core/events.js';
import { coleccion, reemplazarColecciones, obtenerAjustes, reemplazarAjustes, leerInterfaz, escribirInterfaz } from '../../src/core/state.js';
import { completarAjustes, CONFIG_DEFAULTS, COLECCIONES } from '../../src/core/config.js';
import { hoy, fijarReloj, ahora } from '../../src/core/clock.js';
import { ErrorDeValidacion, ErrorDeNegocio, ErrorDeAlmacenamiento, mensajeParaUsuario, esGrave, registrarError, erroresRegistrados, informarError } from '../../src/core/errors.js';
import { interpretarRuta, ruta } from '../../src/core/navigation.js';

test('eventos: escuchar, emitir y cancelar', () => {
  const e = crearEmisor(); const recibidos = [];
  const cancelar = e.escuchar(EVENTOS.DATOS_CAMBIADOS, (d) => recibidos.push(d));
  e.emitir(EVENTOS.DATOS_CAMBIADOS, { colecciones: ['ventas'] });
  cancelar();
  e.emitir(EVENTOS.DATOS_CAMBIADOS, { colecciones: ['clientes'] });
  assert.deepEqual(recibidos, [{ colecciones: ['ventas'] }]);
});

test('eventos: nombres desconocidos se rechazan', () => {
  const e = crearEmisor();
  assert.throws(() => e.escuchar('otro', () => {}));
  assert.throws(() => e.emitir('otro'));
});

test('eventos: un oyente que falla no impide a los demás', async () => {
  const e = crearEmisor(); let llego = false;
  e.escuchar(EVENTOS.NAVEGACION, () => { throw new Error('falla'); });
  e.escuchar(EVENTOS.NAVEGACION, () => { llego = true; });
  const original = globalThis.setTimeout; let relanzado = null;
  globalThis.setTimeout = (fn) => { try { fn(); } catch (err) { relanzado = err; } };
  try { e.emitir(EVENTOS.NAVEGACION, {}); } finally { globalThis.setTimeout = original; }
  assert.ok(llego);
  assert.equal(relanzado.message, 'falla');
});

test('estado: colecciones vacías al iniciar y reemplazo con aviso', () => {
  for (const c of COLECCIONES) assert.deepEqual(coleccion(c), []);
  const avisos = [];
  const cancelar = eventos.escuchar(EVENTOS.DATOS_CAMBIADOS, (d) => avisos.push(d));
  reemplazarColecciones({ clientes: [{ id: 'c1', nombre: 'Ana' }] });
  cancelar();
  assert.equal(coleccion('clientes')[0].nombre, 'Ana');
  assert.deepEqual(avisos, [{ colecciones: ['clientes'] }]);
  assert.throws(() => coleccion('otra'));
  assert.throws(() => reemplazarColecciones({ ventas: 'no es lista' }));
  assert.throws(() => reemplazarColecciones({ otra: [] }));
});

test('estado: ajustes completos y de solo lectura', () => {
  const a = obtenerAjustes();
  assert.equal(a.nombre, 'Mi negocio'); assert.equal(a.stockMinimo, 3); assert.equal(a.facturaTitulo, 'FACTURA');
  assert.throws(() => { 'use strict'; a.nombre = 'x'; });
  reemplazarAjustes({ nombre: 'Orisma', impuesto: 19 });
  assert.equal(obtenerAjustes().nombre, 'Orisma');
  assert.equal(obtenerAjustes().mostrarFotos, false);
});

test('estado: interfaz guarda y lee valores', () => {
  assert.equal(leerInterfaz('x', 5), 5);
  escribirInterfaz('x', 9);
  assert.equal(leerInterfaz('x', 5), 9);
});

test('completarAjustes() hace lo mismo que la versión original (L465–477)', () => {
  // original: load('cuentas_config', inicial) y luego completar con CONFIG_DEFAULTS solo lo indefinido
  const guardado = { nombre: 'X', moneda: 'COP', impuesto: 0, siguienteFolio: 9, stockMinimo: '', mostrarPie: false };
  const original = { ...guardado };
  Object.keys(CONFIG_DEFAULTS).forEach((k) => { if (original[k] === undefined) original[k] = CONFIG_DEFAULTS[k]; });
  assert.deepEqual(completarAjustes(guardado), original);
  // sin nada guardado: configuración inicial + defaults
  const inicial = { nombre: 'Mi negocio', moneda: '$', impuesto: 0, siguienteFolio: 1, direccion: '', telefono: '', email: '', logo: '' };
  Object.keys(CONFIG_DEFAULTS).forEach((k) => { if (inicial[k] === undefined) inicial[k] = CONFIG_DEFAULTS[k]; });
  assert.deepEqual(completarAjustes(), inicial);
});

test('reloj: hoy() con formato AAAA-MM-DD y fijable', () => {
  fijarReloj(new Date(2026, 0, 5, 23, 59));
  assert.equal(hoy(), '2026-01-05');
  assert.equal(ahora().getMonth(), 0);
  fijarReloj();
  assert.match(hoy(), /^\d{4}-\d{2}-\d{2}$/);
});

test('errores: mensajes y gravedad', () => {
  assert.equal(mensajeParaUsuario(new ErrorDeValidacion('Escribe el nombre.', 'nombre')), 'Escribe el nombre.');
  assert.equal(mensajeParaUsuario(new ErrorDeNegocio('No hay stock.')), 'No hay stock.');
  assert.match(mensajeParaUsuario(new ErrorDeAlmacenamiento('x')), /No se pudo guardar/);
  const quota = new Error('q'); quota.name = 'QuotaExceededError';
  assert.match(mensajeParaUsuario(quota), /No se pudo guardar/);
  assert.match(mensajeParaUsuario(new TypeError('x')), /Algo salió mal/);
  assert.equal(esGrave(new ErrorDeValidacion('x')), false);
  assert.equal(esGrave(new TypeError('x')), true);
});

test('errores: el registro guarda como máximo 50 y se anuncian', () => {
  for (let i = 0; i < 60; i++) registrarError(new Error('e' + i));
  const r = erroresRegistrados();
  assert.equal(r.length, 50);
  assert.equal(r[49].mensaje, 'e59');
  let anunciado = null;
  const cancelar = eventos.escuchar(EVENTOS.ERROR, (d) => { anunciado = d; });
  informarError(new ErrorDeNegocio('Sin stock'));
  cancelar();
  assert.deepEqual([anunciado.mensaje, anunciado.grave], ['Sin stock', false]);
});

test('navegación: interpretar rutas', () => {
  const mapa = new Map([['clientes', { subvistas: [] }], ['ventas', { subvistas: ['ventas', 'pendientes'] }]]);
  assert.deepEqual(interpretarRuta('#/clientes', mapa), { modulo: 'clientes', sub: '' });
  assert.deepEqual(interpretarRuta('#/ventas', mapa), { modulo: 'ventas', sub: 'ventas' });
  assert.deepEqual(interpretarRuta('#/ventas/pendientes', mapa), { modulo: 'ventas', sub: 'pendientes' });
  for (const malo of ['', '#/', '#/otra', '#/ventas/otra', '#/clientes/x']) assert.equal(interpretarRuta(malo, mapa), null, malo);
  assert.equal(ruta('ventas', 'pendientes'), '#/ventas/pendientes');
  assert.equal(ruta('clientes'), '#/clientes');
});
