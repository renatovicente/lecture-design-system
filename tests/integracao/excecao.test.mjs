// O caminho de exceção do build (I3 da revisão final do 5c): o que fica no disco, e o que o autor
// lê, quando o pipeline morre DEPOIS da etapa 2-4. Integração, não unitário: só se chega à etapa 6
// passando pela 5, que abre Chrome de verdade.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iniciarChrome } from './utilitarios.mjs';
import { build } from '../../build/build.mjs';

const RAIZ = new URL('../../', import.meta.url);
const fixture = (nome) => new URL(`../fixtures/build/${nome}/aula.html`, import.meta.url);

let navegador;
before(async () => {
  console.error('excecao.test.mjs: abrindo o Chrome (uma vez para o arquivo inteiro)');
  navegador = await iniciarChrome();
});
after(async () => {
  await navegador?.close();
});

// I3: construir() grava um validacao.json preliminar só com OS achados dele (marco 5b); build()
// regrava com a lista completa em cada um dos quatro finais. Entre um e outro havia uma janela: com
// qualquer estouro nas etapas 5, 6 ou 7, o arquivo que sobrava no disco era o parcial — e para uma
// aula cujos achados vêm todos da etapa 1, "parcial" quer dizer `[]`, isto é, "nada de errado", numa
// aula com dois avisos e um build que falhou. Medido antes da correção, com esta mesma fixture e
// este mesmo gerarPdf que estoura: `dist/validacao.json -> []`.
test('etapa 6 estourando: o validacao.json no disco é a lista acumulada, não o parcial de construir()', async () => {
  const destino = await mkdtemp(join(tmpdir(), 'excecao-'));
  const gerarPdfQueEstoura = async () => { throw new Error('a etapa 6 falhou de propósito'); };
  await assert.rejects(
    build({ raiz: RAIZ, caminhoDaAula: fixture('aula-limpa'), destino, navegador, gerarPdf: gerarPdfQueEstoura }),
    /a etapa 6 falhou de propósito/,
  );
  const validacao = JSON.parse(await readFile(join(destino, 'validacao.json'), 'utf8'));
  // Os dois avisos de estática de aula-limpa (etapa 1) — exatamente os que o parcial de construir()
  // não conhece, e que `aula-usp validar` acha nesta mesma aula.
  assert.deepEqual(validacao.map((achado) => achado.regra).sort(),
    ['estrutura.blocos', 'estrutura.notas-ausentes'].sort());
});
