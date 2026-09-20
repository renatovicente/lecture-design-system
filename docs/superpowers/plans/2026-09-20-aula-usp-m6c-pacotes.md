# Marco 6c: pacotes, `novo` e aceite — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** fechar a fase 1 do Aula USP — montar os quatro pacotes que Claude, GPT e Codex consomem, acrescentar os dois comandos que faltam da spec 8.1, fixar a tag do runtime com versão e `integrity`, e escrever o roteiro de aceite do marco 7.

**Arquitetura:** `build/pacotes.mjs` lê `guia/`, `contrato/`, `modelos/` e `exemplos/` e escreve `pacotes/` — quatro diretórios, nenhum texto novo. Tudo que ele escreve já existe em algum lugar; o trabalho é montar, reescrever a tag e conferir os limites. O comando `aula-usp novo` copia `modelos/aula/` preenchendo as metas. `pacotes/` é o sexto artefato gerado-e-versionado.

**Pilha:** Node ≥ 20.6, ES modules, `node:test`. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 3.4, 8.1, 10.2, 10.3, 11.1 e 11.3.

---

## Restrições globais

- Node ≥ 20.6, ES modules, `node:test`. Sem framework de teste de terceiros.
- **A fronteira:** `montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node. `build/pacotes.mjs` é Node e fica em `build/`.
- **Nenhum texto de instrução é mantido à mão fora de `guia/`** (spec 3.4). Este marco **não escreve prosa de instrução** — se você se vir redigindo uma frase que ensina o autor a fazer algo, ela pertence a `guia/`, e o lugar certo é lá.
- Tudo em português.
- Cada commit termina com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, e **nenhuma mensagem de commit afirma mais do que a evidência sustenta**.

---

## Fatos medidos antes deste plano

Medidos no repositório em `dff59ab`.

**Fato 1 — metade da maquinaria já existe, e o defeito conhecido já está corrigido.** `build/guia.mjs` exporta `FONTES_DE_PACOTE`, `regrasEssenciais()` e `montarPacote()`. E `montarPacote` já substitui **por função** (`.replace(re, () => bloco)`), que é exatamente a correção do defeito do `$`: o bloco de regras essenciais contém `$` porque documenta que "R$ 100" não é matemática, e numa **string** de substituição isso é padrão especial (`$&`, `` $` ``, `$'`). Uma medição do marco 6b saiu **2.872 caracteres maior** que a real, sem erro nenhum. **Qualquer `replace` novo que injete conteúdo tem de usar função.**

**Fato 2 — a convenção de injeção é invenção da execução do 6b, porque nem a spec nem o plano diziam onde o bloco entra.** A linha `<!-- inserir:regras-essenciais -->` vira o bloco, e todo **outro** comentário HTML some. **A ordem importa e errá-la é silenciosa**, porque o próprio marcador é um comentário: inverter as duas operações apaga o marcador antes de usá-lo, e o resultado é um pacote sem as regras essenciais, sem erro nenhum.

**Fato 3 — a armadilha de escopo da reescrita de tag, medida.** A spec 8.1 diz que `pacotes` "reescreve a tag do runtime (versão e `integrity`) em `modelos/`, `especime/` e `exemplos/`". Medido: **52 arquivos do repositório carregam a tag; só 8 estão nessas três pastas; 33 estão em `tests/`.** Uma busca repo-wide reescreveria as fixtures e quebraria a suíte. O escopo é literal: três pastas, oito arquivos.

**Fato 4 — os números do empacotamento.** Os onze `guia/*.md` somam **111,9 KB** — é isso que vai como "o guia num arquivo" no `conhecimento/`. `modelos/aula/index.html` tem 2.096 bytes e `exemplos/descida-do-gradiente/index.html` tem 6.036. Os cinco fontes de pacote: `skill.md` 4.924, `agents-disciplina.md` 3.969, `gpt-instrucoes.md` 3.886, `projeto-claude.md` 3.614, `gpt-iniciadores.md` 802.

**Fato 5 — o bloco essencial mede 1.667 caracteres e o `gpt-instrucoes.md` montado saiu em 5.008**, com folga de 2.992 sob o teto de 8.000 da spec 10.2. Medido no 6b, com a injeção já correta.

