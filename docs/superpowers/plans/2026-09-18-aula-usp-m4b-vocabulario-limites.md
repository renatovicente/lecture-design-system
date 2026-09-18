# Marco 4b do Aula USP: vocabulário, limites e recursos estáticos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** completar o grupo estático do validador — as oito regras de `vocabulario`, as vinte de `limites` e as cinco estáticas de `matematica` e `recursos` —, e tirar o registro de regras de dentro do módulo de Node, para o marco 4c poder importá-lo no navegador.

**Architecture:** o marco 4a deixou o motor pronto: `validar(doc, { contrato, regras, grupo, … })` roda as regras de um grupo e devolve achados ordenados, com severidade e ação lidas do contrato. Este marco acrescenta três módulos de regras — `validador/regras/vocabulario.js`, `limites.js` e `recursos.js` — e move a lista de regras para `validador/regras/index.js`, que é ES module puro. O contexto que `validar` entrega às regras passa a ser extensível: o que vier além dos parâmetros conhecidos é repassado, de modo que o marco 4c possa injetar `cobertura`, imagens carregadas e o que mais precisar sem tocar no núcleo.

**Tech Stack:** Node ≥20.6, ES modules, `node:test`, `linkedom`. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 4.2, 5.2, 5.3, 5.5, 5.6, 9.1, 9.2, 9.3 e 11.1).

## Global Constraints

- **Severidade, grupo, fase e ação vêm sempre de `contrato.regras.<nome>`.** Nenhum texto de ação e nenhuma severidade escritos no código das regras. Os limites numéricos vêm de `contrato.limites`, as listas de elementos, classes e atributos de `contrato.html` e `contrato.svg`, e as proibições de `contrato.proibidos`.
- **`validador/` não importa nada de Node** (spec 3.5): nada de `node:fs`, `node:path`, `process`. Só API padrão do DOM, porque o mesmo código roda no navegador no marco 4c.
- **As regras deste marco são do grupo `estatica`** (spec 9.3): rodam sobre o fonte da aula, antes da montagem. Nada aqui carrega KaTeX, imagem ou script.
- **Mensagem (spec 9.1):** `ERRO · slide 7 #culpa · limites.titulo · problema. Ação.` — problema em português, terminando em ponto; a ação vem do contrato.
- **Uma regra, um dono.** Quando duas regras pegariam o mesmo erro, a mais específica é a dona e a outra se cala. Vale para `data-lang` (dona: `recursos.linguagem`, não `vocabulario.atributo`) e para elemento fora do vocabulário (que não tem os atributos enumerados depois).
- **Fixtures:** `tests/fixtures/validador/<regra>/bom.html` e `ruim.html`, uma pasta por regra (spec 11.1), cada arquivo um **documento inteiro** — o `linkedom` não enche `document.body` a partir de um fragmento que começa em `<body>`. A varredura que já existe roda todas as regras sobre cada fixture e filtra pela regra da pasta.
- **Commits:** mensagem em português, `tipo(escopo): frase no imperativo`, terminando com a linha exata `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Testes:** `npm test` para os unitários; a integração roda **um arquivo por vez**. O ponto de partida é 214 unitários e 75 de integração.
- **Disciplina de saída:** edições pontuais, nunca reescrita de arquivo grande numa tacada; no relatório, só as linhas de resumo dos testes e as asserções que falharam. Dois agentes do marco 4a morreram por estourar o limite de saída.

## O que este marco não faz

`matematica.simbolo-fora-do-tex` **fica para o marco 5**, apesar de ser regra estática de fase 1. A spec 9.3 diz que `validador/cobertura.json` — gerado por `aula-usp dist` a partir do `cmap` dos woff2 — é "a fonte única do conjunto de caracteres com glifo", e `dist` só existe no marco 5. O `assets/fontes/fontes.json` traz os `unicodeRange` declarados pelo Google, que dariam uma aproximação; usá-los criaria uma segunda fonte de verdade para a mesma pergunta, que é exatamente a classe de defeito que o marco 4a pegou duas vezes (duas varreduras da mesma coisa divergem). A regra entra no marco 5 junto com a gêmea `saida.glifo-ausente`, que lê o mesmo arquivo.

Depois deste marco faltam, do marco 4: o grupo de carga (4 regras), o de composição (5) e o painel do navegador — todos no 4c.

## O que já está verificado

Todo o código deste plano foi escrito e rodado numa cópia de rascunho, sobre o conteúdo real do espécime e sobre 48 mutações deliberadas.

1. **As seis aulas do espécime passam sem erro nenhum** com as 33 regras novas somadas às 13 do marco 4a — e sem aviso nenhum, exceto os dez deliberados de `muitos-blocos.html`.
2. **46 achados nas 48 mutações.** Os três silêncios são os corretos: o controle sem mutação, `$100` e `$20` de dinheiro (que não são matemática) e TeX com comando de cor dentro de `<pre>` (que nunca é renderizado).
3. **Quatro defeitos do protótipo apareceram na sondagem e estão corrigidos no código abaixo:**
   - o próprio `<svg>` era tratado como elemento HTML, e `viewBox`, `role` e `aria-label` viravam erro falso no espécime;
   - a `section` não era varrida, então `data-layout`, `id`, `data-curto` e `data-pdf` não eram conferidos por regra nenhuma — um `data-curto` fora da abertura passava batido;
   - `matematica.cifrao-suspeito` usava `textosComTex`, que só devolve nós de texto **com** `\(` ou `\[`; um parágrafo com `$x^2$` e sem TeX nunca era visitado. A correção é um andador só (`textosDe`) com uma lista de exclusão só, e `textosComTex` passa a ser um filtro sobre ele;
   - `data-lang` fora da lista acusava duas vezes, por `vocabulario.atributo` e por `recursos.linguagem`.
4. **O padrão das macros de cor do KaTeX foi medido:** `\\(red|orange|yellow|green|blue|purple|pink|gray|grey|teal|gold|maroon|mint)[A-H]?(?![a-zA-Z])` pega `\redA{x}`, `\blue{y}` e `\grayH{z}`, e deixa passar `\reduce{x}`, `\greenish`, `\frac{1}{2}` e `\text{red}`.

## Estrutura de arquivos

```
validador/regras/index.js       registro das regras, ES module puro                    (Task 1, novo)
validador/validar.js            contexto extensível: o que vier a mais é repassado     (Task 1)
build/validar.mjs               passa a importar o registro em vez de montá-lo         (Task 1)
validador/regras/vocabulario.js oito regras de vocabulário                             (Task 1, novo)
validador/regras/limites.js     vinte regras de limite                                 (Task 2, novo)
validador/regras/recursos.js    matemática e recursos estáticos                        (Task 3, novo)
componentes/tex.js              textosDe exportado; textosComTex vira filtro dele      (Task 3)
contrato/contrato.json          macros de cor do KaTeX entram nos proibidos            (Task 3)
tests/fixtures/validador/<regra>/{bom,ruim}.html   33 pastas novas                     (Tasks 1-3)
tests/unit/vocabulario.test.mjs, limites.test.mjs, recursos.test.mjs                   (Tasks 1-3, novos)
```

---

### Task 1: Registro puro, contexto extensível e as oito regras de vocabulário

**Files:**
- Create: `validador/regras/index.js`, `validador/regras/vocabulario.js`, `tests/unit/vocabulario.test.mjs`
- Modify: `validador/validar.js`, `build/validar.mjs`, `tests/unit/validador.test.mjs` (a varredura de fixtures mora lá)
- Create: 8 pastas de fixture

**Interfaces:**
- Consumes: `validar`, `onde`, `trechoDe`, `plural` de `validador/validar.js`; `contrato.html`, `contrato.svg`, `contrato.proibidos`, `contrato.classesDoSistema`.
- Produces (usado pelas Tasks 2 e 3, pelo marco 4c e pelo build):
  - `validador/regras/index.js` → `REGRAS_ESTATICAS`, a lista na ordem em que as mensagens saem;
  - contexto de regra estendido: `validar(doc, { contrato, regras, grupo, fase, ...dados })` repassa `...dados` para as regras, de modo que `unidades` continua funcionando e `cobertura` (marco 5) ou imagens carregadas (4c) entram sem tocar no núcleo.

- [ ] **Step 1: Abrir o contexto de `validar`**

Em `validador/validar.js`, troque a assinatura e a montagem do contexto:

```js
export function validar(doc, { contrato, regras, grupo, fase = 1, ...dados }) {
  doc.body.normalize(); // o linkedom parte o texto em cada entidade; sem juntar, o TeX do fonte não é achado
  const slides = slidesDoFonte(doc.body);
  // O que vier além do que o motor conhece vai para as regras: é assim que o marco 4c injeta cobertura
  // de glifos e imagens carregadas sem mexer aqui.
  const contexto = { doc, slides, contrato, ...dados };
```

O resto da função não muda. `unidades` deixa de ser parâmetro nomeado e passa a chegar por `...dados`, sem mudança em nenhum chamador.

- [ ] **Step 2: Rodar a suíte e ver que nada quebrou**

Rode: `npm test`
Espere: 214 passando. Se algum teste falhar aqui, a mudança de assinatura quebrou um chamador — conserte antes de seguir.

- [ ] **Step 3: Criar o registro puro**

Crie `validador/regras/index.js`:

```js
// Registro das regras (spec 9.3): a lista que o validador roda, em ES module puro, sem Node.
// O marco 4c importa este arquivo no navegador; por isso ele não pode viver em build/.
// A ordem é a ordem das mensagens dentro de um slide: estrutura, conteúdo, vocabulário, limites, recursos.
import { regras as estrutura } from './estrutura.js';
import { regras as conteudo } from './conteudo.js';
import { regras as vocabulario } from './vocabulario.js';

export const REGRAS_ESTATICAS = [...estrutura, ...conteudo, ...vocabulario];
```

Em `build/validar.mjs`, troque a montagem local pelo registro:

```js
import { validar, contar } from '../validador/validar.js';
import { REGRAS_ESTATICAS } from '../validador/regras/index.js';
```

e apague os dois imports de `estrutura.js`/`conteudo.js` e a linha que montava `REGRAS_ESTATICAS` ali. Reexporte o nome para não quebrar quem já importava de `build/validar.mjs`:

```js
export { REGRAS_ESTATICAS };
```

- [ ] **Step 4: Escrever o teste de vocabulário, que falha**

Crie `tests/unit/vocabulario.test.mjs`:

```js
// Regras de vocabulário (spec 5.5 e 9.2): elementos, classes e atributos do contrato, e mais nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar } from '../../validador/validar.js';
import { regras as vocabulario } from '../../validador/regras/vocabulario.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>`;

const aula = (corpo) => `${CABECA}\n${corpo}\n</body></html>`;
const slide = (dentro) => aula(`<section data-layout="conteudo" id="a">\n${dentro}\n</section>`);

function rodar(html) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras: vocabulario, grupo: 'estatica' });
}

