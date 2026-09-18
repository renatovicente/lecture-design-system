// Regras de composição (spec 9.2 e 9.3): o que só o documento renderizado sabe dizer.
// Roda dentro da página — no navegador, no passo 6, antes do motor; no build, no Chrome headless.
// Só API padrão do DOM, como o resto de validador/.
import { onde, trechoDe } from '../validar.js';

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
function* elementosMedidos(slide) {
  for (const elemento of slide.querySelectorAll('*')) {
    if (elemento.nodeName === 'BR') continue;
    if (elemento.closest('aside.notas')) continue;
    if (elemento.parentElement?.closest('.katex, .katex-display')) continue;
    yield elemento;
  }
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
      for (const slide of slides) {
        for (const elemento of elementosMedidos(slide)) {
          if (contrato.papeis.excecoes.some((seletor) => elemento.matches(seletor))) continue;
          const papel = papelDe(elemento, contrato.papeis);
          if (!papel) continue;
          const tamanho = Number.parseFloat(janela.getComputedStyle(elemento).fontSize);
          if (tamanho < papel.minimo - FOLGA) {
            yield {
              ...onde(slides, slide),
              mensagem: `<${elemento.nodeName.toLowerCase()}> em ${tamanho} px, abaixo do mínimo de ${papel.minimo} px do papel ${papel.nome}.`,
              trecho: trechoDe(elemento),
            };
          }
        }
      }
    },
  },
  {
    nome: 'composicao.azul-pequeno',
    *aplicar({ slides, janela }) {
      for (const slide of slides) {
        for (const elemento of elementosMedidos(slide)) {
          if (!elemento.textContent.trim()) continue;
          const estilo = janela.getComputedStyle(elemento);
          if (estilo.color !== AZUL) continue;
          const tamanho = Number.parseFloat(estilo.fontSize);
          if (tamanho < MINIMO_AZUL) {
            yield { ...onde(slides, slide), mensagem: `texto em azul com ${tamanho} px (mín. ${MINIMO_AZUL}).`, trecho: trechoDe(elemento) };
          }
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
          // O campo amarelo pinta o fundo; quem escreve texto nele são os descendentes, o próprio incluído.
          for (const dentro of [elemento, ...elemento.querySelectorAll('*')]) {
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
