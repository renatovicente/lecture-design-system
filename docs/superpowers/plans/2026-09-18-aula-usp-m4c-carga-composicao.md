# Marco 4c do Aula USP: carga, composição e o painel do navegador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar o marco 4 — as quatro regras de carga, as cinco de composição, o painel do validador no navegador e a composição no comando `validar` quando há Chrome.

**Architecture:** o marco 4a deixou o motor de regras, o 4b completou o grupo estático e deixou o registro num ES module puro, com contexto extensível. Este marco usa as duas coisas: as regras de carga leem do contexto o que o chamador carregou (`recursos`), e as de composição rodam **dentro da página**, sobre o documento renderizado, recebendo a janela no contexto. No navegador isso acontece no passo 6 da spec 3.2, antes do motor iniciar, quando todos os slides ainda estão dispostos; no build e na CLI, no Chrome headless, com a aula servida em `?folha`. O painel do validador entra como o quarto painel do motor, na tecla V.

**Tech Stack:** Node ≥20.6, ES modules, `node:test`, `linkedom`, `playwright-core` com o Chrome instalado, `katex`. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (seções 3.2, 3.3, 4.2, 4.3, 6.5, 8.1, 9.1, 9.2, 9.3 e 11.2).

## Global Constraints

- **Severidade e ação vêm de `contrato.regras.<nome>`**; limites, papéis e cores vêm do contrato. Nada disso no código das regras.
- **`validador/` não importa nada de Node** — nem os módulos deste marco. As regras de composição rodam no navegador; quem carrega arquivo, roda KaTeX no Node ou dirige o Chrome é `build/`.
- **As regras não carregam nada.** O grupo de carga recebe `recursos` prontos no contexto; o de composição recebe `janela`. Uma regra que não recebeu o que precisa não inventa: devolve nada.
- **Grupos e momentos (spec 9.3):** estáticas sobre o fonte; carga depois de bibliotecas, imagens e scripts; composição sobre o documento montado e renderizado, no estado final.
- **Mensagem (spec 9.1):** `ERRO · slide 7 #culpa · regra · problema. Ação.`
- **Commits:** mensagem em português, `tipo(escopo): frase no imperativo`, terminando com a linha exata `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Testes:** `npm test` para unitários; integração **um arquivo por vez**. Ponto de partida: 306 unitários e 76 de integração.
- **Disciplina de saída:** edições pontuais, nunca reescrita de arquivo grande numa tacada; no relatório, só linhas de resumo e asserções que falharam.

## O que este marco fecha, e o que não

Fecha o marco 4 da spec 12: regras estáticas (4a e 4b), de carga e de composição da fase 1, painel do navegador, `validar` e `--json`, fixtures.

Continua fora, de propósito: `matematica.simbolo-fora-do-tex`, que o 4b adiou para o marco 5 junto com `saida.glifo-ausente`, porque as duas leem `validador/cobertura.json`, que `aula-usp dist` gera.

## O que já está verificado

Todo o código deste plano foi escrito e rodado numa cópia de rascunho, contra o espécime real, no Chrome.

1. **No modo palco só o slide atual tem geometria.** Medido: `.area` do slide visível dá 1260×464; a de todos os outros dá 0×0. A composição precisa de todos os slides dispostos — e é por isso que a spec 9.3 a coloca no **passo 6, antes do motor iniciar**, quando nenhum slide foi escondido ainda. No build, `?folha` dá o mesmo estado: o `body.folha` só muda a disposição da página (grid, gap, padding e um contorno), não o interior do slide.
2. **A geometria de folha é a de projeto, sem escala.** `.area` mede 1152×556 em folha e 1260×607 no palco, porque o palco aplica `transform: scale`. Medir em folha evita desfazer a escala.
3. **As cinco regras de composição rodam limpas nos seis decks do espécime** — zero achados — e pegam as cinco mutações correspondentes, cada uma com a sua regra.
4. **Três tensões que as revisões anteriores deixaram nomeadas foram medidas e resolvidas:**
   - `.roteiro li` — o cromo da capa — renderiza a **14 px** e casa só o papel `leitura`, cujo mínimo é 24. Sem conserto, todos os seis decks acusariam. Vai para o papel `rotulo`, cujo mínimo é exatamente 14, e o desempate passa a ser por especificidade, que o contrato já declara em `papeis.precedencia: "seletor-mais-especifico"` e que nenhum código lia.
   - `figcaption code` renderiza a **15,84 px** (0,88 × 18) e casa o papel `codigo`, de mínimo 20 — erro falso numa legenda legítima, como a revisão do marco 3a previu. Entra nas exceções, junto com `p.fonte code`.
   - `.tex-invalido` renderiza a **21,12 px** em linha e **20 px** em bloco, e **não casa papel nenhum** — a preocupação da revisão do marco 3b era infundada, e nada precisa ser feito. Medido para fechar o item.
5. **O `scrollWidth` só vale no `pre`.** Aplicado a qualquer elemento, cada ancestral rolável repete o transbordo do filho: uma mutação de um parágrafo largo rendeu duas mensagens sobre `<div>` em vez de uma sobre `<p>`. Restringir ao `pre` — que é onde o marco 3c mediu o problema, porque cada linha é um `inline-block` de largura fixa — dá a mensagem certa.
6. **O grupo de carga atribui cada achado ao slide certo** e cala quando o chamador não carregou nada: com `recursos` ausente, zero achados.

## Estrutura de arquivos

```
validador/regras/carga.js        quatro regras que leem recursos do contexto        (Task 1, novo)
validador/regras/composicao.js   cinco regras que medem a página renderizada        (Task 2, novo)
validador/regras/index.js        ganha REGRAS_DE_CARGA e REGRAS_DE_COMPOSICAO       (Tasks 1-2)
contrato/contrato.json           .roteiro li no papel rotulo; code de legenda nas exceções  (Task 2)
build/servir.mjs                 serve validador/, para a página importar as regras  (Task 2)
build/carregar.mjs               junta os recursos no Node: KaTeX, disco, scripts    (Task 1, novo)
build/composicao.mjs             abre o Chrome e roda o grupo dentro da página       (Task 4, novo)
montar/navegador.js              cópia do documento, passo 3 e passo 6               (Task 3)
motor/paineis.js                 o painel do validador, tecla V                      (Task 3)
motor/navegacao.js, rotulos.js   tecla V e os rótulos do painel                      (Task 3)
bin/aula-usp.mjs                 validar roda composição quando há Chrome            (Task 4)
tests/unit/carga.test.mjs, tests/integracao/composicao.test.mjs, painel.test.mjs     (Tasks 1-4)
```

---

### Task 1: O grupo de carga

**Files:**
- Create: `validador/regras/carga.js`, `build/carregar.mjs`, `tests/unit/carga.test.mjs`
- Modify: `validador/regras/index.js`, `build/validar.mjs`
- Create: 4 pastas de fixture

**Interfaces:**
- Produces: `REGRAS_DE_CARGA`; o formato de `recursos` que os dois modos preenchem — `{ tex: [{ trecho, mensagem, elemento }], imagens: Map(src → boolean), demos: Map(nome → { capturar: boolean }) }`; e `carregarNoNode(doc, { pastaDaAula, katex })` em `build/carregar.mjs`.

- [ ] **Step 1: Escrever o teste, que falha**

Crie `tests/unit/carga.test.mjs`. O teste monta o contexto à mão, que é o ponto: as regras não carregam nada.

```js
// Regras de carga (spec 9.2 e 9.3): leem o que o chamador carregou, e nada mais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { validar } from '../../validador/validar.js';
import { regras } from '../../validador/regras/carga.js';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

