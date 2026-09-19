# Marco 5a: `dist` e cobertura de glifos — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** gerar `dist/` — os scripts empacotados que a tag do runtime de uma aula carrega — e `validador/cobertura.json`, a fonte única de quais caracteres têm glifo, fechando a regra que o marco 4 adiou.

**Arquitetura:** a entrada do modo navegador (`montar/navegador.js`) se parte em três: um módulo com a função `iniciar()`, e duas entradas finas que a chamam — a de desenvolvimento e a do pacote. `build/bundle.mjs` empacota com esbuild e `build/cobertura.mjs` lê o `cmap` dos woff2 com fontkit. O comando `aula-usp dist` roda os dois.

**Pilha:** Node ≥ 20.6, ES modules, `esbuild` 0.28.2 e `fontkit` 2.0.4 (devDependencies, commit `a9bb1e9`), `node:test`, `playwright-core` sobre o Chrome instalado.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 3.2, 3.3, 3.5, 8.1, 8.2, 8.3, 9.2 e 9.3.

## Restrições globais

- `montar/`, `motor/`, `componentes/` e `validador/` **não importam nada do Node**: rodam no navegador. Só `bin/` e `build/` são Node.
- O contrato é dado: severidade, grupo, fase e ação de cada regra vêm de `contrato/contrato.json`. O código executa o contrato; nunca o repete.
- Formato da mensagem (spec 9.1): `ERRO · slide 7 #culpa · regra · problema. Ação.`
- Códigos de saída (spec 8.1): 0 sem erros, 1 com erros de validação, 2 com falha de ambiente. Falta de Chrome é aviso, não falha.
- Comentário e nome de identificador em português, no estilo do código existente.
- Commits em português, `tipo(escopo): frase no imperativo`, última linha exatamente:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Rode os testes de integração **um arquivo por comando**: uma execução longa estoura o watchdog de 600 s.

---

## Fatos medidos antes deste plano

Cada um destes veio de uma sonda executada, não de leitura de código. Não os re-derive; se algum se mostrar falso ao implementar, **pare e relate**.

1. **A tag do runtime é script clássico de propósito.** `<script src="…/aula-usp.js">`, sem `type="module"`, porque precisa instalar `window.AulaUSP.demo` **antes** do `<script>` inline do autor, que chama `AulaUSP.demo(...)` durante o parsing. É por isso que `montar/carregador.js` existe e é um IIFE.

2. **O formato `iife` do esbuild não aceita top-level `await`** — erro em 7 pontos de `montar/navegador.js`. Somado ao fato 1, isso obriga a partir a entrada: o corpo vira uma função assíncrona, e o pacote a chama dentro de um IIFE.

3. **`import.meta.url` vira vazio no `iife`**, e `new URL('../', undefined)` **lança** na carga. Logo `entrada.js` não pode conter `import.meta`. A base vem de quem chama: `import.meta.url` no dev, `document.currentScript.src` no pacote. As duas entradas ficam um nível abaixo da raiz, então ambas usam `'../'`.

4. **`document.currentScript` só vale durante a execução síncrona.** Capture antes do primeiro `await`, ou vem `null`.

5. **`splitting: true` colide** (`Two output files share the same path`) por causa do import glob de `@shikijs/langs/*`. Não use splitting: satélites explícitos, um arquivo por linguagem.

6. **Tamanhos medidos** (minify, `target: chrome120`), já na forma final que a tarefa 2 produz: `aula-usp.js` **94,6 kB** com os 7 CSS do sistema embutidos · `aula-usp-motor.js` 6,9 kB · `aula-usp-tex.js` **622,8 kB** (KaTeX + a CSS dele + as 20 fontes dele em data URI) · `aula-usp-codigo.js` 112,4 kB · as 7 gramáticas somam 398,8 kB. O aviso de `saida.tamanho` é 10 MB: folga de duas ordens de grandeza.

7. **Prova de ponta a ponta já obtida:** os três decks do espécime (`index`, `matematica`, `codigo`) montam pelo pacote IIFE, servidos por um servidor estático burro, em Chrome de verdade — `montado=sim` e **0 erros, 0 avisos** no painel nos três.

8. **Um erro que a sondagem cometeu e corrigiu, e que vale como aviso:** na primeira versão a CSS do KaTeX entrou em `aula-usp.js` como texto, e os `url(fonts/KaTeX_*.woff2)` dentro dela deram **404** — sem quebrar a validação. Os três decks passavam com 0 erros enquanto a matemática renderizava com métrica errada. A correção tem duas metades: as fontes viram data URI, e a CSS muda de casa, indo para `aula-usp-tex.js`. **Não confie no painel do validador para dizer que o empacotamento está certo**: ele não mede fonte que faltou. Olhe o console.

9. **O `cmap` não cabe no `unicodeRange` declarado** em `assets/fontes/fontes.json`: de 6 a 11 pontos de código fora da faixa, por arquivo (`U+20`, `U+41`, `U+A0`, `U+C1`, `U+2BC`, as combinantes `U+300`–`U+323`, e `U+0`/`U+D`/`U+FFFF` no Open Sans). O manifesto **não serve** como fonte de cobertura.

10. **O `cmap` traz pontos que não são caracteres utilizáveis** (`U+0`, `U+D`, `U+FFFF`): filtre.

11. **Geist Mono ⊂ (Geist ∪ Open Sans)**: zero pontos exclusivos. Logo um conjunto só — a união, **433 pontos** — e não um por família.

12. **Sem glifo, e um professor escreveria:** `→ ← ↔ ⇒ ⇔ ≤ ≥ ≠ ≈ ∞ ∑ ∏ ∫ √ ∂ ∇ α β γ δ θ λ μ π σ φ ω Ω ⟨ ⟩`. **Com** glifo: `× ÷ ± … — – " " ' ' • · ° ′ ″ § ¶ †`. A regra da tarefa 4 vai disparar muito; a mensagem dela tem de ensinar o comando TeX, não só acusar.

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `montar/entrada.js` | **novo.** O corpo de hoje de `navegador.js`, dentro de `export async function iniciar({ base, resolver, estilo })`. |
| `montar/navegador.js` | **reescrito, 4 linhas.** Entrada de desenvolvimento: chama `iniciar({ base: import.meta.url })`. |
| `montar/dist.js` | **novo.** Entrada do pacote: IIFE clássico, instala a fila de demos, resolve satélites e injeta CSS embutido. |
| `build/bundle.mjs` | **novo.** Node. Empacota os quatro scripts e as sete gramáticas; calcula SRI; grava `dist/manifesto.json`. |
| `build/cobertura.mjs` | **novo.** Node. Lê o `cmap` dos woff2 com fontkit e grava `validador/cobertura.json`. |
| `validador/regras/matematica.js` | **modificado.** Ganha `matematica.simbolo-fora-do-tex`, lendo `cobertura` do contexto. |
| `bin/aula-usp.mjs` | **modificado.** Ganha o comando `dist`. |
| `build/servir.mjs` | **modificado.** Remove `integrity` ao trocar a tag (spec 8.1). |
| `dist/` | **gerado**, versionado. `.gitignore` não o cobre: a tag do espécime aponta para lá. |

