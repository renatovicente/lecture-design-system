# Aula USP

Design system de aulas em HTML para a USP — pensado para ser escrito por um agente (Claude, GPT, Codex) e conferido por um validador, não para ser diagramado à mão.

Uma aula é **um arquivo HTML**. Sem framework, sem build para abrir, sem PowerPoint. O autor escreve `<section data-layout="conteudo">` com texto, matemática e código; o sistema monta o slide, o motor navega, e o validador acusa o que fugiu do contrato — no terminal e num painel dentro da própria aula.

Feito para o IME-USP e o IFUSP, com a identidade visual da USP.

## Guia rápido

Do zero a uma aula projetada, em seis passos. Precisa de Node 20.6 ou superior e, para o painel de composição e o PDF, do Google Chrome instalado.

**1. Instale e crie a aula.**

```bash
npm install -g aula-usp
aula-usp novo minha-aula --unidade ime
```

`--unidade` escolhe o segundo logo da capa e do encerramento, ao lado da assinatura da USP (veja "Logos da capa", abaixo). A pasta nasce com `index.html`, que é a aula inteira, já com a tag do runtime.

**2. Preencha o cabeçalho.** No `<head>` de `minha-aula/index.html`:

```html
<meta name="unidade" content="ime">
<meta name="disciplina" content="Física Estatística">   <!-- opcional -->
<meta name="aula" content="3">                         <!-- opcional -->
<meta name="data" content="2026-10-05">
<meta name="professor" content="Prof. Nome Sobrenome">
<meta name="video" content="canto">                    <!-- opcional -->
```

- Sem `disciplina` e `aula`, a capa e o rodapé ficam sem a linha "disciplina · Aula N".
- `video="canto"` reserva o canto inferior direito, 334 × 188 px, para sobrepor a câmera no OBS, Zoom ou Meet. O rodapé e os logos saem dali, e o validador acusa qualquer conteúdo que entre no canto.

**3. Escreva os slides.** Cada slide é uma `section` com um dos sete layouts:
- `capa`: sempre o primeiro;
- `abertura`: abre um bloco; de 2 a 8 por aula;
- `conteudo`, `afirmacao`, `figura` e `demo`: o miolo;
- `encerramento`: sempre o último.

```html
<section data-layout="abertura" id="difusao" data-curto="Difusão">
  <h2>Difusão</h2>
  <p class="pergunta">Por que a nuvem se espalha como raiz de t?</p>
</section>

<section data-layout="conteudo" id="variancia">
  <h2>A variância cresce<br><span class="sinal">linearmente com o tempo.</span></h2>
  <p class="lide">Depois de N passos de tamanho a, \( \langle x^2 \rangle = N a^2 \).</p>
  <ol class="passos">
    <li>Os passos são independentes.</li>
    <li data-passo>Os termos cruzados somem na média.</li>
  </ol>
  <aside class="notas">O que dizer em voz alta e não está no slide.</aside>
</section>
```

Algumas convenções:
- `data-curto` é o nome do bloco no mapa;
- a segunda linha do título vai em `span.sinal`, em azul;
- a matemática vai entre `\(` `\)`, ou `\[` `\]` para destaque;
- `data-passo` revela o item num clique;
- o código vai em `<pre data-lang="python">`, começando na primeira coluna do arquivo.

O vocabulário é fechado: o que não está no contrato, o validador recusa.

Quem prefere começar por um esqueleto em markdown, slide a slide, escreve um `roteiro.md` e roda `aula-usp roteiro roteiro.md minha-aula`, que gera o `index.html` e o valida.

**4. Veja e corrija enquanto escreve.**

```bash
aula-usp servir minha-aula
aula-usp validar minha-aula
```

`servir` abre a aula no navegador: salve o arquivo e recarregue. `validar` lista erros e avisos com o slide, a regra e o que fazer, e sai com 0 quando não há erros.

Com a aula válida, `aula-usp avaliar minha-aula` aconselha sobre a qualidade dos slides, sem mudar nada (veja "Avaliar a qualidade", abaixo).

