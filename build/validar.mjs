// Cola de Node do validador (spec 9.3): lê a aula do disco, monta o contexto e roda o grupo estático
// e, sobre o mesmo documento, o de carga (etapa 1: KaTeX, disco e scripts, via build/carregar.mjs) e,
// havendo Chrome, o de composição (etapa 5, via build/composicao.mjs). Spec 8.1: falta de Chrome não
// é falha — validarArquivo só relata o motivo; quem avisa o autor é a CLI (bin/aula-usp.mjs).
// O validador em si não sabe de arquivos: aqui é o único lugar com node:fs e linkedom.
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { validar, contar, faseDaAula } from '../validador/validar.js';
import { REGRAS_ESTATICAS, REGRAS_DE_CARGA } from '../validador/regras/index.js';
// Puro, não build/cobertura.mjs: é o mesmo módulo que o navegador carrega (spec 3.5). Este arquivo
// só faz a leitura de disco de validador/cobertura.json; expandi-la em Set é trabalho de lerCobertura.
import { lerCobertura } from '../validador/cobertura.js';
import { carregarNoNode, carregarGraphviz } from './carregar.mjs';

export const RAIZ_SISTEMA = fileURLToPath(new URL('..', import.meta.url));

export { REGRAS_ESTATICAS };

export function caminhoDaAula(alvo) {
  const absoluto = resolve(alvo);
  const info = statSync(absoluto); // ENOENT sobe: quem chama traduz em saída 2
  return info.isDirectory() ? join(absoluto, 'index.html') : absoluto;
}

// Um navegador normaliza o nome de todo atributo para minúsculas no parser, e restaura a grafia
// canônica de uma tabela própria dentro de SVG (viewBox, markerWidth, refX...); o linkedom preserva
// a grafia do autor como está no fonte. Isso é inofensivo para as regras de vocabulário, que já
// comparam atributo.name.toLowerCase() (vocabulario.js) — mas é fatal para casamento por seletor:
// <div Class="colunas"> não bate com elemento.matches('div.colunas') nem aparece em classList, então
// estrutura.colunas, o casador de sequência (sequencia.js) e o próprio montar() em tempo de execução
// silenciosamente deixam de ver uma grade de colunas que um navegador real veria (medido). Por isso
// a correção mora aqui, na fronteira onde o fonte vira DOM — não em validador/, que fica livre de
// qualquer conhecimento de parser, e o marco 4c ganha a normalização de graça, porque quem faz o
// parse lá é o próprio navegador. O marco 5, quando o build de fato ler uma aula com linkedom, vai
// precisar da mesma chamada.
function nomeCanonico(nome, dentroDoSvg, grafiaSvg) {
  const minusculo = nome.toLowerCase();
  return dentroDoSvg ? (grafiaSvg.get(minusculo) ?? minusculo) : minusculo;
}

function normalizarAtributos(documento, contrato) {
  const grafiaSvg = new Map(contrato.svg.atributos.map((nome) => [nome.toLowerCase(), nome]));
  for (const elemento of documento.querySelectorAll('*')) {
    const dentroDoSvg = elemento.closest('svg') !== null;
    const originais = [...elemento.attributes].map((atributo) => ({ nome: atributo.name, valor: atributo.value }));
    const mudou = originais.some(({ nome }) => nome !== nomeCanonico(nome, dentroDoSvg, grafiaSvg));
    if (!mudou) continue;
    // Tira todos e recoloca na ordem original, com o nome canônico: só remover e recolocar o que
    // mudou de nome jogaria esse atributo para o fim, depois dos que não precisaram de troca. O
    // setAttribute do linkedom põe atributo novo na frente, não no fim (medido); recoloca de trás
    // para a frente para a ordem final bater com a original.
    for (const { nome } of originais) elemento.removeAttribute(nome);
    for (const { nome, valor } of [...originais].reverse()) elemento.setAttribute(nomeCanonico(nome, dentroDoSvg, grafiaSvg), valor);
  }
}

export function lerAula(caminho, contrato) {
  const { document } = parseHTML(readFileSync(caminho, 'utf8'));
  normalizarAtributos(document, contrato);
  return document;
}

// Sem validador/cobertura.json (ninguém rodou `aula-usp dist` neste checkout ainda), a validação
// segue sem cobertura: matematica.simbolo-fora-do-tex se cala sozinha (ela mesma decide isso, não
// quem chama), em vez de um artefato gerado e ausente derrubar a CLI inteira.
function lerCoberturaDoSistema(raizDoSistema) {
  const caminho = join(raizDoSistema, 'validador/cobertura.json');
  return existsSync(caminho) ? lerCobertura(JSON.parse(readFileSync(caminho, 'utf8'))) : undefined;
}

