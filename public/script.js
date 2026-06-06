let currentUserId = null;
let excursions = [];
let myBookings = [];

async function initUserId() {
    if (window.vkBridge) {
        try {
            const user = await window.vkBridge.send('VKWebAppGetUserInfo');
            currentUserId = String(user.id);
            console.log('✅ VK User ID:', currentUserId);
            return;
        } catch (err) {
            console.warn('VK Bridge not available');
        }
    }
    if (window.TelegramWebApp) {
        const user = window.TelegramWebApp.initDataUnsafe?.user;
        if (user?.id) {
            currentUserId = String(user.id);
            console.log('✅ Telegram User ID:', currentUserId);
            return;
        }
    }
    currentUserId = 'user_' + Math.random().toString(36).substr(2, 9);
    console.log('⚠️  Using fallback User ID:', currentUserId);
}

function safeText(v, d) {
    return (typeof v === 'string' && v.trim()) ? v : (d || '');
}
function safeDate(v) {
    if (!v) return '—';
    try {
        return new Date(v).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return '—';
    }
}
function safePrice(v) {
    return (typeof v === 'number' && v > 0) ? v : '—';
}

async function loadExcursions() {
    try {
        const r = await fetch(API + '/api/excursions');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        excursions = await r.json();
        console.log('✅ Loaded', excursions.length, 'excursions');
    } catch (e) {
        console.error('❌ Load excursions error:', e);
        excursions = [];
    }
}

async function loadMyBookings() {
    try {
        const r = await fetch(API + '/api/bookings/all');
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        myBookings = (await r.json()).filter(b => b.userId === currentUserId);
        console.log('✅ Loaded', myBookings.length, 'my bookings');
    } catch (e) {
        console.error('❌ Load bookings error:', e);
        myBookings = [];
    }
}

async function loadMyBookingsAndShow() {
    await loadMyBookings();
    showMyBookings();
}

function showExcursionDetail(id) {
    const exc = excursions.find(e => e.id === id);
    if (!exc) return;
    const c = document.getElementById('content');
    if (!c) return;
    
    const isBooked = myBookings.some(b => b.excursionId === id);
    
    let h = `<h2 style="margin-bottom:30px">${safeText(exc.name, 'Без названия')}</h2>`;
    h += `<div class="excursion-card" style="cursor:default;margin-bottom:30px">`;
    h += `<div class="excursion-card-header">`;
    h += `<div class="excursion-card-title" style="font-size:17px">${safeText(exc.name, 'Без названия')}</div>`;
    h += `<div class="excursion-card-price" style="font-size:18px">${safePrice(exc.price)} ₽</div>`;
    h += `</div>`;
    h += `<div class="excursion-card-info">`;
    h += `<div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc.date)}</div>`;
    h += `<div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(exc.time, '—')}</div>`;
    if (safeText(exc.maxPeople) !== '0') {
        h += `<div class="excursion-info-badge"><span class="badge-icon">👥</span> До ${exc.maxPeople} человек</div>`;
    }
    h += `</div>`;
    h += `</div>`;

    if (safeText(exc.description)) {
        h += `<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;font-size:14px;line-height:1.6;color:#333">${exc.description}</div>`;
    }

    if (isBooked) {
        h += `<div style="background:#E8F5E9;border-left:4px solid #4CAF50;padding:15px;margin-bottom:20px;border-radius:4px">`;
        h += `<div style="color:#2E7D32;font-size:16px;font-weight:500">✅ Вы уже записаны на эту экскурсию</div>`;
        h += `</div>`;
    }

    h += `<div style="display:flex;gap:10px">`;
    if (!isBooked) {
        h += `<button class="btn" onclick="showBookingForm(${id})" style="flex:1">📝 Записаться</button>`;
    }
    h += `<button class="btn" style="flex:1;background:#999" onclick="openScreen('excursions')">🔙 Назад</button>`;
    h += `</div>`;

    c.innerHTML = h;
}

