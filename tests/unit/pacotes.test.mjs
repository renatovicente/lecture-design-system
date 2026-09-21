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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { FONTES_DE_PACOTE, decksDoEspecime, regrasEssenciais } from '../../build/guia.mjs';
import { PASTAS_COM_TAG, arquivosComTag, arquivosDoGuia, montarPacotes } from '../../build/pacotes.mjs';

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

// Onde a tag fixada tem de estar: nas TRÊS pastas que o `aula-usp pacotes` reescreve (spec 8.1) e em
// tudo que os pacotes levam. Os `.md` entram junto porque `references/10-estrutura.md` e
// `conhecimento/guia-do-autor.md` mostram o modelo inteiro num bloco ```html: montar antes de
// reescrever põe a tag relativa neles, e o pacote sai contradizendo a si mesmo — o defeito de ordem
// que `gerarPacotes` existe para não cometer.
const COM_TAG_FIXADA = ['modelos', 'especime', 'exemplos', 'pacotes'];

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
  // Se a varredura deixar de achar tag, ela vira decoração e nada acima roda. Medido nesta árvore:
  // 38 tags nas quatro pastas, 3 delas o marcador `aula-usp@<versão>` de 71-fluxo-chat.md (uma em
  // references/ e uma em cada guia-do-autor.md), 35 conferidas — os 8 `.html` de fonte reescritos
  // (o modelo, o exemplo e os 6 decks do espécime), os 24 `.html` dos pacotes (esses mesmos oito em
  // cada um dos três pacotes que levam o guia, desde que o acervo passou a viajar junto) e os 3
  // blocos ```html que mostram o modelo (references/10-estrutura.md e os dois guia-do-autor.md). O
  // piso é folgado de propósito: é contra a varredura vazia, não contra o pacote ganhar ou perder
  // um arquivo.
  assert.ok(conferidas >= 8, `só ${conferidas} tags conferidas — a varredura de ${COM_TAG_FIXADA.join(', ')} virou decoração`);
});

// ---------------------------------------------------------------------------------------------
// 5. O escopo da reescrita: as três pastas da spec 8.1, e nenhuma delas vazia.

// A spec 8.1: `pacotes` "reescreve a tag do runtime (versão e `integrity`) em `modelos/`,
// `especime/` e `exemplos/`". A lista está escrita aqui, e não importada como gabarito, pela mesma
// razão do teto de 8.000: ela é da SPEC, e uma guarda que pergunta ao gerador qual é o escopo aprova
// um escopo encolhido.
//
// Encolher a lista não quebra nada de imediato — os arquivos já reescritos continuam no disco —, e é
// justamente por isso que a guarda existe: o efeito só apareceria na primeira tag nova escrita
// dentro da pasta que saiu do escopo, meses depois, num pacote entregue. A segunda metade mede que o
// escopo não é decoração: cada pasta tem de ter pelo menos um arquivo com tag hoje.
test('a reescrita cobre as três pastas da spec 8.1, e acha tag em cada uma delas', () => {
  assert.deepEqual(
    [...PASTAS_COM_TAG].sort(),
    ['especime', 'exemplos', 'modelos'],
    'PASTAS_COM_TAG divergiu das três pastas que a spec 8.1 nomeia para `aula-usp pacotes`',
  );
  const achados = arquivosComTag(RAIZ);
  for (const pasta of PASTAS_COM_TAG) {
    assert.ok(
      achados.some((caminho) => caminho.startsWith(`${pasta}/`)),
      `${pasta}/ está no escopo da reescrita e não tem um único arquivo com tag de runtime`,
    );
  }
});

// ---------------------------------------------------------------------------------------------
// 6. O que `references/` promete (spec 10.2, "com o guia completo"; Fato 7 do plano).

