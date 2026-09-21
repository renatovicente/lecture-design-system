// `aula-usp novo <pasta> --unidade ime` (spec 8.1): copia `modelos/aula/` "com os metadados
// preenchidos". O último dos seis comandos da spec a existir.
//
// A asserção que importa é a primeira: **o que sai de `novo` valida limpo**. É ela que pega
// qualquer preenchimento que quebre uma regra de metadado — uma data fora de AAAA-MM-DD, uma
// unidade que não está em `assets/marcas/unidades.json`, uma meta apagada pela substituição. As
// outras guardas deste arquivo dizem POR QUE ele valida limpo; esta diz que valida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarArquivo } from '../../build/validar.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'bin/aula-usp.mjs');
const MODELO = readFileSync(join(RAIZ, 'modelos/aula/index.html'), 'utf8');
const UNIDADES = JSON.parse(readFileSync(join(RAIZ, 'assets/marcas/unidades.json'), 'utf8'));

// Um caminho que ainda não existe, dentro de uma pasta temporária que existe: é o caso normal de
// quem chama o comando, e o que `novo` tem de criar sozinho.
function alvoNovo(nome = 'aula') {
  return join(mkdtempSync(join(tmpdir(), 'aula-usp-novo-')), nome);
}

function novo(pasta, ...argumentos) {
  return execFileSync('node', [CLI, 'novo', pasta, ...argumentos], { encoding: 'utf8' });
}

function metaDe(html, nome) {
  return html.match(new RegExp(`<meta name="${nome}" content="([^"]*)">`))?.[1];
}

