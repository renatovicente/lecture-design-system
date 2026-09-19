# Revisão final do branch — marco 4c (carga + composição), que fecha o marco 4

Branch `m4c-composicao`, 7 commits, `6ae4964..34f2373`, 46 arquivos.
Revisor: opus, worktree `.claude/worktrees/m4c-composicao`, nada alterado na árvore (sondas em `/tmp`).

**Veredito: pronto para merge — com correções.** Uma Critical reproduzida ao vivo, quatro Important, cinco Minor. Nada de arquitetura está errado; o desenho de grupos, contexto e contrato se sustenta e fecha o marco 4.

---

## 1. Contagens que eu mesmo observei

| suíte | contagem |
|---|---|
| `npm test` | **341 tests, 341 pass, 0 fail** (19,6 s) |
| `tests/integracao/apresentador.test.mjs` | 9 / 9 |
| `tests/integracao/carregador.test.mjs` | 2 / 2 |
| `tests/integracao/codigo.test.mjs` | 8 / 8 |
| `tests/integracao/componentes.test.mjs` | 9 / 9 |
| `tests/integracao/composicao.test.mjs` | 12 / 12 |
| `tests/integracao/demos.test.mjs` | 4 / 4 |
| `tests/integracao/impressao.test.mjs` | 6 / 6 |
| `tests/integracao/layouts.test.mjs` | 11 / 11 |
| `tests/integracao/matematica.test.mjs` | 6 / 6 |
| `tests/integracao/motor.test.mjs` | 11 / 11 |
| `tests/integracao/paineis.test.mjs` | 7 / 7 |
| `tests/integracao/painel.test.mjs` | 4 / 4 |
| `tests/integracao/validador.test.mjs` | 3 / 3 |
| **integração, 13 arquivos** | **92 / 92** |

Total observado: **433 testes verdes, nenhuma falha.** Os 341 batem com o que o ledger registra.

### A CLI sobre os seis decks do espécime

```
===== especime/index.html =====
Validador Aula USP: 0 erros, 0 avisos
[saida: 0]
===== especime/componentes.html =====
Validador Aula USP: 0 erros, 0 avisos
[saida: 0]
===== especime/matematica.html =====
Validador Aula USP: 0 erros, 0 avisos
[saida: 0]
===== especime/codigo.html =====
Validador Aula USP: 0 erros, 0 avisos
[saida: 0]
===== especime/ifusp.html =====
Validador Aula USP: 0 erros, 0 avisos
[saida: 0]
===== especime/muitos-blocos.html =====
AVISO · aula · estrutura.blocos · a aula tem 9 blocos; acima de 8 o mapa vira contador. Organize a aula em 2 a 8 blocos, cada um aberto por data-layout="abertura".
AVISO · slide 2 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
AVISO · slide 3 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
AVISO · slide 4 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
AVISO · slide 6 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
AVISO · slide 7 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
AVISO · slide 8 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
AVISO · slide 9 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
AVISO · slide 10 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
AVISO · slide 11 · estrutura.id-ausente · slide de layout "abertura" sem id. Dê à section um id curto, com letras minúsculas, números e hífens.
Validador Aula USP: 0 erros, 10 avisos
[saida: 0]
```

Os três grupos rodaram juntos nessas chamadas (há Chrome neste ambiente) e o espécime sai limpo. Códigos de saída conferem com a spec 8.1.

---

## 2. Faz o que a spec manda?

### 2.1. As nove regras da spec 9.2

| regra | spec 9.2 diz | implementação | veredito |
|---|---|---|---|
| `matematica.tex-invalido` | erro; TeX que o KaTeX não compila, com a mensagem e o trecho | `validador/regras/carga.js:8-20`; mensagem do KaTeX e trecho encurtado; `recursos.tex` vem do `compilarTex` compartilhado (`build/carregar.mjs:135-150`) e do `renderizarTex` no navegador | ✅ e melhor que o pedido: build e navegador compilam pela **mesma** função, então não podem discordar |
| `recursos.imagem` | erro; imagem ausente (build) ou que falhou ao carregar (navegador) | `carga.js:21-33`; disco em `build/carregar.mjs:113-127`, `img.complete && naturalWidth>0` em `montar/navegador.js:99` | ⚠️ ver Critical 1 |
| `recursos.demo-sem-registro` | erro; `data-demo` sem `AulaUSP.demo` correspondente | `carga.js:36-52` | ✅ |
| `recursos.demo-sem-estatico` | aviso; demo sem `img.estatico` e sem `capturar()` | `carga.js:53-67`, severidade vem do contrato | ✅ |
| `composicao.transbordo` | erro; fora da zona de conteúdo do layout **ou do palco**, no estado final | `composicao.js:107-155`; escolhe zona ou palco por `area.contains`, mede os quatro lados, e trata `PRE`/`.katex-display` por `scrollWidth` | ✅ os dois limites, e o caso de caixa que não cresce |
| `composicao.linhas-titulo` | erro; título com mais linhas renderizadas que o permitido | `composicao.js:156-170`, limite por layout (`capa.h1.linhas`, `abertura.h2.linhas`, `titulo.linhas`) | ✅ |
| `composicao.tamanho-minimo` | erro; abaixo do mínimo do papel, **com as exceções da seção 4.3** | `composicao.js:171-188`, lê `contrato.papeis.excecoes` | ✅; a Ruling 9 (não usar essa lista para geometria) está corretamente aplicada — ver 2.4 |
| `composicao.azul-pequeno` | erro; texto em `azul` abaixo de 32 px | `composicao.js:189-205` | ✅ no código; ver I3 e I4 quanto à fixture |
| `composicao.texto-no-amarelo` | erro; texto sobre `amarelo` em cor diferente de `tinta` | `composicao.js:206-224` | ✅; medido ao vivo (`rgb(0,0,238)` acusado) |

