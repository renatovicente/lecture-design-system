// A guarda do quinto artefato gerado-e-versionado (AGENTS.md, tabela de gerados): o que está entre
// os marcadores de guia/ tem de ser exatamente o que build/guia.mjs produz hoje. Sem isto, um guia
// de uma geração atrás documentaria um contrato que ninguém mais tem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  BLOCOS_POR_ARQUIVO,
  aplicarMarcadores,
  blocosGerados,
  exemplosPorLayout,
  gerarGuia,
  tabelaDeLayouts,
  tabelaDePapeis,
  tabelaDeVocabulario,
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

// Spec 5.6: "as tabelas de layouts, vocabulário, papéis e regras do guia são geradas dele". Deriva
// do contrato, não de uma lista escrita aqui — classe nova entra nesta guarda sozinha.
test('a tabela de vocabulário traz toda classe e todo atributo de fase 1 do contrato', () => {
  const tabela = tabelaDeVocabulario(contrato);
  for (const elemento of contrato.html.elementos) {
    assert.ok(tabela.includes(`\`${elemento}\``), `o elemento ${elemento} não aparece na tabela`);
  }
  for (const [nome, regra] of Object.entries(contrato.html.classes)) {
    const presente = tabela.includes(`| \`.${nome}\` |`);
    assert.equal(presente, !(regra.fase > 1), `classe ${nome}: presença errada para a fase 1`);
  }
  for (const [seletor, doSeletor] of Object.entries(contrato.html.atributos)) {
    for (const [nome, regra] of Object.entries(doSeletor)) {
      const onde = seletor === '*' ? 'qualquer elemento' : `\`${seletor}\``;
      const presente = tabela.includes(`| \`${nome}\` | ${onde} |`);
      assert.equal(presente, !(regra.fase > 1), `atributo ${nome} em ${seletor}: presença errada para a fase 1`);
    }
  }
});

// O motivo concreto de a tabela existir: `data-grade="12"` não é usado por deck nenhum de
// especime/, modelos/ ou exemplos/, então o extrator de exemplos nunca o mostraria e o guia não
// tinha como enumerá-lo. A tabela o documenta sem depender de ninguém usá-lo.
test('a tabela de vocabulário enumera todos os valores de data-grade, com o número de div filhos', () => {
  const tabela = tabelaDeVocabulario(contrato);
  const valores = contrato.html.atributos['div.colunas']['data-grade'].valores;
  assert.deepEqual([...valores].sort(), Object.keys(contrato.grades).sort(), 'grades e valores de data-grade divergem');
  for (const [grade, divs] of Object.entries(contrato.grades)) {
    assert.ok(tabela.includes(`| \`${grade}\` | ${divs} |`), `a grade ${grade} não aparece com ${divs} div(s)`);
  }
});

test('a tabela de papéis traz os quatro papéis com o mínimo do contrato, e as exceções', () => {
  const tabela = tabelaDePapeis(contrato);
  const papeis = Object.keys(contrato.papeis).filter((nome) => nome !== 'precedencia' && nome !== 'excecoes');
  assert.ok(papeis.length > 0, 'o contrato não declarou nenhum papel');
  for (const nome of papeis) {
    const papel = contrato.papeis[nome];
    assert.ok(tabela.includes(`| \`${nome}\` | ${papel.minimo} px |`), `o papel ${nome} não aparece com o seu mínimo`);
    for (const seletor of papel.seletores) {
      assert.ok(tabela.includes(`\`${seletor}\``), `o seletor ${seletor} do papel ${nome} não aparece`);
    }
  }
  for (const excecao of contrato.papeis.excecoes) {
    assert.ok(tabela.includes(`\`${excecao}\``), `a exceção ${excecao} não aparece`);
  }
});

// celula() escapa o "|" porque o padrão de `img src` tem um, e uma célula com "|" cru parte a linha
// em duas: a tabela sai torta e ninguém vê. Conta as barras de cada linha de cada tabela gerada.
test('nenhuma tabela gerada tem linha com número de células diferente do cabeçalho', () => {
  const barras = (linha) => (linha.match(/(?<!\\)\|/g) ?? []).length;
  for (const [nome, bloco] of Object.entries(blocosGerados({ raiz: RAIZ }))) {
    let esperado = null;
    for (const linha of bloco.split('\n')) {
      if (!linha.startsWith('|')) {
        esperado = null;
        continue;
      }
      esperado ??= barras(linha);
      assert.equal(barras(linha), esperado, `${nome}: "${linha}" tem número de células diferente do cabeçalho`);
    }
  }
});

// O esqueleto que o guia mostra era uma cópia conferida à mão uma vez, e nada impedia que os dois
// divergissem depois. Compara o que está em guia/ com o que está em modelos/ — dois arquivos em
// disco, não o gerador consigo mesmo.
test('o esqueleto de guia/10-estrutura.md é modelos/aula/index.html, byte a byte', () => {
  const modelo = readFileSync(new URL('modelos/aula/index.html', RAIZ), 'utf8');
  const estrutura = readFileSync(new URL('guia/10-estrutura.md', RAIZ), 'utf8');
  const entre = estrutura.match(/<!-- gerado:modelo -->\n([\s\S]*?)<!-- \/gerado -->/);
  assert.ok(entre, 'guia/10-estrutura.md não tem o par <!-- gerado:modelo --> … <!-- /gerado -->');
  assert.equal(
    entre[1],
    `\`\`\`html\n${modelo.trimEnd()}\n\`\`\`\n`,
    'o esqueleto do guia divergiu de modelos/aula/index.html — rode `npm run guia` e commite o resultado',
  );
});

// A lista dos onze blocos de corpo em guia/30-componentes.md é escrita à mão, e era conferida à
// mão. `tex-destaque` está na lista do contrato mas NÃO é uma tag — o arquivo o documenta como
// texto solto entre \[ e \], e é por isso que a guarda cobra a citação, não um elemento.
test('todo bloco de corpo do contrato é citado em guia/30-componentes.md', () => {
  const componentes = readFileSync(new URL('guia/30-componentes.md', RAIZ), 'utf8');
  assert.ok(contrato.blocosDeCorpo.length > 0, 'o contrato não declarou nenhum bloco de corpo');
  for (const bloco of contrato.blocosDeCorpo) {
    assert.ok(componentes.includes(`\`${bloco}\``), `o bloco de corpo ${bloco} não é citado no arquivo`);
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
