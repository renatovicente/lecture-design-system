# Revisão final do marco 6a — relatório

**Escopo:** branch `m6a-modelo-exemplo` inteiro, de `ce60d32` até `4660583` (9 commits, 7 arquivos,
+407/−14). Worktree `.claude/worktrees/m6a-modelo-exemplo`, limpo no início e no fim.

**Veredicto: com correções.** Nenhuma porta de verificação falha — as duas suítes passam inteiras, os
oito decks validam e constroem, o `git status` fica limpo depois de tudo. Os três achados Important
são de **conteúdo**, e todos ficam caros depois: o 6b documenta a aula-exemplo e o 6c a empacota, de
modo que o que estiver errado aqui é congelado por dois marcos. Os três somados são uma linha de
texto, dois níveis de `div` e um `aside`.

---

## 1. Números medidos

Tudo abaixo foi executado neste worktree, nesta revisão. Nenhum número é herdado de relatório anterior.

### Suítes

| comando | resultado |
|---|---|
| `npm test` | **419 testes, 419 passam, 0 falham**, 0 pulados · 21,3 s · saída 0 |
| `npm run test:integracao` | **200 testes, 200 passam, 0 falham**, 0 pulados · 32,0 s · saída 0 |

O arquivo novo aparece na suíte de integração e imprime os onze arquivos do manifesto:

```
[tamanhos] aula-usp.js                   546 KB (meta 700 KB, folga 154 KB)
[tamanhos] aula-usp-tex.js               623 KB (meta 800 KB, folga 177 KB)
[tamanhos] aula-usp-codigo.js            112 KB (meta 600 KB, folga 488 KB)
```

Os outros oito (`aula-usp-motor.js` 20 KB e as sete gramáticas, de 3 a 171 KB) saem sem meta, como a
spec 11.2 pede para o "registrados". Os três números do Fato 6 do plano batem exatamente.

**Inversão refeita por mim** (cópia do teste em `.superpowers/`, meta de `aula-usp.js` baixada para
100 KB, repositório intocado): falha com

```
AssertionError [ERR_ASSERTION]: aula-usp.js tem 546 KB, acima da meta de 100 KB da spec 11.2
```

O teste não é vazio: a asserção nomeia o arquivo, o tamanho medido e a meta. O `console.log` roda
sempre e é o "registrados"; a asserção é o "acima disso". Confere com a Tarefa 4 do plano.

### Os oito decks, pelos dois comandos

Este é o item que ficou aberto em todos os despachos. `validar <pasta>` resolve para
`<pasta>/index.html` (`build/validar.mjs:24`), então os seis decks do espécime foram chamados por
arquivo, um a um.

| deck | `validar` | `build` | PDF |
|---|---|---|---|
| `modelos/aula/` | 0 erros, 0 avisos | código 0 | **6 páginas** |
| `exemplos/descida-do-gradiente/` | 0 erros, 0 avisos | código 0 | **11 páginas** |
| `especime/index.html` | 0 erros, 0 avisos | código 0 | 15 páginas |
| `especime/componentes.html` | 0 erros, 0 avisos | código 0 | 15 páginas |
| `especime/codigo.html` | 0 erros, 0 avisos | código 0 | 9 páginas |
| `especime/matematica.html` | 0 erros, 0 avisos | código 0 | 11 páginas |
| `especime/ifusp.html` | 0 erros, 0 avisos | código 0 | 6 páginas |
| `especime/muitos-blocos.html` | 0 erros, **10 avisos** | código 0 | 12 páginas |

Os 10 avisos de `muitos-blocos.html` são por desenho e anteriores a este branch (`especime/` não é
tocado pelo 6a): 1 de `estrutura.blocos` (9 blocos, acima de 8, é o caso que o deck existe para
exercitar) e 9 de `estrutura.id-ausente`. Saída 0 nos dois comandos, como a spec 8.1 manda para aviso.

