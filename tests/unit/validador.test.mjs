// Núcleo do validador (spec 9.1 e 9.3) e as regras de estrutura (spec 9.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { validar, linhaDe, contar, cabecalhoDe, slidesDoFonte } from '../../validador/validar.js';
import { regras as estrutura } from '../../validador/regras/estrutura.js';
import { lerCobertura } from '../../validador/cobertura.js';
import { carregarNoNode } from '../../build/carregar.mjs';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));
const unidades = JSON.parse(readFileSync(new URL('assets/marcas/unidades.json', RAIZ), 'utf8'));
// matematica.simbolo-fora-do-tex precisa disto no contexto para rodar; sem ela, fica calada (por
// desenho) e a fixture de baixo (tests/fixtures/validador/matematica.simbolo-fora-do-tex) nunca
// acusaria nada — a mesma cobertura de verdade que build/validar.mjs carrega para a CLI.
const cobertura = lerCobertura(JSON.parse(readFileSync(new URL('validador/cobertura.json', RAIZ), 'utf8')));

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

function rodar(html, regras = estrutura, opcoes = {}) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras, grupo: 'estatica', unidades, cobertura, ...opcoes });
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

// Achado 1 da revisão: um \passo mostrado como exemplo dentro de <pre> não é matemática de verdade
// (a spec já exclui TeX de pre/code/script/style/svg da renderização); a regra não pode contá-lo como passo numerado.
test('\\passo dentro de <pre> é exemplo de sintaxe, não passo numerado de verdade', () => {
  const achados = rodar(aula(
    '<section data-layout="conteudo" id="a">\n'
    + '<p data-passo>Passo sem número.</p>\n'
    + '<pre data-lang="latex">Exemplo: \\[ \\passo{1}{x = 1} \\]</pre>\n'
    + '</section>',
  )).filter((a) => a.regra === 'estrutura.passos-mistos');
  assert.deepEqual(achados, []);
});

// Achado 2 da revisão: data-passo só com espaço não é um número; tem que continuar no balde "sem número".
test('data-passo só com espaço em branco continua sem número', () => {
  const achados = rodar(aula(
    '<section data-layout="conteudo" id="a">\n'
    + '<p data-passo=" ">Passo sem número, com espaço.</p>\n'
    + '<p data-passo="1">Passo numerado.</p>\n'
    + '</section>',
  )).filter((a) => a.regra === 'estrutura.passos-mistos');
  assert.equal(achados.length, 1);
  assert.equal(achados[0].mensagem, 'o slide mistura 1 passo sem número com 1 numerado.');
});

// Achado da revisão final: hasAttribute não é "tem valor" (mesma lição do data-passo acima).
test('data-curto vazio ou só com espaço não escapa de estrutura.nome-curto', () => {
  const tituloLongo = BASE.replace('<h2>Um</h2>', '<h2>Retropropagação</h2>');
  const vazio = tituloLongo.replace('id="bloco-um">', 'id="bloco-um" data-curto="">');
  assert.equal(rodar(vazio).filter((a) => a.regra === 'estrutura.nome-curto').length, 1);
  const soEspaco = tituloLongo.replace('id="bloco-um">', 'id="bloco-um" data-curto="   ">');
  assert.equal(rodar(soEspaco).filter((a) => a.regra === 'estrutura.nome-curto').length, 1);
  const comValor = tituloLongo.replace('id="bloco-um">', 'id="bloco-um" data-curto="Retro">');
  assert.deepEqual(rodar(comValor).filter((a) => a.regra === 'estrutura.nome-curto'), []);
});

// Achado da revisão final: nomeDoLayout devolve uma oração, não um nome; a mensagem sem layout
// não pode encaixá-la onde o molde espera um nome entre aspas.
test('estrutura.id-ausente escreve a mensagem por extenso, com e sem layout', () => {
  const comLayout = rodar(BASE.replace('id="conteudo">', '>')).find((a) => a.regra === 'estrutura.id-ausente');
  assert.equal(comLayout.mensagem, 'slide de layout "conteudo" sem id.');
  const semLayout = rodar(aula(
    '<section data-layout="capa"><h1>Capa</h1></section>\n'
    + '<section><h2>Sem layout.</h2></section>\n'
    + '<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>',
  )).find((a) => a.regra === 'estrutura.id-ausente');
  assert.equal(semLayout.mensagem, 'section sem data-layout e sem id.');
});

