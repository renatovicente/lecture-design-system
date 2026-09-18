# M4a final review: 61c67ba..ce7a824 (branch m4a-validador)

I read the whole-branch package in one pass (`review-61c67ba..ce7a824.diff`, 41 files, 11 commits), then
checked it against:

- the plan `docs/superpowers/plans/2026-09-17-aula-usp-m4a-validador-estrutura.md`, including its
  "Global Constraints" and "O que já está verificado";
- spec sections 5.2, 5.3, 5.5, 5.6, 8.1, 8.2, 9.1, 9.2, 9.3 and 11.1;
- the ledger (`progress.md`, Rulings 0–7), the three task reviews and the three re-reviews;
- the surrounding code at head: `contrato/contrato.json`, `montar/montar.js`, `montar/blocos.js`,
  `montar/metadados.js`, `motor/apresentador.js`, `motor/copias.js`, `componentes/tex.js`,
  `estilos/layouts.css`, `build/servir.mjs`, `package.json`.

The worktree was not modified except for this file: every probe ran from the session scratchpad, against
either the worktree's own modules (imported by absolute path, with `linkedom` resolved out of the
worktree's `node_modules`) or copies of the tree under `…/scratchpad/copia*/`.

## Evidence gathered

- **Suites re-run here, counts observed, not reported.** Unit: `npm test` → **210 tests, 210 pass,
  0 fail**. Integration, one file per command: `validador` 2/2, `paineis` 7/7, `apresentador` 9/9,
  `impressao` 6/6, `layouts` 11/11, `codigo` 8/8, `motor` 11/11, `componentes` 9/9, `demos` 4/4,
  `carregador` 2/2, `matematica` 6/6 — **75/75, all exit 0**. The ledger's numbers hold.
- **Commit trailers:** all 11 commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Rule probes** with the real modules over `linkedom`: 27 scenarios (one-slide lecture, empty body,
  section without `data-layout`, `data-passo` on the `section`, TeX split across elements, `figure`
  inside a column, content inside `aside.notas`, notes inside a column, English lecture, author id
  colliding with a generated one, three elements sharing an id, nested `section`, empty `data-curto`,
  impossible date, `div.colunas` with no `data-grade` and with an off-contract one, `meta` in the body).
- **Assembly probes:** `montar()` run on the decks the probes produced, to see what the validator's
  verdict actually costs the professor (notes inside a column; empty `data-curto`; missing `data-grade`).
- **CLI probes on copies of the tree:** no `node_modules`; broken `contrato.json`; deleted
  `contrato.json`; empty `index.html`; an HTML fragment; a 4 000-error lecture piped to a reader;
  unknown and cross-command flags; two positionals.
- **Patched scratch copies** to prove each proposed fix: the two I propose for the Critical and for
  Important 2 are three lines total and were verified end to end in `…/scratchpad/copia*`.
- **Fixture sweep:** all 26 fixtures run twice — once against their own rule (as the suite does) and once
  against all 13 rules.

## Strengths

- **The contract-as-data discipline holds, and it is checkable.** `grep` over `validador/` finds no
  `node:` import, no `require(`, no `process.`, no hardcoded remediation text and no hardcoded numeric
  limit: every limit is read from `contrato.limites`, every severity and every `acao` from
  `contrato.regras` (`validador/validar.js:34-45`). The only literals `'erro'`/`'aviso'` are in
  `contar()`, which names the severity vocabulary rather than deciding a rule's severity.
- **The two-pass matcher is the right design, and the ledger's Critical is genuinely dead.**
  `casarSequencia` (`validador/sequencia.js:79-102`) asks the two questions separately — cardinality by
  set, then order by monotonicity of the assigned indices — so a displaced element can never be reported
  as absent. I probed the five shapes that a greedy matcher confuses (lide after the body, question
  before the `h2`, answer before the statement, a loose block before the demo, a second `figcaption`):
  every one produces exactly one "fora de ordem"/"a mais" finding and zero false "sem …".
- **The messages are honest about what they found.** The `umDe` fallback that names every alternative
  ("layout \"conteudo\" sem div.colunas nem bloco de corpo", `sequencia.js:72`) is better than picking one
  by accident, and the specificity rule for `contrato.filhos` (`conteudo.js:58-63`) keeps a
  `div.exercicio` written as a column from being judged under two contradictory keys.
