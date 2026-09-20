// I7 da revisão final do 5c: com um ARQUIVO como alvo, o `<slug>` vinha de `basename(dirname(...))`
// — o nome da PASTA — e dois decks lado a lado se sobrescreviam em silêncio dentro de `<pasta>/dist/`.
// O alvo-arquivo não é hipótese: `caminhoDaAula` (build/validar.mjs) o aceita de propósito, `validar`
// o documenta, e a pasta `especime/` deste repositório tem seis decks lado a lado — `aula-usp build
// especime/matematica.html` é exatamente a forma que um autor digitaria.
//
// Regra decidida pelo controlador nesta rodada: o slug é o nome da PASTA quando o alvo resolveu para
// `index.html` (a forma que a spec 3.3 descreve, "<slug> é o nome da pasta da aula") e o basename do
// ARQUIVO sem `.html` caso contrário (a forma que a spec não descreve, e que era silenciosamente
// destrutiva). O cálculo mora uma vez só, em build/construir.mjs; build/build.mjs deriva o nome do
// PDF de `basename(caminhoDoHtml, '.html')` (M4).
//
// Integração, não unitário: o par completo `.html` + `.pdf` exige o Chrome das etapas 5 e 6 (a mesma
// razão de tests/integracao/build.test.mjs). A metade `.html` da regra, que não precisa de navegador
// nenhum, tem teste próprio em tests/unit/construir.test.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { iniciarChrome } from './utilitarios.mjs';
import { build } from '../../build/build.mjs';

const RAIZ = new URL('../../', import.meta.url);
const FIXTURE = new URL('../fixtures/build/aula-limpa/aula.html', import.meta.url);

let navegador;
before(async () => {
  console.error('slug.test.mjs: abrindo o Chrome (uma vez para o arquivo inteiro)');
  navegador = await iniciarChrome(); // reaproveitado só pela etapa 6; a etapa 5 abre o dela (build/composicao.mjs).
});
after(async () => {
  await navegador?.close();
});

test('dois decks na mesma pasta: cada um sai com o seu par .html/.pdf, sem sobrescrever o outro', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'slug-'));
  const original = await readFile(FIXTURE, 'utf8');
  // Dois decks DIFERENTES: o h1 de cada um é o que distingue o conteúdo gravado, para o teste não
  // aceitar dois arquivos com nomes certos e o mesmo conteúdo dentro.
  await writeFile(join(pasta, 'primeira.html'), original.replace('<h1>Aula limpa</h1>', '<h1>Deck da primeira</h1>'), 'utf8');
  await writeFile(join(pasta, 'segunda.html'), original.replace('<h1>Aula limpa</h1>', '<h1>Deck da segunda</h1>'), 'utf8');

  // O MESMO destino para os dois, porque é o que a CLI calcula: `join(dirname(alvo), 'dist')`
  // (bin/aula-usp.mjs, spec 3.3 "escreve só em <pasta>/dist/"). É essa partilha que fazia um deck
  // apagar o outro.
  const destino = join(pasta, 'dist');
  const primeira = await build({ raiz: RAIZ, caminhoDaAula: pathToFileURL(join(pasta, 'primeira.html')), destino, navegador });
  const segunda = await build({ raiz: RAIZ, caminhoDaAula: pathToFileURL(join(pasta, 'segunda.html')), destino, navegador });
  assert.equal(primeira.codigo, 0);
  assert.equal(segunda.codigo, 0);

  // Os quatro arquivos, mais o validacao.json — este último é nome fixo da spec 3.3, então ele é
  // mesmo do último build; o que não pode colidir são os artefatos com `<slug>` no nome.
  assert.deepEqual((await readdir(destino)).sort(),
    ['primeira.html', 'primeira.pdf', 'segunda.html', 'segunda.pdf', 'validacao.json'].sort());
  assert.match(await readFile(join(destino, 'primeira.html'), 'utf8'), /Deck da primeira/);
  assert.match(await readFile(join(destino, 'segunda.html'), 'utf8'), /Deck da segunda/);
  // Os PDFs também são dois, e cada um com bytes de verdade (o segundo build não reaproveitou nada).
  const [bytesPrimeira, bytesSegunda] = await Promise.all([
    readFile(join(destino, 'primeira.pdf')),
    readFile(join(destino, 'segunda.pdf')),
  ]);
  assert.ok(bytesPrimeira.subarray(0, 5).toString() === '%PDF-', 'primeira.pdf não começa com %PDF-');
  assert.ok(bytesSegunda.subarray(0, 5).toString() === '%PDF-', 'segunda.pdf não começa com %PDF-');
  assert.notDeepEqual(bytesPrimeira, bytesSegunda, 'os dois PDFs são byte a byte iguais: um sobrescreveu o outro');
});
