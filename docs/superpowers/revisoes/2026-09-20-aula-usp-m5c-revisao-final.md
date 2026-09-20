# Revisão final do marco 5c — branch `m5c-pdf`, `a7e603d..a010dc1`

**Veredicto: aprovado com correções.** 0 Critical · 8 Important · 10 Minor.

Objeto: os seis commits do branch (`15bdf92`, `b5b3a01`, `9be6fce`, `27822d0`, `515ea6d`, `a010dc1`),
o diff completo em `revisao-final.diff`, o plano `docs/superpowers/plans/2026-09-19-aula-usp-m5c-pdf-pipeline.md`
e a spec `docs/superpowers/specs/2026-09-14-aula-usp-design.md` (autoridade vinculante).

Tudo o que está marcado como **medido** abaixo foi executado. As mutações rodaram num worktree
descartável (`git worktree add --detach … a010dc1`, `node_modules` por symlink), removido ao fim;
o worktree em revisão nunca foi tocado e continua limpo em `a010dc1`.

---

## Verificações que passaram

| verificação | resultado |
|---|---|
| `npm test` | **423/423**, 24,9 s |
| `node --test tests/integracao/pdf.test.mjs` | 5/5, 3,2 s |
| `node --test tests/integracao/visual.test.mjs` | 20/20, 6,1 s (inversão: 24 175 px diferentes, como deve) |
| `node --test tests/unit/build.test.mjs` | 7/7, 5,3 s |
| fronteira (`grep -rE "from '(node:\|fs\|path\|url\|os\|child_process)" montar motor componentes validador`) | **nenhum import** — limpa |
| trailer dos 6 commits | exatamente um `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, sempre como última linha |
| "60 de 60 regras da fase 1" | **verdadeiro hoje** — medido cruzando `contrato/contrato.json` com os quatro registros: estática 47/47, carga 4/4, composição 5/5, saída 4/4 |
| worktree | limpo, sem arquivo não rastreado |

---

## O que está bem feito

**A cadeia de erros do pipeline é de verdade, e é testada por mutação.** Esta era a preocupação
central do despacho, e a tarefa 3 a resolveu. Mutei `build/build.mjs` em quatro pontos e a suíte
pegou os quatro:

| mutação em `build/build.mjs` | testes que caem |
|---|---|
| `achados = [...achadosDoConstruir]` (descarta a etapa 1) | 4 de 7 |
| etapa 5 não concatena `achadosDeComposicao` | 1 (final 2) |
| etapa 7 não concatena `achadosDeSaidaPdf` | 1 (o teste do `gerarPdf` com 999) |
| etapa 7 não regrava `validacao.json` | 1 (o mesmo) |
| `paginasEsperadas(docDaFonte)` em vez de `docFinal` | 2 |

O comentário que registra a regressão real encontrada ao rodar os seis decks (`achados =
achadosDoConstruir`, que engolia os avisos da etapa 1 sempre que não havia erro) é o tipo de nota
que impede a regressão de voltar. As listas **exatas e ordenadas** de `a.regra` nos quatro finais,
em vez de `.some()`/`Set`, são a razão de a troca `SO_PDF_PAGINAS → REGRAS_DE_SAIDA` ter sido
pega — e foi pega por inversão, não por fé.

**O `gerarPdf` injetável é a peça mais valiosa do branch.** `build({ …, gerarPdf })` com um falso
que devolve `paginas: 999` é a única prova *positiva* de que `saida.pdf-paginas` está ligada — e
segue exatamente a costura que o projeto já usa (`iniciar({ resolver, estilo })`,
`construirHtml({ embutirFontes })`), sem `if (modo)` em lugar nenhum.

**A divisão das quatro regras de saída está certa, e mais certa do que o plano dizia.** O plano
(linha corrigida em `15bdf92`) fala de "etapa 7 roda **só** `saida.pdf-paginas`"; a spec 9.3 diz que
o grupo de saída roda nas "etapas 4 a 7" — ou seja, a implementação (três regras no `construir()`,
a quarta na etapa 7) é a leitura literal da spec, não um desvio dela. O comentário de
`SO_PDF_PAGINAS` explica a razão no lugar onde alguém reunificaria de boa-fé.

**`saida.pdf-paginas` é contrato como dado, sem número mágico.** A regra é uma comparação entre dois
valores do contexto; o oráculo continua sendo `paginasEsperadas` (`motor/impressao.js`, marco 2), e
`validador/regras/saida.js` segue sem nenhum import de Node. A degradação silenciosa sem
`paginasDoPdf` segue a mesma disciplina de `saida.glifo-ausente`.

**A comparação visual compara.** O teste de inversão (injeção de `--cor-tinta` só no lado build)
produziu 24 175 pixels diferentes e um PNG de diff — a comparação não é uma que nunca falhou.

**A separação de flags por comando** (`FLAGS_SERVIR`/`FLAGS_VALIDAR`/`FLAGS_BUILD`) corrige um
buraco antigo — `--sem-pdf` aceito e ignorado por `validar` — e tem um teste por vizinho.

---

## Achados

### Critical

Nenhum.

---

### Important

#### I1. `tests/integracao/pdf.test.mjs:55` — a asserção de `/Lang` continua vazia; a correção da rodada 1 não fechou o buraco que ela diz ter fechado

`build/pdf.mjs:39` (`if (metadados.idioma) pdf.setLanguage(metadados.idioma);`)

O comentário do teste afirma: *"o nome do teste promete quatro e só conferia três — apagar o
setLanguage do build/pdf.mjs deixava a suíte inteira verde"*, e a correção foi
`assert.equal(pdf.catalog.get(PDFName.of('Lang'))?.decodeText(), 'pt-BR')`.

**Medido: apagando `pdf.setLanguage(...)` de `build/pdf.mjs`, os 5 testes de `pdf.test.mjs` continuam
passando.** O buraco não foi fechado.

Causa, medida por sonda direta sobre o PDF **bruto do Chrome**, antes de o `pdf-lib` tocar nele:

```
tagged=true   /Lang do Chrome (sem setLanguage) = "pt-BR"
tagged=false  /Lang do Chrome (sem setLanguage) = null
```

O Chrome escreve `/Lang` no catálogo a partir do `<html lang="pt-BR">` quando `tagged: true` está
ligado (um PDF marcado exige idioma). Como o teste passa `idioma: 'pt-BR'` — o **mesmo** valor do
`lang` do espécime — a asserção não distingue "o `pdf-lib` gravou" de "o Chrome gravou". É
literalmente o padrão que este projeto persegue: *um token compartilhado usado como impressão
digital de um artefato específico*.

Agravante de acoplamento: hoje, apagar `tagged: true` faz o teste **de metadados** cair por `/Lang`,
culpando a coisa errada.

**Correção, verificada:** passe um idioma que não possa vir do documento.
Medido: `gerarPdf({ …, metadados: { …, idioma: 'en-GB' } })` sobre `especime/index.html`
(`lang="pt-BR"`) devolve `/Lang = "en-GB"` — a asserção passa a só poder passar se `setLanguage`
rodou. Os outros três metadados já são específicos (`<title>` do construído é
`"Espécime do Aula USP"`, diferente do `'Aula de teste'` que o teste grava).

#### I2. `build/pdf.mjs:13` — a chamada explícita de `prepararImpressao()` não tem teste, e o comentário que a justifica está factualmente errado

```js
// Spec 6.9: explicitamente, não pelo evento beforeprint — no build ninguém imprime.
await pagina.evaluate(() => window.AulaUSP.prepararImpressao());
```

**Medido: apagando essa linha, os 5 testes de `pdf.test.mjs` continuam passando, e o PDF continua
com o mesmo número de páginas** (`especime/index.html`: 15 páginas com e sem a chamada).

A razão é que a segunda metade do comentário é falsa: o `page.pdf()` do Chrome **dispara
`beforeprint`/`afterprint`**, e o motor embutido registra os dois
(`motor/impressao.js:82-83`). Quem gera as cópias, com a linha apagada, é o `beforeprint`; o
`afterprint` desfaz logo depois, então o DOM depois do `pdf()` fica idêntico e nada denuncia a
troca. Só não há dano hoje porque `preparar()` é idempotente (`if (salvo) return`).

Por que importa: a spec 6.9 exige a chamada explícita no build ("*no build, `prepararImpressao()` é
chamada explicitamente antes de gerar o PDF*"), o branch não tem nenhum teste que note a ausência
dela, e o comentário planta uma crença errada que alguém vai usar como base para uma decisão futura
(por exemplo, tornar `preparar()` não idempotente).

**Correção, verificada:** um teste que meça o DOM logo depois da chamada explícita, antes de
qualquer evento de impressão. Medido em `especime/index.html`: 13 `section.slide` antes; depois de
`window.AulaUSP.prepararImpressao()`, **15 slides, 2 com `[data-copia]`**, e 15 é exatamente
`paginasEsperadas`. E corrija o comentário: "explicitamente, **e não só** pelo `beforeprint` — o
`page.pdf()` do Chrome também o dispara; `preparar()` é idempotente, então as duas vias convergem".

#### I3. `build/build.mjs:103` — quando o build morre depois da etapa 2-4, o `validacao.json` que fica no disco é o parcial do `construir()`, e pode dizer "nada de errado"

`construir()` grava um `validacao.json` preliminar só com os achados **dele** (marco 5b); `build()`
regrava com a lista completa em cada um dos quatro finais. Entre um e outro há uma janela: se
qualquer coisa estourar nas etapas 5, 6 ou 7, o processo sai 2 e o arquivo que o autor vai ler fica
sendo o parcial.

**Medido**, forçando um erro na etapa 6 (ver I4, caso `#`), sobre a fixture `aula-limpa`:

```
dist/validacao.json  ->  []
```

— quando o mesmo deck, construído com sucesso, acusa `estrutura.blocos` e
`estrutura.notas-ausentes`. O arquivo diz "0 erros, 0 avisos" para uma aula que tem dois avisos e um
build que falhou. É a mesma família do bug do marco 5b (`construir()` descartando
`errosDeTex`) e do `achados = achadosDoConstruir` desta tarefa, agora no caminho de exceção.

**Correção:** grave a lista acumulada assim que `construir()` retorna (`await gravarValidacao(destino,
achados)` logo depois da linha 103) — uma escrita a mais, e a janela fecha. Alternativa mais limpa
a prazo: dar a `construir()` um parâmetro para não gravar `validacao.json` quando quem chama é o
pipeline (injetar, não ramificar), já que `build()` sempre regrava.

#### I4. `build/pdf.mjs:9` — `file://${caminhoDoHtml}` sem escape: um `#` no nome da pasta quebra a etapa 6, e o erro sai como "rode npm install"

**Medido**, com uma aula em `/tmp/aula#3/`:

```
aula-usp build /tmp/aula#3
  - navigating to "file:///tmp/aula#3/dist/aula#3.html", waiting until "load"
rode npm install na pasta do sistema
```

Saída 2, com `dist/aula#3.html` já gravado e `validacao.json` vazio (I3). Espaço no nome funciona;
`#` (e `?`) não — o Chrome corta ali. `"Aula #3"` é um nome de pasta plausível.

