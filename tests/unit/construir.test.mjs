// Amarra as três tarefas e grava. O pipeline completo, com os códigos de saída da spec 3.3, é do 5c.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
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

// I2 (revisão final do 5b): construirHtml já enxergava o TeX quebrado (errosDeTex), mas construir()
// descartava o canal na desestruturação — a aula construía, e validacao.json saía limpo. Medido antes
// deste conserto: erros: 0, achados: [] para esta mesma fixture.
test('uma aula com TeX inválido constrói com erros > 0 e o validacao.json cita matematica.tex-invalido', async () => {
  const destino = await pastaTemporaria();
  const caminhoDaAula = new URL('../fixtures/construir/aula-com-tex-invalido/aula.html', import.meta.url);
  const { achados, erros } = await construir({ raiz: RAIZ, caminhoDaAula, destino });
  assert.ok(erros > 0, `esperava erros > 0, veio ${erros}`);
  const relatorio = JSON.parse(await readFile(join(destino, 'validacao.json'), 'utf8'));
  assert.ok(relatorio.some((achado) => achado.regra === 'matematica.tex-invalido'),
    `validacao.json não cita matematica.tex-invalido: ${JSON.stringify(relatorio.map((a) => a.regra))}`);
});

// Mesmo defeito, canal de código: prerenderizarCodigo já relata "linguagem fora da lista em
// data-lang" (errosDeCodigo) para a mesma condição que recursos.linguagem nomeia — construir() não
// pode descartar este canal também.
test('uma aula com data-lang fora do contrato constrói com erros > 0 e o validacao.json cita recursos.linguagem', async () => {
  const destino = await pastaTemporaria();
  const caminhoDaAula = new URL('../fixtures/construir/aula-com-codigo-invalido/aula.html', import.meta.url);
  const { achados, erros } = await construir({ raiz: RAIZ, caminhoDaAula, destino });
  assert.ok(erros > 0, `esperava erros > 0, veio ${erros}`);
  const daRegra = achados.filter((achado) => achado.regra === 'recursos.linguagem');
  assert.equal(daRegra.length, 1, `esperava 1 achado de recursos.linguagem, veio ${daRegra.length}`);
  assert.match(daRegra[0].mensagem, /cobol/);
});

// Mesmo defeito, canal de diagrama (fase 2b): prerenderizarDiagramas relata o DOT que o Graphviz não
// desenhou, e construir() não pode descartar o canal — foi assim que errosDeGrafico nasceu na 2a,
// devolvido e nunca lido. Dentro de `aula-usp build` a etapa 1 para antes; aqui, construir() direto.
test('uma aula com DOT inválido constrói com erros > 0 e o validacao.json cita recursos.dot com a mensagem do Graphviz', async () => {
  const destino = await pastaTemporaria();
  const caminhoDaAula = new URL('../fixtures/construir/aula-com-dot-invalido/aula.html', import.meta.url);
  const { achados, erros } = await construir({ raiz: RAIZ, caminhoDaAula, destino });
  assert.ok(erros > 0, `esperava erros > 0, veio ${erros}`);
  const daRegra = achados.filter((achado) => achado.regra === 'recursos.dot');
  assert.equal(daRegra.length, 1, `esperava 1 achado de recursos.dot, veio ${daRegra.length}`);
  assert.match(daRegra[0].mensagem, /syntax error in line 1 near ';'/);
  assert.equal(daRegra[0].trecho, 'digraph { a -> ; }');
});

// I7 da revisão final do 5c: `slugDaAula` era `basename(dirname(caminhoDaAula))` — o nome da PASTA —
// para QUALQUER alvo, e `caminhoDaAula` (build/validar.mjs) aceita pasta ou arquivo de propósito.
// Com alvo-arquivo, dois decks na mesma pasta produziam o mesmo `<slug>.html` e um apagava o outro
// em silêncio (medido, antes desta correção: os dois construíram em `<nome da pasta>.html`). Regra
// decidida pelo controlador: pasta quando o alvo resolveu para `index.html` — a forma que a spec 3.3
// descreve —, basename do arquivo sem `.html` nas outras. O par completo `.html`/`.pdf`, que precisa
// das etapas 5 e 6, está em tests/integracao/slug.test.mjs; aqui fica a metade sem navegador.
test('<slug>: index.html dá o nome da pasta; outro arquivo dá o nome do arquivo', async () => {
  const pasta = await pastaTemporaria();
  const original = await readFile(new URL('../fixtures/build/aula-limpa/aula.html', import.meta.url), 'utf8');
  await writeFile(join(pasta, 'index.html'), original, 'utf8');
  await writeFile(join(pasta, 'primeira.html'), original, 'utf8');
  const destino = join(pasta, 'dist');
  const daPasta = await construir({ raiz: RAIZ, caminhoDaAula: pathToFileURL(join(pasta, 'index.html')), destino });
  const doArquivo = await construir({ raiz: RAIZ, caminhoDaAula: pathToFileURL(join(pasta, 'primeira.html')), destino });
  assert.equal(basename(daPasta.caminhoDoHtml), `${basename(pasta)}.html`);
  assert.equal(basename(doArquivo.caminhoDoHtml), 'primeira.html');
});
