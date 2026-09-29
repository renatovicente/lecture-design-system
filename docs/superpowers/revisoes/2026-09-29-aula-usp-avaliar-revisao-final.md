# Revisão final — avaliar (1.1.0)

Branch `worktree-agent-ace8c48e6fcf4033b`, de `fd3c8fd` ao commit da correção. Plano: `docs/superpowers/plans/2026-09-28-aula-usp-avaliar.md`. Spec: `docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md`.

## O que a branch entrega

- **A rubrica como dado,** em `avaliador/rubrica.json`: 17 critérios, 9 medidos e 8 julgados, conferidos contra uma tabela copiada da spec.
- **`avaliador/`,** do lado do navegador e sem `node:`, com os critérios medidos e um par de fixtures por critério.
- **O comando `aula-usp avaliar`,** com `--slide`, `--minutos`, `--fotos` e `--json`. Sai com 0 ou 2, nunca com 1.
- **A skill `aula-usp-avaliar`,** o capítulo 80 do guia (as tabelas geradas da rubrica) e os modos curtos no claude.ai e no GPT. O `instrucoes.txt` tem 6.304 caracteres de 8.000.
- **Versão 1.1.0.**

## A revisão

- **Important, corrigido:** `so-texto` dava ALERTA falso nas duas aulas-exemplo, e o aceite exige "nenhuma falsa grave no exemplo".
  - **Na regressao-linear,** o critério só contava slides de `conteudo`, e ela tem gráfico, diagrama e demo em slides de `figura` e `demo`.
  - **Na descida-do-gradiente,** `#derivacao` é toda em matemática em linha, que o critério não contava como visual.

  A correção passou para a rubrica: os `layouts` agora são `conteudo`, `figura` e `demo`, e os `visuais` ganharam `tex-em-linha`. A spec foi atualizada. A guarda nova, "nenhum alerta numa aula-exemplo", foi invertida com a rubrica antiga e derrubou as duas.
- **Minor, corrigido:** `credito` cobrava crédito de `svg` desenhado pelo autor e gerava ruído no espécime. As figuras que pedem crédito agora vêm da rubrica (`figure.grafico` e `figure:has(> img)`). A fixture boa, que usava `svg`, tinha virado vácua; as duas fixtures passaram a usar gráfico com dados. Inversão: sem o crédito na legenda, o conselho volta.
- **Aceitas como estão:**
  - `paineis` mede mais de uma figura por slide, porque o contrato já proíbe duas imagens numa `figure`;
  - `--json` sai como `{ achados, resumo }`, como no plano;
  - os julgados de N ficam em `alerta`, e os só de U em `conselho`.

## Medido depois da correção

| aula | resultado |
|---|---|
| descida-do-gradiente | 0 achados |
| regressao-linear | 2 conselhos: `palavras-slide` em `#reta`, com 67 palavras, e `credito` em `#dispersao` |
| modelo | 1 alerta `so-texto`, justo: é texto de exemplo |

`npm test` 693/693, `npm run test:integracao` 268/268.

## Aberto

O roteiro de aceite `tests/aceite/avaliar.md` é do autor: a parte julgada da skill só se prova rodando.
