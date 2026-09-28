<!-- guia/00-principios.md -->

# O Aula USP

O Aula USP é um design system de slides de aula, em HTML, para as disciplinas do IME e do IFUSP. Uma aula é **um arquivo**: você escreve o conteúdo, e o sistema faz o resto — tipografia, grade, cor, mapa de blocos, cabeçalho, rodapé, numeração, matemática, destaque de código, navegação, janela do apresentador e PDF.

O mesmo arquivo serve às duas entregas de uma aula: projetado na sala e distribuído em PDF. Não há duas versões para manter em dia.

Este guia é a fonte de tudo que se pode escrever numa aula, e tem dois leitores ao mesmo tempo: o professor, que quer saber por que uma regra existe, e o modelo de linguagem a quem ele pede a aula, que precisa da forma exata. Por isso o porquê vem em prosa e a forma vem em bloco de código. Quando os dois parecerem discordar, **o bloco de código é a autoridade**: a marcação deste guia é tirada de arquivos que o validador aprova, e vem com o endereço de onde saiu.

## O que você escreve e o que o sistema desenha

Cada `<section>` do corpo do arquivo é um slide. O `data-layout` da seção diz que papel esse slide tem, e cada layout aceita um conjunto fechado de elementos, numa ordem fixa — é o assunto de **Layouts**.

O sistema deriva das seções, e desenha sozinho:

- o cabeçalho de cada slide, com o rótulo do bloco, o mapa de quadrados e o contador;
- o rodapé, com a disciplina e o número da aula;
- a linha de metadados e o roteiro da aula, na capa;
- o número do bloco, a fileira de quadrados e os nomes curtos, nas aberturas;
- a faixa de marca, com os logos da unidade e da USP, na capa e no encerramento;
- a matemática, o destaque do código, a revelação por passos e a paginação do PDF.

Nada disso se escreve à mão: um slide com o número da aula digitado no rodapé é um slide com o número duas vezes. É o engano mais comum de quem chega de uma ferramenta em que o autor desenha o próprio rodapé.

## Por que as restrições são estas

Quase todas as regras deste guia descendem de três decisões.

**A aula é lida de longe.** O sistema fixa um tamanho mínimo de letra para cada papel — leitura, código, legenda, rótulo — e o validador o mede no slide montado. A consequência é a regra mais importante de todas: quando o conteúdo não cabe, **corte ou divida o slide em dois; nunca diminua a letra**. Os limites de título, de lide, de palavras e de itens existem para que você descubra que não cabe enquanto escreve, e não na hora de projetar.

**Cor é informação, nunca enfeite.** A paleta é curta, e cada cor tem um papel: preto para o texto de leitura e para os traços, cinza para legenda e comentário, um tom claro para régua fina, o azul da USP para sinalizar e o amarelo da USP para destacar como campo atrás do texto. Você não escolhe cor: escolhe papel, e a cor vem junto. Como o atributo `style` é proibido, o único caminho pelo qual uma cor estranha entra numa aula é um SVG ou um comando de cor em TeX — e o validador fecha os dois.

**O vocabulário é fechado para poder ser conferido.** Tudo que uma aula pode conter está descrito em `contrato/contrato.json`, e o mesmo contrato é lido pelo validador. É isso que torna possível pedir a aula a um modelo de linguagem e saber, sem abrir o arquivo, se ela está dentro do sistema: o que não está no contrato vira erro com nome, lugar e conserto. O guia explica o contrato; o contrato é quem manda.

## As regras essenciais

O bloco abaixo é o sistema inteiro em um punhado de linhas. Ele entra **literalmente** nos pacotes para agentes — a skill, o Projeto do Claude, o GPT personalizado e o trecho de `AGENTS.md` das disciplinas —, de modo que uma regra mudada aqui muda em todos eles de uma vez. É essa reutilização que o mantém curto e imperativo.

<!-- regras-essenciais:início -->
**Uma ideia por slide.** O `h2` diz qual é; o `p.lide`, quando houver, a entrega inteira na primeira frase; o corpo a desenvolve. Duas ideias são dois slides.

**A aula é uma sequência de `section`.** Cada uma tem um `data-layout` do contrato; a primeira é `capa`, a última é `encerramento`. Cabeçalho, mapa de blocos, contador, rodapé, roteiro e faixa de marca são desenhados pelo sistema: não escreva nenhum.

**Você não escolhe cor, escolhe papel.** Preto para ler, cinza para legenda e comentário, azul só na segunda linha de um título (`<span class="sinal">`), amarelo só como campo atrás de texto preto (`aside.destaque`, célula de tabela, linha marcada de código). Nenhuma outra cor, nem em SVG, nem em TeX.

**Nada de `style`.** Sem atributo ou elemento `style`, sem `script` dentro do slide (o de dados de gráfico e diagrama é a exceção), sem `iframe`, `video`, `audio`, gradiente, sombra, transparência ou canto arredondado.

**Matemática sempre em TeX:** `\( … \)` no meio da frase e `\[ … \]` em linha própria, como texto solto dentro da `section` — não existe elemento de equação. `$` não é delimitador.

**Código em `<pre data-lang="…">`**, numa das linguagens do contrato. **Toda `img` tem `alt`.** Uma demo sai no PDF pela sua `img.estatico` ou por `capturar()`, os dois disponíveis na impressão do navegador; sem nenhum dos dois, o `aula-usp build` ainda fotografa a demo.

**Os limites são do contrato, e o validador os mede:** tamanho de título, lide e pergunta; palavras no corpo e na coluna; itens por lista; código e tabela. Quando um estoura, corte o conteúdo ou divida o slide em dois — nunca diminua a letra.

**O que você vai dizer em voz alta vai em `<aside class="notas">`**, que não aparece no slide.

**Entregue em zero erros.** Rode o validador, leia a mensagem, corrija a causa apontada e rode de novo.
<!-- regras-essenciais:fim -->

## Onde está o resto

| capítulo | quando abrir |
|---|---|
| **A estrutura de uma aula** | o esqueleto do arquivo, os metadados do `<head>` e os blocos da aula |
| **Layouts** | o que cada layout aceita, em que ordem, e um exemplo de cada |
| **Componentes** | o trecho pronto de cada bloco de corpo |
| **Matemática e código** | delimitadores, `\passo`, derivações reveladas e linhas marcadas de código |
| **Gráficos, diagramas e demos** | gráficos, diagramas, demos e os controles delas |
| **O validador** | a tabela de regras e o que fazer quando cada uma acusa |
| **O fluxo com terminal** | escrever a aula com a CLI instalada |
| **O fluxo no chat, sem terminal** | escrever a aula num chat, sem terminal |
| **A aula como artifact do Claude** | a aula como artifact do Claude, e o que não funciona lá dentro |
| **A aula pelo ChatGPT** | entregar a aula pelo ChatGPT |

Um caminho curto para a primeira aula: leia este capítulo e **A estrutura de uma aula**, crie a pasta com `aula-usp novo minha-aula --unidade ime` — que copia o esqueleto já com `unidade` e `data` preenchidas —, escreva, e use **O validador** quando o validador falar. Sem terminal, o esqueleto é o que **A estrutura de uma aula** mostra inteiro, e **O fluxo no chat, sem terminal** conta o resto. A aula-exemplo — `exemplo.html` — é uma aula inteira, escrita dentro do sistema, para ver como fica; a segunda — `exemplo-recursos.html` — faz o mesmo com gráfico, diagrama e demo.

<!-- guia/10-estrutura.md -->

# A estrutura de uma aula

Uma aula é um arquivo HTML: um `<head>` com os metadados e a tag do runtime, e um `<body>` que é só uma sequência de `<section>`. Não há folha de estilo para escrever, nem script para escrever, nem pasta de projeto: o runtime traz o sistema inteiro consigo.

## O esqueleto

É este o arquivo de onde toda aula começa. Ele está em `modelo.html`. O bloco abaixo **é** esse arquivo: `npm run guia` o copia para cá, então o que você lê aqui é o esqueleto de hoje, e não uma cópia que envelheceu.

<!-- gerado:modelo -->
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Título da aula</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Nome da disciplina">
<meta name="aula" content="1">
<meta name="data" content="2026-03-02">
<meta name="professor" content="Prof. Nome Sobrenome">
<script src="https://cdn.jsdelivr.net/npm/aula-usp@0.1.0/dist/aula-usp.js"
        integrity="sha384-1XCE0DFQVyf/YxnuMk8x/L68J6odFl8ddDBedqZrHsGQxAYEDoa6wDV+5d/BILP3" crossorigin="anonymous"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Título da aula<br><span class="sinal">subtítulo curto</span></h1>
</section>

<section data-layout="abertura" id="primeiro-bloco" data-curto="Bloco um">
  <h2>Primeiro bloco</h2>
  <p class="pergunta">Qual pergunta este bloco responde?</p>
</section>

<section data-layout="conteudo" id="uma-ideia">
  <h2>Uma ideia por slide;<br><span class="sinal">o título diz qual é.</span></h2>
  <p class="lide">A primeira frase entrega a ideia inteira.</p>
  <p>O corpo desenvolve a ideia em duas ou três frases.</p>
  <aside class="notas">O que dizer em voz alta e não está escrito no slide.</aside>
</section>

<section data-layout="abertura" id="segundo-bloco" data-curto="Bloco dois">
  <h2>Segundo bloco</h2>
  <p class="pergunta">E qual pergunta este responde?</p>
</section>

<section data-layout="conteudo" id="duas-colunas">
  <h2>Quando texto e figura<br><span class="sinal">andam juntos.</span></h2>
  <div class="colunas" data-grade="6-6">
    <div>
      <p>A coluna da esquerda argumenta.</p>
      <aside class="destaque" data-rotulo="Definição">Um termo novo, definido em uma frase.</aside>
    </div>
    <div>
      <ol class="passos">
        <li>Primeiro passo.</li>
        <li data-passo>Segundo passo, revelado depois.</li>
        <li data-passo>Terceiro passo.</li>
      </ol>
    </div>
  </div>
  <aside class="notas">Revelar os passos um a um, falando cada um antes de mostrar o próximo.</aside>
</section>

<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>A primeira coisa que o aluno leva.</li>
    <li>A segunda.</li>
  </ol>
  <p class="proxima">Próxima aula: assunto seguinte.</p>
</section>

</body>
</html>
```
<!-- /gerado -->

O que há para reparar nele:

- a ordem é obrigatória: a aula **começa** na `capa` e **termina** no `encerramento`;
- entre uma abertura e a seguinte ficam os slides daquele bloco — aqui, um de cada;
- a indentação é livre; o sistema não a lê. A exceção é o interior de `<pre>`, onde o espaço é conteúdo (**Componentes**).

Com terminal, `aula-usp novo minha-aula --unidade ime` cria a pasta com este arquivo dentro e duas metas já preenchidas (**O fluxo com terminal**). Sem terminal, copie o arquivo inteiro e troque o conteúdo. De um jeito ou de outro, partir deste esqueleto é mais rápido do que montá-lo de memória, e você herda de graça a ordem das seções e o par de aberturas.

## Os metadados

As metas do `<head>` são todas obrigatórias, e `estrutura.metadados` acusa a que faltar:

| meta | o que faz |
|---|---|
| `unidade` | escolhe o logo e o nome do instituto na faixa de marca da capa e do encerramento |
| `disciplina` | entra no rodapé de todo slide e na linha de metadados da capa |
| `aula` | idem; é um número ou um texto curto, como `4` ou `3b` |
| `data` | em `AAAA-MM-DD`; o sistema a escreve por extenso curto, no idioma da aula |
| `professor` | entra na linha de metadados da capa |

Esta é a única tabela do guia que não é gerada, porque o contrato tem os nomes das metas mas não tem a coluna da direita, que é justamente o que há para ler aqui. Em lugar do gerador, uma guarda: os testes do sistema comparam os nomes desta tabela com `contrato.metadados` e cobram que sejam os mesmos, na mesma ordem.

`unidade` é uma chave do inventário de marcas do sistema; se a sua não estiver lá, o validador recusa o valor e diz, na mensagem, quais existem. Uma unidade nova entra com uma linha nesse inventário e o arquivo do logo, sem tocar em código.

`disciplina`, `aula` e `professor` têm um tamanho máximo, porque cabem numa linha de rodapé ou de capa; quando um passa, `limites.metadado` diz de quanto era o limite e de quanto foi o seu texto. Não há por que adivinhar: escreva e deixe o validador medir.

O `lang` do `<html>` escolhe o idioma dos rótulos que o sistema escreve — "Bloco", "Aula", os meses da data. Uma aula em inglês é o mesmo arquivo com `lang="en"`.

## A tag do runtime

A linha do `<script>` no `<head>` é a única que muda de um fluxo de trabalho para o outro. No esqueleto acima ela aparece como o `aula-usp pacotes` a escreve: o endereço da CDN, com a versão exata e a soma de integridade que o sistema mediu. Numa aula sua ela é essa mesma linha — nos fluxos com terminal, `aula-usp servir` e `aula-usp build` a reconhecem pelo `src` terminado em `/aula-usp.js` e a trocam, respectivamente, pelo runtime local e pelo motor embutido. O capítulo do seu fluxo diz o que esperar — **O fluxo com terminal**, **O fluxo no chat, sem terminal**, **A aula como artifact do Claude** ou **A aula pelo ChatGPT**.

**A versão e o hash são reais; o endereço é que ainda não resolve:** o pacote não está publicado no npm, e a publicação é da fase 3. O modelo, os exemplos e o espécime do repositório já trazem a tag fixada. Até a publicação, a aula se experimenta com `aula-usp servir`; **O fluxo no chat, sem terminal** conta o resto.

Duas propriedades dessa tag. A primeira já está escrita nela: a versão é exata e vem com `integrity`, de modo que uma aula fique presa à versão com que foi feita e não mude de aparência sozinha; atualizar é trocar a tag — e ela passa a valer de fato no dia em que o endereço resolver. A segunda vale hoje, aqui e no runtime local: se o runtime não carregar — sem internet, por exemplo —, o HTML aparece cru, feio mas legível, em vez de aparecer em branco.

## Os blocos

Uma aula não é uma pilha de slides: é um punhado de blocos, e é essa estrutura que o aluno vê no mapa de quadrados do cabeçalho.

Cada `<section data-layout="abertura">` abre um bloco, na ordem em que aparece. Os slides que vêm depois dela pertencem a ele, até a próxima abertura. Os slides entre a capa e a primeira abertura são a introdução e não têm quadrado próprio.

O sistema tira daí, sozinho: a numeração dos blocos, o rótulo do cabeçalho, o mapa de quadrados com o estado de cada bloco, o contador de slides e o roteiro da capa.

Duas regras para conhecer antes de planejar a aula:

- **o número de blocos tem uma faixa confortável**, e `estrutura.blocos` avisa fora dela. Com blocos de menos, não há mapa que oriente; com blocos demais, a fileira de quadrados não cabe e vira um contador em texto. É aviso, não erro: a aula ainda monta.
- **o título da abertura é curto**, porque ele vira o rótulo em caixa alta do cabeçalho e o nome sob o quadrado. Quando ele passa do tamanho que cabe ali, `estrutura.nome-curto` cobra um `data-curto` na seção:

```html
<section data-layout="abertura" id="o-papel-de-eta" data-curto="Taxa">
  <h2>O papel de \(\eta\)</h2>
  <p class="pergunta">Por que \(\eta\) decide o tamanho de cada passo?</p>
</section>
```

Do espécime: `especime/matematica.html#o-papel-de-eta`. Sem `data-curto`, o nome curto é o próprio título.

## O que todo slide tem

**Um `id`**, em minúsculas, números e hífens. Ele é o endereço do slide: a barra do navegador mostra `#<id>` conforme você navega, e recarregar a página volta ao mesmo slide. Um slide sem `id` ganha um gerado do título e um aviso (`estrutura.id-ausente`); capa e encerramento são exceção, porque o sistema já sabe como chamá-los. Dois slides com o mesmo `id` são erro (`estrutura.id-duplicado`).

**As notas do apresentador**, em `<aside class="notas">`, como último filho da seção:

```html
<aside class="notas">Dar um minuto de silêncio antes de revelar a resposta. Errar o sinal é o engano mais comum, e é melhor que ele apareça aqui do que na lista.</aside>
```

Da aula-exemplo: `exemplo.html#exercicio`. As notas não aparecem no slide — só na janela do apresentador — e não contam no orçamento de palavras do slide. Escreva nelas o que você vai dizer e não está escrito na tela; `estrutura.notas-ausentes` avisa quando um slide de conteúdo, afirmação, figura ou demo não tem nenhuma.

## Revelar por passos

Qualquer elemento do corpo com `data-passo` só aparece quando você avança um passo dentro do slide. Há duas formas, e elas não se misturam no mesmo slide.

**Um a um**, com o atributo vazio — cada elemento marcado é um passo, na ordem em que está escrito:

```html
<ol class="passos">
  <li>Calcule o erro.</li>
  <li data-passo>Calcule o gradiente com <code>grad(E)</code>.</li>
  <li data-passo>Ande <strong>contra</strong> o gradiente.</li>
</ol>
```

**Em grupos**, com um número — tudo que tem o mesmo número aparece junto, e os grupos vêm na ordem dos números, não na ordem do documento:

```html
<div class="colunas" data-grade="4-4-4">
  <div><p data-passo="2">Primeira coluna.</p></div>
  <div><p data-passo="1">Segunda coluna.</p></div>
  <div><p data-passo="2">Terceira coluna.</p></div>
</div>
```

Do espécime: `especime/componentes.html#marcadores-e-passos` e `especime/index.html#grade-4-4-4`. Misturar as duas formas num slide é erro (`estrutura.passos-mistos`), porque o sistema não teria como ordenar o que não tem número contra o que tem.

