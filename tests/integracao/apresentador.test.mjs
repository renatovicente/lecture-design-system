// Janela do apresentador no Chrome (spec 6.6 e 11.2): miniaturas, sincronia nos dois sentidos e pop-up bloqueado.
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

const abrir = (caminho) => abrirAula(navegador, `${servidor.endereco}/${caminho}`);

async function abrirApresentador(pagina) {
  const [popup] = await Promise.all([pagina.waitForEvent('popup', { timeout: 5000 }), pagina.keyboard.press('p')]);
  await esperarMontagem(popup);
  return popup;
}

const posicao = (pagina) => pagina.evaluate(() => document.querySelector('.posicao').textContent);
const slideAtivo = (pagina) => pagina.evaluate(() => document.querySelector('.slide.ativo').id);

test('P abre o apresentador com as duas miniaturas, posição, mapa e notas do slide', async () => {
  const { pagina, erros } = await abrir('index.html#o-que-mostra');
  const popup = await abrirApresentador(pagina);
  const visao = await popup.evaluate(() => ({
    endereco: location.search,
    palcoVisivel: getComputedStyle(document.querySelector('.palco')).display !== 'none',
    atual: document.querySelector('[data-miniatura="atual"] .slide')?.id,
    proxima: document.querySelector('[data-miniatura="proxima"] .slide')?.id,
    reveladosAtual: document.querySelectorAll('[data-miniatura="atual"] [data-passo][data-revelado]').length,
    reveladosProxima: document.querySelectorAll('[data-miniatura="proxima"] [data-passo][data-revelado]').length,
    posicao: document.querySelector('.posicao').textContent,
    quadrados: document.querySelectorAll('.painel-apresentador .mapa .quadrado').length,
    notas: document.querySelector('.notas-apresentador').textContent.trim(),
    escala: document.querySelector('[data-miniatura="atual"] .quadro-miniatura').style.getPropertyValue('--escala-miniatura'),
  }));
  assert.equal(visao.endereco, '?apresentador=1');
  assert.equal(visao.palcoVisivel, false);
  assert.equal(visao.atual, 'o-que-mostra-atual');
  assert.equal(visao.proxima, 'o-que-mostra-proxima');
  assert.deepEqual([visao.reveladosAtual, visao.reveladosProxima], [0, 1]);
  assert.equal(visao.posicao, 'slide 2 / 13 · passo 0 / 2');
  assert.equal(visao.quadrados, 3);
  assert.equal(visao.notas, 'Estas notas não aparecem no slide.');
  assert.ok(Number(visao.escala) > 0 && Number(visao.escala) < 1, visao.escala);
  assert.deepEqual(erros, []);
  await popup.close();
  await pagina.close();
});

test('navegar numa janela move a outra, nos dois sentidos', async () => {
  const { pagina } = await abrir('index.html');
  const popup = await abrirApresentador(pagina);
  await pagina.keyboard.press('ArrowRight');
  await popup.waitForFunction(() => document.querySelector('.posicao').textContent.startsWith('slide 2 /'));
  assert.equal(await posicao(popup), 'slide 2 / 13 · passo 0 / 2');
  await popup.keyboard.press('ArrowRight');
  await pagina.waitForFunction(() => location.hash === '#o-que-mostra/1');
  assert.equal(await posicao(popup), 'slide 2 / 13 · passo 1 / 2');
  await popup.keyboard.press('End');
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'encerramento');
  assert.equal(await slideAtivo(pagina), 'encerramento');
  await popup.close();
  await pagina.close();
});

test('recarregar a janela da aula refaz a sincronia', async () => {
  const { pagina } = await abrir('index.html');
  const popup = await abrirApresentador(pagina);
  await pagina.reload();
  await esperarMontagem(pagina);
  await popup.keyboard.press('2');
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'figuras-e-demos', null, { timeout: 15000 });
  assert.equal(await slideAtivo(pagina), 'figuras-e-demos');
  await popup.close();
  await pagina.close();
});

test('cronômetro conta e zera; o relógio mostra a hora', async () => {
  const { pagina } = await abrir('index.html');
  const popup = await abrirApresentador(pagina);
  const tempo = () => popup.evaluate(() => document.querySelector('.cronometro .tempo').textContent);
  assert.equal(await tempo(), '00:00');
  await popup.getByRole('button', { name: 'Iniciar' }).click();
  await popup.waitForFunction(() => document.querySelector('.cronometro .tempo').textContent !== '00:00', null, { timeout: 5000 });
  await popup.getByRole('button', { name: 'Pausar' }).click();
  const pausado = await tempo();
  await popup.getByRole('button', { name: 'Zerar' }).click();
  assert.equal(await tempo(), '00:00');
  assert.match(pausado, /^\d\d:\d\d$/);
  assert.match(await popup.evaluate(() => document.querySelector('.cronometro .relogio').textContent), /\d{1,2}[:h]\d\d/);
  await popup.close();
  await pagina.close();
});

test('com o pop-up bloqueado, as notas abrem com o aviso', async () => {
  const { pagina } = await abrir('index.html');
  await pagina.evaluate(() => { window.open = () => null; });
  await pagina.keyboard.press('p');
  const aviso = await pagina.evaluate(() => {
    const painel = document.querySelector('[data-painel="notas"]');
    const elementoAviso = painel.querySelector('.aviso');
    return { visivel: !painel.hidden, avisoVisivel: !elementoAviso?.hidden, texto: elementoAviso?.textContent };
  });
  assert.equal(aviso.visivel, true);
  assert.equal(aviso.avisoVisivel, true);
  assert.match(aviso.texto, /bloqueou a janela do apresentador/);
  await pagina.close();
});

test('depois do aviso de pop-up bloqueado, fechar e reabrir as notas (N duas vezes) mostra as notas do slide sem o aviso', async () => {
  const { pagina } = await abrir('index.html#o-que-mostra');
  await pagina.evaluate(() => { window.open = () => null; });
  await pagina.keyboard.press('p');
  await pagina.keyboard.press('n');
  await pagina.keyboard.press('n');
  const notas = await pagina.evaluate(() => {
    const painel = document.querySelector('[data-painel="notas"]');
    const elementoAviso = painel.querySelector('.aviso');
    return { visivel: !painel.hidden, avisoVisivel: !elementoAviso?.hidden, corpo: painel.querySelector('.painel-corpo').textContent.trim() };
  });
  assert.equal(notas.visivel, true);
  assert.equal(notas.avisoVisivel, false);
  assert.equal(notas.corpo, 'Estas notas não aparecem no slide.');
  await pagina.close();
});

test('no apresentador, toda classe do documento está no contrato', async () => {
  const { pagina } = await abrir('index.html');
  const popup = await abrirApresentador(pagina);
  const classes = await popup.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .flatMap((elemento) => [...elemento.classList]))]);
  const conhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);
  assert.deepEqual(classes.filter((nome) => !conhecidas.has(nome)), []);
  await popup.close();
  await pagina.close();
});
