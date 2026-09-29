# Roteiro de aceite: a skill de corrigir (1.2.0)

> **Ainda não rodado.** Escrever este roteiro é a Tarefa 4 do plano
> `docs/superpowers/plans/2026-09-29-aula-usp-corrigir.md`; rodá-lo é do autor, no Claude Code, antes da
> publicação da 1.2.0.

Os testes provam a parte mecânica: `aula-usp slide --substituir` troca só o intervalo de bytes da
`section` (`tests/unit/secoes.test.mjs`, com todas as `section`s do espécime, dos exemplos e do
modelo), recusa o que não é uma `section` com o mesmo id (`tests/unit/slide-cli.test.mjs`), e
`validar --slide` relata só o slide pedido (`tests/unit/validar-cli.test.mjs`). O que não tem teste
automático é o julgamento (spec 2026-09-28, seção 8): **um agente que só tem a skill corrige o slide
que o autor pediu, do jeito que ele pediu, sem encostar no resto?**

## A condição

O agente tem, e **só**:

- `pacotes/skill/aula-usp-corrigir/` — o `SKILL.md` e `references/80-avaliar-corrigir-gerar.md`;
- a CLI no PATH, por `npm link` no repositório do sistema, na versão desta árvore;
- o Chrome instalado, para as fotos de `avaliar --fotos`.

Nada mais deste repositório, pela mesma razão dos outros roteiros: um agente que pode ler o
repositório não mede a skill.

## Preparação

1. No repositório do sistema, com a árvore limpa: `npm install`, `npm link`, `aula-usp pacotes`. O
   terceiro não pode produzir diff.
2. Numa pasta fora do repositório, por exemplo `~/aceite-corrigir/`:
   - copie `tests/aceite/aulas/ruim-para-avaliar/` para `~/aceite-corrigir/aula/`;
   - rode `git init` e `git add -A && git commit -m antes` dentro de `~/aceite-corrigir/aula/`: é o
     commit contra o qual cada correção se confere.

   Conferido na execução do plano, `aula-usp avaliar ~/aceite-corrigir/aula` acusa, entre outros,
   `titulo-rotulo` em `#resultados` (slide 7) e `itens` e `revelacao` em `#passos` (slide 6), e
   `aula-usp validar` dá 0 erros e 0 avisos.
3. Instale a skill: copie `pacotes/skill/aula-usp-corrigir/` para `~/.claude/skills/aula-usp-corrigir/`,
   abra o Claude Code em `~/aceite-corrigir/` e confira que `aula-usp-corrigir` aparece na lista de
   skills.

## Os pedidos

Literais, um por sessão nova, na ordem, com um commit entre um e outro (`git add -A && git commit -m
"correção N"`), para que cada diff mostre só a sua correção. Não acrescente nada: nem o nome de um
comando, nem "use a skill".

> Na aula em `aula/`, a avaliação acusou o título do slide #resultados: é rótulo. Corrija o slide.

> Na aula em `aula/`, o slide #passos tem uma lista longa que aparece de uma vez. Troque-a por passos
> revelados um a um.

> Na aula em `aula/`, o slide #dois-assuntos trata de duas coisas. Divida-o em dois.

No terceiro, a skill tem de **parar e pedir autorização** antes de acrescentar o slide. Responda "sim,
pode dividir". Se ela dividir sem perguntar, reprova.

## O que a skill tem de fazer, nos três

- ler o slide com `aula-usp slide`;
- tirar a foto de antes (`aula-usp avaliar aula --slide <alvo> --fotos aula/correcao/antes`) e a de
  depois (`… --fotos aula/correcao/depois`), e mostrar as duas;
- trocar com `aula-usp slide … --substituir` (e `--dividir` no terceiro), nunca reescrevendo o
  `index.html` inteiro por outra via;
- rodar `aula-usp validar aula --slide <alvo>` até 0 erros e, nos dois primeiros, que vêm de uma
  avaliação, `aula-usp avaliar aula --slide <alvo>`;
- não passar de 3 voltas.

## O critério de aceite

Cada correção passa se, e só se:

1. **O diff fica dentro da `section` pedida.** Duas conferências:
   - `git diff --stat` mostra só `index.html` (e as fotos em `correcao/`, se a skill as gravou dentro
     da aula);
   - pelo localizador do sistema, o texto antes do início e depois do fim da `section` é o mesmo nos
     dois lados. Da pasta `~/aceite-corrigir/aula/`, com `<sistema>` o caminho do repositório:

     ```bash
     git show HEAD:index.html > /tmp/antes.html
     node --input-type=module -e "
       const alvo = 'resultados'; // o slide pedido: resultados, passos ou dois-assuntos
       const extras = 0;          // 0 nos dois primeiros pedidos, 1 no terceiro (o slide acrescentado)
       import { readFileSync } from 'node:fs';
       import { localizarSecoes, resolverAlvo } from '<sistema>/build/secoes.mjs';
       const antes = readFileSync('/tmp/antes.html', 'utf8');
       const depois = readFileSync('index.html', 'utf8');
       const a = localizarSecoes(antes), d = localizarSecoes(depois);
       const i = resolverAlvo(a, alvo), j = resolverAlvo(d, alvo);
       const fimDepois = d[j + extras].fim;
       console.log('prefixo igual:', antes.slice(0, a[i].inicio) === depois.slice(0, d[j].inicio));
       console.log('sufixo igual:', antes.slice(a[i].fim) === depois.slice(fimDepois));
       console.log('slides:', a.length, '->', d.length);
     "
     ```

     Troque `alvo` e `extras` a cada pedido. As duas linhas têm de dar `true`; o número de slides, igual nos dois primeiros e um a mais no
     terceiro.
2. **A validação fica limpa:** `aula-usp validar aula` com 0 erros.
3. **As fotos de antes e de depois foram entregues** ao autor, as duas do slide pedido.

E, pedido a pedido:

| pedido | passa se |
|---|---|
| #resultados | o título novo afirma uma conclusão que o corpo sustenta, e `avaliar --slide resultados` não acusa mais `titulo-rotulo` |
| #passos | a lista tem `data-passo` a partir do segundo item e `avaliar --slide passos` não acusa mais `revelacao`; o conteúdo dos itens é o mesmo, sem corte feito para calar `itens` |
| #dois-assuntos | depois do sim do autor, duas `section`s no lugar de uma, a primeira com o id `dois-assuntos` e a segunda com um id novo, cada uma com uma das duas ideias |

Em qualquer dos três, reprova:

- mexer no `<head>`, nas metas ou em outro slide, ainda que para consertar algo visto de passagem;
- trocar o `id` do slide sem o autor pedir;
- acrescentar um slide sem a autorização do autor;
- entregar com erro de validação, ou sem dizer por que não convergiu.

## Rodadas

| data | sistema em | ambiente | #resultados | #passos | #dois-assuntos | resultado |
|---|---|---|---|---|---|---|
| | | Claude Code | | | | |
