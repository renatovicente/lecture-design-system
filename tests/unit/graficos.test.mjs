import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { scaleLinear, scaleLog } from 'd3-scale';
import { line } from 'd3-shape';
import { extent } from 'd3-array';
import { tokens } from '../../tokens/tokens.js';
import { coresDasSeries, criarDesenhista, desenharGraficos } from '../../componentes/graficos.js';

const desenhista = criarDesenhista({ escalaLinear: scaleLinear, escalaLog: scaleLog, linha: line, extensao: extent });
const corpo = (html) => parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`).document.body;
// Analisa o SVG (string) devolvido por desenharSvg como DOM, para consultar atributos com querySelector
// em vez de regex — a mesma técnica de renderizarTex/renderizarCodigo para testar o que foi montado.
const svgDe = (svgString) => parseHTML(`<!DOCTYPE html><html><body>${svgString}</body></html>`).document.body.firstElementChild;

// Snapshots (Passo 4, spec 11.1): capturados de uma execução já conferida à mão, número a número,
// contra a spec 7.2 (ver o relatório da Tarefa 2). Complementam as asserções de propriedade abaixo —
// não as substituem: um snapshot sozinho fica verde com a cor errada no dia em que for regravado.
const SNAPSHOT_LINHA = "<svg viewBox=\"0 0 640 360\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"Geist Mono, ui-monospace, monospace\"><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"263.06\" y2=\"263.06\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"192.47\" y2=\"192.47\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"121.88\" y2=\"121.88\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"51.29\" y2=\"51.29\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><g class=\"faixa\"><rect x=\"165\" y=\"16\" width=\"218\" height=\"300\" fill=\"#FCB421\"></rect><text x=\"274\" y=\"30\" fill=\"#0A0A0A\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">platô</text></g><g class=\"serie\" data-serie=\"treino\" data-cor=\"tinta\"><path d=\"M56,51.29L165,192.47L274,263.06L383,298.35L492,316\" fill=\"none\" stroke=\"#0A0A0A\" stroke-width=\"2\"></path><line class=\"serie-traco\" x1=\"500\" y1=\"316\" x2=\"516\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><text class=\"serie-rotulo\" x=\"522\" y=\"316\" fill=\"#0A0A0A\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" dominant-baseline=\"middle\">treino</text></g><g class=\"serie\" data-serie=\"teste\" data-cor=\"azul\"><path d=\"M56,16L165,157.18L274,210.12L383,227.76L492,234.82\" fill=\"none\" stroke=\"#1094AB\" stroke-width=\"2\"></path><line class=\"serie-traco\" x1=\"500\" y1=\"234.82\" x2=\"516\" y2=\"234.82\" stroke=\"#1094AB\" stroke-width=\"2\"></line><text class=\"serie-rotulo\" x=\"522\" y=\"234.82\" fill=\"#0A0A0A\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" dominant-baseline=\"middle\">teste</text></g><line class=\"eixo eixo-x\" x1=\"56\" y1=\"316\" x2=\"492\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><line class=\"eixo eixo-y\" x1=\"56\" y1=\"16\" x2=\"56\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><text class=\"eixo-titulo\" x=\"274\" y=\"354\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">época</text><text class=\"eixo-titulo\" x=\"14\" y=\"166\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\" transform=\"rotate(-90 14 166)\">erro</text><text class=\"marca\" x=\"56\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0</text><text class=\"marca\" x=\"165\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">1</text><text class=\"marca\" x=\"274\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">2</text><text class=\"marca\" x=\"383\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">3</text><text class=\"marca\" x=\"492\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">4</text><text class=\"marca\" x=\"48\" y=\"263.06\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0.4</text><text class=\"marca\" x=\"48\" y=\"192.47\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0.6</text><text class=\"marca\" x=\"48\" y=\"121.88\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0.8</text><text class=\"marca\" x=\"48\" y=\"51.29\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">1</text></svg>";
// Regravado depois da correção do Critical 1: os limites de classe agora saem exatos (0.3125,
// 0.525, 0.7375), não arredondados para 2 casas (0.31, 0.53, 0.74 — o que a revisão apontou).
const SNAPSHOT_HISTOGRAMA = "<svg viewBox=\"0 0 640 360\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"Geist Mono, ui-monospace, monospace\"><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"316\" y2=\"316\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"241\" y2=\"241\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"166\" y2=\"166\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"91\" y2=\"91\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"16\" y2=\"16\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><g class=\"serie\" data-serie=\"erro\" data-cor=\"tinta\"><rect x=\"57\" y=\"16\" width=\"107\" height=\"300\" fill=\"#0A0A0A\"></rect><rect x=\"166\" y=\"166\" width=\"107\" height=\"150\" fill=\"#0A0A0A\"></rect><rect x=\"275\" y=\"316\" width=\"107\" height=\"0\" fill=\"#0A0A0A\"></rect><rect x=\"384\" y=\"166\" width=\"107\" height=\"150\" fill=\"#0A0A0A\"></rect></g><line class=\"eixo eixo-x\" x1=\"56\" y1=\"316\" x2=\"492\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><line class=\"eixo eixo-y\" x1=\"56\" y1=\"16\" x2=\"56\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><text class=\"eixo-titulo\" x=\"274\" y=\"354\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">erro</text><text class=\"eixo-titulo\" x=\"14\" y=\"166\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\" transform=\"rotate(-90 14 166)\">contagem</text><text class=\"marca\" x=\"56\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0.1</text><text class=\"marca\" x=\"165\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0.3125</text><text class=\"marca\" x=\"274\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0.525</text><text class=\"marca\" x=\"383\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0.7375</text><text class=\"marca\" x=\"492\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0.95</text><text class=\"marca\" x=\"48\" y=\"316\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0</text><text class=\"marca\" x=\"48\" y=\"241\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">1</text><text class=\"marca\" x=\"48\" y=\"166\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">2</text><text class=\"marca\" x=\"48\" y=\"91\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">3</text><text class=\"marca\" x=\"48\" y=\"16\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">4</text></svg>";

// Passo 1 do brief: a tabela pequena que vale mais que o resto da tarefa — um erro aqui é silencioso,
// porque o gráfico sai bonito com a série errada em destaque. Cada linha diz quem ficou azul (foco),
// quem ficou tinta, quem ficou cinza, e qual delas é a tracejada.
test('coresDasSeries: uma série sai em tinta', () => {
  assert.deepEqual(coresDasSeries(['a']), [{ serie: 'a', cor: 'tinta', tracejada: false }]);
});

test('coresDasSeries: duas séries com foco — o foco é azul, a outra é tinta (não cinza: só entra com 3)', () => {
  assert.deepEqual(coresDasSeries(['a', 'b'], 'b'), [
    { serie: 'a', cor: 'tinta', tracejada: false },
    { serie: 'b', cor: 'azul', tracejada: false },
  ]);
  assert.deepEqual(coresDasSeries(['a', 'b'], 'a'), [
    { serie: 'a', cor: 'azul', tracejada: false },
    { serie: 'b', cor: 'tinta', tracejada: false },
  ], 'o foco pode ser a primeira, não só a última');
});

test('coresDasSeries: duas séries sem foco — a ÚLTIMA de y vira o foco (azul)', () => {
  assert.deepEqual(coresDasSeries(['a', 'b']), [
    { serie: 'a', cor: 'tinta', tracejada: false },
    { serie: 'b', cor: 'azul', tracejada: false },
  ]);
});

test('coresDasSeries: três séries com foco no meio — as duas de fora ficam tinta e cinza tracejada, NESSA ORDEM de encontro', () => {
  assert.deepEqual(coresDasSeries(['a', 'b', 'c'], 'b'), [
    { serie: 'a', cor: 'tinta', tracejada: false },
    { serie: 'b', cor: 'azul', tracejada: false },
    { serie: 'c', cor: 'cinza', tracejada: true },
  ]);
});

test('coresDasSeries: três séries sem foco — a última (c) é o foco; a e b (nessa ordem) ficam tinta e cinza tracejada', () => {
  assert.deepEqual(coresDasSeries(['a', 'b', 'c']), [
    { serie: 'a', cor: 'tinta', tracejada: false },
    { serie: 'b', cor: 'cinza', tracejada: true },
    { serie: 'c', cor: 'azul', tracejada: false },
  ]);
});

test('coresDasSeries: mais de 3 séries lança — o módulo se defende sozinho, porque recursos.grafico (Tarefa 4) ainda não existe para recusar isto antes (Important 4 da revisão)', () => {
  assert.throws(() => coresDasSeries(['a', 'b', 'c', 'd']), /no máximo 3 séries em y; recebidas 4/);
  assert.throws(() => coresDasSeries(['a', 'b', 'c', 'd', 'e']), /no máximo 3 séries em y; recebidas 5/);
});

test('mais de 3 séries lança já na composição do SVG — sem a defesa, a 3ª/4ª série ficava sem cor e sem stroke, invisível e calada', () => {
  const especificacao = { tipo: 'linha', x: 'x', y: ['a', 'b', 'c', 'd'], eixos: {}, dados: { x: [0, 1], a: [0, 1], b: [0, 1], c: [0, 1], d: [0, 1] } };
  assert.throws(() => desenhista.desenharSvg(especificacao, especificacao.dados), /no máximo 3 séries/);
});

// Passo 4: "teste o que o SVG afirma". As asserções abaixo leem o SVG como DOM (svgDe) e checam
// exatamente as propriedades que o brief pede: quantas séries, qual cor cada uma recebeu, se a faixa
// está atrás das séries na ordem dos nós, se o eixo tem 2px, se o rótulo está na ponta.
test('linha (exemplo literal da spec 7.2): duas séries na cor certa, faixa atrás, eixo de 2px', () => {
  const especificacao = {
    tipo: 'linha', dados: 'data/erro.csv', x: 'epoca', y: ['treino', 'teste'], foco: 'teste',
    eixos: { x: 'época', y: 'erro' }, faixas: [{ x: [1, 3], rotulo: 'platô' }],
  };
  const colunas = { epoca: [0, 1, 2, 3, 4], treino: [1.0, 0.6, 0.4, 0.3, 0.25], teste: [1.1, 0.7, 0.55, 0.5, 0.48] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));

  const series = [...svg.querySelectorAll('.serie')];
  assert.equal(series.length, 2, 'duas séries em y viram dois grupos .serie');
  assert.deepEqual(series.map((g) => g.getAttribute('data-serie')), ['treino', 'teste']);
  assert.deepEqual(series.map((g) => g.getAttribute('data-cor')), ['tinta', 'azul'], 'treino não é o foco (tinta); teste é o foco (azul)');

  // "atrás" é ordem de nó no SVG: quem pinta depois cobre quem pintou antes. A faixa tem de vir
  // antes das séries entre os filhos diretos do <svg>.
  const nomesDosFilhos = [...svg.children].map((no) => no.getAttribute('class'));
  const indiceFaixa = nomesDosFilhos.indexOf('faixa');
  const indicePrimeiraSerie = nomesDosFilhos.indexOf('serie');
  assert.ok(indiceFaixa >= 0, 'a faixa existe como nó do svg');
  assert.ok(indiceFaixa < indicePrimeiraSerie, 'a faixa é nó anterior à primeira série (spec 7.2: "atrás das séries")');

  // eixo em tinta de 2px — a classe .eixo separa isto da grade (1px) e do traço do rótulo (2px, mas na cor da série)
  const eixos = [...svg.querySelectorAll('.eixo')];
  assert.equal(eixos.length, 2, 'eixo x e eixo y');
  for (const eixo of eixos) {
    assert.equal(eixo.getAttribute('stroke-width'), String(tokens.regua.normal));
    assert.equal(eixo.getAttribute('stroke'), tokens.cor.tinta);
  }
});

test('linha: o rótulo de cada série fica na ponta (à direita de todo ponto da própria série) e sempre em tinta, mesmo o da série azul', () => {
  const especificacao = {
    tipo: 'linha', x: 'epoca', y: ['treino', 'teste'], foco: 'teste', eixos: {},
    dados: { epoca: [0, 1, 2, 3, 4], treino: [1.0, 0.6, 0.4, 0.3, 0.25], teste: [1.1, 0.7, 0.55, 0.5, 0.48] },
  };
  const svg = svgDe(desenhista.desenharSvg(especificacao, especificacao.dados));
  const series = [...svg.querySelectorAll('.serie')];
  assert.equal(series.length, 2);
  for (const grupo of series) {
    const rotulo = grupo.querySelector('.serie-rotulo');
    assert.equal(rotulo.textContent, grupo.getAttribute('data-serie'));
    // texto em azul só vale a partir de 32px (spec 7.2); este rótulo é 14 — por isso tinta sempre,
    // mesmo dentro do grupo da série azul.
    assert.equal(rotulo.getAttribute('fill'), tokens.cor.tinta);
    const xsDoCaminho = [...grupo.querySelector('path').getAttribute('d').matchAll(/[ML]([\d.]+),/g)].map((m) => Number(m[1]));
    assert.ok(Number(rotulo.getAttribute('x')) > Math.max(...xsDoCaminho), 'o rótulo fica à direita de todos os pontos da linha — "na ponta"');
    const traco = grupo.querySelector('.serie-traco');
    assert.equal(traco.getAttribute('x2') - traco.getAttribute('x1'), 16, 'o traço antes do rótulo tem 16px (spec 7.2)');
    assert.equal(traco.getAttribute('stroke'), tokens.cor[grupo.getAttribute('data-cor')], 'o traço sai na cor da própria série, não em tinta');
  }
});

test('linha: SVG do exemplo literal da spec 7.2 bate com o snapshot capturado (complemento às asserções acima — sozinho, um snapshot não prova a cor certa no dia em que alguém o regravar)', () => {
  const especificacao = {
    tipo: 'linha', dados: 'data/erro.csv', x: 'epoca', y: ['treino', 'teste'], foco: 'teste',
    eixos: { x: 'época', y: 'erro' }, faixas: [{ x: [1, 3], rotulo: 'platô' }],
  };
  const colunas = { epoca: [0, 1, 2, 3, 4], treino: [1.0, 0.6, 0.4, 0.3, 0.25], teste: [1.1, 0.7, 0.55, 0.5, 0.48] };
  assert.equal(desenhista.desenharSvg(especificacao, colunas), SNAPSHOT_LINHA);
});

test('linha: rodar duas vezes com a mesma entrada dá o mesmo texto, byte a byte (determinismo que a Tarefa 6 precisa para a comparação visual)', () => {
  const especificacao = { tipo: 'linha', x: 'x', y: ['a'], eixos: {}, dados: { x: [0, 1, 2], a: [0.333333, 0.666666, 1] } };
  const primeira = desenhista.desenharSvg(especificacao, especificacao.dados);
  const segunda = desenhista.desenharSvg(especificacao, especificacao.dados);
  assert.equal(primeira, segunda);
});

test('linha: escala log usa escalaLog de verdade — o mesmo domínio [1,100] espalha os pontos de outro jeito que em linear', () => {
  const base = { tipo: 'dispersao', x: 'x', y: ['y'], eixos: {}, dados: { x: [1, 10, 100], y: [1, 10, 100] } };
  const cxDe = (svg) => [...svg.matchAll(/<circle cx="([\d.]+)"/g)].map((m) => Number(m[1]));
  const [linX0, linX1] = cxDe(desenhista.desenharSvg(base, base.dados));
  const [logX0, logX1] = cxDe(desenhista.desenharSvg({ ...base, escala: { x: 'log' } }, base.dados));
  assert.ok(logX1 - logX0 > linX1 - linX0, 'em log, 1→10 (uma década) ocupa mais espaço que em linear, onde 10 fica perto do início');
});

test('formatarNumero (via marcas de eixo): um domínio pequeno (0.0001 a 0.0016) não perde resolução — Critical 1 da revisão, medido antes com 8 marcas "0"', () => {
  const especificacao = { tipo: 'linha', x: 'epoca', y: ['erro'], eixos: { x: 'epoca', y: 'erro' } };
  const colunas = { epoca: [0, 1, 2, 3, 4, 5, 6, 7], erro: [0.0001, 0.0003, 0.0005, 0.0007, 0.0009, 0.0011, 0.0013, 0.0016] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const marcasDoEixoY = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'end');
  const textos = marcasDoEixoY.map((t) => t.textContent);
  assert.equal(textos.length, 8);
  assert.ok(textos.every((t) => t !== '0'), 'nenhuma marca vira "0" por arredondamento de 2 casas');
  assert.equal(new Set(textos).size, 8, 'as 8 marcas são distintas entre si');
  assert.deepEqual(textos, ['0.0002', '0.0004', '0.0006', '0.0008', '0.001', '0.0012', '0.0014', '0.0016']);
});

test('escala log com 0 (ou negativo) no domínio lança, em vez de desenhar NaN calado — Important 2 da revisão, medido com o exemplo literal da spec 7.2 (epoca começa em 0)', () => {
  const especificacao = {
    tipo: 'linha', x: 'epoca', y: ['treino', 'teste'], foco: 'teste', eixos: { x: 'época', y: 'erro' }, escala: { x: 'log' },
    dados: { epoca: [0, 1, 2, 3, 4], treino: [1.0, 0.6, 0.4, 0.3, 0.25], teste: [1.1, 0.7, 0.55, 0.5, 0.48] },
  };
  assert.throws(
    () => desenhista.desenharSvg(especificacao, especificacao.dados),
    /escala log exige valores maiores que zero no domínio; recebido \[0, 4\]/,
  );
});

test('escala log com domínio inteiramente positivo continua funcionando normalmente', () => {
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['y'], eixos: {}, escala: { x: 'log' }, dados: { x: [1, 10, 100], y: [1, 10, 100] } };
  assert.doesNotThrow(() => desenhista.desenharSvg(especificacao, especificacao.dados));
});

test('barras: três séries na cor certa; as marcas do eixo x são as categorias, não números', () => {
  const especificacao = { tipo: 'barras', x: 'grupo', y: ['a', 'b', 'c'], foco: 'b', eixos: { x: 'grupo', y: 'valor' } };
  const colunas = { grupo: ['x', 'y', 'z'], a: [3, 5, 2], b: [4, 2, 6], c: [1, 3, 4] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const series = [...svg.querySelectorAll('.serie')];
  assert.deepEqual(series.map((g) => g.getAttribute('data-cor')), ['tinta', 'azul', 'cinza']);
  assert.equal(series.every((g) => g.querySelectorAll('rect').length === 3), true, 'uma barra por categoria em cada série');

  // a série cinza (tracejada) é a única sem fill sólido — dasharray não é visível num fill
  const [tinta, , cinzaSerie] = series;
  assert.ok([...tinta.querySelectorAll('rect')].every((r) => r.getAttribute('fill') === tokens.cor.tinta));
  assert.ok([...cinzaSerie.querySelectorAll('rect')].every((r) => r.getAttribute('fill') === 'none' && r.getAttribute('stroke-dasharray')));

  const marcasDoEixoX = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'middle');
  assert.deepEqual(marcasDoEixoX.map((t) => t.textContent), ['x', 'y', 'z'], 'categorias literais, não índices 0/1/2');
});

test('barras: o rótulo de cada série fica na margem direita — não em cima do grupo de barras seguinte (Critical 2 da revisão)', () => {
  const especificacao = { tipo: 'barras', x: 'grupo', y: ['a', 'b', 'c'], foco: 'b', eixos: {} };
  const colunas = { grupo: ['x', 'y', 'z'], a: [3, 5, 2], b: [4, 2, 6], c: [1, 3, 4] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const todasAsBarras = [...svg.querySelectorAll('.serie rect')];
  const direitaMaxima = Math.max(...todasAsBarras.map((r) => Number(r.getAttribute('x')) + Number(r.getAttribute('width'))));
  const series = [...svg.querySelectorAll('.serie')];
  const xsDosRotulos = series.map((g) => Number(g.querySelector('.serie-rotulo').getAttribute('x')));
  for (const [i, grupo] of series.entries()) {
    assert.ok(xsDosRotulos[i] > direitaMaxima, `rótulo de ${grupo.getAttribute('data-serie')} (x=${xsDosRotulos[i]}) fica à direita de toda barra (max=${direitaMaxima}), não só da própria`);
  }
  // as três séries compartilham a mesma margem — nenhuma fica "mais perto" da borda que a outra,
  // o que era exatamente o defeito: só a última série (a mais à direita dentro do grupo) alcançava a margem.
  assert.equal(new Set(xsDosRotulos).size, 1, 'as três séries alinham no mesmo x — a margem direita do gráfico');
});

test('dispersao: série única sai em tinta, um círculo por ponto', () => {
  const especificacao = { tipo: 'dispersao', x: 'idade', y: ['altura'], eixos: { x: 'idade', y: 'altura' } };
  const colunas = { idade: [1, 2, 3], altura: [50, 60, 70] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const serie = svg.querySelector('.serie');
  assert.equal(serie.getAttribute('data-cor'), 'tinta');
  const circulos = [...serie.querySelectorAll('circle')];
  assert.equal(circulos.length, 3);
  assert.ok(circulos.every((c) => c.getAttribute('fill') === tokens.cor.tinta));
});

test('dispersao: a série cinza tracejada vira marcador vazado (contorno, sem preenchimento)', () => {
  // sem foco, com 3 séries: a última (c) é o foco (azul); a e b ficam tinta e cinza tracejada, nessa ordem
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['a', 'b', 'c'], eixos: {} };
  const colunas = { x: [0, 1], a: [0, 1], b: [0, 1], c: [0, 1] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const serieCinza = [...svg.querySelectorAll('.serie')].find((g) => g.getAttribute('data-cor') === 'cinza');
  assert.equal(serieCinza.getAttribute('data-serie'), 'b');
  const circulos = [...serieCinza.querySelectorAll('circle')];
  assert.ok(circulos.length > 0);
  assert.ok(circulos.every((c) => c.getAttribute('fill') === 'none' && c.getAttribute('stroke') === tokens.cor.cinza));
});

test('histograma: 4 classes de largura igual, contagem certa (4, 2, 0, 2 — conferido à mão), sem rótulo na ponta', () => {
  const especificacao = { tipo: 'histograma', x: 'erro', classes: 4, eixos: { x: 'erro', y: 'contagem' } };
  const colunas = { erro: [0.1, 0.2, 0.2, 0.5, 0.9, 0.95, 0.3, 0.4] };
  // largura de classe = (0.95-0.1)/4 = 0.2125 → classes [0.1,0.3125) [0.3125,0.525) [0.525,0.7375) [0.7375,0.95]
  // 0.1,0.2,0.2,0.3 caem na 1ª (4); 0.4,0.5 na 2ª (2); nenhum na 3ª (0); 0.9,0.95 na 4ª (2, 0.95 no limite superior cai na última classe)
  const svg = desenhista.desenharSvg(especificacao, colunas);
  assert.equal(svg, SNAPSHOT_HISTOGRAMA);
  const parsed = svgDe(svg);
  assert.equal(parsed.querySelectorAll('.serie').length, 1, 'uma distribuição, uma série');
  assert.equal(parsed.querySelector('.serie').getAttribute('data-cor'), 'tinta');
  assert.equal(parsed.querySelector('.serie-rotulo'), null, 'sem rótulo na ponta — decisão da Tarefa 2 (ver relatório): uma distribuição só, nada para desambiguar');
  const alturas = [...parsed.querySelectorAll('.serie rect')].map((r) => Number(r.getAttribute('height')));
  assert.deepEqual(alturas, [300, 150, 0, 150], 'proporcional às contagens 4, 2, 0, 2 (a maior, 4, vira a altura útil inteira)');
});

test('histograma: faixas também são desenhadas (x é contínuo, como em linha/dispersão) — Important 3 da revisão', () => {
  const especificacao = { tipo: 'histograma', x: 'erro', classes: 4, eixos: {}, faixas: [{ x: [0.3, 0.6], rotulo: 'zona' }] };
  const colunas = { erro: [0.1, 0.2, 0.2, 0.5, 0.9, 0.95, 0.3, 0.4] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const nomesDosFilhos = [...svg.children].map((no) => no.getAttribute('class'));
  const indiceFaixa = nomesDosFilhos.indexOf('faixa');
  const indiceSerie = nomesDosFilhos.indexOf('serie');
  assert.ok(indiceFaixa >= 0, 'a faixa existe (antes só "barras" ficava sem, por ser categórico — histograma é contínuo)');
  assert.ok(indiceFaixa < indiceSerie, 'a faixa fica atrás da série, como nos outros tipos contínuos');
  assert.equal(svg.querySelector('.faixa rect').getAttribute('fill'), tokens.cor.amarelo);
});

test('tipo desconhecido lança, em vez de desenhar algo errado calado', () => {
  assert.throws(() => desenhista.desenharSvg({ tipo: 'pizza', x: 'a', y: ['b'] }, { a: [1], b: [1] }), /tipo de gráfico desconhecido/);
});

test('nome de série com caracteres especiais não quebra a marcação: o atributo fecha certo e o texto sai escapado', () => {
  const nome = 'a"b<c>&d';
  const especificacao = { tipo: 'linha', x: 'x', y: [nome], eixos: {} };
  const colunas = { x: [0, 1], [nome]: [0, 1] };
  const svg = desenhista.desenharSvg(especificacao, colunas);
  assert.ok(svg.includes('&quot;') && svg.includes('&lt;') && svg.includes('&gt;') && svg.includes('&amp;'), 'a string bruta traz as formas escapadas, não os caracteres crus');
  const parsed = svgDe(svg); // se a marcação tivesse quebrado (aspa fechando cedo o atributo), isto sairia deformado
  assert.equal(parsed.querySelector('.serie').getAttribute('data-serie'), nome, 'o parser devolve o valor original — prova de que o escape (e o desescape) fecham o ciclo');
  assert.equal(parsed.querySelector('.serie-rotulo').textContent, nome);
});

// A partir daqui, desenharGraficos: o efeito sobre o DOM (raiz), não mais o SVG isolado.
test('desenharGraficos troca o script de figure.grafico por um SVG e preserva a figcaption', () => {
  const especificacao = {
    tipo: 'linha', dados: 'data/erro.csv', x: 'epoca', y: ['treino', 'teste'], foco: 'teste',
    eixos: { x: 'época', y: 'erro' }, faixas: [{ x: [120, 245], rotulo: 'platô' }],
  };
  const colunas = { epoca: [0, 120, 245, 400], treino: [1, 0.5, 0.3, 0.2], teste: [1.1, 0.6, 0.4, 0.3] };
  const raiz = corpo(`<figure class="grafico"><script type="application/json">${JSON.stringify(especificacao)}</script><figcaption>Erro de treino e de teste ao longo das épocas.</figcaption></figure>`);
  const erros = desenharGraficos(raiz, { desenhista, dados: { 'data/erro.csv': colunas } });
  assert.deepEqual(erros, []);
  assert.equal(raiz.querySelectorAll('figure.grafico > svg').length, 1, 'o svg é filho direto de figure, como img/svg em figuras da fase 1 (estilos/componentes.css)');
  assert.equal(raiz.querySelector('figcaption').textContent, 'Erro de treino e de teste ao longo das épocas.');
  assert.equal(raiz.querySelector('script[type="application/json"]').textContent.includes('"treino"'), true, 'o script original continua no DOM — só ganhou um irmão');
});

test('desenharGraficos aceita colunas inline em `dados` (modo navegador sem arquivos), sem consultar o parâmetro dados', () => {
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['a'], eixos: {}, dados: { x: [0, 1], a: [1, 2] } };
  const raiz = corpo(`<figure class="grafico"><script type="application/json">${JSON.stringify(especificacao)}</script></figure>`);
  assert.deepEqual(desenharGraficos(raiz, { desenhista }), [], 'sem o parâmetro dados: usa o default {} e nem precisa dele, porque os dados já são colunas');
  assert.equal(raiz.querySelectorAll('svg').length, 1);
});

test('desenharGraficos é idempotente: uma segunda passada não redesenha nem duplica o SVG', () => {
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['a'], eixos: {}, dados: { x: [0, 1], a: [1, 2] } };
  const raiz = corpo(`<figure class="grafico"><script type="application/json">${JSON.stringify(especificacao)}</script></figure>`);
  assert.deepEqual(desenharGraficos(raiz, { desenhista }), []);
  assert.equal(raiz.querySelectorAll('svg').length, 1);
  const antes = raiz.querySelector('figure').innerHTML;
  assert.deepEqual(desenharGraficos(raiz, { desenhista }), []);
  assert.equal(raiz.querySelectorAll('svg').length, 1);
  assert.equal(raiz.querySelector('figure').innerHTML, antes);
});

test('desenharGraficos reporta dados ausentes sem impedir as demais figuras da mesma raiz', () => {
  const semDados = { tipo: 'linha', dados: 'data/nao-existe.csv', x: 'x', y: ['a'], eixos: {} };
  const comDados = { tipo: 'linha', dados: { x: [0, 1], a: [0, 1] }, x: 'x', y: ['a'], eixos: {} };
  const raiz = corpo(
    `<figure class="grafico"><script type="application/json">${JSON.stringify(semDados)}</script></figure>`
    + `<figure class="grafico"><script type="application/json">${JSON.stringify(comDados)}</script></figure>`,
  );
  const erros = desenharGraficos(raiz, { desenhista, dados: {} });
  assert.equal(erros.length, 1);
  assert.match(erros[0].mensagem, /dados não encontrados/);
  const figuras = [...raiz.querySelectorAll('figure.grafico')];
  assert.equal(figuras[0].querySelector('svg'), null, 'a figura sem dados fica sem SVG — não some, não quebra');
  assert.notEqual(figuras[1].querySelector('svg'), null, 'a figura seguinte, com dados inline, desenha normalmente');
});

test('desenharGraficos reporta JSON inválido sem lançar, com o trecho original do script na mensagem', () => {
  const raiz = corpo('<figure class="grafico"><script type="application/json">{ isto não é json </script></figure>');
  const erros = desenharGraficos(raiz, { desenhista, dados: {} });
  assert.equal(erros.length, 1);
  assert.equal(erros[0].trecho, '{ isto não é json');
  assert.equal(raiz.querySelector('svg'), null);
});

test('desenharGraficos ignora figure.grafico sem o script — não é erro desta função (estrutura.obrigatorio já acusa isto no fonte)', () => {
  const raiz = corpo('<figure class="grafico"></figure>');
  assert.deepEqual(desenharGraficos(raiz, { desenhista, dados: {} }), []);
  assert.equal(raiz.querySelector('svg'), null);
});
