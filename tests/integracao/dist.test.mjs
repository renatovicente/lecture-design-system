// dist/ pelo caminho real: servidor estático burro, a tag que o espécime já carrega, Chrome de verdade.
// Sem o `servir`, de propósito — é o `servir` que hoje reescreve a tag, e o que está sob teste aqui é
// justamente o caminho em que ninguém reescreve nada. Por isso servirPastaCrua, não servirPasta — ver
// o comentário dela em utilitarios.mjs.
//
// Desde a rodada de correção final do 6c, a tag que o espécime carrega é a FIXADA — CDN, versão e
// `integrity` —, como as de `modelos/` e `exemplos/` (spec 3.2, 8.1 e 12). O endereço não resolve (a
// publicação é da fase 3), e quem responde é `rotearCdn` (utilitarios.mjs): o Chrome intercepta o
// pedido e devolve os bytes de `dist/`. Ninguém reescreve a tag — a propriedade que este arquivo
// existe para medir continua inteira, e agora vale sobre a tag que o autor de fato publica.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RAIZ, iniciarChrome, servirPastaCrua, esperarMontagem, abrirAula, rotearCdn } from './utilitarios.mjs';

let navegador;
let sitio;

before(async () => {
  navegador = await iniciarChrome();
  sitio = await servirPastaCrua('.'); // a raiz do sistema: o espécime pede o runtime pela base da CDN
});
after(async () => {
  await navegador?.close();
  await sitio?.fechar();
});

// Recebe o caminho completo a partir da raiz servida por servirPastaCrua('.') — não só o nome do
// deck — porque a rodada de correção 1 precisou abrir também uma fixture fora de especime/
// (tests/fixtures/painel/demo.html) pelo mesmo pacote real. Os três decks passam `especime/${deck}`.
async function abrirPeloDist(caminho, opcoesDaRota) {
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  pagina.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) erros.push(m.text()); });
  pagina.on('pageerror', (e) => erros.push(e.message));
  const { base, pedidos } = await rotearCdn(pagina, opcoesDaRota);
  await pagina.goto(`${sitio.endereco}/${caminho}`);
  return { pagina, erros, base, pedidos };
}

async function montar(caminho) {
  const aberta = await abrirPeloDist(caminho);
  await esperarMontagem(aberta.pagina);
  const titulo = await aberta.pagina.evaluate(() => document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent);
  return { ...aberta, titulo };
}

for (const deck of ['index.html', 'matematica.html', 'codigo.html']) {
  test(`${deck} monta pelo pacote de dist/, sem erro de console`, async (t) => {
    const { pagina, erros, titulo } = await montar(`especime/${deck}`);
    t.after(() => pagina.close());
    assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
    assert.deepEqual(erros, [], erros.join('\n'));
  });
}

// A primeira vez que este repositório pergunta a um NAVEGADOR se o `integrity` que ele escreve
// funciona. A guarda de tests/unit/pacotes.test.mjs compara a string do atributo com a string de
// dist/manifesto.json: prova que os dois textos batem, e não que o hash valida os bytes — nenhuma
// das duas pontas dela é o Chrome. Aqui os bytes servidos são os de dist/ mais dois (`;\n`), a tag
// fica intacta, e quem recusa é o navegador.
//
// A asserção é sobre a recusa, não sobre a frase: o Chrome imprime "Failed to find a valid digest in
// the 'integrity' attribute…", mas o que não pode mudar é que o script NÃO executa — `AulaUSP` não
// existe e a aula não monta. A frase entra como /integrity/, que é o que sobrevive a uma versão nova
// do navegador.
test('dois bytes a mais em aula-usp.js e o Chrome recusa o script: o integrity da tag é conferido de verdade', async (t) => {
  const { pagina, erros } = await abrirPeloDist('especime/index.html', { corromper: 'aula-usp.js' });
  t.after(() => pagina.close());
  const montado = await pagina.evaluate(() => document.body?.dataset.montado);
  assert.equal(montado, undefined, 'a aula montou com o runtime corrompido — o integrity não está sendo conferido');
  assert.ok(
    erros.some((mensagem) => /integrity/i.test(mensagem)),
    `nenhum erro de integrity no console; o que veio foi: ${erros.join(' | ') || '(nada)'}`,
  );
});

