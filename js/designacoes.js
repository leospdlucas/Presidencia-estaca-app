// Designações da presidência
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ══════════════════════════════════════════
// ── DESIGNAÇÕES — CRUD ──
// ══════════════════════════════════════════
const DESIG_API = '/api/designacoes';

const SEED_DESIG = []; // dados vêm da API após o login

let allDesig     = SEED_DESIG;
let desigFilter  = 'ativas';
let editingDesigId = null;

function desigStatusLabel(s) {
  if (s === 'pendente')   return '<span class="desig-status dst-pend">⚠ Pendente</span>';
  if (s === 'confirmado') return '<span class="desig-status dst-conf">✓ Confirmada</span>';
  if (s === 'realizado')  return '<span class="desig-status dst-real">✔ Realizada</span>';
  if (s === 'cancelado')  return '<span class="desig-status dst-canc">✕ Cancelada</span>';
  return '';
}

function fmtDesigDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const months = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${d} ${months[parseInt(m)]}`;
}

function getDesigWeekKey(iso) {
  if (!iso) return 'Sem data';
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `Semana de ${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]}`;
}

function renderDesig(filter) {
  desigFilter = filter;
  const list = document.getElementById('desig-list');
  if (!list) return;

  let data = [...allDesig].sort((a, b) => (a.quando || '') > (b.quando || '') ? 1 : -1);

  if (filter === 'ativas')       data = data.filter(d => d.tipo==='permanente' ? d.status!=='inativa' : (d.status !== 'realizado' && d.status !== 'cancelado'));
  else if (filter === 'permanentes') data = data.filter(d => d.tipo === 'permanente');
  else if (filter === 'all')    {}
  else                          data = data.filter(d => d.status === filter);

  if (!data.length) {
    list.innerHTML = '<div class="desig-empty">Nenhuma designação encontrada</div>';
    return;
  }

  // Group by week
  const weeks = {};
  for (const d of data) {
    const wk = getDesigWeekKey(d.quando);
    if (!weeks[wk]) weeks[wk] = [];
    weeks[wk].push(d);
  }

  list.innerHTML = Object.entries(weeks).map(([week, items]) => `
    <div class="desig-week-header">📅 ${week}</div>
    ${items.map(d => `
      <div class="desig-card st-${d.status}" id="desig-${d.id}" style="${d.tipo==='permanente'?'border-left:3px solid #a78bfa;':''}${d.status==='inativa'?'opacity:.55':''}">
        <div class="desig-top">
          <div class="desig-oque">${d.oque || '—'} ${d.tipo==='permanente'?'<span style="font-size:10px;padding:2px 7px;border-radius:8px;background:rgba(167,139,250,.15);color:#a78bfa;font-weight:600;margin-left:6px">Permanente</span>':''} ${d.alarme?'<span title="Alarme" style="font-size:14px">🔔</span>':''}</div>
          ${d.tipo==='permanente' ? `<span style="font-size:11px;padding:3px 10px;border-radius:8px;background:${d.status==='inativa'?'rgba(148,163,184,.15)':'rgba(167,139,250,.15)'};color:${d.status==='inativa'?'#94a3b8':'#a78bfa'};font-weight:600">${d.status==='inativa'?'⏸ Inativa':'📌 Ativa'}</span>` : desigStatusLabel(d.status)}
        </div>
        <div class="desig-grid">
          <div class="desig-field">
            <span class="df-label">👤 Quem</span>
            <span class="df-val">${Array.isArray(d.responsaveis) ? d.responsaveis.join(', ') : (d.quem || '—')}</span>
          </div>
          <div class="desig-field">
            <span class="df-label">🏷 Chamado</span>
            <span class="df-val">${d.chamado || '—'}</span>
          </div>
          <div class="desig-field">
            <span class="df-label">📅 Quando</span>
            <span class="df-val">${d.tipo==='permanente'?'—':fmtDesigDate(d.quando)}${d.hora ? ' · ' + d.hora : ''}</span>
          </div>
          <div class="desig-field">
            <span class="df-label">📍 Onde</span>
            <span class="df-val">${d.onde || '—'}</span>
          </div>
        </div>
        ${d.obs ? `<div class="desig-obs">📝 ${d.obs}</div>` : ''}
        ${d.obs_conclusao ? `<div class="desig-obs" style="color:#4caf88;border-left:3px solid #4caf88;padding-left:8px">✔ ${d.obs_conclusao}</div>` : ''}
        <div class="desig-actions">
          <button class="dact-btn dact-edit" onclick="editDesig('${d.id}')">✏ Editar</button>
          ${d.tipo==='permanente' ? `
            <button class="dact-btn" style="color:#a78bfa;border-color:#a78bfa" onclick="togglePermDesigEst('${d.id}')">${d.status==='inativa'?'▶ Ativar':'⏸ Desativar'}</button>
          ` : `
            ${d.status === 'pendente'   ? `<button class="dact-btn dact-conf" onclick="setDesigStatus('${d.id}','confirmado')">✓ Confirmar</button>` : ''}
            ${d.status === 'confirmado' ? `<button class="dact-btn dact-real" onclick="setDesigStatus('${d.id}','realizado')">✔ Marcar Realizada</button>` : ''}
            ${d.status === 'realizado'  ? `<button class="dact-btn dact-conf" onclick="setDesigStatus('${d.id}','pendente')">↩ Reabrir</button>` : ''}
          `}
          <button class="dact-btn dact-del" onclick="deleteDesig('${d.id}')">🗑</button>
        </div>
      </div>
    `).join('')}
  `).join('');
}

function filterDesig(f, btn) {
  document.querySelectorAll('.df-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDesig(f);
}

async function loadDesig() {
  try {
    const res = await fetch(DESIG_API, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      allDesig = data;
      renderDesig(desigFilter);
    }
  } catch(e) { /* keep seed */ }
}

// ── MODAL ──
function openDesigModal(preset) {
  editingDesigId = null;
  document.getElementById('desig-modal-title').textContent = 'Nova Designação';
  document.getElementById('dd-oque').value      = '';
  document.getElementById('dd-quem').value      = preset || 'Pres. André Oliveira';
  document.getElementById('dd-chamado').value   = 'Presidente da Estaca';
  document.getElementById('dd-quem-livre').value= '';
  document.getElementById('dd-quando').value    = new Date().toISOString().slice(0,10);
  document.getElementById('dd-hora').value      = '';
  document.getElementById('dd-onde').value      = 'Sede da Estaca';
  document.getElementById('dd-status').value    = 'pendente';
  document.getElementById('dd-obs').value       = '';
  document.getElementById('dd-tipo').value      = 'pontual';
  document.getElementById('dd-alarme').checked  = false;
  document.getElementById('dd-alarme-wrap').style.display = 'none';
  document.getElementById('desig-modal-overlay').classList.add('open');
}

function editDesig(id) {
  const d = allDesig.find(x => x.id === id);
  if (!d) return;
  editingDesigId = id;
  document.getElementById('desig-modal-title').textContent = 'Editar Designação';
  document.getElementById('dd-oque').value       = d.oque || '';
  document.getElementById('dd-quem').value       = d.quem || 'Pres. André Oliveira';
  document.getElementById('dd-chamado').value    = d.chamado || 'Presidente da Estaca';
  document.getElementById('dd-quem-livre').value = '';
  document.getElementById('dd-quando').value     = d.quando || '';
  document.getElementById('dd-hora').value       = d.hora || '';
  document.getElementById('dd-onde').value       = d.onde || 'Sede da Estaca';
  document.getElementById('dd-status').value     = d.status || 'pendente';
  document.getElementById('dd-obs').value        = d.obs || '';
  document.getElementById('dd-tipo').value       = d.tipo || 'pontual';
  document.getElementById('dd-alarme').checked   = !!d.alarme;
  document.getElementById('dd-alarme-wrap').style.display = d.alarme ? '' : 'none';
  if (d.alarmeTempo) document.getElementById('dd-alarme-tempo').value = d.alarmeTempo;
  document.getElementById('desig-modal-overlay').classList.add('open');
}

function closeDesigModal() { document.getElementById('desig-modal-overlay').classList.remove('open'); }
function closeDesigModalOutside(e) { if (e.target.id === 'desig-modal-overlay') closeDesigModal(); }

async function saveDesig() {
  const btn = document.getElementById('dd-save-btn');
  btn.disabled = true; btn.textContent = 'Salvando…';
  const quemSel   = document.getElementById('dd-quem').value;
  const quemLivre = document.getElementById('dd-quem-livre').value.trim();
  const payload = {
    oque:    document.getElementById('dd-oque').value,
    tipo:    document.getElementById('dd-tipo').value,
    alarme:  document.getElementById('dd-alarme').checked,
    alarmeTempo: document.getElementById('dd-alarme').checked ? document.getElementById('dd-alarme-tempo').value : '',
    quem:    quemSel === 'Outro' && quemLivre ? quemLivre : quemSel,
    chamado: document.getElementById('dd-chamado').value,
    quando:  document.getElementById('dd-quando').value,
    hora:    document.getElementById('dd-hora').value,
    onde:    document.getElementById('dd-onde').value,
    status:  document.getElementById('dd-status').value,
    obs:     document.getElementById('dd-obs').value,
  };
  try {
    if (editingDesigId) {
      const updated = await fetchComFila(`${DESIG_API}?id=${editingDesigId}`, 'PUT', payload);
      allDesig = allDesig.map(x => x.id === editingDesigId ? { ...x, ...updated } : x);
      if (!updated._pendente) showToast('✓ Designação atualizada');
    } else {
      const created = await fetchComFila(DESIG_API, 'POST', payload);
      allDesig.push(created);
      if (!created._pendente) showToast('✓ Designação adicionada');
    }
    renderDesig(desigFilter);
    closeDesigModal();
    reativarAbaAtual();
  } catch(e) { showToast('⚠ Não foi possível salvar.'); }
  btn.disabled = false; btn.textContent = 'Salvar Designação';
}

async function setDesigStatus(id, newStatus) {
  let obs_conclusao = '';
  if (newStatus === 'realizado') {
    obs_conclusao = prompt('Observação ao concluir (opcional):') || '';
  }
  try {
    const payload = { status: newStatus };
    if (obs_conclusao) payload.obs_conclusao = obs_conclusao;
    if (newStatus === 'realizado') payload.realizadoEm = new Date().toISOString();
    const updated = await fetchComFila(`${DESIG_API}?id=${id}`, 'PUT', payload);
    allDesig = allDesig.map(x => x.id === id ? { ...x, ...updated } : x);
    renderDesig(desigFilter);
    const labels = { confirmado:'✓ Confirmada', realizado:'✔ Realizada', pendente:'↩ Reaberta' };
    if (!updated._pendente) showToast(labels[newStatus] || newStatus);
  } catch(e) { showToast('⚠ Não foi possível atualizar.'); }
}

async function deleteDesig(id) {
  if (!confirm('Excluir esta designação?')) return;
  try {
    await fetch(`${DESIG_API}?id=${id}`, { method:'DELETE' });
    allDesig = allDesig.filter(x => x.id !== id);
    renderDesig(desigFilter);
    showToast('🗑 Designação excluída');
  } catch(e) { showToast('⚠ Erro ao excluir.'); }
}
