# Aula USP · Marco 2a (Montagem e layouts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o HTML de uma aula nos slides do Aula USP: blocos derivados, cromo gerado (cabeçalho, mapa, contador, rodapé, capa, abertura, faixa de marca), os sete layouts em CSS e um servidor de desenvolvimento que mostra o espécime inteiro, com a geometria conferida no Chrome.

**Architecture:** `montar/` é um conjunto de ES modules sem dependência de Node que opera sobre a API padrão do DOM, então roda igual no navegador e, nos testes, sobre `linkedom`. `montar/navegador.js` é a entrada de desenvolvimento: injeta as folhas de estilo por URL, lê `unidades.json` e `usp.json` e chama `montar`. `aula-usp servir` serve a aula e o sistema e troca a tag do runtime pela entrada de desenvolvimento. Neste marco os slides aparecem em "folha" (um abaixo do outro); o motor de navegação é o marco 2b.

**Tech Stack:** Node 20+ (máquina do autor: v25.6.1), ES modules, `node:test`, `node:http`; dependências de desenvolvimento `linkedom` (DOM para testes unitários) e `playwright-core` (Chrome headless nos testes de integração, pelo canal `chrome` ou `CHROME_PATH`); Google Chrome instalado.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 3.1, 3.2, 3.5, 4.2 a 4.5, 5.1 a 5.4, 6.3, 6.8, 8.1). Estado de partida: marco 1 na `main` (tokens, contrato, fontes, marcas).

## Global Constraints

- Node 20 ou superior; ES modules; testes com `node:test` e `node:assert/strict`; sem Python.
- `montar/` e `motor/` não importam nada de Node: só API padrão do DOM, para rodar no navegador (spec 3.5).
- Nomes de arquivos, pastas, classes, atributos e identificadores em português, como na spec.
- Classes do cromo são as de `contrato.classesDoSistema` (mais `area`, acrescentada na Task 2); classes do autor nunca são geradas pelo sistema.
- Geometria exata (spec 4.4 e 5.4, variáveis de `estilos/tokens.css`): palco 1280 × 720; margens laterais 64; cabeçalho de y = 40 a 64; título a partir de y = 96; conteúdo até y = 652; linha de base do rodapé em y = 688 (a caixa de linha de 16,8 px começa 13 px acima); faixa de marca com base em y = 680; capa e encerramento com conteúdo até y = 520; abertura com o conjunto título + pergunta terminando em y = 652 e topo ≥ 360.
- Colunas (spec 4.4): `6-6` = 564 + 564; `8-4` = 760 + 368; `4-8` = 368 + 760; `4-4-4` = 368 × 3; calha de 24.
- Mapa (spec 5.4): cabeçalho com quadrados de 16 espaçados de 8; abertura com lado 160 (144 com 7 blocos, 123 com 8), calha de 24, bloco atual em `amarelo` com número em `tinta` a 55 % do lado; 2 a 8 blocos em fileira, 9 ou mais em contador, 0 ou 1 sem mapa.
- Cores só pelos tokens: `visto` = `tinta`, `atual` = `azul` no cabeçalho e `amarelo` na abertura, `futuro` = contorno de 2 px em `tinta`.
- Logos entram como `<img>` com a altura de `unidades.json` e `usp.json`, nunca inline nem recoloridos.
- Instalar dependências npm só com autorização do autor, dada na conversa principal antes de despachar as tarefas 1 e 4.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Decisões herdadas do marco 1 (tomadas pelo controlador; o autor pode revê-las)

- **Área de proteção e borda do palco:** a área de proteção de um logo exclui outros elementos, não a borda do slide. A base da faixa de marca fica em y = 680, mesmo que a proteção da USP (56 px) passe de y = 720.
- **Assinatura da USP:** "Universidade de São Paulo" (Open Sans 600, 20 px, duas linhas alinhadas à direita) e o logo USP formam um grupo, com 20 px entre texto e logo, como na tela aprovada; a proteção vale em volta do grupo.
- **IME:** o lockup IME+USP é um único `<img>`; não se acrescenta a assinatura da USP (`integraUSP: true`).
- **Rótulos em caixa alta:** o texto fica na caixa original no DOM e vira caixa alta por CSS (`text-transform`), o que preserva a leitura por tecnologias assistivas.

## Decisões deste marco (conferidas no Chrome 152 antes de escrever o plano; o autor pode revê-las)

- **`servir` antes do `dist`:** a spec (8.1) manda `servir` usar o runtime local de `dist/`, que só existe no marco 5. Até lá, a tag do runtime vira `montar/navegador.js`, que carrega CSS, fontes e JSON por URL; no marco 5, `servir` passa a apontar para `dist/aula-usp.js`.
- **Tag do runtime nos espécimes:** `<script src="../dist/aula-usp.js"></script>`, sem CDN. Uma tag de CDN sem `integrity` para uma versão ainda não publicada executaria o que outra pessoa publicasse com esse nome. O caminho local não baixa nada, `servir` o reconhece pelo final `/aula-usp.js`, e `aula-usp pacotes` (marco 6) escreve a tag definitiva, com versão e hash.
- **Contador com largura fixa:** `min-width` de 7 caracteres ("17 / 42"), para que o mapa não mude de lugar de um slide para o outro.
- **Linha de base do rodapé:** a caixa do rodapé começa 13 px acima de y = 688, valor medido com a Geist Mono 14/1,2 e guardado numa variável local de `layouts.css`.
- **Roteiro da capa no passo da fileira:** cada coluna do roteiro tem o lado dos quadrados da abertura (160, 144 ou 123) e a calha de 24, de modo que o roteiro antecipa a fileira; por isso `ol.roteiro` também recebe `data-n`.
- **"Bloco N de M" na abertura:** alinhado pela linha de base da primeira linha do `h2`.
- **Ritmo entre blocos de corpo:** 24 px entre blocos em `conteudo` e dentro das colunas; a forma de cada bloco (listas, campos, tabela, código) é do marco 3.
- **Figura:** a imagem ou o SVG encolhe para caber na área, e a legenda vem logo abaixo.
- **Demos:** `img.estatico` fica oculta na tela; o marco 2b (API de demos) e o marco 5 (PDF) passam a usá-la.

## Roteiro atualizado

O marco 2 foi dividido em dois planos, cada um com software funcionando:

| plano | escopo | depende de |
|---|---|---|
| **M2a · Montagem e layouts (este)** | `montar` (blocos, ids, cromo), sete layouts em CSS, fontes em CSS, `aula-usp servir`, entrada de desenvolvimento, espécimes, testes de geometria | M1 |
| M2b · Motor | palco escalado, navegação, URL, passos, notas, visão geral, ajuda, janela do apresentador, API de demos, impressão | M2a |
| M3 · Componentes | campos, exercício, listas, tabela, figura, código, matemática | M2b |
| M4 · Validador | regras estáticas, de carga e de composição, painel | M3 |
| M5 · Build e PDF | embutir, PDF, regras de saída, `dist` com SRI | M4 |
| M6 · Guia e pacotes | guia, modelo, aula-exemplo, pacotes | M5 |
| M7 · Aceite | Claude Code e Codex CLI | M6 |

## Estrutura de arquivos deste marco

| arquivo | responsabilidade |
|---|---|
| `motor/rotulos.js` | textos do sistema em `pt-BR` e `en` (spec 6.8) |
| `montar/metadados.js` | ler as metas da aula e formatar a data no idioma |
| `montar/blocos.js` | texto de títulos com `<br>`, derivação dos blocos, estado dos quadrados |
| `montar/cromo.js` | criar os elementos gerados: cabeçalho, rodapé, metadados da capa, roteiro, fileira, "Bloco N de M", faixa de marca |
| `montar/montar.js` | orquestrar: seções, ids, `div.area`, cromo por layout |
| `montar/navegador.js` | entrada de desenvolvimento no navegador |
| `build/fontes-css.mjs` | gerar `estilos/fontes.css` a partir de `assets/fontes/fontes.json` |
| `build/servir.mjs` | servidor HTTP de desenvolvimento, com troca da tag do runtime e caminhos seguros |
| `bin/aula-usp.mjs` | CLI; neste marco, só `servir` |
| `estilos/fontes.css` | gerado; `@font-face` com URLs relativas |
| `estilos/base.css` | reset, fonte base e modo folha |
| `estilos/layouts.css` | slide, área, cromo e os sete layouts |
| `especime/index.html` | espécime do IME com os sete layouts e três blocos |
| `especime/ifusp.html` | espécime do IFUSP (logo vertical + assinatura USP) |
| `especime/muitos-blocos.html` | espécime com 9 blocos (modo contador) |
| `contrato/contrato.json` | acrescentar `area` a `classesDoSistema` |
| `tests/unit/metadados.test.mjs`, `blocos.test.mjs`, `montar.test.mjs`, `fontes-css.test.mjs`, `servir.test.mjs` | testes unitários |
| `tests/fixtures/servir/index.html`, `tests/fixtures/servir/img/ponto.svg` | aula mínima para o teste do servidor |
| `tests/integracao/layouts.test.mjs` | geometria dos layouts no Chrome headless; grava capturas em `tests/integracao/saida/` (ignorada pelo git) |
| `package.json`, `.gitignore` | `bin`, scripts `fontes:css`, `servir` e `test:integracao`; dependências de desenvolvimento; saída das capturas ignorada |

---

### Task 1: Rótulos, metadados e blocos

**Pré-requisito (sessão principal, antes de despachar):** autorização do autor para instalar `linkedom` do npm como dependência de desenvolvimento.

**Files:**
- Modify: `package.json`, `package-lock.json` (pelo `npm install`)
- Create: `motor/rotulos.js`, `montar/metadados.js`, `montar/blocos.js`
- Test: `tests/unit/metadados.test.mjs`, `tests/unit/blocos.test.mjs`

**Interfaces:**
- Consumes: `contrato/contrato.json` → `limites["blocos.min"]` (2) e `limites["blocos.maxFileira"]` (8).
- Produces (usado pelas tarefas 2 e 3 e pelo M2b):
  - `ROTULOS: { 'pt-BR': Rotulos, en: Rotulos }` e `rotulosPara(lang?: string) → Rotulos`, com `Rotulos = { introducao, encerramento, bloco, de, aula: string, meses: string[12] }`;
  - `lerMetadados(doc) → { unidade, disciplina, aula, data, professor, lang: string }` (metas ausentes viram `''`; `lang` padrão `'pt-BR'`);
  - `formatarData(iso: string, lang?: string) → string` (`'14 set 2026'`, `'14 Sep 2026'`; entrada inválida volta intacta);
  - `textoDeTitulo(elemento | null) → string` (`<br>` vira espaço);
  - `derivarBlocos(secoes: Element[], { minBlocos, maxFileira }) → { blocos: Array<{ numero, titulo, curto, indice }>, blocoDaSecao: Array<number | null>, modo: 'nenhum' | 'fileira' | 'contador' }`;
  - `estadosDosQuadrados(total: number, blocoAtual: number | null, { encerramento?: boolean }) → Array<'visto' | 'atual' | 'futuro'>`.

- [ ] **Step 1: Instalar `linkedom` (só com a autorização do pré-requisito)**

Run: `npm install --save-dev linkedom`
Expected: `package.json` ganha `devDependencies.linkedom`, e `package-lock.json` é criado.

- [ ] **Step 2: Escrever os testes que falham**

