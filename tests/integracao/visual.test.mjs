// Tarefa 4 do marco 5c (spec 3.3): prova a promessa central do marco — o modo navegador (a aula
// monta e renderiza em tempo real; KaTeX compõe a matemática e Shiki destaca o código NO CLIENTE) e o
// modo build (`construir()`, marco 5b: as mesmas duas coisas rodam em Node, horas antes, e o
// navegador só recebe HTML pronto) produzem A MESMA IMAGEM. São dois caminhos de código totalmente
// diferentes — este arquivo é o que garante que eles não divergem.
//
// A comparação usa o pixelmatch e o limiar 0,1 da spec 11.2, com a área das demos mascarada. A
// TOLERÂNCIA por slide é mais estrita do que a spec: os 0,5 % da spec 11.2 são um TETO (4.608
// pixels), não um alvo — um teste mais estrito sempre foi conforme, e o teste "o orçamento por slide
// cabe no teto da spec 11.2" prova que o orçamento abaixo continua dentro dele.
//
// == O QUE FOI MEDIDO NESTA ÁRVORE ==
//
// Por que não gastar o teto: com ele inteiro, um defeito de produto visível passa verde. Um erro de
// mais-um na numeração de blocos (montar/cromo.js — atinge SÓ o lado build, porque o lado navegador
// carrega o bundle pronto de dist/) muda 50 dos 63 slides e este arquivo passa 71/71. 4.608 pixels
// são um quadrado de 68 × 68: quase todo defeito de texto, rótulo, número ou ícone cabe nele.
//
// RUÍDO — árvore limpa, `npm run test:integracao` inteiro, 3 de 3 rodadas: 63 pixels em
// codigo.html#javascript-e-bash, sempre o mesmo número, sempre a mesma caixa; numa das três, mais 31
// pixels em codigo.html#r-e-sql. Este arquivo rodando SOZINHO dá 0 nos 63 slides — a divergência
// depende da carga, e um defeito de produto não some quando o teste roda sozinho. O pior ruído já
// registrado aqui foi 131 pixels, antes de f7d2e97 (document.fonts.ready); o orçamento fica acima
// também dele, para que uma regressão daquela não volte como intermitência.
//
// MUDANÇA REAL — a renumeração acima, determinística em 3 de 3 rodadas (duas com o arquivo sozinho,
// uma sob a suíte inteira), idêntica pixel a pixel nas três: 24, 25, 32 e 38 pixels nos slides de
// CONTEÚDO (um dígito do rótulo "NN · Título" do cabeçalho, caixa medida de 6 × 9 em (76, 47)) e
// 190, 551, 638, 1.186, 1.278, 1.290, 1.349, 1.458 e 3.148 nos slides data-layout="abertura" (o
// número grande do quadrado do campo, caixas medidas de 45 × 55 a 103 × 64). Todo deck do espécime
// tem pelo menos dois slides acima de 551.
//
// == O QUE ISTO NÃO RESOLVE ==
//
// Escrito aqui para ninguém redescobrir por acidente: NENHUM orçamento por slide separa ruído de
// mudança real nos 28 slides de baixo — 24 pixels de mudança de verdade ficam ABAIXO dos 63 de
// ruído. O que derruba o teste é que o mesmo defeito também mexe nos slides de abertura. Um
// discriminador agregado ("no máximo N slides do deck podem diferir de zero") separaria 50 de 1,
// mas o ruído já tocou 2 slides numa das três rodadas e o deck mais magro do espécime (ifusp.html)
// só tem 4 slides tocados pela mutação: a margem real seria de 2× contra um ruído que varia, o que
// é trocar um problema de dose por um de intermitência. Fica medido e NÃO asserido; o resumo que
// cada deck imprime traz a contagem, para quem for reabrir isso ter o dado na frente.
//
// == A INTERMITÊNCIA: AS FALHAS ACABARAM, A DIVERGÊNCIA NÃO ==
//
// O que o item I8 da revisão final expôs ao cobrir os SEIS decks em vez de dois: com codigo.html
// dentro, a suíte inteira dava 193/195 em 3 de 4 rodadas, sempre no mesmo slide e sempre exatamente
// 131 pixels. Investigado até a causa, porque "o teste ficou intermitente" não é diagnóstico. Os
// pixels são rebordo de antialiasing, não glifo trocado nem deslocado: mesmas coordenadas,
// intensidades diferentes, 597 pixels escuros do lado navegador contra 467 do lado build na mesma
// caixa de 92×72 — e a diferença entre as duas contagens (130) é a própria contagem de pixels
// divergentes. Perguntado ao CDP qual arquivo pinta o token, os dois lados respondem o mesmo
// (GeistMono-SemiBold, isCustomFont, peso 600, mesma caixa), e as faces embutidas no HTML
// construído são as mesmas oito do CSS de desenvolvimento. Ou seja: os dois modos usam a mesma
// fonte e desenham no mesmo lugar; o que varia é o suavizado, sob carga.
//
// O document.fonts.ready de navegarEFotografar REDUZIU o resíduo (131 → 63); não o eliminou. Sob
// carga ele continua acontecendo em toda rodada, no mesmo slide, com o PNG de diff indo para o
// disco — o que acabou foram as FALHAS, porque 63 cabe no orçamento. Quem ler este arquivo antes de
// decidir se pode subir o limiar tem de ler isto: a divergência não foi resolvida, foi coberta, e o
// número que ela consome hoje é 63 de 150. É por isso que o log de cada slide imprime a contagem de
// verdade em vez do zero que estava escrito nele, e por isso que existem DOIS testes de inversão lá
// embaixo — o da cor, que só cai se alguém subir o orçamento acima de ~24.000, e o da renumeração,
// que cai se alguém subir acima de 551.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// pathToFileURL, não `file://${...}`: é o mesmo defeito que o I4 da revisão final tirou de
// build/pdf.mjs — o Chrome corta a URL no `#` e no `?`. Hoje estes caminhos vêm todos de mkdtemp e
// nenhum tem esses caracteres, mas o padrão certo é o padrão certo nos dois lados da fronteira.
import { pathToFileURL } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { iniciarChrome, servirPastaCrua, esperarMontagem, rotearCdn } from './utilitarios.mjs';
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
// por slide". O LIMIAR é da spec e é usado como está. Os 0,5 % são o teto da spec — o máximo que um
// teste conforme pode tolerar, não a dose que ele deve gastar.
const LIMIAR = 0.1;
const FRACAO_DO_TETO_DA_SPEC = 0.005;
const TETO_DA_SPEC = Math.floor(LARGURA * ALTURA * FRACAO_DO_TETO_DA_SPEC);