- **`itensDoConteudo` treats the display equation as a first-class item.** Reading the bare `\[ … \]`
  text node as `tex-destaque` (`sequencia.js:7-24`) is what makes `blocosDeCorpo`'s `tex-destaque` entry
  executable rather than decorative, and it is the reason `especime/matematica.html` validates.
- **Parser symmetry is designed in, not discovered later.** `TRANSPARENTES = { table: ['tr'] }`
  (`conteudo.js:7`) makes the implicit-`tbody` difference between Chrome and linkedom invisible to the
  rules — the M3a lesson applied before it could bite 4c.
- **The `\passo` handling is subtle and right.** Counting `\passo{n}` in the source TeX as a numbered step
  (`estrutura.js:144-149`) while walking text nodes with `textosComTex`, so an example inside `pre`/`code`
  does not count, is the kind of detail that only shows up when someone actually writes a lecture about
  LaTeX — and `especime/codigo.html` has one.
- **Exit-code and message shape match the spec character for character.** `linhaDe`
  (`validador/validar.js:53-57`) reproduces spec 9.1's example exactly, and the `--json` key order is
  asserted against the spec's list (`tests/unit/validar-cli.test.mjs:74`).
- **The guard tests bind code to contract in both directions** (`tests/unit/validador.test.mjs:271-283`):
  every implemented rule must exist in the contract and own a fixture, and every `estrutura.*` static
  phase-1 rule in the contract must be implemented. Both fail loudly on a typo in a rule name, which is
  otherwise a silent no-op (`validar.js:34` skips a rule with no contract entry).
- **The specimen notes are real presenter prose, in the deck's own language** (English in
  `especime/ifusp.html`), and they do not disturb the rendered slide: the 75 integration tests, including
  the pixel and print ones, are unchanged.

## Findings

### Critical

**1. A missing dependency exits 1 with a raw stack trace, not 2 — the plan's own Global Constraint and
spec 8.1.** `bin/aula-usp.mjs:9` imports `build/validar.mjs` statically, and `build/validar.mjs:6`
imports `linkedom` statically. Nothing can catch a resolution failure that happens before the module
body runs.

Reproduced on a copy of the tree with no `node_modules`:

```
$ node …/copia/bin/aula-usp.mjs validar …/copia/especime
node:internal/modules/package_json_reader:301
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'linkedom' imported from …/copia/build/validar.mjs
EXIT=1
```

Spec 8.1: "2 com falha de ambiente, como arquivo ou **dependência ausente**". The plan restates it as a
Global Constraint (line 24). Exit 1 means "the lecture has validation errors", so an agent following the
`SKILL.md` procedure — check that `aula-usp` answers, then fix what it reports — is told to fix a lecture
that is fine, by a CLI that never parsed it.

This is the same failure class the branch's last commit (ce7a824) declares fixed. Ruling 7 deferred
`build/servir.mjs` by import, which is correct, but stopped one file short: the module the `validar`
command itself needs is still static. The guard test at `tests/unit/validar-cli.test.mjs:125-133` locks
the rule for `servir.mjs` only, so nothing notices.

Fix verified in the scratch copy (three lines): drop the static import, `await import('../build/validar.mjs')`
inside the existing `try` of `validarComando`, make it `async`. Result on the same tree:

```
falha de ambiente: Cannot find package 'linkedom' imported from …/copia/build/validar.mjs
EXIT=2
```

`linhaDe`/`cabecalhoDe` come from `validador/validar.js`, which has no dependencies, so they can stay
static. Extend the guard test to both modules.

### Important

**1. `aside.notas` is accepted at any depth, and a misplaced note is projected to the class.**
`semOpcionais` (`validador/regras/conteudo.js:19-22`) filters `contrato.sempreOpcional`
(`contrato/contrato.json:14`) at *every* level — the section's sequence and every `contrato.filhos`
key — so `div.colunas > div > aside.notas` passes `estrutura.fora-do-layout`, although the contract says
a column holds only `blocosDeCorpo` (`contrato.json:51`) and spec 5.3 says "cada `div` contém só blocos
de corpo".

