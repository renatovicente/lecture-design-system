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

// Os dois bytes da corrupção, e `;\n` não é lixo qualquer: é JavaScript VÁLIDO no topo de um módulo
// e de um script clássico (declaração vazia). Bytes que quebrassem a sintaxe também impediriam a
// carga — só que por erro de sintaxe, e a asserção de recusa ficaria verde sem provar nada sobre o
// `integrity`. Com estes, a ÚNICA razão possível para o navegador não executar o arquivo é o hash.
const DOIS_BYTES = Buffer.from(';\n');

// A CDN ainda não existe — publicar é da fase 3 —, mas a tag que o autor escreveu É pedida pelo
// navegador, e quem responde são os bytes locais de dist/. Isto é o que deixa `especime/` carregar a
// tag FIXADA (spec 3.2, 8.1 e 12) sem abrir mão do que dist.test.mjs e visual.test.mjs medem:
// `servirPastaCrua` continua burro e não reescreve nada; quem intercepta é o Chrome, depois de a tag
// ter chegado a ele exatamente como está no arquivo.
//
// Duas propriedades vêm de graça por este caminho, e nenhuma delas existia enquanto a tag era
// relativa — carga mesma-origem, sem `integrity`:
//
//   1. o `integrity` passa a ser conferido por um NAVEGADOR. A guarda de tests/unit/pacotes.test.mjs
//      compara a string do atributo com a string do manifesto: prova que os dois textos batem, não
//      que o hash valida os bytes. Aqui o Chrome decide. `corromper` existe para essa inversão ser
//      um teste, e não um experimento que alguém fez uma vez (ver dist.test.mjs).
//   2. a cadeia de scripts secundários roda pela BASE DA CDN: `aula-usp.js` resolve
//      `aula-usp-tex.js`, `aula-usp-codigo.js` e as gramáticas a partir de `currentScript.src`
//      (spec 3.2, passo 5), cada um com o `integrity` que ele traz embutido. Com a tag relativa esse
//      ramo nunca era exercitado.
//
// `access-control-allow-origin` não é enfeite: `crossorigin="anonymous"` + `integrity` exigem CORS, e
// sem o cabeçalho o Chrome recusa o script ANTES de conferir o hash — a falha pareceria de SRI sem
// ser. Devolve a base e a lista (viva) dos nomes pedidos, para o teste medir a cadeia.
//
// `corromper` recebe o NOME de arquivo (ou vários) a estragar, e não um "estraga tudo": a prova dos
// satélites precisa entregar `aula-usp.js` íntegro e trocar os bytes de UM secundário — é esse
// recorte que separa "o navegador confere o script principal" (já provado no marco 6c) de "confere
// também os secundários que o principal carrega" (nove desde o SRI dos satélites, dez desde
// aula-usp-graficos.js — Tarefa 3 da fase 2a), que é o que a tarefa 3 do marco anterior fechou.
export async function rotearCdn(pagina, { raiz = RAIZ, corromper = [] } = {}) {
  const { version } = JSON.parse(await readFile(new URL('package.json', raiz), 'utf8'));
  const base = `https://cdn.jsdelivr.net/npm/aula-usp@${version}/dist/`;
  const estragados = new Set([corromper].flat());
  const pedidos = [];
  await pagina.route(`${base}*`, async (rota) => {
    const nome = new URL(rota.request().url()).pathname.split('/').pop();
    pedidos.push(nome);
    let corpo;
    try {
      corpo = await readFile(new URL(`dist/${nome}`, raiz));
    } catch {
      // 404 com o motivo, em vez de deixar o pedido pendurado até o timeout de 30 s do Playwright.
      await rota.fulfill({ status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: `dist/${nome} não existe` });
      return;
    }
    await rota.fulfill({
      status: 200,
      headers: { 'content-type': 'text/javascript; charset=utf-8', 'access-control-allow-origin': '*' },
      body: estragados.has(nome) ? Buffer.concat([corpo, DOIS_BYTES]) : corpo,
    });
  });
  return { base, pedidos };
}

export async function esperarMontagem(pagina) {
  await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
  const [estado, painel] = await pagina.evaluate(() => [document.body.dataset.montado, document.querySelector('pre.painel')?.textContent]);
  if (estado !== 'sim') throw new Error(painel ?? `a montagem terminou em "${estado}"`);
  await pagina.evaluate(() => document.fonts.ready);
}

// getComputedStyle().fontFamily só devolve o nome declarado pela cascata — não se o arquivo por trás
// dele de fato resolveu (medido por mutação, rodada de correção 1 da tarefa 4 do marco 5b: com os
// bytes da fonte embutida corrompidos, esse valor continua "Geist" enquanto o Chrome pinta com a
// fonte de reserva do sistema). CSS.getPlatformFontsForNode (CDP) é o único jeito de perguntar qual
// arquivo pintou um nó de verdade. Ligar DOM/CSS do CDP sobre uma página file:// loga sozinho, sem
// nenhuma navegação, "Unsafe attempt to load URL …#<id> from frame with URL …#<id>. 'file:' URLs are
// treated as unique security origins." — instrumentação do próprio Chrome ao instrumentar file://, não
// um erro da aula (medido isolando arquivo, método de navegação e ordem até sobrar só "CDP ligado
// sobre file://" como causa comum). Quem usar fontesDoNo para conferir erros de console deve filtrar
// essa mensagem exata — e só essa: filtrar qualquer outra esconderia defeito de verdade.
export const AVISO_CDP_SOBRE_FILE = "'file:' URLs are treated as unique security origins.";

export async function fontesDoNo(pagina, seletor) {
  const cdp = await pagina.context().newCDPSession(pagina);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: seletor });
  if (!nodeId) return null;
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  return fonts;
}

// `cdn` é opt-in, e não o padrão: as páginas servidas por `servirPasta` passam por `criarServidor`,
// que troca a tag pelo runtime local — nenhuma delas pede a CDN, e se um dia uma pedir, o certo é
// falhar, não ser atendida em silêncio por uma rota que ninguém pediu. Quem liga é quem serve o
// arquivo cru (tests/integracao/dist.test.mjs).
export async function abrirAula(navegador, url, { largura = 1400, altura = 900, cdn = false } = {}) {
  const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
  const erros = [];
  const pedidos = [];
  pagina.on('request', (pedido) => pedidos.push(pedido.url()));
  pagina.on('pageerror', (erro) => erros.push(erro.message));
  pagina.on('console', (mensagem) => {
    if (mensagem.type() === 'error' && !mensagem.location().url.endsWith('/favicon.ico')) erros.push(mensagem.text());
  });
  if (cdn) await rotearCdn(pagina);
  await pagina.goto(url);
  await esperarMontagem(pagina);
  return { pagina, erros, pedidos };
}
