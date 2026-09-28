// Fixa a tag do runtime e monta os quatro pacotes da spec 10.2. Sexto artefato gerado e versionado
// do repositório — ver a tabela em AGENTS.md. Sem entrada própria: quem roda é `aula-usp pacotes`
// (spec 8.1), como `build/bundle.mjs` é rodado por `aula-usp dist`.
//
// Nada aqui escreve texto novo. Tudo que sai nos pacotes já existe em guia/, modelos/ ou exemplos/;
// o trabalho é montar, copiar, fixar a tag e conferir os limites. As duas únicas exceções, ambas
// pedidas por escrito: o cabeçalho que diz de que arquivo veio cada trecho do guia num arquivo, e a
// linha `@AGENTS.md` do CLAUDE.md do repositório de disciplina (spec 10.2).
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { FONTES_DE_PACOTE, decksDoEspecime, montarPacote, regrasEssenciais } from './guia.mjs';

const RAIZ = new URL('../', import.meta.url);

// Spec 10.2: "`exemplo.html` é `exemplos/descida-do-gradiente/`. Na fase 2, entra também
// `exemplo-recursos.html`, de `exemplos/regressao-linear/`". O modelo é o da spec 10.3.
const MODELO = 'modelos/aula/index.html';
const EXEMPLO = 'exemplos/descida-do-gradiente/index.html';
const EXEMPLO_RECURSOS = 'exemplos/regressao-linear/index.html';

// Os TRÊS pacotes que levam o guia, e o caminho que cada um dá ao que o guia manda abrir.
//
// `base` é a pasta, dentro do pacote, a partir da qual o guia daquele pacote é lido — e por isso é
// também a raiz dos caminhos que ele cita: na skill o guia está em `references/` e o ponteiro
// resolve da raiz do pacote (base vazia, como em `assets/modelo.html`, que o SKILL.md já cita
// assim); no Projeto do Claude e no GPT o guia é um arquivo de `conhecimento/`, e o que está ao
// lado dele resolve dali.
//
// Esta tabela é a ÚNICA verdade sobre o par (arquivo, caminho no pacote): quem COPIA os bytes e
// quem REESCREVE a citação do guia (`apontar`) leem a mesma linha. Medido antes dela existir: o
// guia citava `assets/exemplo.html` e `assets/modelo.html` dentro dos pacotes do Claude e do GPT,
// que não têm `assets/` — a prosa tinha sido escrita para um pacote e viajava nos três.
export const PACOTES_COM_GUIA = {
  'pacotes/skill/aula-usp': {
    base: '', modelo: 'assets/modelo.html', exemplo: 'assets/exemplo.html', exemploRecursos: 'assets/exemplo-recursos.html',
  },
  'pacotes/claude/projeto': {
    base: 'conhecimento/', modelo: 'modelo.html', exemplo: 'exemplo.html', exemploRecursos: 'exemplo-recursos.html',
  },
  'pacotes/gpt/gpt-personalizado': {
    base: 'conhecimento/', modelo: 'modelo.html', exemplo: 'exemplo.html', exemploRecursos: 'exemplo-recursos.html',
  },
};

// O acervo que viaja junto do guia, além do modelo e do exemplo. O critério é um só e é medido, não
// opinado: **são os arquivos que o guia manda abrir**. Antes disto eram, por pacote de chat, 32
// ponteiros para `especime/…` e 8 citações de `contrato/contrato.json` (na skill, 32 e 10 — o
// `SKILL.md` cita o contrato duas vezes a mais) — todos mortos para quem instala o pacote, porque o
// guia foi escrito por quem está dentro do repositório. Os números "33 e 9" que este comentário
// trazia eram de uma contagem anterior e não se reproduziram; estes são os medidos.
//
// O caminho dentro do pacote é o MESMO do repositório, de propósito: é o que faz esses 42 ponteiros
// resolverem sem reescrita nenhuma. O modelo e o exemplo são a exceção — o pacote já os levava com
// outro nome antes deste acervo existir —, e é para eles, e só para eles, que `apontar` existe.
//
// Os decks saem de `decksDoEspecime`, nunca de uma lista escrita aqui: um sétimo deck entra no
// pacote sozinho, como já entra no guia.
export function acervo(raiz = RAIZ) {
  return ['contrato/contrato.json', ...decksDoEspecime(raiz).map((nome) => `especime/${nome}`)];
}

