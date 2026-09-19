// A cobertura do HTML final é sistema ∪ KaTeX embutido, e varia por aula. Os números aqui foram
// medidos nas fontes deste repositório; se a sua contagem divergir, PARE e relate, não ajuste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { embutirFontes } from '../../build/fontes-embutidas.mjs';

const RAIZ = new URL('../../', import.meta.url);
const documentoDe = async (caminho) => parseHTML(await readFile(new URL(caminho, RAIZ), 'utf8')).document;

test('as oito fontes do sistema entram sempre, como data URI', async () => {
  const { css } = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  const embutidas = [...css.matchAll(/data:font\/woff2;base64,/g)].length;
  assert.ok(embutidas >= 8, `só ${embutidas} fontes embutidas; as do sistema são 8`);
  assert.equal(/url\((?!data:)/.test(css), false, 'sobrou url() que não é data URI');
});

// Fato 8: sem as fontes do KaTeX, sete caracteres de uma aula com matemática ficariam sem glifo.
test('uma aula com matemática traz também a cobertura do KaTeX', async () => {
  const semTex = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  const comTex = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/matematica.html') });
  assert.ok(comTex.familias.length > 0, 'nenhuma família do KaTeX foi incluída numa aula com TeX');
  assert.ok(comTex.cobertura.size > semTex.cobertura.size, 'a cobertura não cresceu com o KaTeX');
  for (const caractere of 'η←∇∑⊤Δ⋅') {
    assert.ok(comTex.cobertura.has(caractere.codePointAt(0)), `${caractere} deveria ter glifo no HTML final`);
  }
});

test('uma aula sem matemática não carrega fonte de KaTeX nenhuma', async () => {
  const { familias, css } = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  assert.deepEqual(familias, [], `aula sem TeX trouxe famílias do KaTeX: ${familias.join(', ')}`);
  assert.equal(css.includes('KaTeX_'), false);
});

// Medido ao implementar (não estava nos três testes do brief): especime/matematica.html usa a classe
// solta "size3" para ESCALA DE FONTE (no expoente de w^\top), não para família — e usa exatamente as
// classes de tamanho que a implementação precisa acertar em par (op-symbol+small-op/large-op no \sum,
// delimsizing+size1 no \left(...\right)). Esta aula é o único espécime que exercita ambas as formas do
// \sum (em texto e em destaque), por isso ela sozinha já cobre a guarda "nenhum url() cru sobra, nem
// quando o KaTeX entra" — o teste acima só prova isso para a aula SEM TeX.
test('com KaTeX incluído, também não sobra url() que não seja data URI nem url() vazio', async () => {
  const { css, familias } = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/matematica.html') });
  assert.ok(familias.length > 0, 'espécime de matemática não trouxe família nenhuma do KaTeX');
  assert.equal(/url\((?!data:|\))/.test(css), false, 'sobrou url() que não é nem data URI nem vazio');
});