**Interfaces entre as tarefas:**

- Tarefa 1 **produz** `iniciar({ base, resolver, estilo })` em `montar/entrada.js`. `base`: string URL de quem chama. `resolver(nome) → string`: traduz um especificador de módulo. `estilo(caminho) → void|Promise`: injeta uma folha. Os dois últimos têm padrão, e o padrão é o comportamento de desenvolvimento de hoje.
- Tarefa 2 **consome** `montar/dist.js` e **produz** `dist/*.js` mais `dist/manifesto.json` com `{ versao, arquivos: { "<nome>": { bytes, integrity } } }`.
- Tarefa 3 **produz** `validador/cobertura.json`: `{ gerado, fontes: [...], pontos: [[inicio, fim], ...] }` — faixas, não lista solta, e `build/cobertura.mjs` exporta `lerCobertura(json) → Set<number>`.
- Tarefa 4 **consome** `cobertura` no contexto de `validar(doc, { …, cobertura })`.

---

## Tarefa 1: a entrada partida em três

**Arquivos:**
- Criar: `montar/entrada.js`, `montar/dist.js`
- Reescrever: `montar/navegador.js`
- Teste: `tests/unit/entrada.test.mjs` (novo)

**Interfaces:**
- Consome: nada de tarefas anteriores.
- Produz: `iniciar({ base, resolver, estilo })`, descrita acima.

O ponto desta tarefa é que **o modo de desenvolvimento não pode mudar de comportamento**. As 13 suítes de integração existentes são o verdadeiro teste de regressão: se alguma mudar de resultado, a separação está errada.

- [ ] **Passo 1: criar `montar/entrada.js` a partir de `navegador.js`**

Copie `montar/navegador.js` para `montar/entrada.js` e aplique exatamente estas três edições.

**(a)** Troque a constante de base pelo comentário e pela declaração vazia:

```js
// A raiz do sistema, derivada da URL de QUEM chamou: import.meta.url na entrada de desenvolvimento,
// document.currentScript.src no pacote do dist. Não use import.meta aqui: no formato iife o esbuild o
// deixa vazio, e `new URL('../', undefined)` lança na carga — medido, não suposto. As duas entradas
// ficam um nível abaixo da raiz (montar/navegador.js e dist/aula-usp.js), por isso o mesmo '../'.
let BASE;
```

**(b)** Envolva todo o bloco `try { … } catch { … } finally { … }` (hoje no topo do módulo) no corpo desta função, indentando o bloco em dois espaços:

```js
// O marco 5 partiu esta entrada em duas: aqui fica o que roda, e quem chama são as duas entradas
// finas — montar/navegador.js no desenvolvimento e o empacotado do dist. O motivo é medido: o
// pacote do dist precisa ser script CLÁSSICO (a fila de AulaUSP.demo tem de existir antes do
// <script> do autor, que roda durante o parsing), e o formato iife do esbuild não aceita
// top-level await — que é como este arquivo inteiro era escrito.
// `resolver` traduz o nome de um módulo carregado sob demanda; `estilo` injeta uma folha. São os dois
// pontos onde desenvolvimento e dist diferem de verdade — no dev o importmap resolve o especificador
// nu e o <link> busca o arquivo; no dist tudo já está dentro do pacote. Injetados, não ramificados:
// o corpo de iniciar() é um só, como o contexto extensível das regras do marco 4b.
export async function iniciar({ base, resolver = (nome) => nome, estilo } = {}) {
  BASE = new URL('../', base);
  const injetarEstilo = estilo ?? carregarEstilo;
  try {
    // … o corpo de hoje, indentado …
  } catch (erro) {
    // … como hoje …
  } finally {
    // … como hoje …
  }
}
```

**(c)** Troque os cinco pontos de uso. `injetarEstilo` em vez de `carregarEstilo`, e `resolver(...)` em volta de cada especificador dinâmico:

```js
    await Promise.all(ESTILOS.map(injetarEstilo));
```

```js
      import(resolver('katex')),
      injetarEstilo('modulos/katex/dist/katex.min.css'),
```

```js
        import(resolver('@shikijs/primitive')),
        import(resolver('@shikijs/engine-javascript')),
        ...usadas.map((linguagem) => import(resolver(`@shikijs/langs/${linguagem}`))),
```

> **Cuidado de nome:** não chame a variável de `folha`. `folha` já significa o modo `?folha` neste sistema (spec 3.2), e reusar o nome num arquivo que também testa `semFolha` confunde quem lê.

- [ ] **Passo 2: reescrever `montar/navegador.js`**

```js
// Entrada do modo de desenvolvimento (spec 3.2): só chama iniciar(). O que ela faz está em entrada.js,
// compartilhado com o pacote do dist — ver o comentário lá sobre por que a separação existe.
import { iniciar } from './entrada.js';
await iniciar({ base: import.meta.url }); // dev: especificador nu pelo importmap, CSS por <link>
```

- [ ] **Passo 3: rodar as suítes que provam que o dev não mudou**

```bash
npm test
```

Esperado: 341 passam, 0 falham.

```bash
node --test tests/integracao/painel.test.mjs
```

Esperado: 10 passam. Rode também `composicao`, `matematica`, `codigo` e `motor`, um comando por arquivo. **Qualquer mudança de resultado significa que a separação está errada** — pare e relate, não ajuste o teste.

- [ ] **Passo 4: escrever o teste que prova que os ganchos são ganchos**

Criar `tests/unit/entrada.test.mjs`. O valor deste teste é provar que `resolver` e `estilo` são de fato consultados, sem subir um navegador: se alguém voltar a chamar `import('katex')` direto, ele falha.