No PDF, um slide com passos sai numa página só, inteiro. Quando a revelação **é** o conteúdo — uma derivação, uma resposta que vem depois da pergunta —, marque a seção com `data-pdf="passos"` e o PDF ganha uma página por estado:

```html
<section data-layout="conteudo" id="passo-a-passo" data-pdf="passos">
```

Do espécime: `especime/matematica.html#passo-a-passo`.

## O que não entra no arquivo

- **Cromo escrito à mão** — cabeçalho, rodapé, número de slide, logo, mapa. Tudo isso o sistema desenha; escrito de novo, aparece duas vezes.
- **`style`, em qualquer forma**, e qualquer elemento ou atributo fora do contrato. É `vocabulario.style` e companhia, e a correção é sempre usar o layout ou o componente que faz aquilo.
- **`script` dentro de uma `section`**, fora o `script` de dados dentro de `figure.grafico` ou `figure.diagrama`. O registro de uma demo mora fora dos slides (**Gráficos, diagramas e demos**).
- **Conteúdo que não cabe.** Os limites do contrato estão medidos para a projeção: quando um deles acusa, a resposta é cortar ou dividir o slide, nunca reduzir o texto. Quanto é "não cabe", em cada caso, está na seção seguinte.

O que pode entrar em cada layout, na ordem, está em **Layouts**; o trecho pronto de cada componente, em **Componentes**.

## Quanto cabe

Esta é a tabela dos números: todo limite que o contrato declara, com a medida e o que ela mede. Ela sai de `contrato/contrato.json` por `npm run guia`, e é do mesmo contrato que o validador lê — o que está aqui é o que ele vai cobrar. Escrever dentro dos limites desde a primeira versão sai mais barato do que descobri-los um a um pelo que o validador recusou.

Três avisos de leitura:

- **um segmento é o trecho entre `<br>`.** Um título de duas linhas tem dois segmentos, e o limite de caracteres vale para cada um separadamente, não para a soma. O limite de linhas é o irmão dele medido na página desenhada, quando o título quebra sozinho.
- **no código, a coluna é o caractere:** o limite de colunas de um `pre` é o comprimento da linha mais longa, e o de uma `table` é o número de colunas dela.
- **aqui está o número; a regra que o cobra e a frase que ela imprime estão em **O validador**.** A mensagem de um limite traz sempre a medida encontrada e, entre parênteses, o máximo — de modo que você saiba de quanto está passando.

<!-- gerado:tabela-de-limites -->
| limite | quanto cabe | onde |
|---|---|---|
| `blocos.min` | no mínimo 2 | os blocos da aula |
| `blocos.maxFileira` | no máximo 8 na fileira de quadrados do cabeçalho | os blocos da aula |
| `capa.h1.caracteresPorSegmento` | no máximo 23 caracteres por segmento | o título da capa |
| `capa.h1.segmentos` | no máximo 2 segmentos | o título da capa |
| `capa.h1.linhas` | no máximo 2 linhas | o título da capa |
| `abertura.h2.caracteresPorSegmento` | no máximo 20 caracteres por segmento | o título da abertura |
| `abertura.h2.segmentos` | no máximo 2 segmentos | o título da abertura |
| `abertura.h2.linhas` | no máximo 2 linhas | o título da abertura |
| `abertura.dataCurto.caracteres` | no máximo 10 caracteres | o `data-curto` da abertura |
| `abertura.h2.caracteresSemDataCurto` | no máximo 10 caracteres, quando a abertura não traz `data-curto` | o título da abertura |
| `pergunta.caracteres` | no máximo 90 caracteres | a `p.pergunta` da abertura |
| `titulo.caracteresPorSegmento` | no máximo 50 caracteres por segmento | o título dos outros layouts |
| `titulo.segmentos` | no máximo 2 segmentos | o título dos outros layouts |
| `titulo.linhas` | no máximo 2 linhas | o título dos outros layouts |
| `lide.caracteres` | no máximo 120 caracteres | o `p.lide` |
| `corpo.palavras` | no máximo 90 palavras | o corpo do slide de conteúdo, sem título, lide, código, TeX nem notas |
| `coluna.palavras` | no máximo 60 palavras | cada coluna de `div.colunas` |
| `lista.itens` | no máximo 5 itens | cada `ul` ou `ol.passos` |
| `destaque.maxPorSlide` | no máximo 2 por slide | os `aside.destaque` |
| `alerta.maxPorSlide` | no máximo 1 por slide | os `aside.alerta` |
| `rotulo.caracteres` | no máximo 24 caracteres | o `data-rotulo` |
| `afirmacao.caracteres` | no máximo 120 caracteres | o `p.afirmacao` |
| `fonte.caracteres` | no máximo 80 caracteres | o `p.fonte` |
| `legenda.caracteres` | no máximo 140 caracteres | o `figcaption` |
| `sintese.itens` | no máximo 3 itens | a `ol.sintese` do encerramento |
| `sintese.caracteresPorItem` | no máximo 80 caracteres por item | a `ol.sintese` do encerramento |
| `proxima.caracteres` | no máximo 90 caracteres | o `p.proxima` do encerramento |
| `codigo.linhas` | no máximo 16 linhas | cada `pre` |
| `codigo.colunas` | no máximo 64 colunas | cada `pre` |
| `tabela.linhasDeDados` | no máximo 8 linhas de dados | cada `table` |
| `tabela.colunas` | no máximo 6 colunas | cada `table` |
| `diagrama.nos` | no máximo 15 nós | cada `figure.diagrama` |
| `grafico.series` | no máximo 3 séries | cada `figure.grafico` |
| `saida.megabytes` | no máximo 10 megabytes | o arquivo que `aula-usp build` escreve |
<!-- /gerado -->

## O vocabulário inteiro

A seção acima diz o que não entra. Esta é a lista do que entra — todo elemento, toda classe e todo atributo que o corpo de uma aula aceita, com os valores de cada atributo. Ela sai de `contrato/contrato.json` por `npm run guia`, e é do mesmo contrato que o validador lê: o que não estiver aqui, as regras `vocabulario.*` acusam.

Três avisos de leitura:

- **`section` não está na lista de elementos**, porque ela não é conteúdo: ela é o slide. O que cada `data-layout` aceita dentro dela está em **Layouts**.
- **na tabela de classes, `em` é o elemento que recebe a classe e `só dentro de` é o ancestral obrigatório.** `enunciado` é classe de `div`, e um `div.enunciado` fora de um `div.exercicio` é erro.
- **na tabela de atributos, "na forma" traz a expressão exata que o validador aplica ao valor.** Ela é para quem precisa da forma literal; o que ela quer dizer em português está no arquivo do componente. O `src` de uma imagem, por exemplo, é um caminho em `img/`, um URI `data:` ou um endereço `https://`, e é isso que **Componentes** diz.

<!-- gerado:tabela-de-vocabulario -->
### Elementos

`h1`, `h2`, `p`, `br`, `strong`, `em`, `sub`, `sup`, `a`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `figure`, `figcaption`, `img`, `svg`, `pre`, `code`, `aside`, `div`, `span`; e `script`, só dentro de `figure.grafico` ou `figure.diagrama`.

### Classes

| classe | em | só dentro de |
|---|---|---|
| `.sinal` | `span` | `h1`, `h2` |
| `.lide` | `p` | — |
| `.pergunta` | `p` | — |
| `.afirmacao` | `p` | — |
| `.fonte` | `p` | — |
| `.proxima` | `p` | — |
| `.colunas` | `div` | — |
| `.destaque` | `aside`, `tr`, `td` | — |
| `.quadro` | `aside` | — |
| `.alerta` | `aside` | — |
| `.exercicio` | `div` | — |
| `.enunciado` | `div` | `div.exercicio` |
| `.resposta` | `div` | `div.exercicio` |
| `.passos` | `ol` | — |
| `.sintese` | `ol` | — |
| `.demo` | `div` | — |
| `.estatico` | `img` | `div.demo` |
| `.notas` | `aside` | — |
| `.grafico` | `figure` | — |
| `.diagrama` | `figure` | — |

### Atributos

| atributo | em | valores |
|---|---|---|
| `class` | qualquer elemento | as classes da tabela acima |
| `data-passo` | qualquer elemento | na forma `^([1-9][0-9]*)?$` |
| `lang` | qualquer elemento | na forma `^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$` |
| `data-layout` | `section` | `capa`, `abertura`, `conteudo`, `afirmacao`, `figura`, `demo`, `encerramento` |
| `id` | `section` | na forma `^[a-z0-9][a-z0-9-]*$` |
| `data-curto` | `section` | texto livre; só no layout `abertura` |
| `data-pdf` | `section` | `passos` |
| `data-grade` | `div.colunas` | `12`, `6-6`, `8-4`, `4-8`, `4-4-4` |
| `data-demo` | `div.demo` | na forma `^[a-z][a-z0-9-]*$` |
| `data-opcoes` | `div.demo` | um objeto JSON |
| `data-captura-ms` | `div.demo` | na forma `^[0-9]+$` |
| `data-rotulo` | `aside.destaque` | texto livre |
| `data-rotulo` | `aside.quadro` | texto livre |
| `data-rotulo` | `aside.alerta` | texto livre |
| `data-foto` | `figure` | `pb` |
| `src` | `img` | na forma `^(?:img/(?!(?:[^/]*/)*(?:\.\|%2[eE]){2}(?:/\|$))[^\\]+$\|data:image/[a-z0-9.+-]+[;,]\|[hH][tT][tT][pP][sS]://)` |
| `alt` | `img` | texto livre; obrigatório |
| `data-lang` | `pre` | `python`, `r`, `sql`, `javascript`, `bash`, `json`, `latex` |
| `data-linhas` | `pre` | na forma `^[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*$` |
| `data-numeros` | `pre` | sem valor |
| `colspan` | `th` | na forma `^[1-9][0-9]?$` |
| `rowspan` | `th` | na forma `^[1-9][0-9]?$` |
| `scope` | `th` | `row`, `col` |
| `colspan` | `td` | na forma `^[1-9][0-9]?$` |
| `rowspan` | `td` | na forma `^[1-9][0-9]?$` |
| `href` | `a` | na forma `^(#\|https://)` |
| `type` | `script` | `application/json`, `text/vnd.graphviz` |

### Grades

| `data-grade` | `div` filhos |
|---|---|
| `12` | 1 |
| `6-6` | 2 |
| `8-4` | 2 |
| `4-8` | 2 |
| `4-4-4` | 3 |

### Dentro de um `<svg>`

Elementos: `svg`, `g`, `path`, `line`, `polyline`, `polygon`, `rect`, `circle`, `ellipse`, `text`, `tspan`, `title`, `desc`, `defs`, `marker`, `use`, `clipPath`.

Atributos: `xmlns`, `viewBox`, `width`, `height`, `d`, `x`, `y`, `x1`, `y1`, `x2`, `y2`, `cx`, `cy`, `r`, `points`, `transform`, `fill`, `stroke`, `stroke-width`, `stroke-dasharray`, `stroke-linecap`, `stroke-linejoin`, `marker-start`, `marker-end`, `markerWidth`, `markerHeight`, `refX`, `refY`, `orient`, `text-anchor`, `dominant-baseline`, `font-size`, `font-weight`, `clip-path`, `id`, `href`, `role`, `aria-label`, `class`; e `rx`, `ry` em `ellipse`.

Classes: `mono`. Cores: `#0A0A0A`, `#666666`, `#D9D9D9`, `#1094AB`, `#FCB421`, `#FFFFFF`, `none`. O `href` aponta só para um id da própria figura (`^#`).

### Proibidos e reservados

Elementos proibidos: `style`, `iframe`, `video`, `audio`, `font`, `foreignObject`, `image`, `linearGradient`, `radialGradient`, `filter`, `mask`, `pattern`.

Atributos proibidos: `style`, `opacity`, `fill-opacity`, `stroke-opacity`, e qualquer um que comece com `on`.

Comandos de TeX proibidos: `\color`, `\textcolor`, `\colorbox`, `\fcolorbox`, `\htmlStyle`, `\htmlClass`, `\htmlId`, `\htmlData`, e o que casar `\\(red|orange|yellow|green|blue|purple|pink|gray|grey|teal|gold|maroon|mint)[A-H]?(?![a-zA-Z])`.

Classes do sistema, que o sistema escreve e o autor não: `palco`, `slide`, `area`, `cabecalho`, `rotulo`, `mapa`, `quadrado`, `visto`, `atual`, `futuro`, `contador`, `rodape`, `metadados-capa`, `roteiro`, `faixa-de-marca`, `marca-unidade`, `marca-usp`, `numero-bloco`, `fileira`, `nome-curto`, `bloco-n-de-m`, `painel`, `ativo`, `folha`, `modo-palco`, `painel-titulo`, `painel-corpo`, `grupo`, `grupo-titulo`, `cartoes`, `cartao`, `cartao-numero`, `cartao-titulo`, `teclas`, `aviso`, `modo-apresentador`, `apresentador`, `miniatura`, `quadro-miniatura`, `fim-da-aula`, `painel-apresentador`, `posicao`, `cronometro`, `tempo`, `relogio`, `notas-apresentador`, `captura-demo`, `demo-substituta`, `imprimindo`, `numerica`, `equacao`, `tex-invalido`, `linha`, `marcada`, `palavra-chave`, `comentario`, `achados`, `copiar`, `grade`, `serie`, `serie-traco`, `serie-rotulo`, `eixo`, `eixo-x`, `eixo-y`, `eixo-titulo`, `marca`, `no`, `aresta`, `agrupamento`, `foco`, `controle`, `leitura`.
<!-- /gerado -->

<!-- guia/20-layouts.md -->

# Layouts

Um layout é o papel de um slide. O `data-layout` da seção decide o que ela aceita, em que ordem, e o que o sistema desenha em volta. Não há layout livre: tudo que uma aula mostra cabe nos que estão na tabela abaixo.

A restrição é de propósito. O que se ganha com ela é que a aula inteira tem um ritmo só, que o cromo sai de graça e sempre igual, e que o slide cheio demais é acusado enquanto você escreve, e não na sala.

## A gramática dos layouts

Cada linha é um layout: o valor de `data-layout`, o que a seção aceita — **na ordem em que a coluna do meio lista** — e o cromo que o sistema desenha naquele layout.

<!-- gerado:tabela-de-layouts -->
| layout | conteúdo, na ordem | cromo automático |
|---|---|---|
| `capa` | `h1` | metadados-capa, roteiro, faixa-de-marca |
| `abertura` | `h2`, `p.pergunta` (opcional) | numero-bloco, fileira, bloco-n-de-m |
| `conteudo` | `h2`, `p.lide` (opcional), `div.colunas` **ou** um bloco de corpo (um ou mais) | cabecalho, rodape |
| `afirmacao` | `p.afirmacao`, `p.fonte` (opcional) | cabecalho, rodape |
| `figura` | `h2` (opcional), `figure` | cabecalho, rodape |
| `demo` | `h2`, `div.demo` | cabecalho, rodape |
| `encerramento` | `h2`, `ol.sintese`, `p.proxima` (opcional) | cabecalho, faixa-de-marca |
<!-- /gerado -->

Como ler a tabela:

- **a ordem é literal.** O `h2` vem antes do `p.lide`, que vem antes do corpo. Elemento na ordem errada, ou de um tipo que o layout não aceita, é `estrutura.fora-do-layout`.
- **`(opcional)` é o que pode faltar.** Tudo o mais na coluna é obrigatório, e a falta é `estrutura.obrigatorio`.
- **`um bloco de corpo`** é qualquer um dos blocos de **Componentes**: parágrafo, lista, campo, exercício, tabela, código, figura ou equação em destaque.
- **`ou`** separa alternativas que não se somam: no `conteudo`, ou uma `div.colunas`, ou blocos de corpo soltos — não os dois.
- **cromo automático** é a lista do que você **não** escreve. Ela não é conteúdo permitido: é o que já vem pronto.

`aside.notas` não aparece na tabela porque não entra na sequência de nenhum layout: pode vir em qualquer slide, e o lugar habitual é o fim da seção.

A tabela sai de `contrato/contrato.json` por `npm run guia`, e é do mesmo contrato que o validador lê as regras. Editá-la à mão muda o guia por uma geração, até alguém rodar o gerador; o que muda o sistema é o contrato.

## Quando usar cada layout

**`capa`** abre a aula, e traz só o título. A linha de metadados, o roteiro dos blocos e a faixa de marca com os logos vêm do `<head>` e das aberturas. Um `<br>` seguido de `<span class="sinal">` parte o título em duas linhas e põe a segunda em azul — é o subtítulo.

**`abertura`** abre um bloco, e é a promessa que os slides seguintes cumprem. O título é curto porque vira o rótulo do cabeçalho e o nome sob o quadrado do mapa (**A estrutura de uma aula**); a pergunta, opcional, diz o que o bloco responde. Escrita como pergunta de verdade, ela dá ao aluno um motivo para prestar atenção no bloco inteiro.

**`conteudo`** é o slide de trabalho, e é onde a aula passa a maior parte do tempo. Título, lide opcional, e o corpo — em colunas ou solto.

**`afirmacao`** é uma frase sozinha na tela, grande, sem título, com a origem opcional embaixo em `p.fonte`. Serve para virar a chave da aula: você lê em voz alta, para, e deixa a turma ler. Gasta um slide inteiro numa frase, e é esse o efeito.

**`figura`** dá à figura a zona de conteúdo inteira, com a legenda embaixo. O título é opcional, porque muitas vezes a legenda já diz o que é. Uma figura por slide: para figura ao lado de texto, o layout é `conteudo` com colunas.

