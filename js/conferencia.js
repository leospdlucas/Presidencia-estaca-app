// =============================================
// PLANEJADOR DE CONFERÊNCIA DE ESTACA — Manual Geral 29.3.1
// =============================================
// Duas por ano. Em uma o presidente da estaca preside; na outra, uma
// autoridade geral ou setenta de área. Cada conferência tem as sessões
// previstas no Manual, oradores com status de convite, roteiro de preparação
// com prazos, apoios, logística e programa para imprimir.

const conferencias = new Colecao('/api/conferencias', () => renderConferencias());
let confAbertaId = null;

const SESSOES_CONF = {
  autoridade: {
    titulo: 'Reunião da autoridade presidente com a presidência',
    participantes: () => 'Autoridade presidente, presidência da estaca, secretário e secretário executivo da estaca.',
    soComAutoridade: true, oradores: false, dia: 'sabado', hora: '15:00',
  },
  lideranca: {
    titulo: 'Reunião de liderança da estaca',
    participantes: c => c.presidida === 'autoridade'
      ? 'Todos os membros dos conselhos de estaca e de ala (a autoridade presidente define se é sábado ou domingo).'
      : 'Somente os líderes do sacerdócio, conforme 29.3.3.',
    oradores: true, dia: 'sabado', hora: '16:00',
  },
  sabado: {
    titulo: 'Sessão de sábado à noite',
    participantes: () => 'Membros da estaca com 18 anos ou mais. Um membro da presidência da estaca dirige.',
    oradores: true, dia: 'sabado', hora: '19:00',
  },
  geral: {
    titulo: 'Sessão geral',
    participantes: () => 'Todos os membros e não membros que desejarem. O presidente da estaca dirige e discursa. Crianças da Primária assistem com a família.',
    oradores: true, musica: true, dia: 'domingo', hora: '10:00',
  },
};

const STATUS_ORADOR = {
  a_convidar: { rotulo: 'A convidar', classe: 'neutro' },
  convidado:  { rotulo: 'Convidado',  classe: 'alerta' },
  aceitou:    { rotulo: 'Aceitou',    classe: 'info' },
  confirmado: { rotulo: 'Confirmado', classe: 'ok' },
  recusou:    { rotulo: 'Recusou',    classe: 'erro' },
};

const ACOES_APOIO = {
  apoio: 'Apoio a chamado',
  desobrigacao: 'Desobrigação (agradecimento)',
  'ordenacao-elder': 'Ordenação a élder',
  'ordenacao-sumo': 'Ordenação a sumo sacerdote',
  ratificacao: 'Ratificação de apoio/ordenação feito na ala',
  patriarca: 'Apoio ao patriarca',
};

// Roteiro de preparação. diasAntes = prazo contado a partir do domingo.
const ROTEIRO_CONF = [
  { id: 'temas', dias: 90, so: 'presidente', ref: '29.3.1', txt: 'Escolher os temas das mensagens, considerando o que a Primeira Presidência tem enfatizado (pode debater no conselho da estaca).' },
  { id: 'temas-aut', dias: 90, so: 'autoridade', ref: '29.3.1', txt: 'Combinar com a autoridade presidente a agenda e enviar sugestões de temas, se ela pedir.' },
  { id: 'oradores', dias: 75, ref: '29.3.1', txt: 'Definir os oradores de cada sessão e fazer os convites.' },
  { id: 'musica', dias: 60, ref: '19.3.4', txt: 'Definir a música: coro, regente, organista, hinos e número especial.' },
  { id: 'aprovacao', dias: 45, ref: '29.3.1', txt: 'Enviar participantes e apresentação musical para aprovação do líder presidente.' },
  { id: 'logistica', dias: 30, ref: '29.3.1', txt: 'Designar quóruns, organizações ou famílias para arrumar cadeiras, recepcionar e limpar o prédio.' },
  { id: 'form-apoio', dias: 30, so: 'apoioAnual', ref: '29.3.1', txt: 'Secretário da estaca prepara o Formulário de apoio da liderança (líderes gerais, da área e da estaca).' },
  { id: 'apoios', dias: 21, ref: '29.3.1 · 30.3 · 30.6', txt: 'Revisar chamados e desobrigações de líderes da estaca desde a última conferência e as ordenações a élder e sumo sacerdote a apresentar.' },
  { id: 'transmissao', dias: 14, ref: '29.7', txt: 'Confirmar a transmissão para capelas ou casas, se necessário.' },
  { id: 'pulpito', dias: 14, ref: '29.3.1', txt: 'Avisar quem se senta ao púlpito: líderes gerais, presidente e diretora do templo, presidente da missão e esposa, patriarca.' },
  { id: 'confirmar', dias: 7, ref: '29.3.1', txt: 'Confirmar todos os oradores, temas e tempo de cada um.' },
  { id: 'visuais', dias: 7, ref: '38.8.3', txt: 'Lembrar os oradores da sessão geral de que não se usam auxílios visuais nem audiovisuais.' },
  { id: 'imprimir', dias: 2, ref: '', txt: 'Imprimir os programas.' },
  { id: 'pos', dias: -7, ref: '33', txt: 'Depois da conferência: lançar apoios, desobrigações e ordenações no LCR e registrar a frequência.' },
];

const LOGISTICA_PADRAO = ['Arrumar as cadeiras', 'Recepcionar as pessoas', 'Limpar o prédio', 'Som e transmissão'];

// ── utilidades ───────────────────────────────

