// Leitor de CSV dos gráficos (spec 7.2: "dados": caminho de um CSV). Um só, e do lado navegador: o
// build (build/embutir.mjs, build/carregar.mjs) e o runtime (montar/entrada.js, no desenvolvimento e
// no pacote de dist/) leem o mesmo arquivo com este mesmo módulo — dois leitores seriam duas verdades
// sobre o mesmo CSV. Sem nada de Node: quem busca os bytes (disco ou fetch) é quem chama; aqui só se
// acha o caminho e se interpreta o texto. Sem dependência nova, e por isso de propósito pequeno — o
// formato que ele aceita é este, e só este:
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

// Os caminhos de CSV que os gráficos de `raiz` pedem, sem repetição e na ordem do documento: o
// `dados` de cada figure.grafico que é texto. JSON inválido ou `dados` que não é texto (inline, ou
// ausente) ficam de fora — quem confere a FORMA do campo é recursos.grafico (estática); aqui só se
// sabe que arquivos há para buscar. Uma função só para os três que buscam: o disco do build para
// recursos.csv (build/carregar.mjs) e para o desenho (build/embutir.mjs), e o fetch do runtime
// (montar/entrada.js).
export function caminhosDeCsv(raiz) {
  const caminhos = new Set();
  for (const script of raiz.querySelectorAll('figure.grafico > script[type="application/json"]')) {
    let especificacao;
    try {
      especificacao = JSON.parse(script.textContent);
    } catch {
      continue;
    }
    if (typeof especificacao?.dados === 'string') caminhos.add(especificacao.dados);
  }
  return [...caminhos];
}

// O `dados` que desenharGraficos consulta, a partir dos textos já buscados (Map caminho → texto):
// caminho, como o autor o escreveu, → colunas. Cada entrada é um getter, e não o resultado já lido,
// por um motivo só: um CSV malformado faz lerCsv lançar, e lançar DENTRO de desenharGraficos (que lê
// dados[caminho] no try dela) é o que põe a mensagem de lerCsv no erro daquele gráfico, com o trecho
// do JSON dele — em vez de derrubar o build, ou a montagem da aula, inteiros. Caminho que não foi
// buscado fica fora do mapa, e desenharGraficos diz que ele não foi lido.
export function colunasDosCsvs(textos) {
  const dados = {};
  for (const [caminho, texto] of textos) {
    Object.defineProperty(dados, caminho, { enumerable: true, get: () => lerCsv(texto) });
  }
  return dados;
}
