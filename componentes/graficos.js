// Gráficos (spec 7.2): a especificação em JSON de figure.grafico vira SVG. O d3 chega por parâmetro,
// para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.
import { tokens } from '../tokens/tokens.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const { tinta, azul, cinza, linha: corDaGrade, amarelo } = tokens.cor;
const HEX_DA_COR = { tinta, azul, cinza, amarelo };
const FAMILIA = tokens.fonte.mono.join(', ');
const TAMANHO_TEXTO = tokens.minimo.rotulo; // 14 — spec 7.2: "marcas e rótulos em Geist Mono 14"
const ESPESSURA_EIXO = tokens.regua.normal; // 2 — spec 7.2: "Eixos em tinta de 2 px"
const COMPRIMENTO_TRACO = 16; // spec 7.2: "traço de 16 px na cor da série"
const TRACEJADO = '6 4'; // stroke-dasharray da série cinza e do seu traço na ponta

// viewBox interno do gráfico; a figura escala por CSS (max-width:100%, height:auto —
// estilos/componentes.css, ".area figure > :is(img, svg)"), então o valor absoluto não é o que a
// spec fixa — só a proporção e a folga para o rótulo na ponta (Passo 3) precisam ser razoáveis.
const LARGURA = 640;
const ALTURA = 360;
const MARGEM = { topo: 16, direita: 148, base: 44, esquerda: 56 };
const AREA = { x0: MARGEM.esquerda, x1: LARGURA - MARGEM.direita, y0: MARGEM.topo, y1: ALTURA - MARGEM.base };

// Cores das séries (spec 7.2): uma série sai em tinta. Duas ou três: a de foco (campo `foco`; na
// falta dele, a ÚLTIMA de `y`) sai em azul, e as demais em tinta e em cinza tracejada, NESSA ORDEM.
// O validador (recursos.grafico) é quem recusa um `foco` que não está em `y`; aqui a entrada já veio
// conferida, e o ?? só cobre a ausência, que é legítima.
export function coresDasSeries(y, foco) {
  if (y.length === 1) return [{ serie: y[0], cor: 'tinta', tracejada: false }];
  const emFoco = foco ?? y.at(-1);
  const sobra = [{ cor: 'tinta', tracejada: false }, { cor: 'cinza', tracejada: true }];
  return y.map((serie) => (serie === emFoco
    ? { serie, cor: 'azul', tracejada: false }
    : { serie, ...sobra.shift() }));
}

// Arredonda para casas decimais fixas: o "d" de um path e as coordenadas de forma/texto saem sempre
// com a mesma precisão, nos dois modos (navegador e build) — é o que a Tarefa 6 precisa para o
// gráfico sair byte a byte igual na comparação visual (ruído de ponto flutuante é a suspeita nº1
// citada no plano para uma diferença entre os dois modos).
function arredondar(valor, casas = 2) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function escaparXml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Só o suficiente para uma marca de eixo: inteiro sem casas, fracionário com até 2, sem zero à direita.
function formatarNumero(valor) {
  return String(arredondar(valor, 2));
}

// Serializa um elemento SVG como string (nunca autofechado: quem insere no DOM lê isto pelo parser de
// HTML, via innerHTML — a mesma técnica de componentes/tex.js para o HTML do KaTeX —, e o parser de
// HTML reconhece <svg>, entra em "foreign content" e monta os nós no namespace certo sozinho).
// Todo atributo passa por escaparXml: nome de série e categoria vêm do JSON/CSV do autor, e um valor
// com aspas não pode fechar o atributo cedo e vazar marcação para dentro do SVG.
function elemento(nome, atributos = {}, conteudo = '') {
  const atrs = Object.entries(atributos)
    .filter(([, valor]) => valor !== undefined && valor !== null)
    .map(([chave, valor]) => ` ${chave}="${escaparXml(valor)}"`)
    .join('');
  return `<${nome}${atrs}>${conteudo}</${nome}>`;
}

