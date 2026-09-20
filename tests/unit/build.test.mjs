// Comando `aula-usp build` (spec 3.3): a tarefa de orquestração não acrescenta capacidade — tudo o
// que ela chama já existe e já foi testado por conta própria (construir, medirComposicao, gerarPdf,
// saida.pdf-paginas). O que ela decide são as TRANSIÇÕES, e a spec 3.3 define quatro finais
// diferentes; o valor deste arquivo está em cada um deles ser exercitado, não em o caminho feliz
// funcionar. Em particular, "sem Chrome" e "erro de composição" gravam a MESMA lista de arquivos —
// só o código de saída e o aviso os distinguem — e os dois têm teste próprio abaixo que afirma os
// dois, não só a lista.
//
// Um Chrome só, aberto uma vez para o arquivo inteiro (before/after) e reaproveitado nos testes que
// realmente precisam gerar PDF: gerar PDF é lento, e o watchdog deste projeto é de 600 s por
// comando — a mesma razão de tests/integracao/pdf.test.mjs. medirComposicao (etapa 5) abre e fecha
// o Chrome dela mesma, sempre (build/composicao.mjs, de antes deste marco, não aceita um navegador
// de fora); só a etapa 6 (gerarPdf) aceita reaproveitamento, e é isso que o parâmetro `navegador` de
// build() (não documentado como parte pública da interface — comentário em build/build.mjs) permite
// aqui: um Chrome a menos por teste, não um a mais.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { chromium } from 'playwright-core';
import { build } from '../../build/build.mjs';
import { paginasEsperadas } from '../../motor/impressao.js';

const RAIZ = new URL('../../', import.meta.url);
const pastaTemporaria = () => mkdtemp(join(tmpdir(), 'build-'));
const fixture = (nome) => new URL(`../fixtures/build/${nome}/aula.html`, import.meta.url);

let navegador;
before(async () => {
  console.error('build.test.mjs: abrindo o Chrome (uma vez para o arquivo inteiro)');
  navegador = await chromium.launch(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : { channel: 'chrome' });
});
after(async () => {
  await navegador?.close();
});

test('final 1 — erro estático na etapa 1: grava só validacao.json, sem HTML, e sai 1', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('erro-estatico'), destino });
  assert.equal(r.codigo, 1);
  assert.deepEqual((await readdir(destino)).sort(), ['validacao.json']);
  assert.ok(r.achados.some((a) => a.regra === 'estrutura.metadados'), JSON.stringify(r.achados));
  assert.equal(r.avisoSemChrome, undefined);
  assert.equal(r.paginas, undefined);
});

test('final 2 — erro de composição na etapa 5: grava HTML e validacao.json, sem PDF, e sai 1', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('erro-composicao'), destino, navegador });
  assert.equal(r.codigo, 1);
  assert.deepEqual((await readdir(destino)).sort(), ['erro-composicao.html', 'validacao.json']);
  assert.ok(r.achados.some((a) => a.regra === 'composicao.transbordo'), JSON.stringify(r.achados));
  // Mesma regressão do final 4/caminho feliz (comentário lá): os avisos de estática desta fixture
  // (as mesmas duas condições de aula-limpa) têm de sobreviver ao lado do erro de composição.
  assert.ok(r.achados.some((a) => a.regra === 'estrutura.blocos'), JSON.stringify(r.achados));
  assert.ok(r.achados.some((a) => a.regra === 'estrutura.notas-ausentes'), JSON.stringify(r.achados));
  // Distingue este final do final 4 (mesma lista de arquivos, código igual a 1 aqui e 0 lá): aqui
  // NÃO há aviso de Chrome ausente — o Chrome rodou, e foi ELE quem achou o erro.
  assert.equal(r.avisoSemChrome, undefined);
  assert.equal(r.paginas, undefined, 'não deveria ter chegado a gerar PDF');
  const validacao = JSON.parse(await readFile(join(destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(validacao, r.achados);
});

test('final 3 — erro de saída na etapa 7: mantém HTML e PDF gravados, e sai 1', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('erro-saida'), destino, navegador });
  assert.equal(r.codigo, 1);
  assert.deepEqual((await readdir(destino)).sort(), ['erro-saida.html', 'erro-saida.pdf', 'validacao.json'].sort());
  // A referência externa é achada por construir() (etapas 2-4), não pela etapa 7 — e mesmo assim o
  // build precisa terminar as etapas 5 e 6 (composição limpa, PDF gerado) antes de decidir o código
  // final: as quatro regras de saída são concatenadas num só veredito, na etapa 7 (comentário de
  // SO_PDF_PAGINAS em build/build.mjs).
  assert.ok(r.achados.some((a) => a.regra === 'saida.referencia-externa'), JSON.stringify(r.achados));
  // E o número de páginas do PDF bate com o esperado: o único defeito desta fixture é a referência
  // externa, não a contagem de páginas — saida.pdf-paginas roda (não se cala) e não acusa nada,
  // prova de que a etapa 7 recebeu números de verdade, não só de que ela existe.
  assert.ok(!r.achados.some((a) => a.regra === 'saida.pdf-paginas'), JSON.stringify(r.achados));
  assert.equal(typeof r.paginas, 'number');
  assert.ok(r.paginas > 0);
});

