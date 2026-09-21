# Fase 2d: guia, pacotes, aula-exemplo e aceite — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** fechar a fase 2 — o guia e os pacotes passam a documentar gráficos, diagramas e controles; `exemplos/regressao-linear/` entra como a segunda aula-exemplo; e o aceite da fase 2 é rodado e registrado.

**Arquitetura:** quase nada de código novo. O trabalho é **virar a chave de fase no gerador do guia** — e o Fato 1 mostra que essa chave está em três lugares, dos quais **dois quebram calados** —, escrever à mão os capítulos que não são gerados, e produzir a aula-exemplo.

**Pilha:** Node ≥ 20.6, ES modules, `node:test`. Nenhuma dependência nova.

**Spec:** seções 10.1, 10.2, 10.3, 11.1, 11.3 e **12** (o critério de aceite da fase 2).

**Depende de:** 2a, 2b e 2c, todas mescladas. Esta é a única das quatro que precisa das outras três.

---

## Restrições globais

As mesmas da 2a (ver `2026-09-21-aula-usp-f2a-graficos.md`).

---

## Fatos medidos antes deste plano

### Fato 1 — o gerador do guia está preso à fase 1 em três lugares, e **dois deles quebram calados**

`build/guia.mjs` trata fase de três formas, e só uma está pronta para a virada:

| lugar | forma | o que acontece na fase 2 |
|---|---|---|
| `daFase(entrada, fase)` — linha 80, usado por vocabulário, classes e atributos | `!(entrada.fase > fase)` — **cumulativo** | ✅ correto: as tabelas crescem |
| `tabelaDeRegras` — linha 55 | `regra.fase === fase` — **igualdade exata** | ⚠️ chamada com `fase: 2`, o capítulo de regras cai de **60 para 4** |
| `decksLimpos` — linha 268 | chama `lerERodarEstatica` e `validarCarga` **sem passar fase**, logo na fase 1 | ⚠️ um deck com gráfico **deixa de "validar limpo"** e **sai calado** da fonte de exemplos |

O segundo é o pior porque é **silencioso por construção**: o extrator só usa decks limpos, e um deck de fase 2 simplesmente para de contribuir. Nada falha; o guia só fica menor.

E os dois são invisíveis para a guarda: `tests/unit/guia.test.mjs` é **regerar-e-comparar**, e o `AGENTS.md` já registra o que essa forma não prova. Regere com o gerador preso à fase 1, commite, e a guarda concorda consigo mesma.

**O que fecha a janela é a guarda de propriedade que já existe** — *todo exemplo publicado é trecho literal de um deck pt-BR que valida limpo* —, e ela precisa aprender a fase junto, ou vai validar na fase 1 exatamente como o extrator.

O comentário da linha 77 mostra que a distinção é conhecida e foi escrita de propósito: *"Um item do contrato com `fase: 2` não vale na fase 1 — é o mesmo teste que `vocabulario.classe` e `vocabulario.atributo` fazem."* O `daFase` está certo; os outros dois nunca precisaram estar, até agora.

### Fato 2 — há folga nas instruções do GPT, e ela é mensurável

`pacotes/gpt/gpt-personalizado/instrucoes.txt`: **5.226 de 8.000 caracteres** — 2.774 de folga, 35 %. O teto é da spec 10.1 e está em `tests/unit/pacotes.test.mjs:85` como `TETO_INSTRUCOES_GPT = 8000`.

A fase 2 acrescenta gráficos, diagramas e controles ao que o GPT precisa saber. A folga **provavelmente basta**, mas é a primeira vez que ela é disputada: até aqui o texto só cresceu com a fase 1 inteira já dentro. **Meça depois de escrever, não antes** — e se estourar, o que se corta é prosa, não capacidade.

### Fato 3 — a guarda de citações do pacote é a mais severa do repositório

`tests/unit/pacotes.test.mjs` assere que **todo caminho e todo capítulo citado entre crases dentro do pacote existe dentro do pacote** — hoje 235 citações conferidas, 0 mortas. O `AGENTS.md` conta a história: no dia em que ela foi escrita havia **164** citações mortas, e ao ser alargada (de "com barra" para "entre crases") revelou mais **172** que estavam fora do alcance dela.

Consequência direta para esta parte: **o `exemplo-recursos.html` e todo capítulo novo do guia precisam existir onde o texto diz que existem.** Um ponteiro para `exemplos/regressao-linear/` num pacote que não o leva cai aqui — que é onde deve cair.

### Fato 4 — o que a spec manda acrescentar aos pacotes

Spec 10.2: *"`exemplo.html` é `exemplos/descida-do-gradiente/`. **Na fase 2, entra também `exemplo-recursos.html`, de `exemplos/regressao-linear/`**."*

Spec 10.3: *"`exemplos/regressao-linear/` (fase 2): usa gráfico, diagrama e demo."* — as três coisas das partes 2a, 2b e 2c, numa aula real.

