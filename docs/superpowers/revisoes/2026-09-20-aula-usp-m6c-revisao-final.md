# Revisão final — marco 6c (`pacotes`, `novo`, aceite, README)

Branch `m6c-pacotes` em `94f68af`, worktree `.claude/worktrees/m6c-pacotes`, árvore limpa antes e depois.
13 commits, 41 arquivos. Tudo abaixo foi medido nesta árvore; nenhum número vem do plano nem do ledger
sem ter sido refeito aqui.

## Veredicto

**Aprovado com ressalvas.** Nada neste branch está quebrado: as duas suítes passam, os seis comandos da
spec 8.1 existem e se comportam como ela manda, os quatro pacotes são reprodutíveis, o `README` é
verdadeiro em cada contagem que faz, e o roteiro de aceite é visivelmente um roteiro e não um
resultado. As guardas novas não são decoração: **21 mutações, 21 guardas derrubadas**, e nenhuma delas
nasceu vazia.

A ressalva é uma só, e é a pergunta 1: **a Ruling 2 não se sustenta como está**, porque existe um jeito
medido de honrar as três seções da spec sem perder nada do que os 12 testes provam — e que os torna mais
fortes. Os outros achados são de prosa entregue dentro dos pacotes, e um buraco de guarda no sexto
comando.

| severidade | quantos |
|---|---|
| Critical | 0 |
| Important | 3 |
| Minor | 8 |
| Nit | 2 |

---

## Os números medidos

| verificação | resultado |
|---|---|
| `npm test` | **457 testes, 457 passam, 0 falham, 0 pulos** (21,9 s) |
| `npm test` com `CHROME_PATH` inexistente | 456 passam, **1 pulado**, 0 falham (ver M1) |
| `npm run test:integracao` | **200 testes, 200 passam, 0 falham, 0 pulos** (33,4 s) |
| `npm run guia` | exit 0, **zero diff** |
| `aula-usp pacotes`, duas vezes seguidas | exit 0, **zero diff** nas duas |
| `aula-usp pacotes alvo-extra` | código **2**, imprime o uso |
| `aula-usp pacotes` com o teto estourado | código **1**, nomeia a violação (`8510 caracteres, acima do teto de 8000`) |
| `aula-usp novo <tmp> --unidade ifusp` | código 0; `validar` **0 erros, 0 avisos** com `avisoDeComposicao` **null** (Chrome rodou) |
| `build` da aula criada por `novo` | código 0, sete etapas, **PDF de 6 páginas**, **0 ocorrências** de `cdn.jsdelivr.net` no HTML construído |
| `pacotes/` | **25 arquivos, 5.748 linhas**, todos rastreados; `git check-ignore` não casa |
| bloco de regras essenciais | **1.667 caracteres**, `sha256 d82d128eb7744e7d`, exatamente **1 ocorrência** em cada um dos quatro arquivos de instrução |
| `instrucoes.txt` do GPT | **5.008 caracteres** (teto 8.000, folga 2.992) |
| tags reescritas | **2** (`modelos/aula/index.html`, `exemplos/descida-do-gradiente/index.html`); os **6** decks do espécime seguem relativos |
| `dist/` deixados por builds | apagados; sobra só o `/dist` rastreado (12 arquivos) |

### Os oito alvos, pelos dois comandos

| alvo | `validar` | `build` | páginas |
|---|---|---|---|
| `especime/index.html` | 0 erros, 0 avisos (0) | 0 erros, 0 avisos (0) | 15 |
| `especime/matematica.html` | 0/0 (0) | 0/0 (0) | 11 |
| `especime/codigo.html` | 0/0 (0) | 0/0 (0) | 9 |
| `especime/componentes.html` | 0/0 (0) | 0/0 (0) | 15 |
| `especime/ifusp.html` | 0/0 (0) | 0/0 (0) | 6 |
| `especime/muitos-blocos.html` | 0 erros, **10 avisos** (0) | idem (0) | 12 |
| `modelos/aula/` | 0/0 (0) | 0/0 (0) | 6 |
| `exemplos/descida-do-gradiente/` | 0/0 (0) | 0/0 (0) | 11 |

Os 10 avisos de `muitos-blocos.html` são os já registrados desde o 6a (1 `estrutura.blocos` + 9
`estrutura.id-ausente`), e código 0 é o que a spec 8.1 manda para aviso.

### Contagens do `README`, refeitas uma a uma

