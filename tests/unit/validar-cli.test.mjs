// Cola de Node do validador (spec 8.1 e 9.3): lê a aula do disco e devolve os achados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarArquivo } from '../../build/validar.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');

function aulaTemporaria(html) {
  const pasta = mkdtempSync(join(tmpdir(), 'aula-usp-'));
  writeFileSync(join(pasta, 'index.html'), html);
  return pasta;
}

const BOA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof."></head><body>
<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="abertura" id="um"><h2>Um</h2></section>
<section data-layout="abertura" id="dois"><h2>Dois</h2></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

test('o espécime passa sem erro nas regras estáticas de estrutura', () => {
  const { erros } = validarArquivo(join(RAIZ, 'especime/index.html'));
  assert.equal(erros, 0);
});

test('todos os decks do espécime passam sem erro', () => {
  for (const nome of ['index', 'componentes', 'matematica', 'codigo', 'ifusp', 'muitos-blocos']) {
    const { achados, erros } = validarArquivo(join(RAIZ, `especime/${nome}.html`));
    assert.equal(erros, 0, `${nome}.html: ${achados.filter((a) => a.severidade === 'erro').map((a) => a.mensagem).join(' / ')}`);
  }
});

test('só muitos-blocos.html tem avisos, e são os que aquele deck existe para exercer', () => {
  for (const nome of ['index', 'componentes', 'matematica', 'codigo', 'ifusp']) {
    const { achados } = validarArquivo(join(RAIZ, `especime/${nome}.html`));
    assert.deepEqual(achados, [], `${nome}.html deveria estar limpo`);
  }
  const { achados } = validarArquivo(join(RAIZ, 'especime/muitos-blocos.html'));
  assert.deepEqual(new Set(achados.map((a) => a.regra)), new Set(['estrutura.blocos', 'estrutura.id-ausente']));
});

test('a CLI sai com 0 na aula boa e imprime o cabeçalho', () => {
  const saida = execFileSync('node', [CLI, 'validar', aulaTemporaria(BOA)], { encoding: 'utf8' });
  assert.match(saida, /^Validador Aula USP: 0 erros, 0 avisos$/m);
});

test('a CLI sai com 1 e imprime a mensagem quando há erro', () => {
  const pasta = aulaTemporaria(BOA.replace('<section data-layout="capa"><h1>Capa</h1></section>', ''));
  try {
    execFileSync('node', [CLI, 'validar', pasta], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    assert.equal(erro.status, 1);
    assert.match(erro.stdout, /ERRO · slide 1 #um · estrutura\.primeiro-slide ·/);
  }
});

test('--json devolve a lista com os campos da spec 9.1', () => {
  const pasta = aulaTemporaria(BOA.replace('<h2>Dois</h2>', '<h2>Retropropagação</h2>'));
  try {
    execFileSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    const [achado, ...resto] = JSON.parse(erro.stdout);
    assert.equal(resto.length, 0);
    assert.deepEqual(Object.keys(achado), ['severidade', 'slide', 'id', 'regra', 'mensagem', 'acao', 'trecho']);
    assert.equal(achado.regra, 'estrutura.nome-curto');
    assert.equal(achado.slide, 3);
  }
});

test('pasta sem index.html sai com 2', () => {
  try {
    execFileSync('node', [CLI, 'validar', mkdtempSync(join(tmpdir(), 'vazia-'))], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /não encontrei/);
  }
});

test('um arquivo também pode ser validado direto', () => {
  const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime/matematica.html')], { encoding: 'utf8' });
  assert.match(saida, /0 erros/);
});
