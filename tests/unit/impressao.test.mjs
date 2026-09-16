import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { paginasEsperadas } from '../../motor/impressao.js';

const aula = (secoes) => parseHTML(`<!DOCTYPE html><html><body>${secoes}</body></html>`).document;
const slide = (corpo, atributos = '') => `<section class="slide" ${atributos}><div class="area">${corpo}</div></section>`;

test('sem data-pdf, cada slide vale uma página', () => {
  assert.equal(paginasEsperadas(aula(slide('<p>a</p>') + slide('<p data-passo>b</p>'))), 2);
});

test('com data-pdf="passos", o slide vale uma página por estado: sem passos revelados até todos', () => {
  const doc = aula(slide('<p>a</p>') + slide('<p data-passo>b</p><p data-passo>c</p><p data-passo>d</p>', 'data-pdf="passos"'));
  assert.equal(paginasEsperadas(doc), 5);
});

test('data-pdf="passos" num slide sem passos não acrescenta páginas, e as cópias não são contadas', () => {
  const doc = aula(slide('<p>a</p>', 'data-pdf="passos"') + '<section class="slide" data-copia><div class="area"></div></section>');
  assert.equal(paginasEsperadas(doc), 1);
});
