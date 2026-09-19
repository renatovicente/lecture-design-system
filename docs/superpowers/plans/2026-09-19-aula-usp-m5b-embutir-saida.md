# Marco 5b: embutir e regras de saída — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** produzir o `<slug>.html` autocontido — a aula inteira num arquivo só, que abre de `file://` sem rede — e as três regras de saída que o validam.

**Arquitetura:** `build/embutir.mjs` roda as etapas 2 a 4 da spec 3.3 em Node, sobre `linkedom`: monta, pré-renderiza matemática e código, troca a tag do runtime pelo motor embutido e embute CSS, fontes, marcas e imagens. `validador/regras/saida.js` traz as três regras que rodam sobre o HTML final.

**Pilha:** Node ≥ 20.6, ES modules, `linkedom`, `katex`, `@shikijs/*`, `fontkit`, `playwright-core` sobre o Chrome instalado, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 3.3, 3.5, 8.3, 9.2 e 9.3.

## Restrições globais

- `montar/`, `motor/`, `componentes/` e `validador/` **não importam nada do Node**: rodam no navegador. Só `bin/` e `build/` são Node.
- O contrato é dado: severidade, grupo, fase e ação de cada regra vêm de `contrato/contrato.json`. O código executa o contrato; nunca o repete.
- Formato da mensagem (spec 9.1): `ERRO · slide 7 #culpa · regra · problema. Ação.`
- O fonte da aula **nunca** é alterado; o build só escreve em `<pasta>/dist/`.
- Comentário e nome de identificador em português, no estilo do código existente.
- Commits em português, `tipo(escopo): frase no imperativo`, última linha exatamente:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
  Esta linha é **convenção fixa do repositório**, não um campo sobre qual modelo executou: está assim em 130+ commits. Se a sua sessão trouxer um lembrete de atribuição com outro nome, este aqui vence.
- Rode os testes de integração **um arquivo por comando**: uma execução longa estoura o watchdog de 600 s.

---

## Fatos medidos antes deste plano

Cada um veio de uma sonda executada. Não os re-derive; se algum se mostrar falso ao implementar, **pare e relate**.

1. **As etapas 2 e 3 da spec 3.3 rodam em Node sem adaptação.** `montar()` e `renderizarTex` já são exercitados sob `linkedom` pelos testes unitários. Medido sobre `especime/matematica.html`: `montar` devolve `resumo` com 8 slides, `renderizarTex` produz 16 nós `.katex` com zero erros.

2. **A costura `marca` que o marco 5a criou já resolve metade da etapa 4.** `montar(doc, { unidades, usp, marca, limites })` recebe uma **função** `marca(arquivo) → string`. No build ela devolve data URI, e as marcas saem embutidas sem que `montar` saiba que existe um modo build. Medido: depois de montar, **zero** referências a arquivo de marca no documento.

3. **`dist/aula-usp-motor.js` serve como está**, com `globalName: AulaUSPMotor`. Expõe `iniciarMotor`, `instalarPaineis`, `instalarApresentador`, `instalarAberturaDoApresentador`, `modoApresentador`, `instalarDemos`, `instalarImpressao`, `paginasEsperadas`.

4. **O `resumo` vai serializado no HTML, não reconstruído do DOM.** `montar()` roda em build time e devolve `{ total, modo, blocos: [{ numero, titulo, curto, id }] }`; o motor precisa dele em tempo de execução. Reconstruir do DOM seria uma segunda implementação do que `montar` calculou — a classe de defeito "duas verdades que divergem", que custou caro nos marcos 3 e 4.

5. **A fila de `AulaUSP.demo` continua sendo a primeira coisa a existir.** O `<script>` inline do autor roda durante o parsing; o script do motor entra no lugar da tag do runtime, que fica **antes** dele, e instala a fila de forma síncrona. `iniciarMotor` e os instaladores vão no `DOMContentLoaded`.

6. **`url()` dentro de `<style>` inline resolve contra a página, não contra o pacote.** No HTML final não existe "página do sistema" nenhuma — qualquer caminho relativo erra. Foi assim que as fontes do sistema quebraram no marco 5a, e vale igual aqui, para as fontes do sistema e as do KaTeX.

7. **Prova de ponta a ponta já obtida.** O HTML construído de `especime/matematica.html` tem **1039,8 kB**, 2 scripts e **zero `src` externo**. Aberto direto de `file://` num Chrome de verdade: `montado=sim`, 8 slides, palco criado, `AulaUSP.prepararImpressao` é `function`, 16 nós `.katex`, título renderizado em **Geist**, seta direita navega da capa para o primeiro bloco, **zero pedidos de rede** e **zero erros de console**.

8. **`saida.glifo-ausente` NÃO pode usar `validador/cobertura.json`.** Medido: sete caracteres dentro de `.katex` no HTML construído — `η ← ∇ ∑ ⊤ Δ ⋅` — estão **fora** da cobertura das fontes do sistema, e as fontes do KaTeX cobrem os sete. Alimentada pelo arquivo do sistema, a regra acusaria sete erros falsos numa aula correta. A cobertura do HTML final é **sistema ∪ famílias do KaTeX efetivamente embutidas**, e como a spec 3.3 manda embutir "só as que a aula usa", ela varia por aula.

