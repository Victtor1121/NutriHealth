// personal.js - versão refatorada, única e consistente

document.addEventListener("DOMContentLoaded", async () => {
  const nomeEl = document.getElementById("perfil-nome");
  const tipoEl = document.getElementById("perfil-tipo");
  const iconEl = document.getElementById("perfil-icon");

  try {
    const response = await fetch("perfil-data.php"); // caminho relativo ao HTML
    const data = await response.json();

    if (data.erro) {
      nomeEl.textContent = "Visitante";
      tipoEl.textContent = "Não logado";
      iconEl.innerHTML = `<i class="fa fa-user-md" aria-hidden="true"></i>`;
      return;
    }

    // Preenche informações
    nomeEl.textContent = data.nome;
    tipoEl.textContent = "Atendimento " + data.tipo;

    // Atualiza ícone se houver imagem
    if (data.imagem) {
      iconEl.innerHTML = `<img src="${data.imagem}" alt="Foto de perfil" class="perfil-foto">`;
    } else {
      iconEl.innerHTML = `<i class="fa fa-user-md" aria-hidden="true"></i>`;
    }
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    nomeEl.textContent = "Erro ao carregar";
  }
});

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  

  /* ===========================
     Query selectors e elementos
     =========================== */
  const addPatientBtn = document.querySelector('.add-patient');
  const addOverlay = document.getElementById('addPatientModalOverlay');
  const addModal = document.getElementById('addPatientModal');
  const addForm = document.getElementById('addPatientForm');

  const editOverlay = document.getElementById('editPatientModalOverlay');
  const editModal = document.getElementById('editPatientModal');
  const editForm = document.getElementById('editPatientForm');
  const editIndex = document.getElementById('editPatientIndex');

  const patientsContainer = document.querySelector('.patients-container');

  const confirmModal = document.getElementById('modal-confirmacao');
  const confirmYes = confirmModal?.querySelector('.btn-sim') ?? null;
  const confirmNo = confirmModal?.querySelector('.btn-nao') ?? null;

  // endereco (add)
  const cepInput = document.getElementById('cep');
  const bairroInput = document.getElementById('bairro');
  const ruaInput = document.getElementById('rua');

  // sexo (add)
  const sexoWrapper = document.getElementById('sexoFieldWrapper');
  const sexoText = document.getElementById('sexoFieldText');
  const sexoHidden = document.getElementById('sexoFieldHidden');
  const sexoList = document.getElementById('sexoFieldList');

  // sexo (edit)
  const editSexoWrapper = document.getElementById('editSexoFieldWrapper');
  const fSexoText = document.getElementById('editSexoFieldText');
  const fSexoHidden = document.getElementById('editSexoFieldHidden');
  const editSexoList = document.getElementById('editSexoFieldList');

  const editFullName = document.getElementById('editFullName');
  const editEmail = document.getElementById('editEmail');
  const editPhone = document.getElementById('editPhone');
  const editCep = document.getElementById('editCep');
  const editBairro = document.getElementById('editBairro');
  const editRua = document.getElementById('editRua');

  if (!addPatientBtn || !addOverlay || !addModal || !addForm || !patientsContainer) {
    console.warn('personal.js: elementos essenciais não encontrados; abortando.');
    return;
  }

  function atualizarLoginInfo() {
    const nome = localStorage.getItem('nutri_nome');
    const email = localStorage.getItem('nutri_email');
    const cargo = localStorage.getItem('nutri_cargo');
    const modalidade = localStorage.getItem('nutri_modalidade');
  
    const loginInfos = document.querySelectorAll('.login-info');
    loginInfos.forEach(info => {
      if (nome && email && cargo) {
        info.innerHTML = `
          <h3>${nome}</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Cargo:</strong> ${cargo}</p>
          <p><strong>Atendimento:</strong> ${modalidade}</p>
        `;
      } else {
        info.innerHTML = `<h3>Logar</h3><p>Clique para acessar</p>`;
      }
    });
  }
  
  atualizarLoginInfo();
  // reaja quando outro tab gravar o perfil
