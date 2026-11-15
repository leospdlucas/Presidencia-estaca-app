// =============================================
// TIPOS DE REUNIÃO DA ESTACA — Manual Geral 29.3 e 29.4
// =============================================
// Frequência recomendada, participantes e modelo de pauta de cada reunião.
// Usado no formulário de ata e no painel de acompanhamento.

const TIPOS_REUNIAO = {
  'Reunião de Presidência da Estaca': {
    freq: 'Com regularidade (em geral uma vez por semana)', dias: 10, ref: '29.3.5',
    participantes: 'Presidência da estaca, secretário e secretário executivo.',
    pauta: ['Trabalho de salvação e exaltação na estaca', 'Fortalecimento de membros e famílias', 'Necessidades das alas, quóruns de élderes e organizações',
      'Recomendações dos bispos para ordenação a élder', 'Chamados na estaca e em algumas alas (30.8)', 'Recomendações de membros para servir missão',
      'Instruções das escrituras, dos líderes e do Manual', 'Atividades, orçamento, relatório de designações e próximas reuniões'],
  },
  'Reunião do Sumo Conselho': {
    freq: 'Duas vezes por mês, se possível', dias: 20, ref: '29.3.6',
    participantes: 'Presidência da estaca, sumo conselho, secretário e secretário executivo.',
    pauta: ['Instruções da presidência sobre doutrina e designações', 'Fortalecimento de membros e famílias', 'Trabalho de salvação e exaltação na estaca',
      'Prestação de contas das designações', 'Apoio às decisões de ordenação a élder e sumo sacerdote', 'Apoio às decisões de chamados',
      'Planejamento da reunião de liderança do sacerdócio', 'Relatos de ex-missionários recém-chegados'],
  },
  'Reunião do Conselho da Estaca': {
    freq: 'Mensalmente, se possível', dias: 35, ref: '29.3.7',
    participantes: 'Presidência, sumo conselho, secretários, presidentes da SS, Moças e Primária, líderes de JAS/AS (se chamados).',
    pauta: ['Instruções da presidência sobre doutrina e designações', 'Fortalecimento de membros e famílias', 'Visão geral do trabalho de salvação e exaltação',
      'Necessidades materiais e autossuficiência (recursos da comunidade, BYU-Pathway)', 'Plano de emergência da estaca', 'Serviço na comunidade (JustServe)',
      'Relatórios das organizações, atividades e programas'],
  },
  'Reunião do Conselho dos Bispos da Estaca': {
    freq: 'Pelo menos trimestralmente', dias: 95, ref: '29.3.10',
    participantes: 'Presidente da estaca, bispos e um secretário da estaca (registra decisões e designações).',
    pauta: ['Ajudar os jovens a progredir espiritualmente', 'Ofertas de jejum e autossuficiência', 'Arrependimento e mudança de coração (cap. 32)', 'Administração das finanças (cap. 34)'],
    nota: 'Não substitui as entrevistas regulares do presidente da estaca com cada bispo.',
  },
  'Reunião de Liderança do Sacerdócio da Estaca': {
    freq: 'Uma por ano na conferência; outra opcional', dias: 400, ref: '29.3.3',
    participantes: 'Presidência, sumo conselho, secretários, presidência dos Rapazes, bispados, presidências de quórum de élderes, consultores do SA.',
    pauta: ['Instrução geral', 'Instruções por chamado (grupos menores)'],
  },
  'Reunião Geral do Sacerdócio da Estaca': {
    freq: 'Uma vez por ano', dias: 380, ref: '29.3.2',
    participantes: 'Todos os portadores do sacerdócio da estaca.',
    pauta: ['Mensagens selecionadas pela presidência da estaca'],
  },
  'Reunião do Comitê de Liderança de Adultos da Estaca': {
    freq: 'Quando necessário', ref: '29.3.8',
    participantes: 'Presidência, presidência da SS da estaca e sumos conselheiros designados aos quóruns de élderes.',
    pauta: ['Ministração', 'Compartilhar o evangelho e membros novos/retornando', 'Templo e história da família', 'Bem-estar e autossuficiência (JustServe, BYU-Pathway)'],
  },
  'Reunião do Comitê de Liderança dos Jovens da Estaca': {
    freq: 'Quando necessário', ref: '29.3.9',
    participantes: 'Um membro da presidência, presidências dos Rapazes e das Moças da estaca e jovens de cada ala.',
    pauta: ['Fortalecimento dos jovens', 'Projetos de serviço e atividades (liderados pelos jovens)', 'Apoio às conferências FSY', 'Programa Crianças e Jovens'],
  },
  'Reunião do Conselho de Coordenação': {
    freq: 'Trimestralmente', dias: 100, ref: '29.4',
    participantes: 'Setenta de área (preside), presidentes de estaca, missão e templo.',
    pauta: ['Itens enviados pelos presidentes', 'Coordenação do trabalho de salvação e exaltação', 'Assuntos multiestacas'],
  },
};

