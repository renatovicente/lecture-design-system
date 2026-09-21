# Roteiro de aceite (spec 11.3)

> **A fase 1 deste roteiro foi rodada em 2026-09-21, sobre o sistema em `e9a1a70`, e os dois
> ambientes passaram.** A tabela da fase 3 continua vazia: ela depende da publicação no npm e da tag
> da CDN resolvendo, que é a fase 3 da spec 12. Escrever este roteiro foi o marco 6c; rodar a fase 1
> dele foi o **marco 7**, e com ele a fase 1 do projeto fecha.

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

- `pacotes/skill/aula-usp/` — **21 arquivos**: o `SKILL.md`, os onze `references/`, os dois
  `assets/` e o acervo que o guia manda abrir, que o pacote passou a levar (`contrato/contrato.json`
  e os seis decks de `especime/`);
- a CLI no PATH, por `npm link` no repositório do sistema.

**Nada mais deste repositório.** Nem `guia/`, nem `exemplos/`, nem o `AGENTS.md`, e nem as pastas
`contrato/` e `especime/` do repositório — o que o agente tem delas é a cópia que viaja **dentro**
do pacote, e é dessa cópia que o aceite mede. Se o agente puder ler o repositório, o aceite deixa de
medir o pacote e passa a medir o repositório — que é justamente o que quem instala a skill não vai
ter. Por isso a aula se escreve **fora** da árvore do sistema, numa pasta própria.

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

- **responder as cinco metas do `<head>` não conta como ajuda.** Unidade, disciplina, número da
  aula, data e professor são dados do autor, não informação sobre o sistema: se o agente parar e
  perguntar, responda; onde a execução não admitir resposta no meio — um `exec` de uma volta só —,
  forneça as cinco ao lado do pedido e registre que foi assim. Um agente que não pergunta, deixa o
  texto de exemplo do esqueleto e diz na entrega o que falta preencher também está seguindo o
  `SKILL.md` (passo 3): as duas saídas são conformes, e qual delas você viu é observação sobre o
  ambiente, não achado contra o agente;
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
| Claude Code | 2026-09-21 | `e9a1a70` | Opus 5 | 0 | — | 0 | 1 | aprovada |
| Codex CLI | 2026-09-21 | `e9a1a70` | `codex-cli` 0.155.1, `gpt-5.6-sol` | 0 | — | 0 | 1 | aprovada |

**Os dois ambientes passaram o critério inteiro da spec 11.3**: zero erros em até três rodadas, mais
a revisão visual do autor, que aprovou os dois PDFs. As aulas produzidas estão em `aulas/`, e a saída
de `--json` de cada rodada em `rodada-<ambiente>-1.json` — as duas com array vazio.

> **A tag do runtime dessas duas aulas é a de `e9a1a70`, e fica como está.** O `integrity` delas
> (`sha384-r5XJHUJ4P95y…`) era o de `aula-usp.js` até o marco do SRI dos satélites, que mudou os bytes
> do pacote; o manifesto de hoje registra `sha384-dAAkK0S84e8o…`. Quando a CDN resolver (fase 3), o
> navegador vai **recusar** o runtime ao abrir essas duas páginas, e isso não é defeito: elas são
> registro datado do aceite, não aula viva. Reescrevê-las seria reescrever história; quem precisar
> abrir uma delas funcionando faz isso numa cópia fora daqui, com o `integrity` que
> `dist/manifesto.json` registra na versão do dia.

As medições da tabela foram refeitas por quem conduziu o aceite, **com Chrome presente e os quatro
grupos de regras rodando**, sobre o arquivo que cada agente entregou. Ambas as aulas: 13 slides, três
blocos, derivação em passos, um bloco de Python, um exercício e notas em 8 slides. PDF de 17 páginas
(Claude Code) e 18 (Codex CLI).

> **Ressalva sobre a coluna "rodadas até zero", e é achado sobre este roteiro.** Ele modela uma
> rodada como "o agente entrega → o condutor valida → os achados voltam". Mas os dois agentes tinham
> a CLI no PATH e rodaram o validador **sozinhos**, que é justamente o laço que `70-fluxo-terminal.md`
> ensina. Nenhum dos dois precisou de uma rodada de correção do condutor — daí o 1 — e a coluna
> "erros da 1ª versão" marca 0 porque a primeira versão *declarada pronta* já vinha limpa. **O número
> esconde o que interessa:** o que cada agente tropeçou no meio só apareceu porque lhes foi pedido,
> fora do roteiro, que relatassem o que procuraram e não acharam. Uma próxima versão deste roteiro
> deve pedir isso na tabela.

### Claude Code — observações

- **como a skill foi carregada:** `pacotes/skill/aula-usp/` copiado para `.claude/skills/aula-usp/`
  numa pasta de trabalho vazia fora do repositório; a skill foi apresentada ao agente pelo nome e
  pela descrição do frontmatter, como o harness a apresenta. O agente foi instruído a não abrir
  `~/Projects/lecture-design-system`, e relatou não tê-lo aberto.
