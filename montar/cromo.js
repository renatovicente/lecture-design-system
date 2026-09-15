// Elementos gerados pelo sistema (spec 5.3 e 5.4). Só API padrão do DOM.

export const doisDigitos = (numero) => String(numero).padStart(2, '0');

function elemento(doc, tag, classe, texto) {
  const el = doc.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function criarBlocoNdeM(doc, rot, numero, total) {
  return elemento(doc, 'span', 'bloco-n-de-m', `${rot.bloco} ${numero} ${rot.de} ${total}`);
}

export function criarCabecalho(doc, { rotulo, blocos, estados, modo, blocoAtual, contador, rot }) {
  const cabecalho = elemento(doc, 'header', 'cabecalho');
  cabecalho.append(elemento(doc, 'span', 'rotulo', rotulo));
  if (modo === 'fileira') {
    const mapa = elemento(doc, 'nav', 'mapa');
    blocos.forEach((bloco, k) => {
      const quadrado = elemento(doc, 'a', `quadrado ${estados[k]}`);
      quadrado.setAttribute('href', `#${bloco.id}`);
      quadrado.setAttribute('aria-label', `${rot.bloco} ${bloco.numero}: ${bloco.titulo}`);
      mapa.append(quadrado);
    });
    cabecalho.append(mapa);
  } else if (modo === 'contador' && blocoAtual !== null) {
    cabecalho.append(criarBlocoNdeM(doc, rot, blocoAtual, blocos.length));
  }
  cabecalho.append(elemento(doc, 'span', 'contador', contador));
  return cabecalho;
}

export function criarRodape(doc, texto) {
  return elemento(doc, 'footer', 'rodape', texto);
}

export function criarMetadadosCapa(doc, linhas) {
  const metadados = elemento(doc, 'div', 'metadados-capa');
  for (const linha of linhas) metadados.append(elemento(doc, 'p', null, linha));
  return metadados;
}

export function criarRoteiro(doc, blocos) {
  const roteiro = elemento(doc, 'ol', 'roteiro');
  roteiro.setAttribute('data-n', String(blocos.length));
  for (const bloco of blocos) {
    const item = doc.createElement('li');
    item.append(elemento(doc, 'span', 'quadrado futuro'), elemento(doc, 'span', 'nome-curto', bloco.curto));
    roteiro.append(item);
  }
  return roteiro;
}

export function criarFileira(doc, blocos, estados) {
  const fileira = elemento(doc, 'ol', 'fileira');
  fileira.setAttribute('data-n', String(blocos.length));
  blocos.forEach((bloco, k) => {
    const item = doc.createElement('li');
    item.setAttribute('data-estado', estados[k]);
    const quadrado = elemento(doc, 'span', `quadrado ${estados[k]}`);
    if (estados[k] === 'atual') quadrado.append(elemento(doc, 'span', 'numero-bloco', doisDigitos(bloco.numero)));
    item.append(quadrado, elemento(doc, 'span', 'nome-curto', bloco.curto));
    fileira.append(item);
  });
  return fileira;
}

export function criarFaixaDeMarca(doc, { unidade, usp, urlMarcas }) {
  const faixa = elemento(doc, 'div', 'faixa-de-marca');
  const logo = elemento(doc, 'img', 'marca-unidade');
  logo.setAttribute('src', `${urlMarcas}/${unidade.arquivo}`);
  logo.setAttribute('alt', unidade.integraUSP ? `${unidade.nome} · ${usp.texto}` : unidade.nome);
  logo.setAttribute('height', String(unidade.altura));
  faixa.append(logo);
  if (!unidade.integraUSP) {
    const assinatura = elemento(doc, 'div', 'marca-usp');
    const texto = doc.createElement('span');
    const [primeira, ...resto] = usp.texto.split(' ');
    texto.append(doc.createTextNode(primeira), doc.createElement('br'), doc.createTextNode(resto.join(' ')));
    const logoUsp = doc.createElement('img');
    logoUsp.setAttribute('src', `${urlMarcas}/${usp.arquivo}`);
    logoUsp.setAttribute('alt', usp.texto);
    logoUsp.setAttribute('height', String(usp.altura));
    assinatura.append(texto, logoUsp);
    faixa.append(assinatura);
  }
  return faixa;
}
