# Roteiro de aceite (spec 11.3)

> **Este roteiro ainda não foi rodado.** As tabelas de resultado abaixo estão vazias — os travessões
> são lugares vazios, não medições. Rodá-lo é o **marco 7**; escrevê-lo foi o 6c.

O aceite é a única prova que o resto da suíte não dá: os testes unitários e os de integração medem o
sistema contra si mesmo, e nenhum deles responde à pergunta que importa — **um agente que só tem o
pacote consegue escrever uma aula que passa?**

---

## O pedido

É literal, e o mesmo nos dois ambientes. Não acrescente nada a ele: nem o nome de um layout, nem um
limite, nem "use o guia". O que o agente não souber, ele tem de achar no pacote.

> Faça uma aula de 10 a 14 slides sobre passeio aleatório e difusão para a graduação, com três
> blocos, uma derivação passo a passo, um trecho de Python e um exercício

O tema não coincide com nenhum exemplo dos pacotes — a aula-exemplo é sobre descida do gradiente —,
e isso é de propósito: um tema coberto pelos exemplos mediria a cópia, não a compreensão.

## Os ambientes

A spec 11.3 divide o aceite em duas fases, e **só a primeira cabe neste repositório hoje**.

| fase | ambiente | o que ainda falta |
|---|---|---|
| 1 | Claude Code | — |
| 1 | Codex CLI | — |
| 3 | claude.ai: Projeto e artifact | o runtime publicado no npm e a tag da CDN resolvendo |
| 3 | ChatGPT: GPT personalizado | idem |

Os dois da fase 3 usam o mesmo pedido e o mesmo critério, com `pacotes/claude/projeto/` e
`pacotes/gpt/gpt-personalizado/` no lugar da skill. Eles entram neste arquivo quando a publicação
acontecer (spec 12); até lá, a tag que o modelo e os pacotes carregam não resolve, e nada nesses dois
ambientes carrega o sistema.

## A condição, que é o que o aceite mede

Em cada ambiente da fase 1, o agente tem, e **só**:

- `pacotes/skill/aula-usp/` — o `SKILL.md`, os onze `references/` e os dois `assets/`;
- a CLI no PATH, por `npm link` no repositório do sistema.

**Nada mais deste repositório.** Nem `guia/`, nem `especime/`, nem `exemplos/`, nem o `AGENTS.md`.
Se o agente puder ler o repositório, o aceite deixa de medir o pacote e passa a medir o repositório —
que é justamente o que quem instala a skill não vai ter. Por isso a aula se escreve **fora** da
árvore do sistema, numa pasta própria.

## Preparação

1. No repositório do sistema, com a árvore limpa: `npm install`, `npm link`, `aula-usp pacotes`.
   O terceiro não pode produzir diff — se produzir, o pacote em disco estava atrasado em relação a
   `guia/`, e o aceite mediria um pacote que ninguém tem.
2. `aula-usp` sem argumento responde com o uso e os seis comandos. É assim que o `SKILL.md` manda o
   agente decidir entre o modo terminal e o modo navegador; se isso falhar, o aceite não começou.
3. Uma pasta de trabalho vazia, fora do repositório.
4. `pacotes/skill/aula-usp/` copiado para onde o ambiente carrega skills. No Claude Code é
   `.claude/skills/aula-usp/` na pasta de trabalho (ou `~/.claude/skills/aula-usp/`). **No Codex CLI,
   registre na tabela como você o carregou** — a forma não foi medida neste marco, e o que o aceite
   exige é a condição da seção acima, não um caminho específico.
5. Anote o SHA do sistema e a versão do agente antes de começar. Sem os dois, o resultado não é
   reproduzível nem comparável com a próxima rodada do aceite.

## Como rodar

Entregue o pedido, uma vez, e **não ajude**. A partir daí:

- uma **rodada** é uma volta completa: o agente entrega uma versão da aula → `aula-usp validar
  <pasta>` roda sobre ela → os achados voltam para o agente, inteiros e sem tradução;
- a **primeira versão** é a primeira aula que o agente diz estar pronta. É dela que sai a coluna
  mais informativa da tabela: o que o pacote não conseguiu evitar;
- guarde a saída de `aula-usp validar <pasta> --json` de cada rodada, ao lado deste arquivo, em
  `rodada-<ambiente>-<n>.json`. A contagem da tabela sai desses arquivos, não da memória;
- o autor só entra depois do zero: a revisão visual é sobre uma aula que o validador já aprovou.

## O critério (spec 11.3)

**Zero erros em até três rodadas, mais a revisão visual do autor.** As duas metades contam:

- zero **erros**; avisos são permitidos, como em toda saída do validador (spec 8.1), mas entram na
  tabela — um aviso recorrente nos dois ambientes é sinal sobre o pacote, não sobre o agente;
- a revisão visual é do autor, em `aula-usp servir`, e é o que pega o que o validador não vê: um
  slide tecnicamente válido e ilegível, uma derivação que revela os passos na ordem errada, uma
  figura que não diz nada. Sem ela, o critério mede só metade.

Uma quarta rodada não é fracasso do agente: é achado sobre o pacote. Registre **o que faltava no
pacote**, não "o modelo errou" — o consumidor do aceite é `guia/`, e é lá que o conserto entra.

---

# Resultados

## Fase 1

| ambiente | data | sistema (SHA) | agente (versão) | erros da 1ª versão | regras citadas | avisos | rodadas até zero | revisão visual |
|---|---|---|---|---|---|---|---|---|
| Claude Code | — | — | — | — | — | — | — | — |
| Codex CLI | — | — | — | — | — | — | — | — |

**Os travessões são lugares vazios.** Nenhuma das duas linhas foi rodada; nenhum número desta tabela
foi medido. Quem rodar preenche a linha inteira, e as duas seções abaixo.

### Claude Code — observações

*(vazio: não rodado)*

- como a skill foi carregada:
- o que o agente fez sem ser mandado:
- o que ele procurou no pacote e não achou:
- observações visuais do autor, depois do zero:
- o que isto pede a `guia/`:

### Codex CLI — observações

*(vazio: não rodado)*

- como a skill foi carregada:
- o que o agente fez sem ser mandado:
- o que ele procurou no pacote e não achou:
- observações visuais do autor, depois do zero:
- o que isto pede a `guia/`:

## Fase 3

| ambiente | data | erros da 1ª versão | rodadas até zero | revisão visual |
|---|---|---|---|---|
| claude.ai — Projeto | — | — | — | — |
| claude.ai — artifact | — | — | — | — |
| ChatGPT — GPT personalizado | — | — | — | — |

**Não rodável hoje**, e não por falta de tempo: os três dependem do runtime publicado no npm e da
tag da CDN resolvendo, que são da fase 3 (spec 12). `guia/71-fluxo-chat.md`, `72-artifact-claude.md`
e `73-chatgpt.md` declaram a mesma coisa, cada um no seu leitor, e é este aceite que vai exercitá-los
pela primeira vez.
