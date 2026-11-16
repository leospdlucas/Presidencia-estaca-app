// =============================================
// MODO DEMONSTRATIVO
// =============================================
// Permite mostrar o painel a outras pessoas sem login e sem dados reais.
//
// Garantias:
//  - Nenhuma chamada /api/* sai do navegador: todas são respondidas aqui,
//    por um "servidor" em memória com dados FICTÍCIOS.
//  - Os dados ficam no sessionStorage da aba: fechar a aba apaga tudo.
//  - A fila offline real não é enviada durante a demonstração.
//  - Nomes reais escritos no HTML (presidência, estaca, alas) são trocados
//    por nomes fictícios na tela.
//
// Entrar: botão na tela de login ou endereço com ?demo=1. Sair: faixa do topo.

const Demo = (() => {
  const FLAG = 'demo-estaca-ativo';
  const DADOS = 'demo-estaca-dados';
  const url = new URL(location.href);
  if (url.searchParams.get('demo') === '1') { try { sessionStorage.setItem(FLAG, '1'); } catch {} }
  let ativo = false;
  try { ativo = sessionStorage.getItem(FLAG) === '1'; } catch {}

  // ── datas (independente de util.js, que carrega depois) ──
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const hoje = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
  const dias = n => { const d = hoje(); d.setDate(d.getDate() + n); return iso(d); };
  const domingo = semanas => { const d = hoje(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + semanas * 7); return iso(d); };
  const tri = (deslocamento) => { const d = hoje(); d.setMonth(d.getMonth() + deslocamento * 3); return `${d.getFullYear()}-T${Math.ceil((d.getMonth() + 1) / 3)}`; };
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // ── nomes fictícios ──
  const ALAS = ['Ala Centro', 'Ala Jardim das Flores', 'Ala Vila Nova', 'Ala Boa Esperança', 'Ala Parque das Águas', 'Ala Santa Rita', 'Ala Primavera', 'Ala Monte Sião'];
  const TROCAS = [
    ['Estaca Nova Iguaçu', 'Estaca Exemplo'], ['Nova Iguaçu', 'Exemplo'],
    ['André Oliveira', 'Paulo Mendes'], ['Romilson Torres', 'Carlos Ribeiro'], ['Thiago Alves', 'Marcos Teixeira'], ['Fábio Sena', 'Rafael Duarte'],
    ['Pres. Oliveira', 'Pres. Mendes'], ['Cons. Torres', 'Cons. Ribeiro'], ['Cons. Alves', 'Cons. Teixeira'], ['Sec. Fábio', 'Sec. Rafael'],
    ['Oliveira', 'Mendes'], ['Torres', 'Ribeiro'], ['Alves', 'Teixeira'], ['Fábio', 'Rafael'], ['Léo Lucas', 'Equipe do painel'],
    ['Belford Roxo', 'Centro'], ['Jardim Metrópole', 'Jardim das Flores'], ['Jd. Metrópole', 'Jardim das Flores'], ['Queimados', 'Vila Nova'], ['Vilar dos Teles', 'Boa Esperança'],
    ['Miguel Couto', 'Parque das Águas'], ['Nilópolis', 'Santa Rita'], ['Rosa dos Ventos', 'Primavera'], ['Paracambí', 'Serra Azul'],
  ];
  const PRIMEIROS = ['Ana', 'Bruno', 'Camila', 'Daniel', 'Elisa', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Larissa', 'Mateus', 'Natália', 'Otávio', 'Priscila', 'Ricardo', 'Sofia', 'Tiago', 'Vanessa', 'William', 'Beatriz', 'Eduardo', 'Juliana', 'Lucas', 'Mariana', 'Pedro', 'Raquel', 'Samuel', 'Talita', 'Vitor'];
  const SOBRENOMES = ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Ferraz', 'Gomes', 'Holanda', 'Lima', 'Moraes', 'Nogueira', 'Pacheco', 'Quintela', 'Rezende', 'Siqueira', 'Tavares', 'Valente', 'Xavier', 'Zanetti', 'Campos'];
  let semente = 7;
  const aleat = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };
  const pegar = arr => arr[Math.floor(aleat() * arr.length)];
  const pessoa = () => `${pegar(PRIMEIROS)} ${pegar(SOBRENOMES)}`;

  // ── dados de exemplo ──
  function gerar() {
    semente = 7;
    const id = (p, i) => `${p}${i}`;
    const sumos = Array.from({ length: 12 }, (_, i) => i === 4 || i === 10
      ? { id: id('sc', i), nome: '', nomeAbrev: 'Vaga em Aberto', ala: '', dataDesignacao: '', imposicaoMaos: false, status: 'vago', alaDesignada: '', programasOrganizacoes: [], obs: 'Chamado em aberto', telefone: '' }
      : { id: id('sc', i), nome: pessoa(), ala: pegar(ALAS), dataDesignacao: dias(-200 * (i + 1)), imposicaoMaos: true, status: 'ativo', alaDesignada: ALAS[i % 8], programasOrganizacoes: i === 0 ? ['Presidente da Escola Dominical da Estaca'] : i === 1 ? ['Presidente dos Rapazes da Estaca'] : [], obs: '', telefone: '' });
    sumos.forEach(s => { if (s.nome) s.nomeAbrev = s.nome; });

    const agenda = [
      [2, '10:00', 'oliveira', 'Renovação de Recomendação', 0, 'confirmado'], [2, '10:30', 'oliveira', 'Entrevista', 1, 'pendente'],
      [2, '11:00', 'torres', 'Mentoria Missionária', 2, 'confirmado'], [9, '09:30', 'alves', 'Renovação de Recomendação', 3, 'pendente'],
      [9, '16:00', 'oliveira', 'Chamado', 4, 'confirmado'], [16, '10:10', 'torres', 'Endosso Eclesiástico', 5, 'pendente'],
      [-5, '10:00', 'alves', 'Renovação de Recomendação', 6, 'realizado'],
    ].map(([d, hora, who, action, a, status], i) => ({ id: id('ag', i), date: dias(d), hora, who, action, entrevistado: pessoa(), ala: ALAS[a], local: 'Centro de estaca', status, obs: '' }));

    const calendario = [[10, 'visit', 'Visita oficial à Ala Centro e à Ala Vila Nova'], [17, 'conselho', 'Reunião do sumo conselho · 07h'], [24, 'train', 'Treinamento de secretários'],
      [31, 'conf', 'Devocional de jovens adultos'], [45, 'audit', 'Auditoria financeira'], [70, 'conf', 'Conferência de estaca']].map(([d, tag, text], i) => {
      const dt = new Date(dias(d) + 'T12:00:00');
      return { id: id('cal', i), month: MESES[dt.getMonth()], day: dt.getDate(), dow: DOW[dt.getDay()], tags: [tag], text };
    });

    const designacoes = [
      ['Discurso na reunião sacramental', 'Pres. Paulo Mendes', 'Presidente da Estaca', 7, 'Ala Primavera', 'confirmado'],
      ['Treinamento de presidências de quórum de élderes', 'Carlos Ribeiro', '1º Conselheiro', 12, 'Centro de estaca', 'pendente'],
      ['Visita ao bispado da Ala Monte Sião', 'Marcos Teixeira', '2º Conselheiro', 4, 'Ala Monte Sião', 'pendente'],
      ['Preparar relatório trimestral', 'Rafael Duarte', 'Secretário da Estaca', -3, 'Escritório', 'pendente'],
    ].map(([oque, quem, chamado, d, onde, status], i) => ({ id: id('ds', i), oque, quem, chamado, quando: dias(d), hora: '19:00', onde, obs: '', status }));

    const reunioes = [
      ['Reunião de Presidência da Estaca', -3, ['Chamados em andamento', 'Preparação da conferência de estaca', 'Recomendações de ordenação a élder']],
      ['Reunião do Sumo Conselho', -10, ['Apoio às decisões de chamados', 'Relato de ex-missionário recém-chegado', 'Prestação de contas das designações']],
      ['Reunião do Conselho da Estaca', -24, ['Plano de emergência da estaca', 'Serviço na comunidade', 'Relatórios das organizações']],
    ].map(([titulo, d, assuntos], i) => ({ id: id('rn', i), titulo, data: dias(d), horaInicio: '19:00', horaTermino: '20:30', presidida: 'Pres. Paulo Mendes', dirigida: 'Pres. Paulo Mendes', oracaoAbertura: pessoa(), oracaoEncerramento: pessoa(), pensamento: '', treinamento: '', outrosAssuntos: '', assuntos: assuntos.map(t => ({ titulo: t, responsavel: '', texto: 'Exemplo de registro: decisões e designações, sem assuntos confidenciais.' })) }));

    const confDom = domingo(10);
    const sessoes = ['autoridade', 'lideranca', 'sabado', 'geral'].map(tipo => ({ id: tipo, tipo, hora: { autoridade: '15:00', lideranca: '16:00', sabado: '19:00', geral: '10:00' }[tipo], local: '', dirige: tipo === 'geral' ? 'Pres. Paulo Mendes' : 'Pres. Carlos Ribeiro', oracaoAbertura: '', oracaoEncerramento: '', hinoAbertura: tipo === 'geral' ? 'Hino 2 — O Espírito de Deus' : '', hinoIntermediario: '', hinoEncerramento: '', musicaEspecial: tipo === 'geral' ? 'Coro da estaca' : '', regente: '', organista: '', coro: '', obs: '', oradores: [] }));
    sessoes[3].oradores = [
      { id: 'o1', nome: pessoa(), chamado: 'Membro da Ala Centro', origem: 'ala', ala: 'Ala Centro', tema: 'Achegar-se a Cristo pelos convênios', minutos: '8', status: 'confirmado' },
      { id: 'o2', nome: pessoa(), chamado: 'Presidente da Sociedade de Socorro da Estaca', origem: 'estaca', tema: 'Ministrar como o Salvador', minutos: '12', status: 'aceitou' },
      { id: 'o3', nome: 'Paulo Mendes', chamado: 'Presidente da Estaca', origem: 'estaca', tema: 'Achegar-se a Cristo pelos convênios', minutos: '20', status: 'confirmado' },
    ];
    sessoes[2].oradores = [{ id: 'o4', nome: pessoa(), chamado: 'Sumo Conselheiro', origem: 'estaca', tema: 'Templo e história da família', minutos: '15', status: 'convidado' }];
    const conferencias = [{ id: 'cf1', titulo: 'Conferência de Estaca — exemplo', dataDomingo: confDom, presidida: 'autoridade', autoridadeNome: 'Élder Antônio Fictício', autoridadeCargo: 'Setenta de Área', tema: 'Achegar-se a Cristo pelos convênios', local: 'Centro de estaca', apoioAnual: true, programaAprovado: false, checklist: { 'temas-aut': true, oradores: true }, sessoes, apoios: [], logistica: [{ id: 'l0', tarefa: 'Arrumar as cadeiras', responsavel: 'Quórum de élderes da Ala Centro', feito: true }, { id: 'l1', tarefa: 'Recepcionar as pessoas', responsavel: 'Moças da estaca', feito: false }, { id: 'l2', tarefa: 'Limpar o prédio', responsavel: '', feito: false }], status: 'planejamento' }];

    const chamados = [
      { id: 'ch1', tipo: 'chamado', nome: pessoa(), cargo: 'sumo-conselheiro', etapas: { recomendacao: dias(-20), 'aprovacao-pres': dias(-14) }, status: 'andamento', responsavel: 'Pres. Mendes' },
      { id: 'ch2', tipo: 'chamado', nome: pessoa(), cargo: 'pres-qe', ala: 'Ala Santa Rita', etapas: { recomendacao: dias(-30), 'aprovacao-pres': dias(-25), 'aprovacao-sc': dias(-12), entrevista: dias(-6) }, status: 'andamento' },
      { id: 'ch3', tipo: 'ordenacao-elder', nome: pessoa(), ala: 'Ala Vila Nova', etapas: { recomendacao: dias(-15), 'entrevista-bispo': dias(-10), 'entrevista-estaca': dias(-4), 'aprovacao-sc': dias(-2) }, status: 'andamento' },
      { id: 'ch4', tipo: 'ordenacao-elder', nome: pessoa(), ala: 'Ala Primavera', etapas: { recomendacao: dias(-5) }, status: 'andamento' },
      { id: 'ch5', tipo: 'desobrigacao', nome: pessoa(), cargo: 'sumo-conselheiro', etapas: { decisao: dias(-8) }, status: 'andamento' },
    ];

    const cargosAla = ['Bispo', 'Presidente do Quórum de Élderes', 'Presidente da Sociedade de Socorro', 'Presidente das Moças', 'Presidente da Primária'];
    const lideres = [];
    ALAS.forEach((ala, i) => cargosAla.slice(0, i % 2 ? 3 : 5).forEach((cargo, j) => lideres.push({ id: `ld${i}-${j}`, nome: pessoa(), cargo, ala, dataApoio: dias(-(300 + 170 * ((i + j) % 12))), protecaoEm: (i + j) % 4 === 0 ? '' : dias(-(200 + 100 * ((i * j) % 11))), ativo: true })));
    lideres.push({ id: 'ld-pres', nome: 'Paulo Mendes', cargo: 'Presidente da Estaca', ala: '', dataApoio: dias(-1400), ativo: true });

    const missionarios = [
      { id: 'ms1', nome: 'Élder ' + pegar(SOBRENOMES), ala: 'Ala Centro', tipo: 'tempo-integral', missao: 'Missão Brasil Exemplo Norte', entradaCTM: dias(-500), retornoPrevisto: dias(20), etapas: { recomendacao: dias(-620), entrevista: dias(-600), papeis: dias(-590), chamado: dias(-560), designacao: dias(-502), campo: dias(-500) } },
      { id: 'ms2', nome: 'Síster ' + pegar(SOBRENOMES), ala: 'Ala Boa Esperança', tipo: 'tempo-integral', missao: 'Missão Brasil Exemplo Sul', entradaCTM: dias(40), retornoPrevisto: dias(40 + 548), etapas: { recomendacao: dias(-60), entrevista: dias(-50), papeis: dias(-45), chamado: dias(-10) } },
      { id: 'ms3', nome: pessoa(), ala: 'Ala Monte Sião', tipo: 'servico', missao: 'Centro de história da família', etapas: { recomendacao: dias(-7) } },
    ];

    const mes = dias(0).slice(0, 7);
    const doms = []; { const d = new Date(mes + '-01T12:00:00'); while (d.getMonth() === Number(mes.slice(5)) - 1) { if (d.getDay() === 0) doms.push(iso(d)); d.setDate(d.getDate() + 1); } }
    const discursos = ALAS.slice(0, 5).map((ala, i) => ({ id: id('dc', i), data: doms[i % doms.length], ala, orador: sumos.filter(s => s.nome)[i].nome, chamado: 'Sumo Conselheiro', tema: '', status: i < 2 ? 'realizado' : 'designado' }));

    const contatos = [];
    ALAS.slice(0, 6).forEach((ala, i) => contatos.push({ id: id('ct', i), tipo: 'entrevista-bispo', ala, data: dias(-(20 + i * 25)), por: 'Pres. Mendes' }));
    ALAS.slice(0, 4).forEach((ala, i) => contatos.push({ id: id('cq', i), tipo: 'sc-quorum', ala, data: dias(-(15 + i * 30)), por: 'Sumo conselheiro' }));
    contatos.push({ id: 'cp1', tipo: 'patriarca-reuniao', ala: '', data: dias(-120), por: 'Pres. Mendes' });

    const base = [[268, 22, 108, 19], [251, 18, 96, 14], [340, 29, 142, 26], [430, 36, 168, 31], [262, 20, 99, 16], [328, 25, 131, 21], [255, 21, 101, 18], [305, 24, 117, 20]];
    const crescimento = [];
    [-4, -3, -2, -1].forEach((q, k) => ALAS.forEach((ala, i) => {
      const f = 0.94 + k * 0.02; const p = tri(q);
      crescimento.push({ id: `ind-demo-${i}-${p}`, tipo: 'indicador', ala, periodo: p, membros: Math.round(base[i][0] * f), sm: Math.round(base[i][1] * f), adultos: Math.round(base[i][2] * f), jovens: Math.round(base[i][3] * f), batismos: (i + k) % 3 });
    }));
    crescimento.push({ id: 'cen1', tipo: 'cenario', nome: 'Exemplo: norte × sul', atribuicao: Object.fromEntries(ALAS.map((a, i) => [a, i < 4 ? 'A' : 'B'])), divisoes: [], nomeA: 'Estaca Exemplo', nomeB: 'Estaca Exemplo Sul' });
    crescimento.push({ id: 'mt1', tipo: 'meta', ala: 'Ala Jardim das Flores', indicador: 'sm', alvo: 20, prazo: tri(2), acoes: 'Preparar élderes; ministrar às famílias em retorno' });

    const membros = [];
    ALAS.forEach(ala => { for (let i = 0; i < 25; i++) membros.push({ name: pessoa(), gender: aleat() > 0.5 ? 'F' : 'M', ala }); });

    const notas = [{ id: 'nt1', titulo: 'Ideias para a conferência', texto: 'Convidar o coro das Moças para o número especial.', escopo: 'compartilhada', criadaEm: new Date().toISOString(), autor: 'Pres. Mendes' }];

    const colecoes = { agenda, calendar: calendario, designacoes, reunioes, organograma: sumos, notas, conferencias, chamados, lideres, missionarios, discursos, contatos, crescimento };
    Object.values(colecoes).forEach(l => l.forEach(x => { x._rev = x._rev || 1; x.criadoPor = x.criadoPor || 'Demonstração'; }));
    return {
      colecoes,
      config: { nomes: { 'nome-pres': 'Paulo Mendes', 'nome-c1e': 'Carlos Ribeiro', 'nome-c2e': 'Marcos Teixeira', 'nome-sec-est': 'Rafael Duarte', 'nome-sec-exec': 'Gustavo Prado' }, alas: ALAS, escalaDiscursos: { frequencia: 'mensal' } },
      membros,
      usuarios: [{ id: 'paulo-mendes', nome: 'Pres. Paulo Mendes', role: 'admin', ativo: true }, { id: 'carlos-ribeiro', nome: 'Carlos Ribeiro', role: 'membro', ativo: true }, { id: 'rafael-duarte', nome: 'Rafael Duarte', role: 'admin', ativo: true }],
    };
  }

  // ── "servidor" em memória ──
  let banco = null;
  function abrirBanco() {
    if (banco) return banco;
    try { banco = JSON.parse(sessionStorage.getItem(DADOS) || 'null'); } catch { banco = null; }
    if (!banco) { banco = gerar(); guardar(); }
    return banco;
  }
  function guardar() { try { sessionStorage.setItem(DADOS, JSON.stringify(banco)); } catch {} }
  const resp = (dados, status = 200) => new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } });

  async function responder(entrada, init = {}) {
    const u = new URL(typeof entrada === 'string' ? entrada : entrada.url, location.href);
    const metodo = (init.method || (entrada instanceof Request ? entrada.method : 'GET')).toUpperCase();
    let corpo = {};
    try { corpo = init.body ? JSON.parse(init.body) : {}; } catch {}
    const nome = u.pathname.replace(/^\/(api|\.netlify\/functions)\//, '').replace(/\/$/, '');
    const id = u.searchParams.get('id');
    const b = abrirBanco();
    await new Promise(r => setTimeout(r, 60)); // simula a rede

    if (nome === 'auth') {
      if (metodo === 'GET') return resp({ usuarios: b.usuarios.map(x => ({ id: x.id, nome: x.nome })), configuracaoInicial: false });
      if (corpo.acao === 'eu') return resp({ usuario: sessao().usuario });
      if (corpo.acao === 'listar') return resp({ usuarios: b.usuarios });
      if (corpo.acao === 'salvar') {
        const novo = { id: (corpo.id || corpo.nome || 'usuario').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'), nome: corpo.nome, role: corpo.role || 'membro', ativo: true };
        b.usuarios = b.usuarios.filter(x => x.id !== novo.id).concat(novo); guardar();
        return resp({ usuario: novo });
      }
      if (corpo.acao === 'remover') { b.usuarios = b.usuarios.filter(x => x.id !== corpo.id); guardar(); return resp({ ok: true }); }
      if (corpo.acao === 'trocarPin') return resp({ ok: true, mensagem: 'Na demonstração o PIN não é alterado.' });
      return resp({ ok: true });
    }
    if (nome === 'config') {
      if (metodo === 'PUT') { b.config = { ...b.config, ...corpo }; guardar(); }
      return resp(b.config);
    }
    if (nome === 'membros') {
      if (metodo === 'PUT') { b.membros = (Array.isArray(corpo) ? corpo : []).map(m => ({ name: m.name || m.nome || '', gender: m.gender || '', ala: m.ala || m.unidade || '' })).filter(m => m.name); guardar(); }
      return resp(b.membros);
    }
    const lista = b.colecoes[nome];
    if (!lista) return resp({ error: 'Recurso não existe na demonstração' }, 404);
    const agora = new Date().toISOString();
    if (metodo === 'GET') {
      if (id) { const it = lista.find(x => x.id === id); return it ? resp(it) : resp({ error: 'Item não encontrado' }, 404); }
      return resp(lista);
    }
    if (metodo === 'POST') {
      if (corpo.id && lista.find(x => x.id === corpo.id)) return resp(lista.find(x => x.id === corpo.id), 201);
      const it = { ...corpo, id: corpo.id || 'd' + Date.now().toString(36), _rev: 1, criadoEm: agora, criadoPor: 'Visitante' };
      delete it._pendente;
      lista.push(it); guardar();
      return resp(it, 201);
    }
    if (metodo === 'PUT') {
      const i = lista.findIndex(x => x.id === id);
      if (i < 0) return resp({ error: 'Item não encontrado' }, 404);
      if (Number.isInteger(corpo._rev) && corpo._rev !== (lista[i]._rev || 0)) return resp({ error: 'Este item foi alterado. Recarregue.', atual: lista[i] }, 409);
      const { _rev, ...resto } = corpo;
      lista[i] = { ...lista[i], ...resto, id, _rev: (lista[i]._rev || 0) + 1, atualizadoEm: agora, atualizadoPor: 'Visitante' };
      guardar();
      return resp(lista[i]);
    }
    if (metodo === 'DELETE') { b.colecoes[nome] = lista.filter(x => x.id !== id); guardar(); return resp({ ok: true }); }
    return resp({ error: 'Método não permitido' }, 405);
  }

  function sessao() {
    return { token: 'demo', exp: Date.now() + 864e5, usuario: { id: 'visitante', nome: 'Visitante (demonstração)', role: 'admin' }, demo: true };
  }

  // ── entrar / sair / reiniciar ──
  function entrar() {
    try { sessionStorage.setItem(FLAG, '1'); sessionStorage.removeItem(DADOS); } catch {}
    location.href = '/?demo=1';
  }
  function sair() {
    try { sessionStorage.removeItem(FLAG); sessionStorage.removeItem(DADOS); } catch {}
    location.href = '/';
  }
  function reiniciar() {
    if (!confirm('Apagar as alterações feitas na demonstração e voltar aos dados de exemplo?')) return;
    try { sessionStorage.removeItem(DADOS); } catch {}
    location.reload();
  }

  // ── troca de nomes reais escritos no HTML ──
  function trocarTexto(txt) {
    let t = txt;
    for (const [de, para] of TROCAS) if (t.includes(de)) t = t.split(de).join(para);
    return t;
  }
  function anonimizarPagina() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (walker.nextNode()) nos.push(walker.currentNode);
    nos.forEach(n => { const novo = trocarTexto(n.nodeValue); if (novo !== n.nodeValue) n.nodeValue = novo; });
    document.querySelectorAll('[placeholder],[title]').forEach(el => {
      ['placeholder', 'title'].forEach(a => { const v = el.getAttribute(a); if (v) { const nv = trocarTexto(v); if (nv !== v) el.setAttribute(a, nv); } });
    });
    document.querySelectorAll('select option').forEach(o => { const nv = trocarTexto(o.textContent); if (nv !== o.textContent) { o.textContent = nv; if (!o.hasAttribute('value')) o.value = nv; } });
    document.title = trocarTexto(document.title) + ' — demonstração';
  }

  function montarFaixa() {
    document.body.classList.add('modo-demo');
    const faixa = document.createElement('div');
    faixa.id = 'faixa-demo';
    faixa.setAttribute('role', 'status');
    faixa.innerHTML = '<span>👀 <strong>Modo demonstrativo</strong> — dados fictícios, nada é salvo no servidor</span>' +
      '<span class="faixa-demo-acoes"><button type="button" onclick="Demo.reiniciar()">↺ Reiniciar</button><button type="button" onclick="Demo.sair()">Sair</button></span>';
    document.body.prepend(faixa);
  }

  if (ativo) {
    document.addEventListener('DOMContentLoaded', () => {
      montarFaixa();
      anonimizarPagina();
      // A fila offline real nunca é enviada durante a demonstração
      if (typeof enviarFilaPendente === 'function') window.enviarFilaPendente = async () => {};
      if (typeof whoLabel === 'function') { const original = whoLabel; window.whoLabel = w => trocarTexto(original(w)); }
    });
  }

  return { get ativo() { return ativo; }, responder, sessao, entrar, sair, reiniciar, trocarTexto };
})();
