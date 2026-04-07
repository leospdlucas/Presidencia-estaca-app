import { getStore } from "@netlify/blobs";

const STORE = "agenda-estaca";
const KEY   = "organograma";

const H = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Sumo Conselho da Estaca Nova Iguaçu — Março 2026
// Baseado na lista de chamados oficial (25 mar 2026)
const SEED = [
  {
    id: "sc1",
    nome: "Josafá Patrício Coelho",
    nomeAbrev: "Josafá Patrício",
    ala: "Ala Vilar dos Teles",
    dataDesignacao: "2022-01-23",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "Ala Jardim Metrópole",
    programasOrganizacoes: ["Presidente da Escola Dominical da Estaca"],
    obs: "Também designado para o Quórum de Élderes de Jd. Metrópole",
    telefone: "(21) 96447-9594"
  },
  {
    id: "sc2",
    nome: "Danilo Cesar França Filho",
    nomeAbrev: "Danilo França Filho",
    ala: "Ala Jardim Metrópole",
    dataDesignacao: "2024-10-27",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "Ala Miguel Couto",
    programasOrganizacoes: ["Presidente dos Rapazes da Estaca", "Auditor"],
    obs: "Supervisiona os quóruns do Sacerdócio Aarônico nas alas",
    telefone: "(21) 97679-7066"
  },
  {
    id: "sc3",
    nome: "Edivaldo Aparecido Godoi",
    nomeAbrev: "Edivaldo Godoi",
    ala: "Ala Miguel Couto",
    dataDesignacao: "2026-03-08",
    imposicaoMaos: false,
    status: "ativo",
    alaDesignada: "",
    programasOrganizacoes: [],
    obs: "Recém-chamado em março de 2026",
    telefone: ""
  },
  {
    id: "sc4",
    nome: "Antonio Sergio Pinheiro Lima",
    nomeAbrev: "Antônio Sérgio Lima",
    ala: "Ala Queimados",
    dataDesignacao: "2023-04-30",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "Ala Nilópolis",
    programasOrganizacoes: ["Autossuficiência e Bem-Estar da Estaca", "Membro do Comitê de Auditoria"],
    obs: "Lidera os esforços de autossuficiência na estaca",
    telefone: "(21) 99302-2574"
  },
  {
    id: "sc5",
    nome: "André Farias de Moraes",
    nomeAbrev: "André Moraes",
    ala: "Ala Belford Roxo",
    dataDesignacao: "2025-08-10",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "Ala Miguel Couto",
    programasOrganizacoes: ["JAS / Adultos Solteiros / Instituto"],
    obs: "Supervisiona os programas para jovens e adultos solteiros",
    telefone: "(21) 96434-9460"
  },
  {
    id: "sc6",
    nome: "Márcio Feliciano de Moraes",
    nomeAbrev: "Márcio Moraes",
    ala: "Ala Nilópolis",
    dataDesignacao: "2025-06-15",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "Ala Vilar dos Teles",
    programasOrganizacoes: ["Música da Estaca", "Patrimônio e Propriedades", "Escola Dominical"],
    obs: "Multifunção: música, patrimônio e escola dominical",
    telefone: "(21) 96434-9460"
  },
  {
    id: "sc7",
    nome: "Pedro Paulo Nazaré",
    nomeAbrev: "Pedro Nazaré",
    ala: "Ala Miguel Couto",
    dataDesignacao: "2019-04-07",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "Ala Miguel Couto",
    programasOrganizacoes: ["PRD — Programa de Referência para Deficientes", "Missionário de Serviço da Igreja"],
    obs: "Membro mais antigo do Sumo Conselho. Também serve como Missionário de Serviço.",
    telefone: "(21) 96447-6523"
  },
  {
    id: "sc8",
    nome: "Ricardo Brandão Nazaré",
    nomeAbrev: "Ricardo Nazaré",
    ala: "Ala Miguel Couto",
    dataDesignacao: "2026-01-25",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "",
    programasOrganizacoes: [],
    obs: "Chamado em janeiro de 2026",
    telefone: ""
  },
  {
    id: "sc9",
    nome: "José Batista de Oliveira Filho",
    nomeAbrev: "José Batista",
    ala: "Ala Nova Iguaçu",
    dataDesignacao: "2023-12-03",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "Ala Rosa dos Ventos",
    programasOrganizacoes: ["Templo e História da Família da Estaca", "Auditor"],
    obs: "Supervisiona os esforços de templo e história da família",
    telefone: "(21) 98093-8239"
  },
  {
    id: "sc10",
    nome: "Marcio Souza Da Silva",
    nomeAbrev: "Márcio Silva",
    ala: "Ala Vilar dos Teles",
    dataDesignacao: "2025-11-30",
    imposicaoMaos: true,
    status: "ativo",
    alaDesignada: "Ala Vilar dos Teles",
    programasOrganizacoes: ["Auditor"],
    obs: "",
    telefone: ""
  },
  {
    id: "sc11",
    nome: "",
    nomeAbrev: "Vaga em Aberto",
    ala: "",
    dataDesignacao: "",
    imposicaoMaos: false,
    status: "vago",
    alaDesignada: "",
    programasOrganizacoes: [],
    obs: "Chamado em aberto",
    telefone: ""
  },
  {
    id: "sc12",
    nome: "",
    nomeAbrev: "Vaga em Aberto",
    ala: "",
    dataDesignacao: "",
    imposicaoMaos: false,
    status: "vago",
    alaDesignada: "",
    programasOrganizacoes: [],
    obs: "Chamado em aberto",
    telefone: ""
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
      return new Response(JSON.stringify(data), { headers: H });
    }
    if (req.method === "POST") {
      const body = await req.json();
      const data = await getAll(store);
      const item = { ...body, id: Date.now().toString(), criadoEm: new Date().toISOString() };
      if (!Array.isArray(item.programasOrganizacoes)) item.programasOrganizacoes = [];
      data.push(item);
      await store.setJSON(KEY, data);
      return new Response(JSON.stringify(item), { status: 201, headers: H });
    }
    if (req.method === "PUT" && id) {
      const body = await req.json();
      const data = await getAll(store);
      const idx  = data.findIndex(i => i.id === id);
      if (idx === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: H });
      if (body.programasOrganizacoes && !Array.isArray(body.programasOrganizacoes)) {
        body.programasOrganizacoes = body.programasOrganizacoes.split('\n').filter(Boolean);
      }
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

export const config = { path: "/api/organograma" };
