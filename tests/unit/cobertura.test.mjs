// A cobertura é a fonte única de "este caractere tem glifo?" para duas regras de severidade ERRO
// (spec 9.3). Os números aqui foram medidos nas fontes reais deste repositório.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarCobertura, lerCobertura } from '../../build/cobertura.mjs';

const RAIZ = new URL('../../', import.meta.url);

test('a cobertura sai das oito fontes do sistema e guarda os 429 pontos medidos', async () => {
  const cobertura = await gerarCobertura({ raiz: RAIZ });
  assert.equal(cobertura.fontes.length, 8);
  // 433 é a união crua do cmap; 429 é o que sobra depois do filtro de pontos inutilizáveis.
  assert.equal(lerCobertura(cobertura).size, 429);
});

test('o que tem glifo e o que não tem, medido', async () => {
  const pontos = lerCobertura(await gerarCobertura({ raiz: RAIZ }));
  const tem = (c) => pontos.has(c.codePointAt(0));
  // Tipografia comum: tem de passar, ou a regra vira ruído em toda aula.
  for (const c of '×÷±…—–“”‘’•·°′″§¶†') assert.ok(tem(c), `${c} deveria ter glifo`);
  // Matemática e grego: não têm, e é por isso que a regra existe — empurra para dentro do TeX.
  for (const c of '→←≤≥≠≈∞∑∫√∂∇αβγδθλμπσφωΩ⟨⟩') assert.equal(tem(c), false, `${c} não deveria ter glifo`);
});

test('pontos que o cmap traz mas não são caracteres utilizáveis ficam de fora', async () => {
  const pontos = lerCobertura(await gerarCobertura({ raiz: RAIZ }));
  for (const ponto of [0x0, 0xD, 0xFFFF]) {
    assert.equal(pontos.has(ponto), false, `U+${ponto.toString(16).toUpperCase()} entrou na cobertura`);
  }
});

// Esta é a guarda que justifica a existência do módulo: se um dia der para trocar o cmap pelo
// unicodeRange declarado, este teste vai avisar. Hoje ele prova o contrário — e é por isso que a
// spec 8.2 pede fontkit em vez de um `split` no manifesto.
test('o cmap NÃO cabe no unicodeRange declarado: o manifesto não serve como fonte', async () => {
  const { readFile } = await import('node:fs/promises');
  const manifesto = JSON.parse(await readFile(new URL('assets/fontes/fontes.json', RAIZ), 'utf8'));
  const pontos = lerCobertura(await gerarCobertura({ raiz: RAIZ }));
  const declarados = new Set();
  for (const entrada of manifesto) {
    for (const trecho of entrada.unicodeRange.split(',')) {
      const [a, b] = trecho.trim().replace(/^U\+/i, '').split('-');
      const inicio = parseInt(a, 16);
      const fim = parseInt(b ?? a, 16);
      for (let p = inicio; p <= fim; p++) declarados.add(p);
    }
  }
  const fora = [...pontos].filter((p) => !declarados.has(p));
  assert.ok(fora.length > 0, 'se isto passar a ser zero, o manifesto virou fonte válida — reveja a spec 8.2');
});