Criar `tests/unit/metadados.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { lerMetadados, formatarData } from '../../montar/metadados.js';
import { rotulosPara, ROTULOS } from '../../motor/rotulos.js';

const documento = (cabeca, lang) => parseHTML(
  `<!DOCTYPE html><html${lang ? ` lang="${lang}"` : ''}><head>${cabeca}</head><body></body></html>`,
).document;

test('lerMetadados lê as cinco metas e o idioma', () => {
  const doc = documento(
    '<meta name="unidade" content="ime"><meta name="disciplina" content=" Redes Neurais ">'
    + '<meta name="aula" content="4"><meta name="data" content="2026-09-14">'
    + '<meta name="professor" content="Prof. Renato Vicente">',
    'en',
  );
  assert.deepEqual(lerMetadados(doc), {
    unidade: 'ime', disciplina: 'Redes Neurais', aula: '4', data: '2026-09-14',
    professor: 'Prof. Renato Vicente', lang: 'en',
  });
});

test('metas ausentes viram texto vazio e o idioma padrão é pt-BR', () => {
  assert.deepEqual(lerMetadados(documento('')), {
    unidade: '', disciplina: '', aula: '', data: '', professor: '', lang: 'pt-BR',
  });
});

test('formatarData usa o mês abreviado do idioma, sem zero à esquerda no dia', () => {
  assert.equal(formatarData('2026-09-14', 'pt-BR'), '14 set 2026');
  assert.equal(formatarData('2026-09-04', 'pt-BR'), '4 set 2026');
  assert.equal(formatarData('2026-09-14', 'en'), '14 Sep 2026');
  assert.equal(formatarData('2026-02-01', 'en-US'), '1 Feb 2026');
});

test('formatarData devolve a entrada quando ela não é uma data ISO válida', () => {
  assert.equal(formatarData('2026-13-01', 'pt-BR'), '2026-13-01');
  assert.equal(formatarData('14/09/2026', 'pt-BR'), '14/09/2026');
  assert.equal(formatarData('', 'pt-BR'), '');
});

test('rotulosPara escolhe en para variantes de inglês e pt-BR como padrão', () => {
  assert.equal(rotulosPara('en').introducao, 'Introduction');
  assert.equal(rotulosPara('en-GB').bloco, 'Block');
  assert.equal(rotulosPara('pt-BR').encerramento, 'Encerramento');
  assert.equal(rotulosPara(undefined), ROTULOS['pt-BR']);
  assert.equal(rotulosPara('fr'), ROTULOS['pt-BR']);
  assert.equal(ROTULOS['pt-BR'].meses.length, 12);
  assert.equal(ROTULOS.en.meses.length, 12);
});
```

Criar `tests/unit/blocos.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { textoDeTitulo, derivarBlocos, estadosDosQuadrados } from '../../montar/blocos.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const LIMITES = { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] };
const secoes = (corpo) => [...parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document.body.children];

test('textoDeTitulo troca <br> por espaço e junta o texto dos filhos', () => {
  const [secao] = secoes('<section data-layout="conteudo"><h2>O gradiente aponta a subida;<br>'
    + '<span class="sinal">descemos no sentido oposto.</span></h2></section>');
  assert.equal(textoDeTitulo(secao.querySelector('h2')), 'O gradiente aponta a subida; descemos no sentido oposto.');
  assert.equal(textoDeTitulo(null), '');
});

test('derivarBlocos numera as aberturas e marca a introdução como null', () => {
  const lista = secoes(`
    <section data-layout="capa"><h1>Aula</h1></section>
    <section data-layout="conteudo"><h2>Por que descer?</h2></section>
    <section data-layout="abertura"><h2>Intuição</h2></section>
    <section data-layout="conteudo"><h2>O gradiente</h2></section>
    <section data-layout="abertura" data-curto="Backprop"><h2>Backpropagation</h2></section>
    <section data-layout="conteudo"><h2>A culpa volta</h2></section>
    <section data-layout="encerramento"><h2>O que fica</h2></section>`);
  const { blocos, blocoDaSecao, modo } = derivarBlocos(lista, LIMITES);
  assert.deepEqual(blocos, [
    { numero: 1, titulo: 'Intuição', curto: 'Intuição', indice: 2 },
    { numero: 2, titulo: 'Backpropagation', curto: 'Backprop', indice: 4 },
  ]);
  assert.deepEqual(blocoDaSecao, [null, null, 1, 1, 2, 2, 2]);
  assert.equal(modo, 'fileira');
});

test('modo do mapa segue os limites do contrato: nenhum, fileira ou contador', () => {
  assert.deepEqual(LIMITES, { minBlocos: 2, maxFileira: 8 });
  const aberturas = (n) => secoes(Array.from({ length: n },
    (_, k) => `<section data-layout="abertura"><h2>B${k + 1}</h2></section>`).join(''));
  assert.equal(derivarBlocos(aberturas(0), LIMITES).modo, 'nenhum');
  assert.equal(derivarBlocos(aberturas(1), LIMITES).modo, 'nenhum');
  assert.equal(derivarBlocos(aberturas(2), LIMITES).modo, 'fileira');
  assert.equal(derivarBlocos(aberturas(8), LIMITES).modo, 'fileira');
  assert.equal(derivarBlocos(aberturas(9), LIMITES).modo, 'contador');
});

test('estadosDosQuadrados: vistos antes, atual no bloco, futuros depois', () => {
  assert.deepEqual(estadosDosQuadrados(3, 2), ['visto', 'atual', 'futuro']);
  assert.deepEqual(estadosDosQuadrados(3, 1), ['atual', 'futuro', 'futuro']);
  assert.deepEqual(estadosDosQuadrados(3, null), ['futuro', 'futuro', 'futuro']);
  assert.deepEqual(estadosDosQuadrados(3, 3, { encerramento: true }), ['visto', 'visto', 'visto']);
  assert.deepEqual(estadosDosQuadrados(0, null), []);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/unit/metadados.test.mjs tests/unit/blocos.test.mjs`
Expected: FAIL com `Cannot find module '.../montar/metadados.js'` e `'.../montar/blocos.js'`.

- [ ] **Step 4: Criar `motor/rotulos.js`**

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
  },
  en: {
    introducao: 'Introduction',
    encerramento: 'Closing',
    bloco: 'Block',
    de: 'of',
    aula: 'Lecture',
    meses: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

export function rotulosPara(lang) {
  if (typeof lang === 'string' && lang.toLowerCase().startsWith('en')) return ROTULOS.en;
  return ROTULOS['pt-BR'];
}
```

- [ ] **Step 5: Criar `montar/metadados.js`**

```js
// Metadados da aula (spec 5.2) e data no idioma da aula.
import { rotulosPara } from '../motor/rotulos.js';

const METAS = ['unidade', 'disciplina', 'aula', 'data', 'professor'];

export function lerMetadados(doc) {
  const dados = {};
  for (const nome of METAS) {
    dados[nome] = doc.querySelector(`meta[name="${nome}"]`)?.getAttribute('content')?.trim() ?? '';
  }
  dados.lang = doc.documentElement.getAttribute('lang') || 'pt-BR';
  return dados;
}

export function formatarData(iso, lang) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!partes) return iso ?? '';
  const mes = Number(partes[2]);
  if (mes < 1 || mes > 12) return iso;
  return `${Number(partes[3])} ${rotulosPara(lang).meses[mes - 1]} ${partes[1]}`;
}
```

- [ ] **Step 6: Criar `montar/blocos.js`**

```js
// Blocos da aula derivados das aberturas (spec 5.4).

export function textoDeTitulo(elemento) {
  if (!elemento) return '';
  const partes = [];
  const percorrer = (no) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 3) partes.push(filho.nodeValue);
      else if (filho.nodeType === 1 && filho.nodeName === 'BR') partes.push(' ');
      else if (filho.nodeType === 1) percorrer(filho);
    }
  };
  percorrer(elemento);
  return partes.join('').replace(/\s+/g, ' ').trim();
}

export function derivarBlocos(secoes, { minBlocos, maxFileira }) {
  const blocos = [];
  const blocoDaSecao = [];
  secoes.forEach((secao, indice) => {
    if (secao.getAttribute('data-layout') === 'abertura') {
      const titulo = textoDeTitulo(secao.querySelector('h2'));
      blocos.push({ numero: blocos.length + 1, titulo, curto: secao.getAttribute('data-curto') || titulo, indice });
    }
    blocoDaSecao.push(blocos.length > 0 ? blocos.length : null);
  });
  let modo = 'fileira';
  if (blocos.length < minBlocos) modo = 'nenhum';
  else if (blocos.length > maxFileira) modo = 'contador';
  return { blocos, blocoDaSecao, modo };
}

export function estadosDosQuadrados(total, blocoAtual, { encerramento = false } = {}) {
  return Array.from({ length: total }, (_, k) => {
    const numero = k + 1;
    if (encerramento) return 'visto';
    if (blocoAtual === null) return 'futuro';
    if (numero < blocoAtual) return 'visto';
    return numero === blocoAtual ? 'atual' : 'futuro';
  });
}
```

- [ ] **Step 7: Rodar os testes**

Run: `npm test`
Expected: PASS em todos (46 do marco 1 + 5 de `metadados` + 4 de `blocos` = 55).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json motor/rotulos.js montar/metadados.js montar/blocos.js tests/unit/metadados.test.mjs tests/unit/blocos.test.mjs
git commit -m "feat(montar): rótulos, metadados e derivação dos blocos da aula

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Cromo e montagem

**Files:**
- Create: `montar/cromo.js`, `montar/montar.js`
- Modify: `contrato/contrato.json` (acrescentar `"area"` em `classesDoSistema`, logo depois de `"slide"`)
- Test: `tests/unit/montar.test.mjs`

**Interfaces:**
- Consumes: `lerMetadados`, `formatarData` (`montar/metadados.js`); `textoDeTitulo`, `derivarBlocos`, `estadosDosQuadrados` (`montar/blocos.js`); `rotulosPara` (`motor/rotulos.js`); `assets/marcas/unidades.json` e `usp.json`; `contrato.limites["blocos.min"]` e `["blocos.maxFileira"]`.
- Produces (usado pela Task 3, pelo M2b e pelo M4):
  - `montar(doc, { unidades, usp, urlMarcas: string, limites: { minBlocos, maxFileira } }) → { total: number, modo, blocos: Array<{ numero, titulo, curto, id }> }` (lança `Error('unidade desconhecida: "<chave>"')`);
  - `secoesDaAula(doc) → Element[]` (filhos diretos de `body` que são `section[data-layout]`);
  - `slug(texto) → string`;
  - DOM gerado, por slide: `section.slide[data-indice][data-mapa][data-bloco?]` com `div.area` (conteúdo do autor, menos `aside.notas`); em `conteudo`, `afirmacao`, `figura` e `demo`: `header.cabecalho` (`span.rotulo`, `nav.mapa > a.quadrado.<estado>[href][aria-label]` ou `span.bloco-n-de-m`, `span.contador`) e `footer.rodape`; em `capa`: `div.metadados-capa > p × 2`, `ol.roteiro[data-n] > li > span.quadrado.futuro + span.nome-curto` e `div.faixa-de-marca`; em `abertura`: `ol.fileira[data-n] > li[data-estado] > span.quadrado.<estado> (> span.numero-bloco no atual) + span.nome-curto` e `span.bloco-n-de-m` logo depois do `h2`; em `encerramento`: cabeçalho (todos `visto`) e `div.faixa-de-marca`;
  - faixa de marca: `img.marca-unidade[src][alt][height]` e, se `integraUSP` for falso, `div.marca-usp > span (texto com <br>) + img[src][alt][height]`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/unit/montar.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { montar, slug } from '../../montar/montar.js';

const ler = (caminho) => JSON.parse(readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf8'));
const unidades = ler('assets/marcas/unidades.json');
const usp = ler('assets/marcas/usp.json');
const contrato = ler('contrato/contrato.json');
const limites = { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] };

const cabeca = (unidade, lang = 'pt-BR') => `<!DOCTYPE html><html lang="${lang}"><head>
  <meta name="unidade" content="${unidade}"><meta name="disciplina" content="Aprendizado de Máquina">
  <meta name="aula" content="4"><meta name="data" content="2026-09-14">
  <meta name="professor" content="Prof. Renato Vicente"></head>`;

const AULA_IME = (lang) => `${cabeca('ime', lang)}<body>
  <section data-layout="capa"><h1>Descida do gradiente<br><span class="sinal">o caminho para baixo</span></h1></section>
  <section data-layout="conteudo"><h2>Por que descer?</h2><p>Texto.</p><aside class="notas">Dizer.</aside></section>
  <section data-layout="abertura" id="intuicao"><h2>Intuição</h2><p class="pergunta">Por quê?</p></section>
  <section data-layout="conteudo" id="passo"><h2>O passo</h2>\\[ w \\leftarrow w - \\eta \\]<p>Texto.</p></section>
  <section data-layout="abertura" data-curto="Backprop"><h2>Backpropagation</h2></section>
  <section data-layout="conteudo" id="culpa"><h2>A culpa volta</h2><p>Texto.</p></section>
  <section data-layout="encerramento"><h2>O que fica</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