test('final 4 — sem Chrome: grava HTML (não o PDF), avisa, e sai 0 se não houver erro', async () => {
  const destino = await pastaTemporaria();
  const anterior = process.env.CHROME_PATH;
  process.env.CHROME_PATH = '/caminho/que/nao/existe/de-verdade';
  let r;
  try {
    r = await build({ raiz: RAIZ, caminhoDaAula: fixture('aula-limpa'), destino });
  } finally {
    if (anterior === undefined) delete process.env.CHROME_PATH;
    else process.env.CHROME_PATH = anterior;
  }
  assert.equal(r.codigo, 0);
  // Mesma lista de arquivos do final 2 (acima) — só o código e o aviso diferem, e os dois são
  // afirmados aqui: é exatamente o par que um teste frouxo, que só olhasse a lista, não distinguiria.
  assert.deepEqual((await readdir(destino)).sort(), ['aula-limpa.html', 'validacao.json']);
  assert.match(r.avisoSemChrome, /composição pulada, sem Chrome/);
  assert.equal(r.paginas, undefined);
  assert.equal(r.achados.filter((a) => a.severidade === 'erro').length, 0);
  // Regressão: a primeira versão de build() atribuía achados = achadosDoConstruir depois da etapa
  // 2-4, em vez de concatenar — o que descartava os achados da etapa 1 (estática+carga) inteiros
  // sempre que não havia erro ali. aula-limpa tem exatamente dois avisos de estática
  // (estrutura.blocos: só 1 abertura; estrutura.notas-ausentes: o slide de conteúdo não tem notas) —
  // sem a correção, esta asserção falha com [] em vez dos dois. Achado rodando os seis decks do
  // espécime pela CLI de verdade (não previsto no brief): nenhum teste dos quatro finais, sozinho,
  // pegava isto, porque nenhum deles afirmava a lista COMPLETA de achados no caso de sucesso.
  assert.deepEqual(new Set(r.achados.map((a) => a.regra)), new Set(['estrutura.blocos', 'estrutura.notas-ausentes']));
});

test('caminho feliz: grava HTML, PDF e validacao.json, e sai 0', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('aula-limpa'), destino, navegador });
  assert.equal(r.codigo, 0);
  assert.deepEqual((await readdir(destino)).sort(), ['aula-limpa.html', 'aula-limpa.pdf', 'validacao.json'].sort());
  assert.equal(r.achados.filter((a) => a.severidade === 'erro').length, 0);
  assert.equal(r.avisoSemChrome, undefined);
  // O PDF de verdade tem o número de páginas que paginasEsperadas prevê a partir do MESMO HTML que
  // foi gravado — a mesma prova de wiring que o final 3 faz, desta vez no caso em que os dois
  // números batem (fato 4 do plano: "a regra é uma comparação, não uma heurística").
  const html = await readFile(join(destino, 'aula-limpa.html'), 'utf8');
  const esperadas = paginasEsperadas(parseHTML(html).document);
  assert.equal(r.paginas, esperadas);
  assert.ok(!r.achados.some((a) => a.regra === 'saida.pdf-paginas'), JSON.stringify(r.achados));
  // Mesma regressão do final 4 (comentário lá): os dois avisos de estática de aula-limpa têm de
  // sobreviver até o fim do pipeline inteiro, não só até a etapa 1.
  assert.deepEqual(new Set(r.achados.map((a) => a.regra)), new Set(['estrutura.blocos', 'estrutura.notas-ausentes']));
});

test('--sem-pdf: pula as etapas 6 e 7, grava HTML e validacao.json, e sai 0', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('aula-limpa'), destino, navegador, semPdf: true });
  assert.equal(r.codigo, 0);
  assert.deepEqual((await readdir(destino)).sort(), ['aula-limpa.html', 'validacao.json']);
  assert.equal(r.paginas, undefined);
});
