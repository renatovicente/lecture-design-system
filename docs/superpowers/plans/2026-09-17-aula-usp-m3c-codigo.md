# Aula USP · Marco 3c (Código com destaque) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Destacar o código de `pre[data-lang]` com o Shiki, num tema monocromático gerado dos tokens, com linhas marcadas em campo amarelo e números de linha, nos modos de desenvolvimento e build.

**Architecture:** `componentes/codigo.js` recebe o Shiki por parâmetro, como `componentes/tex.js` recebe o KaTeX, e troca o texto de cada `pre[data-lang]` por linhas com palavras-chave e comentários marcados por classe; o CSS dá peso e cor a partir dos tokens. Em desenvolvimento, `aula-usp servir` põe na aula um mapa de importação gerado pela resolução do próprio Node e serve os pacotes da lista sob `/_aula-usp/modulos/`, e o navegador importa o KaTeX e o Shiki pelo nome; `montar/navegador.js` só importa o Shiki quando a aula tem `pre[data-lang]`, e só as gramáticas das linguagens usadas.

**Tech Stack:** Node 20.6+ (máquina do autor: v25.6.1), ES modules, `node:test`; `@shikijs/primitive`, `@shikijs/engine-javascript` e `@shikijs/langs` 4.4.3 (dependências novas, versão exata); `katex` 0.18.7, `linkedom` e `playwright-core`, já no projeto; Google Chrome instalado (ou `CHROME_PATH`).

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 3.2, 3.5, 4.2, 4.3, 4.4, 5.3, 5.5, 7.1, 8.2 e 11.1). Estado de partida: marco 3b na `main` (`3935e2a`), com a matemática; 145 testes unitários e 65 de integração.

## Global Constraints

- Node 20 ou superior; ES modules; testes com `node:test` e `node:assert/strict`; sem Python.
- `montar/`, `motor/` e `componentes/` não importam nada de Node: só API padrão do DOM, para rodar no navegador (spec 3.5).
- Nomes de arquivos, pastas, classes, atributos e identificadores em português.
- Toda classe gerada pelo sistema está em `contrato.classesDoSistema`; classes do autor nunca são geradas pelo sistema.
- Cor (spec 4.2): `cinza` tem o papel de "rodapé, legendas, comentários de código"; `amarelo` é "campo sob tinta", inclusive "linha marcada de código", e "sobre ele, só `tinta`"; "nenhuma outra cor nos slides".
- Tipografia (spec 4.3): "código | `pre`, `code` | Geist Mono | 20 / 1,45 | 400; palavras-chave 600".
- Grid (spec 4.4): `regua`, de 2 px, inclui a "régua superior do código".
- Componente (spec 7.1): "`pre[data-lang]` em Geist Mono 20 px com `regua` acima; tema monocromático (palavras-chave 600, comentários em `cinza`, o resto em `tinta`); `data-linhas="3-5,8"` marca linhas em campo `amarelo`; `data-numeros` mostra números de linha em `cinza`", com as "linguagens: python, r, sql, javascript, bash, json, latex".
- Shiki (spec 7.1): "O destaque de código usa o Shiki (núcleo, motor de expressões regulares em JavaScript e sem WASM, gramáticas por linguagem) com um tema próprio gerado dos tokens; o mesmo marcador roda no navegador e no build."
- Carga (spec 3.2): o runtime carrega o código só "se tem `pre[data-lang]`".
- Limites (spec 5.3): "código | ≤ 16 linhas e ≤ 64 colunas".
- Testes (spec 11.1): "código: palavras-chave, comentários e linhas marcadas no tema".
- Dependências novas: só as três do Shiki, na versão exata 4.4.3 (spec 8.2 lista `shiki`; ver Decisões).
- Testes de integração rodam um arquivo por vez (`node --test tests/integracao/<arquivo>`), para que cada execução termine em segundos.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Decisões deste marco (conferidas com o Shiki 4.4.3 e no Chrome 152 antes de escrever o plano; o autor pode revê-las)

- **Três pacotes do Shiki em vez do pacote `shiki`.** A spec descreve o destaque como "núcleo, motor de expressões regulares em JavaScript e sem WASM, gramáticas por linguagem": são `@shikijs/primitive` (o núcleo do Shiki 4 sem a geração de HTML), `@shikijs/engine-javascript` e `@shikijs/langs`, todos em 4.4.3. O pacote `shiki` traria também o motor em WASM, todos os temas e o `hast`, que o sistema não usa.
- **Em desenvolvimento, os módulos de terceiros vêm pelo nome, com um mapa de importação.** O Shiki importa outros pacotes pelo nome (`@shikijs/types`, `oniguruma-to-es`…), então servir a pasta `dist` de um pacote, como o M3b fez com o KaTeX, não basta. `aula-usp servir` passa a pôr na aula, antes do carregador, um `<script type="importmap">` gerado com `import.meta.resolve`, a resolução do próprio Node, e a servir sob `/_aula-usp/modulos/<pacote>/` só os pacotes da lista `MODULOS_DO_NAVEGADOR`. Não há bundler em desenvolvimento; no marco 5, o esbuild embute tudo.
- **O KaTeX também vem pelo mapa.** `import('katex')` e a folha em `modulos/katex/dist/` substituem `BIBLIOTECAS` e a rota `bibliotecas` do M3b: um mecanismo só, e a pasta do pacote vem da resolução do Node, não do caminho fixo `node_modules/katex/dist` que a revisão final do M3b apontou.
- **A lista de módulos inclui os nomes que o Shiki importa por dentro**, e um teste unitário percorre o grafo de módulos para garantir que nenhum ficou de fora; a lista das gramáticas sai de `contrato.linguagens`.
- **`import.meta.resolve` sem flag exige Node 20.6 ou superior.** O `engines` do `package.json` continua `>=20`; o Node 20 saiu de suporte em abril de 2026.
- **Destaque por classe, não por estilo em linha.** O tema do Shiki só classifica os tokens: negrito vira `span.palavra-chave` e cinza vira `span.comentario`; peso e cor vêm do CSS, a partir dos tokens. Assim, "sobre amarelo, só tinta" é uma regra de CSS: na linha marcada, comentário e número ficam em `tinta`. Isto fecha a pendência do M1 sobre comentários `cinza` em linha marcada (3,2:1).
- **O que é palavra-chave**, conferido em trechos das sete linguagens: os escopos `keyword`, `storage.type`, `storage.modifier` e `constant.language` (`None`, `true`, `NULL`) saem em 600; operadores escritos com símbolos (`=`, `<-`, `=>`, `-f`) e o prefixo `f` de f-string do Python, não; operadores escritos com letras (`and`, `not`, `new`, `typeof`), sim; no LaTeX, todo comando, com a barra (`\begin`, `\frac`, `\eta`), porque a gramática marca uns como palavra-chave e outros como função.
- **Cada linha é um `span.linha` em `inline-block` da largura do bloco, com a quebra de linha do código entre elas.** Copiar do slide traz o código exato, com as linhas vazias (com linhas em bloco, as vazias sumiam da cópia), e o texto do `pre` renderizado continua sendo o código, o que o validador do marco 4 pode medir.
- **Linhas vazias no começo e no fim do bloco não contam.** O parser do Chrome descarta a quebra de linha logo depois de `<pre>`; o do `linkedom`, não. Sem a normalização, o mesmo bloco teria uma linha a mais no build, a mesma armadilha do `tbody` implícito no M3a.
- **Recuo de 8 px dentro da régua.** O código começa 8 px depois da borda do bloco; a linha marcada cobre o recuo, de ponta a ponta do bloco; um `pre` sem `data-lang` ganha o mesmo recuo.
- **8 px entre a régua e a primeira linha, para 16 linhas caberem.** Sob um título de uma linha, sobram 476 px; 16 linhas de 29 px, a régua e 8 px terminam em y = 649,5, dentro da zona de conteúdo (652). Com 16 px, não cabiam.
- **Números de linha em contador de CSS** (`::before`), numa margem de 2 caracteres alinhados à direita mais 2 de espaço: ficam fora do texto do bloco e fora da cópia.
- **Linguagem fora da lista não é destacada, mas vira linhas**, com as linhas marcadas e os números; o erro vai para o console como `Aula USP: código com linguagem fora da lista em data-lang: "…"`, até o painel do validador existir (marco 4).
- **Carga sob demanda testada nos dois componentes**: aula sem `pre[data-lang]` não pede nada do Shiki; aula sem TeX não pede o KaTeX (teste que a revisão final do M3b pediu); aula só com Python pede só a gramática de Python.
- **`code` dentro de `pre` é aceito**: o texto é o mesmo, e as linhas o substituem.
- **Espécime próprio.** `especime/codigo.html`, com 9 slides, e erros e marcação em `tests/fixtures/codigo/`.
- **O que continua para depois:** no marco 4, a regra `recursos.linguagem`, a contagem de linhas e colunas com `codigoDoBloco` e o painel para os erros de código; numa coluna de uma grade 6-6 cabem cerca de 45 colunas, não 64, e sob um título de duas linhas cabem 14 linhas, não 16, o que `composicao.transbordo` acusa e o guia (marco 6) precisa avisar; tabulação aparece com 8 espaços; `pre` sem `data-lang` e código nas notas do apresentador ficam sem destaque. No marco 5, embutir o Shiki e as sete gramáticas em `aula-usp-codigo.js` (meta de 600 KB; as gramáticas somam 434 KB sem minificar) e subir o `engines` para Node 20.6 se a rota de desenvolvimento sobreviver.

