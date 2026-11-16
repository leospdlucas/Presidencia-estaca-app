import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { instalarStores, req, corpo } from "./helpers.mjs";

process.env.AUTH_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";
process.env.ADMIN_BOOTSTRAP_PIN = "135792";

const auth = (await import("../netlify/functions/auth.js")).default;
const agenda = (await import("../netlify/functions/agenda.js")).default;
const membros = (await import("../netlify/functions/membros.js")).default;
const config = (await import("../netlify/functions/config.js")).default;
const { alterarDoc } = await import("../netlify/lib/atomic.js");
const { StoreMemoria } = await import("./helpers.mjs");

let stores;
beforeEach(() => { stores = instalarStores(); });

async function entrar(usuario, pin) {
  const r = await auth(req("POST", "/api/auth", { corpo: { acao: "entrar", usuario, pin } }));
  return { status: r.status, ...(await corpo(r)) };
}

async function prepararAdmin() {
  const boot = await entrar("admin", "135792");
  assert.equal(boot.status, 200);
  const r = await auth(req("POST", "/api/auth", { token: boot.token, corpo: { acao: "salvar", nome: "Leonardo Lucas", role: "admin", pin: "246810" } }));
  assert.equal(r.status, 200);
  const { usuario } = await corpo(r);
  const login = await entrar(usuario.id, "246810");
  return { token: login.token, id: usuario.id, tokenBoot: boot.token };
}

test("APIs de dados exigem login", async () => {
  const r = await agenda(req("GET", "/api/agenda"));
  assert.equal(r.status, 401);
  const r2 = await membros(req("GET", "/api/membros"));
  assert.equal(r2.status, 401);
  assert.equal(r.headers.get("access-control-allow-origin"), null, "não deve liberar CORS");
});

test("token adulterado é recusado", async () => {
  const { token } = await prepararAdmin();
  const [c, a] = token.split(".");
  const falso = Buffer.from(JSON.stringify({ sub: "x", role: "admin", tv: 0, exp: Date.now() + 1e9 })).toString("base64url");
  const r = await agenda(req("GET", "/api/agenda", { token: `${falso}.${a}` }));
  assert.equal(r.status, 401);
  const ok = await agenda(req("GET", "/api/agenda", { token: `${c}.${a}` }));
  assert.equal(ok.status, 200);
});

test("acesso de configuração inicial morre quando existe um admin", async () => {
  const { tokenBoot } = await prepararAdmin();
  const r = await agenda(req("GET", "/api/agenda", { token: tokenBoot }));
  assert.equal(r.status, 401);
  const r2 = await entrar("admin", "135792");
  assert.equal(r2.status, 401);
});

test("PIN errado 5 vezes bloqueia o usuário", async () => {
  const { id } = await prepararAdmin();
  for (let i = 0; i < 5; i++) assert.equal((await entrar(id, "000000")).status, 401);
  const bloqueado = await entrar(id, "246810");
  assert.equal(bloqueado.status, 429);
});

test("trocar PIN derruba sessões antigas", async () => {
  const { token } = await prepararAdmin();
  const r = await auth(req("POST", "/api/auth", { token, corpo: { acao: "trocarPin", pinAtual: "246810", pinNovo: "112233" } }));
  assert.equal(r.status, 200);
  assert.equal((await agenda(req("GET", "/api/agenda", { token }))).status, 401);
});

test("membro comum não administra usuários nem importa membros", async () => {
  const { token } = await prepararAdmin();
  await auth(req("POST", "/api/auth", { token, corpo: { acao: "salvar", nome: "Thiago Alves", role: "membro", pin: "998877" } }));
  const m = await entrar("thiago-alves", "998877");
  const r = await auth(req("POST", "/api/auth", { token: m.token, corpo: { acao: "listar" } }));
  assert.equal(r.status, 403);
  const r2 = await membros(req("PUT", "/api/membros", { token: m.token, corpo: [{ name: "X" }] }));
  assert.equal(r2.status, 403);
});

