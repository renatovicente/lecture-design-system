// Código com destaque (spec 4.2, 4.3 e 7.1): troca o texto de cada pre[data-lang] por linhas, com palavras-chave e comentários marcados.
// O Shiki chega por parâmetro, para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.
import { tokens } from '../tokens/tokens.js';

const { tinta, cinza, papel } = tokens.cor;
const NEGRITO = 2; // FontStyle.Bold do Shiki

// Tema monocromático gerado dos tokens: tinta no texto, cinza nos comentários, negrito nas palavras-chave.
export const TEMA = {
  name: 'aula-usp',
  type: 'light',
  fg: tinta,
  bg: papel,
  settings: [
    { settings: { foreground: tinta } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: cinza } },
    { scope: ['keyword', 'storage.type', 'storage.modifier', 'constant.language'], settings: { fontStyle: 'bold' } },
    // Operadores escritos com símbolos (=, <-, =>, -f) e o prefixo f"" do Python não são palavras-chave; os escritos com letras são.
    { scope: ['keyword.operator', 'storage.type.function.arrow', 'storage.type.string'], settings: { fontStyle: '' } },
    { scope: ['keyword.operator.logical.python', 'keyword.operator.new', 'keyword.operator.expression', 'keyword.operator.word'], settings: { fontStyle: 'bold' } },
    // No LaTeX, todo comando é palavra-chave, com a barra.
    {
      scope: ['text.tex support.function', 'text.tex punctuation.definition.function', 'text.tex constant.character.math',
        'text.tex punctuation.definition.constant.math', 'text.tex constant.other.general.math'],
      settings: { fontStyle: 'bold' },
    },
  ],
};

// Linhas de data-linhas="3-5,8"; o que não segue a forma fica de fora, e o validador acusa.
export function linhasMarcadas(valor) {
  const linhas = new Set();
  for (const intervalo of (valor ?? '').split(',')) {
    const partes = /^\s*(\d+)(?:-(\d+))?\s*$/.exec(intervalo);
    if (!partes) continue;
    const inicio = Number(partes[1]);
    const fim = Number(partes[2] ?? partes[1]);
    for (let numero = inicio; numero <= fim; numero += 1) linhas.add(numero);
  }
  return linhas;
}

// Texto do bloco sem as linhas vazias do começo e do fim: o parser do navegador descarta a quebra logo depois de <pre>,
// o do build não, e assim os dois contam as mesmas linhas.
export function codigoDoBloco(pre) {
  return pre.textContent.replace(/\r\n?/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '');
}

// O destacador com as gramáticas da aula, uma por valor de data-lang: { python: gramatica, ... }.
export function criarDestacador({ createShikiPrimitive, codeToTokensBase, createJavaScriptRegexEngine, gramaticas }) {
  const primitivo = createShikiPrimitive({
    engine: createJavaScriptRegexEngine(),
    langs: Object.values(gramaticas),
    themes: [TEMA],
  });
  return {
    linguagens: new Set(Object.keys(gramaticas)),
    linhas: (codigo, linguagem) => codeToTokensBase(primitivo, codigo, { lang: linguagem, theme: TEMA.name })
      .map((linha) => linha.map((token) => ({
        texto: token.content,
        // A cor vem antes do peso: uma etiqueta de JSDoc é negrito dentro de um comentário, e continua comentário.
        tipo: token.color.toUpperCase() === cinza ? 'comentario' : token.fontStyle & NEGRITO ? 'palavra-chave' : null,
      }))),
  };
}

function montarLinha(doc, pedacos, marcada) {
  const linha = doc.createElement('span');
  linha.className = marcada ? 'linha marcada' : 'linha';
  for (const { texto, tipo } of pedacos) {
    if (!tipo) {
      linha.append(texto);
      continue;
    }
    const pedaco = doc.createElement('span');
    pedaco.className = tipo;
    pedaco.textContent = texto;
    linha.append(pedaco);
  }
  return linha;
}

// Troca, dentro de raiz, o texto de cada pre[data-lang] por linhas; devolve os erros, cada um com a linguagem e a mensagem.
export function renderizarCodigo(raiz, { destacador }) {
  const doc = raiz.ownerDocument ?? raiz;
  const erros = [];
  for (const pre of raiz.querySelectorAll('pre[data-lang]')) {
    if (pre.firstElementChild?.classList.contains('linha')) continue;
    const linguagem = pre.getAttribute('data-lang');
    const codigo = codigoDoBloco(pre);
    let linhas;
    if (destacador.linguagens.has(linguagem)) {
      linhas = destacador.linhas(codigo, linguagem);
    } else {
      erros.push({ linguagem, mensagem: `linguagem fora da lista em data-lang: "${linguagem}"` });
      linhas = codigo.split('\n').map((texto) => [{ texto, tipo: null }]);
    }
    const marcadas = linhasMarcadas(pre.getAttribute('data-linhas'));
    // Uma quebra de linha entre as linhas: o texto do bloco continua sendo o código, e copiar do slide traz as linhas vazias.
    pre.replaceChildren(...linhas.flatMap((pedacos, k) => [...(k > 0 ? ['\n'] : []), montarLinha(doc, pedacos, marcadas.has(k + 1))]));
  }
  return erros;
}
