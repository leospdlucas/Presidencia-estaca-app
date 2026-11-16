import { criarColecao } from "../lib/collection.js";

export default criarColecao({
  store: "agenda-estaca",
  chave: "organograma",
  normalizar: (item) => {
    let p = item.programasOrganizacoes;
    if (typeof p === "string") p = p.split("\n").map((s) => s.trim()).filter(Boolean);
    return { ...item, programasOrganizacoes: Array.isArray(p) ? p : [] };
  },
});

export const config = { path: "/api/organograma" };
