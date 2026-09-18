// Regras de carga (spec 9.2 e 9.3): o que só se sabe depois de carregar bibliotecas, imagens e scripts.
// As regras não carregam nada — quem carrega é o chamador, e entrega o resultado no contexto:
//   recursos = { tex: [{ trecho, mensagem }], imagens: Map(src → carregou), demos: Map(nome → { capturar }) }
// No navegador isso vem do DOM vivo; no build, do KaTeX rodando no Node e do disco.
import { onde, trechoDe, encurtar } from '../validar.js';

export const regras = [
  {
    nome: 'matematica.tex-invalido',
    *aplicar({ slides, recursos }) {
      for (const erro of recursos?.tex ?? []) {
        const secao = erro.elemento?.closest('section');
        yield {
          ...(secao ? onde(slides, secao) : {}),
          mensagem: `TeX que o KaTeX não compila: ${erro.mensagem}`,
          trecho: encurtar(erro.trecho ?? ''),
        };
      }
    },
  },
  {
    nome: 'recursos.imagem',
    *aplicar({ slides, recursos }) {
      if (!recursos?.imagens) return;
      for (const secao of slides) {
        for (const imagem of secao.querySelectorAll('img')) {
          const src = imagem.getAttribute('src') ?? '';
          if (src.startsWith('data:')) continue; // imagem embutida não tem o que faltar
          if (recursos.imagens.get(src) === false) {
            yield { ...onde(slides, secao), mensagem: `imagem que não carregou: "${src}".`, trecho: trechoDe(imagem) };
          }
        }
      }
    },
  },
  {
    nome: 'recursos.demo-sem-registro',
    *aplicar({ slides, recursos }) {
      if (!recursos?.demos) return;
      for (const secao of slides) {
        for (const demo of secao.querySelectorAll('div.demo[data-demo]')) {
          const nome = demo.getAttribute('data-demo');
          if (!recursos.demos.has(nome)) {
            yield { ...onde(slides, secao), mensagem: `demo sem registro: "${nome}".`, trecho: trechoDe(demo) };
          }
        }
      }
    },
  },
  {
    nome: 'recursos.demo-sem-estatico',
    *aplicar({ slides, recursos }) {
      if (!recursos?.demos) return;
      for (const secao of slides) {
        for (const demo of secao.querySelectorAll('div.demo[data-demo]')) {
          const nome = demo.getAttribute('data-demo');
          const registro = recursos.demos.get(nome);
          if (!registro) continue; // sem registro já é recursos.demo-sem-registro
          if (demo.querySelector('img.estatico') || registro.capturar) continue;
          yield { ...onde(slides, secao), mensagem: `demo "${nome}" sem img.estatico e sem capturar(): o PDF sai vazio.`, trecho: trechoDe(demo) };
        }
      }
    },
  },
];
