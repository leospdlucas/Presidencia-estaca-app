// =============================================
// PAINEL DE ACOMPANHAMENTO
// =============================================
// Junta em uma tela o que está atrasado ou vence em breve, com base no
// Manual Geral, e registra os contatos que o Manual pede com regularidade:
//  - entrevistas regulares do presidente com cada bispo (6.2.1.2)
//  - sumo conselheiro com cada quórum de élderes (6.5.1)
//  - presidente com o patriarca: reunião e revisão das bênçãos, 2x/ano (6.6.4)
//  - instrução de bispados e presidências recém-chamados (6.2.1.2 · 6.2.1.6)

const contatos = new Colecao('/api/contatos', () => renderAcompanhamento());

const TIPOS_CONTATO = {
  'entrevista-bispo': { rotulo: 'Entrevista do presidente com o bispo', porAla: true, dias: 90, ref: '6.2.1.2' },
  'sc-quorum': { rotulo: 'Sumo conselheiro com a presidência do quórum de élderes', porAla: true, dias: 60, ref: '6.5.1' },
  'patriarca-reuniao': { rotulo: 'Presidente reúne-se com o patriarca', dias: 183, ref: '6.6.4' },
  'patriarca-bencaos': { rotulo: 'Presidente revisa as bênçãos dadas pelo patriarca', dias: 183, ref: '6.6.4' },
  'instrucao-bispado': { rotulo: 'Instrução de bispado recém-chamado', porAla: true, ref: '6.2.1.2' },
  'presidencia-org': { rotulo: 'Presidência da estaca com presidência de organização', ref: '6.2.1.6' },
  'outro': { rotulo: 'Outro contato', ref: '' },
};

// Prazos de relatório trimestral (aba do secretário)
const PRAZOS_RELATORIO = ['01-15', '04-15', '07-15', '10-15'];

function ultimoContato(tipo, ala) {
  return contatos.itens.filter(c => c.tipo === tipo && (!ala || c.ala === ala) && c.data).map(c => c.data).sort().pop() || null;
}
function contarDesde(tipo, dias) {
  const limite = somarDias(hojeISO(), -dias);
  return contatos.itens.filter(c => c.tipo === tipo && c.data >= limite).length;
}

