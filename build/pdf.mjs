// Etapa 6 da spec 3.3 e seção 8.4: abre o HTML construído no Chrome, prepara a impressão e gera o PDF.
// Node, não navegador. Não abre navegador próprio — recebe um, para o chamador controlar o ritmo de
// Chrome (uma abertura por build, não uma por deck).
import { pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';

export async function gerarPdf({ caminhoDoHtml, navegador, metadados = {} }) {
  const pagina = await navegador.newPage();
  try {
    // I4 da revisão final: pathToFileURL, não `file://${...}` — o Chrome corta a URL no `#` (e no
    // `?`), então uma aula numa pasta chamada "Aula #3" fazia esta etapa abrir outra coisa e falhar.
    // Espaço no nome já passava; `#` não (medido: `file:///tmp/aula#3/dist/aula#3.html`).
    await pagina.goto(pathToFileURL(caminhoDoHtml).href);
    // Espera o FIM da montagem, qualquer que seja o estado, e então LÊ qual foi — o padrão que
    // medirComposicao (build/composicao.mjs:45-47) já usava. Esperar direto por 'sim' transformava
    // toda montagem malsucedida nos 30 s do Playwright e num TimeoutError que não diz nada ao autor
    // (medido, antes desta mudança: 30,2 s e "page.waitForFunction: Timeout 30000ms exceeded").
    await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
    const estado = await pagina.evaluate(() => document.body.dataset.montado);
    if (estado !== 'sim') throw new Error(`a montagem terminou em "${estado}"`);
    await pagina.evaluate(() => document.fonts.ready);
    // Spec 6.9: explicitamente, e não SÓ pelo beforeprint — o page.pdf() do Chrome também dispara
    // beforeprint/afterprint, e o motor embutido registra os dois (motor/impressao.js:82-83). As duas
    // vias convergem porque preparar() é idempotente (`if (salvo) return`), e é por isso que apagar
    // esta linha não muda o PDF: o beforeprint faz o mesmo trabalho um instante depois. Quem mede a
    // diferença é o teste "gerarPdf chama prepararImpressao() explicitamente" em
    // tests/integracao/pdf.test.mjs, que fotografa o DOM no instante em que pdf() é chamado.
    // (A primeira versão deste comentário dizia "não pelo evento beforeprint — no build ninguém
    // imprime", o que é falso: no build o Chrome imprime, e é o pdf() que o faz.)
    await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
    // A spec 8.4 também pede estrutura marcada e marcadores "quando a versão do Chrome oferecer"
    // (tagged/outline de pagina.pdf()) — e o Chrome 153 oferece os dois. tagged grava /StructTreeRoot
    // e, combinado com outline, também /Type /Outlines — outline sozinho, sem tagged, não grava nada
    // (medido: bruto byte a byte igual ao PDF sem nenhuma das duas flags).
    // Rodada de correção 1 da tarefa 1: a primeira medição concluiu, errada, que o
    // PDFDocument.load(...).save() do pdf-lib abaixo apagava as duas estruturas — conferido só por
    // busca textual dos bytes finais. Falso negativo: pdf.save() usa useObjectStreams: true por
    // padrão, que comprime os objetos do catálogo (StructTreeRoot e Outlines inclusive) dentro de um
    // /ObjStm, então o texto "/StructTreeRoot" não aparece mais nos bytes, mas o objeto continua lá.
    // Reconferido por três vias independentes sobre o PDF final: pdf.catalog.get(PDFName.of(...)) (ver
    // a propriedade abaixo), `pdfinfo` do poppler ("Tagged: yes") e PyMuPDF (get_toc() devolve as 11
    // entradas reais do sumário, uma por página). As duas sobrevivem. Custo real no artefato que o
    // pdf-lib devolve: ~6 kB (medido: 243 009 → 248 826 bytes no deck de matemática) — não os ~25 kB
    // de diferença no PDF bruto do Chrome, que a compressão do save() consome quase inteira. Medição
    // completa no relatório da tarefa 1 (.superpowers/sdd/2026-09-19-aula-usp-m5c-pdf-pipeline/).
    const bytes = await pagina.pdf({
      // Esta linha TEM teste, e ele é estrutural: "printBackground pinta o fundo de cada página" em
      // tests/integracao/pdf.test.mjs. O teste fácil — procurar a COR do campo no content stream — é
      // de fato vazio: medido, `.9882,.7059,.1294 rg` aparece com e sem printBackground, porque o
      // mesmo operador pinta traço e texto. Mas a conclusão que a primeira versão deste comentário
      // tirou disso, "uma verificação honesta exigiria rasterizar a página", é FALSA, e ficou escrita
      // aqui uma rodada inteira. Medido nos dois PDFs do mesmo HTML construído (index.html, 15
      // páginas), descomprimindo o content stream de cada página: com printBackground, toda página a
      // partir da 1 ganha exatamente um preenchimento de página inteira na origem
      // (`0 0 1280 720 re f`); sem ele, esse operador não existe em nenhuma delas. A página 0 é a
      // exceção e fica fora da asserção — nela o retângulo do próprio slide também cai na origem
      // (3 ocorrências com a linha, 2 sem), então ali a contagem não separa as duas situações.
      // Ressalva honesta, registrada junto: a forma do content stream é do Chrome e pode mudar de
      // versão — é uma fragilidade real, mas não é "impossível sem rasterizar".
      printBackground: true,      // spec 8.4: o campo amarelo e o azul de sinal precisam sair
      preferCSSPageSize: true,    // honra o @page de estilos/impressao.css; sem isto o Chrome usa Letter
      tagged: true,               // spec 8.4: estrutura marcada — sobrevive ao save (ver comentário acima)
      outline: true,              // spec 8.4: marcadores — só funciona porque tagged também está ligado
    });
    const pdf = await PDFDocument.load(bytes);
    if (metadados.titulo) pdf.setTitle(metadados.titulo);
    if (metadados.autor) pdf.setAuthor(metadados.autor);
    if (metadados.assunto) pdf.setSubject(metadados.assunto);
    if (metadados.idioma) pdf.setLanguage(metadados.idioma);
    const finais = await pdf.save();
    return { bytes: Buffer.from(finais), paginas: pdf.getPageCount() };
  } finally {
    await pagina.close();
  }
}
