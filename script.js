const CRED_KEY = 'hdo_admin_cred';
const DATA_KEY = 'hdo_chamados';
const defaultCred = { usuario: 'admin', senha: 'admin123' };

function getCred() {
  const raw = localStorage.getItem(CRED_KEY);
  return raw ? JSON.parse(raw) : defaultCred;
}

function saveCred(cred) {
  localStorage.setItem(CRED_KEY, JSON.stringify(cred));
}

// Chamados
function getChamados() {
  const raw = localStorage.getItem(DATA_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveChamados(lista) {
  localStorage.setItem(DATA_KEY, JSON.stringify(lista));
}

// Estado de sessão (não persiste no reload propositalmente)
let adminLogado = false;

// 2. NAVEGAÇÃO ENTRE PÁGINAS
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const topbarTitle = document.getElementById('topbar-title');

const pageTitles = {
  'inicio': 'Início',
  'abrir-chamado': 'Abrir Chamado',
  'chamados': 'Chamados',
  'membros': 'Área de Membros',
  'admin': 'Área Administrador',
};

function navigateTo(pageId) {
  // Atualiza nav
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });
  // Atualiza pages
  pages.forEach(page => {
    page.classList.toggle('active', page.id === 'page-' + pageId);
  });
  // Atualiza título
  topbarTitle.textContent = pageTitles[pageId] || '';

  // Ações por página
  if (pageId === 'inicio') renderInicio();
  if (pageId === 'chamados') renderChamados('todos');
  if (pageId === 'membros') document.getElementById('resultado-membro').innerHTML = '';
  if (pageId === 'admin' && adminLogado) renderAdmin('todos');

  // Fecha sidebar no mobile
  document.getElementById('sidebar').classList.remove('mobile-open');
}

navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});
 
// 3. SIDEBAR — COLAPSAR / MOBILE
const sidebar = document.getElementById('sidebar');
const mainWrapper = document.getElementById('main-wrapper');
const sidebarToggle = document.getElementById('sidebar-toggle');
const menuBtn = document.getElementById('menu-btn');

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  mainWrapper.classList.toggle('expanded');
});

menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('mobile-open');
});

// 4. TOPBAR — DATA E HORA
function atualizarData() {
  const el = document.getElementById('topbar-date');
  const agora = new Date();
  el.textContent = agora.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
}

atualizarData();
setInterval(atualizarData, 60000);

// 5. TOAST NOTIFICATION
let toastTimer = null;

function showToast(mensagem, tipo = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = 'toast show ' + tipo;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 3200);
}

// 6. ABRIR CHAMADO
document.getElementById('btn-abrir-chamado').addEventListener('click', () => {
  const nome = document.getElementById('inp-nome').value.trim();
  const setor = document.getElementById('inp-setor').value.trim();
  const urgencia = document.getElementById('inp-urgencia').value;
  const material = document.getElementById('inp-material').value.trim();
  const obs = document.getElementById('inp-obs').value.trim();

  // Validação
  if (!nome || !setor || !urgencia || !material) {
    showToast('Preencha todos os campos obrigatórios.', 'erro');
    return;
  }

  const chamados = getChamados();

  const novoChamado = {
    id: Date.now(),
    nome,
    setor,
    urgencia,
    material,
    obs,
    status: 'Aberto',
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    resposta: '',
  };

  chamados.push(novoChamado);
  saveChamados(chamados);

  // Limpar formulário
  document.getElementById('inp-nome').value = '';
  document.getElementById('inp-setor').value = '';
  document.getElementById('inp-urgencia').value = '';
  document.getElementById('inp-material').value = '';
  document.getElementById('inp-obs').value = '';

  showToast('Chamado aberto com sucesso! ✅', 'sucesso');
  setTimeout(() => navigateTo('chamados'), 900);
});

// 7. RENDER — HELPERS
function badgeUrgencia(urgencia) {
  const map = {
    'Urgente': 'badge-urgente',
    'Médio': 'badge-medio',
    'Leve': 'badge-leve',
  };
  return `<span class="badge ${map[urgencia] || ''}">${urgencia}</span>`;
}

