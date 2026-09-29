// Cola de Node do avaliador (spec 2026-09-28, 4.1 e 4.2): lê a aula do disco como `validar` lê,
// confere que ela não tem erro estático, roda os critérios medidos de avaliador/ e, com --fotos,
// fotografa cada slide no Chrome para a skill olhar. O avaliador em si não sabe de arquivos.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { lerERodarEstatica, lerAula, RAIZ_SISTEMA } from './validar.mjs';
import { avaliar, contarAvaliacao, indiceDoAlvo } from '../avaliador/avaliar.js';
import { contar, slidesDoFonte } from '../validador/validar.js';

// A foto tem o tamanho do palco (motor/motor.js: 1280 × 720), com escala 1: o motor escala o palco
// para caber na janela, e numa janela deste tamanho a escala é 1, pixel por pixel.
export const LARGURA_DA_FOTO = 1280;
export const ALTURA_DA_FOTO = 720;

// Teto de teclas por foto: uma aula válida tem no máximo algumas dezenas de passos por slide, e um
// laço que não chega nunca ao slide pedido é defeito do motor, não motivo para travar a CLI.
const TETO_DE_TECLAS = 2000;

export function lerRubrica(raizDoSistema = RAIZ_SISTEMA) {
  return JSON.parse(readFileSync(join(raizDoSistema, 'avaliador/rubrica.json'), 'utf8'));
}

// Avaliar é para aula válida (spec 4.1): com erro estático, devolve só a contagem de erros e não
// avalia nada. A leitura e o grupo estático são os de `validar` (lerERodarEstatica), para o veredito
// "tem erro" ser o mesmo nos dois comandos; a aula avaliada é lida de novo por lerAula, sem nada do
// que a validação fez com o documento.
export async function avaliarArquivo(alvo, { slide, minutos, raizDoSistema = RAIZ_SISTEMA } = {}) {
  const { caminho, contrato, achadosEstatica } = await lerERodarEstatica(alvo, { raizDoSistema });
  const { erros } = contar(achadosEstatica);
  if (erros > 0) return { caminho, contrato, erros, achados: null, resumo: null };
  const rubrica = lerRubrica(raizDoSistema);
  const achados = avaliar(lerAula(caminho, contrato), { rubrica, contrato, minutos, slide });
  return { caminho, contrato, erros: 0, achados, resumo: contarAvaliacao(achados, rubrica) };
}

const nomeDaFoto = (posicao, total, nome) => `slide-${String(posicao).padStart(Math.max(2, String(total).length), '0')}-${nome}.png`;

// Na página: o slide `indice` é o atual e todos os passos dele estão revelados? Os passos são os que
// o motor revela (motor/passos.js, gruposDePassos: `.area [data-passo]`).
const CHEGOU = (indice) => {
  const secao = document.querySelectorAll('section.slide')[indice];
  return Boolean(secao?.classList.contains('ativo'))
    && [...secao.querySelectorAll('.area [data-passo]')].every((elemento) => elemento.hasAttribute('data-revelado'));
};

// Uma foto por slide (ou só a do slide pedido), com o motor iniciado e os passos todos revelados.
// O caminho é o do autor na aula: a página aberta sem hash começa no primeiro slide, e cada seta para
// a direita revela um passo ou passa ao slide seguinte (motor/navegacao.js, avancar). `antesDaFoto`
// é gancho de teste: recebe a página e o item do índice logo antes de cada foto.
//
// Tudo o que falha aqui — Chrome ausente, montagem que não termina — é falha de ambiente para a CLI
// (saída 2): as fotos foram pedidas e não saíram.
export async function fotografar(caminho, pasta, { contrato, slide, antesDaFoto } = {}) {
  const [{ abrirChrome }, { criarServidor }] = await Promise.all([import('./composicao.mjs'), import('./servir.mjs')]);
  const fonte = slidesDoFonte(lerAula(caminho, contrato).body);
  const indice = fonte.map((secao, k) => {
    const id = secao.getAttribute('id') || null;
    const layout = secao.getAttribute('data-layout');
    return { slide: k + 1, id, layout, arquivo: nomeDaFoto(k + 1, fonte.length, id ?? layout ?? 'slide') };
  });
  const pedidos = slide === undefined || slide === null ? indice
    : [indice[indiceDoAlvo(fonte, slide)]].filter(Boolean);
  if (pedidos.length === 0) throw new Error(`não há slide "${slide}" nesta aula`);

  let navegador;
  try {
    navegador = await abrirChrome();
  } catch (erro) {
    throw new Error(`sem Chrome para as fotos: ${erro.message}`);
  }
  const servidor = criarServidor({ pastaAula: dirname(caminho) });
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));
  try {
    const pagina = await navegador.newPage({ viewport: { width: LARGURA_DA_FOTO, height: ALTURA_DA_FOTO }, deviceScaleFactor: 1 });
    await pagina.goto(`http://127.0.0.1:${servidor.address().port}/${basename(caminho)}`);
    await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
    const [estado, painel] = await pagina.evaluate(() => [document.body.dataset.montado, document.querySelector('pre.painel')?.textContent]);
    if (estado !== 'sim') throw new Error(painel ?? `a montagem terminou em "${estado}"`);
    await pagina.evaluate(() => document.fonts.ready);
    const montados = await pagina.evaluate(() => document.querySelectorAll('section.slide').length);
    if (montados !== fonte.length) throw new Error(`o fonte tem ${fonte.length} slides e a aula montada, ${montados}`);

    mkdirSync(pasta, { recursive: true });
    let teclas = 0;
    for (const item of pedidos) {
      while (!(await pagina.evaluate(CHEGOU, item.slide - 1))) {
        if (++teclas > TETO_DE_TECLAS) throw new Error(`o motor não chegou ao slide ${item.slide} depois de ${TETO_DE_TECLAS} teclas`);
        await pagina.keyboard.press('ArrowRight');
      }
      if (antesDaFoto) await antesDaFoto(pagina, item);
      await pagina.screenshot({ path: join(pasta, item.arquivo), type: 'png' });
    }
    writeFileSync(join(pasta, 'indice.json'), `${JSON.stringify(pedidos, null, 2)}\n`);
    return pedidos;
  } finally {
    await navegador.close();
    await new Promise((fim) => {
      servidor.closeAllConnections();
      servidor.close(fim);
    });
  }
}
