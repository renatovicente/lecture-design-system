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

Do espécime: `especime/index.html#grade-8-4`. Os valores de `data-grade` estão em `contrato/contrato.json`, e são as divisões do grid em números de colunas que somam a largura útil: uma coluna só, duas iguais, duas desiguais — numa ordem ou na outra — ou três iguais. Um valor que não exista no contrato é `vocabulario.atributo`.

A escolha da grade é de significado, não de estética: colunas iguais quando as duas partes têm o mesmo peso — antes e depois, texto e figura —, e desiguais quando uma argumenta e a outra comenta.

Duas contas correm no corpo, e as duas acusam por cortar, nunca por encolher a letra: o total de palavras do slide (`limites.palavras-corpo`) e o de cada coluna (`limites.palavras-coluna`). O total **não** conta o título nem o lide, que têm limite próprio, nem o que está em código, em matemática ou nas notas — é o texto de leitura do corpo, e só ele.

## Um exemplo de cada layout

Um por layout, extraído de `especime/`. Os decks do espécime são validados a cada rodada do sistema, então todo trecho abaixo é, por construção, um trecho que passa. Copie a forma; o texto é de demonstração e existe para exercitar o layout.

<!-- gerado:exemplos-por-layout -->
#### `capa`

```html
<section data-layout="capa">
  <h1>Nove blocos<br><span class="sinal">modo contador</span></h1>
</section>
```

Extraído de `especime/muitos-blocos.html`.

#### `abertura`

```html
<section data-layout="abertura">
  <h2>Séries</h2>
</section>
```

Extraído de `especime/muitos-blocos.html`.

#### `conteudo`

```html
<section data-layout="conteudo" id="dentro-do-terceiro">
  <h2>Dentro do terceiro bloco</h2>
  <p>O cabeçalho mostra o bloco em texto.</p>
  <aside class="notas">Este deck existe para mostrar o contador: acima de oito blocos, o mapa de quadrados vira "Bloco N de M".</aside>
</section>
```

Extraído de `especime/muitos-blocos.html`.

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
<section data-layout="figura" id="imagem-pequena">
  <h2>Uma imagem pequena não é ampliada</h2>
  <figure>
    <img alt="Retângulo cinza de 320 por 180 com um canto preto" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23D9D9D9'/%3E%3Crect width='80' height='45' fill='%230A0A0A'/%3E%3C/svg%3E">
    <figcaption>A imagem mantém os 320 por 180 px originais, alinhada à esquerda, e a legenda vem logo abaixo.</figcaption>
  </figure>
  <aside class="notas">Ampliar uma imagem pequena a deixaria borrada no projetor.</aside>
</section>
```

Extraído de `especime/componentes.html`.

#### `demo`

```html
<section data-layout="demo" id="demo">
  <h2>Uma demo ocupa o resto do slide</h2>
  <div class="demo" data-demo="contador" data-opcoes='{"passo": 5}'>
    <img class="estatico" alt="Imagem estática da demo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23D9D9D9'/%3E%3C/svg%3E">
  </div>
  <aside class="notas">Clicar no botão da demo uma vez antes de falar. No PDF, o que sai é a imagem estática.</aside>
</section>
```

Extraído de `especime/index.html`.

#### `encerramento`

```html
<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>Com nove blocos, o mapa vira texto.</li>
  </ol>
</section>
```

Extraído de `especime/muitos-blocos.html`.
<!-- /gerado -->

Repare no que **não** está em nenhum deles: cabeçalho, rodapé, número do slide, mapa de blocos, logo. O fonte de um slide só tem o conteúdo do slide.

O trecho pronto de cada bloco de corpo — parágrafo, lista, campo, exercício, tabela, código, figura e equação em destaque — está em `30-componentes.md`.