**Fato 6 — versão e hash conferem hoje.** `package.json` e `dist/manifesto.json` estão os dois em `0.1.0`, e o manifesto traz `integrity` por arquivo (`sha384-`, 64 caracteres base64, **sem** `=` de preenchimento). É desses dois que a tag fixada sai, e é isso que o teste da spec 11.1 confere.

**Fato 7 — `references/` são os ONZE `guia/*.md`, nenhum de `guia/pacotes/`.** Resolvido na execução do 6b: a spec 10.2 diz "com o guia completo", e incluir `guia/pacotes/` faria a skill carregar o próprio fonte e as instruções do GPT como referência do autor.

**Fato 8 — as metas e as unidades, lidas do contrato:** `unidade` (tipo `unidade`), `disciplina` (texto, máx. 60), `aula` (texto, máx. 12), `data` (ISO), `professor` (texto, máx. 40). As unidades são `ime` e `ifusp`.

---

## O que este marco NÃO faz

- **Não publica nada.** A publicação no npm, a tag da CDN resolvendo de verdade e o aceite em claude.ai e ChatGPT são **fase 3**, e dependem de autorização explícita do autor no momento (spec 12).
- **Não roda o aceite.** A Tarefa 6 escreve o *roteiro*; rodá-lo é o marco 7.
- **Não escreve prosa de instrução.** Ela está toda em `guia/`, desde o 6b.

---

## Estrutura de arquivos

- Criar: `build/pacotes.mjs` — a montagem dos quatro pacotes e a reescrita da tag (Tarefas 1 a 3)
- Criar: `tests/unit/pacotes.test.mjs` — as guardas da spec 11.1 (Tarefa 4)
- Modificar: `bin/aula-usp.mjs` — os comandos `pacotes` e `novo` (Tarefas 3 e 5)
- Criar: `pacotes/` — quatro diretórios, gerados e versionados (Tarefa 2)
- Modificar: `modelos/`, `especime/`, `exemplos/` — oito tags reescritas (Tarefa 3)
- Criar: `tests/aceite/roteiro.md` (Tarefa 6)
- Reescrever: `README.md` (Tarefa 7)
- Modificar: `AGENTS.md` — a linha de `pacotes/` na tabela de gerados (Tarefa 4)
- Modificar: `.gitignore` — conferir que `pacotes/` **não** é ignorado (Tarefa 2)

---

### Tarefa 1: `build/pacotes.mjs` — a montagem

**Interfaces:**
- Consome: `FONTES_DE_PACOTE`, `regrasEssenciais()`, `montarPacote()` de `build/guia.mjs` (Fato 1).
- Produz: `montarPacotes({ raiz })`, que escreve os quatro diretórios e devolve o que escreveu.

A spec 10.2 define os quatro, e esta é a tabela dela, com os fatos medidos ao lado:

| pacote | conteúdo | medido |
|---|---|---|
| `pacotes/skill/aula-usp/` | `SKILL.md` (metadados do padrão Agent Skills + o procedimento), `references/` com o guia completo, `assets/modelo.html`, `assets/exemplo.html` | `references/` = os **onze** `guia/*.md` (Fato 7) |
| `pacotes/claude/projeto/` | `instrucoes.md`; `conhecimento/` com o guia num arquivo, o modelo e o exemplo | o guia num arquivo = **111,9 KB** (Fato 4) |
| `pacotes/gpt/gpt-personalizado/` | `instrucoes.txt` (até 8.000), `conhecimento/`, `iniciadores.txt` | montado hoje em **5.008** (Fato 5) |
| `pacotes/repositorio-de-disciplina/` | o trecho de `AGENTS.md` e um `CLAUDE.md` com `@AGENTS.md` | fonte: `guia/pacotes/agents-disciplina.md` |

- [ ] **Passo 1: a montagem, com a ordem do Fato 2**

Use `montarPacote()` como está. **Não reimplemente a injeção** — a ordem entre trocar o marcador e apagar os outros comentários é a armadilha silenciosa do Fato 2.

- [ ] **Passo 2: o guia num arquivo**