**`demo`** dá a mesma área a uma demo interativa, que você conduz ao vivo. É uma demo por slide, e o que sai no PDF é a `img.estatico` que você escreve ou, sem ela, `capturar()` — os dois já na impressão do navegador — ou, faltando ambos, a foto que o `aula-usp build` tira da demo, como no exemplo abaixo. Impressa pelo navegador sem nenhum dos dois, a demo sai sem nada, e `recursos.demo-sem-estatico` avisa (**Gráficos, diagramas e demos**).

**`encerramento`** fecha a aula com a síntese — os pontos que o aluno leva — e, opcionalmente, o anúncio da próxima. O cabeçalho volta com todos os blocos marcados como vistos, e a faixa de marca toma o lugar do rodapé.

## O corpo de um slide de conteúdo

Ou o corpo é **uma** `div.colunas`, ou é uma sequência de blocos de corpo soltos, um embaixo do outro. As duas formas não se misturam no mesmo slide, e não há duas `div.colunas` no mesmo slide: quando o conteúdo pede isso, são dois slides.

A `div.colunas` tem um `data-grade` e **um `div` filho para cada parte da grade** — `estrutura.colunas` compara os dois e acusa a diferença. Cada `div` filho contém blocos de corpo, e só isso:

```html
<div class="colunas" data-grade="8-4">
  <div>
    <p>A coluna larga tem oito colunas do grid, com 760 px. Ela recebe o argumento principal do slide.</p>
  </div>
  <div>
    <p>A estreita tem quatro colunas, com 368 px.</p>
  </div>
</div>
```

Do espécime: `especime/index.html#grade-8-4`. Os valores de `data-grade` são as divisões do grid em números de colunas que somam a largura útil, e estão todos na tabela de vocabulário de **A estrutura de uma aula**, cada um com o número de `div` filhos que pede. Um valor que não exista no contrato é `vocabulario.atributo`.

A escolha da grade é de significado, não de estética: colunas iguais quando as duas partes têm o mesmo peso — antes e depois, texto e figura —, e desiguais quando uma argumenta e a outra comenta.

Duas contas correm no corpo, e as duas acusam por cortar, nunca por encolher a letra: o total de palavras do slide (`limites.palavras-corpo`) e o de cada coluna (`limites.palavras-coluna`). O total **não** conta o título nem o lide, que têm limite próprio, nem o que está em código, em matemática ou nas notas — é o texto de leitura do corpo, e só ele.

## Um exemplo de cada layout

Um por layout, extraído dos decks de `especime/` que validam **sem nenhum achado** — nem erro, nem aviso. É o que torna seguro o que vem a seguir: copie a forma, porque a forma abaixo é a que o validador aprova em silêncio. O texto é de demonstração e existe para exercitar o layout.

<!-- gerado:exemplos-por-layout -->
#### `capa`

```html
<section data-layout="capa">
  <h1>Espécime Aula USP<br><span class="sinal">layouts e cromo</span></h1>
</section>
```

Extraído de `especime/index.html`.

#### `abertura`

```html
<section data-layout="abertura" id="tabelas">
  <h2>Tabelas</h2>
  <p class="pergunta">Como comparar números lado a lado?</p>
</section>
```

Extraído de `especime/componentes.html`.

#### `conteudo`

```html
<section data-layout="conteudo" id="grade-4-8">
  <h2>Grade 4-8</h2>
  <div class="colunas" data-grade="4-8">
    <div><p>Estreita à esquerda.</p></div>
    <div><p>Larga à direita, com 760 px.</p></div>
  </div>
  <aside class="notas">A mesma grade de antes, espelhada: a coluna estreita vem primeiro quando ela é a pergunta.</aside>
</section>
```

Extraído de `especime/index.html`.

#### `afirmacao`

```html
<section data-layout="afirmacao" id="afirmacao">
  <p class="afirmacao">Todo elemento gráfico carrega informação: orientação, progresso ou destaque.</p>
  <p class="fonte">Princípio do Aula USP</p>
  <aside class="notas">Ler a afirmação em voz alta e parar. O slide inteiro é uma frase, e a fonte embaixo diz de onde ela vem.</aside>
</section>
```

Extraído de `especime/index.html`.

#### `figura`

```html
<section data-layout="figura" id="grafico-notas">
  <h2>Nota média por prova</h2>
  <figure class="grafico">
    <script type="application/json">
    {"tipo":"linha","dados":{"prova":[1,2,3],"turmaA":[6.2,7.0,7.8],"turmaB":[5.5,6.1,6.4]},"x":"prova","y":["turmaA","turmaB"],"foco":"turmaA","eixos":{"x":"prova","y":"nota"}}
    </script>
    <figcaption>Duas turmas ao longo de três provas; a turma em foco sai em azul, a outra em tinta.</figcaption>
  </figure>
  <aside class="notas">O JSON descreve a série; o SVG é desenhado pelo mesmo módulo no navegador e no build.</aside>
</section>
```

Extraído de `especime/componentes.html`.

#### `demo`

```html
<section data-layout="demo" id="demo-controles">
  <h2>Controles do sistema, fotografados pelo build</h2>
  <div class="demo" data-demo="soma" data-opcoes='{"passo": 3}' data-captura-ms="500"></div>
  <aside class="notas">A demo não tem img.estatico nem capturar(): no build, o Chrome a fotografa meio segundo depois de iniciar, e é essa foto que sai no PDF.</aside>
</section>
```

Extraído de `especime/componentes.html`.

#### `encerramento`

```html
<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>As seções viram slides.</li>
    <li>O mapa de blocos vem das aberturas.</li>
  </ol>
  <p class="proxima">Próximo marco: demos, apresentador e impressão.</p>
</section>
```

Extraído de `especime/index.html`.
<!-- /gerado -->

Repare no que **não** está em nenhum deles: cabeçalho, rodapé, número do slide, mapa de blocos, logo. O fonte de um slide só tem o conteúdo do slide.

O trecho pronto de cada bloco de corpo — parágrafo, lista, campo, exercício, tabela, código, figura e equação em destaque — está em **Componentes**.

<!-- guia/30-componentes.md -->

# Componentes

Os **blocos de corpo** são as peças com que se preenche um slide de conteúdo — soltas uma embaixo da outra, ou dentro de um `div` de uma `div.colunas` (**Layouts**). O contrato os lista nesta ordem, e são estes onze:

`p`, `ul`, `ol.passos`, `aside.destaque`, `aside.quadro`, `aside.alerta`, `div.exercicio`, `table`, `pre`, `figure` e `tex-destaque` — que, apesar do nome, **não é uma tag**: é a equação em destaque, escrita como texto solto entre `\[` e `\]`. A última seção deste arquivo trata dela.

Cada um tem aqui o seu trecho pronto, tirado de um arquivo que valida — o espécime, o modelo ou a aula-exemplo —, com o endereço da seção de onde veio. Copie o trecho e troque o conteúdo.

Dois hábitos valem para todos: **não escolha o componente pela aparência, escolha pelo papel** — o amarelo não é "para chamar atenção", é o campo do que o aluno tem de levar embora —, e **quando um limite acusar, corte ou divida o slide**, nunca reduza o texto.

## Parágrafo

O bloco padrão, e o mais fácil de usar mal. O parágrafo de um slide é curto porque o orçamento de palavras é do slide inteiro, não dele: cada frase que você escreve aqui sai do espaço de outro bloco.

```html
<p class="lide">Cada escolha de pesos tem um erro, e essas alturas juntas formam uma superfície.</p>
<p>Treinar é procurar o fundo dessa superfície sem poder enxergá-la inteira. Do ponto onde está, o modelo conhece a altura e a inclinação sob os pés, e nada além disso.</p>
```

Da aula-exemplo: `exemplo.html#superficie`. O `p.lide` não é um bloco de corpo: ele pertence à sequência do layout `conteudo`, vem logo depois do título e entrega a ideia inteira na primeira frase — o corpo só a desenvolve.

Dentro do parágrafo cabem `strong`, `em`, `code`, `sub`, `sup` e `a`:

```html
<p>A atualização <code>w -= lr * grad</code> repete a cada passo, e a primeira linha deste parágrafo tem a mesma altura que a segunda.</p>
<p>O peso w<sub>ij</sub> liga a unidade i à unidade j, e o custo de uma camada cresce com n<sup>2</sup>, então esta linha quebra e as duas linhas ficam com a mesma altura.</p>
```

Do espécime: `especime/componentes.html#texto-em-linha`. A ênfase é por peso (`strong`); o itálico (`em`) fica para variáveis citadas no texto e termos estrangeiros. Em `a`, o `href` começa com `#`, para outro slide da aula, ou com `https://`.

## Lista com marcadores

Itens sem ordem entre si. Se a ordem importa, a lista é de passos.

```html
<ul>
  <li>O erro mede a distância ao alvo.</li>
  <li>O gradiente aponta a subida.</li>
  <li>A taxa controla o passo.</li>
  <li>Os pesos começam ao acaso.</li>
  <li>Um item longo quebra a linha, e a segunda linha segue o texto.</li>
</ul>
```

Do espécime: `especime/componentes.html#marcadores-e-passos`. Há um limite de itens por lista (`limites.itens`), e ele quase nunca é o problema de verdade: uma lista que estoura costuma ser um slide com duas ideias dentro.

## Passos numerados

Uma sequência: o numeral grande é parte da composição, e a régua entre os itens vem do sistema.

```html
<ol class="passos">
  <li>Calcule o erro.</li>
  <li data-passo>Calcule o gradiente com <code>grad(E)</code>.</li>
  <li data-passo>Ande <strong>contra</strong> o gradiente.</li>
  <li data-passo>Repita até o erro parar de cair.</li>
  <li data-passo>Um passo longo também quebra a linha e segue o texto.</li>
</ol>
```

Do espécime: `especime/componentes.html#marcadores-e-passos`. Os itens com `data-passo` aparecem um a um conforme você avança (**A estrutura de uma aula**); o primeiro, sem o atributo, já está na tela quando o slide abre. É o jeito de fazer a turma pensar no passo seguinte antes de vê-lo.

## Destaque

Campo amarelo com texto preto, e um rótulo opcional em maiúsculas. É o único destaque forte da paleta: guarde-o para a definição, o resultado ou a fórmula que o aluno tem de levar embora.

```html
<aside class="destaque" data-rotulo="Definição">Superfície de erro: a altura \( E(w) \) sobre cada escolha de pesos \( w \).</aside>
```

Da aula-exemplo: `exemplo.html#superficie`. Há um limite por slide (`limites.destaques`), e a razão é aritmética: destacar tudo é não destacar nada. O `data-rotulo` é curto — ele também tem limite (`limites.rotulo`) — e diz que tipo de coisa vem ali: Definição, Resultado, Exemplo.

## Quadro

Contorno em régua, sem campo. É o destaque de segunda ordem: o exemplo numérico, a observação lateral, o caso particular. Convive com um destaque no mesmo slide sem competir com ele.

```html
<aside class="quadro">Com taxa 0,1 e gradiente 4, o peso anda 0,4 no sentido oposto.</aside>
```

Do espécime: `especime/componentes.html#destaque-quadro-alerta`. Sem `data-rotulo`, o quadro não mostra rótulo nenhum.

## Alerta

Campo preto com texto branco: o cuidado, o engano comum, o que não fazer. Um por slide (`limites.alertas`) — dois alertas na mesma tela e nenhum dos dois alerta.

```html
<aside class="alerta" data-rotulo="Cuidado">Passo longo demais atravessa o vale, e o erro sobe em vez de cair.</aside>
```

Da aula-exemplo: `exemplo.html#taxa`.

## Exercício

Enunciado e resposta, com a resposta escondida até você revelá-la.

```html
<div class="exercicio">
  <div class="enunciado">
    <p>Com \( \eta = 0{,}1 \) e gradiente \( 4 \), quanto o peso anda em um passo?</p>
  </div>
  <div class="resposta" data-passo>
    <p>Anda \( 0{,}4 \) no sentido oposto ao gradiente.</p>
  </div>
</div>
```

Da aula-exemplo: `exemplo.html#exercicio`. O `div.enunciado` é obrigatório e vem primeiro; o `div.resposta` é opcional e vem depois. O `data-passo` na resposta é o que dá à turma o minuto de silêncio — sem ele, a resposta já está na tela junto com a pergunta.

## Tabela

Para comparar números lado a lado. `thead` com os títulos, `tbody` com os dados, `scope` dizendo se o cabeçalho é de linha ou de coluna:

```html
<table>
  <thead>
    <tr><th scope="col">taxa</th><th scope="col">épocas até parar</th></tr>
  </thead>
  <tbody>
    <tr><td>0,01</td><td>840</td></tr>
    <tr><td>0,1</td><td>95</td></tr>
    <tr><td>1,0</td><td>diverge</td></tr>
  </tbody>
</table>
```

Do espécime: `especime/componentes.html#tabela-na-coluna`. O alinhamento e os algarismos de mesma largura vêm do sistema: números à direita, texto à esquerda, réguas no topo e na base.

Uma linha ou uma célula pode receber o campo amarelo, e é assim que se aponta o resultado sem dizer "repare na terceira linha":

```html
<tr class="destaque"><th scope="row">Floresta</th><td>1</td><td>6,2%</td><td>4,7</td><td>R$ 400</td><td>+2,2</td></tr>
```

Do espécime: `especime/componentes.html#tabela`, que também mostra o `td.destaque` de uma célula só. A tabela tem limite de linhas de dados e de colunas (`limites.tabela`): a tabela de slide é a que se lê de longe em alguns segundos, não a da lista de exercícios.

## Código

Um `pre` com `data-lang`, numa das linguagens do contrato — `recursos.linguagem` recusa as demais, e a ação da regra, na tabela de **O validador**, lista as aceitas.

```html
<pre data-lang="sql" data-linhas="2" data-numeros>
SELECT turma, AVG(nota) AS media
FROM provas  -- só a P1
WHERE nota IS NOT NULL
GROUP BY turma
ORDER BY media DESC;
</pre>
```

Do espécime: `especime/codigo.html#r-e-sql`. Três coisas a reparar:

- **o `<pre>` não é indentado no fonte.** O espaço dentro dele é conteúdo, e a indentação do arquivo entraria no código na tela.
- **`data-linhas` marca em amarelo as linhas que importam** — uma linha, uma faixa de linhas, ou várias das duas coisas separadas por vírgula. O destaque de sintaxe é monocromático de propósito: negrito nas palavras-chave, cinza nos comentários. A cor é reservada para a linha que você quer que a turma olhe.
- **`data-numeros`, sem valor, numera as linhas.** Use quando for falar "na linha três".

Há limite de linhas e de colunas (`limites.codigo-linhas`, `limites.codigo-colunas`): o que não couber num slide vira dois, ou um trecho menor. **Matemática e código** trata do resto.

## Figura

Um `figure` com **exatamente um** `img` ou `svg`, e um `figcaption` opcional:

```html
<figure>
  <svg viewBox="0 0 760 320" role="img" aria-label="Três barras crescentes">
    <rect x="0" y="200" width="200" height="120" fill="#0A0A0A"/>
    <rect x="280" y="120" width="200" height="200" fill="#1094AB"/>
    <rect x="560" y="0" width="200" height="320" fill="#FCB421"/>
  </svg>
  <figcaption>Três barras crescentes.</figcaption>
</figure>
```

Do espécime: `especime/componentes.html#figura-no-corpo`. Dentro de uma coluna, a figura ocupa a largura da coluna; sozinha no layout `figura`, ocupa a zona de conteúdo inteira.

O SVG escrito à mão tem um vocabulário próprio no contrato — uma lista de elementos e de atributos, e as cores dos tokens, como no trecho acima. Qualquer outra cor em `fill` ou `stroke` é `vocabulario.cor-svg`. O texto dentro de um SVG é medido no tamanho em que aparece no palco — o `font-size` vezes a escala com que a figura desenha o SVG —, contra o mínimo de rótulo, e as regras de cor continuam valendo ali: `vocabulario.azul-svg` e `vocabulario.amarelo-svg` dizem em que tamanho cada uma dessas duas cores pode aparecer em texto ou em traço.

Para imagem de arquivo, o `src` é um caminho em `img/`, ao lado do HTML, ou um URI `data:`; um endereço `https://` gera aviso (`recursos.imagem-externa`), porque não funciona offline nem dentro de um artifact. O `alt` é obrigatório (`recursos.alt`): ele é o que o leitor de tela diz e o que sobra quando a imagem falha. Uma imagem menor que a zona não é ampliada — ampliá-la só a deixaria borrada no projetor. Uma foto colorida vai com `data-foto="pb"` e sai em tons de cinza, para não competir com o azul e o amarelo do sistema: `especime/componentes.html#foto-em-cinza`.

## Equação em destaque

**Não existe uma tag de equação.** O contrato chama de `tex-destaque` o que é, no fonte, **texto solto entre `\[` e `\]`**, escrito direto dentro da `section`, entre os outros elementos. Ele conta como um bloco de corpo: ocupa, na sequência do layout, o lugar que um parágrafo ocuparia.

Por isso o trecho abaixo vem com a seção inteira em volta — para não restar dúvida de que não há elemento nenhum envolvendo a equação:

```html
<section data-layout="conteudo" id="em-destaque">
  <h2>Uma equação em destaque</h2>
  <p class="lide">O erro quadrático mede a distância ao alvo.</p>
  \[ E(w) = \frac{1}{2N} \sum_{i=1}^{N} \left(y_i - w^\top x_i\right)^2 \tag{1} \]
  <p>A equação fica alinhada à esquerda, e o número vai para a margem direita.</p>
  <aside class="notas">A equação (1) volta na derivação.</aside>
</section>
```

