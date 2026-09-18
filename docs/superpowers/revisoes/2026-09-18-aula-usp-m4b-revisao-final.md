# Final review — branch `m4b-vocabulario` (afd4d75..affb6d8)

Reviewer: final branch review (opus), 2026-09-18.
Scope: the whole branch as a landing candidate, not task-by-task. The three task reviews and three
re-reviews in this directory were read first and are not repeated; everything below is either new or
an explicit extension of something they recorded.

Plan: `docs/superpowers/plans/2026-09-18-aula-usp-m4b-vocabulario-limites.md`
Spec: `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (4.2, 5.2, 5.3, 5.5, 5.6, 9.1, 9.2, 9.3, 11.1)
Diff: 8 commits, 81 files, +1779 / −26.

---

## Test counts observed (this session, this worktree)

| suite | expected | observed |
|---|---|---|
| `npm test` | 293 | **293 pass, 0 fail** |
| `tests/integracao/validador.test.mjs` | 3 | **3** |
| `tests/integracao/paineis.test.mjs` | 7 | **7** |
| `tests/integracao/apresentador.test.mjs` | 9 | **9** |
| `tests/integracao/impressao.test.mjs` | 6 | **6** |
| `tests/integracao/layouts.test.mjs` | 11 | **11** |
| `tests/integracao/codigo.test.mjs` | 8 | **8** |
| `tests/integracao/motor.test.mjs` | 11 | **11** |
| `tests/integracao/componentes.test.mjs` | 9 | **9** |
| `tests/integracao/demos.test.mjs` | 4 | **4** |
| `tests/integracao/carregador.test.mjs` | 2 | **2** |
| `tests/integracao/matematica.test.mjs` | 6 | **6** |

All green, all counts exactly as briefed (76 integration + 293 unit). The six specimen decks validate
through the real CLI path with **0 errors**; `muitos-blocos.html` emits its 10 intended warnings and
the other five are completely silent.

---

## 1. Spec 9.2 walk — the 33 rules of this branch

I walked every row against what the code checks, not against the plan's paraphrase. **31 of 33 check
what the row says.** Confirmed correct and not repeated here: all eight `vocabulario.*` rows; all
twenty `limites.*` rows wired to the right layouts and reading their number from `contrato.limites` /
`contrato.metadados` by key; `matematica.comando-proibido` (including the `\color`/`\colorbox` prefix
boundary and the `\passo`-not-`\htmlData` distinction); `recursos.alt`; `recursos.linguagem`. Severity,
group and phase for all 33 match 9.2 exactly (guarded independently at `tests/unit/contrato.test.mjs:98-103`).

Two rows do **not** check what the row says:

- `limites.palavras-corpo` / `limites.palavras-coluna` — spec 5.3's definition of a word is violated. **Critical 1.**
- `vocabulario.amarelo-svg` / `vocabulario.azul-svg` — spec 4.2's thresholds are applied to the wrong value. **Important 1.**

**Spec 5.3's two definitions, specifically, since 4c reuses them:**

*Title segment* — `segmentosDoTitulo` (`validador/regras/limites.js:10-18`) is **correct**: text between
`<br>`, TeX resolved to its rendered text (right, because the limit is in characters and the spec
calibrates it in px-per-rendered-character), empty trailing/leading segments dropped. Verified against
`Uma<br>`, `<br>Uma`, `Uma<br><br>Duas`, `Uma<br> <br>Duas`, TeX-in-title, and inline tags mid-segment.
One consequence is recorded as Minor 6.

*Word* — **incorrect**. See Critical 1. Everything *else* about the rewritten counter is right and I
re-verified it independently: block boundary rather than text node (`<h2>T</h2><p>corpo` = 2;
`pa<strong>la</strong>vra` = 1), `pre`/`code`/`aside.notas` excluded, SVG `<text>` included, attributes
and `alt` never counted, `figcaption` and table cells counted, `:scope > li` scoping correct on nested lists.

---

## 2. Design for milestone 4c

**`validador/` is Node-free, transitively — verified, not assumed.** Every import specifier reachable
from `validador/regras/index.js` is relative and carries its `.js` extension; the closure is
`validar.js`, `sequencia.js`, the five rule files, `componentes/tex.js`, `componentes/codigo.js`,
`montar/blocos.js`, `tokens/tokens.js`. No `node:*`, no bare specifier, no `process`, no `require`.
The DOM surface used across all seven validator files is exactly: `attributes, childNodes, children,
cloneNode, closest, getAttribute, hasAttribute, matches, nodeName, nodeType, nodeValue, normalize,
outerHTML, parentElement, querySelector, querySelectorAll, textContent` — all standard, all present in
a browser. The registry imports cleanly in isolation. The shapes carry the weight.

**What 4c will have to change — concretely:**

1. **`validar` needs a whole `document`, not "a cópia do corpo".** Spec 9.3 says the static group runs
   in the browser "sobre a cópia do corpo", but `validar(doc, …)` reads `doc.body`
   (`validador/validar.js:26-27`) *and* `doc.querySelector('meta[name=…]')` — `limites.metadado`
   (`limites.js:324`) and M4a's `estrutura.metadados` both read the `<head>`. Measured: hand `validar`
   a body-only copy wrapped in an empty document and you get **five false `estrutura.metadados` errors**
   ("falta a meta …") while `limites.metadado` silently stops checking a 70-character `disciplina` that
   the full-document run correctly reports. 4c must pass `document.cloneNode(true)` (a whole detached
   document) and take its body copy from that — or grow the signature to `{ doc, corpo }`. This is the
   single most important thing 4c must know.
2. **`validar` mutates the document it is given.** `doc.body.normalize()` at `validador/validar.js:26`.
   Measured: a `<p>a &amp; b</p>` goes from 3 child text nodes to 1 in the *caller's* tree. Semantically
   harmless, but it means 4c must not hand it the live document it is about to `montar`.
3. **Rule ownership of `data-lang` is by name, not by import.** `DE_OUTRA_REGRA`
   (`vocabulario.js:54`) is a hardcoded `Set`. When 4c adds load-group rules that take ownership of
   another attribute, this set must be extended by hand; nothing detects a missing entry.
4. **`fase` is now in the context and honoured by `vocabulario.classe`/`.atributo`** (verified: a
   `figure.grafico` is rejected at `fase: 1` and accepted at `fase: 2`) — but `vocabulario.script`
   ignores it. See Minor 2.
5. The registry reaches outside `validador/` into `componentes/codigo.js` (for `codigoDoBloco`) and
   `montar/blocos.js`. Harmless today; worth watching when `dist/` splits into `aula-usp.js` /
   `aula-usp-tex.js` / `aula-usp-codigo.js` with the size budgets of spec 11.2, so the base bundle does
   not acquire the code module through the validator.

---

## Findings

### Critical

**C1. The word counter counts TeX, contradicting spec 5.3 verbatim — and it is the piece 4c reuses.**
`validador/regras/limites.js:51-53` (`palavrasDe`), through `textoSemTex` (`componentes/tex.js:66-74`).

Spec 5.3, line 351: *"Palavras são as sequências separadas por espaço nos nós de texto, **sem contar
TeX** (`\( … \)`, `\[ … \]`), `pre`, `code` e `aside.notas`."* Four things are excluded by one list.
Three of them are excluded entirely — verified. TeX is not: `palavrasDe` pipes the text through
`textoSemTex`, which **replaces** each TeX segment with `texParaTexto`'s plain-text rendering, and
those tokens are then split on whitespace and counted.

Measured against the project's own specimen (`especime/matematica.html`), body word count as the rule
computes it versus the count with TeX genuinely excluded:

| slide | counted today | spec's count | inflation |
|---|---|---|---|
| `matematica` slide 6 | 45 | 11 | **+34** |
| `matematica` slide 3 | 41 | 29 | +12 |
| `matematica` slide 7 | 28 | 13 | +15 |
| `matematica` slide 4 | 24 | 14 | +10 |

Isolated cases: the spec 5.1 sample slide's paragraph plus `\[ w \leftarrow w - \eta \, \nabla E(w) \]`
counts **13** where the prose is 6. A bare `\[ \hat{y} = \sigma(\sum_{i=1}^{n} w_i x_i + b) \]` counts
**10**. A three-line `aligned` counts **17** — 19 % of the 90-word budget, for one equation.

Why it matters: `limites.palavras-corpo` is `erro`, so it blocks the build. A `conteudo` slide with 60
words of prose and two medium derivations is rejected as too wordy at 90+. That is the flagship content
type of a lecture design system, and the failure is in the *un*safe direction for authoring: the author
is told to cut words that are not words. The specimen passes only because those four slides are short
(45 words of slack at the worst one).

The code comment at `limites.js:21-23` asserts the opposite of what the code does and cites 5.3 as its
authority: *"TeX não conta pelo fonte (conta pelo texto renderizado, abaixo)"*. That rationale is
`segmentosDoTitulo`'s, where the limit is in **characters** and a rendered proxy is right; it was
carried across to the **word** rule, whose spec line says exclude. No review caught it because the
spec sentence was read as a list of elements — the fix-2 re-review quotes this exact line while fixing
the `svg` exclusion, and reads past "sem contar TeX".

Fix shape: drop the non-`texto` segments instead of rendering them — the same two-line idiom
`matematica.cifrao-suspeito` already uses at `recursos.js:48`
(`segmentosDeTex(…).filter((s) => s.tipo === 'texto')`). Note this changes `segmentosDoTitulo` not at
all; only `palavrasDe` should change.

---

### Important

**I1. `vocabulario.amarelo-svg` and `vocabulario.azul-svg` read the element's own attribute; SVG paint
and `font-size` inherit. Both false positives and false negatives, and they will disagree with 4c.**
`validador/regras/vocabulario.js:222-255`, specifically `numeroDoAtributo(elemento, 'font-size', 16)`
(`:249`), `numeroDoAtributo(elemento, 'stroke-width', 1)` (`:234`), and `atributoDe(elemento, 'fill')`
(`:227`, `:248`). `fill`, `stroke`, `stroke-width` and `font-size` are inherited SVG presentation
attributes; the contract allows all four on `<g>` (`contrato.svg.atributos`), and spec 4.2 states its
rules about the *rendered* result ("texto em `azul` só com 32 px ou mais").

Five probes against the real modules:

| SVG written by the author | rendered truth | rule says |
|---|---|---|
| `<g font-size="40"><text fill="#1094AB">` | blue at 40 px — legal | **`azul em texto de 16 px`** — false error |
| `<text font-size="40"><tspan fill="#1094AB">` | blue at 40 px — legal | **`azul em texto de 16 px`** — false error |
| `<g stroke-width="6"><line stroke="#FCB421">` | yellow at 6 px — legal | **`amarelo em traço de 1 px`** — false error |
| `<g fill="#1094AB"><text font-size="20">` | blue text at 20 px — **illegal** | silent |
| `<g fill="#FCB421"><text>` | yellow text — **illegal** | silent |

The `<text font-size>` + `<tspan fill>` shape in row 2 is the idiomatic way to colour one run inside a
line of SVG text, so this is not an exotic construction. Both rules are `erro`, so the false positives
block the build on legal figures with no way out except duplicating `font-size` onto every `<text>`.

This is also the branch's clearest case of *rules that disagree about the same content*: 4c's
`composicao.azul-pequeno` and `composicao.texto-no-amarelo` measure the rendered value in the browser,
so on rows 1–3 the static group will reject a figure that the composition group accepts, and on rows
4–5 the composition group will reject one the static group passed. Whoever fixes this should resolve
the same value once (walk up `parentElement` for an inherited `fill` / `stroke` / `stroke-width` /
`font-size`, stopping at `<svg>`) and let both groups agree.

`vocabulario.cor-svg` is **not** affected — it checks every element that carries a `fill`/`stroke`,
including `<g>`, `<defs>` and `<marker>` (verified). Only the two threshold rules are.

**I2. Character limits count source whitespace that HTML collapses, producing build-blocking false
errors on correctly-sized titles and text.**
`validador/regras/limites.js:17` (`.trim()` on each title segment) and `:55-57` (`textoDe`, `.trim()`
only), feeding `limites.titulo`, `limites.pergunta`, `limites.lide`, `limites.afirmacao`,
`limites.fonte`, `limites.legenda`, `limites.proxima`, `limites.sintese`.

Whitespace is trimmed at the ends but never collapsed in the middle, so a newline plus indentation
inside an element counts once per character while rendering as a single space. Spec 5.3 derives every
one of these limits from measured px-per-**rendered**-character (44,4 px at 96 px, and so on), so the
quantity being limited is unambiguously the rendered length.

Measured through the real pipeline:

- `<h2>` holding a 46-character title, wrapped across two source lines with 8 spaces of indent →
  `limites.titulo :: título com 55 caracteres num segmento (máx. 50).` The title renders in 46.
- `<p class="lide">` holding 112 characters, wrapped the same way →
  `limites.lide :: o lide tem 125 caracteres (máx. 120).` It renders in 112.

Both are `erro`. The specimen does not expose this — no specimen title or lead has collapsible
whitespace (checked all six decks) — so the whole suite is blind to it. It matters because this design
system exists to be authored by Claude, GPT and Codex, which routinely wrap long text across source
lines; the first indented 45-character title in a generated deck fails the build for being "55
characters". Fix: collapse `\s+` to a single space before measuring, in both `segmentosDoTitulo` and
`textoDe`. (`data-rotulo` and `data-curto` are attribute values and correctly stay as written.)

**I3. `vocabulario.classe` reports on elements `vocabulario.elemento` has already rejected, breaking
the one-owner convention its sibling rule enforces and tests.**
`validador/regras/vocabulario.js:113-117`. `vocabulario.atributo` deliberately skips elements outside
the vocabulary (`:151`), and that suppression has its own named test — *"elemento fora do vocabulário
não tem os atributos enumerados depois"* (`tests/unit/vocabulario.test.mjs:36`) with the comment "Uma
regra, um dono". `vocabulario.classe` has no such guard. Measured:

- `<marquee class="bonito">` → `vocabulario.elemento` + `vocabulario.classe` ("classe bonito não existe
  no contrato") — two errors, one mistake.
- `<iframe class="demo">` → `vocabulario.elemento :: <iframe> é proibido` **plus**
  `vocabulario.classe :: classe "demo" não vale em <iframe>, só em <div>.` The second message is not
  merely noise, it is misleading advice: it points the author at changing the tag to a `div` when the
  right answer is to delete the element.
- Control, same shape with an attribute instead of a class: one message, as designed.

Fix is the one line the sibling rule already has.

**I4. The contract→code closure test covers only `estrutura.`, leaving all 28 rules this branch added
unguarded in that direction.**
`tests/unit/validador.test.mjs:320` — `test('toda regra de estrutura do contrato está implementada')`,
filtered by `nome.startsWith('estrutura.')`. The forward directions are properly guarded (every
implemented rule exists in the contract and has a fixture, `:314`), and the fixture runner was correctly
de-tautologised (it runs *all* rules and filters by folder — good change, and I confirmed all 46 pairs
behave: every `ruim.html` fires its own rule, every `bom.html` is silent from its own rule).

But nothing fails if a `vocabulario.*` or `limites.*` rule is added to `contrato.json` and never
implemented, or dropped from the registry. Measured: 46 rules implemented, **47** static/phase-1 rules
in the contract, and the single gap is exactly `matematica.simbolo-fora-do-tex` — deferred on purpose by
Ruling 2. So the general test is writable today with one named, commented exception, and would have
guarded the very drift Ruling 6a describes (the 20 limit fixtures arriving while a second hardcoded
rule list in the test file stayed behind).

**I5. Spec 5.5's "SVG inline, só dentro de `figure`" is unenforced once the `<svg>` sits inside an
allowed body block.** Measured: `<p>texto <svg>…</svg></p>` and `<li><svg>…</svg></li>` produce **no
finding at all** from any of the 46 rules. Only a direct child of `section` or of a column `div` is
caught, by M4a's `estrutura.fora-do-layout` (verified). Once inside, `emSvg()` switches the whole
subtree to the SVG vocabulary, so its contents validate happily. The right home is probably the
contract rather than code — `contrato.html.classes` already has a `dentro` mechanism and
`contrato.filhos` a containment one; `html.elementos` has neither, so `svg` cannot currently express
"only inside `figure`". Worth deciding in 4c or 5 rather than patching in code.

---

### Minor

**M1. `matematica.cifrao-suspeito` has the same non-global `.exec` as the known colour-macro finding,
in a second place the known finding does not name — and its `.join(' ')` lets a `$` pair across an
entire equation.** `validador/regras/recursos.js:48-49`.
- Non-global: `Veja $a^2$ e depois $b_1$ tambem.` in one text node → only `$a^2$` is reported. (Split
  across two `<p>` → both reported, confirming the cause.)
- Cross-TeX pairing: `Custa R$ 5 e \( x^2 \) o valor_base sobe a R$ 9.` → aviso on
  `"$ 5 e   o valor_base sobe a R$"`. The non-TeX fragments are joined before matching, so a `$` before
  an equation pairs with a `$` after it. This is the known "spans two amounts" finding generalized —
  the fix wave should treat the segments separately, not just swap `exec` for `matchAll`.
- A realistic false positive of the known finding, for the record:
  `O preço R$ 10 sobe 50\% e vai a R$ 15.` → aviso on `"$ 10 sobe 50\% e vai a R$"`.

**M2. `vocabulario.script` fires on a legitimate phase-2 script.** `validador/regras/vocabulario.js:257-271`.
Spec 9.2 says the rule checks "script dentro de `section` **fora dos tipos permitidos**", and 5.5 permits
`script[type="application/json"]` inside `figure.grafico` in phase 2. The rule yields unconditionally and
only varies its message; `contrato.regras['vocabulario.script'].fase` is 1, so it also runs at `fase: 2`.
Measured: the same legal phase-2 chart is rejected at `fase: 1` **and** at `fase: 2`. Currently
unreachable (nothing runs phase 2), but it is a guaranteed false positive the moment charts land, and the
"gráficos e diagramas são da fase 2" text is a phase judgement hardcoded in a rule file. Inherit to
milestone 5.

**M3. SVG `<title>` and `<desc>` count toward the body word budget.** `limites.js:24`
(`FORA_DA_CONTAGEM`). Measured: `<svg><title>a b</title><desc>c d</desc></svg>` contributes 4 words.
They are accessibility text, never rendered on the slide — the same reason `alt` correctly contributes
nothing. Including SVG `<text>` was the right call (fix-2's finding); `<title>`/`<desc>` came along with
it.

**M4. Nested tables double-count rows.** `limites.js:292-293`: `tabela.querySelectorAll('tr')` descends
into a nested `<table>`, and `!linha.closest('thead')` does not scope to the owning table. Measured: a
1-row outer table holding a 9-row inner table reports **both** "10 linhas de dados" and "9 linhas de
dados". Unlikely content, but it is the "walker answering a question it was not built for" shape this
milestone kept tripping over.

**M5. A long `data-curto` outside `abertura` is reported twice** — `vocabulario.atributo :: atributo
"data-curto" só vale no layout abertura.` plus `limites.nome-curto :: data-curto com 13 caracteres
(máx. 10).` `limites.nome-curto` (`limites.js:143-153`) scans every `section`, not only aberturas.

**M6. `limites.segmentos-titulo` is blind to `<br><br>`.** `segmentosDoTitulo` drops empty segments
(deliberately, and rightly for a trailing `<br>`), so `<h2>Uma<br><br>Duas</h2>` reports **nothing**
while rendering on three lines. Three non-empty segments are correctly caught. Only 4c's
`composicao.linhas-titulo` will catch the `<br><br>` case — acceptable, since the composition group runs
in both modes, but 4c should know its rule is the sole guard there.

**M7. `contrato.html.atributos.img.alt.obrigatorio` is contract data with no reader.** `recursos.alt`
checks `hasAttribute('alt')` directly and no rule consults `obrigatorio`. Harmless, but it is the one
place in the new contract surface where data implies an enforcement that lives in code instead.

---

### Already known, carried into the fix wave — I agree with all four

1. **Non-global `.exec()` on `comandosTexPorPadrao`** (`recursos.js:33`) reports only the first colour
   macro per TeX segment. Confirmed: `\( \red{a} + \blue{b} \)` → only `\red`. Note the exact-string
   loop just above it is correct (`\color` + `\textcolor` → two findings, `\colorbox` not matched by
   `\color` — all verified). **Extend the fix to M1's second site.**
2. **`img[src^="https://"]` is case-sensitive** (`recursos.js:71`), so `HTTPS://` bypasses
   `recursos.imagem-externa`. Refinement worth recording: the lecture is **not** silently accepted —
   `vocabulario.atributo` rejects it as `src com valor fora da forma esperada` via the contract's `src`
   pattern (verified), which is also case-sensitive. So the real defect is that a warning becomes a
   confusing error; fixing the selector without also making the contract's `src` pattern
   case-insensitive would leave both messages firing.
