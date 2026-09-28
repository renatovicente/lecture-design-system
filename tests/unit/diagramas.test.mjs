import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { Graphviz } from '@hpcc-js/wasm-graphviz';
import { tokens } from '../../tokens/tokens.js';
import {
  criarDesenhista, compilarDiagramas, desenharDiagramas, comPadroes, CLASSES_DO_DOT, CLASSES_DO_SVG,
} from '../../componentes/diagramas.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const graphviz = await Graphviz.load();
const desenhista = criarDesenhista({ graphviz });
const corpo = (html) => parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`).document.body;
const svgDe = (texto) => corpo(texto).firstElementChild;
const { tinta, azul, amarelo, papel } = tokens.cor;

// O exemplo literal da spec 7.2.
const EXEMPLO = 'digraph { rankdir=LR; entrada -> oculta -> saida; oculta [class="foco"]; }';

// Snapshot (spec 11.1: "especificações de gráfico e DOT convertidas em SVG, comparadas com
// snapshots"), capturado da primeira execução e conferido à mão contra a spec 7.2: três rect com
// contorno 2 em tinta, o do meio em amarelo; texto 20 em tinta; duas arestas de 2 px em tinta com a
// seta cheia. Complementa as asserções de propriedade abaixo — não as substitui: um snapshot
// sozinho fica verde com a cor errada no dia em que alguém o regravar.
const SNAPSHOT_EXEMPLO = '<svg viewBox="0 0 335.41 46.4" width="335.41" height="46.4" xmlns="http://www.w3.org/2000/svg" font-family="Geist, system-ui, sans-serif"><g class="aresta"><path d="M101.03,23.2C108.86,23.2 117.02,23.2 124.95,23.2" fill="none" stroke="#0A0A0A" stroke-width="2"></path><polygon points="136.35,23.2 124.95,27.19 124.95,19.21" fill="#0A0A0A"></polygon></g><g class="aresta"><path d="M219.01,23.2C226.89,23.2 235.22,23.2 243.34,23.2" fill="none" stroke="#0A0A0A" stroke-width="2"></path><polygon points="254.59,23.2 243.34,27.14 243.34,19.26" fill="#0A0A0A"></polygon></g><g class="no"><rect x="4" y="4" width="96.63" height="38.4" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="2"></rect><text x="52.32" y="29.2" fill="#0A0A0A" font-size="20" text-anchor="middle">entrada</text></g><g class="no foco"><rect x="136.64" y="4" width="82.17" height="38.4" fill="#FCB421" stroke="#0A0A0A" stroke-width="2"></rect><text x="177.72" y="29.2" fill="#0A0A0A" font-size="20" text-anchor="middle">oculta</text></g><g class="no"><rect x="254.8" y="4" width="76.62" height="38.4" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="2"></rect><text x="293.11" y="29.2" fill="#0A0A0A" font-size="20" text-anchor="middle">saida</text></g></svg>';

test('exemplo literal da spec 7.2: três nós retangulares, o de foco em campo amarelo, os outros em papel', () => {
  const { svg, nos } = desenhista.desenhar(EXEMPLO);
  assert.equal(nos, 3);
  const raiz = svgDe(svg);
  const nosSvg = [...raiz.querySelectorAll('g.no')];
  assert.deepEqual(nosSvg.map((g) => g.querySelector('text').textContent), ['entrada', 'oculta', 'saida']);
  assert.deepEqual(nosSvg.map((g) => g.querySelector('rect').getAttribute('fill')), [papel, amarelo, papel]);
  assert.deepEqual(nosSvg.map((g) => g.classList.contains('foco')), [false, true, false]);
  for (const g of nosSvg) {
    const caixa = g.querySelector('rect');
    assert.equal(caixa.getAttribute('stroke'), tinta, 'contorno em tinta');
    assert.equal(caixa.getAttribute('stroke-width'), '2', 'contorno de 2 px');
    assert.equal(g.querySelectorAll('ellipse, polygon, path').length, 0, 'nó retangular: nada além do rect');
  }
});

test('exemplo literal da spec 7.2: bate com o snapshot capturado', () => {
  assert.equal(desenhista.desenhar(EXEMPLO).svg, SNAPSHOT_EXEMPLO);
});

test('texto Geist 20 em tinta, em todo nó e rótulo de aresta — inclusive no nó em foco e na aresta ativa', () => {
  const { svg } = desenhista.desenhar('digraph { a [class="foco"]; a -> b [class="ativo" label="passa"]; }');
  const raiz = svgDe(svg);
  assert.equal(raiz.getAttribute('font-family'), tokens.fonte.sans.join(', '));
  const textos = [...raiz.querySelectorAll('text')];
  assert.deepEqual(textos.map((t) => t.textContent).sort(), ['a', 'b', 'passa']);
  for (const texto of textos) {
    assert.equal(texto.getAttribute('font-size'), '20', texto.textContent);
    assert.equal(texto.getAttribute('fill'), tinta, `${texto.textContent}: texto azul só a partir de 32 px (spec 4.2)`);
  }
});

test('aresta com class="ativo" sai em azul — traço e seta —, as demais em tinta, as duas de 2 px', () => {
  const { svg } = desenhista.desenhar('digraph { a -> b [class="ativo"]; b -> c; }');
  const [ativa, comum] = [...svgDe(svg).querySelectorAll('g.aresta')];
  assert.ok(ativa.classList.contains('ativo'));
  assert.ok(!comum.classList.contains('ativo'));
  for (const [g, cor] of [[ativa, azul], [comum, tinta]]) {
    const curva = g.querySelector('path');
    assert.equal(curva.getAttribute('stroke'), cor);
    assert.equal(curva.getAttribute('stroke-width'), '2');
    assert.equal(curva.getAttribute('fill'), 'none');
    assert.equal(g.querySelector('polygon').getAttribute('fill'), cor, 'a seta na cor da aresta');
  }
});

test('o estilo é imposto depois: forma, cor e espessura escritas no DOT não passam', () => {
  const { svg } = desenhista.desenhar('digraph { node [shape=ellipse color=red style=filled fillcolor=green penwidth=5]; edge [color=red penwidth=7 arrowhead=diamond]; a -> b; }');
  const raiz = svgDe(svg);
  assert.equal(raiz.querySelectorAll('ellipse').length, 0);
  assert.equal(raiz.querySelectorAll('g.no rect').length, 2);
  const cores = [...raiz.querySelectorAll('[fill], [stroke]')].flatMap((el) => [el.getAttribute('fill'), el.getAttribute('stroke')]).filter(Boolean);
  const permitidas = new Set([...contrato.svg.cores]);
  assert.deepEqual(cores.filter((cor) => !permitidas.has(cor)), [], 'toda cor do SVG está em contrato.svg.cores');
  assert.deepEqual([...raiz.querySelectorAll('[stroke-width]')].map((el) => el.getAttribute('stroke-width')).filter((v) => v !== '2'), []);
  assert.equal(raiz.querySelectorAll('g.aresta polygon').length, 1, 'a seta é sempre o triângulo simples, uma por aresta dirigida');
});

test('os nós contados são os do resultado compilado: "a -> b -> c" declara três nós sem listá-los', () => {
  assert.equal(desenhista.desenhar('digraph { a -> b -> c }').nos, 3);
  assert.equal(desenhista.desenhar('digraph { subgraph cluster_x { a; b } c }').nos, 3, 'agrupamento não é nó');
  assert.equal(desenhista.desenhar('digraph { }').nos, 0);
});

test('o SVG só leva elementos e atributos do vocabulário do contrato, sem <title>, comentário nem id', () => {
  const { svg } = desenhista.desenhar('digraph { subgraph cluster_0 { label="grupo"; a; b } a -> b [label="x"]; b -> c [dir=both]; }');
  assert.ok(!svg.includes('<!--'), 'sem comentário');
  const raiz = svgDe(svg);
  const elementos = new Set([raiz, ...raiz.querySelectorAll('*')].map((el) => el.localName));
  assert.deepEqual([...elementos].filter((nome) => !contrato.svg.elementos.includes(nome)), []);
  assert.equal(raiz.querySelectorAll('title, [id]').length, 0);
  // font-family fica de fora do contrato de propósito, como no SVG dos gráficos: é o sistema quem o
  // escreve, e o autor não o escreve num svg à mão (vocabulario.atributo acusaria).
  const atributos = new Set([raiz, ...raiz.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((a) => a.name)));
  assert.deepEqual([...atributos].filter((nome) => !contrato.svg.atributos.includes(nome) && nome !== 'font-family'), []);
});

test('toda classe que o SVG leva é do sistema (contrato.classesDoSistema), e as do DOT atravessam com o mesmo nome', () => {
  assert.deepEqual(CLASSES_DO_SVG.filter((nome) => !contrato.classesDoSistema.includes(nome)), []);
  const { svg } = desenhista.desenhar('digraph { subgraph cluster_0 { a [class="foco"] } a -> b [class="ativo"] }');
  const raiz = svgDe(svg);
  const usadas = new Set([...raiz.querySelectorAll('[class]')].flatMap((el) => [...el.classList]));
  assert.deepEqual([...usadas].filter((nome) => !CLASSES_DO_SVG.includes(nome)), []);
  for (const nome of [...CLASSES_DO_DOT.no, ...CLASSES_DO_DOT.aresta]) assert.ok(usadas.has(nome), nome);
});

test('classe fora do vocabulário do DOT é erro com o nome dela, e foco numa aresta também', () => {
  assert.throws(() => desenhista.desenhar('digraph { a [class="destaque"] }'), /classe "destaque" no nó "a"/);
  assert.throws(() => desenhista.desenhar('digraph { a -> b [class="foco"] }'), /classe "foco" na aresta "a → b"/);
  assert.throws(() => desenhista.desenhar('digraph { a [class="ativo"] }'), /classe "ativo" no nó "a"/);
});

test('DOT que não compila lança com a mensagem do próprio Graphviz, com a linha do autor', () => {
  assert.throws(() => desenhista.desenhar('digraph {\n  a ->\n}'), (erro) => {
    assert.match(erro.message, /^o Graphviz não compila o DOT: syntax error in line 3 near '}'$/);
    return true;
  });
});

test('comPadroes põe os padrões logo depois do { que abre o corpo, não de um { dentro do nome', () => {
  assert.match(comPadroes('digraph "a{b" { x }'), /^digraph "a\{b" \{ graph \[/);
  assert.match(comPadroes('/* { */ digraph { x }'), /^\/\* \{ \*\/ digraph \{ graph \[/);
  assert.equal(comPadroes('nada'), 'nada');
  assert.ok(!comPadroes('digraph {\n a\n}').split('\n')[0].includes('\n'), 'os padrões não mudam o número das linhas');
  assert.equal(comPadroes('digraph {\n a\n}').split('\n').length, 3);
});

test('rodar duas vezes dá o mesmo texto, byte a byte (a comparação visual depende disso)', () => {
  const dot = 'digraph { rankdir=TB; a -> {b c d}; b -> e; c -> e; d -> e [class="ativo"]; e [class="foco" label="saída"] }';
  assert.equal(desenhista.desenhar(dot).svg, desenhista.desenhar(dot).svg);
});

test('texto do autor sai escapado', () => {
  const { svg } = desenhista.desenhar('digraph { a [label="x & <y> \\"z\\""] }');
  assert.ok(svg.includes('x &amp; &lt;y&gt; &quot;z&quot;'), svg);
});

const FIGURAS = `
<figure class="diagrama"><script type="text/vnd.graphviz">${EXEMPLO}</script><figcaption>Rede.</figcaption></figure>
<figure class="diagrama"><script type="text/vnd.graphviz">digraph { a -> }</script></figure>
<figure class="diagrama"><figcaption>sem script</figcaption></figure>`;

test('compilarDiagramas relata nós e erros por figura, sem tocar no documento', () => {
  const raiz = corpo(FIGURAS);
  const antes = raiz.innerHTML;
  const relato = compilarDiagramas(raiz, { desenhista });
  assert.equal(raiz.innerHTML, antes);
  assert.equal(relato.length, 2, 'a figura sem script fica de fora (estrutura.obrigatorio já acusa)');
  assert.equal(relato[0].nos, 3);
  assert.equal(relato[0].figura, raiz.querySelectorAll('figure')[0]);
  assert.equal(relato[0].mensagem, undefined);
  assert.equal(relato[1].trecho, 'digraph { a -> }');
  assert.match(relato[1].mensagem, /syntax error in line 1 near '\}'/);
  assert.equal(relato[1].nos, undefined);
});

test('desenharDiagramas acrescenta o SVG depois do script (o script fica), preserva a figcaption e é idempotente', () => {
  const raiz = corpo(FIGURAS);
  const relato = desenharDiagramas(raiz, { desenhista });
  const [primeira, segunda] = raiz.querySelectorAll('figure');
  assert.deepEqual([...primeira.children].map((el) => el.localName), ['script', 'svg', 'figcaption']);
  assert.equal(primeira.querySelector('svg').namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(segunda.querySelector('svg'), null, 'DOT inválido: nada desenhado');
  assert.deepEqual(relato.map((r) => [r.nos, Boolean(r.mensagem)]), [[3, false], [undefined, true]]);
  const deNovo = desenharDiagramas(raiz, { desenhista });
  assert.equal(primeira.querySelectorAll('svg').length, 1);
  assert.equal(deNovo.length, 1, 'só a que ainda não tem SVG é tentada de novo');
});
