// =============================================
// ESCALA DE DISCURSOS NAS ALAS — Manual Geral 6.5.1 e 6.7.1
// =============================================
// A presidência pode designar sumos conselheiros e membros das presidências
// das organizações da estaca para discursar nas reuniões sacramentais.
// A frequência é definida pela presidência; não precisa ser todo mês.

const discursos = new Colecao('/api/discursos', () => renderDiscursos());
let mesDiscursos = hojeISO().slice(0, 7); // AAAA-MM

const FREQ_DISCURSOS = {
  mensal: { rotulo: 'Todo mês', meses: 1 },
  bimestral: { rotulo: 'A cada 2 meses', meses: 2 },
  trimestral: { rotulo: 'A cada 3 meses', meses: 3 },
  livre: { rotulo: 'Sem frequência fixa', meses: 0 },
};
const STATUS_DISCURSO = {
  designado: { rotulo: 'Designado', classe: 'alerta' },
  confirmado: { rotulo: 'Confirmado', classe: 'info' },
  realizado: { rotulo: 'Realizado', classe: 'ok' },
};

function freqDiscursos() { return (typeof CONFIG_APP !== 'undefined' && CONFIG_APP.escalaDiscursos?.frequencia) || 'mensal'; }
function domingosDoMes(aaaamm) {
  const [a, m] = aaaamm.split('-').map(Number);
  const d = new Date(a, m - 1, 1, 12);
  const res = [];
  while (d.getMonth() === m - 1) { if (d.getDay() === 0) res.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return res;
}
function deslocarMes(aaaamm, delta) {
  const [a, m] = aaaamm.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1, 12);
  return d.toISOString().slice(0, 7);
}
/** Alas sem orador designado dentro da janela da frequência que termina no mês dado. */
function alasSemOrador(aaaamm) {
  const meses = FREQ_DISCURSOS[freqDiscursos()]?.meses || 0;
  if (!meses) return [];
  const inicio = deslocarMes(aaaamm, -(meses - 1));
  return alasDaEstaca().filter(ala => !discursos.itens.some(d => d.ala === ala && d.data && d.data.slice(0, 7) >= inicio && d.data.slice(0, 7) <= aaaamm));
}

