# Aula USP · Marco 2c (Demos, apresentador e impressão) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o motor: demos com ciclo de vida preso à navegação, janela do apresentador com miniaturas fiéis e sincronia nos dois sentidos, e impressão que vira PDF de uma página por slide ou por estado.

**Architecture:** `motor/demos.js` transforma a fila de `AulaUSP.demo` do carregador num registro e liga `montar`, `iniciar` e `parar` às mudanças de slide. `motor/copias.js` copia um slide com ids únicos e referências internas reescritas, e é a base tanto das miniaturas do apresentador quanto das cópias por estado da impressão. `motor/apresentador.js` monta a segunda janela (miniaturas, notas, cronômetro, relógio, posição e mapa) e fala com a janela da aula por `motor/sincronia.js`, um canal `postMessage` que valida tipo, origem e formato. `motor/impressao.js` prepara e desfaz o documento para impressão, com `estilos/impressao.css` cuidando de `@page` e do que some no papel.

**Tech Stack:** Node 20+ (máquina do autor: v25.6.1), ES modules, `node:test`; `linkedom` e `playwright-core`, já em `devDependencies`; Google Chrome instalado (ou `CHROME_PATH`), usado também para gerar um PDF no teste.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 5.5, 6.6, 6.7, 6.9, 8.4 e 11.2). Estado de partida: marco 2b na `main` (`d812cbd`), com palco, navegação, passos, endereço e painéis; 101 testes unitários e 31 de integração.

## Global Constraints

- Node 20 ou superior; ES modules; testes com `node:test` e `node:assert/strict`; sem Python.
- `montar/` e `motor/` não importam nada de Node: só API padrão do DOM, para rodar no navegador (spec 3.5).
- Nomes de arquivos, pastas, classes, atributos e identificadores em português.
- Toda classe gerada pelo sistema está em `contrato.classesDoSistema`; classes do autor nunca são geradas pelo sistema. O conteúdo que uma demo cria dentro da sua `div.demo` fica fora do contrato de vocabulário (spec 5.5).
- Demos (spec 6.7): `AulaUSP.demo(nome, { montar, iniciar, parar, capturar })`; `montar` roda uma vez, na primeira entrada no slide, com `opcoes` lido de `data-opcoes`; `iniciar` e `parar`, a cada entrada e saída; nenhuma demo roda com o slide fora da tela; a imagem da demo no PDF vem de `img.estatico` ou de `capturar()`; sem as duas, o PDF mostra um quadro com "Demo interativa: abra o HTML".
- Scripts de demos ficam fora das `section` (spec 5.5): no modo navegador, um `<script>` inline só com registros `AulaUSP.demo(...)`.
- Apresentador (spec 6.6): a tecla P abre, com `window.open`, o mesmo documento em modo apresentador, com o slide atual e o próximo estado em miniaturas fiéis, as notas do slide em 24 px, cronômetro (iniciar, pausar, zerar), relógio, "slide 12 / 40 · passo 2 / 3" e o mapa de blocos; as janelas se sincronizam por `postMessage`, o que funciona também com `file://`; navegar em qualquer uma move as duas; se uma for recarregada, a sincronia é refeita por troca de mensagens; se o navegador bloquear a nova janela, o motor abre o painel de notas e explica o bloqueio no próprio painel.
- Impressão (spec 6.9): `AulaUSP.prepararImpressao()` revela todos os passos ou, nos slides com `data-pdf="passos"`, gera uma cópia do slide para cada estado, do estado sem passos revelados até o último; troca as demos pela imagem estática e esconde painéis; `AulaUSP.restaurarImpressao()` desfaz tudo; no navegador, o motor chama as duas nos eventos `beforeprint` e `afterprint`. Número de páginas esperado: 1 por slide, mais, em cada slide com `data-pdf="passos"`, o número de passos desse slide.
- CSS de impressão (spec 8.4): `@page { size: 1280px 720px; margin: 0 }`, um slide ou estado por página, e sem notas, painéis, faixas de clique ou cursor.
- Textos do sistema em `pt-BR` e `en`, escolhidos pelo `lang` da aula (spec 6.8).
- Cores só pelos tokens; sem sombras, gradientes, transparências ou cantos arredondados (spec 4.2), inclusive nos painéis e na janela do apresentador.
- Nenhuma dependência nova.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Decisões deste marco (conferidas no Chrome 152 antes de escrever o plano; o autor pode revê-las)

- **Teclas com o foco numa demo (mudança de comportamento do M2b):** a spec 6.2 diz que "as teclas são ignoradas quando o foco está num controle de demo". O M2b tomou isso ao pé da letra e ignorava qualquer tecla com o foco dentro de `div.demo` — na prática, depois de clicar num botão da demo, o passador de slides parava de funcionar até o apresentador clicar fora. Aqui a regra passa a valer para campos de texto (`input`, `select`, `textarea`, `contenteditable`) e para o espaço num botão focado; as teclas de navegação voltam a funcionar. Uma demo que queira capturar setas pode chamar `evento.stopPropagation()`.
- **Cópias de slides:** `copiarSlide` põe sufixo nos ids e reescreve as referências internas (`url(#…)`, `href="#…"`, `clip-path`), em vez de apagar os ids. A revisão final do M2b mostrou que apagar ids faz sumir marcadores de SVG na cópia quando o slide original está escondido.
- **Modo apresentador pela URL:** `?apresentador=1`, preservando o `#id/n` atual, de modo que a segunda janela abre no mesmo ponto e funciona também em `file://`.
- **Sincronia:** a janela do apresentador manda `ola` a cada 2 s para a janela que a abriu, e a aula responde com a posição; assim a sincronia se refaz quando qualquer uma das duas recarrega. Só são aceitas mensagens com `tipo: "aula-usp"`, origem igual à da própria janela (ou `"null"`, que é a origem de `file://`) e índice e passo inteiros.
- **Sem demos na janela do apresentador:** ela não monta demos (spec 6.7: nenhuma demo roda com o slide fora da tela); as miniaturas mostram a imagem estática quando existe.
- **Ordem na impressão:** as demos são trocadas pela imagem antes de as cópias serem feitas, então cada cópia já sai com a imagem no lugar.
- **O que a spec 8.4 manda sumir no papel:** o CSS de impressão esconde notas e painéis; as faixas de clique do marco 2b são zonas calculadas pela posição do clique, não elementos, e cursor não existe no papel, então não há o que esconder nos dois casos.
- **`paginasEsperadas` entra agora:** a spec 11.1 pede o teste de contagem de páginas, e o marco 5 usa a mesma função na regra `saida.pdf-paginas`.
- **Pendências do M2b resolvidas aqui:** `irPara` recusa posição que não seja de inteiros; um erro num ouvinte de navegação não derruba os outros; `abrir(nome)` valida o nome antes de mudar o estado dos painéis; o painel de notas ganha um lugar próprio para avisos; `AltGr` deixa de valer quando a tecla Cmd também está pressionada; o estado inicial passa a ser repassado aos ouvintes, então uma demo no primeiro slide monta sem depender de navegar.

## Roteiro atualizado

| plano | escopo | depende de |
|---|---|---|
| M2a · Montagem e layouts | concluído na `main` | M1 |
| M2b · Motor de apresentação | concluído na `main` (`d812cbd`) | M2a |
| **M2c · Demos, apresentador e impressão (este)** | `AulaUSP.demo` com ciclo de vida, cópias fiéis, janela do apresentador com sincronia, `prepararImpressao`/`restaurarImpressao` e CSS de impressão | M2b |
| M3 · Componentes | campos, exercício, listas, tabela, figura, código (Shiki), matemática (KaTeX, `\passo`) | M2c |
| M4 · Validador | regras estáticas, de carga e de composição, painel (V) | M3 |
| M5 · Build e PDF | embutir, PDF, regras de saída, `dist` com SRI | M4 |
| M6 · Guia e pacotes | guia, modelo, aula-exemplo, pacotes | M5 |
| M7 · Aceite | Claude Code e Codex CLI | M6 |

## Estrutura de arquivos deste marco

| arquivo | responsabilidade |
|---|---|
| `motor/demos.js` | registro de demos vindo da fila do carregador e ciclo de vida por slide |
| `motor/copias.js` | cópia de um slide com ids únicos e referências internas reescritas |
| `motor/sincronia.js` | canal `postMessage` entre a janela da aula e a do apresentador |
| `motor/apresentador.js` | janela do apresentador: miniaturas, notas, cronômetro, relógio, posição e mapa |
| `motor/impressao.js` | preparar e restaurar o documento para impressão; páginas esperadas |
| `motor/motor.js` | posição validada, erro de ouvinte isolado e teclas liberadas fora de campos de texto |
| `motor/paineis.js` | aviso próprio no painel de notas e nome de painel validado |
| `motor/navegacao.js` | tecla P e AltGr sem Cmd |
| `motor/rotulos.js` | textos do apresentador, da impressão e a linha P da ajuda |
| `estilos/motor.css` | janela do apresentador e passos ocultos fora do palco |
| `estilos/impressao.css` | `@page`, uma página por slide ou estado, e o que some no papel |
| `montar/navegador.js` | liga demos, apresentador e impressão, ou entra em modo apresentador |
| `contrato/contrato.json` | classes do apresentador e da impressão em `classesDoSistema` |
| `especime/index.html` | demo registrada com `data-opcoes` e um slide com `data-pdf="passos"` |
| `tests/fixtures/impressao/index.html` | aula com os três casos de demo no PDF e um slide de passos |
| `tests/unit/demos.test.mjs`, `copias.test.mjs`, `sincronia.test.mjs`, `impressao.test.mjs` | testes unitários novos |
| `tests/integracao/demos.test.mjs`, `apresentador.test.mjs`, `impressao.test.mjs` | testes de integração novos |

---

