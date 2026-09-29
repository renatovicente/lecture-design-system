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

## Skills para agentes

Uma skill é uma pasta com um `SKILL.md`: instruções que o agente carrega sozinho quando o pedido combina com a descrição dela. O Aula USP traz duas, em `pacotes/skill/`, e cada uma leva dentro tudo o que cita: guia, contrato, exemplos e rubrica. Ela funciona sem este repositório.

| skill | para quê | quando o agente a usa |
|---|---|---|
| `aula-usp` | escrever aulas e slides no Aula USP: o arquivo HTML, os layouts, a matemática, o código e as figuras, e corrigir os achados do validador até dar 0 erros | "faça uma aula sobre…", "escreva um slide de abertura…", "corrija os erros do validador" |
| `aula-usp-avaliar` | julgar a qualidade de uma aula pronta ou de um slide pela rubrica de Naegle e da UCSD, com o relatório em `avaliacao.md`, sem editar a aula | "avalie esta aula", "o slide 5 está bom?", "revise a qualidade dos slides" |

Duas outras estão especificadas e virão nas próximas versões: `aula-usp-corrigir`, para corrigir um slide específico sem tocar no resto, e `aula-usp-gerar`, para montar a aula a partir de artigos, apresentações e um roteiro em markdown.

**Como usar no Claude Code:**

1. Instale a CLI:

   ```bash
   npm install -g aula-usp
   ```

   As skills chamam `aula-usp validar`, `build` e `avaliar`.
2. Copie as skills para onde o Claude Code as carrega. Pode ser a pasta do projeto, `.claude/skills/`, ou todas as suas pastas, `~/.claude/skills/`:

   ```bash
   mkdir -p ~/.claude/skills
   cp -R pacotes/skill/aula-usp pacotes/skill/aula-usp-avaliar ~/.claude/skills/
   ```

   As pastas não vão no pacote do npm, que leva a CLI, o runtime, o modelo, os exemplos e o guia, mas não os pacotes para agentes. Elas estão no repositório público: `git clone https://github.com/renatovicente/lecture-design-system` e copie de `lecture-design-system/pacotes/skill/`.
3. Abra o Claude Code na pasta de trabalho e peça em português, por exemplo: "Faça uma aula de 12 slides sobre passeio aleatório para a graduação, unidade ifusp." Depois: "Avalie a aula em passeio/ para 50 minutos." Não precisa chamar a skill pelo nome: a descrição dela basta para o agente escolher.

**No Codex CLI:** use a mesma pasta `pacotes/skill/aula-usp/`, carregada da forma que a sua versão do Codex aceita skills ou instruções de projeto. O aceite da fase 1 rodou assim, e a forma de carregar é registrada em `tests/aceite/roteiro.md`.

**Sem terminal:** o claude.ai e o ChatGPT não carregam skills. Para eles existem os pacotes `pacotes/claude/projeto/` (instruções e arquivos de um Projeto) e `pacotes/gpt/gpt-personalizado/` (instruções e conhecimento de um GPT personalizado). Os dois já têm os modos de escrever e de avaliar.

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
aula-usp validar <pasta> [--json]
```

Roda as regras estáticas e de carga e, havendo Chrome, as de composição. Saída 0 sem erros, 1 com erros de validação, 2 com falha de ambiente. Falta de Chrome não é falha: vira aviso e pula a composição.

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
guia/                    o guia do autor, 18 arquivos, com as fontes dos pacotes em guia/pacotes/
pacotes/                 os 4 pacotes para agentes e a skill de avaliar, 56 arquivos, gerados por `aula-usp pacotes`
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

- **escrever aulas** — `guia/`, o guia do autor: layouts, componentes, matemática e código, gráficos, diagramas e demos, o que o validador cobra, e um arquivo por fluxo de trabalho (terminal, chat, artifact do Claude, GPT personalizado). Para trabalhar com um agente, os pacotes prontos estão em `pacotes/`, inclusive a skill de avaliar;
- **desenvolver o sistema** — `AGENTS.md`, que é onde estão a fronteira do Node, as guardas dos artefatos gerados, como se acrescenta uma regra e o que este projeto já aprendeu errando.

A spec é a autoridade sobre os dois: `docs/superpowers/specs/2026-09-14-aula-usp-design.md`, e, para avaliar, corrigir e gerar aulas, `docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md`.

## Processo

Cada marco tem uma spec, um plano com o código verificado antes de ser escrito, execução por subagentes com revisão por tarefa, uma revisão final e uma rodada de correção. Os planos ficam em `docs/superpowers/plans/` e as revisões finais em `docs/superpowers/revisoes/`, cada uma com uma seção em português sobre o que foi feito depois dela.

Não há CI: quem roda os testes antes de commitar é quem commita.

## Licença

O código é MIT (`LICENSE`). A licença não cobre as marcas de `assets/marcas/`, que pertencem à USP e às unidades e seguem as regras de identidade visual de cada instituição, nem as fontes de `assets/fontes/`, que seguem a SIL OFL, com os textos em `assets/fontes/licencas/`.
