// Regras estáticas de matemática e de recursos (spec 9.2): o que dá para conferir no fonte, sem
// carregar KaTeX, imagem nem script. O que precisa de carga fica para o marco 4c.
import { onde, trechoDe, encurtar } from '../validar.js';
import { segmentosDeTex, textosComTex, textosDe } from '../../componentes/tex.js';

// $…$ com barra, expoente ou índice quase sempre é matemática escrita com o delimitador errado.
// Global para matchAll: cada ocorrência do segmento é reportada, não só a primeira.
const CIFRAO_SUSPEITO = /\$[^$\n]*[\\^_][^$\n]*\$/g;

// Os segmentos de TeX saem antes da medição: dentro de \( \) e \[ \] quem desenha é o KaTeX, com as
// fontes dele. Mesmo recorte que limites.palavras-corpo usa para "sem contar TeX" (spec 5.3).
const semTex = (texto) => texto.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, ' ');

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
    nome: 'matematica.simbolo-fora-do-tex',
    // Reusa textosDe de componentes/tex.js — o andador que já responde "onde a matemática pode
    // estar" (pula pre, code, script, style, textarea, svg, [data-tex]) — em vez de escrever um
    // segundo andador. É a pergunta certa aqui: TeX nunca aparece dentro de um SVG (o mesmo motivo
    // que exclui svg em componentes/tex.js), então um símbolo lá não tem como virar "escreva em
    // TeX". Diferente de limites.js:FORA_DA_CONTAGEM, que por isso NÃO reusa este andador — ali a
    // pergunta é "quantas palavras tem o slide", e uma palavra dentro de <text> de SVG conta como
    // qualquer outra (marco 4b: reusar o andador errado para contar palavras cegou a contagem
    // para SVG; reusar o andador certo aqui evita o mesmo defeito na direção oposta).
    *aplicar({ slides, contrato, cobertura }) {
      // Sem cobertura no contexto (validação sem o arquivo gerado), a regra se cala. Acusar tudo
      // seria pior que não acusar nada: um cobertura.json ausente viraria centenas de erros falsos.
      if (!cobertura) return;
      for (const secao of slides) {
        const vistos = new Set();
        for (const no of textosDe(secao)) {
          // Fora de TeX: os segmentos entre \( \) e \[ \] saem do texto antes de medir.
          for (const caractere of semTex(no.textContent)) {
            const ponto = caractere.codePointAt(0);
            // Espaço, tabulação e quebra de linha nunca têm glifo em cobertura.json (mesmo corte
            // de build/cobertura.mjs:UTILIZAVEL, > 0x20) — sem esta guarda, todo espaço do texto
            // corrido virava um falso "sem glifo" (medido: quebrava as duas fixtures de tipografia
            // com glifo do passo 1 deste teste).
            if (ponto <= 0x20 || cobertura.has(ponto) || vistos.has(ponto)) continue;
            vistos.add(ponto);
            yield {
              ...onde(slides, secao),
              mensagem: `caractere sem glifo nas fontes embutidas: "${caractere}" (U+${ponto.toString(16).toUpperCase().padStart(4, '0')}).`,
              trecho: encurtar(no.textContent),
            };
          }
        }
      }
    },
  },
  {
    nome: 'recursos.alt',
    *aplicar({ slides, contrato }) {
      // contrato.html.atributos.img.alt.obrigatorio é o dado; o código só lê, não decide sozinho.
      if (!contrato.html.atributos.img.alt.obrigatorio) return;
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
