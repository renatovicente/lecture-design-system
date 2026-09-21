# Revisão final do branch `pacote-autossuficiente`

**Veredicto: aprovado com achados.** O branch faz o que se propôs — os cinco achados do aceite
fecham, e a peça central (a guarda de caminhos) é real: refiz cinco inversões e todas as cinco se
reproduziram com os números do ledger. O que ele não faz é o que o título da guarda promete. "Todo
caminho citado dentro do pacote existe dentro do pacote" é verdade para o reconhecedor que a guarda
tem, e **172 citações mortas seguem nos dois pacotes de chat**, fora do alcance dele por um corte que
a própria guarda não documenta. Nenhum achado bloqueia o merge; três merecem conserto antes de
fechar o marco, e dois deles são de uma linha.

Base: `282e3ab`, worktree limpo. Tudo abaixo foi medido nesta árvore, não citado.

| severidade | quantos |
|---|---|
| Critical | 0 |
| Important | 3 |
| Minor | 3 |
| Nit | 3 |

---

## Números medidos

| medida | valor |
|---|---|
| `npm test` | **471 passam, 0 falham, 0 pulos** (rodado duas vezes, antes e depois das inversões) |
| `npm run test:integracao` | **202 passam, 0 falham, 0 pulos** |
| `npm run guia` + `aula-usp pacotes` sobre a árvore commitada | `git status` **vazio** nos dois |
| guarda de caminhos | **149 citações conferidas, 0 mortas** (piso de 100) |
| âncoras citadas no pacote | **78**, e todas resolvem num `id=` do arquivo apontado |
| `pacotes/` | **46 arquivos, 548.565 bytes**; skill **182.350**; `instrucoes.txt` **5.111 caracteres** (teto 8.000) |
| tabela de limites | **33 linhas = 33 limites do contrato**; `capa.h1.caracteresPorSegmento` presente no guia e nos três pacotes que o levam |
| `dist/` deixados pelos builds | apagados (`especime/`, `modelos/aula/`, `exemplos/descida-do-gradiente/`); sobra o `/dist` rastreado, **12 arquivos** |

### Os oito alvos, pelos dois comandos

| alvo | `validar` | `build` | páginas |
|---|---|---|---|
| `especime/index.html` | 0 erros / 0 avisos (código 0) | 0/0 (código 0) | 15 |
| `especime/matematica.html` | 0/0 (0) | 0/0 (0) | 11 |
| `especime/codigo.html` | 0/0 (0) | 0/0 (0) | 9 |
| `especime/componentes.html` | 0/0 (0) | 0/0 (0) | 15 |
| `especime/ifusp.html` | 0/0 (0) | 0/0 (0) | 6 |
| `especime/muitos-blocos.html` | 0 erros, **10 avisos** (0) | idem (0) | 12 |
| `modelos/aula/` | 0/0 (0) | 0/0 (0) | 6 |
| `exemplos/descida-do-gradiente/` | 0/0 (0) | 0/0 (0) | 11 |

As oito contagens de página são idênticas às da revisão final do 6c (15, 11, 9, 15, 6, 12, 6, 11), e
os 10 avisos de `muitos-blocos.html` são os já registrados desde o 6a. **Sem regressão.**

---

# 1. A guarda de caminhos fecha a classe?

**Fecha a classe que ela reconhece, e não fecha a classe inteira.** O reconhecedor tem quatro cortes.
Três deles estão documentados no comentário da guarda ("o que ela NÃO pega"). O quarto não está — e é
justamente onde mora o falso negativo.

## O que medi, corte a corte

Repliquei o reconhecedor fora do teste e instrumentei cada corte.

| corte | quantas citações ele descarta hoje | alguma delas é morta? |
|---|---|---|
| fora de crase | — | **22** (`<!-- guia/NN-….md -->`, o cabeçalho de procedência do guia num arquivo) |
| dentro de bloco cercado | — | 3, e são a exceção deliberada (`modelos/aula` na saída de `aula-usp novo`) |
| primeiro segmento fora das duas raízes | 3 | 0 — as três são `minha-aula/dist/`, caminho inventado como exemplo. Corte certo |
| **dois segmentos ou mais** | **258** | **172** |

