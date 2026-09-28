// Diagramas (spec 7.2): o DOT de figure.diagrama vira SVG. O Graphviz chega por parâmetro (uma
// instância já carregada de @hpcc-js/wasm-graphviz — Graphviz.load() é assíncrono, e quem espera é
// quem chama), para o mesmo módulo rodar no navegador e no build. Só API padrão do DOM.
//
// "O layout é do Graphviz; o estilo é imposto depois" (spec 7.2). O Graphviz entrega a GEOMETRIA —
// pela saída "json", que traz posição e tamanho de cada nó, os pontos de Bézier de cada aresta e a
// posição de cada texto —, e o SVG é escrito aqui, do zero, com as cores dos tokens. O SVG que o
// próprio Graphviz escreveria não entra na aula: ele traz <title>, comentários, ids (graph0, node1…,
// que colidiriam entre dois diagramas e com os ids do autor), Times 14 e preto, e limpar isso depois
// seria correr atrás do que ele inventar na próxima versão. Escrevendo do zero, o que sai é só o que
// este arquivo sabe escrever.
import { tokens } from '../tokens/tokens.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const { tinta, azul, cinza, linha: corDaLinha, amarelo, papel } = tokens.cor;
const FAMILIA = tokens.fonte.sans.join(', ');
// 20 — spec 7.2: "texto Geist 20 px". Em unidades do viewBox; o SVG sai com width/height iguais ao
// viewBox (1 unidade = 1 px no tamanho natural), e só encolhe quando a figura é mais estreita que o
// diagrama (max-width: 100% em estilos/componentes.css). Quem garante o mínimo do palco (spec 4.3) é
// composicao.tamanho-minimo, que mede o texto de SVG no tamanho em que ele aparece.
const TAMANHO_TEXTO = tokens.minimo.codigo;
const ESPESSURA = tokens.regua.normal; // 2 — spec 7.2: "contorno de 2 px", "setas simples de 2 px"
// Folga em volta do desenho, em unidades do viewBox: a mesma que o SVG do próprio Graphviz usa (pad
// de 4 pt), e maior que meia espessura de traço — sem ela, o contorno do nó da borda sai cortado.
const FOLGA = 4;
const PONTOS_POR_POLEGADA = 72; // o Graphviz dá largura e altura de nó em polegadas, e todo o resto em pontos

// As classes que o autor escreve no DOT (spec 7.2): `foco` num nó, `ativo` numa aresta. O nome não é
// dado do contrato — a spec o fixa em prosa, como os tipos de gráfico (componentes/graficos.js:
// TIPOS_DE_GRAFICO) —, então esta constante é a única fonte dele. Qualquer outra classe no DOT é erro
// de recursos.dot, com o nome dela na mensagem, e não um atributo que some calado no caminho.
export const CLASSES_DO_DOT = Object.freeze({ no: Object.freeze(['foco']), aresta: Object.freeze(['ativo']) });

// As classes que o SVG desenhado leva. São do sistema — é este arquivo que as escreve, não o autor —
// e estão em contrato.classesDoSistema (tests/unit/diagramas.test.mjs confere; os testes de
// integração conferem o documento renderizado inteiro, por classesForaDoContrato). `foco` e `ativo`
// atravessam do DOT para o SVG com o mesmo nome.
export const CLASSES_DO_SVG = Object.freeze(['no', 'aresta', 'agrupamento', ...CLASSES_DO_DOT.no, ...CLASSES_DO_DOT.aresta]);

// Os atributos que o sistema põe NA FRENTE do DOT do autor, para que o layout já saiba o tamanho do
// que vai ser desenhado: um nó dimensionado para Times 14 não comporta Geist 20. É geometria, não
// estilo — o estilo é imposto de novo, e por inteiro, ao escrever o SVG. Por virem antes do corpo do
// autor, um `node [fontsize=…]` escrito por ele vale sobre estes (é a regra do DOT); a cor, a
// espessura e a forma, não: essas nunca são lidas do DOT.
// fontname Helvetica: o Graphviz em WASM não tem as fontes do sistema, e estima a largura do texto
// por tabelas embutidas de Times, Helvetica e Courier. Helvetica é a mais próxima da Geist das três;
// a largura de verdade da Geist é medida no Chrome (tests/integracao/diagramas.test.mjs: o texto de
// todo nó cabe dentro do retângulo dele).
const PADROES = `graph [fontname="Helvetica" fontsize=${TAMANHO_TEXTO}]; `
  + `node [shape=box fontname="Helvetica" fontsize=${TAMANHO_TEXTO} margin="0.2,0.1"]; `
  + `edge [fontname="Helvetica" fontsize=${TAMANHO_TEXTO}]; `;