**5. Apresente.** No navegador:

| tecla | faz |
|---|---|
| → ou espaço | avança (passo a passo) |
| ← | volta |
| 1 a 8 | pula para o bloco |
| Esc | visão geral |
| N | notas |
| P | janela do apresentador |
| F | tela cheia |
| V | painel do validador |
| ? | ajuda |

**6. Construa para distribuir.**

```bash
aula-usp build minha-aula
```

Gera, em `minha-aula/dist/`, um HTML autocontido que abre sem internet e o PDF da aula.

**Com um agente, sem escrever HTML à mão:** `pacotes/` traz um pacote pronto por ambiente:
- `claude/projeto`: um Projeto do claude.ai;
- `gpt/gpt-personalizado`: um GPT personalizado;
- `skill/aula-usp`: Claude Code e Codex CLI;
- `skill/aula-usp-avaliar`: a skill que avalia uma aula pronta, no Claude Code;
- `skill/aula-usp-corrigir`: a skill que corrige um slide sem tocar no resto da aula, no Claude Code;
- `skill/aula-usp-gerar`: a skill que monta a aula a partir de artigos, apresentações e um roteiro em markdown, no Claude Code;
- `repositorio-de-disciplina`: o repositório de uma disciplina.

Suba o pacote e peça a aula em português. O que ele gerar passa pelo mesmo `aula-usp validar`. O guia completo do autor está em `guia/`.

## Logos da capa

A capa e o encerramento trazem a assinatura da USP e um segundo logo, escolhido pela meta `unidade`:

| `unidade` | logo |
|---|---|
| `ime` | Instituto de Matemática, Estatística e Ciência da Computação: assinatura conjunta IME+USP, preta |
| `ifusp` | Instituto de Física, preto |
| `acs` | Agentic Complex Systems, preto |
| `ciaam` | Centro de Inteligência Artificial e Aprendizado de Máquina: a inscrição "CIAAM" em azul, a única exceção à regra dos logos pretos (spec 4.5) |

**Para acrescentar outro logo** (um centro, um grupo, outra unidade), num clone deste repositório:

1. Ponha o arquivo oficial em `assets/marcas/`: SVG de preferência, ou PNG com resolução folgada, recortado na caixa de tinta e sem nenhuma outra alteração.
2. Acrescente a entrada em `assets/marcas/unidades.json`. A chave é o valor da meta `unidade`. Os campos são:
   - `nome`, por extenso, que vira o texto alternativo;
   - `arquivo`;
   - `integraUSP`, verdadeiro só se o logo já traz a assinatura da USP;
   - `altura`, `protecao` e `alturaMinima`, em px, tirados do manual de identidade visual quando houver.
3. Registre a origem e as medidas em `assets/marcas/README.md`. Acrescente o logo ao `import` de `montar/dist.js`, que embute os logos no runtime, e à lista de `tests/unit/marcas.test.mjs`. Um logo que não seja preto precisa de exceção nomeada na spec 4.5.
4. Rode `aula-usp dist`, `aula-usp pacotes`, `npm test` e `npm run test:integracao`, e publique uma versão nova. A tag das aulas aponta para uma versão exata da CDN, então o logo só aparece para quem usar essa versão ou uma posterior.

## Espaço para o vídeo do ministrante

Para gravar ou transmitir a aula com a sua câmera sobreposta no canto inferior direito do slide, a aula reserva esse canto. O sistema **não mostra vídeo nenhum**: quem põe a câmera por cima é o programa de gravação ou de transmissão (OBS, Zoom, Meet). A aula só garante que nada dela fique embaixo da câmera.

### 1. Ligue a reserva na aula

No `<head>` do `index.html`, acrescente uma linha:

```html
<meta name="video" content="canto">
```

É opcional. Sem ela, a aula sai exatamente como antes.

Com ela:
- **O canto reservado** é um retângulo 16:9 de 334 × 188 px no palco de 1280 × 720, encostado nas bordas direita e de baixo: de x = 946 a 1280 e de y = 532 a 720. São as colunas 10 a 12 da grade, mais a margem direita.
- **O que o sistema arruma sozinho:**
  - o rodapé e os logos da capa e do encerramento terminam antes do canto;
  - a abertura sobe;
  - a afirmação se centra acima do canto;
  - figuras e demos perdem a faixa da direita.
