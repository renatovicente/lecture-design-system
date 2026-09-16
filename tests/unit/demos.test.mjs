import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { criarDemos } from '../../motor/demos.js';

const slide = (corpo) => parseHTML(`<!DOCTYPE html><html><body><section class="slide"><div class="area">${corpo}</div></section></body></html>`)
  .document.querySelector('section');

function consoleFalso() {
  const erros = [];
  const avisos = [];
  return { erros, avisos, error: (texto) => erros.push(texto), warn: (texto) => avisos.push(texto) };
}

test('a fila do carregador vira registro, e AulaUSP.demo passa a registrar direto', () => {
  const api = { filaDeDemos: [{ nome: 'contador', definicao: {} }], demo() {} };
  const demos = criarDemos({ api, console: consoleFalso() });
  assert.equal(demos.tem('contador'), true);
  assert.equal(api.filaDeDemos.length, 0);
  api.demo('outra', {});
  assert.equal(demos.tem('outra'), true);
});

test('montar roda uma vez com as opções de data-opcoes; iniciar e parar, a cada entrada e saída', () => {
  const chamadas = [];
  const definicao = {
    montar(raiz, opcoes) { chamadas.push(['montar', raiz.getAttribute('data-demo'), opcoes.n]); },
    iniciar() { chamadas.push(['iniciar']); },
    parar() { chamadas.push(['parar']); },
  };
  const demos = criarDemos({ api: { filaDeDemos: [{ nome: 'contador', definicao }] }, console: consoleFalso() });
  const secao = slide('<div class="demo" data-demo="contador" data-opcoes=\'{"n":3}\'></div>');
  demos.entrar(secao);
  demos.sair(secao);
  demos.entrar(secao);
  assert.deepEqual(chamadas, [['montar', 'contador', 3], ['iniciar'], ['parar'], ['iniciar']]);
});

test('data-opcoes inválido vira objeto vazio, com erro no console', () => {
  const registro = consoleFalso();
  let recebidas = null;
  const definicao = { montar(raiz, opcoes) { recebidas = opcoes; } };
  const demos = criarDemos({ api: { filaDeDemos: [{ nome: 'contador', definicao }] }, console: registro });
  demos.entrar(slide('<div class="demo" data-demo="contador" data-opcoes="{isto não é json}"></div>'));
  assert.deepEqual(recebidas, {});
  assert.equal(registro.erros.length, 1);
  assert.match(registro.erros[0], /data-opcoes inválido na demo "contador"/);
});

test('demo sem registro avisa uma vez por entrada e não interrompe a navegação', () => {
  const registro = consoleFalso();
  const demos = criarDemos({ api: { filaDeDemos: [] }, console: registro });
  demos.entrar(slide('<div class="demo" data-demo="ausente"></div>'));
  assert.match(registro.avisos[0], /demo sem registro: "ausente"/);
  assert.equal(registro.erros.length, 0);
});

test('erro dentro de uma demo é registrado e as outras do slide continuam', () => {
  const registro = consoleFalso();
  const chamadas = [];
  const api = {
    filaDeDemos: [
      { nome: 'quebrada', definicao: { iniciar() { throw new Error('falhou'); } } },
      { nome: 'boa', definicao: { iniciar() { chamadas.push('boa'); } } },
    ],
  };
  const demos = criarDemos({ api, console: registro });
  demos.entrar(slide('<div class="demo" data-demo="quebrada"></div><div class="demo" data-demo="boa"></div>'));
  assert.deepEqual(chamadas, ['boa']);
  assert.match(registro.erros[0], /a demo "quebrada" falhou em iniciar/);
});