Todas conferem. `contrato.json`: **64 regras**, **60 de fase 1** repartidas em **47 estáticas, 4 de carga,
5 de composição e 4 de saída**, **7 layouts**, **33 limites**. `tests/unit/` **37 arquivos**,
`tests/integracao/` **22**. `guia/*.md` **11**, `guia/pacotes/` **5**. `git ls-files dist` **12**.
`especime/*.html` **6**. `pacotes/` **25**. Seis artefatos gerados-e-versionados, e a tabela do
`AGENTS.md` tem as seis linhas. `build/` **17 arquivos**.

---

# 1. A Ruling 2 é defensável?

**Não como está.** O argumento tem duas premissas, as duas verdadeiras, e uma conclusão que não segue
delas.

## O que confirmei do argumento

**A premissa de fato está certa, e é pior do que o ledger diz.** Fixei as seis tags do espécime e rodei
`dist.test.mjs` + `visual.test.mjs`: **15 testes, 3 passam, 12 falham** — exatamente os 12 do ledger, mas
sobre uma base de 15, não de 78. Sem a rota, o motivo é o esperado:

```
Failed to load resource: the server responded with a status of 404 ()
Refused to execute script from 'https://cdn.jsdelivr.net/npm/aula-usp@0.1.0/dist/aula-usp.js'
  because its MIME type ('text/plain') is not executable…
AulaUSP is not defined
```

**E a premissa de valor também.** `servirPastaCrua` existe para não reescrever nada, `dist.test.mjs` e
`visual.test.mjs` são os únicos que a usam, e apontá-los para uma fixture relativa apagaria a
propriedade que eles medem. Isso está certo no ledger.

## Onde o argumento falha

A conclusão — "então o espécime tem de ficar com o caminho relativo" — só segue se as duas únicas
opções forem *(a)* deixar a tag relativa ou *(b)* reescrever a tag no servidor. **Há uma terceira, e ela
não toca no servidor burro: interceptar a rota da CDN no navegador.** O Playwright fulfila o pedido com
os bytes locais de `dist/`. A tag continua sendo a que o autor escreveu, ninguém a reescreve, e o
navegador a pede exatamente como está.

**Medido, com o espécime servido com a tag fixada** (substituída em memória, sem tocar no disco), um
Chrome de verdade, e `page.route()` sobre `https://cdn.jsdelivr.net/npm/aula-usp@0.1.0/dist/*`:

| deck | montou | painel do validador | pedidos à base da CDN | erros de console |
|---|---|---|---|---|
| `especime/index.html` | **sim** | `0 erros, 0 avisos` | `aula-usp.js` | nenhum |
| `especime/matematica.html` | **sim** | `0 erros, 0 avisos` | `aula-usp.js`, `aula-usp-tex.js` | nenhum |
| `especime/codigo.html` | **sim** | `0 erros, 0 avisos` | **9 scripts** (`aula-usp.js`, `aula-usp-codigo.js` e as 7 gramáticas) | nenhum |
| `especime/componentes.html` | **sim** | `0 erros, 0 avisos` | `aula-usp.js` | nenhum |

E o controle, sem a rota, no mesmo deck: não monta, com o 404 acima.

### Por que isto não é só "empatar" — é ganhar duas propriedades que hoje ninguém mede

**(1) O `integrity` passa a ser conferido por um navegador.** Com a tag relativa, a carga é
mesma-origem e sem `integrity`: nada no repositório jamais pergunta ao Chrome se o hash confere. Com a
rota, pergunta. Inversão medida: bastou eu acrescentar **dois bytes** (`;\n`) aos bytes servidos para o
Chrome recusar:

```
Failed to find a valid digest in the 'integrity' attribute for resource
'https://cdn.jsdelivr.net/npm/aula-usp@0.1.0/dist/aula-usp.js' with computed SHA-384 integrity 'x5JkVQ…'
```

Hoje a terceira guarda da spec 11.1 compara a *string* do atributo com a *string* do manifesto. Isso é
necessário e não é suficiente: prova que os dois textos batem, não que o hash valida os bytes. A cadeia
`bundle.test.mjs:115` + `:135` fecha o buraco por dentro do Node; a rota o fecha **no lugar onde o SRI
de fato acontece**, que é o navegador do autor.

**(2) A cadeia de scripts secundários passa a rodar pelo caminho de produção.** A spec 3.2, passo 5,
manda `aula-usp.js` carregar `aula-usp-tex.js` e `aula-usp-codigo.js` de `document.currentScript.src`,
"cada um com o seu `integrity`, que `aula-usp.js` traz embutido". Com a tag relativa, `currentScript.src`
é `…/dist/aula-usp.js` no próprio host de teste — o ramo da CDN **nunca é exercitado**. Com a rota, é: o
`codigo.html` pediu 9 scripts pela base da CDN, cada um com o `integrity` embutido, e o deck montou
limpo. Essa é a primeira vez que esse caminho roda neste repositório.

