# O fluxo com terminal

Este é o fluxo de quem roda comandos — o autor na sua máquina, e o agente que trabalha num terminal, como o Claude Code ou o Codex CLI. É o mais completo dos quatro: só aqui existem a validação inteira, com os quatro grupos de regras, e o PDF gerado pelo sistema.

Os outros três fluxos estão em `71-fluxo-chat.md`, `72-artifact-claude.md` e `73-chatgpt.md`, e todos eles dependem do runtime carregado por uma tag no `<head>`. Este não: o sistema está no disco.

## Instalar a CLI

**Hoje a CLI se instala a partir do repositório do sistema**, com `npm link` (spec 8.1):

```bash
cd caminho/para/lecture-design-system
npm install
npm link
```

`npm install` traz as dependências; `npm link` põe `aula-usp` no seu PATH. Node 20.6 ou mais novo.

**`npm install -g aula-usp` ainda não funciona.** O pacote não está publicado no npm, e publicá-lo é da fase 3 do projeto: até lá não há o que instalar por esse caminho. Quando houver, é esta seção que muda.

Confira que respondeu, chamando a CLI sem comando nenhum:

```bash
aula-usp
```

Ela imprime o uso e termina com código 2:

```
uso: aula-usp novo <pasta> --unidade ime
       aula-usp servir <pasta> [--porta 8765]
       aula-usp validar <pasta> [--json]
       aula-usp build <pasta> [--sem-pdf]
       aula-usp dist
       aula-usp pacotes
```

Se em vez disso vier "comando não encontrado", não insista no `npm link`: chame o arquivo pelo caminho, que faz exatamente o mesmo.

```bash
node caminho/para/lecture-design-system/bin/aula-usp.mjs validar minha-aula
```

Dos seis comandos, quatro são seus — `novo`, `validar`, `servir` e `build`, nesta ordem, e as quatro seções seguintes são eles. `aula-usp dist` e `aula-usp pacotes` são manutenção do sistema, e quem escreve aula não tem motivo para chamá-los.

## `aula-usp novo` — começar uma aula

A aula é uma pasta com um `index.html` dentro, e um `img/` ao lado quando há imagens de arquivo. É este comando que a cria:

```bash
aula-usp novo minha-aula --unidade ime
```

```
minha-aula criada a partir de modelos/aula — unidade ime, data 2026-09-20
```

`--unidade` é obrigatória e aceita as unidades do sistema (`ime` ou `ifusp` hoje); a data é a de hoje, pelo relógio da sua máquina. As outras três metas — `disciplina`, `aula` e `professor` — ficam com o texto de exemplo, para você as preencher: um nome de professor inventado pelo comando seria pior que um lugar visivelmente vazio.

O comando não sobrescreve pasta que já tenha conteúdo, e recusa uma unidade que não exista, com código 2 e sem criar nada. Uma pasta vazia que você já tenha criado é aceita.

O que ele cria é o esqueleto de `10-estrutura.md`, com capa, duas aberturas, dois slides de conteúdo e encerramento. Troque o conteúdo, preencha as metas que faltam e acrescente seções.

Uma observação sobre a tag do `<script>` que veio no esqueleto: ela aponta para a CDN, com a versão exata e a soma de integridade — é a forma que o `aula-usp pacotes` escreve. Esse endereço ainda não resolve, porque o pacote não está publicado (fase 3), e **não faz diferença neste fluxo**, porque `aula-usp servir` troca a tag pelo runtime local e `aula-usp build` a troca pelo motor embutido. Os dois a reconhecem pelo `src` terminado em `/aula-usp.js`, não pelo endereço. O que não funciona, até a publicação, é abrir o arquivo criado direto no navegador com dois cliques: para ver a aula, use `servir`.

## O ciclo

Criada a pasta, são três comandos, e você passa a aula inteira nos dois primeiros.

### `aula-usp validar` — o ciclo curto

```bash
aula-usp validar minha-aula
```

Sem nada a dizer, ele diz isso, e termina com código 0:

```
Validador Aula USP: 0 erros, 0 avisos
```

Com o que dizer, cada achado vem numa linha, e o resumo no fim. Uma aula de quatro slides com quatro enganos comuns — uma classe inventada, um `style`, um título grande demais e matemática entre cifrões — produz esta lista, que é saída de verdade:

```
AVISO · aula · estrutura.blocos · a aula tem 1 abertura; o mínimo é 2. Organize a aula em 2 a 8 blocos, cada um aberto por data-layout="abertura".
AVISO · slide 3 #erros · estrutura.notas-ausentes · slide de layout "conteudo" sem notas do apresentador. Acrescente <aside class="notas"> com o que dizer neste slide.
ERRO · slide 3 #erros · estrutura.fora-do-layout · <div> não é permitido no layout "conteudo". Remova o elemento ou mova-o para um layout que o aceite, na ordem prevista.
    <div class="caixa-azul">Uma classe que não existe.</div>
ERRO · slide 3 #erros · vocabulario.classe · classe "caixa-azul" não existe no contrato. Use só classes previstas no contrato.
    <div class="caixa-azul">Uma classe que não existe.</div>
ERRO · slide 3 #erros · vocabulario.style · estilo em linha em <p>. Remova o estilo inline; use os layouts e componentes do sistema.
    <p style="color: red">A taxa $\eta$ decide o passo.</p>
ERRO · slide 3 #erros · limites.titulo · título com 80 caracteres num segmento (máx. 50). Corte o título ou divida o conteúdo em dois slides.
    Um título que é longo demais para caber em uma linha só do slide e segue adiante
AVISO · slide 3 #erros · matematica.cifrao-suspeito · "$\eta$" parece matemática entre cifrões. Escreva matemática entre \( e \); $ não é delimitador.
    $\eta$
Validador Aula USP: 4 erros, 3 avisos
```

Repare que o `<div class="caixa-azul">` rendeu dois erros — um de forma e um de vocabulário —, e que os dois somem juntos quando o `div` sai. É a regra geral: **conserte a causa, não a mensagem** (`60-validador.md`).

Rode este comando a cada slide novo, e não no fim da aula. Ele é rápido, e quatro mensagens sobre um slide que você acabou de escrever custam menos que quarenta sobre uma aula inteira.

### `aula-usp servir` — ver enquanto escreve

```bash
aula-usp servir minha-aula
```

```
servindo minha-aula em http://127.0.0.1:8765/
```

Abra o endereço e você tem a aula montada, com navegação, passos, notas e o painel do validador — o mesmo painel de `71-fluxo-chat.md`, na tecla **V**. Aqui ele serve para outra coisa: ver o slide desenhado. Uma lista que ficou longa demais, um título que quebrou feio, uma figura que sobrou da área — isso a lista do terminal não mostra.

Não há recarga automática: depois de editar o arquivo, recarregue a página. `--porta` muda a porta quando a 8765 estiver ocupada.

**Quando não há olho humano nesta ponta** — um agente escrevendo a aula sozinho, um pedido que veio por script —, o comando que serve é o `build`, e não este. Com Chrome na máquina ele mede a composição num navegador de verdade, gera o PDF e confere que o número de páginas bate com o que a aula pede (`saida.pdf-paginas`); o PDF fica em `dist/` e é um arquivo, que não depende de servidor nem de navegador para ser lido depois. Daqui em diante é o que a sua máquina tem, não o que o sistema promete: ver as páginas como imagem pede um rasterizador de PDF — o `pdftoppm`, do Poppler, é um —, e alguns agentes leem PDF direto. Sem Chrome não há PDF nenhum (seção "Quando não há Chrome"), e o que sobra é a lista do validador. Nenhum desses caminhos substitui a revisão do autor, que é sobre o que o validador não mede: se a figura diz alguma coisa, se a derivação revela os passos na ordem certa.

### `aula-usp build` — a entrega

```bash
aula-usp build minha-aula
```

As sete etapas se anunciam enquanto correm, e o resumo vem no fim. A aula-exemplo do repositório, construída agora:

```
aula-usp build: etapa 1/7 — validando estática e carga (sem navegador)
aula-usp build: etapa 2-4/7 — montando, pré-renderizando e embutindo
aula-usp build: etapa 5/7 — abrindo o Chrome e medindo composição
aula-usp build: etapa 5/7 — composição sem erro
aula-usp build: etapa 6/7 — gerando o PDF
aula-usp build: etapa 6/7 — PDF gerado, 11 página(s)
aula-usp build: etapa 7/7 — validando o número de páginas do PDF
aula-usp build: concluído — código 0
Validador Aula USP: 0 erros, 0 avisos
PDF: 11 páginas.
```

