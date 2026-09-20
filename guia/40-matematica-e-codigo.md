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

**Não existe elemento de equação.** A equação em bloco é o próprio `\[ … \]` escrito como texto solto dentro da `section`, entre os outros elementos — é isso, e nada mais, que o contrato chama de `tex-destaque` ao listá-la entre os blocos de corpo, ao lado de `p`, `ul` e `table` (`30-componentes.md`). Não há `<tex-destaque>`, nem uma classe, nem um `div` para envolvê-la.

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

**Linha a linha, dentro de uma equação só:** `\passo{n}{…}` marca um pedaço do TeX com o número do passo. O KaTeX o traduz em `data-passo="n"`, e o sistema o revela junto com todo o resto que tem o mesmo número — é o mecanismo de passos em grupos de `10-estrutura.md`, chegando pelo TeX em vez de pelo atributo.

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

Da aula-exemplo: `exemplos/descida-do-gradiente/index.html#derivacao`. Cada item diz em português o que a conta faz, e a conta vem junto; quem perdeu o fio segue pelo texto.

**As duas formas não se misturam no mesmo slide.** `\passo{n}{…}` é passo numerado, e o validador o vê no fonte antes de o KaTeX rodar: um slide com `\passo{1}{…}` no TeX e um `<li data-passo>` sem número é `estrutura.passos-mistos` (medido). Ou tudo numerado, ou nada.

## O que o TeX recusa

**Cor e estilo, sempre.** `\color`, `\textcolor`, `\colorbox`, os `\html…` e os atalhos como `\red` estão na lista de proibidos do contrato (`10-estrutura.md`), e `matematica.comando-proibido` acusa cada ocorrência com o comando na mensagem — `comando proibido no TeX: \textcolor`. A razão é a de sempre: cor é papel, e a paleta não tem um papel "equação vermelha". Para destacar uma equação, o que existe é o campo amarelo em volta (`aside.destaque`) ou a revelação por passos.

**Comandos que saem do TeX e mexem na página.** O sistema compila com a confiança restrita a `\htmlData`, que é por onde o `\passo` funciona. Tudo o mais que o KaTeX classifica como comando de confiança — `\href`, `\url`, `\includegraphics` — é recusado na compilação, e chega até você como `matematica.tex-invalido` com a mensagem `comando não permitido no TeX` (medido). O nome da regra é diferente do caso acima; o conserto é o mesmo: tire o comando.

**TeX que não compila.** No build, o KaTeX roda com o erro ligado, e a mensagem dele vira `matematica.tex-invalido`, com o trecho do fonte que não compilou e a explicação do KaTeX junto — `Unexpected end of input in a macro argument, expected '}'`. No navegador é melhor ainda: a equação quebrada aparece no lugar dela, marcada, com o trecho à vista, e a mesma mensagem vai para o painel do validador. Você vê onde é, sem procurar.

## Símbolos fora do TeX

Uma seta digitada como `→`, um `≤` copiado de outro documento, um `α` colado de uma página — tudo isso é texto, não matemática, e pode não ter glifo nas fontes embutidas na aula. Quando não tem, `matematica.simbolo-fora-do-tex` acusa o caractere com o ponto de código, e a correção é escrevê-lo em TeX: `\( \to \)`, `\( \leq \)`, `\( \alpha \)`.

A regra mede só o que está fora de TeX, de código e de SVG — dentro de `\( … \)` quem desenha é o KaTeX, com as fontes dele. E ela depende de `validador/cobertura.json`, o inventário de glifos das fontes embutidas: num repositório onde esse arquivo ainda não foi gerado, a regra se cala em vez de acusar tudo.

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
- **a linguagem vem da lista do contrato.** Outro valor é `recursos.linguagem`, e a **ação** da regra traz a lista inteira das aceitas (`60-validador.md`). A `mensagem` diz só qual valor você escreveu; é no campo `acao` que a lista está, e a linha de comando imprime os dois. Um `pre` sem `data-lang` nenhum não é erro, mas também não é destacado: ele sai como texto monoespaçado.

O destaque é monocromático de propósito — negrito nas palavras-chave, cinza nos comentários, tinta no resto —, e é o mesmo em todas as linguagens da lista. É o que deixa a cor livre para dizer outra coisa.

## Linhas marcadas e numeradas

**`data-linhas` marca em amarelo as linhas que importam.** Uma linha, uma faixa, ou várias das duas coisas separadas por vírgula: `data-linhas="2"`, `data-linhas="6-7"`, `data-linhas="8-11"`. A contagem começa em um, na primeira linha de código do bloco — a quebra logo depois de `<pre>` não conta.

Marcar é a forma de dizer "olhe estas duas linhas" sem dizer em voz alta "repare na linha sete", e é a única cor num bloco monocromático. Marque o passo, não a função inteira: um bloco todo amarelo é um bloco sem ênfase nenhuma.

**`data-numeros`, sem valor, numera as linhas.** Use quando for mesmo falar "na linha três" — a numeração ocupa espaço na horizontal e só se paga quando é usada.

## Código que não cabe

Dois limites medem cada `pre` do slide, com ou sem `data-lang`: o número de linhas (`limites.codigo-linhas`) e o comprimento da linha mais longa (`limites.codigo-colunas`). Os dois estão na tabela de `60-validador.md`, com os números do contrato.

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

Do espécime: `especime/componentes.html#texto-em-linha`. O texto dentro dele não conta no orçamento de palavras, como o do `pre`; e numa legenda ou numa linha de fonte, o `code` acompanha o tamanho menor do texto em volta, em vez do mínimo do papel `codigo` (`30-componentes.md`).

Um trecho que precise de mais de uma linha não é `code` no meio da frase: é um bloco de código, e volta para o começo deste arquivo.
