import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extrairFaces, agruparPorArquivo, FAMILIAS } from '../../build/fontes.mjs';

const raiz = new URL('../../', import.meta.url);
const ler = (p) => readFile(new URL(p, raiz));
const porArquivo = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const fixture = async () => (await ler('tests/fixtures/fontes/google-geist.css')).toString('utf8');

test('extrairFaces lê subconjunto, estilo, peso, URL e unicode-range', async () => {
  const faces = extrairFaces(await fixture());
  assert.equal(faces.length, 7);
  assert.deepEqual(faces[0], {
    subconjunto: 'cyrillic', familia: 'Geist', estilo: 'italic', peso: 400,
    url: 'https://fonts.gstatic.com/s/geist/v5/italico-cirilico.woff2',
    unicodeRange: 'U+0301, U+0400-045F',
  });
  assert.deepEqual(faces.map((f) => f.peso), [400, 400, 400, 400, 400, 600, 600]);
});

test('agruparPorArquivo deduplica a fonte variável e ignora outros subconjuntos', async () => {
  const arquivos = agruparPorArquivo(extrairFaces(await fixture()), 'geist');
  assert.deepEqual(arquivos.map((a) => [a.arquivo, a.pesos, a.subconjunto]), [
    ['geist-italico-latin-ext.woff2', [400], 'latin-ext'],
    ['geist-italico-latin.woff2', [400], 'latin'],
    ['geist-normal-latin-ext.woff2', [400, 600], 'latin-ext'],
    ['geist-normal-latin.woff2', [400, 600], 'latin'],
  ]);
});

test('agruparPorArquivo distingue arquivos estáticos de mesmo subconjunto pelos pesos', () => {
  const faces = [400, 700].map((peso) => ({
    subconjunto: 'latin', familia: 'X', estilo: 'normal', peso,
    url: `https://exemplo.org/x-${peso}.woff2`, unicodeRange: 'U+0000-00FF',
  }));
  assert.deepEqual(agruparPorArquivo(faces, 'x').map((a) => a.arquivo),
    ['x-normal-latin-400.woff2', 'x-normal-latin-700.woff2']);
});

test('manifesto lista os 8 arquivos esperados', async () => {
  const manifesto = JSON.parse(await ler('assets/fontes/fontes.json'));
  assert.deepEqual(manifesto.map((m) => [m.arquivo, m.familia, m.estilo, m.pesos]).sort(porArquivo), [
    ['geist-italico-latin-ext.woff2', 'Geist', 'italic', [400]],
    ['geist-italico-latin.woff2', 'Geist', 'italic', [400]],
    ['geist-mono-normal-latin-ext.woff2', 'Geist Mono', 'normal', [400, 600, 700]],
    ['geist-mono-normal-latin.woff2', 'Geist Mono', 'normal', [400, 600, 700]],
    ['geist-normal-latin-ext.woff2', 'Geist', 'normal', [400, 600]],
    ['geist-normal-latin.woff2', 'Geist', 'normal', [400, 600]],
    ['open-sans-normal-latin-ext.woff2', 'Open Sans', 'normal', [600]],
    ['open-sans-normal-latin.woff2', 'Open Sans', 'normal', [600]],
  ]);
});

test('cada woff2 existe, é woff2 e confere com o manifesto', async () => {
  const manifesto = JSON.parse(await ler('assets/fontes/fontes.json'));
  for (const m of manifesto) {
    const bytes = await ler(`assets/fontes/${m.arquivo}`);
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOF2', m.arquivo);
    assert.equal(bytes.length, m.bytes, m.arquivo);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), m.sha256, m.arquivo);
    assert.match(m.unicodeRange, /^U\+/, m.arquivo);
    assert.match(m.origem, /^https:\/\/fonts\.gstatic\.com\//, m.arquivo);
  }
});

test('licenças OFL das três famílias', async () => {
  assert.deepEqual(FAMILIAS.map((f) => f.slug), ['geist', 'geist-mono', 'open-sans']);
  for (const f of FAMILIAS) {
    const texto = (await ler(`assets/fontes/licencas/${f.slug}-OFL.txt`)).toString('utf8');
    assert.match(texto, /SIL OPEN FONT LICENSE/i, f.slug);
  }
});
