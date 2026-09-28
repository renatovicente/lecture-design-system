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
// Regravado quatro vezes desde a rodada 1: (1) rodada 2 — o texto das marcas de eixo y passa a vir de
// escalaY.tickFormat(5), não de formatarNumero — o "1" da última marca vira "1.0" (tickFormat mantém
// as mesmas casas decimais em toda a régua, para as marcas lerem como uma sequência, não números
// soltos); (2) rodada 3 — paraPtBr troca o separador decimal de ponto para vírgula ("1.0" → "1,0"),
// porque o sistema é em português e tickFormat escreve no padrão dos EUA; (3) Tarefa 3 (gráfico com
// reta e limites redondos) — escalaY de "linha" passa por .nice(): o domínio de y, extensão crua
// [0,25; 1,1], vira [0,2; 1,1]; (4) achado do PDF renderizado (revisão do coordenador) — .nice()
// sozinho não abre folga quando o domínio já é redondo dos dois lados, e o y de "linha" ganha folga
// ADITIVA de 5% antes do .nice() (só em y; o x de "linha" continua nos dados, sem folga — é
// convencional para série no tempo). O domínio de y vai de [0,25; 1,1] com folga para [0,2075; 1,1425],
// e o .nice() arredonda para [0,2; 1,2] — a régua ganha uma marca a mais no topo (1,2) que a rodada
// anterior não tinha, e o ponto mais alto da série "teste" (y=1,1) fica ainda mais longe do topo da
// área útil.
const SNAPSHOT_LINHA ="<svg viewBox=\"0 0 640 360\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"Geist Mono, ui-monospace, monospace\"><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"316\" y2=\"316\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"256\" y2=\"256\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"196\" y2=\"196\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"136\" y2=\"136\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"76\" y2=\"76\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"16\" y2=\"16\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><g class=\"faixa\"><rect x=\"165\" y=\"16\" width=\"218\" height=\"300\" fill=\"#FCB421\"></rect><text x=\"274\" y=\"30\" fill=\"#0A0A0A\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">platô</text></g><g class=\"serie\" data-serie=\"treino\" data-cor=\"tinta\"><path d=\"M56,76L165,196L274,256L383,286L492,301\" fill=\"none\" stroke=\"#0A0A0A\" stroke-width=\"2\"></path><line class=\"serie-traco\" x1=\"500\" y1=\"301\" x2=\"516\" y2=\"301\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><text class=\"serie-rotulo\" x=\"522\" y=\"301\" fill=\"#0A0A0A\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" dominant-baseline=\"middle\">treino</text></g><g class=\"serie\" data-serie=\"teste\" data-cor=\"azul\"><path d=\"M56,46L165,166L274,211L383,226L492,232\" fill=\"none\" stroke=\"#1094AB\" stroke-width=\"2\"></path><line class=\"serie-traco\" x1=\"500\" y1=\"232\" x2=\"516\" y2=\"232\" stroke=\"#1094AB\" stroke-width=\"2\"></line><text class=\"serie-rotulo\" x=\"522\" y=\"232\" fill=\"#0A0A0A\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" dominant-baseline=\"middle\">teste</text></g><line class=\"eixo eixo-x\" x1=\"56\" y1=\"316\" x2=\"492\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><line class=\"eixo eixo-y\" x1=\"56\" y1=\"16\" x2=\"56\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><text class=\"eixo-titulo\" x=\"274\" y=\"354\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">época</text><text class=\"eixo-titulo\" x=\"14\" y=\"166\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\" transform=\"rotate(-90 14 166)\">erro</text><text class=\"marca\" x=\"56\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0</text><text class=\"marca\" x=\"165\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">1</text><text class=\"marca\" x=\"274\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">2</text><text class=\"marca\" x=\"383\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">3</text><text class=\"marca\" x=\"492\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">4</text><text class=\"marca\" x=\"48\" y=\"316\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0,2</text><text class=\"marca\" x=\"48\" y=\"256\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0,4</text><text class=\"marca\" x=\"48\" y=\"196\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0,6</text><text class=\"marca\" x=\"48\" y=\"136\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0,8</text><text class=\"marca\" x=\"48\" y=\"76\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">1,0</text><text class=\"marca\" x=\"48\" y=\"16\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">1,2</text></svg>";
// Regravado quatro vezes desde a Tarefa 2: (1) Critical 1 (limites exatos); (2) decisão do
// coordenador (rótulo na ponta); (3) rodada 2 — as bordas de classe passam por formatarPasso (não
// mais formatarNumero), que deriva a precisão do passo real entre elas (larguraClasse=0.2125 → 1
// casa): "0.3125"/"0.525"/"0.7375" viram "0.3"/"0.5"/"0.7" — menos exato que a Tarefa 2 tinha
// conseguido, mas sem colisão nenhuma (as 5 bordas seguem distintas), que é o critério da rodada 2,
// não a exatidão da marca; (4) rodada 3 — formatarPasso também passa por paraPtBr, mesma fonte de
// separador que os ticks: "0.3" → "0,3".
const SNAPSHOT_HISTOGRAMA ="<svg viewBox=\"0 0 640 360\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"Geist Mono, ui-monospace, monospace\"><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"316\" y2=\"316\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"241\" y2=\"241\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"166\" y2=\"166\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"91\" y2=\"91\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><line class=\"grade\" x1=\"56\" x2=\"492\" y1=\"16\" y2=\"16\" stroke=\"#D9D9D9\" stroke-width=\"1\"></line><g class=\"serie\" data-serie=\"erro\" data-cor=\"tinta\"><rect x=\"57\" y=\"16\" width=\"107\" height=\"300\" fill=\"#0A0A0A\"></rect><rect x=\"166\" y=\"166\" width=\"107\" height=\"150\" fill=\"#0A0A0A\"></rect><rect x=\"275\" y=\"316\" width=\"107\" height=\"0\" fill=\"#0A0A0A\"></rect><rect x=\"384\" y=\"166\" width=\"107\" height=\"150\" fill=\"#0A0A0A\"></rect><line class=\"serie-traco\" x1=\"500\" y1=\"166\" x2=\"516\" y2=\"166\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><text class=\"serie-rotulo\" x=\"522\" y=\"166\" fill=\"#0A0A0A\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" dominant-baseline=\"middle\">erro</text></g><line class=\"eixo eixo-x\" x1=\"56\" y1=\"316\" x2=\"492\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><line class=\"eixo eixo-y\" x1=\"56\" y1=\"16\" x2=\"56\" y2=\"316\" stroke=\"#0A0A0A\" stroke-width=\"2\"></line><text class=\"eixo-titulo\" x=\"274\" y=\"354\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">erro</text><text class=\"eixo-titulo\" x=\"14\" y=\"166\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\" transform=\"rotate(-90 14 166)\">contagem</text><text class=\"marca\" x=\"56\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0,1</text><text class=\"marca\" x=\"165\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0,3</text><text class=\"marca\" x=\"274\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0,5</text><text class=\"marca\" x=\"383\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0,7</text><text class=\"marca\" x=\"492\" y=\"336\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"middle\">0,9</text><text class=\"marca\" x=\"48\" y=\"316\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">0</text><text class=\"marca\" x=\"48\" y=\"241\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">1</text><text class=\"marca\" x=\"48\" y=\"166\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">2</text><text class=\"marca\" x=\"48\" y=\"91\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">3</text><text class=\"marca\" x=\"48\" y=\"16\" fill=\"#666666\" font-family=\"Geist Mono, ui-monospace, monospace\" font-size=\"14\" text-anchor=\"end\" dominant-baseline=\"middle\">4</text></svg>";

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

  // Important 1 da revisão: o data-cor acima é um rótulo que o PRÓPRIO CÓDIGO escreveu — confere a
  // intenção, não a tinta de verdade. Aqui a cor esperada vem de uma chamada independente a
  // coresDasSeries (não lida do SVG), e o que se testa é o STROKE pintado no <path> contra
  // tokens.cor — a pintura de fato, não o rótulo que anuncia a pintura.
  const coresEsperadas = coresDasSeries(['treino', 'teste'], 'teste');
  for (const { serie, cor } of coresEsperadas) {
    const grupo = series.find((g) => g.getAttribute('data-serie') === serie);
    assert.equal(grupo.querySelector('path').getAttribute('stroke'), tokens.cor[cor],
      `o stroke pintado de ${serie} bate com tokens.cor.${cor}`);
  }

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
  const [logX0, logX1] = cxDe(desenhista.desenharSvg({ ...base, escalas: { x: 'log' } }, base.dados));
  assert.ok(logX1 - logX0 > linX1 - linX0, 'em log, 1→10 (uma década) ocupa mais espaço que em linear, onde 10 fica perto do início');
});