const CABECA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="T"><meta name="aula" content="1">
<meta name="data" content="2026-09-18"><meta name="professor" content="P."></head><body>`;

const AULA = `${CABECA}
<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="conteudo" id="figuras">
  <h2>Figuras</h2>
  <figure><img src="img/existe.png" alt="a"></figure>
  <figure><img src="img/sumiu.png" alt="b"></figure>
  <figure><img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" alt="c"></figure>
  <aside class="notas">N.</aside>
</section>
<section data-layout="demo" id="com-estatico"><h2>Com estático</h2><div class="demo" data-demo="contador"><img class="estatico" src="img/existe.png" alt="d"></div><aside class="notas">N.</aside></section>
<section data-layout="demo" id="com-capturar"><h2>Com capturar</h2><div class="demo" data-demo="grafico"></div><aside class="notas">N.</aside></section>
<section data-layout="demo" id="nua"><h2>Nua</h2><div class="demo" data-demo="nua"></div><aside class="notas">N.</aside></section>
<section data-layout="demo" id="fantasma"><h2>Fantasma</h2><div class="demo" data-demo="fantasma"></div><aside class="notas">N.</aside></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

function rodar(recursos, html = AULA) {
  const { document } = parseHTML(html);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos });
  return { achados, document };
}

const COMPLETO = (document) => ({
  tex: [{ trecho: '\\( \\frac{1 \\)', mensagem: "Expected '}', got 'EOF'", elemento: document.querySelector('#figuras h2') }],
  imagens: new Map([['img/existe.png', true], ['img/sumiu.png', false]]),
  demos: new Map([['contador', { capturar: false }], ['grafico', { capturar: true }], ['nua', { capturar: false }]]),
});

test('sem recursos carregados, nenhuma regra inventa achado', () => {
  assert.deepEqual(rodar(undefined).achados, []);
  assert.deepEqual(rodar({}).achados, []);
});

test('TeX que não compila vira erro no slide onde está', () => {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document) })
    .filter((achado) => achado.regra === 'matematica.tex-invalido');
  assert.equal(achados.length, 1);
  assert.equal(achados[0].slide, 2);
  assert.match(achados[0].mensagem, /Expected '}', got 'EOF'/);
});

test('imagem que não carregou acusa; a que carregou e a embutida, não', () => {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document) })
    .filter((achado) => achado.regra === 'recursos.imagem');
  assert.deepEqual(achados.map((achado) => achado.mensagem), ['imagem que não carregou: "img/sumiu.png".']);
});

test('demo sem registro é erro; demo sem estático nem capturar é aviso', () => {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document) });
  const semRegistro = achados.filter((achado) => achado.regra === 'recursos.demo-sem-registro');
  assert.deepEqual(semRegistro.map((achado) => achado.mensagem), ['demo sem registro: "fantasma".']);
  const semEstatico = achados.filter((achado) => achado.regra === 'recursos.demo-sem-estatico');
  assert.deepEqual(semEstatico.map((achado) => achado.slide), [5]);
  assert.equal(semEstatico[0].severidade, 'aviso');
});