// O outro caminho que a tag relativa nunca exercitou: `aula-usp.js` resolve os scripts secundários a
// partir de `document.currentScript.src` (montar/dist.js, spec 3.2 passo 5). Com `../dist/…`, essa
// base era o próprio host de teste; com a tag fixada, é a base da CDN, e é ela que este teste mede.
// `codigo.html` é o deck que puxa a cadeia inteira: o runtime, o satélite do código e uma gramática
// por linguagem usada.
//
// A outra metade da spec 3.2, passo 5 — "cada script secundário é carregado com o seu `integrity`,
// que `aula-usp.js` traz embutido" — é medida pelos dois testes do fim deste arquivo. Aqui só o
// ENDEREÇO está sob teste; lá, a conferência.
test('a cadeia de scripts secundários é pedida pela base da CDN, não pelo host que serve a aula', async (t) => {
  const { pagina, erros, titulo, base, pedidos } = await montar('especime/codigo.html');
  t.after(() => pagina.close());
  assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.deepEqual(erros, [], erros.join('\n'));
  assert.ok(pedidos.includes('aula-usp.js'), 'o runtime não foi pedido pela base da CDN');
  assert.ok(pedidos.includes('aula-usp-codigo.js'), 'o satélite do código não foi pedido pela base da CDN');
  const gramaticas = pedidos.filter((nome) => nome.startsWith('aula-usp-lang-'));
  const linguagens = await pagina.evaluate(() => [...new Set([...document.querySelectorAll('pre[data-lang]')]
    .map((pre) => pre.getAttribute('data-lang')))]);
  // Uma por linguagem do deck, lidas do próprio deck: um `pre[data-lang]` a mais ou a menos em
  // codigo.html muda os dois lados juntos, e o que a guarda mede continua sendo a cadeia.
  assert.equal(gramaticas.length, linguagens.length, `${gramaticas.length} gramáticas pedidas para ${linguagens.length} linguagens`);
  assert.equal(pedidos.length, linguagens.length + 2, `pedidos à CDN: ${pedidos.join(', ')}`);
  // E os scripts que o navegador de fato tem na página vieram todos da base da CDN.
  const fontes = await pagina.evaluate(() => [...document.querySelectorAll('script[src]')].map((s) => s.src));
  assert.ok(fontes.length > 0, 'a página não tem script nenhum com src');
  for (const src of fontes) assert.ok(src.startsWith(base), `script fora da base da CDN: ${src}`);
});

// Critical da revisão final do 5a (C1): três das quatro buscas de rede que entrada.js faz (contrato,
// unidades, usp) estavam num Promise.all sem guarda — bloqueadas (como aqui: servirPastaCrua não tem
// CDN nenhuma fora do ar, mas o efeito de "não embutiu" é o mesmo pedido de rede), a aula não montava,
// tela em branco, sem mensagem. Foi assim que o revisor achou o problema: abrindo um deck e olhando os
// pedidos de rede. Mede a CONSEQUÊNCIA (nenhum pedido que não seja script sobra), não o mecanismo (que
// módulos dist.js importa) — se alguém voltar a buscar qualquer um dos quatro JSON ou das três marcas
// por fetch/<img src>, o pedido aparece na lista e o teste falha.
test('o pacote de dist/ não busca nenhum recurso que não seja script (spec 3.2)', async (t) => {
  const url = `${sitio.endereco}/especime/index.html`;
  const { pagina, erros, pedidos } = await abrirAula(navegador, url, { cdn: true });
  t.after(() => pagina.close());
  const titulo = await pagina.evaluate(() => document.querySelector('[data-painel="validador"] .painel-titulo')?.textContent);
  assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.deepEqual(erros, [], erros.join('\n'));
  const outros = pedidos.filter((pedido) => pedido !== url && !pedido.endsWith('.js') && !pedido.endsWith('/favicon.ico'));
  assert.deepEqual(outros, [], `pedido de rede que não é script: ${outros.join(', ')}`);
});

