# O fluxo no chat, sem terminal

Este é o fluxo de quem não roda nada: você pede a aula num chat — Claude ou ChatGPT, na web —, salva o HTML que veio, abre no navegador e trabalha dali. Não há instalação, não há comando, não há pasta de projeto. O que faz o sistema funcionar é uma linha no `<head>`.

Ele custa duas coisas em relação ao fluxo do terminal (`70-fluxo-terminal.md`): o PDF sai do navegador, não do sistema, e as regras de saída não rodam. Tudo o mais — montagem, matemática, código, navegação, apresentador, e a validação com erro e aviso — acontece igual, porque é o mesmo código.

## A tag do runtime

A aula inteira depende de uma linha, no `<head>`, com esta forma:

```html
<script src="https://cdn.jsdelivr.net/npm/aula-usp@<versão>/dist/aula-usp.js"
        integrity="sha384-…" crossorigin="anonymous"></script>
```

A versão é exata e vem acompanhada de um hash de integridade: se o arquivo na CDN mudar, o navegador se recusa a executá-lo. O efeito colateral é bom para quem dá aula — a sua aula fica presa à versão com que foi feita, e não muda de aparência sozinha na véspera. Atualizar é trocar a tag.

**A tag já traz a versão e o hash reais; o endereço é que ainda não resolve.** Quem a escreve é o `aula-usp pacotes`, lendo a versão do `package.json` do sistema e o `integrity` do manifesto que o `aula-usp dist` escreve, e ela chega pronta no modelo, nos exemplos e nos quatro pacotes para agentes. O que falta é o outro lado: o pacote não está publicado no npm — a publicação é da fase 3 do projeto —, então buscar esse endereço hoje não traz nada. Até lá, este fluxo se experimenta com `aula-usp servir` (`70-fluxo-terminal.md`), que troca a tag pelo runtime local; o resto deste arquivo vale igual nos dois casos.

Uma propriedade da tag vale conhecer antes de precisar dela: **se o runtime não carregar, a aula não some.** Sem internet, ou com a CDN fora do ar, nada é escondido e o HTML aparece cru — feio, sem grade e sem cor, mas legível, com o texto de todos os slides na tela.

## O que acontece quando a página abre

Ela não desenha o slide de imediato, e a ordem tem uma razão que afeta você:

1. o corpo fica escondido até a montagem terminar, para você não ver o HTML cru piscar;
2. o runtime **guarda uma cópia do seu fonte antes de tocar em qualquer coisa** — é sobre essa cópia que as regras estáticas rodam, e é por isso que o validador acusa o que **você** escreveu, e não o que o sistema montou;
3. o CSS e as fontes entram embutidos, e `montar` desenha o cromo;
4. se a aula tem `\(` ou `\[`, o runtime busca o script da matemática no mesmo endereço; se tem `pre[data-lang]`, o do código. Uma aula sem matemática não paga pelo KaTeX;
5. depois que scripts, imagens e fontes carregaram, rodam as regras de carga e as de composição;
6. o motor inicia, e a aula está pronta para navegar.

Isso quer dizer que **o painel do validador não é o primeiro a aparecer**: ele espera as imagens e a matemática, porque parte das regras não tem resposta antes disso.

## O painel do validador

A tecla **V** abre e fecha o painel. Ele traz a mesma lista do terminal, com as mesmas mensagens, porque é o mesmo módulo — a anatomia de cada linha está em `60-validador.md`.

**Ele abre sozinho quando há erro**, e só quando a página não está em tela cheia: numa aula em andamento, o painel nunca se intromete. Avisos não o abrem; vão para o console do navegador, onde você os procura quando quiser.

No pé do painel há o botão **Copiar para o chat**. Ele copia a lista inteira, com um cabeçalho na primeira linha:

```
Validador Aula USP: 4 erros, 3 avisos
ERRO · slide 3 #erros · vocabulario.style · estilo em linha em <p>. Remova o estilo inline; use os layouts e componentes do sistema.
    <p style="color: red">A taxa $\eta$ decide o passo.</p>
…
```

É esse texto que fecha o ciclo: cole-o no chat e peça a correção. O modelo recebe o nome da regra, o slide, o trecho e a ação — tudo que ele precisa para consertar sem adivinhar.

