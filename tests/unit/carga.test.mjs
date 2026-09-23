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

// Critical 1 da revisão final da 2a: faseDaAula põe na fase 2 uma aula com figure.diagrama, e isso
// abre a forma do diagrama para estrutura.* e vocabulario.* — mas nada desenha DOT ainda. Sem
// recursos.dot, o diagrama passava por validar e build com 0 erros e a figura saía vazia. A regra
// acusa todo diagrama, sem depender de recursos carregados (não há o que carregar), com gráfico na
// mesma aula ou sem.
test('recursos.dot recusa todo figure.diagrama na fase 2 e diz que diagrama ainda não está disponível', () => {
  const html = `${CABECA}
<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="figura" id="rede"><h2>Rede</h2><figure class="diagrama"><script type="text/vnd.graphviz">digraph { a -> b; }</script></figure><aside class="notas">N.</aside></section>
<section data-layout="figura" id="erro"><h2>Erro</h2><figure class="grafico"><script type="application/json">{"tipo":"linha","dados":{"a":[1,2],"b":[1,2]},"x":"a","y":["b"]}</script></figure><aside class="notas">N.</aside></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;
  for (const recursos of [undefined, {}]) {
    const { document } = parseHTML(html);
    const achados = validar(document, { contrato, regras, grupo: 'carga', recursos, fase: 2 });
    assert.deepEqual(achados.map((achado) => [achado.regra, achado.slide, achado.severidade]), [['recursos.dot', 2, 'erro']]);
    assert.match(achados[0].mensagem, /diagrama ainda não está disponível/);
  }
});