// A fila de AulaUSP.demo existir antes do <script> do autor é a razão de o pacote ser script
// clássico, e a razão de a tarefa 1 ter partido a entrada em três (rodada de correção 1, item 2).
// Este teste mede a CONSEQUÊNCIA, não o mecanismo: window.AulaUSP.demos nunca existe nesta
// arquitetura (motor/demos.js guarda o registro num Map fechado dentro de criarDemos, nunca
// reexposto) e instalarDemos esvazia filaDeDemos incondicionalmente — então medir os dois direto,
// como a versão anterior deste teste fazia, é tautológico (dá sempre `0 > 0 || 0 === 0`, sempre
// verdadeiro, não importa se a fila sobreviveu ou não). tests/fixtures/painel/demo.html registra
// 'fixture-demo' durante o parsing e tem um <div class="demo" data-demo="fixture-demo">: se a fila
// se perder antes do passo 6 de montar/entrada.js ler filaDeDemos, recursos.demo-sem-registro
// dispara como ERRO (contrato.json: severidade "erro") e o painel deixa de dizer "0 erros" — o
// mesmo defeito que a Ruling 11 (motor/demos.js) documenta e guarda do lado do motor.
test('a demo registrada durante o parsing sobrevive ao pacote do dist', async (t) => {
  const { pagina, erros, titulo } = await montar('tests/fixtures/painel/demo.html');
  t.after(() => pagina.close());
  assert.equal(titulo, 'Validador Aula USP: 0 erros, 0 avisos');
  assert.deepEqual(erros, [], erros.join('\n'));
});

// ── A prova do `integrity` dos SATÉLITES (spec 3.2, passo 5) ─────────────────────────────────────
//
// Uma suíte verde não prova nada aqui por si: antes do trabalho do SRI dos satélites ela também
// estava verde, com os nove secundários vindo da CDN sem conferência NENHUMA. O que separa um estado
// do outro são as duas asserções abaixo, e nada mais.
//
// O mecanismo é o import map, não o atributo: `import()` dinâmico não tem onde receber `integrity`
// (não existe argumento para isso), e por isso quem confere é o mapa que `montar/dist.js` injeta no
// arranque, antes do primeiro `import()`. O Chrome honra a chave `integrity` do mapa também no
// `import()` dinâmico.
//
// NENHUM deck do espécime usa matemática E código. Medido: `matematica.html` pede um satélite,
// `codigo.html` pede oito, e os outros quatro (index, componentes, muitos-blocos, ifusp) não pedem
// nenhum. O plano da tarefa 3 pedia "uma aula que usa matemática e código" — ela não existe, e a
// UNIÃO dos dois decks reais cobre os mesmos nove sem inventar uma fixture que teria de ser mantida
// e validada à parte, e que ninguém mais olharia.
const DECKS_DA_PROVA = ['matematica.html', 'codigo.html'];

// O universo dos dois testes abaixo NÃO vem de uma lista escrita aqui, nem do empacotador, nem do
// manifesto: vem do que o NAVEGADOR pediu ao montar os decks. Isso importa, e foi medido de outro
// jeito no despacho anterior: uma guarda cujo "todo" sai da mesma fonte que produz o que ela guarda
// perde o satélite e a asserção ao mesmo tempo, e fica verde. Aqui os pedidos (o que o Chrome
// buscou) e o import map (o que o Chrome tem no documento) são duas observações do navegador
// rodando, e a igualdade entre elas é o que fecha o "e os outros oito?".
//
// Uma execução só, compartilhada pelos dois testes: node:test roda os testes de um arquivo em
// sequência, então o primeiro a chamar paga os ~500 ms e o segundo reaproveita.
let levantamento;
function levantarSatelites() {
  levantamento ??= (async () => {
    const decks = [];
    for (const deck of DECKS_DA_PROVA) {
      const { pagina, erros, base, pedidos } = await abrirPeloDist(`especime/${deck}`);
      // Monta de verdade, com os hashes certos: o caminho feliz é pré-condição de tudo o que vem
      // depois — provar que bytes trocados são recusados não vale nada se os bytes certos também
      // fossem. esperarMontagem lança se data-montado não terminar em "sim".
      await esperarMontagem(pagina);
      const mapa = await pagina.evaluate(() => {
        const etiquetas = [...document.querySelectorAll('script[type="importmap"]')];
        return { quantos: etiquetas.length, integrity: JSON.parse(etiquetas[0]?.textContent ?? '{}').integrity ?? {} };
      });
      await pagina.close();
      // `aula-usp.js` sai da lista: ele é o principal, carregado pela tag com o `integrity` que o
      // teste lá em cima já mede. Satélite é o que ele carrega depois, por import().
      decks.push({ deck, base, erros, mapa, satelites: pedidos.filter((nome) => nome !== 'aula-usp.js') });
    }
    return decks;
  })();
  return levantamento;
}

