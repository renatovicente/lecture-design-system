// `aula-usp roteiro <arquivo.md> <pasta> [--substituir]` (spec 2026-09-28, 6.2; plano do gerar, D5).
// A conversão em si é de tests/unit/roteiro.test.mjs; aqui, o que é do comando: a pasta, a recusa sem
// escrita, as figuras, os códigos de saída e as flags. `--substituir` é booleana aqui e leva valor em
// `slide`: os dois lados estão provados neste arquivo.
//
// O comando roda `validar` depois de escrever, e `validar` usa o Chrome quando há: sem ele, a
// composição é pulada com aviso (spec 8.1) e o código de saída continua o dos outros grupos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');
const EXEMPLO = join(RAIZ, 'tests/fixtures/roteiro/exemplo-spec');

function rodar(...argumentos) {
  const { status, stdout, stderr } = spawnSync('node', [CLI, ...argumentos], { encoding: 'utf8' });
  return { status, stdout, stderr };
}

// Uma cópia do exemplo da spec numa pasta temporária, e o caminho de uma pasta de aula que não existe.
//
// SEM a meta `video: canto`, de propósito: com ela, e com Chrome, o slide #variancia do exemplo entra no
// canto do vídeo (composicao.canto-video, dois erros, medido na Tarefa 2) e `validar` sai com 1; sem
// Chrome, a composição é pulada e sai com 0. Um teste de CLI cujo código de saída dependesse de haver
// Chrome não diria nada. O exemplo literal, com a meta e com Chrome, está em
// tests/integracao/roteiro.test.mjs, com os dois erros presos lá.
function copiaDoExemplo() {
  const base = mkdtempSync(join(tmpdir(), 'aula-usp-roteiro-cli-'));
  cpSync(EXEMPLO, join(base, 'fonte'), { recursive: true });
  const roteiro = join(base, 'fonte/roteiro.md');
  writeFileSync(roteiro, readFileSync(roteiro, 'utf8').replace('video: canto\n', ''));
  return { roteiro, pasta: join(base, 'aula'), base };
}

test('pasta nova: escreve index.html, copia a figura para img/ e roda validar, saindo com o código dele', () => {
  const { roteiro, pasta } = copiaDoExemplo();
  const { status, stdout, stderr } = rodar('roteiro', roteiro, pasta);
  assert.equal(status, 0, `${stdout}\n${stderr}`);
  const html = readFileSync(join(pasta, 'index.html'), 'utf8');
  assert.match(html, /<h1>Passeio aleatório<br><span class="sinal">e difusão<\/span><\/h1>/);
  assert.deepEqual(readFileSync(join(pasta, 'img/nuvem.png')), readFileSync(join(EXEMPLO, 'img/nuvem.png')));
  assert.match(stdout, /index\.html gerado de .*roteiro\.md: 5 slides, 1 figura/);
  // A saída de validar vem junto: o cabeçalho de contagem que `aula-usp validar` imprime.
  assert.match(stdout, /0 erros/);
});

test('a tag do runtime é a do modelo, byte a byte', () => {
  const { roteiro, pasta } = copiaDoExemplo();
  rodar('roteiro', roteiro, pasta);
  const tag = (texto) => /<script src="[^"]*aula-usp\.js"[^>]*><\/script>/.exec(texto)[0];
  assert.equal(tag(readFileSync(join(pasta, 'index.html'), 'utf8')), tag(readFileSync(join(RAIZ, 'modelos/aula/index.html'), 'utf8')));
});

