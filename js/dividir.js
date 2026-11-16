// =============================================
// VAMOS DIVIDIR A ESTACA — Manual Geral, capítulo 36
// =============================================
// Requisitos mínimos oficiais (36.1 e 36.2). Uma divisão cria duas estacas:
// as DUAS precisam atingir o mínimo, e "novas unidades só devem ser criadas
// quando as unidades existentes forem suficientemente fortes" (36.0).
//
// Privacidade: relatórios do LCR são lidos só no navegador. Apenas os TOTAIS
// por ala e período são gravados — nenhum nome, endereço ou linha do arquivo.

const crescimento = new Colecao('/api/crescimento', () => renderDividir());
let vistaDividir = 'geral';
let periodoDados = null;          // período em edição na vista "Dados"
let cenarioAtual = null;          // cenário carregado no simulador
let indicadorGrafico = 'membros';

const REQ_ESTACA = { membros: 2000, sm: 150, adultos: 500, jovens: 100, alas: 5 };
const REQ_ALA = { membros: 250, sm: 20, adultos: 100, jovens: 20 };
const INDICADORES = {
  membros: { rotulo: 'Membros (ativos e menos ativos)', curto: 'Membros', base: true },
  sm: { rotulo: 'Portadores do Sacerdócio de Melquisedeque ativos, dizimistas integrais e capazes de liderar', curto: 'SM dizimistas', base: true },
  adultos: { rotulo: 'Adultos participantes', curto: 'Adultos part.', base: true },
  jovens: { rotulo: 'Jovens participantes (recomendado, não obrigatório)', curto: 'Jovens part.', base: true, recomendado: true },
  frequencia: { rotulo: 'Frequência média na reunião sacramental', curto: 'Frequência' },
  investidos: { rotulo: 'Investidos com recomendação válida', curto: 'Investidos c/ rec.' },
  batismos: { rotulo: 'Batismos de conversos no trimestre', curto: 'Batismos' },
  missionarios: { rotulo: 'Missionários servindo', curto: 'Missionários' },
};
const IND_BASE = Object.keys(INDICADORES).filter(k => INDICADORES[k].base);
const fmtN = n => (n === null || n === undefined || n === '') ? '—' : Number(n).toLocaleString('pt-BR');

// ── períodos ─────────────────────────────────
function periodoDe(iso = hojeISO()) { return `${iso.slice(0, 4)}-T${Math.ceil(Number(iso.slice(5, 7)) / 3)}`; }
function periodoAnterior(p) { const [a, t] = [Number(p.slice(0, 4)), Number(p.slice(6))]; return t === 1 ? `${a - 1}-T4` : `${a}-T${t - 1}`; }
function proximoPeriodo(p) { const [a, t] = [Number(p.slice(0, 4)), Number(p.slice(6))]; return t === 4 ? `${a + 1}-T1` : `${a}-T${t + 1}`; }
function rotuloPeriodo(p) { return `${p.slice(6)}º tri ${p.slice(0, 4)}`; }
function indiceTri(p) { return Number(p.slice(0, 4)) * 4 + Number(p.slice(6)) - 1; }

// ── dados ────────────────────────────────────
const indicadores = () => crescimento.itens.filter(i => i.tipo === 'indicador');
const cenarios = () => crescimento.itens.filter(i => i.tipo === 'cenario');
const metas = () => crescimento.itens.filter(i => i.tipo === 'meta');
function periodosComDados() { return [...new Set(indicadores().map(i => i.periodo))].sort(); }
function idIndicador(ala, periodo) { return 'ind-' + ala.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() + '-' + periodo; }
function dadoDe(ala, periodo) { return indicadores().find(i => i.ala === ala && i.periodo === periodo) || null; }
/** Dado mais recente de cada ala (até o período informado). */
function ultimoDado(ala, ate = '9999-T4') {
  return indicadores().filter(i => i.ala === ala && i.periodo <= ate).sort((a, b) => b.periodo.localeCompare(a.periodo))[0] || null;
}
function somaAlas(alas, ate) {
  const t = { alas: alas.length };
  IND_BASE.forEach(k => { t[k] = alas.reduce((s, a) => s + (Number(ultimoDado(a, ate)?.[k]) || 0), 0); });
  return t;
}
function totaisPorPeriodo(k) {
  return periodosComDados().map(p => ({ periodo: p, valor: alasDaEstaca().reduce((s, a) => s + (Number(dadoDe(a, p)?.[k]) || 0), 0), completo: alasDaEstaca().every(a => dadoDe(a, p)?.[k] !== undefined && dadoDe(a, p)?.[k] !== '') }));
}
/** Crescimento linear por trimestre (mínimos quadrados) — null se houver menos de 2 pontos. */
function tendencia(k) {
  const pts = totaisPorPeriodo(k).filter(x => x.completo);
  if (pts.length < 2) return null;
  const xs = pts.map(p => indiceTri(p.periodo)), ys = pts.map(p => p.valor);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0), den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den ? { porTri: num / den, ultimo: pts[pts.length - 1] } : null;
}
function previsao(k, alvo) {
  const t = tendencia(k);
  if (!t) return { txt: 'Registre pelo menos dois trimestres completos para projetar.', classe: 'neutro' };
  const falta = alvo - t.ultimo.valor;
  if (falta <= 0) return { txt: 'Já atingido.', classe: 'ok' };
  if (t.porTri <= 0) return { txt: `No ritmo atual (${fmtN(Math.round(t.porTri))} por trimestre) não será atingido.`, classe: 'erro' };
  const tris = Math.ceil(falta / t.porTri);
  let p = t.ultimo.periodo; for (let i = 0; i < tris; i++) p = proximoPeriodo(p);
  return { txt: `No ritmo atual (+${fmtN(Math.round(t.porTri))} por trimestre), por volta do ${rotuloPeriodo(p)}.`, classe: tris <= 8 ? 'info' : 'alerta' };
}