Do espécime: `especime/matematica.html#em-destaque`. A matemática no meio de uma frase é a mesma coisa com os outros delimitadores, `\( … \)`, e não é bloco de corpo: é parte do texto onde está. Delimitadores, `\passo` e derivações reveladas linha a linha estão em **Matemática e código**.

## O tamanho mínimo de cada papel

O contrato agrupa o texto do slide em quatro **papéis tipográficos** — leitura, código, legenda e rótulo —, e cada um tem um tamanho mínimo. Não é o mesmo "papel" da abertura deste arquivo: ali é para que serve o componente, aqui é que tipo de texto ele carrega.

O autor não tem como mexer nesse tamanho: não há `style`, e nada no sistema encolhe texto para caber. É por isso que a resposta a um slide cheio é cortar ou dividir, e nunca reduzir a letra — reduzir a letra não é uma opção que exista.

`composicao.tamanho-minimo` mede o tamanho que chegou à tela, não o que está no fonte, e acusa quem ficar abaixo do mínimo do seu papel. Quando dois seletores casam o mesmo elemento, vence o mais específico: o `li` do roteiro da capa é rótulo, não leitura.

A tabela sai de `contrato/contrato.json` por `npm run guia`, como a de layouts e a de regras. Editá-la à mão muda o guia por uma geração, até alguém rodar o gerador; o que muda o sistema é o contrato.

<!-- gerado:tabela-de-papeis -->
| papel | tamanho mínimo | onde vale |
|---|---|---|
| `leitura` | 24 px | `p:not(.fonte)`, `li`, `th`, `td`, `aside.destaque`, `aside.quadro`, `aside.alerta`, `div.enunciado`, `div.resposta`, `.metadados-capa` |
| `codigo` | 20 px | `pre`, `code` |
| `legenda` | 18 px | `figcaption`, `p.fonte` |
| `rotulo` | 14 px | `.rotulo`, `.rodape`, `.contador`, `.nome-curto`, `.bloco-n-de-m`, `.roteiro li`, `svg text`, `svg tspan` |

Fora da medição: `.katex *`, `sub`, `sup`, `.demo *`, `.painel *`, `.faixa-de-marca *`, `figcaption code`, `p.fonte code`.
<!-- /gerado -->

Nem todo seletor da tabela é coisa que você escreve: a linha `rotulo` é de cromo, menos `svg text` e `svg tspan`, e `.metadados-capa`, na linha `leitura`, também — é o sistema que desenha aquele texto, e ele está aqui porque a regra o mede junto com o seu. `svg text` e `svg tspan` são o texto dos seus SVG e dos gráficos: dele vale só o mínimo de rótulo, medido no tamanho em que aparece no palco, com um achado por figura (**Gráficos, diagramas e demos**).

E nem todo elemento tem papel: `h1` e `h2` não casam seletor nenhum da tabela, e a regra não os mede — o tamanho do título vem do layout. A lista de "fora da medição" é o resto do que ela não mede: o miolo de uma fórmula tem escala própria; o índice e o expoente são menores por definição; o interior de uma demo, dos painéis e da faixa de marca é desenhado pelo sistema; e o `code` dentro de uma legenda ou de uma linha de fonte acompanha o tamanho dela, abaixo do mínimo do papel `codigo`.

<!-- guia/40-matematica-e-codigo.md -->

# Matemática e código

Matemática e código são os dois lugares em que você escreve, dentro da aula, numa linguagem que não é HTML. Nos dois, quem trabalha é o sistema: o TeX é compilado pelo KaTeX e o código é marcado pelo Shiki, pelo mesmo módulo no navegador e no build. O que você vê na tela é o que sai no PDF.

Os dois ficam fora do orçamento de palavras do slide: `limites.palavras-corpo` e `limites.palavras-coluna` descartam os trechos de TeX e não entram em `pre` nem em `code`. Não é licença para encher o slide — é que uma equação de dez símbolos não é dez palavras de leitura, e contá-la assim mediria a coisa errada. Em troca, a matemática e o código têm limites próprios, e é a eles que você responde.

## Os delimitadores

Dois, e só dois: `\( … \)` no meio da frase e `\[ … \]` em linha própria.

```html
<p>A cada passo, \(w \leftarrow w - \eta \nabla E(w)\): os pesos andam contra o gradiente.</p>
<p>A média \(\frac{1}{N}\sum_{i=1}^{N} x_i\) e o peso \(w_{ij}\) acompanham o tamanho do texto.</p>
```

Do espécime: `especime/matematica.html#no-texto`. A matemática no meio da frase acompanha o tamanho do texto em volta, e é por isso que ela cabe também num item de lista, num campo ou numa célula de tabela — em qualquer lugar onde caiba texto.

**`$` não é delimitador.** Quem vem do LaTeX escreve `$x$` sem pensar, e no Aula USP isso é texto literal: aparece o cifrão na tela. O validador avisa (`matematica.cifrao-suspeito`) quando vê, entre dois cifrões da mesma linha, algo com barra, acento circunflexo ou sublinhado — a assinatura de quem quis escrever matemática. Um `R$` solto no meio de uma frase não tem nada disso e não dispara nada.

## A equação em linha própria

**Não existe elemento de equação.** A equação em bloco é o próprio `\[ … \]` escrito como texto solto dentro da `section`, entre os outros elementos — é isso, e nada mais, que o contrato chama de `tex-destaque` ao listá-la entre os blocos de corpo, ao lado de `p`, `ul` e `table` (**Componentes**). Não há `<tex-destaque>`, nem uma classe, nem um `div` para envolvê-la.

```html
  \[ E(w) = \frac{1}{2N} \sum_{i=1}^{N} \left(y_i - w^\top x_i\right)^2 \tag{1} \]
```

Do espécime: `especime/matematica.html#em-destaque`, onde ela aparece com a seção inteira em volta. A equação fica alinhada à esquerda, e `\tag{1}` põe o número na margem direita — daí em diante você pode dizer "a equação (1)" em voz alta e a turma sabe qual é.

Duas consequências de a equação ser texto solto, as duas medidas:

- **texto solto que não seja `\[ … \]` é erro.** Uma frase escrita direto na `section`, fora de um `<p>`, vira `estrutura.fora-do-layout` com a mensagem "texto solto não é permitido no layout"; e, se ela era o único conteúdo do slide, vem junto um `estrutura.obrigatorio`, porque o layout ficou sem bloco de corpo nenhum.
- **`\( … \)` solto na `section` cai na mesma armadilha.** A matemática no meio da frase não é bloco de corpo: é parte do texto onde está. Fora de um elemento, ela é texto solto como qualquer outro, e dá os mesmos dois erros.

Dentro de um campo ou de uma coluna, a equação continua sendo texto solto — do campo, ou do `div` da coluna:

```html
      <aside class="quadro" data-rotulo="Exemplo">Com \(\eta = 0{,}1\) e gradiente 4, o peso anda
        \[ \Delta w = -0{,}1 \cdot 4 = -0{,}4 \]
      </aside>
```

Do espécime: `especime/matematica.html#em-campos`. A equação segue o ritmo do campo em que está, e não o da zona de conteúdo.

## Revelar uma derivação

Uma derivação que aparece inteira de uma vez é uma derivação que a turma lê em silêncio enquanto você fala. Há duas formas de revelá-la aos poucos, e a escolha é sobre o que está sendo revelado.

**Linha a linha, dentro de uma equação só:** `\passo{n}{…}` marca um pedaço do TeX com o número do passo. O KaTeX o traduz em `data-passo="n"`, e o sistema o revela junto com todo o resto que tem o mesmo número — é o mecanismo de passos em grupos de **A estrutura de uma aula**, chegando pelo TeX em vez de pelo atributo.

```html
<section data-layout="conteudo" id="passo-a-passo" data-pdf="passos">
  <h2>Uma derivação passo a passo</h2>
  \[ \begin{aligned}
    \nabla E(w) &= \frac{1}{N} \sum_{i=1}^{N} \left(w^\top x_i - y_i\right) x_i \\
    \passo{1}{w_{t+1}} &\passo{1}{= w_t - \eta \nabla E(w_t)} \\
    \passo{2}{w_{t+1}} &\passo{2}{= w_t - \frac{\eta}{N} \sum_{i} \left(w_t^\top x_i - y_i\right) x_i}
  \end{aligned} \]
  <p data-passo="3">Cada passo usa todos os exemplos: é a descida em lote.</p>
  <aside class="notas">Revelar uma linha por vez; a última frase fecha a ideia.</aside>
</section>
```

Do espécime: `especime/matematica.html#passo-a-passo`. Três coisas a reparar:

- **cada linha do `aligned` é revelada por dois `\passo` com o mesmo número**, um de cada lado do `&`. O alinhamento parte a linha em duas caixas, e marcar só uma delas revelaria meia conta.
- **a primeira linha não tem `\passo`**, e por isso já está na tela quando o slide abre. A derivação começa do que a turma já aceitou.
- **o passo seguinte pode estar fora da equação:** o `<p data-passo="3">` entra depois da última linha, e fecha a ideia em português.

`data-pdf="passos"` na seção, como aqui, faz o PDF ganhar uma página por estado, em vez de uma página só com tudo revelado. Numa derivação, a revelação **é** o conteúdo, e um PDF que a entregasse pronta perderia o que o slide tinha de melhor.

**Passo a passo, em prosa:** quando o que avança não é uma linha da conta, e sim o argumento, a derivação vira uma `ol.passos` com a matemática dentro de cada item.

```html
  <ol class="passos">
    <li>O erro mede a distância ao alvo, na média sobre os \(N\) exemplos: \( E(w) = \tfrac{1}{2N} \sum_{i=1}^{N} (y_i - \hat{y}_i(w))^2 \).</li>
    <li data-passo>Derive em relação ao peso: \( \nabla E(w) = -\tfrac{1}{N} \sum_{i=1}^{N} (y_i - \hat{y}_i)\,\nabla \hat{y}_i(w) \).</li>
    <li data-passo>O gradiente aponta a subida, então ande no sentido oposto.</li>
    <li data-passo>A regra, com a taxa de aprendizado \( \eta \): \( w \leftarrow w - \eta\,\nabla E(w) \).</li>
  </ol>
```

Da aula-exemplo: `exemplo.html#derivacao`. Cada item diz em português o que a conta faz, e a conta vem junto; quem perdeu o fio segue pelo texto.

**As duas formas não se misturam no mesmo slide.** `\passo{n}{…}` é passo numerado, e o validador o vê no fonte antes de o KaTeX rodar: um slide com `\passo{1}{…}` no TeX e um `<li data-passo>` sem número é `estrutura.passos-mistos` (medido). Ou tudo numerado, ou nada.

## O que o TeX recusa

**Cor e estilo, sempre.** `\color`, `\textcolor`, `\colorbox`, os `\html…` e os atalhos como `\red` estão na lista de proibidos do contrato (**A estrutura de uma aula**), e `matematica.comando-proibido` acusa cada ocorrência com o comando na mensagem — `comando proibido no TeX: \textcolor`. A razão é a de sempre: cor é papel, e a paleta não tem um papel "equação vermelha". Para destacar uma equação, o que existe é o campo amarelo em volta (`aside.destaque`) ou a revelação por passos.

**Comandos que saem do TeX e mexem na página.** O sistema compila com a confiança restrita a `\htmlData`, que é por onde o `\passo` funciona. Tudo o mais que o KaTeX classifica como comando de confiança — `\href`, `\url`, `\includegraphics` — é recusado na compilação, e chega até você como `matematica.tex-invalido` com a mensagem `comando não permitido no TeX` (medido). O nome da regra é diferente do caso acima; o conserto é o mesmo: tire o comando.

**TeX que não compila.** No build, o KaTeX roda com o erro ligado, e a mensagem dele vira `matematica.tex-invalido`, com o trecho do fonte que não compilou e a explicação do KaTeX junto — `Unexpected end of input in a macro argument, expected '}'`. No navegador é melhor ainda: a equação quebrada aparece no lugar dela, marcada, com o trecho à vista, e a mesma mensagem vai para o painel do validador. Você vê onde é, sem procurar.

## Símbolos fora do TeX

Uma seta digitada como `→`, um `≤` copiado de outro documento, um `α` colado de uma página — tudo isso é texto, não matemática, e pode não ter glifo nas fontes embutidas na aula. Quando não tem, `matematica.simbolo-fora-do-tex` acusa o caractere com o ponto de código, e a correção é escrevê-lo em TeX: `\( \to \)`, `\( \leq \)`, `\( \alpha \)`.

A regra mede só o que está fora de TeX, de código e de SVG — dentro de `\( … \)` quem desenha é o KaTeX, com as fontes dele. E ela depende do inventário de glifos das fontes embutidas, que o sistema gera junto com o runtime: onde esse inventário ainda não existe, a regra se cala em vez de acusar tudo.

## Um bloco de código

A marcação é um `pre` com `data-lang`, e o código direto dentro dele:

```html
<pre data-lang="python" data-linhas="6-7" data-numeros>
import numpy as np

def descida(w, x, y, eta=0.1, passos=100):
    """Ajusta w por mínimos quadrados."""
    for _ in range(passos):
        erro = x @ w - y  # resíduo de cada exemplo
        w = w - eta * x.T @ erro / len(y)
    return w
</pre>
```

Do espécime: `especime/codigo.html#linhas-marcadas`. Quatro coisas que esse trecho diz e que é fácil errar escrevendo de memória:

- **não há `<code>` dentro do `<pre>`, e não há classe de linguagem.** A linguagem mora em `data-lang`, e só ali. Uma classe como `linguagem-python`, que outros sistemas usam, é `vocabulario.classe` (medido): ela não existe no contrato.
- **o `<pre>` não é indentado no fonte.** Ele começa na primeira coluna do arquivo, mesmo dentro de uma `section` ou de uma coluna, porque o espaço dentro dele é conteúdo: a indentação do arquivo entraria no código na tela.
- **os sinais de maior e menor viram entidades.** Dentro de um `pre` você ainda está escrevendo HTML: o espécime escreve `media_movel &lt;- function(x, k = 3)`, `if yi * (xi @ w + b) &lt;= 0` e `(w, g, eta = 0.1) =&gt; w - eta * g`, e na tela aparecem `<-`, `<=` e `=>`. Um `&` que possa ser lido como início de entidade pede o mesmo cuidado.
- **a linguagem vem da lista do contrato.** Outro valor é `recursos.linguagem`, e a **ação** da regra traz a lista inteira das aceitas (**O validador**). A `mensagem` diz só qual valor você escreveu; é no campo `acao` que a lista está, e a linha de comando imprime os dois. Um `pre` sem `data-lang` nenhum não é erro, mas também não é destacado: ele sai como texto monoespaçado.

O destaque é monocromático de propósito — negrito nas palavras-chave, cinza nos comentários, tinta no resto —, e é o mesmo em todas as linguagens da lista. É o que deixa a cor livre para dizer outra coisa.

## Linhas marcadas e numeradas

**`data-linhas` marca em amarelo as linhas que importam.** Uma linha, uma faixa, ou várias das duas coisas separadas por vírgula: `data-linhas="2"`, `data-linhas="6-7"`, `data-linhas="8-11"`. A contagem começa em um, na primeira linha de código do bloco — a quebra logo depois de `<pre>` não conta.

Marcar é a forma de dizer "olhe estas duas linhas" sem dizer em voz alta "repare na linha sete", e é a única cor num bloco monocromático. Marque o passo, não a função inteira: um bloco todo amarelo é um bloco sem ênfase nenhuma.

**`data-numeros`, sem valor, numera as linhas.** Use quando for mesmo falar "na linha três" — a numeração ocupa espaço na horizontal e só se paga quando é usada.

## Código que não cabe

Dois limites medem cada `pre` do slide, com ou sem `data-lang`: o número de linhas (`limites.codigo-linhas`) e o comprimento da linha mais longa (`limites.codigo-colunas`). Os dois estão na tabela de **O validador**, com os números do contrato.

Quando um deles acusa, o conserto **não** é diminuir a letra — não há como, e é essa a regra que atravessa o guia inteiro. O que funciona, em ordem de preferência:

- **corte o que não é a ideia.** Importações, tratamento de erro, validação de argumento: nada disso é o que você vai explicar. O espécime mostra o laço, não o programa.
- **quebre a linha longa.** Uma expressão comprida cabe em duas linhas em qualquer dessas linguagens, e na projeção a segunda linha é mais legível que um texto que sai pela borda.
- **divida em dois slides**, um por etapa, ou mostre duas partes lado a lado numa grade de colunas. Dentro de uma coluna, o `pre` continua começando na primeira coluna do arquivo:

```html
  <div class="colunas" data-grade="6-6">
    <div>
<pre data-lang="r" data-linhas="4">
# média móvel de k pontos
media_movel &lt;- function(x, k = 3) {
  janelas &lt;- embed(x, k)
  rowMeans(janelas)  # uma média por janela
}
</pre>
    </div>
```

Do espécime: `especime/codigo.html#r-e-sql`, que põe R e SQL lado a lado para mostrar que o destaque é o mesmo nas duas.

## Código no meio da frase

Um nome de função, uma variável, um comando curto: `<code>` dentro do parágrafo, do item de lista ou do campo.

```html
<p>A atualização <code>w -= lr * grad</code> repete a cada passo, e a primeira linha deste parágrafo tem a mesma altura que a segunda.</p>
```

Do espécime: `especime/componentes.html#texto-em-linha`. O texto dentro dele não conta no orçamento de palavras, como o do `pre`; e numa legenda ou numa linha de fonte, o `code` acompanha o tamanho menor do texto em volta, em vez do mínimo do papel `codigo` (**Componentes**).

