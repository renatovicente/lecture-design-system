# Avaliar (1.1.0): plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans, tarefa a tarefa. Passos com caixa (`- [ ]`).

**Objetivo:** o comando `aula-usp avaliar` e a skill `aula-usp-avaliar`, que julgam uma aula ou um slide pelas boas práticas de Naegle (2021) e da UCSD, sem mudar o contrato nem o validador.

**Arquitetura:**
- **`avaliador/`**, do lado do navegador e sem `node:`, como `validador/`, leva a rubrica como dado (`rubrica.json`) e os critérios medidos, que recebem o documento e a rubrica por parâmetro.
- **`build/avaliar.mjs`** carrega a aula como `validar` e, com `--fotos`, fotografa os slides no Chrome.
- **A skill** acrescenta os critérios julgados olhando as fotos.

**Stack:** Node ≥ 20.6, linkedom, playwright-core com o Chrome instalado, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md`, seções 2, 3, 4, 7, 8 e 10. A spec do sistema, `2026-09-14-aula-usp-design.md`, vale onde aquela não diz nada.

## Restrições globais

- `AGENTS.md` inteiro vale, em particular:
  - a fronteira: `avaliador/` não importa `node:`;
  - dado em vez de código: nenhum limiar da rubrica escrito no código;
  - os gerados no mesmo diff;
  - toda guarda de propriedade com inversão medida, e com o universo tirado de uma fonte independente do gerador.
- **Avaliar não é validar:**
  - nunca produz `erro`, só `alerta` e `conselho`;
  - sai com 0, ou 2 em falha de ambiente, e nunca com 1;
  - o contrato, o validador e o `build` não mudam de comportamento.
- **Nada de rede.** Sem `npm publish`, `gh` nem `curl`; a publicação é do autor.
- **Português** em tudo, inclusive nos nomes de símbolo. Cada commit termina com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Nenhuma mensagem afirma mais do que a evidência sustenta.
- **As suítes inteiras** (`npm test` e `npm run test:integracao`) rodam no fim de cada tarefa de código.

## Fatos medidos (main em `70cbf2b`, 1.0.2)

1. **Carregar a aula no Node:** `build/validar.mjs` tem `lerAula(caminho, contrato)` (linkedom, com os atributos normalizados) e `lerERodarEstatica(alvo)`, que devolve `{ caminho, contrato, doc, recursos, achadosEstatica, fase }`. `caminhoDaAula(alvo)` aceita pasta ou arquivo.
2. **Os blocos de corpo** saem de `validador/sequencia.js:itensDoConteudo(elemento)`, que lista elementos e `tex-destaque` na ordem. É a contagem que o critério `elementos` usa, para bater com o que o validador chama de bloco.
3. **Os slides do fonte** saem de `validador/validar.js:slidesDoFonte(corpo)`, e o prefixo de cada linha, de `onde(slides, secao)`. `linhaDe()` e `cabecalhoDe()` formatam as linhas do validador. O formato de saída do `avaliar` segue o mesmo desenho.
4. **Contrato:**
   - `limites['corpo.palavras']` = 90, `limites['lista.itens']` = 5 e `limites['coluna.palavras']` = 60;
   - a classe `fonte` (`p.fonte`, papel legenda) é a linha de crédito, e `figcaption` é a legenda;
   - existem `figure.grafico`, `figure.diagrama`, `div.demo` e `pre`.
5. **CLI:** `bin/aula-usp.mjs` tem `lerArgumentos(argumentos, flagsPermitidas)`, que trata as flags conhecidas uma a uma e recusa com o uso e código 2 qualquer outra. Cada comando tem o seu conjunto `FLAGS_*`, e todo módulo de `build/` entra por `import()` dentro do comando.
6. **Chrome:** `build/composicao.mjs` exporta `abrirChrome()`, e `tests/integracao/utilitarios.mjs` tem `esperarMontagem`. A montagem termina com `document.body.dataset.montado === 'sim'`. O motor avança por `ArrowRight` e revela os passos um a um.
7. **Pacotes:** `build/guia.mjs:FONTES_DE_PACOTE` mapeia uma fonte de `guia/pacotes/*.md` para um destino em `pacotes/`. O pacote `skill/aula-usp` tem `SKILL.md`, `assets/`, `contrato/`, `especime/` e `references/`. A guarda de citações de `tests/unit/pacotes.test.mjs` exige que tudo citado entre crases exista dentro do pacote. O teto do GPT é de 8.000 caracteres, e hoje estão ocupados 5.819.
8. **Testes:** 46 arquivos em `tests/unit/` e 28 em `tests/integracao/`; 635 e 266 testes.

## Decisões deste plano

- **D1, limiares.** A rubrica fica abaixo dos tetos do contrato, porque é conselho sobre aula já válida:

  | critério | limiar | nível | por quê |
  |---|---|---|---|
  | `palavras-slide` | 60 | conselho | 2/3 do teto `corpo.palavras` de 90 |
  | `itens` | 4 | conselho | U; o contrato permite 5 |
  | `elementos` | 6 | alerta | N7 |
  | `revelacao` | 3 itens | conselho | lista maior sem `data-passo` |
  | `so-texto` | 0,5 | alerta | fração dos slides de conteúdo |
  | `tempo` | 1,2 × N | alerta | com `--minutos N` |
  | `titulo-rotulo` | até 2 palavras, ou lista de rótulos | alerta | N3 |

  A lista de rótulos genéricos mora na rubrica: Introdução, Motivação, Resultados, Métodos, Metodologia, Discussão, Conclusão, Conclusões, Background, Contexto, Resumo, Exemplo e Exemplos. A verificação de verbo conjugado é heurística; o plano manda usar só a regra "até 2 palavras, ou título igual a um rótulo da lista, ignorando caixa e pontuação", e deixa o verbo para o julgamento da skill (`titulo-conclusao`).
- **D2, slides medidos.** `titulo-rotulo` só em `conteudo`, `figura` e `afirmacao`. `elementos`, `itens`, `revelacao`, `paineis`, `credito` e `palavras-slide` em todo slide que tem corpo. `so-texto` só entre os de `conteudo`. `tempo` conta todo slide menos capa, abertura e encerramento.
- **D3, `credito`.** Conta `figure` com `img` ou `svg` (escrito pelo autor) e `figure.grafico`. Há crédito se houver um `p.fonte` no mesmo slide ou um `figcaption` dentro da `figure` que contenha "Fonte", "Adaptado de", "Dados de", "Crédito" ou um ano entre parênteses, `(19xx)` ou `(20xx)`. A lista de marcadores mora na rubrica. `figure.diagrama` e as demos não contam: são desenhados pelo próprio autor.

---

### Tarefa 1: a rubrica como dado, e a guarda dela contra a spec

**Arquivos:**
- Criar: `avaliador/rubrica.json` e `tests/unit/rubrica.test.mjs`.

**Formato:**

```json
{
  "versao": 1,
  "fontes": {
    "N": "K. M. Naegle, Ten simple rules for effective presentation slides, PLOS Comput Biol 17(12): e1009554, 2021",
    "U": "UC San Diego Multimedia Services, Evidence-Based Presentation Design Recommendations"
  },
  "criterios": {
    "titulo-rotulo": { "fonte": ["N3"], "tipo": "medido", "alcance": "slide", "nivel": "alerta",
      "layouts": ["conteudo", "figura", "afirmacao"], "maxPalavrasRotulo": 2,
      "rotulos": ["introdução", "motivação", "resultados", "métodos", "metodologia", "discussão",
                  "conclusão", "conclusões", "background", "contexto", "resumo", "exemplo", "exemplos"],
      "acao": "Troque o rótulo por uma frase que diga a conclusão do slide: não \"Resultados\", mas o que os resultados mostram." }
  }
}
```

Os 17 critérios da spec 3.1 e 3.2 entram todos. Os julgados levam `tipo: "julgado"`, sem limiar, e com a `pergunta` que a skill responde (por exemplo `uma-ideia`: "O slide entrega uma só ideia?"). As `acao` são escritas para o autor, em português, sem citar código.

- [ ] **Passo 1: escrever o teste antes.** Ele confere a rubrica contra a spec, com uma tabela escrita no próprio teste e copiada da spec 3.1 e 3.2: `id`, `fonte`, `tipo`, `alcance` e `nivel` de cada um dos 17 critérios, mais os limiares da D1. O universo vem da tabela do teste, não do `rubrica.json`; ver a "sétima" do `AGENTS.md`. Ele confere também:
  - que nenhum critério tem nível `erro`;
  - que todo `medido` tem `acao`;
  - que todo `julgado` tem `pergunta`.
- [ ] **Passo 2:** rodar e ver cair (o arquivo ainda não existe).
- [ ] **Passo 3:** escrever a rubrica.
- [ ] **Passo 4:** passar.
- [ ] **Passo 5, duas inversões:**
  - apagar um critério do JSON: o teste tem de cair citando o `id`;
  - acrescentar um critério inventado no JSON: tem de cair também, porque o conjunto de `id`s precisa ser igual.
- [ ] **Passo 6:** commit, `feat(avaliador): a rubrica como dado — Naegle 2021 refinado pela UCSD`.

### Tarefa 2: os critérios medidos em `avaliador/`

**Arquivos:**
- Criar: `avaliador/avaliar.js`, `avaliador/criterios/slide.js` e `avaliador/criterios/aula.js`, e `tests/unit/avaliador.test.mjs`.
- Criar: um par `bom.html`/`ruim.html` por critério medido em `tests/fixtures/avaliador/<criterio>/`.

**Interfaces:**
- `avaliar(doc, { rubrica, contrato, minutos, slide })` devolve uma lista de achados `{ slide, id, criterio, fonte, tipo: 'medido', nivel, mensagem, acao, trecho }`.
  - `slide` é a posição, começando em 1, como no validador.
  - `id` é o id da `section`, ou nada.
  - Com `slide` (número ou id), avalia só aquele slide; os critérios de alcance `aula` ficam de fora.
- `linhaDeAvaliacao(achado)`, no formato `ALERTA · slide 4 #resultados · titulo-rotulo (N3) · mensagem. ação`.
- `resumoDaAvaliacao(achados, rubrica)`, com uma linha por critério medido: quantos alertas e conselhos.
- Os critérios são registrados por `id`. Um critério medido que esteja na rubrica e não tenha implementação é defeito, e o teste pega, com o universo tirado da tabela da spec escrita no teste da tarefa 1, exportada de lá ou duplicada literalmente.

- [ ] **Passo 1: fixtures.** Um par por critério medido: o `ruim` tem exatamente um achado daquele critério; o `bom` tem zero de todos. Todo `bom` e todo `ruim` precisam **validar limpos** com `aula-usp validar`, porque a avaliação se aplica a aula válida. Confira com `node bin/aula-usp.mjs validar <pasta>` e registre no relatório. Os critérios de alcance `aula` (`so-texto` e `tempo`) usam aulas pequenas inteiras; o `tempo`, com `minutos` passado pelo teste.
- [ ] **Passo 2:** o teste gera um caso por pasta de fixture, como `tests/unit/validador.test.mjs` faz, e exige que todo critério medido da rubrica tenha a sua pasta.
- [ ] **Passo 3:** implementar. As palavras visíveis são o `textContent` do corpo, sem `aside.notas`, sem o `h2`, e sem o que está dentro de `.katex`, `pre`, `figure.grafico` e `figure.diagrama`. A contagem é por espaço em branco. Diga no comentário o que ficou de fora e por quê.
- [ ] **Passo 4:** as duas suítes inteiras.
- [ ] **Passo 5: inversão.** Com `maxPalavrasRotulo` em 0 no JSON, o `ruim` de `titulo-rotulo` fica sem achado, e o teste cai. Isso prova que o código lê o limiar da rubrica e não tem número próprio. Devolva o valor.
- [ ] **Passo 6: rodar no espécime e nas duas aulas-exemplo.** Registre no relatório os números por critério. Não é teste; é medida para calibrar. Se a aula-exemplo tiver alertas, diga quais e se são justos. Não mude os limiares da D1 sem registrar a divergência.
- [ ] **Passo 7:** commit.

### Tarefa 3: o comando `aula-usp avaliar`

**Arquivos:**
- Criar: `build/avaliar.mjs`.
- Modificar: `bin/aula-usp.mjs` (comando, uso, `FLAGS_AVALIAR`) e `README.md` (seção "Os comandos" e o guia rápido: uma linha).
- Criar: `tests/unit/avaliar-cli.test.mjs` e `tests/integracao/avaliar-fotos.test.mjs`.

**Comportamento (spec 4.1):**
- `aula-usp avaliar <pasta> [--slide <id|n>] [--minutos N] [--fotos <dir>] [--json]`.
- Lê a aula com `lerAula`, depois de conferir que ela **valida sem erro estático**. Uma aula com erro de validação sai com uma mensagem clara, "valide primeiro: N erros", e código 0; nada é avaliado.
- Imprime as linhas e o resumo, ou o JSON (`{ achados, resumo }`) com `--json`.
- `--minutos` recebe um inteiro positivo; outro valor sai com o uso e código 2.
- `--fotos <dir>`:
  - abre a aula (o HTML do fonte, servido como em `servir`, com o runtime local);
  - espera a montagem;
  - para cada slide, revela todos os passos e grava `<dir>/slide-NN-<id>.png`, com 1280 × 720, viewport 1280 × 720 e escala 1;
  - grava `<dir>/indice.json` com `[{ slide, id, layout, arquivo }]`;
  - sem Chrome, sai com 2 e a mensagem de falha de ambiente, só quando `--fotos` foi pedido.
- `lerArgumentos` ganha `--slide`, `--minutos` e `--fotos`, com valor, e `FLAGS_AVALIAR`. As flags novas não podem vazar para os outros comandos; teste isso: `validar --minutos 3` continua saindo com 2.

- [ ] **Passo 1:** testes de CLI, no molde de `tests/unit/validar-cli.test.mjs`:
  - códigos de saída 0 e 2;
  - flags de outro comando recusadas;
  - `--json` bem formado;
  - `--slide` por id e por número;
  - aula com erro de validação.
- [ ] **Passo 2:** implementar.
- [ ] **Passo 3: teste de integração de `--fotos` no espécime `index.html`.** Um PNG por slide, 1280 × 720 (leia o cabeçalho do PNG), o `indice.json` coerente, e o último passo de uma lista com `data-passo` visível na foto: meça no DOM antes da foto que o item está visível.
- [ ] **Passo 4:** as duas suítes inteiras e commit.

### Tarefa 4: a skill `aula-usp-avaliar` e o guia

**Arquivos:**
- Criar: `guia/pacotes/skill-avaliar.md`, `guia/80-avaliar-corrigir-gerar.md` (só a parte de avaliar; as outras duas seções vêm nos marcos seguintes, e ficam fora do arquivo) e `tests/aceite/avaliar.md`.
- Modificar:
  - `build/guia.mjs`: `FONTES_DE_PACOTE` ganha o destino `pacotes/skill/aula-usp-avaliar/SKILL.md`;
  - `build/pacotes.mjs`: o pacote novo leva `references/rubrica.json`, copiado de `avaliador/`, e o que mais o `SKILL.md` citar;
  - `guia/pacotes/skill.md`, `projeto-claude.md` e `gpt-instrucoes.md`: um parágrafo curto sobre o modo "avaliar".

**O `SKILL.md`** tem frontmatter com `name: aula-usp-avaliar` e uma `description` que diz quando usar ("quando o autor pedir para avaliar, julgar, revisar a qualidade de uma aula ou de um slide"). O corpo:
1. roda `aula-usp avaliar <pasta> --json --fotos <pasta>/avaliacao-fotos` (e `--minutos`, se o autor disser a duração);
2. para cada slide, olha a foto e responde as `pergunta`s dos critérios julgados de `references/rubrica.json`, com nível, evidência de uma frase apontando o elemento, e sugestão;
3. escreve `<pasta>/avaliacao.md`, com um resumo no topo e uma tabela por slide (critério, fonte, nível, evidência, sugestão), juntando os medidos e os julgados;
4. não edita a aula; ao final, oferece encaminhar as sugestões aceitas para correção.

O corpo também diz como avaliar sem CLI (no claude.ai e no ChatGPT): lendo a rubrica e medindo à mão os critérios medidos, com as mesmas definições.

- [ ] **Passo 1:** escrever as fontes.
- [ ] **Passo 2:** rodar `npm run guia` e `aula-usp pacotes`.
- [ ] **Passo 3: guardas.**
  - A de citações do pacote vale para o pacote novo: confira que o universo dela inclui `pacotes/skill/aula-usp-avaliar`. Se o conjunto `PACOTES` do teste for literal, acrescente; se for derivado de `FONTES_DE_PACOTE`, isso é a sétima do `AGENTS.md` e precisa de fonte independente.
  - O teto do GPT tem de continuar ≤ 8.000; diga a folga.
  - O bloco de regras essenciais continua igual nos pacotes que o levam.
- [ ] **Passo 4:** `tests/aceite/avaliar.md` traz o roteiro de aceite para o autor rodar no Claude Code com o pacote `skill/`. O pedido é avaliar `exemplos/descida-do-gradiente` e uma aula deliberadamente ruim (em `tests/aceite/aulas/ruim-para-avaliar/`, que valida limpa mas quebra N1, N3, N6 e U-itens). O critério de aceite é a skill apontar essas quebras e nenhuma falsa grave no exemplo.
- [ ] **Passo 5:** as duas suítes inteiras e commit.

### Tarefa 5: versão 1.1.0 e documentação

- [ ] **`AGENTS.md`:**
  - a tabela de comandos ganha `avaliar`;
  - a fronteira passa a listar `avaliador/` entre os diretórios sem `node:` (remeça: zero `node:` nos cinco);
  - a tabela de gerados, se a rubrica em `pacotes/` for gerada;
  - as contagens de arquivos de teste.
- [ ] **Spec do sistema:** a 8.1 ganha o comando `avaliar`, com uma frase e a remissão à spec nova.
- [ ] **Versão:** `package.json` em `1.1.0`; depois `node bin/aula-usp.mjs dist` e `node bin/aula-usp.mjs pacotes`, nessa ordem; meça as tags (`grep -rho 'aula-usp@[0-9.]*' modelos especime exemplos pacotes | sort | uniq -c`) e os 11 `sha384-`.
- [ ] **Publicação:** o `files` do `package.json` inclui `avaliador/`. Confira com `tests/unit/publicacao.test.mjs` e com `tests/integracao/instalacao.test.mjs`. Acrescente, no teste de instalação, `avaliar` no pacote instalado: a aula nova avaliada sai com 0, e `--json` tem pelo menos o resumo.
- [ ] **As duas suítes inteiras e commit.** Não publique.

### Revisão final

Revisão da branch inteira contra a spec nova, rodada única de correção, re-revisão com escopo. Relatório em `docs/superpowers/revisoes/2026-09-28-aula-usp-avaliar-revisao-final.md`. Merge, push e publicação só com o "sim" do autor.
