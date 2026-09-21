# Aula USP

Design system de aulas em HTML para a USP — pensado para ser escrito por um agente (Claude, GPT, Codex) e conferido por um validador, não para ser diagramado à mão.

Uma aula é **um arquivo HTML**. Sem framework, sem build para abrir, sem PowerPoint. O autor escreve `<section data-layout="conteudo">` com texto, matemática e código; o sistema monta o slide, o motor navega, e o validador acusa o que fugiu do contrato — no terminal e num painel dentro da própria aula.

Feito para o IME-USP e o IFUSP, com a identidade visual da USP.

## Estado

**Fase 1 completa: os sete marcos.** O aceite foi rodado em 2026-09-21 e os dois ambientes passaram.

| | |
|---|---|
| Layouts | os 7 do contrato: `capa`, `abertura`, `conteudo`, `afirmacao`, `figura`, `demo`, `encerramento` |
| Motor | navegação, passos revelados, notas do apresentador, visão geral, ajuda, janela do apresentador, impressão |
| Componentes | campos, exercício, listas, tabela, figura, código com destaque (Shiki), matemática (KaTeX, com `\passo`) |
| Validador | as **60 regras da fase 1, todas implementadas**: 47 estáticas, 4 de carga, 5 de composição e 4 de saída |
| CLI | os **6 comandos** da spec 8.1 |
| Guia e pacotes | 11 arquivos de guia do autor e 4 pacotes montados a partir deles, para Claude, GPT e um repositório de disciplina |
| Testes | **472 unitários** (38 arquivos; 36 sem navegador, e 2 que sobem um Chrome de verdade) e **202 de integração** (22 arquivos, em Chrome de verdade), zero pulos |

## O que ainda não existe

Quatro coisas, e nenhuma delas é detalhe de acabamento.

**A fase 2: gráficos, diagramas e controles de demo.** `contrato.json` já traz as 4 regras da fase 2, e **nenhuma está implementada**. Na prática, `figure.grafico` e `figure.diagrama` são **recusados** hoje — `guia/50-graficos-diagramas-demos.md` mede o que acontece com quem tentar, erro por erro, e diz o que fazer no lugar. Junto com elas vêm a captura automática de demos no PDF e o `aula-usp.mplstyle`.

**A publicação no npm.** `npm install -g aula-usp` **não funciona**: o pacote não está publicado. Hoje a CLI se instala com `npm link` neste repositório, e é assim que os pacotes para agentes descrevem a instalação.

**A tag do runtime resolvendo.** O modelo, a aula-exemplo, os decks do espécime e os quatro pacotes já trazem a tag com a versão exata e o `integrity` reais — **o endereço é que ainda não resolve**, pela mesma razão acima. Nos fluxos com terminal isso não muda nada: `aula-usp servir` troca a tag pelo runtime local e `aula-usp build` a troca pelo motor embutido, e os dois a reconhecem pelo `src` terminado em `/aula-usp.js`. O que não funciona até a publicação é abrir o HTML do modelo direto no navegador, com dois cliques.

**O aceite.** `tests/aceite/roteiro.md` fixa o pedido, os ambientes e o critério — zero erros em até três rodadas mais a revisão visual do autor — e traz os resultados da fase 1, rodada em 2026-09-21: **Claude Code e Codex CLI passaram os dois**, cada um com apenas o pacote da skill. As aulas que produziram estão em `tests/aceite/aulas/`. A tabela da fase 3 continua vazia, e depende da publicação.

## Os comandos

Antes da publicação, `npm link` põe `aula-usp` no PATH.

```bash
aula-usp novo <pasta> --unidade ime
```

Copia `modelos/aula/` para uma pasta nova, preenchendo as duas metas que o comando sabe: `unidade`, da opção, e `data`, de hoje. As outras três — `disciplina`, `aula` e `professor` — ficam com o texto de exemplo do modelo, de propósito: um valor inventado para `professor` seria pior que um lugar visivelmente vazio. A unidade tem de ser `ime` ou `ifusp`, e uma pasta que já tenha conteúdo não é sobrescrita.

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

