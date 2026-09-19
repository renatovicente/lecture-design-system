// A cobertura do HTML final é sistema ∪ KaTeX embutido, e varia por aula. Os números aqui foram
// medidos nas fontes deste repositório; se a sua contagem divergir, PARE e relate, não ajuste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { embutirFontes, FAMILIA_POR_CLASSES } from '../../build/fontes-embutidas.mjs';

const RAIZ = new URL('../../', import.meta.url);
const documentoDe = async (caminho) => parseHTML(await readFile(new URL(caminho, RAIZ), 'utf8')).document;

test('as oito fontes do sistema entram sempre, como data URI', async () => {
  const { css } = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  const embutidas = [...css.matchAll(/data:font\/woff2;base64,/g)].length;
  assert.ok(embutidas >= 8, `só ${embutidas} fontes embutidas; as do sistema são 8`);
  assert.equal(/url\((?!data:)/.test(css), false, 'sobrou url() que não é data URI');
});

// Fato 8: sem as fontes do KaTeX, sete caracteres de uma aula com matemática ficariam sem glifo.
//
// Rodada de correção 1 [Important]: a revisão apagou só a entrada op-symbol+large-op -> KaTeX_Size2
// (o caso do \sum em destaque) e reconstruiu — as asserções originais aqui (familias.length > 0,
// cobertura crescendo, os 7 caracteres com glifo) passaram TODAS, porque ∑ (U+2211) também tem glifo
// em KaTeX_Size1, já embutido por outro motivo. A cobertura continua "correta" (o code point tem
// glifo em ALGUM arquivo embutido) mas o glifo que PINTA é o errado — CSS pede KaTeX_Size2 para
// .op-symbol.large-op, esse @font-face nunca resolve sem o arquivo, e o navegador cai para a fonte de
// reserva do sistema. Defeito de FORMA (família errada), não de ausência de glifo — e cobertura, por
// design (fato 8), só enxerga ausência. Por isso a lista exata, não characterset nem contagem.
test('uma aula com matemática traz também a cobertura do KaTeX, com as famílias exatas', async () => {
  const semTex = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  const comTex = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/matematica.html') });
  assert.deepEqual([...comTex.familias].sort(), ['KaTeX_Main', 'KaTeX_Math', 'KaTeX_Size1', 'KaTeX_Size2'],
    'as famílias detectadas em matematica.html mudaram — se foi de propósito, atualize aqui e diga por quê');
  assert.ok(comTex.cobertura.size > semTex.cobertura.size, 'a cobertura não cresceu com o KaTeX');
  for (const caractere of 'η←∇∑⊤Δ⋅') {
    assert.ok(comTex.cobertura.has(caractere.codePointAt(0)), `${caractere} deveria ter glifo no HTML final`);
  }
});

// Rodada de correção 1 [Important]: a lista exata acima só protege o que matematica.html exercita —
// apagar uma entrada que este espécime não usa (mathfrak, por exemplo) não mudaria familias nenhuma
// e passaria batido. A rede de proteção de verdade é comparar a tabela inteira, linha a linha, contra
// o que node_modules/katex/dist/katex.min.css REALMENTE declara — assim uma atualização do KaTeX (ou
// uma edição por engano) que adicione, remova ou renomeie uma regra de família é pega sem depender de
// nenhum espécime tocar justo naquela classe.
//
// Extração medida como robusta o bastante para valer como teste: katex.min.css não tem @media nem
// chave aninhada (medido: só os vinte @font-face, um por arquivo woff2, zero outro at-rule), então
// "seletor{corpo}" no nível mais simples já separa as regras; font-family:KaTeX_* (com ou sem aspas,
// a diferença entre a regra de classe e o @font-face) marca quem interessa; e o próprio ".katex" de
// escopo é descartado dos dois lados antes de comparar, porque a tabela desta implementação nunca o
// lista (é sempre verdadeiro, não distingue nada). Rodado à mão contra o arquivo instalado (katex
// 0.18.7): 33 pares de cada lado, união e diferença vazias.
function familiasDeclaradasNaCssDoKatex(cssBruta) {
  const semFontFace = cssBruta.replace(/@font-face\{[^}]*\}/g, '');
  const pares = new Set();
  for (const [, seletor, corpo] of semFontFace.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const familia = /font-family:\s*"?(KaTeX_[A-Za-z0-9]+)"?/.exec(corpo)?.[1];
    if (!familia) continue;
    for (const alternativa of seletor.split(',')) {
      const classes = [...alternativa.matchAll(/\.([\w-]+)/g)].map(([, c]) => c).filter((c) => c !== 'katex');
      if (classes.length > 0) pares.add(`${[...classes].sort().join('.')}=>${familia}`);
    }
  }
  return pares;
}

