# Aula USP · Marco 3a (Componentes de corpo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar forma aos blocos de corpo que não dependem de biblioteca (campos, exercício, listas, tabela, figura e texto em linha), com a montagem completando o que o CSS não sabe: os rótulos do exercício no idioma da aula e as células numéricas.

**Architecture:** `estilos/componentes.css` concentra a forma de cada bloco de corpo, escopada à `.area` dos slides para não tocar o cromo nem os painéis. `montar/corpo.js` roda dentro de `montar`, e portanto nos dois modos, e grava o que depende do documento: `data-rotulo` com "Exercício" e "Resposta" no idioma da aula, e a classe `numerica` nas células numéricas e no cabeçalho das colunas só de números. `especime/componentes.html` mostra cada componente no limite da spec e é a base dos testes no Chrome; `tests/fixtures/figuras/` guarda os casos extremos de figura.

**Tech Stack:** Node 20+ (máquina do autor: v25.6.1), ES modules, `node:test`; `linkedom` e `playwright-core`, já em `devDependencies`; Google Chrome instalado (ou `CHROME_PATH`).

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 4.2, 4.3, 4.4, 5.3, 5.5, 6.8 e 7.1). Estado de partida: marco 2c na `main` (`9609476`), com montagem, motor, demos, apresentador e impressão; 121 testes unitários e 49 de integração.

## Global Constraints

- Node 20 ou superior; ES modules; testes com `node:test` e `node:assert/strict`; sem Python.
- `montar/` e `motor/` não importam nada de Node: só API padrão do DOM, para rodar no navegador (spec 3.5).
- Nomes de arquivos, pastas, classes, atributos e identificadores em português.
- Toda classe gerada pelo sistema está em `contrato.classesDoSistema`; classes do autor nunca são geradas pelo sistema.
- Cores só pelos tokens; sem sombras, gradientes, transparências ou cantos arredondados (spec 4.2).
- `amarelo` nunca é cor de texto nem de linha com menos de 4 px; sobre ele, só `tinta` (spec 4.2).
- Tipografia (spec 4.3): leitura em Geist 24 px (`p`, `li`, `th`, `td`, texto de campos, `div.enunciado`, `div.resposta`), com ênfase em 600; legenda em Geist 18 px, `cinza`; rótulo em Geist Mono 14 px, caixa alta, 700, +0,16em; numeral de `ol.passos` e `ol.sintese` em Geist 600 de 40 px; `sub` e `sup` a 0,8em.
- Espaços em múltiplos de 8; réguas: `regua`, de 2 px, e `regua-forte`, de 4 px (spec 4.4).
- Componentes da fase 1 (spec 7.1), nas palavras da spec:
  - `aside.destaque`: campo `amarelo`, padding de 16 px na vertical e 24 px na horizontal, rótulo em Geist Mono 14 caixa alta vindo de `data-rotulo`;
  - `aside.quadro`: contorno de 2 px em `tinta`, mesmo padding e rótulo;
  - `aside.alerta`: campo `tinta`, texto `papel`, mesmo padding e rótulo;
  - `div.exercicio`: `div.enunciado` com a forma de `quadro` e rótulo "Exercício"; `div.resposta` com rótulo "Resposta"; a resposta costuma ser passo; no PDF sai revelada, salvo `data-pdf="passos"`;
  - `ol.passos`: numerais Geist 600 de 40 px e régua de 2 px acima de cada item;
  - `ul`: marcador quadrado de 8 px em `tinta`;
  - `ol.sintese`: forma de `ol.passos`, só no encerramento;
  - tabela: `regua-forte` no topo e na base, `regua` sob o cabeçalho, linhas de 1 px em `linha`; células numéricas alinhadas à direita, com algarismos tabulares, sendo numérica a célula cujo texto é só um número, com sinal, separador de milhar, vírgula ou ponto decimal e, opcionalmente, `%` ou o prefixo `R$`; `tr.destaque` e `td.destaque` em campo `amarelo`;
  - figura: imagem sem borda, sombra ou raio, contida na zona de conteúdo; `figcaption` de 18 px em `cinza`; `data-foto="pb"` aplica tons de cinza; `alt` obrigatório;
  - `code` no meio de texto usa Geist Mono a 0,88em.
- Textos do sistema em `pt-BR` e `en`, escolhidos pelo `lang` da aula (spec 6.8).
- Nenhuma dependência nova.
- Testes de integração rodam um arquivo por vez (`node --test tests/integracao/<arquivo>`), para que cada execução termine em segundos.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Decisões deste marco (conferidas no Chrome 152 antes de escrever o plano; o autor pode revê-las)

- **O marco 3 foi dividido em dois.** Este plano (M3a) cobre os blocos de corpo que não usam biblioteca. Matemática (KaTeX, `\passo`) e código com destaque (Shiki) ficam para o M3b: os dois são renderizadores carregados sob demanda que rodam no navegador e no build, compartilham essa arquitetura, e o Shiki ainda precisa ser baixado, com autorização do autor.
- **Rótulo dos campos por `::before`.** `content: attr(data-rotulo)` num bloco de 14 px com 8 px de respiro, como na tela aprovada de tipografia. O exercício recebe `data-rotulo` da montagem, com "Exercício" e "Resposta" no idioma da aula (spec 6.8): o DOM do autor não ganha elementos, e o rótulo da resposta some e reaparece junto com ela quando ela é passo. Sem `data-rotulo`, o campo não tem rótulo.
- **Listas em linha, não em grade.** A tela aprovada desenha os passos em grade, com o numeral numa coluna e o texto na outra, mas o autor escreve `<li>Ande <strong>contra</strong> o gradiente.</li>`, e numa grade cada elemento em linha viraria uma célula. O numeral e o marcador são `inline-block`, com recuo pendente (`padding-left` e `text-indent` negativo): o numeral fica na linha de base da primeira linha, e as linhas seguintes começam alinhadas ao texto, com qualquer conteúdo em linha.
- **Cabeçalho de coluna numérica à direita.** A spec alinha à direita a célula numérica. Um cabeçalho à esquerda sobre números à direita descola do que rotula, então `marcarCelulasNumericas` também marca o cabeçalho da coluna em que todas as células de dados com texto são numéricas (célula vazia não conta; célula com `colspan` não decide coluna). O autor pode reverter: é uma condição em `montar/corpo.js`.
- **Tabela na largura da coluna**, com o cabeçalho em 600 e o cabeçalho de linha (`th` no `tbody`) em 400, para que os números fiquem em primeiro plano.
- **Figura sem ampliar e sem centralizar** (pendências do M2a). No layout `figura`, a mídia cabe pela dimensão que a limita, alinhada à esquerda e com a legenda colada: imagem raster nunca é ampliada; SVG, que é vetor, amplia até caber. A regra do M2a (`width: 100%` com `object-fit`) ampliava imagens pequenas e, como `object-fit` não vale para SVG, centralizava o SVG alto e afastava a legenda. No corpo de `conteudo`, a figura ocupa no máximo a largura da coluna e segue o fluxo; se transbordar, quem acusa é o validador (marco 4). As regras de figura saem de `layouts.css` para `componentes.css`.
- **Espécime próprio.** `especime/componentes.html`, com 15 slides, em vez de crescer `especime/index.html`, cujos 13 slides são contados pelos testes do marco 2; os casos extremos de figura ficam em `tests/fixtures/figuras/`.
- **`sub` e `sup` com `line-height: 0`**, para que o índice não abra a linha.
- **Recursos de teste fechados com `t.after`.** Um teste que sobe servidor ou abre página própria registra o fechamento em `t.after` antes das asserções: com o fechamento no fim do corpo, uma asserção que falha deixa o servidor aberto e o `node --test` não termina.
- **O que fica para o M3b:** `pre[data-lang]` (forma, destaque, linhas marcadas e números de linha); comentários em `cinza` sobre a linha marcada em `amarelo`, que dariam 3,2:1 (pendência do M1); comandos de cor do KaTeX (pendência do M1); `textoDeTitulo`, que copia TeX cru para o rótulo do cabeçalho, o slug e o `aria-label` (pendência do M2a).
- **Pendências do M2c que continuam fora:** tamanhos de fonte em px nos painéis e no apresentador, testes de impressão para `capturar()` que lança e para painel aberto, eventos reais de `beforeprint` e `afterprint`, e recuperação ao recarregar a janela do apresentador. Não são componentes; ficam registradas para os marcos do validador e do build.