test('a demo sem registro não acusa também falta de estático: um erro, um dono', () => {
  const { document } = parseHTML(AULA);
  const achados = validar(document, { contrato, regras, grupo: 'carga', recursos: COMPLETO(document) })
    .filter((achado) => achado.slide === 6);
  assert.deepEqual(achados.map((achado) => achado.regra), ['recursos.demo-sem-registro']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Rode: `node --test tests/unit/carga.test.mjs`
Espere: falha ao importar `validador/regras/carga.js`.

- [ ] **Step 3: Escrever as quatro regras**

Crie `validador/regras/carga.js`:

```js
// Regras de carga (spec 9.2 e 9.3): o que só se sabe depois de carregar bibliotecas, imagens e scripts.
// As regras não carregam nada — quem carrega é o chamador, e entrega o resultado no contexto:
//   recursos = { tex: [{ trecho, mensagem }], imagens: Map(src → carregou), demos: Map(nome → { capturar }) }
// No navegador isso vem do DOM vivo; no build, do KaTeX rodando no Node e do disco.
import { onde, trechoDe, encurtar } from '../validar.js';

export const regras = [
  {
    nome: 'matematica.tex-invalido',
    *aplicar({ slides, recursos }) {
      for (const erro of recursos?.tex ?? []) {
        const secao = erro.elemento?.closest('section');
        yield {
          ...(secao ? onde(slides, secao) : {}),
          mensagem: `TeX que o KaTeX não compila: ${erro.mensagem}`,
          trecho: encurtar(erro.trecho ?? ''),
        };
      }
    },
  },
  {
    nome: 'recursos.imagem',
    *aplicar({ slides, recursos }) {
      if (!recursos?.imagens) return;
      for (const secao of slides) {
        for (const imagem of secao.querySelectorAll('img')) {
          const src = imagem.getAttribute('src') ?? '';
          if (src.startsWith('data:')) continue; // imagem embutida não tem o que faltar
          if (recursos.imagens.get(src) === false) {
            yield { ...onde(slides, secao), mensagem: `imagem que não carregou: "${src}".`, trecho: trechoDe(imagem) };
          }
        }
      }
    },
  },
  {
    nome: 'recursos.demo-sem-registro',
    *aplicar({ slides, recursos }) {
      if (!recursos?.demos) return;
      for (const secao of slides) {
        for (const demo of secao.querySelectorAll('div.demo[data-demo]')) {
          const nome = demo.getAttribute('data-demo');
          if (!recursos.demos.has(nome)) {
            yield { ...onde(slides, secao), mensagem: `demo sem registro: "${nome}".`, trecho: trechoDe(demo) };
          }
        }
      }
    },
  },
  {
    nome: 'recursos.demo-sem-estatico',
    *aplicar({ slides, recursos }) {
      if (!recursos?.demos) return;
      for (const secao of slides) {
        for (const demo of secao.querySelectorAll('div.demo[data-demo]')) {
          const nome = demo.getAttribute('data-demo');
          const registro = recursos.demos.get(nome);
          if (!registro) continue; // sem registro já é recursos.demo-sem-registro
          if (demo.querySelector('img.estatico') || registro.capturar) continue;
          yield { ...onde(slides, secao), mensagem: `demo "${nome}" sem img.estatico e sem capturar(): o PDF sai vazio.`, trecho: trechoDe(demo) };
        }
      }
    },
  },
];
```

Acrescente ao registro, em `validador/regras/index.js`:

```js
import { regras as carga } from './carga.js';

export const REGRAS_DE_CARGA = carga;
```

- [ ] **Step 4: Rodar e ver passar**

Rode: `node --test tests/unit/carga.test.mjs` — 5 testes.
Rode: `npm test` — 311 (306 + 5). Relate o número que medir.

- [ ] **Step 5: O carregador do Node**

Crie `build/carregar.mjs`, que preenche `recursos` no modo build. É o único lugar deste marco que toca disco.

```js
// Carrega, no Node, o que o grupo de carga precisa saber (spec 9.3, etapa 1): KaTeX compila o TeX do
// fonte, o disco responde pelas imagens, e os registros de demo são procurados no texto dos scripts.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { segmentosDeTex, textosComTex } from '../componentes/tex.js';

// AulaUSP.demo('nome', { … }) — o registro que o modo build lê sem executar script nenhum.
const REGISTRO = /AulaUSP\.demo\(\s*['"]([a-z][a-z0-9-]*)['"]\s*,([\s\S]*?)\n\s*\}\s*\)/g;

export function demosDosScripts(doc) {
  const demos = new Map();
  for (const script of doc.querySelectorAll('script:not([src])')) {
    for (const [, nome, corpo] of script.textContent.matchAll(REGISTRO)) {
      demos.set(nome, { capturar: /\bcapturar\s*\(/.test(corpo) });
    }
  }
  return demos;
}

export function imagensDoDisco(doc, pastaDaAula) {
  const imagens = new Map();
  for (const imagem of doc.querySelectorAll('img')) {
    const src = imagem.getAttribute('src') ?? '';
    if (src.startsWith('data:') || src.startsWith('https://')) continue;
    imagens.set(src, existsSync(join(pastaDaAula, src)));
  }
  return imagens;
}

export function texInvalido(doc, katex) {
  const erros = [];
  for (const no of textosComTex(doc.body)) {
    for (const segmento of segmentosDeTex(no.data)) {
      if (segmento.tipo === 'texto') continue;
      try {
        katex.renderToString(segmento.tex, { displayMode: segmento.tipo === 'destaque', throwOnError: true, strict: 'ignore' });
      } catch (erro) {
        erros.push({ trecho: segmento.trecho, mensagem: erro.message, elemento: no.parentElement });
      }
    }
  }
  return erros;
}

export function carregarNoNode(doc, { pastaDaAula, katex }) {
  return { tex: texInvalido(doc, katex), imagens: imagensDoDisco(doc, pastaDaAula), demos: demosDosScripts(doc) };
}
```

Em `build/validar.mjs`, rode o grupo de carga depois do estático, com o mesmo documento:

```js
import { REGRAS_ESTATICAS, REGRAS_DE_CARGA } from '../validador/regras/index.js';
import { carregarNoNode } from './carregar.mjs';
```

e dentro de `validarArquivo`, depois dos achados estáticos:

```js
  const { default: katex } = await import('katex');
  const recursos = carregarNoNode(doc, { pastaDaAula: dirname(caminho), katex });
  const deCarga = validar(doc, { contrato, regras: REGRAS_DE_CARGA, grupo: 'carga', recursos });
```

`validarArquivo` passa a ser `async`; ajuste os chamadores (`bin/aula-usp.mjs` já está dentro de um `try` assíncrono, e o teste da CLI usa o processo, não a função). Os achados dos dois grupos saem numa lista só, ordenada como sempre.

- [ ] **Step 6: Teste do carregador e da CLI**

Acrescente a `tests/unit/validar-cli.test.mjs`:

```js
test('o grupo de carga roda no build: TeX inválido, imagem ausente e demo sem registro', () => {
  const pasta = aulaTemporaria(BOA.replace('<section data-layout="encerramento">',
    '<section data-layout="conteudo" id="carga"><h2>Carga</h2>'
    + '<p>Erro: \\( \\frac{1 \\)</p>'
    + '<figure><img src="img/sumiu.png" alt="a"></figure>'
    + '<aside class="notas">N.</aside></section>\n<section data-layout="encerramento">'));
  try {
    execFileSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    const regras = JSON.parse(erro.stdout).map((achado) => achado.regra);
    assert.ok(regras.includes('matematica.tex-invalido'), regras.join(', '));
    assert.ok(regras.includes('recursos.imagem'), regras.join(', '));
  }
});
```

- [ ] **Step 7: As quatro fixtures**

Mesmo molde dos marcos anteriores — documento inteiro, cabeçalho com as cinco metas. As fixtures do grupo de carga são validadas pela varredura com `recursos` vazio, então `bom.html` e `ruim.html` diferem no que o **carregador** encontraria; a varredura só confirma que a regra existe e não acusa sem recursos. Marque isso num comentário no teste da varredura.

| pasta | bom.html | ruim.html |
|---|---|---|
| `matematica.tex-invalido` | «slide: `<h2>T</h2><p>Seja \(x^2\).</p>`» | «slide: `<h2>T</h2><p>Seja \(\frac{1\).</p>`» |
| `recursos.imagem` | «slide: `<h2>T</h2><figure><img src="img/existe.png" alt="a"></figure>`» | o mesmo com `src="img/sumiu.png"` |
| `recursos.demo-sem-registro` | `<section data-layout="demo" id="a"><h2>D</h2><div class="demo" data-demo="contador"></div></section>` | o mesmo com `data-demo="fantasma"` |
| `recursos.demo-sem-estatico` | o mesmo com `<img class="estatico" src="img/existe.png" alt="d">` dentro da demo | o mesmo sem a imagem |

- [ ] **Step 8: Commitar**

```bash
git add validador build tests
git commit -m "$(cat <<'MSG'
feat(validador): grupo de carga, com os recursos vindos de quem carrega

As regras não abrem arquivo nem executam script: recebem no contexto o que o
navegador ou o Node carregou. No build, o KaTeX compila o TeX do fonte, o
disco responde pelas imagens e os registros de demo saem do texto dos scripts.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: O grupo de composição

**Files:**
- Create: `validador/regras/composicao.js`, `tests/integracao/composicao.test.mjs`
- Modify: `validador/regras/index.js`, `contrato/contrato.json`, `build/servir.mjs`
- Create: 5 pastas de fixture

**Interfaces:**
- Produces: `REGRAS_DE_COMPOSICAO`; a convenção de contexto `{ janela }` para regras que medem; e `papelDe(elemento, papeis)`, que implementa `papeis.precedencia`.

- [ ] **Step 1: Os dois ajustes de contrato que as medidas pedem**

Em `contrato/contrato.json`, no papel `rotulo`, acrescente `".roteiro li"` aos seletores — o roteiro da capa é cromo do sistema e renderiza a 14 px, exatamente o mínimo desse papel. E nas exceções, acrescente `"figcaption code"` e `"p.fonte code"` — código em linha dentro de uma legenda segue o tamanho da legenda por desenho (0,88 × 18 = 15,84 px), e cobrá-lo pelo mínimo de código acusaria legenda legítima.

Sem esses dois ajustes, os seis decks do espécime acusam. Medido.

- [ ] **Step 2: O servidor passa a servir `validador/`**

Em `build/servir.mjs`, acrescente `'validador'` a `PASTAS_DO_SISTEMA`. É o que permite à página importar as regras por `/_aula-usp/validador/regras/composicao.js`, tanto no modo navegador em desenvolvimento quanto no Chrome que a CLI dirige.

- [ ] **Step 3: Escrever o teste de integração, que falha**

Crie `tests/integracao/composicao.test.mjs`:

```js
// Composição (spec 9.2 e 9.3): as cinco regras medidas no Chrome, sobre o espécime e sobre mutações.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { iniciarChrome, servirPasta, RAIZ } from './utilitarios.mjs';

const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));

// Dentro da página: importa o validador pelo caminho do servidor e roda o grupo de composição.
const RODAR = async (contrato) => {
  const { validar } = await import('/_aula-usp/validador/validar.js');
  const { regras } = await import('/_aula-usp/validador/regras/composicao.js');
  return validar(document, { contrato, regras, grupo: 'composicao', janela: window })
    .map((achado) => ({ regra: achado.regra, slide: achado.slide, mensagem: achado.mensagem }));
};

const navegador = await iniciarChrome();
const sitio = await servirPasta('especime');

test.after(async () => {
  await navegador.close();
  await sitio.fechar();
});

async function medir(arquivo, mutacao) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  await pagina.goto(`${sitio.endereco}/${arquivo}?folha`);
  await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
  await pagina.evaluate(() => document.fonts.ready);
  if (mutacao) await pagina.evaluate(mutacao);
  const achados = await pagina.evaluate(RODAR, contrato);
  await pagina.close();
  return achados;
}