`exemplos/descida-do-gradiente/dist/validacao.json` sai `[]`. `git status --porcelain` fica **vazio**
depois dos oito builds: o `.gitignore` do 5c (`dist/` seguido de `!/dist/`) cobre os três `dist/` de
aula criados (`modelos/aula/`, `exemplos/…/`, `especime/`).

### Commits

Os 9 commits terminam com **exatamente um** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
Nenhuma mensagem afirma mais do que a evidência sustenta; `0f21a26` inclusive declara, por escrito,
que nenhuma suíte foi executada naquela tarefa.

### O modelo, contra o plano

`modelos/aula/index.html` é **byte a byte** o bloco do Passo 1 da Tarefa 1 (2.084 bytes dos dois
lados). E é o que a spec 10.3 pede: "capa, duas aberturas, um slide de conteúdo por bloco e
encerramento" — capa, `primeiro-bloco`, `uma-ideia`, `segundo-bloco`, `duas-colunas`, encerramento.

### A correção da spec (Tarefa 5)

O diff em `docs/superpowers/specs/2026-09-14-aula-usp-design.md` é **exatamente** o que o plano manda
e nada mais: 5 linhas removidas, 7 acrescentadas, todas dentro do bloco da seção 5.1, envolvendo o
`<ol class="passos">` num `<div>`. Nenhuma outra linha da spec mudou no branch.

---

## 2. Achados

**Critical: 0 · Important: 3 · Minor: 4 · Nit: 2**

### Important

#### I1 — `AGENTS.md` afirma sobre `aula-usp novo` o contrário do que o plano diz no mesmo branch

`AGENTS.md:24`:

> Dois comandos que a spec 8.1 lista ainda não existem: `aula-usp pacotes`, que chega no marco 6c, e
> `aula-usp novo <pasta> --unidade ime`, **que não está atribuído a nenhum marco**.

O plano em HEAD (`docs/superpowers/plans/2026-09-20-aula-usp-m6a-modelo-exemplo.md:25` e `:27-30`)
atribui `novo` ao **6c**, em negrito na tabela e num parágrafo próprio.

A ordem dos commits explica: `0f21a26` (AGENTS.md) veio **antes** de `b2ca90b`, que é justamente o
commit que corrigiu o plano *por causa* dessa medição — a mensagem dele diz "a tabela 8.1 tem seis
comandos e a divisão 6a/6b/6c cobria cinco: aula-usp novo não estava atribuído a marco nenhum. Fica
registrado aqui como item do 6c". A correção entrou no plano e **não voltou para o artefato que
carregava a afirmação**.

Custo: `AGENTS.md` é o arquivo que quem chega lê (via `CLAUDE.md` → `@AGENTS.md`), e ele agora diz
que há trabalho órfão quando não há.

**Correção:** trocar "que não está atribuído a nenhum marco" por "que também chega no 6c" — uma linha.

#### I2 — a aula-exemplo embrulha `ol.passos` numa coluna que o contrato não pede, e se contradiz no mesmo arquivo

`exemplos/descida-do-gradiente/index.html:47-56`, slide `derivacao`:

```html
<div class="colunas" data-grade="12">
  <div>
    <ol class="passos">
```

Medido, três vezes:

1. **O contrato não pede isso.** `ol.passos` está em `contrato.blocosDeCorpo`, e o layout `conteudo`
   aceita, por `umDe`, ou um `div.colunas` ou um ou mais blocos de corpo. Construí a variante com o
   `<ol class="passos">` direto na `<section>` e validei: **0 erros, 0 avisos**. O embrulho é opcional.
2. **Ele não muda nada na tela.** `estilos/layouts.css:66` define
   `.colunas[data-grade="12"] { grid-template-columns: var(--palco-util); }`, e `--palco-util` é
   1152 px — a largura útil inteira do palco. Com um único filho, a regra de ritmo
   `.colunas > div > * + *` também não chega a aplicar.
