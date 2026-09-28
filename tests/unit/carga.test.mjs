// Regras de carga (spec 9.2 e 9.3): leem o que o chamador carregou, e nada mais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar } from '../../validador/validar.js';
import { regras } from '../../validador/regras/carga.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="T"><meta name="aula" content="1">
<meta name="data" content="2026-09-18"><meta name="professor" content="P."></head><body>`;

const AULA = `${CABECA}
<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="conteudo" id="figuras">
  <h2>Figuras</h2>
  <figure><img src="img/existe.png" alt="a"></figure>
  <figure><img src="img/sumiu.png" alt="b"></figure>
  <figure><img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" alt="c"></figure>
  <aside class="notas">N.</aside>
</section>
<section data-layout="demo" id="com-estatico"><h2>Com estático</h2><div class="demo" data-demo="contador"><img class="estatico" src="img/existe.png" alt="d"></div><aside class="notas">N.</aside></section>
<section data-layout="demo" id="com-capturar"><h2>Com capturar</h2><div class="demo" data-demo="grafico"></div><aside class="notas">N.</aside></section>
<section data-layout="demo" id="nua"><h2>Nua</h2><div class="demo" data-demo="nua"></div><aside class="notas">N.</aside></section>
<section data-layout="demo" id="fantasma"><h2>Fantasma</h2><div class="demo" data-demo="fantasma"></div><aside class="notas">N.</aside></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

function rodar(recursos, html = AULA) {
  const { document } = parseHTML(html);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos });
  return { achados, document };
}

const COMPLETO = (document) => ({
  tex: [{ trecho: '\\( \\frac{1 \\)', mensagem: "Expected '}', got 'EOF'", elemento: document.querySelector('#figuras h2') }],
  imagens: new Map([['img/existe.png', true], ['img/sumiu.png', false]]),
  demos: new Map([['contador', { capturar: false }], ['grafico', { capturar: true }], ['nua', { capturar: false }]]),
});

test('sem recursos carregados, nenhuma regra inventa achado', () => {
  assert.deepEqual(rodar(undefined).achados, []);
  assert.deepEqual(rodar({}).achados, []);
});

test('TeX que não compila vira erro no slide onde está', () => {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document) })
    .filter((achado) => achado.regra === 'matematica.tex-invalido');
  assert.equal(achados.length, 1);
  assert.equal(achados[0].slide, 2);
  assert.match(achados[0].mensagem, /Expected '}', got 'EOF'/);
});

test('imagem que não carregou acusa; a que carregou e a embutida, não', () => {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document) })
    .filter((achado) => achado.regra === 'recursos.imagem');
  assert.deepEqual(achados.map((achado) => achado.mensagem), ['imagem que não carregou: "img/sumiu.png".']);
});

test('demo sem registro é erro; demo sem estático nem capturar é aviso', () => {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document) });
  const semRegistro = achados.filter((achado) => achado.regra === 'recursos.demo-sem-registro');
  assert.deepEqual(semRegistro.map((achado) => achado.mensagem), ['demo sem registro: "fantasma".']);
  const semEstatico = achados.filter((achado) => achado.regra === 'recursos.demo-sem-estatico');
  assert.deepEqual(semEstatico.map((achado) => achado.slide), [5]);
  assert.equal(semEstatico[0].severidade, 'aviso');
});

test('a demo sem registro não acusa também falta de estático: um erro, um dono', () => {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document) })
    .filter((achado) => achado.slide === 6);
  assert.deepEqual(achados.map((achado) => achado.regra), ['recursos.demo-sem-registro']);
});

// recursos.demo-sem-estatico muda de EIXO na fase 2 (spec 9.2: "na fase 2, só no modo navegador,
// porque o build captura"). Três casos, um teste cada; a mesma aula nos três, com a demo "nua" (sem
// img.estatico e sem capturar()) no slide 5. A inversão que importa é o caso 2: rodado contra uma
// regra que ignora o modo (calada sempre na fase 2), ele fica vermelho — medido.
function semEstatico(opcoes) {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document), ...opcoes })
    .filter((achado) => achado.regra === 'recursos.demo-sem-estatico');
  return { achados, document };
}

test('demo-sem-estatico, caso 1 — fase 1: acusa nos dois modos, com a ação de sempre', () => {
  for (const modo of ['navegador', 'build']) {
    const { achados } = semEstatico({ fase: 1, modo });
    assert.deepEqual(achados.map((achado) => [achado.slide, achado.id]), [[5, 'nua']], modo);
    assert.equal(achados[0].mensagem, 'demo "nua" sem img.estatico e sem capturar(): o PDF sai vazio.');
    assert.equal(achados[0].acao, contrato.regras['recursos.demo-sem-estatico'].acao);
  }
});

test('demo-sem-estatico, caso 2 — fase 2 no navegador: continua acusando, e aponta o build', () => {
  const { achados } = semEstatico({ fase: 2, modo: 'navegador' });
  assert.deepEqual(achados.map((achado) => [achado.slide, achado.id, achado.severidade]), [[5, 'nua', 'aviso']]);
  assert.equal(achados[0].mensagem, 'demo "nua" sem img.estatico e sem capturar(): impresso pelo navegador, o PDF sai sem ela.');
  assert.equal(achados[0].acao, contrato.regras['recursos.demo-sem-estatico'].acaoNavegador);
  // Quem não passa o modo fica no navegador: o padrão não cala ninguém.
  assert.deepEqual(semEstatico({ fase: 2 }).achados, achados);
});

