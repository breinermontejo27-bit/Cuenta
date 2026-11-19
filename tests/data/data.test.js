// Capa de datos: partes que no necesitan IndexedDB (las que sí, en tests/e2e/datos.e2e.cjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarDatos, revisarRegistro, esImagen } from '../../src/data/schema.js';
import { extraerImagenes, inflarImagenes, decodificarDataUrl, codificarDataUrl, registroDeArchivo, dataUrlDeArchivo, idDeImagen } from '../../src/data/files.js';
import { planDeCambios } from '../../src/data/database.js';
import { analizar } from '../../src/data/backup.js';
import { leerLegado, detectarOrigen, hayDatosLegado, CLAVES } from '../../src/data/legacy-import.js';

const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const datosBase = () => ({
  colecciones: {
    clientes: [{ id: 'c1', nombre: 'Ana', telefono: '300', email: '', direccion: '' }],
    inventario: [{ id: 'p1', nombre: 'Camisa', precio: 100, costo: 60, stock: 10, categoria: '', foto: JPG }],
    ventas: [{ id: 'v1', clienteId: 'c1', clienteNombre: 'Ana', fecha: '2026-11-19', items: [{ productoId: null, nombre: 'Arreglo', precio: 20, cantidad: 1, foto: PNG }, { productoId: 'p1', nombre: 'Camisa', precio: 100, cantidad: 1, foto: PNG }], total: 120, fiado: false, abonos: [{ id: 'a1', fecha: '2026-11-19', monto: 120, metodo: 'efectivo', nota: '' }] }],
    gastos: [], movimientos: [], pedidos: [],
  },
  ajustes: { nombre: 'X', moneda: '$', impuesto: 0, siguienteFolio: 1, logo: JPG },
});

test('esquema: datos correctos no tienen errores', () => {
  const r = revisarDatos(datosBase(), 'estricto');
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.conteos, { clientes: 1, inventario: 1, ventas: 1, gastos: 0, movimientos: 0, pedidos: 0 });
});

test('esquema: ids repetidos o ausentes son errores en cualquier modo', () => {
  const d = datosBase(); d.colecciones.clientes.push({ id: 'c1', nombre: 'Otra' }, { nombre: 'Sin id' });
  for (const modo of ['legado', 'estricto']) {
    const r = revisarDatos(d, modo);
    assert.ok(r.errores.some((e) => e.includes('repetido')), modo);
    assert.ok(r.errores.some((e) => e.includes('sin identificador')), modo);
  }
});

test('esquema: un tipo raro es advertencia en datos propios y error en un respaldo externo', () => {
  const d = datosBase(); d.colecciones.inventario[0].precio = { malo: 1 };
  assert.equal(revisarDatos(d, 'legado').errores.length, 0);
  assert.ok(revisarDatos(d, 'legado').advertencias.some((a) => a.includes('precio')));
  assert.ok(revisarDatos(d, 'estricto').errores.some((a) => a.includes('precio')));
});

test('esquema: imágenes que no son imágenes se rechazan (D4-11)', () => {
  for (const malo of ['x" onerror="alert(1)', 'javascript:alert(1)', 'data:text/html;base64,PGI+', 'https://a.com/x.png']) {
    assert.equal(esImagen(malo), false, malo);
    const d = datosBase(); d.ajustes.logo = malo;
    assert.ok(revisarDatos(d, 'estricto').errores.some((e) => e.includes('logo')), malo);
  }
  assert.ok(esImagen(JPG) && esImagen('archivo:img-' + 'a'.repeat(32)));
});

test('esquema: acepta las formas de la versión original (stock vacío, folio null, metodo null, precio en texto)', () => {
  assert.deepEqual(revisarRegistro('inventario', { id: 'p', nombre: 'x', stock: '', stockMinimo: '', precio: '1500' }), []);
  assert.deepEqual(revisarRegistro('ventas', { id: 'v', clienteNombre: 'a', fecha: '2026-01-01', items: [], folio: null, abonos: [{ id: 'a', fecha: '2026-01-01', monto: 1, metodo: null }] }), []);
});

test('esquema: referencias a clientes borrados son solo advertencias (pasa en la versión original)', () => {
  const d = datosBase(); d.colecciones.clientes = [];
  const r = revisarDatos(d, 'estricto');
  assert.equal(r.errores.length, 0);
  assert.ok(r.advertencias.some((a) => a.includes('ya no existe')));
});

test('imágenes: data URL → bytes → data URL exacto', () => {
  for (const u of [JPG, PNG]) { const { tipo, bytes } = decodificarDataUrl(u); assert.equal(codificarDataUrl(tipo, bytes), u); }
  assert.throws(() => decodificarDataUrl('data:text/plain;base64,aGk='));
});

test('imágenes: se extraen, se deduplican y se reconstruyen idénticas', async () => {
  const v = datosBase().colecciones.ventas[0];
  const { registro, archivos } = await extraerImagenes('ventas', v);
  assert.equal(archivos.size, 1, 'la misma foto en dos ítems se guarda una vez');
  assert.match(registro.items[0].foto, /^archivo:img-[0-9a-f]{32}$/);
  assert.equal(registro.items[0].foto, registro.items[1].foto);
  assert.equal(v.items[0].foto, PNG, 'no modifica el original');
  const vuelta = inflarImagenes('ventas', registro, (id) => archivos.get(id));
  assert.deepEqual(vuelta, v);
  assert.equal(await idDeImagen(PNG), registro.items[0].foto.slice(8));
});

