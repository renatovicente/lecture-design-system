// Duas propriedades do HTML construído que o linkedom não consegue guardar, porque não executa
// script nem tem motor de CSS (spec 3.5 não se aplica: isto é prova de comportamento em runtime, não
// checagem de estrutura). As duas só se enxergam num navegador de verdade, sobre o produto final
// aberto de file:// — exatamente como tests/integracao/construido.test.mjs, mas para dois defeitos
// que aquele teste não cobre.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iniciarChrome, fontesDoNo, AVISO_CDP_SOBRE_FILE } from './utilitarios.mjs';
import { construir } from '../../build/construir.mjs';
import { FAMILIA_POR_CLASSES } from '../../build/fontes-embutidas.mjs';

const RAIZ = new URL('../../', import.meta.url);
let navegador;
before(async () => { navegador = await iniciarChrome(); });
after(async () => { await navegador?.close(); });

async function construirEAbrir(caminhoRelativo) {
  const destino = await mkdtemp(join(tmpdir(), 'construido-prop-'));
  const { caminhoDoHtml } = await construir({ raiz: RAIZ, caminhoDaAula: new URL(caminhoRelativo, RAIZ), destino });
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  pagina.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) erros.push(m.text()); });
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`file://${caminhoDoHtml}`);
  await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
  return { pagina, erros };
}

// Fato 5: a fila de AulaUSP.demo tem de existir ANTES do <script> do autor, que roda durante o
// parsing — build/embutir.mjs põe o motor e o arranque no lugar da tag do runtime, que fica antes de
// qualquer conteúdo do <body>. tests/unit/embutir.test.mjs já prova a ORDEM dos nós no DOM, sem
// executar nada (linkedom não roda script); esta prova é a de execução real: especime/index.html
// registra a demo "contador" nesse exato padrão (AulaUSP.demo dentro de um <script> depois de todas
// as sections), e só monta quando a fila entregou a definição ao motor (motor/demos.js). Sem a fila
// antes do script, o <script> do autor lançaria ReferenceError DURANTE O PARSING (window.AulaUSP
// nem existiria) — e como esse erro é assíncrono ao resto da montagem, nenhuma regra do validador
// estático o vê; só um pageerror num navegador de verdade captura. Navegação por hash direto ao id do
// slide (mesmo padrão de tests/integracao/demos.test.mjs, medido limpo também sobre o HTML construído
// aberto de file://): motor/motor.js só usa history.replaceState para refletir o estado, nunca
// location.hash=, então quem muda o endereço aqui é este teste, não o motor.
test('a demo registrada pelo autor chega viva ao HTML construído aberto de file://', async (t) => {
  const { pagina, erros } = await construirEAbrir('especime/index.html');
  t.after(() => pagina.close());
  assert.equal(await pagina.evaluate(() => document.querySelector('#demo .demo output')), null,
    'a demo já monta antes da primeira entrada no slide dela — o teste não provaria nada');
  await pagina.evaluate(() => { location.hash = '#demo'; });
  // Rodada de correção 1, item 4: a regressão certa (fila instalada depois do <script> do autor) dá
  // ReferenceError durante o parsing, capturado em `erros` — mas o timeout DEFAULT de 30 s do
  // waitForFunction escondia essa causa por trás de um genérico "Timeout 30000ms exceeded", sem
  // apontar para o pageerror que já estava em `erros` o tempo todo. 5 s bastam (a demo monta em bem
  // menos que isso quando a fila funciona), e a mensagem aponta direto para a causa.
  try {
    await pagina.waitForFunction(() => document.querySelector('#demo .demo output'), undefined, { timeout: 5000 });
  } catch {
    assert.fail(`a demo "contador" nunca montou em 5 s — erros de página até aqui: ${erros.join(' | ') || '(nenhum)'}`);
  }
  const estado = await pagina.evaluate(() => {
    const saida = document.querySelector('#demo .demo output');
    return { valor: saida?.textContent, entradas: saida?.dataset.entradas, botoes: document.querySelectorAll('#demo .demo button').length };
  });
  assert.deepEqual(estado, { valor: '0', entradas: '1', botoes: 1 },
    'a demo "contador" não montou — a fila não entregou ao motor a definição que o autor registrou');
  await pagina.locator('#demo .demo button').click();
  assert.equal(await pagina.evaluate(() => document.querySelector('#demo .demo output').textContent), '5',
    'data-opcoes (passo:5) não chegou à demo — a montagem usou outra definição, ou nenhuma');
  assert.deepEqual(erros, [], erros.join('\n'));
});

