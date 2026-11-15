// Conexão, fila offline (IndexedDB) e atualização manual
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ── CONEXÃO E FILA OFFLINE ──
const DB_NAME   = 'presidencia-offline';
const DB_VER    = 1;
const STORE_Q   = 'fila-pendente';
let   db        = null;
let   isOnline  = navigator.onLine;

// Abrir IndexedDB
function abrirDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_Q)) {
        d.createObjectStore(STORE_Q, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => { db = e.target.result; res(db); };
    req.onerror   = () => rej(req.error);
  });
}

// Salvar ação na fila
async function enfileirar(url, method, payload) {
  if (!db) await abrirDB();
  return new Promise((res, rej) => {
    const tx   = db.transaction(STORE_Q, 'readwrite');
    const store= tx.objectStore(STORE_Q);
    store.add({ url, method, payload, criadoEm: Date.now() });
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// Ler fila pendente
async function lerFila() {
  if (!db) await abrirDB();
  return new Promise((res, rej) => {
    const tx    = db.transaction(STORE_Q, 'readonly');
    const store = tx.objectStore(STORE_Q);
    const req   = store.getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}

// Remover item da fila
async function removerDaFila(id) {
  if (!db) await abrirDB();
  return new Promise((res, rej) => {
    const tx    = db.transaction(STORE_Q, 'readwrite');
    const store = tx.objectStore(STORE_Q);
    store.delete(id);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// Indicador de status visível
function mostrarStatus(tipo, msg) {
  const el = document.getElementById('conexao-status');
  if (!el) return;
  el.className = 'show ' + tipo;
  el.textContent = msg;
  if (tipo === 'salvo') {
    setTimeout(() => el.classList.remove('show'), 2500);
  }
}
function ocultarStatus() {
  const el = document.getElementById('conexao-status');
  if (el) el.classList.remove('show');
}

// Enviar fila pendente ao reconectar
async function enviarFilaPendente() {
  const fila = await lerFila();
  if (!fila.length) return;
  mostrarStatus('salvando', `⏳ Enviando ${fila.length} alteração${fila.length > 1 ? 'ões' : ''} feita${fila.length > 1 ? 's' : ''} sem internet...`);
  let ok = 0;
  for (const item of fila) {
    try {
      const res = await fetch(item.url, {
        method:  item.method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(item.payload),
        signal:  AbortSignal.timeout(10000),
      });
      if (res.ok) {
        await removerDaFila(item.id);
        ok++;
      } else if (res.status === 401) {
        break; // sessão expirou: mantém a fila e espera o novo login
      } else if (res.status >= 400 && res.status < 500) {
        // conflito ou dado inválido: reenviar não vai resolver
        await removerDaFila(item.id);
        const dados = await res.json().catch(() => ({}));
        showToast('⚠ Uma alteração feita sem internet foi recusada: ' + (dados.error || res.status));
      }
    } catch(e) { /* mantém na fila */ }
  }
  if (ok === fila.length) {
    mostrarStatus('salvo', `✓ ${ok} alteração${ok > 1 ? 'ões' : ''} enviada${ok > 1 ? 's' : ''} com sucesso`);
    // Recarregar dados atualizados
    loadAgenda();
    loadCalendar();
    loadDesig();
    loadReunioes();
    loadOrganograma();
    Object.values(ABAS_REGISTRADAS).forEach(a => a.carregar?.());
  } else {
    const rest = fila.length - ok;
    mostrarStatus('pendente', `⚠ ${rest} alteração${rest > 1 ? 'ões' : ''} ainda aguardando conexão`);
  }
}

// fetch com fallback para fila offline
async function fetchComFila(url, method, payload) {
  // Itens novos recebem id no aparelho: se a resposta se perder e o envio
  // for repetido, o servidor reconhece o id e não duplica.
  if (method === 'POST' && !payload.id) {
    payload = { ...payload, id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) };
  }
  if (isOnline) {
    try {
      mostrarStatus('salvando', '⏳ Salvando...');
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 401) {
        // sessão expirou: guarda na fila para enviar depois do novo login
        await enfileirar(url, method, payload);
        mostrarStatus('pendente', '⚠ Entre novamente — a alteração será enviada depois do login');
        return { ...payload, id: payload.id || ('local_' + Date.now()), _pendente: true };
      }
      if (res.status >= 400 && res.status < 500) {
        const dados = await res.json().catch(() => ({}));
        ocultarStatus();
        const erroHttp = new Error(dados.error || ('Erro ' + res.status));
        erroHttp.http = res.status;
        erroHttp.atual = dados.atual;
        throw erroHttp;
      }
      if (!res.ok) throw new Error('falha');
      mostrarStatus('salvo', '✓ Salvo');
      return await res.json();
    } catch(e) {
      if (e.http) { showToast('⚠ ' + e.message); throw e; }
      // Falhou mesmo online — salvar na fila
      await enfileirar(url, method, payload);
      mostrarStatus('pendente', '⚠ Sem conexão — será salvo automaticamente ao reconectar');
      return { ...payload, id: payload.id || ('local_' + Date.now()), _pendente: true };
    }
  } else {
    await enfileirar(url, method, payload);
    mostrarStatus('pendente', '⚠ Sem conexão — será salvo automaticamente ao reconectar');
    return { ...payload, id: payload.id || ('local_' + Date.now()), _pendente: true };
  }
}

// Monitorar conexão
window.addEventListener('online',  () => { isOnline = true;  ocultarStatus(); enviarFilaPendente(); });
window.addEventListener('offline', () => { isOnline = false; mostrarStatus('offline', '📵 Você está sem conexão — alterações serão salvas ao reconectar'); });

// Inicializar DB
abrirDB().catch(() => {});


// ── ATUALIZAÇÃO MANUAL ──
async function atualizarDados() {
  const btn = document.getElementById('btn-atualizar');
  if (btn) btn.classList.add('girando');
  mostrarStatus('salvando', '⏳ Atualizando...');
  limparCacheApp(); // limpa cache do app durante sync manual

  // 1. Enviar fila offline pendente
  const fila = await lerFila().catch(() => []);
  if (fila.length > 0) await enviarFilaPendente();

  // 2. Verificar nova versão do app
  if (swRegistration && isOnline) {
    try {
      await swRegistration.update();
      if (swRegistration.waiting) {
        mostrarStatus('salvando', '⬇ Nova versão encontrada — aplicando...');
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // controllerchange vai recarregar automaticamente
        if (btn) btn.classList.remove('girando');
        return;
      }
    } catch(e) { /* sem conexão */ }
  }

  // 3. Recarregar dados do servidor
  try {
    await Promise.all([
      loadAgenda(),
      loadCalendar(),
      loadDesig(),
      loadReunioes(),
      loadOrganograma(),
      ...Object.values(ABAS_REGISTRADAS).map(a => a.carregar?.()),
    ]);
    mostrarStatus('salvo', '✓ Tudo atualizado');
  } catch(e) {
    mostrarStatus('pendente', '⚠ Sem conexão — exibindo dados salvos');
  }

  if (btn) btn.classList.remove('girando');
}
