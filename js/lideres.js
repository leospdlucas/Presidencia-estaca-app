// =============================================
// DIRETÓRIO DE LÍDERES — sem cadastro de membros comuns
// =============================================
// Bispados, presidências e líderes por ala e da estaca. Guarda data do apoio
// (tempo no chamado, 30.5) e do treinamento de proteção de crianças e jovens
// (concluir em até 1 mês após o apoio e repetir a cada 3 anos, 30.2).

const lideres = new Colecao('/api/lideres', () => renderLideres());
let filtroLideres = '';

const CARGOS_LIDER = {
  'Estaca': ['Presidente da Estaca', '1º Conselheiro da Presidência da Estaca', '2º Conselheiro da Presidência da Estaca', 'Secretário Executivo da Estaca', 'Secretário da Estaca',
    'Patriarca', 'Sumo Conselheiro', 'Presidente da Sociedade de Socorro da Estaca', 'Presidente das Moças da Estaca', 'Presidente da Primária da Estaca',
    'Presidente dos Rapazes da Estaca', 'Presidente da Escola Dominical da Estaca', 'Diretor de Comunicação da Estaca'],
  'Ala': ['Bispo', '1º Conselheiro do Bispado', '2º Conselheiro do Bispado', 'Secretário Executivo da Ala', 'Secretário da Ala',
    'Presidente do Quórum de Élderes', 'Presidente da Sociedade de Socorro', 'Presidente das Moças', 'Presidente da Primária',
    'Presidente da Escola Dominical', 'Líder da Missão da Ala', 'Líder de Templo e História da Família'],
};
// Cargos que trabalham com crianças ou jovens (exigem treinamento de proteção)
const CARGOS_COM_JOVENS = /bispo|bispado|moças|primária|rapazes/i;

function precisaProtecao(l) { return CARGOS_COM_JOVENS.test(l.cargo || ''); }
function situacaoProtecao(l) {
  if (!precisaProtecao(l)) return null;
  if (!l.protecaoEm) {
    const prazo = l.dataApoio ? somarMeses(l.dataApoio, 1) : null;
    return { classe: prazo && diasAte(prazo) < 0 ? 'erro' : 'alerta', txt: prazo ? `Proteção pendente (prazo ${fmtDataBR(prazo)})` : 'Proteção pendente' };
  }
  const vence = somarMeses(l.protecaoEm, 36);
  const d = diasAte(vence);
  if (d < 0) return { classe: 'erro', txt: `Proteção vencida em ${fmtDataBR(vence)}` };
  if (d <= 60) return { classe: 'alerta', txt: `Proteção vence em ${fmtDataBR(vence)}` };
  return { classe: 'ok', txt: `Proteção válida até ${fmtDataBR(vence)}` };
}
function anosNoChamado(l) {
  if (!l.dataApoio) return null;
  return Math.floor(-diasAte(l.dataApoio) / 365.25 * 10) / 10;
}

function renderLideres() {
  const box = document.getElementById('lideres-lista');
  if (!box) return;
  const filtro = filtroLideres.toLowerCase();
  const ativos = lideres.itens.filter(l => l.ativo !== false)
    .filter(l => !filtro || [l.nome, l.cargo, l.ala].join(' ').toLowerCase().includes(filtro));
  const grupos = {};
  ativos.forEach(l => { const g = l.ala || 'Estaca'; (grupos[g] ||= []).push(l); });
  const ordemCargo = c => { const t = [...CARGOS_LIDER.Estaca, ...CARGOS_LIDER.Ala]; const i = t.indexOf(c); return i < 0 ? 99 : i; };
  const nomesGrupos = ['Estaca', ...alasDaEstaca(), ...Object.keys(grupos).filter(g => g !== 'Estaca' && !alasDaEstaca().includes(g))];

  const pendProtecao = ativos.filter(l => ['erro', 'alerta'].includes(situacaoProtecao(l)?.classe)).length;
  document.getElementById('lideres-resumo').innerHTML = `
    <div class="m-kpi"><strong>${ativos.length}</strong><span>líderes ativos</span></div>
    <div class="m-kpi"><strong>${pendProtecao}</strong><span>proteção pendente/vencendo</span></div>
    <div class="m-kpi"><strong>${ativos.filter(l => anosNoChamado(l) >= 5).length}</strong><span>5 anos ou mais no chamado</span></div>`;

  if (!lideres.itens.length) {
    box.innerHTML = `<div class="m-vazio">${lideres.carregado ? 'Nenhum líder cadastrado.<br>Use <strong>＋ Novo Líder</strong>. Chamados concluídos na aba Chamados entram aqui sozinhos.' : 'Carregando…'}</div>`;
    return;
  }
  box.innerHTML = nomesGrupos.filter(g => grupos[g]).map(g => `
    <details class="m-secao" ${filtro ? 'open' : ''}>
      <summary>${g === 'Estaca' ? '🏛' : '⛪'} ${esc(g)} <span class="m-pill neutro">${grupos[g].length}</span></summary>
      <div class="m-corpo">${grupos[g].sort((a, b) => ordemCargo(a.cargo) - ordemCargo(b.cargo)).map(l => {
        const prot = situacaoProtecao(l);
        const anos = anosNoChamado(l);
        return `<div class="m-orador">
          <div class="m-orador-info">
            <strong>${esc(l.nome)}</strong>
            <div class="m-meta">${esc(l.cargo)}${l.dataApoio ? ` · apoiado em ${fmtDataBR(l.dataApoio)}${anos !== null ? ` (${String(anos).replace('.', ',')} anos)` : ''}` : ''}</div>
            ${prot ? `<span class="m-pill ${prot.classe}">${esc(prot.txt)}</span>` : ''}
            ${anos >= 5 ? '<span class="m-pill info" title="Manual Geral 30.5: dois a cinco anos geralmente são suficientes">5+ anos · 30.5</span>' : ''}
          </div>
          <div class="m-orador-acoes">
            ${l.telefone ? `<a class="m-btn mini" href="${linkWhatsApp('', l.telefone)}" target="_blank" rel="noopener">💬</a>` : ''}
            <button class="m-btn mini" onclick="editarLider('${esc(l.id)}')">✏️</button>
          </div>
        </div>`;
      }).join('')}</div>
    </details>`).join('') || '<div class="m-vazio">Nenhum resultado.</div>';
}