Duas metades, as duas a corrigir:

1. **O escape.** `pathToFileURL(caminhoDoHtml).href` em `build/pdf.mjs` (e o mesmo padrão em
   `tests/integracao/visual.test.mjs:115 e :167`, onde só o `mkdtemp` salva).
2. **O diagnóstico.** O `catch` de `buildComando` (`bin/aula-usp.mjs:130`) traduz **qualquer**
   exceção do pipeline em `falha de ambiente: … rode npm install na pasta do sistema`. Uma falha na
   etapa 5, 6 ou 7 não é falta de dependência, e o conselho está errado. O caso mais provável na
   prática é o `pagina.waitForFunction(() => document.body?.dataset.montado === 'sim')` de
   `build/pdf.mjs:10`: se o HTML construído não montar, isso pendura 30 s e sai com um
   `TimeoutError` do Playwright embrulhado em "rode npm install". Compare com `medirComposicao`
   (`build/composicao.mjs:45-47`), que espera `montado !== undefined` e então **lê o estado** para
   dar uma mensagem de verdade — adote o mesmo padrão na etapa 6, e separe no `catch` da CLI o que é
   ambiente do que é falha do pipeline.

#### I5. `tests/unit/validador.test.mjs:381-413` — a guarda contrato→código é cega em `carga` e `composicao` (achado conhecido nº 1: **confirmado**, e a correção planejada é a certa)