Os cortes documentados estão bem calibrados: **nenhum** deles esconde uma citação morta que importe.
Conferi também o que o comentário não afirma e eu suspeitava: **zero** vãos de crase com caminho
embutido que o regex ancorado perdesse, **zero** arquivos com número ímpar de cercas (que
dessincronizaria o filtro e engoliria o resto do arquivo em silêncio), e as **78** âncoras citadas
resolvem todas num `id=` de verdade — a guarda só confere o arquivo, mas hoje nenhuma âncora está
morta.

## O corte que abre o falso negativo

O comentário justifica o corte assim:

> dois segmentos ou mais. Um nome só com barra (`dist/`, `img/`, `references/`) é uma PASTA
> mencionada, e no guia essas são pastas da aula do autor, não do pacote.

A justificativa é sobre **pastas**, e está certa sobre pastas. Mas a regra que ela implementa exige
**pelo menos uma barra**, e com isso descarta também o **nome nu de arquivo** — que é a convenção de
referência cruzada do próprio guia: "é o assunto de `20-layouts.md`", "use `60-validador.md` quando o
validador falar".

No pacote da skill isso não custa nada: o guia é onze arquivos em `references/`, e os **86** nomes
nus resolvem ao lado de quem os cita. Nos dois pacotes de chat o guia é **um arquivo só**, e os
mesmos 86 não existem. Medido:

```
pacotes/claude/projeto:        +86 conferidas, 86 mortas
pacotes/gpt/gpt-personalizado: +86 conferidas, 86 mortas
pacotes/skill/aula-usp:        +86 conferidas,  0 mortas
pacotes/repositorio-de-disciplina: +0,           0
```

**172 citações mortas**, contra as 164 que o branch fechou. E a frase mais ilustrativa está em
`pacotes/claude/projeto/conhecimento/guia-do-autor.md`, no mesmo parágrafo em que `apontar` acertou:

> Um caminho curto para a primeira aula: leia este arquivo e `10-estrutura.md` … A aula-exemplo —
> `exemplo.html` — é uma aula inteira

`exemplo.html` foi reescrito e resolve; `10-estrutura.md` não existe naquele pacote. Logo acima, a
tabela "Onde está o resto" lista **dez** arquivos, nenhum dos quais é arquivo ali.

**Não é catástrofe, e é por isso que não é Critical:** o conteúdo está presente — é seção do arquivo
que o leitor tem aberto. Mas é exatamente a classe que o branch declarou fechada, na única metade do
sistema que a fase 3 vai exercitar primeiro, e o leitor é mandado a abrir um arquivo inexistente 86
vezes por pacote.

**O conserto é derivado, não digitado, e custa uma linha:** reconhecer também o nome nu quando ele
está em `arquivosDoGuia()` — os onze capítulos, lidos do disco como o resto da guarda já faz.
Prototipei: **+258 conferidas, 172 mortas, zero falso positivo.** Os 11 nomes nus que sobram no
pacote da skill e que não resolvem (`validacao.json`, `minha-aula.html`, `aula.html.txt`,
`index.html`, `AGENTS.md`, `package.json`, `aula-usp.js`) são todos do mundo do autor ou do sistema,
e ficam de fora por construção, sem exceção escrita.

Um irmão menor do mesmo corte: a linha `| `especime/` |` da tabela do `SKILL.md` é de um segmento e
**não é conferida**. Não está morta hoje, e a guarda 9 cobre os arquivos — mas o ponteiro em si não
tem guarda.

## O que mais ela não pega, e que eu confirmei não custar nada hoje

- **caminho fora de crase:** 22 ocorrências mortas, todas o cabeçalho `<!-- guia/NN-….md -->` que
  `guiaNumArquivo` insere. É comentário HTML e é procedência, não ponteiro. Fica registrado, não
  proposto para conserto.
- **recurso citado em atributo de HTML:** conferi os oito decks e os dois `.html` que viajam — só a
  tag da CDN (fase 3, declarada) e data URIs. **Nenhum `img/` que não viaje.** A classe existe e está
  vazia hoje.