The system disagrees with that verdict in both directions. `montar` only excludes notes that are
**direct children** of the section from the visible area (`montar/montar.js:36-41`), and the presenter
window only reads `:scope > aside.notas` (`motor/apresentador.js:128`). Probed with the real `montar`:

```
nota na coluna dentro de .area? true
texto da .area: TaNOTA NA COLUNAb
```

So the note is rendered on the slide, in front of the students, and is missing from the presenter
window — while `estrutura.notas-ausentes` still warns that the slide has no notes
(`estrutura.js:163`, the same `:scope >`). The author gets a warning that points away from the actual
mistake. Fix: scope `sempreOpcional` to the section level (skip it in `conferirFilhos`, keep it in
`conferir`'s section call), so a note anywhere else is a `estrutura.fora-do-layout` finding.

**2. `--json` is silently truncated at 64 KiB when piped.** `bin/aula-usp.mjs:70` writes the whole
document in one `console.log`, then `:75` calls `process.exit`, which drops the pending write to a pipe.
Measured on a lecture with 4 002 findings:

```
$ aula-usp validar … --json | <reader>
PIPE TRUNCADO, bytes 64320: Unterminated string in JSON at position 64320
$ aula-usp validar … --json | cat | wc -c
   65536
```

Redirecting to a file is safe (writes are synchronous there), and the plain-text path survives because it
is many small writes — so the suite, which uses `execFileSync`, never sees it. `aula-usp validar x --json | jq`
is the documented agent path, and it yields invalid JSON. Today it takes ~180 findings to reach the
threshold; with 4b's 28 further static rules a first draft from a model will reach it routinely.
Fix verified: `process.exitCode = erros > 0 ? 1 : 0` instead of `process.exit` — 1 468 534 characters
through the pipe, JSON valid, exit code still 1.

**3. `linkedom` and `playwright-core` are declared as devDependencies, but `bin/` now depends on
`linkedom` at runtime.** `package.json` puts both under `devDependencies`; spec 8.2 lists `katex`,
`shiki`, `linkedom`, `playwright-core` and `pdf-lib` as the package's **dependencies** and keeps only
`esbuild`, `fontkit`, `pixelmatch` and `pngjs` as development ones. Before this branch the distinction
was academic — linkedom was used by tests and by build scripts. From this branch on, `aula-usp validar`
is a shipped command that cannot run without it, so any `npm install --omit=dev`, and the eventual
`npm install -g aula-usp` of spec 8.1, installs a CLI whose main command is broken (and, with the Critical
above, broken with a stack trace and the wrong exit code). Move `linkedom` — and `playwright-core`, which
the composition group will need in 4c — into `dependencies`.

**4. An empty `data-curto` defeats `estrutura.nome-curto`, and the fallback restores the long title.**
`estrutura.js:128` accepts the attribute's mere presence (`secao.hasAttribute('data-curto')`), while
`montar/blocos.js:27` uses `secao.getAttribute('data-curto') || titulo` — an empty string is falsy.
Probed end to end: an abertura with `data-curto=""` and a 22-character `h2` produces no finding, and the
cover roadmap then reads

```
nomes curtos no roteiro da capa: [ 'Retropropagação do erro', 'Dois' ]
```

which is exactly the outcome the rule exists to prevent. 4b will not catch it either: `limites.nome-curto`
checks "≤ 10 characters", and the empty string passes. Fix: require a non-empty trimmed value.

**5. The fixture pairs assert much less than they look like they do.** Two problems, both in
`tests/unit/validador.test.mjs:259-269`:

- The loop runs **only the folder's own rule** (`rodar(…, [regra])`), so `assert.ok(ruim.every((achado) =>
  achado.regra === nome))` at line 267 is tautological — a single-rule run cannot produce another rule's
  finding. It reads like a guard and guards nothing.
- Because only one rule runs, `bom.html` is never required to be a good lecture. I ran all 26 fixtures
  against all 13 rules: **every single `bom.html` fails other rules**, most with hard errors
  (`estrutura.primeiro-slide`, `estrutura.ultimo-slide`, `estrutura.obrigatorio`). For example
  `estrutura.fora-do-layout/bom.html` is a lone `conteudo` section: no cover, no closing, no notes.

The pairs do exercise the right thing for their own rule — I read all 26 and each `ruim.html` fails for
the reason its name claims, and `estrutura.passos-mistos` even exercises the TeX path. The problem is the
convention, and it is worth settling **now**: 4b adds ~28 more pairs and 4c more still. Either say
explicitly that a fixture is a snippet for one rule (and then drop the vacuous assertion and replace it
with something real — e.g. assert the finding's `mensagem`, which is what the review of each rule
actually cares about), or make `bom.html` a valid lecture and assert it clean under every implemented
rule. The second buys a genuine cross-rule regression net for the price of ~6 extra lines per fixture.

### Minor

1. **`estrutura.id-ausente` produces a garbled sentence when the layout is missing.** `estrutura.js:118`
   reuses `nomeDoLayout`, whose no-layout branch returns a clause, not a name:
   `slide de layout uma section sem data-layout sem id.` (`estrutura.js:12-15`). The other user of the
   helper is guarded by `COM_NOTAS`, so this is the only reachable case.
2. **`onde()` degrades a finding to "aula" for any element whose closest `section` is not a top-level
   slide** (`validador/validar.js:12-15`). Today only `estrutura.id-duplicado` (`estrutura.js:106`) reaches
   it, via a nested `section`: the finding prints `ERRO · aula · estrutura.id-duplicado …` and loses both
   number and id. 4b's element-first rules (`vocabulario.style`, `limites.rotulo`, …) will all call
   `closest('section')`. A `slides.findIndex((s) => s === secao || s.contains(secao))` fallback fixes the
   whole class before it is written.
3. **A `div.colunas` with no `data-grade` passes every rule, in this milestone and in 4b.**
   `estrutura.colunas` returns early when the grade is not in the contract (`estrutura.js:75`), which is
   correct sequencing for a *wrong* value, but an *absent* attribute is not "um atributo fora do
   contrato" either, and `contrato.json:134` does not mark `data-grade` `obrigatorio` the way
   `img`'s `alt` is (`contrato.json:140`). `estilos/layouts.css:66-70` keys every column template off
   `[data-grade]`, so the slide silently collapses to one column. Either mark it obligatory in the
   contract or have `estrutura.colunas` report the absence.
4. **Flags are only rejected if neither command knows them.** `lerArgumentos` is shared
   (`bin/aula-usp.mjs:19-30`), so `aula-usp validar especime --porta 99999` runs happily and
   `aula-usp servir especime --json` is ignored, while the comment at line 25 claims unknown flags are
   refused rather than silently ignored. Task 3's Important 2 is half-fixed.
5. **A missing system file is reported as a missing lecture** — already registered in the ledger as a
   deferred Minor, confirmed here: deleting `contrato/contrato.json` gives exit 2 with
   `não encontrei a aula em …/especime: ENOENT … contrato/contrato.json`. The exit code is right, the
   sentence is not. Relatedly, `servir`'s catch appends "rode npm install na pasta do sistema" to *every*
   environment failure, including a syntactically broken contract (`bin/aula-usp.mjs:48`).
6. **Parse-shape failures are classified as environment failures.** An empty `index.html` gives
   `falha de ambiente: Cannot destructure property 'firstElementChild' of 'documentElement' as it is
   null.` (exit 2), and an HTML fragment with no `<html>`/`<head>` validates as "a aula não tem nenhuma
   section" plus five missing metas. Both are author mistakes — a truncated generation is the likeliest
   way a model fails — and both deserve a sentence that says so. `build/validar.mjs:22-25` is the place.
7. **An impossible but well-formed date passes.** `DATA_ISO` (`estrutura.js:10`) is a shape check, so
   `2026-02-31` validates and `montar/metadados.js:15-21` prints "31 fev 2026" on the cover. Spec 5.2
   asks for metas "presentes e **válidas**"; a `Date` round-trip is one line.
8. **Two layout lists live in code rather than in the contract.** `COM_NOTAS` and `SEM_ID`
   (`estrutura.js:7-8`) restate spec 9.2 prose that the contract does not carry. Adding `notas: true` /
   `idAutomatico: true` to each entry of `contrato.layouts` would keep the branch's own rule — the
   validator executes the contract, it does not restate it — and would let milestone 5 generate a complete
   `60-validador.md`.
9. **The `unidade` check silently disappears when `unidades` is absent** (`estrutura.js:63`,
   `&& unidades`). In build mode the file is always read; in 4c's browser mode there is no file, so
   unless the runtime bundles the unit keys the same lecture validates differently in the two modes —
   against spec 3.1's "as mesmas regras".
10. **TeX split across elements is diagnosed as a missing body block.** `\[ x = <strong>1</strong> \]`
    leaves an unterminated delimiter, so `segmentosDeTex` yields plain text and the slide is reported as
    `layout "conteudo" sem div.colunas nem bloco de corpo` plus three "não é permitido". Every finding is
    an error, so nothing is lost, but the first sentence tells the author to add what they can see on the
    screen. 4b's `matematica.*` should get the chance to speak first here.
11. **`conferir()` runs the whole match twice per slide**, once for `estrutura.obrigatorio` and once for
    `estrutura.fora-do-layout` (`conteudo.js:66-75`), rebuilding `chavesPorEspecificidade` each time. The
    cost is invisible today (1 ms per validation of `muitos-blocos.html`, measured), but 4c runs this in
    the browser on every page load, and the two rules can only stay consistent by construction.
12. **Small stuff:** the test file re-imports mid-file (`tests/unit/validador.test.mjs:112-113`), which
    reads as if the imports were added as an afterthought; `quantidadePorGrade` (`contrato.json:50`) is
    read by nobody now that `filhos` has a consumer; a `<meta name="professor">` placed in the `<body>`
    satisfies a rule whose message says `<head>` (`estrutura.js:55` — harmless, because
    `montar/metadados.js:9` searches the whole document too); and the "mixing columns with loose blocks"
    message blames whichever side is in the minority (`<div> não é permitido no layout "conteudo"`),
    which invites a model to delete the columns rather than to stop mixing.

## Spec conformance, rule by rule (spec 9.2)

| rule | severity from contract | spec meaning | verdict |
|---|---|---|---|
| `estrutura.primeiro-slide` | erro | first `section` is `capa` | ✅ plus a clean "a aula não tem nenhuma section" for an empty body |
| `estrutura.ultimo-slide` | erro | last `section` is `encerramento` | ✅ correctly silent when there is no section at all |
| `estrutura.layout` | erro | `data-layout` exists in the contract | ✅ absent attribute and unknown value both covered |
| `estrutura.metadados` | erro | required metas present and valid (5.2) | ✅ presence, ISO shape, unit key. Lengths correctly left to `limites.metadado`; Minors 7, 9, 12 |
| `estrutura.obrigatorio` | erro | required element of the layout absent (5.3) | ✅ for all seven layouts and for `contrato.filhos`; never fires for a displaced element |
| `estrutura.fora-do-layout` | erro | element outside the layout's content, **or out of order** | ✅ both halves, plus excess. Important 1 is the one hole |
| `estrutura.colunas` | erro | child count ≠ `data-grade` parts | ✅ for contracted grades; Minor 3 for the absent attribute |
| `estrutura.blocos` | aviso | fewer than 2 aberturas, or 9 or more | ✅ both bounds, read from `contrato.limites` |
| `estrutura.id-duplicado` | erro | ids unique | ✅ over the whole body, not just sections; Minor 2 |
| `estrutura.id-ausente` | aviso | slide without `id`, except capa and encerramento | ✅ behaviour; Minor 1 for the sentence |
| `estrutura.nome-curto` | erro | abertura `h2` over 10 chars without `data-curto` | ✅ measured on the title text with `<br>` joined; Important 4 |
| `estrutura.passos-mistos` | erro | slide mixing numbered and unnumbered steps | ✅ including `\passo{n}` in source TeX and excluding `pre`/`code`. `data-passo` on the `section` itself is invisible to the rule, as it is to `motor/passos.js` |
| `estrutura.notas-ausentes` | aviso | `conteudo`/`afirmacao`/`figura`/`demo` without notes | ✅ behaviour; Minor 8 for the hardcoded list; Important 1 for the interaction |

**Spec 9.1** — message layout reproduced exactly (`ERRO · slide 7 #culpa · regra · problema ação`), "aula"
in place of `slide N` for lecture-wide findings, the excerpt on an indented second line, `--json` with the
seven keys in the spec's order, panel header "Validador Aula USP: N erros, M avisos" with correct
singular/plural. ✅