// ── componentes visuais ──────────────────────
/** Medidor: nome, barra e número. Estado sempre com ícone + texto (não só cor). */
function medidor(nome, valor, alvo, { recomendado = false, nota = '' } = {}) {
  const pct = alvo ? Math.min(100, Math.round((valor / alvo) * 100)) : 0;
  const ok = valor >= alvo;
  const estado = ok ? { cls: 'ok', icone: '✓', txt: 'atingido' } : pct >= 75 ? { cls: 'alerta', icone: '⚠', txt: `faltam ${fmtN(alvo - valor)}` } : { cls: 'erro', icone: '✕', txt: `faltam ${fmtN(alvo - valor)}` };
  return `<div class="dv-medidor" role="meter" aria-valuemin="0" aria-valuemax="${alvo}" aria-valuenow="${valor}" aria-label="${esc(nome)}: ${valor} de ${alvo}">
    <div class="dv-medidor-nome">${esc(nome)}${recomendado ? ' <span class="m-meta">(recomendado)</span>' : ''}</div>
    <div class="dv-medidor-barra ${estado.cls}"><span style="width:${pct}%"></span></div>
    <div class="dv-medidor-num"><strong>${fmtN(valor)}</strong> / ${fmtN(alvo)}<span class="m-pill ${estado.cls}">${estado.icone} ${estado.txt}</span></div>
    ${nota ? `<div class="dv-medidor-nota m-meta">${nota}</div>` : ''}
  </div>`;
}

/** Gráfico de linha (uma série) com linha de referência, tooltip e tabela. */
function graficoLinha(pontos, ref, rotuloRef) {
  if (pontos.length < 2) return '<div class="m-meta">O gráfico aparece quando houver dois ou mais trimestres registrados.</div>';
  const W = 480, H = 240, m = { t: 16, r: 12, b: 28, l: 48 };
  const bruto = Math.max(ref || 0, ...pontos.map(p => p.valor)) * 1.08 || 1;
  const passo = 10 ** Math.floor(Math.log10(bruto / 2));
  const max = Math.ceil(bruto / (passo * 2)) * passo * 2;
  const x = i => m.l + (i * (W - m.l - m.r)) / (pontos.length - 1);
  const y = v => m.t + (H - m.t - m.b) * (1 - v / max);
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const ticks = [0, max / 2, max];
  return `<div class="dv-grafico">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução por trimestre">
      ${ticks.map(v => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="dv-grade"/><text x="${m.l - 6}" y="${y(v) + 4}" class="dv-eixo" text-anchor="end">${fmtN(v)}</text>`).join('')}
      ${ref ? `<line x1="${m.l}" x2="${W - m.r}" y1="${y(ref)}" y2="${y(ref)}" class="dv-ref"/><text x="${W - m.r}" y="${y(ref) - 5}" class="dv-eixo" text-anchor="end">${esc(rotuloRef)}: ${fmtN(ref)}</text>` : ''}
      <path d="${linha}" class="dv-linha"/>
      ${pontos.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.valor)}" r="4.5" class="dv-ponto"/>
        <rect x="${x(i) - 22}" y="${m.t}" width="44" height="${H - m.t - m.b}" class="dv-alvo" data-tip="${esc(rotuloPeriodo(p.periodo))}: ${fmtN(p.valor)}${p.completo ? '' : ' (incompleto)'}"/>
        <text x="${x(i)}" y="${H - 8}" class="dv-eixo" text-anchor="middle">${p.periodo.slice(2).replace('-', ' ')}</text>`).join('')}
    </svg>
    <div class="dv-tooltip" hidden></div>
  </div>
  <details class="dv-tabela"><summary class="m-meta">Ver em tabela</summary>
    <table class="m-tabela"><thead><tr><th>Trimestre</th><th>Total</th></tr></thead><tbody>${pontos.map(p => `<tr><td>${rotuloPeriodo(p.periodo)}</td><td>${fmtN(p.valor)}${p.completo ? '' : ' (incompleto)'}</td></tr>`).join('')}</tbody></table></details>`;
}
// tooltip do gráfico
document.addEventListener('pointermove', e => {
  const alvo = e.target.closest?.('.dv-alvo');
  document.querySelectorAll('.dv-tooltip').forEach(t => { if (!alvo || !t.parentElement.contains(alvo)) t.hidden = true; });
  if (!alvo) return;
  const box = alvo.closest('.dv-grafico'); const tip = box.querySelector('.dv-tooltip');
  const r = box.getBoundingClientRect();
  tip.textContent = alvo.dataset.tip; tip.hidden = false;
  tip.style.left = Math.min(r.width - 150, Math.max(0, e.clientX - r.left - 60)) + 'px';
  tip.style.top = Math.max(0, e.clientY - r.top - 44) + 'px';
});