test("CRUD da agenda com controle de versão", async () => {
  const { token } = await prepararAdmin();
  const c = await agenda(req("POST", "/api/agenda", { token, corpo: { date: "2026-12-01", entrevistado: "Fulano" } }));
  assert.equal(c.status, 201);
  const item = await corpo(c);
  assert.equal(item._rev, 1);
  assert.equal(item.criadoPor, "Leonardo Lucas");

  const u = await agenda(req("PUT", `/api/agenda?id=${item.id}`, { token, corpo: { status: "confirmado", _rev: 1 } }));
  assert.equal(u.status, 200);
  assert.equal((await corpo(u))._rev, 2);
  assert.equal((await corpo(await agenda(req("GET", `/api/agenda?id=${item.id}`, { token })))).entrevistado, "Fulano");

  const conflito = await agenda(req("PUT", `/api/agenda?id=${item.id}`, { token, corpo: { status: "pendente", _rev: 1 } }));
  assert.equal(conflito.status, 409);

  const d = await agenda(req("DELETE", `/api/agenda?id=${item.id}`, { token }));
  assert.equal(d.status, 200);
  assert.deepEqual(await corpo(await agenda(req("GET", "/api/agenda", { token }))), []);
});

test("reenvio da fila offline não duplica item", async () => {
  const { token } = await prepararAdmin();
  await agenda(req("POST", "/api/agenda", { token, corpo: { id: "local_abc", entrevistado: "A" } }));
  await agenda(req("POST", "/api/agenda", { token, corpo: { id: "local_abc", entrevistado: "A" } }));
  const lista = await corpo(await agenda(req("GET", "/api/agenda", { token })));
  assert.equal(lista.length, 1);
});

test("gravações simultâneas não se perdem", async () => {
  const store = new StoreMemoria();
  await Promise.all(Array.from({ length: 20 }, (_, i) =>
    alterarDoc(store, "k", [], async (lista) => {
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      lista.push(i);
      return { valor: lista };
    })));
  const final = await store.get("k");
  assert.equal(final.length, 20);
});

test("importação de membros guarda só nome, sexo e ala", async () => {
  const { token } = await prepararAdmin();
  const r = await membros(req("PUT", "/api/membros", { token, corpo: [{ nome: "Silva, Ana", sexo: "F", unidade: "Ala Queimados", telefone: "999" }] }));
  assert.equal(r.status, 200);
  const lista = await corpo(await membros(req("GET", "/api/membros", { token })));
  assert.deepEqual(lista, [{ name: "Silva, Ana", gender: "F", ala: "Ala Queimados" }]);
});

test("config mescla chaves", async () => {
  const { token } = await prepararAdmin();
  await config(req("PUT", "/api/config", { token, corpo: { a: 1 } }));
  await config(req("PUT", "/api/config", { token, corpo: { b: 2 } }));
  assert.deepEqual(await corpo(await config(req("GET", "/api/config", { token }))), { a: 1, b: 2 });
});

test("lista pública de login não expõe hash de PIN", async () => {
  await prepararAdmin();
  const r = await auth(req("GET", "/api/auth"));
  const txt = await r.text();
  assert.ok(!txt.includes("scrypt"));
  assert.ok(txt.includes("Leonardo Lucas"));
});

test("sem AUTH_SECRET o servidor recusa com mensagem clara", async () => {
  const antigo = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "";
  const r = await entrar("admin", "135792");
  process.env.AUTH_SECRET = antigo;
  assert.equal(r.status, 500);
  assert.match(r.error, /AUTH_SECRET/);
});

test("crescimento valida período e números e não aceita tipo desconhecido", async () => {
  const crescimento = (await import("../netlify/functions/crescimento.js")).default;
  const { token } = await prepararAdmin();
  const ruim = await crescimento(req("POST", "/api/crescimento", { token, corpo: { tipo: "indicador", ala: "Ala X", periodo: "2026-5", membros: 10 } }));
  assert.equal(ruim.status, 400);
  const negativo = await crescimento(req("POST", "/api/crescimento", { token, corpo: { tipo: "indicador", ala: "Ala X", periodo: "2026-T3", membros: -4 } }));
  assert.equal(negativo.status, 400);
  const tipo = await crescimento(req("POST", "/api/crescimento", { token, corpo: { tipo: "planilha", linhas: [] } }));
  assert.equal(tipo.status, 400);
  const ok = await crescimento(req("POST", "/api/crescimento", { token, corpo: { tipo: "indicador", ala: "Ala X", periodo: "2026-T3", membros: "250.6" } }));
  assert.equal(ok.status, 201);
  assert.equal((await corpo(ok)).membros, 251);
});
