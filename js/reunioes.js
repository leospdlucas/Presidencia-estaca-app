// Reuniões e atas
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// ══════════════════════════════════════════
// ── REUNIÕES / ATAS ──
// ══════════════════════════════════════════
const REUNIOES_API = '/api/reunioes';

const SEED_REUNIOES = []; // dados vêm da API após o login

let allReunioes   = SEED_REUNIOES;
let editingAtaId  = null;
let assuntoCount  = 0;

async function loadReunioes() {
  try {
    const res = await fetch(REUNIOES_API, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      allReunioes = data;
      renderReunioesListView();
    }
  } catch(e) { /* keep seed */ }
}

function fmtAtaDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const months = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${parseInt(d)} de ${months[parseInt(m)]} de ${y}`;
}

// ── LIST VIEW + SEARCH/FILTER ──
let reunioesPeriod = 'all';

function setPeriod(period, btn) {
  reunioesPeriod = period;
  document.querySelectorAll('.rdf-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Clear custom date inputs when using period buttons
  if (period !== 'custom') {
    const de  = document.getElementById('rdf-de');
    const ate = document.getElementById('rdf-ate');
    if (de)  de.value  = '';
    if (ate) ate.value = '';
  }
  filterReunioes();
}

function filterReunioes() {
  const q    = (document.getElementById('reunioes-search')?.value || '').toLowerCase().trim();
  const deV  = document.getElementById('rdf-de')?.value;
  const ateV = document.getElementById('rdf-ate')?.value;
  const now  = new Date();

  // Determine date range
  let dateFrom = null, dateTo = null;
  if (deV || ateV) {
    // Custom range takes priority
    dateFrom = deV  ? new Date(deV  + 'T00:00:00') : null;
    dateTo   = ateV ? new Date(ateV + 'T23:59:59') : null;
  } else if (reunioesPeriod === 'month') {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    dateTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59);
  } else if (reunioesPeriod === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    dateFrom = new Date(now.getFullYear(), q * 3, 1);
    dateTo   = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59);
  } else if (reunioesPeriod === 'year') {
    dateFrom = new Date(now.getFullYear(), 0, 1);
    dateTo   = new Date(now.getFullYear(), 11, 31, 23, 59);
  }

  // Helper: does a string match the query
  function matches(str) {
    return !q || (str || '').toLowerCase().includes(q);
  }

  let data = [...allReunioes].sort((a, b) => (a.data || '') > (b.data || '') ? -1 : 1);

  // Date filter
  if (dateFrom || dateTo) {
    data = data.filter(r => {
      if (!r.data) return false;
      const d = new Date(r.data + 'T12:00:00');
      if (dateFrom && d < dateFrom) return false;
      if (dateTo   && d > dateTo)   return false;
      return true;
    });
  }

  // Tipo filter
  const tipoV = document.getElementById('rdf-tipo')?.value || '';
  if (tipoV) {
    data = data.filter(r => (r.titulo || 'Reunião de Presidência da Estaca') === tipoV);
  }

  // Text search — check all text fields
  if (q) {
    data = data.filter(r => {
      const fields = [
        r.titulo, r.data, r.presidida, r.dirigida, r.oracaoAbertura, r.oracaoEncerramento,
        r.pensamento, r.treinamento, r.outrosAssuntos,
        ...(r.assuntos||[]).flatMap(a => [a.titulo, a.responsavel, a.texto]),
        ...(r.oradoresVisitantes||[]).flatMap(o => [o.ala, o.orador]),
        ...(r.sumosDesignados||[]).flatMap(s => [s.ala, s.sumo]),
      ];
      return fields.some(f => matches(f));
    });
  }

  const info = document.getElementById('reunioes-result-info');
  if (info) {
    if (q || reunioesPeriod !== 'all' || deV || ateV) {
      info.textContent = `${data.length} ata${data.length !== 1 ? 's' : ''} encontrada${data.length !== 1 ? 's' : ''}`;
    } else {
      info.textContent = '';
    }
  }

  renderReunioesListView(data, q);
}

function highlightText(text, q) {
  if (!q || !text) return text || '';
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), m => `<span class="reuniao-highlight">${m}</span>`);
}

function renderReunioesListView(data, q) {
  const list = document.getElementById('reunioes-list');
  if (!list) return;
  if (data === undefined) {
    data = [...allReunioes].sort((a, b) => (a.data || '') > (b.data || '') ? -1 : 1);
    q = '';
  }
  if (!data.length) {
    list.innerHTML = '<div class="desig-empty">Nenhuma ata encontrada</div>';
    return;
  }
  list.innerHTML = data.map(r => {
    // Find matching assuntos to highlight
    const assuntosBadges = (r.assuntos||[]).filter(a => a.titulo).map(a => {
      const highlighted = q ? highlightText(a.titulo, q) : a.titulo;
      const isMatch = q && (a.titulo||'').toLowerCase().includes(q);
      return `<span class="reuniao-badge" style="${isMatch?'background:rgba(206,147,216,.2);border:1px solid rgba(206,147,216,.3)':''}">📌 ${highlighted}</span>`;
    }).join('');

    // Show matching text snippets
    let snippet = '';
    if (q) {
      const sources = [
        ...(r.assuntos||[]).map(a => a.texto),
        r.outrosAssuntos, r.pensamento, r.treinamento,
        ...(r.oradoresVisitantes||[]).map(o => `${o.ala}: ${o.orador}`),
        ...(r.sumosDesignados||[]).map(s => `${s.ala}: ${s.sumo}`),
      ].filter(Boolean);
      for (const src of sources) {
        const idx = src.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end   = Math.min(src.length, idx + q.length + 60);
          let excerpt = (start > 0 ? '…' : '') + src.slice(start, end) + (end < src.length ? '…' : '');
          snippet = `<div class="reuniao-snippet">"${highlightText(excerpt, q)}"</div>`;
          break;
        }
      }
    }

    return `
    <div class="reuniao-card" onclick="viewAta('${r.id}')">
      <div class="reuniao-card-header">
        <div>
          <div class="reuniao-data">${highlightText(fmtAtaDate(r.data), q)}</div>
          <div class="reuniao-hora">⏱ ${r.horaInicio||'—'} – ${r.horaTermino||'—'} &nbsp;·&nbsp; Presidida: ${highlightText(r.presidida||'—', q)}</div>
        </div>
        <span style="font-size:20px;opacity:.4">›</span>
      </div>
      <div class="reuniao-badges">${assuntosBadges}</div>
      ${snippet}
      <div class="reuniao-actions" onclick="event.stopPropagation()">
        <button class="dact-btn" style="color:#60a5fa;border-color:#60a5fa" onclick="imprimirAtaPDF('${r.id}')">📄 PDF</button>
        <button class="dact-btn dact-edit" onclick="editAta('${r.id}')">✏ Editar</button>
        <button class="dact-btn dact-del" onclick="deleteAta('${r.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function showReunioesListView() {
  document.getElementById('reunioes-list-view').style.display = '';
  document.getElementById('ata-view').style.display = 'none';
  document.getElementById('ata-form-view').style.display = 'none';
  filterReunioes();
  const fab = document.getElementById('fab-add');
  if (fab) { fab.classList.add('visible'); fab.innerHTML = '＋ Nova Ata'; fab.onclick = () => openAtaForm(); }
}