// ── render principal ─────────────────────────
const VISTAS_DIVIDIR = { geral: 'Visão geral', alas: 'Por ala', simulador: 'Simulador', metas: 'Metas', dados: 'Dados' };

function renderDividir() {
  const box = document.getElementById('dividir-conteudo');
  if (!box) return;
  document.getElementById('dividir-vistas').innerHTML = Object.entries(VISTAS_DIVIDIR).map(([k, v]) =>
    `<button class="${k === vistaDividir ? 'ativo' : ''}" onclick="vistaDividir='${k}';renderDividir()">${v}</button>`).join('');
  if (!crescimento.carregado) { box.innerHTML = '<div class="m-vazio">Carregando…</div>'; return; }
  const semDados = !indicadores().length;
  if (semDados && vistaDividir !== 'dados') {
    box.innerHTML = `<div class="m-vazio">Ainda não há números registrados.<br><br>
      <button class="m-btn primario" onclick="vistaDividir='dados';renderDividir()">Registrar os números das alas</button></div>
      ${cartaoRequisitos()}`;
    return;
  }
  box.innerHTML = { geral: vistaGeral, alas: vistaAlas, simulador: vistaSimulador, metas: vistaMetas, dados: vistaDados }[vistaDividir]();
}

function cartaoRequisitos() {
  return `<details class="m-secao" style="margin-top:12px"><summary>📖 Requisitos mínimos do Manual <span class="m-ref">36.1 · 36.2</span></summary><div class="m-corpo m-rolagem">
    <table class="m-tabela"><thead><tr><th>Indicador</th><th>Estaca</th><th>Ala</th></tr></thead><tbody>
      ${IND_BASE.map(k => `<tr><td>${esc(INDICADORES[k].rotulo)}</td><td>${fmtN(REQ_ESTACA[k])}</td><td>${fmtN(REQ_ALA[k])}</td></tr>`).join('')}
      <tr><td>Número de alas</td><td>5</td><td>—</td></tr></tbody></table>
    <p class="m-meta" style="margin-top:8px">“Os líderes trabalham para aumentar a força espiritual dos membros antes de propor a criação de uma nova unidade. Novas unidades só devem ser criadas quando as unidades existentes forem suficientemente fortes.” (36.0) A proposta é feita pelo presidente da estaca em “Proposta para mudanças de limites e liderança”; a aprovação é da Primeira Presidência e do Quórum dos Doze e pode levar até oito semanas (36.1).</p>
  </div></details>`;
}

function vistaGeral() {
  const alas = alasDaEstaca();
  const t = somaAlas(alas);
  const ultimo = periodosComDados().pop();
  const incompletas = alas.filter(a => !dadoDe(a, ultimo));
  const dobro = k => REQ_ESTACA[k] * 2;
  const fracas = alas.filter(a => { const d = ultimoDado(a); return d && IND_BASE.some(k => !INDICADORES[k].recomendado && Number(d[k] || 0) < REQ_ALA[k]); });
  const elderesPrep = typeof chamados !== 'undefined' ? chamados.itens.filter(i => i.status === 'andamento' && i.tipo === 'ordenacao-elder').length : 0;
  const metaGrafico = indicadorGrafico === 'jovens' ? dobro('jovens') : dobro(indicadorGrafico);
  return `
    ${incompletas.length ? `<div class="m-alerta aviso">Dados de ${rotuloPeriodo(ultimo)} faltando para: ${incompletas.map(esc).join(', ')}. Os totais usam o último número de cada ala.</div>` : ''}
    <div class="m-secao" style="padding:14px">
      <h3 class="dv-titulo">Para dividir: as duas estacas precisam do mínimo</h3>
      <p class="m-meta" style="margin-bottom:10px">Soma atual das alas comparada ao dobro do mínimo de uma estaca. É uma condição necessária, não suficiente: a divisão também precisa ser equilibrada (veja o Simulador).</p>
      ${IND_BASE.map(k => medidor(INDICADORES[k].curto, t[k], dobro(k), { recomendado: INDICADORES[k].recomendado, nota: `📈 ${esc(previsao(k, dobro(k)).txt)}` })).join('')}
      ${medidor('Alas', t.alas, REQ_ESTACA.alas * 2, { nota: 'Cada nova ala exige 250 membros, 20 portadores do SM dizimistas e 100 adultos participantes (36.2).' })}
    </div>
    <div class="m-secao" style="padding:14px">
      <h3 class="dv-titulo">A estaca hoje, como uma só</h3>
      ${IND_BASE.map(k => medidor(INDICADORES[k].curto, t[k], REQ_ESTACA[k], { recomendado: INDICADORES[k].recomendado })).join('')}
    </div>
    <div class="m-secao" style="padding:14px">
      <div class="m-linha"><h3 class="dv-titulo">Evolução da estaca</h3>
        <select class="m-btn" onchange="indicadorGrafico=this.value;renderDividir()" aria-label="Indicador">${Object.entries(INDICADORES).map(([k, v]) => `<option value="${k}" ${k === indicadorGrafico ? 'selected' : ''}>${esc(v.curto)}</option>`).join('')}</select></div>
      ${graficoLinha(totaisPorPeriodo(indicadorGrafico), IND_BASE.includes(indicadorGrafico) ? metaGrafico : null, 'Necessário para dividir')}
    </div>
    <div class="m-grade">
      <div class="m-card" style="--acc:var(--amber)"><h3>Alas abaixo do mínimo de uma ala</h3><div class="m-meta">${fracas.length ? fracas.map(esc).join(', ') : 'Nenhuma.'}</div>
        <div class="m-meta" style="margin-top:6px">Fortalecer essas alas vem antes de criar novas unidades (36.0).</div></div>
      <div class="m-card" style="--acc:var(--green)"><h3>Futuros líderes em preparo</h3><div class="m-meta">${elderesPrep} ordenação(ões) a élder em andamento na aba Chamados.</div>
        <div class="m-meta" style="margin-top:6px">O indicador mais difícil costuma ser o de portadores do SM dizimistas e capazes de liderar.</div></div>
    </div>
    ${cartaoRequisitos()}`;
}

