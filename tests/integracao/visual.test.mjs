// Tarefa 4 do marco 5c (spec 3.3): prova a promessa central do marco — o modo navegador (a aula
// monta e renderiza em tempo real; KaTeX compõe a matemática e Shiki destaca o código NO CLIENTE) e o
// modo build (`construir()`, marco 5b: as mesmas duas coisas rodam em Node, horas antes, e o
// navegador só recebe HTML pronto) produzem A MESMA IMAGEM. São dois caminhos de código totalmente
// diferentes — este arquivo é o que garante que eles não divergem.
//
// Fato 8 do plano, medido antes deste código: com pixelmatch, viewport 1280×720, deviceScaleFactor 1,
// depois de document.fonts.ready, ZERO pixels diferentes em 921.600, em todos os slides de
// especime/matematica.html (8) e especime/codigo.html (9) — inclusive onde os caminhos mais
// divergem (KaTeX e Shiki pré-renderizados de um lado, renderizados no navegador do outro). Por isso
// a asserção abaixo é igualdade, não semelhança dentro de tolerância: um limiar generoso
// desperdiçaria a informação que essa medição já deu de graça.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { iniciarChrome, servirPastaCrua, esperarMontagem } from './utilitarios.mjs';
import { construir } from '../../build/construir.mjs';
import { LARGURA_DO_PALCO, ALTURA_DO_PALCO } from '../../motor/motor.js';

const RAIZ = new URL('../../', import.meta.url);
const DECKS = ['matematica.html', 'codigo.html'];

// O viewport não é um número escolhido à parte: é o próprio tamanho lógico do palco (motor/motor.js).
// Com a janela exatamente nesse tamanho, ajustarEscala() calcula escala 1 — o slide enche o viewport
// sem sobra e sem fator de escala fracionário, o que é o que torna a comparação pixel a pixel possível
// (1280 × 720 = 921.600, o total do fato 8).
const LARGURA = LARGURA_DO_PALCO;
const ALTURA = ALTURA_DO_PALCO;

let navegador;
let sitio;

// "Ritmo de Chrome: uma abertura de navegador, várias páginas" — um Chrome e um servidor para o
// arquivo inteiro; cada teste abre só as páginas que precisa e as fecha no seu t.after.
before(async () => {
  navegador = await iniciarChrome();
  // servirPastaCrua('.'), não servirPasta: é o servidor burro que NÃO reescreve a tag do runtime
  // (ver o comentário dela em utilitarios.mjs e tests/integracao/dist.test.mjs). Serve a RAIZ do
  // repositório, exatamente como o brief desta tarefa descreve o modo navegador — o espécime carrega
  // "../dist/aula-usp.js" do jeito que o autor escreveu, e KaTeX/Shiki rodam no cliente de verdade.
  sitio = await servirPastaCrua('.');
});

after(async () => {
  await navegador?.close();
  await sitio?.fechar();
});

// Pasta dos PNGs de diff: só recebe arquivo quando algo falha (item 6 do despacho desta tarefa —
// "1.482 pixels diferentes" não diz a ninguém o que olhar; o PNG mostra a região exata).
const pastaDeDiffs = await mkdtemp(join(tmpdir(), 'aula-usp-visual-diff-'));
let proximoNomeDeDiff = 0;

async function gravarDiff(rotulo, buffer) {
  const png = new PNG({ width: LARGURA, height: ALTURA });
  png.data.set(buffer);
  const caminho = join(pastaDeDiffs, `${String(proximoNomeDeDiff++).padStart(2, '0')}-${rotulo}.png`);
  await writeFile(caminho, PNG.sync.write(png));
  return caminho;
}

async function abrirPagina(url) {
  const pagina = await navegador.newPage({ viewport: { width: LARGURA, height: ALTURA }, deviceScaleFactor: 1 });
  await pagina.goto(url);
  await esperarMontagem(pagina); // espera dataset.montado === 'sim' e depois document.fonts.ready (utilitarios.mjs).
  return pagina;
}

async function idsDosSlides(pagina) {
  return pagina.evaluate(() => [...document.querySelectorAll('section.slide')].map((slide) => slide.id));
}

// Navega pelo endereço (mesmo padrão de construido-propriedades.test.mjs: location.hash, nunca um
// pagina.goto novo — um goto recarregaria a página e desmontaria a aula) e só fotografa depois de
// confirmar QUE ESTE LADO já tem o slide certo ativo. estilos/motor.css não anima a troca de
// `.ativo` (é um display:none/block simples, sem transition) — a pausa curta abaixo é a do fato 8
// (item 3 do despacho desta tarefa: "esperar (...) e uma pausa curta antes do screenshot"), não uma
// espera por uma condição que falta: ela dá margem ao layout/paint do slide recém-ativado.
async function navegarEFotografar(pagina, id) {
  await pagina.evaluate((alvo) => { location.hash = `#${alvo}`; }, id);
  await pagina.waitForFunction((alvo) => document.querySelector('.slide.ativo')?.id === alvo, id);
  await pagina.waitForTimeout(100);
  // Confirma nesta mesma chamada que quem pintou foi de fato o slide pedido — a armadilha do marco
  // (item 5 do despacho): um slide que não é o ativo fica em display:none. Comparar screenshots de
  // dois slides diferentes daria "igual" ou "diferente" por acidente, nunca pela razão certa.
  const ativo = await pagina.evaluate(() => document.querySelector('.slide.ativo')?.id);
  assert.equal(ativo, id, 'a navegação por hash não ativou o slide pedido');
  return pagina.screenshot({ type: 'png' });
}

