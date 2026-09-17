# Aula USP · Marco 3b (Matemática) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renderizar a matemática em TeX com o KaTeX: `\( \)` no texto, `\[ \]` em destaque, `\passo` como passo do motor, erro como alerta no lugar, e título com TeX virando texto limpo no cromo.

**Architecture:** `componentes/tex.js` acha os trechos de TeX nos nós de texto e troca cada um pelo HTML do KaTeX, que chega por parâmetro para o mesmo módulo rodar no navegador e no build; a função devolve os erros, cada um com o trecho e a mensagem. `montar/blocos.js` usa as funções de texto do mesmo módulo, para que rótulo do cabeçalho, slug, `aria-label` e visão geral não mostrem TeX cru. Em desenvolvimento, `aula-usp servir` passa a servir `componentes/` e a pasta `dist` do pacote `katex`, e `montar/navegador.js` carrega o KaTeX só quando a aula tem TeX, renderizando antes de iniciar o motor.

**Tech Stack:** Node 20+ (máquina do autor: v25.6.1), ES modules, `node:test`; `katex` 0.18.7 (dependência nova, versão exata); `linkedom` e `playwright-core`, já em `devDependencies`; Google Chrome instalado (ou `CHROME_PATH`).

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 3.2, 3.5, 4.2, 4.3, 6.4, 7.1, 8.2 e 11.1). Estado de partida: marco 3a na `main` (`756a75a`), com componentes de corpo; 129 testes unitários e 59 de integração.

## Global Constraints

- Node 20 ou superior; ES modules; testes com `node:test` e `node:assert/strict`; sem Python.
- `montar/`, `motor/` e `componentes/` não importam nada de Node: só API padrão do DOM, para rodar no navegador (spec 3.5).
- Nomes de arquivos, pastas, classes, atributos e identificadores em português.
- Toda classe gerada pelo sistema está em `contrato.classesDoSistema`; classes do autor nunca são geradas pelo sistema.
- Cor (spec 4.2): nenhuma outra cor nos slides além dos tokens, "inclusive em SVG inline e em TeX".
- Tipografia (spec 4.3): "matemática sempre em TeX: `\( … \)` no texto e `\[ … \]` em destaque; `$` não é delimitador, porque "R$ 100" aparece em aulas de atuária e finanças"; na tabela de papéis, matemática a "1,1 × o texto ao redor".
- Componente (spec 7.1): "`\( … \)` no texto; `\[ … \]` alinhado à esquerda, a 1,1 × o corpo; `\tag` permitido; `\passo{n}{…}` dentro de `aligned`", "sem comandos de cor e estilo (seção 5.5)". A seção 5.5 proíbe no corpo "comandos de cor e de estilo em TeX (`\color`, `\textcolor`, `\colorbox`, `\fcolorbox`, `\htmlStyle`, `\htmlClass`, `\htmlId`); de `\htmlData`, só o gerado por `\passo`".
- Passos (spec 6.4): "`\passo{n}{…}` em TeX gera um passo de número `n` dentro da equação. A macro é definida como `\htmlData{passo=#1}{#2}`, com o `trust` do KaTeX restrito a `\htmlData`." Passos ocultos usam `visibility: hidden`.
- Erros (spec 7.1): "no build, com `throwOnError` ligado, e o erro vira mensagem do validador; no navegador, a equação inválida aparece no lugar como um `alerta` com o trecho, e a mesma mensagem vai para o painel."
- Carga (spec 3.2): o runtime só carrega a matemática "se a aula tem `\(` ou `\[`".
- Testes (spec 11.1): "TeX: `\( \)` e `\[ \]` reconhecidos; "R$ 100" não vira matemática; TeX dentro de `pre` é ignorado; comandos proibidos detectados"; "`\passo`: gera `data-passo` dentro do `aligned` sem quebrar o alinhamento".
- Dependência nova: só `katex`, na versão exata 0.18.7 (spec 8.2 lista `katex`).
- Testes de integração rodam um arquivo por vez (`node --test tests/integracao/<arquivo>`), para que cada execução termine em segundos.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Decisões deste marco (conferidas com o KaTeX 0.18.7 e no Chrome 152 antes de escrever o plano; o autor pode revê-las)

- **O que era o M3b foi dividido de novo.** Este plano cobre só a matemática. O código com destaque (Shiki) fica para o M3c: são dois renderizadores independentes, e este marco estabelece o carregamento sob demanda que o M3c reaproveita.
- **KaTeX 0.18.7, versão exata.** É a versão atual do pacote; a cópia que existia na máquina era a 0.16.47. O download foi autorizado pelo autor.
- **O KaTeX entra por parâmetro.** `renderizarTex(raiz, { katex })` não importa o pacote, então o mesmo `componentes/tex.js` roda no navegador, no `linkedom` dos testes e, no marco 5, no build. `montar/blocos.js` importa só as funções de texto, que não dependem do KaTeX.
- **Em desenvolvimento, o KaTeX vem da pasta `dist` do pacote.** `aula-usp servir` passa a responder `/_aula-usp/bibliotecas/katex/…` a partir de `node_modules/katex/dist`, que tem o módulo `katex.mjs` (sem nenhum `import`), a folha de estilo e as fontes. No marco 5, os scripts de `dist/` embutem tudo.
- **A matemática é renderizada antes do motor.** O motor conta os passos de cada slide ao iniciar; renderizar depois deixaria os `\passo` de fora.
- **Comando não confiável vira erro.** Mesmo com `throwOnError`, o KaTeX não lança exceção para comandos que o `trust` recusa (`\href`, `\url`, `\includegraphics`, `\htmlClass`…): ele os desenha em vermelho. O módulo passa ao KaTeX uma `errorColor` que ninguém escreve e trata como erro a saída que a contém.
- **Cor de TeX não chega ao slide.** As declarações `color`, `background-color` e `border-color` e os atributos `mathcolor` e `mathbackground` são tirados do HTML do KaTeX, então `\color`, `\textcolor`, `\colorbox`, `\fcolorbox` e atalhos como `\red` desenham na cor do texto. As regras estáticas do marco 4 continuam acusando esses comandos no fonte; isto fecha a pendência do M1 sobre as macros de cor do KaTeX no que aparece na tela.
- **`strict: 'ignore'`.** O modo estrito do KaTeX escreve um aviso no console a cada `\htmlData`, que o `\passo` usa, e a cada letra acentuada em modo matemático; problemas de TeX são reportados pelo validador.
- **Erro vira alerta com o trecho.** Em linha, `span.tex-invalido`; em destaque, `div.equacao.tex-invalido`; os dois com o trecho como texto, a mensagem em `title` e o campo `tinta` com texto `papel` do `alerta`. No navegador, cada erro vai também para o console com `console.error`, até o painel do validador existir (marco 4).
- **`\passo` fica dentro de uma célula do `aligned`.** `\passo{1}{c &= d}` é erro de TeX; o certo é `\passo{1}{c} &\passo{1}{= d}`. O KaTeX escreve uma coluna inteira antes da outra no HTML, então os passos de uma equação aparecem no documento como 1, 2, 1, 2: é por isso que a spec exige número em `\passo`, e o motor revela por número. A macro não põe chaves a mais em volta de `#2`: com `{{#2}}`, o `=` perde o espaço de relação e sai da coluna, o que o teste de integração mede.
- **Comandos proibidos detectados, em dois tempos.** Aqui, o que o `trust` recusa (`\htmlClass`, `\htmlStyle`, `\htmlId`, `\href`…) vira erro no lugar; `\color` e afins são aceitos pelo KaTeX e só perdem a cor. Acusar cada um deles no fonte, com mensagem, é das regras estáticas do marco 4.
- **Título com TeX vira texto sem barras nem chaves.** `O papel de \(\eta\)` vira "O papel de eta" no rótulo do cabeçalho, no slug, no `aria-label` do mapa e no cartão da visão geral, com o TeX cru ou já renderizado (pelo `data-tex` que o módulo grava). A Geist não tem grego, então a conversão não usa letras gregas. Isto fecha a pendência do M2a sobre `textoDeTitulo`.
- **O HTML interno do KaTeX fica fora do contrato de classes**, como o conteúdo que uma demo cria (spec 5.5). O sistema gera só `equacao` e `tex-invalido`, que entram em `classesDoSistema`; o teste de classes ignora o que está dentro de `.katex` e `.katex-display`.
- **Saída com MathML** (padrão do KaTeX), para leitores de tela; o `data-passo` sai só no HTML visível, conferido.
- **HTML do KaTeX por `innerHTML` de um `template`.** O KaTeX escapa o texto do autor, e o `trust` só libera `\htmlData`, que grava atributos `data-*`; `template` não executa scripts.
- **Célula de tabela escrita em TeX não é numérica** (decisão pedida pela revisão final do M3a): fica à esquerda, como texto; um teste registra isso.
- **Espécime próprio.** `especime/matematica.html`, com 8 slides, em vez de crescer `especime/componentes.html`, cujos 15 slides são contados pelos testes do M3a; os erros ficam em `tests/fixtures/tex/`.
- **O que continua para depois:** embutir no marco 5 só as famílias de fonte do KaTeX que a aula usa; contar os caracteres de título com TeX pelo que aparece e não pelo fonte (marco 4); `\htmlData` escrito direto pelo autor renderiza, porque o `trust` libera o comando que o `\passo` usa, e a regra estática do marco 4 o acusa; matemática em destaque como primeiro filho de `li` põe o marcador numa linha própria (pendência do M3a).