const mensagens = (html) => rodar(html).map((achado) => achado.mensagem);

test('o que está no contrato passa', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p class="lide">Lide.</p>\n<p>Corpo.</p>')), []);
});

test('elemento fora do vocabulário e elemento proibido', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<blockquote>Citação.</blockquote>')), ['<blockquote> não está no vocabulário no corpo.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<iframe src="https://x"></iframe>')), ['<iframe> é proibido no corpo da aula.']);
});

test('elemento fora do vocabulário não tem os atributos enumerados depois', () => {
  // Uma regra, um dono: acusar o elemento e cada atributo dele faria quatro mensagens de um erro só.
  assert.equal(mensagens(slide('<h2>T</h2>\n<iframe src="https://x" width="10"></iframe>')).length, 1);
});

test('classe inventada, classe do sistema, classe no elemento errado e fora do pai', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p class="bonito">C.</p>')), ['classe "bonito" não existe no contrato.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p class="rodape">C.</p>')), ['"rodape" é classe do sistema: o autor não a escreve no fonte.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<div class="lide">C.</div>')), ['classe "lide" não vale em <div>, só em <p>.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<div class="enunciado"><p>E.</p></div>')), ['classe "enunciado" só vale dentro de div.exercicio.']);
});

test('atributo fora do contrato, com valor fora da lista, e com JSON inválido', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p tabindex="0">C.</p>')), ['atributo "tabindex" não vale em <p>.']);
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<div class="colunas" data-grade="7-5"><div><p>A</p></div><div><p>B</p></div></div>')),
    ['data-grade com valor fora do contrato: "7-5".'],
  );
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<div class="demo" data-demo="x" data-opcoes="{passo: 5}"></div>')),
    ['data-opcoes com valor não é JSON válido.'],
  );
});

// A section só foi varrida depois que a sondagem mostrou que os atributos dela não tinham dono.
test('os atributos da própria section são conferidos', () => {
  assert.deepEqual(
    mensagens(aula('<section data-layout="conteudo" id="a" data-curto="X"><h2>T</h2><p>C.</p></section>')),
    ['atributo "data-curto" só vale no layout abertura.'],
  );
  assert.deepEqual(
    mensagens(aula('<section data-layout="conteudo" id="Maiúsculo"><h2>T</h2><p>C.</p></section>')),
    ['id com valor fora da forma esperada: "Maiúsculo".'],
  );
});

test('atributo de evento e estilo em linha', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p onclick="alert(1)">C.</p>')), ['atributo "onclick" é proibido no corpo da aula.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p style="color: red">C.</p>')), ['estilo em linha em <p>.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>C.</p>\n<style>p { color: red }</style>')), ['elemento <style> no corpo da aula.']);
});

test('o vocabulário do SVG é outro, e o próprio svg conta como SVG', () => {
  const figura = (dentro) => slide(`<h2>T</h2>\n<figure><svg viewBox="0 0 10 10" role="img" aria-label="d">${dentro}</svg></figure>`);
  assert.deepEqual(mensagens(figura('<rect fill="#0A0A0A" width="5" height="5"/>')), []);
  assert.deepEqual(mensagens(figura('<rect fill="#FF0000" width="5" height="5"/>')), ['fill="#FF0000" não é cor do contrato.']);
  assert.deepEqual(mensagens(figura('<foreignObject width="5" height="5"/>')), ['<foreignObject> é proibido no corpo da aula.']);
});

test('amarelo e azul em SVG seguem a regra de cor da spec 4.2', () => {
  const svg = (dentro) => slide(`<h2>T</h2>\n<figure><svg viewBox="0 0 10 10">${dentro}</svg></figure>`);
  assert.deepEqual(mensagens(svg('<text fill="#FCB421" font-size="40">oi</text>')), ['amarelo em texto de SVG.']);
  assert.deepEqual(mensagens(svg('<line stroke="#FCB421" stroke-width="2" x1="0" y1="0" x2="5" y2="5"/>')), ['amarelo em traço de 2 px (mín. 4).']);
  assert.deepEqual(mensagens(svg('<line stroke="#FCB421" stroke-width="4" x1="0" y1="0" x2="5" y2="5"/>')), []);
  assert.deepEqual(mensagens(svg('<text fill="#1094AB" font-size="20">oi</text>')), ['azul em texto de 20 px (mín. 32).']);
  assert.deepEqual(mensagens(svg('<text fill="#1094AB" font-size="32">oi</text>')), []);
});

test('script dentro da section', () => {
  assert.deepEqual(
    mensagens(slide('<h2>T</h2>\n<p>C.</p>\n<script>var x = 1;</script>')),
    ['script dentro da section: registros de demo ficam fora dos slides.'],
  );
});
```

- [ ] **Step 5: Rodar e ver falhar**

Rode: `node --test tests/unit/vocabulario.test.mjs`
Espere: falha ao importar `validador/regras/vocabulario.js`.

- [ ] **Step 6: Escrever as oito regras**

Crie `validador/regras/vocabulario.js`:

```js
// Regras de vocabulário (spec 5.5 e 9.2): no corpo da aula só entram os elementos, classes e atributos
// que o contrato lista. Tudo aqui é lido do contrato; o código só sabe percorrer o DOM.
import { onde, trechoDe } from '../validar.js';

const AMARELO = '#FCB421';
const AZUL = '#1094AB';
const MINIMO_AZUL = 32; // spec 4.2: azul em texto só a partir de 32 px
const MINIMO_TRACO_AMARELO = 4; // spec 4.2: amarelo em traço só de 4 px para cima

function nomeDe(elemento) {
  return elemento.nodeName.toLowerCase();
}

// O SVG tem vocabulário próprio (spec 5.5), então cada elemento é lido no seu contexto. O próprio <svg>
// conta como SVG: ele está nas duas listas de elementos, mas os atributos dele são os de SVG.
function emSvg(elemento) {
  return elemento.closest('svg') !== null;
}

// A própria section entra: data-layout, id, data-curto e data-pdf são atributos do autor como os outros.
function* elementosDoCorpo(slides) {
  for (const secao of slides) {
    yield { secao, elemento: secao };
    for (const elemento of secao.querySelectorAll('*')) yield { secao, elemento };
  }
}

// Atributos que outra regra já é dona: acusar duas vezes o mesmo erro só faz o autor duvidar das duas.
const DE_OUTRA_REGRA = new Set(['data-lang']);

