// Motor no Chrome (spec 6.1 a 6.4 e 11.2): palco escalado, teclado, passos, endereço, saltos de bloco e cliques.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RAIZ, iniciarChrome, servirPasta, abrirAula, esperarMontagem } from './utilitarios.mjs';

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));

let servidor;
let navegador;

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

const abrir = (caminho, opcoes) => abrirAula(navegador, `${servidor.endereco}/${caminho}`, opcoes);

function situacao(pagina) {
  return pagina.evaluate(() => {
    const ativos = [...document.querySelectorAll('.palco > .slide.ativo')];
    const passos = ativos[0] ? [...ativos[0].querySelectorAll('.area [data-passo]')] : [];
    return {
      ativos: ativos.length,
      id: ativos[0]?.id,
      hash: location.hash,
      revelados: passos.map((elemento) => getComputedStyle(elemento).visibility === 'visible'),
    };
  });
}

async function teclar(pagina, tecla) {
  await pagina.keyboard.press(tecla);
  return situacao(pagina);
}

function caixaDoPalco(pagina) {
  return pagina.evaluate(() => {
    const { x, y, width, height } = document.querySelector('.palco').getBoundingClientRect();
    return { x, y, largura: width, altura: height };
  });
}

test('palco: um slide por vez, escalado pelo menor fator e centralizado na janela', async () => {
  const { pagina, erros } = await abrir('index.html', { largura: 1600, altura: 900 });
  assert.deepEqual(await situacao(pagina), { ativos: 1, id: 'capa', hash: '#capa', revelados: [] });
  assert.deepEqual(await caixaDoPalco(pagina), { x: 0, y: 0, largura: 1600, altura: 900 });
  await pagina.setViewportSize({ width: 1000, height: 900 });
  await pagina.waitForFunction(() => document.querySelector('.palco').getBoundingClientRect().width === 1000);
  assert.deepEqual(await caixaDoPalco(pagina), { x: 0, y: 168.75, largura: 1000, altura: 562.5 });
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('teclado: →, espaço e PageDown revelam passos e avançam; ← e PageUp voltam; Home e End vão às pontas', async () => {
  const { pagina } = await abrir('index.html');
  const roteiro = [
    ['ArrowRight', 'o-que-mostra', '#o-que-mostra', [false, false]],
    ['Space', 'o-que-mostra', '#o-que-mostra/1', [true, false]],
    ['PageDown', 'o-que-mostra', '#o-que-mostra/2', [true, true]],
    ['ArrowRight', 'blocos', '#blocos', []],
    ['ArrowLeft', 'o-que-mostra', '#o-que-mostra/2', [true, true]],
    ['PageUp', 'o-que-mostra', '#o-que-mostra/1', [true, false]],
    ['End', 'encerramento', '#encerramento', []],
    ['ArrowRight', 'encerramento', '#encerramento', []],
    ['Home', 'capa', '#capa', []],
    ['ArrowLeft', 'capa', '#capa', []],
  ];
  for (const [tecla, id, hash, revelados] of roteiro) {
    assert.deepEqual(await teclar(pagina, tecla), { ativos: 1, id, hash, revelados }, tecla);
  }
  await pagina.close();
});

test('passos numerados: o mesmo número aparece junto, e voltar do slide seguinte mostra todos revelados', async () => {
  const { pagina } = await abrir('index.html#grade-4-4-4');
  assert.deepEqual((await situacao(pagina)).revelados, [false, false, false]);
  assert.deepEqual(await teclar(pagina, 'ArrowRight'), { ativos: 1, id: 'grade-4-4-4', hash: '#grade-4-4-4/1', revelados: [false, true, false] });
  assert.deepEqual(await teclar(pagina, 'ArrowRight'), { ativos: 1, id: 'grade-4-4-4', hash: '#grade-4-4-4/2', revelados: [true, true, true] });
  assert.equal((await teclar(pagina, 'ArrowRight')).id, 'encerramento');
  assert.deepEqual(await teclar(pagina, 'ArrowLeft'), { ativos: 1, id: 'grade-4-4-4', hash: '#grade-4-4-4/2', revelados: [true, true, true] });
  await pagina.close();
});

test('endereço: #id/n abre no passo, recarregar mantém a posição e endereços inválidos são corrigidos', async () => {
  const { pagina } = await abrir('index.html#o-que-mostra/1');
  const noPasso = { ativos: 1, id: 'o-que-mostra', hash: '#o-que-mostra/1', revelados: [true, false] };
  assert.deepEqual(await situacao(pagina), noPasso);
  await pagina.reload();
  await esperarMontagem(pagina);
  assert.deepEqual(await situacao(pagina), noPasso);
  await pagina.evaluate(() => { location.hash = '#grades'; });
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'grades');
  assert.equal((await situacao(pagina)).hash, '#grades');
  await pagina.evaluate(() => { location.hash = '#o-que-mostra/9'; });
  await pagina.waitForFunction(() => location.hash === '#o-que-mostra/2');
  assert.deepEqual((await situacao(pagina)).revelados, [true, true]);
  await pagina.evaluate(() => { location.hash = '#nao-existe'; });
  await pagina.waitForFunction(() => location.hash === '#o-que-mostra/2');
  assert.equal((await situacao(pagina)).id, 'o-que-mostra');
  await pagina.close();
  const { pagina: outra } = await abrir('index.html#nao-existe');
  assert.deepEqual(await situacao(outra), { ativos: 1, id: 'capa', hash: '#capa', revelados: [] });
  await outra.close();
});

test('saltos: 1 a 8 levam à abertura do bloco, 9 não faz nada e o quadrado do mapa leva à abertura', async () => {
  const { pagina } = await abrir('index.html');
  assert.equal((await teclar(pagina, '2')).id, 'figuras-e-demos');
  assert.equal((await teclar(pagina, '9')).id, 'figuras-e-demos');
  assert.equal((await teclar(pagina, '3')).id, 'grades');
  await pagina.evaluate(() => { location.hash = '#grade-8-4'; });
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'grade-8-4');
  await pagina.locator('#grade-8-4 .mapa a.quadrado').nth(2).click();
  assert.deepEqual(await situacao(pagina), { ativos: 1, id: 'grades', hash: '#grades', revelados: [] });
  await pagina.close();
});

