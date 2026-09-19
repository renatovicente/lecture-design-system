// spec 9.2: erro para "caractere sem glifo nas fontes embutidas, FORA de TeX e de código".
// As duas exclusões são o miolo da regra: dentro de \( \) o KaTeX desenha o símbolo com as fontes
// dele, e dentro de <pre>/<code> o texto é literal por definição.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { readFileSync } from 'node:fs';
import { validar } from '../../validador/validar.js';
import { REGRAS_ESTATICAS } from '../../validador/regras/index.js';
// lerCobertura mora em validador/, não em build/: é o módulo puro que o navegador também carrega
// (tarefa 3, rodada de correção 1, item 1). Importar de build/ aqui arrastaria Node para dentro do
// que o esbuild empacota — o brief desta tarefa ainda aponta para build/cobertura.mjs; corrigido.
import { lerCobertura } from '../../validador/cobertura.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));
const cobertura = lerCobertura(JSON.parse(readFileSync(new URL('validador/cobertura.json', RAIZ), 'utf8')));

const aula = (corpo) => parseHTML(
  `<!DOCTYPE html><html lang="pt-BR"><head><title>t</title></head><body>${corpo}</body></html>`).document;

const glifos = (corpo) => validar(aula(corpo), { contrato, regras: REGRAS_ESTATICAS, grupo: 'estatica', cobertura })
  .filter((achado) => achado.regra === 'matematica.simbolo-fora-do-tex');

test('símbolo sem glifo no texto corrido acusa, com o caractere na mensagem', () => {
  // Só um símbolo sem glifo na frase: "n → ∞" teria dois (→ e ∞ não têm glifo nenhum dos dois,
  // fato 12), e o achado seria 2, não 1 — este teste isola → para medir uma coisa de cada vez.
  const achados = glifos('<section data-layout="conteudo" id="s"><p>Quando n → infinito.</p></section>');
  assert.equal(achados.length, 1);
  assert.match(achados[0].mensagem, /→/);
  assert.equal(achados[0].slide, 1);
  assert.equal(achados[0].id, 's');
});

test('o mesmo símbolo dentro de TeX não acusa: é lá que ele deve estar', () => {
  assert.deepEqual(glifos('<section data-layout="conteudo"><p>Quando \\( n \\to \\infty \\).</p></section>'), []);
});

// Reusa textosDe (componentes/tex.js), que exclui svg — e aqui é a resposta certa, porque TeX nunca
// aparece dentro de um SVG: não tem como "escrever em TeX" um símbolo que está lá. Não é o defeito do
// marco 4b (palavrasDe reusou o mesmo andador para CONTAR PALAVRAS, uma pergunta diferente — ali
// texto dentro de SVG conta, por isso limites.js:FORA_DA_CONTAGEM não exclui svg, de propósito).
test('dentro de um <svg> também não acusa: lá TeX nunca aparece', () => {
  assert.deepEqual(glifos('<section data-layout="conteudo"><svg><text>α</text></svg></section>'), []);
});

test('dentro de código também não acusa: o texto é literal', () => {
  assert.deepEqual(glifos('<section data-layout="conteudo"><pre data-lang="python">x → y</pre></section>'), []);
  assert.deepEqual(glifos('<section data-layout="conteudo"><p>use <code>a → b</code></p></section>'), []);
});

test('tipografia que TEM glifo não acusa — senão a regra vira ruído', () => {
  assert.deepEqual(glifos('<section data-layout="conteudo"><p>São 3 × 4 ± 1 — “aspas”, 25 °C.</p></section>'), []);
});

// Achado do revisor (rodada de correção 1): a guarda original só cortava <= 0x20 (controles C0 e o
// espaço comum) — U+2003 (em space, que \s do JS já cobre) e U+200B (largura zero, que só
// Default_Ignorable_Code_Point cobre) não são <= 0x20 e não estão em cobertura.json; sem a guarda
// ampliada (INVISIVEL, em recursos.js), colar texto de um editor com esses espaços viraria falso
// "sem glifo". Nenhum dos dois desenha nada — não há glifo para "faltar".
test('espaço Unicode invisível, mesmo sem estar em cobertura.json, não acusa', () => {
  assert.deepEqual(glifos('<section data-layout="conteudo"><p>São 3​coisas.</p></section>'), []);
});

test('o mesmo símbolo repetido no slide acusa uma vez só', () => {
  const achados = glifos('<section data-layout="conteudo"><p>α e depois α de novo</p></section>');
  assert.equal(achados.length, 1);
});

test('sem cobertura no contexto a regra fica calada, em vez de acusar tudo', () => {
  const achados = validar(aula('<section data-layout="conteudo"><p>n → ∞</p></section>'),
    { contrato, regras: REGRAS_ESTATICAS, grupo: 'estatica' })
    .filter((a) => a.regra === 'matematica.simbolo-fora-do-tex');
  assert.deepEqual(achados, []);
});
