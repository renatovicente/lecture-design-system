# Revisão final — marco 5a (dist e cobertura de glifos)

Branch `m5a-dist`, `e003fbf..5d6edef`, 9 commits. Olhar de CONJUNTO; as revisões por tarefa não são
repetidas. Não toquei no worktree (sondas em `/private/tmp/m5a-sondas/`). Um Chrome, duas páginas.

**Veredito: pronto para merge — com correções.** O que está no branch está certo e verde (fronteira
Node/navegador limpa, `dist/` reprodutível byte a byte), mas `dist/aula-usp.js` ainda busca o contrato
e as marcas na CDN — o que a spec 3.2 proíbe pelo motivo que ela mesma dá — e o plano registra isso
como **coberto**, o que vai enganar quem ler no 5b e no 6.

**Contagem:** Critical 1 · Important 3 · Minor 7.

## 1. A fronteira Node/navegador: limpa, e a Ruling 14 pagou

Andei o grafo de imports (estáticos, dinâmicos, reexportações) a partir de 17 raízes de navegador: **41
módulos, zero `node:`, zero especificador nu**. Os cinco `import()` dinâmicos têm especificador
computado — o esbuild não os segue, e é isso que mantém os satélites fora do pacote. Do lado do que o
esbuild arrasta, li o `metafile` da build real de `montar/dist.js`: **39 entradas, nenhuma de
`node_modules`**. `validador/cobertura.js` está lá e não puxa nada; `build/validar.mjs` importa do
módulo puro — a Ruling 14 é verificável no artefato, não só no código. Nada a apontar.

## 2. A entrada partida em três: equivalente, menos num ponto que nenhum teste vê

`carregador.js` (dev) e `dist.js` (pacote) fazem a mesma coisa na mesma ordem: `<style>` de ocultar,
`window.AulaUSP` com `filaDeDemos` + `demo`, `.catch()` que remove o ocultar se a entrada não subir. A
cascata bate (7 folhas, KaTeX depois) nos dois modos; `resolver` e `estilo` são os dois únicos pontos
de diferença, como o desenho prometia; `contrato.linguagens` é fonte única para as gramáticas dos dois
lados; o `modulos/` do dev bate com `build/servir.mjs`. O que achei é **I3**.

## 3. O que o pacote embute — e o que ainda vem por URL

Medido em Chrome, servindo a raiz por `servirPastaCrua`, em dois decks. Além do próprio script e dos
satélites, `dist/aula-usp.js` pede: `assets/marcas/unidades.json` · `assets/marcas/usp.json` ·
`contrato/contrato.json` · `validador/cobertura.json` · `assets/marcas/ime-usp-horizontal-preta.svg`.
(O único erro de console é o `/favicon.ico` automático, o mesmo que `dist.test.mjs` filtra. Não é
achado.) **Embutido e correto:** as 7 folhas do sistema como texto e as 8 woff2 do sistema como data
URI (8 ocorrências, zero `url()` de arquivo sobrando); a CSS do KaTeX e as 20 fontes dele no satélite.
**Não embutido:** contrato, as duas JSON de marcas, a cobertura e as imagens das marcas. Isso é **C1**.

## 4. As regras de saída e o manifesto

`saida.glifo-ausente` está servida (`lerCobertura` puro, `cobertura.json` reprodutível);
`saida.tamanho` tem duas ordens de grandeza de folga. `saida.referencia-externa` até **protege** o 5b:
se `build/embutir.mjs` inlinar `estilos/fontes.css` sem transformar os `url('../assets/fontes/…')`, a
regra acusa — o mesmo defeito que a tarefa 2 achou por acidente; registro só que essa transformação
mora num plugin de `build/bundle.mjs` e não é reusável de fora. `dist/manifesto.json` serve ao marco 6
no que ele precisa: `versao` + `integrity` por arquivo, formato SRI conferido; também carrega o
`integrity` dos satélites, que ninguém consome — ver **I2**. Sobre `aula-usp-motor.js`, ver **I1**.

## 5. Os testes deste marco pagam o que custam?

