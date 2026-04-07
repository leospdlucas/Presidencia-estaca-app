import { getStore } from "@netlify/blobs";

const STORE = "agenda-estaca";
const KEY   = "items";

const H = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SEED = [
  {id:"s1",  date:"2026-01-25",hora:"11:10",who:"oliveira",local:"Ala Miguel Couto",   action:"Desobrigação Pres. Quórum",        entrevistado:"Ricardo Nazaré",                ala:"Ala Miguel Couto",   status:"pendente",   obs:"Confirmar com o membro"},
  {id:"s2",  date:"2026-01-25",hora:"11:10",who:"oliveira",local:"Online",              action:"Renovação de Recomendação",        entrevistado:"Pres. Paulo Roberto Sant'Anna", ala:"Ala Nilópolis",      status:"pendente",   obs:"Confirmar com o Pres."},
  {id:"s3",  date:"2026-01-25",hora:"10:10",who:"alves",   local:"Ala Queimados",       action:"Renovação de Recomendação",        entrevistado:"Marilene",                      ala:"Ala Queimados",      status:"confirmado", obs:""},
  {id:"s4",  date:"2026-01-25",hora:"10:30",who:"alves",   local:"Ala Queimados",       action:"Endosso Eclesiástico e Renovação", entrevistado:"Ranielle",                      ala:"Ala Queimados",      status:"confirmado", obs:""},
  {id:"s5",  date:"2026-01-25",hora:"11:10",who:"alves",   local:"Ala Queimados",       action:"Renovação de Recomendação",        entrevistado:"Luana",                         ala:"Ala Queimados",      status:"confirmado", obs:""},
  {id:"s6",  date:"2026-02-01",hora:"10:10",who:"oliveira",local:"Ala Nova Iguaçu",     action:"Entrevista",                       entrevistado:"Milena e Paulo Vitor",           ala:"Ala Belford Roxo",   status:"pendente",   obs:"Aguardo resposta do membro"},
  {id:"s7",  date:"2026-02-01",hora:"11:10",who:"oliveira",local:"Ala Nova Iguaçu",     action:"Entrevista",                       entrevistado:"Bispo Oliveira",                ala:"Ala Nova Iguaçu",    status:"confirmado", obs:""},
  {id:"s8",  date:"2026-02-01",hora:"16:00",who:"oliveira",local:"Ala Queimados",       action:"Investiduras Próprias",            entrevistado:"Rosilanda (Paracambí)",         ala:"Ala Queimados",      status:"confirmado", obs:""},
  {id:"s9",  date:"2026-02-01",hora:"17:00",who:"oliveira",local:"Sede da Estaca",      action:"Entrevista",                       entrevistado:"Bispo Juan França",             ala:"Ala Queimados",      status:"confirmado", obs:""},
  {id:"s10", date:"2026-02-01",hora:"",     who:"torres",  local:"Online",              action:"Renovação de Recomendação",        entrevistado:"Raphael Figueiredo",            ala:"Ala Nilópolis",      status:"pendente",   obs:"Confirmar com o Pres."},
  {id:"s11", date:"2026-02-01",hora:"17:00",who:"torres",  local:"Online",              action:"Mentoria Missionária",             entrevistado:"Rebeka",                        ala:"Ala Vilar dos Teles",status:"confirmado", obs:""},
  {id:"s12", date:"2026-02-08",hora:"12:00",who:"oliveira",local:"Ala Nilópolis",       action:"Entrevista",                       entrevistado:"Bispo Bezerra",                 ala:"Ala Nilópolis",      status:"pendente",   obs:"Aguardo resposta"},
  {id:"s13", date:"2026-02-08",hora:"10:10",who:"torres",  local:"Ala Nova Iguaçu",     action:"Renovação de Recomendação",        entrevistado:"Rodrigo Campos e Natália",      ala:"Ala Nova Iguaçu",    status:"confirmado", obs:""},
  {id:"s14", date:"2026-02-08",hora:"10:10",who:"alves",   local:"Ala Nova Iguaçu",     action:"Renovação de Recomendação",        entrevistado:"Rosangelina (Gigi)",            ala:"Ala Nova Iguaçu",    status:"confirmado", obs:""},
  {id:"s15", date:"2026-03-01",hora:"12:10",who:"oliveira",local:"Ala Nova Iguaçu",     action:"Entrevista",                       entrevistado:"Vinícius Mota",                 ala:"Ala Nova Iguaçu",    status:"realizado",  obs:""},
  {id:"s16", date:"2026-03-01",hora:"11:10",who:"torres",  local:"Ala Vilar dos Teles", action:"Renovação de Recomendação",        entrevistado:"Jubiciara",                     ala:"Ala Vilar dos Teles",status:"realizado",  obs:""},
  {id:"s17", date:"2026-03-22",hora:"16:30",who:"oliveira",local:"Sede da Estaca",      action:"Renovação de Recomendação",        entrevistado:"Johnny",                        ala:"Ala Queimados",      status:"pendente",   obs:"Falta confirmar com Pres."},
  {id:"s18", date:"2026-03-22",hora:"17:10",who:"oliveira",local:"Sede da Estaca",      action:"Chamado",                          entrevistado:"Alexandre e Bispo Juan França",  ala:"Ala Queimados",      status:"confirmado", obs:""},
  {id:"s19", date:"2026-03-22",hora:"16:30",who:"alves",   local:"Sede da Estaca",      action:"Renovação de Recomendação",        entrevistado:"Simone Rosa",                   ala:"Ala Nilópolis",      status:"confirmado", obs:""},
  {id:"s20", date:"2026-03-22",hora:"17:30",who:"alves",   local:"Sede da Estaca",      action:"Chamado",                          entrevistado:"Leonardo Lucas",                ala:"Ala Queimados",      status:"confirmado", obs:""},
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
      return new Response(JSON.stringify(data), { headers: H });
    }
    if (req.method === "POST") {
      const body = await req.json();
      const data = await getAll(store);
      const item = { ...body, id: Date.now().toString(), createdAt: new Date().toISOString() };
      data.push(item);
      await store.setJSON(KEY, data);
      return new Response(JSON.stringify(item), { status: 201, headers: H });
    }
    if (req.method === "PUT" && id) {
      const body = await req.json();
      const data = await getAll(store);
      const idx  = data.findIndex(i => i.id === id);
      if (idx === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: H });
      data[idx] = { ...data[idx], ...body, updatedAt: new Date().toISOString() };
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

export const config = { path: "/api/agenda" };
