// Geometria dos layouts no Chrome, sobre os espécimes servidos por `aula-usp servir` (spec 4.4, 4.5, 5.4 e 11.2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAIZ, iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

const SAIDA = fileURLToPath(new URL('saida/', import.meta.url));
const lerJson = async (caminho) => JSON.parse(await readFile(new URL(caminho, RAIZ), 'utf8'));
const unidades = await lerJson('assets/marcas/unidades.json');
const usp = await lerJson('assets/marcas/usp.json');

const TINTA = 'rgb(10, 10, 10)';
const AZUL = 'rgb(16, 148, 171)';
const AMARELO = 'rgb(252, 180, 33)';
const TRANSPARENTE = 'rgba(0, 0, 0, 0)';

let servidor;
let navegador;
const paginas = new Map();

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
  await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

function especime(arquivo) {
  if (!paginas.has(arquivo)) paginas.set(arquivo, abrirAula(navegador, `${servidor.endereco}/${arquivo}`));
  return paginas.get(arquivo);
}

const perto = (obtido, esperado, descricao) => assert.ok(Math.abs(obtido - esperado) <= 0.5, `${descricao}: ${obtido} em vez de ${esperado}`);

function caixas(pagina, id, seletor) {
  return pagina.evaluate(([idSlide, sel]) => {
    const slide = document.getElementById(idSlide);
    const s = slide.getBoundingClientRect();
    return [...slide.querySelectorAll(sel)].filter((el) => el.getClientRects().length > 0).map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - s.left, y: r.top - s.top, largura: r.width, altura: r.height, direita: r.right - s.left, base: r.bottom - s.top };
    });
  }, [id, seletor]);
}

const caixa = async (pagina, id, seletor) => (await caixas(pagina, id, seletor))[0];

function estilos(pagina, id, seletor, propriedades) {
  return pagina.evaluate(([idSlide, sel, props]) => [...document.getElementById(idSlide).querySelectorAll(sel)]
    .map((el) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]))), [id, seletor, propriedades]);
}

function linhaDeBase(pagina, id, seletor) {
  return pagina.evaluate(([idSlide, sel]) => {
    const slide = document.getElementById(idSlide);
    const sonda = document.createElement('span');
    sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    slide.querySelector(sel).prepend(sonda);
    const y = sonda.getBoundingClientRect().top - slide.getBoundingClientRect().top;
    sonda.remove();
    return y;
  }, [id, seletor]);
}

function familiasCarregadas(pagina) {
  return pagina.evaluate(() => [...new Set([...document.fonts]
    .filter((fonte) => fonte.status === 'loaded').map((fonte) => fonte.family.replaceAll('"', '')))].sort());
}

test('espécime do IME: 13 slides de 1280 × 720, montados sem erros no console', async () => {
  const { pagina, erros } = await especime('index.html');
  const slides = await pagina.evaluate(() => [...document.querySelectorAll('section.slide')]
    .map((s) => [s.id, s.getBoundingClientRect().width, s.getBoundingClientRect().height]));
  assert.equal(slides.length, 13);
  assert.ok(slides.every(([, largura, altura]) => largura === 1280 && altura === 720), JSON.stringify(slides));
  assert.deepEqual(erros, []);
  assert.deepEqual(await familiasCarregadas(pagina), ['Geist', 'Geist Mono']);
});

test('zonas: cabeçalho de 40 a 64, área de 96 a 652, rodapé com linha de base em 688', async () => {
  const { pagina } = await especime('index.html');
  for (const id of ['o-que-mostra', 'grade-8-4', 'afirmacao', 'figura', 'demo', 'grade-4-4-4']) {
    const cabecalho = await caixa(pagina, id, '.cabecalho');
    perto(cabecalho.y, 40, `${id}: topo do cabeçalho`);
    perto(cabecalho.base, 64, `${id}: base do cabeçalho`);
    perto(cabecalho.x, 64, `${id}: margem esquerda do cabeçalho`);
    perto(cabecalho.direita, 1216, `${id}: margem direita do cabeçalho`);
    const area = await caixa(pagina, id, ':scope > .area');
    perto(area.y, 96, `${id}: topo da área`);
    perto(area.base, 652, `${id}: base da área`);
    perto(await linhaDeBase(pagina, id, '.rodape'), 688, `${id}: linha de base do rodapé`);
  }
  const fim = await caixa(pagina, 'encerramento', ':scope > .area');
  perto(fim.y, 96, 'encerramento: topo da área');
  perto(fim.base, 520, 'encerramento: base da área');
  assert.equal(await caixa(pagina, 'encerramento', '.rodape'), undefined);
});

