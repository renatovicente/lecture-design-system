# Fase 3 — Publicação: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans, tarefa a tarefa. Passos com caixa (`- [ ]`).

**Objetivo:** pôr o runtime do Aula USP no npm e na CDN, com a tag de versão exata e hash de integridade que o modelo, o espécime, os exemplos e os pacotes já escrevem, e aceitar o sistema em claude.ai e no ChatGPT (spec 12, fase 3; spec 11.3).

**Arquitetura:** a fase tem duas metades de natureza diferente. A **3a** é inteiramente local: deixa o repositório publicável e prova, com o tarball de verdade, que o pacote instalado funciona. Não toca a rede e segue o processo de sempre (worktree, tarefa, revisão). A **3b** é a sequência de ações externas. Cada passo dela para e espera a autorização do autor no momento (spec 12: "Toda ação externa depende de autorização explícita do autor no momento"). Nenhum passo da 3b é despachado a subagente.

**Stack:** Node ≥ 20.6, `npm pack`, `node:test`, playwright-core com o Chrome instalado; jsDelivr (rota `/npm/`), só na 3b.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md`, seções 3.2, 8.1, 10.2, 11.1, 11.3, 12 e 14.

## Restrições globais

- A 3a não faz nenhum pedido de rede: nada de `npm publish`, `npm view`, `npm login`, `gh repo edit`, `curl` à CDN. `npm pack` e `npm ls` são locais.
- Toda ação da 3b depende da autorização explícita do autor no momento em que for executada. Aprovar um passo não aprova o seguinte.
- Credenciais (login no npm, OTP de dois fatores, login no claude.ai e no ChatGPT) são digitadas pelo autor no terminal ou no navegador dele. O agente nunca as recebe nem as digita.
- `AGENTS.md` inteiro vale, em particular: a fronteira de `node:`, o contrato como dado, os gerados no mesmo diff e a guarda de propriedade com inversão medida.
- Português em tudo. Cada commit termina com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Nenhuma mensagem afirma mais do que a evidência sustenta.
- No fim de cada tarefa de código, rode `npm test` e `npm run test:integracao` **inteiros**.

## Fatos medidos (main em `f803908`, 2026-09-28)

1. **`package.json` não é publicável.** Tem `"private": true`, `version` `0.1.0`, e não tem `license`, `author`, `repository` nem `files`. Não há arquivo `LICENSE` na raiz.
2. **O tarball de hoje leva o repositório inteiro.** `npm pack --dry-run` lista 463 arquivos, 3,3 MB empacotados e 7,4 MB desempacotados: 233 de `tests/`, 46 de `docs/`, 49 de `pacotes/`, 6 de `especime/`, mais `AGENTS.md` e `CLAUDE.md`.
3. **O pacote enxuto funciona.** Medi com o tarball extraído num diretório temporário, sem `tests/`, `docs/`, `pacotes/`, `especime/`, `AGENTS.md`, `CLAUDE.md` e `.gitattributes`, e com `node_modules` do repositório por link simbólico:
   - `novo` sai com 0;
   - `validar` da aula nova dá 0 erros e 0 avisos;
   - `build --sem-pdf` sai com 0;
   - `build` de `exemplos/regressao-linear` sai com 0 e gera 12 páginas.

   Sobram 129 arquivos e 5,4 MB desempacotados.
4. **Na cópia enxuta, `pacotes` sai com 2**, falha de ambiente, com a mensagem crua `ENOENT: … scandir '…/especime/'`. `dist` sai com 0 naquela medição só porque o link simbólico trazia o `esbuild`, que é devDependency. Numa instalação de verdade ele não existe.
5. **A árvore de produção não traz o `esbuild`.** `npm ls --omit=dev --all --parseable` lista 54 caminhos (a raiz mais 53 dependências) e nenhum `esbuild`.
6. **O nome `aula-usp` está livre no npm.** `npm view aula-usp` deu 404 em 2026-09-28. Foi uma consulta de leitura, feita antes da autorização; está registrada no relatório ao autor. Não reserva o nome: ele pode ser tomado até a publicação.
7. **O GitHub está `PRIVATE`** (`gh repo view`, leitura).
8. **A CDN lê do npm, não do GitHub.** A tag fixada é `https://cdn.jsdelivr.net/npm/aula-usp@<versão>/dist/aula-usp.js` (`build/pacotes.mjs:143`). A rota `/npm/` do jsDelivr serve o tarball publicado. A visibilidade do GitHub não afeta a CDN, mas **publicar no npm torna público todo arquivo do tarball**.
9. **`assets/marcas/` tem marcas institucionais:** USP, IME, IFUSP e ACS, mais `origem/usp-logo.pdf`. Não são do autor para licenciar. As fontes já têm a licença OFL delas em `assets/fontes/licencas/`.
10. **A tag segue a versão do `package.json`.** `tagFixada()` lê a versão dali e confere contra `dist/manifesto.json` (`build/pacotes.mjs:134-144`). `rotearCdn` (`tests/integracao/utilitarios.mjs:135`) também lê do `package.json`. Trocar a versão exige `aula-usp dist` (o manifesto grava a versão) e depois `aula-usp pacotes`, nessa ordem.
11. **Um flake conhecido:** `tests/unit/codigo.test.mjs:36`, o teste do destacador sobre as sete linguagens. Passa isolado e falha às vezes na suíte inteira. Não há diagnóstico ainda.

