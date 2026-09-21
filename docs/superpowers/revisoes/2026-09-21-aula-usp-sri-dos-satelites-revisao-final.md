# Revisão final — SRI dos satélites

Branch `sri-satelites` em `c738b89`, worktree `.claude/worktrees/sri-satelites`, limpo na entrada e na
saída. 10 commits, 17 arquivos fora de `dist/` e `pacotes/` (o diff entregue conta 16; o décimo
sétimo é o próprio plano, `docs/superpowers/plans/2026-09-21-aula-usp-sri-dos-satelites.md`).

> **Veredicto: aprovado.** O marco cumpre a promessa da spec 3.2, passo 5, pela primeira vez em sete
> marcos, e — o que importa mais — **a prova dele prova**. Refiz as três inversões por fora dos
> testes do repositório, com sonda própria e Chrome de verdade, e as três se comportam como o ledger
> registra. Nenhum Critical. Um Important, quatro Minor, todos documentais ou de alcance de guarda;
> nenhum deles pede mudança de comportamento.

| severidade | quantos |
|---|---|
| Critical | **0** |
| Important | **1** |
| Minor | **4** |
| Nit | 0 |

---

## 0. Verificação, com os números medidos

Tudo rodado neste worktree, com o Google Chrome instalado (`/Applications/Google Chrome.app`), sem
`CHROME_PATH`.

| item | medido |
|---|---|
| `npm test` | **474 testes, 474 passam, 0 falham, 0 pulados**; 24,97 s e 24,23 s em duas execuções (início e fim da revisão) |
| `npm run test:integracao` | **213 testes, 213 passam, 0 falham, 0 pulados**; 35,92 s e 35,16 s em duas execuções (início e fim) |
| `npm test` com `CHROME_PATH=/nao/existe/chrome` | **474 testes, 472 passam, 0 falham, 2 pulados** — confirma a linha 49 do `AGENTS.md`, que `c738b89` acabou de corrigir |
| `aula-usp dist` | sem diff |
| `aula-usp pacotes` | sem diff, saída 0 |
| `npm run guia` | sem diff |
| os três juntos | `git status --short` vazio, repetido **cinco vezes** ao longo da revisão (uma no início e uma depois de cada mutação revertida) |
| `dist/` deixados pelos builds | apagados: `especime/dist`, `modelos/aula/dist`, `exemplos/descida-do-gradiente/dist`. Sobra o `/dist` rastreado, **12 arquivos** |
| `dist.test.mjs` sozinho | **18 testes** (9 de topo + 9 subtestes), mediana **4,78 s** de três amostras (5,48 / 4,61 / 4,78) |

### Os oito alvos, pelos dois comandos

| alvo | `validar` | `build` | páginas |
|---|---|---|---|
| `especime/index.html` | 0 erros / 0 avisos (0) | 0/0 (0) | 15 |
| `especime/matematica.html` | 0/0 (0) | 0/0 (0) | 11 |
| `especime/codigo.html` | 0/0 (0) | 0/0 (0) | 9 |
| `especime/componentes.html` | 0/0 (0) | 0/0 (0) | 15 |
| `especime/ifusp.html` | 0/0 (0) | 0/0 (0) | 6 |
| `especime/muitos-blocos.html` | 0 erros, **10 avisos** (0) | idem (0) | 12 |
| `modelos/aula/` | 0/0 (0) | 0/0 (0) | 6 |
| `exemplos/descida-do-gradiente/` | 0/0 (0) | 0/0 (0) | 11 |

**15, 11, 9, 15, 6, 12, 6, 11** — idênticas às do 6c e às da revisão do pacote autossuficiente. Os 10
avisos de `muitos-blocos.html` são os de sempre. **Sem regressão.**

### Tamanhos de `dist/` contra a spec 11.2

| arquivo | bytes | KB | meta | folga |
|---|---|---|---|---|
| `aula-usp.js` | 559.740 | **546,6** | 700 KB | **153 KB** |
| `aula-usp-tex.js` | 637.702 | **622,8** | 800 KB | **177 KB** |
| `aula-usp-codigo.js` | 115.093 | **112,4** | 600 KB | **488 KB** |

