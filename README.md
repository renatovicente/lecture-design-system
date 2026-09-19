# Aula USP

Design system de aulas em HTML para a USP — pensado para ser escrito por um agente (Claude, GPT, Codex) e conferido por um validador, não para ser diagramado à mão.

Uma aula é **um arquivo HTML**. Sem framework, sem build para abrir, sem PowerPoint. O autor escreve `<section data-layout="conteudo">` com texto, matemática e código; o sistema monta o slide, o motor navega, e o validador acusa o que fugiu do contrato — no terminal e num painel dentro da própria aula.

Feito para o IME-USP e o IFUSP, com a identidade visual da USP.

## Estado

**Fase 1, marcos 1 a 4 prontos e integrados.** O que funciona hoje:

| | |
|---|---|
| Layouts | `capa`, `abertura`, `conteudo`, `afirmacao`, `figura`, `demo`, `encerramento` |
| Motor | navegação, passos revelados, notas do apresentador, visão geral, ajuda, janela do apresentador, impressão |
| Componentes | campos, exercício, listas, tabela, figura, código com destaque (Shiki), matemática (KaTeX, com `\passo`) |
| Validador | **55 das 56 regras** da fase 1: estrutura, vocabulário, limites, carga e composição |
| Testes | 341 unitários e 99 de integração, estes últimos em Chrome de verdade |

**O que ainda não existe:** `aula-usp build`, `aula-usp dist`, o PDF e o HTML autocontido (marco 5); o guia do autor e os pacotes para agentes (marco 6). A regra `matematica.simbolo-fora-do-tex` está adiada para o marco 5, porque depende da cobertura de glifos que o `dist` gera.

## Comandos

Hoje a CLI tem dois comandos. Antes da publicação no npm, `npm link` põe `aula-usp` no PATH.

```bash
aula-usp servir <pasta> [--porta 8765]
```

Serve a aula com o runtime local e abre o modo navegador. É como se escreve uma aula: salvar o arquivo e recarregar.

```bash
aula-usp validar <pasta> [--json]
```

Roda as regras estáticas e de carga e, havendo Chrome, as de composição. Saída 0 sem erros, 1 com erros de validação, 2 com falha de ambiente. Falta de Chrome não é falha: vira aviso e pula a composição.

```
ERRO · slide 7 #culpa · limites.titulo · título com 62 caracteres num segmento (máx. 50). Corte ou divida em dois slides.
AVISO · slide 12 #residuos · estrutura.notas-ausentes · slide sem notas do apresentador. Acrescente <aside class="notas">.
```

`--json` dá a mesma lista como objetos, para um agente consumir.

## Como rodar aqui

Precisa de Node 20.6 ou superior e do Google Chrome instalado (o `playwright-core` usa o Chrome do sistema; não baixa navegador).

```bash
npm install
```

```bash
npm test
```

Os testes de integração abrem o Chrome e são pesados; rode **um arquivo por vez**:

```bash
node --test tests/integracao/composicao.test.mjs
```

Para ver o sistema funcionando, sirva o espécime — o deck que exercita todos os layouts e componentes:

```bash
npm run servir -- especime
```

## Como está organizado

```
contrato/contrato.json   o contrato como DADO: layouts, vocabulário, papéis, limites e as 64 regras
tokens/                  fonte única dos tokens (DTCG); estilos/tokens.css é gerado daqui
estilos/                 base, layouts, componentes, motor, impressão
montar/                  transforma o fonte do autor no slide montado
motor/                   navegação, passos, notas, apresentador, painéis, impressão
componentes/             matemática (KaTeX) e código (Shiki), nos dois modos
validador/               validar.js e regras/*.js — executam o contrato, não o repetem
build/                   glue de Node: servir, validar, carregar, composição
especime/                seis decks que exercitam tudo
tests/                   unit/, integracao/, fixtures/
docs/superpowers/        a spec, os planos de cada marco e as revisões finais
```

Uma divisão importa mais que as outras: **`montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node** — rodam no navegador. Só `bin/` e `build/` são Node. É o que permite a mesma regra rodar no painel dentro da aula e na linha de comando.

### O contrato é dado, não código

As 64 regras vivem em `contrato/contrato.json` com severidade, grupo, fase e o texto da ação. O código executa o contrato; não o restata. Mudar um limite é editar um número em JSON, e há testes que falham se o código e o contrato discordarem.

### As regras rodam em quatro grupos

| grupo | sobre o quê | quando |
|---|---|---|
| estáticas | o fonte do autor | antes de montar |
| carga | o fonte, depois de bibliotecas, imagens e scripts carregarem | depois do `load` |
| composição | o documento montado e renderizado | medido no Chrome, antes do motor iniciar |
| saída | o HTML e o PDF finais | marco 5 |

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

O guia do autor, com todos os layouts e limites, vem no marco 6.

## Processo

Cada marco tem uma spec, um plano com o código verificado antes de ser escrito, execução por subagentes com revisão por tarefa, uma revisão final e uma rodada de correção. Os planos ficam em `docs/superpowers/plans/` e as revisões finais em `docs/superpowers/revisoes/`, cada uma com uma seção em português sobre o que foi feito depois dela.

A spec é a autoridade: `docs/superpowers/specs/2026-09-14-aula-usp-design.md`.

## Licença

As fontes em `assets/fontes/` são de terceiros e vêm com as licenças OFL em `assets/fontes/licencas/`. As marcas da USP e das unidades seguem as regras de identidade visual da universidade.