// Rodada 2: o PRÓPRIO conserto do Critical 1 (toPrecision(4), 4 dígitos significativos fixos)
// resolveu o domínio pequeno e quebrou o simétrico — magnitude grande com variação fina, onde 4
// dígitos não bastam para distinguir 5+ dígitos que diferem só nas últimas casas ([99997..100003]
// virava sete vezes "100000"). Qualquer precisão FIXA tem um regime onde colide; o critério de teste
// é a PROPRIEDADE — marcas de valores distintos nunca colidem no texto —, não a string exata, porque
// o texto exato depende do formatador escolhido (agora escala.tickFormat, que deriva do passo real).
// "" não conta como colisão: é a marca menor da escala log, sem rótulo por desenho do d3 (não afirma
// nada de errado, ao contrário de duas marcas DIFERENTES mostrando o mesmo número).
function marcasSemColisao(escala, contagem = 5) {
  const valores = escala.ticks(contagem);
  const formatar = escala.tickFormat(contagem);
  const textos = valores.map(formatar).filter((texto) => texto !== '');
  return new Set(textos).size === textos.length;
}

// Regravado pela Tarefa 3 (gráfico com reta e limites redondos): a escalaY de "linha" agora passa por
// .nice(), e a folga que .nice() dá ao domínio [0,0001; 0,0016] o arredonda para [0; 0,0016] — o passo
// que .ticks(5) escolhe no domínio niced é mais grosso (0,0005 em vez de 0,0002), e o eixo sai com 4
// marcas em vez de 8. A propriedade que o Critical 1 original defendia — marcas de valores diferentes
// nunca colidem no texto — continua valendo (é o que a asserção de tamanho do Set confere); só o
// NÚMERO de marcas mudou, porque agora vem do domínio niced, não mais do domínio cru dos dados. "0,0000"
// aqui é o extremo verdadeiro do domínio niced, não o artefato de precisão fixa que o Critical 1
// original corrigia (aquele colapsava valores DIFERENTES no mesmo texto "0"; aqui não há dois valores
// que colidam nele).
test('marcas de eixo (linha, ponta a ponta): domínio pequeno não perde resolução — Critical 1 original (sob .nice(), Tarefa 3)', () => {
  const especificacao = { tipo: 'linha', x: 'epoca', y: ['erro'], eixos: { x: 'epoca', y: 'erro' } };
  const colunas = { epoca: [0, 1, 2, 3, 4, 5, 6, 7], erro: [0.0001, 0.0003, 0.0005, 0.0007, 0.0009, 0.0011, 0.0013, 0.0016] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const textos = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'end').map((t) => t.textContent);
  assert.deepEqual(textos, ['0,0000', '0,0005', '0,0010', '0,0015']);
  assert.equal(new Set(textos).size, textos.length, 'as marcas são distintas entre si — a propriedade que o Critical 1 defendia');
});