Todos dentro. E o custo do mecanismo, medido contra o manifesto da base (`df731a5^`):

| | antes | depois | delta |
|---|---|---|---|
| `aula-usp.js` | 558.632 | 559.740 | **+1.108 bytes = +0,20 %** |
| os outros **dez** arquivos | — | — | **0 byte, hash idêntico** |

A ordem das chaves de `dist/manifesto.json` virou junto: antes começava em `aula-usp.js`, hoje começa
em `aula-usp-motor.js` e termina em `aula-usp.js`. É a consequência visível da inversão da Tarefa 1.

### Indicadores estáticos no pacote commitado

```
grep -o 'sha384-'   dist/aula-usp.js | wc -l  →  9
grep -o 'importmap' dist/aula-usp.js | wc -l  →  1
grep -o 'integrity' dist/aula-usp.js | wc -l  →  1
grep -o 'SATELITES_EMBUTIDOS' dist/aula-usp.js | wc -l  →  0   (o `define` substituiu o identificador, como projetado)
```

Os nove pares `"nome":"sha384-…"` estão lá, um por satélite, e nenhum a mais.

---

## 1. A prova prova?

**Sim, e é a única coisa que prova.** Refiz as três inversões com uma sonda própria
(`servirPastaCrua` reimplementado, `rotearCdn` reimplementado, Chrome de verdade) para não depender
da asserção que eu estava avaliando.

### Inversão 1 — corromper um satélite na rota interceptada

| página | satélite corrompido | `data-montado` | pedidos | import maps | erros de console |
|---|---|---|---|---|---|
| `especime/codigo.html` | — | **`sim`** | 9 | 1, com 9 entradas | 0 |
| `especime/codigo.html` | `aula-usp-lang-json.js` | **`erro`** | 9 | 1 | 2 |
| `especime/matematica.html` | `aula-usp-tex.js` | **`erro`** | 2 | 1 | 2 |

As mensagens, do meu próprio Chrome:

```
Failed to find a valid digest in the 'integrity' attribute for resource
'https://cdn.jsdelivr.net/npm/aula-usp@0.1.0/dist/aula-usp-lang-json.js' with computed SHA-384 …
TypeError: Failed to fetch dynamically imported module:
https://cdn.jsdelivr.net/npm/aula-usp@0.1.0/dist/aula-usp-lang-json.js
```

e o painel de erro nomeia o arquivo ao autor. O import map que o navegador carregou tem **exatamente
as nove chaves de URL resolvida**, cada uma apontando para o `sha384-` que `dist/manifesto.json`
registra. Conferi as nove, uma a uma.

### Inversão 2 — desligar a injeção do import map

Apaguei o bloco `if (base) { … }` de `montar/dist.js` e rodei `aula-usp dist`.

```
sha384 em dist/aula-usp.js:   9 → 0
importmap em dist/aula-usp.js: 1 → 0
```

`node --test tests/unit/bundle.test.mjs`:

| guarda | resultado |
|---|---|
| `:115` regenerar bate campo a campo com o manifesto commitado | ✔ **verde** |
| `:135` os arquivos de `dist/` batem byte a byte com o regerado | ✔ **verde** |
| `:172` todo satélite tem o seu `integrity` embutido | ✖ **cai** |
| `:195` o `integrity` embutido é o mesmo do manifesto | ✖ **cai** |

Exatamente a assimetria que o plano previu, e a sétima reprodução da lição do `AGENTS.md`: a
igualdade não vê o gerador quebrado; a propriedade vê.

E o fecho que falta ao plano: **depois de rodar também `aula-usp pacotes`** (senão o próprio
`aula-usp.js` é recusado pela tag e a medição não chega aos satélites), o satélite corrompido
**monta**:

| página | satélite corrompido | `data-montado` | import maps | erros |
|---|---|---|---|---|
| `codigo.html` | `aula-usp-lang-json.js` | **`sim`** | 0 | **0** |
| `matematica.html` | `aula-usp-tex.js` | **`sim`** | 0 | **0** |

