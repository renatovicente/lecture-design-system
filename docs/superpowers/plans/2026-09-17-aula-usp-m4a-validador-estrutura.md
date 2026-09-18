# Marco 4a do Aula USP: núcleo do validador e regras de estrutura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar ao Aula USP um validador que roda o contrato sobre o fonte da aula, com as treze regras de `estrutura`, mensagens no formato da spec 9.1, e o comando `aula-usp validar <pasta> [--json]` com os códigos de saída da spec 8.1.

**Architecture:** `validador/validar.js` é o motor: recebe o documento, o contrato e a lista de regras, roda as de um grupo (`estatica`, `carga`, `composicao`, `saida`) e devolve achados em ordem estável. Cada regra é um objeto `{ nome, aplicar(contexto) }` que só descreve a verificação — severidade, grupo, fase e ação vêm de `contrato.regras`, nunca do código. `validador/sequencia.js` casa o conteúdo de um elemento com a sequência do contrato, tratando a equação em destaque (texto solto `\[ … \]`) como bloco de corpo. `validador/` não importa nada de Node, porque o mesmo código roda no navegador no marco 4c; a cola de Node (ler arquivo, `linkedom`, contrato, unidades) fica em `build/validar.mjs`, e a CLI em `bin/aula-usp.mjs`.

**Tech Stack:** Node ≥20.6, ES modules, `node:test`, `linkedom` (já instalado), `playwright-core` + Chrome instalado (já instalado). Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 5.2, 5.3, 5.5, 5.6, 8.1, 9.1, 9.2, 9.3 e 11.1).

## Global Constraints

Valem para todas as tarefas; os valores estão copiados da spec e do contrato, sem reinterpretação.

- **Mensagem (spec 9.1):** `ERRO · slide 7 #culpa · limites.titulo · título com 62 caracteres num segmento (máx. 50). Corte ou divida em dois slides.` Severidade em caixa alta, `slide N` com o `#id` quando houver, nome da regra, problema e ação, com o trecho quando houver. Achado que não é de um slide escreve `aula` no lugar de `slide N`.
- **`--json` (spec 9.1):** a mesma lista como objetos `{ severidade, slide, id, regra, mensagem, acao, trecho }`.
- **Cabeçalho do painel (spec 9.1):** `Validador Aula USP: N erros, M avisos`.
- **Severidade e ação vêm do contrato** (`contrato.regras.<nome>.{severidade, grupo, fase, acao}`, spec 5.6). Nenhum texto de ação e nenhuma severidade escritos no código das regras.
- **Grupos (spec 9.3):** as regras `estatica` rodam sobre **o fonte**, sem cromo e sem HTML renderizado — no navegador, sobre a cópia do corpo guardada antes de `montar`; no build, sobre o arquivo lido. Este plano só entrega o grupo `estatica`.
- **`validador/` é ES module sem Node** (spec 3.5): nada de `node:fs`, `node:path`, `process`. Só API padrão do DOM.
- **`normalize()` antes de varrer texto:** o `linkedom` 0.18.13 parte o texto em cada referência de caractere (`&lt;`, `&amp;`), e o Chrome não. `validar()` chama `doc.body.normalize()` uma vez, antes de qualquer regra.
- **Códigos de saída (spec 8.1):** 0 sem erros (avisos permitidos), 1 com erros de validação, 2 com falha de ambiente (arquivo ou dependência ausente).
- **Idioma:** mensagens do validador sempre em português (spec 13 põe mensagens em inglês fora de escopo). Comentários e nomes de identificador em português, como no resto do repositório.
- **Commits:** mensagem em português, no formato `tipo(escopo): frase no imperativo`, terminando com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Um commit por passo de commit do plano.
- **Testes:** `node --test tests/unit/*.test.mjs` (unitários) e um arquivo por vez em `tests/integracao/` (o Chrome de verdade). Ao final deste plano: 156 unitários viram pelo menos 178, e os 73 de integração continuam passando.

## Por que o marco 4 vem em três planos

O marco 4 da spec 12 é "regras estáticas, de carga e de composição da fase 1, painel do navegador, `validar` e `--json`, fixtures": 56 regras de fase 1 (47 estáticas, 4 de carga, 5 de composição). É grande demais para um plano só, como o marco 2 e o marco 3 já foram.

| plano | entrega | regras |
|---|---|---|
| **4a (este)** | núcleo, casador de sequência, CLI `validar`, fixtures | `estrutura.*` (13) |
| 4b | vocabulário, limites e matemática estática | `vocabulario.*` (8), `limites.*` (20), `matematica.comando-proibido`, `matematica.simbolo-fora-do-tex`, `matematica.cifrao-suspeito`, `recursos.alt`, `recursos.imagem-externa`, `recursos.linguagem` |
| 4c | grupos de carga e de composição, painel do navegador (tecla V) | `matematica.tex-invalido`, `recursos.imagem`, `recursos.demo-sem-registro`, `recursos.demo-sem-estatico`, `composicao.*` (5) |

Cada plano fecha com o espécime validando sem erro no que aquele plano cobre.

## O que já está verificado

Todo o código deste plano foi escrito e rodado numa cópia de rascunho do repositório, sobre o conteúdo real do espécime. O que a sondagem mostrou:

1. **As seis aulas do espécime passam sem nenhum erro** nas treze regras (`codigo.html`, `componentes.html`, `ifusp.html`, `index.html`, `matematica.html`, `muitos-blocos.html`). Os avisos são os esperados e estão fixados como expectativa nos testes: `estrutura.notas-ausentes` onde faltam notas, e, só em `muitos-blocos.html`, `estrutura.blocos` (nove blocos, que é o que aquele deck existe para exercer) e `estrutura.id-ausente` (aberturas sem id, que exercem a geração de id do `montar`).
2. **A equação em destaque é um nó de texto solto.** Em `especime/matematica.html:35`, `\[ E(w) = … \]` é filho direto da `section`, sem elemento nenhum. É por isso que `contrato.blocosDeCorpo` lista `tex-destaque`: o casador precisa tratar segmentos de texto como itens, não só `children`.
3. **Um grupo engole o que uma entrada anterior nomeia.** Como `p` está em `blocosDeCorpo`, um `p.lide` escrito depois do corpo casava como bloco comum e passava. A correção, verificada: uma entrada de grupo não casa item que outra entrada da mesma sequência nomeia — aí o `p.lide` deslocado vira `estrutura.fora-do-layout` com "fora de ordem".
4. **`tbody` implícito deixa de ser assimetria.** O parser do navegador cria `tbody`; o do `linkedom`, não (achado da revisão do marco 3a). Aceitar `tr` direto dentro de `table` faz os dois modos darem a mesma resposta; verificado com `<table><tr>…` e `<table><tbody><tr>…`, ambos sem erro.
5. **`\passo{n}` no TeX do fonte conta como passo numerado.** Sem ler o TeX, um slide com `<p data-passo>` e `\passo{1}{…}` passava batido. Verificado: agora acusa.
6. **O `linkedom` aceita `:not()` com lista** (`p:not(.lide, .pergunta)`) e `:scope > aside.notas`, os dois seletores de que as regras precisam.
7. **Fixture precisa ser documento inteiro.** `parseHTML('<body>…</body>')` faz do `<body>` o `documentElement` e deixa `document.body` vazio: as regras não veem slide nenhum. Por isso toda fixture deste plano traz `<!DOCTYPE html><html><head>…`, e o teste monta as aulas de exemplo com o mesmo molde.

O plano inteiro foi ensaiado numa cópia limpa: os arquivos abaixo foram escritos como estão aqui e rodados. Resultado do ensaio: **197 unitários** (156 de hoje + 33 de `validador.test.mjs` + 8 de `validar-cli.test.mjs`) e a integração intacta, com os 2 testes novos — painéis, apresentador, impressão, layouts, código, motor e demos rodados de novo depois de mexer no espécime.

Mutações rodadas na sondagem, todas pegas pela regra certa: conteúdo sem `h2`; lide depois do corpo; conteúdo sem bloco de corpo; elemento fora do vocabulário do layout; `h1` fora da capa; texto solto no slide; `figure` com `img` e `svg`; `figure` sem nenhum dos dois; coluna a mais na grade; filho de coluna que não é bloco; exercício sem enunciado; `ul` com filho que não é `li`; aula sem capa; layout inventado; `section` sem `data-layout`; id repetido; data fora do ISO; unidade desconhecida; meta ausente; uma abertura só; abertura longa sem `data-curto`; passos mistos por atributo; passos mistos por `\passo` no TeX. Passam sem acusação, de propósito: `tbody` explícito ou implícito, notas no meio do slide, `figcaption` antes da imagem (o contrato não fixa ordem dentro de `figure`), e equação em destaque como único bloco de corpo.

## Estrutura de arquivos

