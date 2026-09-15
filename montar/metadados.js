// Metadados da aula (spec 5.2) e data no idioma da aula.
import { rotulosPara } from '../motor/rotulos.js';

const METAS = ['unidade', 'disciplina', 'aula', 'data', 'professor'];

export function lerMetadados(doc) {
  const dados = {};
  for (const nome of METAS) {
    dados[nome] = doc.querySelector(`meta[name="${nome}"]`)?.getAttribute('content')?.trim() ?? '';
  }
  dados.lang = doc.documentElement.getAttribute('lang') || 'pt-BR';
  return dados;
}

export function formatarData(iso, lang) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!partes) return iso ?? '';
  const mes = Number(partes[2]);
  if (mes < 1 || mes > 12) return iso;
  return `${Number(partes[3])} ${rotulosPara(lang).meses[mes - 1]} ${partes[1]}`;
}