### Task 1: Demos com ciclo de vida

**Files:**
- Create: `motor/demos.js`
- Modify: `motor/motor.js`, `montar/navegador.js`, `especime/index.html`, `tests/fixtures/carregador/index.html`, `tests/integracao/carregador.test.mjs`
- Test: `tests/unit/demos.test.mjs`, `tests/integracao/demos.test.mjs`

**Interfaces:**
- Consumes: `window.AulaUSP = { filaDeDemos: Array<{ nome, definicao }>, demo(nome, definicao) }`, criado por `montar/carregador.js`; o objeto do motor de `iniciarMotor({ doc, janela, resumo })`: `slides`, `estado()`, `aoMudar(ouvinte)`, `janela`; `tests/integracao/utilitarios.mjs` (`iniciarChrome`, `servirPasta`, `abrirAula`).
- Produces (usado pela Task 4):
  - `criarDemos({ api, console }) → { tem(nome) → boolean, montarSeNecessario(raiz) → definicao | null, entrar(slide), sair(slide) }`, que drena `api.filaDeDemos` e troca `api.demo` pelo registro direto;
  - `instalarDemos(motor, api) → demos`, que liga `entrar`/`sair` às mudanças de slide e já monta as demos do slide inicial;
  - `motor.irPara` passa a recusar posição que não seja de inteiros, e um erro num ouvinte de navegação não interrompe os demais.

- [ ] **Step 1: Escrever os testes unitários que falham**

Criar `tests/unit/demos.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { criarDemos } from '../../motor/demos.js';

const slide = (corpo) => parseHTML(`<!DOCTYPE html><html><body><section class="slide"><div class="area">${corpo}</div></section></body></html>`)
  .document.querySelector('section');

function consoleFalso() {
  const erros = [];
  const avisos = [];
  return { erros, avisos, error: (texto) => erros.push(texto), warn: (texto) => avisos.push(texto) };
}

test('a fila do carregador vira registro, e AulaUSP.demo passa a registrar direto', () => {
  const api = { filaDeDemos: [{ nome: 'contador', definicao: {} }], demo() {} };
  const demos = criarDemos({ api, console: consoleFalso() });
  assert.equal(demos.tem('contador'), true);
  assert.equal(api.filaDeDemos.length, 0);
  api.demo('outra', {});
  assert.equal(demos.tem('outra'), true);
});

test('montar roda uma vez com as opções de data-opcoes; iniciar e parar, a cada entrada e saída', () => {
  const chamadas = [];
  const definicao = {
    montar(raiz, opcoes) { chamadas.push(['montar', raiz.getAttribute('data-demo'), opcoes.n]); },
    iniciar() { chamadas.push(['iniciar']); },
    parar() { chamadas.push(['parar']); },
  };
  const demos = criarDemos({ api: { filaDeDemos: [{ nome: 'contador', definicao }] }, console: consoleFalso() });
  const secao = slide('<div class="demo" data-demo="contador" data-opcoes=\'{"n":3}\'></div>');
  demos.entrar(secao);
  demos.sair(secao);
  demos.entrar(secao);
  assert.deepEqual(chamadas, [['montar', 'contador', 3], ['iniciar'], ['parar'], ['iniciar']]);
});

test('data-opcoes inválido vira objeto vazio, com erro no console', () => {
  const registro = consoleFalso();
  let recebidas = null;
  const definicao = { montar(raiz, opcoes) { recebidas = opcoes; } };
  const demos = criarDemos({ api: { filaDeDemos: [{ nome: 'contador', definicao }] }, console: registro });
  demos.entrar(slide('<div class="demo" data-demo="contador" data-opcoes="{isto não é json}"></div>'));
  assert.deepEqual(recebidas, {});
  assert.equal(registro.erros.length, 1);
  assert.match(registro.erros[0], /data-opcoes inválido na demo "contador"/);
});

test('demo sem registro avisa uma vez por entrada e não interrompe a navegação', () => {
  const registro = consoleFalso();
  const demos = criarDemos({ api: { filaDeDemos: [] }, console: registro });
  demos.entrar(slide('<div class="demo" data-demo="ausente"></div>'));
  assert.match(registro.avisos[0], /demo sem registro: "ausente"/);
  assert.equal(registro.erros.length, 0);
});

test('erro dentro de uma demo é registrado e as outras do slide continuam', () => {
  const registro = consoleFalso();
  const chamadas = [];
  const api = {
    filaDeDemos: [
      { nome: 'quebrada', definicao: { iniciar() { throw new Error('falhou'); } } },
      { nome: 'boa', definicao: { iniciar() { chamadas.push('boa'); } } },
    ],
  };
  const demos = criarDemos({ api, console: registro });
  demos.entrar(slide('<div class="demo" data-demo="quebrada"></div><div class="demo" data-demo="boa"></div>'));
  assert.deepEqual(chamadas, ['boa']);
  assert.match(registro.erros[0], /a demo "quebrada" falhou em iniciar/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/demos.test.mjs`
Expected: FAIL com `Cannot find module '.../motor/demos.js'`.

- [ ] **Step 3: Criar `motor/demos.js`**

```js
// Demos (spec 6.7): registro por nome e ciclo de vida montar/iniciar/parar, preso à navegação.

export function criarDemos({ api, console: registro }) {
  const definicoes = new Map();
  const montadas = new WeakSet();

  const registrar = (nome, definicao) => definicoes.set(nome, definicao);
  for (const item of api.filaDeDemos ?? []) registrar(item.nome, item.definicao);
  if (api.filaDeDemos) api.filaDeDemos.length = 0;
  api.demo = registrar;

  const raizes = (slide) => [...slide.querySelectorAll('div.demo[data-demo]')];

  function tentar(nome, etapa, acao) {
    try {
      acao();
    } catch (erro) {
      registro.error(`Aula USP: a demo "${nome}" falhou em ${etapa}.`, erro);
    }
  }

  function opcoes(raiz, nome) {
    const texto = raiz.getAttribute('data-opcoes');
    if (!texto) return {};
    try {
      return JSON.parse(texto);
    } catch (erro) {
      registro.error(`Aula USP: data-opcoes inválido na demo "${nome}".`, erro);
      return {};
    }
  }

  function definicaoDe(raiz) {
    const nome = raiz.getAttribute('data-demo');
    const definicao = definicoes.get(nome);
    if (!definicao) registro.warn(`Aula USP: demo sem registro: "${nome}".`);
    return { nome, definicao };
  }

  function montarSeNecessario(raiz) {
    const { nome, definicao } = definicaoDe(raiz);
    if (!definicao || montadas.has(raiz)) return definicao ?? null;
    montadas.add(raiz);
    tentar(nome, 'montar', () => definicao.montar?.(raiz, opcoes(raiz, nome)));
    return definicao;
  }

  return {
    tem: (nome) => definicoes.has(nome),
    montarSeNecessario,
    entrar(slide) {
      for (const raiz of raizes(slide)) {
        const definicao = montarSeNecessario(raiz);
        if (definicao) tentar(raiz.getAttribute('data-demo'), 'iniciar', () => definicao.iniciar?.());
      }
    },
    sair(slide) {
      for (const raiz of raizes(slide)) {
        if (!montadas.has(raiz)) continue;
        const { nome, definicao } = definicaoDe(raiz);
        if (definicao) tentar(nome, 'parar', () => definicao.parar?.());
      }
    },
  };
}

export function instalarDemos(motor, api) {
  const demos = criarDemos({ api, console: motor.janela.console });
  motor.aoMudar((estado, anterior) => {
    if (anterior && anterior.indice === estado.indice) return;
    if (anterior) demos.sair(motor.slides[anterior.indice]);
    demos.entrar(motor.slides[estado.indice]);
  });
  demos.entrar(motor.slides[motor.estado().indice]);
  return demos;
}
```

- [ ] **Step 4: Rodar os testes unitários**

Run: `npm test`
Expected: PASS em todos (101 do marco 2b + 5 de `demos` = 106).

- [ ] **Step 5: Endurecer o motor e liberar as teclas fora dos campos de texto**

Em `motor/motor.js`, na função `irPara`, trocar

```js
  function irPara(alvo) {
    const indice = Math.max(0, Math.min(slides.length - 1, alvo.indice));
```

por

```js
  function irPara(alvo) {
    if (!Number.isInteger(alvo?.indice) || !Number.isInteger(alvo?.passo)) {
      janela.console.warn('Aula USP: posição inválida.', alvo);
      return;
    }
    const indice = Math.max(0, Math.min(slides.length - 1, alvo.indice));
```

no fim da mesma função, trocar

```js
    for (const ouvinte of ouvintes) ouvinte(estado, anterior);
```

por

```js
    for (const ouvinte of ouvintes) {
      try {
        ouvinte(estado, anterior);
      } catch (erro) {
        janela.console.error('Aula USP: um ouvinte de navegação falhou.', erro);
      }
    }
```

e, no ouvinte de `keydown`, trocar

```js
    if (alvo?.closest?.(`.demo, ${CONTROLES}`)) return;
```

por

```js
    if (alvo?.closest?.(CONTROLES)) return;
```

(a linha seguinte, que devolve o espaço ao botão focado, não muda).

- [ ] **Step 6: Ligar as demos na entrada**

Substituir o conteúdo de `montar/navegador.js` por:

```js
// Entrada do modo navegador em desenvolvimento, importada por montar/carregador.js (spec 3.2).
// No marco 5, dist/aula-usp.js embute CSS, fontes e marcas; aqui tudo vem por URL.
import { montar } from './montar.js';
import { iniciarMotor } from '../motor/motor.js';
import { instalarPaineis } from '../motor/paineis.js';
import { instalarDemos } from '../motor/demos.js';

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
  else {
    const api = window.AulaUSP ?? (window.AulaUSP = {});
    const motor = iniciarMotor({ doc: document, janela: window, resumo });
    instalarPaineis(motor);
    instalarDemos(motor, api);
  }
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

- [ ] **Step 7: Registrar uma demo no espécime**

Em `especime/index.html`, trocar

```html
  <div class="demo" data-demo="contador">
