// Blocos de corpo no Chrome, sobre especime/componentes.html servido por `aula-usp servir` (spec 4.3, 7.1 e 11.2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RAIZ, iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const TINTA = 'rgb(10, 10, 10)';
const PAPEL = 'rgb(255, 255, 255)';
const AMARELO = 'rgb(252, 180, 33)';
const LINHA = 'rgb(217, 217, 217)';
const TRANSPARENTE = 'rgba(0, 0, 0, 0)';

let servidor;
let navegador;
let folhaAberta;

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

// Uma página em modo folha serve aos testes de geometria: nela os passos aparecem revelados.
const folha = () => (folhaAberta ??= abrirAula(navegador, `${servidor.endereco}/componentes.html?folha`));
const perto = (obtido, esperado, descricao) => assert.ok(Math.abs(obtido - esperado) <= 0.5, `${descricao}: ${obtido} em vez de ${esperado}`);

test('espécime de componentes: 15 slides montados sem erros, e toda classe do documento está no contrato', async () => {
  const { pagina, erros } = await folha();
  const { slides, classes } = await pagina.evaluate(() => ({
    slides: document.querySelectorAll('section.slide').length,
    classes: [...new Set([...document.querySelectorAll('[class]')].flatMap((elemento) => [...elemento.classList]))],
  }));
  assert.equal(slides, 15);
  assert.deepEqual(erros, []);
  const conhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);
  assert.deepEqual(classes.filter((nome) => !conhecidas.has(nome)), []);
});

test('campos: destaque em amarelo, quadro com contorno de 2 px e alerta em tinta, com o rótulo vindo de data-rotulo', async () => {
  const { pagina } = await folha();
  const [destaque, quadro, alerta] = await pagina.evaluate(() => ['aside.destaque', 'aside.quadro', 'aside.alerta'].map((seletor) => {
    const campo = document.querySelector(`#destaque-quadro-alerta ${seletor}`);
    const estilo = getComputedStyle(campo);
    const rotulo = getComputedStyle(campo, '::before');
    return {
      fundo: estilo.backgroundColor,
      cor: estilo.color,
      borda: `${estilo.borderTopWidth} ${estilo.borderTopStyle}`,
      padding: [estilo.paddingTop, estilo.paddingRight, estilo.paddingBottom, estilo.paddingLeft].join(' '),
      rotulo: rotulo.content,
      fonteDoRotulo: `${rotulo.fontWeight} ${rotulo.fontSize} ${rotulo.fontFamily}`,
      caixaDoRotulo: `${rotulo.display} ${rotulo.textTransform} ${rotulo.marginBottom}`,
    };
  }));
  assert.deepEqual([destaque.fundo, destaque.cor], [AMARELO, TINTA]);
  assert.deepEqual([quadro.fundo, quadro.borda], [TRANSPARENTE, '2px solid']);
  assert.deepEqual([alerta.fundo, alerta.cor], [TINTA, PAPEL]);
  for (const campo of [destaque, quadro, alerta]) assert.equal(campo.padding, '16px 24px 16px 24px');
  assert.equal(destaque.rotulo, '"Definição"');
  assert.equal(alerta.rotulo, '"Cuidado"');
  assert.equal(quadro.rotulo, 'none', 'sem data-rotulo, o campo não ganha rótulo');
  assert.equal(destaque.fonteDoRotulo, '700 14px "Geist Mono", ui-monospace, monospace');
  assert.equal(destaque.caixaDoRotulo, 'block uppercase 8px');
});

test('exercício: enunciado com a forma do quadro e o rótulo "Exercício"; resposta com o rótulo "Resposta", 24 px abaixo', async () => {
  const { pagina } = await folha();
  const [enunciado, resposta] = await pagina.evaluate(() => ['.enunciado', '.resposta'].map((seletor) => {
    const parte = document.querySelector(`#exercicio ${seletor}`);
    const estilo = getComputedStyle(parte);
    const caixa = parte.getBoundingClientRect();
    return {
      rotulo: getComputedStyle(parte, '::before').content,
      borda: `${estilo.borderTopWidth} ${estilo.borderTopStyle}`,
      padding: `${estilo.paddingTop} ${estilo.paddingLeft}`,
      topo: caixa.top,
      base: caixa.bottom,
    };
  }));
  assert.deepEqual([enunciado.rotulo, enunciado.borda, enunciado.padding], ['"Exercício"', '2px solid', '16px 24px']);
  assert.deepEqual([resposta.rotulo, resposta.borda, resposta.padding], ['"Resposta"', '0px none', '0px 0px']);
  perto(resposta.topo - enunciado.base, 24, 'espaço entre enunciado e resposta');
});

