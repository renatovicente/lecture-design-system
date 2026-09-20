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
import { LARGURA_DO_PALCO, ALTURA_DO_PALCO } from '../../motor/motor.js';

const RAIZ = new URL('../../', import.meta.url);

// Rodada de correção 2 (I1 da revisão final): a asserção de /Lang passava sem medir nada. Ela pedia
// "pt-BR" — o MESMO valor do <html lang> do espécime —, e o Chrome grava /Lang sozinho a partir do
// lang do documento quando tagged: true está ligado (medido no PDF bruto, antes de o pdf-lib tocar
// nele: com tagged, /Lang = "pt-BR" mesmo sem setLanguage; sem tagged, null). A asserção não
// distinguia "o pdf-lib gravou" de "o Chrome gravou": apagar setLanguage de build/pdf.mjs deixava os
// 5 testes verdes. Um idioma que o documento não tem só pode chegar ao catálogo por setLanguage — é
// a regra geral que este marco pagou duas vezes para aprender: quando um teste afirma que uma linha
// de produção existe, a asserção tem de usar um valor que só aquela linha possa produzir.
const IDIOMA_QUE_SO_O_PDF_LIB_ESCREVE = 'en-GB';

// 1 px CSS = 0,75 pt (96 px por polegada, 72 pt por polegada): é a conversão do formato, não um
// número deste projeto. O tamanho da página vem do palco (motor/motor.js), como em visual.test.mjs.
const PT_POR_PX = 0.75;

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
  // O palco (1280 × 720) a 0,75 pt/px, derivado — não 960 e 540 escritos à mão, que seriam uma
  // segunda verdade sobre o tamanho do slide. Sem preferCSSPageSize o Chrome usa Letter e isto cai.
  assert.equal(Math.round(width), LARGURA_DO_PALCO * PT_POR_PX);
  assert.equal(Math.round(height), ALTURA_DO_PALCO * PT_POR_PX);
});

test('os quatro metadados da spec 8.4 chegam ao PDF', async () => {
  const { caminhoDoHtml } = await construirDeck('index.html');
  const { bytes } = await gerarPdf({ caminhoDoHtml, navegador,
    metadados: { titulo: 'Aula de teste', autor: 'Fulana', assunto: 'Disciplina X', idioma: IDIOMA_QUE_SO_O_PDF_LIB_ESCREVE } });
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getTitle(), 'Aula de teste');
  assert.equal(pdf.getAuthor(), 'Fulana');
  assert.equal(pdf.getSubject(), 'Disciplina X');
  // pdf-lib não expõe getLanguage(); /Lang é o mesmo PDFString que setLanguage grava no catálogo
  // (ver PDFDocument.prototype.setLanguage).
  assert.equal(pdf.catalog.get(PDFName.of('Lang'))?.decodeText(), IDIOMA_QUE_SO_O_PDF_LIB_ESCREVE);
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

// I2 da revisão final: a chamada explícita de prepararImpressao() em build/pdf.mjs (spec 6.9) não
// tinha teste, e não tinha como ter um que olhasse só o artefato. O page.pdf() do Chrome dispara
// beforeprint/afterprint, o motor embutido registra os dois (motor/impressao.js:82-83) e preparar()
// é idempotente — então, com a linha apagada, quem gera as cópias é o beforeprint, o afterprint
// desfaz logo depois, e o PDF sai com o MESMO número de páginas e o DOM final idêntico. Medir
// páginas aqui seria a mesma armadilha do /Lang: um valor que a via alternativa também produz.
//
// O instante é o que separa as duas vias: a chamada explícita acontece ANTES de page.pdf(); a do
// beforeprint, DENTRO dele. Este teste espia o navegador que gerarPdf recebe (a mesma costura de
// injeção que build() usa para navegador e gerarPdf) e fotografa o DOM no momento em que pdf() é
// chamado, antes de delegar. Nesse instante, ou a linha explícita já rodou, ou o documento ainda
// está intocado.
test('gerarPdf chama prepararImpressao() explicitamente, antes de page.pdf() (spec 6.9)', async () => {
  const { caminhoDoHtml, html } = await construirDeck('index.html');
  const doc = parseHTML(html).document;
  const slidesDoFonte = doc.querySelectorAll('section.slide:not([data-copia])').length;
  const esperadas = paginasEsperadas(doc);
  assert.ok(esperadas > slidesDoFonte,
    'este deck perdeu o data-pdf="passos"; sem cópias, o DOM antes e depois de preparar() é igual e o teste não mede nada');

  let estadoNoInstanteDoPdf;
  const navegadorEspiao = {
    newPage: async (...argumentos) => {
      const pagina = await navegador.newPage(...argumentos);
      const pdfDeVerdade = pagina.pdf.bind(pagina);
      pagina.pdf = async (...opcoes) => {
        estadoNoInstanteDoPdf = await pagina.evaluate(() => ({
          slides: document.querySelectorAll('section.slide').length,
          copias: document.querySelectorAll('section.slide[data-copia]').length,
          imprimindo: document.body.classList.contains('imprimindo'),
        }));
        return pdfDeVerdade(...opcoes);
      };
      return pagina;
    },
  };

  const { paginas } = await gerarPdf({ caminhoDoHtml, navegador: navegadorEspiao, metadados: {} });
  assert.ok(estadoNoInstanteDoPdf, 'o espião não foi chamado: gerarPdf não usou o navegador recebido');
  // As três marcas que preparar() deixa (motor/impressao.js): as cópias por estado de passos, a
  // classe do corpo e o total de slides igual ao oráculo de páginas. Sem a chamada explícita, o
  // documento neste instante ainda é o do autor: slidesDoFonte slides, nenhuma cópia, sem a classe.
  assert.equal(estadoNoInstanteDoPdf.slides, esperadas);
  assert.equal(estadoNoInstanteDoPdf.copias, esperadas - slidesDoFonte);
  assert.equal(estadoNoInstanteDoPdf.imprimindo, true);
  // E o PDF continua saindo certo: as duas vias convergem porque preparar() é idempotente.
  assert.equal(paginas, esperadas);
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