// Os dois números medidos que decidem o orçamento (medição completa no cabeçalho). Estão aqui como
// constantes, e não só em comentário, porque o teste logo abaixo os confere: quem mudar o orçamento
// sem refazer a medição tem de mexer nestes nomes e vai ler o que eles significam.
const RUIDO_MEDIDO = 63;                 // pixels, codigo.html#javascript-e-bash, 3 de 3 rodadas sob carga
const RUIDO_HISTORICO = 131;             // pixels, o pior já registrado aqui (antes de f7d2e97)
const MENOR_MUDANCA_ACIMA_DO_RUIDO = 190; // pixels, muitos-blocos.html#integrais sob a renumeração

// 150 pixels: 2,4× o ruído medido hoje, acima também do pior ruído já visto neste arquivo, e abaixo
// da menor mudança de produto que a renumeração produz acima da faixa de ruído. É 30× mais apertado
// que o teto da spec, e 150 em 921.600 é 0,016 %.
const PIXELS_TOLERADOS = 150;

test('o orçamento por slide cabe no teto da spec 11.2 e fica entre o ruído medido e a mudança real', () => {
  assert.ok(PIXELS_TOLERADOS <= TETO_DA_SPEC,
    `o orçamento (${PIXELS_TOLERADOS}) passou do teto da spec 11.2 (${TETO_DA_SPEC}) — isto deixaria de ser conforme`);
  assert.ok(PIXELS_TOLERADOS > RUIDO_HISTORICO,
    `o orçamento (${PIXELS_TOLERADOS}) não cobre o pior ruído já medido aqui (${RUIDO_HISTORICO}) — o teste volta a ser intermitente`);
  assert.ok(PIXELS_TOLERADOS < MENOR_MUDANCA_ACIMA_DO_RUIDO,
    `o orçamento (${PIXELS_TOLERADOS}) engole a menor mudança de produto medida acima do ruído (${MENOR_MUDANCA_ACIMA_DO_RUIDO})`);
  assert.ok(RUIDO_MEDIDO < RUIDO_HISTORICO, 'o ruído medido hoje devia ser menor que o histórico; refaça a medição do cabeçalho');
});

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
  // O lado navegador abre o espécime servido cru, e a tag dele é a FIXADA desde a correção final do
  // 6c: quem responde pela base da CDN é esta rota, com os bytes de dist/ (utilitarios.mjs). No lado
  // build a chamada é inócua — o HTML construído traz o motor embutido e não pede nada. Os bytes do
  // runtime são os MESMOS nos dois caminhos, que é a razão de a comparação de pixels continuar
  // válida; e é medição, não raciocínio: este arquivo roda inteiro a cada rodada.
  await rotearCdn(pagina);
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
  // LIMIAR é o 0,1 que a spec 11.2 manda, não zero. (Este comentário já afirmou "threshold: 0" por
  // uma rodada inteira depois de o código ter passado a usar LIMIAR — a mesma classe de defeito que
  // a revisão cobrou em I1 e I2: um texto que afirma o que o código não faz.) pixelmatch conta os
  // pixels cuja diferença de cor passa do limiar e NÃO conta os que ele classifica como
  // antisserrilhado — o resíduo de 63 pixels do cabeçalho é o que sobra depois dessas duas peneiras.
  const diferentes = pixelmatch(a.data, b.data, diff.data, LARGURA, ALTURA, { threshold: LIMIAR });
  return { diferentes, diff };
}