**Spec 9.3** — the static group runs over the source: `build/validar.mjs` parses the file and never calls
`montar`; `validar()` touches the document only through `doc.body.normalize()` (`validar.js:28`), which is
required and documented. Group and phase gating are contract-driven (`validar.js:34`). ✅

**Spec 8.1** — 0 with warnings only, 1 with errors, both verified through the real CLI; 2 for a missing
lecture, a folder without `index.html`, a broken contract, an unknown flag, a second positional. ❌ for a
missing dependency (Critical 1).

## What milestones 4b, 4c and 5 inherit

**Shapes that will carry the weight**

- The rule object `{ nome, *aplicar(contexto) }` yielding `{ slide, id, mensagem, trecho }` is the right
  size: a rule states what it found, the core decides severity, remediation, ordering and formatting. 4b's
  47-rule static group needs nothing more from it.
- Group/phase gating from the contract (`validar.js:34`) means 4b and 4c add modules, not plumbing, and
  phase-2 rules can sit in the contract unimplemented without noise.
- The two-pass matcher and `contrato.filhos` specificity are sound and reusable. `limites.*` will not use
  them (counts, not sequences), but `vocabulario.*` will want `casaSeletor` for "which contract entry does
  this element answer to".

**Things that will have to change, and are cheaper to change now**

