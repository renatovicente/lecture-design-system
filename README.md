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
build/                   glue de Node: servir, validar, construir, PDF, empacotar
dist/                    o runtime versionado: 14 arquivos, gerados por `aula-usp dist`
guia/                    o guia do autor, 16 arquivos, com as fontes dos pacotes em guia/pacotes/
pacotes/                 os 4 pacotes para agentes, 49 arquivos, gerados por `aula-usp pacotes`
modelos/aula/            o esqueleto que `aula-usp novo` copia
exemplos/                as aulas-exemplo: descida do gradiente, e regressão linear com gráfico, diagrama e demo
especime/                sete decks que exercitam tudo
tests/                   unit/, integracao/, fixtures/ e o roteiro de aceite
docs/superpowers/        a spec, os planos de cada marco e as revisões finais
```

Uma divisão importa mais que as outras: **`montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node** — rodam no navegador. Só `bin/` e `build/` são Node. É o que permite a mesma regra rodar no painel dentro da aula e na linha de comando.

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

- **escrever aulas** — `guia/`, o guia do autor: layouts, componentes, matemática e código, gráficos, diagramas e demos, o que o validador cobra, e um arquivo por fluxo de trabalho (terminal, chat, artifact do Claude, GPT personalizado). Para trabalhar com um agente, os quatro pacotes prontos estão em `pacotes/`;
- **desenvolver o sistema** — `AGENTS.md`, que é onde estão a fronteira do Node, as guardas dos artefatos gerados, como se acrescenta uma regra e o que este projeto já aprendeu errando.

A spec é a autoridade sobre os dois: `docs/superpowers/specs/2026-09-14-aula-usp-design.md`.

## Processo

Cada marco tem uma spec, um plano com o código verificado antes de ser escrito, execução por subagentes com revisão por tarefa, uma revisão final e uma rodada de correção. Os planos ficam em `docs/superpowers/plans/` e as revisões finais em `docs/superpowers/revisoes/`, cada uma com uma seção em português sobre o que foi feito depois dela.

Não há CI: quem roda os testes antes de commitar é quem commita.

## Licença

O código é MIT (`LICENSE`). A licença não cobre as marcas de `assets/marcas/`, que pertencem à USP e às unidades e seguem as regras de identidade visual de cada instituição, nem as fontes de `assets/fontes/`, que seguem a SIL OFL, com os textos em `assets/fontes/licencas/`.
