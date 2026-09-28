# Aula USP: design system de aulas para Claude e GPT

Data: 2026-09-14
Estado: aprovado em conversa, seção por seção; revisado por subagente e ajustado; aguardando revisão do autor
Repositório: `~/Projects/lecture-design-system`

## 1. Objetivo

O Aula USP é um design system de slides em HTML para as aulas do autor na USP (IME e IFUSP). Herda a disciplina do PSKR Design System (poucas cores, cor como sinal, rótulos em mono) e a composição da Bauhaus (grid, réguas, campos de cor chapada, numerais grandes), com fundo branco, fontes modernas e fáceis de ler e nenhum elemento sem função.

O sistema é consumido por modelos de linguagem, Claude e GPT, em três ambientes:

1. agentes com terminal (Claude Code, Codex CLI);
2. chat na web (claude.ai, ChatGPT);
3. Projetos do Claude e GPTs personalizados.

Cada aula é entregue como um HTML único, que funciona offline quando gerado pelo modo build, para projetar, e como um PDF do mesmo fonte, para os alunos.

Critérios de sucesso:

- Uma aula pedida ao Claude e outra pedida ao GPT, cada modelo só com o seu pacote, chegam a zero erros no validador em até três rodadas de correção; as duas usam só o vocabulário do contrato, e a revisão visual do autor não aponta diferença de sistema entre elas.
- O mesmo fonte produz slides visualmente idênticos no modo navegador e no modo build (seção 3).
- O PDF tem uma página por slide, ou uma por estado nos slides com `data-pdf="passos"`, em 1280 × 720, com fontes embutidas.

## 2. Decisões tomadas com o autor

| # | Decisão | Escolha |
|---|---|---|
| 1 | Formato | Só slides HTML. Sem tema Beamer, documentos A4 ou site de disciplina. |
| 2 | Entrega | HTML único e PDF do mesmo fonte. |
| 3 | Marca | Logos da unidade e da USP só na capa e no encerramento; nos demais slides, orientação em texto mono. Unidades iniciais: IME e IFUSP. |
| 4 | Paleta | "B": o azul da USP sinaliza, o amarelo da USP destaca (seção 4.2). |
| 5 | Tipografia | Geist e Geist Mono. Letras de linhagem Bauhaus foram testadas e descartadas: as fontes têm de ser modernas e fáceis de ler; a Bauhaus fica na composição. |
| 6 | Composição | "C", mapa de blocos (seção 5.4). |
| 7 | Recursos | Revelação passo a passo, código com destaque, gráficos e diagramas, demos interativas. |
| 8 | Arquitetura | Evoluir o motor `deck.js` de `ciam-neural-networks/aula` para um sistema próprio, e não usar reveal.js nem Quarto. |
| 9 | Consumo | Um núcleo, dois modos (navegador e build) e pacotes para Claude e para GPT gerados de uma fonte única. |
| 10 | Apresentador | Janela do apresentador incluída (tecla P). |
| 11 | Código | Destaque monocromático; a ênfase funcional é a linha marcada em amarelo. |
| 12 | Diagramas | DOT, renderizado com Graphviz. |
| 13 | Nome | Aula USP (`aula-usp`, global `AulaUSP`). |
| 14 | Segurança do runtime | Tag com versão exata e hash de integridade (SRI). Ajuste feito na escrita da spec: substitui a fixação só da versão principal (`aula-usp@1`), que não admite hash. |

As telas aprovadas estão em `docs/superpowers/specs/referencias/2026-09-14-aula-usp/` (`paleta.html`, `tipografia.html`, `composicao.html`). Na tela de paleta, a tipografia ainda era provisória.

## 3. Arquitetura

### 3.1. Núcleo

Um repositório reúne tokens, estilos, motor, componentes, o contrato de HTML, o validador, o build, as marcas, as fontes, o guia e os exemplos. Os dois modos e todos os pacotes derivam dele. Duas peças são compartilhadas literalmente pelos dois modos, para que o resultado não possa divergir:

- `montar`: a partir do fonte, deriva os blocos, injeta o cromo (rótulo, mapa, contador, rodapé, faixa de marca) e aplica rótulos e números automáticos;
- `validador`: as mesmas regras, escritas contra a API padrão do DOM (no Node, via `linkedom`).

### 3.2. Modo navegador

É o modo de quem não roda nada: chat na web, Projetos, GPTs, ou o autor abrindo um arquivo. O fonte da aula carrega o runtime por uma tag no `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/aula-usp@1.0.0/dist/aula-usp.js"
        integrity="sha384-…" crossorigin="anonymous"></script>
```

A versão é exata e vem com hash de integridade: se o arquivo na CDN for alterado, o navegador não o executa. No modelo, no espécime, nos exemplos e nos pacotes, versão e hash são os reais, escritos por `aula-usp pacotes`. Cada aula fica presa à versão com que foi feita; atualizar é trocar a tag.

Ao executar, `aula-usp.js`:

1. injeta um estilo que esconde o corpo até o fim da montagem; se o runtime não carregar (por exemplo, sem internet), nada é escondido, e o HTML aparece cru, mas legível;
2. no `DOMContentLoaded`, guarda uma cópia do corpo, antes de qualquer alteração: é o **fonte** sobre o qual rodam as regras estáticas;
3. roda as regras estáticas sobre o fonte (seção 9.3);
4. injeta o CSS e as fontes (Geist, Geist Mono, Open Sans) como `data:` e roda `montar`;
5. se a aula tem `\(` ou `\[`, carrega `aula-usp-tex.js` do mesmo endereço (`document.currentScript.src`) e renderiza a matemática; se tem `pre[data-lang]`, carrega `aula-usp-codigo.js`; na fase 2, `aula-usp-graficos.js` e `aula-usp-diagramas.js`, pela mesma regra; cada script secundário é carregado com o seu `integrity`, que `aula-usp.js` traz embutido para a mesma versão;
6. depois de carregados scripts, imagens e fontes, roda as regras de carga e de composição (seção 9.3);
7. inicia o motor.

Todo recurso vai dentro dos scripts, porque os artifacts do Claude só carregam scripts de CDNs permitidas (jsDelivr, no caminho `/npm/`), não aceitam folhas de estilo externas além do Google Fonts e bloqueiam downloads de outros tipos. A regra vale para os recursos do sistema. Arquivos do autor referenciados por caminho relativo — imagens e o CSV de um gráfico — são buscados ao lado da aula, e por isso não existem dentro de um artifact: ali, gráfico tem de trazer os dados inline (seção 7.2), e um CSV que não carrega vira `recursos.csv` no painel.

O painel do validador lista as mensagens, abre e fecha com a tecla V e tem o botão "copiar para o chat". Ele abre sozinho só quando há erros e a página não está em tela cheia; avisos não o abrem e ficam também no console. O modo navegador precisa de internet para carregar o runtime; para projetar offline, usa-se o HTML do modo build.

### 3.3. Modo build

É o modo dos agentes com terminal e do autor. `aula-usp build <pasta>` lê o fonte e escreve só em `<pasta>/dist/`; o fonte nunca é alterado. `<slug>` é o nome da pasta da aula. Etapas:

1. analisa o HTML e roda as regras estáticas e as de carga que não precisam de navegador (seção 9.3); com erros, grava só `validacao.json` e termina com código 1;
2. roda `montar`;
3. pré-renderiza matemática (KaTeX), código (Shiki) e, na fase 2, gráficos e diagramas em SVG;
4. troca a tag do runtime pelo `aula-usp-motor.js` (só interação: navegação, passos, notas, visão geral, apresentador e impressão) e embute CSS, fontes (das famílias do KaTeX, só as que a aula usa), marcas, imagens e scripts de demos; grava `<slug>.html`;
5. abre o resultado no Chrome headless e roda as regras de composição; na fase 2, também captura a imagem estática das demos que não têm imagem própria;
6. chama `AulaUSP.prepararImpressao()` na página e gera o PDF;
7. roda as regras de saída e grava `<slug>.pdf` e `validacao.json`.

Com erros de composição na etapa 5, o build grava `<slug>.html` e `validacao.json`, não gera PDF e termina com código 1. Com erros de saída na etapa 7, mantém os arquivos gravados e termina com código 1. Sem Chrome, o build grava o HTML, pula as etapas 5 e 6, emite um aviso explícito e termina com código 0 se não houver erros.

### 3.4. Pacotes

Os pacotes são gerados por `aula-usp pacotes` a partir de `guia/`, `contrato/`, `tokens/`, `modelos/`, `exemplos/` e `especime/` (seção 10). Nenhum texto de instrução é mantido à mão fora de `guia/`.

### 3.5. Estrutura do repositório

