// `aula-usp slide <pasta> <id|n> [--substituir <arquivo>] [--dividir] [--forcar]` (spec 2026-09-28,
// 5.1; plano do corrigir, D2 e D3). Imprime o fonte de um slide byte a byte, ou troca exatamente
// aquela `section` e nada mais.
//
// Toda substituição aceita é conferida contra a conta feita AQUI, com o localizador sobre o texto de
// antes — `antes.slice(0, inicio) + novo + antes.slice(fim)` —, e a aula resultante tem de validar
// sem erro: uma troca que mexesse um byte fora do intervalo, ou que deixasse a aula inválida, cai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localizarSecoes } from '../../build/secoes.mjs';
import { validarArquivo } from '../../build/validar.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');

function copiaDoModelo() {
  const pasta = join(mkdtempSync(join(tmpdir(), 'aula-usp-slide-')), 'aula');
  cpSync(join(RAIZ, 'modelos/aula'), pasta, { recursive: true, filter: (caminho) => !caminho.endsWith('/dist') });
  return pasta;
}

function rodar(...argumentos) {
  const { status, stdout, stderr } = spawnSync('node', [CLI, ...argumentos], { encoding: 'utf8' });
  return { status, stdout, stderr };
}

function arquivoDeSubstituicao(pasta, conteudo) {
  const caminho = join(pasta, '..', `novo-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(caminho, conteudo);
  return caminho;
}

const lerIndex = (pasta) => readFileSync(join(pasta, 'index.html'), 'utf8');

// Uma section de conteúdo válida, com o id pedido.
const conteudo = (id, titulo = 'A ideia nova;<br><span class="sinal">dita no título.</span>') => `<section data-layout="conteudo" id="${id}">
  <h2>${titulo}</h2>
  <p class="lide">Uma frase que entrega a ideia.</p>
  <p>O corpo desenvolve a ideia em uma frase.</p>
  <aside class="notas">Nota.</aside>
</section>`;

// Sem Chrome, `validarArquivo` pula a composição (spec 8.1) e o teste continua valendo para os outros
// grupos e para a fatia de bytes, que é o que ele prova. O pulo não fica mudo: vira diagnóstico,
// com a frase que build/validar.mjs escreve.
async function assertValidaSemErro(t, pasta) {
  const { erros, achados, avisoDeComposicao } = await validarArquivo(pasta);
  assert.equal(erros, 0, achados.filter((a) => a.severidade === 'erro').map((a) => `${a.regra}: ${a.mensagem}`).join(' / '));
  if (avisoDeComposicao) t.diagnostic(`sem Chrome: a validação desta troca pulou a composição — ${avisoDeComposicao}`);
}

test('imprime a fatia exata do fonte por id, sem acrescentar nada, e sai com 0', () => {
  const pasta = copiaDoModelo();
  const texto = lerIndex(pasta);
  const secoes = localizarSecoes(texto);
  const k = secoes.findIndex((s) => s.id === 'uma-ideia');
  const { status, stdout } = rodar('slide', pasta, 'uma-ideia');
  assert.equal(status, 0);
  assert.equal(stdout, texto.slice(secoes[k].inicio, secoes[k].fim));
});

test('imprime por posição, de 1 a N, e aceita o caminho do index.html', () => {
  const pasta = copiaDoModelo();
  const texto = lerIndex(pasta);
  const secoes = localizarSecoes(texto);
  assert.equal(rodar('slide', pasta, '1').stdout, texto.slice(secoes[0].inicio, secoes[0].fim));
  const ultimo = rodar('slide', join(pasta, 'index.html'), String(secoes.length));
  assert.equal(ultimo.status, 0);
  assert.equal(ultimo.stdout, texto.slice(secoes.at(-1).inicio, secoes.at(-1).fim));
});

test('alvo inexistente sai com 1 e mensagem de uma linha', () => {
  const pasta = copiaDoModelo();
  for (const alvo of ['nao-existe', '0', '99']) {
    const { status, stderr, stdout } = rodar('slide', pasta, alvo);
    assert.equal(status, 1, alvo);
    assert.equal(stdout, '');
    assert.equal(stderr.trim().split('\n').length, 1, stderr);
    assert.match(stderr, /não há slide/);
  }
});

test('substituir mantendo o id troca só o intervalo, e a aula valida sem erro', async (t) => {
  const pasta = copiaDoModelo();
  const antes = lerIndex(pasta);
  const secoes = localizarSecoes(antes);
  const k = secoes.findIndex((s) => s.id === 'uma-ideia');
  const novo = conteudo('uma-ideia');
  // Espaço em volta da section no arquivo é aceito, e não entra na aula.
  const arquivo = arquivoDeSubstituicao(pasta, `\n\n${novo}\n`);
  const { status, stdout } = rodar('slide', pasta, 'uma-ideia', '--substituir', arquivo);
  assert.equal(status, 0);
  assert.equal(stdout.trim(), `slide ${k + 1} #uma-ideia substituído`);
  assert.equal(lerIndex(pasta), antes.slice(0, secoes[k].inicio) + novo + antes.slice(secoes[k].fim));
  // Nenhum temporário da escrita atômica fica para trás.
  assert.deepEqual(readdirSync(pasta).filter((nome) => nome !== 'index.html' && !nome.startsWith('img')), []);
  await assertValidaSemErro(t, pasta);
});