test('mapa do cabeçalho: quadrados de 16 px a cada 24 px, cores por estado e posição fixa entre slides', async () => {
  const { pagina } = await especime('index.html');
  const noBloco1 = await caixas(pagina, 'grade-8-4', '.mapa .quadrado');
  assert.deepEqual(noBloco1.map((q) => [q.largura, q.altura]), [[16, 16], [16, 16], [16, 16]]);
  perto(noBloco1[1].x - noBloco1[0].x, 24, 'passo entre quadrados');
  perto(noBloco1[0].y, 44, 'quadrados centrados no cabeçalho');
  for (const id of ['o-que-mostra', 'figura', 'grade-4-4-4', 'encerramento']) {
    perto((await caixa(pagina, id, '.mapa .quadrado')).x, noBloco1[0].x, `${id}: posição do mapa`);
  }
  const propriedades = ['backgroundColor', 'borderTopWidth', 'borderTopColor'];
  const [visto, atual, futuro] = await estilos(pagina, 'figura', '.mapa .quadrado', propriedades);
  assert.equal(visto.backgroundColor, TINTA);
  assert.equal(atual.backgroundColor, AZUL);
  assert.equal(futuro.backgroundColor, TRANSPARENTE);
  assert.equal(futuro.borderTopWidth, '2px');
  assert.equal(futuro.borderTopColor, TINTA);
  const contador = await caixa(pagina, 'figura', '.contador');
  perto(contador.direita, 1216, 'contador na margem direita');
});

test('grades de colunas com as larguras do grid de 12 colunas', async () => {
  const { pagina } = await especime('index.html');
  const esperadas = {
    'grade-8-4': [[64, 760], [848, 368]],
    'grade-6-6': [[64, 564], [652, 564]],
    'grade-4-8': [[64, 368], [456, 760]],
    'grade-4-4-4': [[64, 368], [456, 368], [848, 368]],
  };
  for (const [id, colunas] of Object.entries(esperadas)) {
    const obtidas = await caixas(pagina, id, '.colunas > div');
    assert.deepEqual(obtidas.map((c) => [Math.round(c.x), Math.round(c.largura)]), colunas, id);
  }
});

test('capa: título em y = 96, roteiro até y = 520 no passo da fileira, logo do IME com base em 680 e proteção livre', async () => {
  const { pagina } = await especime('index.html');
  perto((await caixa(pagina, 'capa', 'h1')).y, 96, 'topo do h1');
  const roteiro = await caixa(pagina, 'capa', '.roteiro');
  perto(roteiro.base, 520, 'base do roteiro');
  const quadrados = await caixas(pagina, 'capa', '.roteiro .quadrado');
  assert.deepEqual(quadrados.map((q) => [Math.round(q.x), q.largura, q.altura]), [[64, 24, 24], [248, 24, 24], [432, 24, 24]]);
  const [logo, ...outros] = await caixas(pagina, 'capa', '.faixa-de-marca img');
  assert.equal(outros.length, 0);
  perto(logo.altura, unidades.ime.altura, 'altura do logo do IME');
  perto(logo.base, 680, 'base do logo do IME');
  perto(logo.x, 64, 'logo do IME na margem');
  const conteudo = await caixas(pagina, 'capa', ':scope > .area > *');
  const baseDoConteudo = Math.max(...conteudo.map((c) => c.base));
  assert.ok(logo.y - unidades.ime.protecao >= baseDoConteudo, `proteção do IME invadida: ${logo.y} - ${unidades.ime.protecao} < ${baseDoConteudo}`);
});