- **O que fica com você:** o corpo dos slides de `conteudo`. A coluna da direita, ou o corpo inteiro se não houver colunas, tem de terminar antes de y = 532. Uma grade `8-4` com um destaque curto na coluna estreita costuma resolver.
- **O validador confere:** `aula-usp validar` acusa com `composicao.canto-video` todo bloco que entrar no canto, dizendo quantos pixels entrou. Na abertura cabe um título de duas linhas sem pergunta, ou de uma linha com uma pergunta de até duas. Mais que isso transborda.

O exemplo completo, com os sete layouts e o canto ligado, é `especime/video.html`, e o guia detalha tudo em `guia/20-layouts.md`, seção "O canto do vídeo".

### 2. Ponha a câmera no canto

O canto ocupa **26,1% da largura e 26,1% da altura** do slide, a partir do canto inferior direito, em qualquer resolução 16:9:

| resolução da gravação | posição da câmera (x, y) | tamanho da câmera |
|---|---|---|
| 1280 × 720 | 946, 532 | 334 × 188 |
| 1920 × 1080 | 1419, 798 | 501 × 282 |
| 2560 × 1440 | 1892, 1064 | 668 × 376 |
| 3840 × 2160 | 2838, 1596 | 1002 × 564 |

**No OBS Studio,** o caminho mais seguro, porque grava e transmite. Os nomes dos menus variam um pouco entre versões.

1. Em **Configurações → Vídeo**, ponha a resolução base em 1920 × 1080, ou em outra da tabela.
2. Abra a aula no navegador (`aula-usp servir minha-aula`, ou o HTML de `minha-aula/dist/` depois do `build`) e aperte **F** para a tela cheia.
3. Acrescente a fonte **Captura de janela**, apontando o navegador, e ajuste-a para ocupar a tela inteira do OBS: botão direito → Transformar → Ajustar à tela.
   - **Se a sua tela não for 16:9,** como a de muitos Macs (16:10), o slide fica com faixas brancas. Recorte-as (Alt + arrastar a borda da fonte) até o slide encostar nas quatro bordas do OBS. A tabela acima só vale se o slide ocupar exatamente a tela do OBS.
4. Acrescente a fonte **Dispositivo de captura de vídeo**, com a sua câmera, **acima** da captura de janela na lista de fontes. Em botão direito → Transformar → Editar transformação, ponha a posição e o tamanho da tabela, por exemplo 1419, 798 e 501 × 282 em 1920 × 1080. Uma câmera 16:9 encaixa sem distorção. Se a sua for 4:3, use o tipo de caixa delimitadora que recorta, para preencher o retângulo sem esticar.
5. **Confira:** vá até um slide de conteúdo com texto na coluna da direita. Nada dele pode ficar embaixo da câmera, e o rodapé tem de aparecer inteiro à esquerda dela.
6. **Grave,** ou transmita. Para usar o resultado numa chamada, use **Iniciar câmera virtual** e escolha "OBS Virtual Camera" como câmera no Zoom, no Meet ou no Teams, ou compartilhe na chamada a janela do projetor do OBS (botão direito na prévia → Projetor em janela).

**Direto no Zoom ou no Meet, sem OBS:** esses programas põem a sua câmera onde eles querem, num quadro que você não controla com precisão. Dá para compartilhar a tela e arrastar a miniatura da sua câmera para o canto inferior direito, mas a posição não é garantida, e cada participante pode ver o quadro num lugar diferente. Para uma gravação que vai ficar, prefira o OBS.

**No PDF e no HTML construído,** o canto sai vazio, como na tela. É o espaço onde a câmera estava na gravação.

## Skills para agentes

