
    document.addEventListener('DOMContentLoaded', () => {

      function formatPhoneInput(input) {
        input.addEventListener('input', () => {
          let digits = input.value.replace(/\D/g, '').slice(0, 11); // até 11 dígitos
          let formatted = '';
      
          if (digits.length > 0) {
            formatted += '(' + digits.slice(0, 2);
          }
          if (digits.length >= 3) {
            formatted += ') ' + digits.slice(2, 7);
          }
          if (digits.length >= 8) {
            formatted += '-' + digits.slice(7);
          }
      
          input.value = formatted;
        });
      }
      
      let savedEvents = JSON.parse(localStorage.getItem('events')) || [];
      let currentDateStr = null;

      const calendarEl      = document.getElementById('calendar');
      const eventPanel      = document.getElementById('eventPanel');
      const panelDate       = document.getElementById('panelDate');
      const eventsList      = document.getElementById('eventsList');
      const addBtn          = document.getElementById('addEventBtn');
      const form            = document.getElementById('eventForm');
      const closeBtn        = document.getElementById('closePanel');
      const prevBtn         = document.getElementById('prev');
      const nextBtn         = document.getElementById('next');
      const currentMonthEl  = document.getElementById('currentMonth');
      const editModalOverlay = document.getElementById('editModalOverlay');
      const closeEditModal   = document.getElementById('closeEditModal');
      const editForm    = document.getElementById('editForm');
      const deleteBtn   = document.getElementById('deleteEvent');
      let editingEvent  = null;
      const confirmDeleteOverlay = document.getElementById('confirmDeleteOverlay');
      const closeConfirmBtn      = document.getElementById('closeConfirmBtn');
      const confirmYesBtn        = document.getElementById('confirmYesBtn');
      const confirmNoBtn         = document.getElementById('confirmNoBtn');
      const phoneInput     = document.getElementById('phoneInput');
      const editPhoneInput = document.getElementById('editPhoneInput');
      if (phoneInput)     formatPhoneInput(phoneInput);
      if (editPhoneInput) formatPhoneInput(editPhoneInput);
savedEvents = savedEvents.map(ev => ({
  title:          ev.title,
  start:          ev.start,
  extendedProps:  ev.extendedProps,
  backgroundColor: ev.backgroundColor 
    || (ev.extendedProps.status === 'Cancelado' 
        ? '#d9534f' 
        : '#5cb85c')
}));

function formatPhone(raw) {
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  } else {
    return '—';
  }
}

      const calendar = new FullCalendar.Calendar(calendarEl, {
        
        locale: 'pt-br',
        initialView: 'dayGridMonth',
        height: 'auto',
        contentHeight: 'auto',
        headerToolbar: false,
        displayEventTime: false,
        selectable: true,
        editable: false,
        events: savedEvents,
        eventDidMount: info => {
          if (info.event.extendedProps.status === 'Finalizado') {
            // classe customizada no elemento do calendário
            info.el.classList.add('fc-event-finalizado');
          }
        },
        eventMouseEnter(info) {
          const ev = info.event;
          const popover = document.getElementById('eventPopover');
          const { clientName, phone, status } = ev.extendedProps;
          const start = new Date(ev.start);
        
          // Preenche os dados
          document.getElementById('popoverName').textContent = clientName || 'Não informado';
          document.getElementById('popoverPhone').textContent = formatPhone(phone) || 'Não informado';
          document.getElementById('popoverStatus').textContent = status || 'Agendado';
          document.getElementById('popoverDate').textContent = start.toLocaleDateString('pt-BR');
          document.getElementById('popoverTime').textContent = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
          // Posiciona o popover próximo ao clique
          const rect = info.el.getBoundingClientRect();
          popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
          popover.style.left = `${rect.left + window.scrollX}px`;
          popover.classList.remove('hidden');
        },
        eventMouseLeave() {
          document.getElementById('eventPopover').classList.add('hidden');
        }
,        
        dateClick(info) { openModal(info.dateStr); }
      });
      calendar.render();

      // Navegação de mês
      function updateMonth() {
        currentMonthEl.textContent = calendar.view.title;
      }
      prevBtn.onclick = () => { calendar.prev(); updateMonth(); };
      nextBtn.onclick = () => { calendar.next(); updateMonth(); };
      calendar.on('datesSet', updateMonth);
      updateMonth();

      // Abre modal
      function openModal(dateStr) {
        currentDateStr = dateStr;
        eventPanel.classList.add('open');
        form.classList.add('hidden');
        eventsList.style.display = '';
        addBtn.style.display = '';
        eventsList.innerHTML = '';
      
        // Escreve a data no cabeçalho do painel
        const dt = new Date(dateStr + 'T00:00:00');
        panelDate.textContent = dt.toLocaleDateString('pt-BR', {
          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });
      
        // 1) Pega só os eventos do dia
        const eventsForDate = calendar.getEvents()
          .filter(ev => ev.startStr.startsWith(dateStr));
      
        // 2) Ordena: quem tiver status 'Finalizado' fica por último
        eventsForDate.sort((a, b) => {
          const fa = a.extendedProps.status === 'Finalizado';
          const fb = b.extendedProps.status === 'Finalizado';
          return fa - fb; // false (0) antes de true (1)
        });
      
        // 3) Cria e anexa os <li> na ordem correta
        eventsForDate.forEach(ev => {
          const status = ev.extendedProps.status || 'Agendado';
          const li = document.createElement('li');
          li.className = status.toLowerCase();
          li.innerHTML = `
            <div class="event-info">
              <span class="event-time">${ev.startStr.slice(11,16)}</span>
              <span class="event-client">${ev.extendedProps.clientName}</span>
            </div>
            ${ev.extendedProps.description 
              ? `<span class="desc">${ev.extendedProps.description}</span>` 
              : ''}
            <div class="actions">
              <button class="edit-btn" title="Editar agendamento"><i class="bi bi-pencil-square"></i></button>
              <button class="cancel-btn" title="${status === 'Agendado' ? 'Cancelar agendamento' : 'Reativar agendamento'}">
                ${status === 'Agendado' 
                  ? '<i class="bi bi-check-circle"></i>' 
                  : '<i class="bi bi-ban"></i>'}
              </button>
            </div>
          `;
      
          // Handler para cancelar/reativar
          li.querySelector('.cancel-btn').onclick = () => {
            const newStatus = status === 'Agendado' ? 'Cancelado' : 'Agendado';
            ev.setExtendedProp('status', newStatus);
            ev.setProp('backgroundColor',
              newStatus === 'Agendado' ? '#5cb85c' : '#d9534f'
            );
            saveEvents();
            openModal(currentDateStr);
          };
      
          // Handler para editar/finalizar ao clicar no nome
          li.querySelector('.edit-btn').onclick = () => {
            editingEvent = ev;
            editForm.clientName.value  = ev.extendedProps.clientName;
            editForm.phone.value = ev.extendedProps.phone || '';
            editForm.time.value        = ev.startStr.slice(11,16);
            editForm.description.value = ev.extendedProps.description || '';
            editModalOverlay.classList.add('open');
            editForm.classList.remove('edit-modal-hidden');
          };
      
          eventsList.append(li);
        });
      }
      
      editForm.onsubmit = e => {
  e.preventDefault();

  editingEvent.setExtendedProp('clientName', editForm.clientName.value.trim());
  editingEvent.setExtendedProp('phone', editForm.phone.value.trim());
  editingEvent.setExtendedProp('description', editForm.description.value.trim());
  editingEvent.setStart(`${currentDateStr}T${editForm.time.value}`);
  editingEvent.setProp(
    'title',
    `${editForm.time.value} - ${editForm.clientName.value.trim()}`
  );

  saveEvents();
  editModalOverlay.classList.remove('open');
    openModal(currentDateStr);
};
deleteBtn.onclick = () => {
  confirmDeleteOverlay.classList.add('open');
  
};
const finalizeBtn = document.querySelector('.edit-modal-finalize-btn');
finalizeBtn.onclick = () => {
  if (!editingEvent) return;
  // atualiza status e cor
  editingEvent.setExtendedProp('status', 'Finalizado');
  editingEvent.setProp('backgroundColor', '#3498db');
  saveEvents();

  // fecha modal e atualiza lista
  editModalOverlay.classList.remove('open');
  openModal(currentDateStr);
};
confirmYesBtn.onclick = () => {
  editingEvent.remove();
  saveEvents();

  // fecha modais
  confirmDeleteOverlay.classList.remove('open');
  editModalOverlay.classList.remove('open');
  
  // atualiza lista
  openModal(currentDateStr);
};

// Se usuário cancelar
confirmNoBtn.onclick = () => {
  confirmDeleteOverlay.classList.remove('open');
};

// Botão X também fecha o confirm
closeConfirmBtn.onclick = () => {
  confirmDeleteOverlay.classList.remove('open');
};
closeEditModal.onclick = () => {
    editModalOverlay.classList.remove('open');
  };

      // Fecha modal
      closeBtn.onclick = () => {
        eventPanel.classList.remove('open');
  form.classList.add('hidden');        // esconde o formulário
  eventsList.style.display = '';       // mostra a lista
  addBtn.style.display = ''; 
      };

      // Botão “Novo Agendamento”
      addBtn.onclick = () => {
        form.reset();
        eventsList.style.display = 'none'
        addBtn.style.display     = 'none'
        form.classList.remove('hidden')
      };

      // Salva novo evento
      form.onsubmit = e => {
        e.preventDefault();
        const clientName = form.clientName.value.trim();
        const time       = form.time.value;
        const description= form.description.value.trim();
        const phone = form.phone.value.trim();
        const startISO   = `${currentDateStr}T${time}`;

        calendar.addEvent({
          title: `${time} - ${clientName}`,
          start: startISO,
          allDay: false,
          extendedProps: { clientName, phone, description, status: 'Agendado' },
          backgroundColor: '#5cb85c'
        });

        saveEvents();
        form.classList.add('hidden')
  eventsList.style.display = ''
  addBtn.style.display      = ''
        openModal(currentDateStr);
      };

      // Armazena no localStorage
      function saveEvents() {
        const evs = calendar.getEvents().map(ev => ({
          title: ev.title,
          start: ev.startStr,
          backgroundColor: ev.backgroundColor,
          extendedProps: {
            clientName:  ev.extendedProps.clientName,
            phone:       ev.extendedProps.phone || '',
            description: ev.extendedProps.description,
            status:      ev.extendedProps.status
          }
        }));
        localStorage.setItem('events', JSON.stringify(evs));
      }
    });