```

por

```html
  <div class="demo" data-demo="contador" data-opcoes='{"passo": 5}'>
```

e, logo antes de `</body>`, acrescentar o script de registro (fica fora das `section`, como manda a spec 5.5):

```html
<script>
AulaUSP.demo('contador', {
  montar(raiz, opcoes) {
    this.passo = opcoes.passo ?? 1;
    this.valor = 0;
    this.saida = document.createElement('output');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'somar';
    botao.addEventListener('click', () => {
      this.valor += this.passo;
      this.mostrar();
    });
    raiz.append(botao, this.saida);
    this.mostrar();
  },
  mostrar() {
    this.saida.textContent = String(this.valor);
  },
  iniciar() {
    this.entradas = (this.entradas ?? 0) + 1;
    this.saida.dataset.entradas = String(this.entradas);
    delete this.saida.dataset.parado;
  },
  parar() {
    this.saida.dataset.parado = 'sim';
  },
});
</script>
```

- [ ] **Step 8: Ajustar a fixture e o teste do carregador**

A fila agora é drenada na montagem, então o teste passa a conferir que `AulaUSP.demo` existia durante a leitura e que a fila ficou vazia depois.

Em `tests/fixtures/carregador/index.html`, trocar

```html
  window.visibilidadeDuranteALeitura = getComputedStyle(document.body).visibility;
```

por

```html
  window.visibilidadeDuranteALeitura = getComputedStyle(document.body).visibility;
  window.tipoDeDemoNaLeitura = typeof AulaUSP.demo;
```

Em `tests/integracao/carregador.test.mjs`, trocar

```js
    durante: window.visibilidadeDuranteALeitura,
```

por

```js
    durante: window.visibilidadeDuranteALeitura,
    demoNaLeitura: window.tipoDeDemoNaLeitura,
```

trocar

```js
    fila: window.AulaUSP.filaDeDemos.map((registro) => registro.nome),
```

por

```js
    fila: window.AulaUSP.filaDeDemos.length,
```

e trocar

```js
  assert.deepEqual(estado, { durante: 'hidden', depois: 'visible', estiloDeOcultar: 0, fila: ['fixture'] });
```

por

```js
  assert.deepEqual(estado, { durante: 'hidden', demoNaLeitura: 'function', depois: 'visible', estiloDeOcultar: 0, fila: 0 });
```

- [ ] **Step 9: Escrever o teste de integração das demos**

Criar `tests/integracao/demos.test.mjs`:

```js
// Demos no Chrome (spec 6.7): montagem na primeira entrada, iniciar e parar a cada entrada e saída.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

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

const abrir = (caminho) => abrirAula(navegador, `${servidor.endereco}/${caminho}`);

const estadoDaDemo = (pagina) => pagina.evaluate(() => {
  const saida = document.querySelector('#demo .demo output');
  return {
    valor: saida?.textContent,
    entradas: saida?.dataset.entradas,
    parado: saida?.dataset.parado,
    botoes: document.querySelectorAll('#demo .demo button').length,
    slide: document.querySelector('.slide.ativo').id,
  };
});

test('a demo monta uma vez na primeira entrada, com as opções de data-opcoes, e segue a navegação', async () => {
  const { pagina, erros } = await abrir('index.html');
  assert.equal(await pagina.evaluate(() => document.querySelector('#demo .demo output')), null);
  await pagina.evaluate(() => { location.hash = '#demo'; });
  await pagina.waitForFunction(() => document.querySelector('#demo .demo output'));
  assert.deepEqual(await estadoDaDemo(pagina), { valor: '0', entradas: '1', parado: undefined, botoes: 1, slide: 'demo' });
  await pagina.locator('#demo .demo button').click();
  assert.equal((await estadoDaDemo(pagina)).valor, '5');
  await pagina.keyboard.press('ArrowRight');
  assert.deepEqual(await estadoDaDemo(pagina), { valor: '5', entradas: '1', parado: 'sim', botoes: 1, slide: 'grades' });
  await pagina.keyboard.press('ArrowLeft');
  assert.deepEqual(await estadoDaDemo(pagina), { valor: '5', entradas: '2', parado: undefined, botoes: 1, slide: 'demo' });
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('a fila do carregador é drenada e AulaUSP.demo continua registrando', async () => {
  const { pagina } = await abrir('index.html');
  assert.deepEqual(await pagina.evaluate(() => [window.AulaUSP.filaDeDemos.length, typeof window.AulaUSP.demo]), [0, 'function']);
  await pagina.close();
});

test('espaço com o foco num controle da demo aciona o controle, sem passar de slide', async () => {
  const { pagina } = await abrir('index.html#demo');
  await pagina.locator('#demo .demo button').focus();
  await pagina.keyboard.press('Space');
  assert.deepEqual(await estadoDaDemo(pagina), { valor: '5', entradas: '1', parado: undefined, botoes: 1, slide: 'demo' });
  await pagina.close();
});

test('data-demo sem registro correspondente só gera aviso no console', async () => {
  const pagina = await navegador.newPage();
  const avisos = [];
  pagina.on('console', (mensagem) => { if (mensagem.type() === 'warning') avisos.push(mensagem.text()); });
  await pagina.goto(`${servidor.endereco}/index.html`);
  await pagina.waitForFunction(() => document.body.dataset.montado === 'sim');
  await pagina.evaluate(() => { document.querySelector('#demo .demo').setAttribute('data-demo', 'ausente'); location.hash = '#demo'; });
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'demo');
  assert.ok(avisos.some((texto) => texto.includes('demo sem registro: "ausente"')), avisos.join('\n'));
  assert.equal(await pagina.evaluate(() => document.querySelector('.slide.ativo').id), 'demo');
  await pagina.close();
});
```

- [ ] **Step 10: Rodar os testes**

Run: `npm run test:integracao`
Expected: PASS nos 35 testes (31 do marco 2b + 4 de `demos`).

Run: `npm test`
Expected: PASS nos 106 testes unitários.

- [ ] **Step 11: Commit**

```bash
git add motor/demos.js motor/motor.js montar/navegador.js especime/index.html tests/fixtures/carregador/index.html tests/unit/demos.test.mjs tests/integracao/demos.test.mjs tests/integracao/carregador.test.mjs
git commit -m "feat(motor): demos com registro e ciclo de vida preso à navegação

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Cópias fiéis de slides

**Files:**
- Create: `motor/copias.js`
- Test: `tests/unit/copias.test.mjs`

**Interfaces:**
- Consumes: nada além da API padrão do DOM.
- Produces (usado pelas tarefas 3 e 4): `copiarSlide(slide: Element, sufixo: string) → Element`, uma cópia em que todo `id` vira `<id>-<sufixo>` e as referências internas (`href="#id"`, `url(#id)` em `clip-path`, `marker-start`, `marker-end`, `fill` e `stroke`) apontam para os novos ids; referências a ids de fora da cópia, como links para outros slides, ficam como estavam.

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/unit/copias.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { copiarSlide } from '../../motor/copias.js';

const slide = (corpo) => parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document.querySelector('section');

test('a cópia leva sufixo no id do slide e nos ids de dentro, sem mexer no original', () => {
  const original = slide('<section class="slide" id="figura"><div class="area"><p id="nota">a</p></div></section>');
  const copia = copiarSlide(original, 'p1');
  assert.equal(copia.getAttribute('id'), 'figura-p1');
  assert.equal(copia.querySelector('p').getAttribute('id'), 'nota-p1');
  assert.equal(original.getAttribute('id'), 'figura');
  assert.equal(original.querySelector('p').getAttribute('id'), 'nota');
});

test('referências internas de SVG passam a apontar para a cópia', () => {
  const original = slide(`<section class="slide" id="fig"><div class="area"><figure><svg viewBox="0 0 10 10">
    <defs><marker id="seta"></marker><clipPath id="corte"></clipPath></defs>
    <line marker-end="url(#seta)" clip-path="url('#corte')"></line>
    <use href="#seta"></use>
  </svg></figure></div></section>`);
  const copia = copiarSlide(original, 'p2');
  assert.equal(copia.querySelector('line').getAttribute('marker-end'), 'url(#seta-p2)');
  assert.equal(copia.querySelector('line').getAttribute('clip-path'), "url('#corte-p2')");
  assert.equal(copia.querySelector('use').getAttribute('href'), '#seta-p2');
  assert.equal(original.querySelector('line').getAttribute('marker-end'), 'url(#seta)');
});

test('links para outros slides e cores continuam como estavam', () => {
  const original = slide(`<section class="slide" id="mapa"><div class="area">
    <a href="#outro">outro</a><a href="https://usp.br">externo</a>
    <svg viewBox="0 0 10 10"><rect id="quadro" fill="#0A0A0A" stroke="none"></rect></svg>
  </div></section>`);
  const copia = copiarSlide(original, 'p3');
  assert.equal(copia.querySelector('a').getAttribute('href'), '#outro');
  assert.equal(copia.querySelectorAll('a')[1].getAttribute('href'), 'https://usp.br');
  assert.equal(copia.querySelector('rect').getAttribute('fill'), '#0A0A0A');
  assert.equal(copia.querySelector('rect').getAttribute('id'), 'quadro-p3');
});

test('um slide sem ids nenhum é copiado como está', () => {
  const original = slide('<section class="slide"><div class="area"><p>a</p></div></section>');
  const copia = copiarSlide(original, 'p4');
  assert.equal(copia.outerHTML, original.outerHTML);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/copias.test.mjs`
Expected: FAIL com `Cannot find module '.../motor/copias.js'`.

- [ ] **Step 3: Criar `motor/copias.js`**

```js
// Cópias de slides (spec 6.6 e 6.9): ids ganham sufixo e as referências internas passam a apontar para a cópia.

const REFERENCIAS = ['href', 'clip-path', 'marker-start', 'marker-end', 'fill', 'stroke'];

function reescrever(valor, mapa) {
  const direta = /^#(.+)$/.exec(valor);
  if (direta) return mapa.has(direta[1]) ? `#${mapa.get(direta[1])}` : valor;
  return valor.replace(/url\((['"]?)#([^'")]+)\1\)/g, (todo, aspas, id) => (mapa.has(id) ? `url(${aspas}#${mapa.get(id)}${aspas})` : todo));
}

export function copiarSlide(slide, sufixo) {
  const copia = slide.cloneNode(true);
  const mapa = new Map();
  for (const elemento of [copia, ...copia.querySelectorAll('[id]')]) {
    const id = elemento.getAttribute('id');
    if (!id) continue;
    mapa.set(id, `${id}-${sufixo}`);
    elemento.setAttribute('id', `${id}-${sufixo}`);
  }
  if (mapa.size > 0) {
    for (const elemento of [copia, ...copia.querySelectorAll('*')]) {
      for (const atributo of REFERENCIAS) {
        const valor = elemento.getAttribute(atributo);
        if (!valor) continue;
        const novo = reescrever(valor, mapa);
        if (novo !== valor) elemento.setAttribute(atributo, novo);
      }
    }
  }
  return copia;
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: PASS em todos (106 + 4 de `copias` = 110).

- [ ] **Step 5: Commit**

```bash
git add motor/copias.js tests/unit/copias.test.mjs
git commit -m "feat(motor): cópia de slide com ids únicos e referências reescritas

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: Janela do apresentador

**Files:**
- Create: `motor/sincronia.js`, `motor/apresentador.js`
- Modify: `motor/rotulos.js`, `motor/navegacao.js`, `motor/paineis.js`, `estilos/motor.css`, `montar/navegador.js`, `contrato/contrato.json`, `tests/unit/navegacao.test.mjs`, `tests/integracao/paineis.test.mjs`
- Test: `tests/unit/sincronia.test.mjs`, `tests/integracao/apresentador.test.mjs`

**Interfaces:**
- Consumes: `copiarSlide(slide, sufixo)` (Task 2); `gruposDePassos(slide)` e `aplicarPassos(grupos, revelados)` (`motor/passos.js`); `estadosDosQuadrados(total, blocoAtual, { encerramento })` (`montar/blocos.js`); `elemento(doc, tag, classe?, texto?)` e `clonarSemIds(no)` (`motor/dom.js`); o objeto do motor (`doc`, `janela`, `rot`, `resumo`, `slides`, `grupos`, `estado()`, `irPara`, `aoMudar`, `definirAcao`) e o objeto dos painéis (`abrir`, `fechar`, `aberto`, `avisar`).
- Produces (usado pela Task 4 e pelo marco 4):
  - `lerMensagem(evento, janela) → { acao: 'ola' } | { acao: 'posicao', indice, passo } | null`, e `instalarSincronia(motor, { par, intervaloDeOla }) → { definirPar(janela) }`;
  - `modoApresentador(janela) → boolean`, `instalarApresentador(motor) → { atualizar() }` e `instalarAberturaDoApresentador(motor, paineis) → sincronia`;
  - `paineis.avisar(texto)`, que escreve um aviso fixo no painel de notas e o abre; `paineis.abrir(nome)` lança `Error('painel desconhecido: "<nome>"')` antes de mudar qualquer estado;
  - `ROTULOS` ganha `apresentador`, `apresentadorBloqueado`, `atual`, `proximo`, `fimDaAula`, `slide`, `passo`, `iniciarCronometro`, `pausarCronometro`, `zerarCronometro` e `demoInterativa`, e a tabela de teclas ganha a linha `P` (11 linhas);
  - a tecla `p`/`P` vira a ação `apresentador`.

- [ ] **Step 1: Escrever o teste do canal de sincronia**

Criar `tests/unit/sincronia.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerMensagem, TIPO } from '../../motor/sincronia.js';

const janela = { location: { origin: 'http://127.0.0.1:8765' } };
const evento = (data, origin = 'http://127.0.0.1:8765') => ({ data, origin });

test('lerMensagem aceita ola e posição com índice e passo inteiros', () => {
  assert.deepEqual(lerMensagem(evento({ tipo: TIPO, acao: 'ola' }), janela), { acao: 'ola' });
  assert.deepEqual(lerMensagem(evento({ tipo: TIPO, acao: 'posicao', indice: 3, passo: 1 }), janela),
    { acao: 'posicao', indice: 3, passo: 1 });
});

test('lerMensagem aceita a origem "null" das páginas abertas por file://', () => {
  assert.deepEqual(lerMensagem(evento({ tipo: TIPO, acao: 'ola' }, 'null'), janela), { acao: 'ola' });
});

test('lerMensagem recusa outra origem, outro tipo, ação desconhecida e posição que não é inteira', () => {
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'ola' }, 'https://exemplo.test'), janela), null);
  assert.equal(lerMensagem(evento({ tipo: 'outro', acao: 'ola' }), janela), null);
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'apagar' }), janela), null);
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'posicao', indice: '2', passo: 0 }), janela), null);
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'posicao', indice: 2.5, passo: 0 }), janela), null);
  assert.equal(lerMensagem(evento({ tipo: TIPO, acao: 'posicao', indice: 2 }), janela), null);
  assert.equal(lerMensagem(evento(null), janela), null);
  assert.equal(lerMensagem(evento('texto'), janela), null);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/sincronia.test.mjs`
Expected: FAIL com `Cannot find module '.../motor/sincronia.js'`.

- [ ] **Step 3: Criar `motor/sincronia.js`**

```js
// Sincronia entre a janela da aula e a do apresentador (spec 6.6), por postMessage; funciona também com file://.

