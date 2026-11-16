import { criarColecao } from "../lib/collection.js";
import { ErroHttp } from "../lib/http.js";

// "Vamos dividir a Estaca": indicadores agregados por ala e trimestre,
// cenários de divisão e metas. Só totais — nunca dados pessoais.
const TIPOS = ["indicador", "cenario", "meta"];
const NUMERICOS = ["membros", "sm", "adultos", "jovens", "frequencia", "investidos", "batismos", "missionarios"];

export default criarColecao({
  store: "agenda-estaca",
  chave: "crescimento",
  normalizar: (item) => {
    if (!TIPOS.includes(item.tipo)) throw new ErroHttp(400, "Tipo inválido");
    if (item.tipo === "indicador") {
      if (!/^\d{4}-T[1-4]$/.test(item.periodo || "")) throw new ErroHttp(400, "Período inválido (use 2026-T3)");
      for (const k of NUMERICOS) {
        if (item[k] === undefined || item[k] === "") continue;
        const n = Number(item[k]);
        if (!Number.isFinite(n) || n < 0 || n > 1e6) throw new ErroHttp(400, `Valor inválido em ${k}`);
        item[k] = Math.round(n);
      }
    }
    return item;
  },
});

export const config = { path: "/api/crescimento" };