Spec 10.1: `50-graficos-diagramas-demos.md` já existe com o conteúdo de fase 1 (demos); a fase 2 acrescenta gráficos, diagramas e controles.

### Fato 5 — o critério de aceite da fase 2, na letra

Spec 12: *"Aceite: **testes verdes e essa aula validada, com uma demo sem imagem própria capturada no PDF**."*

É mais modesto que o da fase 1 (spec 11.3, que exigiu dois ambientes de agente, zero erros em três rodadas e revisão visual do autor). **Não o infle e não o encolha**: a parte "demo sem imagem própria capturada no PDF" é de 2c e já terá teste; o que sobra para aqui é a aula validando limpa e a suíte verde.

---

## Estrutura de arquivos

| arquivo | responsabilidade | tarefa |
|---|---|---|
| `build/guia.mjs`, `tests/unit/guia.test.mjs` | a virada de fase e as duas armadilhas | 1 |
| `guia/50-graficos-diagramas-demos.md` e vizinhos | o texto escrito à mão | 2 |
| `exemplos/regressao-linear/` (novo) | a segunda aula-exemplo | 3 |
| `build/pacotes.mjs`, `guia/pacotes/*.md` | `exemplo-recursos.html` e o teto do GPT | 4 |
| `tests/aceite/roteiro.md`, `docs/superpowers/revisoes/` | o aceite registrado | 5 |

---

### Tarefa 1: o gerador do guia aprende a fase 2

**Primeira, porque as outras quatro leem o resultado dela.**

- [ ] **Passo 1: medir as três antes de mexer**

Rode o gerador em fase 2 **sem consertar nada** e registre os três números: quantas regras o capítulo traz, quantos decks contam como limpos, quantas linhas as tabelas de vocabulário ganharam. **Esses números são a prova de que as armadilhas do Fato 1 são reais**, e sem eles o conserto vira uma mudança sem motivo escrito.

- [ ] **Passo 2: `tabelaDeRegras`**

Decida entre tornar o filtro cumulativo (`daFase`, como os vizinhos) ou chamar a função duas vezes e apresentar as regras de fase 2 à parte. **As duas são defensáveis**; a primeira é consistente com o resto do arquivo, a segunda dá ao leitor a informação de que aquelas quatro são novas. Escolha e escreva por quê — e se escolher a segunda, o capítulo precisa dizer ao autor o que "fase 2" significa para ele, que não sabe o que é uma fase do nosso projeto.

- [ ] **Passo 3: `decksLimpos`, a silenciosa**

Passar a fase para `lerERodarEstatica` e `validarCarga`. **E acrescentar a guarda que faltava**: se um deck do espécime **deixar** de contar como limpo, isso tem de aparecer — hoje ele só some. Um teste que assere quantos decks contribuem, ou que cada deck do espécime está entre os limpos, fecha a janela.

Inversão obrigatória: prenda o extrator à fase 1 de novo e veja o teste ficar vermelho. Se ficar verde, a janela continua aberta.

- [ ] **Passo 4: a guarda de propriedade aprende a fase junto (Fato 1)**

*Todo exemplo publicado é trecho literal de um deck pt-BR que valida limpo* — em que fase ela valida? Se for na fase 1, ela erra do mesmo jeito que o extrator errava, e concorda com ele por coincidência. Alinhe as duas e **diga no commit que estavam alinhadas pelo motivo errado**.

- [ ] **Passo 5: regerar e ler o diff de verdade**

`npm run guia` e `aula-usp pacotes`. **Leia o diff**, não só o código de saída: é a única vez em que o crescimento do guia fica visível de uma vez. Confira contra os números do passo 1.

---

### Tarefa 2: os capítulos escritos à mão

- [ ] **Passo 1: `50-graficos-diagramas-demos.md`**

O arquivo existe com as demos da fase 1. Acrescente gráficos, diagramas e controles — **trechos prontos**, no molde de `30-componentes.md`, que é o capítulo de trechos.

Escreva **para o autor**, não para nós: ele não sabe o que é uma fase, um satélite ou um contrato. O que ele precisa é da forma do `<figure class="grafico">`, dos campos do JSON, de quando usar `foco`, do DOT mínimo e do que as classes `foco` e `ativo` fazem.

- [ ] **Passo 2: a regra do `foco`, escrita onde o autor vê**

Da spec 7.2: sem `foco`, a **última** série de `y` sai em azul. É a regra mais fácil de errar sem perceber, porque o gráfico sai bonito de qualquer jeito. Ela merece uma linha própria no capítulo.

- [ ] **Passo 3: `00-principios.md` e o bloco de regras essenciais**

O bloco entre marcadores entra **literalmente** em todos os pacotes. Pergunte-se se a fase 2 acrescenta algum princípio — e **prefira que não**: cada linha ali custa espaço nos quatro pacotes e no teto do GPT (Fato 2). Gráfico e diagrama são componentes, e componentes moram em `50-`.

Se mexer no bloco, lembre da armadilha medida no 6c: a conferência dele procura no **arquivo de instrução declarado** de cada pacote, não em "algum arquivo", porque três dos quatro levam uma cópia do guia que contém o bloco.