const montado = (html) => {
  const { document } = parseHTML(html);
  const resumo = montar(document, { unidades, usp, urlMarcas: 'M', limites });
  return { document, resumo };
};
const classes = (lista) => [...lista].map((el) => el.className);
const textos = (lista) => [...lista].map((el) => el.textContent);

test('toda seção vira slide com índice, modo do mapa, bloco e id', () => {
  const { document, resumo } = montado(AULA_IME());
  const slides = [...document.querySelectorAll('section.slide')];
  assert.equal(slides.length, 7);
  assert.deepEqual(slides.map((s) => s.getAttribute('data-indice')), ['1', '2', '3', '4', '5', '6', '7']);
  assert.ok(slides.every((s) => s.getAttribute('data-mapa') === 'fileira'));
  assert.deepEqual(slides.map((s) => s.id),
    ['capa', 'por-que-descer', 'intuicao', 'passo', 'backpropagation', 'culpa', 'encerramento']);
  assert.deepEqual(slides.map((s) => s.getAttribute('data-bloco')), [null, null, '1', '1', '2', '2', '2']);
  assert.deepEqual(resumo, {
    total: 7, modo: 'fileira',
    blocos: [
      { numero: 1, titulo: 'Intuição', curto: 'Intuição', id: 'intuicao' },
      { numero: 2, titulo: 'Backpropagation', curto: 'Backprop', id: 'backpropagation' },
    ],
  });
});

test('conteúdo do autor vai para div.area, com o TeX intacto; notas ficam fora', () => {
  const { document } = montado(AULA_IME());
  const intro = document.getElementById('por-que-descer');
  const area = [...intro.children].find((el) => el.classList.contains('area'));
  assert.deepEqual([...area.children].map((el) => el.nodeName), ['H2', 'P']);
  assert.equal(intro.querySelector('.area aside.notas'), null);
  assert.ok([...intro.children].some((el) => el.nodeName === 'ASIDE' && el.classList.contains('notas')));
  assert.ok(document.getElementById('passo').querySelector('.area').textContent
    .includes('\\[ w \\leftarrow w - \\eta \\]'));
});

test('capa: metadados em duas linhas, roteiro e faixa do IME sem assinatura separada', () => {
  const { document } = montado(AULA_IME());
  const capa = document.getElementById('capa');
  assert.deepEqual(textos(capa.querySelectorAll('.metadados-capa p')),
    ['Aprendizado de Máquina · Aula 4', 'Prof. Renato Vicente · 14 set 2026']);
  assert.equal(capa.querySelector('.roteiro').getAttribute('data-n'), '2');
  assert.deepEqual(textos(capa.querySelectorAll('.roteiro .nome-curto')), ['Intuição', 'Backprop']);
  assert.deepEqual(classes(capa.querySelectorAll('.roteiro .quadrado')), ['quadrado futuro', 'quadrado futuro']);
  const logos = capa.querySelectorAll('.faixa-de-marca img');
  assert.equal(logos.length, 1);
  assert.equal(logos[0].className, 'marca-unidade');
  assert.equal(logos[0].getAttribute('src'), 'M/ime-usp-horizontal-preta.svg');
  assert.equal(logos[0].getAttribute('height'), '88');
  assert.equal(logos[0].getAttribute('alt'),
    'Instituto de Matemática, Estatística e Ciência da Computação · Universidade de São Paulo');
  assert.equal(capa.querySelector('.marca-usp'), null);
  assert.equal(capa.querySelector('.cabecalho'), null);
});

test('introdução: rótulo, quadrados futuros com links, contador e rodapé', () => {
  const { document } = montado(AULA_IME());
  const intro = document.getElementById('por-que-descer');
  assert.equal(intro.querySelector('.cabecalho .rotulo').textContent, 'Introdução');
  const quadrados = intro.querySelectorAll('.cabecalho .mapa .quadrado');
  assert.deepEqual([...quadrados].map((q) => q.getAttribute('href')), ['#intuicao', '#backpropagation']);
  assert.deepEqual(classes(quadrados), ['quadrado futuro', 'quadrado futuro']);
  assert.equal(quadrados[0].getAttribute('aria-label'), 'Bloco 1: Intuição');
  assert.equal(intro.querySelector('.cabecalho .contador').textContent, '2 / 7');
  assert.equal(intro.querySelector('.rodape').textContent, 'Aprendizado de Máquina · Aula 4');
});

test('conteúdo dentro de um bloco: rótulo numerado e quadrados visto e atual', () => {
  const { document } = montado(AULA_IME());
  const culpa = document.getElementById('culpa');
  assert.equal(culpa.querySelector('.rotulo').textContent, '02 · Backpropagation');
  assert.deepEqual(classes(culpa.querySelectorAll('.mapa .quadrado')), ['quadrado visto', 'quadrado atual']);
  assert.equal(culpa.querySelector('.contador').textContent, '6 / 7');
});

test('abertura: fileira com estados, número do atual e "Bloco N de M" depois do título', () => {
  const { document } = montado(AULA_IME());
  const abertura = document.getElementById('backpropagation');
  const fileira = abertura.querySelector('.fileira');
  assert.equal(fileira.getAttribute('data-n'), '2');
  assert.deepEqual([...fileira.children].map((li) => li.getAttribute('data-estado')), ['visto', 'atual']);
  assert.equal(fileira.querySelector('.quadrado.atual .numero-bloco').textContent, '02');
  assert.equal(fileira.querySelector('.quadrado.visto .numero-bloco'), null);
  assert.deepEqual(textos(fileira.querySelectorAll('.nome-curto')), ['Intuição', 'Backprop']);
  const titulo = abertura.querySelector('.area h2');
  assert.equal(titulo.nextElementSibling.className, 'bloco-n-de-m');
  assert.equal(titulo.nextElementSibling.textContent, 'Bloco 2 de 2');
  assert.equal(abertura.querySelector('.cabecalho'), null);
  assert.equal(abertura.querySelector('.rodape'), null);
});

test('encerramento: todos os quadrados vistos, faixa de marca e nenhum rodapé', () => {
  const { document } = montado(AULA_IME());
  const fim = document.getElementById('encerramento');
  assert.equal(fim.querySelector('.rotulo').textContent, 'Encerramento');
  assert.deepEqual(classes(fim.querySelectorAll('.mapa .quadrado')), ['quadrado visto', 'quadrado visto']);
  assert.ok(fim.querySelector('.faixa-de-marca img.marca-unidade'));
  assert.equal(fim.querySelector('.rodape'), null);
});

test('IFUSP: logo vertical e assinatura da USP com o texto em duas linhas', () => {
  const { document } = montado(`${cabeca('ifusp')}<body>
    <section data-layout="capa"><h1>Física</h1></section>
    <section data-layout="abertura"><h2>Um</h2></section>
    <section data-layout="abertura"><h2>Dois</h2></section>
    <section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
  </body></html>`);
  const faixa = document.getElementById('capa').querySelector('.faixa-de-marca');
  const logo = faixa.querySelector('img.marca-unidade');
  assert.equal(logo.getAttribute('src'), 'M/ifusp-vertical-preto.png');
  assert.equal(logo.getAttribute('height'), '128');
  assert.equal(logo.getAttribute('alt'), 'Instituto de Física');
  const assinatura = faixa.querySelector('.marca-usp');
  assert.equal(assinatura.querySelector('span').innerHTML, 'Universidade<br>de São Paulo');
  const logoUsp = assinatura.querySelector('img');
  assert.equal(logoUsp.getAttribute('src'), 'M/usp-preto.svg');
  assert.equal(logoUsp.getAttribute('height'), '56');
  assert.equal(logoUsp.getAttribute('alt'), 'Universidade de São Paulo');
});

test('nove blocos: o cabeçalho troca os quadrados por "Bloco N de M"', () => {
  const aberturas = Array.from({ length: 9 }, (_, k) => `<section data-layout="abertura"><h2>B${k + 1}</h2></section>`
    + (k === 2 ? '<section data-layout="conteudo" id="dentro"><h2>Dentro do terceiro</h2><p>Texto.</p></section>' : ''));
  const { document } = montado(`${cabeca('ime')}<body><section data-layout="capa"><h1>Muitos</h1></section>
    ${aberturas.join('')}<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section></body></html>`);
  assert.ok([...document.querySelectorAll('section.slide')].every((s) => s.getAttribute('data-mapa') === 'contador'));
  const dentro = document.getElementById('dentro');
  assert.equal(dentro.querySelector('.mapa'), null);
  assert.equal(dentro.querySelector('.cabecalho .bloco-n-de-m').textContent, 'Bloco 3 de 9');
  const fim = document.getElementById('encerramento');
  assert.equal(fim.querySelector('.mapa'), null);
  assert.equal(fim.querySelector('.bloco-n-de-m'), null);
  assert.equal(document.querySelector('.fileira').getAttribute('data-n'), '9');
});

test('idioma en: rótulos, rodapé e data em inglês', () => {
  const { document } = montado(AULA_IME('en'));
  assert.equal(document.getElementById('por-que-descer').querySelector('.rotulo').textContent, 'Introduction');
  assert.equal(document.getElementById('por-que-descer').querySelector('.rodape').textContent,
    'Aprendizado de Máquina · Lecture 4');
  assert.equal(document.querySelectorAll('#capa .metadados-capa p')[1].textContent, 'Prof. Renato Vicente · 14 Sep 2026');
  assert.equal(document.getElementById('backpropagation').querySelector('.bloco-n-de-m').textContent, 'Block 2 of 2');
  assert.equal(document.getElementById('encerramento').querySelector('.rotulo').textContent, 'Closing');
});

test('sem aberturas: nenhum mapa, nenhum roteiro e rótulo de introdução', () => {
  const { document } = montado(`${cabeca('ime')}<body>
    <section data-layout="capa"><h1>Curta</h1></section>
    <section data-layout="conteudo"><h2>Só isto</h2><p>Texto.</p></section>
    <section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section></body></html>`);
  const conteudo = document.getElementById('so-isto');
  assert.equal(conteudo.getAttribute('data-mapa'), 'nenhum');
  assert.equal(conteudo.querySelector('.mapa'), null);
  assert.equal(conteudo.querySelector('.bloco-n-de-m'), null);
  assert.equal(conteudo.querySelector('.rotulo').textContent, 'Introdução');
  assert.equal(document.querySelector('.roteiro'), null);
});

test('unidade desconhecida gera erro claro', () => {
  assert.throws(() => montado(AULA_IME().replace('content="ime"', 'content="fea"')), /unidade desconhecida: "fea"/);
});

test('slug remove acentos e pontuação; ids repetidos ganham sufixo', () => {
  assert.equal(slug('Por que descer?'), 'por-que-descer');
  assert.equal(slug('Ação & reação'), 'acao-reacao');
  assert.equal(slug(''), '');
  const { document } = montado(`${cabeca('ime')}<body>
    <section data-layout="conteudo"><h2>Repetido</h2><p>A.</p></section>
    <section data-layout="conteudo"><h2>Repetido</h2><p>B.</p></section></body></html>`);
  assert.deepEqual([...document.querySelectorAll('section.slide')].map((s) => s.id), ['repetido', 'repetido-2']);
});

