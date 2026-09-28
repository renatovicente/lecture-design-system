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
  faseMaxima,
  gerarGuia,
  montarPacote,
  regrasEssenciais,
  tabelaDeLayouts,
  tabelaDeLimites,
  tabelaDePapeis,
  tabelaDeRegras,
  tabelaDeVocabulario,
} from '../../build/guia.mjs';

const RAIZ = new URL('../../', import.meta.url);
const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', RAIZ), 'utf8'));
// A maior fase que o contrato declara, calculada AQUI e não importada do gerador — é o molde de
// tests/unit/validador.test.mjs. Uma guarda que perguntasse ao gerador até que fase documentar
// aprovaria qualquer fase que ele passasse a devolver.
const FASE_MAXIMA = Math.max(...Object.values(contrato.regras).map((regra) => regra.fase));

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
// Em que fase o (3) valida: na de cada deck, a mesma que o extrator usa — os dois leem decksLimpos,
// que pergunta a lerERodarEstatica, que calcula a fase pela aula (faseDaAula). Medido na 2d: com
// essa fase presa em 1, componentes.html sai dos limpos, abertura, figura e demo passam a vir de
// index.html, e ESTA guarda fica verde — extrator e guarda concordam porque erram juntos. Quem cai é
// a guarda de cima, que conta os decks limpos.
//
// As três juntas são o que guia/00-principios.md promete ao leitor: "a marcação deste guia é tirada
// de arquivos que o validador aprova, e vem com o endereço de onde saiu".
// A janela que o Fato 1 do plano da 2d nomeou, fechada por propriedade: um deck do espécime que
// DEIXA de validar limpo não falha nada no extrator — ele só some da fonte de exemplos, e o guia
// fica menor calado. O caso concreto é componentes.html, o único deck de fase 2: validado na fase 1,
// o gráfico e o diagrama dele são erro, e três layouts (abertura, figura e demo) perdem a sua fonte.
//
// A exceção é escrita aqui, pelo nome, e é uma só: muitos-blocos.html existe para provocar aviso
// (a guarda de baixo cobra que ele continue provocando). Todo deck novo do espécime entra nesta
// conta sozinho, e sair dela é o que tem de doer.
const DECKS_QUE_AVISAM = new Set(['muitos-blocos.html']);

test('todo deck do espécime conta como limpo, salvo o que existe para provocar aviso', async () => {
  const limpos = await decksLimpos(RAIZ);
  const decks = decksDoEspecime(RAIZ);
  assert.ok(decks.length > 0, 'especime/ não tem deck nenhum');
  for (const deck of decks) {
    assert.equal(
      limpos.has(deck),
      !DECKS_QUE_AVISAM.has(deck),
      `especime/${deck}: ${limpos.has(deck) ? 'passou a validar limpo' : 'deixou de validar limpo, e sai calado da fonte de exemplos do guia'}`,
    );
  }
});

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
//
// Desde a 2d, "toda" é toda até a maior fase do contrato — o guia documenta o sistema que existe.
// Uma tabela presa à fase 1 esconde `.grafico`, `.diagrama`, `data-captura-ms` e o `type` do
// `script`, e o autor que só lê o guia não tem como escrever um gráfico.
test('a tabela de vocabulário traz toda classe e todo atributo do contrato, até a maior fase', () => {
  assert.equal(faseMaxima(contrato), FASE_MAXIMA, 'o gerador documenta até outra fase que não a maior do contrato');
  const tabela = tabelaDeVocabulario(contrato);
  for (const elemento of contrato.html.elementos) {
    assert.ok(tabela.includes(`\`${elemento}\``), `o elemento ${elemento} não aparece na tabela`);
  }
  for (const [elemento, { dentro }] of Object.entries(contrato.html.elementosFase2 ?? {})) {
    assert.ok(tabela.includes(`\`${elemento}\`, só dentro de`), `o elemento ${elemento} não aparece com o seu pai obrigatório`);
    for (const pai of dentro) assert.ok(tabela.includes(`\`${pai}\``), `o pai ${pai} de ${elemento} não aparece`);
  }
  for (const [nome, regra] of Object.entries(contrato.html.classes)) {
    const presente = tabela.includes(`| \`.${nome}\` |`);
    assert.equal(presente, !(regra.fase > FASE_MAXIMA), `classe ${nome}: presença errada`);
  }
  for (const [seletor, doSeletor] of Object.entries(contrato.html.atributos)) {
    for (const [nome, regra] of Object.entries(doSeletor)) {
      const onde = seletor === '*' ? 'qualquer elemento' : `\`${seletor}\``;
      const presente = tabela.includes(`| \`${nome}\` | ${onde} |`);
      assert.equal(presente, !(regra.fase > FASE_MAXIMA), `atributo ${nome} em ${seletor}: presença errada`);
    }
  }
});

