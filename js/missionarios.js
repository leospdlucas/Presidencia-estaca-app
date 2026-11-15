// =============================================
// MISSIONÁRIOS — do preparo ao relato no sumo conselho
// =============================================
// O presidente da estaca entrevista os candidatos (6.2.2 · 24.4.2), designa
// os missionários, os desobriga na volta (24.8.2) e o sumo conselho ouve o
// relato dos que retornaram (29.3.6 · 24.8.3).

const missionarios = new Colecao('/api/missionarios', () => renderMissionarios());
let filtroMiss = 'andamento';

const ETAPAS_MISS = [
  { id: 'recomendacao', txt: 'Recomendação do bispo à presidência da estaca', ref: '29.3.5' },
  { id: 'entrevista', txt: 'Entrevista com o presidente da estaca', ref: '6.2.2 · 24.4.2' },
  { id: 'papeis', txt: 'Recomendação enviada', ref: '' },
  { id: 'chamado', txt: 'Chamado recebido', ref: '' },
  { id: 'designacao', txt: 'Designado por imposição de mãos pelo presidente da estaca', ref: '' },
  { id: 'campo', txt: 'Em serviço', ref: '' },
  { id: 'desobrigacao', txt: 'Desobrigado pelo presidente da estaca no retorno', ref: '24.8.2' },
  { id: 'relato', txt: 'Relato ao sumo conselho', ref: '29.3.6 · 24.8.3' },
];

function etapaAtualMiss(m) { return ETAPAS_MISS.find(e => !(m.etapas || {})[e.id]) || null; }

function renderMissionarios() {
  const box = document.getElementById('miss-lista');
  if (!box) return;
  const filtros = {
    andamento: { rotulo: 'Em preparo', f: m => !(m.etapas || {}).campo },
    campo: { rotulo: 'Servindo', f: m => (m.etapas || {}).campo && !(m.etapas || {}).desobrigacao },
    retorno: { rotulo: 'Retornaram', f: m => (m.etapas || {}).desobrigacao && !(m.etapas || {}).relato },
    concluido: { rotulo: 'Concluídos', f: m => (m.etapas || {}).relato },
  };
  document.getElementById('miss-filtros').innerHTML = Object.entries(filtros).map(([k, v]) =>
    `<button class="${k === filtroMiss ? 'ativo' : ''}" onclick="filtroMiss='${k}';renderMissionarios()">${v.rotulo} (${missionarios.itens.filter(v.f).length})</button>`).join('');
  const itens = missionarios.itens.filter(filtros[filtroMiss].f).sort((a, b) => (a.retornoPrevisto || a.criadoEm || '').localeCompare(b.retornoPrevisto || b.criadoEm || ''));
  if (!itens.length) {
    box.innerHTML = `<div class="m-vazio">${missionarios.carregado ? 'Ninguém nesta etapa.' : 'Carregando…'}</div>`;
    return;
  }
  box.innerHTML = itens.map(m => {
    const atual = etapaAtualMiss(m);
    const feitas = m.etapas || {};
    const volta = m.retornoPrevisto ? diasAte(m.retornoPrevisto) : null;
    return `<div class="m-card" style="--acc:${m.tipo === 'servico' ? 'var(--blue2)' : 'var(--green)'}">
      <div class="m-linha"><h3>${esc(m.nome)}</h3><span class="m-pill ${m.tipo === 'servico' ? 'info' : 'ok'}">${m.tipo === 'servico' ? 'Missionário de serviço' : 'Tempo integral'}</span></div>
      <div class="m-meta">${[m.ala, m.missao, m.entradaCTM ? 'CTM ' + fmtDataBR(m.entradaCTM) : '', m.retornoPrevisto ? 'retorno ' + fmtDataBR(m.retornoPrevisto) : ''].filter(Boolean).map(esc).join(' · ')}</div>
      ${volta !== null && volta >= 0 && volta <= 45 && !feitas.desobrigacao ? `<span class="m-pill alerta">Retorna em ${volta} dia(s)</span>` : ''}
      <div class="m-etapas">${ETAPAS_MISS.map(e => `<span class="${feitas[e.id] ? 'feita' : atual?.id === e.id ? 'atual' : ''}" title="${esc(e.txt)}"></span>`).join('')}</div>
      ${atual ? `<div class="m-linha" style="margin-top:6px"><span class="m-meta" style="flex:1"><strong style="color:var(--gold2)">Próximo:</strong> ${esc(atual.txt)} ${atual.ref ? `<span class="m-ref">${atual.ref}</span>` : ''}</span>
        <button class="m-btn mini primario" onclick="marcarEtapaMiss('${esc(m.id)}','${atual.id}',true)">✓ Feito</button></div>` : '<div class="m-meta" style="margin-top:6px">✔ Ciclo completo</div>'}
      <details style="margin-top:6px"><summary class="m-meta" style="cursor:pointer">Etapas e dados</summary>
        ${ETAPAS_MISS.map(e => `<label class="m-check ${feitas[e.id] ? 'feito' : ''}"><input type="checkbox" ${feitas[e.id] ? 'checked' : ''} onchange="marcarEtapaMiss('${esc(m.id)}','${e.id}',this.checked)">
          <span class="m-check-txt">${esc(e.txt)} ${e.ref ? `<span class="m-ref">${e.ref}</span>` : ''}</span>${feitas[e.id] ? `<span class="m-pill ok m-check-prazo">${fmtDataBR(feitas[e.id], { day: '2-digit', month: 'short' })}</span>` : ''}</label>`).join('')}
        <div class="m-acoes" style="margin-top:8px"><button class="m-btn mini" onclick="editarMissionario('${esc(m.id)}')">✏️ Editar</button>
        <button class="m-btn mini perigo" onclick="excluirMissionario('${esc(m.id)}')">🗑</button></div>
      </details>
    </div>`;
  }).join('');
}

