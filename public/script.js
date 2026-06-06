const API_URL = '/api';
let questions = [];
let savedName = '';
let savedDescription = '';
let savedDate = '';
let savedTime = '';
let savedPrice = '';
let savedDeadline = '';
let savedMaxPeople = '';
let savedSaveAsTemplate = false;
let templates = [];
let excursions = [];
let myBookings = [];
let currentScreen = 'main';
let isAnimating = false;
let screenHistory = [];

function init() { checkAdmin(); }

function safeDate(d) { if(!d) return '—'; try { return new Date(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}); } catch { return '—'; } }
function safePrice(p) { const n=parseInt(p); if(isNaN(n)||n<=0) return '0'; return n.toLocaleString('ru-RU'); }
function safeText(t,f) { return t||f||''; }
function safeMaxPeople(m) { if(!m||m==='0'||m==='undefined'||m==='null') return 'Без ограничений'; return `До ${m} чел.`; }
function getTodayStr() { return new Date().toISOString().split('T')[0]; }
function getTomorrowStr() { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; }

// --- НАВИГАЦИЯ ---
function openScreen(screen) {
    if(isAnimating) return;
    isAnimating=true;
    const main=document.getElementById('mainScreen'), content=document.getElementById('content'), back=document.getElementById('backBtn');
    if(!main||!content||!back) { isAnimating=false; return; }
    if(currentScreen!=='main'||screen!=='main') screenHistory.push(currentScreen);
    if(currentScreen==='main') main.style.animation='slideOutLeft .25s ease-out forwards';
    else content.style.animation='slideOutRight .25s ease-out forwards';
    setTimeout(()=>{
        main.style.display='none'; main.style.animation=''; content.style.animation=''; content.innerHTML=''; back.style.display='block';
        if(screen==='excursions') loadExcursionsAndShow();
        else if(screen==='myBookings') loadMyBookingsAndShow();
        else if(screen==='admin') showAdminPanel();
        else if(screen==='createExcursion') { resetExcursionForm(); showExcursionStep1(); }
        else if(screen==='createExcursionStep2') showExcursionStep2();
        else if(screen==='templates') showTemplatesList();
        else if(screen==='allRequests') loadAllRequestsAndShow();
        else if(screen.startsWith('excursion/')) showExcursionDetail(parseInt(screen.split('/')[1]));
        else if(screen.startsWith('booking/')) showBookingForm(parseInt(screen.split('/')[1]));
        else if(screen.startsWith('requestDetail/')) loadRequestDetailAndShow(parseInt(screen.split('/')[1]));
        content.style.animation='slideInRight .3s ease-out forwards'; currentScreen=screen;
        setTimeout(()=>{ isAnimating=false; },300);
    },250);
}

function goBack() {
    if(isAnimating) return;
    if(!screenHistory.length) { goToMain(); return; }
    const prev=screenHistory.pop();
    if(isAnimating) return;
    isAnimating=true;
    const main=document.getElementById('mainScreen'), content=document.getElementById('content'), back=document.getElementById('backBtn');
    if(!content) return;
    content.style.animation='slideOutRight .25s ease-out forwards';
    setTimeout(()=>{
        content.innerHTML=''; content.style.animation='';
        if(prev==='main') {
            if(back) back.style.display='none';
            if(main) { main.style.display='flex'; main.style.animation='slideInLeft .3s ease-out forwards'; }
            currentScreen='main'; setTimeout(()=>{ if(main) main.style.animation=''; isAnimating=false; },300);
        } else {
            if(back) back.style.display='block';
            if(prev==='excursions') loadExcursionsAndShow();
            else if(prev==='myBookings') loadMyBookingsAndShow();
            else if(prev==='admin') showAdminPanel();
            else if(prev==='createExcursion') showExcursionStep1();
            else if(prev==='createExcursionStep2') showExcursionStep2();
            else if(prev==='templates') showTemplatesList();
            else if(prev==='allRequests') loadAllRequestsAndShow();
            else if(prev.startsWith('excursion/')) showExcursionDetail(parseInt(prev.split('/')[1]));
            else if(prev.startsWith('booking/')) showBookingForm(parseInt(prev.split('/')[1]));
            else if(prev.startsWith('requestDetail/')) loadRequestDetailAndShow(parseInt(prev.split('/')[1]));
            content.style.animation='slideInLeft .3s ease-out forwards'; currentScreen=prev;
            setTimeout(()=>{ isAnimating=false; },300);
        }
    },250);
}

