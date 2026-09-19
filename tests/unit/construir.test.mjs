// Amarra as três tarefas e grava. O pipeline completo, com os códigos de saída da spec 3.3, é do 5c.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { construir } from '../../build/construir.mjs';

const RAIZ = new URL('../../', import.meta.url);
const pastaTemporaria = () => mkdtemp(join(tmpdir(), 'construido-'));

test('grava o HTML e o validacao.json, e o HTML não tem referência externa', async () => {
  const destino = await pastaTemporaria();
  const { caminhoDoHtml, achados } = await construir({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), destino });
  const html = await readFile(caminhoDoHtml, 'utf8');
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  const relatorio = JSON.parse(await readFile(join(destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(relatorio, achados, 'o validacao.json tem de ser exatamente a lista de achados');
});

// A prova que fecha o marco: as regras de saída, rodadas sobre o próprio produto, não acham nada.
test('os seis decks do espécime constroem sem nenhum achado de saída', async () => {
  for (const deck of ['index.html', 'componentes.html', 'matematica.html', 'codigo.html', 'ifusp.html', 'muitos-blocos.html']) {
    const destino = await pastaTemporaria();
    const { achados } = await construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${deck}`, RAIZ), destino });
    const daSaida = achados.filter((achado) => achado.regra.startsWith('saida.'));
    assert.deepEqual(daSaida, [], `${deck} acusou: ${daSaida.map((a) => a.regra).join(', ')}`);
  }
});

// Rodada de correção 1, item 2: o teste acima só prova "rodou e não achou nada" — mutar
// `regras: REGRAS_DE_SAIDA` para `regras: []` em build/construir.mjs o deixa passando do mesmo jeito
// (medido). Esta fixture TEM uma referência externa de propósito (spec 5.5: <img src="https://…"> não
// é erro de embutir — é isso que o autor pediu), e por isso saida.referencia-externa TEM de aparecer;
// com o grupo desligado, ou a regra quebrada, este caso cai.
test('uma referência externa de propósito é acusada por saida.referencia-externa', async () => {
  const destino = await pastaTemporaria();
  const caminhoDaAula = new URL('../fixtures/construir/aula-com-referencia-externa/aula.html', import.meta.url);
  const { achados } = await construir({ raiz: RAIZ, caminhoDaAula, destino });
  const daRegra = achados.filter((achado) => achado.regra === 'saida.referencia-externa');
  assert.equal(daRegra.length, 1, `esperava 1 achado de saida.referencia-externa, veio ${daRegra.length}`);
});
