// Tarefa 2 do marco 5b (spec 3.3, etapa 4): embute as fontes que a aula construída precisa — as
// oito do sistema, sempre, e as famílias do KaTeX que a aula de fato usa — e devolve a cobertura de
// glifo do que foi embutido (sistema ∪ KaTeX incluído). A tarefa 3 (saida.glifo-ausente) consome essa
// cobertura porque validador/cobertura.json (fato 8) só conhece o sistema, e alimentada só por ele a
// regra acusaria erro falso em toda aula com matemática fora do repertório do sistema.
//
// embutirFontes recebe o documento DEPOIS de renderizarTex — build/embutir.mjs chama nessa ordem, e é
// só assim que existem nós ".katex" cujas classes dizem quais famílias a aula usa. Mas embutirFontes
// TAMBÉM chama renderizarTex por conta própria, no início: medido (rodando o teste desta tarefa) que
// é preciso — o teste passa um documento CRU, sem render nenhum, e mesmo assim espera cobertura do
// KaTeX. A segunda chamada é inofensiva quando o documento já veio renderizado: medido (rodando
// renderizarTex duas vezes seguidas sobre especime/matematica.html) que a segunda é sem efeito nenhum
// — innerHTML idêntico byte a byte, zero erro novo — porque ela só age sobre texto com "\(" ou "\["
// cru, e nada disso sobrevive à primeira passada.
import { readFile } from 'node:fs/promises';
import katex from 'katex';
import { renderizarTex } from '../componentes/tex.js';
import { pontosDoArquivo } from './cobertura.mjs';
import { gerarFontesCss } from './fontes-css.mjs';

const CAMINHO_CSS_KATEX = 'node_modules/katex/dist/katex.min.css';
const PASTA_FONTES_KATEX = 'node_modules/katex/dist/fonts/';

// As regras de katex.css que decidem font-family por classe (medido: são as ÚNICAS — uma varredura
// do arquivo inteiro por "font-family:" fora dos @font-face não encontra mais nenhuma). Fora daqui,
// todo glifo cai no default do próprio ".katex" (KaTeX_Main) — por isso ela é a única incondicional.
//
// As "simples" valem por uma classe só: medido que nenhuma delas serve a um segundo propósito em
// katex.css (cada uma aparece exatamente uma vez fora de @font-face, ou duas vezes apontando para a
// MESMA família, caso de .textsf).
//
// As "de tamanho" (o brief já avisa que existem) só valem em PAR — nunca por uma classe sozinha.
// Medido em especime/matematica.html: a classe solta "size3" aparece no expoente de w^\top, mas é
// escala de FONTE (.katex-sizing.reset-size6.size3), não família — ⊤ não precisa de KaTeX_Size3
// nenhum (cai no default KaTeX_Main). Quem de fato pede KaTeX_Size1/Size2 ali é o \sum, e a classe
// que aparece nele não é "size1"/"size2": é o PAR ".op-symbol.small-op" (Size1, forma em texto) ou
// ".op-symbol.large-op" (Size2, forma em destaque) — um leitor de classe solta erraria os dois lados:
// incluiria Size3 à toa e deixaria de incluir Size2, que É usado.
const FAMILIA_POR_CLASSES = [
  [['mathnormal'], 'KaTeX_Math'],
  [['boldsymbol'], 'KaTeX_Math'],
  [['mathit'], 'KaTeX_Main'],
  [['mathbf'], 'KaTeX_Main'],
  [['mainrm'], 'KaTeX_Main'],
  [['textrm'], 'KaTeX_Main'],
  [['amsrm'], 'KaTeX_AMS'],
  [['mathbb'], 'KaTeX_AMS'],
  [['textbb'], 'KaTeX_AMS'],
  [['mathcal'], 'KaTeX_Caligraphic'],
  [['mathfrak'], 'KaTeX_Fraktur'],
  [['textfrak'], 'KaTeX_Fraktur'],
  [['mathboldfrak'], 'KaTeX_Fraktur'],
  [['textboldfrak'], 'KaTeX_Fraktur'],
  [['mathtt'], 'KaTeX_Typewriter'],
  [['texttt'], 'KaTeX_Typewriter'],
  [['mathscr'], 'KaTeX_Script'],
  [['textscr'], 'KaTeX_Script'],
  [['mathsf'], 'KaTeX_SansSerif'],
  [['textsf'], 'KaTeX_SansSerif'],
  [['mathboldsf'], 'KaTeX_SansSerif'],
  [['textboldsf'], 'KaTeX_SansSerif'],
  [['mathsfit'], 'KaTeX_SansSerif'],
  [['mathitsf'], 'KaTeX_SansSerif'],
  [['textitsf'], 'KaTeX_SansSerif'],
  [['op-symbol', 'small-op'], 'KaTeX_Size1'],
  [['op-symbol', 'large-op'], 'KaTeX_Size2'],
  [['delimsizing', 'size1'], 'KaTeX_Size1'],
  [['delimsizing', 'size2'], 'KaTeX_Size2'],
  [['delimsizing', 'size3'], 'KaTeX_Size3'],
  [['delimsizing', 'size4'], 'KaTeX_Size4'],
  [['delimsizing', 'mult', 'delim-size1'], 'KaTeX_Size1'],
  [['delimsizing', 'mult', 'delim-size4'], 'KaTeX_Size4'],
];

// Classes do próprio elemento mais as de todo ancestral até a raiz ".katex" (inclusive). Cobre tanto
// o seletor simples (uma classe no próprio nó, caso de ".mathnormal") quanto o composto entre
// ancestral e descendente (".delimsizing.mult .delim-sizeN > span"), um pouco largo demais só para
// esse último par — pior caso é embutir uma família a mais (custo: alguns kB), nunca deixar de
// embutir uma que falta (custo: glifo errado, ou o próprio saida.glifo-ausente acusando à toa).
function classesAteRaizKatex(elemento) {
  const classes = new Set();
  for (let no = elemento; no; no = no.parentElement) {
    for (const classe of no.classList) classes.add(classe);
    if (no.classList.contains('katex')) break;
  }
  return classes;
}

