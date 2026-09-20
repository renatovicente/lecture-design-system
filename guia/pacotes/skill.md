<!-- Fonte de pacotes/skill/aula-usp/SKILL.md, montado por `aula-usp pacotes` (marco 6c).
Duas regras de montagem valem para os cinco arquivos desta pasta: a linha do marcador
inserir:regras-essenciais é trocada pelo bloco entre os marcadores de guia/00-principios.md, e
todo OUTRO comentário HTML — este cabeçalho inclusive — some, com a sua linha. -->
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

**Se respondeu** com a lista de comandos (`servir`, `validar`, `build`, `dist`), você está no **modo terminal**: siga `references/70-fluxo-terminal.md`. É o modo completo — validação com os quatro grupos de regras e PDF gerado pelo sistema.

**Se não respondeu** — comando não encontrado, ou não há terminal —, você está no **modo navegador**: siga `references/71-fluxo-chat.md`. Escreva o HTML com a tag do runtime, entregue o arquivo ao autor, e peça a ele a lista do painel do validador (tecla V, botão "Copiar para o chat") para corrigir. Diga ao autor, uma vez, o que ele ganha instalando a CLI — validação completa, inclusive das regras de composição, e o PDF conferido pelo sistema — e como se instala hoje: `npm install` e `npm link` no repositório do Aula USP. `npm install -g aula-usp` ainda não funciona, porque o pacote não está publicado no npm.

Não invente o ambiente: rode o comando e leia a resposta.

## Procedimento

1. **Leia `references/00-principios.md` e `references/10-estrutura.md`** antes do primeiro slide.
2. **Comece de `assets/modelo.html`.** É o esqueleto que valida; trocar o conteúdo dele é mais rápido e mais seguro que montar o arquivo de memória.
3. **Pergunte o que falta** para preencher o `<head>`: unidade, disciplina, número da aula, data e professor. Todas as metas são obrigatórias.
4. **Escreva bloco a bloco**, não a aula inteira de uma vez. Cada `section data-layout="abertura"` abre um bloco; os slides seguintes pertencem a ele.
5. **Valide a cada bloco.** No modo terminal, `aula-usp validar <pasta>`; no modo navegador, peça a lista ao autor.
6. **Corrija a causa, não a mensagem.** Um engano costuma render várias mensagens, e elas somem juntas.
7. **Entregue em zero erros.** No modo terminal, feche com `aula-usp build <pasta>`, que escreve o HTML autocontido e o PDF em `<pasta>/dist/`.

Quando uma regra acusar e você não souber o conserto, abra `references/60-validador.md`, que traz a família da regra e o que fazer.

## Regras essenciais

<!-- inserir:regras-essenciais -->

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
| `assets/modelo.html` | o esqueleto de onde toda aula começa |
| `assets/exemplo.html` | uma aula inteira escrita dentro do sistema |

Dois erros que este sistema vê o tempo todo, e que não custam nada evitar: **escrever o cromo à mão** — cabeçalho, rodapé, número de slide, logo — quando o sistema já o desenha, e **reduzir o texto para caber**, o que não existe aqui. Quando não couber, corte o conteúdo ou divida o slide em dois.
