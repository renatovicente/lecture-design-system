// Regras de limite (spec 5.2, 5.3 e 9.2): o que cabe no slide, contado no fonte.
// Os números vêm todos de contrato.limites; o código só sabe contar.
import { onde, trechoDe, plural } from '../validar.js';
import { textoSemTex } from '../../componentes/tex.js';
import { codigoDoBloco } from '../../componentes/codigo.js';

// Fora da contagem de palavras (spec 5.3): TeX vira uma palavra, código e notas não contam.
const FORA_DA_CONTAGEM = 'pre, code, aside.notas';

// Segmentos de um título são os trechos entre <br> (spec 5.3), lidos pelo que aparece: o TeX conta
// pelo texto renderizado, não pelo fonte, senão \frac{1}{2} valeria doze caracteres.
export function segmentosDoTitulo(elemento) {
  if (!elemento) return [];
  const segmentos = [[]];
  for (const no of elemento.childNodes) {
    if (no.nodeType === 1 && no.nodeName === 'BR') segmentos.push([]);
    else segmentos.at(-1).push(no.textContent ?? '');
  }
  return segmentos.map((partes) => textoSemTex(partes.join('')).trim());
}

export function palavrasDe(elemento) {
  const copia = elemento.cloneNode(true);
  for (const fora of copia.querySelectorAll(FORA_DA_CONTAGEM)) fora.remove();
  return textoSemTex(copia.textContent).split(/\s+/).filter(Boolean).length;
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

function* porComprimento(nome, seletor, chave, rotulo, { slides, contrato }) {
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
    aplicar: (contexto) => porComprimento(nome, seletor, chave, rotulo, contexto),
  })),
  {
    nome: 'limites.palavras-corpo',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['corpo.palavras'];
      for (const secao of slides) {
        if (secao.getAttribute('data-layout') !== 'conteudo') continue;
        const palavras = palavrasDe(secao) - segmentosDoTitulo(tituloDoSlide(secao).elemento).join(' ').split(/\s+/).filter(Boolean).length;
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
          // A largura é a maior linha, contando colspan: é o que ocupa coluna de verdade.
          const colunas = linhas.reduce((maximo, linha) => Math.max(maximo, [...linha.children]
            .reduce((soma, celula) => soma + (Number.parseInt(celula.getAttribute('colspan') ?? '1', 10) || 1), 0)), 0);
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
