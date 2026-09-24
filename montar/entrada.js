// Entrada do modo navegador em desenvolvimento, importada por montar/carregador.js (spec 3.2).
// No marco 5, dist/aula-usp.js embute CSS, fontes e marcas; aqui tudo vem por URL.
import { montar } from './montar.js';
import { iniciarMotor } from '../motor/motor.js';
import { instalarPaineis } from '../motor/paineis.js';
import { instalarDemos } from '../motor/demos.js';
import { instalarApresentador, instalarAberturaDoApresentador, modoApresentador } from '../motor/apresentador.js';
import { instalarImpressao } from '../motor/impressao.js';
import { renderizarTex } from '../componentes/tex.js';
import { criarDestacador, renderizarCodigo } from '../componentes/codigo.js';
import { criarDesenhista, desenharGraficos } from '../componentes/graficos.js';
import { caminhosDeCsv, colunasDosCsvs } from '../componentes/csv.js';
import { validar, linhaDe, slidesDoFonte, faseDaAula } from '../validador/validar.js';
import { REGRAS_ESTATICAS, REGRAS_DE_CARGA, REGRAS_DE_COMPOSICAO } from '../validador/regras/index.js';
// Puro (spec 3.5): o mesmo módulo que build/validar.mjs carrega para a CLI. matematica.simbolo-fora-do-tex
// precisa disto no contexto para não ficar muda — ver lerCoberturaOpcional, abaixo.
import { lerCobertura } from '../validador/cobertura.js';

// A raiz do sistema, derivada da URL de QUEM chamou: import.meta.url na entrada de desenvolvimento,
// document.currentScript.src no pacote do dist. Não use import.meta aqui: no formato iife o esbuild o
// deixa vazio, e `new URL('../', undefined)` lança na carga — medido, não suposto. As duas entradas
// ficam um nível abaixo da raiz (montar/navegador.js e dist/aula-usp.js), por isso o mesmo '../'.
let BASE;
const TEX = /\\\(|\\\[/;
const SELETOR_GRAFICO = 'figure.grafico';
const ESTILOS = ['estilos/tokens.css', 'estilos/fontes.css', 'estilos/base.css', 'estilos/layouts.css', 'estilos/componentes.css', 'estilos/motor.css', 'estilos/impressao.css'];

function carregarEstilo(caminho) {
  return new Promise((pronto, falha) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(caminho, BASE).href;
    link.addEventListener('load', pronto, { once: true });
    link.addEventListener('error', () => falha(new Error(`não carregou ${caminho}`)), { once: true });
    document.head.append(link);
  });
}

async function lerJson(caminho) {
  const resposta = await fetch(new URL(caminho, BASE));
  if (!resposta.ok) throw new Error(`não carregou ${caminho} (HTTP ${resposta.status})`);
  return resposta.json();
}

// Igual à CLI (build/validar.mjs): sem validador/cobertura.json (ninguém rodou `aula-usp dist`
// ainda), a validação segue sem cobertura — matematica.simbolo-fora-do-tex se cala sozinha (ela
// mesma decide isso). Mas "o arquivo não existe" e "a ligação foi desfeita por engano" não podem
// ficar indistinguíveis: por isso o catch aqui, sozinho — não dentro do Promise.all de lerJson lá
// embaixo — nunca deixa a promessa rejeitar (um cobertura.json ausente não pode derrubar a aula
// inteira, que é o que Promise.all faria) e sempre avisa no console quando degrada.
async function lerCoberturaOpcional(dados) {
  try {
    return lerCobertura(await dados('validador/cobertura.json'));
  } catch (erro) {
    console.warn(`Aula USP: cobertura de glifos não carregou (${erro.message}) — `
      + 'matematica.simbolo-fora-do-tex fica muda nesta aula.');
    return undefined;
  }
}

// Os CSVs dos gráficos (spec 7.2), buscados RELATIVOS AO DOCUMENTO DA AULA — a mesma base de um
// <img src="figuras/…"> do autor, e não BASE (a raiz do sistema, de onde vêm os scripts): o CSV é
// arquivo do autor, ao lado da aula. Vale igual no desenvolvimento e no pacote de dist/, porque os
// dois passam por iniciar(). Devolve os textos, para colunasDosCsvs (componentes/csv.js, o mesmo
// leitor do build), e o mapa caminho → carregou, para recursos.csv. Uma falha de rede, um 404 ou uma
// página aberta como arquivo local (file://, onde o fetch é recusado) dão `false` — nunca uma rejeição
// que derrube a montagem: a aula aparece, o gráfico não, e o painel diz qual CSV faltou.
async function buscarCsvs(doc) {
  const textos = new Map();
  const carregados = new Map();
  await Promise.all(caminhosDeCsv(doc).map(async (caminho) => {
    try {
      const resposta = await fetch(new URL(caminho, doc.baseURI));
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      textos.set(caminho, await resposta.text());
      carregados.set(caminho, true);
    } catch {
      carregados.set(caminho, false);
    }
  }));
  return { textos, carregados };
}

function documentoLido() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((pronto) => document.addEventListener('DOMContentLoaded', pronto, { once: true }));
}

