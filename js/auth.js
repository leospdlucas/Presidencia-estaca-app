// =============================================
// LOGIN POR PIN + SESSÃO
// =============================================
// Carregado antes de todos os outros scripts. Ele:
//  1. intercepta fetch() para anexar o token às chamadas /api/*;
//  2. mostra a tela de login quando não há sessão ou ela expira;
//  3. oferece o menu do usuário (trocar PIN, sair, administração).
// O token fica no localStorage do aparelho e vale 7 dias.

const Auth = (() => {
  const CHAVE = 'auth-estaca';
  const fetchOriginal = window.fetch.bind(window);
  let sessao = carregar();
  let aoEntrar = [];
  let resolverPronto;
  const pronto = new Promise(r => { resolverPronto = r; });
  let appIniciado = false;

  function carregar() {
    if (typeof Demo !== 'undefined' && Demo.ativo) return Demo.sessao();
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      return s && s.token && s.exp > Date.now() ? s : null;
    } catch { return null; }
  }
  function guardar(s) {
    sessao = s;
    if (typeof Demo !== 'undefined' && Demo.ativo) return; // demonstração não grava sessão
    try { s ? localStorage.setItem(CHAVE, JSON.stringify(s)) : localStorage.removeItem(CHAVE); } catch {}
  }

  // Lê a resposta da API. Se vier HTML (ex.: proteção de visitantes do
  // Netlify ativa), explica o problema em vez de mostrar erro técnico.
  async function lerJson(r) {
    const tipo = r.headers.get('content-type') || '';
    if (!tipo.includes('application/json')) {
      const txt = await r.text().catch(() => '');
      if (/edge-access|Login Redirect/i.test(txt) || r.status === 401) {
        throw new Error('O Netlify está bloqueando o acesso ao servidor (proteção de visitantes ativa no site). Desative em Project configuration → Access & security → Visitor access.');
      }
      throw new Error(`Resposta inesperada do servidor (HTTP ${r.status}). As funções foram publicadas?`);
    }
    return r.json();
  }

  function ehApi(url) {
    try {
      const u = new URL(url, location.href);
      return u.origin === location.origin && (u.pathname.startsWith('/api/') || u.pathname.startsWith('/.netlify/functions/'));
    } catch { return false; }
  }

  window.fetch = async (entrada, init = {}) => {
    const url = typeof entrada === 'string' ? entrada : entrada.url;
    if (!ehApi(url)) return fetchOriginal(entrada, init);
    // Demonstração: nenhuma chamada à API sai do navegador
    if (typeof Demo !== 'undefined' && Demo.ativo) return Demo.responder(entrada, init);
    const headers = new Headers(init.headers || (entrada instanceof Request ? entrada.headers : undefined));
    if (sessao?.token) headers.set('Authorization', 'Bearer ' + sessao.token);
    const res = await fetchOriginal(entrada, { ...init, headers });
    if (res.status === 401 && !url.includes('/api/auth')) expirou();
    return res;
  };

  function expirou() {
    if (!sessao && document.getElementById('login-overlay')?.classList.contains('open')) return;
    guardar(null);
    mostrarLogin('Sua sessão terminou. Entre novamente.');
  }

  // ── tela de login ─────────────────────────────
  async function mostrarLogin(aviso) {
    const ov = document.getElementById('login-overlay');
    ov.classList.add('open');
    document.body.classList.add('sem-sessao');
    const msg = document.getElementById('login-msg');
    msg.textContent = aviso || '';
    msg.className = 'login-msg' + (aviso ? ' aviso' : '');
    const sel = document.getElementById('login-usuario');
    const ajuda = document.getElementById('login-ajuda');
    sel.innerHTML = '<option value="">Carregando…</option>';
    try {
      const r = await fetchOriginal('/api/auth', { cache: 'no-store' });
      const dados = await lerJson(r);
      if (!r.ok) throw new Error(dados.error || 'Falha ao carregar usuários');
      sel.innerHTML = '';
      if (dados.configuracaoInicial) {
        sel.add(new Option('Configuração inicial (admin)', 'admin'));
        ajuda.textContent = 'Primeiro acesso: entre com o PIN definido na variável ADMIN_BOOTSTRAP_PIN do Netlify e crie os usuários da presidência.';
        ajuda.hidden = false;
      } else {
        ajuda.hidden = true;
      }
      if (dados.usuarios.length && !dados.configuracaoInicial) sel.add(new Option('Selecione seu nome…', ''));
      dados.usuarios.forEach(u => sel.add(new Option(u.nome, u.id)));
      const ultimo = localStorage.getItem(CHAVE + '-ultimo');
      if (ultimo && [...sel.options].some(o => o.value === ultimo)) sel.value = ultimo;
    } catch (e) {
      sel.innerHTML = '<option value="">Sem conexão</option>';
      msg.textContent = navigator.onLine ? (e.message || 'Não foi possível falar com o servidor.') : 'Sem internet. Conecte-se para entrar.';
      msg.className = 'login-msg erro';
    }
    setTimeout(() => document.getElementById(sel.value ? 'login-pin' : 'login-usuario').focus(), 50);
  }

  async function entrar(ev) {
    ev?.preventDefault();
    const usuario = document.getElementById('login-usuario').value;
    const pinEl = document.getElementById('login-pin');
    const msg = document.getElementById('login-msg');
    const btn = document.getElementById('login-btn');
    if (!usuario) { msg.textContent = 'Selecione seu nome.'; msg.className = 'login-msg erro'; return; }
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      const r = await fetchOriginal('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'entrar', usuario, pin: pinEl.value }),
      });
      const dados = await lerJson(r);
      if (!r.ok) throw new Error(dados.error || 'Não foi possível entrar.');
      guardar({ token: dados.token, exp: dados.exp, usuario: dados.usuario, bootstrap: !!dados.bootstrap });
      localStorage.setItem(CHAVE + '-ultimo', usuario);
      pinEl.value = '';
      document.getElementById('login-overlay').classList.remove('open');
      document.body.classList.remove('sem-sessao');
      atualizarChip();
      if (dados.bootstrap) {
        setTimeout(() => abrirUsuarios('Crie agora os usuários. Marque pelo menos uma pessoa como administrador — depois disso o acesso de configuração inicial deixa de funcionar.'), 200);
      }
      if (appIniciado) aoEntrar.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
      resolverPronto();
    } catch (e) {
      msg.textContent = e.message; msg.className = 'login-msg erro';
      pinEl.select();
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  }

  // ── chip do usuário + menu ────────────────────
  function atualizarChip() {
    const chip = document.getElementById('user-chip');
    if (!chip) return;
    chip.hidden = !sessao;
    document.getElementById('user-chip-nome').textContent = sessao?.usuario?.nome || '';
    document.querySelectorAll('.so-admin').forEach(el => { el.hidden = sessao?.usuario?.role !== 'admin'; });
  }
  function alternarMenu(ev) {
    ev?.stopPropagation();
    document.getElementById('user-menu').classList.toggle('open');
  }
  document.addEventListener('click', e => {
    const m = document.getElementById('user-menu');
    if (m && !e.target.closest('#user-chip')) m.classList.remove('open');
  });

  async function chamar(acao, extra = {}) {
    const r = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao, ...extra }),
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(dados.error || 'Falha na operação');
    return dados;
  }

  function sair() {
    if (typeof Demo !== 'undefined' && Demo.ativo) return Demo.sair();
    guardar(null);
    atualizarChip();
    mostrarLogin();
  }
  async function sairDeTodos() {
    if (typeof Demo !== 'undefined' && Demo.ativo) return Demo.sair();
    if (!confirm('Encerrar sua sessão em todos os aparelhos?')) return;
    try { await chamar('sairDeTodos'); } catch {}
    sair();
  }

  async function trocarPin() {
    const atual = prompt('PIN atual:');
    if (atual === null) return;
    const novo = prompt('Novo PIN (6 a 10 dígitos):');
    if (novo === null) return;
    if (novo !== prompt('Repita o novo PIN:')) return alert('Os PINs não conferem.');
    try {
      const r = await chamar('trocarPin', { pinAtual: atual, pinNovo: novo });
      alert(r.mensagem);
      sair();
    } catch (e) { alert(e.message); }
  }

  // ── administração de usuários ─────────────────
  async function abrirUsuarios(aviso) {
    const ov = document.getElementById('usuarios-overlay');
    ov.classList.add('open');
    const av = document.getElementById('usuarios-aviso');
    av.textContent = aviso || '';
    av.hidden = !aviso;
    await listarUsuarios();
  }
  function fecharUsuarios() {
    document.getElementById('usuarios-overlay').classList.remove('open');
    if (sessao?.bootstrap) {
      // Se um admin já foi criado, o token de configuração inicial deixou de valer.
      fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'eu' }) });
    }
  }
  async function listarUsuarios() {
    const box = document.getElementById('usuarios-lista');
    box.textContent = 'Carregando…';
    try {
      const { usuarios } = await chamar('listar');
      box.innerHTML = '';
      if (!usuarios.length) { box.innerHTML = '<div class="empty">Nenhum usuário cadastrado ainda.</div>'; return; }
      usuarios.forEach(u => {
        const linha = document.createElement('div');
        linha.className = 'usuario-linha';
        const info = document.createElement('div');
        info.innerHTML = `<strong></strong><span class="usuario-meta"></span>`;
        info.querySelector('strong').textContent = u.nome;
        info.querySelector('.usuario-meta').textContent = `${u.id} · ${u.role === 'admin' ? 'Administrador' : 'Membro'}${u.ativo ? '' : ' · inativo'}`;
        const acoes = document.createElement('div');
        acoes.className = 'usuario-acoes';
        acoes.append(
          botao('🔑 PIN', () => redefinirPin(u)),
          botao(u.role === 'admin' ? '⬇ Membro' : '⬆ Admin', () => salvar({ id: u.id, nome: u.nome, role: u.role === 'admin' ? 'membro' : 'admin' })),
          botao('🗑', () => remover(u)),
        );
        linha.append(info, acoes);
        box.append(linha);
      });
    } catch (e) { box.textContent = e.message; }
  }
  function botao(txt, fn) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn-mini'; b.textContent = txt; b.onclick = fn;
    return b;
  }
  async function salvar(dados) {
    try { await chamar('salvar', dados); await listarUsuarios(); showToastSeguro('✓ Usuário salvo'); }
    catch (e) {
      if (/Sessão|configuração inicial/i.test(e.message) && sessao?.bootstrap) {
        alert('Administrador criado. Agora entre com o seu usuário e PIN.');
        fecharUsuarios(); sair(); return;
      }
      alert(e.message);
    }
  }
  async function novoUsuario(ev) {
    ev.preventDefault();
    const f = ev.target;
    const dados = { nome: f.nome.value.trim(), role: f.role.value, pin: f.pin.value };
    if (!/^\d{6,10}$/.test(dados.pin)) return alert('O PIN deve ter de 6 a 10 dígitos.');
    await salvar(dados);
    f.reset();
    if (sessao?.bootstrap && dados.role === 'admin') {
      alert('Administrador criado. Entre agora com o seu usuário e PIN.');
      fecharUsuarios(); sair();
    }
  }
  async function redefinirPin(u) {
    const pin = prompt(`Novo PIN para ${u.nome} (6 a 10 dígitos):`);
    if (!pin) return;
    try { await chamar('redefinirPin', { id: u.id, pin }); showToastSeguro('✓ PIN redefinido. As sessões dessa pessoa foram encerradas.'); }
    catch (e) { alert(e.message); }
  }
  async function remover(u) {
    if (!confirm(`Remover o acesso de ${u.nome}?`)) return;
    try { await chamar('remover', { id: u.id }); await listarUsuarios(); }
    catch (e) { alert(e.message); }
  }
  function showToastSeguro(m) { if (typeof showToast === 'function') showToast(m); }

  // ── inicialização ─────────────────────────────
  function iniciar() {
    atualizarChip();
    if (sessao) resolverPronto();
    else mostrarLogin();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  return {
    pronto,
    entrar, sair, sairDeTodos, trocarPin, alternarMenu,
    abrirUsuarios, fecharUsuarios, novoUsuario,
    usuario: () => sessao?.usuario || null,
    ehAdmin: () => sessao?.usuario?.role === 'admin',
    aoEntrar: fn => aoEntrar.push(fn),
    marcarAppIniciado: () => { appIniciado = true; },
  };
})();
