import { criarColecao } from "../lib/collection.js";

export default criarColecao({
  store: "agenda-estaca",
  chave: "reunioes",
  ordenar: (a, b) => (b.data || "").localeCompare(a.data || ""), // mais recente primeiro
});

export const config = { path: "/api/reunioes" };