function itensAtencao() {
  const itens = [];
  const add = (nivel, area, txt, aba, ref) => itens.push({ nivel, area, txt, aba, ref });

  // Entrevistas com bispos e sumos conselheiros com quóruns
  ['entrevista-bispo', 'sc-quorum'].forEach(tipo => {
    const t = TIPOS_CONTATO[tipo];
    const semRegistro = [];
    alasDaEstaca().forEach(ala => {
      const u = ultimoContato(tipo, ala);
      const d = u ? -diasAte(u) : null;
      if (d === null) semRegistro.push(ala.replace(/^Ala /, ''));
      else if (d > t.dias) add('aviso', 'Contatos', `${t.rotulo}: ${ala} há ${d} dias`, 'acomp', t.ref);
    });
    if (semRegistro.length) add('aviso', 'Contatos', `${t.rotulo}: sem registro em ${semRegistro.length} ala(s) — ${semRegistro.join(', ')}`, 'acomp', t.ref);
  });
  // Patriarca
  ['patriarca-reuniao', 'patriarca-bencaos'].forEach(tipo => {
    const t = TIPOS_CONTATO[tipo];
    const n = contarDesde(tipo, 365);
    if (n < 2) add(n === 0 ? 'erro' : 'aviso', 'Patriarca', `${t.rotulo}: ${n} vez(es) nos últimos 12 meses (mínimo 2)`, 'acomp', t.ref);
  });
  // Reuniões com frequência definida
  if (typeof situacaoReunioes === 'function' && typeof allReunioes !== 'undefined' && allReunioes.length) {
    situacaoReunioes().filter(r => r.atrasada && r.dias <= 95).forEach(r =>
      add('aviso', 'Reuniões', `${r.titulo}: ${r.ultima ? `última ata há ${r.diasDesde} dias` : 'nenhuma ata registrada'} (${r.freq.toLowerCase()})`, 'reunioes', r.ref));
  }
  // Conferências
  if (typeof conferencias !== 'undefined') {
    conferencias.itens.filter(c => diasAte(c.dataDomingo) >= 0).forEach(c =>
      alertasConf(c).forEach(a => add(a.tipo === 'erro' ? 'erro' : 'aviso', 'Conferência', `${c.titulo || 'Conferência'}: ${a.txt}`, 'conf', a.ref)));
  }
  // Chamados parados
  if (typeof chamados !== 'undefined') {
    chamados.itens.filter(i => i.status === 'andamento').forEach(i => {
      const parado = -diasAte((i.atualizadoEm || i.criadoEm || hojeISO()).slice(0, 10));
      if (parado > 30) add('aviso', 'Chamados', `${i.nome} (${nomeCargo(i)}) parado há ${parado} dias em: ${etapaAtual(i)?.txt || ''}`, 'chamados');
    });
  }
  // Líderes: proteção de crianças e jovens
  if (typeof lideres !== 'undefined') {
    lideres.itens.filter(l => l.ativo !== false).forEach(l => {
      const p = situacaoProtecao(l);
      if (p && p.classe !== 'ok') add(p.classe === 'erro' ? 'erro' : 'aviso', 'Líderes', `${l.nome} (${l.cargo}${l.ala ? ', ' + l.ala : ''}): ${p.txt}`, 'lideres', '30.2');
    });
  }
  // Missionários voltando
  if (typeof missionarios !== 'undefined') {
    missionarios.itens.forEach(m => {
      const e = m.etapas || {};
      const d = m.retornoPrevisto ? diasAte(m.retornoPrevisto) : null;
      if (e.campo && !e.desobrigacao && d !== null && d <= 30) add('info', 'Missionários', `${m.nome} retorna ${d >= 0 ? `em ${d} dia(s)` : 'já passou da data'}: agendar desobrigação`, 'miss', '24.8.2');
      if (e.desobrigacao && !e.relato) add('info', 'Missionários', `${m.nome}: agendar relato no sumo conselho`, 'miss', '29.3.6');
    });
  }
  // Discursos
  if (typeof alasSemOrador === 'function' && typeof discursos !== 'undefined' && discursos.carregado) {
    const f = alasSemOrador(hojeISO().slice(0, 7));
    if (f.length) add('aviso', 'Discursos', `Alas sem orador da estaca no período: ${f.join(', ')}`, 'disc', '6.5.1');
  }
  // Designações vencidas
  if (typeof allDesig !== 'undefined') {
    allDesig.filter(d => d.quando && diasAte(d.quando) < 0 && !['realizado', 'cancelado'].includes(d.status) && d.tipo !== 'permanente')
      .forEach(d => add('aviso', 'Designações', `${d.oque || 'Designação'} — ${d.quem || ''} (${fmtDataBR(d.quando)})`, 'desig'));
  }
  // Relatório trimestral
  const ano = hojeISO().slice(0, 4);
  PRAZOS_RELATORIO.map(p => `${ano}-${p}`).concat(`${Number(ano) + 1}-01-15`).forEach(p => {
    const d = diasAte(p);
    if (d >= 0 && d <= 15) add('info', 'Secretaria', `Relatório trimestral vence em ${fmtDataBR(p)} (${d} dia(s))`, 'sec-est', '33.3.2');
  });
  const ordem = { erro: 0, aviso: 1, info: 2 };
  return itens.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}

