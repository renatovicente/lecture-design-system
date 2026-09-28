// Regras de composição (spec 9.2 e 9.3): o que só o documento renderizado sabe dizer.
// Roda dentro da página — no navegador, no passo 6, antes do motor; no build, no Chrome headless.
// Só API padrão do DOM, como o resto de validador/.
import { onde, trechoDe } from '../validar.js';
// O retângulo do canto do vídeo (tokens video.*, derivados dos do palco por build/tokens.mjs): o mesmo
// módulo que componentes/ lê para as cores dos gráficos e do código. Nenhum número dele mora aqui.
import { tokens } from '../../tokens/tokens.js';

const FOLGA = 0.5; // meio pixel, a mesma tolerância dos testes de geometria
const AMARELO = 'rgb(252, 180, 33)';
const AZUL = 'rgb(16, 148, 171)';
const TINTA = 'rgb(10, 10, 10)';
const MINIMO_AZUL = 32; // spec 4.2

// Especificidade do seletor, para o contrato poder dizer "seletor-mais-especifico" e o código obedecer:
// o papel de .roteiro li não é o de li.
function especificidade(seletor) {
  const classes = (seletor.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) ?? []).length;
  const elementos = (seletor.match(/(^|[\s>+~])[a-zA-Z]+/g) ?? []).length;
  return classes * 100 + elementos;
}

function papelDe(elemento, papeis) {
  let escolhido = null;
  let maior = -1;
  for (const [nome, papel] of Object.entries(papeis)) {
    if (nome === 'precedencia' || nome === 'excecoes') continue;
    for (const seletor of papel.seletores) {
      if (!elemento.matches(seletor)) continue;
      const peso = especificidade(seletor);
      // Em empate de especificidade, `>` estrito não troca de dono: vence o papel visitado primeiro
      // por Object.entries — a ordem de contrato.papeis no JSON, "leitura" antes de "rotulo" etc. É
      // determinístico (Object.entries preserva a ordem de inserção das chaves), não arbitrário.
      if (peso > maior) {
        maior = peso;
        escolhido = { nome, minimo: papel.minimo, seletor };
      }
    }
  }
  return escolhido;
}

// Elementos que o autor escreveu ou que o sistema gerou, fora o que não tem caixa própria.
// aside.notas nunca aparece no slide (display:none): medir o que está lá dentro só acusaria
// conteúdo que a plateia nunca vê, sem o autor ter como corrigir sem também tornar a nota visível.
// Pseudo-elemento (::before/::after, como os números de linha do código ou o marcador de <li>) não
// existe para querySelectorAll: nenhuma regra deste arquivo consegue medir ou colorir o que só um
// ::before desenha — teto estrutural, não um bug para corrigir aqui.
// O interior de uma fórmula (.katex/.katex-display) é pulado — struts e margens negativas do KaTeX,
// medidos peça por peça, não diriam nada —, mas a fórmula em si não: sua caixa inteira é a resposta
// honesta sobre tamanho e transbordo (ver composicao.transbordo, que é quem realmente precisa dela;
// tamanho-minimo já filtra o miolo de novo, pela sua própria leitura de contrato.papeis.excecoes).
function medivel(elemento) {
  if (elemento.nodeName === 'BR') return false;
  if (elemento.closest('aside.notas')) return false;
  if (elemento.parentElement?.closest('.katex, .katex-display')) return false;
  return true;
}

function* elementosMedidos(slide) {
  for (const elemento of slide.querySelectorAll('*')) {
    if (medivel(elemento)) yield elemento;
  }
}

// Texto de SVG tem o font-size em unidades do viewBox: getComputedStyle diz 14px num gráfico que, numa
// coluna estreita, aparece com 8 (I3 da revisão final da 2a, medido no Chrome: escala 0,575 numa
// coluna de grade 4-4-4, 1,212 no layout figura — e getComputedStyle dizia 14px nos dois). A escala
// de verdade é a da matriz do elemento até a tela (getScreenCTM, que inclui o viewBox, os transform
// do próprio SVG e os do CSS); a raiz do determinante dá o fator de tamanho mesmo com rotação (o título
// do eixo y é girado -90°). Divide pela escala do palco — a razão entre a caixa na tela e a caixa de
// layout do slide — para a medida sair em px do palco, a mesma unidade em que getComputedStyle mede
// o texto HTML ao lado: um palco reduzido para caber na janela não pode virar texto pequeno.
function escalaNoSvg(elemento, slide) {
  const matriz = elemento.getScreenCTM?.();
  if (!matriz) return 1;
  const naTela = Math.sqrt(Math.abs(matriz.a * matriz.d - matriz.b * matriz.c));
  return naTela / escalaDoPalco(slide);
}