---

# 2. As guardas novas medem o que prometem?

**Sim. Nenhuma das sete é de igualdade.** Refiz as inversões — as três do ledger e mais duas — e
todas se reproduziram, com os números e as mensagens que os despachos relatam.

| # | inversão | igualdade | propriedade |
|---|---|---|---|
| 1 | `capa.h1.caracteresPorSegmento` filtrado para fora de `tabelaDeLimites`, `npm run guia` + `aula-usp pacotes` rodados | **VERDE** | **1 cai**: "o limite capa.h1.caracteresPorSegmento não tem linha na tabela gerada" (22/23 passam) |
| 2 | `acervo()` devolvendo lista vazia, `aula-usp pacotes` **sai 0** | **VERDE** | **2 caem**: acervo incompleto e **122 citações mortas** |
| 3 | `apontar` desligado, `aula-usp pacotes` **sai 0** | **VERDE** | **3 caem**: o piso `trocados > 0`, a busca literal do caminho do repositório, e a de caminhos |
| 4 | `Prof. Nome Sobrenome` → `Prof. Fulano de Tal` no modelo, regerado | **VERDE** | **1 cai**, nomeando o valor novo (11/12 passam) |
| 5 | `limites.titulo.acao` ganhando "para até 50 caracteres" | n/a | **1 cai**: "o acao cita 50 e a regra mede capa.h1…, abertura.h2…, titulo… = 23, 20, 50" |

A inversão 5 é a que eu mais queria ver, porque é a raiz do achado 1 do aceite, e ela reproduz o
defeito exato: um `acao` com o 50 do `h2` numa regra que mede 23, 20 e 50. **O espião** —
`contrato.limites` embrulhado num `Proxy` que anota toda chave lida — é a melhor ideia técnica do
branch: ele mede que limites uma regra usa em vez de guardar um mapa regra→limite que envelheceria
calado, que é a doença que o plano inteiro trata.

Três outras coisas que confirmei sobre a qualidade das guardas:

- **os pisos anti-vacuidade estão em todas as sete**, e os dois da guarda do `acao` (`comNumero > 0`,
  `comMaisDeUmLimite > 0`) são o cuidado mais fino do branch: sem eles, um espião que parasse de
  anotar deixaria o laço inteiro cair no `continue` sem uma asserção sequer;
- a guarda 9 (acervo) **parece** de igualdade e não é: ela compara o pacote com a **fonte do
  repositório**, não com o que o gerador achou que ia escrever, e por isso cai na inversão 2;
- a guarda 6 duplica de propósito a ordem da troca (mais longo primeiro) em vez de importar
  `apontar`, pelo mesmo motivo do teto de 8.000 — e o comentário diz isso.

**Nenhum achado Important aqui.** O único reparo (Minor 6, abaixo) é de escopo, não de promessa: a
guarda do `acao` se declara sobre `limites.*` e cumpre; duas regras implementadas **fora** de
`limites.js` leem `contrato.limites` e citam os números dela no `acao` sem guarda — `estrutura.blocos`
(2 e 8) e `estrutura.nome-curto` (10), as duas corretas hoje. O espião já escrito funciona nelas sem
uma linha nova; o filtro `regrasDeLimite` é a única coisa no caminho.

---

# 3. O pacote ficou mesmo autossuficiente?

**O da skill, sim — para o conteúdo.** Amostrei como leitor de fora:

- os **149** ponteiros conferidos resolvem, e as **78** âncoras caem em `id=` de verdade. Abri duas
  à mão: `especime/matematica.html#passo-a-passo` e `especime/index.html#grade-4-4-4` existem e são
  o que a prosa diz que são (`<section data-layout="conteudo" id="…" data-pdf="passos">`);
- o número que o aceite não achou está lá: `capa.h1.caracteresPorSegmento`, na tabela de 33 linhas,
  nos três pacotes que levam o guia;