```
lecture-design-system/
  AGENTS.md  CLAUDE.md  README.md  package.json
  bin/aula-usp.mjs                  CLI (seção 8.1)
  tokens/aula-usp.tokens.json       fonte única de tokens (DTCG 2025.10)
  contrato/contrato.json            layouts, conteúdo permitido, papéis, atributos, limites, regras
  estilos/                          base.css, layouts.css, componentes.css, impressao.css; tokens.css gerado
  motor/                            motor.js, passos.js, apresentador.js, demos.js, impressao.js, rotulos.js
  montar/                           montar.js (blocos, cromo, faixa de marca)
  componentes/                      tex.js, codigo.js; fase 2: graficos.js, diagramas.js, controles.js
  validador/                        validar.js, regras/*.js; cobertura.json gerado
  build/                            build.mjs, embutir.mjs, pdf.mjs, bundle.mjs, fontes.mjs, pacotes.mjs;
                                    fase 2: captura.mjs
  assets/fontes/                    woff2 de Geist, Geist Mono e Open Sans, com as licenças OFL
  assets/marcas/                    usp-preto.svg, ime-usp-horizontal-preta.svg, ifusp-vertical-preto.png, unidades.json
  guia/                             fonte do guia e dos textos dos pacotes (seção 10.1)
  modelos/aula/                     index.html inicial
  especime/                         deck com todos os layouts e componentes
  exemplos/descida-do-gradiente/    aula-exemplo da fase 1
  dist/                             aula-usp.js, aula-usp-motor.js, aula-usp-tex.js, aula-usp-codigo.js;
                                    fase 2: aula-usp-graficos.js, aula-usp-diagramas.js
  pacotes/                          gerado (seção 10.2)
  tests/                            unit/, integracao/, fixtures/, aceite/
  docs/superpowers/specs/
```

`motor/`, `montar/`, `componentes/` e `validador/` são ES modules sem dependência de Node, para rodar no navegador; `bin/` e `build/` são Node.

## 4. Fundamentos

### 4.1. Tokens

`tokens/aula-usp.tokens.json`, no formato do Design Tokens Community Group (versão estável 2025.10), é a fonte de cores, tipografia, grid, réguas e limites de contraste. Dele saem, por geração: `estilos/tokens.css` (variáveis CSS), um módulo JS com as mesmas constantes (usado pelo validador e pelos gráficos), as tabelas de `guia/` e, na fase 2, `aula-usp.mplstyle`.

### 4.2. Cor

| token | valor | papel | contraste sobre `papel` |
|---|---|---|---|
| `papel` | `#FFFFFF` | fundo do palco e do entorno | — |
| `tinta` | `#0A0A0A` | texto de leitura, réguas, eixos, contornos, quadrados de blocos vistos, campo do `alerta` | 19,8:1 |
| `cinza` | `#666666` | rodapé, legendas, comentários de código | 5,7:1 |
| `linha` | `#D9D9D9` | linhas finas de tabela e grade de gráfico; nunca texto | — |
| `azul` | `#1094AB` | segunda linha de títulos (`span.sinal`), bloco atual, série em foco de gráfico, aresta ativa | 3,6:1 |
| `amarelo` | `#FCB421` | campo sob tinta: `destaque`, bloco atual na abertura, linha marcada de código, célula destacada, faixa em gráfico, nó em foco | 1,8:1 |

Regras:

- texto em `azul` só com 32 px ou mais; a WCAG aceitaria 24 px, e a margem compensa o projetor;
- `amarelo` nunca é cor de texto nem de linha com menos de 4 px; sobre ele, só `tinta` (11,0:1);
- sem sombras, gradientes, transparências, cantos arredondados ou texturas;
- nenhuma outra cor nos slides, inclusive em SVG inline e em TeX; fotografias e imagens raster são a exceção.

Como o autor não pode escrever `style` (seção 5.5), essas regras só podem ser violadas por SVG inline, por comandos de cor em TeX ou por defeito do próprio sistema. As regras de validação correspondentes estão na seção 9.2.

### 4.3. Tipografia

Famílias: Geist (400, 600 e itálico 400), Geist Mono (400, 600 e 700) e Open Sans 600, esta só no texto "Universidade de São Paulo" ao lado do logo USP, como alternativa livre à Univers indicada pela SCS-USP. Todas têm licença SIL OFL e são embutidas nos subconjuntos latin e latin-ext.

| papel | onde | fonte | tamanho / entrelinha (px) | peso e tracking |
|---|---|---|---|---|
| título da capa | `capa h1` | Geist | 96 / 1,0 | 600, −0,035em |
| título da abertura | `abertura h2` | Geist | 84 / 1,0 | 600, −0,03em |
| afirmação | `p.afirmacao` | Geist | 64 / 1,08 | 600, −0,03em |
| título do slide | `h2` dos demais layouts | Geist | 44 / 1,08 | 600, −0,03em |
| numeral de passo | numerais de `ol.passos` e `ol.sintese` | Geist | 40 / 1,0 | 600 |
| lide | `p.lide`, `p.pergunta` | Geist | 32 / 1,25 | 400 |
| leitura | `p`, `li`, `th`, `td`, texto de campos, `div.enunciado`, `div.resposta`, linha de metadados da capa, `p.proxima` | Geist | 24 / 1,42 | 400; ênfase 600 |
| matemática | `\( \)`, `\[ \]` | KaTeX | 1,1 × o texto ao redor | — |
| código | `pre`, `code` | Geist Mono | 20 / 1,45 | 400; palavras-chave 600 |
| legenda | `figcaption`, `p.fonte` | Geist | 18 / 1,35 | 400, `cinza` |
| rótulo | rótulos do cromo, `data-rotulo`, "Bloco N de M" no cabeçalho, rodapé, contador | Geist Mono | 14 / 1,2, caixa alta | 700 no rótulo, 400 no rodapé; +0,16em |
| rótulo grande | "Bloco N de M" na abertura | Geist Mono | 20 / 1,2, caixa alta | 700; +0,16em |

Tamanhos mínimos, verificados por `composicao.tamanho-minimo` pelo papel de cada elemento, como declarado em `contrato.json`: 24 px para leitura, 20 px para código, 18 px para legendas e 14 px para rótulos. Texto dentro de SVG (`text` e `tspan`) segue o mínimo de rótulo, 14 px — o mínimo, não o papel inteiro: a família é a da seção 5.5 —, medido no tamanho em que aparece no palco, isto é, o `font-size` do SVG vezes a escala com que a figura o desenha: o SVG escala com a largura da coluna, e um 14 do `viewBox` pode sair com 8 px numa coluna estreita; no layout `figura`, escala também com a altura que sobra embaixo do título, e uma figura mais alta que larga encolhe por ela. O achado é um por figura, com a menor medida, e diz qual das duas dimensões encolheu a figura. Ficam fora da verificação:

- o interior das equações do KaTeX (índices, frações e símbolos seguem as regras de tamanho do TeX);
- `sub` e `sup` em texto, que o sistema define com 0,8em;
- o conteúdo criado por demos dentro de `div.demo`;
- painéis do motor, fora do palco, e a faixa de marca.

Outras regras:

- ênfase por peso (`strong`, 600) ou pelo campo amarelo; itálico (`em`) só para variáveis citadas no texto e termos estrangeiros;
- matemática sempre em TeX: `\( … \)` no texto e `\[ … \]` em destaque; `$` não é delimitador, porque "R$ 100" aparece em aulas de atuária e finanças;
- a Geist servida pelo Google Fonts não tem grego, nem setas e operadores matemáticos; caractere sem glifo nas fontes embutidas, fora de TeX e de código, é erro de validação; o conjunto de glifos vem do `cmap` dos woff2 (seção 9.3);
- números de tabela usam `font-variant-numeric: tabular-nums`, que funciona na Geist do Google Fonts (verificado).

### 4.4. Grid e espaço

- Palco de 1280 × 720 px lógicos, escalado para caber na janela; o entorno é `papel`.
- Margens laterais de 64 px; 12 colunas de 74 px com calhas de 24 px, somando 1152 px úteis.
- Zonas verticais dos slides com cabeçalho: cabeçalho de y = 40 a y = 64; título a partir de y = 96; conteúdo até y = 652; linha de base do rodapé em y = 688. Capa, abertura e encerramento seguem a seção 5.4.
- Grades de colunas (`data-grade`): `12`, `6-6`, `8-4`, `4-8` e `4-4-4`.
- Espaços em múltiplos de 8: 8, 16, 24, 32, 48, 64 e 96.
- Réguas: `regua`, de 2 px (divisões de passos, contorno de `quadro`, régua superior do código, separador do cabeçalho de tabela), e `regua-forte`, de 4 px (topo e base de tabelas).

### 4.5. Marca

`assets/marcas/unidades.json` descreve cada unidade:

```json
{
  "ime":   { "nome": "Instituto de Matemática, Estatística e Ciência da Computação",
             "arquivo": "ime-usp-horizontal-preta.svg", "integraUSP": true,
             "altura": 88, "protecao": 24, "alturaMinima": 40 },
  "ifusp": { "nome": "Instituto de Física",
             "arquivo": "ifusp-vertical-preto.png", "integraUSP": false,
             "altura": 128, "protecao": 24, "alturaMinima": 80 }
}
```

`altura` é a altura de uso na faixa de marca; `protecao`, a área livre ao redor do logo, em px nessa altura; `alturaMinima`, a menor altura permitida. Os valores acima são provisórios e são substituídos, na fase 1, pelos que os manuais das unidades determinarem (verificação 3, abaixo).

Faixa de marca, na capa e no encerramento, com a base alinhada em y = 680:

- logo da unidade à esquerda, na altura declarada;
- se `integraUSP` for falso, à direita ficam "Universidade de São Paulo" (Open Sans 600, 20 px, em duas linhas alinhadas à direita) e o logo USP preto, com 56 px de altura e área de proteção igual à altura do "P" do logotipo (regra da SCS);
- logos sempre pretos, nunca redesenhados, recoloridos, distorcidos ou com efeito.

Arquivos oficiais, baixados na fase 1 com autorização do autor:

| arquivo | origem |
|---|---|
| logo USP (PDF vetorial convertido em SVG sem alterar traços) | `https://scs.usp.br/identidadevisual/wp-content/uploads/2022/08/usp-logo-pdf.pdf` |
| lockup IME+USP preto | `https://www.ime.usp.br/media/identidade_visual/imagens/IME+USP/Preta/SVG/Horizontal_preta.svg` |
| IFUSP vertical preto (PNG) | `https://portal.if.usp.br/imprensa/sites/portal.if.usp.br.ifusp/files/logo_IFUSP_2025_VERT_preto.png` |
| manual do IME | `https://www.ime.usp.br/media/identidade_visual/manual-identidade-visual-IME-MAR2021-web.pdf` |
| manual do IFUSP | o Manual Técnico listado em `https://portal.if.usp.br/imprensa/pt-br/node/3425` |

Verificações antes de usar os arquivos:

1. os arquivos do IME são de 2024, e o instituto mudou de nome em 2025; se o lockup preto trouxer o nome antigo, perguntar ao autor antes de adotá-lo;
2. o IFUSP só oferece PNG; usar a versão de maior resolução e pedir uma vetorial à comunicação do IF;
3. ler nos manuais a área de proteção e o tamanho mínimo de cada logo e gravar `protecao` e `alturaMinima` em `unidades.json`; se `altura` ficar abaixo de `alturaMinima`, subir `altura`.

Uma unidade nova entra com uma entrada em `unidades.json` e o arquivo do logo, sem código.

## 5. Contrato da aula

### 5.1. Esqueleto

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Descida do gradiente</title>
<meta name="unidade" content="ime">
<meta name="disciplina" content="Aprendizado de Máquina">
<meta name="aula" content="4">
<meta name="data" content="2026-09-14">
<meta name="professor" content="Prof. Renato Vicente">
<script src="https://cdn.jsdelivr.net/npm/aula-usp@1.0.0/dist/aula-usp.js"
        integrity="sha384-…" crossorigin="anonymous"></script>
</head>
<body>

<section data-layout="capa">
  <h1>Descida do gradiente<br><span class="sinal">o caminho para baixo</span></h1>
</section>

<section data-layout="abertura" id="intuicao">
  <h2>Intuição</h2>
  <p class="pergunta">Por que andar contra o gradiente?</p>
</section>

<section data-layout="conteudo" id="passo">
  <h2>O gradiente aponta a subida;<br><span class="sinal">descemos no sentido oposto.</span></h2>
  <div class="colunas" data-grade="6-6">
    <div>
      <p>A cada passo, os pesos andam contra o gradiente do erro.</p>
      \[ w \leftarrow w - \eta \, \nabla E(w) \]
      <aside class="destaque" data-rotulo="Definição">Taxa de aprendizado \(\eta\): o tamanho de cada passo.</aside>
    </div>
    <div>
      <ol class="passos">
        <li>Calcule o erro.</li>
        <li data-passo>Calcule o gradiente.</li>
        <li data-passo>Ande contra ele.</li>
      </ol>
    </div>
  </div>
  <aside class="notas">Dizer a regra em palavras antes de mostrar a equação.</aside>
</section>

<!-- outros blocos: cada um começa com data-layout="abertura" -->

<section data-layout="encerramento">
  <h2>O que fica</h2>
  <ol class="sintese">
    <li>O gradiente aponta a subida.</li>
    <li>A taxa de aprendizado controla o passo.</li>
  </ol>
  <p class="proxima">Próxima aula: descida estocástica.</p>
</section>

</body>
</html>
```

### 5.2. Metadados

| meta | obrigatório | formato |
|---|---|---|
| `unidade` | sim | chave de `unidades.json` (`ime`, `ifusp`) |
| `disciplina` | sim | texto, até 60 caracteres |
| `aula` | sim | número ou texto curto, até 12 caracteres |
| `data` | sim | ISO `AAAA-MM-DD`, exibida por extenso curto no idioma da aula ("14 set 2026" em `pt-BR`, "14 Sep 2026" em `en`) |
| `professor` | sim | texto, até 40 caracteres |

O `lang` do `<html>` (`pt-BR` ou `en`) escolhe os rótulos do sistema (seção 6.8).

### 5.3. Layouts

Cada `section` tem um `data-layout` e só pode conter, fora `aside.notas`, os elementos listados para o seu layout. Elemento obrigatório ausente é erro (`estrutura.obrigatorio`); elemento fora da lista é erro (`estrutura.fora-do-layout`).

**Blocos de corpo** são os elementos que podem compor o corpo de `conteudo`, diretamente ou dentro de colunas: `p`, `ul`, `ol.passos`, `aside.destaque`, `aside.quadro`, `aside.alerta`, `div.exercicio`, `table`, `pre[data-lang]`, `figure` (com `img` ou `svg` e `figcaption` opcional), equação em destaque (`\[ … \]`) e, na fase 2, `figure.grafico` e `figure.diagrama`.

| layout | conteúdo, na ordem | obrigatórios | gerado pelo sistema |
|---|---|---|---|
| `capa` | `h1` | `h1` | linha de metadados; roteiro da aula; faixa de marca |
| `abertura` | `h2`, `p.pergunta` | `h2` | número do bloco; fileira de quadrados com nomes; "Bloco N de M" |
| `conteudo` | `h2`, `p.lide`, e então um `div.colunas` ou blocos de corpo | `h2` e ao menos um bloco de corpo | cabeçalho (rótulo, mapa, contador); rodapé |
| `afirmacao` | `p.afirmacao`, `p.fonte` | `p.afirmacao` | cabeçalho; rodapé |
| `figura` | `h2`, `figure` (com `img`, `svg` ou, na fase 2, gráfico ou diagrama, e `figcaption` opcional) | exatamente um `figure` | cabeçalho; rodapé |
| `demo` | `h2`, `div.demo` (com `img.estatico` opcional como filho) | `h2` e exatamente um `div.demo` | cabeçalho; rodapé; imagem estática no PDF |
| `encerramento` | `h2`, `ol.sintese`, `p.proxima` | `h2` e `ol.sintese` | cabeçalho com o mapa; faixa de marca |

`div.colunas` tem tantos `div` filhos quanto partes em `data-grade` (dois em `6-6`, três em `4-4-4`), e cada `div` contém só blocos de corpo. Dentro de uma coluna, `figure.grafico` só respeita o mínimo de rótulo na coluna de 8 de `8-4` e `4-8` (seção 7.2).

**Limites de conteúdo.** Os limites de título foram calibrados medindo a Geist 600 do Google Fonts, com o tracking da tabela 4.3, em frases de aula em português. As médias foram de 44,4 px por caractere a 96 px (25 caracteres em 1152 px), 39,3 px a 84 px (23 caracteres em 908 px, a largura que sobra ao lado de "Bloco N de M") e 20,6 px a 44 px (55 caracteres em 1152 px). Os limites adotados são o que cabe na frase mais larga do conjunto medido: 23, 20 e 50. Caracteres são contados por **segmento**, isto é, pelo texto entre `<br>`; como letras largas ainda podem quebrar uma linha dentro do limite, o número de linhas renderizadas é medido no navegador por `composicao.linhas-titulo`.

| alvo | limite |
|---|---|
| `capa h1` | ≤ 23 caracteres por segmento; ≤ 2 segmentos e ≤ 2 linhas renderizadas |
| `abertura h2` | ≤ 20 caracteres por segmento; ≤ 2 segmentos e ≤ 2 linhas renderizadas |
| `data-curto` da abertura | ≤ 10 caracteres (medido: 106 px em rótulo de 14 px, contra 123 px do quadrado com 8 blocos); obrigatório quando o `h2` passa de 10 caracteres |
| `p.pergunta` | ≤ 90 caracteres |
| `h2` de `conteudo`, `figura`, `demo` e `encerramento` | ≤ 50 caracteres por segmento; ≤ 2 segmentos e ≤ 2 linhas renderizadas |
| `p.lide` | ≤ 120 caracteres |
| palavras no corpo de `conteudo` | ≤ 90 no total e ≤ 60 por coluna |
| itens de `ul` e `ol.passos` | ≤ 5 por lista |
| campos | ≤ 2 `aside.destaque` e ≤ 1 `aside.alerta` por slide |
| `data-rotulo` | ≤ 24 caracteres |
| `p.afirmacao` | ≤ 120 caracteres |
| `p.fonte` | ≤ 80 caracteres |
| `figcaption` | ≤ 140 caracteres |
| `ol.sintese` | ≤ 3 itens, cada um ≤ 80 caracteres |
| `p.proxima` | ≤ 90 caracteres |
| código | ≤ 16 linhas e ≤ 64 colunas |
| tabela | ≤ 8 linhas de dados e ≤ 6 colunas |

Palavras são as sequências separadas por espaço nos nós de texto, sem contar TeX (`\( … \)`, `\[ … \]`), `pre`, `code` e `aside.notas`.

**Cromo gerado:**

- rótulo do cabeçalho: número do bloco com dois dígitos, ponto médio e o `h2` da abertura em caixa alta, com os segmentos unidos por espaço ("03 · BACKPROPAGATION"); antes da primeira abertura, "INTRODUÇÃO"; no encerramento, "ENCERRAMENTO";
- contador à direita do mapa: "17 / 42";
- rodapé: "disciplina · Aula N";
- linha de metadados da capa, em duas linhas de leitura: "disciplina · Aula N" e "professor · data".

### 5.4. Mapa de blocos

- Cada `abertura` inicia um bloco, numerado na ordem em que aparece.
- Slides entre a capa e a primeira abertura formam a introdução, sem quadrado próprio; neles, todos os quadrados aparecem em contorno.
- Estado dos quadrados em cada slide: blocos anteriores em `tinta`, o bloco do slide em `azul`, os seguintes em contorno de 2 px em `tinta`. No encerramento, todos em `tinta`.
- Cabeçalho: quadrados de 16 px espaçados de 8 px, à direita, seguidos do contador; clicar num quadrado leva à abertura do bloco.
- **Abertura:** fileira de quadrados a partir de y = 96, alinhada à esquerda, com calhas de 24 px e lado igual ao menor entre 160 px e o que cabe na largura útil (123 px com 8 blocos). O bloco atual é campo `amarelo` com o número em `tinta` (Geist 600, 55 % do lado); os nomes curtos ficam 16 px abaixo dos quadrados, em rótulo de 14 px. O `h2` e a pergunta formam um conjunto alinhado à esquerda, cuja base fica em y = 652 e cujo topo não sobe acima de y = 360. "Bloco N de M", em rótulo grande, fica alinhado à direita, na altura da primeira linha do `h2`, numa faixa reservada de 220 px.
- **Capa:** `h1` a partir de y = 96; a linha de metadados logo abaixo; o roteiro da aula (quadrados de 24 px com os nomes curtos em rótulo de 14 px) terminando antes de y = 520; a faixa de marca embaixo (seção 4.5).
- **Encerramento:** cabeçalho com o mapa; `h2` a partir de y = 96; conteúdo até y = 520; faixa de marca no lugar do rodapé.
- **Quantidade de blocos:** de 2 a 8, fileira de quadrados. Com 9 ou mais, o cabeçalho troca a fileira por "Bloco N de M" em rótulo; a abertura mostra só o número do bloco atual num campo amarelo de 160 px; a capa mostra o roteiro como lista numerada de nomes curtos em rótulo, em até duas linhas. Com 0 ou 1 bloco, não há mapa, e o validador avisa.

### 5.5. Vocabulário

**HTML dentro de `section`:** `h1`, `h2`, `p`, `br`, `strong`, `em`, `sub`, `sup`, `a`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `figure`, `figcaption`, `img`, `svg`, `pre`, `code`, `aside`, `div` e `span`; na fase 2, também `script` com `type="application/json"` dentro de `figure.grafico` ou com `type="text/vnd.graphviz"` dentro de `figure.diagrama`.

| onde | classes | atributos |
|---|---|---|
| `section` | — | `data-layout`, `id`, `data-curto` (só abertura), `data-pdf="passos"` |
| títulos | `span.sinal` (só em `h1` e `h2`) | — |
| texto | `p.lide`, `p.pergunta`, `p.afirmacao`, `p.fonte`, `p.proxima` | `lang` em qualquer elemento de texto |
| estrutura | `div.colunas` | `data-grade` |
| campos | `aside.destaque`, `aside.quadro`, `aside.alerta` | `data-rotulo` |
| exercício | `div.exercicio`, `div.enunciado`, `div.resposta` | — |
| listas | `ol.passos`, `ol.sintese` | — |
| tabela | `tr.destaque`, `td.destaque` | `colspan`, `rowspan`, `scope` |
| figura | — | `data-foto="pb"` em `figure`; `src` e `alt` (obrigatório) em `img` |
| código | — | `data-lang`, `data-linhas`, `data-numeros` em `pre` |
| passos | — | `data-passo` (vazio ou inteiro ≥ 1) em qualquer elemento do corpo |
| demo | `div.demo`, `img.estatico` | `data-demo`, `data-opcoes`; fase 2: `data-captura-ms` |
| notas | `aside.notas` | — |
| fase 2 | `figure.grafico`, `figure.diagrama` | — |
| links | — | `href` começando com `#` ou `https://` |

