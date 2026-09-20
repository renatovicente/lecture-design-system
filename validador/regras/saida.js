// As quatro regras de saída (spec 9.2): só fazem sentido sobre o HTML final, já construído — nunca
// sobre o fonte que o autor escreve. Grupo "saida": build/validar.mjs chama depois de montar() e de
// embutir tudo (marco 5b); o marco 4c não roda este grupo no navegador, porque cobertura, bytes e as
// páginas do PDF só existem depois do build (marco 5c). Mesmo assim o arquivo continua sem importar
// nada do Node (spec 3.5): quem lê disco, gera o PDF e calcula cobertura/bytes/páginas é build/, e
// entrega tudo pronto pelo contexto de validar().
import { onde, trechoDe, encurtar, plural } from '../validar.js';
import { INVISIVEL } from './recursos.js';

// "Externo" para as três fontes abaixo: não vazio, não já embutido (data:) e não uma referência
// interna por id (#gradiente, #corte — como o url(#id) de SVG). Um url() sem argumento nenhum (o
// build deixa exatamente "url()" numa família do KaTeX que a aula não usa, spec 3.3 etapa 4) também
// não conta: string vazia.
function eExterno(valor) {
  return !!valor && !valor.startsWith('data:') && !valor.startsWith('#');
}

// O conteúdo de um url(...) de CSS, sem as aspas que ele pode ou não ter.
function semAspas(bruto) {
  const limpo = bruto.trim();
  const aspa = limpo[0];
  return (aspa === '"' || aspa === "'") && limpo.at(-1) === aspa ? limpo.slice(1, -1) : limpo;
}

// slide/id de quem carrega a referência, só quando existe uma section por perto: um link de <head>
// ou um <style> tanto de <head> quanto solto no <body> não têm (onde() exige a section para contar
// o número do slide) — o achado sai como um problema da aula inteira, não de um slide.
function ondeExterno(elemento, slides) {
  const secao = elemento.closest('section');
  return secao ? onde(slides, secao) : {};
}

// Nós de texto do HTML final. Ao contrário de textosDe (componentes/tex.js), aqui nada de matemática
// fica de fora: textosDe pula pre, code, svg e [data-tex] porque a pergunta dele é "onde TeX pode
// aparecer no FONTE" — mas no HTML CONSTRUÍDO é justamente dentro de [data-tex] (o wrapper que
// renderizarTex deixa em cada .katex) que moram os glifos que esta regra existe para conferir (fato
// 8: η ← ∇ ∑ ⊤ Δ ⋅, todos ali). Reusar aquele andador cegaria a regra para o próprio caso que ela
// precisa pegar — por isso um andador à parte, com a única exclusão que faz sentido para "todo texto
// do HTML final": script e style não desenham glifo nenhum na página (o navegador não os pinta com
// fonte nenhuma; não são conteúdo, são código e folha de estilo).
function* textosDoHtml(raiz) {
  for (const no of raiz.childNodes) {
    if (no.nodeType === 3) { yield no; continue; }
    if (no.nodeType !== 1 || no.matches('script, style')) continue;
    yield* textosDoHtml(no);
  }
}

