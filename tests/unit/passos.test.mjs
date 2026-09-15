import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { gruposDePassos, aplicarPassos } from '../../motor/passos.js';

const slide = (corpo) => parseHTML(`<!DOCTYPE html><html><body><section class="slide">
  <div class="area">${corpo}</div><aside class="notas"><p data-passo>nota</p></aside></section></body></html>`)
  .document.querySelector('section');
const textos = (grupos) => grupos.map((grupo) => grupo.map((elemento) => elemento.textContent));

test('slide sem data-passo não tem passos', () => {
  assert.deepEqual(gruposDePassos(slide('<p>Texto.</p>')), []);
});

test('passos sem número seguem a ordem do documento, um elemento por passo, e as notas ficam de fora', () => {
  const grupos = gruposDePassos(slide('<ol><li data-passo>a</li><li data-passo>b</li></ol><p data-passo="">c</p>'));
  assert.deepEqual(textos(grupos), [['a'], ['b'], ['c']]);
});

test('passos numerados seguem a ordem numérica, e o mesmo número forma um grupo', () => {
  const grupos = gruposDePassos(slide('<p data-passo="2">a</p><p data-passo="1">b</p><p data-passo="2">c</p><p data-passo="10">d</p>'));
  assert.deepEqual(textos(grupos), [['b'], ['a', 'c'], ['d']]);
});

test('numeração mista ou inválida cai na ordem do documento', () => {
  assert.deepEqual(textos(gruposDePassos(slide('<p data-passo="2">a</p><p data-passo>b</p>'))), [['a'], ['b']]);
  assert.deepEqual(textos(gruposDePassos(slide('<p data-passo="0">a</p><p data-passo="1">b</p>'))), [['a'], ['b']]);
});

test('aplicarPassos marca data-revelado nos grupos revelados e tira dos demais', () => {
  const grupos = gruposDePassos(slide('<p data-passo="1">a</p><p data-passo="2">b</p><p data-passo="2">c</p>'));
  const revelados = () => grupos.flat().map((elemento) => elemento.hasAttribute('data-revelado'));
  aplicarPassos(grupos, 2);
  assert.deepEqual(revelados(), [true, true, true]);
  aplicarPassos(grupos, 1);
  assert.deepEqual(revelados(), [true, false, false]);
  aplicarPassos(grupos, 0);
  assert.deepEqual(revelados(), [false, false, false]);
});
