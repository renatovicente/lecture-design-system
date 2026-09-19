// Composição pelo Chrome (spec 9.3, etapa 5): sobe o servidor, abre a aula com todos os slides
// dispostos e roda o grupo dentro da página, que é o único lugar onde geometria e cor existem.
// Sem Chrome, devolve null: a spec 8.1 diz que falta de Chrome é aviso, não falha.
import { basename, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { criarServidor } from './servir.mjs';

// Roda dentro da página: importa o validador pelo caminho que o servidor de desenvolvimento publica,
// e lê a fila de demos do mesmo jeito que montar/entrada.js faz no passo 6 — antes que
// instalarDemos a esvazie, o que aqui nunca acontece: ?folha nunca chama iniciarMotor. Aqui essa
// fila é fato, não a inferência de texto de build/carregar.mjs; é o que a Task 4 promove a
// recursos.demos quando há Chrome (instrução do controlador, não da spec 9.3 original).
const NA_PAGINA = async (contrato) => {
  const { validar } = await import('/_aula-usp/validador/validar.js');
  const { regras } = await import('/_aula-usp/validador/regras/composicao.js');
  const achados = validar(document, { contrato, regras, grupo: 'composicao', janela: window });
  // Entradas, não Map: o retorno de page.evaluate atravessa serialização, e um array de pares
  // [nome, definicao] chega intacto onde um Map poderia não chegar. medirComposicao remonta o Map.
  const demos = (window.AulaUSP?.filaDeDemos ?? [])
    .map(({ nome, definicao }) => [nome, { capturar: typeof definicao.capturar === 'function' }]);
  return { achados, demos };
};

function abrirChrome() {
  const opcoes = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' };
  return chromium.launch(opcoes);
}

export async function medirComposicao(caminhoDaAula, { contrato }) {
  let navegador;
  try {
    navegador = await abrirChrome();
  } catch (erro) {
    return { achados: null, demos: null, motivo: erro.message };
  }
  const servidor = criarServidor({ pastaAula: dirname(caminhoDaAula) });
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
    // ?folha dispõe todos os slides e não inicia o motor: é o estado em que a composição se mede.
    await pagina.goto(`http://127.0.0.1:${servidor.address().port}/${basename(caminhoDaAula)}?folha`);
    await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
    const estado = await pagina.evaluate(() => document.body.dataset.montado);
    if (estado !== 'sim') throw new Error(`a montagem terminou em "${estado}"`);
    await pagina.evaluate(() => document.fonts.ready);
    const { achados, demos } = await pagina.evaluate(NA_PAGINA, contrato);
    return { achados, demos: new Map(demos), motivo: null };
  } finally {
    await navegador.close();
    await new Promise((fim) => {
      servidor.closeAllConnections();
      servidor.close(fim);
    });
  }
}