## Roteiro atualizado

| plano | escopo | depende de |
|---|---|---|
| M2a · Montagem e layouts | concluído na `main` | M1 |
| M2b · Motor de apresentação | concluído na `main` | M2a |
| M2c · Demos, apresentador e impressão | concluído na `main` (`9609476`) | M2b |
| **M3a · Componentes de corpo (este)** | campos, exercício, listas, tabela, figura e texto em linha | M2c |
| M3b · Matemática e código | KaTeX com `\passo`, Shiki com tema dos tokens, `pre[data-lang]`, títulos com TeX, nos dois modos | M3a |
| M4 · Validador | regras estáticas, de carga e de composição, painel (V) | M3b |
| M5 · Build e PDF | embutir, PDF, regras de saída, `dist` com SRI | M4 |
| M6 · Guia e pacotes | guia, modelo, aula-exemplo, pacotes | M5 |
| M7 · Aceite | Claude Code e Codex CLI | M6 |

## Estrutura de arquivos deste marco

| arquivo | responsabilidade |
|---|---|
| `estilos/componentes.css` | forma dos blocos de corpo: campos, exercício, listas, texto em linha, tabela e figura |
| `montar/corpo.js` | rótulos do exercício; células numéricas e cabeçalho de coluna numérica |
| `montar/montar.js` | chama `montar/corpo.js` |
| `montar/navegador.js` | carrega `estilos/componentes.css` |
| `motor/rotulos.js` | "Exercício" e "Resposta" nos dois idiomas |
| `estilos/layouts.css` | perde as regras de figura, que passam para `componentes.css` |
| `contrato/contrato.json` | `numerica` em `classesDoSistema` |
| `especime/componentes.html` | cada componente no limite da spec |
| `tests/fixtures/figuras/index.html` | imagem larga, imagem grande sem legenda, SVG alto e SVG de `viewBox` minúsculo |
| `tests/unit/corpo.test.mjs`, `tests/unit/montar.test.mjs` | testes unitários |
| `tests/integracao/componentes.test.mjs` | geometria e estilo no Chrome |

---

### Task 1: Campos, exercício, listas e texto em linha

**Files:**
- Create: `montar/corpo.js`, `estilos/componentes.css`, `especime/componentes.html`
- Modify: `motor/rotulos.js`, `montar/montar.js`, `montar/navegador.js`, `estilos/layouts.css`
- Test: `tests/unit/corpo.test.mjs`, `tests/unit/montar.test.mjs`, `tests/integracao/componentes.test.mjs`

**Interfaces:**
- Consumes: `rotulosPara(lang)` de `motor/rotulos.js`; `montar(doc, opcoes)` de `montar/montar.js`, que já tem `rot` e o documento; o modo folha (`?folha`) de `montar/navegador.js`, em que os passos aparecem revelados; `AulaUSP.prepararImpressao()` (marco 2c); `tests/integracao/utilitarios.mjs` (`iniciarChrome`, `servirPasta`, `abrirAula`).
- Produces (usado pelas Tasks 2 e 3):
  - `rotularExercicios(raiz, rot)` em `montar/corpo.js`, chamada por `montar` logo depois de `atribuirIds`;
  - `rot.exercicio` e `rot.resposta` nos dois idiomas;
  - `estilos/componentes.css`, carregado entre `layouts.css` e `motor.css`, com as seções `campos e exercício`, `listas` e `texto em linha`; as Tasks 2 e 3 acrescentam `tabela` e `figura` no fim;
  - `especime/componentes.html`, com 15 slides; ids usados pelos testes: `destaque-quadro-alerta`, `exercicio`, `marcadores-e-passos`, `texto-em-linha`, `tabela`, `tabela-na-coluna`, `imagem-pequena`, `foto-em-cinza`, `figura-no-corpo`;
  - `tests/integracao/componentes.test.mjs`, com `folha()` (uma página em modo folha, compartilhada), `perto(obtido, esperado, descricao)` e as constantes de cor, a que as Tasks 2 e 3 acrescentam testes.

- [ ] **Step 1: Escrever os testes unitários que falham**

Criar `tests/unit/corpo.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { rotularExercicios } from '../../montar/corpo.js';
import { rotulosPara } from '../../motor/rotulos.js';

const aula = (corpo) => parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document;

test('rotularExercicios dá ao enunciado e à resposta os rótulos do idioma da aula', () => {
  for (const [lang, exercicio, resposta] of [['pt-BR', 'Exercício', 'Resposta'], ['en', 'Exercise', 'Answer']]) {
    const doc = aula('<section><div class="exercicio"><div class="enunciado">Quanto?</div><div class="resposta">Dois.</div></div><div class="enunciado">Fora do exercício.</div></section>');
    rotularExercicios(doc, rotulosPara(lang));
    const rotulos = [...doc.querySelectorAll('.enunciado, .resposta')].map((parte) => parte.getAttribute('data-rotulo'));
    assert.deepEqual(rotulos, [exercicio, resposta, null], lang);
  }
});
```

Em `tests/unit/montar.test.mjs`, logo antes do teste `'conteúdo do autor vai para div.area, com o TeX intacto; notas ficam fora'`, acrescentar:

```js
test('a montagem rotula exercícios no idioma da aula', () => {
  const html = AULA_IME('en').replace('<p>Texto.</p><aside',
    '<div class="exercicio"><div class="enunciado">How much?</div><div class="resposta">Two.</div></div><aside');
  const { document } = montado(html);
  assert.deepEqual([...document.querySelectorAll('.enunciado, .resposta')].map((parte) => parte.getAttribute('data-rotulo')), ['Exercise', 'Answer']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/corpo.test.mjs tests/unit/montar.test.mjs`
Expected: FAIL em 2 dos 20 testes: `tests/unit/corpo.test.mjs` com `ERR_MODULE_NOT_FOUND` (`Cannot find module '.../montar/corpo.js'`) e, em `montar.test.mjs`, o teste novo com `actual: [ null, null ]` no lugar de `[ 'Exercise', 'Answer' ]`.

- [ ] **Step 3: Acrescentar os rótulos do exercício**

Em `motor/rotulos.js`, no bloco `'pt-BR'`, trocar

```js
    aula: 'Aula',
```

por

```js
    aula: 'Aula',
    exercicio: 'Exercício',
    resposta: 'Resposta',
```

e, no bloco `en`, trocar

```js
    aula: 'Lecture',
```

por

```js
    aula: 'Lecture',
    exercicio: 'Exercise',
    resposta: 'Answer',
```

- [ ] **Step 4: Criar `montar/corpo.js`**

```js
// Blocos de corpo que a montagem completa (spec 7.1): rótulos do exercício.

export function rotularExercicios(raiz, rot) {
  for (const enunciado of raiz.querySelectorAll('div.exercicio > div.enunciado')) enunciado.setAttribute('data-rotulo', rot.exercicio);
  for (const resposta of raiz.querySelectorAll('div.exercicio > div.resposta')) resposta.setAttribute('data-rotulo', rot.resposta);
}
```

- [ ] **Step 5: Chamar `rotularExercicios` na montagem**

Em `montar/montar.js`, trocar

```js
import { rotulosPara } from '../motor/rotulos.js';
```

por

```js
import { rotulosPara } from '../motor/rotulos.js';
import { rotularExercicios } from './corpo.js';
```

e trocar

```js
  atribuirIds(doc, secoes);
```

por

```js
  atribuirIds(doc, secoes);
  rotularExercicios(doc, rot);
```

- [ ] **Step 6: Rodar os testes unitários**

Run: `npm test`
Expected: PASS em todos (121 do marco 2c + 1 de `corpo` + 1 de `montar` = 123).

- [ ] **Step 7: Criar o espécime de componentes**