---

### Tarefa 3: `exemplos/regressao-linear/`

- [ ] **Passo 1: a aula**

Spec 10.3: *"usa gráfico, diagrama e demo"* — as três partes anteriores numa aula real. No molde de `descida-do-gradiente/`, que é a referência: aula de verdade, prosa no estilo do autor, não um catálogo de recursos.

Regressão linear dá as três naturalmente: o gráfico de dispersão com a reta ajustada, o diagrama do fluxo dos dados, e a demo em que se arrastam os coeficientes. **Resista a forçar as três se a aula não as pedir** — uma aula-exemplo ruim ensina mal, e ela viaja em três pacotes.

- [ ] **Passo 2: validar limpo, na fase 2**

Condição dupla: a aula valida sem erro **e** entra na conta dos decks limpos da Tarefa 1. Rode `aula-usp validar` e `aula-usp build` e registre.

- [ ] **Passo 3: a prosa**

`descida-do-gradiente/` seguiu o skill `rv-writing-style` (spec 10.3). Esta segue também. E vale lembrar o defeito do marco 6a, que nenhuma ferramenta pega: **a derivação matemática e o código têm de concordar** — lá, a derivação era de um exemplo só e o código era em lote.

---

### Tarefa 4: os pacotes

- [ ] **Passo 1: `exemplo-recursos.html` (Fato 4)**

Entra nos três pacotes que já levam `exemplo.html`, pelo mesmo caminho. Em `build/guia.mjs`, `FONTES_DE_PACOTE` é onde essa lista mora.

- [ ] **Passo 2: a guarda de citações (Fato 3)**

Rode-a e leia o número. Toda citação nova de caminho ou capítulo precisa resolver **dentro** do pacote. Se algo ficar morto, o conserto é levar o arquivo ou mudar o texto — **nunca afrouxar a guarda**, que é a mais severa do repositório e foi paga caro duas vezes.

- [ ] **Passo 3: o teto do GPT (Fato 2)**

Meça `instrucoes.txt` depois de escrever. Base: 5.226 de 8.000. Se estourar, corte prosa, não capacidade — e diga no commit quanto sobrou, porque esse número passa a importar daqui para a frente.

- [ ] **Passo 4: as três propriedades da spec 11.1**

`tests/unit/pacotes.test.mjs` já confere o teto do GPT, o bloco de regras essenciais idêntico em todos, e versão e `integrity` das tags. Rode e confira que nenhuma se mexeu por acidente.

---

### Tarefa 5: o aceite da fase 2

- [ ] **Passo 1: o critério, na letra (Fato 5)**

*"Testes verdes e essa aula validada, com uma demo sem imagem própria capturada no PDF."* Três coisas, todas verificáveis.

- [ ] **Passo 2: rodar**

Suíte completa; `aula-usp validar` e `aula-usp build` em `exemplos/regressao-linear/`; e o PDF aberto na página da demo. Registre os números que mediu, não os que esperava.

- [ ] **Passo 3: o relatório**

Em `docs/superpowers/revisoes/`, no molde dos anteriores, com a seção em português sobre o que foi feito depois da revisão. **Traga para ele o relatório da spec 14** que a 2b produziu (o WASM no artifact): é parte do que a fase 2 tinha de responder, e um relatório de fase que não o mencione deixa o risco marcado "verificar" para sempre.

- [ ] **Passo 4: o que fica aberto**

Liste honestamente o que a fase 2 não fechou, para a fase 3 herdar. Já se sabe de três: `package.json` com `private: true`, sem `license`, `author`, `repository` nem `files` (o npm mandaria 414 arquivos e 6,2 MB onde ~94 bastam); a decisão sobre `pacotes` e `dist` sobreviverem à instalação; e **medir se o produto preserva subpastas ao subir `conhecimento/`** antes de publicar o GPT.

---

## Verificação final da 2d

- [ ] `npm test` e `npm run test:integracao` verdes
- [ ] `npm run guia` e `aula-usp pacotes` sem diff pendente, e o diff da virada **lido**
- [ ] o capítulo de regras do guia traz **64**, não 4 — e os números do passo 1 da Tarefa 1 registrados
- [ ] **todo deck do espécime conta como limpo**, com teste que cai se um sair
- [ ] a guarda de citações verde, com o número de citações conferidas
- [ ] `instrucoes.txt` dentro de 8.000, com a folga escrita
- [ ] `exemplos/regressao-linear/` valida limpo e constrói, com PDF
- [ ] o relatório da fase 2 arquivado, **incluindo o resultado da verificação da spec 14**

## O que a 2d NÃO faz

- **Publicar** (fase 3): repositório, npm, tag com versão exata e hash, aceite em claude.ai e ChatGPT. Toda ação externa depende de autorização explícita do autor no momento.
- O aceite da fase 3 (spec 11.3) é outro: claude.ai e ChatGPT, **com o runtime publicado** — não dá para antecipá-lo aqui.