function escaparXml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Mesmo formato de componentes/graficos.js: string, nunca autofechado, todo atributo escapado.
function elemento(nome, atributos = {}, conteudo = '') {
  const atrs = Object.entries(atributos)
    .filter(([, valor]) => valor !== undefined && valor !== null)
    .map(([chave, valor]) => ` ${chave}="${escaparXml(valor)}"`)
    .join('');
  return `<${nome}${atrs}>${conteudo}</${nome}>`;
}

// Duas casas, como graficos.js: o texto do SVG sai o mesmo nos dois modos, byte a byte.
function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

// O índice do `{` que abre o corpo do grafo: o primeiro fora de string ("…"), de ID HTML (<…>) e de
// comentário (/* */, //, e # no início de linha). `digraph "a{b" {` tem um { no nome, e não é ele.
function aberturaDoCorpo(dot) {
  let i = 0;
  while (i < dot.length) {
    const c = dot[i];
    if (c === '"') {
      i += 1;
      while (i < dot.length && dot[i] !== '"') i += dot[i] === '\\' ? 2 : 1;
      i += 1;
    } else if (c === '<') {
      let profundidade = 0;
      do {
        if (dot[i] === '<') profundidade += 1;
        else if (dot[i] === '>') profundidade -= 1;
        i += 1;
      } while (i < dot.length && profundidade > 0);
    } else if (dot.startsWith('/*', i)) {
      const fim = dot.indexOf('*/', i + 2);
      i = fim < 0 ? dot.length : fim + 2;
    } else if (dot.startsWith('//', i) || (c === '#' && (i === 0 || dot[i - 1] === '\n'))) {
      const fim = dot.indexOf('\n', i);
      i = fim < 0 ? dot.length : fim + 1;
    } else if (c === '{') {
      return i;
    } else {
      i += 1;
    }
  }
  return -1;
}

// Sem `{` nenhum, o DOT vai como está: não é um grafo, e o erro de sintaxe que o Graphviz der é o
// que o autor precisa ler — não um erro sobre um texto que o sistema reescreveu.
export function comPadroes(dot) {
  const abertura = aberturaDoCorpo(dot);
  return abertura < 0 ? dot : `${dot.slice(0, abertura + 1)} ${PADROES}${dot.slice(abertura + 1)}`;
}

// A mensagem do Graphviz vem com quebra de linha no fim ("syntax error in line 1 near '}'\n").
function mensagemDoGraphviz(erro) {
  return String(erro?.message ?? erro).trim();
}

function classesDe(objeto) {
  return (objeto.class ?? '').split(/\s+/).filter(Boolean);
}

function conferirClasses(objeto, permitidas, oQue) {
  for (const classe of classesDe(objeto)) {
    if (!permitidas.includes(classe)) {
      const aceitas = permitidas.length > 0 ? `só ${permitidas.map((c) => `"${c}"`).join(', ')}` : 'nenhuma';
      throw new Error(`classe "${classe}" ${oQue}: o DOT aceita ${aceitas} ali (spec 7.2)`);
    }
  }
}

// "e,x,y p0 p1 p2 p3 …": o ponto depois de `e,` é a PONTA da seta na cabeça, o de `s,` a da cauda,
// e o resto são os pontos de controle da Bézier (1 + 3n). Várias curvas vêm separadas por ";".
function lerPos(pos) {
  return String(pos ?? '').split(';').filter((curva) => curva.trim()).map((curva) => {
    const pontos = [];
    let inicio;
    let fim;
    for (const parte of curva.trim().split(/\s+/)) {
      const campos = parte.split(',');
      if (campos[0] === 's') inicio = [Number(campos[1]), Number(campos[2])];
      else if (campos[0] === 'e') fim = [Number(campos[1]), Number(campos[2])];
      else pontos.push([Number(campos[0]), Number(campos[1])]);
    }
    return { pontos, inicio, fim };
  });
}

