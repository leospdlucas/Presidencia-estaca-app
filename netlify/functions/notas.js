import { criarColecao } from "../lib/collection.js";

// Notas compartilhadas da presidência. As notas privadas ficam só no aparelho.
export default criarColecao({
  store: "notas",
  chave: "all",
  ordenar: (a, b) => (b.criadaEm || b.criadoEm || "").localeCompare(a.criadaEm || a.criadoEm || ""),
});

export const config = { path: "/api/notas" };
