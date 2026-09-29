// `aula-usp avaliar` (spec 2026-09-28, 4.1): códigos de saída, flags, --json, --slide e a aula com
// erro de validação. Sem Chrome: --fotos, que é o único caminho que o usa, entra aqui só pela falta
// dele (CHROME_PATH inexistente); a foto de verdade é tests/integracao/avaliar-fotos.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');
const FIXTURES = join(RAIZ, 'tests/fixtures/avaliador');
const rubrica = JSON.parse(readFileSync(join(RAIZ, 'avaliador/rubrica.json'), 'utf8'));

function rodar(argumentos, env = {}) {
  const { status, stdout, stderr } = spawnSync('node', [CLI, ...argumentos], { encoding: 'utf8', env: { ...process.env, ...env } });
  return { status, stdout, stderr };
}

const RUIM = join(FIXTURES, 'titulo-rotulo/ruim.html');
const BOM = join(FIXTURES, 'titulo-rotulo/bom.html');

test('avaliar sai com 0 numa aula sem achados e imprime o resumo', () => {
  const { status, stdout } = rodar(['avaliar', BOM]);
  assert.equal(status, 0);
  assert.match(stdout, /^Avaliação Aula USP: 0 alertas, 0 conselhos$/m);
});

test('avaliar sai com 0 também com alertas: avaliar não é validar', () => {
  const { status, stdout } = rodar(['avaliar', RUIM]);
  assert.equal(status, 0);
  assert.match(stdout, /^ALERTA · slide 5 #desvio · titulo-rotulo \(N3\) · /m);
  assert.match(stdout, /^Avaliação Aula USP: 1 alerta, 0 conselhos$/m);
  assert.match(stdout, /^ {2}titulo-rotulo \(N3\) · 1 alerta, 0 conselhos$/m);
});

test('--json imprime só o objeto { achados, resumo }, bem formado', () => {
  const { status, stdout } = rodar(['avaliar', RUIM, '--json']);
  assert.equal(status, 0);
  const saida = JSON.parse(stdout);
  assert.deepEqual(Object.keys(saida).sort(), ['achados', 'resumo']);
  assert.equal(saida.achados.length, 1);
  assert.deepEqual(Object.keys(saida.achados[0]).sort(), ['acao', 'criterio', 'fonte', 'id', 'mensagem', 'nivel', 'slide', 'tipo', 'trecho']);
  assert.deepEqual(saida.resumo.total, { alertas: 1, conselhos: 0 });
  const medidos = Object.keys(rubrica.criterios).filter((id) => rubrica.criterios[id].tipo === 'medido');
  assert.deepEqual(Object.keys(saida.resumo.criterios).sort(), medidos.sort());
});

test('--slide aceita o id e a posição, e avalia só aquele slide', () => {
  const porId = JSON.parse(rodar(['avaliar', RUIM, '--slide', 'desvio', '--json']).stdout);
  const porNumero = JSON.parse(rodar(['avaliar', RUIM, '--slide', '5', '--json']).stdout);
  assert.equal(porId.achados.length, 1);
  assert.deepEqual(porNumero, porId);
  const outro = JSON.parse(rodar(['avaliar', RUIM, '--slide', '3', '--json']).stdout);
  assert.deepEqual(outro.achados, []);
  // Os critérios de aula ficam de fora com --slide: o ruim de so-texto não acusa nada num slide só.
  const soTexto = JSON.parse(rodar(['avaliar', join(FIXTURES, 'so-texto/ruim.html'), '--slide', 'desvio', '--json']).stdout);
  assert.deepEqual(soTexto.achados, []);
});

test('--slide que não existe sai com 2 e diz qual', () => {
  const { status, stderr } = rodar(['avaliar', RUIM, '--slide', 'nao-existe']);
  assert.equal(status, 2);
  assert.match(stderr, /não há slide "nao-existe"/);
});

test('--minutos liga o critério tempo, e só aceita inteiro positivo', () => {
  const tempo = join(FIXTURES, 'tempo/ruim.html');
  const com = JSON.parse(rodar(['avaliar', tempo, '--minutos', '2', '--json']).stdout);
  assert.deepEqual(com.achados.map((a) => a.criterio), ['tempo']);
  const sem = JSON.parse(rodar(['avaliar', tempo, '--json']).stdout);
  assert.deepEqual(sem.achados, []);
  for (const valor of ['0', '-3', '2.5', 'dez', '']) {
    const { status, stderr } = rodar(['avaliar', tempo, '--minutos', valor]);
    assert.equal(status, 2, `--minutos ${JSON.stringify(valor)}`);
    assert.match(stderr, /^uso: /);
  }
});

test('uma flag com valor sem o valor sai com o uso e 2', () => {
  for (const flag of ['--slide', '--minutos', '--fotos']) {
    const { status, stderr } = rodar(['avaliar', RUIM, flag]);
    assert.equal(status, 2, flag);
    assert.match(stderr, /^uso: /);
  }
});

test('as flags de avaliar não vazam para os outros comandos, nem as deles para avaliar', () => {
  const casos = [
    ['validar', BOM, '--minutos', '3'],
    ['validar', BOM, '--slide', '2'],
    ['build', BOM, '--fotos', 'x'],
    ['avaliar', BOM, '--porta', '8000'],
    ['avaliar', BOM, '--sem-pdf'],
    ['avaliar', BOM, '--unidade', 'ime'],
    ['avaliar', BOM, '--inexistente'],
  ];
  for (const argumentos of casos) {
    const { status, stderr } = rodar(argumentos);
    assert.equal(status, 2, argumentos.join(' '));
    assert.match(stderr, /^uso: /, argumentos.join(' '));
  }
});

test('uma aula com erro de validação não é avaliada: "valide primeiro", e saída 0', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'aula-usp-avaliar-'));
  const html = readFileSync(RUIM, 'utf8').replace(/<section data-layout="capa">[\s\S]*?<\/section>/, '');
  writeFileSync(join(pasta, 'index.html'), html);
  const texto = rodar(['avaliar', pasta]);
  assert.equal(texto.status, 0);
  assert.match(texto.stdout, /^valide primeiro: 1 erro\b/m);
  assert.doesNotMatch(texto.stdout, /ALERTA|CONSELHO/);
  const json = rodar(['avaliar', pasta, '--json']);
  assert.equal(json.status, 0);
  assert.deepEqual(JSON.parse(json.stdout), { achados: null, resumo: null, erros: 1, mensagem: 'valide primeiro: 1 erro' });
});

test('aula que não existe sai com 2', () => {
  const { status, stderr } = rodar(['avaliar', join(tmpdir(), 'aula-usp-nao-existe-avaliar')]);
  assert.equal(status, 2);
  assert.match(stderr, /não encontrei a aula/);
});

test('sem Chrome, avaliar funciona; só --fotos sai com 2, como falha de ambiente', () => {
  const semChrome = { CHROME_PATH: '/caminho/que/nao/existe/chrome' };
  assert.equal(rodar(['avaliar', RUIM], semChrome).status, 0);
  const pasta = join(mkdtempSync(join(tmpdir(), 'aula-usp-fotos-')), 'fotos');
  const { status, stderr, stdout } = rodar(['avaliar', RUIM, '--fotos', pasta], semChrome);
  assert.equal(status, 2);
  assert.match(stderr, /^falha de ambiente: sem Chrome para as fotos/m);
  assert.equal(stdout, '');
  assert.equal(existsSync(join(pasta, 'indice.json')), false);
});