test('os seis decks do espécime não têm problema de composição', async () => {
  for (const arquivo of ['index.html', 'componentes.html', 'matematica.html', 'codigo.html', 'ifusp.html', 'muitos-blocos.html']) {
    const achados = await medir(arquivo);
    assert.deepEqual(achados, [], `${arquivo}: ${achados.map((a) => a.mensagem).join(' / ')}`);
  }
});

test('elemento que passa da zona de conteúdo acusa transbordo', async () => {
  const achados = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.width = '2000px';
  });
  assert.equal(achados[0].regra, 'composicao.transbordo');
  assert.match(achados[0].mensagem, /^<p> passa \d+ px da zona de conteúdo\.$/);
});

// A lição do marco 3c: a caixa do <pre> não muda quando uma linha é larga demais.
test('código mais largo que o bloco acusa, mesmo sem mudar a caixa', async () => {
  const achados = await medir('codigo.html', () => {
    const linha = document.querySelector('.slide .area pre .linha');
    linha.textContent = `x = "${'a'.repeat(200)}"`;
  });
  assert.ok(achados.some((achado) => /px de conteúdo além da largura/.test(achado.mensagem)), JSON.stringify(achados));
});

test('título que passa de duas linhas acusa', async () => {
  const achados = await medir('index.html', () => {
    document.querySelector('.slide .area h2').textContent = 'Um título muito comprido '.repeat(6);
  });
  assert.equal(achados[0].regra, 'composicao.linhas-titulo');
  assert.match(achados[0].mensagem, /título renderizado em 3 linhas \(máx\. 2\)\./);
});