## Roteiro atualizado

| plano | escopo | depende de |
|---|---|---|
| M3a · Componentes de corpo | concluído na `main` (`756a75a`) | M2c |
| **M3b · Matemática (este)** | KaTeX com `\passo`, alerta de erro, títulos com TeX, carga sob demanda | M3a |
| M3c · Código com destaque | Shiki 4.4.3 com tema dos tokens, `pre[data-lang]`, linhas marcadas, números | M3b |
| M4 · Validador | regras estáticas, de carga e de composição, painel (V) | M3c |
| M5 · Build e PDF | embutir, PDF, regras de saída, `dist` com SRI | M4 |
| M6 · Guia e pacotes | guia, modelo, aula-exemplo, pacotes | M5 |
| M7 · Aceite | Claude Code e Codex CLI | M6 |

## Estrutura de arquivos deste marco

| arquivo | responsabilidade |
|---|---|
| `componentes/tex.js` | acha `\( \)` e `\[ \]`, renderiza com o KaTeX recebido, tira as cores, transforma erro em alerta; texto simples a partir de TeX |
| `montar/blocos.js` | `textoDeTitulo` sem TeX cru |
| `build/servir.mjs` | serve `componentes/` e `bibliotecas/katex/` |
| `montar/navegador.js` | carrega o KaTeX quando a aula tem TeX e renderiza antes do motor |
| `estilos/componentes.css` | tamanho da matemática, destaque à esquerda, alerta de TeX |
| `contrato/contrato.json` | `equacao` e `tex-invalido` em `classesDoSistema` |
| `package.json`, `package-lock.json` | `katex` 0.18.7 |
| `especime/matematica.html` | matemática no texto, em destaque, em passos, em campos, listas e títulos |
| `tests/fixtures/tex/index.html` | TeX inválido, comando não permitido e cores |
| `tests/unit/tex.test.mjs`, `blocos.test.mjs`, `montar.test.mjs`, `corpo.test.mjs`, `servir.test.mjs` | testes unitários |
| `tests/integracao/matematica.test.mjs`, `utilitarios.mjs` | testes no Chrome |

---

### Task 1: TeX no texto

**Files:**
- Create: `componentes/tex.js`
- Modify: `package.json`, `package-lock.json`
- Test: `tests/unit/tex.test.mjs`, `tests/unit/corpo.test.mjs`

**Interfaces:**
- Consumes: `linkedom` (testes); o pacote `katex` 0.18.7, instalado no Step 1.
- Produces (usado pelas Tasks 2 e 3 e, no marco 5, pelo build):
  - `segmentosDeTex(texto) → Array<{ tipo: 'texto', texto } | { tipo: 'inline' | 'destaque', tex, trecho }>`;
  - `texParaTexto(tex) → string` e `textoSemTex(texto) → string`, texto simples sem barras nem chaves;
  - `renderizarTex(raiz, { katex }) → Array<{ trecho, mensagem }>`, que troca, dentro de `raiz`, cada `\( \)` por `span.katex[data-tex]` e cada `\[ \]` por `div.equacao[data-tex]`, deixa intocado o texto de `pre`, `code`, `script`, `style`, `textarea`, `svg` e do que já tem `data-tex`, e troca cada trecho com erro por `span.tex-invalido` ou `div.equacao.tex-invalido`.

- [ ] **Step 1: Instalar o KaTeX**

Run: `npm install --save-exact katex@0.18.7`
Expected: `package.json` termina com

```json
  "bin": {
    "aula-usp": "bin/aula-usp.mjs"
  },
  "dependencies": {
    "katex": "0.18.7"
  }
}
```

e `package-lock.json` passa a ter `node_modules/katex` na versão 0.18.7, com a dependência `commander`. Em Node anterior a 22.12, o npm pode avisar `EBADENGINE` para o `commander`: ele serve só à linha de comando do KaTeX (`cli.js`), que o sistema não usa, e o aviso não impede a instalação.

- [ ] **Step 2: Escrever os testes que falham**

Criar `tests/unit/tex.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { segmentosDeTex, texParaTexto, textoSemTex, renderizarTex } from '../../componentes/tex.js';

const corpo = (html) => parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`).document.body;