export const TIPO = 'aula-usp';

export function lerMensagem(evento, janela) {
  const dados = evento.data;
  if (!dados || dados.tipo !== TIPO) return null;
  if (evento.origin !== 'null' && evento.origin !== janela.location.origin) return null;
  if (dados.acao === 'ola') return { acao: 'ola' };
  if (dados.acao === 'posicao' && Number.isInteger(dados.indice) && Number.isInteger(dados.passo)) {
    return { acao: 'posicao', indice: dados.indice, passo: dados.passo };
  }
  return null;
}

export function instalarSincronia(motor, { par = null, intervaloDeOla = 0 } = {}) {
  const { janela } = motor;
  let outra = par;
  let recebida = null;

  function enviar(mensagem) {
    if (!outra) return;
    try {
      outra.postMessage({ tipo: TIPO, ...mensagem }, '*');
    } catch (erro) {
      janela.console.warn('Aula USP: não foi possível falar com a outra janela.', erro);
      outra = null;
    }
  }

  janela.addEventListener('message', (evento) => {
    const mensagem = lerMensagem(evento, janela);
    if (!mensagem) return;
    if (evento.source) outra = evento.source;
    if (mensagem.acao === 'ola') {
      enviar({ acao: 'posicao', ...motor.estado() });
      return;
    }
    recebida = `${mensagem.indice}/${mensagem.passo}`;
    motor.irPara({ indice: mensagem.indice, passo: mensagem.passo });
  });

  motor.aoMudar((estado) => {
    if (`${estado.indice}/${estado.passo}` === recebida) return;
    enviar({ acao: 'posicao', ...estado });
  });

  if (intervaloDeOla > 0) {
    enviar({ acao: 'ola' });
    janela.setInterval(() => enviar({ acao: 'ola' }), intervaloDeOla);
  }

  return {
    definirPar(nova) {
      outra = nova;
    },
  };
}
```

- [ ] **Step 4: Acrescentar os textos do apresentador**

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
    apresentador: 'Apresentador',
    apresentadorBloqueado: 'O navegador bloqueou a janela do apresentador. Libere as janelas pop-up para este endereço e tecle P de novo.',
    atual: 'Atual',
    proximo: 'Próximo',
    fimDaAula: 'Fim da aula',
    slide: 'slide',
    passo: 'passo',
    iniciarCronometro: 'Iniciar',
    pausarCronometro: 'Pausar',
    zerarCronometro: 'Zerar',
    demoInterativa: 'Demo interativa: abra o HTML',
    teclas: [
      ['→, espaço, PageDown', 'revela o próximo passo; sem passos pendentes, avança o slide'],
      ['←, PageUp', 'esconde o último passo revelado; sem passos revelados, volta o slide'],
      ['Home, End', 'primeiro e último slide'],
      ['1 a 8', 'abertura do bloco correspondente'],
      ['Esc', 'fecha o painel aberto; sem painel aberto, abre a visão geral'],
      ['N', 'painel de notas'],
      ['P', 'janela do apresentador'],
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
    apresentador: 'Presenter',
    apresentadorBloqueado: 'The browser blocked the presenter window. Allow pop-ups for this address and press P again.',
    atual: 'Current',
    proximo: 'Next',
    fimDaAula: 'End of the lecture',
    slide: 'slide',
    passo: 'step',
    iniciarCronometro: 'Start',
    pausarCronometro: 'Pause',
    zerarCronometro: 'Reset',
    demoInterativa: 'Interactive demo: open the HTML',
    teclas: [
      ['→, Space, PageDown', 'reveals the next step; with no pending steps, goes to the next slide'],
      ['←, PageUp', 'hides the last revealed step; with no revealed steps, goes to the previous slide'],
      ['Home, End', 'first and last slide'],
      ['1 to 8', 'opening slide of that block'],
      ['Esc', 'closes the open panel; with no open panel, opens the overview'],
      ['N', 'notes panel'],
      ['P', 'presenter window'],
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

- [ ] **Step 5: Ligar a tecla P e corrigir o AltGr com Cmd**

Substituir o conteúdo de `motor/navegacao.js` por:

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
  p: 'apresentador',
  P: 'apresentador',
  f: 'tela-cheia',
  F: 'tela-cheia',
  '?': 'ajuda',
};

export function acaoDaTecla({ key, ctrlKey = false, metaKey = false, altKey = false }) {
  const altGr = ctrlKey && altKey && !metaKey && key.length === 1;
  if ((ctrlKey || metaKey || altKey) && !altGr) return null;
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

Em `tests/unit/navegacao.test.mjs`, trocar

```js
    '?': 'ajuda', 1: 'bloco-1', 8: 'bloco-8',
