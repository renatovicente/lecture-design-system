// A guarda do quinto artefato gerado-e-versionado (AGENTS.md, tabela de gerados): o que está entre
// os marcadores de guia/ tem de ser exatamente o que build/guia.mjs produz hoje. Sem isto, um guia
// de uma geração atrás documentaria um contrato que ninguém mais tem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  BLOCOS_POR_ARQUIVO,
  aplicarMarcadores,
  exemplosPorLayout,
  gerarGuia,
  tabelaDeLayouts,
} from '../../build/guia.mjs';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

test('os blocos gerados de guia/ batem com o que está em disco', () => {
  const regerado = gerarGuia({ raiz: RAIZ });
  for (const caminho of Object.keys(BLOCOS_POR_ARQUIVO)) {
    assert.equal(
      readFileSync(new URL(caminho, RAIZ), 'utf8'),
      regerado[caminho],
      `${caminho} está desatualizado — rode \`npm run guia\` e commite o resultado`,
    );
  }
});

// Fato 3 do plano do 6b: a sequência de um layout tem três formas de item, e um gerador que leia só
// `seletor` imprime "undefined" no layout conteudo. Sem esta asserção o defeito volta calado.
test('a tabela de layouts não contém `undefined`', () => {
  assert.equal(tabelaDeLayouts(contrato).includes('undefined'), false);
});

// Deriva do contrato, não de uma lista escrita aqui: um layout novo entra nesta guarda sozinho.
test('todo layout do contrato aparece na tabela e tem exemplo extraído do espécime', () => {
  const tabela = tabelaDeLayouts(contrato);
  const exemplos = exemplosPorLayout(RAIZ);
  const layouts = Object.keys(contrato.layouts);
  assert.ok(layouts.length > 0, 'o contrato não declarou nenhum layout');
  for (const nome of layouts) {
    assert.ok(tabela.includes(`\`${nome}\``), `o layout ${nome} não aparece na tabela gerada`);
    assert.ok(exemplos[nome], `o layout ${nome} não tem exemplo em especime/`);
    assert.match(exemplos[nome].trecho, new RegExp(`data-layout="${nome}"`));
  }
});

// Um bloco que silenciosamente não é escrito é a forma deste projeto de produzir documentação que
// mente: o aplicador erra alto quando o marcador pedido não existe.
test('aplicarMarcadores ergue erro quando o marcador pedido não existe', () => {
  assert.throws(
    () => aplicarMarcadores('# sem marcador nenhum\n', { 'tabela-de-layouts': 'x' }),
    /marcador "gerado:tabela-de-layouts" não encontrado/,
  );
});

// O bloco de regras essenciais é LIDO pelo 6c (`aula-usp pacotes` o injeta nos quatro pacotes), não
// escrito por npm run guia — então nada mais no 6b o exercita, e um bloco vazio atravessaria o marco
// inteiro sem ninguém notar. guia/00-principios.md é da Tarefa 2: enquanto ele não existir o teste
// PULA; assim que existir, cobra marcadores presentes e conteúdo não vazio entre eles.
test('o bloco de regras essenciais de guia/00-principios.md existe e não está vazio', (t) => {
  const caminho = new URL('guia/00-principios.md', RAIZ);
  if (!existsSync(caminho)) {
    t.skip('guia/00-principios.md ainda não existe (Tarefa 2 do marco 6b)');
    return;
  }
  // normalize: os marcadores têm acento (`início`), e um editor que grave em NFD faria a busca
  // falhar por um motivo que não é o que este teste quer medir.
  const texto = readFileSync(caminho, 'utf8').normalize('NFC');
  const entre = texto.match(/<!-- regras-essenciais:início -->\n([\s\S]*?)<!-- regras-essenciais:fim -->/);
  assert.ok(
    entre,
    'guia/00-principios.md não tem o par <!-- regras-essenciais:início --> … <!-- regras-essenciais:fim -->, '
      + 'e é dele que o `aula-usp pacotes` do 6c extrai o texto dos quatro pacotes',
  );
  assert.notEqual(entre[1].trim(), '', 'o bloco de regras essenciais está vazio');
});