- os **86** nomes nus de capítulo resolvem, porque `references/` é uma pasta de verdade;
- a guarda 7 ("os pacotes ensinam `aula-usp novo` como começo") continua verde: nenhum arquivo manda
  copiar do repositório do sistema.

**A dependência que sobra está declarada, e é a certa.** `references/70-fluxo-terminal.md` diz que a
CLI só se instala do repositório do sistema (`npm link`) e que `npm install -g aula-usp` não funciona
até a fase 3. Isso não é um ponteiro morto: é o estado do mundo, dito. O aceite já o trata como
pré-condição.

**Nos dois pacotes de chat, não inteiramente** — pelo achado 1: 86 referências cruzadas por pacote
mandam abrir um arquivo que ali não existe.

## A ressalva aberta: `conhecimento/` e as subpastas

O implementador deixou a ressalva honestamente e fez certo em não afirmar nada. **Medi a metade que
dá para medir hoje, e ela passa:** achatado, cada pacote de chat vira **dez arquivos de nome
distinto** — `guia-do-autor.md`, `modelo.html`, `exemplo.html`, `contrato.json`, `codigo.html`,
`componentes.html`, `ifusp.html`, `index.html`, `matematica.html`, `muitos-blocos.html`. **Nenhuma
colisão de nome.** Então um upload que achate perde o *caminho*, nunca um *arquivo*.

**Há algo a fazer hoje? Não, e a razão é mais forte do que "não deu tempo".** Nem o Projeto do Claude
nem o GPT personalizado expõem um sistema de arquivos ao modelo: o conhecimento é recuperado por nome
e por conteúdo, e `especime/index.html` não "resolve" nos dois casos, com ou sem subpasta preservada.
O que decide se o leitor acha o arquivo é o **nome**, e o nome está garantido e livre de colisão — é
o que acabei de medir. O resto é medição de produto, e medição de produto sobre um pacote que ainda
não pode ser publicado (a tag da CDN não resolve) mede o ambiente errado. **É mesmo de medir antes de
publicar**, e o plano fez bem em declarar isso fora de escopo.

Uma coisa barata que cabe junto dessa medição, e não antes: o arquivo de instrução de cada pacote de
chat nomear os arquivos de conhecimento como o leitor vai vê-los. Hoje ele diz "o contrato que o
validador lê e os seis decks do espécime" sem nomeá-los.

As outras duas ressalvas do despacho B continuam válidas e não são regressão deste branch: os decks
do acervo são legíveis como fonte e não abríveis como slides (tag da CDN, fase 3), e o teto de
arquivos de conhecimento de um GPT personalizado não foi verificado — com o pacote em 10 arquivos.

---

# 4. O que ficou obsoleto por este branch

Os seus dois restos do despacho C já foram fechados por `282e3ab` (o README sobre o marco 7 e o
marcador vazio dentro dos resultados do roteiro). Varri o que descreve o estado anterior e achei
**cinco** coisas a mais, três delas deste branch e duas herdadas.

| onde | o que diz | o que é |
|---|---|---|
| `tests/aceite/roteiro.md:45` | "o `SKILL.md`, os onze `references/` e os dois `assets/`" | o pacote tem **21** arquivos, não 14 — **Important 2** |
| `docs/…/2026-09-14-aula-usp-design.md:709-711` | as três linhas descrevem `references/`/`conhecimento/` sem o contrato e sem o espécime | **Important 3** |
| `README.md:21` | "**464 unitários**" | são **471** — **Minor 4** |
| `guia/72-artifact-claude.md:56` e `guia/73-chatgpt.md:13` | "o guia inteiro, o modelo e a aula-exemplo" | os dois arquivos de **instrução** foram atualizados; os dois **capítulos do guia** que dizem o mesmo, não — **Minor 5** |
| `AGENTS.md:72` | `tests/unit/guia.test.mjs:27` | o `test()` está na **28** — **Nit 7** |

