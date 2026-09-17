// Servidor de desenvolvimento do Aula USP (spec 8.1): serve a aula e, sob /_aula-usp/,
// as pastas do sistema; troca a tag do runtime pela entrada de desenvolvimento.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep, extname, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_SISTEMA = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
export const PREFIXO = '/_aula-usp/';
export const PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'componentes', 'assets', 'tokens', 'contrato'];

const { linguagens } = JSON.parse(readFileSync(resolve(RAIZ_SISTEMA, 'contrato/contrato.json'), 'utf8'));

// Módulos de terceiros que o navegador importa pelo nome em desenvolvimento: os que o sistema importa e os que eles
// importam por dentro. Um mapa de importação leva cada nome a /_aula-usp/modulos/; no marco 5 eles vêm embutidos.
export const MODULOS_DO_NAVEGADOR = [
  'katex',
  '@shikijs/primitive',
  '@shikijs/engine-javascript',
  ...linguagens.map((linguagem) => `@shikijs/langs/${linguagem}`),
  '@shikijs/types',
  '@shikijs/vscode-textmate',
  'oniguruma-to-es',
  'oniguruma-parser/parser',
  'oniguruma-parser/traverser',
  'regex/internals',
  'regex-recursion',
  'regex-utilities',
];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.csv': 'text/csv; charset=utf-8',
  '.pdf': 'application/pdf',
};

export function nomeDoPacote(especificador) {
  return especificador.split('/').slice(0, especificador.startsWith('@') ? 2 : 1).join('/');
}

function raizDoPacote(arquivo, nome) {
  for (let pasta = dirname(arquivo); pasta !== dirname(pasta); pasta = dirname(pasta)) {
    const pacote = join(pasta, 'package.json');
    if (existsSync(pacote) && JSON.parse(readFileSync(pacote, 'utf8')).name === nome) return pasta;
  }
  throw new Error(`não achei a pasta do pacote ${nome} acima de ${arquivo}`);
}

// Resolve cada nome como o Node resolve (campo exports, condição import) e guarda a pasta de cada pacote.
let modulos;
function modulosResolvidos() {
  if (modulos) return modulos;
  const pastas = new Map();
  const imports = {};
  for (const especificador of MODULOS_DO_NAVEGADOR) {
    const nome = nomeDoPacote(especificador);
    const arquivo = fileURLToPath(import.meta.resolve(especificador));
    if (!pastas.has(nome)) pastas.set(nome, raizDoPacote(arquivo, nome));
    imports[especificador] = `${PREFIXO}modulos/${nome}/${relative(pastas.get(nome), arquivo).split(sep).join('/')}`;
  }
  modulos = { pastas, mapa: { imports } };
  return modulos;
}

export function mapaDeImportacao() {
  return modulosResolvidos().mapa;
}

export function reescreverRuntime(html) {
  return html.replace(
    /<script\b[^>]*\bsrc="[^"]*\/aula-usp\.js"[^>]*>\s*<\/script>/,
    () => `<script type="importmap">${JSON.stringify(mapaDeImportacao())}</script>\n`
      + `<script src="${PREFIXO}montar/carregador.js"></script>`,
  );
}

export function resolverSeguro(raiz, caminhoUrl) {
  let decodificado;
  try {
    decodificado = decodeURIComponent(caminhoUrl);
  } catch {
    return null;
  }
  if (decodificado.includes('\0') || decodificado.includes('\\')) return null;
  if (decodificado.split('/').some((segmento) => segmento.startsWith('.'))) return null;
  const alvo = resolve(raiz, `.${decodificado.startsWith('/') ? '' : '/'}${decodificado}`);
  return alvo === raiz || alvo.startsWith(raiz + sep) ? alvo : null;
}

function localizar(raizAula, pathname) {
  if (pathname.startsWith(PREFIXO)) {
    const [pasta, ...resto] = pathname.slice(PREFIXO.length).split('/');
    if (pasta === 'modulos') {
      const nome = nomeDoPacote(resto.join('/'));
      const raiz = modulosResolvidos().pastas.get(nome);
      if (!raiz) return null;
      return resolverSeguro(raiz, `/${resto.slice(nome.split('/').length).join('/')}`);
    }
    if (!PASTAS_DO_SISTEMA.includes(pasta)) return null;
    return resolverSeguro(resolve(RAIZ_SISTEMA, pasta), `/${resto.join('/')}`);
  }
  return resolverSeguro(raizAula, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
}

export function criarServidor({ pastaAula }) {
  const raizAula = resolve(pastaAula);
  modulosResolvidos(); // falha aqui, e não como 404 em cada aula, quando falta um módulo da lista
  return createServer(async (pedido, resposta) => {
    const porta = pedido.socket.localPort;
    const hostsPermitidos = new Set([`127.0.0.1:${porta}`, `localhost:${porta}`, `[::1]:${porta}`]);
    if (!hostsPermitidos.has((pedido.headers.host ?? '').toLowerCase())) {
      resposta.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('proibido');
      return;
    }
    let pathname;
    try {
      ({ pathname } = new URL(pedido.url, 'http://localhost'));
    } catch {
      resposta.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('pedido inválido');
      return;
    }
    const caminho = localizar(raizAula, pathname);
    if (!caminho) {
      resposta.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('proibido');
      return;
    }
    try {
      const info = await stat(caminho);
      if (!info.isFile()) throw new Error('não é arquivo');
      const extensao = extname(caminho).toLowerCase();
      let corpo = await readFile(caminho);
      if (extensao === '.html') corpo = Buffer.from(reescreverRuntime(corpo.toString('utf8')));
      resposta.writeHead(200, {
        'Content-Type': TIPOS[extensao] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      }).end(corpo);
    } catch {
      resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('não encontrado');
    }
  });
}
