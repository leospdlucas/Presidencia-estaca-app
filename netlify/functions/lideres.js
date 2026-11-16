import { criarColecao } from "../lib/collection.js";

// Diretório de líderes (sem cadastro de membros comuns)

export default criarColecao({ store: "agenda-estaca", chave: "lideres" });

export const config = { path: "/api/lideres" };
