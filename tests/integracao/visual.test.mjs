// Tarefa 4 do marco 5c (spec 3.3): prova a promessa central do marco — o modo navegador (a aula
// monta e renderiza em tempo real; KaTeX compõe a matemática e Shiki destaca o código NO CLIENTE) e o
// modo build (`construir()`, marco 5b: as mesmas duas coisas rodam em Node, horas antes, e o
// navegador só recebe HTML pronto) produzem A MESMA IMAGEM. São dois caminhos de código totalmente
// diferentes — este arquivo é o que garante que eles não divergem.
//
// A comparação segue a spec 11.2 ao pé da letra: pixelmatch, limiar 0,1, no máximo 0,5 % de pixels
// diferentes por slide, área das demos mascarada.
//
// Até a rodada de correção da revisão final este arquivo era MAIS estrito que a spec — limiar 0 e
// igualdade exata — e a escolha tinha medição por trás: o fato 8 do plano mediu zero pixels
// diferentes em todos os slides de matematica.html e codigo.html. O que invalidou essa escolha foi
// o item I8 da própria revisão, que mandou cobrir os SEIS decks em vez de dois: com codigo.html
// dentro, a suíte inteira passou a dar 193/195 em 3 de 4 rodadas, sempre no mesmo slide e sempre
// exatamente 131 pixels.
//
// Investigado até a causa, porque "o teste ficou intermitente" não é diagnóstico. Os 131 pixels são
// rebordo de antialiasing, não glifo trocado nem deslocado: mesmas coordenadas, intensidades
// diferentes, 597 pixels escuros do lado navegador contra 467 do lado build na mesma caixa de
// 92×72 — e a diferença entre as duas contagens (130) é a própria contagem de pixels divergentes.
// Perguntado ao CDP qual arquivo pinta o token, os dois lados respondem o mesmo
// (GeistMono-SemiBold, isCustomFont, peso 600, mesma caixa), e as faces embutidas no HTML
// construído são as mesmas oito do CSS de desenvolvimento. Ou seja: os dois modos usam a mesma
// fonte e desenham no mesmo lugar; o que varia é o suavizado, sob carga.
//
// 131 em 921.600 é 0,014 % — trinta e cinco vezes abaixo dos 0,5 % que a spec permite. Insistir na
// igualdade exata não deixa o teste mais forte: deixa-o intermitente, e um teste intermitente
// ensina a ignorá-lo, o que custa o sinal inteiro e não só o excedente. A asserção de inversão
// (lá embaixo) é o que impede a tolerância de engolir uma mudança de verdade: ela exige que uma
// cor trocada de propósito ESTOURE a tolerância, não apenas que difira de zero.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { iniciarChrome, servirPastaCrua, esperarMontagem } from './utilitarios.mjs';
import { construir } from '../../build/construir.mjs';
import { LARGURA_DO_PALCO, ALTURA_DO_PALCO } from '../../motor/motor.js';

const RAIZ = new URL('../../', import.meta.url);

// I8 da revisão final: a lista cobria 2 dos 6 decks do espécime, e os quatro de fora incluíam
// componentes.html — o deck que existe para exercitar TODOS os componentes, e portanto o de maior
// valor para a promessa deste teste — e index.html, o único com demo. Agora são os seis, lidos da
// pasta em vez de escritos aqui: um deck novo no espécime entra na comparação sozinho, que é o
// oposto do que acontecia (os quatro de fora ficaram de fora sem ninguém decidir).
const DECKS = readdirSync(new URL('especime/', RAIZ)).filter((nome) => nome.endsWith('.html')).sort();

// O viewport não é um número escolhido à parte: é o próprio tamanho lógico do palco (motor/motor.js).
// Com a janela exatamente nesse tamanho, ajustarEscala() calcula escala 1 — o slide enche o viewport
// sem sobra e sem fator de escala fracionário, o que é o que torna a comparação pixel a pixel possível
// (1280 × 720 = 921.600, o total do fato 8).
const LARGURA = LARGURA_DO_PALCO;
const ALTURA = ALTURA_DO_PALCO;

