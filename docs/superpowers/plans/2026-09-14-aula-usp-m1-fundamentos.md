# Aula USP · Marco 1 (Fundamentos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a base do Aula USP: tokens com geração de CSS e JS, o contrato de HTML completo, as fontes embutíveis e as marcas oficiais das unidades, tudo coberto por testes.

**Architecture:** Um repositório Node em ES modules, sem dependências de execução neste marco. `tokens/aula-usp.tokens.json` (DTCG 2025.10) gera `estilos/tokens.css` e `tokens/tokens.js`; `contrato/contrato.json` é o contrato de dados que os marcos seguintes (montagem, validador, guia) leem; `build/fontes.mjs` e `build/marcas.mjs` baixam uma vez, com autorização do autor, os arquivos oficiais para `assets/`.

**Tech Stack:** Node 20+ (máquina do autor: v25.6.1), `node:test`, `fetch` nativo, poppler (`pdftocairo`, `pdftoppm`, `pdftotext`, instalados em `/opt/homebrew/bin`), Google Chrome headless (`/Applications/Google Chrome.app`) para conferir logos.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 3.5, 4.1 a 4.5, 5.2 a 5.6, 9.2, 12 · marco 1).

## Global Constraints

- Node 20 ou superior; ES modules (`"type": "module"`); testes com `node:test` e `node:assert/strict`; sem Python.
- Nomes de arquivos, pastas, chaves e identificadores em português, exatamente como na spec (seção 3.5).
- Cores exatas: `papel #FFFFFF`, `tinta #0A0A0A`, `cinza #666666`, `linha #D9D9D9`, `azul #1094AB`, `amarelo #FCB421`.
- Tipografia exata da tabela 4.3 da spec; grid e zonas exatos da seção 4.4.
- Limites exatos da tabela de limites da seção 5.3 da spec (capa 23, abertura 20, título 50, `data-curto` 10…).
- **Nenhum download sem autorização explícita do autor**, dada na conversa principal antes de despachar as tarefas 3 e 4. Só as URLs listadas neste plano.
- Logos nunca redesenhados, recoloridos, distorcidos ou com efeito; a conversão de PDF para SVG não altera traços.
- Manuais das unidades são baixados para uma pasta temporária fora do repositório e não entram no git.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- `package.json` fica com `"private": true` até a fase 3 (publicação).

## Roteiro dos planos da fase 1

Cada marco da spec (seção 12) ganha o seu plano, escrito quando o anterior termina:

| plano | escopo | depende de |
|---|---|---|
| **M1 · Fundamentos (este)** | tokens e gerados; `contrato.json`; fontes; marcas e `unidades.json` | — |
| M2 · Montagem e motor | `montar`, sete layouts, mapa de blocos, navegação, passos, notas, visão geral, ajuda, apresentador, API de demos, impressão, `aula-usp.js` mínimo, `servir`, espécime navegável | M1 |
| M3 · Componentes | campos, exercício, listas, tabela, figura, código (Shiki), matemática (KaTeX, `\passo`), nos dois modos | M2 |
| M4 · Validador | regras estáticas, de carga e de composição da fase 1, painel, `validar --json`, fixtures | M1, M3 |
| M5 · Build e PDF | embutir, motor embutido, PDF, regras de saída, comparação visual, `dist` com SRI, `cobertura.json` | M4 |
| M6 · Guia e pacotes | guia, modelo, aula-exemplo, `pacotes`, `AGENTS.md`, `CLAUDE.md` | M5 |
| M7 · Aceite | roteiro de aceite com Claude Code e Codex CLI | M6 |

## Estrutura de arquivos deste marco

| arquivo | responsabilidade |
|---|---|
| `package.json` | metadados, `engines`, scripts `test`, `tokens`, `fontes`, `marcas` |
| `tokens/aula-usp.tokens.json` | fonte única de tokens (DTCG 2025.10) |
| `build/tokens.mjs` | lê os tokens, calcula contraste WCAG e gera `estilos/tokens.css` e `tokens/tokens.js` |
| `estilos/tokens.css` | gerado; variáveis CSS |
| `tokens/tokens.js` | gerado; constantes para validador e gráficos |
| `contrato/contrato.json` | layouts, conteúdo permitido, papéis, vocabulário HTML e SVG, proibidos, TeX, limites, regras |
| `build/fontes.mjs` | lê o CSS do Google Fonts, deduplica arquivos variáveis, baixa woff2 e licenças, grava manifesto |
| `assets/fontes/*.woff2`, `assets/fontes/fontes.json`, `assets/fontes/licencas/*-OFL.txt` | gerados pelo script |
| `build/marcas.mjs` | baixa os logos oficiais e converte o logo USP de PDF para SVG |
| `assets/marcas/origem/usp-logo.pdf` | original da SCS-USP, guardado para rastreabilidade |
| `assets/marcas/usp-preto.svg`, `ime-usp-horizontal-preta.svg`, `ifusp-vertical-preto.png` | logos em uso |
| `assets/marcas/unidades.json` | descrição das unidades (seção 4.5 da spec) |
| `assets/marcas/README.md` | origem de cada arquivo e regras dos manuais, com páginas citadas |
| `tests/unit/tokens.test.mjs`, `contrato.test.mjs`, `fontes.test.mjs`, `marcas.test.mjs` | testes |
| `tests/fixtures/fontes/google-geist.css` | CSS de exemplo para testar o parser sem rede |

---

### Task 1: Esqueleto do repositório e tokens

**Files:**
- Create: `package.json`
- Create: `tokens/aula-usp.tokens.json`
- Create: `build/tokens.mjs`
- Create (gerados): `estilos/tokens.css`, `tokens/tokens.js`
- Test: `tests/unit/tokens.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces (usado por M2 em diante):
  - `lerTokens(caminho?) → Promise<object>` (JSON bruto dos tokens);
  - `simplificar(tokens) → { cor: {papel,tinta,cinza,linha,azul,amarelo: string}, fonte: {sans,mono,marca: string[]}, tipo: {<papel>: {familia: string[], tamanho: number, peso: number, entrelinha: number, tracking: number, caixa?: 'alta', pesoEnfase?: number}}, minimo, palco, zona, espaco, regua, contraste, mapa, marca: {<nome>: number} }`;
  - `gerarCss(tokens) → string`, `gerarJs(tokens) → string`;
  - `luminancia(hex) → number`, `contraste(hexA, hexB) → number` (razão WCAG);
  - variáveis CSS `--<grupo>-<nome>` em kebab-case; tipografia em `--tipo-<papel>-{familia,tamanho,peso,entrelinha,tracking}`, mais `-caixa` e `-peso-enfase` quando existem;
  - `tokens/tokens.js` com `export const tokens` (o objeto de `simplificar`) e `export default tokens`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "aula-usp",
  "version": "0.1.0",
  "description": "Design system de aulas em HTML para a USP, usado com Claude e GPT.",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test tests/unit/*.test.mjs",
    "tokens": "node build/tokens.mjs",
    "fontes": "node build/fontes.mjs",
    "marcas": "node build/marcas.mjs"
  }
}
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `tests/unit/tokens.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lerTokens, simplificar, gerarCss, gerarJs, contraste } from '../../build/tokens.mjs';

const tokens = await lerTokens();
const s = simplificar(tokens);

test('cores têm os valores exatos da spec (4.2)', () => {
  assert.deepEqual(s.cor, {
    papel: '#FFFFFF', tinta: '#0A0A0A', cinza: '#666666',
    linha: '#D9D9D9', azul: '#1094AB', amarelo: '#FCB421',
  });
});

test('componentes sRGB coincidem com o hexadecimal', () => {
  for (const [nome, t] of Object.entries(tokens.cor)) {
    if (nome.startsWith('$')) continue;
    const esperado = [1, 3, 5].map((i) => parseInt(t.$value.hex.slice(i, i + 2), 16) / 255);
    t.$value.components.forEach((c, i) => assert.ok(Math.abs(c - esperado[i]) < 0.001, `${nome}[${i}]`));
  }
});

test('contrastes citados na spec (4.2)', () => {
  const c = (a, b) => Math.round(contraste(a, b) * 10) / 10;
  assert.equal(c('#0A0A0A', '#FFFFFF'), 19.8);
  assert.equal(c('#666666', '#FFFFFF'), 5.7);
  assert.equal(c('#1094AB', '#FFFFFF'), 3.6);
  assert.equal(c('#FCB421', '#FFFFFF'), 1.8);
  assert.equal(c('#0A0A0A', '#FCB421'), 11.0);
});

test('tipografia da tabela 4.3', () => {
  const t = s.tipo;
  const linha = (n) => [t[n].tamanho, t[n].entrelinha, t[n].peso];
  assert.deepEqual(linha('capa'), [96, 1, 600]);
  assert.deepEqual(linha('abertura'), [84, 1, 600]);
  assert.deepEqual(linha('afirmacao'), [64, 1.08, 600]);
  assert.deepEqual(linha('titulo'), [44, 1.08, 600]);
  assert.deepEqual(linha('numeral'), [40, 1, 600]);
  assert.deepEqual(linha('lide'), [32, 1.25, 400]);
  assert.deepEqual(linha('leitura'), [24, 1.42, 400]);
  assert.deepEqual(linha('codigo'), [20, 1.45, 400]);
  assert.deepEqual(linha('legenda'), [18, 1.35, 400]);
  assert.deepEqual(linha('rotulo'), [14, 1.2, 700]);
  assert.deepEqual(linha('rodape'), [14, 1.2, 400]);
  assert.deepEqual(linha('rotuloGrande'), [20, 1.2, 700]);
  assert.deepEqual(linha('marcaUsp'), [20, 1.15, 600]);
  assert.equal(t.capa.tracking, -3.36);
  assert.equal(t.abertura.tracking, -2.52);
  assert.equal(t.titulo.tracking, -1.32);
  assert.equal(t.rotulo.tracking, 2.24);
  assert.deepEqual(t.titulo.familia, ['Geist', 'system-ui', 'sans-serif']);
  assert.deepEqual(t.codigo.familia, ['Geist Mono', 'ui-monospace', 'monospace']);
  assert.deepEqual(t.marcaUsp.familia, ['Open Sans', 'sans-serif']);
  assert.equal(t.rotulo.caixa, 'alta');
  assert.equal(t.rodape.caixa, 'alta');
  assert.equal(t.leitura.pesoEnfase, 600);
  assert.equal(t.codigo.pesoEnfase, 600);
});

test('grid, zonas, espaços, réguas e mínimos (4.3 e 4.4)', () => {
  assert.deepEqual(s.palco, { largura: 1280, altura: 720, margem: 64, coluna: 74, calha: 24, util: 1152 });
  assert.equal(12 * s.palco.coluna + 11 * s.palco.calha, s.palco.util);
  assert.equal(s.palco.util + 2 * s.palco.margem, s.palco.largura);
  assert.deepEqual(s.zona, {
    cabecalhoTopo: 40, cabecalhoBase: 64, tituloTopo: 96, conteudoBase: 652,
    rodapeBase: 688, marcaBase: 680, capaConteudoBase: 520, aberturaTituloTopoMin: 360,
  });
  assert.deepEqual(Object.values(s.espaco), [8, 16, 24, 32, 48, 64, 96]);
  assert.deepEqual(s.regua, { fina: 1, normal: 2, forte: 4 });
  assert.deepEqual(s.minimo, { leitura: 24, codigo: 20, legenda: 18, rotulo: 14 });
  assert.deepEqual(s.contraste, { azulTextoMinimo: 32, amareloLinhaMinima: 4 });
  assert.deepEqual(s.mapa, {
    quadradoCabecalho: 16, espacoCabecalho: 8, quadradoAberturaMax: 160, calhaAbertura: 24,
    quadradoCapa: 24, numeroProporcao: 0.55, faixaBlocoNdeM: 220,
  });
  assert.deepEqual(s.marca, { uspAltura: 56 });
});