`src` de `img` é um caminho relativo (`img/…`) ou um URI `data:`. Um `src` com `https://` gera aviso (`recursos.imagem-externa`), porque não funciona em artifacts nem offline, e é embutido pelo build se o autor autorizar o download; sem autorização, vira erro de saída.

**SVG inline**, só dentro de `figure`:

- elementos: `svg`, `g`, `path`, `line`, `polyline`, `polygon`, `rect`, `circle`, `ellipse`, `text`, `tspan`, `title`, `desc`, `defs`, `marker`, `use`, `clipPath`;
- atributos: `viewBox`, `width`, `height`, `d`, `x`, `y`, `x1`, `y1`, `x2`, `y2`, `cx`, `cy`, `r`, `rx` e `ry` (só em `ellipse`), `points`, `transform`, `fill`, `stroke`, `stroke-width`, `stroke-dasharray`, `stroke-linecap`, `stroke-linejoin`, `marker-start`, `marker-end`, `markerWidth`, `markerHeight`, `refX`, `refY`, `orient`, `text-anchor`, `dominant-baseline`, `font-size`, `font-weight`, `clip-path`, `id`, `href` (só `#id`), `role`, `aria-label`;
- cores: `fill` e `stroke` só com os hexadecimais dos tokens (`#0A0A0A`, `#666666`, `#D9D9D9`, `#1094AB`, `#FCB421`, `#FFFFFF`) ou `none`;
- texto em SVG usa Geist; com `class="mono"`, usa Geist Mono.

**Proibido em qualquer lugar do corpo:** atributo `style`, elemento `style`, atributos de evento (`onclick` e afins), `iframe`, `video`, `audio`, `font`, `foreignObject`, `image`, gradientes, filtros, máscaras, padrões, `opacity` e suas variantes, e comandos de cor e de estilo em TeX (`\color`, `\textcolor`, `\colorbox`, `\fcolorbox`, `\htmlStyle`, `\htmlClass`, `\htmlId`); de `\htmlData`, só o gerado por `\passo`.

Scripts de demos ficam fora das `section`: `<script src="demos/<nome>.js">` no modo build, ou um `<script>` inline só com registros `AulaUSP.demo(...)` no modo navegador. O conteúdo que uma demo cria dentro da sua `div.demo` fica fora do contrato de vocabulário — inclusive os controles do sistema da fase 2 (seção 7.2), que a demo cria com `AulaUSP.controles` e o autor não escreve no fonte.

### 5.6. `contrato.json`

O contrato é dado, não prosa. Forma:

```json
{
  "versao": 1,
  "blocosDeCorpo": ["p", "ul", "ol.passos", "aside.destaque", "aside.quadro", "aside.alerta",
                    "div.exercicio", "table", "pre", "figure", "tex-destaque"],
  "layouts": {
    "conteudo": {
      "sequencia": ["h2", "p.lide?", "div.colunas | blocosDeCorpo+"],
      "limites": { "h2.caracteresPorSegmento": 50, "h2.segmentos": 2, "corpo.palavras": 90,
                   "coluna.palavras": 60, "lista.itens": 5, "destaque.max": 2, "alerta.max": 1 }
    }
  },
  "papeis": { "leitura": { "seletores": ["p", "li", "th", "td"], "minimo": 24 } },
  "classes": { "span.sinal": { "dentro": ["h1", "h2"] } },
  "atributos": { "data-grade": ["12", "6-6", "8-4", "4-8", "4-4-4"] },
  "regras": { "limites.titulo": { "severidade": "erro", "acao": "Corte ou divida em dois slides." } }
}
```

O validador lê este arquivo, e as tabelas de layouts, vocabulário, papéis e regras do guia são geradas dele.

## 6. Motor

### 6.1. Palco

O palco de 1280 × 720 é escalado por `min(largura / 1280, altura / 720)` e centralizado. Trocar de slide e revelar um passo são cortes secos, sem animação.

### 6.2. Navegação

| tecla ou gesto | ação |
|---|---|
| →, espaço, PageDown | revela o próximo passo; sem passos pendentes, avança o slide |
| ←, PageUp | esconde o último passo revelado; sem passos revelados, volta o slide |
| Home, End | primeiro e último slide |
| 1 a 8 | abertura do bloco correspondente |
| Esc | fecha o painel aberto; sem painel aberto, abre a visão geral |
| N | painel de notas no próprio palco |
| P | janela do apresentador |
| V | painel do validador (modo navegador) |
| F | tela cheia |
| ? | ajuda |
| clique nas faixas laterais (12 % da largura cada) | volta ou avança |
| clique num quadrado do mapa | abertura do bloco |

As teclas são ignoradas quando o foco está num controle de demo. Passadores de slide que enviam PageUp e PageDown funcionam sem configuração.

### 6.3. URL

