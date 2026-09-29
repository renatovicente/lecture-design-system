# Aula USP: avaliar, corrigir e gerar aulas, com skills e comandos

Data: 2026-09-28. Estende a spec do sistema, `docs/superpowers/specs/2026-09-14-aula-usp-design.md`, a partir da 1.0.2 publicada. Onde esta spec não diz nada, vale aquela.

## 1. Objetivo

Três capacidades novas, cada uma com uma skill para agentes e com comandos determinísticos da CLI que a sustentam:

1. **Avaliar** a qualidade de uma aula ou de um slide, segundo as boas práticas de Naegle (2021) e da UCSD.
2. **Corrigir** um slide específico sem tocar no resto do arquivo.
3. **Gerar** uma aula a partir de um roteiro em markdown, slide a slide, e de fontes: artigos em PDF, apresentações em PDF, PPTX ou Beamer, e outras aulas do Aula USP.

A ordem de construção é essa (decisão do autor). A avaliação fixa os critérios que a correção aplica e que a geração precisa atender.

## 2. Fontes dos critérios

- **N:** K. M. Naegle, "Ten simple rules for effective presentation slides", *PLOS Comput Biol* 17(12): e1009554, 2021. Dez regras, citadas aqui como N1 a N10.
- **U:** UC San Diego Multimedia Services, "Evidence-Based Presentation Design Recommendations", `https://multimedia.ucsd.edu/best-practices/presentation-design.html`. A página se apoia em Mayer, *Multimedia Learning*, e em Kosslyn, *Clear and to the Point*.

**Decisão do autor:** N é a espinha da rubrica, e U refina. Quando as duas discordam (U pede imagem sem texto e no máximo 4 itens; N aceita texto curto redundante com a fala e até cerca de 6 elementos), o critério de N decide o nível `alerta`, e o de U, mais estrito, só gera `conselho`.

A rubrica parafraseia as fontes, cita-as pelo identificador (N3, U-itens) e não reproduz trechos longos delas.

## 3. A rubrica

A rubrica é **dado**, como o contrato: `avaliador/rubrica.json`. Cada critério tem:
- `id`;
- `fonte` (N1 a N10, U-…);
- `tipo`: `medido` (a CLI calcula) ou `julgado` (a skill decide, olhando o slide);
- `alcance`: `slide` ou `aula`;
- `nivel` máximo: `alerta` ou `conselho`;
- os limiares;
- a `acao`: o texto dizendo o que fazer, legível para o autor.

O código executa a rubrica sem repetir números. Os limiares que vêm das fontes aparecem na rubrica com a citação.

### 3.1. Critérios medidos

| id | fonte | alcance | mede | nível |
|---|---|---|---|---|
| `titulo-rotulo` | N3 | slide | título de `conteudo`, `figura` ou `afirmacao` que é rótulo e não afirmação: até 2 palavras, ou da lista de rótulos genéricos da rubrica ("Introdução", "Resultados", "Métodos", "Motivação", "Conclusão", "Discussão", "Background"…), sem verbo conjugado | alerta |
| `elementos` | N7 | slide | blocos de corpo visíveis, contados como na sequência do layout; mais de 6 | alerta |
| `itens` | U | slide | itens numa lista; mais de 4 | conselho |
| `revelacao` | U | slide | lista com mais de 3 itens sem `data-passo` | conselho |
| `so-texto` | N6, U | aula | fração dos slides de `conteudo`, `figura` e `demo` sem figura, gráfico, diagrama, demo, fórmula (em destaque ou em linha) ou código; acima de 0,5 (calibrado na revisão da 1.1.0: só `conteudo` e sem a matemática em linha davam alerta falso na aula-exemplo de regressão linear) | alerta |
| `paineis` | N6 | slide | `figure` com mais de uma imagem | conselho |
| `credito` | N5 | slide | `figure` com `img` (arquivo de imagem) ou gráfico com dados, sem `p.fonte` nem `figcaption` que cite origem; o `svg` e o diagrama desenhados pelo autor não contam | conselho |
| `tempo` | N2 | aula | com `--minutos N`, slides que tomam tempo (todos menos capa, abertura e encerramento) contra N, a cerca de 1 minuto por slide; acima de 1,2 × N | alerta |
| `palavras-slide` | N4, N7 | slide | palavras visíveis no corpo, fora das notas; acima do limiar da rubrica, abaixo do teto do contrato | conselho |

