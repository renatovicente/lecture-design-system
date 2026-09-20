// Integração (spec 11.2), não unitário: este arquivo abre Chrome de verdade no before(). Ele nasceu
// em tests/unit/, e ali derrubava o `npm test` inteiro numa máquina sem Chrome — medido antes da
// mudança: CHROME_PATH apontando para um caminho inexistente dava 0 passam, 7 falham, porque o
// before() estoura e leva o arquivo junto. A spec 8.1 diz o contrário ("falta de Chrome não é
// falha") e a 11.1/11.2 separa unitário de integração justamente por isto. `npm run test:integracao`
// já o pega, e o ritmo de Chrome dele não mudou.
//
// Comando `aula-usp build` (spec 3.3): a tarefa de orquestração não acrescenta capacidade — tudo o
// que ela chama já existe e já foi testado por conta própria (construir, medirComposicao, gerarPdf,
// saida.pdf-paginas). O que ela decide são as TRANSIÇÕES, e a spec 3.3 define quatro finais
// diferentes; o valor deste arquivo está em cada um deles ser exercitado, não em o caminho feliz
// funcionar. Em particular, "sem Chrome" e "erro de composição" gravam a MESMA lista de arquivos —
// só o código de saída e o aviso os distinguem — e os dois têm teste próprio abaixo que afirma os
// dois, não só a lista.
//
// Um Chrome só, aberto uma vez para o arquivo inteiro (before/after) e reaproveitado nos testes que
// realmente precisam gerar PDF: gerar PDF é lento, e o watchdog deste projeto é de 600 s por
// comando — a mesma razão de tests/integracao/pdf.test.mjs. medirComposicao (etapa 5) abre e fecha
// o Chrome dela mesma, sempre (build/composicao.mjs, de antes deste marco, não aceita um navegador
// de fora); só a etapa 6 (gerarPdf) aceita reaproveitamento, e é isso que o parâmetro `navegador` de
// build() (não documentado como parte pública da interface — comentário em build/build.mjs) permite
// aqui: um Chrome a menos por teste, não um a mais.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { iniciarChrome } from './utilitarios.mjs';
import { build } from '../../build/build.mjs';
import { paginasEsperadas } from '../../motor/impressao.js';

const RAIZ = new URL('../../', import.meta.url);
const pastaTemporaria = () => mkdtemp(join(tmpdir(), 'build-'));
// A fixture é um ARQUIVO (`<nome>/aula.html`), não uma pasta — e desde a correção do I7 (revisão
// final do 5c) é o nome do ARQUIVO que dá o `<slug>` nessa forma de alvo, não o da pasta. Por isso
// os artefatos abaixo se chamam `aula.html`/`aula.pdf` em todos os casos, e não `<nome da pasta>.*`
// como antes: o alvo-arquivo deixou de herdar o nome da pasta, que era o que fazia dois decks lado a
// lado se sobrescreverem (tests/integracao/slug.test.mjs). A forma da spec (`aula-usp build <pasta>`,
// com index.html dentro) continua nomeando pela pasta, e quem a exercita é tests/unit/validar-cli.test.mjs.
const fixture = (nome) => new URL(`../fixtures/build/${nome}/aula.html`, import.meta.url);

let navegador;
before(async () => {
  console.error('build.test.mjs: abrindo o Chrome (uma vez para o arquivo inteiro)');
  navegador = await iniciarChrome(); // a mesma abertura de todos os arquivos desta pasta (utilitarios.mjs).
});
after(async () => {
  await navegador?.close();
});