`#<id>` identifica o slide e `#<id>/<n>`, o passo; a barra de endereço acompanha a navegação, e recarregar mantém a posição. Capa e encerramento recebem os ids `capa` e `encerramento` quando não têm um. Os demais slides sem `id` recebem um gerado do título, com aviso do validador.

### 6.4. Passos

- Qualquer elemento do corpo com `data-passo` é um passo.
- Num mesmo slide, ou todos os passos têm número ou nenhum tem; misturar é erro. Sem número, a ordem é a do documento. Com número, a ordem é a numérica, e elementos de mesmo número aparecem juntos.
- `\passo{n}{…}` em TeX gera um passo de número `n` dentro da equação. A macro é definida como `\htmlData{passo=#1}{#2}`, com o `trust` do KaTeX restrito a `\htmlData`. Por ter número, obriga os demais passos do slide a terem número.
- Passos ocultos usam `visibility: hidden`: nada se move ao revelar, e o transbordo é medido no estado final.
- Um slide começa sem passos revelados. Ao voltar de um slide seguinte, ele aparece com todos os passos revelados.

### 6.5. Notas, visão geral e ajuda

- Notas (N): painel de 380 px à direita, com texto de 20 px, para quem usa uma tela só.
- Visão geral (Esc): cartões agrupados por bloco, com número, título e o quadrado do bloco; clicar navega.
- Ajuda (?): a tabela de teclas.

### 6.6. Janela do apresentador

A tecla P abre, com `window.open`, o mesmo documento em modo apresentador, com:

- o slide atual e o próximo estado (próximo passo ou próximo slide), em miniaturas fiéis;
- as notas do slide em 24 px;
- cronômetro (iniciar, pausar, zerar), relógio e "slide 12 / 40 · passo 2 / 3";
- o mapa de blocos.

As janelas se sincronizam por `postMessage` entre a janela do apresentador e a que a abriu, o que funciona também com `file://`. Navegar em qualquer uma move as duas; se uma for recarregada, a sincronia é refeita por troca de mensagens. Se o navegador bloquear a nova janela, o motor abre o painel de notas e explica o bloqueio no próprio painel.

### 6.7. Demos (fase 1)

```js
AulaUSP.demo('hopfield', {
  montar(raiz, opcoes) { /* cria a interface dentro de raiz */ },
  iniciar() { /* ao entrar no slide */ },
  parar() { /* ao sair do slide */ },
  capturar() { /* opcional: devolve um canvas ou data URL para o PDF */ }
});
```

`montar` roda uma vez, na primeira entrada no slide, com `opcoes` lido de `data-opcoes`; `iniciar` e `parar`, a cada entrada e saída. Nenhuma demo roda com o slide fora da tela. A imagem da demo no PDF vem de `img.estatico` ou de `capturar()`; sem as duas, o PDF mostra um `quadro` com "Demo interativa: abra o HTML". Na fase 2, o build passa a capturar a imagem sozinho (seção 7.2).

### 6.8. Rótulos

Os textos do sistema ("Introdução", "Encerramento", "Bloco", "de", "Exercício", "Resposta", "Próxima aula", "Notas", a ajuda e o painel do validador) existem em `pt-BR` e `en` e são escolhidos pelo `lang` da aula. As mensagens do validador são só em português.

### 6.9. Impressão

`AulaUSP.prepararImpressao()` revela todos os passos ou, nos slides com `data-pdf="passos"`, gera uma cópia do slide para cada estado, do estado sem passos revelados até o último; troca as demos pela imagem estática e esconde painéis. `AulaUSP.restaurarImpressao()` desfaz tudo. No navegador, o motor chama as duas nos eventos `beforeprint` e `afterprint`; no build, `prepararImpressao()` é chamada explicitamente antes de gerar o PDF.

Número de páginas esperado: 1 por slide, mais, em cada slide com `data-pdf="passos"`, o número de passos desse slide (um slide com três passos gera quatro páginas). O CSS de impressão está na seção 8.4.

## 7. Componentes

### 7.1. Fase 1

| componente | forma | regras |
|---|---|---|
| `aside.destaque` | campo `amarelo`, padding de 16 px na vertical e 24 px na horizontal, rótulo em Geist Mono 14 caixa alta vindo de `data-rotulo` | definições e resultados-chave |
| `aside.quadro` | contorno de 2 px em `tinta`, mesmo padding e rótulo | exemplos, observações, esboço de prova |
| `aside.alerta` | campo `tinta`, texto `papel`, mesmo padding e rótulo | erro comum, cuidado |
| `div.exercicio` | `div.enunciado` com a forma de `quadro` e rótulo "Exercício"; `div.resposta` com rótulo "Resposta" | a resposta costuma ser passo; no PDF sai revelada, salvo `data-pdf="passos"` |
| `ol.passos` | numerais Geist 600 de 40 px e régua de 2 px acima de cada item | — |
| `ul` | marcador quadrado de 8 px em `tinta` | — |
| `ol.sintese` | forma de `ol.passos` | só no encerramento |
| tabela | `regua-forte` no topo e na base, `regua` sob o cabeçalho, linhas de 1 px em `linha`; células numéricas alinhadas à direita, com algarismos tabulares, sendo numérica a célula cujo texto é só um número, com sinal, separador de milhar, vírgula ou ponto decimal e, opcionalmente, `%` ou o prefixo `R$`; `tr.destaque` e `td.destaque` em campo `amarelo` | — |
| figura | imagem sem borda, sombra ou raio, contida na zona de conteúdo; `figcaption` de 18 px em `cinza`; `data-foto="pb"` aplica tons de cinza | `alt` obrigatório |
| código | `pre[data-lang]` em Geist Mono 20 px com `regua` acima; tema monocromático (palavras-chave 600, comentários em `cinza`, o resto em `tinta`); `data-linhas="3-5,8"` marca linhas em campo `amarelo`; `data-numeros` mostra números de linha em `cinza`; `code` no meio de texto usa Geist Mono a 0,88em | linguagens: python, r, sql, javascript, bash, json, latex |
| matemática | `\( … \)` no texto; `\[ … \]` alinhado à esquerda, a 1,1 × o corpo; `\tag` permitido; `\passo{n}{…}` dentro de `aligned` | sem comandos de cor e estilo (seção 5.5) |

Os limites de cada componente estão na tabela de limites da seção 5.3.

O destaque de código usa o Shiki (núcleo, motor de expressões regulares em JavaScript e sem WASM, gramáticas por linguagem) com um tema próprio gerado dos tokens; o mesmo marcador roda no navegador e no build. A matemática usa o KaTeX: no build, com `throwOnError` ligado, e o erro vira mensagem do validador; no navegador, a equação inválida aparece no lugar como um `alerta` com o trecho, e a mesma mensagem vai para o painel.

### 7.2. Fase 2

**Gráficos.** `figure.grafico` traz a especificação em JSON:

```html
<figure class="grafico">
  <script type="application/json">
  { "tipo": "linha", "dados": "data/erro.csv", "x": "epoca", "y": ["treino", "teste"], "foco": "teste",
    "eixos": { "x": "época", "y": "erro" }, "faixas": [{ "x": [120, 245], "rotulo": "platô" }] }
  </script>
  <figcaption>Erro de treino e de teste ao longo das épocas.</figcaption>
</figure>
```

- Tipos: `linha`, `barras`, `dispersao` e `histograma` (com `"classes"`). Escala `linear` ou `log` por eixo.
- `dados`: caminho de um CSV, relativo à pasta da aula, ou objeto de colunas inline, como `{"epoca": [...], "treino": [...]}`. O caminho vale sempre que a aula tem os seus arquivos ao lado — no build, em `aula-usp servir` e em `aula-usp validar`, que leem o CSV pelo mesmo parser; o inline é necessário no modo navegador sem arquivos, como num artifact do Claude.
- Séries: no máximo 3. Com uma série, ela sai em `tinta`. Com duas ou três, a série em foco (campo `foco`; na falta dele, a última de `y`) sai em `azul`, e as demais em `tinta` e em `cinza` tracejada, nessa ordem.
- Em `dispersao`, `"linhas"`: a lista das séries de `y` a desenhar como reta contínua (o mesmo traço de `linha`) em vez de pontos — a reta ajustada sobre a nuvem, por exemplo.
- Eixos em `tinta` de 2 px; marcas e rótulos em Geist Mono 14 `cinza`; grade horizontal em `linha`; faixas em `amarelo`, atrás das séries, com rótulo em `tinta`. Em `linha` e `dispersao`, os limites dos eixos são arredondados (`.nice()`), para nenhum ponto cair exatamente sobre a borda do gráfico.
- O `viewBox` do gráfico tem 640 de largura, e o texto de 14 só chega aos 14 px da seção 4.3 numa figura com pelo menos 14 × 640 / 14 = 640 px de largura no palco: o layout `figura` (775 px) e a coluna de 8 (760 px) servem; as colunas de 6 (564 px) e de 4 (368 px), não, e `composicao.tamanho-minimo` acusa o gráfico nelas.
- Cada série é rotulada na ponta, em `tinta`, precedida de um traço de 16 px na cor da série, porque texto em `azul` só vale a partir de 32 px. Não há caixa de legenda.
- O SVG é gerado com `d3-array`, `d3-scale` e `d3-shape`, pelo mesmo módulo nos dois modos.
- `aula-usp.mplstyle`, gerado dos tokens, serve às figuras feitas em notebooks: ciclo de cores `tinta`, `azul` e `cinza`; eixos de 2 px sem bordas superior e direita; grade horizontal em `linha`; Geist quando instalada no sistema.

