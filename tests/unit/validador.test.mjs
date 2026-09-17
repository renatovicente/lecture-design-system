// Núcleo do validador (spec 9.1 e 9.3) e as regras de estrutura (spec 9.2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar, linhaDe, contar, cabecalhoDe, slidesDoFonte } from '../../validador/validar.js';
import { regras as estrutura } from '../../validador/regras/estrutura.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));
const unidades = JSON.parse(readFileSync(new URL('assets/marcas/unidades.json', RAIZ), 'utf8'));

// O mesmo molde das fixtures: o linkedom só enche document.body num documento inteiro.
const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>`;

const aula = (corpo) => `${CABECA}\n${corpo}\n</body></html>`;

const BASE = aula(`<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="abertura" id="bloco-um"><h2>Um</h2></section>
<section data-layout="conteudo" id="conteudo">
  <h2>Título</h2>
  <p class="lide">Lide.</p>
  <p>Corpo.</p>
  <aside class="notas">Notas.</aside>
</section>
<section data-layout="abertura" id="bloco-dois"><h2>Dois</h2></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>`);

function rodar(html, regras = estrutura) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras, grupo: 'estatica', unidades });
}

test('a aula de base não tem erro nenhum', () => {
  assert.deepEqual(rodar(BASE).filter((a) => a.severidade === 'erro'), []);
});

test('o achado sai no formato da spec 9.1', () => {
  const [achado] = rodar(BASE.replace('<h2>Um</h2>', '<h2>Retropropagação</h2>'))
    .filter((a) => a.regra === 'estrutura.nome-curto');
  assert.equal(achado.severidade, 'erro');
  assert.equal(achado.slide, 2);
  assert.equal(achado.id, 'bloco-um');
  assert.equal(achado.acao, contrato.regras['estrutura.nome-curto'].acao);
  assert.equal(
    linhaDe(achado),
    'ERRO · slide 2 #bloco-um · estrutura.nome-curto · abertura com título de 15 caracteres (máx. 10) e sem data-curto. '
    + 'Acrescente à abertura data-curto com até 10 caracteres.',
  );
});

test('achado que não é de um slide escreve "aula" no lugar do número', () => {
  const [achado] = rodar(BASE.replace('<meta name="professor" content="Prof.">', ''));
  assert.equal(achado.slide, null);
  assert.ok(linhaDe(achado).startsWith('ERRO · aula · estrutura.metadados · falta a meta "professor" no <head>.'));
});

test('o trecho entra numa segunda linha, recuado', () => {
  const linha = linhaDe({ severidade: 'aviso', slide: 3, id: null, regra: 'r', mensagem: 'm.', acao: 'a.', trecho: '<p>x</p>' });
  assert.equal(linha, 'AVISO · slide 3 · r · m. a.\n    <p>x</p>');
});

test('os achados saem em ordem de slide, e o da aula vem antes', () => {
  const achados = rodar(BASE.replace('content="2026-09-17"', 'content="17/09/2026"').replace('<h2>Um</h2>', '<h2>Retropropagação</h2>'));
  assert.deepEqual(achados.map((a) => a.slide), [null, 2]);
});

test('contar e cabecalhoDe usam singular e plural', () => {
  const achados = [{ severidade: 'erro' }, { severidade: 'aviso' }, { severidade: 'aviso' }];
  assert.deepEqual(contar(achados), { erros: 1, avisos: 2 });
  assert.equal(cabecalhoDe(achados), 'Validador Aula USP: 1 erro, 2 avisos');
  assert.equal(cabecalhoDe([]), 'Validador Aula USP: 0 erros, 0 avisos');
});

test('o slide do fonte é a section filha do corpo, com data-layout ou sem', () => {
  const { document } = parseHTML(aula('<section id="a"></section><div><section id="dentro"></section></div><section></section>'));
  assert.deepEqual(slidesDoFonte(document.body).map((s) => s.getAttribute('id')), ['a', null]);
});

test('uma regra de outro grupo não roda', () => {
  const marcada = [{ nome: 'composicao.transbordo', *aplicar() { yield { mensagem: 'não deveria rodar.' }; } }];
  assert.deepEqual(rodar(BASE, marcada), []);
});

const FIXTURES = new URL('tests/fixtures/validador/', RAIZ);
const IMPLEMENTADAS = new Map(estrutura.map((regra) => [regra.nome, regra]));

// Uma pasta por regra (spec 11.1): bom.html não acusa nada, ruim.html acusa a regra da pasta.
for (const nome of readdirSync(FIXTURES).sort()) {
  test(`fixture de ${nome}`, () => {
    const regra = IMPLEMENTADAS.get(nome);
    assert.ok(regra, `a pasta ${nome} não tem regra implementada`);
    const bom = rodar(readFileSync(new URL(`${nome}/bom.html`, FIXTURES), 'utf8'), [regra]);
    assert.deepEqual(bom, [], `bom.html de ${nome} acusou ${bom.map((a) => a.mensagem).join(' / ')}`);
    const ruim = rodar(readFileSync(new URL(`${nome}/ruim.html`, FIXTURES), 'utf8'), [regra]);
    assert.ok(ruim.length > 0, `ruim.html de ${nome} não acusou nada`);
    assert.ok(ruim.every((achado) => achado.regra === nome));
  });
}

test('toda regra implementada existe no contrato e tem fixture', () => {
  for (const regra of IMPLEMENTADAS.values()) {
    assert.ok(contrato.regras[regra.nome], `${regra.nome} não está no contrato`);
    assert.ok(existsSync(new URL(`${regra.nome}/ruim.html`, FIXTURES)), `${regra.nome} sem fixture`);
  }
});

test('toda regra de estrutura do contrato está implementada', () => {
  const doContrato = Object.entries(contrato.regras)
    .filter(([nome, regra]) => nome.startsWith('estrutura.') && regra.grupo === 'estatica' && regra.fase === 1)
    .map(([nome]) => nome);
  const faltando = doContrato.filter((nome) => !IMPLEMENTADAS.has(nome));
  // estrutura.obrigatorio e estrutura.fora-do-layout chegam na Task 2, com o casador de sequência.
  assert.deepEqual(faltando, ['estrutura.obrigatorio', 'estrutura.fora-do-layout']);
});