Nenhuma regra restata o contrato: severidade, ação, grupo e fase saem todos de `contrato.regras` dentro de `validador/validar.js:38-50`. O módulo de regras só produz `{slide, id, mensagem, trecho}`.

### 2.2. A tabela da spec 9.3 (qual grupo roda quando e sobre o quê)

| grupo | spec: sobre | spec: navegador | spec: build | observado |
|---|---|---|---|---|
| estáticas | o fonte, sem cromo e sem HTML renderizado | passo 3, sobre a cópia | etapa 1 | ✅ `montar/navegador.js:50-51` valida a cópia antes de `montar`; `build/validar.mjs:72` valida o `linkedom` cru |
| carga | **o fonte**, depois de carregar bibliotecas, imagens e scripts | passo 6, **depois do `load`** | etapa 1 (KaTeX no Node, disco, texto dos scripts) | ❌ no navegador: roda sobre o `document` **montado**, e **não espera o `load`** — Critical 1. No build: ✅ exatamente como descrito, com o upgrade autorizado de ler as demos da página quando há Chrome |
| composição | o documento montado e renderizado, no estado final | passo 6, depois de `montar`, da renderização e de `document.fonts.ready` | etapa 5, no Chrome headless | ✅ nos dois; `document.fonts.ready` em `navegador.js:96` e em `build/composicao.mjs:48` |
| saída | o HTML e o PDF finais | não roda | etapas 4 a 7 | ✅ não existe ainda, corretamente (marco 5) |

### 2.3. Os sete passos da spec 3.2, em ordem, contra `montar/navegador.js`

| passo da spec | onde | ordem |
|---|---|---|
| 1. estilo que esconde o corpo | `montar/carregador.js` | ✅ |
| 2. no `DOMContentLoaded`, cópia do fonte antes de qualquer alteração | `navegador.js:41` + `:50` (`document.cloneNode(true)`, documento inteiro — decisão certa, o `head` tem as metas) | ⚠️ Minor 1: as folhas de estilo já foram anexadas ao `head` no `Promise.all` de `:42-47`, antes da cópia; é o passo 4 acontecendo antes do 2 |
| 3. regras estáticas sobre o fonte | `:51` | ✅ |
| 4. injeta CSS e fontes, roda `montar` | `:52-58` | ✅ (CSS adiantado, ver acima) |
| 5. KaTeX se houver `\(`/`\[`; Shiki se houver `pre[data-lang]` | `:60-92`, só as gramáticas usadas | ✅ |
| 6. depois de scripts, imagens e fontes: carga e composição | `:93-110` | ⚠️ fontes sim, imagens **não** — Critical 1 |
| 7. inicia o motor | `:115-128` | ✅ e explicitamente depois do 6 |

O painel: `motor/paineis.js:169-176` abre sozinho só com `contar(achados).erros > 0 && !doc.fullscreenElement`; avisos vão ao console em `navegador.js:111-113`; "copiar para o chat" com o cabeçalho de `cabecalhoDe` e uma linha por achado no formato de `linhaDe` (`paineis.js:88-90`). Tudo conforme 3.2 e 9.1. O botão desabilitado fora de contexto seguro (`paineis.js:102`) é um bom toque.

### 2.4. Spec 8.1 — códigos de saída e Chrome ausente

- `bin/aula-usp.mjs:88` — `process.exitCode = erros > 0 ? 1 : 0`; **0** com avisos (confirmado no `muitos-blocos.html`: 10 avisos, saída 0).
- **2** para falha de ambiente e para engano de uso: `sair()` em `:17-20`, e a separação cuidadosa entre "não encontrei a aula" e "falha de ambiente" em `:71-77`. Verificado pelos testes `pasta sem index.html sai com 2`, `flag desconhecida`, `segundo posicional`, `caminho que não existe`.
- "Falta de Chrome não é falha: vira aviso e pula composição" — `build/composicao.mjs:31-35` devolve `{achados: null, motivo}`; `build/validar.mjs:82` transforma em `avisoDeComposicao`; `bin/aula-usp.mjs:81` imprime **no stderr** (para não sujar o `--json` do stdout) e a saída continua 0. Coberto por `CHROME_PATH inexistente: a CLI avisa no stderr e a saída continua a dos outros grupos`.
- O import dinâmico de `build/validar.mjs` e `build/servir.mjs` dentro do comando (e o teste que **proíbe** o import estático) é a razão pela qual dependência ausente vira saída 2 e não stack trace. Bem feito e bem testado.