test('marcas de eixo (linha, ponta a ponta): magnitude grande com variação fina não colide — regressão do próprio conserto do Critical 1, achada na re-revisão', () => {
  const especificacao = { tipo: 'linha', x: 'indice', y: ['grandeza'], eixos: { x: 'indice', y: 'grandeza' } };
  const colunas = { indice: [0, 1, 2, 3, 4, 5, 6], grandeza: [99997, 99998, 99999, 100000, 100001, 100002, 100003] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const textos = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'end').map((t) => t.textContent);
  assert.equal(textos.length, 7);
  assert.equal(new Set(textos).size, 7, 'as 7 marcas são distintas — antes deste conserto, toPrecision(4) dava "100.000" repetido 7 vezes');
});

test('marcas de eixo: nenhuma colide, varrendo os limiares medidos pela re-revisão e os domínios já usados nos exemplos existentes', () => {
  const dominios = [
    [0.0001, 0.0016], [99997, 100003], // os dois regimes desta rodada
    [100, 106], [1000, 1006], [9000, 9006], [9999, 10005], [10000, 10006], [50000, 50006], [99999, 100005], // limiares medidos (passo fixo 1)
    [0.25, 1.1], [0, 4], // exemplo já existente da spec 7.2 — não pode regredir
  ];
  for (const dominio of dominios) {
    const escala = scaleLinear().domain(dominio).range([0, 100]);
    assert.ok(marcasSemColisao(escala), `domínio ${JSON.stringify(dominio)} não deveria colidir`);
  }
});

test('marcas de eixo: escala log também não colide (marcas menores ficam "" por desenho do d3 — filtradas antes de comparar)', () => {
  for (const dominio of [[1, 100], [1, 1000], [0.001, 1]]) {
    const escala = scaleLog().domain(dominio).range([0, 100]);
    assert.ok(marcasSemColisao(escala), `domínio log ${JSON.stringify(dominio)} não deveria colidir`);
  }
});

test('histograma: bordas de classe (formatarPasso, não tickFormat — não são .ticks()) também não colidem nos dois regimes', () => {
  const casos = [
    { classes: 5, erro: [0.0001, 0.0004, 0.0007, 0.001, 0.0013, 0.0016] }, // domínio pequeno
    { classes: 6, erro: [99997, 99998, 99999, 100000, 100001, 100002, 100003] }, // magnitude grande, passo fino
  ];
  for (const { classes, erro } of casos) {
    const svg = svgDe(desenhista.desenharSvg({ tipo: 'histograma', x: 'erro', classes, eixos: {} }, { erro }));
    const textos = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'middle').map((t) => t.textContent);
    assert.equal(textos.length, classes + 1, `${classes + 1} bordas de classe`);
    assert.equal(new Set(textos).size, classes + 1, `bordas de classe (domínio ${JSON.stringify(erro)}) não deveriam colidir`);
  }
});

