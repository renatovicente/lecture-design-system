// Regras de vocabulário (spec 5.5 e 9.2): elementos, classes e atributos do contrato, e mais nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar } from '../../validador/validar.js';
import { regras as vocabulario } from '../../validador/regras/vocabulario.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>`;

const aula = (corpo) => `${CABECA}\n${corpo}\n</body></html>`;
const slide = (dentro) => aula(`<section data-layout="conteudo" id="a">\n${dentro}\n</section>`);

function rodar(html, opcoes = {}) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras: vocabulario, grupo: 'estatica', ...opcoes });
}

const mensagens = (html, opcoes) => rodar(html, opcoes).map((achado) => achado.mensagem);

test('o que está no contrato passa', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p class="lide">Lide.</p>\n<p>Corpo.</p>')), []);
});

test('elemento fora do vocabulário e elemento proibido', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<blockquote>Citação.</blockquote>')), ['<blockquote> não está no vocabulário no corpo.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<iframe src="https://x"></iframe>')), ['<iframe> é proibido no corpo da aula.']);
});

test('elemento fora do vocabulário não tem os atributos enumerados depois', () => {
  // Uma regra, um dono: acusar o elemento e cada atributo dele faria quatro mensagens de um erro só.
  assert.equal(mensagens(slide('<h2>T</h2>\n<iframe src="https://x" width="10"></iframe>')).length, 1);
});

// Achado da revisão final (Important 5, spec 5.5: "SVG inline, só dentro de figure"): svg está no
// vocabulário do corpo, então nada conferia onde ele fica — um <svg> solto num <p> ou <li> passava.
test('svg só vale dentro de figure', () => {
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<figure><svg viewBox="0 0 10 10" role="img" aria-label="d"><rect fill="#0A0A0A" width="5" height="5"/></svg></figure>')),
    [],
  );
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<p>Texto <svg viewBox="0 0 10 10"><rect fill="#0A0A0A" width="5" height="5"/></svg></p>')),
    ['<svg> só pode ficar dentro de <figure>.'],
  );
});

test('classe inventada, classe do sistema, classe no elemento errado e fora do pai', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p class="bonito">C.</p>')), ['classe "bonito" não existe no contrato.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p class="rodape">C.</p>')), ['"rodape" é classe do sistema: o autor não a escreve no fonte.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<div class="lide">C.</div>')), ['classe "lide" não vale em <div>, só em <p>.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<div class="enunciado"><p>E.</p></div>')), ['classe "enunciado" só vale dentro de div.exercicio.']);
});

// Achado da revisão final (Important 3): vocabulario.atributo já não enumera atributo de elemento
// fora do vocabulário ("uma regra, um dono", testado acima); vocabulario.classe não tinha a mesma
// guarda e emendava um segundo aviso — às vezes um conselho enganoso, como se trocar a tag resolvesse.
test('classe de um elemento fora do vocabulário é problema do elemento, não da classe', () => {
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<iframe class="demo" src="https://x"></iframe>')),
    ['<iframe> é proibido no corpo da aula.'],
  );
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<marquee class="bonito">oi</marquee>')),
    ['<marquee> não está no vocabulário no corpo.'],
  );
});

test('atributo fora do contrato, com valor fora da lista, e com JSON inválido', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p tabindex="0">C.</p>')), ['atributo "tabindex" não vale em <p>.']);
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<div class="colunas" data-grade="7-5"><div><p>A</p></div><div><p>B</p></div></div>')),
    ['data-grade com valor fora do contrato: "7-5".'],
  );
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<div class="demo" data-demo="x" data-opcoes="{passo: 5}"></div>')),
    ['data-opcoes com valor não é JSON válido.'],
  );
});