- **o que o agente fez sem ser mandado:** usou `afirmacao` e `figura`, layouts que o pedido não
  menciona; gerou a figura em SVG com `python3`/numpy; e conferiu o próprio resultado rasterizando o
  PDF com `pdftoppm`, por não haver no guia um jeito de um agente ver o que escreveu.
- **o que ele procurou no pacote e não achou:** (1) **o limite de título da capa** — `limites.titulo`
  é a única regra de `limites.*` cujo texto de conserto não traz número, e o único exemplo de mensagem
  no guia mostra `(máx. 50)`, que é o do `h2`; foi o primeiro erro que levou. (2) **os orçamentos de
  palavras** (`limites.palavras-corpo`, `limites.palavras-coluna`, `limites.metadado`), que não
  aparecem em nenhum dos onze arquivos — escreveu por imitação da densidade de `assets/exemplo.html`.
  (3) **`contrato/contrato.json`**, citado quinze vezes como autoridade e que não viaja no pacote.
  (4) **uns trinta ponteiros** para `especime/…` e `exemplos/…`, endereços mortos para quem só tem a
  skill. (5) **como um agente confere o slide que escreveu** — o guia manda `aula-usp servir`, que
  pressupõe um humano olhando.
- **o que decidiu sem o pacote dizer:** as cinco metas do `<head>` (o passo 3 do `SKILL.md` manda
  *perguntar*, e num aceite não-interativo não havia a quem); a física e os números da tabela de
  coeficientes; a geometria e a semente da figura.
- **observações visuais do autor, depois do zero:** aprovado.
- **o que isto pede a `guia/`:** os achados 1 e 2 fecham juntos com uma **quinta tabela gerada**, de
  `contrato.limites` — os 33 números existem no contrato. Os achados 3 e 4 são a mesma coisa vista
  duas vezes: **o guia foi escrito por quem está dentro do repositório, para um leitor que está
  fora**; ou o pacote leva o que cita, ou o guia para de citar como se o leitor tivesse. O achado 5
  pede um caminho de conferência que não dependa de olho humano.

### Codex CLI — observações

- **como a skill foi carregada:** o Codex descobre contexto por `AGENTS.md`, não por `SKILL.md`, e
  não há convenção de skill equivalente. O pacote foi montado numa pasta de trabalho vazia fora do
  repositório com `references/` e `assets/` na raiz e o `SKILL.md` copiado como `AGENTS.md` — as
  mesmas catorze arquivos do outro ambiente, descobertos pelo mecanismo nativo. Rodado com
  `codex exec --sandbox workspace-write`. **Registre o binário, não o nome:** havia dois `codex` na
  máquina, e o que o PATH resolvia (0.142.4, standalone) é velho demais para o modelo da conta; o
  aceite rodou com `/opt/homebrew/bin/codex` 0.155.1, instalado pelo npm.
- **o que o agente fez sem ser mandado:** **parou e perguntou as cinco metas**, em vez de inventá-las
  — que é o que o passo 3 do `SKILL.md` manda. Só entregou a aula depois de respondidas. Ficou nos
  quatro layouts essenciais, sem explorar `afirmacao` nem `figura`.
- **o que ele procurou no pacote e não achou:** nada foi relatado; a execução não foi instrumentada
  para isso, ao contrário da do Claude Code. É uma lacuna desta rodada do aceite, não um resultado.
- **o Chrome não subiu no sandbox dele**, então a CLI degradou com aviso e pulou composição e PDF
  (spec 8.1). O agente trabalhou com **três dos quatro grupos** de regras — e a aula passou nos
  quatro quando o condutor a validou. É evidência a favor do pacote: ele ensina a escrever certo sem
  depender de o validador pegar depois.
- **observações visuais do autor, depois do zero:** aprovado.
- **o que isto pede a `guia/`:** a divergência com o outro ambiente é o achado mais útil desta rodada,
  e **nenhum dos dois agentes errou**. O `SKILL.md` desenha uma interação com pergunta; este roteiro
  manda "entregue o pedido, uma vez, e não ajude". Num aceite não-interativo, um agente que segue o
  pacote à risca **não entrega nada**. É uma junta entre dois artefatos deste repositório que ninguém
  tinha testado, porque até aqui não havia consumidor real. Ou o `SKILL.md` prevê o caso sem autor à
  mão, ou o roteiro prevê a resposta às metas como parte da preparação.

> **Resolvido depois desta rodada**, e a anotação fica aqui para quem ler os achados: consertou-se o
> lado do `SKILL.md`, não o do roteiro. O motivo é que o caso não é do aceite — quem instala a skill
> e pede uma aula por script está na mesma posição do condutor não-interativo, e consertar o roteiro
> fecharia o aceite deixando esse leitor com o mesmo impasse. A saída não precisou ser inventada:
> `aula-usp novo` já deixa `disciplina`, `aula` e `professor` com o texto de exemplo do modelo, e o
> passo 3 passou a mandar o agente fazer o mesmo e dizer na entrega o que o autor precisa trocar.
> O roteiro ganhou, na seção "Como rodar", que responder as cinco metas não conta como ajuda.

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
