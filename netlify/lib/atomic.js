// Leitura e gravação atômica de um documento JSON no Netlify Blobs.
// Usa o etag do blob: se outra pessoa gravou entre a leitura e a escrita,
// a escrita é recusada e a operação é refeita sobre o dado mais novo.
// Isso elimina a perda silenciosa de dados quando duas pessoas salvam juntas.

import { ErroHttp } from "./http.js";

const MAX_TENTATIVAS = 8;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export async function lerDoc(store, chave, padrao) {
  const atual = await store.getWithMetadata(chave, { type: "json" });
  if (!atual || atual.data === null || atual.data === undefined) return padrao;
  return atual.data;
}

/**
 * Aplica `alterar(dadoAtual)` de forma atômica.
 * `alterar` recebe uma cópia do dado e devolve { valor, resultado }.
 * Se devolver { semMudanca: true, resultado }, nada é gravado.
 */
export async function alterarDoc(store, chave, padrao, alterar) {
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const atual = await store.getWithMetadata(chave, { type: "json" });
    const existe = !!atual && atual.data !== null && atual.data !== undefined;
    const dado = existe ? structuredClone(atual.data) : structuredClone(padrao);

    const saida = await alterar(dado);
    if (saida.semMudanca) return saida.resultado;

    const opcoes = existe && atual.etag ? { onlyIfMatch: atual.etag } : { onlyIfNew: true };
    const r = await store.setJSON(chave, saida.valor, opcoes);
    if (!r || r.modified !== false) return saida.resultado;

    await espera(40 * 2 ** tentativa + Math.floor(Math.random() * 40));
  }
  throw new ErroHttp(503, "Muitas gravações simultâneas. Tente novamente em instantes.");
}