Um trecho que precise de mais de uma linha não é `code` no meio da frase: é um bloco de código, e volta para o começo deste arquivo.

<!-- guia/50-graficos-diagramas-demos.md -->

# Gráficos, diagramas e demos

Três recursos que desenham por você: **o gráfico** (`figure.grafico`), que vira SVG a partir de uma especificação em JSON; **o diagrama** (`figure.diagrama`), que vira SVG a partir de um grafo em DOT; e **a demo** (`div.demo`), que roda código seu dentro do slide, com os controles do sistema. Nos três, você descreve o conteúdo e o sistema impõe a forma — cor, espessura, fonte —, igual no navegador e no build.

A segunda aula-exemplo, `exemplo-recursos.html`, usa os três numa aula de verdade: um gráfico de dispersão com a reta ajustada, o ciclo do treino num diagrama e uma demo em que o controle move a inclinação. Os trechos deste capítulo saem dela e do espécime.

## Um gráfico

```html
<section data-layout="figura" id="dispersao">
  <h2>Dez alunos e a reta ajustada</h2>
  <figure class="grafico">
    <script type="application/json">
    {"tipo":"dispersao","dados":{"horas":[1,2,3,4,5,6,7,8,9,10],"nota":[3.2,4.1,4.3,5.4,5.2,6.3,6.1,7.2,7.1,8.6],"reta":[3.37,3.9,4.43,4.96,5.49,6.01,6.54,7.07,7.6,8.13]},"x":"horas","y":["nota","reta"],"foco":"reta","eixos":{"x":"horas de estudo","y":"nota"}}
    </script>
    <figcaption>Nota de dez alunos contra as horas de estudo; em azul, a previsão da reta ajustada em cada ponto.</figcaption>
  </figure>
```

Da aula-exemplo: `exemplo-recursos.html#dispersao`. O `script` com `type="application/json"` é o único filho obrigatório; a `figcaption` é opcional. `figure.grafico` e `figure.diagrama` são os dois únicos lugares da aula em que um `script` pode ficar dentro de uma `section` — ele não roda, é dado.

Os campos do JSON:

| campo | o que é |
|---|---|
| `tipo` | `linha`, `dispersao`, `barras` ou `histograma` |
| `dados` | as colunas inline, como `{"horas": [...], "nota": [...]}`, ou o caminho de um CSV, relativo ao arquivo da aula |
| `x` | o nome da coluna do eixo horizontal; em `barras`, as categorias |
| `y` | a lista das colunas a desenhar, de uma a três séries (não se aplica ao `histograma`) |
| `foco` | a série que sai em azul, quando há mais de uma |
| `eixos` | opcional: o título de cada eixo, `{"x": "…", "y": "…"}` |
| `escalas` | opcional: `{"x": "log", "y": "linear"}`; o padrão é `linear` nos dois |
| `faixas` | opcional: intervalos de `x` pintados em amarelo atrás das séries, `[{"x": [120, 245], "rotulo": "platô"}]`; ignorado em `barras` |
| `classes` | só no `histograma`, e obrigatório nele: em quantas classes de largura igual a coluna `x` é dividida |

**Sem `foco`, a última série de `y` sai em azul.** É o engano mais fácil de não ver, porque o gráfico sai bonito de qualquer jeito — só que com o destaque na série errada. Com uma série só, ela sai em preto e o `foco` não muda nada; com duas ou três, a série em foco sai em azul e as outras em preto e em cinza tracejado, nessa ordem. Escreva `foco` sempre que houver mais de uma série.

Não há caixa de legenda. Cada série é rotulada na ponta, com o **nome da coluna** e um traço curto na cor dela: dê às colunas o nome que você quer ler no slide. O rótulo fica na altura do último ponto da série, e duas séries que terminam no mesmo valor têm os rótulos um sobre o outro.

**Inline ou CSV.** Os dados inline funcionam em qualquer lugar. O CSV funciona sempre que a aula tem os seus arquivos ao lado — no `aula-usp build`, que desenha o gráfico dentro do HTML final, no `aula-usp servir` e no `aula-usp validar` —, e o costume é guardá-lo em `data/`, na pasta da aula. Onde não há arquivo ao lado — um artifact do Claude, o HTML aberto com dois cliques —, só o inline funciona. A aula-exemplo usa inline por isso: ela viaja num arquivo só.

**Onde cabe.** O texto do gráfico é de 14 px quando a figura tem pelo menos 640 px de largura no palco. Servem o layout `figura` e a coluna de 8 (`data-grade="8-4"` ou `"4-8"`); nas colunas de 6 e de 4 o texto sai menor que 14, e `composicao.tamanho-minimo` acusa o gráfico.

O que o validador confere antes de desenhar, em `recursos.grafico`: o JSON válido, o `tipo` entre os quatro, `x`, pelo menos uma série em `y` e no máximo três, o `foco` dentro de `y`, as `escalas` entre `linear` e `log`, `classes` no histograma e, com dados inline, que as colunas citadas existem. Escala `log` em `y` não vale em `barras` nem em `histograma`, cujo eixo começa no zero. Um CSV que não está onde o caminho diz é `recursos.csv`.

## Um diagrama

```html
<section data-layout="figura" id="ciclo">
  <h2>O treino é um ciclo</h2>
  <figure class="diagrama">
    <script type="text/vnd.graphviz">
    digraph {
      dados [label="dados (x, y)"];
      reta [label="reta a + b x"];
      previsao [label="previsão"];
      erro [label="erro E(a, b)", class="foco"];
      dados -> previsao; reta -> previsao;
      previsao -> erro -> gradiente;
      gradiente -> reta [class="ativo", constraint=false];
    }
    </script>
    <figcaption>A reta prevê, o erro mede, e o gradiente do erro ajusta a reta; a volta em azul é o passo de descida.</figcaption>
  </figure>
```

Da aula-exemplo: `exemplo-recursos.html#ciclo`. Outro, com duas entradas e uma camada oculta, em `especime/componentes.html#diagrama-rede`.

O diagrama é `figure.diagrama` com o grafo em DOT dentro de `<script type="text/vnd.graphviz">`, e `figcaption` opcional. O Graphviz decide as posições; o sistema impõe o estilo: nós retangulares com contorno de 2 px em preto, texto Geist 20, setas de 2 px, `class="foco"` num nó em campo amarelo e `class="ativo"` numa aresta em azul. A direção padrão é da esquerda para a direita (`rankdir=LR`), porque o palco é mais largo que alto; um `rankdir` seu vence. Um nó sem `label` mostra o próprio nome, como `gradiente` acima.

Num ciclo, a aresta que volta empurra o nó de destino para o fim da fila, e o desenho sai com uma seta atravessando tudo. `constraint=false` nessa aresta diz ao Graphviz para não usá-la no posicionamento: no trecho acima, é o que deixa `reta` ao lado de `dados`, no começo, e não depois de `gradiente`.

O que você escreve no DOT e o sistema não segue tem dois destinos:

- **descartado, sem aviso**, porque o desenho sai certo sem ele: cor (`color`, `fillcolor`, `fontcolor`, `bgcolor`), espessura (`penwidth`), forma de seta (`arrowhead`, `arrowtail`), `shape` que não seja `record`, e `style` que não seja `invis`;
- **recusado, com `recursos.dot`**, porque descartado desenharia outra coisa: `style=invis` (sairia visível), `shape=record` e `Mrecord` (sairiam sem as divisões), rótulo HTML `label=<…>` (sem negrito e fora do lugar), `headlabel`, `taillabel` e `xlabel` (sumiriam), `label` no grafo (o título vai na `figcaption`) ou num subgrafo que não é `cluster_…`, `fontsize`, `fontname`, `fixedsize`, `width`, `height` e `margin` (o texto é sempre 20, e a caixa seria medida para outro), classe fora de `foco` num nó e `ativo` numa aresta, e mais de um grafo no mesmo bloco (só o primeiro seria desenhado).

DOT que não compila também é `recursos.dot`, com a mensagem do Graphviz e a linha que ela cita; mais de 15 nós é `recursos.diagrama-grande`, um aviso: acima disso o diagrama raramente se lê de longe.

O texto de 20 também é medido no palco. Um diagrama mais largo que a figura encolhe com ela, e numa coluna estreita cai abaixo de 14; um diagrama mais alto que o espaço embaixo do título encolhe pela altura no layout `figura` — medido, uma cadeia de dez nós de cima para baixo sai com 13,3 px, e da esquerda para a direita, com 20.

## Uma demo

Um slide de demo tem o título e a demo, e nada mais:

```html
<section data-layout="demo" id="demo">
  <h2>Uma demo ocupa o resto do slide</h2>
  <div class="demo" data-demo="contador" data-opcoes='{"passo": 5}'>
    <img class="estatico" alt="Imagem estática da demo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23D9D9D9'/%3E%3C/svg%3E">
  </div>
  <aside class="notas">Clicar no botão da demo uma vez antes de falar. No PDF, o que sai é a imagem estática.</aside>
</section>
```

Do espécime: `especime/index.html#demo`. O que há nele:

- **`data-demo` é o nome**, começando por letra minúscula e seguido de minúsculas, números e hífens (`^[a-z][a-z0-9-]*$`). É por ele que o sistema acha o registro correspondente.
- **`data-opcoes` é um objeto JSON**, entregue ao registro quando a demo é montada. É o que deixa a mesma demo servir a duas aulas com parâmetros diferentes, sem copiar código.
- **`img.estatico` é o que sai no PDF**, quando você a escreve. É o único filho que o contrato aceita dentro de `div.demo`, e ela é opcional: sem ela, o `aula-usp build` fotografa a demo ("Controles e captura", abaixo).

**A interface da demo não se escreve no HTML.** Botão, controle deslizante, canvas: tudo isso é criado pelo código do registro, dentro da `div.demo`, quando o slide abre. Escrevê-los no fonte é erro — um `<button>` no corpo da aula é `vocabulario.elemento`, porque ele não está no vocabulário (medido). Para botão, controle deslizante e leitura, o sistema dá os seus prontos: `AulaUSP.controles`, abaixo.

## O registro fica fora dos slides

O código da demo vai num `<script>` **depois da última `section`**, ainda dentro do `<body>`:

```html
<script>
AulaUSP.demo('contador', {
  montar(raiz, opcoes) {
    this.passo = opcoes.passo ?? 1;
    this.valor = 0;
    this.saida = document.createElement('output');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'somar';
    botao.addEventListener('click', () => {
      this.valor += this.passo;
      this.mostrar();
    });
    raiz.append(botao, this.saida);
    this.mostrar();
  },
  mostrar() {
    this.saida.textContent = String(this.valor);
  },
  iniciar() {
    this.entradas = (this.entradas ?? 0) + 1;
    this.saida.dataset.entradas = String(this.entradas);
    delete this.saida.dataset.parado;
  },
  parar() {
    this.saida.dataset.parado = 'sim';
  },
});
</script>
```

Do espécime: `especime/index.html`, logo antes de `</body>`. `AulaUSP` já existe quando esse script roda, porque a tag do runtime está no `<head>`: não é preciso esperar evento nenhum.

**Dentro de uma `section`, o `script` é erro** (`vocabulario.script`), e a mensagem diz para onde ele vai: "registros de demo ficam fora dos slides". A razão é que o corpo do slide é o que o validador confere e o que o sistema monta; código executável ali dentro fura os dois. A exceção é o `script` de dados de `figure.grafico` e `figure.diagrama`, que não executa nada.

No ciclo de vida do slide, o sistema chama três funções, e só elas:

- **`montar(raiz, opcoes)`** roda uma vez, na primeira entrada no slide. `raiz` é a `div.demo`; `opcoes` é o objeto de `data-opcoes`, ou `{}`.
- **`iniciar()`** roda a cada entrada no slide, e **`parar()`**, a cada saída. É onde entram e saem animação, som e temporizador — nenhuma demo roda com o slide fora da tela.

Há uma quarta, `capturar()`, que não é do ciclo de vida: ela é chamada na hora de imprimir, e a próxima seção trata dela. Qualquer outro método do objeto, como o `mostrar()` acima, é seu: o sistema não o conhece nem o chama. E uma demo que falhe em qualquer uma delas não derruba a aula — o erro vai para o console do navegador, com o nome da demo e a etapa.

## A demo no PDF

O PDF é papel: nada nele é interativo. O que sai no lugar da demo, em ordem:

1. **a `img.estatico`, se houver.** É a forma recomendada quando a aula também vai ser impressa pelo navegador: você escolhe o instante que representa a demo, e o PDF sai com ela pelos dois caminhos. É a forma da demo de `especime/index.html`.
2. **o resultado de `capturar()`**, se o registro definir essa função. Ela devolve um canvas ou um URI de imagem, e é útil quando o quadro que importa depende do que aconteceu na sala.
3. **a foto que o build tira**, em toda aula gerada com `aula-usp build` (abaixo). É a forma da demo da aula-exemplo de regressão e do exemplo do layout `demo` em **Layouts**: sem escrever imagem nenhuma, o PDF do build sai com a demo — o do navegador, não;
4. **um aviso**, se não houver nada disso: um bloco com "Demo interativa: abra o HTML", no idioma da aula.

`recursos.demo-sem-estatico` é o aviso que aparece no caso 4 — ele acusa antes de você descobrir o buraco no PDF. Ele não aparece no `aula-usp build` nem no `aula-usp validar`, porque o build fotografa a demo, e volta a aparecer, com o motivo, se a foto falhar; no navegador ele continua, porque o "Salvar como PDF" do navegador não passa pelo build. E `recursos.demo-sem-registro` é erro: uma `div.demo` cujo `data-demo` não tem registro correspondente não tem como funcionar em lugar nenhum.

## Controles e captura

Os controles do sistema são `AulaUSP.controles`, e a demo os cria no `montar`, dentro da `div.demo`: `botao(raiz, texto, aoClicar)`, `alternar(botao, ativo)` para o estado ativo (campo preto, texto branco), `deslizante(raiz, { min, max, passo, valor, rotulo }, aoMudar)` e `leitura(raiz, valor, { casas })`, com `escrever(leitura, valor, { casas })` para trocar o número, que sai no formato do idioma da aula. O `rotulo` do deslizante não aparece na tela: é o nome que o leitor de tela anuncia. A forma — contorno de 2 px, sem canto arredondado, cursor quadrado — vem pronta; não escreva estilo para eles.

```html
<section data-layout="demo" id="demo-controles">
  <h2>Controles do sistema, fotografados pelo build</h2>
  <div class="demo" data-demo="soma" data-opcoes='{"passo": 3}' data-captura-ms="500"></div>
  <aside class="notas">A demo não tem img.estatico nem capturar(): no build, o Chrome a fotografa meio segundo depois de iniciar, e é essa foto que sai no PDF.</aside>
</section>
```

Do espécime: `especime/componentes.html#demo-controles`, com o registro logo antes de `</body>`:

```html
<script>
AulaUSP.demo('soma', {
  montar(raiz, opcoes) {
    const { botao, alternar, deslizante, leitura, escrever } = AulaUSP.controles;
    this.total = 0;
    this.passo = opcoes.passo ?? 1;
    this.dobro = botao(raiz, 'dobrar', () => alternar(this.dobro));
    this.passos = deslizante(raiz, { min: 1, max: 10, valor: this.passo, rotulo: 'passo' }, (valor) => { this.passo = valor; });
    botao(raiz, 'somar', () => escrever(this.saida, (this.total += this.passo * (this.dobro.classList.contains('ativo') ? 2 : 1))));
    this.saida = leitura(raiz, this.total);
  },
  iniciar() {
    AulaUSP.controles.alternar(this.dobro, true);
  },
});
</script>
```

Numa aula de verdade, a demo costuma juntar um controle, uma leitura e um desenho que ela mesma faz:

```html
<section data-layout="demo" id="inclinacao">
  <h2>Mova a inclinação<br><span class="sinal">e acompanhe o erro.</span></h2>
  <div class="demo" data-demo="reta" data-opcoes='{"x":[1,2,3,4,5,6,7,8,9,10],"y":[3.2,4.1,4.3,5.4,5.2,6.3,6.1,7.2,7.1,8.6],"inclinacao":0.2}' data-captura-ms="500"></div>
```

Da aula-exemplo: `exemplo-recursos.html#inclinacao`. Os dados vão em `data-opcoes`, e o registro, no fim do arquivo, cria o deslizante, a leitura e um SVG com os pontos, a reta e os resíduos, redesenhado a cada movimento do controle. O que a demo desenha dentro da `div.demo` é dela: cores e medidas ali ficam por sua conta, e a regra de ouro continua valendo — use as cores do sistema pelos papéis delas.

**A captura.** Em toda aula, `aula-usp build` abre o HTML construído, vai até o slide de cada demo sem `img.estatico` e sem `capturar()`, cada uma numa página só dela, espera `data-captura-ms` milissegundos depois de `iniciar()` (3000, se você não escrever) e fotografa a `div.demo`; a foto entra no HTML como `img.estatico` e é ela que sai no PDF. `data-captura-ms` só muda a espera: escreva-o quando a demo fica pronta antes (o build termina mais cedo) ou depois dos 3 s. Se a foto falhar — a demo não desenhou nada, lançou erro, ou não se registrou na página —, o build diz qual demo e por quê, e ela sai no PDF como no caso 4.

## Sem gráfico nem diagrama

Nem todo desenho cabe num gráfico de quatro tipos ou num grafo. Para o resto, há dois caminhos.