// Atributos que o contrato permite neste elemento: os de "*" mais os de cada seletor que ele casa.
function atributosPermitidos(elemento, contrato) {
  const permitidos = new Map();
  for (const [seletor, atributos] of Object.entries(contrato.html.atributos)) {
    if (seletor !== '*' && !elemento.matches(seletor)) continue;
    for (const [nome, regra] of Object.entries(atributos)) permitidos.set(nome, regra);
  }
  return permitidos;
}

function valorInvalido(valor, regra) {
  if (regra.valores && !regra.valores.includes(valor)) return `valor fora do contrato: "${valor}"`;
  if (regra.padrao && !new RegExp(regra.padrao).test(valor)) return `valor fora da forma esperada: "${valor}"`;
  if (regra.json) {
    try {
      JSON.parse(valor);
    } catch {
      return 'valor não é JSON válido';
    }
  }
  return null;
}

function numeroDoAtributo(elemento, nome, padrao) {
  const valor = elemento.getAttribute(nome);
  if (valor === null) return padrao;
  const numero = Number.parseFloat(valor);
  return Number.isNaN(numero) ? padrao : numero;
}

export const regras = [
  {
    nome: 'vocabulario.elemento',
    *aplicar({ slides, contrato }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (elemento === secao) continue; // a section é o slide; quem confere o layout dela é estrutura.layout
        const nome = nomeDe(elemento);
        if (nome === 'style' || nome === 'script') continue; // vocabulario.style e vocabulario.script
        if (contrato.proibidos.elementos.includes(nome)) {
          yield { ...onde(slides, secao), mensagem: `<${nome}> é proibido no corpo da aula.`, trecho: trechoDe(elemento) };
          continue;
        }
        const lista = emSvg(elemento) ? contrato.svg.elementos : contrato.html.elementos;
        if (!lista.includes(nome)) {
          const onde_ = emSvg(elemento) ? 'no SVG' : 'no corpo';
          yield { ...onde(slides, secao), mensagem: `<${nome}> não está no vocabulário ${onde_}.`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.classe',
    *aplicar({ slides, contrato }) {
      const doSistema = new Set(contrato.classesDoSistema);
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        for (const classe of elemento.classList) {
          if (emSvg(elemento)) {
            if (!contrato.svg.classes.includes(classe)) {
              yield { ...onde(slides, secao), mensagem: `classe "${classe}" não existe no vocabulário do SVG.`, trecho: trechoDe(elemento) };
            }
            continue;
          }
          if (doSistema.has(classe)) {
            yield { ...onde(slides, secao), mensagem: `"${classe}" é classe do sistema: o autor não a escreve no fonte.`, trecho: trechoDe(elemento) };
            continue;
          }
          const regra = contrato.html.classes[classe];
          if (!regra || regra.fase > 1) {
            yield { ...onde(slides, secao), mensagem: `classe "${classe}" não existe no contrato.`, trecho: trechoDe(elemento) };
            continue;
          }
          const nome = nomeDe(elemento);
          if (regra.em && !regra.em.includes(nome)) {
            yield { ...onde(slides, secao), mensagem: `classe "${classe}" não vale em <${nome}>, só em ${regra.em.map((e) => `<${e}>`).join(' ou ')}.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (regra.dentro && !regra.dentro.some((pai) => elemento.parentElement?.closest(pai))) {
            yield { ...onde(slides, secao), mensagem: `classe "${classe}" só vale dentro de ${regra.dentro.join(' ou ')}.`, trecho: trechoDe(elemento) };
          }
        }
      }
    },
  },
  {
    nome: 'vocabulario.atributo',
    *aplicar({ slides, contrato }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        const nome = nomeDe(elemento);
        // Elemento que nem está no vocabulário já foi acusado; enumerar os atributos dele é ruído.
        if (elemento !== secao && !emSvg(elemento) && !contrato.html.elementos.includes(nome)) continue;
        const permitidos = emSvg(elemento) ? null : atributosPermitidos(elemento, contrato);
        for (const atributo of elemento.attributes) {
          const chave = atributo.name;
          if (chave === 'class' || chave === 'style' || DE_OUTRA_REGRA.has(chave)) continue;
          if (contrato.proibidos.prefixosDeAtributo.some((prefixo) => chave.startsWith(prefixo))) {
            yield { ...onde(slides, secao), mensagem: `atributo "${chave}" é proibido no corpo da aula.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (contrato.proibidos.atributos.includes(chave)) {
            yield { ...onde(slides, secao), mensagem: `atributo "${chave}" é proibido no corpo da aula.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (emSvg(elemento)) {
            const doElemento = contrato.svg.atributosPorElemento[nome] ?? [];
            if (!contrato.svg.atributos.includes(chave) && !doElemento.includes(chave)) {
              yield { ...onde(slides, secao), mensagem: `atributo "${chave}" não está no vocabulário do SVG.`, trecho: trechoDe(elemento) };
              continue;
            }
            if (chave === 'href' && !new RegExp(contrato.svg.hrefPadrao).test(atributo.value)) {
              yield { ...onde(slides, secao), mensagem: `href de SVG só aponta para um id da própria figura: "${atributo.value}".`, trecho: trechoDe(elemento) };
            }
            continue;
          }
          const regra = permitidos.get(chave);
          if (!regra || regra.fase > 1) {
            yield { ...onde(slides, secao), mensagem: `atributo "${chave}" não vale em <${nome}>.`, trecho: trechoDe(elemento) };
            continue;
          }
          if (regra.layouts && !regra.layouts.includes(secao.getAttribute('data-layout'))) {
            yield { ...onde(slides, secao), mensagem: `atributo "${chave}" só vale no layout ${regra.layouts.join(' ou ')}.`, trecho: trechoDe(elemento) };
            continue;
          }
          const problema = valorInvalido(atributo.value, regra);
          if (problema) yield { ...onde(slides, secao), mensagem: `${chave} com ${problema}.`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.style',
    *aplicar({ slides }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (nomeDe(elemento) === 'style') {
          yield { ...onde(slides, secao), mensagem: 'elemento <style> no corpo da aula.', trecho: trechoDe(elemento) };
        } else if (elemento.hasAttribute('style')) {
          yield { ...onde(slides, secao), mensagem: `estilo em linha em <${nomeDe(elemento)}>.`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.cor-svg',
    *aplicar({ slides, contrato }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (!emSvg(elemento)) continue;
        for (const chave of ['fill', 'stroke']) {
          const valor = elemento.getAttribute(chave);
          if (valor === null) continue;
          if (!contrato.svg.cores.includes(valor.toUpperCase()) && !contrato.svg.cores.includes(valor)) {
            yield { ...onde(slides, secao), mensagem: `${chave}="${valor}" não é cor do contrato.`, trecho: trechoDe(elemento) };
          }
        }
      }
    },
  },
  {
    nome: 'vocabulario.amarelo-svg',
    *aplicar({ slides }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (!emSvg(elemento)) continue;
        const nome = nomeDe(elemento);
        const preenchimento = elemento.getAttribute('fill')?.toUpperCase();
        if (preenchimento === AMARELO && (nome === 'text' || nome === 'tspan')) {
          yield { ...onde(slides, secao), mensagem: 'amarelo em texto de SVG.', trecho: trechoDe(elemento) };
          continue;
        }
        const traco = elemento.getAttribute('stroke')?.toUpperCase();
        if (traco !== AMARELO) continue;
        const largura = numeroDoAtributo(elemento, 'stroke-width', 1);
        if (largura < MINIMO_TRACO_AMARELO) {
          yield { ...onde(slides, secao), mensagem: `amarelo em traço de ${largura} px (mín. ${MINIMO_TRACO_AMARELO}).`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.azul-svg',
    *aplicar({ slides }) {
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (!emSvg(elemento)) continue;
        const nome = nomeDe(elemento);
        if (nome !== 'text' && nome !== 'tspan') continue;
        if (elemento.getAttribute('fill')?.toUpperCase() !== AZUL) continue;
        const tamanho = numeroDoAtributo(elemento, 'font-size', 16);
        if (tamanho < MINIMO_AZUL) {
          yield { ...onde(slides, secao), mensagem: `azul em texto de ${tamanho} px (mín. ${MINIMO_AZUL}).`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'vocabulario.script',
    *aplicar({ slides, contrato }) {
      const permitido = contrato.html.elementosFase2?.script;
      for (const { secao, elemento } of elementosDoCorpo(slides)) {
        if (nomeDe(elemento) !== 'script') continue;
        const dentro = permitido?.dentro?.some((pai) => elemento.closest(pai));
        yield {
          ...onde(slides, secao),
          mensagem: dentro ? 'script dentro da section: gráficos e diagramas são da fase 2.' : 'script dentro da section: registros de demo ficam fora dos slides.',
          trecho: trechoDe(elemento),
        };
      }
    },
  },
];
```

- [ ] **Step 7: Rodar e ver passar**

Rode: `node --test tests/unit/vocabulario.test.mjs` — 10 testes.
Rode: `npm test` — 224 (214 + 10). Se o número não bater, diga no relatório o que mediu: contagem errada no plano é defeito do plano, não do código.

- [ ] **Step 8: Escrever as oito fixtures**

Cada arquivo é um documento inteiro: o cabeçalho «CABEÇA» abaixo, o corpo da tabela, e `</body></html>`.

```html
<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>
```

Onde a tabela diz `«slide: X»`, o corpo é `<section data-layout="conteudo" id="a">X</section>`.

| pasta | bom.html | ruim.html |
|---|---|---|
| `vocabulario.elemento` | «slide: `<h2>T</h2><p>Corpo.</p>`» | «slide: `<h2>T</h2><blockquote>Citação.</blockquote>`» |
| `vocabulario.classe` | «slide: `<h2>T</h2><p class="lide">Lide.</p>`» | «slide: `<h2>T</h2><p class="bonito">Corpo.</p>`» |
| `vocabulario.atributo` | «slide: `<h2>T</h2><div class="colunas" data-grade="6-6"><div><p>A</p></div><div><p>B</p></div></div>`» | o mesmo com `data-grade="7-5"` |
| `vocabulario.style` | «slide: `<h2>T</h2><p>Corpo.</p>`» | «slide: `<h2>T</h2><p style="color: red">Corpo.</p>`» |
| `vocabulario.cor-svg` | «slide: `<h2>T</h2><figure><svg viewBox="0 0 10 10"><rect fill="#0A0A0A" width="5" height="5"/></svg></figure>`» | o mesmo com `fill="#FF0000"` |
| `vocabulario.amarelo-svg` | «slide: `<h2>T</h2><figure><svg viewBox="0 0 10 10"><line stroke="#FCB421" stroke-width="4" x1="0" y1="0" x2="5" y2="5"/></svg></figure>`» | o mesmo com `stroke-width="2"` |
| `vocabulario.azul-svg` | «slide: `<h2>T</h2><figure><svg viewBox="0 0 10 10"><text fill="#1094AB" font-size="32">oi</text></svg></figure>`» | o mesmo com `font-size="20"` |
| `vocabulario.script` | «slide: `<h2>T</h2><p>Corpo.</p>`» | «slide: `<h2>T</h2><p>Corpo.</p><script>var x = 1;</script>`» |

- [ ] **Step 9: Rodar a varredura e commitar**

Rode: `npm test` — 232 (224 + 8 pastas novas, uma por pasta na varredura de fixtures). A rodada de correção da tarefa 1 acrescentou mais 5 testes, então as contagens das tarefas 2 e 3 partem de 237.

```bash
git add validador tests/unit/vocabulario.test.mjs tests/fixtures/validador build/validar.mjs
git commit -m "$(cat <<'MSG'
feat(validador): vocabulário do corpo, e o registro de regras fora do Node

O contrato lista elementos, classes, atributos e cores; as regras só sabem
percorrer o DOM. O registro sai de build/ para validador/regras/index.js,
que o marco 4c importa no navegador, e o contexto de validar passa a
repassar o que vier a mais.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: As vinte regras de limite

**Files:**
- Create: `validador/regras/limites.js`, `tests/unit/limites.test.mjs`
- Modify: `validador/regras/index.js`
- Create: 20 pastas de fixture

**Interfaces:**
- Consumes: `contrato.limites`, `contrato.metadados`; `textoSemTex` de `componentes/tex.js`; `codigoDoBloco` de `componentes/codigo.js`.
- Produces: `segmentosDoTitulo(elemento)` e `palavrasDe(elemento)`, que o marco 4c reusa nas regras de composição (o título medido em linhas renderizadas precisa dos mesmos segmentos).

- [ ] **Step 1: Escrever o teste, que falha**

Crie `tests/unit/limites.test.mjs`:

```js
// Regras de limite (spec 5.2, 5.3 e 9.2): os números vêm do contrato, o código só conta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar } from '../../validador/validar.js';
import { regras as limites, segmentosDoTitulo, palavrasDe } from '../../validador/regras/limites.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>`;

const aula = (corpo) => `${CABECA}\n${corpo}\n</body></html>`;
const slide = (dentro) => aula(`<section data-layout="conteudo" id="a">\n${dentro}\n</section>`);
const repetir = (texto, vezes) => Array.from({ length: vezes }, () => texto).join(' ');

function rodar(html) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras: limites, grupo: 'estatica' });
}

const mensagens = (html) => rodar(html).map((achado) => achado.mensagem);

test('um slide dentro dos limites não acusa nada', () => {
  assert.deepEqual(mensagens(slide('<h2>Título</h2>\n<p class="lide">Lide.</p>\n<p>Corpo.</p>')), []);
});

test('o título conta por segmento, pelo texto que aparece', () => {
  const { document } = parseHTML(slide('<h2>Um<br>Dois</h2>'));
  assert.deepEqual(segmentosDoTitulo(document.querySelector('h2')), ['Um', 'Dois']);
  // TeX conta pelo texto renderizado: \frac{1}{2} vale "1/2", não doze caracteres de fonte.
  const comTex = parseHTML(slide('<h2>Taxa \\(\\frac{1}{2}\\)</h2>')).document;
  assert.deepEqual(segmentosDoTitulo(comTex.querySelector('h2')), ['Taxa 1/2']);
});

test('título longo e título com três segmentos', () => {
  assert.deepEqual(
    mensagens(slide('<h2>Um título bem longo que passa dos cinquenta caracteres previstos</h2>\n<p>C.</p>')),
    ['título com 64 caracteres num segmento (máx. 50).'],
  );
  assert.deepEqual(
    mensagens(slide('<h2>Um<br>Dois<br>Três</h2>\n<p>C.</p>')),
    ['título em 3 segmentos (máx. 2).'],
  );
});

test('cada layout tem o seu limite de título', () => {
  assert.deepEqual(mensagens(aula('<section data-layout="capa"><h1>Espécime Aula USP demais</h1></section>')),
    ['título com 24 caracteres num segmento (máx. 23).']);
  // A abertura para em 20, e 20 cabe: o limite é "no máximo", não "menos que".
  assert.deepEqual(mensagens(aula('<section data-layout="abertura" id="b"><h2>Retropropagação hoje</h2></section>')), []);
  assert.deepEqual(mensagens(aula('<section data-layout="abertura" id="b"><h2>Retropropagação hoje!</h2></section>')),
    ['título com 21 caracteres num segmento (máx. 20).']);
});

test('palavras do corpo e da coluna, sem contar código nem notas', () => {
  const { document } = parseHTML(slide('<p>uma duas três</p><pre data-lang="python">x = 1</pre><aside class="notas">nota longa aqui</aside>'));
  assert.equal(palavrasDe(document.querySelector('section')), 3);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<p>${repetir('palavra', 95)}</p>`)), ['95 palavras no corpo (máx. 90).']);
  assert.deepEqual(
    mensagens(slide(`<h2>T</h2>\n<div class="colunas" data-grade="6-6"><div><p>${repetir('palavra', 61)}</p></div><div><p>B</p></div></div>`)),
    ['61 palavras numa coluna (máx. 60).'],
  );
});

test('lista, destaques e alertas', () => {
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<ul>${repetir('<li>Item.</li>', 6)}</ul>`)), ['lista com 6 itens (máx. 5).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n${repetir('<aside class="destaque">D.</aside>', 3)}`)), ['3 destaques no slide (máx. 2).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n${repetir('<aside class="alerta">A.</aside>', 2)}`)), ['2 alertas no slide (máx. 1).']);
});

test('os limites de comprimento de texto', () => {
  assert.deepEqual(mensagens(aula(`<section data-layout="abertura" id="b"><h2>Um</h2><p class="pergunta">${repetir('pergunta', 13)}</p></section>`)),
    ['a pergunta tem 116 caracteres (máx. 90).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<p class="lide">${repetir('lide', 31)}</p>\n<p>C.</p>`)),
    ['o lide tem 154 caracteres (máx. 120).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<figure><img src="img/a.png" alt="a"><figcaption>${repetir('legenda', 21)}</figcaption></figure>`)),
    ['a legenda tem 167 caracteres (máx. 140).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<aside class="destaque" data-rotulo="${repetir('rotulo', 5)}">D.</aside>`)),
    ['rótulo com 34 caracteres (máx. 24).']);
});

test('síntese: itens demais e item longo demais', () => {
  const fim = (dentro) => aula(`<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese">${dentro}</ol></section>`);
  assert.deepEqual(mensagens(fim(repetir('<li>Item.</li>', 4))), ['síntese com 4 itens (máx. 3).']);
  assert.deepEqual(mensagens(fim(`<li>${repetir('sintese', 12)}</li>`)), ['item da síntese com 95 caracteres (máx. 80).']);
});

test('código: linhas e colunas, contadas como o navegador conta', () => {
  const codigo = Array.from({ length: 17 }, (_, k) => `x${k} = 1`).join('\n');
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">${codigo}</pre>`)), ['bloco com 17 linhas de código (máx. 16).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">x = "${'a'.repeat(70)}"</pre>`)), ['linha de código com 76 colunas (máx. 64).']);
  // codigoDoBloco tira as linhas vazias do começo e do fim: dezesseis linhas com quebras sobrando passam.
  const dezesseis = `\n\n${Array.from({ length: 16 }, (_, k) => `x${k} = 1`).join('\n')}\n\n`;
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<pre data-lang="python">${dezesseis}</pre>`)), []);
});

test('tabela: linhas de dados e colunas, contando colspan', () => {
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<table><tbody>${repetir('<tr><td>a</td></tr>', 9)}</tbody></table>`)),
    ['tabela com 9 linhas de dados (máx. 8).']);
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<table><tbody><tr>${repetir('<td>a</td>', 7)}</tr></tbody></table>`)),
    ['tabela com 7 colunas (máx. 6).']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<table><tbody><tr><td colspan="7">a</td></tr></tbody></table>')),
    ['tabela com 7 colunas (máx. 6).']);
  // O cabeçalho não é linha de dados.
  assert.deepEqual(mensagens(slide(`<h2>T</h2>\n<table><thead><tr><th>h</th></tr></thead><tbody>${repetir('<tr><td>a</td></tr>', 8)}</tbody></table>`)), []);
});