// `guia/pacotes/` é o FONTE dos pacotes: pô-lo em references/ faria a skill carregar o próprio texto
// dela e as instruções do GPT como referência do autor. Quem o deixa de fora é o filtro por `.md` de
// `arquivosDoGuia`, sozinho — a subpasta não termina em `.md` —, e é um filtro que some sem alarde.
// Os dois ponteiros do guia que não resolvem sozinhos dentro do pacote, e o caminho que a skill dá
// a cada um. A ordem é do mais LONGO para o mais curto: `exemplos/descida-do-gradiente/` é prefixo
// do outro, e na ordem inversa a segunda troca emendaria um `index.html` no fim do destino.
const TROCA_DA_SKILL = [
  ['modelos/aula/index.html', 'assets/modelo.html'],
  ['exemplos/descida-do-gradiente/index.html', 'assets/exemplo.html'],
  ['exemplos/descida-do-gradiente/', 'assets/exemplo.html'],
];

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
  // E o conteúdo é o guia, não uma segunda versão dele: cópia byte a byte, salvo os dois ponteiros
  // que a montagem troca pelo caminho que ESTE pacote dá ao mesmo arquivo. A troca está escrita
  // aqui, e não importada de `apontar`, pela mesma razão do teto de 8.000: uma guarda que pergunta
  // ao gerador como ele reescreve aprova qualquer reescrita que ele venha a inventar.
  let trocados = 0;
  for (const nome of emReferences) {
    let esperado = texto(`guia/${nome}`);
    for (const [de, para] of TROCA_DA_SKILL) {
      trocados += esperado.split(de).length - 1;
      esperado = esperado.split(de).join(para);
    }
    assert.equal(
      texto(`pacotes/skill/aula-usp/references/${nome}`),
      esperado,
      `references/${nome} divergiu de guia/${nome} — rode \`aula-usp pacotes\``,
    );
  }
  // Sem este piso a comparação acima segue verde com a reescrita DESLIGADA, porque aí ela compara
  // o guia com ele mesmo. Medido nesta árvore: 8 trocas nos onze arquivos.
  assert.ok(trocados > 0, 'a montagem não trocou um único ponteiro de modelo ou exemplo');
});

// E a outra metade, que não depende de como esta guarda reconhece uma citação: os caminhos do
// modelo e do exemplo NO REPOSITÓRIO não aparecem em pacote nenhum, em arquivo nenhum. Um ponteiro
// que escapasse da troca — num bloco de código, numa tabela, num arquivo novo — cairia aqui.
//
// `modelos/aula` sem o `/index.html` fica de fora de propósito: é o que `aula-usp novo` imprime na
// tela, e guia/70-fluxo-terminal.md mostra essa saída como ela é.
test('nenhum arquivo de pacote cita o modelo ou o exemplo pelo caminho do repositório', () => {
  const arquivos = PACOTES.flatMap((pacote) => arquivosDe(pacote));
  assert.ok(arquivos.length > 0, 'pacotes/ está vazio — esta guarda não mede nada');
  for (const caminho of arquivos) {
    const conteudo = texto(caminho);
    for (const [doRepositorio] of TROCA_DA_SKILL) {
      assert.equal(
        conteudo.includes(doRepositorio),
        false,
        `${caminho} cita \`${doRepositorio}\`, que é caminho do repositório do sistema e não existe no pacote`,
      );
    }
  }
});

// ---------------------------------------------------------------------------------------------
// 7. Um começo só, e ele é um comando (I2 da revisão final do 6c).

// O pacote entregue ensinava TRÊS começos diferentes para uma aula — `assets/modelo.html` no
// SKILL.md, `copie modelos/aula/index.html` em 00-principios.md e um `cp -r` em 70-fluxo-terminal.md
// —, nenhum deles `aula-usp novo`, e dois mandando o agente para caminhos do repositório do SISTEMA.
// `tests/aceite/roteiro.md` proíbe exatamente isso: "Nada mais deste repositório. … Se o agente
// puder ler o repositório, o aceite deixa de medir o pacote" — e é este pacote que o marco 7 mede.
//
// O que esta guarda NÃO é: análise semântica de prosa. Ela é um alarme sobre as formas concretas que
// estavam escritas — um `cp -r` do modelo, "copie modelos/aula/index.html", "copiando o modelo do
// Aula USP". Uma quarta forma de dizer a mesma coisa passa por ela; o que ela garante é que ESTAS
// não voltam caladas, e que os dois arquivos de instrução que pressupõem terminal continuam
// ensinando o comando que cria a aula.
//
// Os outros dois pacotes (Claude e GPT) ficam de fora da primeira metade de propósito: naqueles
// ambientes não há terminal, e mandar chamar `aula-usp novo` ali seria ensinar o impossível.
const ENSINAM_NOVO = [
  'pacotes/skill/aula-usp/SKILL.md',
  'pacotes/repositorio-de-disciplina/AGENTS.md',
];

// Instalar a CLI é outra coisa: `cd caminho/para/lecture-design-system` + `npm link` é o único jeito
// que existe hoje (publicar é da fase 3), e continua legítimo dentro dos pacotes.
const COPIA_DO_MODELO = [
  /cp\s+-r[^\n]*modelos\/aula/,
  /copi[ae][^\n]{0,60}modelos\/aula\/index\.html/i,
  /copiando o modelo do Aula USP/i,
];