---

## 3. O marco 4 está completo?

Medido, não conferido de memória — carregando `validador/regras/index.js` e cruzando com `contrato/contrato.json`:

- contrato: **64 regras**; 60 de fase 1, 4 de fase 2.
- implementadas: **55**, nenhuma fora do contrato, nenhuma duplicada.
- ausentes: `matematica.simbolo-fora-do-tex` (fase 1, estática) + `recursos.csv`, `recursos.dot`, `recursos.diagrama-grande`, `recursos.grafico` (fase 2) + as quatro de `saida.*` (marco 5).

Fase 1, fora do grupo de saída: 56. Implementadas: 55. **A única lacuna é `matematica.simbolo-fora-do-tex`**, exatamente como declarado, e pelo motivo declarado: ela e `saida.glifo-ausente` leem `validador/cobertura.json`, que `aula-usp dist` gera (spec 9.3, último parágrafo). Confirmo o adiamento como correto — implementá-la agora exigiria inventar a fonte de verdade dos glifos antes do comando que a produz.

Nada mais sumiu em silêncio entre 4a, 4b e 4c: existem **55 pastas de fixture**, uma por regra implementada, e `tests/unit/validador.test.mjs:366-371` falha se uma regra implementada não tiver `ruim.html` e `:349-353` falha se uma regra do grupo de composição não tiver o par. A varredura também cobre o caminho inverso (pasta sem regra).

---

## 4. Findings

### Critical

**C1 — `recursos.imagem` acusa a marca do próprio sistema quando a imagem ainda está baixando.**
`montar/navegador.js:93-110` (o passo 6) espera `document.fonts.ready` e **não** espera o evento `load`. A spec 9.3 é literal: o grupo de carga roda no "passo 6, depois do `load`". Além disso o grupo roda sobre o `document` **já montado** (`navegador.js:107-108`), e não sobre a cópia `fonte` de `:50`, enquanto a coluna "sobre" da spec 9.3 diz "o fonte". As duas coisas se somam: `montar()` injeta `<img class="marca-unidade">` **dentro da `section`** (`montar/cromo.js:66` e `:76`, anexados em `montar/montar.js:74` e `:96`), o download dessas imagens só **começa** no `montar`, milissegundos antes do passo 6, e `recursos.imagem` (`validador/regras/carga.js:21-33`) só pergunta `img.complete && naturalWidth > 0`.

Reproduzido ao vivo (Chrome, `especime/index.html` servida por `build/servir.mjs`, rota de imagem atrasada em 1,2 s — cache frio ou CDN lenta são exatamente isso):

```
P1 (sem atraso):  achados = [] de recursos.imagem
P2 (atraso 1,2 s): painel ABERTO, com
  ERRO · slide 1 #capa        · recursos.imagem · imagem que não carregou: ".../assets/marcas/ime-usp-horizontal-preta.svg". Confira o caminho da imagem em img/.
  ERRO · slide 13 #encerramento · recursos.imagem · imagem que não carregou: ".../assets/marcas/ime-usp-horizontal-preta.svg". Confira o caminho da imagem em img/.
```

O que quebra: dois **erros** falsos, atribuídos a slides do autor, sobre um elemento que o autor não escreveu, com um texto de remediação que manda conferir uma pasta `img/` que não tem nada a ver com o caso — e o painel do validador abrindo sozinho por cima da aula, que é justamente o comportamento que a spec 3.2 reservou para erro de verdade. Note o detalhe que confirma o mecanismo: a imagem **do autor** (`foto.png`, também atrasada) escapou, porque o download dela começa no parsing; quem perde a corrida é sempre o cromo injetado, que começa por último.

Correção mínima: esperar o `load` antes do passo 6 (`document.readyState === 'complete'`), e medir `recursos.imagens` sobre as `img` do fonte, não sobre as do documento montado — as duas coisas que a spec 9.3 já pedia. Enquanto o cromo for medido, qualquer falha de rede do sistema vira erro do autor.

### Important

**I1 — o passo 6 do navegador não tem teste nenhum, e por isso as duas dependências de ordem mais frágeis do marco estão protegidas só por comentário.**
Nenhum teste exercita `validar(..., REGRAS_DE_CARGA)` nem `validar(..., REGRAS_DE_COMPOSICAO)` *de dentro de* `montar/navegador.js`:
- `tests/integracao/composicao.test.mjs` abre com `?folha` e chama o seu próprio `validar` (`RODAR`, linhas 10-16) — o passo 6 da página roda e é descartado;
- `build/composicao.mjs` faz o mesmo (`NA_PAGINA`, linhas 13-22);
- `tests/integracao/painel.test.mjs` usa `tests/fixtures/painel/erro.html`, cujo erro é **estático** (`section` sem `h2`);
- `grep` por `composicao|carga|REGRAS_DE` em `painel.test.mjs`, `paineis.test.mjs` e `carregador.test.mjs` não retorna nada.