test('metadado longo demais', () => {
  assert.deepEqual(mensagens(aula('<section data-layout="capa"><h1>Capa</h1></section>').replace('content="Teste"', `content="${repetir('disciplina', 7)}"`)),
    ['a meta "disciplina" tem 76 caracteres (máx. 60).']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Rode: `node --test tests/unit/limites.test.mjs`
Espere: falha ao importar `validador/regras/limites.js`.

- [ ] **Step 3: Escrever as vinte regras**

Crie `validador/regras/limites.js`:

```js
// Regras de limite (spec 5.2, 5.3 e 9.2): o que cabe no slide, contado no fonte.
// Os números vêm todos de contrato.limites; o código só sabe contar.
import { onde, trechoDe, plural } from '../validar.js';
import { textoSemTex } from '../../componentes/tex.js';
import { codigoDoBloco } from '../../componentes/codigo.js';

// Fora da contagem de palavras (spec 5.3): TeX vira uma palavra, código e notas não contam.
const FORA_DA_CONTAGEM = 'pre, code, aside.notas';

// Segmentos de um título são os trechos entre <br> (spec 5.3), lidos pelo que aparece: o TeX conta
// pelo texto renderizado, não pelo fonte, senão \frac{1}{2} valeria doze caracteres.
export function segmentosDoTitulo(elemento) {
  if (!elemento) return [];
  const segmentos = [[]];
  for (const no of elemento.childNodes) {
    if (no.nodeType === 1 && no.nodeName === 'BR') segmentos.push([]);
    else segmentos.at(-1).push(no.textContent ?? '');
  }
  return segmentos.map((partes) => textoSemTex(partes.join('')).trim());
}

export function palavrasDe(elemento) {
  const copia = elemento.cloneNode(true);
  for (const fora of copia.querySelectorAll(FORA_DA_CONTAGEM)) fora.remove();
  return textoSemTex(copia.textContent).split(/\s+/).filter(Boolean).length;
}

function textoDe(elemento) {
  return textoSemTex(elemento.textContent).trim();
}

// Cada alvo de limite de comprimento: seletor, chave do limite e como a mensagem chama a coisa.
const COMPRIMENTOS = [
  ['limites.pergunta', 'p.pergunta', 'pergunta.caracteres', 'a pergunta'],
  ['limites.lide', 'p.lide', 'lide.caracteres', 'o lide'],
  ['limites.afirmacao', 'p.afirmacao', 'afirmacao.caracteres', 'a afirmação'],
  ['limites.fonte', 'p.fonte', 'fonte.caracteres', 'a fonte'],
  ['limites.legenda', 'figcaption', 'legenda.caracteres', 'a legenda'],
  ['limites.proxima', 'p.proxima', 'proxima.caracteres', 'a próxima aula'],
];

function* porComprimento(nome, seletor, chave, rotulo, { slides, contrato }) {
  const limite = contrato.limites[chave];
  for (const secao of slides) {
    for (const elemento of secao.querySelectorAll(seletor)) {
      const texto = textoDe(elemento);
      if (texto.length > limite) {
        yield { ...onde(slides, secao), mensagem: `${rotulo} tem ${texto.length} caracteres (máx. ${limite}).`, trecho: trechoDe(elemento) };
      }
    }
  }
}

// Título de cada layout: o seletor e as chaves de limite que valem para ele.
const TITULOS = {
  capa: { seletor: 'h1', porSegmento: 'capa.h1.caracteresPorSegmento', segmentos: 'capa.h1.segmentos' },
  abertura: { seletor: 'h2', porSegmento: 'abertura.h2.caracteresPorSegmento', segmentos: 'abertura.h2.segmentos' },
  outros: { seletor: 'h2', porSegmento: 'titulo.caracteresPorSegmento', segmentos: 'titulo.segmentos' },
};

function tituloDoSlide(secao) {
  const layout = secao.getAttribute('data-layout');
  const regra = TITULOS[layout] ?? TITULOS.outros;
  return { regra, elemento: secao.querySelector(`:scope > ${regra.seletor}`) };
}

export const regras = [
  {
    nome: 'limites.titulo',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        const { regra, elemento } = tituloDoSlide(secao);
        const limite = contrato.limites[regra.porSegmento];
        for (const segmento of segmentosDoTitulo(elemento)) {
          if (segmento.length > limite) {
            yield { ...onde(slides, secao), mensagem: `título com ${segmento.length} caracteres num segmento (máx. ${limite}).`, trecho: segmento };
          }
        }
      }
    },
  },
  {
    nome: 'limites.segmentos-titulo',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        const { regra, elemento } = tituloDoSlide(secao);
        const limite = contrato.limites[regra.segmentos];
        const quantos = segmentosDoTitulo(elemento).length;
        if (quantos > limite) {
          yield { ...onde(slides, secao), mensagem: `título em ${plural(quantos, 'segmento', 'segmentos')} (máx. ${limite}).`, trecho: trechoDe(elemento) };
        }
      }
    },
  },
  {
    nome: 'limites.nome-curto',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['abertura.dataCurto.caracteres'];
      for (const secao of slides) {
        const curto = secao.getAttribute('data-curto');
        if (curto !== null && curto.trim().length > limite) {
          yield { ...onde(slides, secao), mensagem: `data-curto com ${curto.trim().length} caracteres (máx. ${limite}).` };
        }
      }
    },
  },
  ...COMPRIMENTOS.map(([nome, seletor, chave, rotulo]) => ({
    nome,
    aplicar: (contexto) => porComprimento(nome, seletor, chave, rotulo, contexto),
  })),
  {
    nome: 'limites.palavras-corpo',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['corpo.palavras'];
      for (const secao of slides) {
        if (secao.getAttribute('data-layout') !== 'conteudo') continue;
        const palavras = palavrasDe(secao) - segmentosDoTitulo(tituloDoSlide(secao).elemento).join(' ').split(/\s+/).filter(Boolean).length;
        if (palavras > limite) {
          yield { ...onde(slides, secao), mensagem: `${plural(palavras, 'palavra', 'palavras')} no corpo (máx. ${limite}).` };
        }
      }
    },
  },
  {
    nome: 'limites.palavras-coluna',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['coluna.palavras'];
      for (const secao of slides) {
        for (const coluna of secao.querySelectorAll('div.colunas > div')) {
          const palavras = palavrasDe(coluna);
          if (palavras > limite) {
            yield { ...onde(slides, secao), mensagem: `${plural(palavras, 'palavra', 'palavras')} numa coluna (máx. ${limite}).`, trecho: trechoDe(coluna) };
          }
        }
      }
    },
  },
  {
    nome: 'limites.itens',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['lista.itens'];
      for (const secao of slides) {
        for (const lista of secao.querySelectorAll('ul, ol.passos')) {
          const itens = lista.querySelectorAll(':scope > li').length;
          if (itens > limite) {
            yield { ...onde(slides, secao), mensagem: `lista com ${plural(itens, 'item', 'itens')} (máx. ${limite}).`, trecho: trechoDe(lista) };
          }
        }
      }
    },
  },
  {
    nome: 'limites.destaques',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['destaque.maxPorSlide'];
      for (const secao of slides) {
        const quantos = secao.querySelectorAll('aside.destaque').length;
        if (quantos > limite) yield { ...onde(slides, secao), mensagem: `${plural(quantos, 'destaque', 'destaques')} no slide (máx. ${limite}).` };
      }
    },
  },
  {
    nome: 'limites.alertas',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['alerta.maxPorSlide'];
      for (const secao of slides) {
        const quantos = secao.querySelectorAll('aside.alerta').length;
        if (quantos > limite) yield { ...onde(slides, secao), mensagem: `${plural(quantos, 'alerta', 'alertas')} no slide (máx. ${limite}).` };
      }
    },
  },
  {
    nome: 'limites.rotulo',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['rotulo.caracteres'];
      for (const secao of slides) {
        for (const elemento of secao.querySelectorAll('[data-rotulo]')) {
          const rotulo = elemento.getAttribute('data-rotulo').trim();
          if (rotulo.length > limite) {
            yield { ...onde(slides, secao), mensagem: `rótulo com ${rotulo.length} caracteres (máx. ${limite}).`, trecho: trechoDe(elemento) };
          }
        }
      }
    },
  },
  {
    nome: 'limites.sintese',
    *aplicar({ slides, contrato }) {
      const maxItens = contrato.limites['sintese.itens'];
      const maxTexto = contrato.limites['sintese.caracteresPorItem'];
      for (const secao of slides) {
        for (const sintese of secao.querySelectorAll('ol.sintese')) {
          const itens = [...sintese.querySelectorAll(':scope > li')];
          if (itens.length > maxItens) {
            yield { ...onde(slides, secao), mensagem: `síntese com ${plural(itens.length, 'item', 'itens')} (máx. ${maxItens}).` };
          }
          for (const item of itens) {
            const texto = textoDe(item);
            if (texto.length > maxTexto) {
              yield { ...onde(slides, secao), mensagem: `item da síntese com ${texto.length} caracteres (máx. ${maxTexto}).`, trecho: trechoDe(item) };
            }
          }
        }
      }
    },
  },
  {
    nome: 'limites.codigo-linhas',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['codigo.linhas'];
      for (const secao of slides) {
        for (const pre of secao.querySelectorAll('pre')) {
          const linhas = codigoDoBloco(pre).split('\n').length;
          if (linhas > limite) {
            yield { ...onde(slides, secao), mensagem: `bloco com ${plural(linhas, 'linha', 'linhas')} de código (máx. ${limite}).` };
          }
        }
      }
    },
  },
  {
    nome: 'limites.codigo-colunas',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['codigo.colunas'];
      for (const secao of slides) {
        for (const pre of secao.querySelectorAll('pre')) {
          const maior = codigoDoBloco(pre).split('\n').reduce((maximo, linha) => Math.max(maximo, linha.length), 0);
          if (maior > limite) {
            yield { ...onde(slides, secao), mensagem: `linha de código com ${maior} colunas (máx. ${limite}).` };
          }
        }
      }
    },
  },
  {
    nome: 'limites.tabela',
    *aplicar({ slides, contrato }) {
      const maxLinhas = contrato.limites['tabela.linhasDeDados'];
      const maxColunas = contrato.limites['tabela.colunas'];
      for (const secao of slides) {
        for (const tabela of secao.querySelectorAll('table')) {
          const linhas = [...tabela.querySelectorAll('tr')];
          const dados = linhas.filter((linha) => !linha.closest('thead')).length;
          if (dados > maxLinhas) {
            yield { ...onde(slides, secao), mensagem: `tabela com ${plural(dados, 'linha', 'linhas')} de dados (máx. ${maxLinhas}).` };
          }
          // A largura é a maior linha, contando colspan: é o que ocupa coluna de verdade.
          const colunas = linhas.reduce((maximo, linha) => Math.max(maximo, [...linha.children]
            .reduce((soma, celula) => soma + (Number.parseInt(celula.getAttribute('colspan') ?? '1', 10) || 1), 0)), 0);
          if (colunas > maxColunas) {
            yield { ...onde(slides, secao), mensagem: `tabela com ${plural(colunas, 'coluna', 'colunas')} (máx. ${maxColunas}).` };
          }
        }
      }
    },
  },
  {
    nome: 'limites.metadado',
    *aplicar({ doc, contrato }) {
      for (const [nome, regra] of Object.entries(contrato.metadados)) {
        if (!regra.max) continue;
        const valor = doc.querySelector(`meta[name="${nome}"]`)?.getAttribute('content')?.trim() ?? '';
        if (valor.length > regra.max) {
          yield { mensagem: `a meta "${nome}" tem ${valor.length} caracteres (máx. ${regra.max}).` };
        }
      }
    },
  },
];
```

Acrescente ao registro, em `validador/regras/index.js`:

```js
import { regras as limites } from './limites.js';

export const REGRAS_ESTATICAS = [...estrutura, ...conteudo, ...vocabulario, ...limites];
```

- [ ] **Step 4: Rodar e ver passar**

Rode: `node --test tests/unit/limites.test.mjs` — 11 testes.
Rode: `npm test` — 248 (237 + 11).

- [ ] **Step 5: Escrever as vinte fixtures**

Mesmo molde da Task 1. Onde a tabela pede texto longo, escreva a palavra indicada repetida, separada por espaço — o teste da varredura confirma que a regra acusa.

| pasta | bom.html | ruim.html |
|---|---|---|
| `limites.titulo` | «slide: `<h2>Título curto</h2><p>C.</p>`» | «slide: `<h2>Um título bem longo que passa dos cinquenta caracteres previstos</h2><p>C.</p>`» |
| `limites.segmentos-titulo` | «slide: `<h2>Um<br>Dois</h2><p>C.</p>`» | «slide: `<h2>Um<br>Dois<br>Três</h2><p>C.</p>`» |
| `limites.nome-curto` | `<section data-layout="abertura" id="a" data-curto="Retro"><h2>Retropropagação</h2></section>` | o mesmo com `data-curto="Retropropagação"` |
| `limites.pergunta` | `<section data-layout="abertura" id="a"><h2>Um</h2><p class="pergunta">Cabe?</p></section>` | o mesmo com `pergunta` repetida 13 vezes |
| `limites.lide` | «slide: `<h2>T</h2><p class="lide">Lide.</p><p>C.</p>`» | o mesmo com `lide` repetida 31 vezes |
| `limites.palavras-corpo` | «slide: `<h2>T</h2><p>Corpo curto.</p>`» | «slide: `<h2>T</h2><p>` + `palavra` repetida 95 vezes + `</p>`» |
| `limites.palavras-coluna` | «slide: `<h2>T</h2><div class="colunas" data-grade="6-6"><div><p>A</p></div><div><p>B</p></div></div>`» | o mesmo com `palavra` repetida 61 vezes na primeira coluna |
| `limites.itens` | «slide: `<h2>T</h2><ul><li>Um.</li></ul>`» | o mesmo com cinco `<li>Item.</li>` a mais (seis no total) |
| `limites.destaques` | «slide: `<h2>T</h2><aside class="destaque">D.</aside>`» | o mesmo com três `aside.destaque` |
| `limites.alertas` | «slide: `<h2>T</h2><aside class="alerta">A.</aside>`» | o mesmo com dois `aside.alerta` |
| `limites.rotulo` | «slide: `<h2>T</h2><aside class="destaque" data-rotulo="Definição">D.</aside>`» | o mesmo com `rotulo` repetida 5 vezes no `data-rotulo` |
| `limites.afirmacao` | `<section data-layout="afirmacao" id="a"><p class="afirmacao">Cabe.</p></section>` | o mesmo com `afirmacao` repetida 14 vezes |
| `limites.fonte` | `<section data-layout="afirmacao" id="a"><p class="afirmacao">A.</p><p class="fonte">Fonte.</p></section>` | o mesmo com `fonte` repetida 17 vezes |
| `limites.legenda` | «slide: `<h2>T</h2><figure><img src="img/a.png" alt="a"><figcaption>Legenda.</figcaption></figure>`» | o mesmo com `legenda` repetida 21 vezes |
| `limites.sintese` | `<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>` | o mesmo com quatro `<li>Item.</li>` |
| `limites.proxima` | `<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol><p class="proxima">Próxima.</p></section>` | o mesmo com `proxima` repetida 13 vezes |
| `limites.codigo-linhas` | «slide: `<h2>T</h2><pre data-lang="python">` + 16 linhas `x0 = 1` … `x15 = 1` + `</pre>`» | o mesmo com 17 linhas |
| `limites.codigo-colunas` | «slide: `<h2>T</h2><pre data-lang="python">x = "aaaa"</pre>`» | o mesmo com 70 letras `a` dentro das aspas |
| `limites.tabela` | «slide: `<h2>T</h2><table><tbody><tr><td>a</td></tr></tbody></table>`» | o mesmo com nove linhas `<tr><td>a</td></tr>` |
| `limites.metadado` | «CABEÇA normal» + `<section data-layout="capa"><h1>Capa</h1></section>` | o mesmo com `disciplina` repetida 7 vezes na meta `disciplina` |

- [ ] **Step 6: Rodar e commitar**

Rode: `npm test` — 268 (248 + 20 pastas novas).

```bash
git add validador tests/unit/limites.test.mjs tests/fixtures/validador
git commit -m "$(cat <<'MSG'
feat(validador): os vinte limites de conteúdo do contrato

Cada número vem de contrato.limites; o código só conta. Título conta por
segmento e pelo texto que aparece, código conta com codigoDoBloco, e a
largura da tabela conta colspan.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: Matemática e recursos estáticos, e o andador de texto único

**Files:**
- Create: `validador/regras/recursos.js`, `tests/unit/recursos.test.mjs`
- Modify: `componentes/tex.js`, `contrato/contrato.json`, `validador/regras/index.js`, `tests/integracao/validador.test.mjs`
- Create: 5 pastas de fixture

**Interfaces:**
- Consumes: `contrato.proibidos.comandosTex`, `contrato.linguagens`.
- Produces: `textosDe(raiz)` em `componentes/tex.js` — todo nó de texto onde matemática pode existir, fora de `pre, code, script, style, textarea, svg, [data-tex]`. `textosComTex` passa a ser um filtro sobre ele, e o marco 4c usa o mesmo andador para as regras de carga.

- [ ] **Step 1: Um andador de texto, uma lista de exclusão**

Em `componentes/tex.js`, troque `textosComTex` por:

```js
// Todo nó de texto onde matemática pode existir: fora de código, script, SVG e do que já foi renderizado.
export function textosDe(raiz) {
  const nos = [];
  const andar = (no) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 3) nos.push(filho);
      else if (filho.nodeType === 1 && !filho.matches(FORA)) andar(filho);
    }
  };
  andar(raiz);
  return nos;
}