Criar `especime/componentes.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Componentes do Aula USP</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Espécime do Aula USP">
<meta name="aula" content="3a">
<meta name="data" content="2026-09-16">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Componentes de corpo<br><span class="sinal">campos, listas, tabelas</span></h1>
</section>

<section data-layout="abertura" id="campos">
  <h2>Campos</h2>
  <p class="pergunta">Como separar definição, exemplo e cuidado?</p>
</section>

<section data-layout="conteudo" id="destaque-quadro-alerta">
  <h2>Destaque, quadro e alerta</h2>
  <div class="colunas" data-grade="6-6">
    <div>
      <aside class="destaque" data-rotulo="Definição">Taxa de aprendizado: o tamanho de cada passo da descida.</aside>
      <aside class="destaque" data-rotulo="Resultado">Com taxa pequena, o erro cai devagar, mas sem oscilar.</aside>
    </div>
    <div>
      <aside class="quadro">Com taxa 0,1 e gradiente 4, o peso anda 0,4 no sentido oposto.</aside>
      <aside class="alerta" data-rotulo="Cuidado">Taxa grande demais faz o erro subir em vez de cair.</aside>
    </div>
  </div>
  <aside class="notas">O quadro sem data-rotulo não mostra rótulo.</aside>
</section>

<section data-layout="conteudo" id="exercicio">
  <h2>Exercício com a resposta em passo</h2>
  <div class="exercicio">
    <div class="enunciado">Um peso vale 2, o gradiente vale 5 e a taxa é 0,1. Qual é o novo peso?</div>
    <div class="resposta" data-passo>O peso anda 0,5 contra o gradiente e vai para 1,5.</div>
  </div>
  <aside class="notas">Deixar a turma tentar antes de revelar a resposta.</aside>
</section>

<section data-layout="abertura" id="listas">
  <h2>Listas</h2>
  <p class="pergunta">Quando usar marcadores e quando numerar?</p>
</section>

<section data-layout="conteudo" id="marcadores-e-passos">
  <h2>Marcadores e passos numerados</h2>
  <div class="colunas" data-grade="6-6">
    <div>
      <ul>
        <li>O erro mede a distância ao alvo.</li>
        <li>O gradiente aponta a subida.</li>
        <li>A taxa controla o passo.</li>
        <li>Os pesos começam ao acaso.</li>
        <li>Um item longo quebra a linha, e a segunda linha segue o texto.</li>
      </ul>
    </div>
    <div>
      <ol class="passos">
        <li>Calcule o erro.</li>
        <li data-passo>Calcule o gradiente com <code>grad(E)</code>.</li>
        <li data-passo>Ande <strong>contra</strong> o gradiente.</li>
        <li data-passo>Repita até o erro parar de cair.</li>
        <li data-passo>Um passo longo também quebra a linha e segue o texto.</li>
      </ol>
    </div>
  </div>
  <aside class="notas">Marcadores para itens sem ordem; números para uma sequência.</aside>
</section>

<section data-layout="conteudo" id="texto-em-linha">
  <h2>Código e índices no meio do texto</h2>
  <p class="lide">Código em linha e índices não mudam o espaço entre as linhas.</p>
  <p>A atualização <code>w -= lr * grad</code> repete a cada passo, e a primeira linha deste parágrafo tem a mesma altura que a segunda.</p>
  <p>O peso w<sub>ij</sub> liga a unidade i à unidade j, e o custo de uma camada cresce com n<sup>2</sup>, então esta linha quebra e as duas linhas ficam com a mesma altura.</p>
  <aside class="notas">Comparar a altura das linhas com e sem código.</aside>
</section>

<section data-layout="abertura" id="tabelas">
  <h2>Tabelas</h2>
  <p class="pergunta">Como comparar números lado a lado?</p>
</section>

<section data-layout="conteudo" id="tabela">
  <h2>Oito linhas de dados em seis colunas</h2>
  <table>
    <thead>
      <tr><th scope="col">modelo</th><th scope="col">épocas</th><th scope="col">erro</th><th scope="col">tempo (s)</th><th scope="col">custo</th><th scope="col">ganho</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">Linear</th><td>10</td><td>12,5%</td><td>0,8</td><td>R$ 120</td><td>0,0</td></tr>
      <tr><th scope="row">Logística</th><td>20</td><td>9,1%</td><td>1,2</td><td>R$ 150</td><td>+3,4</td></tr>
      <tr><th scope="row">Árvore</th><td>1</td><td>8,4%</td><td>0,3</td><td>R$ 90</td><td>+0,7</td></tr>
      <tr class="destaque"><th scope="row">Floresta</th><td>1</td><td>6,2%</td><td>4,7</td><td>R$ 400</td><td>+2,2</td></tr>
      <tr><th scope="row">Boosting</th><td>200</td><td>5,9%</td><td>12,1</td><td>R$ 1.250</td><td>+0,3</td></tr>
      <tr><th scope="row">Rede rasa</th><td>50</td><td>7,3%</td><td>8,5</td><td>R$ 600</td><td>−1,4</td></tr>
      <tr><th scope="row">Rede funda</th><td>300</td><td class="destaque">4,8%</td><td>95,0</td><td>R$ 2.400</td><td>+2,5</td></tr>
      <tr><th scope="row">Conjunto</th><td>1.000</td><td>4,6%</td><td>210,4</td><td>R$ 5.100</td><td>+0,2</td></tr>
    </tbody>
  </table>
  <aside class="notas">Números à direita, com algarismos de mesma largura; texto à esquerda.</aside>
</section>

<section data-layout="conteudo" id="tabela-na-coluna">
  <h2>Uma tabela curta ao lado do texto</h2>
  <div class="colunas" data-grade="6-6">
    <div>
      <p>Numa coluna, a tabela ocupa a largura da coluna, e as réguas marcam essa largura.</p>
    </div>
    <div>
      <table>
        <thead>
          <tr><th scope="col">taxa</th><th scope="col">épocas até parar</th></tr>
        </thead>
        <tbody>
          <tr><td>0,01</td><td>840</td></tr>
          <tr><td>0,1</td><td>95</td></tr>
          <tr><td>1,0</td><td>diverge</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <aside class="notas">Com taxa 1,0 o erro não para de subir.</aside>
</section>

<section data-layout="abertura" id="figuras">
  <h2>Figuras</h2>
  <p class="pergunta">Como uma imagem ocupa a zona de conteúdo?</p>
</section>

<section data-layout="figura" id="imagem-pequena">
  <h2>Uma imagem pequena não é ampliada</h2>
  <figure>
    <img alt="Retângulo cinza de 320 por 180 com um canto preto" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23D9D9D9'/%3E%3Crect width='80' height='45' fill='%230A0A0A'/%3E%3C/svg%3E">
    <figcaption>A imagem mantém os 320 por 180 px originais, alinhada à esquerda, e a legenda vem logo abaixo.</figcaption>
  </figure>
  <aside class="notas">Ampliar uma imagem pequena a deixaria borrada no projetor.</aside>
</section>

<section data-layout="figura" id="foto-em-cinza">
  <h2>Uma foto em tons de cinza</h2>
  <figure data-foto="pb">
    <img alt="Faixas vermelha, verde e azul" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2400' height='1600' viewBox='0 0 3 2'%3E%3Crect width='1' height='2' fill='%23CC3311'/%3E%3Crect x='1' width='1' height='2' fill='%23009944'/%3E%3Crect x='2' width='1' height='2' fill='%230044CC'/%3E%3C/svg%3E">
    <figcaption>Com data-foto="pb", a foto sai em cinza; grande demais, ela é reduzida para caber na zona.</figcaption>
  </figure>
  <aside class="notas">Fotos coloridas competiriam com o azul e o amarelo do sistema.</aside>
</section>

<section data-layout="conteudo" id="figura-no-corpo">
  <h2>Uma figura ao lado do texto</h2>
  <div class="colunas" data-grade="4-8">
    <div>
      <p>No corpo de um slide de conteúdo, a figura ocupa a largura da sua coluna.</p>
    </div>
    <div>
      <figure>
        <svg viewBox="0 0 760 320" role="img" aria-label="Três barras crescentes">
          <rect x="0" y="200" width="200" height="120" fill="#0A0A0A"/>
          <rect x="280" y="120" width="200" height="200" fill="#1094AB"/>
          <rect x="560" y="0" width="200" height="320" fill="#FCB421"/>
        </svg>
        <figcaption>Três barras crescentes.</figcaption>
      </figure>
    </div>
  </div>
  <aside class="notas">O SVG escala para a coluna, sem distorcer.</aside>
</section>

<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>Campos separam definição, exemplo e cuidado.</li>
    <li>Listas numeradas carregam uma sequência.</li>
    <li>Tabelas alinham números pela direita.</li>
  </ol>
  <p class="proxima">Próximo marco: matemática e código com destaque.</p>
</section>

</body>
</html>
```

