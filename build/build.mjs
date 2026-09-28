// Comando `aula-usp build` (spec 3.3, as sete etapas, e códigos de saída da spec 8.1): orquestra
// peças que os marcos 5b e 5c já construíram e já testaram cada uma por conta própria — construir()
// (montar, pré-renderizar, embutir), medirComposicao() (composição no Chrome) e gerarPdf() (o PDF).
// O que esta função decide são as TRANSIÇÕES entre elas — os quatro finais diferentes que a spec 3.3
// define — não os cálculos: nenhum achado nasce aqui, todos vêm de validar() ou das próprias etapas.
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { validar, contar } from '../validador/validar.js';
import { REGRAS_DE_SAIDA, REGRAS_DE_CARGA } from '../validador/regras/index.js';
import { paginasEsperadas } from '../motor/impressao.js';
import { lerERodarEstatica, validarCarga } from './validar.mjs';
import { construir } from './construir.mjs';
import { medirComposicao, abrirChrome } from './composicao.mjs';
import { gerarPdf as gerarPdfPadrao } from './pdf.mjs';
import { alvosDeCaptura, capturarDemos, embutirCapturas } from './captura.mjs';

// Quem roda quais das quatro regras de saída (spec 9.2), e por quê — decisão do controlador do
// plano (ledger da tarefa 3, "ruling 1"), registrada aqui porque sem a razão a divisão parece
// descuido e alguém reunifica de boa-fé. As quatro regras do grupo "saida" não têm um sujeito só:
// referencia-externa, tamanho e glifo-ausente falam do HTML final; pdf-paginas fala do PDF.
// construir() (marco 5b), na etapa 2-4 abaixo, já roda as três do HTML — é ele quem produz esse
// artefato, então é ele quem tem os dados (bytes, cobertura) para validá-lo. Rodar as quatro de novo
// aqui, na etapa 7, duplicaria aqueles três achados; e na hora de construir() não existe PDF nenhum
// — pdf-paginas se calaria ali de qualquer forma (a regra mesma decide isso: sem paginasDoPdf no
// contexto, ela não acusa nada — validador/regras/saida.js). Separar por artefato dá um dono por
// pergunta: a etapa 7 fica só com a única pergunta que ela tem condição de responder.
const SO_PDF_PAGINAS = REGRAS_DE_SAIDA.filter((regra) => regra.nome === 'saida.pdf-paginas');
// A captura (etapa 5, fase 2) regrava o <slug>.html com as fotos dentro, depois de construir() já ter
// medido o tamanho dele: saida.tamanho é a única das três regras do HTML que a foto pode mudar (a
// imagem entra como data:, então não há referência externa nova, e o alt é texto do sistema).
const SO_TAMANHO = REGRAS_DE_SAIDA.filter((regra) => regra.nome === 'saida.tamanho');

// A segunda passada de recursos.demo-sem-estatico, depois da etapa 5: na fase 2 a regra se cala no
// build porque a captura cobre as demos sem imagem própria (validador/regras/carga.js), e é aqui que
// ela volta a acusar cada demo que a captura NÃO cobriu, com o motivo. Só esta regra: as outras de
// carga já rodaram na etapa 1, e rodá-las de novo duplicaria os achados delas.
const SO_DEMO_SEM_ESTATICO = REGRAS_DE_CARGA.filter((regra) => regra.nome === 'recursos.demo-sem-estatico');
function achadosDeCaptura({ docDaFonte, contrato, recursos, fase, alvos, falhas }) {
  const falhasDeCaptura = new Map(alvos.filter(({ indice }) => falhas.has(indice)).map(({ indice, elemento }) => [elemento, falhas.get(indice)]));
  if (falhasDeCaptura.size === 0) return [];
  return validar(docDaFonte, { contrato, regras: SO_DEMO_SEM_ESTATICO, grupo: 'carga', recursos, fase, modo: 'build', falhasDeCaptura });
}

const nomesDe = (alvos) => alvos.map(({ nome }) => `"${nome}"`).join(', ');

function gravarValidacao(destino, achados) {
  return writeFile(join(destino, 'validacao.json'), `${JSON.stringify(achados, null, 2)}\n`, 'utf8');
}