window.addEventListener('storage', (e) => {
  if (e.key === 'nutri_profile_updated_at' || e.key === 'nutri_nome') {
    if (typeof atualizarLoginInfo === 'function') atualizarLoginInfo();
  }
});


  /* ===========================
    Utilitários pequenos
     =========================== */
  const SEX_OPTIONS = ['Masculino', 'Feminino', 'Outro'];

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function showElement(el) { if (el) el.classList.remove('hidden'); }
  function hideElement(el) { if (el) el.classList.add('hidden'); }

  function setError(id, message) {
    const span = document.getElementById(id + '-error');
    if (span) { span.textContent = message; span.style.display = 'block'; }
    const input = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    if (input) input.classList.add('input-error');
  }
  function clearError(id) {
    const span = document.getElementById(id + '-error');
    if (span) { span.textContent = ''; span.style.display = 'none'; }
    const input = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    if (input) input.classList.remove('input-error');
  }
  function clearAllErrors(scope = document) {
    $all('.error-message', scope).forEach(s => { s.textContent = ''; s.style.display = 'none'; });
    $all('.input-error', scope).forEach(i => i.classList.remove('input-error'));
  }

  /* ===========================
     LocalStorage: pacientes
     =========================== */
  function loadPatients() {
    try {
      return JSON.parse(localStorage.getItem('patients') || '[]');
      const normalized = normalizePatientsList(raw);
      // savePatients(normalized);
      return normalized;
    } catch (e)
    { 
      return []; 
    }
  }
  function savePatients(list) {
    localStorage.setItem('patients', JSON.stringify(list));
  }

  // normaliza lista: garante que cada paciente contenha BOTH: .active (boolean) e .status ('active'|'inactive')
function normalizePatientsList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(p => {
    // clone (evita mutar inesperadamente)
    const patient = Object.assign({}, p);
    // prioridade: se existir .active (boolean), derive status a partir dele
    if (typeof patient.active === 'boolean') {
      patient.status = patient.active ? 'active' : 'inactive';
    } else if (typeof patient.status === 'string') {
      // se existir status string derive active
      patient.active = (patient.status === 'active');
    } else {
      // nenhum definido -> padrão ativo
      patient.active = true;
      patient.status = 'active';
    }
    return patient;
  });
}


  function createPatientCard(p) {
    const card = document.createElement('div');
    card.className =
  'patient-card' +
  (p.active ? '' : ' patient-inactive') +
  (p.pinned ? ' patient-pinned' : '');

    const initial = p.fullName ? p.fullName.trim()[0].toUpperCase() : '?';
    card.innerHTML = `
      <div class="patient-info">
        <div class="avatar">${escapeHtml(initial)}</div>
        <span>${escapeHtml(p.fullName || '')}</span>
      </div>
      <div class="patient-actions">
        <button class="btn-outline">Abrir Ficha</button>
<button class="btn-outline pin-btn">
  ${p.pinned ? "Desafixar" : "Fixar no Topo"}
</button>


        <div class="dropdown">
          <button class="btn-outline dropdown-toggle" aria-expanded="false" type="button">
            <i class="bi bi-caret-right"></i>
          </button>
          <ul class="dropdown-menu">
            <li><button class="dropdown-item" type="button"><i class="bi bi-pencil-square"></i> Editar</button></li>
            <li><button class="dropdown-item" type="button"><i class="bi bi-trash"></i> Remover</button></li>
          </ul>
        </div>
      </div>
    `;
    return card;
  }

  function createEmptyNode(messageTitle, messageBody) {
    const el = document.createElement('div');
    el.className = 'empty-list';
    el.innerHTML = `<h3>${escapeHtml(messageTitle)}</h3><p>${escapeHtml(messageBody)}</p>`;
    return el;
  }
  
  function renderPatients(listParam) {
    // remove existing patient cards and any empty placeholder
    $all(' .patient-card', patientsContainer).forEach(c => c.remove());
    const existingEmpty = patientsContainer.querySelector('.empty-list');
    if (existingEmpty) existingEmpty.remove();
  
    const list = Array.isArray(listParam) ? listParam : loadPatients();
  
    if (!list || list.length === 0) {
      // decide mensagem conforme origem: se não há nenhum paciente salvo vs filtro/busca
      const allSaved = loadPatients(); // lista completa no storage
      let title = 'Lista vazia';
      let body = 'Atualmente não há pacientes para mostrar.';
      if (Array.isArray(allSaved) && allSaved.length === 0) {
        // nenhum paciente cadastrado (pode ser proposital)
        title = 'Lista propositalmente vazia';
        body = 'Nenhum paciente foi cadastrado ainda ou a lista foi limpa propositalmente.';
      } else {
        // existem pacientes salvos, mas nenhum bateu com o filtro/busca
        title = 'Nenhum resultado';
        body = 'Nenhum paciente corresponde aos critérios selecionados.';
      }
      const placeholder = createEmptyNode(title, body);
      // insere antes do botão de adicionar paciente, se existir
      const addBtn = patientsContainer.querySelector('.add-patient');
      if (addBtn) patientsContainer.insertBefore(placeholder, addBtn);
      else patientsContainer.appendChild(placeholder);
      return;
    }
  
    // render normal
    list.forEach(p => {
      const card = createPatientCard(p);
      const addBtn = patientsContainer.querySelector('.add-patient');
      if (addBtn) patientsContainer.insertBefore(card, addBtn);
      else patientsContainer.appendChild(card);
    });
  }
  
  renderPatients(); // inicial render

  /* ===========================
   Filtro de pacientes (Ativos/Inativos)
   =========================== */
