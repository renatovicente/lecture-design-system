# Aula USP · Marco 2b (Motor de apresentação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a aula montada numa apresentação: palco escalado, um slide por vez, passos, teclado, cliques, endereço `#id/n` e painéis de notas, visão geral e ajuda, com um carregador clássico que deixa os registros de demos funcionarem desde a leitura da página.

**Architecture:** `montar/carregador.js` é um script clássico que `aula-usp servir` põe no lugar da tag do runtime. Ele esconde o corpo, cria a fila de `AulaUSP.demo` e importa `montar/navegador.js`. A entrada espera o DOM, monta a aula e chama `iniciarMotor` (`motor/motor.js`), que move os slides para `div.palco` e liga teclado, cliques, endereço e escala. Em seguida, `instalarPaineis` (`motor/paineis.js`) acrescenta notas, visão geral e ajuda. A lógica sem DOM vivo (grupos de passos, ação de cada tecla, avanço, retorno e endereço) fica em módulos puros testados no Node com `linkedom`; o comportamento com eventos e CSS é testado no Chrome.

**Tech Stack:** Node 20+ (máquina do autor: v25.6.1), ES modules, `node:test`; `linkedom` e `playwright-core`, já em `devDependencies` desde o M2a; Google Chrome instalado (ou `CHROME_PATH`).

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 3.2, 4.2, 6.1 a 6.5, 6.8 e 11.2). Estado de partida: marco 2a na `main` (`1e64a84`), com montagem, layouts, `servir`, espécimes, 85 testes unitários e 11 de integração.

## Global Constraints

- Node 20 ou superior; ES modules; testes com `node:test` e `node:assert/strict`; sem Python.
- `montar/` e `motor/` não importam nada de Node: só API padrão do DOM, para rodar no navegador (spec 3.5).
- Nomes de arquivos, pastas, classes, atributos e identificadores em português.
- Toda classe gerada pelo sistema está em `contrato.classesDoSistema`; classes do autor nunca são geradas pelo sistema.
- Palco (spec 6.1): 1280 × 720 lógicos, escalado por `min(largura / 1280, altura / 720)` e centralizado; o entorno é `papel`; trocar de slide e revelar um passo são cortes secos, sem animação.
- Teclas deste marco (spec 6.2): →, espaço e PageDown revelam o próximo passo e, sem passos pendentes, avançam o slide; ← e PageUp escondem o último passo revelado e, sem passos revelados, voltam o slide; Home e End vão ao primeiro e ao último slide; 1 a 8 levam à abertura do bloco correspondente; Esc fecha o painel aberto e, sem painel aberto, abre a visão geral; N abre o painel de notas; F alterna a tela cheia; ? abre a ajuda; clique nas faixas laterais (12 % da largura cada) volta ou avança; clique num quadrado do mapa leva à abertura do bloco. As teclas são ignoradas quando o foco está num controle de demo. P (apresentador) é do marco 2c; V (validador) é do marco 4.
- Endereço (spec 6.3): `#<id>` identifica o slide e `#<id>/<n>`, o passo; a barra de endereço acompanha a navegação, e recarregar mantém a posição.
- Passos (spec 6.4): qualquer elemento do corpo com `data-passo` é um passo; sem número, a ordem é a do documento; com número, a ordem é a numérica, e elementos de mesmo número aparecem juntos; passos ocultos usam `visibility: hidden`; um slide começa sem passos revelados; ao voltar de um slide seguinte, ele aparece com todos os passos revelados. O `\passo{n}{…}` do TeX chega no marco 3 e gera elementos com `data-passo`, que este motor já trata.
- Painéis (spec 6.5): notas num painel de 380 px à direita, com texto de 20 px; visão geral com cartões agrupados por bloco, com número, título e o quadrado do bloco, e clicar navega; ajuda com a tabela de teclas.
- Textos do sistema em `pt-BR` e `en`, escolhidos pelo `lang` da aula (spec 6.8).
- Cores só pelos tokens; sem sombras, gradientes, transparências ou cantos arredondados (spec 4.2), inclusive nos painéis.
- Modo navegador (spec 3.2, passo 1): um estilo esconde o corpo até o fim da montagem; se o runtime não carregar, nada é escondido.
- Nenhuma dependência nova.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Decisões herdadas do marco 2a

- **Carregador clássico:** no M2a, `servir` trocava a tag do runtime por um `<script type="module">`, que roda depois dos scripts clássicos da página; um `<script>` com `AulaUSP.demo(...)` no corpo quebraria. Aqui a tag vira um script clássico que esconde o corpo e cria a fila de `AulaUSP.demo` durante a leitura do `<head>`. O marco 2c drena a fila no registro de demos.
- **Montagem única:** `montar` passa a recusar uma aula já montada.
- **Continuam como estão:** o contador de largura fixa (7 caracteres) e `img.estatico` oculta na tela.

## Decisões deste marco (conferidas no Chrome 152 antes de escrever o plano; o autor pode revê-las)

- **Motor em dois planos:** este plano cobre palco, navegação, passos, endereço e painéis; o marco 2c cobre a API de demos, a janela do apresentador e a impressão, cada um com o seu teste de integração.
- **Faixas laterais:** são zonas calculadas pela posição do clique (12 % da largura da janela de cada lado), não elementos sobre o palco, para nada cobrir o conteúdo perto das margens. Cliques em links, botões, controles, demos e painéis nunca contam como faixa.
- **Modificadores:** teclas com Ctrl, Cmd ou Alt são ignoradas, para os atalhos do navegador continuarem funcionando; espaço num botão focado mantém a ação do botão.
- **Histórico:** o endereço muda com `history.replaceState`, então passos e slides não criam entradas no histórico. Endereço inválido é reescrito para a posição atual; id desconhecido ao abrir leva ao primeiro slide; passo acima do total é limitado ao total.
- **Numeração mista:** um slide com passos numerados e sem número usa a ordem do documento; o validador (marco 4) acusa `estrutura.passos-mistos`.
- **Notas empurram o palco:** com o painel de notas aberto, o palco passa a caber na largura que sobra, em vez de ficar coberto.
- **Um painel por vez:** visão geral e ajuda cobrem a janela; Esc fecha o que estiver aberto.
- **Ajuda por marco:** a tabela lista só as teclas que funcionam neste marco; o 2c acrescenta P e o 4 acrescenta V.
- **`?folha`:** com `?folha` na URL, os slides ficam empilhados sem motor, como no M2a. Os testes de geometria usam esse modo, e ele serve para revisar todos os slides de uma vez.
- **Utilitários de DOM:** `elemento` sai de `montar/cromo.js` para `motor/dom.js`, junto de `clonarSemIds`, que copia as notas agora e fará as cópias de impressão e as miniaturas do marco 2c.
- **Utilitários de teste:** os testes de integração compartilham `tests/integracao/utilitarios.mjs` (Chrome, servidor de uma pasta e espera da montagem).

## Roteiro atualizado

| plano | escopo | depende de |
|---|---|---|
| M2a · Montagem e layouts | concluído na `main` (`1e64a84`) | M1 |
| **M2b · Motor de apresentação (este)** | carregador clássico, palco, navegação, passos, endereço, notas, visão geral, ajuda | M2a |
| M2c · Demos, apresentador e impressão | `AulaUSP.demo` com ciclo de vida, janela do apresentador com `postMessage`, `prepararImpressao` e `restaurarImpressao`, `estilos/impressao.css` | M2b |
| M3 · Componentes | campos, exercício, listas, tabela, figura, código, matemática | M2c |
| M4 · Validador | regras estáticas, de carga e de composição, painel (V) | M3 |
| M5 · Build e PDF | embutir, PDF, regras de saída, `dist` com SRI | M4 |
| M6 · Guia e pacotes | guia, modelo, aula-exemplo, pacotes | M5 |
| M7 · Aceite | Claude Code e Codex CLI | M6 |

## Estrutura de arquivos deste marco

| arquivo | responsabilidade |
|---|---|
| `motor/rotulos.js` | acrescenta os textos do motor: notas, visão geral, ajuda e tabela de teclas |
| `motor/passos.js` | grupos de passos de um slide e marcação dos revelados |
| `motor/navegacao.js` | ação de cada tecla, avanço e retorno com passos, leitura e escrita do endereço |
| `montar/carregador.js` | carregador clássico: esconde o corpo, fila de `AulaUSP.demo`, importa a entrada |
| `montar/navegador.js` | entrada: espera o DOM, monta e inicia motor e painéis (ou fica em `?folha`) |
| `montar/montar.js` | recusa uma aula já montada |
| `build/servir.mjs` | troca a tag do runtime pelo carregador clássico |
| `motor/motor.js` | palco, slide ativo, escala, teclado, cliques, endereço |
| `motor/dom.js` | `elemento` e `clonarSemIds` |
| `montar/cromo.js` | importa `elemento` de `motor/dom.js` |
| `motor/paineis.js` | notas, visão geral e ajuda |
| `estilos/motor.css` | palco, passos ocultos e painéis |
| `contrato/contrato.json` | classes do motor e dos painéis em `classesDoSistema` |
| `especime/index.html` | passos sem número e numerados |
| `tests/unit/passos.test.mjs`, `navegacao.test.mjs`, `dom.test.mjs` | testes unitários novos |
| `tests/unit/servir.test.mjs`, `montar.test.mjs` | ajustes para o carregador e a montagem única |
| `tests/fixtures/carregador/index.html` | aula mínima com um registro de demo no corpo |
| `tests/integracao/utilitarios.mjs` | Chrome, servidor de uma pasta, espera da montagem |
| `tests/integracao/carregador.test.mjs`, `motor.test.mjs`, `paineis.test.mjs` | testes de integração novos |
| `tests/integracao/layouts.test.mjs` | passa a usar os utilitários e `?folha` |

---

### Task 1: Passos, navegação e rótulos do motor

**Files:**
- Modify: `motor/rotulos.js`
- Create: `motor/passos.js`, `motor/navegacao.js`
- Test: `tests/unit/passos.test.mjs`, `tests/unit/navegacao.test.mjs`

