# Revisão final — marco 5b, `m5b-embutir` (28c3ecc..7249396, 13 commits)

**Veredito: pronto para merge — com correções.** A promessa central foi medida e se sustenta; nada do
que achei é defeito do artefato, mas três Important são costuras que o 5c vai bater de frente, e uma
delas (I2) faz uma aula com TeX quebrado construir e relatar sucesso.

**Contagem: 0 Critical · 3 Important · 3 Minor.** Mais o item carregado, triado no fim. Reproduzi na
cabeça do branch: `npm test` **401/401**. Worktree intocado (`git status` limpo); toda sonda e toda
mutação em `/private/tmp/rev5b`.

## 1. A promessa central, medida como promessa

Construí `especime/matematica.html` e **movi o arquivo** para
`/private/tmp/rev5b/nível 1/pasta com espaço/a/b/c/d/e/f/g/h/Aulas do Semestre/` — dez níveis, fora do
repositório, com espaço e acento no caminho —, abri de `file://` com o contexto em `setOffline(true)`:

| medida | resultado |
|---|---|
| pedidos de rede (fora do próprio arquivo e de `data:`) | **0** |
| `requestfailed` | **0** |
| erros de console e `pageerror` | **0** |
| `document.fonts` com `status: 'error'` | **0** |
| slides, palco, `.katex`, `prepararImpressao` | 8, sim, 16, `function` |
| fonte que **pintou** o `h1` (CDP) | `Geist / Geist-SemiBold`, `isCustomFont: true` |
| fonte que **pintou** `.katex .mathnormal` (CDP) | `KaTeX_Math-Italic`, `isCustomFont: true` |

O mesmo para `especime/index.html` numa segunda pasta profunda: demo registrada, montada e reagindo a
`data-opcoes`, zero pedido, zero erro. A mordida de profundidade do 5a não se repete: nenhum `url()`
relativo sobra na folha (28 `@font-face`, 16 com data URI, 20 com `url()` vazio de reserva, **0**
relativo). Construir custa 83 ms e o HTML sai com 890 kB — folga de um fator dez para `saida.tamanho`.

## 2. As três regras rodam sobre o artefato certo?

`saida.referencia-externa` roda sobre o mesmo objeto `doc` que serializa em `html`; `saida.tamanho`
recebe `Buffer.byteLength(html)`, os bytes que de fato são gravados. Essas duas medem o artefato certo.

**Sobre o item que você me mandou julgar (cobertura lida do disco, não dos bytes embutidos): não
importa, e não vale uma rodada.** As duas leituras saem da MESMA lista de URLs, na mesma execução
(`cssEFontesDoSistema` e `cssEFontesDoKatex` devolvem `caminhos` igual ao que virou data URI). Não há
por onde divergir. A redação é imprecisa; o comportamento, não. **Mas há uma divergência de verdade
embaixo dela, e essa importa — é o I1.**

## 3. A fronteira Node/navegador

Limpa, conferida transitivamente. Varredura por `node:`, `require(`, `process.` e `__dirname` em
`validador/`, `montar/`, `motor/` e `componentes/`: **nenhuma ocorrência**. `validador/regras/saida.js`
importa só `../validar.js` e `./recursos.js`, ambos puros.

O esbuild também não arrastou as regras para o navegador: `dist/aula-usp.js` cresceu **21 bytes**,
exatamente o `"saida.megabytes":10,` que entrou no contrato embutido. O corpo das regras foi podado —
`url() externa dentro de <style>` tem **0** ocorrências no pacote, e o único `saida.glifo-ausente` que
aparece está dentro do JSON do contrato (a mensagem de glifo que o `grep` acha vem de `recursos.js`,
que usa string idêntica). `dist/manifesto.json` está em dia e é determinístico.

## 4. O que o 5c herda