## Roteiro atualizado

| plano | escopo | depende de |
|---|---|---|
| M3b · Matemática | concluído na `main` (`3935e2a`) | M3a |
| **M3c · Código com destaque (este)** | Shiki com tema dos tokens, linhas marcadas, números, módulos pelo nome em desenvolvimento | M3b |
| M4 · Validador | regras estáticas, de carga e de composição, painel (V) | M3c |
| M5 · Build e PDF | embutir, PDF, regras de saída, `dist` com SRI | M4 |
| M6 · Guia e pacotes | guia, modelo, aula-exemplo, pacotes | M5 |
| M7 · Aceite | Claude Code e Codex CLI | M6 |

## Estrutura de arquivos deste marco

| arquivo | responsabilidade |
|---|---|
| `build/servir.mjs` | mapa de importação na aula, rota `/_aula-usp/modulos/` presa à lista de módulos; sai a rota `bibliotecas` |
| `componentes/codigo.js` | tema gerado dos tokens, linhas marcadas, texto do bloco, destacador com o Shiki recebido, troca de `pre[data-lang]` por linhas |
| `montar/navegador.js` | KaTeX pelo nome; Shiki só com `pre[data-lang]`, com as gramáticas usadas, antes do motor |
| `estilos/componentes.css` | bloco de código: fonte, régua, recuo, linhas, palavras-chave, comentários, campo amarelo, números |
| `contrato/contrato.json` | `linha`, `marcada`, `palavra-chave` e `comentario` em `classesDoSistema` |
| `package.json`, `package-lock.json` | os três pacotes do Shiki em 4.4.3 |
| `especime/codigo.html` | código nas sete linguagens, em colunas, com linhas marcadas, números e 16 linhas |
| `tests/fixtures/codigo/index.html` | linguagem fora da lista, `code` dentro de `pre`, entidades e `pre` sem linguagem |
| `tests/unit/servir.test.mjs`, `tests/unit/codigo.test.mjs` | testes unitários |
| `tests/integracao/codigo.test.mjs`, `utilitarios.mjs` | testes no Chrome; `CINZA` e os pedidos de rede de cada página |

---

### Task 1: Módulos de terceiros pelo nome

**Files:**
- Modify: `package.json`, `package-lock.json`, `build/servir.mjs`, `montar/navegador.js`
- Test: `tests/unit/servir.test.mjs`

**Interfaces:**
- Consumes: `contrato.linguagens` (`contrato/contrato.json`); o `katex` 0.18.7 já instalado; o teste de integração `tests/integracao/matematica.test.mjs` do marco 3b.
- Produces (usado pelas Tasks 2 e 3):
  - os pacotes `@shikijs/primitive`, `@shikijs/engine-javascript` e `@shikijs/langs` 4.4.3 instalados;
  - em `build/servir.mjs`: `MODULOS_DO_NAVEGADOR` (lista de nomes), `nomeDoPacote(especificador) → string`, `mapaDeImportacao() → { imports: { [nome]: '/_aula-usp/modulos/<pacote>/<arquivo>' } }`, e `reescreverRuntime(html)` pondo `<script type="importmap">` antes do carregador;
  - no navegador, `import('katex')`, `import('@shikijs/primitive')`, `import('@shikijs/engine-javascript')` e `import('@shikijs/langs/<linguagem>')` resolvidos pelo mapa;
  - a rota `/_aula-usp/modulos/<pacote>/…`; a rota `/_aula-usp/bibliotecas/…` deixa de existir.

- [ ] **Step 1: Instalar os pacotes do Shiki**

Run: `npm install --save-exact @shikijs/primitive@4.4.3 @shikijs/engine-javascript@4.4.3 @shikijs/langs@4.4.3`
Expected: `package.json` termina com

```json
  "bin": {
    "aula-usp": "bin/aula-usp.mjs"
  },
  "dependencies": {
    "@shikijs/engine-javascript": "4.4.3",
    "@shikijs/langs": "4.4.3",
    "@shikijs/primitive": "4.4.3",
    "katex": "0.18.7"
  }
}
```

e `package-lock.json` passa a ter também `@shikijs/types`, `@shikijs/vscode-textmate`, `oniguruma-to-es`, `oniguruma-parser`, `regex`, `regex-recursion`, `regex-utilities`, `@types/hast` e `@types/unist`.

- [ ] **Step 2: Escrever os testes que falham**

Em `tests/unit/servir.test.mjs`, trocar

```js
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reescreverRuntime, resolverSeguro, criarServidor, PREFIXO } from '../../build/servir.mjs';
```

por

```js
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  reescreverRuntime, resolverSeguro, criarServidor, mapaDeImportacao, PREFIXO, MODULOS_DO_NAVEGADOR,
} from '../../build/servir.mjs';
```

