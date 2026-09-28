// Gráficos (spec 7.2): a especificação em JSON de figure.grafico vira SVG. O d3 chega por parâmetro,
// para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.
import { tokens } from '../tokens/tokens.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const { tinta, azul, cinza, linha: corDaGrade, amarelo } = tokens.cor;
const HEX_DA_COR = { tinta, azul, cinza, amarelo };
const FAMILIA = tokens.fonte.mono.join(', ');
// 14 — spec 7.2: "marcas e rótulos em Geist Mono 14". Em unidades do viewBox, não em px do palco: o
// SVG escala com a largura da figura (1,21× no layout figura, 0,575× numa coluna de grade 4-4-4,
// medido), e o texto escala junto. Quem garante os 14 px no palco é composicao.tamanho-minimo, que
// mede o texto de SVG no tamanho em que ele aparece — não este número.
const TAMANHO_TEXTO = tokens.minimo.rotulo;
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
// O validador (recursos.grafico, Tarefa 4) recusa ANTES de desenhar um `foco` que não está em `y` e
// mais de `contrato.limites['grafico.series']` séries, com mensagem legível ao autor (spec 9.1) —
// aqui a entrada já vem conferida quando passa por ele primeiro, e o `??` só cobre a ausência de
// `foco`, que é legítima. As duas checagens abaixo continuam existindo mesmo assim, como rede de
// segurança para quem chama coresDasSeries fora do validador (os testes deste módulo inclusive):
// sem a de baixo, a 3ª série em diante saía sem cor (sobra.shift() num array já esvaziado devolve
// undefined, e { serie, ...undefined } não erra — só não tem cor nenhuma) — um path sem stroke,
// invisível e sem aviso nenhum (Important 4 da revisão). O 3 aqui não é cópia do contrato: é o
// tamanho da paleta de séries da spec 7.2 (três papéis de cor — tinta, azul e cinza tracejada — e
// `sobra`, logo abaixo, tem só dois além do foco). contrato.limites['grafico.series'] pode BAIXAR o
// número de séries aceitas; subir acima de 3 faria o validador aceitar o que este desenho recusa, e
// exigiria antes uma quarta cor na spec.
export function coresDasSeries(y, foco) {
  if (y.length > 3) throw new Error(`no máximo 3 séries em y; recebidas ${y.length}`);
  if (y.length === 1) return [{ serie: y[0], cor: 'tinta', tracejada: false }];
  const emFoco = foco ?? y.at(-1);
  const sobra = [{ cor: 'tinta', tracejada: false }, { cor: 'cinza', tracejada: true }];
  return y.map((serie) => (serie === emFoco
    ? { serie, cor: 'azul', tracejada: false }
    : { serie, ...sobra.shift() }));
}

// Arredonda COORDENADAS (pixel) para casas decimais fixas: o "d" de um path e as posições de forma
// saem sempre com a mesma precisão, nos dois modos (navegador e build) — é o que a Tarefa 6 precisa
// para o gráfico sair byte a byte igual na comparação visual (ruído de ponto flutuante é a suspeita
// nº1 citada no plano para uma diferença entre os dois modos). NÃO serve ao texto de uma marca de
// eixo — ver desenharMarcasEixoY/formatarPasso, abaixo: uma precisão FIXA (seja casas decimais, seja
// dígitos significativos) sempre tem um regime onde apaga a diferença entre marcas vizinhas — 2 casas
// apagava um domínio pequeno ([0.0001, 0.0016], Critical 1 da revisão da Tarefa 2, oito marcas "0");
// o primeiro conserto (4 dígitos significativos fixos) resolveu aquele regime e quebrou o simétrico —
// um domínio grande com variação fina ([99997, 100003] virava sete vezes "100000", achado da
// re-revisão). A precisão certa deriva do PASSO entre marcas, não de uma constante.
function arredondar(valor, casas = 2) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function escaparXml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Número de eixo em pt-BR: separador de milhar é ponto, decimal é vírgula — o oposto do padrão dos
// EUA que tickFormat do d3 (e toFixed) escrevem por padrão (achado da rodada 3 da revisão: "99,997"
// lido em português é noventa e nove vírgula novecentos e noventa e sete, não um milhar). A troca é
// SIMULTÂNEA — cada caractere decide sozinho dentro do replace —, não duas substituições em
// sequência: "," -> "." e depois "." -> "," desfaria a primeira troca antes de terminar.
function paraPtBr(texto) {
  return texto.replace(/[,.]/g, (caractere) => (caractere === ',' ? '.' : ','));
}

