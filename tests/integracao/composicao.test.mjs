// Composição (spec 9.2 e 9.3): as cinco regras medidas no Chrome, sobre o espécime e sobre mutações.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { iniciarChrome, servirPasta, RAIZ } from './utilitarios.mjs';

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));

// Dentro da página: importa o validador pelo caminho do servidor e roda o grupo de composição.
const RODAR = async (contrato) => {
  const { validar } = await import('/_aula-usp/validador/validar.js');
  const { regras } = await import('/_aula-usp/validador/regras/composicao.js');
  return validar(document, { contrato, regras, grupo: 'composicao', janela: window })
    .map((achado) => ({ regra: achado.regra, slide: achado.slide, mensagem: achado.mensagem }));
};

const navegador = await iniciarChrome();
const sitio = await servirPasta('especime');
const fixturas = await servirPasta('tests/fixtures/validador');

test.after(async () => {
  await navegador.close();
  await sitio.fechar();
  await fixturas.fechar();
});

async function medir(arquivo, mutacao) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  await pagina.goto(`${sitio.endereco}/${arquivo}?folha`);
  await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
  await pagina.evaluate(() => document.fonts.ready);
  if (mutacao) await pagina.evaluate(mutacao);
  const achados = await pagina.evaluate(RODAR, contrato);
  await pagina.close();
  return achados;
}

test('os seis decks do espécime não têm problema de composição', async () => {
  for (const arquivo of ['index.html', 'componentes.html', 'matematica.html', 'codigo.html', 'ifusp.html', 'muitos-blocos.html']) {
    const achados = await medir(arquivo);
    assert.deepEqual(achados, [], `${arquivo}: ${achados.map((a) => a.mensagem).join(' / ')}`);
  }
});

test('elemento que passa da zona de conteúdo acusa transbordo', async () => {
  const achados = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.width = '2000px';
  });
  assert.equal(achados[0].regra, 'composicao.transbordo');
  assert.match(achados[0].mensagem, /^<p> passa \d+ px da zona de conteúdo\.$/);
});

test('elemento deslocado para fora da zona pela esquerda ou por cima também acusa', async () => {
  const esquerda = await medir('index.html', () => {
    document.querySelector('.slide .area p').style.marginLeft = '-300px';
  });
  assert.ok(esquerda.some((achado) => achado.regra === 'composicao.transbordo'), JSON.stringify(esquerda));

  const cima = await medir('index.html', () => {
    document.querySelector('.slide .area p').style.marginTop = '-300px';
  });
  assert.ok(cima.some((achado) => achado.regra === 'composicao.transbordo'), JSON.stringify(cima));
});

// Crítico da revisão: uma equação larga demais não podia ser vista, porque .katex/.katex-display
// inteiros ficavam de fora da medição (o filtro que existe para tamanho-minimo, spec 4.3).
test('equação em linha larga demais acusa transbordo', async () => {
  const achados = await medir('matematica.html', () => {
    const formula = document.querySelector('#no-texto p:nth-of-type(2) .katex');
    formula.style.display = 'inline-block';
    formula.style.width = '2000px';
  });
  assert.ok(achados.some((achado) => achado.regra === 'composicao.transbordo' && /passa \d+ px/.test(achado.mensagem)), JSON.stringify(achados));
});

// A mesma lição do marco 3c (linha de código larga não muda a caixa do <pre>) vale para uma
// equação em destaque: o KaTeX deixa o conteúdo transbordar (overflow-x: visible), sem alargar a
// própria caixa do .katex-display.
test('equação em destaque larga demais acusa mesmo sem mudar a própria caixa', async () => {
  const achados = await medir('matematica.html', () => {
    document.querySelector('#em-destaque .katex-display .katex').style.minWidth = '2000px';
  });
  assert.ok(achados.some((achado) => achado.regra === 'composicao.transbordo' && /px de conteúdo além da largura/.test(achado.mensagem)), JSON.stringify(achados));
});

