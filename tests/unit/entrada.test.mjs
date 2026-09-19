// Os dois ganchos de iniciar() existem para o pacote do dist (spec 3.3) e são a única diferença
// entre os modos. Este teste os exercita sem navegador: lê o fonte do módulo e afirma que nenhum
// especificador dinâmico escapou do resolver, e que nenhuma folha escapou do injetor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FONTE = readFileSync(new URL('../../montar/entrada.js', import.meta.url), 'utf8');

// O que estes testes querem afirmar é sobre o CÓDIGO, não sobre o texto do arquivo. Sem tirar os
// comentários, um comentário que explica por que NÃO se usa `import.meta` derruba o teste que
// proíbe `import.meta` — e a prosa acaba contorcida para driblar a medida, que é o instrumento
// mandando na escrita em vez do contrário.
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('todo import dinâmico de entrada.js passa pelo resolver', () => {
  const dinamicos = [...FONTE.matchAll(/import\(([^)]*)\)/g)].map((m) => m[1].trim());
  assert.ok(dinamicos.length >= 4, `esperava ao menos 4 import dinâmicos, achei ${dinamicos.length}`);
  const escaparam = dinamicos.filter((argumento) => !argumento.startsWith('resolver('));
  assert.deepEqual(escaparam, [], `import dinâmico fora do resolver: ${escaparam.join(', ')}`);
});

test('entrada.js não usa import.meta: no formato iife ele vem vazio e new URL lança', () => {
  assert.equal(CODIGO.includes('import.meta'), false);
});

test('dentro de iniciar(), a única menção a carregarEstilo é o padrão de injetarEstilo', () => {
  const corpo = CODIGO.slice(CODIGO.indexOf('export async function iniciar'));
  const mencoes = [...corpo.matchAll(/carregarEstilo/g)].length;
  // Conta, não casa `carregarEstilo(`: `ESTILOS.map(carregarEstilo)` é referência nua e escaparia.
  assert.equal(mencoes, 1, `carregarEstilo mencionado ${mencoes}× dentro de iniciar()`);
  assert.match(corpo, /const injetarEstilo = estilo \?\? carregarEstilo;/);
});