function vistaAlas() {
  const alas = alasDaEstaca();
  const ultimo = periodosComDados().pop();
  const anterior = ultimo ? periodoAnterior(ultimo) : null;
  const celula = (a, k) => {
    const d = ultimoDado(a); const v = d ? Number(d[k] || 0) : null;
    if (v === null) return '<td>—</td>';
    const req = REQ_ALA[k]; const prev = anterior ? dadoDe(a, anterior)?.[k] : undefined;
    const delta = prev !== undefined && prev !== '' && d.periodo === ultimo ? v - Number(prev) : null;
    const ok = req === undefined ? null : v >= req;
    return `<td><strong>${fmtN(v)}</strong>${ok === null ? '' : ok ? ' <span class="m-pill ok">✓</span>' : ` <span class="m-pill ${INDICADORES[k].recomendado ? 'alerta' : 'erro'}">✕ ${fmtN(req)}</span>`}${delta ? `<div class="m-meta">${delta > 0 ? '▲ +' : '▼ '}${fmtN(delta)}</div>` : ''}</td>`;
  };
  const podeDividir = a => { const d = ultimoDado(a); return d && ['membros', 'sm', 'adultos'].every(k => Number(d[k] || 0) >= REQ_ALA[k] * 2); };
  return `
    <p class="m-meta" style="margin-bottom:8px">Último número de cada ala${ultimo ? ` (variação em relação ao ${rotuloPeriodo(anterior)})` : ''}. ✕ mostra o mínimo de uma ala que ainda não foi atingido (36.2).</p>
    <div class="m-rolagem"><table class="m-tabela"><thead><tr><th>Ala</th>${Object.values(INDICADORES).map(i => `<th>${esc(i.curto)}</th>`).join('')}<th>Gera nova ala?</th></tr></thead>
    <tbody>${alas.map(a => `<tr><td><strong>${esc(a.replace(/^Ala /, ''))}</strong><div class="m-meta">${ultimoDado(a) ? rotuloPeriodo(ultimoDado(a).periodo) : 'sem dados'}</div></td>
      ${Object.keys(INDICADORES).map(k => celula(a, k)).join('')}
      <td>${podeDividir(a) ? '<span class="m-pill ok">✓ candidata</span>' : '<span class="m-meta">ainda não</span>'}</td></tr>`).join('')}</tbody></table></div>
    <p class="m-meta" style="margin-top:8px">“Gera nova ala” indica que a ala tem pelo menos o dobro do mínimo de membros, portadores do SM e adultos participantes, de modo que as duas partes poderiam atender aos requisitos. A divisão real depende de limites geográficos e de um irmão para servir como bispo.</p>`;
}