test('final 1 — erro estático na etapa 1: grava só validacao.json, sem HTML, e sai 1', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('erro-estatico'), destino });
  assert.equal(r.codigo, 1);
  assert.deepEqual((await readdir(destino)).sort(), ['validacao.json']);
  assert.ok(r.achados.some((a) => a.regra === 'estrutura.metadados'), JSON.stringify(r.achados));
  assert.equal(r.avisoSemChrome, undefined);
  assert.equal(r.paginas, undefined);
  // M8 da revisão final: este é o único final em que o validacao.json é o ÚNICO artefato entregue —
  // e era o único que não o lia, conferindo só a lista de arquivos. O que o autor abre quando o
  // build sai 1 na etapa 1 é este arquivo; se ele discordar de r.achados, o que a CLI imprime e o
  // que fica no disco contam histórias diferentes.
  const validacao = JSON.parse(await readFile(join(destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(validacao, r.achados);
});

test('final 2 — erro de composição na etapa 5: grava HTML e validacao.json, sem PDF, e sai 1', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('erro-composicao'), destino, navegador });
  assert.equal(r.codigo, 1);
  assert.deepEqual((await readdir(destino)).sort(), ['aula.html', 'validacao.json']);
  // Lista exata (item 2 da rodada de correção 1: array ordenado, não .some()/Set — comentário no
  // teste "final 3"): os avisos de estática desta fixture (as mesmas duas condições de aula-limpa)
  // sobrevivem ao lado do erro de composição, e é só ESTE erro — não duplica nada.
  assert.deepEqual(r.achados.map((a) => a.regra).sort(),
    ['estrutura.blocos', 'estrutura.notas-ausentes', 'composicao.transbordo'].sort());
  // Distingue este final do final 4 (mesma lista de arquivos, código igual a 1 aqui e 0 lá): aqui
  // NÃO há aviso de Chrome ausente — o Chrome rodou, e foi ELE quem achou o erro.
  assert.equal(r.avisoSemChrome, undefined);
  assert.equal(r.paginas, undefined, 'não deveria ter chegado a gerar PDF');
  const validacao = JSON.parse(await readFile(join(destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(validacao, r.achados);
});

test('final 3 — erro de saída na etapa 7: mantém HTML e PDF gravados, e sai 1', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('erro-saida'), destino, navegador });
  assert.equal(r.codigo, 1);
  assert.deepEqual((await readdir(destino)).sort(), ['aula.html', 'aula.pdf', 'validacao.json'].sort());
  // A referência externa é achada por construir() (etapas 2-4), não pela etapa 7 — e mesmo assim o
  // build precisa terminar as etapas 5 e 6 (composição limpa, PDF gerado) antes de decidir o código
  // final: as quatro regras de saída são concatenadas num só veredito, na etapa 7 (comentário de
  // SO_PDF_PAGINAS em build/build.mjs).
  //
  // Rodada de correção 1: a lista EXATA, em vez de .some()/Set (que absorvem duplicata) — o revisor
  // trocou SO_PDF_PAGINAS por REGRAS_DE_SAIDA em build.mjs e o teste anterior (só .some()) continuou
  // verde, porque rodar o grupo inteiro na etapa 7 duplica saida.referencia-externa (já achada por
  // construir()) em vez de mudar o código de saída. Um array ordenado, comparado por igualdade
  // estrita, pega a duplicata que um Set ou um .some() deixariam passar; verificado por inversão
  // (relatório da tarefa, rodada 1): com REGRAS_DE_SAIDA, esta asserção falha listando o nome duas
  // vezes; com SO_PDF_PAGINAS, de volta à lista de baixo.
  const regras = r.achados.map((a) => a.regra).sort();
  assert.deepEqual(regras, ['estrutura.blocos', 'estrutura.notas-ausentes', 'recursos.imagem-externa', 'saida.referencia-externa'].sort());
  // saida.pdf-paginas RODOU (não se calou por falta de contexto) e não acusou nada: o único defeito
  // desta fixture é a referência externa, não a contagem de páginas — prova de que a etapa 7 recebeu
  // números de verdade. (A prova de que ela SABE acusar um número errado é o teste seguinte.)
  assert.equal(typeof r.paginas, 'number');
  assert.ok(r.paginas > 0);
});

test('a etapa 7 liga saida.pdf-paginas de verdade: um gerarPdf com contagem errada faz build() sair 1', async () => {
  // Rodada de correção 1, item 1 (Important): a tarefa tinha só prova unitária (tarefa 2, números
  // sintéticos direto na regra) e prova negativa (o teste "final 3" e o "caminho feliz", onde os
  // números batem) de que saida.pdf-paginas está LIGADA dentro de build(). Nenhuma prova positiva de
  // que um número ERRADO de verdade, saindo de gerarPdf, de fato derruba o build — a mesma classe de
  // defeito do marco 5a: uma regra pode ficar muda por nunca ter sido ligada, e sem este teste
  // "ligada e concordando" fica indistinguível de "nunca ligada". gerarPdf injetável (mesma costura
  // de navegador, comentário em build/build.mjs) resolve isso sem gastar Chrome a mais: o falso nem
  // precisa do navegador que recebe.
  const destino = await pastaTemporaria();
  const gerarPdfComContagemErrada = async () => ({ bytes: Buffer.from('não é um pdf de verdade'), paginas: 999 });
  const r = await build({
    raiz: RAIZ, caminhoDaAula: fixture('aula-limpa'), destino, navegador, gerarPdf: gerarPdfComContagemErrada,
  });
  assert.equal(r.codigo, 1);
  assert.equal(r.paginas, 999);
  const daRegra = r.achados.filter((a) => a.regra === 'saida.pdf-paginas');
  assert.equal(daRegra.length, 1, JSON.stringify(r.achados));
  assert.match(daRegra[0].mensagem, /999/);
  // O arquivo é o mesmo que a função devolveu — mantido, como o final "erro de saída" pede.
  assert.deepEqual((await readdir(destino)).sort(), ['aula.html', 'aula.pdf', 'validacao.json'].sort());
  const validacao = JSON.parse(await readFile(join(destino, 'validacao.json'), 'utf8'));
  assert.deepEqual(validacao, r.achados);
});

