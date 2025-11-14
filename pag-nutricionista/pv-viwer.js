// pv-viwer.js — versão limpa e consolidada
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const overlay = document.getElementById('cp-patientOverlay');
  const panel = document.getElementById('cp-patientPanel');
  const closeBtn = document.getElementById('cp-closePanel');
  const navItems = $$('.cp-nav-item');
  const sections = {
    dados: document.getElementById('cp-section-dados'),
    anamnese: document.getElementById('cp-section-anamnese'),
    gasto: document.getElementById('cp-section-gasto'),
    imc: document.getElementById('cp-section-imc'),
    receitas: document.getElementById('cp-section-receitas'),
    peso: document.getElementById('cp-section-peso')
  };

  const editorEl = document.getElementById('cp-anamneseEditor');
  const saveBtn = document.getElementById('cp-saveAnamnese');
  const recipeListEl = document.getElementById('cp-recipesList');

  let currentPatientIndex = null;
  let autosaveIntervalId = null;
  let autosaveDirty = false;

  function safeSlug(s) {
    try {
      return String(s || 'paciente')
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^\w\-]+/g, '')
        .replace(/\_+/g, '_')
        .replace(/^\_+|\_+$/g, '');
    } catch {
      return 'paciente';
    }
  }

  function getAnamneseKey(patient) {
    return `cp_anamnese_${safeSlug(patient.fullName || 'paciente')}`;
  }

  function loadPatients() {
    try { return JSON.parse(localStorage.getItem('patients') || '[]'); }
    catch { return []; }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* Minimal translation + conversion helpers (kept small and local) */
  const ING_TRANSLATIONS = {
    chicken: 'frango', tomato: 'tomate', tomatoes: 'tomate', garlic: 'alho',
    ginger: 'gengibre', 'vegetable oil': 'óleo vegetal', 'olive oil': 'azeite',
    onion: 'cebola', sugar: 'açúcar', salt: 'sal', butter: 'manteiga',
    milk: 'leite', egg: 'ovo', rice: 'arroz', water: 'água',
    cream: 'creme de leite', 'fresh cream': 'creme de leite',
    'lemon juice': 'suco de limão', 'lime juice': 'suco de limão',
    banana: 'banana', strawberry: 'morango', avocado: 'abacate', olive: 'azeitona'
  };

  const UNIT_MAP = {
    cup: { factor: 240, unit: 'mL' }, cups: { factor: 240, unit: 'mL' },
    tbsp: { factor: 15, unit: 'mL' }, tablespoon: { factor: 15, unit: 'mL' }, tablespoons: { factor: 15, unit: 'mL' },
    tsp: { factor: 5, unit: 'mL' }, teaspoon: { factor: 5, unit: 'mL' }, teaspoons: { factor: 5, unit: 'mL' },
    oz: { factor: 28.35, unit: 'g' }, ounce: { factor: 28.35, unit: 'g' }, ounces: { factor: 28.35, unit: 'g' },
    lb: { factor: 453.6, unit: 'g' }, pound: { factor: 453.6, unit: 'g' },
    pint: { factor: 473, unit: 'mL' }, pints: { factor: 473, unit: 'mL' },
    quart: { factor: 946, unit: 'mL' }, quarts: { factor: 946, unit: 'mL' },
    g: { factor: 1, unit: 'g' }, gram: { factor: 1, unit: 'g' }, grams: { factor: 1, unit: 'g' },
    kg: { factor: 1000, unit: 'g' }, kilogram: { factor: 1000, unit: 'g' },
    ml: { factor: 1, unit: 'mL' }, l: { factor: 1000, unit: 'mL' }, liter: { factor: 1000, unit: 'mL' }
  };

  function translateIngredientName(name) {
    if (!name) return name;
    const key = String(name).trim().toLowerCase();
    if (ING_TRANSLATIONS[key]) return ING_TRANSLATIONS[key];
    for (const k in ING_TRANSLATIONS) if (key.includes(k)) return ING_TRANSLATIONS[k];
    return name;
  }

  const TEXT_MAP = {
    'to taste': 'a gosto', 'finely chopped': 'picado fino', 'chopped': 'picado',
    'step': 'PASSO', 'minutes': 'minutos', 'minute': 'minuto'
  };
  function translateText(str) {
    if (!str) return str;
    let out = String(str);
    Object.keys(TEXT_MAP).forEach(k => {
      const re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b','ig');
      out = out.replace(re, (m) => (/^[A-Z]/.test(m) ? TEXT_MAP[k].charAt(0).toUpperCase()+TEXT_MAP[k].slice(1) : TEXT_MAP[k]));
    });
    return out;
  }

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

  function convertMeasure(meas, scale = 1) {
    if (!meas) return '';
    let text = String(meas).trim();
    // capture number + optional unit + rest
    const match = text.match(/^([\d\s\/.,]+)\s*([a-zA-Z\.]+)?(.*)$/);
    if (!match) return scale !== 1 ? `${text} (x${scale})` : text;
    const rawNum = match[1].trim();
    const unitRaw = (match[2] || '').toLowerCase().replace(/\.$/,'');
    const rest = (match[3] || '').trim();
    let value = null;
    try {
      if (rawNum.includes(' ')) {
        const parts = rawNum.split(' ').filter(Boolean);
        let acc = 0;
        parts.forEach(p => {
          if (p.includes('/')) {
            const [a,b] = p.split('/').map(x => parseFloat(x.replace(',','.')));
            if (!isNaN(a) && !isNaN(b) && b!==0) acc += a/b;
          } else {
            const n = parseFloat(p.replace(',','.'));
            if (!isNaN(n)) acc += n;
          }
        });
        value = acc;
      } else if (rawNum.includes('/')) {
        const [a,b] = rawNum.split('/').map(x => parseFloat(x.replace(',','.')));
        if (!isNaN(a) && !isNaN(b) && b!==0) value = a/b;
      } else {
        const n = parseFloat(rawNum.replace(',','.'));
        if (!isNaN(n)) value = n;
      }
    } catch { value = null; }

    if (value !== null && unitRaw) {
      const map = UNIT_MAP[unitRaw];
      if (map) {
        const scaledVal = value * scale * map.factor;
        const outUnit = map.unit;
        if (outUnit === 'mL' && scaledVal >= 1000) return `${(scaledVal/1000).toFixed(2)} L${rest ? ' ' + rest : ''}`;
        if (outUnit === 'g' && scaledVal >= 1000) return `${(scaledVal/1000).toFixed(2)} kg${rest ? ' ' + rest : ''}`;
        return `${Number.isInteger(scaledVal) ? scaledVal : scaledVal.toFixed(2)} ${outUnit}${rest ? ' ' + rest : ''}`;
      }
      if (['g','gram','grams'].includes(unitRaw)) {
        const v = value*scale; if (v>=1000) return `${(v/1000).toFixed(2)} kg${rest? ' '+rest:''}`; return `${Number.isInteger(v)?v:v.toFixed(2)} g${rest? ' '+rest:''}`;
      }
      if (['ml','l','liter','litre'].includes(unitRaw)) {
        let v = value * scale * (unitRaw==='l' || unitRaw==='liter' || unitRaw==='litre' ? 1000 : 1);
        if (v>=1000) return `${(v/1000).toFixed(2)} L${rest? ' '+rest:''}`; return `${Number.isInteger(v)?v:v.toFixed(2)} mL${rest? ' '+rest:''}`;
      }
    }
    if (value !== null) {
      const scaled = value*scale;
      return `${Number.isInteger(scaled)?scaled:scaled.toFixed(2)}${unitRaw? ' '+unitRaw:''}${rest? ' '+rest:''}`;
    }
    return scale !== 1 ? `${text} (x${scale})` : text;
  }

  // Recipes UI
  function patientRecipesKey(patient) { return `patient_recipes_${safeSlug(patient.fullName || 'paciente')}`; }

  function updateRecipesBadgeFor(patient) {
    try {
      const key = patientRecipesKey(patient);
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      const nav = document.querySelector('.cp-nav-item[data-section="receitas"]');
      if (!nav) return;
      const old = nav.querySelector('.cp-rec-badge'); if (old) old.remove();
      if (list.length > 0) {
        const span = document.createElement('span');
        span.className = 'cp-rec-badge';
        span.textContent = list.length;
        span.style.marginLeft = '8px';
        span.style.background = '#2e7d32';
        span.style.color = '#fff';
        span.style.padding = '2px 8px';
        span.style.borderRadius = '999px';
        span.style.fontSize = '0.8rem';
        nav.appendChild(span);
      }
    } catch {}
  }

  // Renderiza receitas selecionadas do paciente dentro de #cp-recipesList
function renderSelectedRecipesFor(patient) {
  try {
    const key = patientRecipesKey(patient);
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    const container = document.getElementById('cp-recipesList');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<div class="empty-rcp">Nenhuma receita selecionada para este paciente. Pesquise e selecione receitas para adicioná‑las aqui.</div>';
      return;
    }
    container.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cp-recipe--list';
      row.dataset.id = item.idMeal;
      row.innerHTML = `
        <img src="${item.thumb}" alt="${escapeHtml(item.title)}" />
        <div class="cp-recipe--meta">
          <div class="cp-recipe--title">${escapeHtml(translateText(item.title || ''))}</div>
          <div class="cp-recipe--sub">${escapeHtml(translateText(item.area || ''))} • ${escapeHtml(translateText(item.category || ''))}</div>
        </div>
        <div class="cp-recipe--actions">
          <button class="btn cp-viewRecipe" data-id="${item.idMeal}">Visualizar</button>
          <button class="btn btn-outline cp-removeRecipe cp-recipe--remove" data-id="${item.idMeal}">Remover</button>
        </div>
      `;
      container.appendChild(row);
    });
  } catch (e) {
    console.error('Erro ao renderizar receitas do paciente', e);
  }
}


