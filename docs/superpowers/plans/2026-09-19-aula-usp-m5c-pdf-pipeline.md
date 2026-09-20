# Marco 5c: PDF e pipeline — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** fechar o marco 5 — gerar o PDF da aula, a última regra de saída, o pipeline de sete etapas com os códigos de saída da spec 3.3, o comando `aula-usp build`, e a comparação visual que prova que os dois modos renderizam igual.

**Arquitetura:** `build/pdf.mjs` abre o HTML construído no Chrome, chama `AulaUSP.prepararImpressao()` e gera o PDF; `pdf-lib` grava os metadados. `build/build.mjs` orquestra as sete etapas da spec 3.3 e decide o código de saída. `bin/aula-usp.mjs` ganha o comando `build`.

**Pilha:** Node ≥ 20.6, ES modules, `playwright-core` sobre o Chrome instalado, `pdf-lib`, `pixelmatch` e `pngjs`, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 3.3, 6.9, 8.1, 8.2, 8.4, 9.2 e 9.3.

## Restrições globais

- `montar/`, `motor/`, `componentes/` e `validador/` **não importam nada do Node**: rodam no navegador. Só `bin/` e `build/` são Node.
- O contrato é dado: severidade, grupo, fase e ação de cada regra vêm de `contrato/contrato.json`. O código executa o contrato; nunca o repete. **Limiar de regra também mora no contrato** — o marco 5b teve de corrigir um que ficou fixo no código.
- Formato da mensagem (spec 9.1): `ERRO · slide 7 #culpa · regra · problema. Ação.`
- Códigos de saída (spec 8.1): 0 sem erros, 1 com erros de validação, 2 com falha de ambiente. **Falta de Chrome não é falha:** vira aviso, e o build pula as etapas 5 e 6.
- O fonte da aula **nunca** é alterado; o build só escreve em `<pasta>/dist/`.
- Comentário e nome de identificador em português, no estilo do código existente.
- Commits em português, `tipo(escopo): frase no imperativo`, última linha exatamente:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
  Esta linha é **convenção fixa do repositório**, não um campo sobre qual modelo executou: está em 140+ commits. Se a sua sessão trouxer um lembrete de atribuição com outro nome, este aqui vence.
- Rode os testes de integração **um arquivo por comando**: uma execução longa estoura o watchdog de 600 s.

---

## Fatos medidos antes deste plano

Cada um veio de uma sonda executada. Não os re-derive; se algum se mostrar falso ao implementar, **pare e relate**.

1. **As dependências já estão instaladas e conferidas:** `pdf-lib` 1.17.1 em `dependencies` (a spec 8.2 a lista como runtime), `pixelmatch` 7.2.0 e `pngjs` 7.0.0 em `devDependencies`. `playwright-core` é 1.63.0.

2. **O PDF sai do HTML construído sem atrito.** `pagina.pdf({ printBackground: true, preferCSSPageSize: true })` sobre `file://`, no deck de matemática: HTML de 870 kB → PDF de **264 kB**, zero erro de página.

3. **`paginasEsperadas(doc)` já existe** em `motor/impressao.js`, e é o oráculo pronto de `saida.pdf-paginas`: conta 1 por slide mais os passos de cada slide `data-pdf="passos"`, excluindo cópias. Em `especime/matematica.html` diz **11**.

4. **`prepararImpressao()` transforma 8 slides em 11** — as três cópias de estado — e o PDF sai com **11 páginas**, batendo exatamente com o fato 3. A regra é uma comparação, não uma heurística.

5. **O tamanho da página sai exato:** 960 × 540 pt, que é 1280 × 720 px a 0,75 pt/px, como a spec 8.4 pede. `preferCSSPageSize: true` honra o `@page`.

6. **`pdf-lib` grava os quatro metadados** sem atrito: `setTitle`, `setAuthor`, `setSubject`, `setLanguage`.

