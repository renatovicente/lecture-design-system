// Controles de demo (spec 7.2, fase 2): botão, controle deslizante e leitura, oferecidos às demos
// como AulaUSP.controles. Só API padrão do DOM — roda no navegador, nos dois modos, e nos testes
// sobre o linkedom; nada aqui importa Node.
//
// Os controles são criados pela demo, dentro da sua div.demo, e não escritos no fonte: a spec 5.5
// lista o vocabulário do corpo inteiro, com o que a fase 2 acrescenta, e não há button, input nem
// output nele; e diz que "o conteúdo que uma demo cria dentro da sua div.demo fica fora do contrato
// de vocabulário" (a spec 6.7: montar "cria a interface dentro de raiz"). O que é do SISTEMA, e
// mora aqui, é a forma: as classes que o CSS desenha (estilos/componentes.css), o estado ativo do
// botão e a leitura formatada no idioma da aula. O que a demo FAZ — o ciclo de vida, montar,
// iniciar, parar — continua todo em motor/demos.js; este módulo não chama nenhum dos três e não
// guarda estado de demo nenhuma.
//
// As três classes (controle, leitura e, no botão, ativo) estão em contrato.classesDoSistema: são
// classes que o sistema escreve no documento renderizado e o autor não escreve no fonte.
import { elemento } from '../motor/dom.js';

export const CLASSE_CONTROLE = 'controle';
export const CLASSE_LEITURA = 'leitura';
export const CLASSE_ATIVO = 'ativo';

export function criarControles(doc) {
  // O idioma da aula (spec 6.8): "0,5" em pt-BR e "0.5" em en.
  const idioma = () => doc.documentElement.getAttribute('lang') || 'pt-BR';

  // button.controle (spec 7.2). type="button" para nunca submeter nada, dentro ou fora de form. Sem
  // aria-pressed: um botão de ação comum ("somar") não é de alternância, e com o atributo o leitor
  // de tela o anunciaria como um. Quem faz dele um botão de alternância é alternar(), abaixo.
  function botao(raiz, texto, aoClicar) {
    const novo = elemento(doc, 'button', CLASSE_CONTROLE, texto);
    novo.setAttribute('type', 'button');
    if (aoClicar) novo.addEventListener('click', (evento) => aoClicar(evento));
    raiz.append(novo);
    return novo;
  }

  // O estado ativo do botão (spec 7.2: "ativo em campo tinta com texto papel"): a classe, que o CSS
  // pinta, e aria-pressed, que o leitor de tela anuncia — os dois sempre juntos, e só aqui: o botão
  // que passa por alternar() é de alternância, e o que nunca passa, de ação. Sem `ativo`, inverte.
  // Devolve o estado novo.
  function alternar(alvo, ativo = !alvo.classList.contains(CLASSE_ATIVO)) {
    alvo.classList.toggle(CLASSE_ATIVO, ativo);
    alvo.setAttribute('aria-pressed', String(ativo));
    return ativo;
  }

  // input.controle[type=range] (spec 7.2). `rotulo` vira aria-label: um controle deslizante não tem
  // texto próprio, e sem nome acessível ele é só "controle deslizante" para quem não o vê.
  function deslizante(raiz, { min = 0, max = 100, passo = 1, valor = min, rotulo } = {}, aoMudar) {
    const novo = elemento(doc, 'input', CLASSE_CONTROLE);
    novo.setAttribute('type', 'range');
    novo.setAttribute('min', String(min));
    novo.setAttribute('max', String(max));
    novo.setAttribute('step', String(passo));
    novo.setAttribute('value', String(valor));
    if (rotulo) novo.setAttribute('aria-label', rotulo);
    if (aoMudar) novo.addEventListener('input', () => aoMudar(Number(novo.value)));
    raiz.append(novo);
    return novo;
  }

  // Escreve `valor` numa leitura: número formatado no idioma da aula, com `casas` decimais fixas
  // quando pedido; qualquer outra coisa, como texto. Devolve o texto escrito.
  function escrever(saida, valor, { casas } = {}) {
    const texto = typeof valor === 'number'
      ? new Intl.NumberFormat(idioma(), casas === undefined ? {} : { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor)
      : String(valor);
    saida.textContent = texto;
    return texto;
  }

  // output.leitura (spec 7.2), já com o primeiro valor, se houver.
  function leitura(raiz, valor, opcoes) {
    const nova = elemento(doc, 'output', CLASSE_LEITURA);
    if (valor !== undefined) escrever(nova, valor, opcoes);
    raiz.append(nova);
    return nova;
  }

  return { botao, alternar, deslizante, leitura, escrever };
}
