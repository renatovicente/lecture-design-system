// O localizador de `section`s por intervalo de bytes (spec 2026-09-28, 5.1; plano do corrigir, D1).
// A garantia central de `aula-usp slide --substituir`: fora do intervalo trocado, o arquivo fica
// idêntico byte a byte. Por isso o localizador trabalha sobre o TEXTO, e não sobre um DOM: um
// parser reescreve aspas, espaços e atributos, e o que ele devolve não é o que o autor escreveu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localizarSecoes, resolverAlvo, substituirSecao } from '../../build/secoes.mjs';
import { lerAula } from '../../build/validar.mjs';
import { slidesDoFonte } from '../../validador/validar.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const contrato = JSON.parse(readFileSync(join(RAIZ, 'contrato/contrato.json'), 'utf8'));

// O universo das propriedades é a lista de arquivos no DISCO — todo .html de especime/, todo
// index.html de exemplos/*/ e o do modelo —, e não o que o localizador acha: um deck em que ele não
// achasse nada teria de cair na concordância, e não sumir do teste.
const DECKS = [
  ...readdirSync(join(RAIZ, 'especime')).filter((nome) => nome.endsWith('.html')).map((nome) => `especime/${nome}`),
  ...readdirSync(join(RAIZ, 'exemplos'), { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory() && existsSync(join(RAIZ, 'exemplos', entrada.name, 'index.html')))
    .map((entrada) => `exemplos/${entrada.name}/index.html`),
  'modelos/aula/index.html',
];

const ler = (relativo) => readFileSync(join(RAIZ, relativo), 'utf8');

test('o universo das propriedades não está vazio: espécime, exemplos e modelo', () => {
  assert.ok(DECKS.filter((d) => d.startsWith('especime/')).length >= 7, DECKS.join(', '));
  assert.ok(DECKS.filter((d) => d.startsWith('exemplos/')).length >= 2, DECKS.join(', '));
  assert.ok(DECKS.includes('modelos/aula/index.html'));
});

test('o intervalo vai do < de <section até o > de </section>, sem o espaço em volta', () => {
  const texto = '<body>\n  <section id="a"><h2>A</h2></section>\n</body>';
  const [secao] = localizarSecoes(texto);
  assert.equal(texto.slice(secao.inicio, secao.fim), '<section id="a"><h2>A</h2></section>');
  assert.equal(secao.id, 'a');
  assert.equal(secao.linha, 2);
});

test('um comentário com </section> dentro não fecha a section', () => {
  const texto = '<section id="a"><!-- antes era </section> aqui --><p>x</p></section>\n<section id="b"></section>';
  const secoes = localizarSecoes(texto);
  assert.deepEqual(secoes.map((s) => s.id), ['a', 'b']);
  assert.ok(texto.slice(secoes[0].inicio, secoes[0].fim).endsWith('<p>x</p></section>'));
});

test('um comentário com <section dentro não abre section nenhuma', () => {
  const texto = '<!-- <section id="velha"> --><section id="a"></section>';
  assert.deepEqual(localizarSecoes(texto).map((s) => s.id), ['a']);
});

test('um script JSON com </section> dentro não fecha a section', () => {
  const texto = '<section id="g"><figure class="grafico"><script type="application/json">{"t": "</section>"}</script></figure></section>';
  const [secao] = localizarSecoes(texto);
  assert.equal(secao.fim, texto.length);
});

test('um style com <section dentro não abre section nenhuma', () => {
  const texto = '<style>/* <section> */</style><section id="a"></section>';
  assert.deepEqual(localizarSecoes(texto).map((s) => s.id), ['a']);
});

test('atributos com aspas simples e duplas, inclusive com > dentro do valor', () => {
  const texto = `<section data-layout='conteudo' title="a > b" id='x'><p>1</p></section><section id="y" data-curto='c>d'></section>`;
  const secoes = localizarSecoes(texto);
  assert.deepEqual(secoes.map((s) => s.id), ['x', 'y']);
  assert.equal(texto.slice(secoes[0].inicio, secoes[0].fim), `<section data-layout='conteudo' title="a > b" id='x'><p>1</p></section>`);
});

test('<SECTION> em maiúsculas conta, e <sectionx> não', () => {
  const texto = '<SECTION ID="a"></SECTION>\n<sectionx id="n"></sectionx><Section id="b"></Section >';
  assert.deepEqual(localizarSecoes(texto).map((s) => s.id), ['a', 'b']);
});

test('section sem id devolve id null', () => {
  assert.equal(localizarSecoes('<section data-layout="capa"></section>')[0].id, null);
});

test('section dentro de section é recusada, com a linha', () => {
  assert.throws(() => localizarSecoes('<section id="a">\n\n<section id="b"></section></section>'),
    /section dentro de section na linha 3/);
});

test('section sem fechamento e </section> sobrando são recusados, com a linha', () => {
  assert.throws(() => localizarSecoes('<p>\n<section id="a">'), /linha 2/);
  assert.throws(() => localizarSecoes('<p></p>\n\n</section>'), /linha 3/);
});

test('CRLF: o intervalo e a linha valem, e o \\r fica fora da fatia', () => {
  const texto = '<body>\r\n<section id="a">\r\n<h2>A</h2>\r\n</section>\r\n<section id="b"></section>\r\n</body>';
  const secoes = localizarSecoes(texto);
  assert.deepEqual(secoes.map((s) => [s.id, s.linha]), [['a', 2], ['b', 5]]);
  assert.equal(texto.slice(secoes[0].inicio, secoes[0].fim), '<section id="a">\r\n<h2>A</h2>\r\n</section>');
  assert.equal(substituirSecao(texto, secoes, 0, texto.slice(secoes[0].inicio, secoes[0].fim)), texto);
});

test('resolverAlvo: id existente ganha de posição; número sem id igual é posição; fora é -1', () => {
  const secoes = [{ id: null }, { id: '1' }, { id: 'abc' }, { id: null }];
  assert.equal(resolverAlvo(secoes, 'abc'), 2);
  assert.equal(resolverAlvo(secoes, '1'), 1); // o id "1" existe: ganha da posição 1
  assert.equal(resolverAlvo(secoes, '4'), 3);
  assert.equal(resolverAlvo(secoes, '0'), -1);
  assert.equal(resolverAlvo(secoes, '5'), -1);
  assert.equal(resolverAlvo(secoes, 'nada'), -1);
  assert.equal(resolverAlvo(secoes, 3), 2);
});

// Propriedade 1: a numeração de `slide <n>` é a de `validar`, `avaliar` e do motor.
for (const deck of DECKS) {
  test(`concordância com slidesDoFonte: ${deck}`, () => {
    const texto = ler(deck);
    const secoes = localizarSecoes(texto);
    const doDom = slidesDoFonte(lerAula(join(RAIZ, deck), contrato).body);
    assert.ok(doDom.length > 0, `${deck} sem slides`);
    assert.equal(secoes.length, doDom.length, `${deck}: ${secoes.length} pelo localizador, ${doDom.length} pelo DOM`);
    assert.deepEqual(secoes.map((s) => s.id), doDom.map((secao) => secao.getAttribute('id') || null));
  });
}

// Propriedade 2: trocar cada section por ela mesma devolve o arquivo original byte a byte.
for (const deck of DECKS) {
  test(`identidade byte a byte: ${deck}`, () => {
    const texto = ler(deck);
    const secoes = localizarSecoes(texto);
    for (let k = 0; k < secoes.length; k++) {
      const mesma = texto.slice(secoes[k].inicio, secoes[k].fim);
      assert.equal(substituirSecao(texto, secoes, k, mesma), texto, `${deck}, section ${k + 1}`);
    }
  });
}

// Propriedade 3: só o intervalo muda.
for (const deck of DECKS) {
  test(`só o intervalo muda: ${deck}`, () => {
    const texto = ler(deck);
    const secoes = localizarSecoes(texto);
    const MARCADOR = '<section id="marcador-do-teste"></section>';
    for (let k = 0; k < secoes.length; k++) {
      const { inicio, fim } = secoes[k];
      const novo = substituirSecao(texto, secoes, k, MARCADOR);
      assert.equal(novo.slice(0, inicio), texto.slice(0, inicio));
      assert.equal(novo.slice(inicio + MARCADOR.length), texto.slice(fim));
      assert.equal(novo.split(MARCADOR).length - 1, 1, `${deck}, section ${k + 1}`);
      assert.equal(novo.length, texto.length - (fim - inicio) + MARCADOR.length);
    }
  });
}
