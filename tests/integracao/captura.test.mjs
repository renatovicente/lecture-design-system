// A captura automática no build (spec 7.2 e 3.3 etapa 5, em toda aula), medida no PDF — o critério de aceite
// da fase 2 que é desta parte (spec 12: "com uma demo sem imagem própria capturada no PDF"). O que se
// afirma é o que a página do PDF DESENHA — os pixels da imagem que ela traz —, e não que o arquivo
// existe: um PDF com o quadro "Demo interativa" no lugar da demo também existe e também tem a página.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { iniciarChrome } from './utilitarios.mjs';
import { build } from '../../build/build.mjs';
import { faseDaAula } from '../../validador/validar.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));
const fixture = (nome) => new URL(`../fixtures/captura/${nome}/aula.html`, import.meta.url);
const pastaTemporaria = () => mkdtemp(join(tmpdir(), 'captura-'));

let navegador;
before(async () => {
  navegador = await iniciarChrome();
});
after(async () => {
  await navegador?.close();
});

// build() escreve o progresso no stderr (console.error); aqui ele é guardado para as asserções.
async function construir(caminhoDaAula, opcoes = {}) {
  const destino = await pastaTemporaria();
  const linhas = [];
  const original = console.error;
  console.error = (...partes) => linhas.push(partes.join(' '));
  try {
    const resultado = await build({ raiz: RAIZ, caminhoDaAula, destino, navegador, ...opcoes });
    return { ...resultado, destino, linhas };
  } finally {
    console.error = original;
  }
}