function showBookingForm(id) {
    const exc = excursions.find(e => e.id === id);
    if (!exc) return;
    const c = document.getElementById('content');
    if (!c) return;
    
    const isBooked = myBookings.some(b => b.excursionId === id);
    if (isBooked) {
        c.innerHTML = '<h2>Запись на экскурсию</h2><p style="color:#4CAF50;font-size:16px;padding:40px 20px;text-align:center">✅ Вы уже записаны на эту экскурсию!</p>';
        return;
    }
    
    let h = `<h2>Запись на экскурсию</h2><div class="excursion-card" style="cursor:default;margin-bottom:20px"><div class="excursion-card-header"><div class="excursion-card-title" style="font-size:17px">${safeText(exc.name, 'Без названия')}</div><div class="excursion-card-price" style="font-size:18px">${safePrice(exc.price)} ₽</div></div><div class="excursion-card-info"><div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc.date)}</div><div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(exc.time, '—')}</div></div></div><div class="form-builder">`;
    if (exc.questions && exc.questions.length) {
        exc.questions.forEach((q, i) => {
            h += '<div class="form-group">';
            h += `<label>${safeText(q.text, '')}</label>`;
            if (q.type === 'text') {
                h += `<input type="text" id="answer_${i}" placeholder="Ваш ответ">`;
            } else if (q.type === 'radio') {
                (q.options || []).forEach((opt, oi) => {
                    h += `<div class="checkbox-row" style="margin-bottom:10px"><input type="radio" name="question_${i}" id="answer_${i}_${oi}" value="${opt}"><label for="answer_${i}_${oi}" style="text-transform:none;font-weight:400">${opt}</label></div>`;
                });
            } else if (q.type === 'checkbox') {
                (q.options || []).forEach((opt, oi) => {
                    h += `<div class="checkbox-row" style="margin-bottom:10px"><input type="checkbox" id="answer_${i}_${oi}" value="${opt}"><label for="answer_${i}_${oi}" style="text-transform:none;font-weight:400">${opt}</label></div>`;
                });
            }
            h += '</div>';
        });
    } else {
        h += '<p style="color:#888;text-align:center;padding:20px">Нет дополнительных вопросов</p>';
    }
    h += `</div><button class="save-form-btn" onclick="submitBooking(${id})">✅ Отправить заявку</button>`;
    c.innerHTML = h;
}

async function submitBooking(id) {
    if (!currentUserId) {
        alert('User ID not initialized');
        return;
    }
    
    const answers = [];
    if (document.querySelectorAll('.form-builder input').length > 0) {
        document.querySelectorAll('.form-builder input').forEach(inp => {
            if ((inp.type === 'text' && inp.value) || ((inp.type === 'radio' || inp.type === 'checkbox') && inp.checked)) {
                answers.push(inp.value || inp.innerText);
            }
        });
    }
    
    const nameInput = document.querySelector('input[type="text"]:not([placeholder="Ваш ответ"])');
    const userName = nameInput?.value || 'Гость';
    
    try {
        const r = await fetch(API + '/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                excursionId: id,
                userId: currentUserId,
                userName: userName,
                answers: answers
            })
        });
        
        if (!r.ok) {
            const err = await r.json();
            throw new Error(err.error || `HTTP ${r.status}`);
        }
        
        alert('✅ Заявка отправлена!');
        await loadMyBookings();
        openScreen('excursions');
    } catch (e) {
        alert('❌ Ошибка: ' + e.message);
        console.error('❌ Submit booking error:', e);
    }
}

function showMyBookings() {
    const c = document.getElementById('content');
    if (!c) return;
    
    if (!myBookings.length) {
        c.innerHTML = '<p style="text-align:center;padding:40px 20px;color:#888">У вас нет записей</p>';
        return;
    }
    
    let h = '<div class="excursions-list">';
    myBookings.forEach(b => {
        const exc = excursions.find(e => e.id === b.excursionId);
        const excName = exc ? safeText(exc.name, 'Без названия') : `Экскурсия #${b.excursionId}`;
        const excDate = exc ? safeDate(exc.date) : '—';
        const excPrice = exc ? safePrice(exc.price) : '—';
        
        h += `
            <div class="excursion-card" style="cursor:pointer" onclick="showBookingDetail(${b.id})">
                <div class="excursion-card-header">
                    <div class="excursion-card-title">${excName}</div>
                    <div class="excursion-card-price">${excPrice} ₽</div>
                </div>
                <div class="excursion-card-info">
                    <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${excDate}</div>
                    <div class="excursion-info-badge"><span class="badge-icon">👤</span> ${safeText(b.userName, 'Гость')}</div>
                </div>
            </div>
        `;
    });
    h += '</div>';
    c.innerHTML = h;
}

function showBookingDetail(bookingId) {
    const booking = myBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const exc = excursions.find(e => e.id === booking.excursionId);
    const c = document.getElementById('content');
    if (!c) return;
    
    let h = `<h2>Данные вашей записи</h2>`;
    h += `<div class="excursion-card" style="cursor:default;margin-bottom:20px">`;
    h += `<div class="excursion-card-header">`;
    h += `<div class="excursion-card-title">${safeText(exc?.name || 'Экскурсия', '')}</div>`;
    h += `<div class="excursion-card-price">${safePrice(exc?.price)} ₽</div>`;
    h += `</div>`;
    h += `<div class="excursion-card-info">`;
    h += `<div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc?.date)}</div>`;
    h += `<div class="excursion-info-badge"><span class="badge-icon">👤</span> ${safeText(booking.userName, 'Гость')}</div>`;
    h += `<div class="excursion-info-badge"><span class="badge-icon">⏱️</span> ${new Date(booking.createdAt).toLocaleString('ru-RU')}</div>`;
    h += `</div>`;
    h += `</div>`;
    
    if (booking.answers && booking.answers.length) {
        h += `<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px">`;
        h += `<div style="font-weight:500;margin-bottom:10px">Ответы:</div>`;
        booking.answers.forEach(ans => {
            h += `<div style="font-size:14px;color:#666;margin-bottom:5px">• ${ans}</div>`;
        });
        h += `</div>`;
    }
    
    h += `<button class="btn" style="width:100%;background:#999" onclick="openScreen('myBookings')">🔙 Назад</button>`;
    c.innerHTML = h;
}

