// O HTML final é a entrega do marco: a aula inteira num arquivo, que abre sem rede. Este teste mede
// isso em Node (rápido); quem prova que ele VIVE é tests/integracao/construido.test.mjs, no Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirHtml } from '../../build/embutir.mjs';

const RAIZ = new URL('../../', import.meta.url);
// Coto das fontes: a tarefa 2 é quem as embute de verdade. É FUNÇÃO, não objeto — construirHtml a
// chama depois de renderizarTex, porque só aí dá para saber quais famílias do KaTeX a aula usa.
const FONTES = async () => ({ css: '@font-face{font-family:Geist;src:url(data:font/woff2;base64,AA==)}', cobertura: new Set(), familias: [] });

test('constrói um HTML sem nenhuma referência externa', async () => {
  const { html, doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), embutirFontes: FONTES });
  const externos = [...doc.querySelectorAll('[src]')]
    .map((elemento) => elemento.getAttribute('src'))
    .filter((valor) => valor && !valor.startsWith('data:'));
  assert.deepEqual(externos, [], `sobrou src externo: ${externos.join(', ')}`);
  assert.equal(doc.querySelectorAll('link[rel="stylesheet"]').length, 0);
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'o HTML final precisa do doctype');
});

test('a tag do runtime some e o motor embutido entra no lugar dela', async () => {
  const { doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), embutirFontes: FONTES });
  const comSrc = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
  assert.deepEqual(comSrc.filter((s) => s.endsWith('/aula-usp.js')), [], 'a tag do runtime continua lá');
  const embutidos = [...doc.querySelectorAll('script:not([src])')].map((s) => s.textContent);
  assert.ok(embutidos.some((t) => t.includes('AulaUSPMotor')), 'o motor embutido não entrou');
});

// Fato 4: reconstruir o resumo do DOM seria uma segunda implementação do que montar() calculou.
test('o resumo que montar() devolveu vai serializado no HTML, com os mesmos blocos', async () => {
  const { doc, resumo } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), embutirFontes: FONTES });
  const arranque = [...doc.querySelectorAll('script:not([src])')].map((s) => s.textContent).join('\n');
  assert.ok(arranque.includes(JSON.stringify(resumo.blocos[0].id)), 'o id do primeiro bloco não está no arranque');
  // Sem "ou": JSON.stringify produz exatamente esta forma. Um ou aqui só faria o teste passar mais fácil.
  assert.ok(arranque.includes(`"total":${resumo.total}`), 'o total não está no arranque');
});

// Fato 5: a fila tem de existir antes do <script> do autor, que roda durante o parsing.
test('a fila de demos é instalada antes de qualquer script do autor', async () => {
  const { doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/index.html', RAIZ), embutirFontes: FONTES });
  const scripts = [...doc.querySelectorAll('script')];
  const ondeAFila = scripts.findIndex((s) => s.textContent.includes('filaDeDemos'));
  const ondeOAutor = scripts.findIndex((s) => !s.src && s.textContent.includes('AulaUSP.demo('));
  assert.ok(ondeAFila >= 0, 'ninguém instala a fila');
  if (ondeOAutor >= 0) assert.ok(ondeAFila < ondeOAutor, 'a fila é instalada depois do script do autor');
});

// Spec 3.3: o fonte nunca é alterado.
test('construir não toca no arquivo da aula', async () => {
  const { readFile } = await import('node:fs/promises');
  const caminho = new URL('especime/matematica.html', RAIZ);
  const antes = await readFile(caminho, 'utf8');
  await construirHtml({ raiz: RAIZ, caminhoDaAula: caminho, embutirFontes: FONTES });
  assert.equal(await readFile(caminho, 'utf8'), antes);
});

test('a matemática é pré-renderizada: o HTML final tem KaTeX e não tem delimitador cru', async () => {
  const { doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), embutirFontes: FONTES });
  assert.ok(doc.querySelectorAll('.katex').length > 10);
  const corpo = doc.body.textContent;
  assert.equal(/\\\(|\\\[/.test(corpo), false, 'sobrou delimitador de TeX não renderizado');
});
