// Os dois ganchos de iniciar() existem para o pacote do dist (spec 3.3) e são a única diferença
// entre os modos. Este teste os exercita sem navegador: lê o fonte do módulo e afirma que nenhum
// especificador dinâmico escapou do resolver, e que nenhuma folha escapou do injetor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FONTE = readFileSync(new URL('../../montar/entrada.js', import.meta.url), 'utf8');

test('todo import dinâmico de entrada.js passa pelo resolver', () => {
  const dinamicos = [...FONTE.matchAll(/import\(([^)]*)\)/g)].map((m) => m[1].trim());
  assert.ok(dinamicos.length >= 4, `esperava ao menos 4 import dinâmicos, achei ${dinamicos.length}`);
  const escaparam = dinamicos.filter((argumento) => !argumento.startsWith('resolver('));
  assert.deepEqual(escaparam, [], `import dinâmico fora do resolver: ${escaparam.join(', ')}`);
});

test('entrada.js não usa import.meta: no formato iife ele vem vazio e new URL lança', () => {
  assert.equal(FONTE.includes('import.meta'), false);
});

test('nenhuma folha de estilo é carregada fora do injetor, dentro de iniciar()', () => {
  const corpo = FONTE.slice(FONTE.indexOf('export async function iniciar'));
  assert.equal(corpo.includes('carregarEstilo('), false,
    'dentro de iniciar() o carregamento de folha tem de passar por injetarEstilo');
});