// Spec 8.4: "pdf-lib grava título (do <title>), autor (professor), assunto (disciplina) e idioma."
// Lidos do próprio fonte (doc já normalizado pela etapa 1) — construir() preserva os quatro sem
// tocá-los, então lê-los antes ou depois de construir() dá o mesmo valor; antes é o que já temos.
function metadadosDaAula(doc) {
  return {
    titulo: doc.querySelector('title')?.textContent.trim() || undefined,
    autor: doc.querySelector('meta[name="professor"]')?.getAttribute('content')?.trim() || undefined,
    assunto: doc.querySelector('meta[name="disciplina"]')?.getAttribute('content')?.trim() || undefined,
    idioma: doc.documentElement.getAttribute('lang') || undefined,
  };
}

// navegador e gerarPdf: a mesma costura que o marco 5b já usa três vezes (construirHtml recebe
// embutirFontes; montar/entrada.js recebe resolver e estilo) — o que varia entre produção e teste
// vira valor passado pelo chamador, com um padrão que é a peça de verdade. Nenhum dos dois é parte
// documentada da interface pública de build() (a spec 8.1 só conhece raiz/caminhoDaAula/destino/
// semPdf); omitidos, o comportamento é exatamente o da spec:
// - navegador: só para tests/unit/build.test.mjs reaproveitar UM Chrome entre várias chamadas de
//   build() no mesmo arquivo (o ritmo que build/pdf.mjs pede, "uma abertura por build, não uma por
//   deck"). Passado, build() usa o que recebeu e não fecha — de quem abriu é a responsabilidade.
// - gerarPdf: sem ele, a ligação de saida.pdf-paginas dentro de build() só tinha prova unitária
//   (tarefa 2, números sintéticos) e prova negativa (números reais que batem, nesta função) — nunca
//   uma prova de que um NÚMERO ERRADO de verdade, saindo de gerarPdf, de fato acusa. Rodada de
//   correção 1: um gerarPdf de mentira, devolvendo paginas errado, prova a ligação sem gerar PDF de
//   verdade nem gastar Chrome a mais — a mesma classe de defeito do marco 5a (regra muda por nunca
//   ter sido ligada, indistinguível de "ligada e concordando" sem este teste).
export async function build({ raiz, caminhoDaAula, destino, semPdf = false, navegador: navegadorExterno, gerarPdf = gerarPdfPadrao } = {}) {
  const progresso = (mensagem) => console.error(`aula-usp build: ${mensagem}`);
  await mkdir(destino, { recursive: true });
  const raizDoSistema = fileURLToPath(raiz);
  const caminhoDaFonte = fileURLToPath(caminhoDaAula);

  // Etapa 1 (spec 3.3): "analisa o HTML e roda as regras estáticas e as de carga que não precisam de
  // navegador; com erros, grava só validacao.json e termina com código 1." build/validar.mjs expõe os
  // dois pedaços (lerERodarEstatica, validarCarga) sem a composição que validarArquivo roda por
  // cima para o comando `aula-usp validar` — aqui a composição é a etapa 5, mais adiante (comentário
  // lá embaixo sobre por que ela também roda sobre o fonte, não o HTML construído), e chamar
  // validarArquivo abriria (e descartaria) um Chrome à toa antes mesmo de saber se a estática passa.
  progresso('etapa 1/7 — validando estática e carga (sem navegador)');
  const { contrato, doc: docDaFonte, recursos, achadosEstatica, fase } = await lerERodarEstatica(caminhoDaFonte, { raizDoSistema });
  const achadosDeCarga = validarCarga(docDaFonte, { contrato, recursos, fase });
  const achadosIniciais = [...achadosEstatica, ...achadosDeCarga];
  if (contar(achadosIniciais).erros > 0) {
    // Primeiro final: "com erros, grava só validacao.json e termina com código 1" — nunca chega a
    // montar, então <slug>.html nunca existe.
    progresso('etapa 1/7 — erro; parando antes de montar');
    await gravarValidacao(destino, achadosIniciais);
    return { codigo: 1, achados: achadosIniciais };
  }

  // Etapas 2 a 4 (spec 3.3): monta, pré-renderiza matemática e código, troca a tag do runtime e
  // embute tudo. construir() (marco 5b) faz as três e já grava <slug>.html e um validacao.json
  // preliminar — mas só com OS achados dele (o canal de erro de TeX/código, mais as três regras de
  // saída do HTML final: referencia-externa, tamanho, glifo-ausente — ver SO_PDF_PAGINAS acima), sem
  // saber dos achadosIniciais da etapa 1. `achados` acumula a partir daqui — nunca substitui: um
  // aviso de estrutura.blocos ou estrutura.id-ausente (por exemplo) tem de sobreviver até o
  // validacao.json final, mesmo quando não há erro nenhum para interromper o pipeline. (Achado ao
  // rodar os seis decks do espécime, não previsto pelo brief: a primeira versão desta função fazia
  // `achados = achadosDoConstruir`, uma atribuição que descartava achadosIniciais inteiro sempre que
  // a etapa 1 não tinha ERRO — muitos-blocos.html saía "0 erros, 0 avisos" em vez dos dois avisos que
  // `aula-usp validar` já sabia achar. Nenhum teste unitário pegou isso: os quatro finais afirmavam
  // código de saída e lista de ARQUIVOS, nunca a lista completa de achados quando havia aviso e
  // sucesso ao mesmo tempo.)
  progresso('etapa 2-4/7 — montando, pré-renderizando e embutindo');
  const { html: htmlConstruido, achados: achadosDoConstruir, caminhoDoHtml } = await construir({ raiz, caminhoDaAula, destino });
  let html = htmlConstruido;
  let achados = [...achadosIniciais, ...achadosDoConstruir];
  // I3 da revisão final: construir() acabou de gravar um validacao.json com só OS achados dele, e a
  // lista completa só era gravada nos finais, três etapas adiante — entre um e outro havia uma
  // janela em que qualquer estouro das etapas 5, 6 ou 7 deixava o PARCIAL no disco. Para uma aula
  // cujos achados vêm todos da etapa 1, parcial quer dizer `[]`: o arquivo que o autor abre depois
  // de um build que falhou dizia "0 erros, 0 avisos" (medido, sobre a fixture aula-limpa, que tem
  // dois avisos). Uma escrita a mais aqui fecha a janela; as dos finais continuam, porque a lista
  // ainda cresce nas etapas 5 e 7.
  await gravarValidacao(destino, achados);

  // Etapa 5 (spec 3.3): "abre o resultado no Chrome headless e roda as regras de composição" — sobre
  // o FONTE, não o <slug>.html que a etapa 4 gravou. Medido ao implementar (não estava no brief, e a
  // primeira versão desta função passava caminhoDoHtml — errado, relatado): ?folha, o modo que
  // dispõe todos os slides para medir composição, só existe em montar/entrada.js, o bootstrap de
  // DESENVOLVIMENTO — e "monta" nunca embarca no runtime embutido (spec 3.5: aula-usp-motor.js é "só
  // interação"). Passar o HTML construído faz a página subir normalmente, ignorar ?folha em
  // silêncio, e medirComposicao devolve achados: [] sempre — um falso "sem erro" (medido: a fixture
  // de transbordo deste próprio arquivo de teste passava limpo). O fonte, servido por
  // criarServidor com o runtime de desenvolvimento (o mesmo caminho que `aula-usp validar` já usa),
  // é o único lugar onde ?folha funciona. Isto só é a composição do artefato final enquanto o runtime
  // de desenvolvimento desenhar TUDO o que construir() pré-renderizou: o fato 8 do plano da tarefa 1
  // provou os dois modos pixel a pixel iguais para matemática e código, e a revisão final da fase 2a
  // mediu 0 pixel de diferença para o gráfico do espécime (tests/integracao/visual.test.mjs). O que um lado desenha e o outro não fica de fora da medição
  // sem aviso nenhum — foi assim com o gráfico de `dados` em CSV, que só construir() lia: numa coluna
  // 4-4-4, build saía com 0 erros e o SVG construído tinha texto a 8 px no palco. Por isso o runtime
  // lê o CSV com o mesmo módulo (componentes/csv.js, relativo ao documento da aula, que aqui é servido
  // por criarServidor junto com os arquivos da aula). Um desenho novo em construir() — o diagrama da
  // fase 2b — precisa entrar em montar/entrada.js do mesmo jeito, ou esta etapa não o vê. Sem Chrome,
  // medirComposicao já degrada sozinha (build/composicao.mjs): spec 8.1, falta de Chrome não é falha — o quarto final
  // (aviso, código 0 se não houver erro) sai por aqui, pulando as etapas 5 e 6.
  progresso('etapa 5/7 — abrindo o Chrome e medindo composição');
  const { achados: achadosDeComposicao, motivo: semChrome } = await medirComposicao(caminhoDaFonte, { contrato });
  // As demos que a etapa 5 vai fotografar (build/captura.mjs): só na fase 2 (spec 6.7: "na fase 2, o
  // build passa a capturar a imagem sozinho"), e só as que não trazem imagem própria. A fase é a
  // mesma que a etapa 1 decidiu para esta aula (validador/validar.js:faseDaAula).
  const alvos = fase >= 2 ? alvosDeCaptura(docDaFonte, recursos) : [];
  if (achadosDeComposicao === null) {
    // Plano da 2c, tarefa 3, passo 3: sem Chrome a captura some junto com a etapa 5, e o aviso diz
    // quais demos ficam sem imagem — "sem Chrome" sozinho não conta isso ao autor.
    const semCaptura = alvos.length > 0 ? `; sem a captura, ficam sem imagem para impressão as demos ${nomesDe(alvos)}` : '';
    const avisoSemChrome = `composição pulada, sem Chrome: ${semChrome}${semCaptura}`;
    progresso(`etapa 5/7 — aviso: ${avisoSemChrome}; pulando as etapas 5 e 6`);
    const semFoto = new Map(alvos.map(({ indice }) => [indice, 'sem Chrome, a etapa 5 não rodou']));
    achados = [...achados, ...achadosDeCaptura({ docDaFonte, contrato, recursos, fase, alvos, falhas: semFoto })];
    await gravarValidacao(destino, achados);
    return { codigo: contar(achados).erros > 0 ? 1 : 0, achados, avisoSemChrome };
  }
  achados = [...achados, ...achadosDeComposicao];
  if (contar(achadosDeComposicao).erros > 0) {
    // Segundo final: "com erros de composição na etapa 5, o build grava <slug>.html e
    // validacao.json, não gera PDF e termina com código 1." O <slug>.html já está no disco (etapa
    // 2-4); só falta regravar validacao.json com o achado novo, e nunca chamar gerarPdf.
    progresso('etapa 5/7 — erro de composição; não gera PDF');
    await gravarValidacao(destino, achados);
    return { codigo: 1, achados };
  }
  progresso('etapa 5/7 — composição sem erro');

  // Um Chrome para a captura e o PDF, aberto quando o primeiro dos dois precisa dele. A composição,
  // logo acima, já fechou o dela (build/composicao.mjs sempre fecha o que abre) — e mede o FONTE,
  // enquanto a captura e o PDF abrem o HTML construído; o mesmo navegador serve às duas últimas.
  // Quando o teste passa um navegador próprio (parâmetro não documentado, comentário acima da
  // função), ele não é fechado aqui — de quem abriu é a responsabilidade de fechar.
  let navegador = navegadorExterno ?? null;
  const chrome = async () => (navegador ??= await abrirChrome());
  let paginas;
  try {
    // Etapa 5, segunda metade (spec 3.3: "na fase 2, também captura a imagem estática das demos que
    // não têm imagem própria"). Uma demo que não sai na foto nunca é silêncio: cada falha sai aqui,
    // com o nome da demo e o motivo, e a demo fica como estava — sem imagem, com o quadro "Demo
    // interativa" no PDF (motor/impressao.js).
    if (alvos.length > 0) {
      progresso(`etapa 5/7 — capturando ${alvos.length === 1 ? 'a demo' : `as ${alvos.length} demos`} sem imagem própria: ${nomesDe(alvos)}`);
      const inicio = performance.now();
      const { imagens, falhas } = await capturarDemos({ navegador: await chrome(), caminhoDoHtml, alvos });
      for (const { indice, nome } of alvos) {
        if (falhas.has(indice)) progresso(`etapa 5/7 — aviso: a demo "${nome}" não foi capturada: ${falhas.get(indice)}`);
      }
      achados = [...achados, ...achadosDeCaptura({ docDaFonte, contrato, recursos, fase, alvos, falhas })];
      if (imagens.size > 0) {
        html = embutirCapturas(html, imagens);
        await writeFile(caminhoDoHtml, html, 'utf8');
        achados = [
          ...achados.filter((achado) => achado.regra !== 'saida.tamanho'),
          ...validar(docDaFonte, { contrato, regras: SO_TAMANHO, grupo: 'saida', bytes: Buffer.byteLength(html) }),
        ];
      }
      await gravarValidacao(destino, achados);
      progresso(`etapa 5/7 — ${imagens.size} de ${alvos.length} demo(s) capturada(s) em ${((performance.now() - inicio) / 1000).toFixed(1)} s`);
    }

    if (semPdf) {
      // --sem-pdf (spec 8.1): o autor pediu para pular o PDF. Não é um dos quatro finais da spec 3.3
      // (esses são sobre ERROS e sobre a ausência do Chrome, não sobre uma escolha do autor), mas o
      // formato de saída é o mesmo do final "sem Chrome" — html e validacao.json, sem regravar nada
      // que dependa do PDF — pela mesma razão: sem PDF, saida.pdf-paginas não tem o que comparar.
      // A captura acima roda mesmo assim: ela é da etapa 5, e a foto serve também a quem imprime o
      // HTML pelo navegador.
      progresso('--sem-pdf — pulando as etapas 6 e 7');
      await gravarValidacao(destino, achados);
      return { codigo: contar(achados).erros > 0 ? 1 : 0, achados };
    }

    // Etapa 6 (spec 3.3 e 8.4): chama AulaUSP.prepararImpressao() na página e gera o PDF, do
    // <slug>.html — já com as fotos da captura dentro, quando houve alguma.
    progresso('etapa 6/7 — gerando o PDF');
    const gerado = await gerarPdf({ caminhoDoHtml, navegador: await chrome(), metadados: metadadosDaAula(docDaFonte) });
    paginas = gerado.paginas;
    // M4 da revisão final: o nome do PDF vem do HTML que construir() acabou de gravar, não de uma
    // segunda cópia do cálculo de `<slug>` (que era o que havia aqui, idêntica à de construir.mjs —
    // e as duas tinham de mudar juntas na correção do I7 para não divergirem).
    await writeFile(join(destino, `${basename(caminhoDoHtml, '.html')}.pdf`), gerado.bytes);
  } finally {
    if (navegador && !navegadorExterno) await navegador.close();
  }
  progresso(`etapa 6/7 — PDF gerado, ${paginas} página(s)`);

  // Etapa 7 (spec 3.3): roda SÓ saida.pdf-paginas — a única das quatro regras de saída que fala do
  // PDF (comentário de SO_PDF_PAGINAS acima) — e concatena o achado dela com o que já tinha.
  // paginasEsperadas (motor/impressao.js, desde o marco 2) é o oráculo: recalculado aqui sobre o
  // MESMO html que construir() gravou e que gerarPdf abriu — nunca sobre o fonte, que ainda não tem
  // as cópias de estado que data-pdf="passos" produz. Terceiro final possível a partir daqui: se
  // sobrar erro — desta regra OU de qualquer uma das três que construir() já rodou — os arquivos já
  // gravados (HTML, PDF) permanecem, e só validacao.json é regravado com a lista completa.
  progresso('etapa 7/7 — validando o número de páginas do PDF');
  const { document: docFinal } = parseHTML(html);
  const esperadas = paginasEsperadas(docFinal);
  const achadosDeSaidaPdf = validar(docFinal, {
    contrato, regras: SO_PDF_PAGINAS, grupo: 'saida', paginasDoPdf: paginas, paginasEsperadas: esperadas,
  });
  achados = [...achados, ...achadosDeSaidaPdf];
  await gravarValidacao(destino, achados);
  const codigo = contar(achados).erros > 0 ? 1 : 0;
  progresso(`concluído — código ${codigo}`);
  return { codigo, achados, paginas };
}
