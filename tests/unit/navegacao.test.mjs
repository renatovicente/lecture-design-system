import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acaoDaTecla, avancar, voltar, lerEndereco, escreverEndereco } from '../../motor/navegacao.js';
import { ROTULOS } from '../../motor/rotulos.js';

test('acaoDaTecla traduz as teclas da spec 6.2', () => {
  const casos = {
    ArrowRight: 'avancar', ' ': 'avancar', PageDown: 'avancar', ArrowLeft: 'voltar', PageUp: 'voltar',
    Home: 'primeiro', End: 'ultimo', Escape: 'escape', n: 'notas', N: 'notas', f: 'tela-cheia', F: 'tela-cheia',
    '?': 'ajuda', 1: 'bloco-1', 8: 'bloco-8',
  };
  for (const [key, acao] of Object.entries(casos)) assert.equal(acaoDaTecla({ key }), acao, key);
});

test('acaoDaTecla ignora teclas fora da tabela, 0, 9, nomes do protótipo e combinações com modificadores', () => {
  for (const key of ['a', '0', '9', 'Enter', 'constructor', 'toString']) assert.equal(acaoDaTecla({ key }), null, key);
  assert.equal(acaoDaTecla({ key: 'ArrowRight', metaKey: true }), null);
  assert.equal(acaoDaTecla({ key: 'ArrowLeft', ctrlKey: true }), null);
  assert.equal(acaoDaTecla({ key: 'f', altKey: true }), null);
});

test('avancar revela passos pendentes antes de trocar de slide e para no último estado', () => {
  const passos = [0, 2, 0];
  assert.deepEqual(avancar({ indice: 0, passo: 0 }, passos), { indice: 1, passo: 0 });
  assert.deepEqual(avancar({ indice: 1, passo: 0 }, passos), { indice: 1, passo: 1 });
  assert.deepEqual(avancar({ indice: 1, passo: 2 }, passos), { indice: 2, passo: 0 });
  assert.deepEqual(avancar({ indice: 2, passo: 0 }, passos), { indice: 2, passo: 0 });
});

test('voltar esconde passos revelados e chega ao slide anterior com todos os passos revelados', () => {
  const passos = [0, 2, 0];
  assert.deepEqual(voltar({ indice: 1, passo: 2 }, passos), { indice: 1, passo: 1 });
  assert.deepEqual(voltar({ indice: 2, passo: 0 }, passos), { indice: 1, passo: 2 });
  assert.deepEqual(voltar({ indice: 1, passo: 0 }, passos), { indice: 0, passo: 0 });
  assert.deepEqual(voltar({ indice: 0, passo: 0 }, passos), { indice: 0, passo: 0 });
});

test('endereço #id e #id/n: leitura, limite de passos, id desconhecido e escrita', () => {
  const ids = ['capa', 'passo', 'fim'];
  const passos = [0, 3, 0];
  assert.deepEqual(lerEndereco('#passo', ids, passos), { indice: 1, passo: 0 });
  assert.deepEqual(lerEndereco('#passo/2', ids, passos), { indice: 1, passo: 2 });
  assert.deepEqual(lerEndereco('#passo/9', ids, passos), { indice: 1, passo: 3 });
  assert.deepEqual(lerEndereco('#passo/x', ids, passos), { indice: 1, passo: 0 });
  assert.equal(lerEndereco('#nao-existe', ids, passos), null);
  assert.equal(lerEndereco('', ids, passos), null);
  assert.equal(escreverEndereco({ indice: 1, passo: 0 }, ids), '#passo');
  assert.equal(escreverEndereco({ indice: 1, passo: 2 }, ids), '#passo/2');
});

test('os rótulos do motor existem nos dois idiomas, com a mesma tabela de teclas', () => {
  for (const idioma of ['pt-BR', 'en']) {
    for (const chave of ['notas', 'semNotas', 'visaoGeral', 'ajuda', 'tecla', 'acao']) {
      assert.equal(typeof ROTULOS[idioma][chave], 'string', `${idioma}.${chave}`);
    }
    assert.equal(ROTULOS[idioma].teclas.length, 10, idioma);
    assert.ok(ROTULOS[idioma].teclas.every((linha) => linha.length === 2 && linha.every(Boolean)), idioma);
  }
});