```
validador/validar.js          motor: contexto, ordem, formato da mensagem e do JSON   (Task 1, novo)
validador/regras/estrutura.js onze regras que não precisam do casador                 (Task 1, novo)
validador/sequencia.js        itens do conteúdo e casamento com a sequência            (Task 2, novo)
validador/regras/conteudo.js  estrutura.obrigatorio e estrutura.fora-do-layout         (Task 2, novo)
build/validar.mjs             cola de Node: lê o arquivo, o contrato e as unidades     (Task 3, novo)
bin/aula-usp.mjs              ganha o comando validar, com --json                      (Task 3)
especime/*.html               notas do apresentador onde faltavam                      (Task 3)
tests/unit/validador.test.mjs núcleo, regras e a varredura das fixtures                (Task 1-2)
tests/unit/validar-cli.test.mjs  a cola de Node e os códigos de saída                  (Task 3)
tests/fixtures/validador/<regra>/{bom,ruim}.html   uma pasta por regra (spec 11.1)     (Task 1-2)
tests/integracao/validador.test.mjs  a CLI sobre o espécime, com o Chrome fora         (Task 3)
```

---

### Task 1: Núcleo do validador e as onze regras diretas de estrutura

**Files:**
- Create: `validador/validar.js`
- Create: `validador/regras/estrutura.js`
- Create: `tests/unit/validador.test.mjs`
- Create: `tests/fixtures/validador/<regra>/bom.html` e `ruim.html` para as onze regras desta tarefa

**Interfaces:**
- Consumes: `contrato/contrato.json` (`regras`, `metadados`, `layouts`, `grades`, `limites`), `montar/blocos.js` → `textoDeTitulo(elemento) → string`, `componentes/tex.js` → `segmentosDeTex(texto) → [{ tipo, texto|tex, trecho }]`, `assets/marcas/unidades.json`.
- Produces (usado pelas Tasks 2 e 3, pelo M4b e pelo M4c):
  - `validar(doc, { contrato, regras, grupo, unidades, fase }) → Achado[]`, com `Achado = { severidade, slide, id, regra, mensagem, acao, trecho }`;
  - `slidesDoFonte(corpo) → Element[]`, `onde(slides, secao) → { slide, id }`, `trechoDe(elemento, limite) → string`, `encurtar(texto, limite) → string`;
  - `linhaDe(achado) → string`, `contar(achados) → { erros, avisos }`, `cabecalhoDe(achados) → string`;
  - `regras` de `validador/regras/estrutura.js`: array de `{ nome, aplicar(contexto) }`, onde `contexto = { doc, slides, contrato, unidades }` e `aplicar` devolve um iterável de `{ slide?, id?, mensagem, trecho? }`.

- [ ] **Step 1: Escrever o teste do núcleo, que falha**

Crie `tests/unit/validador.test.mjs`:

```js
// Núcleo do validador (spec 9.1 e 9.3) e as regras de estrutura (spec 9.2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar, linhaDe, contar, cabecalhoDe, slidesDoFonte } from '../../validador/validar.js';
import { regras as estrutura } from '../../validador/regras/estrutura.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));
const unidades = JSON.parse(readFileSync(new URL('assets/marcas/unidades.json', RAIZ), 'utf8'));

// O mesmo molde das fixtures: o linkedom só enche document.body num documento inteiro.
const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>`;

const aula = (corpo) => `${CABECA}\n${corpo}\n</body></html>`;

const BASE = aula(`<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="abertura" id="bloco-um"><h2>Um</h2></section>
<section data-layout="conteudo" id="conteudo">
  <h2>Título</h2>
  <p class="lide">Lide.</p>
  <p>Corpo.</p>
  <aside class="notas">Notas.</aside>
</section>
<section data-layout="abertura" id="bloco-dois"><h2>Dois</h2></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>`);

function rodar(html, regras = estrutura) {
  const { document } = parseHTML(html);
  return validar(document, { contrato, regras, grupo: 'estatica', unidades });
}

test('a aula de base não tem erro nenhum', () => {
  assert.deepEqual(rodar(BASE).filter((a) => a.severidade === 'erro'), []);
});

test('o achado sai no formato da spec 9.1', () => {
  const [achado] = rodar(BASE.replace('<h2>Um</h2>', '<h2>Retropropagação</h2>'))
    .filter((a) => a.regra === 'estrutura.nome-curto');
  assert.equal(achado.severidade, 'erro');
  assert.equal(achado.slide, 2);
  assert.equal(achado.id, 'bloco-um');
  assert.equal(achado.acao, contrato.regras['estrutura.nome-curto'].acao);
  assert.equal(
    linhaDe(achado),
    'ERRO · slide 2 #bloco-um · estrutura.nome-curto · abertura com título de 15 caracteres (máx. 10) e sem data-curto. '
    + 'Acrescente à abertura data-curto com até 10 caracteres.',
  );
});

test('achado que não é de um slide escreve "aula" no lugar do número', () => {
  const [achado] = rodar(BASE.replace('<meta name="professor" content="Prof.">', ''));
  assert.equal(achado.slide, null);
  assert.ok(linhaDe(achado).startsWith('ERRO · aula · estrutura.metadados · falta a meta "professor" no <head>.'));
});

test('o trecho entra numa segunda linha, recuado', () => {
  const linha = linhaDe({ severidade: 'aviso', slide: 3, id: null, regra: 'r', mensagem: 'm.', acao: 'a.', trecho: '<p>x</p>' });
  assert.equal(linha, 'AVISO · slide 3 · r · m. a.\n    <p>x</p>');
});

test('os achados saem em ordem de slide, e o da aula vem antes', () => {
  const achados = rodar(BASE.replace('content="2026-09-17"', 'content="17/09/2026"').replace('<h2>Um</h2>', '<h2>Retropropagação</h2>'));
  assert.deepEqual(achados.map((a) => a.slide), [null, 2]);
});

test('contar e cabecalhoDe usam singular e plural', () => {
  const achados = [{ severidade: 'erro' }, { severidade: 'aviso' }, { severidade: 'aviso' }];
  assert.deepEqual(contar(achados), { erros: 1, avisos: 2 });
  assert.equal(cabecalhoDe(achados), 'Validador Aula USP: 1 erro, 2 avisos');
  assert.equal(cabecalhoDe([]), 'Validador Aula USP: 0 erros, 0 avisos');
});

test('o slide do fonte é a section filha do corpo, com data-layout ou sem', () => {
  const { document } = parseHTML(aula('<section id="a"></section><div><section id="dentro"></section></div><section></section>'));
  assert.deepEqual(slidesDoFonte(document.body).map((s) => s.getAttribute('id')), ['a', null]);
});

