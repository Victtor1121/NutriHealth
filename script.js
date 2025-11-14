// Máscara de CPF e telefone
document.addEventListener('DOMContentLoaded', () => {
  const cpf = document.getElementById('cpf');
  const telefone = document.getElementById('telefone');
  const telefoneLocal = document.getElementById('telefone-local');
  const crn = document.getElementById('crn');
  const cep = document.getElementById('cep');
  const cnpj = document.getElementById('cnpj');

  cpf?.addEventListener('input', () => {
    cpf.value = formatarCPF(cpf.value);
  });

  telefone?.addEventListener('input', () => {
    telefone.value = formatarTelefone(telefone.value);
  });

  telefoneLocal?.addEventListener('input', () => {
    telefoneLocal.value = formatarTelefone(telefoneLocal.value);
  });

  crn?.addEventListener('input', () => {
    crn.value = formatarCRN(crn.value);
  });

  cep?.addEventListener('input', () => {
    cep.value = formatarCEP(cep.value);
  });

  cnpj?.addEventListener('input', () => {
    cnpj.value = formatarCNPJ(cnpj.value);
  });
});

function formatarCPF(valor) {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

function formatarTelefone(valor) {
  valor = valor.replace(/\D/g, '');
  if (valor.length <= 10) {
    return valor.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  } else {
    return valor.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  }
}

function formatarCRN(valor) {
  return valor
    .replace(/\D/g, '')                      // Remove tudo que não for número
    .replace(/(\d{4,5})(\d{1})/, '$1-$2')    // Adiciona o traço depois de 4 ou 5 dígitos
    .slice(0, 7);                            // Limita o tamanho
}

function formatarCEP(valor) {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d{1,3})/, '$1-$2')
    .slice(0, 9);
}

function buscarCEP(cep) {
  // Limpa o valor do CEP, removendo qualquer caractere não numérico
  const cepLimpo = cep.replace(/\D/g, '');

  // Verifica se o CEP tem o comprimento correto
  if (cepLimpo.length !== 8) {
    alert('CEP inválido.');
    return;
  }

   fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    .then(response => response.json())
    .then(data => {
      console.log(data); // Verifique os dados no console para ver o que está sendo retornado

      // Verifique se a API retornou um erro
      if (data.erro) {
        alert('CEP não encontrado.');
      } else {
        // Preenche os campos com as informações da API
        document.getElementById('endereco').value = data.logradouro || ''; // Endereço
        //document.getElementById('bairro').value = data.bairro || ''; // Bairro
        document.getElementById('cidade').value = data.localidade || ''; // Cidade
        document.getElementById('estado').value = data.uf || ''; // Estado
      }
    })
    .catch(error => alert('Erro ao buscar CEP.')); // Em caso de erro de rede ou outro
}

document.getElementById('cep').addEventListener('blur', function () {
  const cep = this.value.replace(/\D/g, ''); // Limpa o valor para garantir formato correto
  if (cep.length === 8) {  // Verifica se o CEP tem 8 dígitos
    buscarCEP(cep); // Chama a função de busca do CEP
  }
}); 