test('toda classe gerada pelo sistema está em contrato.classesDoSistema', () => {
  const { document } = montado(AULA_IME());
  const doAutor = new Set(Object.keys(contrato.html.classes));
  const geradas = new Set();
  for (const el of document.querySelectorAll('[class]')) {
    for (const nome of el.className.split(/\s+/).filter(Boolean)) if (!doAutor.has(nome)) geradas.add(nome);
  }
  const fora = [...geradas].filter((nome) => !contrato.classesDoSistema.includes(nome));
  assert.deepEqual(fora, []);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/montar.test.mjs`
Expected: FAIL com `Cannot find module '.../montar/montar.js'`.

- [ ] **Step 3: Acrescentar `area` ao contrato**

Em `contrato/contrato.json`, dentro de `classesDoSistema`, inserir `"area"` logo depois de `"slide"`. Nada mais muda no arquivo.

- [ ] **Step 4: Criar `montar/cromo.js`**

```js
// Elementos gerados pelo sistema (spec 5.3 e 5.4). Só API padrão do DOM.

export const pad2 = (numero) => String(numero).padStart(2, '0');

function elemento(doc, tag, classe, texto) {
  const el = doc.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function criarBlocoNdeM(doc, rot, numero, total) {
  return elemento(doc, 'span', 'bloco-n-de-m', `${rot.bloco} ${numero} ${rot.de} ${total}`);
}

export function criarCabecalho(doc, { rotulo, blocos, estados, modo, blocoAtual, contador, rot }) {
  const cabecalho = elemento(doc, 'header', 'cabecalho');
  cabecalho.append(elemento(doc, 'span', 'rotulo', rotulo));
  if (modo === 'fileira') {
    const mapa = elemento(doc, 'nav', 'mapa');
    blocos.forEach((bloco, k) => {
      const quadrado = elemento(doc, 'a', `quadrado ${estados[k]}`);
      quadrado.setAttribute('href', `#${bloco.id}`);
      quadrado.setAttribute('aria-label', `${rot.bloco} ${bloco.numero}: ${bloco.titulo}`);
      mapa.append(quadrado);
    });
    cabecalho.append(mapa);
  } else if (modo === 'contador' && blocoAtual !== null) {
    cabecalho.append(criarBlocoNdeM(doc, rot, blocoAtual, blocos.length));
  }
  cabecalho.append(elemento(doc, 'span', 'contador', contador));
  return cabecalho;
}

export function criarRodape(doc, texto) {
  return elemento(doc, 'footer', 'rodape', texto);
}

export function criarMetadadosCapa(doc, linhas) {
  const metadados = elemento(doc, 'div', 'metadados-capa');
  for (const linha of linhas) metadados.append(elemento(doc, 'p', null, linha));
  return metadados;
}

export function criarRoteiro(doc, blocos) {
  const roteiro = elemento(doc, 'ol', 'roteiro');
  roteiro.setAttribute('data-n', String(blocos.length));
  for (const bloco of blocos) {
    const item = doc.createElement('li');
    item.append(elemento(doc, 'span', 'quadrado futuro'), elemento(doc, 'span', 'nome-curto', bloco.curto));
    roteiro.append(item);
  }
  return roteiro;
}

export function criarFileira(doc, blocos, estados) {
  const fileira = elemento(doc, 'ol', 'fileira');
  fileira.setAttribute('data-n', String(blocos.length));
  blocos.forEach((bloco, k) => {
    const item = doc.createElement('li');
    item.setAttribute('data-estado', estados[k]);
    const quadrado = elemento(doc, 'span', `quadrado ${estados[k]}`);
    if (estados[k] === 'atual') quadrado.append(elemento(doc, 'span', 'numero-bloco', pad2(bloco.numero)));
    item.append(quadrado, elemento(doc, 'span', 'nome-curto', bloco.curto));
    fileira.append(item);
  });
  return fileira;
}

export function criarFaixaDeMarca(doc, { unidade, usp, urlMarcas }) {
  const faixa = elemento(doc, 'div', 'faixa-de-marca');
  const logo = elemento(doc, 'img', 'marca-unidade');
  logo.setAttribute('src', `${urlMarcas}/${unidade.arquivo}`);
  logo.setAttribute('alt', unidade.integraUSP ? `${unidade.nome} · ${usp.texto}` : unidade.nome);
  logo.setAttribute('height', String(unidade.altura));
  faixa.append(logo);
  if (!unidade.integraUSP) {
    const assinatura = elemento(doc, 'div', 'marca-usp');
    const texto = doc.createElement('span');
    const [primeira, ...resto] = usp.texto.split(' ');
    texto.append(doc.createTextNode(primeira), doc.createElement('br'), doc.createTextNode(resto.join(' ')));
    const logoUsp = doc.createElement('img');
    logoUsp.setAttribute('src', `${urlMarcas}/${usp.arquivo}`);
    logoUsp.setAttribute('alt', usp.texto);
    logoUsp.setAttribute('height', String(usp.altura));
    assinatura.append(texto, logoUsp);
    faixa.append(assinatura);
  }
  return faixa;
}
```

- [ ] **Step 5: Criar `montar/montar.js`**

```js
// Montagem da aula: seções viram slides, com ids, área e cromo (spec 3.1, 5.3, 5.4 e 6.3).
import { lerMetadados, formatarData } from './metadados.js';
import { derivarBlocos, estadosDosQuadrados, textoDeTitulo } from './blocos.js';
import {
  criarCabecalho, criarRodape, criarMetadadosCapa, criarRoteiro, criarFileira, criarFaixaDeMarca, criarBlocoNdeM, pad2,
} from './cromo.js';
import { rotulosPara } from '../motor/rotulos.js';

export function slug(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40).replace(/-+$/, '');
}

export function secoesDaAula(doc) {
  return [...doc.body.children].filter((el) => el.nodeName === 'SECTION' && el.hasAttribute('data-layout'));
}

function atribuirIds(secoes) {
  const usados = new Set(secoes.map((secao) => secao.getAttribute('id')).filter(Boolean));
  secoes.forEach((secao, i) => {
    if (secao.getAttribute('id')) return;
    const layout = secao.getAttribute('data-layout');
    const base = layout === 'capa' || layout === 'encerramento'
      ? layout
      : slug(textoDeTitulo(secao.querySelector('h1, h2, p.afirmacao'))) || `slide-${i + 1}`;
    let id = base;
    for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
    usados.add(id);
    secao.setAttribute('id', id);
  });
}

function envolverEmArea(doc, secao) {
  const area = doc.createElement('div');
  area.className = 'area';
  for (const no of [...secao.childNodes]) {
    const ehNota = no.nodeType === 1 && no.nodeName === 'ASIDE' && no.classList.contains('notas');
    if (!ehNota) area.append(no);
  }
  secao.prepend(area);
  return area;
}

export function montar(doc, { unidades, usp, urlMarcas, limites }) {
  const meta = lerMetadados(doc);
  const unidade = unidades[meta.unidade];
  if (!unidade) throw new Error(`unidade desconhecida: "${meta.unidade}"`);
  const rot = rotulosPara(meta.lang);
  const secoes = secoesDaAula(doc);
  atribuirIds(secoes);
  const { blocos, blocoDaSecao, modo } = derivarBlocos(secoes, limites);
  for (const bloco of blocos) bloco.id = secoes[bloco.indice].getAttribute('id');
  const total = secoes.length;
  const rodape = `${meta.disciplina} · ${rot.aula} ${meta.aula}`;

  secoes.forEach((secao, i) => {
    const layout = secao.getAttribute('data-layout');
    const numero = blocoDaSecao[i];
    secao.classList.add('slide');
    secao.setAttribute('data-indice', String(i + 1));
    secao.setAttribute('data-mapa', modo);
    if (numero !== null) secao.setAttribute('data-bloco', String(numero));
    const area = envolverEmArea(doc, secao);

    if (layout === 'capa') {
      area.append(criarMetadadosCapa(doc, [rodape, `${meta.professor} · ${formatarData(meta.data, meta.lang)}`]));
      if (modo !== 'nenhum') area.append(criarRoteiro(doc, blocos));
      secao.append(criarFaixaDeMarca(doc, { unidade, usp, urlMarcas }));
      return;
    }
    if (layout === 'abertura') {
      if (modo === 'nenhum') return;
      secao.prepend(criarFileira(doc, blocos, estadosDosQuadrados(blocos.length, numero)));
      area.querySelector('h2')?.after(criarBlocoNdeM(doc, rot, numero, blocos.length));
      return;
    }
    const encerramento = layout === 'encerramento';
    let rotulo = rot.introducao;
    if (encerramento) rotulo = rot.encerramento;
    else if (numero !== null) rotulo = `${pad2(numero)} · ${blocos[numero - 1].titulo}`;
    secao.prepend(criarCabecalho(doc, {
      rotulo,
      blocos,
      modo,
      rot,
      estados: estadosDosQuadrados(blocos.length, numero, { encerramento }),
      blocoAtual: encerramento ? null : numero,
      contador: `${i + 1} / ${total}`,
    }));
    secao.append(encerramento ? criarFaixaDeMarca(doc, { unidade, usp, urlMarcas }) : criarRodape(doc, rodape));
  });

  return { total, modo, blocos: blocos.map(({ numero, titulo, curto, id }) => ({ numero, titulo, curto, id })) };
}
```

- [ ] **Step 6: Rodar os testes**

Run: `npm test`
Expected: PASS em todos (55 + 14 de `montar` = 69); `contrato.test.mjs` continua passando com `area` em `classesDoSistema`.

- [ ] **Step 7: Commit**

```bash
git add montar/cromo.js montar/montar.js contrato/contrato.json tests/unit/montar.test.mjs
git commit -m "feat(montar): cromo gerado e montagem dos slides por layout

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: Servidor de desenvolvimento, entrada do navegador e fontes em CSS

**Files:**
- Create: `build/fontes-css.mjs`, `build/servir.mjs`, `bin/aula-usp.mjs`, `montar/navegador.js`
- Create (gerado): `estilos/fontes.css`
- Create: `tests/fixtures/servir/index.html`, `tests/fixtures/servir/img/ponto.svg`
- Modify: `package.json` (campo `bin` e scripts `fontes:css` e `servir`)
- Test: `tests/unit/fontes-css.test.mjs`, `tests/unit/servir.test.mjs`

**Interfaces:**
- Consumes: `montar(doc, { unidades, usp, urlMarcas, limites })` (Task 2); `assets/fontes/fontes.json` (M1); `contrato.limites`.
- Produces (usado pela Task 4, pelo M2b e pelo M5):
  - `gerarFontesCss(manifesto) → string` (um `@font-face` por item, `url('../assets/fontes/<arquivo>')`, `font-weight` como faixa `min max` quando há vários pesos);
  - `PREFIXO = '/_aula-usp/'`, `RAIZ_SISTEMA`, `PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'assets', 'tokens', 'contrato']`;
  - `reescreverRuntime(html) → string` (troca a tag cujo `src` termina em `/aula-usp.js` por `<script type="module" src="/_aula-usp/montar/navegador.js"></script>`, removendo `integrity`);
  - `resolverSeguro(raiz, caminhoUrl) → string | null`;
  - `criarServidor({ pastaAula }) → http.Server` (não chama `listen`);
  - CLI `aula-usp servir <pasta> [--porta 8765]` (uso inválido → código 2);
  - `montar/navegador.js`: carrega os quatro CSS e os JSON, chama `montar`, põe `body.folha`, espera `document.fonts.ready` e marca `body[data-montado="sim"]` (ou `"erro"`, com um `pre.painel` com a mensagem).

- [ ] **Step 1: Criar as fixtures**

`tests/fixtures/servir/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Fixture do servidor</title>
<script src="https://cdn.jsdelivr.net/npm/aula-usp@1.0.0/dist/aula-usp.js"
        integrity="sha384-abc" crossorigin="anonymous"></script>
<script src="demos/exemplo.js"></script>
</head>
<body>
<section data-layout="capa"><h1>Fixture</h1></section>
</body>
</html>
```

`tests/fixtures/servir/img/ponto.svg`:

```html
<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#0A0A0A"/></svg>
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `tests/unit/fontes-css.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gerarFontesCss } from '../../build/fontes-css.mjs';

const raiz = new URL('../../', import.meta.url);
const manifesto = JSON.parse(await readFile(new URL('assets/fontes/fontes.json', raiz), 'utf8'));
const bloco = (css, arquivo) => css.split('@font-face').find((parte) => parte.includes(`/${arquivo}'`));

test('um @font-face por arquivo do manifesto, com URL relativa, estilo, pesos e unicode-range', () => {
  const css = gerarFontesCss(manifesto);
  assert.equal(css.match(/@font-face/g).length, manifesto.length);
  const geist = bloco(css, 'geist-normal-latin.woff2');
  assert.match(geist, /font-family: 'Geist';/);
  assert.match(geist, /font-style: normal;/);
  assert.match(geist, /font-weight: 400 600;/);
  assert.match(geist, /src: url\('\.\.\/assets\/fontes\/geist-normal-latin\.woff2'\) format\('woff2'\);/);
  assert.match(geist, /unicode-range: U\+0000-00FF/);
  assert.match(bloco(css, 'geist-italico-latin.woff2'), /font-style: italic;/);
  assert.match(bloco(css, 'geist-mono-normal-latin.woff2'), /font-weight: 400 700;/);
  assert.match(bloco(css, 'open-sans-normal-latin.woff2'), /font-weight: 600;/);
});

test('estilos/fontes.css no repositório está atualizado', async () => {
  assert.equal(await readFile(new URL('estilos/fontes.css', raiz), 'utf8'), gerarFontesCss(manifesto));
});
```

Criar `tests/unit/servir.test.mjs`:

```js
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

const pedir = (caminho) => new Promise((pronto, falha) => {
  get({ ...endereco, path: caminho }, (resposta) => {
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
  assert.ok(saida.includes(`<script type="module" src="${PREFIXO}montar/navegador.js"></script>`));
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

test('servidor entrega a aula com a tag do runtime trocada', async () => {
  const resposta = await pedir('/');
  assert.equal(resposta.status, 200);
  assert.match(resposta.tipo, /^text\/html/);
  assert.ok(resposta.corpo.includes(`src="${PREFIXO}montar/navegador.js"`));
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
});

test('servidor recusa pastas do sistema fora da lista e travessias codificadas', async () => {
  assert.equal((await pedir(`${PREFIXO}package.json`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}bin/aula-usp.mjs`)).status, 403);
  assert.equal((await pedir(`${PREFIXO}estilos/..%2f..%2fpackage.json`)).status, 403);
  assert.equal((await pedir('/..%2f..%2fpackage.json')).status, 403);
});

test('servidor responde 404 para arquivo inexistente', async () => {
  assert.equal((await pedir('/nao-existe.html')).status, 404);
  assert.equal((await pedir(`${PREFIXO}estilos/nao-existe.css`)).status, 404);
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
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/unit/fontes-css.test.mjs tests/unit/servir.test.mjs`
Expected: FAIL com `Cannot find module '.../build/fontes-css.mjs'` e `'.../build/servir.mjs'`.

- [ ] **Step 4: Criar `build/fontes-css.mjs`**

```js
// Gera estilos/fontes.css (modo de desenvolvimento, URLs relativas) a partir de assets/fontes/fontes.json.
//   node build/fontes-css.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('../', import.meta.url);

export function gerarFontesCss(manifesto) {
  const faces = manifesto.map((fonte) => {
    const pesos = fonte.pesos.length > 1
      ? `${Math.min(...fonte.pesos)} ${Math.max(...fonte.pesos)}`
      : String(fonte.pesos[0]);
    return [
      '@font-face {',
      `  font-family: '${fonte.familia}';`,
      `  font-style: ${fonte.estilo};`,
      `  font-weight: ${pesos};`,
      '  font-display: swap;',
      `  src: url('../assets/fontes/${fonte.arquivo}') format('woff2');`,
      `  unicode-range: ${fonte.unicodeRange};`,
      '}',
    ].join('\n');
  });
  return `/* Gerado por build/fontes-css.mjs a partir de assets/fontes/fontes.json. Não editar à mão. */\n${faces.join('\n')}\n`;
}

async function principal() {
  const manifesto = JSON.parse(await readFile(new URL('assets/fontes/fontes.json', RAIZ), 'utf8'));
  await writeFile(new URL('estilos/fontes.css', RAIZ), gerarFontesCss(manifesto));
  console.log(`estilos/fontes.css gerado com ${manifesto.length} @font-face`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
```

- [ ] **Step 5: Criar `build/servir.mjs`**

```js
// Servidor de desenvolvimento do Aula USP (spec 8.1): serve a aula e, sob /_aula-usp/,
// as pastas do sistema; troca a tag do runtime pela entrada de desenvolvimento.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_SISTEMA = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
export const PREFIXO = '/_aula-usp/';
export const PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'assets', 'tokens', 'contrato'];

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
    `<script type="module" src="${PREFIXO}montar/navegador.js"></script>`,
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
  const alvo = resolve(raiz, `.${decodificado.startsWith('/') ? '' : '/'}${decodificado}`);
  return alvo === raiz || alvo.startsWith(raiz + sep) ? alvo : null;
}

function localizar(raizAula, pathname) {
  if (pathname.startsWith(PREFIXO)) {
    const [pasta, ...resto] = pathname.slice(PREFIXO.length).split('/');
    if (!PASTAS_DO_SISTEMA.includes(pasta)) return null;
    return resolverSeguro(resolve(RAIZ_SISTEMA, pasta), `/${resto.join('/')}`);
  }
  return resolverSeguro(raizAula, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
}

export function criarServidor({ pastaAula }) {
  const raizAula = resolve(pastaAula);
  return createServer(async (pedido, resposta) => {
    const { pathname } = new URL(pedido.url, 'http://localhost');
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

- [ ] **Step 6: Criar `bin/aula-usp.mjs`**

```js
#!/usr/bin/env node
// CLI do Aula USP. Neste marco, só o comando `servir`.
import { statSync } from 'node:fs';
import { criarServidor } from '../build/servir.mjs';

const USO = 'uso: aula-usp servir <pasta> [--porta 8765]';

function sair(mensagem) {
  console.error(mensagem);
  process.exit(2);
}

function lerArgumentos(argumentos) {
  const opcoes = { porta: 8765 };
  const posicionais = [];
  for (let i = 0; i < argumentos.length; i++) {
    if (argumentos[i] === '--porta') opcoes.porta = Number(argumentos[++i]);
    else posicionais.push(argumentos[i]);
  }
  return { opcoes, posicionais };
}

function servir(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos);
  const [pasta] = posicionais;
  if (!pasta || !Number.isInteger(opcoes.porta) || opcoes.porta < 0 || opcoes.porta > 65535) sair(USO);
  let ehPasta = false;
  try {
    ehPasta = statSync(pasta).isDirectory();
  } catch {
    ehPasta = false;
  }
  if (!ehPasta) sair(`pasta não encontrada: ${pasta}`);
  const servidor = criarServidor({ pastaAula: pasta });
  servidor.on('error', (erro) => sair(`não foi possível servir: ${erro.message}`));
  servidor.listen(opcoes.porta, '127.0.0.1', () => {
    console.log(`servindo ${pasta} em http://127.0.0.1:${servidor.address().port}/`);
  });
}

const [comando, ...argumentos] = process.argv.slice(2);
if (comando === 'servir') servir(argumentos);
else sair(USO);
```

Run: `chmod +x bin/aula-usp.mjs`

- [ ] **Step 7: Criar `montar/navegador.js`**

```js
// Entrada do modo navegador em desenvolvimento, servida por `aula-usp servir` (spec 3.2).
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

const ocultar = document.createElement('style');
ocultar.textContent = 'body { visibility: hidden; }';
document.head.append(ocultar);

try {
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
  ocultar.remove();
}
```

Esta entrada só roda no navegador; ela é exercitada pelos testes de integração da Task 4.

- [ ] **Step 8: Registrar CLI e scripts, e gerar `estilos/fontes.css`**

```bash
npm pkg set "bin.aula-usp=bin/aula-usp.mjs"
npm pkg set "scripts.fontes:css=node build/fontes-css.mjs"
npm pkg set "scripts.servir=node bin/aula-usp.mjs servir"
npm run fontes:css
```

Expected: a última linha imprime `estilos/fontes.css gerado com 8 @font-face`.

- [ ] **Step 9: Rodar os testes**

Run: `npm test`
Expected: PASS em todos (69 + 2 de `fontes-css` + 8 de `servir` = 79).

- [ ] **Step 10: Commit**

```bash
git add build/fontes-css.mjs build/servir.mjs bin/aula-usp.mjs montar/navegador.js estilos/fontes.css tests/fixtures/servir tests/unit/fontes-css.test.mjs tests/unit/servir.test.mjs package.json
git commit -m "feat(servir): servidor de desenvolvimento, entrada do navegador e fontes em CSS

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 4: Layouts em CSS, espécimes e testes no Chrome

**Pré-requisitos (sessão principal, antes de despachar):** autorização do autor para instalar `playwright-core` do npm como dependência de desenvolvimento; Google Chrome instalado (ou o executável indicado em `CHROME_PATH`).

**Files:**
- Modify: `package.json`, `package-lock.json` (pelo `npm install` e pelo script `test:integracao`), `.gitignore`
- Create: `especime/index.html`, `especime/ifusp.html`, `especime/muitos-blocos.html`
- Create: `estilos/base.css`, `estilos/layouts.css`
- Test: `tests/integracao/layouts.test.mjs`

**Interfaces:**
- Consumes: o DOM gerado por `montar` (Task 2): `section.slide[data-layout][data-mapa]`, `div.area`, `header.cabecalho` (`.rotulo`, `nav.mapa > a.quadrado.<estado>`, `.bloco-n-de-m`, `.contador`), `footer.rodape`, `div.metadados-capa`, `ol.roteiro[data-n]`, `ol.fileira[data-n] > li[data-estado]`, `.numero-bloco`, `.nome-curto`, `div.faixa-de-marca`, `img.marca-unidade`, `div.marca-usp`; `criarServidor` (Task 3); `body[data-montado="sim" | "erro"]` e `pre.painel`, marcados por `montar/navegador.js` (Task 3); as variáveis de `estilos/tokens.css` (marco 1).
- Produces (usado pelo M2b, M3 e M5):
  - `estilos/base.css`: caixa, papel e tinta, texto de leitura e o modo `body.folha`;
  - `estilos/layouts.css`: slide de 1280 × 720, área, grades, cromo e os sete layouts; a variável `--lado` em `.fileira` e `.roteiro` (160, 144 ou 123 px);
  - espécimes em `especime/`: IME em `pt-BR` com 13 slides e 3 blocos, IFUSP em `en` com 6 slides e 2 blocos, e 12 slides com 9 blocos;
  - `npm run test:integracao` (11 testes, capturas em `tests/integracao/saida/`).

- [ ] **Step 1: Instalar `playwright-core` (só com a autorização do pré-requisito)**

Run: `npm install --save-dev playwright-core`
Expected: `package.json` ganha `devDependencies["playwright-core"]`. O pacote não baixa navegador; os testes usam o Chrome instalado.

- [ ] **Step 2: Criar os espécimes**

Os três espécimes seguem o contrato (seções 5.1 a 5.3) e servem de fixture para os testes deste marco e dos próximos. A tag do runtime aponta para `../dist/aula-usp.js` (ver "Decisões deste marco").

Criar `especime/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Espécime do Aula USP</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Espécime do Aula USP">
<meta name="aula" content="M2a">
<meta name="data" content="2026-09-15">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Espécime Aula USP<br><span class="sinal">layouts e cromo</span></h1>
</section>

<section data-layout="conteudo" id="o-que-mostra">
  <h2>O que este espécime mostra</h2>
  <p class="lide">Os sete layouts, com o cromo gerado a partir das seções.</p>
  <p>Cada seção vira um slide de 1280 por 720. O sistema cria o cabeçalho, o mapa de blocos, o contador e o rodapé.</p>
  <ul>
    <li>Três blocos, cada um aberto por uma abertura.</li>
    <li>Grades de duas e de três colunas.</li>
  </ul>
  <aside class="notas">Estas notas não aparecem no slide.</aside>
</section>

<section data-layout="abertura" id="blocos">
  <h2>Blocos</h2>
  <p class="pergunta">Como o mapa de quadrados orienta quem assiste?</p>
</section>

<section data-layout="conteudo" id="grade-8-4">
  <h2>Grade 8-4<br><span class="sinal">texto largo e coluna estreita</span></h2>
  <div class="colunas" data-grade="8-4">
    <div>
      <p>A coluna larga tem oito colunas do grid, com 760 px. Ela recebe o argumento principal do slide.</p>
    </div>
    <div>
      <p>A estreita tem quatro colunas, com 368 px.</p>
    </div>
  </div>
</section>

<section data-layout="afirmacao" id="afirmacao">
  <p class="afirmacao">Todo elemento gráfico carrega informação: orientação, progresso ou destaque.</p>
  <p class="fonte">Princípio do Aula USP</p>
</section>

<section data-layout="abertura" id="figuras-e-demos" data-curto="Figuras">
  <h2>Figuras e demos</h2>
  <p class="pergunta">Onde entram imagens e interação?</p>
</section>

<section data-layout="figura" id="figura">
  <h2>Uma figura ocupa a zona de conteúdo</h2>
  <figure>
    <svg viewBox="0 0 1152 360" role="img" aria-label="Três quadrados: visto, atual e futuro">
      <rect x="0" y="40" width="280" height="280" fill="#0A0A0A"/>
      <rect x="436" y="40" width="280" height="280" fill="#1094AB"/>
      <rect x="873" y="41" width="278" height="278" fill="none" stroke="#0A0A0A" stroke-width="2"/>
    </svg>
    <figcaption>Os três estados de um quadrado do mapa: visto, atual e futuro.</figcaption>
  </figure>
</section>

<section data-layout="demo" id="demo">
  <h2>Uma demo ocupa o resto do slide</h2>
  <div class="demo" data-demo="contador">
    <img class="estatico" alt="Imagem estática da demo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23D9D9D9'/%3E%3C/svg%3E">
  </div>
</section>

<section data-layout="abertura" id="grades">
  <h2>Grades</h2>
  <p class="pergunta">Como o conteúdo se divide em colunas?</p>
</section>

<section data-layout="conteudo" id="grade-6-6">
  <h2>Grade 6-6</h2>
  <div class="colunas" data-grade="6-6">
    <div><p>Metade da largura útil: 564 px.</p></div>
    <div><p>A outra metade, depois de uma calha de 24 px.</p></div>
  </div>
</section>

<section data-layout="conteudo" id="grade-4-8">
  <h2>Grade 4-8</h2>
  <div class="colunas" data-grade="4-8">
    <div><p>Estreita à esquerda.</p></div>
    <div><p>Larga à direita, com 760 px.</p></div>
  </div>
</section>

<section data-layout="conteudo" id="grade-4-4-4">
  <h2>Grade 4-4-4</h2>
  <div class="colunas" data-grade="4-4-4">
    <div><p>Primeira coluna.</p></div>
    <div><p>Segunda coluna.</p></div>
    <div><p>Terceira coluna.</p></div>
  </div>
</section>

<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>As seções viram slides.</li>
    <li>O mapa de blocos vem das aberturas.</li>
  </ol>
  <p class="proxima">Próximo marco: o motor de navegação.</p>
</section>

</body>
</html>
```

Criar `especime/ifusp.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Aula USP specimen · IFUSP</title>
<meta name="unidade" content="ifusp">
<meta name="disciplina" content="Statistical Physics">
<meta name="aula" content="2">
<meta name="data" content="2026-09-15">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Random walks<br><span class="sinal">and diffusion</span></h1>
</section>

<section data-layout="abertura" id="walks">
  <h2>Walks</h2>
  <p class="pergunta">Where does a drunkard end up after many steps?</p>
</section>

<section data-layout="conteudo" id="one-step">
  <h2>One step at a time</h2>
  <p>Each step moves left or right with equal probability.</p>
</section>

<section data-layout="abertura" id="diffusion">
  <h2>Diffusion</h2>
</section>

<section data-layout="conteudo" id="spreading">
  <h2>The cloud spreads</h2>
  <p>The spread grows with the square root of time.</p>
</section>

<section data-layout="encerramento">
  <h2>Takeaways</h2>
  <ol class="sintese">
    <li>Steps add up to a spread.</li>
  </ol>
</section>

</body>
</html>
```

Criar `especime/muitos-blocos.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Espécime do Aula USP · nove blocos</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Cálculo">
<meta name="aula" content="9">
<meta name="data" content="2026-09-15">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Nove blocos<br><span class="sinal">modo contador</span></h1>
</section>

<section data-layout="abertura">
  <h2>Conjuntos</h2>
</section>

<section data-layout="abertura">
  <h2>Funções</h2>
</section>

<section data-layout="abertura">
  <h2>Limites</h2>
</section>

<section data-layout="conteudo" id="dentro-do-terceiro">
  <h2>Dentro do terceiro bloco</h2>
  <p>O cabeçalho mostra o bloco em texto.</p>
</section>

<section data-layout="abertura">
  <h2>Derivadas</h2>
</section>

<section data-layout="abertura">
  <h2>Integrais</h2>
</section>

<section data-layout="abertura">
  <h2>Séries</h2>
</section>

<section data-layout="abertura">
  <h2>Vetores</h2>
</section>

<section data-layout="abertura">
  <h2>Matrizes</h2>
</section>

<section data-layout="abertura">
  <h2>Espectros</h2>
</section>

<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>Com nove blocos, o mapa vira texto.</li>
  </ol>
</section>

</body>
</html>
```

- [ ] **Step 3: Escrever o teste de integração que falha**

O teste sobe `criarServidor` numa porta livre, abre cada espécime no Chrome e mede as caixas em relação ao slide. A linha de base é medida com uma sonda `inline-block` de altura zero, que se apoia na linha de base do texto. O teste de transbordo ignora elementos `inline`, porque a caixa de um `span` num título de entrelinha 1,0 passa da caixa de linha sem que nada saia do lugar.

Criar `tests/integracao/layouts.test.mjs`:

```js
// Geometria dos layouts no Chrome, sobre os espécimes servidos por `aula-usp servir` (spec 4.4, 4.5, 5.4 e 11.2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { criarServidor } from '../../build/servir.mjs';

const RAIZ = new URL('../../', import.meta.url);
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
let endereco;
const paginas = new Map();

before(async () => {
  servidor = criarServidor({ pastaAula: fileURLToPath(new URL('especime/', RAIZ)) });
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));
  endereco = `http://127.0.0.1:${servidor.address().port}`;
  navegador = await chromium.launch(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : { channel: 'chrome' });
  await mkdir(SAIDA, { recursive: true });
});

after(async () => {
  await navegador?.close();
  await new Promise((fim) => servidor.close(fim));
});

async function abrir(arquivo) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  pagina.on('pageerror', (erro) => erros.push(erro.message));
  pagina.on('console', (mensagem) => {
    if (mensagem.type() === 'error' && !mensagem.location().url.endsWith('/favicon.ico')) erros.push(mensagem.text());
  });
  await pagina.goto(`${endereco}/${arquivo}`);
  await pagina.waitForFunction(() => document.body.dataset.montado !== undefined);
  const estado = await pagina.evaluate(() => [document.body.dataset.montado, document.querySelector('pre.painel')?.textContent]);
  assert.equal(estado[0], 'sim', estado[1]);
  await pagina.evaluate(() => document.fonts.ready);
  return { pagina, erros };
}

function especime(arquivo) {
  if (!paginas.has(arquivo)) paginas.set(arquivo, abrir(arquivo));
  return paginas.get(arquivo);
}

const perto = (obtido, esperado, descricao) => assert.ok(Math.abs(obtido - esperado) <= 0.5, `${descricao}: ${obtido} em vez de ${esperado}`);

function caixas(pagina, id, seletor) {
  return pagina.evaluate(([idSlide, sel]) => {
    const slide = document.getElementById(idSlide);
    const s = slide.getBoundingClientRect();
    return [...slide.querySelectorAll(sel)].filter((el) => el.getClientRects().length > 0).map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - s.left, y: r.top - s.top, largura: r.width, altura: r.height, direita: r.right - s.left, base: r.bottom - s.top };
    });
  }, [id, seletor]);
}

const caixa = async (pagina, id, seletor) => (await caixas(pagina, id, seletor))[0];

function estilos(pagina, id, seletor, propriedades) {
  return pagina.evaluate(([idSlide, sel, props]) => [...document.getElementById(idSlide).querySelectorAll(sel)]
    .map((el) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]))), [id, seletor, propriedades]);
}

