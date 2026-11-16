// API para um documento único (objeto ou lista) — GET lê, PUT grava.
// modo "mesclar": PUT junta as chaves enviadas ao objeto existente.
// modo "substituir": PUT troca o documento inteiro.

import { json, erro, semConteudo, lerCorpo, ErroHttp } from "./http.js";
import { lerDoc, alterarDoc } from "./atomic.js";
import { exigirUsuario, exigirAdmin, STORE_AUTH } from "./auth.js";
import { abrirStore } from "./stores.js";

export function criarDocumento(o) {
  return async function handler(req) {
    if (req.method === "OPTIONS") return semConteudo();
    try {
      const usuario = await exigirUsuario(req, abrirStore(STORE_AUTH));
      const store = abrirStore(o.store);

      if (req.method === "GET") return json(await lerDoc(store, o.chave, o.padrao));

      if (req.method === "PUT") {
        if (o.somenteAdminEscreve) exigirAdmin(usuario);
        const corpo = await lerCorpo(req, o.limiteBytes || 2_000_000);
        const valido = o.validar ? o.validar(corpo) : corpo;
        const salvo = await alterarDoc(store, o.chave, o.padrao, (atual) => {
          const valor = o.modo === "mesclar" ? { ...(atual || {}), ...valido } : valido;
          return { valor, resultado: valor };
        });
        return json(salvo);
      }
      return erro(405, "Método não permitido");
    } catch (e) {
      if (e instanceof ErroHttp || e.status) return erro(e.status || 500, e.message, e.extra);
      console.error(e);
      return erro(500, "Erro interno do servidor");
    }
  };
}