function formatarCNPJ(valor) {
  return valor
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

// Abre o modal
function abrirRegistro() {
  const modal = document.getElementById('modal-login');
  modal.classList.remove('hidden');
  document.getElementById('tipo-usuario').textContent = 'Registro de Profissional';
  limparFormulario();
}
// Fecha com verificação
function fecharModal() {
  const campos = document.querySelectorAll('#modal-login input, #modal-login textarea, #modal-login select');
  const preenchido = Array.from(campos).some(campo => campo.value.trim() !== '');

  if (preenchido) {
    document.getElementById('modal-confirmacao').classList.remove('hidden');
  } else {
    document.getElementById('modal-login').classList.add('hidden');
  }
}

function confirmarFechamento(confirmado) {
  document.getElementById('modal-confirmacao').classList.add('hidden');
  if (confirmado) {
    document.getElementById('modal-login').classList.add('hidden');
    limparFormulario();
  }
}

// Atualiza campos com base no cargo
function atualizarCargo() {
  const cargo = document.getElementById('cargo').value;
  const campoCRN = document.getElementById('campo-crn');
  const campoTrabalho = document.getElementById('campo-trabalho');

  if (cargo === 'Nutricionista') {
    campoCRN.classList.remove('hidden');
    campoTrabalho.classList.remove('hidden');
  } else if (cargo === 'Personal') {
    campoCRN.classList.add('hidden');
    campoTrabalho.classList.remove('hidden');
  } else {
    campoCRN.classList.add('hidden');
    campoTrabalho.classList.add('hidden');
  }

  document.getElementById('tipo-trabalho').value = '';
  atualizarTrabalho();
}

// Atualiza campos com base no tipo de trabalho
function atualizarTrabalho() {
  const tipoTrabalho = document.getElementById('tipo-trabalho').value;
  const camposEmpresa = document.getElementById('campos-empresa');

  if (tipoTrabalho === 'Empresa') {
    camposEmpresa.classList.remove('hidden');
  } else {
    camposEmpresa.classList.add('hidden');
  }
}

// Alternar visibilidade da senha
function toggleSenha(idCampo) {
  const campo = document.getElementById(idCampo);
  campo.type = campo.type === 'password' ? 'text' : 'password';
}function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let soma = 0, resto;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.substring(10, 11));
}

function validarTelefone(telefone) {
  telefone = telefone.replace(/\D/g, '');
  return /^\d{10,11}$/.test(telefone);
}

function validarCRN(crn) {
  return /^[0-9]{4,6}-?\d?$/.test(crn); // Ex: 12345 ou 12345-6
}
/*
 * @param {string} fieldId – ID do campo (sem o sufixo "-error").
 * @param {string} message – Texto da mensagem de erro.
 */
function showError(fieldId, message) {
  // 1. Busca o <span> que vai receber a mensagem
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';      // garante visibilidade
  }

  // 2. Adiciona borda/vermelho ao próprio campo de input
  const inputEl = document.getElementById(fieldId);
  if (inputEl) {
    inputEl.classList.add('input-error'); // você define essa classe no CSS
    inputEl.focus();                       // foca o campo para correção

    // 3. Se estiver dentro de container com scroll, centraliza na viewport
    if (typeof inputEl.scrollIntoView === 'function') {
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function clearError(fieldId) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const inputEl = document.getElementById(fieldId);

  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  if (inputEl) {
    inputEl.classList.remove('input-error');
  }
}
function clearAllErrors(fieldIds) {
  fieldIds.forEach(clearError);
}

  function bindClearOnInput() {
  document
    .querySelectorAll('#modal-login input, #modal-login select, #modal-login textarea')
    .forEach(el => {
      el.addEventListener('input', () => clearError(el.id));
    });
}
document.addEventListener('DOMContentLoaded', bindClearOnInput);
// Validações e entrada simulada
function proximaEtapa() {
  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const cpf = document.getElementById('cpf').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const senha = document.getElementById('senha').value.trim();
  const confirmarSenha = document.getElementById('confirmar-senha').value.trim();
  const cargo = document.getElementById('cargo').value;
  const crn = document.getElementById('crn').value.trim();

  const campos = ['email','cpf','telefone','senha','confirmar-senha','cargo','crn'];
  clearAllErrors(campos);

  let erro = false;

  if (!validarEmail(email)) {
    showError('email', 'Email inválido.');
    erro = true;
  }

  if (!validarCPF(cpf)) {
    showError('cpf', 'CPF inválido');
    erro = true;
  }

  if (!validarTelefone(telefone)) {
    showError('telefone', 'Telefone inválido');
    erro = true;
  }

  if (!senha) {
    showError('senha', 'Digite uma senha');
    erro = true;
  }

  if (senha !== confirmarSenha) {
    showError('confirmar-senha', 'As senhas não coincidem');
    erro = true;
  }

  if (!cargo) {
    showError('cargo', 'Selecione sua função');
    erro = true;
  }

  if (cargo === 'Nutricionista' && !crn) {
    showError('crn', 'Informe o CRN');
    erro = true;
  }

  if (erro) return;

  document.getElementById('etapa-1').classList.add('hidden');
  document.getElementById('etapa-2').classList.remove('hidden');
  atualizarProgresso(2);
}
// Sair da dashboard
function sair() {
  document.getElementById('tela-dashboard').classList.add('hidden');
  limparFormulario();
}

// Limpa todos os campos
function limparFormulario() {
  const campos = document.querySelectorAll('#modal-login input, #modal-login textarea, #modal-login select');
  campos.forEach(campo => campo.value = '');

  document.getElementById('campo-crn').classList.add('hidden');
  document.getElementById('campos-empresa').classList.add('hidden');

  document.getElementById('etapa-1').classList.remove('hidden');
  document.getElementById('etapa-2').classList.add('hidden');

  document.getElementById('mensagem-login').textContent = '';
}

// Funções para manipular a barra de progresso
function atualizarProgresso(etapa) {
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    if (index <= etapa - 1) { // etapa=1 ativa só o step-1, etapa=2 ativa 1 e 2, etapa=3 ativa todos
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }

    if (index < etapa - 1) { // etapa=1 ativa só o step-1, etapa=2 ativa 1 e 2, etapa=3 ativa todos
      step.classList.add('done');
    } else {
      step.classList.remove('done');
    }
  });
  // 1. Seleciona o container e conta quantos passos há
  const container  = document.querySelector('.progress-bar-container');
  const totalSteps = container.querySelectorAll('.progress-step').length;

  // 2. Calcula percentual (0% na etapa 1, 100% na última)
  const percent = ((etapa - 1) / (totalSteps - 1)) * 100;

  // 3. Aplica a largura via CSS custom property
  container.style.setProperty('--progress-percent', `${percent}%`);

  // 4. (Opcional) Interpola cor entre azul (200°) e verde (140°) conforme progresso
  const startHue = 200;
  const endHue   = 140;
  const hue      = startHue + (endHue - startHue) * (percent / 100);
  container.style.setProperty('--progress-color', `hsl(${hue}, 75%, 55%)`);
}