function linhaDeBase(pagina, id, seletor) {
  return pagina.evaluate(([idSlide, sel]) => {
    const slide = document.getElementById(idSlide);
    const sonda = document.createElement('span');
    sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    slide.querySelector(sel).prepend(sonda);
    const y = sonda.getBoundingClientRect().top - slide.getBoundingClientRect().top;
    sonda.remove();
    return y;
  }, [id, seletor]);
}

function familiasCarregadas(pagina) {
  return pagina.evaluate(() => [...new Set([...document.fonts]
    .filter((fonte) => fonte.status === 'loaded').map((fonte) => fonte.family.replaceAll('"', '')))].sort());
}

test('espécime do IME: 13 slides de 1280 × 720, montados sem erros no console', async () => {
  const { pagina, erros } = await especime('index.html');
  const slides = await pagina.evaluate(() => [...document.querySelectorAll('section.slide')]
    .map((s) => [s.id, s.getBoundingClientRect().width, s.getBoundingClientRect().height]));
  assert.equal(slides.length, 13);
  assert.ok(slides.every(([, largura, altura]) => largura === 1280 && altura === 720), JSON.stringify(slides));
  assert.deepEqual(erros, []);
  assert.deepEqual(await familiasCarregadas(pagina), ['Geist', 'Geist Mono']);
});