9. **`saida.referencia-externa` NÃO pode usar regex sobre o texto do arquivo.** Medido: das 69 `url()` do HTML construído, uma aparece como externa — e é `url(${o}#${t.get(n)})`, dentro do JavaScript minificado do motor (o trecho de `motor/copias.js` que reescreve referências `url(#id)` de SVG). Código, não CSS. A regra percorre o DOM.

10. **`saida.tamanho`**: o HTML final da aula mais pesada do espécime tem 1,02 MB; o aviso é acima de 10 MB. Folga de um fator dez.

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `build/embutir.mjs` | **novo.** Node. As etapas 2 a 4 da spec 3.3: monta, pré-renderiza, troca a tag do runtime, embute tudo. Exporta `construirHtml`. |
| `build/fontes-embutidas.mjs` | **novo.** Node. Escolhe e embute as fontes — as do sistema sempre, as do KaTeX só as famílias que a aula usa — e devolve a cobertura do que embutiu. |
| `validador/regras/saida.js` | **novo.** Puro. As três regras `saida.*` que rodam sobre o HTML final. |
| `validador/regras/index.js` | **modificado.** Ganha `REGRAS_DE_SAIDA`. |
| `build/construir.mjs` | **novo.** Node. Amarra: constrói, roda as regras de saída, grava `<slug>.html` e `validacao.json`. |
| `tests/integracao/construido.test.mjs` | **novo.** Abre o HTML construído de `file://` num Chrome de verdade. |

**Interfaces entre as tarefas:**

- Tarefa 1 **produz** `construirHtml({ raiz, caminhoDaAula, fontes }) → Promise<{ html, resumo, doc, errosDeTex, errosDeCodigo }>`. `raiz` é a URL da raiz do sistema; `caminhoDaAula` o arquivo da aula; `fontes` o resultado da tarefa 2.
- Tarefa 2 **produz** `embutirFontes({ raiz, doc }) → Promise<{ css, cobertura, familias }>`. `css` é o texto das `@font-face` com as fontes em data URI; `cobertura` é um `Set<number>` dos pontos de código com glifo **no que foi embutido**; `familias` a lista de famílias do KaTeX incluídas.
- Tarefa 3 **produz** `REGRAS_DE_SAIDA` e consome `cobertura` e `bytes` do contexto de `validar`.
- Tarefa 4 **consome** as três anteriores.

---

## Tarefa 1: `build/embutir.mjs` — o HTML autocontido

**Arquivos:**
- Criar: `build/embutir.mjs`
- Teste: `tests/unit/embutir.test.mjs` (novo)

**Interfaces:**
- Consome: `embutirFontes` da tarefa 2 — mas **não a implemente aqui**; receba o resultado como parâmetro `fontes` e deixe o teste passar um coto.
- Produz: `construirHtml({ raiz, caminhoDaAula, fontes })`, descrita acima.

- [ ] **Passo 1: escrever o teste que falha primeiro**

Criar `tests/unit/embutir.test.mjs`. O teste afirma a **forma** do HTML produzido, não o conteúdo exato — o conteúdo é do espécime e muda.