export function textosComTex(raiz) {
  return textosDe(raiz).filter((no) => no.nodeValue.includes('\\(') || no.nodeValue.includes('\\['));
}
```

Isto existe porque `matematica.cifrao-suspeito` precisa ver texto **sem** TeX: um parágrafo com `$x^2$` e nenhum `\(` nunca seria visitado pelo `textosComTex` de hoje. Duas varreduras com duas listas de exclusão divergem; uma lista, dois filtros, não.

Rode: `npm test` — 268, sem mudança. `renderizarTex` continua usando `textosComTex` e não muda de comportamento.

- [ ] **Step 2: As macros de cor do KaTeX entram no contrato**

A revisão do marco 3b registrou que `proibidos.comandosTex` não cobre `\red`, `\blue`, `\grayH` e companhia, que o KaTeX aceita e pintam de cor. Como são dezenas de variantes, entram como padrão, não como lista. Em `contrato/contrato.json`, dentro de `proibidos`, acrescente depois de `comandosTex`:

```json
    "comandosTexPorPadrao": ["\\\\(red|orange|yellow|green|blue|purple|pink|gray|grey|teal|gold|maroon|mint)[A-H]?(?![a-zA-Z])"],
```

Medido: pega `\redA{x}`, `\blue{y}` e `\grayH{z}`; deixa passar `\reduce{x}`, `\greenish`, `\frac{1}{2}` e `\text{red}`.

- [ ] **Step 3: Escrever o teste, que falha**

Crie `tests/unit/recursos.test.mjs`:

```js
// Matemática e recursos que dá para conferir no fonte (spec 9.2), sem carregar KaTeX nem imagem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar } from '../../validador/validar.js';
import { regras as recursos } from '../../validador/regras/recursos.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>`;

const slide = (dentro) => `${CABECA}\n<section data-layout="conteudo" id="a">\n${dentro}\n</section>\n</body></html>`;

function mensagens(html) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras: recursos, grupo: 'estatica' }).map((achado) => achado.mensagem);
}