Uma skill é uma pasta com um `SKILL.md`: instruções que o agente carrega sozinho quando o pedido combina com a descrição dela. O Aula USP traz quatro, em `pacotes/skill/`, e cada uma leva dentro tudo o que cita: guia, contrato, exemplos e rubrica. Ela funciona sem este repositório.

| skill | para quê | quando o agente a usa |
|---|---|---|
| `aula-usp` | escrever aulas e slides no Aula USP: o arquivo HTML, os layouts, a matemática, o código e as figuras, e corrigir os achados do validador até dar 0 erros | "faça uma aula sobre…", "escreva um slide de abertura…", "corrija os erros do validador" |
| `aula-usp-avaliar` | julgar a qualidade de uma aula pronta ou de um slide pela rubrica de Naegle e da UCSD, com o relatório em `avaliacao.md`, sem editar a aula | "avalie esta aula", "o slide 5 está bom?", "revise a qualidade dos slides" |
| `aula-usp-corrigir` | corrigir, reescrever ou encurtar um slide específico sem tocar no resto do arquivo, aplicando o pedido do autor, uma sugestão de `avaliacao.md` ou um achado do validador, com a foto de antes e a de depois | "corrija o slide #variancia: o título está longo", "aplique ao slide 5 a sugestão da avaliação" |
| `aula-usp-gerar` | montar uma aula a partir de artigos em PDF, de apresentações antigas (PDF, PPTX, Beamer, outras aulas do Aula USP) ou de um roteiro em markdown: escreve o roteiro, **para e mostra ao autor**, e com o "sim" gera, valida, avalia e corrige, entregando a lista das figuras alheias com a licença de cada uma | "faça uma aula de 50 minutos a partir deste artigo e da minha apresentação em Beamer", "transforme este roteiro em aula" |

**Como usar no Claude Code:**

1. Instale a CLI:

   ```bash
   npm install -g aula-usp
   ```

   As skills chamam `aula-usp validar`, `build`, `avaliar`, `slide` e `roteiro`.
2. Copie as skills para onde o Claude Code as carrega. Pode ser a pasta do projeto, `.claude/skills/`, ou todas as suas pastas, `~/.claude/skills/`:

   ```bash
   mkdir -p ~/.claude/skills
   cp -R pacotes/skill/aula-usp pacotes/skill/aula-usp-avaliar pacotes/skill/aula-usp-corrigir pacotes/skill/aula-usp-gerar ~/.claude/skills/
   ```

   As pastas não vão no pacote do npm, que leva a CLI, o runtime, o modelo, os exemplos e o guia, mas não os pacotes para agentes. Elas estão no repositório público: `git clone https://github.com/renatovicente/lecture-design-system` e copie de `lecture-design-system/pacotes/skill/`.
3. Abra o Claude Code na pasta de trabalho e peça em português, por exemplo: "Faça uma aula de 12 slides sobre passeio aleatório para a graduação, unidade ifusp." Depois: "Avalie a aula em passeio/ para 50 minutos." E, para um slide só: "Na aula em passeio/, corrija o slide #variancia: o título está longo." Não precisa chamar a skill pelo nome: a descrição dela basta para o agente escolher.

**No Codex CLI:** use a mesma pasta `pacotes/skill/aula-usp/`, carregada da forma que a sua versão do Codex aceita skills ou instruções de projeto. O aceite da fase 1 rodou assim, e a forma de carregar é registrada em `tests/aceite/roteiro.md`.

**Sem terminal:** o claude.ai e o ChatGPT não carregam skills. Para eles existem os pacotes `pacotes/claude/projeto/` (instruções e arquivos de um Projeto) e `pacotes/gpt/gpt-personalizado/` (instruções e conhecimento de um GPT personalizado). Os dois já têm os modos de escrever, de avaliar, de corrigir um slide e de gerar a partir de um roteiro.

## Gerar a partir de um roteiro

Um roteiro é um arquivo em markdown que descreve a aula slide a slide: o layout, o título e o corpo de cada um. É um esqueleto, curto o bastante para discutir a aula antes de escrevê-la, e o comando o transforma na aula:

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

```bash
aula-usp roteiro roteiro.md passeio
```