import { itensDoConteudo } from '../../validador/sequencia.js';
// O registro é a única lista de regras (spec 9.3); uma segunda lista aqui já divergiu dele uma vez
// (as fixtures de limites do marco 4b-2 chegaram e o teste continuou sem elas até isto ser corrigido).
import {
  REGRAS_ESTATICAS as todas, REGRAS_DE_CARGA as carga, REGRAS_DE_COMPOSICAO as composicao, REGRAS_DE_SAIDA as saida,
} from '../../validador/regras/index.js';

function slide(corpo) {
  return BASE.replace('  <h2>Título</h2>\n  <p class="lide">Lide.</p>\n  <p>Corpo.</p>\n', corpo);
}

test('a equação em destaque é um item de conteúdo, o texto solto também', () => {
  const { document } = parseHTML(aula('<section>\\[ x = 1 \\] solto <p>p</p></section>'));
  document.body.normalize();
  assert.deepEqual(
    itensDoConteudo(document.querySelector('section')).map((item) => item.tipo),
    ['tex-destaque', 'texto-solto', 'elemento'],
  );
});

test('o layout sem elemento obrigatório acusa, nomeando as alternativas', () => {
  const [achado] = rodar(slide('  <h2>Título</h2>\n'), todas).filter((a) => a.regra === 'estrutura.obrigatorio');
  assert.equal(achado.mensagem, 'layout "conteudo" sem div.colunas nem bloco de corpo.');
});

test('a equação em destaque conta como bloco de corpo', () => {
  const achados = rodar(slide('  <h2>Título</h2>\n  \\[ E = mc^2 \\]\n'), todas);
  assert.deepEqual(achados.filter((a) => a.severidade === 'erro'), []);
});

test('o lide depois do corpo é elemento fora de ordem, não bloco de corpo', () => {
  const [achado] = rodar(slide('  <h2>Título</h2>\n  <p>Corpo.</p>\n  <p class="lide">Lide.</p>\n'), todas)
    .filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.equal(achado.mensagem, '<p> fora de ordem no layout "conteudo".');
});

test('elemento fora do conteúdo do layout acusa com o trecho', () => {
  const [achado] = rodar(slide('  <h2>Título</h2>\n  <p>Corpo.</p>\n  <blockquote>Citação.</blockquote>\n'), todas)
    .filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.equal(achado.mensagem, '<blockquote> não é permitido no layout "conteudo".');
  assert.equal(achado.trecho, '<blockquote>Citação.</blockquote>');
});

test('texto solto no slide não é bloco de corpo', () => {
  const achados = rodar(slide('  <h2>Título</h2>\n  <p>Corpo.</p>\n  Texto solto.\n'), todas)
    .filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.equal(achados[0].mensagem, 'texto solto não é permitido no layout "conteudo".');
});

test('figure pede exatamente uma imagem: zero falta, duas sobram', () => {
  const semImagem = slide('  <h2>Título</h2>\n  <figure><figcaption>Só legenda.</figcaption></figure>\n');
  const [falta] = rodar(semImagem, todas).filter((a) => a.regra === 'estrutura.obrigatorio');
  assert.equal(falta.mensagem, '<figure> sem img nem svg.');
  const duas = slide('  <h2>Título</h2>\n  <figure><img src="img/a.png" alt="a"><svg viewBox="0 0 1 1"></svg></figure>\n');
  const [sobra] = rodar(duas, todas).filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.equal(sobra.mensagem, '<svg> a mais dentro de <figure>: só um img ou svg.');
});