`AulaUSPMotor` chega à página construída como objeto global, com `paginasEsperadas` ligada: medido,
`AulaUSPMotor.paginasEsperadas(document)` = 15 contra 13 slides. O gancho de `saida.pdf-paginas`
existe. `window.AulaUSP` expõe `prepararImpressao` e `restaurarImpressao` (spec 8.4). A ligação do
arranque bate **linha a linha** com `montar/entrada.js:204-216` — mesma ordem, mesmo ramo de
apresentador. **Ficou completa.**

Uma coisa não ficou: o arranque não guarda a fila antes de esvaziá-la — é o I3, o aviso herdado do 4c
reaberto pelo outro caminho. E `construir()` não parametriza `fase` (M2) e fecha o canal de TeX (I2).

## Achados

### I1 · Important · `saida.glifo-ausente` perdoa caractere que nenhuma face embutida pinta

A cobertura é a união crua dos `cmap` de tudo que foi embutido. Duas coisas ela ignora: as famílias do
KaTeX só são alcançáveis **dentro de `.katex`** (é só lá que a CSS as nomeia), e as faces do sistema
carregam `unicode-range`, que o navegador respeita. Medido em `especime/matematica.html`: dos 626
pontos da cobertura, **198 só são servíveis dentro de `.katex`** (Γ Δ Θ Λ Ξ Π Σ Υ Φ Ψ Ω ← → ℏ ℵ ⃗ …) e
**4 nenhuma face serve** (U+0300, U+0301, U+0309, U+0323 — estão num `cmap`, fora de toda faixa).

Provado de ponta a ponta: aula com `Σ → Γ Ω` em prosa comum e TeX de verdade noutro parágrafo →
`construir()` devolve `achados: []`, e o CDP mostra o parágrafo pintado por
`.SF NS (isCustomFont: false)` em 4 glifos, ao lado de `Geist` nos outros 40. A regra diz "caractere
sem glifo nas fontes embutidas" e cala justamente onde não há glifo embutido que a alcance.

Atenuante: no pipeline fechado do 5c, a etapa 1 roda `matematica.simbolo-fora-do-tex` sobre o fonte
com `validador/cobertura.json` (só sistema), que **pega** esse Σ. O sistema não fica inseguro depois do
5c — mas esta regra, sozinha, é mais fraca que o próprio nome e que a irmã do 5a.

Forma do conserto: intersectar cada `cmap` com a `unicode-range` da sua face, e manter as famílias do
KaTeX num segundo conjunto, aplicado só a texto dentro de `.katex`.

### I2 · Important · `construir()` joga fora os erros de TeX e de código, e não os devolve

`construirHtml` devolve `errosDeTex` e `errosDeCodigo`; `construir()` desestrutura
`{ html, doc, fontes }` e devolve `{ html, achados, erros, caminhoDoHtml }`. Os dois canais morrem na
costura. Medido com uma aula contendo `\naoexiste` e um `\begin{matrix}` sem fechar: `construirHtml`
relata **2 erros** com trecho e mensagem do KaTeX; `construir()` devolve `erros: 0`, `achados: []`,
grava o HTML e um `validacao.json` limpo.

`matematica.tex-invalido` é **erro**, grupo `carga`, fase 1, e em `montar/entrada.js` é alimentada por
`recursos.tex`. No caminho do build não existe equivalente, e o 5c não consegue recuperar o dado sem
re-renderizar ou mexer nesta assinatura. Conserto: duas palavras na desestruturação, duas no `return`.

### I3 · Important · a página construída esvazia a fila de demos sem guardar cópia

`motor/demos.js` (`criarDemos`) faz `api.filaDeDemos.length = 0` e troca `api.demo`. A Ruling 11 está
escrita ali e em `montar/entrada.js`: o passo 6 **fotografa** a fila em `recursos.demos` ANTES de
`instalarDemos` rodar. O `arranqueDe` de `build/embutir.mjs` não fotografa nada. Medido numa
`especime/index.html` construída: depois de `montado=sim`, `filaDeDemos.length === 0` com uma
`div.demo[data-demo]` viva na página.

