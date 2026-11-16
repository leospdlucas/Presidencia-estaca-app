import { criarColecao } from "../lib/collection.js";

// Registro de contatos regulares (bispos, quóruns, patriarca)

export default criarColecao({ store: "agenda-estaca", chave: "contatos" });

export const config = { path: "/api/contatos" };
