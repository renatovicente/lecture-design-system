// Código com destaque no Chrome, sobre especime/codigo.html e tests/fixtures/codigo/ servidos por `aula-usp servir` (spec 3.2, 4.2, 4.3 e 7.1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  iniciarChrome, servirPasta, abrirAula, classesForaDoContrato, perto, TINTA, CINZA, PAPEL, AMARELO, TRANSPARENTE,
} from './utilitarios.mjs';

let servidor;
let navegador;
let folhaAberta;

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

const folha = () => (folhaAberta ??= abrirAula(navegador, `${servidor.endereco}/codigo.html?folha`));
const modulosPedidos = (pedidos) => pedidos
  .map((endereco) => new URL(endereco).pathname)
  .filter((caminho) => caminho.startsWith('/_aula-usp/modulos/'))
  .map((caminho) => caminho.slice('/_aula-usp/modulos/'.length));

test('espécime de código: 9 slides com blocos nas sete linguagens, todos em linhas, sem erros e com as classes no contrato', async () => {
  const { pagina, erros } = await folha();
  const medida = await pagina.evaluate(() => {
    const blocos = [...document.querySelectorAll('pre[data-lang]')];
    return {
      slides: document.querySelectorAll('section.slide').length,
      linguagens: [...new Set(blocos.map((pre) => pre.getAttribute('data-lang')))].sort(),
      semLinhas: blocos.filter((pre) => !pre.firstElementChild?.classList.contains('linha')).length,
      // O transbordo de código não aparece na caixa da linha, só em scrollWidth: é assim que o marco 4 tem de medir.
      linhasLargas: [...document.querySelectorAll('pre[data-lang] .linha')].filter((linha) => linha.scrollWidth > linha.clientWidth).length,
    };
  });
  assert.equal(medida.slides, 9);
  assert.equal(medida.linhasLargas, 0, 'nenhuma linha do espécime passa da largura do bloco');
  assert.deepEqual(medida.linguagens, ['bash', 'javascript', 'json', 'latex', 'python', 'r', 'sql']);
  assert.equal(medida.semLinhas, 0);
  assert.deepEqual(erros, []);
  assert.deepEqual(await classesForaDoContrato(pagina), []);
});

test('bloco em Geist Mono 20 px com régua de 2 px acima; palavras-chave em 600, comentários em cinza, o resto em tinta', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const pre = document.querySelector('#linhas-marcadas pre');
    const estilo = getComputedStyle(pre);
    const chave = pre.querySelector('.palavra-chave');
    const comentario = document.querySelector('#javascript-e-bash pre[data-lang="bash"] .comentario');
    return {
      fonte: [estilo.fontFamily.split(',')[0].replaceAll('"', ''), estilo.fontSize, estilo.lineHeight],
      regua: [estilo.borderTopWidth, estilo.borderTopStyle, estilo.borderTopColor],
      texto: estilo.color,
      chave: [chave.textContent, getComputedStyle(chave).fontWeight, getComputedStyle(chave).color],
      comentario: [comentario.textContent, getComputedStyle(comentario).fontWeight, getComputedStyle(comentario).color],
      // A linha 3 do JavaScript é vazia, marcada e sem número: só a altura mínima a mantém no campo amarelo.
      alturas: [...new Set([...document.querySelectorAll('#linhas-marcadas pre .linha, #javascript-e-bash pre[data-lang="javascript"] .linha')]
        .map((linha) => linha.getBoundingClientRect().height))],
    };
  });
  assert.deepEqual(medida.fonte, ['Geist Mono', '20px', '29px']);
  assert.deepEqual(medida.regua, ['2px', 'solid', TINTA]);
  assert.equal(medida.texto, TINTA);
  assert.deepEqual(medida.chave, ['import', '600', TINTA]);
  assert.deepEqual(medida.comentario, ['# um modelo por arquivo', '400', CINZA]);
  assert.deepEqual(medida.alturas, [29], 'toda linha, a vazia inclusive, tem a altura de uma linha');
});