```js
// Os dois ganchos de iniciar() existem para o pacote do dist (spec 3.3) e são a única diferença
// entre os modos. Este teste os exercita sem navegador: lê o fonte do módulo e afirma que nenhum
// especificador dinâmico escapou do resolver, e que nenhuma folha escapou do injetor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FONTE = readFileSync(new URL('../../montar/entrada.js', import.meta.url), 'utf8');

test('todo import dinâmico de entrada.js passa pelo resolver', () => {
  const dinamicos = [...FONTE.matchAll(/import\(([^)]*)\)/g)].map((m) => m[1].trim());
  assert.ok(dinamicos.length >= 4, `esperava ao menos 4 import dinâmicos, achei ${dinamicos.length}`);
  const escaparam = dinamicos.filter((argumento) => !argumento.startsWith('resolver('));
  assert.deepEqual(escaparam, [], `import dinâmico fora do resolver: ${escaparam.join(', ')}`);
});

test('entrada.js não usa import.meta: no formato iife ele vem vazio e new URL lança', () => {
  assert.equal(FONTE.includes('import.meta'), false);
});

test('nenhuma folha de estilo é carregada fora do injetor, dentro de iniciar()', () => {
  const corpo = FONTE.slice(FONTE.indexOf('export async function iniciar'));
  assert.equal(corpo.includes('carregarEstilo('), false,
    'dentro de iniciar() o carregamento de folha tem de passar por injetarEstilo');
});
```

- [ ] **Passo 5: rodar o teste novo**

```bash
node --test tests/unit/entrada.test.mjs
```

Esperado: 3 passam. Confira a inversão de uma delas: troque um `import(resolver('katex'))` por `import('katex')` e veja o primeiro teste falhar; desfaça.

- [ ] **Passo 6: criar `montar/dist.js`**

```js
// Entrada do pacote dist/aula-usp.js (spec 3.3/8.1). Script CLÁSSICO, de propósito: roda durante a
// leitura do <head> e instala window.AulaUSP.demo ANTES do <script> do autor, que chama AulaUSP.demo
// durante o parsing. Por isso não pode ser módulo, e por isso iniciar() é chamada dentro de um async
// IIFE: o formato iife do esbuild não aceita top-level await.
import { iniciar } from './entrada.js';
import tokens from '../estilos/tokens.css';
import fontes from '../estilos/fontes.css';
import estiloBase from '../estilos/base.css';
import layouts from '../estilos/layouts.css';
import componentes from '../estilos/componentes.css';
import motorCss from '../estilos/motor.css';
import impressao from '../estilos/impressao.css';
import katexCss from '../node_modules/katex/dist/katex.min.css';

// As chaves são os mesmos caminhos que iniciar() pede; quem empacota resolveu o conteúdo.
const EMBUTIDAS = new Map([
  ['estilos/tokens.css', tokens], ['estilos/fontes.css', fontes], ['estilos/base.css', estiloBase],
  ['estilos/layouts.css', layouts], ['estilos/componentes.css', componentes],
  ['estilos/motor.css', motorCss], ['estilos/impressao.css', impressao],
  ['modulos/katex/dist/katex.min.css', katexCss],
]);

const ocultar = document.createElement('style');
ocultar.setAttribute('data-aula-usp', 'ocultar');
ocultar.textContent = 'body { visibility: hidden; }';
document.head.append(ocultar);

const filaDeDemos = [];
window.AulaUSP = { filaDeDemos, demo(nome, definicao) { filaDeDemos.push({ nome, definicao }); } };

// currentScript só vale durante a execução síncrona; guarde agora, não depois do await.
const base = document.currentScript?.src;

iniciar({
  base,
  // vizinhos em dist/: o empacotador não adivinha, o chamador diz.
  resolver: (nome) => new URL(nome === 'katex' ? 'aula-usp-tex.js'
    : nome.startsWith('@shikijs/langs/') ? `aula-usp-lang-${nome.split('/').pop()}.js`
    : 'aula-usp-codigo.js', base).href,
  estilo: (caminho) => {
    const folha = document.createElement('style');
    folha.textContent = EMBUTIDAS.get(caminho) ?? '';
    document.head.append(folha);
  },
}).catch((erro) => {
  ocultar.remove();
  console.error('Aula USP: o runtime não carregou.', erro);
});
```

> `montar/dist.js` importa CSS, o que nenhum runtime de navegador faz sozinho — só o esbuild, pelo loader `text`. É por isso que ele fica fora de `montar/navegador.js`: o modo de desenvolvimento nunca o carrega.

- [ ] **Passo 7: commitar**

```bash
git add montar/entrada.js montar/navegador.js montar/dist.js tests/unit/entrada.test.mjs
git commit -m "refactor(montar): parte a entrada do navegador em iniciar() e duas entradas finas"
```

---

## Tarefa 2: `build/bundle.mjs` e os scripts de `dist/`

**Arquivos:**
- Criar: `build/bundle.mjs`
- Criar (gerado, versionado): `dist/aula-usp.js`, `dist/aula-usp-motor.js`, `dist/aula-usp-tex.js`, `dist/aula-usp-codigo.js`, `dist/aula-usp-lang-<linguagem>.js` (sete), `dist/manifesto.json`
- Teste: `tests/unit/bundle.test.mjs` (novo), `tests/integracao/dist.test.mjs` (novo)

**Interfaces:**
- Consome: `montar/dist.js` da tarefa 1.
- Produz: `empacotar({ raiz }) → Promise<Map<nome, { bytes, integrity }>>`, e `dist/manifesto.json` com `{ versao, gerado, arquivos: { "<nome>": { bytes, integrity } } }`.

**Decisão desta tarefa, já medida:** a CSS do KaTeX e as 20 fontes dele **não** entram em `aula-usp.js`; entram em `aula-usp-tex.js`, que injeta a própria folha ao ser importado. Motivo: são 361 kB de CSS com as fontes em data URI, e uma aula sem matemática não deve pagar por elas. Medido: com a mudança, `aula-usp.js` cai de 118,8 kB para **94,6 kB**, e os 404 de `fonts/KaTeX_*.woff2` somem.

- [ ] **Passo 1: escrever o teste que falha primeiro**

Criar `tests/unit/bundle.test.mjs`:

```js
// O empacotador é o dono de dist/. Este teste roda o empacotamento de verdade (é rápido: ~2 s) e
// afirma a FORMA do resultado, não o conteúdo — tamanho de bundle muda a cada atualização de
// dependência, e um teste que afirme bytes exatos vira ruído que todo mundo aprende a ignorar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empacotar } from '../../build/bundle.mjs';

const RAIZ = new URL('../../', import.meta.url);

test('empacotar produz os quatro scripts da spec 3.5 e uma gramática por linguagem do contrato', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  for (const nome of ['aula-usp.js', 'aula-usp-motor.js', 'aula-usp-tex.js', 'aula-usp-codigo.js']) {
    assert.ok(arquivos.has(nome), `faltou ${nome}`);
    assert.ok(arquivos.get(nome).bytes > 1000, `${nome} saiu vazio demais`);
  }
  const { linguagens } = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));
  for (const linguagem of linguagens) {
    assert.ok(arquivos.has(`aula-usp-lang-${linguagem}.js`), `faltou a gramática de ${linguagem}`);
  }
});

test('todo arquivo do manifesto tem integrity sha384 válido', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  for (const [nome, { integrity }] of arquivos) {
    assert.match(integrity, /^sha384-[A-Za-z0-9+/]{64}=$/, `${nome}: integrity fora do formato SRI`);
  }
});

// A regra que a tarefa 1 estabeleceu, agora do lado do pacote: o bundle do navegador é CLÁSSICO.
// Se alguém trocar o formato para esm, a fila de AulaUSP.demo deixa de existir antes do <script>
// do autor e toda demo da aula vira erro de registro — em silêncio, porque o espécime não tem demo
// em todos os decks. Barato de afirmar aqui, caro de descobrir depois.
test('aula-usp.js é script clássico: nada de import/export no topo', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  const texto = arquivos.get('aula-usp.js').texto;
  assert.equal(/^\s*(import|export)\b/m.test(texto), false, 'aula-usp.js saiu como módulo');
});

test('a CSS do KaTeX não está em aula-usp.js — ela mora no satélite de matemática', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  assert.equal(arquivos.get('aula-usp.js').texto.includes('.katex'), false,
    'a CSS do KaTeX voltou para o pacote principal: 361 kB que uma aula sem matemática não usa');
  assert.ok(arquivos.get('aula-usp-tex.js').texto.includes('.katex'));
});

test('o satélite de matemática não deixa nenhuma url(fonts/...) para buscar', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  const texto = arquivos.get('aula-usp-tex.js').texto;
  assert.equal(/url\(fonts\//.test(texto), false, 'sobrou referência a arquivo de fonte: daria 404');
  assert.ok(texto.includes('data:font/woff2;base64,'), 'as fontes do KaTeX não foram embutidas');
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/bundle.test.mjs
```

Esperado: FALHA, `Cannot find module '../../build/bundle.mjs'`.

- [ ] **Passo 3: escrever `build/bundle.mjs`**

```js
// Empacotador de dist/ (spec 3.3 etapa 4, 3.5 e 8.1). Node, não navegador.
// Os quatro scripts da spec, mais uma gramática do Shiki por linguagem do contrato.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

// sha384 em base64, o formato que o atributo integrity espera (spec 8.1; o `pacotes` do marco 6 escreve).
const integridade = (bytes) => `sha384-${createHash('sha384').update(bytes).digest('base64')}`;

const COMUM = {
  bundle: true,
  minify: true,
  target: ['chrome120'],
  logLevel: 'silent',
  write: false,
  // O CSS entra como TEXTO (montar/dist.js o importa e injeta), e binário como data URI.
  loader: { '.css': 'text', '.woff2': 'dataurl', '.svg': 'text', '.png': 'dataurl' },
};

// A CSS do KaTeX com as 20 woff2 dentro. Só woff2: woff e ttf são o fallback para navegadores que
// este sistema não atende (spec 8.2 pede Chrome), e embutir os três triplicaria 296 kB à toa.
async function cssDoTexComFontes(raiz) {
  const pastaKatex = new URL('node_modules/katex/dist/', raiz);
  const css = await readFile(new URL('katex.min.css', pastaKatex), 'utf8');
  const arquivos = [...new Set([...css.matchAll(/url\(fonts\/([^)]+)\)/g)].map((m) => m[1]))];
  const dados = new Map();
  for (const arquivo of arquivos.filter((a) => a.endsWith('.woff2'))) {
    dados.set(arquivo, (await readFile(new URL(`fonts/${arquivo}`, pastaKatex))).toString('base64'));
  }
  return css.replace(/url\(fonts\/([^)]+)\)/g, (_, arquivo) => {
    const base64 = dados.get(arquivo);
    // Sem data: a regra @font-face que sobrar aponta para lugar nenhum. url() vazio é a forma de
    // dizer "não tenho", e o Chrome simplesmente pula essa fonte da lista de src.
    return base64 ? `url(data:font/woff2;base64,${base64})` : 'url()';
  });
}

export async function empacotar({ raiz, escrever = true } = {}) {
  const dir = fileURLToPath(raiz);
  const { linguagens } = JSON.parse(await readFile(new URL('contrato/contrato.json', raiz), 'utf8'));
  const { version } = JSON.parse(await readFile(new URL('package.json', raiz), 'utf8'));
  const saidas = new Map();

  const guardar = (nome, resultado) => {
    const arquivo = resultado.outputFiles[0];
    saidas.set(nome, { bytes: arquivo.contents.length, integrity: integridade(arquivo.contents), texto: arquivo.text, conteudo: arquivo.contents });
  };

  // 1. o pacote do navegador: CLÁSSICO (iife), pelos motivos na tarefa 1.
  guardar('aula-usp.js', await esbuild.build({ ...COMUM, absWorkingDir: dir, entryPoints: ['montar/dist.js'], format: 'iife' }));

  // 2. o motor sozinho, que o build do marco 5b põe no lugar da tag do runtime.
  guardar('aula-usp-motor.js', await esbuild.build({ ...COMUM, absWorkingDir: dir, entryPoints: ['motor/motor.js'], format: 'iife', globalName: 'AulaUSPMotor' }));

  // 3. matemática: KaTeX + a CSS dele + as fontes dele. Injeta a própria folha ao ser importado,
  //    para que entrada.js não precise de um ramo só para este caso.
  const entradaTex = `