Existem duas guardas: `estatica` (47) e `saida` (4). Não existe nenhuma para `carga` (4) nem para
`composicao` (5) — 9 das 60 regras de fase 1.

**Medido:** acrescentando `carga.regra-fantasma` e `composicao.regra-fantasma` (fase 1, sem nenhuma
implementação) a `contrato/contrato.json`, `node --test tests/unit/validador.test.mjs` passa
**90/90**. Rodando a suíte inteira, caem três testes — mas por outras razões: o
`tests/unit/contrato.test.mjs:98` (`assert.equal(Object.keys(ESPERADO).length, 64)`, a transcrição
manual da tabela da spec 9.2) e os dois testes de `dist/` byte a byte. Ou seja: quem escrever uma
regra nova na spec **e** no contrato e esquecer de implementá-la atualiza o `ESPERADO` como parte
natural da mudança, e nada mais reclama. Exatamente o cenário que as guardas existem para pegar.

Duas mitigações parciais, que reduzem a severidade mas não fecham o buraco: a varredura de fixtures
(`for (const nome of readdirSync(FIXTURES))`) pega a **remoção** de uma regra de carga/composição do
registro enquanto a pasta da fixture existir; e o `contrato.test.mjs` pega contrato↔spec. Nenhuma
das duas pega contrato→código nos dois grupos.

Isso pesa mais agora do que antes porque a manchete do marco é "60 de 60 regras da fase 1
implementadas", e era esta guarda que deveria protegê-la.

**A correção planejada é a certa.** Recomendo, além de estendê-la: **uma guarda só, em laço sobre os
quatro grupos**, com o registro de cada grupo num mapa, mais uma asserção do **total** —
`assert.equal(implementadas, 60)` — para que o teste meça a própria frase da manchete. Verifiquei a
contagem que essa asserção deve travar: 47 + 4 + 5 + 4 = 60.

#### I6. `tests/unit/build.test.mjs` mora em `tests/unit/` e abre Chrome: `npm test` deixou de rodar numa máquina sem Chrome

`package.json` → `"test": "node --test tests/unit/*.test.mjs"`. O `before()` de `build.test.mjs`
chama `chromium.launch` direto.

**Medido:** `CHROME_PATH=/nao/existe node --test tests/unit/build.test.mjs` → **0 passam, 7 falham**
(o `before` estoura e derruba o arquivo inteiro). A suíte "unitária" fica vermelha.

Isso contraria duas coisas da spec: a 8.1 ("*Falta de Chrome não é falha*") e a separação 11.1
(unitários, `node:test`) × 11.2 (integração, **Chrome headless**). O arquivo se descreve como
unitário no cabeçalho, mas é integração — e é integração boa: são os quatro finais da spec 3.3, as
mutações acima mostram que ele é a rede de segurança do marco.

**Correção:** mova `tests/unit/build.test.mjs` para `tests/integracao/build.test.mjs`
(`npm run test:integracao` já o pega, e o ritmo de Chrome dele não muda). O único teste que precisa
ficar entre os unitários é o que não abre navegador — e esse já está em `validar-cli.test.mjs`.
Se preferir manter onde está, então o `before` tem de degradar (`t.skip` com motivo) em vez de
derrubar o arquivo, para honrar a 8.1.

#### I7. `build/build.mjs:30` + `bin/aula-usp.mjs:120` — com um **arquivo** como alvo, o `<slug>` vem da pasta: dois decks na mesma pasta se sobrescrevem em silêncio

`slugDaAula = basename(dirname(caminhoDaAula))` e `destino = join(dirname(alvo), 'dist')`. Para um
alvo pasta (a forma da spec 3.3) está certo. Para um alvo **arquivo** — forma que `caminhoDaAula`
aceita, que `validar` documenta ("*um arquivo também pode ser validado direto*") e que o próprio
teste `build: pasta que não existe` usa — o slug passa a ser o nome da pasta-mãe.

**Medido:**

```
aula-usp build /tmp/colisao/aulas/primeira.html --sem-pdf   ->  aulas/dist/aulas.html
aula-usp build /tmp/colisao/aulas/segunda.html  --sem-pdf   ->  aulas/dist/aulas.html   (sobrescreve, sem aviso)
```

