// A guarda do SEXTO artefato gerado-e-versionado (AGENTS.md, tabela de gerados) e as três
// conferências que a spec 11.1 nomeia para os pacotes.
//
// LEIA O PARÁGRAFO DE AGENTS.md antes de acrescentar coisa aqui. A primeira guarda deste arquivo é
// da forma "regerar e comparar", e uma guarda dessa forma prova que o ARQUIVO está em dia com o
// GERADOR — e nada sobre o gerador. Piore o gerador, rode `aula-usp pacotes`, e as duas voltam a
// bater, com a mensagem mandando commitar a regressão. Medido no 6b, no gerador do guia. O que
// fecha a janela são as guardas de PROPRIEDADE que vêm depois dela, e são justamente as três que a
// spec 11.1 nomeia: o teto do instrucoes.txt, o bloco essencial igual nos quatro pacotes, e versão
// e integrity das tags iguais ao package.json e ao manifesto.
//
// As três leem o que está EM DISCO e comparam com a fonte que manda — a spec, `guia/`, o
// `package.json`, o `dist/manifesto.json` —, nunca com o que o gerador achou que ia escrever.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { FONTES_DE_PACOTE, regrasEssenciais } from '../../build/guia.mjs';
import { PASTAS_COM_TAG, arquivosDoGuia, montarPacotes } from '../../build/pacotes.mjs';

const RAIZ = new URL('../../', import.meta.url);

// Os quatro diretórios da tabela da spec 10.2.
const PACOTES = [
  'pacotes/claude/projeto',
  'pacotes/gpt/gpt-personalizado',
  'pacotes/repositorio-de-disciplina',
  'pacotes/skill/aula-usp',
];

// Toda tag de runtime de um texto, com o `src` e o resto dos atributos separados. Lida aqui, e não
// importada de build/pacotes.mjs, de propósito: uma guarda que pergunta ao gerador como ele
// reconhece a tag não tem como discordar dele.
const TAG = /<script\b[^>]*\bsrc="([^"]*\/aula-usp\.js)"([^>]*)>/g;

function texto(caminho) {
  return readFileSync(new URL(caminho, RAIZ), 'utf8');
}

// `.DS_Store` é ruído do macOS e está no .gitignore; qualquer outro arquivo em pacotes/ que o
// gerador não tenha escrito é exatamente o que a comparação de conjunto existe para pegar.
function arquivosDe(pasta) {
  const saida = [];
  const visitar = (relativo) => {
    for (const nome of readdirSync(new URL(relativo, RAIZ)).sort()) {
      if (nome === '.DS_Store') continue;
      const caminho = `${relativo}${nome}`;
      if (statSync(new URL(caminho, RAIZ)).isDirectory()) visitar(`${caminho}/`);
      else saida.push(caminho);
    }
  };
  visitar(`${pasta}/`);
  return saida;
}

// ---------------------------------------------------------------------------------------------
// 1. Regerar e comparar — e só isso.

test('os pacotes em disco são o que `aula-usp pacotes` monta hoje', () => {
  const { arquivos } = montarPacotes({ raiz: RAIZ });
  assert.ok(arquivos.size > 0, 'a montagem não devolveu arquivo nenhum');
  for (const [caminho, conteudo] of arquivos) {
    assert.equal(
      texto(caminho),
      conteudo,
      `${caminho} está desatualizado — rode \`aula-usp pacotes\` e commite o resultado`,
    );
  }
  // O conjunto, e não só o conteúdo: um arquivo que DEIXASSE de ser gerado continuaria em disco, e
  // o laço acima nunca o visitaria. `montarPacotes` apaga pacotes/ antes de gravar justamente para
  // que essa diferença apareça aqui, e não na mão de quem instala o pacote.
  assert.deepEqual(
    arquivosDe('pacotes'),
    [...arquivos.keys()].sort(),
    'pacotes/ tem arquivo que o gerador não escreve, ou falta um que ele escreve — rode `aula-usp pacotes`',
  );
});

// ---------------------------------------------------------------------------------------------
// 2. Spec 11.1, primeira: "instrucoes.txt do GPT com até 8.000 caracteres".

// O número é da SPEC (10.2: "`instrucoes.txt` com até 8.000 caracteres"; 11.1 repete), não do
// contrato, e está escrito aqui em vez de importado de FONTES_DE_PACOTE de propósito: FONTES_DE_PACOTE
// é onde o GERADOR guarda o teto, e uma guarda que lê o teto do gerador aprova um gerador com o teto
// afrouxado — é a mesma janela do "regerar e comparar", pelo lado da constante.
const TETO_INSTRUCOES_GPT = 8000;
const INSTRUCOES_GPT = 'pacotes/gpt/gpt-personalizado/instrucoes.txt';