function infoTipoReuniao(titulo) { return TIPOS_REUNIAO[titulo] || null; }

/** Última ata registrada de cada tipo com frequência definida. */
function situacaoReunioes() {
  const atas = typeof allReunioes !== 'undefined' ? allReunioes : [];
  return Object.entries(TIPOS_REUNIAO).filter(([, t]) => t.dias).map(([titulo, t]) => {
    const ultima = atas.filter(a => a.titulo === titulo && a.data).map(a => a.data).sort().pop() || null;
    const dias = ultima ? -diasAte(ultima) : null;
    return { titulo, ...t, ultima, diasDesde: dias, atrasada: dias === null || dias > t.dias };
  });
}

// ── integração com o formulário de ata ──
function mostrarInfoTipoReuniao() {
  const sel = document.getElementById('af-titulo');
  const box = document.getElementById('af-tipo-info');
  if (!sel || !box) return;
  const t = infoTipoReuniao(sel.value);
  if (!t) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<strong>${esc(t.freq)}</strong> · ${esc(t.participantes)}${t.nota ? '<br>' + esc(t.nota) : ''} <span class="m-ref">${t.ref}</span>
    <br><button type="button" class="m-btn mini" style="margin-top:6px" onclick="aplicarPautaModelo()">📋 Usar pauta sugerida</button>`;
}
function aplicarPautaModelo() {
  const t = infoTipoReuniao(document.getElementById('af-titulo').value);
  if (!t) return;
  const cont = document.getElementById('af-assuntos');
  const temConteudo = [...cont.querySelectorAll('input,textarea')].some(el => el.value.trim());
  if (temConteudo && !confirm('Acrescentar os itens sugeridos aos assuntos já preenchidos?')) return;
  if (!temConteudo) { cont.innerHTML = ''; assuntoCount = 0; }
  t.pauta.forEach(titulo => addAssunto({ titulo, responsavel: '', texto: '' }));
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('af-titulo');
  if (!sel) return;
  // Reunião geral do sacerdócio (29.3.2) não existia na lista
  if (![...sel.options].some(o => o.value === 'Reunião Geral do Sacerdócio da Estaca')) {
    const ref = [...sel.options].find(o => o.value === 'Reunião de Liderança do Sacerdócio da Estaca');
    const op = new Option('Reunião Geral do Sacerdócio da Estaca');
    ref ? ref.after(op) : sel.add(op);
  }
  const info = document.createElement('div');
  info.id = 'af-tipo-info';
  info.className = 'm-alerta info';
  info.hidden = true;
  sel.closest('.form-row').after(info);
  sel.addEventListener('change', mostrarInfoTipoReuniao);
});
// Atualiza a dica quando o formulário é aberto
if (typeof openAtaForm === 'function') {
  const _openAtaForm = openAtaForm;
  openAtaForm = function (preload) { _openAtaForm(preload); mostrarInfoTipoReuniao(); };
}