A pasta `especime/` deste repositório tem **seis** decks lado a lado: é exatamente a forma em que um
autor digitaria `aula-usp build especime/matematica.html` e receberia `especime/dist/especime.html`.

**Correção (escolha uma, as duas são defensáveis):** (a) `build` recusa alvo-arquivo com saída 2 e o
uso — a spec 8.1 escreve `aula-usp build <pasta>`, e recusar é mais honesto que adivinhar; ou (b)
quando o alvo é arquivo, o slug vem do `basename` do arquivo. Não deixe como está: sobrescrita
silenciosa é o único lugar do branch onde o build destrói trabalho anterior sem dizer nada.

#### I8. `tests/integracao/visual.test.mjs:25` — a comparação visual cobre 2 dos 6 decks, e a máscara das demos que a spec 11.2 pede não existe

A spec 11.2 é explícita: *"captura de **cada slide** nos dois modos, comparada com `pixelmatch`,
limiar 0,1 e no máximo 0,5 % de pixels diferentes por slide, **com a área das demos mascarada**"*.
O teste roda `['matematica.html', 'codigo.html']`, com limiar 0 e igualdade exata, sem máscara
nenhuma.

Três desvios, com pesos diferentes:

- **Limiar 0 em vez de 0,1 / 0,5 %:** desvio *mais estrito* que a spec, justificado pelo fato 8 e
  reconfirmado aqui (20/20 verdes). Não é problema — mas é um desvio da autoridade vinculante e
  merece virar uma linha na spec, não só um comentário no teste.
- **Cobertura:** 4 dos 6 decks do espécime ficam de fora, inclusive `componentes.html` — o deck que
  existe justamente para exercitar todos os componentes, e portanto o de maior valor para a promessa
  central do marco ("os dois modos renderizam igual"). Medido: `componentes.html`, `ifusp.html`,
  `index.html` e `muitos-blocos.html` não são comparados.
- **Máscara de demos:** não implementada — e o único deck com `data-demo` é `index.html`, que é
  justamente um dos que ficaram de fora. Ou seja, a exigência não foi resolvida nem enfrentada: foi
  contornada pela escolha dos decks, sem registro. A hora em que alguém acrescentar `index.html` à
  lista é a hora em que isso vira um teste intermitente sem explicação.

**Correção:** estenda para os seis decks e implemente a máscara (zerar os retângulos de
`div.demo` nos dois buffers antes do `pixelmatch`), ou registre explicitamente no plano/spec qual
recorte foi feito e por quê. Bônus barato: a spec 11.2 também pede "**fontes embutidas** e
metadados" no PDF — metadados e tamanho de página estão cobertos, fontes embutidas **no PDF** não
(o que existe é `tests/unit/fontes-embutidas.test.mjs`, sobre o HTML).

---

### Minor

**M1. `.gitignore` precisa de `dist/` mais `!/dist/`** (achado conhecido nº 2: **confirmado**, e a
correção é a certa). Hoje o `.gitignore` não tem nada de `dist`; `aula-usp build <pasta>` escreve
`<pasta>/dist/`, então qualquer build de aula deixa lixo não rastreado. O `/dist` da raiz é
rastreado (12 arquivos em `git ls-files dist`), e a negação `!/dist/` é o que o preserva — a ordem
importa e a forma está certa.

**M2. `tests/integracao/visual.test.mjs:86` — trocar `waitForTimeout(100)` por espera por condição**
(achado conhecido nº 3: **confirmado**, e a correção é a certa). Verifiquei a substituição:
`await pagina.evaluate(() => new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto))))`
→ **20/20 em 3 rodadas seguidas**. (Sem espera nenhuma também passou 3/3 nesta máquina, o que só
confirma que os 100 ms são folga arbitrária, não uma espera necessária.) O idioma que `f7d2e97`
adotou é "poll até a condição"; os dois rAF são a forma dele para paint.

**M3. `printBackground: true` (`build/pdf.mjs:30`) não tem teste.** Medido: apagando a linha, os 5
testes de `pdf.test.mjs` passam — e é a linha de que dependem o campo amarelo e o azul de sinal em
**todo** PDF gerado. Registro junto o que **não** resolve, para ninguém gastar a tarde nisso: tentei
a verificação óbvia (procurar o `rg` do amarelo no content stream da página) e ela é **ela própria
vazia** — medido, `.9882,.7059,.1294 rg` aparece com e sem `printBackground`, porque o mesmo token
também pinta traço e texto. Uma verificação honesta exigiria rasterizar a página. Sugestão: ou
aceite a lacuna com um comentário explícito que diga isso, ou acrescente um teste opcional
(rasterização via poppler, pulado quando não houver).