// Preenchimento de uma forma fechada (barra ou classe de histograma) pela cor da série: sólido, ou —
// para a série tracejada, que não tem "traço" próprio fora de uma linha — contorno tracejado sem
// preenchimento. É a extensão de "cinza tracejada" (pensada para stroke de linha, spec 7.2) para uma
// forma com fill; a linha e a dispersão usam stroke de verdade e não precisam desta escolha.
function preenchimentoDaSerie(cor, tracejada) {
  return tracejada
    ? { fill: 'none', stroke: HEX_DA_COR[cor], 'stroke-width': ESPESSURA_EIXO, 'stroke-dasharray': TRACEJADO }
    : { fill: HEX_DA_COR[cor] };
}

function criarEscala({ escalaLinear, escalaLog }, tipoDeEscala, dominio, alcance) {
  const fabrica = tipoDeEscala === 'log' ? escalaLog : escalaLinear;
  return fabrica().domain(dominio).range(alcance);
}

function desenharGrade(escalaY) {
  return escalaY.ticks(5).map((valor) => elemento('line', {
    class: 'grade', x1: arredondar(AREA.x0), x2: arredondar(AREA.x1),
    y1: arredondar(escalaY(valor)), y2: arredondar(escalaY(valor)),
    stroke: corDaGrade, 'stroke-width': 1,
  })).join('');
}

// Eixos em tinta de 2 px (spec 7.2); marcas e rótulos — os números do eixo numérico ou as categorias
// do eixo de barras, e o título opcional de cada eixo em `eixos` — em Geist Mono 14 cinza.
function desenharEixos({ tituloX, tituloY }) {
  const eixoX = elemento('line', {
    class: 'eixo eixo-x', x1: arredondar(AREA.x0), y1: arredondar(AREA.y1), x2: arredondar(AREA.x1), y2: arredondar(AREA.y1),
    stroke: tinta, 'stroke-width': ESPESSURA_EIXO,
  });
  const eixoY = elemento('line', {
    class: 'eixo eixo-y', x1: arredondar(AREA.x0), y1: arredondar(AREA.y0), x2: arredondar(AREA.x0), y2: arredondar(AREA.y1),
    stroke: tinta, 'stroke-width': ESPESSURA_EIXO,
  });
  const meioX = arredondar((AREA.x0 + AREA.x1) / 2);
  const meioY = arredondar((AREA.y0 + AREA.y1) / 2);
  const rotuloX = tituloX ? elemento('text', {
    class: 'eixo-titulo', x: meioX, y: arredondar(ALTURA - 6),
    fill: cinza, 'font-family': FAMILIA, 'font-size': TAMANHO_TEXTO, 'text-anchor': 'middle',
  }, escaparXml(tituloX)) : '';
  const rotuloY = tituloY ? elemento('text', {
    class: 'eixo-titulo', x: 14, y: meioY,
    fill: cinza, 'font-family': FAMILIA, 'font-size': TAMANHO_TEXTO, 'text-anchor': 'middle',
    transform: `rotate(-90 14 ${meioY})`,
  }, escaparXml(tituloY)) : '';
  return eixoX + eixoY + rotuloX + rotuloY;
}

function desenharMarcasEixoY(escalaY) {
  return escalaY.ticks(5).map((valor) => elemento('text', {
    class: 'marca', x: arredondar(AREA.x0 - 8), y: arredondar(escalaY(valor)),
    fill: cinza, 'font-family': FAMILIA, 'font-size': TAMANHO_TEXTO, 'text-anchor': 'end', 'dominant-baseline': 'middle',
  }, formatarNumero(valor))).join('');
}

