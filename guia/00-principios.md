# O Aula USP

O Aula USP é um design system de slides de aula, em HTML, para as disciplinas do IME e do IFUSP. Uma aula é **um arquivo**: você escreve o conteúdo, e o sistema faz o resto — tipografia, grade, cor, mapa de blocos, cabeçalho, rodapé, numeração, matemática, destaque de código, navegação, janela do apresentador e PDF.

O mesmo arquivo serve às duas entregas de uma aula: projetado na sala e distribuído em PDF. Não há duas versões para manter em dia.

Este guia é a fonte de tudo que se pode escrever numa aula, e tem dois leitores ao mesmo tempo: o professor, que quer saber por que uma regra existe, e o modelo de linguagem a quem ele pede a aula, que precisa da forma exata. Por isso o porquê vem em prosa e a forma vem em bloco de código. Quando os dois parecerem discordar, **o bloco de código é a autoridade**: a marcação deste guia é tirada de arquivos que o validador aprova, e vem com o endereço de onde saiu.

## O que você escreve e o que o sistema desenha

Cada `<section>` do corpo do arquivo é um slide. O `data-layout` da seção diz que papel esse slide tem, e cada layout aceita um conjunto fechado de elementos, numa ordem fixa — é o assunto de `20-layouts.md`.

O sistema deriva das seções, e desenha sozinho:

- o cabeçalho de cada slide, com o rótulo do bloco, o mapa de quadrados e o contador;
- o rodapé, com a disciplina e o número da aula;
- a linha de metadados e o roteiro da aula, na capa;
- o número do bloco, a fileira de quadrados e os nomes curtos, nas aberturas;
- a faixa de marca, com os logos da unidade e da USP, na capa e no encerramento;
- a matemática, o destaque do código, a revelação por passos e a paginação do PDF.

Nada disso se escreve à mão: um slide com o número da aula digitado no rodapé é um slide com o número duas vezes. É o engano mais comum de quem chega de uma ferramenta em que o autor desenha o próprio rodapé.

## Por que as restrições são estas

Quase todas as regras deste guia descendem de três decisões.

**A aula é lida de longe.** O sistema fixa um tamanho mínimo de letra para cada papel — leitura, código, legenda, rótulo — e o validador o mede no slide montado. A consequência é a regra mais importante de todas: quando o conteúdo não cabe, **corte ou divida o slide em dois; nunca diminua a letra**. Os limites de título, de lide, de palavras e de itens existem para que você descubra que não cabe enquanto escreve, e não na hora de projetar.

**Cor é informação, nunca enfeite.** A paleta é curta, e cada cor tem um papel: preto para o texto de leitura e para os traços, cinza para legenda e comentário, um tom claro para régua fina, o azul da USP para sinalizar e o amarelo da USP para destacar como campo atrás do texto. Você não escolhe cor: escolhe papel, e a cor vem junto. Como o atributo `style` é proibido, o único caminho pelo qual uma cor estranha entra numa aula é um SVG ou um comando de cor em TeX — e o validador fecha os dois.

**O vocabulário é fechado para poder ser conferido.** Tudo que uma aula pode conter está descrito em `contrato/contrato.json`, e o mesmo contrato é lido pelo validador. É isso que torna possível pedir a aula a um modelo de linguagem e saber, sem abrir o arquivo, se ela está dentro do sistema: o que não está no contrato vira erro com nome, lugar e conserto. O guia explica o contrato; o contrato é quem manda.

## As regras essenciais

O bloco abaixo é o sistema inteiro em um punhado de linhas. Ele entra **literalmente** nos pacotes para agentes — a skill, o Projeto do Claude, o GPT personalizado e o trecho de `AGENTS.md` das disciplinas —, de modo que uma regra mudada aqui muda em todos eles de uma vez. É essa reutilização que o mantém curto e imperativo.

<!-- regras-essenciais:início -->
**Uma ideia por slide.** O `h2` diz qual é; o `p.lide`, quando houver, a entrega inteira na primeira frase; o corpo a desenvolve. Duas ideias são dois slides.

**A aula é uma sequência de `section`.** Cada uma tem um `data-layout` do contrato; a primeira é `capa`, a última é `encerramento`. Cabeçalho, mapa de blocos, contador, rodapé, roteiro e faixa de marca são desenhados pelo sistema: não escreva nenhum.

**Você não escolhe cor, escolhe papel.** Preto para ler, cinza para legenda e comentário, azul só na segunda linha de um título (`<span class="sinal">`), amarelo só como campo atrás de texto preto (`aside.destaque`, célula de tabela, linha marcada de código). Nenhuma outra cor, nem em SVG, nem em TeX.

**Nada de `style`.** Sem atributo ou elemento `style`, sem `script` dentro do slide (o de dados de gráfico e diagrama é a exceção), sem `iframe`, `video`, `audio`, gradiente, sombra, transparência ou canto arredondado.

**Matemática sempre em TeX:** `\( … \)` no meio da frase e `\[ … \]` em linha própria, como texto solto dentro da `section` — não existe elemento de equação. `$` não é delimitador.

**Código em `<pre data-lang="…">`**, numa das linguagens do contrato. **Toda `img` tem `alt`.** Uma demo sai no PDF pela sua `img.estatico` ou por `capturar()`, os dois disponíveis na impressão do navegador; sem nenhum dos dois, o `aula-usp build` ainda fotografa a demo.

**Os limites são do contrato, e o validador os mede:** tamanho de título, lide e pergunta; palavras no corpo e na coluna; itens por lista; código e tabela. Quando um estoura, corte o conteúdo ou divida o slide em dois — nunca diminua a letra.

**O que você vai dizer em voz alta vai em `<aside class="notas">`**, que não aparece no slide.

**Entregue em zero erros.** Rode o validador, leia a mensagem, corrija a causa apontada e rode de novo.
<!-- regras-essenciais:fim -->

## Onde está o resto

| capítulo | quando abrir |
|---|---|
| `10-estrutura.md` | o esqueleto do arquivo, os metadados do `<head>` e os blocos da aula |
| `20-layouts.md` | o que cada layout aceita, em que ordem, e um exemplo de cada |
| `30-componentes.md` | o trecho pronto de cada bloco de corpo |
| `40-matematica-e-codigo.md` | delimitadores, `\passo`, derivações reveladas e linhas marcadas de código |
| `50-graficos-diagramas-demos.md` | gráficos, diagramas, demos e os controles delas |
| `60-validador.md` | a tabela de regras e o que fazer quando cada uma acusa |
| `70-fluxo-terminal.md` | escrever a aula com a CLI instalada |
| `71-fluxo-chat.md` | escrever a aula num chat, sem terminal |
| `72-artifact-claude.md` | a aula como artifact do Claude, e o que não funciona lá dentro |
| `73-chatgpt.md` | entregar a aula pelo ChatGPT |

Um caminho curto para a primeira aula: leia este capítulo e `10-estrutura.md`, crie a pasta com `aula-usp novo minha-aula --unidade ime` — que copia o esqueleto já com `unidade` e `data` preenchidas —, escreva, e use `60-validador.md` quando o validador falar. Sem terminal, o esqueleto é o que `10-estrutura.md` mostra inteiro, e `71-fluxo-chat.md` conta o resto. A aula-exemplo — `exemplos/descida-do-gradiente/` — é uma aula inteira, escrita dentro do sistema, para ver como fica; a segunda — `exemplos/regressao-linear/` — faz o mesmo com gráfico, diagrama e demo.