Em geral sim, e irmão do teste tautológico eu não achei: o de demo virou medida de consequência
(Ruling 8), o de "script clássico" teve o comentário reescrito para prometer só o que mede (Ruling 9),
o de cobertura por arquivo (Ruling 15) morde e ainda imprime diagnóstico, e as duas guardas de
reprodutibilidade são reais. Sobram **M1**, **M2** e **M3**. Sem achado, mas anoto: o quarto teste de
`entrada.test.mjs` afirma sobre o TEXTO de `lerCoberturaOpcional` e passaria com esse código
inalcançável — a asserção mais fraca do conjunto, mas honestamente rotulada como guarda de texto, com
a metade real em `painel.test.mjs`, com DOM. Aceito. Custo: `bundle.test.mjs` roda `empacotar()` seis
vezes, uma por teste (~2 s); içar para um `before` devolve ~10 s à suíte.

---

## Achados

### [Critical] C1 — o pacote não embute contrato nem marcas, e a spec 3.2 diz por que não pode

Spec 3.2, último parágrafo: "Todo recurso vai dentro dos scripts, porque os artifacts do Claude só
carregam scripts de CDNs permitidas (jsDelivr, no caminho `/npm/`), não aceitam folhas de estilo
externas além do Google Fonts e **bloqueiam downloads de outros tipos**." Os cinco pedidos da seção 3
são exatamente "outros tipos". Três deles (contrato, `unidades.json`, `usp.json`) estão num
`Promise.all` sem guarda: bloqueados, `iniciar()` lança, `data-montado="erro"`, painel de erro — a aula
**não monta**. O modo que a spec 3.2 define como "o modo de quem não roda nada" é justamente o que não
funciona.

Três agravantes: (a) o plano, linha 907, dá 3.2 por coberta pela tarefa 2 "com um desvio declarado" (só
o do KaTeX) e afirma "o resultado observável é o mesmo (**nada é buscado de fora**)" — é falso, e é o
registro que o 5b e o 6 herdam; (b) nada pega, porque `saida.*` não roda no navegador (spec 9.3) e
`dist.test.mjs` serve de um servidor local onde os cinco pedidos dão 200; (c) `montar/entrada.js:2` já
afirma que "no marco 5, `dist/aula-usp.js` embute CSS, fontes e marcas" — a prosa promete o que o
código não faz.

O caminho está meio aberto: `COMUM.loader` declara `'.svg': 'text'` e `'.png': 'dataurl'`, e **nada no
pacote importa svg ou png** (conferido no metafile) — loaders mortos, sinal de que embutir as marcas
foi previsto e ficou pelo caminho. Não digo que tem de ser resolvido neste branch; digo que "coberto"
está errado, e que a linha 907 muda antes do merge de todo jeito.

### [Important] I1 — `dist/aula-usp-motor.js` não é o motor que a spec 3.3 descreve

Spec 3.3 etapa 4: o build troca a tag pelo `aula-usp-motor.js`, "só interação: navegação, passos,
notas, visão geral, apresentador e impressão". Medido no metafile, o pacote tem **quatro** entradas:
`motor/motor.js`, `navegacao.js`, `passos.js`, `rotulos.js`. Faltam `paineis.js` (notas, visão geral),
`apresentador.js`, `impressao.js`, `demos.js`. `prepararImpressao` aparece **0 vez** no artefato — e a
spec 8.4 diz que o build "chama `AulaUSP.prepararImpressao()` na página". O global é `AulaUSPMotor` (só
`iniciarMotor`), não `AulaUSP`. Veio do próprio plano (linha 417), não do implementador. Não quebra
nada hoje porque ninguém consome o arquivo; quebra no 5b, e `saida.pdf-paginas` depende dele. Está
publicado em `dist/` e no manifesto como se fosse final.

### [Important] I2 — os satélites são carregados sem `integrity`, e o mecanismo não admite SRI

Spec 3.2, passo 5: "cada script secundário é carregado com o seu `integrity`, que `aula-usp.js` traz
embutido para a mesma versão". Medido: **zero** ocorrências de `sha384` ou `integrity` em
`dist/aula-usp.js`. Os satélites entram por `import()` dinâmico, que não tem como carregar SRI — não é
uma linha esquecida, é o mecanismo. O dado existe (o manifesto tem o hash dos 10 satélites); falta
embutir e falta um carregador que possa usá-lo (`<script>` com `integrity`, ou import map). E a ordem
de `empacotar()` teria de inverter: `aula-usp.js` sai no passo 1, antes dos satélites. Numa CDN isto é
a diferença entre o navegador recusar um arquivo adulterado e executá-lo.

