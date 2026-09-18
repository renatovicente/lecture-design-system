// Regras de limite (spec 5.2, 5.3 e 9.2): os números vêm do contrato, o código só conta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar } from '../../validador/validar.js';
import { regras as limites, segmentosDoTitulo, palavrasDe } from '../../validador/regras/limites.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>`;

const aula = (corpo) => `${CABECA}\n${corpo}\n</body></html>`;
const slide = (dentro) => aula(`<section data-layout="conteudo" id="a">\n${dentro}\n</section>`);
const repetir = (texto, vezes) => Array.from({ length: vezes }, () => texto).join(' ');

function rodar(html) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras: limites, grupo: 'estatica' });
}

const mensagens = (html) => rodar(html).map((achado) => achado.mensagem);

test('um slide dentro dos limites não acusa nada', () => {
  assert.deepEqual(mensagens(slide('<h2>Título</h2>\n<p class="lide">Lide.</p>\n<p>Corpo.</p>')), []);
});

test('o título conta por segmento, pelo texto que aparece', () => {
  const { document } = parseHTML(slide('<h2>Um<br>Dois</h2>'));
  assert.deepEqual(segmentosDoTitulo(document.querySelector('h2')), ['Um', 'Dois']);
  // TeX conta pelo texto renderizado: \frac{1}{2} vale "1/2", não doze caracteres de fonte.
  const comTex = parseHTML(slide('<h2>Taxa \\(\\frac{1}{2}\\)</h2>')).document;
  assert.deepEqual(segmentosDoTitulo(comTex.querySelector('h2')), ['Taxa 1/2']);
});

test('título longo e título com três segmentos', () => {
  assert.deepEqual(
    mensagens(slide('<h2>Um título bem longo que passa dos cinquenta caracteres previstos</h2>\n<p>C.</p>')),
    ['título com 64 caracteres num segmento (máx. 50).'],
  );
  assert.deepEqual(
    mensagens(slide('<h2>Um<br>Dois<br>Três</h2>\n<p>C.</p>')),
    ['título em 3 segmentos (máx. 2).'],
  );
});

test('cada layout tem o seu limite de título', () => {
  assert.deepEqual(mensagens(aula('<section data-layout="capa"><h1>Espécime Aula USP demais</h1></section>')),
    ['título com 24 caracteres num segmento (máx. 23).']);
  // A abertura para em 20, e 20 cabe: o limite é "no máximo", não "menos que".
  assert.deepEqual(mensagens(aula('<section data-layout="abertura" id="b"><h2>Retropropagação hoje</h2></section>')), []);
  assert.deepEqual(mensagens(aula('<section data-layout="abertura" id="b"><h2>Retropropagação hoje!</h2></section>')),
    ['título com 21 caracteres num segmento (máx. 20).']);
});

test('palavras do corpo e da coluna, sem contar código nem notas', () => {
  const { document } = parseHTML(slide('<p>uma duas três</p><pre data-lang="python">x = 1</pre><aside class="notas">nota longa aqui</aside>'));
  assert.equal(palavrasDe(document.querySelector('section')), 3);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<p>${repetir('palavra', 95)}</p>`)), ['95 palavras no corpo (máx. 90).']);
  assert.deepEqual(
    mensagens(slide(`<h2>T</h2>\n<div class="colunas" data-grade="6-6"><div><p>${repetir('palavra', 61)}</p></div><div><p>B</p></div></div>`)),
    ['61 palavras numa coluna (máx. 60).'],
  );
});

test('lista, destaques e alertas', () => {
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<ul>${repetir('<li>Item.</li>', 6)}</ul>`)), ['lista com 6 itens (máx. 5).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n${repetir('<aside class="destaque">D.</aside>', 3)}`)), ['3 destaques no slide (máx. 2).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n${repetir('<aside class="alerta">A.</aside>', 2)}`)), ['2 alertas no slide (máx. 1).']);
});

test('os limites de comprimento de texto', () => {
  assert.deepEqual(mensagens(aula(`<section data-layout="abertura" id="b"><h2>Um</h2><p class="pergunta">${repetir('pergunta', 13)}</p></section>`)),
    ['a pergunta tem 116 caracteres (máx. 90).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<p class="lide">${repetir('lide', 31)}</p>\n<p>C.</p>`)),
    ['o lide tem 154 caracteres (máx. 120).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<figure><img src="img/a.png" alt="a"><figcaption>${repetir('legenda', 21)}</figcaption></figure>`)),
    ['a legenda tem 167 caracteres (máx. 140).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<aside class="destaque" data-rotulo="${repetir('rotulo', 5)}">D.</aside>`)),
    ['rótulo com 34 caracteres (máx. 24).']);
});