test('TeX limpo não acusa nada', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Seja \\(x^2 + y^2 = r^2\\).</p>')), []);
});

test('comando de cor e de estilo no TeX', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\textcolor{red}{x}\\).</p>')), ['comando proibido no TeX: \\textcolor.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\htmlData{passo=1}{x}\\).</p>')), ['comando proibido no TeX: \\htmlData.']);
});

// \color não pode pegar \colorbox duas vezes, nem \red pegar \reduce.
test('a fronteira do nome do comando é respeitada', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\colorbox{red}{x}\\).</p>')), ['comando proibido no TeX: \\colorbox.']);
});

test('as macros de cor do KaTeX, que o contrato pega por padrão', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\redA{x}\\).</p>')), ['comando de cor no TeX: \\redA.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\blue{x}\\).</p>')), ['comando de cor no TeX: \\blue.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\text{red}\\).</p>')), []);
});

test('o passo continua valendo: \\passo não é comando proibido', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Veja \\(\\passo{1}{x}\\).</p>')), []);
});

test('cifrão suspeito é aviso; dinheiro não é', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Considere $x^2 + y^2$ no plano.</p>')), ['"$x^2 + y^2$" parece matemática entre cifrões.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>O preço é $100 e o desconto é $20.</p>')), []);
});

// A lição do marco 4a: matemática dentro de pre nunca é renderizada, então nunca é acusada.
test('TeX dentro de pre e de code é exemplo, não matemática', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<pre data-lang="latex">\\(\\textcolor{red}{x}\\)</pre>')), []);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<p>Escreva <code>$x^2$</code> assim.</p>')), []);
});

