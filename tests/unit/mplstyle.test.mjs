import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gerarMplstyle } from '../../build/mplstyle.mjs';
import { lerTokens, simplificar } from '../../build/tokens.mjs';

const raiz = new URL('../../', import.meta.url);
const tokens = await lerTokens();
const s = simplificar(tokens);

// Não há Python no projeto (spec 8.2): nenhum teste aqui pode carregar o arquivo num
// matplotlib de verdade. A cobertura é textual — regerar-e-comparar (fraca sozinha) mais
// uma propriedade do resultado que a igualdade, por construção, não vê.

test('assets/aula-usp.mplstyle no repositório está atualizado', async () => {
  assert.equal(await readFile(new URL('assets/aula-usp.mplstyle', raiz), 'utf8'), gerarMplstyle(tokens));
});

test('propriedade: o ciclo de cores é tinta, azul, cinza dos tokens, e nenhuma cor leva "#"', () => {
  const mplstyle = gerarMplstyle(tokens);
  const linhaCiclo = mplstyle.split('\n').find((l) => l.startsWith('axes.prop_cycle'));
  assert.ok(linhaCiclo, 'linha axes.prop_cycle não encontrada');

  const cores = [s.cor.tinta, s.cor.azul, s.cor.cinza].map((hex) => hex.replace(/^#/, ''));
  assert.equal(linhaCiclo, `axes.prop_cycle: cycler('color', ['${cores.join("', '")}'])`);

  // A restrição mais afiada do formato: em .mplstyle, "#" abre comentário até o fim da
  // linha — uma cor colada com "#" apagaria a linha inteira, em silêncio. Nenhuma cor do
  // ciclo, nem a de grid.color, pode carregar o prefixo em lugar nenhum do arquivo.
  for (const hex of cores) assert.ok(!mplstyle.includes(`#${hex}`), `cor ${hex} aparece com "#"`);
  assert.ok(!mplstyle.includes(`#${s.cor.linha.replace(/^#/, '')}`), 'grid.color aparece com "#"');
});

test('eixos de 2 px sem bordas superior e direita, grade horizontal em "linha" (spec 7.2)', () => {
  const mplstyle = gerarMplstyle(tokens);
  assert.match(mplstyle, new RegExp(`axes\\.linewidth: ${s.regua.normal}$`, 'm'));
  assert.match(mplstyle, /^axes\.spines\.top: False$/m);
  assert.match(mplstyle, /^axes\.spines\.right: False$/m);
  assert.match(mplstyle, /^axes\.grid: True$/m);
  assert.match(mplstyle, /^axes\.grid\.axis: y$/m);
  assert.match(mplstyle, new RegExp(`^grid\\.color: ${s.cor.linha.replace(/^#/, '')}$`, 'm'));
  assert.match(mplstyle, new RegExp(`^font\\.family: ${s.fonte.sans[0]}$`, 'm'));
});