`conhecimento/` recebe os onze `guia/*.md` concatenados, na ordem numérica dos nomes, cada um precedido de um cabeçalho que diga de que arquivo veio. A ordem tem de ser determinística pelo mesmo motivo que `exemplosPorLayout` ordena: um gerado-e-versionado só compra a guarda "regerar não muda nada" se a ordem de leitura do diretório não entrar no resultado.

- [ ] **Passo 3: commit**

---

### Tarefa 2: `pacotes/` versionado, com a guarda

- [ ] **Passo 1: gerar e commitar os quatro diretórios**

- [ ] **Passo 2: conferir o `.gitignore`**

O marco 5c acrescentou `dist/` mais `!/dist/`. Confirme que `pacotes/` **não** cai em nenhuma regra de ignorar — ele é versionado, como os outros cinco gerados.

- [ ] **Passo 3: a guarda de regerar-e-comparar, e o que ela NÃO prova**

Escreva a guarda no molde das outras cinco. **E leia isto antes:** o marco 6b provou, por mutação, que uma guarda de regerar-e-comparar **abençoa uma regressão do gerador** — ela compara saída com saída, então piorar o gerador e regerar deixa as duas iguais, e a mensagem ainda manda "commite o resultado". `AGENTS.md` tem um parágrafo sobre isso.

Então, além da igualdade, asseverem-se **propriedades**: o bloco de regras essenciais aparece **idêntico** nos quatro pacotes (é o que a spec 11.1 pede), `instrucoes.txt` cabe no teto, e `references/` tem os onze arquivos e nenhum de `guia/pacotes/`.

---

### Tarefa 3: a reescrita da tag e o comando `pacotes`

- [ ] **Passo 1: a tag fixada**

Forma, dos Fatos 6 e 8:

```html
<script src="https://cdn.jsdelivr.net/npm/aula-usp@<versão>/dist/aula-usp.js"
        integrity="<integrity de aula-usp.js no manifesto>" crossorigin="anonymous"></script>
```

- [ ] **Passo 2: o escopo, que é a armadilha do Fato 3**

Reescreva **só** em `modelos/`, `especime/` e `exemplos/` — oito arquivos. Uma busca repo-wide acha 52 e quebra 33 fixtures. Confirme a contagem antes e depois: **8 reescritos, 44 intocados.**

- [ ] **Passo 3: provar que nada quebrou, e por quê**

Depois de reescrever, rode a suíte inteira e os seis decks pelos dois comandos. Eles **devem** continuar passando, e a razão está medida no plano do 6a: `build/servir.mjs:79` (`reescreverRuntime`) troca **qualquer** `<script src="…/aula-usp.js">` pelo carregador local, em todo `.html` servido, e `build/composicao.mjs:39` mede a composição por esse mesmo servidor. O Chrome nunca vê a URL da CDN.

Se alguma coisa quebrar, **pare e me diga** — significa que existe um caminho que não passa pelo servidor interno, e isso é informação nova.

- [ ] **Passo 4: `aula-usp pacotes`**

O comando gera `pacotes/`, reescreve as oito tags e confere os limites. **Ele roda o gerador do guia antes de empacotar**, pela mesma razão documentada em `AGENTS.md` para `aula-usp dist` gerar a cobertura antes: empacotar um guia desatualizado entrega o artefato uma geração atrás.

---

### Tarefa 4: as guardas da spec 11.1

A spec nomeia três, e as três são sobre os pacotes:

1. `instrucoes.txt` do GPT com até **8.000** caracteres;
2. o bloco de regras essenciais **idêntico** em todos os pacotes;
3. **versão e `integrity` das tags iguais** à versão do `package.json` e ao hash de `dist/aula-usp.js`.

- [ ] **Passo 1: escrevê-las, derivando do contrato e do manifesto**

Nenhum dos três números é digitado: 8.000 sai da spec e fica numa constante nomeada com a citação ao lado; o bloco sai de `regrasEssenciais()`; versão e hash saem de `package.json` e `dist/manifesto.json`.

- [ ] **Passo 2: inversão obrigatória, uma por guarda**