**M4. `slugDaAula` está duplicado** em `build/build.mjs:30` e `build/construir.mjs:16`, idêntico. O
`construir()` nomeia o `.html` e o `build()` nomeia o `.pdf` a partir de duas cópias do mesmo
cálculo — "duas verdades sobre o mesmo número", a classe que este projeto mais pagou caro.
`basename(caminhoDoHtml, '.html')` em `build/build.mjs` (o `caminhoDoHtml` já vem de `construir()`)
elimina a segunda verdade em uma linha.

**M5. `tests/integracao/pdf.test.mjs:40-41` — 960 e 540 fixos.** São `LARGURA_DO_PALCO * 0,75` e
`ALTURA_DO_PALCO * 0,75` (`motor/motor.js:6-7`), e `visual.test.mjs` já dá o exemplo certo
importando as duas constantes. Derive-os.

**M6. Duas pendências que o plano mandou "resolver ou registrar" não foram nem uma coisa nem
outra.** O bloco "Herdado do marco 5b" diz: (a) *"`construir()` não parametriza `fase` — a tarefa 3
decide se precisa"*; (b) *"`recursos.linguagem` passa a ser alcançável por dois caminhos quando a
etapa 1 rodar antes da 3, e a tarefa 3 deve confirmar se o segundo vira inalcançável ou fica como
defesa em profundidade"*. Nenhuma das duas aparece no código, nos comentários ou no
`task-3-report.md` (grep). A resposta de (b), pelo que dá para deduzir lendo: o caminho de
`achadosDeCodigo` só é alcançável quando a linguagem **está** em `contrato.linguagens` e mesmo assim
o Shiki falha — logo, defesa em profundidade, sem duplicata. Vale um comentário de duas linhas em
`build/construir.mjs`.

**M7. A interface real de `build()` não é a que o plano declara.** O plano promete
`{ achados, erros, codigo, arquivos }`; a função devolve `{ codigo, achados, avisoSemChrome?,
paginas? }`. As omissões são justificadas (a CLI conta por `cabecalhoDe`, e os testes usam
`readdir`), e os acréscimos também — mas o plano ficou desatualizado, e é ele que o marco 6 vai ler.

**M8. `tests/unit/build.test.mjs:41` (final 1) não lê o `validacao.json`.** Os finais 2 e o teste do
`gerarPdf` de mentira leem e comparam com `r.achados`; o final 1 só confere a lista de arquivos.
Como é justamente o final em que o `validacao.json` é o **único** artefato entregue, ele merece a
mesma asserção (é também a que pegaria o I3 no caminho da etapa 1).

**M9. `validador/regras/saida.js:143` — a guarda é assimétrica.** `!Number.isFinite(paginasDoPdf)`
cala a regra, mas `paginasEsperadas` ausente não: com `paginasDoPdf` finito e `paginasEsperadas`
indefinido, sai `"PDF com 11 páginas (esperadas undefined)."`. Hoje é inalcançável por `build()`
(a etapa 7 sempre calcula as duas), mas a regra é um módulo público do validador. Guarde as duas.

**M10. `tests/integracao/visual.test.mjs:55` cria a pasta de diffs no topo do módulo**, em toda
rodada, mesmo quando nada falha (o `mkdtemp` sem limpeza é padrão da casa — o supérfluo aqui é criar
a pasta **antes** de saber se haverá diff). Mover o `mkdtemp` para dentro de `gravarDiff`, com
memoização, resolve.

---

## Recomendações

1. **Ordem de correção sugerida:** I1 e I2 primeiro (são os dois testes vazios, e os dois têm
   correção curta e já verificada nesta revisão); depois I5 (a guarda, porque é ela que sustenta a
   manchete do marco); depois I3, I4, I7 (o trio do caminho de exceção da CLI, que se resolve bem
   junto); I6 e I8 podem ir juntos, já que os dois são sobre onde os testes moram e o que cobrem.

