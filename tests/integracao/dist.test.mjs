// dist/ pelo caminho real: servidor estático burro, a tag que o espécime já carrega, Chrome de verdade.
// Sem o `servir`, de propósito — é o `servir` que hoje reescreve a tag, e o que está sob teste aqui é
// justamente o caminho em que ninguém reescreve nada. Por isso servirPastaCrua, não servirPasta — ver
// o comentário dela em utilitarios.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPastaCrua, esperarMontagem } from './utilitarios.mjs';

let navegador;
let sitio;

before(async () => {
  navegador = await iniciarChrome();
  sitio = await servirPastaCrua('.'); // a raiz do sistema: o espécime pede ../dist/aula-usp.js
});
after(async () => {
  await navegador?.close();
  await sitio?.fechar();
});

async function abrirPeloDist(deck) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  pagina.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) erros.push(m.text()); });
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${sitio.endereco}/especime/${deck}`);
  await esperarMontagem(pagina);
  const titulo = await pagina.evaluate(() => document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent);
  return { pagina, erros, titulo };
}

for (const deck of ['index.html', 'matematica.html', 'codigo.html']) {
  test(`${deck} monta pelo pacote de dist/, sem erro de console`, async (t) => {
    const { pagina, erros, titulo } = await abrirPeloDist(deck);
    t.after(() => pagina.close());
    assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
    assert.deepEqual(erros, [], erros.join('\n'));
  });
}

// A fila de demos é a razão de o pacote ser script clássico (tarefa 1). Este teste mede o efeito,
// não a forma: se o pacote virar módulo, ele roda depois do <script> do autor e a demo se perde.
test('a demo registrada pelo script do autor chega ao runtime', async (t) => {
  const { pagina } = await abrirPeloDist('index.html');
  t.after(() => pagina.close());
  const registradas = await pagina.evaluate(() => [...(window.AulaUSP?.demos?.keys?.() ?? [])].length);
  const naFila = await pagina.evaluate(() => window.AulaUSP?.filaDeDemos?.length ?? -1);
  assert.ok(registradas > 0 || naFila === 0, 'nem registro nem fila: a demo do autor se perdeu');
});