function launchConfetti(count = 100) {
  const container = document.getElementById('confetti-container');
  const colors    = ['#FFC700','#FF0000','#2E3192','#41BBC7','#7F00FF'];

  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.classList.add('confetti-ball');

    // propriedades aleatórias
    const color = colors[Math.floor(Math.random()*colors.length)];
    const t     = (Math.random()*2 + 2) + 's';  // 2–4s para cair
    const s     = (Math.random()*2 + 1) + 's';  // 1–3s para balançar
    const left  = Math.random()*100 + 'vw';

    div.style.setProperty('--c', color);
    div.style.setProperty('--t', t);
    div.style.setProperty('--s', s);
    div.style.left = left;

    container.appendChild(div);

    // remove após animação
    setTimeout(() => container.removeChild(div), 5000);
  }
}

/**
 * Valida a segunda etapa (finalizarRegistro), exibindo erros individuais
 * logo abaixo de cada campo e só avança se não houver erros.
 */
function finalizarRegistro() {
  // 1) IDs dos campos que têm <span id="{campo}-error">
  const campos = [
    'tipo-trabalho',
    'tipo-atendimento',
    'tipo-empresa',
    'nome-local',
    'cep',
    'estado',
    'endereco',
    'cidade',
    'telefone-local',
    'cnpj',
    'bio'
  ];
  clearAllErrors(campos);

  // 2) Leitura dos valores
  const tipoTrabalho    = document.getElementById('tipo-trabalho').value;
  const tipoAtendimento = document.getElementById('tipo-atendimento').value;
  const tipoEmpresa     = document.getElementById('tipo-empresa').value;
  const nomeLocal       = document.getElementById('nome-local').value.trim();
  const cep             = document.getElementById('cep').value.trim();
  const estado          = document.getElementById('estado').value.trim();
  const endereco        = document.getElementById('endereco').value.trim();
  const cidade          = document.getElementById('cidade').value.trim();
  const telefoneLocal   = document.getElementById('telefone-local').value.trim();
  const cnpj            = document.getElementById('cnpj').value.trim();
  const bio             = document.getElementById('bio').value.trim();

  let erro = false;

  // 3) Validações gerais
  if (!tipoTrabalho) {
    showError('tipo-trabalho', 'Selecione Autônomo ou Empresa');
    erro = true;
  }

  // 4) Validações para Empresa
  if (tipoTrabalho === 'Empresa') {
    if (!tipoAtendimento) {
      showError('tipo-atendimento', 'Selecione tipo de atendimento');
      erro = true;
    }
    if (!tipoEmpresa) {
      showError('tipo-empresa', 'Selecione tipo de empresa');
      erro = true;
    }
    if (!nomeLocal) {
      showError('nome-local', 'Digite o nome do local');
      erro = true;
    }
    if (!cep) {
      showError('cep', 'Informe o CEP');
      erro = true;
    }
    if (!estado) {
      showError('estado', 'Informe o estado');
      erro = true;
    }
    if (!endereco) {
      showError('endereco', 'Informe o endereço');
      erro = true;
    }
    if (!cidade) {
      showError('cidade', 'Informe a cidade');
      erro = true;
    }
    if (!telefoneLocal) {
      showError('telefone-local', 'Telefone inválido');
      erro = true;
    }
    if (!cnpj) {
      showError('cnpj', 'Informe o CNPJ');
      erro = true;
    }
  }

  // 6) Se houver erro, aborta aqui
  if (erro) return;

  // 7) Se passou em tudo, avança pra etapa 3
  document.getElementById('etapa-2').classList.add('hidden');
  document.getElementById('etapa-3').classList.remove('hidden');
  atualizarProgresso(3);
  revisarInformacoes();
}


