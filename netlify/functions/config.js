// /api/config — configurações compartilhadas entre todos os aparelhos
// (nomes da presidência, alas, frequência da escala de discursos etc.).
import { criarDocumento } from "../lib/documento.js";
import { ErroHttp } from "../lib/http.js";

export default criarDocumento({
  store: "agenda-estaca",
  chave: "config",
  padrao: {},
  modo: "mesclar",
  limiteBytes: 200_000,
  validar: (corpo) => {
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new ErroHttp(400, "Configuração inválida.");
    return corpo;
  },
});

export const config = { path: "/api/config" };