## Decisões do autor (antes da tarefa em que entram)

| decisão | entra na | padrão proposto |
|---|---|---|
| D1. Licença do código | Tarefa 3 | MIT para o código. Uma seção à parte diz que as marcas em `assets/marcas/` pertencem às instituições e não entram na licença, e que as fontes seguem a OFL |
| D2. Versão da primeira publicação | Tarefa 4 | `1.0.0`, a que a spec usa nos exemplos da tag (spec 3.2, linhas 60 e 252) |
| D3. `author` e `repository` no `package.json` | Tarefa 3 | autor como no `git config`; `repository` apontando para o GitHub atual, mesmo privado |
| D4. Visibilidade do GitHub | 3b, passo E1 | fica com o autor; nada na 3b depende dela (fato 8) |

Uma versão publicada no npm **não pode ser republicada** com outro conteúdo, nem depois de `unpublish`. Por isso a D2 e toda a 3a precedem qualquer publicação.

---

## 3a — local

### Tarefa 1: o tarball contém o que a CLI usa, e só isso

**Arquivos:**
- Modificar: `package.json` (campo `files`; tirar `private`)
- Criar: `tests/unit/publicacao.test.mjs`

**Interfaces:**
- Produz: `arquivosDoTarball()`, uma função local do teste; o conjunto de caminhos de `npm pack --dry-run --json`, usado pelas tarefas 2 e 3.

- [ ] **Passo 1: escrever o teste que falha**

```js
// tests/unit/publicacao.test.mjs
// O que vai para o npm (spec 12, fase 3). Duas propriedades medidas contra fontes independentes do
// campo `files`, que é o "gerador" aqui:
// 1. o fecho de imports relativos a partir de bin/aula-usp.mjs está inteiro no tarball — o universo
//    vem do código-fonte, não do `files`;
// 2. nada do que é só do desenvolvimento do sistema vai junto.
// O que este teste NÃO vê: arquivo de dados lido por caminho montado em tempo de execução
// (`new URL('contrato/contrato.json', RAIZ)`). Esse alcance é de tests/integracao/instalacao.test.mjs,
// que roda os comandos no tarball extraído.
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

test('todo arquivo e pasta que a CLI importa ou lê por caminho relativo ao módulo está no tarball', () => {
  const tarball = arquivosDoTarball();
  const caminhos = [...tarball];
  const faltam = fechoDeImports('bin/aula-usp.mjs').filter((caminho) => caminho.endsWith('/')
    ? !caminhos.some((arquivo) => arquivo.startsWith(caminho))
    : !tarball.has(caminho));
  assert.deepEqual(faltam, []);
});

test('o tarball não leva o que é só do desenvolvimento do sistema', () => {
  const FORA = ['tests/', 'docs/', 'pacotes/', 'especime/', '.superpowers/', '.claude/', 'AGENTS.md', 'CLAUDE.md'];
  const vazados = [...arquivosDoTarball()].filter((caminho) => FORA.some((fora) => caminho.startsWith(fora)));
  assert.deepEqual(vazados, []);
});
```

- [ ] **Passo 2: rodar e ver cair**

Rode: `node --test tests/unit/publicacao.test.mjs`
Esperado: os três falham. O primeiro falha por `private`. O terceiro lista `tests/…`, `docs/…` e `pacotes/…`. O segundo pode passar hoje, porque o tarball leva tudo; ele passa a valer no passo 3.