test('uma regra de outro grupo não roda', () => {
  const marcada = [{ nome: 'composicao.transbordo', *aplicar() { yield { mensagem: 'não deveria rodar.' }; } }];
  assert.deepEqual(rodar(BASE, marcada), []);
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Rode: `node --test tests/unit/validador.test.mjs`
Espere: falha ao importar, `Cannot find module '.../validador/validar.js'`.

- [ ] **Step 3: Escrever o núcleo**

Crie `validador/validar.js`:

```js
// Validador (spec 9): roda as regras do contrato sobre o fonte da aula e devolve os achados em ordem estável.
// Só API padrão do DOM, para o mesmo módulo rodar no navegador (marco 4c) e no build, sobre o linkedom.

const CAIXA = { erro: 'ERRO', aviso: 'AVISO' };

// O fonte pode ter section sem data-layout: o montar a ignora, e o validador a acusa (estrutura.layout).
export function slidesDoFonte(corpo) {
  return [...corpo.children].filter((el) => el.nodeName === 'SECTION');
}

// Onde o achado aconteceu: o número do slide, contado no documento, e o id do autor, quando houver.
export function onde(slides, secao) {
  const indice = slides.indexOf(secao);
  return { slide: indice < 0 ? null : indice + 1, id: secao.getAttribute('id') || null };
}

export function encurtar(texto, limite = 80) {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1)}…`;
}

// Trecho do fonte numa linha só, para a mensagem apontar o lugar sem despejar o slide inteiro.
export function trechoDe(elemento, limite = 80) {
  return encurtar(elemento.outerHTML ?? '', limite);
}

export function validar(doc, { contrato, regras, grupo, unidades = null, fase = 1 }) {
  doc.body.normalize(); // o linkedom parte o texto em cada entidade; sem juntar, o TeX do fonte não é achado
  const slides = slidesDoFonte(doc.body);
  const contexto = { doc, slides, contrato, unidades };
  const achados = [];
  regras.forEach((regra, ordem) => {
    const definicao = contrato.regras[regra.nome];
    if (!definicao || definicao.grupo !== grupo || definicao.fase > fase) return;
    for (const achado of regra.aplicar(contexto)) {
      achados.push({
        severidade: definicao.severidade,
        slide: achado.slide ?? null,
        id: achado.id ?? null,
        regra: regra.nome,
        mensagem: achado.mensagem,
        acao: definicao.acao,
        trecho: achado.trecho ?? null,
        ordem,
      });
    }
  });
  // Ordem estável: o que é da aula inteira vem primeiro, depois por slide, e dentro do slide na ordem das regras.
  achados.sort((a, b) => (a.slide ?? 0) - (b.slide ?? 0) || a.ordem - b.ordem);
  return achados.map(({ ordem, ...achado }) => achado);
}

export function linhaDe({ severidade, slide, id, regra, mensagem, acao, trecho }) {
  const lugar = slide === null ? 'aula' : `slide ${slide}${id ? ` #${id}` : ''}`;
  const cabeca = `${CAIXA[severidade]} · ${lugar} · ${regra} · ${mensagem} ${acao}`;
  return trecho ? `${cabeca}\n    ${trecho}` : cabeca;
}

export function contar(achados) {
  const erros = achados.filter((achado) => achado.severidade === 'erro').length;
  return { erros, avisos: achados.length - erros };
}

export function cabecalhoDe(achados) {
  const { erros, avisos } = contar(achados);
  return `Validador Aula USP: ${plural(erros, 'erro', 'erros')}, ${plural(avisos, 'aviso', 'avisos')}`;
}

export function plural(quantos, um, muitos) {
  return `${quantos} ${quantos === 1 ? um : muitos}`;
}
```

- [ ] **Step 4: Rodar o teste e ver falhar por falta das regras**

Rode: `node --test tests/unit/validador.test.mjs`
Espere: falha ao importar `validador/regras/estrutura.js`.

- [ ] **Step 5: Escrever as onze regras**

Crie `validador/regras/estrutura.js`:

```js
// Regras de estrutura (spec 9.2): a aula tem capa e encerramento, cada slide tem um layout do contrato,
// os ids são únicos e nenhum slide mistura passos numerados com passos sem número.
import { onde, trechoDe, plural } from '../validar.js';
import { textoDeTitulo } from '../../montar/blocos.js';
import { segmentosDeTex } from '../../componentes/tex.js';

const COM_NOTAS = ['conteudo', 'afirmacao', 'figura', 'demo'];
const SEM_ID = ['capa', 'encerramento'];
const PASSO_NO_TEX = /\\passo\s*\{/g;
const DATA_ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function nomeDoLayout(secao) {
  const layout = secao.getAttribute('data-layout');
  return layout ? `"${layout}"` : 'uma section sem data-layout';
}

export const regras = [
  {
    nome: 'estrutura.primeiro-slide',
    *aplicar({ slides }) {
      if (slides.length === 0) {
        yield { mensagem: 'a aula não tem nenhuma section.' };
        return;
      }
      if (slides[0].getAttribute('data-layout') !== 'capa') {
        yield { ...onde(slides, slides[0]), mensagem: `a aula começa com ${nomeDoLayout(slides[0])}, não com capa.` };
      }
    },
  },
  {
    nome: 'estrutura.ultimo-slide',
    *aplicar({ slides }) {
      const ultimo = slides.at(-1);
      if (ultimo && ultimo.getAttribute('data-layout') !== 'encerramento') {
        yield { ...onde(slides, ultimo), mensagem: `a aula termina com ${nomeDoLayout(ultimo)}, não com encerramento.` };
      }
    },
  },
  {
    nome: 'estrutura.layout',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        const layout = secao.getAttribute('data-layout');
        if (layout === null) yield { ...onde(slides, secao), mensagem: 'section sem data-layout.', trecho: trechoDe(secao) };
        else if (!Object.hasOwn(contrato.layouts, layout)) {
          yield { ...onde(slides, secao), mensagem: `data-layout "${layout}" não existe no contrato.` };
        }
      }
    },
  },
  {
    nome: 'estrutura.metadados',
    *aplicar({ doc, contrato, unidades }) {
      for (const [nome, regra] of Object.entries(contrato.metadados)) {
        const valor = doc.querySelector(`meta[name="${nome}"]`)?.getAttribute('content')?.trim() ?? '';
        if (!valor) {
          if (regra.obrigatorio) yield { mensagem: `falta a meta "${nome}" no <head>.` };
          continue;
        }
        if (regra.tipo === 'data-iso' && !DATA_ISO.test(valor)) {
          yield { mensagem: `a meta "${nome}" não está em AAAA-MM-DD: "${valor}".` };
        }
        if (regra.tipo === 'unidade' && unidades && !Object.hasOwn(unidades, valor)) {
          yield { mensagem: `unidade desconhecida: "${valor}". Use ${Object.keys(unidades).join(' ou ')}.` };
        }
      }
    },
  },
  {
    nome: 'estrutura.colunas',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const colunas of secao.querySelectorAll('div.colunas')) {
          const grade = colunas.getAttribute('data-grade');
          const esperadas = contrato.grades[grade];
          if (!esperadas) continue; // grade fora do contrato é vocabulario.atributo, no marco 4b
          const filhos = colunas.children.length;
          if (filhos !== esperadas) {
            yield {
              ...onde(slides, secao),
              mensagem: `div.colunas com data-grade "${grade}" tem ${plural(filhos, 'filho', 'filhos')} (esperados ${esperadas}).`,
              trecho: trechoDe(colunas),
            };
          }
        }
      }
    },
  },
  {
    nome: 'estrutura.blocos',
    *aplicar({ slides, contrato }) {
      const aberturas = slides.filter((secao) => secao.getAttribute('data-layout') === 'abertura').length;
      const minimo = contrato.limites['blocos.min'];
      const maximo = contrato.limites['blocos.maxFileira'];
      if (aberturas < minimo) yield { mensagem: `a aula tem ${plural(aberturas, 'abertura', 'aberturas')}; o mínimo é ${minimo}.` };
      else if (aberturas > maximo) yield { mensagem: `a aula tem ${aberturas} blocos; acima de ${maximo} o mapa vira contador.` };
    },
  },
  {
    nome: 'estrutura.id-duplicado',
    *aplicar({ doc, slides }) {
      const vistos = new Set();
      for (const elemento of doc.body.querySelectorAll('[id]')) {
        const id = elemento.getAttribute('id');
        if (vistos.has(id)) {
          const secao = elemento.closest('section');
          yield { ...(secao ? onde(slides, secao) : {}), mensagem: `id repetido: "${id}".`, trecho: trechoDe(elemento) };
        }
        vistos.add(id);
      }
    },
  },
  {
    nome: 'estrutura.id-ausente',
    *aplicar({ slides }) {
      for (const secao of slides) {
        if (!secao.getAttribute('id') && !SEM_ID.includes(secao.getAttribute('data-layout'))) {
          yield { ...onde(slides, secao), mensagem: `slide de layout ${nomeDoLayout(secao)} sem id.` };
        }
      }
    },
  },
  {
    nome: 'estrutura.nome-curto',
    *aplicar({ slides, contrato }) {
      const limite = contrato.limites['abertura.h2.caracteresSemDataCurto'];
      for (const secao of slides) {
        if (secao.getAttribute('data-layout') !== 'abertura' || secao.hasAttribute('data-curto')) continue;
        const titulo = textoDeTitulo(secao.querySelector('h2'));
        if (titulo.length > limite) {
          yield { ...onde(slides, secao), mensagem: `abertura com título de ${titulo.length} caracteres (máx. ${limite}) e sem data-curto.` };
        }
      }
    },
  },
  {
    nome: 'estrutura.passos-mistos',
    *aplicar({ slides }) {
      for (const secao of slides) {
        const valores = [...secao.querySelectorAll('[data-passo]')].map((el) => el.getAttribute('data-passo'));
        // \passo{n}{…} no TeX do fonte também é passo numerado, e só o validador o vê antes do KaTeX renderizar.
        const noTex = segmentosDeTex(secao.textContent)
          .filter((segmento) => segmento.tipo !== 'texto')
          .reduce((total, segmento) => total + (segmento.tex.match(PASSO_NO_TEX)?.length ?? 0), 0);
        const semNumero = valores.filter((valor) => valor === '').length;
        const numerados = valores.filter((valor) => valor !== '').length + noTex;
        if (semNumero > 0 && numerados > 0) {
          yield {
            ...onde(slides, secao),
            mensagem: `o slide mistura ${plural(semNumero, 'passo sem número', 'passos sem número')} com ${plural(numerados, 'numerado', 'numerados')}.`,
          };
        }
      }
    },
  },
  {
    nome: 'estrutura.notas-ausentes',
    *aplicar({ slides }) {
      for (const secao of slides) {
        if (COM_NOTAS.includes(secao.getAttribute('data-layout')) && !secao.querySelector(':scope > aside.notas')) {
          yield { ...onde(slides, secao), mensagem: `slide de layout ${nomeDoLayout(secao)} sem notas do apresentador.` };
        }
      }
    },
  },
];
```

- [ ] **Step 6: Rodar o teste e ver passar**

Rode: `node --test tests/unit/validador.test.mjs`
Espere: 8 testes passando.

- [ ] **Step 7: Commitar o núcleo**

```bash
git add validador/validar.js validador/regras/estrutura.js tests/unit/validador.test.mjs
git commit -m "$(cat <<'MSG'
feat(validador): núcleo do validador e as regras diretas de estrutura