**Interfaces:**
- Consumes: `ROTULOS` e `rotulosPara(lang)` de `motor/rotulos.js` (marco 2a); o DOM montado, em que o conteúdo do autor fica em `section.slide > div.area` e as notas em `section.slide > aside.notas`.
- Produces (usado pelas tarefas 3 e 4 e pelo marco 2c):
  - `ROTULOS['pt-BR']` e `ROTULOS.en` ganham `notas`, `semNotas`, `visaoGeral`, `ajuda`, `tecla` e `acao` (textos) e `teclas: Array<[tecla: string, acao: string]>` (10 linhas);
  - `gruposDePassos(slide: Element) → Element[][]`, só com elementos dentro de `.area`;
  - `aplicarPassos(grupos: Element[][], revelados: number) → void`, que põe `data-revelado` nos `revelados` primeiros grupos e tira dos demais;
  - `acaoDaTecla({ key, ctrlKey?, metaKey?, altKey? }) → 'avancar' | 'voltar' | 'primeiro' | 'ultimo' | 'escape' | 'notas' | 'tela-cheia' | 'ajuda' | 'bloco-1' … 'bloco-8' | null`;
  - `avancar(estado, passosPorSlide: number[]) → estado` e `voltar(estado, passosPorSlide) → estado`, com `estado = { indice: number, passo: number }`;
  - `lerEndereco(hash: string, ids: string[], passosPorSlide: number[]) → estado | null` e `escreverEndereco(estado, ids: string[]) → string` (`'#id'` ou `'#id/n'`).

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/unit/passos.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { gruposDePassos, aplicarPassos } from '../../motor/passos.js';

const slide = (corpo) => parseHTML(`<!DOCTYPE html><html><body><section class="slide">
  <div class="area">${corpo}</div><aside class="notas"><p data-passo>nota</p></aside></section></body></html>`)
  .document.querySelector('section');
const textos = (grupos) => grupos.map((grupo) => grupo.map((elemento) => elemento.textContent));

test('slide sem data-passo não tem passos', () => {
  assert.deepEqual(gruposDePassos(slide('<p>Texto.</p>')), []);
});

test('passos sem número seguem a ordem do documento, um elemento por passo, e as notas ficam de fora', () => {
  const grupos = gruposDePassos(slide('<ol><li data-passo>a</li><li data-passo>b</li></ol><p data-passo="">c</p>'));
  assert.deepEqual(textos(grupos), [['a'], ['b'], ['c']]);
});

test('passos numerados seguem a ordem numérica, e o mesmo número forma um grupo', () => {
  const grupos = gruposDePassos(slide('<p data-passo="2">a</p><p data-passo="1">b</p><p data-passo="2">c</p><p data-passo="10">d</p>'));
  assert.deepEqual(textos(grupos), [['b'], ['a', 'c'], ['d']]);
});

test('numeração mista ou inválida cai na ordem do documento', () => {
  assert.deepEqual(textos(gruposDePassos(slide('<p data-passo="2">a</p><p data-passo>b</p>'))), [['a'], ['b']]);
  assert.deepEqual(textos(gruposDePassos(slide('<p data-passo="0">a</p><p data-passo="1">b</p>'))), [['a'], ['b']]);
});

test('aplicarPassos marca data-revelado nos grupos revelados e tira dos demais', () => {
  const grupos = gruposDePassos(slide('<p data-passo="1">a</p><p data-passo="2">b</p><p data-passo="2">c</p>'));
  const revelados = () => grupos.flat().map((elemento) => elemento.hasAttribute('data-revelado'));
  aplicarPassos(grupos, 2);
  assert.deepEqual(revelados(), [true, true, true]);
  aplicarPassos(grupos, 1);
  assert.deepEqual(revelados(), [true, false, false]);
  aplicarPassos(grupos, 0);
  assert.deepEqual(revelados(), [false, false, false]);
});
```

Criar `tests/unit/navegacao.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acaoDaTecla, avancar, voltar, lerEndereco, escreverEndereco } from '../../motor/navegacao.js';
import { ROTULOS } from '../../motor/rotulos.js';

test('acaoDaTecla traduz as teclas da spec 6.2', () => {
  const casos = {
    ArrowRight: 'avancar', ' ': 'avancar', PageDown: 'avancar', ArrowLeft: 'voltar', PageUp: 'voltar',
    Home: 'primeiro', End: 'ultimo', Escape: 'escape', n: 'notas', N: 'notas', f: 'tela-cheia', F: 'tela-cheia',
    '?': 'ajuda', 1: 'bloco-1', 8: 'bloco-8',
  };
  for (const [key, acao] of Object.entries(casos)) assert.equal(acaoDaTecla({ key }), acao, key);
});

test('acaoDaTecla ignora teclas fora da tabela, 0, 9, nomes do protótipo e combinações com modificadores', () => {
  for (const key of ['a', '0', '9', 'Enter', 'constructor', 'toString']) assert.equal(acaoDaTecla({ key }), null, key);
  assert.equal(acaoDaTecla({ key: 'ArrowRight', metaKey: true }), null);
  assert.equal(acaoDaTecla({ key: 'ArrowLeft', ctrlKey: true }), null);
  assert.equal(acaoDaTecla({ key: 'f', altKey: true }), null);
});

test('avancar revela passos pendentes antes de trocar de slide e para no último estado', () => {
  const passos = [0, 2, 0];
  assert.deepEqual(avancar({ indice: 0, passo: 0 }, passos), { indice: 1, passo: 0 });
  assert.deepEqual(avancar({ indice: 1, passo: 0 }, passos), { indice: 1, passo: 1 });
  assert.deepEqual(avancar({ indice: 1, passo: 2 }, passos), { indice: 2, passo: 0 });
  assert.deepEqual(avancar({ indice: 2, passo: 0 }, passos), { indice: 2, passo: 0 });
});

test('voltar esconde passos revelados e chega ao slide anterior com todos os passos revelados', () => {
  const passos = [0, 2, 0];
  assert.deepEqual(voltar({ indice: 1, passo: 2 }, passos), { indice: 1, passo: 1 });
  assert.deepEqual(voltar({ indice: 2, passo: 0 }, passos), { indice: 1, passo: 2 });
  assert.deepEqual(voltar({ indice: 1, passo: 0 }, passos), { indice: 0, passo: 0 });
  assert.deepEqual(voltar({ indice: 0, passo: 0 }, passos), { indice: 0, passo: 0 });
});

test('endereço #id e #id/n: leitura, limite de passos, id desconhecido e escrita', () => {
  const ids = ['capa', 'passo', 'fim'];
  const passos = [0, 3, 0];
  assert.deepEqual(lerEndereco('#passo', ids, passos), { indice: 1, passo: 0 });
  assert.deepEqual(lerEndereco('#passo/2', ids, passos), { indice: 1, passo: 2 });
  assert.deepEqual(lerEndereco('#passo/9', ids, passos), { indice: 1, passo: 3 });
  assert.deepEqual(lerEndereco('#passo/x', ids, passos), { indice: 1, passo: 0 });
  assert.equal(lerEndereco('#nao-existe', ids, passos), null);
  assert.equal(lerEndereco('', ids, passos), null);
  assert.equal(escreverEndereco({ indice: 1, passo: 0 }, ids), '#passo');
  assert.equal(escreverEndereco({ indice: 1, passo: 2 }, ids), '#passo/2');
});