**Um detalhe que decepciona quem abre a aula com dois cliques:** em `file://` o botão vem desabilitado. A área de transferência do navegador só existe em contexto seguro, e um arquivo local não é um. Não é defeito, e não há o que configurar — o botão aparece apagado de propósito, em vez de não fazer nada quando clicado. Nesse caso, selecione as linhas do painel e copie à mão. Servido por `http://` ou aberto como artifact, em `https://`, o botão funciona.

## O ciclo

1. **Peça a aula**, ou o próximo slide, no chat.
2. **Salve o HTML** que veio, com extensão `.html`.
3. **Abra no navegador** e olhe o slide. Navegue com as setas; `?` mostra as teclas.
4. **Tecle V**, leia a lista, copie.
5. **Cole no chat** e peça a correção, citando o que você também viu na tela.
6. **Salve por cima e recarregue.** Não há recarga automática.

Repita por slide, ou por bloco. A lista encolhe sozinha quando você conserta a causa, porque um engano costuma render mais de uma mensagem (`60-validador.md`).

Quando o modelo pedir referência, dê a ele o guia — é para isso que existem os pacotes: uma skill, um Projeto do Claude ou um GPT personalizado já vêm com estes arquivos dentro, e o modelo passa a escrever dentro do contrato desde o primeiro slide, em vez de aprender por erro.

## O que muda neste fluxo

**Imagens.** Não há build para embutir arquivos, e um `img/` ao lado só existe se você criar a pasta e servir os dois juntos. Numa aula que é um arquivo só, a imagem entra como URI `data:` dentro do próprio `src` — é o que o espécime faz (`30-componentes.md`). Uma imagem em `https://` funciona, e custa um aviso (`recursos.imagem-externa`): ela depende de um servidor que não é seu no dia da aula.

**As regras.** Estáticas, de carga e de composição rodam todas aqui, e as de composição rodam **sempre** — você está num navegador de verdade, que é justamente o que falta ao terminal sem Chrome. As de saída não rodam, porque não há HTML final nem PDF para medir. A tabela dos quatro grupos está em `60-validador.md`.

**O PDF.** Vem do seu navegador, e a próxima seção trata dele.

## Projetar e imprimir

Para projetar, abra a aula, tecle **F** para tela cheia e navegue com as setas ou clicando nas laterais. O painel do validador não vai abrir sozinho em tela cheia.

Para o PDF, **use o Chrome**, e imprima com "Salvar como PDF" e margens **"Nenhuma"**. A recomendação não é preferência: o tamanho da página do slide é fixado pelo CSS de impressão, e um navegador que ignore essa regra devolve um PDF em papel A4, com o slide encolhido no meio da folha.

Antes de mandar aos alunos, confira duas coisas no visualizador: se os campos amarelos e as réguas saíram (se saíram brancos, é a impressão de plano de fundo que está desligada nas opções) e se os slides com `data-pdf="passos"` renderam uma página por estado.

**Este PDF não é o mesmo PDF do fluxo do terminal.** O do `aula-usp build` não depende do navegador de ninguém, traz os metadados escritos e é conferido por uma regra de saída que compara o número de páginas com o previsto. Se você tem acesso a uma máquina com a CLI, construa lá o PDF que vai distribuir, mesmo tendo escrito a aula aqui: o fonte é o mesmo arquivo.

## A janela do apresentador

A tecla **P** abre, em outra janela, o mesmo documento em modo apresentador: o slide atual e o próximo estado em miniatura, as notas em corpo grande, cronômetro, relógio, a posição e o mapa de blocos. As duas janelas se sincronizam nos dois sentidos, e isso funciona também em `file://` — navegar numa move a outra.

Se o navegador bloquear a janela nova, o motor não fica calado: ele abre o painel de notas e escreve lá dentro "O navegador bloqueou a janela do apresentador. Libere as janelas pop-up para este endereço e tecle P de novo." Você dá a aula com as notas no painel, que é o mesmo conteúdo sem a segunda tela.

Dentro de um artifact do Claude, este é um dos pontos que podem não funcionar; o que fazer está em `72-artifact-claude.md`.
