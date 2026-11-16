// Núcleo: abas, seções, busca, menu do celular, tema e avisos (toast)
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ── TABS ──
let currentTabId = 'pres'; // rastreia a aba ativa

function toggleOrd(id) {
  const card = document.getElementById(id);
  if (!card) return;
  card.classList.toggle('open');
}

function showTab(id, btn) {
  currentTabId = id;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('search-input').value = '';
  aoAtivarAba(id);
}

// Ações comuns a qualquer forma de trocar de aba (botões do topo ou menu do celular)
// Módulos novos registram aqui o que fazer ao abrir a aba e o botão "+":
//   registrarAba('conf', { carregar: fn, fab: { texto: '＋ Nova', acao: fn } })
const ABAS_REGISTRADAS = {};
function registrarAba(id, opcoes) {
  ABAS_REGISTRADAS[id] = opcoes;
  if (opcoes.nome) TAB_MOBILE_DATA[id] = { emoji: opcoes.emoji || '•', name: opcoes.nome };
}

function aoAtivarAba(id) {
  if (typeof updateFab === 'function') updateFab(id);
  if (ABAS_REGISTRADAS[id]?.carregar) ABAS_REGISTRADAS[id].carregar();
  if (id === 'notas') carregarNotasEstaca();
  if (id === 'agenda') loadAgenda();
  if (id === 'cal') loadCalendar();
  if (id === 'desig') loadDesig();
  if (id === 'reunioes') { loadReunioes(); showReunioesListView(); }
  if (id === 'org') loadOrganograma();
}

// Reativa a aba correta após fechar modal
function reativarAbaAtual() {
  const btn = document.querySelector(`.tab-btn.${currentTabId}`);
  if (btn) showTab(currentTabId, btn);
}

// ── SECTIONS ──
function toggleSection(hdr) {
  hdr.parentElement.classList.toggle('open');
}

// ── SEARCH ──
const searchIndex = [];
document.querySelectorAll('.item-text').forEach((el, i) => {
  const section = el.closest('.section');
  const panel = el.closest('.panel');
  const sTitle = section ? section.querySelector('h3')?.textContent.trim() : '';
  const pTitle = panel ? (panel.id.replace('panel-','').replace('-',' ')) : '';
  searchIndex.push({ text: el.textContent, el, sTitle, pTitle, panelId: panel?.id });
});

