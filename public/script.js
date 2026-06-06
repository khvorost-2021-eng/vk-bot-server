// Глобальные переменные
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

// --- НАВИГАЦИЯ ---
function openScreen(screen) {
    if (isAnimating) return;
    isAnimating = true;

    const mainScreen = document.getElementById('mainScreen');
    const content = document.getElementById('content');
    const backBtn = document.getElementById('backBtn');

    if (currentScreen !== 'main' || screen !== 'main') {
        screenHistory.push(currentScreen);
    }

    if (currentScreen === 'main') {
        mainScreen.style.animation = 'slideOutLeft 0.25s ease-out forwards';
    } else {
        content.style.animation = 'slideOutRight 0.25s ease-out forwards';
    }

    setTimeout(() => {
        mainScreen.style.display = 'none';
        mainScreen.style.animation = '';
        content.style.animation = '';
        content.innerHTML = '';
        backBtn.style.display = 'block';

        if (screen === 'excursions') loadExcursionsAndShow();
        else if (screen === 'myBookings') showMyBookings();
        else if (screen === 'admin') showAdminPanel();
        else if (screen === 'createExcursion') { resetExcursionForm(); showExcursionStep1(); }
        else if (screen === 'createExcursionStep2') showExcursionStep2();
        else if (screen === 'templates') showTemplatesList();
        else if (screen === 'allRequests') loadAllRequestsAndShow();
        else if (screen.startsWith('excursion/')) showExcursionDetail(parseInt(screen.split('/')[1]));
        else if (screen.startsWith('booking/')) showBookingForm(parseInt(screen.split('/')[1]));
        else if (screen.startsWith('requestDetail/')) loadRequestDetailAndShow(parseInt(screen.split('/')[1]));

        content.style.animation = 'slideInRight 0.3s ease-out forwards';
        currentScreen = screen;
        setTimeout(() => { isAnimating = false; }, 300);
    }, 250);
}

function goBack() {
    if (isAnimating) return;
    if (screenHistory.length === 0) { goToMain(); return; }

    const previousScreen = screenHistory.pop();
    if (isAnimating) return;
    isAnimating = true;

    const mainScreen = document.getElementById('mainScreen');
    const content = document.getElementById('content');
    const backBtn = document.getElementById('backBtn');

    content.style.animation = 'slideOutRight 0.25s ease-out forwards';

    setTimeout(() => {
        content.innerHTML = '';
        content.style.animation = '';

        if (previousScreen === 'main') {
            backBtn.style.display = 'none';
            mainScreen.style.display = 'flex';
            mainScreen.style.animation = 'slideInLeft 0.3s ease-out forwards';
            currentScreen = 'main';
            setTimeout(() => { mainScreen.style.animation = ''; isAnimating = false; }, 300);
        } else {
            backBtn.style.display = 'block';
            if (previousScreen === 'excursions') loadExcursionsAndShow();
            else if (previousScreen === 'myBookings') showMyBookings();
            else if (previousScreen === 'admin') showAdminPanel();
            else if (previousScreen === 'createExcursion') showExcursionStep1();
            else if (previousScreen === 'createExcursionStep2') showExcursionStep2();
            else if (previousScreen === 'templates') showTemplatesList();
            else if (previousScreen === 'allRequests') loadAllRequestsAndShow();
            else if (previousScreen.startsWith('excursion/')) showExcursionDetail(parseInt(previousScreen.split('/')[1]));
            else if (previousScreen.startsWith('booking/')) showBookingForm(parseInt(previousScreen.split('/')[1]));
            else if (previousScreen.startsWith('requestDetail/')) loadRequestDetailAndShow(parseInt(previousScreen.split('/')[1]));

            content.style.animation = 'slideInLeft 0.3s ease-out forwards';
            currentScreen = previousScreen;
            setTimeout(() => { isAnimating = false; }, 300);
        }
    }, 250);
}

function goToMain() {
    if (isAnimating) return;
    isAnimating = true;
    const mainScreen = document.getElementById('mainScreen');
    const content = document.getElementById('content');
    const backBtn = document.getElementById('backBtn');
    content.style.animation = 'slideOutRight 0.25s ease-out forwards';
    setTimeout(() => {
        content.innerHTML = '';
        content.style.animation = '';
        backBtn.style.display = 'none';
        mainScreen.style.display = 'flex';
        mainScreen.style.animation = 'slideInLeft 0.3s ease-out forwards';
        currentScreen = 'main';
        screenHistory = [];
        setTimeout(() => { mainScreen.style.animation = ''; isAnimating = false; }, 300);
    }, 250);
}