Hoje não quebra nada — a página construída não roda o grupo de carga. Mas a etapa 5 do 5c abre
exatamente esta página no Chrome; se rodar carga ali, `recursos.demos` volta vazio e **toda** demo vira
`recursos.demo-sem-registro` (erro) — a falha que a Ruling 11 foi escrita para impedir. Uma linha no
arranque fecha.

### M1 · Minor · o quarto teste do marco que passa com o código desligado

`tests/unit/embutir.test.mjs`, "a fila de demos é instalada antes de qualquer script do autor".
Apaguei as duas linhas da fila de `arranqueDe` numa cópia: **9/9 continuam verdes**. Causa:
`filaDeDemos` também aparece uma vez em `dist/aula-usp-motor.js`, então o `findIndex` cai no script do
MOTOR (índice 0) e nunca no arranque — o teste guarda "o motor vem antes do autor", não a fila. Segundo
caminho de silêncio no mesmo teste: `if (ondeOAutor >= 0)` — some o `AulaUSP.demo(` do espécime e a
asserção simplesmente não roda.

A propriedade em si **está** guardada, como a Ruling 2 desenhou: rodei a mesma cópia mutada contra
`construido-propriedades.test.mjs` e ele cai, com a mensagem certa (`a demo "contador" nunca montou em
5 s — … AulaUSP.demo is not a function`). Então isto é decoração, não buraco. Ou escopa a busca ao
script do arranque, ou apaga o teste e deixa o comentário apontar para a integração.

### M2 · Minor · `construir()` não parametriza `fase` (já declarado)

`validar` assume 1. Na fase 2 o build rodaria calado só as regras de fase 1. É do 5c.

### M3 · Minor · a fixture de imagem usa um `src` que o contrato recusa

`contrato.html.atributos.img.src` exige `img/…`, `data:image/…` ou `https://…`;
`tests/fixtures/construir/aula-com-imagem/aula.html` usa `figuras/quadrado.svg`. Inofensivo — a etapa
1 recusaria a aula antes —, mas a fixture não é uma aula que o sistema aceitaria.

## O item que você carregou: `waitForTimeout(150)`

**A corrida é real e frequente, não marginal:** sem espera nenhuma medi **4 leituras vazias do CDP em
9**, em três carregamentos limpos. O re-revisor tem razão no diagnóstico — 150 ms é sono fixo, não
espera por condição, e numa CI mais lenta volta a abrir.

Mas o modo de falha é **alto, não silencioso**:
`assert.ok(fonts?.length > 0, 'CDP não relatou fonte para "<seletor>" no slide #<id> (<familia>)')`
nomeia seletor, slide e família. Uma CI lenta dá intermitência com a mensagem apontando a causa.

**Minha recomendação: não segure o merge por ele.** É robustez de arnês num teste que falha
informando, num branch onde o resto está verde. Se você abrir a rodada para I1/I2/I3, ele entra junto —
poll em `fontesDoNo` até vir não-vazio, com timeout e mensagem próprios, são três linhas. Se não abrir,
pega carona no 5c, que vai tocar este arquivo de todo jeito para `saida.pdf-paginas`.

---

## O que foi feito depois desta revisão

A revisão acima foi feita por um revisor opus sobre `28c3ecc..7249396`, com sondas próprias — inclusive a que moveu o HTML construído para dez níveis fora do repositório, com espaço e acento no caminho, e o abriu offline. Seguiu-se uma única rodada de correção (`c5fb095`, `00ef7f4`, `f7d2e97`) e uma re-revisão escopada que verificou cada item ao vivo.

**Corrigido:**

