// Carregador clássico (spec 3.2, passo 1): corpo escondido desde a leitura e fila de AulaUSP.demo antes da entrada modular.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

let servidor;
let navegador;

before(async () => {
  servidor = await servirPasta('tests/fixtures/carregador/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

test('o corpo fica escondido durante a leitura, AulaUSP.demo enfileira e a montagem mostra o corpo', async () => {
  const { pagina, erros } = await abrirAula(navegador, `${servidor.endereco}/`);
  const estado = await pagina.evaluate(() => ({
    durante: window.visibilidadeDuranteALeitura,
    demoNaLeitura: window.tipoDeDemoNaLeitura,
    depois: getComputedStyle(document.body).visibility,
    estiloDeOcultar: document.querySelectorAll('style[data-aula-usp]').length,
    fila: window.AulaUSP.filaDeDemos.length,
  }));
  assert.deepEqual(estado, { durante: 'hidden', demoNaLeitura: 'function', depois: 'visible', estiloDeOcultar: 0, fila: 0 });
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('se a entrada modular não carrega, o corpo aparece cru e o erro vai para o console', async () => {
  const pagina = await navegador.newPage();
  const mensagens = [];
  pagina.on('console', (mensagem) => mensagens.push(mensagem.text()));
  await pagina.route('**/_aula-usp/montar/navegador.js', (rota) => rota.abort());
  await pagina.goto(`${servidor.endereco}/`);
  await pagina.waitForFunction(() => !document.querySelector('style[data-aula-usp]'));
  assert.equal(await pagina.evaluate(() => getComputedStyle(document.body).visibility), 'visible');
  assert.equal(await pagina.evaluate(() => document.body.dataset.montado), undefined);
  assert.ok(mensagens.some((texto) => texto.includes('Aula USP: a entrada do navegador não carregou.')), mensagens.join('\n'));
  await pagina.close();
});
