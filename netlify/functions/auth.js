// /api/auth — login por PIN e gestão de usuários.
//
// GET                       → lista pública de usuários ativos (id e nome) para a tela de login
// POST {acao:"entrar", usuario, pin}
// POST {acao:"eu"}                          (requer login)
// POST {acao:"trocarPin", pinAtual, pinNovo} (requer login)
// POST {acao:"sairDeTodos"}                  (requer login) invalida todos os tokens do usuário
// POST {acao:"listar"}                       (admin)
// POST {acao:"salvar", id?, nome, role, pin?} (admin) cria ou edita
// POST {acao:"redefinirPin", id, pin}        (admin) define novo PIN e derruba sessões
// POST {acao:"remover", id}                  (admin)

import { json, erro, semConteudo, lerCorpo, ErroHttp } from "../lib/http.js";
import { abrirStore } from "../lib/stores.js";
import {
  STORE_AUTH, PIN_REGEX, ID_BOOTSTRAP,
  login, exigirUsuario, exigirAdmin, listarUsuarios, alterarUsuarios,
  usuarioPublico, existeAdmin, hashPin, conferirPin,
} from "../lib/auth.js";

const ID_USUARIO = /^[a-z0-9-]{2,32}$/;
const ROLES = ["admin", "membro"];

function slug(nome) {
  return String(nome || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
}

export default async (req) => {
  if (req.method === "OPTIONS") return semConteudo();
  const store = abrirStore(STORE_AUTH);

  try {
    if (req.method === "GET") {
      const usuarios = await listarUsuarios(store);
      const ativos = usuarios.filter((u) => u.ativo !== false).map((u) => ({ id: u.id, nome: u.nome }));
      return json({ usuarios: ativos, configuracaoInicial: !existeAdmin(usuarios) });
    }
    if (req.method !== "POST") return erro(405, "Método não permitido");

    const corpo = await lerCorpo(req, 10_000);
    const acao = corpo.acao;

    if (acao === "entrar") {
      return json(await login(store, corpo.usuario, corpo.pin));
    }

    const eu = await exigirUsuario(req, store);

    if (acao === "eu") return json({ usuario: eu });

    if (acao === "trocarPin") {
      if (eu.bootstrap) throw new ErroHttp(400, "Crie seu usuário antes de definir um PIN.");
      if (!PIN_REGEX.test(String(corpo.pinNovo || ""))) throw new ErroHttp(400, "O novo PIN deve ter de 6 a 10 dígitos.");
      await alterarUsuarios(store, (lista) => {
        const u = lista.find((x) => x.id === eu.id);
        if (!u || !conferirPin(corpo.pinAtual, u.pinHash)) throw new ErroHttp(401, "PIN atual incorreto.");
        u.pinHash = hashPin(corpo.pinNovo);
        u.tv = (u.tv || 0) + 1;
        u.pinAlteradoEm = new Date().toISOString();
        return { valor: lista };
      });
      return json({ ok: true, mensagem: "PIN alterado. Entre novamente com o novo PIN." });
    }

    if (acao === "sairDeTodos") {
      if (eu.bootstrap) return json({ ok: true });
      await alterarUsuarios(store, (lista) => {
        const u = lista.find((x) => x.id === eu.id);
        if (u) u.tv = (u.tv || 0) + 1;
        return { valor: lista };
      });
      return json({ ok: true });
    }

    // ── a partir daqui, só administradores ──
    exigirAdmin(eu);

    if (acao === "listar") {
      const usuarios = await listarUsuarios(store);
      return json({ usuarios: usuarios.map((u) => ({ ...usuarioPublico(u), pinAlteradoEm: u.pinAlteradoEm || null })) });
    }

    if (acao === "salvar") {
      const nome = String(corpo.nome || "").trim().slice(0, 60);
      const role = ROLES.includes(corpo.role) ? corpo.role : "membro";
      if (!nome) throw new ErroHttp(400, "Informe o nome.");
      const id = corpo.id ? String(corpo.id) : slug(corpo.usuario || nome);
      if (!ID_USUARIO.test(id) || id === ID_BOOTSTRAP) throw new ErroHttp(400, "Identificador de usuário inválido.");
      if (corpo.pin !== undefined && corpo.pin !== "" && !PIN_REGEX.test(String(corpo.pin))) {
        throw new ErroHttp(400, "O PIN deve ter de 6 a 10 dígitos.");
      }
      const salvo = await alterarUsuarios(store, (lista) => {
        let u = lista.find((x) => x.id === id);
        const novo = !u;
        if (novo) {
          if (!corpo.pin) throw new ErroHttp(400, "Defina um PIN inicial para o novo usuário.");
          u = { id, criadoEm: new Date().toISOString(), tv: 0, ativo: true };
          lista.push(u);
        }
        // Não permite que o último administrador perca a função de admin.
        if (!novo && u.role === "admin" && role !== "admin" &&
            lista.filter((x) => x.role === "admin" && x.ativo !== false).length === 1) {
          throw new ErroHttp(400, "É preciso manter pelo menos um administrador.");
        }
        u.nome = nome;
        u.role = role;
        if (corpo.ativo !== undefined) u.ativo = !!corpo.ativo;
        if (corpo.pin) { u.pinHash = hashPin(corpo.pin); u.tv = (u.tv || 0) + 1; u.pinAlteradoEm = new Date().toISOString(); }
        return { valor: lista, resultado: usuarioPublico(u) };
      });
      return json({ usuario: salvo });
    }

    if (acao === "redefinirPin") {
      if (!PIN_REGEX.test(String(corpo.pin || ""))) throw new ErroHttp(400, "O PIN deve ter de 6 a 10 dígitos.");
      await alterarUsuarios(store, (lista) => {
        const u = lista.find((x) => x.id === corpo.id);
        if (!u) throw new ErroHttp(404, "Usuário não encontrado.");
        u.pinHash = hashPin(corpo.pin);
        u.tv = (u.tv || 0) + 1;
        u.pinAlteradoEm = new Date().toISOString();
        return { valor: lista };
      });
      return json({ ok: true });
    }

    if (acao === "remover") {
      if (corpo.id === eu.id) throw new ErroHttp(400, "Você não pode remover o próprio usuário.");
      await alterarUsuarios(store, (lista) => {
        const alvo = lista.find((x) => x.id === corpo.id);
        if (!alvo) return { semMudanca: true };
        if (alvo.role === "admin" && lista.filter((x) => x.role === "admin" && x.ativo !== false).length === 1) {
          throw new ErroHttp(400, "É preciso manter pelo menos um administrador.");
        }
        return { valor: lista.filter((x) => x.id !== corpo.id) };
      });
      return json({ ok: true });
    }

    return erro(400, "Ação desconhecida");
  } catch (e) {
    if (e instanceof ErroHttp || e.status) return erro(e.status || 500, e.message, e.extra);
    console.error(e);
    return erro(500, "Erro interno do servidor");
  }
};

export const config = { path: "/api/auth" };
