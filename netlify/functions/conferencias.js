import { criarColecao } from "../lib/collection.js";

// Planejamento das conferências de estaca (Manual Geral 29.3.1)
export default criarColecao({
  store: "agenda-estaca",
  chave: "conferencias",
  ordenar: (a, b) => (a.dataDomingo || "").localeCompare(b.dataDomingo || ""),
});

export const config = { path: "/api/conferencias" };