function dataSabado(c) { return c.dataDomingo ? somarDias(c.dataDomingo, -1) : ''; }
function nomePresidente() {
  return (typeof CONFIG_APP !== 'undefined' && CONFIG_APP.nomes?.['nome-pres']) || document.getElementById('nome-pres')?.textContent || 'Presidente da Estaca';
}
function sessoesAtivas(c) {
  return (c.sessoes || []).filter(s => !(SESSOES_CONF[s.tipo]?.soComAutoridade && c.presidida !== 'autoridade'));
}
function roteiroDa(c) {
  return ROTEIRO_CONF.filter(r =>
    !r.so || (r.so === 'autoridade' && c.presidida === 'autoridade') ||
    (r.so === 'presidente' && c.presidida !== 'autoridade') || (r.so === 'apoioAnual' && c.apoioAnual));
}
function itemFeito(c, r) {
  if (r.id === 'aprovacao') return !!c.programaAprovado;
  return !!c.checklist?.[r.id];
}
function todosOradores(c) {
  return sessoesAtivas(c).flatMap(s => (s.oradores || []).map(o => ({ ...o, sessao: s })));
}
function resumoConf(c) {
  const rot = roteiroDa(c);
  const feitos = rot.filter(r => itemFeito(c, r)).length;
  const ors = todosOradores(c);
  const confirmados = ors.filter(o => o.status === 'confirmado').length;
  const atrasados = rot.filter(r => !itemFeito(c, r) && diasAte(somarDias(c.dataDomingo, -r.dias)) < 0);
  return { feitos, total: rot.length, oradores: ors.length, confirmados, atrasados };
}

/** Alertas baseados no Manual Geral. Usado aqui e no painel de acompanhamento. */
function alertasConf(c) {
  const a = [];
  const dias = diasAte(c.dataDomingo);
  if (c.presidida === 'autoridade' && !c.autoridadeNome) a.push({ tipo: 'aviso', txt: 'Informe o nome da autoridade que vai presidir.' });
  const geral = (c.sessoes || []).find(s => s.tipo === 'geral');
  if (geral) {
    const pres = nomePresidente().toLowerCase();
    const presDiscursa = (geral.oradores || []).some(o =>
      /presidente da estaca/i.test(o.chamado || '') || (pres && (o.nome || '').toLowerCase().includes(pres.split(' ')[0])));
    if (!presDiscursa) a.push({ tipo: 'aviso', txt: 'O presidente da estaca dirige a sessão geral e discursa nela. Inclua-o entre os oradores.', ref: '29.3.1' });
  }
  if (!c.programaAprovado && dias !== null && dias <= 30 && dias >= 0) a.push({ tipo: 'aviso', txt: 'O líder presidente ainda não aprovou participantes e música.', ref: '29.3.1' });
  const recusas = todosOradores(c).filter(o => o.status === 'recusou');
  if (recusas.length) a.push({ tipo: 'erro', txt: `${recusas.length} orador(es) recusaram o convite. Substitua.` });
  const pendentes = todosOradores(c).filter(o => o.status !== 'confirmado' && o.status !== 'recusou');
  if (dias !== null && dias <= 7 && dias >= 0 && pendentes.length) a.push({ tipo: 'aviso', txt: `${pendentes.length} orador(es) ainda não confirmados a ${dias} dia(s) da conferência.` });
  const { atrasados } = resumoConf(c);
  if (atrasados.length && dias >= 0) a.push({ tipo: 'aviso', txt: `${atrasados.length} etapa(s) de preparação com prazo vencido.` });
  return a;
}

function novaConferenciaPadrao(dataDomingo, presidida) {
  const sessoes = Object.entries(SESSOES_CONF).map(([tipo, d]) => ({
    id: tipo, tipo, hora: d.hora, local: '', dirige: '', oracaoAbertura: '', oracaoEncerramento: '',
    hinoAbertura: '', hinoIntermediario: '', hinoEncerramento: '', musicaEspecial: '', regente: '', organista: '', coro: '',
    oradores: [], obs: '',
  }));
  const mes = dataDomingo ? Number(dataDomingo.slice(5, 7)) : 1;
  return {
    dataDomingo, presidida, autoridadeNome: '', autoridadeCargo: 'Setenta de Área', tema: '', local: '',
    apoioAnual: mes <= 6, programaAprovado: false, checklist: {}, sessoes, apoios: [],
    logistica: LOGISTICA_PADRAO.map((t, i) => ({ id: 'l' + i, tarefa: t, responsavel: '', feito: false })),
    status: 'planejamento',
  };
}

// ── lista ────────────────────────────────────

