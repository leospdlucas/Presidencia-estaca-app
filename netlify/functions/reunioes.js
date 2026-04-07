import { getStore } from "@netlify/blobs";

const STORE = "agenda-estaca";
const KEY   = "reunioes";

const H = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SEED = [
  {
    id: "r1",
    data: "2026-03-01",
    horaInicio: "18:00",
    horaTermino: "22:14",
    presidida: "Pres. Oliveira",
    dirigida: "Pres. Oliveira",
    oracaoAbertura: "Léo",
    oracaoEncerramento: "Fábio",
    pensamento: "",
    treinamento: "",
    assuntos: [
      {
        titulo: "Alteração da Agenda do Calendário",
        responsavel: "",
        texto: "22 Fev - Visita oficial em R. Ventos. Léo ficou de agendar a entrevista de avanço no sacerdócio de Melquisedeque, às 8:30, para os Irmãos Daniel, Damião e Diorge. Ficou de falar com o Bispo Borges para avisar à liderança da unidade que haverá um Conselho da Ala. Pres. Torres como orador visitante.\n\nPres. Alves ficou de solicitar ao Pres. Quórum de RV, para que o Pres. Oliveira e ele, ministrem a aula do quórum no próximo domingo, dia 22 fev.\n\nPres. Oliveira ficou de avisar sobre a data para o remanejamento da visita oficial da Estaca em Jd. Metrópole.\n\nLéo ficou de agendar com o Bispo Rodrigues e bispado da Ala B. Roxo na quinta-feira, dia 19/03 às 19h, sobre a conferência da Ala."
      },
      { titulo: "Chamados", responsavel: "", texto: "" },
      { titulo: "Conferências de Ala", responsavel: "", texto: "" },
      {
        titulo: "Visitada Presidência à membros",
        responsavel: "",
        texto: "Conversado sobre uma visita do Pres. Oliveira à família do Irmão Orlando."
      },
      {
        titulo: "Designações",
        responsavel: "",
        texto: "29 Mar às 15h, em Nova Iguaçú - Conselho de Condição de Membro\n\nLéo ficou de encontrar uma data antes do fim de março, para agendar o treinamento com o Ramiro, sobre o trabalho de historiador.\n\nFábio ficou de auxiliar com o volume de fichas de membro e itens de ação de despesas (falta de comprovantes de NFe) em Vilar dos Teles."
      }
    ],
    oradoresVisitantes: [
      { ala: "Belford Roxo",    orador: "Josafá" },
      { ala: "Jardim Metrópole", orador: "José Batista" },
      { ala: "Miguel Couto",    orador: "André Moraes" },
      { ala: "Nilópolis",       orador: "Antônio Sergio" },
      { ala: "Nova Iguaçu",     orador: "Sergio" },
      { ala: "Queimados",       orador: "Ricardo Nazaré" },
      { ala: "Rosa dos Ventos", orador: "Pres. Torres" },
      { ala: "Vilar dos Teles", orador: "Márcio" }
    ],
    sumosDesignados: [
      { ala: "Belford Roxo",    sumo: "Marcio" },
      { ala: "Rosa dos Ventos", sumo: "Marcio Moraes" },
      { ala: "Jardim Metrópole", sumo: "José Batista" },
      { ala: "Nova Iguaçu",     sumo: "Serginho" },
      { ala: "Vilar dos Teles", sumo: "André Moraes" },
      { ala: "Nilópolis",       sumo: "Antônio Sérgio" },
      { ala: "Queimados",       sumo: "Ricardo Nazaré" },
      { ala: "Miguel Couto",    sumo: "Josafá" }
    ],
    outrosAssuntos: "Conversado sobre a situação de membros com rixas e conflitos entre si.\n\nPonderar para a próxima reunião sobre o Irmão Anderson Albuquerque para Pres. Quórum Jd. Metrópole.",
    criadoEm: "2026-03-01T22:14:00Z"
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
      data.sort((a, b) => (a.data || "") > (b.data || "") ? -1 : 1); // newest first
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

export const config = { path: "/api/reunioes" };