// A data de hoje pelo relógio LOCAL, calculada aqui de novo em vez de importada da CLI: uma guarda
// que pergunta ao programa qual data ele considera de hoje não tem como discordar dele. É também o
// que faz a diferença entre local e UTC aparecer — à noite no Brasil (UTC-3), `toISOString()` já
// devolve o dia seguinte.
function hojeLocal(agora = new Date()) {
  const doisDigitos = (numero) => String(numero).padStart(2, '0');
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

// ---------------------------------------------------------------------------------------------
// 1. A asserção que importa.

test('o que sai de `novo` valida limpo, em cada unidade que o comando aceita', async () => {
  const chaves = Object.keys(UNIDADES);
  assert.ok(chaves.length > 0, 'assets/marcas/unidades.json não traz unidade nenhuma');
  for (const unidade of chaves) {
    const pasta = alvoNovo(`aula-${unidade}`);
    novo(pasta, '--unidade', unidade);
    const { achados } = await validarArquivo(pasta);
    assert.deepEqual(
      achados,
      [],
      `a aula criada com --unidade ${unidade} não está limpa: ${achados.map((a) => a.mensagem).join(' / ')}`,
    );
  }
});

// A metade que a guarda acima NÃO mede, e por isso está aqui e não dentro dela (M1 da revisão final
// do 6c): `validarArquivo` também roda o grupo de COMPOSIÇÃO, que precisa de Chrome, e conta o que
// aconteceu em `avisoDeComposicao` — null quando mediu, uma frase quando pulou. Asseverar só
// `achados` vazio passa igual numa máquina sem Chrome, medindo um grupo de regras a menos, e sem
// dizer. Aqui a degradação da spec 8.1 ("falta de Chrome não é falha") aparece como um PULO
// anunciado, que é o mesmo idioma de validar-cli.test.mjs.
test('e "limpa" inclui a composição: o grupo que precisa de Chrome rodou de verdade', async (t) => {
  const pasta = alvoNovo();
  novo(pasta, '--unidade', 'ime');
  const { avisoDeComposicao } = await validarArquivo(pasta);
  // O pulo é SÓ para a falta de Chrome, e reconhecida pela frase que build/validar.mjs escreve
  // (mesma leitura de validar-cli.test.mjs). Qualquer outro valor não-nulo cai: um grupo de
  // composição que deixasse de rodar por outra razão viraria um pulo permanente e mudo.
  if (/composição pulada, sem Chrome/.test(avisoDeComposicao ?? '')) {
    t.skip(`sem Chrome: a validação pulou a composição (spec 8.1) — ${avisoDeComposicao}`);
    return;
  }
  assert.equal(avisoDeComposicao, null, `a composição não rodou sobre a aula criada por \`novo\`: ${avisoDeComposicao}`);
});

// ---------------------------------------------------------------------------------------------
// 2. As duas metas que o comando sabe, e as três que ele deixa em paz.

test('preenche `unidade` com a opção e `data` com hoje', () => {
  const pasta = alvoNovo();
  novo(pasta, '--unidade', 'ifusp');
  const html = readFileSync(join(pasta, 'index.html'), 'utf8');
  assert.equal(metaDe(html, 'unidade'), 'ifusp');
  assert.equal(metaDe(html, 'data'), hojeLocal());
  // E a data do modelo saiu de lá: sem isto, um modelo cuja data por acaso fosse a de hoje faria a
  // asserção acima passar com a substituição quebrada.
  assert.notEqual(metaDe(MODELO, 'data'), hojeLocal(),
    'a data do modelo virou a de hoje — troque-a em modelos/aula/index.html para esta guarda voltar a medir algo');
});

// Decisão registrada no plano do 6c e no comentário de `novoComando`: das cinco metas do contrato, o
// comando preenche duas. `professor` inventado seria pior que um lugar visivelmente vazio — e é uma
// decisão que some se alguém "completar" o comando sem ler o porquê.
test('`disciplina`, `aula` e `professor` ficam com o texto de exemplo do modelo', () => {
  const pasta = alvoNovo();
  novo(pasta, '--unidade', 'ime');
  const html = readFileSync(join(pasta, 'index.html'), 'utf8');
  for (const nome of ['disciplina', 'aula', 'professor']) {
    assert.equal(metaDe(html, nome), metaDe(MODELO, nome), `a meta "${nome}" deixou de ser a do modelo`);
  }
});

// A cópia é do modelo, não uma segunda versão dele: as ÚNICAS linhas diferentes são as das duas
// metas preenchidas. Sem isto, `novo` poderia ganhar com o tempo um esqueleto próprio, e o
// repositório teria dois — o que `guia/10-estrutura.md` já evita lendo o modelo em vez de copiá-lo.
test('fora as duas metas, a aula criada é o modelo linha a linha', () => {
  const pasta = alvoNovo();
  novo(pasta, '--unidade', 'ifusp');
  const criada = readFileSync(join(pasta, 'index.html'), 'utf8').split('\n');
  const modelo = MODELO.split('\n');
  assert.equal(criada.length, modelo.length, 'a aula criada tem outro número de linhas que o modelo');
  const diferentes = modelo.map((linha, i) => [linha, criada[i]]).filter(([antes, depois]) => antes !== depois);
  assert.deepEqual(
    diferentes.map(([, depois]) => depois),
    [`<meta name="unidade" content="ifusp">`, `<meta name="data" content="${hojeLocal()}">`],
    'o que mudou do modelo para a aula criada não são exatamente as duas metas preenchidas',
  );
});

// Consequência da decisão do 6c de fixar a tag em `modelos/`: a aula recém-criada nasce com a tag da
// CDN, que só resolve na fase 3. Medido neste marco: `validar` e `build` continuam limpos nela,
// porque os dois passam pelo servidor interno, que reconhece a tag pelo `src` terminado em
// `/aula-usp.js` e a troca.
//
// O gabarito é o par `package.json` + `dist/manifesto.json`, e não o modelo (M3 da revisão final do
// 6c): comparar a aula criada com o modelo que ela acaba de copiar é estritamente mais fraco que a
// guarda de cima ("fora as duas metas, a aula criada é o modelo linha a linha"), e nenhuma mutação
// derrubava esta sem derrubar aquela junto. Contra as duas fontes, ela mede o que a de cima não vê:
// um modelo que perdeu a tag fixada — por um `aula-usp pacotes` não rodado, por uma edição à mão —
// faz toda aula nova nascer com uma tag que não é a do sistema, e a comparação com o modelo
// continuaria verde.
test('a aula criada carrega a tag fixada: a versão de package.json e o integrity do manifesto', () => {
  const pasta = alvoNovo();
  novo(pasta, '--unidade', 'ime');
  const { version } = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
  const { integrity } = JSON.parse(readFileSync(join(RAIZ, 'dist/manifesto.json'), 'utf8')).arquivos['aula-usp.js'];
  assert.match(integrity, /^sha384-/, 'dist/manifesto.json não traz o integrity de aula-usp.js');
  const tag = /<script\b[^>]*\bsrc="([^"]*\/aula-usp\.js)"([^>]*)>/;
  const daCriada = readFileSync(join(pasta, 'index.html'), 'utf8').match(tag);
  assert.ok(daCriada, 'a aula criada não traz a tag do runtime');
  assert.equal(
    daCriada[1],
    `https://cdn.jsdelivr.net/npm/aula-usp@${version}/dist/aula-usp.js`,
    'a tag da aula criada não é a fixada — rode `aula-usp pacotes` e confira modelos/aula/index.html',
  );
  assert.ok(daCriada[2].includes(`integrity="${integrity}"`), 'a tag da aula criada não traz o integrity de dist/aula-usp.js');
});

