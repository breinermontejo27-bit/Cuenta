import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { revisar } from '../tools/check-architecture.js';
import { calcularLista, textoLista } from '../tools/precache.js';

test('las capas respetan las reglas de dependencia', () => {
  const { problemas } = revisar();
  assert.deepEqual(problemas, []);
});

test('la lista de precarga está al día', () => {
  const guardada = readFileSync(new URL('../src/precache-list.js', import.meta.url), 'utf8');
  assert.equal(guardada, textoLista(calcularLista()), 'Ejecuta: node tools/precache.js');
});

test('sin estilos ni scripts en línea, ni recursos externos (lo exige la política de seguridad)', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(index, /\sstyle=/, 'index.html con style="..."');
  assert.doesNotMatch(index, /<script(?![^>]*\bsrc=)[^>]*>/, 'index.html con <script> en línea');
  assert.doesNotMatch(index, /https?:\/\/(?!www\.w3\.org)/, 'index.html carga algo de internet');
  for (const f of revisar().listado) {
    const texto = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(texto, /\sstyle=["']/, `${f} usa style="..." (bloqueado por la política de seguridad)`);
    assert.doesNotMatch(texto, /\son[a-z]+=["']/, `${f} usa atributos de evento en línea`);
  }
});
