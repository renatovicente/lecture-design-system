import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { paginasEsperadas, instalarImpressao } from '../../motor/impressao.js';
import { gruposDePassos, aplicarPassos, passosRevelados } from '../../motor/passos.js';

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

test('restaurar() devolve a um slide que não é o ativo os passos revelados que ele tinha antes', () => {
  // Um salto por bloco, link #id/n ou mapa do apresentador só aplica passos no slide de destino:
  // o slide de origem pode ficar com uma revelação parcial mesmo sem estar ativo.
  const doc = aula(
    slide('<p data-passo>a1</p><p data-passo>a2</p>')
    + slide('<p data-passo>b1</p><p data-passo>b2</p>'),
  );
  const slides = [...doc.querySelectorAll('section.slide')];
  aplicarPassos(gruposDePassos(slides[0]), 1); // ativo: 1 de 2 revelados
  aplicarPassos(gruposDePassos(slides[1]), 1); // inativo: também 1 de 2 revelados

  const motor = {
    doc,
    janela: { addEventListener() {}, console },
    rot: { demoInterativa: 'x' },
    slides,
    estado: () => ({ indice: 0, passo: 1 }),
  };
  const { preparar, restaurar } = instalarImpressao(motor, { api: {} });

  preparar();
  restaurar();

  assert.deepEqual(slides.map((slide) => passosRevelados(gruposDePassos(slide))), [1, 1]);
});