// Remove receita selecionada do paciente e atualiza badge/visão
function removeSelectedRecipeForCurrentPatient(idMeal) {
  if (currentPatientIndex === null) return alert('Abra a ficha do paciente primeiro.');
  try {
    const patients = loadPatients();
    const patient = patients[currentPatientIndex];
    if (!patient) return;
    const key = patientRecipesKey(patient);
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    const newList = list.filter(r => String(r.idMeal) !== String(idMeal));
    localStorage.setItem(key, JSON.stringify(newList));
    updateRecipesBadgeFor(patient);
    renderSelectedRecipesFor(patient);
  } catch (e) {
    console.error('Erro ao remover receita', e);
    alert('Erro ao remover receita. Veja console.');
  }
}


  



  function recipeTranslateCacheKeyForPatient(idMeal, patient) {
  return `cp_recipe_trans_${safeSlug(patient.fullName||'paciente')}_${idMeal}`;
}


// Helper: agrupa título + instructions em um bloco para traduzir com contexto
function buildRecipeTextForTranslate(mealObj) {
  const title = mealObj.strMeal || '';
  const instr = mealObj.strInstructions || '';
  const ingredients = [];
  for (let i=1;i<=20;i++){
    const ing = (mealObj[`strIngredient${i}`]||'').trim();
    const meas = (mealObj[`strMeasure${i}`]||'').trim();
    if (ing) ingredients.push(`${meas} ${ing}`.trim());
  }
  return `Title: ${title}\n\nIngredients:\n${ingredients.join('\n')}\n\nInstructions:\n${instr}`;
}

