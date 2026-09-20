// Gera o que o contrato e o espécime já sabem, para que o guia não repita nenhum dos dois à mão
// (spec 3.4: "nenhum texto de instrução é mantido à mão fora de guia/"). Quinto artefato gerado e
// versionado do repositório — ver a tabela em AGENTS.md.
//   node build/guia.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('../', import.meta.url);

// Que bloco gerado entra em que arquivo. A prosa em volta é escrita à mão (Tarefas 3 e 5); só o
// que está entre os marcadores é sobrescrito. As quatro tabelas são as que a spec 5.6 nomeia —
// "as tabelas de layouts, vocabulário, papéis e regras do guia são geradas dele" —, mais o
// esqueleto, que é o próprio modelo copiado.
export const BLOCOS_POR_ARQUIVO = {
  'guia/10-estrutura.md': ['modelo', 'tabela-de-vocabulario'],
  'guia/20-layouts.md': ['tabela-de-layouts', 'exemplos-por-layout'],
  'guia/30-componentes.md': ['tabela-de-papeis'],
  'guia/60-validador.md': ['tabela-de-regras'],
};

// O esqueleto que o guia mostra é este arquivo, não uma cópia dele: enquanto era cópia, nada
// impedia que os dois divergissem — e um esqueleto de uma geração atrás é a forma mais cara de
// documentação que mente, porque é dele que toda aula começa.
const MODELO = 'modelos/aula/index.html';

// A sequência de um layout tem TRÊS formas de item — {seletor}, {grupo} e {umDe:[[…],[…]]} —, mais
// min/max. Ler só `seletor` imprime "undefined" no layout `conteudo`, cujo terceiro item é um umDe
// entre div.colunas e um grupo de blocos de corpo (medido).
function quantos({ min = 1, max = 1 }) {
  if (min === 1 && max === 1) return '';
  if (min === 0 && max === 1) return ' (opcional)';
  if (min === 1 && max === null) return ' (um ou mais)';
  if (min === 0 && max === null) return ' (zero ou mais)';
  return ` (${min} a ${max ?? 'vários'})`;
}

function itemDaSequencia(entrada) {
  if (entrada.umDe) {
    return entrada.umDe.map((alternativa) => alternativa.map(itemDaSequencia).join(' + ')).join(' **ou** ');
  }
  if (entrada.grupo) return `um bloco de corpo${quantos(entrada)}`;
  return `\`${entrada.seletor}\`${quantos(entrada)}`;
}

export function tabelaDeLayouts(contrato) {
  const linhas = Object.entries(contrato.layouts).map(([nome, layout]) =>
    `| \`${nome}\` | ${(layout.sequencia ?? []).map(itemDaSequencia).join(', ') || '—'} `
    + `| ${(layout.cromo ?? []).join(', ') || '—'} |`);
  return ['| layout | conteúdo, na ordem | cromo automático |', '|---|---|---|', ...linhas].join('\n');
}

export function tabelaDeRegras(contrato, { fase = 1 } = {}) {
  const linhas = Object.entries(contrato.regras)
    .filter(([, regra]) => regra.fase === fase)
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([nome, regra]) => `| \`${nome}\` | ${regra.severidade} | ${regra.acao} |`);
  return ['| regra | severidade | como corrigir |', '|---|---|---|', ...linhas].join('\n');
}

// Uma célula de tabela markdown não pode ter "|" cru. O padrão de `img src` tem (é uma alternância),
// e o dia em que outro valor do contrato tiver, a tabela sairia torta sem ninguém ver.
function celula(texto) {
  return texto.replaceAll('|', '\\|');
}

function emCodigo(valores) {
  return valores.map((valor) => `\`${valor}\``).join(', ');
}

// O contrato usa "*" como seletor de atributo para dizer "vale em qualquer elemento"; os demais são
// seletores CSS de verdade, que o validador passa a elemento.matches() (vocabulario.js).
function ondeVale(seletor) {
  return seletor === '*' ? 'qualquer elemento' : `\`${seletor}\``;
}

// Um item do contrato com `fase: 2` não vale na fase 1 — é o mesmo teste que vocabulario.classe e
// vocabulario.atributo fazem (`regra.fase > fase`). Sem ele o guia da fase 1 documentaria classe e
// atributo que o validador recusa hoje.
function daFase(entrada, fase) {
  return !(entrada.fase > fase);
}

// `class` está no contrato como atributo de qualquer elemento, com o valor em aberto, porque quem
// confere o que vai dentro dele é vocabulario.classe, pela tabela de classes — e não
// vocabulario.atributo, que pula a chave. Deixar a regra genérica dizer "texto livre" seria falso.
const VALOR_POR_ATRIBUTO = { class: 'as classes da tabela acima' };