test('imagem sem alt, imagem de fora e linguagem fora da lista', () => {
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><img src="img/a.png"></figure>')), ['imagem sem alt.']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<figure><img src="https://exemplo.org/a.png" alt="a"></figure>')),
    ['imagem de fora: "https://exemplo.org/a.png".']);
  assert.deepEqual(mensagens(slide('<h2>T</h2>\n<pre data-lang="cobol">MOVE X TO Y.</pre>')),
    ['linguagem fora da lista em data-lang: "cobol".']);
});
```

- [ ] **Step 4: Escrever as cinco regras**

Crie `validador/regras/recursos.js`:

```js
// Regras estáticas de matemática e de recursos (spec 9.2): o que dá para conferir no fonte, sem
// carregar KaTeX, imagem nem script. O que precisa de carga fica para o marco 4c.
import { onde, trechoDe } from '../validar.js';
import { segmentosDeTex, textosComTex, textosDe } from '../../componentes/tex.js';

// $…$ com barra, expoente ou índice quase sempre é matemática escrita com o delimitador errado.
const CIFRAO_SUSPEITO = /\$[^$\n]*[\\^_][^$\n]*\$/;

function* segmentosDaSecao(secao) {
  for (const no of textosComTex(secao)) {
    for (const segmento of segmentosDeTex(no.data)) {
      if (segmento.tipo !== 'texto') yield segmento;
    }
  }
}

