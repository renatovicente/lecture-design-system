# A aula como artifact do Claude

Um artifact do claude.ai é uma página que o Claude escreve e mostra ao lado da conversa, ao vivo. É o lugar mais confortável para escrever uma aula com um modelo: você pede, vê o slide aparecer, pede a correção e vê de novo, sem salvar arquivo a cada rodada.

É também o ambiente mais restrito dos quatro, e as restrições dele **moldaram o sistema inteiro** — é por causa delas que o runtime é um script só, que ele carrega as fontes e o CSS por dentro, e que ele vem do jsDelivr. Este arquivo diz o que funciona ali, o que não funciona, e o que fazer em cada caso.

## Antes de tudo: o que este arquivo é

**Este fluxo ainda não pode ser exercitado.** Ele depende da tag do runtime apontando para o pacote publicado no npm, e a publicação é da fase 3 do projeto (`71-fluxo-chat.md`). O aceite em claude.ai está marcado para essa fase justamente por isso.

E há uma segunda ressalva, que vale para o arquivo inteiro: **o que se afirma aqui sobre o que um artifact permite é o que o projeto assume**, escrito na tabela de riscos da especificação e usado como premissa de desenho. Não é um relato de teste. Onde a especificação diz "bloqueia", o sistema já está desenhado para não depender daquilo; onde ela diz "pode bloquear", há um plano B, e é ele que você vai usar se o bloqueio acontecer com você. Quando o aceite da fase 3 rodar, o que se aprender ali entra neste arquivo, e as ressalvas saem.

## O que o projeto assume que um artifact bloqueia

| o que o artifact bloqueia | consequência para a sua aula |
|---|---|
| folhas de estilo externas, fora do Google Fonts | nenhuma — o sistema nunca usou uma |
| scripts de fora das CDNs permitidas (jsDelivr, no caminho `/npm/`) | nenhuma — é de lá que o runtime vem |
| downloads de outros tipos de arquivo | você não baixa o `.html` de dentro do artifact; veja abaixo |
| WASM carregado à parte | nenhuma — o WASM do Graphviz vem dentro do script de diagramas |

As duas primeiras linhas explicam decisões que, de fora, pareceriam exageradas. **O CSS, as fontes e as marcas viajam dentro do próprio `aula-usp.js`**, como dados embutidos, em vez de virem de arquivos ao lado: um `<link>` para uma folha de estilo não sobreviveria aqui. E o runtime é **dividido por recurso** — um script para o núcleo, um para a matemática, um para o código —, carregados só quando a aula os usa, porque um único arquivo com tudo dentro seria pesado para carregar numa CDN a cada abertura. Os tamanhos dos três são medidos por um teste de integração do repositório, com metas registradas: isso não é hábito, é a mitigação de um risco declarado.

**A terceira linha é a que muda o seu dia.** Salvar o HTML da aula em disco é o que você precisa para projetar e para distribuir, e é exatamente o que um artifact tende a não deixar fazer de dentro. A saída é pedir o arquivo pela conversa, e não pelo artifact:

> Me dê a aula inteira num único bloco de código, para eu salvar como `.html`.

Você copia o bloco, cola num editor de texto e salva com extensão `.html`. É o mesmo caminho do ChatGPT sem download (`73-chatgpt.md`), e o resultado é idêntico ao que o artifact mostra — é o mesmo arquivo.

**A quarta linha é dos diagramas.** O gerador de diagramas usa o Graphviz compilado em WASM, e o WASM viaja dentro do próprio script de diagramas, sem arquivo à parte. Esta é a única linha da tabela que foi medida, e não só assumida: um script com o Graphviz inteiro dentro compilou e desenhou num artifact de verdade antes de os diagramas entrarem no sistema, e o plano B da especificação — outro motor de layout, só no navegador — não foi preciso (`50-graficos-diagramas-demos.md`).

## O que o projeto assume que um artifact *pode* bloquear

Estes três são incertos — a especificação os lista como "pode bloquear" —, e cada um tem o que fazer no lugar.

**A janela do apresentador (`window.open`).** A tecla **P** abre o apresentador em outra janela. Se o ambiente bloquear a janela nova, o motor não fica calado: ele abre o painel de notas e escreve lá dentro a explicação do bloqueio. Você dá a aula com as notas no painel — a tecla **N** o abre e fecha —, com o mesmo texto, sem a segunda tela, sem o cronômetro e sem a miniatura do próximo estado. Se você precisa mesmo das duas telas, salve o HTML e abra no seu navegador: lá o apresentador funciona, inclusive em `file://`.

**A tela cheia (`F`).** Sem ela, a aula fica dentro do painel do artifact, com a interface do site em volta — serve para conferir, não para projetar. Para projetar, salve o HTML e abra no navegador.

Há um efeito colateral que vale conhecer: **o painel do validador abre sozinho quando há erro e a página não está em tela cheia** (`60-validador.md`). Num ambiente onde a tela cheia não acontece, essa condição está sempre satisfeita, e o painel aparece toda vez que a aula carregar com erro. É mais um motivo para a última regra essencial: entregue em zero erros, e ele não aparece.

**A impressão.** Se o atalho de imprimir não chegar à página, o PDF não sai dali. Salve o HTML e imprima no Chrome, com "Salvar como PDF" e margens "Nenhuma" (`71-fluxo-chat.md`) — ou, melhor, construa o PDF com `aula-usp build` numa máquina com a CLI (`70-fluxo-terminal.md`), que é o único PDF que o sistema confere.

## O que funciona bem aqui

O que sobra depois das restrições é justamente a parte em que este fluxo é o melhor dos quatro.

**O ciclo de correção é o mais curto que existe.** A aula está na mesma janela da conversa: tecle **V**, leia a lista do validador, clique em **Copiar para o chat** e cole no mesmo fio. O modelo recebe o nome da regra, o slide, o trecho e a ação, e devolve o artifact corrigido. Não há arquivo para salvar no meio.

O botão de copiar depende de contexto seguro, e um artifact é servido por `https` — ao contrário de um arquivo aberto em `file://`, onde ele vem desabilitado de propósito (`71-fluxo-chat.md`). Se mesmo assim ele aparecer apagado, selecione as linhas do painel e copie à mão; o texto é o mesmo.

**A navegação, os passos, a matemática, o código e as demos** são o mesmo código dos outros fluxos, carregado pela mesma tag. Nada neles é adaptado para o artifact, e é por isso que o slide que você vê ali é o slide que vai sair no projetor.

## Como trabalhar, na prática

1. **Dê o guia ao modelo.** Num Projeto do Claude, os arquivos de conhecimento do projeto trazem o guia inteiro, o modelo, a aula-exemplo, o contrato que o validador lê e os seis decks do espécime; num fio avulso, anexe o pacote. Sem isso, o modelo escreve HTML comum e você passa a primeira meia hora corrigindo vocabulário.
2. **Peça a aula como artifact**, e escreva com ele: um bloco por vez, conferindo na tela.
3. **Tecle V a cada rodada**, copie a lista e cole na conversa. Zero erros antes de seguir para o bloco seguinte.
4. **Peça o arquivo num bloco de código** quando a aula estiver pronta, e salve como `.html`.
5. **Projete e distribua a partir do arquivo salvo** — no Chrome para a sala, e pelo `aula-usp build` para o PDF, se você tiver a CLI à mão.

O artifact é onde a aula se escreve. O arquivo salvo é onde ela se dá.