test('texto abaixo do mínimo do seu papel acusa, e o papel vem do seletor mais específico', async () => {
  const achados = await medir('index.html', () => {
    document.querySelector('.slide .area p').style.fontSize = '18px';
  });
  assert.equal(achados[0].regra, 'composicao.tamanho-minimo');
  assert.match(achados[0].mensagem, /<p> em 18 px, abaixo do mínimo de 24 px do papel leitura\./);
});

// O roteiro da capa renderiza a 14 px e casa "li" (leitura, 24) e ".roteiro li" (rotulo, 14):
// sem precedência por especificidade, todo deck do espécime acusaria.
test('o roteiro da capa é rótulo, não leitura', async () => {
  const achados = await medir('index.html');
  assert.deepEqual(achados.filter((achado) => /roteiro|li /.test(achado.mensagem)), []);
});

test('azul pequeno e texto sobre amarelo fora da tinta acusam', async () => {
  const azul = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.color = '#1094AB';
    p.style.fontSize = '24px';
  });
  assert.ok(azul.some((achado) => achado.regra === 'composicao.azul-pequeno'), JSON.stringify(azul));

  const amarelo = await medir('index.html', () => {
    const p = document.querySelector('.slide .area p');
    p.style.background = '#FCB421';
    p.style.color = '#FFFFFF';
  });
  assert.ok(amarelo.some((achado) => achado.regra === 'composicao.texto-no-amarelo'), JSON.stringify(amarelo));
});
```

- [ ] **Step 4: Escrever as cinco regras**

Crie `validador/regras/composicao.js`:

```js
// Regras de composição (spec 9.2 e 9.3): o que só o documento renderizado sabe dizer.
// Roda dentro da página — no navegador, no passo 6, antes do motor; no build, no Chrome headless.
// Só API padrão do DOM, como o resto de validador/.
import { onde, trechoDe } from '../validar.js';

const FOLGA = 0.5; // meio pixel, a mesma tolerância dos testes de geometria
const AMARELO = 'rgb(252, 180, 33)';
const AZUL = 'rgb(16, 148, 171)';
const TINTA = 'rgb(10, 10, 10)';
const MINIMO_AZUL = 32; // spec 4.2

// Especificidade do seletor, para o contrato poder dizer "seletor-mais-especifico" e o código obedecer:
// o papel de .roteiro li não é o de li.
function especificidade(seletor) {
  const classes = (seletor.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) ?? []).length;
  const elementos = (seletor.match(/(^|[\s>+~])[a-zA-Z]+/g) ?? []).length;
  return classes * 100 + elementos;
}

function papelDe(elemento, papeis) {
  let escolhido = null;
  let maior = -1;
  for (const [nome, papel] of Object.entries(papeis)) {
    if (nome === 'precedencia' || nome === 'excecoes') continue;
    for (const seletor of papel.seletores) {
      if (!elemento.matches(seletor)) continue;
      const peso = especificidade(seletor);
      if (peso > maior) {
        maior = peso;
        escolhido = { nome, minimo: papel.minimo, seletor };
      }
    }
  }
  return escolhido;
}

// Elementos que o autor escreveu ou que o sistema gerou, fora o que não tem caixa própria.
function* elementosMedidos(slide) {
  for (const elemento of slide.querySelectorAll('*')) {
    if (elemento.nodeName === 'BR') continue;
    if (elemento.closest('.katex, .katex-display')) continue;
    yield elemento;
  }
}

function caixaValida(caixa) {
  return caixa.width > 0 && caixa.height > 0;
}

