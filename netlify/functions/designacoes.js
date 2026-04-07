import { getStore } from "@netlify/blobs";

const STORE = "agenda-estaca";
const KEY   = "designacoes";

const H = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SEED = [
  {
    id: "d1",
    oque: "Discurso na Reunião Sacramental",
    quem: "Pres. André Oliveira",
    chamado: "Presidente da Estaca",
    quando: "2026-01-25",
    hora: "10:00",
    onde: "Ala Queimados",
    obs: "Tema: Convênios do Batismo",
    status: "confirmado"
  },
  {
    id: "d2",
    oque: "Treinamento de Líderes do Sacerdócio Aarônico",
    quem: "Romilson Torres",
    chamado: "1º Conselheiro",
    quando: "2026-02-08",
    hora: "17:00",
    onde: "Sede da Estaca",
    obs: "Preparar material sobre deveres dos diáconos",
    status: "pendente"
  },
  {
    id: "d3",
    oque: "Treinamento de Autossuficiência",
    quem: "Thiago Alves",
    chamado: "2º Conselheiro",
    quando: "2026-02-08",
    hora: "18:00",
    onde: "Ala Belford Roxo",
    obs: "",
    status: "confirmado"
  },
  {
    id: "d4",
    oque: "Visita à Ala Nilópolis — Ensaio Coral",
    quem: "Romilson Torres",
    chamado: "1º Conselheiro",
    quando: "2026-03-15",
    hora: "09:00",
    onde: "Ala Nilópolis",
    obs: "Observar preparo para conferência da ala",
    status: "pendente"
  },
  {
    id: "d5",
    oque: "Reunião com Bispo sobre reativação",
    quem: "Thiago Alves",
    chamado: "2º Conselheiro",
    quando: "2026-03-22",
    hora: "16:00",
    onde: "Ala Nova Iguaçu",
    obs: "Levar lista de membros menos ativos",
    status: "pendente"
  }
];

async function getAll(store) {
  try {
    const raw = await store.get(KEY, { type: "json" });
    if (Array.isArray(raw)) return raw;       // inclui array vazio — estado válido
    if (raw !== null && raw !== undefined) return raw;
    // primeira execução — seed inicial apenas quando não há dados ainda
    await store.setJSON(KEY, SEED);
    return SEED;
  } catch {
    // erro na leitura — NÃO sobrescreve o banco, retorna seed apenas como exibição
    return SEED;
  }
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });

  let store;
  try { store = getStore(STORE); }
  catch (e) { return new Response(JSON.stringify({ error: "Blobs: " + e.message }), { status: 500, headers: H }); }

  const url = new URL(req.url);
  const id  = url.searchParams.get("id");

  try {
    if (req.method === "GET") {
      const data = await getAll(store);
      data.sort((a, b) => (a.quando || "") > (b.quando || "") ? 1 : -1);
      return new Response(JSON.stringify(data), { headers: H });
    }
    if (req.method === "POST") {
      const body = await req.json();
      const data = await getAll(store);
      const item = { ...body, id: Date.now().toString(), criadoEm: new Date().toISOString() };
      data.push(item);
      await store.setJSON(KEY, data);
      return new Response(JSON.stringify(item), { status: 201, headers: H });
    }
    if (req.method === "PUT" && id) {
      const body = await req.json();
      const data = await getAll(store);
      const idx  = data.findIndex(i => i.id === id);
      if (idx === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: H });
      data[idx] = { ...data[idx], ...body, atualizadoEm: new Date().toISOString() };
      await store.setJSON(KEY, data);
      return new Response(JSON.stringify(data[idx]), { headers: H });
    }
    if (req.method === "DELETE" && id) {
      const data = await getAll(store);
      await store.setJSON(KEY, data.filter(i => i.id !== id));
      return new Response(JSON.stringify({ ok: true }), { headers: H });
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: H });
  }
};

export const config = { path: "/api/designacoes" };
