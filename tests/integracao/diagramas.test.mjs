// Diagramas no Chrome (fase 2b, spec 7.2): o que só se mede com o texto desenhado numa fonte de
// verdade e com a figura na largura em que o slide a põe.
//   1. o estilo imposto chega ao documento renderizado: Geist, 20 px no palco quando o diagrama cabe,
//      campo amarelo no nó em foco, azul na aresta ativa, e todo texto dentro do seu retângulo — o
//      Graphviz em WASM estima a largura por Helvetica, e é aqui que se vê se a Geist cabe;
//   2. o diagrama largo encolhe com a figura, e composicao.tamanho-minimo o vê abaixo de 14 px;
//   3. o pacote de dist/ desenha com o satélite, e nenhum pedido de rede sai dele: o WASM está dentro
//      do script (spec 7.2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  iniciarChrome, servirPasta, servirPastaCrua, abrirAula, esperarMontagem, classesForaDoContrato,
  TINTA, AZUL, AMARELO, PAPEL,
} from './utilitarios.mjs';
import { validarArquivo } from '../../build/validar.mjs';

const PASTA = 'tests/fixtures/diagramas';
const MINIMO_DO_PALCO = 14; // spec 4.3: o mínimo de texto de SVG no palco (papel rótulo)
const TEXTO_DO_DIAGRAMA = 20; // spec 7.2: "texto Geist 20 px"

let navegador;
let dev;
let cru;
before(async () => {
  navegador = await iniciarChrome();
  dev = await servirPasta(PASTA);
  cru = await servirPastaCrua('.');
});
after(async () => {
  await navegador?.close();
  await dev?.fechar();
  await cru?.fechar();
});

// Por figura: o tamanho do texto NO PALCO (a mesma conta de composicao.tamanho-minimo — a escala do
// SVG na tela dividida pela do palco), as cores computadas, e a folga entre o texto e o retângulo.
function medirDiagramas(pagina) {
  return pagina.evaluate(() => [...document.querySelectorAll('figure.diagrama')].map((figura) => {
    const slide = figura.closest('section');
    const escalaDoPalco = slide.getBoundingClientRect().width / slide.offsetWidth;
    const svg = figura.querySelector('svg');
    const textos = [...svg.querySelectorAll('text')];
    const matriz = textos[0].getScreenCTM();
    const escala = Math.sqrt(Math.abs(matriz.a * matriz.d - matriz.b * matriz.c)) / escalaDoPalco;
    const estilo = (el, prop) => getComputedStyle(el)[prop];
    return {
      id: slide.id,
      tamanho: Number.parseFloat(estilo(textos[0], 'fontSize')) * escala,
      familia: estilo(textos[0], 'fontFamily'),
      corDoTexto: [...new Set(textos.map((t) => estilo(t, 'fill')))],
      nos: [...svg.querySelectorAll('g.no')].map((g) => ({
        foco: g.classList.contains('foco'),
        campo: estilo(g.querySelector('rect'), 'fill'),
        contorno: estilo(g.querySelector('rect'), 'stroke'),
        espessura: estilo(g.querySelector('rect'), 'strokeWidth'),
        folga: (g.querySelector('rect').getBBox().width - g.querySelector('text').getBBox().width) / 2,
      })),
      arestas: [...svg.querySelectorAll('g.aresta')].map((g) => ({
        ativa: g.classList.contains('ativo'),
        traco: estilo(g.querySelector('path'), 'stroke'),
        seta: estilo(g.querySelector('polygon'), 'fill'),
      })),
    };
  }));
}

