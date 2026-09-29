<!-- Fonte de pacotes/skill/aula-usp-corrigir/SKILL.md, montado por `aula-usp pacotes` (spec
2026-09-28, seção 7). Mesmas regras de montagem dos outros arquivos desta pasta: todo comentário
HTML — este cabeçalho inclusive — some, com a sua linha. Sem regras essenciais, como a de avaliar:
esta skill reescreve uma section que já cabe no contrato, e quem confere o contrato é
`validar --slide`, que ela roda a cada volta. -->
---
name: aula-usp-corrigir
description: Use quando o autor pedir para corrigir, reescrever, encurtar ou melhorar um slide específico de uma aula do Aula USP, ou para aplicar a um slide as sugestões de avaliacao.md ou os achados do validador.
---

# Corrigir um slide de uma aula do Aula USP

Você mexe em **um slide só** e deixa o resto do arquivo exatamente como estava, byte a byte. Não reformate, não troque aspas, não mexa no `<head>`, nas metas nem em outro slide. `references/80-avaliar-corrigir-gerar.md` explica os comandos, na seção "Corrigir um slide", e a rubrica de avaliação, que diz o que cada critério pede.

## Procedimento, com a linha de comando

1. **Identifique o slide e o pedido.** O slide é o `id` da `section` ou a posição, de 1 ao último — a numeração das mensagens do validador e da avaliação. O pedido vem do autor, de uma linha de `avaliacao.md` que ele aceitou, ou de um achado de `aula-usp validar <pasta>` naquele slide. Se não souber qual slide é, pergunte.

2. **Tire a foto de antes e leia o fonte:**

   ```bash
   aula-usp avaliar <pasta> --slide <alvo> --fotos <pasta>/correcao/antes
   aula-usp slide <pasta> <alvo>
   ```

   O segundo imprime a `section` exatamente como está no arquivo. Se a avaliação responder "valide primeiro" (a aula tem erro de validação) ou sair com 2 por falta de Chrome, siga sem a foto de antes e diga isso ao autor no fim.

3. **Escreva a `section` nova num arquivo**, fora da pasta da aula ou em `<pasta>/correcao/`, e troque:

   ```bash
   aula-usp slide <pasta> <alvo> --substituir <arquivo>
   ```

   O arquivo tem uma `section` e mais nada, com o **mesmo `id`** da original. Mude só o que o pedido pede. Se o pedido exigir **outro slide** — partir um em dois, por exemplo —, pare e peça autorização ao autor; com o sim dele, ponha as duas `section`s no arquivo, a segunda com um `id` que não exista na aula, e acrescente `--dividir`. Não use `--forcar` para trocar o `id` sem o autor pedir.

4. **Confira:**

   ```bash
   aula-usp validar <pasta> --slide <alvo>
   ```

   até 0 erros naquele slide. Se o pedido veio de uma avaliação, rode também `aula-usp avaliar <pasta> --slide <alvo>` e confira que o achado sumiu sem aparecer outro. Faça no máximo **3 voltas** de escrever e conferir. Se não convergir, devolva o original — o texto que o passo 2 imprimiu, gravado num arquivo e trocado com `--substituir` — e diga ao autor por quê.

5. **Tire a foto de depois** (`aula-usp avaliar <pasta> --slide <alvo> --fotos <pasta>/correcao/depois`) e mostre as duas ao autor, com uma frase sobre o que mudou.

6. **Nunca edite outro slide**, nem o `<head>`, nem as metas, nem mesmo para consertar algo que você viu de passagem: diga ao autor e deixe a decisão com ele.

## Sem a linha de comando

No claude.ai, no ChatGPT, ou onde `aula-usp` não responder, a regra é a mesma, feita à mão: reescreva só a `section` pedida e devolva a aula **inteira**, com todas as outras `section`s e o `<head>` idênticos aos que o autor mandou, num único bloco de código, do `<!DOCTYPE html>` ao `</html>`. Não resuma nenhum trecho com "o resto segue igual". Peça ao autor a lista do painel do validador (tecla V) daquele slide para conferir.

## Cuidados

- Corrija a causa, não a mensagem: um título longo se resolve dizendo a conclusão em menos palavras, e não cortando palavras ao acaso.
- Não corte conteúdo só para calar uma métrica da avaliação. Numa derivação, o conserto costuma ser revelar os passos, e não apagá-los.
- Um slide novo, com `--dividir`, só com o autor de acordo.
