import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { lerTokens, simplificar } from '../../build/tokens.mjs';
import { validar } from '../../validador/validar.js';
import { regras as regrasDeLimite } from '../../validador/regras/limites.js';
import { REGRAS_ESTATICAS } from '../../validador/regras/index.js';

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
  // Spec 5.5, literal: "na fase 2, também script com type="application/json" dentro de
  // figure.grafico ou com type="text/vnd.graphviz" dentro de figure.diagrama" — o tipo é pareado
  // ao pai, não uma lista solta de tipos aceitos em qualquer um dos dois. Sem esta guarda, uma
  // mudança que igualasse as duas chaves (ou trocasse o seletor por um "script" sem o atributo)
  // passaria muda aqui e só apareceria no comportamento do validador.
  assert.deepEqual(contrato.filhos['figure.grafico'],
    { exatamenteUmDe: ['script[type="application/json"]'], opcionais: ['figcaption'], fase: 2 });
  assert.deepEqual(contrato.filhos['figure.diagrama'],
    { exatamenteUmDe: ['script[type="text/vnd.graphviz"]'], opcionais: ['figcaption'], fase: 2 });
  assert.deepEqual(contrato.filhos['div.demo'], { opcionais: ['img.estatico'] });
});

test('metadados (5.2)', () => {
  assert.deepEqual(contrato.metadados, {
    unidade: { obrigatorio: true, tipo: 'unidade' },
    disciplina: { obrigatorio: true, tipo: 'texto', max: 60 },
    aula: { obrigatorio: true, tipo: 'texto', max: 12 },
    data: { obrigatorio: true, tipo: 'data-iso' },
    professor: { obrigatorio: true, tipo: 'texto', max: 40 },
    // 1.0.1: o canto do vídeo do ministrante, opcional e de fase 2 (spec 5.2).
    video: { obrigatorio: false, tipo: 'valor', valores: ['canto'], fase: 2 },
  });
  assert.deepEqual(contrato.idiomas, ['pt-BR', 'en']);
});