test('síntese: itens demais e item longo demais', () => {
  const fim = (dentro) => aula(`<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese">${dentro}</ol></section>`);
  assert.deepEqual(mensagens(fim(repetir('<li>Item.</li>', 4))), ['síntese com 4 itens (máx. 3).']);
  assert.deepEqual(mensagens(fim(`<li>${repetir('sintese', 12)}</li>`)), ['item da síntese com 95 caracteres (máx. 80).']);
});

test('código: linhas e colunas, contadas como o navegador conta', () => {
  const codigo = Array.from({ length: 17 }, (_, k) => `x${k} = 1`).join('\n');
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">${codigo}</pre>`)), ['bloco com 17 linhas de código (máx. 16).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">x = "${'a'.repeat(70)}"</pre>`)), ['linha de código com 76 colunas (máx. 64).']);
  // codigoDoBloco tira as linhas vazias do começo e do fim: dezesseis linhas com quebras sobrando passam.
  const dezesseis = `\n\n${Array.from({ length: 16 }, (_, k) => `x${k} = 1`).join('\n')}\n\n`;
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">${dezesseis}</pre>`)), []);
});

test('tabela: linhas de dados e colunas, contando colspan', () => {
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<table><tbody>${repetir('<tr><td>a</td></tr>', 9)}</tbody></table>`)),
    ['tabela com 9 linhas de dados (máx. 8).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<table><tbody><tr>${repetir('<td>a</td>', 7)}</tr></tbody></table>`)),
    ['tabela com 7 colunas (máx. 6).']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<table><tbody><tr><td colspan="7">a</td></tr></tbody></table>')),
    ['tabela com 7 colunas (máx. 6).']);
  // O cabeçalho não é linha de dados.
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<table><thead><tr><th>h</th></tr></thead><tbody>${repetir('<tr><td>a</td></tr>', 8)}</tbody></table>`)), []);
});

test('metadado longo demais', () => {
  assert.deepEqual(mensagens(aula('<section data-layout="capa"><h1>Capa</h1></section>').replace('content="Teste"', `content="${repetir('disciplina', 7)}"`)),
    ['a meta "disciplina" tem 76 caracteres (máx. 60).']);
});

// Fix round 1 (revisão pós-Task 2): três críticos medidos pelo controlador.

test('palavrasDe soma por nó de texto, sem colar elementos vizinhos sem espaço', () => {
  // <br> não deixa texto: "Uma" e "Duas Tres" são dois nós de texto, não um "UmaDuas Tres" colado.
  const { document: comBr } = parseHTML(slide('<p>Uma<br>Duas Tres</p>'));
  assert.equal(palavrasDe(comBr.querySelector('p')), 3);
  // Sem espaço no fonte entre </h2> e <p>, textContent do galho inteiro colaria "T" com "palavra".
  const { document: grudado } = parseHTML(slide('<h2>T</h2><p>palavra</p>'));
  assert.equal(palavrasDe(grudado.querySelector('section')), 2);
});

test('palavras-corpo conta só os blocos de corpo: nem o lide nem a estrutura do título entram na conta', () => {
  // No limite com um lide no meio: o lide tem limite próprio (limites.lide) e não deveria comer o
  // orçamento do corpo.
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<p class="lide">Lide.</p>\n<p>${repetir('palavra', 90)}</p>`)), []);
  // Título em duas linhas: a contagem por construção descarta o <h2> inteiro, então a forma interna
  // do título (quantos <br> tem) não pode mascarar um corpo realmente acima do limite.
  assert.deepEqual(
    mensagens(slide(`<h2>Um<br>Dois</h2>\n<p>${repetir('palavra', 91)}</p>`)),
    ['91 palavras no corpo (máx. 90).'],
  );
});