test('os rótulos do motor existem nos dois idiomas, com a mesma tabela de teclas', () => {
  for (const idioma of ['pt-BR', 'en']) {
    for (const chave of ['notas', 'semNotas', 'visaoGeral', 'ajuda', 'tecla', 'acao']) {
      assert.equal(typeof ROTULOS[idioma][chave], 'string', `${idioma}.${chave}`);
    }
    assert.equal(ROTULOS[idioma].teclas.length, 10, idioma);
    assert.ok(ROTULOS[idioma].teclas.every((linha) => linha.length === 2 && linha.every(Boolean)), idioma);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/passos.test.mjs tests/unit/navegacao.test.mjs`
Expected: FAIL com `Cannot find module '.../motor/passos.js'` e `'.../motor/navegacao.js'`.

- [ ] **Step 3: Acrescentar os rótulos do motor**

Substituir o conteúdo de `motor/rotulos.js` por:

```js
// Textos do sistema em pt-BR e en (spec 6.8). O idioma vem do lang da aula.
export const ROTULOS = {
  'pt-BR': {
    introducao: 'Introdução',
    encerramento: 'Encerramento',
    bloco: 'Bloco',
    de: 'de',
    aula: 'Aula',
    meses: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    notas: 'Notas',
    semNotas: 'Este slide não tem notas.',
    visaoGeral: 'Visão geral',
    ajuda: 'Ajuda',
    tecla: 'Tecla',
    acao: 'Ação',
    teclas: [
      ['→, espaço, PageDown', 'revela o próximo passo; sem passos pendentes, avança o slide'],
      ['←, PageUp', 'esconde o último passo revelado; sem passos revelados, volta o slide'],
      ['Home, End', 'primeiro e último slide'],
      ['1 a 8', 'abertura do bloco correspondente'],
      ['Esc', 'fecha o painel aberto; sem painel aberto, abre a visão geral'],
      ['N', 'painel de notas'],
      ['F', 'tela cheia'],
      ['?', 'ajuda'],
      ['clique nas laterais', 'volta ou avança'],
      ['clique num quadrado do mapa', 'abertura do bloco'],
    ],
  },
  en: {
    introducao: 'Introduction',
    encerramento: 'Closing',
    bloco: 'Block',
    de: 'of',
    aula: 'Lecture',
    meses: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    notas: 'Notes',
    semNotas: 'This slide has no notes.',
    visaoGeral: 'Overview',
    ajuda: 'Help',
    tecla: 'Key',
    acao: 'Action',
    teclas: [
      ['→, Space, PageDown', 'reveals the next step; with no pending steps, goes to the next slide'],
      ['←, PageUp', 'hides the last revealed step; with no revealed steps, goes to the previous slide'],
      ['Home, End', 'first and last slide'],
      ['1 to 8', 'opening slide of that block'],
      ['Esc', 'closes the open panel; with no open panel, opens the overview'],
      ['N', 'notes panel'],
      ['F', 'full screen'],
      ['?', 'help'],
      ['click on the sides', 'back or forward'],
      ['click on a map square', 'opening slide of that block'],
    ],
  },
};

export function rotulosPara(lang) {
  if (typeof lang === 'string' && lang.toLowerCase().startsWith('en')) return ROTULOS.en;
  return ROTULOS['pt-BR'];
}
```

- [ ] **Step 4: Criar `motor/passos.js`**

```js
// Passos de um slide (spec 6.4): elementos do corpo com data-passo, revelados em grupos.

const NUMERO = /^[1-9][0-9]*$/;

export function gruposDePassos(slide) {
  const elementos = [...slide.querySelectorAll('.area [data-passo]')];
  const numeros = elementos.map((elemento) => elemento.getAttribute('data-passo'));
  if (!numeros.every((numero) => NUMERO.test(numero))) return elementos.map((elemento) => [elemento]);
  const porNumero = new Map();
  elementos.forEach((elemento, k) => {
    const numero = Number(numeros[k]);
    if (!porNumero.has(numero)) porNumero.set(numero, []);
    porNumero.get(numero).push(elemento);
  });
  return [...porNumero.keys()].sort((a, b) => a - b).map((numero) => porNumero.get(numero));
}

export function aplicarPassos(grupos, revelados) {
  grupos.forEach((grupo, k) => {
    for (const elemento of grupo) {
      if (k < revelados) elemento.setAttribute('data-revelado', '');
      else elemento.removeAttribute('data-revelado');
    }
  });
}
```

- [ ] **Step 5: Criar `motor/navegacao.js`**

```js
// Navegação (spec 6.2 e 6.3): ação de cada tecla, avanço e retorno com passos, endereço #id/n.

const TECLAS = {
  ArrowRight: 'avancar',
  ' ': 'avancar',
  PageDown: 'avancar',
  ArrowLeft: 'voltar',
  PageUp: 'voltar',
  Home: 'primeiro',
  End: 'ultimo',
  Escape: 'escape',
  n: 'notas',
  N: 'notas',
  f: 'tela-cheia',
  F: 'tela-cheia',
  '?': 'ajuda',
};

export function acaoDaTecla({ key, ctrlKey = false, metaKey = false, altKey = false }) {
  if (ctrlKey || metaKey || altKey) return null;
  if (/^[1-8]$/.test(key)) return `bloco-${key}`;
  return Object.hasOwn(TECLAS, key) ? TECLAS[key] : null;
}

export function avancar({ indice, passo }, passosPorSlide) {
  if (passo < passosPorSlide[indice]) return { indice, passo: passo + 1 };
  if (indice < passosPorSlide.length - 1) return { indice: indice + 1, passo: 0 };
  return { indice, passo };
}

export function voltar({ indice, passo }, passosPorSlide) {
  if (passo > 0) return { indice, passo: passo - 1 };
  if (indice > 0) return { indice: indice - 1, passo: passosPorSlide[indice - 1] };
  return { indice, passo };
}

export function lerEndereco(hash, ids, passosPorSlide) {
  const [id, textoDoPasso = ''] = hash.replace(/^#/, '').split('/');
  const indice = ids.indexOf(id);
  if (indice < 0) return null;
  const passo = /^[0-9]+$/.test(textoDoPasso) ? Math.min(Number(textoDoPasso), passosPorSlide[indice]) : 0;
  return { indice, passo };
}

export function escreverEndereco({ indice, passo }, ids) {
  return passo > 0 ? `#${ids[indice]}/${passo}` : `#${ids[indice]}`;
}
```

- [ ] **Step 6: Rodar os testes**

Run: `npm test`
Expected: PASS em todos (85 do marco 2a + 5 de `passos` + 6 de `navegacao` = 96).

- [ ] **Step 7: Commit**

```bash
git add motor/rotulos.js motor/passos.js motor/navegacao.js tests/unit/passos.test.mjs tests/unit/navegacao.test.mjs
git commit -m "feat(motor): passos, ação das teclas, endereço e rótulos do motor

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Carregador clássico e entrada do navegador

**Files:**
- Create: `tests/integracao/utilitarios.mjs`, `tests/fixtures/carregador/index.html`, `montar/carregador.js`
- Modify: `tests/integracao/layouts.test.mjs`, `tests/unit/servir.test.mjs`, `tests/unit/montar.test.mjs`, `montar/navegador.js`, `build/servir.mjs`, `montar/montar.js`
- Test: `tests/integracao/carregador.test.mjs`

**Interfaces:**
- Consumes: `criarServidor({ pastaAula })`, `PREFIXO` e `reescreverRuntime(html)` de `build/servir.mjs`; `montar(doc, { unidades, usp, urlMarcas, limites })` de `montar/montar.js`; `body[data-montado]` e `pre.painel` marcados por `montar/navegador.js` (marco 2a).
- Produces (usado pelas tarefas 3 e 4 e pelo marco 2c):
  - `montar/carregador.js`, script clássico: acrescenta `style[data-aula-usp="ocultar"]` com `body { visibility: hidden; }`, define `window.AulaUSP = { filaDeDemos: Array<{ nome, definicao }>, demo(nome, definicao) }` e importa `montar/navegador.js`; se a importação falha, remove o estilo e escreve `Aula USP: a entrada do navegador não carregou.` no console;
  - `reescreverRuntime(html)` passa a trocar a tag do runtime por `<script src="/_aula-usp/montar/carregador.js"></script>`;
  - `montar/navegador.js` espera o `DOMContentLoaded` antes de montar e remove, no fim, o estilo do carregador;
  - `montar(doc, …)` lança `Error('aula já montada')` se o documento já tem `section.slide`;
  - `tests/integracao/utilitarios.mjs`: `RAIZ: URL`, `iniciarChrome() → Promise<Browser>`, `servirPasta(pastaRelativaARaiz: string) → Promise<{ endereco: string, fechar(): Promise<void> }>`, `esperarMontagem(pagina) → Promise<void>` (lança com o texto de `pre.painel` se a montagem falhar) e `abrirAula(navegador, url, { largura = 1400, altura = 900 }) → Promise<{ pagina, erros: string[] }>`.

- [ ] **Step 1: Criar os utilitários dos testes de integração**

Criar `tests/integracao/utilitarios.mjs`:

```js
// Utilitários dos testes de integração: Chrome instalado, servidor de uma pasta e aula montada.
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { criarServidor } from '../../build/servir.mjs';

export const RAIZ = new URL('../../', import.meta.url);

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

export async function esperarMontagem(pagina) {
  await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
  const [estado, painel] = await pagina.evaluate(() => [document.body.dataset.montado, document.querySelector('pre.painel')?.textContent]);
  if (estado !== 'sim') throw new Error(painel ?? `a montagem terminou em "${estado}"`);
  await pagina.evaluate(() => document.fonts.ready);
}

export async function abrirAula(navegador, url, { largura = 1400, altura = 900 } = {}) {
  const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
  const erros = [];
  pagina.on('pageerror', (erro) => erros.push(erro.message));
  pagina.on('console', (mensagem) => {
    if (mensagem.type() === 'error' && !mensagem.location().url.endsWith('/favicon.ico')) erros.push(mensagem.text());
  });
  await pagina.goto(url);
  await esperarMontagem(pagina);
  return { pagina, erros };
}
```

- [ ] **Step 2: Fazer os testes de geometria usarem os utilitários**

Em `tests/integracao/layouts.test.mjs`, substituir tudo o que vem antes da linha `const perto = (obtido, esperado, descricao) => …` por:

```js
// Geometria dos layouts no Chrome, sobre os espécimes servidos por `aula-usp servir` (spec 4.4, 4.5, 5.4 e 11.2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAIZ, iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

const SAIDA = fileURLToPath(new URL('saida/', import.meta.url));
const lerJson = async (caminho) => JSON.parse(await readFile(new URL(caminho, RAIZ), 'utf8'));
const unidades = await lerJson('assets/marcas/unidades.json');
const usp = await lerJson('assets/marcas/usp.json');

const TINTA = 'rgb(10, 10, 10)';
const AZUL = 'rgb(16, 148, 171)';
const AMARELO = 'rgb(252, 180, 33)';
const TRANSPARENTE = 'rgba(0, 0, 0, 0)';

let servidor;
let navegador;
const paginas = new Map();

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
  await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

function especime(arquivo) {
  if (!paginas.has(arquivo)) paginas.set(arquivo, abrirAula(navegador, `${servidor.endereco}/${arquivo}`));
  return paginas.get(arquivo);
}
```

O resto do arquivo não muda: os testes continuam chamando `especime(arquivo)`.

Run: `npm run test:integracao`
Expected: PASS nos 11 testes, como antes da troca.

- [ ] **Step 3: Escrever os testes que falham**

Em `tests/unit/servir.test.mjs`, trocar a asserção

```js
  assert.ok(saida.includes(`<script type="module" src="${PREFIXO}montar/navegador.js"></script>`));
```

por

```js
  assert.ok(saida.includes(`<script src="${PREFIXO}montar/carregador.js"></script>`));
```

e a asserção

```js
  assert.ok(resposta.corpo.includes(`src="${PREFIXO}montar/navegador.js"`));
```

por

```js
  assert.ok(resposta.corpo.includes(`<script src="${PREFIXO}montar/carregador.js"></script>`));
```

Em `tests/unit/montar.test.mjs`, acrescentar este teste logo antes de `test('slug remove acentos e pontuação; ids repetidos ganham sufixo', …)`:

```js
test('montar recusa uma aula já montada', () => {
  const { document } = montado(AULA_IME());
  assert.throws(() => montar(document, { unidades, usp, urlMarcas: 'M', limites }), /aula já montada/);
});
```

Criar `tests/fixtures/carregador/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Fixture do carregador</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Fixture do carregador">
<meta name="aula" content="1">
<meta name="data" content="2026-09-15">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../dist/aula-usp.js"></script>
</head>
<body>
<script>
  window.visibilidadeDuranteALeitura = getComputedStyle(document.body).visibility;
  AulaUSP.demo('fixture', { montar() {} });
</script>
<section data-layout="capa">
  <h1>Carregador</h1>
</section>
<section data-layout="encerramento">
  <h2>Fim</h2>
  <ol class="sintese">
    <li>A fila recebe o registro antes da montagem.</li>
  </ol>
</section>
</body>
</html>
```

Criar `tests/integracao/carregador.test.mjs`:

```js
// Carregador clássico (spec 3.2, passo 1): corpo escondido desde a leitura e fila de AulaUSP.demo antes da entrada modular.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

let servidor;
let navegador;

before(async () => {
  servidor = await servirPasta('tests/fixtures/carregador/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

test('o corpo fica escondido durante a leitura, AulaUSP.demo enfileira e a montagem mostra o corpo', async () => {
  const { pagina, erros } = await abrirAula(navegador, `${servidor.endereco}/`);
  const estado = await pagina.evaluate(() => ({
    durante: window.visibilidadeDuranteALeitura,
    depois: getComputedStyle(document.body).visibility,
    estiloDeOcultar: document.querySelectorAll('style[data-aula-usp]').length,
    fila: window.AulaUSP.filaDeDemos.map((registro) => registro.nome),
  }));
  assert.deepEqual(estado, { durante: 'hidden', depois: 'visible', estiloDeOcultar: 0, fila: ['fixture'] });
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('se a entrada modular não carrega, o corpo aparece cru e o erro vai para o console', async () => {
  const pagina = await navegador.newPage();
  const mensagens = [];
  pagina.on('console', (mensagem) => mensagens.push(mensagem.text()));
  await pagina.route('**/_aula-usp/montar/navegador.js', (rota) => rota.abort());
  await pagina.goto(`${servidor.endereco}/`);
  await pagina.waitForFunction(() => !document.querySelector('style[data-aula-usp]'));
  assert.equal(await pagina.evaluate(() => getComputedStyle(document.body).visibility), 'visible');
  assert.equal(await pagina.evaluate(() => document.body.dataset.montado), undefined);
  assert.ok(mensagens.some((texto) => texto.includes('Aula USP: a entrada do navegador não carregou.')), mensagens.join('\n'));
  await pagina.close();
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL em 3 testes: os dois do servidor que procuram `montar/carregador.js` e `montar recusa uma aula já montada`.

Run: `node --test tests/integracao/carregador.test.mjs`
Expected: FAIL nos 2 testes. O primeiro para em `page.evaluate: TypeError: Cannot read properties of undefined (reading 'filaDeDemos')`, porque a entrada ainda é o módulo do marco 2a e `window.AulaUSP` não existe; o segundo falha numa `AssertionError`, porque a mensagem `Aula USP: a entrada do navegador não carregou.` não aparece no console.

- [ ] **Step 5: Criar `montar/carregador.js`**

```js
// Carregador clássico do modo de desenvolvimento (spec 3.2), posto por `aula-usp servir` no lugar da tag do runtime.
// Roda durante a leitura do <head>: esconde o corpo, cria a fila de AulaUSP.demo e importa a entrada modular.
(() => {
  const ocultar = document.createElement('style');
  ocultar.setAttribute('data-aula-usp', 'ocultar');
  ocultar.textContent = 'body { visibility: hidden; }';
  document.head.append(ocultar);

  const filaDeDemos = [];
  window.AulaUSP = {
    filaDeDemos,
    demo(nome, definicao) {
      filaDeDemos.push({ nome, definicao });
    },
  };

  import(new URL('navegador.js', document.currentScript.src).href).catch((erro) => {
    ocultar.remove();
    console.error('Aula USP: a entrada do navegador não carregou.', erro);
  });
})();
```

- [ ] **Step 6: Atualizar `montar/navegador.js`**

Substituir o conteúdo de `montar/navegador.js` por:

```js
// Entrada do modo navegador em desenvolvimento, importada por montar/carregador.js (spec 3.2).
// No marco 5, dist/aula-usp.js embute CSS, fontes e marcas; aqui tudo vem por URL.
import { montar } from './montar.js';

const BASE = new URL('../', import.meta.url);
const ESTILOS = ['estilos/tokens.css', 'estilos/fontes.css', 'estilos/base.css', 'estilos/layouts.css'];

function carregarEstilo(caminho) {
  return new Promise((pronto, falha) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(caminho, BASE).href;
    link.addEventListener('load', pronto, { once: true });
    link.addEventListener('error', () => falha(new Error(`não carregou ${caminho}`)), { once: true });
    document.head.append(link);
  });
}

async function lerJson(caminho) {
  const resposta = await fetch(new URL(caminho, BASE));
  if (!resposta.ok) throw new Error(`não carregou ${caminho} (HTTP ${resposta.status})`);
  return resposta.json();
}

function documentoLido() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((pronto) => document.addEventListener('DOMContentLoaded', pronto, { once: true }));
}

try {
  await documentoLido();
  const [unidades, usp, contrato] = await Promise.all([
    lerJson('assets/marcas/unidades.json'),
    lerJson('assets/marcas/usp.json'),
    lerJson('contrato/contrato.json'),
    ...ESTILOS.map(carregarEstilo),
  ]);
  montar(document, {
    unidades,
    usp,
    urlMarcas: new URL('assets/marcas', BASE).href,
    limites: { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] },
  });
  document.body.classList.add('folha');
  void document.body.offsetHeight; // força o layout, que pede as fontes usadas, antes de esperar por elas
  await document.fonts.ready;
  document.body.dataset.montado = 'sim';
} catch (erro) {
  document.body.dataset.montado = 'erro';
  const aviso = document.createElement('pre');
  aviso.className = 'painel';
  aviso.textContent = `Aula USP: ${erro.message}`;
  document.body.prepend(aviso);
  console.error(erro);
} finally {
  document.querySelector('style[data-aula-usp="ocultar"]')?.remove();
}
```

- [ ] **Step 7: Trocar a tag do runtime pelo carregador em `build/servir.mjs`**

Em `reescreverRuntime`, trocar a linha

```js
    `<script type="module" src="${PREFIXO}montar/navegador.js"></script>`,
```

por

```js
    `<script src="${PREFIXO}montar/carregador.js"></script>`,
```

- [ ] **Step 8: Recusar uma segunda montagem em `montar/montar.js`**

Logo depois de `export function montar(doc, { unidades, usp, urlMarcas, limites }) {`, acrescentar a linha:

```js
  if (doc.querySelector('section.slide')) throw new Error('aula já montada');
```

- [ ] **Step 9: Rodar os testes**

Run: `npm test`
Expected: PASS em todos (96 + 1 = 97).

Run: `npm run test:integracao`
Expected: PASS nos 13 testes (11 de layouts + 2 do carregador).

- [ ] **Step 10: Commit**

```bash
git add montar/carregador.js montar/navegador.js montar/montar.js build/servir.mjs tests/integracao/utilitarios.mjs tests/integracao/layouts.test.mjs tests/integracao/carregador.test.mjs tests/fixtures/carregador tests/unit/servir.test.mjs tests/unit/montar.test.mjs
git commit -m "feat(montar): carregador clássico com fila de demos e montagem única

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: Palco, teclado, cliques e endereço

**Files:**
- Modify: `especime/index.html`, `tests/integracao/layouts.test.mjs`, `montar/navegador.js`, `contrato/contrato.json`
- Create: `motor/motor.js`, `estilos/motor.css`
- Test: `tests/integracao/motor.test.mjs`

**Interfaces:**
- Consumes: `gruposDePassos` e `aplicarPassos` (`motor/passos.js`); `acaoDaTecla`, `avancar`, `voltar`, `lerEndereco` e `escreverEndereco` (`motor/navegacao.js`); `rotulosPara` (`motor/rotulos.js`); o resumo devolvido por `montar`, `{ total, modo, blocos: Array<{ numero, titulo, curto, id }> }`; `iniciarChrome`, `servirPasta`, `abrirAula`, `esperarMontagem` e `RAIZ` (`tests/integracao/utilitarios.mjs`).
- Produces (usado pela Task 4 e pelo marco 2c):
  - `iniciarMotor({ doc, janela, resumo }) → motor`, com `motor = { doc, janela, rot, resumo, slides: Element[], ids: string[], grupos: Element[][][], estado() → { indice, passo }, irPara({ indice, passo }), aoMudar(ouvinte(estado, anterior)), definirAcao(nome, acao), reservarDireita(largura: number) }`;
  - ações registradas pelo motor: `avancar`, `voltar`, `primeiro`, `ultimo`, `tela-cheia` e `bloco-1` … `bloco-8` (só para os blocos que existem); a Task 4 registra `notas`, `ajuda` e `escape`, e o marco 2c registra `apresentador`;
  - DOM: `body.modo-palco`; `div.palco` com todos os `section.slide`; `section.slide.ativo` no slide atual; `data-revelado` nos elementos de passo revelados; variáveis `--escala` e `--centro-x` em `.palco`;
  - `?folha` na URL: `body.folha`, sem motor.

- [ ] **Step 1: Marcar passos no espécime**

Em `especime/index.html`, no slide `#o-que-mostra`, trocar

```html
    <li>Três blocos, cada um aberto por uma abertura.</li>
    <li>Grades de duas e de três colunas.</li>
```

por

```html
    <li data-passo>Três blocos, cada um aberto por uma abertura.</li>
    <li data-passo>Grades de duas e de três colunas.</li>
```

e, no slide `#grade-4-4-4`, trocar

```html
    <div><p>Primeira coluna.</p></div>
    <div><p>Segunda coluna.</p></div>
    <div><p>Terceira coluna.</p></div>
```

por

```html
    <div><p data-passo="2">Primeira coluna.</p></div>
    <div><p data-passo="1">Segunda coluna.</p></div>
    <div><p data-passo="2">Terceira coluna.</p></div>
```

- [ ] **Step 2: Abrir os testes de geometria em modo folha**

Em `tests/integracao/layouts.test.mjs`, na função `especime`, trocar

```js
  if (!paginas.has(arquivo)) paginas.set(arquivo, abrirAula(navegador, `${servidor.endereco}/${arquivo}`));
```

por

```js
  if (!paginas.has(arquivo)) paginas.set(arquivo, abrirAula(navegador, `${servidor.endereco}/${arquivo}?folha`));
```

- [ ] **Step 3: Escrever o teste de integração que falha**

Criar `tests/integracao/motor.test.mjs`:

```js
// Motor no Chrome (spec 6.1 a 6.4 e 11.2): palco escalado, teclado, passos, endereço, saltos de bloco e cliques.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RAIZ, iniciarChrome, servirPasta, abrirAula, esperarMontagem } from './utilitarios.mjs';

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));

let servidor;
let navegador;

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

const abrir = (caminho, opcoes) => abrirAula(navegador, `${servidor.endereco}/${caminho}`, opcoes);

function situacao(pagina) {
  return pagina.evaluate(() => {
    const ativos = [...document.querySelectorAll('.palco > .slide.ativo')];
    const passos = ativos[0] ? [...ativos[0].querySelectorAll('.area [data-passo]')] : [];
    return {
      ativos: ativos.length,
      id: ativos[0]?.id,
      hash: location.hash,
      revelados: passos.map((elemento) => getComputedStyle(elemento).visibility === 'visible'),
    };
  });
}

async function teclar(pagina, tecla) {
  await pagina.keyboard.press(tecla);
  return situacao(pagina);
}

function caixaDoPalco(pagina) {
  return pagina.evaluate(() => {
    const { x, y, width, height } = document.querySelector('.palco').getBoundingClientRect();
    return { x, y, largura: width, altura: height };
  });
}

test('palco: um slide por vez, escalado pelo menor fator e centralizado na janela', async () => {
  const { pagina, erros } = await abrir('index.html', { largura: 1600, altura: 900 });
  assert.deepEqual(await situacao(pagina), { ativos: 1, id: 'capa', hash: '#capa', revelados: [] });
  assert.deepEqual(await caixaDoPalco(pagina), { x: 0, y: 0, largura: 1600, altura: 900 });
  await pagina.setViewportSize({ width: 1000, height: 900 });
  await pagina.waitForFunction(() => document.querySelector('.palco').getBoundingClientRect().width === 1000);
  assert.deepEqual(await caixaDoPalco(pagina), { x: 0, y: 168.75, largura: 1000, altura: 562.5 });
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('teclado: →, espaço e PageDown revelam passos e avançam; ← e PageUp voltam; Home e End vão às pontas', async () => {
  const { pagina } = await abrir('index.html');
  const roteiro = [
    ['ArrowRight', 'o-que-mostra', '#o-que-mostra', [false, false]],
    ['Space', 'o-que-mostra', '#o-que-mostra/1', [true, false]],
    ['PageDown', 'o-que-mostra', '#o-que-mostra/2', [true, true]],
    ['ArrowRight', 'blocos', '#blocos', []],
    ['ArrowLeft', 'o-que-mostra', '#o-que-mostra/2', [true, true]],
    ['PageUp', 'o-que-mostra', '#o-que-mostra/1', [true, false]],
    ['End', 'encerramento', '#encerramento', []],
    ['ArrowRight', 'encerramento', '#encerramento', []],
    ['Home', 'capa', '#capa', []],
    ['ArrowLeft', 'capa', '#capa', []],
  ];
  for (const [tecla, id, hash, revelados] of roteiro) {
    assert.deepEqual(await teclar(pagina, tecla), { ativos: 1, id, hash, revelados }, tecla);
  }
  await pagina.close();
});

test('passos numerados: o mesmo número aparece junto, e voltar do slide seguinte mostra todos revelados', async () => {
  const { pagina } = await abrir('index.html#grade-4-4-4');
  assert.deepEqual((await situacao(pagina)).revelados, [false, false, false]);
  assert.deepEqual(await teclar(pagina, 'ArrowRight'), { ativos: 1, id: 'grade-4-4-4', hash: '#grade-4-4-4/1', revelados: [false, true, false] });
  assert.deepEqual(await teclar(pagina, 'ArrowRight'), { ativos: 1, id: 'grade-4-4-4', hash: '#grade-4-4-4/2', revelados: [true, true, true] });
  assert.equal((await teclar(pagina, 'ArrowRight')).id, 'encerramento');
  assert.deepEqual(await teclar(pagina, 'ArrowLeft'), { ativos: 1, id: 'grade-4-4-4', hash: '#grade-4-4-4/2', revelados: [true, true, true] });
  await pagina.close();
});

test('endereço: #id/n abre no passo, recarregar mantém a posição e endereços inválidos são corrigidos', async () => {
  const { pagina } = await abrir('index.html#o-que-mostra/1');
  const noPasso = { ativos: 1, id: 'o-que-mostra', hash: '#o-que-mostra/1', revelados: [true, false] };
  assert.deepEqual(await situacao(pagina), noPasso);
  await pagina.reload();
  await esperarMontagem(pagina);
  assert.deepEqual(await situacao(pagina), noPasso);
  await pagina.evaluate(() => { location.hash = '#grades'; });
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'grades');
  assert.equal((await situacao(pagina)).hash, '#grades');
  await pagina.evaluate(() => { location.hash = '#o-que-mostra/9'; });
  await pagina.waitForFunction(() => location.hash === '#o-que-mostra/2');
  assert.deepEqual((await situacao(pagina)).revelados, [true, true]);
  await pagina.evaluate(() => { location.hash = '#nao-existe'; });
  await pagina.waitForFunction(() => location.hash === '#o-que-mostra/2');
  assert.equal((await situacao(pagina)).id, 'o-que-mostra');
  await pagina.close();
  const { pagina: outra } = await abrir('index.html#nao-existe');
  assert.deepEqual(await situacao(outra), { ativos: 1, id: 'capa', hash: '#capa', revelados: [] });
  await outra.close();
});

test('saltos: 1 a 8 levam à abertura do bloco, 9 não faz nada e o quadrado do mapa leva à abertura', async () => {
  const { pagina } = await abrir('index.html');
  assert.equal((await teclar(pagina, '2')).id, 'figuras-e-demos');
  assert.equal((await teclar(pagina, '9')).id, 'figuras-e-demos');
  assert.equal((await teclar(pagina, '3')).id, 'grades');
  await pagina.evaluate(() => { location.hash = '#grade-8-4'; });
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'grade-8-4');
  await pagina.locator('#grade-8-4 .mapa a.quadrado').nth(2).click();
  assert.deepEqual(await situacao(pagina), { ativos: 1, id: 'grades', hash: '#grades', revelados: [] });
  await pagina.close();
});

test('cliques nas laterais: 12 % da largura voltam ou avançam; o centro, links e demos não disparam as faixas', async () => {
  const { pagina } = await abrir('index.html#grade-6-6', { largura: 1600, altura: 900 });
  await pagina.mouse.click(100, 450);
  assert.equal((await situacao(pagina)).id, 'grades');
  await pagina.mouse.click(1500, 450);
  assert.equal((await situacao(pagina)).id, 'grade-6-6');
  await pagina.mouse.click(800, 450);
  assert.equal((await situacao(pagina)).id, 'grade-6-6');
  await pagina.evaluate(() => { location.hash = '#demo'; });
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'demo');
  const demo = await pagina.evaluate(() => {
    const { right, top, bottom } = document.querySelector('#demo .demo').getBoundingClientRect();
    return { x: right - 20, y: (top + bottom) / 2 };
  });
  assert.ok(demo.x > 1600 * 0.88, `a demo não chega à faixa direita: ${demo.x}`);
  await pagina.mouse.click(demo.x, demo.y);
  assert.equal((await situacao(pagina)).id, 'demo');
  await pagina.close();
});

test('teclas dentro de um controle de demo não navegam', async () => {
  const { pagina } = await abrir('index.html#demo');
  await pagina.evaluate(() => {
    const campo = document.createElement('input');
    document.querySelector('#demo .demo').append(campo);
    campo.focus();
  });
  assert.equal((await teclar(pagina, 'ArrowRight')).id, 'demo');
  await pagina.evaluate(() => document.activeElement.blur());
  assert.equal((await teclar(pagina, 'ArrowRight')).id, 'grades');
  await pagina.close();
});

test('F alterna a tela cheia', async () => {
  const { pagina } = await abrir('index.html');
  await pagina.keyboard.press('f');
  await pagina.waitForFunction(() => document.fullscreenElement === document.documentElement, null, { timeout: 5000 });
  await pagina.keyboard.press('F');
  await pagina.waitForFunction(() => document.fullscreenElement === null, null, { timeout: 5000 });
  await pagina.close();
});

test('com o motor ativo, toda classe do documento é do autor ou está em contrato.classesDoSistema', async () => {
  const { pagina } = await abrir('index.html');
  const classes = await pagina.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .flatMap((elemento) => [...elemento.classList]))]);
  const conhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);
  assert.deepEqual(classes.filter((nome) => !conhecidas.has(nome)), []);
  await pagina.close();
});

test('?folha mantém os slides empilhados, sem palco', async () => {
  const { pagina } = await abrir('index.html?folha');
  const folha = await pagina.evaluate(() => ({
    folha: document.body.classList.contains('folha'),
    palco: document.querySelector('.palco'),
    visiveis: [...document.querySelectorAll('section.slide')].filter((slide) => slide.getClientRects().length > 0).length,
  }));
  assert.deepEqual(folha, { folha: true, palco: null, visiveis: 13 });
  await pagina.close();
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `node --test tests/integracao/motor.test.mjs`
Expected: FAIL em 9 dos 10 testes, com `AssertionError` (não há `div.palco` nem `section.slide.ativo`) e, no de tela cheia, `TimeoutError` depois de 5 s. O teste de `?folha` já passa, porque a entrada ainda deixa todos os slides em folha.

Run: `npm run test:integracao`
Expected: 14 passam (os 13 anteriores e o de `?folha`) e 9 falham, os mesmos de cima.

- [ ] **Step 5: Criar `motor/motor.js`**

```js
// Motor de apresentação (spec 6.1 a 6.4): palco escalado, um slide por vez, passos, teclado, cliques e endereço.
import { gruposDePassos, aplicarPassos } from './passos.js';
import { acaoDaTecla, avancar, voltar, lerEndereco, escreverEndereco } from './navegacao.js';
import { rotulosPara } from './rotulos.js';

const LARGURA_DO_PALCO = 1280;
const ALTURA_DO_PALCO = 720;
const FAIXA_DE_CLIQUE = 0.12;
const CONTROLES = 'input, select, textarea, [contenteditable]';
const INTERATIVOS = 'a, button, input, select, textarea, label, [contenteditable], .demo, [data-painel]';

export function iniciarMotor({ doc, janela, resumo }) {
  const rot = rotulosPara(doc.documentElement.getAttribute('lang') ?? undefined);
  const slides = [...doc.querySelectorAll('section.slide')];
  const ids = slides.map((slide) => slide.id);
  const grupos = slides.map(gruposDePassos);
  const passosPorSlide = grupos.map((lista) => lista.length);
  const acoes = new Map();
  const ouvintes = [];
  let estado = null;
  let reservaDireita = 0;

  const palco = doc.createElement('div');
  palco.className = 'palco';
  palco.append(...slides);
  doc.body.prepend(palco);
  doc.body.classList.add('modo-palco');

  function ajustarEscala() {
    const largura = janela.innerWidth - reservaDireita;
    const escala = Math.min(largura / LARGURA_DO_PALCO, janela.innerHeight / ALTURA_DO_PALCO);
    palco.style.setProperty('--escala', String(escala));
    palco.style.setProperty('--centro-x', `${largura / 2}px`);
  }

  function irPara(alvo) {
    const indice = Math.max(0, Math.min(slides.length - 1, alvo.indice));
    const passo = Math.max(0, Math.min(passosPorSlide[indice], alvo.passo));
    if (estado && estado.indice === indice && estado.passo === passo) return;
    const anterior = estado;
    if (anterior?.indice !== indice) {
      if (anterior) slides[anterior.indice].classList.remove('ativo');
      slides[indice].classList.add('ativo');
    }
    aplicarPassos(grupos[indice], passo);
    estado = { indice, passo };
    janela.history.replaceState(null, '', escreverEndereco(estado, ids));
    for (const ouvinte of ouvintes) ouvinte(estado, anterior);
  }

  acoes.set('avancar', () => irPara(avancar(estado, passosPorSlide)));
  acoes.set('voltar', () => irPara(voltar(estado, passosPorSlide)));
  acoes.set('primeiro', () => irPara({ indice: 0, passo: 0 }));
  acoes.set('ultimo', () => irPara({ indice: slides.length - 1, passo: 0 }));
  acoes.set('tela-cheia', () => {
    const pedido = doc.fullscreenElement ? doc.exitFullscreen() : doc.documentElement.requestFullscreen();
    pedido.catch((erro) => janela.console.warn('Aula USP: tela cheia indisponível.', erro));
  });
  resumo.blocos.slice(0, 8).forEach((bloco) => {
    acoes.set(`bloco-${bloco.numero}`, () => irPara({ indice: ids.indexOf(bloco.id), passo: 0 }));
  });

  janela.addEventListener('keydown', (evento) => {
    const alvo = evento.target;
    if (alvo?.closest?.(`.demo, ${CONTROLES}`)) return;
    if (evento.key === ' ' && alvo?.closest?.('button')) return;
    const acao = acoes.get(acaoDaTecla(evento));
    if (!acao) return;
    evento.preventDefault();
    acao();
  });

  doc.addEventListener('click', (evento) => {
    const link = evento.target.closest?.('a[href^="#"]');
    const indice = link ? ids.indexOf(link.getAttribute('href').slice(1)) : -1;
    if (indice >= 0) {
      evento.preventDefault();
      irPara({ indice, passo: 0 });
      return;
    }
    if (evento.target.closest?.(INTERATIVOS)) return;
    if (evento.clientX < janela.innerWidth * FAIXA_DE_CLIQUE) acoes.get('voltar')();
    else if (evento.clientX > janela.innerWidth * (1 - FAIXA_DE_CLIQUE)) acoes.get('avancar')();
  });

  janela.addEventListener('hashchange', () => {
    const alvo = lerEndereco(janela.location.hash, ids, passosPorSlide);
    if (alvo) irPara(alvo);
    janela.history.replaceState(null, '', escreverEndereco(estado, ids));
  });

  janela.addEventListener('resize', ajustarEscala);
  ajustarEscala();
  irPara(lerEndereco(janela.location.hash, ids, passosPorSlide) ?? { indice: 0, passo: 0 });

  return {
    doc,
    janela,
    rot,
    resumo,
    slides,
    ids,
    grupos,
    estado: () => estado,
    irPara,
    aoMudar: (ouvinte) => ouvintes.push(ouvinte),
    definirAcao: (nome, acao) => acoes.set(nome, acao),
    reservarDireita: (largura) => {
      reservaDireita = largura;
      ajustarEscala();
    },
  };
}
```

- [ ] **Step 6: Criar `estilos/motor.css`**

```css
/* Motor (spec 6.1 e 6.4): palco escalado no centro da janela, um slide por vez, passos ocultos sem mover nada. */

body.modo-palco {
  height: 100vh;
  overflow: hidden;
}

.palco {
  --escala: 1;
  --centro-x: 50vw;
  position: fixed;
  left: var(--centro-x);
  top: 50%;
  width: var(--palco-largura);
  height: var(--palco-altura);
  transform: translate(-50%, -50%) scale(var(--escala));
}

.palco > .slide {
  display: none;
  position: absolute;
  inset: 0;
}

.palco > .slide.ativo {
  display: block;
}

.palco [data-passo]:not([data-revelado]) {
  visibility: hidden;
}
```

- [ ] **Step 7: Iniciar o motor na entrada**

Substituir o conteúdo de `montar/navegador.js` por:

```js
// Entrada do modo navegador em desenvolvimento, importada por montar/carregador.js (spec 3.2).
// No marco 5, dist/aula-usp.js embute CSS, fontes e marcas; aqui tudo vem por URL.
import { montar } from './montar.js';
import { iniciarMotor } from '../motor/motor.js';

const BASE = new URL('../', import.meta.url);
const ESTILOS = ['estilos/tokens.css', 'estilos/fontes.css', 'estilos/base.css', 'estilos/layouts.css', 'estilos/motor.css'];

function carregarEstilo(caminho) {
  return new Promise((pronto, falha) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(caminho, BASE).href;
    link.addEventListener('load', pronto, { once: true });
    link.addEventListener('error', () => falha(new Error(`não carregou ${caminho}`)), { once: true });
    document.head.append(link);
  });
}

async function lerJson(caminho) {
  const resposta = await fetch(new URL(caminho, BASE));
  if (!resposta.ok) throw new Error(`não carregou ${caminho} (HTTP ${resposta.status})`);
  return resposta.json();
}

function documentoLido() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((pronto) => document.addEventListener('DOMContentLoaded', pronto, { once: true }));
}

