// Baixa do Google Fonts, uma vez, os woff2 (latin e latin-ext) e as licenças OFL
// de Geist, Geist Mono e Open Sans para assets/fontes/, com um manifesto.
//   node build/fontes.mjs        (só com autorização do autor para os downloads)
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export const SUBCONJUNTOS = ['latin', 'latin-ext'];
export const FAMILIAS = [
  { familia: 'Geist', slug: 'geist', consulta: 'Geist:ital,wght@0,400;0,600;1,400',
    licenca: 'https://raw.githubusercontent.com/google/fonts/main/ofl/geist/OFL.txt' },
  { familia: 'Geist Mono', slug: 'geist-mono', consulta: 'Geist+Mono:wght@400;600;700',
    licenca: 'https://raw.githubusercontent.com/google/fonts/main/ofl/geistmono/OFL.txt' },
  { familia: 'Open Sans', slug: 'open-sans', consulta: 'Open+Sans:wght@600',
    licenca: 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OFL.txt' },
];

export function extrairFaces(css) {
  const faces = [];
  for (const [, subconjunto, corpo] of css.matchAll(/\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const campo = (nome) => new RegExp(`${nome}:\\s*([^;]+);`).exec(corpo)?.[1].trim();
    faces.push({
      subconjunto,
      familia: campo('font-family').replace(/['"]/g, ''),
      estilo: campo('font-style'),
      peso: Number(campo('font-weight')),
      url: /url\((https:[^)]+\.woff2)\)/.exec(corpo)?.[1],
      unicodeRange: campo('unicode-range'),
    });
  }
  return faces;
}

export function agruparPorArquivo(faces, slug) {
  const porUrl = new Map();
  for (const f of faces) {
    if (!SUBCONJUNTOS.includes(f.subconjunto)) continue;
    if (!porUrl.has(f.url)) porUrl.set(f.url, { familia: f.familia, estilo: f.estilo, pesos: [], subconjunto: f.subconjunto, unicodeRange: f.unicodeRange, url: f.url });
    const item = porUrl.get(f.url);
    if (!item.pesos.includes(f.peso)) item.pesos.push(f.peso);
  }
  const itens = [...porUrl.values()].map((i) => ({ ...i, pesos: i.pesos.sort((a, b) => a - b) }));
  const base = (i) => `${slug}-${i.estilo === 'italic' ? 'italico' : 'normal'}-${i.subconjunto}`;
  const contagem = new Map();
  for (const i of itens) contagem.set(base(i), (contagem.get(base(i)) ?? 0) + 1);
  for (const i of itens) i.arquivo = contagem.get(base(i)) > 1 ? `${base(i)}-${i.pesos.join('-')}.woff2` : `${base(i)}.woff2`;
  return itens.sort((a, b) => (a.arquivo < b.arquivo ? -1 : a.arquivo > b.arquivo ? 1 : 0));
}

async function baixar(url) {
  const resposta = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return Buffer.from(await resposta.arrayBuffer());
}

async function principal() {
  const destino = resolve(RAIZ, 'assets/fontes');
  await mkdir(resolve(destino, 'licencas'), { recursive: true });
  const manifesto = [];
  for (const familia of FAMILIAS) {
    const css = (await baixar(`https://fonts.googleapis.com/css2?family=${familia.consulta}&display=swap`)).toString('utf8');
    for (const arq of agruparPorArquivo(extrairFaces(css), familia.slug)) {
      const bytes = await baixar(arq.url);
      if (bytes.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error(`não é woff2: ${arq.url}`);
      await writeFile(resolve(destino, arq.arquivo), bytes);
      manifesto.push({
        familia: arq.familia, estilo: arq.estilo, pesos: arq.pesos, subconjunto: arq.subconjunto,
        unicodeRange: arq.unicodeRange, arquivo: arq.arquivo, bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'), origem: arq.url,
      });
    }
    const licenca = (await baixar(familia.licenca)).toString('utf8');
    if (!/SIL OPEN FONT LICENSE/i.test(licenca)) throw new Error(`licença inesperada em ${familia.licenca}`);
    await writeFile(resolve(destino, 'licencas', `${familia.slug}-OFL.txt`), licenca);
  }
  await writeFile(resolve(destino, 'fontes.json'), JSON.stringify(manifesto, null, 2) + '\n');
  for (const m of manifesto) console.log(`${m.arquivo} · ${m.bytes} bytes · pesos ${m.pesos.join('/')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