O que **não** está obsoleto, e conferi um a um: `AGENTS.md:73` ("46 arquivos" — medi 46);
`AGENTS.md:71-72` (os gerados e seus marcadores); os comentários "a segunda/terceira das quatro
tabelas da spec 5.6" em `build/guia.mjs` (as quatro da spec continuam quatro; a de limites é a
quinta, e o cabeçalho do arquivo diz isso); os outros sete ponteiros `arquivo:linha` do `AGENTS.md`;
e as observações do Codex no roteiro ("as mesmas catorze arquivos"), que são registro do marco 7 e
não se tocam — Ruling 2.

---

# Achados

## Important

### I1 — O reconhecedor não vê nome nu de arquivo, e 172 citações mortas seguem nos pacotes de chat

Seção 1. O corte "dois segmentos ou mais" está justificado contra falso positivo **de pasta**
(`img/`, `dist/`), e descarta junto o **nome nu de arquivo**, que é a convenção de referência cruzada
do guia. Nos dois pacotes em que o guia é um arquivo só, **86 por pacote** não existem. A guarda
reporta zero e o `AGENTS.md` passou a citá-la como "a demonstração mais nítida" de guarda de
propriedade — a frase fica, a medida precisa de asterisco.

**Conserto:** aceitar também `arquivosDoGuia()` como citação. Medido: +258 conferidas, 172 mortas,
**zero falso positivo**. Aí a guarda fica vermelha e força a decisão de prosa — reescrever a
referência cruzada para seção quando o guia vira um arquivo (`guiaNumArquivo` já sabe qual capítulo é
qual), ou dizer no cabeçalho do arquivo único que os capítulos citados são seções dele. Os dois são
mecânicos e guardáveis.

### I2 — O roteiro de aceite descreve a condição com o pacote anterior

`tests/aceite/roteiro.md:45`, em "A condição, que é o que o aceite mede": o agente tem
"o `SKILL.md`, os onze `references/` e os dois `assets/`". São 21 arquivos agora — faltam
`contrato/contrato.json` e os seis decks de `especime/`. E a frase seguinte, "Nada mais deste
repositório. Nem `guia/`, nem `especime/`, nem `exemplos/`", ficou em contradição literal com o
pacote, que passou a levar `especime/`.

**Por que importa mais do que parece:** uma próxima rodada do aceite montada por essa seção à risca
monta o pacote **de antes deste branch**, e mede como se ele não tivesse acontecido. A seção fica
acima do divisor `# Resultados`, então a Ruling 2 permite o conserto — e o próprio despacho C provou
que a fronteira é respeitável (sete linhas acrescentadas, resultados intocados).

### I3 — A spec 10.2 descreve os pacotes sem o acervo

`docs/superpowers/specs/2026-09-14-aula-usp-design.md:709-711`. O `AGENTS.md:5` diz: "A spec é a
autoridade … Discordância entre ela e este arquivo é defeito num dos dois — **resolva, não escolha em
silêncio**." O branch mudou o entregável e deixou a autoridade descrevendo o estado anterior; a
decisão está no plano e no ledger, e em nenhum dos dois lugares que um leitor futuro consulta.

**Conserto:** uma oração em cada uma das três linhas da tabela.

## Minor

### m4 — `README.md:21` ainda diz 464 unitários
São 471 (medido duas vezes). O último commit do branch mexeu no README para o marco 7 e passou pela
linha de baixo. `38 arquivos` e `202 de integração (22 arquivos)` continuam certos.

### m5 — Os dois capítulos do guia que descrevem o conhecimento ficaram para trás
`guia/72-artifact-claude.md:56` e `guia/73-chatgpt.md:13` seguem dizendo "o guia inteiro, o modelo e
a aula-exemplo". O branch atualizou `guia/pacotes/projeto-claude.md` e `guia/pacotes/gpt-instrucoes.md`
— os arquivos de **instrução** — e não os dois **capítulos** que descrevem a mesma coisa, e que
viajam dentro dos três pacotes. Subestima o que o leitor tem à mão, que é o oposto do que este branch
quis fazer.