test('tbody escrito ou implícito dá a mesma resposta', () => {
  for (const tabela of ['<table><tr><td>a</td></tr></table>', '<table><tbody><tr><td>a</td></tr></tbody></table>']) {
    const achados = rodar(slide(`  <h2>Título</h2>\n  ${tabela}\n`), todas).filter((a) => a.severidade === 'erro');
    assert.deepEqual(achados, [], `${tabela} acusou ${achados.map((a) => a.mensagem).join(' / ')}`);
  }
});

test('a coluna só aceita bloco de corpo, e o exercício exige enunciado', () => {
  const coluna = slide('  <h2>Título</h2>\n  <div class="colunas" data-grade="6-6"><div><h2>Não.</h2></div><div><p>B.</p></div></div>\n');
  assert.equal(
    rodar(coluna, todas).find((a) => a.regra === 'estrutura.fora-do-layout').mensagem,
    '<h2> não é permitido dentro de <div>.',
  );
  const exercicio = slide('  <h2>Título</h2>\n  <div class="exercicio"><div class="resposta"><p>R.</p></div></div>\n');
  assert.equal(
    rodar(exercicio, todas).find((a) => a.regra === 'estrutura.obrigatorio').mensagem,
    '<div> sem div.enunciado.',
  );
});

test('as notas podem estar em qualquer posição do slide', () => {
  const achados = rodar(slide('  <h2>Título</h2>\n  <aside class="notas">No meio.</aside>\n  <p>Corpo.</p>\n'), todas);
  assert.deepEqual(achados.filter((a) => a.severidade === 'erro'), []);
});

// Achado da revisão final: sempreOpcional só filtra no nível da própria section (teste acima);
// dentro de qualquer outro elemento, uma nota deslocada é conteúdo real e cai fora do layout —
// caso contrário, o montar a exibiria no slide e o validador diria que faltam notas.
test('nota dentro de uma coluna não é permitida: sempreOpcional não vale além da própria section', () => {
  const notaNaColuna = slide(
    '  <h2>Título</h2>\n'
    + '  <div class="colunas" data-grade="6-6"><div><aside class="notas">Deslocada.</aside><p>A.</p></div><div><p>B.</p></div></div>\n',
  );
  const achados = rodar(notaNaColuna, todas).filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.deepEqual(achados.map((a) => a.mensagem), ['<aside> não é permitido dentro de <div>.']);
});

// Deslocamento não é ausência: o casador de uma passada só mandava acrescentar o que já estava no slide.
test('elemento deslocado acusa fora de ordem, e nunca ausência', () => {
  const achados = rodar(slide('  <p class="lide">Lide.</p>\n  <h2>Título</h2>\n  <p>Corpo.</p>\n'), todas);
  assert.deepEqual(achados.filter((a) => a.regra === 'estrutura.obrigatorio'), []);
  assert.deepEqual(
    achados.filter((a) => a.regra === 'estrutura.fora-do-layout').map((a) => a.mensagem),
    ['<h2> fora de ordem no layout "conteudo".'],
  );
});

test('pergunta antes do h2 na abertura também é só ordem', () => {
  const invertida = BASE.replace(
    '<section data-layout="abertura" id="bloco-um"><h2>Um</h2></section>',
    '<section data-layout="abertura" id="bloco-um"><p class="pergunta">Pergunta?</p><h2>Um</h2></section>',
  );
  const achados = rodar(invertida, todas);
  assert.deepEqual(achados.filter((a) => a.regra === 'estrutura.obrigatorio'), []);
  assert.equal(achados.find((a) => a.regra === 'estrutura.fora-do-layout').mensagem, '<h2> fora de ordem no layout "abertura".');
});

test('bloco solto antes da demo não faz a demo sumir', () => {
  const comDemo = BASE.replace(
    '<section data-layout="encerramento">',
    '<section data-layout="demo" id="demo"><h2>Demo</h2><p>Antes.</p>'
    + '<div class="demo" data-demo="contador"></div><aside class="notas">N.</aside></section>\n<section data-layout="encerramento">',
  );
  const achados = rodar(comDemo, todas);
  assert.deepEqual(achados.filter((a) => a.regra === 'estrutura.obrigatorio'), []);
  assert.equal(achados.find((a) => a.regra === 'estrutura.fora-do-layout').mensagem, '<p> não é permitido no layout "demo".');
});