export const regras = [
  {
    nome: 'composicao.transbordo',
    *aplicar({ slides, janela }) {
      for (const slide of slides) {
        const area = slide.querySelector('.area');
        const zonaDoCorpo = area?.getBoundingClientRect();
        const palco = slide.getBoundingClientRect();
        for (const elemento of elementosMedidos(slide)) {
          const caixa = elemento.getBoundingClientRect();
          if (!caixaValida(caixa)) continue;
          const limite = area?.contains(elemento) ? zonaDoCorpo : palco;
          const passa = Math.max(caixa.right - limite.right, caixa.bottom - limite.bottom);
          if (passa > FOLGA) {
            const lugar = area?.contains(elemento) ? 'da zona de conteúdo' : 'do palco';
            yield { ...onde(slides, slide), mensagem: `<${elemento.nodeName.toLowerCase()}> passa ${Math.round(passa)} px ${lugar}.`, trecho: trechoDe(elemento) };
            continue;
          }
          // Transbordo que a caixa esconde, só onde ele existe: o marco 3c mediu que uma linha de código
          // larga não muda a caixa do <pre>, porque cada linha é um inline-block de largura fixa. Em
          // qualquer outro elemento, o scrollWidth de um ancestral só repetiria o transbordo do filho.
          if (elemento.nodeName === 'PRE' && elemento.scrollWidth > elemento.clientWidth + 1) {
            yield {
              ...onde(slides, slide),
              mensagem: `<${elemento.nodeName.toLowerCase()}> tem ${elemento.scrollWidth - elemento.clientWidth} px de conteúdo além da largura.`,
              trecho: trechoDe(elemento),
            };
          }
        }
      }
    },
  },
  {
    nome: 'composicao.linhas-titulo',
    *aplicar({ slides, contrato, janela }) {
      for (const slide of slides) {
        const titulo = slide.querySelector('.area h1, .area h2');
        if (!titulo) continue;
        const layout = slide.getAttribute('data-layout');
        const chave = layout === 'capa' ? 'capa.h1.linhas' : layout === 'abertura' ? 'abertura.h2.linhas' : 'titulo.linhas';
        const limite = contrato.limites[chave];
        const entrelinha = Number.parseFloat(janela.getComputedStyle(titulo).lineHeight);
        const linhas = Math.round(titulo.getBoundingClientRect().height / entrelinha);
        if (linhas > limite) {
          yield { ...onde(slides, slide), mensagem: `título renderizado em ${linhas} linhas (máx. ${limite}).`, trecho: trechoDe(titulo) };
        }
      }
    },
  },
  {
    nome: 'composicao.tamanho-minimo',
    *aplicar({ slides, contrato, janela }) {
      for (const slide of slides) {
        for (const elemento of elementosMedidos(slide)) {
          if (contrato.papeis.excecoes.some((seletor) => elemento.matches(seletor))) continue;
          const papel = papelDe(elemento, contrato.papeis);
          if (!papel) continue;
          const tamanho = Number.parseFloat(janela.getComputedStyle(elemento).fontSize);
          if (tamanho < papel.minimo - FOLGA) {
            yield {
              ...onde(slides, slide),
              mensagem: `<${elemento.nodeName.toLowerCase()}> em ${tamanho} px, abaixo do mínimo de ${papel.minimo} px do papel ${papel.nome}.`,
              trecho: trechoDe(elemento),
            };
          }
        }
      }
    },
  },
  {
    nome: 'composicao.azul-pequeno',
    *aplicar({ slides, janela }) {
      for (const slide of slides) {
        for (const elemento of elementosMedidos(slide)) {
          if (!elemento.textContent.trim()) continue;
          const estilo = janela.getComputedStyle(elemento);
          if (estilo.color !== AZUL) continue;
          const tamanho = Number.parseFloat(estilo.fontSize);
          if (tamanho < MINIMO_AZUL) {
            yield { ...onde(slides, slide), mensagem: `texto em azul com ${tamanho} px (mín. ${MINIMO_AZUL}).`, trecho: trechoDe(elemento) };
          }
        }
      }
    },
  },
  {
    nome: 'composicao.texto-no-amarelo',
    *aplicar({ slides, janela }) {
      for (const slide of slides) {
        for (const elemento of elementosMedidos(slide)) {
          const estilo = janela.getComputedStyle(elemento);
          if (estilo.backgroundColor !== AMARELO) continue;
          // O campo amarelo pinta o fundo; quem escreve texto nele são os descendentes, o próprio incluído.
          for (const dentro of [elemento, ...elemento.querySelectorAll('*')]) {
            if (!dentro.textContent.trim()) continue;
            const cor = janela.getComputedStyle(dentro).color;
            if (cor !== TINTA) {
              yield { ...onde(slides, slide), mensagem: `texto sobre amarelo em ${cor}, não em tinta.`, trecho: trechoDe(dentro) };
            }
          }
        }
      }
    },
  },
];
```

Acrescente ao registro, em `validador/regras/index.js`:

```js
import { regras as composicao } from './composicao.js';

export const REGRAS_DE_COMPOSICAO = composicao;
```

- [ ] **Step 5: Rodar**

Rode: `node --test tests/integracao/composicao.test.mjs` — 7 testes.
Rode: `npm test` — 311, sem mudança (as regras de composição não têm teste unitário: elas medem, e medir exige navegador).

- [ ] **Step 6: As cinco fixtures**

Estas fixtures existem para a varredura (spec 11.1 pede uma por regra) e para o marco 6 mostrar exemplos. Como a varredura roda sem navegador, ela só confirma que a regra existe e não acusa fora do Chrome; anote isso no comentário do teste.

| pasta | bom.html | ruim.html |
|---|---|---|
| `composicao.transbordo` | «slide: `<h2>T</h2><p>Cabe.</p>`» | «slide: `<h2>T</h2><table><tbody>` + oito linhas de `<tr><td>alto</td></tr>` + `</tbody></table>`» |
| `composicao.linhas-titulo` | «slide: `<h2>Título curto</h2><p>C.</p>`» | «slide: `<h2>` + "Um título muito comprido " repetido 6 vezes + `</h2><p>C.</p>`» |
| `composicao.tamanho-minimo` | «slide: `<h2>T</h2><p>Texto de leitura.</p>`» | «slide: `<h2>T</h2><p><sub>quase invisível</sub></p>`» |
| `composicao.azul-pequeno` | «slide: `<h2>T</h2><figure><svg viewBox="0 0 10 10"><text fill="#1094AB" font-size="32">oi</text></svg></figure>`» | o mesmo com `font-size="20"` |
| `composicao.texto-no-amarelo` | «slide: `<h2>T</h2><aside class="destaque">Sobre amarelo, tinta.</aside>`» | «slide: `<h2>T</h2><aside class="destaque"><a href="https://x">link sobre amarelo</a></aside>`» |

- [ ] **Step 7: Commitar**

```bash
git add validador contrato build tests
git commit -m "$(cat <<'MSG'
feat(validador): grupo de composição, medido na página renderizada