test('zonas: cabeçalho de 40 a 64, área de 96 a 652, rodapé com linha de base em 688', async () => {
  const { pagina } = await especime('index.html');
  for (const id of ['o-que-mostra', 'grade-8-4', 'afirmacao', 'figura', 'demo', 'grade-4-4-4']) {
    const cabecalho = await caixa(pagina, id, '.cabecalho');
    perto(cabecalho.y, 40, `${id}: topo do cabeçalho`);
    perto(cabecalho.base, 64, `${id}: base do cabeçalho`);
    perto(cabecalho.x, 64, `${id}: margem esquerda do cabeçalho`);
    perto(cabecalho.direita, 1216, `${id}: margem direita do cabeçalho`);
    const area = await caixa(pagina, id, ':scope > .area');
    perto(area.y, 96, `${id}: topo da área`);
    perto(area.base, 652, `${id}: base da área`);
    perto(await linhaDeBase(pagina, id, '.rodape'), 688, `${id}: linha de base do rodapé`);
  }
  const fim = await caixa(pagina, 'encerramento', ':scope > .area');
  perto(fim.y, 96, 'encerramento: topo da área');
  perto(fim.base, 520, 'encerramento: base da área');
  assert.equal(await caixa(pagina, 'encerramento', '.rodape'), undefined);
});

test('mapa do cabeçalho: quadrados de 16 px a cada 24 px, cores por estado e posição fixa entre slides', async () => {
  const { pagina } = await especime('index.html');
  const noBloco1 = await caixas(pagina, 'grade-8-4', '.mapa .quadrado');
  assert.deepEqual(noBloco1.map((q) => [q.largura, q.altura]), [[16, 16], [16, 16], [16, 16]]);
  perto(noBloco1[1].x - noBloco1[0].x, 24, 'passo entre quadrados');
  perto(noBloco1[0].y, 44, 'quadrados centrados no cabeçalho');
  for (const id of ['o-que-mostra', 'figura', 'grade-4-4-4', 'encerramento']) {
    perto((await caixa(pagina, id, '.mapa .quadrado')).x, noBloco1[0].x, `${id}: posição do mapa`);
  }
  const propriedades = ['backgroundColor', 'borderTopWidth', 'borderTopColor'];
  const [visto, atual, futuro] = await estilos(pagina, 'figura', '.mapa .quadrado', propriedades);
  assert.equal(visto.backgroundColor, TINTA);
  assert.equal(atual.backgroundColor, AZUL);
  assert.equal(futuro.backgroundColor, TRANSPARENTE);
  assert.equal(futuro.borderTopWidth, '2px');
  assert.equal(futuro.borderTopColor, TINTA);
  const contador = await caixa(pagina, 'figura', '.contador');
  perto(contador.direita, 1216, 'contador na margem direita');
});