```js
// O HTML final é a entrega do marco: a aula inteira num arquivo, que abre sem rede. Este teste mede
// isso em Node (rápido); quem prova que ele VIVE é tests/integracao/construido.test.mjs, no Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirHtml } from '../../build/embutir.mjs';

const RAIZ = new URL('../../', import.meta.url);
// Coto das fontes: a tarefa 2 é quem as embute de verdade. Aqui só precisamos de CSS plausível.
const FONTES = { css: '@font-face{font-family:Geist;src:url(data:font/woff2;base64,AA==)}', cobertura: new Set(), familias: [] };

test('constrói um HTML sem nenhuma referência externa', async () => {
  const { html, doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), fontes: FONTES });
  const externos = [...doc.querySelectorAll('[src]')]
    .map((elemento) => elemento.getAttribute('src'))
    .filter((valor) => valor && !valor.startsWith('data:'));
  assert.deepEqual(externos, [], `sobrou src externo: ${externos.join(', ')}`);
  assert.equal(doc.querySelectorAll('link[rel="stylesheet"]').length, 0);
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'o HTML final precisa do doctype');
});

test('a tag do runtime some e o motor embutido entra no lugar dela', async () => {
  const { doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), fontes: FONTES });
  const comSrc = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
  assert.deepEqual(comSrc.filter((s) => s.endsWith('/aula-usp.js')), [], 'a tag do runtime continua lá');
  const embutidos = [...doc.querySelectorAll('script:not([src])')].map((s) => s.textContent);
  assert.ok(embutidos.some((t) => t.includes('AulaUSPMotor')), 'o motor embutido não entrou');
});

// Fato 4: reconstruir o resumo do DOM seria uma segunda implementação do que montar() calculou.
test('o resumo que montar() devolveu vai serializado no HTML, com os mesmos blocos', async () => {
  const { doc, resumo } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), fontes: FONTES });
  const arranque = [...doc.querySelectorAll('script:not([src])')].map((s) => s.textContent).join('\n');
  assert.ok(arranque.includes(JSON.stringify(resumo.blocos[0].id)), 'o id do primeiro bloco não está no arranque');
  // Sem "ou": JSON.stringify produz exatamente esta forma. Um ou aqui só faria o teste passar mais fácil.
  assert.ok(arranque.includes(`"total":${resumo.total}`), 'o total não está no arranque');
});

// Fato 5: a fila tem de existir antes do <script> do autor, que roda durante o parsing.
test('a fila de demos é instalada antes de qualquer script do autor', async () => {
  const { doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/index.html', RAIZ), fontes: FONTES });
  const scripts = [...doc.querySelectorAll('script')];
  const ondeAFila = scripts.findIndex((s) => s.textContent.includes('filaDeDemos'));
  const ondeOAutor = scripts.findIndex((s) => !s.src && s.textContent.includes('AulaUSP.demo('));
  assert.ok(ondeAFila >= 0, 'ninguém instala a fila');
  if (ondeOAutor >= 0) assert.ok(ondeAFila < ondeOAutor, 'a fila é instalada depois do script do autor');
});

// Spec 3.3: o fonte nunca é alterado.
test('construir não toca no arquivo da aula', async () => {
  const { readFile } = await import('node:fs/promises');
  const caminho = new URL('especime/matematica.html', RAIZ);
  const antes = await readFile(caminho, 'utf8');
  await construirHtml({ raiz: RAIZ, caminhoDaAula: caminho, fontes: FONTES });
  assert.equal(await readFile(caminho, 'utf8'), antes);
});

test('a matemática é pré-renderizada: o HTML final tem KaTeX e não tem delimitador cru', async () => {
  const { doc } = await construirHtml({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), fontes: FONTES });
  assert.ok(doc.querySelectorAll('.katex').length > 10);
  const corpo = doc.body.textContent;
  assert.equal(/\\\(|\\\[/.test(corpo), false, 'sobrou delimitador de TeX não renderizado');
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/embutir.test.mjs
```

Esperado: FALHA, `Cannot find module '../../build/embutir.mjs'`.

- [ ] **Passo 3: escrever `build/embutir.mjs`**