// ── simulador ────────────────────────────────
function cenarioPadrao() {
  return { nome: '', atribuicao: Object.fromEntries(alasDaEstaca().map(a => [a, 'A'])), divisoes: [], nomeA: 'Estaca Nova Iguaçu (remanescente)', nomeB: 'Nova estaca' };
}
function alasDoCenario(c) {
  // Unidades do cenário: alas reais, menos as divididas, mais as partes simuladas.
  const lista = [];
  alasDaEstaca().forEach(a => {
    const div = (c.divisoes || []).find(d => d.ala === a);
    const base = ultimoDado(a) || {};
    if (!div) { lista.push({ nome: a, dados: base, estaca: c.atribuicao[a] || 'A' }); return; }
    const p = Number(div.percentual) / 100;
    const parte = f => Object.fromEntries(IND_BASE.map(k => [k, Math.round((Number(base[k]) || 0) * f)]));
    lista.push({ nome: a + ' (parte 1)', dados: parte(1 - p), estaca: div.estaca1 || 'A', virtual: true });
    lista.push({ nome: div.novoNome || a + ' (nova)', dados: parte(p), estaca: div.estaca2 || 'B', virtual: true });
  });
  return lista;
}
function totaisCenario(unidades, estaca) {
  const us = unidades.filter(u => u.estaca === estaca);
  const t = { alas: us.length };
  IND_BASE.forEach(k => { t[k] = us.reduce((s, u) => s + (Number(u.dados[k]) || 0), 0); });
  return { t, us };
}
function vistaSimulador() {
  if (!cenarioAtual) cenarioAtual = cenarioPadrao();
  const c = cenarioAtual;
  const unidades = alasDoCenario(c);
  const colunas = ['A', 'B'].map(e => {
    const { t, us } = totaisCenario(unidades, e);
    const atende = IND_BASE.filter(k => !INDICADORES[k].recomendado).every(k => t[k] >= REQ_ESTACA[k]) && t.alas >= REQ_ESTACA.alas;
    const alasFracas = us.filter(u => ['membros', 'sm', 'adultos'].some(k => (Number(u.dados[k]) || 0) < REQ_ALA[k]));
    return `<div class="m-secao" style="padding:14px">
      <input class="m-input-inline" style="font-weight:700;font-size:14px;margin:0 0 8px" value="${esc(e === 'A' ? c.nomeA : c.nomeB)}" onchange="cenarioAtual.${e === 'A' ? 'nomeA' : 'nomeB'}=this.value" aria-label="Nome da estaca">
      <span class="m-pill ${atende ? 'ok' : 'erro'}">${atende ? '✓ atende aos mínimos' : '✕ não atende'}</span>
      <div style="margin-top:10px">${IND_BASE.map(k => medidor(INDICADORES[k].curto, t[k], REQ_ESTACA[k], { recomendado: INDICADORES[k].recomendado })).join('')}
      ${medidor('Alas', t.alas, REQ_ESTACA.alas)}</div>
      ${alasFracas.length ? `<div class="m-alerta aviso" style="margin-top:8px">Abaixo do mínimo de uma ala: ${alasFracas.map(u => esc(u.nome)).join(', ')}</div>` : ''}
    </div>`;
  });
  return `
    <div class="m-alerta info">Distribua as alas entre as duas estacas e, se quiser, simule a divisão de uma ala. Nada aqui altera dados reais; o cenário pode ser salvo e impresso como estudo.</div>
    <div class="m-secao" style="padding:14px">
      <h3 class="dv-titulo">Distribuição das alas</h3>
      ${unidades.map(u => `<div class="m-orador"><div class="m-orador-info"><strong>${esc(u.nome)}</strong>${u.virtual ? ' <span class="m-pill info">simulada</span>' : ''}
          <div class="m-meta">${IND_BASE.map(k => `${INDICADORES[k].curto}: ${fmtN(u.dados[k])}`).join(' · ')}</div></div>
        <div class="m-orador-acoes">${u.virtual ? '' : `<select class="m-btn mini" onchange="cenarioAtual.atribuicao['${esc(u.nome)}']=this.value;renderDividir()" aria-label="Estaca de ${esc(u.nome)}">
          <option value="A" ${u.estaca === 'A' ? 'selected' : ''}>${esc(c.nomeA.slice(0, 22))}</option><option value="B" ${u.estaca === 'B' ? 'selected' : ''}>${esc(c.nomeB.slice(0, 22))}</option></select>`}</div></div>`).join('')}
      ${(c.divisoes || []).map((d, i) => `<div class="m-check"><span class="m-check-txt">Divisão simulada: <strong>${esc(d.ala)}</strong> → ${esc(d.percentual)}% para “${esc(d.novoNome || 'nova ala')}” (${d.estaca2 === 'B' ? esc(c.nomeB) : esc(c.nomeA)})</span>
        <button class="m-btn mini perigo" onclick="cenarioAtual.divisoes.splice(${i},1);renderDividir()">🗑</button></div>`).join('')}
      <div class="m-acoes" style="margin-top:10px"><button class="m-btn mini" onclick="simularDivisaoAla()">✂️ Simular divisão de uma ala</button></div>
    </div>
    <div class="m-grade">${colunas.join('')}</div>
    <div class="m-secao" style="padding:14px">
      <div class="m-linha"><input class="m-input-inline" style="flex:1;margin:0" placeholder="Nome do cenário" value="${esc(c.nome || '')}" onchange="cenarioAtual.nome=this.value">
        <span class="m-acoes"><button class="m-btn mini primario" onclick="salvarCenario()">💾 Salvar</button><button class="m-btn mini" onclick="imprimirCenario()">🖨 Estudo</button><button class="m-btn mini" onclick="cenarioAtual=null;renderDividir()">↺ Novo</button></span></div>
      ${cenarios().length ? `<div style="margin-top:10px">${cenarios().map(s => `<div class="m-check"><span class="m-check-txt">${esc(s.nome || 'Sem nome')} <span class="m-meta">· ${fmtDataBR((s.atualizadoEm || s.criadoEm || '').slice(0, 10))}</span></span>
        <button class="m-btn mini" onclick="carregarCenario('${esc(s.id)}')">Abrir</button><button class="m-btn mini perigo" onclick="excluirCenario('${esc(s.id)}')">🗑</button></div>`).join('')}</div>` : ''}
    </div>
    <p class="m-meta">Limites de estaca seguem os limites das alas (36.1). Nomes de estaca: cidade, depois o país; um terceiro termo (bairro, ponto cardeal ou acidente geográfico) quando houver mais de uma estaca na cidade; nunca nomes de pessoas (36.4.1).</p>`;
}
function simularDivisaoAla() {
  const ala = prompt('Qual ala será dividida?\n' + alasDaEstaca().map((a, i) => `${i + 1}. ${a}`).join('\n'));
  if (!ala) return;
  const nome = alasDaEstaca()[Number(ala) - 1] || alasDaEstaca().find(a => a.toLowerCase().includes(ala.toLowerCase()));
  if (!nome) return alert('Ala não encontrada.');
  const pct = Number(prompt('Que porcentagem dos membros vai para a nova ala? (ex.: 45)', '50'));
  if (!(pct > 0 && pct < 100)) return alert('Informe um número entre 1 e 99.');
  const novoNome = prompt('Nome provisório da nova ala (bairro, rua, parque…; nunca nome de pessoa — 36.4.2):', '') || '';
  const destino = confirm(`A nova ala ficará na “${cenarioAtual.nomeB}”?\nOK = sim · Cancelar = fica na “${cenarioAtual.nomeA}”`) ? 'B' : 'A';
  cenarioAtual.divisoes = (cenarioAtual.divisoes || []).filter(d => d.ala !== nome);
  cenarioAtual.divisoes.push({ ala: nome, percentual: pct, novoNome, estaca1: cenarioAtual.atribuicao[nome] || 'A', estaca2: destino });
  renderDividir();
}
async function salvarCenario() {
  const c = cenarioAtual;
  if (!c.nome) c.nome = prompt('Nome do cenário:', `Cenário ${cenarios().length + 1}`) || `Cenário ${cenarios().length + 1}`;
  const dados = { tipo: 'cenario', nome: c.nome, atribuicao: c.atribuicao, divisoes: c.divisoes || [], nomeA: c.nomeA, nomeB: c.nomeB };
  try {
    const salvo = c.id ? await crescimento.alterar(c.id, dados) : await crescimento.salvar(dados);
    cenarioAtual = structuredClone(salvo);
    showToast('✓ Cenário salvo');
  } catch { /* toast exibido */ }
}
function carregarCenario(id) {
  const s = crescimento.obter(id);
  cenarioAtual = { ...cenarioPadrao(), ...structuredClone(s), atribuicao: { ...cenarioPadrao().atribuicao, ...(s.atribuicao || {}) } };
  renderDividir();
}
async function excluirCenario(id) {
  if (!confirm('Excluir este cenário?')) return;
  await crescimento.remover(id);
  if (cenarioAtual?.id === id) cenarioAtual = null;
}
function imprimirCenario() {
  const c = cenarioAtual; const unidades = alasDoCenario(c);
  const bloco = e => {
    const { t, us } = totaisCenario(unidades, e);
    return `<h2>${esc(e === 'A' ? c.nomeA : c.nomeB)}</h2>
      <table><tr><td>Alas</td><td>${us.map(u => esc(u.nome)).join(', ')}</td></tr>
      ${IND_BASE.map(k => `<tr><td>${esc(INDICADORES[k].rotulo)}</td><td>${fmtN(t[k])} (mínimo ${fmtN(REQ_ESTACA[k])}) ${t[k] >= REQ_ESTACA[k] ? '✓' : '✕'}</td></tr>`).join('')}
      <tr><td>Número de alas</td><td>${t.alas} (mínimo 5) ${t.alas >= 5 ? '✓' : '✕'}</td></tr></table>`;
  };
  abrirImpressao('Estudo de divisão', `<div class="igreja">Presidência da estaca · documento de trabalho</div><h1>${esc(c.nome || 'Estudo de divisão da estaca')}</h1>
    <p class="sub">${fmtDataLonga(hojeISO())} · dados mais recentes: ${esc(rotuloPeriodo(periodosComDados().pop() || periodoDe()))}</p>
    <p class="nota">Estudo interno com números agregados. Requisitos mínimos do Manual Geral 36.1. A proposta oficial é feita pelo presidente da estaca em “Proposta para mudanças de limites e liderança”.</p>
    ${bloco('A')}${bloco('B')}
    ${(c.divisoes || []).length ? `<h2>Divisões de ala simuladas</h2><ul>${c.divisoes.map(d => `<li>${esc(d.ala)}: ${esc(d.percentual)}% para “${esc(d.novoNome || 'nova ala')}”</li>`).join('')}</ul>` : ''}`);
}