function doSearch(q) {
  const box = document.getElementById('search-results');
  if (!q || q.length < 2) { box.style.display = 'none'; return; }
  q = q.toLowerCase();

  // 1. Static: responsabilidades
  const staticResults = searchIndex.filter(r => r.text.toLowerCase().includes(q)).slice(0, 10);

  // 2. Dynamic: Agenda/Entrevistas
  const whoLbl = {oliveira:'Pres. Oliveira',torres:'1º Cons. Torres',alves:'2º Cons. Alves'};
  const agendaResults = (allAppointments||[]).filter(e => {
    const txt = [e.action,e.entrevistado,e.obs,e.obs_conclusao||'',e.ala||'',whoLbl[e.who]||''].join(' ').toLowerCase();
    return txt.includes(q);
  }).slice(0,8);

  // 3. Dynamic: Designações
  const desigResults = (allDesig||[]).filter(d => {
    const txt = [d.oque,d.quem,d.chamado,d.obs,d.obs_conclusao||''].join(' ').toLowerCase();
    return txt.includes(q);
  }).slice(0,8);

  // 4. Dynamic: Reuniões/Atas
  const atasResults = (allReunioes||[]).filter(r => {
    const txt = [r.titulo,(r.assuntos||[]).map(a=>[a.titulo,a.detalhes,a.decisao].join(' ')).join(' '),r.presidida,r.oracaoAbertura].join(' ').toLowerCase();
    return txt.includes(q);
  }).slice(0,8);

  // 5. Dynamic: Notas
  const allNotasArr = [...(NOTAS_PRIV_EST||[]).map(n=>({...n,scope:'privada'})),...(NOTAS_COMP_EST||[]).map(n=>({...n,scope:'compartilhada'}))];
  const notasResults = allNotasArr.filter(n => {
    return [n.titulo,n.texto,n.autor||''].join(' ').toLowerCase().includes(q);
  }).slice(0,8);

  // 6. Static: Ordenanças
  const ordResults = [];
  document.querySelectorAll('.ord-card').forEach(card => {
    if (card.textContent.toLowerCase().includes(q)) {
      ordResults.push({ titulo: card.querySelector('.ord-titulo')?.textContent||'Ordenança', id: card.id });
    }
  });

  // 7. Módulos novos (conferência, chamados, líderes, missionários, discursos)
  const extraResults = BUSCA_EXTRA.flatMap(fn => { try { return fn(q) || []; } catch { return []; } }).slice(0, 15);

  const total = staticResults.length + agendaResults.length + desigResults.length + atasResults.length + notasResults.length + ordResults.length + extraResults.length;
  if (!total) { box.innerHTML = '<div class="empty">Nenhum resultado encontrado</div>'; box.style.display = 'block'; return; }

  const labels = { 'panel-pres':'Pres. Oliveira','panel-c1':'1º Cons. Torres','panel-c2':'2º Cons. Alves','panel-sec-exec':'Sec. Executivo','panel-sec-est':'Sec. Fábio' };
  // Escapa o texto antes de destacar: conteúdo digitado por usuários não vira HTML
  const hi = (txt) => esc(txt).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'), m => `<mark>${m}</mark>`);

  let html = '';

  // Static results
  html += staticResults.map(r => {
    const hiText = hi(r.text.length > 120 ? r.text.substring(0,120)+'…' : r.text);
    return `<div class="search-item" onclick="goToResult('${r.panelId}')"><div class="s-tag">${labels[r.panelId]||''} · ${r.sTitle}</div><div class="s-text">${hiText}</div></div>`;
  }).join('');

  // Agenda results
  html += agendaResults.map(e => `
    <div class="search-item" onclick="goToResult('agenda')">
      <div class="s-tag" style="color:#4dd0e1">🗓️ Agenda · ${whoLbl[e.who]||e.who}</div>
      <div class="s-text">${hi(e.entrevistado||'')} — ${hi(e.action||'')}${e.obs?' · '+hi(e.obs):''}</div>
    </div>`).join('');

  // Designação results
  html += desigResults.map(d => `
    <div class="search-item" onclick="goToResult('desig')">
      <div class="s-tag" style="color:#a5d6a7">📌 Designação</div>
      <div class="s-text">${hi(d.oque||'')} — ${hi(d.quem||'')}${d.obs?' · '+hi(d.obs):''}</div>
    </div>`).join('');

  // Atas results
  html += atasResults.map(r => `
    <div class="search-item" onclick="goToResult('reunioes')">
      <div class="s-tag" style="color:#ce93d8">📝 Reunião · ${fmtAtaDate(r.data)}</div>
      <div class="s-text">${hi((r.titulo||'Reunião').substring(0,100))}${r.assuntos?.length?' · '+hi(r.assuntos.map(a=>a.titulo).join(', ').substring(0,80)):''}</div>
    </div>`).join('');

  // Notas results
  html += notasResults.map(n => {
    const cor = n.scope==='privada'?'#f59e0b':'#60a5fa';
    return `<div class="search-item" onclick="goToResult('notas')">
      <div class="s-tag" style="color:${cor}">📝 Nota ${n.scope==='privada'?'Privada':'Compartilhada'}</div>
      <div class="s-text">${hi(n.titulo||'Nota')} — ${hi((n.texto||'').substring(0,80))}</div>
    </div>`;
  }).join('');

  // Ordenanças results
  html += ordResults.slice(0,5).map(o => `
    <div class="search-item" onclick="goToResult('ordenancas');setTimeout(()=>{const c=document.getElementById('${o.id}');if(c){c.classList.add('open');c.scrollIntoView({behavior:'smooth',block:'center'})}},100)">
      <div class="s-tag" style="color:#a78bfa">🕊️ Ordenança</div>
      <div class="s-text">${hi(o.titulo)}</div>
    </div>`).join('');

  html += extraResults.map(r => `
    <div class="search-item" onclick="goToResult('${r.aba}')">
      <div class="s-tag" style="color:${r.cor || 'var(--gold2)'}">${esc(r.tag)}</div>
      <div class="s-text">${hi(r.texto)}</div>
    </div>`).join('');

  box.innerHTML = `<div style="padding:8px 12px;font-size:11px;color:var(--subtle)">${total} resultado${total>1?'s':''}</div>` + html;
  box.style.display = 'block';
}

