// `aula-usp pacotes` pela LINHA DE COMANDO — o sexto comando da spec 8.1, e o único que não tinha
// uma única guarda de CLI (I3 da revisão final do 6c). Os outros cinco têm; `novo` ganhou onze.
//
// O que a spec 8.1 promete deste comando, e o que aqui é medido: ele **não recebe alvo** (como
// `dist`), sai com **2** quando recebe um e com **1** quando o conteúdo viola um limite da spec 11.1,
// nomeando a violação. As conferências em si são de tests/unit/pacotes.test.mjs, sobre o disco; o que
// este arquivo mede é o CONTRATO DE SAÍDA do programa.
//
// As três guardas de conteúdo rodam sobre uma CÓPIA do repositório, e não sobre ele: `gerarPacotes`
// sempre grava (a razão está escrita nela), então medir a saída 1 na árvore de verdade significaria
// sujá-la para depois limpar — e uma limpeza que falhe deixa o repositório com uma violação dentro.
// A cópia custa ~0,4 s e não tem esse risco. `node_modules` entra por symlink: build/guia.mjs importa
// build/validar.mjs, que importa linkedom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arquivosComTag } from '../../build/pacotes.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const CLI = join(RAIZ, 'bin/aula-usp.mjs');

// `pacotes/` fica de fora porque `montarPacotes` o apaga antes de gravar; `tests/`, `docs/` e
// `.superpowers/` porque nada do comando os lê, e são a maior parte do peso.
const FORA = new Set(['node_modules', '.git', 'docs', 'tests', 'pacotes', '.superpowers']);

function copiaDoSistema() {
  const destino = join(mkdtempSync(join(tmpdir(), 'aula-usp-pacotes-')), 'sistema');
  cpSync(RAIZ, destino, { recursive: true, filter: (caminho) => !FORA.has(caminho.slice(RAIZ.length + 1)) });
  symlinkSync(join(RAIZ, 'node_modules'), join(destino, 'node_modules'));
  return destino;
}

// Devolve sempre — status, stdout e stderr —, porque metade destas guardas é sobre o que o programa
// IMPRIME quando sai com 1, e execFileSync joga isso dentro de um erro.
function pacotes(raiz, ...argumentos) {
  try {
    return { status: 0, saida: execFileSync('node', [join(raiz, 'bin/aula-usp.mjs'), 'pacotes', ...argumentos], { encoding: 'utf8' }), stderr: '' };
  } catch (erro) {
    return { status: erro.status, saida: erro.stdout ?? '', stderr: erro.stderr ?? '' };
  }
}

function trocarNoArquivo(caminho, antes, depois) {
  const texto = readFileSync(caminho, 'utf8');
  assert.ok(texto.includes(antes), `${caminho} não traz o trecho que a mutação desta guarda precisa trocar`);
  writeFileSync(caminho, texto.replace(antes, depois));
}

// ---------------------------------------------------------------------------------------------
// 1. Não recebe alvo (spec 8.1), como `dist`.

// Roda na árvore de verdade de propósito: a recusa acontece na PRIMEIRA linha do comando, antes de
// qualquer escrita, e é isso que a segunda metade da guarda mede — se um dia ela passar para depois
// de `gerarPacotes`, o mtime de um arquivo de pacote muda e esta guarda cai.
test('`pacotes` não recebe argumento: alvo ou flag de outro comando saem com 2 e imprimem o uso', () => {
  const testemunha = join(RAIZ, 'pacotes/skill/aula-usp/SKILL.md');
  const antes = statSync(testemunha).mtimeMs;
  for (const argumento of ['alvo-extra', '--json', '--sem-pdf', '--porta']) {
    const { status, stderr } = pacotes(RAIZ, argumento);
    assert.equal(status, 2, `aula-usp pacotes ${argumento} saiu com ${status}`);
    assert.match(stderr, /uso: aula-usp novo/, `aula-usp pacotes ${argumento} não imprimiu o uso`);
  }
  assert.equal(statSync(testemunha).mtimeMs, antes, 'a recusa escreveu em pacotes/ antes de recusar');
});

// ---------------------------------------------------------------------------------------------
// 2. O caminho feliz, e o número que o resumo diz.

