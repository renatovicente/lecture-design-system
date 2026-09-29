<!-- Fonte de pacotes/skill/aula-usp-avaliar/SKILL.md, montado por `aula-usp pacotes` (spec
2026-09-28, seção 7). Mesmas regras de montagem dos outros arquivos desta pasta: todo comentário
HTML — este cabeçalho inclusive — some, com a sua linha. Sem regras essenciais: esta skill não
escreve slide, só avalia. -->
---
name: aula-usp-avaliar
description: Avalia a qualidade de uma aula do Aula USP, ou de um slide dela, pelas boas práticas de Naegle (2021) e da UC San Diego, e escreve o relatório em avaliacao.md sem mudar a aula. Use quando o autor pedir para avaliar, julgar ou revisar a qualidade de uma aula ou de um slide — não para validá-la contra o contrato.
---

# Avaliar uma aula do Aula USP

Validar e avaliar são perguntas diferentes. O validador diz se a aula cabe no contrato e dá **erro** e **aviso**. Você diz se ela é uma boa aula, e dá só **alerta** e **conselho**, nunca erro. A avaliação é para aula que já valida sem erros.

A rubrica é dado: `references/rubrica.json`. Cada critério tem o identificador da fonte (N1 a N10 para Naegle, U para a UC San Diego), o tipo, o alcance e o nível máximo. Os **medidos** trazem os limiares e a ação; os **julgados** trazem a pergunta que você responde olhando o slide. `references/80-avaliar-corrigir-gerar.md` explica a rubrica em linguagem de autor, com as definições dos medidos.

## Procedimento, com a linha de comando

1. **Rode**, na pasta da aula:

   ```bash
   aula-usp avaliar <pasta> --json --fotos <pasta>/avaliacao-fotos
   ```

   Se o autor disser a duração da aula, acrescente `--minutos N`. Se ele pediu um slide só, acrescente `--slide <id ou posição>`.

   - Se a saída disser **"valide primeiro"**, pare: a aula tem erro de validação. Diga isso ao autor e sugira `aula-usp validar <pasta>`; não avalie.
   - Se sair com 2 por falta de Chrome, rode de novo sem `--fotos` e julgue lendo o fonte de cada `section`, dizendo ao autor que foi sem as imagens.

   O JSON traz `achados` (os medidos, cada um com `slide`, `id`, `criterio`, `fonte`, `nivel`, `mensagem` e `acao`), `resumo` e, com `--fotos`, `fotos.indice`: um item por slide, com o arquivo da imagem.

2. **Julgue cada slide** olhando a imagem dele e o fonte da `section`. Para cada critério julgado da rubrica que caiba no slide, responda a `pergunta` com `ok`, `conselho` ou `alerta` — nunca acima do nível máximo do critério —, uma **evidência** de uma frase apontando o elemento ("o título 'Resultados' não diz o que os resultados mostram") e uma **sugestão** que o autor possa aplicar. O critério `fluxo` é da aula inteira: leia os slides na ordem e julgue as passagens.

3. **Escreva `<pasta>/avaliacao.md`**:
   - no topo, um resumo: quantos alertas e conselhos, e os três achados que mais melhorariam a aula;
   - depois, uma tabela por slide, com as colunas critério, fonte, nível, evidência e sugestão, juntando os medidos e os julgados; os `ok` não entram;
   - por fim, os achados da aula inteira (`so-texto`, `tempo`, `fluxo`).

4. **Não edite a aula.** Ao final, pergunte ao autor quais sugestões ele aceita e ofereça aplicá-las, uma de cada vez, validando depois de cada uma.

## Sem a linha de comando

No claude.ai, no ChatGPT, ou onde `aula-usp` não responder, meça os critérios medidos à mão, lendo o fonte com as mesmas definições de `references/80-avaliar-corrigir-gerar.md` e os limiares de `references/rubrica.json`: conte as palavras do corpo (sem título, notas, matemática e código), os itens de cada lista, os blocos, as figuras e o crédito de cada uma. Os julgados, julgue pelo fonte. Diga ao autor que a medição foi à mão e que o comando mede o mesmo sem erro de contagem.

## Cuidados

- Não chame nada de erro. Erro é do validador.
- Um alerta é convite para olhar de novo. Não proponha cortar conteúdo só para calar a métrica: numa derivação, por exemplo, o conserto costuma ser revelar os passos, e não apagá-los.
- `so-texto` conta só os slides de conteúdo, e a matemática em linha não conta como figura. Se a aula tem figuras em slides de figura, diga isso na evidência.
