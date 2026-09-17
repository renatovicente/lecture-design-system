import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reescreverRuntime, resolverSeguro, criarServidor, PREFIXO } from '../../build/servir.mjs';

const FIXTURE = fileURLToPath(new URL('../fixtures/servir/', import.meta.url));
const BIN = fileURLToPath(new URL('../../bin/aula-usp.mjs', import.meta.url));
let servidor;
let endereco;

before(async () => {
  servidor = criarServidor({ pastaAula: FIXTURE });
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));
  endereco = { host: '127.0.0.1', port: servidor.address().port };
});

after(() => new Promise((fim) => servidor.close(fim)));

const pedir = (caminho, cabecalhos) => new Promise((pronto, falha) => {
  get({ ...endereco, path: caminho, headers: cabecalhos }, (resposta) => {
    const partes = [];
    resposta.on('data', (parte) => partes.push(parte));
    resposta.on('end', () => pronto({
      status: resposta.statusCode,
      tipo: resposta.headers['content-type'],
      corpo: Buffer.concat(partes).toString('utf8'),
    }));
  }).on('error', falha);
});

test('reescreverRuntime troca a tag do CDN, com integrity e quebra de linha, pela entrada de desenvolvimento', () => {
  const html = '<head><script src="https://cdn.jsdelivr.net/npm/aula-usp@1.0.0/dist/aula-usp.js"\n'
    + '        integrity="sha384-abc" crossorigin="anonymous"></script>\n<script src="demos/exemplo.js"></script></head>';
  const saida = reescreverRuntime(html);
  assert.ok(saida.includes(`<script src="${PREFIXO}montar/carregador.js"></script>`));
  assert.ok(!saida.includes('cdn.jsdelivr.net'));
  assert.ok(!saida.includes('integrity'));
  assert.ok(saida.includes('<script src="demos/exemplo.js"></script>'));
});

test('reescreverRuntime não mexe em HTML sem a tag do runtime', () => {
  const html = '<head><script src="outro.js"></script></head>';
  assert.equal(reescreverRuntime(html), html);
});

test('resolverSeguro aceita caminhos dentro da raiz e recusa travessia, barra invertida, byte nulo e codificação inválida', () => {
  const raiz = resolve('/tmp/aula');
  assert.equal(resolverSeguro(raiz, '/img/a.png'), resolve(raiz, 'img/a.png'));
  assert.equal(resolverSeguro(raiz, '/'), raiz);
  assert.equal(resolverSeguro(raiz, '/../segredo'), null);
  assert.equal(resolverSeguro(raiz, '/img/%2e%2e/%2e%2e/segredo'), null);
  assert.equal(resolverSeguro(raiz, '/img\\..\\..\\segredo'), null);
  assert.equal(resolverSeguro(raiz, '/img/a%00.png'), null);
  assert.equal(resolverSeguro(raiz, '/%E0%A4%A'), null);
});

test('resolverSeguro recusa segmentos que começam com ponto (dotfiles como .git e .env)', () => {
  const raiz = resolve('/tmp/aula');
  assert.equal(resolverSeguro(raiz, '/.git/config'), null);
  assert.equal(resolverSeguro(raiz, '/img/.oculto'), null);
});

test('servidor entrega a aula com a tag do runtime trocada', async () => {
  const resposta = await pedir('/');
  assert.equal(resposta.status, 200);
  assert.match(resposta.tipo, /^text\/html/);
  assert.ok(resposta.corpo.includes(`<script src="${PREFIXO}montar/carregador.js"></script>`));
  assert.ok(!resposta.corpo.includes('cdn.jsdelivr.net'));
});