test('grades de colunas com as larguras do grid de 12 colunas', async () => {
  const { pagina } = await especime('index.html');
  const esperadas = {
    'grade-8-4': [[64, 760], [848, 368]],
    'grade-6-6': [[64, 564], [652, 564]],
    'grade-4-8': [[64, 368], [456, 760]],
    'grade-4-4-4': [[64, 368], [456, 368], [848, 368]],
  };
  for (const [id, colunas] of Object.entries(esperadas)) {
    const obtidas = await caixas(pagina, id, '.colunas > div');
    assert.deepEqual(obtidas.map((c) => [Math.round(c.x), Math.round(c.largura)]), colunas, id);
  }
});

test('capa: título em y = 96, roteiro até y = 520 no passo da fileira, logo do IME com base em 680 e proteção livre', async () => {
  const { pagina } = await especime('index.html');
  perto((await caixa(pagina, 'capa', 'h1')).y, 96, 'topo do h1');
  const roteiro = await caixa(pagina, 'capa', '.roteiro');
  perto(roteiro.base, 520, 'base do roteiro');
  const quadrados = await caixas(pagina, 'capa', '.roteiro .quadrado');
  assert.deepEqual(quadrados.map((q) => [Math.round(q.x), q.largura, q.altura]), [[64, 24, 24], [248, 24, 24], [432, 24, 24]]);
  const [logo, ...outros] = await caixas(pagina, 'capa', '.faixa-de-marca img');
  assert.equal(outros.length, 0);
  perto(logo.altura, unidades.ime.altura, 'altura do logo do IME');
  perto(logo.base, 680, 'base do logo do IME');
  perto(logo.x, 64, 'logo do IME na margem');
  const conteudo = await caixas(pagina, 'capa', ':scope > .area > *');
  const baseDoConteudo = Math.max(...conteudo.map((c) => c.base));
  assert.ok(logo.y - unidades.ime.protecao >= baseDoConteudo, `proteção do IME invadida: ${logo.y} - ${unidades.ime.protecao} < ${baseDoConteudo}`);
});

test('abertura: fileira a partir de y = 96, atual em amarelo com número a 55 %, título com base em 652 e "Bloco N de M" à direita', async () => {
  const { pagina } = await especime('index.html');
  const id = 'figuras-e-demos';
  const quadrados = await caixas(pagina, id, '.fileira .quadrado');
  assert.deepEqual(quadrados.map((q) => [Math.round(q.x), q.y, q.largura, q.altura]),
    [[64, 96, 160, 160], [248, 96, 160, 160], [432, 96, 160, 160]]);
  const cores = await estilos(pagina, id, '.fileira .quadrado', ['backgroundColor', 'borderTopWidth']);
  assert.deepEqual(cores.map((c) => c.backgroundColor), [TINTA, AMARELO, TRANSPARENTE]);
  assert.equal(cores[2].borderTopWidth, '2px');
  const [numero] = await estilos(pagina, id, '.numero-bloco', ['fontSize', 'color']);
  assert.deepEqual(numero, { fontSize: '88px', color: TINTA });
  perto((await caixa(pagina, id, '.fileira .nome-curto')).y, 272, 'nomes 16 px abaixo dos quadrados');
  const area = await caixa(pagina, id, ':scope > .area');
  perto(area.base, 652, 'base do conjunto título e pergunta');
  assert.ok(area.y >= 360, `topo do conjunto acima de 360: ${area.y}`);
  const titulo = await caixa(pagina, id, 'h2');
  perto(titulo.largura, 908, 'largura do título ao lado da faixa de 220 px');
  const blocoNdeM = await caixa(pagina, id, '.bloco-n-de-m');
  perto(blocoNdeM.direita, 1216, '"Bloco N de M" na margem direita');
  assert.ok(blocoNdeM.x >= 64 + 908 + 24, `"Bloco N de M" fora da faixa: ${blocoNdeM.x}`);
  perto(await linhaDeBase(pagina, id, '.bloco-n-de-m'), await linhaDeBase(pagina, id, 'h2'), 'alinhado à primeira linha do título');
});

test('fileira e roteiro encolhem para 144 px com 7 blocos e 123 px com 8', async () => {
  const { pagina } = await especime('index.html');
  const lados = await pagina.evaluate(() => {
    const medir = (el, n) => {
      el.dataset.n = n;
      const largura = el.querySelector('li').getBoundingClientRect().width;
      el.dataset.n = '3';
      return largura;
    };
    const fileira = document.querySelector('#blocos .fileira');
    const roteiro = document.querySelector('#capa .roteiro');
    return [medir(fileira, '7'), medir(fileira, '8'), medir(roteiro, '7'), medir(roteiro, '8')];
  });
  assert.deepEqual(lados, [144, 123, 144, 123]);
});

test('nenhum elemento de bloco sai da área em nenhum slide dos três espécimes', async () => {
  for (const arquivo of ['index.html', 'ifusp.html', 'muitos-blocos.html']) {
    const { pagina } = await especime(arquivo);
    const fora = await pagina.evaluate(() => {
      const achados = [];
      for (const slide of document.querySelectorAll('section.slide')) {
        const area = slide.querySelector(':scope > .area').getBoundingClientRect();
        for (const el of slide.querySelectorAll(':scope > .area *')) {
          if (el.getClientRects().length === 0 || getComputedStyle(el).display === 'inline') continue;
          const r = el.getBoundingClientRect();
          if (r.bottom > area.bottom + 0.5 || r.right > area.right + 0.5 || r.left < area.left - 0.5 || r.top < area.top - 0.5) {
            achados.push(`${slide.id}: ${el.nodeName.toLowerCase()}`);
          }
        }
      }
      return achados;
    });
    assert.deepEqual(fora, [], arquivo);
  }
});

test('IFUSP em inglês: logo vertical de 128 px, assinatura da USP com 20 px de espaço, bases em 680 e proteções livres', async () => {
  const { pagina, erros } = await especime('ifusp.html');
  assert.deepEqual(erros, []);
  for (const id of ['capa', 'encerramento']) {
    const [logo, logoUsp] = await caixas(pagina, id, '.faixa-de-marca img');
    perto(logo.altura, unidades.ifusp.altura, `${id}: altura do logo do IFUSP`);
    perto(logo.base, 680, `${id}: base do logo do IFUSP`);
    perto(logo.x, 64, `${id}: logo do IFUSP na margem`);
    perto(logoUsp.altura, usp.altura, `${id}: altura do logo USP`);
    perto(logoUsp.base, 680, `${id}: base do logo USP`);
    perto(logoUsp.direita, 1216, `${id}: logo USP na margem direita`);
    const texto = await caixa(pagina, id, '.marca-usp > span');
    perto(logoUsp.x - texto.direita, 20, `${id}: espaço entre texto e logo USP`);
    const assinatura = await caixa(pagina, id, '.marca-usp');
    const conteudo = await caixas(pagina, id, ':scope > .area > *');
    const baseDoConteudo = Math.max(...conteudo.map((c) => c.base));
    assert.ok(logo.y - unidades.ifusp.protecao >= baseDoConteudo, `${id}: proteção do IFUSP invadida`);
    assert.ok(assinatura.y - usp.protecao >= baseDoConteudo, `${id}: proteção da USP invadida`);
    assert.ok(assinatura.x - usp.protecao >= logo.direita + unidades.ifusp.protecao, `${id}: logos perto demais`);
  }
  assert.deepEqual(await familiasCarregadas(pagina), ['Geist', 'Geist Mono', 'Open Sans']);
  const textos = await pagina.evaluate(() => [
    document.querySelector('#one-step .rotulo').textContent,
    document.querySelector('#walks .bloco-n-de-m').textContent,
    document.querySelector('#encerramento .rotulo').textContent,
    document.querySelector('#spreading .rodape').textContent,
  ]);
  assert.deepEqual(textos, ['01 · Walks', 'Block 1 of 2', 'Closing', 'Statistical Physics · Lecture 2']);
});

test('nove blocos: "Bloco 3 de 9" no cabeçalho, abertura só com o campo atual e roteiro numerado em até duas linhas', async () => {
  const { pagina, erros } = await especime('muitos-blocos.html');
  assert.deepEqual(erros, []);
  assert.equal(await pagina.evaluate(() => document.querySelector('#dentro-do-terceiro .cabecalho .bloco-n-de-m').textContent), 'Bloco 3 de 9');
  assert.equal(await caixa(pagina, 'dentro-do-terceiro', '.mapa'), undefined);
  const visiveis = await caixas(pagina, 'derivadas', '.fileira > li');
  assert.equal(visiveis.length, 1);
  assert.deepEqual(await caixas(pagina, 'derivadas', '.fileira .nome-curto'), []);
  const [quadrado] = await caixas(pagina, 'derivadas', '.fileira .quadrado');
  assert.deepEqual([Math.round(quadrado.x), quadrado.y, quadrado.largura], [64, 96, 160]);
  assert.equal(await pagina.evaluate(() => document.querySelector('#derivadas .numero-bloco').textContent), '04');
  const itens = await caixas(pagina, 'capa', '.roteiro > li');
  assert.equal(itens.length, 9);
  assert.ok(new Set(itens.map((item) => Math.round(item.y))).size <= 2, 'roteiro em mais de duas linhas');
  assert.deepEqual(await caixas(pagina, 'capa', '.roteiro .quadrado'), []);
  assert.ok((await caixa(pagina, 'capa', '.roteiro')).base <= 520.5);
});

test('capturas de todos os slides em tests/integracao/saida/', async () => {
  for (const arquivo of ['index.html', 'ifusp.html', 'muitos-blocos.html']) {
    const { pagina } = await especime(arquivo);
    const slides = pagina.locator('section.slide');
    const total = await slides.count();
    for (let i = 0; i < total; i++) {
      await slides.nth(i).screenshot({ path: join(SAIDA, `${arquivo.replace('.html', '')}-${String(i + 1).padStart(2, '0')}.png`) });
    }
  }
  const gravadas = (await readdir(SAIDA)).filter((nome) => nome.endsWith('.png'));
  assert.equal(gravadas.length, 13 + 6 + 12);
});
```

- [ ] **Step 4: Registrar o script e ignorar as capturas**

```bash
npm pkg set "scripts.test:integracao=node --test tests/integracao/*.test.mjs"
printf '\n# saídas de teste\ntests/integracao/saida/\n' >> .gitignore
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm run test:integracao`
Expected: FAIL nos 11 testes; o primeiro mostra `AssertionError [ERR_ASSERTION]: Aula USP: não carregou estilos/base.css`, porque `montar/navegador.js` marca `data-montado="erro"` quando uma folha de estilo não carrega.

- [ ] **Step 6: Criar `estilos/base.css`**

```css
/* Base do Aula USP: caixa, papel e tinta, texto de leitura e o modo folha (spec 4.2 a 4.4). */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: var(--cor-papel);
  color: var(--cor-tinta);
}