function renderAcompanhamento() {
  const box = document.getElementById('acomp-conteudo');
  if (!box) return;
  const itens = itensAtencao();
  const porArea = {};
  itens.forEach(i => (porArea[i.area] ||= []).push(i));
  const proxConf = typeof conferencias !== 'undefined'
    ? conferencias.itens.filter(c => diasAte(c.dataDomingo) >= 0).sort((a, b) => a.dataDomingo.localeCompare(b.dataDomingo))[0] : null;

  box.innerHTML = `
    <div class="m-kpis">
      <div class="m-kpi"><strong>${itens.filter(i => i.nivel === 'erro').length}</strong><span>urgentes</span></div>
      <div class="m-kpi"><strong>${itens.filter(i => i.nivel === 'aviso').length}</strong><span>atenção</span></div>
      <div class="m-kpi"><strong>${typeof chamados !== 'undefined' ? chamados.itens.filter(i => i.status === 'andamento').length : 0}</strong><span>chamados em andamento</span></div>
      <div class="m-kpi"><strong>${proxConf ? diasAte(proxConf.dataDomingo) : '—'}</strong><span>dias até a conferência</span></div>
    </div>
    ${itens.length ? Object.entries(porArea).map(([area, lista]) => `
      <details class="m-secao" open><summary>${esc(area)} <span class="m-pill ${lista.some(i => i.nivel === 'erro') ? 'erro' : lista.some(i => i.nivel === 'aviso') ? 'alerta' : 'info'}">${lista.length}</span></summary>
        <div class="m-corpo">${lista.map(i => `<div class="m-check" style="cursor:pointer" onclick="irParaAba('${i.aba}')">
          <span class="m-pill ${i.nivel === 'erro' ? 'erro' : i.nivel === 'aviso' ? 'alerta' : 'info'}">${i.nivel === 'erro' ? '!' : i.nivel === 'aviso' ? '⚠' : 'i'}</span>
          <span class="m-check-txt">${esc(i.txt)} ${i.ref ? `<span class="m-ref">${esc(i.ref)}</span>` : ''}</span><span class="m-meta">›</span></div>`).join('')}</div>
      </details>`).join('') : '<div class="m-alerta ok">Nada pendente. 🎉</div>'}

    <details class="m-secao" open>
      <summary>🤝 Contatos regulares por ala</summary>
      <div class="m-corpo m-rolagem">
        <table class="m-tabela"><thead><tr><th>Ala</th><th>Presidente × bispo <span class="m-ref">6.2.1.2</span></th><th>Sumo conselheiro × quórum <span class="m-ref">6.5.1</span></th></tr></thead>
        <tbody>${alasDaEstaca().map(ala => `<tr><td>${esc(ala)}</td>${['entrevista-bispo', 'sc-quorum'].map(t => {
          const u = ultimoContato(t, ala); const d = u ? -diasAte(u) : null; const lim = TIPOS_CONTATO[t].dias;
          return `<td><span class="m-pill ${d === null ? 'neutro' : d > lim ? 'alerta' : 'ok'}">${d === null ? 'sem registro' : `há ${d} dias`}</span>
            <button class="m-btn mini" title="Registrar hoje" onclick="registrarContatoRapido('${t}','${esc(ala)}')">＋</button></td>`;
        }).join('')}</tr>`).join('')}</tbody></table>
      </div>
    </details>

    <details class="m-secao">
      <summary>🕊️ Patriarca <span class="m-ref">6.6.4</span></summary>
      <div class="m-corpo">
        ${['patriarca-reuniao', 'patriarca-bencaos'].map(t => {
          const n = contarDesde(t, 365); const u = ultimoContato(t);
          return `<div class="m-check"><span class="m-pill ${n >= 2 ? 'ok' : 'alerta'}">${n}/2</span><span class="m-check-txt">${esc(TIPOS_CONTATO[t].rotulo)}<br><span class="m-meta">Último: ${u ? fmtDataBR(u) : '—'} · não pode ser delegado</span></span>
            <button class="m-btn mini" onclick="registrarContatoRapido('${t}','')">＋ Hoje</button></div>`;
        }).join('')}
        <p class="m-meta" style="margin-top:6px">O presidente também garante que as cópias das bênçãos sejam entregues e enviadas à sede da Igreja, e que outras cópias sejam destruídas (6.6.4 · 6.6.5).</p>
      </div>
    </details>

    ${typeof situacaoReunioes === 'function' ? `<details class="m-secao">
      <summary>📝 Reuniões da estaca <span class="m-ref">29.3</span></summary>
      <div class="m-corpo m-rolagem"><table class="m-tabela"><thead><tr><th>Reunião</th><th>Frequência</th><th>Última ata</th></tr></thead><tbody>
        ${situacaoReunioes().map(r => `<tr><td>${esc(r.titulo.replace('Reunião ', ''))} <span class="m-ref">${r.ref}</span></td><td>${esc(r.freq)}</td>
          <td><span class="m-pill ${r.ultima === null ? 'neutro' : r.atrasada ? 'alerta' : 'ok'}">${r.ultima ? `há ${r.diasDesde} dias` : 'nenhuma'}</span></td></tr>`).join('')}
      </tbody></table></div>
    </details>` : ''}

    <details class="m-secao">
      <summary>🗂 Histórico de contatos <span class="m-pill neutro">${contatos.itens.length}</span></summary>
      <div class="m-corpo">${[...contatos.itens].sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 40).map(c => `
        <div class="m-orador"><div class="m-orador-info"><strong>${esc(TIPOS_CONTATO[c.tipo]?.rotulo || c.tipo)}</strong>
          <div class="m-meta">${fmtDataBR(c.data)}${c.ala ? ' · ' + esc(c.ala) : ''}${c.com ? ' · ' + esc(c.com) : ''}${c.por ? ' · por ' + esc(c.por) : ''}</div></div>
          <div class="m-orador-acoes"><button class="m-btn mini perigo" onclick="removerContato('${esc(c.id)}')">🗑</button></div></div>`).join('') || '<div class="m-meta">Nenhum contato registrado.</div>'}</div>
    </details>`;
}