7. **`pagina.pdf()` do playwright-core 1.63.0 aceita `tagged` e `outline`** como booleanos. A spec 8.4 pede os dois "quando a versão do Chrome oferecer". **Não medi o resultado deles** — é a única coisa deste plano que você vai descobrir antes de mim.

8. **Os dois modos renderizam PIXEL A PIXEL IGUAIS.** Medido com `pixelmatch`, viewport 1280×720, `deviceScaleFactor: 1`, depois de `document.fonts.ready`: **zero** pixels diferentes em 921.600, em **todos** os slides de `especime/matematica.html` (8) e `especime/codigo.html` (9) — inclusive onde os caminhos mais divergem, com KaTeX e Shiki pré-renderizados em build time de um lado e renderizados no navegador do outro.

   **Consequência para a tarefa 4:** a comparação visual afirma **igualdade**, não semelhança dentro de uma tolerância. Um limiar generoso desperdiçaria a informação que a medição oferece de graça.

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `build/pdf.mjs` | **novo.** Node. Abre o HTML construído, chama `prepararImpressao()`, gera o PDF e grava os metadados com `pdf-lib`. |
| `validador/regras/saida.js` | **modificado.** Ganha `saida.pdf-paginas`, a quarta e última regra de saída. |
| `build/build.mjs` | **novo.** Node. As sete etapas da spec 3.3 e os códigos de saída da 8.1. |
| `bin/aula-usp.mjs` | **modificado.** Ganha o comando `build`. |
| `tests/integracao/visual.test.mjs` | **novo.** Compara os dois modos, pixel a pixel. |

**Interfaces entre as tarefas:**

- Tarefa 1 **produz** `gerarPdf({ caminhoDoHtml, navegador, metadados }) → Promise<{ bytes, paginas }>`. `metadados` é `{ titulo, autor, assunto, idioma }`. Não abre navegador próprio: recebe um, para o chamador controlar o ritmo de Chrome.
- Tarefa 2 **produz** `saida.pdf-paginas` em `REGRAS_DE_SAIDA`, consumindo `paginasDoPdf` e `paginasEsperadas` do contexto de `validar`.
- Tarefa 3 **consome** as duas anteriores e `construir` do marco 5b; **produz** `build({ raiz, caminhoDaAula, destino, semPdf }) → Promise<{ codigo, achados, avisoSemChrome?, paginas? }>`. *(M7 da revisão final: este parágrafo prometia `{ achados, erros, codigo, arquivos }`, que nunca foi a forma real. `erros` e `arquivos` não existem — a CLI conta os erros por `cabecalhoDe` e os testes leem o disco com `readdir`; `avisoSemChrome` só vem no final "sem Chrome" e `paginas` só quando o PDF foi gerado. A função aceita ainda dois parâmetros opcionais que **não** são interface pública, `navegador` e `gerarPdf`, costuras de teste documentadas em `build/build.mjs`.)*
- Tarefa 4 é independente das outras três.

---

## Tarefa 1: `build/pdf.mjs` — o PDF

**Arquivos:**
- Criar: `build/pdf.mjs`
- Teste: `tests/integracao/pdf.test.mjs` (novo)

**Interfaces:**
- Consome: `construir` de `build/construir.mjs` (marco 5b), para ter um HTML sobre o qual gerar.
- Produz: `gerarPdf({ caminhoDoHtml, navegador, metadados })`, descrita acima.

O teste é de integração porque exige Chrome de verdade. Não há teste unitário possível aqui: gerar PDF é o navegador fazendo o trabalho.

- [ ] **Passo 1: escrever o teste que falha primeiro**

