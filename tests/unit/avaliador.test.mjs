// Os critérios medidos do avaliador (spec 2026-09-28, 3.1 e 4.2), pelas fixtures de
// tests/fixtures/avaliador/<criterio>/ e pelo formato das linhas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerAula } from '../../build/validar.mjs';
import { avaliar, linhaDeAvaliacao, resumoDaAvaliacao, contarAvaliacao, CRITERIOS } from '../../avaliador/avaliar.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));
const rubrica = JSON.parse(readFileSync(new URL('avaliador/rubrica.json', RAIZ), 'utf8'));
const FIXTURES = new URL('tests/fixtures/avaliador/', RAIZ);

// O universo dos medidos, duplicado LITERALMENTE da tabela da spec 3.1 (a mesma que
// tests/unit/rubrica.test.mjs copia): não sai da rubrica nem do registro do avaliador, para que um
// critério apagado de um dos dois não saia junto do universo da guarda (a "sétima" do AGENTS.md).
const MEDIDOS_DA_SPEC = ['titulo-rotulo', 'elementos', 'itens', 'revelacao', 'so-texto', 'paineis', 'credito',
  'tempo', 'palavras-slide'];

// O critério `tempo` só mede com a duração da aula. As fixtures dele têm 2 (bom) e 3 (ruim) slides que
// tomam tempo; com 2 minutos, o teto é 2,4.
const MINUTOS = { tempo: 2 };

const ler = (nome, arquivo) => lerAula(fileURLToPath(new URL(`${nome}/${arquivo}`, FIXTURES)), contrato);
const avaliarFixture = (nome, arquivo, opcoes = {}) => avaliar(ler(nome, arquivo), { rubrica, contrato, minutos: MINUTOS[nome], ...opcoes });

for (const nome of readdirSync(FIXTURES).sort()) {
  test(`fixture do avaliador: ${nome}`, () => {
    const bom = avaliarFixture(nome, 'bom.html');
    assert.deepEqual(bom.map((achado) => `${achado.criterio}: ${achado.mensagem}`), [], `${nome}/bom.html tem achados`);
    const ruim = avaliarFixture(nome, 'ruim.html').filter((achado) => achado.criterio === nome);
    assert.equal(ruim.length, 1, `${nome}/ruim.html devia ter exatamente um achado de ${nome}: ${JSON.stringify(ruim)}`);
    assert.equal(ruim[0].nivel, rubrica.criterios[nome].nivel);
    assert.equal(ruim[0].acao, rubrica.criterios[nome].acao);
  });
}

test('todo critério medido da spec tem implementação, fixture e entrada na rubrica', () => {
  for (const id of MEDIDOS_DA_SPEC) {
    assert.ok(CRITERIOS[id], `${id} sem implementação em avaliador/`);
    assert.equal(rubrica.criterios[id]?.tipo, 'medido', `${id} não é medido na rubrica`);
    assert.equal(CRITERIOS[id].alcance, rubrica.criterios[id].alcance, `${id}: alcance da implementação ≠ da rubrica`);
    assert.ok(existsSync(new URL(`${id}/ruim.html`, FIXTURES)) && existsSync(new URL(`${id}/bom.html`, FIXTURES)), `${id} sem fixture`);
  }
  assert.deepEqual(Object.keys(CRITERIOS).sort(), [...MEDIDOS_DA_SPEC].sort(), 'o registro tem critério fora da spec');
});

test('um critério medido da rubrica sem implementação estoura, em vez de sumir calado', () => {
  const comInventado = structuredClone(rubrica);
  comInventado.criterios['cores-demais'] = { fonte: ['U'], tipo: 'medido', alcance: 'slide', nivel: 'conselho', acao: 'x' };
  assert.throws(() => avaliar(ler('itens', 'bom.html'), { rubrica: comInventado, contrato }), /cores-demais/);
});

test('o achado tem o formato da interface do plano, e nunca nível erro', () => {
  const [achado] = avaliarFixture('titulo-rotulo', 'ruim.html');
  assert.deepEqual(Object.keys(achado).sort(), ['acao', 'criterio', 'fonte', 'id', 'mensagem', 'nivel', 'slide', 'tipo', 'trecho']);
  assert.equal(achado.slide, 5);
  assert.equal(achado.id, 'desvio');
  assert.equal(achado.tipo, 'medido');
  assert.equal(achado.fonte, 'N3');
  for (const nome of readdirSync(FIXTURES)) {
    for (const um of avaliarFixture(nome, 'ruim.html')) assert.ok(['alerta', 'conselho'].includes(um.nivel));
  }
});

test('linhaDeAvaliacao segue o desenho das linhas do validador', () => {
  const [achado] = avaliarFixture('titulo-rotulo', 'ruim.html');
  assert.equal(
    linhaDeAvaliacao(achado),
    `ALERTA · slide 5 #desvio · titulo-rotulo (N3) · ${achado.mensagem} ${rubrica.criterios['titulo-rotulo'].acao}\n    ${achado.trecho}`,
  );
  const [daAula] = avaliarFixture('so-texto', 'ruim.html');
  assert.ok(linhaDeAvaliacao(daAula).startsWith('ALERTA · aula · so-texto (N6, U) · '));
  const [conselho] = avaliarFixture('itens', 'ruim.html');
  assert.ok(linhaDeAvaliacao(conselho).startsWith('CONSELHO · slide 5 #desvio · itens (U) · '));
});

