// A cobertura é a fonte única de "este caractere tem glifo?" para duas regras de severidade ERRO
// (spec 9.3). Os números aqui foram medidos nas fontes reais deste repositório.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarCobertura } from '../../build/cobertura.mjs';
// lerCobertura mora em validador/, não em build/: é o módulo puro que o navegador também carrega
// (rodada de correção 1, item 1). Importar de build/ aqui arrastaria Node para dentro do que o
// esbuild empacota para a tarefa 4.
import { lerCobertura } from '../../validador/cobertura.js';

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
// A comparação é POR ARQUIVO, contra o unicodeRange da PRÓPRIA entrada (é assim que o fato 9 mediu).
// Comparar a união de todos os cmaps contra a união de todos os unicodeRange (rodada de correção 1,
// item 2) esconderia a lacuna: a união de oito faixas cobre quase tudo, e um ajuste pontual no
// manifesto zeraria o teste sem fechar a diferença real de nenhum arquivo individual.
test('por arquivo, o cmap NÃO cabe no unicodeRange daquela entrada: o manifesto não serve como fonte', async () => {
  const { readFile } = await import('node:fs/promises');
  const fontkit = await import('fontkit');
  const pasta = new URL('assets/fontes/', RAIZ);
  const manifesto = JSON.parse(await readFile(new URL('fontes.json', pasta), 'utf8'));
  for (const entrada of manifesto) {
    const fonte = fontkit.create(await readFile(new URL(entrada.arquivo, pasta)));
    const cmap = fonte.characterSet;
    const declarados = new Set();
    for (const trecho of entrada.unicodeRange.split(',')) {
      const [a, b] = trecho.trim().replace(/^U\+/i, '').split('-');
      const inicio = parseInt(a, 16);
      const fim = parseInt(b ?? a, 16);
      for (let p = inicio; p <= fim; p++) declarados.add(p);
    }
    const fora = cmap.filter((p) => !declarados.has(p)).sort((a, b) => a - b);
    console.log(
      `  ${entrada.arquivo}: ${fora.length} fora da faixa declarada (${fora
        .map((p) => `U+${p.toString(16).toUpperCase()}`)
        .join(', ')})`,
    );
    assert.ok(
      fora.length > 0,
      `${entrada.arquivo}: cmap cabe inteiro no unicodeRange declarado — o manifesto virou fonte válida, reveja a spec 8.2`,
    );
  }
});

// Guarda de reprodutibilidade (rodada de correção 1, item 3): um artefato gerado-e-versionado só é
// confiável se regerar não muda nada. Sem timestamp em gerarCobertura, isto pode ser igualdade
// estrutural direta — pega o caso de alguém trocar uma fonte e esquecer de regerar o arquivo.
test('regenerar bate campo a campo com o validador/cobertura.json commitado', async () => {
  const { readFile } = await import('node:fs/promises');
  const commitado = JSON.parse(await readFile(new URL('validador/cobertura.json', RAIZ), 'utf8'));
  const regenerado = await gerarCobertura({ raiz: RAIZ });
  assert.deepStrictEqual(
    regenerado,
    commitado,
    'gerarCobertura mudou desde o último commit — regenere validador/cobertura.json (passo 5 do brief) e commite de novo',
  );
});