// A guarda que o capítulo de regras não tinha. A de regerar-e-comparar não a substitui: com o
// filtro de tabelaDeRegras preso a uma fase, `npm run guia` publica a tabela menor e as duas voltam
// a bater. O "todas" vem do contrato, nunca de um número escrito aqui, e a busca é no ARQUIVO em
// disco, entre os marcadores — é esse o texto que o autor lê e que os pacotes levam.
test('o capítulo de regras gerado traz todas as regras do contrato, e uma linha por regra', () => {
  const validador = readFileSync(new URL('guia/60-validador.md', RAIZ), 'utf8');
  const entre = validador.match(/<!-- gerado:tabela-de-regras -->\n([\s\S]*?)<!-- \/gerado -->/);
  assert.ok(entre, 'guia/60-validador.md não tem o bloco gerado da tabela de regras');
  const linhas = entre[1].split('\n').filter((linha) => linha.startsWith('| `'));
  const nomes = Object.keys(contrato.regras);
  assert.ok(nomes.length > 0, 'o contrato não declarou nenhuma regra');
  assert.equal(linhas.length, nomes.length, `a tabela tem ${linhas.length} regras, e o contrato declara ${nomes.length}`);
  for (const nome of nomes) {
    assert.ok(linhas.some((linha) => linha.startsWith(`| \`${nome}\` |`)), `a regra ${nome} não está no capítulo de regras`);
  }
  // E o gerador, chamado sem argumento, é o que produz isso — não só o arquivo em disco.
  assert.equal(tabelaDeRegras(contrato).split('\n').filter((linha) => linha.startsWith('| `')).length, nomes.length);
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

// A propriedade que a guarda de regerar-e-comparar não tem como ver. Ela compara saída com saída:
// pôr um `.filter()` em tabelaDeLimites, rodar `npm run guia` e commitar deixa as duas iguais, com a
// mensagem "commite o resultado" abençoando o limite que sumiu do guia. E foi exatamente um limite
// que não estava no guia — `capa.h1.caracteresPorSegmento` — que fez o agente do aceite do marco 7
// errar o título da capa na primeira tentativa e descobrir o número por tentativa e erro.
//
// Deriva do contrato, não de uma lista escrita aqui: um limite novo entra nesta guarda sozinho. E
// cobra o NÚMERO, não só a chave — uma tabela que trouxesse a chave com o valor de outra linha
// mandaria o leitor para o mesmo lugar errado, que é o defeito inteiro.
test('todo limite do contrato aparece na tabela, com o seu número', () => {
  const linhas = tabelaDeLimites(contrato).split('\n');
  assert.ok(Object.keys(contrato.limites).length > 0, 'o contrato não declarou nenhum limite');
  for (const [chave, valor] of Object.entries(contrato.limites)) {
    const linha = linhas.find((atual) => atual.startsWith(`| \`${chave}\` |`));
    assert.ok(linha, `o limite ${chave} não tem linha na tabela gerada`);
    // A célula do meio é "quanto cabe"; o número tem de estar NELA, e não em qualquer lugar da
    // linha, senão um 2 vindo de `data-grade="6-6"` na coluna "onde" satisfaria a busca.
    const quanto = linha.split('|')[2];
    assert.match(quanto, new RegExp(`(?<![0-9])${valor}(?![0-9])`), `a linha de ${chave} não diz ${valor}`);
  }
});

// A outra metade do mesmo mecanismo: o gerador PARA quando um limite novo não tem palavra, em vez de
// publicar "no máximo 8 undefined". É o mesmo idioma de blocoDeExemplos com um layout sem exemplo e
// de aplicarMarcadores com marcador ausente — documentação que mente custa mais do que build que cai.
test('tabelaDeLimites ergue erro quando falta palavra para um limite', () => {
  assert.throws(() => tabelaDeLimites({ limites: { 'coisa.nova': 3 } }), /não tem palavra para o prefixo "coisa"/);
  assert.throws(() => tabelaDeLimites({ limites: { 'codigo.pixels': 3 } }), /não tem unidade para "pixels"/);
  assert.throws(() => tabelaDeLimites({ limites: { semponto: 3 } }), /não tem prefixo/);
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

// Cada bloco ```html de guia/ e as âncoras `arquivo#id` da atribuição logo abaixo dele. Uma
// atribuição pode trazer mais de uma âncora ("Do espécime: `a#x` e `b#y`"), porque uma frase só
// costuma atender aos dois blocos acima dela.
function blocosComAncora(texto) {
  const sem = texto.replace(/<!-- gerado:[\s\S]*?<!-- \/gerado -->/g, '');
  const saida = [];
  const blocos = /```html\n([\s\S]*?)```/g;
  let achado;
  while ((achado = blocos.exec(sem)) !== null) {
    const proximo = sem.indexOf('```html', blocos.lastIndex);
    const atribuicao = sem.slice(blocos.lastIndex, proximo === -1 ? undefined : proximo);
    const ancoras = [...atribuicao.matchAll(/`([A-Za-z0-9/_.-]+\.html)#([A-Za-z0-9_-]+)`/g)]
      .map(([, arquivo, id]) => ({ arquivo, id }));
    if (ancoras.length > 0) {
      saida.push({ trecho: achado[1], ancoras, linha: sem.slice(0, achado.index).split('\n').length });
    }
  }
  return saida;
}

// O guia desindenta o trecho ao tirá-lo de dentro da `section`, então a comparação é por linha
// aparada. O trecho continua tendo de ser um pedaço CONTÍGUO da seção — é isso que pega a cópia que
// omite um item do meio sem dizer.
const aparado = (texto) => texto.split('\n').map((linha) => linha.trim()).filter((linha) => linha !== '').join('\n');

// Os trechos com âncora são cópia manual, e eram conferidos à mão uma vez. Este marco EDITOU o
// espécime (7e4b45a, as duas definições de taxa de aprendizado): se algum trecho copiado citasse
// aquelas linhas, o guia seguiria mostrando a frase velha com o endereço certo, e nada falharia.
//
// A guarda fecha a promessa que guia/30-componentes.md faz na sua terceira linha — "o seu trecho
// pronto, tirado de um arquivo que valida … com o endereço da seção de onde veio" — e que
// 00-principios.md repete para o guia inteiro.
//
// Medido: 28 blocos ```html de guia/ trazem âncora, e os 28 são literais. Outros três não trazem
// âncora nenhuma, e é correto que não tragam: não são trechos tirados de arquivo — são um `ol` de
// ilustração, o `<script>` de registro de uma demo, e a tag de CDN que ainda não existe.
test('todo trecho de guia/ com âncora é literal na seção que ele cita', () => {
  let conferidos = 0;
  for (const nome of readdirSync(new URL('guia/', RAIZ)).filter((arquivo) => arquivo.endsWith('.md')).sort()) {
    const texto = readFileSync(new URL(`guia/${nome}`, RAIZ), 'utf8');
    for (const { trecho, ancoras, linha } of blocosComAncora(texto)) {
      conferidos += 1;
      const tentadas = [];
      const casou = ancoras.some(({ arquivo, id }) => {
        tentadas.push(`${arquivo}#${id}`);
        const fonte = new URL(arquivo, RAIZ);
        if (!existsSync(fonte)) return false;
        const secao = readFileSync(fonte, 'utf8').match(new RegExp(`<section[^>]*\\sid="${id}"[\\s\\S]*?</section>`));
        return secao !== null && aparado(secao[0]).includes(aparado(trecho));
      });
      assert.ok(casou, `guia/${nome}:${linha}: o trecho não é literal em ${tentadas.join(' nem em ')}`);
    }
  }
  assert.ok(conferidos > 0, 'nenhum trecho com âncora foi conferido — a guarda virou decoração');
});

// A lista dos onze blocos de corpo é do contrato. O que guia/30-componentes.md promete sobre eles
// está na sua terceira linha: "Cada um tem aqui o seu trecho pronto … com o endereço da seção de
// onde veio". É isso que esta guarda cobra, e NÃO a simples menção ao nome — porque a menção passa
// sempre, por dois motivos independentes, e só o primeiro estava no relatório de revisão:
//
//   1. o arquivo termina com a tabela de papéis GERADA, que cita `aside.destaque`, `aside.quadro`,
//      `aside.alerta` e `pre` (a mesma classe de defeito que o despacho C pegou em 60-validador.md);
//   2. o arquivo ABRE enumerando os onze nomes em crase — "são estes onze: `p`, `ul`, …" —, e essa
//      linha, por desenho, cita todos os onze. Ela sozinha sustenta a guarda inteira. Medido: com o
//      bloco gerado já fora da busca, apagar as seções "## Destaque", "## Quadro", "## Alerta" e
//      "## Código" da prosa — 52 linhas fora — ainda deixava a guarda VERDE.
//
// Fora as duas, a busca é na prosa a partir da primeira seção, e o que se cobra é a documentação de
// fato. Os dez blocos cujo tag está em contrato.html.elementos são elemento de verdade, e a forma
// que o guia lhes dá é um trecho pronto: cobra-se a marcação dentro de um bloco ```html. O décimo
// primeiro, `tex-destaque`, NÃO está lá — não é uma tag, é texto solto entre \[ e \] —, e para ele a
// citação pelo nome é a única forma possível. Os dois caminhos saem do contrato, não de uma lista
// escrita aqui: um bloco de corpo novo cai sozinho no caminho certo.
test('todo bloco de corpo do contrato tem a sua documentação em guia/30-componentes.md', () => {
  const componentes = readFileSync(new URL('guia/30-componentes.md', RAIZ), 'utf8');
  const semGerado = componentes.replace(/<!-- gerado:[\s\S]*?<!-- \/gerado -->/g, '');
  const primeiraSecao = semGerado.indexOf('\n## ');
  assert.notEqual(primeiraSecao, -1, 'guia/30-componentes.md não tem seção nenhuma');
  const corpo = semGerado.slice(primeiraSecao);
  const emCodigo = [...corpo.matchAll(/```html\n([\s\S]*?)```/g)].map(([, trecho]) => trecho).join('\n');
  assert.ok(contrato.blocosDeCorpo.length > 0, 'o contrato não declarou nenhum bloco de corpo');
  for (const bloco of contrato.blocosDeCorpo) {
    const [tag, classe] = bloco.split('.');
    if (!contrato.html.elementos.includes(tag)) {
      assert.ok(corpo.includes(`\`${bloco}\``), `${bloco} não é elemento do contrato, e a prosa não o cita pelo nome`);
      continue;
    }
    // `<p` casaria com `<pre`: o lookahead exige que o nome da tag termine ali.
    const marcacao = classe
      ? new RegExp(`<${tag}(?=[\\s>])[^>]*class="[^"]*\\b${classe}\\b`)
      : new RegExp(`<${tag}(?=[\\s>])`);
    assert.match(emCodigo, marcacao, `o bloco de corpo ${bloco} não tem trecho pronto em nenhum bloco \`\`\`html`);
  }
});

// Os arquivos de guia/, lidos da tabela "Onde está o resto" que guia/00-principios.md escreve à mão.
// A primeira coluna é o nome do capítulo em crase, que é o nome do arquivo em guia/ — a tabela diz
// "capítulo" e não "arquivo" porque nos pacotes de chat o guia inteiro vira um arquivo só, e ali
// cada capítulo é uma seção dele.
function arquivosDaTabela(texto) {
  const linhas = texto.split('\n');
  const cabecalho = linhas.findIndex((linha) => /^\|\s*capítulo\s*\|/.test(linha));
  assert.notEqual(cabecalho, -1, 'guia/00-principios.md não tem a tabela "Onde está o resto"');
  const nomes = [];
  for (const linha of linhas.slice(cabecalho + 2)) { // +2: pula o cabeçalho e a linha de traços
    if (!linha.startsWith('|')) break;
    nomes.push(linha.split('|')[1].trim().replaceAll('`', ''));
  }
  return nomes;
}

// Seis dos onze arquivos de guia/ não eram nomeados por teste nenhum nem pelo gerador: apagar
// 40-, 50-, 70-, 71-, 72- ou 73- deixava `npm test` verde. O contraste era dentro do próprio marco —
// guia/pacotes/ tem guarda de conjunto exato desde a Tarefa 7.
//
// A lista dos onze não é escrita aqui: ela vem da tabela "Onde está o resto" de 00-principios.md,
// mais o próprio 00-principios.md, que é o único arquivo que a tabela não pode listar por ser quem a
// escreve. Essa tabela é a fonte certa porque é o sumário que o leitor usa: um arquivo sem linha
// nela é um arquivo que ninguém acha, e uma linha sem arquivo é um link morto. As alternativas são
// piores — a spec 10.1 lista dezesseis arquivos e mora fora do repositório, BLOCOS_POR_ARQUIVO só
// nomeia quatro, e a tabela de `references/` de skill.md é consumidora, não fonte: ela deixa 72 e 73
// de fora de propósito, porque são fluxos do autor e não do agente.
//
// É o mesmo molde do teste das metas, logo abaixo: uma tabela escrita à mão, conferida contra a
// fonte que manda — ali contrato.metadados, aqui o próprio diretório.
test('a tabela de guia/00-principios.md nomeia exatamente os arquivos de guia/', () => {
  const principios = readFileSync(new URL('guia/00-principios.md', RAIZ), 'utf8');
  const emDisco = readdirSync(new URL('guia/', RAIZ)).filter((nome) => nome.endsWith('.md')).sort();
  assert.ok(emDisco.length > 0, 'guia/ não tem arquivo .md nenhum');
  assert.deepEqual(
    [...arquivosDaTabela(principios), '00-principios.md'].sort(),
    emDisco,
    'a tabela "Onde está o resto" de guia/00-principios.md divergiu de guia/ — um arquivo novo precisa '
      + 'de uma linha nela, e uma linha sem arquivo é um link morto no guia',
  );
});

// O `aula-usp pacotes` do 6c copia guia/ para references/ dentro dos pacotes, e os arquivos-fonte
// apontam para lá pelo nome. Um nome errado, ou um arquivo de guia/ renomeado, vira link morto
// dentro de um pacote entregue — e só apareceria um marco depois, na mão de quem o usa.
test('todo references/ citado em guia/pacotes/ existe em guia/', () => {
  const emDisco = new Set(readdirSync(new URL('guia/', RAIZ)).filter((nome) => nome.endsWith('.md')));
  let citados = 0;
  for (const caminho of Object.keys(FONTES_DE_PACOTE)) {
    const fonte = readFileSync(new URL(caminho, RAIZ), 'utf8');
    for (const [, nome] of fonte.matchAll(/references\/([0-9A-Za-z._-]+\.md)/g)) {
      citados += 1;
      assert.ok(emDisco.has(nome), `${caminho} aponta para references/${nome}, que não existe em guia/`);
    }
  }
  assert.ok(citados > 0, 'nenhum arquivo-fonte de pacote cita references/ — a guarda virou decoração');
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
// regras cita todas as regras, então procurar no arquivo inteiro passaria sempre.
test('guia/60-validador.md nomeia, na prosa, todas as regras do grupo de carga', () => {
  const validador = readFileSync(new URL('guia/60-validador.md', RAIZ), 'utf8');
  const prosa = validador.replace(/<!-- gerado:[\s\S]*?<!-- \/gerado -->/g, '');
  const daCarga = Object.entries(contrato.regras)
    .filter(([, regra]) => regra.grupo === 'carga' && !(regra.fase > FASE_MAXIMA))
    .map(([nome]) => nome);
  assert.ok(daCarga.length > 0, 'o contrato não declarou nenhuma regra no grupo de carga');
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
// inteiro sem ninguém notar. O teste pulava enquanto guia/00-principios.md não existisse, condição
// da Tarefa 2, que acabou: o galho morreu e saiu, porque um teste que PULA quando o arquivo some é
// um teste que se cala justamente no caso que ele existe para pegar.
test('o bloco de regras essenciais de guia/00-principios.md existe e não está vazio', () => {
  // normalize: os marcadores têm acento (`início`), e um editor que grave em NFD faria a busca
  // falhar por um motivo que não é o que este teste quer medir.
  const texto = readFileSync(new URL('guia/00-principios.md', RAIZ), 'utf8').normalize('NFC');
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