// Passo 1 do plano: o caminho feliz. A aula monta, os pedidos saem pela base da CDN — e cada um
// deles tem, no mapa que o navegador de fato carregou, o hash que `dist/manifesto.json` registra.
test('todo satélite que o navegador pede tem integrity no import map, e o mapa não guarda nada além', async () => {
  const decks = await levantarSatelites();
  const manifesto = JSON.parse(await readFile(new URL('dist/manifesto.json', RAIZ), 'utf8'));
  const pedidos = new Set();
  for (const { deck, base, erros, mapa, satelites } of decks) {
    assert.deepEqual(erros, [], `${deck}: ${erros.join('\n')}`);
    // O `1` guarda "ninguém injetou dois mapas por engano" — não a conferência. Medido, com um
    // <script type="importmap"> vazio do autor antes da tag: o documento fica com 2 mapas e o
    // satélite corrompido continua recusado (montado=erro, erro de integrity no console); só esta
    // asserção cairia. Hoje o caso é inalcançável por um deck válido (`script` não está em
    // `html.elementos` do contrato, e a regra vocabulario.script acusa `script` dentro de section);
    // se a fase 2 o tornar alcançável, é esta linha que muda, e não o mecanismo.
    assert.equal(mapa.quantos, 1, `${deck}: ${mapa.quantos} import maps no documento, esperava 1`);
    assert.ok(satelites.length > 0, `${deck} não pediu satélite nenhum — o deck deixou de exercitar a cadeia`);
    for (const nome of satelites) {
      const url = `${base}${nome}`;
      const hash = mapa.integrity[url];
      assert.ok(hash, `${deck}: o navegador pediu ${nome} e o import map não tem chave para ${url}`
        + ' — esse satélite entrou sem conferência nenhuma, e sem esta asserção entraria calado');
      // Os dois lugares que guardam o mesmo número, agora com o navegador como terceira ponta: o
      // mapa que o Chrome carregou e o manifesto commitado.
      assert.equal(hash, manifesto.arquivos[nome]?.integrity,
        `${deck}: o integrity de ${nome} no import map não é o de dist/manifesto.json`);
      pedidos.add(url);
    }
  }
  // E nada sobrando, em nenhum dos decks: uma chave no mapa para um endereço que nenhum deck pede é
  // um `integrity` que o navegador nunca vai conferir — e é assim que a cobertura desta prova
  // encolheria sem ninguém ver. Quando a fase 2 acrescentar `aula-usp-graficos.js` e
  // `aula-usp-diagramas.js` (spec 3.5), esta asserção cai até que um deck de DECKS_DA_PROVA os use:
  // é de propósito, é o que obriga os dois novos a entrar na prova junto com o mecanismo.
  for (const { deck, mapa } of decks) {
    assert.deepEqual(Object.keys(mapa.integrity).sort(), [...pedidos].sort(),
      `${deck}: o import map e os satélites que os decks da prova pedem divergem`);
  }
});