test('limites da seção 5.3', () => {
  assert.deepEqual(contrato.limites, {
    'blocos.min': 2, 'blocos.maxFileira': 8,
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
    'diagrama.nos': 15, 'grafico.series': 3, 'saida.megabytes': 10,
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
    'composicao.texto-no-amarelo': [E, comp, 1], 'composicao.canto-video': [E, comp, 2],
    'matematica.tex-invalido': [E, car, 1], 'matematica.comando-proibido': [E, est, 1],
    'matematica.simbolo-fora-do-tex': [E, est, 1], 'matematica.cifrao-suspeito': [A, est, 1],
    'recursos.imagem': [E, car, 1], 'recursos.imagem-externa': [A, est, 1], 'recursos.alt': [E, est, 1],
    'recursos.demo-sem-registro': [E, car, 1], 'recursos.demo-sem-estatico': [A, car, 1],
    'recursos.linguagem': [E, est, 1], 'recursos.csv': [E, car, 2], 'recursos.grafico': [E, est, 2],
    'recursos.dot': [E, car, 2], 'recursos.diagrama-grande': [A, car, 2],
    'saida.referencia-externa': [E, sai, 1], 'saida.tamanho': [A, sai, 1],
    'saida.glifo-ausente': [E, sai, 1], 'saida.pdf-paginas': [E, sai, 1],
  };
  assert.equal(Object.keys(ESPERADO).length, 65);
  assert.deepEqual(Object.keys(contrato.regras).sort(), Object.keys(ESPERADO).sort());
  for (const [id, [severidade, grupo, fase]] of Object.entries(ESPERADO)) {
    const r = contrato.regras[id];
    assert.deepEqual([r.severidade, r.grupo, r.fase], [severidade, grupo, fase], id);
    assert.match(r.acao, /^\S.*\.$/, `ação de ${id} deve ser uma frase terminada em ponto`);
  }
});

// Uma aula com um slide de cada layout do contrato, para que as regras que escolhem a chave do
// limite PELO LAYOUT leiam as três variantes: `limites.titulo` mede 23 na capa, 20 na abertura e 50
// nos demais, e num documento só de `conteudo` ele leria uma chave só. A lista de layouts vem do
// contrato — um layout novo entra aqui sozinho. `h1` e `h2` juntos em toda seção porque quem escolhe
// entre os dois é a regra, pelo layout, e o que sobrar é ignorado por ela.
const AULA_DE_TODOS_OS_LAYOUTS = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-21"><meta name="professor" content="Prof.">
</head><body>${Object.keys(contrato.layouts)
  .map((layout) => `<section data-layout="${layout}" id="s-${layout}"><h1>t</h1><h2>t</h2></section>`)
  .join('')}</body></html>`;

// Que limites uma regra usa, MEDIDO e não escrito: um espião no lugar de contrato.limites anota toda
// chave lida enquanto a regra roda. É por isso que uma regra que passe a ler outra chave cai nesta
// guarda sem ninguém acrescentar nada — ao contrário de um mapa regra→limite escrito aqui, que
// envelheceria calado, que é a doença que este plano inteiro trata.
function limitesLidosPor(regra, doc) {
  const lidas = new Set();
  const espiao = {
    ...contrato,
    limites: new Proxy(contrato.limites, {
      get(alvo, chave) {
        if (typeof chave === 'string' && chave in alvo) lidas.add(chave);
        return alvo[chave];
      },
    }),
  };
  const { grupo, fase } = contrato.regras[regra.nome];
  validar(doc, { contrato: espiao, regras: [regra], grupo, fase });
  return lidas;
}

const numerosDe = (texto) => new Set((texto.match(/[0-9]+/g) ?? []).map(Number));

// O defeito que o aceite do marco 7 pagou. O `acao` é a frase que o validador imprime depois da
// mensagem, e é ela que diz ao autor o que fazer — um número errado ali manda para o lugar errado
// com a autoridade do sistema.
//
// A propriedade: o `acao` de uma regra `limites.*` cita TODOS os números que a regra usa, ou NENHUM.
// "Todos ou nenhum", e não "algum número do contrato", porque citar um só é justamente o defeito:
// `limites.titulo` mede três limites diferentes, e um `acao` que dissesse "encurte para até 50
// caracteres" seria verdadeiro num terço dos slides e falso nos outros dois — 50 é o número do `h2`,
// e é ele que o guia mostrava quando o agente foi procurar o da capa, que é 23.
//
// Um número no `acao` que não seja limite nenhum também cai aqui, e é correto que caia: numa frase
// que já traz medidas, um número solto se lê como medida.
// E o escopo é toda regra que LÊ contrato.limites, não as de `limites.js`. A diferença é medida,
// não teórica: `estrutura.blocos` cita `blocos.min` e `blocos.maxFileira` no `acao`, e
// `estrutura.nome-curto` cita `abertura.h2.caracteresSemDataCurto` — as duas corretas hoje, as duas
// fora de `limites.js` e, até aqui, fora de qualquer guarda, expostas exatamente ao defeito que o
// aceite do marco 7 pagou. Quem decide o escopo é o próprio espião: uma regra entra na conferência
// porque foi vista lendo um limite, e não porque está num arquivo com o nome certo. O filtro por
// arquivo era a única coisa no caminho.
//
// Ficam fora, e é registro, não proposta: `vocabulario.amarelo-svg` (4 px) e
// `vocabulario.azul-svg`/`composicao.azul-pequeno` (32 px) citam números que são CONSTANTES no
// fonte da regra e não estão no contrato — o espião não tem o que anotar ali —, e
// `recursos.diagrama-grande` (15), que lê o limite mas é do grupo de carga, fora das estáticas que
// este espião roda; o acao dela cita o 15, conferido à mão na fase 2b.
test('o acao de cada regra que lê um limite cita os números que ela usa, ou nenhum', () => {
  const { document } = parseHTML(AULA_DE_TODOS_OS_LAYOUTS);
  const noContrato = REGRAS_ESTATICAS.filter((regra) => contrato.regras[regra.nome]);
  assert.equal(noContrato.length, REGRAS_ESTATICAS.length, 'há regra estática fora do contrato');
  const daRegra = noContrato.filter((regra) => limitesLidosPor(regra, document).size > 0);
  assert.ok(daRegra.length > 0, 'nenhuma regra foi vista lendo um limite — o espião parou de anotar');
  // Piso de cobertura, medido nesta árvore: **21** regras leem `contrato.limites` — 19 das 20 de
  // `limites.js` mais `estrutura.blocos` e `estrutura.nome-curto`. (A vigésima, `limites.metadado`,
  // lê `contrato.metadados`, e está em `limites.js` pelo nome, não pela fonte do número.) Sem este
  // piso, um espião que parasse de anotar numa regra só a tiraria da conferência em silêncio, e o
  // laço abaixo nunca a visitaria.
  assert.ok(daRegra.length >= 18, `só ${daRegra.length} regras foram vistas lendo limite — o espião perdeu leitura`);
  // E o escopo é maior que `limites.js`, que é o achado que trouxe esta linha para cá. Sem esta
  // asserção, um filtro que voltasse a ser por arquivo passaria daqui sem ninguém notar.
  assert.ok(
    daRegra.some((regra) => !regra.nome.startsWith('limites.')),
    'só regras limites.* leem contrato.limites — as de estrutura.* que citam números do contrato no'
      + ' acao pararam de lê-lo, e o número que elas imprimem voltou a ser digitado em algum lugar',
  );

  let comNumero = 0;
  let comMaisDeUmLimite = 0;
  for (const regra of daRegra) {
    const lidas = limitesLidosPor(regra, document);
    const usados = new Set([...lidas].map((chave) => contrato.limites[chave]));
    const citados = numerosDe(contrato.regras[regra.nome].acao);
    if (citados.size > 0) comNumero += 1;
    if (usados.size > 1) comMaisDeUmLimite += 1;
    if (citados.size === 0) continue;
    assert.deepEqual(
      [...citados].sort((a, b) => a - b),
      [...usados].sort((a, b) => a - b),
      `${regra.nome}: o acao cita ${[...citados].join(', ')} e a regra mede ${[...lidas].join(', ')}`
        + ` = ${[...usados].join(', ')} — cite todos os números que ela mede, ou nenhum`,
    );
  }
  // Sem as duas linhas abaixo a guarda passaria com um espião que não anota nada e com `acao` nenhum
  // trazendo número: o laço inteiro cairia no `continue` e não asseveraria uma vez sequer.
  assert.ok(comNumero > 0, 'nenhum acao cita número — a leitura dos números virou decoração');
  assert.ok(comMaisDeUmLimite > 0, 'nenhuma regra mediu mais de um limite — o espião parou de anotar');
});

test('cores de SVG são as dos tokens, mais none', () => {
  assert.deepEqual([...contrato.svg.cores].sort(), [...Object.values(tokens.cor), 'none'].sort());
});

test('papéis usam os mínimos dos tokens e têm as exceções da spec (4.3)', () => {
  for (const papel of ['leitura', 'codigo', 'legenda', 'rotulo'])
    assert.equal(contrato.papeis[papel].minimo, tokens.minimo[papel], papel);
  assert.deepEqual(contrato.papeis.excecoes,
    ['.katex *', 'sub', 'sup', '.demo *', '.painel *', '.faixa-de-marca *', 'figcaption code', 'p.fonte code']);
  // Spec 4.3, desde o I3 da revisão final da 2a: texto de SVG é rótulo, medido no tamanho do palco.
  assert.ok(contrato.papeis.rotulo.seletores.includes('svg text'));
  // Pendência 2 da fase 2a: <tspan font-size="…"> escapava do seletor "svg text".
  assert.ok(contrato.papeis.rotulo.seletores.includes('svg tspan'));
  // E a ação do achado de texto de SVG vem do contrato, uma frase como as outras.
  assert.match(contrato.regras['composicao.tamanho-minimo'].acaoSvg, /^\S.*\.$/);
  // I1 da revisão final da 2b: a figura que encolheu pela ALTURA tem outra saída, também do contrato.
  assert.match(contrato.regras['composicao.tamanho-minimo'].acaoSvgAltura, /^\S.*\.$/);
});

test('precedência de papéis e p.fonte só em legenda, não em leitura (F6)', () => {
  assert.equal(contrato.papeis.precedencia, 'seletor-mais-especifico');
  assert.ok(!contrato.papeis.leitura.seletores.includes('p'), '"p" genérico não deve estar em leitura');
  assert.ok(contrato.papeis.leitura.seletores.includes('p:not(.fonte)'));
  assert.ok(contrato.papeis.legenda.seletores.includes('p.fonte'));
});

test('atributos data-grade, data-demo/opcoes/captura-ms e data-rotulo restritos à classe (F6)', () => {
  const el = contrato.html.atributos;
  assert.ok(!('div' in el), '"div" genérico deveria ter sido removido (ficou vazio)');
  assert.ok(!('aside' in el), '"aside" genérico deveria ter sido removido (ficou vazio)');

  const temChave = (chave) => Object.keys(el).filter((tag) => chave in el[tag]);
  assert.deepEqual(temChave('data-grade'), ['div.colunas']);
  assert.deepEqual(temChave('data-demo').sort(), ['div.demo']);
  assert.deepEqual(temChave('data-opcoes').sort(), ['div.demo']);
  assert.deepEqual(temChave('data-captura-ms').sort(), ['div.demo']);
  assert.deepEqual(temChave('data-rotulo').sort(), ['aside.alerta', 'aside.destaque', 'aside.quadro']);
});

test('lang inline aceita padrão de código de idioma solto; idioma da página continua fixo (F6)', () => {
  const lang = new RegExp(contrato.html.atributos['*'].lang.padrao);
  for (const s of ['de', 'pt-BR', 'la']) assert.ok(lang.test(s), `deveria aceitar ${s}`);
  for (const s of ['portugues!', 'p']) assert.ok(!lang.test(s), `deveria rejeitar ${s}`);
  assert.deepEqual(contrato.idiomas, ['pt-BR', 'en']);
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
  for (const s of ['img/cajal.jpg', 'img/sub/a.png', 'img/..a.png', 'data:image/png;base64,AAA',
    'data:image/svg+xml,<svg/>', 'https://x.org/a.png']) assert.ok(src.test(s), `deveria aceitar ${s}`);
  for (const s of ['img/../x.png', 'img/a/../../b.png', 'img/%2e%2e/x.png', 'img/%2E%2E/x.png',
    'img/..', 'img/a\\b.png', 'data:text/html,<b>', 'http://x.org/a.png', '../fora.png'])
    assert.ok(!src.test(s), `deveria rejeitar ${s}`);

  const href = new RegExp(contrato.html.atributos.a.href.padrao);
  for (const s of ['#culpa', 'https://usp.br']) assert.ok(href.test(s), `deveria aceitar ${s}`);
  for (const s of ['http://usp.br', 'javascript:alert(1)', 'culpa']) assert.ok(!href.test(s), `deveria rejeitar ${s}`);
});