// Rodada 3: tickFormat do d3 escreve no padrão dos EUA (vírgula de milhar, ponto decimal) — achado
// na própria medição da rodada 2 ("99,997" para o domínio [99997,100003], que em português lê como
// noventa e nove vírgula novecentos e noventa e sete, não um milhar). paraPtBr troca os dois
// separadores ao mesmo tempo (não em sequência); os testes abaixo conferem o CARÁTER certo em cada
// posição, não só a ausência de colisão — colisão e separador errado são defeitos independentes: o
// domínio [99997,100003] já não colidia com vírgula de milhar, e mesmo assim estava errado para o
// público do sistema.
// Regravado pela Tarefa 3, mesmo motivo do teste acima: .nice() no domínio de y arredonda [0,0001;
// 0,0016] para [0; 0,0016] e muda o passo de .ticks(5) para 0,0005 — 4 marcas em vez de 8. O que este
// teste prova (separador certo em pt-BR) não muda; só a lista exata das marcas.
test('marcas de eixo em pt-BR: domínio pequeno usa vírgula decimal (não ponto), sem perder distinção — Critical 1 revisitado (sob .nice(), Tarefa 3)', () => {
  const especificacao = { tipo: 'linha', x: 'x', y: ['y'], eixos: {} };
  const colunas = { x: [0, 1, 2, 3, 4, 5, 6, 7], y: [0.0001, 0.0003, 0.0005, 0.0007, 0.0009, 0.0011, 0.0013, 0.0016] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const textos = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'end').map((t) => t.textContent);
  assert.equal(textos.length, 4);
  assert.equal(new Set(textos).size, 4, 'continuam distintas');
  assert.ok(textos.every((t) => t.includes(',')), 'todo decimal usa vírgula');
  assert.ok(textos.every((t) => !t.includes('.')), 'nenhum ponto — não é separador de milhar nem decimal em pt-BR aqui');
  assert.deepEqual(textos, ['0,0000', '0,0005', '0,0010', '0,0015']);
});

test('marcas de eixo em pt-BR: magnitude grande usa ponto de milhar (não vírgula) — regressão da rodada 2, achado da rodada 3 na mesma medição', () => {
  const especificacao = { tipo: 'linha', x: 'x', y: ['y'], eixos: {} };
  const colunas = { x: [0, 1, 2, 3, 4, 5, 6], y: [99997, 99998, 99999, 100000, 100001, 100002, 100003] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const textos = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'end').map((t) => t.textContent);
  assert.equal(textos.length, 7);
  assert.equal(new Set(textos).size, 7, 'continuam distintas');
  assert.ok(textos.every((t) => t.includes('.')), 'todo milhar usa ponto');
  assert.ok(textos.every((t) => !t.includes(',')), 'nenhuma vírgula — não há decimal aqui, e vírgula de milhar seria o padrão dos EUA');
  assert.deepEqual(textos, ['99.997', '99.998', '99.999', '100.000', '100.001', '100.002', '100.003']);
});

test('marcas de eixo em pt-BR: milhar e decimal juntos não trocam de lugar — a troca é simultânea, não sequencial', () => {
  const especificacao = { tipo: 'linha', x: 'x', y: ['y'], eixos: {} };
  const colunas = { x: [0, 1], y: [1234.5, 1237.25] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const textos = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'end').map((t) => t.textContent);
  assert.ok(textos.length > 0);
  assert.equal(new Set(textos).size, textos.length, 'continuam distintas');
  for (const texto of textos) {
    // "1.234,5": ponto (milhar) vem antes da vírgula (decimal) — se a troca fosse sequencial em vez
    // de simultânea, uma das duas reverteria a outra e o padrão sairia invertido ou incompleto.
    assert.match(texto, /^\d{1,3}\.\d{3},\d+$/, `"${texto}" devia ter a forma milhar.milhar,decimal`);
  }
  assert.ok(textos.includes('1.235,0') || textos.includes('1.236,0'), 'pelo menos uma marca intermediária "redonda" no formato esperado');
});

test('histograma em pt-BR: bordas de classe usam o mesmo separador que os ticks (mesma fonte, formatarPasso -> paraPtBr)', () => {
  const svgPequeno = svgDe(desenhista.desenharSvg({ tipo: 'histograma', x: 'erro', classes: 5, eixos: {} }, { erro: [0.0001, 0.0004, 0.0007, 0.001, 0.0013, 0.0016] }));
  const textosPequeno = [...svgPequeno.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'middle').map((t) => t.textContent);
  assert.ok(textosPequeno.every((t) => t.includes(',') && !t.includes('.')), 'domínio pequeno: vírgula decimal, sem ponto');

  const svgGrande = svgDe(desenhista.desenharSvg({ tipo: 'histograma', x: 'erro', classes: 6, eixos: {} }, { erro: [99997, 99998, 99999, 100000, 100001, 100002, 100003] }));
  const textosGrande = [...svgGrande.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'middle').map((t) => t.textContent);
  assert.deepEqual(textosGrande, ['99.997', '99.998', '99.999', '100.000', '100.001', '100.002', '100.003'], 'ponto de milhar, igual ao eixo de ticks — antes deste conserto saía sem separador nenhum ("99997"), porque toFixed não agrupa e só paraPtBr não bastava sem agruparMilhar');
});

