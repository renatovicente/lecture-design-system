// Demos (spec 6.7): registro por nome e ciclo de vida montar/iniciar/parar, preso à navegação.

export function criarDemos({ api, console: registro }) {
  const definicoes = new Map();
  const montadas = new WeakSet();

  const registrar = (nome, definicao) => definicoes.set(nome, definicao);
  for (const item of api.filaDeDemos ?? []) registrar(item.nome, item.definicao);
  // Ruling 11: o passo 6 de montar/navegador.js lê api.filaDeDemos para montar recursos.demos ANTES
  // de instalarDemos (e portanto criarDemos) rodar — iniciarMotor só chama instalarDemos depois desse
  // passo. Esvaziar a fila aqui é seguro só por causa dessa ordem; invertida, recursos.demos chegaria
  // vazio ao passo 6 e toda div.demo[data-demo] da aula acusaria recursos.demo-sem-registro (erro).
  if (api.filaDeDemos) api.filaDeDemos.length = 0;
  api.demo = registrar;

  const raizes = (slide) => [...slide.querySelectorAll('div.demo[data-demo]')];

  function tentar(nome, etapa, acao) {
    try {
      acao();
    } catch (erro) {
      registro.error(`Aula USP: a demo "${nome}" falhou em ${etapa}.`, erro);
    }
  }

  function opcoes(raiz, nome) {
    const texto = raiz.getAttribute('data-opcoes');
    if (!texto) return {};
    try {
      return JSON.parse(texto);
    } catch (erro) {
      registro.error(`Aula USP: data-opcoes inválido na demo "${nome}".`, erro);
      return {};
    }
  }

  function definicaoDe(raiz) {
    const nome = raiz.getAttribute('data-demo');
    const definicao = definicoes.get(nome);
    if (!definicao) registro.warn(`Aula USP: demo sem registro: "${nome}".`);
    return { nome, definicao };
  }

  function montarSeNecessario(raiz) {
    const { nome, definicao } = definicaoDe(raiz);
    if (!definicao || montadas.has(raiz)) return definicao ?? null;
    montadas.add(raiz);
    tentar(nome, 'montar', () => definicao.montar?.(raiz, opcoes(raiz, nome)));
    return definicao;
  }

  return {
    tem: (nome) => definicoes.has(nome),
    montarSeNecessario,
    entrar(slide) {
      for (const raiz of raizes(slide)) {
        const definicao = montarSeNecessario(raiz);
        if (definicao) tentar(raiz.getAttribute('data-demo'), 'iniciar', () => definicao.iniciar?.());
      }
    },
    sair(slide) {
      for (const raiz of raizes(slide)) {
        if (!montadas.has(raiz)) continue;
        const { nome, definicao } = definicaoDe(raiz);
        if (definicao) tentar(nome, 'parar', () => definicao.parar?.());
      }
    },
  };
}

export function instalarDemos(motor, api) {
  const demos = criarDemos({ api, console: motor.janela.console });
  motor.aoMudar((estado, anterior) => {
    if (anterior && anterior.indice === estado.indice) return;
    if (anterior) demos.sair(motor.slides[anterior.indice]);
    demos.entrar(motor.slides[estado.indice]);
  });
  demos.entrar(motor.slides[motor.estado().indice]);
  return demos;
}
