# Gráficos, diagramas e demos

Três recursos que desenham por você: **o gráfico** (`figure.grafico`), que vira SVG a partir de uma especificação em JSON; **o diagrama** (`figure.diagrama`), que vira SVG a partir de um grafo em DOT; e **a demo** (`div.demo`), que roda código seu dentro do slide, com os controles do sistema. Nos três, você descreve o conteúdo e o sistema impõe a forma — cor, espessura, fonte —, igual no navegador e no build.

A segunda aula-exemplo, `assets/exemplo-recursos.html`, usa os três numa aula de verdade: um gráfico de dispersão com a reta ajustada, o ciclo do treino num diagrama e uma demo em que o controle move a inclinação. Os trechos deste capítulo saem dela e do espécime.

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

Da aula-exemplo: `assets/exemplo-recursos.html#dispersao`. O `script` com `type="application/json"` é o único filho obrigatório; a `figcaption` é opcional. `figure.grafico` e `figure.diagrama` são os dois únicos lugares da aula em que um `script` pode ficar dentro de uma `section` — ele não roda, é dado.

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

Da aula-exemplo: `assets/exemplo-recursos.html#ciclo`. Outro, com duas entradas e uma camada oculta, em `especime/componentes.html#diagrama-rede`.

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
3. **a foto que o build tira**, em toda aula gerada com `aula-usp build` (abaixo). É a forma da demo da aula-exemplo de regressão e do exemplo do layout `demo` em `20-layouts.md`: sem escrever imagem nenhuma, o PDF do build sai com a demo — o do navegador, não;
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

Da aula-exemplo: `assets/exemplo-recursos.html#inclinacao`. Os dados vão em `data-opcoes`, e o registro, no fim do arquivo, cria o deslizante, a leitura e um SVG com os pontos, a reta e os resíduos, redesenhado a cada movimento do controle. O que a demo desenha dentro da `div.demo` é dela: cores e medidas ali ficam por sua conta, e a regra de ouro continua valendo — use as cores do sistema pelos papéis delas.

**A captura.** Em toda aula, `aula-usp build` abre o HTML construído, vai até o slide de cada demo sem `img.estatico` e sem `capturar()`, cada uma numa página só dela, espera `data-captura-ms` milissegundos depois de `iniciar()` (3000, se você não escrever) e fotografa a `div.demo`; a foto entra no HTML como `img.estatico` e é ela que sai no PDF. `data-captura-ms` só muda a espera: escreva-o quando a demo fica pronta antes (o build termina mais cedo) ou depois dos 3 s. Se a foto falhar — a demo não desenhou nada, lançou erro, ou não se registrou na página —, o build diz qual demo e por quê, e ela sai no PDF como no caso 4.

## Sem gráfico nem diagrama

Nem todo desenho cabe num gráfico de quatro tipos ou num grafo. Para o resto, há dois caminhos.

**A figura pronta.** Gere a figura onde você já a gera — notebook, R, o que for —, exporte como arquivo, guarde ao lado da aula em `img/` e use `<img>` dentro de `figure`, com `alt` (`30-componentes.md`). No build, a imagem é embutida no HTML final, então a aula continua sendo um arquivo só. Vale conferir o que o sistema não confere por você: cores da paleta, eixos legíveis de longe, e nada de legenda em caixa. Para quem plota em matplotlib, o sistema guarda uma folha de estilo com as cores da aula em assets/aula-usp.mplstyle, fora deste guia e dos pacotes — ative com `plt.style.use(caminho)` antes de plotar, apontando para esse arquivo dentro do seu clone do sistema.

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

Duas coisas que surpreendem quem desenha à mão, as duas medidas:

- **o texto dentro do SVG conta no orçamento de palavras.** Rótulo de eixo, nome de série, valor anotado: num slide de `conteudo`, tudo isso entra em `limites.palavras-corpo`, e dentro de uma coluna, também em `limites.palavras-coluna`. Uma figura muito anotada estoura o orçamento sem uma frase de prosa sequer. No layout `figura`, que não tem orçamento de corpo, a conta não corre.
- **o texto dentro do SVG é medido no tamanho em que aparece no palco**, contra o mínimo de rótulo, 14 px. O SVG escala com a largura da figura: um `font-size="14"` num `viewBox` mais largo que a coluna sai menor que 14 e é `composicao.tamanho-minimo`. No layout `figura`, ele escala também com a altura que sobra embaixo do título: um `viewBox` mais alto que largo encolhe por ela, e aí o que resolve não é largura, é empilhar menos. O achado é um por figura, com a menor medida e a dimensão — largura ou altura — que a figura precisaria. O azul vale do mesmo jeito: texto de SVG em azul abaixo de 32 px no palco é `composicao.azul-pequeno`, mesmo com `font-size="32"` no fonte.