try {
  await documentoLido();
  const [unidades, usp, contrato] = await Promise.all([
    lerJson('assets/marcas/unidades.json'),
    lerJson('assets/marcas/usp.json'),
    lerJson('contrato/contrato.json'),
    ...ESTILOS.map(carregarEstilo),
  ]);
  const resumo = montar(document, {
    unidades,
    usp,
    urlMarcas: new URL('assets/marcas', BASE).href,
    limites: { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] },
  });
  if (new URLSearchParams(location.search).has('folha')) document.body.classList.add('folha');
  else iniciarMotor({ doc: document, janela: window, resumo });
  void document.body.offsetHeight; // força o layout, que pede as fontes usadas, antes de esperar por elas
  await document.fonts.ready;
  document.body.dataset.montado = 'sim';
} catch (erro) {
  document.body.dataset.montado = 'erro';
  const aviso = document.createElement('pre');
  aviso.className = 'painel';
  aviso.textContent = `Aula USP: ${erro.message}`;
  document.body.prepend(aviso);
  console.error(erro);
} finally {
  document.querySelector('style[data-aula-usp="ocultar"]')?.remove();
}
```

- [ ] **Step 8: Registrar as classes do motor no contrato**

Em `contrato/contrato.json`, a linha de `classesDoSistema` passa a ser (acréscimo de `"ativo"`, `"folha"` e `"modo-palco"` no fim; nada mais muda no arquivo):

```json
  "classesDoSistema": ["palco", "slide", "area", "cabecalho", "rotulo", "mapa", "quadrado", "visto", "atual", "futuro", "contador", "rodape", "metadados-capa", "roteiro", "faixa-de-marca", "marca-unidade", "marca-usp", "numero-bloco", "fileira", "nome-curto", "bloco-n-de-m", "painel", "ativo", "folha", "modo-palco"],