- **Important — uma aula com TeX quebrado construía e relatava sucesso.** `construir()` desestruturava `{ html, doc, fontes }` de `construirHtml` e descartava `errosDeTex` e `errosDeCodigo`. Uma aula com `\naoexiste` produzia `erros: 0` e um `validacao.json` limpo, quando `matematica.tex-invalido` é erro de fase 1. Era o item mais grave e o mais barato: duas palavras na desestruturação, duas no `return`. Verificado ao vivo depois: `erros: 1`, achado correto, com o trecho.
- **Important — a cobertura de glifos era tratada como uma coisa só, e são duas.** Dois fatos do marco pareciam se contradizer: usar só a cobertura do sistema acusa sete erros falsos **dentro** de `.katex`, e usar a união crua deixa passar `Σ → Γ Ω` **em prosa**, onde o Chrome pinta com fallback do sistema. Juntos, dizem que a cobertura é **dependente de contexto** — dentro de `.katex` vale a união, fora vale a do sistema. Medido: 198 dos 626 pontos só servem dentro de `.katex`. Corrigido e verificado pelos dois lados.
- **Important — o aviso herdado do marco 4c reabriu pelo outro caminho.** `montar/entrada.js` fotografa a fila de demos antes de `instalarDemos` esvaziá-la, com comentário de guarda em `motor/demos.js:9`; o arranque do HTML construído não fazia isso. Não quebrava hoje, porque ninguém roda o grupo de carga sobre a página construída — quebraria na etapa 5 do marco 5c, com o modo de falha que a memória já descreve: toda demo vira erro de registro e o PDF morre em silêncio.
- **Dois Minor**, entre eles uma corrida de CDP tratada com sono fixo de 150 ms. O revisor mediu que sem espera nenhuma dá **quatro leituras vazias em nove** — a corrida é real e frequente, não teórica —, e a correção seguiu a receita que a própria tarefa 4 já havia estabelecido: espera por condição, com teto explícito e mensagem própria.

**Adjudicado, não corrigido:** `embutirFontes` mantém um campo `cobertura` — a união crua — cujo único leitor em todo o repositório é um teste; a produção passou a usar `coberturaSistema` e `coberturaKatex`. A re-revisão recomendou remover o campo e migrar o teste. Fica para o marco 5c, que toca esse arquivo de todo jeito. Campo vivo só para um teste passar é a mesma classe de "a medida mandando em quem escreve" que este marco encontrou três vezes.

**O que a revisão mediu e se sustentou:** a promessa central do marco aguenta mais do que o plano pedia. O HTML construído, movido para dez níveis fora do repositório e aberto offline, faz **zero** pedidos de rede, não registra falha de requisição nem erro de console, e o CDP mostra `Geist-SemiBold` pintando o `h1` e `KaTeX_Math-Italic` pintando o `.mathnormal`, os dois com `isCustomFont: true`. A mordida de profundidade de pasta que o marco 5a sofreu não se repete.

**Durante a execução, antes desta revisão:** a varredura de pré-voo achou um conflito circular entre as duas primeiras tarefas — interfaces que não fechavam, e que eu havia conscientemente adiado para a quarta tarefa resolver, oferecendo inclusive uma opção que não funcionaria. A regra que fica: ambiguidade sobre o que uma tarefa faz pode ser delegada; ambiguidade sobre a **interface entre duas tarefas**, não — é exatamente o que nenhum dos dois implementadores enxerga inteiro.

E o marco encontrou **quatro testes que passavam sem medir nada**, três deles escritos por mim no plano. Todos da mesma família: um token do vocabulário compartilhado do domínio usado como impressão digital de um artefato específico (`AulaUSPMotor`, que aparece também no arranque), uma asserção que continuava verde com o código desligado (`regras: []`), e — o mais instrutivo — `getComputedStyle().fontFamily`, que devolve a **cascata de CSS** e não a fonte que o navegador **pintou**. Essa última era a prova central que a minha própria sondagem elegeu para o marco: com todas as fontes embutidas corrompidas, o teste seguia relatando "Geist" enquanto o Chrome pintava com a fonte do sistema. O instrumento que enxerga a diferença — o CDP — estava disponível no arquivo ao lado o tempo todo.