test('pasta com index.html: recusada com 2 sem --substituir, e trocada com ele', () => {
  const { roteiro, pasta } = copiaDoExemplo();
  mkdirSync(pasta);
  writeFileSync(join(pasta, 'index.html'), 'antes');
  writeFileSync(join(pasta, 'outro.txt'), 'fica');
  const recusa = rodar('roteiro', roteiro, pasta);
  assert.equal(recusa.status, 2);
  assert.match(recusa.stderr, /já tem index\.html.*--substituir/);
  assert.equal(readFileSync(join(pasta, 'index.html'), 'utf8'), 'antes');

  const troca = rodar('roteiro', roteiro, pasta, '--substituir');
  assert.equal(troca.status, 0, `${troca.stdout}\n${troca.stderr}`);
  assert.match(readFileSync(join(pasta, 'index.html'), 'utf8'), /^<!DOCTYPE html>/);
  assert.equal(readFileSync(join(pasta, 'outro.txt'), 'utf8'), 'fica', '--substituir troca o index.html, não esvazia a pasta');
});

test('erro de roteiro: sai com 1, uma linha por erro com o arquivo e a linha, e não escreve nada', () => {
  const { roteiro, pasta } = copiaDoExemplo();
  writeFileSync(roteiro, readFileSync(roteiro, 'utf8').replace('## figura:', '## resumo:').replace('[destaque:', '[aviso:'));
  const { status, stdout, stderr } = rodar('roteiro', roteiro, pasta);
  assert.equal(status, 1, stdout);
  assert.deepEqual(stderr.trim().split('\n'), [
    `${roteiro}:18 · marcação desconhecida [aviso: …]; use [destaque: …], [quadro: …], [alerta: …]`,
    `${roteiro}:22 · layout "resumo" não existe; use um de: abertura, conteudo, afirmacao, figura, demo, encerramento`,
  ]);
  assert.equal(existsSync(pasta), false, 'com erro de roteiro, a pasta nem é criada');
});

test('figura ausente é erro de roteiro, com a linha, e nada é escrito', () => {
  const { roteiro, pasta, base } = copiaDoExemplo();
  writeFileSync(roteiro, readFileSync(roteiro, 'utf8').replace('img/nuvem.png', 'img/sumiu.png'));
  const { status, stderr } = rodar('roteiro', roteiro, pasta);
  assert.equal(status, 1);
  assert.equal(stderr.trim(), `${roteiro}:23 · a figura "img/sumiu.png" não existe ao lado do roteiro`);
  assert.equal(existsSync(pasta), false);
  assert.ok(existsSync(join(base, 'fonte/img/nuvem.png')));
});

test('uso: flag de outro comando, pasta ausente ou um posicional a mais saem com 2', () => {
  const { roteiro, pasta } = copiaDoExemplo();
  for (const argumentos of [
    [roteiro, pasta, '--json'],
    [roteiro, pasta, '--forcar'],
    [roteiro, pasta, '--porta', '9000'],
    [roteiro],
    [],
    // --substituir é booleana em `roteiro`: o que vem depois dela é um terceiro posicional, não o valor dela.
    [roteiro, pasta, '--substituir', 'outro.html'],
  ]) {
    const { status, stderr } = rodar('roteiro', ...argumentos);
    assert.equal(status, 2, `roteiro ${argumentos.join(' ')}`);
    assert.match(stderr, /uso: aula-usp/);
  }
  assert.equal(existsSync(pasta), false);
});

test('roteiro inexistente sai com 2', () => {
  const { base } = copiaDoExemplo();
  const { status, stderr } = rodar('roteiro', join(base, 'nao-existe.md'), join(base, 'aula'));
  assert.equal(status, 2);
  assert.match(stderr, /não encontrei o roteiro/);
});

test('em `slide`, --substituir continua levando valor: sem ele, é engano de uso', () => {
  const pasta = join(mkdtempSync(join(tmpdir(), 'aula-usp-roteiro-slide-')), 'aula');
  cpSync(join(RAIZ, 'modelos/aula'), pasta, { recursive: true, filter: (caminho) => !caminho.endsWith('/dist') });
  assert.equal(rodar('slide', pasta, '2', '--substituir').status, 2);
  const secao = rodar('slide', pasta, '2').stdout;
  const arquivo = join(pasta, '..', 'secao.html');
  writeFileSync(arquivo, secao);
  const troca = rodar('slide', pasta, '2', '--substituir', arquivo);
  assert.equal(troca.status, 0, troca.stderr);
});