```

- [ ] **Step 9: Rodar os testes**

Run: `npm run test:integracao`
Expected: PASS nos 23 testes (13 anteriores + 10 do motor).

Run: `npm test`
Expected: PASS nos 97 testes unitários.

- [ ] **Step 10: Commit**

```bash
git add motor/motor.js estilos/motor.css montar/navegador.js contrato/contrato.json especime/index.html tests/integracao/layouts.test.mjs tests/integracao/motor.test.mjs
git commit -m "feat(motor): palco escalado, teclado, passos, cliques e endereço

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 4: Painéis de notas, visão geral e ajuda

**Files:**
- Create: `motor/dom.js`, `motor/paineis.js`
- Modify: `montar/cromo.js`, `estilos/motor.css`, `montar/navegador.js`, `contrato/contrato.json`
- Test: `tests/unit/dom.test.mjs`, `tests/integracao/paineis.test.mjs`

**Interfaces:**
- Consumes: o objeto `motor` de `iniciarMotor` (Task 3): `doc`, `rot`, `resumo`, `slides`, `estado()`, `irPara`, `aoMudar`, `definirAcao`, `reservarDireita`; `textoDeTitulo` e `estadosDosQuadrados` (`montar/blocos.js`); `doisDigitos` (`montar/cromo.js`); os rótulos da Task 1.
- Produces (usado pelo marco 2c):
  - `motor/dom.js`: `elemento(doc, tag, classe?, texto?) → Element` (o mesmo de `montar/cromo.js`, que passa a importá-lo) e `clonarSemIds(no: Node) → Node`;
  - `instalarPaineis(motor) → { abrir(nome), fechar(), aberto() → nome | null }`, com `nome` em `'notas' | 'visao-geral' | 'ajuda'`; registra as ações `notas`, `ajuda` e `escape`;
  - DOM: `div.painel[data-painel][tabindex="-1"]`, com `hidden` quando fechado, contendo `h2.painel-titulo` e `div.painel-corpo`; na visão geral, `div.grupo > h3.grupo-titulo + div.cartoes > button.cartao[data-indice]` (com `aria-current="true"` no slide atual) contendo `span.quadrado.<estado>` (fora da introdução), `span.cartao-numero` e `span.cartao-titulo`; na ajuda, `table.teclas`.

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/unit/dom.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { elemento, clonarSemIds } from '../../motor/dom.js';

