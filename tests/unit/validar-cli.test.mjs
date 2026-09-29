// Cola de Node do validador (spec 8.1 e 9.3): lê a aula do disco e devolve os achados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarArquivo, lerAula } from '../../build/validar.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');
const contrato = JSON.parse(readFileSync(join(RAIZ, 'contrato/contrato.json'), 'utf8'));

function aulaTemporaria(html) {
  const pasta = mkdtempSync(join(tmpdir(), 'aula-usp-'));
  writeFileSync(join(pasta, 'index.html'), html);
  return pasta;
}

// Repete uma abertura com título longo e sem data-curto (um erro de estrutura.nome-curto por
// slide) até passar de sobra dos 64 KiB que expõem o truncamento de process.exit() num cano.
//
// <script src="dist/aula-usp.js"> no head, aqui e em BOA (marco 4c, Task 4): validarArquivo agora
// também sobe o Chrome (build/composicao.mjs), e reescreverRuntime (build/servir.mjs) só troca essa
// tag pelo importmap e o carregador de verdade quando ela existe — sem ela a página nunca escreve
// document.body.dataset.montado, e page.waitForFunction espera os 30 s do Playwright à toa (medido
// no rascunho desta task). O caminho não precisa resolver a nada: só o final "/aula-usp.js" importa.
function aulaGrande(quantos) {
  let corpo = '<section data-layout="capa"><h1>Capa</h1></section>\n';
  for (let i = 0; i < quantos; i++) {
    corpo += `<section data-layout="abertura"><h2>Título bem longo número ${i}, sem data-curto</h2></section>\n`;
  }
  corpo += '<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>\n';
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof."><script src="dist/aula-usp.js"></script></head><body>
${corpo}</body></html>`;
}

const BOA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof."><script src="dist/aula-usp.js"></script></head><body>
<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="abertura" id="um"><h2>Um</h2></section>
<section data-layout="abertura" id="dois"><h2>Dois</h2></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

test('o espécime passa sem erro nas regras estáticas de estrutura', async () => {
  const { erros } = await validarArquivo(join(RAIZ, 'especime/index.html'));
  assert.equal(erros, 0);
});

test('todos os decks do espécime passam sem erro', async () => {
  for (const nome of ['index', 'componentes', 'matematica', 'codigo', 'ifusp', 'muitos-blocos']) {
    const { achados, erros } = await validarArquivo(join(RAIZ, `especime/${nome}.html`));
    assert.equal(erros, 0, `${nome}.html: ${achados.filter((a) => a.severidade === 'erro').map((a) => a.mensagem).join(' / ')}`);
  }
});

test('só muitos-blocos.html tem avisos, e são os que aquele deck existe para exercer', async () => {
  for (const nome of ['index', 'componentes', 'matematica', 'codigo', 'ifusp']) {
    const { achados } = await validarArquivo(join(RAIZ, `especime/${nome}.html`));
    assert.deepEqual(achados, [], `${nome}.html deveria estar limpo`);
  }
  const { achados } = await validarArquivo(join(RAIZ, 'especime/muitos-blocos.html'));
  assert.deepEqual(new Set(achados.map((a) => a.regra)), new Set(['estrutura.blocos', 'estrutura.id-ausente']));
});

test('a CLI sai com 0 na aula boa e imprime o cabeçalho', () => {
  const saida = execFileSync('node', [CLI, 'validar', aulaTemporaria(BOA)], { encoding: 'utf8' });
  assert.match(saida, /^Validador Aula USP: 0 erros, 0 avisos$/m);
});

test('a CLI sai com 1 e imprime a mensagem quando há erro', () => {
  const pasta = aulaTemporaria(BOA.replace('<section data-layout="capa"><h1>Capa</h1></section>', ''));
  try {
    execFileSync('node', [CLI, 'validar', pasta], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    assert.equal(erro.status, 1);
    assert.match(erro.stdout, /ERRO · slide 1 #um · estrutura\.primeiro-slide ·/);
  }
});

test('--json devolve a lista com os campos da spec 9.1', () => {
  const pasta = aulaTemporaria(BOA.replace('<h2>Dois</h2>', '<h2>Retropropagação</h2>'));
  try {
    execFileSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    const [achado, ...resto] = JSON.parse(erro.stdout);
    assert.equal(resto.length, 0);
    assert.deepEqual(Object.keys(achado), ['severidade', 'slide', 'id', 'regra', 'mensagem', 'acao', 'trecho']);
    assert.equal(achado.regra, 'estrutura.nome-curto');
    assert.equal(achado.slide, 3);
  }
});

test('o grupo de carga roda no build: TeX inválido, imagem ausente e demo sem registro', () => {
  const pasta = aulaTemporaria(BOA.replace('<section data-layout="encerramento">',
    '<section data-layout="conteudo" id="carga"><h2>Carga</h2>'
    + '<p>Erro: \\( \\frac{1 \\)</p>'
    + '<figure><img src="img/sumiu.png" alt="a"></figure>'
    + '<aside class="notas">N.</aside></section>\n<section data-layout="encerramento">'));
  try {
    execFileSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    const regras = JSON.parse(erro.stdout).map((achado) => achado.regra);
    assert.ok(regras.includes('matematica.tex-invalido'), regras.join(', '));
    assert.ok(regras.includes('recursos.imagem'), regras.join(', '));
  }
});

// Marco 4c, Task 4: com Chrome, validar mede composição também (spec 8.1: "havendo Chrome, as de
// composição"). O mesmo título de tests/integracao/composicao.test.mjs e da fixture
// composicao.linhas-titulo/ruim.html, já provado que estoura para 3 linhas (máx. 2) no Chrome — num
// slide de conteúdo: a mesma repetição de texto numa abertura mede 8 linhas (coluna mais estreita)
// e também transbordo, o que provaria a regra errada.
test('a CLI mede composição no Chrome: título que estoura em 3 linhas sai com 1 e nomeia composicao.linhas-titulo', (t) => {
  const tituloComprido = 'Um título muito comprido '.repeat(6);
  const pasta = aulaTemporaria(BOA.replace('<section data-layout="encerramento">',
    `<section data-layout="conteudo" id="longo"><h2>${tituloComprido}</h2><p>C.</p></section>\n<section data-layout="encerramento">`));
  try {
    execFileSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    assert.equal(erro.status, 1);
    // Spec 8.1, "falta de Chrome não é falha": este é o único teste deste arquivo que EXIGE Chrome,
    // e sem a degradação abaixo ele derruba o `npm test` numa máquina sem Chrome — medido, antes
    // desta linha, com CHROME_PATH apontando para um caminho inexistente: 415 passam, 1 falha, e era
    // este. (Mover tests/unit/build.test.mjs para integração, na mesma rodada de correção, era
    // necessário mas não suficiente: a CLI também abre Chrome.) O sinal é o aviso que a própria CLI
    // imprime quando pula a composição — o mesmo que o teste seguinte afirma —, então o teste não
    // inventa uma sonda de Chrome própria: ele pergunta ao programa sob teste.
    if (/composição pulada/i.test(erro.stderr ?? '')) {
      t.skip('sem Chrome: a CLI pulou a composição (spec 8.1)');
      return;
    }
    const regras = JSON.parse(erro.stdout).map((achado) => achado.regra);
    assert.ok(regras.includes('composicao.linhas-titulo'), regras.join(', '));
  }
});

// Spec 8.1: "Falta de Chrome não é falha: vira aviso e pula composição". CHROME_PATH para um
// caminho que não existe é a mesma falha que build/composicao.mjs mediu no rascunho do brief.
test('CHROME_PATH inexistente: a CLI avisa no stderr e a saída continua a dos outros grupos', () => {
  const pasta = aulaTemporaria(BOA);
  const resultado = spawnSync('node', [CLI, 'validar', pasta], {
    encoding: 'utf8',
    env: { ...process.env, CHROME_PATH: '/caminho/que/nao/existe/de-verdade' },
  });
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.match(resultado.stderr, /aviso.*composição pulada/i);
  assert.match(resultado.stdout, /^Validador Aula USP: 0 erros, 0 avisos$/m);
});

test('pasta sem index.html sai com 2', () => {
  try {
    execFileSync('node', [CLI, 'validar', mkdtempSync(join(tmpdir(), 'vazia-'))], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /não encontrei/);
  }
});

test('um arquivo também pode ser validado direto', () => {
  const saida = execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime/matematica.html')], { encoding: 'utf8' });
  assert.match(saida, /0 erros/);
});

test('uma flag desconhecida sai com 2 e imprime o uso', () => {
  try {
    execFileSync('node', [CLI, 'validar', aulaTemporaria(BOA), '--formato=texto'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

// Rodada de correção 1 da tarefa 3: cada comando só reconhece a flag dele (spec 8.1: servir
// --porta; validar --json; build --sem-pdf) — uma flag de OUTRO comando era aceita e ignorada em
// silêncio, o oposto de "flag desconhecida sai com 2", que já vale para uma flag que não existe
// nenhuma. Três casos, um por comando com uma flag de vizinho.
test('validar recusa --sem-pdf (é de build, não dele)', () => {
  try {
    execFileSync('node', [CLI, 'validar', aulaTemporaria(BOA), '--sem-pdf'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

test('build recusa --porta (é de servir, não dele)', () => {
  try {
    execFileSync('node', [CLI, 'build', aulaTemporaria(BOA), '--porta', '9999'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

test('servir recusa --json (é de validar, não dele)', () => {
  try {
    execFileSync('node', [CLI, 'servir', aulaTemporaria(BOA), '--json'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

test('um segundo posicional sai com 2', () => {
  try {
    execFileSync('node', [CLI, 'validar', aulaTemporaria(BOA), aulaTemporaria(BOA)], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

test('dist não aceita alvo: um segundo argumento sai com 2 e imprime o uso', () => {
  try {
    execFileSync('node', [CLI, 'dist', 'alguma-pasta'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

test('caminho que não existe ainda sai com 2 e "não encontrei"', () => {
  try {
    execFileSync('node', [CLI, 'validar', join(RAIZ, 'especime/nao-existe.html')], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /não encontrei/);
  }
});

test('bin/aula-usp.mjs não importa build/servir.mjs, build/validar.mjs nem build/build.mjs no topo do módulo', () => {
  // import estático rodaria a leitura de disco desses módulos (contrato.json nos três; linkedom em
  // build/validar.mjs; playwright-core e pdf-lib em build/build.mjs, arrastados de build/pdf.mjs e
  // build/composicao.mjs) antes de qualquer try/catch do comando, transformando um arquivo do
  // sistema ou uma dependência ausente em stack trace e saída 1 em vez da saída 2 da spec 8.1 — o
  // bug que ce7a824 corrigiu para servir.mjs, uma rodada seguinte corrigiu para validar.mjs, e esta
  // tarefa (build/build.mjs, o comando `build`) segue a mesma regra desde o primeiro commit. Um
  // teste de comportamento exigiria uma segunda cópia do sistema em disco sem a dependência; este
  // guard de código-fonte é o substituto barato e honesto.
  const fonte = readFileSync(CLI, 'utf8');
  assert.doesNotMatch(fonte, /^\s*import\b.*build\/servir\.mjs/m);
  assert.doesNotMatch(fonte, /^\s*import\b.*build\/validar\.mjs/m);
  assert.doesNotMatch(fonte, /^\s*import\b.*build\/build\.mjs/m);
});

// A partir daqui, testes do comando `build` (tarefa 3 do marco 5c) — só os que não precisam de
// Chrome de verdade: os quatro finais da spec 3.3, com Chrome real, têm teste próprio e mais lento
// em tests/unit/build.test.mjs (um Chrome só, aberto uma vez, reaproveitado entre eles). Aqui é só a
// CLI por cima: despacho, uso, e os dois casos que já são rápidos sem Chrome — erro estático (nunca
// chega a abrir um navegador) e CHROME_PATH inexistente (abre e falha na hora).
function aulaTemporariaDoArquivo(caminho) {
  return aulaTemporaria(readFileSync(caminho, 'utf8'));
}

const FIXTURE_BUILD = (nome) => join(RAIZ, `tests/fixtures/build/${nome}/aula.html`);

test('build: sem pasta sai com 2 e imprime o uso', () => {
  try {
    execFileSync('node', [CLI, 'build'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

test('build: pasta que não existe sai com 2 e "não encontrei"', () => {
  try {
    execFileSync('node', [CLI, 'build', join(RAIZ, 'especime/nao-existe.html')], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /não encontrei/);
  }
});

// Etapa 1 (sem navegador): a CLI nunca chega a abrir Chrome nenhum aqui, então este teste continua
// rápido — a mesma razão de tests/unit/build.test.mjs chamar build() diretamente para os finais que
// precisam de Chrome de verdade, em vez de passar todos pela CLI.
test('build: erro estático sai com 1, cita estrutura.metadados e grava só validacao.json em <pasta>/dist', () => {
  const pasta = aulaTemporariaDoArquivo(FIXTURE_BUILD('erro-estatico'));
  try {
    execFileSync('node', [CLI, 'build', pasta], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    assert.equal(erro.status, 1);
    assert.match(erro.stdout, /estrutura\.metadados/);
    assert.deepEqual(readdirSync(join(pasta, 'dist')), ['validacao.json']);
  }
});

// Spec 8.1: "Falta de Chrome não é falha: vira aviso e pula composição e PDF" — o mesmo CHROME_PATH
// inexistente do teste equivalente de `validar`, agora sobre `build`: grava o HTML (sem PDF), avisa
// no stderr e sai 0, porque a fixture não tem nenhum erro estático nem de carga.
test('build: CHROME_PATH inexistente avisa no stderr, grava o HTML (sem PDF) e sai 0 numa aula limpa', () => {
  const pasta = aulaTemporariaDoArquivo(FIXTURE_BUILD('aula-limpa'));
  const resultado = spawnSync('node', [CLI, 'build', pasta], {
    encoding: 'utf8',
    env: { ...process.env, CHROME_PATH: '/caminho/que/nao/existe/de-verdade' },
  });
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.match(resultado.stderr, /aviso.*composição pulada, sem Chrome/i);
  // <slug> vem do nome da PASTA quando o alvo resolve para index.html (build/construir.mjs:
  // slugDaAula, cópia única desde M4) — aulaTemporaria grava index.html dentro de uma pasta com nome
  // aleatório (mkdtempSync), então o HTML final se chama "<nome da pasta>.html", nunca "index.html".
  // Esta é a forma que a spec 3.3 descreve; a forma com alvo-arquivo passou, na correção do I7, a
  // nomear pelo arquivo (tests/integracao/slug.test.mjs).
  assert.deepEqual(readdirSync(join(pasta, 'dist')).sort(), [`${basename(pasta)}.html`, 'validacao.json'].sort());
});

// I4 da revisão final, segunda metade: o catch de buildComando traduzia QUALQUER exceção do
// pipeline em "falha de ambiente: … rode npm install na pasta do sistema" — inclusive as que nenhum
// npm install conserta. O critério agora é a origem: só o bloco dos imports dinâmicos (o único lugar
// onde falta de dependência aparece) fala em npm install; o que estoura depois é falha do pipeline.
// Uma pasta sem permissão de escrita é o caso mais barato de produzir E o mais fácil de reconhecer:
// build() morre no primeiro mkdir, antes de ler a aula e antes de abrir Chrome nenhum — o teste é
// rápido e não depende de navegador, como os outros dois testes de `build` deste arquivo.
test('build: falha do pipeline não sai como falta de dependência', { skip: process.getuid?.() === 0 && 'root ignora a permissão da pasta' }, () => {
  const pasta = aulaTemporariaDoArquivo(FIXTURE_BUILD('aula-limpa'));
  chmodSync(pasta, 0o555);
  try {
    const resultado = spawnSync('node', [CLI, 'build', pasta], { encoding: 'utf8' });
    assert.equal(resultado.status, 2, resultado.stderr); // spec 8.1: "não deu para rodar"
    assert.doesNotMatch(resultado.stderr, /npm install/,
      `o conselho de instalação saiu para uma falha que não é de dependência: ${resultado.stderr}`);
    assert.match(resultado.stderr, /o build falhou/);
    assert.match(resultado.stderr, /EACCES|EPERM/); // a mensagem de verdade, que o autor pode agir
  } finally {
    chmodSync(pasta, 0o755); // devolve a permissão para o mkdtemp poder ser limpo por quem limpar
  }
});

test('build: --sem-pdf é reconhecida, não "flag desconhecida"', () => {
  const pasta = aulaTemporariaDoArquivo(FIXTURE_BUILD('erro-estatico'));
  try {
    // Mesma fixture do teste de erro estático: falha na etapa 1, antes de --sem-pdf importar — o
    // ponto aqui não é o efeito da flag, só que ela não cai no "flag desconhecida" (saída 2, uso).
    execFileSync('node', [CLI, 'build', pasta, '--sem-pdf'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 1');
  } catch (erro) {
    assert.equal(erro.status, 1, erro.stderr);
  }
});

// Os dois exemplos literais da spec 7.2, byte a byte, para os testes de C1 e C2 da revisão final da 2a.
const DIAGRAMA_7_2 = `<figure class="diagrama">
  <script type="text/vnd.graphviz">
  digraph { rankdir=LR; entrada -> oculta -> saida; oculta [class="foco"]; }
  </script>
  <figcaption>Rede com uma camada oculta.</figcaption>
</figure>`;
const GRAFICO_7_2 = `<figure class="grafico">
  <script type="application/json">
  { "tipo": "linha", "dados": "data/erro.csv", "x": "epoca", "y": ["treino", "teste"], "foco": "teste",
    "eixos": { "x": "época", "y": "erro" }, "faixas": [{ "x": [120, 245], "rotulo": "platô" }] }
  </script>
  <figcaption>Erro de treino e de teste ao longo das épocas.</figcaption>
</figure>`;
const GRAFICO_INLINE = `<figure class="grafico"><script type="application/json">
{"tipo":"linha","dados":{"epoca":[0,1,2,3],"erro":[1,0.6,0.35,0.2]},"x":"epoca","y":["erro"]}
</script></figure>`;
const comFiguras = (...figuras) => BOA.replace('<section data-layout="encerramento">', figuras.map((figura, i) =>
  `<section data-layout="figura" id="f${i}"><h2>Figura</h2>${figura}<aside class="notas">N.</aside></section>\n`).join('')
  + '<section data-layout="encerramento">');
const SEM_CHROME = { ...process.env, CHROME_PATH: '/caminho/que/nao/existe/de-verdade' };

// Critical 1 da revisão final da 2a: um figure.diagrama saía de validar e de build com 0 erros e a
// figura vazia. Na 2a, a saída foi recusar todo diagrama; desde a 2b, o exemplo literal da spec 7.2
// sai de validar e de build com 0 erros E com o SVG no HTML construído — sozinho ou ao lado de um
// gráfico —, e um DOT que o Graphviz não compila para a etapa 1 com a mensagem dele. Sem Chrome de
// propósito: as duas coisas são da etapa 1 e da 3, no Node.
const DIAGRAMA_QUEBRADO = `<figure class="diagrama"><script type="text/vnd.graphviz">digraph {
  entrada -> ;
}</script></figure>`;

test('o exemplo literal de diagrama da spec 7.2 sai de validar e de build com 0 erros e com o SVG desenhado, sozinho ou ao lado de um gráfico', () => {
  for (const [nome, html] of [['só diagrama', comFiguras(DIAGRAMA_7_2)], ['gráfico e diagrama', comFiguras(GRAFICO_INLINE, DIAGRAMA_7_2)]]) {
    const pasta = aulaTemporaria(html);
    const validacao = spawnSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8', env: SEM_CHROME });
    assert.equal(validacao.status, 0, `${nome}\n${validacao.stdout}${validacao.stderr}`);
    assert.deepEqual(JSON.parse(validacao.stdout).filter((achado) => achado.severidade === 'erro'), [], nome);
    const construcao = spawnSync('node', [CLI, 'build', pasta, '--sem-pdf'], { encoding: 'utf8', env: SEM_CHROME });
    assert.equal(construcao.status, 0, `${nome}\n${construcao.stdout}${construcao.stderr}`);
    const construido = readFileSync(join(pasta, 'dist', `${basename(pasta)}.html`), 'utf8');
    const figura = construido.match(/<figure class="diagrama">[\s\S]*?<\/figure>/)[0];
    // O DOT desenhado de verdade: os três nós, o de foco em amarelo — não um SVG vazio.
    assert.equal(figura.match(/<g class="no( foco)?">/g).length, 3, nome);
    assert.match(figura, /<g class="no foco"><rect [^>]*fill="#FCB421"[^>]*>(<\/rect>)?<text [^>]*>oculta<\/text>/, nome);
  }
});

test('DOT que o Graphviz não compila para validar e build na etapa 1, com a mensagem dele e o slide', () => {
  const pasta = aulaTemporaria(comFiguras(GRAFICO_INLINE, DIAGRAMA_QUEBRADO));
  const validacao = spawnSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8', env: SEM_CHROME });
  assert.equal(validacao.status, 1, validacao.stdout + validacao.stderr);
  const erros = JSON.parse(validacao.stdout).filter((achado) => achado.severidade === 'erro');
  assert.deepEqual(erros.map((achado) => [achado.regra, achado.id]), [['recursos.dot', 'f1']]);
  assert.match(erros[0].mensagem, /syntax error in line 2 near ';'/);
  // M6 da revisão final da 2b: o trecho é a linha citada, com o número — não o DOT juntado numa linha.
  assert.equal(erros[0].trecho, 'linha 2: entrada -> ;');
  const construcao = spawnSync('node', [CLI, 'build', pasta, '--sem-pdf'], { encoding: 'utf8', env: SEM_CHROME });
  assert.equal(construcao.status, 1, construcao.stdout + construcao.stderr);
  assert.match(construcao.stdout, /recursos\.dot · diagrama que não desenha: o Graphviz não compila o DOT: syntax error in line 2/);
});

// Critical 2 da revisão final da 2a: o exemplo literal da spec 7.2 aponta para "data/erro.csv".
// Medido antes do conserto, com o CSV no disco: validar 0 erros, build saída 1 com "dados não
// encontrados para "data/erro.csv"" — não havia leitor de CSV. O critério: validar E build com 0
// erros, e <svg> de verdade no HTML construído.
test('o exemplo literal da spec 7.2, com data/erro.csv no disco, sai de validar e de build com 0 erros e com <svg>', () => {
  const pasta = aulaTemporaria(comFiguras(GRAFICO_7_2));
  mkdirSync(join(pasta, 'data'));
  let csv = 'epoca,treino,teste\n';
  for (let epoca = 0; epoca <= 300; epoca += 20) csv += `${epoca},${(1 / (1 + epoca / 50)).toFixed(4)},${(1 / (1 + epoca / 80) + 0.1).toFixed(4)}\n`;
  writeFileSync(join(pasta, 'data/erro.csv'), csv);
  const validacao = spawnSync('node', [CLI, 'validar', pasta, '--json'], { encoding: 'utf8', env: SEM_CHROME });
  assert.equal(validacao.status, 0, validacao.stdout + validacao.stderr);
  assert.deepEqual(JSON.parse(validacao.stdout).filter((achado) => achado.severidade === 'erro'), []);
  const construcao = spawnSync('node', [CLI, 'build', pasta, '--sem-pdf'], { encoding: 'utf8', env: SEM_CHROME });
  assert.equal(construcao.status, 0, construcao.stdout + construcao.stderr);
  const html = readFileSync(join(pasta, 'dist', `${basename(pasta)}.html`), 'utf8');
  const svg = html.match(/<figure class="grafico">[\s\S]*?<\/figure>/)[0];
  assert.match(svg, /<svg viewBox="0 0 640 360"/);
  // As duas séries do CSV desenhadas, com o foco em azul: é o CSV que chegou ao desenho, não um SVG vazio.
  assert.match(svg, /data-serie="treino" data-cor="tinta"/);
  assert.match(svg, /data-serie="teste" data-cor="azul"/);
});

test('--json não trunca em 64 KiB quando a saída é lida por um cano', async () => {
  // process.exit() descarta escrita pendente em stdout; num cano, isso corta o JSON no meio.
  // Um teste pequeno passaria com o bug presente — por isso a aula tem que gerar achados de
  // sobra, e a checagem é por conteúdo (JSON.parse + contagem), não por tamanho aproximado.
  const pasta = aulaTemporaria(aulaGrande(180));
  const { achados: esperados } = await validarArquivo(pasta);
  const filho = spawn('node', [CLI, 'validar', pasta, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const pedacos = [];
  filho.stdout.on('data', (pedaco) => pedacos.push(pedaco));
  const [codigo] = await new Promise((resolvido) => filho.on('close', (...args) => resolvido(args)));
  const saida = Buffer.concat(pedacos);
  assert.ok(saida.byteLength > 65536, `a saída precisa passar de 64 KiB para exercer o bug: ${saida.byteLength} bytes`);
  const achados = JSON.parse(saida.toString('utf8'));
  assert.deepEqual(achados, esperados);
  assert.equal(codigo, 1);
});

// lerAula normaliza a grafia de atributo na fronteira onde o fonte vira DOM (build/validar.mjs):
// o linkedom preserva a grafia do autor, um navegador normaliza para minúsculas e, dentro de SVG,
// restaura a grafia canônica do contrato. Sem isso, <div Class="colunas"> não bate com o seletor
// "div.colunas" que estrutura.colunas e o casador de sequência usam (medido no marco 4b).
test('atributo com grafia diferente do autor (Class) valida exatamente como a mesma aula em minúsculas', async () => {
  const original = readFileSync(join(RAIZ, 'especime/index.html'), 'utf8');
  assert.match(original, /<div class="colunas" data-grade="8-4">/);
  const comClasseMaiuscula = original.replace('<div class="colunas" data-grade="8-4">', '<div Class="colunas" data-grade="8-4">');
  assert.notEqual(comClasseMaiuscula, original);
  const { achados: esperados } = await validarArquivo(join(RAIZ, 'especime/index.html'));
  assert.deepEqual(esperados, []); // a base da comparação: o espécime original já é limpo
  const { achados } = await validarArquivo(aulaTemporaria(comClasseMaiuscula));
  assert.deepEqual(achados, esperados);
});

test('<svg VIEWBOX> continua funcionando, e a grafia final é viewBox, a do contrato', async () => {
  const original = readFileSync(join(RAIZ, 'especime/index.html'), 'utf8');
  assert.match(original, /viewBox="0 0 1152 360"/);
  const comViewboxMaiusculo = original.replace('viewBox="0 0 1152 360"', 'VIEWBOX="0 0 1152 360"');
  assert.notEqual(comViewboxMaiusculo, original);
  const pasta = aulaTemporaria(comViewboxMaiusculo);
  const { achados } = await validarArquivo(pasta);
  assert.deepEqual(achados, []);
  const documento = lerAula(join(pasta, 'index.html'), contrato);
  const svg = documento.querySelector('svg');
  assert.equal(svg.getAttribute('viewBox'), '0 0 1152 360');
  assert.equal(svg.hasAttribute('VIEWBOX'), false);
});

test('valor de atributo com maiúscula, como data-rotulo="Definição", não é tocado pela normalização', () => {
  // O mesmo elemento também tem Class maiúsculo, para o valor passar pelo ciclo de
  // removeAttribute + setAttribute do atributo vizinho, não só pelo caminho em que nada muda.
  const pasta = aulaTemporaria('<!DOCTYPE html><html><body><div Class="x" data-rotulo="Definição">y</div></body></html>');
  const documento = lerAula(join(pasta, 'index.html'), contrato);
  const div = documento.querySelector('div');
  assert.equal(div.getAttribute('class'), 'x');
  assert.equal(div.hasAttribute('Class'), false);
  assert.equal(div.getAttribute('data-rotulo'), 'Definição');
});

// Achado da revisão final (item 7, "já conhecido"): o linkedom preserva Class e class como dois
// atributos distintos (ao contrário de um navegador, que já descarta a duplicata no parser); o
// comportamento de "vence o primeiro" é um efeito colateral de normalizarAtributos recolocar os
// atributos de trás para a frente, e não tinha teste próprio.
test('Class e class no mesmo elemento: vence o primeiro do fonte, como no navegador', () => {
  const pasta = aulaTemporaria('<!DOCTYPE html><html><body><div Class="primeiro" class="segundo" data-rotulo="X">y</div></body></html>');
  const documento = lerAula(join(pasta, 'index.html'), contrato);
  const div = documento.querySelector('div');
  assert.equal(div.getAttribute('class'), 'primeiro');
  assert.deepEqual([...div.attributes].map((atributo) => atributo.name), ['class', 'data-rotulo']);
});

// `validar --slide <id|n>` (spec 2026-09-28, 5.1; plano do corrigir, D4): valida a aula inteira, como
// sempre — a composição precisa dela toda no Chrome —, relata só os achados do slide pedido e sai
// com 1 só se houver ERRO nele. Aula com um erro no slide 3 (estrutura.nome-curto) e um aviso no
// slide 5 (estrutura.notas-ausentes). Sem Chrome de propósito: os dois achados são estáticos, e o
// que se prova aqui é o filtro, não a composição.
const AULA_3_E_5 = BOA.replace('<section data-layout="abertura" id="dois"><h2>Dois</h2></section>',
  '<section data-layout="abertura" id="tres"><h2>Retropropagação</h2></section>\n'
  + '<section data-layout="abertura" id="quatro"><h2>Quatro</h2></section>\n'
  + '<section data-layout="conteudo" id="cinco"><h2>Cinco</h2><p>Um parágrafo.</p></section>');

function validarSlide(pasta, ...extras) {
  return spawnSync('node', [CLI, 'validar', pasta, ...extras], { encoding: 'utf8', env: SEM_CHROME });
}

test('a aula de --slide tem de fato um erro no slide 3 e um aviso no slide 5, e nada mais', () => {
  const { status, stdout } = validarSlide(aulaTemporaria(AULA_3_E_5), '--json');
  assert.equal(status, 1);
  assert.deepEqual(JSON.parse(stdout).map((a) => [a.severidade, a.slide, a.id, a.regra]),
    [['erro', 3, 'tres', 'estrutura.nome-curto'], ['aviso', 5, 'cinco', 'estrutura.notas-ausentes']]);
});

test('validar --slide 3 imprime só o erro do slide 3, a linha do que ficou de fora, e sai com 1', () => {
  const { status, stdout } = validarSlide(aulaTemporaria(AULA_3_E_5), '--slide', '3');
  assert.equal(status, 1);
  assert.match(stdout, /^ERRO · slide 3 #tres · estrutura\.nome-curto ·/m);
  assert.doesNotMatch(stdout, /slide 5/);
  assert.match(stdout, /^1 achado em outros slides e 0 da aula, fora deste relatório$/m);
});

test('validar --slide 5 imprime o aviso e sai com 0, mesmo com erro no slide 3', () => {
  const { status, stdout } = validarSlide(aulaTemporaria(AULA_3_E_5), '--slide', '5');
  assert.equal(status, 0, stdout);
  assert.match(stdout, /^AVISO · slide 5 #cinco · estrutura\.notas-ausentes ·/m);
  assert.doesNotMatch(stdout, /ERRO/);
  assert.match(stdout, /^1 achado em outros slides e 0 da aula, fora deste relatório$/m);
});

test('validar --slide aceita o id, como `aula-usp slide`', () => {
  const pasta = aulaTemporaria(AULA_3_E_5);
  const porId = validarSlide(pasta, '--slide', 'cinco');
  assert.equal(porId.status, 0);
  assert.equal(porId.stdout, validarSlide(pasta, '--slide', '5').stdout);
  assert.equal(validarSlide(pasta, '--slide', 'tres').status, 1);
});

test('validar --slide num slide limpo sai com 0 e sem nenhuma linha de achado', () => {
  const { status, stdout } = validarSlide(aulaTemporaria(AULA_3_E_5), '--slide', 'um');
  assert.equal(status, 0);
  assert.doesNotMatch(stdout, /^(ERRO|AVISO) ·/m);
  assert.match(stdout, /^2 achados em outros slides e 0 da aula, fora deste relatório$/m);
});

test('validar --slide com alvo inexistente sai com 1 e não valida', () => {
  for (const alvo of ['nao-existe', '0', '99']) {
    const { status, stdout, stderr } = validarSlide(aulaTemporaria(AULA_3_E_5), '--slide', alvo);
    assert.equal(status, 1, alvo);
    assert.equal(stdout, '');
    assert.match(stderr, /não há slide/);
  }
});

test('validar --json --slide sai com a lista filtrada, e só ela no stdout', () => {
  const pasta = aulaTemporaria(AULA_3_E_5);
  const cinco = validarSlide(pasta, '--json', '--slide', '5');
  assert.equal(cinco.status, 0);
  assert.deepEqual(JSON.parse(cinco.stdout).map((a) => [a.slide, a.regra]), [[5, 'estrutura.notas-ausentes']]);
  const tres = validarSlide(pasta, '--slide', '3', '--json');
  assert.equal(tres.status, 1);
  assert.deepEqual(JSON.parse(tres.stdout).map((a) => [a.slide, a.regra]), [[3, 'estrutura.nome-curto']]);
});

test('validar --slide sem valor sai com 2', () => {
  assert.equal(validarSlide(aulaTemporaria(AULA_3_E_5), '--slide').status, 2);
  assert.equal(validarSlide(aulaTemporaria(AULA_3_E_5), '--slide', '--json').status, 2);
});