// Numa árvore em dia — o caso normal, porque o comando é idempotente — NENHUMA tag muda. Dizer "8
// tags do runtime fixadas" ali é o comando afirmar um trabalho que não fez (M6 da revisão final): o
// que ele contava era o que `reescreverTags` VISITOU. A guarda mede a distinção nos dois sentidos,
// que é a única forma de ela não passar por acaso.
test('numa árvore em dia sai com 0 e diz que nada mudou; com uma tag fora de dia, conta só ela', () => {
  const conferidas = arquivosComTag(new URL(`file://${RAIZ}/`)).length;
  assert.ok(conferidas > 0, 'nenhum arquivo com tag do runtime — o resto desta guarda não mede nada');

  const emDia = copiaDoSistema();
  const primeira = pacotes(emDia);
  assert.equal(primeira.status, 0, `saiu com ${primeira.status}: ${primeira.stderr}`);
  assert.equal(primeira.stderr, '', primeira.stderr);
  assert.equal(
    primeira.saida.split('\n')[0],
    `nenhuma tag do runtime mudou — as ${conferidas} conferidas já estavam fixadas`,
    'o resumo de uma árvore em dia afirma ter fixado tag que já estava fixada',
  );

  // E o outro sentido: uma tag devolvida ao caminho relativo é a única que muda.
  const foraDeDia = copiaDoSistema();
  const deck = join(foraDeDia, 'especime/codigo.html');
  trocarNoArquivo(deck, /<script src="https:\/\/cdn[^>]*>\s*<\/script>/.exec(readFileSync(deck, 'utf8'))[0], '<script src="../dist/aula-usp.js"></script>');
  const segunda = pacotes(foraDeDia);
  assert.equal(segunda.status, 0, `saiu com ${segunda.status}: ${segunda.stderr}`);
  assert.equal(segunda.saida.split('\n')[0], `1 tag do runtime fixada (de ${conferidas} conferidas)`);
  assert.match(readFileSync(deck, 'utf8'), /cdn\.jsdelivr\.net/, 'o comando contou a tag e não a reescreveu');
});

// ---------------------------------------------------------------------------------------------
// 3. Violação de limite: saída 1, e a violação nomeada.

// Spec 8.1: 1 é "com erros"; 2 é "não deu para rodar". Aqui o ambiente rodou e os arquivos estão no
// disco — o conserto é editar `guia/` e rodar de novo, não instalar nada. A mensagem tem de trazer o
// arquivo, o tamanho medido e o teto, porque é ela que diz quanto cortar.
test('teto do instrucoes.txt estourado: sai com 1 e nomeia o arquivo, o tamanho e o teto', () => {
  const raiz = copiaDoSistema();
  const fonte = join(raiz, 'guia/pacotes/gpt-instrucoes.md');
  writeFileSync(fonte, `${readFileSync(fonte, 'utf8')}\n${'x'.repeat(3200)}\n`);
  const { status, stderr } = pacotes(raiz);
  assert.equal(status, 1, `saiu com ${status} em vez de 1: ${stderr}`);
  assert.match(stderr, /pacotes\/gpt\/gpt-personalizado\/instrucoes\.txt: \d+ caracteres, acima do teto de 8000/);
  // E o arquivo foi escrito assim mesmo: a saída 1 é sobre o conteúdo, não sobre ter abortado.
  assert.ok(statSync(join(raiz, 'pacotes/gpt/gpt-personalizado/instrucoes.txt')).size > 8000);
});

// A conferência de tags varre o que vai nos PACOTES e o que o comando acabou de REESCREVER (N1 da
// revisão final). A diferença só aparece num arquivo que é fonte e não viaja em pacote nenhum, e o
// espécime é exatamente isso: sem as fontes na conferência, uma segunda tag relativa num deck dele
// passa batido — medido, o comando saía com 0.
//
// Uma segunda tag não é caso inventado: `reescreverTags` troca a PRIMEIRA ocorrência (o TAG de
// build/pacotes.mjs não é global), de propósito, porque uma aula tem exatamente uma.
test('tag de runtime que a reescrita não alcançou numa fonte: sai com 1 e nomeia o arquivo', () => {
  const raiz = copiaDoSistema();
  const deck = join(raiz, 'especime/index.html');
  trocarNoArquivo(deck, '</head>', '<script src="../dist/aula-usp.js"></script>\n</head>');
  const { status, stderr } = pacotes(raiz);
  assert.equal(status, 1, `saiu com ${status} em vez de 1: ${stderr}`);
  assert.match(stderr, /especime\/index\.html: tag de runtime que não é a fixada/);
});
