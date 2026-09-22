// Etapas 2 a 4 da spec 3.3, em Node sobre linkedom: monta, pré-renderiza, troca a tag do runtime
// pelo motor embutido e embute tudo o que a aula precisa. O fonte nunca é alterado — só lido.
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { scaleLinear, scaleLog } from 'd3-scale';
import { line } from 'd3-shape';
import { extent } from 'd3-array';
import { montar } from '../montar/montar.js';
import { renderizarTex } from '../componentes/tex.js';
import { criarDestacador, renderizarCodigo } from '../componentes/codigo.js';
import { criarDesenhista, desenharGraficos } from '../componentes/graficos.js';

// Sem 'fontes': estilos/fontes.css é o @font-face de DESENVOLVIMENTO (URL relativa a assets/fontes/,
// servida por build/servir.mjs). embutirFontes (tarefa 2 do marco 5b) já devolve o @font-face de
// PRODUÇÃO, em data URI, para as mesmas oito fontes — incluir os dois é o mesmo font-family duas
// vezes com o mesmo unicode-range, e medido (Chrome real, HTML construído aberto por fora do
// repositório) que o navegador tenta a ÚLTIMA declaração da folha, não a primeira: com as duas, a
// relativa vem depois de fontes.css, falha (o pacote não tem mais a pasta assets/fontes/ ao lado, fato
// 6), e Geist/Geist Mono caem para a fonte de reserva — dois net::ERR_FILE_NOT_FOUND, dois erros no
// console, e o título deixa de sair em Geist, contra o fato 7.
const ESTILOS = ['tokens', 'base', 'layouts', 'componentes', 'motor', 'impressao'];
const SELETOR_GRAFICO = 'figure.grafico';

const TIPOS = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

// Um caminho já tem esquema (http:, https:, data:, blob:...) quando começa com uma palavra seguida
// de ":" — nesse caso não é um arquivo local, e embutirImagensDoAutor o deixa como está.
const TEM_ESQUEMA = /^[a-z][a-z0-9+.-]*:/i;

// `caminho` é sempre uma URL, nos dois pontos que chamam esta função (marcas e imagens do autor) —
// por isso a extensão vem só de `pathname`. Achar o ponto e cortar do MESMO texto é o que importa:
// a correção da rodada anterior foi justamente parar de cortar `String(caminho)` (o href inteiro,
// com o esquema) usando um índice achado em `pathname` — os dois só coincidem por acaso.
async function comoDataUri(caminho) {
  const bytes = await readFile(caminho);
  const extensao = caminho.pathname.slice(caminho.pathname.lastIndexOf('.')).toLowerCase();
  return `data:${TIPOS[extensao] ?? 'application/octet-stream'};base64,${bytes.toString('base64')}`;
}

// Imagens do autor (spec 3.3, etapa 4): todo <img src> que não seja data: nem tenha esquema próprio
// (http:, etc. — externa de propósito, a spec 5.5 permite e só avisa) é arquivo local, e o caminho no
// fonte é relativo à PASTA DA AULA, nunca à raiz do sistema — um <img src="figuras/grafico.png">
// escrito pelo autor não sabe onde o pacote deste sistema mora.
async function embutirImagensDoAutor(document, pastaDaAula) {
  for (const img of document.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src');
    if (!src || TEM_ESQUEMA.test(src)) continue;
    img.setAttribute('src', await comoDataUri(new URL(src, pastaDaAula)));
  }
}

// Código com destaque (spec 3.3, etapa 3), no mesmo padrão de montar/entrada.js: só as gramáticas das
// linguagens que a aula de fato usa (filtradas pelo contrato) entram no build. Sem resolver — ao
// contrário do navegador, o Node resolve `@shikijs/langs/<nome>` sozinho, por especificador nu.
async function prerenderizarCodigo(document, contrato) {
  const blocos = [...document.querySelectorAll('pre[data-lang]')];
  if (blocos.length === 0) return [];
  const usadas = [...new Set(blocos.map((pre) => pre.getAttribute('data-lang')))]
    .filter((linguagem) => contrato.linguagens.includes(linguagem));
  const [{ createShikiPrimitive, codeToTokensBase }, { createJavaScriptRegexEngine }, ...modulosDasGramaticas] = await Promise.all([
    import('@shikijs/primitive'),
    import('@shikijs/engine-javascript'),
    ...usadas.map((linguagem) => import(`@shikijs/langs/${linguagem}`)),
  ]);
  const gramaticas = Object.fromEntries(usadas.map((linguagem, k) => [linguagem, modulosDasGramaticas[k].default]));
  const destacador = criarDestacador({ createShikiPrimitive, codeToTokensBase, createJavaScriptRegexEngine, gramaticas });
  return renderizarCodigo(document.body, { destacador });
}

// Gráficos (spec 3.5, fase 2), no mesmo padrão de prerenderizarCodigo: a mesma regra de presença que
// montar/entrada.js usa (SELETOR_GRAFICO) decide se este passo roda. d3-scale/d3-shape/d3-array
// entram por import estático no topo do arquivo — Node resolve o pacote sozinho, como katex já faz —
// e criarDesenhista recebe as quatro funções pelo MESMO parâmetro que o navegador usa (componentes/
// graficos.js não sabe se está em Node ou no cliente). Sem `dados`: nenhum fixture ou deck do
// espécime usa caminho de CSV hoje — toda especificação de gráfico traz colunas inline (objeto),
// que desenharGraficos já resolve sem consultar `dados` (ver o comentário dela).
function prerenderizarGraficos(document) {
  if (!document.querySelector(SELETOR_GRAFICO)) return [];
  const desenhista = criarDesenhista({ escalaLinear: scaleLinear, escalaLog: scaleLog, linha: line, extensao: extent });
  return desenharGraficos(document.body, { desenhista });
}

