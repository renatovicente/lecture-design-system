// Painéis do motor no Chrome (spec 6.5): notas (N), visão geral (Esc) e ajuda (?).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RAIZ, iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

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

function painel(pagina, nome) {
  return pagina.evaluate((qual) => {
    const elemento = document.querySelector(`[data-painel="${qual}"]`);
    const { x, width } = elemento.getBoundingClientRect();
    return {
      visivel: !elemento.hidden,
      x,
      largura: width,
      titulo: elemento.querySelector('.painel-titulo').textContent,
      corpo: elemento.querySelector('.painel-corpo').textContent.trim(),
    };
  }, nome);
}

function larguraDoPalco(pagina) {
  return pagina.evaluate(() => document.querySelector('.palco').getBoundingClientRect().width);
}

test('N abre as notas à direita, com 380 px; o palco cabe no que sobra; as notas acompanham a navegação', async () => {
  const { pagina, erros } = await abrir('index.html#o-que-mostra', { largura: 1600, altura: 900 });
  await pagina.keyboard.press('n');
  assert.deepEqual(await painel(pagina, 'notas'), {
    visivel: true, x: 1220, largura: 380, titulo: 'Notas', corpo: 'Estas notas não aparecem no slide.',
  });
  const palco = await pagina.evaluate(() => {
    const { x, y, width, height } = document.querySelector('.palco').getBoundingClientRect();
    return { x, y, largura: width, altura: height };
  });
  assert.deepEqual(palco, { x: 0, y: 106.875, largura: 1220, altura: 686.25 });
  await pagina.keyboard.press('ArrowRight');
  await pagina.keyboard.press('ArrowRight');
  await pagina.keyboard.press('ArrowRight');
  assert.equal((await painel(pagina, 'notas')).corpo, 'Este slide não tem notas.');
  await pagina.keyboard.press('N');
  assert.equal((await painel(pagina, 'notas')).visivel, false);
  assert.equal(await larguraDoPalco(pagina), 1600);
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('com as notas abertas, as faixas laterais valem para a largura que sobra ao palco', async () => {
  const { pagina } = await abrir('index.html#grade-6-6', { largura: 1600, altura: 900 });
  await pagina.keyboard.press('n');
  await pagina.mouse.click(1150, 450);
  assert.equal(await pagina.evaluate(() => document.querySelector('.slide.ativo').id), 'grade-4-8');
  await pagina.mouse.click(100, 450);
  assert.equal(await pagina.evaluate(() => document.querySelector('.slide.ativo').id), 'grade-6-6');
  await pagina.close();
});

test('Esc abre a visão geral: cartões agrupados por bloco, com número, título e quadrado; clicar navega e fecha', async () => {
  const { pagina } = await abrir('index.html#grade-8-4');
  await pagina.keyboard.press('Escape');
  const visao = await pagina.evaluate(() => {
    const raiz = document.querySelector('[data-painel="visao-geral"]');
    return {
      visivel: !raiz.hidden,
      grupos: [...raiz.querySelectorAll('.grupo-titulo')].map((titulo) => titulo.textContent),
      cartoes: raiz.querySelectorAll('.cartao').length,
      numeros: [...raiz.querySelectorAll('.cartao-numero')].map((numero) => numero.textContent),
      atual: raiz.querySelector('.cartao[aria-current="true"] .cartao-titulo').textContent,
      quadrados: [...raiz.querySelectorAll('.grupo')].map((grupo) => grupo.querySelector('.quadrado')?.className ?? null),
    };
  });
  assert.deepEqual(visao, {
    visivel: true,
    grupos: ['Introdução', '01 · Blocos', '02 · Figuras e demos', '03 · Grades', 'Encerramento'],
    cartoes: 13,
    numeros: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
    atual: 'Grade 8-4 texto largo e coluna estreita',
    quadrados: [null, 'quadrado atual', 'quadrado futuro', 'quadrado futuro', null],
  });
  await pagina.locator('[data-painel="visao-geral"] .cartao', { hasText: 'Grade 6-6' }).click();
  assert.equal(await pagina.evaluate(() => location.hash), '#grade-6-6');
  assert.equal((await painel(pagina, 'visao-geral')).visivel, false);
  await pagina.close();
});

test('? abre a ajuda com a tabela de teclas; Esc fecha o painel aberto e, sem painel, abre a visão geral', async () => {
  const { pagina } = await abrir('index.html');
  await pagina.keyboard.press('?');
  const ajuda = await pagina.evaluate(() => {
    const raiz = document.querySelector('[data-painel="ajuda"]');
    return {
      visivel: !raiz.hidden,
      cabecalho: [...raiz.querySelectorAll('thead th')].map((celula) => celula.textContent),
      linhas: raiz.querySelectorAll('tbody tr').length,
      primeira: raiz.querySelector('tbody th').textContent,
    };
  });
  assert.deepEqual(ajuda, { visivel: true, cabecalho: ['Tecla', 'Ação'], linhas: 10, primeira: '→, espaço, PageDown' });
  await pagina.keyboard.press('Escape');
  assert.equal((await painel(pagina, 'ajuda')).visivel, false);
  await pagina.keyboard.press('Escape');
  assert.equal((await painel(pagina, 'visao-geral')).visivel, true);
  await pagina.keyboard.press('Escape');
  assert.equal((await painel(pagina, 'visao-geral')).visivel, false);
  await pagina.close();
});

test('um painel por vez: abrir a ajuda fecha as notas e devolve a largura ao palco', async () => {
  const { pagina } = await abrir('index.html', { largura: 1600, altura: 900 });
  await pagina.keyboard.press('n');
  await pagina.keyboard.press('?');
  assert.equal((await painel(pagina, 'notas')).visivel, false);
  assert.equal((await painel(pagina, 'ajuda')).visivel, true);
  assert.equal(await larguraDoPalco(pagina), 1600);
  await pagina.close();
});

test('painéis em inglês numa aula com lang="en"', async () => {
  const { pagina } = await abrir('ifusp.html');
  await pagina.keyboard.press('n');
  assert.deepEqual(await painel(pagina, 'notas'), {
    visivel: true, x: 1020, largura: 380, titulo: 'Notes', corpo: 'This slide has no notes.',
  });
  await pagina.keyboard.press('?');
  const ajuda = await painel(pagina, 'ajuda');
  assert.equal(ajuda.titulo, 'Help');
  assert.ok(ajuda.corpo.startsWith('KeyAction'), ajuda.corpo);
  await pagina.close();
});

test('com os painéis abertos, toda classe do documento continua no contrato', async () => {
  const { pagina } = await abrir('index.html#grade-8-4');
  await pagina.keyboard.press('Escape');
  const classes = await pagina.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .flatMap((elemento) => [...elemento.classList]))]);
  const conhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);
  assert.deepEqual(classes.filter((nome) => !conhecidas.has(nome)), []);
  await pagina.close();
});
