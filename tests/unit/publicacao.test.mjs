// O que vai para o npm (spec 12, fase 3). Duas propriedades medidas contra fontes independentes do
// campo `files`, que é o "gerador" aqui:
// 1. o fecho de imports relativos a partir de bin/aula-usp.mjs está inteiro no tarball — o universo
//    vem do código-fonte, não do `files`;
// 2. nada do que é só do desenvolvimento do sistema vai junto.
// O que este teste NÃO vê: arquivo de dados lido por caminho montado em tempo de execução
// (`new URL('contrato/contrato.json', raiz)`), nem pasta guardada numa constante antes de virar URL
// (`MODELO` em bin/aula-usp.mjs). Esse alcance é de tests/integracao/instalacao.test.mjs, que roda os
// comandos no tarball extraído.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);
const pacote = JSON.parse(readFileSync(new URL('package.json', RAIZ), 'utf8'));

function arquivosDoTarball() {
  const saida = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'],
    { cwd: RAIZ, encoding: 'utf8' });
  return new Set(JSON.parse(saida)[0].files.map((arquivo) => arquivo.path));
}

// Especificadores relativos: import estático, import() dinâmico e new URL(…, import.meta.url).
const RELATIVO = /(?:from\s+|import\(\s*|new URL\(\s*)'(\.{1,2}\/[^']+)'/g;

function fechoDeImports(inicio) {
  const vistos = new Set();
  const pendentes = [inicio];
  while (pendentes.length) {
    const atual = pendentes.pop();
    if (vistos.has(atual)) continue;
    vistos.add(atual);
    if (!/\.m?js$/.test(atual)) continue;
    const fonte = readFileSync(new URL(atual, RAIZ), 'utf8');
    for (const [, especificador] of fonte.matchAll(RELATIVO)) {
      const alvo = new URL(especificador, new URL(atual, RAIZ)).href.slice(RAIZ.href.length);
      pendentes.push(alvo);
    }
  }
  return [...vistos];
}

test('o package.json é publicável: sem private, com files, license e repository', () => {
  assert.equal(pacote.private, undefined);
  assert.ok(Array.isArray(pacote.files) && pacote.files.length > 0, 'falta o campo files');
  assert.ok(pacote.license, 'falta license');
  assert.ok(pacote.repository, 'falta repository');
});

// A única citação cuja AUSÊNCIA no tarball é o que o código procura: `exigirRepositorio`, em
// bin/aula-usp.mjs, olha se especime/ existe para saber se está num clone ou no pacote instalado.
// A exceção é pelo caminho exato: um arquivo DENTRO de especime/ citado por um módulo do fecho é
// outro caminho e continua caindo. O que ela deixa passar é uma segunda citação à própria pasta.
const AUSENCIA_PROCURADA = new Set(['especime/']);

test('todo arquivo e pasta que a CLI importa ou lê por caminho relativo ao módulo está no tarball', () => {
  const tarball = arquivosDoTarball();
  const caminhos = [...tarball];
  const faltam = fechoDeImports('bin/aula-usp.mjs').filter((caminho) => !AUSENCIA_PROCURADA.has(caminho)).filter((caminho) => caminho.endsWith('/')
    ? !caminhos.some((arquivo) => arquivo.startsWith(caminho))
    : !tarball.has(caminho));
  assert.deepEqual(faltam, []);
});

test('o tarball não leva o que é só do desenvolvimento do sistema', () => {
  const FORA = ['tests/', 'docs/', 'pacotes/', 'especime/', '.superpowers/', '.claude/', 'AGENTS.md', 'CLAUDE.md'];
  const vazados = [...arquivosDoTarball()].filter((caminho) => FORA.some((fora) => caminho.startsWith(fora)));
  assert.deepEqual(vazados, []);
});

// O `files` não aplica o .gitignore dentro das pastas que ele lista: medido, um
// exemplos/regressao-linear/dist/ de build local (ignorado pelo git) entrava no tarball. Só o dist/
// da raiz é do pacote. Esta guarda só tem o que olhar quando há um build local no disco — sem ele, ela
// passa sem ter visto nada.
test('o tarball não leva o dist/ de uma aula construída, só o da raiz', () => {
  const construidos = [...arquivosDoTarball()].filter((caminho) => caminho.includes('/dist/') && !caminho.startsWith('dist/'));
  assert.deepEqual(construidos, []);
});
