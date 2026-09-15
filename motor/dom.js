// Utilitários de DOM compartilhados por montar/ e motor/. Só API padrão do DOM.

export function elemento(doc, tag, classe, texto) {
  const el = doc.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function clonarSemIds(no) {
  const copia = no.cloneNode(true);
  if (copia.nodeType === 1) {
    copia.removeAttribute('id');
    for (const comId of copia.querySelectorAll('[id]')) comId.removeAttribute('id');
  }
  return copia;
}
