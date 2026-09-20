// O PDF é a entrega que sai da máquina do autor para os alunos. Este teste mede o artefato: número
// de páginas, tamanho da página e metadados. Chrome de verdade, porque é ele quem gera.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument, PDFName } from 'pdf-lib';
import { parseHTML } from 'linkedom';
import { iniciarChrome } from './utilitarios.mjs';
import { construir } from '../../build/construir.mjs';
import { gerarPdf } from '../../build/pdf.mjs';
import { paginasEsperadas } from '../../motor/impressao.js';

const RAIZ = new URL('../../', import.meta.url);
let navegador;
before(async () => { navegador = await iniciarChrome(); });
after(async () => { await navegador?.close(); });

const construirDeck = async (deck) => {
  const destino = await mkdtemp(join(tmpdir(), 'pdf-'));
  return construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${deck}`, RAIZ), destino });
};

test('o PDF tem exatamente o número de páginas que paginasEsperadas diz', async () => {
  const { caminhoDoHtml, html } = await construirDeck('matematica.html');
  const esperadas = paginasEsperadas(parseHTML(html).document);
  const { bytes, paginas } = await gerarPdf({ caminhoDoHtml, navegador, metadados: {} });
  // Medido antes deste plano: 11 para este deck — 8 slides mais as 3 cópias de data-pdf="passos".
  assert.equal(esperadas, 11, 'o deck mudou; confira se a mudança é de propósito antes de ajustar');
  assert.equal(paginas, esperadas);
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), esperadas);
});

test('a página do PDF tem o tamanho que a spec 8.4 pede', async () => {
  const { caminhoDoHtml } = await construirDeck('index.html');
  const { bytes } = await gerarPdf({ caminhoDoHtml, navegador, metadados: {} });
  const { width, height } = (await PDFDocument.load(bytes)).getPage(0).getSize();
  // 1280 × 720 px a 0,75 pt/px. Sem preferCSSPageSize o Chrome usa Letter e isto cai.
  assert.equal(Math.round(width), 960);
  assert.equal(Math.round(height), 540);
});

test('os quatro metadados da spec 8.4 chegam ao PDF', async () => {
  const { caminhoDoHtml } = await construirDeck('index.html');
  const { bytes } = await gerarPdf({ caminhoDoHtml, navegador,
    metadados: { titulo: 'Aula de teste', autor: 'Fulana', assunto: 'Disciplina X', idioma: 'pt-BR' } });
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getTitle(), 'Aula de teste');
  assert.equal(pdf.getAuthor(), 'Fulana');
  assert.equal(pdf.getSubject(), 'Disciplina X');
  // Rodada de correção 1: o nome do teste promete quatro e só conferia três — apagar o setLanguage
  // do build/pdf.mjs deixava a suíte inteira verde. pdf-lib não expõe getLanguage(); /Lang é o mesmo
  // PDFString que setLanguage grava no catálogo (ver PDFDocument.prototype.setLanguage).
  assert.equal(pdf.catalog.get(PDFName.of('Lang'))?.decodeText(), 'pt-BR');
});

// spec 8.4: estrutura marcada e marcadores, "quando a versão do Chrome oferecer" — e o Chrome 153
// oferece. Pelo catálogo, nunca por busca de texto nos bytes: pdf.save() usa useObjectStreams: true
// por padrão e comprime os objetos do catálogo dentro de um /ObjStm — o marcador não aparece mais no
// texto dos bytes finais mesmo estando lá (rodada de correção 1: a primeira medição desta tarefa caiu
// exatamente nessa armadilha e concluiu, errada, que o pdf-lib apagava as duas estruturas).
test('o PDF sai com estrutura marcada e marcadores', async () => {
  const { caminhoDoHtml } = await construirDeck('matematica.html');
  const { bytes } = await gerarPdf({ caminhoDoHtml, navegador, metadados: {} });
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.catalog.get(PDFName.of('StructTreeRoot')), 'sem StructTreeRoot: a estrutura marcada se perdeu');
  assert.ok(pdf.catalog.get(PDFName.of('Outlines')), 'sem Outlines: os marcadores se perderam');
});

// O outro ramo de paginasEsperadas: um deck SEM data-pdf="passos" sai com exatamente uma página por
// slide. O teste acima já cobre o ramo com passos (11 para 8 slides); este cobre o simples, e os dois
// juntos provam que a conta não é um número fixo com sorte.
test('num deck sem passos, o PDF tem exatamente uma página por slide', async () => {
  // index.html (usado nos dois testes acima) ganhou um data-pdf="passos" desde que este plano foi
  // escrito — o guard abaixo pegou isso. codigo.html continua sem passos: 9 páginas (fato 8 do brief).
  const { caminhoDoHtml, html } = await construirDeck('codigo.html');
  const doc = parseHTML(html).document;
  const slides = doc.querySelectorAll('section.slide:not([data-copia])').length;
  assert.equal(doc.querySelectorAll('[data-pdf="passos"]').length, 0, 'este deck ganhou passos; escolha outro');
  const { paginas } = await gerarPdf({ caminhoDoHtml, navegador, metadados: {} });
  assert.equal(paginas, slides);
});