test('exercício com a resposta antes do enunciado é ordem, não falta', () => {
  const invertido = slide('  <h2>Título</h2>\n  <div class="exercicio"><div class="resposta"><p>R.</p></div><div class="enunciado"><p>E.</p></div></div>\n');
  const achados = rodar(invertido, todas);
  assert.deepEqual(achados.filter((a) => a.regra === 'estrutura.obrigatorio'), []);
  assert.equal(achados.find((a) => a.regra === 'estrutura.fora-do-layout').mensagem, '<div> fora de ordem dentro de <div>.');
});

test('a segunda legenda da figura é excesso', () => {
  const duasLegendas = slide('  <h2>Título</h2>\n  <figure><img src="img/a.png" alt="a"><figcaption>Uma.</figcaption><figcaption>Duas.</figcaption></figure>\n');
  assert.equal(
    rodar(duasLegendas, todas).find((a) => a.regra === 'estrutura.fora-do-layout').mensagem,
    '<figcaption> a mais dentro de <figure>: só um figcaption.',
  );
});

test('exercício escrito como coluna vale: a chave mais específica do contrato é que manda', () => {
  const comoColuna = slide('  <h2>Título</h2>\n  <div class="colunas" data-grade="6-6">'
    + '<div class="exercicio"><div class="enunciado"><p>E.</p></div></div><div><p>B.</p></div></div>\n');
  assert.deepEqual(rodar(comoColuna, todas).filter((a) => a.severidade === 'erro'), []);
});

// Pino: com colunas e blocos soltos no mesmo slide, vence a alternativa que casa mais itens.
test('misturar colunas com blocos soltos acusa o que está em minoria', () => {
  const misto = slide('  <h2>Título</h2>\n  <div class="colunas" data-grade="6-6"><div><p>A.</p></div><div><p>B.</p></div></div>\n'
    + '  <p>Solto um.</p>\n  <p>Solto dois.</p>\n');
  assert.deepEqual(
    rodar(misto, todas).filter((a) => a.regra === 'estrutura.fora-do-layout').map((a) => a.mensagem),
    ['<div> não é permitido no layout "conteudo".'],
  );
});

// Tarefa 1 da fase 2a (docs/superpowers/plans/2026-09-21-aula-usp-f2a-graficos.md): o exemplo
// literal da spec 7.2, byte a byte — inclusive o JSON da especificação, que a Tarefa 2 vai ler,
// mas que aqui só precisa ser um <script type="application/json"> válido para o vocabulário.
const FIGURE_GRAFICO_7_2 = `<figure class="grafico">
  <script type="application/json">
  { "tipo": "linha", "dados": "data/erro.csv", "x": "epoca", "y": ["treino", "teste"], "foco": "teste",
    "eixos": { "x": "época", "y": "erro" }, "faixas": [{ "x": [120, 245], "rotulo": "platô" }] }
  </script>
  <figcaption>Erro de treino e de teste ao longo das épocas.</figcaption>
</figure>`;

test('figure.grafico do exemplo literal da spec 7.2 não produz erro estático na fase 2', () => {
  const achados = rodar(slide(`  <h2>Título</h2>\n  ${FIGURE_GRAFICO_7_2}\n`), todas, { fase: 2 });
  assert.deepEqual(achados.filter((a) => a.severidade === 'erro'), []);
});

// O mesmo exemplo, sem pedir fase 2 (rodar() usa fase 1 por padrão): os quatro erros que o Fato 1
// do plano mediu continuam de pé — a regra não afrouxou para quem ainda está na fase 1, só aprendeu
// que a fase 2 existe. vocabulario.classe e vocabulario.script vêm de portas próprias;
// estrutura.obrigatorio e estrutura.fora-do-layout vêm os dois da mesma linha de filhos.figure.
test('o mesmo exemplo produz erro na fase 1: a regra não afrouxou, só aprendeu a fase', () => {
  const achados = rodar(slide(`  <h2>Título</h2>\n  ${FIGURE_GRAFICO_7_2}\n`), todas)
    .filter((a) => a.severidade === 'erro');
  assert.deepEqual(
    achados.map((a) => a.regra).sort(),
    ['estrutura.fora-do-layout', 'estrutura.obrigatorio', 'vocabulario.classe', 'vocabulario.script'],
  );
});

