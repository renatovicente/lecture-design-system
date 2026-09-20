// O caminho de exceção do build (I3 e I4 da revisão final do 5c): o que fica no disco, e o que o
// autor lê, quando o pipeline morre DEPOIS da etapa 2-4. Integração, não unitário: os dois casos
// precisam de Chrome de verdade — o primeiro porque só se chega à etapa 6 passando pela 5, o segundo
// porque é dentro de uma página que a montagem termina mal.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iniciarChrome } from './utilitarios.mjs';
import { build } from '../../build/build.mjs';
import { gerarPdf } from '../../build/pdf.mjs';

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

// I4, segunda metade, dentro da etapa 6: gerarPdf esperava `montado === 'sim'` e nada mais — quando
// a montagem terminava em OUTRO estado, a espera ia até os 30 s do Playwright e saía como
// TimeoutError, que a CLI ainda embrulhava em "rode npm install". O padrão certo já existia em
// medirComposicao (build/composicao.mjs): esperar `montado !== undefined` e então LER o estado.
// Medido antes da correção, com este mesmo HTML: 30 s de espera e
// "page.waitForFunction: Timeout 30000ms exceeded".
test('etapa 6: montagem que termina em outro estado falha na hora, dizendo qual estado', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'excecao-'));
  const caminhoDoHtml = join(pasta, 'nao-monta.html');
  // Não é uma aula: gerarPdf só abre um arquivo e olha o dataset. O que este HTML reproduz é o
  // estado final "nao" — o que um runtime embutido escreve quando a montagem falha.
  await writeFile(caminhoDoHtml, '<!DOCTYPE html><html lang="pt-BR"><body data-montado="nao"></body></html>', 'utf8');
  const comeco = Date.now();
  await assert.rejects(gerarPdf({ caminhoDoHtml, navegador, metadados: {} }), /a montagem terminou em "nao"/);
  assert.ok(Date.now() - comeco < 10_000, 'a falha demorou o bastante para ser a espera de 30 s, não a leitura do estado');
});
