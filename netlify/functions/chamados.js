import { criarColecao } from "../lib/collection.js";

const TIPOS = ["chamado", "desobrigacao", "ordenacao-elder", "ordenacao-sumo"];

// Processos de chamado, desobrigação e ordenação (Manual Geral 30.8 e 18.10)
export default criarColecao({
  store: "agenda-estaca",
  chave: "chamados",
  normalizar: (item) => ({
    ...item,
    tipo: TIPOS.includes(item.tipo) ? item.tipo : "chamado",
    etapas: item.etapas && typeof item.etapas === "object" && !Array.isArray(item.etapas) ? item.etapas : {},
    status: ["andamento", "concluido", "cancelado"].includes(item.status) ? item.status : "andamento",
  }),
});

export const config = { path: "/api/chamados" };