- [ ] **Step 8: Escrever os testes de integração que falham**

Criar `tests/integracao/componentes.test.mjs`:

```js
// Blocos de corpo no Chrome, sobre especime/componentes.html servido por `aula-usp servir` (spec 4.3, 7.1 e 11.2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RAIZ, iniciarChrome, servirPasta, abrirAula } from './utilitarios.mjs';

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const TINTA = 'rgb(10, 10, 10)';
const PAPEL = 'rgb(255, 255, 255)';
const AMARELO = 'rgb(252, 180, 33)';
const LINHA = 'rgb(217, 217, 217)';
const TRANSPARENTE = 'rgba(0, 0, 0, 0)';

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

// Uma página em modo folha serve aos testes de geometria: nela os passos aparecem revelados.
const folha = () => (folhaAberta ??= abrirAula(navegador, `${servidor.endereco}/componentes.html?folha`));
const perto = (obtido, esperado, descricao) => assert.ok(Math.abs(obtido - esperado) <= 0.5, `${descricao}: ${obtido} em vez de ${esperado}`);

test('espécime de componentes: 15 slides montados sem erros, e toda classe do documento está no contrato', async () => {
  const { pagina, erros } = await folha();
  const { slides, classes } = await pagina.evaluate(() => ({
    slides: document.querySelectorAll('section.slide').length,
    classes: [...new Set([...document.querySelectorAll('[class]')].flatMap((elemento) => [...elemento.classList]))],
  }));
  assert.equal(slides, 15);
  assert.deepEqual(erros, []);
  const conhecidas = new Set([...Object.keys(contrato.html.classes), ...contrato.svg.classes, ...contrato.classesDoSistema]);
  assert.deepEqual(classes.filter((nome) => !conhecidas.has(nome)), []);
});

test('campos: destaque em amarelo, quadro com contorno de 2 px e alerta em tinta, com o rótulo vindo de data-rotulo', async () => {
  const { pagina } = await folha();
  const [destaque, quadro, alerta] = await pagina.evaluate(() => ['aside.destaque', 'aside.quadro', 'aside.alerta'].map((seletor) => {
    const campo = document.querySelector(`#destaque-quadro-alerta ${seletor}`);
    const estilo = getComputedStyle(campo);
    const rotulo = getComputedStyle(campo, '::before');
    return {
      fundo: estilo.backgroundColor,
      cor: estilo.color,
      borda: `${estilo.borderTopWidth} ${estilo.borderTopStyle}`,
      padding: [estilo.paddingTop, estilo.paddingRight, estilo.paddingBottom, estilo.paddingLeft].join(' '),
      rotulo: rotulo.content,
      fonteDoRotulo: `${rotulo.fontWeight} ${rotulo.fontSize} ${rotulo.fontFamily}`,
      caixaDoRotulo: `${rotulo.display} ${rotulo.textTransform} ${rotulo.marginBottom}`,
    };
  }));
  assert.deepEqual([destaque.fundo, destaque.cor], [AMARELO, TINTA]);
  assert.deepEqual([quadro.fundo, quadro.borda], [TRANSPARENTE, '2px solid']);
  assert.deepEqual([alerta.fundo, alerta.cor], [TINTA, PAPEL]);
  for (const campo of [destaque, quadro, alerta]) assert.equal(campo.padding, '16px 24px 16px 24px');
  assert.equal(destaque.rotulo, '"Definição"');
  assert.equal(alerta.rotulo, '"Cuidado"');
  assert.equal(quadro.rotulo, 'none', 'sem data-rotulo, o campo não ganha rótulo');
  assert.equal(destaque.fonteDoRotulo, '700 14px "Geist Mono", ui-monospace, monospace');
  assert.equal(destaque.caixaDoRotulo, 'block uppercase 8px');
});

test('exercício: enunciado com a forma do quadro e o rótulo "Exercício"; resposta com o rótulo "Resposta", 24 px abaixo', async () => {
  const { pagina } = await folha();
  const [enunciado, resposta] = await pagina.evaluate(() => ['.enunciado', '.resposta'].map((seletor) => {
    const parte = document.querySelector(`#exercicio ${seletor}`);
    const estilo = getComputedStyle(parte);
    const caixa = parte.getBoundingClientRect();
    return {
      rotulo: getComputedStyle(parte, '::before').content,
      borda: `${estilo.borderTopWidth} ${estilo.borderTopStyle}`,
      padding: `${estilo.paddingTop} ${estilo.paddingLeft}`,
      topo: caixa.top,
      base: caixa.bottom,
    };
  }));
  assert.deepEqual([enunciado.rotulo, enunciado.borda, enunciado.padding], ['"Exercício"', '2px solid', '16px 24px']);
  assert.deepEqual([resposta.rotulo, resposta.borda, resposta.padding], ['"Resposta"', '0px none', '0px 0px']);
  perto(resposta.topo - enunciado.base, 24, 'espaço entre enunciado e resposta');
});

test('listas: marcador quadrado de 8 px com recuo pendente; passos com numeral de 40 px na linha de base do texto, sob régua de 2 px', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const slide = document.getElementById('marcadores-e-passos');
    const esquerda = slide.getBoundingClientRect().left;
    const inicioDasLinhas = (item) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(item);
      return [...faixa.getClientRects()].map((linha) => linha.left - esquerda);
    };
    const linhaDeBase = (item) => {
      const sonda = document.createElement('span');
      sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      item.prepend(sonda);
      const y = sonda.getBoundingClientRect().top - item.getBoundingClientRect().top;
      sonda.remove();
      return y;
    };
    const itens = [...slide.querySelectorAll('ul > li')];
    const passos = [...slide.querySelectorAll('ol.passos > li')];
    const sintese = [...document.querySelectorAll('[data-layout="encerramento"] ol.sintese > li')];
    const marcador = getComputedStyle(itens[0], '::before');
    const numeral = getComputedStyle(passos[0], '::before');
    return {
      marcador: `${marcador.width} ${marcador.height} ${marcador.backgroundColor}`,
      linhasDoItemLongo: inicioDasLinhas(itens[4]),
      espacoEntreItens: itens[1].getBoundingClientRect().top - itens[0].getBoundingClientRect().bottom,
      numeral: `${numeral.fontWeight} ${numeral.fontSize} ${numeral.fontFamily}`,
      reguas: passos.map((passo) => `${getComputedStyle(passo).borderTopWidth} ${getComputedStyle(passo).borderTopColor}`),
      baseDoPrimeiroPasso: linhaDeBase(passos[0]),
      linhasDoPassoLongo: inicioDasLinhas(passos[4]),
      espacoEntrePassos: passos[1].getBoundingClientRect().top - passos[0].getBoundingClientRect().bottom,
      sintese: sintese.map((item) => `${getComputedStyle(item).borderTopWidth} ${getComputedStyle(item, '::before').fontSize}`),
    };
  });
  assert.equal(medida.marcador, `8px 8px ${TINTA}`);
  assert.deepEqual(medida.linhasDoItemLongo, [88, 88], 'as duas linhas do item começam 24 px depois da margem');
  perto(medida.espacoEntreItens, 8, 'espaço entre itens');
  assert.equal(medida.numeral, '600 40px Geist, system-ui, sans-serif');
  assert.deepEqual(medida.reguas, Array(5).fill(`2px ${TINTA}`));
  // régua (2) + padding (16) + a parte do numeral acima da linha de base (34, pelas métricas da Geist)
  assert.ok(Math.abs(medida.baseDoPrimeiroPasso - 52) <= 1, `linha de base do primeiro passo em ${medida.baseDoPrimeiroPasso}`);
  assert.deepEqual(medida.linhasDoPassoLongo, [716, 716], 'as duas linhas do passo começam 64 px depois da coluna');
  perto(medida.espacoEntrePassos, 24, 'espaço entre passos');
  assert.deepEqual(medida.sintese, Array(3).fill('2px 40px'), 'ol.sintese tem a forma de ol.passos');
});