import katex from 'katex';
const folha = document.createElement('style');
folha.textContent = ${JSON.stringify(await cssDoTexComFontes(raiz))};
document.head.append(folha);
export default katex;
`;
  guardar('aula-usp-tex.js', await esbuild.build({ ...COMUM, absWorkingDir: dir, stdin: { contents: entradaTex, resolveDir: dir, loader: 'js' }, format: 'esm' }));

  // 4. código: o núcleo do Shiki. As gramáticas vão à parte, uma por linguagem — uma aula de
  //    Python não deve baixar a de LaTeX. (E `splitting: true` não serve: colide nos nomes.)
  guardar('aula-usp-codigo.js', await esbuild.build({ ...COMUM, absWorkingDir: dir,
    stdin: { contents: "export * from '@shikijs/primitive'; export * from '@shikijs/engine-javascript';", resolveDir: dir, loader: 'js' }, format: 'esm' }));

  for (const linguagem of linguagens) {
    guardar(`aula-usp-lang-${linguagem}.js`, await esbuild.build({ ...COMUM, absWorkingDir: dir,
      stdin: { contents: `export { default } from '@shikijs/langs/${linguagem}';`, resolveDir: dir, loader: 'js' }, format: 'esm' }));
  }

  if (escrever) {
    await mkdir(new URL('dist/', raiz), { recursive: true });
    for (const [nome, { conteudo }] of saidas) await writeFile(new URL(`dist/${nome}`, raiz), conteudo);
    const arquivos = Object.fromEntries([...saidas].map(([nome, { bytes, integrity }]) => [nome, { bytes, integrity }]));
    await writeFile(new URL('dist/manifesto.json', raiz),
      `${JSON.stringify({ versao: version, gerado: new Date().toISOString(), arquivos }, null, 2)}\n`);
  }
  return saidas;
}
```

- [ ] **Passo 4: rodar e ver passar**

```bash
node --test tests/unit/bundle.test.mjs
```

Esperado: 5 passam.

- [ ] **Passo 5: gerar `dist/` de verdade e conferir os tamanhos**

```bash
node -e "import('./build/bundle.mjs').then(m => m.empacotar({ raiz: new URL('file://' + process.cwd() + '/') }))"
```

Esperado, na ordem de grandeza medida: `aula-usp.js` ~95 kB · `aula-usp-motor.js` ~7 kB · `aula-usp-tex.js` ~620 kB · `aula-usp-codigo.js` ~112 kB · sete gramáticas somando ~400 kB. Se `aula-usp.js` passar de 200 kB, a CSS do KaTeX voltou para dentro dele — investigue antes de seguir.

- [ ] **Passo 6: o teste de integração que prova que uma aula monta pelo pacote**

Criar `tests/integracao/dist.test.mjs`. É a prova que importa: um servidor estático burro, sem nada do `servir`, servindo o espécime com a tag que ele já tem (`<script src="../dist/aula-usp.js">`).

```js
// dist/ pelo caminho real: servidor estático burro, a tag que o espécime já carrega, Chrome de verdade.
// Sem o `servir`, de propósito — é o `servir` que hoje reescreve a tag, e o que está sob teste aqui é
// justamente o caminho em que ninguém reescreve nada.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, esperarMontagem } from './utilitarios.mjs';

let navegador;
let sitio;

before(async () => {
  navegador = await iniciarChrome();
  sitio = await servirPasta('.'); // a raiz do sistema: o espécime pede ../dist/aula-usp.js
});
after(async () => {
  await navegador?.close();
  await sitio?.fechar();
});

async function abrirPeloDist(deck) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  pagina.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) erros.push(m.text()); });
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${sitio.endereco}/especime/${deck}`);
  await esperarMontagem(pagina);
  const titulo = await pagina.evaluate(() => document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent);
  return { pagina, erros, titulo };
}

for (const deck of ['index.html', 'matematica.html', 'codigo.html']) {
  test(`${deck} monta pelo pacote de dist/, sem erro de console`, async (t) => {
    const { pagina, erros, titulo } = await abrirPeloDist(deck);
    t.after(() => pagina.close());
    assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
    assert.deepEqual(erros, [], erros.join('\n'));
  });
}

// A fila de demos é a razão de o pacote ser script clássico (tarefa 1). Este teste mede o efeito,
// não a forma: se o pacote virar módulo, ele roda depois do <script> do autor e a demo se perde.
test('a demo registrada pelo script do autor chega ao runtime', async (t) => {
  const { pagina } = await abrirPeloDist('index.html');
  t.after(() => pagina.close());
  const registradas = await pagina.evaluate(() => [...(window.AulaUSP?.demos?.keys?.() ?? [])].length);
  const naFila = await pagina.evaluate(() => window.AulaUSP?.filaDeDemos?.length ?? -1);
  assert.ok(registradas > 0 || naFila === 0, 'nem registro nem fila: a demo do autor se perdeu');
});
```

> Se `servirPasta('.')` não aceitar a raiz do repositório, ajuste `tests/integracao/utilitarios.mjs` para aceitá-la — e diga no relatório que ajustou.

- [ ] **Passo 7: rodar o teste de integração**

```bash
node --test tests/integracao/dist.test.mjs
```

Esperado: 4 passam. Os três decks com `0 erros, 0 avisos` e **nenhum** erro de console — em particular, nenhum 404 de `fonts/KaTeX_*.woff2`.

- [ ] **Passo 8: commitar**

```bash
git add build/bundle.mjs dist/ tests/unit/bundle.test.mjs tests/integracao/dist.test.mjs
git commit -m "feat(dist): empacota os quatro scripts do runtime, com SRI e as fontes do KaTeX dentro"
```

---

## Tarefa 3: `validador/cobertura.json`

**Arquivos:**
- Criar: `build/cobertura.mjs`
- Criar (gerado, versionado): `validador/cobertura.json`
- Teste: `tests/unit/cobertura.test.mjs` (novo)

**Interfaces:**
- Consome: nada das tarefas anteriores.
- Produz: `gerarCobertura({ raiz }) → Promise<{ gerado, fontes, pontos }>` e `lerCobertura(json) → Set<number>`. `pontos` é uma lista de faixas `[inicio, fim]` inclusivas, ordenada.

**Por que faixas e não lista:** são 433 pontos hoje, mas a fase 2 pode embutir mais fontes; faixas mantêm o arquivo legível por humanos e pequeno, e `lerCobertura` é o único lugar que sabe expandi-las.

- [ ] **Passo 1: escrever o teste que falha primeiro**

```js
// A cobertura é a fonte única de "este caractere tem glifo?" para duas regras de severidade ERRO
// (spec 9.3). Os números aqui foram medidos nas fontes reais deste repositório.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarCobertura, lerCobertura } from '../../build/cobertura.mjs';

