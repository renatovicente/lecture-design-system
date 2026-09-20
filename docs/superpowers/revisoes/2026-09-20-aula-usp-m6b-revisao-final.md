# Revisão final do marco 6b — o guia do autor

Branch `m6b-guia` em `eac44af`, 27 commits sobre `dcb547d`, 23 arquivos, +2.401 linhas.
Worktree limpo antes e depois desta revisão; as três pastas `dist/` de verificação foram apagadas.

**Veredicto: aprovar com quatro correções.** Nenhuma Critical. O marco é, na dimensão que mais
importa aqui, muito bom: amostrei agressivamente e **não achei uma única afirmação falsa sobre o
comportamento do sistema**. Os dois defeitos que valem barrar o merge são de guarda, não de
conteúdo, e os quatro juntos custam menos de trinta linhas.

| severidade | quantos |
|---|---|
| Critical | 0 |
| Important | 4 |
| Minor | 5 |
| Nit | 2 |

---

## Números medidos

| medição | resultado |
|---|---|
| `npm test` | **436 / 436**, 0 falhas, **0 pulos** (base `dcb547d` = 419; `guia.test.mjs` sozinho = 17) |
| `npm run test:integracao` | **200 / 200**, 0 falhas, 0 pulos (base 200 — o marco não acrescentou teste de integração) |
| `npm run guia` | roda e **não produz diff** (`git status` vazio depois) |
| `aula-usp validar`, seis decks | **0 erros** nos seis. `muitos-blocos.html` com 10 avisos (1 `estrutura.blocos` + 9 `estrutura.id-ausente`), por desenho do deck; os outros cinco com 0 avisos |
| `aula-usp build`, seis decks | 0 erros, código 0, PDFs de **9, 15, 6, 15, 11 e 12** páginas — idênticos aos da base, apesar da edição do espécime em `7e4b45a` |
| `aula-usp build modelos/aula` | 0 erros, 6 páginas |
| `aula-usp build exemplos/descida-do-gradiente` | 0 erros, **11 páginas** |
| blocos gerados | `modelo` 2.095 · `tabela-de-vocabulario` 4.653 · `tabela-de-layouts` 602 · `exemplos-por-layout` 2.582 · `tabela-de-papeis` 534 · `tabela-de-regras` 5.298 caracteres |
| bloco de regras essenciais | **1.667** caracteres, 9 parágrafos |
| `gpt-instrucoes.md` montado | **5.008** caracteres, folga de **2.992** sob o teto de 8.000 |
| âncoras `arquivo#id` em `guia/` | **30 / 30 resolvem** |
| regras citadas em `guia/` | **60 citadas, 0 inexistentes**; e as 60 regras de fase 1 do contrato aparecem todas |
| blocos ```` ```html ```` em `guia/` | **39**; todos validam, são literais de arquivo que valida, ou são marcador declarado |
| `undefined` em `guia/` | nenhum. Marcadores: 6 pares, todos preenchidos |

Todos os números que o plano e os despachos afirmam bateram exatamente: 2.082 nos trechos crus,
2.582 no bloco montado, 1.667 no bloco essencial, 5.008 no GPT, 602 / 5.298 nas duas tabelas do
plano original, 2.095 / 4.653 / 534 nas três acrescentadas pela Ruling 4.

---

## Pergunta 1 — o guia afirma coisas verdadeiras?

**Sim, e com folga.** É a dimensão mais forte do marco. O que eu conferi, e como:

**Os dois transcritos de terminal são reproduzíveis byte a byte.** Montei a aula de quatro slides
que `guia/70-fluxo-terminal.md:72-88` descreve ("uma classe inventada, um `style`, um título grande
demais e matemática entre cifrões") e rodei `aula-usp validar`: a saída é **idêntica**, linha por
linha, trecho por trecho, até o `4 erros, 3 avisos`. O mesmo para o bloco de `--json` (array, campos
`severidade`/`slide`/`id`/`regra`/`mensagem`/`acao`/`trecho`, nulos onde o guia diz) e para as sete
etapas do `build` da aula-exemplo, inclusive o "PDF gerado, 11 página(s)".

**Toda marcação mostrada valida.** Extraí os 39 blocos ```` ```html ```` de `guia/`, montei um deck
mínimo em volta de cada um e passei pelo validador (estática + carga). Zero erros em todos os
trechos completos. Os cinco que acusaram são artefato do meu arnês ou trecho declaradamente parcial:
o `<aside class="notas">` sozinho (não é bloco de corpo), a `<section …>` só com a tag de abertura
(o guia a mostra assim de propósito), o `<tr class="destaque">` fora de uma `<table>`, e as duas
`div.demo` sem o `<script>` de registro ao lado.

