// O empacotador é o dono de dist/. Este teste roda o empacotamento de verdade (é rápido: ~2 s) e
// afirma a FORMA do resultado, não o conteúdo — tamanho de bundle muda a cada atualização de
// dependência, e um teste que afirme bytes exatos vira ruído que todo mundo aprende a ignorar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empacotar } from '../../build/bundle.mjs';

const RAIZ = new URL('../../', import.meta.url);

test('empacotar produz os quatro scripts da spec 3.5 e uma gramática por linguagem do contrato', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  for (const nome of ['aula-usp.js', 'aula-usp-motor.js', 'aula-usp-tex.js', 'aula-usp-codigo.js']) {
    assert.ok(arquivos.has(nome), `faltou ${nome}`);
    assert.ok(arquivos.get(nome).bytes > 1000, `${nome} saiu vazio demais`);
  }
  const { linguagens } = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));
  for (const linguagem of linguagens) {
    assert.ok(arquivos.has(`aula-usp-lang-${linguagem}.js`), `faltou a gramática de ${linguagem}`);
  }
});

test('todo arquivo do manifesto tem integrity sha384 válido', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  for (const [nome, { integrity }] of arquivos) {
    // sha384 são 48 bytes; em base64 dão exatamente 64 caracteres, SEM preenchimento `=`. Medido.
    assert.match(integrity, /^sha384-[A-Za-z0-9+/]{64}$/, `${nome}: integrity fora do formato SRI`);
  }
});

// Esta asserção mede uma coisa mais estreita do que o nome do teste sugere: só que não sobrou
// import/export de topo no artefato. Isso sozinho já vale a pena guardar — se sobrasse, a tag
// precisaria de type="module" (spec 3.3/8.1), e sem isso o navegador rejeita o <script> inteiro
// como erro de sintaxe. Mas NÃO guarda o comportamento da fila de AulaUSP.demo: medido por mutação,
// com Chrome, que trocar format: 'iife' por 'esm' aqui dá saída observável idêntica (a única
// diferença são os 11 bytes do invólucro do iife) — não sobra import/export de topo de qualquer
// jeito, e import() dinâmico é legal em script clássico. Quem guarda o comportamento da fila é
// 'a demo registrada durante o parsing sobrevive ao pacote do dist', em tests/integracao/dist.test.mjs.
test('aula-usp.js é script clássico: nada de import/export no topo', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  const texto = arquivos.get('aula-usp.js').texto;
  assert.equal(/^\s*(import|export)\b/m.test(texto), false, 'aula-usp.js saiu como módulo');
});

test('a CSS do KaTeX não está em aula-usp.js — ela mora no satélite de matemática', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  // Não basta checar a substring ".katex": estilos/componentes.css tem três regras legítimas e
  // pequenas que estilizam a saída do KaTeX dentro do sistema (spec 4.3, de antes deste marco), e
  // validador/regras/composicao.js usa ".katex, .katex-display" como seletor em três pontos —
  // nenhum dos dois é o bloco de 361 kB que esta tarefa move para o satélite; ambos ficam (corretamente)
  // em aula-usp.js e fariam este teste falhar sempre. KaTeX_Main é o nome de família que a folha de
  // verdade declara (nos 20 @font-face) e que não existe em mais nenhum CSS ou JS deste pacote —
  // medido, grep confirma zero ocorrências fora de node_modules/katex.
  assert.equal(arquivos.get('aula-usp.js').texto.includes('KaTeX_Main'), false,
    'a CSS do KaTeX voltou para o pacote principal: 361 kB que uma aula sem matemática não usa');
  assert.ok(arquivos.get('aula-usp-tex.js').texto.includes('KaTeX_Main'));
});

test('o satélite de matemática não deixa nenhuma url(fonts/...) para buscar', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  const texto = arquivos.get('aula-usp-tex.js').texto;
  assert.equal(/url\(fonts\//.test(texto), false, 'sobrou referência a arquivo de fonte: daria 404');
  assert.ok(texto.includes('data:font/woff2;base64,'), 'as fontes do KaTeX não foram embutidas');
});