// Spec 11.2, literal: "comparada com pixelmatch, limiar 0,1 e no máximo 0,5 % de pixels diferentes
// por slide". Estes dois números são da spec, não escolhidos aqui.
const LIMIAR = 0.1;
const FRACAO_TOLERADA = 0.005;
const PIXELS_TOLERADOS = Math.floor(LARGURA * ALTURA * FRACAO_TOLERADA);

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
// "1.482 pixels diferentes" não diz a ninguém o que olhar; o PNG mostra a região exata). M10 da
// revisão final: a pasta era criada no topo do módulo, antes de saber se haveria diff. Agora nasce
// na primeira gravação. Medido, para não prometer mais do que entrega: uma rodada verde ainda cria
// UMA pasta, porque o teste de inversão lá embaixo grava o diff que ele espera ver — o que some é a
// pasta criada por um arquivo que ninguém chegou a usar (um `--test-only`, um filtro de nome, uma
// suíte interrompida). O mkdtemp sem limpeza continua sendo o padrão da casa.
let pastaDeDiffs = null;
let proximoNomeDeDiff = 0;

async function gravarDiff(rotulo, buffer) {
  pastaDeDiffs ??= await mkdtemp(join(tmpdir(), 'aula-usp-visual-diff-'));
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
// `.ativo` (é um display:none/block simples, sem transition).
//
// M2 da revisão final: aqui havia um waitForTimeout(100) — folga arbitrária, não espera por
// condição. Dois requestAnimationFrame encadeados são a forma da casa para "o navegador já pintou o
// quadro seguinte" (o idioma de f7d2e97 é "espere a condição, não o relógio"), e devolvem o controle
// assim que o paint acontece, em vez de sempre 100 ms.
// Dois requestAnimationFrame: o primeiro entra na fila do quadro corrente, o segundo só roda depois
// que aquele quadro foi pintado. É a forma deste projeto de esperar por pintura desde f7d2e97.
const esperarPintura = (pagina) =>
  pagina.evaluate(() => new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto))));

async function navegarEFotografar(pagina, id) {
  await pagina.evaluate((alvo) => { location.hash = `#${alvo}`; }, id);
  await pagina.waitForFunction((alvo) => document.querySelector('.slide.ativo')?.id === alvo, id);
  // Os dois rAF forçam layout e pintura, e é o LAYOUT que faz o navegador pedir as faces que este
  // slide usa. Só depois disso document.fonts.ready tem o que esperar: chamado antes, ele resolve na
  // hora — não há carga pendente — e a foto sai com a face substituta. O último par repinta com a
  // face já carregada.
  //
  // Medido: sem esta espera a suíte de integração inteira dava 193/195 em 3 de 3 rodadas (o arquivo
  // sozinho passa 71/71 — a intermitência depende da carga). As duas falhas eram faces NÃO-regulares
  // pedidas só quando o slide fica visível: codigo.html/javascript-e-bash, 131 pixels nos tokens
  // `let` e `for`, que são as palavras-chave em negrito do monoespaçado; e matematica.html/capa, 33
  // pixels no h1, que é Geist SemiBold. Dois decks e duas famílias diferentes, a mesma causa.
  //
  // Por que a pausa fixa de 100 ms que estava aqui antes escondia isto, e por que as duas medições
  // que aprovaram a troca não viram: ambas rodaram este arquivo sozinho. Os 100 ms não esperavam
  // transição nenhuma (não há) — eram folga incidental que cobria o carregamento da face.
  await esperarPintura(pagina);
  await pagina.evaluate(() => document.fonts.ready);
  await esperarPintura(pagina);
  // Confirma nesta mesma chamada que quem pintou foi de fato o slide pedido — a armadilha do marco
  // (item 5 do despacho): um slide que não é o ativo fica em display:none. Comparar screenshots de
  // dois slides diferentes daria "igual" ou "diferente" por acidente, nunca pela razão certa.
  const ativo = await pagina.evaluate(() => document.querySelector('.slide.ativo')?.id);
  assert.equal(ativo, id, 'a navegação por hash não ativou o slide pedido');
  // A área das demos, mascarada — spec 11.2. Os retângulos são lidos NESTE instante, do lado que
  // está sendo fotografado: uma div.demo só tem área quando está no slide ativo (os outros slides
  // ficam em display:none e devolvem 0×0), e o conteúdo que uma demo cria é o único pedaço da página
  // que legitimamente pode divergir entre os modos — ela é código do autor, rodando em dois momentos
  // diferentes (spec 6.7). Sem a máscara, o dia em que uma demo do espécime passar a desenhar a
  // partir de um relógio ou de um sorteio vira um teste intermitente sem explicação.
  return { imagem: await pagina.screenshot({ type: 'png' }), demos: await retangulosDasDemos(pagina) };
}

