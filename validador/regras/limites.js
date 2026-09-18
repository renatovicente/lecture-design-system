// Regras de limite (spec 5.2, 5.3 e 9.2): o que cabe no slide, contado no fonte.
// Os números vêm todos de contrato.limites; o código só sabe contar.
import { onde, trechoDe, plural } from '../validar.js';
import { textoSemTex } from '../../componentes/tex.js';
import { codigoDoBloco } from '../../componentes/codigo.js';

// Segmentos de um título são os trechos entre <br> (spec 5.3), lidos pelo que aparece: o TeX conta
// pelo texto renderizado, não pelo fonte, senão \frac{1}{2} valeria doze caracteres. Um <br> solto ou
// no final não cria segmento vazio: título é "quantas linhas têm texto", não "quantas quebras têm".
export function segmentosDoTitulo(elemento) {
  if (!elemento) return [];
  const segmentos = [[]];
  for (const no of elemento.childNodes) {
    if (no.nodeType === 1 && no.nodeName === 'BR') segmentos.push([]);
    else segmentos.at(-1).push(no.textContent ?? '');
  }
  return segmentos.map((partes) => textoSemTex(partes.join('')).trim()).filter(Boolean);
}

// Fora da contagem de palavras (spec 5.3): TeX não conta pelo fonte (conta pelo texto renderizado,
// abaixo), pre/code/aside.notas ficam de fora. Lista própria daqui, não a exclusão de matemática de
// componentes/tex.js: lá svg também fica fora (TeX nunca aparece dentro de um SVG), mas aqui não —
// palavra dentro de um <text> de SVG é palavra do slide como outra qualquer.
const FORA_DA_CONTAGEM = 'pre, code, aside.notas';

// Elementos inline (spec 4.2): entrar ou sair deles não separa palavra, então "pa<strong>la</strong>
// vra" é uma palavra só, como o leitor vê. Todo o resto separa — <br> incluso, que não tem filhos —
// porque a fronteira que interessa é a de bloco, não a de nó de texto.
const INLINE = new Set(['strong', 'em', 'sub', 'sup', 'a', 'span']);

// Monta o texto para contar palavras, pondo um espaço só ao entrar/sair de um elemento que não é
// inline. É por isso que "<h2>T</h2><p>corpo" sem espaço no fonte ainda separa "T" de "corpo" (dois
// blocos), e "pa<strong>la</strong>vra" não separa "pa" de "vra" (strong é inline).
function textoDeContagem(elemento) {
  let texto = '';
  const andar = (no) => {
    if (no.nodeType === 3) { texto += no.nodeValue; return; }
    if (no.nodeType !== 1 || no.matches(FORA_DA_CONTAGEM)) return;
    const inline = INLINE.has(no.nodeName.toLowerCase());
    if (!inline) texto += ' ';
    for (const filho of no.childNodes) andar(filho);
    if (!inline) texto += ' ';
  };
  for (const filho of elemento.childNodes) andar(filho);
  return texto;
}

// Palavras são as sequências separadas por espaço nos nós de texto (spec 5.3): o texto vem de
// textoDeContagem, que já resolve a fronteira de bloco acima — nunca do textContent do galho
// inteiro, que colaria dois blocos vizinhos sem espaço no fonte num token só.
export function palavrasDe(elemento) {
  return textoSemTex(textoDeContagem(elemento)).split(/\s+/).filter(Boolean).length;
}

function textoDe(elemento) {
  return textoSemTex(elemento.textContent).trim();
}

// Cada alvo de limite de comprimento: seletor, chave do limite e como a mensagem chama a coisa.
const COMPRIMENTOS = [
  ['limites.pergunta', 'p.pergunta', 'pergunta.caracteres', 'a pergunta'],
  ['limites.lide', 'p.lide', 'lide.caracteres', 'o lide'],
  ['limites.afirmacao', 'p.afirmacao', 'afirmacao.caracteres', 'a afirmação'],
  ['limites.fonte', 'p.fonte', 'fonte.caracteres', 'a fonte'],
  ['limites.legenda', 'figcaption', 'legenda.caracteres', 'a legenda'],
  ['limites.proxima', 'p.proxima', 'proxima.caracteres', 'a próxima aula'],
];

function* porComprimento(seletor, chave, rotulo, { slides, contrato }) {
  const limite = contrato.limites[chave];
  for (const secao of slides) {
    for (const elemento of secao.querySelectorAll(seletor)) {
      const texto = textoDe(elemento);
      if (texto.length > limite) {
        yield { ...onde(slides, secao), mensagem: `${rotulo} tem ${texto.length} caracteres (máx. ${limite}).`, trecho: trechoDe(elemento) };
      }
    }
  }
}

// Título de cada layout: o seletor e as chaves de limite que valem para ele.
const TITULOS = {
  capa: { seletor: 'h1', porSegmento: 'capa.h1.caracteresPorSegmento', segmentos: 'capa.h1.segmentos' },
  abertura: { seletor: 'h2', porSegmento: 'abertura.h2.caracteresPorSegmento', segmentos: 'abertura.h2.segmentos' },
  outros: { seletor: 'h2', porSegmento: 'titulo.caracteresPorSegmento', segmentos: 'titulo.segmentos' },
};

