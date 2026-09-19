// Painel do validador no Chrome (spec 3.2, 6.5 e 9.1): abre sozinho só com erro, alterna com V, copia o achado.
// Um navegador só, duas pastas servidas: o espécime (limpo) e a fixture nova (com o erro de propósito).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula, esperarMontagem } from './utilitarios.mjs';

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
  console.log('painel.test.mjs: 1/10 aula limpa');
  const { pagina, erros } = await abrirEspecime('index.html');
  assert.deepEqual(await paineisAbertos(pagina), []);
  assert.equal((await painelValidador(pagina)).titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('uma aula com erro abre o painel do validador sozinho', async () => {
  console.log('painel.test.mjs: 2/10 aula com erro');
  const { pagina } = await abrirFixture('erro.html');
  const validador = await painelValidador(pagina);
  assert.deepEqual(await paineisAbertos(pagina), ['validador']);
  assert.equal(validador.visivel, true);
  assert.equal(validador.titulo, 'Validador Aula USP: 1 erro, 0 avisos');
  assert.equal(validador.achados, 1);
  await pagina.close();
});

test('a tecla V alterna o painel do validador', async () => {
  console.log('painel.test.mjs: 3/10 tecla V');
  const { pagina } = await abrirEspecime('index.html');
  assert.equal((await painelValidador(pagina)).visivel, false);
  await pagina.keyboard.press('v');
  assert.equal((await painelValidador(pagina)).visivel, true);
  await pagina.keyboard.press('V');
  assert.equal((await painelValidador(pagina)).visivel, false);
  await pagina.close();
});

test('o texto copiado começa pelo cabeçalho do validador', async () => {
  console.log('painel.test.mjs: 4/10 copiar para o chat');
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

function linhasDoValidador(pagina) {
  return pagina.evaluate(() => [...document.querySelectorAll('[data-painel="validador"] .achados li')].map((li) => li.textContent));
}

// Critical da revisão final do 4c: o passo 6 não esperava o `load` e media o grupo de carga sobre o
// documento montado — uma imagem do cromo (ou do autor) ainda em voo virava "não carregou". As duas
// causas se somam nesta fixture: atrasa toda imagem .svg (a marca do cromo é .svg, e a imagem do
// autor também), e nada deve acusar.
test('imagem do autor e marca do cromo atrasadas não acusam recursos.imagem', async () => {
  console.log('painel.test.mjs: 5/10 imagens atrasadas');
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  await pagina.route('**/*.svg', async (rota) => {
    await new Promise((pronto) => setTimeout(pronto, 1200));
    await rota.continue();
  });
  await pagina.goto(`${servidorDaFixture.endereco}/imagem-atrasada.html`);
  await esperarMontagem(pagina);
  assert.deepEqual(await paineisAbertos(pagina), []);
  assert.equal((await painelValidador(pagina)).titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  await pagina.close();
});

// A outra metade do Critical: uma imagem do autor que de fato não existe continua acusando — uma vez
// só, no slide certo. Sem isso, "rodar o grupo de carga sobre o fonte" poderia ter ficado cego demais.
test('uma imagem do autor que não existe acusa uma vez, no slide certo', async () => {
  console.log('painel.test.mjs: 6/10 imagem do autor quebrada');
  const { pagina } = await abrirFixture('imagem-quebrada.html');
  const validador = await painelValidador(pagina);
  const linhas = await linhasDoValidador(pagina);
  assert.deepEqual(await paineisAbertos(pagina), ['validador']);
  assert.equal(validador.titulo, 'Validador Aula USP: 1 erro, 0 avisos');
  assert.equal(linhas.filter((linha) => linha.includes('recursos.imagem')).length, 1);
  assert.ok(linhas.some((linha) => linha.includes('slide 2 #com-imagem-quebrada')), linhas.join('\n'));
  await pagina.close();
});

// Guarda de ordem (revisão final do 4c, I1): se a composição rodasse depois de iniciarMotor, este
// slide (o segundo, não o primeiro) mediria 0×0 — display:none nos slides que não são o .ativo — e o
// transbordo sumiria. Ver a checagem de inversão no relatório desta rodada.
test('transbordo num slide que não é o primeiro acusa mesmo com o motor rodando', async () => {
  console.log('painel.test.mjs: 7/10 composição antes do motor');
  const { pagina } = await abrirFixture('transbordo.html');
  const linhas = await linhasDoValidador(pagina);
  assert.deepEqual(await paineisAbertos(pagina), ['validador']);
  assert.ok(linhas.some((linha) => linha.includes('composicao.transbordo') && linha.includes('slide 2')), linhas.join('\n'));
  await pagina.close();
});

// Guarda de ordem (revisão final do 4c, I2 / Ruling 11): motor/demos.js esvazia filaDeDemos dentro de
// instalarDemos, que só roda depois do passo 6. Se a fila fosse lida vazia, esta div.demo acusaria
// recursos.demo-sem-registro (erro). Ver a checagem de inversão no relatório desta rodada.
test('uma demo registrada não acusa recursos.demo-sem-registro', async () => {
  console.log('painel.test.mjs: 8/10 fila de demos antes do motor');
  const { pagina } = await abrirFixture('demo.html');
  assert.deepEqual(await paineisAbertos(pagina), []);
  assert.equal((await painelValidador(pagina)).titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  await pagina.close();
});

// Re-revisão da rodada de correção: a espera pelo load consertou o Critical e abriu um buraco pior —
// o <body> fica escondido até o fim da montagem, então um recurso que nunca responde deixava a aula
// em branco para sempre, sem mensagem. Duas afirmações, porque são duas correções: a aula aparece
// (teto na espera) e a imagem pendurada não é acusada (o mapa só guarda quem tem desfecho). Este
// teste não pode usar abrirAula: o goto dela espera o load, que é justamente o que pendura aqui.
test('um recurso do autor que nunca responde não deixa a aula em branco, nem vira acusação', async () => {
  console.log('painel.test.mjs: 9/10 recurso pendurado');
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  // Sem continue/abort/fulfill: o pedido fica pendurado, como um servidor que aceita a conexão e cala.
  await pagina.route('**/img/foto.svg', () => {});
  await pagina.goto(`${servidorDaFixture.endereco}/imagem-atrasada.html`, { waitUntil: 'domcontentloaded' });
  await esperarMontagem(pagina);
  assert.equal(await pagina.evaluate(() => getComputedStyle(document.body).visibility), 'visible');
  assert.equal((await painelValidador(pagina)).titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  await pagina.close();
});

// Guarda do Critical em si (re-revisão, Item 2): o grupo de carga roda sobre `fonte`, e por isso os
// erros de TeX precisam da tradução por índice de section em navegador.js — o alerta .tex-invalido só
// existe no documento vivo. Trocar `fonte` de volta por `document`, ou quebrar a tradução, faz o slide
// virar null ("aula") em silêncio, e até aqui nenhum teste via. Sem ?folha de propósito: com ?folha o
// painel nunca é instalado, que é por onde esse caminho tinha escapado de toda a suíte.
test('o slide de um TeX inválido é lido no fonte, não no documento montado', async (t) => {
  console.log('painel.test.mjs: 10/10 slide do TeX inválido');
  const fixturasDeTex = await servirPasta('tests/fixtures/tex/');
  t.after(() => fixturasDeTex.fechar());
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  t.after(() => pagina.close());
  await pagina.goto(`${fixturasDeTex.endereco}/index.html`);
  await esperarMontagem(pagina);
  const tex = (await linhasDoValidador(pagina)).filter((linha) => linha.includes('matematica.tex-invalido'));
  assert.equal(tex.length, 3, tex.join('\n'));
  assert.ok(tex.every((linha) => linha.includes('slide 3 #invalido')), tex.join('\n'));
});
