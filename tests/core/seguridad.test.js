// Etapa 8 · Pruebas unitarias de seguridad: PIN (huella), espera entre intentos, claves prohibidas y saneo de ajustes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinValido, crearHuellaPin, comprobarPin } from '../../src/services/pin.js';
import { esperaTrasFallos } from '../../src/operations/lock.js';
import { revisarRegistro, revisarDatos, sanearAjustesLegado } from '../../src/data/schema.js';

test('pinValido: solo de 4 a 8 dígitos', () => {
  for (const ok of ['1234', '00000000', '24680']) assert.equal(pinValido(ok), true, ok);
  for (const no of ['123', '123456789', '12a4', ' 1234', '', '12.4']) assert.equal(pinValido(no), false, no);
});

test('huella del PIN: no contiene el PIN, usa sal distinta cada vez y solo acepta el correcto', async () => {
  const a = await crearHuellaPin('2468');
  const b = await crearHuellaPin('2468');
  assert.equal(a.alg, 'PBKDF2-SHA256');
  assert.ok(a.iteraciones >= 100000);
  assert.ok(!JSON.stringify(a).includes('2468'));
  assert.notEqual(a.sal, b.sal);
  assert.notEqual(a.huella, b.huella);
  assert.equal(await comprobarPin('2468', a), true);
  assert.equal(await comprobarPin('2469', a), false);
  assert.equal(await comprobarPin('24680', a), false);
  assert.equal(await comprobarPin('2468', null), false);
  await assert.rejects(() => crearHuellaPin('12'));
});

test('espera tras fallos: libre hasta 4, luego 30 s y se duplica hasta 15 min', () => {
  assert.deepEqual([0, 1, 4].map(esperaTrasFallos), [0, 0, 0]);
  assert.equal(esperaTrasFallos(5), 30000);
  assert.equal(esperaTrasFallos(6), 60000);
  assert.equal(esperaTrasFallos(7), 120000);
  assert.equal(esperaTrasFallos(30), 15 * 60000);
});

test('claves que contaminan prototipos se rechazan en cualquier registro', () => {
  const malo = JSON.parse('{"id":"c1","nombre":"A","__proto__":{"x":1}}');
  assert.ok(revisarRegistro('clientes', malo).some((p) => p.includes('__proto__')));
  assert.ok(revisarRegistro('ajustes', { constructor: {} }).some((p) => p.includes('constructor')));
  const r = revisarDatos({ colecciones: { clientes: [malo], inventario: [], ventas: [], gastos: [], pedidos: [], movimientos: [] }, ajustes: null }, 'estricto');
  assert.ok(r.errores.some((e) => e.includes('__proto__')), 'en un respaldo, bloquea la restauración');
  assert.equal(({}).x, undefined);
});

test('saneo de ajustes antiguos: lo inválido vuelve al valor por defecto; lo válido no se toca', () => {
  const entrada = JSON.parse('{"nombre":"Tienda","logo":"javascript:x","colorFactura":"red;x","impuesto":"mucho","mostrarFotos":"si","facturaPie":"Gracias","__proto__":{"a":1},"extra":"se conserva"}');
  const { ajustes, cambiados } = sanearAjustesLegado(entrada);
  assert.deepEqual(cambiados.sort(), ['__proto__', 'colorFactura', 'impuesto', 'logo', 'mostrarFotos'].sort());
  assert.equal(ajustes.nombre, 'Tienda');
  assert.equal(ajustes.facturaPie, 'Gracias');
  assert.equal(ajustes.extra, 'se conserva');
  assert.equal(ajustes.logo, '');
  assert.equal(ajustes.colorFactura, '#1E4FA0');
  assert.equal(ajustes.impuesto, 0);
  assert.equal(ajustes.mostrarFotos, false);
  assert.ok(!Object.prototype.hasOwnProperty.call(ajustes, '__proto__'));
  assert.deepEqual(revisarRegistro('ajustes', ajustes), []);
  const valido = { nombre: 'X', colorFactura: '#112233' };
  assert.equal(sanearAjustesLegado(valido).ajustes, valido);
  assert.equal(sanearAjustesLegado(null).ajustes, null);
});

test('texto seguro para buscar y ordenar (D4-23): igual que antes con textos; no falla con null o números', async () => {
  const { texto, compararTexto, contiene } = await import('../../src/business/text.js');
  assert.equal(texto(null), ''); assert.equal(texto(undefined), ''); assert.equal(texto(12), '12'); assert.equal(texto('a'), 'a');
  assert.equal(compararTexto('2026-11-02', '2026-11-01'), '2026-11-02'.localeCompare('2026-11-01'));
  assert.ok(compararTexto(null, '2026-11-01') < 0);
  assert.equal(contiene('Ana Pérez', 'pér'), true);
  assert.equal(contiene(null, ''), true);
  assert.equal(contiene(12345, '234'), true);
});
