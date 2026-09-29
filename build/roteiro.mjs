// `aula-usp roteiro <arquivo.md> <pasta> [--substituir]` (spec 2026-09-28, 6.2; plano do gerar, D4 e
// D5): a cola de Node do roteiro. Lê o arquivo, tira a tag do runtime do modelo, confere que as figuras
// existem, e escreve a aula. O parser e o gerador são de montar/roteiro.js, do lado do navegador; a
// validação é a de `aula-usp validar`, que a CLI roda depois de escrever.
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerRoteiro, gerarAula } from '../montar/roteiro.js';

export const RAIZ_SISTEMA = fileURLToPath(new URL('..', import.meta.url));

// A tag do runtime com versão e integrity só existe escrita em modelos/aula/index.html, e é lá que
// `aula-usp pacotes` a fixa e que a guarda de pacotes a prende ao manifesto (plano do gerar, fato 1).
// O roteiro a copia de lá, byte a byte, em vez de montar uma segunda.
export function tagDoModelo(raiz = RAIZ_SISTEMA) {
  const modelo = readFileSync(join(raiz, 'modelos/aula/index.html'), 'utf8');
  const tag = /<script src="[^"]*aula-usp\.js"[^>]*><\/script>/.exec(modelo)?.[0];
  if (!tag) throw new Error('modelos/aula/index.html não traz a tag do runtime (<script src="…aula-usp.js">)');
  return tag;
}

function ehArquivo(caminho) {
  try {
    return statSync(caminho).isFile();
  } catch {
    return false;
  }
}

// Converte o roteiro sem escrever nada. As figuras voltam com o caminho absoluto da origem; uma figura
// que não existe é erro de roteiro, com a linha (D4).
export function converterRoteiro(caminhoDoRoteiro, { raiz = RAIZ_SISTEMA } = {}) {
  const texto = readFileSync(caminhoDoRoteiro, 'utf8');
  const contrato = JSON.parse(readFileSync(join(raiz, 'contrato/contrato.json'), 'utf8'));
  const gerado = gerarAula(lerRoteiro(texto), { contrato, tagDoRuntime: tagDoModelo(raiz) });
  const base = dirname(resolve(caminhoDoRoteiro));
  const figuras = gerado.figuras.map((figura) => ({ ...figura, caminho: join(base, figura.origem) }));
  const ausentes = figuras.filter((figura) => !ehArquivo(figura.caminho))
    .map(({ linha, origem }) => ({ linha, mensagem: `a figura "${origem}" não existe ao lado do roteiro` }));
  const erros = [...gerado.erros, ...ausentes].map((erro, k) => ({ erro, k }))
    .sort((a, b) => a.erro.linha - b.erro.linha || a.k - b.k).map(({ erro }) => erro);
  const slides = (gerado.html?.match(/<section /g) ?? []).length;
  return { html: erros.length ? null : gerado.html, figuras, erros, slides };
}

// Escreve <pasta>/index.html e copia as figuras para <pasta>/img/. Uma figura que já está no destino (o
// roteiro escrito dentro da própria pasta da aula) não é copiada sobre si mesma.
export function escreverAula(pasta, { html, figuras }) {
  mkdirSync(pasta, { recursive: true });
  if (figuras.length) mkdirSync(join(pasta, 'img'), { recursive: true });
  for (const { caminho, destino } of figuras) {
    const alvo = resolve(pasta, destino);
    if (alvo !== resolve(caminho)) copyFileSync(caminho, alvo);
  }
  writeFileSync(join(pasta, 'index.html'), html);
}