```js
// Etapas 2 a 4 da spec 3.3, em Node sobre linkedom: monta, pré-renderiza, troca a tag do runtime
// pelo motor embutido e embute tudo o que a aula precisa. O fonte nunca é alterado — só lido.
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import katex from 'katex';
import { montar } from '../montar/montar.js';
import { renderizarTex } from '../componentes/tex.js';
import { criarDestacador, renderizarCodigo } from '../componentes/codigo.js';

const ESTILOS = ['tokens', 'fontes', 'base', 'layouts', 'componentes', 'motor', 'impressao'];

const TIPOS = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

async function comoDataUri(caminho) {
  const bytes = await readFile(caminho);
  const ponto = caminho.pathname ? caminho.pathname.lastIndexOf('.') : String(caminho).lastIndexOf('.');
  const extensao = String(caminho).slice(ponto).toLowerCase();
  return `data:${TIPOS[extensao] ?? 'application/octet-stream'};base64,${bytes.toString('base64')}`;
}

// O arranque do HTML construído. Duas partes, e a ordem entre elas é o motivo de o marco 5a existir:
// a fila de AulaUSP.demo é instalada de forma SÍNCRONA, aqui, porque o <script> inline do autor roda
// durante o parsing e chama AulaUSP.demo antes de qualquer evento. O resto espera o DOMContentLoaded.
// O resumo vem serializado de montar(), e não reconstruído do DOM: reconstruir seria uma segunda
// implementação do que montar já calculou, e duas verdades divergem (marcos 3 e 4).
const arranqueDe = (resumo) => `
window.AulaUSP = window.AulaUSP || {};
window.AulaUSP.filaDeDemos = [];
window.AulaUSP.demo = function (nome, definicao) { window.AulaUSP.filaDeDemos.push({ nome: nome, definicao: definicao }); };
document.addEventListener('DOMContentLoaded', function () {
  var resumo = ${JSON.stringify(resumo)};
  var M = AulaUSPMotor;
  var motor = M.iniciarMotor({ doc: document, janela: window, resumo: resumo });
  if (M.modoApresentador(window)) {
    M.instalarApresentador(motor);
  } else {
    var paineis = M.instalarPaineis(motor);
    var demos = M.instalarDemos(motor, window.AulaUSP);
    M.instalarAberturaDoApresentador(motor, paineis);
    M.instalarImpressao(motor, { demos: demos, paineis: paineis, api: window.AulaUSP });
  }
  document.body.dataset.montado = 'sim';
});`;

export async function construirHtml({ raiz, caminhoDaAula, fontes }) {
  const { document } = parseHTML(await readFile(caminhoDaAula, 'utf8'));
  const contrato = JSON.parse(await readFile(new URL('contrato/contrato.json', raiz), 'utf8'));

  // Etapa 2. `marca` é função desde o marco 5a: aqui ela devolve data URI, e montar() não sabe disso.
  // montar() a chama de forma SÍNCRONA, então os três arquivos são lidos antes e fechados num mapa —
  // não dá para resolver com await dentro da função.
  const unidades = JSON.parse(await readFile(new URL('assets/marcas/unidades.json', raiz), 'utf8'));
  const usp = JSON.parse(await readFile(new URL('assets/marcas/usp.json', raiz), 'utf8'));
  const arquivosDeMarca = [...new Set([...Object.values(unidades).map((u) => u.arquivo), usp.arquivo])];
  const marcas = new Map(await Promise.all(arquivosDeMarca.map(async (arquivo) =>
    [arquivo, await comoDataUri(new URL(`assets/marcas/${arquivo}`, raiz))])));
  const resumo = montar(document, {
    unidades,
    usp,
    marca: (arquivo) => marcas.get(arquivo) ?? '',
    limites: { minBlocos: contrato.limites['blocos.min'], maxFileira: contrato.limites['blocos.maxFileira'] },
  });

  // Etapa 3. A matemática entra antes do motor: cada \passo vira data-passo, que o motor conta.
  const errosDeTex = renderizarTex(document.body, { katex });
  const errosDeCodigo = await prerenderizarCodigo(document, contrato);

  // Etapa 4. CSS do sistema, com as fontes que a tarefa 2 embutiu.
  const css = (await Promise.all(ESTILOS.map((nome) => readFile(new URL(`estilos/${nome}.css`, raiz), 'utf8')))).join('\n');
  const folha = document.createElement('style');
  folha.textContent = `${fontes.css}\n${css}`;
  document.head.append(folha);

  // Etapa 4. A tag do runtime sai; o motor embutido e o arranque entram no lugar dela, nessa ordem.
  const tag = [...document.querySelectorAll('script[src]')]
    .find((script) => (script.getAttribute('src') ?? '').endsWith('/aula-usp.js'));
  if (!tag) throw new Error('a aula não tem a tag do runtime (src terminado em /aula-usp.js)');
  const motor = document.createElement('script');
  motor.textContent = await readFile(new URL('dist/aula-usp-motor.js', raiz), 'utf8');
  const arranque = document.createElement('script');
  arranque.textContent = arranqueDe(resumo);
  tag.replaceWith(motor);
  motor.after(arranque);

  const html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}\n`;
  return { html, resumo, doc: document, errosDeTex, errosDeCodigo };
}
```

> **Duas coisas que este esqueleto deixa para você resolver, e que o teste do passo 1 cobra:**
> **(a)** `marca` precisa devolver o data URI de verdade, e `montar()` a chama de forma **síncrona** — então leia os três arquivos de marca **antes** de chamar `montar` e feche sobre um mapa. **(b)** `prerenderizarCodigo` não existe: escreva-a, importando as gramáticas só das linguagens que a aula usa, como `montar/entrada.js` faz. **(c)** As imagens do autor (`img[src]` que não sejam `data:`) precisam virar data URI, resolvidas **relativas à pasta da aula**, não à raiz do sistema.

- [ ] **Passo 4: rodar e ver passar**

```bash
node --test tests/unit/embutir.test.mjs
```

Esperado: 6 passam.

- [ ] **Passo 5: conferir a inversão do teste mais importante**

Troque a ordem em que o motor e o arranque entram (ponha o arranque antes do motor) e confirme que o teste da fila **não** pega — ele mede a posição relativa ao script do autor, não ao motor. Depois mova a instalação da fila para dentro do `DOMContentLoaded` e confirme que o teste da fila **falha**. Restaure e cole as duas saídas: o ponto é saber o que este teste guarda e o que não guarda.

- [ ] **Passo 6: commitar**

```bash
git add build/embutir.mjs tests/unit/embutir.test.mjs
git commit -m "feat(build): constrói o HTML autocontido da aula, com o motor embutido"
```

---

## Tarefa 2: `build/fontes-embutidas.mjs` — as fontes e a cobertura do que foi embutido

**Arquivos:**
- Criar: `build/fontes-embutidas.mjs`
- Teste: `tests/unit/fontes-embutidas.test.mjs` (novo)

**Interfaces:**
- Consome: nada das outras tarefas.
- Produz: `embutirFontes({ raiz, doc }) → Promise<{ css, cobertura, familias }>`.

A spec 8.3 diz que as fontes do sistema são Geist, Geist Mono e Open Sans. A spec 3.3, etapa 4, diz que o build embute "fontes (das famílias do KaTeX, **só as que a aula usa**)". Esta tarefa faz as duas coisas e, de quebra, devolve a cobertura de glifos do resultado — que é o que a tarefa 3 precisa, e que o fato 8 mostra não poder vir de `validador/cobertura.json`.

- [ ] **Passo 1: escrever o teste que falha primeiro**

```js
// A cobertura do HTML final é sistema ∪ KaTeX embutido, e varia por aula. Os números aqui foram
// medidos nas fontes deste repositório; se a sua contagem divergir, PARE e relate, não ajuste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { embutirFontes } from '../../build/fontes-embutidas.mjs';

