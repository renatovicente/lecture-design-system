# A estrutura de uma aula

Uma aula é um arquivo HTML: um `<head>` com os metadados e a tag do runtime, e um `<body>` que é só uma sequência de `<section>`. Não há folha de estilo para escrever, nem script para escrever, nem pasta de projeto: o runtime traz o sistema inteiro consigo.

## O esqueleto

É este o arquivo de onde toda aula começa. Ele está em `modelos/aula/index.html`, e nos pacotes para agentes vem como `assets/modelo.html`.

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
<script src="../../dist/aula-usp.js"></script>
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

O que há para reparar nele:

- a ordem é obrigatória: a aula **começa** na `capa` e **termina** no `encerramento`;
- entre uma abertura e a seguinte ficam os slides daquele bloco — aqui, um de cada;
- a indentação é livre; o sistema não a lê. A exceção é o interior de `<pre>`, onde o espaço é conteúdo (`30-componentes.md`).

Comece copiando o arquivo inteiro e trocando o conteúdo. É mais rápido do que montá-lo de memória, e você herda de graça a ordem das seções e o par de aberturas.

## Os metadados

As cinco metas do `<head>` são obrigatórias, e `estrutura.metadados` acusa a que faltar:

| meta | o que faz |
|---|---|
| `unidade` | escolhe o logo e o nome do instituto na faixa de marca da capa e do encerramento |
| `disciplina` | entra no rodapé de todo slide e na linha de metadados da capa |
| `aula` | idem; é um número ou um texto curto, como `4` ou `3b` |
| `data` | em `AAAA-MM-DD`; o sistema a escreve por extenso curto, no idioma da aula |
| `professor` | entra na linha de metadados da capa |

`unidade` é uma chave de `assets/marcas/unidades.json`; se a sua não estiver lá, o validador recusa o valor e diz, na mensagem, quais existem. Uma unidade nova entra com uma linha nesse arquivo e o arquivo do logo, sem tocar em código.

`disciplina`, `aula` e `professor` têm um tamanho máximo, porque cabem numa linha de rodapé ou de capa; quando um passa, `limites.metadado` diz de quanto era o limite e de quanto foi o seu texto. Não há por que adivinhar: escreva e deixe o validador medir.

O `lang` do `<html>` escolhe o idioma dos rótulos que o sistema escreve — "Bloco", "Aula", os meses da data. Uma aula em inglês é o mesmo arquivo com `lang="en"`.

## A tag do runtime

A linha do `<script>` no `<head>` é a única que muda de um fluxo de trabalho para o outro: no repositório do sistema ela aponta para o runtime local, como no esqueleto acima; numa aula sua, ela aponta para a versão publicada, com a sua soma de integridade. O arquivo do seu fluxo diz qual usar — `70-fluxo-terminal.md`, `71-fluxo-chat.md`, `72-artifact-claude.md` ou `73-chatgpt.md`.

Duas propriedades dessa tag valem conhecer. A versão é exata e vem com `integrity`, então uma aula fica presa à versão com que foi feita e não muda de aparência sozinha; atualizar é trocar a tag. E se o runtime não carregar — sem internet, por exemplo —, o HTML aparece cru, feio mas legível, em vez de aparecer em branco.

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
- **Conteúdo que não cabe.** Os limites do contrato estão medidos para a projeção: quando um deles acusa, a resposta é cortar ou dividir o slide, nunca reduzir o texto.

O que pode entrar em cada layout, na ordem, está em `20-layouts.md`; o trecho pronto de cada componente, em `30-componentes.md`.