function goToMain() {
    if(isAnimating) return; isAnimating=true;
    const main=document.getElementById('mainScreen'), content=document.getElementById('content'), back=document.getElementById('backBtn');
    if(!content) return;
    content.style.animation='slideOutRight .25s ease-out forwards';
    setTimeout(()=>{ content.innerHTML=''; content.style.animation=''; if(back) back.style.display='none'; if(main) { main.style.display='flex'; main.style.animation='slideInLeft .3s ease-out forwards'; } currentScreen='main'; screenHistory=[]; setTimeout(()=>{ if(main) main.style.animation=''; isAnimating=false; },300); },250);
}

// --- ЗАГРУЗКА ---
async function loadExcursions() { try { const r=await fetch(`${API_URL}/excursions`); excursions=await r.json(); } catch { excursions=[]; } }
async function loadExcursionsAndShow() { await loadExcursions(); showExcursionsList(); }
async function loadAllRequestsAndShow() { await loadExcursions(); showAllRequests(); }

async function loadMyBookings() {
    try {
        await loadExcursions();
        const r = await fetch(`${API_URL}/bookings/all`);
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        const all = await r.json();
        myBookings = all.map(b => {
            const exc = excursions.find(e => e.id === b.excursionId);
            return {
                id: b.id, excursionId: b.excursionId,
                excursionName: exc ? exc.name : 'Экскурсия',
                date: exc ? exc.date : '', time: exc ? exc.time : '',
                userName: b.userName, answers: b.answers
            };
        });
    } catch (err) { console.error('Load bookings error:', err); myBookings = []; }
}
async function loadMyBookingsAndShow() { await loadMyBookings(); showMyBookings(); }

async function loadRequestDetailAndShow(eid) {
    await loadExcursions();
    try { const r=await fetch(`${API_URL}/bookings/${eid}`); myBookings=await r.json(); } catch { myBookings=[]; }
    showRequestDetail(eid);
}

// --- ЭКСКУРСИИ ---
function showExcursionsList() {
    const c=document.getElementById('content'); if(!c) return;
    if(!excursions.length) { c.innerHTML='<h2>Экскурсии</h2><p style="color:#888;text-align:center;padding:40px 0">Пока нет доступных экскурсий</p>'; return; }
    let h='<h2>Экскурсии</h2>';
    excursions.forEach((exc,i)=>{
        h+=`<div class="excursion-card" onclick="openScreen('excursion/${exc.id}')" style="animation-delay:${i*.08}s">
            <div class="excursion-card-header"><div class="excursion-card-title">${safeText(exc.name,'Без названия')}</div><div class="excursion-card-price">${safePrice(exc.price)} ₽</div></div>
            <div class="excursion-card-info"><div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc.date)}</div><div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(exc.time,'—')}</div><div class="max-people-badge"><span class="badge-icon">👥</span> ${safeMaxPeople(exc.maxPeople||exc.max_people)}</div></div>
            <div class="excursion-card-description">${safeText(exc.description,'')}</div>
            <div class="excursion-card-footer"><span>Запись открыта</span><span class="record-deadline">📆 до ${safeDate(exc.deadline)}</span></div></div>`;
    });
    c.innerHTML=h;
}

function showExcursionDetail(id) {
    const exc=excursions.find(e=>e.id===id); if(!exc) return;
    const c=document.getElementById('content'); if(!c) return;
    c.innerHTML=`<div class="excursion-card" style="cursor:default;animation:fadeInScale .5s ease-out forwards">
        <div class="excursion-card-header"><div class="excursion-card-title">${safeText(exc.name,'Без названия')}</div><div class="excursion-card-price">${safePrice(exc.price)} ₽</div></div>
        <div class="excursion-card-info"><div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc.date)}</div><div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(exc.time,'—')}</div><div class="max-people-badge"><span class="badge-icon">👥</span> ${safeMaxPeople(exc.maxPeople||exc.max_people)}</div><div class="excursion-info-badge"><span class="badge-icon">📆</span> Запись до ${safeDate(exc.deadline)}</div></div>
        <div class="excursion-card-description">${safeText(exc.description,'')}</div></div>
        <button class="save-form-btn" onclick="openScreen('booking/${exc.id}')">📝 Записаться на экскурсию</button>`;
}

