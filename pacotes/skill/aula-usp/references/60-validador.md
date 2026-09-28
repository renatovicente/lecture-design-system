# O validador

O validador é o contrato lido como regras. Ele abre a sua aula, confere item por item o que `contrato/contrato.json` descreve, e devolve uma lista de achados — cada um com o lugar, o nome da regra, o que ele encontrou e o que fazer. É o mesmo módulo nos dois lugares em que você o encontra: no painel dentro da aula, que abre com a tecla **V** no navegador, e na linha de comando, em `aula-usp validar` e em `aula-usp build`. Mesmas regras, mesmas mensagens.

É por causa dele que se pode pedir uma aula a um modelo de linguagem e saber, sem abrir o arquivo, se ela está dentro do sistema. E é por isso que a última regra essencial é a mais curta: **entregue em zero erros**.

## Erro e aviso

**Erro bloqueia.** O `aula-usp build` para e não gera o HTML nem o PDF; a linha de comando termina com código 1. Um erro é sempre uma de duas coisas: você escreveu algo que o sistema não sabe montar, ou escreveu mais do que cabe no slide.

**Aviso não bloqueia** — a aula monta e o PDF sai. Um aviso é uma coisa que costuma ser engano e às vezes é escolha: um slide sem notas, uma imagem que mora em outro servidor, uma aula com um bloco só. Leia cada um e decida; o que não se faz é acumulá-los sem olhar, porque no meio deles um dia estará o que ia dar errado na sala.

O painel dentro da aula abre sozinho quando há erro — fora do modo de tela cheia, para não interromper uma apresentação —, e traz um botão **Copiar para o chat**, que copia a lista inteira no mesmo formato da linha de comando. É esse botão que fecha o ciclo de quem escreve a aula num chat, sem terminal (`71-fluxo-chat.md`). Aviso não abre painel nenhum, mas vai para o console do navegador, onde quem quiser o encontra.

## Quando cada grupo roda

As regras são de quatro grupos, e o grupo diz **quando** a regra tem como saber a resposta. O grupo de cada regra está no contrato, ao lado da severidade e da ação.

| grupo | sobre o quê | no navegador | no build |
|---|---|---|---|
| estáticas | o fonte da aula, sem cromo e sem nada renderizado | sim | sim |
| de carga | o fonte, depois de carregar as bibliotecas, as imagens e os scripts | sim | sim |
| composição | o slide montado e renderizado, no estado final | sim | só com Chrome |
| saída | o HTML e o PDF finais | não roda | sim |

**As estáticas** são a maioria, e são as que se respondem lendo o arquivo: estrutura, vocabulário, limites de tamanho, cor em SVG, comandos proibidos no TeX.

**As de carga** são as que só se sabem depois de tentar: se o TeX compila, se a imagem existe no disco, se a demo tem registro. Hoje são quatro — `matematica.tex-invalido`, `recursos.imagem`, `recursos.demo-sem-registro` e `recursos.demo-sem-estatico`.

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
- **o que fazer** — a última frase. É literalmente a coluna "como corrigir" da tabela abaixo, a mesma para todas as ocorrências daquela regra. Quando ela manda cortar sem dizer até quanto, é porque o limite depende do layout: os números todos estão na tabela de limites de `10-estrutura.md`.
- **a linha indentada**, quando existe, é o trecho do seu arquivo a que o achado se refere.

Um aviso tem a mesma forma:

```
AVISO · slide 4 #lista-grande · estrutura.notas-ausentes · slide de layout "conteudo" sem notas do apresentador. Acrescente <aside class="notas"> com o que dizer neste slide.
```

A lista vem por grupo, e **dentro de cada grupo** ordenada pela aula: primeiro o que é da aula inteira, depois slide a slide, e dentro de um slide na ordem das regras. Como um grupo vem depois do outro, o número do slide volta atrás quando o grupo seguinte começa — leia pelo `#id`, não pela posição na lista.

## As regras da fase 1

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
| `recursos.demo-sem-estatico` | aviso | Acrescente img.estatico à demo ou implemente capturar(). |
| `recursos.demo-sem-registro` | erro | Registre a demo com AulaUSP.demo('<nome>', { … }). |
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

**`estrutura.*` — o slide não tem a forma que o layout promete.** Abra `20-layouts.md`, ache a linha do layout e compare com o seu slide: os elementos são esses, nessa ordem? Duas mensagens costumam vir juntas, uma de falta e uma de sobra, e as duas são a mesma causa — um elemento que não devia estar ali ocupou o lugar do que devia.

**`vocabulario.*` — você escreveu algo que não existe no sistema.** Quase sempre é marcação de outra ferramenta que entrou por hábito: uma classe de um framework, um `style` para ajeitar um espaço, um elemento que o contrato não tem. O conserto nunca é insistir: é achar em `30-componentes.md` o componente que faz aquilo. Se não houver nenhum, o slide está pedindo algo que o sistema decidiu não ter.

**`limites.*` — não cabe.** A resposta é sempre uma das duas: **corte o conteúdo ou divida o slide em dois.** Reduzir a letra não é uma opção que exista — não há `style`, e nada no sistema encolhe texto para caber. Quando um limite acusa repetidamente no mesmo slide, o problema raramente é o limite: é um slide com duas ideias dentro.

**`composicao.*` — o fonte parecia bem, a página desenhada não.** É o grupo que mede o que só o navegador sabe: quanto de fato ocupou, em quantas linhas o título quebrou, com que tamanho o texto chegou à tela. O conserto é o mesmo dos limites, e a diferença é que aqui você já viu a página e sabe o que sobra.

**`matematica.*` — delimitador, comando ou símbolo.** Os três casos e os consertos estão em `40-matematica-e-codigo.md`.

**`recursos.*` — a imagem, a linguagem ou a demo.** `recursos.imagem` é caminho errado ou arquivo que não veio junto; `recursos.linguagem` traz a lista das aceitas na **ação** da regra — a coluna "como corrigir" da tabela acima, e o campo `acao` do `--json` —, não na mensagem, que diz só qual valor você escreveu; as duas de demo estão em `50-graficos-diagramas-demos.md`.

**`saida.*` — o produto final.** São raras, e uma delas não é culpa sua: `saida.pdf-paginas` pede que você **relate o defeito**, porque o número de páginas é conta do sistema, não escolha do autor.

Dois hábitos que economizam tempo em qualquer família:

- **conserte a causa, não a mensagem.** Uma causa só costuma render várias mensagens — um recurso de fase 2 escrito hoje rende quatro de uma vez (`50-graficos-diagramas-demos.md`). Corrija o que está errado e rode de novo; a lista encolhe sozinha.
- **rode depois de cada slide novo**, e não no fim da aula. As mensagens são baratas quando são duas e caras quando são quarenta.

## Quando ela não acusa

Silêncio não é aprovação em todos os casos, e vale conhecer os três em que não é:

- **sem Chrome, o grupo de composição não roda.** A CLI avisa por fora da lista, e o que ela lhe entregou foi uma validação parcial.
- **sem o inventário de glifos das fontes embutidas**, que o sistema gera junto com o runtime, `matematica.simbolo-fora-do-tex` se cala — acusar tudo seria pior do que não acusar nada.
- **as regras de saída só existem no build.** Uma aula impecável no painel do navegador ainda pode ter uma referência externa que só o HTML final revela.

A validação completa, com os quatro grupos, é a do `aula-usp build` com Chrome disponível. É ela que vale como "entregue em zero erros".