// ---------------------------------------------------------------------------------------------
// 3. As recusas, todas com código 2 (spec 8.1: "não deu para rodar") e sem escrever nada.

test('unidade fora de assets/marcas/unidades.json sai com 2 e não cria a pasta', () => {
  const pasta = alvoNovo();
  try {
    novo(pasta, '--unidade', 'poli');
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /unidade desconhecida: poli/);
    // A lista da mensagem sai do arquivo de marcas, não de uma segunda lista escrita na CLI.
    for (const chave of Object.keys(UNIDADES)) assert.match(erro.stderr, new RegExp(chave));
  }
  assert.equal(existsSync(pasta), false, 'a pasta foi criada apesar da recusa');
});

test('sem `--unidade` sai com 2 e não cria a pasta', () => {
  const pasta = alvoNovo();
  try {
    novo(pasta);
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /unidade desconhecida/);
  }
  assert.equal(existsSync(pasta), false, 'a pasta foi criada apesar da recusa');
});

test('sem pasta sai com 2 e imprime o uso', () => {
  try {
    execFileSync('node', [CLI, 'novo', '--unidade', 'ime'], { encoding: 'utf8' });
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
});

// A mesma regra dos outros cinco comandos: cada um aceita só as suas flags, e uma flag de vizinho
// sai com o uso em vez de ser ignorada em silêncio.
test('novo recusa --json (é de validar, não dele)', () => {
  const pasta = alvoNovo();
  try {
    novo(pasta, '--unidade', 'ime', '--json');
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /uso: aula-usp novo/);
  }
  assert.equal(existsSync(pasta), false, 'a pasta foi criada apesar da recusa');
});

test('pasta que já existe e não está vazia não é sobrescrita', () => {
  const pasta = alvoNovo();
  mkdirSync(pasta);
  writeFileSync(join(pasta, 'index.html'), 'a aula que já estava aqui');
  try {
    novo(pasta, '--unidade', 'ime');
    assert.fail('deveria ter saído com 2');
  } catch (erro) {
    assert.equal(erro.status, 2);
    assert.match(erro.stderr, /já existe e não está vazia/);
  }
  assert.equal(readFileSync(join(pasta, 'index.html'), 'utf8'), 'a aula que já estava aqui');
});

// O outro lado da guarda acima: uma pasta vazia criada antes da chamada é o caminho normal de quem
// prepara o diretório primeiro, e recusá-la seria recusar o certo junto com o errado.
test('pasta vazia que já existe é aceita', () => {
  const pasta = alvoNovo();
  mkdirSync(pasta);
  novo(pasta, '--unidade', 'ime');
  assert.equal(metaDe(readFileSync(join(pasta, 'index.html'), 'utf8'), 'unidade'), 'ime');
});
