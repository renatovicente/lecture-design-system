// Carrega, no Node, o que o grupo de carga precisa saber (spec 9.3, etapa 1): KaTeX compila o TeX do
// fonte, o disco responde pelas imagens, e os registros de demo são procurados no texto dos scripts.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { segmentosDeTex, textosComTex } from '../componentes/tex.js';

// AulaUSP.demo('nome', { … }) — o registro que o modo build lê sem executar script nenhum.
const REGISTRO = /AulaUSP\.demo\(\s*['"]([a-z][a-z0-9-]*)['"]\s*,([\s\S]*?)\n\s*\}\s*\)/g;

// \passo é a única macro do contrato (contrato.tex.macros, espelhada em componentes/tex.js): sem
// ensiná-la aqui, o KaTeX vê \passo{1}{…} como comando desconhecido e este módulo acusaria TeX
// legítimo como inválido (medido em especime/matematica.html, que usa \passo dentro de \[ \]).
const MACROS = { '\\passo': '\\htmlData{passo=#1}{#2}' };

export function demosDosScripts(doc) {
  const demos = new Map();
  for (const script of doc.querySelectorAll('script:not([src])')) {
    for (const [, nome, corpo] of script.textContent.matchAll(REGISTRO)) {
      demos.set(nome, { capturar: /\bcapturar\s*\(/.test(corpo) });
    }
  }
  return demos;
}

export function imagensDoDisco(doc, pastaDaAula) {
  const imagens = new Map();
  for (const imagem of doc.querySelectorAll('img')) {
    const src = imagem.getAttribute('src') ?? '';
    if (src.startsWith('data:') || src.startsWith('https://')) continue;
    imagens.set(src, existsSync(join(pastaDaAula, src)));
  }
  return imagens;
}

export function texInvalido(doc, katex) {
  const erros = [];
  for (const no of textosComTex(doc.body)) {
    for (const segmento of segmentosDeTex(no.data)) {
      if (segmento.tipo === 'texto') continue;
      try {
        katex.renderToString(segmento.tex, { displayMode: segmento.tipo === 'destaque', throwOnError: true, strict: 'ignore', macros: MACROS });
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
