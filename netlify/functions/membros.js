// /api/membros — lista de membros da estaca usada só para sugerir nomes
// (autocompletar). Guarda apenas nome, sexo e ala. Leitura exige login;
// só administradores podem importar uma lista nova.
import { criarDocumento } from "../lib/documento.js";
import { ErroHttp } from "../lib/http.js";

export default criarDocumento({
  store: "membros-estaca",
  chave: "lista",
  padrao: [],
  modo: "substituir",
  somenteAdminEscreve: true,
  limiteBytes: 3_000_000,
  validar: (corpo) => {
    const lista = Array.isArray(corpo) ? corpo : corpo.membros;
    if (!Array.isArray(lista)) throw new ErroHttp(400, "Envie uma lista de membros.");
    if (lista.length > 20000) throw new ErroHttp(400, "Lista grande demais.");
    return lista
      .map((m) => ({
        name: String(m.name || m.nome || "").trim().slice(0, 120),
        gender: m.gender === "F" || m.sexo === "F" ? "F" : m.gender === "M" || m.sexo === "M" ? "M" : "",
        ala: String(m.ala || m.unidade || "").trim().slice(0, 60),
      }))
      .filter((m) => m.name);
  },
});

export const config = { path: "/api/membros" };