3. **O próprio arquivo mostra as duas formas.** `superficie`, `gradiente`, `codigo` e `exercicio` põem
   `aside.destaque`, `\[…\]`, `pre` e `div.exercicio` **direto** na `<section>`; só `derivacao` embrulha.
   Um modelo que imite este arquivo não tem como extrair a regra, porque não há regra.

Por que importa mais aqui do que em outro lugar: é o artefato que vai dentro dos quatro pacotes do
6c (`assets/exemplo.html`, spec 10.2) e é o que Claude, GPT e Codex vão copiar. Ruído estrutural
copiado é ruído em toda aula gerada.

**Este é o sexto defeito do plano.** O Passo 2 da Tarefa 2 manda "escreva-a assim, **dentro de um
`<div>` de coluna**". A frase veio do Fato 1, que é sobre filhos de `div.colunas` — mas o Fato 1 só
vale **se** você usar `div.colunas`, e a tabela do Passo 1 do mesmo plano atribui duas colunas
apenas ao slide `taxa`, não ao `derivacao`. Para obedecer à letra do Passo 2 num slide de uma coluna
só, quem executou teve de inventar o `data-grade="12"`. O plano se contradiz entre o Passo 1 e o
Passo 2, e o arquivo entregue é fiel ao lado errado.

Efeito colateral medido: o embrulho troca o limite aplicável de `corpo.palavras` (90) por
`coluna.palavras` (60). A coluna está em **32 palavras**, então não há risco hoje — mas a margem
encolheu de 58 para 28 palavras em troca de nada.

**Correção:** apagar as duas linhas de abertura e as duas de fechamento, desindentar o `<ol>`.
Corrigir junto o Passo 2 do plano, para que o guia do 6b não herde a forma errada — foi exatamente
assim que `3f552e8` tratou o `<code class="linguagem-python">`.

#### I3 — a aula-exemplo usa `η` em três slides e nunca diz que `η` é a taxa de aprendizado

A sequência, como o aluno a vê:

- slide 6 (`derivacao`), item 4: `\( w \leftarrow w - \eta\,\nabla E(w) \)` — o símbolo estreia **sem nome**;
- slide 7 (`taxa`): o slide inteiro é sobre "a taxa de aprendizado", em prosa, e **não traz o símbolo**
  em lugar nenhum (h2, lide, as duas colunas, o alerta, as notas — conferi todos);
- slide 10 (`exercicio`): "Com \( \eta = 0{,}1 \) e gradiente \( 4 \)…" — cobra a conta com o símbolo;
- slide 9 (`codigo`): `eta=0.1` na assinatura da função.

O laço nunca se fecha. Não é erro de matemática — é uma omissão que só um leitor pega, e é
precisamente o que a spec e o espécime evitam nos dois lugares em que tratam o mesmo assunto:

- spec 5.1, no esqueleto: `<aside class="destaque" data-rotulo="Definição">Taxa de aprendizado \(\eta\): o tamanho de cada passo.</aside>`
- `especime/componentes.html:28`: `<aside class="destaque" data-rotulo="Definição">Taxa de aprendizado: o tamanho de cada passo da descida.</aside>`

Há folga para a correção: o slide `taxa` usa **0 de 2** `destaque` permitidos (`destaque.maxPorSlide`
= 2) e as colunas estão em 22 e 23 palavras das 60.

**Correção:** um `aside.destaque` na primeira coluna do slide `taxa`, ligando o símbolo ao nome — a
mesma frase que a spec 5.1 já escreve.

### Minor

#### M1 — o plano ainda manda documentar "os cinco comandos da CLI"

`…/plans/2026-09-20-aula-usp-m6a-modelo-exemplo.md:343`, Tarefa 3, Passo 1: "os cinco comandos da CLI
(`servir`, `validar`, `build`, `dist` hoje; `pacotes` chega em 6c)". O mesmo plano, na linha 27, diz
que a spec 8.1 lista **seis**. É o resíduo da mesma correção incompleta de I1: `b2ca90b` arrumou a
tabela do 6c e não voltou ao item da Tarefa 3. Sem consequência aqui (quem executou cobriu os seis
mesmo assim), mas o 6b vai ler este plano.

