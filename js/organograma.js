// Organograma do sumo conselho
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ══════════════════════════════════════════
// ── SUMO SACERDOTES — ORGANOGRAMA CRUD ──
// ══════════════════════════════════════════
const ORG_API = '/api/organograma';

const SEED_ORG = []; // dados vêm da API após o login

let allScMembers  = SEED_ORG;
let editingScId   = null;
let scTagCount    = 0;

async function loadOrganograma() {
  try {
    const res = await fetch(ORG_API, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      allScMembers = data;
      renderOrganograma();
    }
  } catch(e) { /* keep seed */ }
}

function fmtScDate(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  const months=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(d)} ${months[parseInt(m)]} ${y}`;
}

function renderOrganograma() {
  const list = document.getElementById('org-list');
  if (!list) return;

  const ativos = allScMembers.filter(m => m.status === 'ativo').length;
  const vagos  = allScMembers.filter(m => m.status === 'vago').length;
  const sA = document.getElementById('stat-ativos');
  const sV = document.getElementById('stat-vagos');
  if (sA) sA.textContent = ativos;
  if (sV) sV.textContent = vagos;

  list.innerHTML = allScMembers.map(m => {
    if (m.status === 'vago') return `
      <div class="sc-card st-vago">
        <div class="sc-card-top">
          <div class="sc-nome vago">— Vaga em Aberto —</div>
          <span class="sc-status vago">Vago</span>
        </div>
        <div class="sc-actions">
          <button class="dact-btn dact-conf" onclick="openScModal()">＋ Preencher vaga</button>
          <button class="dact-btn dact-del"  onclick="deleteScMember('${m.id}')">🗑</button>
        </div>
      </div>`;

    const tags   = (m.programasOrganizacoes||[]).map(t => `<span class="sc-tag">📌 ${t}</span>`).join('');
    const alaDes = m.alaDesignada ? `<span class="sc-ala-tag">🏠 ${m.alaDesignada}</span>` : '';

    return `
      <div class="sc-card st-ativo">
        <div class="sc-card-top">
          <div>
            <div class="sc-nome">${m.nome || m.nomeAbrev}</div>
            ${m.telefone ? `<div class="sc-date">📞 ${m.telefone}</div>` : ''}
          </div>
          <span class="sc-status ativo">✓ Ativo</span>
        </div>
        <div class="sc-grid">
          <div class="sc-field"><span class="sc-lbl">Ala de origem</span><span class="sc-val">${m.ala||'—'}</span></div>
          <div class="sc-field"><span class="sc-lbl">Designado em</span><span class="sc-val">${fmtScDate(m.dataDesignacao)} ${m.imposicaoMaos ? '✓' : '⏳'}</span></div>
        </div>
        ${(tags||alaDes) ? `<div class="sc-tags">${alaDes}${tags}</div>` : ''}
        ${m.obs ? `<div class="sc-obs">📝 ${m.obs}</div>` : ''}
        <div class="sc-actions">
          <button class="dact-btn dact-edit" onclick="editScMember('${m.id}')">✏ Editar</button>
          <button class="dact-btn dact-del"  onclick="deleteScMember('${m.id}')">🗑</button>
        </div>
      </div>`;
  }).join('');
}

// ── MODAL ──
function openScModal(preset) {
  editingScId = preset ? preset.id : null;
  scTagCount = 0;
  document.getElementById('sc-modal-title').textContent = editingScId ? 'Editar Sumo Conselheiro' : 'Novo Sumo Conselheiro';
  document.getElementById('sc-nome').value     = preset?.nome || '';
  document.getElementById('sc-ala').value      = preset?.ala || 'Ala Queimados';
  document.getElementById('sc-data').value     = preset?.dataDesignacao || new Date().toISOString().slice(0,10);
  document.getElementById('sc-imp').value      = preset?.imposicaoMaos ? 'true' : 'false';
  document.getElementById('sc-tel').value      = preset?.telefone || '';
  document.getElementById('sc-ala-desig').value= preset?.alaDesignada || '';
  document.getElementById('sc-status').value   = preset?.status || 'ativo';
  document.getElementById('sc-obs').value      = preset?.obs || '';
  // Tags
  const cont = document.getElementById('sc-tags-container');
  cont.innerHTML = '';
  (preset?.programasOrganizacoes || []).forEach(t => addScTag(t));
  document.getElementById('sc-modal-overlay').classList.add('open');
}

function editScMember(id) {
  const m = allScMembers.find(x => x.id === id);
  if (m) openScModal(m);
}

function closeScModal() { document.getElementById('sc-modal-overlay').classList.remove('open'); }
function closeScModalOutside(e) { if (e.target.id === 'sc-modal-overlay') closeScModal(); }

function addScTag(val) {
  const i = ++scTagCount;
  const div = document.createElement('div');
  div.className = 'sc-tag-row';
  div.id = `sctag-${i}`;
  div.innerHTML = `<input type="text" id="scti-${i}" placeholder="Ex: Presidente dos Rapazes" value="${val||''}">
    <button class="sc-tag-remove" onclick="document.getElementById('sctag-${i}').remove()">✕</button>`;
  document.getElementById('sc-tags-container').appendChild(div);
}

async function saveScMember() {
  const btn = document.getElementById('sc-save-btn');
  btn.disabled = true; btn.textContent = 'Salvando…';
  const programas = [...document.querySelectorAll('[id^="scti-"]')]
    .map(inp => inp.value.trim()).filter(Boolean);
  const payload = {
    nome:    document.getElementById('sc-nome').value,
    nomeAbrev: document.getElementById('sc-nome').value.split(' ').slice(0,2).join(' '),
    ala:     document.getElementById('sc-ala').value,
    dataDesignacao: document.getElementById('sc-data').value,
    imposicaoMaos:  document.getElementById('sc-imp').value === 'true',
    telefone: document.getElementById('sc-tel').value,
    alaDesignada: document.getElementById('sc-ala-desig').value,
    programasOrganizacoes: programas,
    status:  document.getElementById('sc-status').value,
    obs:     document.getElementById('sc-obs').value,
  };
  try {
    if (editingScId) {
      const updated = await fetchComFila(`${ORG_API}?id=${editingScId}`, 'PUT', payload);
      allScMembers = allScMembers.map(x => x.id === editingScId ? { ...x, ...updated } : x);
      if (!updated._pendente) showToast('✓ Sumo conselheiro atualizado');
    } else {
      const created = await fetchComFila(ORG_API, 'POST', payload);
      allScMembers.push(created);
      if (!created._pendente) showToast('✓ Sumo conselheiro adicionado');
    }
    renderOrganograma();
    closeScModal();
    reativarAbaAtual();
  } catch(e) { showToast('⚠ Não foi possível salvar.'); }
  btn.disabled = false; btn.textContent = 'Salvar';
}

async function deleteScMember(id) {
  if (!confirm('Remover este sumo conselheiro do organograma?')) return;
  try {
    await fetch(`${ORG_API}?id=${id}`, { method:'DELETE' });
    allScMembers = allScMembers.filter(x => x.id !== id);
    renderOrganograma();
    showToast('🗑 Removido');
  } catch(e) { showToast('⚠ Erro ao excluir.'); }
}
