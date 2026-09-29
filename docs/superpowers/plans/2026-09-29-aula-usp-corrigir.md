# Corrigir (1.2.0): plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans, tarefa a tarefa. Passos com caixa (`- [ ]`).

**Objetivo:** corrigir um slide específico de uma aula sem tocar em mais nada do arquivo. São três peças:
- o comando `aula-usp slide`, que imprime o fonte de um slide ou troca exatamente aquela `section`;
- `aula-usp validar --slide`;
- a skill `aula-usp-corrigir`.

**Arquitetura:**
- **`build/secoes.mjs`:** um localizador de `section`s por **intervalo de bytes** no texto do fonte, sem parser de DOM, porque o DOM não preserva os bytes. A troca é por fatia: `texto.slice(0, inicio) + novo + texto.slice(fim)`.
- **A CLI** usa o localizador.
- **A skill** combina `slide`, `validar --slide` e `avaliar --slide --fotos`.

**Spec:** `docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md`, seções 5, 7, 8 e 10. A spec do sistema vale onde esta não diz nada.

## Restrições globais

- `AGENTS.md` inteiro vale, com toda guarda de propriedade acompanhada da sua inversão medida.
- **A garantia central:** fora do intervalo trocado, o arquivo fica **idêntico byte a byte**. Nada de reformatar, normalizar fim de linha ou reescrever pelo DOM.
- **Nada de rede.** Nada de publicar; merge e push só com o autor.
- **Português** em tudo. Cada commit termina com exatamente `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Nenhuma mensagem afirma mais do que a evidência sustenta.
- **As duas suítes inteiras** no fim de cada tarefa de código.

## Fatos medidos (main em `6630a54`, 1.1.0 publicada)

1. **Numeração:** `validador/validar.js:slidesDoFonte(corpo)` dá os slides do fonte, e `onde(slides, secao)` dá `{ slide, id }` com `slide` começando em 1. É essa a numeração que `validar`, `avaliar` e o motor usam, e `slide <n>` tem de concordar com ela. A guarda de concordância está na Tarefa 1.
2. **Argumentos da CLI:** `bin/aula-usp.mjs` tem `lerArgumentos(argumentos, flagsPermitidas)` com `FLAGS_COM_VALOR` (`--slide`, `--minutos`, `--fotos`) e um conjunto `FLAGS_*` por comando; hoje `FLAGS_VALIDAR = {'--json'}`. Flag de outro comando sai com o uso e código 2.
3. **Avaliar e fotografar:** `build/avaliar.mjs` exporta `avaliarArquivo(alvo, { slide, minutos })` e `fotografar(caminho, pasta, { contrato, slide, antesDaFoto })`. É com isso que a skill tira as fotos de antes e depois (`aula-usp avaliar <pasta> --slide <id> --fotos <dir>`).
4. **Validar:** `build/validar.mjs:validarArquivo(alvo)` devolve os achados da aula inteira, cada um com `slide` (a posição, ou `null` para os de aula) e `id`.
5. **Pacotes:** `build/guia.mjs:FONTES_DE_PACOTE` e `build/pacotes.mjs`, que levam a pasta `pacotes/skill/aula-usp-avaliar`, são o molde para `aula-usp-corrigir`. A lista literal `PACOTES` de `tests/unit/pacotes.test.mjs` precisa ganhar a pasta nova.
6. **Os fontes:** as aulas são HTML escrito à mão, e dentro de uma `section` pode haver `<script type="application/json">` (gráfico, diagrama), comentários e `pre` com código. O texto "`</section>`" pode aparecer dentro de `pre` só escapado (`&lt;/section&gt;`), mas pode aparecer cru dentro de um comentário ou de um `script`.

## Decisões deste plano

- **D1, o localizador.**
  - Percorre o texto e ignora o conteúdo de comentários (`<!-- … -->`) e de `script`/`style`, como texto cru até o fechamento.
  - Reconhece `<section` (seguido de espaço, `>` ou `/`, sem distinção de caixa) e o `</section>` correspondente.
  - Uma `section` aninhada em outra é recusada com mensagem clara ("section dentro de section na linha N"), porque o contrato não a admite.
  - O intervalo vai do `<` de `<section` até o `>` de `</section>`, inclusive. O espaço em volta não entra.
  - Devolve `[{ inicio, fim, id, linha }]`.
- **D2, `slide <pasta> <alvo>`.** O alvo é um id ou uma posição, de 1 a N. Um id que existe ganha de um número que parece posição, e um número sem id igual é posição. Sem `--substituir`, imprime a fatia exata no stdout, sem acrescentar nada, e sai com 0.
- **D3, `--substituir <arquivo>`.** O arquivo tem de conter **exatamente uma** `section`, com espaço só em volta dela; com `--dividir`, exatamente duas.
  - **O id:** o da primeira `section` nova tem de ser igual ao do original, salvo com `--forcar`. Com `--dividir`, a segunda precisa de um id que não exista na aula.
  - **A escrita:** fatia, grava num temporário na mesma pasta e renomeia, que é atômico. Depois imprime "slide N #id substituído" e sai com 0.
  - **As recusas** (alvo inexistente, arquivo com zero ou três `section`s, id trocado sem `--forcar`, id repetido no `--dividir`) saem com 1 e mensagem de uma linha. As de uso (falta argumento, flag errada) saem com 2.
  - **O que não faz:** não valida a aula; quem valida é `validar --slide`, e a skill roda os dois.
- **D4, `validar --slide <alvo>`.** Valida a aula inteira, como hoje, e imprime só os achados cujo `slide` é o pedido. Depois uma linha: "N achados em outros slides e M da aula, fora deste relatório". O código de saída é 1 se houver **erro** naquele slide, e 0 caso contrário. Com `--json`, imprime a lista filtrada. Um alvo inexistente sai com 1.

---

### Tarefa 1: o localizador de `section`s

**Arquivos:**
- Criar: `build/secoes.mjs` e `tests/unit/secoes.test.mjs`.

**Interfaces:**
- `localizarSecoes(texto)` devolve `[{ inicio, fim, id, linha }]`, ou lança um `Error` com a linha.
- `resolverAlvo(secoes, alvo)` devolve o índice de 0 a N-1, ou `-1`, pela D2.
- `substituirSecao(texto, secoes, indice, novo)` devolve o texto novo.

- [ ] **Passo 1: testes.**
  - Casos mínimos: comentário contendo `</section>`; `script` JSON contendo `</section>`; atributos com aspas simples e duplas; `<SECTION>` em maiúsculas; `section` aninhada, que é recusada; CRLF.
  - **Propriedade 1, a concordância:** em todo deck de `especime/`, `exemplos/*/index.html` e `modelos/aula/index.html`, a lista de ids e a contagem de `localizarSecoes` batem com `slidesDoFonte` (via `lerAula`). O universo é a lista de arquivos no disco, e não o que o localizador acha.
  - **Propriedade 2, a identidade:** para todo deck acima e toda `section` dele, substituir a `section` por ela mesma dá o texto original byte a byte.
  - **Propriedade 3, só o intervalo muda:** substituir a k-ésima por um marcador deixa `texto.slice(0, inicio)` e `texto.slice(fim)` intactos, e o resultado contém o marcador uma vez.
- [ ] **Passo 2:** ver cair; implementar; ver passar.
- [ ] **Passo 3: inversões.**
  - Tirar o tratamento de comentário faz cair o caso do comentário.
  - Trocar a fatia por uma reconstrução via DOM (por exemplo, `outerHTML` do linkedom) faz cair a Propriedade 2 em algum deck do espécime. Meça em qual e registre.
- [ ] **Passo 4:** as duas suítes inteiras e commit.

### Tarefa 2: o comando `aula-usp slide`

**Arquivos:**
- Modificar: `bin/aula-usp.mjs` (comando `slide`, `FLAGS_SLIDE = {'--substituir', '--dividir', '--forcar'}`, e `--substituir` em `FLAGS_COM_VALOR`; as outras duas são booleanas) e `README.md` ("Os comandos").
- Criar: `tests/unit/slide-cli.test.mjs`.

- [ ] **Passo 1: testes de CLI.** Numa cópia temporária do modelo:
  - imprimir por id e por posição;
  - substituir mantendo o id;
  - recusar id trocado, e aceitá-lo com `--forcar`;
  - `--dividir` com id novo, e com id repetido, recusado;
  - arquivo com zero e com três `section`s, recusado com 1;
  - flags de `slide` em outro comando, recusadas com 2.

  Em toda substituição aceita, o arquivo resultante é igual a `antes.slice(0, inicio) + novo + antes.slice(fim)`, calculado no teste com o localizador, e a aula resultante **valida sem erro**: use um `section` novo válido.
- [ ] **Passo 2:** implementar pela D2 e pela D3, com escrita atômica.
- [ ] **Passo 3:** as duas suítes inteiras e commit.

### Tarefa 3: `validar --slide`

**Arquivos:**
- Modificar: `bin/aula-usp.mjs` (`FLAGS_VALIDAR` ganha `--slide`) e `tests/unit/validar-cli.test.mjs`.

- [ ] **Passo 1: testes.** Uma aula com um erro no slide 3 e um aviso no slide 5:
  - `--slide 3` imprime só o erro, a linha "fora deste relatório" e sai com 1;
  - `--slide 5` imprime o aviso e sai com 0;
  - `--slide` por id;
  - alvo inexistente sai com 1;
  - `--json --slide` sai com a lista filtrada.

  Para o alvo, use o mesmo `resolverAlvo` da Tarefa 1, sobre o localizador, para que `slide` e `validar` nunca discordem do que é o slide N.
- [ ] **Passo 2:** implementar.
- [ ] **Passo 3: inversão.** Sem o filtro, o teste do slide 5 cai, porque aparece o erro do slide 3.
- [ ] **Passo 4:** as duas suítes inteiras e commit.

### Tarefa 4: a skill `aula-usp-corrigir` e o guia

**Arquivos:**
- Criar: `guia/pacotes/skill-corrigir.md` e `tests/aceite/corrigir.md`.
- Modificar:
  - `guia/80-avaliar-corrigir-gerar.md`: seção "Corrigir um slide";
  - `build/guia.mjs` e `build/pacotes.mjs`: o pacote `pacotes/skill/aula-usp-corrigir/`, com o `SKILL.md` e o que ele citar;
  - `tests/unit/pacotes.test.mjs`: a lista `PACOTES`;
  - `guia/pacotes/skill.md`, `projeto-claude.md` e `gpt-instrucoes.md`: um parágrafo curto do modo corrigir.

**O `SKILL.md`** tem `name: aula-usp-corrigir` e uma descrição: "Use quando o autor pedir para corrigir, reescrever, encurtar ou melhorar um slide específico de uma aula do Aula USP, ou para aplicar a um slide as sugestões de avaliacao.md ou os achados do validador". O corpo:
1. identifica o slide (id ou posição) e o pedido, que vem do autor, de `avaliacao.md` ou de `validar`;
2. tira a foto de antes (`aula-usp avaliar <pasta> --slide <alvo> --fotos <pasta>/correcao/antes`) e lê o fonte com `aula-usp slide`;
3. escreve a `section` nova num arquivo e troca com `--substituir`. Se o pedido exigir outro slide, para e pede autorização ao autor, e então usa `--dividir`;
4. roda `aula-usp validar --slide` até 0 erros e, se o pedido veio de uma avaliação, `aula-usp avaliar --slide`. Faz no máximo 3 voltas; se não convergir, devolve o original com `--substituir` e diz por quê;
5. tira a foto de depois e mostra as duas ao autor;
6. nunca edita outro slide, nem o `head`, nem as metas.

O corpo também diz como corrigir sem CLI (claude.ai e ChatGPT): reescrever só a `section` pedida e devolver a aula inteira com as outras `section`s idênticas.

- [ ] **Passo 1:** escrever; `npm run guia` e `aula-usp pacotes`.
- [ ] **Passo 2: guardas.** A de citações vale para o pacote novo. O teto do GPT tem de ficar ≤ 8.000: diga a folga, que hoje é de 1.696. O bloco essencial fica igual.
- [ ] **Passo 3:** `tests/aceite/corrigir.md` é o roteiro para o autor, no Claude Code. Parte de uma aula e pede três correções: encurtar um título-rótulo que a avaliação acusou; trocar uma lista longa por passos; dividir um slide com a autorização dele. O critério de aceite:
  - diff limitado à `section` pedida, conferido com `git diff --stat` e com o localizador;
  - validação limpa;
  - a foto de antes e a de depois entregues.
- [ ] **Passo 4:** as duas suítes inteiras e commit.

### Tarefa 5: versão 1.2.0 e documentação

- [ ] **`AGENTS.md`:** o comando `slide` na tabela; `validar --slide`; `build/` passa a 22 arquivos (remeça); as contagens de testes.
- [ ] **`README.md`:**
  - "Skills para agentes" ganha a linha da `aula-usp-corrigir` e a tira da lista "virão nas próximas versões";
  - o exemplo de uso ganha "corrija o slide #variancia: o título está longo";
  - o `cp` passa a copiar as três pastas.
- [ ] **A spec do sistema, 8.1:** o comando `slide`.
- [ ] **Versão:** `package.json` em `1.2.0`, depois `aula-usp dist` e `aula-usp pacotes`, nessa ordem; meça as tags e os 11 `sha384-`.
- [ ] **Instalação:** `tests/integracao/instalacao.test.mjs` passa a rodar `slide` no pacote instalado. Numa aula nova: imprimir e substituir o slide 2 por ele mesmo, e o arquivo continua idêntico.
- [ ] **As duas suítes inteiras e commit.** Não publique.

### Revisão final

Revisão da branch inteira contra a spec, rodada única de correção, re-revisão. Relatório em `docs/superpowers/revisoes/2026-09-29-aula-usp-corrigir-revisao-final.md`.