O validador continua sendo a única fonte de **erro**. A avaliação só dá `alerta` e `conselho`, não muda o código de saída nem bloqueia o `build`. O contrato não muda.

### 3.2. Critérios julgados

A skill julga olhando a foto do slide e o fonte:

- `uma-ideia` (N1): o slide entrega uma só ideia.
- `titulo-conclusao` (N3): o título afirma a conclusão que o corpo sustenta.
- `essencial` (N4): nada no slide ficaria sem ser comentado.
- `grafico-eficaz` (N6): o gráfico ou a figura leva a mensagem.
- `distraido` (N8): quem não ouviu nada leva a mensagem pelo título e pela figura.
- `redundancia` (U): o texto não repete por extenso o que a imagem já diz.
- `decorativa` (U): não há imagem sem função.
- `fluxo` (N9): a transição entre slides vizinhos faz sentido. Só no alcance de aula.

Cada julgamento sai com `ok`, `conselho` ou `alerta`, uma evidência de uma frase apontando o elemento, e uma sugestão acionável.

## 4. Avaliar

### 4.1. Comando

```
aula-usp avaliar <pasta> [--slide <id|n>] [--minutos N] [--fotos <dir>] [--json]
```

- **Saída:** os critérios medidos por slide e por aula, no formato das linhas do validador:

  ```
  ALERTA · slide 4 #resultados · titulo-rotulo (N3) · "Resultados" é rótulo …
  ```

  Termina com um resumo por critério.
- **`--json`:** a lista de objetos `{slide, id, criterio, fonte, tipo, nivel, mensagem, acao}`.
- **`--fotos <dir>`:** grava um PNG de 1280 × 720 por slide, com o motor iniciado e os passos todos revelados, para a skill olhar. Precisa de Chrome; sem ele, falha de ambiente (código 2) só para esta flag.
- **Códigos de saída:** 0 com a avaliação feita, com ou sem alertas; 2 com falha de ambiente. Nunca 1: avaliar não é validar.

### 4.2. Onde mora

- **`avaliador/`:** novo diretório, do lado do navegador, sem `node:`, como `validador/`. Guarda a rubrica e os critérios medidos, que recebem o documento e a rubrica por parâmetro.
- **`build/avaliar.mjs`:** carrega a aula como `validar` faz, roda os critérios e tira as fotos.
- **Painel do navegador:** fora do escopo agora. A fronteira deixa o caminho aberto.

### 4.3. Skill `aula-usp-avaliar`

1. Roda `aula-usp avaliar --json --fotos`.
2. Julga os critérios da 3.2 olhando cada foto.
3. Escreve `avaliacao.md` na pasta da aula, com uma tabela por slide (critério, nível, evidência, sugestão) e um resumo da aula.
4. Não edita a aula. Ao final, oferece encaminhar as sugestões aceitas para `aula-usp-corrigir`.

## 5. Corrigir

### 5.1. Comandos

```
aula-usp slide <pasta> <id|n>                        # imprime o fonte daquela section, byte a byte
aula-usp slide <pasta> <id|n> --substituir <arquivo> # troca só aquela section pelo conteúdo do arquivo
aula-usp validar <pasta> --slide <id|n>              # valida a aula inteira e relata só aquele slide
```

- **`--substituir`:** localiza o intervalo de bytes da `section` no fonte, do `<section` até o `</section>` correspondente; as `section`s de uma aula não se aninham. Troca só esse intervalo e grava.
- **Garantia:** o arquivo antes do intervalo e depois dele fica idêntico byte a byte. Um teste de propriedade prova isso com todas as `section`s do espécime.
- **O que ele recusa:** um arquivo de substituição que não seja exatamente uma `section`; um `id` inexistente; e, sem `--forcar`, um `id` diferente do original.
- **`--dividir`:** junto com `--substituir`, aceita duas `section`s no arquivo, e a segunda precisa de um `id` novo, que não exista na aula. É o único caminho pelo qual a correção acrescenta um slide.
- **`validar --slide`:** a composição precisa da aula inteira no Chrome, então ela roda sobre a aula toda e o relatório é filtrado. O código de saída considera só o slide pedido.

### 5.2. Skill `aula-usp-corrigir`