// A escala do palco: a razão entre a caixa do slide na tela e a sua caixa de layout. Divide qualquer
// medida tirada de getBoundingClientRect para ela sair em px do palco.
function escalaDoPalco(slide) {
  return slide.offsetWidth > 0 ? slide.getBoundingClientRect().width / slide.offsetWidth : 1;
}

const decimal = (numero) => String(numero).replace('.', ',');
const umaCasa = (numero) => Math.round(numero * 10) / 10;

// Texto de SVG é medido por FIGURA, não por elemento (pendência 2 da fase 2a): um gráfico tem uma
// dúzia de <text> com o mesmo font-size e a mesma escala, e um erro por <text> dava 16 erros com a
// mesma causa e a mesma correção — a figura estreita demais. O achado é um só, com a MENOR medida.
// Só conta quem escreve texto ele mesmo (nó de texto filho direto): um <text> cujo texto está todo
// num <tspan> não é julgado pelo tamanho do <text>, e sim pelo do <tspan>, que é o que se vê — e
// é por isso que as duas regras abaixo medem <tspan> (contrato: "svg tspan" em papeis.rotulo).
function textoProprio(elemento) {
  return [...elemento.childNodes].some((no) => no.nodeType === Node.TEXT_NODE && no.data.trim());
}

// A figura a que um texto de SVG pertence, para agrupar: a <figure> em volta (todo SVG do autor mora
// numa, spec 5.5), ou o próprio <svg> quando não houver.
function figuraDe(elemento) {
  return elemento.closest('figure') ?? elemento.closest('svg');
}

// Guarda, por figura, a menor medida e quantos textos ficaram abaixo do limite.
function registrarNaFigura(figuras, elemento, medida, abaixo) {
  const figura = figuraDe(elemento);
  const atual = figuras.get(figura) ?? { menor: medida, elemento, abaixo: 0 };
  if (medida.tamanho < atual.menor.tamanho) Object.assign(atual, { menor: medida, elemento });
  if (abaixo) atual.abaixo += 1;
  figuras.set(figura, atual);
}

function medidaNoSvg(elemento, slide, janela) {
  const declarado = Number.parseFloat(janela.getComputedStyle(elemento).fontSize);
  const escala = escalaNoSvg(elemento, slide);
  return { declarado, escala, tamanho: declarado * escala };
}

function descreverMedida({ declarado, escala, tamanho }) {
  return `${decimal(umaCasa(tamanho))} px no palco (${decimal(declarado)} px no SVG, que a figura escala por ${decimal(Math.round(escala * 1000) / 1000)})`;
}

// Um SVG encolhe por uma de duas razões, e a saída de cada uma é outra (I1 da revisão final da 2b):
//   - a figura é mais ESTREITA que ele (max-width: 100%): o svg ocupa toda a largura que tem, e o que
//     resolve é dar largura — uma coluna mais larga, o layout figura;
//   - no layout figura, ele é mais ALTO que o espaço que sobra embaixo do título (flex e min-height: 0
//     em estilos/componentes.css): o svg encolhe pela altura, a largura cai junto, e sobra largura ao
//     lado — medido, uma cadeia de dez nós de cima para baixo saía com 62 px de largura numa figura de
//     1152. Mandar esse autor para "uma coluna mais larga ou o layout figura" é mandar para onde ele já
//     está.
// A segunda se reconhece assim: o svg ficou mais estreito que o contêiner (sobrou largura, então não
// foi ela que limitou) e mais baixo que a altura que ele pede — a do atributo height, quando é um
// comprimento; sem ele (um SVG só com viewBox), qualquer altura conta como encolhida, porque a largura
// natural de um SVG assim é a do contêiner, e só a altura o faria sair mais estreito. A tolerância é a
// FOLGA de sempre.
function limitadoPelaAltura(svg, slide) {
  const escala = escalaDoPalco(slide);
  const caixa = svg.getBoundingClientRect();
  const conteiner = svg.parentElement?.getBoundingClientRect();
  if (!conteiner || caixa.width / escala >= conteiner.width / escala - FOLGA) return false;
  const altura = svg.height?.baseVal;
  if (!altura || altura.unitType === altura.SVG_LENGTHTYPE_PERCENTAGE) return true;
  return caixa.height / escala < altura.value - FOLGA;
}