```js
// O PDF é a entrega que sai da máquina do autor para os alunos. Este teste mede o artefato: número
// de páginas, tamanho da página e metadados. Chrome de verdade, porque é ele quem gera.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { parseHTML } from 'linkedom';
import { iniciarChrome } from './utilitarios.mjs';
import { construir } from '../../build/construir.mjs';
import { gerarPdf } from '../../build/pdf.mjs';
import { paginasEsperadas } from '../../motor/impressao.js';

const RAIZ = new URL('../../', import.meta.url);
let navegador;
before(async () => { navegador = await iniciarChrome(); });
after(async () => { await navegador?.close(); });

const construirDeck = async (deck) => {
  const destino = await mkdtemp(join(tmpdir(), 'pdf-'));
  return construir({ raiz: RAIZ, caminhoDaAula: new URL(`especime/${deck}`, RAIZ), destino });
};

test('o PDF tem exatamente o número de páginas que paginasEsperadas diz', async () => {
  const { caminhoDoHtml, html } = await construirDeck('matematica.html');
  const esperadas = paginasEsperadas(parseHTML(html).document);
  const { bytes, paginas } = await gerarPdf({ caminhoDoHtml, navegador, metadados: {} });
  // Medido antes deste plano: 11 para este deck — 8 slides mais as 3 cópias de data-pdf="passos".
  assert.equal(esperadas, 11, 'o deck mudou; confira se a mudança é de propósito antes de ajustar');
  assert.equal(paginas, esperadas);
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), esperadas);
});

test('a página do PDF tem o tamanho que a spec 8.4 pede', async () => {
  const { caminhoDoHtml } = await construirDeck('index.html');
  const { bytes } = await gerarPdf({ caminhoDoHtml, navegador, metadados: {} });
  const { width, height } = (await PDFDocument.load(bytes)).getPage(0).getSize();
  // 1280 × 720 px a 0,75 pt/px. Sem preferCSSPageSize o Chrome usa Letter e isto cai.
  assert.equal(Math.round(width), 960);
  assert.equal(Math.round(height), 540);
});

test('os quatro metadados da spec 8.4 chegam ao PDF', async () => {
  const { caminhoDoHtml } = await construirDeck('index.html');
  const { bytes } = await gerarPdf({ caminhoDoHtml, navegador,
    metadados: { titulo: 'Aula de teste', autor: 'Fulana', assunto: 'Disciplina X', idioma: 'pt-BR' } });
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getTitle(), 'Aula de teste');
  assert.equal(pdf.getAuthor(), 'Fulana');
  assert.equal(pdf.getSubject(), 'Disciplina X');
});

// O outro ramo de paginasEsperadas: um deck SEM data-pdf="passos" sai com exatamente uma página por
// slide. O teste acima já cobre o ramo com passos (11 para 8 slides); este cobre o simples, e os dois
// juntos provam que a conta não é um número fixo com sorte.
test('num deck sem passos, o PDF tem exatamente uma página por slide', async () => {
  const { caminhoDoHtml, html } = await construirDeck('index.html');
  const doc = parseHTML(html).document;
  const slides = doc.querySelectorAll('section.slide:not([data-copia])').length;
  assert.equal(doc.querySelectorAll('[data-pdf="passos"]').length, 0, 'este deck ganhou passos; escolha outro');
  const { paginas } = await gerarPdf({ caminhoDoHtml, navegador, metadados: {} });
  assert.equal(paginas, slides);
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/integracao/pdf.test.mjs
```

Esperado: FALHA, `Cannot find module '../../build/pdf.mjs'`.

- [ ] **Passo 3: escrever `build/pdf.mjs`**

