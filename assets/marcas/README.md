# Marcas

Arquivos oficiais usados na faixa de marca da capa e do encerramento (spec, seção 4.5).
Nunca redesenhar, recolorir, distorcer ou aplicar efeitos.

## Origem

| arquivo | origem | observação |
|---|---|---|
| `origem/usp-logo.pdf` | https://scs.usp.br/identidadevisual/wp-content/uploads/2022/08/usp-logo-pdf.pdf | original vetorial da SCS-USP; 1 página, só o logotipo, sem texto |
| `usp-preto.svg` | convertido de `origem/usp-logo.pdf` por `build/marcas.mjs` | traços intactos; só o viewBox foi enquadrado |
| `ime-usp-horizontal-preta.svg` | https://www.ime.usp.br/media/identidade_visual/imagens/IME+USP/Preta/SVG/Horizontal_preta.svg | lockup "Assinatura Conjunta USP" (manual do IME, página 20): busto, sigla "IME" e logotipo USP, sem o nome do instituto por extenso; viewBox enquadrado em 512 268 2600 448 (medido na tinta do desenho, na tela original de 3597×982; só atributos da raiz alterados) |
| `ifusp-vertical-preto.png` | https://portal.if.usp.br/imprensa/sites/portal.if.usp.br.ifusp/files/logo_IFUSP_2025_VERT_preto.png | só existe em PNG; 1278×2059 px; pedir versão vetorial à comunicação do IF |

O manual de identidade visual do IME consultado é de março de 2021 (MAR2021) e é anterior à
atualização de nome de 2025 do instituto (que manteve a sigla "IME"); por isso o `nome` do IME em
`unidades.json` usa o nome atual — o manual só foi usado para as regras numéricas de área de
proteção e redução mínima, e para confirmar que o arquivo baixado é a assinatura conjunta sem nome
por extenso (página 20), não a antiga.

## Área de proteção

- USP: altura do "P" do logotipo (regra da SCS-USP); medida: 1,000 da altura (as três letras
  "U", "S", "P" tocam o topo e a base do desenho), 56 px a 56 px.
- IME: página 18 do manual ("3.6 Área de Proteção") define a moldura "x" como 1/4 da largura da
  versão vertical de referência (rótulo "4X"); como essa largura corresponde ao diâmetro do
  medalhão do busto, x ≈ 1/4 do diâmetro ≈ 22 px na altura de uso de 88 px, arredondado para a
  escala de espaçamento de 8 px do design system; 24 px a 88 px. `protecao` 24 e `altura` 88
  referem-se ao desenho enquadrado (viewBox 512 268 2600 448, ver seção Origem acima), não à tela
  original de 3597×982 do arquivo baixado.
- IFUSP (ruling do controlador): o mínimo de 130 px e a área de preservação do manual, página 6,
  são definidos sobre o logo HORIZONTAL de referência, cuja caixa de tinta mede 404,59 × 158,96 pt
  (medida vetorial exata, via coordenadas do PDF) com moldura "x" uniforme nos 4 lados de x =
  45,52 pt ("ÁREA DE PRESERVAÇÃO"), fração = x / 158,96 = 0,2864 da altura desse logo — e a altura
  desse logo horizontal é a altura do próprio símbolo (busto), sem a faixa de texto "IFUSP" que só
  existe na versão vertical. Como o arquivo baixado (`ifusp-vertical-preto.png`, 1278×2059 px) é
  a versão vertical (símbolo empilhado sobre "IFUSP"), a fração foi transferida pelo símbolo — o
  elemento comum às duas versões: medindo os pixels de tinta do PNG, o símbolo ocupa as linhas 0
  a 1408 de um total de 2059 (h_s = 1409/2059 = 0,6843, isolado pelo primeiro vão sem tinta antes
  do texto "IFUSP"). Na altura de uso de 128 px, o símbolo ocupa `128 × 0,6843` px, e
  `protecao = ceil(0,2864 × 0,6843 × 128) = 25` px.

## Altura mínima

- IME: página 19 do manual ("3.7 Redução Máxima Permitida") dá os valores já em px: versão
  horizontal completa (com nome por extenso) 23 px, versão horizontal só "IME" 18 px. O arquivo
  usado (assinatura conjunta IME+USP, página 20) não tem número de redução próprio; por prudência
  usamos o maior dos dois valores horizontais, 23 px. Como a altura de uso (88 px) já é maior que
  23 px, ela não muda.
- IFUSP (ruling do controlador): página 6 do manual ("DIMENSÃO MÍNIMA") dá "2 cm" (impresso) e
  "130 pixels" (digital) para o logotipo HORIZONTAL de referência (caixa de tinta 404,59 × 158,96
  pt); esses 130 px são a largura mínima desse logo, cuja altura (158,96 pt) é a altura do próprio
  símbolo. Convertendo para altura mínima do símbolo em px pela escala do próprio mínimo
  (130 px / 404,59 pt de largura): `130 × 158,96 / 404,59` px de símbolo. Transferindo pela mesma
  fração h_s = 0,6843 (proporção do PNG vertical 1278×2059 ocupada pelo símbolo, ver Área de
  proteção acima) para a altura mínima do arquivo vertical:
  `alturaMinima = ceil(130 × 158,96 / 404,59 / 0,6843) = 75` px. Como a altura de uso (`altura`
  128 px) é maior que a alturaMinima (75 px), ela não muda.
