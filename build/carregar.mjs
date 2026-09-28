// Carrega, no Node, o que o grupo de carga precisa saber (spec 9.3, etapa 1): KaTeX compila o TeX do
// fonte, o Graphviz compila o DOT dos diagramas, o disco responde pelas imagens, e os registros de
// demo são procurados no texto dos scripts.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compilarTex, segmentosDeTex, textosComTex } from '../componentes/tex.js';
import { caminhosDeCsv } from '../componentes/csv.js';
import { criarDesenhista, compilarDiagramas } from '../componentes/diagramas.js';

// AulaUSP.demo('nome', { … }) — o nome mora numa string, então o passo 1 (achar a chamada e ler o
// nome) roda sobre o texto original. Aspas simples ou duplas; o nome no padrão de data-demo do
// contrato (minúsculas, dígitos e hífen).
const CHAMADA = /AulaUSP\.demo\(\s*(['"])([a-z][a-z0-9-]*)\1\s*,/g;

// capturar(...), capturar: ... ou ['capturar'](...) — uma definição, não uma menção qualquer.
const DEFINE_CAPTURAR = /\bcapturar\s*[:(]|\[\s*['"]capturar['"]\s*\]\s*[:(]/;

// O fechamento heurístico do regex antigo (linha própria antes do ")"), de reserva para quando o
// casamento de chaves não resolve — ver fimDeReserva.
const FECHAMENTO_HEURISTICO = /\n\s*\}\s*\)/;

// Apaga comentários (/* … */ e // …) trocando cada caractere, menos a quebra de linha, por um
// espaço: o texto sai do mesmo tamanho, então todo índice de `bruto` continua valendo na cópia —
// dá para comparar o mesmo trecho dos dois textos e saber se ele caiu dentro de um comentário.
// Nas strings, o laço sempre pula por cima de uma vez (um "//" dentro de uma URL como 'http://…',
// que aparece de verdade num capturar() do sistema, não é comentário nenhum) — apagarStrings decide
// só se o conteúdo pulado fica no texto (o passo 1, que lê o nome da demo, precisa disso: o nome
// mora numa string) ou também vira espaço (o casamento de chaves de fimDoObjeto, para quem um {
// ou } dentro de uma string, como `const s = '{';`, não pode contar como chave de verdade).
//
// Buraco aceito, por instrução do controlador, e não corrigido aqui: um literal de regex com aspas
// dentro (ex.: const p = /['"]/;) engana este rastreador — ele lê a aspa do regex como abertura de
// string e só resincroniza na próxima aspa que achar, seja lá onde for; um AulaUSP.demo(...)
// comentado que caia dentro desse trecho sequestrado volta a parecer ao vivo. Corrigir isso de
// verdade exigiria distinguir divisão de início de regex sem um parser de JavaScript de verdade — o
// mesmo parser que a spec 9.3 evitou de propósito (rodar o script do autor no build é o oposto de
// um pré-voo seguro). Quando há Chrome, a Task 4 deste marco lê o registro de demos da página viva,
// não deste scanner (instrução já registrada para essa task) — este caminho aqui é só o substituto
// para quando não há Chrome. tests/unit/carregar.test.mjs fixa esse comportamento com um teste.
function apagarComentarios(texto, { apagarStrings = false } = {}) {
  let saida = '';
  let i = 0;
  while (i < texto.length) {
    const par = texto.slice(i, i + 2);
    if (par === '/*') {
      const fim = texto.indexOf('*/', i + 2);
      const ate = fim === -1 ? texto.length : fim + 2;
      saida += texto.slice(i, ate).replace(/[^\n]/g, ' ');
      i = ate;
    } else if (par === '//') {
      const fim = texto.indexOf('\n', i);
      const ate = fim === -1 ? texto.length : fim;
      saida += texto.slice(i, ate).replace(/[^\n]/g, ' ');
      i = ate;
    } else if (texto[i] === '"' || texto[i] === "'" || texto[i] === '`') {
      const aspas = texto[i];
      let j = i + 1;
      while (j < texto.length && texto[j] !== aspas) j += texto[j] === '\\' ? 2 : 1;
      j = Math.min(j + 1, texto.length);
      const trecho = texto.slice(i, j);
      saida += apagarStrings ? trecho.replace(/[^\n]/g, ' ') : trecho;
      i = j;
    } else {
      saida += texto[i];
      i += 1;
    }
  }
  return saida;
}

// O } que fecha o { em `indice`, contando profundidade — não "o próximo }\s*)", frágil: um });
// dentro de montar() (ex.: configurar({ opcao: 1 })) fecharia o casamento antes da hora. -1 quando
// não resolve (chave sem par até o fim do script); fimDeReserva decide o que fazer nesse caso.
function fimDoObjeto(texto, indice) {
  let profundidade = 0;
  for (let i = indice; i < texto.length; i += 1) {
    if (texto[i] === '{') profundidade += 1;
    else if (texto[i] === '}' && (profundidade -= 1) === 0) return i;
  }
  return -1;
}

// Quando o casamento de chaves não resolve, cai para a âncora do regex antigo (um } numa linha
// própria antes de um ")"); se nem essa âncora existe, o corpo vai até o fim do script. Um scanner
// inseguro não pode inventar um erro: qualquer uma das duas reservas é imprecisa (capturar() pode
// ficar de fora do corpo, ou sobrar código de outro registro dentro dele) mas nunca apaga o
// registro — apagar faria recursos.demo-sem-registro (erro) acusar uma demo que está registrada,
// pior que um recursos.demo-sem-estatico (aviso) errado.
function fimDeReserva(texto, indice) {
  const heuristica = FECHAMENTO_HEURISTICO.exec(texto.slice(indice));
  return heuristica ? indice + heuristica.index + heuristica[0].indexOf('}') : texto.length - 1;
}

export function demosDosScripts(doc) {
  const demos = new Map();
  for (const script of doc.querySelectorAll('script:not([src])')) {
    const bruto = script.textContent;
    const semComentarios = apagarComentarios(bruto);
    const paraChaves = apagarComentarios(bruto, { apagarStrings: true });
    for (const chamada of bruto.matchAll(CHAMADA)) {
      // A mesma posição, sem comentários, tem que ser o mesmo texto; se não é, a chamada caiu
      // dentro de um /* … */ ou // — comentada, portanto não é um registro de verdade.
      if (semComentarios.slice(chamada.index, chamada.index + chamada[0].length) !== chamada[0]) continue;
      const inicioDoObjeto = paraChaves.indexOf('{', chamada.index + chamada[0].length);
      if (inicioDoObjeto === -1) continue; // sem { depois da vírgula: registro incompleto, nada a fazer
      const fim = fimDoObjeto(paraChaves, inicioDoObjeto);
      const fimFinal = fim === -1 ? fimDeReserva(paraChaves, inicioDoObjeto) : fim;
      // paraChaves só decide ONDE termina o registro (índices batem nos dois textos, mesmo
      // tamanho); o que DEFINE_CAPTURAR lê vem de semComentarios, com as strings intactas — senão
      // ['capturar']() nunca seria achado, porque a própria palavra "capturar" estaria apagada.
      const corpo = semComentarios.slice(inicioDoObjeto, fimFinal + 1);
      demos.set(chamada[2], { capturar: DEFINE_CAPTURAR.test(corpo) });
    }
  }
  return demos;
}

export function imagensDoDisco(doc, pastaDaAula) {
  const imagens = new Map();
  for (const imagem of doc.querySelectorAll('img')) {
    const src = imagem.getAttribute('src') ?? '';
    // https:// sem diferenciar caixa, como recursos.imagem-externa e o padrão do contrato (a M4b já
    // corrigiu exatamente esse mesmo bug ali — HTTPS://... não pode voltar a parecer um caminho local).
    if (src.startsWith('data:') || src.toLowerCase().startsWith('https://')) continue;
    // "?v=2" no fim de um src local é busca de cache, não faz parte do caminho no disco (o padrão
    // de img.src no contrato permite consulta); o arquivo é o que vem antes do "?".
    const caminho = join(pastaDaAula, src.split('?')[0]);
    // existsSync sozinho diz "sim" para uma pasta; só um arquivo de verdade carregaria como imagem.
    imagens.set(src, existsSync(caminho) && statSync(caminho).isFile());
  }
  return imagens;
}

// Depende de doc.body já normalizado (build/validar.mjs conta com isso: o grupo estático, que roda
// antes, normaliza como efeito colateral — validador/validar.js:28). Sem normalizar, TeX partido
// pelo linkedom numa referência de caractere (&lt;, &amp;) some: textosComTex vê dois nós de texto
// onde o fonte tinha um só, e nenhum dos dois sozinho contém o \( ou \[ completo.
export function texInvalido(doc, katex) {
  const erros = [];
  for (const no of textosComTex(doc.body)) {
    for (const segmento of segmentosDeTex(no.data)) {
      if (segmento.tipo === 'texto') continue;
      try {
        // A mesma compilação do sistema (macros, trust, \passo): build e navegador não podem discordar.
        compilarTex(katex, segmento.tex, segmento.tipo);
      } catch (erro) {
        erros.push({ trecho: segmento.trecho, mensagem: erro.message, elemento: no.parentElement });
      }
    }
  }
  return erros;
}

// Análogo a imagensDoDisco, para o caminho de CSV de figure.grafico (spec 7.2: "dados": "data/….csv").
// Os caminhos vêm de caminhosDeCsv (componentes/csv.js), a mesma lista que o runtime busca por fetch
// no navegador e que monta, lá, o mesmo mapa (montar/entrada.js): caminho como o autor escreveu →
// o arquivo existe. JSON inválido ou `dados` que não é texto não entram — recursos.grafico
// (estática) é quem confere a FORMA do campo; este mapa só sabe se o arquivo aponta para algo que
// existe.
export function csvsDoDisco(doc, pastaDaAula) {
  return new Map(caminhosDeCsv(doc).map((dados) => {
    const caminho = join(pastaDaAula, dados.split('?')[0]);
    return [dados, existsSync(caminho) && statSync(caminho).isFile()];
  }));
}

// O Graphviz em WASM, uma instância por processo: o WASM compila uma vez, e a etapa 1
// (build/validar.mjs) e a etapa 3 (build/embutir.mjs) do mesmo `aula-usp build` a reusam. import()
// dinâmico, e não estático, pela regra de bin/: quem só lê uma aula sem diagrama não paga o carregamento.
let graphvizCarregado;
export function carregarGraphviz() {
  graphvizCarregado ??= import('@hpcc-js/wasm-graphviz').then(({ Graphviz }) => Graphviz.load());
  return graphvizCarregado;
}

// Os diagramas do fonte, compilados pelo Graphviz (spec 9.3: "KaTeX e Graphviz rodam no Node"), pela
// mesma função que o navegador usa (componentes/diagramas.js:compilarDiagramas) — erro com a
// mensagem do Graphviz para recursos.dot, contagem de nós para recursos.diagrama-grande. O Graphviz
// chega por parâmetro, já carregado: Graphviz.load() é assíncrono e esta função não é, e quem o
// carrega (build/validar.mjs) só paga os 819 kB do WASM quando a aula tem diagrama. Aula com
// diagrama e sem Graphviz é erro de quem chama, não uma aula sem achados: sem esta guarda, as duas
// regras ficariam mudas e o diagrama sairia vazio, calado.
export function diagramasDoFonte(doc, graphviz) {
  if (!doc.querySelector('figure.diagrama')) return [];
  if (!graphviz) throw new Error('carregarNoNode: a aula tem figure.diagrama e ninguém passou o Graphviz');
  return compilarDiagramas(doc.body, { desenhista: criarDesenhista({ graphviz }) });
}

export function carregarNoNode(doc, { pastaDaAula, katex, graphviz }) {
  return {
    diagramas: diagramasDoFonte(doc, graphviz),
    tex: texInvalido(doc, katex),
    imagens: imagensDoDisco(doc, pastaDaAula),
    demos: demosDosScripts(doc),
    csvs: csvsDoDisco(doc, pastaDaAula),
  };
}
