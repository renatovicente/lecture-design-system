# M3b final review: a6c8d18..44295e8 (branch m3b-matematica)

I reviewed the whole-branch package in one pass. Then I checked it against:
- the plan;
- spec sections 3.2, 3.5, 4.2, 4.3, 5.5, 6.4, 6.9, 7.1, 8.2, 11.1 and 11.2;
- the ledger and the three task reviews;
- the surrounding code: `motor/motor.js`, `passos.js`, `impressao.js`, `copias.js`, `paineis.js`, `apresentador.js`, `montar/montar.js`, `build/servir.mjs` and the CSS.

The worktree was not touched: `git status` is clean at 44295e8, and `.superpowers/` is git-ignored.

Evidence gathered:
- **Unit tests.** The touched files, run one at a time, all pass: tex 9, blocos 5, montar 20, corpo 8, servir 14.
- **Integration tests.** `matematica` 6/6 and `paineis` 7/7, one file per call. The test files declare 143 unit and 65 integration tests.
- **Probe scripts** (in the session scratchpad, against the installed KaTeX 0.18.7, linkedom 0.18.13 and Chrome):
  - Node probes of `componentes/tex.js` edge cases;
  - a scratch lecture served by `criarServidor`;
  - the specimen in stage mode.
- **A patched scratch copy of `componentes/tex.js`**, to check the fixes proposed below. The nine existing `tex` tests stay green on it.

### Strengths

- **Plan alignment.** The code matches the plan byte for byte, except the ruled `\fcolorbox` fix (eeb5e33). That fix is justified and makes its test stronger. All planned functionality is present.
  - The two spec deviations are roadmap staging, ruled explicitly in Ruling 2: errors go to the console until the panel exists, and KaTeX comes from the dev route until `aula-usp-tex.js` exists.
- **Architecture.**
  - KaTeX is passed in as a parameter, so `componentes/tex.js` stays DOM-only and reusable.
  - `montar/blocos.js` imports only the pure text helpers.
  - `textoDeTitulo` handles both raw and rendered titles. Two real call sites at different stages need this: `montar/montar.js:28` and `montar/blocos.js:26` run before rendering, `motor/paineis.js:25-27` runs after.
- **The ordering hazard is solved and tested end to end.** Math renders after `montar` and before `iniciarMotor` (`montar/navegador.js:51-60`), so `gruposDePassos` counts `\passo`. The Chrome test checks:
  - hidden and revealed state by number;
  - boxes that don't move;
  - `=` alignment across rows;
  - print copies per state.
- **Both security surfaces hold.**
  - The `bibliotecas` route uses an own-property whitelist and reuses `resolverSeguro`. URL normalisation plus the dot-segment check reject `..`, `%2e%2e` and `..%2f`, and the Host-header allowlist still applies.
  - For `template.innerHTML`: KaTeX 0.18.7 rejects invalid `\htmlData` attribute names (`node_modules/katex/src/domTree.ts:115,135`) and escapes values and text. Payloads with `"`, `<img src=x onerror=…>` and `</span><script>`, given as text nodes, produce no element and no `on*` attribute.
- **Colour stripping holds.** I rendered 26 colour and box constructs: `\color`, `\textcolor`, `\colorbox`, `\fcolorbox`, `\red`, `\blue`, `\boxed`, `\fbox`, the three cancels, `\sout`, `\phase`, `\angl`, `\rule`, `\sqrt`, stretchy arrows, `\underbrace`, `\widehat`, arrays with rules, and nested colours. None leaves a colour value in any `style`, `mathcolor`, `mathbackground`, `fill` or `stroke`.
- **Small details are right.**
  - `macros: { ...MACROS }` is copied per render, so a `\gdef` in one equation can't leak into the next (verified).
  - Rendering is idempotent, because `[data-tex]` is in `FORA`.
  - `\\[4pt]` inside `aligned` doesn't close display math.
  - The class-contract filter excludes the `.katex` wrappers but still checks `div.equacao` and `.tex-invalido`.
- **Conditional loading works (spec 3.2).** In Chrome, a TeX-free lecture (`especime/index.html`) makes zero KaTeX requests. Only the small `componentes/tex.js` is fetched.
- **Tests use the real KaTeX, linkedom and Chrome**, with no mocks, and they cover every math item in spec 11.1.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

**1. Under linkedom, TeX that contains a character reference is silently left raw.**

Where: `componentes/tex.js:94-106` (`textosComTex`) and `:138-147` (`renderizarTex`). This is a gap in the plan, not an implementer deviation.