// A lição do marco 3c: a caixa do <pre> não muda quando uma linha é larga demais.
test('código mais largo que o bloco acusa, mesmo sem mudar a caixa', async () => {
  const achados = await medir('codigo.html', () => {
    const linha = document.querySelector('.slide .area pre .linha');
    linha.textContent = `x = "${'a'.repeat(200)}"`;
  });
  assert.ok(achados.some((achado) => /px de conteúdo além da largura/.test(achado.mensagem)), JSON.stringify(achados));
});

test('título que passa de duas linhas acusa', async () => {
  const achados = await medir('index.html', () => {
    document.querySelector('.slide .area h2').textContent = 'Um título muito comprido '.repeat(6);
  });
  assert.equal(achados[0].regra, 'composicao.linhas-titulo');
  assert.match(achados[0].mensagem, /título renderizado em 3 linhas \(máx\. 2\)\./);
});

// Importante da revisão: altura ÷ entrelinha arredondado é frágil perto de matemática inline — um
// elemento alto na mesma linha (uma fração, um expoente empilhado) engorda a altura sem quebrar a
// linha. Medido num título real do espécime (\(\eta\)): razão 1,39, perto demais do arredondamento.
test('título de uma linha só, mas mais alto por causa de um elemento inline, não conta linha a mais', async () => {
  const achados = await medir('matematica.html', () => {
    const titulo = document.querySelector('#o-papel-de-eta h2');
    const alto = document.createElement('span');
    alto.textContent = ' ';
    Object.assign(alto.style, { display: 'inline-block', width: '1px', height: '300px', verticalAlign: 'middle' });
    titulo.appendChild(alto);
  });
  assert.deepEqual(achados.filter((achado) => achado.regra === 'composicao.linhas-titulo'), []);
});

test('texto abaixo do mínimo do seu papel acusa, e o papel vem do seletor mais específico', async () => {
  const achados = await medir('index.html', () => {
    document.querySelector('.slide .area p').style.fontSize = '18px';
  });
  assert.equal(achados[0].regra, 'composicao.tamanho-minimo');
  assert.match(achados[0].mensagem, /<p> em 18 px, abaixo do mínimo de 24 px do papel leitura\./);
});

// I3 da revisão final da 2a: texto de SVG tem o font-size em unidades do viewBox, e o SVG escala com
// a coluna. getComputedStyle diz 14px nos dois casos abaixo; o que a plateia vê é outra coisa. Medido
// pelo revisor, build real: escala 1,212 no layout figura (~17 px no palco), 0,575 numa coluna de
// grade 4-4-4 (~8 px). A regra passa a medir o tamanho no palco, e o texto de SVG é rótulo (14 px,
// spec 7.2: "marcas e rótulos em Geist Mono 14").
test('texto de gráfico numa coluna estreita acusa tamanho-minimo pelo tamanho no palco; no layout figura, não', async () => {
  // O gráfico de verdade do espécime, desenhado pelo navegador, copiado para a coluna de 4 do slide
  // #figura-no-corpo (grade 4-8): mesma largura de coluna que uma grade 4-4-4.
  const estreita = await medir('componentes.html', () => {
    const svg = document.querySelector('#grafico-notas figure.grafico svg').cloneNode(true);
    document.querySelector('#figura-no-corpo .colunas > div').append(svg);
  });
  const doTamanho = estreita.filter((achado) => achado.regra === 'composicao.tamanho-minimo');
  assert.ok(doTamanho.length > 0, JSON.stringify(estreita));
  for (const achado of doTamanho) {
    assert.match(achado.mensagem, /^<text> em [\d,]+ px no palco \(14 px no SVG, que a figura escala por 0,5\d+\), abaixo do mínimo de 14 px do papel rotulo\.$/);
  }
  // O mesmo gráfico no layout figura: escala maior que 1, nenhum achado.
  const figura = await medir('componentes.html');
  assert.deepEqual(figura.filter((achado) => achado.regra === 'composicao.tamanho-minimo'), []);
  // E a regra de fato mede esse texto (não passou por não olhar): o font-size do gráfico em 11 px no
  // viewBox, no mesmo layout figura, cai abaixo de 14 no palco e acusa.
  const menor = await medir('componentes.html', () => {
    for (const texto of document.querySelectorAll('#grafico-notas svg text')) texto.setAttribute('font-size', '11');
  });
  assert.ok(menor.some((achado) => achado.regra === 'composicao.tamanho-minimo' && achado.slide !== null), JSON.stringify(menor));
});

