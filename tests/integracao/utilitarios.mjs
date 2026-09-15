// Utilitários dos testes de integração: Chrome instalado, servidor de uma pasta e aula montada.
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { criarServidor } from '../../build/servir.mjs';

export const RAIZ = new URL('../../', import.meta.url);

export function iniciarChrome() {
  return chromium.launch(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : { channel: 'chrome' });
}

export async function servirPasta(pastaRelativaARaiz) {
  const servidor = criarServidor({ pastaAula: fileURLToPath(new URL(pastaRelativaARaiz, RAIZ)) });
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));
  return {
    endereco: `http://127.0.0.1:${servidor.address().port}`,
    fechar: () => new Promise((fim) => {
      servidor.closeAllConnections();
      servidor.close(fim);
    }),
  };
}

export async function esperarMontagem(pagina) {
  await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
  const [estado, painel] = await pagina.evaluate(() => [document.body.dataset.montado, document.querySelector('pre.painel')?.textContent]);
  if (estado !== 'sim') throw new Error(painel ?? `a montagem terminou em "${estado}"`);
  await pagina.evaluate(() => document.fonts.ready);
}

export async function abrirAula(navegador, url, { largura = 1400, altura = 900 } = {}) {
  const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
  const erros = [];
  pagina.on('pageerror', (erro) => erros.push(erro.message));
  pagina.on('console', (mensagem) => {
    if (mensagem.type() === 'error' && !mensagem.location().url.endsWith('/favicon.ico')) erros.push(mensagem.text());
  });
  await pagina.goto(url);
  await esperarMontagem(pagina);
  return { pagina, erros };
}
