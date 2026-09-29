// Critérios medidos de alcance "slide" (spec 2026-09-28, 3.1). Cada um recebe a section do fonte e o
// contexto de avaliar() e devolve os achados daquele slide, sem nível nem ação: esses vêm da rubrica.
// Nenhum limiar mora aqui — todo número e toda lista saem de `rubrica.criterios[id]`.
import { onde, trechoDe, encurtar, plural } from '../../validador/validar.js';
import { itensDoConteudo, casaSeletor } from '../../validador/sequencia.js';
import { palavrasDe, segmentosDoTitulo } from '../../validador/regras/limites.js';

const NOTAS = 'aside.notas';

// O título que o critério lê em cada layout: o h2 onde há um; na afirmação, a própria frase, que faz
// ali o papel do título (o layout não tem h2).
function tituloDe(secao) {
  if (secao.getAttribute('data-layout') === 'afirmacao') return secao.querySelector(':scope > p.afirmacao');
  return secao.querySelector(':scope > h2');
}

// Caixa e pontuação não contam: "RESULTADOS." e "Resultados" são o mesmo rótulo.
function normalizar(texto) {
  return texto.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Os blocos de corpo como o validador os chama (contrato.blocosDeCorpo e os de fase 2), no nível da
// section e dentro de cada coluna — a grade conta pelo que carrega, não como um bloco só. O título,
// o lide e as notas não são bloco de corpo.
function blocosDe(elemento, contrato) {
  const seletores = [...contrato.blocosDeCorpo, ...(contrato.blocosDeCorpoFase2 ?? [])];
  const blocos = [];
  for (const item of itensDoConteudo(elemento)) {
    if (item.tipo === 'texto-solto') continue;
    if (item.tipo === 'elemento' && item.no.matches('div.colunas')) {
      for (const coluna of item.no.children) blocos.push(...blocosDe(coluna, contrato));
      continue;
    }
    if (item.tipo === 'elemento' && item.no.matches(`h1, h2, p.lide, ${NOTAS}`)) continue;
    if (seletores.some((seletor) => casaSeletor(item, seletor))) blocos.push(item);
  }
  return blocos;
}

const listasDe = (secao) => [...secao.querySelectorAll('ul, ol')].filter((lista) => !lista.closest(NOTAS));
const itensDaLista = (lista) => [...lista.children].filter((filho) => filho.nodeName === 'LI');

// As palavras que a plateia lê no corpo do slide. Conta como limites.palavras-corpo conta (palavrasDe:
// separa por espaço em branco, com fronteira de bloco, e já deixa de fora pre, code, aside.notas e o
// TeX), sobre uma cópia da section sem:
// - h1 e h2: o título tem limite próprio no contrato e não é "texto do corpo";
// - figure.grafico e figure.diagrama: o que está dentro é o JSON ou o DOT que o navegador desenha, e
//   não palavra que a plateia leia.
// O plano falava em `.katex`; no fonte o TeX ainda não foi renderizado — é `\( … \)` —, e é por
// isso que ele sai pelos segmentos de TeX de palavrasDe, e não por seletor.
function palavrasDoCorpo(secao) {
  const copia = secao.cloneNode(true);
  for (const fora of copia.querySelectorAll('h1, h2, figure.grafico, figure.diagrama')) fora.remove();
  return palavrasDe(copia);
}

// Figuras que precisam de crédito (plano, D3): figure com img ou svg e figure.grafico. figure.diagrama
// e as demos são desenhadas pelo próprio autor.
// Quais figuras pedem crédito vem da rubrica (`figuras`): o gráfico com dados e a imagem de arquivo.
// O `svg` escrito à mão no slide ficou de fora na revisão da 1.1.0 — é desenho do próprio autor,
// como o diagrama e a demo, e cobrá-lo dava conselho de ruído em todo o espécime.
function figurasComDados(secao, regra) {
  return [...secao.querySelectorAll('figure')].filter((figura) => !figura.closest(NOTAS)
    && regra.figuras.some((seletor) => figura.matches(seletor)));
}

function temCredito(figura, secao, regra) {
  if ([...secao.querySelectorAll('p.fonte')].some((fonte) => !fonte.closest(NOTAS))) return true;
  const legenda = figura.querySelector(':scope > figcaption');
  if (!legenda) return false;
  const texto = legenda.textContent.replace(/\s+/g, ' ');
  // Sem distinção de caixa: "fonte:" no começo da legenda é crédito como "Fonte:".
  const minusculo = texto.toLowerCase();
  return regra.marcadores.some((marcador) => minusculo.includes(marcador.toLowerCase()))
    || new RegExp(regra.padraoAno).test(texto);
}

export const CRITERIOS_DE_SLIDE = {
  'titulo-rotulo': {
    alcance: 'slide',
    *aplicar(secao, { slides, regra }) {
      if (!regra.layouts.includes(secao.getAttribute('data-layout'))) return;
      const titulo = tituloDe(secao);
      if (!titulo) return;
      const texto = segmentosDoTitulo(titulo).join(' ');
      const normal = normalizar(texto);
      const palavras = normal ? normal.split(' ').length : 0;
      const daLista = regra.rotulos.map(normalizar).includes(normal);
      if (!daLista && palavras > regra.maxPalavrasRotulo) return;
      const porque = daLista ? 'rótulo genérico' : `${plural(palavras, 'palavra', 'palavras')}, sem afirmar nada`;
      yield { ...onde(slides, secao), mensagem: `o título "${encurtar(texto, 60)}" é rótulo, não conclusão (${porque}).`, trecho: trechoDe(titulo) };
    },
  },
  elementos: {
    alcance: 'slide',
    *aplicar(secao, { slides, regra, contrato }) {
      const quantos = blocosDe(secao, contrato).length;
      if (quantos > regra.maxElementos) {
        yield { ...onde(slides, secao), mensagem: `${plural(quantos, 'bloco', 'blocos')} no corpo (rubrica: até ${regra.maxElementos}).`, trecho: null };
      }
    },
  },
  itens: {
    alcance: 'slide',
    *aplicar(secao, { slides, regra }) {
      for (const lista of listasDe(secao)) {
        const quantos = itensDaLista(lista).length;
        if (quantos > regra.maxItens) {
          yield { ...onde(slides, secao), mensagem: `lista com ${quantos} itens (rubrica: até ${regra.maxItens}).`, trecho: trechoDe(lista) };
        }
      }
    },
  },
  revelacao: {
    alcance: 'slide',
    *aplicar(secao, { slides, regra }) {
      for (const lista of listasDe(secao)) {
        const itens = itensDaLista(lista);
        const revelada = lista.hasAttribute('data-passo') || itens.some((item) => item.hasAttribute('data-passo'));
        if (itens.length > regra.maxItensSemPasso && !revelada) {
          yield { ...onde(slides, secao), mensagem: `lista de ${itens.length} itens aparece inteira de uma vez.`, trecho: trechoDe(lista) };
        }
      }
    },
  },
  paineis: {
    alcance: 'slide',
    // A spec diz "figure com mais de uma imagem", mas o contrato já exige exatamente uma img ou um
    // svg por figure (contrato.filhos.figure.exatamenteUmDe): numa aula válida isso nunca acontece. O
    // painel múltiplo que numa aula válida existe é o slide com várias figuras lado a lado — é o que
    // se mede aqui.
    *aplicar(secao, { slides, regra }) {
      const figuras = [...secao.querySelectorAll('figure')].filter((figura) => !figura.closest(NOTAS));
      if (figuras.length > regra.maxFiguras) {
        yield { ...onde(slides, secao), mensagem: `${plural(figuras.length, 'figura', 'figuras')} no mesmo slide.`, trecho: null };
      }
    },
  },
  credito: {
    alcance: 'slide',
    *aplicar(secao, { slides, regra }) {
      for (const figura of figurasComDados(secao, regra)) {
        if (temCredito(figura, secao, regra)) continue;
        yield { ...onde(slides, secao), mensagem: 'figura sem crédito: nem linha de fonte no slide nem legenda que diga a origem.', trecho: trechoDe(figura) };
      }
    },
  },
  'palavras-slide': {
    alcance: 'slide',
    *aplicar(secao, { slides, regra }) {
      const palavras = palavrasDoCorpo(secao);
      if (palavras > regra.maxPalavras) {
        yield { ...onde(slides, secao), mensagem: `${plural(palavras, 'palavra', 'palavras')} no slide (rubrica: até ${regra.maxPalavras}).`, trecho: null };
      }
    },
  },
};