**Diagramas.** `figure.diagrama` traz DOT:

```html
<figure class="diagrama">
  <script type="text/vnd.graphviz">
  digraph { rankdir=LR; entrada -> oculta -> saida; oculta [class="foco"]; }
  </script>
  <figcaption>Rede com uma camada oculta.</figcaption>
</figure>
```

- O layout é do Graphviz (`@hpcc-js/wasm-graphviz`); o estilo é imposto depois: nós retangulares com contorno de 2 px em `tinta`, texto Geist 20 px, setas simples de 2 px; `class="foco"` num nó vira campo `amarelo`, e `class="ativo"` numa aresta vira `azul`.
- A direção padrão é `rankdir=LR`, da esquerda para a direita, porque o palco é 16:9; um `rankdir` escrito pelo autor vence.
- Até 15 nós; acima disso, aviso.
- O WASM tem de ir dentro do script; se o pacote do Graphviz não o embutir, o bundle do Aula USP embute.

**Demos.** Entram os controles do sistema, em `componentes/controles.js` e no CSS: `button.controle` (retangular, contorno de 2 px, Geist 600 20 px; ativo em campo `tinta` com texto `papel`), `input.controle[type=range]` (trilho de 2 px em `linha`, cursor quadrado de 16 px em `tinta`) e `output.leitura` (Geist Mono 20 px). A demo os cria dentro da sua `div.demo`, no `montar`, com `AulaUSP.controles` — `botao(raiz, texto, aoClicar)`, `alternar(botao, ativo)`, `deslizante(raiz, { min, max, passo, valor, rotulo }, aoMudar)`, `leitura(raiz, valor, { casas })` e `escrever(leitura, valor, { casas })`, que formata o número no idioma da aula —; como todo conteúdo criado pela demo, eles ficam fora do vocabulário do fonte (seção 5.5), e as classes `controle` e `leitura` são classes do sistema. Entra também a captura automática no build (`build/captura.mjs`): para demos sem `img.estatico` e sem `capturar()`, o Chrome headless fotografa a `div.demo` depois de `iniciar()` e de `data-captura-ms` (padrão 3000 ms). A foto é tirada no `<slug>.html` da etapa 4, com o motor montando e iniciando a demo ao navegar até o slide, e entra nele como `img.estatico` antes do PDF. Uma demo que o build não consegue fotografar (sem registro na página, erro ao montar ou iniciar, `div.demo` sem tamanho ou foto de uma cor só) não é silêncio: o build a nomeia, com o motivo, e ela sai no PDF com o quadro "Demo interativa: abra o HTML" (seção 6.7).

## 8. Build, CLI e PDF

### 8.1. Comandos

| comando | faz |
|---|---|
| `aula-usp novo <pasta> --unidade ime` | copia `modelos/aula/` com os metadados preenchidos |
| `aula-usp validar <pasta> [--json]` | roda as regras estáticas e de carga e, havendo Chrome, as de composição |
| `aula-usp build <pasta> [--sem-pdf]` | roda o pipeline completo (seção 3.3) |
| `aula-usp servir <pasta> [--porta 8765]` | serve a aula com o runtime local de `dist/`, para desenvolver e para usar o modo navegador sem publicar |
| `aula-usp dist` | gera os scripts de `dist/` e `validador/cobertura.json` (manutenção do sistema) |
| `aula-usp pacotes` | gera `pacotes/`, reescreve a tag do runtime (versão e `integrity`) em `modelos/`, `especime/` e `exemplos/`, e checa limites e consistência (manutenção do sistema) |

Códigos de saída: 0 sem erros (avisos permitidos); 1 com erros de validação; 2 com falha de ambiente, como arquivo ou dependência ausente. Falta de Chrome não é falha: vira aviso e pula composição e PDF.

`servir` e `build` reconhecem a tag do runtime pelo `src` terminado em `/aula-usp.js`. `servir` troca o endereço pelo local e remove o `integrity`; `build` troca a tag pelo motor embutido.

Instalação: antes da publicação (fases 1 e 2), `npm link` no repositório do sistema põe `aula-usp` no PATH. Depois da publicação, `npm install -g aula-usp`.

### 8.2. Dependências

Node 20 ou superior. Pacotes: `katex`, `shiki`, `linkedom`, `playwright-core` (usa o Google Chrome instalado, pelo canal `chrome`, ou o executável indicado em `CHROME_PATH`, sem baixar navegador) e `pdf-lib` (metadados do PDF). Desenvolvimento: `esbuild`, `fontkit` (leitura do `cmap` dos woff2 em `aula-usp dist`), `pixelmatch` e `pngjs`. Fase 2: `d3-array`, `d3-scale`, `d3-shape` e `@hpcc-js/wasm-graphviz`. Não há Python.

### 8.3. Fontes e marcas

`build/fontes.mjs` baixa uma vez, do Google Fonts, os woff2 de Geist, Geist Mono e Open Sans (subconjuntos latin e latin-ext) e grava em `assets/fontes/`, com as licenças; os arquivos entram no repositório. As marcas seguem a seção 4.5. Os dois downloads acontecem na fase 1, com autorização do autor.

### 8.4. PDF

CSS de impressão: `@page { size: 1280px 720px; margin: 0 }`, um slide ou estado por página (seção 6.9), e sem notas, painéis, faixas de clique ou cursor.

No build, `playwright-core` abre o HTML final, chama `AulaUSP.prepararImpressao()` e gera o PDF com fundo impresso, o tamanho de página do CSS e, quando a versão do Chrome oferecer, estrutura marcada e marcadores. Depois, `pdf-lib` grava título (do `<title>`), autor (professor), assunto (disciplina) e idioma. No modo navegador, o guia orienta a usar o Chrome, "Salvar como PDF" e margens "Nenhuma".

## 9. Validador

### 9.1. Mensagens

```
ERRO · slide 7 #culpa · limites.titulo · título com 62 caracteres num segmento (máx. 50). Corte ou divida em dois slides.
AVISO · slide 12 #residuos · estrutura.notas-ausentes · slide sem notas do apresentador. Acrescente <aside class="notas">.
```

Cada mensagem traz severidade, número e `id` do slide, regra, problema e ação, com o trecho quando houver. `--json` produz a mesma lista como objetos `{ severidade, slide, id, regra, mensagem, acao, trecho }`. No navegador, o painel copia o texto com um cabeçalho ("Validador Aula USP: N erros, M avisos"). Erros bloqueiam o build; avisos, não.

### 9.2. Regras