#### M2 — `README.md` na raiz contradiz o `AGENTS.md` recém-chegado

Medido em `README.md`: "**Fase 1, marcos 1 a 4 prontos**" (linha 11), "**55 das 56 regras**" (18),
"341 unitários e 99 de integração" (19), "`aula-usp build`, `aula-usp dist` … **o que ainda não
existe**" (21) e "Hoje a CLI tem **dois comandos**" (25). Todos falsos desde o marco 5.

Não é regressão do 6a — mas o 6a põe, ao lado dele e na mesma raiz, um documento correto que diz
quatro comandos, 64 regras e 34+22 arquivos de teste. Quem chega abre o `README.md` primeiro. O
despacho C registrou isso e não tocou, corretamente (o plano atribui a reescrita ao 6c, linha 25).
Vale decidir se o `README.md` não deveria subir para o 6b, já que o 6b é documentação e o 6c é o fim
da fila.

#### M3 — "épocas" entra uma vez, sem definição, para o que o resto da aula chama de "passo"

`exemplos/…/index.html:65`: "o modelo gasta muitas **épocas** para chegar perto do fundo". O uso está
correto (em lote, uma iteração é uma passada pelos `N`), mas o termo aparece só aqui; o código do
slide seguinte chama o mesmo laço de `passos=100`, e a aula inteira chama a atualização de "passo".
São três palavras para duas coisas, num público de aula 4.

#### M4 — `AGENTS.md` mistura duas taxonomias na lista das fixtures

`AGENTS.md:100`: "hoje são 56 pastas, uma para cada regra de estrutura, vocabulário, limites,
recursos, matemática, **carga** e composição". Medido, os prefixos das 56 pastas são
`estrutura` (13), `vocabulario` (8), `limites` (20), `recursos` (6), `matematica` (4) e
`composicao` (5) — "carga" é um **grupo** do contrato, cujas regras se chamam `recursos.*` e
`matematica.*`, não um prefixo de pasta. A afirmação não é falsa (as 4 regras de carga da fase 1 têm
pasta), mas a lista lê como partição e não é. O item 4 logo abaixo está certo e é mais preciso.

### Nit

#### N1 — "essas quatro linhas de conta"

`exemplos/…/index.html:77`, slide `pratica`: "Como essas quatro linhas de conta viram um laço que
roda?". A derivação tem quatro itens, mas o terceiro ("O gradiente aponta a subida, então ande no
sentido oposto") é prosa sem símbolo. Três são conta.

#### N2 — citação de linha um número curta

`AGENTS.md:45` cita `tests/integracao/utilitarios.mjs:34` para "chamam `chromium.launch()` direto".
A linha 34 é `export function iniciarChrome() {`; a chamada está na 35. As outras quatro citações de
linha do arquivo (`bundle.test.mjs:115` e `:135`, `tokens.test.mjs:93`, `fontes-css.test.mjs:24`,
`cobertura.test.mjs:74`) caem **exatas** na linha do `test(` que descrevem.

---

## 3. `AGENTS.md`, afirmação por afirmação

Chegou sem revisão prévia, e foi onde gastei mais tempo. Conferi cada comando, caminho e número
contra o repositório. **Fora do I1, do M4 e do N2, tudo bate.** O que foi medido:

| afirmação | medido |
|---|---|
| 4 comandos na CLI, com essas flags | `node bin/aula-usp.mjs` sem argumento imprime as 4 linhas de uso, idênticas à tabela |
| "cada comando aceita só as suas flags … saem com o uso e código 2" | `build --json`, `validar --porta 1` e `validar --xyz`: os três imprimem o uso e saem com **2** |
| saídas 0/1/2 (spec 8.1) | confere com a spec 8.1 e com `bin/aula-usp.mjs` |
| `build` faz "as sete etapas da spec 3.3", escreve só em `<pasta>/dist/` | spec 3.3 tem 7 etapas numeradas; o build imprime "etapa 1/7"…"7/7" |
| 7 scripts de `package.json`, e `aula-usp dist` sem script npm | `package.json`: `test`, `tokens`, `fontes`, `marcas`, `fontes:css`, `servir`, `test:integracao` — 7, e nenhum `dist` |
| `npm run fontes`/`marcas` baixam da rede, autorização do autor | spec 8.3, literal |
| Node ≥ 20.6; `playwright-core` usa o Chrome instalado (canal `chrome` ou `CHROME_PATH`) | `package.json engines`; `tests/integracao/utilitarios.mjs:35` |
| 34 arquivos em `tests/unit/`, 22 em `tests/integracao/` | `ls … \| wc -l` → 34 e 22 |
| "falta de Chrome não é falha" é regra da CLI, não dos testes | spec 8.1 e spec 3.3 degradam `validar`/`build`; a suíte chama `chromium.launch()` sem guarda |
| `dist/` tem 12 arquivos versionados (4 + 7 + manifesto) | `git ls-files dist/` → 12, e são esses |
| `.gitignore`: `dist/` e depois `!/dist/`, nessa ordem | `.gitignore:18-19`, nessa ordem |
| guardas em `bundle.test.mjs:115` e `:135`, com "rode `aula-usp dist` de novo" | as duas linhas são exatamente os `test(` descritos; a mensagem está lá |
| "onze arquivos de teste leem `dist/`" | 11 `*.test.mjs` (mais `utilitarios.mjs`, que não é arquivo de teste) |
| tabela dos gerados: `tokens.test.mjs:93`, `fontes-css.test.mjs:24`, `cobertura.test.mjs:74`, `bundle.test.mjs:115`/`:135` | as quatro linhas caem exatas |
| "cabeçalho Gerado por … Não editar à mão" | presente em `estilos/tokens.css`, `tokens/tokens.js`, `estilos/fontes.css`; ausente em `cobertura.json`, que é JSON — e o texto já ressalva "quando o formato permite" |
| cobertura **antes** de empacotar, porque `montar/dist.js` importa `cobertura.json` | `bin/aula-usp.mjs:160-169` nessa ordem, com o comentário; `montar/dist.js:20` importa |
| fronteira: zero `node:` nos quatro diretórios; `bin/` 1 arquivo, `build/` 15 | `grep -rn "node:"` → **0**; `find bin -type f` → 1; `find build -type f` → 15 |
| a regra do `bin/` escrita no topo do arquivo; módulos de `build/` por `import()` | `bin/aula-usp.mjs:6-13`, literal; 4 `await import(` no arquivo |
| contrato: versão 1, 7 layouts, 33 limites, 64 regras, 60 fase 1 todas implementadas, 4 fase 2, 7 linguagens | lidos do JSON: 1, 7, 33, 64, 60/4, 7 — todos batem |
| `saida.megabytes: 10` mora no contrato, não no código | `contrato.limites["saida.megabytes"] = 10`; `validador/regras/saida.js:97` lê do contrato |
| `validador.test.mjs` não escreve nome de grupo nem número de regras | `:406-411` derivam os grupos do próprio contrato |
| 56 pastas de fixture; as 4 `saida.*` são as únicas de fase 1 sem pasta | 56 pastas; fase 1 = 47 estática + 5 composição + 4 carga + 4 saída = 60; 60 − 56 = as 4 de saída |
| composição mede antes de o motor iniciar | `build/composicao.mjs:43`: "?folha dispõe todos os slides e não inicia o motor" |
| o validador tem painel dentro da aula | `motor/paineis.js`, `montar/entrada.js:220`, spec linha 78 |

