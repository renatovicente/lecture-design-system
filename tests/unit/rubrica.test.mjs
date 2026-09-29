// A rubrica do avaliador (spec docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md, seções 3.1
// e 3.2) contra a própria spec, critério a critério.
//
// O UNIVERSO desta guarda é a tabela ESPEC, logo abaixo, copiada à mão da spec e das decisões do plano
// (D1), e não o `avaliador/rubrica.json`: uma guarda que percorresse os critérios do JSON não veria um
// critério apagado dele, porque ele sairia junto do universo (a "sétima" do AGENTS.md). Por isso o
// conjunto de ids é comparado nos dois sentidos — falta um da spec, ou sobra um inventado, e cai.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rubrica = JSON.parse(readFileSync(new URL('../../avaliador/rubrica.json', import.meta.url), 'utf8'));

// Spec 3.1 (medidos) e 3.2 (julgados). `fonte` é a coluna "fonte" da spec, uma entrada por
// identificador; `nivel` é o nível máximo. Os julgados não têm nível na spec: segue a decisão da
// seção 2 — o que vem de N decide `alerta`, o que vem só de U, mais estrito, fica em `conselho`.
const ESPEC = {
  'titulo-rotulo': { fonte: ['N3'], tipo: 'medido', alcance: 'slide', nivel: 'alerta' },
  elementos: { fonte: ['N7'], tipo: 'medido', alcance: 'slide', nivel: 'alerta' },
  itens: { fonte: ['U'], tipo: 'medido', alcance: 'slide', nivel: 'conselho' },
  revelacao: { fonte: ['U'], tipo: 'medido', alcance: 'slide', nivel: 'conselho' },
  'so-texto': { fonte: ['N6', 'U'], tipo: 'medido', alcance: 'aula', nivel: 'alerta' },
  paineis: { fonte: ['N6'], tipo: 'medido', alcance: 'slide', nivel: 'conselho' },
  credito: { fonte: ['N5'], tipo: 'medido', alcance: 'slide', nivel: 'conselho' },
  tempo: { fonte: ['N2'], tipo: 'medido', alcance: 'aula', nivel: 'alerta' },
  'palavras-slide': { fonte: ['N4', 'N7'], tipo: 'medido', alcance: 'slide', nivel: 'conselho' },
  'uma-ideia': { fonte: ['N1'], tipo: 'julgado', alcance: 'slide', nivel: 'alerta' },
  'titulo-conclusao': { fonte: ['N3'], tipo: 'julgado', alcance: 'slide', nivel: 'alerta' },
  essencial: { fonte: ['N4'], tipo: 'julgado', alcance: 'slide', nivel: 'alerta' },
  'grafico-eficaz': { fonte: ['N6'], tipo: 'julgado', alcance: 'slide', nivel: 'alerta' },
  distraido: { fonte: ['N8'], tipo: 'julgado', alcance: 'slide', nivel: 'alerta' },
  redundancia: { fonte: ['U'], tipo: 'julgado', alcance: 'slide', nivel: 'conselho' },
  decorativa: { fonte: ['U'], tipo: 'julgado', alcance: 'slide', nivel: 'conselho' },
  fluxo: { fonte: ['N9'], tipo: 'julgado', alcance: 'aula', nivel: 'alerta' },
};

// Os limiares da decisão D1 do plano, e as listas que a D1 e a D3 mandam morar na rubrica.
const LIMIARES = {
  'palavras-slide': { maxPalavras: 60 },
  itens: { maxItens: 4 },
  elementos: { maxElementos: 6 },
  revelacao: { maxItensSemPasso: 3 },
  'so-texto': { maxFracao: 0.5 },
  tempo: { fatorMaximo: 1.2, minutosPorSlide: 1 },
  'titulo-rotulo': { maxPalavrasRotulo: 2 },
};

const ROTULOS = ['introdução', 'motivação', 'resultados', 'métodos', 'metodologia', 'discussão',
  'conclusão', 'conclusões', 'background', 'contexto', 'resumo', 'exemplo', 'exemplos'];