**A figura pronta.** Gere a figura onde você já a gera — notebook, R, o que for —, exporte como arquivo, guarde ao lado da aula em `img/` e use `<img>` dentro de `figure`, com `alt` (**Componentes**). No build, a imagem é embutida no HTML final, então a aula continua sendo um arquivo só. Vale conferir o que o sistema não confere por você: cores da paleta, eixos legíveis de longe, e nada de legenda em caixa. Para quem plota em matplotlib, o sistema guarda uma folha de estilo com as cores da aula em assets/aula-usp.mplstyle, fora deste guia e dos pacotes — ative com `plt.style.use(caminho)` antes de plotar, apontando para esse arquivo dentro do seu clone do sistema.

**O SVG escrito à mão**, quando o desenho é simples e você quer que ele siga o sistema por construção:

```html
  <figure>
    <svg viewBox="0 0 1152 360" role="img" aria-label="Três quadrados: visto, atual e futuro">
      <rect x="0" y="40" width="280" height="280" fill="#0A0A0A"/>
      <rect x="436" y="40" width="280" height="280" fill="#1094AB"/>
      <rect x="873" y="41" width="278" height="278" fill="none" stroke="#0A0A0A" stroke-width="2"/>
    </svg>
    <figcaption>Os três estados de um quadrado do mapa: visto, atual e futuro.</figcaption>
  </figure>
```

Do espécime: `especime/index.html#figura`. O vocabulário de SVG do contrato está em **A estrutura de uma aula**, com a lista de elementos, de atributos e as cores aceitas; `vocabulario.cor-svg`, `vocabulario.azul-svg` e `vocabulario.amarelo-svg` cuidam para que a paleta valha ali dentro como vale no resto do slide.

Duas coisas que surpreendem quem desenha à mão, as duas medidas:

- **o texto dentro do SVG conta no orçamento de palavras.** Rótulo de eixo, nome de série, valor anotado: num slide de `conteudo`, tudo isso entra em `limites.palavras-corpo`, e dentro de uma coluna, também em `limites.palavras-coluna`. Uma figura muito anotada estoura o orçamento sem uma frase de prosa sequer. No layout `figura`, que não tem orçamento de corpo, a conta não corre.
- **o texto dentro do SVG é medido no tamanho em que aparece no palco**, contra o mínimo de rótulo, 14 px. O SVG escala com a largura da figura: um `font-size="14"` num `viewBox` mais largo que a coluna sai menor que 14 e é `composicao.tamanho-minimo`. No layout `figura`, ele escala também com a altura que sobra embaixo do título: um `viewBox` mais alto que largo encolhe por ela, e aí o que resolve não é largura, é empilhar menos. O achado é um por figura, com a menor medida e a dimensão — largura ou altura — que a figura precisaria. O azul vale do mesmo jeito: texto de SVG em azul abaixo de 32 px no palco é `composicao.azul-pequeno`, mesmo com `font-size="32"` no fonte.

<!-- guia/60-validador.md -->

# O validador

O validador é o contrato lido como regras. Ele abre a sua aula, confere item por item o que `contrato/contrato.json` descreve, e devolve uma lista de achados — cada um com o lugar, o nome da regra, o que ele encontrou e o que fazer. É o mesmo módulo nos dois lugares em que você o encontra: no painel dentro da aula, que abre com a tecla **V** no navegador, e na linha de comando, em `aula-usp validar` e em `aula-usp build`. Mesmas regras, mesmas mensagens.

É por causa dele que se pode pedir uma aula a um modelo de linguagem e saber, sem abrir o arquivo, se ela está dentro do sistema. E é por isso que a última regra essencial é a mais curta: **entregue em zero erros**.

## Erro e aviso

**Erro bloqueia.** O `aula-usp build` para e não gera o HTML nem o PDF; a linha de comando termina com código 1. Um erro é sempre uma de duas coisas: você escreveu algo que o sistema não sabe montar, ou escreveu mais do que cabe no slide.

**Aviso não bloqueia** — a aula monta e o PDF sai. Um aviso é uma coisa que costuma ser engano e às vezes é escolha: um slide sem notas, uma imagem que mora em outro servidor, uma aula com um bloco só. Leia cada um e decida; o que não se faz é acumulá-los sem olhar, porque no meio deles um dia estará o que ia dar errado na sala.

O painel dentro da aula abre sozinho quando há erro — fora do modo de tela cheia, para não interromper uma apresentação —, e traz um botão **Copiar para o chat**, que copia a lista inteira no mesmo formato da linha de comando. É esse botão que fecha o ciclo de quem escreve a aula num chat, sem terminal (**O fluxo no chat, sem terminal**). Aviso não abre painel nenhum, mas vai para o console do navegador, onde quem quiser o encontra.

## Quando cada grupo roda

As regras são de quatro grupos, e o grupo diz **quando** a regra tem como saber a resposta. O grupo de cada regra está no contrato, ao lado da severidade e da ação.

| grupo | sobre o quê | no navegador | no build |
|---|---|---|---|
| estáticas | o fonte da aula, sem cromo e sem nada renderizado | sim | sim |
| de carga | o fonte, depois de carregar as bibliotecas, as imagens e os scripts | sim | sim |
| composição | o slide montado e renderizado, no estado final | sim | só com Chrome |
| saída | o HTML e o PDF finais | não roda | sim |

**As estáticas** são a maioria, e são as que se respondem lendo o arquivo: estrutura, vocabulário, limites de tamanho, cor em SVG, comandos proibidos no TeX.

**As de carga** são as que só se sabem depois de tentar: se o TeX compila, se a imagem existe no disco, se a demo tem registro, se o CSV do gráfico existe, se o DOT do diagrama compila. São sete — `matematica.tex-invalido`, `recursos.imagem`, `recursos.demo-sem-registro`, `recursos.demo-sem-estatico`, `recursos.csv`, `recursos.dot` e `recursos.diagrama-grande`.

**As de composição** são as que exigem medir a página desenhada: o que transbordou da zona de conteúdo, o título que tomou uma linha a mais, o texto que chegou à tela abaixo do mínimo do seu papel. No navegador elas rodam sempre; na linha de comando, só quando há um Chrome para abrir, e a CLI avisa quando não há. Um "zero erros" sem Chrome não é o mesmo "zero erros" de quem tem.

**As de saída** olham o produto: o HTML final não pode depender de nenhum arquivo externo (`saida.referencia-externa`) nem pedir um glifo que a fonte embutida não tem (`saida.glifo-ausente`); o PDF tem de ter o número de páginas previsto (`saida.pdf-paginas`); e o HTML final avisa quando passa do tamanho em megabytes do contrato (`saida.tamanho`). Elas não existem no navegador porque lá não há HTML final nem PDF.

## Como ler uma mensagem

Toda mensagem tem a mesma forma, e cada campo responde uma pergunta:

```
ERRO · slide 3 #texto-solto · estrutura.fora-do-layout · texto solto não é permitido no layout "conteudo". Remova o elemento ou mova-o para um layout que o aceite, na ordem prevista.
    Uma frase escrita sem parágrafo.
```

- **`ERRO` ou `AVISO`** — se bloqueia ou não.
- **`slide 3 #texto-solto`** — onde. O número é a posição da seção no arquivo, contada a partir da capa, e o `#id` é o seu. Achados sobre a aula inteira, como um metadado que falta, trazem `aula` no lugar do slide.
- **`estrutura.fora-do-layout`** — qual regra. O prefixo já diz de que tipo é o problema: `estrutura` é a forma do slide, `vocabulario` é o que não existe no contrato, `limites` é o que não cabe, `composicao` é o que a página desenhada revelou, `matematica`, `recursos` e `saida` dizem-se sozinhos.
- **o que ele encontrou** — a frase até o ponto. Em `limites.*` ela traz sempre a medida encontrada e, entre parênteses, o máximo do contrato: você sabe de quanto está passando.
- **o que fazer** — a última frase. É literalmente a coluna "como corrigir" da tabela abaixo, a mesma para todas as ocorrências daquela regra. Quando ela manda cortar sem dizer até quanto, é porque o limite depende do layout: os números todos estão na tabela de limites de **A estrutura de uma aula**.
- **a linha indentada**, quando existe, é o trecho do seu arquivo a que o achado se refere.

Um aviso tem a mesma forma:

```
AVISO · slide 4 #lista-grande · estrutura.notas-ausentes · slide de layout "conteudo" sem notas do apresentador. Acrescente <aside class="notas"> com o que dizer neste slide.
```

A lista vem por grupo, e **dentro de cada grupo** ordenada pela aula: primeiro o que é da aula inteira, depois slide a slide, e dentro de um slide na ordem das regras. Como um grupo vem depois do outro, o número do slide volta atrás quando o grupo seguinte começa — leia pelo `#id`, não pela posição na lista.

## As regras

A tabela sai de `contrato/contrato.json` por `npm run guia` — do mesmo arquivo que o validador lê, de modo que ela não tem como discordar do que roda. Três colunas: o nome da regra, a severidade, e a ação, que é a frase com que toda mensagem daquela regra termina.

<!-- gerado:tabela-de-regras -->
| regra | severidade | como corrigir |
|---|---|---|
| `composicao.azul-pequeno` | erro | Use azul só em texto a partir de 32 px. |
| `composicao.linhas-titulo` | erro | Encurte o título para caber em duas linhas. |
| `composicao.tamanho-minimo` | erro | Corte conteúdo em vez de reduzir o texto. Em texto de SVG: ponha a figura numa coluna mais larga ou no layout figura; num SVG seu, aumente também o font-size. Se a figura encolheu pela altura: empilhe menos na vertical: num diagrama, deixe a direção da esquerda para a direita (rankdir=LR, o padrão), use menos níveis ou divida-o em dois; num SVG seu, faça o viewBox mais largo que alto ou aumente o font-size. |
| `composicao.texto-no-amarelo` | erro | Use só tinta sobre amarelo. |
| `composicao.transbordo` | erro | Reduza o conteúdo do slide ou divida-o em dois. |
| `estrutura.blocos` | aviso | Organize a aula em 2 a 8 blocos, cada um aberto por data-layout="abertura". |
| `estrutura.colunas` | erro | Dê à div.colunas um div filho para cada parte de data-grade. |
| `estrutura.fora-do-layout` | erro | Remova o elemento ou mova-o para um layout que o aceite, na ordem prevista. |
| `estrutura.id-ausente` | aviso | Dê à section um id curto, com letras minúsculas, números e hífens. |
| `estrutura.id-duplicado` | erro | Dê a cada section um id único. |
| `estrutura.layout` | erro | Use um layout do contrato: capa, abertura, conteudo, afirmacao, figura, demo ou encerramento. |
| `estrutura.metadados` | erro | Preencha no <head> as metas unidade, disciplina, aula, data (AAAA-MM-DD) e professor. |
| `estrutura.nome-curto` | erro | Acrescente à abertura data-curto com até 10 caracteres. |
| `estrutura.notas-ausentes` | aviso | Acrescente <aside class="notas"> com o que dizer neste slide. |
| `estrutura.obrigatorio` | erro | Acrescente o elemento obrigatório do layout. |
| `estrutura.passos-mistos` | erro | Numere todos os passos do slide ou nenhum. |
| `estrutura.primeiro-slide` | erro | Comece a aula com <section data-layout="capa">. |
| `estrutura.ultimo-slide` | erro | Termine a aula com <section data-layout="encerramento">. |
| `limites.afirmacao` | erro | Encurte a afirmação para até 120 caracteres. |
| `limites.alertas` | erro | Use no máximo 1 alerta por slide. |
| `limites.codigo-colunas` | erro | Quebre as linhas de código com mais de 64 colunas. |
| `limites.codigo-linhas` | erro | Mostre no máximo 16 linhas de código por slide. |
| `limites.destaques` | erro | Use no máximo 2 destaques por slide. |
| `limites.fonte` | erro | Encurte a fonte para até 80 caracteres. |
| `limites.itens` | erro | Use no máximo 5 itens por lista, ou divida a lista. |
| `limites.legenda` | erro | Encurte a legenda para até 140 caracteres. |
| `limites.lide` | erro | Encurte o lide para até 120 caracteres. |
| `limites.metadado` | erro | Encurte o metadado ao tamanho previsto. |
| `limites.nome-curto` | erro | Encurte data-curto para até 10 caracteres. |
| `limites.palavras-coluna` | erro | Corte palavras da coluna ou divida o conteúdo em dois slides. |
| `limites.palavras-corpo` | erro | Corte palavras ou divida o conteúdo em dois slides. |
| `limites.pergunta` | erro | Encurte a pergunta para até 90 caracteres. |
| `limites.proxima` | erro | Encurte a próxima aula para até 90 caracteres. |
| `limites.rotulo` | erro | Encurte data-rotulo para até 24 caracteres. |
| `limites.segmentos-titulo` | erro | Use no máximo duas linhas no título, com um único <br>. |
| `limites.sintese` | erro | Use na síntese até 3 itens, cada um com até 80 caracteres. |
| `limites.tabela` | erro | Use no máximo 8 linhas de dados e 6 colunas. |
| `limites.titulo` | erro | Corte o título ou divida o conteúdo em dois slides. |
| `matematica.cifrao-suspeito` | aviso | Escreva matemática entre \( e \); $ não é delimitador. |
| `matematica.comando-proibido` | erro | Remova do TeX os comandos de cor e de estilo. |
| `matematica.simbolo-fora-do-tex` | erro | Escreva o símbolo em TeX: \( \to \), \( \alpha \), \( \leq \). |
| `matematica.tex-invalido` | erro | Corrija o TeX no trecho indicado. |
| `recursos.alt` | erro | Descreva a imagem no atributo alt. |
| `recursos.csv` | erro | Confira o caminho do CSV em data/. |
| `recursos.demo-sem-estatico` | aviso | Acrescente img.estatico à demo ou implemente capturar(). No navegador: gere o PDF com aula-usp build, que fotografa a demo, ou acrescente img.estatico à demo ou implemente capturar(). Se a captura do build falhou: corrija a demo para que ela desenhe na div.demo ao iniciar, ou acrescente img.estatico à demo ou implemente capturar(). |
| `recursos.demo-sem-registro` | erro | Registre a demo com AulaUSP.demo('<nome>', { … }). |
| `recursos.diagrama-grande` | aviso | Simplifique o diagrama para até 15 nós. |
| `recursos.dot` | erro | Corrija o DOT do diagrama. |
| `recursos.grafico` | erro | Corrija o JSON do gráfico. |
| `recursos.imagem` | erro | Confira o caminho da imagem em img/. |
| `recursos.imagem-externa` | aviso | Guarde a imagem em img/, com autorização do autor para baixá-la. |
| `recursos.linguagem` | erro | Use em data-lang uma destas linguagens: python, r, sql, javascript, bash, json, latex. |
| `saida.glifo-ausente` | erro | Escreva o caractere em TeX ou troque-o por um equivalente. |
| `saida.pdf-paginas` | erro | Relate o defeito: o PDF não tem o número de páginas esperado. |
| `saida.referencia-externa` | erro | Embuta o recurso no HTML final. |
| `saida.tamanho` | aviso | Reduza as imagens ou divida a aula. |
| `vocabulario.amarelo-svg` | erro | Use o amarelo só em campos ou traços de 4 px ou mais, nunca em texto. |
| `vocabulario.atributo` | erro | Remova o atributo ou use um valor previsto no contrato. |
| `vocabulario.azul-svg` | erro | Use o azul em texto de SVG só a partir de 32 px. |
| `vocabulario.classe` | erro | Use só classes previstas no contrato. |
| `vocabulario.cor-svg` | erro | Use em fill e stroke só as cores dos tokens ou none. |
| `vocabulario.elemento` | erro | Troque o elemento por um previsto no contrato. |
| `vocabulario.script` | erro | Tire o script da section; registros de demo ficam fora dos slides. |
| `vocabulario.style` | erro | Remova o estilo inline; use os layouts e componentes do sistema. |
<!-- /gerado -->

## Quando uma regra acusa

A coluna "como corrigir" diz o que fazer; ela não tem espaço para dizer o que a experiência ensina sobre cada família. Isto aqui tem.

**`estrutura.*` — o slide não tem a forma que o layout promete.** Abra **Layouts**, ache a linha do layout e compare com o seu slide: os elementos são esses, nessa ordem? Duas mensagens costumam vir juntas, uma de falta e uma de sobra, e as duas são a mesma causa — um elemento que não devia estar ali ocupou o lugar do que devia.

**`vocabulario.*` — você escreveu algo que não existe no sistema.** Quase sempre é marcação de outra ferramenta que entrou por hábito: uma classe de um framework, um `style` para ajeitar um espaço, um elemento que o contrato não tem. O conserto nunca é insistir: é achar em **Componentes** o componente que faz aquilo. Se não houver nenhum, o slide está pedindo algo que o sistema decidiu não ter.

**`limites.*` — não cabe.** A resposta é sempre uma das duas: **corte o conteúdo ou divida o slide em dois.** Reduzir a letra não é uma opção que exista — não há `style`, e nada no sistema encolhe texto para caber. Quando um limite acusa repetidamente no mesmo slide, o problema raramente é o limite: é um slide com duas ideias dentro.

**`composicao.*` — o fonte parecia bem, a página desenhada não.** É o grupo que mede o que só o navegador sabe: quanto de fato ocupou, em quantas linhas o título quebrou, com que tamanho o texto chegou à tela. O conserto é o mesmo dos limites, e a diferença é que aqui você já viu a página e sabe o que sobra.

**`matematica.*` — delimitador, comando ou símbolo.** Os três casos e os consertos estão em **Matemática e código**.

