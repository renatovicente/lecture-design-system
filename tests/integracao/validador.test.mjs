// A CLI sobre o espécime servido (spec 8.1): o que o autor vê ao rodar o comando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');

// Marco 4c, Task 4: esta chamada roda os três grupos — estático, carga e, havendo Chrome (há, neste
// ambiente), composição (spec 8.1). "0 erros, 0 avisos" com os três ligados é a prova de que eles
// convivem: se a composição achasse algo no espécime, apareceria aqui, sem precisar de outro teste.
test('validar especime/ não acha nada e sai com 0, com estática, carga e composição rodando juntas', () => {
  const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime')], { encoding: 'utf8' });
  assert.equal(saida.trim(), 'Validador Aula USP: 0 erros, 0 avisos');
});

test('validar sem argumento explica o uso e sai com 2', () => {
  try {
    execFileSync('node', [CLI, 'validar'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

test('cada deck do espécime valida com o que a spec espera', () => {
  const limpos = ['componentes', 'matematica', 'codigo', 'ifusp', 'video'];
  for (const nome of limpos) {
    const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, `especime/${nome}.html`)], { encoding: 'utf8' });
    assert.match(saida, /^Validador Aula USP: 0 erros, 0 avisos$/m, `${nome}.html deveria estar limpo`);
  }
  const muitos = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime/muitos-blocos.html')], { encoding: 'utf8' });
  assert.match(muitos, /^Validador Aula USP: 0 erros, 10 avisos$/m);
});

// 1.0.1 (D5): disciplina e aula são opcionais. Uma aula sem as duas valida limpa, com os três grupos
// rodando — composição inclusive, que é onde um cromo desalinhado apareceria.
test('uma aula sem as metas disciplina e aula valida limpa, com composição', () => {
  const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, 'tests/fixtures/metas/sem-disciplina-e-aula.html')], { encoding: 'utf8' });
  assert.equal(saida.trim(), 'Validador Aula USP: 0 erros, 0 avisos');
});
