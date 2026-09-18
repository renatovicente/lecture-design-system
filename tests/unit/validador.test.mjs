// Núcleo do validador (spec 9.1 e 9.3) e as regras de estrutura (spec 9.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { validar, linhaDe, contar, cabecalhoDe, slidesDoFonte } from '../../validador/validar.js';
import { regras as estrutura } from '../../validador/regras/estrutura.js';
import { carregarNoNode } from '../../build/carregar.mjs';

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
import { REGRAS_ESTATICAS as todas, REGRAS_DE_CARGA as carga } from '../../validador/regras/index.js';

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
  return validar(document, { contrato, regras: carga, grupo: 'carga', recursos })
    .filter((achado) => achado.regra === nome);
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
    const regra = IMPLEMENTADAS.get(nome);
    assert.ok(regra, `a pasta ${nome} não tem regra implementada`);
    const bom = rodar(readFileSync(new URL(`${nome}/bom.html`, FIXTURES), 'utf8'), todas)
      .filter((achado) => achado.regra === nome);
    assert.deepEqual(bom, [], `bom.html de ${nome} acusou da própria regra: ${bom.map((a) => a.mensagem).join(' / ')}`);
    const ruim = rodar(readFileSync(new URL(`${nome}/ruim.html`, FIXTURES), 'utf8'), todas)
      .filter((achado) => achado.regra === nome);
    assert.ok(ruim.length > 0, `ruim.html de ${nome} não acusou nada da própria regra`);
  });
}

test('toda regra implementada existe no contrato e tem fixture', () => {
  for (const regra of IMPLEMENTADAS.values()) {
    assert.ok(contrato.regras[regra.nome], `${regra.nome} não está no contrato`);
    assert.ok(existsSync(new URL(`${regra.nome}/ruim.html`, FIXTURES)), `${regra.nome} sem fixture`);
  }
});

// Ruling 2: matematica.simbolo-fora-do-tex fica para o marco 5, junto com saida.glifo-ausente, os
// dois lendo validador/cobertura.json. É a única exceção nomeada; o marco 5 apaga esta linha ao
// implementar a regra, e o teste volta a cobrir as 47.
const ADIADAS_DE_PROPOSITO = new Set(['matematica.simbolo-fora-do-tex']);

test('toda regra estática de fase 1 do contrato está implementada', () => {
  // Cobria só "estrutura.": dava para apagar limites.tabela do registro (ou qualquer outra das 28
  // regras deste marco) e a suíte passava. Agora cobre o grupo e a fase inteiros, como o código→
  // contrato e o código→fixture já cobrem (acima).
  const doContrato = Object.entries(contrato.regras)
    .filter(([, regra]) => regra.grupo === 'estatica' && regra.fase === 1)
    .map(([nome]) => nome);
  assert.deepEqual(
    doContrato.filter((nome) => !IMPLEMENTADAS.has(nome) && !ADIADAS_DE_PROPOSITO.has(nome)),
    [],
  );
});
