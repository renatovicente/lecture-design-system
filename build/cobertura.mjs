// Gera validador/cobertura.json (spec 9.3): a fonte única de quais caracteres têm glifo nas fontes
// embutidas. Lido por matematica.simbolo-fora-do-tex e, no marco 5b, por saida.glifo-ausente.
// Node, não navegador — quem consome é o validador, que recebe o JSON já lido.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import * as fontkit from 'fontkit';

// O cmap traz entradas que não são caracteres que alguém escreve: o nulo, o carriage return e o
// não-caractere U+FFFF aparecem no Open Sans. Deixá-los entrar faria a regra aprovar um NUL literal.
// `> 0x20` também corta o espaço (U+20) de propósito: espaço e quebra de linha nunca precisam de
// glifo, e tirá-los daqui evita que a regra da tarefa 4 precise abrir exceção para eles.
const UTILIZAVEL = (ponto) => ponto > 0x20 && ponto !== 0xFFFF && ponto !== 0xFFFE;

// Faixas inclusivas, para o arquivo caber num olhar e não crescer linearmente com a fase 2.
function emFaixas(pontos) {
  const ordenados = [...pontos].sort((a, b) => a - b);
  const faixas = [];
  for (const ponto of ordenados) {
    const ultima = faixas.at(-1);
    if (ultima && ponto === ultima[1] + 1) ultima[1] = ponto;
    else faixas.push([ponto, ponto]);
  }
  return faixas;
}

// Os pontos utilizáveis do cmap de UM arquivo de fonte (woff2). Extraído para cá (marco 5b, tarefa 2)
// porque fontes-embutidas.mjs precisa do mesmo cmap para as famílias do KaTeX que embute — reusar
// esta função em vez de escrever um segundo leitor evita duas implementações do mesmo `fontkit.create`.
export async function pontosDoArquivo(caminho) {
  const fonte = fontkit.create(await readFile(caminho));
  const pontos = new Set();
  for (const ponto of fonte.characterSet) if (UTILIZAVEL(ponto)) pontos.add(ponto);
  return pontos;
}

export async function gerarCobertura({ raiz }) {
  const pasta = new URL('assets/fontes/', raiz);
  const arquivos = (await readdir(pasta)).filter((nome) => nome.endsWith('.woff2')).sort();
  const pontos = new Set();
  for (const arquivo of arquivos) {
    for (const ponto of await pontosDoArquivo(new URL(arquivo, pasta))) pontos.add(ponto);
  }
  // Sem timestamp nem qualquer outro campo não-determinístico: gerado-e-versionado só compra a
  // guarda "regerar não muda nada" (rodada de correção 1, item 3) se dois runs derem o mesmo objeto.
  return { fontes: arquivos, pontos: emFaixas(pontos) };
}

export async function escreverCobertura({ raiz }) {
  const cobertura = await gerarCobertura({ raiz });
  await writeFile(new URL('validador/cobertura.json', raiz), `${JSON.stringify(cobertura, null, 2)}\n`);
  return cobertura;
}
