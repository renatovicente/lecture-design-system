# Roteiro de aceite: a skill de avaliar (1.1.0)

> **Ainda não rodado.** Escrever este roteiro é a Tarefa 4 do plano
> `docs/superpowers/plans/2026-09-28-aula-usp-avaliar.md`; rodá-lo é do autor, no Claude Code, antes da
> publicação da 1.1.0.

Os testes medem os critérios **medidos** — a linha de comando conta palavras, itens e figuras, e as
fixtures de `tests/fixtures/avaliador/` provam cada um. Os critérios **julgados** (uma ideia por
slide, título que afirma, gráfico que leva a mensagem…) não têm teste automático, e é por eles que
este roteiro existe (spec 2026-09-28, seção 8): **um agente que só tem a skill julga uma aula do jeito
que um professor julgaria?**

## A condição

O agente tem, e **só**:

- `pacotes/skill/aula-usp-avaliar/` — o `SKILL.md`, `references/rubrica.json` e
  `references/80-avaliar-corrigir-gerar.md`;
- a CLI no PATH, por `npm link` no repositório do sistema, na versão desta árvore;
- o Chrome instalado, para `--fotos`.

Nada mais deste repositório. As duas aulas se avaliam **fora** da árvore do sistema, numa pasta
própria, pela mesma razão do roteiro da fase 1 (`tests/aceite/roteiro.md`): um agente que pode ler o
repositório não mede a skill.

## Preparação

1. No repositório do sistema, com a árvore limpa: `npm install`, `npm link`, `aula-usp pacotes`. O
   terceiro não pode produzir diff.
2. Numa pasta fora do repositório, por exemplo `~/aceite-avaliar/`:
   - copie `exemplos/descida-do-gradiente/` para `~/aceite-avaliar/descida-do-gradiente/`;
   - copie `tests/aceite/aulas/ruim-para-avaliar/` para `~/aceite-avaliar/ruim-para-avaliar/`.

   A tag do runtime das duas não precisa resolver fora do repositório: `aula-usp avaliar --fotos`
   serve a aula com o runtime local, como `aula-usp servir`.
3. Instale a skill: copie `pacotes/skill/aula-usp-avaliar/` para a pasta de skills do Claude Code
   (`~/.claude/skills/aula-usp-avaliar/`), abra o Claude Code em `~/aceite-avaliar/` e confira que
   `aula-usp-avaliar` aparece na lista de skills.

## Os pedidos

Literais, um por sessão nova. Não acrescente nada: nem o nome de um critério, nem "use a rubrica".

> Avalie a aula em `descida-do-gradiente/`. A aula tem 50 minutos.

> Avalie a aula em `ruim-para-avaliar/`.

## O que a skill tem de fazer, nos dois

- rodar `aula-usp avaliar` com `--json` e `--fotos` (e `--minutos 50` no primeiro);
- olhar as fotos, slide a slide;
- escrever `avaliacao.md` na pasta da aula, com o resumo no topo e uma tabela por slide (critério,
  fonte, nível, evidência, sugestão);
- **não** mudar o `index.html` — confira com `git diff --no-index` contra a cópia, ou com a data do
  arquivo;
- oferecer, no fim, aplicar as sugestões que o autor aceitar.

## O critério de aceite

**Na aula ruim**, que valida limpa (`aula-usp validar`: 0 erros, 0 avisos), a avaliação tem de apontar
as quatro quebras que ela carrega de propósito:

| quebra | onde | como aparece |
|---|---|---|
| N1, uma ideia por slide | `#dois-assuntos` (slide 4) | julgado: `uma-ideia` em alerta, a evidência nomeando as duas ideias (o erro e a semente) |
| N3, título que é rótulo | `#introducao` (3) e `#resultados` (7) | medido: `titulo-rotulo` nos dois; e `titulo-conclusao`, julgado, no mesmo sentido |
| N6, aula só de texto | a aula inteira | medido: `so-texto`, 4 de 5 slides de conteúdo |
| U, lista longa | `#passos` (6) | medido: `itens` e `revelacao`, os dois em conselho |

Faltar qualquer uma das quatro reprova.

**Na aula-exemplo**, nenhum achado falso grave: nenhum `alerta` julgado sem evidência que o autor
reconheça no slide. Os medidos de hoje, conferidos na execução do plano, são **um alerta** de
`so-texto` (4 de 6 slides de conteúdo, `#superficie`, `#derivacao`, `#taxa` e `#exercicio`) e nada
mais, com ou sem `--minutos 50`. Esse alerta é discutível — `#derivacao` é uma derivação com
matemática em linha, que a rubrica não conta como figura —, e a skill passa se o disser na evidência
em vez de pedir para trocar a derivação por uma figura.

Em qualquer das duas, reprova:

- chamar um achado de **erro**;
- editar a aula;
- julgar um slide sem ter aberto a foto dele (a evidência tem de citar o que se vê no slide).

## Rodadas

| data | sistema em | ambiente | aula ruim: quebras apontadas | exemplo: falsos graves | resultado |
|---|---|---|---|---|---|
| | | Claude Code | | | |