O comando escreve `passeio/index.html`, copia `img/nuvem.png` para `passeio/img/` e roda `aula-usp validar`. A conversão é determinística: o mesmo roteiro dá sempre os mesmos bytes. Um erro de roteiro sai com a linha, sem escrever nada. O que o roteiro não exprime — demos, exercícios — se escreve depois no HTML. A sintaxe completa, com um roteiro inteiro que valida limpo, está em `guia/80-avaliar-corrigir-gerar.md`, na seção "Gerar a partir de um roteiro e de fontes".

Com `video: canto` no cabeçalho, o roteiro reserva o canto do vídeo, e o validador passa a cobrar que o corpo de cada slide termine antes dele. No exemplo acima, o slide `#variancia` não cabe com o canto ligado: o destaque e a fonte entram nele, e é preciso passar um bloco para outro slide.

A skill `aula-usp-gerar` escreve o roteiro por você, a partir de artigos e de apresentações antigas, e o mostra antes de gerar a aula (veja "Skills para agentes", acima).

## Avaliar a qualidade

Validar diz se a aula **está certa**; avaliar diz se ela **está boa**. A avaliação segue duas fontes: as dez regras de K. M. Naegle, "Ten simple rules for effective presentation slides" (*PLOS Comput Biol*, 2021), citadas como N1 a N10, e as recomendações de design de apresentação da UC San Diego (U). Quando as duas discordam, Naegle decide o alerta, e a UCSD, mais estrita, só dá conselho. A rubrica inteira é dado, em `avaliador/rubrica.json`.

**O que se mede,** com `aula-usp avaliar`:

| critério | o que acusa | nível |
|---|---|---|
| `titulo-rotulo` (N3) | título que é rótulo ("Resultados", "Introdução") e não afirma a conclusão | alerta |
| `elementos` (N7) | mais de 6 blocos no slide | alerta |
| `so-texto` (N6) | mais da metade dos slides de conteúdo, figura e demo sem figura, gráfico, diagrama, demo, fórmula ou código | alerta |
| `tempo` (N2) | com `--minutos N`, mais slides do que cabem a cerca de 1 minuto cada | alerta |
| `palavras-slide` (N4, N7) | mais de 60 palavras no corpo | conselho |
| `itens` (U) | lista com mais de 4 itens | conselho |
| `revelacao` (U) | lista com mais de 3 itens sem revelação passo a passo | conselho |
| `paineis` (N6) | mais de uma figura no slide | conselho |
| `credito` (N5) | imagem ou gráfico com dados sem linha de fonte nem legenda que diga a origem | conselho |

**O que se julga,** olhando cada slide: a skill `aula-usp-avaliar` faz isso a partir das fotos de `--fotos`. Ela pergunta se o slide:
- tem uma ideia só (N1);
- tem um título que afirma a conclusão que o corpo sustenta (N3);
- tem só o essencial (N4);
- tem um gráfico que leva a mensagem (N6);
- passa a mensagem a quem se distraiu (N8);
- repete no texto o que a imagem já diz (U);
- tem imagem decorativa (U);
- flui a partir do slide anterior (N9).

**Como usar:**
- **No terminal:** rode `aula-usp avaliar minha-aula --minutos 50`. Ele nunca dá erro nem bloqueia o `build`, e uma aula com erro de validação não é avaliada.
- **Com o Claude Code ou o Codex:** instale o pacote `pacotes/skill/aula-usp-avaliar/` e peça "avalie a aula em minha-aula". A skill junta o que se mede e o que se julga em `minha-aula/avaliacao.md`, com uma tabela por slide (critério, nível, evidência e sugestão), e não edita a aula.
- **No claude.ai e no ChatGPT:** as instruções dos pacotes `claude/projeto` e `gpt/gpt-personalizado` têm um modo "avaliar". Sem terminal, o agente mede à mão pela mesma rubrica.

## Instalar

A CLI se instala pelo npm, de um destes dois jeitos:

```bash
npm install -g aula-usp
npx aula-usp novo minha-aula --unidade ime
```

