// O leitor de CSV dos gráficos (build/csv.mjs, spec 7.2: "dados" como caminho de CSV no modo build).
// O que ele aceita e o que ele recusa estão no comentário do módulo; aqui, um teste para cada lado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerCsv } from '../../build/csv.mjs';

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