// Passo 2 do plano, e é este que fecha a spec 3.2, passo 5: com `aula-usp.js` ÍNTEGRO e dois bytes a
// mais num satélite, o navegador recusa e a aula não monta. É a primeira vez que este repositório
// afirma isso sobre os secundários; sobre o principal, a tag já era medida assim desde o marco 6c.
//
// COBERTURA: os nove, um por vez — e não três, nem um. Medido: as nove recusas custam 1,96 s; este
// arquivo foi de 2,45 s para 5,14 s, e a suíte de integração inteira de 33,8 s para 35,4 s (mediana
// de três amostras cada) — menos que o arquivo cresceu, porque node:test roda os arquivos em
// paralelo e quem manda no relógio é visual.test.mjs. Por esse preço a pergunta "e os outros oito?"
// deixa de existir. Cobrir só o representante de cada ramo de `arquivoDoSatelite` (tex, código, uma
// gramática) deixaria de fora justamente o defeito que tem forma de "um satélite ficou sem entrada
// no mapa" — que é por satélite, não por ramo.
//
// A asserção é sobre a RECUSA, não sobre a frase do Chrome: o que não pode mudar é que a aula não
// monta. A frase entra como /integrity/, que é o que sobrevive a uma versão nova do navegador.
test('dois bytes a mais em um satélite e a aula não monta: o integrity do import map é conferido mesmo', async (t) => {
  const decks = await levantarSatelites();
  // Um alvo por satélite, mesmo que dois decks peçam o mesmo. Hoje não há sobreposição —
  // matematica.html pede 1, codigo.html pede 8, 1 + 8 = 9 — e por isso o `new Map` é inerte:
  // continuam nove alvos, os mesmos nove subtestes. Ele existe pelo dia em que DECKS_DA_PROVA ganhar
  // um deck que use matemática E código (o plano original pedia um desses; a fase 2 pode trazê-lo):
  // aí `alvos` teria nomes repetidos e o deepEqual abaixo cairia sem que nada estivesse errado.
  // Corromper o mesmo satélite duas vezes não prova nada a mais — o primeiro deck que o pede basta.
  const alvos = [...new Map(decks.flatMap(({ deck, satelites }) => satelites.map((nome) => [nome, deck])))];
  // A cobertura desta prova, dita em asserção e não em comentário: os alvos que ela corrompe são
  // exatamente os satélites que o import map diz proteger. Cai dos dois lados — um protegido que
  // ninguém corrompe, ou um alvo que o mapa não protege — e é o que impede a cobertura de encolher
  // sem ninguém ver.
  assert.deepEqual(alvos.map(([nome]) => `${decks[0].base}${nome}`).sort(),
    Object.keys(decks[0].mapa.integrity).sort(),
    'os alvos desta prova e os satélites que o import map protege divergem — a cobertura encolheu');

  for (const [satelite, deck] of alvos) {
    await t.test(`${satelite} (em ${deck})`, async (sub) => {
      const { pagina, erros, pedidos } = await abrirPeloDist(`especime/${deck}`, { corromper: satelite });
      sub.after(() => pagina.close());
      await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
      const [montado, painel] = await pagina.evaluate(() => [
        document.body.dataset.montado,
        document.querySelector('pre.painel')?.textContent,
      ]);
      // Primeiro: o arquivo estragado foi mesmo pedido. Sem isto, um nome de satélite errado daria
      // uma aula que monta e uma mensagem dizendo que o integrity não é conferido — culpando o
      // mecanismo por um defeito do teste.
      assert.ok(pedidos.includes(satelite), `${deck} não pediu ${satelite}: a corrupção não chegou a ser servida`);
      assert.equal(montado, 'erro',
        `a aula montou com ${satelite} corrompido — o integrity do satélite não está sendo conferido`);
      assert.ok(erros.some((mensagem) => /integrity/i.test(mensagem) && mensagem.includes(satelite)),
        `nenhum erro de integrity sobre ${satelite}; o que veio foi: ${erros.join(' | ') || '(nada)'}`);
      // E o autor fica sabendo: a aula não monta em silêncio, o painel de erro nomeia o arquivo.
      assert.ok(painel?.includes(satelite), `o painel de erro não menciona ${satelite}: ${painel ?? '(sem painel)'}`);
    });
  }
});