3. **The suspicious-dollar regex spans two unrelated amounts** — confirmed, see M1 for two further
   reproductions.
4. **`Class` + `class` duplicate-by-case has no regression test.** Agreed; `build/validar.mjs:47-48`'s
   first-wins behaviour is a by-product of the reverse-order re-insertion, not an expressed intent.

---

## 3. Contract-as-data discipline

**Clean.** Audited all 33 new rules: no severity, no remediation text and no limit number appears in
code. Every threshold is read by key from `contrato.limites` / `contrato.metadados`; every vocabulary
list, value enum, pattern and colour set is read from `contrato.html` / `contrato.svg` /
`contrato.proibidos` / `contrato.linguagens`. `contrato.test.mjs` asserts all 64 rules' severity, group
and phase against a table written out in the test file (an independent second statement of spec 9.2, not
a re-read of the contract) and asserts `contrato.svg.cores` equals the token values plus `none`, so the
colour vocabulary cannot drift from `tokens/`.

**`proibidos.comandosTexPorPadrao` is genuinely data.** It is an array of regex source strings consumed
generically (`recursos.js:32-36`): `for (const padrao of … ?? []) new RegExp(padrao)`. Adding a second
pattern needs no code change, the `?? []` keeps older contracts loadable, and
`contrato.test.mjs:171` compiles every pattern in the contract so an unparseable one fails the suite. The
message it produces uses the *match* (`achado[0]`), not a hardcoded name — correct.