body {
  font-family: var(--tipo-leitura-familia);
  font-size: var(--tipo-leitura-tamanho);
  font-weight: var(--tipo-leitura-peso);
  line-height: var(--tipo-leitura-entrelinha);
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
p,
ol,
ul,
figure {
  margin: 0;
}

strong {
  font-weight: var(--tipo-leitura-peso-enfase);
}

img,
svg {
  display: block;
}

/* Modo folha (marco 2a): slides um abaixo do outro. O marco 2b troca pelo palco escalado. */
body.folha {
  display: grid;
  justify-content: center;
  gap: var(--espaco-5);
  padding: var(--espaco-5);
}

body.folha .slide {
  outline: var(--regua-fina) solid var(--cor-linha);
}
```

- [ ] **Step 7: Criar `estilos/layouts.css`**

```css
/* Slide, cromo e os sete layouts (spec 4.4, 5.3 e 5.4), em px lógicos do palco de 1280 × 720. */

/* ---------- slide e área ---------- */

.slide {
  position: relative;
  width: var(--palco-largura);
  height: var(--palco-altura);
  overflow: hidden;
  background: var(--cor-papel);
  color: var(--cor-tinta);
}

.slide > aside.notas {
  display: none;
}

.area {
  position: absolute;
  left: var(--palco-margem);
  right: var(--palco-margem);
  top: var(--zona-titulo-topo);
  bottom: calc(var(--palco-altura) - var(--zona-conteudo-base));
  display: flex;
  flex-direction: column;
}

.area > h2 {
  font-family: var(--tipo-titulo-familia);
  font-size: var(--tipo-titulo-tamanho);
  font-weight: var(--tipo-titulo-peso);
  line-height: var(--tipo-titulo-entrelinha);
  letter-spacing: var(--tipo-titulo-tracking);
  margin-bottom: var(--espaco-4);
}

.sinal {
  color: var(--cor-azul);
}

/* Ritmo entre blocos de corpo; a forma de cada bloco é do marco 3. */
.slide[data-layout="conteudo"] > .area > :not(h2, .lide) + *,
.colunas > div > * + * {
  margin-top: var(--espaco-3);
}

.area > p.lide {
  font-family: var(--tipo-lide-familia);
  font-size: var(--tipo-lide-tamanho);
  font-weight: var(--tipo-lide-peso);
  line-height: var(--tipo-lide-entrelinha);
  margin-bottom: var(--espaco-3);
}

/* ---------- grades (spec 4.4) ---------- */

.colunas {
  --col-4: calc(4 * var(--palco-coluna) + 3 * var(--palco-calha));
  --col-6: calc(6 * var(--palco-coluna) + 5 * var(--palco-calha));
  --col-8: calc(8 * var(--palco-coluna) + 7 * var(--palco-calha));
  display: grid;
  column-gap: var(--palco-calha);
  align-items: start;
}

.colunas[data-grade="12"] { grid-template-columns: var(--palco-util); }
.colunas[data-grade="6-6"] { grid-template-columns: var(--col-6) var(--col-6); }
.colunas[data-grade="8-4"] { grid-template-columns: var(--col-8) var(--col-4); }
.colunas[data-grade="4-8"] { grid-template-columns: var(--col-4) var(--col-8); }
.colunas[data-grade="4-4-4"] { grid-template-columns: var(--col-4) var(--col-4) var(--col-4); }

/* ---------- rótulos do cromo (spec 4.3) ---------- */

.cabecalho,
.nome-curto,
.roteiro {
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  line-height: var(--tipo-rotulo-entrelinha);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

/* ---------- quadrados do mapa (spec 5.4) ---------- */

.quadrado {
  display: block;
}

.quadrado.visto { background: var(--cor-tinta); }
.quadrado.atual { background: var(--cor-azul); }
.quadrado.futuro { border: var(--regua-normal) solid var(--cor-tinta); }
.fileira .quadrado.atual { background: var(--cor-amarelo); }

/* ---------- cabeçalho e rodapé ---------- */

.cabecalho {
  position: absolute;
  left: var(--palco-margem);
  right: var(--palco-margem);
  top: var(--zona-cabecalho-topo);
  height: calc(var(--zona-cabecalho-base) - var(--zona-cabecalho-topo));
  display: flex;
  align-items: center;
  gap: var(--espaco-2);
  white-space: nowrap;
}

.cabecalho .rotulo {
  margin-right: auto;
}

.cabecalho .mapa {
  display: flex;
  gap: var(--mapa-espaco-cabecalho);
}

.cabecalho .quadrado {
  width: var(--mapa-quadrado-cabecalho);
  height: var(--mapa-quadrado-cabecalho);
}

.cabecalho .contador {
  min-width: calc(7 * (1ch + var(--tipo-rodape-tracking)));
  text-align: right;
  font-weight: var(--tipo-rodape-peso);
  font-variant-numeric: tabular-nums;
}

.rodape {
  position: absolute;
  left: var(--palco-margem);
  right: var(--palco-margem);
  top: calc(var(--zona-rodape-base) - var(--rodape-linha-de-base));
  font-family: var(--tipo-rodape-familia);
  font-size: var(--tipo-rodape-tamanho);
  font-weight: var(--tipo-rodape-peso);
  line-height: var(--tipo-rodape-entrelinha);
  letter-spacing: var(--tipo-rodape-tracking);
  text-transform: var(--tipo-rodape-caixa);
  color: var(--cor-cinza);
  --rodape-linha-de-base: 13px;
}

/* ---------- capa e encerramento ---------- */

.slide[data-layout="capa"] > .area,
.slide[data-layout="encerramento"] > .area {
  bottom: calc(var(--palco-altura) - var(--zona-capa-conteudo-base));
}

.slide[data-layout="capa"] h1 {
  font-family: var(--tipo-capa-familia);
  font-size: var(--tipo-capa-tamanho);
  font-weight: var(--tipo-capa-peso);
  line-height: var(--tipo-capa-entrelinha);
  letter-spacing: var(--tipo-capa-tracking);
}

.metadados-capa {
  margin-top: var(--espaco-4);
}

.fileira,
.roteiro {
  --lado: var(--mapa-quadrado-abertura-max);
  list-style: none;
  padding: 0;
  display: flex;
  gap: var(--mapa-calha-abertura);
}

.fileira[data-n="7"],
.roteiro[data-n="7"] {
  --lado: calc((var(--palco-util) - 6 * var(--mapa-calha-abertura)) / 7);
}

.fileira[data-n="8"],
.roteiro[data-n="8"] {
  --lado: calc((var(--palco-util) - 7 * var(--mapa-calha-abertura)) / 8);
}

.roteiro {
  margin-top: auto;
}

.roteiro > li {
  width: var(--lado);
}

.roteiro .quadrado {
  width: var(--mapa-quadrado-capa);
  height: var(--mapa-quadrado-capa);
  margin-bottom: var(--espaco-2);
}

.slide[data-mapa="contador"] .roteiro {
  flex-wrap: wrap;
  row-gap: var(--espaco-1);
  counter-reset: bloco;
}

.slide[data-mapa="contador"] .roteiro > li {
  width: auto;
  counter-increment: bloco;
}

.slide[data-mapa="contador"] .roteiro > li::before {
  content: counter(bloco, decimal-leading-zero) " ";
}

.slide[data-mapa="contador"] .roteiro .quadrado {
  display: none;
}

.slide[data-layout="encerramento"] .proxima {
  margin-top: var(--espaco-4);
}

/* ---------- faixa de marca (spec 4.5) ---------- */

.faixa-de-marca {
  position: absolute;
  left: var(--palco-margem);
  right: var(--palco-margem);
  bottom: calc(var(--palco-altura) - var(--zona-marca-base));
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.marca-usp {
  display: flex;
  align-items: center;
  gap: 20px;
}

.marca-usp > span {
  font-family: var(--tipo-marca-usp-familia);
  font-size: var(--tipo-marca-usp-tamanho);
  font-weight: var(--tipo-marca-usp-peso);
  line-height: var(--tipo-marca-usp-entrelinha);
  text-align: right;
}

/* ---------- abertura ---------- */

.fileira {
  position: absolute;
  left: var(--palco-margem);
  top: var(--zona-titulo-topo);
  margin: 0;
}

.fileira > li {
  width: var(--lado);
}

.fileira .quadrado {
  width: var(--lado);
  height: var(--lado);
  display: flex;
  align-items: flex-end;
  padding: var(--espaco-2);
}

.fileira .numero-bloco {
  font-family: var(--tipo-abertura-familia);
  font-size: calc(var(--lado) * var(--mapa-numero-proporcao));
  font-weight: var(--tipo-abertura-peso);
  line-height: 0.8;
  letter-spacing: -0.03em;
  color: var(--cor-tinta);
}

.fileira .nome-curto {
  display: block;
  margin-top: var(--espaco-2);
}

.fileira > li[data-estado="futuro"] .nome-curto {
  color: var(--cor-cinza);
}

.slide[data-mapa="contador"] .fileira {
  --lado: var(--mapa-quadrado-abertura-max);
}

.slide[data-mapa="contador"] .fileira > li:not([data-estado="atual"]),
.slide[data-mapa="contador"] .fileira .nome-curto {
  display: none;
}

.slide[data-layout="abertura"] > .area {
  top: auto;
  max-height: calc(var(--zona-conteudo-base) - var(--zona-abertura-titulo-topo-min));
  display: grid;
  grid-template-columns: 1fr var(--mapa-faixa-bloco-n-de-m);
  column-gap: var(--palco-calha);
  align-items: baseline;
}

.slide[data-layout="abertura"] > .area > h2 {
  grid-column: 1;
  grid-row: 1;
  margin: 0;
  font-family: var(--tipo-abertura-familia);
  font-size: var(--tipo-abertura-tamanho);
  font-weight: var(--tipo-abertura-peso);
  line-height: var(--tipo-abertura-entrelinha);
  letter-spacing: var(--tipo-abertura-tracking);
}

.slide[data-layout="abertura"] .bloco-n-de-m {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  font-family: var(--tipo-rotulo-grande-familia);
  font-size: var(--tipo-rotulo-grande-tamanho);
  font-weight: var(--tipo-rotulo-grande-peso);
  line-height: var(--tipo-rotulo-grande-entrelinha);
  letter-spacing: var(--tipo-rotulo-grande-tracking);
  text-transform: var(--tipo-rotulo-grande-caixa);
  white-space: nowrap;
}

.slide[data-layout="abertura"] .pergunta {
  grid-column: 1;
  grid-row: 2;
  margin-top: var(--espaco-3);
  font-family: var(--tipo-lide-familia);
  font-size: var(--tipo-lide-tamanho);
  font-weight: var(--tipo-lide-peso);
  line-height: var(--tipo-lide-entrelinha);
}

/* ---------- afirmação ---------- */

.slide[data-layout="afirmacao"] > .area {
  justify-content: center;
}

.afirmacao {
  font-family: var(--tipo-afirmacao-familia);
  font-size: var(--tipo-afirmacao-tamanho);
  font-weight: var(--tipo-afirmacao-peso);
  line-height: var(--tipo-afirmacao-entrelinha);
  letter-spacing: var(--tipo-afirmacao-tracking);
}

.fonte,
figcaption {
  font-family: var(--tipo-legenda-familia);
  font-size: var(--tipo-legenda-tamanho);
  font-weight: var(--tipo-legenda-peso);
  line-height: var(--tipo-legenda-entrelinha);
  color: var(--cor-cinza);
}

.afirmacao + .fonte {
  margin-top: var(--espaco-3);
}

/* ---------- figura ---------- */

.slide[data-layout="figura"] figure {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.slide[data-layout="figura"] figure > img,
.slide[data-layout="figura"] figure > svg {
  flex: 0 1 auto;
  min-height: 0;
  width: 100%;
  height: auto;
  object-fit: contain;
  object-position: left top;
}

figcaption {
  margin-top: var(--espaco-2);
}

figure[data-foto="pb"] img {
  filter: grayscale(1);
}

/* ---------- demo ---------- */

.slide[data-layout="demo"] .demo {
  flex: 1;
  min-height: 0;
  position: relative;
}

.demo > img.estatico {
  display: none;
}
```

- [ ] **Step 8: Rodar os testes**

Run: `npm run test:integracao`
Expected: PASS nos 11 testes, com 31 capturas em `tests/integracao/saida/`.

Run: `npm test`
Expected: PASS nos 79 testes unitários (esta tarefa não acrescenta testes unitários).

Se só a linha de base do rodapé falhar por 1 px (outra versão do Chrome ou da fonte), medir de novo e ajustar `--rodape-linha-de-base` em `layouts.css`, registrando o valor no relatório; não mudar a tolerância do teste.

- [ ] **Step 9: Conferir as capturas**

Abrir `tests/integracao/saida/index-01.png` (capa), `index-02.png` (introdução), `index-06.png` (abertura), `index-07.png` (figura), `ifusp-01.png` (capa do IFUSP) e `muitos-blocos-06.png` (abertura com 9 blocos) e comparar com a opção C de `docs/superpowers/specs/referencias/2026-09-14-aula-usp/composicao.html`: cabeçalho com rótulo à esquerda e mapa à direita; abertura com a fileira no alto, o bloco atual em amarelo com o número embaixo à esquerda, e o título embaixo; capa com o roteiro alinhado às colunas da fileira e a faixa de marca na base. Descrever no relatório qualquer diferença de composição (não de conteúdo).

Para ver no navegador: `npm run servir -- especime` e abrir `http://127.0.0.1:8765/`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json .gitignore especime estilos/base.css estilos/layouts.css tests/integracao/layouts.test.mjs
git commit -m "feat(estilos): layouts, espécimes e geometria conferida no Chrome

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
