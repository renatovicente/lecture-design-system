// Tarefa 4 do marco 5b (spec 3.3): amarra as três peças anteriores — construirHtml (tarefa 1),
// embutirFontes (tarefa 2) e REGRAS_DE_SAIDA (tarefa 3) — grava o HTML final e validacao.json em
// `destino`. NÃO é o comando `aula-usp build` nem o pipeline de sete etapas com os códigos de saída
// da spec 3.3: isso é do marco 5c, que vai chamar esta função como uma das etapas dele.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { construirHtml } from './embutir.mjs';
import { embutirFontes } from './fontes-embutidas.mjs';
import { validar, contar } from '../validador/validar.js';
import { REGRAS_DE_SAIDA } from '../validador/regras/index.js';

// `<slug>` é o nome da pasta da aula (spec 3.3, "aula-usp build <pasta>"): o pai de caminhoDaAula,
// nunca a raiz do sistema — cada aula real mora na própria pasta (index.html ao lado de figuras/,
// por exemplo), e é essa pasta que dá nome ao HTML final.
function slugDaAula(caminhoDaAula) {
  return basename(dirname(fileURLToPath(caminhoDaAula)));
}

export async function construir({ raiz, caminhoDaAula, destino }) {
  // O mesmo contrato que construirHtml já leu por conta própria (ele não o devolve): a leitura dobrada
  // é dois usos do mesmo arquivo-fonte, não duas implementações de um cálculo — sem risco de divergir.
  const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', raiz), 'utf8'));
  const { html, doc, fontes } = await construirHtml({ raiz, caminhoDaAula, embutirFontes });

  // As regras de saída (spec 9.2) rodam sobre o próprio HTML final: `cobertura` é sistema ∪ KaTeX
  // efetivamente embutido (fato 8, tarefa 2); `bytes`, o tamanho do arquivo que de fato será gravado.
  const achados = validar(doc, {
    contrato,
    regras: REGRAS_DE_SAIDA,
    grupo: 'saida',
    cobertura: fontes.cobertura,
    bytes: Buffer.byteLength(html),
  });

  await mkdir(destino, { recursive: true });
  const caminhoDoHtml = join(destino, `${slugDaAula(caminhoDaAula)}.html`);
  await Promise.all([
    writeFile(caminhoDoHtml, html, 'utf8'),
    writeFile(join(destino, 'validacao.json'), `${JSON.stringify(achados, null, 2)}\n`, 'utf8'),
  ]);

  return { html, achados, erros: contar(achados).erros, caminhoDoHtml };
}
