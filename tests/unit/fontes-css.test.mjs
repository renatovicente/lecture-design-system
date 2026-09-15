import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gerarFontesCss } from '../../build/fontes-css.mjs';

const raiz = new URL('../../', import.meta.url);
const manifesto = JSON.parse(await readFile(new URL('assets/fontes/fontes.json', raiz), 'utf8'));
const bloco = (css, arquivo) => css.split('@font-face').find((parte) => parte.includes(`/${arquivo}'`));

test('um @font-face por arquivo do manifesto, com URL relativa, estilo, pesos e unicode-range', () => {
  const css = gerarFontesCss(manifesto);
  assert.equal(css.match(/@font-face/g).length, manifesto.length);
  const geist = bloco(css, 'geist-normal-latin.woff2');
  assert.match(geist, /font-family: 'Geist';/);
  assert.match(geist, /font-style: normal;/);
  assert.match(geist, /font-weight: 400 600;/);
  assert.match(geist, /src: url\('\.\.\/assets\/fontes\/geist-normal-latin\.woff2'\) format\('woff2'\);/);
  assert.match(geist, /unicode-range: U\+0000-00FF/);
  assert.match(bloco(css, 'geist-italico-latin.woff2'), /font-style: italic;/);
  assert.match(bloco(css, 'geist-mono-normal-latin.woff2'), /font-weight: 400 700;/);
  assert.match(bloco(css, 'open-sans-normal-latin.woff2'), /font-weight: 600;/);
});

test('estilos/fontes.css no repositório está atualizado', async () => {
  assert.equal(await readFile(new URL('estilos/fontes.css', raiz), 'utf8'), gerarFontesCss(manifesto));
});