// Módulos registram aqui uma função de busca: q => [{ tag, texto, aba, cor }]
const BUSCA_EXTRA = [];
function registrarBusca(fn) { BUSCA_EXTRA.push(fn); }

function goToResult(panelId) {
  const tabName = panelId.replace('panel-','');
  showTabMobile(tabName); // abre a aba e atualiza o menu do celular
  document.getElementById('search-results').style.display = 'none';
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').style.display = 'none';
}

// ── MENU MOBILE ──
const TAB_MOBILE_DATA = {
  pres:     { emoji:'★',  name:'Pres. Oliveira' },
  c1:       { emoji:'👤', name:'1º Cons. Torres' },
  c2:       { emoji:'👤', name:'2º Cons. Alves' },
  'sec-est':{ emoji:'📋', name:'Sec. Fábio' },
  'sec-exec':{ emoji:'📋', name:'Sec. Executivo' },
  sumos:    { emoji:'🏛', name:'Sumo Sacerdotes' },
  reunioes: { emoji:'📝', name:'Reuniões' },
  desig:    { emoji:'📌', name:'Designações' },
  agenda:   { emoji:'📅', name:'Agenda' },
  cal:      { emoji:'📆', name:'Calendário' },
  org:      { emoji:'🗂', name:'Organograma' },
  notas:    { emoji:'📝', name:'Notas' },
  ordenancas:{ emoji:'🕊️', name:'Ordenanças' },
  ajuda:    { emoji:'❓', name:'Como usar' },
};

function toggleMobileMenu() {
  const btn = document.getElementById('tab-mobile-btn');
  const dd  = document.getElementById('tab-mobile-dropdown');
  btn.classList.toggle('open');
  dd.classList.toggle('open');
}

function closeMobileMenu() {
  document.getElementById('tab-mobile-btn')?.classList.remove('open');
  document.getElementById('tab-mobile-dropdown')?.classList.remove('open');
}

function updateMobileLabel(tabId) {
  const d = TAB_MOBILE_DATA[tabId];
  if (!d) return;
  const emoji = document.getElementById('tms-emoji');
  const name  = document.getElementById('tms-name');
  if (emoji) emoji.textContent = d.emoji;
  if (name)  name.textContent  = d.name;
  // Update active item
  document.querySelectorAll('.tab-mobile-item').forEach(el => el.classList.remove('active'));
  const active = document.getElementById('tmi-' + tabId);
  if (active) active.classList.add('active');
}

function showTabMobile(tabId) {
  // Find the desktop tab button and trigger showTab
  const btn = document.querySelector(`.tab-btn.${tabId}`);
  if (btn) showTab(tabId, btn);
  updateMobileLabel(tabId);
  closeMobileMenu();
}

// Close dropdown when tapping outside
document.addEventListener('click', e => {
  const wrap = document.querySelector('.tab-mobile-select');
  if (wrap && !wrap.contains(e.target)) closeMobileMenu();
});

// =============================================
// TEMA ESCURO/CLARO + TAMANHO DA FONTE
// =============================================
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme-estaca', next);
  document.getElementById('btn-theme').textContent = next === 'dark' ? '🌙 Escuro' : '☀️ Claro';
}

function changeFontSize(delta) {
  const root = document.documentElement;
  const current = parseFloat(getComputedStyle(root).getPropertyValue('--font-size-base')) || 14;
  const next = Math.max(11, Math.min(20, current + delta));
  root.style.setProperty('--font-size-base', next + 'px');
  localStorage.setItem('fontSize-estaca', next);
}

(function initThemeEstaca() {
  const saved = localStorage.getItem('theme-estaca');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = saved === 'dark' ? '🌙 Escuro' : '☀️ Claro';
  }
  const fs = localStorage.getItem('fontSize-estaca');
  if (fs) document.documentElement.style.setProperty('--font-size-base', fs + 'px');
})();

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