// Os dois ponteiros que o guia reescreve ao entrar num pacote, e os únicos.
//
// O guia é lido DENTRO do repositório também, e lá `modelos/aula/index.html` é o caminho certo:
// apagá-lo da prosa tiraria o ponteiro de quem lê `guia/`. O que resolve sem criar duas verdades é
// escrever o caminho do repositório uma vez e trocá-lo na MONTAGEM pelo caminho que aquele pacote
// dá ao mesmo arquivo. A tabela da troca é PACOTES_COM_GUIA — a mesma linha que decide onde os
// bytes são gravados —, de modo que o ponteiro não tem como divergir do arquivo.
//
// Duas cautelas, as duas pagas antes:
// - a troca é por split/join, nunca por `replace` com string de substituição: ali um `$` é padrão
//   especial, e este arquivo já pagou uma vez por isso (ver `trocar`);
// - do mais LONGO para o mais curto. `exemplos/descida-do-gradiente/` é prefixo de
//   `exemplos/descida-do-gradiente/index.html`, e na ordem inversa a segunda troca emendaria um
//   `index.html` no fim do destino.
//
// E o que ela NÃO toca, de propósito: `modelos/aula` sem o `/index.html`, que aparece uma vez em
// guia/70-fluxo-terminal.md dentro da SAÍDA que `aula-usp novo` imprime. Reescrevê-la faria o guia
// mentir sobre o que o comando escreve na tela — é um literal de outro mundo, não um ponteiro.
// A segunda aula-exemplo (fase 2d) segue a mesma regra, com o mesmo cuidado de ordem.
export function apontar(texto, { modelo, exemplo, exemploRecursos }) {
  const pasta = (caminho) => caminho.slice(0, caminho.lastIndexOf('/') + 1);
  return texto
    .split(MODELO).join(modelo)
    .split(EXEMPLO).join(exemplo)
    .split(pasta(EXEMPLO)).join(exemplo)
    .split(EXEMPLO_RECURSOS).join(exemploRecursos)
    .split(pasta(EXEMPLO_RECURSOS)).join(exemploRecursos);
}

// As TRÊS pastas que a spec 8.1 nomeia, `especime/` inclusive.
//
// O espécime esteve fora desta lista por uma rodada, e a razão era real: ele é a base dos testes de
// integração, e dois deles (tests/integracao/dist.test.mjs e visual.test.mjs) o servem por
// `servirPastaCrua`, um segundo servidor deliberadamente burro que NÃO reescreve a tag — é ele que
// prova o caminho de produção, em que a tag escrita pelo autor chega ao navegador do jeito que ele a
// escreveu. Com a tag fixada e nada respondendo pela CDN (publicar é da fase 3), o runtime nunca
// carregava e a montagem estourava: 12 testes caíam.
//
// O que desfez o impasse não foi reescrever a tag no servidor — isso apagaria a propriedade que os
// dois testes medem — e sim interceptar a rota no NAVEGADOR: `rotearCdn`
// (tests/integracao/utilitarios.mjs) fulfila `https://cdn.jsdelivr.net/npm/aula-usp@<versão>/dist/*`
// com os bytes locais de `dist/` e o CORS que `crossorigin="anonymous"` exige. O servidor continua
// burro, a tag continua sendo a que o autor escreveu, e o Chrome a pede exatamente como está.
//
// A troca não é neutra: ela GANHA duas propriedades que ninguém media enquanto a tag era relativa —
// o `integrity` conferido por um navegador de verdade (inversão medida: dois bytes a mais em
// `aula-usp.js` e o Chrome recusa o script) e a cadeia de scripts secundários resolvida pela base da
// CDN, e não pelo host de teste (9 pedidos em `codigo.html`). As duas têm asserção própria em
// dist.test.mjs.
//
// E o escopo continua sendo por pasta, nunca uma busca repo-wide: medido no repositório, 54
// arquivos rastreados carregam a tag, 33 deles são fixture de teste, e reescrevê-las quebraria a
// suíte por outro caminho.
export const PASTAS_COM_TAG = ['modelos', 'especime', 'exemplos'];