test('o instrucoes.txt do GPT cabe nos 8.000 caracteres da spec, e o gerador cobra esse mesmo teto', () => {
  const medido = texto(INSTRUCOES_GPT).length;
  // Sem isto, um arquivo vazio — ou que o gerador deixou de escrever — passaria com folga máxima.
  assert.ok(medido > 0, `${INSTRUCOES_GPT} está vazio`);
  assert.ok(
    medido <= TETO_INSTRUCOES_GPT,
    `${INSTRUCOES_GPT} tem ${medido} caracteres, e a spec 10.2 dá ${TETO_INSTRUCOES_GPT} `
      + '— corte texto em guia/pacotes/gpt-instrucoes.md',
  );
  const declarado = Object.values(FONTES_DE_PACOTE).find(({ destino }) => destino === INSTRUCOES_GPT);
  assert.equal(
    declarado?.teto,
    TETO_INSTRUCOES_GPT,
    `o teto declarado em FONTES_DE_PACOTE para ${INSTRUCOES_GPT} divergiu dos ${TETO_INSTRUCOES_GPT} `
      + 'da spec 10.2 — é por ele que `aula-usp pacotes` decide o código de saída',
  );
});

// ---------------------------------------------------------------------------------------------
// 3. Spec 11.1, segunda: "bloco de regras essenciais idêntico em todos os pacotes".

// A busca é no ARQUIVO DE INSTRUÇÃO de cada pacote — o destino declarado com `essenciais: true` —,
// nunca "algum arquivo do pacote". A diferença é a armadilha deste projeto, e aqui ela é literal:
// dois dos quatro pacotes levam `conhecimento/guia-do-autor.md`, que é o guia inteiro concatenado e
// portanto contém `00-principios.md`, que contém o bloco (medido: os 1.667 caracteres do bloco estão
// lá, literalmente). Uma guarda que procurasse o bloco no pacote inteiro passaria por esse arquivo
// mesmo com o instrucoes.md e o instrucoes.txt esvaziados — a fonte da busca trazendo o próprio
// gabarito, que foi como três guardas deste repositório nasceram vazias.
test('o bloco de regras essenciais está, byte a byte, no arquivo de instrução dos quatro pacotes', () => {
  const bloco = regrasEssenciais({ raiz: RAIZ });
  // `''.includes('')` é verdade sempre: sem esta linha, um bloco vazio aprovaria os quatro pacotes.
  assert.notEqual(bloco.trim(), '', 'o bloco de regras essenciais está vazio');

  const comRegras = Object.values(FONTES_DE_PACOTE).filter(({ essenciais }) => essenciais);
  // A cobertura dos quatro é conferida, não suposta: um pacote sem destino de instrução sairia sem
  // as regras, e o laço abaixo não teria o que iterar para acusá-lo.
  assert.deepEqual(
    comRegras.map(({ destino }) => PACOTES.find((pacote) => destino.startsWith(`${pacote}/`))).sort(),
    [...PACOTES].sort(),
    'algum dos quatro pacotes da spec 10.2 não tem arquivo que leve as regras essenciais',
  );

  for (const { destino } of comRegras) {
    // normalize: o bloco tem acento, e um editor que grave em NFD faria a busca falhar por um
    // motivo que não é o que esta guarda quer medir.
    const partes = texto(destino).normalize('NFC').split(bloco);
    assert.equal(
      partes.length,
      2,
      `${destino} traz o bloco de regras essenciais ${partes.length - 1} vez(es), e devia trazer 1 `
        + '— ele é injetado no lugar de `<!-- inserir:regras-essenciais -->`, nunca copiado',
    );
  }
});

// ---------------------------------------------------------------------------------------------
// 4. Spec 11.1, terceira: "versão e `integrity` das tags iguais à versão do `package.json` e ao
// hash de `dist/aula-usp.js`".

// Onde a tag fixada tem de estar: nas duas pastas que o `aula-usp pacotes` reescreve (spec 8.1, com
// o desvio do espécime registrado em PASTAS_COM_TAG) e em tudo que os pacotes levam. Os `.md` entram
// junto porque `references/10-estrutura.md` e `conhecimento/guia-do-autor.md` mostram o modelo
// inteiro num bloco ```html: montar antes de reescrever põe a tag relativa neles, e o pacote sai
// contradizendo a si mesmo — o defeito de ordem que `gerarPacotes` existe para não cometer.
const COM_TAG_FIXADA = ['modelos', 'exemplos', 'pacotes'];