test('segmentosDeTex separa \\( \\) e \\[ \\] do texto, e R$ não é delimitador', () => {
  assert.deepEqual(segmentosDeTex('Custa R$ 100 e a taxa é \\(\\eta\\); \\[ w \\leftarrow w - \\eta \\]'), [
    { tipo: 'texto', texto: 'Custa R$ 100 e a taxa é ' },
    { tipo: 'inline', tex: '\\eta', trecho: '\\(\\eta\\)' },
    { tipo: 'texto', texto: '; ' },
    { tipo: 'destaque', tex: ' w \\leftarrow w - \\eta ', trecho: '\\[ w \\leftarrow w - \\eta \\]' },
  ]);
  assert.deepEqual(segmentosDeTex('R$ 100, $x^2$ e nada mais'), [{ tipo: 'texto', texto: 'R$ 100, $x^2$ e nada mais' }]);
});

test('segmentosDeTex deixa como texto a abertura sem fechamento e não fecha em \\\\)', () => {
  assert.deepEqual(segmentosDeTex('fica \\(aberto'), [{ tipo: 'texto', texto: 'fica \\(aberto' }]);
  assert.deepEqual(segmentosDeTex('\\( a \\\\) b \\)'), [{ tipo: 'inline', tex: ' a \\\\) b ', trecho: '\\( a \\\\) b \\)' }]);
});

test('texParaTexto e textoSemTex trocam o TeX por texto sem barras nem chaves', () => {
  assert.equal(texParaTexto('\\eta'), 'eta');
  assert.equal(texParaTexto('\\nabla E(w)'), 'nabla E(w)');
  assert.equal(texParaTexto('\\mathbf{w}^\\top x'), 'w^top x');
  assert.equal(texParaTexto('\\frac{1}{N}\\sum_i x_i'), '1/N sum_i x_i');
  assert.equal(texParaTexto('\\text{taxa } \\eta'), 'taxa eta');
  assert.equal(textoSemTex('O papel de \\(\\eta\\) no passo'), 'O papel de eta no passo');
});

test('renderizarTex troca \\( \\) por span.katex e \\[ \\] por div.equacao, os dois com data-tex', () => {
  const raiz = corpo('<p>A taxa \\(\\eta\\) controla o passo.</p><div>\\[ w \\leftarrow w - \\eta \\]</div>');
  assert.deepEqual(renderizarTex(raiz, { katex }), []);
  const inline = raiz.querySelector('p > span.katex');
  assert.equal(inline.getAttribute('data-tex'), '\\eta');
  assert.equal(raiz.querySelector('p').firstChild.nodeValue, 'A taxa ');
  const equacao = raiz.querySelector('div > div.equacao');
  assert.equal(equacao.getAttribute('data-tex'), ' w \\leftarrow w - \\eta ');
  assert.ok(equacao.firstChild.classList.contains('katex-display'));
});

test('renderizarTex não toca TeX em pre, code, script e svg, e renderiza as notas', () => {
  const raiz = corpo('<pre>\\(x\\)</pre><p><code>\\(y\\)</code></p><script>"\\(z\\)"</script>'
    + '<svg><text>\\(w\\)</text></svg><aside class="notas">Nota \\(\\alpha\\)</aside>');
  renderizarTex(raiz, { katex });
  assert.equal(raiz.querySelectorAll('.katex').length, 1);
  assert.equal(raiz.querySelector('aside.notas .katex').getAttribute('data-tex'), '\\alpha');
  assert.deepEqual([raiz.querySelector('pre').textContent, raiz.querySelector('code').textContent], ['\\(x\\)', '\\(y\\)']);
});

test('\\passo{n}{…} vira um elemento com data-passo dentro de cada célula do aligned', () => {
  const raiz = corpo('<div>\\[ \\begin{aligned} a &= b \\\\ \\passo{1}{c} &\\passo{1}{= d} \\\\ \\passo{2}{e} &\\passo{2}{= f} \\end{aligned} \\]</div>');
  assert.deepEqual(renderizarTex(raiz, { katex }), []);
  // O aligned do KaTeX escreve uma coluna inteira antes da outra, então a ordem no documento é 1, 2, 1, 2:
  // é por isso que \passo exige número, e o motor revela por número (spec 6.4).
  assert.deepEqual([...raiz.querySelectorAll('[data-passo]')].map((passo) => passo.getAttribute('data-passo')), ['1', '2', '1', '2']);
});

test('TeX inválido e comando não permitido viram alerta com o trecho e voltam como erro', () => {
  const raiz = corpo('<p>Erro \\(\\frac{a}{\\) e \\(\\href{https://usp.br}{a}\\).</p><div>\\[ \\naoexiste \\]</div>');
  const erros = renderizarTex(raiz, { katex });
  assert.deepEqual(erros.map((erro) => erro.trecho), ['\\(\\frac{a}{\\)', '\\(\\href{https://usp.br}{a}\\)', '\\[ \\naoexiste \\]']);
  assert.match(erros[0].mensagem, /^Unexpected end of input/);
  assert.equal(erros[1].mensagem, 'comando não permitido no TeX');
  assert.deepEqual([...raiz.querySelectorAll('.tex-invalido')].map((alerta) => `${alerta.nodeName} ${alerta.className} ${alerta.textContent}`),
    ['SPAN tex-invalido \\(\\frac{a}{\\)', 'SPAN tex-invalido \\(\\href{https://usp.br}{a}\\)', 'DIV equacao tex-invalido \\[ \\naoexiste \\]']);
  assert.equal(raiz.querySelector('.tex-invalido').getAttribute('title'), erros[0].mensagem);
});

test('as cores de \\color, \\textcolor, \\colorbox, \\fcolorbox e \\red não chegam ao HTML', () => {
  const raiz = corpo('<p>\\(\\color{red}{a} + \\textcolor{#FF0000}{b} + \\colorbox{yellow}{c} + \\fcolorbox{red}{blue}{d} + \\red{e}\\)</p>');
  assert.deepEqual(renderizarTex(raiz, { katex }), []);
  const estilos = [...raiz.querySelectorAll('[style]')].map((elemento) => elemento.getAttribute('style'));
  assert.ok(estilos.length > 0);
  assert.deepEqual(estilos.filter((estilo) => /(?:^|;)\s*(?:color|background-color|border-color)\s*:/i.test(estilo)), []);
  assert.equal(raiz.querySelectorAll('[mathcolor], [mathbackground]').length, 0);
});