const { document } = parseHTML('<!DOCTYPE html><html><body></body></html>');

test('elemento cria a tag com classe e texto opcionais', () => {
  const span = elemento(document, 'span', 'rotulo', 'Introdução');
  assert.equal(span.outerHTML, '<span class="rotulo">Introdução</span>');
  assert.equal(elemento(document, 'tr').outerHTML, '<tr></tr>');
});

test('clonarSemIds copia a subárvore sem nenhum id, sem mexer no original, e aceita nós de texto', () => {
  const original = parseHTML('<!DOCTYPE html><html><body><div id="a"><p id="b">x <svg><marker id="c"></marker></svg></p></div></body></html>')
    .document.getElementById('a');
  const copia = clonarSemIds(original);
  assert.equal(copia.querySelectorAll('[id]').length, 0);
  assert.equal(copia.hasAttribute('id'), false);
  assert.equal(copia.textContent, original.textContent);
  assert.equal(original.querySelectorAll('[id]').length, 2);
  assert.equal(clonarSemIds(document.createTextNode('texto')).nodeValue, 'texto');
});
```

Criar `tests/integracao/paineis.test.mjs`:

```js
// Painéis do motor no Chrome (spec 6.5): notas (N), visão geral (Esc) e ajuda (?).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RAIZ, iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));

let servidor;
let navegador;