function badgeStatus(status) {
  const map = {
    'Aberto': 'badge-aberto',
    'Em Atendimento': 'badge-atendimento',
    'Finalizado': 'badge-finalizado',
  };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

function cardChamado(c, exibirAcoes = false) {
  const acoesHtml = exibirAcoes ? `
    <div class="admin-card-actions">
      ${c.status !== 'Em Atendimento' && c.status !== 'Finalizado'
      ? `<button class="btn-status btn-atendimento" onclick="mudarStatus(${c.id}, 'Em Atendimento')">🔧 Em Atendimento</button>` : ''}
      ${c.status !== 'Finalizado'
      ? `<button class="btn-status btn-finalizar" onclick="mudarStatus(${c.id}, 'Finalizado')">✅ Finalizar</button>` : ''}
      ${c.status === 'Finalizado'
      ? `<button class="btn-status btn-reabrir" onclick="mudarStatus(${c.id}, 'Aberto')">🔄 Reabrir</button>` : ''}
      <button class="btn-status btn-deletar" onclick="deletarChamado(${c.id})">🗑 Excluir</button>
    </div>` : '';

  const respostaHtml = c.resposta
    ? `<div class="chamado-card-desc"><strong>Resposta do admin:</strong> ${c.resposta}</div>` : '';

  return `
    <div class="chamado-card" id="card-${c.id}">
      <div class="chamado-card-header">
        <div>
          <div class="chamado-card-title">${c.nome} — ${c.setor}</div>
          <div class="chamado-card-meta">
            <span>📅 ${c.data} às ${c.hora}</span>
            <span>ID: #${String(c.id).slice(-5)}</span>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
          ${badgeUrgencia(c.urgencia)}
          ${badgeStatus(c.status)}
        </div>
      </div>
      <div class="chamado-card-desc">${c.material}</div>
      ${c.obs ? `<div class="chamado-card-desc" style="margin-top:6px;font-style:italic;color:#6b7c93;">${c.obs}</div>` : ''}
      ${respostaHtml}
      ${acoesHtml}
    </div>`;
}

function renderLista(containerId, lista, exibirAcoes = false) {
  const el = document.getElementById(containerId);
  if (!lista.length) {
    el.innerHTML = '<p class="empty-msg">Nenhum chamado encontrado.</p>';
    return;
  }
  el.innerHTML = lista.map(c => cardChamado(c, exibirAcoes)).join('');
}

// 8. INÍCIO — STATS E RECENTES
function renderInicio() {
  const chamados = getChamados();

  const abertos = chamados.filter(c => c.status === 'Aberto').length;
  const atendimento = chamados.filter(c => c.status === 'Em Atendimento').length;
  const finalizados = chamados.filter(c => c.status === 'Finalizado').length;

  document.getElementById('num-aberto').textContent = abertos;
  document.getElementById('num-atendimento').textContent = atendimento;
  document.getElementById('num-finalizado').textContent = finalizados;

  // Últimos 5
  const recentes = [...chamados].reverse().slice(0, 5);
  renderLista('lista-recentes', recentes, false);
}

// 9. CHAMADOS — LISTAGEM COM FILTRO
function renderChamados(filtro) {
  const chamados = getChamados();
  const lista = filtro === 'todos'
    ? [...chamados].reverse()
    : [...chamados].filter(c => c.status === filtro).reverse();
  renderLista('lista-chamados', lista, false);
}

// Botões de filtro da página Chamados
document.querySelectorAll('[data-filtro]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filtro]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderChamados(btn.dataset.filtro);
  });
});

// 10. MEMBROS — BUSCA
document.getElementById('btn-buscar-membro').addEventListener('click', () => {
  const nome = document.getElementById('membro-nome').value.trim().toLowerCase();
  const chamados = getChamados();

  if (!nome) {
    showToast('Digite seu nome para buscar.', 'erro');
    return;
  }

  const meus = chamados
    .filter(c => c.nome.toLowerCase().includes(nome))
    .reverse();

  renderLista('resultado-membro', meus, false);

  if (!meus.length) {
    showToast('Nenhum chamado encontrado para este nome.', 'info');
  }
});

// 11. ADMIN — LOGIN
document.getElementById('btn-login').addEventListener('click', () => {
  const usuario = document.getElementById('admin-usuario').value.trim();
  const senha = document.getElementById('admin-senha').value;
  const cred = getCred();
  const erroEl = document.getElementById('login-erro');

  if (usuario === cred.usuario && senha === cred.senha) {
    adminLogado = true;
    erroEl.style.display = 'none';

    // Exibe painel, esconde formulário de login
    document.getElementById('admin-login-card').style.display = 'none';
    document.getElementById('admin-painel').style.display = 'block';

    // Atualiza topbar
    document.getElementById('topbar-user-label').textContent = 'Admin';
    document.getElementById('topbar-user').style.fontWeight = '700';

    renderAdmin('todos');
    showToast('Bem-vindo, Administrador! 👋', 'sucesso');
  } else {
    erroEl.style.display = 'block';
    showToast('Credenciais inválidas.', 'erro');
  }
});