The only duplications in the new contract surface are both guarded or inert: `contrato.linguagens`
versus `contrato.html.atributos.pre['data-lang'].valores` are asserted equal at
`contrato.test.mjs:164` (good — and `vocabulario.atributo` defers `data-lang` to `recursos.linguagem`,
so only one of the two is live), and the language list also appears inside that rule's `acao` text,
which is contract prose and acceptable. `Ruling 4`'s deferred last-write-wins in `atributosPermitidos`
remains inert and correctly deferred. M7 above is the one small gap.

**Guard direction:** code→contract and code→fixture are guarded; contract→code is guarded only for
`estrutura.` — Important 4.

---

## 4. Tests worth trusting

- **No test asserts the implementation back to itself.** The fixture runner used to (one rule in the
  air, so every finding was trivially that rule); this branch fixed it to run the full registry and
  filter by folder name, with the reasoning written down at `tests/unit/validador.test.mjs:295-300`.
  Good change.
- **All 46 fixture pairs exercise their own rule** — enforced mechanically (`bom.html` silent from its
  own rule, `ruim.html` fires it), and I spot-diffed five pairs: each differs from its partner in
  exactly the property under test and nothing else.
- **Ruling 8's substitution is sound.** The 17 `bom.html` fixtures that sit far from their limit are
  compensated by two boundary tests (`limites.test.mjs:186`, `:207`) that walk "exactly at the limit
  passes, one more accuses" across the numeric rules. That proves the off-by-one better than 17
  hand-tuned files would.