**O build escreve só dentro de `minha-aula/dist/`, e nunca toca no seu fonte.** São três arquivos, com o nome da pasta da aula:

| arquivo | o que é |
|---|---|
| `minha-aula.html` | a aula num arquivo só, com CSS, fontes, marcas, imagens e matemática já dentro. Não depende de internet nem da CDN: é o que você leva para projetar |
| `minha-aula.pdf` | um slide por página, em 1280 × 720, mais uma página por passo nos slides com `data-pdf="passos"` |
| `validacao.json` | a mesma lista de achados, em objetos |

`--sem-pdf` pula as etapas 6 e 7. Vale enquanto a composição ainda estiver vermelha: você ganha o HTML montado sem esperar o PDF.

O build para onde o erro apareceu. Com erro estático ou de carga, ele grava só o `validacao.json` e nem monta; com erro de composição, grava o HTML e o `validacao.json` e não gera o PDF. Nos dois casos, termina com código 1.

## Ler o que ele diz

A anatomia de uma mensagem — severidade, lugar, regra, problema, ação — está em `60-validador.md`, e vale igual nos quatro fluxos. Três coisas são do terminal:

- **a lista vai para o stdout; o resto, para o stderr.** O progresso do build e o aviso de ambiente saem pelo stderr de propósito, para que a saída de `--json` possa ser canalizada sem nada solto no meio a quebrar o parse.
- **o código de saída resume tudo num número:** 0 sem erros, e avisos são permitidos; 1 com erros de validação; 2 quando não deu para rodar — pasta não encontrada, dependência ausente, flag errada. Num script ou num agente, teste o código; não procure palavra na saída.
- **cada comando aceita só as suas flags.** `--json` em `build`, ou `--porta` em `validar`, saem com o uso e código 2, como uma flag que não existe. É de propósito: recusar avisa, ignorar em silêncio, não.

Para um agente, `--json` dá a mesma lista em objetos, um por achado, com os campos `severidade`, `slide`, `id`, `regra`, `mensagem`, `acao` e `trecho`:

```bash
aula-usp validar minha-aula --json
```

A saída é um array; abaixo, um elemento dele — o achado de `vocabulario.style` da lista de cima:

```json
{
  "severidade": "erro",
  "slide": 3,
  "id": "erros",
  "regra": "vocabulario.style",
  "mensagem": "estilo em linha em <p>.",
  "acao": "Remova o estilo inline; use os layouts e componentes do sistema.",
  "trecho": "<p style=\"color: red\">A taxa $\\eta$ decide o passo.</p>"
}
```

`slide` e `id` vêm nulos quando o achado é da aula inteira, e `trecho` vem nulo quando não há trecho a citar.

## Quando não há Chrome

O build usa o Google Chrome de verdade para medir a composição e gerar o PDF — o instalado na máquina, ou o executável apontado pela variável de ambiente `CHROME_PATH`. Ele não baixa navegador.

Sem Chrome, **nada falha**: as etapas 5 e 6 são puladas, o HTML sai, e o aviso aparece no stderr, na forma `Aula USP: aviso: composição pulada, sem Chrome: …`, com o motivo no fim. O comando termina com 0 se não houver outro erro.

Isso é uma degradação, não uma aprovação. Sem Chrome ficam de fora o grupo inteiro de composição e a conferência do número de páginas do PDF, e **"zero erros" ali não é o mesmo "zero erros" de quem tem Chrome** (`60-validador.md`). Se você trabalha num ambiente sem navegador, aponte `CHROME_PATH` para um, ou trate o resultado como parcial e confira num Chrome antes da aula.

## O que entregar

Uma aula pronta é a pasta do fonte — `index.html` e o `img/`, se houver — mais o que o build escreveu em `dist/`.

O fonte é o que você edita na semana que vem; o `minha-aula.html` é o que você abre no projetor, e ele não precisa de internet; o `minha-aula.pdf` é o que vai para os alunos. Os três saem da mesma rodada, e é por isso que não há duas versões da aula para manter em dia.
