// Os ganchos de iniciar() existem para o pacote do dist (spec 3.3) e são o que diferencia os modos.
// Este teste os exercita sem navegador: lê o fonte do módulo e afirma que nenhum especificador
// dinâmico escapou do resolver, e que nenhuma folha escapou do injetor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FONTE = readFileSync(new URL('../../montar/entrada.js', import.meta.url), 'utf8');
const DIST = readFileSync(new URL('../../montar/dist.js', import.meta.url), 'utf8');

// O que estes testes querem afirmar é sobre o CÓDIGO, não sobre o texto do arquivo. Sem tirar os
// comentários, um comentário que explica por que NÃO se usa `import.meta` derruba o teste que
// proíbe `import.meta` — e a prosa acaba contorcida para driblar a medida, que é o instrumento
// mandando na escrita em vez do contrário.
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('todo import dinâmico de entrada.js passa pelo resolver', () => {
  const dinamicos = [...CODIGO.matchAll(/import\(([^)]*)\)/g)].map((m) => m[1].trim());
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

// Rodada de correção 1 da tarefa 4: sem validador/cobertura.json, lerCoberturaOpcional degrada para
// undefined (a regra se cala sozinha) — mas "arquivo ausente" e "alguém apagou o aviso sem querer"
// não podem ficar indistinguíveis. Guarda de texto, no mesmo estilo dos dois testes acima: rápida, e
// não precisa de navegador. tests/integracao/painel.test.mjs cobre a outra metade (que `cobertura`
// de fato chega a validar()), com um DOM de verdade.
test('lerCoberturaOpcional avisa no console quando a cobertura não carrega, em vez de ficar muda', () => {
  const corpo = CODIGO.slice(
    CODIGO.indexOf('async function lerCoberturaOpcional'),
    CODIGO.indexOf('function documentoLido'),
  );
  assert.match(corpo, /console\.warn/);
  assert.match(corpo, /return undefined;/);
});

// I3 da revisão final do 5a: ESTILOS (aqui) e EMBUTIDAS (montar/dist.js) são duas listas que citam as
// mesmas folhas e nada as amarra — acrescente uma oitava folha só em ESTILOS e o dev falha alto
// (carregarEstilo rejeita), enquanto o dist injeta nada, calado (estilo() retorna cedo em chave
// desconhecida). Comparação por texto, no mesmo estilo dos testes acima: sem tirar os comentários de
// dist.js primeiro, um comentário que cite 'estilos/x.css' derrubaria a medida.
test('ESTILOS (entrada.js) e EMBUTIDAS (dist.js) citam exatamente as mesmas folhas', () => {
  const codigoDist = DIST.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const folhasCitadas = (texto) => new Set([...texto.matchAll(/'estilos\/[\w.-]+\.css'/g)].map((m) => m[0]));
  const deEntrada = folhasCitadas(CODIGO);
  const deDist = folhasCitadas(codigoDist);
  assert.ok(deEntrada.size >= 7, `esperava ao menos 7 folhas em ESTILOS, achei ${deEntrada.size}`);
  assert.deepEqual([...deDist].sort(), [...deEntrada].sort(),
    'EMBUTIDAS (dist.js) e ESTILOS (entrada.js) divergem — alguém acrescentou uma folha só de um lado');
});
