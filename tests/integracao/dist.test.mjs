// dist/ pelo caminho real: servidor estático burro, a tag que o espécime já carrega, Chrome de verdade.
// Sem o `servir`, de propósito — é o `servir` que hoje reescreve a tag, e o que está sob teste aqui é
// justamente o caminho em que ninguém reescreve nada. Por isso servirPastaCrua, não servirPasta — ver
// o comentário dela em utilitarios.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPastaCrua, esperarMontagem, abrirAula } from './utilitarios.mjs';

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

// Recebe o caminho completo a partir da raiz servida por servirPastaCrua('.') — não só o nome do
// deck — porque a rodada de correção 1 precisou abrir também uma fixture fora de especime/
// (tests/fixtures/painel/demo.html) pelo mesmo pacote real. Os três decks passam `especime/${deck}`.
async function abrirPeloDist(caminho) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  pagina.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) erros.push(m.text()); });
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${sitio.endereco}/${caminho}`);
  await esperarMontagem(pagina);
  const titulo = await pagina.evaluate(() => document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent);
  return { pagina, erros, titulo };
}

for (const deck of ['index.html', 'matematica.html', 'codigo.html']) {
  test(`${deck} monta pelo pacote de dist/, sem erro de console`, async (t) => {
    const { pagina, erros, titulo } = await abrirPeloDist(`especime/${deck}`);
    t.after(() => pagina.close());
    assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
    assert.deepEqual(erros, [], erros.join('\n'));
  });
}

// Critical da revisão final do 5a (C1): três das quatro buscas de rede que entrada.js faz (contrato,
// unidades, usp) estavam num Promise.all sem guarda — bloqueadas (como aqui: servirPastaCrua não tem
// CDN nenhuma fora do ar, mas o efeito de "não embutiu" é o mesmo pedido de rede), a aula não montava,
// tela em branco, sem mensagem. Foi assim que o revisor achou o problema: abrindo um deck e olhando os
// pedidos de rede. Mede a CONSEQUÊNCIA (nenhum pedido que não seja script sobra), não o mecanismo (que
// módulos dist.js importa) — se alguém voltar a buscar qualquer um dos quatro JSON ou das três marcas
// por fetch/<img src>, o pedido aparece na lista e o teste falha.
test('o pacote de dist/ não busca nenhum recurso que não seja script (spec 3.2)', async (t) => {
  const url = `${sitio.endereco}/especime/index.html`;
  const { pagina, erros, pedidos } = await abrirAula(navegador, url);
  t.after(() => pagina.close());
  const titulo = await pagina.evaluate(() => document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent);
  assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.deepEqual(erros, [], erros.join('\n'));
  const outros = pedidos.filter((pedido) => pedido !== url && !pedido.endsWith('.js') && !pedido.endsWith('/favicon.ico'));
  assert.deepEqual(outros, [], `pedido de rede que não é script: ${outros.join(', ')}`);
});

// A fila de AulaUSP.demo existir antes do <script> do autor é a razão de o pacote ser script
// clássico, e a razão de a tarefa 1 ter partido a entrada em três (rodada de correção 1, item 2).
// Este teste mede a CONSEQUÊNCIA, não o mecanismo: window.AulaUSP.demos nunca existe nesta
// arquitetura (motor/demos.js guarda o registro num Map fechado dentro de criarDemos, nunca
// reexposto) e instalarDemos esvazia filaDeDemos incondicionalmente — então medir os dois direto,
// como a versão anterior deste teste fazia, é tautológico (dá sempre `0 > 0 || 0 === 0`, sempre
// verdadeiro, não importa se a fila sobreviveu ou não). tests/fixtures/painel/demo.html registra
// 'fixture-demo' durante o parsing e tem um <div class="demo" data-demo="fixture-demo">: se a fila
// se perder antes do passo 6 de montar/entrada.js ler filaDeDemos, recursos.demo-sem-registro
// dispara como ERRO (contrato.json: severidade "erro") e o painel deixa de dizer "0 erros" — o
// mesmo defeito que a Ruling 11 (motor/demos.js) documenta e guarda do lado do motor.
test('a demo registrada durante o parsing sobrevive ao pacote do dist', async (t) => {
  const { pagina, erros, titulo } = await abrirPeloDist('tests/fixtures/painel/demo.html');
  t.after(() => pagina.close());
  assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.deepEqual(erros, [], erros.join('\n'));
});