// Aplica texto traduzido no modal: separa e injeta título, ingredientes e instruções
function applyTranslatedRecipeToModal(idMeal, translatedFullText) {
  const bodyEl = document.getElementById('cp-rcp-body') || document.getElementById('cp-recipeBody');
  if (!bodyEl) return;
  // tentativa simples de parse: split por "Ingredients:" e "Instructions:"
  const m = translatedFullText;
  // heurística: procura por "Ingredients" ou suas traduções
  const instrIdx = m.toLowerCase().indexOf('instructions:');
  const ingIdx = m.toLowerCase().indexOf('ingredients:');
  let title = '', ingredients = '', instructions = '';
  if (ingIdx !== -1 && instrIdx !== -1) {
    title = m.slice(0, ingIdx).replace(/^title:\s*/i,'').trim();
    ingredients = m.slice(ingIdx, instrIdx).replace(/^ingredients:\s*/i,'').trim();
    instructions = m.slice(instrIdx).replace(/^instructions:\s*/i,'').trim();
  } else {
    // fallback: put all in instructions
    instructions = m;
  }

  // atualiza apenas as áreas conhecidas do modal (manter imagem e layout)
  // tenta localizar elementos já renderizados: título, ingredientes list, instruções container
  const titleEl = bodyEl.querySelector('h3') || bodyEl.querySelector('h2') || bodyEl.querySelector('h4');
  if (titleEl && title) titleEl.textContent = title;
  const listEl = document.getElementById('cp-ingredientsList');
  if (listEl && ingredients) {
    // transforma linhas em itens simples (fallback compacto)
    listEl.innerHTML = '';
    ingredients.split('\n').filter(Boolean).forEach(line=>{
      const div = document.createElement('div');
      div.className = 'cp-ingredient';
      // heurística: separa quantidade / nome por primeiro espaço
      const parts = line.trim().split(/\s+-?\s+/);
      div.innerHTML = `<span class="name">${escapeHtml(line)}</span>`;
      listEl.appendChild(div);
    });
  }
  // instruções
  const instrContainer = Array.from(bodyEl.querySelectorAll('div')).find(d=>d.style.whiteSpace==='pre-wrap' || d.innerText && d.innerText.length>50 && d.innerText.includes('PASSO') || d.innerText.includes('Instruções'));
  if (instrContainer && instructions) instrContainer.textContent = instructions;
}



  document.getElementById('cp-recipesList')?.addEventListener('click', (ev) => {
  const viewBtn = ev.target.closest('.cp-viewRecipe');
  if (viewBtn) {
    const id = viewBtn.dataset.id;
    
    return;
  }
  const remBtn = ev.target.closest('.cp-removeRecipe');
  if (remBtn) {
    const id = remBtn.dataset.id;
    if (!confirm('Remover esta receita da lista do paciente?')) return;
    removeSelectedRecipeForCurrentPatient(id);
    return;
  }
});


  /* ===== Status do paciente dentro da ficha (cp-section) ===== */

  function setPatientActiveFlag(index, isActive) {
    try {
      const list = loadPatients();
      if (!Array.isArray(list) || !list[index]) return;
      list[index].active = Boolean(isActive);
      list[index].status = list[index].active ? 'active' : 'inactive';
      localStorage.setItem('patients', JSON.stringify(list));
      window.dispatchEvent(new StorageEvent('storage', { key: 'patients' }));
    } catch (e) {
      console.error('Erro ao salvar status do paciente', e);
    }
  }
  

function updateCpStatusControl(isActive) {
  const ctrl = document.getElementById('cp-statusControl');
  if (!ctrl) return;
  ctrl.dataset.state = isActive ? 'true' : 'false';
  if (isActive) {
    ctrl.classList.remove('inactive');
    ctrl.setAttribute('aria-checked', 'true');
    const t = ctrl.querySelector('.cp-status-text'); if (t) t.textContent = 'Ativo';
  } else {
    ctrl.classList.add('inactive');
    ctrl.setAttribute('aria-checked', 'false');
    const t = ctrl.querySelector('.cp-status-text'); if (t) t.textContent = 'Inativo';
  }
}
  


function bindCpStatus() {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('#cp-statusControl');
    if (!el) return;
    const cur = el.dataset.state === 'true';
    const next = !cur;
    updateCpStatusControl(next);
    if (currentPatientIndex !== null && typeof currentPatientIndex !== 'undefined') {
      setPatientActiveFlag(currentPatientIndex, next);
    }
  });

  document.addEventListener('keydown', (ev) => {
    const active = document.activeElement;
    if (!active || active.id !== 'cp-statusControl') return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      const cur = active.dataset.state === 'true';
      const next = !cur;
      updateCpStatusControl(next);
      if (currentPatientIndex !== null && typeof currentPatientIndex !== 'undefined') {
        setPatientActiveFlag(currentPatientIndex, next);
      }
    }
  });
}


  /* panel, editor, binds (kept as before) */
  function openPanelWithPatient(patient, index) {
    currentPatientIndex = (typeof index === 'number') ? index : findPatientIndexByName(patient.fullName);
    if (currentPatientIndex === -1) currentPatientIndex = null;
    $('#cp-name').textContent = patient.fullName || '—';
    $('#cp-email').textContent = patient.email || '—';
    $('#cp-phone').textContent = patient.phone || '—';
    $('#cp-address').textContent = [patient.rua, patient.bairro, patient.cep].filter(Boolean).join(', ') || '—';
    $('#cp-sex').textContent = patient.sexo || '—';
    $('#cp-subtitle').textContent = patient.fullName || 'Paciente';
    $('#cp-weight').value = patient.weight || '';
    $('#cp-height').value = patient.height || '';
    $('#cp-imc-weight').value = patient.weight || '';
    $('#cp-imc-height').value = patient.height || '';

    // inicializa controle de status no painel (padrão true se não existir)
const isActive = Boolean(patient.active !== undefined ? patient.active : true);
updateCpStatusControl(isActive);
// após carregar anamnese e antes de mostrar o overlay/painel
try {
  updateRecipesBadgeFor(patient);
  // se a seção ativa for receitas, também renderiza as receitas
  const activeSection = document.querySelector('.cp-nav-item.cp-active')?.dataset.section;
  if (activeSection === 'receitas') renderSelectedRecipesFor(patient);
} catch(e){ console.warn('Erro ao atualizar receitas:', e); }



    try {
      const key = getAnamneseKey(patient); const saved = localStorage.getItem(key);
      if (editorEl) { editorEl.innerHTML = saved || ''; editorEl.dataset.savedHtml = editorEl.innerHTML || ''; }
    } catch (err) { console.warn('Erro ao carregar anamnese:', err); if (editorEl) { editorEl.innerHTML=''; editorEl.dataset.savedHtml=''; } }
    if (overlay) overlay.classList.remove('hidden'); if (panel) panel.classList.remove('hidden');
    showSection('dados'); startAutosave();

    if (document.querySelector('.cp-nav-item.cp-active')?.dataset.section === 'peso') {
  const p = loadPatients()[currentPatientIndex];
  if (p) { renderPesoList(p); renderPesoChart(p); }
}
  }

  function closePanel(){ stopAutosave(); if (overlay) overlay.classList.add('hidden'); if (panel) panel.classList.add('hidden'); currentPatientIndex=null; }
  function findPatientIndexByName(name){ const list = loadPatients(); return list.findIndex(p => (p.fullName||'').trim() === (name||'').trim()); }
  function showSection(key){ Object.values(sections).forEach(s=> s && s.classList.add('hidden')); const el=sections[key]; if(el) el.classList.remove('hidden'); }