Esse é, byte a byte, o estado em que o repositório passou sete marcos. E note o detalhe: `aula-usp
pacotes` **saiu com 0** com o mecanismo desligado — a conferência dele também compara o resultado com
o gerador, e portanto também não vê.

### Inversão 3 — a ordem do empacotador de volta ao que era

Movi o bloco de `guardar('aula-usp.js', …)` para antes dos satélites, como estava até o marco 5a.

- `aula-usp dist` **sai com 0**. Nenhum erro, nenhum aviso. `aula-usp.js` encolhe de 546,6 kB para 545,8 kB;
- `sha384` = **0**; `importmap` = **1** — o mapa é injetado, e está **vazio**;
- caem as mesmas duas guardas, `:172` e `:195`. Todo o resto verde.

Duas coisas a registrar. Primeiro, **a ordem errada não falha, entrega um artefato inerte** — é
literalmente o perigo que o novo parágrafo do `AGENTS.md` nomeia, e ele está certo. Segundo, **`grep
importmap` sozinho não é indicador**: ele continua valendo 1 com o mecanismo morto. Quem move é
`grep sha384`.

### E a prova reproduz o achado do despacho B

Refiz a mutação do nome nu (`[arquivo, hash]` em vez de `[urlDoSatelite(arquivo), hash]`), regerei
`dist/`, `pacotes/` e o guia:

| indicador | valor |
|---|---|
| `grep sha384 dist/aula-usp.js` | **9** |
| `grep importmap dist/aula-usp.js` | **1** |
| `npm test` | **474 / 474 verdes, 0 pulados** |
| satélite corrompido em `codigo.html` | **`montado=sim`, 0 erros de console** |
| satélite corrompido em `matematica.html` | **`montado=sim`, 0 erros de console** |
| `node --test tests/integracao/dist.test.mjs` | **7 passam, 2 caem** |

Os dois que caem são exatamente os dois novos. **Confirmado: sem eles, o repositório não distingue o
mecanismo vivo do mecanismo morto.** É o argumento mais concreto que este projeto produziu a favor de
exercitar o caminho de produção num navegador de verdade, e o ledger não exagerou ao chamá-lo de
achado mais fundo do marco.

### O modo de falha que o marco cria — nove novos — é bom

Nove maneiras novas de uma aula não montar merecem a pergunta "e o leitor, o que vê?". Medido:

| | `body` visibility | `<style ocultar>` ainda no head | `h1` com caixa > 0 | sections | painel |
|---|---|---|---|---|---|
| `matematica.html` com `tex` corrompido | **visible** | não | **sim** | 8 | nomeia `aula-usp-tex.js` |
| `codigo.html` com `lang-latex` corrompido | **visible** | não | **sim** | 9 | nomeia `aula-usp-lang-latex.js` |
| `index.html` com o principal corrompido | **visible** | não | **sim** | 13 | (sem painel; o runtime nem roda) |

A aula **não some**: o `.catch()` de `montar/dist.js` remove o `<style>` de ocultação, o HTML cru
aparece legível, e o painel diz qual arquivo falhou. É exatamente o que `guia/71-fluxo-chat.md`
promete ao autor ("se o runtime não carregar, a aula não some"), e o marco o preserva.

---

## 2. Há defeito que nenhuma guarda deste repositório veria?

Procurei um segundo da mesma família — mecanismo presente, mensurável, inerte — **e não achei no
produto.** Achei um uma camada acima, na guarda (§ I1). Registro as duas coisas com a medição, porque
a ausência também é resultado.

### Por que o produto não tem outro: o conjunto de endereços é fechado por construção

O mecanismo só pode ficar inerte se o navegador pedir uma URL que não é chave do mapa — o SRI de
import map **falha aberto e calado** quando não acha chave. Então a pergunta é: que URLs `import()`
pode pedir?