| regra | severidade | verifica |
|---|---|---|
| `estrutura.primeiro-slide` | erro | a primeira `section` é `capa` |
| `estrutura.ultimo-slide` | erro | a última `section` é `encerramento` |
| `estrutura.layout` | erro | `data-layout` existe no contrato |
| `estrutura.metadados` | erro | metas obrigatórias presentes e válidas (seção 5.2) |
| `estrutura.obrigatorio` | erro | elemento obrigatório do layout ausente (seção 5.3) |
| `estrutura.fora-do-layout` | erro | elemento fora do conteúdo permitido do layout, ou fora de ordem |
| `estrutura.colunas` | erro | número de filhos de `div.colunas` diferente do de `data-grade` |
| `estrutura.blocos` | aviso | menos de 2 aberturas, ou 9 ou mais (o mapa vira contador) |
| `estrutura.id-duplicado` | erro | ids únicos |
| `estrutura.id-ausente` | aviso | slide sem `id`, fora capa e encerramento (gerado do título) |
| `estrutura.nome-curto` | erro | abertura com `h2` acima de 10 caracteres e sem `data-curto` |
| `estrutura.passos-mistos` | erro | slide que mistura passos com e sem número |
| `estrutura.notas-ausentes` | aviso | `conteudo`, `afirmacao`, `figura` ou `demo` sem notas |
| `vocabulario.elemento` | erro | elemento HTML ou SVG fora das listas da seção 5.5 |
| `vocabulario.classe` | erro | classe fora do contrato |
| `vocabulario.atributo` | erro | atributo ou valor fora do contrato, em HTML ou SVG |
| `vocabulario.style` | erro | atributo `style` ou elemento `style` no corpo |
| `vocabulario.cor-svg` | erro | `fill` ou `stroke` fora dos tokens |
| `vocabulario.amarelo-svg` | erro | `amarelo` em texto de SVG, ou em traço com menos de 4 px no `stroke-width` do fonte, em unidades do `viewBox` |
| `vocabulario.azul-svg` | erro | `azul` em texto de SVG com menos de 32 no `font-size` do fonte, em unidades do `viewBox`; condição necessária, não suficiente: o tamanho no palco é de `composicao.azul-pequeno` |
| `vocabulario.script` | erro | script dentro de `section` fora dos tipos permitidos |
| `limites.titulo`, `limites.segmentos-titulo`, `limites.nome-curto`, `limites.pergunta`, `limites.lide`, `limites.palavras-corpo`, `limites.palavras-coluna`, `limites.itens`, `limites.destaques`, `limites.alertas`, `limites.rotulo`, `limites.afirmacao`, `limites.fonte`, `limites.legenda`, `limites.sintese`, `limites.proxima`, `limites.codigo-linhas`, `limites.codigo-colunas`, `limites.tabela`, `limites.metadado` | erro | cada limite das seções 5.2 e 5.3 |
| `composicao.transbordo` | erro | elemento fora da zona de conteúdo do layout ou do palco, medido no estado final |
| `composicao.linhas-titulo` | erro | título com mais linhas renderizadas que o permitido |
| `composicao.tamanho-minimo` | erro | texto abaixo do mínimo do seu papel, com as exceções da seção 4.3; texto de SVG no tamanho do palco, um achado por figura |
| `composicao.azul-pequeno` | erro | texto em `azul` abaixo de 32 px; em SVG, pelo `fill` e no tamanho do palco, um achado por figura |
| `composicao.texto-no-amarelo` | erro | texto sobre `amarelo` em cor diferente de `tinta` |
| `matematica.tex-invalido` | erro | TeX que o KaTeX não compila, com a mensagem e o trecho |
| `matematica.comando-proibido` | erro | comando de cor ou de estilo em TeX (seção 5.5) |
| `matematica.simbolo-fora-do-tex` | erro | caractere sem glifo nas fontes embutidas, fora de TeX e de código |
| `matematica.cifrao-suspeito` | aviso | `$…$` com `\`, `^` ou `_` dentro |
| `recursos.imagem` | erro | imagem ausente (build) ou que falhou ao carregar (navegador) |
| `recursos.imagem-externa` | aviso | `img` com `src` em `https://` |
| `recursos.alt` | erro | `img` sem `alt` |
| `recursos.demo-sem-registro` | erro | `data-demo` sem `AulaUSP.demo` correspondente |
| `recursos.demo-sem-estatico` | aviso | demo sem `img.estatico` e sem `capturar()`; na fase 2, só no modo navegador, porque o build captura — e, no build, a demo que a captura não conseguiu fotografar, com o motivo |
| `recursos.linguagem` | erro | `data-lang` fora da lista da seção 7.1 |
| `recursos.csv` | erro | CSV de gráfico ausente (fase 2) |
| `recursos.grafico` | erro | JSON de gráfico inválido (fase 2) |
| `recursos.dot` | erro | DOT que não compila, ou que pede o que o sistema desenharia de outro jeito: classe fora de `foco` num nó e `ativo` numa aresta, `style=invis`, `shape=record` ou `Mrecord`, rótulo HTML, `headlabel`, `taillabel`, `xlabel`, `label` no grafo ou num subgrafo que não é agrupamento, `fontsize`, `fontname`, `fixedsize`, `width`, `height` ou `margin`, e mais de um grafo no mesmo bloco (fase 2) |
| `recursos.diagrama-grande` | aviso | diagrama com mais de 15 nós (fase 2) |
| `saida.referencia-externa` | erro | recurso carregado de fora do HTML final (`src`, `href` de folha de estilo, `url()`); links `<a href="https://…">` não contam |
| `saida.tamanho` | aviso | HTML final acima de 10 MB |
| `saida.glifo-ausente` | erro | caractere do HTML final sem glifo nas fontes embutidas |
| `saida.pdf-paginas` | erro | número de páginas do PDF diferente do esperado (seção 6.9) |

As regras de fase 2 entram no validador com os recursos correspondentes; todas as demais são da fase 1.

### 9.3. Quando e sobre o quê cada grupo roda

| grupo | sobre | navegador | build |
|---|---|---|---|
| estáticas: `estrutura`, `vocabulario`, `limites`, `matematica.comando-proibido`, `matematica.simbolo-fora-do-tex`, `matematica.cifrao-suspeito`, `recursos.alt`, `recursos.imagem-externa`, `recursos.linguagem`, `recursos.grafico` | o fonte, sem cromo e sem HTML renderizado | passo 3 da seção 3.2, sobre a cópia do corpo | etapa 1 da seção 3.3 |
| de carga: `matematica.tex-invalido`, `recursos.imagem`, `recursos.demo-sem-registro`, `recursos.demo-sem-estatico`, `recursos.csv`, `recursos.dot`, `recursos.diagrama-grande` | o fonte, depois de carregar bibliotecas, imagens e scripts | passo 6, depois do `load` | etapa 1: KaTeX e Graphviz rodam no Node, arquivos são checados no disco, e registros de demo são procurados no texto dos scripts (`AulaUSP.demo('<nome>'`) |
| composição: `composicao.*` | o documento montado e renderizado, no estado final | passo 6, depois de `montar`, da renderização e de `document.fonts.ready` | etapa 5, no Chrome headless |
| saída: `saida.*` | o HTML e o PDF finais | não roda | etapas 4 a 7 |

As regras estáticas de SVG (`vocabulario.azul-svg`, `vocabulario.amarelo-svg`) leem `font-size` e `stroke-width` no fonte, em unidades do `viewBox`, e são condição necessária e barata. O tamanho com que o texto de SVG aparece no palco depende da largura da figura, que só o documento montado tem; por isso quem fecha a seção 4.2 e o mínimo de rótulo para texto de SVG são `composicao.azul-pequeno` e `composicao.tamanho-minimo`.

`validador/cobertura.json`, gerado por `aula-usp dist` a partir do `cmap` dos woff2 embutidos, é a fonte única do conjunto de caracteres com glifo. `matematica.simbolo-fora-do-tex` e `saida.glifo-ausente` usam esse arquivo.

## 10. Guia e pacotes

### 10.1. Fonte do guia

`guia/`, em português:

| arquivo | conteúdo |
|---|---|
| `00-principios.md` | o que é o Aula USP e o bloco de regras essenciais: papéis das cores, uma ideia por slide, limites, nada de `style`, matemática em TeX |
| `10-estrutura.md` | esqueleto, metadados e blocos |
| `20-layouts.md` | tabelas geradas do contrato e um exemplo por layout |
| `30-componentes.md` | trechos prontos de cada componente |
| `40-matematica-e-codigo.md` | delimitadores, `\passo`, derivações, código e linhas marcadas |
| `50-graficos-diagramas-demos.md` | demos (fase 1) e gráficos, diagramas e controles (fase 2) |
| `60-validador.md` | tabela de regras gerada e como corrigir cada uma |
| `70-fluxo-terminal.md` | instalar a CLI, escrever, rodar `aula-usp build`, ler as mensagens, corrigir |
| `71-fluxo-chat.md` | escrever o HTML com a tag do runtime, abrir, copiar as mensagens, corrigir, imprimir |
| `72-artifact-claude.md` | criar a aula como artifact no claude.ai, e o que não funciona dentro dele (seção 14) |
| `73-chatgpt.md` | entregar arquivo `.html` para download ou, se não houver download, um único bloco de código |
| `pacotes/skill.md` | metadados (nome, descrição) e procedimento curto do `SKILL.md` |
| `pacotes/projeto-claude.md` | instruções do Projeto do Claude |
| `pacotes/gpt-instrucoes.md` | instruções do GPT personalizado, escritas para caber em 8.000 caracteres depois de montadas |
| `pacotes/gpt-iniciadores.md` | iniciadores de conversa do GPT |
| `pacotes/agents-disciplina.md` | trecho de `AGENTS.md` para os repositórios das disciplinas |

O bloco de regras essenciais de `00-principios.md` fica entre marcadores e entra, literalmente, em todos os pacotes. O procedimento do `SKILL.md` diz ao agente, antes de tudo, para checar se `aula-usp` responde no terminal; se não responder, trabalhar no modo navegador e pedir ao autor que instale a CLI (seção 8.1).

### 10.2. Saídas geradas

| saída | conteúdo | uso |
|---|---|---|
| `pacotes/skill/aula-usp/` | `SKILL.md` com os metadados do padrão Agent Skills e o procedimento; `references/` com o guia completo; `assets/modelo.html` e `assets/exemplo.html`; o acervo, em `contrato/contrato.json` e `especime/` | Claude Code, claude.ai, Codex CLI e ChatGPT, sem alteração |
| `pacotes/claude/projeto/` | `instrucoes.md`; `conhecimento/` com o guia num arquivo, o modelo, o exemplo e o acervo | Projetos do Claude, com a aula como artifact |
| `pacotes/gpt/gpt-personalizado/` | `instrucoes.txt` com até 8.000 caracteres; `conhecimento/` com o guia num arquivo, o modelo, o exemplo e o acervo; `iniciadores.txt` | GPT personalizado |
| `pacotes/repositorio-de-disciplina/` | trecho de `AGENTS.md` e `CLAUDE.md` com `@AGENTS.md` | repositórios das disciplinas |

**O acervo** são os arquivos que o guia manda abrir: `contrato/contrato.json` e os decks de `especime/`. Eles viajam nos três pacotes que levam o guia, no MESMO caminho que têm no repositório — é isso que faz o ponteiro do guia resolver sem reescrita. Entraram no marco 7 para fechar um achado medido do aceite: um agente com só o pacote relatou que os endereços citados pelo guia não existiam para ele, e sem o acervo cada pacote de chat saía com **8 citações falsas do contrato e 32 ponteiros mortos para o espécime**. O modelo e o exemplo são a exceção, porque o pacote já os levava com outro nome.