// A garantia mais estreita da Tarefa 1 (Passo 1 do brief): "uma figure sem classe não pode passar
// a aceitar script, nem a dispensar o img/svg, em nenhuma fase." Sem a classe grafico/diagrama, o
// elemento só casa a chave genérica "figure" de filhos — que não tem "fase" nenhuma — nas duas
// fases. Confere as duas metades pela regra que é dona de cada achado, não pelo total agregado:
// um total agregado continuaria vermelho mesmo se só uma das duas regras parasse de acusar, e é
// exatamente essa a inversão que a linha abaixo descreve.
test('figure sem classe não aceita script nem dispensa img/svg, em nenhuma fase', () => {
  const comScript = slide('  <h2>Título</h2>\n  <figure><script type="application/json">{}</script></figure>\n');
  for (const fase of [1, 2]) {
    const doScript = rodar(comScript, todas, { fase }).filter((a) => a.regra === 'vocabulario.script');
    assert.deepEqual(
      doScript.map((a) => a.mensagem),
      ['script dentro da section: registros de demo ficam fora dos slides.'],
      `fase ${fase}`,
    );
  }

  const semImagem = slide('  <h2>Título</h2>\n  <figure><figcaption>Sem imagem.</figcaption></figure>\n');
  for (const fase of [1, 2]) {
    const doObrigatorio = rodar(semImagem, todas, { fase }).filter((a) => a.regra === 'estrutura.obrigatorio');
    assert.deepEqual(doObrigatorio.map((a) => a.mensagem), ['<figure> sem img nem svg.'], `fase ${fase}`);
  }
});

// Achado da revisão da Tarefa 1 (Important 2): as duas chaves do Passo 1 aceitavam qualquer
// <script>, sem olhar o atributo type — a spec 5.5 pareia o tipo ao pai, literal: "script com
// type="application/json" dentro de figure.grafico ou com type="text/vnd.graphviz" dentro de
// figure.diagrama". exatamenteUmDe:["script"] media só "existe um script", não "existe o script
// certo", e a revisão mediu isso trocando o contrato em memória e achando figure.grafico limpo com
// um script sem type nenhum. O conserto pareia o tipo dentro do próprio seletor do contrato
// (script[type="…"]) — casaSeletor (validador/sequencia.js:26) já usa elemento.matches(seletor), e
// matches() aceita seletor de atributo; nenhum código novo, só o dado ficando mais preciso.
test('o type do script casa com a classe do pai: json em grafico, graphviz em diagrama', () => {
  const casos = [
    ['grafico', 'text/vnd.graphviz'], // tipo de diagrama dentro de grafico
    ['diagrama', 'application/json'], // tipo de grafico dentro de diagrama
    ['grafico', ''], // sem type nenhum — o <script>window.x = 1</script> que a revisão mediu
  ];
  for (const [classe, tipo] of casos) {
    const atributoType = tipo ? ` type="${tipo}"` : '';
    const html = slide(`  <h2>Título</h2>\n  <figure class="${classe}"><script${atributoType}>{}</script></figure>\n`);
    const achados = rodar(html, todas, { fase: 2 }).filter((a) => a.severidade === 'erro');
    assert.deepEqual(
      achados.map((a) => a.regra).sort(),
      ['estrutura.fora-do-layout', 'estrutura.obrigatorio'],
      `figure.${classe} com script tipo "${tipo || '(ausente)'}" deveria acusar na fase 2`,
    );
  }

  // Os dois pareamentos certos continuam limpos na fase 2: não é um afrouxamento geral do script.
  // `{}` bastava antes de recursos.grafico (Tarefa 4) existir; hoje é um JSON de gráfico incompleto
  // por design (sem "tipo"), e recursos.grafico acusaria isso — não é o que este teste mede, então a
  // especificação aqui é mínima, mas válida.
  const grafico = slide('  <h2>Título</h2>\n  <figure class="grafico"><script type="application/json">{"tipo":"linha","x":"a","y":["b"]}</script></figure>\n');
  assert.deepEqual(rodar(grafico, todas, { fase: 2 }).filter((a) => a.severidade === 'erro'), []);
  const diagrama = slide('  <h2>Título</h2>\n  <figure class="diagrama"><script type="text/vnd.graphviz">digraph{}</script></figure>\n');
  assert.deepEqual(rodar(diagrama, todas, { fase: 2 }).filter((a) => a.severidade === 'erro'), []);
});