```

por

```js
    '?': 'ajuda', p: 'apresentador', P: 'apresentador', 1: 'bloco-1', 8: 'bloco-8',
```

trocar

```js
    for (const chave of ['notas', 'semNotas', 'visaoGeral', 'ajuda', 'tecla', 'acao']) {
```

por

```js
    for (const chave of ['notas', 'semNotas', 'visaoGeral', 'ajuda', 'tecla', 'acao', 'apresentador', 'apresentadorBloqueado', 'atual', 'proximo', 'fimDaAula', 'slide', 'passo', 'iniciarCronometro', 'pausarCronometro', 'zerarCronometro', 'demoInterativa']) {
```

e trocar

```js
    assert.equal(ROTULOS[idioma].teclas.length, 10, idioma);
```

por

```js
    assert.equal(ROTULOS[idioma].teclas.length, 11, idioma);
```

Em `tests/integracao/paineis.test.mjs`, no teste da ajuda, trocar `linhas: 10,` por `linhas: 11,`.

- [ ] **Step 6: Dar ao painel de notas um lugar para avisos e validar o nome do painel**

Em `motor/paineis.js`, trocar

```js
  preencherAjuda(doc, paineis.ajuda.corpo, rot);
  let aberto = null;
```

por

```js
  preencherAjuda(doc, paineis.ajuda.corpo, rot);
  const aviso = elemento(doc, 'p', 'aviso');
  aviso.hidden = true;
  paineis.notas.painel.insertBefore(aviso, paineis.notas.corpo);
  let aberto = null;
```

trocar

```js
  function abrir(nome) {
    fechar();
```

por

```js
  function abrir(nome) {
    if (!Object.hasOwn(paineis, nome)) throw new Error(`painel desconhecido: "${nome}"`);
    fechar();
```

e trocar

```js
  return { abrir, fechar, aberto: () => aberto };
```

por

```js
  return {
    abrir,
    fechar,
    aberto: () => aberto,
    avisar(texto) {
      aviso.textContent = texto;
      aviso.hidden = false;
      abrir('notas');
    },
  };
```

- [ ] **Step 7: Escrever o teste de integração do apresentador**

Criar `tests/integracao/apresentador.test.mjs`:

```js
// Janela do apresentador no Chrome (spec 6.6 e 11.2): miniaturas, sincronia nos dois sentidos e pop-up bloqueado.
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

const abrir = (caminho) => abrirAula(navegador, `${servidor.endereco}/${caminho}`);

async function abrirApresentador(pagina) {
  const [popup] = await Promise.all([pagina.waitForEvent('popup', { timeout: 5000 }), pagina.keyboard.press('p')]);
  await esperarMontagem(popup);
  return popup;
}

const posicao = (pagina) => pagina.evaluate(() => document.querySelector('.posicao').textContent);
const slideAtivo = (pagina) => pagina.evaluate(() => document.querySelector('.slide.ativo').id);

test('P abre o apresentador com as duas miniaturas, posição, mapa e notas do slide', async () => {
  const { pagina, erros } = await abrir('index.html#o-que-mostra');
  const popup = await abrirApresentador(pagina);
  const visao = await popup.evaluate(() => ({
    endereco: location.search,
    palcoVisivel: getComputedStyle(document.querySelector('.palco')).display !== 'none',
    atual: document.querySelector('[data-miniatura="atual"] .slide')?.id,
    proxima: document.querySelector('[data-miniatura="proxima"] .slide')?.id,
    reveladosAtual: document.querySelectorAll('[data-miniatura="atual"] [data-passo][data-revelado]').length,
    reveladosProxima: document.querySelectorAll('[data-miniatura="proxima"] [data-passo][data-revelado]').length,
    posicao: document.querySelector('.posicao').textContent,
    quadrados: document.querySelectorAll('.painel-apresentador .mapa .quadrado').length,
    notas: document.querySelector('.notas-apresentador').textContent.trim(),
    escala: document.querySelector('[data-miniatura="atual"] .quadro-miniatura').style.getPropertyValue('--escala-miniatura'),
  }));
  assert.equal(visao.endereco, '?apresentador=1');
  assert.equal(visao.palcoVisivel, false);
  assert.equal(visao.atual, 'o-que-mostra-atual');
  assert.equal(visao.proxima, 'o-que-mostra-proxima');
  assert.deepEqual([visao.reveladosAtual, visao.reveladosProxima], [0, 1]);
  assert.equal(visao.posicao, 'slide 2 / 13 · passo 0 / 2');
  assert.equal(visao.quadrados, 3);
  assert.equal(visao.notas, 'Estas notas não aparecem no slide.');
  assert.ok(Number(visao.escala) > 0 && Number(visao.escala) < 1, visao.escala);
  assert.deepEqual(erros, []);
  await popup.close();
  await pagina.close();
});

test('navegar numa janela move a outra, nos dois sentidos', async () => {
  const { pagina } = await abrir('index.html');
  const popup = await abrirApresentador(pagina);
  await pagina.keyboard.press('ArrowRight');
  await popup.waitForFunction(() => document.querySelector('.posicao').textContent.startsWith('slide 2 /'));
  assert.equal(await posicao(popup), 'slide 2 / 13 · passo 0 / 2');
  await popup.keyboard.press('ArrowRight');
  await pagina.waitForFunction(() => location.hash === '#o-que-mostra/1');
  assert.equal(await posicao(popup), 'slide 2 / 13 · passo 1 / 2');
  await popup.keyboard.press('End');
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'encerramento');
  assert.equal(await slideAtivo(pagina), 'encerramento');
  await popup.close();
  await pagina.close();
});

test('recarregar a janela da aula refaz a sincronia', async () => {
  const { pagina } = await abrir('index.html');
  const popup = await abrirApresentador(pagina);
  await pagina.reload();
  await esperarMontagem(pagina);
  await popup.keyboard.press('2');
  await pagina.waitForFunction(() => document.querySelector('.slide.ativo').id === 'figuras-e-demos', null, { timeout: 15000 });
  assert.equal(await slideAtivo(pagina), 'figuras-e-demos');
  await popup.close();
  await pagina.close();
});

test('cronômetro conta e zera; o relógio mostra a hora', async () => {
  const { pagina } = await abrir('index.html');
  const popup = await abrirApresentador(pagina);
  const tempo = () => popup.evaluate(() => document.querySelector('.cronometro .tempo').textContent);
  assert.equal(await tempo(), '00:00');
  await popup.getByRole('button', { name: 'Iniciar' }).click();
  await popup.waitForFunction(() => document.querySelector('.cronometro .tempo').textContent !== '00:00', null, { timeout: 5000 });
  await popup.getByRole('button', { name: 'Pausar' }).click();
  const pausado = await tempo();
  await popup.getByRole('button', { name: 'Zerar' }).click();
  assert.equal(await tempo(), '00:00');
  assert.match(pausado, /^\d\d:\d\d$/);
  assert.match(await popup.evaluate(() => document.querySelector('.cronometro .relogio').textContent), /\d{1,2}[:h]\d\d/);
  await popup.close();
  await pagina.close();
});

test('com o pop-up bloqueado, as notas abrem com o aviso', async () => {
  const { pagina } = await abrir('index.html');
  await pagina.evaluate(() => { window.open = () => null; });
  await pagina.keyboard.press('p');
  const aviso = await pagina.evaluate(() => {
    const painel = document.querySelector('[data-painel="notas"]');
    return { visivel: !painel.hidden, texto: painel.querySelector('.aviso')?.textContent };
  });
  assert.equal(aviso.visivel, true);
  assert.match(aviso.texto, /bloqueou a janela do apresentador/);
  await pagina.close();
});

test('no apresentador, toda classe do documento está no contrato', async () => {
  const { pagina } = await abrir('index.html');
  const popup = await abrirApresentador(pagina);
  const classes = await popup.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .flatMap((elemento) => [...elemento.classList]))]);
  const conhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);
  assert.deepEqual(classes.filter((nome) => !conhecidas.has(nome)), []);
  await popup.close();
  await pagina.close();
});
```

- [ ] **Step 8: Rodar e ver falhar**

Run: `node --test tests/integracao/apresentador.test.mjs`
Expected: FAIL nos 6 testes. Cinco esperam a janela que a tecla P ainda não abre e param em `TimeoutError` depois de 5 s; o do pop-up bloqueado falha numa `AssertionError`, porque o painel de notas ainda não tem onde pôr o aviso.

- [ ] **Step 9: Criar `motor/apresentador.js`**

```js
// Janela do apresentador (spec 6.6): miniaturas fiéis, notas, cronômetro, relógio, posição e mapa de blocos.
import { elemento, clonarSemIds } from './dom.js';
import { copiarSlide } from './copias.js';
import { gruposDePassos, aplicarPassos } from './passos.js';
import { estadosDosQuadrados } from '../montar/blocos.js';
import { instalarSincronia } from './sincronia.js';

const INTERVALO_DE_OLA = 2000;
const LARGURA_DO_PALCO = 1280;

export function modoApresentador(janela) {
  return new URLSearchParams(janela.location.search).has('apresentador');
}