test('texto em linha: code em Geist Mono a 0,88em; sub e sup a 0,8em, sem mudar a altura das linhas', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const [, comCodigo, comIndices] = document.querySelectorAll('#texto-em-linha .area > p');
    const codigo = getComputedStyle(comCodigo.querySelector('code'));
    return {
      codigo: `${codigo.fontSize} ${codigo.fontFamily}`,
      indices: [getComputedStyle(comIndices.querySelector('sub')).fontSize, getComputedStyle(comIndices.querySelector('sup')).fontSize],
      alturas: [comCodigo.getBoundingClientRect().height, comIndices.getBoundingClientRect().height],
    };
  });
  assert.equal(medida.codigo, '21.12px "Geist Mono", ui-monospace, monospace');
  assert.deepEqual(medida.indices, ['19.2px', '19.2px']);
  for (const altura of medida.alturas) perto(altura, 2 * 24 * 1.42, 'parágrafo de duas linhas de leitura');
});

test('a resposta do exercício é passo no palco e sai revelada na impressão', async (t) => {
  const { pagina, erros } = await abrirAula(navegador, `${servidor.endereco}/componentes.html#exercicio`);
  t.after(() => pagina.close());
  const visibilidade = () => pagina.evaluate(() => getComputedStyle(document.querySelector('#exercicio .resposta')).visibility);
  assert.equal(await visibilidade(), 'hidden');
  await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
  assert.equal(await visibilidade(), 'visible');
  assert.deepEqual(erros, []);
});
```

- [ ] **Step 9: Rodar e ver falhar**

Run: `node --test tests/integracao/componentes.test.mjs`
Expected: FAIL em 4 dos 6 testes, porque `componentes.css` ainda não existe: `campos` (fundo `rgba(0, 0, 0, 0)` no lugar de `rgb(252, 180, 33)`), `exercício` (rótulo `none` e borda `0px none`), `listas` (marcador `auto auto rgba(0, 0, 0, 0)`) e `texto em linha` (`24px monospace`). Passam o teste do espécime (15 slides, classes no contrato) e o da resposta revelada na impressão, que dependem só da montagem e do motor.

- [ ] **Step 10: Criar `estilos/componentes.css`**

```css
/* Blocos de corpo (spec 7.1): campos, exercício, listas, tabela, figura e texto em linha, em px lógicos do palco. */

/* ---------- campos e exercício ---------- */

.area :is(aside.destaque, aside.quadro, aside.alerta, div.enunciado) {
  padding: var(--espaco-2) var(--espaco-3);
}

.area aside.destaque {
  background: var(--cor-amarelo);
  color: var(--cor-tinta);
}

.area :is(aside.quadro, div.enunciado) {
  border: var(--regua-normal) solid var(--cor-tinta);
}

.area aside.alerta {
  background: var(--cor-tinta);
  color: var(--cor-papel);
}

.area :is(aside.destaque, aside.quadro, aside.alerta, div.enunciado, div.resposta)[data-rotulo]::before {
  content: attr(data-rotulo);
  display: block;
  margin-bottom: var(--espaco-1);
  font-family: var(--tipo-rotulo-familia);
  font-size: var(--tipo-rotulo-tamanho);
  font-weight: var(--tipo-rotulo-peso);
  line-height: var(--tipo-rotulo-entrelinha);
  letter-spacing: var(--tipo-rotulo-tracking);
  text-transform: var(--tipo-rotulo-caixa);
}

.area :is(aside.destaque, aside.quadro, aside.alerta, div.enunciado, div.resposta) > * + * {
  margin-top: var(--espaco-2);
}

.area div.exercicio > * + * {
  margin-top: var(--espaco-3);
}

/* ---------- listas ---------- */

.area :is(ul, ol.passos, ol.sintese) {
  list-style: none;
  padding: 0;
}

.area ul > li {
  padding-left: var(--espaco-3);
  text-indent: calc(-1 * var(--espaco-3));
}

.area ul > li + li {
  margin-top: var(--espaco-1);
}

.area ul > li::before {
  content: "";
  display: inline-block;
  width: var(--espaco-1);
  height: var(--espaco-1);
  margin-right: var(--espaco-2);
  vertical-align: middle;
  background: var(--cor-tinta);
}

.area :is(ol.passos, ol.sintese) {
  counter-reset: passo;
}

.area :is(ol.passos, ol.sintese) > li {
  counter-increment: passo;
  padding-top: var(--espaco-2);
  padding-left: var(--espaco-6);
  text-indent: calc(-1 * var(--espaco-6));
  border-top: var(--regua-normal) solid var(--cor-tinta);
}

.area :is(ol.passos, ol.sintese) > li + li {
  margin-top: var(--espaco-3);
}

.area :is(ol.passos, ol.sintese) > li::before {
  content: counter(passo);
  display: inline-block;
  width: var(--espaco-6);
  text-indent: 0;
  font-family: var(--tipo-numeral-familia);
  font-size: var(--tipo-numeral-tamanho);
  font-weight: var(--tipo-numeral-peso);
  line-height: var(--tipo-numeral-entrelinha);
  letter-spacing: var(--tipo-numeral-tracking);
}

.area :is(ul, ol.passos, ol.sintese) > li > * {
  text-indent: 0;
}

/* ---------- texto em linha ---------- */

.area :not(pre) > code {
  font-family: var(--tipo-codigo-familia);
  font-size: 0.88em; /* spec 7.1 */
}

