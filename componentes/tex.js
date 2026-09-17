// Matemática em TeX (spec 4.3, 6.4 e 7.1): acha \( \) e \[ \] no texto e troca cada trecho pelo HTML do KaTeX.
// O KaTeX chega por parâmetro, para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.

const ABERTURAS = {
  '\\(': { fechamento: '\\)', tipo: 'inline' },
  '\\[': { fechamento: '\\]', tipo: 'destaque' },
};

// Texto que nunca é matemática: código, scripts, SVG e o que já foi renderizado.
const FORA = 'pre, code, script, style, textarea, svg, [data-tex]';

// O KaTeX pinta com errorColor os comandos que o trust recusa (\href, \url, \includegraphics, \htmlClass...);
// uma cor que ninguém escreve deixa o módulo transformar esse texto vermelho num erro.
const COR_DE_ERRO = '#010203';
const MACROS = { '\\passo': '\\htmlData{passo=#1}{#2}' };
// Número de passo: a regra de motor/passos.js. O KaTeX não apara o valor, então \passo{ 1 } também é inválido.
const NUMERO_DE_PASSO = /^[1-9][0-9]*$/;

const COMANDOS_SEM_TEXTO = new Set([
  'text', 'textrm', 'textbf', 'textit', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathcal', 'mathbb',
  'boldsymbol', 'operatorname', 'displaystyle', 'left', 'right',
]);

function fechamentoDe(texto, desde, fechamento) {
  for (let i = desde; i < texto.length - 1; i += 1) {
    if (texto[i] !== '\\') continue;
    if (texto.startsWith(fechamento, i)) return i;
    i += 1; // o caractere escapado não fecha nada: \\) é quebra de linha seguida de parêntese
  }
  return -1;
}

export function segmentosDeTex(texto) {
  const segmentos = [];
  let inicio = 0;
  for (let i = 0; i < texto.length - 1; i += 1) {
    if (texto[i] !== '\\') continue;
    const abertura = ABERTURAS[texto.slice(i, i + 2)];
    const fim = abertura ? fechamentoDe(texto, i + 2, abertura.fechamento) : -1;
    if (fim < 0) {
      i += 1;
      continue;
    }
    if (i > inicio) segmentos.push({ tipo: 'texto', texto: texto.slice(inicio, i) });
    segmentos.push({ tipo: abertura.tipo, tex: texto.slice(i + 2, fim), trecho: texto.slice(i, fim + 2) });
    inicio = fim + 2;
    i = inicio - 1;
  }
  if (inicio < texto.length) segmentos.push({ tipo: 'texto', texto: texto.slice(inicio) });
  return segmentos;
}

// TeX em texto simples, para o rótulo do cabeçalho, o slug e o aria-label: sem barras nem chaves.
export function texParaTexto(tex) {
  return tex
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\(?:[,;:! ]|qquad|quad)/g, ' ')
    .replace(/\\([a-zA-Z]+)/g, (_, nome) => (COMANDOS_SEM_TEXTO.has(nome) ? ' ' : ` ${nome}`))
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/([_^]) /g, '$1')
    .trim();
}

export function textoSemTex(texto) {
  return segmentosDeTex(texto)
    .map((segmento) => (segmento.tipo === 'texto' ? segmento.texto : texParaTexto(segmento.tex)))
    .join('');
}

// Tira as cores que \color, \textcolor, \colorbox, \fcolorbox e atalhos como \red deixam no HTML (spec 4.2).
// No MathML, o \fcolorbox escreve a cor no atalho border; as bordas do HTML visível vêm em propriedades longas, que ficam.
function semCores(html) {
  return html
    .replace(/\s(?:mathcolor|mathbackground)="[^"]*"/g, '')
    .replace(/\sstyle="([^"]*)"/g, (_, css) => {
      const limpo = css.split(';').filter((declaracao) => declaracao.trim()
        && !/^\s*(?:color|background-color|border-color|border)\s*:/i.test(declaracao));
      return limpo.length ? ` style="${limpo.join(';')};"` : '';
    });
}

function htmlDoKatex(katex, tex, tipo) {
  const html = katex.renderToString(tex, {
    displayMode: tipo === 'destaque',
    throwOnError: true,
    strict: 'ignore',
    errorColor: COR_DE_ERRO,
    macros: { ...MACROS },
    trust: (contexto) => contexto.command === '\\htmlData',
  });
  if (html.toLowerCase().includes(COR_DE_ERRO)) throw new Error('comando não permitido no TeX');
  for (const [, numero] of html.matchAll(/data-passo="([^"]*)"/g)) {
    if (!NUMERO_DE_PASSO.test(numero)) throw new Error(`número de passo inválido em \\passo: "${numero}"`);
  }
  return semCores(html);
}

function textosComTex(raiz) {
  const nos = [];
  const andar = (no) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 3) {
        if (filho.nodeValue.includes('\\(') || filho.nodeValue.includes('\\[')) nos.push(filho);
      } else if (filho.nodeType === 1 && !filho.matches(FORA)) {
        andar(filho);
      }
    }
  };
  andar(raiz);
  return nos;
}

function renderizarSegmento(doc, katex, segmento, erros) {
  if (segmento.tipo === 'texto') return doc.createTextNode(segmento.texto);
  const destaque = segmento.tipo === 'destaque';
  try {
    const molde = doc.createElement('template');
    molde.innerHTML = htmlDoKatex(katex, segmento.tex, segmento.tipo);
    const html = molde.content.firstChild;
    if (!destaque) {
      html.setAttribute('data-tex', segmento.tex);
      return html;
    }
    const equacao = doc.createElement('div');
    equacao.className = 'equacao';
    equacao.setAttribute('data-tex', segmento.tex);
    equacao.append(html);
    return equacao;
  } catch (erro) {
    const mensagem = String(erro.message).replace(/^KaTeX parse error: /, '');
    erros.push({ trecho: segmento.trecho, mensagem });
    const alerta = doc.createElement(destaque ? 'div' : 'span');
    alerta.className = destaque ? 'equacao tex-invalido' : 'tex-invalido';
    alerta.setAttribute('data-tex', segmento.tex);
    alerta.setAttribute('title', mensagem);
    alerta.textContent = segmento.trecho;
    return alerta;
  }
}

// Troca, dentro de raiz, cada \( \) e \[ \] pelo HTML do KaTeX; devolve os erros, cada um com o trecho e a mensagem.
export function renderizarTex(raiz, { katex }) {
  const doc = raiz.ownerDocument ?? raiz;
  const erros = [];
  // O linkedom divide o texto em cada referência de caractere (&lt;, &amp;); juntar os nós mantém cada trecho de TeX inteiro.
  raiz.normalize();
  for (const no of textosComTex(raiz)) {
    const segmentos = segmentosDeTex(no.nodeValue);
    if (segmentos.every((segmento) => segmento.tipo === 'texto')) continue;
    no.replaceWith(...segmentos.map((segmento) => renderizarSegmento(doc, katex, segmento, erros)));
  }
  return erros;
}
