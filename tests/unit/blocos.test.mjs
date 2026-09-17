import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { textoDeTitulo, derivarBlocos, estadosDosQuadrados } from '../../montar/blocos.js';
import { renderizarTex } from '../../componentes/tex.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const LIMITES = { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] };
const secoes = (corpo) => [...parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document.body.children];

test('textoDeTitulo troca <br> por espaço e junta o texto dos filhos', () => {
  const [secao] = secoes('<section data-layout="conteudo"><h2>O gradiente aponta a subida;<br>'
    + '<span class="sinal">descemos no sentido oposto.</span></h2></section>');
  assert.equal(textoDeTitulo(secao.querySelector('h2')), 'O gradiente aponta a subida; descemos no sentido oposto.');
  assert.equal(textoDeTitulo(null), '');
});

test('textoDeTitulo troca o TeX, cru ou já renderizado, por texto sem barras nem chaves', () => {
  const [secao] = secoes('<section data-layout="abertura"><h2>O papel de \\(\\eta\\)<br><span class="sinal">e de \\(\\nabla E\\)</span></h2></section>');
  const titulo = secao.querySelector('h2');
  assert.equal(textoDeTitulo(titulo), 'O papel de eta e de nabla E');
  renderizarTex(titulo, { katex });
  assert.equal(titulo.querySelectorAll('.katex').length, 2);
  assert.equal(textoDeTitulo(titulo), 'O papel de eta e de nabla E');
});

test('derivarBlocos numera as aberturas e marca a introdução como null', () => {
  const lista = secoes(`
    <section data-layout="capa"><h1>Aula</h1></section>
    <section data-layout="conteudo"><h2>Por que descer?</h2></section>
    <section data-layout="abertura"><h2>Intuição</h2></section>
    <section data-layout="conteudo"><h2>O gradiente</h2></section>
    <section data-layout="abertura" data-curto="Backprop"><h2>Backpropagation</h2></section>
    <section data-layout="conteudo"><h2>A culpa volta</h2></section>
    <section data-layout="encerramento"><h2>O que fica</h2></section>`);
  const { blocos, blocoDaSecao, modo } = derivarBlocos(lista, LIMITES);
  assert.deepEqual(blocos, [
    { numero: 1, titulo: 'Intuição', curto: 'Intuição', indice: 2 },
    { numero: 2, titulo: 'Backpropagation', curto: 'Backprop', indice: 4 },
  ]);
  assert.deepEqual(blocoDaSecao, [null, null, 1, 1, 2, 2, 2]);
  assert.equal(modo, 'fileira');
});

test('modo do mapa segue os limites do contrato: nenhum, fileira ou contador', () => {
  assert.deepEqual(LIMITES, { minBlocos: 2, maxFileira: 8 });
  const aberturas = (n) => secoes(Array.from({ length: n },
    (_, k) => `<section data-layout="abertura"><h2>B${k + 1}</h2></section>`).join(''));
  assert.equal(derivarBlocos(aberturas(0), LIMITES).modo, 'nenhum');
  assert.equal(derivarBlocos(aberturas(1), LIMITES).modo, 'nenhum');
  assert.equal(derivarBlocos(aberturas(2), LIMITES).modo, 'fileira');
  assert.equal(derivarBlocos(aberturas(8), LIMITES).modo, 'fileira');
  assert.equal(derivarBlocos(aberturas(9), LIMITES).modo, 'contador');
});

test('estadosDosQuadrados: vistos antes, atual no bloco, futuros depois', () => {
  assert.deepEqual(estadosDosQuadrados(3, 2), ['visto', 'atual', 'futuro']);
  assert.deepEqual(estadosDosQuadrados(3, 1), ['atual', 'futuro', 'futuro']);
  assert.deepEqual(estadosDosQuadrados(3, null), ['futuro', 'futuro', 'futuro']);
  assert.deepEqual(estadosDosQuadrados(3, 3, { encerramento: true }), ['visto', 'visto', 'visto']);
  assert.deepEqual(estadosDosQuadrados(0, null), []);
});