O motor roda as regras de um grupo do contrato sobre o fonte e devolve
achados em ordem estável; severidade e ação vêm do contrato, não do código.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 8: Escrever as fixtures das onze regras**

A spec 11.1 pede `tests/fixtures/validador/<regra>/bom.html` e `ruim.html` por regra. O teste roda só a regra da pasta, então cada arquivo traz o mínimo que aquela regra precisa ver — mas **sempre como documento inteiro**: o `linkedom` não enche `document.body` a partir de um fragmento que começa em `<body>`.

Todas as fixtures deste passo usam o mesmo cabeçalho, aqui chamado de `«CABEÇA»`:

```html
<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof.">
</head><body>
```

e terminam com `</body></html>`. Escreva os 22 arquivos, cada um com «CABEÇA», o corpo abaixo e o fecho:

`tests/fixtures/validador/estrutura.primeiro-slide/bom.html`
```html
<section data-layout="capa"><h1>Capa</h1></section>
```
`tests/fixtures/validador/estrutura.primeiro-slide/ruim.html`
```html
<section data-layout="conteudo" id="a"><h2>Direto ao conteúdo</h2></section>
```

`tests/fixtures/validador/estrutura.ultimo-slide/bom.html`
```html
<section data-layout="encerramento"><h2>Fim</h2></section>
```
`tests/fixtures/validador/estrutura.ultimo-slide/ruim.html`
```html
<section data-layout="capa"><h1>Capa</h1></section><section data-layout="conteudo" id="a"><h2>Sem fim</h2></section>
```

`tests/fixtures/validador/estrutura.layout/bom.html`
```html
<section data-layout="conteudo" id="a"><h2>Com layout</h2></section>
```
`tests/fixtures/validador/estrutura.layout/ruim.html`
```html
<section data-layout="galeria" id="a"><h2>Layout inventado</h2></section><section id="b"><h2>Sem data-layout</h2></section>
```

`tests/fixtures/validador/estrutura.metadados/bom.html` — este é «CABEÇA» com o corpo vazio.

`tests/fixtures/validador/estrutura.metadados/ruim.html` — o mesmo, com a cabeça quebrada (unidade fora de `unidades.json`, `aula` ausente, data fora do ISO):
```html
<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="poli"><meta name="disciplina" content="Teste">
<meta name="data" content="17/09/2026"><meta name="professor" content="Prof.">
</head><body>
</body></html>
```
`tests/fixtures/validador/estrutura.colunas/bom.html`
```html
<section data-layout="conteudo" id="a">
<div class="colunas" data-grade="6-6"><div><p>A.</p></div><div><p>B.</p></div></div>
</section>
```
`tests/fixtures/validador/estrutura.colunas/ruim.html`
```html
<section data-layout="conteudo" id="a">
<div class="colunas" data-grade="6-6"><div><p>A.</p></div><div><p>B.</p></div><div><p>C.</p></div></div>
</section>
```

`tests/fixtures/validador/estrutura.blocos/bom.html`
```html

<section data-layout="abertura" id="um"><h2>Um</h2></section>
<section data-layout="abertura" id="dois"><h2>Dois</h2></section>

```
`tests/fixtures/validador/estrutura.blocos/ruim.html`
```html
<section data-layout="abertura" id="um"><h2>Um</h2></section>
```

`tests/fixtures/validador/estrutura.id-duplicado/bom.html`
```html
<section data-layout="conteudo" id="a"><h2>A</h2></section><section data-layout="conteudo" id="b"><h2>B</h2></section>
```
`tests/fixtures/validador/estrutura.id-duplicado/ruim.html`
```html
<section data-layout="conteudo" id="a"><h2>A</h2></section><section data-layout="conteudo" id="a"><h2>B</h2></section>
```

`tests/fixtures/validador/estrutura.id-ausente/bom.html`
```html
<section data-layout="capa"><h1>Capa</h1></section><section data-layout="conteudo" id="a"><h2>A</h2></section>
```
`tests/fixtures/validador/estrutura.id-ausente/ruim.html`
```html
<section data-layout="conteudo"><h2>Sem id</h2></section>
```

`tests/fixtures/validador/estrutura.nome-curto/bom.html`
```html
<section data-layout="abertura" id="a" data-curto="Retro"><h2>Retropropagação</h2></section>
```
`tests/fixtures/validador/estrutura.nome-curto/ruim.html`
```html
<section data-layout="abertura" id="a"><h2>Retropropagação</h2></section>
```

`tests/fixtures/validador/estrutura.passos-mistos/bom.html`
```html
<section data-layout="conteudo" id="a">
<p data-passo="1">Um.</p>
\[ \passo{2}{x = 1} \]
</section>
```
`tests/fixtures/validador/estrutura.passos-mistos/ruim.html`
```html
<section data-layout="conteudo" id="a">
<p data-passo>Sem número.</p>
\[ \passo{1}{x = 1} \]
</section>
```

`tests/fixtures/validador/estrutura.notas-ausentes/bom.html`
```html
<section data-layout="conteudo" id="a"><h2>A</h2><aside class="notas">Notas.</aside></section>
```
`tests/fixtures/validador/estrutura.notas-ausentes/ruim.html`
```html
<section data-layout="conteudo" id="a"><h2>A</h2></section>
```

- [ ] **Step 9: Escrever a varredura das fixtures e as guardas do contrato**

Acrescente ao final de `tests/unit/validador.test.mjs`:

```js
const FIXTURES = new URL('tests/fixtures/validador/', RAIZ);
const IMPLEMENTADAS = new Map(estrutura.map((regra) => [regra.nome, regra]));

// Uma pasta por regra (spec 11.1): bom.html não acusa nada, ruim.html acusa a regra da pasta.
for (const nome of readdirSync(FIXTURES).sort()) {
  test(`fixture de ${nome}`, () => {
    const regra = IMPLEMENTADAS.get(nome);
    assert.ok(regra, `a pasta ${nome} não tem regra implementada`);
    const bom = rodar(readFileSync(new URL(`${nome}/bom.html`, FIXTURES), 'utf8'), [regra]);
    assert.deepEqual(bom, [], `bom.html de ${nome} acusou ${bom.map((a) => a.mensagem).join(' / ')}`);
    const ruim = rodar(readFileSync(new URL(`${nome}/ruim.html`, FIXTURES), 'utf8'), [regra]);
    assert.ok(ruim.length > 0, `ruim.html de ${nome} não acusou nada`);
    assert.ok(ruim.every((achado) => achado.regra === nome));
  });
}

test('toda regra implementada existe no contrato e tem fixture', () => {
  for (const regra of IMPLEMENTADAS.values()) {
    assert.ok(contrato.regras[regra.nome], `${regra.nome} não está no contrato`);
    assert.ok(existsSync(new URL(`${regra.nome}/ruim.html`, FIXTURES)), `${regra.nome} sem fixture`);
  }
});

test('toda regra de estrutura do contrato está implementada', () => {
  const doContrato = Object.entries(contrato.regras)
    .filter(([nome, regra]) => nome.startsWith('estrutura.') && regra.grupo === 'estatica' && regra.fase === 1)
    .map(([nome]) => nome);
  const faltando = doContrato.filter((nome) => !IMPLEMENTADAS.has(nome));
  // estrutura.obrigatorio e estrutura.fora-do-layout chegam na Task 2, com o casador de sequência.
  assert.deepEqual(faltando, ['estrutura.obrigatorio', 'estrutura.fora-do-layout']);
});
```

- [ ] **Step 10: Rodar e ver passar**

Rode: `node --test tests/unit/validador.test.mjs`
Espere: 8 + 11 + 2 = 21 testes passando.

- [ ] **Step 11: Commitar as fixtures**

```bash
git add tests/fixtures/validador tests/unit/validador.test.mjs
git commit -m "$(cat <<'MSG'
test(validador): uma fixture boa e uma ruim por regra de estrutura

A varredura amarra pasta, regra e contrato: regra sem fixture, fixture sem
regra ou regra fora do contrato quebram o teste.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: Casador de sequência, `estrutura.obrigatorio` e `estrutura.fora-do-layout`

**Files:**
- Create: `validador/sequencia.js`
- Create: `validador/regras/conteudo.js`
- Modify: `tests/unit/validador.test.mjs` (importar as regras novas, ajustar a guarda do contrato)
- Create: `tests/fixtures/validador/estrutura.obrigatorio/{bom,ruim}.html`, `tests/fixtures/validador/estrutura.fora-do-layout/{bom,ruim}.html`

**Interfaces:**
- Consumes: `validador/validar.js` (`onde`, `trechoDe`, `encurtar`), `componentes/tex.js` (`segmentosDeTex`), `contrato.layouts.<nome>.sequencia`, `contrato.filhos`, `contrato.blocosDeCorpo`, `contrato.sempreOpcional`.
- Produces (usado pelo M4b, que precisa dos mesmos itens para contar palavras e conferir classes):
  - `itensDoConteudo(elemento) → [{ tipo: 'elemento'|'tex-destaque'|'texto-solto', no, trecho }]`;
  - `casaSeletor(item, seletor) → boolean`, com `'tex-destaque'` casando o item de texto;
  - `casarSequencia(itens, sequencia, contrato) → { faltando, sobrando }`;
  - `nomeDaEntrada(entrada) → string`.

- [ ] **Step 1: Escrever os testes do casador, que falham**

Acrescente a `tests/unit/validador.test.mjs`, antes da varredura de fixtures:

```js
import { regras as conteudo } from '../../validador/regras/conteudo.js';
import { itensDoConteudo } from '../../validador/sequencia.js';

