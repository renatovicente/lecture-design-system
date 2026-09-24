// Gráfico com `dados` em CSV no navegador (pendência 1 da fase 2a). Até aqui só o build lia o CSV:
// o runtime de desenvolvimento — o que `servir` mostra e o que `validar` e a etapa 5 do build medem —
// deixava a figura vazia, e a composição não via o gráfico. Medido antes da mudança, com decks no
// scratchpad: numa coluna 4-4-4, `validar` e `build` saíam com 0 erros e o SVG construído tinha 16
// textos a 8 px no palco; o mesmo gráfico com dados inline dava 16 erros de tamanho-minimo.
//
// O que este arquivo mede, cada um contra a mudança desfeita (relatório da pendência):
//   1. `servir` desenha o gráfico com CSV, e o SVG é o mesmo que o build grava — um leitor só;
//   2. um CSV que não carrega é recursos.csv no painel, não só uma linha no console;
//   3. `validar` (com Chrome) e `build` acusam o gráfico com CSV numa coluna estreita exatamente como
//      acusam o mesmo gráfico com dados inline;
//   4. o pacote de dist/ passa pelo mesmo caminho, e o CSV é o único pedido que não é script.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import { RAIZ, iniciarChrome, servirPasta, servirPastaCrua, esperarMontagem } from './utilitarios.mjs';
import { build } from '../../build/build.mjs';
import { validarArquivo } from '../../build/validar.mjs';
import { lerCsv } from '../../componentes/csv.js';

const PASTA = 'tests/fixtures/grafico-csv';
const CSV = await readFile(new URL(`${PASTA}/data/erro.csv`, RAIZ), 'utf8');

let navegador;
let dev;
let cru;
before(async () => {
  navegador = await iniciarChrome();
  dev = await servirPasta(PASTA);
  cru = await servirPastaCrua('.');
});
after(async () => {
  await navegador?.close();
  await dev?.fechar();
  await cru?.fechar();
});

async function abrir(url, { csv404 = false } = {}) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const pedidos = [];
  const erros = [];
  pagina.on('request', (pedido) => pedidos.push(pedido.url()));
  pagina.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) erros.push(m.text()); });
  if (csv404) await pagina.route('**/data/erro.csv', (rota) => rota.fulfill({ status: 404, body: 'não' }));
  await pagina.goto(url);
  await esperarMontagem(pagina);
  const estado = await pagina.evaluate(() => ({
    titulo: document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent,
    achados: [...document.querySelectorAll('[data-painel="validador"] .achados li')].map((li) => li.textContent),
    svg: document.querySelector('figure.grafico svg')?.outerHTML ?? null,
  }));
  await pagina.close();
  return { ...estado, pedidos, erros };
}

// A forma do SVG, sem depender de como cada lado serializa: elemento, atributos em ordem alfabética
// e texto, nó a nó. A igualdade que importa é a do desenho, não a da serialização.
function formaDoSvg(html) {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  return [...document.querySelectorAll('svg, svg *')].map((no) => [
    no.localName,
    [...no.attributes].map((a) => `${a.name}=${a.value}`).sort().join(' '),
    [...no.childNodes].filter((filho) => filho.nodeType === 3).map((filho) => filho.data).join(''),
  ]);
}

test('servir desenha o gráfico com CSV, e é o mesmo SVG que o build grava', async () => {
  const { titulo, svg, pedidos } = await abrir(`${dev.endereco}/index.html`);
  assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.ok(svg, 'a figura com CSV ficou sem SVG no runtime de desenvolvimento');
  assert.ok(pedidos.some((url) => url === `${dev.endereco}/data/erro.csv`), `o CSV não foi pedido relativo ao documento: ${pedidos.join(', ')}`);
  // As duas séries do CSV, com o foco em azul: é o CSV que chegou ao desenho.
  assert.match(svg, /data-serie="treino" data-cor="tinta"/);
  assert.match(svg, /data-serie="teste" data-cor="azul"/);

  const destino = await mkdtemp(join(tmpdir(), 'grafico-csv-'));
  const construido = await build({ raiz: RAIZ, caminhoDaAula: new URL(`${PASTA}/index.html`, RAIZ), destino, semPdf: true });
  assert.equal(construido.codigo, 0, JSON.stringify(construido.achados));
  const [nome] = (await readdir(destino)).filter((arquivo) => arquivo.endsWith('.html'));
  const html = await readFile(join(destino, nome), 'utf8');
  const svgDoBuild = html.match(/<figure class="grafico">[\s\S]*?(<svg[\s\S]*?<\/svg>)/)[1];
  assert.deepEqual(formaDoSvg(svg), formaDoSvg(svgDoBuild));
  // E não por os dois lados terem desenhado nada: a forma tem a linha de cada série do arquivo.
  assert.equal(lerCsv(CSV).epoca.length, 16);
  assert.ok(formaDoSvg(svg).length > 20, `SVG pequeno demais para ser o gráfico: ${formaDoSvg(svg).length} nós`);
});

