// Regras de carga (spec 9.2 e 9.3): o que só se sabe depois de carregar bibliotecas, imagens e scripts.
// As regras não carregam nada — quem carrega é o chamador, e entrega o resultado no contexto:
//   recursos = { tex: [{ trecho, mensagem }], imagens: Map(src → carregou), demos: Map(nome → { capturar }),
//                csvs: Map(caminho → carregou),
//                diagramas: [{ figura, trecho, nos } | { figura, trecho, mensagem }] }
// No navegador isso vem do DOM vivo; no build, do KaTeX e do Graphviz rodando no Node e do disco. csvs: o build
// preenche pelo disco (build/carregar.mjs:csvsDoDisco) e o navegador pelo resultado do fetch
// (montar/entrada.js:buscarCsvs), os dois com os caminhos de componentes/csv.js:caminhosDeCsv.
import { onde, trechoDe, encurtar } from '../validar.js';

// A linha que a mensagem do Graphviz cita, com o número dela; sem citação, o DOT encurtado.
function trechoDoDot(trecho, mensagem) {
  const citada = /\bline (\d+)\b/.exec(mensagem)?.[1];
  const linha = citada === undefined ? undefined : trecho.split('\n')[Number(citada) - 1];
  return linha === undefined ? encurtar(trecho) : `linha ${citada}: ${encurtar(linha.trim())}`;
}

// A demo que não traz imagem própria para o PDF: sem img.estatico e sem capturar() (spec 6.7). Uma
// função só, exportada, porque são dois os lados que precisam da MESMA resposta:
// recursos.demo-sem-estatico, abaixo, acusa exatamente estas demos, e build/captura.mjs fotografa
// exatamente estas — a regra só pode se calar no build porque a captura cobre este mesmo conjunto.
export function demoSemImagem(demo, registro) {
  return !demo.querySelector('img.estatico') && !registro?.capturar;
}

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
    // Spec 9.2: "demo sem img.estatico e sem capturar(); na fase 2, só no modo navegador, porque o
    // build captura". "Fase 2" ali é a do PROJETO, e não a da aula: com a fase 2 entregue, todo build
    // fotografa toda demo sem imagem própria (build/build.mjs, etapa 5), qualquer que seja a fase que
    // faseDaAula decidiu — essa só libera o vocabulário de fase 2 do contrato. Dois casos, por modo:
    //   - navegador: acusa sempre — o PDF impresso pelo navegador não passa pelo build;
    //   - build: se cala, porque build/captura.mjs fotografa EXATAMENTE estas demos (demoSemImagem,
    //     acima, é a mesma função lá) — e só se cala enquanto a captura cobre o caso. A demo que a
    //     captura não conseguiu fotografar chega em `falhasDeCaptura` (elemento do fonte → motivo;
    //     build/build.mjs a preenche depois da etapa 5, e também quando a etapa 5 não rodou: sem
    //     Chrome, ou com erro de composição), e a regra volta a acusar, com o motivo. Na etapa 1,
    //     antes da captura, o mapa não existe e nada é dito; quem diz é a segunda passada, depois dela.
    // O padrão de `modo` em validar() é o navegador: quem não o passa continua acusando.
    nome: 'recursos.demo-sem-estatico',
    *aplicar({ slides, recursos, contrato, modo, falhasDeCaptura }) {
      if (!recursos?.demos) return;
      const { acaoNavegador, acaoCaptura } = contrato.regras['recursos.demo-sem-estatico'];
      for (const secao of slides) {
        for (const demo of secao.querySelectorAll('div.demo[data-demo]')) {
          const nome = demo.getAttribute('data-demo');
          const registro = recursos.demos.get(nome);
          if (!registro) continue; // sem registro já é recursos.demo-sem-registro
          if (!demoSemImagem(demo, registro)) continue;
          const lugar = { ...onde(slides, secao), trecho: trechoDe(demo) };
          if (modo === 'build') {
            const motivo = falhasDeCaptura?.get(demo);
            if (motivo === undefined) continue;
            yield { ...lugar, mensagem: `demo "${nome}" sem img.estatico e sem capturar(), e a captura do build falhou: ${motivo}.`, acao: acaoCaptura };
          } else {
            yield { ...lugar, mensagem: `demo "${nome}" sem img.estatico e sem capturar(): impresso pelo navegador, o PDF sai sem ela.`, acao: acaoNavegador };
          }
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
    // erro corrigível. Também cai aqui o que o DOT pede e o sistema não desenha sem desenhar outra
    // coisa (componentes/diagramas.js:atributosRecusados, lido do grafo compilado): classe fora de
    // `foco` num nó e `ativo` numa aresta, style=invis, shape=record, rótulo HTML, headlabel,
    // taillabel, xlabel, label no grafo ou num subgrafo que não é agrupamento, fonte, tamanho e margem
    // (fontsize, fontname, fixedsize, width, height, margin), e mais de um grafo no bloco.
    // O trecho: quando o Graphviz cita uma linha ("syntax error in line 2 near …"), é ESSA linha do
    // DOT, com o número — encurtar() junta o texto numa linha só, e o "line 2" deixava de apontar para
    // nada que o autor visse (M6 da revisão final da 2b). A linha é contada no mesmo texto que foi
    // compilado: o trecho é o conteúdo do script sem os espaços das pontas, e os padrões do sistema
    // entram sem quebra de linha (componentes/diagramas.js:comPadroes).
    nome: 'recursos.dot',
    *aplicar({ slides, recursos }) {
      for (const diagrama of recursos?.diagramas ?? []) {
        if (diagrama.mensagem === undefined) continue;
        const secao = diagrama.figura?.closest('section');
        yield {
          ...(secao ? onde(slides, secao) : {}),
          mensagem: `diagrama que não desenha: ${diagrama.mensagem}.`,
          trecho: trechoDoDot(diagrama.trecho ?? '', diagrama.mensagem),
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