// ── VIEW ATA ──
function viewAta(id) {
  const r = allReunioes.find(x => x.id === id);
  if (!r) return;
  document.getElementById('reunioes-list-view').style.display = 'none';
  document.getElementById('ata-form-view').style.display = 'none';
  document.getElementById('ata-view').style.display = '';

  document.getElementById('ata-view-actions').innerHTML = `
    <button class="dact-btn" style="color:#60a5fa;border-color:#60a5fa" onclick="imprimirAtaPDF('${r.id}')">📄 PDF</button>
    <button class="dact-btn dact-edit" onclick="editAta('${r.id}')">✏ Editar</button>
    <button class="dact-btn dact-del" onclick="deleteAta('${r.id}')">🗑</button>
  `;

  const oradores = (r.oradoresVisitantes||[]).filter(o=>o.orador);
  const sumos    = (r.sumosDesignados||[]).filter(s=>s.sumo);

  document.getElementById('ata-view-content').innerHTML = `
    <div class="ata-cabecalho">
      <div class="ata-titulo">${r.titulo||'Reunião de Presidência da Estaca'}</div>
      <div class="ata-subtitulo">${fmtAtaDate(r.data)} · ${r.horaInicio||''} – ${r.horaTermino||''}</div>
      <div class="ata-cab-grid">
        <div class="ata-cab-item"><div class="ata-cab-label">Presidida</div><div class="ata-cab-val">${r.presidida||'—'}</div></div>
        <div class="ata-cab-item"><div class="ata-cab-label">Dirigida</div><div class="ata-cab-val">${r.dirigida||'—'}</div></div>
        <div class="ata-cab-item"><div class="ata-cab-label">Oração de Abertura</div><div class="ata-cab-val">${r.oracaoAbertura||'—'}</div></div>
        <div class="ata-cab-item"><div class="ata-cab-label">Oração de Encerramento</div><div class="ata-cab-val">${r.oracaoEncerramento||'—'}</div></div>
      </div>
    </div>

    ${r.pensamento ? `<div class="ata-section"><div class="ata-section-header">💡 Pensamento</div><div class="ata-section-body"><div class="ata-outros-text">${r.pensamento}</div></div></div>` : ''}
    ${r.treinamento ? `<div class="ata-section"><div class="ata-section-header">📚 Treinamento</div><div class="ata-section-body"><div class="ata-outros-text">${r.treinamento}</div></div></div>` : ''}

    ${(r.assuntos||[]).length ? `
    <div class="ata-section">
      <div class="ata-section-header">📌 Assuntos Discutidos</div>
      <div class="ata-section-body">
        ${(r.assuntos||[]).map((a,i) => `
          <div class="assunto-bloco">
            <div class="assunto-titulo">Assunto ${i+1}: ${a.titulo||'—'}</div>
            ${a.responsavel ? `<div class="assunto-resp">Responsável: ${a.responsavel}</div>` : ''}
            ${a.texto ? `<div class="assunto-texto">${a.texto}</div>` : '<div class="assunto-texto" style="color:var(--subtle);font-style:italic">Sem registro.</div>'}
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${oradores.length ? `
    <div class="ata-section">
      <div class="ata-section-header">🎤 Oradores Visitantes</div>
      <div class="ata-section-body">
        <table class="ata-alas-table">
          ${oradores.map(o=>`<tr><td>${o.ala}</td><td>${o.orador}</td></tr>`).join('')}
        </table>
      </div>
    </div>` : ''}

    ${sumos.length ? `
    <div class="ata-section">
      <div class="ata-section-header">🏛 Sumo Designado à Unidade</div>
      <div class="ata-section-body">
        <table class="ata-alas-table">
          ${sumos.map(s=>`<tr><td>${s.ala}</td><td>${s.sumo}</td></tr>`).join('')}
        </table>
      </div>
    </div>` : ''}

    ${r.outrosAssuntos ? `
    <div class="ata-section">
      <div class="ata-section-header">💬 Outros Assuntos</div>
      <div class="ata-section-body"><div class="ata-outros-text">${r.outrosAssuntos}</div></div>
    </div>` : ''}
  `;

  const fab = document.getElementById('fab-add');
  if (fab) fab.classList.remove('visible');
}

// ── FORM ──
function openAtaForm(preload) {
  editingAtaId = preload ? preload.id : null;
  assuntoCount = 0;
  document.getElementById('reunioes-list-view').style.display = 'none';
  document.getElementById('ata-view').style.display = 'none';
  document.getElementById('ata-form-view').style.display = '';
  document.getElementById('ata-form-title').textContent = editingAtaId ? 'Editar Ata' : 'Nova Ata';

  // Reset
  document.getElementById('af-titulo').value      = preload?.titulo || 'Reunião de Presidência da Estaca';
  document.getElementById('af-data').value        = preload?.data || new Date().toISOString().slice(0,10);
  document.getElementById('af-inicio').value      = preload?.horaInicio || '18:00';
  document.getElementById('af-termino').value     = preload?.horaTermino || '';
  document.getElementById('af-presidida').value   = preload?.presidida || 'Pres. André Oliveira';
  document.getElementById('af-dirigida').value    = preload?.dirigida || 'Pres. André Oliveira';
  document.getElementById('af-abert').value       = preload?.oracaoAbertura || '';
  document.getElementById('af-encerramento').value= preload?.oracaoEncerramento || '';
  document.getElementById('af-pensamento').value  = preload?.pensamento || '';
  document.getElementById('af-treinamento').value = preload?.treinamento || '';
  document.getElementById('af-outros').value      = preload?.outrosAssuntos || '';

  // Assuntos
  const cont = document.getElementById('af-assuntos');
  cont.innerHTML = '';
  const assuntoList = preload?.assuntos?.length ? preload.assuntos : [{titulo:'',responsavel:'',texto:''}];
  assuntoList.forEach(a => addAssunto(a));

  const fab = document.getElementById('fab-add');
  if (fab) fab.classList.remove('visible');
}

function editAta(id) {
  const r = allReunioes.find(x => x.id === id);
  if (r) openAtaForm(r);
}

function cancelAtaForm() { showReunioesListView(); }

function addAssunto(preload) {
  const i = ++assuntoCount;
  const div = document.createElement('div');
  div.className = 'assunto-form-bloco';
  div.id = `assunto-bloco-${i}`;
  div.innerHTML = `
    <button class="assunto-rm-btn" onclick="removeAssunto(${i})" title="Remover">✕</button>
    <div class="form-row"><label>Assunto ${i} — Título</label>
      <input type="text" id="as-titulo-${i}" placeholder="Ex: Chamados, Conferências de Ala..." value="${preload?.titulo||''}"></div>
    <div class="form-row"><label>Responsável (opcional)</label>
      <input type="text" id="as-resp-${i}" placeholder="Nome" value="${preload?.responsavel||''}"></div>
    <div class="form-row"><label>Registro / Texto</label>
      <textarea id="as-texto-${i}" rows="4" placeholder="O que foi discutido, decisões, itens de ação...">${preload?.texto||''}</textarea></div>
  `;
  document.getElementById('af-assuntos').appendChild(div);
}

function removeAssunto(i) {
  const el = document.getElementById(`assunto-bloco-${i}`);
  if (el) el.remove();
}

async function saveAta() {
  const btn = document.getElementById('af-save-btn');
  btn.disabled = true; btn.textContent = 'Salvando…';

  // Collect assuntos
  const assuntos = [];
  document.querySelectorAll('.assunto-form-bloco').forEach(bloco => {
    const idx = bloco.id.replace('assunto-bloco-','');
    assuntos.push({
      titulo:     document.getElementById(`as-titulo-${idx}`)?.value || '',
      responsavel:document.getElementById(`as-resp-${idx}`)?.value || '',
      texto:      document.getElementById(`as-texto-${idx}`)?.value || '',
    });
  });

  const oradoresVisitantes = [];
  const sumosDesignados = [];

  const payload = {
    titulo:             document.getElementById('af-titulo').value,
    data:               document.getElementById('af-data').value,
    horaInicio:         document.getElementById('af-inicio').value,
    horaTermino:        document.getElementById('af-termino').value,
    presidida:          document.getElementById('af-presidida').value,
    dirigida:           document.getElementById('af-dirigida').value,
    oracaoAbertura:     document.getElementById('af-abert').value,
    oracaoEncerramento: document.getElementById('af-encerramento').value,
    pensamento:         document.getElementById('af-pensamento').value,
    treinamento:        document.getElementById('af-treinamento').value,
    outrosAssuntos:     document.getElementById('af-outros').value,
    assuntos, oradoresVisitantes, sumosDesignados,
  };

  try {
    if (editingAtaId) {
      const updated = await fetchComFila(`${REUNIOES_API}?id=${editingAtaId}`, 'PUT', payload);
      allReunioes = allReunioes.map(x => x.id === editingAtaId ? { ...x, ...updated } : x);
      if (!updated._pendente) showToast('✓ Ata atualizada');
    } else {
      const created = await fetchComFila(REUNIOES_API, 'POST', payload);
      allReunioes.unshift(created);
      if (!created._pendente) showToast('✓ Ata salva');
    }
    showReunioesListView();
    reativarAbaAtual();
  } catch(e) { showToast('⚠ Não foi possível salvar.'); }
  btn.disabled = false; btn.textContent = '💾 Salvar Ata';
}

async function deleteAta(id) {
  if (!confirm('Excluir esta ata permanentemente?')) return;
  try {
    await fetch(`${REUNIOES_API}?id=${id}`, { method:'DELETE' });
    allReunioes = allReunioes.filter(x => x.id !== id);
    showReunioesListView();
    showToast('🗑 Ata excluída');
  } catch(e) { showToast('⚠ Erro ao excluir.'); }
}