test('renderizarTex é idempotente: uma segunda passada não muda nada', () => {
  const raiz = corpo('<p>\\(x^2\\) e \\(\\frac{a}{\\)</p><div>\\[ y \\]</div>');
  renderizarTex(raiz, { katex });
  const antes = raiz.innerHTML;
  assert.deepEqual(renderizarTex(raiz, { katex }), []);
  assert.equal(raiz.innerHTML, antes);
});
```

Em `tests/unit/corpo.test.mjs`, logo antes do teste `'marca células numéricas e alinha o cabeçalho da coluna que só tem números, com célula vazia neutra'`, acrescentar:

```js
test('célula escrita em TeX não é numérica: fica à esquerda, como texto', () => {
  assert.equal(ehNumerica('\\(0{,}5\\)'), false);
  assert.equal(ehNumerica('\\(10^3\\)'), false);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/unit/tex.test.mjs tests/unit/corpo.test.mjs`
Expected: FAIL só no arquivo `tests/unit/tex.test.mjs`, com `ERR_MODULE_NOT_FOUND` (`Cannot find module '.../componentes/tex.js'`). Os 8 testes de `corpo.test.mjs` passam, inclusive o novo: ele registra a decisão de que célula escrita em TeX não é numérica, que o `ehNumerica` do marco 3a já cumpre, para que ela não mude sem querer.

- [ ] **Step 4: Criar `componentes/tex.js`**

```js
// Matemática em TeX (spec 4.3, 6.4 e 7.1): acha \( \) e \[ \] no texto e troca cada trecho pelo HTML do KaTeX.
// O KaTeX chega por parâmetro, para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.

const ABERTURAS = {
  '\\(': { fechamento: '\\)', tipo: 'inline' },
  '\\[': { fechamento: '\\]', tipo: 'destaque' },
};

// Texto que nunca é matemática: código, scripts, SVG e o que já foi renderizado.
const FORA = 'pre, code, script, style, textarea, svg, [data-tex]';

// O KaTeX pinta com errorColor os comandos que o trust recusa (\href, \url, \includegraphics, \htmlClass...);
// uma cor que ninguém escreve deixa o módulo transformar esse texto vermelho num erro.
const COR_DE_ERRO = '#010203';
const MACROS = { '\\passo': '\\htmlData{passo=#1}{#2}' };

const COMANDOS_SEM_TEXTO = new Set([
  'text', 'textrm', 'textbf', 'textit', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathcal', 'mathbb',
  'boldsymbol', 'operatorname', 'displaystyle', 'left', 'right',
]);

function fechamentoDe(texto, desde, fechamento) {
  for (let i = desde; i < texto.length - 1; i += 1) {
    if (texto[i] !== '\\') continue;
    if (texto.startsWith(fechamento, i)) return i;
    i += 1; // o caractere escapado não fecha nada: \\) é quebra de linha seguida de parêntese
  }
  return -1;
}

export function segmentosDeTex(texto) {
  const segmentos = [];
  let inicio = 0;
  for (let i = 0; i < texto.length - 1; i += 1) {
    if (texto[i] !== '\\') continue;
    const abertura = ABERTURAS[texto.slice(i, i + 2)];
    const fim = abertura ? fechamentoDe(texto, i + 2, abertura.fechamento) : -1;
    if (fim < 0) {
      i += 1;
      continue;
    }
    if (i > inicio) segmentos.push({ tipo: 'texto', texto: texto.slice(inicio, i) });
    segmentos.push({ tipo: abertura.tipo, tex: texto.slice(i + 2, fim), trecho: texto.slice(i, fim + 2) });
    inicio = fim + 2;
    i = inicio - 1;
  }
  if (inicio < texto.length) segmentos.push({ tipo: 'texto', texto: texto.slice(inicio) });
  return segmentos;
}

// TeX em texto simples, para o rótulo do cabeçalho, o slug e o aria-label: sem barras nem chaves.
export function texParaTexto(tex) {
  return tex
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\(?:[,;:! ]|qquad|quad)/g, ' ')
    .replace(/\\([a-zA-Z]+)/g, (_, nome) => (COMANDOS_SEM_TEXTO.has(nome) ? ' ' : ` ${nome}`))
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/([_^]) /g, '$1')
    .trim();
}

export function textoSemTex(texto) {
  return segmentosDeTex(texto)
    .map((segmento) => (segmento.tipo === 'texto' ? segmento.texto : texParaTexto(segmento.tex)))
    .join('');
}

// Tira as cores que \color, \textcolor, \colorbox, \fcolorbox e atalhos como \red deixam no HTML (spec 4.2).
function semCores(html) {
  return html
    .replace(/\s(?:mathcolor|mathbackground)="[^"]*"/g, '')
    .replace(/\sstyle="([^"]*)"/g, (_, css) => {
      const limpo = css.split(';').filter((declaracao) => declaracao.trim()
        && !/^\s*(?:color|background-color|border-color)\s*:/i.test(declaracao));
      return limpo.length ? ` style="${limpo.join(';')};"` : '';
    });
}

function htmlDoKatex(katex, tex, tipo) {
  const html = katex.renderToString(tex, {
    displayMode: tipo === 'destaque',
    throwOnError: true,
    strict: 'ignore',
    errorColor: COR_DE_ERRO,
    macros: { ...MACROS },
    trust: (contexto) => contexto.command === '\\htmlData',
  });
  if (html.toLowerCase().includes(COR_DE_ERRO)) throw new Error('comando não permitido no TeX');
  return semCores(html);
}

function textosComTex(raiz) {
  const nos = [];
  const andar = (no) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 3) {
        if (filho.nodeValue.includes('\\(') || filho.nodeValue.includes('\\[')) nos.push(filho);
      } else if (filho.nodeType === 1 && !filho.matches(FORA)) {
        andar(filho);
      }
    }
  };
  andar(raiz);
  return nos;
}

function renderizarSegmento(doc, katex, segmento, erros) {
  if (segmento.tipo === 'texto') return doc.createTextNode(segmento.texto);
  const destaque = segmento.tipo === 'destaque';
  try {
    const molde = doc.createElement('template');
    molde.innerHTML = htmlDoKatex(katex, segmento.tex, segmento.tipo);
    const html = molde.content.firstChild;
    if (!destaque) {
      html.setAttribute('data-tex', segmento.tex);
      return html;
    }
    const equacao = doc.createElement('div');
    equacao.className = 'equacao';
    equacao.setAttribute('data-tex', segmento.tex);
    equacao.append(html);
    return equacao;
  } catch (erro) {
    const mensagem = String(erro.message).replace(/^KaTeX parse error: /, '');
    erros.push({ trecho: segmento.trecho, mensagem });
    const alerta = doc.createElement(destaque ? 'div' : 'span');
    alerta.className = destaque ? 'equacao tex-invalido' : 'tex-invalido';
    alerta.setAttribute('data-tex', segmento.tex);
    alerta.setAttribute('title', mensagem);
    alerta.textContent = segmento.trecho;
    return alerta;
  }
}

// Troca, dentro de raiz, cada \( \) e \[ \] pelo HTML do KaTeX; devolve os erros, cada um com o trecho e a mensagem.
export function renderizarTex(raiz, { katex }) {
  const doc = raiz.ownerDocument ?? raiz;
  const erros = [];
  for (const no of textosComTex(raiz)) {
    const segmentos = segmentosDeTex(no.nodeValue);
    if (segmentos.every((segmento) => segmento.tipo === 'texto')) continue;
    no.replaceWith(...segmentos.map((segmento) => renderizarSegmento(doc, katex, segmento, erros)));
  }
  return erros;
}
```

- [ ] **Step 5: Rodar os testes unitários**

Run: `npm test`
Expected: PASS em todos (129 do marco 3a + 9 de `tex` + 1 de `corpo` = 139).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json componentes/tex.js tests/unit/tex.test.mjs tests/unit/corpo.test.mjs
git commit -m "feat(componentes): matemática em TeX com o KaTeX recebido por parâmetro

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Títulos com TeX

**Files:**
- Modify: `montar/blocos.js`, `build/servir.mjs`
- Test: `tests/unit/blocos.test.mjs`, `tests/unit/montar.test.mjs`, `tests/unit/servir.test.mjs`

**Interfaces:**
- Consumes: `texParaTexto(tex)`, `textoSemTex(texto)` e `renderizarTex(raiz, { katex })` de `componentes/tex.js` (Task 1).
- Produces: `textoDeTitulo(elemento)` devolve texto simples também quando o título tem TeX cru ou já renderizado (elemento com `data-tex`); rótulo do cabeçalho, slug, `aria-label` do mapa e cartão da visão geral ficam sem TeX cru. `aula-usp servir` serve `/_aula-usp/componentes/…`, necessário porque `montar/blocos.js` passa a importar `componentes/tex.js` no navegador.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/unit/blocos.test.mjs`, trocar

