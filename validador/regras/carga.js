// Regras de carga (spec 9.2 e 9.3): o que só se sabe depois de carregar bibliotecas, imagens e scripts.
// As regras não carregam nada — quem carrega é o chamador, e entrega o resultado no contexto:
//   recursos = { tex: [{ trecho, mensagem }], imagens: Map(src → carregou), demos: Map(nome → { capturar }),
//                csvs: Map(caminho → carregou),
//                diagramas: [{ figura, trecho, nos } | { figura, trecho, mensagem }] }
// No navegador isso vem do DOM vivo; no build, do KaTeX e do Graphviz rodando no Node e do disco. csvs: o build
// preenche pelo disco (build/carregar.mjs:csvsDoDisco) e o navegador pelo resultado do fetch
// (montar/entrada.js:buscarCsvs), os dois com os caminhos de componentes/csv.js:caminhosDeCsv.
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
    // "DOT que não compila" (spec 9.2): quem compila é o chamador — o Graphviz no Node, na etapa 1 do
    // build (build/carregar.mjs:diagramasDoFonte), e o do satélite no navegador (montar/entrada.js) —,
    // os dois pela mesma função, componentes/diagramas.js:compilarDiagramas. A mensagem é a do
    // Graphviz, com a linha do DOT, como matematica.tex-invalido traz a do KaTeX: é ela que torna o
    // erro corrigível. Também cai aqui a classe fora do vocabulário do DOT (só `foco` em nó, só
    // `ativo` em aresta, spec 7.2): o diagrama sairia desenhado sem o que o autor pediu.
    nome: 'recursos.dot',
    *aplicar({ slides, recursos }) {
      for (const diagrama of recursos?.diagramas ?? []) {
        if (diagrama.mensagem === undefined) continue;
        const secao = diagrama.figura?.closest('section');
        yield {
          ...(secao ? onde(slides, secao) : {}),
          mensagem: `diagrama que não desenha: ${diagrama.mensagem}.`,
          trecho: encurtar(diagrama.trecho ?? ''),
        };
      }
    },
  },
  {
    // Conta os nós do resultado COMPILADO (compilarDiagramas devolve `nos`), nunca o texto do DOT:
    // `a -> b -> c` declara três nós sem listá-los, e um regex erraria para menos exatamente nos
    // diagramas que mais interessam. O limite é contrato.limites['diagrama.nos'] (spec 7.2: 15).
    nome: 'recursos.diagrama-grande',
    *aplicar({ slides, recursos, contrato }) {
      const limite = contrato.limites['diagrama.nos'];
      for (const diagrama of recursos?.diagramas ?? []) {
        if (!(diagrama.nos > limite)) continue;
        const secao = diagrama.figura?.closest('section');
        yield {
          ...(secao ? onde(slides, secao) : {}),
          mensagem: `diagrama com ${diagrama.nos} nós; o limite é ${limite}.`,
          trecho: encurtar(diagrama.trecho ?? ''),
        };
      }
    },
  },
];