test('servidor entrega arquivos da aula e do sistema com o tipo certo', async () => {
  const svg = await pedir('/img/ponto.svg');
  assert.equal(svg.status, 200);
  assert.equal(svg.tipo, 'image/svg+xml');
  const css = await pedir(`${PREFIXO}estilos/tokens.css`);
  assert.equal(css.status, 200);
  assert.match(css.tipo, /^text\/css/);
  assert.ok(css.corpo.includes('--cor-azul'));
  const js = await pedir(`${PREFIXO}montar/montar.js`);
  assert.equal(js.status, 200);
  assert.match(js.tipo, /^text\/javascript/);
  const componente = await pedir(`${PREFIXO}componentes/tex.js`);
  assert.equal(componente.status, 200);
  assert.ok(componente.corpo.includes('export function renderizarTex'));
});

test('servidor entrega o KaTeX da pasta dist do pacote, com módulo, folha de estilo e fontes', async () => {
  const modulo = await pedir(`${PREFIXO}bibliotecas/katex/katex.mjs`);
  assert.equal(modulo.status, 200);
  assert.match(modulo.tipo, /^text\/javascript/);
  const css = await pedir(`${PREFIXO}bibliotecas/katex/katex.min.css`);
  assert.equal(css.status, 200);
  assert.ok(css.corpo.includes('KaTeX_Main'));
  const fonte = await pedir(`${PREFIXO}bibliotecas/katex/fonts/KaTeX_Main-Regular.woff2`);
  assert.equal(fonte.status, 200);
  assert.equal(fonte.tipo, 'font/woff2');
});

test('servidor recusa biblioteca fora da lista e caminho que sai da pasta dist', async () => {
  assert.equal((await pedir(`${PREFIXO}bibliotecas/linkedom/package.json`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}bibliotecas/katex/..%2fpackage.json`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}bibliotecas/katex/..%2f..%2f..%2fpackage.json`)).status, 403);
});

test('servidor recusa pastas do sistema fora da lista e travessias codificadas', async () => {
  assert.equal((await pedir(`${PREFIXO}package.json`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}bin/aula-usp.mjs`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}estilos/..%2f..%2fpackage.json`)).status, 403);
  assert.equal((await pedir('/..%2f..%2fpackage.json')).status, 403);
});

test('servidor recusa dotfiles como /.git/config com 403', async () => {
  assert.equal((await pedir('/.git/config')).status, 403);
});

test('servidor recusa Host diferente do local (DNS rebinding) e aceita localhost', async () => {
  const rebind = await pedir('/', { Host: 'rebind.attacker.example:8765' });
  assert.equal(rebind.status, 403);
  assert.match(rebind.tipo, /^text\/plain/);
  assert.equal(rebind.corpo, 'proibido');
  const local = await pedir('/', { Host: `localhost:${endereco.port}` });
  assert.equal(local.status, 200);
});

test('servidor responde 404 para arquivo inexistente', async () => {
  assert.equal((await pedir('/nao-existe.html')).status, 404);
  assert.equal((await pedir(`${PREFIXO}estilos/nao-existe.css`)).status, 404);
});

test('servidor responde 400 a alvo de pedido inválido e continua no ar', async () => {
  const invalido = await pedir('//');
  assert.equal(invalido.status, 400);
  assert.match(invalido.tipo, /^text\/plain/);
  assert.equal(invalido.corpo, 'pedido inválido');
  const valido = await pedir('/');
  assert.equal(valido.status, 200);
});

test('CLI sem comando válido mostra o uso e sai com código 2', () => {
  const semArgumentos = spawnSync(process.execPath, [BIN], { encoding: 'utf8' });
  assert.equal(semArgumentos.status, 2);
  assert.match(semArgumentos.stderr, /uso: aula-usp servir <pasta>/);
  const semPasta = spawnSync(process.execPath, [BIN, 'servir'], { encoding: 'utf8' });
  assert.equal(semPasta.status, 2);
  const pastaInexistente = spawnSync(process.execPath, [BIN, 'servir', '/nao/existe/aqui'], { encoding: 'utf8' });
  assert.equal(pastaInexistente.status, 2);
  assert.match(pastaInexistente.stderr, /pasta não encontrada/);
});