test('imágenes: el registro binario devuelve exactamente la misma imagen', async () => {
  const reg = registroDeArchivo('img-1', JPG);
  assert.ok(reg.datos instanceof Blob);
  assert.equal(await dataUrlDeArchivo(reg), JPG);
  const raro = 'data:image/png;base64,iVBORw0KGgo'; // sin relleno "=": no se puede reproducir igual → se guarda como texto
  assert.equal(registroDeArchivo('img-2', raro).texto, raro);
});

test('plan de cambios: solo escribe lo que cambió y conserva posiciones', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
  const pos = new Map([['a', 0], ['b', 1], ['c', 2]]);
  const b2 = { id: 'b', x: 1 }, d = { id: 'd' };
  const plan = planDeCambios([a, b, c], pos, [a, b2, c, d]);
  assert.deepEqual(plan.poner.map((f) => [f.k, f.n]), [['b', 1], ['d', 3]]);
  assert.deepEqual(plan.quitar, []);
  const borrar = planDeCambios([a, b, c], pos, [a, c]);
  assert.deepEqual(borrar.poner, []);
  assert.deepEqual(borrar.quitar, ['b']);
  const reordenar = planDeCambios([a, b, c], pos, [c, a, b]);
  assert.deepEqual(reordenar.poner.map((f) => [f.k, f.n]), [['c', 0], ['a', 1], ['b', 2]]);
  assert.throws(() => planDeCambios([], new Map(), [a, { id: 'a' }]), /repetido/);
});

test('respaldo: acepta el formato de la versión original y el de Orisma', () => {
  const d = datosBase();
  const v2 = analizar(JSON.stringify({ app: 'cuentas', version: 2, fecha: '2026-11-01', datos: { ...d.colecciones, config: d.ajustes } }));
  assert.ok(v2.ok, v2.errores.join(';'));
  assert.match(v2.formato, /Cuentas/);
  const sinPedidos = { ...d.colecciones }; delete sinPedidos.pedidos; delete sinPedidos.movimientos;
  const viejo = analizar(JSON.stringify({ datos: { ...sinPedidos } }));
  assert.ok(viejo.ok);
  assert.deepEqual(viejo.datos.colecciones.pedidos, []);
  const v3 = analizar(JSON.stringify({ app: 'orisma', version: 3, esquema: 1, datos: { ...d.colecciones, config: d.ajustes } }));
  assert.ok(v3.ok);
});

test('respaldo: rechaza archivos dañados, ajenos, de una versión futura o manipulados', () => {
  assert.equal(analizar('{no es json').ok, false);
  assert.equal(analizar(JSON.stringify({ datos: { clientes: [] } })).ok, false);
  const d = datosBase();
  assert.equal(analizar(JSON.stringify({ app: 'orisma', version: 4, esquema: 99, datos: { ...d.colecciones } })).ok, false);
  const malo = analizar(JSON.stringify({ datos: { ...d.colecciones, config: { logo: 'x" onerror="window.__xss=1' } } }));
  assert.equal(malo.ok, false);
  assert.ok(malo.errores.some((e) => e.includes('logo')));
  const idMalo = datosBase(); idMalo.colecciones.clientes[0].id = '"><img src=x>';
  assert.equal(analizar(JSON.stringify({ datos: { ...idMalo.colecciones } })).ok, false);
});

test('legado: lee las 7 claves sin modificarlas y reconoce el origen', () => {
  const guardado = { cuentas_clientes: '[{"id":"c1","nombre":"Ana"}]', cuentas_ventas: '[{"id":"v1","clienteNombre":"Ana","fecha":"2026-01-01","items":[],"abonos":[],"sumaItems":5}]', cuentas_pedidos: '[]', cuentas_config: '{"nombre":"X"}' };
  const almacen = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: () => { throw new Error('no debe escribir'); }, removeItem: () => { throw new Error('no debe borrar'); } };
  assert.ok(hayDatosLegado(almacen));
  const r = leerLegado(almacen);
  assert.deepEqual(r.errores, []);
  assert.equal(r.datos.colecciones.clientes[0].nombre, 'Ana');
  assert.deepEqual(r.datos.colecciones.gastos, []);
  assert.equal(r.datos.ajustes.nombre, 'X');
  assert.equal(r.crudo[CLAVES.clientes], guardado.cuentas_clientes);
  assert.deepEqual(r.origen.rasgos, ['pedidos', 'abonos en ventas', 'descuentos']);
  assert.deepEqual(detectarOrigen({}, {}).rasgos, []);
});

test('legado: JSON dañado se informa como error y no se inventan datos', () => {
  const almacen = { getItem: (k) => (k === 'cuentas_ventas' ? '[{"id":' : null) };
  const r = leerLegado(almacen);
  assert.ok(r.errores.some((e) => e.includes('cuentas_ventas')));
  assert.equal(hayDatosLegado({ getItem: () => null }), false);
});