// O que o validador confere no valor de um atributo, na ordem em que valorInvalido() confere
// (validador/regras/vocabulario.js): lista fechada, padrão, JSON. Nada declarado é texto livre.
function valoresDe(regra) {
  const partes = [];
  if (regra.valores) partes.push(regra.valores.map((valor) => (valor === '' ? 'sem valor' : `\`${valor}\``)).join(', '));
  if (regra.padrao) partes.push(`na forma \`${regra.padrao}\``);
  if (regra.json) partes.push('um objeto JSON');
  if (partes.length === 0) partes.push('texto livre');
  if (regra.layouts) partes.push(`só no layout ${regra.layouts.map((layout) => `\`${layout}\``).join(' ou ')}`);
  if (regra.obrigatorio) partes.push('obrigatório');
  return partes.join('; ');
}

function tabela(cabecalho, linhas) {
  return [`| ${cabecalho.join(' | ')} |`, `|${cabecalho.map(() => '---').join('|')}|`, ...linhas].join('\n');
}

// A segunda das quatro tabelas da spec 5.6. Ela é o que deixa o guia enumerar valor de atributo sem
// depender de alguém ter usado o valor num deck: `data-grade="12"` não aparece em especime/,
// modelos/ nem exemplos/ (medido), então o extrator de exemplos nunca o mostraria.
export function tabelaDeVocabulario(contrato, { fase = 1 } = {}) {
  const partes = [];

  partes.push(`### Elementos\n\n${emCodigo(contrato.html.elementos)}.`);

  const classes = Object.entries(contrato.html.classes)
    .filter(([, regra]) => daFase(regra, fase))
    .map(([nome, regra]) => `| \`.${nome}\` | ${regra.em ? emCodigo(regra.em) : 'qualquer elemento'} `
      + `| ${regra.dentro ? emCodigo(regra.dentro) : '—'} |`);
  partes.push(`### Classes\n\n${tabela(['classe', 'em', 'só dentro de'], classes)}`);

  const atributos = [];
  for (const [seletor, doSeletor] of Object.entries(contrato.html.atributos)) {
    for (const [nome, regra] of Object.entries(doSeletor)) {
      if (!daFase(regra, fase)) continue;
      const valores = VALOR_POR_ATRIBUTO[nome] ?? valoresDe(regra);
      atributos.push(`| \`${nome}\` | ${ondeVale(seletor)} | ${celula(valores)} |`);
    }
  }
  partes.push(`### Atributos\n\n${tabela(['atributo', 'em', 'valores'], atributos)}`);

  const grades = Object.entries(contrato.grades).map(([nome, divs]) => `| \`${nome}\` | ${divs} |`);
  partes.push(`### Grades\n\n${tabela(['`data-grade`', '`div` filhos'], grades)}`);

  const porElemento = Object.entries(contrato.svg.atributosPorElemento)
    .map(([elemento, lista]) => `${emCodigo(lista)} em \`${elemento}\``)
    .join('; ');
  partes.push(`### Dentro de um \`<svg>\`\n\n`
    + `Elementos: ${emCodigo(contrato.svg.elementos)}.\n\n`
    + `Atributos: ${emCodigo(contrato.svg.atributos)}${porElemento ? `; e ${porElemento}` : ''}.\n\n`
    + `Classes: ${emCodigo(contrato.svg.classes)}. Cores: ${emCodigo(contrato.svg.cores)}. `
    + `O \`href\` aponta só para um id da própria figura (\`${contrato.svg.hrefPadrao}\`).`);

  partes.push('### Proibidos e reservados\n\n'
    + `Elementos proibidos: ${emCodigo(contrato.proibidos.elementos)}.\n\n`
    + `Atributos proibidos: ${emCodigo(contrato.proibidos.atributos)}, e qualquer um que comece com `
    + `${emCodigo(contrato.proibidos.prefixosDeAtributo)}.\n\n`
    + `Comandos de TeX proibidos: ${emCodigo(contrato.proibidos.comandosTex)}, e o que casar `
    + `${emCodigo(contrato.proibidos.comandosTexPorPadrao)}.\n\n`
    + `Classes do sistema, que o sistema escreve e o autor não: ${emCodigo(contrato.classesDoSistema)}.`);

  return partes.join('\n\n');
}

