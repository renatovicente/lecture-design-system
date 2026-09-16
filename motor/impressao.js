// Impressão (spec 6.9 e 8.4): revela os passos, gera uma cópia por estado onde o autor pediu,
// troca as demos pela imagem e esconde os painéis; restaurar desfaz tudo.
import { elemento } from './dom.js';
import { copiarSlide } from './copias.js';
import { gruposDePassos, aplicarPassos, passosRevelados } from './passos.js';

const PASSOS_NO_PDF = 'passos';

export function paginasEsperadas(doc) {
  return [...doc.querySelectorAll('section.slide:not([data-copia])')]
    .reduce((total, slide) => total + 1 + (slide.getAttribute('data-pdf') === PASSOS_NO_PDF ? gruposDePassos(slide).length : 0), 0);
}

export function instalarImpressao(motor, { demos, paineis, api }) {
  const { doc, janela, rot } = motor;
  let salvo = null;

  function capturar(raiz) {
    const definicao = demos?.montarSeNecessario(raiz);
    if (!definicao?.capturar) return null;
    try {
      const resultado = definicao.capturar();
      if (!resultado) return null;
      return typeof resultado === 'string' ? resultado : resultado.toDataURL?.() ?? null;
    } catch (erro) {
      janela.console.error(`Aula USP: a demo "${raiz.getAttribute('data-demo')}" falhou em capturar.`, erro);
      return null;
    }
  }

  function trocarDemos() {
    for (const raiz of doc.querySelectorAll('div.demo')) {
      if (raiz.querySelector(':scope > img.estatico')) continue;
      const imagem = capturar(raiz);
      if (imagem) {
        const captura = elemento(doc, 'img', 'captura-demo');
        captura.setAttribute('src', imagem);
        captura.setAttribute('alt', rot.demoInterativa);
        raiz.append(captura);
      } else {
        raiz.append(elemento(doc, 'div', 'demo-substituta', rot.demoInterativa));
      }
    }
  }

  function preparar() {
    if (salvo) return;
    salvo = {
      estado: motor.estado(),
      painel: paineis?.aberto() ?? null,
      contagens: motor.slides.map((slide) => passosRevelados(gruposDePassos(slide))),
    };
    paineis?.fechar();
    trocarDemos();
    for (const slide of motor.slides) {
      const grupos = gruposDePassos(slide);
      if (slide.getAttribute('data-pdf') === PASSOS_NO_PDF) {
        grupos.forEach((_, k) => {
          const copia = copiarSlide(slide, `impressao-${k}`);
          copia.setAttribute('data-copia', '');
          aplicarPassos(gruposDePassos(copia), k);
          slide.parentNode.insertBefore(copia, slide);
        });
      }
      aplicarPassos(grupos, grupos.length);
    }
    doc.body.classList.add('imprimindo');
  }

  function restaurar() {
    if (!salvo) return;
    for (const extra of doc.querySelectorAll('[data-copia], .captura-demo, .demo-substituta')) extra.remove();
    doc.body.classList.remove('imprimindo');
    const { estado, painel, contagens } = salvo;
    salvo = null;
    motor.slides.forEach((slide, indice) => {
      aplicarPassos(gruposDePassos(slide), indice === estado.indice ? estado.passo : contagens[indice]);
    });
    if (painel) paineis?.abrir(painel);
  }

  janela.addEventListener('beforeprint', preparar);
  janela.addEventListener('afterprint', restaurar);
  api.prepararImpressao = preparar;
  api.restaurarImpressao = restaurar;
  return { preparar, restaurar };
}