```js
// Etapa 6 da spec 3.3 e seção 8.4: abre o HTML construído no Chrome, prepara a impressão e gera o PDF.
// Node, não navegador. Não abre navegador próprio — recebe um, para o chamador controlar o ritmo de
// Chrome (uma abertura por build, não uma por deck).
import { PDFDocument } from 'pdf-lib';

export async function gerarPdf({ caminhoDoHtml, navegador, metadados = {} }) {
  const pagina = await navegador.newPage();
  try {
    await pagina.goto(`file://${caminhoDoHtml}`);
    await pagina.waitForFunction(() => document.body?.dataset.montado === 'sim');
    await pagina.evaluate(() => document.fonts.ready);
    // Spec 6.9: explicitamente, não pelo evento beforeprint — no build ninguém imprime.
    await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
    const bytes = await pagina.pdf({
      printBackground: true,      // spec 8.4: o campo amarelo e o azul de sinal precisam sair
      preferCSSPageSize: true,    // honra o @page de estilos/impressao.css; sem isto o Chrome usa Letter
      tagged: true,               // spec 8.4: "quando a versão do Chrome oferecer"
      outline: true,
    });
    const pdf = await PDFDocument.load(bytes);
    if (metadados.titulo) pdf.setTitle(metadados.titulo);
    if (metadados.autor) pdf.setAuthor(metadados.autor);
    if (metadados.assunto) pdf.setSubject(metadados.assunto);
    if (metadados.idioma) pdf.setLanguage(metadados.idioma);
    const finais = await pdf.save();
    return { bytes: Buffer.from(finais), paginas: pdf.getPageCount() };
  } finally {
    await pagina.close();
  }
}
```

> **`tagged` e `outline` são o único ponto deste plano que eu não medi.** A spec 8.4 os pede condicionalmente ("quando a versão do Chrome oferecer"). **Meça os dois:** gere com e sem, compare o tamanho e confirme que o PDF continua válido e com o mesmo número de páginas. Se algum deles quebrar ou for ignorado em silêncio nesta versão do Chrome, **relate com a medição** — e se quebrar, tire-o e diga no relatório. Não os mantenha por fé.

- [ ] **Passo 4: rodar e ver passar**

```bash
node --test tests/integracao/pdf.test.mjs
```

Esperado: 4 passam.

- [ ] **Passo 5: conferir a inversão do teste mais importante**

Tire `preferCSSPageSize: true` e confirme que o teste do tamanho de página falha (o Chrome cai para Letter, 612×792 pt). Restaure. Cole as duas saídas: é a asserção que garante que o slide não sai cortado nem com margem branca.

- [ ] **Passo 6: commitar**

```bash
git add build/pdf.mjs tests/integracao/pdf.test.mjs
git commit -m "feat(build): gera o PDF da aula construída, com os metadados da spec 8.4"
```

---

## Tarefa 2: `saida.pdf-paginas` — a última regra de saída

**Arquivos:**
- Modificar: `validador/regras/saida.js`, `tests/unit/validador.test.mjs` (a guarda contrato × registro)
- Teste: `tests/unit/saida.test.mjs` (acrescentar)

**Interfaces:**
- Consome: `paginasDoPdf` (número) e `paginasEsperadas` (número) do contexto de `validar`.
- Produz: a quarta entrada de `REGRAS_DE_SAIDA`.

Com esta regra, **as 56 regras de fase 1 do validador ficam completas**. A entrada `saida.pdf-paginas` já existe em `contrato/contrato.json`; confira antes de acrescentar, e **tire-a da lista de exceções nomeadas** da guarda contrato × registro, que depois desta tarefa deve ficar vazia para a fase 1.

- [ ] **Passo 1: escrever o teste que falha primeiro**

```js
// spec 9.2: erro quando o número de páginas do PDF difere do esperado (seção 6.9). É comparação, não
// heurística: quem calcula o esperado é paginasEsperadas, em motor/impressao.js, desde o marco 2.
test('número de páginas diferente do esperado acusa, com os dois números na mensagem', () => {
  const achados = saida('<section data-layout="conteudo"><p>oi</p></section>',
    { paginasDoPdf: 9, paginasEsperadas: 11 });
  assert.deepEqual(regras(achados), ['saida.pdf-paginas']);
  assert.match(achados[0].mensagem, /9/);
  assert.match(achados[0].mensagem, /11/);
});

test('número igual não acusa', () => {
  assert.deepEqual(saida('<section data-layout="conteudo"><p>oi</p></section>',
    { paginasDoPdf: 11, paginasEsperadas: 11 }), []);
});