// A mesma forma que `reescreverRuntime` (build/servir.mjs) e `embutir` reconhecem: a tag é achada
// pelo `src` terminado em `/aula-usp.js` (spec 8.1). Casa a relativa de hoje e a fixada de amanhã,
// o que é o que torna a reescrita idempotente — rodar duas vezes não muda nada na segunda.
const TAG = /<script\b[^>]*\bsrc="[^"]*\/aula-usp\.js"[^>]*>\s*<\/script>/;

// Toda substituição que INJETA conteúdo neste repositório é por função, nunca por string: numa
// string de substituição `$` é padrão especial. Aqui o `integrity` é base64 (sem `$`), mas a regra
// vale para o próximo valor injetado, não só para este — foi um `$` numa string que fez o
// instrucoes.txt do marco 6b sair 2.872 caracteres maior do que é, sem erro nenhum.
function trocar(texto, padrao, novo) {
  return texto.replace(padrao, () => novo);
}

// A tag fixada sai de duas leituras, nunca de um valor digitado: a versão de package.json e o
// `integrity` de dist/manifesto.json (spec 8.1, "versão e integrity"). O manifesto grava a versão
// que tinha quando `aula-usp dist` rodou (build/bundle.mjs), então as duas divergirem quer dizer
// uma coisa só — dist/ está atrasado em relação ao package.json —, e nesse caso a tag pinaria uma
// versão cujo hash veio de outra construção. Erra alto em vez de publicar o par errado.
export function tagFixada({ raiz = RAIZ } = {}) {
  const { version } = JSON.parse(readFileSync(new URL('package.json', raiz), 'utf8'));
  const manifesto = JSON.parse(readFileSync(new URL('dist/manifesto.json', raiz), 'utf8'));
  if (manifesto.versao !== version) {
    throw new Error(`dist/manifesto.json está em ${manifesto.versao} e package.json em ${version}`
      + ' — rode `aula-usp dist` antes de fixar a tag');
  }
  const entrada = manifesto.arquivos['aula-usp.js'];
  if (!entrada?.integrity) throw new Error('dist/manifesto.json não traz integrity de aula-usp.js');
  return `<script src="https://cdn.jsdelivr.net/npm/aula-usp@${version}/dist/aula-usp.js"\n`
    + `        integrity="${entrada.integrity}" crossorigin="anonymous"></script>`;
}

// Os `.html` das três pastas que carregam a tag, em ordem determinística. `dist/` fica de fora
// porque `aula-usp build <pasta>` escreve `<pasta>/dist/` inclusive dentro de especime/ (spec 3.3,
// e é o que o .gitignore registra): ali o runtime já está embutido, e o que existe é saída, não
// fonte.
export function arquivosComTag(raiz = RAIZ) {
  const achados = [];
  const visitar = (relativo) => {
    for (const nome of readdirSync(new URL(relativo, raiz)).sort()) {
      if (nome === 'dist') continue;
      const caminho = `${relativo}${nome}`;
      if (statSync(new URL(caminho, raiz)).isDirectory()) visitar(`${caminho}/`);
      else if (nome.endsWith('.html') && TAG.test(readFileSync(new URL(caminho, raiz), 'utf8'))) {
        achados.push(caminho);
      }
    }
  };
  for (const pasta of PASTAS_COM_TAG) visitar(`${pasta}/`);
  return achados;
}

// Devolve o texto novo de cada arquivo com tag, sempre; grava só quando pedido — a mesma separação
// de gerarGuia(), e pela mesma razão: a guarda regera em memória sem sujar o disco.
//
// `mudou` sai junto, e não é detalhe de contabilidade: sem ele, quem chama só sabe quantos arquivos
// foram VISITADOS, e numa árvore já em dia — o caso normal — o comando afirmava ter fixado tags que
// já estavam fixadas. Quem sabe a diferença é esta função, que compara antes e depois; dizê-la aqui
// evita que o chamador a recalcule (e erre).
export function reescreverTags({ raiz = RAIZ, escrever = false } = {}) {
  const tag = tagFixada({ raiz });
  const saida = new Map();
  for (const caminho of arquivosComTag(raiz)) {
    const antes = readFileSync(new URL(caminho, raiz), 'utf8');
    const depois = trocar(antes, TAG, tag);
    saida.set(caminho, { texto: depois, mudou: depois !== antes });
    if (escrever && depois !== antes) writeFileSync(new URL(caminho, raiz), depois);
  }
  return saida;
}

