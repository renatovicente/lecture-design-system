# Layouts

Os sete layouts de slide do Aula USP: o que cada um aceita, em que ordem, e um exemplo de cada um tirado do espécime.

> Esqueleto: a prosa deste arquivo ainda será escrita. O que está entre `<!-- gerado:… -->` e `<!-- /gerado -->` é escrito por `npm run guia` a partir de `contrato/contrato.json` e de `especime/` — não edite à mão; edite a fonte e regere.

## A gramática dos sete layouts

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

## Um exemplo de cada layout

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