**`recursos.*` — a imagem, a linguagem, a demo, o gráfico ou o diagrama.** `recursos.imagem` é caminho errado ou arquivo que não veio junto; `recursos.linguagem` traz a lista das aceitas na **ação** da regra — a coluna "como corrigir" da tabela acima, e o campo `acao` do `--json` —, não na mensagem, que diz só qual valor você escreveu; as de demo, de gráfico e de diagrama estão em **Gráficos, diagramas e demos**.

**`saida.*` — o produto final.** São raras, e uma delas não é culpa sua: `saida.pdf-paginas` pede que você **relate o defeito**, porque o número de páginas é conta do sistema, não escolha do autor.

Dois hábitos que economizam tempo em qualquer família:

- **conserte a causa, não a mensagem.** Uma causa só costuma render várias mensagens. Corrija o que está errado e rode de novo; a lista encolhe sozinha.
- **rode depois de cada slide novo**, e não no fim da aula. As mensagens são baratas quando são duas e caras quando são quarenta.

## Quando ela não acusa

Silêncio não é aprovação em todos os casos, e vale conhecer os três em que não é:

- **sem Chrome, o grupo de composição não roda.** A CLI avisa por fora da lista, e o que ela lhe entregou foi uma validação parcial.
- **sem o inventário de glifos das fontes embutidas**, que o sistema gera junto com o runtime, `matematica.simbolo-fora-do-tex` se cala — acusar tudo seria pior do que não acusar nada.
- **as regras de saída só existem no build.** Uma aula impecável no painel do navegador ainda pode ter uma referência externa que só o HTML final revela.

A validação completa, com os quatro grupos, é a do `aula-usp build` com Chrome disponível. É ela que vale como "entregue em zero erros".

<!-- guia/70-fluxo-terminal.md -->

# O fluxo com terminal

Este é o fluxo de quem roda comandos — o autor na sua máquina, e o agente que trabalha num terminal, como o Claude Code ou o Codex CLI. É o mais completo dos quatro: só aqui existem a validação inteira, com os quatro grupos de regras, e o PDF gerado pelo sistema.

Os outros três fluxos estão em **O fluxo no chat, sem terminal**, **A aula como artifact do Claude** e **A aula pelo ChatGPT**, e todos eles dependem do runtime carregado por uma tag no `<head>`. Este não: o sistema está no disco.

## Instalar a CLI

**Hoje a CLI se instala a partir do repositório do sistema**, com `npm link` (spec 8.1):

```bash
cd caminho/para/lecture-design-system
npm install
npm link
```

`npm install` traz as dependências; `npm link` põe `aula-usp` no seu PATH. Node 20.6 ou mais novo.

**`npm install -g aula-usp` ainda não funciona.** O pacote não está publicado no npm, e publicá-lo é da fase 3 do projeto: até lá não há o que instalar por esse caminho. Quando houver, é esta seção que muda.

Confira que respondeu, chamando a CLI sem comando nenhum:

```bash
aula-usp
```

Ela imprime o uso e termina com código 2:

```
uso: aula-usp novo <pasta> --unidade ime
       aula-usp servir <pasta> [--porta 8765]
       aula-usp validar <pasta> [--json]
       aula-usp build <pasta> [--sem-pdf]
       aula-usp dist
       aula-usp pacotes
```

Se em vez disso vier "comando não encontrado", não insista no `npm link`: chame o arquivo pelo caminho, que faz exatamente o mesmo.

```bash
node caminho/para/lecture-design-system/bin/aula-usp.mjs validar minha-aula
```

Dos seis comandos, quatro são seus — `novo`, `validar`, `servir` e `build`, nesta ordem, e as quatro seções seguintes são eles. `aula-usp dist` e `aula-usp pacotes` são manutenção do sistema, e quem escreve aula não tem motivo para chamá-los.

## `aula-usp novo` — começar uma aula

A aula é uma pasta com um `index.html` dentro, e um `img/` ao lado quando há imagens de arquivo. É este comando que a cria:

```bash
aula-usp novo minha-aula --unidade ime
```

```
minha-aula criada a partir de modelos/aula — unidade ime, data 2026-09-20
```

`--unidade` é obrigatória e aceita as unidades do sistema (`ime` ou `ifusp` hoje); a data é a de hoje, pelo relógio da sua máquina. As outras três metas — `disciplina`, `aula` e `professor` — ficam com o texto de exemplo, para você as preencher: um nome de professor inventado pelo comando seria pior que um lugar visivelmente vazio.

O comando não sobrescreve pasta que já tenha conteúdo, e recusa uma unidade que não exista, com código 2 e sem criar nada. Uma pasta vazia que você já tenha criado é aceita.

O que ele cria é o esqueleto de **A estrutura de uma aula**, com capa, duas aberturas, dois slides de conteúdo e encerramento. Troque o conteúdo, preencha as metas que faltam e acrescente seções.

Uma observação sobre a tag do `<script>` que veio no esqueleto: ela aponta para a CDN, com a versão exata e a soma de integridade — é a forma que o `aula-usp pacotes` escreve. Esse endereço ainda não resolve, porque o pacote não está publicado (fase 3), e **não faz diferença neste fluxo**, porque `aula-usp servir` troca a tag pelo runtime local e `aula-usp build` a troca pelo motor embutido. Os dois a reconhecem pelo `src` terminado em `/aula-usp.js`, não pelo endereço. O que não funciona, até a publicação, é abrir o arquivo criado direto no navegador com dois cliques: para ver a aula, use `servir`.

## O ciclo

Criada a pasta, são três comandos, e você passa a aula inteira nos dois primeiros.

### `aula-usp validar` — o ciclo curto

```bash
aula-usp validar minha-aula
```

Sem nada a dizer, ele diz isso, e termina com código 0:

```
Validador Aula USP: 0 erros, 0 avisos
```

Com o que dizer, cada achado vem numa linha, e o resumo no fim. Uma aula de quatro slides com quatro enganos comuns — uma classe inventada, um `style`, um título grande demais e matemática entre cifrões — produz esta lista, que é saída de verdade:

```
AVISO · aula · estrutura.blocos · a aula tem 1 abertura; o mínimo é 2. Organize a aula em 2 a 8 blocos, cada um aberto por data-layout="abertura".
AVISO · slide 3 #erros · estrutura.notas-ausentes · slide de layout "conteudo" sem notas do apresentador. Acrescente <aside class="notas"> com o que dizer neste slide.
ERRO · slide 3 #erros · estrutura.fora-do-layout · <div> não é permitido no layout "conteudo". Remova o elemento ou mova-o para um layout que o aceite, na ordem prevista.
    <div class="caixa-azul">Uma classe que não existe.</div>
ERRO · slide 3 #erros · vocabulario.classe · classe "caixa-azul" não existe no contrato. Use só classes previstas no contrato.
    <div class="caixa-azul">Uma classe que não existe.</div>
ERRO · slide 3 #erros · vocabulario.style · estilo em linha em <p>. Remova o estilo inline; use os layouts e componentes do sistema.
    <p style="color: red">A taxa $\eta$ decide o passo.</p>
ERRO · slide 3 #erros · limites.titulo · título com 80 caracteres num segmento (máx. 50). Corte o título ou divida o conteúdo em dois slides.
    Um título que é longo demais para caber em uma linha só do slide e segue adiante
AVISO · slide 3 #erros · matematica.cifrao-suspeito · "$\eta$" parece matemática entre cifrões. Escreva matemática entre \( e \); $ não é delimitador.
    $\eta$
Validador Aula USP: 4 erros, 3 avisos
```

Repare que o `<div class="caixa-azul">` rendeu dois erros — um de forma e um de vocabulário —, e que os dois somem juntos quando o `div` sai. É a regra geral: **conserte a causa, não a mensagem** (**O validador**).

Rode este comando a cada slide novo, e não no fim da aula. Ele é rápido, e quatro mensagens sobre um slide que você acabou de escrever custam menos que quarenta sobre uma aula inteira.

### `aula-usp servir` — ver enquanto escreve

```bash
aula-usp servir minha-aula
```

```
servindo minha-aula em http://127.0.0.1:8765/
```

Abra o endereço e você tem a aula montada, com navegação, passos, notas e o painel do validador — o mesmo painel de **O fluxo no chat, sem terminal**, na tecla **V**. Aqui ele serve para outra coisa: ver o slide desenhado. Uma lista que ficou longa demais, um título que quebrou feio, uma figura que sobrou da área — isso a lista do terminal não mostra.

Não há recarga automática: depois de editar o arquivo, recarregue a página. `--porta` muda a porta quando a 8765 estiver ocupada.

**Quando não há olho humano nesta ponta** — um agente escrevendo a aula sozinho, um pedido que veio por script —, o comando que serve é o `build`, e não este. Com Chrome na máquina ele mede a composição num navegador de verdade, gera o PDF e confere que o número de páginas bate com o que a aula pede (`saida.pdf-paginas`); o PDF fica em `dist/` e é um arquivo, que não depende de servidor nem de navegador para ser lido depois. Daqui em diante é o que a sua máquina tem, não o que o sistema promete: ver as páginas como imagem pede um rasterizador de PDF — o `pdftoppm`, do Poppler, é um —, e alguns agentes leem PDF direto. Sem Chrome não há PDF nenhum (seção "Quando não há Chrome"), e o que sobra é a lista do validador. Nenhum desses caminhos substitui a revisão do autor, que é sobre o que o validador não mede: se a figura diz alguma coisa, se a derivação revela os passos na ordem certa.

### `aula-usp build` — a entrega

```bash
aula-usp build minha-aula
```

As sete etapas se anunciam enquanto correm, e o resumo vem no fim. A aula-exemplo do repositório, construída agora:

```
aula-usp build: etapa 1/7 — validando estática e carga (sem navegador)
aula-usp build: etapa 2-4/7 — montando, pré-renderizando e embutindo
aula-usp build: etapa 5/7 — abrindo o Chrome e medindo composição
aula-usp build: etapa 5/7 — composição sem erro
aula-usp build: etapa 6/7 — gerando o PDF
aula-usp build: etapa 6/7 — PDF gerado, 11 página(s)
aula-usp build: etapa 7/7 — validando o número de páginas do PDF
aula-usp build: concluído — código 0
Validador Aula USP: 0 erros, 0 avisos
PDF: 11 páginas.
```

**O build escreve só dentro de `minha-aula/dist/`, e nunca toca no seu fonte.** São três arquivos, com o nome da pasta da aula:

| arquivo | o que é |
|---|---|
| `minha-aula.html` | a aula num arquivo só, com CSS, fontes, marcas, imagens e matemática já dentro. Não depende de internet nem da CDN: é o que você leva para projetar |
| `minha-aula.pdf` | um slide por página, em 1280 × 720, mais uma página por passo nos slides com `data-pdf="passos"` |
| `validacao.json` | a mesma lista de achados, em objetos |

`--sem-pdf` pula as etapas 6 e 7. Vale enquanto a composição ainda estiver vermelha: você ganha o HTML montado sem esperar o PDF.

O build para onde o erro apareceu. Com erro estático ou de carga, ele grava só o `validacao.json` e nem monta; com erro de composição, grava o HTML e o `validacao.json` e não gera o PDF. Nos dois casos, termina com código 1.

## Ler o que ele diz

A anatomia de uma mensagem — severidade, lugar, regra, problema, ação — está em **O validador**, e vale igual nos quatro fluxos. Três coisas são do terminal:

- **a lista vai para o stdout; o resto, para o stderr.** O progresso do build e o aviso de ambiente saem pelo stderr de propósito, para que a saída de `--json` possa ser canalizada sem nada solto no meio a quebrar o parse.
- **o código de saída resume tudo num número:** 0 sem erros, e avisos são permitidos; 1 com erros de validação; 2 quando não deu para rodar — pasta não encontrada, dependência ausente, flag errada. Num script ou num agente, teste o código; não procure palavra na saída.
- **cada comando aceita só as suas flags.** `--json` em `build`, ou `--porta` em `validar`, saem com o uso e código 2, como uma flag que não existe. É de propósito: recusar avisa, ignorar em silêncio, não.

Para um agente, `--json` dá a mesma lista em objetos, um por achado, com os campos `severidade`, `slide`, `id`, `regra`, `mensagem`, `acao` e `trecho`:

```bash
aula-usp validar minha-aula --json
```

A saída é um array; abaixo, um elemento dele — o achado de `vocabulario.style` da lista de cima:

```json
{
  "severidade": "erro",
  "slide": 3,
  "id": "erros",
  "regra": "vocabulario.style",
  "mensagem": "estilo em linha em <p>.",
  "acao": "Remova o estilo inline; use os layouts e componentes do sistema.",
  "trecho": "<p style=\"color: red\">A taxa $\\eta$ decide o passo.</p>"
}
```

`slide` e `id` vêm nulos quando o achado é da aula inteira, e `trecho` vem nulo quando não há trecho a citar.

## Quando não há Chrome

O build usa o Google Chrome de verdade para medir a composição e gerar o PDF — o instalado na máquina, ou o executável apontado pela variável de ambiente `CHROME_PATH`. Ele não baixa navegador.

Sem Chrome, **nada falha**: as etapas 5 e 6 são puladas, o HTML sai, e o aviso aparece no stderr, na forma `Aula USP: aviso: composição pulada, sem Chrome: …`, com o motivo no fim. O comando termina com 0 se não houver outro erro.

Isso é uma degradação, não uma aprovação. Sem Chrome ficam de fora o grupo inteiro de composição e a conferência do número de páginas do PDF, e **"zero erros" ali não é o mesmo "zero erros" de quem tem Chrome** (**O validador**). Se você trabalha num ambiente sem navegador, aponte `CHROME_PATH` para um, ou trate o resultado como parcial e confira num Chrome antes da aula.

## O que entregar

Uma aula pronta é a pasta do fonte — `index.html` e o `img/`, se houver — mais o que o build escreveu em `dist/`.

O fonte é o que você edita na semana que vem; o `minha-aula.html` é o que você abre no projetor, e ele não precisa de internet; o `minha-aula.pdf` é o que vai para os alunos. Os três saem da mesma rodada, e é por isso que não há duas versões da aula para manter em dia.

<!-- guia/71-fluxo-chat.md -->

# O fluxo no chat, sem terminal

Este é o fluxo de quem não roda nada: você pede a aula num chat — Claude ou ChatGPT, na web —, salva o HTML que veio, abre no navegador e trabalha dali. Não há instalação, não há comando, não há pasta de projeto. O que faz o sistema funcionar é uma linha no `<head>`.

Ele custa duas coisas em relação ao fluxo do terminal (**O fluxo com terminal**): o PDF sai do navegador, não do sistema, e as regras de saída não rodam. Tudo o mais — montagem, matemática, código, navegação, apresentador, e a validação com erro e aviso — acontece igual, porque é o mesmo código.

## A tag do runtime

A aula inteira depende de uma linha, no `<head>`, com esta forma:

```html
<script src="https://cdn.jsdelivr.net/npm/aula-usp@<versão>/dist/aula-usp.js"
        integrity="sha384-…" crossorigin="anonymous"></script>
```

A versão é exata e vem acompanhada de um hash de integridade: se o arquivo na CDN mudar, o navegador se recusa a executá-lo. O efeito colateral é bom para quem dá aula — a sua aula fica presa à versão com que foi feita, e não muda de aparência sozinha na véspera. Atualizar é trocar a tag.

**A tag já traz a versão e o hash reais; o endereço é que ainda não resolve.** Quem a escreve é o `aula-usp pacotes`, lendo a versão do `package.json` do sistema e o `integrity` do manifesto que o `aula-usp dist` escreve, e ela chega pronta no modelo, nos exemplos e nos quatro pacotes para agentes. O que falta é o outro lado: o pacote não está publicado no npm — a publicação é da fase 3 do projeto —, então buscar esse endereço hoje não traz nada. Até lá, este fluxo se experimenta com `aula-usp servir` (**O fluxo com terminal**), que troca a tag pelo runtime local; o resto deste arquivo vale igual nos dois casos.

Uma propriedade da tag vale conhecer antes de precisar dela: **se o runtime não carregar, a aula não some.** Sem internet, ou com a CDN fora do ar, nada é escondido e o HTML aparece cru — feio, sem grade e sem cor, mas legível, com o texto de todos os slides na tela.

## O que acontece quando a página abre

Ela não desenha o slide de imediato, e a ordem tem uma razão que afeta você:

1. o corpo fica escondido até a montagem terminar, para você não ver o HTML cru piscar;
2. o runtime **guarda uma cópia do seu fonte antes de tocar em qualquer coisa** — é sobre essa cópia que as regras estáticas rodam, e é por isso que o validador acusa o que **você** escreveu, e não o que o sistema montou;
3. o CSS e as fontes entram embutidos, e `montar` desenha o cromo;
4. se a aula tem `\(` ou `\[`, o runtime busca o script da matemática no mesmo endereço; se tem `pre[data-lang]`, o do código. Uma aula sem matemática não paga pelo KaTeX;
5. depois que scripts, imagens e fontes carregaram, rodam as regras de carga e as de composição;
6. o motor inicia, e a aula está pronta para navegar.

Isso quer dizer que **o painel do validador não é o primeiro a aparecer**: ele espera as imagens e a matemática, porque parte das regras não tem resposta antes disso.

## O painel do validador

A tecla **V** abre e fecha o painel. Ele traz a mesma lista do terminal, com as mesmas mensagens, porque é o mesmo módulo — a anatomia de cada linha está em **O validador**.

**Ele abre sozinho quando há erro**, e só quando a página não está em tela cheia: numa aula em andamento, o painel nunca se intromete. Avisos não o abrem; vão para o console do navegador, onde você os procura quando quiser.

No pé do painel há o botão **Copiar para o chat**. Ele copia a lista inteira, com um cabeçalho na primeira linha:

```
Validador Aula USP: 4 erros, 3 avisos
ERRO · slide 3 #erros · vocabulario.style · estilo em linha em <p>. Remova o estilo inline; use os layouts e componentes do sistema.
    <p style="color: red">A taxa $\eta$ decide o passo.</p>
…
```

É esse texto que fecha o ciclo: cole-o no chat e peça a correção. O modelo recebe o nome da regra, o slide, o trecho e a ação — tudo que ele precisa para consertar sem adivinhar.

**Um detalhe que decepciona quem abre a aula com dois cliques:** em `file://` o botão vem desabilitado. A área de transferência do navegador só existe em contexto seguro, e um arquivo local não é um. Não é defeito, e não há o que configurar — o botão aparece apagado de propósito, em vez de não fazer nada quando clicado. Nesse caso, selecione as linhas do painel e copie à mão. Servido por `http://` ou aberto como artifact, em `https://`, o botão funciona.

## O ciclo

1. **Peça a aula**, ou o próximo slide, no chat.
2. **Salve o HTML** que veio, com extensão `.html`.
3. **Abra no navegador** e olhe o slide. Navegue com as setas; `?` mostra as teclas.
4. **Tecle V**, leia a lista, copie.
5. **Cole no chat** e peça a correção, citando o que você também viu na tela.
6. **Salve por cima e recarregue.** Não há recarga automática.

Repita por slide, ou por bloco. A lista encolhe sozinha quando você conserta a causa, porque um engano costuma render mais de uma mensagem (**O validador**).

Quando o modelo pedir referência, dê a ele o guia — é para isso que existem os pacotes: uma skill, um Projeto do Claude ou um GPT personalizado já vêm com estes arquivos dentro, e o modelo passa a escrever dentro do contrato desde o primeiro slide, em vez de aprender por erro.

## O que muda neste fluxo

**Imagens.** Não há build para embutir arquivos, e um `img/` ao lado só existe se você criar a pasta e servir os dois juntos. Numa aula que é um arquivo só, a imagem entra como URI `data:` dentro do próprio `src` — é o que o espécime faz (**Componentes**). Uma imagem em `https://` funciona, e custa um aviso (`recursos.imagem-externa`): ela depende de um servidor que não é seu no dia da aula.

**As regras.** Estáticas, de carga e de composição rodam todas aqui, e as de composição rodam **sempre** — você está num navegador de verdade, que é justamente o que falta ao terminal sem Chrome. As de saída não rodam, porque não há HTML final nem PDF para medir. A tabela dos quatro grupos está em **O validador**.

**O PDF.** Vem do seu navegador, e a próxima seção trata dele.

## Projetar e imprimir

Para projetar, abra a aula, tecle **F** para tela cheia e navegue com as setas ou clicando nas laterais. O painel do validador não vai abrir sozinho em tela cheia.

Para o PDF, **use o Chrome**, e imprima com "Salvar como PDF" e margens **"Nenhuma"**. A recomendação não é preferência: o tamanho da página do slide é fixado pelo CSS de impressão, e um navegador que ignore essa regra devolve um PDF em papel A4, com o slide encolhido no meio da folha.

Antes de mandar aos alunos, confira duas coisas no visualizador: se os campos amarelos e as réguas saíram (se saíram brancos, é a impressão de plano de fundo que está desligada nas opções) e se os slides com `data-pdf="passos"` renderam uma página por estado.

**Este PDF não é o mesmo PDF do fluxo do terminal.** O do `aula-usp build` não depende do navegador de ninguém, traz os metadados escritos e é conferido por uma regra de saída que compara o número de páginas com o previsto. Se você tem acesso a uma máquina com a CLI, construa lá o PDF que vai distribuir, mesmo tendo escrito a aula aqui: o fonte é o mesmo arquivo.

## A janela do apresentador

A tecla **P** abre, em outra janela, o mesmo documento em modo apresentador: o slide atual e o próximo estado em miniatura, as notas em corpo grande, cronômetro, relógio, a posição e o mapa de blocos. As duas janelas se sincronizam nos dois sentidos, e isso funciona também em `file://` — navegar numa move a outra.

Se o navegador bloquear a janela nova, o motor não fica calado: ele abre o painel de notas e escreve lá dentro "O navegador bloqueou a janela do apresentador. Libere as janelas pop-up para este endereço e tecle P de novo." Você dá a aula com as notas no painel, que é o mesmo conteúdo sem a segunda tela.

Dentro de um artifact do Claude, este é um dos pontos que podem não funcionar; o que fazer está em **A aula como artifact do Claude**.

<!-- guia/72-artifact-claude.md -->

# A aula como artifact do Claude

Um artifact do claude.ai é uma página que o Claude escreve e mostra ao lado da conversa, ao vivo. É o lugar mais confortável para escrever uma aula com um modelo: você pede, vê o slide aparecer, pede a correção e vê de novo, sem salvar arquivo a cada rodada.

É também o ambiente mais restrito dos quatro, e as restrições dele **moldaram o sistema inteiro** — é por causa delas que o runtime é um script só, que ele carrega as fontes e o CSS por dentro, e que ele vem do jsDelivr. Este arquivo diz o que funciona ali, o que não funciona, e o que fazer em cada caso.

## Antes de tudo: o que este arquivo é

**Este fluxo ainda não pode ser exercitado.** Ele depende da tag do runtime apontando para o pacote publicado no npm, e a publicação é da fase 3 do projeto (**O fluxo no chat, sem terminal**). O aceite em claude.ai está marcado para essa fase justamente por isso.

E há uma segunda ressalva, que vale para o arquivo inteiro: **o que se afirma aqui sobre o que um artifact permite é o que o projeto assume**, escrito na tabela de riscos da especificação e usado como premissa de desenho. Não é um relato de teste. Onde a especificação diz "bloqueia", o sistema já está desenhado para não depender daquilo; onde ela diz "pode bloquear", há um plano B, e é ele que você vai usar se o bloqueio acontecer com você. Quando o aceite da fase 3 rodar, o que se aprender ali entra neste arquivo, e as ressalvas saem.

## O que o projeto assume que um artifact bloqueia

| o que o artifact bloqueia | consequência para a sua aula |
|---|---|
| folhas de estilo externas, fora do Google Fonts | nenhuma — o sistema nunca usou uma |
| scripts de fora das CDNs permitidas (jsDelivr, no caminho `/npm/`) | nenhuma — é de lá que o runtime vem |
| downloads de outros tipos de arquivo | você não baixa o `.html` de dentro do artifact; veja abaixo |
| WASM carregado à parte | nenhuma — o WASM do Graphviz vem dentro do script de diagramas |

As duas primeiras linhas explicam decisões que, de fora, pareceriam exageradas. **O CSS, as fontes e as marcas viajam dentro do próprio `aula-usp.js`**, como dados embutidos, em vez de virem de arquivos ao lado: um `<link>` para uma folha de estilo não sobreviveria aqui. E o runtime é **dividido por recurso** — um script para o núcleo e um para cada recurso: a matemática, o código, os gráficos e os diagramas —, e os de recurso só são carregados quando a aula os usa, porque um único arquivo com tudo dentro seria pesado para carregar numa CDN a cada abertura. São seis scripts ao todo, contando o que a aula construída leva no lugar do núcleo; um teste de integração do repositório mede o tamanho de todos e confere os do núcleo e dos quatro recursos contra metas registradas: isso não é hábito, é a mitigação de um risco declarado.

**A terceira linha é a que muda o seu dia.** Salvar o HTML da aula em disco é o que você precisa para projetar e para distribuir, e é exatamente o que um artifact tende a não deixar fazer de dentro. A saída é pedir o arquivo pela conversa, e não pelo artifact:

> Me dê a aula inteira num único bloco de código, para eu salvar como `.html`.

Você copia o bloco, cola num editor de texto e salva com extensão `.html`. É o mesmo caminho do ChatGPT sem download (**A aula pelo ChatGPT**), e o resultado é idêntico ao que o artifact mostra — é o mesmo arquivo.

**A quarta linha é dos diagramas.** O gerador de diagramas usa o Graphviz compilado em WASM, e o WASM viaja dentro do próprio script de diagramas, sem arquivo à parte. O que se mediu, num artifact de verdade e antes de os diagramas entrarem no sistema, foi exatamente isto: um script com o pacote do Graphviz inteiro, o WASM embutido nele, compilou esse WASM e desenhou um grafo de três nós. Não se mediu um WASM carregado à parte — o sistema não carrega nenhum —, nem o script de diagramas que o sistema gera hoje, que é o mesmo pacote reempacotado. Por isso o plano B da especificação — outro motor de layout, só no navegador — não foi preciso (**Gráficos, diagramas e demos**).

**E os gráficos, só com dados inline.** Um artifact é um arquivo só, sem pasta em volta, e um gráfico que aponta para um CSV não tem de onde lê-lo: escreva as colunas dentro do próprio JSON do gráfico, como faz a segunda aula-exemplo (**Gráficos, diagramas e demos**).

## O que o projeto assume que um artifact *pode* bloquear

Estes três são incertos — a especificação os lista como "pode bloquear" —, e cada um tem o que fazer no lugar.

**A janela do apresentador (`window.open`).** A tecla **P** abre o apresentador em outra janela. Se o ambiente bloquear a janela nova, o motor não fica calado: ele abre o painel de notas e escreve lá dentro a explicação do bloqueio. Você dá a aula com as notas no painel — a tecla **N** o abre e fecha —, com o mesmo texto, sem a segunda tela, sem o cronômetro e sem a miniatura do próximo estado. Se você precisa mesmo das duas telas, salve o HTML e abra no seu navegador: lá o apresentador funciona, inclusive em `file://`.

**A tela cheia (`F`).** Sem ela, a aula fica dentro do painel do artifact, com a interface do site em volta — serve para conferir, não para projetar. Para projetar, salve o HTML e abra no navegador.

Há um efeito colateral que vale conhecer: **o painel do validador abre sozinho quando há erro e a página não está em tela cheia** (**O validador**). Num ambiente onde a tela cheia não acontece, essa condição está sempre satisfeita, e o painel aparece toda vez que a aula carregar com erro. É mais um motivo para a última regra essencial: entregue em zero erros, e ele não aparece.

**A impressão.** Se o atalho de imprimir não chegar à página, o PDF não sai dali. Salve o HTML e imprima no Chrome, com "Salvar como PDF" e margens "Nenhuma" (**O fluxo no chat, sem terminal**) — ou, melhor, construa o PDF com `aula-usp build` numa máquina com a CLI (**O fluxo com terminal**), que é o único PDF que o sistema confere.

## O que funciona bem aqui

O que sobra depois das restrições é justamente a parte em que este fluxo é o melhor dos quatro.

**O ciclo de correção é o mais curto que existe.** A aula está na mesma janela da conversa: tecle **V**, leia a lista do validador, clique em **Copiar para o chat** e cole no mesmo fio. O modelo recebe o nome da regra, o slide, o trecho e a ação, e devolve o artifact corrigido. Não há arquivo para salvar no meio.

O botão de copiar depende de contexto seguro, e um artifact é servido por `https` — ao contrário de um arquivo aberto em `file://`, onde ele vem desabilitado de propósito (**O fluxo no chat, sem terminal**). Se mesmo assim ele aparecer apagado, selecione as linhas do painel e copie à mão; o texto é o mesmo.

**A navegação, os passos, a matemática, o código e as demos** são o mesmo código dos outros fluxos, carregado pela mesma tag. Nada neles é adaptado para o artifact, e é por isso que o slide que você vê ali é o slide que vai sair no projetor.

## Como trabalhar, na prática

1. **Dê o guia ao modelo.** Num Projeto do Claude, os arquivos de conhecimento do projeto trazem o guia inteiro, o modelo, as duas aulas-exemplo, o contrato que o validador lê e os seis decks do espécime; num fio avulso, anexe o pacote. Sem isso, o modelo escreve HTML comum e você passa a primeira meia hora corrigindo vocabulário.
2. **Peça a aula como artifact**, e escreva com ele: um bloco por vez, conferindo na tela.
3. **Tecle V a cada rodada**, copie a lista e cole na conversa. Zero erros antes de seguir para o bloco seguinte.
4. **Peça o arquivo num bloco de código** quando a aula estiver pronta, e salve como `.html`.
5. **Projete e distribua a partir do arquivo salvo** — no Chrome para a sala, e pelo `aula-usp build` para o PDF, se você tiver a CLI à mão.

O artifact é onde a aula se escreve. O arquivo salvo é onde ela se dá.

<!-- guia/73-chatgpt.md -->

# A aula pelo ChatGPT

Aqui a aula chega como **arquivo**. Você conversa, o modelo escreve o HTML, você salva em disco e abre no navegador — e a partir daí tudo se passa como em **O fluxo no chat, sem terminal**, que é o capítulo a ler junto com este.

O que este tem de próprio é o começo e o fim: como dar o guia ao modelo, e como tirar dele o arquivo inteiro sem perder um pedaço no caminho.

Como os outros dois fluxos de navegador, ele depende da tag do runtime apontando para o pacote publicado, e a publicação é da fase 3 do projeto (**O fluxo no chat, sem terminal**). O aceite em ChatGPT está marcado para essa fase.

## O GPT personalizado

O jeito bom de usar este fluxo é com o GPT personalizado do Aula USP, que vem pronto no pacote do sistema. Nele:

- **os arquivos de conhecimento trazem o guia inteiro**, mais o modelo, as duas aulas-exemplo, o contrato que o validador lê e os seis decks do espécime;
- **as instruções trazem as regras essenciais e o procedimento**, e só isso: elas têm um teto de oito mil caracteres, que não dá para o guia inteiro — só a tabela de regras do validador já ocuparia a maior parte dele. Por isso o guia mora no conhecimento, e as instruções mandam consultá-lo;
- **os iniciadores de conversa** já pedem a aula na forma certa.

A consequência prática é uma só, e vale saber antes de estranhar: **quando o modelo começar a inventar marcação, mande-o consultar o guia.** Ele tem os arquivos; o que ele não tem é tudo na memória de trabalho.

Sem o GPT personalizado, numa conversa comum, anexe você mesmo o guia — ou pelo menos **O Aula USP**, **A estrutura de uma aula** e **Layouts** — antes de pedir o primeiro slide. Sem nenhuma referência, o que volta é HTML de página web: `div`s com classes inventadas, `style` em tudo, e uma hora de correção pela frente.

## Tirar o arquivo de lá

São dois caminhos, e o primeiro nem sempre está disponível.

**Se houver arquivo para baixar**, baixe, e confira duas coisas antes de comemorar: que o nome termina em `.html` e que o arquivo abre no navegador mostrando a aula, e não o código.

**Se não houver**, peça um único bloco de código. Esta é a forma:

> Escreva a aula inteira num único bloco de código, do `<!DOCTYPE html>` ao `</html>`, sem cortes e sem resumir nenhuma parte.

O projeto conta com este caminho: a tabela de riscos da especificação lista "ChatGPT sem arquivo para download", e a mitigação prevista é exatamente esta — um bloco só, para o autor salvar. Não é remendo, é o plano.

Três coisas estragam um bloco de código, e todas são fáceis de ver antes de salvar:

- **o arquivo partido em vários blocos.** Juntar dois pedaços é onde o erro entra, porque a emenda não é visível. Peça de novo, num bloco só.
- **o corte do meio**, com um "… (o resto continua igual)" ou "… os demais slides seguem o mesmo padrão". Confira que o bloco começa em `<!DOCTYPE html>` e termina em `</html>`, e que os slides que você pediu estão todos lá.
- **a tag do runtime alterada.** O `<script>` do `<head>` tem de chegar exatamente como estava, com o endereço, a versão e o `integrity` intactos. Um hash trocado faz o navegador recusar o script, e a aula abre crua.

## Salvar

Copie o bloco, cole num editor de texto simples e salve com extensão **`.html`**.

Dois cuidados que custam uma aula quando falham:

- **não use um processador de texto.** Um editor que salva formatação estraga as aspas ao gravar, e o que sai não é HTML. Qualquer editor de código serve; o bloco de notas do sistema também, desde que salve em texto puro.
- **confira a extensão de verdade.** Vários editores acrescentam `.txt` por conta própria, e o arquivo vira `aula.html.txt`, que o navegador abre como texto. Se ao abrir você vir o código em vez da aula, é isso.

Salvo o arquivo, o resto é **O fluxo no chat, sem terminal**: abrir no navegador, tecla **V** para o painel do validador, corrigir, recarregar.

## O ciclo

1. **Peça o slide ou o bloco** ao GPT.
2. **Traga o arquivo** — baixado, ou pelo bloco de código único.
3. **Abra no navegador** e olhe.
4. **Tecle V**, copie a lista de achados.
5. **Cole na conversa** e peça a correção.
6. **Salve por cima** e recarregue.

Um atalho que economiza rodadas: em vez de pedir a aula inteira e corrigir quarenta mensagens, peça bloco a bloco e feche cada um em zero erros. O modelo aprende a forma nas primeiras correções, e os blocos seguintes chegam limpos.

Em `file://` o botão **Copiar para o chat** vem desabilitado, porque a área de transferência do navegador exige contexto seguro; selecione as linhas do painel e copie à mão (**O fluxo no chat, sem terminal**).

## O que não vem por aqui

O PDF sai do seu navegador — Chrome, "Salvar como PDF", margens "Nenhuma" —, e não é o PDF que o sistema confere. Quem quer o PDF conferido, com os metadados escritos e o número de páginas validado, constrói a aula com `aula-usp build` numa máquina com a CLI (**O fluxo com terminal**). O fonte é o mesmo arquivo que você salvou: não há nada a converter.