function renderDiscursos() {
  const box = document.getElementById('disc-lista');
  if (!box) return;
  const [a, m] = mesDiscursos.split('-').map(Number);
  document.getElementById('disc-mes').textContent = new Date(a, m - 1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const sel = document.getElementById('disc-freq');
  if (sel && sel.value !== freqDiscursos()) sel.value = freqDiscursos();
  const doMes = discursos.itens.filter(d => (d.data || '').startsWith(mesDiscursos));
  const faltando = alasSemOrador(mesDiscursos);
  const dom = domingosDoMes(mesDiscursos);
  box.innerHTML = `
    ${faltando.length ? `<div class="m-alerta aviso">Sem orador designado no período (${esc(FREQ_DISCURSOS[freqDiscursos()].rotulo.toLowerCase())}): ${faltando.map(esc).join(', ')}</div>` : (FREQ_DISCURSOS[freqDiscursos()].meses ? '<div class="m-alerta ok">Todas as alas têm orador no período.</div>' : '')}
    <div class="m-grade">${alasDaEstaca().map(ala => {
      const ds = doMes.filter(d => d.ala === ala).sort((x, y) => x.data.localeCompare(y.data));
      return `<div class="m-card" style="--acc:${ds.length ? 'var(--green)' : faltando.includes(ala) ? 'var(--amber)' : 'var(--m-borda)'}">
        <div class="m-linha"><h3>${esc(ala)}</h3><button class="m-btn mini" onclick="novoDiscurso('${esc(ala)}')">＋</button></div>
        ${ds.length ? ds.map(d => {
          const st = STATUS_DISCURSO[d.status] || STATUS_DISCURSO.designado;
          return `<div class="m-orador">
            <div class="m-orador-info"><strong>${esc(d.orador)}</strong> <span class="m-pill ${st.classe}">${st.rotulo}</span>
              <div class="m-meta">${fmtDataBR(d.data, { weekday: 'short', day: '2-digit', month: '2-digit' })}${d.chamado ? ' · ' + esc(d.chamado) : ''}${d.tema ? ' · ' + esc(d.tema) : ''}</div></div>
            <div class="m-orador-acoes">
              <button class="m-btn mini" title="Lembrete por WhatsApp" onclick="lembrarDiscurso('${esc(d.id)}')">💬</button>
              <button class="m-btn mini" onclick="editarDiscurso('${esc(d.id)}')">✏️</button>
            </div></div>`;
        }).join('') : '<div class="m-meta">Ninguém designado neste mês.</div>'}
      </div>`;
    }).join('')}</div>
    <p class="m-meta" style="margin-top:10px">Domingos do mês: ${dom.map(d => fmtDataBR(d, { day: '2-digit' })).join(', ')}</p>`;
}

function mudarMesDiscursos(delta) { mesDiscursos = deslocarMes(mesDiscursos, delta); renderDiscursos(); }
async function mudarFreqDiscursos(valor) {
  try { await salvarConfig({ escalaDiscursos: { ...(CONFIG_APP.escalaDiscursos || {}), frequencia: valor } }); renderDiscursos(); showToast('✓ Frequência salva para todos'); }
  catch (e) { showToast('⚠ ' + e.message); }
}

function sugestoesOradoresEstaca() {
  const nomes = new Set();
  (typeof allScMembers !== 'undefined' ? allScMembers : []).forEach(s => s.nome && s.status !== 'vago' && nomes.add(s.nome));
  (typeof lideres !== 'undefined' ? lideres.itens : []).filter(l => l.ativo !== false && !l.ala).forEach(l => nomes.add(l.nome));
  discursos.itens.forEach(d => d.orador && nomes.add(d.orador));
  return [...nomes].sort();
}
function chamadoSugerido(nome) {
  const sc = (typeof allScMembers !== 'undefined' ? allScMembers : []).find(s => s.nome === nome);
  if (sc) return 'Sumo Conselheiro';
  const l = (typeof lideres !== 'undefined' ? lideres.itens : []).find(x => x.nome === nome && x.ativo !== false);
  return l?.cargo || '';
}

function novoDiscurso(ala) { editarDiscurso(null, ala); }
function editarDiscurso(id, ala) {
  const d = id ? discursos.obter(id) : null;
  const f = document.getElementById('disc-form');
  f.ala.innerHTML = opcoesAlas(d?.ala || ala || '');
  document.getElementById('dl-oradores-estaca').innerHTML = sugestoesOradoresEstaca().map(n => `<option value="${esc(n)}">`).join('');
  const dom = domingosDoMes(mesDiscursos).find(x => diasAte(x) >= 0) || domingosDoMes(mesDiscursos)[0];
  preencherCampos(f, d || { ala: ala || '', data: dom, status: 'designado' });
  f.dataset.id = id || '';
  f.querySelector('.btn-remover').hidden = !id;
  abrirModal('disc-modal');
}
function aoEscolherOradorDiscurso(input) {
  const f = input.form;
  if (!f.chamado.value) f.chamado.value = chamadoSugerido(input.value);
}
async function salvarDiscurso(ev) {
  ev.preventDefault();
  const f = ev.target;
  const dados = lerCampos(f);
  if (!dados.orador || !dados.ala || !dados.data) return alert('Informe orador, ala e data.');
  if (new Date(dados.data + 'T12:00:00').getDay() !== 0 && !confirm('A data não é um domingo. Continuar?')) return;
  try {
    if (f.dataset.id) await discursos.alterar(f.dataset.id, dados);
    else await discursos.salvar(dados);
    mesDiscursos = dados.data.slice(0, 7);
    fecharModal('disc-modal');
  } catch { /* toast exibido */ }
}
async function removerDiscursoAtual() {
  const f = document.getElementById('disc-form');
  if (!confirm('Remover esta designação?')) return;
  await discursos.remover(f.dataset.id);
  fecharModal('disc-modal');
}
function lembrarDiscurso(id) {
  const d = discursos.obter(id);
  const txt = `Olá, ${d.orador.split(/[ ,]/)[0]}! Lembrete da presidência da estaca: você está designado(a) para discursar na reunião sacramental da ${d.ala} ` +
    `em ${fmtDataBR(d.data, { weekday: 'long', day: 'numeric', month: 'long' })}.${d.tema ? `\nTema: ${d.tema}` : ''}\n\nPor favor, avise o bispado da ala e confirme conosco. Obrigado!`;
  window.open(linkWhatsApp(txt, d.telefone), '_blank', 'noopener');
}

registrarAba('disc', {
  emoji: '🎤', nome: 'Discursos',
  carregar: () => discursos.carregar(),
  fab: { texto: '＋ Designar Orador', acao: () => novoDiscurso('') },
});
document.addEventListener('config:carregada', () => renderDiscursos());
Auth.pronto.then(() => discursos.carregar());

registrarBusca(q => discursos.itens.filter(d => [d.orador, d.ala, d.tema].join(' ').toLowerCase().includes(q))
  .map(d => ({ tag: '🎤 Discurso', texto: `${d.orador} — ${d.ala} (${fmtDataBR(d.data)})`, aba: 'disc', cor: '#ffcc80' })));
