// Regras estáticas de matemática e de recursos (spec 9.2): o que dá para conferir no fonte, sem
// carregar KaTeX, imagem nem script. O que precisa de carga fica para o marco 4c.
import { onde, trechoDe } from '../validar.js';
import { segmentosDeTex, textosComTex, textosDe } from '../../componentes/tex.js';

// $…$ com barra, expoente ou índice quase sempre é matemática escrita com o delimitador errado.
// Global para matchAll: cada ocorrência do segmento é reportada, não só a primeira.
const CIFRAO_SUSPEITO = /\$[^$\n]*[\\^_][^$\n]*\$/g;

function* segmentosDaSecao(secao) {
  for (const no of textosComTex(secao)) {
    for (const segmento of segmentosDeTex(no.data)) {
      if (segmento.tipo !== 'texto') yield segmento;
    }
  }
}

export const regras = [
  {
    nome: 'matematica.comando-proibido',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const segmento of segmentosDaSecao(secao)) {
          for (const comando of contrato.proibidos.comandosTex) {
            // \color pega \colorbox por prefixo, então a fronteira é o fim do nome do comando.
            if (!new RegExp(`${comando.replace('\\', '\\\\')}(?![a-zA-Z])`).test(segmento.tex)) continue;
            yield {
              ...onde(slides, secao),
              mensagem: `comando proibido no TeX: ${comando}.`,
              trecho: segmento.trecho,
            };
          }
          for (const padrao of contrato.proibidos.comandosTexPorPadrao ?? []) {
            // Global para matchAll: \redA{x} + \blue{y} no mesmo segmento precisa dos dois achados.
            for (const achado of segmento.tex.matchAll(new RegExp(padrao, 'g'))) {
              yield { ...onde(slides, secao), mensagem: `comando de cor no TeX: ${achado[0]}.`, trecho: segmento.trecho };
            }
          }
        }
      }
    },
  },
  {
    nome: 'matematica.cifrao-suspeito',
    *aplicar({ slides }) {
      for (const secao of slides) {
        for (const no of textosDe(secao)) {
          // Cada trecho de texto por si, nunca junto com o vizinho do outro lado de um \( … \): um $
          // antes de uma equação não é par do $ que vem depois dela (cifrão dentro do TeX é cifrão
          // mesmo, por isso os segmentos que não são de texto ficam de fora, um a um).
          for (const segmento of segmentosDeTex(no.data)) {
            if (segmento.tipo !== 'texto') continue;
            for (const achado of segmento.texto.matchAll(CIFRAO_SUSPEITO)) {
              yield { ...onde(slides, secao), mensagem: `"${achado[0]}" parece matemática entre cifrões.`, trecho: achado[0] };
            }
          }
        }
      }
    },
  },
  {
    nome: 'recursos.alt',
    *aplicar({ slides }) {
      for (const secao of slides) {
        for (const imagem of secao.querySelectorAll('img')) {
          if (!imagem.hasAttribute('alt')) {
            yield { ...onde(slides, secao), mensagem: 'imagem sem alt.', trecho: trechoDe(imagem) };
          }
        }
      }
    },
  },
  {
    nome: 'recursos.imagem-externa',
    *aplicar({ slides }) {
      for (const secao of slides) {
        // Esquema é sensível a caixa no seletor por padrão; o "i" casa HTTPS:// como https://.
        for (const imagem of secao.querySelectorAll('img[src^="https://" i]')) {
          yield { ...onde(slides, secao), mensagem: `imagem de fora: "${imagem.getAttribute('src')}".`, trecho: trechoDe(imagem) };
        }
      }
    },
  },
  {
    nome: 'recursos.linguagem',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const pre of secao.querySelectorAll('pre[data-lang]')) {
          const linguagem = pre.getAttribute('data-lang');
          if (!contrato.linguagens.includes(linguagem)) {
            yield { ...onde(slides, secao), mensagem: `linguagem fora da lista em data-lang: "${linguagem}".`, trecho: trechoDe(pre) };
          }
        }
      }
    },
  },
];