Consequência concreta: se alguém mover a chamada de `:106-110` para depois de `iniciarMotor`, **os 433 testes continuam verdes** e todo slide que não é o atual passa a medir 0×0 — o transbordo deixa de existir. O ledger chama essa dependência de "crítica e frágil" e ela é guardada por um comentário. O mesmo vale para a leitura de `window.AulaUSP.filaDeDemos` em `:104`. Um teste que abra um deck **sem** `?folha` e afirme um achado de composição no painel fecha as duas de uma vez.

**I2 — a Ruling 11 nunca foi aplicada: `motor/demos.js:9` continua sem comentário de guarda e sem teste.**
`api.filaDeDemos.length = 0` esvazia a fila que o passo 6 lê. O ledger decidiu ("Ruling 11") que esse item entraria na rodada única *depois* da revisão final — esta é a revisão final, então registro que segue aberto. Hoje funciona porque `instalarDemos` roda depois (`navegador.js:124`), mas o raio de explosão de uma inversão é grande: `recursos.demos` vira vazio e **toda** `div.demo[data-demo]` da aula acusa `recursos.demo-sem-registro`, que é **erro**. `tests/integracao/demos.test.mjs:50` afirma que a fila fica vazia depois do motor — ou seja, o único teste na vizinhança fixa o efeito, não a ordem.

**I3 — três dos cinco pares de fixture de composição não discriminam, e só dois estavam documentados.**
A varredura de `tests/unit/validador.test.mjs:349-353` não mede composição: para essas pastas ela só confere que a regra está no contrato e que os dois arquivos existem (honesto, e comentado). Montei as dez fixtures com o runtime de verdade num Chrome e medi:

```
composicao.linhas-titulo.ruim   => ["título renderizado em 3 linhas (máx. 2)."]        ✅ discrimina
composicao.texto-no-amarelo.ruim => ["texto sobre amarelo em rgb(0, 0, 238), não em tinta."] ✅ discrimina
composicao.transbordo.ruim      => []                                                  ❌ NÃO acusa
composicao.tamanho-minimo.ruim  => []                                                  ❌ NÃO acusa (documentado)
composicao.azul-pequeno.ruim    => []                                                  ❌ NÃO acusa (documentado)
composicao.azul-pequeno.bom     => 3 achados de composicao.transbordo                  ❌ bom.html sujo
```

`composicao.transbordo/ruim.html` (tabela de 8 linhas) **não** é um dos dois casos documentados como inalcançáveis — é a regra carro-chefe do grupo, e o seu par simplesmente não discrimina. E `composicao.azul-pequeno/bom.html` não está limpo: o `<svg viewBox="0 0 10 10">` estoura a zona de conteúdo e produz três achados de transbordo. Se a varredura algum dia passar a medir de verdade (é o que o marco 6 vai querer), ela falha nesse `bom.html`.

**I4 — as duas fixtures "inalcançáveis" demonstram o mecanismo errado, não apenas um caso inalcançável.**
Isso importa porque o marco 6 vai ler essas pastas como exemplos para o autor.
- `composicao.azul-pequeno/ruim.html` usa `<text fill="#1094AB" font-size="20">` dentro de um `<svg>`. A regra (`composicao.js:189-205`) lê `getComputedStyle(elemento).color` e **nunca** lê `fill`; o `color` herdado ali é tinta. Esse caso pertence a outra regra, `vocabulario.azul-svg`, que já o acusa no grupo estático.
- `composicao.tamanho-minimo/ruim.html` usa `<sub>quase invisível</sub>`, e `sub` está **literalmente** em `contrato/contrato.json:103` (`papeis.excecoes`). A fixture exibe exatamente o elemento que a regra foi construída para ignorar (`composicao.js:174`).

A conclusão do ledger ("são guardas de sistema, o autor não consegue causá-las") continua correta quanto à alcançabilidade; o que falta é que os `ruim.html` mostrem o *mecanismo certo* — texto com `color: var(--cor-azul)` num papel pequeno, e um elemento fora das exceções com `font-size` forçado — mesmo que só uma mutação de CSS consiga produzi-los.

### Minor

**m1 — `montar/navegador.js:42-50`: o CSS entra antes da cópia do fonte.** Os sete `<link>` são anexados ao `head` dentro do mesmo `Promise.all` que lê os JSON, e só depois vem `document.cloneNode(true)`. É o passo 4 da spec 3.2 acontecendo antes do passo 2. Sem efeito observável hoje (as regras estáticas leem `doc.body` e as metas do `head`), mas inverte a ordem que a spec escolheu e some com a garantia de "antes de qualquer alteração".