function bindNav(){
  navItems.forEach(item=> item.addEventListener('click', ()=>{
    navItems.forEach(n=>n.classList.remove('cp-active'));
    item.classList.add('cp-active');
    showSection(item.dataset.section);
    // Se abriu Receitas, renderiza as receitas do paciente atual
    if (item.dataset.section === 'receitas') {
      if (currentPatientIndex !== null) {
        const patients = loadPatients();
        const patient = patients[currentPatientIndex];
        if (patient) renderSelectedRecipesFor(patient);
      }
    }
  }));
}

    
  function bindEditorToolbar(){ $$('.cp-tool-btn').forEach(btn=> btn.addEventListener('click', ()=>{ document.execCommand(btn.dataset.cmd,false,null); autosaveDirty=true; })); }
  function robustSaveAnamnese(){ if(!saveBtn) return; saveBtn.addEventListener('click', ()=>{ try{ if (currentPatientIndex===null) return alert('Nenhum paciente aberto.'); const list = loadPatients(); const patient = list[currentPatientIndex]; if(!patient||!patient.fullName) return alert('Paciente inválido para salvar anamnese.'); if(!editorEl) return alert('Editor de anamnese não encontrado.'); const html = editorEl.innerHTML; const key = getAnamneseKey(patient); localStorage.setItem(key, html); const prev=saveBtn.textContent; saveBtn.textContent='Salvo ✓'; editorEl.dataset.savedHtml=html; autosaveDirty=false; setTimeout(()=>saveBtn.textContent=prev,1200);}catch(e){console.error('Erro ao salvar anamnese:',e);alert('Falha ao salvar anamnese. Veja console para detalhes.');}}); }

  function startAutosave(){ if(!editorEl) return; const observer = new MutationObserver(()=>autosaveDirty=true); observer.observe(editorEl,{childList:true,subtree:true,characterData:true}); editorEl.addEventListener('input',()=>autosaveDirty=true); if(!autosaveIntervalId){ autosaveIntervalId = setInterval(()=>{ try{ if(!autosaveDirty) return; if(currentPatientIndex===null) return; const list = loadPatients(); const patient = list[currentPatientIndex]; if(!patient) return; const key = getAnamneseKey(patient); const html = editorEl.innerHTML; if(editorEl.dataset.savedHtml !== html){ localStorage.setItem(key, html); editorEl.dataset.savedHtml = html; if(saveBtn){ saveBtn.textContent='Salvo ✓'; setTimeout(()=>{ saveBtn.textContent='Salvar notas'; },900); } } autosaveDirty=false;}catch(e){console.error('Auto-save falhou:',e);} },3000); } editorEl._autosaveObserver = observer; }
  function stopAutosave(){ if(editorEl && editorEl._autosaveObserver){ editorEl._autosaveObserver.disconnect(); delete editorEl._autosaveObserver;} if(autosaveIntervalId){ clearInterval(autosaveIntervalId); autosaveIntervalId=null;} autosaveDirty=false; }

  function bindGastoCalorico(){ const btn = $('#cp-calcGasto'); if(!btn) return; btn.addEventListener('click', ()=>{ const weight = parseFloat($('#cp-weight').value); const height = parseFloat($('#cp-height').value); const age = parseFloat($('#cp-age').value)||30; const activity = parseFloat($('#cp-activity').value)||1.55; const sexo = $('#cp-sex').textContent.trim().toLowerCase(); if(!weight||!height) return alert('Informe peso e altura.'); let tmb = (sexo==='feminino'||sexo==='f') ? 10*weight+6.25*height-5*age-161 : 10*weight+6.25*height-5*age+5; const daily=Math.round(tmb*activity); $('#cp-tmb').textContent=`${Math.round(tmb)} kcal`; $('#cp-daily').textContent=`${daily} kcal`; }); }
  function bindImc(){ const btn = $('#cp-calcImc'); if(!btn) return; btn.addEventListener('click', ()=>{ const w=parseFloat($('#cp-imc-weight').value); const hcm=parseFloat($('#cp-imc-height').value); if(!w||!hcm) return alert('Informe peso e altura.'); const h=hcm/100; const imc=w/(h*h); $('#cp-imc').textContent=imc.toFixed(2); $('#cp-imcClass').textContent=classifyImc(imc); }); }
  function classifyImc(v){ if(v<18.5) return 'Abaixo do peso'; if(v<25) return 'Peso normal'; if(v<30) return 'Sobrepeso'; if(v<35) return 'Obesidade grau I'; if(v<40) return 'Obesidade grau II'; return 'Obesidade grau III'; }

  function bindRecipeSearch(){ const btn=$('#cp-searchRecipes'); if(!btn) return; btn.addEventListener('click', ()=>{ const q=$('#cp-recipeQuery').value.trim(); fetchRecipes(q); }); if(recipeListEl){ recipeListEl.addEventListener('click', async(ev)=>{ const b=ev.target.closest('.cp-viewRecipe'); if(!b) return; const id=b.dataset.id; try{ const r=await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`); const d=await r.json(); const m=d.meals && d.meals[0]; if(!m) return alert('Receita não encontrada.'); (id); }catch(e){ alert('Erro ao carregar receita.'); } }); } }

  function bindOpenFichaDelegation(){ document.addEventListener('click',(ev)=>{ const btn=ev.target.closest('.btn-outline'); if(!btn) return; if(btn.classList.contains('dropdown-toggle')) return; const parent=btn.closest('.patient-card'); if(!parent) return; const text=(btn.textContent||'').trim().toLowerCase(); if(!text.includes('abrir')) return; const nameEl=parent.querySelector('.patient-info span'); if(!nameEl) return; const name=nameEl.textContent.trim(); const list=loadPatients(); const idx=list.findIndex(p=>(p.fullName||'').trim()===name); if(idx===-1) return; openPanelWithPatient(list[idx], idx); }); }

  // === Controle de Peso (localStorage por paciente) ===
(function(){
  // helpers
  function pesoKeyForPatient(patient) { return `cp_pesos_${(patient && patient.fullName) ? safeSlug(patient.fullName) : 'paciente'}`; }

  function loadPesoRecords(patient) {
    try { return JSON.parse(localStorage.getItem(pesoKeyForPatient(patient)) || '[]'); } catch { return []; }
  }
  function savePesoRecords(patient, list) {
    try { localStorage.setItem(pesoKeyForPatient(patient), JSON.stringify(list || [])); } catch(e){ console.error(e); }
  }
// editar registro de peso (delegation)
document.getElementById('cp-peso-list')?.addEventListener('click', async (ev) => {
  const editBtn = ev.target.closest('.cp-peso-edit');
  if (!editBtn) return;
  const idx = Number(editBtn.dataset.idx);
  if (Number.isNaN(idx)) return;
  if (currentPatientIndex === null) return alert('Abra a ficha de um paciente primeiro.');
  // carrega paciente e registros (ordem decrescente utilizada na renderização)
  const patients = loadPatients();
  const patient = patients[currentPatientIndex];
  if (!patient) return alert('Paciente inválido.');
  const key = pesoKeyForPatient(patient);
  let list = loadPesoRecords(patient).sort((a,b)=> new Date(b.date) - new Date(a.date));
  const rec = list[idx];
  if (!rec) return alert('Registro não encontrado.');
  // prompt simples para edição (substitua por modal se preferir)
  const novoPesoStr = prompt('Editar peso (kg):', String(rec.value));
  if (novoPesoStr === null) return; // cancelou
  const novoPeso = parseFloat(novoPesoStr.replace(',', '.'));
  if (isNaN(novoPeso) || novoPeso <= 0) return alert('Valor de peso inválido.');
  const novaData = prompt('Editar data (YYYY-MM-DD):', rec.date) || rec.date;
  // validação simples da data
  if (isNaN(new Date(novaData).getTime())) return alert('Data inválida.');
  // aplica mudanças
  rec.value = Number(novoPeso.toFixed(1));
  rec.date = novaData;
  // salva (mantendo a ordem original: armazenamos a lista sem resort; aqui salvamos a lista ordenada desc)
  savePesoRecords(patient, list);
  // feedback e re-render
  renderPesoList(patient);
  renderPesoChart(patient);
});

  // render lista
  function renderPesoList(patient) {
    const container = document.getElementById('cp-peso-list');
    if(!container) return;
    const list = loadPesoRecords(patient).sort((a,b)=> new Date(b.date) - new Date(a.date));
    container.innerHTML = '';
    if(!list.length) { container.innerHTML = '<div style="color:#6b8a6b;padding:8px;border-radius:8px;background:linear-gradient(180deg,#fff,#fbfff9);">Nenhum registro salvo.</div>'; return; }
    list.forEach((r, idx) => {
      const item = document.createElement('div');
      item.className = 'peso-item';
      item.innerHTML = `<div class="meta">${new Date(r.date).toLocaleDateString()} <span style="color:#9fb39a;margin-left:6px;font-weight:600">(${r.time || ''})</span></div><div style="display:flex;gap:8px;align-items:center;"><div class="peso">${Number(r.value).toFixed(1)} kg</div> 
      <button class="btn btn-outline cp-peso-edit" data-idx="${idx}">
  <i class="bi bi-pencil-square"></i>
</button>
      <button type="button" class="btn btn-outline cp-peso-remove" data-idx="${idx}" title="Remover" aria-label="Remover ingrediente">✖</button></div>`;
      container.appendChild(item);
    });
  }

  // simple SVG line chart (small, dependency-free)
  function renderPesoChart(patient) {
    const chartWrap = document.getElementById('cp-peso-chart');
    if(!chartWrap) return;
    const data = loadPesoRecords(patient).slice().sort((a,b)=> new Date(a.date) - new Date(b.date));
    if(!data.length) { chartWrap.innerHTML = '<div style="color:#6b8a6b;padding:8px;border-radius:8px;">Sem dados para exibir</div>'; return; }

    const values = data.map(d => Number(d.value));
    const dates = data.map(d => d.date);
    const w = Math.max(300, chartWrap.clientWidth || 600);
    const h = Math.max(140, chartWrap.clientHeight || 220);
    const pad = 24;
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const vRange = (maxV - minV) || 1;

    // build points
    const points = values.map((v, i) => {
      const x = pad + (i / (values.length - 1 || 1)) * (w - pad*2);
      const y = pad + (1 - (v - minV) / vRange) * (h - pad*2);
      return { x, y, v, d: dates[i] };
    });

    // polyline path
    const pathD = points.map((p,i)=> (i===0?`M ${p.x} ${p.y}`:`L ${p.x} ${p.y}`)).join(' ');

    // grid & labels
    const svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gráfico de peso">
      <defs>
        <linearGradient id="gLine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="rgba(46,125,50,0.16)"></stop>
          <stop offset="1" stop-color="rgba(46,125,50,0)"></stop>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${w}" height="${h}" fill="transparent"></rect>
      <!-- horizontal grid lines + labels -->
      ${[0,0.25,0.5,0.75,1].map(t => {
        const y = pad + t * (h - pad*2);
        const val = (maxV - t*(maxV-minV)).toFixed(1);
        return `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="#e6efe6" stroke-width="1"/><text x="${pad-6}" y="${y+4}" font-size="10" fill="#6b8a6b" text-anchor="end">${val}</text>`;
      }).join('')}
      <!-- area under curve -->
      <path d="${pathD} L ${points[points.length-1].x} ${h-pad} L ${points[0].x} ${h-pad} Z" fill="url(#gLine)" opacity="0.9"/>
      <!-- line -->
      <path d="${pathD}" fill="none" stroke="#2e7d32" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
      <!-- points -->
      ${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.6" fill="#fff" stroke="#2e7d32" stroke-width="1.8"><title>${new Date(p.d).toLocaleDateString()}: ${p.v.toFixed(1)} kg</title></circle>`).join('')}
      <!-- x labels -->
      ${points.map((p,i)=>`<text x="${p.x}" y="${h - 6}" font-size="10" fill="#4d7a55" text-anchor="middle">${new Date(p.d).toLocaleDateString()}</text>`).join('')}
    </svg>`;

    chartWrap.innerHTML = svg;
  }

  // binds and actions
  function bindPesoControls() {
    const addBtn = document.getElementById('cp-peso-add');
    const valEl = document.getElementById('cp-peso-valor');
    const dateEl = document.getElementById('cp-peso-data');
    const listEl = document.getElementById('cp-peso-list');
    const clearBtn = document.getElementById('cp-peso-clear');

    if(addBtn) {
      addBtn.addEventListener('click', () => {
        if(currentPatientIndex === null) return alert('Abra a ficha de um paciente primeiro.');
        const v = parseFloat(valEl.value);
        const d = dateEl.value || (new Date()).toISOString().slice(0,10);
        if(!v || isNaN(v)) return alert('Informe um valor de peso válido.');
        const patients = loadPatients();
        const patient = patients[currentPatientIndex];
        if(!patient) return alert('Paciente inválido.');
        const key = pesoKeyForPatient(patient);
        const list = loadPesoRecords(patient);
        list.push({ value: Number(v.toFixed(1)), date: d, time: new Date().toLocaleTimeString().slice(0,5) });
        savePesoRecords(patient, list);
        renderPesoList(patient);
        renderPesoChart(patient);
        // feedback
        addBtn.textContent = 'Adicionado ✓';
        setTimeout(()=> addBtn.textContent = 'Adicionar registro', 900);
        valEl.value = '';
      });
    }

    if(listEl) {
      listEl.addEventListener('click', (ev) => {
        const rem = ev.target.closest('.cp-peso-remove');
        if(!rem) return;
        if(!confirm('Excluir esse registro?')) return;
        const idx = Number(rem.dataset.idx);
        if(currentPatientIndex === null) return;
        const patients = loadPatients();
        const patient = patients[currentPatientIndex];
        if(!patient) return;
        const arr = loadPesoRecords(patient).sort((a,b)=> new Date(b.date) - new Date(a.date));
        arr.splice(idx,1);
        // save preserving order (reverse back)
        savePesoRecords(patient, arr);
        renderPesoList(patient);
        renderPesoChart(patient);
      });
    }

    if(clearBtn) {
      clearBtn.addEventListener('click', () => {
        if(currentPatientIndex === null) return alert('Abra a ficha de um paciente primeiro.');
        if(!confirm('Limpar todos os registros de peso deste paciente?')) return;
        const patients = loadPatients();
        const patient = patients[currentPatientIndex];
        if(!patient) return;
        savePesoRecords(patient, []);
        renderPesoList(patient);
        renderPesoChart(patient);
      });
    }
  }

  // expose a função que atualiza visual quando abrir ficha
  function initPesoIntegration() {
    // bind sidebar nav item -> mostrar seção peso
    const nav = document.querySelector('.cp-nav-item[data-section="peso"]');
    if(nav) {
      nav.addEventListener('click', ()=> {
        navItems.forEach(n=>n.classList.remove('cp-active'));
        nav.classList.add('cp-active');
        showSection('peso');
        if(currentPatientIndex !== null) {
          const patients = loadPatients();
          const patient = patients[currentPatientIndex];
          if(patient) {
            renderPesoList(patient);
            renderPesoChart(patient);
          }
        }
      });
    }

    // ao abrir ficha (quando openPanelWithPatient é chamado) queremos renderizar se seção ativa for 'peso'
    const originalOpen = window._cp_openPanelWithPatient;
    window._cp_openPanelWithPatient = function(patient, idx) {
      if(typeof originalOpen === 'function') originalOpen(patient, idx);
      // depois de abrir
      try {
        if(document.querySelector('.cp-nav-item.cp-active')?.dataset.section === 'peso') {
          const p = loadPatients()[currentPatientIndex];
          if(p){ renderPesoList(p); renderPesoChart(p); }
        }
      } catch(e){ console.warn(e); }
    };

    // Expor helpers para código externo (resolve ReferenceError)
window.pesoKeyForPatient = pesoKeyForPatient;
window.loadPesoRecords = loadPesoRecords;
window.savePesoRecords = savePesoRecords;


    bindPesoControls();
  }

  // inicializa quando DOM pronto
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPesoIntegration); else initPesoIntegration();
})();


  function init(){
    if(closeBtn) closeBtn.addEventListener('click', closePanel);

    if(overlay) overlay.addEventListener('click', closePanel);
    bindNav(); bindEditorToolbar(); robustSaveAnamnese(); bindGastoCalorico(); bindImc(); bindRecipeSearch(); bindOpenFichaDelegation(); bindCpStatus();
    window._cp_openPanelWithPatient = openPanelWithPatient;
    window._cp_closePanel = closePanel;
    document.getElementById('cp-openRecipeSearch')?.addEventListener('click', ()=> {
  const input = document.getElementById('cp-recipeQuery');
  if (input) { input.focus(); input.scrollIntoView({behavior:'smooth', block:'center'}); }
});
// foco ao pressionar Enter no input dispara a pesquisa
const recipeInput = document.getElementById('cp-recipeQuery');
if (recipeInput) {
  recipeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('cp-searchRecipes')?.click();
    }
  });
}

  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // === Sincronizar status do paciente com lista principal ===
function syncPatientStatus(fullName, newStatus) {
  try {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const idx = patients.findIndex(p => (p.fullName || '').trim().toLowerCase() === fullName.trim().toLowerCase());
    if (idx !== -1) {
      patients[idx].status = newStatus; // atualiza status
      localStorage.setItem('patients', JSON.stringify(patients));
    }
  } catch (e) {
    console.error('Erro ao sincronizar status:', e);
  }
}

// Intercepta mudanças de status no painel do paciente
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-status-control]');
  if (!el) return;
  const newStatus = el.value || el.dataset.status || 'active';
  const nameEl = document.querySelector('#cp-patientName, .cp-patient-name');
  const fullName = nameEl ? nameEl.textContent.trim() : null;
  if (fullName) syncPatientStatus(fullName, newStatus);
});


const modal = document.getElementById('modalReceita');
const btnAbrir = document.getElementById('btnNovaReceita');
const btnFechar = document.getElementById('fecharModal');
const form = document.getElementById('formReceita');

const inputImagem = document.getElementById('inputImagemPrato');
const previewImg = document.getElementById('previewImagem');
const nomeArquivo = document.getElementById('nomeArquivo'); 

const listaIng = document.getElementById('listaIngredientes');
const btnAddIng = document.getElementById('btnAddIngrediente');
const btnCopiarIng = document.getElementById('btnCopiarIngredientes');

const botaoSalvar = document.querySelector('.botao-salvar');
const gridReceitas = document.getElementById('gridReceitas');

// abrir modal
if (btnAbrir) {
  btnAbrir.addEventListener('click', () => {
    modal.style.display = 'flex';
    // rolagem para o topo do modal (opcional)
    modal.scrollTop = 0;
  });
}

// fechar modal
if (btnFechar) {
  btnFechar.addEventListener('click', () => {
    modal.style.display = 'none';
    form.reset();
    previewImg.src = '';
    previewImg.style.display = 'none';
    // remover ingredientes extras (se quiser voltar ao estado inicial de 4, descomente)
    // resetListaIngredientes();
  });
}

// função auxiliar para resetar ingredientes para 4 iniciais (opcional)
function resetListaIngredientes() {
  // remove todos e recria 4 linhas vazias
  listaIng.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    listaIng.appendChild(criarLinhaIngrediente(i));
  }
}

// cria uma linha de ingrediente DOM
function criarLinhaIngrediente(numero) {
  const linha = document.createElement('div');
  linha.className = 'linha-ingrediente';

  linha.innerHTML = `
    <input type="text" placeholder="Ingrediente ${numero}" class="input-ingrediente">
    <input type="number" placeholder="Qtd" class="input-qtd" min="0">
    <select class="input-medida">
      <option value="g">g</option>
      <option value="ml">ml</option>
      <option value="xícara">xícara</option>
      <option value="colher">colher</option>
      <option value="unidade">unidade</option>
    </select>
    <button type="button" class="btn-remover-ingrediente" title="Remover" aria-label="Remover ingrediente">✖</button>
  `;

  // adicionar listener para remover essa linha
  const btnRemover = linha.querySelector('.btn-remover-ingrediente');
  btnRemover.addEventListener('click', () => {
    linha.remove();
    atualizarPlaceholdersIngredientes();
  });

  return linha;
}

// atualiza placeholders (Ingrediente 1, 2, 3...) após adições/remissões
function atualizarPlaceholdersIngredientes() {
  const linhas = listaIng.querySelectorAll('.linha-ingrediente');
  linhas.forEach((l, idx) => {
    const inputNome = l.querySelector('.input-ingrediente');
    if (inputNome) inputNome.placeholder = `Ingrediente ${idx + 1}`;
  });
}

// Inicializa as 4 linhas (se já não existirem)
(function inicializarIngredientes() {
  const existentes = listaIng.querySelectorAll('.linha-ingrediente');
  if (existentes.length === 0) {
    for (let i = 1; i <= 4; i++) listaIng.appendChild(criarLinhaIngrediente(i));
  } else {
    // caso já tenha linhas (porque seu HTML tem), adiciona botão de remover a cada uma
    existentes.forEach((linha, idx) => {
      // se já tiver botão remover, pula
      if (!linha.querySelector('.btn-remover-ingrediente')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-remover-ingrediente';
        btn.textContent = '✖';
        btn.title = 'Remover';
        btn.addEventListener('click', () => {
          linha.remove();
          atualizarPlaceholdersIngredientes();
        });
        linha.appendChild(btn);
      }
    });
    atualizarPlaceholdersIngredientes();
  }
})();


// Preview da imagem — usa FileReader e garante display:block
if (inputImagem) {
  inputImagem.addEventListener('change', () => {
    const file = inputImagem.files[0];
    if (!file) {
      previewImg.src = '';
      previewImg.style.display = 'none';
      return;
    }

    if (file) {
        nomeArquivo.textContent = file.name; // exibe nome do arquivo
      } else {
        nomeArquivo.textContent = 'Nenhum arquivo escolhido';
      }
    // somente imagens
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um arquivo de imagem.');
      inputImagem.value = '';
      previewImg.style.display = 'none';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.style.display = 'block'; // garante que apareça
    };
    reader.readAsDataURL(file);
  });
}

// adicionar novo ingrediente (incremental)
if (btnAddIng) {
  btnAddIng.addEventListener('click', () => {
    const atual = listaIng.querySelectorAll('.linha-ingrediente').length;
    const nova = criarLinhaIngrediente(atual + 1);
    listaIng.appendChild(nova);
    // rolar até o final do container para mostrar o novo input (se necessário)
    nova.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// copiar lista de ingredientes com quantidade e medida
if (btnCopiarIng) {
  btnCopiarIng.addEventListener('click', () => {
    const linhas = listaIng.querySelectorAll('.linha-ingrediente');
    const arr = Array.from(linhas).map(l => {
      const nome = (l.querySelector('.input-ingrediente') || { value: '' }).value.trim();
      const qtd = (l.querySelector('.input-qtd') || { value: '' }).value.trim();
      const med = (l.querySelector('.input-medida') || { value: '' }).value.trim();
      if (!nome) return null;
      // Formatação: "200 g — Frango" ou "2 xícara — Arroz"
      if (qtd) return `${qtd} ${med} — ${nome}`;
      return `${nome}`;
    }).filter(Boolean);

    if (arr.length === 0) {
      alert('Nenhum ingrediente para copiar.');
      return;
    }

    const texto = arr.join('\n');
    navigator.clipboard.writeText(texto).then(() => {
      alert('Lista de ingredientes copiada para a área de transferência!');
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); alert('Lista copiada!'); } catch(e){ alert('Não foi possível copiar automaticamente.'); }
      document.body.removeChild(ta);
    });
  });
}
// ======== SALVAR RECEITA E EXIBIR ========
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = document.getElementById('nomePrato').value.trim() || 'Receita sem nome';
    const instrucoes = document.getElementById('instrucoes').value.trim() || '';
    const modo = document.getElementById('modoPreparo').value.trim() || '';
    const imgSrc = previewImg.src || '';

    // ingredientes
    const linhas = listaIng.querySelectorAll('.linha-ingrediente');
    const ingredientes = Array.from(linhas).map(l => {
      const nomeIng = l.querySelector('.input-ingrediente')?.value.trim();
      const qtd = l.querySelector('.input-qtd')?.value.trim();
      const med = l.querySelector('.input-medida')?.value.trim();
      if (!nomeIng) return null;
      return { nome: nomeIng, qtd, med };
    }).filter(Boolean);

    // criar objeto receita
    const receita = { nome, instrucoes, modo, imgSrc, ingredientes };

    // salvar no localStorage
    const receitasSalvas = JSON.parse(localStorage.getItem('receitas')) || [];
    receitasSalvas.push(receita);
    localStorage.setItem('receitas', JSON.stringify(receitasSalvas));
    recarregarGridReceitas();
    window.dispatchEvent(new CustomEvent('receitas:atualizadas', { detail: { added: receita } }));



    // fechar modal e resetar
    modal.style.display = 'none';
    form.reset();
    previewImg.src = '';
    previewImg.style.display = 'none';
  });
}
window.addEventListener('storage', (ev) => {
  if (ev.key === 'receitas') {
    // recarrega a grade quando receitas mudarem em outra aba
    try { recarregarGridReceitas(); } catch(e) { console.error('Falha ao sincronizar receitas', e); }
  }
});


// ======== FUNÇÃO PARA CRIAR CARD NA TELA ========
function adicionarCardReceita(receita) {
  const card = document.createElement('div');
  card.className = 'receita-card';
  const imgHtml = receita.imgSrc
    ? `<img src="${receita.imgSrc}" alt="${receita.nome}">`
    : `<div style="height:120px;background:#eee;border-radius:8px;"></div>`;
  
  card.innerHTML = `
    ${imgHtml}
    <h3>${receita.nome}</h3>
    <p><strong>Ingredientes:</strong><br>${receita.ingredientes.map(i => `${i.qtd || ''} ${i.med || ''} ${i.nome}`).join(', ')}</p>
    <p><strong>Modo:</strong> ${receita.modo || '—'}</p>
  `;
  gridReceitas.appendChild(card);
}

// ======== RECARREGAR RECEITAS SALVAS AO ABRIR ========
window.addEventListener('DOMContentLoaded', () => {
  const receitasSalvas = JSON.parse(localStorage.getItem('receitas')) || [];
  receitasSalvas.forEach(adicionarCardReceita);
});

// --- Helpers para modal de visualização de receita ---
function criarModalVisualizacao() {
  if (document.getElementById('modalViewReceita')) return;
  const overlay = document.createElement('div');
  overlay.id = 'modalViewOverlay';
  overlay.style = 'z-index:10010000000;position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.id = 'modalViewReceita';
  modal.style = 'width:90%;max-width:800px;background:#fff;border-radius:10px;padding:16px;max-height:90vh;overflow:auto;position:relative;';

  modal.innerHTML = `
    <button id="modalViewClose" style="position:absolute;right:12px;top:8px;border:none;background:transparent;font-size:20px;cursor:pointer;">&times;</button>
    <div id="modalViewContent">Carregando...</div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) fecharModalView();
  });
  document.getElementById('modalViewClose').addEventListener('click', fecharModalView);
}

