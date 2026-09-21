# Pacote autossuficiente — plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** fechar os cinco achados que o aceite do marco 7 produziu sobre o pacote, mais a junta entre dois artefatos deste repositório que o aceite expôs.

**Arquitetura:** nenhuma mudança no sistema. Uma quinta tabela gerada de `contrato.limites`, dois arquivos a mais dentro do pacote, e prosa corrigida em `guia/`. O gerador e as guardas são os que já existem.

**Pilha:** Node ≥ 20.6, ES modules, `node:test`. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-14-aula-usp-design.md` — seções 3.4, 10.1, 10.2 e 11.3.
**Origem:** `tests/aceite/roteiro.md`, os resultados da fase 1 rodada em 2026-09-21.

---

## Por que este plano existe

O aceite aprovou os dois ambientes — e produziu cinco achados sobre o pacote. O próprio roteiro diz o que fazer com eles: *"Registre **o que faltava no pacote**, não 'o modelo errou' — o consumidor do aceite é `guia/`, e é lá que o conserto entra."*

**Três dos cinco têm uma raiz só: o guia foi escrito por quem está dentro do repositório, para um leitor que está fora.** Cada citação de caminho era verdadeira quando escrita, e vira ponteiro morto quando o pacote sai daqui. Nenhuma revisão do marco 6b podia ter pego isso: elas liam o guia de dentro do repositório, onde tudo resolve.

---

## Restrições globais

- Node ≥ 20.6, ES modules, `node:test`. Sem framework de terceiros.
- **A fronteira:** `montar/`, `motor/`, `componentes/` e `validador/` não importam nada do Node.
- **Contrato como dado:** nenhum número do contrato é digitado à mão. É o coração deste plano — quatro dos cinco achados existem porque um número ficou fora do que se gera.
- **Uma guarda de regerar-e-comparar não prova nada sobre o gerador** (`AGENTS.md`): asseverem-se **propriedades**, não só igualdade.
- Tudo em português. Commits terminando com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, sem afirmar mais do que a evidência sustenta.

---

## Fatos medidos antes deste plano

Medidos em `5b86dd3`.

**Fato 1 — o número que o agente não achou existe no contrato, e é `capa.h1.caracteresPorSegmento = 23`.** Ele está entre os **33 limites** de `contrato.limites` e **não aparece em nenhum dos onze arquivos do guia**. O `acao` de `limites.titulo` é *"Corte o título ou divida o conteúdo em dois slides"* — sem número —, e o único exemplo de mensagem no guia mostra `(máx. 50)`, que é o do `h2`. Por isso o agente errou o título da capa na primeira tentativa e descobriu o limite por tentativa e erro.

**Fato 2 — a tabela dos 33 limites mede 1.019 caracteres.** Pequena, e fecha os achados 1 e 2 de uma vez.

**Fato 3 — os tamanhos que decidem o que o pacote leva:** `contrato/contrato.json` tem **19.859 bytes**, os seis decks do espécime somam **25.504**, e o pacote da skill hoje tem **131.474**. Levar os dois custa **45 KB sobre 131** e não toca `instrucoes.txt`, que tem teto de 8.000 e é outro arquivo.

**Fato 4 — os ponteiros, contados no pacote: 41.** Trinta e três apontam para `especime/…` e oito para `exemplos/…` ou `modelos/…`. **Os oito já têm equivalente dentro do pacote** (`assets/exemplo.html`, `assets/modelo.html`); os trinta e três não.

**Fato 5 — `contrato.json` é citado 8 vezes no pacote** como autoridade, e não viaja nele.

---

## Estrutura de arquivos

- Modificar: `build/guia.mjs` — a quinta tabela (Tarefa 1)
- Modificar: `guia/10-estrutura.md` — o marcador da tabela de limites (Tarefa 1)
- Modificar: `build/pacotes.mjs` — os dois arquivos a mais (Tarefa 2)
- Modificar: `guia/*.md` — os 41 ponteiros (Tarefas 2 e 3)
- Modificar: `guia/pacotes/skill.md` — a junta (Tarefa 4)
- Modificar: `guia/70-fluxo-terminal.md` — a conferência sem humano (Tarefa 5)
- Modificar: `tests/unit/guia.test.mjs`, `tests/unit/pacotes.test.mjs` — as guardas
- Regenerar: `pacotes/` (sai de `aula-usp pacotes`, em todas as tarefas)

---

### Tarefa 1: a quinta tabela gerada — os limites

Fecha os achados 1 e 2.

- [ ] **Passo 1: o gerador**

`tabelaDeLimites(contrato)` em `build/guia.mjs`, no molde das outras quatro. Os 33 limites saem de `contrato.limites`; **nenhum é digitado**.

Duas decisões de forma que o plano deixa para você, com o critério: o leitor é um professor querendo saber quanto cabe, e um modelo querendo o número exato.
- as chaves são pontuadas (`capa.h1.caracteresPorSegmento`) e agrupam naturalmente por prefixo — decida se a tabela agrupa ou lista plano, e diga por quê;
- alguns limites são de unidade óbvia (`codigo.linhas`) e outros não (`saida.megabytes`, `blocos.maxFileira`). Se a chave não disser a unidade, a tabela precisa dizer.

- [ ] **Passo 2: o marcador**

`<!-- gerado:tabela-de-limites -->` em `guia/10-estrutura.md`, onde a prosa dos limites já mora, e a entrada correspondente em `BLOCOS_POR_ARQUIVO`.

- [ ] **Passo 3: a guarda, e uma propriedade além da igualdade**

A de regerar-e-comparar sai de graça. **Acrescente a que importa:** todo limite de `contrato.limites` aparece na tabela — derivado do contrato, não de uma lista escrita no teste.

E uma que fecha o achado 1 na raiz: **todo `acao` de regra `limites.*` que cite um número tem de citar o número certo do contrato**, ou não citar número nenhum. Foi um `acao` com o número errado do `h2` que mandou o agente para o lugar errado.

- [ ] **Passo 4: inversão**

Apague um limite da tabela gerada, veja falhar, restaure. Relate a mensagem.

---

### Tarefa 2: o pacote leva o contrato e o espécime

Fecha os achados 3 e 4 (33 dos 41 ponteiros).

- [ ] **Passo 1: a decisão, que eu já tomei — os dois vão junto**

`contrato/contrato.json` (20 KB) e os seis decks de `especime/` (25 KB) entram no pacote. Custa 45 KB sobre 131, e compra três coisas: as 8 citações do contrato viram verdadeiras, os 33 ponteiros para o espécime viram vivos, e o leitor ganha **o deck que exercita todos os layouts e componentes** — que é o que o guia mais manda olhar.

Onde, dentro do pacote, é decisão sua: o critério é que os ponteiros do guia resolvam **sem reescrita**, ou que a reescrita seja mecânica e guardada.

- [ ] **Passo 2: os quatro pacotes**

A spec 10.2 descreve quatro. Decida para quais isto vale — o da skill é o do aceite, mas o do Projeto do Claude e o do GPT têm `conhecimento/`, e o argumento é o mesmo. Diga o que decidiu e por quê.

- [ ] **Passo 3: a guarda**

**Todo caminho citado dentro do pacote existe dentro do pacote.** É a guarda que faltava e que teria pego os 41 de uma vez: varre os arquivos do pacote procurando referência a caminho e confirma que cada uma resolve. Esta é a guarda mais valiosa deste plano — ela impede que a classe inteira volte.

- [ ] **Passo 4: inversão**

Acrescente a um arquivo de guia uma citação a um caminho que não existe no pacote, veja a guarda falhar, restaure.

---

### Tarefa 3: os oito ponteiros que têm equivalente

- [ ] **Passo 1**

Os oito apontam para `exemplos/descida-do-gradiente/index.html` e `modelos/aula/index.html`, e o pacote já leva os dois como `assets/exemplo.html` e `assets/modelo.html`. Faça o guia citar o caminho que o leitor tem.

**Cuidado:** o guia é lido dentro do repositório também. Se o caminho do pacote não existir aqui, quem lê `guia/` perde o ponteiro. Resolva sem criar duas verdades — e se precisar de reescrita na montagem, ela é mecânica e guardada pela Tarefa 2.

---

### Tarefa 4: a junta `SKILL.md` × roteiro de aceite

O achado que **nenhum dos dois agentes causou**: o passo 3 do `SKILL.md` manda perguntar as cinco metas; o roteiro manda "entregue o pedido, uma vez, e não ajude". Num aceite não-interativo, um agente que segue o pacote à risca **não entrega nada** — foi o que o Codex fez, corretamente.

- [ ] **Passo 1: decidir de que lado consertar**

As duas saídas são legítimas e você escolhe uma, com o motivo escrito:
- **o `SKILL.md` prevê o caso sem autor à mão** — preenche com marcadores visíveis e diz ao autor o que preencher. É o que o agente do Claude Code inventou sozinho, e ele registrou que era a decisão que mais merecia revisão;
- **o roteiro prevê a resposta às metas na preparação**, como parte de montar o ambiente.

Pesa a favor da primeira: quem instala a skill e pede uma aula por script também não está lá para responder. O aceite só expôs o caso; ele não é exclusivo do aceite.

- [ ] **Passo 2: e o que a decisão exige do outro lado**

Se o `SKILL.md` mudar, o roteiro precisa dizer que a resposta às metas não conta como ajuda. Se o roteiro mudar, a preparação ganha um passo.

---

### Tarefa 5: como um agente confere o que escreveu

O guia manda `aula-usp servir`, que pressupõe humano olhando. O agente do aceite resolveu por fora, rasterizando o PDF com `pdftoppm`.

- [ ] **Passo 1**

Documente o caminho que existe: `aula-usp build` produz o PDF, e o PDF é inspecionável sem navegador. **Não prometa ferramenta que o pacote não controla** — `pdftoppm` é do Poppler e pode não estar na máquina. Diga o que o sistema garante (o PDF) e mencione a rasterização como o que o leitor pode ter.

**Não invente comando novo.** Se a conclusão for que falta uma capacidade na CLI, isso é achado para um plano próprio, não para este.

---

## Verificação final

- [ ] `npm test` e `npm run test:integracao` verdes (464 e 202 na base)
- [ ] `npm run guia` e `aula-usp pacotes` sem diff
- [ ] **zero caminhos citados no pacote que não existam no pacote** — a guarda da Tarefa 2
- [ ] `capa.h1.caracteresPorSegmento` aparece no guia
- [ ] os oito alvos (seis decks, modelo, exemplo) pelos dois comandos, sem regressão
- [ ] o pacote da skill cresceu ~45 KB e nada mais mudou de tamanho sem explicação

## O que este plano NÃO faz

- **Não roda o aceite de novo.** Vale rodar depois, e comparar com a linha de base de `5b86dd3` — é para isso que as aulas ficaram guardadas em `tests/aceite/aulas/`.
- **Não mexe na lacuna de SRI**, que bloqueia a fase 3 e mora no empacotador.
- **Não começa a fase 2.**