const filterToggle = document.querySelector('.filter-toggle');
const filterMenu = filterToggle?.closest('.dropdown')?.querySelector('.dropdown-menu');
const patientsDropdownItems = filterMenu ? Array.from(filterMenu.querySelectorAll('.dropdown-item')) : [];

let currentFilter = 'all'; // padrão: mostra todos

function matchByStatus(patient, filter) {
  // paciente já veio normalizado: patient.active (boolean) e patient.status (string)
  if (!patient || !filter || filter === 'all') return true;
  if (filter === 'active') return Boolean(patient.active) || patient.status === 'active';
  if (filter === 'inactive') return !Boolean(patient.active) || patient.status === 'inactive';
  return true;
}

function renderFilteredPatients() {
  const patients = loadPatients(); // já normalizados
  const filtered = patients.filter(p => matchByStatus(p, currentFilter));
  renderPatients(filtered);
}

/* ===========================
  Busca de pacientes (search-input)
  =========================== */
  const searchInput = document.querySelector('#searchInput');
  const searchButton = document.querySelector('#searchButton');
  
  function searchPatientsByName(query) {
    const allPatients = loadPatients(); // já normalizados
    const term = query.trim().toLowerCase();
  
    // 1 se o termo estiver vazio → mantém filtro atual
    if (term === '') {
      renderFilteredPatients();
      return;
    }
  
    // 2 aplica filtro de nome + status (respeitando filtro atual ativo/inativo)
    const filtered = allPatients.filter(p => {
      const nameMatch = p.fullName?.toLowerCase().includes(term);
      const statusMatch = currentFilter === 'all' || matchByStatus(p, currentFilter);
      return nameMatch && statusMatch;
    });
  
    renderPatients(filtered);
  
    // adiciona animação visual
    const newCards = document.querySelectorAll('.patient-card');
    newCards.forEach(c => {
      c.classList.add('fade-in');
      setTimeout(() => c.classList.remove('fade-in'), 500);
    });
  }
  
  // === eventos ===
  
  // Clique no ícone de busca
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      const query = searchInput.value;
      searchPatientsByName(query);
    });
  }
  
  // Pressionar Enter no campo
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value;
        searchPatientsByName(query);
      }
   });
 }   

/* ===========================
   Atualização em tempo real (com animação)
   =========================== */
   window.addEventListener('storage', (e) => {
    if (e.key === 'patients') {
      const cards = document.querySelectorAll('.patient-card');
      // aplica fade-out nos cards atuais
      cards.forEach(card => card.classList.add('fade-out'));
  
      // aguarda o fade-out antes de re-renderizar
      setTimeout(() => {
        renderFilteredPatients();
        const newCards = document.querySelectorAll('.patient-card');
        newCards.forEach(c => c.classList.add('fade-in'));
      }, 400);
    }
  });
  
  