function revisarInformacoes() {
  const reviewContent = document.getElementById('review-content');
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const cargo = document.getElementById('cargo').value;

  reviewContent.innerHTML = `
    <p><strong>Nome:</strong> ${nome}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Cargo:</strong> ${cargo}</p>
    `;
}

// Função final para enviar os dados
function enviarFormulario() {
  console.log('enviarFormulario foi chamada');
  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const cargo = document.getElementById('cargo').value;
  const tipoAtendimento = document.getElementById('tipo-atendimento')?.value || 'Não informado';
  localStorage.setItem('nutri_profile_updated_at', Date.now());
  if (typeof window.atualizarLoginInfo === 'function') window.atualizarLoginInfo();

  // Salva no localStorage
  localStorage.setItem('nutri_nome', nome);
  localStorage.setItem('nutri_email', email);
  localStorage.setItem('nutri_cargo', cargo);
  localStorage.setItem('nutri_modalidade', tipoAtendimento);
  document.getElementById('modal-login').classList.add('hidden');

  // dispara animação de sucesso
  showUserSuccessDialog();
}

// Adicione a chamada `atualizarProgresso(1);` na função `abrirRegistro()`
function abrirRegistro() {
  const modal = document.getElementById('modal-login');
  modal.classList.remove('hidden');
  document.getElementById('tipo-usuario').textContent = 'Registro de Profissional';
  limparFormulario();
  atualizarProgresso(1);
}

// Modifique a função `limparFormulario()` para resetar a barra de progresso
function limparFormulario() {
  const campos = document.querySelectorAll('#modal-login input, #modal-login textarea, #modal-login select');
  campos.forEach(campo => campo.value = '');

  document.getElementById('campo-crn').classList.add('hidden');
  document.getElementById('campos-empresa').classList.add('hidden');
  document.getElementById('etapa-1').classList.remove('hidden');
  document.getElementById('etapa-2').classList.add('hidden');
  document.getElementById('etapa-3').classList.add('hidden');
  document.getElementById('mensagem-login').textContent = '';
  atualizarProgresso(1); // Reseta a barra para a etapa 1
}

// Altere a função sair() para também limpar o formulário
function sair() {
  document.getElementById('tela-dashboard').classList.add('hidden');
  limparFormulario();
}