.area :is(sub, sup) {
  font-size: 0.8em; /* spec 4.3 */
  line-height: 0;
}
```

- [ ] **Step 11: Carregar a folha na entrada do navegador e atualizar o comentário do ritmo**

Em `montar/navegador.js`, trocar

```js
const ESTILOS = ['estilos/tokens.css', 'estilos/fontes.css', 'estilos/base.css', 'estilos/layouts.css', 'estilos/motor.css', 'estilos/impressao.css'];
```

por

```js
const ESTILOS = ['estilos/tokens.css', 'estilos/fontes.css', 'estilos/base.css', 'estilos/layouts.css', 'estilos/componentes.css', 'estilos/motor.css', 'estilos/impressao.css'];
```

Em `estilos/layouts.css`, trocar

```css
/* Ritmo entre blocos de corpo; a forma de cada bloco é do marco 3. */
```

por

```css
/* Ritmo entre blocos de corpo; a forma de cada bloco está em componentes.css. */
```

- [ ] **Step 12: Rodar os testes**

Run: `node --test tests/integracao/componentes.test.mjs`
Expected: PASS nos 6 testes.

Run, um arquivo por vez: `for arquivo in tests/integracao/*.test.mjs; do node --test "$arquivo" || break; done`
Expected: PASS em todos (49 do marco 2c + 6 de `componentes` = 55).

Run: `npm test`
Expected: PASS nos 123 testes unitários.

- [ ] **Step 13: Commit**

```bash
git add motor/rotulos.js montar/corpo.js montar/montar.js montar/navegador.js estilos/componentes.css estilos/layouts.css especime/componentes.html tests/unit/corpo.test.mjs tests/unit/montar.test.mjs tests/integracao/componentes.test.mjs
git commit -m "feat(componentes): campos, exercício, listas e texto em linha

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Tabela

**Files:**
- Modify: `montar/corpo.js`, `montar/montar.js`, `contrato/contrato.json`, `estilos/componentes.css`
- Test: `tests/unit/corpo.test.mjs`, `tests/unit/montar.test.mjs`, `tests/integracao/componentes.test.mjs`

**Interfaces:**
- Consumes: `montar/corpo.js` com `rotularExercicios` (Task 1); `estilos/componentes.css` e `tests/integracao/componentes.test.mjs` (Task 1), com `folha()`, `perto()` e as constantes de cor; os slides `tabela` e `tabela-na-coluna` de `especime/componentes.html`.
- Produces:
  - `ehNumerica(texto) → boolean` e `marcarCelulasNumericas(raiz)` em `montar/corpo.js`; `marcarCelulasNumericas` marca com `numerica` as células de tabelas dentro de `section` cujo texto é número e as células de `thead` cuja coluna só tem números;
  - a classe `numerica` em `contrato.classesDoSistema`.

- [ ] **Step 1: Escrever os testes unitários que falham**

Substituir o conteúdo de `tests/unit/corpo.test.mjs` por:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { ehNumerica, marcarCelulasNumericas, rotularExercicios } from '../../montar/corpo.js';
import { rotulosPara } from '../../motor/rotulos.js';

const aula = (corpo) => parseHTML(`<!DOCTYPE html><html><body>${corpo}</body></html>`).document;
const numericas = (doc) => [...doc.querySelectorAll('.numerica')].map((celula) => celula.textContent);

test('rotularExercicios dá ao enunciado e à resposta os rótulos do idioma da aula', () => {
  for (const [lang, exercicio, resposta] of [['pt-BR', 'Exercício', 'Resposta'], ['en', 'Exercise', 'Answer']]) {
    const doc = aula('<section><div class="exercicio"><div class="enunciado">Quanto?</div><div class="resposta">Dois.</div></div><div class="enunciado">Fora do exercício.</div></section>');
    rotularExercicios(doc, rotulosPara(lang));
    const rotulos = [...doc.querySelectorAll('.enunciado, .resposta')].map((parte) => parte.getAttribute('data-rotulo'));
    assert.deepEqual(rotulos, [exercicio, resposta, null], lang);
  }
});

test('ehNumerica aceita número com sinal, separador de milhar, decimal, % e R$', () => {
  for (const texto of ['42', '-3,14', '+0.5', '−7', '1.234,56', '1,234.56', '1 234', '12%', '12,5 %', 'R$ 1.200,00', 'R$100', ' 3 ', '0,001']) {
    assert.equal(ehNumerica(texto), true, texto);
  }
});

test('ehNumerica recusa texto, data, unidade e número mal formado', () => {
  for (const texto of ['', 'n/d', '1.2.3', '1,2,3', '2026-09-14', '10 kg', '1e5', '12:30', '-', '%', 'US$ 5']) {
    assert.equal(ehNumerica(texto), false, texto);
  }
});

test('marca células numéricas e alinha o cabeçalho da coluna que só tem números, com célula vazia neutra', () => {
  const doc = aula(`<section><table>
    <thead><tr><th>modelo</th><th>erro</th><th>nota</th><th>casos</th><th>2026</th></tr></thead>
    <tbody>
      <tr><th scope="row">A</th><td>12,5%</td><td>boa</td><td>1</td><td>x</td></tr>
      <tr><th scope="row">B</th><td>9,1%</td><td>3</td><td></td><td>y</td></tr>
    </tbody>
  </table></section>`);
  marcarCelulasNumericas(doc);
  assert.deepEqual(numericas(doc), ['erro', 'casos', '2026', '12,5%', '1', '9,1%', '3']);
});

test('rowspan desloca as colunas das linhas seguintes; célula com colspan não alinha cabeçalho', () => {
  const comRowspan = aula(`<section><table>
    <thead><tr><th>grupo</th><th>valor</th><th>nota</th></tr></thead>
    <tbody><tr><td rowspan="2">x</td><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr></tbody>
  </table></section>`);
  marcarCelulasNumericas(comRowspan);
  assert.deepEqual(numericas(comRowspan), ['valor', '1', '2']);

  const comColspan = aula(`<section><table>
    <thead><tr><th colspan="2">medidas</th></tr></thead>
    <tbody><tr><td>1</td><td>2</td></tr></tbody>
  </table></section>`);
  marcarCelulasNumericas(comColspan);
  assert.deepEqual(numericas(comColspan), ['1', '2']);
});

test('tabela fora de section não é tocada', () => {
  const doc = aula('<table><tbody><tr><td>1</td></tr></tbody></table><section><p>Texto.</p></section>');
  marcarCelulasNumericas(doc);
  assert.deepEqual(numericas(doc), []);
});
```

Em `tests/unit/montar.test.mjs`, substituir o teste acrescentado na Task 1

```js
test('a montagem rotula exercícios no idioma da aula', () => {
  const html = AULA_IME('en').replace('<p>Texto.</p><aside',
    '<div class="exercicio"><div class="enunciado">How much?</div><div class="resposta">Two.</div></div><aside');
  const { document } = montado(html);
  assert.deepEqual([...document.querySelectorAll('.enunciado, .resposta')].map((parte) => parte.getAttribute('data-rotulo')), ['Exercise', 'Answer']);
});
```

por

```js
test('a montagem rotula exercícios no idioma da aula e marca células numéricas', () => {
  const html = AULA_IME('en').replace('<p>Texto.</p><aside',
    '<div class="exercicio"><div class="enunciado">How much?</div><div class="resposta">Two.</div></div><table><tbody><tr><td>12,5</td><td>n/a</td></tr></tbody></table><aside');
  const { document } = montado(html);
  assert.deepEqual([...document.querySelectorAll('.enunciado, .resposta')].map((parte) => parte.getAttribute('data-rotulo')), ['Exercise', 'Answer']);
  assert.deepEqual([...document.querySelectorAll('td')].map((celula) => celula.className), ['numerica', '']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/unit/corpo.test.mjs tests/unit/montar.test.mjs`
Expected: FAIL em 2 dos 20 testes: `corpo.test.mjs` com `SyntaxError: The requested module '../../montar/corpo.js' does not provide an export named 'ehNumerica'` e, em `montar.test.mjs`, `actual: [ '', '' ]` no lugar de `[ 'numerica', '' ]`.

- [ ] **Step 3: Completar `montar/corpo.js`**

Substituir o conteúdo de `montar/corpo.js` por:

```js
// Blocos de corpo que a montagem completa (spec 7.1): rótulos do exercício e células numéricas de tabela.

const NUMERO = /^(?:R\$ ?)?[+\-−]?(?:\d{1,3}(?:[., ]\d{3})+|\d+)(?:[.,]\d+)? ?%?$/;

export function ehNumerica(texto) {
  return NUMERO.test(texto.replace(/\s+/g, ' ').trim());
}

// Coluna de cada célula, contando colspan e rowspan; célula que ocupa mais de uma coluna fica com null.
function colunasDasCelulas(tabela) {
  const ocupadas = [];
  const colunas = new Map();
  [...tabela.querySelectorAll('tr')].forEach((linha, i) => {
    let coluna = 0;
    for (const celula of linha.children) {
      while (ocupadas[i]?.has(coluna)) coluna += 1;
      const largura = Number(celula.getAttribute('colspan')) || 1;
      const altura = Number(celula.getAttribute('rowspan')) || 1;
      colunas.set(celula, largura === 1 ? coluna : null);
      for (let di = 0; di < altura; di += 1) {
        for (let dc = 0; dc < largura; dc += 1) (ocupadas[i + di] ??= new Set()).add(coluna + dc);
      }
      coluna += largura;
    }
  });
  return colunas;
}

export function marcarCelulasNumericas(raiz) {
  for (const tabela of raiz.querySelectorAll('section table')) {
    const colunas = colunasDasCelulas(tabela);
    const comNumero = new Set();
    const comTexto = new Set();
    for (const celula of tabela.querySelectorAll('tbody td, tbody th')) {
      const coluna = colunas.get(celula);
      if (ehNumerica(celula.textContent)) {
        celula.classList.add('numerica');
        comNumero.add(coluna);
      } else if (celula.textContent.trim() !== '') {
        comTexto.add(coluna);
      }
    }
    for (const celula of tabela.querySelectorAll('thead td, thead th')) {
      const coluna = colunas.get(celula);
      const colunaNumerica = coluna !== null && comNumero.has(coluna) && !comTexto.has(coluna);
      if (colunaNumerica || ehNumerica(celula.textContent)) celula.classList.add('numerica');
    }
  }
}

export function rotularExercicios(raiz, rot) {
  for (const enunciado of raiz.querySelectorAll('div.exercicio > div.enunciado')) enunciado.setAttribute('data-rotulo', rot.exercicio);
  for (const resposta of raiz.querySelectorAll('div.exercicio > div.resposta')) resposta.setAttribute('data-rotulo', rot.resposta);
}
```

- [ ] **Step 4: Chamar `marcarCelulasNumericas` na montagem e registrar a classe**

Em `montar/montar.js`, trocar

```js
import { rotularExercicios } from './corpo.js';
```

por

```js
import { rotularExercicios, marcarCelulasNumericas } from './corpo.js';
```

e trocar

```js
  rotularExercicios(doc, rot);
```

por

```js
  rotularExercicios(doc, rot);
  marcarCelulasNumericas(doc);
```

Em `contrato/contrato.json`, trocar

```json
"captura-demo", "demo-substituta", "imprimindo"]
```

por

```json
"captura-demo", "demo-substituta", "imprimindo", "numerica"]
```

- [ ] **Step 5: Rodar os testes unitários**

Run: `npm test`
Expected: PASS em todos (123 da Task 1 + 5 novos de `corpo` = 128).

- [ ] **Step 6: Escrever o teste de integração que falha**

No fim de `tests/integracao/componentes.test.mjs`, acrescentar:

```js
test('tabela: réguas de 4 px no topo e na base, de 2 px sob o cabeçalho e de 1 px entre linhas; números à direita, alinhados pela borda', async () => {
  const { pagina } = await folha();
  const medida = await pagina.evaluate(() => {
    const tabela = document.querySelector('#tabela table');
    const estilo = getComputedStyle(tabela);
    const celula = (elemento) => {
      const e = getComputedStyle(elemento);
      return { alinhamento: e.textAlign, peso: e.fontWeight, fundo: e.backgroundColor, algarismos: e.fontVariantNumeric };
    };
    const direitaDoTexto = (elemento) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(elemento);
      return faixa.getBoundingClientRect().right;
    };
    const linhas = [...tabela.querySelectorAll('tbody tr')];
    const entreLinhas = getComputedStyle(linhas[1].children[1]);
    return {
      largura: tabela.getBoundingClientRect().width,
      reguas: [estilo.borderTopWidth, estilo.borderBottomWidth, estilo.borderTopColor, estilo.borderBottomColor],
      sobCabecalho: getComputedStyle(tabela.querySelector('thead th')).borderBottomWidth,
      entreLinhas: `${entreLinhas.borderTopWidth} ${entreLinhas.borderTopColor}`,
      cabecalho: [...tabela.querySelectorAll('thead th')].map((th) => `${celula(th).alinhamento} ${celula(th).peso}`),
      primeiraLinha: [...linhas[0].children].map(celula),
      bordasDasEpocas: new Set(linhas.map((linha) => direitaDoTexto(linha.children[1]).toFixed(2))).size,
      linhaEmDestaque: [...tabela.querySelector('tr.destaque').children].map((elemento) => celula(elemento).fundo),
      celulaEmDestaque: celula(tabela.querySelector('td.destaque')).fundo,
      naColuna: [document.querySelector('#tabela-na-coluna table').getBoundingClientRect().width, document.querySelectorAll('#tabela-na-coluna .colunas > div')[1].getBoundingClientRect().width],
      cabecalhoNaColuna: [...document.querySelectorAll('#tabela-na-coluna thead th')].map((th) => getComputedStyle(th).textAlign),
    };
  });
  assert.equal(medida.largura, 1152);
  assert.deepEqual(medida.reguas, ['4px', '4px', TINTA, TINTA]);
  assert.equal(medida.sobCabecalho, '2px');
  assert.equal(medida.entreLinhas, `1px ${LINHA}`);
  assert.deepEqual(medida.cabecalho, ['left 600', 'right 600', 'right 600', 'right 600', 'right 600', 'right 600']);
  const [modelo, ...numeros] = medida.primeiraLinha;
  assert.deepEqual([modelo.alinhamento, modelo.peso], ['left', '400']);
  for (const numero of numeros) assert.deepEqual([numero.alinhamento, numero.algarismos, numero.fundo], ['right', 'tabular-nums', TRANSPARENTE]);
  assert.equal(medida.bordasDasEpocas, 1, 'os números da coluna terminam na mesma borda');
  assert.deepEqual(medida.linhaEmDestaque, Array(6).fill(AMARELO));
  assert.equal(medida.celulaEmDestaque, AMARELO);
  assert.equal(medida.naColuna[0], medida.naColuna[1], 'numa coluna, a tabela ocupa a largura da coluna');
  assert.deepEqual(medida.cabecalhoNaColuna, ['right', 'left'], 'coluna com "diverge" não alinha o cabeçalho à direita');
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `node --test --test-name-pattern="tabela" tests/integracao/componentes.test.mjs`
Expected: FAIL no teste `tabela`, com as réguas da tabela em `0px` no lugar de `4px`.

- [ ] **Step 8: Dar forma à tabela**

No fim de `estilos/componentes.css`, depois de uma linha em branco, acrescentar:

```css
/* ---------- tabela ---------- */