// Sem PDF (build com --sem-pdf, ou sem Chrome) a regra se cala, em vez de acusar. Mesma disciplina de
// degradação que matematica.simbolo-fora-do-tex e saida.glifo-ausente já seguem.
test('sem paginasDoPdf no contexto a regra se cala', () => {
  assert.deepEqual(saida('<section data-layout="conteudo"><p>oi</p></section>',
    { paginasEsperadas: 11 }), []);
});
```

> O auxiliar `saida(...)` do arquivo hoje só passa `cobertura` e `bytes`. Estenda-o para repassar o que receber, sem quebrar os onze testes existentes.

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/saida.test.mjs
```

Esperado: FALHA — a regra não existe.

- [ ] **Passo 3: implementar**

A regra é curta, e é a mais simples das quatro: compare os dois números do contexto e acuse a diferença, citando os dois. Não recalcule nada — `paginasEsperadas` é de `motor/impressao.js` e quem a chama é o build. Duas verdades sobre o mesmo número é a classe de defeito que este projeto mais pagou caro.

Um achado sem slide sai com `aula` no lugar do número (spec 9.1), que é o certo aqui: o PDF é da aula inteira.

- [ ] **Passo 4: rodar, conferir a guarda, commitar**

```bash
node --test tests/unit/saida.test.mjs && npm test
```

Confirme que a lista de exceções nomeadas da guarda contrato × registro **ficou vazia** para a fase 1 — se sobrar alguma, o marco não fechou o validador e é achado para relatar.

```bash
git add validador/regras/saida.js tests/unit/saida.test.mjs tests/unit/validador.test.mjs
git commit -m "feat(validador): fecha saida.pdf-paginas e completa as regras da fase 1"
```

---

## Tarefa 3: `build/build.mjs` e o comando `build`

**Arquivos:**
- Criar: `build/build.mjs`
- Modificar: `bin/aula-usp.mjs`
- Teste: `tests/integracao/build.test.mjs` (novo — nasceu em `tests/unit/` e foi movido na rodada de correção da revisão final, I6: abre Chrome de verdade e derrubava o `npm test` numa máquina sem Chrome), `tests/unit/validar-cli.test.mjs` (acrescentar)

**Interfaces:**
- Consome: `construir` (marco 5b), `gerarPdf` (tarefa 1), `REGRAS_DE_SAIDA` (tarefa 2), `medirComposicao` de `build/composicao.mjs`.
- Produz: `build({ raiz, caminhoDaAula, destino, semPdf }) → Promise<{ codigo, achados, avisoSemChrome?, paginas? }>` — a forma real, corrigida na rodada de correção (ver a nota em "Interfaces entre as tarefas").

Esta é a tarefa de **orquestração**, e o que ela precisa acertar são as transições — não as etapas, que já existem. A spec 3.3 define quatro finais diferentes, e o valor da tarefa está em cada um deles ser exercitado por um teste.

**As sete etapas (spec 3.3), com o que já existe:**

| etapa | o que faz | quem já faz |
|---|---|---|
| 1 | estáticas + carga sem navegador; com erros, grava só `validacao.json` e sai 1 | `build/validar.mjs` |
| 2 | monta | `construir` (5b) |
| 3 | pré-renderiza matemática e código | `construir` (5b) |
| 4 | troca a tag do runtime, embute tudo, grava `<slug>.html` | `construir` (5b) |
| 5 | abre no Chrome e roda composição | `build/composicao.mjs` |
| 6 | chama `prepararImpressao()` e gera o PDF | `gerarPdf` (tarefa 1) |
| 7 | roda **só** `saida.pdf-paginas`, grava `<slug>.pdf` e `validacao.json` | tarefa 2 + esta |