function irParaAba(aba) {
  showTabMobile(aba); // também atualiza o menu do celular
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function novoContato(tipo = 'entrevista-bispo', ala = '') {
  const f = document.getElementById('contato-form');
  f.tipo.innerHTML = Object.entries(TIPOS_CONTATO).map(([k, t]) => `<option value="${k}">${esc(t.rotulo)}</option>`).join('');
  f.ala.innerHTML = opcoesAlas(ala, '—');
  preencherCampos(f, { tipo, ala, data: hojeISO(), por: Auth.usuario()?.nome || '' });
  abrirModal('contato-modal');
}
async function salvarContato(ev) {
  ev.preventDefault();
  const dados = lerCampos(ev.target);
  if (!dados.data) return;
  try { await contatos.salvar(dados); fecharModal('contato-modal'); showToast('✓ Contato registrado'); } catch { /* toast exibido */ }
}
async function registrarContatoRapido(tipo, ala) {
  if (!confirm(`Registrar com a data de hoje?\n${TIPOS_CONTATO[tipo].rotulo}${ala ? ' — ' + ala : ''}\n\nPara outra data, use “＋ Registrar Contato”.`)) return;
  try { await contatos.salvar({ tipo, ala, data: hojeISO(), por: Auth.usuario()?.nome || '' }); showToast('✓ Registrado'); } catch { /* toast exibido */ }
}
async function removerContato(id) {
  if (!confirm('Remover este registro?')) return;
  await contatos.remover(id);
}

registrarAba('acomp', {
  emoji: '📊', nome: 'Acompanhamento',
  carregar: () => Promise.all([contatos.carregar(), typeof loadReunioes === 'function' ? loadReunioes() : null, typeof loadDesig === 'function' ? loadDesig() : null]).then(renderAcompanhamento),
  fab: { texto: '＋ Registrar Contato', acao: () => novoContato() },
});
Auth.pronto.then(() => contatos.carregar());