// Achado da revisão final (Minor, item 8): um data-curto comprido fora da abertura era acusado duas
// vezes — por vocabulario.atributo (layout errado) e por limites.nome-curto (comprimento), que varria
// toda section, não só abertura. Um dono só: vocabulario.atributo, que já sabe de layout.
test('data-curto comprido fora da abertura só é acusado por vocabulario.atributo', () => {
  const fora = aula('<section data-layout="conteudo" id="a" data-curto="Retropropagação"><h2>T</h2><p>C.</p></section>');
  const regras = rodar(fora, todas).map((achado) => achado.regra);
  assert.deepEqual(regras.filter((nome) => nome === 'vocabulario.atributo' || nome === 'limites.nome-curto'), ['vocabulario.atributo']);
});

const FIXTURES = new URL('tests/fixtures/validador/', RAIZ);
const IMPLEMENTADAS = new Map(todas.map((regra) => [regra.nome, regra]));
const DE_CARGA = new Map(carga.map((regra) => [regra.nome, regra]));
const DE_COMPOSICAO = new Map(composicao.map((regra) => [regra.nome, regra]));
const DE_SAIDA = new Map(saida.map((regra) => [regra.nome, regra]));

// Uma pasta por regra (spec 11.1): roda TODAS as regras sobre a fixture e filtra pela regra da
// pasta — bom.html não produz nenhum achado dela, ruim.html produz pelo menos um. Rodar só a
// regra da pasta (como antes) tornava "ruim.html só acusa a própria regra" tautológico (com uma
// regra só no ar, todo achado só pode ser dela) e nunca testava bom.html contra mais nada. Não
// exigimos bom.html limpo para as OUTRAS regras: fixtures mínimas legitimamente disparam
// estrutura.blocos ou estrutura.notas-ausentes, e cobrar isso viraria uma aula inteira por pasta.
//
// As pastas do grupo de carga (marco 4c) moram na mesma pasta e seguem o mesmo molde, mas a regra
// só acusa com recursos de verdade — então a varredura monta recursos de verdade, com o próprio
// carregarNoNode do build, tendo a pasta da fixture como pastaDaAula (é por isso que recursos.imagem
// e recursos.demo-sem-estatico têm um img/existe.png de verdade ao lado do bom.html e do ruim.html:
// uma fixture que não pode acusar nada não prova nada). Roda como o build roda: normaliza antes de
// texInvalido, senão TeX partido por uma referência de caractere passaria batido (validar.js:28).
function rodarComCarga(nome, arquivo) {
  const { document } = parseHTML(readFileSync(new URL(`${nome}/${arquivo}`, FIXTURES), 'utf8'));
  document.body.normalize();
  const pastaDaAula = fileURLToPath(new URL(`${nome}/`, FIXTURES));
  const recursos = carregarNoNode(document, { pastaDaAula, katex });
  // A mesma fase que contrato.regras[nome] declara — nunca 1 fixo: uma regra de carga de fase 2
  // (recursos.csv) rodando sob fase 1 (o default de validar()) seria descartada antes de aplicar()
  // rodar, e ruim.html nunca acusaria nada, por um motivo que não tem a ver com a regra em si.
  const fase = contrato.regras[nome].fase;
  return validar(document, { contrato, regras: carga, grupo: 'carga', recursos, fase })
    .filter((achado) => achado.regra === nome);
}