// marcas: pares [posicaoNoDominio, texto] — números formatados num eixo contínuo, ou as categorias
// literais no eixo de barras (posicaoNoDominio já no domínio da escala de índice, ver montarBarras).
function desenharMarcasEixoX(marcas, escalaX) {
  return marcas.map(([posicao, texto]) => elemento('text', {
    class: 'marca', x: arredondar(escalaX(posicao)), y: arredondar(AREA.y1 + 20),
    fill: cinza, 'font-family': FAMILIA, 'font-size': TAMANHO_TEXTO, 'text-anchor': 'middle',
  }, escaparXml(texto))).join('');
}

// Faixas em amarelo, atrás das séries, com rótulo em tinta (spec 7.2). "Atrás" é ordem de nó: quem
// monta (montarLinha, montarDispersao) concatena isto ANTES das séries, e o SVG pinta cada nó por
// cima do anterior.
function desenharFaixas(faixas, escalaX) {
  if (!faixas?.length) return '';
  return faixas.map(({ x: [inicio, fim], rotulo }) => {
    const x0 = arredondar(escalaX(inicio));
    const x1 = arredondar(escalaX(fim));
    const retangulo = elemento('rect', {
      x: Math.min(x0, x1), y: arredondar(AREA.y0), width: arredondar(Math.abs(x1 - x0)), height: arredondar(AREA.y1 - AREA.y0),
      fill: amarelo,
    });
    const texto = rotulo ? elemento('text', {
      x: arredondar((x0 + x1) / 2), y: arredondar(AREA.y0 + 14),
      fill: tinta, 'font-family': FAMILIA, 'font-size': TAMANHO_TEXTO, 'text-anchor': 'middle',
    }, escaparXml(rotulo)) : '';
    return elemento('g', { class: 'faixa' }, retangulo + texto);
  }).join('');
}

// Rótulo na ponta de uma série (Passo 3): sempre em tinta — texto em azul só vale a partir de 32 px
// (spec 7.2), e este rótulo é 14 —, precedido de um traço de 16 px na cor da própria série. Substitui
// a caixa de legenda: é assim que se sabe qual cor é qual série.
function desenharRotuloDaSerie(ponta, cor, tracejada, texto) {
  const x0 = arredondar(ponta.x + 8);
  const x1 = arredondar(x0 + COMPRIMENTO_TRACO);
  const y = arredondar(ponta.y);
  const traco = elemento('line', {
    class: 'serie-traco', x1: x0, y1: y, x2: x1, y2: y,
    stroke: HEX_DA_COR[cor], 'stroke-width': ESPESSURA_EIXO,
    'stroke-dasharray': tracejada ? TRACEJADO : undefined,
  });
  const rotulo = elemento('text', {
    class: 'serie-rotulo', x: arredondar(x1 + 6), y,
    fill: tinta, 'font-family': FAMILIA, 'font-size': TAMANHO_TEXTO, 'dominant-baseline': 'middle',
  }, escaparXml(texto));
  return traco + rotulo;
}

// tipo "linha" (o exemplo literal da spec 7.2): uma série por coluna de `y`, x comum entre todas.
function montarLinha(biblioteca, especificacao, colunas) {
  const { x: nomeX, y: series, foco, eixos = {}, escala = {}, faixas } = especificacao;
  const valoresX = colunas[nomeX];
  const todosOsY = series.flatMap((nome) => colunas[nome]);
  const escalaX = criarEscala(biblioteca, escala.x, biblioteca.extensao(valoresX), [AREA.x0, AREA.x1]);
  const escalaY = criarEscala(biblioteca, escala.y, biblioteca.extensao(todosOsY), [AREA.y1, AREA.y0]);
  const gerador = biblioteca.linha()
    .x((ponto) => arredondar(escalaX(ponto.x)))
    .y((ponto) => arredondar(escalaY(ponto.y)));

  const grade = desenharGrade(escalaY);
  const faixasSvg = desenharFaixas(faixas, escalaX);
  const seriesSvg = coresDasSeries(series, foco).map(({ serie, cor, tracejada }) => {
    const pontos = valoresX.map((valor, i) => ({ x: valor, y: colunas[serie][i] }));
    const caminho = elemento('path', {
      d: gerador(pontos), fill: 'none', stroke: HEX_DA_COR[cor], 'stroke-width': ESPESSURA_EIXO,
      'stroke-dasharray': tracejada ? TRACEJADO : undefined,
    });
    const ponta = pontos.at(-1);
    const rotulo = desenharRotuloDaSerie({ x: escalaX(ponta.x), y: escalaY(ponta.y) }, cor, tracejada, serie);
    return elemento('g', { class: 'serie', 'data-serie': serie, 'data-cor': cor }, caminho + rotulo);
  }).join('');
  const marcasX = escalaX.ticks(5).map((valor) => [valor, formatarNumero(valor)]);
  const eixosSvg = desenharEixos({ tituloX: eixos.x, tituloY: eixos.y }) + desenharMarcasEixoX(marcasX, escalaX) + desenharMarcasEixoY(escalaY);

  return grade + faixasSvg + seriesSvg + eixosSvg;
}

