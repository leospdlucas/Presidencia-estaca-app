import { criarColecao } from "../lib/collection.js";

export default criarColecao({
  store: "agenda-estaca",
  chave: "designacoes",
  ordenar: (a, b) => (a.quando || "").localeCompare(b.quando || ""),
});

export const config = { path: "/api/designacoes" };