// Quais famílias do KaTeX a aula usa, lendo o documento já renderizado. `doc` chega DEPOIS de
// renderizarTex (ver cabeçalho) — antes disso não existe ".katex" nenhum para ler.
function familiasDoKatexUsadas(doc) {
  const raizes = [...doc.querySelectorAll('.katex')];
  if (raizes.length === 0) return [];
  // KaTeX_Main é o default de ".katex" (font: normal 1.21em KaTeX_Main, ...; medido em katex.css) e
  // também para onde .mathit/.mathbf/.mainrm/.textrm apontam — toda aula com QUALQUER matemática usa
  // algum glifo em Main (medido: ←, ∇, ⊤, Δ, ⋅ do espécime chegam sem nenhuma classe de família, e são
  // exatamente os que caem aqui).
  const familias = new Set(['KaTeX_Main']);
  for (const raiz of raizes) {
    for (const elemento of [raiz, ...raiz.querySelectorAll('*')]) {
      const classes = classesAteRaizKatex(elemento);
      for (const [exigidas, familia] of FAMILIA_POR_CLASSES) {
        if (exigidas.every((classe) => classes.has(classe))) familias.add(familia);
      }
    }
  }
  return [...familias].sort();
}

async function comoDataUriDeFonte(caminho) {
  const bytes = await readFile(caminho);
  return `data:font/woff2;base64,${bytes.toString('base64')}`;
}

// As oito fontes do sistema (spec 8.3), sempre — gerarFontesCss já é a fonte única do @font-face de
// desenvolvimento (URL relativa); aqui só se troca cada URL pelo data URI do mesmo arquivo.
async function cssEFontesDoSistema(raiz) {
  const pasta = new URL('assets/fontes/', raiz);
  const manifesto = JSON.parse(await readFile(new URL('fontes.json', pasta), 'utf8'));
  const comDataUri = await Promise.all(manifesto.map(async (item) => {
    const caminho = new URL(item.arquivo, pasta);
    return { arquivo: item.arquivo, caminho, uri: await comoDataUriDeFonte(caminho) };
  }));
  let css = gerarFontesCss(manifesto);
  for (const { arquivo, uri } of comDataUri) css = css.replaceAll(`url('../assets/fontes/${arquivo}')`, `url(${uri})`);
  return { css, caminhos: comDataUri.map((item) => item.caminho) };
}

// "KaTeX_Main-BoldItalic.woff2" -> "KaTeX_Main"; "KaTeX_Size1-Regular.woff2" -> "KaTeX_Size1". Nenhum
// nome de família do KaTeX tem hífen (medido nos 12 @font-face de katex.css), então cortar no ÚLTIMO
// hífen do nome do arquivo sempre separa família de variante.
function familiaDoArquivoKatex(arquivoComExtensao) {
  const semExtensao = arquivoComExtensao.replace(/\.(?:woff2|woff|ttf)$/, '');
  return semExtensao.slice(0, semExtensao.lastIndexOf('-'));
}

// A CSS do KaTeX (spec 3.3, etapa 4): só entra se a aula usa TeX. Cada url(fonts/…) vira data URI se
// o arquivo é woff2 de uma família incluída; o resto (as outras famílias, e os formatos woff/ttf de
// reserva das famílias incluídas) vira url() vazio — o Chrome pula essa entrada de src sem pedir rede,
// e a família some da CSS por trás de um @font-face que nunca resolve, o que é diferente de omiti-la:
// as regras de classe de katex.css continuam batendo com os 12 nomes de font-family que elas esperam.
async function cssEFontesDoKatex(raiz, familias) {
  if (familias.length === 0) return { css: '', caminhos: [] };
  const bruta = await readFile(new URL(CAMINHO_CSS_KATEX, raiz), 'utf8');
  const pastaFontes = new URL(PASTA_FONTES_KATEX, raiz);
  const incluidas = new Set(familias);
  const arquivosParaEmbutir = [...new Set(
    [...bruta.matchAll(/url\(fonts\/([^)]+\.woff2)\)/g)]
      .map(([, arquivo]) => arquivo)
      .filter((arquivo) => incluidas.has(familiaDoArquivoKatex(arquivo))),
  )];
  const dataUris = new Map(await Promise.all(arquivosParaEmbutir.map(async (arquivo) =>
    [arquivo, await comoDataUriDeFonte(new URL(arquivo, pastaFontes))])));
  const css = bruta.replace(/url\(fonts\/([^)]+)\)/g, (_match, arquivo) => (
    dataUris.has(arquivo) ? `url(${dataUris.get(arquivo)})` : 'url()'
  ));
  return { css, caminhos: arquivosParaEmbutir.map((arquivo) => new URL(arquivo, pastaFontes)) };
}

export async function embutirFontes({ raiz, doc }) {
  renderizarTex(doc.body, { katex });
  const familias = familiasDoKatexUsadas(doc);
  const [sistema, doKatex] = await Promise.all([
    cssEFontesDoSistema(raiz),
    cssEFontesDoKatex(raiz, familias),
  ]);
  const conjuntos = await Promise.all([...sistema.caminhos, ...doKatex.caminhos].map(pontosDoArquivo));
  const cobertura = new Set();
  for (const conjunto of conjuntos) for (const ponto of conjunto) cobertura.add(ponto);
  const css = doKatex.css ? `${sistema.css}\n${doKatex.css}` : sistema.css;
  return { css, cobertura, familias };
}