Quebre o que cada uma protege, veja falhar, restaure, e relate as três mensagens. **Neste projeto, três guardas nasceram vazias e todas foram pegas por mutação, nunca por leitura.** Duas delas passavam porque procuravam um nome num arquivo que também continha uma lista desses nomes — se a sua guarda procura texto, confira que a fonte da busca não contém o próprio gabarito.

- [ ] **Passo 3: a linha de `pacotes/` no `AGENTS.md`**

---

### Tarefa 5: `aula-usp novo`

**Arquivos:** modificar `bin/aula-usp.mjs`.

`aula-usp novo <pasta> --unidade ime` copia `modelos/aula/` com as metas preenchidas (spec 8.1). Das cinco metas do Fato 8, o comando sabe duas: `unidade`, da opção, e `data`, de hoje. As outras três continuam com o texto de exemplo do modelo — **e é melhor assim**: um valor inventado para `professor` seria pior que um lugar visivelmente vazio.

- [ ] **Passo 1: o comando**

A unidade tem de ser uma chave de `assets/marcas/unidades.json` (`ime` ou `ifusp`); qualquer outra é falha de uso, código 2. Se a pasta já existir e não estiver vazia, não sobrescreva.

- [ ] **Passo 2: o teste**

O que sai de `novo` **valida limpo** — é a asserção que importa, e é a que pega qualquer preenchimento que quebre uma regra de metadado.

---

### Tarefa 6: `tests/aceite/roteiro.md`

A spec 11.3 fixa o pedido, e ele é literal:

> "Faça uma aula de 10 a 14 slides sobre passeio aleatório e difusão para a graduação, com três blocos, uma derivação passo a passo, um trecho de Python e um exercício"

- [ ] **Passo 1: o roteiro**

Registra, **por ambiente**, os erros da primeira versão, as rodadas até zero erros, e as observações visuais do autor. Fase 1: Claude Code e Codex CLI, cada um **só** com `pacotes/skill/aula-usp/` e a CLI instalada por `npm link`. Critério: zero erros em até três rodadas, mais revisão visual.

O tema não coincide com nenhum exemplo dos pacotes, e isso é de propósito — a aula-exemplo é sobre descida do gradiente.

- [ ] **Passo 2: deixar claro que é roteiro, não resultado**

O arquivo é a instrução de como rodar o aceite e a tabela vazia onde os resultados entram. **Rodá-lo é o marco 7.**

---

### Tarefa 7: o `README.md`

Ele está desatualizado desde o marco 4 — diz dois comandos, 341 unitários e 99 de integração, "marcos 1 a 4 prontos", 55 de 56 regras. O marco 6a corrigiu o mínimo para ele não contradizer o `AGENTS.md`; esta é a reescrita.

- [ ] **Passo 1: reescrever, medindo tudo**

Toda contagem sai de uma medição sua no momento de escrever. **Não copie número deste plano** — ele foi medido em `dff59ab` e a sua árvore terá mais.

- [ ] **Passo 2: dizer o que ainda não existe**

Fase 2 (gráficos, diagramas, controles), publicação no npm e a tag da CDN resolvendo. O `guia/` já faz isso nos arquivos dele; o `README` é a porta de entrada e precisa fazer também.

---

## Verificação final do marco 6c

- [ ] `npm test` e `npm run test:integracao` verdes (440 e 200 na base)
- [ ] `npm run guia` e `aula-usp pacotes` não produzem diff num repositório limpo
- [ ] os seis decks do espécime, `modelos/aula/` e `exemplos/descida-do-gradiente/` pelos dois comandos, **depois** da reescrita da tag — sem regressão
- [ ] `aula-usp novo` numa pasta temporária produz aula que valida limpa
- [ ] os quatro pacotes existem, e o bloco de regras essenciais é byte a byte idêntico nos quatro
- [ ] 8 tags reescritas, 44 intocadas

## O que fica para a fase 3

- `71-fluxo-chat.md`, `72-artifact-claude.md` e `73-chatgpt.md` **não puderam ser exercitados** — dependem da tag da CDN resolvendo. Os três declaram isso, e `72` declara que o que afirma sobre artifacts é premissa da spec 14, não teste. Revisitar quando o aceite da fase 3 rodar.
- A publicação no npm, a tag viva e o aceite em claude.ai e ChatGPT.
