// O pacote como o autor o recebe do npm: o tarball de `npm pack`, extraído, com node_modules montado
// SÓ com a árvore de produção (`npm ls --omit=dev`). É o alcance que tests/unit/publicacao.test.mjs
// não tem: arquivo lido por caminho montado em tempo de execução, e dependência que só existe como
// devDependency. Sem rede: `npm pack` e `npm ls` são locais, e os links apontam para o node_modules
// do repositório.
//
// O arranjo é o IÇADO, o de `npx aula-usp` e de `npm install aula-usp` num projeto: o pacote em
// <dir>/node_modules/aula-usp/ e as dependências em <dir>/node_modules/, ao lado dele e não dentro.
// É o mais exigente dos dois: um caminho montado sobre a raiz do sistema
// (`<raiz>/node_modules/katex/…`) só existe no arranjo aninhado de `npm install -g`, e medido na 3a,
// com o pacote aninhado este arquivo ficava verde enquanto o içado quebrava o build de toda aula com
// TeX (build/fontes-embutidas.mjs).
//
// Um limite do dublê: cada dependência entra por link simbólico, e o Node resolve pelo caminho real.
// Uma dependência de produção que importasse uma devDependency acharia a do repositório. O que o
// dublê prova é o que interessa aqui: o código do PACOTE (bin/, build/) não alcança nada além da
// árvore de produção, porque o tarball extraído mora num diretório temporário cujo único
// node_modules acima é o que este arquivo monta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MODULOS = join(RAIZ, 'node_modules');

function instalar() {
  const dir = mkdtempSync(join(tmpdir(), 'aula-usp-instalacao-'));
  const saida = execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', dir],
    { cwd: RAIZ, encoding: 'utf8' });
  execFileSync('tar', ['xzf', join(dir, JSON.parse(saida)[0].filename), '-C', dir]);
  mkdirSync(join(dir, 'node_modules'));
  const pacote = join(dir, 'node_modules', 'aula-usp');
  renameSync(join(dir, 'package'), pacote);
  // Só os diretórios de primeiro nível da árvore de produção: um aninhado viaja dentro do pai.
  const producao = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], { cwd: RAIZ, encoding: 'utf8' })
    .trim().split('\n').slice(1)
    .map((caminho) => relative(MODULOS, caminho))
    .filter((nome) => !nome.includes('node_modules'));
  for (const nome of new Set(producao)) {
    const destino = join(dir, 'node_modules', nome);
    mkdirSync(dirname(destino), { recursive: true });
    symlinkSync(join(MODULOS, nome), destino, 'dir');
  }
  return { dir, pacote };
}

const cli = (pacote, ...args) => spawnSync(process.execPath, [join(pacote, 'bin/aula-usp.mjs'), ...args],
  { encoding: 'utf8', timeout: 300_000 });

test('instalado, o pacote cria, valida e constrói uma aula nova, com PDF', () => {
  const { dir, pacote } = instalar();
  try {
    const aula = join(dir, 'aula-nova');
    let r = cli(pacote, 'novo', aula, '--unidade', 'ime');
    assert.equal(r.status, 0, r.stderr);
    r = cli(pacote, 'validar', aula);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /0 erros, 0 avisos/);
    r = cli(pacote, 'build', aula);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(existsSync(join(aula, 'dist', 'aula-nova.html')));
    assert.ok(existsSync(join(aula, 'dist', 'aula-nova.pdf')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('instalado, o pacote constrói a aula-exemplo com gráfico, diagrama e demo capturada', () => {
  const { dir, pacote } = instalar();
  try {
    const r = cli(pacote, 'build', join(pacote, 'exemplos/regressao-linear'));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /PDF: 12 páginas/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('instalado, servir responde com a aula e o runtime local', async () => {
  const { dir, pacote } = instalar();
  const aula = join(dir, 'aula-servida');
  cli(pacote, 'novo', aula, '--unidade', 'ifusp');
  const servidor = spawn(process.execPath, [join(pacote, 'bin/aula-usp.mjs'), 'servir', aula, '--porta', '0']);
  try {
    const endereco = await new Promise((resolver, rejeitar) => {
      servidor.stdout.on('data', (pedaco) => {
        const achado = String(pedaco).match(/http:\/\/127\.0\.0\.1:\d+\//);
        if (achado) resolver(achado[0]);
      });
      servidor.on('exit', (codigo) => rejeitar(new Error(`servir saiu com ${codigo}`)));
    });
    const pagina = await fetch(endereco);
    assert.equal(pagina.status, 200);
    const html = await pagina.text();
    assert.doesNotMatch(html, /cdn\.jsdelivr\.net/, 'servir troca a tag pelo runtime local');
  } finally {
    servidor.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