// --- ЗАПИСЬ ---
function showBookingForm(id) {
    const exc=excursions.find(e=>e.id===id); if(!exc) return;
    const c=document.getElementById('content'); if(!c) return;
    let h=`<h2>Запись на экскурсию</h2><div class="excursion-card" style="cursor:default;margin-bottom:20px"><div class="excursion-card-header"><div class="excursion-card-title" style="font-size:17px">${safeText(exc.name,'Без названия')}</div><div class="excursion-card-price" style="font-size:18px">${safePrice(exc.price)} ₽</div></div><div class="excursion-card-info"><div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc.date)}</div><div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(exc.time,'—')}</div></div></div><div class="form-builder">`;
    if(exc.questions&&exc.questions.length) {
        exc.questions.forEach((q,i)=>{
            h+='<div class="form-group">';
            h+=`<label>${safeText(q.text,'')}</label>`;
            if(q.type==='text') h+=`<input type="text" id="answer_${i}" placeholder="Ваш ответ">`;
            else if(q.type==='radio') { (q.options||[]).forEach((opt,oi)=>{ h+=`<div class="checkbox-row" style="margin-bottom:10px"><input type="radio" name="question_${i}" id="answer_${i}_${oi}" value="${opt}"><label for="answer_${i}_${oi}" style="text-transform:none;font-weight:400">${opt}</label></div>`; }); }
            else if(q.type==='checkbox') { (q.options||[]).forEach((opt,oi)=>{ h+=`<div class="checkbox-row" style="margin-bottom:10px"><input type="checkbox" id="answer_${i}_${oi}" value="${opt}"><label for="answer_${i}_${oi}" style="text-transform:none;font-weight:400">${opt}</label></div>`; }); }
            h+='</div>';
        });
    } else h+='<p style="color:#888;text-align:center;padding:20px">Нет дополнительных вопросов</p>';
    h+=`</div><button class="save-form-btn" onclick="submitBooking(${id})">✅ Отправить заявку</button>`;
    c.innerHTML=h;
}

async function submitBooking(id) {
    const exc=excursions.find(e=>e.id===id); if(!exc) return;
    const answers=[];
    if(exc.questions) {
        exc.questions.forEach((q,i)=>{
            if(q.type==='text') { const inp=document.getElementById('answer_'+i); answers.push({question:q.text,answer:inp?inp.value:''}); }
            else if(q.type==='radio') { const sel=document.querySelector('input[name="question_'+i+'"]:checked'); answers.push({question:q.text,answer:sel?sel.value:'Не выбрано'}); }
            else if(q.type==='checkbox') { const ch=[]; (q.options||[]).forEach((opt,oi)=>{ const cb=document.getElementById('answer_'+i+'_'+oi); if(cb&&cb.checked) ch.push(opt); }); answers.push({question:q.text,answer:ch.join(', ')||'Ничего не выбрано'}); }
        });
    }
    const userNameField=document.querySelector('input[type="text"]');
    const userName=(userNameField&&userNameField.value)||'Гость';
    try { 
        const res = await fetch(`${API_URL}/bookings`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({excursionId:id,userName,answers})});
        if(!res.ok) throw new Error(`API error: ${res.status}`);
        alert('Заявка отправлена!'); 
    }
    catch (err) { console.error('Booking error:', err); alert('Ошибка при отправке заявки'); }
    goToMain();
}

// --- МОИ ЗАПИСИ ---
function showMyBookings() {
    const c=document.getElementById('content'); if(!c) return;
    if(!myBookings.length) { c.innerHTML='<h2>Мои записи</h2><p style="color:#888;text-align:center;padding:40px 0">У вас пока нет записей на экскурсии</p>'; return; }
    let h='<h2>Мои записи</h2>';
    myBookings.forEach((b,i)=>{
        h+=`<div class="excursion-card" style="animation-delay:${i*.08}s">
            <div class="excursion-card-header"><div class="excursion-card-title">${safeText(b.excursionName,'Без названия')}</div></div>
            <div class="excursion-card-info"><div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(b.date)}</div><div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(b.time,'—')}</div></div>
            <div class="excursion-card-footer"><span>✅ Запись подтверждена</span></div>
            <button class="cancel-booking-btn" onclick="cancelBooking(${b.id})">❌ Отменить запись</button>
            <p class="warning-text">⚠️ Пожалуйста, если вы не можете прийти, отмените запись до окончания приёма заявок, чтобы не занимать место.</p></div>`;
    });
    c.innerHTML=h;
}