const canonico = (tabela) => [...new Set(tabela.map(([classes, familia]) => `${[...classes].sort().join('.')}=>${familia}`))].sort();

test('a tabela de classe->família cobre exatamente o que katex.min.css declara (guarda contra o KaTeX envelhecer)', async () => {
  const cssBruta = await readFile(new URL('node_modules/katex/dist/katex.min.css', RAIZ), 'utf8');
  const daCss = [...familiasDeclaradasNaCssDoKatex(cssBruta)].sort();
  assert.deepEqual(canonico(FAMILIA_POR_CLASSES), daCss,
    'FAMILIA_POR_CLASSES não bate mais com as regras font-family: KaTeX_* de katex.min.css — o KaTeX foi atualizado, ou a tabela tem um erro; confira a diferença');
});

// Rodada de correção 1 [Minor]: delimsizing.mult (o delimitador extensível de mais de um glifo) não
// aparecia em nenhum espécime nem fixture. Medido no próprio código do KaTeX
// (node_modules/katex/src/delimiter.ts, makeStackedDelim): "(", ")", "[", "]", floor/ceil e as barras
// verticais desenham um SVG quando crescem demais e NUNCA passam por delim-size1/delim-size4 — por
// isso \left(\frac{a}{b}\right) (o exemplo mais óbvio) não serve de fixture: medido que ele nem chega
// a precisar de .mult (fica em .delimsizing.sizeN, glifo único). Os dois únicos casos que realmente
// empilham GLIFO (sem SVG) são \{ \} — sempre KaTeX_Size4 — e as setas empilhadas (\uparrow etc.) —
// sempre KaTeX_Size1. \begin{cases} é o caso realista (função por partes); a seta empilhada é só
// para fechar o par, sem pretensão de parecer uma aula de verdade.
test('delimsizing.mult: \\begin{cases} alto usa KaTeX_Size4, seta empilhada usa KaTeX_Size1', async () => {
  const tex = String.raw`
    \[ L(x) = \begin{cases} x^2 & x < 1 \\ 2x - 1 & x \geq 1 \\ 0 & \text{terceiro caso} \\ 1 & \text{quarto caso} \end{cases} \]
    \[ \left\uparrow \begin{matrix} a & b \\ c & d \\ e & f \\ g & h \end{matrix} \right\uparrow \]
  `;
  const { document } = parseHTML(`<!DOCTYPE html><html><body><p>${tex}</p></body></html>`);
  const { familias } = await embutirFontes({ raiz: RAIZ, doc: document });
  assert.ok(document.querySelector('.delimsizing.mult'), 'o TeX de teste não gerou delimsizing.mult — o espécime sintético não serve mais');
  assert.ok(familias.includes('KaTeX_Size4'), `esperava KaTeX_Size4 (chave empilhada do \\begin{cases}); veio ${familias.join(', ')}`);
  assert.ok(familias.includes('KaTeX_Size1'), `esperava KaTeX_Size1 (seta empilhada); veio ${familias.join(', ')}`);
});

test('uma aula sem matemática não carrega fonte de KaTeX nenhuma', async () => {
  const { familias, css } = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/index.html') });
  assert.deepEqual(familias, [], `aula sem TeX trouxe famílias do KaTeX: ${familias.join(', ')}`);
  assert.equal(css.includes('KaTeX_'), false);
});

// Medido ao implementar (não estava nos três testes do brief): especime/matematica.html usa a classe
// solta "size3" para ESCALA DE FONTE (no expoente de w^\top), não para família — e usa exatamente as
// classes de tamanho que a implementação precisa acertar em par (op-symbol+small-op/large-op no \sum,
// delimsizing+size1 no \left(...\right)). Esta aula é o único espécime que exercita ambas as formas do
// \sum (em texto e em destaque), por isso ela sozinha já cobre a guarda "nenhum url() cru sobra, nem
// quando o KaTeX entra" — o teste acima só prova isso para a aula SEM TeX.
test('com KaTeX incluído, também não sobra url() que não seja data URI nem url() vazio', async () => {
  const { css, familias } = await embutirFontes({ raiz: RAIZ, doc: await documentoDe('especime/matematica.html') });
  assert.ok(familias.length > 0, 'espécime de matemática não trouxe família nenhuma do KaTeX');
  assert.equal(/url\((?!data:|\))/.test(css), false, 'sobrou url() que não é nem data URI nem vazio');
});