O pacote leva a CLI, o runtime de `dist/`, o modelo, a aula-exemplo e o guia do autor, e só as dependências de produção. A tag do runtime vem pronta no modelo: `aula-usp novo` a copia como está, com a versão e o `integrity` do pacote instalado.

`aula-usp dist` e `aula-usp pacotes` são manutenção do sistema e só rodam num clone deste repositório: no pacote instalado os dois recusam com saída 2 e dizem isso.

## Os comandos

Num clone deste repositório, `npm link` põe `aula-usp` no PATH.

```bash
aula-usp novo <pasta> --unidade ime
```

Copia `modelos/aula/` para uma pasta nova, preenchendo as duas metas que o comando sabe: `unidade`, da opção, e `data`, de hoje. As outras três — `disciplina`, `aula` e `professor` — ficam com o texto de exemplo do modelo (as duas primeiras são opcionais desde a 1.0.1: apagadas, a capa e o rodapé ficam sem a linha da disciplina), de propósito: um valor inventado para `professor` seria pior que um lugar visivelmente vazio. A unidade tem de ser uma chave de `assets/marcas/unidades.json` — com outra, o comando sai dizendo quais existem —, e uma pasta que já tenha conteúdo não é sobrescrita.

```bash
aula-usp servir <pasta> [--porta 8765]
```

Serve a aula com o runtime local e abre o modo navegador. É como se escreve uma aula: salvar o arquivo e recarregar.

```bash
aula-usp validar <pasta> [--slide <id|n>] [--json]
```

Roda as regras estáticas e de carga e, havendo Chrome, as de composição. Saída 0 sem erros, 1 com erros de validação, 2 com falha de ambiente. Falta de Chrome não é falha: vira aviso e pula a composição. Com `--slide`, valida a aula inteira, mas relata só os achados daquele slide, conta numa última linha os que ficaram de fora, e sai com 1 só se houver erro nele.

```
AVISO · slide 3 #uma-ideia · estrutura.notas-ausentes · slide de layout "conteudo" sem notas do apresentador. Acrescente <aside class="notas"> com o que dizer neste slide.
ERRO · slide 3 #uma-ideia · limites.titulo · título com 80 caracteres num segmento (máx. 50). Corte o título ou divida o conteúdo em dois slides.
    Um título que é longo demais para caber em uma linha só do slide e segue adiante
Validador Aula USP: 1 erro, 1 aviso
```

`--json` dá a mesma lista como objetos, para um agente consumir.

```bash
aula-usp build <pasta> [--sem-pdf]
```

Constrói a aula: valida, monta, pré-renderiza, embute tudo num HTML autocontido e gera o PDF. Escreve só em `<pasta>/dist/`.

```bash
aula-usp avaliar <pasta> [--slide <id|n>] [--minutos N] [--fotos <dir>] [--json]
```

Julga uma aula já válida pelas boas práticas de Naegle (2021) e da UCSD, com a rubrica de `avaliador/rubrica.json`: título que é rótulo e não conclusão, slide com elementos, itens ou palavras demais, lista sem revelação, aula só de texto, figura sem crédito e, com `--minutos`, slides demais para o tempo. Dá só `ALERTA` e `CONSELHO`, nunca erro, e sai com 0 com ou sem alertas; uma aula com erro de validação não é avaliada ("valide primeiro"). `--slide` avalia um slide só, pelo id ou pela posição. `--fotos <dir>` grava um PNG de 1280 × 720 por slide, com os passos revelados, e um `indice.json`, para um agente julgar o que não se mede; é a única opção que precisa do Chrome, e sem ele sai com 2.

```
ALERTA · slide 5 #desvio · titulo-rotulo (N3) · o título "Desvio típico" é rótulo, não conclusão (2 palavras, sem afirmar nada). Troque o rótulo por uma frase que diga a conclusão do slide: não "Resultados", mas o que os resultados mostram.
    <h2>Desvio típico</h2>
Avaliação Aula USP: 1 alerta, 0 conselhos
  titulo-rotulo (N3) · 1 alerta, 0 conselhos
  …
```

