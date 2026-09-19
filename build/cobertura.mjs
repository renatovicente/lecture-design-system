// Gera validador/cobertura.json (spec 9.3): a fonte única de quais caracteres têm glifo nas fontes
// embutidas. Lido por matematica.simbolo-fora-do-tex e, no marco 5b, por saida.glifo-ausente.
// Node, não navegador — quem consome é o validador, que recebe o JSON já lido.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import * as fontkit from 'fontkit';

// O cmap traz entradas que não são caracteres que alguém escreve: o nulo, o carriage return e o
// não-caractere U+FFFF aparecem no Open Sans. Deixá-los entrar faria a regra aprovar um NUL literal.
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

export function lerCobertura({ pontos }) {
  const conjunto = new Set();
  for (const [inicio, fim] of pontos) for (let p = inicio; p <= fim; p++) conjunto.add(p);
  return conjunto;
}

export async function gerarCobertura({ raiz }) {
  const pasta = new URL('assets/fontes/', raiz);
  const arquivos = (await readdir(pasta)).filter((nome) => nome.endsWith('.woff2')).sort();
  const pontos = new Set();
  for (const arquivo of arquivos) {
    const fonte = fontkit.create(await readFile(new URL(arquivo, pasta)));
    for (const ponto of fonte.characterSet) if (UTILIZAVEL(ponto)) pontos.add(ponto);
  }
  return { gerado: new Date().toISOString(), fontes: arquivos, pontos: emFaixas(pontos) };
}

export async function escreverCobertura({ raiz }) {
  const cobertura = await gerarCobertura({ raiz });
  await writeFile(new URL('validador/cobertura.json', raiz), `${JSON.stringify(cobertura, null, 2)}\n`);
  return cobertura;
}
