# Revisão final — corrigir (1.2.0)

Branch `worktree-agent-a132a558548766f11`, de `d5c2593` ao commit da correção. Plano: `docs/superpowers/plans/2026-09-29-aula-usp-corrigir.md`. Spec: `docs/superpowers/specs/2026-09-28-aula-usp-skills-design.md`, seção 5.

## O que a branch entrega

- **`build/secoes.mjs`:** o localizador de `section`s por intervalo de bytes, que ignora comentários e `script`/`style`. Três propriedades medidas em todos os decks do espécime, dos exemplos e do modelo:
  - concorda com `slidesDoFonte`;
  - trocar cada `section` por ela mesma devolve o arquivo idêntico;
  - trocar uma `section` só muda o intervalo dela.

  Inversão: reconstruindo pelo linkedom, a identidade quebra nos 10 decks, e o `outerHTML` difere do fonte em 21 das 108 `section`s.
- **`aula-usp slide <pasta> <alvo>`,** com `--substituir`, `--dividir` e `--forcar`, e escrita atômica.
- **`aula-usp validar --slide`.**
- **A skill `aula-usp-corrigir`,** a seção do guia, os modos no claude.ai e no GPT (o `instrucoes.txt` tem 6.599 caracteres de 8.000), e o roteiro de aceite `tests/aceite/corrigir.md`.
- **Versão 1.2.0.**

## A revisão

- **Important, corrigido:** `avaliar --slide` e as fotos tratavam número sempre como posição, enquanto `slide` e `validar --slide` fazem um id existente ganhar. Numa aula com um id só de algarismos, a skill de corrigir fotografaria um slide e trocaria outro. Agora os três seguem a mesma regra: `indiceDoAlvo`, em `avaliador/`, repete `resolverAlvo`, de `build/`. O teste "os três comandos escolhem o mesmo slide" prende as duas; inversão medida.
- **Aceitas como estão:**
  - com `--forcar`, o id novo não pode repetir outro;
  - arquivo ou aula ausente sai com 2;
  - `validar --slide` imprime o cabeçalho dos achados filtrados.
- **Aberto:**
  - **A foto de antes de um slide com erro de validação** não sai: `avaliar --fotos` recusa aula inválida. A skill segue sem essa foto e avisa o autor. A spec 5.2 pede as duas fotos.
  - **O localizador aceita uma `section` que não seja filha direta do `body`,** e `slidesDoFonte` não; nenhum fonte válido tem isso.

**Medido no fim:** `npm test` 758/758, `npm run test:integracao` 268/268.
