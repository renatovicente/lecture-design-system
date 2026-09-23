// Regras de carga (spec 9.2 e 9.3): o que só se sabe depois de carregar bibliotecas, imagens e scripts.
// As regras não carregam nada — quem carrega é o chamador, e entrega o resultado no contexto:
//   recursos = { tex: [{ trecho, mensagem }], imagens: Map(src → carregou), demos: Map(nome → { capturar }),
//                csvs: Map(caminho → carregou) }
// No navegador isso vem do DOM vivo; no build, do KaTeX rodando no Node e do disco. csvs: hoje só o
// build preenche (build/carregar.mjs:csvsDoDisco) — montar/entrada.js, o lado navegador, documenta
// que resolver caminho de CSV não é desta tarefa (a Tarefa 3 da fase 2a já deixou isso escrito, para
// a renderização); esta regra fica muda no navegador enquanto isso não mudar, do mesmo jeito que
// recursos.demo-sem-registro fica muda sem `recursos.demos`.
import { onde, trechoDe, encurtar } from '../validar.js';

export const regras = [
  {
    nome: 'matematica.tex-invalido',
    *aplicar({ slides, recursos }) {
      for (const erro of recursos?.tex ?? []) {
        const secao = erro.elemento?.closest('section');
        yield {
          ...(secao ? onde(slides, secao) : {}),
          mensagem: `TeX que o KaTeX não compila: ${erro.mensagem}`,
          trecho: encurtar(erro.trecho ?? ''),
        };
      }
    },
  },
  {
    nome: 'recursos.imagem',
    *aplicar({ slides, recursos }) {
      if (!recursos?.imagens) return;
      for (const secao of slides) {
        for (const imagem of secao.querySelectorAll('img')) {
          const src = imagem.getAttribute('src') ?? '';
          if (src.startsWith('data:')) continue; // imagem embutida não tem o que faltar
          if (recursos.imagens.get(src) === false) {
            yield { ...onde(slides, secao), mensagem: `imagem que não carregou: "${src}".`, trecho: trechoDe(imagem) };
          }
        }
      }
    },
  },
  {
    // div.demo[data-demo] nos dois seletores abaixo: um div.demo sem data-demo nenhum não bate com
    // nenhum dos dois, e o contrato não marca data-demo como obrigatório — vocabulario.atributo
    // também não acusa a ausência. Um PDF vazio assim sai sem achado nenhum (não é regressão desta
    // task; a spec pede exatamente estas quatro regras).
    nome: 'recursos.demo-sem-registro',
    *aplicar({ slides, recursos }) {
      if (!recursos?.demos) return;
      for (const secao of slides) {
        for (const demo of secao.querySelectorAll('div.demo[data-demo]')) {
          const nome = demo.getAttribute('data-demo');
          if (!recursos.demos.has(nome)) {
            yield { ...onde(slides, secao), mensagem: `demo sem registro: "${nome}".`, trecho: trechoDe(demo) };
          }
        }
      }
    },
  },
  {
    nome: 'recursos.demo-sem-estatico',
    *aplicar({ slides, recursos }) {
      if (!recursos?.demos) return;
      for (const secao of slides) {
        for (const demo of secao.querySelectorAll('div.demo[data-demo]')) {
          const nome = demo.getAttribute('data-demo');
          const registro = recursos.demos.get(nome);
          if (!registro) continue; // sem registro já é recursos.demo-sem-registro
          if (demo.querySelector('img.estatico') || registro.capturar) continue;
          yield { ...onde(slides, secao), mensagem: `demo "${nome}" sem img.estatico e sem capturar(): o PDF sai vazio.`, trecho: trechoDe(demo) };
        }
      }
    },
  },
  {
    // Fronteira com recursos.grafico (validador/regras/recursos.js, estática): esta regra só confere
    // o CAMINHO — existe no disco (build) ou carregou (navegador) —, nunca a FORMA do JSON. Por isso
    // reanalisa o JSON com try/catch mudo: se ele não é válido, ou se `dados` não é uma string (é
    // inline, ou está ausente), não há caminho nenhum para checar, e é recursos.grafico quem já
    // acusa isso — não duas mensagens para a mesma causa.
    nome: 'recursos.csv',
    *aplicar({ slides, recursos }) {
      if (!recursos?.csvs) return;
      for (const secao of slides) {
        for (const figura of secao.querySelectorAll('figure.grafico')) {
          const script = figura.querySelector('script[type="application/json"]');
          if (!script) continue;
          let especificacao;
          try {
            especificacao = JSON.parse(script.textContent);
          } catch {
            continue;
          }
          if (typeof especificacao.dados !== 'string') continue;
          if (recursos.csvs.get(especificacao.dados) === false) {
            yield { ...onde(slides, secao), mensagem: `CSV que não carregou: "${especificacao.dados}".`, trecho: trechoDe(figura) };
          }
        }
      }
    },
  },
  {
    // "DOT que não compila" (spec 9.2) — e hoje nenhum compila, porque nada no Aula USP desenha DOT
    // ainda: o Graphviz é da fase 2b. faseDaAula (validador/validar.js) põe a aula na fase 2 quando
    // ela tem figure.diagrama, e isso abre a FORMA do diagrama para estrutura.* e vocabulario.*; sem
    // esta regra, um diagrama passava por `validar` e por `build` com 0 erros e a figura saía vazia
    // (Critical 1 da revisão final da 2a). Não depende de `recursos`: não há o que carregar, então
    // acusa nos dois lados (CLI e navegador), com ou sem gráfico na mesma aula. A fase 2b troca o
    // corpo desta regra pela compilação de verdade, com a mensagem do Graphviz.
    nome: 'recursos.dot',
    *aplicar({ slides }) {
      for (const secao of slides) {
        for (const figura of secao.querySelectorAll('figure.diagrama')) {
          yield {
            ...onde(slides, secao),
            mensagem: 'diagrama ainda não está disponível nesta versão do Aula USP: nada desenha o DOT, e a figura sairia vazia.',
            trecho: trechoDe(figura),
          };
        }
      }
    },
  },
];