**Entrada:** a pasta, o slide, e o pedido do autor ou os achados de `validar`/`avaliar` daquele slide.

1. Lê o slide com `aula-usp slide`.
2. Escreve a `section` nova.
3. Troca com `--substituir`.
4. Roda `validar --slide` e, se o pedido veio de uma avaliação, `avaliar --slide`. Itera até 3 vezes.
5. Mostra ao autor a foto de antes e a de depois.

Não mexe em nenhum outro slide. Se a correção pedir outro slide (por exemplo, dividir o slide em dois), a skill diz isso e pede autorização. Nesse caso, a inserção de um slide novo depois dele usa `--substituir` com duas `section`s e `--dividir`.

## 6. Gerar

### 6.1. O roteiro em markdown

Um arquivo `.md` descreve a aula slide a slide:

````markdown
---
unidade: ifusp
disciplina: Física Estatística
aula: 3
data: 2026-10-05
professor: Prof. Renato Vicente
---

# Passeio aleatório | e difusão

## abertura: O passeio {#passeio curto="O passeio"}
? Onde para quem dá N passos ao acaso?

## conteudo: A variância cresce | linearmente com o tempo {#variancia}
> A variância depois de N passos é \( N a^2 \).
1. Os passos são independentes.
2. + Os termos cruzados somem na média.
[destaque: Definição] Passeio aleatório: soma de passos independentes.
nota: Pedir a um aluno que ande jogando uma moeda.
fonte: Adaptado de Feller, vol. 1, cap. III.

## figura: A nuvem se espalha | como raiz de t {#nuvem}
![Dez mil caminhantes depois de 100 passos](img/nuvem.png)
legenda: Histograma das posições finais.

## encerramento: O que fica
- A variância cresce com N.
- A difusão é o limite contínuo.
próxima: Equação de Fokker-Planck.
````

**Formato:**
- **Cabeçalho YAML:** as metas.
- **`# Título | segunda linha`:** a capa. O `|` separa o `span.sinal`.
- **`## layout: título {#id curto="…"}`:** um slide.
- **Marcações de linha:**

  | marcação | vira |
  |---|---|
  | `>` | lide |
  | `?` | pergunta |
  | `- ` e `1. ` | listas; `+ ` no início do item põe `data-passo` |
  | `[destaque: rótulo]`, `[alerta: rótulo]`, `[quadro: rótulo]` | a caixa correspondente |
  | `nota:` | notas do apresentador |
  | `fonte:` | `p.fonte` |
  | `legenda:` | `figcaption` |
  | `próxima:` | a próxima aula, no encerramento |
  | `![alt](caminho)` | figura |