// KaTeX_Main não tem classe própria: é o default de ".katex" e de todo texto que não bate nenhuma
// linha de FAMILIA_POR_CLASSES (mathit/mathbf/mainrm/textrm também apontam para Main, mas por
// classe — "∇" no espécime não tem nenhuma). A negação abaixo deriva o seletor do "default"
// diretamente da tabela (fonte única da verdade, build/fontes-embutidas.mjs), em vez de listar as
// famílias à mão outra vez — se a tabela ganhar uma linha nova, o seletor acompanha sozinho.
const NEGACOES_DE_FAMILIA = [...new Set(FAMILIA_POR_CLASSES.flatMap(([classes]) => classes))]
  .map((classe) => `:not(.${classe})`).join('');

// Rodada de correção 1, item 3: a versão anterior só conferia UM slide (o-papel-de-eta) e UMA família
// (KaTeX_Math) — 1 de 6 slides com matemática no espécime, e nem KaTeX_Main nem os dois tamanhos que
// \sum usa (build/fontes-embutidas.mjs:32-38: o PAR op-symbol.small-op/large-op, nunca "size1"/"size2"
// soltos) chegavam a ser medidos. Estas quatro famílias, conferidas ao vivo escrevendo este teste, são
// as que especime/matematica.html de fato usa, cada uma no seu próprio slide.
const PROBES = [
  { familia: 'KaTeX_Main', seletor: `.katex .mord${NEGACOES_DE_FAMILIA}` },
  { familia: 'KaTeX_Math', seletor: '.katex .mathnormal' },
  { familia: 'KaTeX_Size1', seletor: '.katex .op-symbol.small-op' },
  { familia: 'KaTeX_Size2', seletor: '.katex .op-symbol.large-op' },
];

// O que este teste garante, com precisão (correção sobre a alegação anterior, item 3 da rodada 1: uma
// revisão mostrou que excluir KaTeX_Math por completo JÁ cai em saida.glifo-ausente — "η" não tem
// cobertura alternativa —, e que \mathbb{R} — cobertura alternativa de propósito — já cai na guarda
// própria da tarefa 2 contra katex.min.css; a heurística não é "comprovadamente cega" a erro de
// mapeamento, as duas guardas anteriores pegam boa parte dele): as famílias que o CSS declara para
// cada classe (a tabela acima, já testada contra katex.min.css em tests/unit/fontes-embutidas.test.mjs)
// são as que de fato PINTAM cada nó, medido na pintura (CDP) e não na cascata — getComputedStyle veria
// o nome declarado mesmo com o @font-face quebrado (item 1 desta mesma rodada). Isto é o que só CDP
// prova, e é a razão de este teste existir.
test('cada família do KaTeX usada por especime/matematica.html pinta com a fonte embutida de verdade', async (t) => {
  const { pagina, erros } = await construirEAbrir('especime/matematica.html');
  t.after(() => pagina.close());

  for (const { familia, seletor } of PROBES) {
    const idDoSlide = await pagina.evaluate((sel) => document.querySelector(sel)?.closest('section.slide')?.id, seletor);
    assert.ok(idDoSlide, `nenhum elemento casa "${seletor}" — a aula mudou, ou o seletor não serve mais para ${familia}`);
    await pagina.evaluate((id) => { location.hash = '#' + id; }, idDoSlide);
    await pagina.waitForFunction((id) => document.querySelector('.slide.ativo')?.id === id, idDoSlide);
    // Medido escrevendo este teste: logo que o slide vira ativo, CDP às vezes ainda relata fonts: []
    // (o flip de display:none para block e o primeiro paint não têm a mesma marca de tempo) — 150 ms
    // bastaram em toda repetição, para as quatro famílias.
    await pagina.waitForTimeout(150);

    const fonts = await fontesDoNo(pagina, seletor);
    assert.ok(fonts?.length > 0, `CDP não relatou fonte para "${seletor}" no slide #${idDoSlide} (${familia})`);
    const nomes = fonts.map((f) => f.familyName);
    assert.ok(fonts.every((f) => f.familyName === familia && f.isCustomFont),
      `slide #${idDoSlide}, "${seletor}": esperava só ${familia}, veio ${nomes.join(', ')}`);
  }

  assert.deepEqual(erros.filter((erro) => !erro.includes(AVISO_CDP_SOBRE_FILE)), []);
});