logo antes do teste `'reescreverRuntime não mexe em HTML sem a tag do runtime'`, acrescentar:

```js
test('reescreverRuntime põe o mapa de importação antes da entrada de desenvolvimento', () => {
  const saida = reescreverRuntime('<head><script src="https://cdn.jsdelivr.net/npm/aula-usp@1.0.0/dist/aula-usp.js" '
    + 'integrity="sha384-abc" crossorigin="anonymous"></script></head>');
  const mapa = /<script type="importmap">(.*?)<\/script>/.exec(saida);
  assert.ok(mapa, 'sem mapa de importação');
  assert.deepEqual(JSON.parse(mapa[1]), mapaDeImportacao());
  assert.ok(mapa.index < saida.indexOf(`${PREFIXO}montar/carregador.js`));
});
```

e trocar os dois testes do KaTeX

```js
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
```

por

```js
test('mapa de importação leva cada módulo do navegador a /_aula-usp/modulos/, e o servidor entrega cada um como JavaScript', async () => {
  const { imports } = mapaDeImportacao();
  assert.deepEqual(Object.keys(imports), MODULOS_DO_NAVEGADOR);
  assert.equal(imports.katex, `${PREFIXO}modulos/katex/dist/katex.mjs`);
  assert.equal(imports['@shikijs/langs/python'], `${PREFIXO}modulos/@shikijs/langs/dist/python.mjs`);
  for (const [especificador, endereco] of Object.entries(imports)) {
    const modulo = await pedir(endereco);
    assert.equal(modulo.status, 200, especificador);
    assert.match(modulo.tipo, /^text\/javascript/, especificador);
  }
});

test('os módulos do navegador fecham o grafo: todo nome que eles importam por dentro está na lista', () => {
  const IMPORTACAO = /\b(?:import|export)\s*(?:[\w*{},\s]+\s*from\s*)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  const pendentes = MODULOS_DO_NAVEGADOR.map((especificador) => fileURLToPath(import.meta.resolve(especificador)));
  const vistos = new Set();
  const foraDaLista = new Set();
  while (pendentes.length) {
    const arquivo = pendentes.pop();
    if (vistos.has(arquivo)) continue;
    vistos.add(arquivo);
    const fonte = readFileSync(arquivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, estatico, dinamico] of fonte.matchAll(IMPORTACAO)) {
      const especificador = estatico ?? dinamico;
      if (especificador.startsWith('.')) pendentes.push(resolve(dirname(arquivo), especificador));
      else if (!MODULOS_DO_NAVEGADOR.includes(especificador)) foraDaLista.add(especificador);
    }
  }
  assert.deepEqual([...foraDaLista], []);
  assert.ok(vistos.size > MODULOS_DO_NAVEGADOR.length, `só ${vistos.size} arquivos percorridos`);
});

test('servidor entrega a folha de estilo e as fontes do KaTeX pela pasta do pacote', async () => {
  const css = await pedir(`${PREFIXO}modulos/katex/dist/katex.min.css`);
  assert.equal(css.status, 200);
  assert.match(css.tipo, /^text\/css/);
  assert.ok(css.corpo.includes('KaTeX_Main'));
  const fonte = await pedir(`${PREFIXO}modulos/katex/dist/fonts/KaTeX_Main-Regular.woff2`);
  assert.equal(fonte.status, 200);
  assert.equal(fonte.tipo, 'font/woff2');
});

test('servidor recusa pacote fora da lista e caminho que sai da pasta do pacote', async () => {
  assert.equal((await pedir(`${PREFIXO}modulos/linkedom/package.json`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}modulos/@shikijs/core/package.json`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}modulos/katex/..%2fpackage.json`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}modulos/katex/..%2f..%2f..%2fpackage.json`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}bibliotecas/katex/katex.mjs`)).status, 403);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/unit/servir.test.mjs`
Expected: FAIL no arquivo inteiro, com `SyntaxError: The requested module '../../build/servir.mjs' does not provide an export named 'MODULOS_DO_NAVEGADOR'`.

- [ ] **Step 4: Substituir o conteúdo de `build/servir.mjs`**

```js
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
```

- [ ] **Step 5: Rodar os testes do servidor e ver a matemática falhar**

Run: `node --test tests/unit/servir.test.mjs`
Expected: PASS nos 17 testes.

Run: `node --test tests/integracao/matematica.test.mjs`
Expected: FAIL nos 6 testes, todos com `Error: Aula USP: não carregou bibliotecas/katex/katex.min.css`: o servidor já não tem a rota `bibliotecas`, e `montar/navegador.js` ainda pede o KaTeX por ela.

- [ ] **Step 6: Importar o KaTeX pelo nome**

Em `montar/navegador.js`, trocar

```js
      import(new URL('bibliotecas/katex/katex.mjs', BASE).href),
      carregarEstilo('bibliotecas/katex/katex.min.css'),
```

por

```js
      import('katex'),
      carregarEstilo('modulos/katex/dist/katex.min.css'),
```

- [ ] **Step 7: Rodar os testes**

Run: `node --test tests/integracao/matematica.test.mjs`
Expected: PASS nos 6 testes.

Run: `npm test`
Expected: PASS em todos (145 do marco 3b − 2 testes do KaTeX trocados + 5 novos = 148).

Run, um arquivo por vez: `for arquivo in tests/integracao/*.test.mjs; do node --test "$arquivo" || break; done`
Expected: PASS nos 65 testes de integração.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json build/servir.mjs montar/navegador.js tests/unit/servir.test.mjs
git commit -m "feat(servir): módulos de terceiros pelo nome, com mapa de importação, e o KaTeX por ele

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Destaque de código

**Files:**
- Create: `componentes/codigo.js`
- Test: `tests/unit/codigo.test.mjs`

