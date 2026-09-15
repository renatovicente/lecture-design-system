import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { lerMetadados, formatarData } from '../../montar/metadados.js';
import { rotulosPara, ROTULOS } from '../../motor/rotulos.js';

const documento = (cabeca, lang) => parseHTML(
  `<!DOCTYPE html><html${lang ? ` lang="${lang}"` : ''}><head>${cabeca}</head><body></body></html>`,
).document;

test('lerMetadados lê as cinco metas e o idioma', () => {
  const doc = documento(
    '<meta name="unidade" content="ime"><meta name="disciplina" content=" Redes Neurais ">'
    + '<meta name="aula" content="4"><meta name="data" content="2026-09-14">'
    + '<meta name="professor" content="Prof. Renato Vicente">',
    'en',
  );
  assert.deepEqual(lerMetadados(doc), {
    unidade: 'ime', disciplina: 'Redes Neurais', aula: '4', data: '2026-09-14',
    professor: 'Prof. Renato Vicente', lang: 'en',
  });
});

test('metas ausentes viram texto vazio e o idioma padrão é pt-BR', () => {
  assert.deepEqual(lerMetadados(documento('')), {
    unidade: '', disciplina: '', aula: '', data: '', professor: '', lang: 'pt-BR',
  });
});

test('formatarData usa o mês abreviado do idioma, sem zero à esquerda no dia', () => {
  assert.equal(formatarData('2026-09-14', 'pt-BR'), '14 set 2026');
  assert.equal(formatarData('2026-09-04', 'pt-BR'), '4 set 2026');
  assert.equal(formatarData('2026-09-14', 'en'), '14 Sep 2026');
  assert.equal(formatarData('2026-02-01', 'en-US'), '1 Feb 2026');
});

test('formatarData devolve a entrada quando ela não é uma data ISO válida', () => {
  assert.equal(formatarData('2026-13-01', 'pt-BR'), '2026-13-01');
  assert.equal(formatarData('14/09/2026', 'pt-BR'), '14/09/2026');
  assert.equal(formatarData('', 'pt-BR'), '');
});

test('rotulosPara escolhe en para variantes de inglês e pt-BR como padrão', () => {
  assert.equal(rotulosPara('en').introducao, 'Introduction');
  assert.equal(rotulosPara('en-GB').bloco, 'Block');
  assert.equal(rotulosPara('pt-BR').encerramento, 'Encerramento');
  assert.equal(rotulosPara(undefined), ROTULOS['pt-BR']);
  assert.equal(rotulosPara('fr'), ROTULOS['pt-BR']);
  assert.equal(ROTULOS['pt-BR'].meses.length, 12);
  assert.equal(ROTULOS.en.meses.length, 12);
});