2. **Uma regra que vale a pena escrever no plano do marco 6, porque este branch a demonstrou duas
   vezes:** *quando um teste afirma que uma linha de produção existe, a asserção tem de usar um valor
   que só aquela linha possa produzir.* I1 falhou por usar `pt-BR`, que o Chrome também escreve; I2
   falhou por medir o número de páginas, que o `beforeprint` também produz. Nos dois casos a correção
   é a mesma: escolher um valor ou um instante que a via alternativa não alcança.

3. **Ao estender a guarda (I5), faça-a medir a frase da manchete**, não só a ausência de buracos:
   um laço sobre os quatro grupos mais `assert.equal(total, 60)`. Um teste que afirma o número é o
   que impede a manchete do release de envelhecer sem aviso.

4. **Não vale a pena** mexer no limiar 0 da comparação visual (é mais estrito que a spec, e foi
   medido), nem reunificar as quatro regras de saída numa etapa só (a spec 9.3 endossa a divisão).

---

## Avaliação

**Pronto para merge?** **Com correções.**

**Razão técnica:** o núcleo do marco está certo e é sustentado por testes que eu quebrei de
propósito e que reagiram — as transições do pipeline, os quatro finais, os códigos de saída, a
ligação de `saida.pdf-paginas` e a igualdade pixel a pixel entre os modos. A fronteira está limpa,
os 6 commits estão no padrão, e a alegação "60 de 60 regras da fase 1" é verdadeira hoje. O que
impede o merge imediato são dois testes que passam sem medir o que prometem (`/Lang` e a chamada de
`prepararImpressao`), a guarda que deveria proteger a própria manchete e continua cega em dois
grupos, e três arestas do caminho de exceção da CLI (`validacao.json` parcial, `file://` sem escape
com diagnóstico errado, e sobrescrita silenciosa com alvo-arquivo). Nenhuma delas é um defeito do
artefato entregue ao aluno — o PDF sai certo — e todas têm correção curta e já verificada.

---

# O que foi feito depois desta revisão

Esta seção foi escrita no fechamento do marco, depois que todos os achados acima foram tratados.
A revisão devolveu **0 Critical, 8 Important e 10 Minor**, com veredicto "aprovado com correções".
**Os 18 foram corrigidos**, em duas rodadas, e a segunda existiu porque a re-revisão derrubou
correções da primeira — inclusive uma que eu mesmo tinha escrito.

## A rodada de correção, em dois despachos

Dividi por **tipo de obrigação**, não por volume: cinco achados existiam porque um teste passava sem
medir o que prometia, e a disciplina de provar por inversão — apagar a linha de produção e ver o
teste falhar — dilui quando vem junto de mais treze itens mecânicos.

- **Despacho A** (`a4cec5f`, `2254880`, `05bd927`, `0a9b84e`): os dez itens que se provam por mutação.
- **Despacho B** (`38fdae0`, `7c1eb80`, `61926a0`, `98f1f86`, `a1043cb`, `7e68bd2`, `8256f8f`): o
  caminho de exceção da CLI e a limpeza.

## Onde eu não segui a revisão, e por quê

**Recusei o `assert.equal(total, 60)`** que este relatório recomenda duas vezes (em I5 e na
recomendação 3). Um número escrito no teste é o contrato repetido em código, e a restrição global
deste projeto inclui limiares explicitamente. A preocupação por trás da recomendação é legítima e a
minha versão não a cobre — apagar uma regra do contrato *e* a implementação dela junto passa verde
nas duas direções. Mas a instrumentação certa para ela é estrutural: a guarda passou a **derivar os
grupos do próprio contrato** e a exigir registro para cada um, o que pega "apareceu um quinto grupo
sem registro" sem apostar num número.

**Reverti a minha própria decisão sobre o M3.** Eu tinha mandado *não* escrever o teste do
`printBackground`, apoiado na premissa deste relatório de que a verificação honesta exigiria
rasterizar a página. A re-revisão mediu que a premissa é falsa: a linha acrescenta exatamente um
`0 0 1280 720 re f` por página, e sem ela o operador não existe. O teste foi escrito (`bcfae4a`), e
o comentário que afirmava a premissa falsa — dentro do código, onde teria sobrevivido ao marco —
foi apagado. **Premissa falsa derruba a decisão que se apoiava nela, mesmo quando a decisão era
confortável.**