1. **The rule registry lives in a Node-only module.** `REGRAS_ESTATICAS` is assembled in
   `build/validar.mjs:14`, a file that imports `node:fs`, `node:path` and `linkedom`. 4c cannot import it
   in the browser and will have to keep a second list — two sources of truth for *which rules run* and
   *in what order*, when order is what `validar.js:49` sorts findings by. Move the registry to
   `validador/regras/index.js` (pure) and have `build/validar.mjs` re-export it.
2. **The rule context is closed.** `const contexto = { doc, slides, contrato, unidades }`
   (`validar.js:30`) is built inside `validar`, so every new input means editing the core:
   `cobertura.json` for `matematica.simbolo-fora-do-tex` (a **4b** static rule), KaTeX for
   `matematica.tex-invalido`, image results and the demo registry for `recursos.*`, geometry for
   `composicao.*`. Accept an `extra`/`contexto` object and spread it; `unidades` is already the first
   symptom of the pattern.
3. **`validar` takes a Document, but spec 3.2 keeps a copy of the *body*.** It needs `doc.body` for the
   slides and `doc.querySelector` for the metas (`estrutura.js:55`). In the browser the body copy is taken
   before assembly while the head is never touched, so 4c must either clone the whole document or pass a
   `{ body, querySelector }` shim. Decide deliberately; a `validar({ corpo, cabeca })` signature would say
   what the rules actually need.
