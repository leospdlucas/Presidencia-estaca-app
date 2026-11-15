// =============================================
// FLUXO DE CHAMADOS, DESOBRIGAÇÕES E ORDENAÇÕES
// Manual Geral 6.2.1.5, 18.10, 30.2–30.8
// =============================================
// Cada processo segue as etapas do quadro de chamados (30.8): quem recomenda,
// quem aprova, onde é apoiado e quem chama e designa. Os itens com apoio
// "na conferência" aparecem automaticamente no planejador de conferência.

const chamados = new Colecao('/api/chamados', () => { renderChamados(); if (typeof renderConferencias === 'function') renderConferencias(); });
let filtroChamados = 'andamento';

const PSC = 'Presidência da estaca e sumo conselho';
const CARGOS = {
  // ── estaca (30.8.3) ──
  'conselheiro-pres-estaca': { rotulo: 'Conselheiro na presidência da estaca', nivel: 'estaca', rec: 'Presidente da estaca, pelo LCR', aprov: 'Primeira Presidência', externo: 'Primeira Presidência', apoio: 'conferencia', chama: 'Presidente da estaca após aprovação da Primeira Presidência', sumo: true, ref: '6.2.1.5 · 30.8.3' },
  'patriarca': { rotulo: 'Patriarca da estaca', nivel: 'estaca', rec: 'Presidência da estaca, pelo LCR (o presidente jejua e ora; os conselheiros concordam)', aprov: 'Quórum dos Doze', externo: 'Quórum dos Doze', apoio: 'conferencia', chama: 'Presidente da estaca (ordena pessoalmente; não delega)', ref: '6.6.1 · 30.8.3' },
  'secretario-estaca': { rotulo: 'Secretário da estaca', nivel: 'estaca', rec: 'Presidência da estaca', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca ou conselheiro designado', ref: '6.4.2 · 30.8.3' },
  'secretario-exec-estaca': { rotulo: 'Secretário executivo da estaca', nivel: 'estaca', rec: 'Presidência da estaca', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca ou conselheiro designado', ref: '6.4.1 · 30.8.3' },
  'secretario-adjunto-estaca': { rotulo: 'Secretário adjunto da estaca', nivel: 'estaca', rec: 'Presidência da estaca', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca ou conselheiro designado', ref: '6.4 · 30.8.3' },
  'sumo-conselheiro': { rotulo: 'Sumo conselheiro', nivel: 'estaca', rec: 'Presidência da estaca', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca ou conselheiro designado', sumo: true, ref: '6.5 · 30.8.3' },
  'pres-ss-estaca': { rotulo: 'Presidente da Sociedade de Socorro da estaca', nivel: 'estaca', rec: 'Presidência da estaca', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca', ref: '6.7.1 · 30.8.3' },
  'pres-mocas-estaca': { rotulo: 'Presidente das Moças da estaca', nivel: 'estaca', rec: 'Presidência da estaca', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca ou conselheiro designado', jovens: true, ref: '6.7.1 · 30.8.3' },
  'pres-primaria-estaca': { rotulo: 'Presidente da Primária da estaca', nivel: 'estaca', rec: 'Presidência da estaca', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca ou conselheiro designado', jovens: true, ref: '6.7.1 · 30.8.3' },
  'pres-rapazes-estaca': { rotulo: 'Presidente dos Rapazes da estaca (sumo conselheiro)', nivel: 'estaca', rec: 'Presidência da estaca (chama um sumo conselheiro)', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca ou conselheiro designado — apoiado e designado como sumo conselheiro e como presidente', jovens: true, sumo: true, ref: '6.5.3 · 30.8.3' },
  'pres-ed-estaca': { rotulo: 'Presidente da Escola Dominical da estaca (sumo conselheiro)', nivel: 'estaca', rec: 'Presidência da estaca (chama um sumo conselheiro)', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca ou conselheiro designado — apoiado e designado como sumo conselheiro e como presidente', sumo: true, ref: '6.5.3 · 30.8.3' },
  'org-estaca': { rotulo: 'Conselheiro(a) ou secretário(a) de organização da estaca', nivel: 'estaca', rec: 'Presidente da organização da estaca (depois de consultar a presidência ou o sumo conselheiro designado)', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca, conselheiro ou sumo conselheiro designado', ref: '30.8.3' },
  'auditor-estaca': { rotulo: 'Auditor da estaca', nivel: 'estaca', rec: 'Encarregado do comitê de auditoria (conselheiro na presidência)', aprov: PSC, apoio: 'nenhum', chama: 'Presidente da estaca ou conselheiro designado', ref: '30.8.3' },
  'outro-estaca': { rotulo: 'Outro chamado na estaca', nivel: 'estaca', rec: 'Presidência da estaca', aprov: PSC, apoio: 'conferencia', chama: 'Presidente da estaca, conselheiro ou sumo conselheiro designado', livre: true, ref: '30.8.3' },
  // ── ala (30.8.1) ──
  'bispo': { rotulo: 'Bispo', nivel: 'ala', rec: 'Presidência da estaca, pelo LCR (só o presidente envia)', aprov: 'Primeira Presidência e Quórum dos Doze', externo: 'Primeira Presidência', apoio: 'ala', chama: 'Presidente da estaca (ordena, designa e confere as chaves; não delega)', sumo: true, ref: '30.7 · 30.8.1' },
  'conselheiro-bispado': { rotulo: 'Conselheiro no bispado', nivel: 'ala', rec: 'Bispo', aprov: PSC, apoio: 'ala', chama: 'Presidente da estaca ou conselheiro designado', sumo: true, ref: '30.8.1' },
  'secretario-ala': { rotulo: 'Secretário da ala (ou adjunto)', nivel: 'ala', rec: 'Bispado', aprov: PSC, apoio: 'ala', chama: 'Presidente da estaca, conselheiro ou sumo conselheiro designado', ref: '30.8.1' },
  'secretario-exec-ala': { rotulo: 'Secretário executivo da ala (ou adjunto)', nivel: 'ala', rec: 'Bispado', aprov: PSC, apoio: 'ala', chama: 'Presidente da estaca, conselheiro ou sumo conselheiro designado', ref: '30.8.1' },
  'pres-qe': { rotulo: 'Presidente do quórum de élderes', nivel: 'ala', rec: 'Presidência da estaca (depois de consultar o bispo)', aprov: PSC, apoio: 'ala', chama: 'Presidente da estaca (confere as chaves)', ref: '6.2.1.5 · 30.8.1' },
  'conselheiro-qe': { rotulo: 'Conselheiro na presidência do quórum de élderes', nivel: 'ala', rec: 'Presidente do quórum (depois de consultar o bispo)', aprov: PSC, apoio: 'ala', chama: 'Presidente da estaca, conselheiro ou sumo conselheiro designado', ref: '30.8.1' },
};

const TIPOS_PROCESSO = {
  chamado: { rotulo: 'Chamado', cor: 'var(--blue2)' },
  desobrigacao: { rotulo: 'Desobrigação', cor: 'var(--subtle)' },
  'ordenacao-elder': { rotulo: 'Ordenação a élder', cor: 'var(--green)' },
  'ordenacao-sumo': { rotulo: 'Ordenação a sumo sacerdote', cor: 'var(--gold)' },
};

function cargoDe(item) { return CARGOS[item.cargo] || null; }
function nomeCargo(item) {
  const c = cargoDe(item);
  if (item.tipo === 'ordenacao-elder') return 'Élder';
  if (item.tipo === 'ordenacao-sumo') return 'Sumo sacerdote';
  if (!c) return item.cargoTexto || 'Chamado';
  return c.livre ? (item.cargoTexto || c.rotulo) : c.rotulo;
}
function ondeApoia(item) {
  const c = cargoDe(item);
  if (item.tipo?.startsWith('ordenacao')) return item.apoioLocal === 'ala' ? 'ala' : 'conferencia';
  if (!c) return 'conferencia';
  if (c.apoio === 'conferencia' && item.apoioLocal === 'ala') return 'ala';
  return c.apoio;
}

/** Etapas do processo conforme o Manual. Cada etapa: { id, txt, ref } */
function etapasDe(item) {
  const c = cargoDe(item) || CARGOS['outro-estaca'];
  const apoio = ondeApoia(item);
  const E = [];
  if (item.tipo === 'chamado') {
    E.push({ id: 'recomendacao', txt: `Recomendação: ${c.rec}`, ref: '30.8' });
    if (c.externo) {
      E.push({ id: 'aprovacao-pres', txt: 'Presidência da estaca de acordo com a recomendação', ref: '29.3.5' });
      E.push({ id: 'lcr-envio', txt: 'Recomendação enviada pelo LCR (somente o presidente da estaca envia)', ref: '6.2.1.5' });
      E.push({ id: 'aprovacao-externa', txt: `Aprovação recebida: ${c.externo}`, ref: '30.8' });
    } else {
      E.push({ id: 'aprovacao-pres', txt: 'Aprovação da presidência da estaca (reunião de presidência)', ref: '29.3.5' });
      E.push({ id: 'aprovacao-sc', txt: 'Voto de apoio do sumo conselho à decisão', ref: '6.5.1 · 29.3.6' });
    }
    E.push({ id: 'entrevista', txt: `Entrevista e chamado: ${c.chama}. Se for casado(a), convidar o cônjuge.`, ref: '30.2' });
    if (apoio === 'conferencia') E.push({ id: 'apoio', txt: 'Apoio na conferência de estaca (excepcionalmente, nas reuniões sacramentais)', ref: '30.8.3' });
    else if (apoio === 'ala' && c.nivel === 'estaca') E.push({ id: 'apoio', txt: 'Apoio nas reuniões sacramentais das alas (exceção, quando precisa começar antes da conferência)', ref: '30.8.3' });
    else if (apoio === 'ala') E.push({ id: 'apoio', txt: `Apoio na reunião sacramental${item.ala ? ' da ' + item.ala : ' da ala'}`, ref: '30.3' });
    if (c.sumo && !item.jaSumo) E.push({ id: 'ordenacao-sumo', txt: 'Ordenar sumo sacerdote antes de designar', ref: '18.10.1.2 · 30.7.2' });
    E.push({ id: 'designacao', txt: item.cargo === 'patriarca' ? 'Ordenação e designação pelo presidente da estaca' : (['bispo', 'pres-qe'].includes(item.cargo) ? 'Designação por imposição de mãos e entrega das chaves' : 'Designação por imposição de mãos'), ref: '30.4' });
    if (c.jovens) E.push({ id: 'protecao', txt: 'Treinamento de proteção de crianças e jovens concluído (até 1 mês após o apoio)', ref: '30.2' });
    E.push({ id: 'lcr', txt: 'Chamado registrado no LCR', ref: '' });
  } else if (item.tipo === 'desobrigacao') {
    E.push({ id: 'decisao', txt: c.externo ? `Recomendação de desobrigação enviada pelo LCR e aprovada (${c.externo})` : 'Decisão da presidência (desobriga quem tem o mesmo nível de quem chamou)', ref: '30.6' });
    E.push({ id: 'aviso', txt: 'Reunião pessoal para comunicar a desobrigação e agradecer, antes do anúncio', ref: '30.6' });
    if (apoio !== 'nenhum') E.push({ id: 'apoio', txt: apoio === 'conferencia' ? 'Agradecimento público na conferência de estaca' : `Agradecimento público na reunião sacramental${item.ala ? ' da ' + item.ala : ''}`, ref: '30.6' });
    E.push({ id: 'lcr', txt: 'Desobrigação registrada no LCR', ref: '' });
  } else {
    const elder = item.tipo === 'ordenacao-elder';
    E.push({ id: 'recomendacao', txt: elder ? 'Recomendação do bispo' : 'Decisão do presidente da estaca (ou chamado que exige o ofício)', ref: '18.10.1' });
    E.push({ id: 'entrevista-bispo', txt: 'Entrevista do bispo (Registro de ordenação ao Sacerdócio de Melquisedeque)', ref: '18.10.1.3' });
    E.push({ id: 'entrevista-estaca', txt: 'Entrevista com um membro da presidência da estaca', ref: '18.10.1.3 · 31.2.6' });
    E.push({ id: 'aprovacao-sc', txt: 'Voto de apoio do sumo conselho à decisão de ordenar', ref: '18.10.1.3' });
    if (apoio === 'ala') E.push({ id: 'apoio-ala', txt: 'Apoio na reunião sacramental da própria ala (urgente)', ref: '29.3.1' });
    else E.push({ id: 'apoio', txt: 'Apresentado por membro da presidência na sessão geral da conferência', ref: '18.10.3' });
    E.push({ id: 'ordenacao', txt: elder ? 'Ordenação (presidente da estaca ou portador do SM sob sua direção, com recomendação válida)' : 'Ordenação (presidente da estaca ou sumo sacerdote sob sua direção, com recomendação válida)', ref: '18.10.4' });
    E.push({ id: 'lcr', txt: 'Ordenação registrada no LCR', ref: '' });
    if (apoio === 'ala') E.push({ id: 'ratificacao', txt: 'Ratificação do apoio na próxima conferência de estaca', ref: '29.3.1' });
  }
  return E;
}

function etapaAtual(item) {
  const feitas = item.etapas || {};
  return etapasDe(item).find(e => !feitas[e.id]) || null;
}
function progresso(item) {
  const e = etapasDe(item);
  return { feitas: e.filter(x => (item.etapas || {})[x.id]).length, total: e.length };
}

/** Usado pelo planejador de conferência. */
function apoiosPendentesParaConferencia(conf) {
  const futuras = (typeof conferencias !== 'undefined' ? conferencias.itens : [])
    .filter(c => diasAte(c.dataDomingo) >= 0).sort((a, b) => a.dataDomingo.localeCompare(b.dataDomingo));
  const proxima = futuras[0];
  return chamados.itens.filter(it => {
    if (it.status !== 'andamento') return false;
    const feitas = it.etapas || {};
    const etapaConf = etapasDe(it).find(e => e.id === 'apoio' || e.id === 'ratificacao');
    if (!etapaConf || feitas[etapaConf.id]) return false;
    if (etapaConf.id === 'apoio' && ondeApoia(it) !== 'conferencia') return false;
    if (etapaConf.id === 'ratificacao' && !feitas['apoio-ala']) return false; // só depois do apoio na ala
    return it.conferenciaId ? it.conferenciaId === conf.id : proxima && proxima.id === conf.id;
  }).map(it => {
    const etapa = etapasDe(it).find(e => e.id === 'apoio' || e.id === 'ratificacao');
    let acao = it.tipo === 'desobrigacao' ? 'desobrigacao' : it.tipo === 'chamado' ? (it.cargo === 'patriarca' ? 'patriarca' : 'apoio') : it.tipo;
    if (etapa.id === 'ratificacao') acao = 'ratificacao';
    return { id: 'ch-' + it.id, nome: it.nome, acao, cargo: nomeCargo(it) + (it.ala && cargoDe(it)?.nivel === 'ala' ? ' — ' + it.ala : '') };
  });
}

// ── render ───────────────────────────────────

const FILTROS_CHAMADOS = {
  andamento: { rotulo: 'Em andamento', f: it => it.status === 'andamento' },
  presidencia: { rotulo: 'Reunião de presidência', f: it => it.status === 'andamento' && ['recomendacao', 'aprovacao-pres', 'decisao'].includes(etapaAtual(it)?.id) },
  sc: { rotulo: 'Sumo conselho', f: it => it.status === 'andamento' && etapaAtual(it)?.id === 'aprovacao-sc' },
  conf: { rotulo: 'Para a conferência', f: it => it.status === 'andamento' && ['apoio', 'ratificacao'].includes(etapaAtual(it)?.id) && (ondeApoia(it) === 'conferencia' || etapaAtual(it)?.id === 'ratificacao') },
  concluido: { rotulo: 'Concluídos', f: it => it.status === 'concluido' },
  todos: { rotulo: 'Todos', f: () => true },
};

function renderChamados() {
  const box = document.getElementById('chamados-lista');
  if (!box) return;
  document.getElementById('chamados-filtros').innerHTML = Object.entries(FILTROS_CHAMADOS).map(([k, v]) => {
    const n = chamados.itens.filter(v.f).length;
    return `<button class="${k === filtroChamados ? 'ativo' : ''}" onclick="filtroChamados='${k}';renderChamados()">${v.rotulo}${k !== 'todos' && k !== 'concluido' ? ` (${n})` : ''}</button>`;
  }).join('');
  const itens = chamados.itens.filter(FILTROS_CHAMADOS[filtroChamados].f)
    .sort((a, b) => (b.atualizadoEm || b.criadoEm || '').localeCompare(a.atualizadoEm || a.criadoEm || ''));
  if (!itens.length) {
    box.innerHTML = `<div class="m-vazio">${chamados.carregado ? 'Nada aqui.' : 'Carregando…'}${filtroChamados === 'andamento' && chamados.carregado ? '<br>Toque em <strong>＋ Novo Processo</strong> para registrar um chamado, desobrigação ou ordenação.' : ''}</div>`;
    return;
  }
  box.innerHTML = itens.map(it => {
    const tipo = TIPOS_PROCESSO[it.tipo] || TIPOS_PROCESSO.chamado;
    const etapas = etapasDe(it);
    const atual = etapaAtual(it);
    const feitas = it.etapas || {};
    return `<div class="m-card" style="--acc:${tipo.cor}">
      <div class="m-linha"><h3>${esc(it.nome)}</h3><span class="m-pill" style="--c:${tipo.cor}">${tipo.rotulo}</span></div>
      <div class="m-meta">${esc(nomeCargo(it))}${it.ala ? ' · ' + esc(it.ala) : ''}${it.responsavel ? ' · Resp.: ' + esc(it.responsavel) : ''}</div>
      <div class="m-etapas">${etapas.map(e => `<span class="${feitas[e.id] ? 'feita' : atual?.id === e.id ? 'atual' : ''}" title="${esc(e.txt)}"></span>`).join('')}</div>
      ${it.status === 'andamento' && atual ? `
        <div class="m-linha" style="margin-top:6px">
          <span class="m-meta" style="flex:1"><strong style="color:var(--gold2)">Próximo:</strong> ${esc(atual.txt)} ${atual.ref ? `<span class="m-ref">${atual.ref}</span>` : ''}</span>
          <button class="m-btn mini primario" onclick="concluirEtapa('${esc(it.id)}','${atual.id}')">✓ Feito</button>
        </div>` : it.status === 'concluido' ? '<div class="m-meta" style="margin-top:6px">✔ Concluído</div>' : '<div class="m-meta" style="margin-top:6px">Cancelado</div>'}
      <details style="margin-top:6px"><summary class="m-meta" style="cursor:pointer">Ver todas as etapas</summary>
        ${etapas.map(e => `<label class="m-check ${feitas[e.id] ? 'feito' : ''}">
          <input type="checkbox" ${feitas[e.id] ? 'checked' : ''} onchange="marcarEtapa('${esc(it.id)}','${e.id}',this.checked)">
          <span class="m-check-txt">${esc(e.txt)} ${e.ref ? `<span class="m-ref">${e.ref}</span>` : ''}</span>
          ${feitas[e.id] ? `<span class="m-pill ok m-check-prazo">${fmtDataBR(feitas[e.id], { day: '2-digit', month: 'short' })}</span>` : ''}
        </label>`).join('')}
        <div class="m-acoes" style="margin-top:8px">
          <button class="m-btn mini" onclick="editarChamado('${esc(it.id)}')">✏️ Editar</button>
          ${it.status === 'andamento' ? `<button class="m-btn mini" onclick="cancelarChamado('${esc(it.id)}')">Cancelar processo</button>` : `<button class="m-btn mini" onclick="chamados.alterar('${esc(it.id)}',{status:'andamento'})">Reabrir</button>`}
          <button class="m-btn mini perigo" onclick="excluirChamado('${esc(it.id)}')">🗑</button>
        </div>
      </details>
    </div>`;
  }).join('');
}

// ── ações ────────────────────────────────────

async function marcarEtapa(id, etapa, feito) {
  const it = chamados.obter(id);
  const etapas = { ...(it.etapas || {}) };
  if (feito) etapas[etapa] = hojeISO(); else delete etapas[etapa];
  const todasFeitas = etapasDe({ ...it, etapas }).every(e => etapas[e.id]);
  try {
    await chamados.alterar(id, { etapas, status: todasFeitas ? 'concluido' : (it.status === 'concluido' ? 'andamento' : it.status) });
    if (todasFeitas) {
      showToast('✔ Processo concluído');
      // Mantém o diretório de líderes em dia
      if (it.tipo === 'chamado' && typeof sincronizarLiderComChamado === 'function') sincronizarLiderComChamado({ ...it, etapas });
      if (it.tipo === 'desobrigacao' && typeof desativarLiderPorDesobrigacao === 'function') desativarLiderPorDesobrigacao(it);
    }
  } catch { /* toast exibido */ }
}
function concluirEtapa(id, etapa) { return marcarEtapa(id, etapa, true); }
async function cancelarChamado(id) {
  if (!confirm('Cancelar este processo? Ele fica guardado no histórico.')) return;
  await chamados.alterar(id, { status: 'cancelado' });
}
async function excluirChamado(id) {
  if (!confirm('Excluir definitivamente este processo?')) return;
  await chamados.remover(id);
}

function novoChamado() { editarChamado(null); }
function editarChamado(id) {
  const it = id ? chamados.obter(id) : null;
  const f = document.getElementById('chamado-form');
  f.ala.innerHTML = opcoesAlas(it?.ala || '', '— (chamado da estaca) —');
  const opts = nivel => Object.entries(CARGOS).filter(([, c]) => c.nivel === nivel).map(([k, c]) => `<option value="${k}">${esc(c.rotulo)}</option>`).join('');
  f.cargo.innerHTML = `<optgroup label="Estaca">${opts('estaca')}</optgroup><optgroup label="Ala">${opts('ala')}</optgroup>`;
  f.conferenciaId.innerHTML = '<option value="">Próxima conferência</option>' + (typeof conferencias !== 'undefined' ? conferencias.itens : [])
    .filter(c => diasAte(c.dataDomingo) >= 0).map(c => `<option value="${esc(c.id)}">${esc(c.titulo || fmtDataBR(c.dataDomingo))}</option>`).join('');
  preencherCampos(f, it ? { ...it, apoioLocal: it.apoioLocal || 'padrao' } : { tipo: 'chamado', cargo: 'sumo-conselheiro', apoioLocal: 'padrao' });
  f.dataset.id = id || '';
  document.getElementById('chamado-modal-titulo').textContent = id ? 'Editar processo' : 'Novo processo';
  preencherDatalistNomes('dl-nomes-conf');
  atualizarFormChamado();
  abrirModal('chamado-modal');
}
function atualizarFormChamado() {
  const f = document.getElementById('chamado-form');
  const tipo = f.tipo.value;
  const ordenacao = tipo.startsWith('ordenacao');
  const c = CARGOS[f.cargo.value];
  f.querySelector('.ch-cargo').hidden = ordenacao;
  f.querySelector('.ch-livre').hidden = ordenacao || !c?.livre;
  f.querySelector('.ch-sumo').hidden = ordenacao || !c?.sumo || tipo !== 'chamado';
  const apoioConf = ordenacao || c?.apoio === 'conferencia';
  f.querySelector('.ch-apoio').hidden = !apoioConf;
  f.querySelector('.ch-conf').hidden = !apoioConf;
  const info = document.getElementById('chamado-quadro');
  if (ordenacao) {
    info.innerHTML = `<strong>${tipo === 'ordenacao-elder' ? 'Ordenação a élder' : 'Ordenação a sumo sacerdote'}</strong><br>
      O bispo recomenda e entrevista; um membro da presidência da estaca entrevista; o sumo conselho apoia a decisão; o irmão é apresentado na sessão geral da conferência (ou na ala, se urgente, com ratificação depois). <span class="m-ref">18.10.1 · 18.10.3 · 29.3.1</span>`;
  } else if (c) {
    info.innerHTML = `<strong>${esc(c.rotulo)}</strong><br>
      Recomenda: ${esc(c.rec)}<br>Aprova: ${esc(c.aprov)}<br>Apoio: ${c.apoio === 'conferencia' ? 'membros na conferência de estaca' : c.apoio === 'ala' ? 'membros da ala, na reunião sacramental' : 'não é apoiado'}<br>Chama e designa: ${esc(c.chama)} <span class="m-ref">${c.ref}</span>`;
  }
}
async function salvarChamado(ev) {
  ev.preventDefault();
  const f = ev.target;
  const dados = lerCampos(f);
  if (!dados.nome) return alert('Informe o nome.');
  if (dados.tipo.startsWith('ordenacao')) { dados.cargo = ''; }
  if (dados.apoioLocal === 'padrao') dados.apoioLocal = '';
  try {
    if (f.dataset.id) await chamados.alterar(f.dataset.id, dados);
    else await chamados.salvar({ ...dados, etapas: {}, status: 'andamento' });
    fecharModal('chamado-modal');
    showToast('✓ Processo salvo');
  } catch { /* toast exibido */ }
}

/** Pauta imprimível: itens para a reunião de presidência e para o sumo conselho. */
function imprimirPautaChamados() {
  const grupo = (titulo, f) => {
    const itens = chamados.itens.filter(f);
    return `<h2>${esc(titulo)} (${itens.length})</h2>` + (itens.length
      ? `<table>${itens.map(it => `<tr><td>${esc(it.nome)}${it.ala ? '<br><small>' + esc(it.ala) + '</small>' : ''}</td><td>${esc(TIPOS_PROCESSO[it.tipo]?.rotulo || '')}: ${esc(nomeCargo(it))}<br><small>${esc(etapaAtual(it)?.txt || '')}</small></td></tr>`).join('')}</table>`
      : '<p class="nota">Nenhum item.</p>');
  };
  abrirImpressao('Pauta de chamados', `<div class="igreja">Presidência da estaca</div><h1>Pauta de chamados e ordenações</h1><p class="sub">${fmtDataLonga(hojeISO())}</p>
    <p class="nota">Lista de trabalho. Não registre aqui assuntos de dignidade.</p>
    ${grupo('Reunião de presidência', FILTROS_CHAMADOS.presidencia.f)}
    ${grupo('Apoio do sumo conselho', FILTROS_CHAMADOS.sc.f)}
    ${grupo('Apresentar na conferência', FILTROS_CHAMADOS.conf.f)}`);
}

registrarAba('chamados', {
  emoji: '📋', nome: 'Chamados',
  carregar: () => chamados.carregar(),
  fab: { texto: '＋ Novo Processo', acao: () => novoChamado() },
});
// A conferência precisa dos chamados para montar a lista de apoios.
Auth.pronto.then(() => chamados.carregar());

registrarBusca(q => chamados.itens.filter(it => [it.nome, nomeCargo(it), it.ala].join(' ').toLowerCase().includes(q))
  .map(it => ({ tag: `📋 ${TIPOS_PROCESSO[it.tipo]?.rotulo || 'Chamado'}`, texto: `${it.nome} — ${nomeCargo(it)}${it.ala ? ' · ' + it.ala : ''}`, aba: 'chamados', cor: 'var(--green)' })));