### m6 — A guarda do `acao` cobre só as 20 regras de `limites.js`
Fora dela, duas regras implementadas leem `contrato.limites` e citam os números dela no `acao`, sem
guarda: `estrutura.blocos` (2 e 8, de `blocos.min` e `blocos.maxFileira`) e `estrutura.nome-curto`
(10, de `abertura.h2.caracteresSemDataCurto`). As duas corretas hoje; as duas expostas exatamente ao
defeito que o aceite pagou. O espião já escrito funciona nelas sem linha nova.
Fora do alcance por outra razão, e registrado sem proposta: `vocabulario.amarelo-svg` (4 px) e
`vocabulario.azul-svg`/`composicao.azul-pequeno` (32 px) citam números que são **constantes no fonte
da regra** e não estão no contrato — duas verdades mais velhas que este plano; e
`recursos.diagrama-grande` (15) é de fase 2 e não tem implementação.

## Nit

### n7 — `AGENTS.md:72` aponta uma linha deslocada
`tests/unit/guia.test.mjs:27` é o `const contrato = …`; o `test()` está na 28. Quem deslocou foi o
`c3ca048` deste branch, ao acrescentar `tabelaDeLimites,` à lista de imports. Os outros sete
ponteiros `arquivo:linha` do `AGENTS.md` conferi e estão certos.

### n8 — O piso de 100 da guarda de caminhos tem folga de um pacote de chat
149 conferidas hoje: 40 + 40 + 0 + 69. O sumiço de **um** pacote de chat inteiro (40) deixaria 109 e
passaria pelo piso. O de dois (80 → 69) ou o da skill (69 → 80) não passam. Não é buraco de verdade —
a guarda de igualdade e a guarda 9 pegam o pacote que sumiu por outros dois caminhos —, mas o piso é
menos apertado do que o "≥ 100" sugere.

### n9 — `apontar` troca forma-pasta por arquivo, e nada guarda o sentido da frase
`exemplos/descida-do-gradiente/` vira `assets/exemplo.html`: uma pasta vira um arquivo. A única
ocorrência hoje lê bem ("A aula-exemplo — `assets/exemplo.html` — é uma aula inteira"), e a guarda 6
confere a **mecânica** da troca, não o sentido do que sai. Uma frase futura do tipo "a pasta
`exemplos/descida-do-gradiente/` tem o index e as imagens" sairia como "a pasta
`assets/exemplo.html`" com tudo verde.

---

# O que o branch acertou, e que vale registrar

- **O espião de `contrato.limites`.** Medir que limites uma regra lê, em vez de escrever o mapa, é o
  antídoto exato para a doença que este plano trata. Ele já generaliza para o achado m6.
- **A terceira guarda revelou algo mais fundo que o diagnóstico do plano:** `limites.titulo` mede
  três limites, não um. A regra não estava sem número — ela tem três, e por isso não podia citar um.
  O plano teria "consertado" o contrato; a medição mostrou que não havia o que consertar.
- **A tabela `PACOTES_COM_GUIA` como verdade única** do par (arquivo, caminho no pacote), lida por
  quem grava os bytes **e** por quem reescreve a citação. É o que impede as duas verdades que o
  branch inteiro combate, aplicado ao próprio gerador.
- **Os pisos anti-vacuidade nas sete guardas**, e os dois da guarda do `acao` em particular.
- **Cinco inversões, todas reprodutíveis** com os números relatados. Isso é raro e vale dizer: o
  ledger e os três despachos descrevem o que aconteceu, não o que se esperava que acontecesse.

---

# O que foi feito depois desta revisão

A revisão devolveu **0 Critical, 3 Important, 3 Minor e 3 Nit**. **Os nove foram corrigidos**, mais
dois desvios de spec que ela deixou nomeados para decisão. Verificação final: **472 testes unitários
e 202 de integração, zero pulos.**

## O achado que justifica ter perguntado "o que a guarda NÃO pega"

O **I1** é o mais fino deste trabalho, e só apareceu porque o despacho da revisão pediu
explicitamente que se procurasse o **falso negativo** — não o defeito, mas o que a guarda deixa de
olhar enquanto se anuncia como completa.

