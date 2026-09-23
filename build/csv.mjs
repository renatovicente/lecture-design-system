// Leitor de CSV dos gráficos (spec 7.2: "dados": caminho de um CSV, modo build). Só o build lê CSV:
// no navegador, a especificação traz as colunas inline. Sem dependência nova, e por isso de propósito
// pequeno — o formato que ele aceita é este, e só este:
//   - a primeira linha não vazia é o cabeçalho, com o nome de cada coluna;
//   - separador vírgula; fim de linha \n ou \r\n; linhas em branco são ignoradas;
//   - espaço em volta de cada campo é cortado;
//   - uma coluna em que todo campo é um número (Number() finito) sai como números; qualquer outra
//     sai como texto, que é o que o eixo de categorias de "barras" precisa.
// O que ele NÃO trata, e recusa ou lê errado: campo entre aspas (e portanto vírgula ou quebra de
// linha dentro de um campo — as aspas ficam no texto); vírgula decimal ("0,5" vira dois campos);
// ponto e vírgula ou tabulação como separador (a linha inteira vira um campo só); separador de
// milhar; BOM no início do arquivo é cortado, nenhuma outra marca de codificação é conferida.
// Linha com número de campos diferente do cabeçalho, campo vazio e nome de coluna repetido ou vazio
// são recusados com a linha na mensagem, em vez de virarem uma coluna torta calada.
export function lerCsv(texto) {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/)
    .map((linha, indice) => ({ numero: indice + 1, campos: linha.split(',').map((campo) => campo.trim()) }))
    .filter(({ campos }) => !(campos.length === 1 && campos[0] === ''));
  if (linhas.length === 0) throw new Error('CSV vazio: falta o cabeçalho com o nome das colunas');
  const [{ campos: nomes }, ...dados] = linhas;
  const vistos = new Set();
  for (const nome of nomes) {
    if (nome === '') throw new Error('CSV com nome de coluna vazio no cabeçalho (linha 1)');
    if (vistos.has(nome)) throw new Error(`CSV com a coluna "${nome}" repetida no cabeçalho (linha 1)`);
    vistos.add(nome);
  }
  const brutas = nomes.map(() => []);
  for (const { numero, campos } of dados) {
    if (campos.length !== nomes.length) {
      throw new Error(`CSV com ${campos.length} campos na linha ${numero}; o cabeçalho tem ${nomes.length}`);
    }
    campos.forEach((campo, j) => {
      if (campo === '') throw new Error(`CSV com campo vazio na linha ${numero}, coluna "${nomes[j]}"`);
      brutas[j].push(campo);
    });
  }
  return Object.fromEntries(nomes.map((nome, j) => {
    const numeros = brutas[j].map(Number);
    return [nome, numeros.every(Number.isFinite) ? numeros : brutas[j]];
  }));
}