**m2 — trabalho dobrado em `?folha`.** Em `navegador.js:106-115`, o conjunto completo (estático + carga + composição) é calculado e, no ramo `?folha`, descartado — nenhum painel é instalado. Como `build/composicao.mjs` sempre navega com `?folha`, **toda validação pela CLI roda o grupo de composição duas vezes** na mesma página: uma no passo 6 e outra no `NA_PAGINA`. É a medida mais cara do sistema.

**m3 — `composicao.texto-no-amarelo` sai de `elementosMedidos` no laço interno.** `composicao.js:213` faz `[elemento, ...elemento.querySelectorAll('*')]`, que não aplica nenhum dos filtros de `elementosMedidos` (`:52-59`): se um campo amarelo vier a conter `aside.notas` ou uma fórmula, o miolo do KaTeX e conteúdo invisível voltam a ser medidos, e elementos amarelos aninhados relatam o mesmo descendente duas vezes. É a forma de defeito "helper reusado para responder outra pergunta", aqui na direção oposta — o helper foi ignorado. Hoje inofensivo; vale um `closest('aside.notas')` e um `.katex` no laço interno.

**m4 — `div.demo` sem `data-demo` é invisível para o sistema inteiro.** `carga.js:45` e `:59` filtram por `div.demo[data-demo]`, o contrato não marca `data-demo` como obrigatório, e `vocabulario.atributo` não acusa ausência. Um PDF vazio sai sem achado nenhum. Já está comentado em `carga.js:37-40`; registro aqui para o marco 6 não perder.

**m5 — `recursos.imagens` no navegador é uma `Map` por `src`** (`navegador.js:99`): duas `<img>` com o mesmo `src` colapsam numa entrada. Inofensivo (mesmo `src`, mesmo destino), mas uma `Map` por elemento seria exata e não dependeria dessa coincidência.

---

## 5. As três dependências de ordem do ledger

| dependência | correta? | guardada? |
|---|---|---|
| composição antes de `iniciarMotor` | **Sim** — confirmei que o `.slide` é caixa fixa de `--palco-largura`×`--palco-altura` (`estilos/layouts.css:5-12`) e que o motor tira os slides do fluxo; medi também que `.folha` **não** muda a medida (`.area` = 1152 px com e sem a classe), então navegador e build medem a mesma geometria | **Não** — comentário forte em `navegador.js:93-96`, zero testes (I1) |
| fila de demos antes de `instalarDemos` esvaziar | **Sim** — o script clássico do autor roda no parsing, antes do `DOMContentLoaded`; `instalarDemos` só corre em `:124` | **Não** — comentário em `navegador.js:100-103`, nada em `motor/demos.js:9`, nenhum teste (I2) |
| cópia do fonte antes da montagem | **Sim** — `:50` precede `:52`, e copiar o documento inteiro (não só o corpo) é a correção certa da revisão do 4b | **Parcialmente** — o comportamento é coberto de lado (as regras estáticas achariam cromo se a cópia viesse depois), mas o CSS já entrou antes da cópia (m1) |

E a terceira forma de defeito que o marco vinha produzindo — lista de exceção aplicada na dimensão errada — **está corrigida e bem corrigida**. `elementosMedidos` (`composicao.js:52-59`) pula só o *interior* de `.katex`/`.katex-display` e mede a raiz da fórmula; `contrato.papeis.excecoes` é lido apenas por `composicao.tamanho-minimo` (`:174`), que é para o que ele existe. Os dois testes de equação larga (em linha e em destaque) em `tests/integracao/composicao.test.mjs:66-82` fixam exatamente o Critical que a Ruling 9 apontou.

---

## 6. Testes: dá para confiar?

**Não há teste afirmando a implementação de volta para si mesma** nos lugares que importam. Os que poderiam ser tautológicos foram desarmados de propósito:
- a varredura de fixtures roda **todas** as regras e filtra depois (`validador.test.mjs:356-363`), com o comentário explicando que rodar só a regra da pasta tornava o teste vazio;
- a varredura de carga monta `recursos` de verdade com o próprio `carregarNoNode` e um `img/existe.png` real ao lado (`:308-321`), em vez de rodar com `recursos` vazio;
- `tests/integracao/composicao.test.mjs` prova as regras por **mutação** da página (largura forçada, margem negativa, `minWidth` no KaTeX), não repetindo a conta da implementação.

O que falta, em ordem de importância: o passo 6 do navegador (I1), a ordem da fila de demos (I2) e três pares de fixture que não discriminam (I3). Também não há teste para um erro de **carga** ou de **composição** chegando ao painel — os quatro testes de painel usam um erro estático.

Um ponto a favor que merece registro: `tests/integracao/validador.test.mjs:14-18` prova que os três grupos convivem numa chamada real da CLI, e `tests/unit/validar-cli.test.mjs` cobre `CHROME_PATH` inexistente, `--json` sem truncamento em cano (321 KB), e a proibição de import estático na CLI. É cobertura madura.