As cinco regras rodam dentro do navegador, sobre todos os slides dispostos.
O papel de um elemento passa a sair do seletor mais específico, como o
contrato já dizia: o roteiro da capa é rótulo de 14 px, não leitura de 24.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: O navegador — cópia, passos 3 e 6, e o painel

**Files:**
- Modify: `montar/navegador.js`, `motor/paineis.js`, `motor/navegacao.js`, `motor/rotulos.js`, `estilos/motor.css`
- Create: `tests/integracao/painel.test.mjs`

**Interfaces:**
- Consumes: `REGRAS_ESTATICAS`, `REGRAS_DE_CARGA`, `REGRAS_DE_COMPOSICAO`, `linhaDe`, `cabecalhoDe`, `contar`.
- Produces: `paineis.mostrarAchados(achados)`; a ação `validador` do motor; a tecla V.

- [ ] **Step 1: A cópia do documento, antes de montar**

Em `montar/navegador.js`, no passo 2 da spec 3.2, guarde a cópia **do documento inteiro**, não só do corpo:

```js
  // Passo 2 da spec 3.2: o fonte, antes de qualquer alteração. O documento inteiro, porque o validador
  // lê as metas do <head> — passar só o corpo dá cinco erros falsos de metadados (revisão do marco 4b).
  const fonte = document.cloneNode(true);
```

- [ ] **Step 2: Os três grupos, nos momentos da spec 9.3**

Ainda em `montar/navegador.js`: as estáticas logo depois da cópia (passo 3), e as de carga e composição depois de montar, renderizar e `document.fonts.ready`, **antes** de `iniciarMotor` (passo 6) — é o único momento em que todos os slides ainda estão dispostos.

```js
  const estaticos = validar(fonte, { contrato, regras: REGRAS_ESTATICAS, grupo: 'estatica', unidades });
```

e, depois das fontes:

```js
  const recursos = {
    tex: errosDeTex,
    imagens: new Map([...document.querySelectorAll('img')].map((img) => [img.getAttribute('src') ?? '', img.complete && img.naturalWidth > 0])),
    demos: new Map(Object.entries(window.AulaUSP?.demos ?? {}).map(([nome, demo]) => [nome, { capturar: typeof demo.capturar === 'function' }])),
  };
  const achados = [
    ...estaticos,
    ...validar(document, { contrato, regras: REGRAS_DE_CARGA, grupo: 'carga', recursos }),
    ...validar(document, { contrato, regras: REGRAS_DE_COMPOSICAO, grupo: 'composicao', janela: window }),
  ];
```

Os erros que hoje vão para `console.error` — de `renderizarTex` e de `renderizarCodigo` — passam a alimentar `recursos.tex` e o painel, que é o que as revisões dos marcos 3b e 3c pediram. Mantenha também o `console.error`: um aviso no console não custa nada e ajuda quem abre o devtools.

**Cuidado medido:** no modo palco, só o slide visível tem geometria; as regras de composição precisam rodar antes do motor. Se alguém mover esta chamada para depois de `iniciarMotor`, todo slide que não é o primeiro mede 0×0 e o transbordo some. Deixe o comentário dizendo isso.

- [ ] **Step 3: O painel**

Em `motor/rotulos.js`, acrescente `validador` e `copiarParaOChat` aos dois idiomas, e uma linha na tabela de teclas (`V`, "validador"). Em `motor/navegacao.js`, `v` e `V` mapeiam para `'validador'`.

Em `motor/paineis.js`, crie o quarto painel e a ação, no mesmo formato dos outros. O painel mostra o cabeçalho (`cabecalhoDe`) e uma linha por achado (`linhaDe`), e traz um botão que copia o texto inteiro:

```js
  const copiar = elemento(doc, 'button', 'copiar', rot.copiarParaOChat);
  copiar.type = 'button';
  copiar.addEventListener('click', () => doc.defaultView.navigator.clipboard?.writeText(textoDosAchados(achados)));
```

Abrir sozinho: só quando há **erro** e a página não está em tela cheia (spec 3.2). Aviso não abre painel.

```js
  // Spec 3.2: o painel abre sozinho só com erro, e não interrompe quem está projetando.
  if (contar(achados).erros > 0 && !doc.fullscreenElement) abrir('validador');
```

- [ ] **Step 4: O estilo do painel**

Em `estilos/motor.css`, o painel do validador reusa `.painel`; acrescente só o que é dele: a lista em `--tipo-codigo-familia` a 18 px, com a severidade em negrito, e o botão no canto. Sem cor nova: erro em tinta, aviso em cinza.

- [ ] **Step 5: O teste de integração**

Crie `tests/integracao/painel.test.mjs`, com quatro casos: uma aula limpa não abre painel nenhum; uma aula com erro abre o painel sozinho; a tecla V alterna; e o texto copiado começa pelo cabeçalho `Validador Aula USP:`. Use uma fixture nova em `tests/fixtures/painel/` — uma aula com um erro de estrutura fácil de causar (um `h2` faltando).

- [ ] **Step 6: Rodar e commitar**

Rode: `node --test tests/integracao/painel.test.mjs` — 4 testes.
Rode, um por vez, os arquivos que a mudança em `navegador.js` e `paineis.js` toca: `carregador` (2), `paineis` (7), `apresentador` (9), `motor` (11), `matematica` (6), `codigo` (8).