test('escala log com 0 (ou negativo) no domínio lança, em vez de desenhar NaN calado — Important 2 da revisão, medido com o exemplo literal da spec 7.2 (epoca começa em 0)', () => {
  const especificacao = {
    tipo: 'linha', x: 'epoca', y: ['treino', 'teste'], foco: 'teste', eixos: { x: 'época', y: 'erro' }, escalas: { x: 'log' },
    dados: { epoca: [0, 1, 2, 3, 4], treino: [1.0, 0.6, 0.4, 0.3, 0.25], teste: [1.1, 0.7, 0.55, 0.5, 0.48] },
  };
  assert.throws(
    () => desenhista.desenharSvg(especificacao, especificacao.dados),
    /escala log exige valores maiores que zero no domínio; recebido \[0, 4\]/,
  );
});

test('escala log com domínio inteiramente positivo continua funcionando normalmente', () => {
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['y'], eixos: {}, escalas: { x: 'log' }, dados: { x: [1, 10, 100], y: [1, 10, 100] } };
  assert.doesNotThrow(() => desenhista.desenharSvg(especificacao, especificacao.dados));
});

// CASO RESIDUAL, medido a pedido do coordenador (revisão do PDF): em escala log, `criarEscala` NÃO
// soma folga aditiva (comentário de `folga` acima) — só `.nice()`, que em log arredonda para a década
// mais próxima (1, 10, 100, …). Quando o domínio bruto já cai exatamente numa década dos dois lados —
// como aqui, x de 1 a 100 —, `.nice()` não tem o que arredondar, e o ponto no extremo (x=1) cai
// exatamente sobre a linha do eixo y. Diferente do caso linear (onde a folga aditiva sempre abre
// alguma distância antes do `.nice()` entrar), não há folga alguma no lado log a evitar isto: uma
// folga MULTIPLICATIVA (percentual do próprio valor, não da amplitude linear) resolveria, mas está
// fora do escopo desta tarefa — decisão do coordenador foi "sem folga aditiva; só nice()" para log, e
// este teste registra o que sobra dessa decisão, em vez de fingir que o caso está coberto.
test('CASO RESIDUAL: em escala log, um domínio já na década (x de 1 a 100) ainda encosta o ponto extremo no eixo y — sem folga aditiva em log, só .nice()', () => {
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['y'], eixos: {}, escalas: { x: 'log' } };
  const colunas = { x: [1, 10, 100], y: [5, 6, 7] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const eixoY = svg.querySelector('.eixo-y');
  const circulos = [...svg.querySelectorAll('circle')];
  const primeiroCx = circulos[0].getAttribute('cx');
  assert.equal(primeiroCx, eixoY.getAttribute('x1'), 'o ponto x=1 cai exatamente sobre a linha do eixo y — caso residual, não corrigido nesta tarefa');
});

