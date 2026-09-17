// Utilitários dos testes de integração: Chrome instalado, servidor de uma pasta e aula montada.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { criarServidor } from '../../build/servir.mjs';

export const RAIZ = new URL('../../', import.meta.url);

export const TINTA = 'rgb(10, 10, 10)';
export const PAPEL = 'rgb(255, 255, 255)';
export const AMARELO = 'rgb(252, 180, 33)';
export const AZUL = 'rgb(16, 148, 171)';
export const LINHA = 'rgb(217, 217, 217)';
export const TRANSPARENTE = 'rgba(0, 0, 0, 0)';

// Tolerância de meio pixel para medidas de geometria no Chrome.
export const perto = (obtido, esperado, descricao) => assert.ok(Math.abs(obtido - esperado) <= 0.5, `${descricao}: ${obtido} em vez de ${esperado}`);

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));
const classesConhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);

// Classes do documento (autor ou sistema) que não estão em contrato.classesDoSistema nem no vocabulário: deve dar sempre [].
export async function classesForaDoContrato(pagina) {
  const classes = await pagina.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .flatMap((elemento) => [...elemento.classList]))]);
  return classes.filter((nome) => !classesConhecidas.has(nome));
}

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
