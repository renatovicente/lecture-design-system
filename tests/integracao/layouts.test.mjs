// Geometria dos layouts no Chrome, sobre os espécimes servidos por `aula-usp servir` (spec 4.4, 4.5, 5.4 e 11.2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAIZ, iniciarChrome, servirPasta, abrirAula, perto, TINTA, AZUL, AMARELO, TRANSPARENTE } from './utilitarios.mjs';
import { tokens } from '../../tokens/tokens.js';

const SAIDA = fileURLToPath(new URL('saida/', import.meta.url));
const lerJson = async (caminho) => JSON.parse(await readFile(new URL(caminho, RAIZ), 'utf8'));
const unidades = await lerJson('assets/marcas/unidades.json');
const usp = await lerJson('assets/marcas/usp.json');

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
  if (!paginas.has(arquivo)) paginas.set(arquivo, abrirAula(navegador, `${servidor.endereco}/${arquivo}?folha`));
  return paginas.get(arquivo);
}

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

test('capa: título em y = 96, roteiro até y = 520 menos a folga, no passo da fileira, logo do IME com base em 680 e proteção livre', async () => {
  const { pagina } = await especime('index.html');
  perto((await caixa(pagina, 'capa', 'h1')).y, 96, 'topo do h1');
  const roteiro = await caixa(pagina, 'capa', '.roteiro');
  perto(roteiro.base, tokens.zona.capaConteudoBase - tokens.mapa.folgaRoteiroCapa, 'base do roteiro');
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

// Correção de 1 px (1.0.1): na primeira rodada de aceite no claude.ai, o painel do artifact acusou
// composicao.transbordo de 1 px nos três nomes curtos do roteiro da capa. No Chrome local, a mesma aula
// media -0,2 px de folga: a caixa do <span> inline (a área de conteúdo da Geist Mono, 18 px) descia
// abaixo do <li> (a linha, 14 × 1,2 = 16,8 px), e a base do <li> coincidia com a da zona. A tolerância
// da regra (FOLGA, 0,5 px) segurava aqui e não lá. Propriedade, não igualdade: a distância entre a base
// do nome curto mais baixo e a base da zona é, no mínimo, o token — no espécime inteiro e na aula do
// aceite (tests/fixtures/capa/passeio.html). Inversões medidas: sem a margem do roteiro, 0 px; sem o
// inline-block do nome, 7,8 px — as duas abaixo do token de 8.
test('capa: a folga entre o roteiro e a base da zona é, no mínimo, mapa.folgaRoteiroCapa', async () => {
  const fixturas = await servirPasta('tests/fixtures/capa/');
  try {
    const decks = (await readdir(new URL('especime/', RAIZ))).filter((nome) => nome.endsWith('.html')).sort()
      .map((nome) => [`${servidor.endereco}/${nome}`, nome]);
    decks.push([`${fixturas.endereco}/passeio.html`, 'tests/fixtures/capa/passeio.html']);
    for (const [endereco, nome] of decks) {
      const { pagina } = await abrirAula(navegador, `${endereco}?folha`);
      const folga = await pagina.evaluate(() => {
        const capa = document.querySelector('.slide[data-layout="capa"]');
        const base = Math.max(...[...capa.querySelectorAll('.roteiro .nome-curto')].map((nome) => nome.getBoundingClientRect().bottom));
        return capa.querySelector(':scope > .area').getBoundingClientRect().bottom - base;
      });
      await pagina.close();
      assert.ok(folga >= tokens.mapa.folgaRoteiroCapa, `${nome}: folga de ${folga} px entre o roteiro e a base da zona (mín. ${tokens.mapa.folgaRoteiroCapa})`);
    }
  } finally {
    await fixturas.fechar();
  }
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

// 1.0.1 (D5): sem disciplina e aula, a capa perde a linha "disciplina · Aula N" e os slides perdem o
// rodapé — e nada mais se move. A referência é a mesma aula com as duas metas, injetadas pela rota:
// todo elemento que existe nas duas montagens, fora a linha de metadados da capa, fica no mesmo
// lugar, ao centésimo de px. E o painel do validador, no modo de apresentação, não acusa nada.
test('sem as metas disciplina e aula, o cromo não se move e o painel fica limpo', async () => {
  const fixturas = await servirPasta('tests/fixtures/metas/');
  const endereco = `${fixturas.endereco}/sem-disciplina-e-aula.html`;
  const POSICOES = () => [...document.querySelectorAll('section.slide')].flatMap((slide) => {
    const palco = slide.getBoundingClientRect();
    return [...slide.querySelectorAll('*')]
      .filter((el) => !el.closest('.metadados-capa, .rodape'))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return [`${slide.id} ${el.nodeName.toLowerCase()}.${[...el.classList].join('.')} ${el.textContent.slice(0, 20)}`,
          [r.left - palco.left, r.top - palco.top, r.width, r.height].map((v) => Math.round(v * 100) / 100).join(' ')];
      });
  });
  try {
    const { pagina: sem } = await abrirAula(navegador, `${endereco}?folha`);
    const com = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
    await com.route('**/sem-disciplina-e-aula.html?folha', async (rota) => {
      const resposta = await rota.fetch();
      const html = (await resposta.text()).replace('<meta name="data"', '<meta name="disciplina" content="Física Estatística">\n<meta name="aula" content="1">\n<meta name="data"');
      await rota.fulfill({ response: resposta, body: html });
    });
    await com.goto(`${endereco}?folha`);
    await com.waitForFunction(() => document.body?.dataset.montado === 'sim');
    await com.evaluate(() => document.fonts.ready);
    assert.equal(await com.evaluate(() => document.querySelectorAll('.rodape').length), 2, 'a referência tem de ter rodapé');
    assert.equal(await sem.evaluate(() => document.querySelectorAll('.rodape').length), 0);
    assert.deepEqual(await sem.evaluate(() => [...document.querySelectorAll('.metadados-capa p')].map((p) => p.textContent)),
      ['Prof. Renato Vicente · 28 set 2026']);
    assert.deepEqual(await sem.evaluate(POSICOES), await com.evaluate(POSICOES));
    assert.ok(!(await sem.evaluate(() => document.body.innerText + document.title)).includes('undefined'));
    await sem.close();
    await com.close();

    const { pagina, erros } = await abrirAula(navegador, endereco);
    assert.deepEqual(erros, []);
    assert.equal(await pagina.evaluate(() => document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent),
      'Validador Aula USP: 0 erros, 0 avisos');
    await pagina.close();
  } finally {
    await fixturas.fechar();
  }
});

// 1.0.1 (D6): a faixa do CIAAM, pela mesma aula do espécime com a unidade trocada na rota. O logo na
// altura declarada, com a base em 680 e na margem, a assinatura USP à direita (integraUSP falso) e as
// proteções livres — as mesmas medidas do IFUSP, com os números do inventário.
test('CIAAM: logo de 64 px em azul, assinatura da USP à direita, bases em 680 e proteções livres', async () => {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  await pagina.route('**/index.html?folha', async (rota) => {
    const resposta = await rota.fetch();
    const html = (await resposta.text()).replace('<meta name="unidade" content="ime">', '<meta name="unidade" content="ciaam">');
    await rota.fulfill({ response: resposta, body: html });
  });
  await pagina.goto(`${servidor.endereco}/index.html?folha`);
  await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
  await pagina.evaluate(() => document.fonts.ready);
  try {
    for (const id of ['capa', 'encerramento']) {
      const [logo, logoUsp, ...outros] = await caixas(pagina, id, '.faixa-de-marca img');
      assert.equal(outros.length, 0);
      assert.equal(await pagina.evaluate((i) => document.getElementById(i).querySelector('.marca-unidade').getAttribute('alt'), id),
        unidades.ciaam.nome);
      perto(logo.altura, unidades.ciaam.altura, `${id}: altura do logo do CIAAM`);
      perto(logo.base, 680, `${id}: base do logo do CIAAM`);
      perto(logo.x, 64, `${id}: logo do CIAAM na margem`);
      perto(logoUsp.altura, usp.altura, `${id}: altura do logo USP`);
      perto(logoUsp.direita, 1216, `${id}: logo USP na margem direita`);
      const assinatura = await caixa(pagina, id, '.marca-usp');
      const conteudo = await caixas(pagina, id, ':scope > .area > *');
      const baseDoConteudo = Math.max(...conteudo.map((c) => c.base));
      assert.ok(logo.y - unidades.ciaam.protecao >= baseDoConteudo, `${id}: proteção do CIAAM invadida`);
      assert.ok(assinatura.y - usp.protecao >= baseDoConteudo, `${id}: proteção da USP invadida`);
      assert.ok(assinatura.x - usp.protecao >= logo.direita + unidades.ciaam.protecao, `${id}: logos perto demais`);
    }
  } finally {
    await pagina.close();
  }
});