// As pastas do grupo de composição (marco 4c) também moram aqui e seguem o mesmo molde, mas a
// regra só existe para o documento renderizado: getBoundingClientRect() e getComputedStyle() não
// têm com que responder sobre um documento que o linkedom nunca dispôs nem pintou — nem bom.html
// nem ruim.html podem acusar nada aqui, do jeito que a fixture de carga acima acusa com recursos de
// verdade. A pasta serve à spec 11.1 (uma fixture por regra) e aos exemplos do marco 6; quem mede
// de verdade é tests/integracao/composicao.test.mjs, dentro do Chrome (spec 9.3). Aqui a varredura
// só confirma que a regra está registrada e que o par bom/ruim existe.
function existeFixtureDeComposicao(nome) {
  return existsSync(new URL(`${nome}/bom.html`, FIXTURES)) && existsSync(new URL(`${nome}/ruim.html`, FIXTURES));
}

for (const nome of readdirSync(FIXTURES).sort()) {
  test(`fixture de ${nome}`, () => {
    if (DE_CARGA.has(nome)) {
      const bom = rodarComCarga(nome, 'bom.html');
      const ruim = rodarComCarga(nome, 'ruim.html');
      assert.deepEqual(bom, [], `bom.html de ${nome} acusou com recursos de verdade: ${bom.map((a) => a.mensagem).join(' / ')}`);
      assert.ok(ruim.length > 0, `ruim.html de ${nome} não acusou nada da própria regra, mesmo com recursos de verdade`);
      return;
    }
    if (DE_COMPOSICAO.has(nome)) {
      assert.ok(contrato.regras[nome], `${nome} não está no contrato`);
      assert.ok(existeFixtureDeComposicao(nome), `${nome} sem bom.html ou ruim.html`);
      return;
    }
    const regra = IMPLEMENTADAS.get(nome);
    assert.ok(regra, `a pasta ${nome} não tem regra implementada`);
    // A mesma fase que contrato.regras[nome] declara (ver rodarComCarga, acima, sobre por que 1 fixo
    // é o defeito): uma regra estática de fase 2 (recursos.grafico) sob a fase 1 default não só
    // ficaria muda ela mesma — a vocabulário/estrutura que abrem figure.grafico também ficaria fase
    // 1, e ruim.html acusaria vocabulario.classe/estrutura.fora-do-layout em vez da regra da pasta.
    const fase = contrato.regras[nome].fase;
    const bom = rodar(readFileSync(new URL(`${nome}/bom.html`, FIXTURES), 'utf8'), todas, { fase })
      .filter((achado) => achado.regra === nome);
    assert.deepEqual(bom, [], `bom.html de ${nome} acusou da própria regra: ${bom.map((a) => a.mensagem).join(' / ')}`);
    const ruim = rodar(readFileSync(new URL(`${nome}/ruim.html`, FIXTURES), 'utf8'), todas, { fase })
      .filter((achado) => achado.regra === nome);
    assert.ok(ruim.length > 0, `ruim.html de ${nome} não acusou nada da própria regra`);
  });
}

// A exigência de FIXTURE é só das estáticas, e continua separada da guarda contrato↔código abaixo:
// carga, composição e saída não se provam por fixture de linkedom. As de carga têm par bom/ruim
// mas precisam de recursos de verdade (rodarComCarga, acima); as de composição só existem dentro do
// Chrome (tests/integracao/composicao.test.mjs); as de saída medem o artefato construído.
test('toda regra estática implementada tem fixture', () => {
  for (const regra of IMPLEMENTADAS.values()) {
    assert.ok(existsSync(new URL(`${regra.nome}/ruim.html`, FIXTURES)), `${regra.nome} sem fixture`);
  }
});