// Enter no campo senha
document.getElementById('admin-senha').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

// Mostrar/ocultar senha
document.getElementById('toggle-senha').addEventListener('click', () => {
  const input = document.getElementById('admin-senha');
  input.type = input.type === 'password' ? 'text' : 'password';
});

// 12. ADMIN — LOGOUT
document.getElementById('btn-logout').addEventListener('click', () => {
  adminLogado = false;

  document.getElementById('admin-login-card').style.display = 'block';
  document.getElementById('admin-painel').style.display = 'none';

  document.getElementById('admin-usuario').value = '';
  document.getElementById('admin-senha').value = '';
  document.getElementById('login-erro').style.display = 'none';

  document.getElementById('topbar-user-label').textContent = 'Visitante';

  showToast('Sessão encerrada.', 'info');
});

// 13. ADMIN — ALTERAR SENHA
document.getElementById('btn-alterar-senha').addEventListener('click', () => {
  const modal = document.getElementById('modal-senha');
  modal.style.display = 'flex';
  document.getElementById('senha-atual').value = '';
  document.getElementById('senha-nova').value = '';
  document.getElementById('senha-confirma').value = '';
  document.getElementById('senha-erro').style.display = 'none';
  document.getElementById('senha-ok').style.display = 'none';
});

document.getElementById('btn-fechar-modal').addEventListener('click', () => {
  document.getElementById('modal-senha').style.display = 'none';
});

document.getElementById('modal-senha').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-senha')) {
    document.getElementById('modal-senha').style.display = 'none';
  }
});

document.getElementById('btn-salvar-senha').addEventListener('click', () => {
  const atual = document.getElementById('senha-atual').value;
  const nova = document.getElementById('senha-nova').value;
  const confirma = document.getElementById('senha-confirma').value;
  const cred = getCred();
  const erroEl = document.getElementById('senha-erro');
  const okEl = document.getElementById('senha-ok');

  erroEl.style.display = 'none';
  okEl.style.display = 'none';

  if (atual !== cred.senha) {
    erroEl.textContent = 'Senha atual incorreta.';
    erroEl.style.display = 'block';
    return;
  }
  if (nova.length < 4) {
    erroEl.textContent = 'A nova senha deve ter ao menos 4 caracteres.';
    erroEl.style.display = 'block';
    return;
  }
  if (nova !== confirma) {
    erroEl.textContent = 'As senhas não coincidem.';
    erroEl.style.display = 'block';
    return;
  }

  saveCred({ usuario: cred.usuario, senha: nova });
  okEl.style.display = 'block';
  showToast('Senha alterada com sucesso! 🔐', 'sucesso');

  setTimeout(() => {
    document.getElementById('modal-senha').style.display = 'none';
  }, 1600);
});

// 14. ADMIN — RENDER PAINEL
function renderAdmin(filtro) {
  const chamados = getChamados();
  const lista = filtro === 'todos'
    ? [...chamados].reverse()
    : chamados.filter(c => c.status === filtro).reverse();
  renderLista('lista-admin', lista, true);
}

// Filtros do painel admin
document.querySelectorAll('[data-filtro-admin]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filtro-admin]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAdmin(btn.dataset.filtroAdmin);
  });
});

// 15. ADMIN — MUDAR STATUS
// (funções globais pois são chamadas via onclick no HTML gerado)
function mudarStatus(id, novoStatus) {
  const chamados = getChamados();
  const chamado = chamados.find(c => c.id === id);
  if (!chamado) return;

  chamado.status = novoStatus;
  saveChamados(chamados);

  showToast(`Status atualizado para: ${novoStatus}`, 'sucesso');
  renderAdmin(document.querySelector('[data-filtro-admin].active').dataset.filtroAdmin);
  renderInicio();
}

// 16. ADMIN — DELETAR CHAMADO
function deletarChamado(id) {
  const confirma = confirm('Tem certeza que deseja excluir este chamado?');
  if (!confirma) return;

  let chamados = getChamados();
  chamados = chamados.filter(c => c.id !== id);
  saveChamados(chamados);

  showToast('Chamado excluído.', 'info');
  renderAdmin(document.querySelector('[data-filtro-admin].active').dataset.filtroAdmin);
  renderInicio();
}

// 17. INICIALIZAÇÃO
navigateTo('inicio');