// Os ONZE `guia/*.md`, e nenhum de `guia/pacotes/`: o filtro por `.md` deixa a subpasta de fora
// sozinho, e é preciso que deixe. `guia/pacotes/` é o FONTE dos pacotes — pô-lo em `references/`
// faria a skill carregar o próprio texto dela e as instruções do GPT como referência do autor.
// O `.sort()` é o mesmo de decksDoEspecime(): um gerado-e-versionado só compra a guarda "regerar
// não muda nada" se a ordem de leitura do diretório não entrar no resultado.
export function arquivosDoGuia(raiz = RAIZ) {
  return readdirSync(new URL('guia/', raiz)).filter((nome) => nome.endsWith('.md')).sort();
}

// O título de cada capítulo, lido do `# ` da primeira linha do próprio capítulo — nunca digitado
// aqui. É o mesmo princípio de `decksDoEspecime`: um capítulo renomeado, ou um capítulo novo, entra
// sozinho. Erra alto se um capítulo não começar por um título de primeiro nível, porque aí a
// referência cruzada reescrita mandaria procurar uma seção que o leitor não tem como achar.
export function titulosDoGuia(raiz = RAIZ) {
  const titulos = new Map();
  for (const nome of arquivosDoGuia(raiz)) {
    const [primeira] = readFileSync(new URL(`guia/${nome}`, raiz), 'utf8').split('\n');
    if (!primeira.startsWith('# ')) throw new Error(`guia/${nome} não começa com um título de primeiro nível`);
    titulos.set(nome, primeira.slice(2).trim());
  }
  return titulos;
}

// A referência cruzada de um capítulo, reescrita para o guia que virou UM arquivo.
//
// O guia se refere aos seus capítulos pelo nome do arquivo — "é o assunto de `20-layouts.md`",
// "use `60-validador.md` quando o validador falar". Em `guia/` e em `references/` isso é um
// endereço de verdade: o capítulo está ao lado de quem o cita. Num arquivo só, não é: medido nesta
// árvore, eram **86 por pacote de chat, 172 no total**, mandando o leitor abrir um arquivo que ali
// não existe — a mesma classe de defeito que o acervo fechou, pelo lado da referência interna.
//
// O que resolve sem criar duas verdades é o mesmo caminho de `apontar`: escrever o ponteiro uma vez
// na fonte e trocá-lo na MONTAGEM pelo que aquele pacote tem. Aqui o que o pacote tem é uma SEÇÃO,
// e o nome dela é o título do capítulo — que é o `# ` que o leitor vê no arquivo, e portanto a
// única coisa que ele consegue procurar.
//
// A troca é por split/join, nunca por `replace` com string de substituição, pela razão de sempre
// (ver `trocar`). E ela só pega o nome ENTRE CRASES: o cabeçalho `<!-- guia/NN-….md -->` que este
// arquivo insere é procedência, não ponteiro, e continua dizendo de onde o trecho veio.
export function citarSecoes(texto, titulos) {
  let saida = texto;
  for (const [nome, titulo] of titulos) saida = saida.split(`\`${nome}\``).join(`**${titulo}**`);
  return saida;
}

// O guia num arquivo só, que é o que `conhecimento/` recebe nos pacotes do Claude e do GPT (spec
// 10.2). A ordem é a numérica dos nomes, pelo `.sort()` acima. Cada trecho vem precedido do nome do
// arquivo de onde saiu, porque num arquivo único de 100 KB a única forma de o leitor — humano ou
// modelo — voltar à fonte é essa.
//
// A concatenação é feita antes da reescrita de propósito: o que decide se um nome de capítulo é
// ponteiro morto é a FORMA DE ENTREGA, não o capítulo em que ele aparece, e reescrever o texto
// inteiro de uma vez é a única maneira de nenhum escapar.
export function guiaNumArquivo(raiz = RAIZ) {
  const inteiro = `${arquivosDoGuia(raiz)
    .map((nome) => `<!-- guia/${nome} -->\n\n${readFileSync(new URL(`guia/${nome}`, raiz), 'utf8').trimEnd()}`)
    .join('\n\n')}\n`;
  return citarSecoes(inteiro, titulosDoGuia(raiz));
}