function abrirModalView(receita) {
  criarModalVisualizacao();
  const overlay = document.getElementById('modalViewOverlay');
  const content = document.getElementById('modalViewContent');
  overlay.style.display = 'flex';

  content.innerHTML = `
    ${receita.imgSrc ? `<img src="${receita.imgSrc}" alt="${escapeHtml(receita.nome)}" style="width:100%;max-height:320px;object-fit:cover;border-radius:8px;margin-bottom:12px;">` : ''}
    <h2 style="margin:0 0 8px 0;color:#164b2b">${escapeHtml(receita.nome)}</h2>
    <h4 style="margin:8px 0 6px 0;color:#235a2b">Ingredientes</h4>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
      ${receita.ingredientes.map(i => `<div style="background:#fbfffb;padding:8px;border-radius:8px;border:1px solid rgba(36,77,42,0.06)">${escapeHtml((i.qtd? i.qtd + ' ' + (i.med||'') + ' — ':'') + i.nome)}</div>`).join('')}
    </div>
    <h4 style="margin:8px 0 6px 0;color:#235a2b">Modo de preparo</h4>
    <div style="white-space:pre-wrap;color:#333;line-height:1.45">${escapeHtml(receita.modo || '—')}</div>
    <h4 style="margin:8px 0 6px 0;color:#235a2b">Instruções</h4>
    <div style="white-space:pre-wrap;color:#333;line-height:1.45">${escapeHtml(receita.instrucoes || '—')}</div>
  `;
}