test('listas: marcador quadrado de 8 px com recuo pendente; passos com numeral de 40 px na linha de base do texto, sob régua de 2 px', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const slide = document.getElementById('marcadores-e-passos');
    const esquerda = slide.getBoundingClientRect().left;
    const inicioDasLinhas = (item) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(item);
      return [...faixa.getClientRects()].map((linha) => linha.left - esquerda);
    };
    const linhaDeBase = (item) => {
      const sonda = document.createElement('span');
      sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      item.prepend(sonda);
      const y = sonda.getBoundingClientRect().top - item.getBoundingClientRect().top;
      sonda.remove();
      return y;
    };
    const itens = [...slide.querySelectorAll('ul > li')];
    const passos = [...slide.querySelectorAll('ol.passos > li')];
    const sintese = [...document.querySelectorAll('[data-layout="encerramento"] ol.sintese > li')];
    const marcador = getComputedStyle(itens[0], '::before');
    const numeral = getComputedStyle(passos[0], '::before');
    return {
      marcador: `${marcador.width} ${marcador.height} ${marcador.backgroundColor}`,
      linhasDoItemLongo: inicioDasLinhas(itens[4]),
      espacoEntreItens: itens[1].getBoundingClientRect().top - itens[0].getBoundingClientRect().bottom,
      numeral: `${numeral.fontWeight} ${numeral.fontSize} ${numeral.fontFamily}`,
      reguas: passos.map((passo) => `${getComputedStyle(passo).borderTopWidth} ${getComputedStyle(passo).borderTopColor}`),
      baseDoPrimeiroPasso: linhaDeBase(passos[0]),
      linhasDoPassoLongo: inicioDasLinhas(passos[4]),
      espacoEntrePassos: passos[1].getBoundingClientRect().top - passos[0].getBoundingClientRect().bottom,
      sintese: sintese.map((item) => `${getComputedStyle(item).borderTopWidth} ${getComputedStyle(item, '::before').fontSize}`),
    };
  });
  assert.equal(medida.marcador, `8px 8px ${TINTA}`);
  assert.deepEqual(medida.linhasDoItemLongo, [88, 88], 'as duas linhas do item começam 24 px depois da margem');
  perto(medida.espacoEntreItens, 8, 'espaço entre itens');
  assert.equal(medida.numeral, '600 40px Geist, system-ui, sans-serif');
  assert.deepEqual(medida.reguas, Array(5).fill(`2px ${TINTA}`));
  // régua (2) + padding (16) + a parte do numeral acima da linha de base (34, pelas métricas da Geist)
  assert.ok(Math.abs(medida.baseDoPrimeiroPasso - 52) <= 1, `linha de base do primeiro passo em ${medida.baseDoPrimeiroPasso}`);
  assert.deepEqual(medida.linhasDoPassoLongo, [716, 716], 'as duas linhas do passo começam 64 px depois da coluna');
  perto(medida.espacoEntrePassos, 24, 'espaço entre passos');
  assert.deepEqual(medida.sintese, Array(3).fill('2px 40px'), 'ol.sintese tem a forma de ol.passos');
});

test('texto em linha: code em Geist Mono a 0,88em; sub e sup a 0,8em, sem mudar a altura das linhas', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const [, comCodigo, comIndices] = document.querySelectorAll('#texto-em-linha .area > p');
    const codigo = getComputedStyle(comCodigo.querySelector('code'));
    return {
      codigo: `${codigo.fontSize} ${codigo.fontFamily}`,
      indices: [getComputedStyle(comIndices.querySelector('sub')).fontSize, getComputedStyle(comIndices.querySelector('sup')).fontSize],
      alturas: [comCodigo.getBoundingClientRect().height, comIndices.getBoundingClientRect().height],
    };
  });
  assert.equal(medida.codigo, '21.12px "Geist Mono", ui-monospace, monospace');
  assert.deepEqual(medida.indices, ['19.2px', '19.2px']);
  for (const altura of medida.alturas) perto(altura, 2 * 24 * 1.42, 'parágrafo de duas linhas de leitura');
});

test('a resposta do exercício é passo no palco e sai revelada na impressão', async (t) => {
  const { pagina, erros } = await abrirAula(navegador, `${servidor.endereco}/componentes.html#exercicio`);
  t.after(() => pagina.close());
  const visibilidade = () => pagina.evaluate(() => getComputedStyle(document.querySelector('#exercicio .resposta')).visibility);
  assert.equal(await visibilidade(), 'hidden');
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  assert.equal(await visibilidade(), 'visible');
  assert.deepEqual(erros, []);
});
