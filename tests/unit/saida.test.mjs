// As três regras da spec 9.2 que rodam sobre o HTML final. Grupo "saida": não roda no navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { readFileSync } from 'node:fs';
import { validar } from '../../validador/validar.js';
import { REGRAS_DE_SAIDA } from '../../validador/regras/index.js';

const contrato = JSON.parse(readFileSync(new URL('../../contrato/contrato.json', import.meta.url), 'utf8'));
const COBERTURA = new Set([...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?()-—çãõáéíóúâêô'].map((c) => c.codePointAt(0)));

// [Rodada de correção 2, I1] cobertura virou duas: coberturaSistema vale em qualquer lugar,
// coberturaKatex só dentro de um elemento `.katex`. Os testes que não mencionam nenhuma das duas
// continuam com o comportamento de sempre — só prosa comum, então só coberturaSistema importa.
const saida = (corpo, { coberturaSistema = COBERTURA, coberturaKatex, bytes = 1000 } = {}) => {
  const doc = parseHTML(`<!DOCTYPE html><html lang="pt-BR"><head><title>t</title></head><body>${corpo}</body></html>`).document;
  return validar(doc, { contrato, regras: REGRAS_DE_SAIDA, grupo: 'saida', coberturaSistema, coberturaKatex, bytes });
};
const regras = (achados) => achados.map((a) => a.regra);

test('imagem com src http acusa referência externa', () => {
  const achados = saida('<section data-layout="conteudo" id="s"><figure><img src="https://exemplo/x.png" alt="x"></figure></section>');
  assert.deepEqual(regras(achados), ['saida.referencia-externa']);
  assert.equal(achados[0].slide, 1);
});

test('imagem em data URI não acusa: é exatamente o que o build produz', () => {
  assert.deepEqual(saida('<section data-layout="conteudo"><figure><img src="data:image/png;base64,AA==" alt="x"></figure></section>'), []);
});

// Spec 9.2, textual: links <a href="https://…"> NÃO contam.
test('link para fora não é referência externa', () => {
  assert.deepEqual(saida('<section data-layout="conteudo"><p><a href="https://usp.br">USP</a></p></section>'), []);
});

test('folha de estilo por href acusa', () => {
  const doc = parseHTML('<!DOCTYPE html><html lang="pt-BR"><head><title>t</title><link rel="stylesheet" href="https://exemplo/e.css"></head><body><section data-layout="conteudo"><p>oi</p></section></body></html>').document;
  assert.deepEqual(regras(validar(doc, { contrato, regras: REGRAS_DE_SAIDA, grupo: 'saida', coberturaSistema: COBERTURA, bytes: 10 })), ['saida.referencia-externa']);
});

test('url() de arquivo dentro de <style> acusa; data URI e url(#id) não', () => {
  const comArquivo = saida('<section data-layout="conteudo"><p>oi</p></section><style>@font-face{src:url(x.woff2)}</style>');
  assert.deepEqual(regras(comArquivo), ['saida.referencia-externa']);
  assert.deepEqual(saida('<section data-layout="conteudo"><p>oi</p></section><style>@font-face{src:url(data:font/woff2;base64,AA==)}</style>'), []);
  assert.deepEqual(saida('<section data-layout="conteudo"><p>oi</p></section><style>.a{clip-path:url(#corte)}</style>'), []);
});

// Fato 9: a regra percorre o DOM, nunca o texto do arquivo. O motor embutido contém, no fonte
// minificado, um trecho que reescreve url(#id) de SVG — e um grep o leria como CSS.
test('url() dentro de <script> não acusa: é código, não folha de estilo', () => {
  const comScript = saida('<section data-layout="conteudo"><p>oi</p></section>'
    + '<script>var r = /url\\(\\s*#([^)]+)\\)/g; var s = "url(" + a + "#" + b + ")";</script>');
  assert.deepEqual(regras(comScript), []);
});

test('acima de 10 MB avisa; abaixo, não', () => {
  const grande = saida('<section data-layout="conteudo"><p>oi</p></section>', { bytes: 11 * 1024 * 1024 });
  assert.deepEqual(regras(grande), ['saida.tamanho']);
  assert.equal(grande[0].severidade, 'aviso');
  assert.deepEqual(saida('<section data-layout="conteudo"><p>oi</p></section>', { bytes: 9 * 1024 * 1024 }), []);
});

// [Rodada de correção 1] O limiar vem de contrato.limites['saida.megabytes'], nunca de um valor
// fixo no código (a mesma regra que limites.js já segue para os outros 24). Prova por injeção: um
// contrato com o limiar baixado para 1 MB faz uma aula de 2 MB avisar — um valor fixo no código
// nunca deixaria isto mudar.
test('saida.tamanho lê o limiar do contrato, não um valor fixo no código', () => {
  const comLimiteBaixo = { ...contrato, limites: { ...contrato.limites, 'saida.megabytes': 1 } };
  const doc = parseHTML('<!DOCTYPE html><html lang="pt-BR"><head><title>t</title></head><body><section data-layout="conteudo"><p>oi</p></section></body></html>').document;
  const achados = validar(doc, {
    contrato: comLimiteBaixo, regras: REGRAS_DE_SAIDA, grupo: 'saida', coberturaSistema: COBERTURA, bytes: 2 * 1024 * 1024,
  });
  assert.deepEqual(regras(achados), ['saida.tamanho']);
});

test('caractere sem glifo na cobertura do HTML final acusa, uma vez por slide', () => {
  const achados = saida('<section data-layout="conteudo" id="s"><p>Soma: ∑ e de novo ∑</p></section>');
  assert.deepEqual(regras(achados), ['saida.glifo-ausente']);
  assert.match(achados[0].mensagem, /∑/);
});

// Fato 8 + I1 (revisão final do 5b): a cobertura do KaTeX só é alcançável DENTRO de `.katex` — a CSS
// nunca nomeia essas famílias fora dali. Um caractere que só está em coberturaKatex tem de continuar
// acusando em prosa comum (é a divergência que a revisão final mediu: Σ → Γ Ω em prosa, achados: []),
// mas para de acusar dentro de um `.katex` de verdade.
test('caractere só em coberturaKatex: acusa em prosa, não acusa dentro de .katex', () => {
  const soKatex = new Set(['∑'.codePointAt(0)]);
  const emProsa = saida('<section data-layout="conteudo"><p>Soma: ∑</p></section>', { coberturaKatex: soKatex });
  assert.deepEqual(regras(emProsa), ['saida.glifo-ausente'], 'coberturaKatex não pode valer fora de .katex');

  const dentroDoKatex = saida('<section data-layout="conteudo"><p><span class="katex">∑</span></p></section>', { coberturaKatex: soKatex });
  assert.deepEqual(dentroDoKatex, [], 'coberturaKatex deveria valer dentro de .katex (fato 8)');
});

// coberturaSistema, ao contrário, vale em qualquer lugar — é a mesma fonte que pintaria o caractere
// nos dois casos.
test('caractere em coberturaSistema não acusa nem em prosa nem dentro de .katex', () => {
  const comSistema = new Set([...COBERTURA, '∑'.codePointAt(0)]);
  assert.deepEqual(saida('<section data-layout="conteudo"><p>Soma: ∑</p></section>', { coberturaSistema: comSistema }), []);
  assert.deepEqual(saida('<section data-layout="conteudo"><p><span class="katex">∑</span></p></section>', { coberturaSistema: comSistema }), []);
});

test('sem coberturaSistema no contexto a regra de glifo se cala, em vez de acusar tudo', () => {
  const doc = parseHTML('<!DOCTYPE html><html lang="pt-BR"><head><title>t</title></head><body><section data-layout="conteudo"><p>∑</p></section></body></html>').document;
  const achados = validar(doc, { contrato, regras: REGRAS_DE_SAIDA, grupo: 'saida', bytes: 10 });
  assert.equal(regras(achados).includes('saida.glifo-ausente'), false);
});