function comparar(bufferA, bufferB) {
  const a = PNG.sync.read(bufferA);
  const b = PNG.sync.read(bufferB);
  assert.equal(a.width, LARGURA);
  assert.equal(a.height, ALTURA);
  assert.equal(b.width, LARGURA);
  assert.equal(b.height, ALTURA);
  const diff = new PNG({ width: LARGURA, height: ALTURA });
  // threshold: 0 é o próprio ponto da tarefa (fato 8) — a medição encontrou igualdade exata, e um
  // limiar frouxo escureceria essa informação em vez de expressá-la.
  const diferentes = pixelmatch(a.data, b.data, diff.data, LARGURA, ALTURA, { threshold: 0 });
  return { diferentes, diff };
}

for (const deck of DECKS) {
  test(`${deck}: navegador e build renderizam pixel a pixel iguais, em todos os slides`, async (t) => {
    const destino = await mkdtemp(join(tmpdir(), 'visual-build-'));
    const { caminhoDoHtml } = await construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${deck}`, RAIZ), destino });

    const paginaNavegador = await abrirPagina(`${sitio.endereco}/especime/${deck}`);
    const paginaBuild = await abrirPagina(`file://${caminhoDoHtml}`);
    t.after(() => Promise.all([paginaNavegador.close(), paginaBuild.close()]));

    const idsNavegador = await idsDosSlides(paginaNavegador);
    const idsBuild = await idsDosSlides(paginaBuild);
    assert.deepEqual(idsBuild, idsNavegador,
      `${deck}: os dois modos discordam em quais slides existem ou em que ordem — navegador: ${idsNavegador.join(', ')} · build: ${idsBuild.join(', ')}`);

    // Item 7 do despacho: progresso entre os slides. Cada slide § seu próprio subteste (node:test
    // imprime cada um ao terminar) — sequencial de propósito, porque as duas páginas são
    // compartilhadas por todos os slides deste deck (abrir 17 páginas novas violaria "uma abertura
    // de navegador, várias páginas"; rodar em paralelo faria duas navegações de hash disputarem a
    // MESMA página ao mesmo tempo).
    console.log(`  [visual] ${deck}: ${idsNavegador.length} slides — ${idsNavegador.join(', ')}`);
    for (const id of idsNavegador) {
      await t.test(`slide "${id}"`, async () => {
        const [bufferNavegador, bufferBuild] = await Promise.all([
          navegarEFotografar(paginaNavegador, id),
          navegarEFotografar(paginaBuild, id),
        ]);
        const { diferentes, diff } = comparar(bufferNavegador, bufferBuild);
        if (diferentes > 0) {
          const caminhoDoDiff = await gravarDiff(`${deck.replace('.html', '')}-${id}`, diff.data);
          // Fato 8 do plano: medido em zero pixels diferentes, em todos os slides de matematica.html e
          // codigo.html. Afirmamos igualdade, não semelhança: um limiar generoso desperdiçaria a informação.
          assert.equal(diferentes, 0, `${deck} slide ${id}: ${diferentes} pixels diferentes entre os modos — diff em ${caminhoDoDiff}`);
        }
        console.log(`    [visual] ${deck} slide "${id}": 0 pixels diferentes (${LARGURA}×${ALTURA})`);
      });
    }
  });
}

// Passo 3 do brief: "uma comparação visual que nunca falhou é indistinguível de uma que não compara".
// Muda --cor-tinta (estilos/tokens.css: body { color: var(--cor-tinta) }, base.css) SÓ do lado
// build — por injeção de <style> no HTML que construir() devolveu, dentro deste teste; o arquivo
// estilos/tokens.css no disco nunca é tocado, e o HTML mutante vive só num diretório temporário
// próprio, nunca no diretório que os testes acima comparam. --cor-tinta pinta o h1 inteiro da capa
// (96px, o maior texto do deck): a região do diff devia ser grande e óbvia, não um punhado de
// pixels de borda.
test('a comparação de fato compara: uma cor trocada só do lado build faz o teste cair', async (t) => {
  const deck = 'matematica.html';
  const destino = await mkdtemp(join(tmpdir(), 'visual-build-mutante-'));
  const { html } = await construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${deck}`, RAIZ), destino });
  assert.ok(html.includes('</head>'), 'HTML construído sem </head> — não dá para injetar o CSS mutante');
  const CORTE = '</head>';
  const htmlMutante = html.replace(CORTE, `<style>:root{--cor-tinta:#ff2d95}</style>${CORTE}`);
  assert.notEqual(htmlMutante, html, 'a injeção não alterou o HTML — </head> não foi encontrado como esperado');
  const caminhoMutante = join(destino, 'mutante.html');
  await writeFile(caminhoMutante, htmlMutante, 'utf8');

  const paginaNavegador = await abrirPagina(`${sitio.endereco}/especime/${deck}`);
  const paginaMutante = await abrirPagina(`file://${caminhoMutante}`);
  t.after(() => Promise.all([paginaNavegador.close(), paginaMutante.close()]));

  const [idPrimeiroSlide] = await idsDosSlides(paginaNavegador);
  assert.equal(idPrimeiroSlide, 'capa', 'o primeiro slide do espécime mudou de id — confira se ainda é a capa');

  const [bufferNavegador, bufferMutante] = await Promise.all([
    navegarEFotografar(paginaNavegador, idPrimeiroSlide),
    navegarEFotografar(paginaMutante, idPrimeiroSlide),
  ]);
  const { diferentes, diff } = comparar(bufferNavegador, bufferMutante);

  assert.ok(diferentes > 0, 'a cor mudou só no lado build e pixelmatch não acusou nada — a comparação acima não está comparando de verdade');
  const caminhoDoDiff = await gravarDiff(`${deck.replace('.html', '')}-inversao-${idPrimeiroSlide}`, diff.data);
  console.log(`  [visual] inversão: ${diferentes} pixels diferentes (esperado), diff em ${caminhoDoDiff}`);
});
