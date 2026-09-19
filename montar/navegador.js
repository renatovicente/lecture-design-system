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
import { validar, linhaDe, slidesDoFonte } from '../validador/validar.js';
import { REGRAS_ESTATICAS, REGRAS_DE_CARGA, REGRAS_DE_COMPOSICAO } from '../validador/regras/index.js';

const BASE = new URL('../', import.meta.url);
const TEX = /\\\(|\\\[/;
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

function documentoLido() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((pronto) => document.addEventListener('DOMContentLoaded', pronto, { once: true }));
}

try {
  await documentoLido();
  const [unidades, usp, contrato] = await Promise.all([
    lerJson('assets/marcas/unidades.json'),
    lerJson('assets/marcas/usp.json'),
    lerJson('contrato/contrato.json'),
  ]);
  // Passo 2 da spec 3.2: o fonte, antes de qualquer alteração — inclusive o CSS do passo 4, que antes
  // entrava aqui no mesmo Promise.all e chegava ao <head> antes desta cópia (revisão final do 4c,
  // Minor 1). O documento inteiro, porque o validador lê as metas do <head> — passar só o corpo dá
  // cinco erros falsos de metadados (revisão do marco 4b).
  const fonte = document.cloneNode(true);
  const estaticos = validar(fonte, { contrato, regras: REGRAS_ESTATICAS, grupo: 'estatica', unidades });
  await Promise.all(ESTILOS.map(carregarEstilo));
  const resumo = montar(document, {
    unidades,
    usp,
    urlMarcas: new URL('assets/marcas', BASE).href,
    limites: { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] },
  });
  // A matemática entra antes do motor: cada \passo vira data-passo, que o motor conta ao iniciar (spec 6.4).
  let errosDeTex = [];
  if (TEX.test(document.body.textContent)) {
    const [{ default: katex }] = await Promise.all([
      import('katex'),
      carregarEstilo('modulos/katex/dist/katex.min.css'),
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
      import('@shikijs/primitive'),
      import('@shikijs/engine-javascript'),
      ...usadas.map((linguagem) => import(`@shikijs/langs/${linguagem}`)),
    ]);
    const gramaticas = Object.fromEntries(usadas.map((linguagem, k) => [linguagem, modulosDasGramaticas[k].default]));
    const destacador = criarDestacador({ createShikiPrimitive, codeToTokensBase, createJavaScriptRegexEngine, gramaticas });
    for (const erro of renderizarCodigo(document.body, { destacador })) {
      console.error(`Aula USP: código com ${erro.mensagem}`);
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
  if (document.readyState !== 'complete') {
    await new Promise((pronto) => window.addEventListener('load', pronto, { once: true }));
  }
  void document.body.offsetHeight; // força o layout, que pede as fontes usadas, antes de esperar por elas
  await document.fonts.ready;
  const recursos = {
    tex: errosDeTex,
    // O mapa vem do documento vivo — é lá que se sabe se uma imagem carregou —, mas o grupo de carga
    // roda sobre `fonte` logo abaixo: quais imagens a regra percorre passa a ser só as que o autor
    // escreveu, nunca o cromo que montar() injetou (a outra metade do Critical — spec 9.3 diz que o
    // grupo de carga roda sobre o fonte, não sobre o documento montado).
    imagens: new Map([...document.querySelectorAll('img')].map((img) => [img.getAttribute('src') ?? '', img.complete && img.naturalWidth > 0])),
    // window.AulaUSP.demos não existe: motor/demos.js só monta o registro de verdade dentro de
    // instalarDemos(), que roda depois de iniciarMotor — de propósito, ainda não rodou aqui. A fila
    // é a mesma informação, ainda intacta: o script clássico do autor (AulaUSP.demo(...)) já rodou
    // durante o parsing, antes do DOMContentLoaded que documentoLido() espera lá em cima. Ver a
    // guarda em motor/demos.js:9 (Ruling 11): esvaziar a fila antes deste ponto reabriria a mesma
    // classe de erro falso, desta vez em recursos.demo-sem-registro.
    demos: new Map((window.AulaUSP?.filaDeDemos ?? []).map(({ nome, definicao }) => [nome, { capturar: typeof definicao.capturar === 'function' }])),
  };
  const semFolha = !new URLSearchParams(location.search).has('folha');
  const achados = [
    ...estaticos,
    ...validar(fonte, { contrato, regras: REGRAS_DE_CARGA, grupo: 'carga', recursos }),
    // Só mede composição aqui quando o motor vai rodar de verdade: com ?folha, quem mede é o próprio
    // chamador (build/composicao.mjs ou tests/integracao/composicao.test.mjs), sobre a página já
    // carregada — medir aqui de novo seria a mesma conta cara duas vezes por execução (revisão final
    // do 4c, Minor: "a CLI mede composição duas vezes por execução").
    ...(semFolha ? validar(document, { contrato, regras: REGRAS_DE_COMPOSICAO, grupo: 'composicao', janela: window }) : []),
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