O reconhecedor de citações exigia dois segmentos ou mais. O corte foi justificado, e bem, contra
falso positivo **medido**: `img/` aparecia em 8 arquivos e `dist/` em 4. Mas um corte é uma
fronteira, e toda fronteira tem dois lados. O lado não medido descartava o **nome nu de arquivo** —
que é como o guia se refere aos próprios capítulos — e nos dois pacotes de chat, onde o guia vira um
arquivo só, isso deixava **86 citações mortas em cada um. 172 no total.**

Os números, medidos e reproduzidos:

| reconhecedor | conferidas | mortas |
|---|---|---|
| o anterior (exigia barra) | 149 | 0 |
| com nome nu, antes do conserto | 407 | **172** |
| com nome nu, depois | 235 | **0** |

**A regra que fica: ao estreitar um teste para evitar ruído, meça também o que o estreitamento passou
a ignorar.** É o mesmo formato da lição do marco 5c, quando afrouxar a tolerância do teste visual
engoliu uma mudança de produto real — lá era um limiar, aqui um reconhecedor, e a assimetria é a
mesma.

## A guarda passou a dizer o que faz

Junto do alcance novo veio uma exigência: **o título da guarda tem de descrever o que ela cobre.**
Uma guarda que se anuncia como "todo caminho citado dentro do pacote existe dentro do pacote" e tem
falso negativo é pior que uma guarda modesta — ela **certifica o que não olha**.

E a rodada acrescentou um **piso por pacote**, que ninguém pediu e que fecha um buraco meta:
*"leva o guia e não teve uma única citação conferida"*. Sem ele, a guarda poderia checar zero coisas
num pacote e continuar verde.

## Mais quatro demonstrações da mesma lição

Este trabalho reproduziu, com implementadores e mecanismos diferentes, o que o marco 6b havia
descoberto: **a guarda de regerar-e-comparar fica verde com o gerador piorado.** Aconteceu ao filtrar
um limite para fora da tabela, ao esvaziar o acervo do pacote, ao desligar a reescrita de ponteiros,
e ao trocar o texto de exemplo do modelo. Em todas, só a guarda de **propriedade** caiu.

A lição estava no `AGENTS.md` desde o 6b. Agora tem reproduções independentes feitas por quem a
estava aplicando pela primeira vez — que é a diferença entre uma lição registrada e uma estabelecida.

## Dois desvios de spec, os dois criados por este trabalho e os dois corrigidos

A decisão de o pacote levar `contrato.json` e o espécime divergia da spec em **dois** lugares: a
**10.2**, que descreve o conteúdo dos pacotes, e a **3.4**, que lista as fontes do gerador sem
`especime/`. As duas foram corrigidas para refletir o que o sistema faz, e o motivo está nos commits:
os arquivos entram para fechar achados **medidos** do aceite do marco 7 — 8 citações do contrato que
eram falsas e 33 ponteiros mortos para o espécime.

## O que fica sabido e sem conserto

- **Um agente sem Chrome continua sem ver o que escreveu.** O caminho documentado — o PDF do `build`
  — depende do Chrome, e era exatamente o ambiente do Codex no marco 7. Sem ele sobra a lista do
  validador com três dos quatro grupos. Se falta capacidade na CLI, é achado para plano próprio.
- **Nos pacotes do Claude e do GPT, os caminhos dependem de o produto preservar subpastas** ao subir
  `conhecimento/`. Não verificado, em nenhum dos dois sentidos. **Medir antes de publicar o GPT.**
- `limites.metadado` lê `contrato.metadados`, não `contrato.limites`: está em `limites.js` pelo nome
  e fica fora da guarda do `acao` por construção.
- Cinco frases do guia dizem "este arquivo" querendo dizer "este capítulo". Anteriores a este
  trabalho, nenhuma presa a uma citação.

## Verificação final

- `npm test`: **472/472**, zero pulos · `npm run test:integracao`: **202/202**
- `npm run guia` e `aula-usp pacotes` sem diff
- guarda de caminhos verde **com o alcance novo**: 235 conferidas, zero mortas
- os oito alvos pelos dois comandos, sem regressão: 15, 11, 9, 15, 6, 12, 6 e 11 páginas
