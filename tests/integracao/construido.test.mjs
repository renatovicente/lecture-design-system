// O HTML construído aberto de file://, que é como um professor abre uma aula que recebeu por e-mail.
// Sem servidor: se algo ficou por buscar, aqui não há de onde buscar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iniciarChrome } from './utilitarios.mjs';
import { construir } from '../../build/construir.mjs';

const RAIZ = new URL('../../', import.meta.url);
let navegador;
before(async () => { navegador = await iniciarChrome(); });
after(async () => { await navegador?.close(); });

test('a aula construída vive de file://, sem rede e sem erro de console', async (t) => {
  const destino = await mkdtemp(join(tmpdir(), 'construido-'));
  const { caminhoDoHtml } = await construir({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), destino });
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  t.after(() => pagina.close());
  const erros = [];
  const pedidos = [];
  const alvo = `file://${caminhoDoHtml}`;
  pagina.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) erros.push(m.text()); });
  pagina.on('pageerror', (e) => erros.push(e.message));
  pagina.on('request', (p) => { if (!p.url().startsWith('data:') && p.url() !== alvo) pedidos.push(p.url()); });

  await pagina.goto(alvo);
  await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
  const medida = await pagina.evaluate(() => ({
    slides: document.querySelectorAll('section.slide').length,
    palco: !!document.querySelector('.palco'),
    imprimir: typeof window.AulaUSP?.prepararImpressao,
    katex: document.querySelectorAll('.katex').length,
    fonte: getComputedStyle(document.querySelector('h1, h2')).fontFamily.split(',')[0].replace(/["']/g, ''),
  }));
  assert.equal(medida.slides, 8);
  assert.equal(medida.palco, true);
  assert.equal(medida.imprimir, 'function', 'prepararImpressao é o gancho que a spec 8.4 pede no 5c');
  assert.ok(medida.katex > 10);
  assert.equal(medida.fonte, 'Geist', 'a fonte embutida não pegou — caiu no fallback');
  assert.deepEqual(pedidos, [], `a aula pediu recursos: ${pedidos.join(', ')}`);
  assert.deepEqual(erros, [], erros.join('\n'));

  await pagina.keyboard.press('ArrowRight');
  await pagina.waitForTimeout(250);
  const ativo = await pagina.evaluate(() => document.querySelector('.slide.ativo')?.id);
  assert.ok(ativo && ativo !== 'capa', 'a navegação não funcionou no HTML construído');
});
