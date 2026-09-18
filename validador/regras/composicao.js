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
      if (peso > maior) {
        maior = peso;
        escolhido = { nome, minimo: papel.minimo, seletor };
      }
    }
  }
  return escolhido;
}

// Elementos que o autor escreveu ou que o sistema gerou, fora o que não tem caixa própria.
function* elementosMedidos(slide) {
  for (const elemento of slide.querySelectorAll('*')) {
    if (elemento.nodeName === 'BR') continue;
    if (elemento.closest('.katex, .katex-display')) continue;
    yield elemento;
  }
}

function caixaValida(caixa) {
  return caixa.width > 0 && caixa.height > 0;
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
          const passa = Math.max(caixa.right - limite.right, caixa.bottom - limite.bottom);
          if (passa > FOLGA) {
            const lugar = area?.contains(elemento) ? 'da zona de conteúdo' : 'do palco';
            yield { ...onde(slides, slide), mensagem: `<${elemento.nodeName.toLowerCase()}> passa ${Math.round(passa)} px ${lugar}.`, trecho: trechoDe(elemento) };
            continue;
          }
          // Transbordo que a caixa esconde, só onde ele existe: o marco 3c mediu que uma linha de código
          // larga não muda a caixa do <pre>, porque cada linha é um inline-block de largura fixa. Em
          // qualquer outro elemento, o scrollWidth de um ancestral só repetiria o transbordo do filho.
          if (elemento.nodeName === 'PRE' && elemento.scrollWidth > elemento.clientWidth + 1) {
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
    *aplicar({ slides, contrato, janela }) {
      for (const slide of slides) {
        const titulo = slide.querySelector('.area h1, .area h2');
        if (!titulo) continue;
        const layout = slide.getAttribute('data-layout');
        const chave = layout === 'capa' ? 'capa.h1.linhas' : layout === 'abertura' ? 'abertura.h2.linhas' : 'titulo.linhas';
        const limite = contrato.limites[chave];
        const entrelinha = Number.parseFloat(janela.getComputedStyle(titulo).lineHeight);
        const linhas = Math.round(titulo.getBoundingClientRect().height / entrelinha);
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