test('substituir por posição um slide sem id, com uma section sem id', async (t) => {
  const pasta = copiaDoModelo();
  const antes = lerIndex(pasta);
  const secoes = localizarSecoes(antes);
  const novo = '<section data-layout="capa">\n  <h1>Outro título<br><span class="sinal">outro subtítulo</span></h1>\n</section>';
  const { status, stdout } = rodar('slide', pasta, '1', '--substituir', arquivoDeSubstituicao(pasta, novo));
  assert.equal(status, 0);
  assert.equal(stdout.trim(), 'slide 1 substituído');
  assert.equal(lerIndex(pasta), antes.slice(0, secoes[0].inicio) + novo + antes.slice(secoes[0].fim));
  await assertValidaSemErro(t, pasta);
});

test('id trocado é recusado com 1, sem tocar no arquivo; com --forcar é aceito', async (t) => {
  const pasta = copiaDoModelo();
  const antes = lerIndex(pasta);
  const secoes = localizarSecoes(antes);
  const k = secoes.findIndex((s) => s.id === 'uma-ideia');
  const novo = conteudo('ideia-renomeada');
  const arquivo = arquivoDeSubstituicao(pasta, novo);
  const recusa = rodar('slide', pasta, 'uma-ideia', '--substituir', arquivo);
  assert.equal(recusa.status, 1);
  assert.equal(recusa.stderr.trim().split('\n').length, 1, recusa.stderr);
  assert.match(recusa.stderr, /--forcar/);
  assert.equal(lerIndex(pasta), antes);

  const aceito = rodar('slide', pasta, 'uma-ideia', '--substituir', arquivo, '--forcar');
  assert.equal(aceito.status, 0, aceito.stderr);
  assert.equal(lerIndex(pasta), antes.slice(0, secoes[k].inicio) + novo + antes.slice(secoes[k].fim));
  await assertValidaSemErro(t, pasta);
});

test('--forcar não aceita um id que já é de outro slide', () => {
  const pasta = copiaDoModelo();
  const antes = lerIndex(pasta);
  const { status } = rodar('slide', pasta, 'uma-ideia', '--substituir', arquivoDeSubstituicao(pasta, conteudo('duas-colunas')), '--forcar');
  assert.equal(status, 1);
  assert.equal(lerIndex(pasta), antes);
});