**Interfaces:**
- Consumes: os pacotes do Shiki instalados na Task 1; `tokens` de `tokens/tokens.js` (`tokens.cor.tinta`, `cinza`, `papel`); `contrato.linguagens`.
- Produces (usado pela Task 3 e, no marco 5, pelo build):
  - `TEMA`, o tema do Shiki gerado dos tokens;
  - `linhasMarcadas(valor) → Set<number>`, de `data-linhas`;
  - `codigoDoBloco(pre) → string`, o texto do bloco sem linhas vazias no começo e no fim e com `\n` no lugar de `\r\n`;
  - `criarDestacador({ createShikiPrimitive, codeToTokensBase, createJavaScriptRegexEngine, gramaticas }) → { linguagens: Set<string>, linhas(codigo, linguagem) → Array<Array<{ texto, tipo: 'palavra-chave' | 'comentario' | null }>> }`, com `gramaticas` no formato `{ python: <export default de @shikijs/langs/python>, … }`;
  - `renderizarCodigo(raiz, { destacador }) → Array<{ linguagem, mensagem }>`, que troca o conteúdo de cada `pre[data-lang]` ainda não renderizado por `span.linha` (com `marcada` nas linhas de `data-linhas`) separados por `\n`, com `span.palavra-chave` e `span.comentario` dentro.

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/unit/codigo.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { createShikiPrimitive, codeToTokensBase } from '@shikijs/primitive';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import python from '@shikijs/langs/python';
import r from '@shikijs/langs/r';
import sql from '@shikijs/langs/sql';
import javascript from '@shikijs/langs/javascript';
import bash from '@shikijs/langs/bash';
import json from '@shikijs/langs/json';
import latex from '@shikijs/langs/latex';
import { linhasMarcadas, codigoDoBloco, criarDestacador, renderizarCodigo } from '../../componentes/codigo.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const destacador = criarDestacador({
  createShikiPrimitive,
  codeToTokensBase,
  createJavaScriptRegexEngine,
  gramaticas: { python, r, sql, javascript, bash, json, latex },
});
const corpo = (html) => parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`).document.body;

test('linhasMarcadas lê números e intervalos de data-linhas e deixa de fora o que não segue a forma', () => {
  assert.deepEqual([...linhasMarcadas('3-5,8')], [3, 4, 5, 8]);
  assert.deepEqual([...linhasMarcadas(' 2 , 4-4 ')], [2, 4]);
  assert.deepEqual([...linhasMarcadas('5-3,a,1-')], []);
  assert.deepEqual([...linhasMarcadas(null)], []);
});

test('codigoDoBloco tira as linhas vazias do começo e do fim e normaliza \\r\\n, como o navegador e o build veem o mesmo bloco', () => {
  assert.equal(codigoDoBloco({ textContent: '\r\n\nx = 1\r\n\r\ny = 2\n\n' }), 'x = 1\n\ny = 2');
});

test('o destacador cobre as linguagens do contrato: palavras-chave em negrito, operadores de símbolo não, comentários à parte', () => {
  assert.deepEqual([...destacador.linguagens], contrato.linguagens);
  const exemplos = {
    python: ['import numpy as np\ndef passo(w, g):\n    if w is None and not g:\n        return w - 0.1 * g  # desce',
      ['import', 'as', 'def', 'if', 'is', 'None', 'and', 'not', 'return'], ['# desce']],
    r: ['passo <- function(w, g) {\n  if (is.null(w)) return(NULL)  # vazio\n  w - 0.1 * g\n}',
      ['function', 'if', 'return', 'NULL'], ['# vazio']],
    sql: ['SELECT nome, AVG(nota) AS media\nFROM notas  -- por aluno\nWHERE nota >= 5\nGROUP BY nome;',
      ['SELECT', 'AS', 'FROM', 'WHERE', 'GROUP BY'], ['-- por aluno']],
    javascript: ['const passo = (w, g) => w - 0.1 * g;  // desce\nif (w === null) throw new Error("sem peso");',
      ['const', 'if', 'null', 'throw', 'new'], ['// desce']],
    bash: ['for f in *.csv; do\n  if [ -f "$f" ]; then wc -l "$f"; fi  # conta\ndone',
      ['for', 'in', 'do', 'if', 'then', 'fi', 'done'], ['# conta']],
    json: ['{\n  "taxa": 0.1,\n  "ativo": true,\n  "peso": null\n}', ['true', 'null'], []],
    // No LaTeX, todo comando é palavra-chave, com a barra.
    latex: ['\\begin{equation}\n  \\frac{\\partial E}{\\partial w} % gradiente\n\\end{equation}',
      ['\\begin', '\\frac', '\\partial', '\\partial', '\\end'], ['% gradiente']],
  };
  for (const [linguagem, [codigo, chaves, comentarios]] of Object.entries(exemplos)) {
    const pedacos = destacador.linhas(codigo, linguagem).flat();
    const doTipo = (tipo) => pedacos.filter((pedaco) => pedaco.tipo === tipo).map((pedaco) => pedaco.texto);
    assert.deepEqual(doTipo('palavra-chave'), chaves, linguagem);
    assert.deepEqual(doTipo('comentario'), comentarios, linguagem);
  }
});

test('renderizarCodigo troca o texto de pre[data-lang] por linhas, marca as de data-linhas e mantém as vazias do meio', () => {
  const raiz = corpo('<pre data-lang="python" data-linhas="1,3">\nx = 1  # um\n\nif x:\n    y = 2\n\n</pre>');
  assert.deepEqual(renderizarCodigo(raiz, { destacador }), []);
  const linhas = [...raiz.querySelectorAll('pre > span.linha')];
  assert.deepEqual(linhas.map((linha) => linha.textContent), ['x = 1  # um', '', 'if x:', '    y = 2']);
  assert.equal(raiz.querySelector('pre').textContent, 'x = 1  # um\n\nif x:\n    y = 2', 'o texto do bloco continua sendo o código');
  assert.deepEqual(linhas.map((linha) => linha.className), ['linha marcada', 'linha', 'linha marcada', 'linha']);
  assert.equal(raiz.querySelector('.linha .comentario').textContent, '# um');
  assert.equal(raiz.querySelector('.linha .palavra-chave').textContent, 'if');
});

test('renderizarCodigo aceita code dentro de pre, guarda <, > e & como texto e não toca pre sem data-lang', () => {
  const raiz = corpo('<pre data-lang="javascript"><code>if (a &lt; b &amp;&amp; c) f();</code></pre><pre>sem linguagem</pre>');
  assert.deepEqual(renderizarCodigo(raiz, { destacador }), []);
  const bloco = raiz.querySelector('pre[data-lang]');
  assert.equal(bloco.textContent, 'if (a < b && c) f();');
  assert.equal(bloco.querySelector('code'), null);
  assert.equal(raiz.querySelector('pre:not([data-lang])').innerHTML, 'sem linguagem');
});

test('linguagem fora da lista vira erro, e o bloco sai em linhas sem destaque, ainda com as linhas marcadas', () => {
  const raiz = corpo('<pre data-lang="cobol" data-linhas="2">MOVE 1 TO X.\nDISPLAY X.</pre>');
  assert.deepEqual(renderizarCodigo(raiz, { destacador }), [{ linguagem: 'cobol', mensagem: 'linguagem fora da lista em data-lang: "cobol"' }]);
  assert.deepEqual([...raiz.querySelectorAll('.linha')].map((linha) => `${linha.className}|${linha.textContent}`),
    ['linha|MOVE 1 TO X.', 'linha marcada|DISPLAY X.']);
  assert.equal(raiz.querySelectorAll('.palavra-chave, .comentario').length, 0);
});

test('renderizarCodigo é idempotente: uma segunda passada não muda nada', () => {
  const raiz = corpo('<pre data-lang="bash" data-linhas="1">echo "oi"  # saúda\n</pre><pre data-lang="cobol">X</pre>');
  renderizarCodigo(raiz, { destacador });
  const antes = raiz.innerHTML;
  assert.deepEqual(renderizarCodigo(raiz, { destacador }), []);
  assert.equal(raiz.innerHTML, antes);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/codigo.test.mjs`
Expected: FAIL no arquivo inteiro, com `ERR_MODULE_NOT_FOUND` (`Cannot find module '.../componentes/codigo.js'`).

- [ ] **Step 3: Criar `componentes/codigo.js`**