test('o estilo imposto chega ao documento renderizado, e o texto da Geist cabe no retângulo que o Graphviz mediu', async (t) => {
  const { pagina, erros } = await abrirAula(navegador, `${dev.endereco}/index.html?folha`, { largura: 1920, altura: 1080 });
  t.after(() => pagina.close());
  assert.deepEqual(erros, [], erros.join('\n'));
  assert.deepEqual(await classesForaDoContrato(pagina), []);
  assert.ok(await pagina.evaluate(() => document.fonts.check('20px Geist')), 'a Geist não está carregada');
  const medidas = await medirDiagramas(pagina);
  assert.deepEqual(medidas.map((m) => m.id), ['figura-exemplo', 'figura-larga', 'coluna-de-quatro', 'coluna-larga', 'coluna-estreita-larga']);
  for (const medida of medidas) {
    assert.match(medida.familia, /^Geist\b/, medida.id);
    assert.deepEqual(medida.corDoTexto, [TINTA], `${medida.id}: todo texto em tinta`);
    for (const no of medida.nos) {
      assert.equal(no.campo, no.foco ? AMARELO : PAPEL, `${medida.id}: campo do nó`);
      assert.equal(no.contorno, TINTA);
      assert.equal(no.espessura, '2px');
      // Medido na fase 2b: 12,5 a 14,0 unidades de folga de cada lado, com a margem de 0,2 pol que
      // componentes/diagramas.js pede. 4 é o piso: um texto que encostasse na borda (Geist bem mais
      // larga que a estimativa por Helvetica) cai aqui antes de transbordar.
      assert.ok(no.folga >= 4, `${medida.id}: o texto encosta na borda do nó (folga ${no.folga.toFixed(2)})`);
    }
    assert.ok(medida.nos.some((no) => no.foco), `${medida.id}: nenhum nó em foco`);
    for (const aresta of medida.arestas) {
      const cor = aresta.ativa ? AZUL : TINTA;
      assert.equal(aresta.traco, cor, `${medida.id}: traço da aresta`);
      assert.equal(aresta.seta, cor, `${medida.id}: seta da aresta`);
    }
  }
  const tamanho = Object.fromEntries(medidas.map((m) => [m.id, m.tamanho]));
  // Um diagrama que cabe na figura sai no tamanho natural: 20 px no palco, no layout figura e até
  // numa coluna de 4 (o exemplo da spec tem 335 de largura; a coluna, 368).
  for (const id of ['figura-exemplo', 'figura-larga', 'coluna-de-quatro']) {
    assert.ok(Math.abs(tamanho[id] - TEXTO_DO_DIAGRAMA) < 0.05, `${id}: ${tamanho[id]} px`);
  }
  // O largo (737 de largura) encolhe com a coluna: na de 6 (564 px) fica acima do mínimo, na de 4
  // (368 px), abaixo.
  assert.ok(tamanho['coluna-larga'] >= MINIMO_DO_PALCO && tamanho['coluna-larga'] < TEXTO_DO_DIAGRAMA, `coluna-larga: ${tamanho['coluna-larga']} px`);
  assert.ok(tamanho['coluna-estreita-larga'] < MINIMO_DO_PALCO, `coluna-estreita-larga: ${tamanho['coluna-estreita-larga']} px`);
});

test('composicao.tamanho-minimo vê o texto do diagrama encolhido, e só onde ele encolheu abaixo do mínimo', async () => {
  const { achados, avisoDeComposicao } = await validarArquivo(`${PASTA}/index.html`);
  assert.equal(avisoDeComposicao, null, 'sem Chrome a composição não mede nada');
  assert.deepEqual(achados.map(({ regra, id }) => [regra, id]), [['composicao.tamanho-minimo', 'coluna-estreita-larga']]);
  assert.match(achados[0].mensagem, /texto de SVG em [\d,]+ px no palco \(20 px no SVG/);
});

test('o pacote de dist/ desenha o diagrama com o satélite, e nenhum pedido de rede sai dele', async (t) => {
  const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
  t.after(() => pagina.close());
  const pedidos = [];
  pagina.on('request', (pedido) => pedidos.push(pedido.url()));
  // fetch é o caminho que o Emscripten usaria para buscar um .wasm à parte (instantiateStreaming);
  // registrar cada chamada vê também o que não vira pedido HTTP (data:, blob:).
  await pagina.addInitScript(() => {
    window.__buscas = [];
    const original = window.fetch;
    window.fetch = (...args) => { window.__buscas.push(String(args[0]?.url ?? args[0])); return original(...args); };
  });
  const url = `${cru.endereco}/${PASTA}/index.html`;
  await pagina.goto(url);
  await esperarMontagem(pagina);
  const estado = await pagina.evaluate(() => ({
    buscas: window.__buscas,
    desenhados: document.querySelectorAll('figure.diagrama svg g.no').length,
    titulo: document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent,
  }));
  assert.deepEqual(estado.buscas, [], 'o runtime chamou fetch');
  assert.equal(estado.desenhados, 3 + 6 + 3 + 6 + 6);
  // O mesmo achado de composição que `validar` dá, agora no painel do pacote.
  assert.equal(estado.titulo, 'Validador Aula USP: 1 erro, 0 avisos');
  const semFavicon = pedidos.filter((pedido) => !pedido.endsWith('/favicon.ico'));
  assert.deepEqual(semFavicon, [url, `${cru.endereco}/dist/aula-usp.js`, `${cru.endereco}/dist/aula-usp-diagramas.js`]);
});
