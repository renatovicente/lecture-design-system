// Servidor de desenvolvimento do Aula USP (spec 8.1): serve a aula e, sob /_aula-usp/,
// as pastas do sistema; troca a tag do runtime pela entrada de desenvolvimento.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep, extname, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_SISTEMA = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
export const PREFIXO = '/_aula-usp/';
export const PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'componentes', 'assets', 'tokens', 'contrato', 'validador'];

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
  // Gráficos (spec 3.5, fase 2): d3-scale, d3-shape e d3-array são os três que componentes/
  // graficos.js pede (criarDesenhista), mas o navegador não resolve nada que ELAS importam por
  // dentro sozinho — sem entrada própria aqui, um import map sem a chave fica idêntico a um import
  // map sem entrada nenhuma (mesma classe de "abre e cala" do SRI de import map). A lista é a
  // closure transitiva medida (grep pelas três e por quem elas importam, em cascata): d3-scale
  // importa d3-array/d3-format/d3-interpolate/d3-time/d3-time-format; d3-shape importa d3-path;
  // d3-interpolate importa d3-color; d3-time importa d3-array; d3-time-format importa d3-time; e
  // d3-array importa internmap. Só d3-scale, d3-shape e d3-array são dependência direta do
  // package.json — as outras seis chegam pela árvore de node_modules delas, como já acontece com
  // oniguruma-to-es e as quatro de regex acima, dependências de @shikijs/engine-javascript.
  'd3-scale',
  'd3-shape',
  'd3-array',
  'd3-format',
  'd3-interpolate',
  'd3-time',
  'd3-time-format',
  'd3-path',
  'd3-color',
  'internmap',
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

// SEM `integrity`, e isto é decisão, não esquecimento — a pergunta foi feita no SRI dos satélites,
// quando `montar/dist.js` ganhou um import map com `integrity` (spec 3.2, passo 5). Dois motivos, e o
// segundo é o que decide:
//
// 1. não são os mesmos arquivos. Este mapa aponta para `node_modules/` — `katex/dist/katex.mjs`,
//    `@shikijs/langs/dist/python.mjs`, e mais 16 —, e não para os nove satélites de `dist/`. O
//    `aula-usp-tex.js` do pacote é o KaTeX mais a CSS dele mais 20 fontes embutidas; o
//    `katex.mjs` daqui não é nada disso. Os `integrity` de `dist/manifesto.json` não valem para
//    nenhuma destas URLs, então não há hash pronto para reaproveitar: seria um segundo cálculo de
//    hash, sobre um segundo conjunto de arquivos — a segunda verdade que o resto desta mudança
//    existe para não criar;
// 2. e o hash que sobra seria VÁCUO. O único que este servidor poderia pôr aqui é um que ele mesmo
//    calculasse dos bytes que está prestes a servir, do mesmo disco, no mesmo pedido. Conferir bytes
//    contra um hash tirado deles não pode falhar: a conferência seria verde por construção, e o
//    código diria, para quem lesse, que o desenvolvimento está protegido. Uma guarda que não pode
//    ficar vermelha é pior que guarda nenhuma.
//
// O que o SRI defende é "a CDN entregou bytes diferentes dos que o autor fixou". Aqui não há CDN nem
// terceiro: é `127.0.0.1` lendo `node_modules/` da mesma máquina, e quem puder trocar esses bytes já
// roda como o desenvolvedor. O modo que enfrenta a CDN é o do pacote, e é lá que o `integrity` está.
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