### [Important] I3 — `ESTILOS` e `EMBUTIDAS` são duas listas que divergem em silêncio

`montar/entrada.js:23` lista as 7 folhas; `montar/dist.js:15-21` repete as mesmas 7 chaves. Nada amarra
as duas — nenhum teste menciona `EMBUTIDAS`. Acrescente a oitava folha só em `ESTILOS` e o dev falha
alto (`carregarEstilo` rejeita → painel de erro) enquanto o dist **injeta nada, calado**: `estilo()`
retorna cedo em chave desconhecida, correto para a do KaTeX e mascaramento para qualquer outra. É a
divergência que nenhum teste pega, e é a terceira vez que esta classe aparece no marco (fontes do
KaTeX, fontes do sistema, agora esta) — o fato 8 do plano já avisava: "não confie no painel do
validador para dizer que o empacotamento está certo". Fecha com um teste comparando os dois conjuntos
de chaves.

### Minors

- **M1** (adiado da T2, **recomendo que entre**): não há guarda unitária das fontes do sistema em
  `aula-usp.js` — o satélite do KaTeX tem (`bundle.test.mjs`, teste 5), o principal não. Três linhas
  espelhando o teste 5, e guarda a classe que mordeu duas vezes.
- **M2** (**recomendo que entre**): a guarda de reprodutibilidade lê só `dist/manifesto.json`; nenhum
  teste lê `dist/*.js` do disco. Um `aula-usp.js` editado à mão ou corrompido no git passa em tudo
  enquanto deixa de bater com o próprio `integrity` — o que o SRI existe para detectar. Conferi à mão:
  hoje os 11 arquivos batem byte a byte e o `integrity` é o sha384 real dos bytes em disco. Lacuna
  latente; uma linha (comparar com `saidas.get(nome).conteudo`) fecha.
- **M3** (adiado da T1, **recomendo que entre**): `tests/unit/entrada.test.mjs:17` mede `FONTE`, não
  `CODIGO`, ao contrário dos outros três. Uma palavra.
- **M4** (**recomendo que entre**): `montar/dist.js:1-4` diz que `iniciar()` é chamada "dentro de um
  async IIFE". Não é: o topo do artefato é `(()=>{`, IIFE comum, e o top-level await é evitado pelo
  `.catch()`. Comentário apontando para o lugar errado — a classe que este projeto já pagou caro.
- **M5** (**recomendo que entre**): o plano ficou com os tamanhos superados. Linha 40: `aula-usp.js`
  "94,6 kB"; linha 465: "se passar de 200 kB, a CSS do KaTeX voltou — investigue antes de seguir".
  Medido hoje: **270,3 kB**, com a CSS do KaTeX corretamente fora. O ledger registrou a correção; o
  plano, não. É um alarme falso plantado para o 5b.
- **M6** (adiado da T3, **pode esperar**): o filtro de cobertura deixa passar `U+AD`, `U+200B`,
  `U+FEFF`. Coberto do lado consumidor pela guarda `INVISIVEL` da T4. Inofensivo.
- **M7** (da revisão da T2, **pode esperar**): `servirPastaCrua` não valida o header `Host`, assimetria
  com `criarServidor`. Servidor de teste, `127.0.0.1`, porta efêmera.

## Antes do merge, na minha leitura

Entram: **M5** e a linha 907 do plano (registro errado é o que mais custa depois), **M1**, **M2**,
**M3**, **M4** — somam poucas linhas, nenhuma toca código de produção além de comentário; **I3** é
barato e eu o poria junto. **C1**, **I1** e **I2** são decisões de escopo suas: lacunas contra a spec,
nenhuma defeito no código que está aí, e as três cabem no 5b/6 se você re-escopar — desde que o plano
pare de dizer que estão cobertas.

---

## O que foi feito depois desta revisão

A revisão acima foi feita por um revisor opus sobre `e003fbf..5d6edef`, com sondas próprias — inclusive a medição do grafo de imports e do metafile da build real, que é o que torna a fronteira Node/navegador verificável no artefato e não só no código. Seguiu-se uma única rodada de correção (`da1f357`) e uma re-revisão escopada.

**Corrigido:**