4. **The finding shape is locked by a test.** `tests/unit/validar-cli.test.mjs:74` asserts the exact key
   list. If 4c's panel wants an element handle to scroll to, it must travel outside the finding.
5. **`onde()` needs the `contains` fallback** (Minor 2) before 4b writes rules that start from an element
   rather than from a slide.
6. **`sempreOpcional` must become section-scoped** (Important 1) — 4b's `vocabulario.*` will also have to
   answer the question this branch left open: does the vocabulary of spec 5.5 apply *inside*
   `aside.notas`? Today it is half-and-half: notes are skipped by the section sequence but their
   descendants are still judged by `contrato.filhos` (a `<figure>` inside notes is reported as missing its
   image; a `<blockquote>` inside notes is not reported at all). `limites` explicitly excludes notes from
   word counts (spec 5.3), which argues for excluding them from vocabulary too — but that is a ruling to
   make, not to inherit by accident.
7. **The contract-to-code guard filters on `estrutura.`** (`tests/unit/validador.test.mjs:278-282`). 4b
   should widen it to `grupo === 'estatica' && fase === 1`, which will then demand all 47 rules at once —
   so 4b needs a deliberate allowlist of what that milestone owns, or the guard turns red mid-milestone.
8. **The fixture convention** (Important 5) should be settled before ~28 more pairs are written.
9. **`itensDoConteudo` is top-level only, and drops the TeX body.** It returns `{ tipo, no, trecho }`; the
   raw `.tex` from `segmentosDeTex` is discarded. 4b's `limites.palavras-corpo` needs a deep walk that
   skips TeX, `pre`, `code` and notes, and `matematica.comando-proibido` needs the TeX string — both will
   call `segmentosDeTex` directly. That is fine; just do not expect `itensDoConteudo` to serve them.