test('os pacotes ensinam `aula-usp novo` como começo, e nenhum manda copiar o modelo do repositório', () => {
  for (const destino of ENSINAM_NOVO) {
    assert.match(
      texto(destino),
      /aula-usp novo/,
      `${destino} pressupõe terminal e não ensina \`aula-usp novo\` — é o comando que cria a aula`,
    );
  }
  const arquivos = PACOTES.flatMap((pacote) => arquivosDe(pacote));
  assert.ok(arquivos.length > 0, 'pacotes/ está vazio — o resto desta guarda não mede nada');
  for (const caminho of arquivos) {
    const conteudo = texto(caminho);
    for (const padrao of COPIA_DO_MODELO) {
      assert.doesNotMatch(
        conteudo,
        padrao,
        `${caminho} manda copiar o modelo por um caminho do repositório do sistema, que quem instala o pacote não tem`,
      );
    }
  }
});

// ---------------------------------------------------------------------------------------------
// 8. A tabela "Onde procurar cada coisa" cobre todo o references/ (M8 da revisão final).

// Ela cobria 9 dos 11 — faltavam justamente 72-artifact-claude.md e 73-chatgpt.md, os dois ambientes
// em que a spec 10.2 diz que a skill é usada "sem alteração". Um arquivo que está em references/ e
// não está na tabela é um arquivo que o agente não sabe que pode abrir.
test('a tabela do SKILL.md lista todos os arquivos de references/', () => {
  const naTabela = [...texto('pacotes/skill/aula-usp/SKILL.md').matchAll(/^\| `references\/([^`]+)` \|/gm)]
    .map(([, nome]) => nome).sort();
  assert.deepEqual(
    naTabela,
    arquivosDoGuia(RAIZ),
    'a tabela "Onde procurar cada coisa" divergiu de references/ — acerte guia/pacotes/skill.md',
  );
});

// ---------------------------------------------------------------------------------------------
// 9. O acervo: o que o guia manda abrir viaja com o guia.

// O achado do aceite do marco 7: um agente com só o pacote relatou que os endereços citados pelo
// guia não existiam para ele. Medidos depois, nos três pacotes que levam o guia: 33 ponteiros para
// `especime/…` e 9 citações de `contrato/contrato.json`, todos mortos. O conserto é o acervo — e
// esta guarda é sobre ele chegar inteiro e igual, não sobre o gerador ter a intenção de copiá-lo.
//
// As três raízes e as duas bases estão ESCRITAS aqui, e não importadas de PACOTES_COM_GUIA, pela
// mesma razão do teto de 8.000: uma guarda que pergunta ao gerador o que ele copia aprova um
// gerador que deixou de copiar. O que é importado é `decksDoEspecime`, porque o número de decks é
// do REPOSITÓRIO e não desta guarda: um sétimo deck tem de entrar no pacote sem ninguém tocar aqui.
const BASE_DO_ACERVO = {
  'pacotes/skill/aula-usp': '',
  'pacotes/claude/projeto': 'conhecimento/',
  'pacotes/gpt/gpt-personalizado': 'conhecimento/',
};

test('o contrato e os seis decks do espécime chegam inteiros aos três pacotes que levam o guia', () => {
  const decks = decksDoEspecime(RAIZ);
  assert.ok(decks.length > 0, 'especime/ não tem deck nenhum — o resto desta guarda não mede nada');
  const doRepositorio = ['contrato/contrato.json', ...decks.map((nome) => `especime/${nome}`)];

  for (const [pacote, base] of Object.entries(BASE_DO_ACERVO)) {
    for (const caminho of doRepositorio) {
      const noPacote = `${pacote}/${base}${caminho}`;
      assert.equal(
        existsSync(new URL(noPacote, RAIZ)),
        true,
        `${noPacote} não existe, e o guia deste pacote manda abrir \`${caminho}\``,
      );
      // Cópia, e não uma segunda versão: um contrato do pacote que divergisse do contrato do
      // repositório seria a pior forma deste conserto — o leitor obedecendo a um contrato que o
      // validador não lê.
      assert.equal(
        texto(noPacote),
        texto(caminho),
        `${noPacote} divergiu de ${caminho} — rode \`aula-usp pacotes\``,
      );
    }
  }
});