for (const deck of DECKS) {
  test(`${deck}: navegador e build renderizam pixel a pixel iguais, em todos os slides`, async (t) => {
    const destino = await mkdtemp(join(tmpdir(), 'visual-build-'));
    const { caminhoDoHtml } = await construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${deck}`, RAIZ), destino });

    const paginaNavegador = await abrirPagina(`${sitio.endereco}/especime/${deck}`);
    const paginaBuild = await abrirPagina(pathToFileURL(caminhoDoHtml).href);
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
    // O número de verdade, não um zero escrito no literal. Enquanto a asserção era igualdade exata,
    // chegar à linha de log IMPLICAVA zero e o literal era verdade; com orçamento, qualquer valor
    // dentro dele chegava aqui e era impresso como zero — o único sinal que mostraria a tolerância
    // sendo consumida afirmava a conclusão em vez de medi-la. Medido: numa rodada verde da suíte
    // inteira, codigo.html#javascript-e-bash grava um PNG de diff no disco enquanto o console
    // afirmava zero nos 63 slides.
    const medidos = [];
    for (const id of idsNavegador) {
      await t.test(`slide "${id}"`, async () => {
        const [ladoNavegador, ladoBuild] = await Promise.all([
          navegarEFotografar(paginaNavegador, id),
          navegarEFotografar(paginaBuild, id),
        ]);
        const { diferentes, diff } = comparar(ladoNavegador, ladoBuild);
        medidos.push({ id, diferentes });
        if (diferentes > 0) {
          const caminhoDoDiff = await gravarDiff(`${deck.replace('.html', '')}-${id}`, diff.data);
          assert.ok(diferentes <= PIXELS_TOLERADOS,
            `${deck} slide ${id}: ${diferentes} pixels diferentes entre os modos, acima do orçamento de ${PIXELS_TOLERADOS} (teto da spec 11.2: ${TETO_DA_SPEC}) — diff em ${caminhoDoDiff}`);
        }
        console.log(`    [visual] ${deck} slide "${id}": ${diferentes} pixels diferentes (${LARGURA}×${ALTURA}, orçamento ${PIXELS_TOLERADOS})`);
      });
    }
    // Resumo do deck: é o agregado que o orçamento por slide não assere (ver "o que isto não
    // resolve", no cabeçalho). O ruído toca 1 slide, às vezes 2; a renumeração toca de 4 a 13 por
    // deck. Quem olhar a saída vê a diferença de forma sem precisar somar 63 linhas na cabeça.
    const diferiram = medidos.filter(({ diferentes }) => diferentes > 0)
      .sort((a, b) => b.diferentes - a.diferentes);
    const pior = diferiram.length
      ? `maior = ${diferiram[0].diferentes} pixels em "${diferiram[0].id}"`
      : 'nenhum slide consumiu orçamento';
    console.log(`  [visual] ${deck}: ${diferiram.length} de ${medidos.length} slides diferiram de zero; ${pior} (orçamento ${PIXELS_TOLERADOS} por slide)`);
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
  const pagina = await abrirPagina(pathToFileURL(caminhoDoHtml).href);
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
  const paginaMutante = await abrirPagina(pathToFileURL(caminhoMutante).href);
  t.after(() => Promise.all([paginaNavegador.close(), paginaMutante.close()]));

  const [idPrimeiroSlide] = await idsDosSlides(paginaNavegador);
  assert.equal(idPrimeiroSlide, 'capa', 'o primeiro slide do espécime mudou de id — confira se ainda é a capa');

  const [ladoNavegador, ladoMutante] = await Promise.all([
    navegarEFotografar(paginaNavegador, idPrimeiroSlide),
    navegarEFotografar(paginaMutante, idPrimeiroSlide),
  ]);
  const { diferentes, diff } = comparar(ladoNavegador, ladoMutante);

  // Maior que o ORÇAMENTO, não que zero: é esta asserção que impede a tolerância de engolir uma
  // mudança real. Sem ela, subir o limiar até tudo passar continuaria "verde". O que ela NÃO faz,
  // medido: o piso dela é a magnitude desta mutação (~24.000 pixels, um h1 de 96 px inteiro trocado
  // de cor), então ela só reage a afrouxamentos enormes — com FRACAO 0,025, cinco vezes a spec,
  // este arquivo ainda passava. Quem desce esse piso para perto de onde ele deve ficar é o teste
  // seguinte, com uma mudança pequena.
  assert.ok(diferentes > PIXELS_TOLERADOS,
    `a cor mudou só no lado build e a diferença (${diferentes}) não passou dos ${PIXELS_TOLERADOS} tolerados — a comparação acima não está comparando de verdade`);
  const caminhoDoDiff = await gravarDiff(`${deck.replace('.html', '')}-inversao-${idPrimeiroSlide}`, diff.data);
  console.log(`  [visual] inversão: ${diferentes} pixels diferentes (esperado), diff em ${caminhoDoDiff}`);
});


// O irmão pequeno do teste da cor, e o mais importante dos dois: uma mudança SUTIL de produto, do
// tamanho do que aparece num defeito de verdade — um número errado, não uma cor berrante. Um número
// que eu escolho envelhece; um teste que exige pegar a renumeração de blocos, não. Sem ele, a
// próxima pessoa que afrouxar o orçamento para calar uma intermitência continua verde, que é
// exatamente o que já aconteceu uma vez neste marco.
//
// A mutação é a que a re-revisão mediu: um erro de mais-um em doisDigitos (montar/cromo.js), que
// faria todo número de bloco exibir o seguinte — no rótulo "NN · Título" do cabeçalho e no número
// grande do quadrado do campo, nos slides data-layout="abertura". Aqui ela é aplicada ao DOM do lado
// build DEPOIS da montagem, pelos mesmos dois lugares que doisDigitos alimenta: nem montar/cromo.js
// nem o espécime são tocados, e nada é escrito fora do diretório temporário deste teste.
//
// Por que isto não pode passar medindo nada: se a montagem ou a navegação por hash reescrevessem o
// cromo (não reescrevem — em modo build montar() já rodou em Node e o motor só alterna `.ativo`), a
// reescrita sumiria antes da foto e a diferença cairia para zero; a asserção abaixo exige que ela
// ESTOURE o orçamento, então ela cai alto em vez de passar quieta. E a contagem de nós renumerados é
// conferida antes, para o dia em que a marcação do cromo mudar de nome.
test('a comparação pega uma mudança sutil: um número de bloco renumerado só do lado build', async (t) => {
  const deck = 'matematica.html';
  // Um slide de ABERTURA (data-layout="abertura"): é onde o número do campo é desenhado grande, e é
  // a parte da renumeração que fica acima do ruído. Medido quando este teste foi escrito: 551 pixels
  // neste slide (o segundo campo, "02" → "03"). O primeiro campo dá 1.186 — este é o mais apertado
  // dos dois de propósito, para travar o orçamento no ponto mais baixo que a medição sustenta.
  const SLIDE_DE_ABERTURA = 'derivacao';
  // E um slide de CONTEÚDO, onde a MESMA renumeração mexe só no dígito do rótulo do cabeçalho: 24
  // pixels medidos, ABAIXO dos 63 de ruído. Ele está aqui para o limite honesto do orçamento ficar
  // executável e não só escrito no cabeçalho — nenhum orçamento por slide pega este caso.
  const SLIDE_DE_CONTEUDO = 'no-texto';

  const destino = await mkdtemp(join(tmpdir(), 'visual-build-renumerado-'));
  const { caminhoDoHtml } = await construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${deck}`, RAIZ), destino });

  const paginaNavegador = await abrirPagina(`${sitio.endereco}/especime/${deck}`);
  const paginaRenumerada = await abrirPagina(pathToFileURL(caminhoDoHtml).href);
  t.after(() => Promise.all([paginaNavegador.close(), paginaRenumerada.close()]));

  const renumerados = await paginaRenumerada.evaluate(() => {
    const doisDigitos = (numero) => String(numero).padStart(2, '0');
    let tocados = 0;
    // montar/cromo.js:57 — o número dentro do quadrado atual da fileira (slides de abertura).
    for (const alvo of document.querySelectorAll('span.numero-bloco')) {
      const numero = Number(alvo.textContent);
      if (!Number.isInteger(numero)) continue;
      alvo.textContent = doisDigitos(numero + 1);
      tocados += 1;
    }
    // montar/montar.js:86 — o rótulo "NN · Título" do cabeçalho (slides de conteúdo). Os rótulos de
    // introdução e encerramento são palavras, não números, e o casamento simplesmente não pega.
    for (const alvo of document.querySelectorAll('header.cabecalho > span.rotulo')) {
      const casado = /^(\d\d)(\D[\s\S]*)$/.exec(alvo.textContent);
      if (!casado) continue;
      alvo.textContent = `${doisDigitos(Number(casado[1]) + 1)}${casado[2]}`;
      tocados += 1;
    }
    return tocados;
  });
  assert.ok(renumerados >= 2,
    `${deck}: a renumeração encontrou ${renumerados} número(s) de bloco no HTML construído — a marcação do cromo mudou e este teste parou de medir o que diz medir`);

  const [ladoNavegador, ladoRenumerado] = await Promise.all([
    navegarEFotografar(paginaNavegador, SLIDE_DE_ABERTURA),
    navegarEFotografar(paginaRenumerada, SLIDE_DE_ABERTURA),
  ]);
  const naAbertura = comparar(ladoNavegador, ladoRenumerado);
  const caminhoDoDiff = await gravarDiff(`${deck.replace('.html', '')}-renumerado-${SLIDE_DE_ABERTURA}`, naAbertura.diff.data);
  assert.ok(naAbertura.diferentes > PIXELS_TOLERADOS,
    `um número de bloco a mais só no lado build mudou ${naAbertura.diferentes} pixels no slide "${SLIDE_DE_ABERTURA}", dentro dos ${PIXELS_TOLERADOS} do orçamento — a tolerância está frouxa demais para pegar a classe de defeito mais provável neste sistema (texto, rótulo, número, ícone). Medido quando este teste foi escrito: 551 pixels. Diff em ${caminhoDoDiff}`);

  const [navegadorConteudo, renumeradoConteudo] = await Promise.all([
    navegarEFotografar(paginaNavegador, SLIDE_DE_CONTEUDO),
    navegarEFotografar(paginaRenumerada, SLIDE_DE_CONTEUDO),
  ]);
  const noConteudo = comparar(navegadorConteudo, renumeradoConteudo);
  assert.ok(noConteudo.diferentes > 0,
    `a renumeração não mudou pixel nenhum no slide de conteúdo "${SLIDE_DE_CONTEUDO}" — ou o rótulo do cabeçalho deixou de mostrar o número do campo, ou a reescrita não chegou lá`);
  console.log(`  [visual] renumeração: ${renumerados} números trocados · abertura "${SLIDE_DE_ABERTURA}" = ${naAbertura.diferentes} pixels (orçamento ${PIXELS_TOLERADOS}, cai como deve) · conteúdo "${SLIDE_DE_CONTEUDO}" = ${noConteudo.diferentes} pixels (abaixo do ruído de ${RUIDO_MEDIDO}: nenhum orçamento por slide pega este) · diff em ${caminhoDoDiff}`);
});