```js
// Código com destaque (spec 4.2, 4.3 e 7.1): troca o texto de cada pre[data-lang] por linhas, com palavras-chave e comentários marcados.
// O Shiki chega por parâmetro, para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.
import { tokens } from '../tokens/tokens.js';

const { tinta, cinza, papel } = tokens.cor;
const NEGRITO = 2; // FontStyle.Bold do Shiki

// Tema monocromático gerado dos tokens: tinta no texto, cinza nos comentários, negrito nas palavras-chave.
export const TEMA = {
  name: 'aula-usp',
  type: 'light',
  fg: tinta,
  bg: papel,
  settings: [
    { settings: { foreground: tinta } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: cinza } },
    { scope: ['keyword', 'storage.type', 'storage.modifier', 'constant.language'], settings: { fontStyle: 'bold' } },
    // Operadores escritos com símbolos (=, <-, =>, -f) e o prefixo f"" do Python não são palavras-chave; os escritos com letras são.
    { scope: ['keyword.operator', 'storage.type.function.arrow', 'storage.type.string'], settings: { fontStyle: '' } },
    { scope: ['keyword.operator.logical.python', 'keyword.operator.new', 'keyword.operator.expression', 'keyword.operator.word'], settings: { fontStyle: 'bold' } },
    // No LaTeX, todo comando é palavra-chave, com a barra.
    {
      scope: ['text.tex support.function', 'text.tex punctuation.definition.function', 'text.tex constant.character.math',
        'text.tex punctuation.definition.constant.math', 'text.tex constant.other.general.math'],
      settings: { fontStyle: 'bold' },
    },
  ],
};

// Linhas de data-linhas="3-5,8"; o que não segue a forma fica de fora, e o validador acusa.
export function linhasMarcadas(valor) {
  const linhas = new Set();
  for (const intervalo of (valor ?? '').split(',')) {
    const partes = /^\s*(\d+)(?:-(\d+))?\s*$/.exec(intervalo);
    if (!partes) continue;
    const inicio = Number(partes[1]);
    const fim = Number(partes[2] ?? partes[1]);
    for (let numero = inicio; numero <= fim; numero += 1) linhas.add(numero);
  }
  return linhas;
}

// Texto do bloco sem as linhas vazias do começo e do fim: o parser do navegador descarta a quebra logo depois de <pre>,
// o do build não, e assim os dois contam as mesmas linhas.
export function codigoDoBloco(pre) {
  return pre.textContent.replace(/\r\n?/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '');
}

// O destacador com as gramáticas da aula, uma por valor de data-lang: { python: gramatica, ... }.
export function criarDestacador({ createShikiPrimitive, codeToTokensBase, createJavaScriptRegexEngine, gramaticas }) {
  const primitivo = createShikiPrimitive({
    engine: createJavaScriptRegexEngine(),
    langs: Object.values(gramaticas),
    themes: [TEMA],
  });
  return {
    linguagens: new Set(Object.keys(gramaticas)),
    linhas: (codigo, linguagem) => codeToTokensBase(primitivo, codigo, { lang: linguagem, theme: TEMA.name })
      .map((linha) => linha.map((token) => ({
        texto: token.content,
        tipo: token.fontStyle & NEGRITO ? 'palavra-chave' : token.color?.toUpperCase() === cinza ? 'comentario' : null,
      }))),
  };
}

function montarLinha(doc, pedacos, marcada) {
  const linha = doc.createElement('span');
  linha.className = marcada ? 'linha marcada' : 'linha';
  for (const { texto, tipo } of pedacos) {
    if (!tipo) {
      linha.append(texto);
      continue;
    }
    const pedaco = doc.createElement('span');
    pedaco.className = tipo;
    pedaco.textContent = texto;
    linha.append(pedaco);
  }
  return linha;
}

// Troca, dentro de raiz, o texto de cada pre[data-lang] por linhas; devolve os erros, cada um com a linguagem e a mensagem.
export function renderizarCodigo(raiz, { destacador }) {
  const doc = raiz.ownerDocument ?? raiz;
  const erros = [];
  for (const pre of raiz.querySelectorAll('pre[data-lang]')) {
    if (pre.firstElementChild?.classList.contains('linha')) continue;
    const linguagem = pre.getAttribute('data-lang');
    const codigo = codigoDoBloco(pre);
    let linhas;
    if (destacador.linguagens.has(linguagem)) {
      linhas = destacador.linhas(codigo, linguagem);
    } else {
      erros.push({ linguagem, mensagem: `linguagem fora da lista em data-lang: "${linguagem}"` });
      linhas = codigo.split('\n').map((texto) => [{ texto, tipo: null }]);
    }
    const marcadas = linhasMarcadas(pre.getAttribute('data-linhas'));
    // Uma quebra de linha entre as linhas: o texto do bloco continua sendo o código, e copiar do slide traz as linhas vazias.
    pre.replaceChildren(...linhas.flatMap((pedacos, k) => [...(k > 0 ? ['\n'] : []), montarLinha(doc, pedacos, marcadas.has(k + 1))]));
  }
  return erros;
}
```

- [ ] **Step 4: Rodar os testes unitários**

Run: `node --test tests/unit/codigo.test.mjs`
Expected: PASS nos 7 testes.

Run: `npm test`
Expected: PASS em todos (148 da Task 1 + 7 = 155).

- [ ] **Step 5: Commit**

```bash
git add componentes/codigo.js tests/unit/codigo.test.mjs
git commit -m "feat(componentes): código com destaque monocromático, com o Shiki recebido por parâmetro

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: Código no navegador

**Files:**
- Create: `especime/codigo.html`, `tests/fixtures/codigo/index.html`
- Modify: `montar/navegador.js`, `estilos/componentes.css`, `contrato/contrato.json`, `tests/integracao/utilitarios.mjs`
- Test: `tests/integracao/codigo.test.mjs`

**Interfaces:**
- Consumes: o mapa de importação e a rota `modulos` (Task 1); `criarDestacador` e `renderizarCodigo` (Task 2); `contrato.linguagens`, lido por `montar/navegador.js`; `tests/integracao/utilitarios.mjs` (`iniciarChrome`, `servirPasta`, `abrirAula`, `classesForaDoContrato`, `perto`, `TINTA`, `AMARELO`, `TRANSPARENTE`).
- Produces:
  - no navegador, o código renderizado antes do motor, com os erros no console como `Aula USP: código com <mensagem>`;
  - as classes `linha`, `marcada`, `palavra-chave` e `comentario` em `contrato.classesDoSistema`;
  - em `tests/integracao/utilitarios.mjs`, a constante `CINZA` e `abrirAula(...) → { pagina, erros, pedidos }`, com `pedidos` guardando o endereço de cada pedido de rede da página.

- [ ] **Step 1: Preparar os utilitários de integração**

Em `tests/integracao/utilitarios.mjs`, trocar

```js
export const TINTA = 'rgb(10, 10, 10)';
export const PAPEL = 'rgb(255, 255, 255)';
```

por

```js
export const TINTA = 'rgb(10, 10, 10)';
export const CINZA = 'rgb(102, 102, 102)';
export const PAPEL = 'rgb(255, 255, 255)';
```

trocar

```js
  const erros = [];
  pagina.on('pageerror', (erro) => erros.push(erro.message));