// Um fonte de guia/pacotes/ montado: marcador trocado pelo bloco essencial, comentários fora.
// `montarPacote` é de build/guia.mjs e NÃO é reimplementado aqui — a ordem entre as duas operações
// é silenciosa quando errada (o marcador é ele mesmo um comentário), e uma segunda implementação
// seria uma segunda chance de errá-la.
function montado(raiz, fonte, { essenciais }, bloco) {
  const texto = readFileSync(new URL(fonte, raiz), 'utf8');
  // `essenciais: false` e marcador presente seria o bloco ser apagado em silêncio, que é o mesmo
  // defeito do Fato 2 por outro caminho. Erra alto.
  if (!essenciais && /^<!-- inserir:regras-essenciais -->$/m.test(texto)) {
    throw new Error(`${fonte} traz o marcador de regras essenciais, mas está declarado sem elas`);
  }
  return `${montarPacote(texto, essenciais ? bloco : '').trimEnd()}\n`;
}

function escrever(raiz, caminho, texto) {
  const alvo = new URL(caminho, raiz);
  mkdirSync(new URL('.', alvo), { recursive: true });
  writeFileSync(alvo, texto);
}

// Os quatro pacotes da spec 10.2. Devolve o que escreveu (caminho -> texto) e o que mediu, sem
// decidir nada: quem lê os limites e escolhe o código de saída é `aula-usp pacotes`.
//
// `pacotes/` é apagado antes: sem isso, um arquivo que deixasse de ser gerado ficaria para trás e a
// guarda de regerar-e-comparar não veria — ela compara o que o gerador escreve, não o que sobrou.
export function montarPacotes({ raiz = RAIZ, escrever: gravar = false } = {}) {
  const bloco = regrasEssenciais({ raiz });
  const guia = guiaNumArquivo(raiz);
  const modelo = readFileSync(new URL(MODELO, raiz), 'utf8');
  const exemplo = readFileSync(new URL(EXEMPLO, raiz), 'utf8');
  const exemploRecursos = readFileSync(new URL(EXEMPLO_RECURSOS, raiz), 'utf8');

  const arquivos = new Map();
  for (const [fonte, opcoes] of Object.entries(FONTES_DE_PACOTE)) {
    arquivos.set(opcoes.destino, montado(raiz, fonte, opcoes, bloco));
  }
  // O guia, em cada pacote, com os dois ponteiros apontando para o caminho que AQUELE pacote tem.
  for (const nome of arquivosDoGuia(raiz)) {
    arquivos.set(
      `pacotes/skill/aula-usp/references/${nome}`,
      apontar(readFileSync(new URL(`guia/${nome}`, raiz), 'utf8'), PACOTES_COM_GUIA['pacotes/skill/aula-usp']),
    );
  }
  for (const pasta of ['pacotes/claude/projeto', 'pacotes/gpt/gpt-personalizado']) {
    arquivos.set(`${pasta}/conhecimento/guia-do-autor.md`, apontar(guia, PACOTES_COM_GUIA[pasta]));
  }
  // O modelo, o exemplo e o acervo, nos três pacotes que levam o guia, cada um no caminho que a
  // tabela lhe dá. Os bytes são os mesmos do repositório: o acervo é cópia, não uma segunda versão.
  for (const [pacote, { base, modelo: nomeModelo, exemplo: nomeExemplo, exemploRecursos: nomeRecursos }] of Object.entries(PACOTES_COM_GUIA)) {
    arquivos.set(`${pacote}/${base}${nomeModelo}`, modelo);
    arquivos.set(`${pacote}/${base}${nomeExemplo}`, exemplo);
    arquivos.set(`${pacote}/${base}${nomeRecursos}`, exemploRecursos);
    for (const caminho of acervo(raiz)) {
      arquivos.set(`${pacote}/${base}${caminho}`, readFileSync(new URL(caminho, raiz), 'utf8'));
    }
  }
  // Spec 10.2: "trecho de `AGENTS.md` e `CLAUDE.md` com `@AGENTS.md`". É a mesma linha única do
  // CLAUDE.md da raiz deste repositório, e a razão é a mesma: o Claude Code lê CLAUDE.md, o resto
  // do mundo lê AGENTS.md, e manter os dois é manter duas verdades sobre o mesmo texto.
  arquivos.set('pacotes/repositorio-de-disciplina/CLAUDE.md', '@AGENTS.md\n');

  if (gravar) {
    rmSync(new URL('pacotes/', raiz), { recursive: true, force: true });
    for (const [caminho, texto] of arquivos) escrever(raiz, caminho, texto);
  }
  return { arquivos, bloco };
}

