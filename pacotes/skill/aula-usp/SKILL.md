---
name: aula-usp
description: Escreve aulas em slides no design system Aula USP, do IME e do IFUSP — uma aula é um arquivo HTML, com layouts e vocabulário fechados, matemática em TeX e um validador que acusa o que fugiu do contrato. Use quando o pedido for uma aula, um slide, uma abertura de bloco ou a correção de achados do validador do Aula USP.
---

# Aula USP

Uma aula é **um arquivo HTML**. O autor escreve o conteúdo; o sistema faz tipografia, grade, cor, cabeçalho, rodapé, mapa de blocos, numeração, matemática, destaque de código, navegação, janela do apresentador e PDF. O mesmo arquivo serve à projeção e ao PDF.

O vocabulário é fechado e está em `contrato/contrato.json`, que o validador lê. Nada do que você escrever precisa ser adivinhado: o que não está no contrato vira erro com nome, lugar e conserto.

## Passo zero: descubra o ambiente

**Antes de escrever qualquer coisa, rode no terminal:**

```bash
aula-usp
```

**Se respondeu** com a lista de comandos (`novo`, `servir`, `validar`, `build`, `dist`, `pacotes`), você está no **modo terminal**: siga `references/70-fluxo-terminal.md`. É o modo completo — validação com os quatro grupos de regras e PDF gerado pelo sistema.

**Se não respondeu** — comando não encontrado, ou não há terminal —, você está no **modo navegador**: siga `references/71-fluxo-chat.md`. Escreva o HTML com a tag do runtime, entregue o arquivo ao autor, e peça a ele a lista do painel do validador (tecla V, botão "Copiar para o chat") para corrigir. Diga ao autor, uma vez, o que ele ganha instalando a CLI — validação completa, inclusive das regras de composição, e o PDF conferido pelo sistema — e como se instala hoje: `npm install` e `npm link` no repositório do Aula USP. `npm install -g aula-usp` ainda não funciona, porque o pacote não está publicado no npm.

Não invente o ambiente: rode o comando e leia a resposta.

## Procedimento

1. **Leia `references/00-principios.md` e `references/10-estrutura.md`** antes do primeiro slide.
2. **Comece com `aula-usp novo <pasta> --unidade <ime|ifusp>`.** Ele cria a pasta com o esqueleto que valida e já preenche `unidade` e `data`; as outras três metas ficam para o passo 3. No modo navegador, onde não há comando, o mesmo esqueleto é `assets/modelo.html`. Não monte o arquivo de memória, e não copie nada de um caminho do repositório do sistema: você não o tem.
3. **Pergunte o que falta** para preencher o `<head>`: unidade, disciplina, número da aula, data e professor. Todas as metas são obrigatórias.
4. **Escreva bloco a bloco**, não a aula inteira de uma vez. Cada `section data-layout="abertura"` abre um bloco; os slides seguintes pertencem a ele.
5. **Valide a cada bloco.** No modo terminal, `aula-usp validar <pasta>`; no modo navegador, peça a lista ao autor.
6. **Corrija a causa, não a mensagem.** Um engano costuma render várias mensagens, e elas somem juntas.
7. **Entregue em zero erros.** No modo terminal, feche com `aula-usp build <pasta>`, que escreve o HTML autocontido e o PDF em `<pasta>/dist/`.

Quando uma regra acusar e você não souber o conserto, abra `references/60-validador.md`, que traz a família da regra e o que fazer.

## Regras essenciais

**Uma ideia por slide.** O `h2` diz qual é; o `p.lide`, quando houver, a entrega inteira na primeira frase; o corpo a desenvolve. Duas ideias são dois slides.

**A aula é uma sequência de `section`.** Cada uma tem um `data-layout` do contrato; a primeira é `capa`, a última é `encerramento`. Cabeçalho, mapa de blocos, contador, rodapé, roteiro e faixa de marca são desenhados pelo sistema: não escreva nenhum.

**Você não escolhe cor, escolhe papel.** Preto para ler, cinza para legenda e comentário, azul só na segunda linha de um título (`<span class="sinal">`), amarelo só como campo atrás de texto preto (`aside.destaque`, célula de tabela, linha marcada de código). Nenhuma outra cor, nem em SVG, nem em TeX.

**Nada de `style`.** Sem atributo ou elemento `style`, sem `script` dentro do slide, sem `iframe`, `video`, `audio`, gradiente, sombra, transparência ou canto arredondado.

**Matemática sempre em TeX:** `\( … \)` no meio da frase e `\[ … \]` em linha própria, como texto solto dentro da `section` — não existe elemento de equação. `$` não é delimitador.

**Código em `<pre data-lang="…">`**, numa das linguagens do contrato. **Toda `img` tem `alt`**, e toda demo tem `img.estatico`, que é o que sai no PDF.

**Os limites são do contrato, e o validador os mede:** tamanho de título, lide e pergunta; palavras no corpo e na coluna; itens por lista; código e tabela. Quando um estoura, corte o conteúdo ou divida o slide em dois — nunca diminua a letra.

**O que você vai dizer em voz alta vai em `<aside class="notas">`**, que não aparece no slide.

**Entregue em zero erros.** Rode o validador, leia a mensagem, corrija a causa apontada e rode de novo.

## Onde procurar cada coisa

| arquivo | quando abrir |
|---|---|
| `references/00-principios.md` | o que é o sistema e por que as restrições são estas |
| `references/10-estrutura.md` | esqueleto, metadados, blocos, passos e o vocabulário inteiro |
| `references/20-layouts.md` | o que cada layout aceita, na ordem, com um exemplo de cada |
| `references/30-componentes.md` | o trecho pronto de cada bloco de corpo |
| `references/40-matematica-e-codigo.md` | delimitadores, derivações reveladas, código e linhas marcadas |
| `references/50-graficos-diagramas-demos.md` | demos; e o que é da fase 2 e ainda dá erro |
| `references/60-validador.md` | a tabela de regras e o que fazer quando cada uma acusa |
| `references/70-fluxo-terminal.md` | o modo terminal, de ponta a ponta |
| `references/71-fluxo-chat.md` | o modo navegador, de ponta a ponta |
| `references/72-artifact-claude.md` | a aula como artifact do Claude: fluxo do autor, e o que não funciona lá dentro |
| `references/73-chatgpt.md` | a entrega pelo ChatGPT: fluxo do autor, e onde o arquivo costuma sair cortado |
| `assets/modelo.html` | o esqueleto de onde toda aula começa |
| `assets/exemplo.html` | uma aula inteira escrita dentro do sistema |

A tabela cobre os onze arquivos de `references/`, que são o guia inteiro. Os dois últimos são fluxos do **autor**, não seus: você os lê para saber o que ele vai fazer com o arquivo que receber.

Dois erros que este sistema vê o tempo todo, e que não custam nada evitar: **escrever o cromo à mão** — cabeçalho, rodapé, número de slide, logo — quando o sistema já o desenha, e **reduzir o texto para caber**, o que não existe aqui. Quando não couber, corte o conteúdo ou divida o slide em dois.