// ── metas ────────────────────────────────────
function vistaMetas() {
  const ms = metas().sort((a, b) => (a.prazo || '').localeCompare(b.prazo || ''));
  return `
    <div class="m-alerta info">Metas por ala ou para a estaca, acompanhadas pelo número mais recente registrado. Comece pelas alas abaixo do mínimo (36.0).</div>
    <div class="m-acoes" style="margin-bottom:10px"><button class="m-btn mini primario" onclick="novaMetaCrescimento()">＋ Meta</button>
      <button class="m-btn mini" onclick="gerarMetasMinimos()">⚙️ Gerar metas para atingir os mínimos de ala</button></div>
    ${ms.length ? ms.map(mt => {
      const atual = mt.ala === 'Estaca' ? somaAlas(alasDaEstaca())[mt.indicador] : Number(ultimoDado(mt.ala)?.[mt.indicador] || 0);
      const vencida = mt.prazo && mt.prazo < periodoDe() && atual < mt.alvo;
      return `<div class="m-card" style="--acc:${atual >= mt.alvo ? 'var(--green)' : vencida ? 'var(--red)' : 'var(--gold)'}">
        <div class="m-linha"><h3>${esc(mt.ala)} · ${esc(INDICADORES[mt.indicador]?.curto || mt.indicador)}</h3>
          <span class="m-acoes"><span class="m-pill ${vencida ? 'erro' : 'neutro'}">até ${esc(rotuloPeriodo(mt.prazo || periodoDe()))}</span>
          <button class="m-btn mini perigo" onclick="excluirMeta('${esc(mt.id)}')" aria-label="Excluir meta">🗑</button></span></div>
        ${medidor('Progresso', atual, Number(mt.alvo))}
        ${mt.acoes ? `<div class="m-meta">Ações: ${esc(mt.acoes)}</div>` : ''}
      </div>`;
    }).join('') : '<div class="m-vazio">Nenhuma meta definida.</div>'}`;
}
async function novaMetaCrescimento() {
  const ala = prompt('Para qual unidade? Digite "Estaca" ou o número da ala:\n' + alasDaEstaca().map((a, i) => `${i + 1}. ${a}`).join('\n'), 'Estaca');
  if (!ala) return;
  const unidade = /^estaca$/i.test(ala) ? 'Estaca' : (alasDaEstaca()[Number(ala) - 1] || null);
  if (!unidade) return alert('Unidade não encontrada.');
  const ks = Object.keys(INDICADORES);
  const ind = ks[Number(prompt('Indicador:\n' + ks.map((k, i) => `${i + 1}. ${INDICADORES[k].curto}`).join('\n'), '2')) - 1];
  if (!ind) return;
  const alvo = Number(prompt(`Meta de ${INDICADORES[ind].curto}:`));
  if (!(alvo > 0)) return;
  const prazo = prompt('Prazo (AAAA-T1 a AAAA-T4):', proximoPeriodo(proximoPeriodo(periodoDe())));
  if (!/^\d{4}-T[1-4]$/.test(prazo || '')) return alert('Use o formato 2027-T2.');
  const acoes = prompt('Ações planejadas (opcional):', '') || '';
  await crescimento.salvar({ tipo: 'meta', ala: unidade, indicador: ind, alvo, prazo, acoes });
}
async function gerarMetasMinimos() {
  const prazo = prompt('Prazo para as metas (AAAA-T1 a AAAA-T4):', proximoPeriodo(proximoPeriodo(proximoPeriodo(periodoDe()))));
  if (!/^\d{4}-T[1-4]$/.test(prazo || '')) return;
  let n = 0;
  for (const a of alasDaEstaca()) {
    const d = ultimoDado(a); if (!d) continue;
    for (const k of ['membros', 'sm', 'adultos', 'jovens']) {
      if (Number(d[k] || 0) < REQ_ALA[k] && !metas().some(m => m.ala === a && m.indicador === k)) {
        await crescimento.salvar({ tipo: 'meta', ala: a, indicador: k, alvo: REQ_ALA[k], prazo, acoes: '' }); n++;
      }
    }
  }
  showToast(n ? `✓ ${n} meta(s) criada(s)` : 'Todas as alas já atingem os mínimos ou já têm metas');
}
async function excluirMeta(id) { if (confirm('Excluir esta meta?')) await crescimento.remover(id); }