export const regras = [
  {
    nome: 'matematica.comando-proibido',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const segmento of segmentosDaSecao(secao)) {
          for (const comando of contrato.proibidos.comandosTex) {
            // \color pega \colorbox por prefixo, então a fronteira é o fim do nome do comando.
            if (!new RegExp(`${comando.replace('\\', '\\\\')}(?![a-zA-Z])`).test(segmento.tex)) continue;
            yield {
              ...onde(slides, secao),
              mensagem: `comando proibido no TeX: ${comando}.`,
              trecho: segmento.trecho,
            };
          }
        }
      }
    },
  },
  {
    nome: 'matematica.cifrao-suspeito',
    *aplicar({ slides }) {
      for (const secao of slides) {
        for (const no of textosDe(secao)) {
          // Só o texto que sobra fora do TeX: cifrão dentro de \( … \) é cifrão mesmo.
          const fora = segmentosDeTex(no.data).filter((s) => s.tipo === 'texto').map((s) => s.texto).join(' ');
          const achado = CIFRAO_SUSPEITO.exec(fora);
          if (achado) yield { ...onde(slides, secao), mensagem: `"${achado[0]}" parece matemática entre cifrões.`, trecho: achado[0] };
        }
      }
    },
  },
  {
    nome: 'recursos.alt',
    *aplicar({ slides }) {
      for (const secao of slides) {
        for (const imagem of secao.querySelectorAll('img')) {
          if (!imagem.hasAttribute('alt')) {
            yield { ...onde(slides, secao), mensagem: 'imagem sem alt.', trecho: trechoDe(imagem) };
          }
        }
      }
    },
  },
  {
    nome: 'recursos.imagem-externa',
    *aplicar({ slides }) {
      for (const secao of slides) {
        for (const imagem of secao.querySelectorAll('img[src^="https://"]')) {
          yield { ...onde(slides, secao), mensagem: `imagem de fora: "${imagem.getAttribute('src')}".`, trecho: trechoDe(imagem) };
        }
      }
    },
  },
  {
    nome: 'recursos.linguagem',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const pre of secao.querySelectorAll('pre[data-lang]')) {
          const linguagem = pre.getAttribute('data-lang');
          if (!contrato.linguagens.includes(linguagem)) {
            yield { ...onde(slides, secao), mensagem: `linguagem fora da lista em data-lang: "${linguagem}".`, trecho: trechoDe(pre) };
          }
        }
      }
    },
  },
];
```

O trecho que lê `comandosTexPorPadrao` entra em `matematica.comando-proibido`, depois do laço dos comandos exatos:

```js
          for (const padrao of contrato.proibidos.comandosTexPorPadrao ?? []) {
            const achado = new RegExp(padrao).exec(segmento.tex);
            if (achado) {
              yield { ...onde(slides, secao), mensagem: `comando de cor no TeX: ${achado[0]}.`, trecho: segmento.trecho };
            }
          }
```

Acrescente ao registro, em `validador/regras/index.js`:

```js
import { regras as recursos } from './recursos.js';

export const REGRAS_ESTATICAS = [...estrutura, ...conteudo, ...vocabulario, ...limites, ...recursos];
```

- [ ] **Step 5: Rodar e ver passar**

Rode: `node --test tests/unit/recursos.test.mjs` — 8 testes.
Rode: `npm test` — 276 (268 + 8).

- [ ] **Step 6: Escrever as cinco fixtures**

| pasta | bom.html | ruim.html |
|---|---|---|
| `matematica.comando-proibido` | «slide: `<h2>T</h2><p>Seja \(x^2\).</p>`» | «slide: `<h2>T</h2><p>Seja \(\textcolor{red}{x}\).</p>`» |
| `matematica.cifrao-suspeito` | «slide: `<h2>T</h2><p>O preço é $100.</p>`» | «slide: `<h2>T</h2><p>Considere $x^2 + y^2$ no plano.</p>`» |
| `recursos.alt` | «slide: `<h2>T</h2><figure><img src="img/a.png" alt="Um gráfico."></figure>`» | o mesmo sem o `alt` |
| `recursos.imagem-externa` | «slide: `<h2>T</h2><figure><img src="img/a.png" alt="a"></figure>`» | o mesmo com `src="https://exemplo.org/a.png"` |
| `recursos.linguagem` | «slide: `<h2>T</h2><pre data-lang="python">x = 1</pre>`» | o mesmo com `data-lang="cobol"` |

- [ ] **Step 7: O espécime continua limpo**

O espécime é a prova de que as 46 regras convivem. Rode a CLI:

```bash
node bin/aula-usp.mjs validar especime/
```

Espere: `Validador Aula USP: 0 erros, 0 avisos`, saída 0. Rode também, um por vez, cada deck: `componentes.html`, `matematica.html`, `codigo.html`, `ifusp.html` e `muitos-blocos.html` — os quatro primeiros sem nada, o último com os dez avisos de sempre (`estrutura.blocos` e nove de `estrutura.id-ausente`).

Se algum deck acusar, **não conserte a regra para o espécime passar**: descubra qual dos dois está errado e diga no relatório. Uma regra que o espécime viola é ou um defeito da regra, ou um defeito do espécime que o marco 4b acabou de revelar.

Acrescente a `tests/integracao/validador.test.mjs` a asserção correspondente:

```js
test('cada deck do espécime valida com o que a spec espera', () => {
  const limpos = ['componentes', 'matematica', 'codigo', 'ifusp'];
  for (const nome of limpos) {
    const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, `especime/${nome}.html`)], { encoding: 'utf8' });
    assert.match(saida, /^Validador Aula USP: 0 erros, 0 avisos$/m, `${nome}.html deveria estar limpo`);
  }
  const muitos = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime/muitos-blocos.html')], { encoding: 'utf8' });
  assert.match(muitos, /^Validador Aula USP: 0 erros, 10 avisos$/m);
});
```

- [ ] **Step 8: Rodar tudo e commitar**

Rode: `npm test` — 281 (276 + 5 pastas de fixture). O teste de integração conta à parte.
Rode, um comando por arquivo: `node --test tests/integracao/validador.test.mjs` (3) e, porque `componentes/tex.js` mudou, `node --test tests/integracao/matematica.test.mjs` (6) e `node --test tests/unit/tex.test.mjs`.

```bash
git add validador componentes/tex.js contrato/contrato.json tests
git commit -m "$(cat <<'MSG'
feat(validador): matemática e recursos que se conferem no fonte

Um andador de texto só, com uma lista de exclusão só: o cifrão suspeito
precisa ver texto sem TeX, que o textosComTex não visitava. As macros de cor
do KaTeX entram no contrato como padrão, porque são dezenas de variantes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Achado durante a execução

O `linkedom` devolve `nodeName` em caixa alta **também dentro de SVG**, enquanto o contrato escreve
`foreignObject`, `clipPath`, `linearGradient` e `radialGradient` na caixa do DOM. Comparar o nome em
minúsculas contra essas listas com `includes()` nunca casa, e um `<foreignObject>` passava batido. A
correção é um casamento insensível a caixa que devolve **a grafia do contrato**, para a mensagem sair
com o nome que o autor escreveu. Vale para qualquer regra futura que compare nome de elemento com lista
do contrato — o marco 4c herda o cuidado.

## Decisões tomadas neste plano

1. **`matematica.simbolo-fora-do-tex` fica para o marco 5**, com a gêmea `saida.glifo-ausente`, porque as duas leem `validador/cobertura.json`, que a spec 9.3 define como fonte única e que `aula-usp dist` gera.
2. **O registro de regras sai de `build/` para `validador/regras/index.js`** e o contexto de `validar` passa a repassar o que vier a mais. É o que a revisão final do marco 4a pediu como primeiro item, e é mais barato agora do que no meio do 4c.
3. **Uma regra, um dono.** `data-lang` é de `recursos.linguagem`; elemento fora do vocabulário não tem os atributos enumerados. Sem isso, um erro só vira duas ou quatro mensagens, e o autor perde a confiança nas duas.
4. **A `section` é varrida como qualquer elemento** pelas regras de vocabulário — os atributos dela são do autor. Só o nome dela escapa, porque quem confere o layout é `estrutura.layout`.
5. **O próprio `<svg>` conta como SVG** para atributos e cores, embora esteja nas duas listas de elementos.
6. **As macros de cor do KaTeX entram no contrato como padrão** (`comandosTexPorPadrao`), não como lista: são dezenas de variantes graduadas.
7. **O título conta pelo texto renderizado** quando tem TeX, com `textoSemTex` — é o que a revisão do marco 3b pediu.
8. **A largura da tabela conta `colspan`**, porque é o que ocupa coluna de verdade.
9. **`limites.codigo-linhas` e `codigo-colunas` contam com `codigoDoBloco`**, a mesma função que o navegador e o build usam, para a contagem bater com o que aparece.

## O que o marco 4c herda

- O grupo de carga (`matematica.tex-invalido`, `recursos.imagem`, `recursos.demo-sem-registro`, `recursos.demo-sem-estatico`) e o de composição (`composicao.*`), com os três cuidados já medidos nos marcos anteriores: dispor todos os slides antes de medir, porque as fontes do KaTeX carregam preguiçosamente; medir transbordo de código com `scrollWidth > clientWidth`; e resolver a tensão de `composicao.tamanho-minimo` com `code` dentro de `figcaption` (15,84 px contra o mínimo de 20 px) e com `.tex-invalido` (20 a 21 px).
- O painel do navegador (tecla V, botão "copiar para o chat", abre sozinho só com erros e fora de tela cheia), com os erros de `renderizarTex` e `renderizarCodigo` roteados para ele.
- O passo 3 da spec 3.2: guardar a cópia do corpo antes de `montar` e rodar as regras estáticas sobre ela — agora possível, porque o registro é ES module puro.
- `segmentosDoTitulo` e `palavrasDe` deste marco, que as regras de composição reusam.
- Os dez itens Minor adiados na revisão final do marco 4a, listados em `docs/superpowers/revisoes/2026-09-18-aula-usp-m4a-revisao-final.md`.