- `montar/entrada.js` pede exatamente quatro formas de especificador (linhas 104, 132, 133, 134):
  `'katex'`, `'@shikijs/primitive'`, `'@shikijs/engine-javascript'` e `` `@shikijs/langs/${l}` ``,
  este último **filtrado por `contrato.linguagens`**;
- `arquivoDoSatelite` mapeia isso em `{aula-usp-tex.js}` ∪ `{aula-usp-codigo.js}` ∪
  `{aula-usp-lang-<l>.js : l ∈ contrato.linguagens}` — **os nove, e nada mais**;
- as duas pontas (chave do mapa e URL pedida) passam pela **mesma** `urlDoSatelite`.

E medi a consequência em vez de só argumentá-la. Instrumentei **todas** as buscas de rede da página:

| deck | buscas | fora do mapa |
|---|---|---|
| `codigo.html` | 10 | só o documento e `aula-usp.js` (este coberto pelo `integrity` **da tag**) |
| `matematica.html` | 3 | idem |
| `index.html` | 2 | idem |

**Nenhuma busca sobra.** Não há satélite de satélite, não há CSS nem fonte vinda da rede — a CSS do
KaTeX e as 20 woff2 dela vivem dentro de `aula-usp-tex.js`, que é conferido.

### E a cadeia de confiança fecha na tag que o autor escreve

`integrity` da tag (escrito por `aula-usp pacotes` a partir de `dist/manifesto.json`, guardado em
`tests/unit/pacotes.test.mjs:154`) → bytes de `aula-usp.js` → os nove `sha384-` que ele embute →
bytes de cada satélite. Não existe elo pendurado.

### Três hipóteses hostis, todas derrubadas por medição

Testei os cenários em que um import map injetado por script costuma virar inerte — porque, se algum
valesse, o defeito seria invisível a toda guarda do repositório (os decks do espécime não os
exercitam). Corrompi `aula-usp-tex.js` em cada um:

| página | `data-montado` | mapas no documento | KaTeX renderizou |
|---|---|---|---|
| `<script type="module">` inline **antes** da tag | **`erro`** | 1 | não |
| `<script type="module">` com `import` **estático** de `data:` antes da tag | **`erro`** | 1 | não |
| `<script type="module">` com `import()` **dinâmico** antes da tag | **`erro`** | 1 | não |
| `<script type="importmap">` **do autor** antes da tag | **`erro`** | **2** | não |
| controle, sem nada antes | **`erro`** | 1 | não |
| controle, íntegro | `sim` | 1 | **sim** |

O Chrome honra o mapa injetado mesmo com carga de módulo anterior e mesmo com um segundo import map
no documento. **O mecanismo é mais robusto do que o plano prometia.**

### O que eu procurei e não é defeito

- **`if (base)` silencia a injeção quando `document.currentScript?.src` é falso.** Não é buraco: se
  `base` for falso, o `resolver` lança em `new URL(nome, undefined)` no primeiro satélite pedido, e a
  aula cai no `.catch()` com mensagem. Um deck sem matemática nem código monta sem mapa — e sem nada
  para conferir. Escopo certo.
- **A ordem `dist/aula-usp-tex.js` ← hash ← `dist/manifesto.json`.** Não há guarda que hasheie os
  bytes commitados de um satélite contra o `integrity` commitado dele. Mas a implicação fecha por
  transitividade: `:135` diz "bytes em disco == regerado" para **todos** os 11, e `:115` diz
  "manifesto commitado == regerado". Logo `integrity` commitado == hash(bytes commitados). Sem
  achado.
- **Renomeação `bytesExtras` → `corromper`.** Zero chamadores antigos sobrando (`grep bytesExtras`
  em `tests/`, `build/`, `montar/`: nada).

---

## 3. A ordem do empacotador está certa e guardada?

**Certa, e guardada pela consequência — que é a guarda melhor.**

- **Certa:** satélites → hashes → principal. Visível até na saída de `aula-usp dist`, que hoje lista
  `aula-usp.js` por último.