function renderConferencias() {
  const lista = document.getElementById('conf-lista');
  const detalhe = document.getElementById('conf-detalhe');
  if (!lista) return;
  const fab = document.getElementById('fab-add');
  if (currentTabId === 'conf' && fab) fab.classList.toggle('visible', !(confAbertaId && conferencias.obter(confAbertaId)));
  if (confAbertaId && conferencias.obter(confAbertaId)) {
    lista.hidden = true; detalhe.hidden = false;
    renderDetalheConf(conferencias.obter(confAbertaId));
    return;
  }
  confAbertaId = null;
  lista.hidden = false; detalhe.hidden = true;
  const box = document.getElementById('conf-cards');
  const itens = [...conferencias.itens].sort((a, b) => (b.dataDomingo || '').localeCompare(a.dataDomingo || ''));
  const futuras = itens.filter(c => diasAte(c.dataDomingo) >= -1).reverse();
  const passadas = itens.filter(c => diasAte(c.dataDomingo) < -1);
  if (!itens.length) {
    box.innerHTML = `<div class="m-vazio">Nenhuma conferência cadastrada.<br>Toque em <strong>＋ Nova Conferência</strong> para começar o planejamento.</div>`;
    return;
  }
  const card = c => {
    const r = resumoConf(c);
    const dias = diasAte(c.dataDomingo);
    const quando = dias > 1 ? `em ${dias} dias` : dias === 1 ? 'amanhã' : dias === 0 ? 'hoje' : dias === -1 ? 'ontem' : 'realizada';
    const alertas = dias >= -1 ? alertasConf(c) : [];
    const pct = r.total ? Math.round(r.feitos / r.total * 100) : 0;
    return `<div class="m-card clicavel" style="--acc:${c.presidida === 'autoridade' ? 'var(--blue2)' : 'var(--gold)'}" onclick="abrirConf('${esc(c.id)}')">
      <div class="m-linha"><h3>${esc(c.titulo || 'Conferência de estaca')}</h3><span class="m-pill ${dias < -1 ? 'neutro' : 'ouro'}">${esc(quando)}</span></div>
      <div class="m-meta">${fmtDataBR(dataSabado(c))} e ${fmtDataLonga(c.dataDomingo)} · Preside: ${c.presidida === 'autoridade' ? esc(c.autoridadeNome || 'autoridade a definir') + ' (' + esc(c.autoridadeCargo || '') + ')' : 'Presidente da estaca'}</div>
      ${c.tema ? `<div class="m-meta">Tema: ${esc(c.tema)}</div>` : ''}
      <div class="m-linha" style="margin-top:8px">
        <span class="m-meta">Preparação ${r.feitos}/${r.total} · Oradores confirmados ${r.confirmados}/${r.oradores}</span>
        ${alertas.length ? `<span class="m-pill alerta">⚠ ${alertas.length} alerta(s)</span>` : (dias >= -1 ? '<span class="m-pill ok">✓ em dia</span>' : '')}
      </div>
      <div class="m-progresso"><span style="width:${pct}%"></span></div>
    </div>`;
  };
  box.innerHTML =
    (futuras.length ? futuras.map(card).join('') : '<div class="m-vazio">Nenhuma conferência futura.</div>') +
    (passadas.length ? `<details class="m-secao" style="margin-top:14px"><summary>Conferências anteriores (${passadas.length})</summary><div class="m-corpo">${passadas.map(card).join('')}</div></details>` : '');
}