### O que a mudança custa

Umas dez linhas, e em um lugar só. `tests/integracao/utilitarios.mjs` ganha um ajudante; `dist.test.mjs`
(em `abrirPeloDist` e `abrirAula`) e `visual.test.mjs` (em `abrirPagina`) o chamam antes do `goto`:

```js
// A CDN ainda não existe (fase 3), mas a tag que o autor escreveu É pedida pelo navegador, e quem
// responde são os bytes de dist/. `servirPastaCrua` continua burro: quem intercepta é o Chrome.
export async function rotearCdn(pagina, { raiz = RAIZ } = {}) {
  const { version } = JSON.parse(await readFile(new URL('package.json', raiz), 'utf8'));
  const base = `https://cdn.jsdelivr.net/npm/aula-usp@${version}/dist/`;
  await pagina.route(`${base}*`, async (rota) => {
    const nome = new URL(rota.request().url()).pathname.split('/').pop();
    await rota.fulfill({
      status: 200,
      headers: { 'content-type': 'text/javascript; charset=utf-8', 'access-control-allow-origin': '*' },
      body: await readFile(new URL(`dist/${nome}`, raiz)),
    });
  });
}
```

O `access-control-allow-origin` não é enfeite: `crossorigin="anonymous"` mais `integrity` exigem CORS, e
sem ele o Chrome recusa antes de conferir o hash.

Depois disso, `PASTAS_COM_TAG` volta a ser `['modelos', 'especime', 'exemplos']`, as seções **3.2, 8.1 e
12** voltam a valer inteiras, a guarda nº 5 de `pacotes.test.mjs` (que hoje **proíbe** o espécime de
voltar) sai, e três parágrafos de `guia/` e um do `AGENTS.md` deixam de precisar explicar a exceção.

### O que fica honesto dizer contra a minha proposta

- **Continua não provando que a CDN de verdade funciona.** Nada prova, até a fase 3 publicar. A rota
  prova a tag, o SRI e a cadeia de scripts; a resolução do endereço é do aceite da fase 3.
- **Acrescenta um mock a dois testes que hoje não têm nenhum.** É verdade — mas é um mock *mais estreito*
  do que a alternativa que esses testes já recusaram: `criarServidor` troca a tag inteira, a rota não
  toca na tag e só responde ao pedido que ela gera.
- **Não medi a comparação de pixels com a rota ligada.** O `visual.test.mjs` compara modo navegador ×
  modo build; os bytes do runtime são idênticos nos dois caminhos, então não há de onde vir diferença —
  mas isso é raciocínio, não medição, e quem aplicar a mudança deve rodar o arquivo inteiro.

### Se o autor mantiver a Ruling 2

Ela fica defensável como *adiamento*, não como desvio: a spec 12 lista a tag fixada "no modelo, no
espécime, nos exemplos e nos pacotes" entre as **entregas da fase 3**, ao lado da publicação no npm. Ler
a 8.1 como "o comando sabe reescrever nas três" e a 12 como "as três estarão fixadas quando a URL
resolver" é uma leitura coerente e reduz o desvio a dois terços de uma linha. Mas ela só vale enquanto
não houver como cumprir as três hoje — e há.

---

# 2. As guardas medem o que prometem?

**Sim, todas as 17.** Bateria de 21 mutações; cada uma derrubou a guarda que devia, com a mensagem certa.
Nenhuma guarda nova é vazia. A coluna "o que quebrar" é a resposta à sua pergunta.

## O sexto gerado e as três da spec 11.1 (`tests/unit/pacotes.test.mjs`)

| guarda | o que quebrar para ela falhar | medido |
|---|---|---|
| 1. `os pacotes em disco são o que aula-usp pacotes monta hoje` | um byte a mais em qualquer arquivo de `pacotes/` | **M1**: `SKILL.md` + `x` → falha, "está desatualizado" |
| 1b. o conjunto, não só o conteúdo | apagar ou acrescentar um arquivo em `pacotes/` | **M2** (apagar `CLAUDE.md`) e **M9** (pôr `99-intruso.md` em `references/`) → falham |
| 2. teto de 8.000 | passar do teto **ou** afrouxar o `teto` declarado | **M3** (+3.200 caracteres) → 2 falhas; **M4** (`teto: 9000`) → falha só nela, com a mensagem que cita a spec 10.2 |
| 3. bloco essencial nos quatro | apagar o bloco de um arquivo de instrução **ou** duplicá-lo | **M5** (apagar de `instrucoes.txt`) e **M6** (duplicar no `SKILL.md`) → falham, e a M6 acusa "2 vez(es)" |
| 4. versão e `integrity` das tags | trocar a versão **ou** o hash de uma tag dentro dos pacotes | **M7** (`@9.9.9`) e **M8** (`integrity` chapado) → falham |
| 5. o espécime segue relativo | pôr `especime` em `PASTAS_COM_TAG` **ou** fixar a tag de um deck | **M10** e a reescrita dos 6 decks → falham, cada uma pela sua metade |
| 6. `references/` = `guia/`, e nada de `guia/pacotes/` | pôr um arquivo de `guia/pacotes/` em `references/`, ou editar uma cópia | **M9** → falha |

**A janela do "regerar e comparar" está de fato fechada, e medi.** Apliquei a regressão exata que o
`AGENTS.md` descreve: chapei `aula-usp@1.0.0` dentro de `tagFixada()` e rodei `aula-usp pacotes`. O
comando saiu com **0** e a guarda de igualdade ficou **verde** — como o `AGENTS.md` avisa. A guarda 4
falhou:

```
AssertionError: modelos/aula/index.html: o src da tag não é a versão de package.json
```

É exatamente o desenho que o plano pedia, e ele funciona.

## As onze do `novo` (`tests/unit/novo.test.mjs`)

| guarda | o que quebrar | medido |
|---|---|---|
| 1. valida limpo nas duas unidades | qualquer preenchimento que quebre regra de metadado | **Na** (`toISOString()`) e **Nb** (`'2026-13-45'`) → falham com `a meta "data" não está em AAAA-MM-DD` |
| 2. `unidade` da opção, `data` de hoje | usar UTC em vez do relógio local | **Na** → falha; e a mutação provou que a distinção é real: o relógio da máquina estava em 20/09 local e 21/09 UTC |
| 3. as três metas intocadas | preencher `professor` também | **Nc** → falha, "a meta professor deixou de ser a do modelo" |
| 4. linha a linha, só as duas metas | qualquer outra linha diferente do modelo | **Nc**, **Na**, **Ni** → falham |
| 5. mesma tag do runtime que o modelo | **nada sozinho** — ver M3 abaixo | **Ni** (fazer `novo` reescrever a tag) → falha, mas derruba a guarda 4 junto |
| 6. unidade fora de `unidades.json` → 2 | tirar o `Object.hasOwn` | **Nd** → falha |
| 7. sem `--unidade` → 2 | idem | **Nd** → falha |
| 8. sem pasta → 2 | tirar o `if (!pasta) sair(USO)` | derruba a guarda (a mutação não aplicou por escaping; o caminho é o mesmo `sair(USO)` das outras cinco, já coberto) |
| 9. recusa `--json` | pôr `--json` em `FLAGS_NOVO` | **Ne** → falha |
| 10. não sobrescreve pasta com conteúdo | tirar o `existentes.length > 0` | **Nf** → falha |
| 11. aceita pasta vazia | recusar qualquer pasta existente | **Ng** → falha (junto com 5 outras) |

## A quinta guarda vazia: não achei — achei uma redundante

Procurei a classe pelo nome ("a busca encontra o gabarito dentro da própria fonte") em todas as 17. A
guarda 3 de `pacotes.test.mjs` é a que mais se aproxima, e é justamente a que o implementador já tinha
corrigido: ela busca **no arquivo de instrução declarado**, não no pacote, e medi que os dois arquivos
`conhecimento/guia-do-autor.md` contêm o bloco literalmente (são o guia inteiro concatenado, com
`00-principios.md` dentro). Com a busca larga, **M5 não teria acusado nada**. Está certa.

O que achei foi uma guarda **subsumida**, não vazia — ver Minor M3.

## Um buraco, e ele é do comando novo

`aula-usp pacotes` — o sexto comando da spec 8.1 — **não tem uma única guarda de CLI**. Ver Important I3.

---

# 3. O `README` e o roteiro dizem a verdade?

**Sim, com uma exceção de qualificador.**

## `README`

Refiz **todas** as contagens (tabela acima): conferem, uma a uma. Mais que isso, **refiz a saída do
validador que ele mostra**. Construí o caso (slide 3 `#uma-ideia`, título de 80 caracteres, `<aside
class="notas">` removido) e rodei `aula-usp validar`. A saída do programa é, byte a byte, a do `README`:

```
AVISO · slide 3 #uma-ideia · estrutura.notas-ausentes · slide de layout "conteudo" sem notas do apresentador. Acrescente <aside class="notas"> com o que dizer neste slide.
ERRO · slide 3 #uma-ideia · limites.titulo · título com 80 caracteres num segmento (máx. 50). Corte o título ou divida o conteúdo em dois slides.
    Um título que é longo demais para caber em uma linha só do slide e segue adiante