// tipo "dispersao": os mesmos dados de "linha", em pontos soltos; a série tracejada vira marcador vazado.
function montarDispersao(biblioteca, especificacao, colunas) {
  const { x: nomeX, y: series, foco, eixos = {}, escala = {}, faixas } = especificacao;
  const RAIO = 4;
  const valoresX = colunas[nomeX];
  const todosOsY = series.flatMap((nome) => colunas[nome]);
  const escalaX = criarEscala(biblioteca, escala.x, biblioteca.extensao(valoresX), [AREA.x0, AREA.x1]);
  const escalaY = criarEscala(biblioteca, escala.y, biblioteca.extensao(todosOsY), [AREA.y1, AREA.y0]);

  const grade = desenharGrade(escalaY);
  const faixasSvg = desenharFaixas(faixas, escalaX);
  const seriesSvg = coresDasSeries(series, foco).map(({ serie, cor, tracejada }) => {
    const pontos = valoresX.map((valor, i) => ({ x: valor, y: colunas[serie][i] }));
    const marcadores = pontos.map((ponto) => elemento('circle', {
      cx: arredondar(escalaX(ponto.x)), cy: arredondar(escalaY(ponto.y)), r: RAIO,
      ...(tracejada ? { fill: 'none', stroke: HEX_DA_COR[cor], 'stroke-width': ESPESSURA_EIXO } : { fill: HEX_DA_COR[cor] }),
    })).join('');
    const ponta = pontos.at(-1);
    const rotulo = desenharRotuloDaSerie({ x: escalaX(ponta.x), y: escalaY(ponta.y) }, cor, tracejada, serie);
    return elemento('g', { class: 'serie', 'data-serie': serie, 'data-cor': cor }, marcadores + rotulo);
  }).join('');
  const marcasX = escalaX.ticks(5).map((valor) => [valor, formatarNumero(valor)]);
  const eixosSvg = desenharEixos({ tituloX: eixos.x, tituloY: eixos.y }) + desenharMarcasEixoX(marcasX, escalaX) + desenharMarcasEixoY(escalaY);

  return grade + faixasSvg + seriesSvg + eixosSvg;
}