// Constrói o desenho a partir do JSON do Graphviz. `ponto` converte do espaço dele (origem embaixo à
// esquerda, y para cima) para o do SVG (origem em cima, y para baixo), já com a folga.
function montarSvg(grafo) {
  const [x0, y0, x1, y1] = String(grafo.bb ?? '0,0,0,0').split(',').map(Number);
  const largura = arredondar(x1 - x0 + 2 * FOLGA);
  const altura = arredondar(y1 - y0 + 2 * FOLGA);
  const ponto = ([x, y]) => [arredondar(x - x0 + FOLGA), arredondar(y1 - y + FOLGA)];
  const objetos = grafo.objects ?? [];
  const quantosSubgrafos = grafo._subgraph_cnt ?? 0;
  const subgrafos = objetos.slice(0, quantosSubgrafos);
  const nos = objetos.slice(quantosSubgrafos);
  const porGvid = new Map(nos.map((no) => [no._gvid, no]));

  // Texto, sempre em tinta, Geist 20 — o do nó em foco também (amarelo é o CAMPO, spec 7.2), e o da
  // aresta ativa também: texto azul só vale a partir de 32 px (spec 4.2). O de agrupamento em cinza.
  const textos = (operacoes, cor) => (operacoes ?? []).filter((op) => op.op === 'T').map((op) => {
    const [x, y] = ponto(op.pt);
    const ancora = { l: 'start', r: 'end' }[op.align] ?? 'middle';
    return elemento('text', { x, y, fill: cor, 'font-size': TAMANHO_TEXTO, 'text-anchor': ancora }, escaparXml(op.text));
  }).join('');

  // Agrupamentos (subgraph cluster_*): contorno em `linha`, rótulo em cinza. Subgrafo que não é
  // cluster não tem caixa no Graphviz, e aqui também não.
  const agrupamentos = subgrafos.filter((sub) => String(sub.name ?? '').startsWith('cluster') && sub.bb).map((sub) => {
    conferirClasses(sub, [], `no agrupamento "${sub.name}"`);
    const [a0, b0, a1, b1] = sub.bb.split(',').map(Number);
    const [x, y] = ponto([a0, b1]);
    const caixa = elemento('rect', {
      x, y, width: arredondar(a1 - a0), height: arredondar(b1 - b0),
      fill: 'none', stroke: corDaLinha, 'stroke-width': ESPESSURA,
    });
    return elemento('g', { class: 'agrupamento' }, caixa + textos(sub._ldraw_, cinza));
  }).join('');

  const arestas = (grafo.edges ?? []).map((aresta) => {
    const ativa = classesDe(aresta).includes('ativo');
    conferirClasses(aresta, CLASSES_DO_DOT.aresta, `na aresta "${porGvid.get(aresta.tail)?.name} → ${porGvid.get(aresta.head)?.name}"`);
    const cor = ativa ? azul : tinta;
    const partes = lerPos(aresta.pos).map(({ pontos, inicio, fim }) => {
      if (pontos.length === 0) return '';
      const [p0, ...resto] = pontos.map(ponto);
      let d = `M${p0[0]},${p0[1]}`;
      for (let k = 0; k + 2 < resto.length; k += 3) {
        d += `C${resto[k][0]},${resto[k][1]} ${resto[k + 1][0]},${resto[k + 1][1]} ${resto[k + 2][0]},${resto[k + 2][1]}`;
      }
      const curva = elemento('path', { d, fill: 'none', stroke: cor, 'stroke-width': ESPESSURA });
      // Seta simples (spec 7.2): um triângulo cheio na cor da aresta, da ponta que o Graphviz deixou
      // (e/s) até o último ponto da curva — o vão que ele reserva para a seta. A forma de seta que o
      // autor pedir no DOT (arrowhead=…) não é lida: a seta é sempre esta.
      const seta = (base, pontaDaSeta) => {
        const [bx, by] = ponto(base);
        const [px, py] = ponto(pontaDaSeta);
        const comprimento = Math.hypot(px - bx, py - by) || 1;
        const meiaLargura = comprimento * 0.35;
        const [nx, ny] = [-(py - by) / comprimento * meiaLargura, (px - bx) / comprimento * meiaLargura];
        const vertices = [[px, py], [bx + nx, by + ny], [bx - nx, by - ny]]
          .map(([x, y]) => `${arredondar(x)},${arredondar(y)}`).join(' ');
        return elemento('polygon', { points: vertices, fill: cor });
      };
      return curva + (fim ? seta(pontos.at(-1), fim) : '') + (inicio ? seta(pontos[0], inicio) : '');
    }).join('');
    const classe = ativa ? 'aresta ativo' : 'aresta';
    return elemento('g', { class: classe }, partes + textos(aresta._ldraw_, tinta));
  }).join('');

  // Nós retangulares (spec 7.2), qualquer que seja o `shape` do DOT: o retângulo sai da posição e do
  // tamanho que o Graphviz calculou para o nó. Campo em papel, ou em amarelo com `foco`.
  const nosSvg = nos.map((no) => {
    const emFoco = classesDe(no).includes('foco');
    conferirClasses(no, CLASSES_DO_DOT.no, `no nó "${no.name}"`);
    const [cx, cy] = String(no.pos).split(',').map(Number);
    const w = Number(no.width) * PONTOS_POR_POLEGADA;
    const h = Number(no.height) * PONTOS_POR_POLEGADA;
    const [x, y] = ponto([cx - w / 2, cy + h / 2]);
    const caixa = elemento('rect', {
      x, y, width: arredondar(w), height: arredondar(h),
      fill: emFoco ? amarelo : papel, stroke: tinta, 'stroke-width': ESPESSURA,
    });
    return elemento('g', { class: emFoco ? 'no foco' : 'no' }, caixa + textos(no._ldraw_, tinta));
  }).join('');

  const svg = elemento('svg', {
    viewBox: `0 0 ${largura} ${altura}`, width: largura, height: altura, xmlns: SVG_NS, 'font-family': FAMILIA,
  }, agrupamentos + arestas + nosSvg);
  return { svg, nos: nos.length };
}