// ── dados (registro e importação) ────────────
let rascunhoDados = {};
function vistaDados() {
  if (!periodoDados) periodoDados = periodoAnterior(periodoDe());
  const alas = alasDaEstaca();
  const valor = (a, k) => rascunhoDados[a]?.[k] ?? dadoDe(a, periodoDados)?.[k] ?? '';
  const opcoesPer = []; let p = periodoDe(); for (let i = 0; i < 12; i++) { opcoesPer.push(p); p = periodoAnterior(p); }
  return `
    <p class="aviso-sigilo">🔒 Só os <strong>totais por ala</strong> são gravados. Arquivos importados são lidos neste aparelho e descartados; nenhum nome ou endereço sai do navegador.</p>
    <div class="m-linha" style="margin-bottom:10px">
      <label class="m-meta">Trimestre <select class="m-btn" onchange="periodoDados=this.value;rascunhoDados={};renderDividir()">${opcoesPer.map(x => `<option value="${x}" ${x === periodoDados ? 'selected' : ''}>${rotuloPeriodo(x)}</option>`).join('')}</select></label>
      <span class="m-acoes"><button class="m-btn mini" onclick="abrirImportacaoLCR()">📥 Contar a partir de relatório do LCR</button>
        ${typeof MEMBROS_ESTACA !== 'undefined' && MEMBROS_ESTACA.length ? '<button class="m-btn mini" onclick="usarListaMembros()">👥 Membros da lista importada</button>' : ''}</span>
    </div>
    <div class="m-rolagem"><table class="m-tabela dv-entrada"><thead><tr><th>Ala</th>${Object.entries(INDICADORES).map(([k, i]) => `<th title="${esc(i.rotulo)}">${esc(i.curto)}</th>`).join('')}</tr></thead>
      <tbody>${alas.map(a => `<tr><td><strong>${esc(a.replace(/^Ala /, ''))}</strong></td>${Object.keys(INDICADORES).map(k => `<td><input type="number" min="0" inputmode="numeric" value="${esc(valor(a, k))}" aria-label="${esc(INDICADORES[k].curto)} — ${esc(a)}" onchange="(rascunhoDados['${esc(a)}'] ||= {})['${k}']=this.value===''?'':Number(this.value)"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="m-acoes" style="justify-content:flex-end;margin-top:10px"><button class="m-btn primario" onclick="salvarDadosPeriodo()">💾 Salvar ${rotuloPeriodo(periodoDados)}</button></div>
    <details class="m-secao" style="margin-top:12px"><summary>O que significa cada indicador</summary><div class="m-corpo">
      ${Object.values(INDICADORES).map(i => `<div class="m-check"><span class="m-check-txt">${esc(i.rotulo)}</span></div>`).join('')}
      <p class="m-meta" style="margin-top:6px">Os quatro primeiros são os do Manual (36.1 e 36.2) e aparecem nos relatórios do LCR usados na proposta de mudança de limites. Os demais ajudam a acompanhar a força das alas.</p></div></details>`;
}
async function salvarDadosPeriodo() {
  const alas = Object.keys(rascunhoDados);
  if (!alas.length) return showToast('Nada alterado');
  let ok = 0;
  for (const a of alas) {
    const existente = dadoDe(a, periodoDados);
    const campos = rascunhoDados[a];
    try {
      if (existente) await crescimento.alterar(existente.id, campos);
      else await crescimento.salvar({ id: idIndicador(a, periodoDados), tipo: 'indicador', ala: a, periodo: periodoDados, ...campos });
      ok++;
    } catch { /* toast exibido */ }
  }
  rascunhoDados = {};
  showToast(`✓ ${ok} ala(s) salvas em ${rotuloPeriodo(periodoDados)}`);
  renderDividir();
}
function usarListaMembros() {
  alasDaEstaca().forEach(a => { (rascunhoDados[a] ||= {}).membros = MEMBROS_ESTACA.filter(m => m.ala === a).length; });
  renderDividir();
  showToast('Contagem preenchida. Confira e toque em Salvar.');
}

// Importação: conta linhas por unidade, com filtro opcional, sem guardar o arquivo.
let linhasImport = null, cabImport = [];
function abrirImportacaoLCR() {
  linhasImport = null; cabImport = [];
  const f = document.getElementById('lcr-form');
  f.reset();
  f.querySelector('.lcr-config').hidden = true;
  f.indicador.innerHTML = Object.entries(INDICADORES).map(([k, i]) => `<option value="${k}">${esc(i.curto)}</option>`).join('');
  document.getElementById('lcr-previa').innerHTML = '';
  abrirModal('lcr-modal');
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'lcr-arquivo') return;
  const f = e.target.form; const arq = e.target.files[0];
  if (!arq) return;
  try {
    const linhas = lerCsv((await arq.text()).replace(/^﻿/, ''));
    if (linhas.length < 2) throw new Error('Arquivo sem linhas de dados.');
    cabImport = linhas[0]; linhasImport = linhas.slice(1);
    const opc = (sugestao) => cabImport.map((h, i) => `<option value="${i}" ${sugestao(normalizarCabecalho(h)) ? 'selected' : ''}>${esc(h)}</option>`).join('');
    f.colunaAla.innerHTML = opc(h => /unidade|ala|ward|unit/.test(h));
    f.colunaFiltro.innerHTML = '<option value="">(sem filtro — contar todas as linhas)</option>' + cabImport.map((h, i) => `<option value="${i}">${esc(h)}</option>`).join('');
    f.querySelector('.lcr-config').hidden = false;
    previaImportacao();
  } catch (err) { document.getElementById('lcr-previa').textContent = '⚠ ' + err.message; }
});
function contagemImportacao() {
  const f = document.getElementById('lcr-form');
  const ia = Number(f.colunaAla.value); const ifl = f.colunaFiltro.value === '' ? null : Number(f.colunaFiltro.value);
  const termos = f.valoresFiltro.value.split(',').map(s => normalizarCabecalho(s)).filter(Boolean);
  const alas = alasDaEstaca();
  const casar = u => { const n = normalizarCabecalho(u); return alas.find(a => normalizarCabecalho(a) === n || normalizarCabecalho(a).replace(/^ala /, '') === n.replace(/^ala /, '')) || null; };
  const cont = {}; let semAla = 0;
  linhasImport.forEach(l => {
    if (ifl !== null && termos.length && !termos.some(t => normalizarCabecalho(l[ifl] || '').includes(t))) return;
    const a = casar(l[ia] || '');
    if (a) cont[a] = (cont[a] || 0) + 1; else semAla++;
  });
  return { cont, semAla };
}
function previaImportacao() {
  if (!linhasImport) return;
  const { cont, semAla } = contagemImportacao();
  document.getElementById('lcr-previa').innerHTML = `<table class="m-tabela"><tbody>${alasDaEstaca().map(a => `<tr><td>${esc(a)}</td><td><strong>${fmtN(cont[a] || 0)}</strong></td></tr>`).join('')}</tbody></table>
    ${semAla ? `<p class="m-meta">${semAla} linha(s) sem ala reconhecida foram ignoradas.</p>` : ''}`;
}
function aplicarImportacao(ev) {
  ev.preventDefault();
  if (!linhasImport) return;
  const k = ev.target.indicador.value;
  const { cont } = contagemImportacao();
  alasDaEstaca().forEach(a => { (rascunhoDados[a] ||= {})[k] = cont[a] || 0; });
  linhasImport = null; cabImport = []; // descarta o arquivo
  fecharModal('lcr-modal');
  renderDividir();
  showToast('Contagem aplicada. Confira e toque em Salvar.');
}

registrarAba('dividir', {
  emoji: '🌱', nome: 'Dividir a Estaca',
  carregar: () => crescimento.carregar(),
});
Auth.pronto.then(() => crescimento.carregar());
