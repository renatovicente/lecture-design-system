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
import { REGRAS_DE_CARGA, REGRAS_DE_SAIDA } from '../validador/regras/index.js';

// `<slug>` é o nome da pasta da aula (spec 3.3, "aula-usp build <pasta>"): o pai de caminhoDaAula,
// nunca a raiz do sistema — cada aula real mora na própria pasta (index.html ao lado de figuras/,
// por exemplo), e é essa pasta que dá nome ao HTML final.
function slugDaAula(caminhoDaAula) {
  return basename(dirname(fileURLToPath(caminhoDaAula)));
}

// Revisão final do 5b, I2: construirHtml já resolve TeX e código (etapa 3) e já sabe quando um dos
// dois falha — descartar errosDeTex/errosDeCodigo aqui é o que fazia uma aula com TeX quebrado
// construir e gravar validacao.json limpo. matematica.tex-invalido é a regra de carga que já existe
// (validador/regras/carga.js): reusá-la, alimentada só com recursos.tex, devolve o achado com a
// mesma severidade/ação do contrato, sem duplicar a forma. Sem `.elemento` (renderizarTex não
// devolve um — só montar/entrada.js o reconstrói, comparando DOIS documentos; construirHtml tem um
// só), o achado sai com slide/id nulos: continua contando como erro, só sem apontar o slide exato.
function achadosDeTex(contrato, doc, errosDeTex) {
  return validar(doc, { contrato, regras: REGRAS_DE_CARGA, grupo: 'carga', recursos: { tex: errosDeTex } });
}

// prerenderizarCodigo só relata a mesma condição que recursos.linguagem já nomeia (data-lang fora de
// contrato.linguagens) — reusa nome, severidade e ação dela em vez de inventar uma regra nova para o
// mesmo defeito. Sem elemento/trecho (o erro do Shiki só traz linguagem e mensagem).
function achadosDeCodigo(contrato, errosDeCodigo) {
  const definicao = contrato.regras['recursos.linguagem'];
  return errosDeCodigo.map((erro) => ({
    severidade: definicao.severidade,
    slide: null,
    id: null,
    regra: 'recursos.linguagem',
    mensagem: `${erro.mensagem}.`,
    acao: definicao.acao,
    trecho: null,
  }));
}

export async function construir({ raiz, caminhoDaAula, destino }) {
  // O mesmo contrato que construirHtml já leu por conta própria (ele não o devolve): a leitura dobrada
  // é dois usos do mesmo arquivo-fonte, não duas implementações de um cálculo — sem risco de divergir.
  const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', raiz), 'utf8'));
  const { html, doc, fontes, errosDeTex, errosDeCodigo } = await construirHtml({ raiz, caminhoDaAula, embutirFontes });

  // As regras de saída (spec 9.2) rodam sobre o próprio HTML final: `bytes` é o tamanho do arquivo que
  // de fato será gravado. Cobertura é dependente de contexto (revisão final do 5b, I1): as famílias do
  // KaTeX só são alcançáveis dentro de `.katex` (coberturaKatex), as do sistema valem em qualquer
  // lugar, mas só dentro do unicode-range de cada face (coberturaSistema) — ver saida.glifo-ausente.
  const achados = [
    ...achadosDeTex(contrato, doc, errosDeTex),
    ...achadosDeCodigo(contrato, errosDeCodigo),
    ...validar(doc, {
      contrato,
      regras: REGRAS_DE_SAIDA,
      grupo: 'saida',
      coberturaSistema: fontes.coberturaSistema,
      coberturaKatex: fontes.coberturaKatex,
      bytes: Buffer.byteLength(html),
    }),
  ];

  await mkdir(destino, { recursive: true });
  const caminhoDoHtml = join(destino, `${slugDaAula(caminhoDaAula)}.html`);
  await Promise.all([
    writeFile(caminhoDoHtml, html, 'utf8'),
    writeFile(join(destino, 'validacao.json'), `${JSON.stringify(achados, null, 2)}\n`, 'utf8'),
  ]);

  return { html, achados, erros: contar(achados).erros, caminhoDoHtml };
}
