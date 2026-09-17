import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { ehNumerica, marcarCelulasNumericas, rotularExercicios } from '../../montar/corpo.js';
import { rotulosPara } from '../../motor/rotulos.js';

const aula = (corpo) => parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document;
const numericas = (doc) => [...doc.querySelectorAll('.numerica')].map((celula) => celula.textContent);

test('rotularExercicios dá ao enunciado e à resposta os rótulos do idioma da aula', () => {
  for (const [lang, exercicio, resposta] of [['pt-BR', 'Exercício', 'Resposta'], ['en', 'Exercise', 'Answer']]) {
    const doc = aula('<section><div class="exercicio"><div class="enunciado">Quanto?</div><div class="resposta">Dois.</div></div><div class="enunciado">Fora do exercício.</div></section>');
    rotularExercicios(doc, rotulosPara(lang));
    const rotulos = [...doc.querySelectorAll('.enunciado, .resposta')].map((parte) => parte.getAttribute('data-rotulo'));
    assert.deepEqual(rotulos, [exercicio, resposta, null], lang);
  }
});

test('ehNumerica aceita número com sinal, separador de milhar, decimal, % e R$', () => {
  for (const texto of ['42', '-3,14', '+0.5', '−7', '1.234,56', '1,234.56', '1 234', '12%', '12,5 %', 'R$ 1.200,00', 'R$100', ' 3 ', '0,001', '-R$ 1.234,50']) {
    assert.equal(ehNumerica(texto), true, texto);
  }
});

test('ehNumerica recusa texto, data, unidade e número mal formado', () => {
  for (const texto of ['', 'n/d', '1.2.3', '1,2,3', '2026-09-14', '10 kg', '1e5', '12:30', '-', '%', 'US$ 5']) {
    assert.equal(ehNumerica(texto), false, texto);
  }
});

test('marca células numéricas e alinha o cabeçalho da coluna que só tem números, com célula vazia neutra', () => {
  const doc = aula(`<section><table>
    <thead><tr><th>modelo</th><th>erro</th><th>nota</th><th>casos</th><th>2026</th></tr></thead>
    <tbody>
      <tr><th scope="row">A</th><td>12,5%</td><td>boa</td><td>1</td><td>x</td></tr>
      <tr><th scope="row">B</th><td>9,1%</td><td>3</td><td></td><td>y</td></tr>
    </tbody>
  </table></section>`);
  marcarCelulasNumericas(doc);
  assert.deepEqual(numericas(doc), ['erro', 'casos', '2026', '12,5%', '1', '9,1%', '3']);
});

test('rowspan desloca as colunas das linhas seguintes; célula com colspan não alinha cabeçalho', () => {
  const comRowspan = aula(`<section><table>
    <thead><tr><th>grupo</th><th>valor</th><th>nota</th></tr></thead>
    <tbody><tr><td rowspan="2">x</td><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr></tbody>
  </table></section>`);
  marcarCelulasNumericas(comRowspan);
  assert.deepEqual(numericas(comRowspan), ['valor', '1', '2']);

  const comColspan = aula(`<section><table>
    <thead><tr><th colspan="2">medidas</th></tr></thead>
    <tbody><tr><td>1</td><td>2</td></tr></tbody>
  </table></section>`);
  marcarCelulasNumericas(comColspan);
  assert.deepEqual(numericas(comColspan), ['1', '2']);
});

test('tabela fora de section não é tocada', () => {
  const doc = aula('<table><tbody><tr><td>1</td></tr></tbody></table><section><p>Texto.</p></section>');
  marcarCelulasNumericas(doc);
  assert.deepEqual(numericas(doc), []);
});

test('tabela sem thead/tbody explícitos ainda marca as células numéricas (spec 3.1: montar não pode divergir entre navegador e build)', () => {
  const doc = aula(`<section><table>
    <tr><th>modelo</th><th>erro</th></tr>
    <tr><td>A</td><td>12,5%</td></tr>
    <tr><td>B</td><td>9,1%</td></tr>
  </table></section>`);
  marcarCelulasNumericas(doc);
  assert.deepEqual(numericas(doc), ['12,5%', '9,1%']);
});