export const regras = [
  {
    nome: 'saida.referencia-externa',
    // Percorre o DOM, nunca o texto do arquivo (fato 9): o motor embutido tem, no JavaScript
    // minificado, um trecho que reescreve url(#id) de SVG — como texto puro, algo como
    // "url(${o}#${t.get(n)})", que um regex sobre o arquivo inteiro leria como CSS. Cada fonte
    // abaixo só existe pela estrutura do DOM que a torna real: um atributo, ou o texto de um
    // elemento <style> especificamente — nunca de <script>.
    *aplicar({ doc, slides }) {
      for (const elemento of doc.querySelectorAll('[src]')) {
        const valor = elemento.getAttribute('src');
        if (!eExterno(valor)) continue;
        yield {
          ...ondeExterno(elemento, slides),
          mensagem: `<${elemento.nodeName.toLowerCase()}> com referência externa em src: "${valor}".`,
          trecho: trechoDe(elemento),
        };
      }
      for (const folha of doc.querySelectorAll('link[rel="stylesheet"][href]')) {
        const valor = folha.getAttribute('href');
        if (!eExterno(valor)) continue;
        yield {
          ...ondeExterno(folha, slides),
          mensagem: `<link> de folha de estilo externa: "${valor}".`,
          trecho: trechoDe(folha),
        };
      }
      // Só dentro de <style> — nunca <script> (fato 9): o valor de cada url(...) do CSS.
      for (const estilo of doc.querySelectorAll('style')) {
        for (const correspondencia of estilo.textContent.matchAll(/url\(([^)]*)\)/g)) {
          const valor = semAspas(correspondencia[1]);
          if (!eExterno(valor)) continue;
          yield {
            ...ondeExterno(estilo, slides),
            mensagem: `url() externa dentro de <style>: "${valor}".`,
            trecho: encurtar(correspondencia[0]),
          };
        }
      }
    },
  },
  {
    nome: 'saida.tamanho',
    // O limiar mora em contrato.limites, como os outros 24 (limites.js abre com a mesma regra: "os
    // números vêm todos de contrato.limites; o código só sabe contar") — nunca um valor fixo aqui,
    // por mais que o fato 10 tenha medido o número. Em megabytes, não bytes crus: contrato.json é
    // editado por gente, e 10 se lê melhor que 10485760.
    *aplicar({ bytes, contrato }) {
      const megabytes = contrato.limites['saida.megabytes'];
      if (!Number.isFinite(bytes) || bytes <= megabytes * 1024 * 1024) return;
      yield { mensagem: `HTML final com ${(bytes / (1024 * 1024)).toFixed(1)} MB (acima de ${megabytes} MB).` };
    },
  },
  {
    nome: 'saida.glifo-ausente',
    // A cobertura é dependente de contexto (revisão final do 5b, I1): dentro de `.katex` vale a
    // união (fato 8 — usar só o sistema ali acusaria sete erros falsos, porque só katex.css nomeia
    // KaTeX_Math, KaTeX_Size1 etc.), fora vale só `coberturaSistema` — a `.katex` de uma equação
    // nunca aplica a texto de PROSA comum, então um caractere que só existe numa família do KaTeX
    // (Σ, Γ, Ω…) tem de continuar acusando fora dali. NUNCA validador/cobertura.json (só sistema, sem
    // interseção de unicode-range) — alimentada por ele, esta regra acusaria à toa qualquer aula com
    // matemática fora do repertório do sistema. Sem coberturaSistema no contexto (fora de um build),
    // a regra se cala — mesmo desenho de matematica.simbolo-fora-do-tex: acusar tudo por um contexto
    // incompleto é pior que não acusar nada.
    *aplicar({ slides, coberturaSistema, coberturaKatex }) {
      if (!coberturaSistema) return;
      for (const secao of slides) {
        const vistos = new Set(); // uma vez por slide, não uma vez por ocorrência
        for (const no of textosDoHtml(secao)) {
          const dentroDoKatex = no.parentElement?.closest('.katex') != null;
          for (const caractere of no.textContent) {
            const ponto = caractere.codePointAt(0);
            const temGlifo = coberturaSistema.has(ponto) || (dentroDoKatex && coberturaKatex?.has(ponto));
            if (INVISIVEL.test(caractere) || temGlifo || vistos.has(ponto)) continue;
            vistos.add(ponto);
            yield {
              ...onde(slides, secao),
              mensagem: `caractere sem glifo nas fontes embutidas: "${caractere}" (U+${ponto.toString(16).toUpperCase().padStart(4, '0')}).`,
              trecho: encurtar(no.textContent),
            };
          }
        }
      }
    },
  },
  {
    nome: 'saida.pdf-paginas',
    // Comparação, não heurística (fato 4 da sondagem): paginasEsperadas (motor/impressao.js, desde o
    // marco 2) já é o oráculo, e quem a chama é o build — nunca recalcule aqui. Duas verdades sobre o
    // mesmo número é a classe de defeito que este projeto mais pagou caro. Sem paginasDoPdf no
    // contexto (build com --sem-pdf, ou sem Chrome) a regra se cala, em vez de acusar: mesma
    // disciplina de degradação de matematica.simbolo-fora-do-tex e saida.glifo-ausente. Um achado sem
    // slide sai como "aula" (spec 9.1) — o PDF é sempre da aula inteira, nunca de um slide só.
    // M9 da revisão final: a guarda era assimétrica — faltar paginasDoPdf calava a regra, faltar
    // paginasEsperadas não, e saía "PDF com 11 páginas (esperadas undefined)". Dentro de build() as
    // duas sempre existem juntas (a etapa 7 calcula as duas), mas esta regra é módulo público do
    // validador, e uma mensagem com "undefined" é pior que o silêncio que o resto da família já
    // pratica. As duas guardadas, pela mesma razão: contexto incompleto não acusa.
    *aplicar({ paginasDoPdf, paginasEsperadas }) {
      if (!Number.isFinite(paginasDoPdf) || !Number.isFinite(paginasEsperadas)) return;
      if (paginasDoPdf === paginasEsperadas) return;
      yield { mensagem: `PDF com ${plural(paginasDoPdf, 'página', 'páginas')} (esperadas ${paginasEsperadas}).` };
    },
  },
];