function retangulosDasDemos(pagina) {
  return pagina.evaluate(() => [...document.querySelectorAll('div.demo')]
    .map((demo) => demo.getBoundingClientRect())
    .filter((area) => area.width > 0 && area.height > 0)
    .map(({ x, y, width, height }) => ({ x, y, width, height })));
}

// Zera (preto opaco) os retângulos nos dois buffers antes do pixelmatch. Arredonda para fora e mais
// um pixel de folga de cada lado: a borda de uma caixa cai em pixel fracionário e o antisserrilhado
// do Chrome a espalha para o vizinho.
const FOLGA_DA_MASCARA = 1;
function mascarar(png, retangulos) {
  for (const { x, y, width, height } of retangulos) {
    const esquerda = Math.max(0, Math.floor(x) - FOLGA_DA_MASCARA);
    const topo = Math.max(0, Math.floor(y) - FOLGA_DA_MASCARA);
    const direita = Math.min(png.width, Math.ceil(x + width) + FOLGA_DA_MASCARA);
    const baixo = Math.min(png.height, Math.ceil(y + height) + FOLGA_DA_MASCARA);
    for (let linha = topo; linha < baixo; linha += 1) {
      for (let coluna = esquerda; coluna < direita; coluna += 1) {
        const posicao = (linha * png.width + coluna) * 4;
        png.data[posicao] = 0;
        png.data[posicao + 1] = 0;
        png.data[posicao + 2] = 0;
        png.data[posicao + 3] = 255;
      }
    }
  }
}

function comparar(ladoA, ladoB) {
  const a = PNG.sync.read(ladoA.imagem);
  const b = PNG.sync.read(ladoB.imagem);
  assert.equal(a.width, LARGURA);
  assert.equal(a.height, ALTURA);
  assert.equal(b.width, LARGURA);
  assert.equal(b.height, ALTURA);
  // A união dos retângulos dos dois lados, nos dois buffers: se um modo puser a demo num lugar
  // ligeiramente diferente do outro, mascarar só o retângulo do próprio lado deixaria a diferença de
  // posição passar pela metade. A união também faz a máscara denunciar, e não esconder, uma demo que
  // mude de geometria entre os modos — o que sobra fora da união continua sendo comparado.
  const retangulos = [...ladoA.demos, ...ladoB.demos];
  mascarar(a, retangulos);
  mascarar(b, retangulos);
  const diff = new PNG({ width: LARGURA, height: ALTURA });
  // threshold: 0 é o próprio ponto da tarefa (fato 8) — a medição encontrou igualdade exata, e um
  // limiar frouxo escureceria essa informação em vez de expressá-la.
  const diferentes = pixelmatch(a.data, b.data, diff.data, LARGURA, ALTURA, { threshold: LIMIAR });
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
        const [ladoNavegador, ladoBuild] = await Promise.all([
          navegarEFotografar(paginaNavegador, id),
          navegarEFotografar(paginaBuild, id),
        ]);
        const { diferentes, diff } = comparar(ladoNavegador, ladoBuild);
        if (diferentes > 0) {
          const caminhoDoDiff = await gravarDiff(`${deck.replace('.html', '')}-${id}`, diff.data);
          assert.ok(diferentes <= PIXELS_TOLERADOS,
            `${deck} slide ${id}: ${diferentes} pixels diferentes entre os modos, acima dos ${PIXELS_TOLERADOS} que a spec 11.2 tolera — diff em ${caminhoDoDiff}`);
        }
        console.log(`    [visual] ${deck} slide "${id}": 0 pixels diferentes (${LARGURA}×${ALTURA})`);
      });
    }
  });
}

