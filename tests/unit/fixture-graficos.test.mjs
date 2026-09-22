// tests/fixtures/graficos/deck.html (Tarefa 3 da fase 2a) traz a tag do runtime com versão e
// integrity FIXADOS À MÃO, porque fica fora das três pastas que `aula-usp pacotes` reescreve
// (modelos/, especime/, exemplos/ — spec 8.1): o próprio comentário da fixture explica por quê —
// ela precisa validar limpo pela CLI (fase 1) enquanto outros decks do espécime não podem ganhar
// gráfico ainda, então mora fora do alcance de `especime/`.
//
// Isso significa que NADA regenera essa tag sozinho. Medido, achado nesta tarefa: depois que a
// Tarefa 4 mudou validador/regras/ e regerou dist/aula-usp.js, o hash de dist/manifesto.json mudou
// (era sha384-+zzfKF8n…, virou sha384-3/GwuwUn…) e a fixture ficou com o hash VELHO — o Chrome
// recusa a tag por integrity errado, a aula nunca monta, e tests/integracao/dist.test.mjs trava por
// 30 s em cada teste que abre este deck (esperarMontagem nunca vê data-montado, porque a montagem
// nunca chega a rodar). Sem esta guarda, o defeito só aparece como um timeout de Chrome — que lê como
// "ambiental" e esconde a causa real, que é determinística e local a este arquivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);
const texto = (caminho) => readFileSync(new URL(caminho, RAIZ), 'utf8');

test('a tag fixada de tests/fixtures/graficos/deck.html traz o integrity atual de dist/aula-usp.js', () => {
  const { version } = JSON.parse(texto('package.json'));
  const manifesto = JSON.parse(texto('dist/manifesto.json'));
  const { integrity } = manifesto.arquivos['aula-usp.js'];
  assert.match(integrity, /^sha384-[A-Za-z0-9+/]{64}$/, 'dist/manifesto.json não traz um integrity sha384 de aula-usp.js');

  const fixture = texto('tests/fixtures/graficos/deck.html');
  assert.ok(
    fixture.includes(`https://cdn.jsdelivr.net/npm/aula-usp@${version}/dist/aula-usp.js`),
    'a fixture não traz o src com a versão de package.json — regenere a tag à mão (spec 8.1) e cole aqui',
  );
  assert.ok(
    fixture.includes(`integrity="${integrity}"`),
    'a fixture está com o integrity de dist/aula-usp.js DESATUALIZADO — o Chrome vai recusar a tag e '
    + 'tests/integracao/dist.test.mjs trava por 30s achando que é um problema ambiental. Cole o '
    + `integrity atual (${integrity}) na tag de tests/fixtures/graficos/deck.html.`,
  );
});