```bash
git add montar motor estilos tests
git commit -m "$(cat <<'MSG'
feat(navegador): valida a aula ao carregar e mostra o resultado no painel

A cópia do documento inteiro vira o fonte das regras estáticas; as de carga e
composição rodam depois das fontes e antes do motor, que é quando todos os
slides ainda estão dispostos. O painel abre sozinho só quando há erro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: A CLI com Chrome

**Files:**
- Create: `build/composicao.mjs`
- Modify: `bin/aula-usp.mjs`, `build/validar.mjs`, `tests/unit/validar-cli.test.mjs`, `tests/integracao/validador.test.mjs`

- [ ] **Step 1: Medir a composição pelo Chrome**

Crie `build/composicao.mjs`:

```js
// Composição pelo Chrome (spec 9.3, etapa 5): sobe o servidor, abre a aula com todos os slides
// dispostos e roda o grupo dentro da página, que é o único lugar onde geometria e cor existem.
// Sem Chrome, devolve null: a spec 8.1 diz que falta de Chrome é aviso, não falha.
import { basename, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { criarServidor } from './servir.mjs';

// Roda dentro da página: importa o validador pelo caminho que o servidor de desenvolvimento publica.
const NA_PAGINA = async (contrato) => {
  const { validar } = await import('/_aula-usp/validador/validar.js');
  const { regras } = await import('/_aula-usp/validador/regras/composicao.js');
  return validar(document, { contrato, regras, grupo: 'composicao', janela: window });
};

function abrirChrome() {
  const opcoes = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' };
  return chromium.launch(opcoes);
}

export async function medirComposicao(caminhoDaAula, { contrato }) {
  let navegador;
  try {
    navegador = await abrirChrome();
  } catch (erro) {
    return { achados: null, motivo: erro.message };
  }
  const servidor = criarServidor({ pastaAula: dirname(caminhoDaAula) });
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
    // ?folha dispõe todos os slides e não inicia o motor: é o estado em que a composição se mede.
    await pagina.goto(`http://127.0.0.1:${servidor.address().port}/${basename(caminhoDaAula)}?folha`);
    await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
    const estado = await pagina.evaluate(() => document.body.dataset.montado);
    if (estado !== 'sim') throw new Error(`a montagem terminou em "${estado}"`);
    await pagina.evaluate(() => document.fonts.ready);
    return { achados: await pagina.evaluate(NA_PAGINA, contrato), motivo: null };
  } finally {
    await navegador.close();
    await new Promise((fim) => {
      servidor.closeAllConnections();
      servidor.close(fim);
    });
  }
}
```

Medido no rascunho: sobre `especime/index.html` devolve zero achados; com um `h2` de 150 caracteres devolve `composicao.linhas-titulo: título renderizado em 3 linhas (máx. 2).`; e com `CHROME_PATH` apontando para um caminho inexistente devolve `achados: null` com o motivo do Chrome, que é o que vira aviso.

- [ ] **Step 2: A CLI**

`validar` ganha a composição quando há Chrome (spec 8.1: "roda as regras estáticas e de carga e, havendo Chrome, as de composição"). Sem Chrome, imprime um aviso explicando que a composição foi pulada e continua com o código de saída que os outros grupos determinam.

- [ ] **Step 3: Testes**

Na CLI: uma aula com transbordo sai com 1 e a mensagem cita `composicao.transbordo`; com `CHROME_PATH` apontando para um caminho inexistente, a CLI avisa e não falha por isso.

Na integração: `validar especime/` continua em `0 erros, 0 avisos` **com** a composição ligada — é a prova de que os três grupos convivem.

- [ ] **Step 4: Rodar tudo**

`npm test`, e a integração inteira, um arquivo por vez. Ao final: 13 arquivos de integração.

- [ ] **Step 5: Commitar**

```bash
git add build bin tests
git commit -m "$(cat <<'MSG'
feat(cli): validar mede composição quando há Chrome

Sobe o servidor, abre a aula em folha e roda o grupo dentro da página. Sem
Chrome, avisa e segue: a spec 8.1 diz que falta de Chrome não é falha.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Decisões tomadas neste plano

1. **A composição roda antes do motor**, no navegador, e em `?folha` no Chrome — porque no modo palco só o slide visível tem geometria. Medido: `.area` dos demais dá 0×0.
2. **`.roteiro li` vira papel `rotulo`** e o desempate de papel passa a ser por especificidade de seletor, como `papeis.precedencia` já declarava e nenhum código lia.
3. **`figcaption code` e `p.fonte code` entram nas exceções de papel**: 15,84 px é o tamanho de projeto de código em legenda.
4. **`.tex-invalido` não entra em papel nenhum** — medido a 21,12 px em linha e 20 px em bloco, fora de todos os seletores de papel. Fecha o item aberto pela revisão do marco 3b.
5. **`scrollWidth` só no `pre`**, senão cada ancestral rolável repete o transbordo do filho.
6. **As regras de carga não carregam nada**: recebem `recursos` prontos. É o que deixa a mesma regra valer no navegador e no build, onde as fontes de verdade são diferentes.
7. **O painel abre sozinho só com erro e fora de tela cheia**; aviso vai para o painel e para o console, mas não interrompe.
8. **O servidor de desenvolvimento passa a servir `validador/`**, que é como a página importa as regras nos dois modos.

## O que os marcos 5 e 6 herdam

- `matematica.simbolo-fora-do-tex` e `saida.glifo-ausente`, com `validador/cobertura.json` gerado por `aula-usp dist` a partir do `cmap`.
- O grupo de saída inteiro (`saida.*`), que roda sobre o HTML e o PDF finais.
- A etapa 5 da spec 3.3: o build roda composição no Chrome sobre o HTML final embutido, não sobre a aula servida — `build/composicao.mjs` deste marco é o ponto de partida, mas o endereço muda.
- Para o guia (marco 6): o painel e a tecla V; a explicação de por que um aviso não abre o painel; e a lista de erros que o autor mais vai ver.
- Os itens Minor adiados nos marcos 4a e 4b, listados nas revisões guardadas em `docs/superpowers/revisoes/`.
