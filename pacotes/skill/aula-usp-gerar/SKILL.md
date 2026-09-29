---
name: aula-usp-gerar
description: Use quando o autor pedir uma aula a partir de artigos, de apresentações existentes (PDF, PPTX, Beamer, aulas do Aula USP) ou de um roteiro em markdown.
---

# Gerar uma aula do Aula USP a partir de fontes e de um roteiro

Você transforma fontes numa aula em três tempos: escreve um **roteiro** em markdown, slide a slide; **para e mostra o roteiro ao autor**; e, com o "sim" dele, gera a aula com `aula-usp roteiro`, completa o que o roteiro não exprime e itera até zero erros. A sintaxe do roteiro, com um exemplo inteiro, está em `references/80-avaliar-corrigir-gerar.md`, na seção "Gerar a partir de um roteiro e de fontes"; a rubrica que o roteiro tem de respeitar está no mesmo capítulo e em `references/rubrica.json`; o vocabulário fechado do sistema, com o TeX permitido, está em `references/contrato.json`.

## 1. Leia as fontes

Leia você mesmo, com as ferramentas do seu ambiente; a CLI não lê PDF nem PPTX.

- **Artigo ou apresentação em PDF:** o texto e as figuras. Anote de cada figura a página, a legenda original e a referência completa do artigo, e a licença, se o artigo disser qual é.
- **PPTX:** é um zip. Descompacte, leia `ppt/presentation.xml` para a ordem dos slides e, nessa ordem, cada `ppt/slides/slideN.xml`, com as mídias de `ppt/media/`.
- **Beamer (`.tex`):** cada `\begin{frame}{título}` é um slide candidato. A matemática passa como está, entre `\(` `\)` e `$$`, e é conferida contra o TeX permitido do contrato: comando de cor ou de estilo não entra.
- **Aula do Aula USP:** leia um slide com `aula-usp slide <pasta> <id>`, e reaproveite o que servir.

Se o autor não disse a duração, pergunte. Pergunte também a unidade, a data e o professor, que são metas obrigatórias do roteiro.

## 2. Escreva `roteiro.md`

Na pasta de trabalho, ao lado das figuras que você recortou (numa pasta como `figuras/`), seguindo a rubrica:

- **título que afirma** a conclusão do slide, e não um rótulo como "Resultados";
- **uma ideia por slide**;
- **cerca de 1 minuto por slide** de conteúdo, contra a duração pedida: capa, aberturas e encerramento não contam;
- **de 2 a 8 blocos**, cada um aberto por um `## abertura:`;
- **`fonte:` em toda figura ou dado alheio**, com a referência do artigo; num slide de figura, o crédito vai na `legenda:`;
- uma `nota:` em todo slide de conteúdo, figura e afirmação, com o que dizer em voz alta.

O que o roteiro não exprime — demo, exercício — fica anotado numa `nota:` do slide mais próximo, para você escrever no HTML depois.

## 3. Pare e mostre o roteiro

Mostre `roteiro.md` inteiro ao autor, com a conta de slides contra a duração e a lista das figuras alheias com a origem e a licença de cada uma. **Só siga com o "sim" dele.** Se ele pedir mudanças, mude o roteiro e mostre de novo: é aqui que cortar um slide é barato.

## 4. Gere e valide

```bash
aula-usp roteiro roteiro.md <pasta>
```

Um erro de roteiro sai com 1, com a linha: conserte o roteiro e rode de novo. Com o roteiro aceito, o comando escreve `<pasta>/index.html`, copia as figuras para `<pasta>/img/` e roda o validador. Depois, **complete no HTML** o que o roteiro não exprime — as demos e os exercícios anotados nas notas —, seguindo a skill `aula-usp`, que ensina esse HTML. Rode `aula-usp validar <pasta>` até **0 erros**. Não rode `aula-usp roteiro` de novo por cima do HTML completado: `--substituir` apagaria o que você escreveu à mão.

## 5. Avalie e corrija

Rode a skill `aula-usp-avaliar` na aula (ou `aula-usp avaliar <pasta> --minutos N`), proponha ao autor as correções que ela sugerir e aplique as que ele aceitar com a skill `aula-usp-corrigir`, um slide por vez.

## 6. Entregue

- a aula, em `<pasta>/index.html`, validando com 0 erros;
- o `avaliacao.md` final;
- a lista das figuras alheias, cada uma com a origem e a licença. **Quando a licença não for aberta, avise o autor** antes de ele projetar ou distribuir a aula.

## Sem a linha de comando

No claude.ai, no ChatGPT, ou onde `aula-usp` não responder: escreva e mostre o roteiro do mesmo jeito, espere o "sim", e escreva o HTML direto, slide a slide, seguindo o roteiro e a tabela de marcações do capítulo — cada marcação vira o elemento que ela diz. Peça ao autor a lista do painel do validador (tecla V) para conferir.