## O achado que a rodada revelou, e o erro que eu cometi consertando-o

Corrigir o I8 — estender a comparação visual de dois para seis decks — deixou a suíte de integração
intermitente: 193/195 em 3 de 4 rodadas, sempre o mesmo slide, **sempre exatamente 131 pixels**. Esse
"sempre exatamente" é o que reorientou o diagnóstico: corrida de pintura dá contagens variáveis
conforme o estágio; um valor binário indica dois estados discretos.

Investigado até a causa, e nenhuma das duas primeiras hipóteses era certa. Não é face de fonte
ausente (o HTML construído embute as mesmas oito `@font-face` do CSS de desenvolvimento, com
`Geist Mono` variável 400–700) nem face diferente pintada (o CDP responde `GeistMono-SemiBold`,
peso 600, mesma caixa, **dos dois lados**). Despejando as duas imagens na falha: mesmas coordenadas,
intensidades diferentes, 597 pixels escuros de um lado contra 467 do outro na mesma caixa de 92×72.
**Rebordo de antisserrilhado**, sob carga.

Então troquei a igualdade exata pela tolerância da spec 11.2 — e **errei a dose**. A re-revisão
provou com uma mutação própria e pequena: um mais-um na numeração de blocos, só do lado build, muda
50 dos 63 slides e o arquivo passa verde. Eu tinha lido "limiar 0,1 e **no máximo** 0,5 %" como se a
spec prescrevesse o valor; ela prescreve um **teto**, e ser mais estrito sempre foi conforme.

A correção final (`f4323e4`) não é o número, é o que o prende: um **orçamento de 150 pixels por
slide**, medido entre o ruído (63 px, e 131 no pior caso histórico) e a menor mudança de produto
acima da faixa de ruído (190 px) — mais dois testes que o seguram. Um asserta os próprios limites (o
orçamento tem de caber no teto da spec, cobrir o pior ruído medido e ficar abaixo da menor mudança
real), e outro exige que a renumeração de blocos seja pega. Um número que eu escolho envelhece; um
teste que exige pegar um defeito real, não.

**O limite conhecido está escrito no cabeçalho do arquivo e asserido em forma executável:** nenhum
orçamento por slide separa os dois regimes, porque a menor mudança de produto (24 px) é menor que o
ruído (63 px). O que faz o teste funcionar é que o mesmo defeito tem uma segunda assinatura acima do
ruído, e todo deck do espécime tem ao menos dois slides ali. O teste mede os dois regimes e imprime
os 24 px que deliberadamente não pega.

## A re-revisão

Sobre a rodada inteira, com nove inversões refeitas do zero pelo revisor: **0 Critical, 3 Important,
5 Minor**, todos corrigidos em `f4323e4`, `bcfae4a` e `05b2413`. Confirmou também que o diagnóstico
dos 131 pixels é do instrumento e não do produto — dependência de carga, auto-estabilidade dos dois
lados, e o resíduo some com um round-trip de CDP a mais.

Um item deste relatório foi corrigido pela medição de quem o executou: a dedução sobre
`recursos.linguagem` (M6-b) está invertida — `renderizarCodigo` só erra quando a linguagem está
**fora** de `contrato.linguagens`. A conclusão prática, defesa em profundidade sem duplicata,
sobrevive por outro caminho: a regra é estática com severidade erro, a etapa 1 para o pipeline no
primeiro final e `construir()` nem chega a rodar.

## Verificação final

- **419 testes unitários**, sem Chrome: 418 passam, 1 pulado, 0 falham (spec 8.1).
- **199 testes de integração** em 21 arquivos, cada um no próprio comando, todos verdes; e a suíte
  completa 199/199 em 4 rodadas seguidas.
- **Os seis decks do espécime** pelos dois comandos: `validar` limpo nos seis (`muitos-blocos.html`
  com os 10 avisos que ele existe para provocar), e `build` produzindo **seis pares `.html`/`.pdf`
  distintos** — 9, 15, 6, 15, 11 e 12 páginas.
- **60 de 60 regras da fase 1** implementadas, agora com a guarda cobrindo os quatro grupos.