.area table {
  width: 100%;
  border-collapse: collapse;
  border-top: var(--regua-forte) solid var(--cor-tinta);
  border-bottom: var(--regua-forte) solid var(--cor-tinta);
}

.area :is(th, td) {
  padding: var(--espaco-1) var(--espaco-2);
  font-weight: var(--tipo-leitura-peso);
  text-align: left;
  vertical-align: baseline;
  border-top: var(--regua-fina) solid var(--cor-linha);
}

.area thead :is(th, td) {
  font-weight: var(--tipo-leitura-peso-enfase);
  border-bottom: var(--regua-normal) solid var(--cor-tinta);
}

.area :is(th, td).numerica {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.area :is(tr.destaque > *, td.destaque) {
  background: var(--cor-amarelo);
}
```

- [ ] **Step 9: Rodar os testes**

Run: `node --test tests/integracao/componentes.test.mjs`
Expected: PASS nos 7 testes.

Run, um arquivo por vez: `for arquivo in tests/integracao/*.test.mjs; do node --test "$arquivo" || break; done`
Expected: PASS em todos (55 da Task 1 + 1 = 56).

Run: `npm test`
Expected: PASS nos 128 testes unitários.

- [ ] **Step 10: Commit**

```bash
git add montar/corpo.js montar/montar.js contrato/contrato.json estilos/componentes.css tests/unit/corpo.test.mjs tests/unit/montar.test.mjs tests/integracao/componentes.test.mjs
git commit -m "feat(componentes): tabela com réguas e colunas numéricas à direita

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: Figura

**Files:**
- Create: `tests/fixtures/figuras/index.html`
- Modify: `estilos/layouts.css`, `estilos/componentes.css`
- Test: `tests/integracao/componentes.test.mjs`

**Interfaces:**
- Consumes: `estilos/componentes.css` e `tests/integracao/componentes.test.mjs` (Tasks 1 e 2), com `navegador`, `folha()` e `perto()`; os slides `imagem-pequena`, `foto-em-cinza` e `figura-no-corpo` de `especime/componentes.html`; `servirPasta` e `abrirAula` de `tests/integracao/utilitarios.mjs`.
- Produces: as regras de figura em `estilos/componentes.css` (seção `figura`), no lugar das de `estilos/layouts.css`.

- [ ] **Step 1: Criar a fixture de figuras extremas**

Criar `tests/fixtures/figuras/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Figuras extremas</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Fixture de figuras">
<meta name="aula" content="3a">
<meta name="data" content="2026-09-16">
<meta name="professor" content="Prof. Renato Vicente">
<script src="../../../dist/aula-usp.js"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Figuras extremas</h1>
</section>

<section data-layout="abertura" id="imagens">
  <h2>Imagens</h2>
</section>

<section data-layout="figura" id="img-larga">
  <h2>Imagem mais larga que a zona</h2>
  <figure>
    <img alt="Faixa cinza de 3000 por 600" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='3000' height='600' viewBox='0 0 3000 600'%3E%3Crect width='3000' height='600' fill='%23D9D9D9'/%3E%3C/svg%3E">
    <figcaption>Limitada pela largura.</figcaption>
  </figure>
</section>

<section data-layout="figura" id="sem-legenda">
  <h2>Imagem grande sem legenda</h2>
  <figure>
    <img alt="Retângulo cinza de 2400 por 1600" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2400' height='1600' viewBox='0 0 2400 1600'%3E%3Crect width='2400' height='1600' fill='%23D9D9D9'/%3E%3C/svg%3E">
  </figure>
</section>

<section data-layout="abertura" id="vetores">
  <h2>Vetores</h2>
</section>

<section data-layout="figura" id="svg-alto">
  <h2>SVG mais alto que a zona</h2>
  <figure>
    <svg viewBox="0 0 400 800" role="img" aria-label="Retângulo alto"><rect width="400" height="800" fill="#D9D9D9"/></svg>
    <figcaption>Limitado pela altura, sem centralizar.</figcaption>
  </figure>
</section>

<section data-layout="figura" id="svg-minusculo">
  <h2>SVG com viewBox minúsculo</h2>
  <figure>
    <svg viewBox="0 0 16 9" role="img" aria-label="Retângulo de 16 por 9"><rect width="16" height="9" fill="#D9D9D9"/></svg>
    <figcaption>Vetor é ampliado até a zona.</figcaption>
  </figure>
</section>

<section data-layout="encerramento">
  <h2>Fim</h2>
  <ol class="sintese"><li>Cada mídia cabe pela dimensão que limita.</li></ol>
</section>

</body>
</html>
```

- [ ] **Step 2: Escrever os testes de integração que falham**

No fim de `tests/integracao/componentes.test.mjs`, acrescentar:

```js
test('figuras: imagem pequena sem ampliação, foto grande contida na zona, SVG na largura da coluna, legenda 16 px abaixo', async () => {
  const { pagina } = await folha();
  const { pequena, foto, corpo } = await pagina.evaluate(() => {
    const caixa = (elemento) => {
      const slide = elemento.closest('section').getBoundingClientRect();
      const r = elemento.getBoundingClientRect();
      return { x: r.left - slide.left, largura: r.width, altura: r.height, topo: r.top - slide.top, base: r.bottom - slide.top };
    };
    const figura = (id) => {
      const slide = document.getElementById(id);
      const midia = slide.querySelector('figure > img, figure > svg');
      const legenda = slide.querySelector('figcaption');
      return {
        midia: caixa(midia),
        legenda: caixa(legenda),
        estiloDaLegenda: `${getComputedStyle(legenda).fontSize} ${getComputedStyle(legenda).color}`,
        filtro: getComputedStyle(midia).filter,
      };
    };
    return {
      pequena: figura('imagem-pequena'),
      foto: figura('foto-em-cinza'),
      corpo: { ...figura('figura-no-corpo'), coluna: caixa(document.querySelectorAll('#figura-no-corpo .colunas > div')[1]) },
    };
  });
  assert.deepEqual([pequena.midia.x, pequena.midia.largura, pequena.midia.altura], [64, 320, 180]);
  perto(pequena.legenda.topo - pequena.midia.base, 16, 'legenda da imagem pequena');
  assert.equal(pequena.estiloDaLegenda, '18px rgb(102, 102, 102)');
  assert.equal(foto.filtro, 'grayscale(1)');
  assert.equal(foto.midia.x, 64);
  assert.ok(Math.abs(foto.midia.largura / foto.midia.altura - 1.5) < 0.01, 'a foto mantém a proporção de 3 por 2');
  perto(foto.legenda.base, 652, 'a foto ocupa a zona até a base do conteúdo');
  assert.deepEqual([corpo.midia.x, corpo.midia.largura], [corpo.coluna.x, corpo.coluna.largura]);
  perto(corpo.midia.altura, (corpo.coluna.largura * 320) / 760, 'altura do SVG pela proporção do viewBox');
  perto(corpo.legenda.topo - corpo.midia.base, 16, 'legenda do SVG');
});

test('figuras extremas: cada mídia cabe pela dimensão que a limita, sem distorcer, alinhada à esquerda e com a legenda colada', async (t) => {
  const fixtures = await servirPasta('tests/fixtures/figuras/');
  t.after(() => fixtures.fechar());
  const { pagina, erros } = await abrirAula(navegador, `${fixtures.endereco}/index.html?folha`);
  t.after(() => pagina.close());
  const medidas = await pagina.evaluate(() => [...document.querySelectorAll('section[data-layout="figura"]')].map((slide) => {
    const s = slide.getBoundingClientRect();
    const midia = slide.querySelector('figure > img, figure > svg');
    const legenda = slide.querySelector('figcaption');
    const r = midia.getBoundingClientRect();
    const viewBox = midia.getAttribute('viewBox')?.split(' ').map(Number);
    return {
      id: slide.id,
      x: r.left - s.left,
      largura: r.width,
      altura: r.height,
      base: r.bottom - s.top,
      proporcao: viewBox ? viewBox[2] / viewBox[3] : midia.naturalWidth / midia.naturalHeight,
      topoDaLegenda: legenda ? legenda.getBoundingClientRect().top - s.top : null,
      baseDaLegenda: legenda ? legenda.getBoundingClientRect().bottom - s.top : null,
    };
  }));
  assert.deepEqual(erros, []);
  assert.equal(medidas.length, 4);
  for (const m of medidas) {
    assert.equal(m.x, 64, `${m.id}: alinhada à esquerda`);
    assert.ok(Math.abs(m.largura / m.altura - m.proporcao) < 0.01, `${m.id}: proporção ${m.largura / m.altura} em vez de ${m.proporcao}`);
    assert.ok(m.largura <= 1152.5, `${m.id}: largura ${m.largura}`);
    if (m.topoDaLegenda !== null) perto(m.topoDaLegenda - m.base, 16, `${m.id}: legenda colada`);
  }
  const porId = Object.fromEntries(medidas.map((m) => [m.id, m]));
  perto(porId['img-larga'].largura, 1152, 'a imagem larga é limitada pela largura');
  perto(porId['sem-legenda'].base, 652, 'sem legenda, a imagem vai até a base da zona');
  perto(porId['svg-alto'].baseDaLegenda, 652, 'o SVG alto é limitado pela altura');
  perto(porId['svg-minusculo'].baseDaLegenda, 652, 'o SVG de viewBox minúsculo é ampliado até a zona');
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test --test-name-pattern="figuras" tests/integracao/componentes.test.mjs`
Expected: FAIL nos 2 testes, e os dois terminam em segundos (servidor e página da fixture fecham em `t.after`): em `figuras`, a imagem pequena sai com `[ 64, 1152, 436.1875 ]` no lugar de `[ 64, 320, 180 ]`, porque a regra do M2a estica a caixa; em `figuras extremas`, `sem-legenda: proporção 2.41… em vez de 1.5`.

- [ ] **Step 4: Tirar as regras de figura de `layouts.css`**

Em `estilos/layouts.css`, apagar o bloco abaixo, com a linha em branco que o segue, de modo que `.afirmacao + .fonte` fique separado do comentário `demo` por uma única linha em branco:

```css
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
```

- [ ] **Step 5: Dar forma à figura em `componentes.css`**

No fim de `estilos/componentes.css`, depois de uma linha em branco, acrescentar:

```css
/* ---------- figura ---------- */

.area figure > :is(img, svg) {
  max-width: 100%;
  height: auto;
}

.area figcaption {
  margin-top: var(--espaco-2);
}

.area figure[data-foto="pb"] img {
  filter: grayscale(1);
}

.slide[data-layout="figura"] figure {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.slide[data-layout="figura"] figure > :is(img, svg) {
  flex: 0 1 auto;
  min-height: 0;
}
```

- [ ] **Step 6: Rodar os testes**

Run: `node --test tests/integracao/componentes.test.mjs`
Expected: PASS nos 9 testes.

Run, um arquivo por vez: `for arquivo in tests/integracao/*.test.mjs; do node --test "$arquivo" || break; done`
Expected: PASS em todos (56 da Task 2 + 2 = 58), inclusive `layouts.test.mjs`, que mede a figura de `especime/index.html`.

Run: `npm test`
Expected: PASS nos 128 testes unitários.

- [ ] **Step 7: Conferir no navegador**

Com um script descartável fora do repositório (não use `npm run servir` em primeiro plano: ele não termina sozinho), importando `servirPasta`, `iniciarChrome` e `abrirAula` de `tests/integracao/utilitarios.mjs`, tirar uma captura de cada slide de `especime/componentes.html?folha` e dos slides `figura` de `tests/fixtures/figuras/index.html?folha`, e conferir: campos com rótulo em mono e o quadro sem rótulo; numerais na linha de base do texto; números da tabela alinhados pela direita, com os cabeçalhos acompanhando; imagem pequena sem ampliar e SVG alto alinhado à esquerda, com a legenda colada. Descrever no relatório o que viu. Não comitar o script nem as imagens.

- [ ] **Step 8: Commit**

```bash
git add estilos/layouts.css estilos/componentes.css tests/fixtures/figuras/index.html tests/integracao/componentes.test.mjs
git commit -m "feat(componentes): figura contida, sem ampliar, com a legenda colada

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