**Toda âncora resolve e todo trecho copiado confere com a fonte.** 30 de 30 âncoras `arquivo#id`
existem. Comparei cada trecho com a seção que ele cita: **25 conferem literalmente**; as três
divergências são uma atribuição com duas âncoras (meu comparador pegou a primeira; o trecho é
literal da segunda) e duas abreviações deliberadas — ver M3.

**Todo comando existe.** A CLI despacha `servir`, `validar`, `build`, `dist`
(`bin/aula-usp.mjs:177-182`), e é exatamente o que o guia documenta — inclusive a string `USO`
copiada em `70-fluxo-terminal.md:30-33`, que confere. `aula-usp novo` não aparece em lugar nenhum;
`aula-usp pacotes` aparece seis vezes, e **as seis são futuro declarado ou comentário HTML que a
montagem apaga**. `npm install -g aula-usp` aparece três vezes, e nas três acompanhado de "ainda não
funciona".

**Todo nome de regra existe.** 60 regras citadas, 0 inventadas; e as 60 regras de fase 1 do contrato
aparecem no guia (20 só na tabela gerada, o que é o desenho).

**Sondas de comportamento, uma a uma, todas confirmando o guia:**

| afirmação do guia | medido |
|---|---|
| `\passo{1}{…}` no TeX + `<li data-passo>` = `estrutura.passos-mistos` (40:85) | confirmado |
| `\href` no TeX → `matematica.tex-invalido` · "comando não permitido no TeX" (40:91) | confirmado, literal |
| TeX quebrado traz a mensagem do KaTeX "Unexpected end of input in a macro argument, expected '}'" (40:93) | confirmado, literal |
| `figure.grafico` com JSON dentro rende **quatro** erros, e são esses quatro (50:137) | confirmado, os quatro nomes batem |
| `<button>` no corpo → `vocabulario.elemento` (50:41) | confirmado |
| classe `linguagem-python` → `vocabulario.classe` (40:120) | confirmado |
| texto solto, e `\( … \)` solto, → `fora-do-layout` "texto solto não é permitido no layout" + `obrigatorio` (40:32-33) | confirmado nos dois casos |
| `R$` solto não dispara `cifrao-suspeito` (40:18) | confirmado (`CIFRAO_SUSPEITO` exige `\`, `^` ou `_`); e `especime/componentes.html`, que tem `R$ 400`, dá 0 avisos |
| `limites.codigo-*` medem `pre` **com ou sem** `data-lang` (40:137) | confirmado |
| orçamento de palavras exclui TeX, `pre`, `code`, `notas`, `h1`, `h2`, `p.lide` (20:72, 40:5) | confirmado (`FORA_DA_CONTAGEM` + remoção por construção) |
| texto de SVG **conta** no orçamento e **não** conta no tamanho mínimo (50:123-124) | confirmado (comentário explícito em `limites.js:22`; exceção `svg *` na tabela de papéis) |
| progresso do build no stderr, lista no stdout (70:145) | confirmado: com `2>/dev/null` sai só a lista e o resumo |
| aviso sem Chrome na forma `Aula USP: aviso: composição pulada, sem Chrome: …` (70:175) | confirmado, literal |
| build para onde o erro apareceu; estático → só `validacao.json`; composição → HTML + JSON, sem PDF (70:139) | confirmado (`build.mjs:81` e `:138`) |
| teclas **V**, **P**, **N**, **F**, **?** (60, 71, 72) | confirmado, `motor/navegacao.js:3-21` |
| painel abre sozinho com erro **e** fora da tela cheia (60, 71:39, 72:40) | confirmado, `motor/paineis.js:174` |
| botão "Copiar para o chat", desabilitado em `file://` (71:41-52) | confirmado, `motor/rotulos.js:17` e `paineis.js:101` |
| avisos vão para o console do navegador (60, 71:39) | confirmado, `montar/entrada.js:200` |
| apresentador bloqueado escreve a explicação no painel de notas (71:89) | confirmado, string literal em `motor/rotulos.js:21` |
| PDF da demo: `img.estatico` → `capturar()` → "Demo interativa: abra o HTML" (50:92-96) | confirmado, `motor/impressao.js:31-43` + `rotulos.js:30` |
| `montar`/`iniciar`/`parar` e o erro no console "com o nome da demo e a etapa" (50:83-88) | confirmado, `motor/demos.js:18-24` |
| `img.estatico` é o único filho aceito em `div.demo` (50:39) | confirmado, `contrato.filhos["div.demo"]` |
| `figure` com **exatamente um** `img` ou `svg` (30:159) | confirmado, `exatamenteUmDe` |
| `disciplina`, `aula` e `professor` têm máximo; `unidade` e `data` não (10:102) | confirmado: 60, 12 e 40 |
| `unidade` desconhecida "diz, na mensagem, quais existem" (10:100) | confirmado, `estrutura.js:64` |
| ordem dos achados: aula primeiro, depois por slide, dentro do slide na ordem das regras (60) | confirmado, `validador/validar.js:52` |
| `saida.pdf-paginas` "pede que você relate o defeito" (60) | confirmado, literal |
| slides antes da primeira abertura não têm quadrado (10:116) | confirmado, `montar/blocos.js:28` |
| sem `data-curto`, o nome curto é o próprio título (10:132) | confirmado, `montar/blocos.js:26` |

O único achado desta pergunta é o **I1**, e não é uma afirmação falsa: é um exemplo mostrado que
contradiz uma regra que o próprio guia dá.

---

## Pergunta 2 — o gerado é gerado, e o escrito à mão tem guarda?

O princípio se sustenta: nenhum número, nome de layout, nome de regra ou limite do contrato aparece
digitado em `guia/`, e as quatro tabelas da spec 5.6 estão todas geradas, mais o esqueleto. As 17
guardas rodam e nenhuma pula. Mas duas delas não mordem, e uma decisão importante não tem guarda
nenhuma.

Fiz a pergunta que o despacho pede — *o que eu quebro para ela falhar?* — em cada uma. Resultado:

| guarda | quebra que a faz falhar | mordeu? |
|---|---|---|
| blocos gerados batem com o disco | editar qualquer bloco entre marcadores | sim (inversão já relatada no despacho A) |
| tabela de layouts sem `undefined` | tirar `umDe`/`grupo` de `itemDaSequencia` | sim |
| todo layout na tabela e com exemplo | layout novo no contrato sem instância no espécime | sim |
| vocabulário traz classe e atributo de fase 1 | filtrar classe, ou errar o `daFase` | sim |
| vocabulário enumera `data-grade` | divergir `grades` de `valores` | sim |
| tabela de papéis | tirar papel, mínimo ou exceção | sim |
| nenhuma linha de tabela torta | tirar o escape de `\|` de `celula()` | sim (o padrão de `img src` tem um `\|`) |
| esqueleto byte a byte com `modelos/aula/` | editar o modelo sem regerar | sim |
| **todos os blocos de corpo citados em `30-componentes.md`** | — | **não, para 4 dos 11 → I2** |
| tabela de metas = `contrato.metadados`, na ordem | meta nova no contrato | sim |
| regras de carga nomeadas **na prosa** de `60-validador.md` | regra de carga nova | sim (o despacho C já tirou o bloco gerado da busca) |
| `aplicarMarcadores` erra alto | marcador ausente | sim |
| bloco essencial existe e não é vazio | esvaziar o bloco | sim (mas ver Nit 1) |
| `guia/pacotes/` com exatamente cinco arquivos | arquivo a mais ou a menos | sim |
| linha do marcador nos quatro que levam o bloco | tirar a linha | sim |
| nenhum fonte de pacote copia o bloco | colar um parágrafo dele | sim |
| teto de 8.000 do GPT, depois de montado | crescer `gpt-instrucoes.md` em 3.000 caracteres | sim |

**Sem guarda nenhuma:** o filtro de idioma do extrator (**I4**), seis dos onze arquivos de guia
(**I3**), e os 25 trechos copiados à mão em relação à seção que citam (**M4**).

---

## Pergunta 3 — alguma coisa documenta como pronto o que não existe?

**Não. É a parte mais bem-feita do marco**, e foi onde eu procurei com mais vontade de achar.

- **Fase 2.** `50-graficos-diagramas-demos.md` abre com uma tabela de estado por recurso ("fase 2:
  erro hoje" em quatro linhas), diz explicitamente "Documentar como pronto o que não existe é pior
  do que não documentar", **não mostra marcação nenhuma** do que não roda, e fecha medindo o custo
  de tentar: os quatro erros que um `figure.grafico` rende hoje. Conferi os quatro: batem.
- **A CLI não publicada.** `70-fluxo-terminal.md:19` em negrito: "`npm install -g aula-usp` ainda não
  funciona", com o motivo e a fase. `skill.md:26` e `agents-disciplina.md:30` repetem a ressalva,
  cada um no seu leitor. Nenhum arquivo documenta `aula-usp novo` nem `aula-usp pacotes` como
  disponível.
- **A tag da CDN.** `71-fluxo-chat.md:18` em negrito: "A tag pronta, com a versão e o hash reais,
  ainda não existe", com a medição ("hoje nenhum arquivo deste repositório traz um endereço de CDN")
  e o caminho para experimentar mesmo assim (`aula-usp servir`). `73-chatgpt.md:7` repete.
  `72-artifact-claude.md` vai mais longe do que eu teria exigido: além da ressalva de fase, **declara
  que o que ele afirma sobre artifacts é o que a spec 14 assume, não o que alguém testou**, e diz o
  que sai do arquivo quando o aceite da fase 3 rodar.

A única ressalva é **M6**, e é de colocação, não de conteúdo.

---

## Achados

### Important

**I1 — o exemplo canônico de `abertura` é um slide que o validador acusa, e é o único daquele layout.**

`guia/20-layouts.md:91-95` publica, como o exemplo de `abertura`:

```html
<section data-layout="abertura">
  <h2>Séries</h2>
</section>
```

Extraído de `especime/muitos-blocos.html` — e essa seção é uma das **nove** que produzem
`AVISO · estrutura.id-ausente` naquele deck (medido: 0 erros, 10 avisos). Ela também não tem
`p.pergunta`.

Contra isso, no mesmo guia: `10-estrutura.md:136` diz "**Um `id`** … Um slide sem `id` ganha um
gerado do título e um aviso (`estrutura.id-ausente`); capa e encerramento são exceção";
`20-layouts.md:39` diz que a pergunta "dá ao aluno um motivo para prestar atenção no bloco inteiro";
`20-layouts.md:76` manda "**Copie a forma**"; e `00-principios.md:7` diz que, quando prosa e código
discordarem, "**o bloco de código é a autoridade**". Um modelo que siga o guia vai escrever aberturas
sem `id` e sem pergunta, e o autor vai receber um aviso por bloco.

A causa é estrutural e vale mais que o sintoma: **o critério "a menor seção" (`build/guia.mjs:184`)
seleciona sistematicamente a instância mais pobre de cada layout** — a que não tem os opcionais e a
que não tem `id`, porque é justamente isso que a faz ser a menor. `especime/matematica.html#o-papel-de-eta`
tem `id`, `data-curto` e `p.pergunta`, e o próprio guia a cita em `10-estrutura.md:126`; ela perde o
critério por ser maior.

Conserto: trocar "a menor" por "a menor que não produza aviso", ou por "a menor entre as que trazem
os opcionais do layout", e acrescentar a asserção correspondente.

**I2 — a guarda dos onze blocos de corpo é vazia para quatro deles.**

`tests/unit/guia.test.mjs:138` percorre `contrato.blocosDeCorpo` e cobra cada nome em
`guia/30-componentes.md` — **no arquivo inteiro**, bloco gerado incluído. Mas o mesmo arquivo termina
com a tabela gerada `tabela-de-papeis`, e ela cita `` `aside.destaque` ``, `` `aside.quadro` ``,
`` `aside.alerta` `` e `` `pre` ``.

Medido, por mutação: apaguei as seções "## Destaque", "## Quadro", "## Alerta" e "## Código" da
prosa — **53 linhas fora**, quatro componentes sem documentação nenhuma — e os **17 testes seguiram
verdes**, este incluído. Restaurei.

É a segunda ocorrência da classe que o despacho C pegou e corrigiu em `60-validador.md`. O conserto é
a mesma linha que ele usou lá:

```js
const prosa = componentes.replace(/<!-- gerado:[\s\S]*?<!-- \/gerado -->/g, '');
```

**I3 — seis dos onze arquivos de guia não são nomeados por nenhum teste nem pelo gerador.**

`40-matematica-e-codigo.md`, `50-graficos-diagramas-demos.md`, `70-fluxo-terminal.md`,
`71-fluxo-chat.md`, `72-artifact-claude.md` e `73-chatgpt.md` não aparecem em `tests/` nem em
`build/`. Apagar qualquer um deles deixa `npm test` verde.

O contraste é dentro do próprio marco: `guia/pacotes/` tem guarda de **conjunto exato**
(`guia.test.mjs:228`, derivada de `FONTES_DE_PACOTE`). A spec 10.1 lista os dezesseis arquivos; só
cinco estão enumerados em código. E `guia/pacotes/skill.md:48-62` aponta para
`references/40-…`, `references/50-…`, `references/70-…` e `references/71-…`: o `aula-usp pacotes` do
6c montaria um `SKILL.md` com links mortos sem nada falhar.

Conserto: uma constante com os onze nomes (ou lê-la da tabela de `00-principios.md`) e um
`deepEqual` contra `readdirSync('guia/')`, no molde exato do teste dos cinco.

**I4 — o filtro de idioma do extrator não tem guarda, e a guarda que existe manda abençoar a regressão.**

`build/guia.mjs:181` — `if (!/<html lang="pt/.test(html)) continue;` — é a Ruling 3 do despacho A, e
é carga. Medido: sem essa linha, os exemplos de `conteudo` e `encerramento` passam de
`muitos-blocos.html` para `especime/ifusp.html`, e o guia publica **"The cloud spreads"** e
**"Takeaways"** como exemplos canônicos para professores brasileiros — exatamente o que a Ruling 3
existe para impedir.

Nada assere isso. A única guarda é "regerar e comparar", que por construção **não vê mudança no
gerador**: ela falha uma vez, e a mensagem que ela imprime é "rode `npm run guia` e commite o
resultado" — ou seja, ela instrui a pessoa a aceitar a regressão. Duas linhas fecham a janela:
afirmar que o deck de cada exemplo extraído é um deck `lang="pt…"`.

### Minor

**M1 — `AGENTS.md:68` aponta para uma linha em branco.** A linha nova da tabela de gerados cita
`tests/unit/guia.test.mjs:21`; lá está uma linha vazia, e a guarda começa na **25**. As outras quatro
linhas da mesma tabela apontam, todas, para a linha exata do `test(` — conferi uma a uma
(`tokens.test.mjs:93`, `fontes-css.test.mjs:24`, `cobertura.test.mjs:74`, `bundle.test.mjs:115`).

**M2 — "a mensagem da regra traz a lista inteira das aceitas" é verdade na linha impressa e falsa no
JSON.** `40-matematica-e-codigo.md:123`, `30-componentes.md:137` e `60-validador.md` dizem isso de
`recursos.linguagem`. A lista está em `regra.acao`; o campo `mensagem` traz só
`linguagem fora da lista em data-lang: "cobol".` (medido). O próprio guia documenta `mensagem` e
`acao` como campos distintos em `70-fluxo-terminal.md:163-164`, então um agente que leia o `--json`
vai procurar a lista onde ela não está. Uma palavra ("a ação da regra") resolve.

**M3 — os dois trechos de lista de `30-componentes.md` são abreviações da seção que citam, sem dizer.**
`especime/componentes.html#marcadores-e-passos` tem cinco `li` no `ul` e cinco no `ol.passos`; o guia
mostra quatro em cada, tirando o item que o espécime tem para exercitar a quebra de linha. Não
invalida nada — `lista.itens` é 5, máximo, e o trecho de quatro passa —, mas o arquivo promete "o seu
trecho pronto, tirado de um arquivo que valida … com o endereço da seção de onde veio", e quem
conferir vai achar outra coisa. Os outros 25 trechos com âncora conferem literalmente.

**M4 — nenhuma guarda liga os 25 trechos copiados à mão à seção que eles citam.** Só os sete de
`exemplos-por-layout` e o esqueleto são gerados; o resto é cópia manual com endereço. Este marco
**editou o espécime** (`7e4b45a`, as duas definições de taxa de aprendizado): se algum trecho
copiado tivesse citado aquelas duas linhas, o guia seguiria mostrando a frase falsa com o endereço
certo, e nada falharia. O comparador que faz isso cabe em 40 linhas — eu escrevi um para esta
revisão, e ele encontrou M3 sozinho.

**M5 — `10-estrutura.md:108-110` descreve a tag da CDN publicada no presente do indicativo.** "numa
aula sua, ela aponta para a versão publicada, com a sua soma de integridade… A versão é exata e vem
com `integrity`". A ressalva de fase 3 está em `71`, `72` e `73`, e a frase remete a eles ("O arquivo
do seu fluxo diz qual usar") — mas `10-estrutura.md` é justamente o arquivo que `skill.md:32` e
`projeto-claude.md` mandam ler **antes do primeiro slide**. Meia frase na seção resolve.

### Nit

1. **O `t.skip` do teste do bloco essencial virou porta aberta.** `guia.test.mjs:204-209` pula quando
   `guia/00-principios.md` não existe — condição da Tarefa 2, que acabou. Apagar o arquivo hoje faz
   esse teste **pular**; a suíte ainda fica vermelha, porque dois outros testes chamam
   `regrasEssenciais()` e estouram. Cosmético, mas o galho está morto.
2. **`60-validador.md` caracteriza 2 das 4 regras `saida.*`.** "o HTML final não pode depender de
   nenhum arquivo externo, e o PDF tem de ter o número de páginas previsto" deixa `saida.tamanho` e
   `saida.glifo-ausente` só na tabela gerada.

---

## O que o 6c herda desta revisão

1. **Se I3 não for corrigido agora, corrija-o no 6c antes de montar os pacotes** — o `SKILL.md`
   aponta para quatro `references/` que nada garante existirem.
2. **O injetor tem de substituir por função, não por string** (achado do despacho D, e eu confirmo
   que `montarPacote` já faz assim): o bloco essencial contém `` `$` ``, e numa string de
   substituição `$` seguido de crase insere tudo que vem antes do casamento. Medido lá: 2.872
   caracteres a mais, sem erro nenhum.
3. **`aula-usp pacotes` precisa rodar `npm run guia` antes de empacotar**, pela mesma razão que
   `aula-usp dist` gera a cobertura antes de empacotar.
4. **Quando `novo` e `pacotes` entrarem na CLI, três passagens do guia ficam desatualizadas no mesmo
   instante**, e nenhuma tem guarda: a string `USO` copiada em `70-fluxo-terminal.md:30-33`, o "Dos
   quatro comandos, três são seus" da linha 42, e a lista `(servir, validar, build, dist)` em
   `skill.md:24`.
5. **Revisitar `71`, `72` e `73` quando o aceite da fase 3 rodar**, como os próprios arquivos pedem.

## Método

Reproduzi os dois transcritos de terminal montando as aulas que eles descrevem; extraí e validei os
39 blocos de marcação; comparei cada trecho citado com a seção que ele cita; conferi as 30 âncoras e
os 60 nomes de regra contra o contrato; sondei 11 regras com decks mínimos; e testei as guardas por
mutação, restaurando com `git checkout --` a cada uma. O worktree voltou a `eac44af` limpo, e as três
pastas `dist/` geradas pelos builds de verificação foram apagadas. `npm test` e `npm run guia`
rodados de novo ao final, verdes e sem diff.

---

# O que foi feito depois desta revisão

Escrito no fechamento do marco. A revisão devolveu **0 Critical, 4 Important, 5 Minor e 2 Nit**, com
veredicto "aprovar com quatro correções". **Os onze foram corrigidos**, em nove commits (`5531457` a
`201e891`), e a verificação final foi refeita: **440 testes unitários com zero pulos**, 200 de
integração, `npm run guia` sem diff.

## O achado que mudou como este projeto entende os artefatos gerados

O **I4** é o mais sutil do marco e o de alcance mais largo: **uma guarda de regerar-e-comparar
abençoa uma regressão do gerador.** Ela compara saída com saída — piore o gerador, regere, e as duas
batem de novo. Pior: a mensagem dela instrui a fazer exatamente isso ("rode `npm run guia` e commite
o resultado").

A prova foi feita por mutação, na rodada de correção: tirado o filtro de idioma e regerado, a guarda
antiga ficou **verde** com o guia publicando "The cloud spreads" e "Takeaways" como exemplos
canônicos de um guia escrito em português.

Isso vale para os **cinco** artefatos gerados-e-versionados do repositório, não só para o guia — por
isso o `AGENTS.md` ganhou um parágrafo dizendo o que esse tipo de guarda **não** prova. A diferença é
que `dist/`, `tokens.css`, `fontes.css` e `cobertura.json` produzem artefatos cujas propriedades
outros testes verificam por fora; o guia é texto, ninguém o executa, e ele não tinha quem olhasse.

**A correção não é uma guarda melhor de igualdade: é asseverar propriedades do resultado.** Igualdade
prova sincronia entre arquivo e gerador; propriedade prova qualidade. As guardas novas exigem que
todo exemplo extraído venha de deck em português e valide limpo — e há uma terceira que protege o
próprio filtro de virar decoração, se um dia o deck que existe para provocar aviso sair do espécime.

## O critério de extração falhou três vezes, e a terceira explica as outras duas

"A menor seção entre os decks" pareceu puramente sintático quando eu o escrevi. Ele escolheu:

1. **o idioma errado** — `especime/ifusp.html` é `lang="en"` de propósito e vencia em dois layouts;
2. **a instância mais pobre** — o exemplo canônico de `abertura` era um slide *que o validador acusa*,
   sem `id` e sem `p.pergunta`, enquanto o próprio guia manda pôr `id` em todo slide;
3. **e não tinha quem o protegesse** — era o I4.

A causa comum: **otimizar tamanho seleciona sistematicamente o pior exemplar**. Em corpus multilíngue,
o idioma mais conciso; num corpus que inclui um deck feito para falhar, a seção mais incompleta. O
critério passou a ser "a menor seção entre os decks que validam limpo", e o efeito foi medido: quatro
dos sete exemplos trocaram, os sete layouts seguem com instância, e `abertura` passou a ter `id` e
`p.pergunta`.

## Duas guardas que nasceram vazias, e como foram pegas

O **I2** era maior do que esta revisão relatou. O conserto proposto — tirar o bloco gerado do escopo
da busca — não fechava: com ele aplicado, apagar 52 linhas de prosa ainda deixava a suíte verde. A
segunda causa era a **linha de abertura do arquivo**, que enumera os onze nomes de bloco e sustentava
sozinha a guarda para todos eles.

Nos dois casos o defeito foi encontrado por **mutação**, não por leitura — e é a terceira vez neste
marco. A regra que sai disto, e que vale escrever: *uma guarda que procura um nome num arquivo que
também contém uma lista desses nomes não prova nada.*

## O que a revisão confirmou, e que é o resultado principal

Amostragem agressiva **não achou uma única afirmação falsa sobre o comportamento do sistema**:
30 de 30 âncoras `arquivo#id` resolvem, 60 regras citadas e nenhuma inexistente, 39 de 39 blocos de
marcação validam ou são literais de arquivo que valida, zero `undefined`, seis pares de marcador
todos preenchidos. E nada documenta como pronto o que não existe: a fase 2, a publicação no npm e a
tag da CDN estão declaradas como inexistentes, repetidamente e nos arquivos certos.

## O que fica sabido e sem guarda

- O `p.pergunta` do exemplo de `abertura` é **consequência** do critério, não promessa dele: o
  contrato o declara opcional, e "a menor entre as limpas" não promete opcionais. Se ele sair de
  `especime/componentes.html#tabelas`, o exemplo regride e nada falha.
- Três blocos ```` ```html ```` não têm âncora e ficam fora da conferência automática: um `ol`
  ilustrativo, o `<script>` de demo e a tag de CDN.

## Verificação final

- `npm test`: **440 testes, 440 passam, 0 falham, 0 pulam**.
- `npm run test:integracao`: **200/200** — o marco não acrescentou teste de integração, e nenhum lê `guia/`.
- `npm run guia` não produz diff num repositório limpo.
- Os seis decks do espécime, pelos dois comandos, sem regressão apesar de o espécime ter sido editado
  neste marco: 9, 15, 6, 15, 11 e 12 páginas. `modelos/aula` em 6, `exemplos/descida-do-gradiente` em 11.