test('cliques nas laterais: 12 % da largura voltam ou avançam; o centro, links e demos não disparam as faixas', async () => {
  const { pagina } = await abrir('index.html#grade-6-6', { largura: 1600, altura: 900 });
  await pagina.mouse.click(100, 450);
  assert.equal((await situacao(pagina)).id, 'grades');
  await pagina.mouse.click(1500, 450);
  assert.equal((await situacao(pagina)).id, 'grade-6-6');
  await pagina.mouse.click(800, 450);
  assert.equal((await situacao(pagina)).id, 'grade-6-6');
  await pagina.evaluate(() => { location.hash = '#demo'; });
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'demo');
  const demo = await pagina.evaluate(() => {
    const { right, top, bottom } = document.querySelector('#demo .demo').getBoundingClientRect();
    return { x: right - 20, y: (top + bottom) / 2 };
  });
  assert.ok(demo.x > 1600 * 0.88, `a demo não chega à faixa direita: ${demo.x}`);
  await pagina.mouse.click(demo.x, demo.y);
  assert.equal((await situacao(pagina)).id, 'demo');
  await pagina.close();
});

test('teclas dentro de um controle de demo não navegam', async () => {
  const { pagina } = await abrir('index.html#demo');
  await pagina.evaluate(() => {
    const campo = document.createElement('input');
    document.querySelector('#demo .demo').append(campo);
    campo.focus();
  });
  assert.equal((await teclar(pagina, 'ArrowRight')).id, 'demo');
  await pagina.evaluate(() => document.activeElement.blur());
  assert.equal((await teclar(pagina, 'ArrowRight')).id, 'grades');
  await pagina.close();
});

test('F alterna a tela cheia', async () => {
  const { pagina } = await abrir('index.html');
  await pagina.keyboard.press('f');
  await pagina.waitForFunction(() => document.fullscreenElement === document.documentElement, null, { timeout: 5000 });
  await pagina.keyboard.press('F');
  await pagina.waitForFunction(() => document.fullscreenElement === null, null, { timeout: 5000 });
  await pagina.close();
});

test('com o motor ativo, toda classe do documento é do autor ou está em contrato.classesDoSistema', async () => {
  const { pagina } = await abrir('index.html');
  const classes = await pagina.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .flatMap((elemento) => [...elemento.classList]))]);
  const conhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);
  assert.deepEqual(classes.filter((nome) => !conhecidas.has(nome)), []);
  await pagina.close();
});

test('?folha mantém os slides empilhados, sem palco', async () => {
  const { pagina } = await abrir('index.html?folha');
  const folha = await pagina.evaluate(() => ({
    folha: document.body.classList.contains('folha'),
    palco: document.querySelector('.palco'),
    visiveis: [...document.querySelectorAll('section.slide')].filter((slide) => slide.getClientRects().length > 0).length,
  }));
  assert.deepEqual(folha, { folha: true, palco: null, visiveis: 13 });
  await pagina.close();
});
