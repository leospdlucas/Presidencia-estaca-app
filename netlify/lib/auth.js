// Autenticação por PIN individual.
//
// - O PIN nunca é guardado: só um hash scrypt com sal aleatório.
// - O login devolve um token assinado (HMAC-SHA256) com validade de 7 dias.
// - Cada usuário tem uma "versão de token" (tv). Trocar ou redefinir o PIN
//   incrementa tv e invalida na hora os tokens antigos em todos os aparelhos.
// - 5 PINs errados seguidos bloqueiam o usuário por 15 minutos.
// - Enquanto não existir nenhum administrador cadastrado, é possível entrar
//   como "admin" usando a variável de ambiente ADMIN_BOOTSTRAP_PIN para criar
//   os usuários. Assim que um administrador real existe, esse acesso morre.

import crypto from "node:crypto";
import { ErroHttp } from "./http.js";
import { lerDoc, alterarDoc } from "./atomic.js";

export const STORE_AUTH = "auth-estaca";
const CHAVE_USUARIOS = "usuarios";
const CHAVE_FALHAS = "falhas";

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FALHAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;
export const PIN_REGEX = /^\d{6,10}$/;
export const ID_BOOTSTRAP = "admin";

// ── utilidades ─────────────────────────────────────────────

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const deB64url = (s) => Buffer.from(s, "base64url");

function segredo() {
  const s = process.env.AUTH_SECRET || "";
  if (s.length < 32) {
    throw new ErroHttp(500, "Servidor sem AUTH_SECRET configurado (mínimo 32 caracteres). Configure no painel do Netlify.");
  }
  return s;
}

function iguais(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// ── PIN ────────────────────────────────────────────────────

export function hashPin(pin) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pin), sal, 32);
  return `scrypt$${b64url(sal)}$${b64url(hash)}`;
}

export function conferirPin(pin, armazenado) {
  if (!armazenado || !armazenado.startsWith("scrypt$")) return false;
  const [, salB64, hashB64] = armazenado.split("$");
  const esperado = deB64url(hashB64);
  const obtido = crypto.scryptSync(String(pin), deB64url(salB64), esperado.length);
  return crypto.timingSafeEqual(esperado, obtido);
}

// ── token ──────────────────────────────────────────────────

export function emitirToken(usuario, agora = Date.now()) {
  const payload = { sub: usuario.id, nome: usuario.nome, role: usuario.role, tv: usuario.tv || 0, exp: agora + VALIDADE_MS };
  const corpo = b64url(JSON.stringify(payload));
  const assinatura = b64url(crypto.createHmac("sha256", segredo()).update(corpo).digest());
  return { token: `${corpo}.${assinatura}`, exp: payload.exp };
}

export function lerToken(token, agora = Date.now()) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [corpo, assinatura] = token.split(".");
  const esperada = b64url(crypto.createHmac("sha256", segredo()).update(corpo).digest());
  if (!iguais(assinatura || "", esperada)) return null;
  let payload;
  try { payload = JSON.parse(deB64url(corpo).toString("utf8")); } catch { return null; }
  if (!payload || typeof payload.exp !== "number" || payload.exp < agora) return null;
  return payload;
}

// ── usuários ───────────────────────────────────────────────

export async function listarUsuarios(store) {
  const lista = await lerDoc(store, CHAVE_USUARIOS, []);
  return Array.isArray(lista) ? lista : [];
}

export function usuarioPublico(u) {
  return { id: u.id, nome: u.nome, role: u.role, ativo: u.ativo !== false };
}

export function existeAdmin(usuarios) {
  return usuarios.some((u) => u.role === "admin" && u.ativo !== false);
}

export async function alterarUsuarios(store, fn) {
  return alterarDoc(store, CHAVE_USUARIOS, [], fn);
}

function pinBootstrap() {
  const p = process.env.ADMIN_BOOTSTRAP_PIN || "";
  return PIN_REGEX.test(p) ? p : null;
}

// ── tentativas ─────────────────────────────────────────────

async function situacaoFalhas(store, id) {
  const todas = await lerDoc(store, CHAVE_FALHAS, {});
  return (todas && todas[id]) || { n: 0, ate: 0 };
}

async function registrarFalha(store, id, agora) {
  await alterarDoc(store, CHAVE_FALHAS, {}, (todas) => {
    const f = todas[id] || { n: 0, ate: 0 };
    f.n = (f.ate && f.ate < agora ? 0 : f.n) + 1;
    if (f.n >= MAX_FALHAS) { f.ate = agora + BLOQUEIO_MS; f.n = 0; }
    todas[id] = f;
    return { valor: todas };
  });
}

async function limparFalhas(store, id) {
  await alterarDoc(store, CHAVE_FALHAS, {}, (todas) => {
    if (!todas[id]) return { semMudanca: true };
    delete todas[id];
    return { valor: todas };
  });
}

// ── login ──────────────────────────────────────────────────

export async function login(store, idUsuario, pin, agora = Date.now()) {
  const id = String(idUsuario || "").trim();
  if (!id || !PIN_REGEX.test(String(pin || ""))) throw new ErroHttp(400, "Informe o usuário e um PIN de 6 a 10 dígitos.");

  const falhas = await situacaoFalhas(store, id);
  if (falhas.ate && falhas.ate > agora) {
    const min = Math.ceil((falhas.ate - agora) / 60000);
    throw new ErroHttp(429, `Muitas tentativas. Tente de novo em ${min} min.`);
  }

  const usuarios = await listarUsuarios(store);

  if (id === ID_BOOTSTRAP && !existeAdmin(usuarios)) {
    const pb = pinBootstrap();
    if (pb && iguais(String(pin), pb)) {
      await limparFalhas(store, id);
      const u = { id: ID_BOOTSTRAP, nome: "Configuração inicial", role: "admin", tv: 0 };
      return { ...emitirToken(u, agora), usuario: usuarioPublico(u), bootstrap: true };
    }
    await registrarFalha(store, id, agora);
    throw new ErroHttp(401, "Usuário ou PIN incorretos.");
  }

  const u = usuarios.find((x) => x.id === id && x.ativo !== false);
  if (!u || !conferirPin(pin, u.pinHash)) {
    await registrarFalha(store, id, agora);
    throw new ErroHttp(401, "Usuário ou PIN incorretos.");
  }
  await limparFalhas(store, id);
  return { ...emitirToken(u, agora), usuario: usuarioPublico(u) };
}

// ── verificação em cada requisição ─────────────────────────

export function tokenDaRequisicao(req) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Devolve o usuário autenticado ou lança 401. */
export async function exigirUsuario(req, storeAuth, agora = Date.now()) {
  const payload = lerToken(tokenDaRequisicao(req), agora);
  if (!payload) throw new ErroHttp(401, "Sessão expirada. Entre novamente.");

  const usuarios = await listarUsuarios(storeAuth);
  if (payload.sub === ID_BOOTSTRAP) {
    if (existeAdmin(usuarios)) throw new ErroHttp(401, "Acesso de configuração inicial encerrado. Entre com seu usuário.");
    return { id: ID_BOOTSTRAP, nome: "Configuração inicial", role: "admin", bootstrap: true };
  }
  const u = usuarios.find((x) => x.id === payload.sub && x.ativo !== false);
  if (!u || (u.tv || 0) !== payload.tv) throw new ErroHttp(401, "Sessão encerrada. Entre novamente.");
  return usuarioPublico(u);
}

export function exigirAdmin(usuario) {
  if (!usuario || usuario.role !== "admin") throw new ErroHttp(403, "Apenas administradores podem fazer isso.");
}