// A section só foi varrida depois que a sondagem mostrou que os atributos dela não tinham dono.
test('os atributos da própria section são conferidos', () => {
  assert.deepEqual(
    mensagens(aula('<section data-layout="conteudo" id="a" data-curto="X"><h2>T</h2><p>C.</p></section>')),
    ['atributo "data-curto" só vale no layout abertura.'],
  );
  assert.deepEqual(
    mensagens(aula('<section data-layout="conteudo" id="Maiúsculo"><h2>T</h2><p>C.</p></section>')),
    ['id com valor fora da forma esperada: "Maiúsculo".'],
  );
});

test('atributo de evento e estilo em linha', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p onclick="alert(1)">C.</p>')), ['atributo "onclick" é proibido no corpo da aula.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p style="color: red">C.</p>')), ['estilo em linha em <p>.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>C.</p>\n<style>p { color: red }</style>')), ['elemento <style> no corpo da aula.']);
});

test('o vocabulário do SVG é outro, e o próprio svg conta como SVG', () => {
  const figura = (dentro) => slide(`<h2>T</h2>\n<figure><svg viewBox="0 0 10 10" role="img" aria-label="d">${dentro}</svg></figure>`);
  assert.deepEqual(mensagens(figura('<rect fill="#0A0A0A" width="5" height="5"/>')), []);
  assert.deepEqual(mensagens(figura('<rect fill="#FF0000" width="5" height="5"/>')), ['fill="#FF0000" não é cor do contrato.']);
  assert.deepEqual(mensagens(figura('<foreignObject width="5" height="5"/>')), ['<foreignObject> é proibido no corpo da aula.']);
});

test('amarelo e azul em SVG seguem a regra de cor da spec 4.2', () => {
  const svg = (dentro) => slide(`<h2>T</h2>\n<figure><svg viewBox="0 0 10 10">${dentro}</svg></figure>`);
  assert.deepEqual(mensagens(svg('<text fill="#FCB421" font-size="40">oi</text>')), ['amarelo em texto de SVG.']);
  assert.deepEqual(mensagens(svg('<line stroke="#FCB421" stroke-width="2" x1="0" y1="0" x2="5" y2="5"/>')), ['amarelo em traço de 2 px (mín. 4).']);
  assert.deepEqual(mensagens(svg('<line stroke="#FCB421" stroke-width="4" x1="0" y1="0" x2="5" y2="5"/>')), []);
  assert.deepEqual(mensagens(svg('<text fill="#1094AB" font-size="20">oi</text>')), ['azul em texto de 20 px (mín. 32).']);
  assert.deepEqual(mensagens(svg('<text fill="#1094AB" font-size="32">oi</text>')), []);
});

// Achado da revisão final (Important 1): fill, stroke, stroke-width e font-size são herdados em SVG
// (spec 4.2 fala do valor renderizado). Ler só o atributo do próprio elemento dá falso negativo (cor
// herdada em texto não tinha dono) e falso positivo (font-size herdado era ignorado, medindo pelo
// padrão de 16 px sem razão).
test('cor e tamanho de SVG sobem pelos ancestrais até achar quem define o atributo', () => {
  const svg = (dentro) => slide(`<h2>T</h2>\n<figure><svg viewBox="0 0 10 10">${dentro}</svg></figure>`);
  assert.deepEqual(mensagens(svg('<g fill="#FCB421"><text>oi</text></g>')), ['amarelo em texto de SVG.']);
  assert.deepEqual(mensagens(svg('<g font-size="40"><text fill="#1094AB">oi</text></g>')), []);
  // <text font-size> + <tspan fill> é o jeito idiomático de colorir um trecho de uma linha.
  assert.deepEqual(mensagens(svg('<text font-size="40"><tspan fill="#1094AB">oi</tspan></text>')), []);
  assert.deepEqual(mensagens(svg('<text fill="#1094AB">oi</text>')), ['azul em texto de 16 px (mín. 32).']);
  assert.deepEqual(mensagens(svg('<g stroke-width="6"><line stroke="#FCB421" x1="0" y1="0" x2="5" y2="5"/></g>')), []);
  assert.deepEqual(mensagens(svg('<g fill="#1094AB"><text font-size="20">oi</text></g>')), ['azul em texto de 20 px (mín. 32).']);
});

