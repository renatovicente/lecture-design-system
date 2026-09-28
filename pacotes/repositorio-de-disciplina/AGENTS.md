# AGENTS.md

Este repositório guarda as **aulas** de uma disciplina, escritas no design system Aula USP. Nada aqui é sobre desenvolver o sistema: o sistema é um pacote que se instala, e o que se edita neste repositório é o conteúdo das aulas.

## O que é uma aula

**Uma pasta com um `index.html` dentro**, e um `img/` ao lado quando houver imagens de arquivo. Uma pasta por aula, com o nome que vira o nome dos arquivos construídos.

O `index.html` é o fonte: o `<head>` com as metas e a tag do runtime, e o `<body>` como uma sequência de `<section>`, uma por slide. Não há folha de estilo, script de página nem pasta de projeto — o runtime traz o sistema consigo.

Comece toda aula com `aula-usp novo`: ele cria a pasta a partir do esqueleto do sistema, já com `unidade` e `data` preenchidas. Não copie o modelo à mão nem parta de um caminho do repositório do Aula USP — quem instalou a CLI não precisa dele.

## Os comandos

```bash
aula-usp novo    <pasta> --unidade ime   # cria a aula; --unidade é obrigatória
aula-usp validar <pasta>        # o ciclo curto: rode a cada bloco novo
aula-usp servir  <pasta>        # ver a aula no navegador enquanto escreve
aula-usp build   <pasta>        # o HTML autocontido e o PDF, em <pasta>/dist/
```

Códigos de saída: 0 sem erros, e avisos são permitidos; 1 com erros de validação; 2 quando não deu para rodar. Num script, teste o código, não procure palavra na saída. `aula-usp validar <pasta> --json` devolve a mesma lista em objetos, um por achado.

**Antes de escrever qualquer coisa, confira que `aula-usp` responde no terminal.** Se não responder, trabalhe no modo navegador — escreva o HTML, entregue ao professor e peça a ele a lista do painel do validador (tecla **V**) — e diga a ele como instalar a CLI: `npm install` e `npm link` no repositório do Aula USP. `npm install -g aula-usp` ainda não funciona, porque o pacote não está publicado no npm.

Sem Chrome instalado, `validar` e `build` não falham: pulam as regras de composição — e, no `build`, também o PDF —, avisam no stderr e terminam com 0 se não houver outro erro. Isso é uma degradação, não uma aprovação: "zero erros" sem Chrome não cobre o que só a página desenhada revela.

## O que é gerado e o que é fonte

`<pasta>/dist/` é **gerado** por `aula-usp build`, com o HTML autocontido, o PDF e o `validacao.json`. Nunca edite nada lá dentro: a próxima construção sobrescreve. O que se edita é o `index.html` da aula, e é só ele que precisa de revisão.

Se este repositório versiona o `dist/` das aulas, construa antes de commitar, para não guardar um PDF de uma geração atrás. Se não versiona, mantenha `*/dist/` no `.gitignore`.

## Como escrever

O guia do autor é a referência, e ele vem junto no pacote de skill do Aula USP. Consulte-o; não escreva HTML de memória, e não invente elemento, classe ou atributo: o vocabulário é fechado e o que não está no contrato vira erro com nome, lugar e conserto.

O ciclo é sempre o mesmo: escreva um bloco, valide, corrija **a causa** — um engano costuma render várias mensagens, e elas somem juntas —, e só então comece o bloco seguinte. É mais barato que corrigir quarenta mensagens no fim.

## Regras essenciais

**Uma ideia por slide.** O `h2` diz qual é; o `p.lide`, quando houver, a entrega inteira na primeira frase; o corpo a desenvolve. Duas ideias são dois slides.

**A aula é uma sequência de `section`.** Cada uma tem um `data-layout` do contrato; a primeira é `capa`, a última é `encerramento`. Cabeçalho, mapa de blocos, contador, rodapé, roteiro e faixa de marca são desenhados pelo sistema: não escreva nenhum.

**Você não escolhe cor, escolhe papel.** Preto para ler, cinza para legenda e comentário, azul só na segunda linha de um título (`<span class="sinal">`), amarelo só como campo atrás de texto preto (`aside.destaque`, célula de tabela, linha marcada de código). Nenhuma outra cor, nem em SVG, nem em TeX.

**Nada de `style`.** Sem atributo ou elemento `style`, sem `script` dentro do slide (o de dados de gráfico e diagrama é a exceção), sem `iframe`, `video`, `audio`, gradiente, sombra, transparência ou canto arredondado.

**Matemática sempre em TeX:** `\( … \)` no meio da frase e `\[ … \]` em linha própria, como texto solto dentro da `section` — não existe elemento de equação. `$` não é delimitador.

**Código em `<pre data-lang="…">`**, numa das linguagens do contrato. **Toda `img` tem `alt`.** Uma demo sai no PDF pela sua `img.estatico` ou por `capturar()`, os dois disponíveis na impressão do navegador; sem nenhum dos dois, o `aula-usp build` ainda fotografa a demo.

**Os limites são do contrato, e o validador os mede:** tamanho de título, lide e pergunta; palavras no corpo e na coluna; itens por lista; código e tabela. Quando um estoura, corte o conteúdo ou divida o slide em dois — nunca diminua a letra.

**O que você vai dizer em voz alta vai em `<aside class="notas">`**, que não aparece no slide.

**Entregue em zero erros.** Rode o validador, leia a mensagem, corrija a causa apontada e rode de novo.

## Português

O conteúdo das aulas, os nomes das pastas e as mensagens de commit são em português. Uma aula em inglês é o mesmo arquivo com `lang="en"` no `<html>`: o sistema troca os rótulos que ele mesmo escreve.