const RAIZ = new URL('../../', import.meta.url);
const documentoDe = async (caminho) => parseHTML(await readFile(new URL(caminho, RAIZ), 'utf8')).document;

test('as oito fontes do sistema entram sempre, como data URI', async () => {
  const { css } = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  const embutidas = [...css.matchAll(/data:font\/woff2;base64,/g)].length;
  assert.ok(embutidas >= 8, `só ${embutidas} fontes embutidas; as do sistema são 8`);
  assert.equal(/url\((?!data:)/.test(css), false, 'sobrou url() que não é data URI');
});

// Fato 8: sem as fontes do KaTeX, sete caracteres de uma aula com matemática ficariam sem glifo.
test('uma aula com matemática traz também a cobertura do KaTeX', async () => {
  const semTex = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  const comTex = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/matematica.html') });
  assert.ok(comTex.familias.length > 0, 'nenhuma família do KaTeX foi incluída numa aula com TeX');
  assert.ok(comTex.cobertura.size > semTex.cobertura.size, 'a cobertura não cresceu com o KaTeX');
  for (const caractere of 'η←∇∑⊤Δ⋅') {
    assert.ok(comTex.cobertura.has(caractere.codePointAt(0)), `${caractere} deveria ter glifo no HTML final`);
  }
});

test('uma aula sem matemática não carrega fonte de KaTeX nenhuma', async () => {
  const { familias, css } = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  assert.deepEqual(familias, [], `aula sem TeX trouxe famílias do KaTeX: ${familias.join(', ')}`);
  assert.equal(css.includes('KaTeX_'), false);
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/fontes-embutidas.test.mjs
```

Esperado: FALHA, módulo inexistente.

- [ ] **Passo 3: implementar**

O desenho, em três decisões que você não precisa redescobrir:

- **Quais famílias do KaTeX a aula usa** se descobre depois de `renderizarTex` ter rodado, lendo as classes que o KaTeX põe nos elementos (`.mathnormal`, `.mathit`, `.amsrm`, e as de tamanho). Mas `embutirFontes` recebe o `doc` **antes** da renderização na tarefa 1 — então **mude a ordem**: chame `embutirFontes` depois de `renderizarTex`, e diga isso no relatório. Se preferir outra forma de descobrir as famílias, meça e justifique.
- **A CSS do KaTeX** vem de `node_modules/katex/dist/katex.min.css`; reescreva os `url(fonts/…)` para data URI só das famílias incluídas, e troque as demais por `url()` — que é como o marco 5a resolveu o fallback de formatos não-woff2, e o Chrome simplesmente pula essa entrada de `src`.
- **A cobertura** sai do `cmap` de cada woff2 embutido, com `fontkit`, exatamente como `build/cobertura.mjs` já faz para o sistema — **reuse aquele módulo** em vez de escrever um segundo leitor de `cmap`.

- [ ] **Passo 4: rodar e ver passar**

```bash
node --test tests/unit/fontes-embutidas.test.mjs
```

Esperado: 3 passam.

- [ ] **Passo 5: commitar**

```bash
git add build/fontes-embutidas.mjs tests/unit/fontes-embutidas.test.mjs
git commit -m "feat(build): embute as fontes do sistema e as famílias do KaTeX que a aula usa"
```

---

## Tarefa 3: `validador/regras/saida.js` — as três regras sobre o HTML final

**Arquivos:**
- Criar: `validador/regras/saida.js`
- Modificar: `validador/regras/index.js`, `tests/unit/validador.test.mjs` (a guarda contrato × registro)
- Teste: `tests/unit/saida.test.mjs` (novo)

**Interfaces:**
- Consome: `cobertura` (um `Set<number>`) e `bytes` (número) do contexto de `validar`.
- Produz: `REGRAS_DE_SAIDA`, exportada de `validador/regras/index.js`.

As três entradas **já existem** em `contrato/contrato.json` (`saida.referencia-externa`, `saida.tamanho`, `saida.glifo-ausente`); confira antes de acrescentar. A quarta, `saida.pdf-paginas`, é do marco 5c — **não** a implemente aqui, e mantenha-a na lista de exceções nomeadas da guarda contrato × registro.

Este arquivo é **puro**: `validador/` não importa nada do Node. A cobertura chega pronta pelo contexto, como a tarefa 4 do marco 5a estabeleceu para `matematica.simbolo-fora-do-tex`.

- [ ] **Passo 1: escrever o teste que falha primeiro**

```js
// As três regras da spec 9.2 que rodam sobre o HTML final. Grupo "saida": não roda no navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { readFileSync } from 'node:fs';
import { validar } from '../../validador/validar.js';
import { REGRAS_DE_SAIDA } from '../../validador/regras/index.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const COBERTURA = new Set([...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?()-—çãõáéíóúâêô'].map((c) => c.codePointAt(0)));

const saida = (corpo, { cobertura = COBERTURA, bytes = 1000 } = {}) => {
  const doc = parseHTML(`<!DOCTYPE html><html lang="pt-BR"><head><title>t</title></head><body>${corpo}</body></html>`).document;
  return validar(doc, { contrato, regras: REGRAS_DE_SAIDA, grupo: 'saida', cobertura, bytes });
};
const regras = (achados) => achados.map((a) => a.regra);

test('imagem com src http acusa referência externa', () => {
  const achados = saida('<section data-layout="conteudo" id="s"><figure><img src="https://exemplo/x.png" alt="x"></figure></section>');
  assert.deepEqual(regras(achados), ['saida.referencia-externa']);
  assert.equal(achados[0].slide, 1);
});

test('imagem em data URI não acusa: é exatamente o que o build produz', () => {
  assert.deepEqual(saida('<section data-layout="conteudo"><figure><img src="data:image/png;base64,AA==" alt="x"></figure></section>'), []);
});

// Spec 9.2, textual: links <a href="https://…"> NÃO contam.
test('link para fora não é referência externa', () => {
  assert.deepEqual(saida('<section data-layout="conteudo"><p><a href="https://usp.br">USP</a></p></section>'), []);
});

test('folha de estilo por href acusa', () => {
  const doc = parseHTML('<!DOCTYPE html><html lang="pt-BR"><head><title>t</title><link rel="stylesheet" href="https://exemplo/e.css"></head><body><section data-layout="conteudo"><p>oi</p></section></body></html>').document;
  assert.deepEqual(regras(validar(doc, { contrato, regras: REGRAS_DE_SAIDA, grupo: 'saida', cobertura: COBERTURA, bytes: 10 })), ['saida.referencia-externa']);
});

test('url() de arquivo dentro de <style> acusa; data URI e url(#id) não', () => {
  const comArquivo = saida('<section data-layout="conteudo"><p>oi</p></section><style>@font-face{src:url(x.woff2)}</style>');
  assert.deepEqual(regras(comArquivo), ['saida.referencia-externa']);
  assert.deepEqual(saida('<section data-layout="conteudo"><p>oi</p></section><style>@font-face{src:url(data:font/woff2;base64,AA==)}</style>'), []);
  assert.deepEqual(saida('<section data-layout="conteudo"><p>oi</p></section><style>.a{clip-path:url(#corte)}</style>'), []);
});

// Fato 9: a regra percorre o DOM, nunca o texto do arquivo. O motor embutido contém, no fonte
// minificado, um trecho que reescreve url(#id) de SVG — e um grep o leria como CSS.
test('url() dentro de <script> não acusa: é código, não folha de estilo', () => {
  const comScript = saida('<section data-layout="conteudo"><p>oi</p></section>'
    + '<script>var r = /url\\(\\s*#([^)]+)\\)/g; var s = "url(" + a + "#" + b + ")";</script>');
  assert.deepEqual(regras(comScript), []);
});

test('acima de 10 MB avisa; abaixo, não', () => {
  const grande = saida('<section data-layout="conteudo"><p>oi</p></section>', { bytes: 11 * 1024 * 1024 });
  assert.deepEqual(regras(grande), ['saida.tamanho']);
  assert.equal(grande[0].severidade, 'aviso');
  assert.deepEqual(saida('<section data-layout="conteudo"><p>oi</p></section>', { bytes: 9 * 1024 * 1024 }), []);
});

test('caractere sem glifo na cobertura do HTML final acusa, uma vez por slide', () => {
  const achados = saida('<section data-layout="conteudo" id="s"><p>Soma: ∑ e de novo ∑</p></section>');
  assert.deepEqual(regras(achados), ['saida.glifo-ausente']);
  assert.match(achados[0].mensagem, /∑/);
});

// Fato 8: a cobertura do HTML final inclui o KaTeX embutido; com ela, o mesmo símbolo não acusa.
test('o mesmo caractere não acusa quando a cobertura recebida o inclui', () => {
  const comKatex = new Set([...COBERTURA, '∑'.codePointAt(0)]);
  assert.deepEqual(saida('<section data-layout="conteudo"><p>Soma: ∑</p></section>', { cobertura: comKatex }), []);
});

test('sem cobertura no contexto a regra de glifo se cala, em vez de acusar tudo', () => {
  const doc = parseHTML('<!DOCTYPE html><html lang="pt-BR"><head><title>t</title></head><body><section data-layout="conteudo"><p>∑</p></section></body></html>').document;
  const achados = validar(doc, { contrato, regras: REGRAS_DE_SAIDA, grupo: 'saida', bytes: 10 });
  assert.equal(regras(achados).includes('saida.glifo-ausente'), false);
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/saida.test.mjs
```

Esperado: FALHA — `REGRAS_DE_SAIDA` não é exportada.

- [ ] **Passo 3: implementar as três regras**

Três avisos de desenho, os três medidos:

- **`saida.referencia-externa` percorre o DOM**, nunca o texto do arquivo (fato 9). Três fontes: todo elemento com `src`; `link[rel="stylesheet"][href]`; e as `url(...)` **dentro de elementos `<style>`**. Nada de `<script>`. `data:` não conta; `url(#id)` não conta (é referência interna de SVG); `<a href>` não conta, por texto expresso da spec 9.2.
- **`saida.glifo-ausente` usa a cobertura do contexto**, que é a do que foi embutido — e não `validador/cobertura.json` (fato 8). Sem cobertura, cala-se. Reuse o mesmo recorte de invisíveis que `matematica.simbolo-fora-do-tex` já tem em `validador/regras/recursos.js`, e o mesmo andador `textosDe`, em vez de escrever um segundo.
- **`saida.tamanho`** lê `bytes` do contexto. É a única das três que é **aviso**, e a severidade vem do contrato, não do código.

Acrescente `REGRAS_DE_SAIDA` a `validador/regras/index.js` e **tire `saida.referencia-externa`, `saida.tamanho` e `saida.glifo-ausente` da lista de exceções** da guarda contrato × registro em `tests/unit/validador.test.mjs`, deixando só `saida.pdf-paginas`, que é do 5c.

- [ ] **Passo 4: rodar e ver passar**

```bash
node --test tests/unit/saida.test.mjs && npm test
```

Esperado: 10 no arquivo novo, e a suíte inteira verde.

- [ ] **Passo 5: commitar**

```bash
git add validador/regras/saida.js validador/regras/index.js tests/unit/saida.test.mjs tests/unit/validador.test.mjs
git commit -m "feat(validador): acrescenta as três regras de saída sobre o HTML final"
```

---

## Tarefa 4: `build/construir.mjs` — amarrar, gravar e provar que vive

**Arquivos:**
- Criar: `build/construir.mjs`
- Teste: `tests/unit/construir.test.mjs` (novo), `tests/integracao/construido.test.mjs` (novo)

**Interfaces:**
- Consome: `construirHtml` (T1), `embutirFontes` (T2), `REGRAS_DE_SAIDA` (T3).
- Produz: `construir({ raiz, caminhoDaAula, destino }) → Promise<{ html, achados, erros, caminhoDoHtml }>`.

Esta tarefa **não** implementa o comando `aula-usp build` nem o pipeline de sete etapas com os códigos de saída da spec 3.3 — isso é o marco 5c. O que ela entrega é a função que o 5c vai chamar, e `validacao.json`.

- [ ] **Passo 1: escrever os testes que falham primeiro**

`tests/unit/construir.test.mjs`:

```js
// Amarra as três tarefas e grava. O pipeline completo, com os códigos de saída da spec 3.3, é do 5c.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { construir } from '../../build/construir.mjs';

const RAIZ = new URL('../../', import.meta.url);
const pastaTemporaria = () => mkdtemp(join(tmpdir(), 'construido-'));

test('grava o HTML e o validacao.json, e o HTML não tem referência externa', async () => {
  const destino = await pastaTemporaria();
  const { caminhoDoHtml, achados } = await construir({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), destino });
  const html = await readFile(caminhoDoHtml, 'utf8');
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  const relatorio = JSON.parse(await readFile(join(destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(relatorio, achados, 'o validacao.json tem de ser exatamente a lista de achados');
});

// A prova que fecha o marco: as regras de saída, rodadas sobre o próprio produto, não acham nada.
test('os seis decks do espécime constroem sem nenhum achado de saída', async () => {
  for (const deck of ['index.html', 'componentes.html', 'matematica.html', 'codigo.html', 'ifusp.html', 'muitos-blocos.html']) {
    const destino = await pastaTemporaria();
    const { achados } = await construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${deck}`, RAIZ), destino });
    const daSaida = achados.filter((achado) => achado.regra.startsWith('saida.'));
    assert.deepEqual(daSaida, [], `${deck} acusou: ${daSaida.map((a) => a.regra).join(', ')}`);
  }
});
```

`tests/integracao/construido.test.mjs` — a prova de que o produto **vive**, e a única que vale de verdade:

```js
// O HTML construído aberto de file://, que é como um professor abre uma aula que recebeu por e-mail.
// Sem servidor: se algo ficou por buscar, aqui não há de onde buscar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iniciarChrome } from './utilitarios.mjs';
import { construir } from '../../build/construir.mjs';