`exemplo.html` é `exemplos/descida-do-gradiente/`. Na fase 2, entra também `exemplo-recursos.html`, de `exemplos/regressao-linear/`. Na raiz do sistema ficam `AGENTS.md` (comandos, testes e regras para desenvolver o Aula USP) e `CLAUDE.md` com `@AGENTS.md`.

### 10.3. Exemplos e modelo

- `modelos/aula/index.html`: o esqueleto da seção 5.1, com capa, duas aberturas, um slide de conteúdo por bloco e encerramento.
- `especime/`: todos os layouts e componentes, cada limite no máximo permitido e uma demo simples com `img.estatico`; é a referência visual e a base dos testes de integração.
- `exemplos/descida-do-gradiente/`: aula real de 10 a 12 slides, com três blocos, uma derivação passo a passo, um trecho de Python, um exercício e notas; a prosa segue o skill `rv-writing-style`.
- `exemplos/regressao-linear/` (fase 2): usa gráfico, diagrama e demo.

## 11. Testes e aceite

### 11.1. Unitários (`node:test`)

- tokens: `tokens.css` e o módulo JS coincidem com o JSON;
- blocos: introdução sem bloco, 2 a 8 blocos, 9 ou mais, estado dos quadrados em cada slide;
- TeX: `\( \)` e `\[ \]` reconhecidos; "R$ 100" não vira matemática; TeX dentro de `pre` é ignorado; comandos proibidos detectados;
- `\passo`: gera `data-passo` dentro do `aligned` sem quebrar o alinhamento;
- código: palavras-chave, comentários e linhas marcadas no tema;
- validador: cada regra com `tests/fixtures/validador/<regra>/bom.html` e `ruim.html`;
- cobertura de glifos: `cobertura.json` contém o latin e não contém o grego, e `δ` fora de TeX gera `matematica.simbolo-fora-do-tex`;
- pacotes: `instrucoes.txt` do GPT com até 8.000 caracteres; bloco de regras essenciais idêntico em todos os pacotes; versão e `integrity` das tags iguais à versão do `package.json` e ao hash de `dist/aula-usp.js`;
- contagem de páginas esperada, com e sem `data-pdf="passos"`;
- fase 2: especificações de gráfico e DOT convertidas em SVG, comparadas com snapshots.

### 11.2. Integração (Chrome headless, sobre `especime/`)

- teclado, passos, URL com passo, saltos de bloco e clique nos quadrados;
- janela do apresentador aberta e sincronizada nos dois sentidos;
- modo navegador (via `servir`) e modo build visualmente iguais: captura de cada slide nos dois modos, comparada com `pixelmatch`, limiar 0,1 e no máximo 0,5 % de pixels diferentes por slide, com a área das demos mascarada;
- PDF: número de páginas esperado, páginas de 1280 × 720, fontes embutidas e metadados;
- tamanhos de `dist/` medidos e registrados, com metas de 700 KB para `aula-usp.js`, 800 KB para `aula-usp-tex.js`, 600 KB para `aula-usp-codigo.js`, 120 KB para `aula-usp-graficos.js` e 1024 KB para `aula-usp-diagramas.js`; acima disso, o teste emite aviso. O satélite de diagramas é o maior porque leva o WASM do Graphviz dentro, e a spec 14 mediu num artifact um script de 819 KB — acima disso, ninguém mediu.

### 11.3. Aceite com modelos

`tests/aceite/roteiro.md` fixa um pedido ("Faça uma aula de 10 a 14 slides sobre passeio aleatório e difusão para a graduação, com três blocos, uma derivação passo a passo, um trecho de Python e um exercício"), num tema que não coincide com nenhum exemplo dos pacotes, e registra, por ambiente, os erros da primeira versão, as rodadas até zero erros e as observações visuais.

- Fase 1: Claude Code e Codex CLI, cada um só com `pacotes/skill/aula-usp/` e com a CLI instalada por `npm link`. Critério: zero erros em até três rodadas e revisão visual do autor.
- Fase 3: claude.ai (Projeto e artifact) e ChatGPT (GPT personalizado), com o runtime publicado. Mesmo critério.

## 12. Fases

Cada fase tem seu próprio plano de implementação.

### Fase 1. Núcleo

A fase 1 entrega o sistema completo sem gráficos, diagramas, controles e captura automática de demos. Marcos, em ordem de dependência, cada um com entrega testável:

1. **Fundamentos:** tokens e arquivos gerados; fontes; marcas, com as verificações da seção 4.5; `contrato.json`.
2. **Montagem e motor:** `montar`, os sete layouts, mapa de blocos, navegação, passos, notas, visão geral, ajuda, apresentador, API de demos e impressão; espécime navegável com `servir`.
3. **Componentes:** campos, exercício, listas, tabela, figura, código (Shiki) e matemática (KaTeX, `\passo`), nos dois modos.
4. **Validador:** regras estáticas, de carga e de composição da fase 1, painel do navegador, `validar` e `--json`, fixtures.
5. **Build e PDF:** embutir, motor embutido, PDF, regras de saída, comparação visual entre os modos, `dist` com SRI.
6. **Guia e pacotes:** guia, modelo, aula-exemplo, `pacotes`, `AGENTS.md` e `CLAUDE.md`.
7. **Aceite:** Claude Code e Codex CLI (seção 11.3).

### Fase 2. Recursos visuais

Entregas: gráficos e `aula-usp.mplstyle`; diagramas; controles de demo e captura automática no build; regras de validação correspondentes; guia e pacotes atualizados; `exemplos/regressao-linear/`. Aceite: testes verdes e essa aula validada, com uma demo sem imagem própria capturada no PDF.

### Fase 3. Publicação

Entregas: repositório no GitHub, com visibilidade decidida pelo autor; pacote npm `aula-usp` ou, se o nome estiver ocupado, com o escopo da conta do autor; tag do runtime com versão exata e hash de integridade no modelo, no espécime, nos exemplos e nos pacotes; aceite em claude.ai e ChatGPT. Toda ação externa depende de autorização explícita do autor no momento.

## 13. Fora do escopo

Tema Beamer; documentos A4; site de disciplina; modo escuro; transições e animações de slide; vídeo e áudio embutidos; recarga automática no `servir`; mensagens do validador em inglês; portar as aulas de Redes Neurais e de CompAtuaria, que fica para um projeto próprio.

## 14. Riscos e mitigações

| risco | mitigação |
|---|---|
| Artifacts do Claude bloqueiam CSS externo, downloads e WASM à parte | tudo embutido em scripts servidos pelo jsDelivr, divididos por recurso e com tamanhos medidos (seção 11.2) |
| Artifacts do Claude podem bloquear `window.open`, tela cheia e impressão | o apresentador cai no painel de notas (seção 6.6); o guia `72-artifact-claude.md` orienta baixar o HTML para projetar e imprimir |
| A política de segurança dos artifacts pode impedir compilar o WASM do Graphviz (fase 2) | verificar no início da fase 2; se bloquear, usar no modo navegador um layout em JavaScript puro (ELK) com o mesmo estilo, mantendo o Graphviz no build |
| Arquivo alterado na CDN ou versão maliciosa do pacote | versão exata e hash de integridade em todas as tags e cargas de scripts (seção 3.2); o modo build não usa CDN |
| Nome `aula-usp` ocupado no npm | pacote com o escopo da conta do autor; só a URL muda |
| Lockup preto do IME, de 2024, com o nome antigo do instituto | verificar antes de usar e perguntar ao autor (seção 4.5) |
| IFUSP só em PNG | PNG de maior resolução e pedido de versão vetorial à comunicação do IF |
| Geist sem grego, setas e operadores | `matematica.simbolo-fora-do-tex`, com a cobertura lida do `cmap`, e matemática sempre em TeX |
| Graphviz sem WASM embutido | o bundle do Aula USP embute |
| ChatGPT sem arquivo para download | o guia orienta um único bloco de código para salvar como `.html` |
| Codex em ambiente sem Chrome | o build degrada com aviso; `CHROME_PATH` documentado |
| Modelos mudam de versão | roteiro de aceite repetível (seção 11.3) |
| Navegadores que ignoram `@page` | o guia recomenda o Chrome para imprimir; o PDF do build não depende do navegador do usuário |

## 15. Referências

- PSKR Design System: `~/Projects/pskr/PSKR Design System/`.
- Motor de origem: `~/Projects/ciam-neural-networks/aula/` (`src/js/deck.js`, `build/math.mjs`, `build/assemble.py`, `tests/deck.test.mjs`) e sua spec, `docs/superpowers/specs/2026-09-02-aula-redes-neurais-design.md`.
- Identidade visual da USP: `https://scs.usp.br/identidadevisual/`.
- Identidade visual do IME: `https://www.ime.usp.br/identidade-visual/`.
- Identidade visual do IFUSP: `https://portal.if.usp.br/imprensa/pt-br/node/3425`.
- Design Tokens Community Group, formato 2025.10: `https://www.designtokens.org/`.
- Agent Skills: `https://agentskills.io`.
- Letterform Archive, sobre letras e Bauhaus (contexto da decisão tipográfica): `https://letterformarchive.org/news/bauhaus-typefaces-part-two/`.
- Telas aprovadas: `docs/superpowers/specs/referencias/2026-09-14-aula-usp/`.