Os dois últimos são manutenção do sistema, não de uma aula: `dist` regenera `validador/cobertura.json` e os 12 arquivos versionados de `dist/`; `pacotes` fixa a tag do runtime, gera o guia e monta `pacotes/`, nessa ordem, conferindo os limites da spec 11.1.

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

Para ver o sistema funcionando, sirva o espécime — os seis decks que exercitam todos os layouts e componentes:

```bash
npm run servir -- especime
```

## Como está organizado

```
contrato/contrato.json   o contrato como DADO: layouts, vocabulário, papéis, 33 limites e as 64 regras
tokens/                  fonte única dos tokens (DTCG); estilos/tokens.css é gerado daqui
estilos/                 base, layouts, componentes, motor, impressão
montar/                  transforma o fonte do autor no slide montado
motor/                   navegação, passos, notas, apresentador, painéis, impressão
componentes/             matemática (KaTeX) e código (Shiki), nos dois modos
validador/               validar.js e regras/*.js — executam o contrato, não o repetem
build/                   glue de Node: servir, validar, construir, PDF, empacotar
dist/                    o runtime versionado: 12 arquivos, gerados por `aula-usp dist`
guia/                    o guia do autor, 11 arquivos, e em pacotes/ os 5 fontes dos pacotes
pacotes/                 os 4 pacotes para agentes, 25 arquivos, gerados por `aula-usp pacotes`
modelos/aula/            o esqueleto que `aula-usp novo` copia
exemplos/                a aula-exemplo: descida do gradiente
especime/                seis decks que exercitam tudo
tests/                   unit/, integracao/, fixtures/ e o roteiro de aceite
docs/superpowers/        a spec, os planos de cada marco e as revisões finais
```

Uma divisão importa mais que as outras: **`montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node** — rodam no navegador. Só `bin/` e `build/` são Node. É o que permite a mesma regra rodar no painel dentro da aula e na linha de comando.

Seis artefatos são **gerados e versionados**, cada um com uma guarda que falha se o arquivo em disco divergir do gerador: `estilos/tokens.css` e `tokens/tokens.js`, `estilos/fontes.css`, `validador/cobertura.json`, `dist/`, os blocos gerados de quatro arquivos do `guia/`, e `pacotes/`.

### O contrato é dado, não código

As 64 regras vivem em `contrato/contrato.json` com severidade, grupo, fase e o texto da ação — 60 da fase 1 e 4 da fase 2. O código executa o contrato; não o restata. Mudar um limite é editar um número em JSON, e há testes que falham se o código e o contrato discordarem.

### As regras rodam em quatro grupos

| grupo | sobre o quê | quando | quantas |
|---|---|---|---|
| estáticas | o fonte do autor | antes de montar | 47 |
| carga | o fonte, depois de bibliotecas, imagens e scripts carregarem | depois do `load` | 4 |
| composição | o documento montado e renderizado | medido no Chrome, antes do motor iniciar | 5 |
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

- **escrever aulas** — `guia/`, os onze arquivos do guia do autor: layouts, componentes, matemática e código, o que o validador cobra, e um arquivo por fluxo de trabalho (terminal, chat, artifact do Claude, GPT personalizado). Para trabalhar com um agente, os quatro pacotes prontos estão em `pacotes/`;
- **desenvolver o sistema** — `AGENTS.md`, que é onde estão a fronteira do Node, as guardas dos artefatos gerados, como se acrescenta uma regra e o que este projeto já aprendeu errando.

A spec é a autoridade sobre os dois: `docs/superpowers/specs/2026-09-14-aula-usp-design.md`.

## Processo

Cada marco tem uma spec, um plano com o código verificado antes de ser escrito, execução por subagentes com revisão por tarefa, uma revisão final e uma rodada de correção. Os planos ficam em `docs/superpowers/plans/` e as revisões finais em `docs/superpowers/revisoes/`, cada uma com uma seção em português sobre o que foi feito depois dela.

Não há CI: quem roda os testes antes de commitar é quem commita.

## Licença

As fontes em `assets/fontes/` são de terceiros e vêm com as licenças OFL em `assets/fontes/licencas/`. As marcas da USP e das unidades seguem as regras de identidade visual da universidade.