- [ ] **Passo 3: o `files` e a saída do `private`**

Em `package.json`, tire `"private": true` e acrescente:

```json
"files": [
  "bin/", "build/", "montar/", "motor/", "componentes/", "validador/",
  "contrato/", "tokens/", "estilos/", "assets/", "dist/",
  "modelos/", "exemplos/", "guia/", "README.md"
]
```

`license` e `repository` entram na Tarefa 3, com a D1 e a D3. Até lá o primeiro teste fica vermelho, e isso está certo: registre no relatório que ele fecha na Tarefa 3.

- [ ] **Passo 4: remedir**

Rode: `node --test tests/unit/publicacao.test.mjs` e `npm pack --dry-run --json | node -e '…'` (a contagem de arquivos e de MB).
Esperado: o segundo e o terceiro passam. A contagem de arquivos e o tamanho vão para o relatório; perto de 129 arquivos e 5,4 MB (fato 3). Se `exemplos/*/dist/` aparecer no tarball, é resto de build local ignorado pelo git, mas não pelo `files`: acrescente `"!exemplos/*/dist/"` e remeça.

- [ ] **Passo 5: inversão**

Tire `"contrato/"` do `files` e rode o segundo teste: ele tem de cair, citando `contrato/contrato.json` se algum módulo o lê por `new URL('../contrato/…', import.meta.url)`. **Se não cair, isso é o limite escrito no comentário do teste**: `contrato` é lido por caminho montado. Anote qual dos dois aconteceu; quem prova é a Tarefa 2. Tire `"build/"`: tem de cair. Devolva os dois.

- [ ] **Passo 6: commit**

```bash
git add package.json tests/unit/publicacao.test.mjs
git commit -m "feat(publicacao): o tarball leva só o que a CLI usa, com guarda pelo fecho de imports"
```

### Tarefa 2: o pacote instalado funciona, só com as dependências de produção

**Arquivos:**
- Criar: `tests/integracao/instalacao.test.mjs`

**Interfaces:**
- Consome: o `files` da Tarefa 1.
- Produz: `instalar()`, que empacota, extrai e monta `node_modules` só com a árvore de produção. A Tarefa 3 também o usa.

- [ ] **Passo 1: escrever o teste**

```js
// tests/integracao/instalacao.test.mjs
// O pacote como o autor o recebe do npm: o tarball de `npm pack`, extraído, com node_modules montado
// SÓ com a árvore de produção (`npm ls --omit=dev`). É o alcance que tests/unit/publicacao.test.mjs
// não tem: arquivo lido por caminho montado em tempo de execução, e dependência que só existe como
// devDependency. Sem rede: `npm pack` e `npm ls` são locais, e os links apontam para o node_modules
// do repositório.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MODULOS = join(RAIZ, 'node_modules');

export function instalar() {
  const dir = mkdtempSync(join(tmpdir(), 'aula-usp-instalacao-'));
  const saida = execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', dir],
    { cwd: RAIZ, encoding: 'utf8' });
  execFileSync('tar', ['xzf', join(dir, JSON.parse(saida)[0].filename), '-C', dir]);
  const pacote = join(dir, 'package');
  // Só os diretórios de primeiro nível da árvore de produção: um aninhado viaja dentro do pai.
  const producao = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], { cwd: RAIZ, encoding: 'utf8' })
    .trim().split('\n').slice(1)
    .map((caminho) => relative(MODULOS, caminho))
    .filter((nome) => !nome.includes('node_modules'));
  for (const nome of new Set(producao)) {
    const destino = join(pacote, 'node_modules', nome);
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
```

Antes de fixar `--porta 0`, confira em `bin/aula-usp.mjs` se a porta 0 é aceita. Se não for, use uma porta alta fixa e diga no relatório.

- [ ] **Passo 2: rodar**

Rode: `node --test tests/integracao/instalacao.test.mjs`
Esperado: os três passam. Se algum cair, a causa é real: um arquivo fora do `files` ou uma dependência de produção declarada como dev. Corrija o `package.json`, nunca o teste.

- [ ] **Passo 3: inversões medidas**

1. Tire `"contrato/"` do `files`: `validar` tem de cair. Devolva.
2. Mova, só na cópia de teste, o `esbuild` para a árvore de produção montada. O teste deve continuar verde, porque nenhum comando do autor usa `esbuild`. Não é uma inversão de verdade: anote isso. A inversão de verdade é a da Tarefa 3, onde `dist` sai com 2 **porque** o `esbuild` não está lá.