- **Gaps that matter:** (a) the contract→code closure, Important 4; (b) no test uses non-lowercase
  attribute input through the *parsing boundary* — the known `Class`+`class` gap, and the reason
  `normalizarAtributos` in `build/validar.mjs` is exercised only indirectly; (c) no fixture or unit test
  contains TeX inside a `conteudo` body, which is why Critical 1 survived two rewrites of the counter
  and three reviews.
- **Gaps that do not matter:** the absence of tests for nested tables (M4), SVG `<title>`/`<desc>` (M3),
  and phase-2 scripts (M2).

---

## 5. What milestones 4c and 5 inherit

*(This section is copied into the repository's review archive.)*

**For 4c (load group, composition group, browser panel):**

1. **`validar` needs a whole document, not a body copy.** Spec 9.3's wording ("sobre a cópia do corpo")
   does not match the signature: `validar(doc, …)` reads `doc.body` *and* `doc.querySelector('meta…')`.
   Handing it a body-only copy yields five false `estrutura.metadados` errors and silently disables
   `limites.metadado` (measured). Pass `document.cloneNode(true)`, or grow the signature to
   `{ doc, corpo }`. **This is the one thing 4c must not discover late.**
2. **`validar` mutates its input** (`doc.body.normalize()`), so the copy must be taken before the call,
   not after.
3. `validador/` is genuinely browser-importable — verified transitively. Nothing to fix; do not let it
   regress. The registry does reach into `componentes/` and `montar/`, which matters only when `dist/`
   splits into the three bundles of spec 11.2.
4. **The static and composition groups will contradict each other on SVG colour** until Important 1 is
   fixed. `composicao.azul-pequeno` / `composicao.texto-no-amarelo` measure rendered values;
   `vocabulario.azul-svg` / `.amarelo-svg` read one attribute. Resolve the inherited value once and let
   both read it.
5. **`composicao.linhas-titulo` is the sole guard against `<br><br>`** in a title (Minor 6) — the static
   segment rule cannot see it by design.
6. **`palavrasDe` and `segmentosDoTitulo` are exported for 4c to reuse.** Take them *after* Critical 1
   is fixed. Both assume a normalized tree: called directly on a freshly-parsed document they miscount
   (recorded in fix-2's re-review); `validar()` normalizes first, a direct caller must too.
7. **`DE_OUTRA_REGRA`** (`vocabulario.js:54`) is the hand-maintained list of attributes another rule
   owns. Any load-group rule that takes ownership of an attribute must be added there, or the attribute
   is reported twice.
8. **Ruling 4 is still open**: `atributosPermitidos` merges same-named attribute rules from multiple
   matching selectors with silent last-write-wins. Inert in today's contract. 4c was nominated to decide
   whether `contrato.json` needs explicit precedence; it still needs deciding.
9. **`matematica.simbolo-fora-do-tex`** remains the only static phase-1 rule in the contract with no
   implementation (Ruling 2, moved to milestone 5 with its twin `saida.glifo-ausente`, both reading
   `validador/cobertura.json`). Any generalized closure test must name it as the single exception.

**For 5 (phase 2, build, `dist`):**

10. **`vocabulario.script` will reject every legitimate chart and diagram** the moment phase 2 lands
    (Minor 2). It needs to consult `fase` and `contrato.html.elementosFase2.script` before yielding.
11. **`build/validar.mjs`'s `normalizarAtributos` is the browser-parity fix** (Ruling 5) and must be
    called wherever the build parses a lecture with `linkedom`, not just in `validarArquivo` — the
    comment at `build/validar.mjs:22-31` says so; milestone 5 is where it becomes load-bearing.
12. **Spec 5.5's "SVG inline, só dentro de `figure`"** has no rule (Important 5). Decide whether
    `contrato.html.elementos` grows a containment form, as `classes` already has `dentro`.
13. **Word and character counting are UTF-16 code-unit based** throughout (`texto.length`,
    `linha.length`). Fine for Portuguese, wrong for emoji and combining accents. Only worth revisiting
    if `matematica.simbolo-fora-do-tex` / `saida.glifo-ausente` make the glyph inventory a first-class
    concern — which is exactly milestone 5's job.

---

## Verdict

**Ready to merge? — With fixes.**

The architecture is right and I would not ask for it to change: the registry is genuinely browser-ready
(verified transitively, not assumed), the contract-as-data discipline holds without exception across all
33 rules, `comandosTexPorPadrao` is real data with a real guard, the fixture harness was correctly
de-tautologised, and the boundary-test substitution of Ruling 8 is better than the fixtures it replaced.
The specimen is clean and all 293 + 76 tests pass exactly as briefed.

What blocks a merge as-is is that two of the 33 rows check something other than what spec 9.2 and its
referenced sections say, and both fail in the unsafe direction — they reject correct lectures with
`erro`, which stops the build. Critical 1 charges a math slide 34 words for one derivation, on the
system's flagship content, and it is the exact function milestone 4c has been told to reuse, so it must
not land in this state. Important 1 rejects the idiomatic `<text font-size>` + `<tspan fill>` figure and
will set the static group against 4c's composition group. Important 2 rejects a 46-character title for
being 55. None of the three is a design flaw; all are localized — a `.filter` in `palavrasDe`, an
inherited-value lookup shared by two rules, and a `\s+` collapse in two helpers — and all belong in the
single fix wave already planned for the four known findings, alongside Important 3 and Important 4,
which are one line and one test respectively. With those in, this lands.

## O que foi feito depois desta revisão

A revisão acima foi feita por um revisor opus sobre `afd4d75..affb6d8`, com sondas próprias sobre os módulos reais e as onze suítes de integração rodadas uma a uma. Seguiu-se uma única rodada de correção, em oito commits, e uma re-revisão escopada que verificou cada grupo e reproduziu o que precisava ser reproduzido.

**Corrigido (commits `7a7fb03` a `5d6eaff`, sobre `affb6d8`):**

- **Critical:** a contagem de palavras contava o TeX. A spec 5.3 diz "sem contar TeX", e o código convertia cada equação no seu texto renderizado e contava esse texto — uma equação de dez símbolos comia dez das noventa palavras do slide. Agora os segmentos de TeX são descartados. O limite de **caracteres** de título continua contando o TeX renderizado, que é outra regra da mesma seção: palavra e caractere têm definições diferentes, de propósito.
- **Important:** `fill`, `stroke`, `stroke-width` e `font-size` são herdados em SVG, e as regras de cor liam só o atributo do próprio elemento. Um `<g fill="#FCB421">` pintava os `<text>` de dentro sem ser acusado, e um `<text>` azul com `font-size` no ancestral era medido pelo padrão de 16 px e acusado sem razão. Agora a busca sobe pelos ancestrais dentro do `<svg>`.
- **Important:** os limites de caractere contavam o espaço em branco do fonte, que o HTML colapsa — um título de 46 caracteres escrito em três linhas era reportado como 55, acusando aula correta.
- **Important:** `vocabulario.classe` acusava a classe de um elemento que `vocabulario.elemento` já tinha rejeitado, quebrando a regra de um dono por erro que o próprio marco estabeleceu.
- **Important:** a guarda que amarra contrato e código cobria só o prefixo `estrutura.`; dava para apagar `limites.tabela` do registro e a suíte passava. Agora cobre todas as regras estáticas de fase 1, com `matematica.simbolo-fora-do-tex` como exceção nomeada e comentada — a que este marco adiou para o 5.
- **Important:** a spec 5.5 diz "SVG inline, só dentro de `figure`", e um `<svg>` solto no corpo do slide passava.
- Mais os quatro achados que vinham da revisão da tarefa 3 (padrão de cor reportando só a primeira ocorrência; `HTTPS://` maiúsculo escapando de `recursos.imagem-externa`; cifrão atravessando TeX; falta de teste para `Class` e `class` no mesmo elemento) e dois de uma linha (`recursos.alt` lendo o contrato em vez de decidir sozinho; `data-curto` fora da abertura acusado uma vez só).

**Testes ao final:** 306 unitários e 76 de integração, rodados um arquivo por vez. Os seis decks do espécime validam como esperado: cinco sem nada, e `muitos-blocos.html` com os dez avisos que aquele deck existe para exercer.

**Uma edição de contrato, feita com justificativa:** o padrão de `img.src` passou a aceitar o esquema `https://` em qualquer caixa. Sem isso, corrigir só o seletor de `recursos.imagem-externa` faria um `HTTPS://` disparar **duas** mensagens — o aviso certo e um erro confuso de `vocabulario.atributo`. A re-revisão conferiu que o padrão relaxado continua recusando `https:/` com uma barra, `HTTPS/pasta` sem esquema e variantes de `DATA:`.

**Adjudicado, não corrigido:** a re-revisão apontou que `matematica.cifrao-suspeito` ainda casa dois valores em dinheiro separados quando há uma barra entre eles ("R$ 10 sobe 50\% e vai a R$ 15"). Olhando a spec 9.2, isso **não é defeito**: a regra é definida como "aviso: `$…$` com `\`, `^` ou `_` dentro", e é exatamente o que o código faz. A regra é heurística por desenho, e é aviso por isso. Apertá-la seria divergir do contrato sem mandato; fica registrado para o guia do marco 6 tratar, se incomodar na prática.

**Durante a execução, antes desta revisão:**

- **Tarefa 1:** a revisão achou que nome de atributo não era dobrado para minúsculas, enquanto o `linkedom` preserva a grafia do autor e o navegador a normaliza. Era a generalização de um defeito que a própria tarefa já tinha corrigido para nome de elemento. O implementador ampliou a correção por conta própria, com razão: tornar `Style=` válido em `vocabulario.atributo` sem corrigir a regra dona do valor deixaria o atributo mal-escrito sem dono nenhum.
- **Tarefa 2:** três Criticals, todos de código do plano. A contagem de palavras somava sobre o `textContent` concatenado, fundindo texto de elementos vizinhos num token só; `limites.palavras-corpo` punha o lide no orçamento do corpo e depois subtraía o título, aritmética que dava negativo; e `limites.tabela` era derrotada por `rowspan`. A correção abriu um buraco novo — texto de SVG saiu da contagem, porque o andador reusado existia para matemática — e precisou de uma segunda rodada.
- **Tarefa 3:** entregou as cinco regras, mais a normalização de nome de atributo na fronteira de parsing, que é onde o navegador a faz. Sem ela, `<div Class="colunas">` deixava `matches('div.colunas')` falso e cegava o casador de sequência, o `estrutura.colunas` e o próprio `montar` para uma grade que o navegador enxerga.

**Continuam para os próximos marcos, de propósito:** os quatro Minor que a revisão final listou e esta rodada não tocou (script de fase 2 recusado; `<title>` e `<desc>` de SVG contando como palavras do corpo; tabela aninhada contando linhas duas vezes; título com dois `<br>` seguidos invisível para `limites.segmentos-titulo`), o Minor que a re-revisão encontrou (`<svg>` filho direto de `section` acusado por duas regras, ambas corretas), e o item de contrato adiado desde a tarefa 1: atributos de mesmo nome declarados em seletores diferentes se sobrepõem com "o último vence", sem precedência explícita.