async function cancelBooking(bookingId) {
    if(confirm('Вы уверены, что хотите отменить запись?')) {
        try { await fetch(`${API_URL}/bookings/${bookingId}`,{method:'DELETE'}); } catch {}
        myBookings=myBookings.filter(b=>b.id!==bookingId);
        alert('Запись отменена.'); showMyBookings();
    }
}

// --- АДМИН ---
function showAdminPanel() {
    const c=document.getElementById('content'); if(!c) return;
    c.innerHTML=`<h2>Админ-панель</h2>
        <button class="main-btn" onclick="openScreen('createExcursion')" style="animation-delay:.05s"><span class="btn-icon">➕</span><span class="btn-text">Создать экскурсию</span></button>
        <button class="main-btn" onclick="openScreen('allRequests')" style="animation-delay:.1s"><span class="btn-icon">📋</span><span class="btn-text">Заявки</span></button>
        <button class="main-btn" onclick="openScreen('templates')" style="animation-delay:.15s"><span class="btn-icon">📁</span><span class="btn-text">Шаблоны</span></button>`;
}

function showAllRequests() {
    const c=document.getElementById('content'); if(!c) return;
    if(!excursions.length) { c.innerHTML='<h2>Заявки</h2><p style="color:#888;text-align:center;padding:40px 0">Нет созданных экскурсий</p>'; return; }
    let h='<h2>Заявки</h2>';
    excursions.forEach((exc,i)=>{
        h+=`<div class="excursion-card" style="animation-delay:${i*.08}s">
            <div class="excursion-card-header"><div class="excursion-card-title">${safeText(exc.name,'Без названия')}</div></div>
            <div class="excursion-card-info"><div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc.date)}</div><div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(exc.time,'—')}</div></div>
            <div style="display:flex;gap:8px;margin-top:10px">
                <button class="save-form-btn" style="flex:1" onclick="event.stopPropagation();openScreen('requestDetail/${exc.id}')">👁 Смотреть</button>
                <button class="cancel-booking-btn" style="flex:1" onclick="event.stopPropagation();deleteExcursion(${exc.id})">🗑 Удалить</button></div></div>`;
    });
    c.innerHTML=h;
}

async function deleteExcursion(id) {
    if(!confirm('Удалить экскурсию?')) return;
    try { await fetch(`${API_URL}/excursions/${id}`,{method:'DELETE'}); } catch {}
    excursions=excursions.filter(e=>e.id!==id); showAllRequests();
}

function showRequestDetail(eid) {
    const exc=excursions.find(e=>e.id===eid); if(!exc) return;
    const c=document.getElementById('content'); if(!c) return;
    const bookings=myBookings.filter(b=>b.excursionId===eid);
    let h=`<h2>Заявки: ${safeText(exc.name,'Без названия')}</h2><div class="excursion-card" style="cursor:default;margin-bottom:16px"><div class="excursion-card-info"><div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc.date)}</div><div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(exc.time,'—')}</div><div class="excursion-info-badge"><span class="badge-icon">👥</span> ${bookings.length} чел.</div></div></div>`;
    if(!bookings.length) h+='<p style="color:#888;text-align:center;padding:20px">Пока нет заявок</p>';
    else { h+='<div style="display:flex;flex-direction:column;gap:12px">'; bookings.forEach((b,i)=>{ h+=`<div class="form-group" style="cursor:pointer;animation-delay:${i*.05}s" onclick="showUserAnswers(${b.id})"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600;font-size:16px">${safeText(b.userName,'Гость')}</span><span style="color:#888;font-size:14px">ID: ${b.id}</span></div></div>`; }); h+='</div>'; }
    c.innerHTML=h;
}