// Etapa 1 da spec 3.3 (estática + carga, SEM navegador): lê a aula, roda o grupo estático e prepara
// os recursos de carga — mas não valida "carga" ainda; quem chama decide isso. A fronteira fica
// aqui, antes do grupo de carga, e não depois dele, porque validarArquivo, logo abaixo, enriquece
// recursos.demos com o que o Chrome mediu (medirComposicao, disparado em paralelo) ANTES de validar
// carga: só o Chrome sabe se uma demo de fato captura. build/build.mjs (marco 5c) chama esta função
// sozinha, sem esse enriquecimento: a composição dele (etapa 5, três etapas depois desta) mede o
// MESMO fonte de novo, e SÓ nesse ponto — não aqui, na etapa 1 — porque a spec 3.3 pede as duas
// coisas em momentos diferentes do pipeline, mesmo rodando sobre o mesmo arquivo.
export async function lerERodarEstatica(alvo, { regras = REGRAS_ESTATICAS, raizDoSistema = RAIZ_SISTEMA } = {}) {
  const caminho = caminhoDaAula(alvo);
  const contrato = JSON.parse(readFileSync(join(raizDoSistema, 'contrato/contrato.json'), 'utf8'));
  const unidades = JSON.parse(readFileSync(join(raizDoSistema, 'assets/marcas/unidades.json'), 'utf8'));
  const cobertura = lerCoberturaDoSistema(raizDoSistema);
  const doc = lerAula(caminho, contrato);
  // A mesma função que montar/entrada.js chama do lado navegador (validador/validar.js): sem ela,
  // estrutura.obrigatorio e estrutura.fora-do-layout, fase 1 por padrão, recusariam qualquer deck
  // com gráfico antes mesmo de montar.
  const fase = faseDaAula(doc, contrato);
  // Nesta ordem: validar() normaliza doc.body como efeito colateral (validador/validar.js:28), e
  // carregarNoNode (build/carregar.mjs:texInvalido) depende disso já ter acontecido.
  const achadosEstatica = validar(doc, { contrato, regras, grupo: 'estatica', unidades, cobertura, fase });
  const { default: katex } = await import('katex');
  // O Graphviz só quando a aula tem diagrama: são 819 kB de WASM para compilar, e Graphviz.load() é
  // assíncrono — por isso carrega aqui, e carregarNoNode (síncrona) o recebe pronto, como o KaTeX.
  const graphviz = doc.querySelector('figure.diagrama') ? await carregarGraphviz() : undefined;
  const recursos = carregarNoNode(doc, { pastaDaAula: dirname(caminho), katex, graphviz });
  return { caminho, contrato, doc, recursos, achadosEstatica, fase };
}

// O grupo de carga (spec 9.3), dado o doc e os recursos que lerERodarEstatica já preparou — função à
// parte só por causa do enriquecimento de recursos.demos entre uma chamada e outra (comentário acima).
// `fase` é obrigatória, e sem default: é a que lerERodarEstatica calculou para esta aula, e um
// default silencioso faria o grupo de carga rodar numa fase diferente da do grupo estático.
// modo: 'build' sempre — este é o lado Node, o do terminal (spec 3.3), e é o build que fotografa as
// demos sem imagem própria na fase 2. Vale também para `aula-usp validar`, que é a pré-estreia do
// build: recursos.demo-sem-estatico não acusa ali uma demo que o build vai fotografar; se a foto
// falhar, quem diz é o build (build/build.mjs, depois da etapa 5).
export function validarCarga(doc, { contrato, recursos, fase, falhasDeCaptura }) {
  if (fase === undefined) throw new Error('validarCarga: falta a fase (use a que lerERodarEstatica devolve)');
  return validar(doc, { contrato, regras: REGRAS_DE_CARGA, grupo: 'carga', recursos, fase, modo: 'build', falhasDeCaptura });
}

// async porque o grupo de carga precisa do await import('katex') (dentro de lerERodarEstatica), e a
// composição do await import('./composicao.mjs') mais adiante: os dois só carregam aqui dentro, e não
// no topo do módulo, porque build/composicao.mjs importa playwright-core e build/servir.mjs (que lê
// contrato.json no escopo do módulo) — o mesmo custo que o KaTeX, evitado para quem importa este
// arquivo só por lerAula (dois testes de validar-cli.test.mjs fazem isso).
export async function validarArquivo(alvo, { regras = REGRAS_ESTATICAS, raizDoSistema = RAIZ_SISTEMA } = {}) {
  const caminho = caminhoDaAula(alvo);
  // Mesma leitura que lerERodarEstatica faz por conta própria, repetida de propósito (não duas
  // implementações — build/construir.mjs já aceita essa mesma duplicação de contrato/contrato.json,
  // pela mesma razão): só para poder disparar medirComposicao antes do resto do trabalho local
  // começar, comentário abaixo.
  const contrato = JSON.parse(readFileSync(join(raizDoSistema, 'contrato/contrato.json'), 'utf8'));
  const { medirComposicao } = await import('./composicao.mjs');
  // Dispara o Chrome antes do resto e só espera a resposta depois de terminar o trabalho local: o
  // navegador sobe um servidor e renderiza a aula inteira enquanto o KaTeX e o disco rodam aqui no
  // Node, sem nada em comum entre os dois lados até recursos.demos, logo abaixo.
  const composicao = medirComposicao(caminho, { contrato });
  const { doc, recursos, achadosEstatica, fase } = await lerERodarEstatica(alvo, { regras, raizDoSistema });
  const { achados: daComposicao, demos: demosDoChrome, motivo: semChrome } = await composicao;
  // Com Chrome, o registro de demos vem do que a página realmente executou, não do scanner de texto
  // de build/carregar.mjs — instrução do controlador para o marco 4c (ver build/composicao.mjs).
  if (demosDoChrome) recursos.demos = demosDoChrome;
  const deCarga = validarCarga(doc, { contrato, recursos, fase });
  const achados = [...achadosEstatica, ...deCarga, ...(daComposicao ?? [])];
  // Falta de Chrome não é falha (spec 8.1): achados fica sem o grupo de composição, e erros/avisos
  // conta só o que os outros dois grupos acharam; o motivo vai num campo à parte para a CLI avisar
  // o autor por fora do JSON de --json (bin/aula-usp.mjs).
  const avisoDeComposicao = daComposicao === null ? `composição pulada, sem Chrome: ${semChrome}` : null;
  return { achados, ...contar(achados), avisoDeComposicao };
}
