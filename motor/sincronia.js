// Sincronia entre a janela da aula e a do apresentador (spec 6.6), por postMessage; funciona também com file://.

export const TIPO = 'aula-usp';

export function lerMensagem(evento, janela) {
  const dados = evento.data;
  if (!dados || dados.tipo !== TIPO) return null;
  if (evento.origin !== 'null' && evento.origin !== janela.location.origin) return null;
  if (dados.acao === 'ola') return { acao: 'ola' };
  if (dados.acao === 'posicao' && Number.isInteger(dados.indice) && Number.isInteger(dados.passo)) {
    return { acao: 'posicao', indice: dados.indice, passo: dados.passo };
  }
  return null;
}

export function instalarSincronia(motor, { par = null, intervaloDeOla = 0 } = {}) {
  const { janela } = motor;
  let outra = par;
  let recebida = null;

  function enviar(mensagem) {
    if (!outra) return;
    try {
      outra.postMessage({ tipo: TIPO, ...mensagem }, '*');
    } catch (erro) {
      janela.console.warn('Aula USP: não foi possível falar com a outra janela.', erro);
      outra = null;
    }
  }

  janela.addEventListener('message', (evento) => {
    const mensagem = lerMensagem(evento, janela);
    if (!mensagem) return;
    if (evento.source) outra = evento.source;
    if (mensagem.acao === 'ola') {
      enviar({ acao: 'posicao', ...motor.estado() });
      return;
    }
    recebida = `${mensagem.indice}/${mensagem.passo}`;
    motor.irPara({ indice: mensagem.indice, passo: mensagem.passo });
  });

  motor.aoMudar((estado) => {
    if (`${estado.indice}/${estado.passo}` === recebida) return;
    enviar({ acao: 'posicao', ...estado });
  });

  if (intervaloDeOla > 0) {
    enviar({ acao: 'ola' });
    janela.setInterval(() => enviar({ acao: 'ola' }), intervaloDeOla);
  }

  return {
    definirPar(nova) {
      outra = nova;
    },
  };
}
