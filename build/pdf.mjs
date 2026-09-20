// Etapa 6 da spec 3.3 e seção 8.4: abre o HTML construído no Chrome, prepara a impressão e gera o PDF.
// Node, não navegador. Não abre navegador próprio — recebe um, para o chamador controlar o ritmo de
// Chrome (uma abertura por build, não uma por deck).
import { PDFDocument } from 'pdf-lib';

export async function gerarPdf({ caminhoDoHtml, navegador, metadados = {} }) {
  const pagina = await navegador.newPage();
  try {
    await pagina.goto(`file://${caminhoDoHtml}`);
    await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
    await pagina.evaluate(() => document.fonts.ready);
    // Spec 6.9: explicitamente, não pelo evento beforeprint — no build ninguém imprime.
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