test('abertura: fileira a partir de y = 96, atual em amarelo com número a 55 %, título com base em 652 e "Bloco N de M" à direita', async () => {
  const { pagina } = await especime('index.html');
  const id = 'figuras-e-demos';
  const quadrados = await caixas(pagina, id, '.fileira .quadrado');
  assert.deepEqual(quadrados.map((q) => [Math.round(q.x), q.y, q.largura, q.altura]),
    [[64, 96, 160, 160], [248, 96, 160, 160], [432, 96, 160, 160]]);
  const cores = await estilos(pagina, id, '.fileira .quadrado', ['backgroundColor', 'borderTopWidth']);
  assert.deepEqual(cores.map((c) => c.backgroundColor), [TINTA, AMARELO, TRANSPARENTE]);
  assert.equal(cores[2].borderTopWidth, '2px');
  const [numero] = await estilos(pagina, id, '.numero-bloco', ['fontSize', 'color']);
  assert.deepEqual(numero, { fontSize: '88px', color: TINTA });
  perto((await caixa(pagina, id, '.fileira .nome-curto')).y, 272, 'nomes 16 px abaixo dos quadrados');
  const area = await caixa(pagina, id, ':scope > .area');
  perto(area.base, 652, 'base do conjunto título e pergunta');
  assert.ok(area.y >= 360, `topo do conjunto acima de 360: ${area.y}`);
  const titulo = await caixa(pagina, id, 'h2');
  perto(titulo.largura, 908, 'largura do título ao lado da faixa de 220 px');
  const blocoNdeM = await caixa(pagina, id, '.bloco-n-de-m');
  perto(blocoNdeM.direita, 1216, '"Bloco N de M" na margem direita');
  assert.ok(blocoNdeM.x >= 64 + 908 + 24, `"Bloco N de M" fora da faixa: ${blocoNdeM.x}`);
  perto(await linhaDeBase(pagina, id, '.bloco-n-de-m'), await linhaDeBase(pagina, id, 'h2'), 'alinhado à primeira linha do título');
});

test('fileira e roteiro encolhem para 144 px com 7 blocos e 123 px com 8', async () => {
  const { pagina } = await especime('index.html');
  const lados = await pagina.evaluate(() => {
    const medir = (el, n) => {
      el.dataset.n = n;
      const largura = el.querySelector('li').getBoundingClientRect().width;
      el.dataset.n = '3';
      return largura;
    };
    const fileira = document.querySelector('#blocos .fileira');
    const roteiro = document.querySelector('#capa .roteiro');
    return [medir(fileira, '7'), medir(fileira, '8'), medir(roteiro, '7'), medir(roteiro, '8')];
  });
  assert.deepEqual(lados, [144, 123, 144, 123]);
});

test('nenhum elemento de bloco sai da área em nenhum slide dos três espécimes', async () => {
  for (const arquivo of ['index.html', 'ifusp.html', 'muitos-blocos.html']) {
    const { pagina } = await especime(arquivo);
    const fora = await pagina.evaluate(() => {
      const achados = [];
      for (const slide of document.querySelectorAll('section.slide')) {
        const area = slide.querySelector(':scope > .area').getBoundingClientRect();
        for (const el of slide.querySelectorAll(':scope > .area *')) {
          if (el.getClientRects().length === 0 || getComputedStyle(el).display === 'inline') continue;
          const r = el.getBoundingClientRect();
          if (r.bottom > area.bottom + 0.5 || r.right > area.right + 0.5 || r.left < area.left - 0.5 || r.top < area.top - 0.5) {
            achados.push(`${slide.id}: ${el.nodeName.toLowerCase()}`);
          }
        }
      }
      return achados;
    });
    assert.deepEqual(fora, [], arquivo);
  }
});

