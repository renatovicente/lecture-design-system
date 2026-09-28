// Gera o que o contrato e o espécime já sabem, para que o guia não repita nenhum dos dois à mão
// (spec 3.4: "nenhum texto de instrução é mantido à mão fora de guia/"). Quinto artefato gerado e
// versionado do repositório — ver a tabela em AGENTS.md.
//   node build/guia.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('../', import.meta.url);

// Que bloco gerado entra em que arquivo. A prosa em volta é escrita à mão (Tarefas 3 e 5); só o
// que está entre os marcadores é sobrescrito. Quatro das cinco tabelas são as que a spec 5.6 nomeia —
// "as tabelas de layouts, vocabulário, papéis e regras do guia são geradas dele" —, mais o
// esqueleto, que é o próprio modelo copiado, e mais a de limites, que a spec não pede e o aceite do
// marco 7 cobrou (ver tabelaDeLimites).
export const BLOCOS_POR_ARQUIVO = {
  'guia/10-estrutura.md': ['modelo', 'tabela-de-vocabulario', 'tabela-de-limites'],
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
    // acaoSvg: a ação que a regra põe no achado de texto de SVG (composicao.tamanho-minimo), que não
    // é a mesma de texto HTML — o autor que lê a tabela precisa das duas.
    .map(([nome, regra]) => `| \`${nome}\` | ${regra.severidade} | ${regra.acao}${regra.acaoSvg ? ` Em texto de SVG: ${regra.acaoSvg[0].toLowerCase()}${regra.acaoSvg.slice(1)}` : ''} |`);
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

// O que a ÚLTIMA parte da chave mede, em palavras. A chave traz o número e quase sempre a unidade,
// mas nem sempre: `blocos.maxFileira` são oito o quê? Sem isto a tabela publicaria número sem
// unidade, que é o que um professor não consegue usar. O mapa é pela última parte, e não pela chave
// inteira, porque o vocabulário é fechado e reusado — oito dos 34 limites terminam em `caracteres` —,
// então um limite novo com terminação conhecida não precisa de palavra nova nenhuma.
const UNIDADE = {
  min: '',
  maxFileira: 'na fileira de quadrados do cabeçalho',
  maxPorSlide: 'por slide',
  caracteres: 'caracteres',
  caracteresPorSegmento: 'caracteres por segmento',
  caracteresPorItem: 'caracteres por item',
  caracteresSemDataCurto: 'caracteres, quando a abertura não traz `data-curto`',
  segmentos: 'segmentos',
  linhas: 'linhas',
  linhasDeDados: 'linhas de dados',
  colunas: 'colunas',
  palavras: 'palavras',
  itens: 'itens',
  nos: 'nós',
  series: 'séries',
  megabytes: 'megabytes',
};

// Um só dos 34 é piso, e não teto. Uma tabela com "máximo" no cabeçalho mentiria sobre ele — a aula
// precisa de PELO MENOS dois blocos —, então o sentido entra na célula, e a linha se lê inteira fora
// de contexto, que é como um modelo a cita.
const PISOS = new Set(['min']);

// O que o PREFIXO da chave nomeia. É o "onde" que a chave abrevia: `sintese` é a `ol.sintese` do
// encerramento, `saida` é o arquivo que o build escreve. Vinte e três prefixos para 34 limites, e
// aqui também um limite novo de prefixo conhecido entra sem palavra nova.
const ONDE = {
  blocos: 'os blocos da aula',
  'capa.h1': 'o título da capa',
  'abertura.h2': 'o título da abertura',
  'abertura.dataCurto': 'o `data-curto` da abertura',
  pergunta: 'a `p.pergunta` da abertura',
  titulo: 'o título dos outros layouts',
  lide: 'o `p.lide`',
  corpo: 'o corpo do slide de conteúdo, sem título, lide, código, TeX nem notas',
  coluna: 'cada coluna de `div.colunas`',
  lista: 'cada `ul` ou `ol.passos`',
  destaque: 'os `aside.destaque`',
  alerta: 'os `aside.alerta`',
  rotulo: 'o `data-rotulo`',
  afirmacao: 'o `p.afirmacao`',
  fonte: 'o `p.fonte`',
  legenda: 'o `figcaption`',
  sintese: 'a `ol.sintese` do encerramento',
  proxima: 'o `p.proxima` do encerramento',
  codigo: 'cada `pre`',
  tabela: 'cada `table`',
  grafico: 'cada `figure.grafico`',
  diagrama: 'cada `figure.diagrama`',
  saida: 'o arquivo que `aula-usp build` escreve',
};

// A quinta tabela, e a única que a spec 5.6 não pede. Ela existe porque o aceite do marco 7 mediu o
// custo de ela não existir: um agente com só o pacote na mão errou o título da capa na primeira
// tentativa, porque `capa.h1.caracteresPorSegmento` não aparecia em nenhum dos onze arquivos do guia
// — o `acao` de `limites.titulo` não cita número, e o único exemplo de mensagem do guia mostra o do
// `h2`. O número é sempre do contrato; o que se escreve aqui são as PALAVRAS em volta dele.
//
// Plana, e na ordem do contrato. As chaves agrupam por prefixo, e a tentação é virar subtítulos —
// mas 34 limites cabem em 23 prefixos, e dezesseis desses prefixos têm um limite só (medido): seriam
// 23 subtítulos para 34 linhas, e a chave inteira deixaria de existir numa linha só, que é justamente o
// que um modelo procura. O agrupamento que as chaves carregam vira a coluna "onde", não subtítulo. A
// ordem é a do contrato porque ela é a de quem escreve a aula — capa, abertura, título, corpo,
// componentes, encerramento, saída —, e nela as chaves de mesmo prefixo já saem vizinhas.
//
// Erra alto quando falta palavra para uma chave, pelo mesmo motivo de blocoDeExemplos: um limite
// publicado como "no máximo 8 undefined" é pior do que um `npm run guia` que para e diz o que falta.
export function tabelaDeLimites(contrato) {
  const linhas = Object.entries(contrato.limites).map(([chave, valor]) => {
    const corte = chave.lastIndexOf('.');
    if (corte < 0) throw new Error(`o limite "${chave}" não tem prefixo — a chave precisa de um ponto`);
    const prefixo = chave.slice(0, corte);
    const ultima = chave.slice(corte + 1);
    if (ONDE[prefixo] === undefined) throw new Error(`o limite "${chave}" não tem palavra para o prefixo "${prefixo}"`);
    if (UNIDADE[ultima] === undefined) throw new Error(`o limite "${chave}" não tem unidade para "${ultima}"`);
    // String(valor) e o filtro por string vazia, não por falsidade: um limite de valor 0 é um número
    // como outro qualquer, e `filter(Boolean)` o apagaria da frase sem ninguém ver.
    const quanto = [PISOS.has(ultima) ? 'no mínimo' : 'no máximo', String(valor), UNIDADE[ultima]]
      .filter((parte) => parte !== '').join(' ');
    return `| \`${chave}\` | ${quanto} | ${ONDE[prefixo]} |`;
  });
  return tabela(['limite', 'quanto cabe', 'onde'], linhas);
}

// O esqueleto, lido do próprio modelo. É a guarda que faltava ao trecho que o guia mostrava: antes,
// a cópia era conferida à mão uma vez e nunca mais.
export function blocoDoModelo(raiz) {
  return `\`\`\`html\n${readFileSync(new URL(MODELO, raiz), 'utf8').trimEnd()}\n\`\`\``;
}

// O `.sort()` é o que já se faz em build/cobertura.mjs: um gerado-e-versionado só compra a guarda
// "regerar não muda nada" se a ordem de leitura do diretório não entrar no resultado.
export function decksDoEspecime(raiz) {
  return readdirSync(new URL('especime/', raiz)).filter((nome) => nome.endsWith('.html')).sort();
}

// Um deck é "limpo" quando as regras estática e de carga não acham nada nele. São os dois grupos que
// rodam SEM navegador, e por isso os únicos cujo resultado é o mesmo em qualquer máquina: incluir a
// composição faria o guia sair diferente em dois checkouts pelo só fato de um deles ter Chrome, que
// é a coisa que um gerado-e-versionado não pode fazer. Medido: 79 ms para os seis decks do espécime.
export async function decksLimpos(raiz) {
  const { lerERodarEstatica, validarCarga } = await import('./validar.mjs');
  const raizDoSistema = fileURLToPath(raiz);
  const limpos = new Set();
  for (const nome of decksDoEspecime(raiz)) {
    const alvo = fileURLToPath(new URL(`especime/${nome}`, raiz));
    const { doc, contrato, recursos, achadosEstatica, fase } = await lerERodarEstatica(alvo, { raizDoSistema });
    const achados = [...achadosEstatica, ...validarCarga(doc, { contrato, recursos, fase })];
    if (achados.length === 0) limpos.add(nome);
  }
  return limpos;
}

// Um exemplo por layout, EXTRAÍDO do espécime e não escrito. O critério é **a menor seção entre os
// decks que validam limpo**, e cada uma das duas metades foi paga com um defeito:
//
// "o menor" sozinho escolhe sistematicamente a instância mais pobre de cada layout — é justamente
// não ter os opcionais que a faz ser a menor. Em `abertura` ele escolhia uma seção de
// muitos-blocos.html sem `id` e sem `p.pergunta`, num guia que manda "copie a forma" e diz que o
// bloco de código é a autoridade: o autor copiava e ganhava um aviso por bloco.
//
// Filtrar por deck limpo conserta isso pela raiz, e de um jeito que não exige rodar o validador
// seção a seção: muitos-blocos.html existe para provocar aviso, por desenho, e é o único deck com
// achado (medido: 10 avisos nele, 0 nos outros cinco). Sem ele, `abertura` passa a vir de
// componentes.html, com `id` e com `p.pergunta`, e os sete layouts continuam com instância — o
// filtro não custa cobertura nenhuma.
//
// O filtro de idioma é a outra metade. especime/ifusp.html é `lang="en"` de propósito — é ele que
// exercita os rótulos em inglês da spec 6.8 —, e sem o filtro ele vence "o menor" em dois layouts,
// pondo "The cloud spreads" e "Takeaways" como exemplos canônicos de um guia escrito para
// professores brasileiros.
//
// Nenhum dos dois filtros é conferido por "regerar e comparar", que compara saída com saída e por
// isso abençoa qualquer regressão daqui: quem os prende são as asserções de propriedade em
// tests/unit/guia.test.mjs.
export async function exemplosPorLayout(raiz) {
  const limpos = await decksLimpos(raiz);
  const achados = {};
  for (const nome of decksDoEspecime(raiz)) {
    if (!limpos.has(nome)) continue;
    const html = readFileSync(new URL(`especime/${nome}`, raiz), 'utf8');
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
// async desde que o extrator de exemplos passou a perguntar ao validador que decks estão limpos.
export async function blocosGerados({ raiz = RAIZ } = {}) {
  const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', raiz), 'utf8'));
  return {
    modelo: blocoDoModelo(raiz),
    'tabela-de-vocabulario': tabelaDeVocabulario(contrato),
    'tabela-de-layouts': tabelaDeLayouts(contrato),
    'exemplos-por-layout': blocoDeExemplos(contrato, await exemplosPorLayout(raiz)),
    'tabela-de-limites': tabelaDeLimites(contrato),
    'tabela-de-papeis': tabelaDePapeis(contrato),
    'tabela-de-regras': tabelaDeRegras(contrato),
  };
}

// Devolve o texto novo de cada arquivo de guia com marcador, sempre; grava só quando pedido. É essa
// separação que deixa a guarda de tests/unit/guia.test.mjs regerar em memória sem sujar o disco.
export async function gerarGuia({ raiz = RAIZ, escrever = false } = {}) {
  const conteudo = await blocosGerados({ raiz });
  const saida = {};
  for (const [caminho, nomes] of Object.entries(BLOCOS_POR_ARQUIVO)) {
    const alvo = new URL(caminho, raiz);
    const blocos = Object.fromEntries(nomes.map((nome) => [nome, conteudo[nome]]));
    saida[caminho] = aplicarMarcadores(readFileSync(alvo, 'utf8'), blocos);
    if (escrever) writeFileSync(alvo, saida[caminho]);
  }
  return saida;
}

async function principal() {
  const saida = await gerarGuia({ raiz: RAIZ, escrever: true });
  console.log(`guia gerado em ${Object.keys(saida).join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