// As três conferências que a spec 11.1 nomeia, medidas sobre o que foi montado — nunca sobre o que
// se pretendeu montar. Devolve a lista de violações; vazia quer dizer que os quatro pacotes estão
// dentro do que a spec promete.
// `fontes` são os arquivos que o comando acabou de REESCREVER (caminho -> texto), e entram só na
// terceira conferência: sem eles, `aula-usp pacotes` não conferia o que ele mesmo tinha escrito em
// `modelos/`, `especime/` e `exemplos/` — corretos por construção, mas "por construção" é
// exatamente o que uma conferência existe para não ter de supor. Opcional, porque a guarda de
// tests/unit/pacotes.test.mjs confere o disco por outro caminho e monta sem reescrever nada.
export function conferirPacotes({ arquivos, bloco, raiz = RAIZ, fontes = new Map() }) {
  const violacoes = [];

  // 1. o teto de 8.000 caracteres do instrucoes.txt (spec 10.2 e 11.1). O número é da spec, não do
  // contrato, e mora em FONTES_DE_PACOTE com a citação ao lado.
  for (const { destino, teto } of Object.values(FONTES_DE_PACOTE)) {
    if (teto === undefined) continue;
    const medido = arquivos.get(destino).length;
    if (medido > teto) violacoes.push(`${destino}: ${medido} caracteres, acima do teto de ${teto}`);
  }

  // 2. o bloco de regras essenciais idêntico em todos os pacotes (spec 11.1). Conferido por
  // presença literal do bloco no arquivo de INSTRUÇÃO de cada pacote — o destino declarado com
  // `essenciais: true` —, nunca por "algum arquivo do pacote o contém".
  //
  // A diferença não é estilo: dois dos quatro pacotes levam `conhecimento/guia-do-autor.md`, que é
  // o guia inteiro concatenado e portanto contém 00-principios.md, que contém o bloco. Uma busca
  // pelo pacote todo passa por esse arquivo mesmo que instrucoes.md e instrucoes.txt tenham perdido
  // o bloco inteiro — a fonte da busca contendo o próprio gabarito, que é a forma como três guardas
  // deste projeto nasceram vazias. Medido: com a busca larga, apagar o bloco do instrucoes.txt
  // deixava esta conferência sem violação nenhuma.
  //
  // E a cobertura dos quatro é conferida, não suposta: um pacote sem destino de instrução sairia
  // sem as regras e esta lista passaria batido, porque não haveria o que iterar.
  const pacotes = ['pacotes/skill/aula-usp', 'pacotes/claude/projeto',
    'pacotes/gpt/gpt-personalizado', 'pacotes/repositorio-de-disciplina'];
  const comRegras = Object.values(FONTES_DE_PACOTE).filter(({ essenciais }) => essenciais);
  for (const { destino } of comRegras) {
    if (!arquivos.get(destino)?.includes(bloco)) {
      violacoes.push(`${destino}: não traz o bloco de regras essenciais`);
    }
  }
  for (const pacote of pacotes) {
    if (!comRegras.some(({ destino }) => destino.startsWith(`${pacote}/`))) {
      violacoes.push(`${pacote}: nenhum arquivo dele leva as regras essenciais`);
    }
  }

  // 3. versão e integrity das tags (spec 11.1). O modelo e o exemplo chegam ao pacote por CÓPIA do
  // fonte, e o guia chega por cópia dos `guia/*.md`, um dos quais mostra o modelo inteiro num bloco
  // ```html. Conferir só os `.html` deixaria passar exatamente o defeito de ORDEM: montar antes de
  // reescrever põe a tag relativa em references/10-estrutura.md e no guia num arquivo, e o pacote
  // sai contradizendo a si mesmo. Então a conferência é sobre TODA tag de runtime que aparece em
  // qualquer arquivo dos pacotes.
  //
  // A única tag que não precisa ser a fixada é a que escreve a versão como marcador de lugar
  // (`aula-usp@<versão>`): guia/71-fluxo-chat.md mostra a FORMA da tag, e ali um hash de verdade
  // seria pior — envelheceria a cada `aula-usp dist` sem ninguém reescrever prosa.
  const tag = tagFixada({ raiz });
  const todas = new RegExp(TAG.source, 'g');
  const conferiveis = new Map([...fontes, ...arquivos]);
  for (const [caminho, texto] of conferiveis) {
    for (const achado of texto.match(todas) ?? []) {
      if (achado === tag || /aula-usp@</.test(achado)) continue;
      violacoes.push(`${caminho}: tag de runtime que não é a fixada — ${achado.split('\n')[0]}`);
    }
  }
  // E presença, não só ausência de tag errada: um modelo sem tag nenhuma passaria no laço acima.
  for (const [caminho, texto] of conferiveis) {
    if (caminho.endsWith('.html') && !texto.includes(tag)) violacoes.push(`${caminho}: não traz a tag fixada do runtime`);
  }

  return violacoes;
}

