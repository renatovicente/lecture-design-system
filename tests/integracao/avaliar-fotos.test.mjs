// `aula-usp avaliar --fotos` (spec 2026-09-28, 4.1 e 8): um PNG de 1280 × 720 por slide, com o motor
// iniciado e os passos todos revelados, e o indice.json que a skill lê. Chrome de verdade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fotografar, LARGURA_DA_FOTO, ALTURA_DA_FOTO } from '../../build/avaliar.mjs';
import { lerAula } from '../../build/validar.mjs';
import { slidesDoFonte } from '../../validador/validar.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ESPECIME = join(RAIZ, 'especime/index.html');
const contrato = JSON.parse(readFileSync(join(RAIZ, 'contrato/contrato.json'), 'utf8'));

// Largura e altura do PNG, lidas do cabeçalho IHDR: a assinatura tem 8 bytes, o tamanho e o tipo do
// bloco mais 8, e então largura e altura em 4 bytes cada, big-endian.
function tamanhoDoPng(caminho) {
  const bytes = readFileSync(caminho);
  assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG', `${caminho} não é PNG`);
  assert.equal(bytes.subarray(12, 16).toString('latin1'), 'IHDR');
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) };
}

// O último passo de cada slide, medido no DOM logo antes da foto: está revelado e visível? O motor
// esconde o passo não revelado com visibility: hidden (estilos/motor.css).
async function ultimoPassoVisivel(pagina, indice) {
  return pagina.evaluate((k) => {
    const passos = [...document.querySelectorAll('section.slide')[k].querySelectorAll('.area [data-passo]')];
    if (passos.length === 0) return null;
    const ultimo = passos.at(-1);
    return { revelado: ultimo.hasAttribute('data-revelado'), visibilidade: getComputedStyle(ultimo).visibility, texto: ultimo.textContent.trim() };
  }, indice);
}

test('--fotos no espécime: um PNG de 1280 × 720 por slide, com os passos revelados, e o índice', async () => {
  const pasta = join(mkdtempSync(join(tmpdir(), 'aula-usp-fotos-')), 'fotos');
  const medidas = new Map();
  const indice = await fotografar(ESPECIME, pasta, {
    contrato,
    antesDaFoto: async (pagina, item) => medidas.set(item.slide, await ultimoPassoVisivel(pagina, item.slide - 1)),
  });

  const fonte = slidesDoFonte(lerAula(ESPECIME, contrato).body);
  assert.equal(indice.length, fonte.length);
  assert.deepEqual(JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8')), indice);
  indice.forEach((item, k) => {
    assert.equal(item.slide, k + 1);
    assert.equal(item.id, fonte[k].getAttribute('id') || null);
    assert.equal(item.layout, fonte[k].getAttribute('data-layout'));
    assert.match(item.arquivo, /^slide-\d{2}-[a-z0-9-]+\.png$/);
    assert.deepEqual(tamanhoDoPng(join(pasta, item.arquivo)), { largura: LARGURA_DA_FOTO, altura: ALTURA_DA_FOTO }, item.arquivo);
  });
  assert.deepEqual(readdirSync(pasta).sort(), [...indice.map((item) => item.arquivo), 'indice.json'].sort());

  // A lista com data-passo do slide "o-que-mostra" e os passos numerados da grade 4-4-4: o último
  // passo de cada um estava visível quando a foto foi tirada.
  for (const id of ['o-que-mostra', 'grade-4-4-4']) {
    const item = indice.find((candidato) => candidato.id === id);
    assert.ok(item, `o espécime não tem mais o slide ${id}`);
    assert.deepEqual(
      { ...medidas.get(item.slide), texto: undefined },
      { revelado: true, visibilidade: 'visible', texto: undefined },
      `${id}: o último passo não estava visível na foto (${medidas.get(item.slide)?.texto})`,
    );
  }
});

test('a CLI com --fotos e --slide grava só aquele slide e diz onde no --json', () => {
  const pasta = join(mkdtempSync(join(tmpdir(), 'aula-usp-fotos-')), 'fotos');
  const { status, stdout, stderr } = spawnSync('node', [join(RAIZ, 'bin/aula-usp.mjs'), 'avaliar', ESPECIME,
    '--slide', 'o-que-mostra', '--fotos', pasta, '--json'], { encoding: 'utf8' });
  assert.equal(status, 0, stderr);
  const saida = JSON.parse(stdout);
  assert.equal(saida.fotos.pasta, pasta);
  assert.deepEqual(saida.fotos.indice.map((item) => item.id), ['o-que-mostra']);
  assert.ok(existsSync(join(pasta, saida.fotos.indice[0].arquivo)));
  assert.deepEqual(readdirSync(pasta).sort(), [saida.fotos.indice[0].arquivo, 'indice.json'].sort());
});
