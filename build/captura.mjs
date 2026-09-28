// Captura automática das demos (spec 7.2 e 3.3, etapa 5; em todo build): "para demos sem img.estatico e sem
// capturar(), o Chrome headless fotografa a div.demo depois de iniciar() e de data-captura-ms (padrão
// 3000 ms)". Node puro: fala com a página só pelo Chrome, nunca importando código dela.
//
// ONDE a foto é tirada — no <slug>.html que a etapa 4 gravou, e não no fonte que a composição mede.
// A composição (build/composicao.mjs) abre o fonte com ?folha, em que o motor NÃO inicia (é o estado
// em que todo slide tem tamanho): ali nenhuma demo foi montada nem iniciada, e fotografar exigiria
// chamar montar() e iniciar() à mão — um segundo lugar mexendo em demo, que é justamente o que
// motor/demos.js existe para ser o único. No HTML construído, quem monta e inicia é o próprio motor,
// ao navegar até o slide, exatamente como na sala; e é esse mesmo arquivo que a etapa 6 imprime.
// A imagem volta para ele como img.estatico, e motor/impressao.js já sabe o que fazer com uma.
//
// O QUE é fotografado é o complemento exato do que recursos.demo-sem-estatico acusa: demoSemImagem
// (validador/regras/carga.js) é a mesma função nos dois lados. Esse é o contrato entre a captura e a
// regra — a regra só se cala no build porque a captura cobre o caso, e só pode se calar porque a
// captura, quando não cobre, diz (falhas, abaixo) e a regra volta a acusar com o motivo.
import { pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import { demoSemImagem } from '../validador/regras/carga.js';
import { rotulosPara } from '../motor/rotulos.js';

// Spec 7.2: "depois de iniciar() e de data-captura-ms (padrão 3000 ms)".
export const CAPTURA_MS_PADRAO = 3000;

// Quanto se espera o slide da demo ficar ativo depois de trocar o endereço. Não é da spec: é o teto
// de uma espera que, num arquivo local, dura milissegundos — só existe para que um motor que não
// navega vire uma falha com nome, e não os 30 s mudos do Playwright.
const TETO_DA_NAVEGACAO_MS = 10000;

// O mesmo seletor nos três documentos (fonte, página e HTML construído): a posição de uma demo nesta
// lista é o que liga as três pontas, porque montar() não soma, tira nem reordena div.demo.
const SELETOR = 'section div.demo[data-demo]';

// As demos que o build fotografa, no fonte: registradas (sem registro é recursos.demo-sem-registro,
// erro, e o build nem chega aqui), sem img.estatico e sem capturar(). `elemento` é o do fonte — é por
// ele que a falha volta a recursos.demo-sem-estatico, que roda sobre o fonte.
export function alvosDeCaptura(doc, { demos }) {
  return [...doc.querySelectorAll(SELETOR)].flatMap((elemento, indice) => {
    const nome = elemento.getAttribute('data-demo');
    const registro = demos?.get(nome);
    if (!registro || !demoSemImagem(elemento, registro)) return [];
    const texto = elemento.getAttribute('data-captura-ms');
    const ms = texto !== null && /^[0-9]+$/.test(texto) ? Number(texto) : CAPTURA_MS_PADRAO;
    return [{ indice, nome, ms, elemento }];
  });
}

// Roda na página. Devolve o id do slide da demo, ou o motivo de não haver o que fotografar.
const PREPARAR = ({ seletor, indice, nome }) => {
  const demo = document.querySelectorAll(seletor)[indice];
  if (!demo || demo.getAttribute('data-demo') !== nome) return { motivo: 'a página construída não tem esta demo no lugar esperado' };
  if (!window.AulaUSP?.demos?.has(nome)) return { motivo: 'a demo não está registrada na página construída (AulaUSP.demo não rodou)' };
  const slide = demo.closest('section.slide');
  if (!slide?.id) return { motivo: 'o slide da demo não tem id para navegar até ele' };
  return { id: slide.id };
};

// Roda na página: a imagem é toda de uma cor só? Decodifica a própria PNG num canvas — a página é
// quem sabe ler PNG sem dependência nenhuma no Node.
const UMA_COR_SO = async (uri) => {
  const imagem = new Image();
  imagem.src = uri;
  await imagem.decode();
  const tela = document.createElement('canvas');
  tela.width = imagem.naturalWidth;
  tela.height = imagem.naturalHeight;
  const contexto = tela.getContext('2d');
  contexto.drawImage(imagem, 0, 0);
  const { data } = contexto.getImageData(0, 0, tela.width, tela.height);
  for (let k = 4; k < data.length; k += 4) {
    if (data[k] !== data[0] || data[k + 1] !== data[1] || data[k + 2] !== data[2] || data[k + 3] !== data[3]) return false;
  }
  return true;
};

// Abre o HTML construído, navega até cada demo-alvo, espera e fotografa a div.demo. Nunca lança por
// causa de uma demo: cada uma sai em `imagens` (índice → URI data:) ou em `falhas` (índice → motivo),
// e quem chama decide o que dizer. Lança só se a página inteira não sobe.
//
// UMA PÁGINA POR DEMO. Com uma página só para todas, o que uma demo deixa vivo — um setTimeout
// disparado no iniciar(), um requestAnimationFrame sem parar() — continua rodando quando o motor sai
// do slide dela, e o erro que ele lança cai na espera da demo SEGUINTE e é atribuído a ela. Medido
// (revisão final da 2c): a demo "ruidosa" lança 400 ms depois de iniciar() e espera 100 ms; a "boa",
// limpa, espera 1000 ms — com uma página, a ruidosa saía fotografada e a boa recusada com o erro da
// outra. Página nova por demo: o que uma deixa vivo morre com a página dela. Custa abrir e montar o
// HTML de novo a cada demo (~0,8 s, medido); é o preço de o motivo de uma falha ser da demo certa.
// O slide inicial é a capa, que não admite demo: na página nova, nenhuma demo roda antes da alvo.
export async function capturarDemos({ navegador, caminhoDoHtml, alvos }) {
  const imagens = new Map();
  const falhas = new Map();
  for (const { indice, nome, ms } of alvos) {
    const falha = await capturarUma({ navegador, caminhoDoHtml, indice, nome, ms, imagens });
    if (falha) falhas.set(indice, falha);
  }
  return { imagens, falhas };
}

// Uma demo, na sua própria página. Devolve o motivo da falha, ou nada (e a foto em `imagens`).
async function capturarUma({ navegador, caminhoDoHtml, indice, nome, ms, imagens }) {
  // 1280 × 720 com escala 1 no palco: a div.demo sai no tamanho em que o PDF a desenha. Fator 2 de
  // pixel: a mesma nitidez que o texto vetorial do PDF tem ao lado dela, num projetor ou impressa.
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const erros = [];
  pagina.on('console', (mensagem) => { if (mensagem.type() === 'error') erros.push(mensagem.text()); });
  pagina.on('pageerror', (erro) => erros.push(erro.message));
  try {
    await pagina.goto(pathToFileURL(caminhoDoHtml).href);
    await pagina.waitForFunction(() => document.body?.dataset.montado !== undefined);
    const estado = await pagina.evaluate(() => document.body.dataset.montado);
    if (estado !== 'sim') throw new Error(`a montagem terminou em "${estado}"`);
    await pagina.evaluate(() => document.fonts.ready);
    try {
      const preparo = await pagina.evaluate(PREPARAR, { seletor: SELETOR, indice, nome });
      if (preparo.motivo) return preparo.motivo;
      erros.length = 0;
      // Com todos os passos revelados (lerEndereco limita o número ao que o slide tem): uma demo
      // que é passo sairia invisível na foto.
      await pagina.evaluate((id) => { location.hash = `#${id}/9999`; }, preparo.id);
      await pagina.waitForFunction((id) => document.getElementById(id)?.classList.contains('ativo'), preparo.id, { timeout: TETO_DA_NAVEGACAO_MS });
      await pagina.waitForTimeout(ms);
      // motor/demos.js não deixa o erro de uma demo derrubar a aula: ele vai para o console com o
      // nome dela e a etapa. Aqui ele vira falha — foto de uma demo quebrada não é a demo.
      const doErro = erros.find((texto) => texto.includes(`"${nome}"`) || !texto.startsWith('Aula USP:'));
      if (doErro) return `erro na página ao montar e iniciar: ${doErro.split('\n')[0]}`;
      const alvo = pagina.locator(SELETOR).nth(indice);
      const caixa = await alvo.boundingBox();
      if (!caixa || caixa.width < 1 || caixa.height < 1) return 'a div.demo não tem tamanho na página (0 × 0 px)';
      const uri = `data:image/png;base64,${(await alvo.screenshot({ type: 'png' })).toString('base64')}`;
      if (await pagina.evaluate(UMA_COR_SO, uri)) return `a demo não desenhou nada na div.demo em ${ms} ms (a foto é de uma cor só)`;
      imagens.set(indice, uri);
      return undefined;
    } catch (erro) {
      return erro.message.split('\n')[0];
    }
  } finally {
    await pagina.close();
  }
}

// Põe cada foto no HTML construído como img.estatico, primeiro filho da sua div.demo — o lugar que
// motor/impressao.js (`:scope > img.estatico`) e estilos/impressao.css (`.demo > img.estatico`)
// procuram. O alt é o texto que o PDF mostraria no lugar da demo, no idioma da aula (spec 6.8).
// Sem imagem nenhuma, devolve o HTML intocado, byte a byte.
export function embutirCapturas(html, imagens) {
  if (imagens.size === 0) return html;
  const { document } = parseHTML(html);
  const alt = rotulosPara(document.documentElement.getAttribute('lang') ?? undefined).demoInterativa;
  const demos = [...document.querySelectorAll(SELETOR)];
  for (const [indice, uri] of imagens) {
    const imagem = document.createElement('img');
    imagem.setAttribute('class', 'estatico');
    imagem.setAttribute('alt', alt);
    imagem.setAttribute('src', uri);
    demos[indice].prepend(imagem);
  }
  return `<!DOCTYPE html>\n${document.documentElement.outerHTML}\n`;
}