// evento para os botões do menu de filtro
patientsDropdownItems.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const filterType = btn.dataset.filter || 'all';
    currentFilter = filterType;

    // Aplica / remove classe visual no botão de filtro
    if (filterToggle) {
      filterToggle.classList.toggle('filter-active', currentFilter !== 'all');
      // atualiza texto do botão (opcional): mostra o nome do filtro selecionado
      // filterToggle.firstChild && (filterToggle.firstChild.textContent = currentFilter === 'all' ? 'Filtrar' : btn.textContent.trim());
    }

    // seu código existente de animação / renderização
    const cards = document.querySelectorAll('.patient-card');
    if (cards.length) {
      cards.forEach(card => card.classList.add('fade-out'));
      setTimeout(() => {
        renderFilteredPatients();
        const newCards = document.querySelectorAll('.patient-card');
        newCards.forEach(c => c.classList.add('fade-in'));
      }, 400);
    } else {
      renderFilteredPatients();
    }

    // fecha o menu e ajusta ícone (se já faz isso)
    const menu = btn.closest('.dropdown-menu');
    menu?.classList.remove('show');
    const icon = btn.closest('.dropdown')?.querySelector('i');
    if (icon) {
      icon.classList.remove('bi-caret-down');
      icon.classList.add('bi-caret-right');
    }
  });
});




  /* ===========================
     Modais: abrir/fechar e confirmação
     =========================== */
  function openAddModal() {
    showElement(addOverlay);
    showElement(addModal);
    clearAllErrors(addForm);
    // build sexo list
    if (sexoText) buildSexoList(sexoText.value);
  }
  function closeAddModal(clearForm = false) {
    hideElement(confirmModal);
    hideElement(addOverlay);
    hideElement(addModal);
    if (clearForm) {
      addForm.reset();
      clearAllErrors(addForm);
      if (sexoHidden) sexoHidden.value = '';
      if (sexoText) sexoText.value = '';
      closeSexoList();
    }
  }

  function openEditModal() {
    showElement(editOverlay);
    showElement(editModal);
    if (fSexoText) buildEditSexoList(fSexoText.value);
  }
  function closeEditModal() {
    hideElement(editOverlay);
    hideElement(editModal);
    if (editForm) { editForm.reset(); clearAllErrors(editForm); }
    if (fSexoHidden) fSexoHidden.value = '';
    if (fSexoText) fSexoText.value = '';
    closeEditSexoList();
  }

  // confirmação genérica: chama callback se confirmar true
  function showConfirmation(callbackYes) {
    if (!confirmModal) {
      if (typeof callbackYes === 'function') callbackYes();
      return;
    }
    showElement(confirmModal);
    function yesHandler() {
      hideElement(confirmModal);
      confirmYes.removeEventListener('click', yesHandler);
      confirmNo.removeEventListener('click', noHandler);
      if (typeof callbackYes === 'function') callbackYes();
    }
    function noHandler() {
      hideElement(confirmModal);
      confirmYes.removeEventListener('click', yesHandler);
      confirmNo.removeEventListener('click', noHandler);
    }
    confirmYes.addEventListener('click', yesHandler);
    confirmNo.addEventListener('click', noHandler);
  }

  /* ===========================
     Form dirty checks (add / edit)
     =========================== */
  function isFormDirty(formEl) {
  if (!formEl) return false;
  return Array.from(formEl.querySelectorAll('input, textarea, select')).some(el => {
    if (el.type === 'button' || el.type === 'submit' || el.type === 'reset') return false;
    const current = String(el.value || '').trim();
    const initial = String(el.dataset.initialValue || '').trim();
    return current !== initial; // só retorna true se algo foi realmente alterado
  });
}


  /* ===========================
     Event handlers: abrir/fechar add modal
     =========================== */
  addPatientBtn.addEventListener('click', () => openAddModal());
  // Faz o card abrir o mesmo modal do botão "Cadastrar Paciente"