// tipo "barras": x categórico (as próprias categorias de `x`, sem escala numérica), até 3 séries
// agrupadas por categoria. Posição por índice numa escala linear — não precisa de escala de banda.
function montarBarras(biblioteca, especificacao, colunas) {
  // escala.x não se aplica aqui: o eixo de categoria não tem escolha linear/log, só o de valor (y) tem.
  const { x: nomeX, y: series, foco, eixos = {}, escala = {} } = especificacao;
  const categorias = colunas[nomeX];
  const n = categorias.length;
  const todosOsY = series.flatMap((nome) => colunas[nome]);
  const [minimoY, maximoY] = biblioteca.extensao(todosOsY);
  const escalaY = criarEscala(biblioteca, escala.y, [Math.min(0, minimoY), maximoY], [AREA.y1, AREA.y0]);
  const escalaIndice = biblioteca.escalaLinear().domain([0, n]).range([AREA.x0, AREA.x1]);
  const zero = arredondar(escalaY(0));
  const cores = coresDasSeries(series, foco);
  const larguraGrupo = (AREA.x1 - AREA.x0) / n;
  const larguraBarra = (larguraGrupo * 0.7) / cores.length;

  const grade = desenharGrade(escalaY);
  const seriesSvg = cores.map(({ serie, cor, tracejada }, j) => {
    const barras = categorias.map((_, i) => {
      const valor = colunas[serie][i];
      const x = escalaIndice(i) + larguraGrupo * 0.15 + j * larguraBarra;
      return desenharBarra(escalaY, valor, zero, x, larguraBarra, preenchimentoDaSerie(cor, tracejada));
    }).join('');
    const ultimo = n - 1;
    const x = escalaIndice(ultimo) + larguraGrupo * 0.15 + j * larguraBarra + larguraBarra;
    const ponta = { x, y: Math.min(escalaY(colunas[serie][ultimo]), zero) };
    const rotulo = desenharRotuloDaSerie(ponta, cor, tracejada, serie);
    return elemento('g', { class: 'serie', 'data-serie': serie, 'data-cor': cor }, barras + rotulo);
  }).join('');
  const marcasX = categorias.map((categoria, i) => [i + 0.5, categoria]);
  const eixosSvg = desenharEixos({ tituloX: eixos.x, tituloY: eixos.y }) + desenharMarcasEixoX(marcasX, escalaIndice) + desenharMarcasEixoY(escalaY);

  return grade + seriesSvg + eixosSvg;
}

// Um retângulo de barra ou classe de histograma, crescendo a partir da linha de zero (spec: bases de
// barra em 0 — não há razão dada para deixar uma barra "flutuando", e valor negativo cresce para
// baixo em vez de estourar o topo do gráfico).
function desenharBarra(escalaY, valor, zero, x, largura, atributosDePreenchimento) {
  const y = arredondar(Math.min(escalaY(valor), zero));
  const altura = arredondar(Math.abs(escalaY(valor) - zero));
  return elemento('rect', { x: arredondar(x), y, width: arredondar(largura), height: altura, ...atributosDePreenchimento });
}

// tipo "histograma": uma só distribuição (a coluna de `x`), em `classes` classes de largura igual
// entre o mínimo e o máximo — sem `d3.bin`, que não está entre os quatro parâmetros do Passo 2; a
// conta é a mesma soma por faixa que ele faz. Sempre 1 série (tinta, por coresDasSeries): sem outra
// série para diferenciar, um rótulo na ponta seria ruído sobre o título do eixo — decisão registrada
// no relatório da Tarefa 2, não um esquecimento.
function montarHistograma(biblioteca, especificacao, colunas) {
  const { x: nomeX, classes, eixos = {}, escala = {} } = especificacao;
  const valores = colunas[nomeX];
  const [minimo, maximo] = biblioteca.extensao(valores);
  const larguraClasse = (maximo - minimo) / classes;
  const contagens = new Array(classes).fill(0);
  for (const valor of valores) {
    const indice = Math.min(Math.max(Math.floor((valor - minimo) / larguraClasse), 0), classes - 1);
    contagens[indice] += 1;
  }
  const escalaX = criarEscala(biblioteca, escala.x, [minimo, maximo], [AREA.x0, AREA.x1]);
  const [, maximoContagem] = biblioteca.extensao(contagens);
  const escalaY = criarEscala(biblioteca, escala.y, [0, maximoContagem], [AREA.y1, AREA.y0]);
  const zero = arredondar(escalaY(0));
  const [{ cor, tracejada }] = coresDasSeries([nomeX], undefined);

  const grade = desenharGrade(escalaY);
  const GAP = 1; // separa visualmente as classes; o histograma NÃO tem o vão de "barras" (é uma distribuição contígua)
  const barras = contagens.map((contagem, i) => {
    const x0 = escalaX(minimo + i * larguraClasse);
    const x1 = escalaX(minimo + (i + 1) * larguraClasse);
    return desenharBarra(escalaY, contagem, zero, Math.min(x0, x1) + GAP, Math.max(Math.abs(x1 - x0) - 2 * GAP, 0), preenchimentoDaSerie(cor, tracejada));
  }).join('');
  const seriesSvg = elemento('g', { class: 'serie', 'data-serie': nomeX, 'data-cor': cor }, barras);
  const marcasX = Array.from({ length: classes + 1 }, (_, i) => minimo + i * larguraClasse).map((valor) => [valor, formatarNumero(valor)]);
  const eixosSvg = desenharEixos({ tituloX: eixos.x, tituloY: eixos.y }) + desenharMarcasEixoX(marcasX, escalaX) + desenharMarcasEixoY(escalaY);

  return grade + seriesSvg + eixosSvg;
}

