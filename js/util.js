// =============================================
// UTILITÁRIOS COMPARTILHADOS PELOS MÓDULOS NOVOS
// =============================================

/** Escapa texto para inserir com segurança em innerHTML. */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ALAS_PADRAO = [
  'Ala Belford Roxo', 'Ala Jardim Metrópole', 'Ala Queimados', 'Ala Vilar dos Teles',
  'Ala Miguel Couto', 'Ala Nova Iguaçu', 'Ala Nilópolis', 'Ala Rosa dos Ventos',
];
function alasDaEstaca() {
  const c = (typeof CONFIG_APP !== 'undefined' && Array.isArray(CONFIG_APP.alas) && CONFIG_APP.alas.length) ? CONFIG_APP.alas : ALAS_PADRAO;
  return [...c];
}
function opcoesAlas(selecionada = '', vazia = '— Selecione —') {
  return (vazia !== null ? `<option value="">${esc(vazia)}</option>` : '') +
    alasDaEstaca().map(a => `<option${a === selecionada ? ' selected' : ''}>${esc(a)}</option>`).join('');
}

/** Recria as listas de alas fixas no HTML a partir da configuração. */
function sincronizarSelectsAlas() {
  ['f-ala', 'sc-ala', 'sc-ala-desig'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const atual = sel.value;
    const primeira = sel.options[0] && (sel.options[0].value === '' || /^—/.test(sel.options[0].textContent)) ? sel.options[0].outerHTML : '';
    sel.innerHTML = primeira + alasDaEstaca().map(a => `<option>${esc(a)}</option>`).join('');
    if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
  });
}
document.addEventListener('config:carregada', sincronizarSelectsAlas);

// ── datas ──
function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function fmtDataBR(iso, opcoes = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  return isNaN(d) ? iso : d.toLocaleDateString('pt-BR', opcoes);
}
function fmtDataLonga(iso) {
  return fmtDataBR(iso, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function diasAte(iso) {
  if (!iso) return null;
  const alvo = new Date(iso.slice(0, 10) + 'T12:00:00');
  const hoje = new Date(hojeISO() + 'T12:00:00');
  return Math.round((alvo - hoje) / 86400000);
}
function somarDias(iso, dias) {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
function somarMeses(iso, meses) {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

// ── modais ──
function abrirModal(id) { document.getElementById(id)?.classList.add('open'); }
function fecharModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const abertos = [...document.querySelectorAll('.modal-overlay.open')];
  if (abertos.length) abertos[abertos.length - 1].classList.remove('open');
});

// ── leitura de formulários ──
/** Lê os campos [name] de um container em um objeto. Checkbox vira boolean. */
function lerCampos(container) {
  const dados = {};
  container.querySelectorAll('[name]').forEach(el => {
    if (el.type === 'checkbox') dados[el.name] = el.checked;
    else dados[el.name] = el.value.trim();
  });
  return dados;
}
function preencherCampos(container, dados) {
  container.querySelectorAll('[name]').forEach(el => {
    const v = dados?.[el.name];
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
  });
}

// ── WhatsApp ──
function linkWhatsApp(texto, telefone = '') {
  const tel = String(telefone).replace(/\D/g, '');
  const num = tel ? (tel.length <= 11 ? '55' + tel : tel) : '';
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

/**
 * Coleção ligada a uma API do painel, com controle de versão (_rev) e
 * suporte à fila offline. Uso:
 *   const conf = new Colecao('/api/conferencias', () => renderConf());
 *   await conf.carregar(); conf.itens; await conf.salvar({...}); await conf.remover(id)
 */
class Colecao {
  constructor(url, aoMudar) {
    this.url = url;
    this.itens = [];
    this.carregado = false;
    this.aoMudar = aoMudar || (() => {});
  }
  async carregar() {
    try {
      const r = await fetch(this.url, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const dados = await r.json();
      if (Array.isArray(dados)) { this.itens = dados; this.carregado = true; }
    } catch { /* offline: mantém o que já está na memória */ }
    this.aoMudar();
    return this.itens;
  }
  obter(id) { return this.itens.find(i => i.id === id); }

  /** Cria (sem id) ou atualiza (com id). Atualização envia _rev para detectar conflito. */
  async salvar(dados) {
    try {
      if (dados.id && this.obter(dados.id)) {
        const atual = this.obter(dados.id);
        const { id, ...resto } = dados;
        const salvo = await fetchComFila(`${this.url}?id=${encodeURIComponent(id)}`, 'PUT', { ...resto, _rev: atual._rev });
        this.itens = this.itens.map(i => i.id === id ? { ...i, ...salvo } : i);
        this.aoMudar();
        return this.obter(id);
      }
      const criado = await fetchComFila(this.url, 'POST', dados);
      this.itens.push(criado);
      this.aoMudar();
      return criado;
    } catch (e) {
      if (e.http === 409) await this.carregar();
      throw e;
    }
  }
  /** Atualiza só alguns campos (ex.: status). */
  async alterar(id, parcial) {
    return this.salvar({ id, ...parcial });
  }
  async remover(id) {
    await fetchComFila(`${this.url}?id=${encodeURIComponent(id)}`, 'DELETE', {});
    this.itens = this.itens.filter(i => i.id !== id);
    this.aoMudar();
  }
}