function showUserAnswers(bid) {
    const b=myBookings.find(x=>x.id===bid); if(!b) return;
    const c=document.getElementById('content'); if(!c) return;
    let h=`<h2>Заявка #${b.id}</h2><div class="excursion-card" style="cursor:default;margin-bottom:20px"><div class="excursion-card-header"><div class="excursion-card-title">${safeText(b.excursionName,'Без названия')}</div></div><div class="excursion-card-info"><div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(b.date)}</div><div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(b.time,'—')}</div><div class="excursion-info-badge"><span class="badge-icon">👤</span> ${safeText(b.userName,'Гость')}</div></div></div><h3 style="margin-bottom:12px">Ответы на вопросы</h3><div style="display:flex;flex-direction:column;gap:10px">`;
    if(b.answers&&b.answers.length) { b.answers.forEach((a,i)=>{ h+=`<div class="form-group" style="animation-delay:${i*.05}s"><label>${safeText(a.question,'')}</label><p style="font-size:15px;color:#333;padding:8px 0">${safeText(a.answer,'Нет ответа')}</p></div>`; }); }
    else h+='<p style="color:#888;text-align:center;padding:20px">Нет сохранённых ответов</p>';
    h+='</div>'; c.innerHTML=h;
}

// --- СОЗДАНИЕ ---
function resetExcursionForm() { savedName=''; savedDescription=''; savedDate=''; savedTime=''; savedPrice=''; savedDeadline=''; savedMaxPeople=''; savedSaveAsTemplate=false; questions=[]; }
function showExcursionStep1() {
    const c=document.getElementById('content'); if(!c) return;
    c.innerHTML=`<h2>Новая экскурсия — Шаг 1/2</h2>
        <div class="form-group"><label>📅 Дата экскурсии *</label><input type="date" id="excursionDate" value="${savedDate}" min="${getTomorrowStr()}" onchange="savedDate=this.value;updateDeadlineMin()"></div>
        <div class="form-group"><label>⏰ Время экскурсии *</label><input type="time" id="excursionTime" value="${savedTime}" onchange="savedTime=this.value"></div>
        <div class="form-group"><label>💰 Стоимость (₽) *</label><div class="price-input-wrapper"><input type="number" id="excursionPrice" value="${savedPrice}" onchange="savedPrice=this.value" placeholder="1500" min="0" step="100"></div></div>
        <div class="form-group"><label>👥 Максимальное количество человек</label><input type="number" id="excursionMaxPeople" value="${savedMaxPeople}" onchange="savedMaxPeople=this.value" placeholder="Оставьте 0 для неограниченного" min="0"></div>
        <div class="form-group"><label>📆 Запись открыта до *</label><input type="date" id="excursionDeadline" value="${savedDeadline}" min="${getTodayStr()}" max="${savedDate||''}" onchange="savedDeadline=this.value"></div>
        <button class="next-step-btn" onclick="goToStep2()">Далее →</button>`;
}
function updateDeadlineMin() { const dd=document.getElementById('excursionDeadline'), de=document.getElementById('excursionDate'); if(dd&&de) dd.max=de.value; }
function goToStep2() {
    const df=document.getElementById('excursionDate'), tf=document.getElementById('excursionTime'), pf=document.getElementById('excursionPrice'), mf=document.getElementById('excursionMaxPeople'), lf=document.getElementById('excursionDeadline');
    if(df) savedDate=df.value; if(tf) savedTime=tf.value; if(pf) savedPrice=pf.value; if(mf) savedMaxPeople=mf.value||'0'; if(lf) savedDeadline=lf.value;
    if(!savedDate) { alert('Укажите дату'); return; } if(!savedTime) { alert('Укажите время'); return; } if(!savedPrice||parseInt(savedPrice)<=0) { alert('Укажите стоимость'); return; } if(!savedDeadline) { alert('Укажите дедлайн'); return; }
    openScreen('createExcursionStep2');
}
function showExcursionStep2() {
    const c=document.getElementById('content'); if(!c) return;
    let h=`<h2>Новая экскурсия — Шаг 2/2</h2><button class="use-template-btn" onclick="openScreen('templates')">📁 Использовать шаблон</button>
        <div class="form-group"><label>📝 Название *</label><input type="text" id="excursionName" value="${savedName}" onchange="savedName=this.value" placeholder="Название"></div>
        <div class="form-group"><label>📄 Описание</label><textarea id="excursionDescription" rows="3" onchange="savedDescription=this.value" placeholder="Описание">${savedDescription}</textarea></div>
        <div class="form-builder" id="questionsContainer">${questions.map((q,i)=>renderQuestion(q,i)).join('')}</div>
        <button class="add-question-btn" onclick="addQuestion()">+ Добавить вопрос</button>
        <div class="form-group"><div class="checkbox-row"><input type="checkbox" id="saveAsTemplate" ${savedSaveAsTemplate?'checked':''} onchange="savedSaveAsTemplate=this.checked"><label for="saveAsTemplate">💾 Сохранить как шаблон</label></div></div>
        <button class="save-form-btn" onclick="saveExcursion()">💾 Сохранить экскурсию</button>`;
    c.innerHTML=h;
}
function renderQuestion(q,i) {
    let o='';
    if(q.type==='radio'||q.type==='checkbox') o=`<div class="options-list">${(q.options||[]).map((opt,oi)=>`<div class="option-row"><input type="text" value="${opt}" onchange="updateOption(${i},${oi},this.value)" placeholder="Вариант ${oi+1}"><button onclick="removeOption(${i},${oi})">✕</button></div>`).join('')}</div><button class="add-option-btn" onclick="addOption(${i})">+ Добавить вариант</button>`;
    return `<div class="form-group"><label>❓ Вопрос ${i+1}</label><input type="text" value="${q.text}" onchange="updateQuestionText(${i},this.value)" placeholder="Текст вопроса"><label style="margin-top:14px">📋 Тип ответа</label><select onchange="updateQuestionType(${i},this.value)"><option value="text" ${q.type==='text'?'selected':''}>Текст</option><option value="radio" ${q.type==='radio'?'selected':''}>Один вариант</option><option value="checkbox" ${q.type==='checkbox'?'selected':''}>Несколько</option></select>${o}<button class="remove-question-btn" onclick="removeQuestion(${i})">🗑 Удалить</button></div>`;
}
function addQuestion() { questions.push({text:'',type:'text',options:[]}); showExcursionStep2(); }
function removeQuestion(i) { questions.splice(i,1); showExcursionStep2(); }
function updateQuestionText(i,v) { questions[i].text=v; }
function updateQuestionType(i,v) { questions[i].type=v; if(v==='radio'||v==='checkbox') questions[i].options=questions[i].options||['']; showExcursionStep2(); }
function addOption(i) { questions[i].options.push(''); showExcursionStep2(); }
function removeOption(qi,oi) { questions[qi].options.splice(oi,1); showExcursionStep2(); }
function updateOption(qi,oi,v) { questions[qi].options[oi]=v; }

