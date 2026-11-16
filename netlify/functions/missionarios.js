import { criarColecao } from "../lib/collection.js";

// Missionários: do preparo ao relato no sumo conselho

export default criarColecao({ store: "agenda-estaca", chave: "missionarios" });

export const config = { path: "/api/missionarios" };