function caixaValida(caixa) {
  return caixa.width > 0 && caixa.height > 0;
}

// As caixas de linha de um título: uma por trecho de texto, e uma só por fórmula inteira (nunca o
// miolo — a mesma razão de elementosMedidos). Descer no miolo de uma fórmula daria vários topos que
// não dizem nada sobre quantas linhas existem; a caixa externa, sim.
function* caixasDeLinha(no) {
  if (no.nodeType === Node.TEXT_NODE) {
    if (!no.textContent.trim()) return;
    const intervalo = no.ownerDocument.createRange();
    intervalo.selectNodeContents(no);
    yield* intervalo.getClientRects();
    return;
  }
  if (no.nodeType !== Node.ELEMENT_NODE || no.nodeName === 'BR') return;
  if (no.matches('.katex, .katex-display')) {
    yield no.getBoundingClientRect();
    return;
  }
  for (const filho of no.childNodes) yield* caixasDeLinha(filho);
}

// Conta linhas como o navegador as desenha — pela sobreposição vertical das caixas de conteúdo —
// em vez de altura ÷ entrelinha arredondado. O arredondamento é frágil perto de matemática (spec
// 4.3): medido num título real de uma linha só com \(\eta\), a razão já fica em 1,39, e um elemento
// mais alto (uma fração, um expoente empilhado) alarga a linha sem quebrá-la, cruzando o arredondamento
// sem que exista uma segunda linha de verdade.
// O corte de sobreposição é relativo, não um gap fixo: duas linhas REAIS adjacentes já se tocam por
// causa da métrica da fonte (medido: 9,5 px de sobreposição numa caixa de 57 px, 17%) — bem abaixo
// do corte de 50% usado aqui, com folga.
function contarLinhas(titulo) {
  const caixas = [...caixasDeLinha(titulo)]
    .filter((caixa) => caixa.width > 0 && caixa.height > 0)
    .sort((a, b) => a.top - b.top);
  let linhas = 0;
  let topoDaLinha = 0;
  let baseDaLinha = 0;
  for (const caixa of caixas) {
    const sobreposicao = Math.min(baseDaLinha, caixa.bottom) - Math.max(topoDaLinha, caixa.top);
    if (linhas > 0 && sobreposicao / Math.min(caixa.height, baseDaLinha - topoDaLinha) > 0.5) {
      topoDaLinha = Math.min(topoDaLinha, caixa.top);
      baseDaLinha = Math.max(baseDaLinha, caixa.bottom);
    } else {
      linhas += 1;
      topoDaLinha = caixa.top;
      baseDaLinha = caixa.bottom;
    }
  }
  return linhas;
}

// Canto do vídeo (1.0.1): o que "aparece" num lugar, para composicao.canto-video. Um elemento aparece
// onde a caixa dele está quando ele pinta alguma coisa por conta própria — tem texto próprio (nó de
// texto filho direto), é substituído (imagem, SVG, canvas, controle de formulário) ou tem fundo ou
// borda. Contêiner que só arruma os filhos (div.colunas, a coluna, ul, figure, .area) não conta: a
// caixa de div.colunas vai até a base da coluna mais longa em toda a largura, e acusá-la pelo canto
// seria acusar a coluna da esquerda pelo que a da direita não tem. Os filhos dele contam por si.
// Uma fórmula conta pela caixa do .katex (a do .katex-display é a largura inteira da coluna); o miolo
// dela não, pela mesma razão de elementosMedidos.
const SUBSTITUIDOS = new Set(['img', 'svg', 'canvas', 'video', 'input', 'button', 'select', 'textarea', 'output']);