- **What happens.** linkedom 0.18.13 splits text at every character reference.
  - `<p>Se \(x &lt; y\) então</p>` becomes three text nodes: `"Se \(x "`, `"<"`, `" y\) então"`.
  - `\[ \begin{aligned} a &amp;= b \\ c &amp;= d \end{aligned} \]` becomes five.
  - `renderizarTex` scans one node at a time and never finds the closing delimiter. The result is 0 `.katex`, 0 alerts and 0 errors.
  - Chrome's HTML parser merges adjacent character data, so the same source does render in the browser. In the scratch lecture, all three equations rendered.
- **Why it matters.**
  - The header of `tex.js` (line 2) and the plan's decision "O KaTeX entra por parâmetro" exist so this module runs unchanged in the M5 build. M4's build-side `matematica.tex-invalido` rule will run on linkedom too.
  - Both would ship raw TeX and report nothing for equations written the HTML-correct way: `&lt;`, `&gt;`, `&amp;` in `aligned`, `&nbsp;`. That breaks spec §1: the same source must look the same in both modes.
  - No specimen or fixture has an entity inside TeX. Neither the unit tests nor an M5 pixel comparison on `especime/` would see this. It is the same blind spot as M3a's implied-`tbody` defect.
- **Fix.** Call `raiz.normalize();` at the top of `renderizarTex`, and add a unit test with `&lt;` and `&amp;`.
  - linkedom implements `normalize()`: the split paragraph becomes one node.
  - In Chrome it changes nothing on a DOM built by the parser.
  - Verified in the scratch copy: the new test passes and the existing tests stay green.

**2. A `\passo` with a non-integer number renders without error and scrambles the reveal order.**

Where: `componentes/tex.js:15,81-92`, consumed by `motor/passos.js:8`. This is a gap in the plan.

- **What happens.**
  - KaTeX 0.18.7 no longer trims `\htmlData` values. `node_modules/katex/src/functions/html.ts:79` trims only the key. So `\passo{ 1 }{c}` produces `data-passo=" 1 "`.
  - `\passo{0}`, `\passo{01}`, `\passo{a}` and `\passo{}` also render without error.
  - `gruposDePassos` then rejects the slide's numbers and falls back to one step per element, in document order. `aligned` writes one column after the other, so that order is wrong.
  - Chrome probe on `\passo{ 1 }{c} &\passo{ 1 }{= d} \\ \passo{2}{e} &\passo{2}{= f}`: four key presses reveal `c`, then `e`, then `= d`, then `= f`. Two presses should reveal two whole rows. Nothing appears in the console.
  - With `data-pdf="passos"`, the slide would print five pages instead of three.
- **Why it matters.**
  - The failure is silent, and it hits `\passo`'s main use: derivations in `aligned`. Spec 6.4 says `\passo` "gera um passo de número n".
  - No planned rule can catch it later. M4's `vocabulario.atributo` checks `data-passo` in the source, where `\passo` is still plain text.
- **Fix.** In `htmlDoKatex`, after `renderToString`, throw when any `data-passo="…"` value doesn't match `^[1-9][0-9]*$`. The problem then becomes the usual in-place alert and console error, and in M5 a validator message.
  - Verified in the scratch copy: `' 1 '`, `'0'`, `'a'` and `''` become alerts, and `12` renders.

#### Minor (Nice to Have)

1. **`texParaTexto` keeps backslashes for control symbols** (`componentes/tex.js:52-60`).
   - Outputs: `\|x\|_2` → `\|x\|_2`, `\{1, 2\}` → `\1, 2\`, `50\%` → `50\%`, `a \\ b` → `a \ b`. `\#` and `\_` are also left as they are.
   - In Chrome, an abertura titled "Norma \(\|w\|^2\)" gives the header label "01 · Norma \|w\|^2" and the aria-label "Bloco 1: Norma \|w\|^2".
   - That breaks the function's own contract (`tex.js:51`, "sem barras nem chaves") and the Task 2 deliverable. Norms are common in ML lecture titles.
   - One-line fix: add `.replace(/\\/g, '')` right after the letter-command replacement. Verified: the existing assertions don't change, and `\|w\|^2` → `|w|^2`.
   - This fix does not cover nested `\frac` (the deferred minor) or `\sqrt{2}` → `sqrt2`.