// O desenhista com o Graphviz da aula. Puro: nenhuma chamada toca o DOM, e desenhar devolve uma
// string, como o de componentes/graficos.js.
export function criarDesenhista({ graphviz }) {
  return {
    // Devolve { svg, nos }: o SVG com o estilo do sistema e quantos nós o grafo tem DE VERDADE — os
    // do resultado compilado, não os que um regex acharia no texto (`a -> b -> c` declara três nós
    // sem listá-los). Lança com a mensagem do Graphviz quando o DOT não compila.
    desenhar(dot) {
      let json;
      try {
        json = graphviz.layout(comPadroes(dot), 'json', 'dot');
      } catch (erro) {
        throw new Error(`o Graphviz não compila o DOT: ${mensagemDoGraphviz(erro)}`);
      }
      return montarSvg(JSON.parse(json));
    },
  };
}

// Um figure.diagrama: { figura, trecho, nos, svg } quando o DOT compila, { figura, trecho, mensagem }
// quando não; null sem o script (estrutura.obrigatorio já acusa isto no fonte).
function compilarFigura(figura, desenhista) {
  const script = figura.querySelector('script[type="text/vnd.graphviz"]');
  if (!script) return null;
  const trecho = script.textContent.trim();
  try {
    const { svg, nos } = desenhista.desenhar(trecho);
    return { figura, trecho, nos, svg };
  } catch (erro) {
    return { figura, trecho, mensagem: erro.message };
  }
}

// Percorre os figure.diagrama de raiz e devolve, para cada um, { figura, trecho, nos } ou
// { figura, trecho, mensagem } — sem tocar no documento. É o que o grupo de carga precisa no build
// (build/carregar.mjs), onde o Graphviz roda no Node sobre o fonte (spec 9.3, etapa 1).
export function compilarDiagramas(raiz, { desenhista }) {
  return [...raiz.querySelectorAll('figure.diagrama')]
    .map((figura) => compilarFigura(figura, desenhista))
    .filter(Boolean)
    .map(({ svg, ...relato }) => relato);
}

// Acrescenta um SVG ao lado do script de cada figure.diagrama (script.after: o script fica, como em
// desenharGraficos) e devolve o mesmo relatório de compilarDiagramas: os erros, para o build
// (build/construir.mjs:achadosDeDiagrama) e o painel, e a contagem de nós, para
// recursos.diagrama-grande no navegador. Idempotente: uma figura que já tem svg não é redesenhada.
export function desenharDiagramas(raiz, { desenhista }) {
  const doc = raiz.ownerDocument ?? raiz;
  return [...raiz.querySelectorAll('figure.diagrama')]
    .filter((figura) => !figura.querySelector('svg'))
    .map((figura) => compilarFigura(figura, desenhista))
    .filter(Boolean)
    .map(({ svg, ...relato }) => {
      if (svg !== undefined) {
        const molde = doc.createElement('template');
        molde.innerHTML = svg;
        relato.figura.querySelector('script[type="text/vnd.graphviz"]').after(molde.content.firstChild);
      }
      return relato;
    });
}