function pinta(elemento, janela) {
  const nome = elemento.nodeName.toLowerCase();
  if (elemento.matches('.katex')) return true;
  if (SUBSTITUIDOS.has(nome)) return true;
  if (textoProprio(elemento)) return true;
  const estilo = janela.getComputedStyle(elemento);
  if (estilo.backgroundColor !== 'rgba(0, 0, 0, 0)' || estilo.backgroundImage !== 'none') return true;
  return ['Top', 'Right', 'Bottom', 'Left']
    .some((lado) => Number.parseFloat(estilo[`border${lado}Width`]) > 0 && estilo[`border${lado}Style`] !== 'none');
}

function* elementosQuePintam(slide, janela) {
  for (const elemento of slide.querySelectorAll('*')) {
    if (elemento.nodeName === 'BR' || elemento.closest('aside.notas')) continue;
    if (elemento.parentElement?.closest('.katex')) continue;
    // Dentro de um SVG, quem responde é o próprio <svg>, pela caixa inteira.
    if (elemento.parentElement?.closest('svg')) continue;
    if (janela.getComputedStyle(elemento).visibility === 'hidden') continue;
    if (pinta(elemento, janela)) yield elemento;
  }
}

// O canto ligado: a meta `video` com um dos valores do contrato (hoje só "canto").
function cantoLigado(doc, contrato) {
  const valor = doc.querySelector('meta[name="video"]')?.getAttribute('content')?.trim() ?? '';
  return (contrato.metadados.video?.valores ?? []).includes(valor);
}