// A ordem das três etapas, que é a única coisa deste arquivo que não dá para inferir lendo as
// outras: **fixar a tag, gerar o guia, montar os pacotes**, e nessa ordem por uma dependência
// medida em cada passo.
//
// A tag vem primeiro porque `modelos/aula/index.html` é lido por build/guia.mjs para o bloco
// `gerado:modelo` de guia/10-estrutura.md. Gerar o guia antes de reescrever a tag deixaria o guia
// mostrando a tag da geração anterior — e o pacote, que leva o guia E o modelo, sairia com as duas
// formas da mesma tag, uma em references/ e outra em assets/. Nessa ordem o comando também não é
// idempotente: a segunda execução muda o guia, e a guarda de "regerar não produz diff" falha.
//
// O guia vem antes dos pacotes pela razão já registrada em AGENTS.md para `aula-usp dist` gerar a
// cobertura antes de empacotar: empacotar um guia desatualizado entrega o artefato uma geração
// atrás, e o pacote é justamente o que sai do repositório para quem não pode conferir.
//
// E o pacote recebe a tag fixada por CONSEQUÊNCIA de copiar o fonte já reescrito — não por uma
// segunda reescrita dentro do pacote, que seria uma segunda verdade sobre o mesmo valor.
//
// Esta função sempre GRAVA, e é de propósito: cada uma das três etapas lê do disco o que a anterior
// escreveu, então uma versão "em memória" dela seria uma quarta implementação da mesma ordem, sem
// ser a que roda. Quem precisa regerar sem sujar o disco — a guarda — chama `reescreverTags`,
// `gerarGuia` e `montarPacotes` com `escrever: false`, cada uma já tem esse modo.
export async function gerarPacotes({ raiz = RAIZ } = {}) {
  const tags = reescreverTags({ raiz, escrever: true });
  const { gerarGuia } = await import('./guia.mjs');
  const guia = await gerarGuia({ raiz, escrever: true });
  const { arquivos, bloco } = montarPacotes({ raiz, escrever: true });
  // As fontes reescritas entram na conferência junto com o que vai nos pacotes: o comando confere o
  // que ele mesmo escreveu, e não só o que copiou.
  const fontes = new Map([...tags].map(([caminho, { texto }]) => [caminho, texto]));
  return { tags, guia, arquivos, violacoes: conferirPacotes({ arquivos, bloco, raiz, fontes }) };
}
