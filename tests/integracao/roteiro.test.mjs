// `aula-usp roteiro` com Chrome de verdade (plano do gerar, Tarefa 2, Passo 3): a aula que o comando
// escreve passa por `validar` inteiro, composição incluída. Aqui a falta de Chrome é falha: um pulo da
// composição faria "0 erros" medir um grupo de regras a menos, e é esse grupo que separa os dois casos
// do primeiro teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarArquivo } from '../../build/validar.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');
const EXEMPLO = join(RAIZ, 'tests/fixtures/roteiro/exemplo-spec');
const DESCIDA = join(RAIZ, 'tests/fixtures/roteiro/descida-do-gradiente/roteiro.md');
const ORIGINAL = join(RAIZ, 'exemplos/descida-do-gradiente/index.html');

// Os slides do original que o roteiro não exprime (spec 6.1: o roteiro é esqueleto), e por isso ficam
// fora da fixture da ida e volta: o exercício, que tem div.exercicio. A aula não tem demo.
const FORA_DO_ROTEIRO = ['exercicio'];

function roteiro(arquivo, pasta) {
  return spawnSync('node', [CLI, 'roteiro', arquivo, pasta], { encoding: 'utf8' });
}

async function validarComChrome(pasta) {
  const resultado = await validarArquivo(pasta);
  assert.equal(resultado.avisoDeComposicao, null, `a composição não rodou: ${resultado.avisoDeComposicao}`);
  return resultado;
}

const secoes = (html) => [...html.matchAll(/<section data-layout="([^"]+)"(?: id="([^"]+)")?/g)]
  .map(([, layout, id]) => ({ layout, id: id ?? null }));

test('o exemplo da spec 6.1 vira aula; sem a meta video, 0 erros; com ela, o canto do vídeo acusa o slide #variancia', async () => {
  const base = mkdtempSync(join(tmpdir(), 'aula-usp-roteiro-'));
  cpSync(EXEMPLO, join(base, 'fonte'), { recursive: true });
  const literal = join(base, 'fonte/roteiro.md');
  const semVideo = join(base, 'fonte/sem-video.md');
  writeFileSync(semVideo, readFileSync(literal, 'utf8').replace('video: canto\n', ''));

  // Sem `video: canto`: a aula valida limpa com a composição rodada; os dois avisos são do exemplo (uma
  // abertura só; a figura sem nota), os mesmos de tests/unit/roteiro.test.mjs.
  const limpo = roteiro(semVideo, join(base, 'sem-video'));
  assert.equal(limpo.status, 0, `${limpo.stdout}\n${limpo.stderr}`);
  const semCanto = await validarComChrome(join(base, 'sem-video'));
  assert.equal(semCanto.erros, 0, semCanto.achados.map((a) => `${a.regra}: ${a.mensagem}`).join(' / '));
  assert.deepEqual(semCanto.achados.map((a) => a.regra), ['estrutura.blocos', 'estrutura.notas-ausentes']);

  // O exemplo literal, com `video: canto`: medido na Tarefa 2, a lista do slide #variancia desce até o
  // canto reservado ao vídeo, e o destaque e a fonte entram nele. Não é defeito do gerador — o mesmo
  // HTML sem a meta valida limpo — e sim do exemplo da spec, que não cabe com o canto ligado. Preso
  // aqui para a divergência com o plano ("validar dá 0 erros") ficar à vista, e não calada.
  const comVideo = roteiro(literal, join(base, 'literal'));
  assert.equal(comVideo.status, 1, comVideo.stdout);
  const canto = await validarComChrome(join(base, 'literal'));
  assert.deepEqual(canto.achados.filter((a) => a.severidade === 'erro').map((a) => `${a.regra} #${a.id}`),
    ['composicao.canto-video #variancia', 'composicao.canto-video #variancia']);
});

test('ida e volta: a aula-exemplo da descida do gradiente, reescrita como roteiro, volta ao mesmo HTML, que valida limpo', async () => {
  const pasta = join(mkdtempSync(join(tmpdir(), 'aula-usp-roteiro-descida-')), 'aula');
  const { status, stdout, stderr } = roteiro(DESCIDA, pasta);
  assert.equal(status, 0, `${stdout}\n${stderr}`);
  const gerado = readFileSync(join(pasta, 'index.html'), 'utf8');
  const original = readFileSync(ORIGINAL, 'utf8');

  // Os mesmos ids e a mesma sequência de layouts do original, menos os slides que o roteiro não exprime.
  const esperadas = secoes(original).filter(({ id }) => !FORA_DO_ROTEIRO.includes(id));
  assert.equal(esperadas.length, secoes(original).length - FORA_DO_ROTEIRO.length, 'um slide de FORA_DO_ROTEIRO sumiu do original');
  assert.deepEqual(secoes(gerado), esperadas);

  // E mais do que o plano pede, porque se mediu: fora do slide de exercício, o arquivo é o original byte
  // a byte — cabeçalho, tag do runtime, recuo, o pre na primeira coluna, as notas.
  const semExercicio = original.replace(/<section data-layout="conteudo" id="exercicio">[\s\S]*?<\/section>\n\n/, '');
  assert.notEqual(semExercicio, original);
  assert.equal(gerado, semExercicio);

  const { erros, avisos, achados } = await validarComChrome(pasta);
  assert.equal(erros, 0, achados.map((a) => `${a.regra}: ${a.mensagem}`).join(' / '));
  assert.equal(avisos, 0, achados.map((a) => `${a.regra}: ${a.mensagem}`).join(' / '));
});