```js
import { parseHTML } from 'linkedom';
import { textoDeTitulo, derivarBlocos, estadosDosQuadrados } from '../../montar/blocos.js';
```

por

```js
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { textoDeTitulo, derivarBlocos, estadosDosQuadrados } from '../../montar/blocos.js';
import { renderizarTex } from '../../componentes/tex.js';
```

e, logo antes do teste `'derivarBlocos numera as aberturas e marca a introdução como null'`, acrescentar:

```js
test('textoDeTitulo troca o TeX, cru ou já renderizado, por texto sem barras nem chaves', () => {
  const [secao] = secoes('<section data-layout="abertura"><h2>O papel de \\(\\eta\\)<br><span class="sinal">e de \\(\\nabla E\\)</span></h2></section>');
  const titulo = secao.querySelector('h2');
  assert.equal(textoDeTitulo(titulo), 'O papel de eta e de nabla E');
  renderizarTex(titulo, { katex });
  assert.equal(titulo.querySelectorAll('.katex').length, 2);
  assert.equal(textoDeTitulo(titulo), 'O papel de eta e de nabla E');
});
```

Em `tests/unit/montar.test.mjs`, logo antes do teste `'conteúdo do autor vai para div.area, com o TeX intacto; notas ficam fora'`, acrescentar:

```js
test('título de abertura com TeX dá id, rótulo do cabeçalho e aria-label sem barras', () => {
  const { document, resumo } = montado(AULA_IME().replace('<h2>Backpropagation</h2>', '<h2>O papel de \\(\\eta\\)</h2>'));
  assert.equal(resumo.blocos[1].titulo, 'O papel de eta');
  assert.equal(resumo.blocos[1].id, 'o-papel-de-eta');
  const culpa = document.getElementById('culpa');
  assert.equal(culpa.querySelector('.cabecalho .rotulo').textContent, '02 · O papel de eta');
  assert.equal(culpa.querySelectorAll('.cabecalho .quadrado')[1].getAttribute('aria-label'), 'Bloco 2: O papel de eta');
});
```

Em `tests/unit/servir.test.mjs`, no teste `'servidor entrega arquivos da aula e do sistema com o tipo certo'`, trocar

```js
  const js = await pedir(`${PREFIXO}montar/montar.js`);
  assert.equal(js.status, 200);
  assert.match(js.tipo, /^text\/javascript/);
});
```

por

```js
  const js = await pedir(`${PREFIXO}montar/montar.js`);
  assert.equal(js.status, 200);
  assert.match(js.tipo, /^text\/javascript/);
  const componente = await pedir(`${PREFIXO}componentes/tex.js`);
  assert.equal(componente.status, 200);
  assert.ok(componente.corpo.includes('export function renderizarTex'));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/blocos.test.mjs tests/unit/montar.test.mjs tests/unit/servir.test.mjs`
Expected: FAIL em 3 dos 37 testes: em `blocos.test.mjs`, `actual: 'O papel de \\(\\eta\\) e de \\(\\nabla E\\)'` no lugar de `'O papel de eta e de nabla E'`; em `montar.test.mjs`, `actual: 'O papel de \\(\\eta\\)'` no lugar de `'O papel de eta'`; em `servir.test.mjs`, `403 !== 200` no pedido de `componentes/tex.js`.

- [ ] **Step 3: Trocar `textoDeTitulo`**

Em `montar/blocos.js`, trocar o início do arquivo

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
```

por

```js
// Blocos da aula derivados das aberturas (spec 5.4).
import { texParaTexto, textoSemTex } from '../componentes/tex.js';