---

## 7. O que os marcos 5 e 6 herdam

### 7.1. O que o marco 5 precisa mudar, e o que pode manter

**Pode manter, inteiro:** `validador/regras/composicao.js` e `validador/regras/carga.js`. Os dois são ES module puro, só API padrão do DOM, e recebem tudo por contexto (`{slides, contrato, janela}` e `{slides, recursos}`). `validador/validar.js` repassa qualquer chave extra (`:31-33`), então o marco 5 acrescenta `cobertura` sem tocar no núcleo. O contrato de `medirComposicao` — `{achados: null, demos: null, motivo}` sem Chrome — já é o que a spec 8.1 pede e não muda.

**`build/composicao.mjs` precisa de três mudanças, e uma delas é a que vai quebrar:**

1. **Sobre o quê se mede.** Hoje `medirComposicao:37-42` sobe `criarServidor` e navega para `http://…/<arquivo>?folha`, ou seja, mede a aula **servida em modo de desenvolvimento**, com o runtime montando tudo ao vivo. A spec 3.3, etapa 5, manda medir o HTML final embutido (`dist/<slug>.html`), que já tem `aula-usp-motor.js` no lugar do runtime e tudo embutido. Ou o build abre o arquivo final direto (`file://`, ou um servidor de um arquivo só, se `file://` estorvar algum recurso), ou passa a medir algo que não é o artefato entregue.

2. **Como o validador entra na página.** `NA_PAGINA:14-15` importa `/_aula-usp/validador/validar.js` e `/_aula-usp/validador/regras/composicao.js` — caminhos que só existem porque o servidor de desenvolvimento os publica. No HTML final eles dão 404. O marco 5 precisa injetar o módulo (`page.addScriptTag({content})` com um bundle de `validar.js` + `composicao.js`, ou `page.evaluate` sobre a fonte lida do disco). É a maior mudança do arquivo, e é mecânica.

3. **⚠️ O `?folha` e a fila de demos — a armadilha.** `NA_PAGINA:18-20` lê `window.AulaUSP.filaDeDemos` e o comentário diz, com todas as letras, que isso funciona porque "`?folha` nunca chama `iniciarMotor`". No HTML final quem manda é `aula-usp-motor.js`, que **é** o motor. Se ele iniciar antes do `evaluate` — e ele vai, a menos que o marco 5 preserve o ramo `?folha` no motor embutido — `instalarDemos` já terá feito `filaDeDemos.length = 0` (`motor/demos.js:9`), `recursos.demos` chega vazio, e **toda demo da aula acusa `recursos.demo-sem-registro`, que é erro, e o build para sem gerar PDF**. Falha silenciosa, em cascata, na etapa que decide se o PDF sai. É a dependência de ordem do I2 cobrando o juro.

**O grupo de saída.** Precisa de `validador/regras/saida.js` e de um `REGRAS_DE_SAIDA` em `validador/regras/index.js` (o arquivo já está no formato certo para receber). `saida.glifo-ausente` e `matematica.simbolo-fora-do-tex` são gêmeos que leem `validador/cobertura.json`, gerado por `aula-usp dist` a partir do `cmap` dos woff2; nasçam juntos, do mesmo leitor. `build/validar.mjs:validarArquivo` devolve hoje `{achados, erros, avisos, avisoDeComposicao}`; o build precisa do mesmo mais o portão da spec 3.3 (erro de composição na etapa 5 → grava HTML e `validacao.json`, não gera PDF, sai 1).

**Herança de normalização.** `build/validar.mjs:38-56` (`normalizarAtributos`) existe porque o linkedom preserva a grafia do autor e o navegador não. O comentário já avisa: quando o build de fato ler a aula com linkedom no marco 5, precisa da mesma chamada, e `carregarNoNode`/`texInvalido` depende de `doc.body.normalize()` ter rodado antes (o grupo estático faz isso de efeito colateral, em `validador/validar.js:28` — outra ordem implícita, essa sim comentada nos dois lados).

### 7.2. Herança para o marco 6 (guia)

- **Quais erros o autor consegue causar e quais não.** `composicao.azul-pequeno` e `composicao.tamanho-minimo` são guardas do CSS do sistema: `.sinal` é o único texto azul do vocabulário e só vive em `h1`/`h2`, que medi em 96 px e 44 px. O guia não deve prometer ao autor erros que ele não tem como provocar. Acrescente `composicao.transbordo` à conversa pelo motivo oposto: é a mais alcançável de todas e a fixture atual não a demonstra (I3).
- **Falso negativo aceito e registrado** (Ruling 6): um literal de expressão regular com aspas no script do autor dessincroniza o rastreador de `build/carregar.mjs` e um `AulaUSP.demo(...)` **comentado** depois dele volta a parecer vivo. Só vale quando **não** há Chrome; havendo Chrome, o registro vem da página.
- `div.demo` sem `data-demo` não é acusado por nada (m4).
- Erros de `renderizarCodigo` ficam só no console, de propósito: `recursos.linguagem` é o dono do único caso que eles produzem. Pendência do marco 3c fechada pela regra de um dono.
- As duas cópias de contexto que o marco 4c removeu (macros do TeX vindas de `contrato.tex.macros`, compilação compartilhada por `compilarTex`) fecham em parte o Minor 6 da revisão do 3b.

