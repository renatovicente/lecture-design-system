// O HTML construído aberto de file://, que é como um professor abre uma aula que recebeu por e-mail.
// Sem servidor: se algo ficou por buscar, aqui não há de onde buscar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url'; // um '#' no caminho do temporário viraria fragmento, não pasta (I4 da revisão final)
import { iniciarChrome, fontesDoNo, AVISO_CDP_SOBRE_FILE } from './utilitarios.mjs';
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
  const alvo = pathToFileURL(caminhoDoHtml).href;
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
  }));
  assert.equal(medida.slides, 8);
  assert.equal(medida.palco, true);
  assert.equal(medida.imprimir, 'function', 'prepararImpressao é o gancho que a spec 8.4 pede no 5c');
  assert.ok(medida.katex > 10);

  // Rodada de correção 1: getComputedStyle().fontFamily devolve o nome declarado pela cascata, não a
  // fonte que o Chrome de fato pintou — medido por mutação (corromper os bytes da fonte embutida
  // mantém esse valor em "Geist" enquanto o navegador pinta com a fonte de reserva do sistema). Só
  // CDP CSS.getPlatformFontsForNode (fontesDoNo, tests/integracao/utilitarios.mjs) vê a pintura real;
  // "capa" já é o slide ativo no load, então o h1 já tem layout, sem precisar navegar antes.
  const fontesDoTitulo = await fontesDoNo(pagina, 'h1');
  assert.ok(fontesDoTitulo?.length > 0, 'CDP não relatou fonte nenhuma para o título');
  assert.ok(fontesDoTitulo.every((f) => f.familyName === 'Geist' && f.isCustomFont),
    `a fonte embutida não pegou — pintou com ${fontesDoTitulo.map((f) => f.familyName).join(', ')}`);

  assert.deepEqual(pedidos, [], `a aula pediu recursos: ${pedidos.join(', ')}`);
  assert.deepEqual(erros.filter((erro) => !erro.includes(AVISO_CDP_SOBRE_FILE)), [], erros.join('\n'));

  await pagina.keyboard.press('ArrowRight');
  await pagina.waitForTimeout(250);
  const ativo = await pagina.evaluate(() => document.querySelector('.slide.ativo')?.id);
  assert.ok(ativo && ativo !== 'capa', 'a navegação não funcionou no HTML construído');
});