```

por

```js
  const erros = [];
  const pedidos = [];
  pagina.on('request', (pedido) => pedidos.push(pedido.url()));
  pagina.on('pageerror', (erro) => erros.push(erro.message));
```

e trocar

```js
  return { pagina, erros };
```

por

```js
  return { pagina, erros, pedidos };
```

- [ ] **Step 2: Criar o espécime de código e a fixture**

Criar `especime/codigo.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Código no Aula USP</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Espécime do Aula USP">
<meta name="aula" content="3c">
<meta name="data" content="2026-09-17">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Código com destaque<br><span class="sinal">em sete linguagens</span></h1>
</section>

<section data-layout="abertura" id="descida" data-curto="Descida">
  <h2>Descida do gradiente</h2>
  <p class="pergunta">O que muda nos pesos de um passo para o outro?</p>
</section>

<section data-layout="conteudo" id="linhas-marcadas">
  <h2>Linhas marcadas e numeradas</h2>
<pre data-lang="python" data-linhas="6-7" data-numeros>
import numpy as np

def descida(w, x, y, eta=0.1, passos=100):
    """Ajusta w por mínimos quadrados."""
    for _ in range(passos):
        erro = x @ w - y  # resíduo de cada exemplo
        w = w - eta * x.T @ erro / len(y)
    return w
</pre>
  <aside class="notas">As linhas marcadas são o passo; o resto só prepara o laço.</aside>
</section>

<section data-layout="abertura" id="outras-linguagens" data-curto="Linguagens">
  <h2>Outras linguagens</h2>
  <p class="pergunta">Como o mesmo destaque vale para R, SQL, JavaScript, Bash, JSON e LaTeX?</p>
</section>

<section data-layout="conteudo" id="r-e-sql">
  <h2>R e SQL lado a lado</h2>
  <div class="colunas" data-grade="6-6">
    <div>
<pre data-lang="r" data-linhas="4">
# média móvel de k pontos
media_movel &lt;- function(x, k = 3) {
  janelas &lt;- embed(x, k)
  rowMeans(janelas)  # uma média por janela
}
</pre>
    </div>
    <div>
<pre data-lang="sql" data-linhas="2" data-numeros>
SELECT turma, AVG(nota) AS media
FROM provas  -- só a P1
WHERE nota IS NOT NULL
GROUP BY turma
ORDER BY media DESC;
</pre>
    </div>
  </div>
</section>

<section data-layout="conteudo" id="javascript-e-bash">
  <h2>JavaScript e Bash</h2>
<pre data-lang="javascript" data-linhas="3-4">
const passo = (w, g, eta = 0.1) =&gt; w - eta * g;
let w = 1;

for (let t = 0; t &lt; 3; t++) w = passo(w, 2 * w);
console.log(w);  // 0.512
</pre>
  <p>O mesmo laço, rodado para cada arquivo de dados:</p>