export const regras = [
  {
    nome: 'composicao.transbordo',
    *aplicar({ slides, janela }) {
      for (const slide of slides) {
        const area = slide.querySelector('.area');
        const zonaDoCorpo = area?.getBoundingClientRect();
        const palco = slide.getBoundingClientRect();
        for (const elemento of elementosMedidos(slide)) {
          const caixa = elemento.getBoundingClientRect();
          if (!caixaValida(caixa)) continue;
          const limite = area?.contains(elemento) ? zonaDoCorpo : palco;
          // Os quatro lados: nenhuma classe do sistema hoje desloca conteúdo para antes do início da
          // zona (a spec 9.2 não isenta lado nenhum), mas checar só direita/baixo deixaria uma
          // regressão futura (um transform, um passo revelado torto) invisível pela metade.
          const passa = Math.max(
            caixa.right - limite.right,
            caixa.bottom - limite.bottom,
            limite.left - caixa.left,
            limite.top - caixa.top,
          );
          if (passa > FOLGA) {
            const lugar = area?.contains(elemento) ? 'da zona de conteúdo' : 'do palco';
            yield { ...onde(slides, slide), mensagem: `<${elemento.nodeName.toLowerCase()}> passa ${Math.round(passa)} px ${lugar}.`, trecho: trechoDe(elemento) };
            continue;
          }
          // Transbordo que a caixa esconde, só onde ele existe: o marco 3c mediu que uma linha de código
          // larga não muda a caixa do <pre>, porque cada linha é um inline-block de largura fixa. Em
          // qualquer outro elemento, o scrollWidth de um ancestral só repetiria o transbordo do filho.
          // .katex-display é o mesmo caso: o KaTeX deixa a fórmula transbordar (overflow-x: visible)
          // sem alargar a própria caixa — medido no espécime, o mesmo padrão scrollWidth > clientWidth.
          if ((elemento.nodeName === 'PRE' || elemento.matches('.katex-display')) && elemento.scrollWidth > elemento.clientWidth + 1) {
            yield {
              ...onde(slides, slide),
              mensagem: `<${elemento.nodeName.toLowerCase()}> tem ${elemento.scrollWidth - elemento.clientWidth} px de conteúdo além da largura.`,
              trecho: trechoDe(elemento),
            };
          }
        }
      }
    },
  },
  {
    // Com a meta video="canto" (spec 5.2 e 4.4), nada da aula aparece no retângulo do vídeo — nem do
    // autor, nem do sistema. A mesma medida de composicao.transbordo: caixas na tela, com o retângulo
    // levado do palco para a tela pela escala do palco, e a mesma FOLGA. Sem a meta, não diz nada.
    // Um achado por elemento, e só pelo de fora: um <strong> dentro de um <p> que já entrou no canto
    // é o mesmo problema, com a mesma correção.
    nome: 'composicao.canto-video',
    *aplicar({ doc, slides, contrato, janela }) {
      if (!cantoLigado(doc, contrato)) return;
      const { esquerda, topo, largura, altura } = tokens.video;
      for (const slide of slides) {
        const palco = slide.getBoundingClientRect();
        const escala = escalaDoPalco(slide);
        const canto = {
          left: palco.left + esquerda * escala,
          top: palco.top + topo * escala,
          right: palco.left + (esquerda + largura) * escala,
          bottom: palco.top + (topo + altura) * escala,
        };
        const acusados = [];
        for (const elemento of elementosQuePintam(slide, janela)) {
          if (acusados.some((acusado) => acusado.contains(elemento))) continue;
          const caixa = elemento.getBoundingClientRect();
          if (!caixaValida(caixa)) continue;
          const largo = Math.min(caixa.right, canto.right) - Math.max(caixa.left, canto.left);
          const alto = Math.min(caixa.bottom, canto.bottom) - Math.max(caixa.top, canto.top);
          if (largo > FOLGA && alto > FOLGA) {
            acusados.push(elemento);
            yield {
              ...onde(slides, slide),
              mensagem: `<${elemento.nodeName.toLowerCase()}> entra ${Math.round(largo / escala)} × ${Math.round(alto / escala)} px `
                + `no canto reservado ao vídeo (x ≥ ${esquerda}, y ≥ ${topo}).`,
              trecho: trechoDe(elemento),
            };
          }
        }
      }
    },
  },
  {
    nome: 'composicao.linhas-titulo',
    *aplicar({ slides, contrato }) {
      for (const slide of slides) {
        const titulo = slide.querySelector('.area h1, .area h2');
        if (!titulo) continue;
        const layout = slide.getAttribute('data-layout');
        const chave = layout === 'capa' ? 'capa.h1.linhas' : layout === 'abertura' ? 'abertura.h2.linhas' : 'titulo.linhas';
        const limite = contrato.limites[chave];
        const linhas = contarLinhas(titulo);
        if (linhas > limite) {
          yield { ...onde(slides, slide), mensagem: `título renderizado em ${linhas} linhas (máx. ${limite}).`, trecho: trechoDe(titulo) };
        }
      }
    },
  },
  {
    nome: 'composicao.tamanho-minimo',
    *aplicar({ slides, contrato, janela }) {
      // Para texto de SVG a saída não é cortar texto, é dar largura à figura — ou, quando foi a altura
      // que a encolheu (limitadoPelaAltura), empilhar menos na vertical: as duas ações vêm do contrato
      // (acaoSvg e acaoSvgAltura), como a de todo achado, e não de uma frase escrita aqui.
      const { acaoSvg, acaoSvgAltura } = contrato.regras['composicao.tamanho-minimo'];
      for (const slide of slides) {
        const figuras = new Map();
        for (const elemento of elementosMedidos(slide)) {
          if (contrato.papeis.excecoes.some((seletor) => elemento.matches(seletor))) continue;
          const papel = papelDe(elemento, contrato.papeis);
          if (!papel) continue;
          if (elemento.closest('svg')) {
            if (!textoProprio(elemento)) continue;
            const medida = { ...medidaNoSvg(elemento, slide, janela), papel };
            registrarNaFigura(figuras, elemento, medida, umaCasa(medida.tamanho) < papel.minimo - FOLGA);
            continue;
          }
          const tamanho = umaCasa(Number.parseFloat(janela.getComputedStyle(elemento).fontSize));
          if (tamanho < papel.minimo - FOLGA) {
            yield {
              ...onde(slides, slide),
              mensagem: `<${elemento.nodeName.toLowerCase()}> em ${tamanho} px, abaixo do mínimo de ${papel.minimo} px do papel ${papel.nome}.`,
              trecho: trechoDe(elemento),
            };
          }
        }
        for (const [figura, { menor, elemento, abaixo }] of figuras) {
          if (abaixo === 0) continue;
          const { papel } = menor;
          // A largura que a figura precisaria para o menor texto chegar ao mínimo: a de hoje vezes a
          // razão entre o mínimo e o que se mede — medida, não suposta (com o viewBox de 640 do
          // gráfico e texto de 14, dá 640 px; spec 7.2). Arredondada a uma casa antes de subir para o
          // inteiro, a mesma precisão das medidas de tamanho: 368 × 14 / (14 × 0,575) é 640 na conta
          // e 640,0000000000001 no ponto flutuante, que Math.ceil sozinho levaria a 641.
          // Pela altura, a mesma conta, na dimensão que limitou.
          const svg = elemento.closest('svg');
          const pelaAltura = limitadoPelaAltura(svg, slide);
          const caixa = svg.getBoundingClientRect();
          const medida = (pelaAltura ? caixa.height : caixa.width) / escalaDoPalco(slide);
          const precisa = Math.ceil(umaCasa(medida * papel.minimo / menor.tamanho));
          const dimensao = pelaAltura
            ? `a figura encolheu pela altura: tem ${Math.round(medida)} px de altura no palco, e precisaria de ${precisa}, que o slide não tem`
            : `a figura tem ${Math.round(medida)} px de largura no palco e precisaria de ${precisa}`;
          yield {
            ...onde(slides, slide),
            mensagem: `texto de SVG em ${descreverMedida(menor)}, abaixo do mínimo de ${papel.minimo} px do papel ${papel.nome} `
              + `(${abaixo} ${abaixo === 1 ? 'texto' : 'textos'} abaixo do mínimo nesta figura); ${dimensao}.`,
            trecho: trechoDe(figura),
            acao: pelaAltura ? acaoSvgAltura : acaoSvg,
          };
        }
      }
    },
  },
  {
    nome: 'composicao.azul-pequeno',
    *aplicar({ slides, janela }) {
      for (const slide of slides) {
        const figuras = new Map();
        for (const elemento of elementosMedidos(slide)) {
          if (!elemento.textContent.trim()) continue;
          const estilo = janela.getComputedStyle(elemento);
          // Texto de SVG pinta com `fill`, não com `color`, e o font-size dele está em unidades do
          // viewBox: pelo mesmo método de tamanho-minimo, a medida é a do palco. É aqui que a spec
          // 4.2 ("texto em azul só com 32 px ou mais") fecha para SVG — vocabulario.azul-svg, que é
          // estática, lê o font-size do fonte e não tem como saber a escala da figura.
          if (elemento.closest('svg')) {
            if (!(elemento instanceof janela.SVGTextContentElement) || !textoProprio(elemento)) continue;
            if (estilo.fill !== AZUL) continue;
            const medida = medidaNoSvg(elemento, slide, janela);
            registrarNaFigura(figuras, elemento, medida, umaCasa(medida.tamanho) < MINIMO_AZUL - FOLGA);
            continue;
          }
          if (estilo.color !== AZUL) continue;
          const tamanho = Number.parseFloat(estilo.fontSize);
          if (tamanho < MINIMO_AZUL) {
            yield { ...onde(slides, slide), mensagem: `texto em azul com ${tamanho} px (mín. ${MINIMO_AZUL}).`, trecho: trechoDe(elemento) };
          }
        }
        for (const [figura, { menor, abaixo }] of figuras) {
          if (abaixo === 0) continue;
          yield {
            ...onde(slides, slide),
            mensagem: `texto de SVG em azul com ${descreverMedida(menor)} (mín. ${MINIMO_AZUL}; `
              + `${abaixo} ${abaixo === 1 ? 'texto' : 'textos'} em azul abaixo disso nesta figura).`,
            trecho: trechoDe(figura),
          };
        }
      }
    },
  },
  {
    nome: 'composicao.texto-no-amarelo',
    *aplicar({ slides, janela }) {
      for (const slide of slides) {
        for (const elemento of elementosMedidos(slide)) {
          const estilo = janela.getComputedStyle(elemento);
          if (estilo.backgroundColor !== AMARELO) continue;
          // O campo amarelo pinta o fundo; quem escreve texto nele são os descendentes, o próprio
          // incluído — pelo mesmo filtro de elementosMedidos, senão o miolo do KaTeX e o conteúdo de
          // aside.notas voltam a ser medidos aqui (Minor da revisão final do 4c).
          for (const dentro of [elemento, ...elemento.querySelectorAll('*')].filter(medivel)) {
            if (!dentro.textContent.trim()) continue;
            const cor = janela.getComputedStyle(dentro).color;
            if (cor !== TINTA) {
              yield { ...onde(slides, slide), mensagem: `texto sobre amarelo em ${cor}, não em tinta.`, trecho: trechoDe(dentro) };
            }
          }
        }
      }
    },
  },
];