```bash
aula-usp slide <pasta> <id|n>
aula-usp slide <pasta> <id|n> --substituir <arquivo> [--dividir] [--forcar]
```

Corrige um slide sem tocar no resto do arquivo. Sem opção, imprime o fonte daquela `section`, byte a byte, pelo id ou pela posição (de 1 a N, a mesma numeração de `validar` e `avaliar`). Com `--substituir`, troca só aquela `section` pela do arquivo, que tem de ter exatamente uma, com o mesmo id; fora dela, a aula fica idêntica byte a byte, e a escrita é atômica. `--forcar` aceita um id diferente, e `--dividir` aceita duas `section`s no arquivo, a segunda com um id novo, para partir um slide em dois. Um alvo que não existe, um arquivo com zero ou três `section`s ou um id trocado sem `--forcar` saem com 1, sem mexer na aula. O comando não valida: depois dele, rode `validar --slide`.

```bash
aula-usp roteiro <arquivo.md> <pasta> [--substituir]
```

Converte um roteiro em markdown, slide a slide, em `<pasta>/index.html`, com a tag do runtime do modelo, copia para `<pasta>/img/` as figuras citadas pelo caminho relativo ao roteiro e roda `validar`, cujo código de saída é o do comando. A conversão é determinística: o mesmo roteiro dá os mesmos bytes. Um erro de roteiro — um layout que não existe, uma marcação desconhecida, uma figura que não está lá — sai com 1, uma linha por erro, com o arquivo e a linha, e nada é escrito. Uma pasta que já tem `index.html` é recusada com 2, salvo com `--substituir`, que troca o `index.html` e as figuras e deixa o resto da pasta como está. O que o roteiro não exprime (demos, exercícios) se escreve depois no HTML.

```bash
aula-usp dist
aula-usp pacotes
```

Os dois últimos são manutenção do sistema, não de uma aula: `dist` regenera `validador/cobertura.json` e os 14 arquivos versionados de `dist/`; `pacotes` fixa a tag do runtime, gera o guia e monta `pacotes/`, nessa ordem, conferindo os limites da spec 11.1.

## Como rodar aqui

Precisa de Node 20.6 ou superior e do Google Chrome instalado (o `playwright-core` usa o Chrome do sistema; não baixa navegador).

```bash
npm install
npm test
```

Os testes de integração abrem o Chrome e são pesados; rode **um arquivo por vez**:

```bash
node --test tests/integracao/composicao.test.mjs
```

Para ver o sistema funcionando, sirva o espécime — os sete decks que exercitam todos os layouts e componentes, um deles com o canto do vídeo:

```bash
npm run servir -- especime
```

## Como está organizado

```
contrato/contrato.json   o contrato como DADO: layouts, vocabulário, papéis, 34 limites e as 65 regras
tokens/                  fonte única dos tokens (DTCG); estilos/tokens.css é gerado daqui
estilos/                 base, layouts, componentes, motor, impressão
montar/                  transforma o fonte do autor no slide montado
motor/                   navegação, passos, notas, apresentador, painéis, impressão
componentes/             matemática (KaTeX), código (Shiki), gráficos, diagramas e controles, nos dois modos
validador/               validar.js e regras/*.js — executam o contrato, não o repetem
avaliador/               a rubrica de avaliação (rubrica.json) e os critérios medidos de `aula-usp avaliar`
build/                   glue de Node: servir, validar, construir, PDF, empacotar
dist/                    o runtime versionado: 14 arquivos, gerados por `aula-usp dist`
guia/                    o guia do autor, 20 arquivos, com as fontes dos pacotes em guia/pacotes/
pacotes/                 os 4 pacotes para agentes e as skills de avaliar, corrigir e gerar, 62 arquivos, gerados por `aula-usp pacotes`
modelos/aula/            o esqueleto que `aula-usp novo` copia
exemplos/                as aulas-exemplo: descida do gradiente, e regressão linear com gráfico, diagrama e demo
especime/                sete decks que exercitam tudo
tests/                   unit/, integracao/, fixtures/ e o roteiro de aceite
docs/superpowers/        a spec, os planos de cada marco e as revisões finais
```

