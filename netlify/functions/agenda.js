import { criarColecao } from "../lib/collection.js";

export default criarColecao({
  store: "agenda-estaca",
  chave: "items",
  ordenar: (a, b) => `${a.date || ""}${a.hora || ""}`.localeCompare(`${b.date || ""}${b.hora || ""}`),
});

export const config = { path: "/api/agenda" };