// Achado da revisão final (item 7): o padrão de src no contrato é sensível a caixa, então HTTPS://
// (maiúsculo) caía como erro confuso de vocabulario.atributo — o dono certo desse caso é o aviso de
// recursos.imagem-externa (fixture ao lado, em recursos.test.mjs).
test('src de imagem externa com esquema em maiúsculas não é erro de vocabulario.atributo', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><img src="HTTPS://exemplo.org/a.png" alt="a"></figure>')), []);
});

test('script dentro da section', () => {
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<p>C.</p>\n<script>var x = 1;</script>')),
    ['script dentro da section: registros de demo ficam fora dos slides.'],
  );
});

// Achado da revisão da Tarefa 1: o linkedom preserva a grafia do autor em atributos (ao contrário de
// um navegador, que normaliza no parser); comparar por nome exato perde Class, esconde o layout real
// da section, ou rejeita um atributo de SVG que só existe com outra caixa no contrato.
test('atributo com grafia diferente da do contrato ainda é reconhecido, pela comparação sem caixa', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p Class="palco">C.</p>')), ['"palco" é classe do sistema: o autor não a escreve no fonte.']);
  assert.deepEqual(mensagens(aula('<section Data-Layout="conteudo" id="a"><h2>T</h2><p>C.</p></section>')), []);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><svg VIEWBOX="0 0 10 10" role="img" aria-label="d"></svg></figure>')), []);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p OnClick="x">C.</p>')), ['atributo "onclick" é proibido no corpo da aula.']);
});

// A mesma comparação sem caixa vale para as regras que leem fill/stroke/style por fora do laço de
// vocabulario.atributo: sem isso, vocabulario.atributo passaria a aceitar Fill/Style como conhecidos
// (corretamente) e a regra dona do valor (cor-svg/style) continuaria cega para a grafia do autor —
// pior que antes, silêncio em vez de mensagem confusa.
test('vocabulario.style e vocabulario.cor-svg também reconhecem o atributo com outra grafia', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p Style="color: red">C.</p>')), ['estilo em linha em <p>.']);
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<figure><svg viewBox="0 0 10 10"><rect Fill="#FF0000" width="5" height="5"/></svg></figure>')),
    ['fill="#FF0000" não é cor do contrato.'],
  );
});

test('fase chega ao contexto da regra: classe e atributo de fase 2 só valem quando fase 2 é pedida', () => {
  const grafico = slide('<h2>T</h2>\n<figure class="grafico"></figure>');
  assert.deepEqual(mensagens(grafico), ['classe "grafico" não existe no contrato.']);
  assert.deepEqual(mensagens(grafico, { fase: 2 }), []);

  const captura = slide('<h2>T</h2>\n<div class="demo" data-demo="x" data-captura-ms="500"></div>');
  assert.deepEqual(mensagens(captura), ['atributo "data-captura-ms" não vale em <div>.']);
  assert.deepEqual(mensagens(captura, { fase: 2 }), []);
});

test('fill="none" em qualquer caixa é aceito, como os tokens hexadecimais', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><svg viewBox="0 0 10 10"><rect fill="NONE" width="5" height="5"/></svg></figure>')), []);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><svg viewBox="0 0 10 10"><rect fill="None" width="5" height="5"/></svg></figure>')), []);
});

test('data-opcoes exige um objeto JSON, não qualquer JSON válido', () => {
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<div class="demo" data-demo="x" data-opcoes="42"></div>')),
    ['data-opcoes com valor não é um objeto JSON.'],
  );
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<div class="demo" data-demo="x" data-opcoes="[1,2,3]"></div>')),
    ['data-opcoes com valor não é um objeto JSON.'],
  );
  assert.deepEqual(
    mensagens(slide(`<h2>T</h2>\n<div class="demo" data-demo="x" data-opcoes='{"passo":5}'></div>`)),
    [],
  );
});