function fecharModalView() {
  const overlay = document.getElementById('modalViewOverlay');
  if (overlay) overlay.style.display = 'none';
}

// escapeHtml reutilizado (se não existir no seu arquivo, inclua)
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// --- Função para remover receita por índice (ou por nome) ---
function excluirReceita(index) {
  try {
    const receitas = JSON.parse(localStorage.getItem('receitas') || '[]');
    if (index < 0 || index >= receitas.length) return;
    receitas.splice(index, 1);
    localStorage.setItem('receitas', JSON.stringify(receitas));
    // atualizar UI: limpar grade e re-renderizar todas
    recarregarGridReceitas();
  } catch (e) {
    console.error('Erro ao excluir receita', e);
    alert('Erro ao excluir receita. Veja console.');
  }
}

// --- Renderiza todos os cards usando index e adiciona atributos data-index e botões Visualizar/Excluir ---
function recarregarGridReceitas() {
  const grid = document.getElementById('gridReceitas');
  if (!grid) return;
  grid.innerHTML = '';
  const receitas = JSON.parse(localStorage.getItem('receitas') || '[]');
  receitas.forEach((r, idx) => {
    const card = document.createElement('div');
    card.className = 'receita-card';
    card.dataset.index = String(idx);
    const imgHtml = r.imgSrc ? `<img src="${r.imgSrc}" alt="${escapeHtml(r.nome)}">` : `<div style="height:120px;background:#eee;border-radius:8px;"></div>`;
    card.innerHTML = `
      ${imgHtml}
      <h3>${escapeHtml(r.nome)}</h3>
      <p><strong>Ingredientes:</strong> ${r.ingredientes.map(i => (i.qtd ? `${i.qtd} ${i.med} ` : '') + i.nome).filter(Boolean).join(', ')}</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
        <button class="btn view-recipe" data-index="${idx}" style="padding:8px 12px">Visualizar</button>
        <button class="btn btn-outline delete-recipe" data-index="${idx}" style="padding:8px 12px;border-color:rgba(179,56,56,0.12)">Excluir</button>
      </div>
    `;
    grid.appendChild(card);
  });
}



// delegação: tratar cliques em Visualizar e Excluir
document.addEventListener('click', function (ev) {
  const viewBtn = ev.target.closest('.view-recipe');
  if (viewBtn) {
    const idx = Number(viewBtn.dataset.index);
    const receitas = JSON.parse(localStorage.getItem('receitas') || '[]');
    const receita = receitas[idx];
    if (!receita) return alert('Receita não encontrada');
    abrirModalView(receita);
    return;
  }
  const delBtn = ev.target.closest('.delete-recipe');
  if (delBtn) {
    const idx = Number(delBtn.dataset.index);
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    excluirReceita(idx);
    return;
  }
});

// ao carregar a página, recarrega a grade (substitui a carga anterior)
window.addEventListener('DOMContentLoaded', function () {
  recarregarGridReceitas();
});


})();