const RAIZ = new URL('../../', import.meta.url);

test('a cobertura sai das oito fontes do sistema e cobre os 433 pontos medidos', async () => {
  const cobertura = await gerarCobertura({ raiz: RAIZ });
  assert.equal(cobertura.fontes.length, 8);
  assert.equal(lerCobertura(cobertura).size, 433);
});

test('o que tem glifo e o que não tem, medido', async () => {
  const pontos = lerCobertura(await gerarCobertura({ raiz: RAIZ }));
  const tem = (c) => pontos.has(c.codePointAt(0));
  // Tipografia comum: tem de passar, ou a regra vira ruído em toda aula.
  for (const c of '×÷±…—–“”‘’•·°′″§¶†') assert.ok(tem(c), `${c} deveria ter glifo`);
  // Matemática e grego: não têm, e é por isso que a regra existe — empurra para dentro do TeX.
  for (const c of '→←≤≥≠≈∞∑∫√∂∇αβγδθλμπσφωΩ⟨⟩') assert.equal(tem(c), false, `${c} não deveria ter glifo`);
});

test('pontos que o cmap traz mas não são caracteres utilizáveis ficam de fora', async () => {
  const pontos = lerCobertura(await gerarCobertura({ raiz: RAIZ }));
  for (const ponto of [0x0, 0xD, 0xFFFF]) {
    assert.equal(pontos.has(ponto), false, `U+${ponto.toString(16).toUpperCase()} entrou na cobertura`);
  }
});

// Esta é a guarda que justifica a existência do módulo: se um dia der para trocar o cmap pelo
// unicodeRange declarado, este teste vai avisar. Hoje ele prova o contrário — e é por isso que a
// spec 8.2 pede fontkit em vez de um `split` no manifesto.
test('o cmap NÃO cabe no unicodeRange declarado: o manifesto não serve como fonte', async () => {
  const { readFile } = await import('node:fs/promises');
  const manifesto = JSON.parse(await readFile(new URL('assets/fontes/fontes.json', RAIZ), 'utf8'));
  const pontos = lerCobertura(await gerarCobertura({ raiz: RAIZ }));
  const declarados = new Set();
  for (const entrada of manifesto) {
    for (const trecho of entrada.unicodeRange.split(',')) {
      const [a, b] = trecho.trim().replace(/^U\+/i, '').split('-');
      const inicio = parseInt(a, 16);
      const fim = parseInt(b ?? a, 16);
      for (let p = inicio; p <= fim; p++) declarados.add(p);
    }
  }
  const fora = [...pontos].filter((p) => !declarados.has(p));
  assert.ok(fora.length > 0, 'se isto passar a ser zero, o manifesto virou fonte válida — reveja a spec 8.2');
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/cobertura.test.mjs
```

Esperado: FALHA, `Cannot find module '../../build/cobertura.mjs'`.

- [ ] **Passo 3: escrever `build/cobertura.mjs`**

```js
// Gera validador/cobertura.json (spec 9.3): a fonte única de quais caracteres têm glifo nas fontes
// embutidas. Lido por matematica.simbolo-fora-do-tex e, no marco 5b, por saida.glifo-ausente.
// Node, não navegador — quem consome é o validador, que recebe o JSON já lido.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import fontkit from 'fontkit';

// O cmap traz entradas que não são caracteres que alguém escreve: o nulo, o carriage return e o
// não-caractere U+FFFF aparecem no Open Sans. Deixá-los entrar faria a regra aprovar um NUL literal.
const UTILIZAVEL = (ponto) => ponto > 0x20 && ponto !== 0xFFFF && ponto !== 0xFFFE;

// Faixas inclusivas, para o arquivo caber num olhar e não crescer linearmente com a fase 2.
function emFaixas(pontos) {
  const ordenados = [...pontos].sort((a, b) => a - b);
  const faixas = [];
  for (const ponto of ordenados) {
    const ultima = faixas.at(-1);
    if (ultima && ponto === ultima[1] + 1) ultima[1] = ponto;
    else faixas.push([ponto, ponto]);
  }
  return faixas;
}

export function lerCobertura({ pontos }) {
  const conjunto = new Set();
  for (const [inicio, fim] of pontos) for (let p = inicio; p <= fim; p++) conjunto.add(p);
  return conjunto;
}

export async function gerarCobertura({ raiz }) {
  const pasta = new URL('assets/fontes/', raiz);
  const arquivos = (await readdir(pasta)).filter((nome) => nome.endsWith('.woff2')).sort();
  const pontos = new Set();
  for (const arquivo of arquivos) {
    const fonte = fontkit.create(await readFile(new URL(arquivo, pasta)));
    for (const ponto of fonte.characterSet) if (UTILIZAVEL(ponto)) pontos.add(ponto);
  }
  return { gerado: new Date().toISOString(), fontes: arquivos, pontos: emFaixas(pontos) };
}

export async function escreverCobertura({ raiz }) {
  const cobertura = await gerarCobertura({ raiz });
  await writeFile(new URL('validador/cobertura.json', raiz), `${JSON.stringify(cobertura, null, 2)}\n`);
  return cobertura;
}
```

> `UTILIZAVEL` corta `ponto <= 0x20`, o que tira também o espaço (U+20). Isso é de propósito: espaço e quebra de linha nunca precisam de glifo, e deixá-los de fora evita que a regra da tarefa 4 precise de exceções para eles. Se um dia a cobertura precisar do espaço, mude aqui, num lugar só.

- [ ] **Passo 4: rodar e ver passar**

```bash
node --test tests/unit/cobertura.test.mjs
```

Esperado: 4 passam. **Se a contagem não der 433**, não ajuste o número no teste: as fontes do repositório são as mesmas que foram medidas, então uma contagem diferente significa que `UTILIZAVEL` ou a leitura mudaram. Pare e relate.

- [ ] **Passo 5: gerar o arquivo e commitar**

```bash
node -e "import('./build/cobertura.mjs').then(m => m.escreverCobertura({ raiz: new URL('file://' + process.cwd() + '/') }))"
```

```bash
git add build/cobertura.mjs validador/cobertura.json tests/unit/cobertura.test.mjs
git commit -m "feat(validador): gera cobertura.json a partir do cmap das fontes embutidas"
```

---

## Tarefa 4: a regra adiada, o comando `dist` e o ajuste do `servir`

**Arquivos:**
- Modificar: `validador/regras/matematica.js`, `contrato/contrato.json`, `bin/aula-usp.mjs`, `build/servir.mjs`, `build/validar.mjs`
- Teste: `tests/unit/matematica-glifos.test.mjs` (novo), `tests/unit/validar-cli.test.mjs` (acrescentar)

**Interfaces:**
- Consome: `lerCobertura` e `validador/cobertura.json` da tarefa 3; `empacotar` da tarefa 2.
- Produz: nada para tarefas posteriores deste plano. O marco 5b consome `cobertura` do mesmo jeito para `saida.glifo-ausente`.

**O que o marco 4 deixou escrito:** `matematica.simbolo-fora-do-tex` é a única das 56 regras da fase 1 que ficou de fora, adiada de propósito com a gêmea `saida.glifo-ausente`. A entrada dela **já existe** em `contrato/contrato.json`; confira antes de acrescentar. Há também uma exceção nomeada na guarda de `tests/unit/validador.test.mjs` que amarra contrato e registro — **remova a exceção** ao implementar, ou a guarda passa a mentir.

- [ ] **Passo 1: escrever o teste que falha primeiro**

```js
// spec 9.2: erro para "caractere sem glifo nas fontes embutidas, FORA de TeX e de código".
// As duas exclusões são o miolo da regra: dentro de \( \) o KaTeX desenha o símbolo com as fontes
// dele, e dentro de <pre>/<code> o texto é literal por definição.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { readFileSync } from 'node:fs';
import { validar } from '../../validador/validar.js';
import { REGRAS_ESTATICAS } from '../../validador/regras/index.js';
import { lerCobertura } from '../../build/cobertura.mjs';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));
const cobertura = lerCobertura(JSON.parse(readFileSync(new URL('validador/cobertura.json', RAIZ), 'utf8')));

