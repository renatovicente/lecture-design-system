// Painel do validador no Chrome (spec 3.2, 6.5 e 9.1): abre sozinho só com erro, alterna com V, copia o achado.
// Um navegador só, duas pastas servidas: o espécime (limpo) e a fixture nova (com o erro de propósito).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

let servidorDoEspecime;
let servidorDaFixture;
let navegador;

before(async () => {
  servidorDoEspecime = await servirPasta('especime/');
  servidorDaFixture = await servirPasta('tests/fixtures/painel/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidorDoEspecime?.fechar();
  await servidorDaFixture?.fechar();
});

const abrirEspecime = (caminho, opcoes) => abrirAula(navegador, `${servidorDoEspecime.endereco}/${caminho}`, opcoes);
const abrirFixture = (caminho, opcoes) => abrirAula(navegador, `${servidorDaFixture.endereco}/${caminho}`, opcoes);

function painelValidador(pagina) {
  return pagina.evaluate(() => {
    const elemento = document.querySelector('[data-painel="validador"]');
    return {
      visivel: !elemento.hidden,
      titulo: elemento.querySelector('.painel-titulo').textContent,
      achados: elemento.querySelectorAll('.achados li').length,
    };
  });
}

function paineisAbertos(pagina) {
  return pagina.evaluate(() => [...document.querySelectorAll('[data-painel]')].filter((p) => !p.hidden).map((p) => p.dataset.painel));
}

test('uma aula limpa não abre painel nenhum', async () => {
  console.log('painel.test.mjs: 1/4 aula limpa');
  const { pagina, erros } = await abrirEspecime('index.html');
  assert.deepEqual(await paineisAbertos(pagina), []);
  assert.equal((await painelValidador(pagina)).titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('uma aula com erro abre o painel do validador sozinho', async () => {
  console.log('painel.test.mjs: 2/4 aula com erro');
  const { pagina } = await abrirFixture('erro.html');
  const validador = await painelValidador(pagina);
  assert.deepEqual(await paineisAbertos(pagina), ['validador']);
  assert.equal(validador.visivel, true);
  assert.equal(validador.titulo, 'Validador Aula USP: 1 erro, 0 avisos');
  assert.equal(validador.achados, 1);
  await pagina.close();
});

test('a tecla V alterna o painel do validador', async () => {
  console.log('painel.test.mjs: 3/4 tecla V');
  const { pagina } = await abrirEspecime('index.html');
  assert.equal((await painelValidador(pagina)).visivel, false);
  await pagina.keyboard.press('v');
  assert.equal((await painelValidador(pagina)).visivel, true);
  await pagina.keyboard.press('V');
  assert.equal((await painelValidador(pagina)).visivel, false);
  await pagina.close();
});

test('o texto copiado começa pelo cabeçalho do validador', async () => {
  console.log('painel.test.mjs: 4/4 copiar para o chat');
  const { pagina } = await abrirFixture('erro.html');
  // navigator.clipboard já existe (servido por http://127.0.0.1, contexto seguro); troca por um coto
  // que só guarda o texto, para o teste não depender do clipboard de verdade do sistema operacional.
  await pagina.evaluate(() => {
    window.__copiado = null;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (texto) => { window.__copiado = texto; return Promise.resolve(); } },
    });
  });
  await pagina.locator('[data-painel="validador"] .copiar').click();
  const copiado = await pagina.evaluate(() => window.__copiado);
  assert.match(copiado, /^Validador Aula USP: 1 erro, 0 avisos\n/);
  await pagina.close();
});