const cardAddPatient = document.getElementById("card-add-patient");
if (cardAddPatient) {
  cardAddPatient.style.cursor = "pointer"; // mantém a UX
  cardAddPatient.addEventListener("click", () => {
    addPatientBtn.click(); // chama exatamente a mesma funcionalidade
  });
}


  // add modal close buttons (delegated via class)
  $all('.modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isFormDirty(addForm)) {
        showConfirmation(() => closeAddModal(true));
      } else {
        closeAddModal(false);
      }
    });
  });

  // click overlay add modal
  addOverlay.addEventListener('click', () => {
    if (isFormDirty(addForm)) showConfirmation(() => closeAddModal(true));
    else closeAddModal(false);
  });

  /* ===========================
     Save (add) patient
     =========================== */
  function validateAdd(form) {
    clearAllErrors(form);
    let ok = true;
    if (!form.fullName.value.trim()) { setError('fullName', 'O nome é obrigatório.'); ok = false; }
    if (!form.phone.value.trim()) { setError('phone','O telefone é obrigatório.'); ok = false; }
    if (!form.email.value.trim()) { setError('email','O e-mail é obrigatório.'); ok = false; }
    if (!form.cep.value.trim()) { setError('cep','O CEP é obrigatório.'); ok = false; }
    if (!form.bairro.value.trim()) { setError('bairro','O bairro é obrigatório.'); ok = false; }
    if (!form.rua.value.trim()) { setError('rua','A rua é obrigatória.'); ok = false; }
    const sexVal = (sexoHidden?.value || '').trim();
    if (!sexVal) { setError('sexo','O sexo é obrigatório.'); ok = false; }
    return ok;
  }

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateAdd(addForm)) return;
    const data = {
      fullName: addForm.fullName.value.trim(),
      email: addForm.email.value.trim(),
      phone: addForm.phone.value.trim(),
      cep: addForm.cep.value.trim(),
      bairro: addForm.bairro.value.trim(),
      rua: addForm.rua.value.trim(),
      sexo: (sexoHidden?.value || sexoText?.value || '').trim(),
      active: true,
      status: 'active'
    };
    const list = loadPatients();
    list.push(data);
    savePatients(list);
    renderPatients();
    closeAddModal(true);
  });

  /* ===========================
     Remover paciente (delegação)
     =========================== */
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.dropdown-item');
    if (!btn) return;
    // Remover?
    const isRemove = !!btn.querySelector('.bi-trash') || /\bRemover\b/i.test(btn.textContent);
    if (!isRemove) return;

    ev.preventDefault();
    const card = btn.closest('.patient-card');
    if (!card) return;
    const nameEl = card.querySelector('.patient-info span');
    const nome = nameEl ? nameEl.textContent.trim() : '';
    if (!nome) return;
    if (!window.confirm) return; // fallback
    const confirmed = window.confirm(`Remover o paciente "${nome}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    // remove card UI
    card.remove();
    // remove from storage
    const list = loadPatients();
    const newList = list.filter(p => String(p.fullName || '').trim() !== nome);
    savePatients(newList);
  });

  /* ===========================
     Dropdowns genéricos
     =========================== */
  document.addEventListener('click', (ev) => {
    const toggle = ev.target.closest('.dropdown-toggle');
    if (toggle) {
      const dropdown = toggle.closest('.dropdown');
      if (!dropdown) return;
      const menu = dropdown.querySelector('.dropdown-menu');
      if (!menu) return;
      const willOpen = !menu.classList.contains('show');
      // close others
      $all('.dropdown-menu.show').forEach(m => {
        if (m !== menu) {
          m.classList.remove('show');
          const t = m.closest('.dropdown')?.querySelector('.dropdown-toggle');
          if (t) t.setAttribute('aria-expanded', 'false');
          const icon = m.closest('.dropdown')?.querySelector('.dropdown-toggle i');
          if (icon) { icon.classList.remove('bi-caret-down','bi-caret-down-fill'); icon.classList.add('bi-caret-right'); }
        }
      });
      menu.classList.toggle('show', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
      const icon = toggle.querySelector('i');
      if (icon) {
        if (willOpen) { icon.classList.remove('bi-caret-right'); icon.classList.add('bi-caret-down'); }
        else { icon.classList.remove('bi-caret-down','bi-caret-down-fill'); icon.classList.add('bi-caret-right'); }
      }
      return;
    }

    // click on dropdown-item -> will be handled by other delegated handlers (edit/remove)
    const item = ev.target.closest('.dropdown-item');
    if (item) {
      const menu = item.closest('.dropdown-menu');
      if (menu) {
        menu.classList.remove('show');
        const t = menu.closest('.dropdown')?.querySelector('.dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
        const icon = menu.closest('.dropdown')?.querySelector('.dropdown-toggle i');
        if (icon) { icon.classList.remove('bi-caret-down','bi-caret-down-fill'); icon.classList.add('bi-caret-right'); }
      }
      return;
    }

    // click outside: close all
    if (!ev.target.closest('.dropdown')) {
      $all('.dropdown-menu.show').forEach(m => {
        m.classList.remove('show');
        const t = m.closest('.dropdown')?.querySelector('.dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
        const icon = m.closest('.dropdown')?.querySelector('.dropdown-toggle i');
        if (icon) { icon.classList.remove('bi-caret-down','bi-caret-down-fill'); icon.classList.add('bi-caret-right'); }
      });
    }
  });

  /* ===========================
     Edit modal: abrir com dados e salvar
     =========================== */
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.dropdown-item');
    if (!btn) return;
    const isEdit = !!btn.querySelector('.bi-pencil-square') || /\bEditar\b/i.test(btn.textContent);
    if (!isEdit) return;

    ev.preventDefault();
    const card = btn.closest('.patient-card');
    if (!card) return;
    const nameEl = card.querySelector('.patient-info span');
    const nome = nameEl ? nameEl.textContent.trim() : '';
    const list = loadPatients();
    const idx = list.findIndex(p => (p.fullName || '').trim() === nome);
    if (idx === -1) {
      // fallback: open empty edit and fill name
      openEditModal();
      if (editFullName) editFullName.value = nome;
      return;
    }
    const paciente = list[idx];
    // populate edit form
    if (editIndex) editIndex.value = idx;
    if (editFullName) editFullName.value = paciente.fullName || '';
    if (editEmail) editEmail.value = paciente.email || '';
    if (editPhone) editPhone.value = paciente.phone || '';
    if (editCep) editCep.value = paciente.cep || '';
    if (editBairro) editBairro.value = paciente.bairro || '';
    if (editRua) editRua.value = paciente.rua || '';
    if (fSexoText) fSexoText.value = paciente.sexo || '';
    if (fSexoHidden) fSexoHidden.value = paciente.sexo || '';

    Array.from(editForm.elements).forEach(el => {
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
    el.dataset.initialValue = el.value;
  }
});
    // build edit sexo list
    buildEditSexoList(fSexoText?.value || '');
    openEditModal();
  });

  // edit cancel/overlay: attempt close with confirmation when dirty
  const editCancelBtn = document.querySelector('.modal-cancel-edit');
  if (editCancelBtn) {
    editCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isFormDirty(editForm)) showConfirmation(() => closeEditModal());
      else closeEditModal();
    });
  }
  if (editOverlay) {
    editOverlay.addEventListener('click', () => {
      if (isFormDirty(editForm)) showConfirmation(() => closeEditModal());
      else closeEditModal();
    });
  }

  // edit save
  editForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors(editForm);
    let valid = true;

    // basic validations (mirror add)
    if (!editFullName.value.trim()) { setError('editFullName','O nome é obrigatório.'); valid = false; }
    const phoneClean = String(editPhone.value || '').replace(/\D/g,'');
    if (!phoneClean) { setError('editPhone','O telefone é obrigatório.'); valid = false; }
    if (!editEmail.value.trim()) { setError('editEmail','O e-mail é obrigatório.'); valid = false; }
    if (!editCep.value.trim()) { setError('editCep','O CEP é obrigatório.'); valid = false; }
    if (!editBairro.value.trim()) { setError('editBairro','O bairro é obrigatório.'); valid = false; }
    if (!editRua.value.trim()) { setError('editRua','A rua é obrigatória.'); valid = false; }
    const sexoVal = (fSexoHidden.value || fSexoText.value || '').trim();
    if (!sexoVal) { setError('editSexo','O sexo é obrigatório.'); valid = false; }
    if (!valid) return;

    const idx = Number(editIndex.value);
    const list = loadPatients();
    const item = {
      fullName: editFullName.value.trim(),
      email: editEmail.value.trim(),
      phone: editPhone.value.trim(),
      cep: editCep.value.trim(),
      bairro: editBairro.value.trim(),
      rua: editRua.value.trim(),
      sexo: sexoVal
    };
    if (!Number.isNaN(idx) && list[idx]) list[idx] = Object.assign({}, list[idx], item);
    else {
      const found = list.findIndex(p => (p.fullName || '').trim() === item.fullName);
      if (found >= 0) list[found] = Object.assign({}, list[found], item);
      else list.push(item);
    }
    savePatients(list);
    renderPatients();
    closeEditModal();
  });

  /* ===========================
     Autocomplete Sexo (add)
     =========================== */
  function buildSexoList(q) {
    if (!sexoList) return;
    const items = filterSexo(q);
    sexoList.innerHTML = '';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.textContent = it;
      li.dataset.value = it;
      li.id = `sexoField-opt-${i}`;
      li.setAttribute('role','option');
      li.addEventListener('click', () => {
        if (sexoText) sexoText.value = it;
        if (sexoHidden) sexoHidden.value = it;
        closeSexoList();
      });
      sexoList.appendChild(li);
    });
    sexoList.classList.toggle('show', items.length > 0);
  }

  function filterSexo(q) {
    const s = String(q || '').trim().toLowerCase();
    if (!s) return SEX_OPTIONS.slice();
    return SEX_OPTIONS.filter(o => o.toLowerCase().startsWith(s));
  }

  function openSexoList() { if (sexoList) { sexoList.classList.add('show'); sexoText.setAttribute('aria-expanded','true'); } }
  function closeSexoList() { if (sexoList) sexoList.classList.remove('show'); if (sexoText) sexoText.setAttribute('aria-expanded','false'); }

  // Click on input opens list and stops propagation so global clicks don't immediately close
  if (sexoText) {
    sexoText.addEventListener('click', (e) => {
      e.stopPropagation();
      buildSexoList(sexoText.value);
      openSexoList();
    });
    sexoText.addEventListener('input', (e) => { buildSexoList(e.target.value); openSexoList(); });
    sexoText.addEventListener('focus', () => { buildSexoList(sexoText.value); openSexoList(); });
    sexoText.addEventListener('keydown', (e) => {
      const items = sexoList ? Array.from(sexoList.children) : [];
      if (!items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); let idx = items.findIndex(li => li.getAttribute('aria-selected') === 'true'); idx = (idx+1) % items.length; items.forEach((li,i)=>li.setAttribute('aria-selected', i===idx)); items[idx].scrollIntoView({block:'nearest'}); }
      if (e.key === 'ArrowUp') { e.preventDefault(); let idx = items.findIndex(li => li.getAttribute('aria-selected') === 'true'); if (idx === -1) idx = items.length; idx = (idx-1+items.length) % items.length; items.forEach((li,i)=>li.setAttribute('aria-selected', i===idx)); items[idx].scrollIntoView({block:'nearest'}); }
      if (e.key === 'Enter') { e.preventDefault(); const sel = items.find(li => li.getAttribute('aria-selected') === 'true'); if (sel) { sexoText.value = sel.dataset.value; sexoHidden.value = sel.dataset.value; closeSexoList(); } else { sexoHidden.value = sexoText.value.trim(); closeSexoList(); } }
      if (e.key === 'Escape') { closeSexoList(); }
    });
  }

  /* ===========================
    Autocomplete Sexo (edit) - separado instance
     =========================== */
  function buildEditSexoList(q) {
    if (!editSexoList) return;
    const items = filterSexo(q);
    editSexoList.innerHTML = '';
    items.forEach((it,i) => {
      const li = document.createElement('li');
      li.textContent = it;
      li.dataset.value = it;
      li.addEventListener('click', () => {
        if (fSexoText) fSexoText.value = it;
        if (fSexoHidden) fSexoHidden.value = it;
        closeEditSexoList();
      });
      editSexoList.appendChild(li);
    });
    editSexoList.classList.toggle('show', items.length > 0);
  }
  function openEditSexoList() { if (editSexoList) { editSexoList.classList.add('show'); fSexoText.setAttribute('aria-expanded','true'); } }
  function closeEditSexoList() { if (editSexoList) editSexoList.classList.remove('show'); if (fSexoText) fSexoText.setAttribute('aria-expanded','false'); }

  if (fSexoText) {
    fSexoText.addEventListener('click', (e) => { e.stopPropagation(); buildEditSexoList(fSexoText.value); openEditSexoList(); });
    fSexoText.addEventListener('input', (e) => { buildEditSexoList(e.target.value); openEditSexoList(); });
    fSexoText.addEventListener('keydown', (e) => {
      const items = editSexoList ? Array.from(editSexoList.children) : [];
      if (!items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); let idx = items.findIndex(li => li.getAttribute('aria-selected') === 'true'); idx = (idx+1) % items.length; items.forEach((li,i)=>li.setAttribute('aria-selected', i===idx)); items[idx].scrollIntoView({block:'nearest'}); }
      if (e.key === 'ArrowUp') { e.preventDefault(); let idx = items.findIndex(li => li.getAttribute('aria-selected') === 'true'); if (idx === -1) idx = items.length; idx = (idx-1+items.length) % items.length; items.forEach((li,i)=>li.setAttribute('aria-selected', i===idx)); items[idx].scrollIntoView({block:'nearest'}); }
      if (e.key === 'Enter') { e.preventDefault(); const sel = items.find(li => li.getAttribute('aria-selected') === 'true'); if (sel) { fSexoText.value = sel.dataset.value; fSexoHidden.value = sel.dataset.value; closeEditSexoList(); } else { fSexoHidden.value = fSexoText.value.trim(); closeEditSexoList(); } }
      if (e.key === 'Escape') { closeEditSexoList(); }
    });
  }

  // global click to close suggestions (safe single listener)
  document.addEventListener('click', (ev) => {
    if (!(sexoWrapper && sexoWrapper.contains(ev.target))) closeSexoList();
    if (!(editSexoWrapper && editSexoWrapper.contains(ev.target))) closeEditSexoList();
  });

document.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".pin-btn");
  if (!btn) return;

  const card = btn.closest(".patient-card");
  const name = card.querySelector(".patient-info span")?.textContent.trim();
  if (!name) return;

  let patients = loadPatients();
  const idx = patients.findIndex(p => p.fullName.trim() === name);
  if (idx === -1) return;

  // Alterna
  patients[idx].pinned = !patients[idx].pinned;

  // Reordena lista: fixados primeiro
  patients = [
    ...patients.filter(p => p.pinned),
    ...patients.filter(p => !p.pinned)
  ];

  savePatients(patients);
  renderPatients();
});

// === Estilos de destaque do paciente fixado (injetados via JS) ===
const stylePinned = document.createElement("style");
stylePinned.textContent = `
  .patient-card.patient-pinned {
  border-radius: 10px;
    padding: 10px;
    box-shadow: 0 0 12px rgba(0, 150, 0, 0.25) !important;
    transform: scale(1.02) !important;
    transition: all 0.25s ease !important;
  }
`;
document.head.appendChild(stylePinned);


  /* ===========================
     Masks: phone and CEP (apply to add and edit fields)
     =========================== */
  function maskPhoneValue(v) {
    const s = String(v || '').replace(/\D/g, '');
    if (s.length <= 2) return s;
    if (s.length <= 6) return `(${s.slice(0,2)}) ${s.slice(2)}`;
    if (s.length <= 10) return `(${s.slice(0,2)}) ${s.slice(2,7)}-${s.slice(7)}`.replace(/-$/,'');
    return `(${s.slice(0,2)}) ${s.slice(2,7)}-${s.slice(7,11)}`;
  }
  function maskCEPValue(v) {
    const s = String(v || '').replace(/\D/g,'').slice(0,8);
    if (s.length <= 5) return s;
    return `${s.slice(0,5)}-${s.slice(5)}`;
  }
  function applyMask(el, formatter) {
    if (!el) return;
    el.addEventListener('input', () => {
      const start = el.selectionStart;
      const rawBefore = el.value.slice(0, start).replace(/\D/g,'');
      el.value = formatter(el.value);
      // reposition cursor approximately
      const newRaw = el.value.replace(/\D/g,'');
      let posRaw = Math.min(rawBefore.length, newRaw.length);
      let cursor = 0, count = 0;
      while (cursor < el.value.length && count < posRaw) {
        if (/\d/.test(el.value[cursor])) count++;
        cursor++;
      }
      el.setSelectionRange(cursor, cursor);
    });
    el.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const pasted = (ev.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'');
      el.value = formatter(pasted);
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  applyMask(document.querySelector('#addPatientForm input[name="phone"], #addPatientForm input[id="phone"]'), maskPhoneValue);
  applyMask(document.querySelector('#addPatientForm input[name="cep"], #addPatientForm input[id="cep"], input#cep'), maskCEPValue);
  applyMask(document.querySelector('#editPatientForm input[name="phone"], #editPhone'), maskPhoneValue);
  applyMask(document.querySelector('#editPatientForm input[name="cep"], #editCep'), maskCEPValue);

  /* ===========================
     ViaCEP lookup (add & edit)
     =========================== */
  function viaCepLookup(cepRaw, onSuccess, onFail) {
    const cep = String(cepRaw || '').replace(/\D/g,'');
    if (cep.length !== 8) { if (typeof onFail === 'function') onFail(); return; }
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) { if (typeof onFail === 'function') onFail(); return; }
        if (typeof onSuccess === 'function') onSuccess(data);
      })
      .catch(() => { if (typeof onFail === 'function') onFail(); });
  }

  if (cepInput && bairroInput && ruaInput) {
    cepInput.addEventListener('blur', () => {
      viaCepLookup(cepInput.value,
        data => {
          bairroInput.value = data.bairro || '';
          ruaInput.value = data.logradouro || '';
          clearError('cep'); clearError('bairro'); clearError('rua');
        },
        () => {
          bairroInput.value = ''; ruaInput.value = '';
          setError('cep','CEP não encontrado.');
        });
    });
    cepInput.addEventListener('input', () => clearError('cep'));
  }

  if (editCep && editBairro && editRua) {
    editCep.addEventListener('blur', () => {
      viaCepLookup(editCep.value,
        data => {
          editBairro.value = data.bairro || '';
          editRua.value = data.logradouro || '';
          clearError('editCep'); clearError('editBairro'); clearError('editRua');
        },
        () => {
          editBairro.value = ''; editRua.value = '';
          setError('editCep','CEP não encontrado.');
        });
    });
    editCep.addEventListener('input', () => clearError('editCep'));
  }

  /* ===========================
     Inicialização final
     =========================== */
  renderPatients();

});