function tituloDoSlide(secao) {
  const layout = secao.getAttribute('data-layout');
  const regra = TITULOS[layout] ?? TITULOS.outros;
  return { regra, elemento: secao.querySelector(`:scope > ${regra.seletor}`) };
}

// Quantas linhas depois desta ainda vêm na mesma seção (thead/tbody/tfoot, ou a tabela toda se não
// houver uma): rowspan="0" (HTML) é "até o fim da seção", não uma linha a mais.
function linhasRestantesNaSecao(tabela, linha) {
  const secao = linha.closest('thead, tbody, tfoot') ?? tabela;
  const linhasDaSecao = [...secao.querySelectorAll(':scope > tr')];
  return linhasDaSecao.length - linhasDaSecao.indexOf(linha) - 1;
}

// Quantas linhas depois desta uma célula ainda ocupa: sem o atributo, nenhuma (é a própria linha só);
// rowspan="0" ocupa até o fim da seção; um número válido ocupa rowspan - 1; qualquer outra coisa
// (ausente, inválida ou negativa) é o padrão do HTML, 1, ou seja, nenhuma a mais.
function restamDoRowspan(tabela, linha, celula) {
  const bruto = celula.getAttribute('rowspan');
  if (bruto === null) return 0;
  const numero = Number.parseInt(bruto, 10);
  if (numero === 0) return linhasRestantesNaSecao(tabela, linha);
  return (Number.isNaN(numero) || numero < 1 ? 1 : numero) - 1;
}