test('--dividir com id novo põe as duas sections no lugar de uma, e a aula valida sem erro', async (t) => {
  const pasta = copiaDoModelo();
  const antes = lerIndex(pasta);
  const secoes = localizarSecoes(antes);
  const k = secoes.findIndex((s) => s.id === 'uma-ideia');
  const novo = `${conteudo('uma-ideia')}\n\n${conteudo('segunda-metade', 'A outra metade;<br><span class="sinal">num slide só dela.</span>')}`;
  const { status, stdout } = rodar('slide', pasta, 'uma-ideia', '--substituir', arquivoDeSubstituicao(pasta, `${novo}\n`), '--dividir');
  assert.equal(status, 0);
  assert.match(stdout, new RegExp(`slide ${k + 1} #uma-ideia substituído`));
  assert.match(stdout, new RegExp(`slide ${k + 2} #segunda-metade`));
  const depois = lerIndex(pasta);
  assert.equal(depois, antes.slice(0, secoes[k].inicio) + novo + antes.slice(secoes[k].fim));
  assert.equal(localizarSecoes(depois).length, secoes.length + 1);
  await assertValidaSemErro(t, pasta);
});

test('--dividir recusa a segunda section com id repetido, ou sem id', () => {
  const pasta = copiaDoModelo();
  const antes = lerIndex(pasta);
  for (const segunda of [conteudo('duas-colunas'), conteudo('uma-ideia'), conteudo('x').replace(' id="x"', '')]) {
    const arquivo = arquivoDeSubstituicao(pasta, `${conteudo('uma-ideia')}\n${segunda}`);
    const { status, stderr } = rodar('slide', pasta, 'uma-ideia', '--substituir', arquivo, '--dividir');
    assert.equal(status, 1, segunda);
    assert.equal(stderr.trim().split('\n').length, 1, stderr);
  }
  assert.equal(lerIndex(pasta), antes);
});

test('arquivo com zero, duas (sem --dividir) ou três sections, ou com texto fora delas, é recusado com 1', () => {
  const pasta = copiaDoModelo();
  const antes = lerIndex(pasta);
  const casos = [
    ['zero', '<p>nada</p>', []],
    ['duas', `${conteudo('uma-ideia')}\n${conteudo('outra')}`, []],
    ['três', `${conteudo('uma-ideia')}\n${conteudo('outra')}\n${conteudo('mais')}`, []],
    ['três com --dividir', `${conteudo('uma-ideia')}\n${conteudo('outra')}\n${conteudo('mais')}`, ['--dividir']],
    ['uma com --dividir', conteudo('uma-ideia'), ['--dividir']],
    ['texto fora', `<p>solto</p>\n${conteudo('uma-ideia')}`, []],
    ['aninhada', '<section id="uma-ideia"><section id="b"></section></section>', []],
  ];
  for (const [nome, texto, extras] of casos) {
    const { status, stderr } = rodar('slide', pasta, 'uma-ideia', '--substituir', arquivoDeSubstituicao(pasta, texto), ...extras);
    assert.equal(status, 1, `${nome}: ${stderr}`);
    assert.equal(stderr.trim().split('\n').length, 1, `${nome}: ${stderr}`);
  }
  assert.equal(lerIndex(pasta), antes);
});

test('erros de uso saem com 2: falta de argumento, --dividir ou --forcar sem --substituir, flag de outro comando', () => {
  const pasta = copiaDoModelo();
  assert.equal(rodar('slide').status, 2);
  assert.equal(rodar('slide', pasta).status, 2);
  assert.equal(rodar('slide', pasta, '1', 'sobrando').status, 2);
  assert.equal(rodar('slide', pasta, '1', '--substituir').status, 2);
  assert.equal(rodar('slide', pasta, '1', '--dividir').status, 2);
  assert.equal(rodar('slide', pasta, '1', '--forcar').status, 2);
  assert.equal(rodar('slide', pasta, '1', '--json').status, 2);
  assert.equal(rodar('slide', pasta, '1', '--minutos', '3').status, 2);
});

test('as flags de slide em outro comando saem com 2', () => {
  const pasta = copiaDoModelo();
  const arquivo = arquivoDeSubstituicao(pasta, conteudo('uma-ideia'));
  assert.equal(rodar('validar', pasta, '--substituir', arquivo).status, 2);
  assert.equal(rodar('validar', pasta, '--forcar').status, 2);
  assert.equal(rodar('build', pasta, '--dividir').status, 2);
  assert.equal(rodar('avaliar', pasta, '--substituir', arquivo).status, 2);
  assert.equal(rodar('novo', join(pasta, '..', 'outra'), '--unidade', 'ime', '--forcar').status, 2);
});