test('final 4 — sem Chrome: grava HTML (não o PDF), avisa, e sai 0 se não houver erro', async () => {
  const destino = await pastaTemporaria();
  const anterior = process.env.CHROME_PATH;
  process.env.CHROME_PATH = '/caminho/que/nao/existe/de-verdade';
  let r;
  try {
    r = await build({ raiz: RAIZ, caminhoDaAula: fixture('aula-limpa'), destino });
  } finally {
    if (anterior === undefined) delete process.env.CHROME_PATH;
    else process.env.CHROME_PATH = anterior;
  }
  assert.equal(r.codigo, 0);
  // Mesma lista de arquivos do final 2 (acima) — só o código e o aviso diferem, e os dois são
  // afirmados aqui: é exatamente o par que um teste frouxo, que só olhasse a lista, não distinguiria.
  assert.deepEqual((await readdir(destino)).sort(), ['aula.html', 'validacao.json']);
  assert.match(r.avisoSemChrome, /composição pulada, sem Chrome/);
  assert.equal(r.paginas, undefined);
  assert.equal(r.achados.filter((a) => a.severidade === 'erro').length, 0);
  // Regressão: a primeira versão de build() atribuía achados = achadosDoConstruir depois da etapa
  // 2-4, em vez de concatenar — o que descartava os achados da etapa 1 (estática+carga) inteiros
  // sempre que não havia erro ali. aula-limpa tem exatamente dois avisos de estática
  // (estrutura.blocos: só 1 abertura; estrutura.notas-ausentes: o slide de conteúdo não tem notas) —
  // sem a correção, esta asserção falha com [] em vez dos dois. Achado rodando os seis decks do
  // espécime pela CLI de verdade (não previsto no brief): nenhum teste dos quatro finais, sozinho,
  // pegava isto, porque nenhum deles afirmava a lista COMPLETA de achados no caso de sucesso.
  //
  // Array ordenado, não Set: rodada de correção 1 do item 2 trocou toda comparação de lista de
  // achados por igualdade estrita de array (Set absorve duplicata, e é exatamente o que o revisor
  // achou escondido no teste "final 3" — comentário lá).
  assert.deepEqual(r.achados.map((a) => a.regra).sort(), ['estrutura.blocos', 'estrutura.notas-ausentes'].sort());
});

test('caminho feliz: grava HTML, PDF e validacao.json, e sai 0', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('aula-limpa'), destino, navegador });
  assert.equal(r.codigo, 0);
  assert.deepEqual((await readdir(destino)).sort(), ['aula.html', 'aula.pdf', 'validacao.json'].sort());
  assert.equal(r.avisoSemChrome, undefined);
  // O PDF de verdade tem o número de páginas que paginasEsperadas prevê a partir do MESMO HTML que
  // foi gravado — a mesma prova de wiring que o final 3 faz, desta vez no caso em que os dois
  // números batem (fato 4 do plano: "a regra é uma comparação, não uma heurística").
  const html = await readFile(join(destino, 'aula.html'), 'utf8');
  const esperadas = paginasEsperadas(parseHTML(html).document);
  assert.equal(r.paginas, esperadas);
  // Mesma regressão do final 4 (comentário lá) e mesmo aperto do item 2 (lista exata, não Set): os
  // dois avisos de estática de aula-limpa sobrevivem até o fim, sem erro nenhum e sem
  // saida.pdf-paginas (os números batem) — a lista exata já garante os dois, sem precisar de
  // asserções soltas por cima.
  assert.deepEqual(r.achados.map((a) => a.regra).sort(), ['estrutura.blocos', 'estrutura.notas-ausentes'].sort());
});

test('--sem-pdf: pula as etapas 6 e 7, grava HTML e validacao.json, e sai 0', async () => {
  const destino = await pastaTemporaria();
  const r = await build({ raiz: RAIZ, caminhoDaAula: fixture('aula-limpa'), destino, navegador, semPdf: true });
  assert.equal(r.codigo, 0);
  assert.deepEqual((await readdir(destino)).sort(), ['aula.html', 'validacao.json']);
  assert.equal(r.paginas, undefined);
});
