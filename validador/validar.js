// Validador (spec 9): roda as regras do contrato sobre o fonte da aula e devolve os achados em ordem estável.
// Só API padrão do DOM, para o mesmo módulo rodar no navegador (marco 4c) e no build, sobre o linkedom.

const CAIXA = { erro: 'ERRO', aviso: 'AVISO' };

// O fonte pode ter section sem data-layout: o montar a ignora, e o validador a acusa (estrutura.layout).
export function slidesDoFonte(corpo) {
  return [...corpo.children].filter((el) => el.nodeName === 'SECTION');
}

// Onde o achado aconteceu: o número do slide, contado no documento, e o id do autor, quando houver.
export function onde(slides, secao) {
  const indice = slides.indexOf(secao);
  return { slide: indice < 0 ? null : indice + 1, id: secao.getAttribute('id') || null };
}

export function encurtar(texto, limite = 80) {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1)}…`;
}

// Trecho do fonte numa linha só, para a mensagem apontar o lugar sem despejar o slide inteiro.
export function trechoDe(elemento, limite = 80) {
  return encurtar(elemento.outerHTML ?? '', limite);
}

// Os seletores de tudo o que o contrato marca como fase 2 e que o autor escreve no fonte, derivados
// do próprio contrato — nenhuma lista em código: os blocos de corpo de contrato.blocosDeCorpoFase2,
// cada classe de html.classes com `fase: 2` nos elementos em que ela vale, cada atributo de
// html.atributos com `fase: 2` no seletor em que ele vale, e cada elemento de html.elementosFase2
// dentro dos pais que ele admite. Fase 2c: até aqui a lista era só blocosDeCorpoFase2, e uma aula
// cuja única marca de fase 2 era `data-captura-ms` (atributo de div.demo, fase 2 desde a fase 1)
// ficava em fase 1 — e o próprio atributo era recusado por vocabulario.atributo. Toda entrada daqui
// é, por construção, algo que a fase 1 recusa; por isso uma aula que valida limpo na fase 1 nunca
// casa nenhum destes seletores e continua em fase 1.
export function seletoresDeFase2(contrato) {
  const seletores = [...(contrato.blocosDeCorpoFase2 ?? [])];
  for (const [classe, regra] of Object.entries(contrato.html.classes)) {
    if (regra.fase === 2) for (const elemento of regra.em ?? ['']) seletores.push(`${elemento}.${classe}`);
  }
  for (const [alvo, atributos] of Object.entries(contrato.html.atributos)) {
    for (const [nome, regra] of Object.entries(atributos)) {
      if (regra.fase === 2) seletores.push(`${alvo === '*' ? '' : alvo}[${nome}]`);
    }
  }
  for (const [elemento, regra] of Object.entries(contrato.html.elementosFase2 ?? {})) {
    for (const pai of regra.dentro ?? ['']) seletores.push(pai ? `${pai} ${elemento}` : elemento);
  }
  // 1.0.1: as metas marcadas fase 2 em contrato.metadados (hoje só `video`). Moram no <head>, não
  // numa section: faseDaAula as procura lá, e só elas (ver SELETOR_DE_META).
  for (const [nome, regra] of Object.entries(contrato.metadados ?? {})) {
    if (regra.fase === 2) seletores.push(`meta[name="${nome}"]`);
  }
  return [...new Set(seletores)];
}

// Os seletores de meta são os únicos que faseDaAula procura no <head>. Os demais continuam só dentro
// das section: `script[type]` (html.atributos.script.type, fase 2) casaria um <script type="module">
// qualquer do <head>, que não é marca de fase nenhuma.
const SELETOR_DE_META = /^meta\[/;

// A fase de validação de uma aula, decidida por presença: fase 2 quando algum slide do fonte usa
// alguma das marcas de fase 2 do contrato (seletoresDeFase2, acima), fase 1 quando não usa nenhuma.
// É o único lugar com essa regra — build/validar.mjs (a CLI) e montar/entrada.js (o navegador) chamam
// esta função. Ela decide o VOCABULÁRIO e nada mais: a captura das demos (spec 7.2) vale para todo
// build, e recursos.demo-sem-estatico decide pelo modo, não pela fase (revisão final da 2c, C1). Só dentro das section: é lá
// que o vocabulário vale, e um <script type="module"> no <head> não é marca de fase nenhuma.
// Sem nenhuma dessas marcas, fase 2 e fase 1 acusam exatamente os mesmos erros, então nenhum deck de
// fase 1 muda de comportamento por causa disto. Fase 2 aqui quer dizer "o vocabulário da fase 2 vale
// como forma"; se o CONTEÚDO desenha é das regras de cada bloco — recursos.grafico para o JSON do
// gráfico, recursos.dot para o DOT do diagrama (validador/regras/recursos.js e carga.js).
export function faseDaAula(doc, contrato) {
  const seletores = seletoresDeFase2(contrato);
  const noCorpo = seletores.filter((seletor) => !SELETOR_DE_META.test(seletor));
  const noCabecalho = seletores.filter((seletor) => SELETOR_DE_META.test(seletor));
  const slides = slidesDoFonte(doc.body);
  if (noCabecalho.some((seletor) => doc.head?.querySelector(seletor))) return 2;
  return slides.some((secao) => noCorpo.some((seletor) => secao.querySelector(seletor))) ? 2 : 1;
}

// Os dois modos da spec 3 (3.2 e 3.3). O padrão é o navegador: é o comportamento de antes de o
// modo existir, e quem não o passa não muda de comportamento.
export const MODOS = ['navegador', 'build'];

export function validar(doc, { contrato, regras, grupo, fase = 1, modo = 'navegador', ...dados }) {
  if (!MODOS.includes(modo)) throw new Error(`validar: modo desconhecido "${modo}" (use ${MODOS.join(' ou ')})`);
  doc.body.normalize(); // o linkedom parte o texto em cada entidade; sem juntar, o TeX do fonte não é achado
  const slides = slidesDoFonte(doc.body);
  // O que vier além do que o motor conhece vai para as regras: é assim que o marco 4c injeta cobertura
  // de glifos e imagens carregadas sem mexer aqui. fase também vai: uma regra que só existe a partir
  // da fase 2 (ou que tem entradas do contrato marcadas fase:2) precisa saber qual fase está rodando.
  // modo também (fase 2c): uma regra cujo veredito depende de o build estar ou não por trás — hoje só
  // recursos.demo-sem-estatico, que na fase 2 se cala no build porque o build fotografa a demo
  // (spec 9.2) — lê o modo daqui, e não de "que recursos vieram".
  const contexto = { doc, slides, contrato, fase, modo, ...dados };
  const achados = [];
  regras.forEach((regra, ordem) => {
    const definicao = contrato.regras[regra.nome];
    if (!definicao || definicao.grupo !== grupo || definicao.fase > fase) return;
    for (const achado of regra.aplicar(contexto)) {
      achados.push({
        severidade: definicao.severidade,
        slide: achado.slide ?? null,
        id: achado.id ?? null,
        regra: regra.nome,
        mensagem: achado.mensagem,
        // Uma regra pode trazer a ação do próprio achado quando o caso pede outra saída ao autor
        // (composicao.tamanho-minimo em texto de SVG: não há texto para cortar, há figura estreita, ou
        // figura que encolheu pela altura). A frase continua vindo do contrato — a regra a lê de lá
        // (acaoSvg, acaoSvgAltura), não a escreve.
        acao: achado.acao ?? definicao.acao,
        trecho: achado.trecho ?? null,
        ordem,
      });
    }
  });
  // Ordem estável: o que é da aula inteira vem primeiro, depois por slide, e dentro do slide na ordem das regras.
  achados.sort((a, b) => (a.slide ?? 0) - (b.slide ?? 0) || a.ordem - b.ordem);
  return achados.map(({ ordem, ...achado }) => achado);
}

export function linhaDe({ severidade, slide, id, regra, mensagem, acao, trecho }) {
  const lugar = slide === null ? 'aula' : `slide ${slide}${id ? ` #${id}` : ''}`;
  const cabeca = `${CAIXA[severidade]} · ${lugar} · ${regra} · ${mensagem} ${acao}`;
  return trecho ? `${cabeca}\n    ${trecho}` : cabeca;
}

export function contar(achados) {
  const erros = achados.filter((achado) => achado.severidade === 'erro').length;
  return { erros, avisos: achados.length - erros };
}

export function cabecalhoDe(achados) {
  const { erros, avisos } = contar(achados);
  return `Validador Aula USP: ${plural(erros, 'erro', 'erros')}, ${plural(avisos, 'aviso', 'avisos')}`;
}

export function plural(quantos, um, muitos) {
  return `${quantos} ${quantos === 1 ? um : muitos}`;
}
