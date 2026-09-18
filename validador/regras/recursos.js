// Regras estáticas de matemática e de recursos (spec 9.2): o que dá para conferir no fonte, sem
// carregar KaTeX, imagem nem script. O que precisa de carga fica para o marco 4c.
import { onde, trechoDe } from '../validar.js';
import { segmentosDeTex, textosComTex, textosDe } from '../../componentes/tex.js';

// $…$ com barra, expoente ou índice quase sempre é matemática escrita com o delimitador errado.
const CIFRAO_SUSPEITO = /\$[^$\n]*[\\^_][^$\n]*\$/;

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
            const achado = new RegExp(padrao).exec(segmento.tex);
            if (achado) {
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
          // Só o texto que sobra fora do TeX: cifrão dentro de \( … \) é cifrão mesmo.
          const fora = segmentosDeTex(no.data).filter((s) => s.tipo === 'texto').map((s) => s.texto).join(' ');
          const achado = CIFRAO_SUSPEITO.exec(fora);
          if (achado) yield { ...onde(slides, secao), mensagem: `"${achado[0]}" parece matemática entre cifrões.`, trecho: achado[0] };
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
        for (const imagem of secao.querySelectorAll('img[src^="https://"]')) {
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