const aula = (corpo) => parseHTML(
  `<!DOCTYPE html><html lang="pt-BR"><head><title>t</title></head><body>${corpo}</body></html>`).document;

const glifos = (corpo) => validar(aula(corpo), { contrato, regras: REGRAS_ESTATICAS, grupo: 'estatica', cobertura })
  .filter((achado) => achado.regra === 'matematica.simbolo-fora-do-tex');

test('símbolo sem glifo no texto corrido acusa, com o caractere na mensagem', () => {
  const achados = glifos('<section data-layout="conteudo" id="s"><p>Quando n → ∞.</p></section>');
  assert.equal(achados.length, 1);
  assert.match(achados[0].mensagem, /→/);
  assert.equal(achados[0].slide, 1);
  assert.equal(achados[0].id, 's');
});

test('o mesmo símbolo dentro de TeX não acusa: é lá que ele deve estar', () => {
  assert.deepEqual(glifos('<section data-layout="conteudo"><p>Quando \\( n \\to \\infty \\).</p></section>'), []);
});

test('dentro de código também não acusa: o texto é literal', () => {
  assert.deepEqual(glifos('<section data-layout="conteudo"><pre data-lang="python">x → y</pre></section>'), []);
  assert.deepEqual(glifos('<section data-layout="conteudo"><p>use <code>a → b</code></p></section>'), []);
});

test('tipografia que TEM glifo não acusa — senão a regra vira ruído', () => {
  assert.deepEqual(glifos('<section data-layout="conteudo"><p>São 3 × 4 ± 1 — “aspas”, 25 °C.</p></section>'), []);
});

test('o mesmo símbolo repetido no slide acusa uma vez só', () => {
  const achados = glifos('<section data-layout="conteudo"><p>α e depois α de novo</p></section>');
  assert.equal(achados.length, 1);
});

