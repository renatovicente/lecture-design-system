import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerMensagem, TIPO } from '../../motor/sincronia.js';

const janela = { location: { origin: 'http://127.0.0.1:8765' } };
const evento = (data, origin = 'http://127.0.0.1:8765') => ({ data, origin });

test('lerMensagem aceita ola e posição com índice e passo inteiros', () => {
  assert.deepEqual(lerMensagem(evento({ tipo: TIPO, acao: 'ola' }), janela), { acao: 'ola' });
  assert.deepEqual(lerMensagem(evento({ tipo: TIPO, acao: 'posicao', indice: 3, passo: 1 }), janela),
    { acao: 'posicao', indice: 3, passo: 1 });
});

test('lerMensagem aceita a origem "null" das páginas abertas por file://', () => {
  assert.deepEqual(lerMensagem(evento({ tipo: TIPO, acao: 'ola' }, 'null'), janela), { acao: 'ola' });
});

test('lerMensagem recusa outra origem, outro tipo, ação desconhecida e posição que não é inteira', () => {
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'ola' }, 'https://exemplo.test'), janela), null);
  assert.equal(lerMensagem(evento({ tipo: 'outro', acao: 'ola' }), janela), null);
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'apagar' }), janela), null);
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'posicao', indice: '2', passo: 0 }), janela), null);
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'posicao', indice: 2.5, passo: 0 }), janela), null);
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'posicao', indice: 2 }), janela), null);
  assert.equal(lerMensagem(evento(null), janela), null);
  assert.equal(lerMensagem(evento('texto'), janela), null);
});
