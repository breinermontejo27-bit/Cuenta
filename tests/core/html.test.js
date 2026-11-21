import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, seguro, esSeguro, imagenSegura, icono, montar } from '../../src/ui/html.js';

test('html`` escapa los valores', () => {
  const nombre = '<img src=x onerror="alert(1)">';
  assert.equal(html`<p>${nombre}</p>`.texto, '<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>');
});

test('html`` escapa comillas dentro de atributos', () => {
  const id = 'x" onclick="robar()';
  assert.equal(html`<li data-id="${id}"></li>`.texto, '<li data-id="x&quot; onclick=&quot;robar()"></li>');
});

test('html`` anida plantillas y listas sin volver a escapar', () => {
  const items = ['a<b', 'c'].map((t) => html`<li>${t}</li>`);
  assert.equal(html`<ul>${items}</ul>`.texto, '<ul><li>a&lt;b</li><li>c</li></ul>');
});

test('null, undefined y false no se pintan; 0 sí', () => {
  assert.equal(html`${null}${undefined}${false}${0}`.texto, '0');
});

test('seguro() marca HTML de confianza', () => {
  assert.equal(html`${seguro('<b>x</b>')}`.texto, '<b>x</b>');
  assert.ok(esSeguro(seguro('')));
  assert.ok(!esSeguro('<b>'));
});

test('imagenSegura() solo acepta imágenes propias', () => {
  assert.equal(imagenSegura('data:image/jpeg;base64,/9j/4AAQ=='), 'data:image/jpeg;base64,/9j/4AAQ==');
  assert.equal(imagenSegura('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(imagenSegura('blob:https://x/123'), 'blob:https://x/123');
  for (const malo of ['x" onerror="window.__xss=1', 'javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=', 'https://otro.com/a.png', 'data:image/png;base64,abc" onerror="x', '', null]) {
    assert.equal(imagenSegura(malo), '', String(malo));
  }
});

test('icono() rechaza nombres raros', () => {
  assert.match(icono('ventas').texto, /href="#i-ventas"/);
  assert.throws(() => icono('x"><script>'));
});

test('montar() rechaza texto sin escapar', () => {
  assert.throws(() => montar({}, '<b>hola</b>'), TypeError);
  const el = {}; montar(el, html`<b>${'<i>'}</b>`);
  assert.equal(el.innerHTML, '<b>&lt;i&gt;</b>');
});