function criarMiniatura(doc, rotulo, qual) {
  const caixa = elemento(doc, 'div', 'miniatura');
  caixa.setAttribute('data-miniatura', qual);
  const quadro = elemento(doc, 'div', 'quadro-miniatura');
  caixa.append(elemento(doc, 'span', 'rotulo', rotulo), quadro);
  return { caixa, quadro };
}

function formatarTempo(milissegundos) {
  const total = Math.floor(milissegundos / 1000);
  const partes = [Math.floor(total / 60) % 60, total % 60].map((parte) => String(parte).padStart(2, '0'));
  const horas = Math.floor(total / 3600);
  return horas > 0 ? `${horas}:${partes.join(':')}` : partes.join(':');
}

function criarCronometro(doc, rot, janela) {
  const tempo = elemento(doc, 'output', 'tempo', formatarTempo(0));
  const relogio = elemento(doc, 'output', 'relogio');
  const caixa = elemento(doc, 'div', 'cronometro');
  let inicio = null;
  let acumulado = 0;

  const mostrar = () => {
    tempo.textContent = formatarTempo(acumulado + (inicio === null ? 0 : Date.now() - inicio));
  };
  const botao = (texto, acao) => {
    const elementoBotao = elemento(doc, 'button', null, texto);
    elementoBotao.type = 'button';
    elementoBotao.addEventListener('click', () => {
      acao();
      mostrar();
    });
    return elementoBotao;
  };

  caixa.append(
    tempo,
    botao(rot.iniciarCronometro, () => { if (inicio === null) inicio = Date.now(); }),
    botao(rot.pausarCronometro, () => {
      if (inicio === null) return;
      acumulado += Date.now() - inicio;
      inicio = null;
    }),
    botao(rot.zerarCronometro, () => { acumulado = 0; inicio = inicio === null ? null : Date.now(); }),
    relogio,
  );

  janela.setInterval(() => {
    mostrar();
    relogio.textContent = new Date().toLocaleTimeString(doc.documentElement.lang || 'pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, 1000);
  relogio.textContent = new Date().toLocaleTimeString(doc.documentElement.lang || 'pt-BR', { hour: '2-digit', minute: '2-digit' });
  return caixa;
}

export function instalarApresentador(motor) {
  const { doc, janela, rot, resumo, slides, grupos } = motor;
  doc.body.classList.add('modo-apresentador');

  const atual = criarMiniatura(doc, rot.atual, 'atual');
  const proxima = criarMiniatura(doc, rot.proximo, 'proxima');
  const posicao = elemento(doc, 'p', 'posicao');
  const mapa = elemento(doc, 'nav', 'mapa');
  const notas = elemento(doc, 'div', 'notas-apresentador');
  const painel = elemento(doc, 'div', 'painel-apresentador');
  painel.append(posicao, mapa, criarCronometro(doc, rot, janela), notas);
  const raiz = elemento(doc, 'div', 'apresentador');
  raiz.append(atual.caixa, proxima.caixa, painel);
  doc.body.append(raiz);

  const proximoEstado = ({ indice, passo }) => {
    if (passo < grupos[indice].length) return { indice, passo: passo + 1 };
    if (indice < slides.length - 1) return { indice: indice + 1, passo: 0 };
    return null;
  };

  function preencher(quadro, estado, sufixo) {
    quadro.replaceChildren();
    if (!estado) {
      quadro.append(elemento(doc, 'p', 'fim-da-aula', rot.fimDaAula));
      return;
    }
    const copia = copiarSlide(slides[estado.indice], sufixo);
    copia.classList.add('ativo');
    aplicarPassos(gruposDePassos(copia), estado.passo);
    quadro.append(copia);
  }

  function ajustarEscalas() {
    for (const quadro of [atual.quadro, proxima.quadro]) {
      quadro.style.setProperty('--escala-miniatura', String(quadro.clientWidth / LARGURA_DO_PALCO));
    }
  }

  function atualizar() {
    const estado = motor.estado();
    const slide = slides[estado.indice];
    preencher(atual.quadro, estado, 'atual');
    preencher(proxima.quadro, proximoEstado(estado), 'proxima');
    const passos = grupos[estado.indice].length;
    posicao.textContent = passos > 0
      ? `${rot.slide} ${estado.indice + 1} / ${slides.length} · ${rot.passo} ${estado.passo} / ${passos}`
      : `${rot.slide} ${estado.indice + 1} / ${slides.length}`;
    const estados = estadosDosQuadrados(resumo.blocos.length, Number(slide.getAttribute('data-bloco')) || null, {
      encerramento: slide.getAttribute('data-layout') === 'encerramento',
    });
    mapa.replaceChildren(...resumo.blocos.map((bloco, k) => {
      const quadrado = elemento(doc, 'a', `quadrado ${estados[k]}`);
      quadrado.setAttribute('href', `#${bloco.id}`);
      quadrado.setAttribute('aria-label', `${rot.bloco} ${bloco.numero}: ${bloco.titulo}`);
      return quadrado;
    }));
    const aside = slide.querySelector(':scope > aside.notas');
    notas.replaceChildren(...(aside
      ? [...aside.childNodes].map(clonarSemIds)
      : [elemento(doc, 'p', null, rot.semNotas)]));
    ajustarEscalas();
  }

  motor.aoMudar(atualizar);
  janela.addEventListener('resize', ajustarEscalas);
  atualizar();
  instalarSincronia(motor, { par: janela.opener, intervaloDeOla: INTERVALO_DE_OLA });
  return { atualizar };
}

export function instalarAberturaDoApresentador(motor, paineis) {
  const { janela, rot } = motor;
  const sincronia = instalarSincronia(motor);
  motor.definirAcao('apresentador', () => {
    const endereco = new URL(janela.location.href);
    endereco.searchParams.set('apresentador', '1');
    const outra = janela.open(endereco.href, 'aula-usp-apresentador');
    if (!outra) {
      paineis.avisar(rot.apresentadorBloqueado);
      return;
    }
    sincronia.definirPar(outra);
  });
  return sincronia;
}
```

- [ ] **Step 10: Estilos do apresentador**

Em `estilos/motor.css`, trocar o seletor

```css
.palco [data-passo]:not([data-revelado]) {
```

por

```css
body.modo-palco [data-passo]:not([data-revelado]) {
```

(assim os passos também ficam certos nas miniaturas, que estão fora do palco), e acrescentar ao fim do arquivo:

```css
/* Janela do apresentador (spec 6.6): miniaturas fiéis à esquerda, notas e controles à direita. */

body.modo-apresentador .palco {
  display: none;
}

.apresentador {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    "atual painel"
    "proxima painel"
    ". painel";
  gap: var(--espaco-3);
  padding: var(--espaco-3);
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font-family: var(--fonte-sans);
}

.miniatura[data-miniatura="atual"] { grid-area: atual; }
.miniatura[data-miniatura="proxima"] { grid-area: proxima; width: 60%; }

.miniatura > .rotulo {
  display: block;
  margin-bottom: var(--espaco-1);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

.quadro-miniatura {
  --escala-miniatura: 0.5;
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: var(--regua-normal) solid var(--cor-linha);
}

.quadro-miniatura > .slide {
  position: absolute;
  top: 0;
  left: 0;
  transform: scale(var(--escala-miniatura));
  transform-origin: top left;
}

.quadro-miniatura .demo > img.estatico {
  display: block;
}

.fim-da-aula {
  padding: var(--espaco-3);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
  color: var(--cor-cinza);
}

.painel-apresentador {
  grid-area: painel;
  display: flex;
  flex-direction: column;
  gap: var(--espaco-3);
  min-height: 0;
}

.posicao {
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-grande-tamanho);
  font-weight: var(--tipo-rotulo-grande-peso);
  letter-spacing: var(--tipo-rotulo-grande-tracking);
  text-transform: var(--tipo-rotulo-grande-caixa);
}

.painel-apresentador .mapa {
  display: flex;
  gap: var(--mapa-espaco-cabecalho);
}

.painel-apresentador .quadrado {
  width: var(--mapa-quadrado-cabecalho);
  height: var(--mapa-quadrado-cabecalho);
}

.cronometro {
  display: flex;
  align-items: center;
  gap: var(--espaco-2);
  font-family: var(--tipo-codigo-familia);
  font-size: var(--tipo-codigo-tamanho);
}

.cronometro .tempo {
  font-size: var(--tipo-numeral-tamanho);
  font-weight: var(--tipo-numeral-peso);
  font-variant-numeric: tabular-nums;
}

.cronometro .relogio {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: var(--cor-cinza);
}

.cronometro button {
  padding: var(--espaco-1) var(--espaco-2);
  border: var(--regua-normal) solid var(--cor-tinta);
  background: var(--cor-papel);
  color: var(--cor-tinta);
  font: inherit;
  font-size: var(--tipo-rotulo-tamanho);
  text-transform: var(--tipo-rotulo-caixa);
  letter-spacing: var(--tipo-rotulo-tracking);
  cursor: pointer;
}

.notas-apresentador {
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-size: 24px;
  line-height: 1.4;
}

.notas-apresentador > * + * {
  margin-top: var(--espaco-2);
}

.aviso {
  margin-bottom: var(--espaco-3);
  padding: var(--espaco-2);
  background: var(--cor-amarelo);
  color: var(--cor-tinta);
  font-size: 18px;
  line-height: 1.4;
}
```

- [ ] **Step 11: Abrir o apresentador na entrada**

Substituir o conteúdo de `montar/navegador.js` por:

```js
// Entrada do modo navegador em desenvolvimento, importada por montar/carregador.js (spec 3.2).
// No marco 5, dist/aula-usp.js embute CSS, fontes e marcas; aqui tudo vem por URL.
import { montar } from './montar.js';
import { iniciarMotor } from '../motor/motor.js';
import { instalarPaineis } from '../motor/paineis.js';
import { instalarDemos } from '../motor/demos.js';
import { instalarApresentador, instalarAberturaDoApresentador, modoApresentador } from '../motor/apresentador.js';

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
  else {
    const api = window.AulaUSP ?? (window.AulaUSP = {});
    const motor = iniciarMotor({ doc: document, janela: window, resumo });
    if (modoApresentador(window)) {
      instalarApresentador(motor);
    } else {
      const paineis = instalarPaineis(motor);
      instalarDemos(motor, api);
      instalarAberturaDoApresentador(motor, paineis);
    }
  }
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

- [ ] **Step 12: Registrar as classes do apresentador no contrato**

Em `contrato/contrato.json`, a linha de `classesDoSistema` passa a ser (acréscimo das classes do apresentador e do aviso no fim; nada mais muda no arquivo):

```json
  "classesDoSistema": ["palco", "slide", "area", "cabecalho", "rotulo", "mapa", "quadrado", "visto", "atual", "futuro", "contador", "rodape", "metadados-capa", "roteiro", "faixa-de-marca", "marca-unidade", "marca-usp", "numero-bloco", "fileira", "nome-curto", "bloco-n-de-m", "painel", "ativo", "folha", "modo-palco", "painel-titulo", "painel-corpo", "grupo", "grupo-titulo", "cartoes", "cartao", "cartao-numero", "cartao-titulo", "teclas", "aviso", "modo-apresentador", "apresentador", "miniatura", "quadro-miniatura", "fim-da-aula", "painel-apresentador", "posicao", "cronometro", "tempo", "relogio", "notas-apresentador"],
```

- [ ] **Step 13: Rodar os testes**

Run: `npm run test:integracao`
Expected: PASS nos 41 testes (35 anteriores + 6 do apresentador).

Run: `npm test`
Expected: PASS nos 113 testes unitários (110 + 3 de `sincronia`).

- [ ] **Step 14: Commit**

```bash
git add motor/sincronia.js motor/apresentador.js motor/rotulos.js motor/navegacao.js motor/paineis.js estilos/motor.css montar/navegador.js contrato/contrato.json tests/unit/sincronia.test.mjs tests/unit/navegacao.test.mjs tests/integracao/apresentador.test.mjs tests/integracao/paineis.test.mjs
git commit -m "feat(motor): janela do apresentador com miniaturas e sincronia

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 4: Impressão e PDF

**Files:**
- Create: `motor/impressao.js`, `estilos/impressao.css`, `tests/fixtures/impressao/index.html`
- Modify: `montar/navegador.js`, `especime/index.html`, `contrato/contrato.json`
- Test: `tests/unit/impressao.test.mjs`, `tests/integracao/impressao.test.mjs`

**Interfaces:**
- Consumes: `copiarSlide(slide, sufixo)` (Task 2); `demos.montarSeNecessario(raiz)` (Task 1); `gruposDePassos` e `aplicarPassos` (`motor/passos.js`); `elemento` (`motor/dom.js`); o objeto do motor (`doc`, `janela`, `rot`, `slides`, `estado()`) e o dos painéis (`aberto()`, `fechar()`, `abrir(nome)`).
- Produces (usado pelo marco 5):
  - `paginasEsperadas(doc) → number`, contando 1 por slide e mais um por estado nos slides com `data-pdf="passos"`, sem contar cópias;
  - `instalarImpressao(motor, { demos, paineis, api }) → { preparar(), restaurar() }`, que também liga `beforeprint` e `afterprint` e publica `AulaUSP.prepararImpressao` e `AulaUSP.restaurarImpressao`;
  - no DOM preparado: cópias com `data-copia` e ids sufixados por `impressao-<k>`, `img.captura-demo` para demos com `capturar()`, `div.demo-substituta` para demos sem imagem, e `body.imprimindo`.

- [ ] **Step 1: Escrever o teste unitário que falha**

Criar `tests/unit/impressao.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { paginasEsperadas } from '../../motor/impressao.js';

const aula = (secoes) => parseHTML(`<!DOCTYPE html><html><body>${secoes}</body></html>`).document;
const slide = (corpo, atributos = '') => `<section class="slide" ${atributos}><div class="area">${corpo}</div></section>`;

test('sem data-pdf, cada slide vale uma página', () => {
  assert.equal(paginasEsperadas(aula(slide('<p>a</p>') + slide('<p data-passo>b</p>'))), 2);
});

test('com data-pdf="passos", o slide vale uma página por estado: sem passos revelados até todos', () => {
  const doc = aula(slide('<p>a</p>') + slide('<p data-passo>b</p><p data-passo>c</p><p data-passo>d</p>', 'data-pdf="passos"'));
  assert.equal(paginasEsperadas(doc), 5);
});

test('data-pdf="passos" num slide sem passos não acrescenta páginas, e as cópias não são contadas', () => {
  const doc = aula(slide('<p>a</p>', 'data-pdf="passos"') + '<section class="slide" data-copia><div class="area"></div></section>');
  assert.equal(paginasEsperadas(doc), 1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/impressao.test.mjs`
Expected: FAIL com `Cannot find module '.../motor/impressao.js'`.

- [ ] **Step 3: Criar a aula de fixture com os três casos de demo**

Criar `tests/fixtures/impressao/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Fixture de impressão</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Fixture de impressão">
<meta name="aula" content="1">
<meta name="data" content="2026-09-15">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Impressão</h1>
</section>

<section data-layout="conteudo" id="passos" data-pdf="passos">
  <h2>Dois passos, três páginas</h2>
  <ul>
    <li data-passo>Primeiro.</li>
    <li data-passo>Segundo.</li>
  </ul>
</section>

<section data-layout="demo" id="com-estatico">
  <h2>Demo com imagem estática</h2>
  <div class="demo" data-demo="estatica">
    <img class="estatico" alt="Imagem estática da demo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23D9D9D9'/%3E%3C/svg%3E">
  </div>
</section>

<section data-layout="demo" id="com-captura">
  <h2>Demo que sabe se fotografar</h2>
  <div class="demo" data-demo="capturavel"></div>
</section>

<section data-layout="demo" id="sem-imagem">
  <h2>Demo sem imagem</h2>
  <div class="demo" data-demo="crua"></div>
</section>

<section data-layout="encerramento">
  <h2>Fim</h2>
  <ol class="sintese">
    <li>Seis slides e duas cópias dão oito páginas.</li>
  </ol>
</section>

<script>
AulaUSP.demo('estatica', { montar() {} });
AulaUSP.demo('capturavel', {
  montar(raiz) {
    raiz.append(document.createElement('canvas'));
  },
  capturar() {
    return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'9\'%3E%3Crect width=\'16\' height=\'9\' fill=\'%231094AB\'/%3E%3C/svg%3E';
  },
});
AulaUSP.demo('crua', { montar() {} });
</script>

</body>
</html>
```

- [ ] **Step 4: Escrever o teste de integração**

Criar `tests/integracao/impressao.test.mjs`:

```js
// Impressão no Chrome (spec 6.9 e 8.4): cópias por estado, demos trocadas por imagem e PDF de 1280 × 720.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

let servidorDaFixture;
let servidorDoEspecime;
let navegador;

before(async () => {
  servidorDaFixture = await servirPasta('tests/fixtures/impressao/');
  servidorDoEspecime = await servirPasta('especime/');
  navegador = await iniciarChrome();
});

after(async () => {
  await navegador?.close();
  await servidorDaFixture?.fechar();
  await servidorDoEspecime?.fechar();
});

const situacao = (pagina) => pagina.evaluate(() => ({
  slides: document.querySelectorAll('section.slide').length,
  copias: document.querySelectorAll('section.slide[data-copia]').length,
  imprimindo: document.body.classList.contains('imprimindo'),
  passosDasCopias: [...document.querySelectorAll('section.slide[data-copia]')]
    .map((copia) => copia.querySelectorAll('[data-passo][data-revelado]').length),
  passosDoOriginal: document.querySelectorAll('#passos [data-passo][data-revelado]').length,
  idsDaCopia: [...document.querySelectorAll('section.slide[data-copia]')].map((copia) => copia.id),
  estatica: document.querySelectorAll('#com-estatico .demo > img.estatico').length,
  captura: document.querySelector('#com-captura .demo > img.captura-demo')?.getAttribute('src')?.slice(0, 19),
  substituta: document.querySelector('#sem-imagem .demo > .demo-substituta')?.textContent,
  capturasExtras: document.querySelectorAll('#com-estatico .captura-demo, #com-estatico .demo-substituta').length,
}));

function paginasDoPdf(pdf) {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

test('prepararImpressao revela os passos, cria uma cópia por estado e troca as demos por imagem', async () => {
  const { pagina, erros } = await abrirAula(navegador, `${servidorDaFixture.endereco}/`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  assert.deepEqual(await situacao(pagina), {
    slides: 8,
    copias: 2,
    imprimindo: true,
    passosDasCopias: [0, 1],
    passosDoOriginal: 2,
    idsDaCopia: ['passos-impressao-0', 'passos-impressao-1'],
    estatica: 1,
    captura: 'data:image/svg+xml,',
    substituta: 'Demo interativa: abra o HTML',
    capturasExtras: 0,
  });
  assert.deepEqual(erros, []);
  await pagina.close();
});

test('restaurarImpressao devolve o documento ao estado de antes', async () => {
  const { pagina } = await abrirAula(navegador, `${servidorDaFixture.endereco}/#passos/1`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  await pagina.evaluate(() => window.AulaUSP.restaurarImpressao());
  const depois = await situacao(pagina);
  assert.deepEqual([depois.slides, depois.copias, depois.imprimindo, depois.passosDoOriginal], [6, 0, false, 1]);
  assert.equal(depois.captura, undefined);
  assert.equal(depois.substituta, undefined);
  assert.equal(await pagina.evaluate(() => document.querySelector('.slide.ativo').id), 'passos');
  await pagina.close();
});

test('o PDF tem uma página por slide e por estado, do tamanho do palco', async () => {
  const { pagina } = await abrirAula(navegador, `${servidorDaFixture.endereco}/`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  const pdf = await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
  assert.equal(paginasDoPdf(pdf), 8);
  assert.match(pdf.toString('latin1'), /\/MediaBox\s*\[\s*0\s+0\s+960(\.\d+)?\s+540(\.\d+)?\s*\]/);
  await pagina.close();
});

test('no espécime, o slide com data-pdf="passos" acrescenta as páginas dos seus estados', async () => {
  const { pagina } = await abrirAula(navegador, `${servidorDoEspecime.endereco}/index.html`);
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  assert.deepEqual(await pagina.evaluate(() => [
    document.querySelectorAll('section.slide').length,
    document.querySelectorAll('section.slide[data-copia]').length,
  ]), [15, 2]);
  await pagina.close();
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `node --test tests/integracao/impressao.test.mjs`
Expected: FAIL nos 4 testes, todos em `page.evaluate: TypeError: window.AulaUSP.prepararImpressao is not a function`.

- [ ] **Step 6: Criar `motor/impressao.js`**

```js
// Impressão (spec 6.9 e 8.4): revela os passos, gera uma cópia por estado onde o autor pediu,
// troca as demos pela imagem e esconde os painéis; restaurar desfaz tudo.
import { elemento } from './dom.js';
import { copiarSlide } from './copias.js';
import { gruposDePassos, aplicarPassos } from './passos.js';

const PASSOS_NO_PDF = 'passos';

export function paginasEsperadas(doc) {
  return [...doc.querySelectorAll('section.slide:not([data-copia])')]
    .reduce((total, slide) => total + 1 + (slide.getAttribute('data-pdf') === PASSOS_NO_PDF ? gruposDePassos(slide).length : 0), 0);
}

export function instalarImpressao(motor, { demos, paineis, api }) {
  const { doc, janela, rot } = motor;
  let salvo = null;

  function capturar(raiz) {
    const definicao = demos?.montarSeNecessario(raiz);
    if (!definicao?.capturar) return null;
    try {
      const resultado = definicao.capturar();
      if (!resultado) return null;
      return typeof resultado === 'string' ? resultado : resultado.toDataURL?.() ?? null;
    } catch (erro) {
      janela.console.error(`Aula USP: a demo "${raiz.getAttribute('data-demo')}" falhou em capturar.`, erro);
      return null;
    }
  }

  function trocarDemos() {
    for (const raiz of doc.querySelectorAll('div.demo')) {
      if (raiz.querySelector(':scope > img.estatico')) continue;
      const imagem = capturar(raiz);
      if (imagem) {
        const captura = elemento(doc, 'img', 'captura-demo');
        captura.setAttribute('src', imagem);
        captura.setAttribute('alt', rot.demoInterativa);
        raiz.append(captura);
      } else {
        raiz.append(elemento(doc, 'div', 'demo-substituta', rot.demoInterativa));
      }
    }
  }

  function preparar() {
    if (salvo) return;
    salvo = { estado: motor.estado(), painel: paineis?.aberto() ?? null };
    paineis?.fechar();
    trocarDemos();
    for (const slide of motor.slides) {
      const grupos = gruposDePassos(slide);
      if (slide.getAttribute('data-pdf') === PASSOS_NO_PDF) {
        grupos.forEach((_, k) => {
          const copia = copiarSlide(slide, `impressao-${k}`);
          copia.setAttribute('data-copia', '');
          aplicarPassos(gruposDePassos(copia), k);
          slide.parentNode.insertBefore(copia, slide);
        });
      }
      aplicarPassos(grupos, grupos.length);
    }
    doc.body.classList.add('imprimindo');
  }

  function restaurar() {
    if (!salvo) return;
    for (const extra of doc.querySelectorAll('[data-copia], .captura-demo, .demo-substituta')) extra.remove();
    doc.body.classList.remove('imprimindo');
    const { estado, painel } = salvo;
    salvo = null;
    motor.slides.forEach((slide, indice) => {
      aplicarPassos(gruposDePassos(slide), indice === estado.indice ? estado.passo : 0);
    });
    if (painel) paineis?.abrir(painel);
  }

  janela.addEventListener('beforeprint', preparar);
  janela.addEventListener('afterprint', restaurar);
  api.prepararImpressao = preparar;
  api.restaurarImpressao = restaurar;
  return { preparar, restaurar };
}
```

- [ ] **Step 7: Criar `estilos/impressao.css`**

```css
/* Impressão e PDF (spec 6.9 e 8.4): um slide ou estado por página, sem painéis nem janelas do motor. */

@page {
  size: 1280px 720px;
  margin: 0;
}

@media print {
  body.modo-palco {
    height: auto;
    overflow: visible;
  }

  .palco {
    position: static;
    width: auto;
    height: auto;
    transform: none;
  }

  .palco > .slide {
    display: block;
    position: relative;
    break-after: page;
  }

  .palco > .slide:last-child {
    break-after: auto;
  }

  [data-painel],
  .apresentador {
    display: none;
  }

  .demo > img.estatico {
    display: block;
  }

  .demo > *:not(img.estatico):not(.captura-demo):not(.demo-substituta) {
    display: none;
  }
}

.demo-substituta {
  padding: var(--espaco-2) var(--espaco-3);
  border: var(--regua-normal) solid var(--cor-tinta);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

.captura-demo {
  width: 100%;
  height: auto;
}
```

- [ ] **Step 8: Ligar a impressão na entrada**

Substituir o conteúdo de `montar/navegador.js` por:

```js
// Entrada do modo navegador em desenvolvimento, importada por montar/carregador.js (spec 3.2).
// No marco 5, dist/aula-usp.js embute CSS, fontes e marcas; aqui tudo vem por URL.
import { montar } from './montar.js';
import { iniciarMotor } from '../motor/motor.js';
import { instalarPaineis } from '../motor/paineis.js';
import { instalarDemos } from '../motor/demos.js';
import { instalarApresentador, instalarAberturaDoApresentador, modoApresentador } from '../motor/apresentador.js';
import { instalarImpressao } from '../motor/impressao.js';

const BASE = new URL('../', import.meta.url);
const ESTILOS = ['estilos/tokens.css', 'estilos/fontes.css', 'estilos/base.css', 'estilos/layouts.css', 'estilos/motor.css', 'estilos/impressao.css'];

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
  else {
    const api = window.AulaUSP ?? (window.AulaUSP = {});
    const motor = iniciarMotor({ doc: document, janela: window, resumo });
    if (modoApresentador(window)) {
      instalarApresentador(motor);
    } else {
      const paineis = instalarPaineis(motor);
      const demos = instalarDemos(motor, api);
      instalarAberturaDoApresentador(motor, paineis);
      instalarImpressao(motor, { demos, paineis, api });
    }
  }
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

- [ ] **Step 9: Pedir as páginas por estado num slide do espécime**

Em `especime/index.html`, trocar

```html
<section data-layout="conteudo" id="grade-4-4-4">
```

por

```html
<section data-layout="conteudo" id="grade-4-4-4" data-pdf="passos">
```

- [ ] **Step 10: Registrar as classes da impressão no contrato**

Em `contrato/contrato.json`, a linha de `classesDoSistema` passa a terminar com as três classes da impressão (o resto da linha não muda):

```json
  "classesDoSistema": ["palco", "slide", "area", "cabecalho", "rotulo", "mapa", "quadrado", "visto", "atual", "futuro", "contador", "rodape", "metadados-capa", "roteiro", "faixa-de-marca", "marca-unidade", "marca-usp", "numero-bloco", "fileira", "nome-curto", "bloco-n-de-m", "painel", "ativo", "folha", "modo-palco", "painel-titulo", "painel-corpo", "grupo", "grupo-titulo", "cartoes", "cartao", "cartao-numero", "cartao-titulo", "teclas", "aviso", "modo-apresentador", "apresentador", "miniatura", "quadro-miniatura", "fim-da-aula", "painel-apresentador", "posicao", "cronometro", "tempo", "relogio", "notas-apresentador", "captura-demo", "demo-substituta", "imprimindo"],
```

- [ ] **Step 11: Rodar os testes**

Run: `npm run test:integracao`
Expected: PASS nos 45 testes (41 anteriores + 4 de `impressao`).

Run: `npm test`
Expected: PASS nos 116 testes unitários (113 + 3 de `impressao`).

- [ ] **Step 12: Conferir no navegador**

Abrir a aula com um script descartável fora do repositório (não use `npm run servir` em primeiro plano: ele não termina sozinho), importando `servirPasta`, `iniciarChrome` e `abrirAula` de `tests/integracao/utilitarios.mjs`, e conferir:

- com a tecla P, a janela do apresentador mostra o slide atual e o próximo estado, as notas, o cronômetro, o relógio, a posição e o mapa;
- navegar numa janela move a outra;
- no slide da demo, o botão soma de 5 em 5 e a demo para ao sair do slide;
- depois de `AulaUSP.prepararImpressao()`, uma captura de tela com `emulateMedia({ media: 'print' })` mostra os slides empilhados, sem painéis.

Descrever no relatório o que viu, com as capturas que tirou. Não comitar o script nem as imagens.

- [ ] **Step 13: Commit**

```bash
git add motor/impressao.js estilos/impressao.css montar/navegador.js especime/index.html contrato/contrato.json tests/fixtures/impressao tests/unit/impressao.test.mjs tests/integracao/impressao.test.mjs
git commit -m "feat(motor): impressão com cópias por estado e demos trocadas por imagem

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