- **Critical — o pacote não era autocontido.** `dist/aula-usp.js` ainda buscava por rede o contrato, as duas JSON de marcas, a cobertura e os três arquivos de marca. Três dessas buscas estavam num `Promise.all` sem guarda: bloqueadas, a aula não montava — tela em branco, sem mensagem, porque o corpo fica escondido até a montagem terminar. É a mesma classe de falha que o marco 4c teve de corrigir, em outra roupa. Duas evidências de que embutir era o previsto e ficou pelo caminho: `build/bundle.mjs` já declarava os loaders `.svg: text` e `.png: dataurl`, e nada no pacote importava svg ou png — loaders mortos, fósseis de uma intenção abandonada. Agora tudo está embutido, e a re-revisão mediu as duas metades que importam: com a rede livre, o pacote não pede **nenhum** recurso que não seja script; com a rede bloqueada para tudo que não seja a página e o pacote, a aula **ainda monta**. Uma prova que não pede, a outra que não depende. `aula-usp.js` foi de 263,1 kB para 545,5 kB, que são as marcas e as JSON entrando.
- **Important — `aula-usp-motor.js` não era o motor que a spec 3.3 descreve.** Estava empacotando só `motor/motor.js`; medido no artefato, `prepararImpressao`, `instalarPaineis`, `instalarApresentador`, `instalarDemos` e `instalarImpressao` não apareciam. Veio de uma linha do plano. Não quebrava nada hoje, mas quebraria o marco 5b, em que a spec 8.4 manda o build chamar `AulaUSP.prepararImpressao()` para gerar o PDF.
- **Cinco Minor**, entre eles a guarda de reprodutibilidade que comparava o manifesto e não os bytes dos arquivos em disco, e um alarme que eu havia escrito no plano ("se passar de 200 kB, a CSS do KaTeX voltou") calibrado para um mundo que a própria execução mudou — hoje o valor real passa disso com a CSS corretamente fora. Um alarme que dispara no caso certo ensina errado.

**Adjudicado, não corrigido:** os satélites (`aula-usp-tex.js`, `aula-usp-codigo.js`, as gramáticas) viajam sem `integrity`, e o mecanismo não admite — `import()` dinâmico não carrega SRI. Resolver exige um carregador que busque e verifique, e inverter a ordem de `empacotar()`. É decisão de desenho, e o dono natural é o marco 6, onde `aula-usp pacotes` já é quem escreve `integrity` nas tags.

**Julgado e aceito:** `aula-usp-motor.js` passou a puxar parte de `validador/validar.js`, por causa de `instalarPaineis` — que a spec 3.3 exige para notas e visão geral, e que desde o marco 4 cria os quatro painéis como uma unidade. Medido no artefato: `REGRAS_ESTATICAS` e o corpo de `validar()` não vêm junto; o esbuild poda. O que sobra é o formatador de mensagem, peso morto de 20 kB no total do motor, não o motor de regras.

**Durante a execução, antes desta revisão:** a varredura de pré-voo achou três defeitos no plano antes de qualquer subagente ser despachado, e a execução achou mais nove. Eles caem em três famílias, e as proporções são a lição: **três eram verdades que envelheceram** (um número medido antes de o filtro existir, a CSS do KaTeX no lugar certo antes de eu medir os 404, os tamanhos antes das fontes entrarem); **quatro eram medidas mais largas que a pergunta** (um teste medindo o texto do arquivo em vez do código, `.katex` — vocabulário do domínio — usado como impressão digital de um artefato, um teste afirmando sobre mecanismo interno em vez de consequência observável, e uma regex de SRI deduzida em vez de medida); e **cinco só a execução podia achar** (`fontkit` sem export default em ESM, um arquivo que eu nomeei sem verificar, uma função que eu inventei quando a real já existia com testes, `lerCobertura` do lado errado da fronteira Node/navegador, e a regra ligada só em um dos dois modos).

O mais instrutivo deles: o teste que deveria guardar a propriedade que justifica o marco inteiro — a fila de demos existir antes do `<script>` do autor — era `assert.ok(registradas > 0 || naFila === 0)`, com as duas metades sempre falsas e sempre verdadeiras por construção. Sempre passava. Substituí-lo por um teste de consequência observável **achou um bug real na primeira execução**: as fontes do próprio sistema davam 404 para qualquer aula que não estivesse exatamente um nível abaixo da raiz, porque o `url()` dentro de um `<style>` inline resolve contra a página e não contra o pacote. O espécime funcionava por acidente.