// Texto simples de um título, para rótulo, slug, aria-label e visão geral: o TeX, cru ou já renderizado
// (elemento com data-tex), vira texto sem barras nem chaves.
export function textoDeTitulo(elemento) {
  if (!elemento) return '';
  const partes = [];
  const percorrer = (no) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 3) partes.push(filho.nodeValue);
      else if (filho.nodeType === 1 && filho.nodeName === 'BR') partes.push(' ');
      else if (filho.nodeType === 1 && filho.hasAttribute('data-tex')) partes.push(texParaTexto(filho.getAttribute('data-tex')));
      else if (filho.nodeType === 1) percorrer(filho);
    }
  };
  percorrer(elemento);
  return textoSemTex(partes.join('')).replace(/\s+/g, ' ').trim();
}
```

(o resto do arquivo, a partir de `export function derivarBlocos`, não muda).

- [ ] **Step 4: Servir `componentes/`**

Em `build/servir.mjs`, trocar

```js
export const PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'assets', 'tokens', 'contrato'];
```

por

```js
export const PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'componentes', 'assets', 'tokens', 'contrato'];
```

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: PASS em todos (139 da Task 1 + 1 de `blocos` + 1 de `montar` = 141).

Run, um arquivo por vez: `for arquivo in tests/integracao/*.test.mjs; do node --test "$arquivo" || break; done`
Expected: PASS nos 59 testes de integração: no navegador, `montar/blocos.js` agora importa `componentes/tex.js`, e a montagem continua funcionando.

- [ ] **Step 6: Commit**

```bash
git add montar/blocos.js build/servir.mjs tests/unit/blocos.test.mjs tests/unit/montar.test.mjs tests/unit/servir.test.mjs
git commit -m "feat(montar): título com TeX vira texto simples no rótulo, no slug e no aria-label

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: Matemática no navegador

**Files:**
- Create: `especime/matematica.html`, `tests/fixtures/tex/index.html`
- Modify: `build/servir.mjs`, `montar/navegador.js`, `estilos/componentes.css`, `contrato/contrato.json`, `tests/integracao/utilitarios.mjs`
- Test: `tests/unit/servir.test.mjs`, `tests/integracao/matematica.test.mjs`

**Interfaces:**
- Consumes: `renderizarTex(raiz, { katex })` (Task 1); `textoDeTitulo` sem TeX cru e `componentes/` servida (Task 2); `tests/integracao/utilitarios.mjs` (`iniciarChrome`, `servirPasta`, `abrirAula`, `classesForaDoContrato`, `perto`, `TINTA`, `PAPEL`); `AulaUSP.prepararImpressao()` (marco 2c); o motor com passos (marco 2b).
- Produces:
  - `BIBLIOTECAS` em `build/servir.mjs` e a rota `/_aula-usp/bibliotecas/<nome>/…`, que o M3c estende com o Shiki;
  - no navegador, a matemática renderizada antes do motor, com os erros no console como `Aula USP: TeX inválido em <trecho>: <mensagem>`;
  - as classes `equacao` e `tex-invalido` em `contrato.classesDoSistema`;
  - `classesForaDoContrato(pagina)` passa a ignorar o HTML interno do KaTeX.

- [ ] **Step 1: Escrever os testes do servidor que falham**

Em `tests/unit/servir.test.mjs`, logo antes do teste `'servidor recusa pastas do sistema fora da lista e travessias codificadas'`, acrescentar:

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

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/servir.test.mjs`
Expected: FAIL em 1 dos 14 testes, `servidor entrega o KaTeX da pasta dist do pacote, com módulo, folha de estilo e fontes`, com `403 !== 200`. O teste de recusa já passa, porque ainda nada em `bibliotecas/` é servido: ele fica de guarda, para que a rota nova não sirva outro pacote nem saia da pasta `dist`.

- [ ] **Step 3: Servir o KaTeX**

Em `build/servir.mjs`, trocar

```js
export const PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'componentes', 'assets', 'tokens', 'contrato'];
```

por

```js
export const PASTAS_DO_SISTEMA = ['estilos', 'montar', 'motor', 'componentes', 'assets', 'tokens', 'contrato'];
// Bibliotecas de terceiros servidas em desenvolvimento, cada uma presa à pasta dist do pacote; no marco 5 elas vêm embutidas.
export const BIBLIOTECAS = { katex: 'node_modules/katex/dist' };
```

e, na função `localizar`, trocar

```js
    const [pasta, ...resto] = pathname.slice(PREFIXO.length).split('/');
    if (!PASTAS_DO_SISTEMA.includes(pasta)) return null;
```

por

```js
    const [pasta, ...resto] = pathname.slice(PREFIXO.length).split('/');
    if (pasta === 'bibliotecas') {
      const [biblioteca, ...arquivo] = resto;
      if (!Object.hasOwn(BIBLIOTECAS, biblioteca)) return null;
      return resolverSeguro(resolve(RAIZ_SISTEMA, BIBLIOTECAS[biblioteca]), `/${arquivo.join('/')}`);
    }
    if (!PASTAS_DO_SISTEMA.includes(pasta)) return null;
```

- [ ] **Step 4: Rodar os testes do servidor**

Run: `node --test tests/unit/servir.test.mjs`
Expected: PASS nos 14 testes.

- [ ] **Step 5: Criar o espécime de matemática e a fixture de erros**

Criar `especime/matematica.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Matemática no Aula USP</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Espécime do Aula USP">
<meta name="aula" content="3b">
<meta name="data" content="2026-09-17">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Matemática em TeX<br><span class="sinal">no texto e em passos</span></h1>
</section>

<section data-layout="abertura" id="o-papel-de-eta" data-curto="Taxa">
  <h2>O papel de \(\eta\)</h2>
  <p class="pergunta">Por que \(\eta\) decide o tamanho de cada passo?</p>
</section>

<section data-layout="conteudo" id="no-texto">
  <h2>Matemática no meio do texto</h2>
  <p>A cada passo, \(w \leftarrow w - \eta \nabla E(w)\): os pesos andam contra o gradiente.</p>
  <p>A média \(\frac{1}{N}\sum_{i=1}^{N} x_i\) e o peso \(w_{ij}\) acompanham o tamanho do texto.</p>
  <aside class="destaque" data-rotulo="Definição">Taxa de aprendizado \(\eta > 0\): o tamanho de cada passo.</aside>
  <aside class="notas">Ler \(\eta\) como "eta".</aside>
</section>

<section data-layout="conteudo" id="em-destaque">
  <h2>Uma equação em destaque</h2>
  <p class="lide">O erro quadrático mede a distância ao alvo.</p>
  \[ E(w) = \frac{1}{2N} \sum_{i=1}^{N} \left(y_i - w^\top x_i\right)^2 \tag{1} \]
  <p>A equação fica alinhada à esquerda, e o número vai para a margem direita.</p>
  <aside class="notas">A equação (1) volta na derivação.</aside>
</section>

<section data-layout="abertura" id="derivacao">
  <h2>Derivação</h2>
  <p class="pergunta">Como revelar uma conta linha a linha?</p>
</section>

<section data-layout="conteudo" id="passo-a-passo" data-pdf="passos">
  <h2>Uma derivação passo a passo</h2>
  \[ \begin{aligned}
    \nabla E(w) &= \frac{1}{N} \sum_{i=1}^{N} \left(w^\top x_i - y_i\right) x_i \\
    \passo{1}{w_{t+1}} &\passo{1}{= w_t - \eta \nabla E(w_t)} \\
    \passo{2}{w_{t+1}} &\passo{2}{= w_t - \frac{\eta}{N} \sum_{i} \left(w_t^\top x_i - y_i\right) x_i}
  \end{aligned} \]
  <p data-passo="3">Cada passo usa todos os exemplos: é a descida em lote.</p>
  <aside class="notas">Revelar uma linha por vez; a última frase fecha a ideia.</aside>
</section>

<section data-layout="conteudo" id="em-campos">
  <h2>Matemática em campos e listas</h2>
  <div class="colunas" data-grade="6-6">
    <div>
      <aside class="quadro" data-rotulo="Exemplo">Com \(\eta = 0{,}1\) e gradiente 4, o peso anda
        \[ \Delta w = -0{,}1 \cdot 4 = -0{,}4 \]
      </aside>
    </div>
    <div>
      <ol class="passos">
        <li>Calcule \(E(w)\).</li>
        <li>Calcule \(\nabla E(w)\).</li>
        <li>Ande \(-\eta \nabla E(w)\).</li>
      </ol>
    </div>
  </div>
  <aside class="notas">A equação dentro do quadro segue o ritmo do campo.</aside>
</section>

<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>\(\eta\) controla o tamanho do passo.</li>
    <li>O gradiente \(\nabla E\) aponta a subida.</li>
  </ol>
  <p class="proxima">Próximo marco: código com destaque.</p>
</section>

</body>
</html>
```

Criar `tests/fixtures/tex/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>TeX com problemas</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Fixture de TeX">
<meta name="aula" content="3b">
<meta name="data" content="2026-09-17">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../../../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>TeX com problemas</h1>
</section>

<section data-layout="abertura" id="erros">
  <h2>Erros</h2>
</section>

<section data-layout="conteudo" id="invalido">
  <h2>TeX inválido e comando não permitido</h2>
  <p>Quebrado \(\frac{a}{\) e não permitido \(\href{https://usp.br}{usp}\).</p>
  \[ \naoexiste \]
</section>

<section data-layout="abertura" id="cores">
  <h2>Cores</h2>
</section>

<section data-layout="conteudo" id="sem-cor">
  <h2>Cor em TeX não chega ao slide</h2>
  <p>Sem cor: \(\color{red}{x} + \red{y}\), e custa R$ 100.</p>
  <pre>\(nao e matematica\)</pre>
</section>

<section data-layout="encerramento">
  <h2>Fim</h2>
  <ol class="sintese"><li>Todo TeX renderiza ou vira alerta.</li></ol>
</section>

</body>
</html>
```

- [ ] **Step 6: Escrever os testes de integração que falham**

Criar `tests/integracao/matematica.test.mjs`:

```js
// Matemática no Chrome, sobre especime/matematica.html e tests/fixtures/tex/ servidos por `aula-usp servir` (spec 4.3, 6.4, 6.9 e 7.1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarChrome, servirPasta, abrirAula, classesForaDoContrato, perto, TINTA, PAPEL } from './utilitarios.mjs';

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

const folha = () => (folhaAberta ??= abrirAula(navegador, `${servidor.endereco}/matematica.html?folha`));

test('espécime de matemática: 8 slides com 16 equações, fontes do KaTeX carregadas, sem erros e com as classes no contrato', async () => {
  const { pagina, erros } = await folha();
  const medida = await pagina.evaluate(() => ({
    slides: document.querySelectorAll('section.slide').length,
    equacoes: document.querySelectorAll('.katex').length,
    fontes: [...new Set([...document.fonts].filter((fonte) => fonte.status === 'loaded').map((fonte) => fonte.family.replaceAll('"', '')))],
  }));
  assert.deepEqual([medida.slides, medida.equacoes], [8, 16]);
  assert.deepEqual(erros, []);
  for (const familia of ['KaTeX_Main', 'KaTeX_Math']) assert.ok(medida.fontes.includes(familia), familia);
  assert.deepEqual(await classesForaDoContrato(pagina), []);
});

test('matemática a 1,1 × o texto ao redor; em destaque, alinhada à esquerda, sem margem, com o número na margem direita', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const destaque = document.getElementById('em-destaque');
    const slide = destaque.getBoundingClientRect();
    const equacao = destaque.querySelector('div.equacao');
    const partes = [...equacao.querySelector('.katex-html').children];
    const inline = document.querySelector('#no-texto p .katex');
    return {
      tamanhoEmLinha: parseFloat(getComputedStyle(inline).fontSize),
      tamanhoDoTexto: parseFloat(getComputedStyle(inline.parentElement).fontSize),
      tamanhoEmDestaque: parseFloat(getComputedStyle(equacao.querySelector('.katex')).fontSize),
      margem: getComputedStyle(equacao.querySelector('.katex-display')).margin,
      inicio: partes[0].getBoundingClientRect().left - slide.left,
      numero: partes.at(-1).classList.contains('katex-tag') ? partes.at(-1).getBoundingClientRect().right - slide.left : null,
    };
  });
  perto(medida.tamanhoEmLinha, 1.1 * medida.tamanhoDoTexto, 'matemática em linha');
  perto(medida.tamanhoEmDestaque, 26.4, 'matemática em destaque');
  assert.equal(medida.margem, '0px');
  perto(medida.inicio, 64, 'a equação começa na margem da área');
  perto(medida.numero, 1216, 'o número da equação termina na margem direita');
});

test('\\passo no aligned: escondido no palco, revelado por número, sem mover nenhum passo nem quebrar o alinhamento', async (t) => {
  const { pagina, erros } = await abrirAula(navegador, `${servidor.endereco}/matematica.html#passo-a-passo`);
  t.after(() => pagina.close());
  const estado = () => pagina.evaluate(() => {
    const equacao = document.querySelector('#passo-a-passo .katex');
    const passos = [...equacao.querySelectorAll('[data-passo]')];
    const arredondar = (valor) => Math.round(valor * 10) / 10;
    return {
      visibilidade: passos.map((passo) => `${passo.getAttribute('data-passo')}:${getComputedStyle(passo).visibility}`),
      caixas: passos.map((passo) => {
        const r = passo.getBoundingClientRect();
        return [r.left, r.top, r.width, r.height].map(arredondar);
      }),
      // O sinal de igual de cada linha da coluna da direita: a primeira linha não tem \passo, as outras duas têm.
      iguais: [...equacao.querySelector('.col-align-l .vlist').children]
        .map((linha) => arredondar(linha.querySelector('.mrel').getBoundingClientRect().left)),
    };
  });
  const inicio = await estado();
  assert.deepEqual(inicio.visibilidade, ['1:hidden', '2:hidden', '1:hidden', '2:hidden']);
  assert.equal(inicio.iguais.length, 3);
  assert.equal(new Set(inicio.iguais).size, 1, `sinais de igual fora de coluna: ${inicio.iguais}`);
  await pagina.keyboard.press('ArrowRight');
  assert.deepEqual((await estado()).visibilidade, ['1:visible', '2:hidden', '1:visible', '2:hidden']);
  await pagina.keyboard.press('ArrowRight');
  const fim = await estado();
  assert.deepEqual(fim.visibilidade, ['1:visible', '2:visible', '1:visible', '2:visible']);
  assert.deepEqual(fim.caixas, inicio.caixas, 'revelar não move nenhum passo');
  assert.deepEqual(erros, []);
});

test('título com TeX: rótulo do cabeçalho, aria-label do mapa e cartão da visão geral sem barras', async (t) => {
  const { pagina } = await abrirAula(navegador, `${servidor.endereco}/matematica.html#no-texto`);
  t.after(() => pagina.close());
  const cabecalho = await pagina.evaluate(() => {
    const cabeca = document.querySelector('#no-texto .cabecalho');
    return { rotulo: cabeca.querySelector('.rotulo').textContent, aria: cabeca.querySelector('.quadrado').getAttribute('aria-label') };
  });
  assert.deepEqual(cabecalho, { rotulo: '01 · O papel de eta', aria: 'Bloco 1: O papel de eta' });
  await pagina.keyboard.press('Escape');
  const cartoes = await pagina.evaluate(() => [...document.querySelectorAll('[data-painel="visao-geral"] .cartao-titulo')].map((titulo) => titulo.textContent));
  assert.ok(cartoes.includes('O papel de eta'), JSON.stringify(cartoes));
  assert.deepEqual(cartoes.filter((titulo) => titulo.includes('\\')), []);
});

test('impressão: o slide com data-pdf="passos" sai em uma cópia por estado, com a matemática revelada até o estado', async (t) => {
  const { pagina } = await abrirAula(navegador, `${servidor.endereco}/matematica.html`);
  t.after(() => pagina.close());
  const paginas = await pagina.evaluate(() => {
    window.AulaUSP.prepararImpressao();
    const revelados = (slide) => slide.querySelectorAll('.katex [data-passo][data-revelado]').length;
    return [...document.querySelectorAll('section[id^="passo-a-passo"]')].map((slide) => `${slide.id}:${revelados(slide)}`);
  });
  assert.deepEqual(paginas, ['passo-a-passo-impressao-0:0', 'passo-a-passo-impressao-1:2', 'passo-a-passo-impressao-2:4', 'passo-a-passo:4']);
});

test('TeX inválido e comando não permitido viram alerta no lugar, com a mensagem no console; cor em TeX não chega ao slide', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/tex/');
  t.after(() => fixtures.fechar());
  const { pagina, erros } = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => pagina.close());
  const medida = await pagina.evaluate(() => ({
    alertas: [...document.querySelectorAll('.tex-invalido')].map((alerta) => ({
      texto: `${alerta.nodeName} ${alerta.textContent}`,
      campo: [getComputedStyle(alerta).backgroundColor, getComputedStyle(alerta).color],
    })),
    cores: [...new Set([...document.querySelectorAll('#sem-cor .katex-html *')].map((elemento) => getComputedStyle(elemento).color))],
    pre: document.querySelector('#sem-cor pre').textContent,
  }));
  assert.deepEqual(medida.alertas.map((alerta) => alerta.texto),
    ['SPAN \\(\\frac{a}{\\)', 'SPAN \\(\\href{https://usp.br}{usp}\\)', 'DIV \\[ \\naoexiste \\]']);
  for (const alerta of medida.alertas) assert.deepEqual(alerta.campo, [TINTA, PAPEL]);
  assert.deepEqual(medida.cores, [TINTA]);
  assert.equal(medida.pre, '\\(nao e matematica\\)');
  assert.equal(erros.length, 3);
  assert.ok(erros.every((erro) => erro.startsWith('Aula USP: TeX inválido em ')), JSON.stringify(erros));
  assert.match(erros[1], /comando não permitido no TeX$/);
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `node --test tests/integracao/matematica.test.mjs`
Expected: FAIL em 5 dos 6 testes, porque a matemática ainda não é renderizada: o espécime dá `[ 8, 0 ]` no lugar de `[ 8, 16 ]` (slides e equações); as medidas e os passos terminam em `TypeError: Cannot read properties of null`, sem `div.equacao` nem `.katex`; a impressão sai com `[ 'passo-a-passo-impressao-0:0', 'passo-a-passo:0' ]`, só com o passo do parágrafo; e a fixture não tem nenhum alerta (`[]`). O teste do título já passa, porque a Task 2 trata o TeX cru e nada foi renderizado ainda; depois do Step 8, é ele que confere o título lido do HTML do KaTeX.

- [ ] **Step 8: Carregar o KaTeX e renderizar antes do motor**

Em `montar/navegador.js`, trocar

```js
import { instalarImpressao } from '../motor/impressao.js';
```

por

```js
import { instalarImpressao } from '../motor/impressao.js';
import { renderizarTex } from '../componentes/tex.js';
```

trocar

```js
const BASE = new URL('../', import.meta.url);
const ESTILOS = [
```

por

```js
const BASE = new URL('../', import.meta.url);
const TEX = /\\\(|\\\[/;
const ESTILOS = [
```

e, logo depois da chamada a `montar`, trocar a linha

```js
  if (new URLSearchParams(location.search).has('folha')) document.body.classList.add('folha');
```

por

```js
  // A matemática entra antes do motor: cada \passo vira data-passo, que o motor conta ao iniciar (spec 6.4).
  if (TEX.test(document.body.textContent)) {
    const [{ default: katex }] = await Promise.all([
      import(new URL('bibliotecas/katex/katex.mjs', BASE).href),
      carregarEstilo('bibliotecas/katex/katex.min.css'),
    ]);
    for (const erro of renderizarTex(document.body, { katex })) {
      console.error(`Aula USP: TeX inválido em ${erro.trecho}: ${erro.mensagem}`);
    }
  }
  if (new URLSearchParams(location.search).has('folha')) document.body.classList.add('folha');
```

- [ ] **Step 9: Dar forma à matemática, registrar as classes e ignorar o HTML do KaTeX no teste de classes**

No fim de `estilos/componentes.css`, depois de uma linha em branco, acrescentar:

```css
/* ---------- matemática ---------- */

