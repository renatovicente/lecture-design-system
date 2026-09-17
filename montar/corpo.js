// Blocos de corpo que a montagem completa (spec 7.1): rótulos do exercício e células numéricas de tabela.

const NUMERO = /^(?:R\$ ?)?[+\-−]?(?:\d{1,3}(?:[., ]\d{3})+|\d+)(?:[.,]\d+)? ?%?$/;

export function ehNumerica(texto) {
  return NUMERO.test(texto.replace(/\s+/g, ' ').trim());
}

// Coluna de cada célula, contando colspan e rowspan; célula que ocupa mais de uma coluna fica com null.
function colunasDasCelulas(tabela) {
  const ocupadas = [];
  const colunas = new Map();
  [...tabela.querySelectorAll('tr')].forEach((linha, i) => {
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
    const colunas = colunasDasCelulas(tabela);
    const comNumero = new Set();
    const comTexto = new Set();
    for (const celula of tabela.querySelectorAll('tbody td, tbody th')) {
      const coluna = colunas.get(celula);
      if (ehNumerica(celula.textContent)) {
        celula.classList.add('numerica');
        comNumero.add(coluna);
      } else if (celula.textContent.trim() !== '') {
        comTexto.add(coluna);
      }
    }
    for (const celula of tabela.querySelectorAll('thead td, thead th')) {
      const coluna = colunas.get(celula);
      const colunaNumerica = coluna !== null && comNumero.has(coluna) && !comTexto.has(coluna);
      if (colunaNumerica || ehNumerica(celula.textContent)) celula.classList.add('numerica');
    }
  }
}

export function rotularExercicios(raiz, rot) {
  for (const enunciado of raiz.querySelectorAll('div.exercicio > div.enunciado')) enunciado.setAttribute('data-rotulo', rot.exercicio);
  for (const resposta of raiz.querySelectorAll('div.exercicio > div.resposta')) resposta.setAttribute('data-rotulo', rot.resposta);
}
