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
  // Igualdade com o arquivo, não substring: `AulaUSPMotor` também aparece no script de arranque,
  // então um `includes` passa com o motor vazio — medido, era o caso antes desta correção.
  const { readFile } = await import('node:fs/promises');
  const bundle = await readFile(new URL('dist/aula-usp-motor.js', RAIZ), 'utf8');
  const embutidos = [...doc.querySelectorAll('script:not([src])')].map((s) => s.textContent);
  assert.ok(embutidos.includes(bundle), 'o motor embutido não é o bundle de dist/aula-usp-motor.js');
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

// Rodada de correção 1, item 2: nenhum espécime usado acima tem bloco de código; prerenderizarCodigo
// ficava sem cobertura nenhuma. especime/codigo.html tem as sete linguagens do contrato.
test('o código é pré-renderizado: nós do Shiki no HTML final, nenhum pre[data-lang] por destacar', async () => {
  const { doc, errosDeCodigo } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/codigo.html', RAIZ), embutirFontes: FONTES });
  assert.deepEqual(errosDeCodigo, [], 'prerenderizarCodigo relatou erro numa aula que só usa linguagens do contrato');
  const blocos = [...doc.querySelectorAll('pre[data-lang]')];
  assert.ok(blocos.length > 0, 'o espécime não tem bloco de código nenhum — teste não prova nada');
  assert.ok(doc.querySelectorAll('.linha').length > 0, 'nenhuma linha do Shiki apareceu no HTML final');
  assert.ok(blocos.every((pre) => pre.firstElementChild?.classList.contains('linha')),
    'sobrou pre[data-lang] sem destacar (primeiro filho não é .linha)');
});

// Rodada de correção 1, item 2: idem para embutirImagensDoAutor — nenhum espécime usado tem <img> de
// arquivo real (só data: já prontos). Fixture dedicada, com a imagem ao lado do arquivo da aula, para
// que só passe se o caminho for resolvido contra a PASTA DA AULA — "figuras/quadrado.svg" não existe
// na raiz do repositório, então resolver contra `raiz` por engano dispararia ENOENT.
test('imagem do autor por caminho relativo vira data URI, resolvida contra a pasta da aula', async () => {
  const { readFile } = await import('node:fs/promises');
  const caminhoDaAula = new URL('../fixtures/construir/aula-com-imagem/aula.html', import.meta.url);
  const { doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula, embutirFontes: FONTES });
  const img = doc.querySelector('img[alt="Quadrado de teste"]');
  const src = img.getAttribute('src');
  assert.ok(src.startsWith('data:image/svg+xml;base64,'), `esperava data URI de SVG, veio: ${src.slice(0, 40)}`);
  const original = await readFile(new URL('../fixtures/construir/aula-com-imagem/figuras/quadrado.svg', import.meta.url));
  assert.equal(src, `data:image/svg+xml;base64,${original.toString('base64')}`,
    'os bytes não batem com figuras/quadrado.svg ao lado da aula — resolveu contra outra pasta');
});

// Rodada de correção 1, item 3: a guarda `if (!tag) throw` não tinha teste.
test('sem a tag do runtime, construirHtml falha com mensagem clara', async () => {
  const caminhoDaAula = new URL('../fixtures/construir/sem-runtime.html', import.meta.url);
  await assert.rejects(
    () => construirHtml({ raiz: RAIZ, caminhoDaAula, embutirFontes: FONTES }),
    /a aula não tem a tag do runtime/,
  );
});