async function saveExcursion() {
    const nf=document.getElementById('excursionName'), df=document.getElementById('excursionDescription'), tf=document.getElementById('saveAsTemplate');
    if(nf) savedName=nf.value; if(df) savedDescription=df.value; if(tf) savedSaveAsTemplate=tf.checked;
    if(!savedName) { alert('Введите название'); return; }
    try { await fetch(`${API_URL}/excursions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:savedName,description:savedDescription,date:savedDate,time:savedTime,price:parseInt(savedPrice),deadline:savedDeadline,maxPeople:savedMaxPeople||'0',questions})}); alert(`Экскурсия "${savedName}" сохранена!`); }
    catch { alert('Ошибка при сохранении'); }
    if(savedSaveAsTemplate) templates.push({name:savedName,description:savedDescription,questions:JSON.parse(JSON.stringify(questions))});
    goToMain();
}

// --- ШАБЛОНЫ ---
function showTemplatesList() {
    const c=document.getElementById('content'); if(!c) return;
    if(!templates.length) { c.innerHTML='<h2>Шаблоны</h2><p style="color:#888;text-align:center;padding:40px 0">Пока нет</p>'; return; }
    let h='<h2>Шаблоны</h2>';
    templates.forEach((t,i)=>{ h+=`<div class="template-card" onclick="useTemplate(${i})"><h3>${t.name}</h3><p>${t.description||''} — ${t.questions.length} вопросов</p></div>`; });
    c.innerHTML=h;
}
function useTemplate(i) { const t=templates[i]; savedName=t.name; savedDescription=t.description||''; questions=JSON.parse(JSON.stringify(t.questions)); savedSaveAsTemplate=false; showExcursionStep2(); }
function checkAdmin() { const btn=document.getElementById('adminBtn'); if(btn) btn.style.display='block'; }
window.addEventListener('DOMContentLoaded', init);