10. **Parser differences beyond `tbody`.** `TRANSPARENTES` is the seam where browser-vs-linkedom
    divergence accumulates. 4c will meet foster-parenting (`<table><p>` is moved *out* of the table by a
    real parser but not by linkedom) and implied end tags; the same source can therefore produce different
    `estrutura.fora-do-layout` findings in the two modes. Worth a deliberate test in 4c comparing the two
    parsers over one deliberately malformed deck.
11. **For milestone 5's generated guide:** `contrato.regras` already carries severity, group, phase and
    remediation for all 64 rules, so `60-validador.md` can be generated today. What it cannot state is
    anything this branch kept in code: which layouts require notes, which get automatic ids, and that
    `data-curto` is obligatory above 10 characters (Minor 8).

**Facts worth carrying forward**

- The CLI is `aula-usp validar <pasta|arquivo> [--json]`; a folder resolves to `index.html`.
- `especime/muitos-blocos.html` keeps exactly two warnings on purpose (`estrutura.blocos`,
  `estrutura.id-ausente`); the other five decks are clean, and `aula-usp validar especime/` prints
  `Validador Aula USP: 0 erros, 0 avisos`. Anything that changes those counts changes a test.
- Contract rule inventory: 64 total — 47 static phase 1 (13 of them `estrutura.*`, all shipped here),
  5 composition, 4 load phase 1, 3 load phase 2, 1 static phase 2, 4 output.
- Suite sizes at ce7a824: 210 unit, 75 integration across 11 files.

## Verdict

**Ready to merge? With fixes.**

The engineering is good and the design is the right one for what follows: the contract really is the data,
the matcher answers the two questions separately, and the thirteen rules do what spec 9.2 says they do —
I checked each one against the spec's sentence, not the plan's paraphrase, and probed the edges. The one
Critical is not in the validator at all: it is a three-line import in the CLI that lets a missing
dependency exit 1 with a stack trace, which the plan's own Global Constraints and spec 8.1 both forbid,
and which the branch's last commit already declared fixed for the neighbouring module. Fix that, move
`linkedom` into `dependencies`, swap `process.exit` for `process.exitCode` so `--json` survives a pipe,
and scope `aside.notas` to the section so a misplaced note stops being projected to the class — four
small, independently verifiable changes, all reproduced and all with a fix proven in a scratch copy.
Important 4 and 5 can land with 4b if the ruling is recorded, but 5 (the fixture convention) is worth
deciding before 4b writes twenty-eight more pairs.

## O que foi feito depois desta revisão

A revisão acima foi feita por um revisor opus sobre `61c67ba..ce7a824`, com sondas próprias sobre os módulos reais e as onze suítes de integração rodadas uma a uma. Seguiu-se uma única rodada de correção, com o item Critical, os cinco Important e dois dos Minor, e uma re-revisão escopada dessa rodada, com prova comportamental de cada item que admitia uma.

**Corrigido (commit `addaf18`, sobre `ce7a824`):**