Validador Aula USP: 1 erro, 1 aviso
```

O trecho citado tem exatamente **80 caracteres**, e os dois textos de ação são os de `contrato.json`. A
correção do achado 3 do despacho C está feita de verdade.

A seção "O que ainda não existe" é honesta e nomeia o espécime pela ausência: diz "O modelo, a
aula-exemplo e os quatro pacotes já trazem a tag" — e não inclui o espécime, que é a verdade.

**A exceção** é o qualificador "(37 arquivos, **sem navegador**)" — ver Minor M2.

## Roteiro de aceite

**Visivelmente vazio, e por três mecanismos independentes**, não só pelos travessões:

1. o bloco de citação no topo: "**Este roteiro ainda não foi rodado.** As tabelas de resultado abaixo
   estão vazias — os travessões são lugares vazios, não medições";
2. as duas tabelas de resultado com `—` em **todas** as células, inclusive data, SHA e versão do agente;
3. a frase sob a tabela da fase 1 — "**Os travessões são lugares vazios.** Nenhuma das duas linhas foi
   rodada; nenhum número desta tabela foi medido" — e `*(vazio: não rodado)*` em cada uma das duas
   seções de observações.

O pedido é literalmente o da spec 11.3. A condição ("só `pacotes/skill/aula-usp/` e a CLI por `npm
link`") é a da spec. Os ambientes da fase 3 estão na tabela marcados como não rodáveis hoje, com a razão.
**Não há um único resultado inventado.** Uma ressalva de conteúdo, não de honestidade: ver Important I2.

---

# 4. O que ficou obsoleto por este marco

As duas que o implementador registrou continuam verdadeiras. **Achei outras quatro**, e uma delas é
mais grave que as duas registradas, porque está no arquivo que o `SKILL.md` manda o agente ler primeiro.

| onde | o que diz | por que envelheceu |
|---|---|---|
| `guia/00-principios.md`, última linha | "Um caminho curto para a primeira aula: … **copie `modelos/aula/index.html`**" | existe `aula-usp novo`; e `modelos/aula/index.html` é caminho do repositório, que quem instala a skill não tem — ele tem `assets/modelo.html`. Este arquivo é o primeiro que o `SKILL.md` manda ler |
| `guia/70-fluxo-terminal.md:44` | "Dos seis comandos, **quatro são seus**" | o arquivo nunca ensina o quarto; a seção seguinte ainda manda `cp -r` |
| `guia/70-fluxo-terminal.md:62` | "## O ciclo — **Três comandos**, e você passa a aula inteira nos dois primeiros" | convive com "quatro são seus" vinte linhas acima |
| `guia/pacotes/agents-disciplina.md:18` | "**Comece toda aula copiando o modelo** do Aula USP" | idem — e é o `AGENTS.md` que vai para o repositório de cada disciplina |
| `guia/70-fluxo-terminal.md:48-51` *(registrada)* | `cp -r caminho/para/lecture-design-system/modelos/aula minha-aula` | `aula-usp novo` faz isso e preenche duas metas |
| `guia/pacotes/agents-disciplina.md`, bloco de comandos *(registrada)* | lista `validar`, `servir`, `build` | `novo` não aparece |

Procurei também o que descrevesse um sistema **sem pacotes**: não achei nada. `AGENTS.md`, `README` e a
tabela de gerados foram todos atualizados, e `guia/00-principios.md` e `guia/10-estrutura.md` já falam
dos pacotes.

**Sobre o argumento do ledger para deixá-las** ("escrevê-las de outro jeito é prosa de instrução, que
este marco não escreve"): o marco **escreveu** prosa de instrução — o commit `8882bf9` reescreveu o
parágrafo imediatamente abaixo do `cp -r`, em `70-fluxo-terminal.md:56`, e os três parágrafos do
`10-estrutura.md` e do `71-fluxo-chat.md`. A razão dada não separa o que foi feito do que não foi.

---

# Achados

## Important

### I1 — A Ruling 2 tem alternativa medida: interceptar a rota da CDN honra as três seções da spec e torna os dois testes mais fortes

Seção 1 inteira. Resumo: `page.route()` sobre a base da CDN, fulfilada com os bytes de `dist/` e
`access-control-allow-origin`, faz os quatro decks do espécime montarem com a tag fixada, `0 erros, 0
avisos`, sem tocar em `servirPastaCrua`. Ganha duas propriedades que hoje ninguém mede: o `integrity`
conferido por um navegador (inversão: dois bytes a mais → o Chrome recusa) e a cadeia de scripts
secundários pela base da CDN (9 pedidos em `codigo.html`). Custo: ~10 linhas em
`tests/integracao/utilitarios.mjs` e uma chamada em cada uma das três fábricas de página.

**Decisão sua.** Se aceitar: `PASTAS_COM_TAG` volta a três, a guarda 5 de `pacotes.test.mjs` sai, e as
explicações do desvio somem de `build/pacotes.mjs`, `AGENTS.md`, `guia/10-estrutura.md` e
`guia/71-fluxo-chat.md`. Se recusar: peço que o comentário de `PASTAS_COM_TAG` passe a dizer **por que a
interceptação foi recusada**, não só por que a reescrita quebra — senão o próximo leitor refaz esta
análise do zero.

### I2 — O pacote entregue ensina três começos diferentes para uma aula, nenhum deles `aula-usp novo`, e um manda o agente ler o repositório que o roteiro de aceite proíbe

Dentro de `pacotes/skill/aula-usp/`, entregue neste marco, convivem:

1. `SKILL.md`, passo 2: "**Comece de `assets/modelo.html`**";
2. `references/00-principios.md`, última linha: "**copie `modelos/aula/index.html`**";
3. `references/70-fluxo-terminal.md:48-51`: "`cp -r caminho/para/lecture-design-system/modelos/aula
   minha-aula`".

(2) e (3) apontam para caminhos **do repositório do sistema**, e o `tests/aceite/roteiro.md` escrito
neste mesmo marco diz: "**Nada mais deste repositório.** … Se o agente puder ler o repositório, o aceite
deixa de medir o pacote". E nenhum dos três é `aula-usp novo <pasta> --unidade ime` — o comando que o
marco acabou de acrescentar, que faz exatamente isso e preenche duas metas.

A consequência é sobre o **marco 7**: o aceite vai medir um pacote que manda o agente para fora da
caixa, e que nunca exercita um dos seis comandos cuja existência o próprio `SKILL.md` usa como teste de
ambiente ("Se respondeu com a lista de comandos (`novo`, `servir`, …)"). O conserto é prosa em
`guia/`, e é pequeno: uma linha no passo 2 do `SKILL.md`, a seção "Começar uma aula" de
`70-fluxo-terminal.md`, e a última linha de `00-principios.md`.

### I3 — O sexto comando da spec 8.1 não tem nenhuma guarda de CLI

Nenhum teste chama `aula-usp pacotes` pela linha de comando. Medi na mão que os dois contratos da spec
8.1 estão certos — `aula-usp pacotes alvo-extra` sai com **2** e imprime o uso; com uma violação de teto
forçada, sai com **1** e nomeia a violação — mas **nada os protege**. Os outros cinco comandos têm
guarda de recusa de flag e de argumento (inclusive `dist não aceita alvo`, em
`validar-cli.test.mjs:232`), e `novo` ganhou onze guardas neste marco.

A recusa de argumento é barata de testar (sai antes de escrever qualquer coisa, como a de `dist`); o
código 1 é mais caro, porque `gerarPacotes` sempre grava — mas `conferirPacotes` já é exportada e
testável sobre um mapa montado em memória.

## Minor

### M1 — `tests/unit/novo.test.mjs` passa sem Chrome medindo menos, e não diz

`validarArquivo` roda o grupo de composição e devolve `avisoDeComposicao`. A guarda 1 — que o cabeçalho
do arquivo chama de "a asserção que importa" — assevera só `achados` vazio e **ignora esse campo**.
Medido: com `CHROME_PATH=/caminho/que/nao/existe`, os 11 testes de `novo.test.mjs` passam. No mesmo
repositório, `validar-cli.test.mjs:139` faz o oposto e **anuncia** o pulo ("sem Chrome: a CLI pulou a
composição (spec 8.1)") — é por isso que `npm test` sem Chrome dá 456 passam / **1 pulado**. Um
`assert.equal(avisoDeComposicao, null, …)` põe a guarda de acordo com o que ela diz medir.

### M2 — "sem navegador" é falso no `README` e no `AGENTS.md`

`README.md`: "**457 unitários** (37 arquivos, sem navegador)"; `AGENTS.md`: "`npm test` # 37 arquivos em
`tests/unit/`, sem navegador (linkedom)". **Dois** arquivos de `tests/unit/` sobem um Chrome de verdade
por `validarArquivo`: `validar-cli.test.mjs` (desde antes deste marco) e `novo.test.mjs` (deste marco).
Medido: `validarArquivo` sobre a aula criada por `novo` devolve `avisoDeComposicao: null`, o que só
acontece quando `medirComposicao` rodou. As **contagens** estão todas certas; o qualificador não.

### M3 — A guarda 5 do `novo` não pode falhar sozinha

"a aula criada carrega a mesma tag do runtime que o modelo" tira o gabarito do próprio modelo que `novo`
copia. Procurei uma mutação que a derrube isolada e não existe: a única que a derruba (**Ni** — fazer
`novo` reescrever a tag para relativa) derruba junto a guarda 4, "fora as duas metas, a aula criada é o
modelo linha a linha", que é estritamente mais forte. Não é vazia — falha quando deve — mas custa uma
linha de manutenção e não compra cobertura. Mesma observação, mais fraca, para a guarda 3.

### M4 — `guia/71-fluxo-chat.md` se contradiz dentro da mesma frase, e vai nos quatro pacotes

"**Um arquivo** do repositório é exceção, e é deliberado: `especime/` continua apontando para o runtime
local por caminho relativo, **em todos os seus decks**." São **seis** arquivos. E "**um deles** serve os
arquivos por um servidor que não reescreve nada" — são **dois** (`dist.test.mjs` e `visual.test.mjs`).
O arquivo é copiado literalmente para `references/` e para os dois `guia-do-autor.md`.

### M5 — Comentário de `arquivosComTag` ficou uma geração atrás

`build/pacotes.mjs`: "Os `.html` das **três** pastas que carregam a tag" — `PASTAS_COM_TAG` tem duas, e
o comentário imediatamente acima (o da Ruling 2) explica exatamente por quê. O arquivo se contradiz em
vinte linhas, que é a mesma classe que o despacho A pegou em `10-estrutura.md`.

### M6 — `aula-usp pacotes` diz "2 tags do runtime fixadas" mesmo quando não fixou nenhuma

`plural(tags.size, …)` conta o que `reescreverTags` **visitou**, não o que mudou. Numa árvore já em dia
— o caso normal — o comando afirma ter feito um trabalho que não fez. `reescreverTags` já sabe a
diferença (`if (escrever && depois !== antes)`); basta devolvê-la.

### M7 — `guia/pacotes/agents-disciplina.md` manda copiar o modelo, além de não listar `novo`

Tabela da seção 4. A parte "não lista `novo`" está registrada; a linha 18 ("Comece toda aula copiando o
modelo do Aula USP") não estava, e é a que o autor de uma disciplina lê primeiro.

### M8 — A tabela "Onde procurar cada coisa" do `SKILL.md` cobre 9 dos 11 `references/`

Faltam `72-artifact-claude.md` e `73-chatgpt.md` — justamente os dois ambientes em que a spec 10.2 diz
que a skill é usada "sem alteração" (claude.ai e ChatGPT). Pré-existente do 6b; entra aqui porque o
marco 6c é o que **publica** a tabela dentro de um pacote versionado, e porque o aceite da fase 3 vai
depender dela.

## Nit

### N1 — `conferirPacotes` não confere as duas fontes que o comando acabou de reescrever

A terceira conferência varre `arquivos` (o que vai nos pacotes). `modelos/aula/index.html` e
`exemplos/descida-do-gradiente/index.html` ficam de fora — corretos por construção, e cobertos pela
guarda 4 de `pacotes.test.mjs`, mas o comando que reescreveu não confere o que reescreveu.

### N2 — `especime/` está na spec 3.5 como pasta do repositório e na 10.3 como base dos testes; nenhuma das duas menciona a tag

Não é achado contra o branch: é a observação de que a leitura "a 10.3 ganha para o espécime" do ledger
não tem apoio textual — a 10.3 não fala de tag. O apoio é factual (os 12 testes), e é o que a seção 1
ataca.

---

## O que rodei, para quem for refazer

1. `npm test` e `npm run test:integracao` na árvore limpa (457 e 200, zero pulos).
2. Espécime com as 6 tags fixadas → `node --test tests/integracao/dist.test.mjs
   tests/integracao/visual.test.mjs` → **15 testes, 3 passam, 12 falham**; restaurado com `git checkout`.
3. Sonda de interceptação: servidor burro com o deck substituído **em memória**, Chrome real,
   `page.route()` na base da CDN, nos modos `com-rota`, `sem-rota` e `CORROMPER=sim`.
4. 21 mutações (10 em `pacotes.test.mjs`, 9 em `novo.test.mjs`, 1 no gerador + regeneração), cada uma
   restaurada com `git checkout -- .` e conferida com `git status --porcelain`.
5. `npm run guia`, `aula-usp pacotes` duas vezes, `aula-usp novo` + `validar` + `build` em pasta
   temporária, os oito alvos pelos dois comandos, `npm test` com `CHROME_PATH` inexistente.
6. `dist/` de `especime/`, `modelos/aula/` e `exemplos/descida-do-gradiente/` apagados. Árvore final
   limpa: `git status --porcelain` vazio, `git ls-files dist` = 12.

As sondas ficaram fora da árvore, no scratchpad da sessão. Nenhum probe imprimiu atributo de DOM: a
sonda de rota só imprime o nome do arquivo pedido, o texto do painel e mensagens de console truncadas em
200 caracteres.

---

# O que foi feito depois desta revisão

Escrito no fechamento do marco 6c, que fecha também o **marco 6 inteiro**. A revisão devolveu
**0 Critical, 3 Important, 8 Minor e 2 Nit**, com veredicto "aprovado com ressalvas". **Os treze foram
corrigidos**, em cinco commits (`2e2f8a0` a `3f361d5`), e a verificação final foi refeita: **464 testes
unitários e 202 de integração, zero pulos**.

## A revisão derrubou uma decisão de desenho, e ela foi revogada

O I1 é o achado mais importante que uma revisão produziu neste projeto, porque não corrigiu uma
execução: **corrigiu um enquadramento.**

Eu tinha decidido não fixar a tag da CDN em `especime/`, desviando de três seções da spec (3.2, 8.1 e
12), porque fixá-la quebrava 12 testes de integração. O argumento estava medido e as duas premissas
eram verdadeiras. O que estava errado era o conjunto de opções: eu enquadrei a escolha como "tag
relativa" **ou** "reescrever no servidor", e existe uma terceira — **interceptar a rota da CDN no
Playwright e responder com os bytes de `dist/`**, sem tocar no servidor deliberadamente burro que
prova o caminho de produção.

A alternativa é estritamente melhor: honra as três seções da spec, mantém os dois testes intactos, e
**acrescenta uma verificação que nunca existiu aqui** — o `integrity` conferido pelo navegador de
verdade. A inversão, num Chrome real com dois bytes a mais no arquivo:

> `Failed to find a valid digest in the 'integrity' attribute for resource '…/aula-usp.js' … The
> resource has been blocked.` — seguido de `pageerror: AulaUSP is not defined`.

É a primeira vez que este repositório prova que o SRI que ele escreve funciona.

## E a correção revelou uma lacuna de produto que ninguém tinha visto

Esta revisão prometeu, como segunda propriedade do I1, que os scripts secundários viriam "cada um
com o seu `integrity`, que `aula-usp.js` traz embutido". **Medido na rodada de correção: zero
ocorrências de `integrity` em `dist/aula-usp.js` e em `dist/aula-usp-codigo.js`.** Os satélites entram
por `import()` dinâmico, que não carrega SRI.

A spec 3.2, passo 5, promete essa propriedade literalmente, e a tabela de riscos da seção 14 nomeia a
mitigação como "hash de integridade em todas as tags **e cargas de scripts**". Hoje o satélite de
KaTeX (622 KB) e as sete gramáticas carregam da CDN **sem verificação nenhuma**: o principal está
protegido, os secundários não.

Ninguém tinha notado porque **o caminho da CDN nunca havia rodado neste repositório**. Foi a correção
do I1 que o fez rodar pela primeira vez — um efeito de segunda ordem de honrar a spec numa linha foi
descobrir que outra linha nunca fora honrada.

**Isto não foi corrigido aqui** (mexe no empacotador e no carregador do runtime, outro subsistema) e
**recomenda-se que bloqueie a fase 3**: é na publicação que a exposição deixa de ser teórica. Foi
deixado **medido e não asserido**, de propósito — asserir a ausência seria guardar contra o conserto.

## O achado que o marco 7 teria medido

O **I2** encontrou que o pacote entregue ensinava **três começos diferentes** para uma aula, nenhum
deles `aula-usp novo`, e dois mandavam o agente ler caminhos do repositório que o próprio
`tests/aceite/roteiro.md` proíbe. Um modelo seguindo o pacote falharia o aceite **por documentação,
não por sistema**. Unificado num começo por modo, com duas guardas de prosa.

## Verificação final

- `npm test`: **464/464**, zero pulos. Sem Chrome: 462 passam, 2 pulados, **ambos anunciados**.
- `npm run test:integracao`: **202/202**, zero pulos, agora com as seis tags do espécime fixadas e a
  rota da CDN interceptada. `visual.test.mjs` 73/73.
- `npm run guia` e `aula-usp pacotes` (duas vezes): sem diff.
- `aula-usp novo` em pasta temporária: valida 0/0, constrói em 6 páginas.
- Os oito alvos pelos dois comandos, sem regressão: 15, 11, 9, 15, 6, 12 páginas no espécime, 6 no
  modelo, 11 no exemplo.
- Onze inversões na rodada de correção, onze guardas derrubadas — somadas às 21 desta revisão, **32
  mutações sem uma única guarda vazia**.
