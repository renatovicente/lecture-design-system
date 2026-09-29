// O localizador de `section`s por intervalo de bytes (spec 2026-09-28, 5.1; plano do corrigir, D1).
//
// Trabalha sobre o TEXTO do fonte, sem parser de DOM, de propósito: um DOM não preserva os bytes do
// autor (aspas, espaços, grafia dos atributos, entidades), e `aula-usp slide --substituir` promete que
// fora do intervalo trocado o arquivo fica idêntico byte a byte. A troca é uma fatia:
// `texto.slice(0, inicio) + novo + texto.slice(fim)`.
//
// O que o percurso sabe do HTML é só o necessário para não se enganar com um `<section` ou um
// `</section>` que não é tag: o conteúdo de comentários (`<!-- … -->`) e o de `script`, `style`,
// `textarea` e `title` — texto cru até o fechamento, como o parser do navegador os trata — é pulado
// inteiro. Dentro de `pre`, um `</section>` do código já vem escapado (`&lt;/section&gt;`), e não
// casa. As aspas de um atributo são respeitadas: um `>` dentro de um valor não fecha a tag.
//
// Não importa nada do Node: recebe o texto e devolve números.

// Elementos cujo conteúdo o parser do HTML lê como texto até o fechamento (raw text e RCDATA).
const TEXTO_CRU = ['script', 'style', 'textarea', 'title'];

// `<nome` seguido de espaço, `>` ou `/` — `<sectionx` não é `<section`.
function ehTag(texto, i, nome) {
  if (texto.slice(i, i + nome.length).toLowerCase() !== nome) return false;
  const seguinte = texto[i + nome.length];
  return seguinte === undefined || seguinte === '>' || seguinte === '/' || /\s/.test(seguinte);
}

// A posição logo depois do `>` que fecha a tag que começa em `i`, respeitando aspas nos atributos.
function fimDaTag(texto, i) {
  let aspa = null;
  for (let j = i; j < texto.length; j++) {
    const c = texto[j];
    if (aspa) {
      if (c === aspa) aspa = null;
    } else if (c === '"' || c === "'") aspa = c;
    else if (c === '>') return j + 1;
  }
  return -1;
}

// O valor do atributo `id` de uma tag de abertura (o texto entre `<section` e `>`), ou null.
function idDaTag(tag) {
  const padrao = /\s([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const [, nome, duplas, simples, nuas] of tag.matchAll(padrao)) {
    if (nome.toLowerCase() === 'id') {
      const valor = duplas ?? simples ?? nuas ?? '';
      return valor === '' ? null : valor;
    }
  }
  return null;
}

// A linha (a partir de 1) da posição `i`: conta os \n antes dela, e CRLF conta uma vez.
function linhaDe(texto, i) {
  let linha = 1;
  for (let j = texto.indexOf('\n'); j !== -1 && j < i; j = texto.indexOf('\n', j + 1)) linha++;
  return linha;
}

// As `section`s do fonte, na ordem: [{ inicio, fim, id, linha }], com `inicio` no `<` de `<section`
// e `fim` logo depois do `>` de `</section>` (a fatia é `texto.slice(inicio, fim)`). Recusa com a
// linha o que o contrato não admite ou o que não fecha: section dentro de section, section sem
// `</section>`, `</section>` sem section aberta.
export function localizarSecoes(texto) {
  const secoes = [];
  let aberta = null;
  let i = 0;
  while (i < texto.length) {
    const lt = texto.indexOf('<', i);
    if (lt === -1) break;
    if (texto.startsWith('<!--', lt)) {
      const fim = texto.indexOf('-->', lt + 4);
      if (fim === -1) throw new Error(`comentário sem fechamento na linha ${linhaDe(texto, lt)}`);
      i = fim + 3;
      continue;
    }
    if (ehTag(texto, lt, '<section')) {
      if (aberta) throw new Error(`section dentro de section na linha ${linhaDe(texto, lt)}`);
      const fim = fimDaTag(texto, lt);
      if (fim === -1) throw new Error(`tag <section sem > na linha ${linhaDe(texto, lt)}`);
      aberta = { inicio: lt, id: idDaTag(texto.slice(lt + '<section'.length, fim - 1)), linha: linhaDe(texto, lt) };
      i = fim;
      continue;
    }
    if (ehTag(texto, lt, '</section')) {
      if (!aberta) throw new Error(`</section> sem section aberta na linha ${linhaDe(texto, lt)}`);
      const fim = fimDaTag(texto, lt);
      if (fim === -1) throw new Error(`tag </section sem > na linha ${linhaDe(texto, lt)}`);
      secoes.push({ inicio: aberta.inicio, fim, id: aberta.id, linha: aberta.linha });
      aberta = null;
      i = fim;
      continue;
    }
    const cru = TEXTO_CRU.find((nome) => ehTag(texto, lt, `<${nome}`));
    if (cru) {
      const fimDaAbertura = fimDaTag(texto, lt);
      if (fimDaAbertura === -1) break;
      // O fechamento é `</nome` sem distinção de caixa; sem ele, o resto do arquivo é texto do elemento.
      const resto = texto.slice(fimDaAbertura).toLowerCase();
      let k = resto.indexOf(`</${cru}`);
      while (k !== -1 && !ehTag(resto, k, `</${cru}`)) k = resto.indexOf(`</${cru}`, k + 1);
      i = k === -1 ? texto.length : fimDaAbertura + k;
      continue;
    }
    i = lt + 1;
  }
  if (aberta) throw new Error(`section sem </section> na linha ${aberta.linha}`);
  return secoes;
}

// O alvo de `aula-usp slide` e de `validar --slide` (D2): um id ou uma posição de 1 a N. Um id que
// existe ganha de um número que parece posição; um número sem id igual é posição. Devolve o índice
// (0 a N-1), ou -1.
export function resolverAlvo(secoes, alvo) {
  const texto = String(alvo);
  const porId = secoes.findIndex((secao) => secao.id === texto);
  if (porId !== -1) return porId;
  if (/^[0-9]+$/.test(texto)) {
    const posicao = Number(texto);
    if (posicao >= 1 && posicao <= secoes.length) return posicao - 1;
  }
  return -1;
}

// O texto com a section `indice` trocada por `novo`, e nada mais mexido.
export function substituirSecao(texto, secoes, indice, novo) {
  const { inicio, fim } = secoes[indice];
  return texto.slice(0, inicio) + novo + texto.slice(fim);
}