// --- ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ---

async function loadExcursions() {
    try {
        const response = await fetch(`${API_URL}/excursions`);
        excursions = await response.json();
    } catch (err) {
        console.error('Ошибка загрузки экскурсий:', err);
        excursions = [];
    }
}

async function loadExcursionsAndShow() {
    await loadExcursions();
    showExcursionsList();
}

async function loadAllRequestsAndShow() {
    await loadExcursions();
    showAllRequests();
}

async function loadRequestDetailAndShow(excursionId) {
    await loadExcursions();
    try {
        const response = await fetch(`${API_URL}/bookings/${excursionId}`);
        const serverBookings = await response.json();
        const localBookings = myBookings.filter(b => b.excursionId === excursionId);
        myBookings = [...serverBookings, ...localBookings];
    } catch (err) {
        console.error('Ошибка загрузки заявок:', err);
    }
    showRequestDetail(excursionId);
}

// --- СПИСОК ЭКСКУРСИЙ ---
function showExcursionsList() {
    const content = document.getElementById('content');
    if (excursions.length === 0) {
        content.innerHTML = '<h2>Экскурсии</h2><p style="color: #888; text-align: center; padding: 40px 0;">Пока нет доступных экскурсий</p>';
        return;
    }
    let html = '<h2>Экскурсии</h2>';
    excursions.forEach((exc, index) => {
        const formattedPrice = exc.price.toLocaleString('ru-RU');
        const formattedDate = new Date(exc.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        const deadlineDate = new Date(exc.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        const maxPeopleText = exc.maxPeople === '0' || exc.maxPeople === 0 ? 'Без ограничений' : `До ${exc.maxPeople} чел.`;
        html += `
            <div class="excursion-card" onclick="openScreen('excursion/${exc.id}')" style="animation-delay: ${index * 0.08}s;">
                <div class="excursion-card-header">
                    <div class="excursion-card-title">${exc.name}</div>
                    <div class="excursion-card-price">${formattedPrice} ₽</div>
                </div>
                <div class="excursion-card-info">
                    <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${formattedDate}</div>
                    <div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${exc.time}</div>
                    <div class="max-people-badge"><span class="badge-icon">👥</span> ${maxPeopleText}</div>
                </div>
                <div class="excursion-card-description">${exc.description}</div>
                <div class="excursion-card-footer">
                    <span>Запись открыта</span>
                    <span class="record-deadline">📆 до ${deadlineDate}</span>
                </div>
            </div>
        `;
    });
    content.innerHTML = html;
}

// --- ДЕТАЛЬНАЯ СТРАНИЦА ---
function showExcursionDetail(id) {
    const exc = excursions.find(e => e.id === id);
    if (!exc) return;
    const content = document.getElementById('content');
    const formattedPrice = exc.price.toLocaleString('ru-RU');
    const formattedDate = new Date(exc.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const deadlineDate = new Date(exc.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const maxPeopleText = exc.maxPeople === '0' || exc.maxPeople === 0 ? 'Без ограничений' : `До ${exc.maxPeople} человек`;
    content.innerHTML = `
        <div class="excursion-card" style="cursor: default; animation: fadeInScale 0.5s ease-out forwards;">
            <div class="excursion-card-header">
                <div class="excursion-card-title">${exc.name}</div>
                <div class="excursion-card-price">${formattedPrice} ₽</div>
            </div>
            <div class="excursion-card-info">
                <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${formattedDate}</div>
                <div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${exc.time}</div>
                <div class="max-people-badge"><span class="badge-icon">👥</span> ${maxPeopleText}</div>
                <div class="excursion-info-badge"><span class="badge-icon">📆</span> Запись до ${deadlineDate}</div>
            </div>
            <div class="excursion-card-description">${exc.description}</div>
        </div>
        <button class="save-form-btn" onclick="openScreen('booking/${exc.id}')">📝 Записаться на экскурсию</button>
    `;
}

// --- ФОРМА ЗАПИСИ ---
function showBookingForm(id) {
    const exc = excursions.find(e => e.id === id);
    if (!exc) return;
    const content = document.getElementById('content');
    const formattedPrice = exc.price.toLocaleString('ru-RU');
    const formattedDate = new Date(exc.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    let html = `
        <h2>Запись на экскурсию</h2>
        <div class="excursion-card" style="cursor: default; margin-bottom: 20px;">
            <div class="excursion-card-header">
                <div class="excursion-card-title" style="font-size: 17px;">${exc.name}</div>
                <div class="excursion-card-price" style="font-size: 18px;">${formattedPrice} ₽</div>
            </div>
            <div class="excursion-card-info">
                <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${formattedDate}</div>
                <div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${exc.time}</div>
            </div>
        </div>
        <div class="form-builder">
    `;
    if (exc.questions && exc.questions.length > 0) {
        exc.questions.forEach((q, i) => {
            html += '<div class="form-group">';
            html += `<label>${q.text}</label>`;
            if (q.type === 'text') html += `<input type="text" id="answer_${i}" placeholder="Ваш ответ">`;
            else if (q.type === 'radio') {
                (q.options || []).forEach((opt, oi) => {
                    html += `<div class="checkbox-row" style="margin-bottom: 10px;"><input type="radio" name="question_${i}" id="answer_${i}_${oi}" value="${opt}"><label for="answer_${i}_${oi}" style="text-transform: none; font-weight: 400;">${opt}</label></div>`;
                });
            } else if (q.type === 'checkbox') {
                (q.options || []).forEach((opt, oi) => {
                    html += `<div class="checkbox-row" style="margin-bottom: 10px;"><input type="checkbox" id="answer_${i}_${oi}" value="${opt}"><label for="answer_${i}_${oi}" style="text-transform: none; font-weight: 400;">${opt}</label></div>`;
                });
            }
            html += '</div>';
        });
    } else {
        html += '<p style="color: #888; text-align: center; padding: 20px;">Нет дополнительных вопросов</p>';
    }
    html += '</div><button class="save-form-btn" onclick="submitBooking(' + id + ')">✅ Отправить заявку</button>';
    content.innerHTML = html;
}

async function submitBooking(id) {
    const exc = excursions.find(e => e.id === id);
    if (!exc) return;
    const answers = [];
    if (exc.questions) {
        exc.questions.forEach((q, i) => {
            if (q.type === 'text') {
                const input = document.getElementById('answer_' + i);
                answers.push({ question: q.text, answer: input ? input.value : '' });
            } else if (q.type === 'radio') {
                const selected = document.querySelector('input[name="question_' + i + '"]:checked');
                answers.push({ question: q.text, answer: selected ? selected.value : 'Не выбрано' });
            } else if (q.type === 'checkbox') {
                const checked = [];
                (q.options || []).forEach((opt, oi) => {
                    const cb = document.getElementById('answer_' + i + '_' + oi);
                    if (cb && cb.checked) checked.push(opt);
                });
                answers.push({ question: q.text, answer: checked.join(', ') || 'Ничего не выбрано' });
            }
        });
    }

    const userName = answers.length > 0 ? (answers[0].answer || 'Гость') : 'Гость';

    try {
        await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ excursionId: id, userName, answers })
        });
        alert('Заявка отправлена!');
    } catch (err) {
        console.error('Ошибка отправки:', err);
        alert('Ошибка при отправке заявки');
    }
    goToMain();
}

// --- МОИ ЗАПИСИ ---
function showMyBookings() {
    const content = document.getElementById('content');
    if (myBookings.length === 0) {
        content.innerHTML = '<h2>Мои записи</h2><p style="color: #888; text-align: center; padding: 40px 0;">У вас пока нет записей на экскурсии</p>';
        return;
    }
    let html = '<h2>Мои записи</h2>';
    myBookings.forEach((booking, index) => {
        const formattedDate = new Date(booking.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        html += `
            <div class="excursion-card" style="animation-delay: ${index * 0.08}s;">
                <div class="excursion-card-header">
                    <div class="excursion-card-title">${booking.excursionName}</div>
                </div>
                <div class="excursion-card-info">
                    <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${formattedDate}</div>
                    <div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${booking.time}</div>
                </div>
                <div class="excursion-card-footer"><span>✅ Запись подтверждена</span></div>
                <button class="cancel-booking-btn" onclick="cancelBooking(${booking.id})">❌ Отменить запись</button>
                <p class="warning-text">⚠️ Пожалуйста, если вы не можете прийти, отмените запись до окончания приёма заявок, чтобы не занимать место.</p>
            </div>
        `;
    });
    content.innerHTML = html;
}

async function cancelBooking(bookingId) {
    if (confirm('Вы уверены, что хотите отменить запись?')) {
        try {
            await fetch(`${API_URL}/bookings/${bookingId}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Ошибка отмены:', err);
        }
        myBookings = myBookings.filter(b => b.id !== bookingId);
        alert('Запись отменена.');
        showMyBookings();
    }
}

// --- АДМИН-ПАНЕЛЬ ---
function showAdminPanel() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2>Админ-панель</h2>
        <button class="main-btn" onclick="openScreen('createExcursion')" style="animation-delay: 0.05s;"><span class="btn-icon">➕</span><span class="btn-text">Создать экскурсию</span></button>
        <button class="main-btn" onclick="openScreen('allRequests')" style="animation-delay: 0.1s;"><span class="btn-icon">📋</span><span class="btn-text">Заявки</span></button>
        <button class="main-btn" onclick="openScreen('templates')" style="animation-delay: 0.15s;"><span class="btn-icon">📁</span><span class="btn-text">Шаблоны</span></button>
    `;
}

// --- ВСЕ ЗАЯВКИ (АДМИН) ---
function showAllRequests() {
    const content = document.getElementById('content');
    
    if (excursions.length === 0) {
        content.innerHTML = '<h2>Заявки</h2><p style="color: #888; text-align: center; padding: 40px 0;">Нет созданных экскурсий</p>';
        return;
    }

    let html = '<h2>Заявки</h2>';
    
    excursions.forEach((exc, index) => {
        const bookingsForExcursion = myBookings.filter(b => b.excursionId === exc.id);
        const formattedDate = new Date(exc.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        
        html += `
            <div class="excursion-card" style="cursor: pointer; animation-delay: ${index * 0.08}s;" onclick="openScreen('requestDetail/${exc.id}')">
                <div class="excursion-card-header">
                    <div class="excursion-card-title">${exc.name}</div>
                    <div class="excursion-card-price">${bookingsForExcursion.length} заявок</div>
                </div>
                <div class="excursion-card-info">
                    <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${formattedDate}</div>
                    <div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${exc.time}</div>
                </div>
            </div>
        `;
    });
    
    content.innerHTML = html;
}

// --- ДЕТАЛИ ЗАЯВОК ПО ЭКСКУРСИИ ---
function showRequestDetail(excursionId) {
    const exc = excursions.find(e => e.id === excursionId);
    if (!exc) return;
    
    const content = document.getElementById('content');
    const bookingsForExcursion = myBookings.filter(b => b.excursionId === excursionId);
    const formattedDate = new Date(exc.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    
    let html = `
        <h2>Заявки: ${exc.name}</h2>
        <div class="excursion-card" style="cursor: default; margin-bottom: 16px;">
            <div class="excursion-card-info">
                <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${formattedDate}</div>
                <div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${exc.time}</div>
                <div class="excursion-info-badge"><span class="badge-icon">👥</span> ${bookingsForExcursion.length} чел.</div>
            </div>
        </div>
    `;
    
    if (bookingsForExcursion.length === 0) {
        html += '<p style="color: #888; text-align: center; padding: 20px;">Пока нет заявок на эту экскурсию</p>';
    } else {
        html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
        bookingsForExcursion.forEach((booking, index) => {
            html += `
                <div class="form-group" style="cursor: pointer; animation-delay: ${index * 0.05}s;" onclick="showUserAnswers(${booking.id})">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 16px;">${booking.userName}</span>
                        <span style="color: #888; font-size: 14px;">ID: ${booking.id}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    content.innerHTML = html;
}

// --- ПРОСМОТР ОТВЕТОВ ПОЛЬЗОВАТЕЛЯ ---
function showUserAnswers(bookingId) {
    const booking = myBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const content = document.getElementById('content');
    const formattedDate = new Date(booking.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    
    let html = `
        <h2>Заявка #${booking.id}</h2>
        <div class="excursion-card" style="cursor: default; margin-bottom: 20px;">
            <div class="excursion-card-header">
                <div class="excursion-card-title">${booking.excursionName}</div>
            </div>
            <div class="excursion-card-info">
                <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${formattedDate}</div>
                <div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${booking.time}</div>
                <div class="excursion-info-badge"><span class="badge-icon">👤</span> ${booking.userName}</div>
            </div>
        </div>
        <h3 style="margin-bottom: 12px;">Ответы на вопросы</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
    `;
    
    if (booking.answers && booking.answers.length > 0) {
        booking.answers.forEach((a, i) => {
            html += `
                <div class="form-group" style="animation-delay: ${i * 0.05}s;">
                    <label>${a.question}</label>
                    <p style="font-size: 15px; color: #333; padding: 8px 0;">${a.answer || 'Нет ответа'}</p>
                </div>
            `;
        });
    } else {
        html += '<p style="color: #888; text-align: center; padding: 20px;">Нет сохранённых ответов</p>';
    }
    
    html += '</div>';
    content.innerHTML = html;
}

// --- СБРОС ФОРМЫ ---
function resetExcursionForm() {
    savedName = ''; savedDescription = ''; savedDate = ''; savedTime = '';
    savedPrice = ''; savedDeadline = ''; savedMaxPeople = ''; savedSaveAsTemplate = false;
    questions = [];
}

// --- ШАГ 1: Даты, время, стоимость, макс. человек ---
function showExcursionStep1() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2>Новая экскурсия — Шаг 1/2</h2>
        <div class="form-group"><label>📅 Дата экскурсии *</label><input type="date" id="excursionDate" value="${savedDate}" onchange="savedDate = this.value"></div>
        <div class="form-group"><label>⏰ Время экскурсии *</label><input type="time" id="excursionTime" value="${savedTime}" onchange="savedTime = this.value"></div>
        <div class="form-group"><label>💰 Стоимость (₽) *</label><div class="price-input-wrapper"><input type="number" id="excursionPrice" value="${savedPrice}" onchange="savedPrice = this.value" placeholder="1500" min="0" step="100"></div></div>
        <div class="form-group"><label>👥 Максимальное количество человек</label><input type="number" id="excursionMaxPeople" value="${savedMaxPeople}" onchange="savedMaxPeople = this.value" placeholder="Оставьте 0 для неограниченного" min="0"></div>
        <div class="form-group"><label>📆 Запись открыта до *</label><input type="date" id="excursionDeadline" value="${savedDeadline}" onchange="savedDeadline = this.value"></div>
        <button class="next-step-btn" onclick="goToStep2()">Далее →</button>
    `;
}

function goToStep2() {
    const dateField = document.getElementById('excursionDate');
    const timeField = document.getElementById('excursionTime');
    const priceField = document.getElementById('excursionPrice');
    const maxPeopleField = document.getElementById('excursionMaxPeople');
    const deadlineField = document.getElementById('excursionDeadline');
    
    if (dateField) savedDate = dateField.value;
    if (timeField) savedTime = timeField.value;
    if (priceField) savedPrice = priceField.value;
    if (maxPeopleField) savedMaxPeople = maxPeopleField.value;
    if (deadlineField) savedDeadline = deadlineField.value;
    
    if (!savedDate) { alert('Укажите дату экскурсии'); return; }
    if (!savedTime) { alert('Укажите время экскурсии'); return; }
    if (!savedPrice || parseInt(savedPrice) <= 0) { alert('Укажите стоимость'); return; }
    if (!savedDeadline) { alert('Укажите дату окончания записи'); return; }
    
    openScreen('createExcursionStep2');
}

// --- ШАГ 2: Название, описание, вопросы ---
function showExcursionStep2() {
    const content = document.getElementById('content');
    let html = `
        <h2>Новая экскурсия — Шаг 2/2</h2>
        <button class="use-template-btn" onclick="openScreen('templates')">📁 Использовать шаблон</button>
        <div class="form-group"><label>📝 Название экскурсии *</label><input type="text" id="excursionName" value="${savedName}" onchange="savedName = this.value" placeholder="Например: Ночная прогулка по крышам"></div>
        <div class="form-group"><label>📄 Описание</label><textarea id="excursionDescription" rows="3" onchange="savedDescription = this.value" placeholder="Краткое описание экскурсии">${savedDescription}</textarea></div>
        <div class="form-builder" id="questionsContainer">${questions.map((q, i) => renderQuestion(q, i)).join('')}</div>
        <button class="add-question-btn" onclick="addQuestion()">+ Добавить вопрос</button>
        <div class="form-group"><div class="checkbox-row"><input type="checkbox" id="saveAsTemplate" ${savedSaveAsTemplate ? 'checked' : ''} onchange="savedSaveAsTemplate = this.checked"><label for="saveAsTemplate">💾 Сохранить как шаблон</label></div></div>
        <button class="save-form-btn" onclick="saveExcursion()">💾 Сохранить экскурсию</button>
    `;
    content.innerHTML = html;
}

function renderQuestion(q, index) {
    let optionsHtml = '';
    if (q.type === 'radio' || q.type === 'checkbox') {
        optionsHtml = `
            <div class="options-list" id="options-${index}">
                ${(q.options || []).map((opt, oi) => `<div class="option-row"><input type="text" value="${opt}" onchange="updateOption(${index}, ${oi}, this.value)" placeholder="Вариант ${oi + 1}"><button onclick="removeOption(${index}, ${oi})">✕</button></div>`).join('')}
            </div>
            <button class="add-option-btn" onclick="addOption(${index})">+ Добавить вариант</button>
        `;
    }
    return `
        <div class="form-group">
            <label>❓ Вопрос ${index + 1}</label>
            <input type="text" value="${q.text}" onchange="updateQuestionText(${index}, this.value)" placeholder="Текст вопроса">
            <label style="margin-top: 14px;">📋 Тип ответа</label>
            <select class="question-type-select" onchange="updateQuestionType(${index}, this.value)">
                <option value="text" ${q.type === 'text' ? 'selected' : ''}>Свободный ответ (текст)</option>
                <option value="radio" ${q.type === 'radio' ? 'selected' : ''}>Один вариант</option>
                <option value="checkbox" ${q.type === 'checkbox' ? 'selected' : ''}>Несколько вариантов</option>
            </select>
            ${optionsHtml}
            <button class="remove-question-btn" onclick="removeQuestion(${index})">🗑 Удалить вопрос</button>
        </div>
    `;
}

function addQuestion() {
    questions.push({ text: '', type: 'text', options: [] });
    showExcursionStep2();
}

function removeQuestion(index) {
    questions.splice(index, 1);
    showExcursionStep2();
}

function updateQuestionText(index, value) { questions[index].text = value; }
function updateQuestionType(index, value) {
    questions[index].type = value;
    if (value === 'radio' || value === 'checkbox') questions[index].options = questions[index].options || [''];
    showExcursionStep2();
}
function addOption(index) {
    questions[index].options = questions[index].options || [];
    questions[index].options.push('');
    showExcursionStep2();
}
function removeOption(qi, oi) {
    questions[qi].options.splice(oi, 1);
    showExcursionStep2();
}
function updateOption(qi, oi, value) { questions[qi].options[oi] = value; }

async function saveExcursion() {
    const nameField = document.getElementById('excursionName');
    const descField = document.getElementById('excursionDescription');
    const templateCheckbox = document.getElementById('saveAsTemplate');
    if (nameField) savedName = nameField.value;
    if (descField) savedDescription = descField.value;
    if (templateCheckbox) savedSaveAsTemplate = templateCheckbox.checked;

    if (!savedName) { alert('Введите название экскурсии'); return; }

    const excursionData = {
        name: savedName,
        description: savedDescription,
        date: savedDate,
        time: savedTime,
        price: parseInt(savedPrice),
        deadline: savedDeadline,
        maxPeople: savedMaxPeople || '0',
        questions
    };

    try {
        await fetch(`${API_URL}/excursions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(excursionData)
        });
        alert(`Экскурсия "${savedName}" сохранена!`);
    } catch (err) {
        console.error('Ошибка сохранения:', err);
        alert('Ошибка при сохранении');
    }

    if (savedSaveAsTemplate) {
        templates.push({ name: savedName, description: savedDescription, questions: JSON.parse(JSON.stringify(questions)) });
    }
    goToMain();
}

// --- ШАБЛОНЫ ---
function showTemplatesList() {
    const content = document.getElementById('content');
    if (templates.length === 0) {
        content.innerHTML = '<h2>Шаблоны</h2><p style="color: #888; text-align: center; padding: 40px 0;">Пока нет сохранённых шаблонов</p>';
        return;
    }
    let html = '<h2>Выберите шаблон</h2>';
    templates.forEach((tpl, index) => {
        html += `<div class="template-card" onclick="useTemplate(${index})"><h3>${tpl.name}</h3><p>${tpl.description || 'Без описания'} — ${tpl.questions.length} вопросов</p></div>`;
    });
    content.innerHTML = html;
}

function useTemplate(index) {
    const tpl = templates[index];
    savedName = tpl.name;
    savedDescription = tpl.description || '';
    questions = JSON.parse(JSON.stringify(tpl.questions));
    savedSaveAsTemplate = false;
    showExcursionStep2();
}

function checkAdmin() { document.getElementById('adminBtn').style.display = 'block'; }
window.onload = checkAdmin;