`CLAUDE.md` é `@AGENTS.md` mais a quebra: 11 bytes, literal e completo, como o Passo 2 manda.

---

## 4. A matemática da aula-exemplo, conferida do zero

Refiz a conferência com `numpy` 2.4.4, sem reaproveitar nada do relatório da correção, sobre
`N = 37` exemplos e `n = 5` pesos, em 200 pontos `w` sorteados
(`revisao-final-conferir-matematica.py`, nesta pasta). Cinco perguntas, todas independentes entre si — em particular,
o item 2 foi montado como **soma explícita sobre `i`**, não na forma matricial, para que a comparação
com o código não fosse circular.

| conferência | resultado |
|---|---|
| A. item 2 contra diferença central de `E` (item 1) | máx. \|dif\| = **1,4e-09** — ruído de diferença finita |
| B. item 2 contra `grad = -X.T @ erro / len(y)` (slide 9) | máx. \|dif\| = **8,9e-16** — ruído de ponto flutuante |
| C. o exercício: `η = 0,1`, gradiente `4` | passo = **0,400**, e `w` anda **para baixo** — a resposta "0,4 no sentido oposto" está certa |
| D. o laço do slide 9 converge | `E` de 0,378802 para 0,334198, e `w` chega a **6,1e-16** da solução de mínimos quadrados |
| E. um passo do item 4 de fato desce | `E` de 6,154156 para 5,437075 |

**A derivação está correta e é a mesma conta do código.** O `1/N` do item 1 e do item 2 é exatamente
o `/ len(y)` da linha do `grad` — A e B fecham o laço nos dois sentidos, do item 1 ao item 2 por
derivada numérica, e do item 2 ao código por igualdade. A correção de `ec5b486` acertou o alvo:
alinhar a derivação ao código, e não o contrário, é o que torna a aula verificável pelo aluno.

A escolha de `N` maiúsculo também se sustenta: o slide 4 usa `n` minúsculo para indexar **pesos**
(`\partial E/\partial w_n`), e `especime/matematica.html:35` já escreve a forma em lote com `N`.

**Medições de contrato sobre o mesmo arquivo:**

- o trecho de Python, por `codigoDoBloco` (a função que o validador usa): **11 linhas, 54 colunas** na
  mais larga (a do docstring), contra limites de 16 e 64. Confere com `3f552e8`, que corrigiu os
  números errados do plano;
- palavras por bloco: `superficie` 66/90, `gradiente` 44/90, `codigo` 20/90, `exercicio` 25/90;
  `derivacao` col. 1 = 32/60; `taxa` col. 1 = 22/60 e col. 2 = 23/60;
- passos revelados, contados no HTML **construído** com o próprio `motor/passos.js`: slide 6
  (`derivacao`) 3 elementos e 3 grupos, todos `li`; slide 10 (`exercicio`) 1 elemento e 1 grupo, o
  `div.resposta`. A correção MÉDIO-1 pegou: a nota que promete "um minuto de silêncio antes de
  revelar a resposta" agora é verdadeira;
- 11 slides, 3 aberturas (`intuicao`, `regra`, `pratica`), notas em todos os 6 slides de conteúdo —
  a spec 10.3 pede 10 a 12 slides, três blocos, derivação, Python, exercício e notas. Tudo presente.

---

## 5. O que conferi e **não** é defeito

Registro para que ninguém refaça:

- **A tag relativa do runtime** (`../../dist/aula-usp.js`) no modelo e no exemplo, contra a forma de
  CDN que a spec 5.1 desenha. É a decisão do Fato 3, e a spec 8.1 a sustenta: quem reescreve a tag em
  `modelos/`, `especime/` e `exemplos/` é `aula-usp pacotes`, no 6c. As três citações do Fato 3
  (`embutir.mjs:134-136`, `servir.mjs:79` e `:142`, `composicao.mjs:6` e `:39`) conferem.