- **Blocos cercados:**
  - `` ```python `` é código;
  - `` ```grafico ``, com o JSON de `figure.grafico`, é gráfico;
  - `` ```dot `` é diagrama;
  - `$$ … $$` ou `\[ … \]` é fórmula em destaque;
  - `:::colunas 6-6` … `:::` divide em colunas, com `---` entre elas.
- **Matemática em linha:** `\( … \)`, passada adiante sem mexer.
- **Parágrafos:** linha comum.

Tudo o que o roteiro não souber exprimir se escreve depois no HTML: o roteiro é esqueleto e rascunho, não um segundo formato completo.

### 6.2. Comando

```
aula-usp roteiro <arquivo.md> <pasta> [--substituir]
```

- **O que faz:** converte o roteiro em `<pasta>/index.html`, com a tag do runtime da versão instalada, e roda `validar`.
- **Determinístico:** a mesma entrada gera os mesmos bytes, sem modelo de linguagem no meio.
- **Erros de roteiro:** saem com o número da linha e o código 1. Por exemplo, um layout inexistente, uma marcação desconhecida ou uma lista dentro de `capa`.
- **Pasta existente:** não sobrescreve uma pasta com `index.html`, salvo com `--substituir`.
- **O que copia:** as figuras citadas pelo caminho relativo ao `.md` vão para `<pasta>/img/`.
- **Onde mora:**
  - o parser e o gerador, em `montar/roteiro.js`, do lado do navegador e sem `node:`, para um dia poder rodar num artifact;
  - o comando, em `build/roteiro.mjs`.

### 6.3. Skill `aula-usp-gerar`

**Entrada:** um pedido, opcionalmente um roteiro, e fontes.

**Fontes aceitas (decisão do autor), lidas pelo próprio agente, sem biblioteca nova na CLI:**
- **Artigos em PDF:** texto e figuras.
- **Apresentações em PDF,** de Beamer, PowerPoint ou Keynote exportados.
- **PPTX:** o agente descompacta e lê `ppt/slides/*.xml` e as mídias.
- **Beamer `.tex`:** um `frame` vira um slide candidato; a matemática passa direto, porque o TeX permitido é o do contrato.
- **Aulas Aula USP:** `section`s reaproveitadas com `aula-usp slide`.

**Fluxo:**
1. A skill lê as fontes e escreve `roteiro.md`, respeitando a rubrica: título-afirmação, uma ideia por slide, cerca de 1 minuto por slide com a duração pedida, e `fonte:` em todo dado ou figura alheia.
2. **Ponto de controle:** mostra o roteiro ao autor e espera o "sim" antes de gerar o HTML.
3. Roda `aula-usp roteiro`, completa o que o roteiro não exprime, e itera até `validar` dar 0 erros.
4. Roda `aula-usp-avaliar`, aplica as correções aceitas com `aula-usp-corrigir`, e entrega a aula com a avaliação final.

**Figuras de artigos:** entram só com crédito em `p.fonte` (N5). A skill avisa o autor quando a licença da fonte não for aberta. Recortar figuras de PDF é trabalho do agente com as ferramentas do ambiente dele; a CLI não extrai.

## 7. Pacotes

- **Três skills novas:** `pacotes/skill/aula-usp-avaliar/`, `aula-usp-corrigir/` e `aula-usp-gerar/`. Cada uma tem o seu `SKILL.md`, gerado de uma fonte em `guia/pacotes/`, e o que citar.
- **Autossuficiência:** a guarda que exige tudo citado entre crases presente no pacote vale para as três. A `avaliar` leva `rubrica.json`; a `gerar` leva o formato do roteiro.
- **O pacote `aula-usp`:** continua como está, e passa a citar as três pelo nome.
- **claude.ai e GPT:** as instruções do Projeto e do GPT ganham três modos curtos (avaliar, corrigir, gerar a partir de roteiro), descritos para um ambiente sem terminal. Sem CLI, a medição é feita pelo agente lendo a rubrica. O teto de 8.000 caracteres do `instrucoes.txt` continua valendo, e a folga é medida.
- **Guia:** um capítulo novo, `guia/80-avaliar-corrigir-gerar.md`, com o formato do roteiro e a rubrica em linguagem de autor.

## 8. Testes

- **Rubrica contra a spec:** critério a critério, com fonte, alcance, nível e limiares. O universo da guarda vem desta spec, escrito no teste, e não do `rubrica.json`.
- **Critérios medidos:** um par `bom`/`ruim` por critério, em `tests/fixtures/avaliador/`.
- **Corte de `slide --substituir`:** todas as `section`s do espécime extraídas e reinseridas dão o arquivo idêntico; substituir uma delas deixa o resto igual.
- **`roteiro`:**
  - o exemplo da 6.1 gera uma aula que valida limpa;
  - o espécime reescrito como roteiro volta a um HTML que valida limpo;
  - determinismo: duas execuções dão os mesmos bytes;
  - um teste por erro de roteiro.
- **Integração:** `avaliar --fotos` no espécime grava um PNG por slide, com 1280 × 720.
- **Julgamento:** as partes julgadas das skills não têm teste automático. O aceite é o do autor: para cada skill, um roteiro de aceite em `tests/aceite/`, rodado no Claude Code.

## 9. Fora do escopo

- Avaliar a apresentação falada: ritmo, voz, ensaio (N9 fica só no fluxo entre slides).
- Painel de avaliação dentro da aula.
- Extração automática de figuras de PDF pela CLI.
- Biblioteca de PPTX na CLI.
- Tradução de aulas.
- Mudança no contrato ou nas regras do validador por causa da rubrica.

## 10. Versões

Cada capacidade é um marco próprio, com plano, execução, revisão e publicação:

| marco | versão |
|---|---|
| avaliar | 1.1.0 |
| corrigir | 1.2.0 |
| gerar | 1.3.0 |

Cada publicação espera o "sim" do autor, como na fase 3.