test('linha marcada em campo amarelo da largura do bloco; nela, comentário e número em tinta; fora dela, número em cinza', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const pre = document.querySelector('#linhas-marcadas pre');
    const caixa = pre.getBoundingClientRect();
    const linhas = [...pre.querySelectorAll('.linha')];
    const marcada = linhas[5];
    const campo = marcada.getBoundingClientRect();
    return {
      marcadas: linhas.flatMap((linha, k) => (linha.classList.contains('marcada') ? [k + 1] : [])),
      campo: getComputedStyle(marcada).backgroundColor,
      margens: [campo.left - caixa.left, caixa.right - campo.right],
      fundoDaLinhaComum: getComputedStyle(linhas[0]).backgroundColor,
      comentarioNaMarcada: getComputedStyle(marcada.querySelector('.comentario')).color,
      numeros: [getComputedStyle(linhas[0], '::before').color, getComputedStyle(marcada, '::before').color],
    };
  });
  assert.deepEqual(medida.marcadas, [6, 7]);
  assert.equal(medida.campo, AMARELO);
  perto(medida.margens[0], 0, 'o campo começa na borda esquerda do bloco');
  perto(medida.margens[1], 0, 'o campo termina na borda direita do bloco');
  assert.equal(medida.fundoDaLinhaComum, TRANSPARENTE);
  assert.equal(medida.comentarioNaMarcada, TINTA);
  assert.deepEqual(medida.numeros, [CINZA, TINTA]);
});

test('data-numeros põe os números numa margem de 4 caracteres, fora do texto: copiar do slide traz o código exato', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const inicio = (seletor) => {
      const pre = document.querySelector(seletor);
      return pre.querySelector('.linha > .palavra-chave').getBoundingClientRect().left - pre.getBoundingClientRect().left;
    };
    const pre = document.querySelector('#linhas-marcadas pre');
    return {
      semNumeros: inicio('#javascript-e-bash pre[data-lang="bash"]'),
      comNumeros: inicio('#linhas-marcadas pre'),
      copia: pre.innerText,
      texto: pre.textContent,
    };
  });
  perto(medida.semNumeros, 8, 'sem números, o código começa no recuo do bloco');
  perto(medida.comNumeros, 8 + 4 * 12, 'com números, depois de 2 caracteres de número e 2 de espaço');
  assert.equal(medida.copia, medida.texto);
  assert.deepEqual(medida.copia.split('\n').slice(0, 3), ['import numpy as np', '', 'def descida(w, x, y, eta=0.1, passos=100):']);
});

test('16 linhas cabem sob um título de uma linha, acima da base da zona de conteúdo', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const pre = document.querySelector('#dezesseis-linhas pre');
    return { linhas: pre.querySelectorAll('.linha').length, base: pre.getBoundingClientRect().bottom - pre.closest('section').getBoundingClientRect().top };
  });
  assert.equal(medida.linhas, 16);
  assert.ok(medida.base <= 652, `o bloco termina em ${medida.base}`);
});

test('linguagem fora da lista vira linhas sem destaque, com a mensagem no console; code dentro de pre e entidades funcionam; pre sem data-lang fica', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/codigo/');
  t.after(() => fixtures.fechar());
  const { pagina, erros } = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => pagina.close());
  const medida = await pagina.evaluate(() => {
    const [cobol, python, cru] = document.querySelectorAll('pre');
    return {
      cobol: [...cobol.querySelectorAll('.linha')].map((linha) => `${linha.className}|${linha.textContent}`),
      destaquesNoCobol: cobol.querySelectorAll('.palavra-chave, .comentario').length,
      python: [python.textContent, python.querySelector('code'), python.querySelector('.palavra-chave').textContent],
      cru: cru.innerHTML,
    };
  });
  assert.deepEqual(medida.cobol, ['linha|MOVE 1 TO CONTADOR.', 'linha marcada|DISPLAY CONTADOR.']);
  assert.equal(medida.destaquesNoCobol, 0);
  assert.deepEqual(medida.python, ['if a < b and b > c:  # compara\n    print("a & b")', null, 'if']);
  assert.equal(medida.cru, 'sem data-lang, fica como está');
  assert.deepEqual(erros, ['Aula USP: código com linguagem fora da lista em data-lang: "cobol"']);
  assert.deepEqual(await classesForaDoContrato(pagina), []);
});

