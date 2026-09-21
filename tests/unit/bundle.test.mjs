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

// M1 da revisão final do 5a (adiado da tarefa 2): o satélite de matemática tinha esta guarda (teste
// acima) e o pacote principal não, apesar do mesmo plugin (pluginFontesDoSistemaEmbutidas) embutir as
// 8 fontes do sistema nele. Espelha o teste acima.
test('aula-usp.js não deixa nenhuma url(...) de fonte do sistema para buscar', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  const texto = arquivos.get('aula-usp.js').texto;
  assert.equal(/url\(['"]?\.\.\/assets\/fontes\//.test(texto), false, 'sobrou referência a arquivo de fonte: daria 404');
  assert.equal([...texto.matchAll(/data:font\/woff2;base64,/g)].length, 8, 'esperava as 8 fontes do sistema como data URI');
});

// C1 da revisão final do 5a, Critical: a spec 3.2 proíbe qualquer recurso que não seja script, e
// contrato.json, as duas JSON de marcas, a cobertura e as marcas em si buscavam por fetch/<img src>.
// tests/integracao/dist.test.mjs prova a CONSEQUÊNCIA (nenhum pedido de rede sobra) num Chrome de
// verdade; esta aqui é a guarda rápida de que o CONTEÚDO está mesmo dentro do artefato, sem precisar
// de navegador.
test('aula-usp.js embute o contrato, as marcas e as duas JSON de unidades/USP — spec 3.2', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  const texto = arquivos.get('aula-usp.js').texto;
  // Marcadores por VALOR, não por chave: uma chave de objeto (ex.: "classesDoSistema") sobrevive à
  // minificação mesmo quando só é usada como acesso de propriedade em código, sem nenhum dado do JSON
  // embutido — não prova nada. Prefixo ASCII de cada valor (o minificador escapa acento como \xE9 e
  // faria estes marcadores falharem se tivessem á/ç/ã literais).
  assert.ok(texto.includes('Contrato de HTML do Aula USP (spec 5.2 a 5.6 e 9.2).'), 'contrato.json não parece estar embutido');
  assert.ok(texto.includes('alturaMinima'), 'unidades.json não parece estar embutido');
  assert.ok(texto.includes('Universidade de S'), 'usp.json não parece estar embutido');
  assert.ok(texto.includes('geist-mono-normal-latin.woff2'), 'validador/cobertura.json não parece estar embutido');
  assert.ok(texto.includes('data:image/svg+xml,'), 'os SVG de marca não saíram como data URI');
  assert.ok(texto.includes('data:image/png;base64,'), 'o PNG de marca (IFUSP) não saiu como data URI');
  assert.equal(/['"]assets\/marcas\/[\w.-]+\.(?:svg|png)['"]/.test(texto), false,
    'sobrou um caminho de arquivo de marca: alguma marca voltou a ser buscada por URL');
});

// I1 da revisão final do 5a, Important: o que estava empacotado era motor/motor.js sozinho — só
// navegação e passos. A spec 3.3 etapa 4 pede também notas, visão geral, apresentador e impressão; a
// 8.4 chama AulaUSP.prepararImpressao() na página. Mede por nome, como o revisor mediu o defeito
// ("prepararImpressao aparece 0 vez no artefato") — se alguém voltar a apontar o entryPoint para
// motor/motor.js sozinho, os quatro últimos nomes somem e o teste falha.
test('aula-usp-motor.js expõe as capacidades de interação que a spec 3.3 nomeia', async () => {
  const arquivos = await empacotar({ raiz: RAIZ, escrever: false });
  const texto = arquivos.get('aula-usp-motor.js').texto;
  for (const nome of ['iniciarMotor', 'instalarPaineis', 'instalarApresentador', 'instalarDemos', 'instalarImpressao', 'prepararImpressao']) {
    assert.ok(texto.includes(nome), `faltou "${nome}" no artefato — aula-usp-motor.js voltou a empacotar só motor/motor.js?`);
  }
});

// Guarda de reprodutibilidade, no mesmo molde da guarda de validador/cobertura.json em
// tests/unit/cobertura.test.mjs: dist/manifesto.json é gerado e versionado, e só é confiável se
// regerar não mudar nada. Sem "gerado" em build/bundle.mjs (tarefa 4 desta tarefa, item extra fora
// do brief), isto é igualdade estrutural direta — pega o caso de alguém trocar uma dependência ou
// um arquivo do sistema e esquecer de rodar `aula-usp dist` de novo.
test('regenerar bate campo a campo com o dist/manifesto.json commitado', async () => {
  const { readFile } = await import('node:fs/promises');
  const { version } = JSON.parse(await readFile(new URL('package.json', RAIZ), 'utf8'));
  const commitado = JSON.parse(await readFile(new URL('dist/manifesto.json', RAIZ), 'utf8'));
  const saidas = await empacotar({ raiz: RAIZ, escrever: false });
  const regenerado = {
    versao: version,
    arquivos: Object.fromEntries([...saidas].map(([nome, { bytes, integrity }]) => [nome, { bytes, integrity }])),
  };
  assert.deepStrictEqual(
    regenerado,
    commitado,
    'empacotar mudou desde o último commit — rode `aula-usp dist` e commite dist/manifesto.json de novo',
  );
});

// M2 da revisão final do 5a: o teste acima só lê dist/manifesto.json — nenhum teste lia os ARQUIVOS de
// dist/. Um aula-usp.js editado à mão ou corrompido no git passava em tudo, e deixava de bater com o
// próprio integrity, que é exatamente o que o SRI existe para detectar. Compara os bytes em disco com
// os que empacotar() acabou de gerar.
test('os arquivos em dist/ batem byte a byte com o que empacotar regera', async () => {
  const { readFile } = await import('node:fs/promises');
  const saidas = await empacotar({ raiz: RAIZ, escrever: false });
  for (const [nome, { conteudo }] of saidas) {
    const emDisco = await readFile(new URL(`dist/${nome}`, RAIZ));
    assert.ok(Buffer.compare(emDisco, conteudo) === 0,
      `dist/${nome} em disco não bate byte a byte com o regenerado — rode \`aula-usp dist\` de novo`);
  }
});

// Os nomes de satélite que o resolver de montar/dist.js sabe pedir, lidos do FONTE dele. Comparação
// por texto, no mesmo estilo de tests/unit/entrada.test.mjs, e pelo mesmo motivo: sem tirar os
// comentários primeiro, um comentário que cite um nome de arquivo entraria na medida.
async function satelitesQueDistSabePedir() {
  const { readFile } = await import('node:fs/promises');
  const codigo = (await readFile(new URL('montar/dist.js', RAIZ), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const { linguagens } = JSON.parse(await readFile(new URL('contrato/contrato.json', RAIZ), 'utf8'));
  const literais = [...codigo.matchAll(/'(aula-usp-[\w-]+\.js)'/g)].map((m) => m[1]);
  // O gabarito das gramáticas é uma template string, e por isso não cai no regex acima. Conferido, e
  // não presumido: se ele sumir ou virar outra coisa, esta lista ficaria curta em sete nomes calada.
  const gabaritos = [...codigo.matchAll(/`aula-usp-lang-\$\{[^`]+\}\.js`/g)];
  assert.equal(gabaritos.length, 1,
    `esperava um gabarito \`aula-usp-lang-\${…}.js\` em montar/dist.js, achei ${gabaritos.length}`);
  return new Set([...literais, ...linguagens.map((linguagem) => `aula-usp-lang-${linguagem}.js`)]);
}

// Guarda de PROPRIEDADE, no sentido do AGENTS.md: não regera e compara nada: afirma que, para cada
// satélite, o hash dele está dentro do pacote principal — a promessa da spec 3.2, passo 5, que até
// aqui não era cumprida (medido: `grep -c integrity dist/aula-usp.js` dava 0).
//
// As duas listas, e as duas de propósito. Só a marca `satelite` do empacotador não bastaria: ela é a
// MESMA fonte que alimenta o `define`, então esquecê-la num satélite novo — os dois da fase 2, por
// exemplo (spec 3.5) — tiraria o hash e a conferência ao mesmo tempo, e a guarda ficaria verde com o
// satélite desprotegido. É a sétima repetição da armadilha que o AGENTS.md documenta. A segunda lista
// vem do resolver de montar/dist.js, que é quem de fato decide o que o import() vai buscar, e a
// igualdade das duas é o que fecha o buraco.
test('todo satélite tem o seu integrity embutido em aula-usp.js, e nada além deles', async () => {
  const saidas = await empacotar({ raiz: RAIZ, escrever: false });
  const doEmpacotador = new Set([...saidas].filter(([, saida]) => saida.satelite).map(([nome]) => nome));
  const doResolver = await satelitesQueDistSabePedir();
  assert.deepEqual([...doEmpacotador].sort(), [...doResolver].sort(),
    'o que o empacotador marca como satélite e o que montar/dist.js sabe pedir divergem — um satélite '
    + 'novo sem `{ satelite: true }` sai do pacote sem integrity, e sem esta comparação sairia calado');
  const texto = saidas.get('aula-usp.js').texto;
  for (const nome of doResolver) {
    const { integrity } = saidas.get(nome);
    assert.ok(texto.includes(`${JSON.stringify(nome)}:${JSON.stringify(integrity)}`),
      `aula-usp.js não traz o integrity de ${nome} — spec 3.2, passo 5`);
  }
  // E nada a mais: um hash sobrando no mapa aponta para um arquivo que o resolver nunca pede, e um
  // integrity que não casa com nenhum pedido é um integrity que o navegador nunca vai conferir.
  assert.equal([...texto.matchAll(/sha384-/g)].length, doResolver.size,
    `aula-usp.js tem ${[...texto.matchAll(/sha384-/g)].length} hashes para ${doResolver.size} satélites`);
});

// Os dois lugares que guardam o mesmo número, sobre os arquivos COMMITADOS — é entre commits que eles
// divergem, e a guarda de bytes acima não vê essa divergência: ela compara cada arquivo com o que o
// empacotador regera AGORA, um de cada vez, e nunca um arquivo de dist/ com o outro. Um merge que
// resolva dist/manifesto.json por um lado e dist/aula-usp.js pelo outro passa por ela em silêncio.
test('o integrity que dist/aula-usp.js embute é o mesmo que dist/manifesto.json registra', async () => {
  const { readFile } = await import('node:fs/promises');
  const manifesto = JSON.parse(await readFile(new URL('dist/manifesto.json', RAIZ), 'utf8'));
  const pacote = await readFile(new URL('dist/aula-usp.js', RAIZ), 'utf8');
  const satelites = await satelitesQueDistSabePedir();
  assert.ok(satelites.size > 0, 'nenhum satélite: montar/dist.js deixou de resolver alguma coisa?');
  for (const nome of satelites) {
    const integrity = manifesto.arquivos[nome]?.integrity;
    assert.match(integrity ?? '', /^sha384-[A-Za-z0-9+/]{64}$/,
      `dist/manifesto.json não traz um integrity sha384 de ${nome}`);
    assert.ok(pacote.includes(`${JSON.stringify(nome)}:${JSON.stringify(integrity)}`),
      `dist/aula-usp.js embute para ${nome} um integrity diferente do de dist/manifesto.json`);
  }
});
