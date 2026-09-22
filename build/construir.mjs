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

// `<slug>`, nas duas formas de alvo que caminhoDaAula (build/validar.mjs) aceita — e ele aceita as
// duas de propósito, porque `aula-usp validar` documenta o alvo-arquivo:
// - alvo que resolveu para `index.html`: o nome da PASTA. É literalmente o que a spec 3.3 diz da
//   forma que ela descreve ("`<slug>` é o nome da pasta da aula", em `aula-usp build <pasta>`) —
//   cada aula real mora na própria pasta (index.html ao lado de figuras/), e é a pasta que a nomeia;
// - qualquer outro arquivo: o basename sem `.html`. A spec não descreve esta forma, e até a revisão
//   final do 5c (I7) ela caía na regra de cima: seis decks lado a lado (é o caso de `especime/`)
//   produziam todos `<nome da pasta>.html` no mesmo dist/ e se sobrescreviam em silêncio — medido,
//   duas construções em sequência deixavam UM par .html/.pdf, não dois (tests/integracao/slug.test.mjs).
// Cálculo em cópia única: build/build.mjs nomeia o PDF por `basename(caminhoDoHtml, '.html')`,
// derivando do arquivo que esta função já nomeou em vez de repetir a conta (M4 — duas verdades sobre
// o mesmo nome é a classe de defeito que este projeto mais pagou caro).
function slugDaAula(caminhoDaAula) {
  const caminho = fileURLToPath(caminhoDaAula);
  return basename(caminho) === 'index.html' ? basename(dirname(caminho)) : basename(caminho, '.html');
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
//
// Pendência herdada do marco 5b ("recursos.linguagem passa a ser alcançável por dois caminhos quando
// a etapa 1 rodar antes da 3; confirmar se o segundo vira inalcançável ou fica como defesa em
// profundidade"), agora medida, não deduzida. Os dois caminhos disparam na MESMA condição:
// renderizarCodigo (componentes/codigo.js) só erra quando a linguagem está fora de
// destacador.linguagens, e esse conjunto é exatamente `usadas ∩ contrato.linguagens` — é o que
// prerenderizarCodigo filtra antes de importar gramática (build/embutir.mjs). Mesmo assim não sai
// duplicata dentro de build(): a regra é do grupo estático e tem severidade erro, então a etapa 1
// para no primeiro final e construir() nem chega a rodar. Medido pela CLI, numa aula com
// data-lang="cobol": "etapa 1/7 — erro; parando antes de montar", dist/ só com validacao.json, um
// único achado de recursos.linguagem. Fica, então, como defesa em profundidade — para quem chama
// construir() direto (a porta do marco 5b, que os testes usam) e para um pre[data-lang] fora de
// qualquer slide, que a regra, varrendo `slides`, não enxerga.
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

// Atualizado na tarefa 6 da fase 2a: a fase agora existe nos dois lados, mas não os dois AQUI. A
// etapa 1 (build/validar.mjs, lerERodarEstatica/validarCarga) já detecta fase 2 pela mesma regra de
// presença que montar/entrada.js usa — é o que faz `aula-usp build` parar de recusar um deck com
// gráfico antes de montar. Esta função continua sem o parâmetro porque nenhuma das duas chamadas a
// validar() abaixo (achadosDeTex, grupo carga com recursos = { tex }; e o grupo saida) tem regra
// fase 2 hoje — recursos.csv e recursos.dot (as duas regras de carga da fase 2) não leem recursos.tex,
// e nenhuma regra de saida é fase 2 (medido no contrato). O dia em que uma regra fase-2 desses dois
// grupos existir, o parâmetro entra aqui também, pela mesma razão de sempre: um validacao.json com
// metades de fases diferentes é pior que nenhum.
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
