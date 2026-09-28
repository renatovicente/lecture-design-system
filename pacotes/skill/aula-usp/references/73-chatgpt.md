# A aula pelo ChatGPT

Aqui a aula chega como **arquivo**. Você conversa, o modelo escreve o HTML, você salva em disco e abre no navegador — e a partir daí tudo se passa como em `71-fluxo-chat.md`, que é o capítulo a ler junto com este.

O que este tem de próprio é o começo e o fim: como dar o guia ao modelo, e como tirar dele o arquivo inteiro sem perder um pedaço no caminho.

Como os outros dois fluxos de navegador, ele depende da tag do runtime apontando para o pacote publicado, e a publicação é da fase 3 do projeto (`71-fluxo-chat.md`). O aceite em ChatGPT está marcado para essa fase.

## O GPT personalizado

O jeito bom de usar este fluxo é com o GPT personalizado do Aula USP, que vem pronto no pacote do sistema. Nele:

- **os arquivos de conhecimento trazem o guia inteiro**, mais o modelo, as duas aulas-exemplo, o contrato que o validador lê e os seis decks do espécime;
- **as instruções trazem as regras essenciais e o procedimento**, e só isso: elas têm um teto de oito mil caracteres, que não dá para o guia inteiro — só a tabela de regras do validador já ocuparia a maior parte dele. Por isso o guia mora no conhecimento, e as instruções mandam consultá-lo;
- **os iniciadores de conversa** já pedem a aula na forma certa.

A consequência prática é uma só, e vale saber antes de estranhar: **quando o modelo começar a inventar marcação, mande-o consultar o guia.** Ele tem os arquivos; o que ele não tem é tudo na memória de trabalho.

Sem o GPT personalizado, numa conversa comum, anexe você mesmo o guia — ou pelo menos `00-principios.md`, `10-estrutura.md` e `20-layouts.md` — antes de pedir o primeiro slide. Sem nenhuma referência, o que volta é HTML de página web: `div`s com classes inventadas, `style` em tudo, e uma hora de correção pela frente.

## Tirar o arquivo de lá

São dois caminhos, e o primeiro nem sempre está disponível.

**Se houver arquivo para baixar**, baixe, e confira duas coisas antes de comemorar: que o nome termina em `.html` e que o arquivo abre no navegador mostrando a aula, e não o código.

**Se não houver**, peça um único bloco de código. Esta é a forma:

> Escreva a aula inteira num único bloco de código, do `<!DOCTYPE html>` ao `</html>`, sem cortes e sem resumir nenhuma parte.

O projeto conta com este caminho: a tabela de riscos da especificação lista "ChatGPT sem arquivo para download", e a mitigação prevista é exatamente esta — um bloco só, para o autor salvar. Não é remendo, é o plano.

Três coisas estragam um bloco de código, e todas são fáceis de ver antes de salvar:

- **o arquivo partido em vários blocos.** Juntar dois pedaços é onde o erro entra, porque a emenda não é visível. Peça de novo, num bloco só.
- **o corte do meio**, com um "… (o resto continua igual)" ou "… os demais slides seguem o mesmo padrão". Confira que o bloco começa em `<!DOCTYPE html>` e termina em `</html>`, e que os slides que você pediu estão todos lá.
- **a tag do runtime alterada.** O `<script>` do `<head>` tem de chegar exatamente como estava, com o endereço, a versão e o `integrity` intactos. Um hash trocado faz o navegador recusar o script, e a aula abre crua.

## Salvar

Copie o bloco, cole num editor de texto simples e salve com extensão **`.html`**.

Dois cuidados que custam uma aula quando falham:

- **não use um processador de texto.** Um editor que salva formatação estraga as aspas ao gravar, e o que sai não é HTML. Qualquer editor de código serve; o bloco de notas do sistema também, desde que salve em texto puro.
- **confira a extensão de verdade.** Vários editores acrescentam `.txt` por conta própria, e o arquivo vira `aula.html.txt`, que o navegador abre como texto. Se ao abrir você vir o código em vez da aula, é isso.

Salvo o arquivo, o resto é `71-fluxo-chat.md`: abrir no navegador, tecla **V** para o painel do validador, corrigir, recarregar.

## O ciclo

1. **Peça o slide ou o bloco** ao GPT.
2. **Traga o arquivo** — baixado, ou pelo bloco de código único.
3. **Abra no navegador** e olhe.
4. **Tecle V**, copie a lista de achados.
5. **Cole na conversa** e peça a correção.
6. **Salve por cima** e recarregue.

Um atalho que economiza rodadas: em vez de pedir a aula inteira e corrigir quarenta mensagens, peça bloco a bloco e feche cada um em zero erros. O modelo aprende a forma nas primeiras correções, e os blocos seguintes chegam limpos.

Em `file://` o botão **Copiar para o chat** vem desabilitado, porque a área de transferência do navegador exige contexto seguro; selecione as linhas do painel e copie à mão (`71-fluxo-chat.md`).

## O que não vem por aqui

O PDF sai do seu navegador — Chrome, "Salvar como PDF", margens "Nenhuma" —, e não é o PDF que o sistema confere. Quem quer o PDF conferido, com os metadados escritos e o número de páginas validado, constrói a aula com `aula-usp build` numa máquina com a CLI (`70-fluxo-terminal.md`). O fonte é o mesmo arquivo que você salvou: não há nada a converter.
