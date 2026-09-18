// A CLI sobre o espécime servido (spec 8.1): o que o autor vê ao rodar o comando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');

test('validar especime/ não acha nada e sai com 0', () => {
  const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime')], { encoding: 'utf8' });
  assert.equal(saida.trim(), 'Validador Aula USP: 0 erros, 0 avisos');
});

test('validar sem argumento explica o uso e sai com 2', () => {
  try {
    execFileSync('node', [CLI, 'validar'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp servir/);
  }
});

test('cada deck do espécime valida com o que a spec espera', () => {
  const limpos = ['componentes', 'matematica', 'codigo', 'ifusp'];
  for (const nome of limpos) {
    const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, `especime/${nome}.html`)], { encoding: 'utf8' });
    assert.match(saida, /^Validador Aula USP: 0 erros, 0 avisos$/m, `${nome}.html deveria estar limpo`);
  }
  const muitos = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime/muitos-blocos.html')], { encoding: 'utf8' });
  assert.match(muitos, /^Validador Aula USP: 0 erros, 10 avisos$/m);
});