> **Quem roda quais regras de saída, e por quê.** `construir()` (marco 5b) já roda as três regras que falam do **HTML final** — `referencia-externa`, `tamanho`, `glifo-ausente` — e continua rodando. A etapa 7 roda **apenas** `saida.pdf-paginas`, que é a única que fala do **PDF**, e concatena os achados. As quatro regras do grupo não têm um sujeito só: três são sobre um artefato, uma é sobre outro, e separá-las por artefato dá um dono por pergunta. Rodar o grupo inteiro na etapa 7 duplicaria os três primeiros achados; e na hora do `construir()` não existe PDF, então `saida.pdf-paginas` se cala ali de qualquer forma. **Ponha essa razão num comentário no código** — sem ela, a divisão parece descuido e alguém reunifica.

**Os quatro finais, verbatim da spec 3.3** — cada um é um teste:

- erros na etapa 1 → grava **só** `validacao.json`, **sem** `<slug>.html`, código **1**;
- erros de composição na etapa 5 → grava `<slug>.html` e `validacao.json`, **não** gera PDF, código **1**;
- erros de saída na etapa 7 → **mantém** os arquivos gravados, código **1**;
- sem Chrome → grava o HTML, **pula as etapas 5 e 6**, emite aviso explícito, código **0** se não houver erros.

- [ ] **Passo 1: escrever os testes que falham primeiro**

Um teste por final, mais o caminho feliz. Use fixtures em `tests/fixtures/build/`: uma aula limpa, uma com erro estático (metadado faltando), e uma com transbordo (erro de composição). Para o caminho sem Chrome, `build/composicao.mjs` já degrada sozinho — force o caminho passando um `CHROME_PATH` inexistente e confirme o aviso e o código 0.

```js
test('erro estático: grava só validacao.json, sem HTML, e sai 1', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: new URL('tests/fixtures/build/sem-metadados.html', RAIZ), destino });
  assert.equal(r.codigo, 1);
  assert.deepEqual((await readdir(destino)).sort(), ['validacao.json']);
});
```

Escreva os outros três afirmando **o código de saída e a lista exata de arquivos gravados** — é a lista que distingue um final do outro, e é o que um teste frouxo deixaria passar. Os quatro, explicitamente:

| final | `codigo` | arquivos em `destino`, exatamente |
|---|---|---|
| erro estático na etapa 1 | 1 | `['validacao.json']` |
| erro de composição na etapa 5 | 1 | `['<slug>.html', 'validacao.json']` |
| erro de saída na etapa 7 | 1 | `['<slug>.html', '<slug>.pdf', 'validacao.json']` |
| sem Chrome, aula limpa | 0 | `['<slug>.html', 'validacao.json']`, mais aviso no stderr |
| caminho feliz | 0 | `['<slug>.html', '<slug>.pdf', 'validacao.json']` |

Repare que o final "sem Chrome" e o "erro de composição" gravam a mesma lista e diferem **só** no código de saída e no aviso — se o seu teste não afirmar os dois, ele não distingue os dois casos.

- [ ] **Passo 2: rodar e ver falhar**

```bash
node --test tests/unit/build.test.mjs
```

- [ ] **Passo 3: implementar `build/build.mjs` e o comando**

Em `bin/aula-usp.mjs`, acrescente `build <pasta> [--sem-pdf]` ao texto de uso e ao despacho. Mantenha a regra que está comentada no topo do arquivo: **import dinâmico dentro do try**, nunca estático, porque `build/build.mjs` arrasta `playwright-core` e `pdf-lib`, e dependência ausente tem de virar saída 2, não stack trace.

- [ ] **Passo 4: rodar tudo**

```bash
node --test tests/unit/build.test.mjs && npm test
```

Depois, `aula-usp build` sobre os seis decks do espécime, relatando deck a deck: código de saída, arquivos gravados e número de páginas do PDF.

- [ ] **Passo 5: commitar**

```bash
git add build/build.mjs bin/aula-usp.mjs tests/
git commit -m "feat(cli): acrescenta aula-usp build, com as sete etapas e os códigos de saída da spec 3.3"
```

---

## Tarefa 4: a comparação visual entre os modos