// As imagens que uma página do PDF desenha, com a contagem de pixels não brancos de cada uma. O
// Chrome grava a foto como XObject de imagem, FlateDecode, 8 bits por componente (medido com
// PyMuPDF sobre o PDF da fixture); inflada, ela é a matriz de pixels que a página mostra.
async function imagensDaPagina(bytes, indice) {
  const pdf = await PDFDocument.load(bytes);
  const recursos = pdf.getPage(indice).node.Resources();
  const xobjetos = recursos?.lookup(PDFName.of('XObject'));
  if (!xobjetos) return [];
  const imagens = [];
  for (const chave of xobjetos.keys()) {
    const objeto = xobjetos.lookup(chave);
    if (!(objeto instanceof PDFRawStream)) continue;
    if (objeto.dict.lookup(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
    const largura = objeto.dict.lookup(PDFName.of('Width')).asNumber();
    const altura = objeto.dict.lookup(PDFName.of('Height')).asNumber();
    assert.equal(objeto.dict.lookup(PDFName.of('Filter'))?.toString(), '/FlateDecode');
    const pixels = inflateSync(objeto.contents);
    const componentes = pixels.length / (largura * altura);
    let naoBrancos = 0;
    for (let k = 0; k < pixels.length; k += componentes) {
      for (let c = 0; c < componentes; c += 1) {
        if (pixels[k + c] !== 255) {
          naoBrancos += 1;
          break;
        }
      }
    }
    imagens.push({ largura, altura, naoBrancos });
  }
  return imagens;
}

const PAGINA_DA_DEMO = 2; // capa, abertura, demo: a terceira página (os slides da fixture não têm passos)

test('fase 2: a demo sem imagem própria sai fotografada no HTML e desenhada na página do PDF', async () => {
  const r = await construir(fixture('demo-sem-imagem'));
  assert.equal(r.codigo, 0, JSON.stringify(r.achados));
  const html = await readFile(join(r.destino, 'aula.html'), 'utf8');
  const foto = parseHTML(html).document.querySelector('section#contador div.demo[data-demo="contador"] > img.estatico');
  assert.ok(foto, 'a foto entrou como img.estatico, filho direto da div.demo');
  assert.match(foto.getAttribute('src'), /^data:image\/png;base64,/);
  const [imagem, ...outras] = await imagensDaPagina(await readFile(join(r.destino, 'aula.pdf')), PAGINA_DA_DEMO);
  assert.deepEqual(outras, []);
  // 1152 × 477 px no palco, a 2 pixels por px: a div.demo inteira, não a página.
  assert.deepEqual([imagem.largura, imagem.altura], [2304, 954]);
  // Botão ativo (campo tinta), trilho, cursor e leitura: medido, 23 156 pixels não brancos (a mesma
  // contagem por PyMuPDF e por esta função). O piso é um décimo disso, para não amarrar o teste ao
  // antialiasing de uma versão do Chrome — e ainda assim muito acima de uma foto em branco, que dá 0.
  assert.ok(imagem.naoBrancos > 2000, `a foto da demo tem só ${imagem.naoBrancos} pixels não brancos`);
  assert.ok(r.linhas.some((linha) => /1 de 1 demo\(s\) capturada\(s\)/.test(linha)), r.linhas.join('\n'));
  // Fotografada, a demo não é mais aviso: recursos.demo-sem-estatico se cala no build.
  assert.deepEqual(r.achados.filter((a) => a.regra === 'recursos.demo-sem-estatico'), []);
  const gravados = JSON.parse(await readFile(join(r.destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(gravados, r.achados);
});

// A captura não depende da fase da aula (revisão final da 2c, C1): a "fase 2" da spec 3.3, 6.7, 7.2
// e 9.2 é a do projeto. A mesma aula sem data-captura-ms não tem marca de fase 2 nenhuma — faseDaAula
// a põe na fase 1 — e a demo sai fotografada do mesmo jeito, esperando o padrão da spec (3000 ms).
// Inversão medida: com a condição de fase de volta em build/build.mjs, este teste fica vermelho (a
// página da demo sai sem imagem, o quadro "Demo interativa" no lugar).
test('fase 1: a mesma demo, sem data-captura-ms, também é fotografada e desenhada no PDF', async () => {
  const fonte = (await readFile(fixture('demo-sem-imagem'), 'utf8')).replace(' data-captura-ms="200"', '');
  assert.equal(faseDaAula(parseHTML(fonte).document, contrato), 1, 'a aula do teste tem de ser de fase 1');
  const pasta = await pastaTemporaria();
  const caminho = join(pasta, 'aula.html');
  await writeFile(caminho, fonte, 'utf8');
  const r = await construir(pathToFileURL(caminho));
  assert.equal(r.codigo, 0, JSON.stringify(r.achados));
  const [imagem, ...outras] = await imagensDaPagina(await readFile(join(r.destino, 'aula.pdf')), PAGINA_DA_DEMO);
  assert.deepEqual(outras, []);
  assert.deepEqual([imagem.largura, imagem.altura], [2304, 954]);
  assert.ok(imagem.naoBrancos > 2000, `a foto da demo tem só ${imagem.naoBrancos} pixels não brancos`);
  assert.ok(r.linhas.some((linha) => /1 de 1 demo\(s\) capturada\(s\)/.test(linha)), r.linhas.join('\n'));
  assert.deepEqual(r.achados.filter((a) => a.regra === 'recursos.demo-sem-estatico'), []);
});

// Revisão final da 2c, I1: o erro de uma demo não pode ser atribuído a outra. "ruidosa" desenha e
// deixa um setTimeout vivo que lança 400 ms depois de iniciar(); "boa" é limpa. Cada demo é
// fotografada na sua própria página (build/captura.mjs). Dois casos:
//   - ruidosa espera 100 ms: o erro dela cai DEPOIS da sua espera — as duas saem fotografadas, e a
//     boa não herda nada. Inversão medida: com uma página só para as duas (o desenho de antes), a
//     boa é recusada com "Cannot read properties of null" e este caso fica vermelho;
//   - ruidosa espera 600 ms: o erro dela cai DURANTE a sua espera — ela é quem falha, e a boa sai.
test('o erro de uma demo é dela: a limpa é fotografada, e a ruidosa só falha pelo que lança na própria espera', async () => {
  const original = await readFile(fixture('demo-ruidosa'), 'utf8');
  const casos = [
    { ms: 100, capturadas: 2, falhas: [] },
    { ms: 600, capturadas: 1, falhas: [['ruidosa', /erro na página ao montar e iniciar: .*null/]] },
  ];
  for (const { ms, capturadas, falhas } of casos) {
    const pasta = await pastaTemporaria();
    const caminho = join(pasta, 'aula.html');
    await writeFile(caminho, original.replace('data-demo="ruidosa" data-captura-ms="100"', `data-demo="ruidosa" data-captura-ms="${ms}"`), 'utf8');
    const r = await construir(pathToFileURL(caminho));
    assert.equal(r.codigo, 0, JSON.stringify(r.achados));
    const doAviso = r.achados.filter((a) => a.regra === 'recursos.demo-sem-estatico');
    assert.deepEqual(doAviso.map((a) => a.id), falhas.map(([id]) => id), `ruidosa com ${ms} ms: ${r.linhas.join('\n')}`);
    for (const [k, [, motivo]] of falhas.entries()) assert.match(doAviso[k].mensagem, motivo);
    const html = parseHTML(await readFile(join(r.destino, 'aula.html'), 'utf8')).document;
    assert.ok(html.querySelector('section#boa div.demo > img.estatico'), `ruidosa com ${ms} ms: a demo limpa saiu sem foto`);
    assert.equal(html.querySelectorAll('img.estatico').length, capturadas, `ruidosa com ${ms} ms`);
  }
});

// Plano da 2c, tarefa 3, passo 2: "falhar alto, que é o ponto". Cada demo que não sai na foto é
// dita com o nome e o motivo — a que não desenha nada, a que lança ao iniciar e a que o texto
// registra e a página não —, e o build segue: a demo fica com o quadro no PDF, como na fase 1.
test('a captura que falha diz qual demo e por quê, e o build segue até o PDF', async () => {
  const r = await construir(fixture('demos-que-falham'));
  assert.equal(r.codigo, 0, JSON.stringify(r.achados));
  const avisos = r.linhas.filter((linha) => linha.includes('não foi capturada'));
  assert.equal(avisos.length, 3, r.linhas.join('\n'));
  assert.match(avisos[0], /demo "vazia" não foi capturada: a demo não desenhou nada na div\.demo/);
  assert.match(avisos[1], /demo "quebrada" não foi capturada: erro na página ao montar e iniciar: .*iniciar quebrou/);
  assert.match(avisos[2], /demo "fantasma" não foi capturada: a demo não está registrada na página construída/);
  const html = await readFile(join(r.destino, 'aula.html'), 'utf8');
  assert.equal(parseHTML(html).document.querySelectorAll('img.estatico').length, 0, 'nenhuma foto falsa entrou no HTML');
  // E não só no stderr: cada falha vira recursos.demo-sem-estatico em achados e em validacao.json,
  // com o slide, a demo e o motivo — o erro devolvido é lido até o fim (o defeito da 2a era o
  // contrário: errosDeGrafico devolvido e nunca lido).
  const doAviso = r.achados.filter((a) => a.regra === 'recursos.demo-sem-estatico');
  assert.deepEqual(doAviso.map((a) => [a.id, a.severidade]), [['vazia', 'aviso'], ['quebrada', 'aviso'], ['fantasma', 'aviso']]);
  assert.match(doAviso[0].mensagem, /^demo "vazia" sem img\.estatico e sem capturar\(\), e a captura do build falhou: a demo não desenhou nada/);
  assert.match(doAviso[1].mensagem, /^demo "quebrada" .* falhou: erro na página ao montar e iniciar: .*iniciar quebrou/);
  assert.match(doAviso[2].mensagem, /^demo "fantasma" .* falhou: a demo não está registrada na página construída/);
  const gravados = JSON.parse(await readFile(join(r.destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(gravados, r.achados);
});

// Revisão final da 2c, M1: com erro de composição a etapa 5 não fotografa — e, como no caminho sem
// Chrome, a demo que ficou sem foto é nomeada, com o motivo, e não some calada atrás do erro.
test('erro de composição: a captura não roda, e o aviso diz quais demos ficaram sem foto', async () => {
  const alto = `<p>Alto.${'<br>'.repeat(50)}</p>`;
  const fonte = (await readFile(fixture('demo-sem-imagem'), 'utf8'))
    .replace('<section data-layout="abertura" id="dois">\n  <h2>Fim</h2>', `<section data-layout="conteudo" id="dois">\n  <h2>Fim</h2>\n  ${alto}\n  <aside class="notas">N.</aside>`);
  const pasta = await pastaTemporaria();
  const caminho = join(pasta, 'aula.html');
  await writeFile(caminho, fonte, 'utf8');
  const r = await construir(pathToFileURL(caminho));
  assert.equal(r.codigo, 1);
  assert.ok(r.achados.some((a) => a.regra === 'composicao.transbordo'), JSON.stringify(r.achados));
  assert.ok(!r.linhas.some((linha) => linha.includes('capturando')), r.linhas.join('\n'));
  assert.ok(r.linhas.some((linha) => /erro de composição; não gera PDF; ficam sem foto as demos "contador"$/.test(linha)), r.linhas.join('\n'));
  const doAviso = r.achados.filter((a) => a.regra === 'recursos.demo-sem-estatico');
  assert.deepEqual(doAviso.map((a) => a.mensagem), ['demo "contador" sem img.estatico e sem capturar(), e a captura do build falhou: a composição tem erro; a etapa 5 não fotografou.']);
  const gravados = JSON.parse(await readFile(join(r.destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(gravados, r.achados);
});

test('sem Chrome: o aviso diz quais demos ficam sem imagem', async () => {
  const anterior = process.env.CHROME_PATH;
  process.env.CHROME_PATH = '/caminho/que/nao/existe/de-verdade';
  let r;
  try {
    r = await construir(fixture('demo-sem-imagem'), { navegador: undefined });
  } finally {
    if (anterior === undefined) delete process.env.CHROME_PATH;
    else process.env.CHROME_PATH = anterior;
  }
  assert.equal(r.codigo, 0);
  assert.match(r.avisoSemChrome, /composição pulada, sem Chrome: .*; sem a captura, ficam sem imagem para impressão as demos "contador"$/);
  const doAviso = r.achados.filter((a) => a.regra === 'recursos.demo-sem-estatico');
  assert.deepEqual(doAviso.map((a) => a.mensagem), ['demo "contador" sem img.estatico e sem capturar(), e a captura do build falhou: sem Chrome, a etapa 5 não rodou.']);
});

// O aceite da fase 2, na letra da spec 12: "testes verdes e essa aula validada, com uma demo sem
// imagem própria capturada no PDF" — "essa aula" é exemplos/regressao-linear/ (spec 10.3: "usa
// gráfico, diagrama e demo"). As três coisas são conferidas no fonte, e não supostas: sem elas a
// aula poderia validar e fotografar sem ser a aula que a spec pede. A foto é medida como imagem da
// página, pela mesma razão do primeiro teste: o quadro de substituição também pinta a página.
const PAGINA_DA_DEMO_DO_EXEMPLO = 6; // a sétima seção; nenhum slide da aula tem data-pdf="passos"

test('aceite da fase 2: exemplos/regressao-linear valida limpo e sai com a demo fotografada no PDF', async () => {
  const caminho = new URL('exemplos/regressao-linear/index.html', RAIZ);
  const fonte = parseHTML(await readFile(caminho, 'utf8')).document;
  assert.equal(faseDaAula(fonte, contrato), 2);
  assert.ok(fonte.querySelector('section figure.grafico'), 'a aula-exemplo não tem gráfico');
  assert.ok(fonte.querySelector('section figure.diagrama'), 'a aula-exemplo não tem diagrama');
  const demos = [...fonte.querySelectorAll('section div.demo')];
  assert.equal(demos.length, 1);
  assert.equal(demos[0].querySelector('img.estatico'), null, 'a demo da aula-exemplo tem de ficar sem imagem própria');
  assert.equal(fonte.querySelector('[data-pdf="passos"]'), null, 'com passos no PDF, a página da demo muda');
  const secoes = [...fonte.querySelectorAll('body > section')];
  assert.equal(secoes.indexOf(demos[0].closest('section')), PAGINA_DA_DEMO_DO_EXEMPLO);

  const r = await construir(caminho);
  assert.equal(r.codigo, 0, JSON.stringify(r.achados));
  assert.deepEqual(r.achados, [], 'a aula-exemplo tem de validar em zero erros e zero avisos');
  assert.ok(r.linhas.some((linha) => /1 de 1 demo\(s\) capturada\(s\)/.test(linha)), r.linhas.join('\n'));
  const [imagem, ...outras] = await imagensDaPagina(
    await readFile(join(r.destino, 'regressao-linear.pdf')),
    PAGINA_DA_DEMO_DO_EXEMPLO,
  );
  assert.ok(imagem, 'a página da demo não desenha imagem nenhuma');
  assert.deepEqual(outras, []);
  console.log(`# regressao-linear: foto da demo ${imagem.largura} × ${imagem.altura}, ${imagem.naoBrancos} pixels não brancos`);
  assert.equal(imagem.largura, 2304, 'a foto não é a div.demo inteira (1152 px de palco, a 2 pixels por px)');
  assert.ok(imagem.naoBrancos > 2000, `a foto da demo tem só ${imagem.naoBrancos} pixels não brancos`);
});
