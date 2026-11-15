// Agenda de entrevistas e compromissos
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ── AGENDA — API-DRIVEN CRUD ──
const API     = '/api/agenda';
const CAL_API = '/api/calendar';

let MEMBROS_ESTACA = []; // carregada de /api/membros após o login

// ── SEED DATA — rendered immediately on load, then replaced by API ──
const SEED_DATA = []; // dados vêm da API após o login

let allAppointments = SEED_DATA;   // <-- starts with seed, replaced by API
let allCalEvents    = [];
let currentFilter   = 'all';
let editingId       = null;
let editingCalId    = null;
let agendaLoadedFromAPI = false;

// ── LOAD from API (replaces seed with live DB data) ──
async function loadAgenda() {
  try {
    const res = await fetch(API, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('não é array');
    allAppointments = data;
    agendaLoadedFromAPI = true;
    renderAgenda(currentFilter);
  } catch(e) {
    // API failed — keep showing seed data, show small warning
    const list = document.getElementById('agenda-list');
    if (list && !agendaLoadedFromAPI) {
      const warn = document.createElement('div');
      warn.style.cssText = 'font-size:11px;color:#f0a050;text-align:center;padding:4px 0 10px;';
      warn.textContent = '⚠ Sem conexão — exibindo dados salvos';
      list.prepend(warn);
    }
  }
}

// Calendar seed data — shows immediately before API responds
const SEED_CALENDAR = []; // dados vêm da API após o login
allCalEvents = SEED_CALENDAR; // show immediately

async function loadCalendar() {
  try {
    const res = await fetch(CAL_API, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data)) {
      allCalEvents = data;
      renderCalendar();
    }
  } catch(e) {
    // keep showing seed data silently
  }
}

