// Utilitários dos testes de integração: Chrome instalado, servidor de uma pasta e aula montada.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { criarServidor, resolverSeguro } from '../../build/servir.mjs';

export const RAIZ = new URL('../../', import.meta.url);

export const TINTA = 'rgb(10, 10, 10)';
export const CINZA = 'rgb(102, 102, 102)';
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
    .filter((elemento) => !elemento.closest('.katex, .katex-display'))
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

const TIPOS_CRUS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

// Servidor estático burro: ao contrário de servirPasta, não passa por criarServidor e não reescreve
// nada. tests/integracao/dist.test.mjs precisa dele, não de servirPasta — é o teste que prova o
// caminho de produção, em que o <script src=".../dist/aula-usp.js"> do espécime chega ao navegador
// do jeito que o autor escreveu. criarServidor (build/servir.mjs) reescreve QUALQUER
// <script src=".../aula-usp.js"> para o modo de desenvolvimento, sempre, sem opção de desligar —
// é o próprio comportamento sob teste em todos os outros arquivos desta pasta, que continuam usando
// servirPasta sem mudança nenhuma.
export async function servirPastaCrua(pastaRelativaARaiz) {
  const raiz = resolve(fileURLToPath(new URL(pastaRelativaARaiz, RAIZ)));
  const servidor = createServer(async (pedido, resposta) => {
    let pathname;
    try {
      ({ pathname } = new URL(pedido.url, 'http://localhost'));
    } catch {
      resposta.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('pedido inválido');
      return;
    }
    const caminho = resolverSeguro(raiz, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
    if (!caminho) {
      resposta.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('proibido');
      return;
    }
    try {
      const corpo = await readFile(caminho);
      resposta.writeHead(200, { 'Content-Type': TIPOS_CRUS[extname(caminho).toLowerCase()] ?? 'application/octet-stream' }).end(corpo);
    } catch {
      resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('não encontrado');
    }
  });
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
  const pedidos = [];
  pagina.on('request', (pedido) => pedidos.push(pedido.url()));
  pagina.on('pageerror', (erro) => erros.push(erro.message));
  pagina.on('console', (mensagem) => {
    if (mensagem.type() === 'error' && !mensagem.location().url.endsWith('/favicon.ico')) erros.push(mensagem.text());
  });
  await pagina.goto(url);
  await esperarMontagem(pagina);
  return { pagina, erros, pedidos };
}
