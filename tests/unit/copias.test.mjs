import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { copiarSlide } from '../../motor/copias.js';

const slide = (corpo) => parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document.querySelector('section');

test('a cópia leva sufixo no id do slide e nos ids de dentro, sem mexer no original', () => {
  const original = slide('<section class="slide" id="figura"><div class="area"><p id="nota">a</p></div></section>');
  const copia = copiarSlide(original, 'p1');
  assert.equal(copia.getAttribute('id'), 'figura-p1');
  assert.equal(copia.querySelector('p').getAttribute('id'), 'nota-p1');
  assert.equal(original.getAttribute('id'), 'figura');
  assert.equal(original.querySelector('p').getAttribute('id'), 'nota');
});

test('referências internas de SVG passam a apontar para a cópia', () => {
  const original = slide(`<section class="slide" id="fig"><div class="area"><figure><svg viewBox="0 0 10 10">
    <defs><marker id="seta"></marker><clipPath id="corte"></clipPath></defs>
    <line marker-end="url(#seta)" clip-path="url('#corte')"></line>
    <use href="#seta"></use>
  </svg></figure></div></section>`);
  const copia = copiarSlide(original, 'p2');
  assert.equal(copia.querySelector('line').getAttribute('marker-end'), 'url(#seta-p2)');
  assert.equal(copia.querySelector('line').getAttribute('clip-path'), "url('#corte-p2')");
  assert.equal(copia.querySelector('use').getAttribute('href'), '#seta-p2');
  assert.equal(original.querySelector('line').getAttribute('marker-end'), 'url(#seta)');
});

test('links para outros slides e cores continuam como estavam', () => {
  const original = slide(`<section class="slide" id="mapa"><div class="area">
    <a href="#outro">outro</a><a href="https://usp.br">externo</a>
    <svg viewBox="0 0 10 10"><rect id="quadro" fill="#0A0A0A" stroke="none"></rect></svg>
  </div></section>`);
  const copia = copiarSlide(original, 'p3');
  assert.equal(copia.querySelector('a').getAttribute('href'), '#outro');
  assert.equal(copia.querySelectorAll('a')[1].getAttribute('href'), 'https://usp.br');
  assert.equal(copia.querySelector('rect').getAttribute('fill'), '#0A0A0A');
  assert.equal(copia.querySelector('rect').getAttribute('id'), 'quadro-p3');
});

test('um slide sem ids nenhum é copiado como está', () => {
  const original = slide('<section class="slide"><div class="area"><p>a</p></div></section>');
  const copia = copiarSlide(original, 'p4');
  assert.equal(copia.outerHTML, original.outerHTML);
});
