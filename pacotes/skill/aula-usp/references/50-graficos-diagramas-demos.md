# Gráficos, diagramas e demos

Três nomes num arquivo só, com estados diferentes: **a demo interativa, o gráfico (`figure.grafico`) e o diagrama (`figure.diagrama`) funcionam hoje; os controles do sistema ainda não existem, e o validador os recusa com erro.** O gráfico tem exemplo no layout `figura`, em `20-layouts.md`, e o diagrama, logo abaixo; o capítulo completo sobre os dois ainda vai ser escrito.

Este arquivo diz o que você pode usar agora, mostra a forma da demo, e depois diz o que a fase 2 vai trazer, sem mostrar marcação de coisa que não roda. Documentar como pronto o que não existe é pior do que não documentar.

## O que existe hoje

| recurso | hoje |
|---|---|
| demo interativa (`div.demo`, `AulaUSP.demo`) | funciona |
| figura em SVG escrito à mão, dentro de `figure` | funciona (`30-componentes.md`) |
| imagem de arquivo em `img/`, ou URI `data:` | funciona (`30-componentes.md`) |
| `figure.grafico` com a especificação do gráfico em JSON | funciona (`20-layouts.md`, layout `figura`) |
| `figure.diagrama` com o grafo em DOT | funciona (abaixo) |
| controles do sistema, como `button.controle` | fase 2: erro hoje |
| captura automática da demo no build (`data-captura-ms`) | fase 2: erro hoje |

Quem decide isso não é esta tabela: é `contrato/contrato.json`, onde as entradas de fase 2 estão marcadas, e é dele que o validador lê. A tabela de vocabulário de `10-estrutura.md` é gerada **da fase 1**, e é por isso que nenhuma das linhas de fase 2 acima aparece lá — se um dia aparecerem, é porque passaram a valer.

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

- **`data-demo` é o nome**, em minúsculas, números e hífens. É por ele que o sistema acha o registro correspondente.
- **`data-opcoes` é um objeto JSON**, entregue ao registro quando a demo é montada. É o que deixa a mesma demo servir a duas aulas com parâmetros diferentes, sem copiar código.
- **`img.estatico` é o que sai no PDF.** É o único filho que o contrato aceita dentro de `div.demo`.

**A interface da demo não se escreve no HTML.** Botão, controle deslizante, canvas: tudo isso é criado pelo código do registro, dentro da `div.demo`, quando o slide abre. Escrevê-los no fonte é erro — um `<button>` no corpo da aula é `vocabulario.elemento`, porque ele não está no vocabulário da fase 1 (medido).

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

**Dentro de uma `section`, o `script` é erro** (`vocabulario.script`), e a mensagem diz para onde ele vai: "registros de demo ficam fora dos slides". A razão é que o corpo do slide é o que o validador confere e o que o sistema monta; código executável ali dentro fura os dois.

No ciclo de vida do slide, o sistema chama três funções, e só elas:

- **`montar(raiz, opcoes)`** roda uma vez, na primeira entrada no slide. `raiz` é a `div.demo`; `opcoes` é o objeto de `data-opcoes`, ou `{}`.
- **`iniciar()`** roda a cada entrada no slide, e **`parar()`**, a cada saída. É onde entram e saem animação, som e temporizador — nenhuma demo roda com o slide fora da tela.

Há uma quarta, `capturar()`, que não é do ciclo de vida: ela é chamada na hora de imprimir, e a próxima seção trata dela. Qualquer outro método do objeto, como o `mostrar()` acima, é seu: o sistema não o conhece nem o chama. E uma demo que falhe em qualquer uma delas não derruba a aula — o erro vai para o console do navegador, com o nome da demo e a etapa.

## A demo no PDF

O PDF é papel: nada nele é interativo. O que sai no lugar da demo, em ordem:

1. **a `img.estatico`, se houver.** É a forma recomendada, e a que o espécime usa: você escolhe o instante que representa a demo.
2. **o resultado de `capturar()`**, se o registro definir essa função. Ela devolve um canvas ou um URI de imagem, e é útil quando o quadro que importa depende do que aconteceu na sala.
3. **um aviso**, se não houver nem uma nem outra: um bloco com "Demo interativa: abra o HTML", no idioma da aula.

`recursos.demo-sem-estatico` é o aviso que aparece no caso 3 — ele acusa antes de você descobrir o buraco no PDF. E `recursos.demo-sem-registro` é erro: uma `div.demo` cujo `data-demo` não tem registro correspondente não tem como funcionar em lugar nenhum.

## Um gráfico hoje

Sem `figure.grafico`, restam dois caminhos, e os dois já estão no sistema.

