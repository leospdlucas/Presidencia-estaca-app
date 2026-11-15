// Notas privadas (aparelho) e compartilhadas (nuvem)
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// =============================================
// ABA NOTAS — Privadas + Compartilhadas
// =============================================
const NOTAS_API = '/api/notas';
let NOTAS_PRIV_EST = JSON.parse(localStorage.getItem('notas_priv_estaca') || '[]');
let NOTAS_COMP_EST = [];
let filNotasEstaca = 'todas';

function setFilNotasEstaca(val, btn) {
  filNotasEstaca = val;
  document.querySelectorAll('#filtros-notas-est .af-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNotasEstaca();
}

async function carregarNotasEstaca() {
  try {
    const res = await fetch(NOTAS_API);
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) NOTAS_COMP_EST = data; }
  } catch(e) {}
  renderNotasEstaca();
}

function renderNotasEstaca() {
  const el = document.getElementById('lista-notas-estaca');
  if (!el) return;
  let lista = [];
  if (filNotasEstaca === 'todas' || filNotasEstaca === 'privada')
    lista = lista.concat(NOTAS_PRIV_EST.map(n => ({...n, scope:'privada'})));
  if (filNotasEstaca === 'todas' || filNotasEstaca === 'compartilhada')
    lista = lista.concat(NOTAS_COMP_EST.map(n => ({...n, scope:'compartilhada'})));
  lista.sort((a,b) => (b.criadaEm||'').localeCompare(a.criadaEm||''));

  if (!lista.length) { el.innerHTML = '<div class="empty">📭 Nenhuma nota</div>'; return; }

  el.innerHTML = lista.map(n => `
    <div class="nota-card ${n.scope}">
      <div class="nota-header">
        <span class="nota-tipo ${n.scope}">${n.scope==='privada'?'🔒 Privada':'🌐 Compartilhada'}</span>
        <div style="display:flex;gap:6px">
          <button class="dact-btn dact-edit" onclick="editarNotaEstaca('${n.id}','${n.scope}')">✏</button>
          <button class="dact-btn dact-del" onclick="excluirNotaEstaca('${n.id}','${n.scope}')">🗑</button>
        </div>
      </div>
      ${n.titulo?`<div style="font-weight:700;color:var(--text);margin-bottom:4px">${n.titulo}</div>`:''}
      <div class="nota-texto">${n.texto}</div>
      <div class="nota-meta">${n.autor?'👤 '+n.autor+' · ':''}${n.criadaEm?new Date(n.criadaEm).toLocaleDateString('pt-BR'):''}</div>
    </div>
  `).join('');
}

function novaNotaEstaca(scope) {
  const titulo = prompt('Título da nota:');
  if (!titulo) return;
  const texto = prompt('Texto da nota:');
  if (!texto) return;
  const nota = { id:'ne_'+Date.now(), titulo, texto, autor:'Presidência', criadaEm:new Date().toISOString() };
  if (scope === 'privada') {
    NOTAS_PRIV_EST.push(nota);
    localStorage.setItem('notas_priv_estaca', JSON.stringify(NOTAS_PRIV_EST));
  } else {
    NOTAS_COMP_EST.push(nota);
    fetch(NOTAS_API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(nota) }).catch(()=>{});
  }
  renderNotasEstaca();
}

function editarNotaEstaca(id, scope) {
  const arr = scope === 'privada' ? NOTAS_PRIV_EST : NOTAS_COMP_EST;
  const nota = arr.find(n => n.id === id);
  if (!nota) return;
  const titulo = prompt('Título:', nota.titulo);
  if (titulo === null) return;
  const texto = prompt('Texto:', nota.texto);
  if (texto === null) return;
  nota.titulo = titulo; nota.texto = texto;
  if (scope === 'privada') {
    localStorage.setItem('notas_priv_estaca', JSON.stringify(NOTAS_PRIV_EST));
  } else {
    fetch(NOTAS_API+'?id='+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(nota) }).catch(()=>{});
  }
  renderNotasEstaca();
}

async function excluirNotaEstaca(id, scope) {
  if (!confirm('Excluir esta nota?')) return;
  if (scope === 'privada') {
    NOTAS_PRIV_EST = NOTAS_PRIV_EST.filter(n => n.id !== id);
    localStorage.setItem('notas_priv_estaca', JSON.stringify(NOTAS_PRIV_EST));
  } else {
    NOTAS_COMP_EST = NOTAS_COMP_EST.filter(n => n.id !== id);
    try { await fetch(NOTAS_API+'?id='+id, { method:'DELETE' }); } catch(e) {}
  }
  renderNotasEstaca();
}




function toggleDesigTipoEst() {
  // Could hide/show date fields for permanente - simple toggle
}

async function togglePermDesigEst(id) {
  const d = allDesig.find(x => x.id === id);
  if (!d) return;
  const novoStatus = d.status === 'inativa' ? 'ativa' : 'inativa';
  try {
    const updated = await fetchComFila(`${DESIG_API}?id=${id}`, 'PUT', { status: novoStatus });
    allDesig = allDesig.map(x => x.id === id ? { ...x, ...updated } : x);
    renderDesig(desigFilter);
    showToast(novoStatus === 'ativa' ? '📌 Designação ativada' : '⏸ Designação desativada');
  } catch(e) { showToast('⚠ Erro ao atualizar.'); }
}

// === ALARMES DE DESIGNAÇÕES (ESTACA) ===
function verificarAlarmesDesigEst() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
  const agora = new Date();
  (allDesig||[]).forEach(d => {
    if (!d.alarme || !d.quando) return;
    if (d.status === 'realizado' || d.status === 'inativa' || d.status === 'cancelado') return;
    const prazoDate = new Date(d.quando + 'T' + (d.hora||'09:00') + ':00');
    const diffMs = prazoDate - agora;
    let offsetMs = 0;
    if (d.alarmeTempo === '15 min antes') offsetMs = 15*60*1000;
    else if (d.alarmeTempo === '30 min antes') offsetMs = 30*60*1000;
    else if (d.alarmeTempo === '1 hora antes') offsetMs = 60*60*1000;
    else if (d.alarmeTempo === '1 dia antes') offsetMs = 24*60*60*1000;
    const alarmeMs = diffMs - offsetMs;
    if (alarmeMs > 0 && alarmeMs < 24*60*60*1000) {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('🔔 Designação: ' + (d.oque||''), { body: '👤 ' + (d.quem||'') + '\n📅 ' + fmtDesigDate(d.quando), icon: '/icon-192.png' });
        }
      }, alarmeMs);
    }
  });
}
setTimeout(verificarAlarmesDesigEst, 3000);
