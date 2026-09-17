// Blocos de corpo que a montagem completa (spec 7.1): rótulos do exercício e células numéricas de tabela.

const NUMERO = /^(?:[+\-−]?(?:R\$ ?)?|R\$ ?[+\-−])(?:\d{1,3}(?:[., ]\d{3})+|\d+)(?:[.,]\d+)? ?%?$/;

export function ehNumerica(texto) {
  return NUMERO.test(texto.replace(/\s+/g, ' ').trim());
}

// Linhas desta tabela, sem as de uma tabela aninhada (closest só volta à própria tabela para as suas).
function linhasDaTabela(tabela) {
  return [...tabela.querySelectorAll('tr')].filter((linha) => linha.closest('table') === tabela);
}

// Coluna de cada célula, contando colspan e rowspan; célula que ocupa mais de uma coluna fica com null.
// Recebe a lista de linhas já filtrada: não usa seletores de tbody/thead, que o parser do navegador
// completa de forma implícita (spec 3.1) e o linkedom do build não completa.
function colunasDasCelulas(linhas) {
  const ocupadas = [];
  const colunas = new Map();
  linhas.forEach((linha, i) => {
    let coluna = 0;
    for (const celula of linha.children) {
      while (ocupadas[i]?.has(coluna)) coluna += 1;
      const largura = Number(celula.getAttribute('colspan')) || 1;
      const altura = Number(celula.getAttribute('rowspan')) || 1;
      colunas.set(celula, largura === 1 ? coluna : null);
      for (let di = 0; di < altura; di += 1) {
        for (let dc = 0; dc < largura; dc += 1) (ocupadas[i + di] ??= new Set()).add(coluna + dc);
      }
      coluna += largura;
    }
  });
  return colunas;
}

export function marcarCelulasNumericas(raiz) {
  for (const tabela of raiz.querySelectorAll('section table')) {
    const linhas = linhasDaTabela(tabela);
    const colunas = colunasDasCelulas(linhas);
    const comNumero = new Set();
    const comTexto = new Set();
    for (const linha of linhas) {
      if (linha.parentNode.nodeName === 'THEAD') continue;
      for (const celula of linha.children) {
        const coluna = colunas.get(celula);
        if (ehNumerica(celula.textContent)) {
          celula.classList.add('numerica');
          comNumero.add(coluna);
        } else if (celula.textContent.trim() !== '') {
          comTexto.add(coluna);
        }
      }
    }
    for (const linha of linhas) {
      if (linha.parentNode.nodeName !== 'THEAD') continue;
      for (const celula of linha.children) {
        const coluna = colunas.get(celula);
        // Extensão deste plano à spec 7.1: também alinha à direita o cabeçalho de uma coluna só
        // numérica (o autor pode reverter removendo esta condição).
        const colunaNumerica = coluna !== null && comNumero.has(coluna) && !comTexto.has(coluna);
        if (colunaNumerica || ehNumerica(celula.textContent)) celula.classList.add('numerica');
      }
    }
  }
}

export function rotularExercicios(raiz, rot) {
  for (const enunciado of raiz.querySelectorAll('div.exercicio > div.enunciado')) enunciado.setAttribute('data-rotulo', rot.exercicio);
  for (const resposta of raiz.querySelectorAll('div.exercicio > div.resposta')) resposta.setAttribute('data-rotulo', rot.resposta);
}
