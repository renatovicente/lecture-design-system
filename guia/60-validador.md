# O validador

O que o validador cobra, regra por regra, e o que fazer quando cada uma acusa.

> Esqueleto: a prosa deste arquivo ainda será escrita. O que está entre `<!-- gerado:… -->` e `<!-- /gerado -->` é escrito por `npm run guia` a partir de `contrato/contrato.json` — não edite à mão; edite a fonte e regere.

## As regras da fase 1

<!-- gerado:tabela-de-regras -->
| regra | severidade | como corrigir |
|---|---|---|
| `composicao.azul-pequeno` | erro | Use azul só em texto a partir de 32 px. |
| `composicao.linhas-titulo` | erro | Encurte o título para caber em duas linhas. |
| `composicao.tamanho-minimo` | erro | Corte conteúdo em vez de reduzir o texto. |
| `composicao.texto-no-amarelo` | erro | Use só tinta sobre amarelo. |
| `composicao.transbordo` | erro | Reduza o conteúdo do slide ou divida-o em dois. |
| `estrutura.blocos` | aviso | Organize a aula em 2 a 8 blocos, cada um aberto por data-layout="abertura". |
| `estrutura.colunas` | erro | Dê à div.colunas um div filho para cada parte de data-grade. |
| `estrutura.fora-do-layout` | erro | Remova o elemento ou mova-o para um layout que o aceite, na ordem prevista. |
| `estrutura.id-ausente` | aviso | Dê à section um id curto, com letras minúsculas, números e hífens. |
| `estrutura.id-duplicado` | erro | Dê a cada section um id único. |
| `estrutura.layout` | erro | Use um layout do contrato: capa, abertura, conteudo, afirmacao, figura, demo ou encerramento. |
| `estrutura.metadados` | erro | Preencha no <head> as metas unidade, disciplina, aula, data (AAAA-MM-DD) e professor. |
| `estrutura.nome-curto` | erro | Acrescente à abertura data-curto com até 10 caracteres. |
| `estrutura.notas-ausentes` | aviso | Acrescente <aside class="notas"> com o que dizer neste slide. |
| `estrutura.obrigatorio` | erro | Acrescente o elemento obrigatório do layout. |
| `estrutura.passos-mistos` | erro | Numere todos os passos do slide ou nenhum. |
| `estrutura.primeiro-slide` | erro | Comece a aula com <section data-layout="capa">. |
| `estrutura.ultimo-slide` | erro | Termine a aula com <section data-layout="encerramento">. |
| `limites.afirmacao` | erro | Encurte a afirmação para até 120 caracteres. |
| `limites.alertas` | erro | Use no máximo 1 alerta por slide. |
| `limites.codigo-colunas` | erro | Quebre as linhas de código com mais de 64 colunas. |
| `limites.codigo-linhas` | erro | Mostre no máximo 16 linhas de código por slide. |
| `limites.destaques` | erro | Use no máximo 2 destaques por slide. |
| `limites.fonte` | erro | Encurte a fonte para até 80 caracteres. |
| `limites.itens` | erro | Use no máximo 5 itens por lista, ou divida a lista. |
| `limites.legenda` | erro | Encurte a legenda para até 140 caracteres. |
| `limites.lide` | erro | Encurte o lide para até 120 caracteres. |
| `limites.metadado` | erro | Encurte o metadado ao tamanho previsto. |
| `limites.nome-curto` | erro | Encurte data-curto para até 10 caracteres. |
| `limites.palavras-coluna` | erro | Corte palavras da coluna ou divida o conteúdo em dois slides. |
| `limites.palavras-corpo` | erro | Corte palavras ou divida o conteúdo em dois slides. |
| `limites.pergunta` | erro | Encurte a pergunta para até 90 caracteres. |
| `limites.proxima` | erro | Encurte a próxima aula para até 90 caracteres. |
| `limites.rotulo` | erro | Encurte data-rotulo para até 24 caracteres. |
| `limites.segmentos-titulo` | erro | Use no máximo duas linhas no título, com um único <br>. |
| `limites.sintese` | erro | Use na síntese até 3 itens, cada um com até 80 caracteres. |
| `limites.tabela` | erro | Use no máximo 8 linhas de dados e 6 colunas. |
| `limites.titulo` | erro | Corte o título ou divida o conteúdo em dois slides. |
| `matematica.cifrao-suspeito` | aviso | Escreva matemática entre \( e \); $ não é delimitador. |
| `matematica.comando-proibido` | erro | Remova do TeX os comandos de cor e de estilo. |
| `matematica.simbolo-fora-do-tex` | erro | Escreva o símbolo em TeX: \( \to \), \( \alpha \), \( \leq \). |
| `matematica.tex-invalido` | erro | Corrija o TeX no trecho indicado. |
| `recursos.alt` | erro | Descreva a imagem no atributo alt. |
| `recursos.demo-sem-estatico` | aviso | Acrescente img.estatico à demo ou implemente capturar(). |
| `recursos.demo-sem-registro` | erro | Registre a demo com AulaUSP.demo('<nome>', { … }). |
| `recursos.imagem` | erro | Confira o caminho da imagem em img/. |
| `recursos.imagem-externa` | aviso | Guarde a imagem em img/, com autorização do autor para baixá-la. |
| `recursos.linguagem` | erro | Use em data-lang uma destas linguagens: python, r, sql, javascript, bash, json, latex. |
| `saida.glifo-ausente` | erro | Escreva o caractere em TeX ou troque-o por um equivalente. |
| `saida.pdf-paginas` | erro | Relate o defeito: o PDF não tem o número de páginas esperado. |
| `saida.referencia-externa` | erro | Embuta o recurso no HTML final. |
| `saida.tamanho` | aviso | Reduza as imagens ou divida a aula. |
| `vocabulario.amarelo-svg` | erro | Use o amarelo só em campos ou traços de 4 px ou mais, nunca em texto. |
| `vocabulario.atributo` | erro | Remova o atributo ou use um valor previsto no contrato. |
| `vocabulario.azul-svg` | erro | Use o azul em texto de SVG só a partir de 32 px. |
| `vocabulario.classe` | erro | Use só classes previstas no contrato. |
| `vocabulario.cor-svg` | erro | Use em fill e stroke só as cores dos tokens ou none. |
| `vocabulario.elemento` | erro | Troque o elemento por um previsto no contrato. |
| `vocabulario.script` | erro | Tire o script da section; registros de demo ficam fora dos slides. |
| `vocabulario.style` | erro | Remova o estilo inline; use os layouts e componentes do sistema. |
<!-- /gerado -->
