// Demos no Chrome (spec 6.7): montagem na primeira entrada, iniciar e parar a cada entrada e saída.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

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

const estadoDaDemo = (pagina) => pagina.evaluate(() => {
  const saida = document.querySelector('#demo .demo output');
  return {
    valor: saida?.textContent,
    entradas: saida?.dataset.entradas,
    parado: saida?.dataset.parado,
    botoes: document.querySelectorAll('#demo .demo button').length,
    slide: document.querySelector('.slide.ativo').id,
  };
});

test('a demo monta uma vez na primeira entrada, com as opções de data-opcoes, e segue a navegação', async () => {
  const { pagina, erros } = await abrir('index.html');
  assert.equal(await pagina.evaluate(() => document.querySelector('#demo .demo output')), null);
  await pagina.evaluate(() => { location.hash = '#demo'; });
  await pagina.waitForFunction(() => document.querySelector('#demo .demo output'));
  assert.deepEqual(await estadoDaDemo(pagina), { valor: '0', entradas: '1', parado: undefined, botoes: 1, slide: 'demo' });
  await pagina.locator('#demo .demo button').click();
  assert.equal((await estadoDaDemo(pagina)).valor, '5');
  await pagina.keyboard.press('ArrowRight');
  assert.deepEqual(await estadoDaDemo(pagina), { valor: '5', entradas: '1', parado: 'sim', botoes: 1, slide: 'grades' });
  await pagina.keyboard.press('ArrowLeft');
  assert.deepEqual(await estadoDaDemo(pagina), { valor: '5', entradas: '2', parado: undefined, botoes: 1, slide: 'demo' });
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('a fila do carregador é drenada e AulaUSP.demo continua registrando', async () => {
  const { pagina } = await abrir('index.html');
  assert.deepEqual(await pagina.evaluate(() => [window.AulaUSP.filaDeDemos.length, typeof window.AulaUSP.demo]), [0, 'function']);
  await pagina.close();
});

test('espaço com o foco num controle da demo aciona o controle, sem passar de slide', async () => {
  const { pagina } = await abrir('index.html#demo');
  await pagina.locator('#demo .demo button').focus();
  await pagina.keyboard.press('Space');
  assert.deepEqual(await estadoDaDemo(pagina), { valor: '5', entradas: '1', parado: undefined, botoes: 1, slide: 'demo' });
  await pagina.close();
});

test('data-demo sem registro correspondente só gera aviso no console', async () => {
  const pagina = await navegador.newPage();
  const avisos = [];
  pagina.on('console', (mensagem) => { if (mensagem.type() === 'warning') avisos.push(mensagem.text()); });
  await pagina.goto(`${servidor.endereco}/index.html`);
  await pagina.waitForFunction(() => document.body.dataset.montado === 'sim');
  await pagina.evaluate(() => { document.querySelector('#demo .demo').setAttribute('data-demo', 'ausente'); location.hash = '#demo'; });
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'demo');
  assert.ok(avisos.some((texto) => texto.includes('demo sem registro: "ausente"')), avisos.join('\n'));
  assert.equal(await pagina.evaluate(() => document.querySelector('.slide.ativo').id), 'demo');
  await pagina.close();
});
