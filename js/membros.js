// =============================================
// LISTA DE MEMBROS (autocompletar) — protegida pelo login
// =============================================
// Antes ficava embutida no index.html, visível para qualquer pessoa.
// Agora vem de /api/membros só depois do login.

async function carregarMembros() {
  try {
    const r = await fetch('/api/membros', { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return;
    const lista = await r.json();
    if (Array.isArray(lista)) MEMBROS_ESTACA = lista;
  } catch { /* sem conexão: o autocompletar fica vazio */ }
}
Auth.pronto.then(carregarMembros);
Auth.aoEntrar(carregarMembros);

let membrosParaImportar = null;

function abrirImportarMembros() {
  membrosParaImportar = null;
  document.getElementById('membros-arquivo').value = '';
  document.getElementById('membros-previa').textContent = `Lista atual: ${MEMBROS_ESTACA.length} nomes.`;
  document.getElementById('membros-btn').disabled = true;
  document.getElementById('membros-overlay').classList.add('open');
}
function fecharImportarMembros() {
  document.getElementById('membros-overlay').classList.remove('open');
}

// CSV simples com aspas, separador vírgula ou ponto e vírgula.
function lerCsv(texto) {
  const sep = (texto.split('\n')[0].match(/;/g) || []).length > (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.some(x => x.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some(x => x.trim())) linhas.push(linha);
  return linhas;
}

function normalizarCabecalho(h) {
  return h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function membrosDeCsv(texto) {
  const [cab, ...linhas] = lerCsv(texto.replace(/^﻿/, ''));
  if (!cab) return [];
  const h = cab.map(normalizarCabecalho);
  const idx = (...nomes) => h.findIndex(x => nomes.some(n => x === n || x.includes(n)));
  const iNome = idx('nome preferido', 'nome', 'name');
  const iSexo = idx('sexo', 'genero', 'gender');
  const iAla = idx('ala', 'unidade', 'unit', 'ward');
  if (iNome < 0) throw new Error('Não achei a coluna de nome no arquivo.');
  return linhas.map(l => {
    const s = (l[iSexo] || '').trim().toUpperCase();
    return {
      name: (l[iNome] || '').trim(),
      gender: s.startsWith('F') ? 'F' : s.startsWith('M') ? 'M' : '',
      ala: iAla >= 0 ? (l[iAla] || '').trim() : '',
    };
  }).filter(m => m.name);
}

document.addEventListener('change', async e => {
  if (e.target.id !== 'membros-arquivo') return;
  const previa = document.getElementById('membros-previa');
  const btn = document.getElementById('membros-btn');
  membrosParaImportar = null; btn.disabled = true;
  const arq = e.target.files[0];
  if (!arq) return;
  try {
    const texto = await arq.text();
    const lista = arq.name.toLowerCase().endsWith('.json') ? JSON.parse(texto) : membrosDeCsv(texto);
    if (!Array.isArray(lista) || !lista.length) throw new Error('Nenhum membro encontrado no arquivo.');
    membrosParaImportar = lista;
    const porAla = {};
    lista.forEach(m => { const a = m.ala || m.unidade || '(sem ala)'; porAla[a] = (porAla[a] || 0) + 1; });
    previa.textContent = `${lista.length} nomes encontrados — ` + Object.entries(porAla).map(([a, n]) => `${a}: ${n}`).join(' · ') + '. A lista atual será substituída.';
    btn.disabled = false;
  } catch (err) {
    previa.textContent = '⚠ ' + err.message;
  }
});

async function enviarMembros() {
  if (!membrosParaImportar) return;
  const btn = document.getElementById('membros-btn');
  btn.disabled = true; btn.textContent = 'Importando…';
  try {
    const r = await fetch('/api/membros', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(membrosParaImportar),
    });
    const dados = await r.json();
    if (!r.ok) throw new Error(dados.error || 'Falha ao importar');
    MEMBROS_ESTACA = dados;
    showToast(`✓ ${dados.length} membros importados`);
    fecharImportarMembros();
  } catch (e) { alert(e.message); }
  btn.disabled = false; btn.textContent = 'Importar';
}