- **Critical:** a CLI carregava `build/validar.mjs` por import estático, e esse módulo importa o `linkedom` no topo; sem a dependência instalada, a falha acontecia na avaliação do módulo, antes de qualquer `try`, e virava stack trace com saída 1 em vez da saída 2 da spec 8.1. Agora o módulo entra por import dinâmico dentro do `try` do comando, como já acontecia com o servidor, e o teste-guarda de código-fonte cobre os dois. Medido na re-revisão: numa cópia sem `node_modules/linkedom`, `validar` sai com 2 e uma linha de causa; reintroduzir o import estático faz o guarda reprovar.
- **Important:** `aside.notas` era aceito em qualquer profundidade, e o `montar` renderizava uma nota escrita dentro de uma coluna **no slide**, à vista da plateia, enquanto a janela do apresentador não a mostrava. Agora a nota só é opcional como filha direta da `section`; em qualquer outro lugar cai em `estrutura.fora-do-layout`.
- **Important:** `--json` era cortado em 64 KiB quando a saída ia para um cano, porque `process.exit()` descarta escritas pendentes — e cano é justamente como um agente consome a bandeira. Agora o comando atribui `process.exitCode`. Medido: uma aula de 300 aberturas produz 165.982 bytes de JSON válido; com `process.exit()`, o corte acontecia exatamente em 65.536 bytes.
- **Important:** `linkedom` e `playwright-core` passaram de `devDependencies` para `dependencies`, onde a spec 8.2 sempre os colocou. Estavam do lado errado desde o marco 1, e só este marco tornou isso visível, porque só agora `bin/` precisa do `linkedom` em tempo de execução.
- **Important:** `data-curto=""` ou só com espaço escapava de `estrutura.nome-curto`, e o `montar` caía de volta no título inteiro — exatamente o que a regra existe para impedir. É a mesma lição do `data-passo=" "` da tarefa 1: `hasAttribute` não é "tem valor".
- **Important:** a varredura de fixtures afirmava menos do que parecia. `ruim.every((achado) => achado.regra === nome)` era tautológico, porque o teste rodava só a regra da pasta, e todo `bom.html` violava outras regras sem que ninguém visse. Agora todas as regras rodam sobre cada fixture e o teste filtra pela regra da pasta. Medido: trocar `bom.html` por `ruim.html` numa pasta faz a varredura reprovar, nomeando a regra certa.
- **Minor:** a mensagem de `estrutura.id-ausente` ficava sem sentido quando a `section` não tinha layout; e um arquivo de sistema ausente era relatado como aula ausente.

**Testes ao final:** 214 unitários e 75 de integração (apresentador 9, carregador 2, código 8, componentes 9, demos 4, impressão 6, layouts 11, matemática 6, motor 11, painéis 7, validador 2), rodados um arquivo por vez.

**Durante a execução, antes desta revisão:**

- **Tarefa 1:** a receita de fixture do plano tinha sido corrompida por uma edição do controlador, que apagou os `<body>` do molde. O implementador diagnosticou, confirmou o comportamento do `linkedom` com um teste direto, reconstruiu pelo molde da Step 1 e sinalizou que estava reconstruindo texto corrompido em vez de transcrever. A revisão da tarefa achou dois defeitos reais herdados do plano: `\passo` mostrado como exemplo dentro de `pre` contava como passo numerado (corrigido reusando o `textosComTex` que o renderizador de matemática já exporta, em vez de uma segunda lista de exclusão), e `data-passo=" "` contava como numerado.
- **Tarefa 2:** a revisão devolveu ❌ na conformidade com a spec, com um Critical de desenho: o casador de sequência do plano percorria a sequência uma vez só, gulosamente, e confundia elemento deslocado com elemento ausente — um `conteudo` escrito como `p.lide`, `h2`, `p` acusava "sem h2" e "sem bloco de corpo" com os dois presentes. O casador foi refeito em duas passadas, cardinalidade por conjunto e depois ordem por monotonicidade, o que também fez o `max` dos opcionais valer. Duas tentativas de delegar essa correção morreram por estouro do limite de saída do agente, sem escrever nada; o controlador aplicou a correção e a re-revisão foi feita por agente novo.
- **Tarefa 3:** a revisão achou um Critical herdado do marco 3c — `build/servir.mjs` lê e parseia o contrato no escopo do módulo, e a CLI importava esse módulo incondicionalmente, então um contrato quebrado escapava do `try/catch` do comando. Corrigido com import sob demanda.

**Continuam para os próximos marcos, de propósito:** os dez itens Minor que esta rodada não tocou, e o alerta de desenho da seção "What milestones 4b, 4c and 5 inherit": o registro de regras vive em `build/validar.mjs`, que é módulo de Node, e o contexto de `validar()` é fechado. O marco 4c precisa importar o registro no navegador e o 4b precisa passar `cobertura.json` às regras, então mover o registro para um `validador/regras/index.js` puro e abrir o contexto é o primeiro item do plano do 4b.