// ── DISPLAY HELPERS ──
function statusLabel(s) {
  if (s === 'confirmado')    return '<span class="agenda-status st-conf">✓ Confirmado</span>';
  if (s === 'realizado')     return '<span class="agenda-status st-real">✔ Realizado</span>';
  if (s === 'pendente')      return '<span class="agenda-status st-pend">⚠ Pendente</span>';
  if (s === 'remarcado')     return '<span class="agenda-status st-rem">↩ Remarcado</span>';
  if (s === 'cancelado')     return '<span class="agenda-status st-rem">✕ Cancelado</span>';
  if (s === 'nao-realizada') return '<span class="agenda-status st-nao">✕ Não Realizada</span>';
  return '';
}
function whoLabel(w) {
  const m = { oliveira:'Pres. Oliveira', torres:'1º Cons. Torres', alves:'2º Cons. Alves', 'sec-exec':'Sec. Executivo', fabio:'Sec. Fábio' };
  const c = { oliveira:'who-o', torres:'who-t', alves:'who-a', 'sec-exec':'who-se', fabio:'who-f' };
  return `<span class="agenda-who ${c[w]||'who-p'}">${m[w]||w}</span>`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}`;
}
function nextStatusLabel(s) {
  if (s === 'pendente')      return '✓ Confirmar';
  if (s === 'confirmado')    return '✔ Marcar Realizado';
  if (s === 'realizado')     return '↩ Reabrir';
  if (s === 'nao-realizada') return '↩ Reabrir';
  return '⟳ Status';
}
function nextStatus(s) {
  const cycle = { pendente:'confirmado', confirmado:'realizado', realizado:'pendente', remarcado:'pendente', cancelado:'pendente', 'nao-realizada':'pendente' };
  return cycle[s] || 'pendente';
}

// ── RENDER AGENDA ──
function renderAgenda(filter) {
  currentFilter = filter;
  const list = document.getElementById('agenda-list');
  if (!list) return;
  let data = [...allAppointments].sort((a,b) => (a.date||'') > (b.date||'') ? 1 : -1);
  if (filter === 'pendente')           data = data.filter(d => d.status === 'pendente');
  else if (filter === 'nao-realizada') data = data.filter(d => d.status === 'nao-realizada');
  else if (filter === 'all')           data = data.filter(d => d.status !== 'realizado');
  else                                 data = data.filter(d => d.who === filter && d.status !== 'realizado');
  if (!data.length) { list.innerHTML = '<div class="empty">Nenhum compromisso encontrado</div>'; return; }
  list.innerHTML = data.map(d => `
    <div class="agenda-card ${d.who||'presidencia'}" id="card-${d.id}">
      <div class="agenda-header">
        <div>${whoLabel(d.who)}</div>
        ${statusLabel(d.status)}
      </div>
      <div class="agenda-title">${d.action||'Entrevista'} — ${d.entrevistado||'—'}</div>
      <div class="agenda-meta">
        <span>📅 ${fmtDate(d.date)}</span>
        ${d.hora ? `<span>🕐 ${d.hora}</span>` : ''}
        <span>📍 ${d.local||'—'}</span>
        ${d.ala ? `<span>⛪ ${d.ala}</span>` : ''}
      </div>
      ${d.obs ? `<div class="agenda-obs">📝 ${d.obs}</div>` : ''}
      ${d.obs_conclusao ? `<div class="agenda-obs" style="color:#4caf88;border-left:3px solid #4caf88;padding-left:8px">✔ ${d.obs_conclusao}</div>` : ''}
      ${d.motivo_nao_realizado ? `<div class="agenda-obs" style="color:#e05c5c">⛔ ${d.motivo_nao_realizado}</div>` : ''}
      <div class="agenda-actions">
        <button class="btn-edit"   onclick="editAppointment('${d.id}')">📅 Reagendar</button>
        <button class="btn-status" onclick="cycleStatus('${d.id}','${d.status}')">${nextStatusLabel(d.status)}</button>
        <button class="btn-del"    onclick="markNaoRealizada('${d.id}')">✕ Não Realizada</button>
      </div>
    </div>
  `).join('');
}

function filterAgenda(f, btn) {
  document.querySelectorAll('.af-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (f === 'realizado') {
    // special: show only realizado
    currentFilter = 'realizado';
    const list = document.getElementById('agenda-list');
    let data = [...allAppointments].filter(d => d.status === 'realizado').sort((a,b) => (a.date||'') > (b.date||'') ? 1 : -1);
    if (!data.length) { list.innerHTML = '<div class="empty">Nenhuma entrevista realizada</div>'; return; }
    list.innerHTML = data.map(d => `
      <div class="agenda-card ${d.who||'presidencia'}" id="card-${d.id}">
        <div class="agenda-header"><div>${whoLabel(d.who)}</div>${statusLabel(d.status)}</div>
        <div class="agenda-title">${d.action||'Entrevista'} — ${d.entrevistado||'—'}</div>
        <div class="agenda-meta">
          <span>📅 ${fmtDate(d.date)}</span>
          ${d.hora ? `<span>🕐 ${d.hora}</span>` : ''}
          <span>📍 ${d.local||'—'}</span>
          ${d.ala ? `<span>⛪ ${d.ala}</span>` : ''}
        </div>
        ${d.obs_conclusao ? `<div class="agenda-obs" style="color:#4caf88;border-left:3px solid #4caf88;padding-left:8px">✔ ${d.obs_conclusao}</div>` : ''}
        <div class="agenda-actions">
          <button class="btn-edit" onclick="editAppointment('${d.id}')">📅 Reagendar</button>
          <button class="btn-status" onclick="cycleStatus('${d.id}','${d.status}')">↩ Reabrir</button>
        </div>
      </div>
    `).join('');
    return;
  }
  renderAgenda(f);
}

// ── MODAL ENTREVISTA ──

// ── AUTOCOMPLETE COM FILTRO POR ALA ──
function filtrarMembrosAla(alaSelecionada) {
  const dl = document.getElementById('dl-membros-estaca');
  const input = document.getElementById('f-entrevistado');
  if (!dl) return;
  dl.innerHTML = '';
  const lista = alaSelecionada
    ? MEMBROS_ESTACA.filter(m => m.ala === alaSelecionada)
    : MEMBROS_ESTACA;
  const frag = document.createDocumentFragment();
  lista.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name;
    frag.appendChild(opt);
  });
  dl.appendChild(frag);
  if (input) {
    input.placeholder = alaSelecionada
      ? `Digite o nome (${lista.length} membros em ${alaSelecionada})…`
      : 'Selecione a Ala e então digite o nome…';
    input.value = '';
  }
}

function preencherAlaDoMembro(nomeDigitado) {
  const membro = MEMBROS_ESTACA.find(m => m.name === nomeDigitado);
  if (!membro || !membro.ala) return;
  const sel = document.getElementById('f-ala');
  if (sel && !sel.value) sel.value = membro.ala;
}

function openModal(presetWho) {
  // Popula datalist com todos os membros (sem filtro de ala ainda)
  filtrarMembrosAla('');
  editingId = null;
  document.getElementById('modal-title').textContent = 'Nova Entrevista';
  document.getElementById('f-id').value = '';
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('f-hora').value = '';
  document.getElementById('f-who').value = presetWho || 'oliveira';
  document.getElementById('f-action').value = 'Renovação de Recomendação';
  document.getElementById('f-entrevistado').value = '';
  document.getElementById('f-ala').value = 'Ala Queimados';
  document.getElementById('f-local').value = '';
  document.getElementById('f-status').value = 'pendente';
  document.getElementById('f-obs').value = '';
  document.getElementById('modal-overlay').classList.add('open');
}

function editAppointment(id) {
  const d = allAppointments.find(a => a.id === id);
  if (!d) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Editar Entrevista';
  document.getElementById('f-id').value       = id;
  document.getElementById('f-date').value     = d.date || '';
  document.getElementById('f-hora').value     = d.hora || '';
  document.getElementById('f-who').value      = d.who  || 'oliveira';
  document.getElementById('f-action').value   = d.action || 'Entrevista';
  document.getElementById('f-entrevistado').value = d.entrevistado || '';
  document.getElementById('f-ala').value      = d.ala   || 'Ala Queimados';
  document.getElementById('f-local').value    = d.local || '';
  document.getElementById('f-status').value   = d.status || 'pendente';
  document.getElementById('f-obs').value      = d.obs || '';
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function closeModalOutside(e) { if (e.target.id === 'modal-overlay') closeModal(); }

async function saveAppointment() {
  const btn = document.getElementById('btn-save');
  btn.disabled = true; btn.textContent = 'Salvando…';
  const payload = {
    date:         document.getElementById('f-date').value,
    hora:         document.getElementById('f-hora').value,
    who:          document.getElementById('f-who').value,
    action:       document.getElementById('f-action').value,
    entrevistado: document.getElementById('f-entrevistado').value,
    ala:          document.getElementById('f-ala').value,
    local:        document.getElementById('f-local').value,
    status:       document.getElementById('f-status').value,
    obs:          document.getElementById('f-obs').value,
  };
  try {
    if (editingId) {
      const updated = await fetchComFila(`${API}?id=${editingId}`, 'PUT', payload);
      allAppointments = allAppointments.map(a => a.id === editingId ? { ...a, ...updated } : a);
      if (!updated._pendente) showToast('✓ Compromisso atualizado');
    } else {
      const created = await fetchComFila(API, 'POST', payload);
      allAppointments.push(created);
      if (!created._pendente) showToast('✓ Compromisso adicionado');
    }
    renderAgenda(currentFilter);
    closeModal();
    reativarAbaAtual();
  } catch(e) { showToast('⚠ Não foi possível salvar. Tente novamente.'); }
  btn.disabled = false; btn.textContent = 'Salvar';
}

async function cycleStatus(id, current) {
  const next = nextStatus(current);
  let obs_conclusao = '';
  if (next === 'realizado') {
    obs_conclusao = prompt('Observação ao concluir (opcional):') || '';
  }
  try {
    const payload = { status: next };
    if (obs_conclusao) payload.obs_conclusao = obs_conclusao;
    if (next === 'realizado') payload.realizadoEm = new Date().toISOString();
    const updated = await fetchComFila(`${API}?id=${id}`, 'PUT', payload);
    allAppointments = allAppointments.map(a => a.id === id ? { ...a, ...updated } : a);
    renderAgenda(currentFilter);
    const labels = { confirmado:'✓ Confirmado', realizado:'✔ Realizado', pendente:'⚠ Pendente' };
    if (!updated._pendente) showToast('Status → ' + (labels[next]||next));
  } catch(e) { showToast('⚠ Não foi possível atualizar.'); }
}

// ── NÃO REALIZADA ──
function markNaoRealizada(id) {
  const d = allAppointments.find(a => a.id === id);
  if (!d) return;
  if (d.status === 'nao-realizada') { showToast('Já marcado como Não Realizada'); return; }
  const body = document.querySelector('.modal-body');
  body._origHTML = body.innerHTML;
  document.getElementById('modal-title').textContent = '✕ Não Realizada';
  body.innerHTML = `
    <p style="color:var(--silver);font-size:13px;margin-bottom:14px">
      Informe o motivo para <strong style="color:#fff">${d.entrevistado}</strong>:
    </p>
    <div class="form-row">
      <label>Motivo</label>
      <textarea id="f-motivo" placeholder="Ex: Membro não compareceu, reagendado, viagem..." style="min-height:80px"></textarea>
    </div>
    <button class="btn-save" onclick="confirmNaoRealizada('${id}')">Confirmar</button>
    <button onclick="restoreModal()" style="width:100%;padding:10px;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:var(--silver);font-size:13px;cursor:pointer;margin-top:8px">Cancelar</button>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

async function confirmNaoRealizada(id) {
  const motivo = document.getElementById('f-motivo').value.trim() || 'Motivo não informado';
  try {
    const updated = await fetchComFila(`${API}?id=${id}`, 'PUT', { status:'nao-realizada', motivo_nao_realizado: motivo });
    allAppointments = allAppointments.map(a => a.id === id ? { ...a, ...updated } : a);
    renderAgenda(currentFilter);
    if (!updated._pendente) showToast('✕ Marcado como Não Realizada');
  } catch(e) { showToast('⚠ Não foi possível salvar.'); }
  restoreModal();
}

function restoreModal() {
  const body = document.querySelector('.modal-body');
  if (body._origHTML) body.innerHTML = body._origHTML;
  closeModal();
}
