// Regras estáticas de matemática e de recursos (spec 9.2): o que dá para conferir no fonte, sem
// carregar KaTeX, imagem nem script. O que precisa de carga fica para o marco 4c.
import { onde, trechoDe, encurtar } from '../validar.js';
import { segmentosDeTex, textosComTex, textosDe } from '../../componentes/tex.js';
import {
  TIPOS_DE_GRAFICO, TIPOS_COM_ZERO_EM_Y, problemaDosDados, colunasAusentes, mensagemDeColunasAusentes,
} from '../../componentes/graficos.js';

// $…$ com barra, expoente ou índice quase sempre é matemática escrita com o delimitador errado.
// Global para matchAll: cada ocorrência do segmento é reportada, não só a primeira.
const CIFRAO_SUSPEITO = /\$[^$\n]*[\\^_][^$\n]*\$/g;

// Os segmentos de TeX saem antes da medição: dentro de \( \) e \[ \] quem desenha é o KaTeX, com as
// fontes dele. Mesmo recorte que limites.palavras-corpo usa para "sem contar TeX" (spec 5.3).
const semTex = (texto) => texto.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, ' ');

// Nada aqui desenha glifo nenhum, então nada aqui pode "faltar" um: controles C0 e espaço comum
// (\x00-\x20, como antes), \s (que já fecha as larguras de espaço Unicode — U+2002 em space, U+2009
// thin space, U+2000-200A em geral — e o BOM, U+FEFF) e Default_Ignorable_Code_Point, a propriedade
// Unicode para o que sobra sem desenhar nada (largura zero U+200B, ZWJ/ZWNJ, seletores de variação).
// Achado do revisor: só `> 0x20` deixava passar U+2003 e companhia, que colado de um editor vira
// falso "sem glifo" — mesma classe do defeito de espaço comum que o passo 1 já tinha achado.
// Exportada porque saida.glifo-ausente (marco 5b) reusa o mesmo recorte sobre o HTML final: o corte
// de invisível não muda com o texto vindo do fonte ou do build, só a cobertura de glifo muda.
export const INVISIVEL = /[\x00-\x20\s\p{Default_Ignorable_Code_Point}]/u;

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
            // Espaço e invisível nunca têm glifo em cobertura.json — sem esta guarda, um deles no
            // texto corrido vira falso "sem glifo" (medido, duas vezes: primeiro só com espaço
            // comum, quebrando as fixtures de tipografia do passo 1; depois com U+2003 e companhia,
            // achado do revisor — ver INVISIVEL acima).
            if (INVISIVEL.test(caractere) || cobertura.has(ponto) || vistos.has(ponto)) continue;
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
  {
    // Gráficos (spec 7.2): confere a especificação JSON de figure.grafico ANTES de desenharGraficos
    // (componentes/graficos.js) tentar desenhar — spec 9.1 pede problema e ação legíveis ao autor, e
    // o catch de desenharGraficos devolve erro.message de uma função interna, não de um validador.
    //
    // Estática: roda sobre o FONTE, nunca o documento renderizado (spec 9.3: "recursos.grafico | o
    // fonte, sem cromo e sem HTML renderizado"). Isso importa porque desenharGraficos ACRESCENTA o
    // svg ao lado do script (script.after), não o substitui — mas como toda regra estática já lê o
    // fonte clonado antes de qualquer render (montar/entrada.js:101), esta regra nunca vê essa forma
    // renderizada; o contrato (filhos['figure.grafico']) continua descrevendo só a forma de fonte.
    //
    // Fronteira com componentes/graficos.js (comentário de coresDasSeries, Tarefa 2): esta regra
    // garante, ANTES de desenhar, (1) tipo entre os quatro de TIPOS_DE_GRAFICO, (2) no máximo
    // contrato.limites['grafico.series'] séries — o mesmo número que coresDasSeries também defende
    // sozinha, como rede de segurança para quem a chama fora do validador —, (3) foco ∈ y, (4)
    // escalas.x/escalas.y ∈ {linear, log}, (5) os campos que cada tipo precisa para desenhar (x
    // sempre; y não vazio fora de histograma; classes em histograma), (6) `dados` presente, como
    // caminho ou objeto de colunas (problemaDosDados); (7) com `dados` inline, que as colunas de x e
    // de cada y existem (colunasAusentes); e (8) nada de escalas.y "log" em barras e histograma, cujo
    // y inclui o zero por construção e falharia com qualquer dado (TIPOS_COM_ZERO_EM_Y). As três
    // funções vêm de componentes/graficos.js, a mesma fonte que o desenho usa. O que sobra para o
    // desenho: domínio ≤ 0 em log nos outros casos (depende dos VALORES) e as colunas de um CSV, que
    // uma regra estática — sem carregar nada — não tem; esses erros chegam ao autor pelo build.
    nome: 'recursos.grafico',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const figura of secao.querySelectorAll('figure.grafico')) {
          const script = figura.querySelector('script[type="application/json"]');
          if (!script) continue; // sem script: estrutura.obrigatorio já acusa isto
          const trecho = encurtar(script.textContent.trim());
          let especificacao;
          try {
            especificacao = JSON.parse(script.textContent);
          } catch (erro) {
            yield { ...onde(slides, secao), mensagem: `JSON do gráfico inválido: ${erro.message}.`, trecho };
            continue; // nada mais dá para conferir sem JSON válido
          }
          if (especificacao.tipo === undefined) {
            yield { ...onde(slides, secao), mensagem: 'gráfico sem o campo "tipo".', trecho };
            continue;
          }
          if (!TIPOS_DE_GRAFICO.has(especificacao.tipo)) {
            yield {
              ...onde(slides, secao),
              mensagem: `tipo de gráfico desconhecido: "${especificacao.tipo}" (use linha, barras, dispersao ou histograma).`,
              trecho,
            };
            continue; // sem tipo válido, não dá para saber quais campos são obrigatórios
          }
          if (typeof especificacao.x !== 'string' || especificacao.x.trim() === '') {
            yield { ...onde(slides, secao), mensagem: 'gráfico sem o campo "x".', trecho };
          }
          if (especificacao.tipo === 'histograma') {
            if (!Number.isInteger(especificacao.classes) || especificacao.classes <= 0) {
              yield {
                ...onde(slides, secao),
                mensagem: `gráfico "histograma" com "classes" ausente ou inválido: ${JSON.stringify(especificacao.classes)}.`,
                trecho,
              };
            }
          } else if (!Array.isArray(especificacao.y) || especificacao.y.length === 0) {
            yield { ...onde(slides, secao), mensagem: 'gráfico sem nenhuma série em "y".', trecho };
          } else {
            const maximo = contrato.limites['grafico.series'];
            if (especificacao.y.length > maximo) {
              yield {
                ...onde(slides, secao),
                mensagem: `gráfico com ${especificacao.y.length} séries em "y" (máx. ${maximo}).`,
                trecho,
              };
            }
            if (especificacao.foco !== undefined && !especificacao.y.includes(especificacao.foco)) {
              yield {
                ...onde(slides, secao),
                mensagem: `"foco" (${JSON.stringify(especificacao.foco)}) não está em "y".`,
                trecho,
              };
            }
          }
          for (const eixo of ['x', 'y']) {
            const valor = especificacao.escalas?.[eixo];
            if (valor !== undefined && valor !== 'linear' && valor !== 'log') {
              yield { ...onde(slides, secao), mensagem: `escalas.${eixo} fora de "linear"/"log": ${JSON.stringify(valor)}.`, trecho };
            }
          }
          if (especificacao.escalas?.y === 'log' && TIPOS_COM_ZERO_EM_Y.has(especificacao.tipo)) {
            yield {
              ...onde(slides, secao),
              mensagem: `gráfico "${especificacao.tipo}" com escalas.y "log": o eixo y dele começa em zero, e zero não existe em escala log.`,
              trecho,
            };
          }
          const problema = problemaDosDados(especificacao.dados);
          if (problema) {
            yield { ...onde(slides, secao), mensagem: `${problema}.`, trecho };
          } else if (typeof especificacao.dados === 'object') {
            const ausentes = colunasAusentes(especificacao, especificacao.dados);
            if (ausentes.length > 0) yield { ...onde(slides, secao), mensagem: `${mensagemDeColunasAusentes(ausentes)}.`, trecho };
          }
        }
      }
    },
  },
];