before(async () => {
  servidor = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

const abrir = (caminho, opcoes) => abrirAula(navegador, `${servidor.endereco}/${caminho}`, opcoes);

function painel(pagina, nome) {
  return pagina.evaluate((qual) => {
    const elemento = document.querySelector(`[data-painel="${qual}"]`);
    const { x, width } = elemento.getBoundingClientRect();
    return {
      visivel: !elemento.hidden,
      x,
      largura: width,
      titulo: elemento.querySelector('.painel-titulo').textContent,
      corpo: elemento.querySelector('.painel-corpo').textContent.trim(),
    };
  }, nome);
}

function larguraDoPalco(pagina) {
  return pagina.evaluate(() => document.querySelector('.palco').getBoundingClientRect().width);
}

test('N abre as notas à direita, com 380 px; o palco cabe no que sobra; as notas acompanham a navegação', async () => {
  const { pagina, erros } = await abrir('index.html#o-que-mostra', { largura: 1600, altura: 900 });
  await pagina.keyboard.press('n');
  assert.deepEqual(await painel(pagina, 'notas'), {
    visivel: true, x: 1220, largura: 380, titulo: 'Notas', corpo: 'Estas notas não aparecem no slide.',
  });
  const palco = await pagina.evaluate(() => {
    const { x, y, width, height } = document.querySelector('.palco').getBoundingClientRect();
    return { x, y, largura: width, altura: height };
  });
  assert.deepEqual(palco, { x: 0, y: 106.875, largura: 1220, altura: 686.25 });
  await pagina.keyboard.press('ArrowRight');
  await pagina.keyboard.press('ArrowRight');
  await pagina.keyboard.press('ArrowRight');
  assert.equal((await painel(pagina, 'notas')).corpo, 'Este slide não tem notas.');
  await pagina.keyboard.press('N');
  assert.equal((await painel(pagina, 'notas')).visivel, false);
  assert.equal(await larguraDoPalco(pagina), 1600);
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('Esc abre a visão geral: cartões agrupados por bloco, com número, título e quadrado; clicar navega e fecha', async () => {
  const { pagina } = await abrir('index.html#grade-8-4');
  await pagina.keyboard.press('Escape');
  const visao = await pagina.evaluate(() => {
    const raiz = document.querySelector('[data-painel="visao-geral"]');
    return {
      visivel: !raiz.hidden,
      grupos: [...raiz.querySelectorAll('.grupo-titulo')].map((titulo) => titulo.textContent),
      cartoes: raiz.querySelectorAll('.cartao').length,
      atual: raiz.querySelector('.cartao[aria-current="true"] .cartao-titulo').textContent,
      quadrados: [...raiz.querySelectorAll('.grupo')].map((grupo) => grupo.querySelector('.quadrado')?.className ?? null),
    };
  });
  assert.deepEqual(visao, {
    visivel: true,
    grupos: ['Introdução', '01 · Blocos', '02 · Figuras e demos', '03 · Grades'],
    cartoes: 13,
    atual: 'Grade 8-4 texto largo e coluna estreita',
    quadrados: [null, 'quadrado atual', 'quadrado futuro', 'quadrado futuro'],
  });
  await pagina.locator('[data-painel="visao-geral"] .cartao', { hasText: 'Grade 6-6' }).click();
  assert.equal(await pagina.evaluate(() => location.hash), '#grade-6-6');
  assert.equal((await painel(pagina, 'visao-geral')).visivel, false);
  await pagina.close();
});

test('? abre a ajuda com a tabela de teclas; Esc fecha o painel aberto e, sem painel, abre a visão geral', async () => {
  const { pagina } = await abrir('index.html');
  await pagina.keyboard.press('?');
  const ajuda = await pagina.evaluate(() => {
    const raiz = document.querySelector('[data-painel="ajuda"]');
    return {
      visivel: !raiz.hidden,
      cabecalho: [...raiz.querySelectorAll('thead th')].map((celula) => celula.textContent),
      linhas: raiz.querySelectorAll('tbody tr').length,
      primeira: raiz.querySelector('tbody th').textContent,
    };
  });
  assert.deepEqual(ajuda, { visivel: true, cabecalho: ['Tecla', 'Ação'], linhas: 10, primeira: '→, espaço, PageDown' });
  await pagina.keyboard.press('Escape');
  assert.equal((await painel(pagina, 'ajuda')).visivel, false);
  await pagina.keyboard.press('Escape');
  assert.equal((await painel(pagina, 'visao-geral')).visivel, true);
  await pagina.keyboard.press('Escape');
  assert.equal((await painel(pagina, 'visao-geral')).visivel, false);
  await pagina.close();
});

test('um painel por vez: abrir a ajuda fecha as notas e devolve a largura ao palco', async () => {
  const { pagina } = await abrir('index.html', { largura: 1600, altura: 900 });
  await pagina.keyboard.press('n');
  await pagina.keyboard.press('?');
  assert.equal((await painel(pagina, 'notas')).visivel, false);
  assert.equal((await painel(pagina, 'ajuda')).visivel, true);
  assert.equal(await larguraDoPalco(pagina), 1600);
  await pagina.close();
});

test('painéis em inglês numa aula com lang="en"', async () => {
  const { pagina } = await abrir('ifusp.html');
  await pagina.keyboard.press('n');
  assert.deepEqual(await painel(pagina, 'notas'), {
    visivel: true, x: 1020, largura: 380, titulo: 'Notes', corpo: 'This slide has no notes.',
  });
  await pagina.keyboard.press('?');
  const ajuda = await painel(pagina, 'ajuda');
  assert.equal(ajuda.titulo, 'Help');
  assert.ok(ajuda.corpo.startsWith('KeyAction'), ajuda.corpo);
  await pagina.close();
});

test('com os painéis abertos, toda classe do documento continua no contrato', async () => {
  const { pagina } = await abrir('index.html#grade-8-4');
  await pagina.keyboard.press('Escape');
  const classes = await pagina.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .flatMap((elemento) => [...elemento.classList]))]);
  const conhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);
  assert.deepEqual(classes.filter((nome) => !conhecidas.has(nome)), []);
  await pagina.close();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/dom.test.mjs`
Expected: FAIL com `Cannot find module '.../motor/dom.js'`.

Run: `node --test tests/integracao/paineis.test.mjs`
Expected: FAIL em 5 dos 6 testes, com `page.evaluate: TypeError: Cannot read properties of null`, porque ainda não existe `[data-painel]`. O teste de classes já passa, porque sem painéis a tecla Esc não cria nenhum elemento.

- [ ] **Step 3: Criar `motor/dom.js`**

```js
// Utilitários de DOM compartilhados por montar/ e motor/. Só API padrão do DOM.

export function elemento(doc, tag, classe, texto) {
  const el = doc.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function clonarSemIds(no) {
  const copia = no.cloneNode(true);
  if (copia.nodeType === 1) {
    copia.removeAttribute('id');
    for (const comId of copia.querySelectorAll('[id]')) comId.removeAttribute('id');
  }
  return copia;
}
```

- [ ] **Step 4: Fazer `montar/cromo.js` usar o `elemento` compartilhado**

No topo de `montar/cromo.js`, trocar

```js
// Elementos gerados pelo sistema (spec 5.3 e 5.4). Só API padrão do DOM.

export const doisDigitos = (numero) => String(numero).padStart(2, '0');

function elemento(doc, tag, classe, texto) {
  const el = doc.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}
```

por

```js
// Elementos gerados pelo sistema (spec 5.3 e 5.4). Só API padrão do DOM.
import { elemento } from '../motor/dom.js';

export const doisDigitos = (numero) => String(numero).padStart(2, '0');
```

Run: `npm test`
Expected: PASS nos 99 testes (97 + 2 de `dom`); os de `montar` continuam passando com o `elemento` importado.

- [ ] **Step 5: Criar `motor/paineis.js`**

```js
// Painéis do motor (spec 6.5): notas (N), visão geral (Esc) e ajuda (?), fora do palco.
import { elemento, clonarSemIds } from './dom.js';
import { textoDeTitulo, estadosDosQuadrados } from '../montar/blocos.js';
import { doisDigitos } from '../montar/cromo.js';

const LARGURA_DAS_NOTAS = 380;

function criarPainel(doc, nome, titulo) {
  const painel = elemento(doc, 'div', 'painel');
  painel.setAttribute('data-painel', nome);
  painel.setAttribute('tabindex', '-1');
  painel.hidden = true;
  const corpo = elemento(doc, 'div', 'painel-corpo');
  painel.append(elemento(doc, 'h2', 'painel-titulo', titulo), corpo);
  doc.body.append(painel);
  return { painel, corpo };
}

function preencherNotas(doc, corpo, slide, rot) {
  const notas = slide.querySelector(':scope > aside.notas');
  if (notas) corpo.replaceChildren(...[...notas.childNodes].map(clonarSemIds));
  else corpo.replaceChildren(elemento(doc, 'p', null, rot.semNotas));
}

function tituloDoSlide(slide) {
  return textoDeTitulo(slide.querySelector('.area h1, .area h2, .area p.afirmacao')) || slide.id;
}

function preencherVisaoGeral(doc, corpo, motor) {
  const { slides, resumo, rot } = motor;
  const atual = motor.estado().indice;
  const slideAtual = slides[atual];
  const estados = estadosDosQuadrados(resumo.blocos.length, Number(slideAtual.getAttribute('data-bloco')) || null, {
    encerramento: slideAtual.getAttribute('data-layout') === 'encerramento',
  });
  corpo.replaceChildren();
  let grupo = null;
  slides.forEach((slide, indice) => {
    const numero = Number(slide.getAttribute('data-bloco')) || 0;
    if (!grupo || grupo.numero !== numero) {
      const titulo = numero ? `${doisDigitos(numero)} · ${resumo.blocos[numero - 1].titulo}` : rot.introducao;
      const cartoes = elemento(doc, 'div', 'cartoes');
      const bloco = elemento(doc, 'div', 'grupo');
      bloco.append(elemento(doc, 'h3', 'grupo-titulo', titulo), cartoes);
      corpo.append(bloco);
      grupo = { numero, cartoes };
    }
    const cartao = elemento(doc, 'button', 'cartao');
    cartao.type = 'button';
    cartao.setAttribute('data-indice', String(indice));
    if (indice === atual) cartao.setAttribute('aria-current', 'true');
    if (numero) cartao.append(elemento(doc, 'span', `quadrado ${estados[numero - 1]}`));
    cartao.append(elemento(doc, 'span', 'cartao-numero', String(indice + 1)), elemento(doc, 'span', 'cartao-titulo', tituloDoSlide(slide)));
    grupo.cartoes.append(cartao);
  });
}

function preencherAjuda(doc, corpo, rot) {
  const linhaDoCabecalho = elemento(doc, 'tr');
  for (const texto of [rot.tecla, rot.acao]) {
    const celula = elemento(doc, 'th', null, texto);
    celula.setAttribute('scope', 'col');
    linhaDoCabecalho.append(celula);
  }
  const cabecalho = elemento(doc, 'thead');
  cabecalho.append(linhaDoCabecalho);
  const linhas = elemento(doc, 'tbody');
  for (const [tecla, acao] of rot.teclas) {
    const celula = elemento(doc, 'th', null, tecla);
    celula.setAttribute('scope', 'row');
    const linha = elemento(doc, 'tr');
    linha.append(celula, elemento(doc, 'td', null, acao));
    linhas.append(linha);
  }
  const tabela = elemento(doc, 'table', 'teclas');
  tabela.append(cabecalho, linhas);
  corpo.replaceChildren(tabela);
}

export function instalarPaineis(motor) {
  const { doc, rot } = motor;
  const paineis = {
    notas: criarPainel(doc, 'notas', rot.notas),
    'visao-geral': criarPainel(doc, 'visao-geral', rot.visaoGeral),
    ajuda: criarPainel(doc, 'ajuda', rot.ajuda),
  };
  preencherAjuda(doc, paineis.ajuda.corpo, rot);
  let aberto = null;

  function atualizar() {
    if (aberto === 'notas') preencherNotas(doc, paineis.notas.corpo, motor.slides[motor.estado().indice], rot);
    if (aberto === 'visao-geral') preencherVisaoGeral(doc, paineis['visao-geral'].corpo, motor);
  }

  function fechar() {
    if (!aberto) return;
    paineis[aberto].painel.hidden = true;
    if (aberto === 'notas') motor.reservarDireita(0);
    aberto = null;
  }

  function abrir(nome) {
    fechar();
    aberto = nome;
    atualizar();
    paineis[nome].painel.hidden = false;
    if (nome === 'notas') motor.reservarDireita(LARGURA_DAS_NOTAS);
    else paineis[nome].painel.focus();
  }

  const alternar = (nome) => (aberto === nome ? fechar() : abrir(nome));
  motor.definirAcao('notas', () => alternar('notas'));
  motor.definirAcao('ajuda', () => alternar('ajuda'));
  motor.definirAcao('escape', () => (aberto ? fechar() : abrir('visao-geral')));
  motor.aoMudar(atualizar);

  paineis['visao-geral'].corpo.addEventListener('click', (evento) => {
    const cartao = evento.target.closest('button.cartao');
    if (!cartao) return;
    fechar();
    motor.irPara({ indice: Number(cartao.getAttribute('data-indice')), passo: 0 });
  });

  return { abrir, fechar, aberto: () => aberto };
}
```

- [ ] **Step 6: Acrescentar os estilos dos painéis**

Substituir o conteúdo de `estilos/motor.css` por (a primeira parte é a da Task 3, sem mudança):

```css
/* Motor (spec 6.1 e 6.4): palco escalado no centro da janela, um slide por vez, passos ocultos sem mover nada. */

body.modo-palco {
  height: 100vh;
  overflow: hidden;
}

.palco {
  --escala: 1;
  --centro-x: 50vw;
  position: fixed;
  left: var(--centro-x);
  top: 50%;
  width: var(--palco-largura);
  height: var(--palco-altura);
  transform: translate(-50%, -50%) scale(var(--escala));
}

.palco > .slide {
  display: none;
  position: absolute;
  inset: 0;
}

.palco > .slide.ativo {
  display: block;
}

.palco [data-passo]:not([data-revelado]) {
  visibility: hidden;
}

/* Painéis (spec 6.5): fora do palco, sem escala; notas à direita, visão geral e ajuda na janela inteira. */

[data-painel] {
  position: fixed;
  z-index: 1;
  overflow: auto;
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font-family: var(--fonte-sans);
}

[data-painel][hidden] {
  display: none;
}

[data-painel]:focus {
  outline: none;
}

.painel-titulo {
  margin-bottom: var(--espaco-3);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  line-height: var(--tipo-rotulo-entrelinha);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

[data-painel="notas"] {
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  padding: var(--espaco-3);
  border-left: var(--regua-normal) solid var(--cor-linha);
  font-size: 20px;
  line-height: 1.4;
}

[data-painel="notas"] .painel-corpo > * + * {
  margin-top: var(--espaco-2);
}

[data-painel="visao-geral"],
[data-painel="ajuda"] {
  inset: 0;
  padding: var(--espaco-5) var(--espaco-6);
}

.grupo + .grupo {
  margin-top: var(--espaco-4);
}

.grupo-titulo {
  margin: 0 0 var(--espaco-2);
  font-size: 20px;
  font-weight: var(--tipo-titulo-peso);
}

.cartoes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--espaco-2);
}

.cartao {
  display: grid;
  grid-template-columns: auto 1fr;
  align-content: start;
  align-items: center;
  gap: var(--espaco-1);
  padding: var(--espaco-2);
  border: var(--regua-normal) solid var(--cor-linha);
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font: inherit;
  font-size: 18px;
  text-align: left;
  cursor: pointer;
}

.cartao[aria-current="true"] {
  border-color: var(--cor-tinta);
}

.cartao .quadrado {
  width: var(--mapa-quadrado-cabecalho);
  height: var(--mapa-quadrado-cabecalho);
}

.cartao-numero {
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  letter-spacing: var(--tipo-rotulo-tracking);
  color: var(--cor-cinza);
}

.cartao-titulo {
  grid-column: 1 / -1;
}

.teclas {
  border-collapse: collapse;
  font-size: 20px;
}

.teclas th,
.teclas td {
  padding: var(--espaco-1) var(--espaco-3) var(--espaco-1) 0;
  border-bottom: var(--regua-fina) solid var(--cor-linha);
  text-align: left;
  vertical-align: top;
}

.teclas tbody th {
  font-family: var(--tipo-codigo-familia);
  font-weight: var(--tipo-codigo-peso-enfase);
  white-space: nowrap;
}
```

- [ ] **Step 7: Instalar os painéis na entrada**

Substituir o conteúdo de `montar/navegador.js` por:

```js
// Entrada do modo navegador em desenvolvimento, importada por montar/carregador.js (spec 3.2).
// No marco 5, dist/aula-usp.js embute CSS, fontes e marcas; aqui tudo vem por URL.
import { montar } from './montar.js';
import { iniciarMotor } from '../motor/motor.js';
import { instalarPaineis } from '../motor/paineis.js';

const BASE = new URL('../', import.meta.url);
const ESTILOS = ['estilos/tokens.css', 'estilos/fontes.css', 'estilos/base.css', 'estilos/layouts.css', 'estilos/motor.css'];

function carregarEstilo(caminho) {
  return new Promise((pronto, falha) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(caminho, BASE).href;
    link.addEventListener('load', pronto, { once: true });
    link.addEventListener('error', () => falha(new Error(`não carregou ${caminho}`)), { once: true });
    document.head.append(link);
  });
}

async function lerJson(caminho) {
  const resposta = await fetch(new URL(caminho, BASE));
  if (!resposta.ok) throw new Error(`não carregou ${caminho} (HTTP ${resposta.status})`);
  return resposta.json();
}

function documentoLido() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((pronto) => document.addEventListener('DOMContentLoaded', pronto, { once: true }));
}

