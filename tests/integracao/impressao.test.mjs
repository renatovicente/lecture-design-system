// Impressão no Chrome (spec 6.9 e 8.4): cópias por estado, demos trocadas por imagem e PDF de 1280 × 720.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

let servidorDaFixture;
let servidorDoEspecime;
let navegador;

before(async () => {
  servidorDaFixture = await servirPasta('tests/fixtures/impressao/');
  servidorDoEspecime = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidorDaFixture?.fechar();
  await servidorDoEspecime?.fechar();
});

const situacao = (pagina) => pagina.evaluate(() => ({
  slides: document.querySelectorAll('section.slide').length,
  copias: document.querySelectorAll('section.slide[data-copia]').length,
  imprimindo: document.body.classList.contains('imprimindo'),
  passosDasCopias: [...document.querySelectorAll('section.slide[data-copia]')]
    .map((copia) => copia.querySelectorAll('[data-passo][data-revelado]').length),
  passosDoOriginal: document.querySelectorAll('#passos [data-passo][data-revelado]').length,
  idsDaCopia: [...document.querySelectorAll('section.slide[data-copia]')].map((copia) => copia.id),
  estatica: document.querySelectorAll('#com-estatico .demo > img.estatico').length,
  captura: document.querySelector('#com-captura .demo > img.captura-demo')?.getAttribute('src')?.slice(0, 19),
  substituta: document.querySelector('#sem-imagem .demo > .demo-substituta')?.textContent,
  capturasExtras: document.querySelectorAll('#com-estatico .captura-demo, #com-estatico .demo-substituta').length,
}));

function paginasDoPdf(pdf) {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

test('prepararImpressao revela os passos, cria uma cópia por estado e troca as demos por imagem', async () => {
  const { pagina, erros } = await abrirAula(navegador, `${servidorDaFixture.endereco}/`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  assert.deepEqual(await situacao(pagina), {
    slides: 8,
    copias: 2,
    imprimindo: true,
    passosDasCopias: [0, 1],
    passosDoOriginal: 2,
    idsDaCopia: ['passos-impressao-0', 'passos-impressao-1'],
    estatica: 1,
    captura: 'data:image/svg+xml,',
    substituta: 'Demo interativa: abra o HTML',
    capturasExtras: 0,
  });
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('restaurarImpressao devolve o documento ao estado de antes', async () => {
  const { pagina } = await abrirAula(navegador, `${servidorDaFixture.endereco}/#passos/1`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  await pagina.evaluate(() => window.AulaUSP.restaurarImpressao());
  const depois = await situacao(pagina);
  assert.deepEqual([depois.slides, depois.copias, depois.imprimindo, depois.passosDoOriginal], [6, 0, false, 1]);
  assert.equal(depois.captura, undefined);
  assert.equal(depois.substituta, undefined);
  assert.equal(await pagina.evaluate(() => document.querySelector('.slide.ativo').id), 'passos');
  await pagina.close();
});

test('o PDF tem uma página por slide e por estado, do tamanho do palco', async () => {
  const { pagina } = await abrirAula(navegador, `${servidorDaFixture.endereco}/`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  const pdf = await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
  assert.equal(paginasDoPdf(pdf), 8);
  assert.match(pdf.toString('latin1'), /\/MediaBox\s*\[\s*0\s+0\s+960(\.\d+)?\s+540(\.\d+)?\s*\]/);
  await pagina.close();
});

test('no espécime, o slide com data-pdf="passos" acrescenta as páginas dos seus estados', async () => {
  const { pagina } = await abrirAula(navegador, `${servidorDoEspecime.endereco}/index.html`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  assert.deepEqual(await pagina.evaluate(() => [
    document.querySelectorAll('section.slide').length,
    document.querySelectorAll('section.slide[data-copia]').length,
  ]), [15, 2]);
  await pagina.close();
});

test('img.estatico na impressão preenche a caixa da demo, sem cortar nem distorcer', async () => {
  const { pagina } = await abrirAula(navegador, `${servidorDaFixture.endereco}/`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  await pagina.emulateMedia({ media: 'print' });
  const medidas = await pagina.evaluate(() => {
    const caixa = document.querySelector('#com-estatico .demo').getBoundingClientRect();
    const imagem = document.querySelector('#com-estatico .demo > img.estatico');
    const retImagem = imagem.getBoundingClientRect();
    return {
      largura: retImagem.width,
      altura: retImagem.height,
      larguraCaixa: caixa.width,
      alturaCaixa: caixa.height,
      objectFit: getComputedStyle(imagem).objectFit,
    };
  });
  assert.ok(
    Math.abs(medidas.largura - medidas.larguraCaixa) < 0.5 && Math.abs(medidas.altura - medidas.alturaCaixa) < 0.5,
    `caixa da imagem (${medidas.largura}×${medidas.altura}) difere da caixa da demo (${medidas.larguraCaixa}×${medidas.alturaCaixa})`,
  );
  assert.equal(medidas.objectFit, 'contain');
  await pagina.close();
});