test('CSS gerado tem as variáveis esperadas e é determinístico', () => {
  const css = gerarCss(tokens);
  assert.equal(css, gerarCss(tokens));
  for (const v of [
    '--cor-azul: #1094AB;', '--tipo-titulo-tamanho: 44px;', '--tipo-titulo-tracking: -1.32px;',
    '--tipo-codigo-familia: "Geist Mono", ui-monospace, monospace;', '--tipo-rotulo-caixa: uppercase;',
    '--tipo-leitura-peso-enfase: 600;', '--palco-util: 1152px;', '--espaco-7: 96px;',
    '--zona-conteudo-base: 652px;', '--mapa-quadrado-cabecalho: 16px;', '--mapa-numero-proporcao: 0.55;',
    '--contraste-azul-texto-minimo: 32px;',
  ]) assert.ok(css.includes(v), `faltou ${v}`);
});

test('arquivos gerados no repositório estão atualizados', async () => {
  const raiz = new URL('../../', import.meta.url);
  assert.equal(await readFile(new URL('estilos/tokens.css', raiz), 'utf8'), gerarCss(tokens));
  assert.equal(await readFile(new URL('tokens/tokens.js', raiz), 'utf8'), gerarJs(tokens));
});

test('tokens.js importável coincide com simplificar', async () => {
  const mod = await import('../../tokens/tokens.js');
  assert.deepEqual(mod.tokens, s);
  assert.equal(mod.default, mod.tokens);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL com `Cannot find module '.../build/tokens.mjs'`.

- [ ] **Step 4: Criar `tokens/aula-usp.tokens.json`**

```json
{
  "$description": "Tokens do Aula USP no formato do Design Tokens Community Group (2025.10). Fonte única: build/tokens.mjs gera estilos/tokens.css e tokens/tokens.js.",
  "cor": {
    "$type": "color",
    "papel":   { "$value": { "colorSpace": "srgb", "components": [1, 1, 1], "hex": "#FFFFFF" }, "$description": "fundo do palco e do entorno" },
    "tinta":   { "$value": { "colorSpace": "srgb", "components": [0.0392, 0.0392, 0.0392], "hex": "#0A0A0A" }, "$description": "texto de leitura, réguas, eixos, contornos, quadrados vistos, campo do alerta" },
    "cinza":   { "$value": { "colorSpace": "srgb", "components": [0.4, 0.4, 0.4], "hex": "#666666" }, "$description": "rodapé, legendas, comentários de código" },
    "linha":   { "$value": { "colorSpace": "srgb", "components": [0.851, 0.851, 0.851], "hex": "#D9D9D9" }, "$description": "linhas finas de tabela e grade de gráfico; nunca texto" },
    "azul":    { "$value": { "colorSpace": "srgb", "components": [0.0627, 0.5804, 0.6706], "hex": "#1094AB" }, "$description": "sinal; texto só a partir de 32 px" },
    "amarelo": { "$value": { "colorSpace": "srgb", "components": [0.9882, 0.7059, 0.1294], "hex": "#FCB421" }, "$description": "campo sob tinta; nunca texto nem linha abaixo de 4 px" }
  },
  "fonte": {
    "$type": "fontFamily",
    "sans":  { "$value": ["Geist", "system-ui", "sans-serif"] },
    "mono":  { "$value": ["Geist Mono", "ui-monospace", "monospace"] },
    "marca": { "$value": ["Open Sans", "sans-serif"] }
  },
  "tipo": {
    "$type": "typography",
    "capa":         { "$value": { "fontFamily": "{fonte.sans}", "fontSize": { "value": 96, "unit": "px" }, "fontWeight": 600, "lineHeight": 1, "letterSpacing": { "value": -3.36, "unit": "px" } } },
    "abertura":     { "$value": { "fontFamily": "{fonte.sans}", "fontSize": { "value": 84, "unit": "px" }, "fontWeight": 600, "lineHeight": 1, "letterSpacing": { "value": -2.52, "unit": "px" } } },
    "afirmacao":    { "$value": { "fontFamily": "{fonte.sans}", "fontSize": { "value": 64, "unit": "px" }, "fontWeight": 600, "lineHeight": 1.08, "letterSpacing": { "value": -1.92, "unit": "px" } } },
    "titulo":       { "$value": { "fontFamily": "{fonte.sans}", "fontSize": { "value": 44, "unit": "px" }, "fontWeight": 600, "lineHeight": 1.08, "letterSpacing": { "value": -1.32, "unit": "px" } } },
    "numeral":      { "$value": { "fontFamily": "{fonte.sans}", "fontSize": { "value": 40, "unit": "px" }, "fontWeight": 600, "lineHeight": 1, "letterSpacing": { "value": 0, "unit": "px" } } },
    "lide":         { "$value": { "fontFamily": "{fonte.sans}", "fontSize": { "value": 32, "unit": "px" }, "fontWeight": 400, "lineHeight": 1.25, "letterSpacing": { "value": 0, "unit": "px" } } },
    "leitura":      { "$value": { "fontFamily": "{fonte.sans}", "fontSize": { "value": 24, "unit": "px" }, "fontWeight": 400, "lineHeight": 1.42, "letterSpacing": { "value": 0, "unit": "px" } }, "$extensions": { "br.usp.aula": { "pesoEnfase": 600 } } },
    "codigo":       { "$value": { "fontFamily": "{fonte.mono}", "fontSize": { "value": 20, "unit": "px" }, "fontWeight": 400, "lineHeight": 1.45, "letterSpacing": { "value": 0, "unit": "px" } }, "$extensions": { "br.usp.aula": { "pesoEnfase": 600 } } },
    "legenda":      { "$value": { "fontFamily": "{fonte.sans}", "fontSize": { "value": 18, "unit": "px" }, "fontWeight": 400, "lineHeight": 1.35, "letterSpacing": { "value": 0, "unit": "px" } } },
    "rotulo":       { "$value": { "fontFamily": "{fonte.mono}", "fontSize": { "value": 14, "unit": "px" }, "fontWeight": 700, "lineHeight": 1.2, "letterSpacing": { "value": 2.24, "unit": "px" } }, "$extensions": { "br.usp.aula": { "caixa": "alta" } } },
    "rodape":       { "$value": { "fontFamily": "{fonte.mono}", "fontSize": { "value": 14, "unit": "px" }, "fontWeight": 400, "lineHeight": 1.2, "letterSpacing": { "value": 2.24, "unit": "px" } }, "$extensions": { "br.usp.aula": { "caixa": "alta" } } },
    "rotuloGrande": { "$value": { "fontFamily": "{fonte.mono}", "fontSize": { "value": 20, "unit": "px" }, "fontWeight": 700, "lineHeight": 1.2, "letterSpacing": { "value": 3.2, "unit": "px" } }, "$extensions": { "br.usp.aula": { "caixa": "alta" } } },
    "marcaUsp":     { "$value": { "fontFamily": "{fonte.marca}", "fontSize": { "value": 20, "unit": "px" }, "fontWeight": 600, "lineHeight": 1.15, "letterSpacing": { "value": 0, "unit": "px" } } }
  },
  "minimo": {
    "$type": "dimension",
    "leitura": { "$value": { "value": 24, "unit": "px" } },
    "codigo":  { "$value": { "value": 20, "unit": "px" } },
    "legenda": { "$value": { "value": 18, "unit": "px" } },
    "rotulo":  { "$value": { "value": 14, "unit": "px" } }
  },
  "palco": {
    "$type": "dimension",
    "largura": { "$value": { "value": 1280, "unit": "px" } },
    "altura":  { "$value": { "value": 720, "unit": "px" } },
    "margem":  { "$value": { "value": 64, "unit": "px" } },
    "coluna":  { "$value": { "value": 74, "unit": "px" } },
    "calha":   { "$value": { "value": 24, "unit": "px" } },
    "util":    { "$value": { "value": 1152, "unit": "px" } }
  },
  "zona": {
    "$type": "dimension",
    "cabecalhoTopo":         { "$value": { "value": 40, "unit": "px" } },
    "cabecalhoBase":         { "$value": { "value": 64, "unit": "px" } },
    "tituloTopo":            { "$value": { "value": 96, "unit": "px" } },
    "conteudoBase":          { "$value": { "value": 652, "unit": "px" } },
    "rodapeBase":            { "$value": { "value": 688, "unit": "px" } },
    "marcaBase":             { "$value": { "value": 680, "unit": "px" } },
    "capaConteudoBase":      { "$value": { "value": 520, "unit": "px" } },
    "aberturaTituloTopoMin": { "$value": { "value": 360, "unit": "px" } }
  },
  "espaco": {
    "$type": "dimension",
    "1": { "$value": { "value": 8, "unit": "px" } },
    "2": { "$value": { "value": 16, "unit": "px" } },
    "3": { "$value": { "value": 24, "unit": "px" } },
    "4": { "$value": { "value": 32, "unit": "px" } },
    "5": { "$value": { "value": 48, "unit": "px" } },
    "6": { "$value": { "value": 64, "unit": "px" } },
    "7": { "$value": { "value": 96, "unit": "px" } }
  },
  "regua": {
    "$type": "dimension",
    "fina":   { "$value": { "value": 1, "unit": "px" } },
    "normal": { "$value": { "value": 2, "unit": "px" } },
    "forte":  { "$value": { "value": 4, "unit": "px" } }
  },
  "contraste": {
    "$type": "dimension",
    "azulTextoMinimo":    { "$value": { "value": 32, "unit": "px" }, "$description": "texto em azul só a partir deste tamanho" },
    "amareloLinhaMinima": { "$value": { "value": 4, "unit": "px" }, "$description": "traço em amarelo só a partir desta espessura" }
  },
  "mapa": {
    "quadradoCabecalho":   { "$type": "dimension", "$value": { "value": 16, "unit": "px" } },
    "espacoCabecalho":     { "$type": "dimension", "$value": { "value": 8, "unit": "px" } },
    "quadradoAberturaMax": { "$type": "dimension", "$value": { "value": 160, "unit": "px" } },
    "calhaAbertura":       { "$type": "dimension", "$value": { "value": 24, "unit": "px" } },
    "quadradoCapa":        { "$type": "dimension", "$value": { "value": 24, "unit": "px" } },
    "numeroProporcao":     { "$type": "number", "$value": 0.55, "$description": "altura do número do bloco atual em relação ao lado do quadrado" },
    "faixaBlocoNdeM":      { "$type": "dimension", "$value": { "value": 220, "unit": "px" } }
  },
  "marca": {
    "$type": "dimension",
    "uspAltura": { "$value": { "value": 56, "unit": "px" } }
  }
}
```

- [ ] **Step 5: Criar `build/tokens.mjs`**

```js
// Gera estilos/tokens.css e tokens/tokens.js a partir de tokens/aula-usp.tokens.json.
//   node build/tokens.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CABECALHO = 'Gerado por build/tokens.mjs a partir de tokens/aula-usp.tokens.json. Não editar à mão.';

export async function lerTokens(caminho = resolve(RAIZ, 'tokens/aula-usp.tokens.json')) {
  return JSON.parse(await readFile(caminho, 'utf8'));
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// "{fonte.sans}" → valor do token referenciado
function resolver(tokens, valor) {
  if (typeof valor !== 'string' || !/^\{[^}]+\}$/.test(valor)) return valor;
  const alvo = valor.slice(1, -1).split('.').reduce((no, chave) => no?.[chave], tokens);
  if (!alvo || !('$value' in alvo)) throw new Error(`referência não encontrada: ${valor}`);
  return alvo.$value;
}

// [nome, token, tipo] de cada filho com $value, herdando $type do grupo
function filhos(grupo) {
  return Object.entries(grupo)
    .filter(([nome, v]) => !nome.startsWith('$') && v && typeof v === 'object' && '$value' in v)
    .map(([nome, v]) => [nome, v, v.$type ?? grupo.$type]);
}

const px = (d) => {
  if (d.unit !== 'px') throw new Error(`unidade não suportada: ${d.unit}`);
  return d.value;
};
const extensao = (token) => token.$extensions?.['br.usp.aula'] ?? {};
const familiaCss = (lista) => lista.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');

export function simplificar(tokens) {
  const saida = {};
  for (const [grupoNome, grupo] of Object.entries(tokens)) {
    if (grupoNome.startsWith('$')) continue;
    saida[grupoNome] = {};
    for (const [nome, token, tipo] of filhos(grupo)) {
      const v = token.$value;
      if (tipo === 'color') saida[grupoNome][nome] = v.hex;
      else if (tipo === 'dimension') saida[grupoNome][nome] = px(v);
      else if (tipo === 'number') saida[grupoNome][nome] = v;
      else if (tipo === 'fontFamily') saida[grupoNome][nome] = v;
      else if (tipo === 'typography') {
        const ext = extensao(token);
        saida[grupoNome][nome] = {
          familia: resolver(tokens, v.fontFamily),
          tamanho: px(v.fontSize),
          peso: v.fontWeight,
          entrelinha: v.lineHeight,
          tracking: px(v.letterSpacing),
          ...(ext.caixa ? { caixa: ext.caixa } : {}),
          ...(ext.pesoEnfase ? { pesoEnfase: ext.pesoEnfase } : {}),
        };
      } else throw new Error(`tipo não suportado: ${tipo} em ${grupoNome}.${nome}`);
    }
  }
  return saida;
}

export function gerarCss(tokens) {
  const s = simplificar(tokens);
  const linhas = [];
  for (const [grupo, itens] of Object.entries(s)) {
    for (const [nome, valor] of Object.entries(itens)) {
      const base = `--${kebab(grupo)}-${kebab(nome)}`;
      if (Array.isArray(valor)) linhas.push([base, familiaCss(valor)]);
      else if (typeof valor === 'object') {
        linhas.push([`${base}-familia`, familiaCss(valor.familia)]);
        linhas.push([`${base}-tamanho`, `${valor.tamanho}px`]);
        linhas.push([`${base}-peso`, String(valor.peso)]);
        linhas.push([`${base}-entrelinha`, String(valor.entrelinha)]);
        linhas.push([`${base}-tracking`, `${valor.tracking}px`]);
        if (valor.caixa) linhas.push([`${base}-caixa`, 'uppercase']);
        if (valor.pesoEnfase) linhas.push([`${base}-peso-enfase`, String(valor.pesoEnfase)]);
      } else if (typeof valor === 'string') linhas.push([base, valor]);
      else if (grupo === 'mapa' && nome === 'numeroProporcao') linhas.push([base, String(valor)]);
      else linhas.push([base, `${valor}px`]);
    }
  }
  return `/* ${CABECALHO} */\n:root {\n${linhas.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`;
}

export function gerarJs(tokens) {
  return `// ${CABECALHO}\nexport const tokens = ${JSON.stringify(simplificar(tokens), null, 2)};\nexport default tokens;\n`;
}

export function luminancia(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(hexA, hexB) {
  const [claro, escuro] = [luminancia(hexA), luminancia(hexB)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

async function principal() {
  const tokens = await lerTokens();
  await mkdir(resolve(RAIZ, 'estilos'), { recursive: true });
  await writeFile(resolve(RAIZ, 'estilos/tokens.css'), gerarCss(tokens));
  await writeFile(resolve(RAIZ, 'tokens/tokens.js'), gerarJs(tokens));
  console.log('estilos/tokens.css e tokens/tokens.js gerados');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
```

Nota: o único token de tipo `number` que vira CSS sem unidade é `mapa.numeroProporcao`; qualquer outro `number` futuro precisa de um ramo explícito em `gerarCss`.

- [ ] **Step 6: Gerar os arquivos**

Run: `npm run tokens`
Expected: `estilos/tokens.css e tokens/tokens.js gerados`

- [ ] **Step 7: Rodar os testes**

Run: `npm test`
Expected: PASS nos 8 testes de `tokens.test.mjs`.

- [ ] **Step 8: Commit**

```bash
git add package.json tokens/ build/tokens.mjs estilos/tokens.css tests/unit/tokens.test.mjs
git commit -m "feat(tokens): tokens DTCG com geração de CSS e JS

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Contrato de HTML

**Files:**
- Create: `contrato/contrato.json`
- Test: `tests/unit/contrato.test.mjs`

**Interfaces:**
- Consumes: `lerTokens`, `simplificar` (Task 1), para conferir cores e mínimos.
- Produces (lido por M2, M4 e M6): `contrato/contrato.json` com as chaves `versao`, `idiomas`, `metadados`, `blocosDeCorpo`, `blocosDeCorpoFase2`, `sempreOpcional`, `layouts.<nome>.{sequencia, cromo}`, `filhos`, `grades`, `limites` (chaves com ponto, como `titulo.caracteresPorSegmento`), `papeis.{leitura,codigo,legenda,rotulo}.{minimo,seletores}` e `papeis.excecoes`, `classesDoSistema`, `html.{elementos, elementosFase2, classes, atributos}`, `svg.{elementos, atributos, atributosPorElemento, classes, cores, hrefPadrao}`, `proibidos.{elementos, atributos, prefixosDeAtributo, comandosTex}`, `tex.{inline, destaque, macros, trust}`, `linguagens`, `regras.<id>.{severidade: 'erro'|'aviso', grupo: 'estatica'|'carga'|'composicao'|'saida', fase: 1|2, acao}`.
- Formato de `sequencia`: lista de itens `{ "seletor", "min", "max" }` (`max: null` é ilimitado), `{ "grupo": "blocosDeCorpo", "min", "max" }` ou `{ "umDe": [[itens], [itens]] }`. `tex-destaque` em `blocosDeCorpo` designa uma equação `\[ … \]` solta no corpo.
- Nomes de classes do cromo (usados por M2 ao gerar HTML): `palco`, `slide`, `cabecalho`, `rotulo`, `mapa`, `quadrado`, `visto`, `atual`, `futuro`, `contador`, `rodape`, `metadados-capa`, `roteiro`, `faixa-de-marca`, `marca-unidade`, `marca-usp`, `numero-bloco`, `fileira`, `nome-curto`, `bloco-n-de-m`, `painel`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/unit/contrato.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lerTokens, simplificar } from '../../build/tokens.mjs';

const contrato = JSON.parse(await readFile(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const tokens = simplificar(await lerTokens());

test('sete layouts com os obrigatórios da spec (5.3)', () => {
  assert.deepEqual(Object.keys(contrato.layouts).sort(),
    ['abertura', 'afirmacao', 'capa', 'conteudo', 'demo', 'encerramento', 'figura']);
  const obrigatorios = (nome) => contrato.layouts[nome].sequencia
    .filter((i) => i.seletor && i.min > 0).map((i) => i.seletor);
  assert.deepEqual(obrigatorios('capa'), ['h1']);
  assert.deepEqual(obrigatorios('abertura'), ['h2']);
  assert.deepEqual(obrigatorios('conteudo'), ['h2']);
  assert.deepEqual(obrigatorios('afirmacao'), ['p.afirmacao']);
  assert.deepEqual(obrigatorios('figura'), ['figure']);
  assert.deepEqual(obrigatorios('demo'), ['h2', 'div.demo']);
  assert.deepEqual(obrigatorios('encerramento'), ['h2', 'ol.sintese']);
  const alternativa = contrato.layouts.conteudo.sequencia.find((i) => i.umDe);
  assert.deepEqual(alternativa.umDe.map((ramo) => ramo[0].seletor ?? ramo[0].grupo), ['div.colunas', 'blocosDeCorpo']);
  assert.equal(alternativa.umDe[1][0].min, 1);
  assert.deepEqual(contrato.sempreOpcional, ['aside.notas']);
});

test('blocos de corpo, grades e filhos (5.3)', () => {
  assert.deepEqual(contrato.blocosDeCorpo, ['p', 'ul', 'ol.passos', 'aside.destaque', 'aside.quadro',
    'aside.alerta', 'div.exercicio', 'table', 'pre', 'figure', 'tex-destaque']);
  assert.deepEqual(contrato.blocosDeCorpoFase2, ['figure.grafico', 'figure.diagrama']);
  assert.deepEqual(contrato.grades, { '12': 1, '6-6': 2, '8-4': 2, '4-8': 2, '4-4-4': 3 });
  assert.deepEqual(contrato.filhos.figure, { exatamenteUmDe: ['img', 'svg'], opcionais: ['figcaption'] });
  assert.deepEqual(contrato.filhos['div.demo'], { opcionais: ['img.estatico'] });
});

test('metadados (5.2)', () => {
  assert.deepEqual(contrato.metadados, {
    unidade: { obrigatorio: true, tipo: 'unidade' },
    disciplina: { obrigatorio: true, tipo: 'texto', max: 60 },
    aula: { obrigatorio: true, tipo: 'texto', max: 12 },
    data: { obrigatorio: true, tipo: 'data-iso' },
    professor: { obrigatorio: true, tipo: 'texto', max: 40 },
  });
  assert.deepEqual(contrato.idiomas, ['pt-BR', 'en']);
});

test('limites da seção 5.3', () => {
  assert.deepEqual(contrato.limites, {
    'capa.h1.caracteresPorSegmento': 23, 'capa.h1.segmentos': 2, 'capa.h1.linhas': 2,
    'abertura.h2.caracteresPorSegmento': 20, 'abertura.h2.segmentos': 2, 'abertura.h2.linhas': 2,
    'abertura.dataCurto.caracteres': 10, 'abertura.h2.caracteresSemDataCurto': 10,
    'pergunta.caracteres': 90,
    'titulo.caracteresPorSegmento': 50, 'titulo.segmentos': 2, 'titulo.linhas': 2,
    'lide.caracteres': 120, 'corpo.palavras': 90, 'coluna.palavras': 60, 'lista.itens': 5,
    'destaque.maxPorSlide': 2, 'alerta.maxPorSlide': 1, 'rotulo.caracteres': 24,
    'afirmacao.caracteres': 120, 'fonte.caracteres': 80, 'legenda.caracteres': 140,
    'sintese.itens': 3, 'sintese.caracteresPorItem': 80, 'proxima.caracteres': 90,
    'codigo.linhas': 16, 'codigo.colunas': 64, 'tabela.linhasDeDados': 8, 'tabela.colunas': 6,
    'diagrama.nos': 15,
  });
});

test('regras da seção 9.2: ids, severidade, grupo e fase', () => {
  const E = 'erro', A = 'aviso', est = 'estatica', car = 'carga', comp = 'composicao', sai = 'saida';
  const ESPERADO = {
    'estrutura.primeiro-slide': [E, est, 1], 'estrutura.ultimo-slide': [E, est, 1],
    'estrutura.layout': [E, est, 1], 'estrutura.metadados': [E, est, 1],
    'estrutura.obrigatorio': [E, est, 1], 'estrutura.fora-do-layout': [E, est, 1],
    'estrutura.colunas': [E, est, 1], 'estrutura.blocos': [A, est, 1],
    'estrutura.id-duplicado': [E, est, 1], 'estrutura.id-ausente': [A, est, 1],
    'estrutura.nome-curto': [E, est, 1], 'estrutura.passos-mistos': [E, est, 1],
    'estrutura.notas-ausentes': [A, est, 1],
    'vocabulario.elemento': [E, est, 1], 'vocabulario.classe': [E, est, 1],
    'vocabulario.atributo': [E, est, 1], 'vocabulario.style': [E, est, 1],
    'vocabulario.cor-svg': [E, est, 1], 'vocabulario.amarelo-svg': [E, est, 1],
    'vocabulario.azul-svg': [E, est, 1], 'vocabulario.script': [E, est, 1],
    'limites.titulo': [E, est, 1], 'limites.segmentos-titulo': [E, est, 1],
    'limites.nome-curto': [E, est, 1], 'limites.pergunta': [E, est, 1], 'limites.lide': [E, est, 1],
    'limites.palavras-corpo': [E, est, 1], 'limites.palavras-coluna': [E, est, 1],
    'limites.itens': [E, est, 1], 'limites.destaques': [E, est, 1], 'limites.alertas': [E, est, 1],
    'limites.rotulo': [E, est, 1], 'limites.afirmacao': [E, est, 1], 'limites.fonte': [E, est, 1],
    'limites.legenda': [E, est, 1], 'limites.sintese': [E, est, 1], 'limites.proxima': [E, est, 1],
    'limites.codigo-linhas': [E, est, 1], 'limites.codigo-colunas': [E, est, 1],
    'limites.tabela': [E, est, 1], 'limites.metadado': [E, est, 1],
    'composicao.transbordo': [E, comp, 1], 'composicao.linhas-titulo': [E, comp, 1],
    'composicao.tamanho-minimo': [E, comp, 1], 'composicao.azul-pequeno': [E, comp, 1],
    'composicao.texto-no-amarelo': [E, comp, 1],
    'matematica.tex-invalido': [E, car, 1], 'matematica.comando-proibido': [E, est, 1],
    'matematica.simbolo-fora-do-tex': [E, est, 1], 'matematica.cifrao-suspeito': [A, est, 1],
    'recursos.imagem': [E, car, 1], 'recursos.imagem-externa': [A, est, 1], 'recursos.alt': [E, est, 1],
    'recursos.demo-sem-registro': [E, car, 1], 'recursos.demo-sem-estatico': [A, car, 1],
    'recursos.linguagem': [E, est, 1], 'recursos.csv': [E, car, 2], 'recursos.grafico': [E, est, 2],
    'recursos.dot': [E, car, 2], 'recursos.diagrama-grande': [A, car, 2],
    'saida.referencia-externa': [E, sai, 1], 'saida.tamanho': [A, sai, 1],
    'saida.glifo-ausente': [E, sai, 1], 'saida.pdf-paginas': [E, sai, 1],
  };
  assert.equal(Object.keys(ESPERADO).length, 64);
  assert.deepEqual(Object.keys(contrato.regras).sort(), Object.keys(ESPERADO).sort());
  for (const [id, [severidade, grupo, fase]] of Object.entries(ESPERADO)) {
    const r = contrato.regras[id];
    assert.deepEqual([r.severidade, r.grupo, r.fase], [severidade, grupo, fase], id);
    assert.match(r.acao, /^\S.*\.$/, `ação de ${id} deve ser uma frase terminada em ponto`);
  }
});

test('cores de SVG são as dos tokens, mais none', () => {
  assert.deepEqual([...contrato.svg.cores].sort(), [...Object.values(tokens.cor), 'none'].sort());
});

test('papéis usam os mínimos dos tokens e têm as exceções da spec (4.3)', () => {
  for (const papel of ['leitura', 'codigo', 'legenda', 'rotulo'])
    assert.equal(contrato.papeis[papel].minimo, tokens.minimo[papel], papel);
  assert.deepEqual(contrato.papeis.excecoes,
    ['.katex *', 'sub', 'sup', 'svg *', '.demo *', '.painel *', '.faixa-de-marca *']);
});

test('classes do autor e do sistema não se misturam', () => {
  const autor = [...Object.keys(contrato.html.classes), ...contrato.svg.classes];
  assert.deepEqual(autor.filter((c) => contrato.classesDoSistema.includes(c)), []);
});

test('proibidos e TeX (5.5 e 6.4)', () => {
  assert.ok(contrato.proibidos.atributos.includes('style'));
  assert.ok(contrato.proibidos.elementos.includes('style'));
  assert.deepEqual(contrato.proibidos.prefixosDeAtributo, ['on']);
  assert.deepEqual(contrato.proibidos.comandosTex,
    ['\\color', '\\textcolor', '\\colorbox', '\\fcolorbox', '\\htmlStyle', '\\htmlClass', '\\htmlId', '\\htmlData']);
  assert.equal(contrato.tex.macros['\\passo'], '\\htmlData{passo=#1}{#2}');
  assert.deepEqual(contrato.tex.inline, ['\\(', '\\)']);
  assert.deepEqual(contrato.tex.destaque, ['\\[', '\\]']);
  assert.deepEqual(contrato.tex.trust, ['\\htmlData']);
});

test('linguagens de código coincidem com os valores de data-lang', () => {
  assert.deepEqual(contrato.linguagens, ['python', 'r', 'sql', 'javascript', 'bash', 'json', 'latex']);
  assert.deepEqual(contrato.html.atributos.pre['data-lang'].valores, contrato.linguagens);
});

test('padrões de atributo compilam e aceitam o que devem', () => {
  const padroes = [contrato.svg.hrefPadrao];
  for (const porElemento of Object.values(contrato.html.atributos))
    for (const regra of Object.values(porElemento)) if (regra.padrao) padroes.push(regra.padrao);
  for (const p of padroes) assert.doesNotThrow(() => new RegExp(p), p);
  const passo = new RegExp(contrato.html.atributos['*']['data-passo'].padrao);
  assert.ok(passo.test('') && passo.test('3') && passo.test('12'));
  assert.ok(!passo.test('0') && !passo.test('a'));
  const linhas = new RegExp(contrato.html.atributos.pre['data-linhas'].padrao);
  assert.ok(linhas.test('3-5,8') && linhas.test('7'));
  assert.ok(!linhas.test('3-') && !linhas.test('a'));
  const src = new RegExp(contrato.html.atributos.img.src.padrao);
  assert.ok(src.test('img/cajal.jpg') && src.test('data:image/png;base64,AAA') && src.test('https://x.org/a.png'));
  assert.ok(!src.test('../fora.png') && !src.test('http://x.org/a.png'));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL em `contrato.test.mjs` com `ENOENT: no such file or directory, open '.../contrato/contrato.json'`; os testes de tokens continuam passando.

- [ ] **Step 3: Criar `contrato/contrato.json`**

```json
{
  "versao": 1,
  "$descricao": "Contrato de HTML do Aula USP (spec 5.2 a 5.6 e 9.2). Lido pelo validador e pela geração do guia.",
  "idiomas": ["pt-BR", "en"],
  "metadados": {
    "unidade":    { "obrigatorio": true, "tipo": "unidade" },
    "disciplina": { "obrigatorio": true, "tipo": "texto", "max": 60 },
    "aula":       { "obrigatorio": true, "tipo": "texto", "max": 12 },
    "data":       { "obrigatorio": true, "tipo": "data-iso" },
    "professor":  { "obrigatorio": true, "tipo": "texto", "max": 40 }
  },
  "blocosDeCorpo": ["p", "ul", "ol.passos", "aside.destaque", "aside.quadro", "aside.alerta", "div.exercicio", "table", "pre", "figure", "tex-destaque"],
  "blocosDeCorpoFase2": ["figure.grafico", "figure.diagrama"],
  "sempreOpcional": ["aside.notas"],
  "layouts": {
    "capa": {
      "sequencia": [{ "seletor": "h1", "min": 1, "max": 1 }],
      "cromo": ["metadados-capa", "roteiro", "faixa-de-marca"]
    },
    "abertura": {
      "sequencia": [{ "seletor": "h2", "min": 1, "max": 1 }, { "seletor": "p.pergunta", "min": 0, "max": 1 }],
      "cromo": ["numero-bloco", "fileira", "bloco-n-de-m"]
    },
    "conteudo": {
      "sequencia": [
        { "seletor": "h2", "min": 1, "max": 1 },
        { "seletor": "p.lide", "min": 0, "max": 1 },
        { "umDe": [[{ "seletor": "div.colunas", "min": 1, "max": 1 }], [{ "grupo": "blocosDeCorpo", "min": 1, "max": null }]] }
      ],
      "cromo": ["cabecalho", "rodape"]
    },
    "afirmacao": {
      "sequencia": [{ "seletor": "p.afirmacao", "min": 1, "max": 1 }, { "seletor": "p.fonte", "min": 0, "max": 1 }],
      "cromo": ["cabecalho", "rodape"]
    },
    "figura": {
      "sequencia": [{ "seletor": "h2", "min": 0, "max": 1 }, { "seletor": "figure", "min": 1, "max": 1 }],
      "cromo": ["cabecalho", "rodape"]
    },
    "demo": {
      "sequencia": [{ "seletor": "h2", "min": 1, "max": 1 }, { "seletor": "div.demo", "min": 1, "max": 1 }],
      "cromo": ["cabecalho", "rodape"]
    },
    "encerramento": {
      "sequencia": [{ "seletor": "h2", "min": 1, "max": 1 }, { "seletor": "ol.sintese", "min": 1, "max": 1 }, { "seletor": "p.proxima", "min": 0, "max": 1 }],
      "cromo": ["cabecalho", "faixa-de-marca"]
    }
  },
  "filhos": {
    "div.colunas": { "elemento": "div", "quantidadePorGrade": true },
    "div.colunas > div": { "grupo": "blocosDeCorpo" },
    "div.exercicio": { "sequencia": [{ "seletor": "div.enunciado", "min": 1, "max": 1 }, { "seletor": "div.resposta", "min": 0, "max": 1 }] },
    "figure": { "exatamenteUmDe": ["img", "svg"], "opcionais": ["figcaption"] },
    "div.demo": { "opcionais": ["img.estatico"] },
    "ul": { "elemento": "li" },
    "ol": { "elemento": "li" },
    "table": { "elementos": ["thead", "tbody"] },
    "thead": { "elemento": "tr" },
    "tbody": { "elemento": "tr" },
    "tr": { "elementos": ["th", "td"] }
  },
  "grades": { "12": 1, "6-6": 2, "8-4": 2, "4-8": 2, "4-4-4": 3 },
  "limites": {
    "capa.h1.caracteresPorSegmento": 23,
    "capa.h1.segmentos": 2,
    "capa.h1.linhas": 2,
    "abertura.h2.caracteresPorSegmento": 20,
    "abertura.h2.segmentos": 2,
    "abertura.h2.linhas": 2,
    "abertura.dataCurto.caracteres": 10,
    "abertura.h2.caracteresSemDataCurto": 10,
    "pergunta.caracteres": 90,
    "titulo.caracteresPorSegmento": 50,
    "titulo.segmentos": 2,
    "titulo.linhas": 2,
    "lide.caracteres": 120,
    "corpo.palavras": 90,
    "coluna.palavras": 60,
    "lista.itens": 5,
    "destaque.maxPorSlide": 2,
    "alerta.maxPorSlide": 1,
    "rotulo.caracteres": 24,
    "afirmacao.caracteres": 120,
    "fonte.caracteres": 80,
    "legenda.caracteres": 140,
    "sintese.itens": 3,
    "sintese.caracteresPorItem": 80,
    "proxima.caracteres": 90,
    "codigo.linhas": 16,
    "codigo.colunas": 64,
    "tabela.linhasDeDados": 8,
    "tabela.colunas": 6,
    "diagrama.nos": 15
  },
  "papeis": {
    "leitura": { "minimo": 24, "seletores": ["p", "li", "th", "td", "aside.destaque", "aside.quadro", "aside.alerta", "div.enunciado", "div.resposta", ".metadados-capa"] },
    "codigo":  { "minimo": 20, "seletores": ["pre", "code"] },
    "legenda": { "minimo": 18, "seletores": ["figcaption", "p.fonte"] },
    "rotulo":  { "minimo": 14, "seletores": [".rotulo", ".rodape", ".contador", ".nome-curto", ".bloco-n-de-m"] },
    "excecoes": [".katex *", "sub", "sup", "svg *", ".demo *", ".painel *", ".faixa-de-marca *"]
  },
  "classesDoSistema": ["palco", "slide", "cabecalho", "rotulo", "mapa", "quadrado", "visto", "atual", "futuro", "contador", "rodape", "metadados-capa", "roteiro", "faixa-de-marca", "marca-unidade", "marca-usp", "numero-bloco", "fileira", "nome-curto", "bloco-n-de-m", "painel"],
  "html": {
    "elementos": ["h1", "h2", "p", "br", "strong", "em", "sub", "sup", "a", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption", "img", "svg", "pre", "code", "aside", "div", "span"],
    "elementosFase2": { "script": { "dentro": ["figure.grafico", "figure.diagrama"] } },
    "classes": {
      "sinal":     { "em": ["span"], "dentro": ["h1", "h2"] },
      "lide":      { "em": ["p"] },
      "pergunta":  { "em": ["p"] },
      "afirmacao": { "em": ["p"] },
      "fonte":     { "em": ["p"] },
      "proxima":   { "em": ["p"] },
      "colunas":   { "em": ["div"] },
      "destaque":  { "em": ["aside", "tr", "td"] },
      "quadro":    { "em": ["aside"] },
      "alerta":    { "em": ["aside"] },
      "exercicio": { "em": ["div"] },
      "enunciado": { "em": ["div"], "dentro": ["div.exercicio"] },
      "resposta":  { "em": ["div"], "dentro": ["div.exercicio"] },
      "passos":    { "em": ["ol"] },
      "sintese":   { "em": ["ol"] },
      "demo":      { "em": ["div"] },
      "estatico":  { "em": ["img"], "dentro": ["div.demo"] },
      "notas":     { "em": ["aside"] },
      "grafico":   { "em": ["figure"], "fase": 2 },
      "diagrama":  { "em": ["figure"], "fase": 2 }
    },
    "atributos": {
      "*":       { "class": {}, "data-passo": { "padrao": "^([1-9][0-9]*)?$" }, "lang": { "valores": ["pt-BR", "en"] } },
      "section": { "data-layout": { "valores": ["capa", "abertura", "conteudo", "afirmacao", "figura", "demo", "encerramento"] }, "id": { "padrao": "^[a-z0-9][a-z0-9-]*$" }, "data-curto": { "layouts": ["abertura"] }, "data-pdf": { "valores": ["passos"] } },
      "div":     { "data-grade": { "valores": ["12", "6-6", "8-4", "4-8", "4-4-4"] }, "data-demo": { "padrao": "^[a-z][a-z0-9-]*$" }, "data-opcoes": { "json": true }, "data-captura-ms": { "padrao": "^[0-9]+$", "fase": 2 } },
      "aside":   { "data-rotulo": {} },
      "figure":  { "data-foto": { "valores": ["pb"] } },
      "img":     { "src": { "padrao": "^(img/|data:|https://)" }, "alt": { "obrigatorio": true } },
      "pre":     { "data-lang": { "valores": ["python", "r", "sql", "javascript", "bash", "json", "latex"] }, "data-linhas": { "padrao": "^[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*$" }, "data-numeros": { "valores": [""] } },
      "th":      { "colspan": { "padrao": "^[1-9][0-9]?$" }, "rowspan": { "padrao": "^[1-9][0-9]?$" }, "scope": { "valores": ["row", "col"] } },
      "td":      { "colspan": { "padrao": "^[1-9][0-9]?$" }, "rowspan": { "padrao": "^[1-9][0-9]?$" } },
      "a":       { "href": { "padrao": "^(#|https://)" } },
      "script":  { "type": { "valores": ["application/json", "text/vnd.graphviz"], "fase": 2 } }
    }
  },
  "svg": {
    "elementos": ["svg", "g", "path", "line", "polyline", "polygon", "rect", "circle", "ellipse", "text", "tspan", "title", "desc", "defs", "marker", "use", "clipPath"],
    "atributos": ["xmlns", "viewBox", "width", "height", "d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "points", "transform", "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "marker-start", "marker-end", "markerWidth", "markerHeight", "refX", "refY", "orient", "text-anchor", "dominant-baseline", "font-size", "font-weight", "clip-path", "id", "href", "role", "aria-label", "class"],
    "atributosPorElemento": { "ellipse": ["rx", "ry"] },
    "classes": ["mono"],
    "cores": ["#0A0A0A", "#666666", "#D9D9D9", "#1094AB", "#FCB421", "#FFFFFF", "none"],
    "hrefPadrao": "^#"
  },
  "proibidos": {
    "elementos": ["style", "iframe", "video", "audio", "font", "foreignObject", "image", "linearGradient", "radialGradient", "filter", "mask", "pattern"],
    "atributos": ["style", "opacity", "fill-opacity", "stroke-opacity"],
    "prefixosDeAtributo": ["on"],
    "comandosTex": ["\\color", "\\textcolor", "\\colorbox", "\\fcolorbox", "\\htmlStyle", "\\htmlClass", "\\htmlId", "\\htmlData"]
  },
  "tex": {
    "inline": ["\\(", "\\)"],
    "destaque": ["\\[", "\\]"],
    "macros": { "\\passo": "\\htmlData{passo=#1}{#2}" },
    "trust": ["\\htmlData"]
  },
  "linguagens": ["python", "r", "sql", "javascript", "bash", "json", "latex"],
  "regras": {
    "estrutura.primeiro-slide":  { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Comece a aula com <section data-layout=\"capa\">." },
    "estrutura.ultimo-slide":    { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Termine a aula com <section data-layout=\"encerramento\">." },
    "estrutura.layout":          { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use um layout do contrato: capa, abertura, conteudo, afirmacao, figura, demo ou encerramento." },
    "estrutura.metadados":       { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Preencha no <head> as metas unidade, disciplina, aula, data (AAAA-MM-DD) e professor." },
    "estrutura.obrigatorio":     { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Acrescente o elemento obrigatório do layout." },
    "estrutura.fora-do-layout":  { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Remova o elemento ou mova-o para um layout que o aceite, na ordem prevista." },
    "estrutura.colunas":         { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Dê à div.colunas um div filho para cada parte de data-grade." },
    "estrutura.blocos":          { "severidade": "aviso", "grupo": "estatica", "fase": 1, "acao": "Organize a aula em 2 a 8 blocos, cada um aberto por data-layout=\"abertura\"." },
    "estrutura.id-duplicado":    { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Dê a cada section um id único." },
    "estrutura.id-ausente":      { "severidade": "aviso", "grupo": "estatica", "fase": 1, "acao": "Dê à section um id curto, com letras minúsculas, números e hífens." },
    "estrutura.nome-curto":      { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Acrescente à abertura data-curto com até 10 caracteres." },
    "estrutura.passos-mistos":   { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Numere todos os passos do slide ou nenhum." },
    "estrutura.notas-ausentes":  { "severidade": "aviso", "grupo": "estatica", "fase": 1, "acao": "Acrescente <aside class=\"notas\"> com o que dizer neste slide." },
    "vocabulario.elemento":      { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Troque o elemento por um previsto no contrato." },
    "vocabulario.classe":        { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use só classes previstas no contrato." },
    "vocabulario.atributo":      { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Remova o atributo ou use um valor previsto no contrato." },
    "vocabulario.style":         { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Remova o estilo inline; use os layouts e componentes do sistema." },
    "vocabulario.cor-svg":       { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use em fill e stroke só as cores dos tokens ou none." },
    "vocabulario.amarelo-svg":   { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use o amarelo só em campos ou traços de 4 px ou mais, nunca em texto." },
    "vocabulario.azul-svg":      { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use o azul em texto de SVG só a partir de 32 px." },
    "vocabulario.script":        { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Tire o script da section; registros de demo ficam fora dos slides." },
    "limites.titulo":            { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Corte o título ou divida o conteúdo em dois slides." },
    "limites.segmentos-titulo":  { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use no máximo duas linhas no título, com um único <br>." },
    "limites.nome-curto":        { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte data-curto para até 10 caracteres." },
    "limites.pergunta":          { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte a pergunta para até 90 caracteres." },
    "limites.lide":              { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte o lide para até 120 caracteres." },
    "limites.palavras-corpo":    { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Corte palavras ou divida o conteúdo em dois slides." },
    "limites.palavras-coluna":   { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Corte palavras da coluna ou divida o conteúdo em dois slides." },
    "limites.itens":             { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use no máximo 5 itens por lista, ou divida a lista." },
    "limites.destaques":         { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use no máximo 2 destaques por slide." },
    "limites.alertas":           { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use no máximo 1 alerta por slide." },
    "limites.rotulo":            { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte data-rotulo para até 24 caracteres." },
    "limites.afirmacao":         { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte a afirmação para até 120 caracteres." },
    "limites.fonte":             { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte a fonte para até 80 caracteres." },
    "limites.legenda":           { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte a legenda para até 140 caracteres." },
    "limites.sintese":           { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use na síntese até 3 itens, cada um com até 80 caracteres." },
    "limites.proxima":           { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte a próxima aula para até 90 caracteres." },
    "limites.codigo-linhas":     { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Mostre no máximo 16 linhas de código por slide." },
    "limites.codigo-colunas":    { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Quebre as linhas de código com mais de 64 colunas." },
    "limites.tabela":            { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use no máximo 8 linhas de dados e 6 colunas." },
    "limites.metadado":          { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Encurte o metadado ao tamanho previsto." },
    "composicao.transbordo":     { "severidade": "erro",  "grupo": "composicao", "fase": 1, "acao": "Reduza o conteúdo do slide ou divida-o em dois." },
    "composicao.linhas-titulo":  { "severidade": "erro",  "grupo": "composicao", "fase": 1, "acao": "Encurte o título para caber em duas linhas." },
    "composicao.tamanho-minimo": { "severidade": "erro",  "grupo": "composicao", "fase": 1, "acao": "Corte conteúdo em vez de reduzir o texto." },
    "composicao.azul-pequeno":   { "severidade": "erro",  "grupo": "composicao", "fase": 1, "acao": "Use azul só em texto a partir de 32 px." },
    "composicao.texto-no-amarelo": { "severidade": "erro", "grupo": "composicao", "fase": 1, "acao": "Use só tinta sobre amarelo." },
    "matematica.tex-invalido":   { "severidade": "erro",  "grupo": "carga",    "fase": 1, "acao": "Corrija o TeX no trecho indicado." },
    "matematica.comando-proibido": { "severidade": "erro", "grupo": "estatica", "fase": 1, "acao": "Remova do TeX os comandos de cor e de estilo." },
    "matematica.simbolo-fora-do-tex": { "severidade": "erro", "grupo": "estatica", "fase": 1, "acao": "Escreva o símbolo em TeX, entre \\( e \\)." },
    "matematica.cifrao-suspeito": { "severidade": "aviso", "grupo": "estatica", "fase": 1, "acao": "Escreva matemática entre \\( e \\); $ não é delimitador." },
    "recursos.imagem":           { "severidade": "erro",  "grupo": "carga",    "fase": 1, "acao": "Confira o caminho da imagem em img/." },
    "recursos.imagem-externa":   { "severidade": "aviso", "grupo": "estatica", "fase": 1, "acao": "Guarde a imagem em img/, com autorização do autor para baixá-la." },
    "recursos.alt":              { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Descreva a imagem no atributo alt." },
    "recursos.demo-sem-registro": { "severidade": "erro", "grupo": "carga",    "fase": 1, "acao": "Registre a demo com AulaUSP.demo('<nome>', { … })." },
    "recursos.demo-sem-estatico": { "severidade": "aviso", "grupo": "carga",   "fase": 1, "acao": "Acrescente img.estatico à demo ou implemente capturar()." },
    "recursos.linguagem":        { "severidade": "erro",  "grupo": "estatica", "fase": 1, "acao": "Use em data-lang uma destas linguagens: python, r, sql, javascript, bash, json, latex." },
    "recursos.csv":              { "severidade": "erro",  "grupo": "carga",    "fase": 2, "acao": "Confira o caminho do CSV em data/." },
    "recursos.grafico":          { "severidade": "erro",  "grupo": "estatica", "fase": 2, "acao": "Corrija o JSON do gráfico." },
    "recursos.dot":              { "severidade": "erro",  "grupo": "carga",    "fase": 2, "acao": "Corrija o DOT do diagrama." },
    "recursos.diagrama-grande":  { "severidade": "aviso", "grupo": "carga",    "fase": 2, "acao": "Simplifique o diagrama para até 15 nós." },
    "saida.referencia-externa":  { "severidade": "erro",  "grupo": "saida",    "fase": 1, "acao": "Embuta o recurso no HTML final." },
    "saida.tamanho":             { "severidade": "aviso", "grupo": "saida",    "fase": 1, "acao": "Reduza as imagens ou divida a aula." },
    "saida.glifo-ausente":       { "severidade": "erro",  "grupo": "saida",    "fase": 1, "acao": "Escreva o caractere em TeX ou troque-o por um equivalente." },
    "saida.pdf-paginas":         { "severidade": "erro",  "grupo": "saida",    "fase": 1, "acao": "Relate o defeito: o PDF não tem o número de páginas esperado." }
  }
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: PASS em `tokens.test.mjs` (8) e `contrato.test.mjs` (11).

- [ ] **Step 5: Commit**

```bash
git add contrato/contrato.json tests/unit/contrato.test.mjs
git commit -m "feat(contrato): contrato de HTML com layouts, vocabulário, limites e regras

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: Fontes embutíveis

**Pré-requisito (sessão principal, antes de despachar):** autorização explícita do autor para baixar do Google Fonts os 8 woff2 (≈ 130 KB no total: Geist normal latin 29 KB e latin-ext 17 KB; Geist itálico latin 13 KB e latin-ext 8 KB; Geist Mono latin 23 KB e latin-ext 15 KB; Open Sans 600 latin 13 KB e latin-ext 11 KB, todos em `fonts.gstatic.com`) e as 3 licenças OFL (≈ 4,4 KB cada, em `raw.githubusercontent.com/google/fonts/main/ofl/{geist,geistmono,opensans}/OFL.txt`). Sem autorização, a tarefa para no passo 5.

**Files:**
- Create: `build/fontes.mjs`
- Create: `tests/fixtures/fontes/google-geist.css`
- Create (gerados): `assets/fontes/*.woff2`, `assets/fontes/fontes.json`, `assets/fontes/licencas/{geist,geist-mono,open-sans}-OFL.txt`
- Test: `tests/unit/fontes.test.mjs`

**Interfaces:**
- Consumes: nada das tarefas anteriores.
- Produces (usado por M2 ao injetar `@font-face` e por M5 em `cobertura.json`):
  - `FAMILIAS: Array<{familia, slug, consulta, licenca}>` e `SUBCONJUNTOS = ['latin', 'latin-ext']`;
  - `extrairFaces(css) → Array<{subconjunto, familia, estilo: 'normal'|'italic', peso: number, url, unicodeRange}>`;
  - `agruparPorArquivo(faces, slug) → Array<{familia, estilo, pesos: number[], subconjunto, unicodeRange, url, arquivo}>` (um item por URL, só latin e latin-ext, ordenado por `arquivo`);
  - `assets/fontes/fontes.json`: lista de `{familia, estilo, pesos, subconjunto, unicodeRange, arquivo, bytes, sha256, origem}`.

- [ ] **Step 1: Criar a fixture `tests/fixtures/fontes/google-geist.css`**

```css
/* cyrillic */
@font-face {
  font-family: 'Geist';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v5/italico-cirilico.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F;
}
/* latin-ext */
@font-face {
  font-family: 'Geist';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v5/italico-latin-ext.woff2) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5;
}
/* latin */
@font-face {
  font-family: 'Geist';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v5/italico-latin.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}
/* latin-ext */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v5/normal-latin-ext.woff2) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5;
}
/* latin */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v5/normal-latin.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}
/* latin-ext */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v5/normal-latin-ext.woff2) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5;
}
/* latin */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v5/normal-latin.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `tests/unit/fontes.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extrairFaces, agruparPorArquivo, FAMILIAS } from '../../build/fontes.mjs';

const raiz = new URL('../../', import.meta.url);
const ler = (p) => readFile(new URL(p, raiz));
const porArquivo = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const fixture = async () => (await ler('tests/fixtures/fontes/google-geist.css')).toString('utf8');

test('extrairFaces lê subconjunto, estilo, peso, URL e unicode-range', async () => {
  const faces = extrairFaces(await fixture());
  assert.equal(faces.length, 7);
  assert.deepEqual(faces[0], {
    subconjunto: 'cyrillic', familia: 'Geist', estilo: 'italic', peso: 400,
    url: 'https://fonts.gstatic.com/s/geist/v5/italico-cirilico.woff2',
    unicodeRange: 'U+0301, U+0400-045F',
  });
  assert.deepEqual(faces.map((f) => f.peso), [400, 400, 400, 400, 400, 600, 600]);
});

test('agruparPorArquivo deduplica a fonte variável e ignora outros subconjuntos', async () => {
  const arquivos = agruparPorArquivo(extrairFaces(await fixture()), 'geist');
  assert.deepEqual(arquivos.map((a) => [a.arquivo, a.pesos, a.subconjunto]), [
    ['geist-italico-latin-ext.woff2', [400], 'latin-ext'],
    ['geist-italico-latin.woff2', [400], 'latin'],
    ['geist-normal-latin-ext.woff2', [400, 600], 'latin-ext'],
    ['geist-normal-latin.woff2', [400, 600], 'latin'],
  ]);
});

test('agruparPorArquivo distingue arquivos estáticos de mesmo subconjunto pelos pesos', () => {
  const faces = [400, 700].map((peso) => ({
    subconjunto: 'latin', familia: 'X', estilo: 'normal', peso,
    url: `https://exemplo.org/x-${peso}.woff2`, unicodeRange: 'U+0000-00FF',
  }));
  assert.deepEqual(agruparPorArquivo(faces, 'x').map((a) => a.arquivo),
    ['x-normal-latin-400.woff2', 'x-normal-latin-700.woff2']);
});

test('manifesto lista os 8 arquivos esperados', async () => {
  const manifesto = JSON.parse(await ler('assets/fontes/fontes.json'));
  assert.deepEqual(manifesto.map((m) => [m.arquivo, m.familia, m.estilo, m.pesos]).sort(porArquivo), [
    ['geist-italico-latin-ext.woff2', 'Geist', 'italic', [400]],
    ['geist-italico-latin.woff2', 'Geist', 'italic', [400]],
    ['geist-mono-normal-latin-ext.woff2', 'Geist Mono', 'normal', [400, 600, 700]],
    ['geist-mono-normal-latin.woff2', 'Geist Mono', 'normal', [400, 600, 700]],
    ['geist-normal-latin-ext.woff2', 'Geist', 'normal', [400, 600]],
    ['geist-normal-latin.woff2', 'Geist', 'normal', [400, 600]],
    ['open-sans-normal-latin-ext.woff2', 'Open Sans', 'normal', [600]],
    ['open-sans-normal-latin.woff2', 'Open Sans', 'normal', [600]],
  ]);
});

test('cada woff2 existe, é woff2 e confere com o manifesto', async () => {
  const manifesto = JSON.parse(await ler('assets/fontes/fontes.json'));
  for (const m of manifesto) {
    const bytes = await ler(`assets/fontes/${m.arquivo}`);
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOF2', m.arquivo);
    assert.equal(bytes.length, m.bytes, m.arquivo);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), m.sha256, m.arquivo);
    assert.match(m.unicodeRange, /^U\+/, m.arquivo);
    assert.match(m.origem, /^https:\/\/fonts\.gstatic\.com\//, m.arquivo);
  }
});

test('licenças OFL das três famílias', async () => {
  assert.deepEqual(FAMILIAS.map((f) => f.slug), ['geist', 'geist-mono', 'open-sans']);
  for (const f of FAMILIAS) {
    const texto = (await ler(`assets/fontes/licencas/${f.slug}-OFL.txt`)).toString('utf8');
    assert.match(texto, /SIL OPEN FONT LICENSE/i, f.slug);
  }
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL em `fontes.test.mjs` com `Cannot find module '.../build/fontes.mjs'`.

- [ ] **Step 4: Criar `build/fontes.mjs`**

```js
// Baixa do Google Fonts, uma vez, os woff2 (latin e latin-ext) e as licenças OFL
// de Geist, Geist Mono e Open Sans para assets/fontes/, com um manifesto.
//   node build/fontes.mjs        (só com autorização do autor para os downloads)
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export const SUBCONJUNTOS = ['latin', 'latin-ext'];
export const FAMILIAS = [
  { familia: 'Geist', slug: 'geist', consulta: 'Geist:ital,wght@0,400;0,600;1,400',
    licenca: 'https://raw.githubusercontent.com/google/fonts/main/ofl/geist/OFL.txt' },
  { familia: 'Geist Mono', slug: 'geist-mono', consulta: 'Geist+Mono:wght@400;600;700',
    licenca: 'https://raw.githubusercontent.com/google/fonts/main/ofl/geistmono/OFL.txt' },
  { familia: 'Open Sans', slug: 'open-sans', consulta: 'Open+Sans:wght@600',
    licenca: 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OFL.txt' },
];

export function extrairFaces(css) {
  const faces = [];
  for (const [, subconjunto, corpo] of css.matchAll(/\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const campo = (nome) => new RegExp(`${nome}:\\s*([^;]+);`).exec(corpo)?.[1].trim();
    faces.push({
      subconjunto,
      familia: campo('font-family').replace(/['"]/g, ''),
      estilo: campo('font-style'),
      peso: Number(campo('font-weight')),
      url: /url\((https:[^)]+\.woff2)\)/.exec(corpo)?.[1],
      unicodeRange: campo('unicode-range'),
    });
  }
  return faces;
}

export function agruparPorArquivo(faces, slug) {
  const porUrl = new Map();
  for (const f of faces) {
    if (!SUBCONJUNTOS.includes(f.subconjunto)) continue;
    if (!porUrl.has(f.url)) porUrl.set(f.url, { familia: f.familia, estilo: f.estilo, pesos: [], subconjunto: f.subconjunto, unicodeRange: f.unicodeRange, url: f.url });
    const item = porUrl.get(f.url);
    if (!item.pesos.includes(f.peso)) item.pesos.push(f.peso);
  }
  const itens = [...porUrl.values()].map((i) => ({ ...i, pesos: i.pesos.sort((a, b) => a - b) }));
  const base = (i) => `${slug}-${i.estilo === 'italic' ? 'italico' : 'normal'}-${i.subconjunto}`;
  const contagem = new Map();
  for (const i of itens) contagem.set(base(i), (contagem.get(base(i)) ?? 0) + 1);
  for (const i of itens) i.arquivo = contagem.get(base(i)) > 1 ? `${base(i)}-${i.pesos.join('-')}.woff2` : `${base(i)}.woff2`;
  return itens.sort((a, b) => (a.arquivo < b.arquivo ? -1 : a.arquivo > b.arquivo ? 1 : 0));
}

async function baixar(url) {
  const resposta = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return Buffer.from(await resposta.arrayBuffer());
}

async function principal() {
  const destino = resolve(RAIZ, 'assets/fontes');
  await mkdir(resolve(destino, 'licencas'), { recursive: true });
  const manifesto = [];
  for (const familia of FAMILIAS) {
    const css = (await baixar(`https://fonts.googleapis.com/css2?family=${familia.consulta}&display=swap`)).toString('utf8');
    for (const arq of agruparPorArquivo(extrairFaces(css), familia.slug)) {
      const bytes = await baixar(arq.url);
      if (bytes.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error(`não é woff2: ${arq.url}`);
      await writeFile(resolve(destino, arq.arquivo), bytes);
      manifesto.push({
        familia: arq.familia, estilo: arq.estilo, pesos: arq.pesos, subconjunto: arq.subconjunto,
        unicodeRange: arq.unicodeRange, arquivo: arq.arquivo, bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'), origem: arq.url,
      });
    }
    const licenca = (await baixar(familia.licenca)).toString('utf8');
    if (!/SIL OPEN FONT LICENSE/i.test(licenca)) throw new Error(`licença inesperada em ${familia.licenca}`);
    await writeFile(resolve(destino, 'licencas', `${familia.slug}-OFL.txt`), licenca);
  }
  await writeFile(resolve(destino, 'fontes.json'), JSON.stringify(manifesto, null, 2) + '\n');
  for (const m of manifesto) console.log(`${m.arquivo} · ${m.bytes} bytes · pesos ${m.pesos.join('/')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
```

- [ ] **Step 5: Rodar os testes de parser**

Run: `node --test tests/unit/fontes.test.mjs`
Expected: PASS nos 3 testes de parser; FAIL nos 3 testes de arquivos com `ENOENT` em `assets/fontes/fontes.json` (os downloads ainda não foram feitos).

- [ ] **Step 6: Baixar (só com a autorização do pré-requisito)**

Run: `npm run fontes`
Expected: 8 linhas, uma por arquivo, por exemplo `geist-normal-latin.woff2 · 29288 bytes · pesos 400/600` (os tamanhos podem variar se o Google Fonts atualizar as fontes).

- [ ] **Step 7: Rodar todos os testes**

Run: `npm test`
Expected: PASS em `tokens` (8), `contrato` (11) e `fontes` (6).

- [ ] **Step 8: Commit**

```bash
git add build/fontes.mjs tests/fixtures/fontes/google-geist.css tests/unit/fontes.test.mjs assets/fontes/
git commit -m "feat(fontes): Geist, Geist Mono e Open Sans embutíveis, com manifesto e licenças OFL

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 4: Marcas oficiais e unidades

**Pré-requisito (sessão principal, antes de despachar):** autorização explícita do autor para baixar:

| arquivo | origem | tamanho | destino |
|---|---|---|---|
| `usp-logo-pdf.pdf` | `https://scs.usp.br/identidadevisual/wp-content/uploads/2022/08/usp-logo-pdf.pdf` | 135 KB | `assets/marcas/origem/usp-logo.pdf` |
| `Horizontal_preta.svg` | `https://www.ime.usp.br/media/identidade_visual/imagens/IME+USP/Preta/SVG/Horizontal_preta.svg` | 159 KB | `assets/marcas/ime-usp-horizontal-preta.svg` |
| `logo_IFUSP_2025_VERT_preto.png` | `https://portal.if.usp.br/imprensa/sites/portal.if.usp.br.ifusp/files/logo_IFUSP_2025_VERT_preto.png` | não informado pelo servidor | `assets/marcas/ifusp-vertical-preto.png` |
| manual do IME | `https://www.ime.usp.br/media/identidade_visual/manual-identidade-visual-IME-MAR2021-web.pdf` | 19,7 MB | pasta temporária, fora do git |
| manual do IFUSP | `https://portal.if.usp.br/imprensa/sites/portal.if.usp.br.ifusp/files/manual%20de%20identidade%20visual%20ifusp_0.pdf` | não informado pelo servidor | pasta temporária, fora do git |

Sem autorização, a tarefa para no passo 4. Esta tarefa tem **um ponto de parada**: se o lockup do IME trouxer o nome antigo do instituto (passo 7), o executor devolve a pergunta ao coordenador, que a leva ao autor.

**Files:**
- Create: `build/marcas.mjs`
- Create (baixados ou gerados): `assets/marcas/origem/usp-logo.pdf`, `assets/marcas/usp-preto.svg`, `assets/marcas/ime-usp-horizontal-preta.svg`, `assets/marcas/ifusp-vertical-preto.png`
- Create: `assets/marcas/unidades.json`, `assets/marcas/usp.json`, `assets/marcas/README.md`
- Test: `tests/unit/marcas.test.mjs`

**Interfaces:**
- Consumes: `simplificar(await lerTokens()).marca.uspAltura` (Task 1).
- Produces (usado por M2 na faixa de marca):
  - `assets/marcas/unidades.json`: `{ <chave>: { nome, arquivo, integraUSP: boolean, altura, protecao, alturaMinima } }` (números em px);
  - `assets/marcas/usp.json`: `{ arquivo: "usp-preto.svg", altura: 56, protecao: number, texto: "Universidade de São Paulo" }`;
  - de `build/marcas.mjs`: `ORIGENS`, `assinaturaConfere(tipo, bytes) → boolean`, `dimensoesPng(bytes) → {largura, altura}`, `lerPgm(bytes) → {largura, altura, pixels: Uint8Array}`, `caixaEscura(pgm, limiar = 128) → {x, y, largura, altura}`, `enquadrarSvg(texto, caixa) → string`, `coresSvg(texto) → string[]` (hexadecimais `#RRGGBB` em maiúsculas, ou `none`), `ehEscura(hex) → boolean`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/unit/marcas.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import {
  assinaturaConfere, dimensoesPng, lerPgm, caixaEscura, enquadrarSvg, coresSvg, ehEscura,
} from '../../build/marcas.mjs';
import { lerTokens, simplificar } from '../../build/tokens.mjs';

const raiz = new URL('../../', import.meta.url);
const ler = (p) => readFile(new URL(p, raiz));
const lerTexto = async (p) => (await ler(p)).toString('utf8');

test('assinaturaConfere reconhece PDF, PNG e SVG', () => {
  assert.ok(assinaturaConfere('pdf', Buffer.from('%PDF-1.5 ...')));
  assert.ok(assinaturaConfere('png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
  assert.ok(assinaturaConfere('svg', Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>')));
  assert.ok(!assinaturaConfere('png', Buffer.from('%PDF-1.5')));
  assert.ok(!assinaturaConfere('svg', Buffer.from('<html></html>')));
});

test('dimensoesPng lê largura e altura do IHDR', () => {
  const png = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.write('IHDR', 12, 'latin1');
  png.writeUInt32BE(1240, 16);
  png.writeUInt32BE(2000, 20);
  assert.deepEqual(dimensoesPng(png), { largura: 1240, altura: 2000 });
});

test('lerPgm e caixaEscura acham o retângulo com tinta', () => {
  const largura = 6, altura = 4;
  const pixels = Buffer.alloc(largura * altura, 255);
  pixels[1 * largura + 2] = 0;  // (x=2, y=1)
  pixels[2 * largura + 4] = 10; // (x=4, y=2)
  const pgm = Buffer.concat([Buffer.from(`P5\n${largura} ${altura}\n255\n`, 'latin1'), pixels]);
  const imagem = lerPgm(pgm);
  assert.equal(imagem.largura, 6);
  assert.equal(imagem.altura, 4);
  assert.deepEqual(caixaEscura(imagem), { x: 2, y: 1, largura: 3, altura: 2 });
});

test('enquadrarSvg troca só width, height e viewBox da raiz', () => {
  const svg = '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="595pt" height="842pt" viewBox="0 0 595 842" version="1.1">\n<path d="M 1 1 L 2 2" style="fill:rgb(0%,0%,0%);"/>\n</svg>';
  const saida = enquadrarSvg(svg, { x: 10, y: 20, largura: 300, altura: 100 });
  assert.match(saida, /<svg [^>]*width="300pt"/);
  assert.match(saida, /<svg [^>]*height="100pt"/);
  assert.match(saida, /<svg [^>]*viewBox="10 20 300 100"/);
  assert.ok(saida.includes('<path d="M 1 1 L 2 2" style="fill:rgb(0%,0%,0%);"/>'), 'traços intactos');
});

test('coresSvg normaliza hexadecimal, rgb em porcentagem, nomes e style', () => {
  const svg = '<svg><path fill="#1d1d1b"/><rect style="fill:rgb(0%, 0%, 0%);stroke:none"/>'
    + '<circle fill="black" stroke="#FFF"/><g fill="rgb(255,255,255)"/></svg>';
  assert.deepEqual(coresSvg(svg), ['#000000', '#1D1D1B', '#FFFFFF', 'none']);
  assert.ok(ehEscura('#1D1D1B') && ehEscura('#000000'));
  assert.ok(!ehEscura('#1094AB') && !ehEscura('#FFFFFF'));
});

const escuraOuNeutra = (c) => c === 'none' || c === '#FFFFFF' || ehEscura(c);

test('logo USP: SVG vetorial, só preto, enquadrado', async () => {
  const svg = await lerTexto('assets/marcas/usp-preto.svg');
  assert.ok(assinaturaConfere('svg', Buffer.from(svg)));
  assert.ok(!/<image\b/.test(svg), 'sem imagem raster embutida');
  assert.ok(coresSvg(svg).every((c) => c === 'none' || ehEscura(c)), `cores: ${coresSvg(svg)}`);
  const [, , , w, h] = /viewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/.exec(svg);
  assert.ok(Number(w) > 0 && Number(h) > 0);
  assert.ok(existsSync(new URL('assets/marcas/origem/usp-logo.pdf', raiz)));
});

test('lockup IME+USP: SVG sem raster e sem cor', async () => {
  const svg = await lerTexto('assets/marcas/ime-usp-horizontal-preta.svg');
  assert.ok(assinaturaConfere('svg', Buffer.from(svg)));
  assert.ok(!/<image\b/.test(svg), 'sem imagem raster embutida');
  assert.ok(coresSvg(svg).every(escuraOuNeutra), `cores: ${coresSvg(svg)}`);
});

test('IFUSP vertical preto: PNG com resolução suficiente', async () => {
  const png = await ler('assets/marcas/ifusp-vertical-preto.png');
  assert.ok(assinaturaConfere('png', png));
  assert.ok(dimensoesPng(png).altura >= 512, `altura ${dimensoesPng(png).altura}`);
});

test('unidades.json e usp.json completos e coerentes', async () => {
  const unidades = JSON.parse(await lerTexto('assets/marcas/unidades.json'));
  assert.deepEqual(Object.keys(unidades).sort(), ['ifusp', 'ime']);
  assert.equal(unidades.ime.integraUSP, true);
  assert.equal(unidades.ifusp.integraUSP, false);
  for (const [chave, u] of Object.entries(unidades)) {
    for (const campo of ['altura', 'protecao', 'alturaMinima'])
      assert.ok(Number.isInteger(u[campo]) && u[campo] > 0, `${chave}.${campo}`);
    assert.ok(u.altura >= u.alturaMinima, `${chave}: altura abaixo da mínima`);
    assert.ok(typeof u.nome === 'string' && u.nome.length > 0, `${chave}.nome`);
    assert.ok(existsSync(new URL(`assets/marcas/${u.arquivo}`, raiz)), `${chave}: arquivo ausente`);
  }
  const usp = JSON.parse(await lerTexto('assets/marcas/usp.json'));
  const tokens = simplificar(await lerTokens());
  assert.equal(usp.arquivo, 'usp-preto.svg');
  assert.equal(usp.altura, tokens.marca.uspAltura);
  assert.equal(usp.texto, 'Universidade de São Paulo');
  assert.ok(Number.isInteger(usp.protecao) && usp.protecao > 0);
});

test('README das marcas cita as origens e as páginas dos manuais', async () => {
  const readme = await lerTexto('assets/marcas/README.md');
  for (const trecho of ['scs.usp.br', 'ime.usp.br', 'portal.if.usp.br', 'Área de proteção', 'Altura mínima'])
    assert.ok(readme.includes(trecho), `README sem "${trecho}"`);
  assert.match(readme, /página \d+/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL em `marcas.test.mjs` com `Cannot find module '.../build/marcas.mjs'`.

- [ ] **Step 3: Criar `build/marcas.mjs`**

```js
// Baixa os logos oficiais para assets/marcas/ e converte o logo USP de PDF para SVG,
// enquadrando o viewBox no desenho sem tocar nos traços.
//   node build/marcas.mjs        (só com autorização do autor para os downloads)
import { writeFile, readFile, mkdir, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARCAS = resolve(RAIZ, 'assets/marcas');

export const ORIGENS = [
  { tipo: 'pdf', destino: 'origem/usp-logo.pdf',
    url: 'https://scs.usp.br/identidadevisual/wp-content/uploads/2022/08/usp-logo-pdf.pdf' },
  { tipo: 'svg', destino: 'ime-usp-horizontal-preta.svg',
    url: 'https://www.ime.usp.br/media/identidade_visual/imagens/IME+USP/Preta/SVG/Horizontal_preta.svg' },
  { tipo: 'png', destino: 'ifusp-vertical-preto.png',
    url: 'https://portal.if.usp.br/imprensa/sites/portal.if.usp.br.ifusp/files/logo_IFUSP_2025_VERT_preto.png' },
];

export function assinaturaConfere(tipo, bytes) {
  if (tipo === 'pdf') return bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  if (tipo === 'png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (tipo === 'svg') return /<svg[\s>]/.test(bytes.subarray(0, 2048).toString('utf8'));
  throw new Error(`tipo desconhecido: ${tipo}`);
}

export function dimensoesPng(bytes) {
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) };
}

// PGM binário (P5) de 8 bits, como o gerado por `pdftoppm -gray`
export function lerPgm(bytes) {
  const cabecalho = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(bytes.subarray(0, 64).toString('latin1'));
  if (!cabecalho || cabecalho[3] !== '255') throw new Error('PGM P5 de 8 bits esperado');
  const [inteiro, largura, altura] = [cabecalho[0], Number(cabecalho[1]), Number(cabecalho[2])];
  return { largura, altura, pixels: new Uint8Array(bytes.subarray(inteiro.length, inteiro.length + largura * altura)) };
}

export function caixaEscura({ largura, altura, pixels }, limiar = 128) {
  let x0 = largura, y0 = altura, x1 = -1, y1 = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (pixels[y * largura + x] < limiar) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('nenhum pixel escuro na imagem');
  return { x: x0, y: y0, largura: x1 - x0 + 1, altura: y1 - y0 + 1 };
}

export function enquadrarSvg(texto, { x, y, largura, altura }) {
  return texto.replace(/<svg\b[^>]*>/, (raizSvg) => raizSvg
    .replace(/\swidth="[^"]*"/, ` width="${largura}pt"`)
    .replace(/\sheight="[^"]*"/, ` height="${altura}pt"`)
    .replace(/\sviewBox="[^"]*"/, ` viewBox="${x} ${y} ${largura} ${altura}"`));
}

const NOMES = { black: '#000000', white: '#FFFFFF', none: 'none' };

function normalizarCor(valor) {
  const v = valor.trim().toLowerCase();
  if (v in NOMES) return NOMES[v];
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return `#${[...m[1]].map((c) => c + c).join('')}`.toUpperCase();
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return `#${m[1]}`.toUpperCase();
  m = /^rgb\(\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*\)$/.exec(v);
  if (m) {
    const canal = (n, pct) => Math.round(pct ? (Number(n) * 255) / 100 : Number(n));
    return `#${[canal(m[1], m[2]), canal(m[3], m[4]), canal(m[5], m[6])].map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  return null; // url(#…), currentColor e outros ficam de fora
}

export function coresSvg(texto) {
  const cores = new Set();
  for (const [, valor] of texto.matchAll(/\b(?:fill|stroke)\s*[:=]\s*"?([^";>]+)/g)) {
    const cor = normalizarCor(valor.replace(/"$/, ''));
    if (cor) cores.add(cor);
  }
  return [...cores].sort();
}

export function ehEscura(hex) {
  return [1, 3, 5].every((i) => parseInt(hex.slice(i, i + 2), 16) <= 0x40);
}

async function baixar(url) {
  const resposta = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return Buffer.from(await resposta.arrayBuffer());
}

async function principal() {
  await mkdir(resolve(MARCAS, 'origem'), { recursive: true });
  for (const origem of ORIGENS) {
    const bytes = await baixar(origem.url);
    if (!assinaturaConfere(origem.tipo, bytes)) throw new Error(`conteúdo inesperado em ${origem.url}`);
    await writeFile(resolve(MARCAS, origem.destino), bytes);
    console.log(`${origem.destino} · ${bytes.length} bytes`);
  }
  const temporaria = await mkdtemp(join(tmpdir(), 'aula-usp-marcas-'));
  const pdf = resolve(MARCAS, 'origem/usp-logo.pdf');
  execFileSync('pdftoppm', ['-gray', '-r', '72', '-singlefile', pdf, join(temporaria, 'usp')]);
  const caixa = caixaEscura(lerPgm(await readFile(join(temporaria, 'usp.pgm'))));
  execFileSync('pdftocairo', ['-svg', pdf, join(temporaria, 'usp.svg')]);
  const svg = enquadrarSvg(await readFile(join(temporaria, 'usp.svg'), 'utf8'), caixa);
  await writeFile(resolve(MARCAS, 'usp-preto.svg'), svg);
  console.log(`usp-preto.svg · viewBox ${caixa.x} ${caixa.y} ${caixa.largura} ${caixa.altura} (pt)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
```

Nota: `pdftoppm -r 72` gera 1 px por ponto, a mesma unidade do `viewBox` que o `pdftocairo -svg` escreve; por isso a caixa medida no PGM serve direto como `viewBox`.

- [ ] **Step 4: Rodar os testes de funções**

Run: `node --test tests/unit/marcas.test.mjs`
Expected: PASS nos 5 testes de funções; FAIL nos 5 testes de arquivos com `ENOENT` (downloads ainda não feitos).

- [ ] **Step 5: Baixar os logos (só com a autorização do pré-requisito)**

Run: `npm run marcas`
Expected: três linhas com `origem/usp-logo.pdf · 135113 bytes`, `ime-usp-horizontal-preta.svg · 158958 bytes`, `ifusp-vertical-preto.png · <n> bytes`, e uma quarta com `usp-preto.svg · viewBox …`.

- [ ] **Step 6: Olhar os três logos**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OLHAR="$(mktemp -d)"
for f in usp-preto.svg ime-usp-horizontal-preta.svg ifusp-vertical-preto.png; do
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1400,700 \
    --screenshot="$OLHAR/${f%.*}.png" "file://$PWD/assets/marcas/$f"
done
echo "$OLHAR"
```

Abrir as três capturas (com a ferramenta de leitura de imagens) e conferir:
- `usp-preto`: só o logotipo USP, preto, sem outros elementos, com o desenho encostado nas bordas da imagem (enquadramento do passo 3);
- `ime-usp-horizontal-preta`: busto, sigla IME e logotipo USP, em preto;
- `ifusp-vertical-preto`: símbolo, "IFUSP" e "Instituto de Física da USP", em preto.

- [ ] **Step 7: Ponto de parada, se for o caso**

Parar e devolver ao coordenador, com as capturas, se ocorrer qualquer um destes casos:
1. o lockup do IME traz por extenso o nome antigo, "Instituto de Matemática e Estatística" (sem "Ciência da Computação");
2. o PDF da USP traz algo além do logotipo (texto, margem com outros elementos, mais de uma página);
3. algum logo não está em preto.

O coordenador leva a pergunta ao autor; a tarefa só continua com a resposta. Sem nenhum desses casos, seguir.

- [ ] **Step 8: Baixar os manuais para fora do repositório (só com autorização) e achar as regras**

```bash
MANUAIS="${TMPDIR:-/tmp}/aula-usp-manuais" && mkdir -p "$MANUAIS"
curl -sL -o "$MANUAIS/ime.pdf" "https://www.ime.usp.br/media/identidade_visual/manual-identidade-visual-IME-MAR2021-web.pdf"
curl -sL -o "$MANUAIS/ifusp.pdf" "https://portal.if.usp.br/imprensa/sites/portal.if.usp.br.ifusp/files/manual%20de%20identidade%20visual%20ifusp_0.pdf"
for m in ime ifusp; do
  paginas=$(pdfinfo "$MANUAIS/$m.pdf" | awk '/^Pages:/{print $2}')
  for p in $(seq 1 "$paginas"); do
    if pdftotext -f "$p" -l "$p" "$MANUAIS/$m.pdf" - | grep -qiE 'prote[cç][aã]o|preserva[cç][aã]o|m[ií]nim|redu[cç][aã]o'; then
      echo "$m: página $p"
    fi
  done
done
```

Expected: uma lista de páginas por manual. Para cada página listada, ler o texto (`pdftotext -layout -f <p> -l <p> "$MANUAIS/<m>.pdf" -`) e, quando a regra depender de desenho, olhar a página renderizada (`pdftoppm -png -r 60 -f <p> -l <p> "$MANUAIS/<m>.pdf" "$MANUAIS/<m>-p<p>"`).

Regras de conversão para `unidades.json`, na altura de uso (`altura`: IME 88, IFUSP 128):
- **área de proteção** dada como fração ou múltiplo de um elemento do logo (por exemplo, "x = altura da letra I"): medir esse elemento na captura do passo 6 como fração da altura total do logo e fazer `protecao = ceil(fração × múltiplo × altura)`; dada como fração da altura do logo: `protecao = ceil(fração × altura)`;
- **tamanho mínimo digital** em px (largura ou altura): converter para altura pela proporção do arquivo e arredondar para cima; **só em mm** (impresso): `alturaMinima = ceil(mm × 3,7795)` (96 px por polegada);
- **manual sem regra**: manter os valores da spec (IME: `protecao` 24, `alturaMinima` 40; IFUSP: `protecao` 24, `alturaMinima` 80) e registrar no README que o manual não define, citando as páginas consultadas;
- se `altura` ficar abaixo de `alturaMinima`, subir `altura` para `alturaMinima`.

Área de proteção da USP (regra da SCS: altura do "P" do logotipo), medida no próprio arquivo:

```bash
node --input-type=module -e "
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { lerPgm, caixaEscura } from './build/marcas.mjs';
execFileSync('pdftoppm', ['-gray', '-r', '288', '-singlefile', 'assets/marcas/origem/usp-logo.pdf', '/tmp/usp-p']);
const img = lerPgm(await readFile('/tmp/usp-p.pgm'));
const total = caixaEscura(img);
const inicio = total.x + Math.floor((total.largura * 2) / 3);
const recorte = { largura: img.largura - inicio, altura: img.altura, pixels: new Uint8Array(img.altura * (img.largura - inicio)) };
for (let y = 0; y < img.altura; y++) recorte.pixels.set(img.pixels.subarray(y * img.largura + inicio, (y + 1) * img.largura), y * recorte.largura);
const p = caixaEscura(recorte);
console.log('altura do P / altura do logo =', (p.altura / total.altura).toFixed(3), '→ protecao =', Math.ceil((p.altura / total.altura) * 56), 'px');
"
```

Expected: uma razão entre 0,5 e 1,0 e o valor de `protecao` em px para o logo de 56 px. O recorte pega o terço direito do logotipo, onde fica o "P"; se a captura do passo 6 mostrar outra disposição das letras, ajustar o recorte ao "P" e registrar isso no README.

- [ ] **Step 9: Gravar `assets/marcas/unidades.json` e `assets/marcas/usp.json`**

`unidades.json`, com os números obtidos no passo 8 (os valores abaixo são os da spec e valem só se o manual não definir outros):

```json
{
  "ime": {
    "nome": "Instituto de Matemática, Estatística e Ciência da Computação",
    "arquivo": "ime-usp-horizontal-preta.svg",
    "integraUSP": true,
    "altura": 88,
    "protecao": 24,
    "alturaMinima": 40
  },
  "ifusp": {
    "nome": "Instituto de Física",
    "arquivo": "ifusp-vertical-preto.png",
    "integraUSP": false,
    "altura": 128,
    "protecao": 24,
    "alturaMinima": 80
  }
}
```

`usp.json`, com `protecao` igual ao valor impresso no passo 8:

```json
{
  "arquivo": "usp-preto.svg",
  "altura": 56,
  "protecao": 56,
  "texto": "Universidade de São Paulo"
}
```

- [ ] **Step 10: Escrever `assets/marcas/README.md`**

O README registra fatos verificados; cada número vem do passo 8, com a página do manual. Estrutura:

```markdown
# Marcas

Arquivos oficiais usados na faixa de marca da capa e do encerramento (spec, seção 4.5).
Nunca redesenhar, recolorir, distorcer ou aplicar efeitos.

## Origem

| arquivo | origem | observação |
|---|---|---|
| `origem/usp-logo.pdf` | https://scs.usp.br/identidadevisual/wp-content/uploads/2022/08/usp-logo-pdf.pdf | original vetorial da SCS-USP |
| `usp-preto.svg` | convertido de `origem/usp-logo.pdf` por `build/marcas.mjs` | traços intactos; só o viewBox foi enquadrado |
| `ime-usp-horizontal-preta.svg` | https://www.ime.usp.br/media/identidade_visual/imagens/IME+USP/Preta/SVG/Horizontal_preta.svg | lockup IME+USP; resultado da verificação do nome no passo 7 |
| `ifusp-vertical-preto.png` | https://portal.if.usp.br/imprensa/sites/portal.if.usp.br.ifusp/files/logo_IFUSP_2025_VERT_preto.png | só existe em PNG; <largura>×<altura> px; pedir versão vetorial à comunicação do IF |

## Área de proteção

- USP: altura do "P" do logotipo (regra da SCS-USP); medida: <razão> da altura, <protecao> px a 56 px.
- IME: <regra do manual, com a página: "página N">; <protecao> px a <altura> px.
- IFUSP: <regra do manual, com a página: "página N">; <protecao> px a <altura> px.

## Altura mínima

- IME: <regra do manual e conversão usada, com "página N">.
- IFUSP: <regra do manual e conversão usada, com "página N">.
```

Os trechos entre `<` e `>` são preenchidos com o que os passos 5 a 8 mediram e leram. Nenhum pode sobrar no arquivo gravado: rodar `grep -n '<[a-z]' assets/marcas/README.md` e confirmar saída vazia.

- [ ] **Step 11: Rodar todos os testes**

Run: `npm test`
Expected: PASS em `tokens` (8), `contrato` (11), `fontes` (6) e `marcas` (10).

- [ ] **Step 12: Commit**

```bash
git add build/marcas.mjs tests/unit/marcas.test.mjs assets/marcas/
git commit -m "feat(marcas): logos oficiais da USP, do IME e do IFUSP, com regras dos manuais

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verificação final do marco

- [ ] `npm test` passa com 35 testes (8 + 11 + 6 + 10).
- [ ] `npm run tokens` não altera nada: `git status --short` vazio depois de rodar.
- [ ] `git log --oneline` mostra os quatro commits do marco sobre o commit da spec.
- [ ] Nenhum manual no repositório: `git ls-files | grep -i manual` sem saída.
