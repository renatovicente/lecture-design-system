# M3c final review: 6b8ac63..346cf2d (branch m3c-codigo)

I read the whole-branch package in one pass (`review-6b8ac63..346cf2d.diff`, 1 299 lines), then checked it against:

- the plan `docs/superpowers/plans/2026-09-17-aula-usp-m3c-codigo.md` (including "Decisões deste marco");
- spec sections 3.2, 3.5, 4.2, 4.3, 4.4, 5.3, 5.5, 7.1, 8.1, 8.2, 11.1 and 11.2;
- the ledger, the three task reviews and the M3b final review;
- the surrounding code at head: `build/servir.mjs`, `bin/aula-usp.mjs`, `montar/navegador.js`, `montar/carregador.js`, `montar/montar.js`, `montar/corpo.js`, `componentes/tex.js`, `motor/apresentador.js`, `motor/impressao.js`, `motor/copias.js`, `contrato/contrato.json` and all of `estilos/`.

The worktree was not touched: `git status` is clean at 346cf2d and every probe lives in the session scratchpad (`…/scratchpad/revisao-final-m3c/`), on a `git archive` copy of 346cf2d with `node_modules` symlinked.

**Evidence gathered**

- **Tests re-run here** (one file per call): unit `codigo` 7/7, `servir` 17/17, whole unit suite 155/155; integration `codigo` 7/7, `matematica` 6/6, `componentes` 9/9, `motor` 11/11. The counts in the ledger hold.
- **Commit trailers**: all three commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` (checked with `git log`).
- **Node probes** against the installed Shiki 4.4.3: token classification in doc comments for all seven languages; compilation of every grammar pattern (1 813 patterns, including the `tex`/`r` grammars that `latex` pulls in) through the JavaScript regex engine; a second, broader module-graph scanner compared with the closure test's regex; byte sizes of the browser module graph; the cost of a large `data-linhas` range.
- **Server probes**: what `/_aula-usp/modulos/` exposes and refuses; the behaviour of a tree whose Shiki packages are missing.
- **Chrome probes** (real Google Chrome, via `tests/integracao/utilitarios.mjs`): the specimen in `?folha` and in stage mode, the presenter window, `prepararImpressao()`, print media emulation, plus two scratch fixtures (code inside fields and notes, `\[` inside a LaTeX block, a 66-column line in a 6-6 column, and a lecture whose only language is off-contract). Screenshots of five specimen slides and of the scratch fixtures were inspected by eye.
- **Patched scratch copies** to verify each proposed fix: the three one-line/three-line changes below keep unit `codigo` 7/7 and integration `codigo` 7/7 green.

### Strengths

- **Plan alignment is exact.** Every file matches the plan's fenced code; the ledger's controller checks (byte-identical to the verified copy) match what I read. No scope creep, no unrequested embellishment, tight commits (5 / 2 / 7 files).
- **The dev-loading mechanism is the right one, and it closes an M3b item.** `import.meta.resolve` + `raizDoPacote` (`build/servir.mjs:51-73`) replaces the fixed `node_modules/katex/dist` path that the M3b review flagged as broken under hoisting or a global install, and it does it for KaTeX and Shiki with a single mechanism. The map is built from Node's own resolution, so `exports`/`import` conditions are honoured.
- **Route containment holds.** I probed the new route: a package outside the list 403s (`linkedom`, `@shikijs/core`), a percent-encoded scope name 403s (fails closed), dotfiles 403, `..` and `%2e%2e` are normalised by the URL parser and then land inside an allowed package root (same file as the direct URL, no escape), `..%2f` is refused by `resolverSeguro`. Only whitelisted package folders are reachable, and only on 127.0.0.1 behind the Host allowlist.
- **`reescreverRuntime` uses a replacement function** (`build/servir.mjs:82`), so `$&`-style sequences inside the JSON can never be re-interpreted — a subtle trap avoided.
- **The closure test is a real guard, not a ritual.** My broader scanner over the same 29-file graph found nothing the test's regex misses, and the graph contains no dynamic `import()` at all (the one `import(` hit is grammar pattern text inside `javascript.mjs`). `vistos.size > MODULOS_DO_NAVEGADOR.length` genuinely walks internals.
- **No regex-compatibility risk with the WASM-free engine.** All 1 813 patterns of the seven grammars (plus the embedded `tex` and `r`) compile through `defaultJavaScriptRegexConstructor` with `target: 'auto'`. A grammar rule that throws mid-lecture would have taken the whole page down; there is none.
- **Highlighting by class instead of inline style is the right call** and it closes the M1 carry-over: on a marked line, comment and line number drop to `tinta`, so "sobre amarelo, só tinta" is a CSS rule rather than a contrast exception. Verified in Chrome and by eye.
- **The line model works and the details are right.** Full-bleed `inline-block` lines (`width: calc(100% + 2 * var(--espaco-1))` with matching negative margin) give a yellow field from edge to edge while the code keeps its 8 px inset; `min-height: 1lh` keeps an empty marked line inside the field (visible in the JavaScript slide); `innerText === textContent`, so copying from the slide yields the exact code, blank lines included; numbers live in `::before`, outside the copy; leading/trailing blank lines are normalised so Chrome and linkedom count the same lines (the M3a implied-`tbody` lesson applied).
- **On-demand loading is proved with real network traffic**, not by inspection: a Python-only lecture fetches only `@shikijs/langs/dist/python.mjs`, a TeX-free lecture fetches no KaTeX (this closes M3b's Minor 7a), a code-free lecture fetches no Shiki, and `componentes.html` fetches nothing from `modulos/`.
- **Integration with the rest of the system is clean.** Code renders after `montar` and before `iniciarMotor`, like math; presenter thumbnails come out with rendered lines, bold keywords and the yellow field (probed); `print-color-adjust` inherits `exact` under print media, so marked lines survive a PDF saved from the Chrome dialog; the four new classes enter `classesDoSistema` and the existing class-contract tests (which use membership checks, not fixed sets) keep passing; `abrirAula`'s new `pedidos` field is additive and no other caller breaks.
- **Tests exercise real behaviour.** Unit tests run the real Shiki and real linkedom (no stubs), covering the seven contracted languages with concrete samples and the exact keyword/comment decisions; integration tests measure real `getComputedStyle`/`getBoundingClientRect` values and real request URLs. Edge cases covered: `code` inside `pre`, HTML entities, `pre` without `data-lang`, idempotency, off-contract language with marked lines, an empty marked line, the exact 16-line boundary.
- **Injection-safe by construction**: `createElement` + `textContent` + `append(string)` only, never `innerHTML`.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

**1. If any module in `MODULOS_DO_NAVEGADOR` fails to resolve, every lecture page becomes `404 não encontrado`, silently — including lectures with no code and no math.**

Where: `build/servir.mjs:60-73` (lazy `modulosResolvidos`, called from `reescreverRuntime`) inside the request handler's blanket `catch` at `build/servir.mjs:136-148`; `bin/aula-usp.mjs:34-38`.

- **What happens.** I rebuilt a tree with the M3b package set (katex, linkedom, playwright-core and their deps, no `@shikijs/*`, no `oniguruma-*`, no `regex*`) and served `especime/` with `criarServidor`:

  ```
  /componentes.html            404 não encontrado
  /index.html                  404 não encontrado
  /codigo.html                 404 não encontrado
  /_aula-usp/estilos/base.css  200
  ```

  The underlying error is perfectly clear — `ERR_MODULE_NOT_FOUND | Cannot find package '@shikijs/primitive' imported from …/build/servir.mjs` — but it is thrown inside the `try` that wraps `stat`/`readFile`/`reescreverRuntime`, so it becomes a generic 404 with nothing on the server console. `aula-usp servir` prints "servindo …" and stays up, exit code 0.
- **Why it matters.** The most likely trigger is the next step in this project's own workflow: merging the branch into the main checkout and running `aula-usp servir` before `npm install`/`npm ci` (the M3b memory records exactly this dance for katex). The second trigger is Ruling 3's own scenario: on Node 20.0–20.5 `import.meta.resolve` is not available unflagged, so by inspection the same `TypeError` lands in the same `catch` — i.e. Ruling 3's premise that those versions "would fail loudly at the first served page" is wrong; they fail as a misleading 404. Spec 8.1 says exit code 2 is for "falha de ambiente, como arquivo ou dependência ausente"; today a missing dependency produces a running server that serves stylesheets and 404s every lecture. This is also a robustness regression from M3b, where a missing KaTeX only broke math lectures and said so in the page.
- **How to fix** (small, and the ledger already carries the T1 minor that points at it): resolve eagerly in `criarServidor` (`modulosResolvidos()` on the first line) and wrap the `criarServidor` call in `bin/aula-usp.mjs` with `try { … } catch (erro) { sair(erro.message); }` so the CLI prints the real cause and exits 2. Optionally also narrow the handler's `catch` so that anything other than a filesystem error answers 500 with `console.error`, instead of pretending the file is missing. While there, bump `package.json` `engines` to `>=20.6` (one line): it is the only machine-readable guard for `import.meta.resolve`, and `npm install` then warns instead of letting the silent 404 happen.

**2. Code inside `aside.alerta` is invisible, and inside `aside.destaque` it breaks spec 4.2.**

Where: `estilos/componentes.css:203-214` (`.area pre { … color: var(--cor-tinta); border-top: … var(--cor-tinta); }`) and `:230-232` (`.comentario { color: var(--cor-cinza) }`).

- **What happens.** The contract allows `pre` as a body block and puts no restriction on what an `aside` may contain (`contrato/contrato.json:12,49-61`), so `<aside class="alerta"><pre data-lang="python">…</pre></aside>` is legal today. Chrome probe and screenshot: inside `aside.alerta` the code computes `color: rgb(10,10,10)` on the alert's `rgb(10,10,10)` field — black on black, unreadable, with only the grey comment faintly legible and the 2 px rule invisible too; inside `aside.destaque` the comment stays `cinza` on `amarelo`, which is the very rule ("sobre ele, só `tinta`") this milestone otherwise closes, at 1.8:1.
- **Why it matters.** M3a hit exactly this and fixed it by using `currentColor` for the list marker and the step rule (`estilos/componentes.css:66,78`); the new code block reintroduces the fixed colour. No planned validator rule catches the alert case: `composicao.texto-no-amarelo` covers the yellow field only, and the black-on-black case would pass every rule in spec 9.2.
- **How to fix** (verified in a scratch copy — unit `codigo` 7/7 and integration `codigo` 7/7 stay green, and the specimen is pixel-unchanged because `.slide` already sets `color: var(--cor-tinta)`):

  ```css
  .area pre { /* … */ border-top: var(--regua-normal) solid currentColor; /* drop color: var(--cor-tinta) */ }

  /* Dentro de um campo, o código segue a cor do campo: nada de cinza sobre amarelo nem tinta sobre tinta. */
  .area :is(aside.destaque, aside.alerta) pre :is(.comentario, .marcada .comentario),
  .area :is(aside.destaque, aside.alerta) pre[data-numeros] .linha::before { color: inherit; }
  ```

  After the patch the probe reads `tinta` for both text and comment inside `destaque` and `papel` for both inside `alerta`. Worth one assertion in `tests/integracao/codigo.test.mjs` and one `pre` inside a field in `tests/fixtures/codigo/index.html`.

**3. Plan-level: a code line wider than its column overprints the neighbour, and `composicao.transbordo` cannot see it.**

Where: the plan's "O que continua para depois" ("numa coluna de uma grade 6-6 cabem cerca de 45 colunas, não 64, o que `composicao.transbordo` acusa") against `estilos/componentes.css:217-224`.

- **What happens.** In a scratch fixture, a 66-character Python line in a 6-6 column measured: column right edge 688, `pre` right edge 688, `.linha` right edge 688 — and the text's right edge at 924, painting over the neighbouring column's paragraph (screenshot confirms the overlap). Because `.linha` is an `inline-block` of fixed width, the overflow has **no box of its own**: a `getBoundingClientRect`-based transbordo rule — the shape every existing sweep uses, e.g. `tests/integracao/layouts.test.mjs:189-200` — sees nothing. Only `scrollWidth` reveals it.
- **Why it matters.** Spec 5.3 allows 64 columns, but only about 45 fit in half a slide, so a spec-legal lecture silently produces overlapping slides, and the mitigation the plan records does not exist. M4 will inherit the wrong assumption unless it is corrected now.
- **How to fix.** Nothing needs to change in this milestone's rendering; record it for M4 as "measure `pre.scrollWidth` against the block width (or the rendered column count) — bounding boxes do not show code overflow", and consider pinning the fact today with one `scrollWidth` assertion in `tests/integracao/codigo.test.mjs`. If the author would rather not depend on M4 for this, `white-space: pre-wrap` on `.area pre` keeps long lines inside the column (the yellow field wraps with them, and the CSS counter still counts logical lines) at the cost of the "16 lines fit" arithmetic — a design decision, not a defect fix.

#### Minor (Nice to Have)

1. **A comment token that also carries a bold scope is rendered as a keyword** (`componentes/codigo.js:61`). The classification tests `fontStyle & NEGRITO` first, so a JSDoc tag — whose foreground is `cinza` from the `comment` rule and whose `fontStyle` is bold from `storage.type` — comes out `tinta` 600 inside a grey comment. Probe: `/** * @param {number} w */` gives `[C: * ][K:@param][C: {number} w peso]`, same for `@returns`; spec 7.1 says comments are `cinza`. One-line fix, verified green on all 7 unit tests: test the colour first — `tipo: token.color?.toUpperCase() === cinza ? 'comentario' : token.fontStyle & NEGRITO ? 'palavra-chave' : null`. (R's roxygen tags stay mixed because the R grammar scopes `@param` outside `comment`; that one is the grammar's doing.)
2. **KaTeX still loads when the only `\(`/`\[` in the lecture is inside a code block** (`montar/navegador.js:13,53`). M3b deferred this with "revisit with M3c's `pre[data-lang]` gate, using the same tree walk"; the plan did not pick it up, and LaTeX being one of the seven languages makes it likelier. Chrome probe on a lecture whose only backslash-bracket is inside `<pre data-lang="latex">`: `katex/dist/katex.mjs` and `katex.min.css` are both fetched (~600 KB) for nothing. Rendering stays correct (`FORA` in `componentes/tex.js:10` includes `pre`). In M5 this becomes an unnecessary SRI script fetch.
3. **A lecture whose every `data-lang` is off-contract still downloads Shiki** (`montar/navegador.js:64-73`). Probed in Chrome: it mounts, logs `Aula USP: código com linguagem fora da lista…`, renders plain marked lines — and fetches 19 module files (primitive, engine, oniguruma, regex) to build a highlighter with no grammars. `if (usadas.length > 0)` around the highlighter, plus the fixture/test the T3 review asked for, closes both the download and the untested path.
4. **`linhasMarcadas` builds one Set entry per number in the range** (`componentes/codigo.js:31-41`). Measured: `data-linhas="1-10000000"` costs 1 s and 460 MB before the block renders. The value is author input and M4 will validate it, but the block's line count is already known at the call site (`componentes/codigo.js:97`), so clamping is one argument.
5. **Classification is coupled to the value of the `cinza` token** (`componentes/codigo.js:61`), and `token.color?.` is dead defensive code (Shiki always fills `color`, as the T2 review probed and mine confirms). It works and is tested; if the module is revisited, classifying by scope (`includeExplanation`) would not depend on a colour literal.
6. **Embedded languages inside a LaTeX block depend on which *other* blocks the lecture has.** Probe: `\begin{minted}{python} if x is None: …` inside `pre[data-lang="latex"]` is highlighted only when the lecture also contains a Python block (because only then is the Python grammar registered). Harmless today, but M5 must register the same grammar set in both modes or accept that a bundled `aula-usp-codigo.js` with all seven grammars will highlight such blocks differently from the dev server — spec §1 requires the two modes to look identical.
7. **`especime/codigo.html` has notes on 1 of 5 content slides**, while `especime/matematica.html` has 4 of 4. M4's `estrutura.notas-ausentes` will emit four warnings on the reference specimen; `especime/index.html` has the same pre-existing gap.
8. **No test for an empty `pre[data-lang]`** (T2's deferred minor); by inspection it produces a single empty `span.linha`, which is reasonable.
9. **`montar/navegador.js` is accumulating per-library loading blocks inline** (`:52-77`): two near-identical "sniff the body, `import()` by bare name, render, log" stanzas inside the one big `try`. Extracting `carregarMatematica(doc)` / `carregarCodigo(doc, contrato)` would give M5 the seam it needs to swap `import()` for an SRI-checked script tag, and would make the "if it fails to load, the whole lecture fails to mount" decision (M3b Minor 4) a single place.
10. **The dev route now serves whole package folders** (`katex/package.json`, `katex/cli.js`, any `@shikijs/langs/dist/*.mjs`, and a nested `node_modules` of a listed package if one ever exists), where M3b served only `katex/dist`. Containment is sound and the content is public npm material on a localhost-only server, so this is a note, not a hole.

### Triage of the ledger's deferred minors and rulings

| ledger item | verdict | reason |
|---|---|---|
| Ruling 1 — three `@shikijs/*` packages instead of `shiki` | agree, merge as is | Spec 7.1's "núcleo, motor JS sem WASM, gramáticas por linguagem" is exactly these three; `shiki` would add the WASM engine, all themes and hast. Spec 8.2's `shiki` should be corrected in the spec sync pass already on the M1 carry-over list. |
| Ruling 2 — console instead of panel, import map instead of `aula-usp-codigo.js` | agree for M3c | Same staging M3b used; M4 wires `renderizarCodigo` errors into the panel, M5 replaces the loading path. |
| Ruling 3 — `import.meta.resolve` with `engines` left at `>=20` | **fix before merge** | The premise is wrong: on Node 20.0–20.5 the failure is not loud, it is the silent 404 of Important 1. Bump `engines` to `>=20.6` (one line) and make the resolution failure loud. |
| Ruling 4 — keep the regex module-graph walk | agree | My broader scanner found nothing it misses on 4.4.3, and the graph has no dynamic imports; it fails loudly on upgrade, which is the point. (Its identifier class excludes `$`, so a minified `import{x as $}from"y"` would slip by — theoretical, no occurrence today.) |
| Ruling 5 — switch implementers from haiku to sonnet | agree, closed | Process only; Tasks 2 and 3 reports carried raw output. |
| T1 ruling — no fix round for the fabricated report section | agree for the code | Code is byte-identical to the verified copy and I re-ran the suites myself. Worth noting it is the second milestone running with a report-integrity finding; the controller's re-run is the working mitigation. |
| T1 minor — the serving `catch` turns any exception into 404 | **fix before merge** | Reproduced end to end; this is Important 1. |
| T2 minor — dead `token.color?.` | can wait | Confirmed dead (Shiki always fills `color`). Fold into the classification fix if that lands. |
| T2 minor — no test for an empty `pre[data-lang]` | can wait (cheap) | One line in `tests/unit/codigo.test.mjs`. |
| T2 minor — unbounded `data-linhas` range | can wait | Quantified (1 s / 460 MB at `1-10000000`); author input, M4 validates. One-line clamp available if the file is touched. |
| T3 minor — all-languages-off-contract path untested | can wait | I reproduced it in Chrome: mounts, logs the error, plain marked lines, no throw. Add the fixture together with the `usadas.length > 0` guard of Minor 3. |
| T3 ⚠️ — Step 8 visual claims unverifiable from the diff | closed | I took my own screenshots: `=>` and `<-` not bold, LaTeX commands bold with the backslash, comments grey, marked field edge to edge including the empty JavaScript line, numbers grey outside the field and tinta inside it, 16 lines above the footer. |

None of the ledger's own deferred minors blocks the merge except the T1 one (Important 1) and Ruling 3's `engines`.

### Recommendations

**Fix wave before merge** (one commit each; items 1–3 verified in a scratch copy, with the existing tests green):

1. Eager module resolution in `criarServidor` + `try/catch → sair()` in `bin/aula-usp.mjs`, and `engines: ">=20.6"` in `package.json` (Important 1, Ruling 3).
2. Field-aware code colours: `currentColor` for the rule, drop the fixed `color`, `color: inherit` inside `aside.destaque`/`aside.alerta`; plus a `pre` inside a field in the fixture and one Chrome assertion (Important 2).
3. Comment-before-bold classification in `criarDestacador`, plus a unit assertion with a JSDoc block (Minor 1).
4. Optional, same wave: `if (usadas.length > 0)` around the highlighter with the off-contract fixture (Minor 3), and one `scrollWidth` assertion pinning the column-overflow fact (Important 3).

**What M4 inherits** (beyond the plan's list):

- Code overflow is invisible to bounding boxes: `composicao.transbordo` must measure `pre.scrollWidth`, or count rendered columns against the block's width, otherwise over-wide code silently overprints the neighbouring column (Important 3).
- `recursos.linguagem` and the line/column limits should use `codigoDoBloco` so the count matches what the browser and the build render (leading/trailing blank lines stripped).
- `limites.codigo-colunas` at 64 is a full-width limit; inside a 6-6 column the real limit is ~45 columns. Either the rule becomes column-aware or the guide (M6) has to carry the warning.
- `data-linhas` semantics are unchecked: reversed ranges, `0`, numbers beyond the block's line count, and ranges large enough to freeze the page (Minor 4). The contract pattern `^[0-9]+(-[0-9]+)?…$` also accepts all of them.
- `renderizarCodigo` errors need the panel, like `renderizarTex` (Ruling 2).
- Nothing forbids `pre` inside `aside.destaque`/`aside.alerta`/`div.resposta` today; decide whether the contract should, since the CSS fix above only makes it *readable* (Important 2).
- Code inside `aside.notas` is rendered into lines but unstyled (the CSS is scoped to `.area`), and it counts for the `pre[data-lang]` load gate.
- `.linha`, `.marcada`, `.palavra-chave` and `.comentario` are system classes now; static rules keep running on the pre-montar copy, so they never appear there.

**What M5 inherits:**

- The browser module graph is 719 KB unminified without KaTeX (`@shikijs/langs` 423 KB, `vscode-textmate` 98 KB, `regex` 63 KB, `oniguruma-to-es` 59 KB, `primitive` 28 KB, `oniguruma-parser` 25 KB, rest 22 KB) against the 600 KB target of spec 11.2 — minification and the fact that grammars are data should get there, but it is tight; dropping unused grammars per lecture is not an option for a single bundled script.
- `import('@shikijs/langs/' + …)` with a template literal cannot be statically bundled; the loading seam has to change shape anyway for the SRI script tag (Minor 9), and the same commit should decide how a failed load degrades (M3b Minor 4).
- Register the same grammar set in both modes, or accept that embedded languages inside LaTeX blocks highlight differently in the browser and the build (Minor 6).
- The `modulos` route and the import map disappear when the bundle lands; if the route survives, keep the `import.meta.resolve` mechanism — it is what makes hoisted and global installs work.

**For the guide (M6):** code in a 6-6 column holds about 45 columns, not 64; a tab renders 8 spaces wide; `pre` without `data-lang` gets the block's shape but no highlighting; a `\[` inside a LaTeX code block currently costs a KaTeX download (Minor 2).

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The deliverable is correct, well tested and faithful to the plan — real Chrome geometry, real Shiki, real network traffic, no mocks, no unjustified deviation, and it closes two carry-overs (M1's `cinza` on `amarelo`, M3b's fixed `node_modules` path and its missing no-KaTeX-without-TeX test). Two cheap, verified fixes should land first: a missing or unresolvable module currently turns every lecture page into a silent `404 não encontrado` (the exact state of a main checkout that has not re-run `npm install`), and code inside `aside.alerta` renders black on black while code inside `aside.destaque` breaks the "sobre amarelo, só tinta" rule this milestone is otherwise built around.

## O que foi feito depois desta revisão

A revisão acima foi feita por um revisor opus sobre `6b8ac63..346cf2d`, com medições no Chrome, sondagens no Shiki 4.4.3 e um teste à mão numa árvore sem os pacotes do Shiki. Seguiu-se uma única rodada de correção, com os dois itens Important, o pino que o Important 3 pedia e o Minor 1 de uma linha, e uma re-revisão escopada dessa rodada. Cada asserção nova foi conferida antes numa cópia de rascunho: falha antes da correção e passa depois.

**Corrigido (commits sobre `346cf2d`):**

- `f0a6c16` — **Important 1** e **Ruling 3:** `criarServidor` resolve os módulos antes de abrir o servidor, então uma instalação incompleta falha na hora, com a causa, e não vira `404 não encontrado` em cada aula. O `bin/aula-usp.mjs` captura o erro, escreve `falha de ambiente: … / rode npm install na pasta do sistema` e sai com 2 (spec 8.1). O `engines.node` subiu para `>=20.6`, o piso real do `import.meta.resolve`.
- `47e513f` — **Important 2:** `.area pre` perdeu a cor fixa e usa `currentColor` na régua; dentro de `aside.destaque` e `aside.alerta`, comentário e número seguem a cor do campo, e a linha marcada continua tinta sobre amarelo. Fixture `#em-campos` e asserção no Chrome sobre as duas caixas — antes, código dentro do alerta saía tinta sobre tinta, e comentário cinza sobre amarelo dentro do destaque.
- `a0abfdf` — **Minor 1:** na classificação, a cor vem antes do peso: `@param` dentro de um bloco JSDoc é negrito, mas continua comentário. Teste unitário com um bloco JSDoc.
- `2e5a095` — **Important 3 (só o pino):** o espécime não tem linha de código passando da largura do bloco, medido com `scrollWidth > clientWidth`. A técnica fica registrada para o marco 4, que precisa dela para achar transbordo que a caixa do elemento esconde.

**Testes ao final:** 156 unitários e 73 de integração (apresentador 9, carregador 2, código 8, componentes 9, demos 4, impressão 6, layouts 11, matemática 6, motor 11, painéis 7), rodados um arquivo por vez.

**Re-revisão escopada:** os quatro itens resolvidos, sem quebra nova. O revisor refez a conta de especificidade e confirmou que a linha marcada dentro de `aside.alerta` continua tinta sobre amarelo, que a resolução ansiosa é memoizada e não pesa em cada `servirPasta`, que `process.exit(2)` não deixa `servidor` indefinido, e que nenhuma palavra-chave de verdade carrega o cinza do comentário — só o escopo `comment` recebe essa cor no tema.

**Durante a execução, antes desta revisão:**

- A varredura prévia do plano rendeu quatro decisões registradas: os três pacotes `@shikijs/*` no lugar de `shiki` (spec 7.1), erros de código no console até o painel do marco 4, `import.meta.resolve` aceito, e a checagem do grafo de módulos por expressão regular mantida como guarda barulhenta numa atualização do Shiki.
- Task 1: o relatório do implementador listou arquivos de integração que não existem, como no marco 3b. A integração foi rodada de novo pelo controlador, arquivo por arquivo (65/65), e a discrepância ficou registrada; a correção foi trocar o modelo dos implementadores restantes (Ruling 5).

**Continuam para os próximos marcos, de propósito:**

- Minor 2: um `\(` dentro de um bloco de código faz a aula baixar o KaTeX sem precisar.
- Minor 3: o Shiki carrega mesmo quando nenhum `data-lang` da aula está no contrato.
- Minor 4: `data-linhas` não é validado — intervalo invertido, `0`, número maior que o bloco, ou grande o bastante para travar a página.
- Minor 5: o marco 4 precisa do painel do validador para os erros de `renderizarCodigo`, como os de `renderizarTex`.
- Minor 6: o navegador registra só as gramáticas usadas, o build registrará todas; linguagem embutida dentro de um bloco LaTeX destaca diferente nos dois modos.
- Minor 7: os slides do espécime não têm notas.
- Minor 8: `montar/navegador.js` cresceu e mistura o carregamento do KaTeX com o do Shiki.
- Minor 9: a rota `modulos` serve a pasta inteira do pacote em desenvolvimento; ela desaparece no marco 5, junto com o mapa de importação, quando o script vier embutido com SRI.
- Para o marco 5: o grafo do navegador tem 719 KB sem minificar e sem o KaTeX, contra o alvo de 600 KB da spec 11.2; `import('@shikijs/langs/' + …)` com literal de template não se empacota estaticamente.
- Para o guia (marco 6): numa coluna 6-6 cabem cerca de 45 colunas de código, não 64; a tabulação sai com 8 espaços; `pre` sem `data-lang` recebe a forma do bloco, mas nenhum destaque.
