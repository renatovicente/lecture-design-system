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
- **`um bloco de corpo`** é qualquer um dos blocos de `30-componentes.md`: parágrafo, lista, campo, exercício, tabela, código, figura ou equação em destaque.
- **`ou`** separa alternativas que não se somam: no `conteudo`, ou uma `div.colunas`, ou blocos de corpo soltos — não os dois.
- **cromo automático** é a lista do que você **não** escreve. Ela não é conteúdo permitido: é o que já vem pronto.

`aside.notas` não aparece na tabela porque não entra na sequência de nenhum layout: pode vir em qualquer slide, e o lugar habitual é o fim da seção.

A tabela sai de `contrato/contrato.json` por `npm run guia`, e é do mesmo contrato que o validador lê as regras. Editá-la à mão muda o guia por uma geração, até alguém rodar o gerador; o que muda o sistema é o contrato.

## Quando usar cada layout

**`capa`** abre a aula, e traz só o título. A linha de metadados, o roteiro dos blocos e a faixa de marca com os logos vêm do `<head>` e das aberturas. Um `<br>` seguido de `<span class="sinal">` parte o título em duas linhas e põe a segunda em azul — é o subtítulo.

**`abertura`** abre um bloco, e é a promessa que os slides seguintes cumprem. O título é curto porque vira o rótulo do cabeçalho e o nome sob o quadrado do mapa (`10-estrutura.md`); a pergunta, opcional, diz o que o bloco responde. Escrita como pergunta de verdade, ela dá ao aluno um motivo para prestar atenção no bloco inteiro.

**`conteudo`** é o slide de trabalho, e é onde a aula passa a maior parte do tempo. Título, lide opcional, e o corpo — em colunas ou solto.

**`afirmacao`** é uma frase sozinha na tela, grande, sem título, com a origem opcional embaixo em `p.fonte`. Serve para virar a chave da aula: você lê em voz alta, para, e deixa a turma ler. Gasta um slide inteiro numa frase, e é esse o efeito.

**`figura`** dá à figura a zona de conteúdo inteira, com a legenda embaixo. O título é opcional, porque muitas vezes a legenda já diz o que é. Uma figura por slide: para figura ao lado de texto, o layout é `conteudo` com colunas.

**`demo`** dá a mesma área a uma demo interativa, que você conduz ao vivo. É uma demo por slide, e a imagem estática dentro dela é o que sai no PDF — sem ela, `recursos.demo-sem-estatico` avisa (`50-graficos-diagramas-demos.md`).

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

Do espécime: `especime/index.html#grade-8-4`. Os valores de `data-grade` são as divisões do grid em números de colunas que somam a largura útil, e estão todos na tabela de vocabulário de `10-estrutura.md`, cada um com o número de `div` filhos que pede. Um valor que não exista no contrato é `vocabulario.atributo`.

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

O trecho pronto de cada bloco de corpo — parágrafo, lista, campo, exercício, tabela, código, figura e equação em destaque — está em `30-componentes.md`.
