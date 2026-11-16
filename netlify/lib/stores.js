import { getStore } from "@netlify/blobs";

// Leitura forte: depois de gravar, a próxima leitura já vê o dado novo.
let fabrica = (nome) => getStore({ name: nome, consistency: "strong" });

export function abrirStore(nome) {
  return fabrica(nome);
}

// Usado só pelos testes automatizados para trocar o Blobs por memória.
export function _definirFabricaDeStores(f) {
  fabrica = f;
}