// I5 da revisão final: existiam duas guardas contrato→código, `estatica` e `saida`, e NENHUMA para
// `carga` nem `composicao` — 9 das 60 regras de fase 1 sem guarda. Medido pelo revisor:
// acrescentando carga.regra-fantasma e composicao.regra-fantasma ao contrato, sem nenhuma
// implementação, este arquivo passava inteiro.
//
// Um registro por grupo. Os nomes dos grupos NÃO estão escritos neste teste: vêm do próprio
// contrato (todo `grupo` distinto entre as regras conhecidas — ver FASE_MAXIMA, abaixo), e a
// primeira asserção é que cada um deles tem registro nesta tabela. É isso que faz "apareceu um
// quinto grupo no contrato e ninguém escreveu o código dele" cair aqui — sem que o teste precise
// apostar num número de grupos ou de regras, que seria o contrato repetido em código.
const REGISTROS_POR_GRUPO = new Map([
  ['estatica', IMPLEMENTADAS],
  ['carga', DE_CARGA],
  ['composicao', DE_COMPOSICAO],
  ['saida', DE_SAIDA],
]);

// Exceção nomeada, no molde do que valeu para matematica.simbolo-fora-do-tex enquanto essa regra
// esperou pelo marco 5: uma regra que está no contrato e ainda não tem código só passa por aqui se
// alguém a escrever nesta lista. As duas de hoje são as regras de carga do DIAGRAMA (fase 2, spec
// 7.2) — `recursos.dot` e `recursos.diagrama-grande` — que a Tarefa 4 da fase 2a NÃO implementa (o
// brief dela é só `recursos.grafico`/`recursos.csv`); ficam para a tarefa do diagrama. Continua
// vazia para fase 1: não sobra nada adiado ali.
const ADIADAS_DE_PROPOSITO = ['recursos.dot', 'recursos.diagrama-grande'];

// A maior fase que o próprio contrato declara — nunca um "2" digitado: se uma fase 3 aparecer um
// dia, esta conta já a inclui sozinha, e "ensine a guarda a fase" (Tarefa 4, Passo 3) continua
// valendo sem editar este arquivo. validar() decide por regra com definicao.fase > fase (spot-check
// em validador/validar.js); FASE_MAXIMA é o teto que faz esta suíte rodar TODA regra que existe.
const FASE_MAXIMA = Math.max(...Object.values(contrato.regras).map((regra) => regra.fase));

const gruposConhecidos = [...new Set(Object.values(contrato.regras)
  .filter((regra) => regra.fase <= FASE_MAXIMA)
  .map((regra) => regra.grupo))].sort();

test('todo grupo de regras do contrato (até a fase mais alta que ele declara) tem registro em validador/regras/index.js', () => {
  assert.deepEqual(gruposConhecidos.filter((grupo) => !REGISTROS_POR_GRUPO.has(grupo)), []);
});

// "guarda de mão dupla" (Tarefa 4, Passo 3): antes desta tarefa, as duas linhas abaixo filtravam
// `regra.fase === 1`, e o lado que assere "implementadas mas fora do contrato" (a segunda,
// logo adiante) não olha fase nenhuma — cita `contrato.regras[nome]` sozinho. Isso deixava fase 2
// invisível dos dois lados: nem recursos.grafico/recursos.csv (implementadas aqui) entravam na
// primeira comparação, nem um recursos.dot/recursos.diagrama-grande órfão (no contrato, sem código)
// seria acusado. Ensinar `doContrato` a FASE_MAXIMA (em vez de relaxar a segunda linha) faz os dois
// lados voltarem a se conferir — e é por isso que ADIADAS_DE_PROPOSITO, acima, deixou de estar vazia.
test('contrato e código concordam nos dois sentidos, em todos os grupos até a fase mais alta', () => {
  for (const grupo of gruposConhecidos) {
    const registro = REGISTROS_POR_GRUPO.get(grupo);
    assert.ok(registro, `o grupo ${grupo} não tem registro — veja o teste acima`);
    const doContrato = Object.entries(contrato.regras)
      .filter(([, regra]) => regra.grupo === grupo && regra.fase <= FASE_MAXIMA)
      .map(([nome]) => nome);
    assert.deepEqual(
      doContrato.filter((nome) => !registro.has(nome) && !ADIADAS_DE_PROPOSITO.includes(nome)),
      [],
      `regras de ${grupo} no contrato sem implementação no registro`,
    );
    assert.deepEqual(
      [...registro.keys()].filter((nome) => !contrato.regras[nome]),
      [],
      `regras de ${grupo} implementadas que não existem no contrato`,
    );
  }
});
