# A estrutura de uma aula

Uma aula é um arquivo HTML: um `<head>` com os metadados e a tag do runtime, e um `<body>` que é só uma sequência de `<section>`. Não há folha de estilo para escrever, nem script para escrever, nem pasta de projeto: o runtime traz o sistema inteiro consigo.

## O esqueleto

É este o arquivo de onde toda aula começa. Ele está em `modelos/aula/index.html`. O bloco abaixo **é** esse arquivo: `npm run guia` o copia para cá, então o que você lê aqui é o esqueleto de hoje, e não uma cópia que envelheceu.

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
        integrity="sha384-/veCQFOjbK1Ac5dMbud3+aS1leLUdQkkOsD0uI2E2Vh91om7bXSV7cjWHzRmsVG2" crossorigin="anonymous"></script>
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
- a indentação é livre; o sistema não a lê. A exceção é o interior de `<pre>`, onde o espaço é conteúdo (`30-componentes.md`).

Com terminal, `aula-usp novo minha-aula --unidade ime` cria a pasta com este arquivo dentro e duas metas já preenchidas (`70-fluxo-terminal.md`). Sem terminal, copie o arquivo inteiro e troque o conteúdo. De um jeito ou de outro, partir deste esqueleto é mais rápido do que montá-lo de memória, e você herda de graça a ordem das seções e o par de aberturas.

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

A linha do `<script>` no `<head>` é a única que muda de um fluxo de trabalho para o outro. No esqueleto acima ela aparece como o `aula-usp pacotes` a escreve: o endereço da CDN, com a versão exata e a soma de integridade que o sistema mediu. Numa aula sua ela é essa mesma linha — nos fluxos com terminal, `aula-usp servir` e `aula-usp build` a reconhecem pelo `src` terminado em `/aula-usp.js` e a trocam, respectivamente, pelo runtime local e pelo motor embutido. O capítulo do seu fluxo diz o que esperar — `70-fluxo-terminal.md`, `71-fluxo-chat.md`, `72-artifact-claude.md` ou `73-chatgpt.md`.

**A versão e o hash são reais; o endereço é que ainda não resolve:** o pacote não está publicado no npm, e a publicação é da fase 3. O modelo, os exemplos e o espécime do repositório já trazem a tag fixada. Até a publicação, a aula se experimenta com `aula-usp servir`; `71-fluxo-chat.md` conta o resto.

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

Da aula-exemplo: `exemplos/descida-do-gradiente/index.html#exercicio`. As notas não aparecem no slide — só na janela do apresentador — e não contam no orçamento de palavras do slide. Escreva nelas o que você vai dizer e não está escrito na tela; `estrutura.notas-ausentes` avisa quando um slide de conteúdo, afirmação, figura ou demo não tem nenhuma.

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
- **`script` dentro de uma `section`.** O registro de uma demo mora fora dos slides (`50-graficos-diagramas-demos.md`).
- **Conteúdo que não cabe.** Os limites do contrato estão medidos para a projeção: quando um deles acusa, a resposta é cortar ou dividir o slide, nunca reduzir o texto. Quanto é "não cabe", em cada caso, está na seção seguinte.

O que pode entrar em cada layout, na ordem, está em `20-layouts.md`; o trecho pronto de cada componente, em `30-componentes.md`.

## Quanto cabe

Esta é a tabela dos números: todo limite que o contrato declara, com a medida e o que ela mede. Ela sai de `contrato/contrato.json` por `npm run guia`, e é do mesmo contrato que o validador lê — o que está aqui é o que ele vai cobrar. Escrever dentro dos limites desde a primeira versão sai mais barato do que descobri-los um a um pelo que o validador recusou.

Três avisos de leitura:

- **um segmento é o trecho entre `<br>`.** Um título de duas linhas tem dois segmentos, e o limite de caracteres vale para cada um separadamente, não para a soma. O limite de linhas é o irmão dele medido na página desenhada, quando o título quebra sozinho.
- **no código, a coluna é o caractere:** o limite de colunas de um `pre` é o comprimento da linha mais longa, e o de uma `table` é o número de colunas dela.
- **aqui está o número; a regra que o cobra e a frase que ela imprime estão em `60-validador.md`.** A mensagem de um limite traz sempre a medida encontrada e, entre parênteses, o máximo — de modo que você saiba de quanto está passando.

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
| `diagrama.nos` | no máximo 15 nós | cada `figure.diagrama` (fase 2: erro hoje) |
| `grafico.series` | no máximo 3 séries | cada `figure.grafico` |
| `saida.megabytes` | no máximo 10 megabytes | o arquivo que `aula-usp build` escreve |
<!-- /gerado -->

## O vocabulário inteiro

A seção acima diz o que não entra. Esta é a lista do que entra — todo elemento, toda classe e todo atributo que o corpo de uma aula aceita, com os valores de cada atributo. Ela sai de `contrato/contrato.json` por `npm run guia`, e é do mesmo contrato que o validador lê: o que não estiver aqui, as regras `vocabulario.*` acusam.

Quatro avisos de leitura:

- **as tabelas são da fase 1.** Classe e atributo marcados como fase 2 no contrato ficam de fora, porque o validador de hoje os recusa.
- **`section` não está na lista de elementos**, porque ela não é conteúdo: ela é o slide. O que cada `data-layout` aceita dentro dela está em `20-layouts.md`.
- **na tabela de classes, `em` é o elemento que recebe a classe e `só dentro de` é o ancestral obrigatório.** `enunciado` é classe de `div`, e um `div.enunciado` fora de um `div.exercicio` é erro.
- **na tabela de atributos, "na forma" traz a expressão exata que o validador aplica ao valor.** Ela é para quem precisa da forma literal; o que ela quer dizer em português está no arquivo do componente. O `src` de uma imagem, por exemplo, é um caminho em `img/`, um URI `data:` ou um endereço `https://`, e é isso que `30-componentes.md` diz.

<!-- gerado:tabela-de-vocabulario -->
### Elementos

`h1`, `h2`, `p`, `br`, `strong`, `em`, `sub`, `sup`, `a`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `figure`, `figcaption`, `img`, `svg`, `pre`, `code`, `aside`, `div`, `span`.

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

Classes do sistema, que o sistema escreve e o autor não: `palco`, `slide`, `area`, `cabecalho`, `rotulo`, `mapa`, `quadrado`, `visto`, `atual`, `futuro`, `contador`, `rodape`, `metadados-capa`, `roteiro`, `faixa-de-marca`, `marca-unidade`, `marca-usp`, `numero-bloco`, `fileira`, `nome-curto`, `bloco-n-de-m`, `painel`, `ativo`, `folha`, `modo-palco`, `painel-titulo`, `painel-corpo`, `grupo`, `grupo-titulo`, `cartoes`, `cartao`, `cartao-numero`, `cartao-titulo`, `teclas`, `aviso`, `modo-apresentador`, `apresentador`, `miniatura`, `quadro-miniatura`, `fim-da-aula`, `painel-apresentador`, `posicao`, `cronometro`, `tempo`, `relogio`, `notas-apresentador`, `captura-demo`, `demo-substituta`, `imprimindo`, `numerica`, `equacao`, `tex-invalido`, `linha`, `marcada`, `palavra-chave`, `comentario`, `achados`, `copiar`.
<!-- /gerado -->
