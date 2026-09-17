import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { createShikiPrimitive, codeToTokensBase } from '@shikijs/primitive';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import python from '@shikijs/langs/python';
import r from '@shikijs/langs/r';
import sql from '@shikijs/langs/sql';
import javascript from '@shikijs/langs/javascript';
import bash from '@shikijs/langs/bash';
import json from '@shikijs/langs/json';
import latex from '@shikijs/langs/latex';
import { linhasMarcadas, codigoDoBloco, criarDestacador, renderizarCodigo } from '../../componentes/codigo.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const destacador = criarDestacador({
  createShikiPrimitive,
  codeToTokensBase,
  createJavaScriptRegexEngine,
  gramaticas: { python, r, sql, javascript, bash, json, latex },
});
const corpo = (html) => parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`).document.body;

test('linhasMarcadas lê números e intervalos de data-linhas e deixa de fora o que não segue a forma', () => {
  assert.deepEqual([...linhasMarcadas('3-5,8')], [3, 4, 5, 8]);
  assert.deepEqual([...linhasMarcadas(' 2 , 4-4 ')], [2, 4]);
  assert.deepEqual([...linhasMarcadas('5-3,a,1-')], []);
  assert.deepEqual([...linhasMarcadas(null)], []);
});

test('codigoDoBloco tira as linhas vazias do começo e do fim e normaliza \\r\\n, como o navegador e o build veem o mesmo bloco', () => {
  assert.equal(codigoDoBloco({ textContent: '\r\n\nx = 1\r\n\r\ny = 2\n\n' }), 'x = 1\n\ny = 2');
});

test('o destacador cobre as linguagens do contrato: palavras-chave em negrito, operadores de símbolo não, comentários à parte', () => {
  assert.deepEqual([...destacador.linguagens], contrato.linguagens);
  const exemplos = {
    python: ['import numpy as np\ndef passo(w, g):\n    if w is None and not g:\n        return w - 0.1 * g  # desce',
      ['import', 'as', 'def', 'if', 'is', 'None', 'and', 'not', 'return'], ['# desce']],
    r: ['passo <- function(w, g) {\n  if (is.null(w)) return(NULL)  # vazio\n  w - 0.1 * g\n}',
      ['function', 'if', 'return', 'NULL'], ['# vazio']],
    sql: ['SELECT nome, AVG(nota) AS media\nFROM notas  -- por aluno\nWHERE nota >= 5\nGROUP BY nome;',
      ['SELECT', 'AS', 'FROM', 'WHERE', 'GROUP BY'], ['-- por aluno']],
    javascript: ['const passo = (w, g) => w - 0.1 * g;  // desce\nif (w === null) throw new Error("sem peso");',
      ['const', 'if', 'null', 'throw', 'new'], ['// desce']],
    bash: ['for f in *.csv; do\n  if [ -f "$f" ]; then wc -l "$f"; fi  # conta\ndone',
      ['for', 'in', 'do', 'if', 'then', 'fi', 'done'], ['# conta']],
    json: ['{\n  "taxa": 0.1,\n  "ativo": true,\n  "peso": null\n}', ['true', 'null'], []],
    // No LaTeX, todo comando é palavra-chave, com a barra.
    latex: ['\\begin{equation}\n  \\frac{\\partial E}{\\partial w} % gradiente\n\\end{equation}',
      ['\\begin', '\\frac', '\\partial', '\\partial', '\\end'], ['% gradiente']],
  };
  for (const [linguagem, [codigo, chaves, comentarios]] of Object.entries(exemplos)) {
    const pedacos = destacador.linhas(codigo, linguagem).flat();
    const doTipo = (tipo) => pedacos.filter((pedaco) => pedaco.tipo === tipo).map((pedaco) => pedaco.texto);
    assert.deepEqual(doTipo('palavra-chave'), chaves, linguagem);
    assert.deepEqual(doTipo('comentario'), comentarios, linguagem);
  }
});

test('etiqueta de JSDoc é negrito dentro de um comentário, e continua comentário', () => {
  const pedacos = destacador.linhas('/**\n * @param {number} w peso\n */\nfunction f(w) { return w; }', 'javascript').flat();
  const doTipo = (tipo) => pedacos.filter((pedaco) => pedaco.tipo === tipo).map((pedaco) => pedaco.texto.trim());
  assert.deepEqual(doTipo('palavra-chave'), ['function', 'return']);
  assert.deepEqual(doTipo('comentario'), ['/**', '*', '@param', '{number} w peso', '*/']);
});

test('renderizarCodigo troca o texto de pre[data-lang] por linhas, marca as de data-linhas e mantém as vazias do meio', () => {
  const raiz = corpo('<pre data-lang="python" data-linhas="1,3">\nx = 1  # um\n\nif x:\n    y = 2\n\n</pre>');
  assert.deepEqual(renderizarCodigo(raiz, { destacador }), []);
  const linhas = [...raiz.querySelectorAll('pre > span.linha')];
  assert.deepEqual(linhas.map((linha) => linha.textContent), ['x = 1  # um', '', 'if x:', '    y = 2']);
  assert.equal(raiz.querySelector('pre').textContent, 'x = 1  # um\n\nif x:\n    y = 2', 'o texto do bloco continua sendo o código');
  assert.deepEqual(linhas.map((linha) => linha.className), ['linha marcada', 'linha', 'linha marcada', 'linha']);
  assert.equal(raiz.querySelector('.linha .comentario').textContent, '# um');
  assert.equal(raiz.querySelector('.linha .palavra-chave').textContent, 'if');
});

test('renderizarCodigo aceita code dentro de pre, guarda <, > e & como texto e não toca pre sem data-lang', () => {
  const raiz = corpo('<pre data-lang="javascript"><code>if (a &lt; b &amp;&amp; c) f();</code></pre><pre>sem linguagem</pre>');
  assert.deepEqual(renderizarCodigo(raiz, { destacador }), []);
  const bloco = raiz.querySelector('pre[data-lang]');
  assert.equal(bloco.textContent, 'if (a < b && c) f();');
  assert.equal(bloco.querySelector('code'), null);
  assert.equal(raiz.querySelector('pre:not([data-lang])').innerHTML, 'sem linguagem');
});

test('linguagem fora da lista vira erro, e o bloco sai em linhas sem destaque, ainda com as linhas marcadas', () => {
  const raiz = corpo('<pre data-lang="cobol" data-linhas="2">MOVE 1 TO X.\nDISPLAY X.</pre>');
  assert.deepEqual(renderizarCodigo(raiz, { destacador }), [{ linguagem: 'cobol', mensagem: 'linguagem fora da lista em data-lang: "cobol"' }]);
  assert.deepEqual([...raiz.querySelectorAll('.linha')].map((linha) => `${linha.className}|${linha.textContent}`),
    ['linha|MOVE 1 TO X.', 'linha marcada|DISPLAY X.']);
  assert.equal(raiz.querySelectorAll('.palavra-chave, .comentario').length, 0);
});

test('renderizarCodigo é idempotente: uma segunda passada não muda nada', () => {
  const raiz = corpo('<pre data-lang="bash" data-linhas="1">echo "oi"  # saúda\n</pre><pre data-lang="cobol">X</pre>');
  renderizarCodigo(raiz, { destacador });
  const antes = raiz.innerHTML;
  assert.deepEqual(renderizarCodigo(raiz, { destacador }), []);
  assert.equal(raiz.innerHTML, antes);
});
