// A guarda do quinto artefato gerado-e-versionado (AGENTS.md, tabela de gerados): o que está entre
// os marcadores de guia/ tem de ser exatamente o que build/guia.mjs produz hoje. Sem isto, um guia
// de uma geração atrás documentaria um contrato que ninguém mais tem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import {
  BLOCOS_POR_ARQUIVO,
  FONTES_DE_PACOTE,
  aplicarMarcadores,
  blocosGerados,
  decksDoEspecime,
  decksLimpos,
  exemplosPorLayout,
  gerarGuia,
  montarPacote,
  regrasEssenciais,
  tabelaDeLayouts,
  tabelaDePapeis,
  tabelaDeVocabulario,
} from '../../build/guia.mjs';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));

test('os blocos gerados de guia/ batem com o que está em disco', async () => {
  const regerado = await gerarGuia({ raiz: RAIZ });
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
test('todo layout do contrato aparece na tabela e tem exemplo extraído do espécime', async () => {
  const tabela = tabelaDeLayouts(contrato);
  const exemplos = await exemplosPorLayout(RAIZ);
  const layouts = Object.keys(contrato.layouts);
  assert.ok(layouts.length > 0, 'o contrato não declarou nenhum layout');
  for (const nome of layouts) {
    assert.ok(tabela.includes(`\`${nome}\``), `o layout ${nome} não aparece na tabela gerada`);
    assert.ok(exemplos[nome], `o layout ${nome} não tem exemplo em especime/`);
    assert.match(exemplos[nome].trecho, new RegExp(`data-layout="${nome}"`));
  }
});

// O extrator de exemplos escolhe por DOIS filtros — só deck em português, só deck que valida limpo —
// e a guarda de "regerar e comparar" não vê nenhum dos dois: ela compara saída com saída, e por isso
// ABENÇOA a regressão do gerador. Tire um filtro, rode `npm run guia`, e as duas voltam a bater — com
// a mensagem "commite o resultado", isto é, mandando commitar a regressão. Uma guarda de
// gerado-e-versionado prova que o ARQUIVO está em dia com o GERADOR, e nada sobre o gerador.
//
// O que fecha a janela é asseverar PROPRIEDADES do resultado, medidas aqui e sem perguntar ao
// gerador como ele escolheu:
//
//   1. a atribuição é verdadeira — o trecho publicado está literalmente no deck que o guia cita;
//   2. esse deck é pt-BR — sem isso especime/ifusp.html, que é `lang="en"` de propósito, vence o
//      critério "a menor" em dois layouts e o guia publica "The cloud spreads" e "Takeaways" como
//      exemplos canônicos para professores brasileiros (medido);
//   3. esse deck valida sem nenhum achado — sem isso o critério "a menor" escolhe sistematicamente a
//      instância mais pobre do layout, porque é não ter os opcionais que a faz ser a menor: em
//      `abertura` ele escolhia uma seção sem `id`, que o validador acusa com estrutura.id-ausente,
//      num guia que manda "copie a forma".
//
// As três juntas são o que guia/00-principios.md promete ao leitor: "a marcação deste guia é tirada
// de arquivos que o validador aprova, e vem com o endereço de onde saiu".
test('todo exemplo publicado é trecho literal de um deck pt-BR que valida limpo', async () => {
  const exemplos = await exemplosPorLayout(RAIZ);
  const limpos = await decksLimpos(RAIZ);
  assert.ok(Object.keys(exemplos).length > 0, 'o extrator não devolveu exemplo nenhum');
  // Sem esta linha o filtro seria decoração: se decksLimpos devolvesse todo mundo, a asserção (3)
  // passaria sempre. Ela cobra que o espécime ainda tenha o deck que existe para provocar aviso
  // (muitos-blocos.html) e que a medição ainda saiba dizer não.
  assert.ok(
    limpos.size < decksDoEspecime(RAIZ).length,
    'decksLimpos devolveu todos os decks do espécime: ou o deck que existe para provocar aviso saiu '
      + 'de especime/, ou a medição parou de discriminar — nos dois casos o filtro virou decoração',
  );
  for (const [layout, { trecho, deck }] of Object.entries(exemplos)) {
    const html = readFileSync(new URL(`especime/${deck}`, RAIZ), 'utf8');
    assert.ok(html.includes(trecho), `${layout}: o trecho publicado não está em especime/${deck}`);
    assert.match(html, /<html lang="pt/, `${layout}: especime/${deck} não é um deck em português`);
    assert.ok(limpos.has(deck), `${layout}: especime/${deck} não valida limpo`);
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
test('nenhuma tabela gerada tem linha com número de células diferente do cabeçalho', async () => {
  const barras = (linha) => (linha.match(/(?<!\\)\|/g) ?? []).length;
  for (const [nome, bloco] of Object.entries(await blocosGerados({ raiz: RAIZ }))) {
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

// Os nomes das metas de guia/10-estrutura.md, lidos da tabela que o arquivo escreve à mão.
function metasDaTabela(texto) {
  const linhas = texto.split('\n');
  const cabecalho = linhas.findIndex((linha) => /^\|\s*meta\s*\|/.test(linha));
  assert.notEqual(cabecalho, -1, 'guia/10-estrutura.md não tem a tabela de metadados');
  const nomes = [];
  for (const linha of linhas.slice(cabecalho + 2)) { // +2: pula o cabeçalho e a linha de traços
    if (!linha.startsWith('|')) break;
    nomes.push(linha.split('|')[1].trim().replaceAll('`', ''));
  }
  return nomes;
}

// Esta tabela é a única das cinco do guia que NÃO é gerada, e de propósito: o contrato tem os nomes
// das metas, mas não tem a coluna "o que faz", que é a única coisa que o autor precisa ler ali.
// Gerá-la custaria pôr prosa dentro de contrato.json. Em troca, uma guarda: os nomes da tabela são
// exatamente os de contrato.metadados, na mesma ordem. Sem ela, uma meta nova no contrato virava
// uma meta que o guia não pede, e o autor entregava uma aula sem ela.
test('a tabela de metadados de guia/10-estrutura.md traz as metas do contrato, e só elas', () => {
  const estrutura = readFileSync(new URL('guia/10-estrutura.md', RAIZ), 'utf8');
  assert.ok(Object.keys(contrato.metadados).length > 0, 'o contrato não declarou nenhum metadado');
  assert.deepEqual(
    metasDaTabela(estrutura),
    Object.keys(contrato.metadados),
    'a tabela de metadados de guia/10-estrutura.md divergiu de contrato.metadados — acerte a tabela à mão',
  );
});

// O grupo de uma regra é o que decide QUANDO ela roda, e é a pergunta que guia/60-validador.md
// responde em prosa. Dos quatro grupos, três se deduzem do prefixo do nome (composicao.*, saida.* e,
// por exclusão, as estáticas); o de carga não — ele junta uma regra de matematica.* e três de
// recursos.*, e o arquivo as nomeia à mão. A busca é na prosa, com o bloco gerado FORA: a tabela de
// regras cita todas as regras da fase 1, então procurar no arquivo inteiro passaria sempre.
test('guia/60-validador.md nomeia, na prosa, todas as regras do grupo de carga da fase 1', () => {
  const validador = readFileSync(new URL('guia/60-validador.md', RAIZ), 'utf8');
  const prosa = validador.replace(/<!-- gerado:[\s\S]*?<!-- \/gerado -->/g, '');
  const daCarga = Object.entries(contrato.regras)
    .filter(([, regra]) => regra.grupo === 'carga' && !(regra.fase > 1))
    .map(([nome]) => nome);
  assert.ok(daCarga.length > 0, 'o contrato não declarou nenhuma regra de fase 1 no grupo de carga');
  for (const nome of daCarga) {
    assert.ok(prosa.includes(`\`${nome}\``), `a regra de carga ${nome} não é nomeada na prosa de guia/60-validador.md`);
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

// As quatro guardas de guia/pacotes/ (Tarefa 7). Os cinco arquivos de lá não são lidos por humanos:
// são o texto que o `aula-usp pacotes` do 6c monta nos quatro pacotes, e nada no 6b os executa —
// sem guarda, um erro neles só apareceria um marco depois, dentro de um pacote entregue.

// A lista vem de FONTES_DE_PACOTE, que é a tabela da spec 10.1 escrita uma vez. Um arquivo a mais
// ou a menos na pasta é uma divergência entre o que o guia tem e o que o 6c vai procurar.
test('guia/pacotes/ tem exatamente os cinco arquivos-fonte da spec 10.1', () => {
  const esperados = Object.keys(FONTES_DE_PACOTE).map((caminho) => caminho.split('/').pop());
  assert.deepEqual(readdirSync(new URL('guia/pacotes/', RAIZ)).sort(), esperados.sort());
});

// Spec 10.1: o bloco "entra, literalmente, em todos os pacotes". Quem diz ONDE é a linha do
// marcador; sem ela, o 6c montaria um pacote sem as regras e ninguém veria.
test('todo arquivo-fonte que leva as regras essenciais traz a linha do marcador', () => {
  for (const [caminho, { essenciais }] of Object.entries(FONTES_DE_PACOTE)) {
    const fonte = readFileSync(new URL(caminho, RAIZ), 'utf8').normalize('NFC');
    const temMarcador = /^<!-- inserir:regras-essenciais -->$/m.test(fonte);
    assert.equal(temMarcador, essenciais, `${caminho}: presença errada da linha do marcador`);
  }
});

// A outra metade da mesma regra: o bloco é INJETADO, nunca copiado. Um parágrafo dele colado num
// arquivo-fonte faria uma regra mudar em 00-principios.md e não mudar no pacote — exatamente o
// defeito que o mecanismo de marcadores existe para impedir.
test('nenhum arquivo-fonte de pacote copia o texto das regras essenciais', () => {
  const paragrafos = regrasEssenciais({ raiz: RAIZ }).split('\n').filter((linha) => linha.trim() !== '');
  assert.ok(paragrafos.length > 0, 'o bloco de regras essenciais está vazio');
  for (const caminho of Object.keys(FONTES_DE_PACOTE)) {
    const fonte = readFileSync(new URL(caminho, RAIZ), 'utf8').normalize('NFC');
    for (const paragrafo of paragrafos) {
      assert.equal(fonte.includes(paragrafo), false, `${caminho} copiou uma linha do bloco: "${paragrafo.slice(0, 40)}…"`);
    }
  }
});

// Spec 10.2 e 11.1: "instrucoes.txt com até 8.000 caracteres". O teto é do arquivo MONTADO, não do
// fonte — o bloco essencial entra nele —, e é por isso que a conta passa por montarPacote().
test('cada arquivo-fonte com teto cabe nele depois de montado', () => {
  const bloco = regrasEssenciais({ raiz: RAIZ });
  const comTeto = Object.entries(FONTES_DE_PACOTE).filter(([, { teto }]) => teto !== undefined);
  assert.ok(comTeto.length > 0, 'nenhum arquivo-fonte declara teto');
  for (const [caminho, { teto }] of comTeto) {
    const montado = montarPacote(readFileSync(new URL(caminho, RAIZ), 'utf8').normalize('NFC'), bloco);
    assert.ok(
      montado.length <= teto,
      `${caminho} montado tem ${montado.length} caracteres, e o teto é ${teto}`,
    );
    assert.ok(montado.includes(bloco), `${caminho} montado não contém o bloco de regras essenciais`);
    assert.equal(montado.includes('<!--'), false, `${caminho} montado ainda tem comentário HTML`);
  }
});