const MONTADORES = { linha: montarLinha, barras: montarBarras, dispersao: montarDispersao, histograma: montarHistograma };

// O desenhista com as funções do d3 da aula: escalaLinear/escalaLog (d3-scale), linha (d3-shape),
// extensao (d3-array). Puro: nenhuma chamada toca o DOM, e desenharSvg devolve uma string — quem
// insere no documento é desenharGraficos, abaixo, do mesmo jeito que componentes/tex.js gera HTML do
// KaTeX como string e só materializa via innerHTML no ponto de inserção.
export function criarDesenhista({ escalaLinear, escalaLog, linha, extensao }) {
  const biblioteca = { escalaLinear, escalaLog, linha, extensao };
  return {
    tipos: new Set(Object.keys(MONTADORES)),
    desenharSvg(especificacao, colunas) {
      const montador = MONTADORES[especificacao.tipo];
      if (!montador) throw new Error(`tipo de gráfico desconhecido: "${especificacao.tipo}"`);
      const conteudo = montador(biblioteca, especificacao, colunas);
      return elemento('svg', { viewBox: `0 0 ${LARGURA} ${ALTURA}`, xmlns: SVG_NS, 'font-family': FAMILIA }, conteudo);
    },
  };
}

// Troca, dentro de raiz, o script de cada figure.grafico por um SVG; devolve os erros, cada um com o
// trecho do JSON e a mensagem. `dados` resolve o caminho de um CSV (modo build) para colunas — quem
// resolve o caminho é quem chama (spec 7.2); uma especificação com colunas inline (objeto em vez de
// string) não consulta `dados` e roda igual no navegador sem arquivos.
export function desenharGraficos(raiz, { desenhista, dados = {} }) {
  const doc = raiz.ownerDocument ?? raiz;
  const erros = [];
  for (const figura of raiz.querySelectorAll('figure.grafico')) {
    if (figura.querySelector('svg')) continue; // idempotente, como renderizarCodigo/renderizarTex
    const script = figura.querySelector('script[type="application/json"]');
    if (!script) continue; // sem script: estrutura.obrigatorio já acusa isto; aqui só não há o que desenhar
    const trecho = script.textContent.trim();
    try {
      const especificacao = JSON.parse(trecho);
      const colunas = typeof especificacao.dados === 'string' ? dados[especificacao.dados] : especificacao.dados;
      if (!colunas) throw new Error(`dados não encontrados para "${especificacao.dados}"`);
      const molde = doc.createElement('template');
      molde.innerHTML = desenhista.desenharSvg(especificacao, colunas);
      script.after(molde.content.firstChild);
    } catch (erro) {
      erros.push({ trecho, mensagem: erro.message });
    }
  }
  return erros;
}