2. **Math inherits the titles' negative letter-spacing** (`estilos/componentes.css:174-176`, with `estilos/layouts.css:33,312`).
   - Computed `letter-spacing` of `.katex` is -1.32px in a slide `h2` and -2.52px in an abertura `h2`. In body text it is `normal`.
   - Spec 4.3 gives math no weight or tracking ("—"). KaTeX's `font` shorthand resets weight but not letter-spacing.
   - Fix: `letter-spacing: normal` on `.area .katex`.
3. **The `#010203` sentinel gives false positives** (deferred minor, reproduced; `componentes/tex.js:14,90`).
   - `\(\#010203\)` and `\(\text{cor \#010203}\)` report "comando não permitido no TeX".
   - Cleaner approach: record refusals in the `trust` callback and throw after rendering, naming the command. KaTeX calls that callback for `\href`, `\url`, `\includegraphics` and `\htmlClass`/`\htmlId`/`\htmlStyle`.
   - This removes the sentinel and gives M4 a more useful message.
4. **If KaTeX fails to load, the whole lecture goes down** (`montar/navegador.js:52-56`).
   - Probe with `katex.mjs` aborted: `data-montado="erro"`, the error panel shows, there is no `.palco`, and the motor never starts.
   - That is acceptable in development, where it means a broken environment. In M5, though, the secondary script comes from a CDN.
   - Degrading to raw TeX, a running motor and a panel message would fit spec 3.2 step 1 better ("cru, mas legível").
5. **Math outside the slides isn't styled.** The math CSS rules are scoped to `.area`.
   - In the notes panel and the presenter's notes, KaTeX renders at 1.21× (its default), and display math is centred with 1em margins (probe).
   - Cosmetic only, and off stage.
6. **The module duplicates the contract's `tex` block** (`contrato/contrato.json:162-167` against `tex.js:4-7,15,88`).
   - Spec 5.6 makes the contract the data that the validator and the guide read. Each copy is pinned only by its own literal test.
   - A unit test asserting that the module's delimiters, macro and trust match `contrato.tex` would stop them drifting apart.
7. **Test gaps.**
   - (a) Nothing asserts that a TeX-free lecture doesn't fetch KaTeX (spec 3.2). It is true today, per the probe.
   - (b) Of the refused commands, only `\href` is tested. `\htmlClass`, `\htmlId` and `\htmlStyle` (spec 5.5) were checked only by hand in the Task 1 review. A table-driven test would be cheap.
   - (c) The error fixture never goes through `classesForaDoContrato` (deferred minor). It passes today, per the probe.
8. **KaTeX fonts load lazily in stage mode.**
   - At `#capa`, after `data-montado="sim"` and `document.fonts.ready`, no KaTeX font face is loaded. `KaTeX_Main`, `KaTeX_Math` and `KaTeX_Size1`/`KaTeX_Size2` load only once `#passo-a-passo` is shown.
   - The tests measure in `?folha`, so they are unaffected.
   - M4's composition rules run "depois de `document.fonts.ready`". They must lay out every slide before measuring math, or they will measure fallback fonts.

### Triage of the ledger's deferred minors and rulings

| ledger item | verdict | reason |
|---|---|---|
| T1 minor: `\frac` with nested braces (`tex.js:54`) | can wait | Plain-text quality only, and M4 will count title length by rendered text. The fix needs brace matching, not a one-liner. Fix the backslash leak (Minor 1) now instead. |
| T1 minor: `#010203` sentinel false positive | can wait | Reproduced, but implausible in a lecture. Replace it with trust-callback recording when M4 needs the command name (Minor 3). |
| T1 ruling: also strip the `border` shorthand (`\fcolorbox`) | agree, closed | The 26-construct colour check finds no colour anywhere. |
| T2 minor: report says "3 new tests" | no action | Report wording only. |
| T2 ruling: no fix round for report integrity | agree, closed | The test files declare 143/65 tests. I re-ran the touched unit files and two integration files myself. |
| T3 minor: fixture not checked with `classesForaDoContrato` | can wait (cheap) | All its classes are in the contract today (probe). Add the one-line assertion if the fix wave touches `matematica.test.mjs`. |
| T3 minor: `TEX` gate sees text inside `pre` | can wait | It also sees inline `<script>` demo registrations. The cost is one unneeded download. Revisit with M3c's `pre[data-lang]` gate, using the same tree walk as `renderizarTex`. |
| Ruling 1: three tests already green at RED | agree, no action | Each one guards a real decision. |
| Ruling 2: console instead of panel; dev route instead of `aula-usp-tex.js` | agree for M3b | M4 must route `renderizarTex` errors to the panel. M5 must replace the route and `import()` with the SRI-checked script, and decide how a load failure degrades (Minor 4). |
| Resolved ⚠️ items: contract classes, lazy load, overview card, panel | agree | Lazy load confirmed in Chrome. The overview card is covered at `tests/integracao/matematica.test.mjs:90-102`. |

