// Cola de Node do validador (spec 8.1 e 9.3): lê a aula do disco e devolve os achados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
function aulaGrande(quantos) {
  let corpo = '<section data-layout="capa"><h1>Capa</h1></section>\n';
  for (let i = 0; i < quantos; i++) {
    corpo += `<section data-layout="abertura"><h2>Título bem longo número ${i}, sem data-curto</h2></section>\n`;
  }
  corpo += '<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>\n';
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof."></head><body>
${corpo}</body></html>`;
}

const BOA = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="unidade" content="ime"><meta name="disciplina" content="Teste"><meta name="aula" content="1">
<meta name="data" content="2026-09-17"><meta name="professor" content="Prof."></head><body>
<section data-layout="capa"><h1>Capa</h1></section>
<section data-layout="abertura" id="um"><h2>Um</h2></section>
<section data-layout="abertura" id="dois"><h2>Dois</h2></section>
<section data-layout="encerramento"><h2>Fim</h2><ol class="sintese"><li>Um.</li></ol></section>
</body></html>`;

test('o espécime passa sem erro nas regras estáticas de estrutura', () => {
  const { erros } = validarArquivo(join(RAIZ, 'especime/index.html'));
  assert.equal(erros, 0);
});

test('todos os decks do espécime passam sem erro', () => {
  for (const nome of ['index', 'componentes', 'matematica', 'codigo', 'ifusp', 'muitos-blocos']) {
    const { achados, erros } = validarArquivo(join(RAIZ, `especime/${nome}.html`));
    assert.equal(erros, 0, `${nome}.html: ${achados.filter((a) => a.severidade === 'erro').map((a) => a.mensagem).join(' / ')}`);
  }
});

test('só muitos-blocos.html tem avisos, e são os que aquele deck existe para exercer', () => {
  for (const nome of ['index', 'componentes', 'matematica', 'codigo', 'ifusp']) {
    const { achados } = validarArquivo(join(RAIZ, `especime/${nome}.html`));
    assert.deepEqual(achados, [], `${nome}.html deveria estar limpo`);
  }
  const { achados } = validarArquivo(join(RAIZ, 'especime/muitos-blocos.html'));
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
    assert.match(erro.stderr, /uso: aula-usp servir/);
  }
});

test('um segundo posicional sai com 2', () => {
  try {
    execFileSync('node', [CLI, 'validar', aulaTemporaria(BOA), aulaTemporaria(BOA)], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp servir/);
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

test('bin/aula-usp.mjs não importa build/servir.mjs nem build/validar.mjs no topo do módulo', () => {
  // import estático rodaria a leitura de disco desses módulos (contrato.json nos dois; linkedom
  // em build/validar.mjs) antes de qualquer try/catch do comando, transformando um arquivo do
  // sistema ou uma dependência ausente em stack trace e saída 1 em vez da saída 2 da spec 8.1 — o
  // bug que ce7a824 corrigiu para servir.mjs e esta rodada corrige para validar.mjs, a mesma
  // dependência que faltar derruba a CLI. Um teste de comportamento exigiria uma segunda cópia do
  // sistema em disco sem a dependência; este guard de código-fonte é o substituto barato e honesto.
  const fonte = readFileSync(CLI, 'utf8');
  assert.doesNotMatch(fonte, /^\s*import\b.*build\/servir\.mjs/m);
  assert.doesNotMatch(fonte, /^\s*import\b.*build\/validar\.mjs/m);
});

test('--json não trunca em 64 KiB quando a saída é lida por um cano', async () => {
  // process.exit() descarta escrita pendente em stdout; num cano, isso corta o JSON no meio.
  // Um teste pequeno passaria com o bug presente — por isso a aula tem que gerar achados de
  // sobra, e a checagem é por conteúdo (JSON.parse + contagem), não por tamanho aproximado.
  const pasta = aulaTemporaria(aulaGrande(180));
  const { achados: esperados } = validarArquivo(pasta);
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
test('atributo com grafia diferente do autor (Class) valida exatamente como a mesma aula em minúsculas', () => {
  const original = readFileSync(join(RAIZ, 'especime/index.html'), 'utf8');
  assert.match(original, /<div class="colunas" data-grade="8-4">/);
  const comClasseMaiuscula = original.replace('<div class="colunas" data-grade="8-4">', '<div Class="colunas" data-grade="8-4">');
  assert.notEqual(comClasseMaiuscula, original);
  const { achados: esperados } = validarArquivo(join(RAIZ, 'especime/index.html'));
  assert.deepEqual(esperados, []); // a base da comparação: o espécime original já é limpo
  const { achados } = validarArquivo(aulaTemporaria(comClasseMaiuscula));
  assert.deepEqual(achados, esperados);
});

test('<svg VIEWBOX> continua funcionando, e a grafia final é viewBox, a do contrato', () => {
  const original = readFileSync(join(RAIZ, 'especime/index.html'), 'utf8');
  assert.match(original, /viewBox="0 0 1152 360"/);
  const comViewboxMaiusculo = original.replace('viewBox="0 0 1152 360"', 'VIEWBOX="0 0 1152 360"');
  assert.notEqual(comViewboxMaiusculo, original);
  const pasta = aulaTemporaria(comViewboxMaiusculo);
  const { achados } = validarArquivo(pasta);
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
