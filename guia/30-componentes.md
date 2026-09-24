# Componentes

Os **blocos de corpo** são as peças com que se preenche um slide de conteúdo — soltas uma embaixo da outra, ou dentro de um `div` de uma `div.colunas` (`20-layouts.md`). O contrato os lista nesta ordem, e são estes onze:

`p`, `ul`, `ol.passos`, `aside.destaque`, `aside.quadro`, `aside.alerta`, `div.exercicio`, `table`, `pre`, `figure` e `tex-destaque` — que, apesar do nome, **não é uma tag**: é a equação em destaque, escrita como texto solto entre `\[` e `\]`. A última seção deste arquivo trata dela.

Cada um tem aqui o seu trecho pronto, tirado de um arquivo que valida — o espécime, o modelo ou a aula-exemplo —, com o endereço da seção de onde veio. Copie o trecho e troque o conteúdo.

Dois hábitos valem para todos: **não escolha o componente pela aparência, escolha pelo papel** — o amarelo não é "para chamar atenção", é o campo do que o aluno tem de levar embora —, e **quando um limite acusar, corte ou divida o slide**, nunca reduza o texto.

## Parágrafo

O bloco padrão, e o mais fácil de usar mal. O parágrafo de um slide é curto porque o orçamento de palavras é do slide inteiro, não dele: cada frase que você escreve aqui sai do espaço de outro bloco.

```html
<p class="lide">Cada escolha de pesos tem um erro, e essas alturas juntas formam uma superfície.</p>
<p>Treinar é procurar o fundo dessa superfície sem poder enxergá-la inteira. Do ponto onde está, o modelo conhece a altura e a inclinação sob os pés, e nada além disso.</p>
```

Da aula-exemplo: `exemplos/descida-do-gradiente/index.html#superficie`. O `p.lide` não é um bloco de corpo: ele pertence à sequência do layout `conteudo`, vem logo depois do título e entrega a ideia inteira na primeira frase — o corpo só a desenvolve.

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

Do espécime: `especime/componentes.html#marcadores-e-passos`. Os itens com `data-passo` aparecem um a um conforme você avança (`10-estrutura.md`); o primeiro, sem o atributo, já está na tela quando o slide abre. É o jeito de fazer a turma pensar no passo seguinte antes de vê-lo.

## Destaque

Campo amarelo com texto preto, e um rótulo opcional em maiúsculas. É o único destaque forte da paleta: guarde-o para a definição, o resultado ou a fórmula que o aluno tem de levar embora.

```html
<aside class="destaque" data-rotulo="Definição">Superfície de erro: a altura \( E(w) \) sobre cada escolha de pesos \( w \).</aside>
```

Da aula-exemplo: `exemplos/descida-do-gradiente/index.html#superficie`. Há um limite por slide (`limites.destaques`), e a razão é aritmética: destacar tudo é não destacar nada. O `data-rotulo` é curto — ele também tem limite (`limites.rotulo`) — e diz que tipo de coisa vem ali: Definição, Resultado, Exemplo.

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

Da aula-exemplo: `exemplos/descida-do-gradiente/index.html#taxa`.

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

Da aula-exemplo: `exemplos/descida-do-gradiente/index.html#exercicio`. O `div.enunciado` é obrigatório e vem primeiro; o `div.resposta` é opcional e vem depois. O `data-passo` na resposta é o que dá à turma o minuto de silêncio — sem ele, a resposta já está na tela junto com a pergunta.

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

Um `pre` com `data-lang`, numa das linguagens do contrato — `recursos.linguagem` recusa as demais, e a ação da regra, na tabela de `60-validador.md`, lista as aceitas.

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

Há limite de linhas e de colunas (`limites.codigo-linhas`, `limites.codigo-colunas`): o que não couber num slide vira dois, ou um trecho menor. `40-matematica-e-codigo.md` trata do resto.

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

Do espécime: `especime/matematica.html#em-destaque`. A matemática no meio de uma frase é a mesma coisa com os outros delimitadores, `\( … \)`, e não é bloco de corpo: é parte do texto onde está. Delimitadores, `\passo` e derivações reveladas linha a linha estão em `40-matematica-e-codigo.md`.

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

Nem todo seletor da tabela é coisa que você escreve: a linha `rotulo` é de cromo, menos `svg text` e `svg tspan`, e `.metadados-capa`, na linha `leitura`, também — é o sistema que desenha aquele texto, e ele está aqui porque a regra o mede junto com o seu. `svg text` e `svg tspan` são o texto dos seus SVG e dos gráficos: dele vale só o mínimo de rótulo, medido no tamanho em que aparece no palco, com um achado por figura (`50-graficos-diagramas-demos.md`).

E nem todo elemento tem papel: `h1` e `h2` não casam seletor nenhum da tabela, e a regra não os mede — o tamanho do título vem do layout. A lista de "fora da medição" é o resto do que ela não mede: o miolo de uma fórmula tem escala própria; o índice e o expoente são menores por definição; o interior de uma demo, dos painéis e da faixa de marca é desenhado pelo sistema; e o `code` dentro de uma legenda ou de uma linha de fonte acompanha o tamanho dela, abaixo do mínimo do papel `codigo`.