<pre data-lang="bash">
for f in dados/*.csv; do
  node treino.js "$f"  # um modelo por arquivo
done
</pre>
</section>

<section data-layout="conteudo" id="json-e-latex">
  <h2>JSON e LaTeX</h2>
  <div class="colunas" data-grade="6-6">
    <div>
<pre data-lang="json">
{
  "taxa": 0.1,
  "passos": 100,
  "normalizar": true
}
</pre>
    </div>
    <div>
<pre data-lang="latex" data-linhas="2">
\begin{equation}
  w_{t+1} = w_t - \eta \nabla E(w_t)
\end{equation}
% eta: taxa de aprendizado
</pre>
    </div>
  </div>
</section>

<section data-layout="conteudo" id="dezesseis-linhas">
  <h2>No limite: 16 linhas</h2>
<pre data-lang="python" data-linhas="8-11" data-numeros>
def perceptron(x, y, epocas=10, eta=1.0):
    """Treina um perceptron com rótulos -1 e +1."""
    w = np.zeros(x.shape[1])
    b = 0.0
    for epoca in range(epocas):
        erros = 0
        for xi, yi in zip(x, y):
            if yi * (xi @ w + b) &lt;= 0:  # classificou errado
                w = w + eta * yi * xi
                b = b + eta * yi
                erros += 1
        if erros == 0:
            break
    return w, b

pesos, vies = perceptron(x_treino, y_treino, epocas=20)
</pre>
</section>

<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>Palavras-chave em peso, comentários em cinza.</li>
    <li>A linha marcada é a ênfase do código.</li>
  </ol>
  <p class="proxima">Próximo marco: o validador.</p>
</section>

</body>
</html>
```

Criar `tests/fixtures/codigo/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Código com problemas</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Fixture de código">
<meta name="aula" content="3c">
<meta name="data" content="2026-09-17">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../../../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Código com problemas</h1>
</section>

<section data-layout="abertura">
  <h2>Linguagens</h2>
</section>

<section data-layout="conteudo" id="fora-da-lista">
  <h2>Linguagem fora da lista</h2>
<pre data-lang="cobol" data-linhas="2">
MOVE 1 TO CONTADOR.
DISPLAY CONTADOR.
</pre>
</section>

<section data-layout="abertura">
  <h2>Marcação</h2>
</section>

<section data-layout="conteudo" id="com-code">
  <h2>Code dentro de pre e pre sem linguagem</h2>
  <pre data-lang="python"><code>if a &lt; b and b &gt; c:  # compara
    print("a &amp; b")</code></pre>
  <pre>sem data-lang, fica como está</pre>
</section>

<section data-layout="encerramento">
  <h2>Fim</h2>
  <ol class="sintese">
    <li>Nada mais.</li>
  </ol>
</section>

</body>
</html>
```

- [ ] **Step 3: Escrever os testes de integração que falham**

Criar `tests/integracao/codigo.test.mjs`:

```js
// Código com destaque no Chrome, sobre especime/codigo.html e tests/fixtures/codigo/ servidos por `aula-usp servir` (spec 3.2, 4.2, 4.3 e 7.1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  iniciarChrome, servirPasta, abrirAula, classesForaDoContrato, perto, TINTA, CINZA, AMARELO, TRANSPARENTE,
} from './utilitarios.mjs';

let servidor;
let navegador;
let folhaAberta;

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

const folha = () => (folhaAberta ??= abrirAula(navegador, `${servidor.endereco}/codigo.html?folha`));
const modulosPedidos = (pedidos) => pedidos
  .map((endereco) => new URL(endereco).pathname)
  .filter((caminho) => caminho.startsWith('/_aula-usp/modulos/'))
  .map((caminho) => caminho.slice('/_aula-usp/modulos/'.length));

test('espécime de código: 9 slides com blocos nas sete linguagens, todos em linhas, sem erros e com as classes no contrato', async () => {
  const { pagina, erros } = await folha();
  const medida = await pagina.evaluate(() => {
    const blocos = [...document.querySelectorAll('pre[data-lang]')];
    return {
      slides: document.querySelectorAll('section.slide').length,
      linguagens: [...new Set(blocos.map((pre) => pre.getAttribute('data-lang')))].sort(),
      semLinhas: blocos.filter((pre) => !pre.firstElementChild?.classList.contains('linha')).length,
    };
  });
  assert.equal(medida.slides, 9);
  assert.deepEqual(medida.linguagens, ['bash', 'javascript', 'json', 'latex', 'python', 'r', 'sql']);
  assert.equal(medida.semLinhas, 0);
  assert.deepEqual(erros, []);
  assert.deepEqual(await classesForaDoContrato(pagina), []);
});

test('bloco em Geist Mono 20 px com régua de 2 px acima; palavras-chave em 600, comentários em cinza, o resto em tinta', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const pre = document.querySelector('#linhas-marcadas pre');
    const estilo = getComputedStyle(pre);
    const chave = pre.querySelector('.palavra-chave');
    const comentario = document.querySelector('#javascript-e-bash pre[data-lang="bash"] .comentario');
    return {
      fonte: [estilo.fontFamily.split(',')[0].replaceAll('"', ''), estilo.fontSize, estilo.lineHeight],
      regua: [estilo.borderTopWidth, estilo.borderTopStyle, estilo.borderTopColor],
      texto: estilo.color,
      chave: [chave.textContent, getComputedStyle(chave).fontWeight, getComputedStyle(chave).color],
      comentario: [comentario.textContent, getComputedStyle(comentario).fontWeight, getComputedStyle(comentario).color],
      // A linha 3 do JavaScript é vazia, marcada e sem número: só a altura mínima a mantém no campo amarelo.
      alturas: [...new Set([...document.querySelectorAll('#linhas-marcadas pre .linha, #javascript-e-bash pre[data-lang="javascript"] .linha')]
        .map((linha) => linha.getBoundingClientRect().height))],
    };
  });
  assert.deepEqual(medida.fonte, ['Geist Mono', '20px', '29px']);
  assert.deepEqual(medida.regua, ['2px', 'solid', TINTA]);
  assert.equal(medida.texto, TINTA);
  assert.deepEqual(medida.chave, ['import', '600', TINTA]);
  assert.deepEqual(medida.comentario, ['# um modelo por arquivo', '400', CINZA]);
  assert.deepEqual(medida.alturas, [29], 'toda linha, a vazia inclusive, tem a altura de uma linha');
});

test('linha marcada em campo amarelo da largura do bloco; nela, comentário e número em tinta; fora dela, número em cinza', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const pre = document.querySelector('#linhas-marcadas pre');
    const caixa = pre.getBoundingClientRect();
    const linhas = [...pre.querySelectorAll('.linha')];
    const marcada = linhas[5];
    const campo = marcada.getBoundingClientRect();
    return {
      marcadas: linhas.flatMap((linha, k) => (linha.classList.contains('marcada') ? [k + 1] : [])),
      campo: getComputedStyle(marcada).backgroundColor,
      margens: [campo.left - caixa.left, caixa.right - campo.right],
      fundoDaLinhaComum: getComputedStyle(linhas[0]).backgroundColor,
      comentarioNaMarcada: getComputedStyle(marcada.querySelector('.comentario')).color,
      numeros: [getComputedStyle(linhas[0], '::before').color, getComputedStyle(marcada, '::before').color],
    };
  });
  assert.deepEqual(medida.marcadas, [6, 7]);
  assert.equal(medida.campo, AMARELO);
  perto(medida.margens[0], 0, 'o campo começa na borda esquerda do bloco');
  perto(medida.margens[1], 0, 'o campo termina na borda direita do bloco');
  assert.equal(medida.fundoDaLinhaComum, TRANSPARENTE);
  assert.equal(medida.comentarioNaMarcada, TINTA);
  assert.deepEqual(medida.numeros, [CINZA, TINTA]);
});

test('data-numeros põe os números numa margem de 4 caracteres, fora do texto: copiar do slide traz o código exato', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const inicio = (seletor) => {
      const pre = document.querySelector(seletor);
      return pre.querySelector('.linha > .palavra-chave').getBoundingClientRect().left - pre.getBoundingClientRect().left;
    };
    const pre = document.querySelector('#linhas-marcadas pre');
    return {
      semNumeros: inicio('#javascript-e-bash pre[data-lang="bash"]'),
      comNumeros: inicio('#linhas-marcadas pre'),
      copia: pre.innerText,
      texto: pre.textContent,
    };
  });
  perto(medida.semNumeros, 8, 'sem números, o código começa no recuo do bloco');
  perto(medida.comNumeros, 8 + 4 * 12, 'com números, depois de 2 caracteres de número e 2 de espaço');
  assert.equal(medida.copia, medida.texto);
  assert.deepEqual(medida.copia.split('\n').slice(0, 3), ['import numpy as np', '', 'def descida(w, x, y, eta=0.1, passos=100):']);
});

test('16 linhas cabem sob um título de uma linha, acima da base da zona de conteúdo', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const pre = document.querySelector('#dezesseis-linhas pre');
    return { linhas: pre.querySelectorAll('.linha').length, base: pre.getBoundingClientRect().bottom - pre.closest('section').getBoundingClientRect().top };
  });
  assert.equal(medida.linhas, 16);
  assert.ok(medida.base <= 652, `o bloco termina em ${medida.base}`);
});

test('linguagem fora da lista vira linhas sem destaque, com a mensagem no console; code dentro de pre e entidades funcionam; pre sem data-lang fica', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/codigo/');
  t.after(() => fixtures.fechar());
  const { pagina, erros } = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => pagina.close());
  const medida = await pagina.evaluate(() => {
    const [cobol, python, cru] = document.querySelectorAll('pre');
    return {
      cobol: [...cobol.querySelectorAll('.linha')].map((linha) => `${linha.className}|${linha.textContent}`),
      destaquesNoCobol: cobol.querySelectorAll('.palavra-chave, .comentario').length,
      python: [python.textContent, python.querySelector('code'), python.querySelector('.palavra-chave').textContent],
      cru: cru.innerHTML,
    };
  });
  assert.deepEqual(medida.cobol, ['linha|MOVE 1 TO CONTADOR.', 'linha marcada|DISPLAY CONTADOR.']);
  assert.equal(medida.destaquesNoCobol, 0);
  assert.deepEqual(medida.python, ['if a < b and b > c:  # compara\n    print("a & b")', null, 'if']);
  assert.equal(medida.cru, 'sem data-lang, fica como está');
  assert.deepEqual(erros, ['Aula USP: código com linguagem fora da lista em data-lang: "cobol"']);
  assert.deepEqual(await classesForaDoContrato(pagina), []);
});

test('carga sob demanda: só as gramáticas das linguagens usadas; sem pre[data-lang], nada do Shiki; sem TeX, nada do KaTeX', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/codigo/');
  t.after(() => fixtures.fechar());
  const soPython = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => soPython.pagina.close());
  const gramaticas = modulosPedidos(soPython.pedidos).filter((modulo) => modulo.startsWith('@shikijs/langs/'));
  assert.deepEqual(gramaticas, ['@shikijs/langs/dist/python.mjs']);
  assert.ok(!modulosPedidos(soPython.pedidos).some((modulo) => modulo.startsWith('katex/')), 'aula sem TeX pediu o KaTeX');

  const matematica = await abrirAula(navegador, `${servidor.endereco}/matematica.html?folha`);
  t.after(() => matematica.pagina.close());
  assert.ok(modulosPedidos(matematica.pedidos).includes('katex/dist/katex.mjs'));
  assert.ok(!modulosPedidos(matematica.pedidos).some((modulo) => modulo.startsWith('@shikijs/')), 'aula sem código pediu o Shiki');

  const componentes = await abrirAula(navegador, `${servidor.endereco}/componentes.html?folha`);
  t.after(() => componentes.pagina.close());
  assert.deepEqual(modulosPedidos(componentes.pedidos), []);
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `node --test tests/integracao/codigo.test.mjs`
Expected: FAIL nos 7 testes, porque o código ainda não é renderizado nem tem estilo: o espécime tem 8 blocos sem linhas (`actual: 8`, `expected: 0`); os testes de fonte, de campo amarelo, de números e da fixture terminam em `TypeError: Cannot read properties of null` (ou `of undefined`), sem `.palavra-chave` nem `.linha`; o bloco de 16 linhas dá `actual: 0`; e a aula só com Python não pede gramática nenhuma (`actual: []` no lugar de `[ '@shikijs/langs/dist/python.mjs' ]`).

- [ ] **Step 5: Renderizar o código antes do motor**

Em `montar/navegador.js`, trocar

```js
import { renderizarTex } from '../componentes/tex.js';
```

por

```js
import { renderizarTex } from '../componentes/tex.js';
import { criarDestacador, renderizarCodigo } from '../componentes/codigo.js';
```

e, logo depois do bloco da matemática, trocar a linha

```js
  if (new URLSearchParams(location.search).has('folha')) document.body.classList.add('folha');
```

por

```js
  // O código também entra antes do motor; só as gramáticas das linguagens usadas na aula são importadas (spec 3.2).
  const blocosDeCodigo = [...document.querySelectorAll('pre[data-lang]')];
  if (blocosDeCodigo.length > 0) {
    const usadas = [...new Set(blocosDeCodigo.map((pre) => pre.getAttribute('data-lang')))]
      .filter((linguagem) => contrato.linguagens.includes(linguagem));
    const [{ createShikiPrimitive, codeToTokensBase }, { createJavaScriptRegexEngine }, ...modulosDasGramaticas] = await Promise.all([
      import('@shikijs/primitive'),
      import('@shikijs/engine-javascript'),
      ...usadas.map((linguagem) => import(`@shikijs/langs/${linguagem}`)),
    ]);
    const gramaticas = Object.fromEntries(usadas.map((linguagem, k) => [linguagem, modulosDasGramaticas[k].default]));
    const destacador = criarDestacador({ createShikiPrimitive, codeToTokensBase, createJavaScriptRegexEngine, gramaticas });
    for (const erro of renderizarCodigo(document.body, { destacador })) {
      console.error(`Aula USP: código com ${erro.mensagem}`);
    }
  }
  if (new URLSearchParams(location.search).has('folha')) document.body.classList.add('folha');
```

- [ ] **Step 6: Dar forma ao código e registrar as classes**

No fim de `estilos/componentes.css`, depois de uma linha em branco, acrescentar:

```css
/* ---------- código ---------- */