// O roteiro da capa renderiza a 14 px e casa "li" (leitura, 24) e ".roteiro li" (rotulo, 14):
// sem precedência por especificidade, todo deck do espécime acusaria.
test('o roteiro da capa é rótulo, não leitura', async () => {
  const achados = await medir('index.html');
  assert.deepEqual(achados.filter((achado) => /roteiro|li /.test(achado.mensagem)), []);
});

test('azul pequeno e texto sobre amarelo fora da tinta acusam', async () => {
  const azul = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.color = '#1094AB';
    p.style.fontSize = '24px';
  });
  assert.ok(azul.some((achado) => achado.regra === 'composicao.azul-pequeno'), JSON.stringify(azul));

  const amarelo = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.background = '#FCB421';
    p.style.color = '#FFFFFF';
  });
  assert.ok(amarelo.some((achado) => achado.regra === 'composicao.texto-no-amarelo'), JSON.stringify(amarelo));
});

async function medirFixture(pasta, arquivo) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  await pagina.goto(`${fixturas.endereco}/${pasta}/${arquivo}?folha`);
  await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
  await pagina.evaluate(() => document.fonts.ready);
  const achados = await pagina.evaluate(RODAR, contrato);
  await pagina.close();
  return achados;
}

// I3/I4 da revisão final do 4c: das cinco fixtures de composição (tests/fixtures/validador/), só
// duas discriminavam de verdade quando medidas no Chrome. transbordo/ruim.html não acusava nada (a
// tabela original era baixa demais); azul-pequeno/bom.html estava sujo (um <svg> sem tamanho estourava
// a zona de conteúdo). As duas foram consertadas; azul-pequeno/ruim.html e tamanho-minimo/ruim.html
// eram o mecanismo errado (fill de SVG e <sub>, que está em papeis.excecoes) e agora mostram o
// mecanismo certo, mesmo continuando fora do alcance do vocabulário de um autor real (ver comentário
// em cada fixture).
test('as cinco fixtures de composição discriminam bom de ruim, medidas no Chrome', async () => {
  const nomes = [
    'composicao.transbordo',
    'composicao.linhas-titulo',
    'composicao.tamanho-minimo',
    'composicao.azul-pequeno',
    'composicao.texto-no-amarelo',
  ];
  for (const nome of nomes) {
    const bom = await medirFixture(nome, 'bom.html');
    const ruim = await medirFixture(nome, 'ruim.html');
    assert.deepEqual(bom, [], `bom.html de ${nome} acusou: ${bom.map((a) => a.mensagem).join(' / ')}`);
    assert.ok(ruim.some((achado) => achado.regra === nome), `ruim.html de ${nome} não acusou a própria regra: ${JSON.stringify(ruim)}`);
  }
});

// Importante da revisão: aside.notas nunca aparece no slide (display:none) — não é composição.
test('conteúdo dentro de aside.notas não é medido', async () => {
  const achados = await medir('index.html', () => {
    const notas = document.querySelector('.slide aside.notas');
    notas.innerHTML = '<p style="font-size:10px">pequeno</p>'
      + '<span style="color:rgb(16,148,171);font-size:10px">azul</span>'
      + '<div style="background:rgb(252,180,33);color:red">amarelo</div>';
  });
  assert.deepEqual(achados, []);
});