export const regras = [
  {
    nome: 'limites.titulo',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        const { regra, elemento } = tituloDoSlide(secao);
        const limite = contrato.limites[regra.porSegmento];
        for (const segmento of segmentosDoTitulo(elemento)) {
          if (segmento.length > limite) {
            yield { ...onde(slides, secao), mensagem: `título com ${segmento.length} caracteres num segmento (máx. ${limite}).`, trecho: segmento };
          }
        }
      }
    },
  },
  {
    nome: 'limites.segmentos-titulo',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        const { regra, elemento } = tituloDoSlide(secao);
        const limite = contrato.limites[regra.segmentos];
        const quantos = segmentosDoTitulo(elemento).length;
        if (quantos > limite) {
          yield { ...onde(slides, secao), mensagem: `título em ${plural(quantos, 'segmento', 'segmentos')} (máx. ${limite}).`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'limites.nome-curto',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['abertura.dataCurto.caracteres'];
      for (const secao of slides) {
        const curto = secao.getAttribute('data-curto');
        if (curto !== null && curto.trim().length > limite) {
          yield { ...onde(slides, secao), mensagem: `data-curto com ${curto.trim().length} caracteres (máx. ${limite}).` };
        }
      }
    },
  },
  ...COMPRIMENTOS.map(([nome, seletor, chave, rotulo]) => ({
    nome,
    aplicar: (contexto) => porComprimento(seletor, chave, rotulo, contexto),
  })),
  {
    nome: 'limites.palavras-corpo',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['corpo.palavras'];
      for (const secao of slides) {
        if (secao.getAttribute('data-layout') !== 'conteudo') continue;
        // Por construção, não por subtração: tira o título e o lide (cada um com limite próprio) e
        // conta só o que sobra. Subtrair a contagem do título dava conta errada quando ele tinha <br>.
        const corpo = secao.cloneNode(true);
        for (const fora of corpo.querySelectorAll('h1, h2, p.lide')) fora.remove();
        const palavras = palavrasDe(corpo);
        if (palavras > limite) {
          yield { ...onde(slides, secao), mensagem: `${plural(palavras, 'palavra', 'palavras')} no corpo (máx. ${limite}).` };
        }
      }
    },
  },
  {
    nome: 'limites.palavras-coluna',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['coluna.palavras'];
      for (const secao of slides) {
        for (const coluna of secao.querySelectorAll('div.colunas > div')) {
          const palavras = palavrasDe(coluna);
          if (palavras > limite) {
            yield { ...onde(slides, secao), mensagem: `${plural(palavras, 'palavra', 'palavras')} numa coluna (máx. ${limite}).`, trecho: trechoDe(coluna) };
          }
        }
      }
    },
  },
  {
    nome: 'limites.itens',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['lista.itens'];
      for (const secao of slides) {
        for (const lista of secao.querySelectorAll('ul, ol.passos')) {
          const itens = lista.querySelectorAll(':scope > li').length;
          if (itens > limite) {
            yield { ...onde(slides, secao), mensagem: `lista com ${plural(itens, 'item', 'itens')} (máx. ${limite}).`, trecho: trechoDe(lista) };
          }
        }
      }
    },
  },
  {
    nome: 'limites.destaques',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['destaque.maxPorSlide'];
      for (const secao of slides) {
        const quantos = secao.querySelectorAll('aside.destaque').length;
        if (quantos > limite) yield { ...onde(slides, secao), mensagem: `${plural(quantos, 'destaque', 'destaques')} no slide (máx. ${limite}).` };
      }
    },
  },
  {
    nome: 'limites.alertas',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['alerta.maxPorSlide'];
      for (const secao of slides) {
        const quantos = secao.querySelectorAll('aside.alerta').length;
        if (quantos > limite) yield { ...onde(slides, secao), mensagem: `${plural(quantos, 'alerta', 'alertas')} no slide (máx. ${limite}).` };
      }
    },
  },
  {
    nome: 'limites.rotulo',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['rotulo.caracteres'];
      for (const secao of slides) {
        for (const elemento of secao.querySelectorAll('[data-rotulo]')) {
          const rotulo = elemento.getAttribute('data-rotulo').trim();
          if (rotulo.length > limite) {
            yield { ...onde(slides, secao), mensagem: `rótulo com ${rotulo.length} caracteres (máx. ${limite}).`, trecho: trechoDe(elemento) };
          }
        }
      }
    },
  },
  {
    nome: 'limites.sintese',
    *aplicar({ slides, contrato }) {
      const maxItens = contrato.limites['sintese.itens'];
      const maxTexto = contrato.limites['sintese.caracteresPorItem'];
      for (const secao of slides) {
        for (const sintese of secao.querySelectorAll('ol.sintese')) {
          const itens = [...sintese.querySelectorAll(':scope > li')];
          if (itens.length > maxItens) {
            yield { ...onde(slides, secao), mensagem: `síntese com ${plural(itens.length, 'item', 'itens')} (máx. ${maxItens}).` };
          }
          for (const item of itens) {
            const texto = textoDe(item);
            if (texto.length > maxTexto) {
              yield { ...onde(slides, secao), mensagem: `item da síntese com ${texto.length} caracteres (máx. ${maxTexto}).`, trecho: trechoDe(item) };
            }
          }
        }
      }
    },
  },
  {
    nome: 'limites.codigo-linhas',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['codigo.linhas'];
      for (const secao of slides) {
        for (const pre of secao.querySelectorAll('pre')) {
          const linhas = codigoDoBloco(pre).split('\n').length;
          if (linhas > limite) {
            yield { ...onde(slides, secao), mensagem: `bloco com ${plural(linhas, 'linha', 'linhas')} de código (máx. ${limite}).` };
          }
        }
      }
    },
  },
  {
    nome: 'limites.codigo-colunas',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['codigo.colunas'];
      for (const secao of slides) {
        for (const pre of secao.querySelectorAll('pre')) {
          const maior = codigoDoBloco(pre).split('\n').reduce((maximo, linha) => Math.max(maximo, linha.length), 0);
          if (maior > limite) {
            yield { ...onde(slides, secao), mensagem: `linha de código com ${maior} colunas (máx. ${limite}).` };
          }
        }
      }
    },
  },
  {
    nome: 'limites.tabela',
    *aplicar({ slides, contrato }) {
      const maxLinhas = contrato.limites['tabela.linhasDeDados'];
      const maxColunas = contrato.limites['tabela.colunas'];
      for (const secao of slides) {
        for (const tabela of secao.querySelectorAll('table')) {
          const linhas = [...tabela.querySelectorAll('tr')];
          const dados = linhas.filter((linha) => !linha.closest('thead')).length;
          if (dados > maxLinhas) {
            yield { ...onde(slides, secao), mensagem: `tabela com ${plural(dados, 'linha', 'linhas')} de dados (máx. ${maxLinhas}).` };
          }
          // A largura é a maior linha simulando a grade: colspan da própria linha, mais os slots que
          // ela herda de rowspan de linhas anteriores ainda ativos (rowspan não some na linha de baixo).
          let pendentes = [];
          let colunas = 0;
          for (const linha of linhas) {
            const propria = [...linha.children]
              .reduce((soma, celula) => soma + (Number.parseInt(celula.getAttribute('colspan') ?? '1', 10) || 1), 0);
            colunas = Math.max(colunas, pendentes.length + propria);
            pendentes = pendentes.map((restam) => restam - 1).filter((restam) => restam > 0);
            for (const celula of linha.children) {
              const colspan = Number.parseInt(celula.getAttribute('colspan') ?? '1', 10) || 1;
              const restam = restamDoRowspan(tabela, linha, celula);
              if (restam > 0) for (let i = 0; i < colspan; i += 1) pendentes.push(restam);
            }
          }
          if (colunas > maxColunas) {
            yield { ...onde(slides, secao), mensagem: `tabela com ${plural(colunas, 'coluna', 'colunas')} (máx. ${maxColunas}).` };
          }
        }
      }
    },
  },
  {
    nome: 'limites.metadado',
    *aplicar({ doc, contrato }) {
      for (const [nome, regra] of Object.entries(contrato.metadados)) {
        if (!regra.max) continue;
        const valor = doc.querySelector(`meta[name="${nome}"]`)?.getAttribute('content')?.trim() ?? '';
        if (valor.length > regra.max) {
          yield { mensagem: `a meta "${nome}" tem ${valor.length} caracteres (máx. ${regra.max}).` };
        }
      }
    },
  },
];
