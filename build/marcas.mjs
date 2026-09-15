// Baixa os logos oficiais para assets/marcas/ e converte o logo USP de PDF para SVG,
// enquadrando o viewBox no desenho sem tocar nos traços.
//   node build/marcas.mjs        (só com autorização do autor para os downloads)
import { writeFile, readFile, mkdir, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARCAS = resolve(RAIZ, 'assets/marcas');

export const ORIGENS = [
  { tipo: 'pdf', destino: 'origem/usp-logo.pdf',
    url: 'https://scs.usp.br/identidadevisual/wp-content/uploads/2022/08/usp-logo-pdf.pdf' },
  { tipo: 'svg', destino: 'ime-usp-horizontal-preta.svg',
    url: 'https://www.ime.usp.br/media/identidade_visual/imagens/IME+USP/Preta/SVG/Horizontal_preta.svg' },
  { tipo: 'png', destino: 'ifusp-vertical-preto.png',
    url: 'https://portal.if.usp.br/imprensa/sites/portal.if.usp.br.ifusp/files/logo_IFUSP_2025_VERT_preto.png' },
];

export function assinaturaConfere(tipo, bytes) {
  if (tipo === 'pdf') return bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  if (tipo === 'png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (tipo === 'svg') return /<svg[\s>]/.test(bytes.subarray(0, 2048).toString('utf8'));
  throw new Error(`tipo desconhecido: ${tipo}`);
}

export function dimensoesPng(bytes) {
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) };
}

// PGM binário (P5) de 8 bits, como o gerado por `pdftoppm -gray`
export function lerPgm(bytes) {
  const cabecalho = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(bytes.subarray(0, 64).toString('latin1'));
  if (!cabecalho || cabecalho[3] !== '255') throw new Error('PGM P5 de 8 bits esperado');
  const [inteiro, largura, altura] = [cabecalho[0], Number(cabecalho[1]), Number(cabecalho[2])];
  return { largura, altura, pixels: new Uint8Array(bytes.subarray(inteiro.length, inteiro.length + largura * altura)) };
}

export function caixaEscura({ largura, altura, pixels }, limiar = 128) {
  let x0 = largura, y0 = altura, x1 = -1, y1 = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (pixels[y * largura + x] < limiar) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('nenhum pixel escuro na imagem');
  return { x: x0, y: y0, largura: x1 - x0 + 1, altura: y1 - y0 + 1 };
}

export function enquadrarSvg(texto, { x, y, largura, altura }) {
  return texto.replace(/<svg\b[^>]*>/, (raizSvg) => raizSvg
    .replace(/\swidth="[^"]*"/, ` width="${largura}pt"`)
    .replace(/\sheight="[^"]*"/, ` height="${altura}pt"`)
    .replace(/\sviewBox="[^"]*"/, ` viewBox="${x} ${y} ${largura} ${altura}"`));
}

const NOMES = { black: '#000000', white: '#FFFFFF', none: 'none' };

function normalizarCor(valor) {
  const v = valor.trim().toLowerCase();
  if (v in NOMES) return NOMES[v];
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return `#${[...m[1]].map((c) => c + c).join('')}`.toUpperCase();
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return `#${m[1]}`.toUpperCase();
  m = /^rgb\(\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*\)$/.exec(v);
  if (m) {
    const canal = (n, pct) => Math.round(pct ? (Number(n) * 255) / 100 : Number(n));
    return `#${[canal(m[1], m[2]), canal(m[3], m[4]), canal(m[5], m[6])].map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  return null; // url(#…), currentColor e outros ficam de fora
}

export function coresSvg(texto) {
  const cores = new Set();
  for (const [, valor] of texto.matchAll(/\b(?:fill|stroke)\s*[:=]\s*"?([^";>]+)/g)) {
    const cor = normalizarCor(valor.replace(/"$/, ''));
    if (cor) cores.add(cor);
  }
  return [...cores].sort();
}

export function ehEscura(hex) {
  return [1, 3, 5].every((i) => parseInt(hex.slice(i, i + 2), 16) <= 0x40);
}

async function baixar(url) {
  const resposta = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return Buffer.from(await resposta.arrayBuffer());
}

async function principal() {
  await mkdir(resolve(MARCAS, 'origem'), { recursive: true });
  for (const origem of ORIGENS) {
    const bytes = await baixar(origem.url);
    if (!assinaturaConfere(origem.tipo, bytes)) throw new Error(`conteúdo inesperado em ${origem.url}`);
    await writeFile(resolve(MARCAS, origem.destino), bytes);
    console.log(`${origem.destino} · ${bytes.length} bytes`);
  }
  const temporaria = await mkdtemp(join(tmpdir(), 'aula-usp-marcas-'));
  const pdf = resolve(MARCAS, 'origem/usp-logo.pdf');
  execFileSync('pdftoppm', ['-gray', '-r', '72', '-singlefile', pdf, join(temporaria, 'usp')]);
  const caixa = caixaEscura(lerPgm(await readFile(join(temporaria, 'usp.pgm'))));
  execFileSync('pdftocairo', ['-svg', pdf, join(temporaria, 'usp.svg')]);
  const svg = enquadrarSvg(await readFile(join(temporaria, 'usp.svg'), 'utf8'), caixa);
  await writeFile(resolve(MARCAS, 'usp-preto.svg'), svg);
  console.log(`usp-preto.svg · viewBox ${caixa.x} ${caixa.y} ${caixa.largura} ${caixa.altura} (pt)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