.area pre {
  margin: 0;
  padding: var(--espaco-1) var(--espaco-1) 0;
  border-top: var(--regua-normal) solid var(--cor-tinta);
  font-family: var(--tipo-codigo-familia);
  font-size: var(--tipo-codigo-tamanho);
  font-weight: var(--tipo-codigo-peso);
  line-height: var(--tipo-codigo-entrelinha);
  letter-spacing: var(--tipo-codigo-tracking);
  color: var(--cor-tinta);
  counter-reset: linha;
}

/* Cada linha cobre a largura do bloco, recuo incluído, para o campo amarelo; entre elas fica a quebra de linha do código. */
.area pre .linha {
  display: inline-block;
  width: calc(100% + 2 * var(--espaco-1));
  min-height: 1lh; /* a linha vazia também ocupa uma linha */
  margin-inline: calc(-1 * var(--espaco-1));
  padding-inline: var(--espaco-1);
  vertical-align: top;
}

.area pre .palavra-chave {
  font-weight: var(--tipo-codigo-peso-enfase);
}

.area pre .comentario {
  color: var(--cor-cinza);
}

.area pre[data-numeros] .linha::before {
  counter-increment: linha;
  content: counter(linha);
  display: inline-block;
  min-width: 2ch;
  margin-right: 2ch;
  text-align: right;
  color: var(--cor-cinza);
}

.area pre .marcada {
  background: var(--cor-amarelo);
}

/* Sobre amarelo, só tinta (spec 4.2): na linha marcada, comentário e número deixam o cinza. */
.area pre .marcada .comentario,
.area pre[data-numeros] .marcada::before {
  color: var(--cor-tinta);
}
```

Em `contrato/contrato.json`, trocar

```json
"equacao", "tex-invalido"]
```

por

```json
"equacao", "tex-invalido", "linha", "marcada", "palavra-chave", "comentario"]
```

- [ ] **Step 7: Rodar os testes**

Run: `node --test tests/integracao/codigo.test.mjs`
Expected: PASS nos 7 testes.

Run, um arquivo por vez: `for arquivo in tests/integracao/*.test.mjs; do node --test "$arquivo" || break; done`
Expected: PASS em todos (65 da Task 1 + 7 de `codigo` = 72).

Run: `npm test`
Expected: PASS nos 155 testes unitários.

- [ ] **Step 8: Conferir no navegador**

Com um script descartável fora do repositório (não use `npm run servir` em primeiro plano: ele não termina sozinho), importando `servirPasta`, `iniciarChrome` e `abrirAula` de `tests/integracao/utilitarios.mjs`, tirar uma captura de cada `section.slide` de `especime/codigo.html?folha` e de `tests/fixtures/codigo/index.html?folha`, e conferir: régua acima de cada bloco; palavras-chave em negrito e comentários em cinza nas sete linguagens; o operador `=>` do JavaScript e o `<-` do R sem negrito; no LaTeX, os comandos com a barra em negrito; campo amarelo de ponta a ponta do bloco, com comentário e número em tinta na linha marcada, inclusive na linha vazia marcada do JavaScript; números em cinza nas outras linhas; em R e SQL lado a lado, nenhuma linha passando da coluna; o bloco de 16 linhas acima do rodapé; na fixture, o COBOL sem destaque e com a segunda linha marcada, e o `pre` sem linguagem com o mesmo recuo dos outros. Descrever no relatório o que viu. Não comitar o script nem as imagens.

- [ ] **Step 9: Commit**

```bash
git add montar/navegador.js estilos/componentes.css contrato/contrato.json especime/codigo.html tests/fixtures/codigo/index.html tests/integracao/codigo.test.mjs tests/integracao/utilitarios.mjs
git commit -m "feat(montar): código com destaque no navegador, com linhas marcadas e números

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