const RAIZ = new URL('../../', import.meta.url);
let navegador;
before(async () => { navegador = await iniciarChrome(); });
after(async () => { await navegador?.close(); });

test('a aula construída vive de file://, sem rede e sem erro de console', async (t) => {
  const destino = await mkdtemp(join(tmpdir(), 'construido-'));
  const { caminhoDoHtml } = await construir({ raiz: RAIZ, caminhoDaAula: new URL('especime/matematica.html', RAIZ), destino });
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  t.after(() => pagina.close());
  const erros = [];
  const pedidos = [];
  const alvo = `file://${caminhoDoHtml}`;
  pagina.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) erros.push(m.text()); });
  pagina.on('pageerror', (e) => erros.push(e.message));
  pagina.on('request', (p) => { if (!p.url().startsWith('data:') && p.url() !== alvo) pedidos.push(p.url()); });

  await pagina.goto(alvo);
  await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
  const medida = await pagina.evaluate(() => ({
    slides: document.querySelectorAll('section.slide').length,
    palco: !!document.querySelector('.palco'),
    imprimir: typeof window.AulaUSP?.prepararImpressao,
    katex: document.querySelectorAll('.katex').length,
    fonte: getComputedStyle(document.querySelector('h1, h2')).fontFamily.split(',')[0].replace(/["']/g, ''),
  }));
  assert.equal(medida.slides, 8);
  assert.equal(medida.palco, true);
  assert.equal(medida.imprimir, 'function', 'prepararImpressao é o gancho que a spec 8.4 pede no 5c');
  assert.ok(medida.katex > 10);
  assert.equal(medida.fonte, 'Geist', 'a fonte embutida não pegou — caiu no fallback');
  assert.deepEqual(pedidos, [], `a aula pediu recursos: ${pedidos.join(', ')}`);
  assert.deepEqual(erros, [], erros.join('\n'));

  await pagina.keyboard.press('ArrowRight');
  await pagina.waitForTimeout(250);
  const ativo = await pagina.evaluate(() => document.querySelector('.slide.ativo')?.id);
  assert.ok(ativo && ativo !== 'capa', 'a navegação não funcionou no HTML construído');
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/construir.test.mjs
```

Esperado: FALHA, módulo inexistente.

- [ ] **Passo 3: implementar `build/construir.mjs`**

A ordem importa e vem dos fatos: `construirHtml` precisa do resultado de `embutirFontes`, e `embutirFontes` precisa do documento **depois** de `renderizarTex` para saber quais famílias do KaTeX a aula usa (tarefa 2, passo 3). Resolva isso do jeito que preferir — duas passagens, ou `construirHtml` chamando `embutirFontes` no meio — e **diga no relatório qual escolheu e por quê**.

Depois de ter o HTML: rode as regras de saída sobre ele, com `cobertura` vindo de `embutirFontes` e `bytes` de `Buffer.byteLength(html)`. Grave `<slug>.html` e `validacao.json` em `destino`. `<slug>` é o nome da pasta da aula (spec 3.3).

- [ ] **Passo 4: rodar os dois testes**

```bash
node --test tests/unit/construir.test.mjs
```

```bash
node --test tests/integracao/construido.test.mjs
```

Esperado: 2 e 1, todos passando.

- [ ] **Passo 5: conferir a inversão do teste de integração**

Faça o `construirHtml` deixar **uma** imagem por embutir (devolva o `src` original em vez do data URI) e confirme que o teste de `file://` falha na asserção de pedidos de rede. Restaure. Cole as duas saídas. Essa asserção é a que guarda a promessa inteira do marco.

- [ ] **Passo 6: rodar tudo e commitar**

```bash
npm test
```

Depois, um comando por arquivo: `construido`, `dist`, `painel`, `validador`, `matematica`.

```bash
git add build/construir.mjs tests/unit/construir.test.mjs tests/integracao/construido.test.mjs
git commit -m "feat(build): amarra a construção, grava o HTML e o validacao.json"
```

---

## Auto-revisão deste plano

**Cobertura da spec.** 3.3 etapas 2, 3 e 4: tarefas 1 e 2. 3.3 etapa 7, na parte das regras de saída sobre o HTML: tarefas 3 e 4. 8.3 (fontes do sistema): tarefa 2. 9.2 (três das quatro regras `saida.*`): tarefa 3. 9.3 (o grupo de saída não roda no navegador): tarefa 3, por o grupo existir só no registro que o build usa.

**Fora de escopo, de propósito, e o dono de cada um:** as etapas 5 e 6 (composição sobre o resultado, e o PDF), `saida.pdf-paginas`, o comando `aula-usp build`, o pipeline de sete etapas com os códigos de saída da spec 3.3, e a comparação visual entre os modos — **todos do marco 5c**. A captura de demos sem imagem própria é fase 2.

**Dependências entre tarefas.** 1 consome 2 (recebe `fontes` como parâmetro; o teste passa um coto, para as duas poderem ser feitas em qualquer ordem). 4 consome 1, 2 e 3. 3 é independente das outras três.

**O risco desta leva.** A tarefa 2 tem a única pergunta que não foi respondida por medição antes deste plano: **quais famílias do KaTeX a aula usa**, e em que momento dá para saber. O passo 3 dela aponta um caminho e manda justificar se você escolher outro. Se a resposta se mostrar cara, uma saída aceitável é embutir todas as 20 woff2 do KaTeX quando a aula tem matemática — custa ~400 kB num arquivo cujo aviso é 10 MB —, mas isso contraria o texto da spec 3.3, e por isso é ruling minha, não sua: **pare e relate** se chegar aí.
