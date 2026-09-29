# Roteiro de aceite: a skill de gerar (1.3.0)

> **Ainda não rodado.** Escrever este roteiro é a Tarefa 3 do plano
> `docs/superpowers/plans/2026-09-29-aula-usp-gerar.md`; rodá-lo é do autor, no Claude Code, antes da
> publicação da 1.3.0.

Os testes provam a parte mecânica: `aula-usp roteiro` converte um roteiro em aula de forma
determinística, recusa com a linha o que o roteiro não exprime (`tests/unit/roteiro.test.mjs`,
`tests/unit/roteiro-cli.test.mjs`), e uma aula-exemplo reescrita como roteiro volta ao mesmo HTML e
valida limpa com Chrome (`tests/integracao/roteiro.test.mjs`). O que não tem teste automático é o
julgamento (spec 2026-09-28, seção 8): **um agente que só tem as skills lê as fontes, escreve um
roteiro que respeita a rubrica, para e mostra o roteiro antes de gerar, e entrega uma aula válida,
bem avaliada e com crédito em toda figura alheia?**

## A condição

O agente tem, e **só**:

- `pacotes/skill/aula-usp-gerar/`, e as três skills que ela chama: `aula-usp`, `aula-usp-avaliar` e
  `aula-usp-corrigir`, todas de `pacotes/skill/`;
- a CLI no PATH, por `npm link` no repositório do sistema, na versão desta árvore;
- o Chrome instalado, para a composição e as fotos de `avaliar --fotos`;
- as duas fontes, na pasta de trabalho.

Nada mais deste repositório, pela mesma razão dos outros roteiros: um agente que pode ler o
repositório não mede a skill.

## Preparação

1. No repositório do sistema, com a árvore limpa: `npm install`, `npm link`, `aula-usp pacotes`. O
   terceiro não pode produzir diff.
2. Numa pasta fora do repositório, por exemplo `~/aceite-gerar/`, ponha as duas fontes, escolhidas
   pelo autor:
   - `artigo.pdf`: um artigo com pelo menos duas figuras, de preferência um com licença **não**
     aberta, para ver o aviso;
   - `beamer/`: uma apresentação Beamer antiga do autor, com o `.tex` e as figuras que ele inclui.
3. Instale as quatro skills: copie as quatro pastas de `pacotes/skill/` para `~/.claude/skills/`,
   abra o Claude Code em `~/aceite-gerar/` e confira que `aula-usp-gerar` aparece na lista de skills.

## O pedido

Literal, numa sessão nova. Não acrescente nada: nem o nome de um comando, nem "use a skill".

> Faça uma aula de 50 minutos, com 12 a 14 slides, a partir do artigo em artigo.pdf e da minha
> apresentação antiga em beamer/. Unidade ifusp, data 2026-10-05, professor Prof. Renato Vicente.
> A aula vai para a pasta aula/.

Quando a skill mostrar o roteiro, peça **uma** mudança (por exemplo, "corte o slide N"), confira que
ela mostra o roteiro de novo, e então responda "sim". Quando ela propuser correções da avaliação,
aceite as que fizerem sentido.

## O que a skill tem de fazer

- ler o artigo e o `.tex`, com um slide candidato por `frame`;
- escrever `roteiro.md` e **mostrá-lo antes de qualquer HTML**, com a conta de slides contra os 50
  minutos e a lista das figuras alheias com origem e licença;
- depois do "sim", rodar `aula-usp roteiro roteiro.md aula` e, se o roteiro tiver erro, consertá-lo e
  rodar de novo;
- completar no HTML o que o roteiro não exprime, se houver, e rodar `aula-usp validar aula` até 0
  erros;
- rodar a avaliação (`aula-usp-avaliar`), propor as correções e aplicar as aceitas com
  `aula-usp-corrigir`;
- entregar a aula, `aula/avaliacao.md` e a lista das figuras alheias com a licença de cada uma.

## O critério de aceite

A rodada passa se, e só se:

1. **O roteiro é mostrado antes do HTML.** Nenhum `aula/index.html` existe antes do "sim"; a mudança
   pedida aparece no roteiro mostrado de novo.
2. **A aula valida limpa:** `aula-usp validar aula` com 0 erros, e de 12 a 14 slides.
3. **A avaliação final não tem alerta:** `aula-usp avaliar aula --minutos 50` sem nenhuma linha
   `ALERTA` (conselhos são permitidos), e o `aula/avaliacao.md` final diz o mesmo.
4. **Toda figura alheia tem crédito:** cada figura tirada do artigo ou do Beamer tem `p.fonte` no
   slide ou legenda que diga a origem, e `aula-usp avaliar` não acusa `credito` em nenhuma delas. Se
   a licença do artigo não for aberta, a entrega avisa o autor disso.

Reprova, em qualquer caso:

- escrever o HTML antes do "sim", ou gerar sem mostrar o roteiro;
- inventar uma meta que o pedido não deu, ou uma referência que as fontes não têm;
- figura alheia sem crédito;
- entregar com erro de validação, ou com alerta na avaliação sem dizer por quê.

## Rodadas

| data | sistema em | ambiente | roteiro antes do HTML | valida limpa | sem alerta | crédito | resultado |
|---|---|---|---|---|---|---|---|
| | | Claude Code | | | | | |