function openScreen(s) {
    const nav = document.querySelectorAll('.nav-btn');
    nav.forEach(b => b.classList.remove('active'));
    
    if (s === 'excursions') {
        document.querySelector('.nav-btn:nth-child(1)')?.classList.add('active');
        showExcursions();
    } else if (s === 'myBookings') {
        document.querySelector('.nav-btn:nth-child(2)')?.classList.add('active');
        loadMyBookingsAndShow();
    } else if (s === 'admin') {
        document.querySelector('.nav-btn:nth-child(3)')?.classList.add('active');
        showAdmin();
    }
}

function showExcursions() {
    const c = document.getElementById('content');
    if (!c) return;
    
    if (!excursions.length) {
        c.innerHTML = '<p style="text-align:center;padding:40px 20px;color:#888">Экскурсии не найдены</p>';
        return;
    }
    
    let h = '<div class="excursions-list">';
    excursions.forEach(exc => {
        const isBooked = myBookings.some(b => b.excursionId === exc.id);
        h += `
            <div class="excursion-card" style="cursor:pointer;${isBooked ? 'border:2px solid #4CAF50;' : ''}" onclick="showExcursionDetail(${exc.id})">
                <div class="excursion-card-header">
                    <div class="excursion-card-title">${safeText(exc.name, 'Без названия')}${isBooked ? ' ✅' : ''}</div>
                    <div class="excursion-card-price">${safePrice(exc.price)} ₽</div>
                </div>
                <div class="excursion-card-info">
                    <div class="excursion-info-badge"><span class="badge-icon">📅</span> ${safeDate(exc.date)}</div>
                    <div class="excursion-info-badge"><span class="badge-icon">⏰</span> ${safeText(exc.time, '—')}</div>
                </div>
            </div>
        `;
    });
    h += '</div>';
    c.innerHTML = h;
}

function showAdmin() {
    const c = document.getElementById('content');
    if (!c) return;
    
    c.innerHTML = `
        <h2>Админ-панель</h2>
        <button class="btn" onclick="showAddExcursionForm()" style="width:100%;margin-bottom:10px">➕ Добавить экскурсию</button>
    `;
}

function showAddExcursionForm() {
    const c = document.getElementById('content');
    if (!c) return;
    
    let h = `<h2>Добавить экскурсию</h2>`;
    h += `<div class="form-builder">`;
    h += `<div class="form-group"><label>Название</label><input type="text" id="name" placeholder="Название экскурсии"></div>`;
    h += `<div class="form-group"><label>Описание</label><textarea id="description" placeholder="Описание" style="min-height:100px"></textarea></div>`;
    h += `<div class="form-group"><label>Дата</label><input type="date" id="date"></div>`;
    h += `<div class="form-group"><label>Время</label><input type="time" id="time"></div>`;
    h += `<div class="form-group"><label>Цена (₽)</label><input type="number" id="price" placeholder="0"></div>`;
    h += `<div class="form-group"><label>Макс. человек</label><input type="number" id="maxPeople" placeholder="0"></div>`;
    h += `<div class="form-group"><label>Дедлайн записи</label><input type="datetime-local" id="deadline"></div>`;
    h += `</div>`;
    h += `<button class="save-form-btn" onclick="addExcursion()">✅ Добавить</button>`;
    c.innerHTML = h;
}

async function addExcursion() {
    try {
        const name = document.getElementById('name')?.value;
        const description = document.getElementById('description')?.value;
        const date = document.getElementById('date')?.value;
        const time = document.getElementById('time')?.value;
        const price = parseInt(document.getElementById('price')?.value || 0);
        const maxPeople = document.getElementById('maxPeople')?.value;
        const deadline = document.getElementById('deadline')?.value;
        
        if (!name || !date) {
            alert('Заполните название и дату');
            return;
        }
        
        const r = await fetch(API + '/api/excursions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, description, date, time, price, maxPeople, deadline, questions: []
            })
        });
        
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        
        alert('✅ Экскурсия добавлена!');
        await loadExcursions();
        openScreen('excursions');
    } catch (e) {
        alert('❌ Ошибка: ' + e.message);
    }
}

const API = location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://vk-bot-server.onrender.com';

window.addEventListener('load', async () => {
    await initUserId();
    await loadExcursions();
    await loadMyBookings();
    openScreen('excursions');
});
