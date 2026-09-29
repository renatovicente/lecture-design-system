# Avaliar uma aula

Validar diz se a aula cabe no contrato. **Avaliar** diz se ela é uma boa aula: se cada slide tem uma ideia, se o título afirma alguma coisa, se há texto demais e figura de menos. As duas perguntas são diferentes, e as respostas também: o validador dá **erro** e **aviso**; a avaliação dá só **alerta** e **conselho**, e nunca impede nada — nem a projeção, nem o PDF, nem o `aula-usp build`.

A avaliação é para aula que **já valida sem erros**. Numa aula com erro, conserte primeiro; um slide que estoura o contrato não precisa de conselho sobre estilo.

## De onde vêm os critérios

Duas fontes, citadas pelo identificador em cada achado:

- **N**, de Naegle, "Ten simple rules for effective presentation slides" (*PLOS Computational Biology*, 2021). As dez regras são N1 a N10: uma ideia por slide (N1), o tempo como orçamento (N2), título que afirma a conclusão (N3), só o essencial no slide (N4), crédito para o que é de outros (N5), figura no lugar de texto (N6), poucos elementos de uma vez (N7), a mensagem que chega a quem se distraiu (N8), o fio entre um slide e o seguinte (N9).
- **U**, das recomendações de desenho de apresentações da UC San Diego, apoiadas na pesquisa de Mayer sobre aprendizagem multimídia: listas curtas, reveladas item a item, e imagem sem enfeite nem texto que a repita.

N é a espinha, e U refina. Onde as duas discordam — U pede no máximo quatro itens numa lista; N aceita um pouco mais —, o critério de N decide o **alerta**, e o de U, mais estrito, só dá **conselho**.

## Como avaliar

Com a linha de comando instalada:

```bash
aula-usp avaliar minha-aula
aula-usp avaliar minha-aula --minutos 50
aula-usp avaliar minha-aula --slide resultados
```

Cada achado sai numa linha, no desenho das linhas do validador: o nível, o slide, o critério com a fonte, o que foi medido e o que fazer. No fim, um resumo por critério. A saída é sempre 0, com ou sem alertas: avaliar não é validar.

`--minutos` diz a duração da aula e liga o critério de tempo. `--slide` avalia um slide só, pelo id ou pela posição, e deixa de fora os critérios que olham a aula inteira. `--json` dá os achados como objetos, para um agente consumir, e `--fotos <pasta>` grava uma imagem de cada slide, com os passos todos revelados, para quem vai julgar o que não se mede.

**Sem a linha de comando**, os critérios medidos se medem à mão, com as definições da tabela abaixo: conte as palavras, os itens, os blocos e as figuras de cada slide, e compare com o número da tabela.

## O que se mede

Estes a linha de comando calcula sozinha. As palavras são as que a plateia lê no corpo do slide: título, notas do apresentador, matemática, código e os dados de gráficos e diagramas ficam de fora.

