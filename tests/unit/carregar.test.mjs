// O carregador do Node (spec 9.3, etapa 1): demosDosScripts lê JavaScript sem executá-lo,
// imagensDoDisco confere o disco, texInvalido compila TeX como o sistema de verdade compila.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { demosDosScripts, imagensDoDisco, texInvalido, carregarNoNode } from '../../build/carregar.mjs';

const doc = (corpo) => parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document;
const script = (js) => doc(`<script>${js}</script>`);

test('registro dentro de um bloco /* … */ não é um registro de verdade', () => {
  // Fechamento em linha própria (\n});), o formato que o regex antigo (sem noção de comentário)
  // batia de qualquer jeito — para o teste isolar o defeito do comentário, não o de formatação.
  const demos = demosDosScripts(script(`
/*
AulaUSP.demo('fantasma', {
  montar() {},
});
*/
`));
  assert.deepEqual([...demos.keys()], []);
});

test('capturar citado só em // comentário não conta como definição', () => {
  const demos = demosDosScripts(script(`
AulaUSP.demo('a', {
  montar() {},
  // TODO: falta implementar capturar() aqui
});
`));
  assert.deepEqual(demos.get('a'), { capturar: false });
});

test('capturar depois de um }); aninhado (uma chamada de configuração dentro de montar) ainda é achado', () => {
  const demos = demosDosScripts(script(`
AulaUSP.demo('b', {
  montar(raiz) {
    configurar({ opcao: 1 });
  },
  capturar() { return 'x'; },
});
`));
  assert.deepEqual(demos.get('b'), { capturar: true });
});

test('capturar: também é definição, não só capturar()', () => {
  const demos = demosDosScripts(script("AulaUSP.demo('c', { montar() {}, capturar: () => 'x' });"));
  assert.deepEqual(demos.get('c'), { capturar: true });
});

test("['capturar'](...) — propriedade computada — também é definição", () => {
  const demos = demosDosScripts(script("AulaUSP.demo('d', { montar() {}, ['capturar']() { return 'x'; } });"));
  assert.deepEqual(demos.get('d'), { capturar: true });
});

// Round 2 da revisão: uma chave { ou } desbalanceada dentro de uma string do corpo (não um erro de
// digitação no fonte — uma string de verdade pode ter esse caractere) não pode fazer o casamento de
// chaves inventar um erro. Apagar o registro faria recursos.demo-sem-registro (erro) acusar uma
// demo que está registrada — pior do que um capturar impreciso.
test('uma { desbalanceada dentro de uma string do corpo não derruba o registro', () => {
  const demos = demosDosScripts(script(
    "AulaUSP.demo('e', { montar() { const s = '{'; }, capturar() { return 'x'; } });",
  ));
  assert.deepEqual(demos.get('e'), { capturar: true });
});

test('uma } desbalanceada dentro de uma string do corpo não trunca antes do capturar real', () => {
  const demos = demosDosScripts(script(
    "AulaUSP.demo('f', { montar() { const s = '}'; }, capturar() { return 'x'; } });",
  ));
  assert.deepEqual(demos.get('f'), { capturar: true });
});

test('duas demos no mesmo script aparecem as duas', () => {
  const demos = demosDosScripts(script(
    "AulaUSP.demo('um', { montar() {} });\nAulaUSP.demo('dois', { montar() {}, capturar() { return 'x'; } });",
  ));
  assert.deepEqual([...demos.entries()], [['um', { capturar: false }], ['dois', { capturar: true }]]);
});

test('script com src é ignorado inteiro', () => {
  const demos = demosDosScripts(doc('<script src="x.js">AulaUSP.demo(\'nunca\', {});</script>'));
  assert.deepEqual([...demos.keys()], []);
});

test('aspas duplas e nome hifenizado funcionam', () => {
  const demos = demosDosScripts(script('AulaUSP.demo("com-hifen", { montar() {} });'));
  assert.deepEqual([...demos.keys()], ['com-hifen']);
});

test('uma string com // dentro (uma URL, como um capturar() real do sistema) não vira comentário', () => {
  // Mesmo formato de tests/fixtures/impressao/index.html: aspas simples escapadas dentro da string.
  const js = 'AulaUSP.demo(\'capturavel\', {'
    + ' montar(raiz) { raiz.append(document.createElement(\'canvas\')); },'
    + ' capturar() { return \'data:image/svg+xml,%3Csvg xmlns=\\\'http://www.w3.org/2000/svg\\\'%3E%3C/svg%3E\'; },'
    + ' });';
  const demos = demosDosScripts(script(js));
  assert.deepEqual(demos.get('capturavel'), { capturar: true });
});

// Buraco aceito (round 2 da revisão), não corrigido de propósito: um literal de regex com aspas
// dentro (aqui, /'/) dessincroniza o rastreador de string de apagarComentarios, e uma resincronia
// posterior (aqui, o apóstrofo de "it's") faz o resto do comentário /* … */ parecer código comum —
// um AulaUSP.demo(...) genuinamente comentado é lido como se estivesse ao vivo. A asserção abaixo
// prende o valor ERRADO de propósito: NÃO é o comportamento desejado, é o estado atual, registrado
// para o dia em que alguém tentar consertar (aí este teste avisa, em vez de continuar quieto). Ver
// o comentário sobre apagarComentarios em build/carregar.mjs para o porquê de ficar assim por ora.
test('buraco aceito: regex com aspas desincroniza e um comentário genuíno depois lê como ao vivo', () => {
  const js = "const p = /'/;\n/* it's fine: AulaUSP.demo('ghost', { montar() {} }); */\n";
  const demos = demosDosScripts(script(js));
  assert.deepEqual(demos.get('ghost'), { capturar: false }); // errado: 'ghost' está comentado, não deveria existir aqui
});

