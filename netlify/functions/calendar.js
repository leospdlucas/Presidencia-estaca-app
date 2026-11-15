import { criarColecao } from "../lib/collection.js";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default criarColecao({
  store: "agenda-estaca",
  chave: "calendar-events",
  ordenar: (a, b) => (MESES.indexOf(a.month) - MESES.indexOf(b.month)) || ((a.day || 0) - (b.day || 0)),
  normalizar: (item) => ({ ...item, tags: Array.isArray(item.tags) ? item.tags : item.tags ? [item.tags] : [] }),
});

export const config = { path: "/api/calendar" };
