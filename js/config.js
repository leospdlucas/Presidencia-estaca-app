// =============================================
// CONFIGURAÇÃO COMPARTILHADA (/api/config)
// =============================================
// Os nomes editados com ✏️ antes ficavam só no aparelho de quem editou.
// Agora são gravados na nuvem e aparecem para todos.

const CONFIG_API = '/api/config';
let CONFIG_APP = {};

async function carregarConfig() {
  try {
    const r = await fetch(CONFIG_API, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return;
    CONFIG_APP = (await r.json()) || {};
    // Migra nomes que estavam só neste aparelho para a nuvem.
    const locais = NOMES_EDITAVEIS_EST || {};
    const nuvem = CONFIG_APP.nomes || {};
    const faltando = Object.keys(locais).filter(k => !(k in nuvem));
    if (faltando.length) {
      const nomes = { ...locais, ...nuvem };
      await salvarConfig({ nomes });
    }
    aplicarNomesConfig();
    document.dispatchEvent(new CustomEvent('config:carregada', { detail: CONFIG_APP }));
  } catch { /* offline: mantém o que está na tela */ }
}

async function salvarConfig(parcial) {
  const r = await fetch(CONFIG_API, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parcial),
  });
  if (!r.ok) throw new Error('Não foi possível salvar a configuração');
  CONFIG_APP = await r.json();
  return CONFIG_APP;
}

function aplicarNomesConfig() {
  const nomes = CONFIG_APP.nomes || {};
  Object.keys(nomes).forEach(chave => {
    NOMES_EDITAVEIS_EST[chave] = nomes[chave];
    const el = document.getElementById(chave);
    if (el) el.textContent = nomes[chave];
  });
  try { localStorage.setItem('nomes_editaveis_estaca', JSON.stringify(NOMES_EDITAVEIS_EST)); } catch {}
}

// Substitui a versão antiga, que gravava só no localStorage.
editarNomeEst = async function (chave, elementoId) {
  const atual = NOMES_EDITAVEIS_EST[chave] || document.getElementById(elementoId)?.textContent || '';
  const novo = prompt('Editar nome:', atual);
  if (novo === null || !novo.trim()) return;
  const el = document.getElementById(elementoId);
  if (el) el.textContent = novo.trim();
  NOMES_EDITAVEIS_EST[chave] = novo.trim();
  try {
    await salvarConfig({ nomes: { ...(CONFIG_APP.nomes || {}), [chave]: novo.trim() } });
    showToast('✓ Nome atualizado para todos');
  } catch (e) {
    showToast('⚠ ' + e.message);
  }
};

Auth.pronto.then(carregarConfig);
Auth.aoEntrar(carregarConfig);