const todas = [...estrutura, ...conteudo];

function slide(corpo) {
  return BASE.replace('  <h2>Título</h2>\n  <p class="lide">Lide.</p>\n  <p>Corpo.</p>\n', corpo);
}

test('a equação em destaque é um item de conteúdo, o texto solto também', () => {
  const { document } = parseHTML(aula('<section>\\[ x = 1 \\] solto <p>p</p></section>'));
  document.body.normalize();
  assert.deepEqual(
    itensDoConteudo(document.querySelector('section')).map((item) => item.tipo),
    ['tex-destaque', 'texto-solto', 'elemento'],
  );
});

test('o layout sem elemento obrigatório acusa, nomeando as alternativas', () => {
  const [achado] = rodar(slide('  <h2>Título</h2>\n'), todas).filter((a) => a.regra === 'estrutura.obrigatorio');
  assert.equal(achado.mensagem, 'layout "conteudo" sem div.colunas nem bloco de corpo.');
});

test('a equação em destaque conta como bloco de corpo', () => {
  const achados = rodar(slide('  <h2>Título</h2>\n  \\[ E = mc^2 \\]\n'), todas);
  assert.deepEqual(achados.filter((a) => a.severidade === 'erro'), []);
});

test('o lide depois do corpo é elemento fora de ordem, não bloco de corpo', () => {
  const [achado] = rodar(slide('  <h2>Título</h2>\n  <p>Corpo.</p>\n  <p class="lide">Lide.</p>\n'), todas)
    .filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.equal(achado.mensagem, '<p> fora de ordem no layout "conteudo".');
});

test('elemento fora do conteúdo do layout acusa com o trecho', () => {
  const [achado] = rodar(slide('  <h2>Título</h2>\n  <p>Corpo.</p>\n  <blockquote>Citação.</blockquote>\n'), todas)
    .filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.equal(achado.mensagem, '<blockquote> não é permitido no layout "conteudo".');
  assert.equal(achado.trecho, '<blockquote>Citação.</blockquote>');
});

test('texto solto no slide não é bloco de corpo', () => {
  const achados = rodar(slide('  <h2>Título</h2>\n  <p>Corpo.</p>\n  Texto solto.\n'), todas)
    .filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.equal(achados[0].mensagem, 'texto solto não é permitido no layout "conteudo".');
});

test('figure pede exatamente uma imagem: zero falta, duas sobram', () => {
  const semImagem = slide('  <h2>Título</h2>\n  <figure><figcaption>Só legenda.</figcaption></figure>\n');
  const [falta] = rodar(semImagem, todas).filter((a) => a.regra === 'estrutura.obrigatorio');
  assert.equal(falta.mensagem, '<figure> sem img nem svg.');
  const duas = slide('  <h2>Título</h2>\n  <figure><img src="img/a.png" alt="a"><svg viewBox="0 0 1 1"></svg></figure>\n');
  const [sobra] = rodar(duas, todas).filter((a) => a.regra === 'estrutura.fora-do-layout');
  assert.equal(sobra.mensagem, '<svg> a mais dentro de <figure>: só um img ou svg.');
});

test('tbody escrito ou implícito dá a mesma resposta', () => {
  for (const tabela of ['<table><tr><td>a</td></tr></table>', '<table><tbody><tr><td>a</td></tr></tbody></table>']) {
    const achados = rodar(slide(`  <h2>Título</h2>\n  ${tabela}\n`), todas).filter((a) => a.severidade === 'erro');
    assert.deepEqual(achados, [], `${tabela} acusou ${achados.map((a) => a.mensagem).join(' / ')}`);
  }
});

test('a coluna só aceita bloco de corpo, e o exercício exige enunciado', () => {
  const coluna = slide('  <h2>Título</h2>\n  <div class="colunas" data-grade="6-6"><div><h2>Não.</h2></div><div><p>B.</p></div></div>\n');
  assert.equal(
    rodar(coluna, todas).find((a) => a.regra === 'estrutura.fora-do-layout').mensagem,
    '<h2> não é permitido dentro de <div>.',
  );
  const exercicio = slide('  <h2>Título</h2>\n  <div class="exercicio"><div class="resposta"><p>R.</p></div></div>\n');
  assert.equal(
    rodar(exercicio, todas).find((a) => a.regra === 'estrutura.obrigatorio').mensagem,
    '<div> sem div.enunciado.',
  );
});