test('código dentro de um campo segue a cor do campo: nada de cinza sobre amarelo nem tinta sobre tinta', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/codigo/');
  t.after(() => fixtures.fechar());
  const { pagina } = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => pagina.close());
  const medida = await pagina.evaluate(() => {
    const estilo = (seletor, pseudo) => getComputedStyle(document.querySelector(seletor), pseudo ?? null);
    return {
      destaque: [
        estilo('#em-campos aside.destaque pre').color,
        estilo('#em-campos aside.destaque pre').borderTopColor,
        estilo('#em-campos aside.destaque .linha:not(.marcada) .comentario').color,
        estilo('#em-campos aside.destaque .linha:not(.marcada)', '::before').color,
        estilo('#em-campos aside.destaque .marcada .comentario').color,
      ],
      alerta: [
        estilo('#em-campos aside.alerta pre').color,
        estilo('#em-campos aside.alerta pre').borderTopColor,
        estilo('#em-campos aside.alerta .comentario').color,
      ],
    };
  });
  assert.deepEqual(medida.destaque, [TINTA, TINTA, TINTA, TINTA, TINTA], 'no campo amarelo, tudo em tinta');
  assert.deepEqual(medida.alerta, [PAPEL, PAPEL, PAPEL], 'no campo escuro, tudo em papel');
});

test('carga sob demanda: só as gramáticas das linguagens usadas; sem pre[data-lang], nada do Shiki; sem TeX, nada do KaTeX', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/codigo/');
  t.after(() => fixtures.fechar());
  const soPython = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => soPython.pagina.close());
  const gramaticas = modulosPedidos(soPython.pedidos).filter((modulo) => modulo.startsWith('@shikijs/langs/'));
  assert.deepEqual(gramaticas, ['@shikijs/langs/dist/python.mjs']);
  assert.ok(!modulosPedidos(soPython.pedidos).some((modulo) => modulo.startsWith('katex/')), 'aula sem TeX pediu o KaTeX');

  const matematica = await abrirAula(navegador, `${servidor.endereco}/matematica.html?folha`);
  t.after(() => matematica.pagina.close());
  assert.ok(modulosPedidos(matematica.pedidos).includes('katex/dist/katex.mjs'));
  assert.ok(!modulosPedidos(matematica.pedidos).some((modulo) => modulo.startsWith('@shikijs/')), 'aula sem código pediu o Shiki');

  // componentes.html tem um gráfico desde a Tarefa 6 da fase 2a e nenhum código nem TeX: pede o d3
  // (e só o d3 e a árvore dele), nada do Shiki, nada do KaTeX. Cada módulo pedido tem de ser da
  // árvore do d3 — se um dia ele pedir o Shiki ou o KaTeX, esta asserção cai com o nome do intruso.
  const componentes = await abrirAula(navegador, `${servidor.endereco}/componentes.html?folha`);
  t.after(() => componentes.pagina.close());
  const pedidosComponentes = modulosPedidos(componentes.pedidos);
  assert.ok(pedidosComponentes.some((modulo) => modulo.startsWith('d3-scale/')), 'aula com gráfico não pediu o d3-scale');
  assert.deepEqual(pedidosComponentes.filter((modulo) => !/^(d3-[a-z-]+|internmap)\//.test(modulo)), [],
    'aula com gráfico e sem código nem TeX pediu módulo fora da árvore do d3');
});
