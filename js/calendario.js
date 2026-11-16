// Calendário da estaca
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ── CALENDAR CRUD ──
const MONTHS_ORDER = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TAG_MAP = { visit:'Visita Oficial', audit:'Auditoria', conf:'Conferência/Devocional', train:'Treinamento', conselho:'Conselho/Reunião' };
function tagEl(t) { return `<span class="cal-tag tag-${t}">${TAG_MAP[t]||t}</span>`; }

function renderCalendar() {
  const body = document.getElementById('cal-body');
  if (!body) return;
  const grouped = {};
  for (const ev of allCalEvents) {
    if (!grouped[ev.month]) grouped[ev.month] = [];
    grouped[ev.month].push(ev);
  }
  body.innerHTML = MONTHS_ORDER
    .filter(m => grouped[m] && grouped[m].length > 0)
    .map(month => {
      const events = grouped[month].sort((a,b) => a.day - b.day);
      return `<div class="cal-month">
        <div class="cal-month-name">📅 ${month}
          <button class="btn-cal-add" onclick="openCalModal('${month}')" title="Adicionar evento">＋</button>
        </div>
        ${events.map(ev => `
          <div class="cal-event" id="calevent-${ev.id}">
            <div class="cal-date-box">
              <div class="cal-day">${ev.day}</div>
              <div class="cal-dow">${ev.dow||''}</div>
            </div>
            <div class="cal-content" style="flex:1">
              <div>${(ev.tags||[]).map(tagEl).join('')}</div>
              <div class="cal-title">${ev.text||''}</div>
              <div class="cal-actions">
                <button class="btn-edit" onclick="editCalEvent('${ev.id}')">✏ Editar</button>
                <button class="btn-del"  onclick="deleteCalEvent('${ev.id}')">🗑 Excluir</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
    }).join('');
}


function preencherDataEvento(iso) {
  if (!iso) return;
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dows   = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const d = new Date(iso + 'T12:00:00');
  const month = months[d.getMonth()];
  const day   = d.getDate();
  const dow   = dows[d.getDay()];
  document.getElementById('cf-month').value = month;
  document.getElementById('cf-day').value   = day;
  document.getElementById('cf-dow').value   = dow;
  const prev = document.getElementById('cf-data-preview');
  if (prev) prev.innerHTML = `<span style="color:var(--gold);font-weight:700">${day} de ${month}</span>&nbsp;·&nbsp;<span style="color:#a5d6a7">${dow}</span>`;
}

function openCalModal(presetMonth) {
  editingCalId = null;
  document.getElementById('cal-modal-title').textContent = 'Novo Evento';
  // Set date picker to today or first day of preset month
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  let defaultDate = new Date().toISOString().slice(0,10);
  if (presetMonth) {
    const mi = months.indexOf(presetMonth);
    if (mi >= 0) {
      const y = new Date().getFullYear();
      defaultDate = `${y}-${String(mi+1).padStart(2,'0')}-01`;
    }
  }
  document.getElementById('cf-data').value = defaultDate;
  preencherDataEvento(defaultDate);
  document.getElementById('cf-text').value  = '';
  document.querySelectorAll('.cf-tag-cb').forEach(cb => cb.checked = false);
  document.getElementById('cal-modal-overlay').classList.add('open');
}
function editCalEvent(id) {
  const ev = allCalEvents.find(c => c.id === id);
  if (!ev) return;
  editingCalId = id;
  document.getElementById('cal-modal-title').textContent = 'Editar Evento';
  // Reconstruct ISO date from stored month/day
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const mi = months.indexOf(ev.month);
  if (mi >= 0 && ev.day) {
    const y = new Date().getFullYear();
    const iso = `${y}-${String(mi+1).padStart(2,'0')}-${String(ev.day).padStart(2,'0')}`;
    document.getElementById('cf-data').value = iso;
    preencherDataEvento(iso);
  } else {
    document.getElementById('cf-data').value = '';
    document.getElementById('cf-data-preview').innerHTML = '';
  }
  document.getElementById('cf-text').value  = ev.text || '';
  document.querySelectorAll('.cf-tag-cb').forEach(cb => { cb.checked = (ev.tags||[]).includes(cb.value); });
  document.getElementById('cal-modal-overlay').classList.add('open');
}
function closeCalModal() { document.getElementById('cal-modal-overlay').classList.remove('open'); }
function closeCalModalOutside(e) { if (e.target.id === 'cal-modal-overlay') closeCalModal(); }

async function saveCalEvent() {
  const btn = document.getElementById('cf-save');
  btn.disabled = true; btn.textContent = 'Salvando…';
  const tags = [...document.querySelectorAll('.cf-tag-cb:checked')].map(cb => cb.value);
  const payload = {
    month: document.getElementById('cf-month').value,
    day:   parseInt(document.getElementById('cf-day').value),
    dow:   document.getElementById('cf-dow').value,
    text:  document.getElementById('cf-text').value,
    tags,
  };
  try {
    if (editingCalId) {
      const updated = await fetchComFila(`${CAL_API}?id=${editingCalId}`, 'PUT', payload);
      allCalEvents = allCalEvents.map(c => c.id === editingCalId ? { ...c, ...updated } : c);
      if (!updated._pendente) showToast('✓ Evento atualizado');
    } else {
      const created = await fetchComFila(CAL_API, 'POST', payload);
      allCalEvents.push(created);
      if (!created._pendente) showToast('✓ Evento adicionado');
    }
    renderCalendar();
    closeCalModal();
    reativarAbaAtual();
  } catch(e) { showToast('⚠ Não foi possível salvar.'); }
  btn.disabled = false; btn.textContent = 'Salvar';
}

async function deleteCalEvent(id) {
  if (!confirm('Excluir este evento do calendário?')) return;
  try {
    await fetch(`${CAL_API}?id=${id}`, { method:'DELETE' });
    allCalEvents = allCalEvents.filter(c => c.id !== id);
    renderCalendar();
    showToast('🗑 Evento excluído');
  } catch(e) { showToast('⚠ Erro ao excluir.'); }
}