- **O teste de tamanhos falhar em vez de avisar.** A spec 11.2 diz "emite aviso"; o teste falha.
  Foi decidido no plano com o argumento certo (um teste que só imprime não mede nada), o
  `console.log` cobre o "registrados", e a folga hoje é de 154/177/488 KB. Não reabro.
- **Os 10 avisos de `muitos-blocos.html`.** Anteriores ao branch, por desenho do deck.
- **As citações de linha do plano:** `contrato.json:133` (`data-passo` com `^([1-9][0-9]*)?$` em `*`,
  o que torna o valor vazio válido em qualquer elemento), `motor/passos.js:6-9` (um grupo por
  elemento quando o valor não é número), `montar/corpo.js:67-70` (`rotularExercicios` só põe
  `data-rotulo`), `especime/componentes.html:26-32` e `:39-46`, `especime/matematica.html:35`. Todas
  exatas.
- **Os limites do Fato 5:** código 16×64, corpo 90, coluna 60, lista 5, síntese 3×80, título 2×2×50 —
  os seis conferem com `contrato.limites`. O Fato 2 também (`abertura.dataCurto.caracteres` = 10 e
  `abertura.h2.caracteresSemDataCurto` = 10).
- **A contagem do despacho C** "60 de fase 1 (47 estáticas, 5 de composição, 4 de carga, 4 de saída)".
  Errei essa conta na primeira passada e refiz: das 4 regras de fase 2, três são do grupo `carga`
  (`recursos.csv`, `recursos.dot`, `recursos.diagrama-grande`) e uma do `estatica`
  (`recursos.grafico`). O relatório está certo.

---

## 6. O que o 6b e o 6c herdam

1. **I2 e I3 antes do 6b.** O guia do 6b documenta a aula-exemplo e cita trechos dela; o 6c a copia
   para `assets/exemplo.html` nos quatro pacotes. Corrigir depois é corrigir em três lugares.
2. **I1 e M1 juntos.** São a mesma correção incompleta: `b2ca90b` arrumou a tabela do 6c e deixou
   para trás o item da Tarefa 3 no plano e a frase em `AGENTS.md`.
3. **O `README.md` (M2)** continua a dizer que o sistema tem dois comandos, ao lado de um `AGENTS.md`
   que diz quatro. Considerar antecipá-lo para o 6b.
4. **A lição de processo, que este marco repete pela sexta vez:** os seis defeitos do plano foram
   todos achados por quem executava, e cinco geraram commit de correção do plano. O que o sexto
   (I2) acrescenta é um caso novo — não é um fato errado, é uma **instrução que contradiz outra
   instrução do mesmo plano** (Passo 2 contra a tabela do Passo 1). Fato errado a execução derruba na
   hora, porque a ferramenta acusa; instrução contraditória a execução obedece, porque as duas
   validam. Vale um passo de conferência interna do plano antes de despachar.

---

# O que foi feito depois desta revisão

Escrito no fechamento do marco. A revisão devolveu **0 Critical, 3 Important, 4 Minor e 2 Nit**, com
veredicto "com correções". **Os nove foram corrigidos**, em cinco commits (`bf37c37`, `7e171ff`,
`bdc5791`, `d816244`, `2f8e8c2`), e a verificação final foi refeita por mim: **419 testes unitários e
200 de integração**, todos verdes.

## Onde a correção divergiu do que esta revisão sugeriu, e por quê

**I3 — a definição de `η` não virou um `aside.destaque`.** A revisão apontou, corretamente, que a
aula usava o símbolo em três slides sem nunca dizer o que ele é, e observou que o slide `taxa` tinha
duas vagas livres de `destaque`. Mas a pergunta que decide não é onde cabe, e sim onde a definição
**pertence**: o símbolo estreia na derivação e é cobrado no exercício, então uma definição que chega
depois do uso conserta o validador e não conserta a aula. O nome entrou dentro do item em que o
símbolo aparece pela primeira vez, antes da fórmula, e o slide `taxa` passou a trazer o símbolo no
seu lide. Medido, de passagem: naquele slide o `destaque` **não** caberia — `composicao.transbordo`
de 5 px, o mesmo número com e sem `data-passo` e com textos de comprimentos bem diferentes, ou seja,
é o bloco que não cabe, não o texto.