**A figura pronta.** Gere o gráfico onde você já o gera — notebook, R, o que for —, exporte como arquivo, guarde ao lado da aula em `img/` e use `<img>` dentro de `figure`, com `alt` (`30-componentes.md`). No build, a imagem é embutida no HTML final, então a aula continua sendo um arquivo só. Vale conferir o que o sistema não confere por você: cores da paleta, eixos legíveis de longe, e nada de legenda em caixa.

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

Do espécime: `especime/index.html#figura`. O vocabulário de SVG do contrato está em `10-estrutura.md`, com a lista de elementos, de atributos e as cores aceitas; `vocabulario.cor-svg`, `vocabulario.azul-svg` e `vocabulario.amarelo-svg` cuidam para que a paleta valha ali dentro como vale no resto do slide.

Duas coisas que surpreendem quem desenha um gráfico à mão, as duas medidas:

- **o texto dentro do SVG conta no orçamento de palavras.** Rótulo de eixo, nome de série, valor anotado: num slide de `conteudo`, tudo isso entra em `limites.palavras-corpo`, e dentro de uma coluna, também em `limites.palavras-coluna`. Um gráfico muito anotado estoura o orçamento sem uma frase de prosa sequer. No layout `figura`, que não tem orçamento de corpo, a conta não corre.
- **o texto dentro do SVG é medido no tamanho em que aparece no palco**, contra o mínimo de rótulo, 14 px. O SVG escala com a largura da figura: um `font-size="14"` num `viewBox` mais largo que a coluna sai menor que 14 e é `composicao.tamanho-minimo`. No layout `figura`, ele escala também com a altura que sobra embaixo do título: um `viewBox` mais alto que largo encolhe por ela, e aí o que resolve não é largura, é empilhar menos. O achado é um por figura, com a menor medida e a dimensão — largura ou altura — que a figura precisaria. O azul vale do mesmo jeito: texto de SVG em azul abaixo de 32 px no palco é `composicao.azul-pequeno`, mesmo com `font-size="32"` no fonte.

**Um diagrama** é `figure.diagrama` com o grafo em DOT dentro de `<script type="text/vnd.graphviz">`, e `figcaption` opcional. O Graphviz decide as posições; o sistema impõe o estilo: nós retangulares com contorno de 2 px em tinta, texto Geist 20, setas de 2 px, `class="foco"` num nó em campo amarelo e `class="ativo"` numa aresta em azul. A direção padrão é da esquerda para a direita (`rankdir=LR`), porque o palco é mais largo que alto; um `rankdir` seu vence. DOT que não compila é `recursos.dot`, com a mensagem do Graphviz e a linha que ela cita; mais de 15 nós é `recursos.diagrama-grande`.

O que você escreve no DOT e o sistema não segue tem dois destinos:

- **descartado, sem aviso**, porque o desenho sai certo sem ele: cor (`color`, `fillcolor`, `fontcolor`, `bgcolor`), espessura (`penwidth`), forma de seta (`arrowhead`, `arrowtail`), `shape` que não seja `record`, e `style` que não seja `invis`;
- **recusado, com `recursos.dot`**, porque descartado desenharia outra coisa: `style=invis` (sairia visível), `shape=record` e `Mrecord` (sairiam sem as divisões), rótulo HTML `label=<…>` (sem negrito e fora do lugar), `headlabel`, `taillabel` e `xlabel` (sumiriam), `label` no grafo (o título vai na `figcaption`) ou num subgrafo que não é `cluster_…`, `fontsize`, `fontname`, `fixedsize`, `width`, `height` e `margin` (o texto é sempre 20, e a caixa seria medida para outro), classe fora de `foco` num nó e `ativo` numa aresta, e mais de um grafo no mesmo bloco (só o primeiro seria desenhado).

O texto de 20 também é medido no palco. Um diagrama mais largo que a figura encolhe com ela, e numa coluna estreita cai abaixo de 14; um diagrama mais alto que o espaço embaixo do título encolhe pela altura no layout `figura` — medido, uma cadeia de dez nós de cima para baixo sai com 13,3 px, e da esquerda para a direita, com 20. Do espécime: `especime/componentes.html#diagrama-rede`.

## O que a fase 2 vai trazer

Nada nesta seção funciona hoje. Ela está aqui para você saber o que não vale a pena improvisar e o que virá pronto.

- **Os controles**, para as demos não terem de criar botão e cursor na mão, e saírem iguais em todas as aulas.
- **A captura automática**, que fotografa a demo no build e dispensa a `img.estatico` escrita à mão.

Escrever qualquer um deles hoje não é ficar um passo à frente: é ganhar erro.