test('as notas podem estar em qualquer posição do slide', () => {
  const achados = rodar(slide('  <h2>Título</h2>\n  <aside class="notas">No meio.</aside>\n  <p>Corpo.</p>\n'), todas);
  assert.deepEqual(achados.filter((a) => a.severidade === 'erro'), []);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Rode: `node --test tests/unit/validador.test.mjs`
Espere: falha ao importar `validador/regras/conteudo.js`.

- [ ] **Step 3: Escrever o casador**

Crie `validador/sequencia.js`:

```js
// Casador de sequência (spec 5.3): compara o conteúdo de um elemento com a sequência do contrato.
// O conteúdo de um slide não é só elemento: a equação em destaque é texto solto (\[ … \]), que o
// contrato chama de "tex-destaque"; o resto do texto solto não é bloco nenhum.
import { segmentosDeTex } from '../componentes/tex.js';

// Itens do conteúdo, na ordem do documento. Chame normalize() antes: o linkedom parte o texto em cada entidade.
export function itensDoConteudo(elemento) {
  const itens = [];
  for (const no of elemento.childNodes) {
    if (no.nodeType === 1) {
      itens.push({ tipo: 'elemento', no, trecho: no.outerHTML });
      continue;
    }
    if (no.nodeType !== 3) continue;
    for (const segmento of segmentosDeTex(no.data)) {
      if (segmento.tipo === 'destaque') itens.push({ tipo: 'tex-destaque', no, trecho: segmento.trecho });
      else {
        const texto = segmento.texto ?? segmento.trecho;
        if (texto.trim()) itens.push({ tipo: 'texto-solto', no, trecho: texto.trim() });
      }
    }
  }
  return itens;
}

export function casaSeletor(item, seletor) {
  if (seletor === 'tex-destaque') return item.tipo === 'tex-destaque';
  return item.tipo === 'elemento' && item.no.matches(seletor);
}

// Um grupo não engole o que outra entrada da mesma sequência nomeia: assim p.lide depois do corpo
// não passa por bloco de corpo, e sim por elemento fora de ordem.
function casa(item, entrada, contrato, nomeados = []) {
  if (!item) return false;
  if (!entrada.grupo) return casaSeletor(item, entrada.seletor);
  if (nomeados.some((seletor) => casaSeletor(item, seletor))) return false;
  return contrato[entrada.grupo].some((seletor) => casaSeletor(item, seletor));
}

function seletoresNomeados(entradas) {
  return entradas.flatMap((entrada) => {
    if (entrada.umDe) return seletoresNomeados(entrada.umDe.flat());
    return entrada.seletor ? [entrada.seletor] : [];
  });
}

export function nomeDaEntrada(entrada) {
  if (entrada.nomes) return entrada.nomes.join(' nem ');
  return entrada.grupo ? 'bloco de corpo' : entrada.seletor;
}

function consumir(itens, inicio, entradas, contrato, nomeados) {
  let i = inicio;
  const faltando = [];
  for (const entrada of entradas) {
    if (entrada.umDe) {
      const escolhida = entrada.umDe.find((alternativa) => casa(itens[i], alternativa[0], contrato, nomeados));
      if (!escolhida) {
        // Nenhuma alternativa começou: a mensagem nomeia todas, em vez de escolher a primeira por acaso.
        faltando.push({ nomes: entrada.umDe.map((alternativa) => nomeDaEntrada(alternativa[0])) });
        continue;
      }
      const parcial = consumir(itens, i, escolhida, contrato, nomeados);
      i = parcial.i;
      faltando.push(...parcial.faltando);
      continue;
    }
    let quantos = 0;
    while (casa(itens[i], entrada, contrato, nomeados) && (entrada.max === null || quantos < entrada.max)) {
      i += 1;
      quantos += 1;
    }
    if (quantos < (entrada.min ?? 0)) faltando.push(entrada);
  }
  return { i, faltando };
}

// O que falta e o que sobra. Sobra é o item que não coube: ou não é permitido ali, ou está fora de ordem.
export function casarSequencia(itens, sequencia, contrato) {
  const nomeados = seletoresNomeados(sequencia);
  const { i, faltando } = consumir(itens, 0, sequencia, contrato, nomeados);
  const sobrando = itens.slice(i).map((item) => ({
    item,
    foraDeOrdem: sequencia.some((entrada) => (entrada.umDe ?? [[entrada]]).flat().some((e) => casa(item, e, contrato, nomeados))),
  }));
  return { faltando, sobrando };
}
```

- [ ] **Step 4: Escrever as duas regras de conteúdo**

Crie `validador/regras/conteudo.js`:

```js
// Regras de conteúdo do slide (spec 5.3 e 9.2): o que o layout exige e o que ele não aceita, dentro da
// section e dentro dos elementos que o contrato descreve em "filhos".
import { onde, encurtar } from '../validar.js';
import { itensDoConteudo, casarSequencia, casaSeletor, nomeDaEntrada } from '../sequencia.js';

// O parser do navegador cria tbody; o do linkedom, não. Aceitar tr direto na table deixa os dois modos iguais.
const TRANSPARENTES = { table: ['tr'] };

function entradasDeFilhos(seletor, regra) {
  const entradas = [];
  if (regra.grupo) entradas.push({ grupo: regra.grupo, min: 0, max: null });
  for (const nome of regra.exatamenteUmDe ?? []) entradas.push({ seletor: nome, min: 0, max: null });
  for (const nome of regra.elemento ? [regra.elemento] : regra.elementos ?? []) entradas.push({ seletor: nome, min: 0, max: null });
  for (const nome of TRANSPARENTES[seletor] ?? []) entradas.push({ seletor: nome, min: 0, max: null });
  for (const nome of regra.opcionais ?? []) entradas.push({ seletor: nome, min: 0, max: 1 });
  return entradas;
}

function semOpcionais(elemento, contrato) {
  return itensDoConteudo(elemento)
    .filter((item) => !contrato.sempreOpcional.some((opcional) => casaSeletor(item, opcional)));
}

// Fora de uma sequência, os filhos vêm em qualquer ordem: o casamento é por conjunto, não por posição.
function conferirFilhos(elemento, seletor, regra, contrato) {
  const itens = semOpcionais(elemento, contrato);
  if (regra.sequencia) return casarSequencia(itens, regra.sequencia, contrato);
  const entradas = entradasDeFilhos(seletor, regra);
  const faltando = [];
  const sobrando = [];
  for (const item of itens) {
    const permitido = entradas.some((entrada) => (entrada.grupo
      ? contrato[entrada.grupo].some((nome) => casaSeletor(item, nome))
      : casaSeletor(item, entrada.seletor)));
    if (!permitido) sobrando.push({ item, foraDeOrdem: false });
  }
  if (regra.exatamenteUmDe) {
    const escolhidos = itens.filter((item) => regra.exatamenteUmDe.some((nome) => casaSeletor(item, nome)));
    if (escolhidos.length === 0) faltando.push({ nomes: regra.exatamenteUmDe });
    // Mais de um é excesso, não falta: sobra cada um depois do primeiro.
    for (const item of escolhidos.slice(1)) sobrando.push({ item, excedente: regra.exatamenteUmDe });
  }
  return { faltando, sobrando };
}

// Um achado por alvo: a própria section, e cada elemento que o contrato descreve em "filhos".
function* conferir(secao, contrato) {
  const layout = contrato.layouts[secao.getAttribute('data-layout')];
  if (!layout) return; // layout fora do contrato já é estrutura.layout
  yield { alvo: secao, ...casarSequencia(semOpcionais(secao, contrato), layout.sequencia, contrato) };
  for (const [seletor, regra] of Object.entries(contrato.filhos)) {
    for (const elemento of secao.querySelectorAll(seletor)) {
      yield { alvo: elemento, ...conferirFilhos(elemento, seletor, regra, contrato) };
    }
  }
}

function dentroDe(alvo, secao, preposicao) {
  return alvo === secao ? `${preposicao} layout "${secao.getAttribute('data-layout')}"` : `${preposicao} <${alvo.nodeName.toLowerCase()}>`;
}

function nomeDoItem(item) {
  if (item.tipo === 'elemento') return `<${item.no.nodeName.toLowerCase()}>`;
  return item.tipo === 'tex-destaque' ? 'equação em destaque' : 'texto solto';
}

export const regras = [
  {
    nome: 'estrutura.obrigatorio',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const { alvo, faltando } of conferir(secao, contrato)) {
          for (const entrada of faltando) {
            yield {
              ...onde(slides, secao),
              mensagem: `${dentroDe(alvo, secao, '').trim()} sem ${nomeDaEntrada(entrada)}.`,
              trecho: alvo === secao ? null : encurtar(alvo.outerHTML),
            };
          }
        }
      }
    },
  },
  {
    nome: 'estrutura.fora-do-layout',
    *aplicar({ slides, contrato }) {
      for (const secao of slides) {
        for (const { alvo, sobrando } of conferir(secao, contrato)) {
          for (const { item, foraDeOrdem, excedente } of sobrando) {
            const lugar = alvo === secao ? dentroDe(alvo, secao, 'no') : dentroDe(alvo, secao, 'dentro de');
            const nome = nomeDoItem(item);
            const mensagem = excedente ? `${nome} a mais ${lugar}: só um ${excedente.join(' ou ')}.`
              : foraDeOrdem ? `${nome} fora de ordem ${lugar}.`
                : `${nome} não é permitido ${lugar}.`;
            yield { ...onde(slides, secao), mensagem, trecho: encurtar(item.trecho) };
          }
        }
      }
    },
  },
];
```

- [ ] **Step 5: Ajustar a guarda do contrato e a varredura**

Em `tests/unit/validador.test.mjs`, troque `IMPLEMENTADAS` e a última guarda:

```js
const IMPLEMENTADAS = new Map(todas.map((regra) => [regra.nome, regra]));
```

```js
test('toda regra de estrutura do contrato está implementada', () => {
  const doContrato = Object.entries(contrato.regras)
    .filter(([nome, regra]) => nome.startsWith('estrutura.') && regra.grupo === 'estatica' && regra.fase === 1)
    .map(([nome]) => nome);
  assert.deepEqual(doContrato.filter((nome) => !IMPLEMENTADAS.has(nome)), []);
});
```

- [ ] **Step 6: Escrever as fixtures das duas regras**

`tests/fixtures/validador/estrutura.obrigatorio/bom.html`
```html
<body><section data-layout="figura" id="a">
<h2>Com figura</h2>
<figure><img src="img/a.png" alt="a"></figure>
</section></body>
```
`tests/fixtures/validador/estrutura.obrigatorio/ruim.html`
```html
<body><section data-layout="figura" id="a">
<h2>Sem figura</h2>
</section></body>
```

`tests/fixtures/validador/estrutura.fora-do-layout/bom.html`
```html
<body><section data-layout="conteudo" id="a">
<h2>Na ordem</h2>
<p class="lide">Lide.</p>
<p>Corpo.</p>
</section></body>
```
`tests/fixtures/validador/estrutura.fora-do-layout/ruim.html`
```html
<body><section data-layout="conteudo" id="a">
<h2>Fora de ordem</h2>
<p>Corpo.</p>
<p class="lide">Lide depois do corpo.</p>
<blockquote>E uma citação.</blockquote>
</section></body>
```

- [ ] **Step 7: Rodar e ver passar**

Rode: `node --test tests/unit/validador.test.mjs`
Espere: 23 + 10 testes novos + 2 fixtures novas = 35 testes passando, 0 falhas. (A rodada de correção da Task 1 acrescentou dois testes ao arquivo depois que este plano foi escrito: a base é 23, não 21.)

- [ ] **Step 8: Commitar**

```bash
git add validador/sequencia.js validador/regras/conteudo.js tests/unit/validador.test.mjs tests/fixtures/validador
git commit -m "$(cat <<'MSG'
feat(validador): casa o conteúdo do slide com a sequência do contrato

A equação em destaque é texto solto e conta como bloco de corpo; um grupo não
engole o que outra entrada da sequência nomeia, então o lide deslocado vira
elemento fora de ordem. tr direto na table vale, como no navegador.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: Comando `validar`, `--json` e o espécime com notas

**Files:**
- Create: `build/validar.mjs`
- Modify: `bin/aula-usp.mjs`
- Modify: `especime/index.html`, `especime/codigo.html`, `especime/ifusp.html` (notas onde faltam)
- Create: `tests/unit/validar-cli.test.mjs`
- Create: `tests/integracao/validador.test.mjs`

**Interfaces:**
- Consumes: `validador/validar.js`, `validador/regras/estrutura.js`, `validador/regras/conteudo.js`, `linkedom`.
- Produces (usado pelo M4b, pelo M4c e pelo build do M5):
  - `validarArquivo(caminho, { raizDoSistema }) → { achados, erros, avisos }`;
  - `lerAula(caminho) → Document` (com `parseHTML` e `normalize()` já aplicados);
  - `REGRAS_ESTATICAS` — a lista de regras do grupo estático, na ordem em que as mensagens saem;
  - CLI: `aula-usp validar <pasta-ou-arquivo> [--json]`, saída 0/1/2.

- [ ] **Step 1: Escrever o teste da cola de Node, que falha**

Crie `tests/unit/validar-cli.test.mjs`:

```js
// Cola de Node do validador (spec 8.1 e 9.3): lê a aula do disco e devolve os achados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarArquivo } from '../../build/validar.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');

function aulaTemporaria(html) {
  const pasta = mkdtempSync(join(tmpdir(), 'aula-usp-'));
  writeFileSync(join(pasta, 'index.html'), html);
  return pasta;
}

const BOA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof."></head><body>
<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="abertura" id="um"><h2>Um</h2></section>
<section data-layout="abertura" id="dois"><h2>Dois</h2></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

test('o espécime passa sem erro nas regras estáticas de estrutura', () => {
  const { erros } = validarArquivo(join(RAIZ, 'especime/index.html'));
  assert.equal(erros, 0);
});

test('todos os decks do espécime passam sem erro', () => {
  for (const nome of ['index', 'componentes', 'matematica', 'codigo', 'ifusp', 'muitos-blocos']) {
    const { achados, erros } = validarArquivo(join(RAIZ, `especime/${nome}.html`));
    assert.equal(erros, 0, `${nome}.html: ${achados.filter((a) => a.severidade === 'erro').map((a) => a.mensagem).join(' / ')}`);
  }
});

test('só muitos-blocos.html tem avisos, e são os que aquele deck existe para exercer', () => {
  for (const nome of ['index', 'componentes', 'matematica', 'codigo', 'ifusp']) {
    const { achados } = validarArquivo(join(RAIZ, `especime/${nome}.html`));
    assert.deepEqual(achados, [], `${nome}.html deveria estar limpo`);
  }
  const { achados } = validarArquivo(join(RAIZ, 'especime/muitos-blocos.html'));
  assert.deepEqual(new Set(achados.map((a) => a.regra)), new Set(['estrutura.blocos', 'estrutura.id-ausente']));
});

test('a CLI sai com 0 na aula boa e imprime o cabeçalho', () => {
  const saida = execFileSync('node', [CLI, 'validar', aulaTemporaria(BOA)], { encoding: 'utf8' });
  assert.match(saida, /^Validador Aula USP: 0 erros, 0 avisos$/m);
});

test('a CLI sai com 1 e imprime a mensagem quando há erro', () => {
  const pasta = aulaTemporaria(BOA.replace('<section data-layout="capa"><h1>Capa</h1></section>', ''));
  try {
    execFileSync('node', [CLI, 'validar', pasta], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    assert.equal(erro.status, 1);
    assert.match(erro.stdout, /ERRO · slide 1 #um · estrutura\.primeiro-slide ·/);
  }
});

test('--json devolve a lista com os campos da spec 9.1', () => {
  const pasta = aulaTemporaria(BOA.replace('<h2>Dois</h2>', '<h2>Retropropagação</h2>'));
  try {
    execFileSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    const [achado, ...resto] = JSON.parse(erro.stdout);
    assert.equal(resto.length, 0);
    assert.deepEqual(Object.keys(achado), ['severidade', 'slide', 'id', 'regra', 'mensagem', 'acao', 'trecho']);
    assert.equal(achado.regra, 'estrutura.nome-curto');
    assert.equal(achado.slide, 3);
  }
});

test('pasta sem index.html sai com 2', () => {
  try {
    execFileSync('node', [CLI, 'validar', mkdtempSync(join(tmpdir(), 'vazia-'))], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /não encontrei/);
  }
});

test('um arquivo também pode ser validado direto', () => {
  const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime/matematica.html')], { encoding: 'utf8' });
  assert.match(saida, /0 erros/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Rode: `node --test tests/unit/validar-cli.test.mjs`
Espere: falha ao importar `build/validar.mjs`.

- [ ] **Step 3: Escrever a cola de Node**

Crie `build/validar.mjs`:

```js
// Cola de Node do validador (spec 9.3): lê a aula do disco, monta o contexto e roda o grupo estático.
// O validador em si não sabe de arquivos: aqui é o único lugar com node:fs e linkedom.
import { readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { validar, contar } from '../validador/validar.js';
import { regras as estrutura } from '../validador/regras/estrutura.js';
import { regras as conteudo } from '../validador/regras/conteudo.js';

export const RAIZ_SISTEMA = fileURLToPath(new URL('..', import.meta.url));

// A ordem é a ordem das mensagens dentro de um slide: primeiro o que é da aula, depois o conteúdo.
export const REGRAS_ESTATICAS = [...estrutura, ...conteudo];

export function caminhoDaAula(alvo) {
  const absoluto = resolve(alvo);
  const info = statSync(absoluto); // ENOENT sobe: quem chama traduz em saída 2
  return info.isDirectory() ? join(absoluto, 'index.html') : absoluto;
}

export function lerAula(caminho) {
  const { document } = parseHTML(readFileSync(caminho, 'utf8'));
  return document;
}

export function validarArquivo(alvo, { regras = REGRAS_ESTATICAS, raizDoSistema = RAIZ_SISTEMA } = {}) {
  const caminho = caminhoDaAula(alvo);
  const contrato = JSON.parse(readFileSync(join(raizDoSistema, 'contrato/contrato.json'), 'utf8'));
  const unidades = JSON.parse(readFileSync(join(raizDoSistema, 'assets/marcas/unidades.json'), 'utf8'));
  const achados = validar(lerAula(caminho), { contrato, regras, grupo: 'estatica', unidades });
  return { achados, ...contar(achados) };
}
```

- [ ] **Step 4: Acrescentar o comando à CLI**

Em `bin/aula-usp.mjs`, troque o cabeçalho e o despacho:

```js
#!/usr/bin/env node
// CLI do Aula USP (spec 8.1). Neste marco, `servir` e `validar`.
import { statSync } from 'node:fs';
import { criarServidor } from '../build/servir.mjs';
import { validarArquivo } from '../build/validar.mjs';
import { linhaDe, cabecalhoDe } from '../validador/validar.js';

const USO = 'uso: aula-usp servir <pasta> [--porta 8765]\n       aula-usp validar <pasta> [--json]';
```

Acrescente a função, antes do despacho:

```js
function validarComando(argumentos) {
  const { opcoes, posicionais } = lerArgumentos(argumentos);
  const [alvo] = posicionais;
  if (!alvo) sair(USO);
  let resultado;
  try {
    resultado = validarArquivo(alvo);
  } catch (erro) {
    sair(`não encontrei a aula em ${alvo}: ${erro.message}`);
  }
  const { achados, erros } = resultado;
  if (opcoes.json) console.log(JSON.stringify(achados, null, 2));
  else {
    for (const achado of achados) console.log(linhaDe(achado));
    console.log(cabecalhoDe(achados));
  }
  process.exit(erros > 0 ? 1 : 0);
}
```

Em `lerArgumentos`, reconheça a opção:

```js
    if (argumentos[i] === '--porta') opcoes.porta = Number(argumentos[++i]);
    else if (argumentos[i] === '--json') opcoes.json = true;
    else posicionais.push(argumentos[i]);
```

E no despacho:

```js
const [comando, ...argumentos] = process.argv.slice(2);
if (comando === 'servir') servir(argumentos);
else if (comando === 'validar') validarComando(argumentos);
else sair(USO);
```

- [ ] **Step 5: Rodar e ver as notas faltando**

Rode: `node --test tests/unit/validar-cli.test.mjs`
Espere: passam os testes de erro e de JSON; falha `só muitos-blocos.html tem avisos`, porque `index.html`, `codigo.html`, `ifusp.html` e `muitos-blocos.html` ainda têm slides sem `aside.notas` (7, 4, 2 e 1 avisos). No ensaio, a falha saiu como `Set(3) { 'estrutura.blocos', 'estrutura.id-ausente', 'estrutura.notas-ausentes' }` contra `Set(2)`.

- [ ] **Step 6: Escrever as notas que faltam no espécime**

Isto fecha o Minor 7 da revisão do marco 3c. Acrescente cada `<aside class="notas">` como **último filho** da `section` indicada, com o texto exato abaixo (notas dizem o que falar, não repetem o que está no slide). São 14 slides, em quatro arquivos.

Em `especime/index.html`:

| slide | nota |
|---|---|
| `#grade-8-4` | Mostrar que a coluna larga leva o argumento e a estreita, o comentário: a grade 8-4 não é meio a meio. |
| `#afirmacao` | Ler a afirmação em voz alta e parar. O slide inteiro é uma frase, e a fonte embaixo diz de onde ela vem. |
| `#figura` | Mostrar que a figura ocupa a zona de conteúdo inteira e que a legenda fica embaixo, alinhada à esquerda. |
| `#demo` | Clicar no botão da demo uma vez antes de falar. No PDF, o que sai é a imagem estática. |
| `#grade-6-6` | Duas colunas iguais: use quando as duas partes têm o mesmo peso, como antes e depois. |
| `#grade-4-8` | A mesma grade de antes, espelhada: a coluna estreita vem primeiro quando ela é a pergunta. |
| `#grade-4-4-4` | Três colunas reveladas em dois passos, na ordem dos números, não na ordem em que estão escritas. |

Em `especime/codigo.html`:

| slide | nota |
|---|---|
| `#r-e-sql` | Duas linguagens lado a lado mostram que o destaque é o mesmo: negrito nas palavras-chave, cinza nos comentários. |
| `#javascript-e-bash` | As linhas marcadas em amarelo são as que importam; ler só elas e seguir. |
| `#json-e-latex` | No JSON não há palavra-chave, só estrutura; no LaTeX, todo comando é palavra-chave, com a barra. |
| `#dezesseis-linhas` | Este é o limite: dezesseis linhas numeradas. Mais que isso, o validador acusa e o slide fica ilegível de longe. |

Em `especime/muitos-blocos.html`:

| slide | nota |
|---|---|
| `#dentro-do-terceiro` | Este deck existe para mostrar o contador: acima de oito blocos, o mapa de quadrados vira "Bloco N de M". |

Em `especime/ifusp.html`, que está em inglês, as notas também ficam em inglês:

| slide | nota |
|---|---|
| `#one-step` | Start from the walker at the origin and take a single step; the average displacement is zero, the average square is not. |
| `#spreading` | The cloud widens as the square root of time: that is the whole point of the slide. |

Forma de cada uma, no fim da `section`:

```html
  <aside class="notas">Mostrar que a figura ocupa a zona de conteúdo inteira e que a legenda fica embaixo, alinhada à esquerda.</aside>
```

- [ ] **Step 7: Rodar e ver passar**

Rode: `node --test tests/unit/validar-cli.test.mjs`
Espere: 8 testes passando.

- [ ] **Step 8: Escrever o teste de integração**

Crie `tests/integracao/validador.test.mjs`:

```js
// A CLI sobre o espécime servido (spec 8.1): o que o autor vê ao rodar o comando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');

test('validar especime/ não acha nada e sai com 0', () => {
  const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime')], { encoding: 'utf8' });
  assert.equal(saida.trim(), 'Validador Aula USP: 0 erros, 0 avisos');
});

test('validar sem argumento explica o uso e sai com 2', () => {
  try {
    execFileSync('node', [CLI, 'validar'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp servir/);
  }
});
```

- [ ] **Step 9: Rodar os dois conjuntos**

Rode: `node --test tests/unit/*.test.mjs`
Espere: 156 + 35 + 8 = 199 testes passando.

Rode: `node --test tests/integracao/validador.test.mjs`
Espere: 2 testes passando.

As notas novas mudam o espécime, que a integração renderiza. Rode um por vez e confirme 73 + 2 = 75, com atenção aos que leem notas ou medem composição: `paineis` (7), `apresentador` (9), `impressao` (6), `layouts` (11), `codigo` (8), `motor` (11) e `demos` (4). No ensaio, todos passaram sem mudança.

- [ ] **Step 10: Commitar**

```bash
git add build/validar.mjs bin/aula-usp.mjs especime tests/unit/validar-cli.test.mjs tests/integracao/validador.test.mjs
git commit -m "$(cat <<'MSG'
feat(cli): comando validar, com --json e os códigos de saída da spec

A cola de Node lê a aula com o linkedom e roda o grupo estático; o espécime
ganhou as notas que faltavam, e agora valida sem erro e sem aviso.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Decisões tomadas neste plano

Cada uma pode ser revertida pelo autor; estão aqui para ficarem visíveis.

1. **O marco 4 vem em três planos** (4a, 4b, 4c), como o 2 e o 3. Este entrega só o grupo `estatica` das regras `estrutura.*`.
2. **A severidade e a ação vêm do contrato**, e o código das regras só descreve a verificação. Uma regra implementada que não esteja no contrato quebra o teste, e uma regra `estrutura.*` do contrato sem implementação também.
3. **O slide do fonte é toda `section` filha do corpo**, com `data-layout` ou sem, ao contrário de `secoesDaAula` do `montar`, que filtra por `data-layout`. Sem isso, `section` sem layout seria invisível justamente para a regra que existe para acusá-la.
4. **Achado sem slide escreve `aula`** no lugar de `slide N` (a spec 9.1 só mostra o caso com slide, e as regras de metadados não têm slide).
5. **`tbody` é transparente**: `table > tr` vale tanto quanto `table > tbody > tr`, porque o parser do navegador cria o `tbody` e o do `linkedom` não. Resolve a assimetria levantada na revisão do marco 3a sem mudar o contrato.
6. **Um grupo não casa o que outra entrada da mesma sequência nomeia**, para que `p.lide` fora de lugar seja "fora de ordem" em vez de bloco de corpo. Alternativa descartada: escrever `p:not(.lide, .pergunta, …)` no contrato, que funciona no `linkedom` mas deixa o contrato — e a tabela do guia do marco 6 — mais feio.
7. **A ordem dentro de `figure` não é verificada** (`figcaption` antes da imagem passa), porque o contrato descreve `figure` por conjunto (`exatamenteUmDe` mais `opcionais`), não por sequência. Se o autor quiser fixar a ordem, é uma mudança de contrato, não de código.
8. **As notas podem estar em qualquer posição** do slide, porque `sempreOpcional` sai da lista antes do casamento.
9. **`\passo{n}` do TeX conta como passo numerado** em `estrutura.passos-mistos`, lido com `segmentosDeTex` sobre o texto do slide, depois de `normalize()`.
10. **O espécime passa a validar limpo** (0 erros, 0 avisos), com a exceção registrada de `muitos-blocos.html`, que existe para exercer nove blocos e a geração de ids e por isso mantém os avisos de `estrutura.blocos` e `estrutura.id-ausente`.
11. **`validar` aceita pasta ou arquivo**; pasta procura `index.html` dentro dela.

## O que fica para o marco 4b

- `vocabulario.*` (8 regras), incluindo as de cor em SVG e a decisão sobre listar no contrato os atributos que o próprio sistema escreve (`data-indice`, `data-bloco`, `data-revelado`, `data-copia`, `data-rotulo` em `div.enunciado`), ao lado de `classesDoSistema` — hoje as regras estáticas só não tropeçam neles porque rodam sobre o fonte.
- `limites.*` (20 regras), com quatro decisões já levantadas pelas revisões: contar o título pelo texto renderizado, não pelo fonte, quando houver TeX; `limites.codigo-linhas` e `limites.codigo-colunas` contando com `codigoDoBloco`; `limites.codigo-colunas` em 64 ser limite de largura cheia, enquanto numa coluna 6-6 cabem ~45; e `limites.metadado` cobrindo os máximos da spec 5.2, que `estrutura.metadados` deliberadamente não confere.
- `matematica.comando-proibido`, que precisa cobrir também as macros de cor do KaTeX (`\red`, `\blue`, `\redA`…), hoje fora de `proibidos.comandosTex`; `matematica.cifrao-suspeito`; e `matematica.simbolo-fora-do-tex`, que depende de `validador/cobertura.json` — gerado do `cmap` dos woff2 com `fontkit` (dependência nova, a autorizar) ou adiado para o marco 5, quando `aula-usp dist` existir.
- `recursos.alt`, `recursos.imagem-externa` e `recursos.linguagem`.
- Validar `data-linhas` além do padrão do contrato: intervalo invertido, `0`, número maior que o bloco, e intervalo grande o bastante para travar a página (`data-linhas="1-10000000"` custa 1 s e 460 MB hoje).
- Aviso para `\(` ou `\[` sem fechamento, que hoje fica cru e silencioso.

## O que fica para o marco 4c

- O painel do validador (tecla V, botão "copiar para o chat", abre sozinho só com erros e fora de tela cheia), com os erros de `renderizarTex` e de `renderizarCodigo` roteados para ele, saindo do `console.error` de hoje.
- O passo 3 da spec 3.2: guardar a cópia do corpo antes de `montar` e rodar as regras estáticas sobre ela, no navegador.
- O grupo de carga: `matematica.tex-invalido` (KaTeX no Node), `recursos.imagem`, `recursos.demo-sem-registro`, `recursos.demo-sem-estatico`.
- O grupo de composição, no Chrome, com três cuidados já medidos: dispor todos os slides antes de medir, porque as fontes do KaTeX carregam preguiçosamente; medir transbordo de código com `scrollWidth > clientWidth`, porque a caixa do elemento não mostra; e resolver a tensão de `composicao.tamanho-minimo` com `code` dentro de `figcaption` ou `p.fonte` (15,84 px contra o mínimo de 20 px do papel `codigo`) e com `.tex-invalido` (20 a 21 px), hoje fora das exceções do contrato.
- A fixture de composição que o marco 3a pediu: figura numa coluna estreita, espécime nos limites de comprimento (rótulo de 24, legenda de 140, item de síntese de 80) e tabela com `colspan`/`rowspan`.