test('tabela: rowspan soma à linha que herda a coluna', () => {
  // Linha 1 tem 2 células (uma com rowspan=2); linha 2 tem 6 células soltas mas herda a coluna da
  // linha 1, então a largura real é 7, não max(2, 6) = 6.
  const html = slide(`<h2>T</h2>\n<table><tbody><tr><td rowspan="2">a</td><td>b</td></tr><tr>${repetir('<td>c</td>', 6)}</tr></tbody></table>`);
  assert.deepEqual(mensagens(html), ['tabela com 7 colunas (máx. 6).']);
});

test('título com <br> solto ou no final não cria segmento fantasma', () => {
  const { document } = parseHTML(slide('<h2>Um<br>Dois<br></h2>'));
  assert.deepEqual(segmentosDoTitulo(document.querySelector('h2')), ['Um', 'Dois']);
  assert.deepEqual(mensagens(slide('<h2>Um<br>Dois<br></h2>\n<p>C.</p>')), []);
});

test('limites de contagem: exatamente no limite passa, um a mais acusa', () => {
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<p>${repetir('palavra', 90)}</p>`)), []);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<p>${repetir('palavra', 91)}</p>`)), ['91 palavras no corpo (máx. 90).']);

  assert.deepEqual(
    mensagens(slide(`<h2>T</h2>\n<div class="colunas" data-grade="6-6"><div><p>${repetir('palavra', 60)}</p></div><div><p>B</p></div></div>`)),
    [],
  );
  assert.deepEqual(
    mensagens(slide(`<h2>T</h2>\n<div class="colunas" data-grade="6-6"><div><p>${repetir('palavra', 61)}</p></div><div><p>B</p></div></div>`)),
    ['61 palavras numa coluna (máx. 60).'],
  );

  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<ul>${repetir('<li>Item.</li>', 5)}</ul>`)), []);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<ul>${repetir('<li>Item.</li>', 6)}</ul>`)), ['lista com 6 itens (máx. 5).']);

  const fim = (dentro) => aula(`<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese">${dentro}</ol></section>`);
  assert.deepEqual(mensagens(fim(repetir('<li>Item.</li>', 3))), []);
  assert.deepEqual(mensagens(fim(repetir('<li>Item.</li>', 4))), ['síntese com 4 itens (máx. 3).']);
});

test('limites de código e tabela: exatamente no limite passa, um a mais acusa', () => {
  const linhas = (n) => Array.from({ length: n }, (_, k) => `x${k} = 1`).join('\n');
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">${linhas(16)}</pre>`)), []);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">${linhas(17)}</pre>`)), ['bloco com 17 linhas de código (máx. 16).']);

  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">x = "${'a'.repeat(58)}"</pre>`)), []);
  assert.deepEqual(
    mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">x = "${'a'.repeat(59)}"</pre>`)),
    ['linha de código com 65 colunas (máx. 64).'],
  );

  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<table><tbody>${repetir('<tr><td>a</td></tr>', 8)}</tbody></table>`)), []);
  assert.deepEqual(
    mensagens(slide(`<h2>T</h2>\n<table><tbody>${repetir('<tr><td>a</td></tr>', 9)}</tbody></table>`)),
    ['tabela com 9 linhas de dados (máx. 8).'],
  );

  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<table><tbody><tr>${repetir('<td>a</td>', 6)}</tr></tbody></table>`)), []);
  assert.deepEqual(
    mensagens(slide(`<h2>T</h2>\n<table><tbody><tr>${repetir('<td>a</td>', 7)}</tr></tbody></table>`)),
    ['tabela com 7 colunas (máx. 6).'],
  );
});