// O marco 5 partiu esta entrada em duas: aqui fica o que roda, e quem chama são as duas entradas
// finas — montar/navegador.js no desenvolvimento e o empacotado do dist. O motivo é medido: o
// pacote do dist precisa ser script CLÁSSICO (a fila de AulaUSP.demo tem de existir antes do
// <script> do autor, que roda durante o parsing), e o formato iife do esbuild não aceita
// top-level await — que é como este arquivo inteiro era escrito.
// `resolver` traduz o nome de um módulo carregado sob demanda; `estilo` injeta uma folha; `dados`
// devolve o JSON de um caminho; `marca` resolve o arquivo de uma logomarca. São os pontos onde
// desenvolvimento e dist diferem de verdade — no dev cada um busca por URL (importmap, <link>, fetch,
// join de URL); no dist tudo já está dentro do pacote (marco 5, rodada de correção 1, item 1).
// Injetados, não ramificados: o corpo de iniciar() é um só, como o contexto extensível das regras do
// marco 4b.
export async function iniciar({ base, resolver = (nome) => nome, estilo, dados = lerJson, marca } = {}) {
  BASE = new URL('../', base);
  const injetarEstilo = estilo ?? carregarEstilo;
  const urlMarcas = new URL('assets/marcas', BASE).href;
  const resolverMarca = marca ?? ((arquivo) => `${urlMarcas}/${arquivo}`);
  try {
    await documentoLido();
    const [unidades, usp, contrato, cobertura] = await Promise.all([
      dados('assets/marcas/unidades.json'),
      dados('assets/marcas/usp.json'),
      dados('contrato/contrato.json'),
      lerCoberturaOpcional(dados),
    ]);
    // Passo 2 da spec 3.2: o fonte, antes de qualquer alteração — inclusive o CSS do passo 4, que antes
    // entrava aqui no mesmo Promise.all e chegava ao <head> antes desta cópia (revisão final do 4c,
    // Minor 1). O documento inteiro, porque o validador lê as metas do <head> — passar só o corpo dá
    // cinco erros falsos de metadados (revisão do marco 4b).
    const fonte = document.cloneNode(true);
    // A fase por presença dos blocos de fase 2 do contrato — a mesma função que a CLI chama
    // (build/validar.mjs), com o comentário dela em validador/validar.js.
    const fase = faseDaAula(fonte, contrato);
    const estaticos = validar(fonte, { contrato, regras: REGRAS_ESTATICAS, grupo: 'estatica', unidades, cobertura, fase });
    await Promise.all(ESTILOS.map(injetarEstilo));
    const resumo = montar(document, {
      unidades,
      usp,
      marca: resolverMarca,
      limites: { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] },
    });
    // A matemática entra antes do motor: cada \passo vira data-passo, que o motor conta ao iniciar (spec 6.4).
    let errosDeTex = [];
    if (TEX.test(document.body.textContent)) {
      const [{ default: katex }] = await Promise.all([
        import(resolver('katex')),
        injetarEstilo('modulos/katex/dist/katex.min.css'),
      ]);
      errosDeTex = renderizarTex(document.body, { katex });
      // renderizarTex só devolve { trecho, mensagem } (marco 3b); sem o elemento, matematica.tex-invalido
      // não acha a section, e o achado sai com slide: null (achado da Task 1). Ela cria um .tex-invalido
      // por erro, na mesma ordem em que os empilha — é a ponte até o elemento que faltava.
      const alertas = document.querySelectorAll('.tex-invalido');
      // O grupo de carga (mais abaixo) mede sobre `fonte`, não sobre este documento vivo — o alerta só
      // existe aqui, renderizarTex o criou depois que fonte foi clonado. Por isso o elemento da ponte
      // tem de ser a section de `fonte`, não a deste documento: montar() só decora as section que já
      // existem (não soma, remove nem reordena o topo do body), então o mesmo índice vale nos dois.
      const secoesAoVivo = slidesDoFonte(document.body);
      const secoesDoFonte = slidesDoFonte(fonte.body);
      errosDeTex = errosDeTex.map((erro, indice) => {
        const posicao = secoesAoVivo.indexOf(alertas[indice]?.closest('section'));
        return { ...erro, elemento: posicao < 0 ? undefined : secoesDoFonte[posicao] };
      });
      for (const erro of errosDeTex) {
        console.error(`Aula USP: TeX inválido em ${erro.trecho}: ${erro.mensagem}`);
      }
    }
    // O código também entra antes do motor; só as gramáticas das linguagens usadas na aula são importadas (spec 3.2).
    const blocosDeCodigo = [...document.querySelectorAll('pre[data-lang]')];
    if (blocosDeCodigo.length > 0) {
      const usadas = [...new Set(blocosDeCodigo.map((pre) => pre.getAttribute('data-lang')))]
        .filter((linguagem) => contrato.linguagens.includes(linguagem));
      const [{ createShikiPrimitive, codeToTokensBase }, { createJavaScriptRegexEngine }, ...modulosDasGramaticas] = await Promise.all([
        import(resolver('@shikijs/primitive')),
        import(resolver('@shikijs/engine-javascript')),
        ...usadas.map((linguagem) => import(resolver(`@shikijs/langs/${linguagem}`))),
      ]);
      const gramaticas = Object.fromEntries(usadas.map((linguagem, k) => [linguagem, modulosDasGramaticas[k].default]));
      const destacador = criarDestacador({ createShikiPrimitive, codeToTokensBase, createJavaScriptRegexEngine, gramaticas });
      for (const erro of renderizarCodigo(document.body, { destacador })) {
        console.error(`Aula USP: código com ${erro.mensagem}`);
      }
    }
    // Os gráficos entram pela mesma regra de presença (spec 3.5, fase 2): d3-scale, d3-shape e
    // d3-array chegam por import() dinâmico, resolvidos ao satélite aula-usp-graficos.js — o
    // terceiro `resolver(...)` desta função, ao lado de 'katex' e '@shikijs/*' acima. Os CSVs de
    // `dados` são buscados junto (buscarCsvs, abaixo) e chegam a desenharGraficos pelo mesmo `dados`
    // que o build passa: sem isso, um gráfico com CSV não existia na página que `servir`, `validar` e
    // a etapa 5 do build medem, e passava pela composição sem ser visto (pendência 1 da fase 2a).
    let csvs = new Map();
    if (document.querySelector(SELETOR_GRAFICO)) {
      const [{ scaleLinear, scaleLog }, { line }, { extent }, buscados] = await Promise.all([
        import(resolver('d3-scale')),
        import(resolver('d3-shape')),
        import(resolver('d3-array')),
        buscarCsvs(document),
      ]);
      csvs = buscados.carregados;
      const desenhista = criarDesenhista({ escalaLinear: scaleLinear, escalaLog: scaleLog, linha: line, extensao: extent });
      for (const erro of desenharGraficos(document.body, { desenhista, dados: colunasDosCsvs(buscados.textos) })) {
        console.error(`Aula USP: gráfico com ${erro.mensagem}`);
      }
    }
    // Passo 6 da spec 3.2/9.3: carga e composição rodam aqui — depois de scripts, imagens e fontes,
    // antes de iniciarMotor. Crítico e medido: iniciarMotor tira os slides do fluxo normal (só o
    // .ativo fica visível), e depois disso todo slide que não é o atual mede 0×0 — o transbordo
    // deixaria de existir para o validador. Não mova esta chamada para depois do motor.
    // Espera o load antes de tudo (Critical da revisão final do 4c): sem isso, uma imagem do cromo
    // ainda em voo (o download começa dentro de montar(), pouco antes daqui) aparece como "não
    // carregou" para img.complete/naturalWidth — dois erros falsos, atribuídos a um slide do autor,
    // sobre um elemento que ele não escreveu. document.readyState já pode ser 'complete' aqui (o load
    // correu enquanto os passos 4-5 rodavam); só esperar o evento perderia esse caso.
    // Com teto, e o teto não é detalhe (re-revisão da rodada de correção): o <body> está escondido até
    // o finally lá embaixo, então esperar o load sem limite faz um recurso pendurado — e a spec 5.5
    // permite imagem externa, só avisa — deixar a aula em branco para sempre, sem mensagem, na frente
    // da turma. Medido: com um pedido que nunca responde, a montagem não terminava em 7 s. A aula
    // aparecer importa mais que validar imagem lenta; quem chegar atrasado simplesmente não é julgado
    // (ver o mapa de imagens abaixo). Dois segundos porque o caso real é arquivo local ou localhost,
    // que chega em milissegundos — o teto só existe para o caso patológico.
    if (document.readyState !== 'complete') {
      await new Promise((pronto) => {
        const teto = setTimeout(pronto, 2000);
        window.addEventListener('load', () => { clearTimeout(teto); pronto(); }, { once: true });
      });
    }
    void document.body.offsetHeight; // força o layout, que pede as fontes usadas, antes de esperar por elas
    await document.fonts.ready;
    const recursos = {
      tex: errosDeTex,
      // O mapa vem do documento vivo — é lá que se sabe se uma imagem carregou —, mas o grupo de carga
      // roda sobre `fonte` logo abaixo: quais imagens a regra percorre passa a ser só as que o autor
      // escreveu, nunca o cromo que montar() injetou (a outra metade do Critical — spec 9.3 diz que o
      // grupo de carga roda sobre o fonte, não sobre o documento montado).
      // São TRÊS estados, não dois: carregou, falhou, e ainda em voo. `img.complete && naturalWidth`
      // achatava os três em dois e lia "em voo" como "falhou" — era isso que a espera pelo load
      // mascarava por tempo. Só entra no mapa quem já tem desfecho (complete), e a regra só acusa o
      // que vale exatamente false: de quem não chegou a tempo o validador não diz nada, em vez de
      // dizer errado. É o que torna o teto da espera seguro, e não só rápido.
      imagens: new Map([...document.querySelectorAll('img')]
        .filter((img) => img.complete)
        .map((img) => [img.getAttribute('src') ?? '', img.naturalWidth > 0])),
      // window.AulaUSP.demos não existe: motor/demos.js só monta o registro de verdade dentro de
      // instalarDemos(), que roda depois de iniciarMotor — de propósito, ainda não rodou aqui. A fila
      // é a mesma informação, ainda intacta: o script clássico do autor (AulaUSP.demo(...)) já rodou
      // durante o parsing, antes do DOMContentLoaded que documentoLido() espera lá em cima. Ver a
      // guarda em motor/demos.js:9 (Ruling 11): esvaziar a fila antes deste ponto reabriria a mesma
      // classe de erro falso, desta vez em recursos.demo-sem-registro.
      demos: new Map((window.AulaUSP?.filaDeDemos ?? []).map(({ nome, definicao }) => [nome, { capturar: typeof definicao.capturar === 'function' }])),
      // O mesmo formato de build/carregar.mjs:csvsDoDisco (caminho → carregou), e é por ele que um
      // CSV que não carregou vira recursos.csv no painel, não só uma linha no console.
      csvs,
    };
    const semFolha = !new URLSearchParams(location.search).has('folha');
    const achados = [
      ...estaticos,
      ...validar(fonte, { contrato, regras: REGRAS_DE_CARGA, grupo: 'carga', recursos, fase }),
      // Só mede composição aqui quando o motor vai rodar de verdade: com ?folha, quem mede é o próprio
      // chamador (build/composicao.mjs ou tests/integracao/composicao.test.mjs), sobre a página já
      // carregada — medir aqui de novo seria a mesma conta cara duas vezes por execução (revisão final
      // do 4c, Minor: "a CLI mede composição duas vezes por execução").
      ...(semFolha ? validar(document, { contrato, regras: REGRAS_DE_COMPOSICAO, grupo: 'composicao', janela: window, fase }) : []),
    ];
    // Spec 3.2: aviso não abre o painel sozinho, mas também fica no console — quem abre o devtools vê.
    for (const achado of achados) {
      if (achado.severidade === 'aviso') console.warn(`Aula USP: ${linhaDe(achado)}`);
    }
    if (!semFolha) document.body.classList.add('folha');
    else {
      const api = window.AulaUSP ?? (window.AulaUSP = {});
      const motor = iniciarMotor({ doc: document, janela: window, resumo });
      if (modoApresentador(window)) {
        instalarApresentador(motor);
      } else {
        const paineis = instalarPaineis(motor);
        paineis.mostrarAchados(achados);
        const demos = instalarDemos(motor, api);
        instalarAberturaDoApresentador(motor, paineis);
        instalarImpressao(motor, { demos, paineis, api });
      }
    }
    document.body.dataset.montado = 'sim';
  } catch (erro) {
    document.body.dataset.montado = 'erro';
    const aviso = document.createElement('pre');
    aviso.className = 'painel';
    aviso.textContent = `Aula USP: ${erro.message}`;
    document.body.prepend(aviso);
    console.error(erro);
  } finally {
    document.querySelector('style[data-aula-usp="ocultar"]')?.remove();
  }
}