Uma divisão importa mais que as outras: **`montar/`, `motor/`, `componentes/`, `validador/` e `avaliador/` não importam nada do Node** — rodam no navegador. Só `bin/` e `build/` são Node. É o que permite a mesma regra rodar no painel dentro da aula e na linha de comando.

Sete artefatos são **gerados e versionados**, cada um com uma guarda que falha se o arquivo em disco divergir do gerador: `estilos/tokens.css` e `tokens/tokens.js`, `estilos/fontes.css`, `validador/cobertura.json`, `dist/`, os blocos gerados de quatro arquivos do `guia/`, `pacotes/` e `assets/aula-usp.mplstyle`.

### O contrato é dado, não código

As 65 regras vivem em `contrato/contrato.json` com severidade, grupo, fase e o texto da ação — 60 da fase 1 e 5 da fase 2. O código executa o contrato; não o restata. Mudar um limite é editar um número em JSON, e há testes que falham se o código e o contrato discordarem.

### As regras rodam em quatro grupos

| grupo | sobre o quê | quando | quantas |
|---|---|---|---|
| estáticas | o fonte do autor | antes de montar | 48 |
| carga | o fonte, depois de bibliotecas, imagens, scripts, CSV e DOT carregarem | depois do `load` | 7 |
| composição | o documento montado e renderizado | medido no Chrome, antes do motor iniciar | 6 |
| saída | o HTML e o PDF finais | dentro do `build`, sobre o que foi escrito em `<pasta>/dist/` | 4 |

A ordem do grupo de composição não é detalhe: depois que o motor inicia, todo slide que não é o atual mede 0×0, e o transbordo deixaria de existir para o validador. Há testes que falham se alguém mover essa chamada.

## Como se escreve uma aula

```html
<section data-layout="conteudo" id="minimos-quadrados">
  <h2>Mínimos quadrados</h2>
  <p class="lide">O erro que a reta não consegue evitar.</p>
  <p>Minimizamos \( \sum_i (y_i - \hat{y}_i)^2 \) sobre os coeficientes.</p>
  <aside class="notas">Lembrar de ligar com a aula passada.</aside>
</section>
```

O vocabulário é fechado de propósito: o validador recusa elemento, classe ou atributo fora do contrato, e recusa `style` inline. É o que mantém a aula consistente quando quem escreve é um modelo de linguagem.

## Por onde continuar

Este arquivo é a porta de entrada, e para de propósito aqui. Quem chega vai para um de dois lugares:

- **escrever aulas** — `guia/`, o guia do autor: layouts, componentes, matemática e código, gráficos, diagramas e demos, o que o validador cobra, e um arquivo por fluxo de trabalho (terminal, chat, artifact do Claude, GPT personalizado). Para trabalhar com um agente, os pacotes prontos estão em `pacotes/`, inclusive as skills de avaliar e de corrigir;
- **desenvolver o sistema** — `AGENTS.md`, que é onde estão a fronteira do Node, as guardas dos artefatos gerados, como se acrescenta uma regra e o que este projeto já aprendeu errando.

A spec é a autoridade sobre os dois: `docs/superpowers/specs/2026-09-14-aula-usp-design.md`, e, para avaliar, corrigir e gerar aulas, `docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md`.

## Processo

Cada marco tem uma spec, um plano com o código verificado antes de ser escrito, execução por subagentes com revisão por tarefa, uma revisão final e uma rodada de correção. Os planos ficam em `docs/superpowers/plans/` e as revisões finais em `docs/superpowers/revisoes/`, cada uma com uma seção em português sobre o que foi feito depois dela.

Não há CI: quem roda os testes antes de commitar é quem commita.

## Licença

O código é MIT (`LICENSE`). A licença não cobre as marcas de `assets/marcas/`, que pertencem à USP e às unidades e seguem as regras de identidade visual de cada instituição, nem as fontes de `assets/fontes/`, que seguem a SIL OFL, com os textos em `assets/fontes/licencas/`.