**Arquivos:**
- Criar: `tests/integracao/visual.test.mjs`

**Interfaces:** independente das outras três; só precisa de `construir` (marco 5b).

**O limiar é zero, e isso foi medido** (fato 8): os dois modos renderizam pixel a pixel iguais em todos os slides de dois decks, inclusive com KaTeX e Shiki pré-renderizados de um lado e renderizados no navegador do outro. Afirme **igualdade**.

- [ ] **Passo 1: escrever o teste**

Sirva o espécime por HTTP (modo navegador), construa o mesmo deck (modo build), abra os dois com viewport 1280×720 e `deviceScaleFactor: 1`, espere `document.fonts.ready`, e compare slide a slide com `pixelmatch`.

```js
// Fato 8 do plano: medido em zero pixels diferentes, em todos os slides de matematica.html e
// codigo.html. Afirmamos igualdade, não semelhança: um limiar generoso desperdiçaria a informação.
assert.equal(diferentes, 0, `${deck} slide ${id}: ${diferentes} pixels diferentes entre os modos`);
```

Quando falhar, **grave o PNG do diff** numa pasta temporária e cite o caminho na mensagem — sem isso, "1.482 pixels diferentes" não diz a ninguém o que olhar.

- [ ] **Passo 2: rodar**

```bash
node --test tests/integracao/visual.test.mjs
```

Esperado: passa, com zero diferença.

- [ ] **Passo 3: conferir a inversão**

Mude uma cor em `estilos/tokens.css` **só no lado do build** (por exemplo, injetando CSS extra no HTML construído dentro do teste), confirme que a comparação falha e que o PNG do diff mostra a região certa. Restaure. É a única forma de saber que a comparação mede alguma coisa — uma comparação visual que nunca falhou é indistinguível de uma que não compara.

- [ ] **Passo 4: commitar**

```bash
git add tests/integracao/visual.test.mjs
git commit -m "test(visual): prova que o modo navegador e o modo build renderizam igual"
```

---

## Auto-revisão deste plano

**Cobertura da spec.** 3.3 (as sete etapas e os quatro finais): tarefa 3. 6.9 (número de páginas esperado): tarefas 1 e 2. 8.1 (comando `build`, códigos de saída): tarefa 3. 8.4 (CSS de impressão, `prepararImpressao`, `pdf-lib`, `tagged`/`outline`): tarefa 1. 9.2 (`saida.pdf-paginas`): tarefa 2. A "comparação visual entre os modos" que a spec 12 pede para o marco 5: tarefa 4.

**Fora de escopo, de propósito:** a captura de demos sem imagem própria (fase 2, etapa 5 da spec 3.3), e tudo do marco 6 (`aula-usp pacotes`, o guia, a reescrita da tag do runtime com versão e `integrity`).

**Herdado do marco 5b, e que esta leva deve resolver ou registrar:** `construir()` não parametriza `fase` — a tarefa 3 decide se precisa; `embutirFontes` ainda devolve um campo `cobertura` cujo único leitor é um teste, e a tarefa que tocar `build/fontes-embutidas.mjs` deve removê-lo e migrar o teste; `recursos.linguagem` passa a ser alcançável por dois caminhos quando a etapa 1 rodar antes da 3, e a tarefa 3 deve confirmar se o segundo vira inalcançável ou fica como defesa em profundidade.

**Dependências entre tarefas.** 3 consome 1 e 2. 4 é independente. 2 é independente de 1.

**O risco desta leva.** A tarefa 3 é a única de orquestração pura do marco 5 inteiro: ela não acrescenta capacidade, ela decide **transições**. O modo de falha típico dessa forma é um teste que exercita o caminho feliz e nenhum dos finais — e a spec 3.3 define quatro finais diferentes, cada um com uma lista de arquivos gravados diferente. Se os quatro testes do passo 1 não existirem, a tarefa não está feita, por mais que `aula-usp build` funcione no deck limpo.