const MARCADORES_DE_CREDITO = ['Fonte', 'Adaptado de', 'Dados de', 'Crédito'];

test('a rubrica tem exatamente os 17 critérios da spec 3.1 e 3.2', () => {
  const daRubrica = Object.keys(rubrica.criterios).sort();
  const daSpec = Object.keys(ESPEC).sort();
  const faltam = daSpec.filter((id) => !daRubrica.includes(id));
  const sobram = daRubrica.filter((id) => !daSpec.includes(id));
  assert.deepEqual(faltam, [], `a rubrica não tem: ${faltam.join(', ')}`);
  assert.deepEqual(sobram, [], `a rubrica tem critério que a spec não tem: ${sobram.join(', ')}`);
  assert.equal(daSpec.length, 17);
});

for (const [id, esperado] of Object.entries(ESPEC)) {
  test(`critério ${id}: fonte, tipo, alcance e nível da spec`, () => {
    const criterio = rubrica.criterios[id];
    assert.ok(criterio, `a rubrica não tem o critério ${id}`);
    const { fonte, tipo, alcance, nivel } = criterio;
    assert.deepEqual({ fonte, tipo, alcance, nivel }, esperado, id);
  });
}

test('os limiares da decisão D1 estão na rubrica, com os valores do plano', () => {
  for (const [id, limiares] of Object.entries(LIMIARES)) {
    for (const [chave, valor] of Object.entries(limiares)) {
      assert.equal(rubrica.criterios[id]?.[chave], valor, `${id}.${chave}`);
    }
  }
});

test('os limiares ficam abaixo dos tetos do contrato: a avaliação é conselho sobre aula já válida', () => {
  const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
  assert.ok(rubrica.criterios['palavras-slide'].maxPalavras < contrato.limites['corpo.palavras']);
  assert.ok(rubrica.criterios.itens.maxItens < contrato.limites['lista.itens']);
});

test('as listas da D1, D2 e D3 moram na rubrica', () => {
  assert.deepEqual(rubrica.criterios['titulo-rotulo'].rotulos, ROTULOS);
  assert.deepEqual(rubrica.criterios['titulo-rotulo'].layouts, ['conteudo', 'figura', 'afirmacao']);
  assert.deepEqual(rubrica.criterios['so-texto'].layouts, ['conteudo']);
  assert.deepEqual(rubrica.criterios.tempo.layoutsSemTempo, ['capa', 'abertura', 'encerramento']);
  assert.deepEqual(rubrica.criterios.credito.marcadores, MARCADORES_DE_CREDITO);
  const ano = new RegExp(rubrica.criterios.credito.padraoAno);
  assert.ok(ano.test('Naegle (2021)') && ano.test('(1998)') && !ano.test('2021') && !ano.test('(2021a'));
});

test('nenhum critério tem nível erro: só o validador dá erro (spec 3.1)', () => {
  for (const [id, { nivel }] of Object.entries(rubrica.criterios)) {
    assert.ok(['alerta', 'conselho'].includes(nivel), `${id} tem nível ${nivel}`);
  }
});

test('todo medido tem ação para o autor; todo julgado tem a pergunta que a skill responde', () => {
  for (const [id, criterio] of Object.entries(rubrica.criterios)) {
    if (criterio.tipo === 'medido') assert.ok(criterio.acao?.trim(), `${id} (medido) sem acao`);
    else assert.ok(criterio.pergunta?.trim(), `${id} (julgado) sem pergunta`);
  }
});

test('as fontes citadas são as da spec 2, e todo identificador de critério aponta para uma delas', () => {
  assert.deepEqual(Object.keys(rubrica.fontes).sort(), ['N', 'U']);
  for (const [id, { fonte }] of Object.entries(rubrica.criterios)) {
    for (const identificador of fonte) {
      assert.match(identificador, /^(N([1-9]|10)|U)$/, `${id}: ${identificador}`);
    }
  }
});
