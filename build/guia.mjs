// Gera o que o contrato e o espécime já sabem, para que o guia não repita nenhum dos dois à mão
// (spec 3.4: "nenhum texto de instrução é mantido à mão fora de guia/"). Quinto artefato gerado e
// versionado do repositório — ver a tabela em AGENTS.md.
//   node build/guia.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('../', import.meta.url);

// Que bloco gerado entra em que arquivo. A prosa em volta é escrita à mão (Tarefas 3 e 5); só o
// que está entre os marcadores é sobrescrito.
export const BLOCOS_POR_ARQUIVO = {
  'guia/20-layouts.md': ['tabela-de-layouts', 'exemplos-por-layout'],
  'guia/60-validador.md': ['tabela-de-regras'],
};

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

// Um exemplo por layout, EXTRAÍDO do espécime e não escrito: o espécime é validado a cada rodada,
// então todo trecho daqui é, por construção, um trecho que passa. Escolhe o menor entre os decks.
// O `.sort()` é o que já se faz em build/cobertura.mjs: um gerado-e-versionado só compra a guarda
// "regerar não muda nada" se a ordem de leitura do diretório não entrar no resultado.
export function exemplosPorLayout(raiz) {
  const achados = {};
  for (const nome of readdirSync(new URL('especime/', raiz)).filter((n) => n.endsWith('.html')).sort()) {
    const html = readFileSync(new URL(`especime/${nome}`, raiz), 'utf8');
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

// Devolve o texto novo de cada arquivo de guia com marcador, sempre; grava só quando pedido. É essa
// separação que deixa a guarda de tests/unit/guia.test.mjs regerar em memória sem sujar o disco.
export function gerarGuia({ raiz = RAIZ, escrever = false } = {}) {
  const contrato = JSON.parse(readFileSync(new URL('contrato/contrato.json', raiz), 'utf8'));
  const exemplos = exemplosPorLayout(raiz);
  const conteudo = {
    'tabela-de-layouts': tabelaDeLayouts(contrato),
    'exemplos-por-layout': blocoDeExemplos(contrato, exemplos),
    'tabela-de-regras': tabelaDeRegras(contrato),
  };
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