test('barras: três séries na cor certa; as marcas do eixo x são as categorias, não números', () => {
  const especificacao = { tipo: 'barras', x: 'grupo', y: ['a', 'b', 'c'], foco: 'b', eixos: { x: 'grupo', y: 'valor' } };
  const colunas = { grupo: ['x', 'y', 'z'], a: [3, 5, 2], b: [4, 2, 6], c: [1, 3, 4] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const series = [...svg.querySelectorAll('.serie')];
  assert.deepEqual(series.map((g) => g.getAttribute('data-cor')), ['tinta', 'azul', 'cinza']);
  assert.equal(series.every((g) => g.querySelectorAll('rect').length === 3), true, 'uma barra por categoria em cada série');

  // a série cinza (tracejada) é a única sem fill sólido — dasharray não é visível num fill.
  // Important 1 da revisão: as três séries têm o fill conferido contra tokens.cor — não só o
  // data-cor acima, que é um rótulo que o próprio código escreveu e não prova a tinta de fato.
  const [tintaSerie, azulSerie, cinzaSerie] = series;
  assert.ok([...tintaSerie.querySelectorAll('rect')].every((r) => r.getAttribute('fill') === tokens.cor.tinta));
  assert.ok([...azulSerie.querySelectorAll('rect')].every((r) => r.getAttribute('fill') === tokens.cor.azul), 'a série em foco pinta o fill azul de fato');
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

test('dispersao: a série cinza tracejada vira marcador vazado (contorno), e a azul pinta o círculo de fato — Important 1 da revisão', () => {
  // sem foco, com 3 séries: a última (c) é o foco (azul); a e b ficam tinta e cinza tracejada, nessa ordem
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['a', 'b', 'c'], eixos: {} };
  const colunas = { x: [0, 1], a: [0, 1], b: [0, 1], c: [0, 1] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const serieCinza = [...svg.querySelectorAll('.serie')].find((g) => g.getAttribute('data-cor') === 'cinza');
  assert.equal(serieCinza.getAttribute('data-serie'), 'b');
  const circulos = [...serieCinza.querySelectorAll('circle')];
  assert.ok(circulos.length > 0);
  assert.ok(circulos.every((c) => c.getAttribute('fill') === 'none' && c.getAttribute('stroke') === tokens.cor.cinza));

  // antes desta rodada, nenhum teste de dispersão conferia o fill da série azul contra tokens.cor —
  // só o data-cor, que o próprio código escreve e não prova a tinta de fato.
  const serieAzul = [...svg.querySelectorAll('.serie')].find((g) => g.getAttribute('data-cor') === 'azul');
  assert.equal(serieAzul.getAttribute('data-serie'), 'c');
  assert.ok([...serieAzul.querySelectorAll('circle')].every((c) => c.getAttribute('fill') === tokens.cor.azul), 'a série em foco pinta o fill azul de fato');
});

// Tarefa 1 do brief: `linhas` (campo novo, só em "dispersao") desenha a série citada como caminho
// contínuo — o MESMO gerador que "linha" usa (d3-shape line, ESPESSURA_EIXO, tracejado se a série for
// a tracejada), na cor da própria série — em vez de círculos. As demais séries de `y` continuam
// pontos. dados e valores aqui são os da aula-exemplo (exemplos/regressao-linear/index.html#dispersao).
test('dispersao: uma série em "linhas" vira path com o stroke da cor dela; as outras continuam circle', () => {
  const especificacao = {
    tipo: 'dispersao', x: 'horas', y: ['nota', 'reta'], foco: 'reta', linhas: ['reta'], eixos: {},
  };
  const colunas = { horas: [1, 2, 3, 4, 5], nota: [3.2, 4.1, 4.3, 5.4, 5.2], reta: [3.37, 3.9, 4.43, 4.96, 5.49] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const serieNota = [...svg.querySelectorAll('.serie')].find((g) => g.getAttribute('data-serie') === 'nota');
  const serieReta = [...svg.querySelectorAll('.serie')].find((g) => g.getAttribute('data-serie') === 'reta');
  assert.equal(serieNota.querySelectorAll('circle').length, 5, '"nota" não está em linhas: continua ponto por ponto');
  assert.equal(serieNota.querySelector('path'), null, '"nota" não vira path');
  assert.equal(serieReta.querySelectorAll('circle').length, 0, '"reta" está em linhas: nenhum círculo');
  const caminho = serieReta.querySelector('path');
  assert.ok(caminho, '"reta" desenha um path, como uma série de "linha"');
  assert.equal(caminho.getAttribute('stroke'), tokens.cor.azul, 'reta é o foco: o path pinta a cor DA SÉRIE (azul), não uma cor fixa de "linha"');
  assert.equal(caminho.getAttribute('stroke-width'), String(tokens.regua.normal));
  assert.equal(caminho.getAttribute('fill'), 'none');
});

test('dispersao: "linhas" com a série tracejada (cinza) sai tracejada no path também, do jeito que sairia contornada em círculo', () => {
  // sem foco, 3 séries: a última (c) é foco (azul); a (tinta) e b (cinza tracejada) — mesma regra de coresDasSeries
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['a', 'b', 'c'], linhas: ['b'], eixos: {} };
  const colunas = { x: [0, 1], a: [0, 1], b: [0, 1], c: [0, 1] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const serieB = [...svg.querySelectorAll('.serie')].find((g) => g.getAttribute('data-serie') === 'b');
  const caminho = serieB.querySelector('path');
  assert.ok(caminho, '"b" está em linhas: vira path');
  assert.equal(caminho.getAttribute('stroke'), tokens.cor.cinza);
  assert.equal(caminho.getAttribute('stroke-dasharray'), '6 4', 'a série cinza tracejada mantém o tracejado no path, como manteria o contorno vazado no círculo');
});

test('dispersao sem "linhas": nenhum path — um circle por ponto, como antes desta tarefa (só o domínio de y/x muda, pelo nice da Tarefa 3)', () => {
  const especificacao = { tipo: 'dispersao', x: 'x', y: ['a'], eixos: {}, dados: { x: [0, 1, 2], a: [1, 2, 3] } };
  const svg = svgDe(desenhista.desenharSvg(especificacao, especificacao.dados));
  const serie = svg.querySelector('.serie');
  assert.equal(serie.querySelectorAll('circle').length, 3);
  assert.equal(serie.querySelector('path'), null);
});

// Tarefa 3 do brief, ACHADO DO PDF RENDERIZADO (revisão do coordenador, página 4 da aula-exemplo): o
// primeiro teste desta tarefa media só y/cy, e ficou verde com o ponto (1; 3,2) em cima do eixo Y —
// porque o x da aula (horas: 1 a 10) já é um domínio "redondo" (múltiplos de 1), e .nice() sozinho não
// abre folga nenhuma quando não há nada para arredondar. A correção: os dois eixos de "dispersao"
// ganham FOLGA_DOMINIO (5% aditivo) ANTES do .nice(). Medido com os dados de verdade da aula-exemplo
// (exemplos/regressao-linear/index.html#dispersao — horas de 1 a 10, nota de 3,2 a 8,6): x com folga
// [0,55; 10,45] arredonda para [0; 11]; y com folga [2,93; 8,87] arredonda para [2,5; 9]. A asserção
// compara cx/cy com a posição (x1/y1) dos próprios eixos desenhados, em vez de reimplementar a conta
// da escala — é a MESMA fonte que o SVG usa.
test('dispersao: folga + nice() dá folga aos DOIS eixos (dados da aula, horas de 1 a 10 e notas de 3,2 a 8,6) — nenhum cx cai sobre o eixo y, nenhum cy cai sobre o eixo x', () => {
  const especificacao = { tipo: 'dispersao', x: 'horas', y: ['nota'], eixos: { x: 'horas de estudo', y: 'nota' } };
  const colunas = { horas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], nota: [3.2, 4.1, 4.3, 5.4, 5.2, 6.3, 6.1, 7.2, 7.1, 8.6] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const eixoX = svg.querySelector('.eixo-x');
  const eixoY = svg.querySelector('.eixo-y');
  const circulos = [...svg.querySelectorAll('circle')];
  assert.ok(circulos.length > 0);
  for (const circulo of circulos) {
    assert.notEqual(circulo.getAttribute('cy'), eixoX.getAttribute('y1'), 'nenhum ponto cai sobre a linha do eixo x (a menor nota, 3,2, não é mais o mínimo do domínio de y)');
    assert.notEqual(circulo.getAttribute('cx'), eixoY.getAttribute('x1'), 'nenhum ponto cai sobre a linha do eixo y (a menor hora, 1, não é mais o mínimo do domínio de x)');
  }
  // o ponto de maior nota (8,6) e o de maior hora (10) também ganham folga para o lado oposto: não
  // encostam no topo/direita da área útil (a mesma margem que AREA.y0/AREA.x1 usam — desenharEixos não
  // desenha essas duas bordas, então comparamos com o outro extremo dos próprios eixos desenhados:
  // y2/x2 da linha eixo-y vai até AREA.y0, o topo; x2 da linha eixo-x vai até AREA.x1, a direita).
  const topoDaArea = Number(eixoY.getAttribute('y1'));
  const direitaDaArea = Number(eixoX.getAttribute('x2'));
  const cyMinimo = Math.min(...circulos.map((c) => Number(c.getAttribute('cy'))));
  const cxMaximo = Math.max(...circulos.map((c) => Number(c.getAttribute('cx'))));
  assert.ok(cyMinimo > topoDaArea, 'o ponto mais alto (menor cy) fica abaixo do topo da área — folga também no máximo do domínio de y');
  assert.ok(cxMaximo < direitaDaArea, 'o ponto mais à direita (maior cx) fica antes da borda direita da área — folga também no máximo do domínio de x');
});

// Domínios medidos (achado do PDF, ver o teste acima): sem folga aditiva, .nice() sozinho reproduz o
// domínio BRUTO de x sem mexer em nada — scaleLinear().domain([1,10]).nice() continua [1, 10], porque
// os dois extremos já caem em marcas redondas — e é exatamente esse silêncio que o achado do
// coordenador expôs. Com FOLGA_DOMINIO (5%) somada ANTES do .nice(): x=[1,10] com folga vira
// [0,55; 10,45], niced para [0, 11]; y=[3,2; 8,6] com folga vira [2,93; 8,87], niced para [2,5; 9].
// Este teste fixa os dois domínios medidos, para uma futura mudança em FOLGA_DOMINIO ou em qual eixo
// recebe folga cair aqui primeiro.
test('dispersao: os domínios medidos com os dados da aula são x=[0,11] e y=[2,5;9] — grade e marcas batem com eles', () => {
  const especificacao = { tipo: 'dispersao', x: 'horas', y: ['nota'], eixos: { x: 'horas de estudo', y: 'nota' } };
  const colunas = { horas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], nota: [3.2, 4.1, 4.3, 5.4, 5.2, 6.3, 6.1, 7.2, 7.1, 8.6] };
  const svg = svgDe(desenhista.desenharSvg(especificacao, colunas));
  const marcasX = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'middle').map((t) => t.textContent);
  const marcasY = [...svg.querySelectorAll('.marca')].filter((t) => t.getAttribute('text-anchor') === 'end').map((t) => t.textContent);
  assert.deepEqual(marcasX, ['0', '2', '4', '6', '8', '10'], 'x niced com folga: domínio [0, 11], .ticks(5) escolhe passo 2');
  assert.deepEqual(marcasY, ['3', '4', '5', '6', '7', '8', '9'], 'y niced com folga: domínio [2,5; 9], .ticks(5) escolhe passo 1 (as marcas ficam dentro do domínio, não em 2,5)');
});

test('histograma: 4 classes de largura igual, contagem certa (4, 2, 0, 2 — conferido à mão), com rótulo na ponta (decisão do coordenador, reverte a exceção da Tarefa 2)', () => {
  const especificacao = { tipo: 'histograma', x: 'erro', classes: 4, eixos: { x: 'erro', y: 'contagem' } };
  const colunas = { erro: [0.1, 0.2, 0.2, 0.5, 0.9, 0.95, 0.3, 0.4] };
  // largura de classe = (0.95-0.1)/4 = 0.2125 → classes [0.1,0.3125) [0.3125,0.525) [0.525,0.7375) [0.7375,0.95]
  // 0.1,0.2,0.2,0.3 caem na 1ª (4); 0.4,0.5 na 2ª (2); nenhum na 3ª (0); 0.9,0.95 na 4ª (2, 0.95 no limite superior cai na última classe)
  const svg = desenhista.desenharSvg(especificacao, colunas);
  assert.equal(svg, SNAPSHOT_HISTOGRAMA);
  const parsed = svgDe(svg);
  assert.equal(parsed.querySelectorAll('.serie').length, 1, 'uma distribuição, uma série');
  assert.equal(parsed.querySelector('.serie').getAttribute('data-cor'), 'tinta');
  const alturas = [...parsed.querySelectorAll('.serie rect')].map((r) => Number(r.getAttribute('height')));
  assert.deepEqual(alturas, [300, 150, 0, 150], 'proporcional às contagens 4, 2, 0, 2 (a maior, 4, vira a altura útil inteira)');
  // rótulo na ponta: nomeia a grandeza plotada (o nome da coluna, "erro"), na última classe, tinta
  const rotulo = parsed.querySelector('.serie-rotulo');
  assert.equal(rotulo.textContent, 'erro');
  assert.equal(rotulo.getAttribute('fill'), tokens.cor.tinta);
  const ultimaClasse = [...parsed.querySelectorAll('.serie rect')].at(-1);
  const direitaDaUltimaClasse = Number(ultimaClasse.getAttribute('x')) + Number(ultimaClasse.getAttribute('width'));
  assert.ok(Number(rotulo.getAttribute('x')) > direitaDaUltimaClasse, 'o rótulo fica à direita da última classe — "na ponta"');
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
// Tarefa 4: o título dizia "troca" — script.after() nunca trocou nada, só acrescentou um irmão, e a
// própria asserção da linha 438 (abaixo) já provava isso. Corrigido junto com o comentário de
// desenharGraficos (componentes/graficos.js) que fazia a mesma afirmação.
test('desenharGraficos acrescenta um SVG ao lado do script de figure.grafico (não troca) e preserva a figcaption', () => {
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
  // C2 da revisão final da 2a, e a pendência 1: desde que o runtime busca o CSV, "não foi lido" quer
  // dizer caminho errado ou página sem servidor de arquivos, e a mensagem diz as duas coisas ao autor.
  assert.match(erros[0].mensagem, /o CSV "data\/nao-existe\.csv" não foi lido: confira o caminho, relativo ao arquivo da aula; sem servidor de arquivos \(arquivo local, artifact\), ponha as colunas inline em "dados"/);
  const figuras = [...raiz.querySelectorAll('figure.grafico')];
  assert.equal(figuras[0].querySelector('svg'), null, 'a figura sem dados fica sem SVG — não some, não quebra');
  assert.notEqual(figuras[1].querySelector('svg'), null, 'a figura seguinte, com dados inline, desenha normalmente');
});

// I4 da revisão final da 2a: coluna ausente saía como a mensagem crua de uma função interna
// ("Cannot read properties of undefined (reading '0')", "values is not iterable"), e `dados` ausente
// como 'dados não encontrados para "undefined"'. Vale também para o CSV, que só se tem depois de
// buscado e que por isso recursos.grafico (estática) não confere.
test('desenharGraficos diz qual coluna falta, e que falta o campo "dados", em português', () => {
  const casos = [
    [{ tipo: 'linha', dados: { x: [0, 1], a: [0, 1] }, x: 'x', y: ['nada'] }, {}, 'os dados do gráfico não têm a coluna "nada"'],
    [{ tipo: 'linha', dados: { x: [0, 1], a: [0, 1] }, x: 'nada', y: ['a', 'outra'] }, {}, 'os dados do gráfico não têm as colunas "nada", "outra"'],
    [{ tipo: 'linha', dados: 'd.csv', x: 'x', y: ['nada'] }, { 'd.csv': { x: [0, 1], a: [0, 1] } }, 'os dados do gráfico não têm a coluna "nada"'],
    [{ tipo: 'linha', x: 'x', y: ['a'] }, {}, 'gráfico sem o campo "dados"'],
  ];
  for (const [especificacao, dados, mensagem] of casos) {
    const raiz = corpo(`<figure class="grafico"><script type="application/json">${JSON.stringify(especificacao)}</script></figure>`);
    assert.deepEqual(desenharGraficos(raiz, { desenhista, dados }).map((erro) => erro.mensagem), [mensagem]);
  }
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
