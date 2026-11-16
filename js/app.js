// Botão flutuante (+) e inicialização após o login
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ── FAB / tab control ──
function updateFab(tabId) {
  const fab = document.getElementById('fab-add');
  if (!fab) return;
  const registrada = ABAS_REGISTRADAS[tabId]?.fab;
  if (registrada) {
    fab.classList.add('visible');
    fab.textContent = registrada.texto;
    fab.onclick = registrada.acao;
  } else if (tabId === 'agenda') {
    fab.classList.add('visible');
    fab.innerHTML = '＋ Nova Entrevista';
    fab.onclick = () => openModal('oliveira');
  } else if (tabId === 'cal') {
    fab.classList.add('visible');
    fab.innerHTML = '＋ Novo Evento';
    fab.onclick = () => openCalModal();
  } else if (tabId === 'desig') {
    fab.classList.add('visible');
    fab.innerHTML = '＋ Nova Designação';
    fab.onclick = () => openDesigModal();
  } else if (tabId === 'reunioes') {
    fab.classList.add('visible');
    fab.innerHTML = '＋ Nova Ata';
    fab.onclick = () => openAtaForm();
  } else if (tabId === 'org') {
    fab.classList.add('visible');
    fab.innerHTML = '＋ Sumo Conselheiro';
    fab.onclick = () => openScModal();
  } else if (tabId === 'sumos' || tabId === 'ajuda') {
    fab.classList.remove('visible');
  } else {
    fab.classList.remove('visible');
  }
}

// Initial load — wait for DOM
function initApp() {
  updateFab('pres'); // pres é a aba inicial ativa — FAB começa oculto
  // Render immediately with seed data
  renderAgenda('all');
  renderCalendar();
  renderDesig('ativas');
  renderReunioesListView();
  // Then fetch live data from API in background
  loadAgenda();
  loadCalendar();
  loadDesig();
  loadReunioes();
  loadOrganograma();
}
// Só carrega dados depois do login (ver js/auth.js)
Auth.pronto.then(() => {
  const iniciar = () => { initApp(); Auth.marcarAppIniciado(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
});
Auth.aoEntrar(() => { atualizarDados(); });