- **Se alguém inverter de volta:** medido na Inversão 3 acima. O comando **não falha** — sai com 0 e
  entrega um import map vazio. Quem acusa são `tests/unit/bundle.test.mjs:172` ("aula-usp.js não traz
  o integrity de aula-usp-tex.js — spec 3.2, passo 5") e `:195`. Guardar a consequência é melhor do
  que guardar a ordem: a mesma guarda pega a inversão, o `define` removido, e qualquer terceiro jeito
  de o hash não chegar.
- **O hash embutido é o mesmo do manifesto**, e hoje isso tem **três** pontas, não duas:
  `:195` compara os dois artefatos **commitados** (o caso do merge resolvido metade de cada lado, que
  `:135` por construção não vê); e a primeira prova nova de `dist.test.mjs` acrescenta a terceira — o
  mapa que **o Chrome carregou** contra `dist/manifesto.json`. Conferi as nove entradas.
- **A segunda instância da regra** está escrita no `AGENTS.md`, ao lado da de `cobertura.json`, com a
  forma certa ("a ordem errada não falha, entrega uma geração atrasada") e com a nota histórica
  correta de que até o 5a o principal saía primeiro **sem dar erro nenhum, porque naquele desenho ele
  não precisava de nada dos satélites**.

---

## 4. Ruling 4 — o décimo script

**Confirmada. Não derrubo.** Não é lacuna, e a Ruling está certa inclusive no argumento, que é a
parte que importa: *SRI protege as buscas que o sistema faz, não a existência do arquivo na CDN.*

Medi por conta própria, em três frentes.

**1. O código.** Exatamente três usos de `aula-usp-motor.js` em todo o código rastreado, e nenhum é
uma busca de rede:

| onde | o quê |
|---|---|
| `build/bundle.mjs:104` | produz o artefato |
| `build/embutir.mjs:138` | `motor.textContent = await readFile(new URL('dist/aula-usp-motor.js', raiz), 'utf8')` — **texto, em `<script>` sem `src`** |
| `build/build.mjs:113` | comentário |

**2. O artefato.** Nos **seis** HTML construídos do espécime (457 kB a 890 kB), medido com truncagem:

| arquivo | `<script src=` | total de `<script` | `aula-usp-motor` | `cdn.jsdelivr` | `importmap` | `sha384-` |
|---|---|---|---|---|---|---|
| todos os seis | **0** | 2 ou 3 | **0** | **0** | **0** | **0** |

Zero tag com `src`, de qualquer tipo. A aula construída não busca nada.

**3. A guarda já existe, e é de igualdade com o arquivo** — `tests/unit/embutir.test.mjs:22`, "a tag
do runtime some e o motor embutido entra no lugar dela", que compara os bytes de
`dist/aula-usp-motor.js` com o `textContent` de um `<script>` sem `src` da aula construída (igualdade,
não `includes` — o próprio comentário do teste registra por que).

**Sobre a afirmação contrária que circulou:** a fonte era o comentário de `build/bundle.mjs`, que
dizia que o motor "entra por `<script src>` na aula construída" e que "quem confere o integrity dele,
quando houver, é a tag". As duas metades eram falsas. `17615bb` corrigiu o comentário. **Consertar a
fonte, e não só evitar repetir, é o que impede o achado falso de voltar** — e é o ponto mais maduro
de processo deste marco. Li o commit e o texto novo: ele diz o que mediu e nada além.

Uma observação que reforça a Ruling, e que não está escrita em lugar nenhum: se `aula-usp-motor.js`
ganhasse um `integrity`, ele seria uma **guarda que não pode ficar vermelha** — o mesmo motivo por
que o despacho A recusou pôr `integrity` no import map do modo de desenvolvimento. Duas recusas, o
mesmo critério, aplicado com consistência. Isso é o desenho funcionando.

---

# Achados

## [Important] I1 — a guarda de propriedade chama de "origens independentes" duas listas que, para sete dos nove satélites, saem do mesmo arquivo

`tests/unit/bundle.test.mjs`, função `satelitesQueDistSabePedir()` (linha 152) e o teste de `:172`; e
o parágrafo novo do `AGENTS.md` ("E a sétima, medida no SRI dos satélites…").

O texto das duas pontas diz o mesmo: *"Hoje ela compara duas listas de origens independentes — a do
empacotador e a que o `resolver` de `montar/dist.js` sabe pedir, **lida do fonte dele** — e a
igualdade das duas é o que fecha a janela."*

**Medido, instrumentando a própria função:**

| origem | quantos nomes | quais |
|---|---|---|
| literais lidos do **fonte de `montar/dist.js`** | **2** | `aula-usp-tex.js`, `aula-usp-codigo.js` |
| lidos de **`contrato/contrato.json`** (`linguagens`) | **7** | `aula-usp-lang-{python,r,sql,javascript,bash,json,latex}.js` |

E o lado "do empacotador" percorre `for (const linguagem of linguagens)` sobre **o mesmo
`contrato/contrato.json`**. Para sete dos nove satélites, portanto, as duas listas são a mesma fonte
com dois caminhos — exatamente a forma que o despacho A identificou e que o `AGENTS.md` passa a
documentar como regra.

**A inversão, medida.** Tirei `r` de `contrato.linguagens` e rodei as guardas sem regerar nada:

| guarda | resultado |
|---|---|
| `bundle.test.mjs:172` — todo satélite tem o seu `integrity` embutido | ✔ **verde** |
| `bundle.test.mjs:195` — o embutido é o mesmo do manifesto | ✔ **verde** |
| `contrato.test.mjs` — linguagens coincidem com os valores de `data-lang` | ✖ cai |
| `bundle.test.mjs:115` e `:135` (as de igualdade) | ✖ caem |

Ou seja: **as duas guardas que dizem fechar a janela ficam verdes**, e quem vê é a guarda de
contrato-contra-spec mais as de regeneração. A janela está fechada — só que não por elas.

**Por que isto importa, e não é só redação.** Hoje não há buraco: o "todo" das gramáticas é o mesmo
em todos os três lugares que o consomem (empacotador, `entrada.js` e a guarda), então mexer nele move
tudo junto e de forma correta. O risco é de herança. A fase 2 acrescenta
`aula-usp-graficos.js` e `aula-usp-diagramas.js` (spec 3.5). Se eles entrarem como **literais** no
`resolver`, ganham o caminho realmente independente e a guarda faz o que promete. Se entrarem por uma
**lista do contrato** — como as sete gramáticas entraram —, o padrão se repete e o `AGENTS.md` terá
dito ao implementador que a janela estava fechada quando não estava. É o segundo aprendizado do
próprio `AGENTS.md` aplicado a ele mesmo: *"o título de uma guarda é uma promessa, e o alcance dela
precisa caber no título"*.

**Sugestão (documental, sem mudar comportamento):** uma oração no comentário do teste e no parágrafo
do `AGENTS.md` dizendo de onde vem cada metade — dois nomes do fonte de `montar/dist.js`, sete de
`contrato.linguagens`, e que para estes sete quem ancora é `tests/unit/contrato.test.mjs`, que
confere o contrato contra a spec. Dois minutos, e o próximo implementador sabe qual metade herdou.

---

## [Minor] M1 — `assert.equal(mapa.quantos, 1)` mede mais do que a propriedade que guarda

`tests/integracao/dist.test.mjs`, primeira prova nova. A asserção exige **exatamente um** import map
no documento. A propriedade sob teste é "os satélites que o navegador pede têm `integrity`".

Medido: com um `<script type="importmap">` do autor antes da tag, o documento tem **2** mapas e o
satélite corrompido **continua sendo recusado** — o mecanismo funciona, e só esta asserção cairia. É
um falso positivo em potencial, não um buraco (e hoje é inalcançável: `script` não está em
`html.elementos` do contrato, e `vocabulario.script` acusa `script` dentro de `section`). Vale uma
linha de comentário dizendo que o `1` guarda "ninguém injetou dois mapas por engano", e não a
conferência.

## [Minor] M2 — `alvos` pode conter duplicata quando dois decks da prova pedirem o mesmo satélite

Mesmo arquivo, segunda prova nova:

```js
const alvos = decks.flatMap(({ deck, satelites }) => satelites.map((nome) => [nome, deck]));
assert.deepEqual(alvos.map(([nome]) => `${decks[0].base}${nome}`).sort(),
  Object.keys(decks[0].mapa.integrity).sort(), …);
```

Hoje funciona porque `matematica.html` (1 satélite) e `codigo.html` (8) **não se sobrepõem** — 1 + 8
= 9 = as chaves do mapa. No dia em que `DECKS_DA_PROVA` ganhar um deck que use matemática **e**
código — que é literalmente o que o plano original pedia e que a fase 2 pode trazer —, `alvos` terá
nomes repetidos e este `deepEqual` cai sem que nada esteja errado. O comentário antecipa a queda da
fase 2 (satélites novos) mas não esta. Um `new Set` nos dois lados, ou uma linha no comentário,
resolve.

## [Minor] M3 — as duas aulas de aceite ficaram com um `integrity` que este marco tornou obsoleto, e o registro disso não está no repositório

`tests/aceite/aulas/claude-code.html:12` e `codex-cli.html:12` carregam
`integrity="sha384-r5XJHUJ4P95y…"`, que era o hash de `aula-usp.js` **até este marco**; hoje é
`sha384-dAAkK0S84e8o…`. Na base do branch as duas batiam; foi este marco que as deixou defasadas —
está em escopo.

Manter é o certo: são registro datado do aceite, e `tests/aceite/roteiro.md` diz no topo que a fase 1
foi rodada em 2026-09-21 sobre o sistema em `e9a1a70`. Reescrevê-las seria reescrever história.

O que falta é o marcador. **`.superpowers/` não é rastreado no git** (`git ls-files .superpowers` →
**0 arquivos**), e o ledger é hoje o único lugar onde a decisão está escrita. Quem rodar a fase 3 do
aceite, com a CDN resolvendo, vai abrir essas duas aulas e ver o runtime recusado, sem nada por perto
que explique. Uma frase em `tests/aceite/roteiro.md`, perto de "As aulas produzidas estão em
`aulas/`", basta: *"a tag delas é a de `e9a1a70` e fica como está; quando a CDN resolver, o navegador
vai recusá-la — é registro, não aula viva."*

## [Minor] M4 — `grep importmap` circula como indicador do mecanismo e não é um

O ledger e o texto do marco usam o par (`grep sha384` = 9, `grep importmap` = 1) como o conjunto de
indicadores estáticos. Medido na Inversão 3: com a ordem do empacotador revertida, `importmap`
**continua valendo 1** e o mapa está vazio; quem move é `sha384`, que vai a 0. E na Inversão 2, com a
injeção apagada, os dois vão a 0. O segundo indicador só distingue estado no caso em que o primeiro
já distinguiu. Não muda nada no código — só evita que alguém confie no indicador errado numa
verificação apressada.

---

# O que fica para depois, e está certo assim

- **A asserção de cobertura vai cair quando a fase 2 acrescentar `aula-usp-graficos.js` e
  `aula-usp-diagramas.js`** — de propósito, com o que fazer escrito no comentário. Falhar alto no
  momento exato em que alguém precisa pensar no assunto é o desenho certo, e eu o endosso.
- **O modo de desenvolvimento segue sem `integrity`**, e o comentário de `build/servir.mjs` (20
  linhas, só comentário) dá os dois motivos. O segundo — *"o único hash possível seria um que o
  próprio servidor calculasse dos bytes que vai servir, no mesmo pedido: verde por construção"* — é o
  que decide, e é o mesmo critério da Ruling 4. Consistente.
- **A publicação no npm** continua sendo fase 3. Nada aqui a antecipa.

# Números do `AGENTS.md`, conferidos

Como o marco mexeu no arquivo, conferi os números que ele afirma:

| afirmação | medido |
|---|---|
| 38 arquivos em `tests/unit/` | **38** |
| 22 arquivos em `tests/integracao/` | **22** |
| `CHROME_PATH` inexistente: 472 passam, 2 pulados | **472 / 2** |
| `dist/` tem 12 arquivos versionados | **12** |
| `build/` são 17 arquivos Node | **17** |
| onze arquivos de teste leem `dist/` | **11** |
| `bundle.test.mjs` nas linhas 115, 135, 172, 195 | **exatas, as quatro** |

Nenhum número defasado sobrou.

---

# O que foi feito depois desta revisão

A revisão **aprovou** o marco e devolveu **0 Critical, 1 Important, 4 Minor**. Os cinco foram
corrigidos, em cinco commits que não mudam comportamento do produto — **uma única linha de código**,
o resto é texto. Verificação final: **474 testes unitários e 213 de integração, zero pulos.**

## A correção que atravessou esta revisão também

O `AGENTS.md` afirmava que inverter a ordem do empacotador entrega "um hash de ontem que o navegador
vai recusar hoje", e esta revisão endossou a frase. **Medido na rodada de correção: está errada, e
invertida.** Com a ordem trocada o mapa sai **vazio**, e mapa vazio não recusa nada — **o SRI de
import map falha aberto e calado**: os nove satélites carregam sem conferência nenhuma e a aula monta
com zero erros.

A consequência importa. Errar a ordem não produz um site quebrado que alguém nota; produz **zero
proteção com zero ruído**, que é o estado em que este repositório esteve por sete marcos. É o que
torna a guarda de propriedade que pega isso essencial, e não um cuidado a mais.

## O Important era uma frase, não uma guarda

Eu havia generalizado a lição do primeiro despacho — "a fonte da guarda tem de ser independente da
fonte do que ela guarda" — e a escrevi como regra da casa. A revisão mediu que, para **7 dos 9**
satélites, as duas listas passam pelo mesmo `contrato.linguagens`; só `tex` e `codigo` têm origens
de fato independentes. Tirando uma linguagem do contrato, **as duas guardas de propriedade ficam
verdes**, e quem vê é `contrato.test.mjs`.

**Nenhum satélite está desprotegido**: a cobertura existe, só mora noutro arquivo. O que estava errado
era a **descrição** — e uma regra da casa mais forte que o fato é pior que uma modesta, porque o
`AGENTS.md` é lido por quem chega, e a fase 2 acrescenta dois satélites que herdariam essa leitura.
A frase passou a dizer o que é verdade **e onde a cobertura mora**.

## Dez reproduções da mesma lição

A rodada de correção acrescentou a nona e a décima: com o mapa chaveado pelo nome nu, e com a ordem
do empacotador invertida, as guardas de **igualdade** ficaram verdes em ambos os casos. Só as de
**propriedade** caíram.

## O defeito que nenhuma guarda sem navegador vê

Este marco encontrou um caso que vale registrar como classe: com o import map chaveado pelo **nome
nu** em vez da URL resolvida, **todo indicador estático fica idêntico ao estado correto** —
`grep sha384` dá 9, `grep importmap` dá 1, 474 testes passam, incluindo as duas guardas de
propriedade — **e os nove satélites corrompidos montam**.

O que separa "protegido" de "aparentemente protegido" é uma correspondência de string entre a chave
do mapa e a URL que o navegador resolve. Nenhuma inspeção estática a vê. **Só um navegador de verdade
buscando o arquivo de verdade.**

## Verificação final

- `npm test`: **474/474**, zero pulos · sem Chrome: 472 passam, 2 pulados, os dois anunciados
- `npm run test:integracao`: **213/213**, zero pulos
- `aula-usp dist`, `aula-usp pacotes` e `npm run guia` sem diff — conferido cinco vezes, uma por
  mutação revertida
- `sha384-` em `dist/aula-usp.js`: **9**, um por satélite. Era **0**
- custo: `aula-usp.js` **+0,20%**; os outros dez pacotes **byte a byte idênticos**
- os oito alvos pelos dois comandos, sem regressão: 15, 11, 9, 15, 6, 12, 6 e 11 páginas
