import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lerTokens, simplificar } from '../../build/tokens.mjs';

const contrato = JSON.parse(await readFile(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const tokens = simplificar(await lerTokens());

test('sete layouts com os obrigatórios da spec (5.3)', () => {
  assert.deepEqual(Object.keys(contrato.layouts).sort(),
    ['abertura', 'afirmacao', 'capa', 'conteudo', 'demo', 'encerramento', 'figura']);
  const obrigatorios = (nome) => contrato.layouts[nome].sequencia
    .filter((i) => i.seletor && i.min > 0).map((i) => i.seletor);
  assert.deepEqual(obrigatorios('capa'), ['h1']);
  assert.deepEqual(obrigatorios('abertura'), ['h2']);
  assert.deepEqual(obrigatorios('conteudo'), ['h2']);
  assert.deepEqual(obrigatorios('afirmacao'), ['p.afirmacao']);
  assert.deepEqual(obrigatorios('figura'), ['figure']);
  assert.deepEqual(obrigatorios('demo'), ['h2', 'div.demo']);
  assert.deepEqual(obrigatorios('encerramento'), ['h2', 'ol.sintese']);
  const alternativa = contrato.layouts.conteudo.sequencia.find((i) => i.umDe);
  assert.deepEqual(alternativa.umDe.map((ramo) => ramo[0].seletor ?? ramo[0].grupo), ['div.colunas', 'blocosDeCorpo']);
  assert.equal(alternativa.umDe[1][0].min, 1);
  assert.deepEqual(contrato.sempreOpcional, ['aside.notas']);
});

test('blocos de corpo, grades e filhos (5.3)', () => {
  assert.deepEqual(contrato.blocosDeCorpo, ['p', 'ul', 'ol.passos', 'aside.destaque', 'aside.quadro',
    'aside.alerta', 'div.exercicio', 'table', 'pre', 'figure', 'tex-destaque']);
  assert.deepEqual(contrato.blocosDeCorpoFase2, ['figure.grafico', 'figure.diagrama']);
  assert.deepEqual(contrato.grades, { '12': 1, '6-6': 2, '8-4': 2, '4-8': 2, '4-4-4': 3 });
  assert.deepEqual(contrato.filhos.figure, { exatamenteUmDe: ['img', 'svg'], opcionais: ['figcaption'] });
  assert.deepEqual(contrato.filhos['div.demo'], { opcionais: ['img.estatico'] });
});

test('metadados (5.2)', () => {
  assert.deepEqual(contrato.metadados, {
    unidade: { obrigatorio: true, tipo: 'unidade' },
    disciplina: { obrigatorio: true, tipo: 'texto', max: 60 },
    aula: { obrigatorio: true, tipo: 'texto', max: 12 },
    data: { obrigatorio: true, tipo: 'data-iso' },
    professor: { obrigatorio: true, tipo: 'texto', max: 40 },
  });
  assert.deepEqual(contrato.idiomas, ['pt-BR', 'en']);
});

test('limites da seção 5.3', () => {
  assert.deepEqual(contrato.limites, {
    'capa.h1.caracteresPorSegmento': 23, 'capa.h1.segmentos': 2, 'capa.h1.linhas': 2,
    'abertura.h2.caracteresPorSegmento': 20, 'abertura.h2.segmentos': 2, 'abertura.h2.linhas': 2,
    'abertura.dataCurto.caracteres': 10, 'abertura.h2.caracteresSemDataCurto': 10,
    'pergunta.caracteres': 90,
    'titulo.caracteresPorSegmento': 50, 'titulo.segmentos': 2, 'titulo.linhas': 2,
    'lide.caracteres': 120, 'corpo.palavras': 90, 'coluna.palavras': 60, 'lista.itens': 5,
    'destaque.maxPorSlide': 2, 'alerta.maxPorSlide': 1, 'rotulo.caracteres': 24,
    'afirmacao.caracteres': 120, 'fonte.caracteres': 80, 'legenda.caracteres': 140,
    'sintese.itens': 3, 'sintese.caracteresPorItem': 80, 'proxima.caracteres': 90,
    'codigo.linhas': 16, 'codigo.colunas': 64, 'tabela.linhasDeDados': 8, 'tabela.colunas': 6,
    'diagrama.nos': 15,
  });
});

test('regras da seção 9.2: ids, severidade, grupo e fase', () => {
  const E = 'erro', A = 'aviso', est = 'estatica', car = 'carga', comp = 'composicao', sai = 'saida';
  const ESPERADO = {
    'estrutura.primeiro-slide': [E, est, 1], 'estrutura.ultimo-slide': [E, est, 1],
    'estrutura.layout': [E, est, 1], 'estrutura.metadados': [E, est, 1],
    'estrutura.obrigatorio': [E, est, 1], 'estrutura.fora-do-layout': [E, est, 1],
    'estrutura.colunas': [E, est, 1], 'estrutura.blocos': [A, est, 1],
    'estrutura.id-duplicado': [E, est, 1], 'estrutura.id-ausente': [A, est, 1],
    'estrutura.nome-curto': [E, est, 1], 'estrutura.passos-mistos': [E, est, 1],
    'estrutura.notas-ausentes': [A, est, 1],
    'vocabulario.elemento': [E, est, 1], 'vocabulario.classe': [E, est, 1],
    'vocabulario.atributo': [E, est, 1], 'vocabulario.style': [E, est, 1],
    'vocabulario.cor-svg': [E, est, 1], 'vocabulario.amarelo-svg': [E, est, 1],
    'vocabulario.azul-svg': [E, est, 1], 'vocabulario.script': [E, est, 1],
    'limites.titulo': [E, est, 1], 'limites.segmentos-titulo': [E, est, 1],
    'limites.nome-curto': [E, est, 1], 'limites.pergunta': [E, est, 1], 'limites.lide': [E, est, 1],
    'limites.palavras-corpo': [E, est, 1], 'limites.palavras-coluna': [E, est, 1],
    'limites.itens': [E, est, 1], 'limites.destaques': [E, est, 1], 'limites.alertas': [E, est, 1],
    'limites.rotulo': [E, est, 1], 'limites.afirmacao': [E, est, 1], 'limites.fonte': [E, est, 1],
    'limites.legenda': [E, est, 1], 'limites.sintese': [E, est, 1], 'limites.proxima': [E, est, 1],
    'limites.codigo-linhas': [E, est, 1], 'limites.codigo-colunas': [E, est, 1],
    'limites.tabela': [E, est, 1], 'limites.metadado': [E, est, 1],
    'composicao.transbordo': [E, comp, 1], 'composicao.linhas-titulo': [E, comp, 1],
    'composicao.tamanho-minimo': [E, comp, 1], 'composicao.azul-pequeno': [E, comp, 1],
    'composicao.texto-no-amarelo': [E, comp, 1],
    'matematica.tex-invalido': [E, car, 1], 'matematica.comando-proibido': [E, est, 1],
    'matematica.simbolo-fora-do-tex': [E, est, 1], 'matematica.cifrao-suspeito': [A, est, 1],
    'recursos.imagem': [E, car, 1], 'recursos.imagem-externa': [A, est, 1], 'recursos.alt': [E, est, 1],
    'recursos.demo-sem-registro': [E, car, 1], 'recursos.demo-sem-estatico': [A, car, 1],
    'recursos.linguagem': [E, est, 1], 'recursos.csv': [E, car, 2], 'recursos.grafico': [E, est, 2],
    'recursos.dot': [E, car, 2], 'recursos.diagrama-grande': [A, car, 2],
    'saida.referencia-externa': [E, sai, 1], 'saida.tamanho': [A, sai, 1],
    'saida.glifo-ausente': [E, sai, 1], 'saida.pdf-paginas': [E, sai, 1],
  };
  assert.equal(Object.keys(ESPERADO).length, 64);
  assert.deepEqual(Object.keys(contrato.regras).sort(), Object.keys(ESPERADO).sort());
  for (const [id, [severidade, grupo, fase]] of Object.entries(ESPERADO)) {
    const r = contrato.regras[id];
    assert.deepEqual([r.severidade, r.grupo, r.fase], [severidade, grupo, fase], id);
    assert.match(r.acao, /^\S.*\.$/, `ação de ${id} deve ser uma frase terminada em ponto`);
  }
});

test('cores de SVG são as dos tokens, mais none', () => {
  assert.deepEqual([...contrato.svg.cores].sort(), [...Object.values(tokens.cor), 'none'].sort());
});

test('papéis usam os mínimos dos tokens e têm as exceções da spec (4.3)', () => {
  for (const papel of ['leitura', 'codigo', 'legenda', 'rotulo'])
    assert.equal(contrato.papeis[papel].minimo, tokens.minimo[papel], papel);
  assert.deepEqual(contrato.papeis.excecoes,
    ['.katex *', 'sub', 'sup', 'svg *', '.demo *', '.painel *', '.faixa-de-marca *']);
});

test('classes do autor e do sistema não se misturam', () => {
  const autor = [...Object.keys(contrato.html.classes), ...contrato.svg.classes];
  assert.deepEqual(autor.filter((c) => contrato.classesDoSistema.includes(c)), []);
});

test('proibidos e TeX (5.5 e 6.4)', () => {
  assert.ok(contrato.proibidos.atributos.includes('style'));
  assert.ok(contrato.proibidos.elementos.includes('style'));
  assert.deepEqual(contrato.proibidos.prefixosDeAtributo, ['on']);
  assert.deepEqual(contrato.proibidos.comandosTex,
    ['\\color', '\\textcolor', '\\colorbox', '\\fcolorbox', '\\htmlStyle', '\\htmlClass', '\\htmlId', '\\htmlData']);
  assert.equal(contrato.tex.macros['\\passo'], '\\htmlData{passo=#1}{#2}');
  assert.deepEqual(contrato.tex.inline, ['\\(', '\\)']);
  assert.deepEqual(contrato.tex.destaque, ['\\[', '\\]']);
  assert.deepEqual(contrato.tex.trust, ['\\htmlData']);
});

test('linguagens de código coincidem com os valores de data-lang', () => {
  assert.deepEqual(contrato.linguagens, ['python', 'r', 'sql', 'javascript', 'bash', 'json', 'latex']);
  assert.deepEqual(contrato.html.atributos.pre['data-lang'].valores, contrato.linguagens);
});

test('padrões de atributo compilam e aceitam o que devem', () => {
  const padroes = [contrato.svg.hrefPadrao];
  for (const porElemento of Object.values(contrato.html.atributos))
    for (const regra of Object.values(porElemento)) if (regra.padrao) padroes.push(regra.padrao);
  for (const p of padroes) assert.doesNotThrow(() => new RegExp(p), p);
  const passo = new RegExp(contrato.html.atributos['*']['data-passo'].padrao);
  assert.ok(passo.test('') && passo.test('3') && passo.test('12'));
  assert.ok(!passo.test('0') && !passo.test('a'));
  const linhas = new RegExp(contrato.html.atributos.pre['data-linhas'].padrao);
  assert.ok(linhas.test('3-5,8') && linhas.test('7'));
  assert.ok(!linhas.test('3-') && !linhas.test('a'));
  const src = new RegExp(contrato.html.atributos.img.src.padrao);
  assert.ok(src.test('img/cajal.jpg') && src.test('data:image/png;base64,AAA') && src.test('https://x.org/a.png'));
  assert.ok(!src.test('../fora.png') && !src.test('http://x.org/a.png'));
});