async function marcarEtapaMiss(id, etapa, feito) {
  const m = missionarios.obter(id);
  const etapas = { ...(m.etapas || {}) };
  if (feito) etapas[etapa] = hojeISO(); else delete etapas[etapa];
  try { await missionarios.alterar(id, { etapas }); } catch { /* toast exibido */ }
}
function novoMissionario() { editarMissionario(null); }
function editarMissionario(id) {
  const m = id ? missionarios.obter(id) : null;
  const f = document.getElementById('miss-form');
  f.ala.innerHTML = opcoesAlas(m?.ala || '');
  preencherCampos(f, m || { tipo: 'tempo-integral' });
  f.dataset.id = id || '';
  document.getElementById('miss-modal-titulo').textContent = id ? 'Editar missionário' : 'Novo missionário';
  preencherDatalistNomes('dl-nomes-conf');
  abrirModal('miss-modal');
}
async function salvarMissionario(ev) {
  ev.preventDefault();
  const f = ev.target;
  const dados = lerCampos(f);
  if (!dados.nome) return alert('Informe o nome.');
  try {
    if (f.dataset.id) await missionarios.alterar(f.dataset.id, dados);
    else await missionarios.salvar({ ...dados, etapas: {} });
    fecharModal('miss-modal');
  } catch { /* toast exibido */ }
}
async function excluirMissionario(id) {
  if (!confirm('Excluir este registro?')) return;
  await missionarios.remover(id);
}

registrarAba('miss', {
  emoji: '🌎', nome: 'Missionários',
  carregar: () => missionarios.carregar(),
  fab: { texto: '＋ Missionário', acao: () => novoMissionario() },
});
Auth.pronto.then(() => missionarios.carregar());

registrarBusca(q => missionarios.itens.filter(m => [m.nome, m.ala, m.missao].join(' ').toLowerCase().includes(q))
  .map(m => ({ tag: '🌎 Missionário', texto: `${m.nome}${m.missao ? ' — ' + m.missao : ''}`, aba: 'miss', cor: '#4dd0e1' })));