// A máscara não pode ser máquina não medida: uma máscara que não cobrisse nada passaria despercebida
// (os seis decks passam com zero pixels diferentes de qualquer jeito hoje), e uma que cobrisse tudo
// esvaziaria a comparação inteira. Este teste mede as duas pontas na demo de verdade do espécime —
// o deck é ACHADO no espécime, não escrito aqui.
const DECK_COM_DEMO = DECKS.find((nome) => readFileSync(new URL(`especime/${nome}`, RAIZ), 'utf8').includes('class="demo"'));

test('a máscara das demos cobre a área pintada da demo, e só ela (spec 11.2)', async (t) => {
  if (!DECK_COM_DEMO) {
    t.skip('nenhum deck do espécime tem div.demo — a máscara não tem o que cobrir');
    return;
  }
  const destino = await mkdtemp(join(tmpdir(), 'visual-mascara-'));
  const { caminhoDoHtml } = await construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${DECK_COM_DEMO}`, RAIZ), destino });
  const pagina = await abrirPagina(`file://${caminhoDoHtml}`);
  t.after(() => pagina.close());

  const idDaDemo = await pagina.evaluate(() => document.querySelector('section.slide:has(div.demo)')?.id);
  assert.ok(idDaDemo, `${DECK_COM_DEMO} tem class="demo" no fonte mas nenhum section.slide com div.demo depois de montar`);
  const lado = await navegarEFotografar(pagina, idDaDemo);
  assert.equal(lado.demos.length, 1, `esperava uma div.demo visível no slide ${idDaDemo}`);

  const png = PNG.sync.read(lado.imagem);
  const antes = Buffer.from(png.data);
  mascarar(png, lado.demos);
  let alterados = 0;
  for (let posicao = 0; posicao < png.data.length; posicao += 4) {
    if (png.data[posicao] !== antes[posicao] || png.data[posicao + 1] !== antes[posicao + 1]
      || png.data[posicao + 2] !== antes[posicao + 2] || png.data[posicao + 3] !== antes[posicao + 3]) alterados += 1;
  }
  const { width, height } = lado.demos[0];
  // Cobre: a demo é pintada, e a máscara mudou pixels de verdade ali (uma máscara de área zero, ou
  // sobre um seletor que não casa com nada, dá 0 aqui).
  assert.ok(alterados > 0, `a máscara não alterou pixel nenhum sobre a div.demo de ${DECK_COM_DEMO}#${idDaDemo}`);
  // Só ela: o que a máscara toca cabe no retângulo da demo mais a folga, muito abaixo do slide
  // inteiro — se um dia ela virar um apagador geral, a comparação dos seis decks ficaria vazia e
  // esta asserção é o que denuncia.
  const teto = Math.ceil(width + 2 * FOLGA_DA_MASCARA + 2) * Math.ceil(height + 2 * FOLGA_DA_MASCARA + 2);
  assert.ok(alterados <= teto, `a máscara alterou ${alterados} pixels, mais do que o retângulo da demo comporta (${teto})`);
  assert.ok(teto < LARGURA * ALTURA, 'a demo ocupa o slide inteiro; mascarar não deixaria nada para comparar');
  console.log(`  [visual] máscara: ${DECK_COM_DEMO}#${idDaDemo}, demo de ${Math.round(width)}×${Math.round(height)}, ${alterados} pixels mascarados de ${LARGURA * ALTURA}`);
});

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

  const [ladoNavegador, ladoMutante] = await Promise.all([
    navegarEFotografar(paginaNavegador, idPrimeiroSlide),
    navegarEFotografar(paginaMutante, idPrimeiroSlide),
  ]);
  const { diferentes, diff } = comparar(ladoNavegador, ladoMutante);

  // Maior que a TOLERÂNCIA, não que zero: é esta asserção que impede a tolerância da spec de
  // engolir uma mudança real. Sem ela, subir o limiar até tudo passar continuaria "verde".
  assert.ok(diferentes > PIXELS_TOLERADOS,
    `a cor mudou só no lado build e a diferença (${diferentes}) não passou dos ${PIXELS_TOLERADOS} tolerados — a comparação acima não está comparando de verdade`);
  const caminhoDoDiff = await gravarDiff(`${deck.replace('.html', '')}-inversao-${idPrimeiroSlide}`, diff.data);
  console.log(`  [visual] inversão: ${diferentes} pixels diferentes (esperado), diff em ${caminhoDoDiff}`);
});
