// O leitor de CSV dos gráficos (componentes/csv.js, spec 7.2: "dados" como caminho de CSV), o mesmo
// no build e no navegador. O que ele aceita e o que ele recusa estão no comentário do módulo; aqui,
// um teste para cada lado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { lerCsv, caminhosDeCsv, colunasDosCsvs } from '../../componentes/csv.js';

test('cabeçalho na primeira linha; colunas numéricas saem como números', () => {
  assert.deepEqual(lerCsv('epoca,treino,teste\n0,1,1.1\n20,0.71,0.9\n'), {
    epoca: [0, 20], treino: [1, 0.71], teste: [1.1, 0.9],
  });
});

test('coluna com algum campo não numérico sai como texto (as categorias de "barras")', () => {
  assert.deepEqual(lerCsv('turma,nota\nA,7\nB,8.5'), { turma: ['A', 'B'], nota: [7, 8.5] });
});

test('\\r\\n, linhas em branco, espaço em volta dos campos e BOM no início não atrapalham', () => {
  assert.deepEqual(lerCsv('﻿x , y\r\n\r\n 1 , 2 \r\n3,4\r\n\r\n'), { x: [1, 3], y: [2, 4] });
});

test('recusa, com a linha na mensagem, o que viraria uma coluna torta calada', () => {
  assert.throws(() => lerCsv(''), /CSV vazio/);
  assert.throws(() => lerCsv('x,y\n1,2,3'), /CSV com 3 campos na linha 2; o cabeçalho tem 2/);
  assert.throws(() => lerCsv('x,y\n1,'), /CSV com campo vazio na linha 2, coluna "y"/);
  assert.throws(() => lerCsv('x,x\n1,2'), /coluna "x" repetida/);
  assert.throws(() => lerCsv('x,\n1,2'), /nome de coluna vazio/);
});

// O que o leitor NÃO trata, fixado para ninguém achar que trata: vírgula decimal parte o campo em
// dois (e cai na contagem de campos), e aspas ficam no texto.
test('limites conhecidos: vírgula decimal e aspas não são tratadas', () => {
  assert.throws(() => lerCsv('x,y\n1,"0,5"'), /CSV com 3 campos na linha 2/);
  assert.deepEqual(lerCsv('nome,v\n"a",1'), { nome: ['"a"'], v: [1] });
});

// Os três que buscam CSV (build/carregar.mjs, build/embutir.mjs, montar/entrada.js) pedem a lista a
// esta função: só `dados` em texto, sem repetição, e nada de JSON quebrado ou de colunas inline.
test('caminhosDeCsv: os `dados` em texto dos gráficos, sem repetição, pulando inline e JSON inválido', () => {
  const figura = (json) => `<figure class="grafico"><script type="application/json">${json}</script></figure>`;
  const { document } = parseHTML(`<html><body>${[
    figura('{"tipo":"linha","dados":"data/a.csv","x":"x","y":["y"]}'),
    figura('{"tipo":"linha","dados":{"x":[1],"y":[2]},"x":"x","y":["y"]}'),
    figura('{ quebrado'),
    figura('{"tipo":"barras","dados":"data/b.csv?v=2","x":"x","y":["y"]}'),
    figura('{"tipo":"linha","dados":"data/a.csv","x":"x","y":["z"]}'),
  ].join('')}</body></html>`);
  assert.deepEqual(caminhosDeCsv(document), ['data/a.csv', 'data/b.csv?v=2']);
});

// O erro de um CSV malformado tem de nascer DENTRO de desenharGraficos (no try de cada gráfico), e
// não ao montar o mapa: é o getter que adia a leitura.
test('colunasDosCsvs: lê na hora da consulta, e um CSV malformado só lança quando é consultado', () => {
  const dados = colunasDosCsvs(new Map([['bom.csv', 'x,y\n1,2'], ['ruim.csv', 'x,y\n1']]));
  assert.deepEqual(Object.keys(dados), ['bom.csv', 'ruim.csv']);
  assert.deepEqual(dados['bom.csv'], { x: [1], y: [2] });
  assert.throws(() => dados['ruim.csv'], /CSV com 1 campos na linha 2/);
});