---

## 8. Pronto para merge?

**Com correções.**

O branch entrega o que prometeu e fecha o marco 4 com honestidade: 55 das 56 regras de fase 1 fora do grupo de saída, a única ausente adiada por uma razão estrutural correta, os três grupos convivendo numa chamada real da CLI, o espécime limpo nos seis decks, e 433 testes verdes que eu mesmo rodei. A qualidade do raciocínio nos comentários — por que a contagem de linhas não é altura ÷ entrelinha, por que o casamento de chaves não pode descartar um registro, por que a exceção de tipografia não serve para geometria — é acima da média e vai valer mais que o código.

O que segura o merge é uma coisa só e é pequena: **C1**, um erro falso que o autor não pode corrigir, reproduzido em Chrome, causado por não esperar o `load` que a spec 9.3 pede por escrito e por medir o grupo de carga sobre o documento montado em vez do fonte. Junto com ela vão **I1** e **I2**, que são o mesmo problema visto de outro ângulo — o passo 6 do navegador é a parte menos testada do marco, e as duas dependências de ordem que o próprio ledger classificou como frágeis estão guardadas apenas por comentário; **I2** é literalmente o item que a Ruling 11 mandou tratar "na rodada única depois da revisão final", e esta é ela. **I3** e **I4** são trabalho de fixture, sem risco, mas convém fazer antes do marco 6, que vai ler essas pastas como exemplos.

Nenhuma dessas correções mexe em desenho. Feitas — e com um teste que abra um deck **sem** `?folha` e afirme um achado de composição no painel, que fecha C1, I1 e I2 de uma vez — o branch entra em `main` sem ressalva.

---

## O que foi feito depois desta revisão

A revisão acima foi feita por um revisor opus sobre `6ae4964..34f2373`, com sondas próprias no Chrome e as treze suítes de integração rodadas uma a uma. Seguiu-se uma única rodada de correção, em dois commits, e uma re-revisão escopada.

**Corrigido (commits `2742a36` e `b937ae9`, sobre `34f2373`):**

- **Critical:** o validador acusava as marcas do próprio sistema como "imagem que não carregou". Duas causas somadas. O passo 6 não esperava o `load`, embora a spec 9.3 diga "depois de carregar bibliotecas, imagens e scripts", então uma imagem ainda em voo aparecia como falhada — reproduzido com 1,2 s de atraso: dois erros falsos, e o painel abrindo sozinho numa aula correta. E o grupo de carga rodava sobre o **documento montado**, que já contém o cromo que o `montar` injeta, quando a tabela da spec 9.3 diz que ele roda sobre **o fonte**. A correção seguiu a spec ao pé da letra e matou as duas causas de uma vez: espera o `load`, e valida sobre a cópia do passo 2. O mapa de imagens continua vindo do documento vivo — é lá que se sabe se algo carregou —, mas *quais* imagens a regra percorre passam a ser só as que o autor escreveu. As marcas do sistema saem por construção, sem lista de exceção.
- **Important:** a ordem mais frágil do marco não tinha guarda. Mover a chamada de composição para depois de `iniciarMotor` deixava as 433 asserções verdes, embora o próprio plano marque essa ordem como crítica: depois do motor, todo slide que não é o ativo mede 0×0 e o transbordo deixa de existir. Agora existe um teste com transbordo num slide que **não** é o primeiro; a inversão foi verificada, e derruba o achado.
- **Important:** a Ruling 11, registrada na tarefa 3 e nunca aplicada. `motor/demos.js` esvazia a fila de demos depois de registrar, e o passo 6 lê a fila antes disso — funciona por ordem, sem nada que a proteja. Ganhou comentário de guarda e teste; a inversão foi verificada e faz toda demo da aula acusar falta de registro.
- **Important:** três das cinco fixtures de composição não discriminavam quando medidas no Chrome, e duas exibiam o mecanismo errado — `fill` de SVG, que a regra nunca lê, e `<sub>`, que está literalmente na lista de exceções do contrato. Uma fixture que ilustra o mecanismo errado ensina errado, e o marco 6 gera exemplos do guia a partir delas. As duas que podiam discriminar foram consertadas, as outras trocaram de mecanismo e dizem no próprio comentário por que continuam fora do alcance do vocabulário de um autor real.
- **Três Minor:** `texto-no-amarelo` varria os descendentes por conta própria e media o que as outras quatro regras pulam; a cópia do fonte era feita depois de o CSS ser injetado, contra a spec 3.2 ("antes de qualquer alteração"); e a CLI media composição duas vezes por execução.

