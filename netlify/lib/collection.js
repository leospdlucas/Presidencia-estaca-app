// Fábrica de APIs REST para uma coleção (lista de itens) guardada em um
// único documento JSON do Netlify Blobs.
//
//   GET            → lista todos os itens
//   GET  ?id=X     → um item
//   POST           → cria (aceita id do cliente, útil para a fila offline)
//   PUT  ?id=X     → atualiza mesclando campos; se o corpo trouxer `_rev`
//                    diferente do atual, devolve 409 com a versão atual
//   DELETE ?id=X   → remove
//
// Toda requisição exige login. Gravações são atômicas (ver atomic.js).

import { json, erro, semConteudo, lerCorpo, ErroHttp } from "./http.js";
import { lerDoc, alterarDoc } from "./atomic.js";
import { exigirUsuario, exigirAdmin, STORE_AUTH } from "./auth.js";
import { abrirStore } from "./stores.js";

const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;
const CAMPOS_PROTEGIDOS = ["id", "_rev", "criadoEm", "criadoPor", "atualizadoEm", "atualizadoPor"];

export function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function limpar(corpo) {
  const c = { ...corpo };
  for (const k of CAMPOS_PROTEGIDOS) delete c[k];
  delete c._pendente;
  return c;
}

/**
 * @param {object} o
 * @param {string} o.store       nome do store no Blobs
 * @param {string} o.chave       chave do documento
 * @param {(a,b)=>number} [o.ordenar]
 * @param {(item)=>object} [o.normalizar]  ajusta/valida o item antes de gravar
 * @param {boolean} [o.somenteAdminEscreve]
 */
export function criarColecao(o) {
  return async function handler(req) {
    if (req.method === "OPTIONS") return semConteudo();
    try {
      const usuario = await exigirUsuario(req, abrirStore(STORE_AUTH));
      const store = abrirStore(o.store);
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const normalizar = o.normalizar || ((x) => x);
      const agora = new Date().toISOString();

      if (req.method === "GET") {
        const lista = await lerDoc(store, o.chave, []);
        const arr = Array.isArray(lista) ? lista : [];
        if (id) {
          const item = arr.find((i) => i.id === id);
          return item ? json(item) : erro(404, "Item não encontrado");
        }
        if (o.ordenar) arr.sort(o.ordenar);
        return json(arr);
      }

      if (o.somenteAdminEscreve) exigirAdmin(usuario);

      if (req.method === "POST") {
        const corpo = await lerCorpo(req);
        const idCliente = typeof corpo.id === "string" && ID_VALIDO.test(corpo.id) ? corpo.id : null;
        const criado = await alterarDoc(store, o.chave, [], (lista) => {
          if (!Array.isArray(lista)) lista = [];
          // Reenvio da fila offline: o item já existe, devolve sem duplicar.
          const existente = idCliente && lista.find((i) => i.id === idCliente);
          if (existente) return { semMudanca: true, resultado: existente };
          const item = normalizar({
            ...limpar(corpo),
            id: idCliente || novoId(),
            _rev: 1,
            criadoEm: agora,
            criadoPor: usuario.nome,
          });
          lista.push(item);
          return { valor: lista, resultado: item };
        });
        return json(criado, 201);
      }

      if (req.method === "PUT") {
        if (!id) return erro(400, "Informe ?id=");
        const corpo = await lerCorpo(req);
        const revCliente = Number.isInteger(corpo._rev) ? corpo._rev : null;
        const atualizado = await alterarDoc(store, o.chave, [], (lista) => {
          if (!Array.isArray(lista)) lista = [];
          const idx = lista.findIndex((i) => i.id === id);
          if (idx === -1) throw new ErroHttp(404, "Item não encontrado");
          const atual = lista[idx];
          const revAtual = atual._rev || 0;
          if (revCliente !== null && revCliente !== revAtual) {
            throw new ErroHttp(409, "Este item foi alterado por outra pessoa. Recarregue e refaça a alteração.", { atual });
          }
          const item = normalizar({
            ...atual,
            ...limpar(corpo),
            id,
            _rev: revAtual + 1,
            atualizadoEm: agora,
            atualizadoPor: usuario.nome,
          });
          lista[idx] = item;
          return { valor: lista, resultado: item };
        });
        return json(atualizado);
      }

      if (req.method === "DELETE") {
        if (!id) return erro(400, "Informe ?id=");
        await alterarDoc(store, o.chave, [], (lista) => {
          if (!Array.isArray(lista)) lista = [];
          const nova = lista.filter((i) => i.id !== id);
          if (nova.length === lista.length) return { semMudanca: true };
          return { valor: nova };
        });
        return json({ ok: true });
      }

      return erro(405, "Método não permitido");
    } catch (e) {
      if (e instanceof ErroHttp || e.status) return erro(e.status || 500, e.message, e.extra);
      console.error(e);
      return erro(500, "Erro interno do servidor");
    }
  };
}