test('o resumo tem uma linha por critério medido, com alertas e conselhos', () => {
  const achados = [...avaliarFixture('titulo-rotulo', 'ruim.html'), ...avaliarFixture('itens', 'ruim.html')];
  const resumo = resumoDaAvaliacao(achados, rubrica);
  const linhas = resumo.split('\n');
  assert.equal(linhas[0], 'Avaliação Aula USP: 1 alerta, 1 conselho');
  assert.equal(linhas.length, 1 + MEDIDOS_DA_SPEC.length);
  assert.ok(linhas.includes('  titulo-rotulo (N3) · 1 alerta, 0 conselhos'), resumo);
  assert.ok(linhas.includes('  itens (U) · 0 alertas, 1 conselho'), resumo);
  assert.ok(linhas.includes('  tempo (N2) · 0 alertas, 0 conselhos'), resumo);
  const contagem = contarAvaliacao(achados, rubrica);
  assert.deepEqual(contagem.total, { alertas: 1, conselhos: 1 });
  assert.deepEqual(contagem.criterios['titulo-rotulo'], { alertas: 1, conselhos: 0 });
});

test('--slide por número e por id avalia só aquele slide, sem os critérios de aula', () => {
  const ruim = ler('so-texto', 'ruim.html');
  assert.ok(avaliar(ruim, { rubrica, contrato }).some((achado) => achado.criterio === 'so-texto'));
  assert.deepEqual(avaliar(ler('so-texto', 'ruim.html'), { rubrica, contrato, slide: 5 }), []);
  const porNumero = avaliar(ler('titulo-rotulo', 'ruim.html'), { rubrica, contrato, slide: 5 });
  const porTexto = avaliar(ler('titulo-rotulo', 'ruim.html'), { rubrica, contrato, slide: '5' });
  const porId = avaliar(ler('titulo-rotulo', 'ruim.html'), { rubrica, contrato, slide: 'desvio' });
  assert.equal(porNumero.length, 1);
  assert.deepEqual(porTexto, porNumero);
  assert.deepEqual(porId, porNumero);
  assert.deepEqual(avaliar(ler('titulo-rotulo', 'ruim.html'), { rubrica, contrato, slide: 3 }), []);
  assert.deepEqual(avaliar(ler('tempo', 'ruim.html'), { rubrica, contrato, minutos: 2, slide: 'desvio' }), []);
});

test('--slide que não existe na aula estoura com a mensagem para o autor', () => {
  assert.throws(() => avaliar(ler('itens', 'bom.html'), { rubrica, contrato, slide: 'nao-existe' }), /não há slide "nao-existe"/);
  assert.throws(() => avaliar(ler('itens', 'bom.html'), { rubrica, contrato, slide: 40 }), /não há slide "40"/);
});

test('sem minutos, tempo não mede', () => {
  assert.deepEqual(avaliar(ler('tempo', 'ruim.html'), { rubrica, contrato }).filter((a) => a.criterio === 'tempo'), []);
});

test('titulo-rotulo reconhece o rótulo da lista, ignorando caixa e pontuação', () => {
  const doc = ler('titulo-rotulo', 'bom.html');
  doc.querySelector('#desvio h2').innerHTML = 'Resultados principais do modelo:';
  assert.deepEqual(avaliar(doc, { rubrica, contrato }).map((a) => a.criterio), []);
  doc.querySelector('#desvio h2').innerHTML = 'RESULTADOS.';
  assert.deepEqual(avaliar(doc, { rubrica, contrato }).map((a) => a.criterio), ['titulo-rotulo']);
});

test('palavras-slide não conta notas, título, TeX, código nem o JSON de um gráfico', () => {
  const doc = ler('palavras-slide', 'bom.html');
  const secao = doc.querySelector('#desvio');
  const muitas = Array.from({ length: 80 }, () => 'palavra').join(' ');
  secao.querySelector('aside.notas').textContent = muitas;
  secao.querySelector('h2').textContent = 'um título qualquer';
  secao.insertAdjacentHTML('beforeend', `<pre data-lang="python">${muitas}</pre>`);
  secao.insertAdjacentHTML('beforeend', `<p>\\( ${muitas} \\)</p>`);
  secao.insertAdjacentHTML('beforeend', `<figure class="grafico"><script type="application/json">{"a": "${muitas}"}</script></figure>`);
  assert.deepEqual(avaliar(doc, { rubrica, contrato }).filter((a) => a.criterio === 'palavras-slide'), []);
});

// O aceite do marco (tests/aceite/avaliar.md) pede "nenhuma falsa grave no exemplo": as duas
// aulas-exemplo são aulas boas, escritas no estilo do autor, e um ALERTA nelas é a rubrica errando.
// Medido na revisão da 1.1.0: com so-texto contando só `conteudo` e sem a matemática em linha, a
// regressao-linear (gráfico, diagrama e demo) levava alerta de "só texto", e a descida-do-gradiente
// também (#derivacao, toda em matemática em linha). Conselhos continuam permitidos aqui.
for (const aula of ['exemplos/descida-do-gradiente/index.html', 'exemplos/regressao-linear/index.html']) {
  test(`${aula}: nenhum alerta da rubrica numa aula-exemplo`, () => {
    const doc = lerAula(fileURLToPath(new URL(aula, RAIZ)), contrato);
    const alertas = avaliar(doc, { rubrica, contrato }).filter((achado) => achado.nivel === 'alerta');
    assert.deepEqual(alertas.map(linhaDeAvaliacao), []);
  });
}
