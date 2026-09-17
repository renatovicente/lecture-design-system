// Servidor de desenvolvimento do Aula USP (spec 8.1): serve a aula e, sob /_aula-usp/,
// as pastas do sistema; troca a tag do runtime pela entrada de desenvolvimento.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_SISTEMA = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
export const PREFIXO = '/_aula-usp/';
export const PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'componentes', 'assets', 'tokens', 'contrato'];
// Bibliotecas de terceiros servidas em desenvolvimento, cada uma presa à pasta dist do pacote; no marco 5 elas vêm embutidas.
export const BIBLIOTECAS = { katex: 'node_modules/katex/dist' };

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

export function reescreverRuntime(html) {
  return html.replace(
    /<script\b[^>]*\bsrc="[^"]*\/aula-usp\.js"[^>]*>\s*<\/script>/,
    `<script src="${PREFIXO}montar/carregador.js"></script>`,
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
    if (pasta === 'bibliotecas') {
      const [biblioteca, ...arquivo] = resto;
      if (!Object.hasOwn(BIBLIOTECAS, biblioteca)) return null;
      return resolverSeguro(resolve(RAIZ_SISTEMA, BIBLIOTECAS[biblioteca]), `/${arquivo.join('/')}`);
    }
    if (!PASTAS_DO_SISTEMA.includes(pasta)) return null;
    return resolverSeguro(resolve(RAIZ_SISTEMA, pasta), `/${resto.join('/')}`);
  }
  return resolverSeguro(raizAula, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
}

export function criarServidor({ pastaAula }) {
  const raizAula = resolve(pastaAula);
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