function novoLider() { editarLider(null); }
function editarLider(id) {
  const l = id ? lideres.obter(id) : null;
  const f = document.getElementById('lider-form');
  f.ala.innerHTML = opcoesAlas(l?.ala || '', 'Estaca');
  document.getElementById('dl-cargos-lider').innerHTML = [...CARGOS_LIDER.Estaca, ...CARGOS_LIDER.Ala].map(c => `<option value="${esc(c)}">`).join('');
  preencherCampos(f, l || {});
  f.dataset.id = id || '';
  f.querySelector('.btn-remover').hidden = !id;
  document.getElementById('lider-modal-titulo').textContent = id ? 'Editar líder' : 'Novo líder';
  preencherDatalistNomes('dl-nomes-conf');
  abrirModal('lider-modal');
}
async function salvarLider(ev) {
  ev.preventDefault();
  const f = ev.target;
  const dados = lerCampos(f);
  if (!dados.nome || !dados.cargo) return alert('Informe nome e cargo.');
  try {
    if (f.dataset.id) await lideres.alterar(f.dataset.id, dados);
    else await lideres.salvar({ ...dados, ativo: true });
    fecharModal('lider-modal');
  } catch { /* toast exibido */ }
}
async function desobrigarLiderAtual() {
  const f = document.getElementById('lider-form');
  if (!confirm('Marcar como desobrigado? O registro sai da lista de ativos.')) return;
  await lideres.alterar(f.dataset.id, { ativo: false, desobrigadoEm: hojeISO() });
  fecharModal('lider-modal');
}

/** Chamado concluído na aba Chamados → atualiza o diretório. */
async function sincronizarLiderComChamado(it) {
  if (!lideres.carregado) await lideres.carregar();
  const cargo = it.tipo === 'chamado' ? nomeCargo(it) : null;
  if (!cargo) return;
  const ala = cargoDe(it)?.nivel === 'ala' ? (it.ala || '') : '';
  const existente = lideres.itens.find(l => l.ativo !== false && l.nome === it.nome && l.cargo === cargo);
  const dataApoio = it.etapas?.apoio || it.etapas?.designacao || hojeISO();
  if (it.tipo === 'chamado' && !existente) await lideres.salvar({ nome: it.nome, cargo, ala, dataApoio, ativo: true, origem: 'chamados' });
}
async function desativarLiderPorDesobrigacao(it) {
  if (!lideres.carregado) await lideres.carregar();
  const cargo = nomeCargo(it);
  const alvo = lideres.itens.find(l => l.ativo !== false && l.nome === it.nome && (l.cargo === cargo || !cargo));
  if (alvo) await lideres.alterar(alvo.id, { ativo: false, desobrigadoEm: hojeISO() });
}

registrarAba('lideres', {
  emoji: '👥', nome: 'Líderes',
  carregar: () => lideres.carregar(),
  fab: { texto: '＋ Novo Líder', acao: () => novoLider() },
});
Auth.pronto.then(() => lideres.carregar());

registrarBusca(q => lideres.itens.filter(l => l.ativo !== false && [l.nome, l.cargo, l.ala].join(' ').toLowerCase().includes(q))
  .map(l => ({ tag: '👥 Líder', texto: `${l.nome} — ${l.cargo}${l.ala ? ' · ' + l.ala : ''}`, aba: 'lideres', cor: '#90caf9' })));