function abrirConf(id) { confAbertaId = id; renderConferencias(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function fecharConf() { confAbertaId = null; renderConferencias(); }

// ── detalhe ──────────────────────────────────

function renderDetalheConf(c) {
  const box = document.getElementById('conf-detalhe');
  // Guarda quais seções estavam abertas para não fechá-las a cada alteração
  const mesmo = box.dataset.conf === c.id;
  const abertos = new Set([...box.querySelectorAll('details[data-sec]')].filter(d => d.open).map(d => d.dataset.sec));
  const rolagem = window.scrollY;
  const r = resumoConf(c);
  const alertas = alertasConf(c);
  const sessoes = sessoesAtivas(c);
  box.innerHTML = `
    <div class="ata-view-header">
      <button class="ata-back-btn" onclick="fecharConf()">← Conferências</button>
      <div class="m-acoes">
        <button class="m-btn" onclick="editarConf('${esc(c.id)}')">✏️ Dados</button>
        <button class="m-btn" onclick="imprimirProgramaConf('${esc(c.id)}')">🖨 Programa</button>
      </div>
    </div>
    <div class="m-card" style="--acc:${c.presidida === 'autoridade' ? 'var(--blue2)' : 'var(--gold)'}">
      <h3>${esc(c.titulo || 'Conferência de estaca')}</h3>
      <div class="m-meta">Sábado ${fmtDataBR(dataSabado(c))} e domingo ${fmtDataBR(c.dataDomingo)}${c.local ? ' · ' + esc(c.local) : ''}</div>
      <div class="m-meta">Preside: ${c.presidida === 'autoridade' ? `<strong>${esc(c.autoridadeNome || 'a definir')}</strong> (${esc(c.autoridadeCargo || '')})` : '<strong>Presidente da estaca</strong>'}</div>
      ${c.tema ? `<div class="m-meta">Tema: ${esc(c.tema)}</div>` : ''}
      <label class="m-check" style="border:none;margin-top:6px"><input type="checkbox" ${c.programaAprovado ? 'checked' : ''} onchange="alterarConf('${esc(c.id)}', { programaAprovado: this.checked })"><span class="m-check-txt">Participantes e música aprovados pelo líder presidente <span class="m-ref">29.3.1</span></span></label>
    </div>
    ${alertas.map(a => `<div class="m-alerta ${a.tipo}">${esc(a.txt)}${a.ref ? ` <span class="m-ref">${a.ref}</span>` : ''}</div>`).join('')}

    <details class="m-secao" data-sec="prep" open>
      <summary>🗓 Preparação <span class="m-pill ${r.atrasados.length ? 'alerta' : 'ok'}">${r.feitos}/${r.total}</span></summary>
      <div class="m-corpo">${roteiroDa(c).map(it => {
        const prazo = somarDias(c.dataDomingo, -it.dias);
        const d = diasAte(prazo);
        const feito = itemFeito(c, it);
        const cls = feito ? 'ok' : d < 0 ? 'erro' : d <= 7 ? 'alerta' : 'neutro';
        return `<label class="m-check ${feito ? 'feito' : ''}">
          <input type="checkbox" ${feito ? 'checked' : ''} onchange="marcarRoteiro('${esc(c.id)}','${it.id}',this.checked)">
          <span class="m-check-txt">${esc(it.txt)} ${it.ref ? `<span class="m-ref">${it.ref}</span>` : ''}</span>
          <span class="m-pill ${cls} m-check-prazo">${fmtDataBR(prazo, { day: '2-digit', month: 'short' })}</span>
        </label>`;
      }).join('')}</div>
    </details>

    ${sessoes.map(s => renderSessaoConf(c, s)).join('')}

    <details class="m-secao" data-sec="apoios">
      <summary>🙋 Apoios e desobrigações <span class="m-pill neutro">${(c.apoios || []).length + apoiosAutomaticos(c).length}</span></summary>
      <div class="m-corpo">${renderApoiosConf(c)}</div>
    </details>

    <details class="m-secao" data-sec="logistica">
      <summary>🧹 Logística <span class="m-pill neutro">${(c.logistica || []).filter(l => l.feito).length}/${(c.logistica || []).length}</span></summary>
      <div class="m-corpo">${renderLogisticaConf(c)}</div>
    </details>

    <div class="m-acoes" style="justify-content:flex-end;margin-top:8px">
      <button class="m-btn perigo" onclick="excluirConf('${esc(c.id)}')">🗑 Excluir conferência</button>
    </div>`;
  box.dataset.conf = c.id;
  if (mesmo) {
    box.querySelectorAll('details[data-sec]').forEach(d => { d.open = abertos.has(d.dataset.sec); });
    window.scrollTo(0, rolagem);
  }
}

function renderSessaoConf(c, s) {
  const def = SESSOES_CONF[s.tipo] || {};
  const data = def.dia === 'domingo' ? c.dataDomingo : dataSabado(c);
  const ors = s.oradores || [];
  const minutos = ors.reduce((t, o) => t + (Number(o.minutos) || 0), 0);
  const conf = ors.filter(o => o.status === 'confirmado').length;
  return `<details class="m-secao" data-sec="s-${s.id}" ${s.tipo === 'geral' ? 'open' : ''}>
    <summary>${s.tipo === 'geral' ? '⛪' : s.tipo === 'sabado' ? '🌙' : s.tipo === 'lideranca' ? '👥' : '🤝'} ${esc(def.titulo || s.tipo)}
      ${def.oradores ? `<span class="m-pill ${conf === ors.length && ors.length ? 'ok' : 'neutro'}">${conf}/${ors.length}</span>` : ''}</summary>
    <div class="m-corpo">
      <div class="m-meta">${fmtDataLonga(data)} · ${esc(s.hora || '--:--')}${s.local || c.local ? ' · ' + esc(s.local || c.local) : ''}</div>
      <div class="m-meta" style="margin-bottom:8px">${esc(def.participantes ? def.participantes(c) : '')} <span class="m-ref">29.3.1</span></div>
      <div class="m-meta">Dirige: ${esc(s.dirige || '—')}${def.oradores ? ` · Orações: ${esc(s.oracaoAbertura || '—')} / ${esc(s.oracaoEncerramento || '—')}` : ''}</div>
      ${def.musica || s.hinoAbertura ? `<div class="m-meta">Hinos: ${esc(s.hinoAbertura || '—')} · ${esc(s.hinoIntermediario || '—')} · ${esc(s.hinoEncerramento || '—')}${s.musicaEspecial ? ' · Especial: ' + esc(s.musicaEspecial) : ''}</div>` : ''}
      ${s.regente || s.organista || s.coro ? `<div class="m-meta">Regente: ${esc(s.regente || '—')} · Organista: ${esc(s.organista || '—')}${s.coro ? ' · Coro: ' + esc(s.coro) : ''}</div>` : ''}
      ${def.oradores ? `
        <div style="margin-top:10px">${ors.length ? ors.map((o, i) => {
          const st = STATUS_ORADOR[o.status] || STATUS_ORADOR.a_convidar;
          return `<div class="m-orador">
            <div class="m-orador-num">${i + 1}</div>
            <div class="m-orador-info">
              <strong>${esc(o.nome)}</strong> <span class="m-pill ${st.classe}">${st.rotulo}</span>
              <div class="m-meta">${[o.chamado, o.origem === 'fora' ? 'de fora da estaca' : o.ala, o.minutos ? o.minutos + ' min' : ''].filter(Boolean).map(esc).join(' · ')}</div>
              ${o.tema ? `<div class="m-meta">Tema: ${esc(o.tema)}</div>` : ''}
            </div>
            <div class="m-orador-acoes">
              <button class="m-btn mini" title="Subir" onclick="moverOrador('${esc(c.id)}','${s.id}','${esc(o.id)}',-1)" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button class="m-btn mini" title="Descer" onclick="moverOrador('${esc(c.id)}','${s.id}','${esc(o.id)}',1)" ${i === ors.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="m-btn mini" onclick="convidarOrador('${esc(c.id)}','${s.id}','${esc(o.id)}')">💬 Convite</button>
              <button class="m-btn mini" onclick="editarOrador('${esc(c.id)}','${s.id}','${esc(o.id)}')">✏️</button>
            </div>
          </div>`;
        }).join('') : '<div class="m-meta">Nenhum orador ainda.</div>'}</div>
        <div class="m-linha" style="margin-top:10px">
          <span class="m-meta">Tempo previsto dos discursos: ${minutos} min</span>
          <span class="m-acoes">
            <button class="m-btn mini" onclick="editarSessao('${esc(c.id)}','${s.id}')">⚙️ Sessão</button>
            <button class="m-btn mini primario" onclick="editarOrador('${esc(c.id)}','${s.id}')">＋ Orador</button>
          </span>
        </div>` : `<div class="m-acoes" style="margin-top:8px"><button class="m-btn mini" onclick="editarSessao('${esc(c.id)}','${s.id}')">⚙️ Sessão</button></div>`}
      ${s.obs ? `<div class="m-meta" style="margin-top:6px">Obs.: ${esc(s.obs)}</div>` : ''}
    </div>
  </details>`;
}

// Apoios que vêm automaticamente do módulo de chamados (se carregado).
function apoiosAutomaticos(c) {
  return typeof apoiosPendentesParaConferencia === 'function' ? apoiosPendentesParaConferencia(c) : [];
}

function renderApoiosConf(c) {
  const auto = apoiosAutomaticos(c);
  const manuais = c.apoios || [];
  const linha = (a, manual) => `<div class="m-orador">
    <div class="m-orador-info"><strong>${esc(a.nome)}</strong> <span class="m-pill ${a.acao === 'desobrigacao' ? 'neutro' : 'info'}">${esc(ACOES_APOIO[a.acao] || a.acao)}</span>
      <div class="m-meta">${esc(a.cargo || '')}${manual ? '' : ' · vindo de Chamados'}</div></div>
    ${manual ? `<div class="m-orador-acoes"><button class="m-btn mini perigo" onclick="removerApoioConf('${esc(c.id)}','${esc(a.id)}')">🗑</button></div>` : ''}
  </div>`;
  return `
    <label class="m-check" style="border:none"><input type="checkbox" ${c.apoioAnual ? 'checked' : ''} onchange="alterarConf('${esc(c.id)}', { apoioAnual: this.checked })">
      <span class="m-check-txt">Nesta conferência haverá o apoio anual dos líderes gerais, da área e da estaca (Formulário de apoio da liderança, geralmente na primeira conferência do ano) <span class="m-ref">29.3.1</span></span></label>
    <div class="m-alerta info">Apresente primeiro as desobrigações e depois os apoios. Pessoas apresentadas para apoio devem ficar em pé. <span class="m-ref">30.3 · 30.6</span></div>
    ${auto.map(a => linha(a, false)).join('')}
    ${manuais.map(a => linha(a, true)).join('')}
    ${!auto.length && !manuais.length ? '<div class="m-meta">Nenhum apoio ou desobrigação registrado.</div>' : ''}
    <div class="m-acoes" style="margin-top:10px"><button class="m-btn mini primario" onclick="novoApoioConf('${esc(c.id)}')">＋ Apoio / desobrigação</button>
    <button class="m-btn mini" onclick="verRoteiroApoios('${esc(c.id)}')">📜 Roteiro de palavras</button></div>`;
}

function renderLogisticaConf(c) {
  return (c.logistica || []).map(l => `<div class="m-check ${l.feito ? 'feito' : ''}">
      <input type="checkbox" ${l.feito ? 'checked' : ''} onchange="alterarLogistica('${esc(c.id)}','${esc(l.id)}',{feito:this.checked})">
      <span class="m-check-txt">${esc(l.tarefa)}<br><input class="m-input-inline" value="${esc(l.responsavel)}" placeholder="Responsável (quórum, organização, família…)" onchange="alterarLogistica('${esc(c.id)}','${esc(l.id)}',{responsavel:this.value})"></span>
      <button class="m-btn mini perigo" onclick="removerLogistica('${esc(c.id)}','${esc(l.id)}')">🗑</button>
    </div>`).join('') +
    `<div class="m-acoes" style="margin-top:10px"><button class="m-btn mini primario" onclick="novaLogistica('${esc(c.id)}')">＋ Tarefa</button></div>`;
}

// ── ações ────────────────────────────────────

async function alterarConf(id, parcial) {
  try { await conferencias.alterar(id, parcial); } catch { /* toast já exibido */ }
}
async function alterarSessoes(c, fn) {
  const sessoes = structuredClone(c.sessoes || []);
  fn(sessoes);
  await alterarConf(c.id, { sessoes });
}
function marcarRoteiro(id, item, valor) {
  const c = conferencias.obter(id);
  if (item === 'aprovacao') return alterarConf(id, { programaAprovado: valor });
  alterarConf(id, { checklist: { ...(c.checklist || {}), [item]: valor } });
}
async function excluirConf(id) {
  if (!confirm('Excluir esta conferência e todo o planejamento?')) return;
  await conferencias.remover(id);
  confAbertaId = null;
  showToast('Conferência excluída');
}

// conferência (criar/editar)
function novaConferencia() { editarConf(null); }
function editarConf(id) {
  const c = id ? conferencias.obter(id) : null;
  const f = document.getElementById('conf-form');
  preencherCampos(f, c || { presidida: 'presidente', autoridadeCargo: 'Setenta de Área', apoioAnual: true });
  f.dataset.id = id || '';
  document.getElementById('conf-modal-titulo').textContent = id ? 'Editar conferência' : 'Nova conferência de estaca';
  atualizarCamposAutoridade();
  abrirModal('conf-modal');
}
function atualizarCamposAutoridade() {
  const f = document.getElementById('conf-form');
  f.querySelector('.so-autoridade').hidden = f.presidida.value !== 'autoridade';
}
async function salvarConf(ev) {
  ev.preventDefault();
  const f = ev.target;
  const dados = lerCampos(f);
  if (!dados.dataDomingo) return alert('Informe a data do domingo.');
  if (new Date(dados.dataDomingo + 'T12:00:00').getDay() !== 0 && !confirm('A data informada não é um domingo. Continuar mesmo assim?')) return;
  if (!dados.titulo) {
    const sem = Number(dados.dataDomingo.slice(5, 7)) <= 6 ? '1º' : '2º';
    dados.titulo = `Conferência de Estaca — ${sem} semestre de ${dados.dataDomingo.slice(0, 4)}`;
  }
  try {
    if (f.dataset.id) {
      await conferencias.alterar(f.dataset.id, dados);
    } else {
      const nova = await conferencias.salvar({ ...novaConferenciaPadrao(dados.dataDomingo, dados.presidida), ...dados });
      confAbertaId = nova.id;
    }
    fecharModal('conf-modal');
    renderConferencias();
    showToast('✓ Conferência salva');
  } catch (e) { /* toast exibido */ }
}

// sessão
function editarSessao(confId, sessaoId) {
  const c = conferencias.obter(confId);
  const s = c.sessoes.find(x => x.id === sessaoId);
  const f = document.getElementById('sessao-form');
  preencherCampos(f, s);
  f.dataset.conf = confId; f.dataset.sessao = sessaoId;
  document.getElementById('sessao-modal-titulo').textContent = SESSOES_CONF[s.tipo]?.titulo || 'Sessão';
  f.querySelector('.so-musica').hidden = !SESSOES_CONF[s.tipo]?.oradores;
  abrirModal('sessao-modal');
}
async function salvarSessao(ev) {
  ev.preventDefault();
  const f = ev.target;
  const c = conferencias.obter(f.dataset.conf);
  const dados = lerCampos(f);
  await alterarSessoes(c, ss => { const s = ss.find(x => x.id === f.dataset.sessao); Object.assign(s, dados); });
  fecharModal('sessao-modal');
}

// oradores
function sugestoesNomes() {
  const nomes = new Set();
  conferencias.itens.forEach(c => (c.sessoes || []).forEach(s => (s.oradores || []).forEach(o => o.nome && nomes.add(o.nome))));
  if (typeof lideres !== 'undefined') lideres.itens.forEach(l => l.nome && nomes.add(l.nome));
  (typeof MEMBROS_ESTACA !== 'undefined' ? MEMBROS_ESTACA : []).forEach(m => nomes.add(m.name));
  return [...nomes];
}
function preencherDatalistNomes(id) {
  const dl = document.getElementById(id);
  if (!dl || dl.dataset.qtd == sugestoesNomes().length) return;
  const frag = document.createDocumentFragment();
  sugestoesNomes().forEach(n => { const o = document.createElement('option'); o.value = n; frag.append(o); });
  dl.replaceChildren(frag);
  dl.dataset.qtd = sugestoesNomes().length;
}
function editarOrador(confId, sessaoId, oradorId) {
  const c = conferencias.obter(confId);
  const s = c.sessoes.find(x => x.id === sessaoId);
  const o = oradorId ? s.oradores.find(x => x.id === oradorId) : null;
  const f = document.getElementById('orador-form');
  f.ala.innerHTML = opcoesAlas(o?.ala || '');
  f.sessao.innerHTML = sessoesAtivas(c).filter(x => SESSOES_CONF[x.tipo]?.oradores)
    .map(x => `<option value="${x.id}">${esc(SESSOES_CONF[x.tipo].titulo)}</option>`).join('');
  preencherCampos(f, o || { status: 'a_convidar', minutos: '10', origem: 'estaca', tema: c.tema || '' });
  f.sessao.value = sessaoId;
  f.dataset.conf = confId; f.dataset.sessao = sessaoId; f.dataset.orador = oradorId || '';
  f.querySelector('.btn-remover').hidden = !oradorId;
  document.getElementById('orador-modal-titulo').textContent = oradorId ? 'Editar orador' : 'Novo orador';
  preencherDatalistNomes('dl-nomes-conf');
  abrirModal('orador-modal');
}
async function salvarOrador(ev) {
  ev.preventDefault();
  const f = ev.target;
  const c = conferencias.obter(f.dataset.conf);
  const dados = lerCampos(f);
  const destino = dados.sessao; delete dados.sessao;
  if (!dados.nome) return alert('Informe o nome.');
  await alterarSessoes(c, ss => {
    const origem = ss.find(x => x.id === f.dataset.sessao);
    let o = f.dataset.orador ? origem.oradores.find(x => x.id === f.dataset.orador) : null;
    if (o) {
      Object.assign(o, dados);
      if (destino !== origem.id) {
        origem.oradores = origem.oradores.filter(x => x.id !== o.id);
        ss.find(x => x.id === destino).oradores.push(o);
      }
    } else {
      ss.find(x => x.id === destino).oradores.push({ id: 'o' + Date.now().toString(36), ...dados });
    }
  });
  fecharModal('orador-modal');
}
async function removerOradorAtual() {
  const f = document.getElementById('orador-form');
  if (!confirm('Remover este orador?')) return;
  const c = conferencias.obter(f.dataset.conf);
  await alterarSessoes(c, ss => { const s = ss.find(x => x.id === f.dataset.sessao); s.oradores = s.oradores.filter(x => x.id !== f.dataset.orador); });
  fecharModal('orador-modal');
}
async function moverOrador(confId, sessaoId, oradorId, delta) {
  const c = conferencias.obter(confId);
  await alterarSessoes(c, ss => {
    const s = ss.find(x => x.id === sessaoId);
    const i = s.oradores.findIndex(x => x.id === oradorId);
    const j = i + delta;
    if (j < 0 || j >= s.oradores.length) return;
    [s.oradores[i], s.oradores[j]] = [s.oradores[j], s.oradores[i]];
  });
}

function textoConvite(c, s, o) {
  const def = SESSOES_CONF[s.tipo];
  const data = def.dia === 'domingo' ? c.dataDomingo : dataSabado(c);
  const tratamento = o.nome.split(/[ ,]/)[0];
  return `Olá, ${tratamento}! A presidência da estaca gostaria de convidá-lo(a) para discursar na ${def.titulo.toLowerCase()} da conferência de estaca, ` +
    `${fmtDataBR(data, { weekday: 'long', day: 'numeric', month: 'long' })}, às ${s.hora || '--:--'}${s.local || c.local ? ', em ' + (s.local || c.local) : ''}.` +
    `${o.tema ? `\n\nTema: ${o.tema}` : ''}${o.minutos ? `\nTempo: ${o.minutos} minutos` : ''}` +
    `${s.tipo === 'geral' ? '\n\nNa sessão geral não usamos auxílios visuais ou audiovisuais.' : ''}` +
    `\n\nPode nos confirmar? Obrigado!`;
}
async function convidarOrador(confId, sessaoId, oradorId) {
  const c = conferencias.obter(confId);
  const s = c.sessoes.find(x => x.id === sessaoId);
  const o = s.oradores.find(x => x.id === oradorId);
  window.open(linkWhatsApp(textoConvite(c, s, o), o.telefone), '_blank', 'noopener');
  if (o.status === 'a_convidar') {
    await alterarSessoes(c, ss => { ss.find(x => x.id === sessaoId).oradores.find(x => x.id === oradorId).status = 'convidado'; });
  }
}

// apoios
function novoApoioConf(confId) {
  const f = document.getElementById('apoio-form');
  f.reset(); f.dataset.conf = confId;
  preencherDatalistNomes('dl-nomes-conf');
  abrirModal('apoio-modal');
}
async function salvarApoioConf(ev) {
  ev.preventDefault();
  const f = ev.target;
  const c = conferencias.obter(f.dataset.conf);
  const dados = lerCampos(f);
  if (!dados.nome) return;
  await alterarConf(c.id, { apoios: [...(c.apoios || []), { id: 'a' + Date.now().toString(36), ...dados }] });
  fecharModal('apoio-modal');
}
async function removerApoioConf(confId, apoioId) {
  const c = conferencias.obter(confId);
  await alterarConf(confId, { apoios: (c.apoios || []).filter(a => a.id !== apoioId) });
}
function verRoteiroApoios(confId) {
  const c = conferencias.obter(confId);
  const todos = [...apoiosAutomaticos(c), ...(c.apoios || [])];
  const desob = todos.filter(a => a.acao === 'desobrigacao');
  const outros = todos.filter(a => a.acao !== 'desobrigacao');
  const linhas = [];
  desob.forEach(a => linhas.push(`“${a.nome} está sendo desobrigado(a) como ${a.cargo || '[cargo]'}. Os que desejarem manifestar agradecimento por seus serviços prestados podem fazê-lo levantando a mão.”`));
  outros.forEach(a => {
    if (a.acao === 'ordenacao-elder' || a.acao === 'ordenacao-sumo') {
      const proposta = a.acao === 'ordenacao-elder'
        ? `É proposto que ${a.nome} receba o Sacerdócio de Melquisedeque e seja ordenado élder.`
        : `É proposto que ${a.nome} seja ordenado sumo sacerdote.`;
      linhas.push(`“${proposta} Os que forem a favor, manifestem-se levantando a mão. [Pequena pausa.] Os que se opuserem, se houver, manifestem-se. [Pequena pausa.]”`);
    } else {
      linhas.push(`“${a.nome} foi chamado(a) para servir como ${a.cargo || '[cargo]'}. Os que forem a favor, manifestem-se levantando a mão. [Pequena pausa.] Os que se opuserem, se houver, manifestem-se. [Pequena pausa.]”`);
    }
  });
  const html = `<h1>Apoios e desobrigações</h1><p class="sub">${esc(c.titulo || '')} · ${fmtDataBR(c.dataDomingo)}</p>
    <p class="nota">Palavras sugeridas no Manual Geral (30.3, 30.6 e 18.10.3). Primeiro as desobrigações, depois os apoios. Quem é apresentado para apoio fica em pé e também vota. Irmãos a serem ordenados élderes ou sumos sacerdotes são apresentados por um membro da presidência da estaca na sessão geral. Se alguém se opuser, um líder conversa com a pessoa em particular depois da reunião.</p>
    ${c.apoioAnual ? '<p class="nota"><strong>Apoio anual:</strong> usar o Formulário de apoio da liderança preparado pelo secretário da estaca.</p>' : ''}
    <ol>${linhas.map(l => `<li>${esc(l)}</li>`).join('') || '<li>Nenhum item.</li>'}</ol>`;
  abrirImpressao('Apoios e desobrigações', html);
}

// logística
async function alterarLogistica(confId, id, parcial) {
  const c = conferencias.obter(confId);
  await alterarConf(confId, { logistica: (c.logistica || []).map(l => l.id === id ? { ...l, ...parcial } : l) });
}
async function novaLogistica(confId) {
  const tarefa = prompt('Tarefa:');
  if (!tarefa) return;
  const c = conferencias.obter(confId);
  await alterarConf(confId, { logistica: [...(c.logistica || []), { id: 'l' + Date.now().toString(36), tarefa, responsavel: '', feito: false }] });
}
async function removerLogistica(confId, id) {
  const c = conferencias.obter(confId);
  await alterarConf(confId, { logistica: (c.logistica || []).filter(l => l.id !== id) });
}

// ── impressão ────────────────────────────────

function abrirImpressao(titulo, corpoHtml) {
  const w = window.open('', '_blank');
  if (!w) return alert('Permita janelas pop-up para imprimir.');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:Georgia,'Times New Roman',serif;color:#111;max-width:720px;margin:24px auto;padding:0 18px;line-height:1.5}
    h1{font-size:22px;text-align:center;margin:0 0 2px} h2{font-size:17px;border-bottom:1px solid #999;padding-bottom:3px;margin:26px 0 8px}
    .sub{text-align:center;color:#444;margin:0 0 18px;font-size:14px} .igreja{text-align:center;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#555}
    table{width:100%;border-collapse:collapse;font-size:14px} td{padding:4px 0;vertical-align:top} td:first-child{width:42%;color:#444}
    .nota{font-size:12.5px;color:#444;background:#f3f3f3;padding:8px 10px;border-radius:4px}
    ol li{margin-bottom:10px} .quebra{page-break-before:always}
    .acoes{text-align:center;margin:20px 0} .acoes button{font-size:15px;padding:8px 18px}
    @media print{.acoes{display:none} body{margin:0}}
  </style></head><body>${corpoHtml}<div class="acoes"><button onclick="print()">Imprimir</button></div></body></html>`);
  w.document.close();
}

function imprimirProgramaConf(id) {
  const c = conferencias.obter(id);
  const preside = c.presidida === 'autoridade' ? `${c.autoridadeNome || ''} (${c.autoridadeCargo || ''})` : nomePresidente();
  const blocos = sessoesAtivas(c).filter(s => SESSOES_CONF[s.tipo]?.oradores && (s.oradores || []).length).map((s, idx) => {
    const def = SESSOES_CONF[s.tipo];
    const data = def.dia === 'domingo' ? c.dataDomingo : dataSabado(c);
    const ors = (s.oradores || []).filter(o => o.status !== 'recusou');
    const meio = Math.ceil(ors.length / 2);
    const linhas = [['Preside', preside], ['Dirige', s.dirige], ['Regente', s.regente], ['Organista', s.organista],
      ['Hino de abertura', s.hinoAbertura], ['Oração', s.oracaoAbertura]];
    if (s.tipo === 'geral') linhas.push(['Apoios e assuntos da estaca', '']);
    ors.forEach((o, i) => {
      linhas.push([o.chamado || 'Orador', o.nome]);
      if (i === meio - 1 && ors.length > 1) {
        if (s.hinoIntermediario) linhas.push(['Hino', s.hinoIntermediario]);
        if (s.musicaEspecial) linhas.push(['Número musical', s.musicaEspecial]);
      }
    });
    linhas.push(['Hino de encerramento', s.hinoEncerramento], ['Oração', s.oracaoEncerramento]);
    return `<div class="${idx ? 'quebra' : ''}">
      <div class="igreja">A Igreja de Jesus Cristo dos Santos dos Últimos Dias</div>
      <h1>${esc(c.titulo || 'Conferência de Estaca')}</h1>
      <p class="sub">${esc(def.titulo)} · ${fmtDataLonga(data)} · ${esc(s.hora || '')}${s.local || c.local ? ' · ' + esc(s.local || c.local) : ''}</p>
      ${c.tema ? `<p class="sub"><em>${esc(c.tema)}</em></p>` : ''}
      <table>${linhas.filter(([k, v]) => v || /^Apoios/.test(k)).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v || '')}</td></tr>`).join('')}</table>
    </div>`;
  }).join('');
  abrirImpressao('Programa — ' + (c.titulo || 'Conferência'), blocos || '<p>Adicione oradores às sessões para gerar o programa.</p>');
}

// ── registro da aba ──────────────────────────
registrarAba('conf', {
  emoji: '🏛️', nome: 'Conferência',
  carregar: () => conferencias.carregar(),
  fab: { texto: '＋ Nova Conferência', acao: () => novaConferencia() },
});

registrarBusca(q => conferencias.itens.flatMap(c => {
  const r = [];
  if ([c.titulo, c.tema, c.autoridadeNome].join(' ').toLowerCase().includes(q)) r.push({ tag: '🏛️ Conferência', texto: `${c.titulo || 'Conferência'} — ${fmtDataBR(c.dataDomingo)}`, aba: 'conf' });
  (c.sessoes || []).forEach(s => (s.oradores || []).forEach(o => {
    if ([o.nome, o.tema, o.chamado].join(' ').toLowerCase().includes(q)) r.push({ tag: `🏛️ Orador · ${SESSOES_CONF[s.tipo]?.titulo || ''}`, texto: `${o.nome}${o.tema ? ' — ' + o.tema : ''}`, aba: 'conf' });
  }));
  return r;
}));