test('demo-sem-estatico, caso 3 — fase 2 no build: cala, porque o build fotografa; e volta a acusar a foto que falhou', () => {
  assert.deepEqual(semEstatico({ fase: 2, modo: 'build' }).achados, []);
  const { document } = parseHTML(AULA);
  const falhasDeCaptura = new Map([[document.querySelector('#nua div.demo'), 'a demo não desenhou nada']]);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document), fase: 2, modo: 'build', falhasDeCaptura })
    .filter((achado) => achado.regra === 'recursos.demo-sem-estatico');
  assert.deepEqual(achados.map((achado) => [achado.slide, achado.id, achado.severidade]), [[5, 'nua', 'aviso']]);
  assert.equal(achados[0].mensagem, 'demo "nua" sem img.estatico e sem capturar(), e a captura do build falhou: a demo não desenhou nada.');
  assert.equal(achados[0].acao, contrato.regras['recursos.demo-sem-estatico'].acaoCaptura);
});

test('validar recusa um modo que não é da spec, em vez de cair calado num padrão', () => {
  const { document } = parseHTML(AULA);
  assert.throws(() => validar(document, { contrato, regras, grupo: 'carga', modo: 'Build' }), /modo desconhecido "Build"/);
});

test('as ações do aviso vêm do contrato e são frases', () => {
  const regra = contrato.regras['recursos.demo-sem-estatico'];
  for (const chave of ['acao', 'acaoNavegador', 'acaoCaptura']) assert.match(regra[chave], /^\S.*\.$/, chave);
});

// Critical 1 da revisão final da 2a: faseDaAula põe na fase 2 uma aula com figure.diagrama, e sem
// uma regra que o recuse o diagrama passava por validar e build com 0 erros e a figura saía vazia. Na
// 2a a regra recusava TODO diagrama; desde a 2b, quem desenha é o Graphviz, e recursos.dot acusa o
// que ele não compila, com a mensagem dele e o slide de cada figura (o elemento que carregarNoNode e
// montar/entrada.js entregam em recursos.diagramas).
const DIAGRAMAS = `${CABECA}
<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="figura" id="bom"><h2>Bom</h2><figure class="diagrama"><script type="text/vnd.graphviz">digraph { a -> b; }</script></figure><aside class="notas">N.</aside></section>
<section data-layout="figura" id="ruim"><h2>Ruim</h2><figure class="diagrama"><script type="text/vnd.graphviz">digraph { a -> }</script></figure><aside class="notas">N.</aside></section>
<section data-layout="figura" id="grande"><h2>Grande</h2><figure class="diagrama"><script type="text/vnd.graphviz">…</script></figure><aside class="notas">N.</aside></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

test('recursos.dot e recursos.diagrama-grande leem recursos.diagramas: erro com a mensagem do Graphviz, aviso acima do limite do contrato', () => {
  const { document } = parseHTML(DIAGRAMAS);
  const [bom, ruim, grande] = document.querySelectorAll('figure.diagrama');
  const limite = contrato.limites['diagrama.nos'];
  const recursos = { diagramas: [
    { figura: bom, trecho: 'digraph { a -> b; }', nos: 2 },
    { figura: ruim, trecho: 'digraph { a -> }', mensagem: "o Graphviz não compila o DOT: syntax error in line 1 near '}'" },
    { figura: grande, trecho: '…', nos: limite + 1 },
  ] };
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos, fase: 2 });
  assert.deepEqual(achados.map((achado) => [achado.regra, achado.slide, achado.id, achado.severidade]),
    [['recursos.dot', 3, 'ruim', 'erro'], ['recursos.diagrama-grande', 4, 'grande', 'aviso']]);
  assert.equal(achados[0].mensagem, "diagrama que não desenha: o Graphviz não compila o DOT: syntax error in line 1 near '}'.");
  assert.equal(achados[0].acao, 'Corrija o DOT do diagrama.');
  assert.equal(achados[1].mensagem, `diagrama com ${limite + 1} nós; o limite é ${limite}.`);
});

test('recursos.diagrama-grande: exatamente o limite não avisa, um a mais avisa', () => {
  const limite = contrato.limites['diagrama.nos'];
  for (const [nos, esperado] of [[limite, 0], [limite + 1, 1]]) {
    const { document } = parseHTML(DIAGRAMAS);
    const recursos = { diagramas: [{ figura: document.querySelector('figure.diagrama'), trecho: '…', nos }] };
    const achados = validar(document, { contrato, regras, grupo: 'carga', recursos, fase: 2 });
    assert.equal(achados.length, esperado, `${nos} nós`);
  }
});

test('as duas regras de diagrama são de fase 2: sob a fase 1 não rodam, nem com recursos', () => {
  const { document } = parseHTML(DIAGRAMAS);
  const recursos = { diagramas: [{ figura: document.querySelector('figure.diagrama'), trecho: 'x', mensagem: 'm' }] };
  assert.deepEqual(validar(document, { contrato, regras, grupo: 'carga', recursos, fase: 1 }), []);
});