function pastaTemporaria() {
  return mkdtempSync(join(tmpdir(), 'aula-usp-carregar-'));
}

test('imagensDoDisco: data: e https:// (em qualquer caixa) não vão ao disco', () => {
  const pasta = pastaTemporaria();
  const { document } = parseHTML(`<!DOCTYPE html><html><body>
    <img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">
    <img src="https://exemplo.org/a.png">
    <img src="HTTPS://exemplo.org/b.png">
  </body></html>`);
  const imagens = imagensDoDisco(document, pasta);
  assert.deepEqual([...imagens.keys()], []);
});

test('imagensDoDisco: existe no disco, não existe, e uma pasta no lugar de um arquivo não conta', () => {
  const pasta = pastaTemporaria();
  writeFileSync(join(pasta, 'existe.png'), '');
  mkdirSync(join(pasta, 'pasta-nao-arquivo.png'));
  const { document } = parseHTML(`<!DOCTYPE html><html><body>
    <img src="existe.png">
    <img src="sumiu.png">
    <img src="pasta-nao-arquivo.png">
  </body></html>`);
  const imagens = imagensDoDisco(document, pasta);
  assert.deepEqual([...imagens.entries()], [
    ['existe.png', true],
    ['sumiu.png', false],
    ['pasta-nao-arquivo.png', false],
  ]);
});

test('imagensDoDisco: consulta ("?v=2") não faz um arquivo existente parecer ausente', () => {
  const pasta = pastaTemporaria();
  writeFileSync(join(pasta, 'existe.png'), '');
  const { document } = parseHTML('<!DOCTYPE html><html><body><img src="existe.png?v=2"></body></html>');
  const imagens = imagensDoDisco(document, pasta);
  assert.deepEqual(imagens.get('existe.png?v=2'), true);
});

function tex(corpo) {
  const { document } = parseHTML(`<!DOCTYPE html><html><body><p>${corpo}</p></body></html>`);
  document.body.normalize();
  return document;
}

test('texInvalido compila TeX como o sistema compila: \\passo inválido acusa, \\passo válido não', () => {
  assert.deepEqual(texInvalido(tex('\\( \\passo{1}{w} \\)'), katex), []);
  for (const invalido of ['\\( \\passo{0}{w} \\)', '\\( \\passo{abc}{w} \\)', '\\( \\passo{}{w} \\)']) {
    const erros = texInvalido(tex(invalido), katex);
    assert.equal(erros.length, 1, invalido);
    assert.match(erros[0].mensagem, /número de passo inválido em \\passo/);
  }
});

test('texInvalido recusa comando não confiável, igual ao navegador', () => {
  const erros = texInvalido(tex('\\( \\href{https://x}{a} \\)'), katex);
  assert.equal(erros.length, 1);
  assert.equal(erros[0].mensagem, 'comando não permitido no TeX');
});

test('carregarNoNode junta os três: tex, imagens e demos', () => {
  const pasta = pastaTemporaria();
  writeFileSync(join(pasta, 'existe.png'), '');
  const { document } = parseHTML(`<!DOCTYPE html><html><body>
    <p>\\( \\frac{1 \\)</p>
    <img src="existe.png"><img src="sumiu.png">
    <script>AulaUSP.demo('contador', { montar() {} });</script>
  </body></html>`);
  document.body.normalize();
  const recursos = carregarNoNode(document, { pastaDaAula: pasta, katex });
  assert.equal(recursos.tex.length, 1);
  assert.deepEqual([...recursos.imagens.entries()], [['existe.png', true], ['sumiu.png', false]]);
  assert.deepEqual([...recursos.demos.entries()], [['contador', { capturar: false }]]);
});

// Fase 2b: o Graphviz chega por parâmetro, como o KaTeX. Aula sem diagrama não precisa dele (e
// build/validar.mjs nem o carrega); aula com diagrama e sem Graphviz é defeito de quem chama, e tem
// de lançar — calado, recursos.dot e recursos.diagrama-grande não teriam o que ler e o diagrama
// sairia vazio sem achado nenhum.
test('carregarNoNode compila os diagramas com o Graphviz que recebe, e recusa aula com diagrama sem ele', async () => {
  const { carregarGraphviz } = await import('../../build/carregar.mjs');
  const pasta = pastaTemporaria();
  const semDiagrama = parseHTML('<!DOCTYPE html><html><body><p>Nada.</p></body></html>').document;
  assert.deepEqual(carregarNoNode(semDiagrama, { pastaDaAula: pasta, katex }).diagramas, []);
  const comDiagrama = () => parseHTML(`<!DOCTYPE html><html><body>
    <figure class="diagrama"><script type="text/vnd.graphviz">digraph { a -> b -> c }</script></figure>
    <figure class="diagrama"><script type="text/vnd.graphviz">digraph { a -> }</script></figure>
  </body></html>`).document;
  assert.throws(() => carregarNoNode(comDiagrama(), { pastaDaAula: pasta, katex }), /ninguém passou o Graphviz/);
  const documento = comDiagrama();
  const { diagramas } = carregarNoNode(documento, { pastaDaAula: pasta, katex, graphviz: await carregarGraphviz() });
  const figuras = [...documento.querySelectorAll('figure')];
  assert.deepEqual(diagramas.map(({ figura, nos, mensagem }) => [figuras.indexOf(figura), nos, Boolean(mensagem)]),
    [[0, 3, false], [1, undefined, true]]);
  assert.equal(await carregarGraphviz(), await carregarGraphviz(), 'uma instância por processo');
});
