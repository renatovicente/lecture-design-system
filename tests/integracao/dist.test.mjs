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
import { iniciarChrome, servirPastaCrua, esperarMontagem, abrirAula, rotearCdn } from './utilitarios.mjs';

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
  const { pagina, erros } = await abrirPeloDist('especime/index.html', { bytesExtras: ';\n' });
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
// que `aula-usp.js` traz embutido" —, que este comentário registrou como NÃO implementada enquanto
// ela não existiu, JÁ ESTÁ implementada: `import()` dinâmico de fato não carrega `integrity`, e por
// isso quem confere é o import map que `montar/dist.js` injeta no arranque, cuja chave `integrity` o
// Chrome honra também no `import()` dinâmico. Medido sobre esta mesma rota: `codigo.html` monta com
// 9 pedidos e um import map de 9 entradas; com dois bytes a mais em `aula-usp-codigo.js`, em
// `aula-usp-tex.js` ou na gramática de Python, o Chrome bloqueia e a aula não monta.
// Este arquivo ainda não ASSERE isso — a tarefa 3 do plano do SRI dos satélites é que mede aqui.
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
