import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coresDasSeries } from '../../componentes/graficos.js';

// Passo 1 do brief: a tabela pequena que vale mais que o resto da tarefa — um erro aqui é silencioso,
// porque o gráfico sai bonito com a série errada em destaque. Cada linha diz quem ficou azul (foco),
// quem ficou tinta, quem ficou cinza, e qual delas é a tracejada.
test('coresDasSeries: uma série sai em tinta', () => {
  assert.deepEqual(coresDasSeries(['a']), [{ serie: 'a', cor: 'tinta', tracejada: false }]);
});

test('coresDasSeries: duas séries com foco — o foco é azul, a outra é tinta (não cinza: só entra com 3)', () => {
  assert.deepEqual(coresDasSeries(['a', 'b'], 'b'), [
    { serie: 'a', cor: 'tinta', tracejada: false },
    { serie: 'b', cor: 'azul', tracejada: false },
  ]);
  assert.deepEqual(coresDasSeries(['a', 'b'], 'a'), [
    { serie: 'a', cor: 'azul', tracejada: false },
    { serie: 'b', cor: 'tinta', tracejada: false },
  ], 'o foco pode ser a primeira, não só a última');
});

test('coresDasSeries: duas séries sem foco — a ÚLTIMA de y vira o foco (azul)', () => {
  assert.deepEqual(coresDasSeries(['a', 'b']), [
    { serie: 'a', cor: 'tinta', tracejada: false },
    { serie: 'b', cor: 'azul', tracejada: false },
  ]);
});

test('coresDasSeries: três séries com foco no meio — as duas de fora ficam tinta e cinza tracejada, NESSA ORDEM de encontro', () => {
  assert.deepEqual(coresDasSeries(['a', 'b', 'c'], 'b'), [
    { serie: 'a', cor: 'tinta', tracejada: false },
    { serie: 'b', cor: 'azul', tracejada: false },
    { serie: 'c', cor: 'cinza', tracejada: true },
  ]);
});

test('coresDasSeries: três séries sem foco — a última (c) é o foco; a e b (nessa ordem) ficam tinta e cinza tracejada', () => {
  assert.deepEqual(coresDasSeries(['a', 'b', 'c']), [
    { serie: 'a', cor: 'tinta', tracejada: false },
    { serie: 'b', cor: 'cinza', tracejada: true },
    { serie: 'c', cor: 'azul', tracejada: false },
  ]);
});