// O arranque do HTML construído. Duas partes, e a ordem entre elas é o motivo de o marco 5a existir:
// a fila de AulaUSP.demo é instalada de forma SÍNCRONA, aqui, porque o <script> inline do autor roda
// durante o parsing e chama AulaUSP.demo antes de qualquer evento. O resto espera o DOMContentLoaded.
// O resumo vem serializado de montar(), e não reconstruído do DOM: reconstruir seria uma segunda
// implementação do que montar já calculou, e duas verdades divergem (marcos 3 e 4).
const arranqueDe = (resumo) => `
window.AulaUSP = window.AulaUSP || {};
window.AulaUSP.filaDeDemos = [];
window.AulaUSP.demo = function (nome, definicao) { window.AulaUSP.filaDeDemos.push({ nome: nome, definicao: definicao }); };
document.addEventListener('DOMContentLoaded', function () {
  var resumo = ${JSON.stringify(resumo)};
  var M = AulaUSPMotor;
  var motor = M.iniciarMotor({ doc: document, janela: window, resumo: resumo });
  // Ruling 11 (marco 4c, motor/demos.js:9): criarDemos esvazia filaDeDemos ao instalar — sem
  // fotografá-la ANTES, quem precisar do registro depois (a etapa 5 do marco 5c, ao abrir esta
  // página no Chrome) acharia a fila vazia e toda div.demo viraria recursos.demo-sem-registro
  // (revisão final do 5b, I3). Mesmo padrão de montar/entrada.js: fotografar antes de instalarDemos,
  // incondicional, antes do próprio branch de apresentador — não só no ramo que instala de fato.
  window.AulaUSP.demos = new Map(window.AulaUSP.filaDeDemos.map(function (item) {
    return [item.nome, { capturar: typeof item.definicao.capturar === 'function' }];
  }));
  if (M.modoApresentador(window)) {
    M.instalarApresentador(motor);
  } else {
    var paineis = M.instalarPaineis(motor);
    var demos = M.instalarDemos(motor, window.AulaUSP);
    M.instalarAberturaDoApresentador(motor, paineis);
    M.instalarImpressao(motor, { demos: demos, paineis: paineis, api: window.AulaUSP });
  }
  document.body.dataset.montado = 'sim';
});`;

export async function construirHtml({ raiz, caminhoDaAula, embutirFontes }) {
  const { document } = parseHTML(await readFile(caminhoDaAula, 'utf8'));
  const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', raiz), 'utf8'));

  // Etapa 4 (imagens do autor): antes de tudo, porque não depende de montar/TeX/código — é conteúdo
  // do autor, resolvido contra a pasta do arquivo da aula.
  await embutirImagensDoAutor(document, new URL('.', caminhoDaAula));

  // Etapa 2. `marca` é função desde o marco 5a: aqui ela devolve data URI, e montar() não sabe disso.
  // montar() a chama de forma SÍNCRONA, então os três arquivos são lidos antes e fechados num mapa —
  // não dá para resolver com await dentro da função.
  const unidades = JSON.parse(await readFile(new URL('assets/marcas/unidades.json', raiz), 'utf8'));
  const usp = JSON.parse(await readFile(new URL('assets/marcas/usp.json', raiz), 'utf8'));
  const arquivosDeMarca = [...new Set([...Object.values(unidades).map((u) => u.arquivo), usp.arquivo])];
  const marcas = new Map(await Promise.all(arquivosDeMarca.map(async (arquivo) =>
    [arquivo, await comoDataUri(new URL(`assets/marcas/${arquivo}`, raiz))])));
  const resumo = montar(document, {
    unidades,
    usp,
    marca: (arquivo) => marcas.get(arquivo) ?? '',
    limites: { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] },
  });

  // Etapa 3. A matemática entra antes do motor: cada \passo vira data-passo, que o motor conta.
  const errosDeTex = renderizarTex(document.body, { katex });
  const errosDeCodigo = await prerenderizarCodigo(document, contrato);
  const errosDeGrafico = prerenderizarGraficos(document);

  // Etapa 4. As fontes só agora: embutirFontes precisa do documento COM o TeX já renderizado, para
  // saber quais famílias do KaTeX a aula usa (spec 3.3: "só as que a aula usa").
  const fontes = await embutirFontes({ raiz, doc: document });
  const css = (await Promise.all(ESTILOS.map((nome) => readFile(new URL(`estilos/${nome}.css`, raiz), 'utf8')))).join('\n');
  const folha = document.createElement('style');
  folha.textContent = `${fontes.css}\n${css}`;
  document.head.append(folha);

  // Etapa 4. A tag do runtime sai; o motor embutido e o arranque entram no lugar dela, nessa ordem.
  const tag = [...document.querySelectorAll('script[src]')]
    .find((script) => (script.getAttribute('src') ?? '').endsWith('/aula-usp.js'));
  if (!tag) throw new Error('a aula não tem a tag do runtime (src terminado em /aula-usp.js)');
  const motor = document.createElement('script');
  motor.textContent = await readFile(new URL('dist/aula-usp-motor.js', raiz), 'utf8');
  const arranque = document.createElement('script');
  arranque.textContent = arranqueDe(resumo);
  tag.replaceWith(motor);
  motor.after(arranque);

  const html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}\n`;
  return { html, resumo, doc: document, fontes, errosDeTex, errosDeCodigo, errosDeGrafico };
}