// A terceira das quatro tabelas da spec 5.6. O mínimo é em px, como a mensagem de
// composicao.tamanho-minimo o diz; as chaves `precedencia` e `excecoes` não são papéis.
export function tabelaDePapeis(contrato) {
  const linhas = Object.entries(contrato.papeis)
    .filter(([nome]) => nome !== 'precedencia' && nome !== 'excecoes')
    .map(([nome, papel]) => `| \`${nome}\` | ${papel.minimo} px | ${celula(emCodigo(papel.seletores))} |`);
  return `${tabela(['papel', 'tamanho mínimo', 'onde vale'], linhas)}\n\n`
    + `Fora da medição: ${emCodigo(contrato.papeis.excecoes)}.`;
}

// O esqueleto, lido do próprio modelo. É a guarda que faltava ao trecho que o guia mostrava: antes,
// a cópia era conferida à mão uma vez e nunca mais.
export function blocoDoModelo(raiz) {
  return `\`\`\`html\n${readFileSync(new URL(MODELO, raiz), 'utf8').trimEnd()}\n\`\`\``;
}

// Um exemplo por layout, EXTRAÍDO do espécime e não escrito: o espécime é validado a cada rodada,
// então todo trecho daqui é, por construção, um trecho que passa. Escolhe o menor entre os decks.
// O `.sort()` é o que já se faz em build/cobertura.mjs: um gerado-e-versionado só compra a guarda
// "regerar não muda nada" se a ordem de leitura do diretório não entrar no resultado.
export function exemplosPorLayout(raiz) {
  const achados = {};
  for (const nome of readdirSync(new URL('especime/', raiz)).filter((n) => n.endsWith('.html')).sort()) {
    const html = readFileSync(new URL(`especime/${nome}`, raiz), 'utf8');
    // Só decks em português. especime/ifusp.html é `lang="en"` de propósito — é ele que exercita os
    // rótulos em inglês da spec 6.8 —, e sem este filtro ele vence o critério "o menor" em dois
    // layouts, pondo "The cloud spreads" e "Takeaways" como exemplos canônicos de um guia escrito
    // para professores brasileiros. Medido: os sete layouts têm instância pt-BR, então filtrar não
    // custa cobertura nenhuma.
    if (!/<html lang="pt/.test(html)) continue;
    for (const trecho of html.match(/<section data-layout="[a-z-]+"[\s\S]*?<\/section>/g) ?? []) {
      const layout = trecho.match(/data-layout="([a-z-]+)"/)[1];
      if (!achados[layout] || trecho.length < achados[layout].trecho.length) {
        achados[layout] = { trecho, deck: nome };
      }
    }
  }
  return achados;
}

// Um bloco ```html por layout, na ordem do contrato. Erra alto se um layout não tiver exemplo: o
// espécime cobre os sete hoje, e o dia em que deixar de cobrir é o dia de saber, não de publicar um
// guia com um layout sem demonstração.
export function blocoDeExemplos(contrato, exemplos) {
  return Object.keys(contrato.layouts)
    .map((nome) => {
      const achado = exemplos[nome];
      if (!achado) throw new Error(`layout "${nome}" não tem exemplo no espécime`);
      return `#### \`${nome}\`\n\n\`\`\`html\n${achado.trecho}\n\`\`\`\n\nExtraído de \`especime/${achado.deck}\`.`;
    })
    .join('\n\n');
}

// Substitui o conteúdo entre <!-- gerado:nome --> e <!-- /gerado -->. Erra alto se um marcador
// pedido não existir: um bloco que silenciosamente não é escrito é a forma deste projeto de
// produzir documentação que mente.
export function aplicarMarcadores(texto, blocos) {
  let saida = texto;
  for (const [nome, conteudo] of Object.entries(blocos)) {
    const marca = new RegExp(`(<!-- gerado:${nome} -->\\n)[\\s\\S]*?(<!-- /gerado -->)`);
    if (!marca.test(saida)) throw new Error(`marcador "gerado:${nome}" não encontrado`);
    saida = saida.replace(marca, (_, abre, fecha) => `${abre}${conteudo}\n${fecha}`);
  }
  return saida;
}

// Os cinco arquivos-fonte de guia/pacotes/ (spec 10.1) não são lidos por humanos: são o texto que o
// `aula-usp pacotes` do marco 6c monta nos quatro pacotes da spec 10.2, e os destinos abaixo são os
// dessa tabela. `npm run guia` NÃO os escreve — eles são prosa à mão, como o resto do guia; o que
// mora aqui é o que a montagem do 6c precisa saber, para não ser redescoberto lá.
export const FONTES_DE_PACOTE = {
  'guia/pacotes/skill.md': { destino: 'pacotes/skill/aula-usp/SKILL.md', essenciais: true },
  'guia/pacotes/projeto-claude.md': { destino: 'pacotes/claude/projeto/instrucoes.md', essenciais: true },
  // teto: spec 10.2 ("instrucoes.txt com até 8.000 caracteres") e 11.1. Número da spec, não do
  // contrato, por isso constante nomeada com a citação ao lado (AGENTS.md).
  'guia/pacotes/gpt-instrucoes.md': { destino: 'pacotes/gpt/gpt-personalizado/instrucoes.txt', essenciais: true, teto: 8000 },
  // Sem regras essenciais: iniciadores de conversa não são instrução, são quatro frases de botão.
  'guia/pacotes/gpt-iniciadores.md': { destino: 'pacotes/gpt/gpt-personalizado/iniciadores.txt', essenciais: false },
  'guia/pacotes/agents-disciplina.md': { destino: 'pacotes/repositorio-de-disciplina/AGENTS.md', essenciais: true },
};

// O bloco que a spec 10.1 manda entrar "literalmente, em todos os pacotes". Ele é LIDO de
// 00-principios.md, nunca copiado: é essa leitura que faz uma regra mudada num lugar mudar nos
// quatro pacotes de uma vez. normalize('NFC') porque o marcador tem acento (`início`), e um editor
// que grave em NFD faria a busca falhar por um motivo que não é o que ninguém quis medir.
export function regrasEssenciais({ raiz = RAIZ } = {}) {
  const texto = readFileSync(new URL('guia/00-principios.md', raiz), 'utf8').normalize('NFC');
  const entre = texto.match(/<!-- regras-essenciais:início -->\n([\s\S]*?)<!-- regras-essenciais:fim -->/);
  if (!entre) throw new Error('guia/00-principios.md não tem os marcadores de regras-essenciais');
  return entre[1].trim();
}

// As duas regras de montagem de um arquivo-fonte de pacote, declaradas no cabeçalho de cada um. A
// ORDEM entre elas importa: o marcador é trocado PRIMEIRO, e só então os comentários que sobraram
// somem — na ordem inversa, o próprio marcador (que é um comentário) sumiria junto e o bloco nunca
// entraria. E a troca é por FUNÇÃO, nunca por string: o bloco contém "`$` não é delimitador", e numa
// string de substituição `$` seguido de crase é o padrão especial que insere tudo que vem ANTES do
// casamento. Medido: com a string, instrucoes.txt saía 2.872 caracteres maior do que é.
export function montarPacote(fonte, bloco) {
  return fonte
    .replace(/^<!-- inserir:regras-essenciais -->$/m, () => bloco)
    .replace(/<!--[\s\S]*?-->\n?/g, '');
}

// Todo bloco gerado, por nome de marcador. Separado de gerarGuia() para que a guarda possa conferir
// os blocos um a um sem ter de reencontrá-los dentro dos arquivos — e para que um bloco novo entre
// nessa conferência só por existir aqui.
export function blocosGerados({ raiz = RAIZ } = {}) {
  const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', raiz), 'utf8'));
  return {
    modelo: blocoDoModelo(raiz),
    'tabela-de-vocabulario': tabelaDeVocabulario(contrato),
    'tabela-de-layouts': tabelaDeLayouts(contrato),
    'exemplos-por-layout': blocoDeExemplos(contrato, exemplosPorLayout(raiz)),
    'tabela-de-papeis': tabelaDePapeis(contrato),
    'tabela-de-regras': tabelaDeRegras(contrato),
  };
}

// Devolve o texto novo de cada arquivo de guia com marcador, sempre; grava só quando pedido. É essa
// separação que deixa a guarda de tests/unit/guia.test.mjs regerar em memória sem sujar o disco.
export function gerarGuia({ raiz = RAIZ, escrever = false } = {}) {
  const conteudo = blocosGerados({ raiz });
  const saida = {};
  for (const [caminho, nomes] of Object.entries(BLOCOS_POR_ARQUIVO)) {
    const alvo = new URL(caminho, raiz);
    const blocos = Object.fromEntries(nomes.map((nome) => [nome, conteudo[nome]]));
    saida[caminho] = aplicarMarcadores(readFileSync(alvo, 'utf8'), blocos);
    if (escrever) writeFileSync(alvo, saida[caminho]);
  }
  return saida;
}

function principal() {
  const saida = gerarGuia({ raiz: RAIZ, escrever: true });
  console.log(`guia gerado em ${Object.keys(saida).join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) principal();