test('toda tag fixada traz a versão do package.json e o integrity de dist/aula-usp.js', () => {
  const { version } = JSON.parse(texto('package.json'));
  const manifesto = JSON.parse(texto('dist/manifesto.json'));
  const { integrity } = manifesto.arquivos['aula-usp.js'];
  // As duas fontes, conferidas antes de serem usadas como gabarito: um integrity ausente viraria
  // "undefined" dentro da tag esperada, e a comparação seguiria "funcionando".
  assert.match(version, /^\d+\.\d+\.\d+/, 'package.json não traz uma versão reconhecível');
  assert.match(integrity, /^sha384-[A-Za-z0-9+/]{64}$/, 'dist/manifesto.json não traz um integrity sha384 de aula-usp.js');
  const esperado = `https://cdn.jsdelivr.net/npm/aula-usp@${version}/dist/aula-usp.js`;

  let conferidas = 0;
  for (const pasta of COM_TAG_FIXADA) {
    for (const caminho of arquivosDe(pasta)) {
      const conteudo = texto(caminho);
      let achados = 0;
      for (const [, src, atributos] of conteudo.matchAll(TAG)) {
        // A única tag que não é a fixada: a que escreve a versão como marcador de lugar, em
        // guia/71-fluxo-chat.md, que mostra a FORMA da tag. Um hash de verdade ali envelheceria a
        // cada `aula-usp dist` sem ninguém reescrever prosa.
        if (src.includes('aula-usp@<')) continue;
        achados += 1;
        conferidas += 1;
        assert.equal(src, esperado, `${caminho}: o src da tag não é a versão de package.json`);
        assert.ok(
          atributos.includes(`integrity="${integrity}"`),
          `${caminho}: a tag não traz o integrity de aula-usp.js do dist/manifesto.json`,
        );
      }
      // Um `.html` de aula sem tag nenhuma passaria no laço acima sem uma única asserção.
      if (caminho.endsWith('.html')) {
        assert.equal(achados, 1, `${caminho}: tem ${achados} tags de runtime, e uma aula tem exatamente 1`);
      }
    }
  }
  // Se a varredura deixar de achar tag, ela vira decoração e nada acima roda. Medido hoje: 14 tags
  // nas três pastas, 3 delas o marcador `aula-usp@<versão>` de 71-fluxo-chat.md (uma em references/
  // e uma em cada guia-do-autor.md), 11 conferidas — os 2 fontes reescritos, os 6 `.html` dos
  // pacotes e os 3 blocos ```html que mostram o modelo (references/10-estrutura.md e os dois
  // guia-do-autor.md). O piso é folgado de propósito: é contra a varredura vazia, não contra o
  // pacote ganhar ou perder um arquivo.
  assert.ok(conferidas >= 8, `só ${conferidas} tags conferidas — a varredura de ${COM_TAG_FIXADA.join(', ')} virou decoração`);
});

// ---------------------------------------------------------------------------------------------
// 5. O outro lado da decisão de escopo do 6c.

// `especime/` fica FORA da reescrita, e a razão está inteira ao lado de PASTAS_COM_TAG. Esta guarda
// é o custo de errá-la, cobrado onde é barato: pôr `especime` de volta no escopo antes de a
// publicação da fase 3 fazer a URL resolver derruba 12 testes de integração, cada um depois de 30 s
// esperando uma montagem que nunca vem — e só depois de `npm test` ter passado inteiro.
test('os decks de especime/ continuam carregando o runtime local, por caminho relativo', () => {
  assert.equal(
    PASTAS_COM_TAG.includes('especime'),
    false,
    'especime/ voltou ao escopo da reescrita: enquanto o pacote não estiver publicado (fase 3), a tag '
      + 'fixada não resolve e os testes que servem o espécime sem reescrever nada não têm o que carregar',
  );
  const decks = readdirSync(new URL('especime/', RAIZ)).filter((nome) => nome.endsWith('.html')).sort();
  assert.ok(decks.length > 0, 'especime/ não tem deck nenhum');
  for (const nome of decks) {
    const achados = [...texto(`especime/${nome}`).matchAll(TAG)];
    assert.equal(achados.length, 1, `especime/${nome}: tem ${achados.length} tags de runtime, e devia ter 1`);
    assert.equal(
      achados[0][1].startsWith('http'),
      false,
      `especime/${nome} aponta para ${achados[0][1]} — o espécime carrega o runtime local, por caminho relativo`,
    );
  }
});

// ---------------------------------------------------------------------------------------------
// 6. O que `references/` promete (spec 10.2, "com o guia completo"; Fato 7 do plano).

// `guia/pacotes/` é o FONTE dos pacotes: pô-lo em references/ faria a skill carregar o próprio texto
// dela e as instruções do GPT como referência do autor. Quem o deixa de fora é o filtro por `.md` de
// `arquivosDoGuia`, sozinho — a subpasta não termina em `.md` —, e é um filtro que some sem alarde.
test('references/ traz exatamente os arquivos de guia/, e nenhum de guia/pacotes/', () => {
  const emReferences = readdirSync(new URL('pacotes/skill/aula-usp/references/', RAIZ)).sort();
  const noGuia = arquivosDoGuia(RAIZ);
  assert.ok(noGuia.length > 0, 'guia/ não tem arquivo .md nenhum');
  assert.deepEqual(emReferences, noGuia, 'references/ divergiu de guia/ — rode `aula-usp pacotes`');
  const dosPacotes = readdirSync(new URL('guia/pacotes/', RAIZ));
  assert.ok(dosPacotes.length > 0, 'guia/pacotes/ está vazio');
  for (const nome of dosPacotes) {
    assert.equal(emReferences.includes(nome), false, `references/${nome} é fonte de pacote, e não referência do autor`);
  }
  // E o conteúdo é cópia do guia, não uma segunda versão dele.
  for (const nome of emReferences) {
    assert.equal(
      texto(`pacotes/skill/aula-usp/references/${nome}`),
      texto(`guia/${nome}`),
      `references/${nome} divergiu de guia/${nome} — rode \`aula-usp pacotes\``,
    );
  }
});