<!-- gerado:tabela-da-rubrica-medidos -->
| critério | fonte | alcance | nível máximo | acusa quando | o que fazer |
|---|---|---|---|---|---|
| `titulo-rotulo` | N3 | slide | alerta | título de conteudo, figura, afirmacao com até 2 palavras, ou igual a um rótulo genérico ("introdução", "motivação", "resultados", "métodos", "metodologia", "discussão", "conclusão", "conclusões", "background", "contexto", "resumo", "exemplo", "exemplos"), sem contar caixa nem pontuação | Troque o rótulo por uma frase que diga a conclusão do slide: não "Resultados", mas o que os resultados mostram. |
| `elementos` | N7 | slide | alerta | mais de 6 blocos de corpo no slide, contados dentro das colunas; título, lide e notas não contam | Tire do slide o que não for essencial ou divida-o em dois: acima de uns seis elementos a plateia deixa de acompanhar. |
| `itens` | U | slide | conselho | lista com mais de 4 itens | Deixe a lista em até quatro itens: junte os parecidos, passe o resto para a fala ou para outro slide. |
| `revelacao` | U | slide | conselho | lista com mais de 3 itens e nenhum `data-passo` | Revele a lista item a item, com passos, para a plateia ler o que você está dizendo e não o que vem depois. |
| `so-texto` | N6, U | aula | alerta | mais de 50% dos slides de conteudo sem figura, gráfico, diagrama, demo, código nem fórmula em destaque; a matemática em linha não conta | Troque parte do texto por figura, gráfico, diagrama, fórmula ou código: mais da metade dos slides de conteúdo só tem texto. |
| `paineis` | N6 | slide | conselho | mais de 1 figura no mesmo slide | Mostre uma figura por vez: divida o slide, e cada figura ganha o seu título e a sua fala. |
| `credito` | N5 | slide | conselho | figura com imagem, SVG ou gráfico sem `p.fonte` no slide nem legenda com "Fonte", "Adaptado de", "Dados de", "Crédito" ou um ano entre parênteses; diagramas e demos não contam | Diga de onde vem a figura ou os dados, numa linha de fonte ou na legenda; se for sua, a legenda pode dizer isso. |
| `tempo` | N2 | aula | alerta | só com a duração da aula: mais de 1,2 × N slides para N minutos, a 1 minuto por slide, contando todos menos capa, abertura, encerramento | Corte slides ou peça mais tempo: a conta é de cerca de um minuto por slide de conteúdo. |
| `palavras-slide` | N4, N7 | slide | conselho | mais de 60 palavras no slide, sem contar título, notas, matemática, código e os dados de gráfico e diagrama | Enxugue o texto: o que é explicação vai para a fala ou para as notas, e no slide fica o que a plateia precisa ver. |
<!-- /gerado -->

## O que se julga

Estes não têm número: quem avalia olha o slide e responde à pergunta, com `ok`, `conselho` ou `alerta`, uma evidência de uma frase apontando o elemento, e uma sugestão que se possa fazer.

<!-- gerado:tabela-da-rubrica-julgados -->
| critério | fonte | alcance | nível máximo | a pergunta |
|---|---|---|---|---|
| `uma-ideia` | N1 | slide | alerta | O slide entrega uma só ideia? |
| `titulo-conclusao` | N3 | slide | alerta | O título afirma a conclusão que o corpo do slide sustenta? |
| `essencial` | N4 | slide | alerta | Tudo o que está no slide vai ser comentado, ou há algo que ficaria sem ser dito? |
| `grafico-eficaz` | N6 | slide | alerta | O gráfico ou a figura leva a mensagem do slide sozinho, legível de longe? |
| `distraido` | N8 | slide | alerta | Quem não ouviu nada leva a mensagem só pelo título e pela figura? |
| `redundancia` | U | slide | conselho | O texto evita repetir por extenso o que a imagem já diz? |
| `decorativa` | U | slide | conselho | Toda imagem do slide tem função, sem nenhuma só de enfeite? |
| `fluxo` | N9 | aula | alerta | A passagem de cada slide para o seguinte faz sentido para quem assiste? |
<!-- /gerado -->

## Como ler um alerta

Um alerta é um convite a olhar o slide de novo, não uma ordem. Três cuidados:

- **Não corte conteúdo para calar a métrica.** Uma derivação passo a passo pode ter mais palavras que o conselho e continuar certa; o que o critério pergunta é se cada palavra precisa estar na tela, ou se parte dela é fala.
- **Os critérios medidos não enxergam o sentido.** Um título de três palavras pode ser só um rótulo mais comprido, e a lista de rótulos genéricos não é exaustiva: por isso existe o critério julgado `titulo-conclusao`, ao lado do medido.
- **`so-texto` conta só os slides de conteúdo.** Uma aula que põe as figuras em slides de figura, e o texto nos de conteúdo, pode receber o alerta tendo imagem de sobra — e a matemática em linha também não conta como figura. Leia o alerta com a aula inteira na cabeça.

A avaliação não muda a aula. O que fazer com cada achado é do autor.