// Separador de milhar (vírgula, padrão dos EUA — o texto ainda passa por paraPtBr depois) numa
// string de toFixed(): toFixed nunca agrupa, ao contrário do tickFormat do d3, que agrupa sozinho.
// Sem isto, formatarPasso (abaixo) e desenharMarcasEixoY/X concordam no separador decimal mas
// divergem no milhar — "99997" de um lado, "99.997" do outro, o mesmo defeito de fonte dupla que
// levou à troca simultânea acima, só que na grade de dígitos em vez do caractere.
function agruparMilhar(textoFixo) {
  const [sinal, resto] = textoFixo.startsWith('-') ? ['-', textoFixo.slice(1)] : ['', textoFixo];
  const [parteInteira, parteDecimal] = resto.split('.');
  const comSeparador = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sinal + comSeparador + (parteDecimal !== undefined ? `.${parteDecimal}` : '');
}

// Formata as bordas de classe do histograma pelo PASSO DE VERDADE entre elas (larguraClasse) — a
// mesma ideia do tickFormat do d3 (usado em desenharMarcasEixoY/X, abaixo, para tudo que vem de
// escala.ticks()), aplicada aqui à mão porque bordas de classe NÃO são ticks: são espaçadas por
// `passo`, um valor exato que já temos, não pela "escolha bonita" que tickFormat faria a partir de
// `classes` sozinho — as duas contas podem discordar quando `passo` não é um número "redondo".
// Dígitos necessários para o passo aparecer: 10^-casas <= passo, ou seja casas = -log10(passo),
// arredondado para cima (o 1e-12 evita que erro de ponto flutuante empurre log10 para o inteiro errado).
// agruparMilhar + paraPtBr no fim: a mesma fonte de separador (milhar e decimal) que os ticks usam
// (desenharMarcasEixoY/X), para as duas famílias de marca nunca discordarem dentro do mesmo eixo.
function formatarPasso(valor, passo) {
  if (!Number.isFinite(passo) || passo === 0) return paraPtBr(agruparMilhar(String(valor)));
  const casas = Math.max(0, -Math.floor(Math.log10(Math.abs(passo)) + 1e-12));
  return paraPtBr(agruparMilhar(valor.toFixed(casas)));
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

// Log de zero (ou de negativo) é -Infinity: a escala "funciona" sem lançar sozinha, e cada posição
// sai NaN, calada — o path de uma série vira "MNaN,16L…" e nada desenha (Important 2 da revisão).
// vocabulario.atributo não confere valor de atributo de SVG, então nada mais acusaria isto depois.
// Em "barras" e "histograma" o domínio de y inclui o zero por construção, então log em y falha
// sempre — recursos.grafico recusa essa combinação antes de desenhar (TIPOS_COM_ZERO_EM_Y). Nos
// outros casos (linha e dispersão, e o x de qualquer tipo contínuo) o domínio sai dos VALORES, que uma
// regra estática não tem quando `dados` é um caminho de CSV; aí este throw é a defesa, e o erro dele
// chega ao autor pelo build (build/construir.mjs:achadosDeGrafico).
//
// `limitesRedondos` (spec 7.2): só `linha` e `dispersao` passam true — .nice() do d3-scale estica o
// domínio até a marca redonda mais próxima dos dois lados, para nenhum ponto cair exatamente em cima
// do eixo e para a régua terminar num número que se lê bem. Não se aplica a "barras" (já parte de 0,
// por construção) nem a "histograma" (as classes têm de bater com [minimo, maximo] dos dados — esticar
// o domínio deslocaria a primeira/última barra da borda do eixo). Funciona em linear e em log (d3-scale
// dá .nice() nos dois); chamado depois de domain()/range(), porque é o par [domínio, contagem de ticks]
// que .nice() lê para escolher a marca redonda.
function criarEscala({ escalaLinear, escalaLog }, tipoDeEscala, dominio, alcance, limitesRedondos = false) {
  if (tipoDeEscala === 'log' && dominio.some((valor) => valor <= 0)) {
    throw new Error(`escala log exige valores maiores que zero no domínio; recebido [${dominio.join(', ')}]`);
  }
  const fabrica = tipoDeEscala === 'log' ? escalaLog : escalaLinear;
  const escala = fabrica().domain(dominio).range(alcance);
  return limitesRedondos ? escala.nice() : escala;
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

// tickFormat(contagem) — o mesmo d3-scale que gera os ticks — deriva a precisão do PASSO que .ticks
// escolheu para essa contagem e esse domínio: é a mesma fonte, não uma constante nossa que pode
// discordar dela (o que a re-revisão pede depois do Critical 1). Vale para linear e log; em log, o
// próprio d3 deixa "" nas marcas menores (1,2,3…9 entre as décadas) — decisão dele, não nossa,
// coerente com como ele numera escala log em qualquer biblioteca. O texto sai no padrão dos EUA
// (vírgula de milhar); paraPtBr troca para o nosso, sem tocar na precisão que tickFormat calculou.
function desenharMarcasEixoY(escalaY) {
  const marcas = escalaY.ticks(5);
  const formatar = escalaY.tickFormat(5);
  return marcas.map((valor) => elemento('text', {
    class: 'marca', x: arredondar(AREA.x0 - 8), y: arredondar(escalaY(valor)),
    fill: cinza, 'font-family': FAMILIA, 'font-size': TAMANHO_TEXTO, 'text-anchor': 'end', 'dominant-baseline': 'middle',
  }, paraPtBr(formatar(valor)))).join('');
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
  const { x: nomeX, y: series, foco, eixos = {}, escalas = {}, faixas } = especificacao;
  const valoresX = colunas[nomeX];
  const todosOsY = series.flatMap((nome) => colunas[nome]);
  const escalaX = criarEscala(biblioteca, escalas.x, biblioteca.extensao(valoresX), [AREA.x0, AREA.x1], true);
  const escalaY = criarEscala(biblioteca, escalas.y, biblioteca.extensao(todosOsY), [AREA.y1, AREA.y0], true);
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
  const formatarX = escalaX.tickFormat(5);
  const marcasX = escalaX.ticks(5).map((valor) => [valor, paraPtBr(formatarX(valor))]);
  const eixosSvg = desenharEixos({ tituloX: eixos.x, tituloY: eixos.y }) + desenharMarcasEixoX(marcasX, escalaX) + desenharMarcasEixoY(escalaY);

  return grade + faixasSvg + seriesSvg + eixosSvg;
}

// tipo "dispersao": os mesmos dados de "linha", em pontos soltos; a série tracejada vira marcador
// vazado. `linhas` (spec 7.2, campo novo): as séries citadas nela saem como caminho contínuo — o
// MESMO gerador de "linha" (d3-shape line, ESPESSURA_EIXO, tracejado se a série for a tracejada) — em
// vez de círculos; é o desenho da reta ajustada sobre a nuvem de pontos. As demais séries de `y`
// continuam pontos. recursos.grafico recusa `linhas` fora de dispersão, que não seja lista de
// strings, ou com nome que não está em `y` — aqui não há defesa própria porque a validação estática
// já corre antes de desenhar (mesma divisão de trabalho que `foco`/`escalas`, comentário de
// coresDasSeries acima).
function montarDispersao(biblioteca, especificacao, colunas) {
  const { x: nomeX, y: series, foco, eixos = {}, escalas = {}, faixas, linhas = [] } = especificacao;
  const RAIO = 4;
  const valoresX = colunas[nomeX];
  const todosOsY = series.flatMap((nome) => colunas[nome]);
  const escalaX = criarEscala(biblioteca, escalas.x, biblioteca.extensao(valoresX), [AREA.x0, AREA.x1], true);
  const escalaY = criarEscala(biblioteca, escalas.y, biblioteca.extensao(todosOsY), [AREA.y1, AREA.y0], true);
  const geradorDeLinha = biblioteca.linha()
    .x((ponto) => arredondar(escalaX(ponto.x)))
    .y((ponto) => arredondar(escalaY(ponto.y)));

  const grade = desenharGrade(escalaY);
  const faixasSvg = desenharFaixas(faixas, escalaX);
  const seriesSvg = coresDasSeries(series, foco).map(({ serie, cor, tracejada }) => {
    const pontos = valoresX.map((valor, i) => ({ x: valor, y: colunas[serie][i] }));
    const forma = linhas.includes(serie)
      ? elemento('path', {
        d: geradorDeLinha(pontos), fill: 'none', stroke: HEX_DA_COR[cor], 'stroke-width': ESPESSURA_EIXO,
        'stroke-dasharray': tracejada ? TRACEJADO : undefined,
      })
      : pontos.map((ponto) => elemento('circle', {
        cx: arredondar(escalaX(ponto.x)), cy: arredondar(escalaY(ponto.y)), r: RAIO,
        ...(tracejada ? { fill: 'none', stroke: HEX_DA_COR[cor], 'stroke-width': ESPESSURA_EIXO } : { fill: HEX_DA_COR[cor] }),
      })).join('');
    const ponta = pontos.at(-1);
    const rotulo = desenharRotuloDaSerie({ x: escalaX(ponta.x), y: escalaY(ponta.y) }, cor, tracejada, serie);
    return elemento('g', { class: 'serie', 'data-serie': serie, 'data-cor': cor }, forma + rotulo);
  }).join('');
  const formatarX = escalaX.tickFormat(5);
  const marcasX = escalaX.ticks(5).map((valor) => [valor, paraPtBr(formatarX(valor))]);
  const eixosSvg = desenharEixos({ tituloX: eixos.x, tituloY: eixos.y }) + desenharMarcasEixoX(marcasX, escalaX) + desenharMarcasEixoY(escalaY);

  return grade + faixasSvg + seriesSvg + eixosSvg;
}

// tipo "barras": x categórico (as próprias categorias de `x`, sem escala numérica), até 3 séries
// agrupadas por categoria. Posição por índice numa escala linear — não precisa de escala de banda.
function montarBarras(biblioteca, especificacao, colunas) {
  // escalas.x não se aplica aqui: o eixo de categoria não tem escolha linear/log, só o de valor (y) tem.
  const { x: nomeX, y: series, foco, eixos = {}, escalas = {} } = especificacao;
  const categorias = colunas[nomeX];
  const n = categorias.length;
  const todosOsY = series.flatMap((nome) => colunas[nome]);
  const [minimoY, maximoY] = biblioteca.extensao(todosOsY);
  const escalaY = criarEscala(biblioteca, escalas.y, [Math.min(0, minimoY), maximoY], [AREA.y1, AREA.y0]);
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
    // a ponta fica na margem direita do gráfico (AREA.x1), igual para as 3 séries — não no fim da
    // própria barra: aquilo cai por cima do grupo de barras da série seguinte (Critical 2 da revisão).
    const ponta = { x: AREA.x1, y: Math.min(escalaY(colunas[serie][ultimo]), zero) };
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
// conta é a mesma soma por faixa que ele faz. `x` é contínuo, como em "linha"/"dispersao" — por isso
// `faixas` também se aplica aqui (só "barras", de eixo categórico, fica de fora).
// Rótulo na ponta: a Tarefa 2 tinha isentado o histograma ("uma série só, nada para desambiguar"),
// mas a spec 7.2 diz "cada série é rotulada na ponta" sem isenção nenhuma, e o rótulo tem uma segunda
// função além de desambiguar cor — nomear a grandeza plotada, que vale mesmo com uma série só.
// Decisão do coordenador na revisão da Tarefa 2: implementar, revertendo a exceção.
function montarHistograma(biblioteca, especificacao, colunas) {
  const { x: nomeX, classes, eixos = {}, escalas = {}, faixas } = especificacao;
  const valores = colunas[nomeX];
  const [minimo, maximo] = biblioteca.extensao(valores);
  const larguraClasse = (maximo - minimo) / classes;
  const contagens = new Array(classes).fill(0);
  for (const valor of valores) {
    const indice = Math.min(Math.max(Math.floor((valor - minimo) / larguraClasse), 0), classes - 1);
    contagens[indice] += 1;
  }
  const escalaX = criarEscala(biblioteca, escalas.x, [minimo, maximo], [AREA.x0, AREA.x1]);
  const [, maximoContagem] = biblioteca.extensao(contagens);
  const escalaY = criarEscala(biblioteca, escalas.y, [0, maximoContagem], [AREA.y1, AREA.y0]);
  const zero = arredondar(escalaY(0));
  const [{ cor, tracejada }] = coresDasSeries([nomeX], undefined);

  const grade = desenharGrade(escalaY);
  const faixasSvg = desenharFaixas(faixas, escalaX);
  const GAP = 1; // separa visualmente as classes; o histograma NÃO tem o vão de "barras" (é uma distribuição contígua)
  const barras = contagens.map((contagem, i) => {
    const x0 = escalaX(minimo + i * larguraClasse);
    const x1 = escalaX(minimo + (i + 1) * larguraClasse);
    return desenharBarra(escalaY, contagem, zero, Math.min(x0, x1) + GAP, Math.max(Math.abs(x1 - x0) - 2 * GAP, 0), preenchimentoDaSerie(cor, tracejada));
  }).join('');
  // a ponta é o topo da última classe (a mesma margem direita que "barras" usa, AREA.x1) — a última
  // classe termina exatamente em `maximo`, então escalaX(maximo) === AREA.x1.
  const ponta = { x: escalaX(maximo), y: Math.min(escalaY(contagens.at(-1)), zero) };
  const rotulo = desenharRotuloDaSerie(ponta, cor, tracejada, nomeX);
  const seriesSvg = elemento('g', { class: 'serie', 'data-serie': nomeX, 'data-cor': cor }, barras + rotulo);
  // Bordas de classe: não são .ticks() (não vêm de escalaX), então tickFormat — pensado para o passo
  // que .ticks() escolhe — não se aplica direto; formatarPasso deriva a mesma ideia do passo de
  // verdade entre as bordas (larguraClasse), que já temos exato.
  const marcasX = Array.from({ length: classes + 1 }, (_, i) => minimo + i * larguraClasse).map((valor) => [valor, formatarPasso(valor, larguraClasse)]);
  const eixosSvg = desenharEixos({ tituloX: eixos.x, tituloY: eixos.y }) + desenharMarcasEixoX(marcasX, escalaX) + desenharMarcasEixoY(escalaY);

  return grade + faixasSvg + seriesSvg + eixosSvg;
}

const MONTADORES = { linha: montarLinha, barras: montarBarras, dispersao: montarDispersao, histograma: montarHistograma };

// Os tipos conhecidos, para quem precisa da lista sem montar um desenhista (o `tipo` não é dado do
// contrato — a spec 7.2 o fixa em prosa — então MONTADORES, aqui, é a única fonte dele). recursos.grafico
// (validador/regras/recursos.js, Tarefa 4) importa esta constante para recusar um `tipo` desconhecido
// ANTES de desenhar, em vez de reescrever a mesma lista de quatro nomes por conta própria.
export const TIPOS_DE_GRAFICO = new Set(Object.keys(MONTADORES));

// Os tipos cujo eixo y sempre inclui o zero: "barras" cresce a partir de 0 (montarBarras, domínio
// [min(0, …), max]) e o y do "histograma" é contagem, domínio [0, max] (montarHistograma). Em escala
// log, criarEscala recusa esses domínios SEMPRE, qualquer que seja o dado — por isso recursos.grafico
// recusa `escalas.y: "log"` nesses dois tipos antes de desenhar, sem precisar carregar nada.
export const TIPOS_COM_ZERO_EM_Y = new Set(['barras', 'histograma']);

// O campo `dados` (spec 7.2): o caminho de um CSV (texto) ou um objeto de colunas. Devolve a frase do
// problema, ou null. Uma fonte só para as duas pontas: recursos.grafico (estática, antes de desenhar)
// e desenharGraficos (quem desenha fora do validador).
export function problemaDosDados(dados) {
  if (dados === undefined) return 'gráfico sem o campo "dados"';
  if (typeof dados === 'string') return dados.trim() === '' ? 'gráfico com "dados" vazio' : null;
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
    return '"dados" tem de ser o caminho de um CSV ou um objeto de colunas, como {"epoca": [...]}';
  }
  return null;
}

// As colunas que a especificação lê e que `colunas` não tem (ou não tem como lista): `x` sempre, e
// cada série de `y` fora do histograma (que só lê `x`). recursos.grafico usa isto com `dados` inline,
// antes de desenhar; desenharGraficos, com qualquer origem — inclusive o CSV, que só se tem depois
// de buscado.
export function colunasAusentes(especificacao, colunas) {
  const series = especificacao.tipo === 'histograma' || !Array.isArray(especificacao.y) ? [] : especificacao.y;
  const usadas = [...new Set([especificacao.x, ...series].filter((nome) => typeof nome === 'string'))];
  return usadas.filter((nome) => !Array.isArray(colunas?.[nome]));
}

export function mensagemDeColunasAusentes(ausentes) {
  const lista = ausentes.map((nome) => `"${nome}"`).join(', ');
  return ausentes.length === 1 ? `os dados do gráfico não têm a coluna ${lista}` : `os dados do gráfico não têm as colunas ${lista}`;
}

// O desenhista com as funções do d3 da aula: escalaLinear/escalaLog (d3-scale), linha (d3-shape),
// extensao (d3-array). Puro: nenhuma chamada toca o DOM, e desenharSvg devolve uma string — quem
// insere no documento é desenharGraficos, abaixo, do mesmo jeito que componentes/tex.js gera HTML do
// KaTeX como string e só materializa via innerHTML no ponto de inserção.
export function criarDesenhista({ escalaLinear, escalaLog, linha, extensao }) {
  const biblioteca = { escalaLinear, escalaLog, linha, extensao };
  return {
    tipos: TIPOS_DE_GRAFICO,
    // recursos.grafico (Tarefa 4) já recusa, antes de chegar aqui, um `tipo` fora de TIPOS_DE_GRAFICO
    // — mas só quando passa pelo validador primeiro; este throw é quem defende desenharSvg chamado
    // direto (os testes deste módulo inclusive), com a MESMA fonte (MONTADORES), não uma lista solta.
    desenharSvg(especificacao, colunas) {
      const montador = MONTADORES[especificacao.tipo];
      if (!montador) throw new Error(`tipo de gráfico desconhecido: "${especificacao.tipo}"`);
      const conteudo = montador(biblioteca, especificacao, colunas);
      return elemento('svg', { viewBox: `0 0 ${LARGURA} ${ALTURA}`, xmlns: SVG_NS, 'font-family': FAMILIA }, conteudo);
    },
  };
}

// Acrescenta, dentro de raiz, um SVG ao lado do script de cada figure.grafico (script.after: o script
// fica); devolve os erros, cada um com o trecho do JSON e a mensagem. `dados` resolve o caminho de um
// CSV para colunas — quem busca o arquivo é quem chama (build/embutir.mjs:dadosDosCsvs, do disco;
// montar/entrada.js:buscarCsvs, por fetch), e os dois interpretam com componentes/csv.js; uma
// especificação com colunas inline (objeto em vez de string) não consulta `dados` e roda igual no
// navegador sem arquivos.
// Por que "acrescenta" e não "troca" fica assim, sem virar `exatamenteUmDe` no contrato: depois de
// renderizada, a figure tem script + svg (+ figcaption opcional), enquanto o contrato descreve a
// forma de FONTE. Inofensivo hoje porque recursos.grafico (Tarefa 4) e todo o grupo estático leem o
// fonte clonado, antes de qualquer render (spec 9.3: "recursos.grafico | o fonte, sem cromo e sem
// HTML renderizado" — montar/entrada.js:101, `fonte = document.cloneNode(true)`, clonado ANTES desta
// função rodar); as regras de composição, as únicas que leem o documento montado, não consultam
// `filhos`. Decisão da Tarefa 4: o contrato continua descrevendo só a forma de fonte.
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
      const problema = problemaDosDados(especificacao.dados);
      if (problema) throw new Error(problema);
      // Um caminho que quem chama não leu: o arquivo não existe (build: a etapa 1 já recusou a aula
      // por recursos.csv) ou a busca falhou (navegador: recursos.csv vai para o painel). A mensagem
      // cobre o caso que o autor não adivinha: aberta como arquivo local ou num artifact, a aula não
      // tem de onde buscar o CSV (spec 7.2: inline é "necessário no modo navegador sem arquivos").
      if (typeof especificacao.dados === 'string' && !Object.hasOwn(dados, especificacao.dados)) {
        throw new Error(`o CSV "${especificacao.dados}" não foi lido: confira o caminho, relativo ao arquivo da aula; `
          + 'sem servidor de arquivos (arquivo local, artifact), ponha as colunas inline em "dados"');
      }
      const colunas = typeof especificacao.dados === 'string' ? dados[especificacao.dados] : especificacao.dados;
      const ausentes = colunasAusentes(especificacao, colunas);
      if (ausentes.length > 0) throw new Error(mensagemDeColunasAusentes(ausentes));
      const molde = doc.createElement('template');
      molde.innerHTML = desenhista.desenharSvg(especificacao, colunas);
      script.after(molde.content.firstChild);
    } catch (erro) {
      erros.push({ trecho, mensagem: erro.message });
    }
  }
  return erros;
}
