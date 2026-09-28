// Conferência da CDN (spec 12, fase 3): o que o jsDelivr serve em /npm/aula-usp@<versão>/dist/ é,
// byte a byte, o que dist/manifesto.json registra? É a pergunta que o `integrity` da tag responde no
// navegador do autor, feita uma vez por arquivo, antes de alguém depender dela.
//
// Escrito e testado na fase 3a, RODADO só na 3b, depois da publicação e com autorização do autor.
// Por isso `buscar` chega por parâmetro e este módulo nunca chama `fetch` por conta própria: na 3b ele
// é o `fetch` global; no teste (tests/unit/conferir-cdn.test.mjs), um dublê que lê de dist/. Nada
// aqui faz pedido de rede ao ser importado.
//
// Na 3b, com a autorização:
//   node -e "import('./build/conferir-cdn.mjs').then(async ({ conferirCdn }) =>
//     console.table(await conferirCdn({ buscar: fetch })))"
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const RAIZ = new URL('../', import.meta.url);

// A base que build/pacotes.mjs escreve na tag fixada (tagFixada), lá como literal. São duas escritas
// do mesmo endereço, e tests/unit/conferir-cdn.test.mjs cai se divergirem: conferir um endereço que
// nenhuma aula pede seria uma conferência verde sobre nada.
export const baseDaCdn = (versao) => `https://cdn.jsdelivr.net/npm/aula-usp@${versao}/dist/`;

export async function conferirCdn({ buscar, raiz = RAIZ }) {
  const manifesto = JSON.parse(readFileSync(new URL('dist/manifesto.json', raiz), 'utf8'));
  const base = baseDaCdn(manifesto.versao);
  const resultados = [];
  for (const [nome, { bytes, integrity }] of Object.entries(manifesto.arquivos)) {
    const resposta = await buscar(base + nome);
    if (!resposta.ok) {
      resultados.push({ nome, ok: false, motivo: `HTTP ${resposta.status}` });
      continue;
    }
    const recebidos = Buffer.from(await resposta.arrayBuffer());
    const hash = `sha384-${createHash('sha384').update(recebidos).digest('base64')}`;
    // O tamanho vem antes do hash só para dizer MELHOR o que houve: bytes a mais ou a menos é um
    // diagnóstico que um hash diferente, sozinho, não dá.
    let motivo = '';
    if (recebidos.length !== bytes) motivo = `${recebidos.length} bytes, o manifesto registra ${bytes}`;
    else if (hash !== integrity) motivo = `hash ${hash}, o manifesto registra ${integrity}`;
    resultados.push({ nome, ok: motivo === '', motivo });
  }
  return resultados;
}
