import { getStore } from "@netlify/blobs";

const STORE = "agenda-estaca";
const KEY   = "calendar-events";

const H = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Seed with the 2026 stake calendar
const SEED = [
  // Janeiro
  {id:"c1",  month:"Janeiro",  day:11, dow:"Dom", tags:["visit"],           text:"Visita Oficial em Belford Roxo & Vilar dos Teles · Enc. Líderes Primária 17h · Treinamento Auditores 18h"},
  {id:"c2",  month:"Janeiro",  day:18, dow:"Dom", tags:["visit","train"],   text:"Visita Oficial em Jardim Metrópole & Rosa dos Ventos · Comitê Liderança Jovens · Treinamento LTHF Nacional · Auditoria Financeira: JM, NI e MC"},
  {id:"c3",  month:"Janeiro",  day:25, dow:"Dom", tags:["visit","conselho"],text:"Visita Oficial em Miguel Couto & Queimados · Reunião Sumo Conselho 07h · Serão Fechando as Malas – Barra da Tijuca · Auditoria: BR, NL e RV"},
  // Fevereiro
  {id:"c4",  month:"Fevereiro",day:1,  dow:"Dom", tags:["conf"],            text:"Devocional Mundial para Jovens Adultos"},
  {id:"c5",  month:"Fevereiro",day:8,  dow:"Dom", tags:["visit","conselho"],text:"Visita Oficial em Nilópolis & Nova Iguaçu · Sumo Conselho 07h · Conselho dos Bispos 16h · Conselho da Estaca 16h · Conselho das Alas 17h · Auditoria: QM, VT e Estaca"},
  {id:"c6",  month:"Fevereiro",day:14, dow:"Sáb", tags:["conf"],            text:"FSY — Conferências Força dos Jovens (início)"},
  {id:"c7",  month:"Fevereiro",day:22, dow:"Dom", tags:["conselho"],        text:"Visita Oficial em Rosa dos Ventos · Sumo Conselho 07h · Conselho de Coordenação 15h · Comitê Jovens · Comitê JAS"},
  {id:"c8",  month:"Fevereiro",day:28, dow:"Sáb", tags:["conf"],            text:"Celebração Local — Apresentação Coro do Tabernáculo"},
  // Março
  {id:"c9",  month:"Março",    day:8,  dow:"Dom", tags:["visit"],           text:"Dia da Mulher · Visita Oficial em Miguel Couto · Devocional Mundial Sociedade de Socorro"},
  {id:"c10", month:"Março",    day:15, dow:"Dom", tags:["conselho","conf"], text:"Sumo Conselho 07h · Conferência Ala Belford Roxo · Conselho da Estaca 15:30h · Live Saúde Mental 20h"},
  {id:"c11", month:"Março",    day:22, dow:"Dom", tags:["conf","train"],    text:"Conferência Ala Nilópolis · Sumo Conselho 16h · Treinamento Membros Conselho Bem-estar 18h"},
  {id:"c12", month:"Março",    day:28, dow:"Sáb", tags:["train"],           text:"Dia da Autossuficiência nas Alas 16h"},
  // Abril
  {id:"c13", month:"Abril",    day:4,  dow:"Sáb", tags:["conf"],            text:"Conferência Geral"},
  {id:"c14", month:"Abril",    day:5,  dow:"Dom", tags:["conf"],            text:"Páscoa · Conferência Geral"},
  {id:"c15", month:"Abril",    day:12, dow:"Dom", tags:["conselho"],        text:"Reunião de Testemunho · Sumo Conselho 07h · Formatura SEI 17h"},
  {id:"c16", month:"Abril",    day:19, dow:"Dom", tags:["visit","conselho"],text:"Conferência Ala Vilar dos Teles · Comitê Jovens · Reunião Geral Sacerdócio Estaca 18h"},
  {id:"c17", month:"Abril",    day:26, dow:"Dom", tags:["visit"],           text:"Visita Oficial em Queimados · Sumo Conselho 07h · Dia D Templo e HF"},
  // Maio
  {id:"c18", month:"Maio",     day:3,  dow:"Dom", tags:["conf"],            text:"Devocional Mundial para Jovens Adultos"},
  {id:"c19", month:"Maio",     day:17, dow:"Dom", tags:["visit","conselho"],text:"Visita Oficial em Rosa dos Ventos · Sumo Conselho 07h · Conselho da Estaca 16h · Conselho das Alas 17h"},
  {id:"c20", month:"Maio",     day:24, dow:"Dom", tags:["visit","train"],   text:"Visita Oficial em Jardim Metrópole · Comitê Jovens · Aniversário SA · Treinamento Novos Líderes 18h"},
  {id:"c21", month:"Maio",     day:31, dow:"Dom", tags:["visit"],           text:"Visita Oficial em Miguel Couto · Sumo Conselho 07h · Enc. Líderes Primária 17h"},
  // Junho
  {id:"c22", month:"Junho",    day:13, dow:"Sáb", tags:["conf"],            text:"Conferência da Estaca"},
  {id:"c23", month:"Junho",    day:14, dow:"Dom", tags:["conf"],            text:"Conferência da Estaca · Live Dia dos Namorados 18:30h"},
  {id:"c24", month:"Junho",    day:21, dow:"Dom", tags:["conf","train"],    text:"Conferência Ala Jardim Metrópole · Comitê Jovens · Treinamento Bem-estar 18h"},
  {id:"c25", month:"Junho",    day:28, dow:"Dom", tags:["conf","audit"],    text:"Conferência Ala Rosa dos Ventos · Sumo Conselho 07h · Treinamento Auditoria 18h"},
  // Julho
  {id:"c26", month:"Julho",    day:12, dow:"Dom", tags:["visit","conselho"],text:"Visita Oficial em Nilópolis · Sumo Conselho 07h · Conselho da Estaca 16h"},
  {id:"c27", month:"Julho",    day:19, dow:"Dom", tags:["visit","audit"],   text:"Visita Oficial em Nova Iguaçu · Comitê Jovens · Auditoria: QM e VT"},
  {id:"c28", month:"Julho",    day:26, dow:"Dom", tags:["visit","audit"],   text:"Visita Oficial em Queimados · Sumo Conselho 07h · Auditoria: BR, MC e RV"},
  // Agosto
  {id:"c29", month:"Agosto",   day:2,  dow:"Dom", tags:["audit"],           text:"Auditoria: JM, NI e NL · Enc. Líderes Primária 17h"},
  {id:"c30", month:"Agosto",   day:16, dow:"Dom", tags:["visit"],           text:"Visita Oficial em Vilar dos Teles · Sumo Conselho 07h · Primária no CHF"},
  {id:"c31", month:"Agosto",   day:23, dow:"Dom", tags:["visit"],           text:"Visita Oficial em Belford Roxo · Primária no CHF · Comitê Jovens"},
  {id:"c32", month:"Agosto",   day:30, dow:"Dom", tags:["visit"],           text:"Visita Oficial em Jardim Metrópole · Sumo Conselho 07h · Primária no CHF"},
  // Setembro
  {id:"c33", month:"Setembro", day:13, dow:"Dom", tags:["conf","conselho"], text:"Conferência Ala Miguel Couto · Sumo Conselho 07h · Conselho da Estaca 16h · Conselho dos Bispos 16h"},
  {id:"c34", month:"Setembro", day:20, dow:"Dom", tags:["conf"],            text:"Conferência Ala Nova Iguaçu · Comitê Jovens"},
  {id:"c35", month:"Setembro", day:27, dow:"Dom", tags:["conf"],            text:"Conferência Ala Queimados · Sumo Conselho 07h"},
  // Outubro
  {id:"c36", month:"Outubro",  day:3,  dow:"Sáb", tags:["conf"],            text:"Conferência Geral"},
  {id:"c37", month:"Outubro",  day:4,  dow:"Dom", tags:["conf"],            text:"Conferência Geral"},
  {id:"c38", month:"Outubro",  day:17, dow:"Sáb", tags:["conf","train"],    text:"Conferência da Estaca · Reunião de Liderança do Sacerdócio 18h"},
  {id:"c39", month:"Outubro",  day:18, dow:"Dom", tags:["conf"],            text:"Conferência da Estaca"},
  {id:"c40", month:"Outubro",  day:25, dow:"Dom", tags:["conselho","train"],text:"Sumo Conselho 07h · Sacramental Especial Primária Nilópolis · Comitê Jovens · Treinamento Novos Líderes 18h"},
  // Novembro
  {id:"c41", month:"Novembro", day:1,  dow:"Dom", tags:["conf"],            text:"Devocional Mundial para Jovens Adultos"},
  {id:"c42", month:"Novembro", day:8,  dow:"Dom", tags:["conselho"],        text:"Sumo Conselho 07h · Sacramental Especial Primária Belford Roxo e Nova Iguaçu"},
  {id:"c43", month:"Novembro", day:15, dow:"Dom", tags:["conselho"],        text:"Proclamação da República · Sacramental Especial Primária Queimados · Comitê Jovens"},
  {id:"c44", month:"Novembro", day:22, dow:"Dom", tags:["conselho","train"],text:"Sumo Conselho 07h · Sacramental Especial Primária Miguel Couto · Enc. Líderes Primária 17h · Treinamento Bem-estar 18h"},
  {id:"c45", month:"Novembro", day:29, dow:"Dom", tags:["conselho"],        text:"Sacramental Especial Primária VT e JM · Conselho da Estaca 16h"},
  // Dezembro
  {id:"c46", month:"Dezembro", day:6,  dow:"Dom", tags:["conf","audit"],    text:"Devocional de Natal da Primeira Presidência · Treinamento Auditoria da Estaca"},
  {id:"c47", month:"Dezembro", day:13, dow:"Dom", tags:["conselho"],        text:"Sumo Conselho 07h · Sacramental Especial Primária Rosa dos Ventos · Comitê Jovens · Devocional Encerramento CFS 17h"},
  {id:"c48", month:"Dezembro", day:20, dow:"Dom", tags:["conf"],            text:"Reunião Sacramental Especial (apenas sacramental)"},
  {id:"c49", month:"Dezembro", day:25, dow:"Qui", tags:["conf"],            text:"🎄 Natal"},
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

const MONTH_ORDER = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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
      // sort by month then day
      data.sort((a, b) => {
        const mi = MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month);
        return mi !== 0 ? mi : (a.day - b.day);
      });
      return new Response(JSON.stringify(data), { headers: H });
    }
    if (req.method === "POST") {
      const body = await req.json();
      const data = await getAll(store);
      const item = { ...body, id: Date.now().toString(), createdAt: new Date().toISOString() };
      if (!Array.isArray(item.tags)) item.tags = item.tags ? [item.tags] : [];
      data.push(item);
      await store.setJSON(KEY, data);
      return new Response(JSON.stringify(item), { status: 201, headers: H });
    }
    if (req.method === "PUT" && id) {
      const body = await req.json();
      const data = await getAll(store);
      const idx  = data.findIndex(i => i.id === id);
      if (idx === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: H });
      if (body.tags && !Array.isArray(body.tags)) body.tags = [body.tags];
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

export const config = { path: "/api/calendar" };
