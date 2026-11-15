// Servidor local para testar o painel sem conta no Netlify.
//   npm run build && node scripts/dev.mjs
// Serve dist/ e executa as funções de netlify/functions com dados em memória
// (apagados ao parar o servidor). PIN de configuração inicial: 123456.

import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { _definirFabricaDeStores } from "../netlify/lib/stores.js";

const RAIZ = new URL("..", import.meta.url).pathname;
const PORTA = Number(process.env.PORT || 8888);
process.env.AUTH_SECRET ||= "segredo-local-de-desenvolvimento-com-32+";
process.env.ADMIN_BOOTSTRAP_PIN ||= "123456";

class StoreMemoria {
  constructor() { this.d = new Map(); this.n = 0; }
  async getWithMetadata(k) { const v = this.d.get(k); return v ? { data: JSON.parse(v.v), etag: v.e, metadata: {} } : null; }
  async setJSON(k, valor, o = {}) {
    const a = this.d.get(k);
    if (o.onlyIfNew && a) return { modified: false };
    if (o.onlyIfMatch && (!a || a.e !== o.onlyIfMatch)) return { modified: false };
    this.d.set(k, { v: JSON.stringify(valor), e: String(++this.n) });
    return { modified: true };
  }
}
const stores = new Map();
_definirFabricaDeStores((nome) => stores.get(nome) || stores.set(nome, new StoreMemoria()).get(nome));

const rotas = {};
for (const f of await readdir(join(RAIZ, "netlify/functions"))) {
  const mod = await import(join(RAIZ, "netlify/functions", f));
  if (mod.config?.path) rotas[mod.config.path] = mod.default;
}

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  const fn = rotas[url.pathname];
  if (fn) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const corpo = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await fn(new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : corpo }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  try {
    const caminho = url.pathname === "/" ? "/index.html" : url.pathname;
    const dados = await readFile(join(RAIZ, "dist", caminho));
    res.writeHead(200, { "Content-Type": TIPOS[extname(caminho)] || "application/octet-stream" });
    res.end(dados);
  } catch {
    res.writeHead(404); res.end("não encontrado");
  }
}).listen(PORTA, () => console.log(`Painel local em http://localhost:${PORTA} (PIN inicial ${process.env.ADMIN_BOOTSTRAP_PIN})`));
