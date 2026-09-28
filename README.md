# Aula USP

Design system de aulas em HTML para a USP — pensado para ser escrito por um agente (Claude, GPT, Codex) e conferido por um validador, não para ser diagramado à mão.

Uma aula é **um arquivo HTML**. Sem framework, sem build para abrir, sem PowerPoint. O autor escreve `<section data-layout="conteudo">` com texto, matemática e código; o sistema monta o slide, o motor navega, e o validador acusa o que fugiu do contrato — no terminal e num painel dentro da própria aula.

Feito para o IME-USP e o IFUSP, com a identidade visual da USP.

## Estado

**Fases 1 e 2 completas; a fase 3, a publicação, em andamento.**

| | |
|---|---|
| Layouts | os 7 do contrato: `capa`, `abertura`, `conteudo`, `afirmacao`, `figura`, `demo`, `encerramento` |
| Motor | navegação, passos revelados, notas do apresentador, visão geral, ajuda, janela do apresentador, impressão |
| Componentes | campos, exercício, listas, tabela, figura, código com destaque (Shiki), matemática (KaTeX, com `\passo`) |
| Recursos visuais | gráficos (`linha`, `barras`, `dispersao`, `histograma`), diagramas em DOT desenhados pelo Graphviz, controles de demo, e a foto automática das demos no PDF |
| Validador | as **65 regras do contrato, todas implementadas**: 48 estáticas, 7 de carga, 6 de composição e 4 de saída |
| Canto do vídeo | com `<meta name="video" content="canto">` (1.0.1), o canto inferior direito, 334 × 188 px, fica reservado ao vídeo do ministrante que o OBS, o Zoom ou o Meet sobrepõem: o cromo recua, e `composicao.canto-video` acusa o conteúdo que entrar lá |
| CLI | os **6 comandos** da spec 8.1 |
| Guia e pacotes | 16 arquivos de guia do autor e 4 pacotes montados a partir deles, para Claude, GPT e um repositório de disciplina |

O aceite da fase 1 foi rodado em 2026-09-21, com Claude Code e Codex CLI, e os dois passaram. O da fase 2 está em `docs/superpowers/revisoes/2026-09-28-aula-usp-fase2-aceite.md`. O da fase 3 (claude.ai e ChatGPT) depende da publicação: `tests/aceite/roteiro.md` fixa o pedido e o critério.

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
