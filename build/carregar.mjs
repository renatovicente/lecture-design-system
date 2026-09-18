// Carrega, no Node, o que o grupo de carga precisa saber (spec 9.3, etapa 1): KaTeX compila o TeX do
// fonte, o disco responde pelas imagens, e os registros de demo são procurados no texto dos scripts.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compilarTex, segmentosDeTex, textosComTex } from '../componentes/tex.js';

// AulaUSP.demo('nome', { … }) — o nome mora numa string, então o passo 1 (achar a chamada e ler o
// nome) roda sobre o texto original. Aspas simples ou duplas; o nome no padrão de data-demo do
// contrato (minúsculas, dígitos e hífen).
const CHAMADA = /AulaUSP\.demo\(\s*(['"])([a-z][a-z0-9-]*)\1\s*,/g;

// capturar(...) ou capturar: ..., uma definição — não uma menção qualquer, como num comentário.
const DEFINE_CAPTURAR = /\bcapturar\s*[:(]/;

// Apaga comentários (/* … */ e // …) trocando cada caractere, menos a quebra de linha, por um
// espaço: o texto sai do mesmo tamanho, então todo índice de `bruto` continua valendo na cópia —
// dá para comparar o mesmo trecho dos dois textos e saber se ele caiu dentro de um comentário. As
// strings não são tocadas (ficam com aspas e conteúdo originais): é onde mora o nome da demo, e é
// por isso que o laço pula por cima delas inteiras de uma vez — um "//" dentro de uma string (uma
// URL como 'http://…', que aparece de verdade num capturar() do sistema) não é comentário nenhum.
function apagarComentarios(texto) {
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
      saida += texto.slice(i, j);
      i = j;
    } else {
      saida += texto[i];
      i += 1;
    }
  }
  return saida;
}

// O } que fecha o { em `indice`, contando profundidade — não "o próximo }\s*)", frágil: um });
// dentro de montar() (ex.: configurar({ opcao: 1 })) fecharia o casamento antes da hora.
function fimDoObjeto(texto, indice) {
  let profundidade = 0;
  for (let i = indice; i < texto.length; i += 1) {
    if (texto[i] === '{') profundidade += 1;
    else if (texto[i] === '}' && (profundidade -= 1) === 0) return i;
  }
  return -1;
}

export function demosDosScripts(doc) {
  const demos = new Map();
  for (const script of doc.querySelectorAll('script:not([src])')) {
    const bruto = script.textContent;
    const semComentarios = apagarComentarios(bruto);
    for (const chamada of bruto.matchAll(CHAMADA)) {
      // A mesma posição, sem comentários, tem que ser o mesmo texto; se não é, a chamada caiu
      // dentro de um /* … */ ou // — comentada, portanto não é um registro de verdade.
      if (semComentarios.slice(chamada.index, chamada.index + chamada[0].length) !== chamada[0]) continue;
      const inicioDoObjeto = semComentarios.indexOf('{', chamada.index + chamada[0].length);
      if (inicioDoObjeto === -1) continue; // sem { depois da vírgula: registro incompleto
      const fim = fimDoObjeto(semComentarios, inicioDoObjeto);
      if (fim === -1) continue; // chave sem par: não dá para saber onde o registro termina
      const corpo = semComentarios.slice(inicioDoObjeto, fim + 1);
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

export function carregarNoNode(doc, { pastaDaAula, katex }) {
  return { tex: texInvalido(doc, katex), imagens: imagensDoDisco(doc, pastaDaAula), demos: demosDosScripts(doc) };
}