test('um CSV que não carrega é recursos.csv no painel do navegador', async () => {
  const { titulo, achados, svg } = await abrir(`${dev.endereco}/index.html`, { csv404: true });
  assert.equal(titulo, 'Validador Aula USP: 1 erro, 0 avisos');
  assert.equal(achados.length, 1, achados.join('\n'));
  assert.match(achados[0], /recursos\.csv · CSV que não carregou: "data\/erro\.csv"\./);
  assert.equal(svg, null);
});

// A mesma aula duas vezes, na coluna de 4 de uma grade 4-4-4: uma com o CSV, outra com as mesmas
// colunas inline. O critério da pendência é "exatamente como": os mesmos achados de composição, com
// as mesmas mensagens, nos dois casos, pelo `validar` e pelo `build`.
async function deckNaColuna(dados) {
  const pasta = await mkdtemp(join(tmpdir(), 'grafico-coluna-'));
  const fonte = await readFile(new URL(`${PASTA}/index.html`, RAIZ), 'utf8');
  const especificacao = JSON.stringify({ tipo: 'linha', dados, x: 'epoca', y: ['treino', 'teste'], foco: 'teste', eixos: { x: 'época', y: 'erro' } });
  const slide = '<section data-layout="conteudo" id="estreito"><h2>Gráfico estreito</h2><div class="colunas" data-grade="4-4-4">'
    + `<div><figure class="grafico"><script type="application/json">${especificacao}</script></figure></div>`
    + '<div><p>Texto.</p></div><div><p>Mais.</p></div></div><aside class="notas">N.</aside></section>';
  const html = fonte.replace(/<section data-layout="figura" id="erro">[\s\S]*?<\/section>/, slide)
    .replace('../../../dist/aula-usp.js', 'dist/aula-usp.js');
  await writeFile(join(pasta, 'index.html'), html);
  await mkdir(join(pasta, 'data'));
  await writeFile(join(pasta, 'data/erro.csv'), CSV);
  return pasta;
}

const deComposicao = (achados) => achados.filter((a) => a.regra.startsWith('composicao.'))
  .map(({ regra, slide, mensagem, acao }) => ({ regra, slide, mensagem, acao }));

test('validar e build acusam o gráfico com CSV numa coluna estreita exatamente como o mesmo gráfico inline', async () => {
  const comCsv = await deckNaColuna('data/erro.csv');
  const inline = await deckNaColuna(lerCsv(CSV));
  const validacoes = [await validarArquivo(comCsv), await validarArquivo(inline)];
  for (const { avisoDeComposicao } of validacoes) assert.equal(avisoDeComposicao, null, 'sem Chrome a comparação não mede nada');
  const [validarCsv, validarInline] = validacoes.map(({ achados }) => deComposicao(achados));
  assert.ok(validarInline.some((a) => a.regra === 'composicao.tamanho-minimo'), `o inline não acusou: ${JSON.stringify(validarInline)}`);
  assert.deepEqual(validarCsv, validarInline);

  const construidos = [];
  for (const pasta of [comCsv, inline]) {
    const destino = await mkdtemp(join(tmpdir(), 'grafico-coluna-build-'));
    construidos.push(await build({ raiz: RAIZ, caminhoDaAula: pathToFileURL(join(pasta, 'index.html')), destino, semPdf: true }));
  }
  for (const { codigo } of construidos) assert.equal(codigo, 1);
  const [buildCsv, buildInline] = construidos.map(({ achados }) => deComposicao(achados));
  assert.deepEqual(buildCsv, buildInline);
  assert.deepEqual(buildCsv, validarCsv);
});

test('o pacote de dist/ desenha o gráfico com CSV, e o CSV é o único pedido que não é script', async () => {
  const url = `${cru.endereco}/${PASTA}/index.html`;
  const { titulo, svg, pedidos, erros } = await abrir(url);
  assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.deepEqual(erros, [], erros.join('\n'));
  assert.ok(pedidos.includes(`${cru.endereco}/dist/aula-usp.js`), 'não foi o pacote de dist/ que montou a aula');
  assert.match(svg ?? '', /data-serie="teste" data-cor="azul"/);
  // Spec 3.2: o pacote não busca recurso do SISTEMA que não seja script. O CSV é arquivo do AUTOR,
  // pedido relativo ao documento como um <img src> seria — e é o único.
  const outros = pedidos.filter((pedido) => pedido !== url && !pedido.endsWith('.js') && !pedido.endsWith('/favicon.ico'));
  assert.deepEqual(outros, [`${cru.endereco}/${PASTA}/data/erro.csv`]);
});