test('sem cobertura no contexto a regra fica calada, em vez de acusar tudo', () => {
  const achados = validar(aula('<section data-layout="conteudo"><p>n → ∞</p></section>'),
    { contrato, regras: REGRAS_ESTATICAS, grupo: 'estatica' })
    .filter((a) => a.regra === 'matematica.simbolo-fora-do-tex');
  assert.deepEqual(achados, []);
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/matematica-glifos.test.mjs
```

Esperado: FALHA — a regra ainda não existe, então todos os `glifos(...)` voltam vazios.

- [ ] **Passo 3: implementar a regra em `validador/regras/matematica.js`**

Reuse `textosDe` de `componentes/tex.js`, que **já** pula `pre, code, script, style, textarea, svg, [data-tex]` — é o andador que existe para responder "onde a matemática pode estar", e aqui a pergunta é a mesma. Não escreva um segundo andador: o marco 4b registrou essa classe de defeito (`palavrasDe` reusou o andador errado e cegou a contagem para SVG).

```js
  {
    nome: 'matematica.simbolo-fora-do-tex',
    *aplicar({ slides, contrato, cobertura }) {
      // Sem cobertura no contexto (validação sem o arquivo gerado), a regra se cala. Acusar tudo
      // seria pior que não acusar nada: um cobertura.json ausente viraria centenas de erros falsos.
      if (!cobertura) return;
      for (const secao of slides) {
        const vistos = new Set();
        for (const no of textosDe(secao)) {
          // Fora de TeX: os segmentos entre \( \) e \[ \] saem do texto antes de medir.
          for (const caractere of semTex(no.textContent)) {
            const ponto = caractere.codePointAt(0);
            if (cobertura.has(ponto) || vistos.has(ponto)) continue;
            vistos.add(ponto);
            yield {
              ...onde(slides, secao),
              mensagem: `caractere sem glifo nas fontes embutidas: "${caractere}" (U+${ponto.toString(16).toUpperCase().padStart(4, '0')}).`,
              trecho: encurtar(no.textContent),
            };
          }
        }
      }
    },
  },
```

`semTex(texto)` remove os trechos de TeX antes de medir; ponha-a junto das outras auxiliares do arquivo:

```js
// Os segmentos de TeX saem antes da medição: dentro de \( \) e \[ \] quem desenha é o KaTeX, com as
// fontes dele. Mesmo recorte que limites.palavras-corpo usa para "sem contar TeX" (spec 5.3).
const semTex = (texto) => texto.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, ' ');
```

Confira que a entrada no contrato tem a ação certa. Ela vai disparar muito — os símbolos que faltam são quase todo o repertório matemático e grego —, então a ação precisa **ensinar**, não só acusar:

```json
    "matematica.simbolo-fora-do-tex": { "severidade": "erro", "grupo": "estatica", "fase": 1, "acao": "Escreva o símbolo em TeX: \\( \\to \\), \\( \\alpha \\), \\( \\leq \\)." },
```

- [ ] **Passo 4: rodar e ver passar; tirar a exceção da guarda**

```bash
node --test tests/unit/matematica-glifos.test.mjs
```

Esperado: 6 passam.

Em `tests/unit/validador.test.mjs`, remova `matematica.simbolo-fora-do-tex` da lista de exceções nomeadas da guarda contrato×registro, e rode:

```bash
npm test
```

Esperado: 341 + 6 + os testes das tarefas 2 e 3, todos passando. **Os seis decks do espécime precisam continuar limpos** — se algum passar a acusar glifo, é achado de verdade e o deck é que precisa de conserto; relate antes de mexer.

- [ ] **Passo 5: `build/validar.mjs` passa a cobertura ao contexto**

Carregue `validador/cobertura.json` junto com o contrato e passe `cobertura: lerCobertura(...)` em `validar(...)`. Se o arquivo não existir, passe `undefined` e siga — a regra se cala sozinha (passo 3), e é assim que um repositório sem `aula-usp dist` rodado ainda valida.

- [ ] **Passo 6: o comando `dist` na CLI**

Em `bin/aula-usp.mjs`, acrescente `dist` ao texto de uso e ao despacho. Mantenha a regra que o marco 4a estabeleceu e que está comentada no topo do arquivo: **import dinâmico dentro do try**, nunca estático, porque `build/bundle.mjs` importa esbuild e `build/cobertura.mjs` importa fontkit no escopo do módulo — uma dependência ausente tem de virar saída 2, não stack trace.

```js
const USO = 'uso: aula-usp servir <pasta> [--porta 8765]\n'
  + '       aula-usp validar <pasta> [--json]\n'
  + '       aula-usp dist';
```

```js
async function distComando(argumentos) {
  if (argumentos.length > 0) sair(USO); // dist não recebe alvo: gera sempre o do próprio sistema
  const raiz = new URL('../', import.meta.url);
  try {
    const [{ empacotar }, { escreverCobertura }] = await Promise.all([
      import('../build/bundle.mjs'),
      import('../build/cobertura.mjs'),
    ]);
    const arquivos = await empacotar({ raiz });
    const cobertura = await escreverCobertura({ raiz });
    for (const [nome, { bytes }] of arquivos) console.log(`dist/${nome} · ${(bytes / 1024).toFixed(1)} kB`);
    console.log(`validador/cobertura.json · ${cobertura.fontes.length} fontes`);
  } catch (erro) {
    sair(`falha de ambiente: ${erro.message}\nrode npm install na pasta do sistema`);
  }
}
```

- [ ] **Passo 7: `servir` remove o `integrity`**

Spec 8.1: "`servir` troca o endereço pelo local e remove o `integrity`". Hoje `build/servir.mjs` casa a tag pelo `src` terminado em `/aula-usp.js` e a substitui inteira — então o `integrity` já some junto. **Confirme isso lendo o código**, acrescente um teste que prove, e só mude o código se o teste falhar:

```js
test('servir troca a tag do runtime e não deixa integrity para trás', () => {
  const html = '<script src="https://cdn.exemplo/aula-usp.js" integrity="sha384-abc" crossorigin="anonymous"></script>';
  const saida = trocarTagDoRuntime(html); // exporte a função se ainda não for exportada
  assert.equal(saida.includes('integrity'), false);
  assert.match(saida, /montar\/carregador\.js/);
});
```

- [ ] **Passo 8: acrescentar o caso do `dist` aos testes da CLI**

Em `tests/unit/validar-cli.test.mjs`, junto dos outros testes de uso:

```js
test('dist não aceita alvo: um segundo argumento sai com 2 e imprime o uso', () => {
  try {
    execFileSync('node', [CLI, 'dist', 'alguma-pasta'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp servir/);
  }
});
```

- [ ] **Passo 9: rodar tudo e commitar**

```bash
npm test
```

Depois, um comando por arquivo, os de integração tocados: `dist`, `validador`, `matematica`, `painel`, `composicao`.

```bash
git add validador/regras/matematica.js contrato/contrato.json bin/aula-usp.mjs build/servir.mjs build/validar.mjs tests/
git commit -m "feat(validador): fecha matematica.simbolo-fora-do-tex e acrescenta o comando dist"
```

---

## Auto-revisão deste plano

**Cobertura da spec.** 3.5 (os quatro scripts de `dist/`): tarefa 2. 8.1 (comando `dist`; `servir` sem `integrity`): tarefa 4. 8.2 (esbuild e fontkit como devDependencies): commit `a9bb1e9`, antes deste plano. 9.2 e 9.3 (`matematica.simbolo-fora-do-tex` e a origem de `cobertura.json`): tarefas 3 e 4. 3.2 (o pacote embute CSS, fontes e marcas): tarefa 2 — **com um desvio declarado**: a CSS e as fontes do KaTeX vão para `aula-usp-tex.js`, não para `aula-usp.js`, porque são 361 kB que uma aula sem matemática não usa. O resultado observável é o mesmo (nada é buscado de fora), e o desvio está medido no fato 8.

**Fora de escopo, de propósito:** `saida.glifo-ausente` (marco 5b: roda sobre o HTML final, que ainda não existe), `aula-usp build`, o PDF, e a reescrita da tag do runtime com versão e `integrity` (marco 6, comando `pacotes`, que lê o `dist/manifesto.json` que a tarefa 2 grava).

**Dependências entre tarefas.** 2 consome 1 (precisa de `montar/dist.js`). 4 consome 2 e 3. 3 é independente de 1 e 2 — pode ser feita em qualquer ordem antes da 4.

**O risco desta leva.** A tarefa 1 mexe no arquivo mais central do sistema e não acrescenta comportamento nenhum: todo o seu valor está em **não** mudar nada. As 13 suítes de integração são o teste de regressão real, e é por isso que o passo 3 dela manda rodá-las antes de qualquer coisa nova existir. Um implementador que "conserte" um teste que mudou de resultado nessa tarefa quebrou o modo navegador sem saber.
