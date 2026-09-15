import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { elemento, clonarSemIds } from '../../motor/dom.js';

const { document } = parseHTML('<!DOCTYPE html><html><body></body></html>');

test('elemento cria a tag com classe e texto opcionais', () => {
  const span = elemento(document, 'span', 'rotulo', 'Introdução');
  assert.equal(span.outerHTML, '<span class="rotulo">Introdução</span>');
  assert.equal(elemento(document, 'tr').outerHTML, '<tr></tr>');
});

test('clonarSemIds copia a subárvore sem nenhum id, sem mexer no original, e aceita nós de texto', () => {
  const original = parseHTML('<!DOCTYPE html><html><body><div id="a"><p id="b">x <svg><marker id="c"></marker></svg></p></div></body></html>')
    .document.getElementById('a');
  const copia = clonarSemIds(original);
  assert.equal(copia.querySelectorAll('[id]').length, 0);
  assert.equal(copia.hasAttribute('id'), false);
  assert.equal(copia.textContent, original.textContent);
  assert.equal(original.querySelectorAll('[id]').length, 2);
  assert.equal(clonarSemIds(document.createTextNode('texto')).nodeValue, 'texto');
});