- [ ] **Passo 4: commit**

```bash
git add tests/integracao/instalacao.test.mjs
git commit -m "test(publicacao): o pacote instalado cria, valida, serve e constrói, só com as dependências de produção"
```

### Tarefa 3: licença, metadados e comandos de manutenção no pacote instalado

**Decisões que entram:** D1 e D3.

**Arquivos:**
- Criar: `LICENSE`
- Modificar: `package.json` (`license`, `author`, `repository`, `homepage`, `keywords`)
- Modificar: `bin/aula-usp.mjs` (comandos `dist` e `pacotes`)
- Modificar: `README.md` (instalação pelo npm)
- Modificar: `tests/integracao/instalacao.test.mjs` (os dois comandos de manutenção)

- [ ] **Passo 1: `LICENSE`**

Texto MIT (se a D1 confirmar) com o autor e o ano de 2026. Depois dele, uma seção "Marcas e fontes": os arquivos de `assets/marcas/` são marcas da Universidade de São Paulo e das unidades nomeadas em `assets/marcas/unidades.json`, **não** estão cobertos por esta licença, e o uso segue as regras de identidade visual de cada instituição; as fontes de `assets/fontes/` seguem a SIL OFL, com os textos em `assets/fontes/licencas/`.

- [ ] **Passo 2: `package.json`**

`"license": "MIT"` (ou o que a D1 disser), `author`, `repository` (`{ "type": "git", "url": "git+https://github.com/renatovicente/lecture-design-system.git" }`), `homepage` e `keywords` (`aula`, `slides`, `usp`, `katex`). Rode `node --test tests/unit/publicacao.test.mjs`: agora os três passam.

- [ ] **Passo 3: os dois comandos de manutenção dizem o que são**

Na cópia instalada, `pacotes` sai com 2 e a mensagem crua `ENOENT … especime/` (fato 4). `dist` também vai sair com 2, sem o `esbuild`. Os dois ficam no pacote, porque são da CLI, mas ganham uma mensagem de gente. Em `bin/aula-usp.mjs`, antes de importar o que cada um precisa:

```js
// `dist` e `pacotes` são manutenção do sistema (spec 8.1): precisam do repositório — especime/ e as
// devDependencies —, que o pacote do npm não leva (package.json, "files").
function exigirRepositorio(comando) {
  if (!existsSync(new URL('../especime/', import.meta.url))) {
    console.error(`aula-usp ${comando} é comando de manutenção do sistema: rode-o num clone do repositório, não no pacote instalado.`);
    process.exit(2);
  }
}
```

Chame `exigirRepositorio('dist')` e `exigirRepositorio('pacotes')` no começo de cada comando. `existsSync` vem de `node:fs`, que não lê disco no escopo do módulo, então não fere a regra do topo de `bin/`. Confira isso contra o comentário do topo do arquivo antes de importar.

- [ ] **Passo 4: teste**

Em `tests/integracao/instalacao.test.mjs`, acrescente:

```js
test('instalado, dist e pacotes recusam com código 2 e dizem que são do repositório', () => {
  const { dir, pacote } = instalar();
  try {
    for (const comando of ['dist', 'pacotes']) {
      const r = cli(pacote, comando);
      assert.equal(r.status, 2, comando);
      assert.match(r.stderr, /comando de manutenção do sistema/, comando);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

Inversão: tire a chamada de `exigirRepositorio('dist')`. O teste tem de cair: sem o `esbuild` na árvore montada, sai 2 mas com a mensagem errada; ou sai 0 e aí há vazamento de devDependency. Anote qual das duas aconteceu.

- [ ] **Passo 5: README**

Uma seção "Instalar" com `npm install -g aula-usp` e `npx aula-usp novo minha-aula --unidade ime`, e uma frase dizendo que `dist` e `pacotes` só rodam num clone. Não prometa versão nem endereço de CDN que ainda não existem: escreva que a tag de runtime vem pronta no modelo.

- [ ] **Passo 6: rodar as duas suítes inteiras e commitar**

```bash
git add LICENSE package.json bin/aula-usp.mjs README.md tests/integracao/instalacao.test.mjs
git commit -m "feat(publicacao): licença com as marcas à parte, metadados do npm, e manutenção recusada fora do repositório"
```

### Tarefa 4: a versão da publicação

**Decisão que entra:** D2.

**Arquivos:**
- Modificar: `package.json` (`version`)
- Regerar: `dist/manifesto.json` e `dist/*` (se a versão entrar nos bytes), `pacotes/`, e a tag em `modelos/`, `especime/` e `exemplos/`

- [ ] **Passo 1:** troque `version` para a D2.
- [ ] **Passo 2:** rode `node bin/aula-usp.mjs dist` e **depois** `node bin/aula-usp.mjs pacotes`, nessa ordem: o manifesto grava a versão, e `tagFixada()` recusa quando o manifesto e o `package.json` discordam (fato 10).
- [ ] **Passo 3:** meça com `grep -rho 'aula-usp@[0-9.]*' modelos especime exemplos pacotes | sort | uniq -c`. Esperado: uma versão só, a da D2. Meça também `grep -o 'sha384-' dist/aula-usp.js | wc -l`: esperado 11.
- [ ] **Passo 4:** rode as duas suítes inteiras. `rotearCdn` lê a versão do `package.json` e acompanha sozinho. Se `visual.test.mjs` mudar de 0 px, investigue antes de seguir.
- [ ] **Passo 5:** commit com o diff inteiro dos gerados:

```bash
git add package.json dist pacotes modelos especime exemplos
git commit -m "chore(publicacao): versão <D2>, com dist, pacotes e tags regerados"
```

### Tarefa 5: o flake de `codigo.test.mjs:36`

**Arquivos:** a medir; provavelmente `tests/unit/codigo.test.mjs` ou `componentes/codigo.js`.

Use superpowers:systematic-debugging. Não prescrevo a correção porque não há diagnóstico (fato 11).

- [ ] **Passo 1: reproduzir e medir a taxa.** Rode `npm test` dez vezes, contando as falhas e guardando a saída de cada uma. Guarde a mensagem exata da asserção (qual linguagem, qual lista).
- [ ] **Passo 2: isolar.** Hipóteses para medir, uma de cada vez:
  1. estado compartilhado no destacador (o `createShikiPrimitive` guarda estado entre chamadas?);
  2. dependência de tempo no motor de regex;
  3. concorrência do `node --test`: rode com `--test-concurrency=1` e compare a taxa.
- [ ] **Passo 3:** corrija a causa, não o teste. Se a causa estiver no código de produção, `aula-usp dist` e `aula-usp pacotes` vão no mesmo diff.
- [ ] **Passo 4:** rode `npm test` 20 vezes seguidas. Esperado: 0 falhas. Escreva o número medido no commit.

### Tarefa 6: o roteiro de aceite da fase 3 e a conferência da CDN

**Arquivos:**
- Modificar: `tests/aceite/roteiro.md` (seção da fase 3)
- Criar: `build/conferir-cdn.mjs` (escrito e testado na 3a, **rodado** só na 3b)
- Criar: `tests/unit/conferir-cdn.test.mjs`

- [ ] **Passo 1: `build/conferir-cdn.mjs`.** Recebe uma função `buscar(url)` por parâmetro. Na 3b ela é o `fetch`; no teste é um dublê que lê de `dist/`. Para cada arquivo de `dist/manifesto.json`, busca `https://cdn.jsdelivr.net/npm/aula-usp@<versão>/dist/<nome>`, calcula o `sha384` dos bytes e compara com o `integrity` do manifesto. Devolve `[{ nome, ok, motivo }]`.

```js
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const RAIZ = new URL('../', import.meta.url);

export async function conferirCdn({ buscar, raiz = RAIZ }) {
  const manifesto = JSON.parse(readFileSync(new URL('dist/manifesto.json', raiz), 'utf8'));
  const base = `https://cdn.jsdelivr.net/npm/aula-usp@${manifesto.versao}/dist/`;
  const resultados = [];
  for (const [nome, { integrity }] of Object.entries(manifesto.arquivos)) {
    const resposta = await buscar(base + nome);
    if (!resposta.ok) { resultados.push({ nome, ok: false, motivo: `HTTP ${resposta.status}` }); continue; }
    const bytes = Buffer.from(await resposta.arrayBuffer());
    const hash = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
    resultados.push({ nome, ok: hash === integrity, motivo: hash === integrity ? '' : `hash ${hash}` });
  }
  return resultados;
}
```

Confira os nomes reais dos campos em `dist/manifesto.json` (`versao`, `arquivos`, `integrity`) antes de escrever. O que vale é o que está no arquivo.

- [ ] **Passo 2: teste com dublê.** Primeiro, um dublê que devolve os bytes de `dist/`: todos `ok`. Depois, um dublê que acrescenta um byte a `aula-usp-tex.js`: esse sai `ok: false`, e só ele. Por último, um dublê que devolve 404: `motivo` `HTTP 404`.
- [ ] **Passo 3: o roteiro.** Em `tests/aceite/roteiro.md`, acrescente a seção "Fase 3". Mesmo pedido, mesmo critério da 11.3: zero erros em até três rodadas, mais a revisão visual do autor. Dois ambientes:
  - **claude.ai, Projeto:** os arquivos de `pacotes/claude/projeto/`, mais a instrução; o pedido; o artifact gerado aberto; o painel do validador dentro da aula.
  - **ChatGPT, GPT personalizado:** `instrucoes.txt` e `conhecimento/` de `pacotes/gpt/gpt-personalizado/`; o pedido; o bloco de código salvo como `.html` e aberto localmente.

  Nos dois, registre em `tests/aceite/rodada-<ambiente>-1.json`, no formato das rodadas da fase 1, também **se o produto preservou as subpastas de `conhecimento/`** (item herdado do aceite da fase 2).
- [ ] **Passo 4: commit.**

### Revisão final da 3a

Revisão da branch inteira, rodada única de correção, re-revisão com escopo, relatório em `docs/superpowers/revisoes/2026-09-28-aula-usp-fase3a-revisao-final.md`. Merge e push só com o pedido do autor.

---

## 3b — externa, um passo por autorização

Cada passo abaixo começa com o agente dizendo **o que vai fazer, contra qual serviço, e o que não tem volta**, e só segue com o "sim" do autor naquele momento. Nada daqui vai para subagente.

**E1. Visibilidade do GitHub (D4).** Se o autor quiser o repositório público, o comando é `gh repo edit renatovicente/lecture-design-system --visibility public --accept-visibility-change-consequences`. O que não tem volta: o histórico inteiro fica visível e pode ser clonado ou indexado, inclusive `docs/` e as revisões. Nada da 3b depende deste passo (fato 8).

**E2. Publicação no npm.** Nesta ordem:

1. O autor faz `npm login` no próprio terminal; o agente não vê credenciais.
2. O agente roda `npm whoami` (leitura) e `npm view aula-usp` (leitura, para reconfirmar que o nome segue livre). Se o nome tiver sido tomado, o escopo vem da conta (`@<conta>/aula-usp`, spec 14), e isso **volta à 3a**: `tagFixada()`, `rotearCdn`, o `name` e uma nova rodada de `pacotes`. Só a URL muda, mas muda em todos os gerados.
3. `npm publish --dry-run`, local, e a lista conferida contra a Tarefa 1.
4. `npm publish`. Com dois fatores ligados, o OTP é digitado pelo autor. O que não tem volta: a versão fica permanente. Um `unpublish` só vale em 72 h, e a mesma versão nunca mais pode ser publicada.

**E3. A CDN serve os bytes certos.**

1. `node -e "import('./build/conferir-cdn.mjs').then(async (m) => console.table(await m.conferirCdn({ buscar: fetch })))"`. Esperado: 13 de 13 `ok`. Um `ok: false` para tudo e **não** se republica por cima: investigue primeiro (cache da CDN, arquivo alterado entre `dist` e `publish`).
2. A prova que a 3a não podia dar: o espécime aberto num Chrome de verdade **sem** `rotearCdn`, com a CDN real respondendo, 0 erros no console e os 9 pedidos de `codigo.html` (AGENTS.md) atendidos pela CDN. Registre os números medidos.

**E4. Aceite em claude.ai e no ChatGPT (spec 11.3).** Feito pelo autor, com as contas dele, seguindo o roteiro da Tarefa 6. O agente prepara os arquivos a subir, lê o que o autor colar de volta e registra as rodadas. Critério: zero erros em até três rodadas por ambiente, e a revisão visual do autor.

**Fecho.** `docs/superpowers/revisoes/2026-09-28-aula-usp-fase3-aceite.md` com os números de E2 a E4. Depois, `AGENTS.md`: o parágrafo sobre `rotearCdn` ("Com a CDN ainda sem publicar") passa a dizer que a CDN existe e que os testes seguem offline de propósito.
