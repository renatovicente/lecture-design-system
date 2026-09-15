import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import {
  assinaturaConfere, dimensoesPng, lerPgm, caixaEscura, enquadrarSvg, coresSvg, ehEscura,
} from '../../build/marcas.mjs';
import { lerTokens, simplificar } from '../../build/tokens.mjs';

const raiz = new URL('../../', import.meta.url);
const ler = (p) => readFile(new URL(p, raiz));
const lerTexto = async (p) => (await ler(p)).toString('utf8');

test('assinaturaConfere reconhece PDF, PNG e SVG', () => {
  assert.ok(assinaturaConfere('pdf', Buffer.from('%PDF-1.5 ...')));
  assert.ok(assinaturaConfere('png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
  assert.ok(assinaturaConfere('svg', Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>')));
  assert.ok(!assinaturaConfere('png', Buffer.from('%PDF-1.5')));
  assert.ok(!assinaturaConfere('svg', Buffer.from('<html></html>')));
});

test('dimensoesPng lê largura e altura do IHDR', () => {
  const png = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.write('IHDR', 12, 'latin1');
  png.writeUInt32BE(1240, 16);
  png.writeUInt32BE(2000, 20);
  assert.deepEqual(dimensoesPng(png), { largura: 1240, altura: 2000 });
});

test('lerPgm e caixaEscura acham o retângulo com tinta', () => {
  const largura = 6, altura = 4;
  const pixels = Buffer.alloc(largura * altura, 255);
  pixels[1 * largura + 2] = 0;  // (x=2, y=1)
  pixels[2 * largura + 4] = 10; // (x=4, y=2)
  const pgm = Buffer.concat([Buffer.from(`P5\n${largura} ${altura}\n255\n`, 'latin1'), pixels]);
  const imagem = lerPgm(pgm);
  assert.equal(imagem.largura, 6);
  assert.equal(imagem.altura, 4);
  assert.deepEqual(caixaEscura(imagem), { x: 2, y: 1, largura: 3, altura: 2 });
});

test('enquadrarSvg troca só width, height e viewBox da raiz', () => {
  const svg = '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="595pt" height="842pt" viewBox="0 0 595 842" version="1.1">\n<path d="M 1 1 L 2 2" style="fill:rgb(0%,0%,0%);"/>\n</svg>';
  const saida = enquadrarSvg(svg, { x: 10, y: 20, largura: 300, altura: 100 });
  assert.match(saida, /<svg [^>]*width="300pt"/);
  assert.match(saida, /<svg [^>]*height="100pt"/);
  assert.match(saida, /<svg [^>]*viewBox="10 20 300 100"/);
  assert.ok(saida.includes('<path d="M 1 1 L 2 2" style="fill:rgb(0%,0%,0%);"/>'), 'traços intactos');
});

test('coresSvg normaliza hexadecimal, rgb em porcentagem, nomes e style', () => {
  const svg = '<svg><path fill="#1d1d1b"/><rect style="fill:rgb(0%, 0%, 0%);stroke:none"/>'
    + '<circle fill="black" stroke="#FFF"/><g fill="rgb(255,255,255)"/></svg>';
  assert.deepEqual(coresSvg(svg), ['#000000', '#1D1D1B', '#FFFFFF', 'none']);
  assert.ok(ehEscura('#1D1D1B') && ehEscura('#000000'));
  assert.ok(!ehEscura('#1094AB') && !ehEscura('#FFFFFF'));
});

const escuraOuNeutra = (c) => c === 'none' || c === '#FFFFFF' || ehEscura(c);

test('logo USP: SVG vetorial, só preto, enquadrado', async () => {
  const svg = await lerTexto('assets/marcas/usp-preto.svg');
  assert.ok(assinaturaConfere('svg', Buffer.from(svg)));
  assert.ok(!/<image\b/.test(svg), 'sem imagem raster embutida');
  assert.ok(coresSvg(svg).every((c) => c === 'none' || ehEscura(c)), `cores: ${coresSvg(svg)}`);
  const [, , , w, h] = /viewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/.exec(svg);
  assert.ok(Number(w) > 0 && Number(h) > 0);
  assert.ok(existsSync(new URL('assets/marcas/origem/usp-logo.pdf', raiz)));
});

test('lockup IME+USP: SVG sem raster e sem cor', async () => {
  const svg = await lerTexto('assets/marcas/ime-usp-horizontal-preta.svg');
  assert.ok(assinaturaConfere('svg', Buffer.from(svg)));
  assert.ok(!/<image\b/.test(svg), 'sem imagem raster embutida');
  assert.ok(coresSvg(svg).every(escuraOuNeutra), `cores: ${coresSvg(svg)}`);
});

test('IFUSP vertical preto: PNG com resolução suficiente', async () => {
  const png = await ler('assets/marcas/ifusp-vertical-preto.png');
  assert.ok(assinaturaConfere('png', png));
  assert.ok(dimensoesPng(png).altura >= 512, `altura ${dimensoesPng(png).altura}`);
});

test('unidades.json e usp.json completos e coerentes', async () => {
  const unidades = JSON.parse(await lerTexto('assets/marcas/unidades.json'));
  assert.deepEqual(Object.keys(unidades).sort(), ['ifusp', 'ime']);
  assert.equal(unidades.ime.integraUSP, true);
  assert.equal(unidades.ifusp.integraUSP, false);
  for (const [chave, u] of Object.entries(unidades)) {
    for (const campo of ['altura', 'protecao', 'alturaMinima'])
      assert.ok(Number.isInteger(u[campo]) && u[campo] > 0, `${chave}.${campo}`);
    assert.ok(u.altura >= u.alturaMinima, `${chave}: altura abaixo da mínima`);
    assert.ok(typeof u.nome === 'string' && u.nome.length > 0, `${chave}.nome`);
    assert.ok(existsSync(new URL(`assets/marcas/${u.arquivo}`, raiz)), `${chave}: arquivo ausente`);
  }
  const usp = JSON.parse(await lerTexto('assets/marcas/usp.json'));
  const tokens = simplificar(await lerTokens());
  assert.equal(usp.arquivo, 'usp-preto.svg');
  assert.equal(usp.altura, tokens.marca.uspAltura);
  assert.equal(usp.texto, 'Universidade de São Paulo');
  assert.ok(Number.isInteger(usp.protecao) && usp.protecao > 0);
});

test('README das marcas cita as origens e as páginas dos manuais', async () => {
  const readme = await lerTexto('assets/marcas/README.md');
  for (const trecho of ['scs.usp.br', 'ime.usp.br', 'portal.if.usp.br', 'Área de proteção', 'Altura mínima'])
    assert.ok(readme.includes(trecho), `README sem "${trecho}"`);
  assert.match(readme, /página \d+/);
});