.area .katex {
  font-size: 1.1em; /* spec 4.3 */
}

.area .equacao > .katex-display {
  margin: 0;
  text-align: left;
}

.area .equacao > .katex-display > .katex {
  text-align: left;
}

.area .tex-invalido {
  padding: 0 var(--espaco-1);
  background: var(--cor-tinta);
  color: var(--cor-papel);
  font-family: var(--tipo-codigo-familia);
  font-size: 0.88em; /* spec 7.1, como o código em linha */
}

.area div.tex-invalido {
  padding: var(--espaco-2) var(--espaco-3);
  font-size: var(--tipo-codigo-tamanho);
}
```

Em `contrato/contrato.json`, trocar

```json
"imprimindo", "numerica"]
```

por

```json
"imprimindo", "numerica", "equacao", "tex-invalido"]
```

Em `tests/integracao/utilitarios.mjs`, na função `classesForaDoContrato`, trocar

```js
  const classes = await pagina.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .flatMap((elemento) => [...elemento.classList]))]);
```

por

```js
  const classes = await pagina.evaluate(() => [...new Set([...document.querySelectorAll('[class]')]
    .filter((elemento) => !elemento.closest('.katex, .katex-display'))
    .flatMap((elemento) => [...elemento.classList]))]);
```

- [ ] **Step 10: Rodar os testes**

Run: `node --test tests/integracao/matematica.test.mjs`
Expected: PASS nos 6 testes.

Run, um arquivo por vez: `for arquivo in tests/integracao/*.test.mjs; do node --test "$arquivo" || break; done`
Expected: PASS em todos (59 do marco 3a + 6 de `matematica` = 65).

Run: `npm test`
Expected: PASS nos 143 testes unitários (141 da Task 2 + 2 do servidor).

- [ ] **Step 11: Conferir no navegador**

Com um script descartável fora do repositório (não use `npm run servir` em primeiro plano: ele não termina sozinho), importando `servirPasta`, `iniciarChrome` e `abrirAula` de `tests/integracao/utilitarios.mjs`, tirar uma captura de cada slide de `especime/matematica.html?folha` e de `tests/fixtures/tex/index.html?folha`, e conferir: `\eta` no título grande da abertura e "01 · O PAPEL DE ETA" no cabeçalho dos slides do bloco; matemática no texto do tamanho do texto ao redor; equação em destaque à esquerda com o número na margem direita; a derivação alinhada pelo `=`; a equação dentro do quadro e os passos com matemática; na fixture, os três alertas em campo escuro e a expressão com `\color` na cor do texto. Descrever no relatório o que viu. Não comitar o script nem as imagens.

- [ ] **Step 12: Commit**

```bash
git add build/servir.mjs montar/navegador.js estilos/componentes.css contrato/contrato.json especime/matematica.html tests/fixtures/tex/index.html tests/integracao/matematica.test.mjs tests/integracao/utilitarios.mjs tests/unit/servir.test.mjs
git commit -m "feat(montar): matemática renderizada no navegador antes do motor, com alerta para TeX inválido

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
