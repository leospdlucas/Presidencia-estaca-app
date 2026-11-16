// Respostas HTTP padronizadas para todas as funções.
// Sem cabeçalhos CORS de propósito: o front-end é servido pelo mesmo site,
// então navegadores em outros domínios não conseguem ler as respostas.

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...BASE_HEADERS, ...extra } });
}

export function erro(status, mensagem, extra = {}) {
  return json({ error: mensagem, ...extra }, status);
}

export function semConteudo() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function lerCorpo(req, limiteBytes = 2_000_000) {
  const texto = await req.text();
  if (texto.length > limiteBytes) {
    const e = new Error("Conteúdo muito grande");
    e.status = 413;
    throw e;
  }
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch {
    const e = new Error("JSON inválido");
    e.status = 400;
    throw e;
  }
}

export class ErroHttp extends Error {
  constructor(status, mensagem, extra) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}
