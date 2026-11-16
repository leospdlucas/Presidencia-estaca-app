// Store em memória que imita a API do Netlify Blobs usada pelo app,
// incluindo gravação condicional por etag (onlyIfMatch / onlyIfNew).
import { _definirFabricaDeStores } from "../netlify/lib/stores.js";

export class StoreMemoria {
  constructor() { this.dados = new Map(); this.seq = 0; }
  async getWithMetadata(chave) {
    if (!this.dados.has(chave)) return null;
    const { valor, etag } = this.dados.get(chave);
    return { data: JSON.parse(valor), etag, metadata: {} };
  }
  async get(chave) {
    const r = await this.getWithMetadata(chave);
    return r ? r.data : null;
  }
  async setJSON(chave, valor, opcoes = {}) {
    const atual = this.dados.get(chave);
    if (opcoes.onlyIfNew && atual) return { modified: false };
    if (opcoes.onlyIfMatch && (!atual || atual.etag !== opcoes.onlyIfMatch)) return { modified: false };
    this.dados.set(chave, { valor: JSON.stringify(valor), etag: `"${++this.seq}"` });
    return { modified: true, etag: `"${this.seq}"` };
  }
  async delete(chave) { this.dados.delete(chave); }
}

export function instalarStores() {
  const stores = new Map();
  _definirFabricaDeStores((nome) => {
    if (!stores.has(nome)) stores.set(nome, new StoreMemoria());
    return stores.get(nome);
  });
  return stores;
}

export function req(metodo, caminho, { token, corpo } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request(`https://painel.exemplo${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

export async function corpo(res) {
  return JSON.parse(await res.text());
}