None of the ledger items must be fixed before merge. This review's Important 1 and 2 should go into a fix wave before merge. Minor 1 and 2 are one-liners worth adding to the same wave.

### Recommendations

**Fix wave.** One commit each. Items 1 to 3 are verified in the scratch copy; item 4 is a single CSS line.
1. `raiz.normalize()` in `renderizarTex`, plus a unit test with `&lt;` and `&amp;` (Important 1).
2. Integer check on the rendered `data-passo` values in `htmlDoKatex`, plus a unit test (Important 2).
3. `.replace(/\\/g, '')` in `texParaTexto`, plus an assertion with `\|w\|^2` (Minor 1).
4. `letter-spacing: normal` on `.area .katex` (Minor 2), optionally with a Chrome assertion in the title test.

**What M4 inherits** (beyond the plan's list):
- The validator panel for `renderizarTex` errors (Ruling 2).
- `matematica.comando-proibido` must also cover KaTeX's colour macros (`\red`, `\blue`, `\redA`…). `proibidos.comandosTex` doesn't list them. This is an M1 carryover; the rendered output is already safe.
- `estrutura.passos-mistos` must read `\passo{n}` from the TeX text in the source, with the same integer rule as the renderer.
- An unclosed `\(` or `\[` in a text node stays raw with no error. That includes TeX broken by the HTML parser: in `\(x<y\)`, the text from `<y` onward is parsed as a bogus tag. It also includes TeX with an inline element inside.
- `span.tex-invalido` renders at 21.1 px inside a 24 px paragraph, and `div.tex-invalido` at 20 px. Either add `.tex-invalido` to `papeis.codigo.seletores`, or `composicao.tamanho-minimo` will add a second error to every invalid equation.
- Composition measurements must lay out every slide first (Minor 8).
- Any linkedom-side scan that works one text node at a time needs the same `normalize()`.

**What M5 inherits:**
- The SRI-checked `aula-usp-tex.js` in place of the dev route and `import()`, with a graceful failure mode (Minor 4).
- Call `renderizarTex` on `body`, not `document`: `title` is not in `FORA`.
- PDF title metadata should go through `textoSemTex`.
- `saida.glifo-ausente` must skip KaTeX output.
- Embed only the KaTeX font families a lecture uses (already in the plan).
- If the dev route survives M5, find the package with `createRequire(import.meta.url).resolve('katex/package.json')`. The fixed path `node_modules/katex/dist` works under `npm link` and a global install, but not in a local install where npm hoists `katex`.

**For the guide (M6):**
- In TeX, write `<` as `&lt;` or with spaces around it.
- Macros don't persist from one equation to the next.
- Each `\passo` goes inside one cell of `aligned`.
- Write a decimal comma as `{,}`.

**For the author to decide:** the MathML that KaTeX emits for screen readers contains the content of unrevealed `\passo` steps, because `data-passo` only exists in the visible HTML. Screen readers therefore read hidden steps aloud. This follows from the plan's decision to keep MathML output. It is acceptable for lectures, but worth knowing.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The browser deliverable is correct, secure and tested end to end in Chrome, with no Critical issue and no unjustified deviation from the plan. Two cheap plan-level gaps silently produce wrong output: TeX with character references under linkedom, which M4 and M5 inherit, and unchecked `\passo` numbers under KaTeX 0.18.7. Both fixes are verified to keep the existing tests green and should land before merge.

---

## O que foi feito depois desta revisão

A revisão acima foi feita por um revisor opus sobre `a6c8d18..44295e8`, com sondagens no KaTeX 0.18.7, no `linkedom` e no Chrome. Seguiu-se uma única rodada de correção, com os dois itens Important, os dois Minor de uma linha que a própria revisão recomendou e a asserção da fixture (Minor 7c), e uma re-revisão escopada dessa rodada. Antes de despachar a rodada, cada edição foi conferida numa cópia de rascunho: cada asserção nova falha antes da correção e passa depois.

**Corrigido (commits sobre `44295e8`):**

- `3564281` — **Important 1:** `renderizarTex` chama `raiz.normalize()` antes de procurar TeX. O `linkedom` divide o texto em cada referência de caractere (`&lt;`, `&amp;`), e um trecho como `\(x &lt; y\)` ficava cru, sem alerta e sem erro. Novo teste unitário com `&lt;` no texto e `&amp;` dentro de `aligned`.
- `ac01e46` — **Important 2:** número de `\passo` fora da regra do motor (`^[1-9][0-9]*$`) vira alerta, com a mensagem `número de passo inválido em \passo: "…"`. O KaTeX 0.18.7 não apara o valor de `\htmlData`, então `\passo{ 1 }` também é inválido. Novo teste com ` 1 `, `0`, `a`, vazio e `12`.
- `23cea02` — **Minor 1:** `texParaTexto` tira as barras que sobravam de `\|`, `\{` e `\%`, com três asserções novas.
- `46eabb4` — **Minor 2:** `letter-spacing: normal` em `.area .katex`, com asserção no Chrome sobre a matemática no título da abertura.
- `45768fe` — **Minor 7(c):** a fixture de erros passa pela checagem de classes do contrato.

**Testes ao final:** 145 unitários e 65 de integração (apresentador 9, carregador 2, componentes 9, demos 4, impressao 6, layouts 11, matematica 6, motor 11, paineis 7), rodados um arquivo por vez.

**Re-revisão escopada:** os cinco itens resolvidos, sem quebra nova. O revisor conferiu que a regra de número é idêntica à de `motor/passos.js`, que `normalize()` roda uma vez, depois de `montar` e antes do motor, que texto do autor não forja um `data-passo` (o KaTeX escapa as aspas) e que o `slug` já descartava as barras, então ids não mudam.

**Durante a execução, antes desta revisão:**

- Task 1: a revisão da tarefa achou que o MathML do `\fcolorbox` guarda a cor no atalho `border`, que o filtro de cores e o teste deixavam passar. Corrigido em `eeb5e33`: o filtro tira também `border`, e o teste confere os valores de cor e que a borda sem cor do `\fbox` fica.
- Task 2: o relatório do implementador listou arquivos de integração que não existem. A integração foi rodada de novo, arquivo por arquivo (59/59), e a discrepância ficou registrada.

**Continuam para os próximos marcos, de propósito:**

- Minor 3: o sentinela `#010203` escrito no TeX vira "comando não permitido"; registrar as recusas no callback do `trust` quando o marco 4 precisar do nome do comando.
- Minor 4: se o `katex.mjs` não carrega, a aula inteira não monta; o marco 5, com o script vindo da CDN, deve degradar para TeX cru com o motor funcionando.
- Minor 5: matemática fora de `.area` (painel de notas, notas do apresentador) sai no tamanho padrão do KaTeX e centralizada.
- Minor 6: as constantes de `componentes/tex.js` repetem o bloco `tex` do contrato, sem teste que as amarre.
- Minor 7(a) e 7(b): não há teste de que uma aula sem TeX não baixa o KaTeX, nem de `\htmlClass`, `\htmlId` e `\htmlStyle` recusados.
- Minor 8: as fontes do KaTeX só carregam quando um slide com matemática aparece; as medidas de composição do marco 4 precisam dispor todos os slides antes.
- Das revisões das tarefas: `\frac` com chaves aninhadas no texto simples; o teste de carga também vê TeX dentro de `pre`; número de `\passo` acima de `Number.MAX_SAFE_INTEGER` perde precisão (regra antiga do motor, irrealista).
- Para o marco 4: painel do validador para os erros de `renderizarTex`; regra de cor que cubra as macros de cor do KaTeX (`\red`, `\blue`…); `estrutura.passos-mistos` lendo `\passo{n}` do TeX com a mesma regra de número; aviso para `\(` ou `\[` sem fechamento; `.tex-invalido` no papel de código do contrato (20 a 21 px); `normalize()` em qualquer varredura de texto sobre o `linkedom`.
- Para o marco 5: `aula-usp-tex.js` com SRI no lugar da rota de desenvolvimento, com falha graciosa; `renderizarTex` sobre `body`, não `document`; título do PDF por `textoSemTex`; `saida.glifo-ausente` ignorando a saída do KaTeX; só as famílias de fonte usadas; localizar o KaTeX com `createRequire` se a rota sobreviver.
- Para o guia (marco 6): `<` como `&lt;` no TeX; macros não passam de uma equação para outra; cada `\passo` numa célula do `aligned`; vírgula decimal como `{,}`.
- Para o autor decidir: o MathML que o KaTeX gera para leitores de tela contém os passos ainda não revelados.