try {
  await documentoLido();
  const [unidades, usp, contrato] = await Promise.all([
    lerJson('assets/marcas/unidades.json'),
    lerJson('assets/marcas/usp.json'),
    lerJson('contrato/contrato.json'),
    ...ESTILOS.map(carregarEstilo),
  ]);
  const resumo = montar(document, {
    unidades,
    usp,
    urlMarcas: new URL('assets/marcas', BASE).href,
    limites: { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] },
  });
  if (new URLSearchParams(location.search).has('folha')) document.body.classList.add('folha');
  else instalarPaineis(iniciarMotor({ doc: document, janela: window, resumo }));
  void document.body.offsetHeight; // força o layout, que pede as fontes usadas, antes de esperar por elas
  await document.fonts.ready;
  document.body.dataset.montado = 'sim';
} catch (erro) {
  document.body.dataset.montado = 'erro';
  const aviso = document.createElement('pre');
  aviso.className = 'painel';
  aviso.textContent = `Aula USP: ${erro.message}`;
  document.body.prepend(aviso);
  console.error(erro);
} finally {
  document.querySelector('style[data-aula-usp="ocultar"]')?.remove();
}
```

- [ ] **Step 8: Registrar as classes dos painéis no contrato**

Em `contrato/contrato.json`, a linha de `classesDoSistema` passa a ser (acréscimo das classes dos painéis no fim; nada mais muda no arquivo):

```json
  "classesDoSistema": ["palco", "slide", "area", "cabecalho", "rotulo", "mapa", "quadrado", "visto", "atual", "futuro", "contador", "rodape", "metadados-capa", "roteiro", "faixa-de-marca", "marca-unidade", "marca-usp", "numero-bloco", "fileira", "nome-curto", "bloco-n-de-m", "painel", "ativo", "folha", "modo-palco", "painel-titulo", "painel-corpo", "grupo", "grupo-titulo", "cartoes", "cartao", "cartao-numero", "cartao-titulo", "teclas"],
```

- [ ] **Step 9: Rodar os testes**

Run: `npm run test:integracao`
Expected: PASS nos 29 testes (23 anteriores + 6 dos painéis).

Run: `npm test`
Expected: PASS nos 99 testes unitários.

- [ ] **Step 10: Conferir no navegador**

Run: `npm run servir -- especime` e abrir `http://127.0.0.1:8765/`. Conferir, e descrever no relatório qualquer diferença:
- → e ← passam slides e passos, e a barra de endereço acompanha (`#o-que-mostra/1`);
- N abre as notas à direita, e o palco encolhe para caber ao lado;
- Esc abre a visão geral, com os cartões alinhados pelo topo dentro de cada linha e o cartão atual com contorno em tinta; clicar num cartão leva ao slide;
- ? abre a ajuda, e Esc fecha.

Encerrar o servidor com Ctrl+C.

- [ ] **Step 11: Commit**

```bash
git add motor/dom.js motor/paineis.js montar/cromo.js estilos/motor.css montar/navegador.js contrato/contrato.json tests/unit/dom.test.mjs tests/integracao/paineis.test.mjs
git commit -m "feat(motor): painéis de notas, visão geral e ajuda

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