**Um efeito colateral, declarado pelo implementador e não escondido:** trocar o documento vivo pelo fonte no grupo de carga quebrou a atribuição de slide de `matematica.tex-invalido`, porque o elemento de alerta só existe no documento vivo. Foi corrigido com uma tradução por índice de `<section>` entre os dois documentos, apoiada no fato de que `montar()` não soma, remove nem reordena as `<section>` do topo do corpo.

**A re-revisão escopada pegou o que a rodada quebrou** (corrigido no commit `f08fc99`). Ela confirmou os cinco grupos medindo por conta própria — inclusive uma fixture hostil com TeX inválido dentro de `aside.notas` e um segundo erro em outro slide, e as cinco pastas de composição remedidas com o validador importado dentro da página — e achou duas coisas que a rodada tinha deixado passar:

- **A espera pelo `load` podia congelar a aula inteira.** O `<body>` fica escondido até o fim da montagem, então um recurso que nunca responde — não um 404, um pedido que fica pendurado — deixava a aula em branco para sempre, sem mensagem. Medido: sem terminar em 7 segundos. O revisor classificou como Important, por exigir uma condição de rede patológica; subi para bloqueante pelo formato da falha, não pela probabilidade. Um pedido pendurado é mais provável numa sala de aula, atrás de portal cativo ou wi-fi institucional, do que num laboratório; a spec 5.5 permite imagem externa, só avisa; e a troca era um falso positivo cosmético por uma tela preta na frente da turma. Corrigido em duas metades, porque a raiz eram duas: um teto de dois segundos na espera, e — o que importa mais — o mapa de imagens deixou de achatar três estados em dois. Carregou, falhou e **ainda em voo** são coisas diferentes; `img.complete && naturalWidth` lia "em voo" como "falhou", e era isso que a espera mascarava por tempo. Agora só entra no mapa quem já tem desfecho, e de quem não chegou a tempo o validador não diz nada, em vez de dizer errado. A espera voltou a ser otimização em vez de correção.
- **O próprio Critical não tinha rede.** O revisor provou por medição que reverter `validar(fonte, …)` para `validar(document, …)` não quebrava suíte nenhuma: a atribuição de slide do TeX voltava a "aula" em silêncio. Ganhou teste.

As três guardas foram verificadas por inversão, uma a uma: achatar o mapa de volta faz a imagem pendurada virar erro; devolver o grupo de carga ao documento montado faz os três achados de TeX virarem "aula"; tirar o teto faz a montagem não terminar. Cada inversão derruba exatamente um teste, e é o teste certo.

**Durante a execução, antes desta revisão:**

- **Tarefa 1:** dois Criticals. Uma expressão regular fingia analisar JavaScript — registros dentro de comentário eram lidos como vivos, e uma chave fechando dentro do objeto truncava o casamento. E o build compilava TeX de um jeito e o navegador de outro: `\passo{0}` passava no build e era recusado no navegador. A correção exportou o compilador de TeX dos componentes, para que build e navegador compilem pela mesma função, em vez de manterem duas verdades.
- **Tarefa 2:** um Critical vindo do meu próprio plano. Eu pus a lista `papeis.excecoes` no filtro geral de elementos medidos, mas aquela lista existe para tamanho de tipo, não para geometria — o efeito era uma equação de 2000 px, 948 px fora da zona de conteúdo, produzir zero achados. Também aqui minha instrução de contar linhas de título por "topos distintos" estava errada, e o implementador provou: dentro do KaTeX aquilo conta 4 topos para uma linha, e duas linhas de verdade se sobrepõem 9,5 px numa caixa de 57. Ficou agrupamento por sobreposição vertical acima de 50%, com os números medidos no comentário.
- **Tarefa 3:** o revisor construiu fixture própria e provou o pareamento posicional entre erros de TeX e alertas em cinco arranjos, inclusive dentro de `aside.notas`. Fechou também, com argumento, uma pendência do marco 3c: os erros de código ficam só no console, porque o único caso que produzem já é acusado por `recursos.linguagem` no grupo estático — rotear os dois seria acusar duas vezes.
- **Tarefa 4:** o implementador achou que os moldes de aula dos testes da CLI não tinham a tag do runtime, e que por isso cerca de nove testes passariam a pendurar 30 s cada assim que o Chrome entrasse no caminho. Corrigido antes de commitar.

**Continuam para os próximos marcos, de propósito:** `div.demo` sem `data-demo` é invisível para todas as regras; `recursos.imagens` é indexado por `src`, e colide se duas imagens diferentes tiverem o mesmo caminho relativo em pastas diferentes. E o aviso mais importante que a revisão final deixou para o marco 5: `build/composicao.mjs` só consegue ler a fila de demos porque `?folha` não inicia o motor — no HTML final embutido, o motor é o motor, e se ele rodar antes, a fila chega vazia e toda demo vira erro de registro, matando o PDF em silêncio.
