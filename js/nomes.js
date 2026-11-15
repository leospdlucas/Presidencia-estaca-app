// Nomes editáveis (ver também config.js)
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// =============================================
// NOMES EDITÁVEIS
// =============================================
const NOMES_EDITAVEIS_EST = JSON.parse(localStorage.getItem('nomes_editaveis_estaca') || '{}');

function editarNomeEst(chave, elementoId) {
  const atual = NOMES_EDITAVEIS_EST[chave] || document.getElementById(elementoId)?.textContent || '';
  const novo = prompt('Editar nome:', atual);
  if (novo !== null && novo.trim()) {
    NOMES_EDITAVEIS_EST[chave] = novo.trim();
    localStorage.setItem('nomes_editaveis_estaca', JSON.stringify(NOMES_EDITAVEIS_EST));
    const el = document.getElementById(elementoId);
    if (el) el.textContent = novo.trim();
  }
}

(function aplicarNomesEst() {
  Object.keys(NOMES_EDITAVEIS_EST).forEach(chave => {
    const el = document.getElementById(chave);
    if (el) el.textContent = NOMES_EDITAVEIS_EST[chave];
  });
})();
