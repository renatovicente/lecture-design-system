// A captura automática no build (spec 7.2 e 3.3 etapa 5, fase 2), medida no PDF — o critério de aceite
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

const RAIZ = new URL('../../', import.meta.url);
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
  // Fotografada, a demo não é mais aviso: recursos.demo-sem-estatico se cala no build da fase 2.
  assert.deepEqual(r.achados.filter((a) => a.regra === 'recursos.demo-sem-estatico'), []);
  const gravados = JSON.parse(await readFile(join(r.destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(gravados, r.achados);
});

// O "antes": a mesma aula sem a marca de fase 2 é de fase 1, e a fase 1 não captura — a página da
// demo sai sem imagem nenhuma (o quadro "Demo interativa" é texto), e o aviso da fase 1 continua.
test('fase 1: a mesma demo não é fotografada, e a página do PDF não traz imagem', async () => {
  const fonte = (await readFile(fixture('demo-sem-imagem'), 'utf8')).replace(' data-captura-ms="200"', '');
  const pasta = await pastaTemporaria();
  const caminho = join(pasta, 'aula.html');
  await writeFile(caminho, fonte, 'utf8');
  const r = await construir(pathToFileURL(caminho));
  assert.equal(r.codigo, 0, JSON.stringify(r.achados));
  assert.deepEqual(await imagensDaPagina(await readFile(join(r.destino, 'aula.pdf')), PAGINA_DA_DEMO), []);
  assert.ok(!r.linhas.some((linha) => linha.includes('capturando')), r.linhas.join('\n'));
  assert.deepEqual(r.achados.filter((a) => a.regra === 'recursos.demo-sem-estatico').map((a) => a.id), ['contador']);
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