test('IFUSP em inglês: logo vertical de 128 px, assinatura da USP com 20 px de espaço, bases em 680 e proteções livres', async () => {
  const { pagina, erros } = await especime('ifusp.html');
  assert.deepEqual(erros, []);
  for (const id of ['capa', 'encerramento']) {
    const [logo, logoUsp] = await caixas(pagina, id, '.faixa-de-marca img');
    perto(logo.altura, unidades.ifusp.altura, `${id}: altura do logo do IFUSP`);
    perto(logo.base, 680, `${id}: base do logo do IFUSP`);
    perto(logo.x, 64, `${id}: logo do IFUSP na margem`);
    perto(logoUsp.altura, usp.altura, `${id}: altura do logo USP`);
    perto(logoUsp.base, 680, `${id}: base do logo USP`);
    perto(logoUsp.direita, 1216, `${id}: logo USP na margem direita`);
    const texto = await caixa(pagina, id, '.marca-usp > span');
    perto(logoUsp.x - texto.direita, 20, `${id}: espaço entre texto e logo USP`);
    const assinatura = await caixa(pagina, id, '.marca-usp');
    const conteudo = await caixas(pagina, id, ':scope > .area > *');
    const baseDoConteudo = Math.max(...conteudo.map((c) => c.base));
    assert.ok(logo.y - unidades.ifusp.protecao >= baseDoConteudo, `${id}: proteção do IFUSP invadida`);
    assert.ok(assinatura.y - usp.protecao >= baseDoConteudo, `${id}: proteção da USP invadida`);
    assert.ok(assinatura.x - usp.protecao >= logo.direita + unidades.ifusp.protecao, `${id}: logos perto demais`);
  }
  assert.deepEqual(await familiasCarregadas(pagina), ['Geist', 'Geist Mono', 'Open Sans']);
  const textos = await pagina.evaluate(() => [
    document.querySelector('#one-step .rotulo').textContent,
    document.querySelector('#walks .bloco-n-de-m').textContent,
    document.querySelector('#encerramento .rotulo').textContent,
    document.querySelector('#spreading .rodape').textContent,
  ]);
  assert.deepEqual(textos, ['01 · Walks', 'Block 1 of 2', 'Closing', 'Statistical Physics · Lecture 2']);
});

test('nove blocos: "Bloco 3 de 9" no cabeçalho, abertura só com o campo atual e roteiro numerado em até duas linhas', async () => {
  const { pagina, erros } = await especime('muitos-blocos.html');
  assert.deepEqual(erros, []);
  assert.equal(await pagina.evaluate(() => document.querySelector('#dentro-do-terceiro .cabecalho .bloco-n-de-m').textContent), 'Bloco 3 de 9');
  assert.equal(await caixa(pagina, 'dentro-do-terceiro', '.mapa'), undefined);
  const visiveis = await caixas(pagina, 'derivadas', '.fileira > li');
  assert.equal(visiveis.length, 1);
  assert.deepEqual(await caixas(pagina, 'derivadas', '.fileira .nome-curto'), []);
  const [quadrado] = await caixas(pagina, 'derivadas', '.fileira .quadrado');
  assert.deepEqual([Math.round(quadrado.x), quadrado.y, quadrado.largura], [64, 96, 160]);
  assert.equal(await pagina.evaluate(() => document.querySelector('#derivadas .numero-bloco').textContent), '04');
  const itens = await caixas(pagina, 'capa', '.roteiro > li');
  assert.equal(itens.length, 9);
  assert.ok(new Set(itens.map((item) => Math.round(item.y))).size <= 2, 'roteiro em mais de duas linhas');
  assert.deepEqual(await caixas(pagina, 'capa', '.roteiro .quadrado'), []);
  assert.ok((await caixa(pagina, 'capa', '.roteiro')).base <= 520.5);
});

test('capturas de todos os slides em tests/integracao/saida/', async () => {
  for (const arquivo of ['index.html', 'ifusp.html', 'muitos-blocos.html']) {
    const { pagina } = await especime(arquivo);
    const slides = pagina.locator('section.slide');
    const total = await slides.count();
    for (let i = 0; i < total; i++) {
      await slides.nth(i).screenshot({ path: join(SAIDA, `${arquivo.replace('.html', '')}-${String(i + 1).padStart(2, '0')}.png`) });
    }
  }
  const gravadas = (await readdir(SAIDA)).filter((nome) => nome.endsWith('.png'));
  assert.equal(gravadas.length, 13 + 6 + 12);
});
