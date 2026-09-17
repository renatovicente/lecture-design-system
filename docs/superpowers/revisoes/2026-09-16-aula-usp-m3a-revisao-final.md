# M3a final whole-branch review (a0d21e0..ab4b5a7)

Reviewer: opus (final review). Status: COMPLETE.

Scope: branch m3a-componentes, commits bb8007f, 723e051, ab4b5a7. Read-only apart from this file (`git status` clean). No browser, no Playwright, no integration run; probes were short node + linkedom scripts in the session scratchpad.

## Evidence: what was read and probed

- Read: full diff package; plan header 1-85; spec 3.1-3.5, 4.1-4.4, 5.3-5.6, 6.4-6.9, 7.1-7.2, 8, 9.1-9.3, 11; whole files estilos/{componentes,layouts,motor,impressao,base,tokens}.css, montar/{montar,corpo,cromo,blocos,navegador,carregador}.js, motor/{paineis,apresentador,impressao,copias,passos,dom,rotulos}.js, contrato/contrato.json.
- PROBE (node + linkedom, scratchpad script, no browser): linkedom does NOT insert the implied tbody. `<table><tr><th>n</th></tr><tr><td>12</td></tr></table>` -> table children [TR, TR]; marcarCelulasNumericas marks 0 cells (2 with explicit thead/tbody). Chrome's parser inserts tbody -> browser marks them. montar diverges between modes for a table without explicit tbody (spec 3.1: montar is shared "para que o resultado não possa divergir").
- PROBE: Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(-1234.5) = "-R$ 1.234,50" -> ehNumerica false; positive "R$ 1.234,50" (NBSP) -> true. "-R$ 100", "-R$100", "−R$ 1.234,50" false; "R$ -100" true. Deferred item 1 is the platform's own pt-BR format.
- PROBE: nested table pollutes the outer column map (querySelectorAll('tr') and 'tbody td' reach inner rows); rowspan in thead is carried into tbody (HTML clips it at the row group). Both rare.
- Panels (paineis.js:15) and presenter (apresentador.js:83) are appended to body, outside .area -> component CSS cannot reach table.teclas, notes, presenter chrome. Presenter thumbnails and print copies clone slides with .area -> faithful (numerica / data-rotulo survive cloneNode).
- Spec 9.3: static rules run on the source copy taken before montar -> system-set data-rotulo on div.enunciado/div.resposta cannot trip vocabulario.atributo (contrato.json:136-138 declares data-rotulo only on the three asides). Composition rules run on the mounted DOM; ::before label text is not a text node.
- PROBE: parser-independent prototype of marcarCelulasNumericas (rows of this table via `closest('table') === tabela`, header = `parentNode.nodeName === 'THEAD'`) gives identical output on all four corpo unit fixtures and the montar test table, and marks the tbody-less table in linkedom. Regex prototypes: item-1 form and items-1+2 form both pass the unit accept/reject lists; "-R$ -100" still rejected.
- npm test: 128/128 (0.6 s). All three commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` (git log). No change to package.json / package-lock.json. `grep` finds no Node import, no `window.`/`document.`/`getComputedStyle`/`innerText` in montar/corpo.js or montar/montar.js.

---

### Strengths

- **The three tasks read as one file each, not three layers.** `estilos/componentes.css` has five labelled sections (campos e exercício 3-41, listas 43-99, texto em linha 101-111, tabela 113-142, figura 144-170), every selector but the two `figura`-layout rules scoped under `.area`, every colour, space, rule and type value a token (`var(--espaco-*)`, `--regua-*`, `--cor-*`, `--tipo-*`), and the two spec-mandated ems (0.88, 0.8) carry their spec reference in a comment. `montar/corpo.js` (54 lines) has no imports and uses only `querySelectorAll`, `children`, `getAttribute`, `setAttribute`, `classList`, `textContent` — nothing layout-dependent such as `innerText`, so it runs on linkedom (confirmed: 128/128 unit tests run it there).
- **Selector reach is sound where it matters most.** I checked every engine surface: `ol.roteiro` sits inside `.area` on the cover (`montar/montar.js:73`) but is an `ol` without `passos`/`sintese`, so `componentes.css:45-99` cannot match it; `ol.fileira` and `.cabecalho` are prepended to the section, outside `.area` (`montar/montar.js:79,87`); the three panels (with `table.teclas`) are appended to `body` (`motor/paineis.js:15`) and so is the presenter (`motor/apresentador.js:83`), so no component rule reaches them. `marcarCelulasNumericas` runs inside `montar` before any panel exists and is scoped to `section table` (`montar/corpo.js:30`), so `table.teclas` is never classified. Presenter thumbnails and print copies are `cloneNode(true)` of mounted slides (`motor/copias.js:16`), so `numerica` and the system `data-rotulo` survive into both — the thumbnails stay "fiéis".
- **The step interplay is right by construction.** The answer's label is a `::before` of the answer itself (`componentes.css:23-33`), so `visibility: hidden` from `motor.css:29-31` hides and reveals label and text together; the rule above a hidden `li[data-passo]` is its own `border-top` (`componentes.css:78`) and disappears with it; `counter-increment` is unaffected by visibility, so numbering stays stable while revealing. The integration test at `tests/integracao/componentes.test.mjs:154-162` covers the stage→print reveal.
- **The two flagged deliberate extensions are well-founded.** Lists: the approved screen (`docs/superpowers/specs/referencias/2026-09-14-aula-usp/tipografia.html:37-40`) is a grid of 5.2cqw (≈ 64 px) × 1fr with a 0.22cqw rule and 1.2cqw top padding; the implementation reproduces those metrics (64 px, 2 px, 16 px, 24 px gap) with an inline-block numeral and a hanging indent, and the reason is correct — in a grid each inline element of `<li>Ande <strong>contra</strong> o gradiente.</li>` would become its own cell. Header alignment: `colunasDasCelulas` handles colspan (null column) and rowspan (occupancy carried to later rows), and the unit tests pin both (`tests/unit/corpo.test.mjs:31-57`).
- **The figure fix removes both M2a defects structurally** (`componentes.css:146-170`): `max-width: 100%; height: auto` can only shrink a raster image; `align-items: flex-start` plus `min-height: 0` on figure and media inside the fixed-height `.area` gives height-limited, left-aligned, undistorted media with the caption attached. The fixture (`tests/fixtures/figuras/index.html`) exercises the four extreme shapes and the RED evidence in `task-3-report.md` shows the tests would have caught the old rule.
- **Tests measure behaviour, not implementation.** Integration tests read computed style and geometry in Chrome (baseline probe, `Range.getClientRects` for hanging-indent line starts, right edges of numeric cells); both new resource-owning tests register `t.after` before asserting, so a failure still terminates. Unit tests run the real functions over real linkedom DOM, including negative cases (table outside `section`, text column, empty cell neutrality, colspan header).
- **Process hygiene:** three commits, each with the exact trailer; no dependency change; `numerica` added to `contrato.classesDoSistema` in the same commit that first generates it (723e051), so the class-subset test in `componentes.test.mjs:33-43` is never red between commits.

---

### Issues

#### Critical (Must Fix)

None. The suite is green, nothing that existed before the branch regresses, and every spec 7.1 row in scope is implemented.

#### Important (Should Fix)

**I-1. `marcarCelulasNumericas` depends on the HTML parser inserting `tbody`, so `montar` gives different results in the browser and in the future build.** `montar/corpo.js:34` (`'tbody td, tbody th'`) and `:43` (`'thead td, thead th'`).
- *What:* Chrome's HTML parser inserts an implied `<tbody>` when the author writes `<table><tr>…`; linkedom (the build-mode DOM, spec 3.1) does not. Probe run on linkedom: `<table><tr><th>n</th></tr><tr><td>12</td></tr></table>` has children `[TR, TR]` and `marcarCelulasNumericas` marks **0** cells; the same table with explicit `thead`/`tbody` marks 2. In Chrome the first table gets `tbody` and its cells are marked.
- *Why it matters:* spec 3.1 shares `montar` between the modes "para que o resultado não possa divergir", and spec 11.2 compares the two modes pixel by pixel. This is the first `montar` step whose output depends on parser normalisation, and no test can see it: every unit fixture (`tests/unit/corpo.test.mjs:31-63`, `tests/unit/montar.test.mjs:54-60`) writes `tbody` explicitly. The M4 validator may well reject `table > tr` in build mode (`contrato.json:57`), but in the browser the static rules run on a parsed copy where `tbody` is always present (spec 9.3), so an author iterating in the browser never learns that the build will differ.
- *Fix (prototyped in the scratchpad, not in the worktree):* classify rows without `tbody`/`thead` selectors — take `tabela.querySelectorAll('tr')` filtered by `linha.closest('table') === tabela`, treat a row as header when `linha.parentNode.nodeName === 'THEAD'`, everything else as data, and pass that row list to `colunasDasCelulas`. On linkedom this gives byte-identical results on all four fixtures in `corpo.test.mjs` and on the `montar.test.mjs` table, and marks the `tbody`-less table (`["12","3"]`). The `closest` filter also stops a nested table's rows from polluting the outer table's column map (`corpo.js:13` and `:34` currently reach inner rows; probe confirmed the outer header loses its alignment). Add one unit test with a `tbody`-less table.

**I-2. Sign-first negative currency is not numeric — and it is what the platform's own pt-BR formatter produces** (deferred item 1, raised in severity by a probe). `montar/corpo.js:3`.
- *What:* `new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-1234.5)` returns `"-R$ 1.234,50"` (NBSP after `R$`), and `ehNumerica` returns `false` for it; the positive `"R$ 1.234,50"` returns `true`. Same for `"-R$ 100"`, `"-R$100"`, `"−R$ 1.234,50"`.
- *Why it matters:* spec 7.1 accepts a number "com sinal … e, opcionalmente, … o prefixo R$", and spec 4.3 names finance and actuarial lectures as the reason `$` is not a TeX delimiter. A cost column with one negative value right-aligns every cell but the negative one, and because that cell counts as text (`corpo.js:39-41`) the column header drops back to the left.
- *Fix (prototyped):* `^(?:[+\-−]?(?:R\$ ?)?|R\$ ?[+\-−])(?:\d{1,3}(?:[., ]\d{3})+|\d+)(?:[.,]\d+)? ?%?$` passes the whole accept list and the whole reject list in `corpo.test.mjs:19-29`, accepts all sign-first forms, and still rejects the double sign `"-R$ -100"`. Add `'-R$ 1.234,50'` to the accept list.

**I-3. In a browser-made PDF the fields lose their backgrounds, and the alert's text is `papel`.** `estilos/impressao.css:8-43` (no `print-color-adjust` anywhere in `estilos/`; grep finds none) against `estilos/componentes.css:9-12` (`destaque`), `:18-21` (`alerta`, `color: var(--cor-papel)`) and `:140-142` (`tr.destaque`, `td.destaque`).
- *What:* Chrome's print dialog has "Background graphics" off by default, and spec 8.4 tells browser-mode users only to choose "Salvar como PDF" and margins "Nenhuma". Without `print-color-adjust: exact`, Chrome drops background colours when printing; the yellow fields, the black alert field and the table highlight disappear, and the alert's white text is either lost or, at best, darkened by Blink's print-economy heuristic only as far as a pale grey on white. (Not measured: running a browser is forbidden on this machine. The build path is fine: `tests/integracao/impressao.test.mjs:74` and spec 8.4 use `printBackground: true`.)
- *Why it matters:* spec 6.9 wires printing to `beforeprint`/`afterprint` in the browser, the mode the spec names for chat, artifacts and GPTs. The map squares already had this exposure since M2, but `aside.alerta` is the first component whose *legibility* depends on its background, and three components are defined by a background field.
- *Fix:* one inherited declaration in `impressao.css`, for example `.slide { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`, which makes the page independent of the dialog checkbox; or, at minimum, name "Gráficos de plano de fundo" in the M6 guide and carry this to M5 as a named finding. Hard to assert in `node:test` (Playwright's `page.pdf({ printBackground: false })` plus a pixel check of a rasterised page would be the test), so a reviewed one-liner is acceptable.

#### Minor (Nice to Have)

**M-1. List markers and rules are drawn in `tinta`, so they vanish inside `aside.alerta`.** `estilos/componentes.css:66` (`ul > li::before { background: var(--cor-tinta) }`), `:78` (`ol.passos > li { border-top: … var(--cor-tinta) }`), and the table rules `:118-119`, `:132`, all inside the `tinta` field of `:18-21`. A list inside a field is legal (`contrato.json:49-61` puts no restriction on field children) and anticipated (`componentes.css:35-37` spaces multiple children of a field). Using `currentColor` at `:66` and `:78` keeps `tinta` everywhere else and gives `papel` on the alert, without introducing a non-token colour.

**M-2. Inline `code` in caption-sized text falls below the `codigo` minimum.** `estilos/componentes.css:103-106` sets `0.88em`; inside `figcaption` or `p.fonte` (18 px, `estilos/layouts.css:352-359`) that is 15.84 px, below the 20 px `codigo` minimum in `contrato.json:100`, and `code` is not among the exceptions at `contrato.json:103`. So M4's `composicao.tamanho-minimo` would reject a legal caption such as "Saída de `plot()`". This is a spec-internal tension (7.1's 0.88em against 4.3's 20 px minimum) for the M4 plan to settle (exception, or a rule about code in captions), not an implementation defect.

**M-3. The component rules also style DOM that demos create.** Every `.area …` rule in `estilos/componentes.css:45-142` matches inside `div.demo`, which sits in `.area`; spec 5.5 puts demo-created content outside the vocabulary contract and `contrato.json:103` exempts `.demo *` from the type roles. No current demo is affected (`especime/index.html:116-121` creates `output` and `button`), but a demo that builds a `ul` or a `table` would get hanging indents, square markers and 4 px rules. Decide explicitly: either document in the guide that demos inherit body styles, or exclude `div.demo` descendants.

**M-4. No style for links anywhere.** `estilos/base.css`, `estilos/layouts.css` and `estilos/componentes.css` have no `a` rule, so an author link (`a` is in the vocabulary, `contrato.json:107,144`) renders in the browser's blue/purple, outside the palette of spec 4.2; inside `aside.alerta` that is roughly #0000EE on #0A0A0A. This predates the branch and spec 7.1 has no link row, so it is a spec gap, but the new dark and yellow fields make it visible. Worth one line in the M3b or M4 plan.

**M-5. The two functions in `montar/corpo.js` scope differently, and neither matches the rest of `montar`.** `rotularExercicios` queries the whole document (`montar/corpo.js:52-53`), `marcarCelulasNumericas` queries `section table` (`:30`), while `montar` works on `secoesDaAula(doc)` = `body > section[data-layout]` (`montar/montar.js:17-19,53`). A `section` without `data-layout`, or an exercise outside any section, is processed by one function and not the other. Passing `secoes` to both would make the rule uniform.

**M-6. Small coherence leftovers from building the files in three steps.** The header comment `estilos/componentes.css:1` lists "tabela, figura e texto em linha" while the file order is texto em linha, tabela, figura; `montar/corpo.js` defines `rotularExercicios` last although `montar/montar.js:55-56` calls it first; `estilos/layouts.css:41` now says the form of each block is in `componentes.css`, but the caption typography stays at `layouts.css:352-359` (shared `legenda` role with `.fonte`, which is a defensible grouping; the comment just overstates it). Cosmetic.

**M-7. More helper duplication than deferred item 7 names.** Besides the class-subset check, `perto` is duplicated verbatim (`tests/integracao/layouts.test.mjs:40`, `tests/integracao/componentes.test.mjs:31`), the baseline probe is duplicated (`layouts.test.mjs:60-70`, `componentes.test.mjs:101-108`), and the colour constants too (`layouts.test.mjs:14-17`, `componentes.test.mjs:9-13`). Fold them in together if item 7 is done.

**M-8. The specimen reaches the spec's count limits but not its length limits, and never renders a spanned table.** Counts are at the limit (5 `ul` items, 5 `ol.passos` items, an 8 × 6 table, 2 `destaque` + 1 `alerta`, 3 `sintese` items). Lengths are far below: longest `data-rotulo` 9 of 24 (`especime/componentes.html:28-33`), longest `figcaption` 94 of 140 (`:142`), longest `sintese` item 44 of 80 (`:179`). No table in the specimen uses `colspan`/`rowspan`, so the header-alignment extension with spans is covered only by linkedom units, never rendered with collapsed borders in Chrome. Deferred item 6 (figure in a narrow column) is the same kind of gap.

---

### Triage of the deferred items

1. **`ehNumerica('-R$100')` false — fix before merge** (see I-2): `Intl.NumberFormat('pt-BR', BRL)` emits exactly `"-R$ 1.234,50"`; one alternation in `montar/corpo.js:3` (prototyped, both unit lists stay green) plus one accept-list entry.
2. **`ehNumerica('R$ 5%')` true — park:** no realistic cell. If the item 1 edit is made, the combined regex (prototyped, passes both unit lists) can close it too, but it is not worth an edit of its own.
3. **No comment marking the header-alignment extension — fix before merge:** a one-line comment at `montar/corpo.js:43-47`. The plan (line 44) tells the author he can revert the extension ("é uma condição em `montar/corpo.js`"), and the comment is how he finds that condition. It costs nothing, since I-1 rewrites the same lines.
4. **`LINHA` unused — resolved:** now used at `tests/integracao/componentes.test.mjs:197`. Nothing to do.
5. **No unit test for an exercise without `div.resposta` — park:** the two loops in `montar/corpo.js:52-53` are independent, so a missing answer cannot affect the statement; the test would pin behaviour that cannot break.
6. **No figure in a narrow column — park, carry to M4:** `max-width: 100%` (`estilos/componentes.css:147`) does not depend on width. Add the case to the fixture M4's composition rules will need anyway (with M-8).
7. **Class-subset check in a fourth file — fix before merge:** the M2c ruling set exactly this trigger, and the ledger passed the call to this review. A helper in `tests/integracao/utilitarios.mjs`, such as `classesForaDoContrato(pagina)`, replaces `apresentador.test.mjs:142-145`, `componentes.test.mjs:37,41-42`, `motor.test.mjs:188-191` and `paineis.test.mjs:150-153`, and can take `perto` and the colour constants with it (M-7). It touches only tests; check it by running each of the four files once, one at a time. If the fix wave has to stay minimal, this is the one item that can move to the first commit of M3b without harm, but the trigger should not be deferred silently a second time.

---

### Recommendations

**Fix wave before merge (small, all in files this branch created, plus tests and one line of print CSS):**
1. `montar/corpo.js`: I-1 (row classification without `tbody`/`thead` selectors, with the `closest('table')` filter), I-2 (sign before or after `R$`), item 3 (a comment on the header extension). `tests/unit/corpo.test.mjs`: a `tbody`-less table and `'-R$ 1.234,50'` in the accept list.
2. `estilos/componentes.css:66,78`: `currentColor` for the marker and the step rule (M-1).
3. `estilos/impressao.css`: `print-color-adjust: exact` on `.slide` (I-3), guarded by a computed-style assertion in `impressao.test.mjs` (the declaration is present and inherited by `aside.alerta`); if the author prefers not to touch M2c's file now, record I-3 as a named M5 finding instead.
4. Item 7 with M-7: fold the four class-subset copies, `perto` and the colour constants into `tests/integracao/utilitarios.mjs`.
5. Verify: `npm test`, then `node --test` on `componentes`, `impressao`, `motor`, `paineis` and `apresentador`, one file at a time.

**For M3b (readiness): nothing in this branch blocks it, with three things to decide.**
- No selector conflicts found. `.area :not(pre) > code` (`componentes.css:103`) excludes `pre > code`, which is where Shiki puts its tokens; `sub`/`sup`, `th`/`td` and `ul` rules do not match KaTeX's HTML output, which is spans; the hanging indent cannot leak into inline math, because `componentes.css:97-99` resets `text-indent` on every direct child of an `li`.
- **Block-first content in a list item.** The marker and the numeral are inline `::before` boxes (`componentes.css:59-67, 85-95`). When an `li` starts with a block (display math `\[…\]`, a `p`, a `pre`), the marker is wrapped in an anonymous first line of its own and the block starts below it (CSS 2.1 §16.1: `text-indent` reaches an anonymous block only when it is the first child). The approved grid would have kept them side by side. Decide in M3b: accept it, have M4 reject block-first `li` content, or take the marker out of flow in that case.
- **KaTeX display margins against the field rhythm.** `.katex-display` brings `margin: 1em 0; text-align: center`, while fields space children by 16 px (`componentes.css:35-37`) and 8 px under the label (`:26`). The approved screen zeroes those margins and aligns left (`tipografia.html:33-34`). M3b should do the same and add a field with display math to the specimen.
- `ehNumerica` reads source text, so a cell written in TeX (`\(0{,}5\)`) is text and its column header stays on the left. That is probably right, but it should be a decision with a test.

**For M4 (validator), from what this branch leaves behind:**
- Keep static rules on the pre-`montar` copy, as spec 9.3 already says. The mounted DOM carries a system `data-rotulo` on `div.enunciado`/`div.resposta` that `contrato.json:136-138` does not allow for authors, and a vocabulary rule run on the live document would flag the system's own attribute. Consider listing system attributes in the contract next to `classesDoSistema` (none of the M2 ones are listed either: `data-indice`, `data-mapa`, `data-bloco`, `data-revelado`, `data-copia`, and so on).
- The implied-`tbody` asymmetry (I-1) also affects static rules: the browser's parsed copy always has `tbody`, linkedom's never does unless it was written. Decide whether `contrato.json:57` requires an explicit `tbody` and how the browser can tell.
- Spec limits against component sizes. By arithmetic from the CSS, not measured: an 8-row table is about 468 px tall (8 rows and the header at 34.08 + 16 px, plus 4 + 2 + 7 × 1 + 4 px of rules); the body zone is 476.5 px under a one-line `h2`, 429 px under a two-line `h2`, and 412.5 px with a one-line `p.lide`. So the specimen's slide is the only legal combination that fits. Five two-line `ol.passos` items in a 6-6 column (about 5 × 94.8 + 4 × 24 ≈ 570 px) overflow even under a one-line title, yet stay within "≤ 5 itens" and "≤ 60 palavras por coluna". `composicao.transbordo` will catch these; the guide should warn about them before it does. M-2 (code in captions) needs a ruling in the same plan.
- A fixture at the length limits (24-character `data-rotulo`, 140-character caption, 80-character synthesis items), a spanned table and a figure in a 4-column side (M-8, item 6).

**For M5 (build and PDF):** the mode-comparison fixture from spec 11.2 should include a `tbody`-less table (the case I-1 would otherwise hide), and I-3 if it was parked.

**On the plan itself:** its decisions hold up. Two gaps were structural: every test fixture writes `tbody`, so the parser dependency could not show up in any task (I-1); and "o espécime mostra cada componente no limite da spec" is true for counts but not for lengths (M-8).

---

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The branch is coherent, well scoped and spec-aligned, with behaviour-level tests and no regressions. Two small, prototyped changes to `montar/corpo.js` should land first: I-1, so the shared `montar` cannot diverge between browser and build, and I-2, so the platform's own pt-BR negative-currency format is numeric. I-3 should be fixed now or explicitly carried to M5, because printing from the browser loses the fields.

---

## O que foi feito depois desta revisão

A revisão acima foi feita por um revisor opus sobre `a0d21e0..ab4b5a7`, sem navegador (regra desta máquina), e gravada em disco seção por seção. Seguiu-se uma única rodada de correção, com a lista que a própria revisão recomendou, e uma re-revisão escopada dessa rodada.

**Corrigido (commits sobre `ab4b5a7`):**

- `eda05e6` — **I-1:** `marcarCelulasNumericas` passou a classificar as linhas da própria tabela (`linha.closest('table') === tabela`), com cabeçalho quando o pai da linha é `THEAD` e dado no resto; não depende mais do `tbody` que o parser do Chrome insere e o `linkedom` não, e uma tabela aninhada não contamina mais o mapa de colunas da tabela de fora. Novo teste unitário com tabela sem `thead`/`tbody`. **I-2:** a expressão regular aceita o sinal antes ou depois de `R$` (`-R$ 1.234,50`, a saída de `Intl.NumberFormat('pt-BR', BRL)`, agora é número) e continua recusando sinal duplo; `'-R$ 1.234,50'` entrou na lista de aceitos. **Item 3:** comentário em `montar/corpo.js` marcando o alinhamento do cabeçalho de coluna numérica como extensão da spec 7.1 feita pelo plano.
- `aebed32` — **M-1:** marcador de `ul` e régua de `ol.passos`/`ol.sintese` em `currentColor`, visíveis dentro de `aside.alerta` e em `tinta` no resto.
- `9b7b4e8` — **I-3:** `print-color-adjust: exact` (com a forma `-webkit-`) em `.slide`, dentro do bloco `@media print` de `estilos/impressao.css`, com teste que lê o valor computado num descendente sob mídia de impressão.
- `1017ee1` — **Item 7 com M-7:** a checagem "toda classe está no contrato", `perto` e as constantes de cor foram reunidas em `tests/integracao/utilitarios.mjs`; os nomes e as asserções dos testes não mudaram.

**Testes ao final:** 129 unitários e 59 de integração (componentes 9, impressao 6, motor 11, paineis 7, apresentador 9, layouts 11, carregador 2, demos 4), rodados um arquivo por vez.

**Re-revisão escopada:** todos os itens resolvidos, sem quebra nova. O revisor executou `ehNumerica` contra `-R$ 1.234,50` com espaço inseparável, `−R$ 5`, `R$ -5`, `-R$ -5`, `+R$5`, `R$`, `-` e `5 R$`; rodou sondagens de tabela aninhada e de `tfoot` no `linkedom`; e contou teste por teste nos seis arquivos refatorados.

**Continuam para os próximos marcos, de propósito:**

- Item 2: `R$ 5%` segue aceito; nenhuma célula realista usa os dois.
- Item 5: não há teste de exercício sem `div.resposta`; os dois laços são independentes.
- Item 6 e M-8: figura numa coluna estreita, espécime nos limites de comprimento (rótulo de 24, legenda de 140, item de síntese de 80) e tabela com `colspan`/`rowspan` renderizada no Chrome — para a fixture do M4.
- M-2: `code` em legenda fica abaixo do mínimo de código; conflito interno da spec para o M4 decidir.
- M-3: as regras de componente também alcançam o DOM criado por demos; decidir no guia ou excluir `div.demo`.
- M-4: nenhum estilo para `a`; os links saem na cor do navegador.
- M-5: `montar/corpo.js` seleciona de um jeito diferente do resto de `montar` (que usa `secoes`).
- M-6: sobras cosméticas da construção em três passos (ordem do comentário de cabeçalho, ordem das funções).
- Para o M3b: item de lista que começa com bloco (matemática em destaque, `p`, `pre`) põe o marcador numa linha própria; margens de `.katex-display` precisam ser zeradas dentro de campos; decidir se célula escrita em TeX conta como numérica.
- Para o M4: manter as regras estáticas na cópia anterior à montagem (o DOM montado tem `data-rotulo` do sistema nas partes do exercício); resolver a assimetria do `tbody` implícito também no validador; slides dentro dos limites que transbordam (tabela de 8 linhas sob título de duas linhas, cinco passos de duas linhas numa coluna 6-6).
