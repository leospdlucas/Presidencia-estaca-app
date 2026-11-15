import { criarColecao } from "../lib/collection.js";

// Escala de discursos da estaca nas alas (Manual Geral 6.5.1)

export default criarColecao({ store: "agenda-estaca", chave: "discursos" });

export const config = { path: "/api/discursos" };