**A frase da spec 5.1 não foi copiada, e não deveria ser.** A seção 5.1 define taxa de aprendizado
como "o tamanho de cada passo". Isso é falso nesta aula: o passo é `η` vezes o gradiente, e o próprio
exercício responde `0,4` para `η = 0,1`. A aula diz que `η` "controla quanto da inclinação medida
vira movimento".

Esta é a **terceira** imprecisão encontrada na seção 5.1 da spec durante este marco. As outras duas:
o esqueleto punha `ol.passos` como filho direto de `div.colunas`, o que não valida (corrigido pela
Tarefa 5), e a formulação que corrigiu isso, generalizada demais, fez a aula embrulhar `ol.passos`
numa coluna de grade 12 que o contrato não pede (o I2 desta revisão). **A seção 5.1 é ilustrativa e
não é fonte confiável de trecho pronto** — o marco 6b, que vai escrever o guia, precisa saber disso.

## Uma medição desta revisão que estava larga demais

A seção 4 cita "66/44/20/25 palavras" contra o teto de 90. Esses números somam `h2` + `p.lide` +
corpo; a regra `limites.palavras-corpo` remove `h1`, `h2` e `p.lide` **antes** de contar, e o corpo
real dos mesmos slides é 41/24/0/17. O veredicto não muda — não havia erro nem aviso —, mas o marco
6b não deve citar "66 de 90" ao documentar os limites. É a assinatura que este projeto vem
encontrando desde o marco 5: *uma medida mais larga que a pergunta*, desta vez dentro de uma revisão.

## O que este marco custou em defeitos de plano

O plano do 6a foi corrigido **seis vezes durante a execução**, sempre por defeito meu, sempre achado
por quem o executava: a marcação de código (`<pre><code class="linguagem-python">` em vez de
`<pre data-lang="python">`), a contagem de linhas e colunas do trecho, a premissa do Fato 3 sobre a
tag do CDN, o `div.resposta` sem `data-passo`, a derivação de um exemplo contra o código em lote, e o
embrulho de coluna supérfluo do I2.

Vale o registro porque o padrão é consistente: **eu medi sete fatos antes de escrever o plano, e
todos os seis defeitos estão fora do que eu medi.** Verifiquei tudo que suspeitava ser incerto e nada
do que parecia óbvio — a convenção de marcação de código, a frase da spec, o passo seguinte a um
número que eu tinha acabado de medir. O sinal de alerta mais útil que saiu daqui é gramatical:
**"logo", "então", "portanto" logo depois de um fato medido** é onde a verificação parou e o
argumento continuou sozinho.

## Verificação final

- `npm test`: **419 testes, 419 passam, 0 falham**, sem navegador.
- `npm run test:integracao`: **200 testes, 200 passam, 0 falham**.
- `modelos/aula/`: `validar` 0 erros e 0 avisos; `build` código 0, **6 páginas**.
- `exemplos/descida-do-gradiente/`: `validar` 0 erros e 0 avisos; `build` código 0, **11 páginas**,
  `validacao.json` vazio.
- Os **seis decks do espécime** pelos dois comandos, sem regressão: 15, 15, 9, 11, 6 e 12 páginas,
  com os 10 avisos de desenho de `muitos-blocos.html`.
- `git status` limpo depois dos oito builds.
- A matemática da aula conferida do zero com numpy, em 200 pontos: a derivação é o gradiente
  verdadeiro do seu próprio erro (1,4e-09 contra diferença central) e é **a mesma conta que o código
  faz** (8,9e-16), que era o defeito que esta rodada existia para fechar.
