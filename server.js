const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация таблиц
async function initDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS excursions (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            price INTEGER NOT NULL,
            deadline TEXT NOT NULL,
            max_people TEXT DEFAULT '0'
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            excursion_id INTEGER REFERENCES excursions(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'text',
            options TEXT DEFAULT '[]'
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            excursion_id INTEGER REFERENCES excursions(id) ON DELETE CASCADE,
            user_id TEXT DEFAULT 'anonymous',
            user_name TEXT NOT NULL,
            answers TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL
        )
    `);

    // Добавляем колонку user_id, если её ещё нет
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'anonymous'`);

    console.log('База данных готова');
}

// === API ===

// Получить все экскурсии
app.get('/api/excursions', async (req, res) => {
    try {
        const { rows: excursions } = await pool.query('SELECT * FROM excursions ORDER BY date ASC');
        for (let exc of excursions) {
            const { rows: questions } = await pool.query('SELECT * FROM questions WHERE excursion_id = $1', [exc.id]);
            exc.questions = questions.map(q => ({
                id: q.id, text: q.text, type: q.type, options: JSON.parse(q.options || '[]')
            }));
        }
        res.json(excursions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создать экскурсию
app.post('/api/excursions', async (req, res) => {
    try {
        const { name, description, date, time, price, deadline, maxPeople, questions } = req.body;
        const { rows } = await pool.query(
            'INSERT INTO excursions (name, description, date, time, price, deadline, max_people) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [name, description || '', date, time, price, deadline, maxPeople || '0']
        );
        const excursionId = rows[0].id;

        if (questions && questions.length > 0) {
            for (let q of questions) {
                await pool.query(
                    'INSERT INTO questions (excursion_id, text, type, options) VALUES ($1, $2, $3, $4)',
                    [excursionId, q.text, q.type, JSON.stringify(q.options || [])]
                );
            }
        }
        res.json({ success: true, id: excursionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удалить экскурсию
app.delete('/api/excursions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM questions WHERE excursion_id = $1', [req.params.id]);
        await pool.query('DELETE FROM bookings WHERE excursion_id = $1', [req.params.id]);
        await pool.query('DELETE FROM excursions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить ВСЕ заявки (для админа)
app.get('/api/bookings', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT b.*, e.name as excursion_name, e.date, e.time 
            FROM bookings b 
            JOIN excursions e ON b.excursion_id = e.id 
            ORDER BY b.created_at DESC
        `);
        res.json(rows.map(r => ({
            id: r.id,
            excursionId: r.excursion_id,
            excursionName: r.excursion_name,
            date: r.date,
            time: r.time,
            userName: r.user_name,
            answers: JSON.parse(r.answers || '[]'),
            createdAt: r.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить заявки ТОЛЬКО текущего пользователя
app.get('/api/my-bookings', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.json([]);

        const { rows } = await pool.query(`
            SELECT b.*, e.name as excursion_name, e.date, e.time 
            FROM bookings b 
            JOIN excursions e ON b.excursion_id = e.id 
            WHERE b.user_id = $1
            ORDER BY b.created_at DESC
        `, [userId]);
        
        res.json(rows.map(r => ({
            id: r.id,
            excursionId: r.excursion_id,
            excursionName: r.excursion_name,
            date: r.date,
            time: r.time,
            userName: r.user_name,
            answers: JSON.parse(r.answers || '[]'),
            createdAt: r.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить заявки по экскурсии (для админа)
app.get('/api/bookings/:excursionId', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT b.*, e.name as excursion_name, e.date, e.time 
            FROM bookings b 
            JOIN excursions e ON b.excursion_id = e.id 
            WHERE b.excursion_id = $1
            ORDER BY b.created_at DESC
        `, [req.params.excursionId]);
        res.json(rows.map(r => ({
            id: r.id,
            excursionId: r.excursion_id,
            excursionName: r.excursion_name,
            date: r.date,
            time: r.time,
            userName: r.user_name,
            answers: JSON.parse(r.answers || '[]'),
            createdAt: r.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Отправить заявку
app.post('/api/bookings', async (req, res) => {
    try {
        const { excursionId, userId, userName, answers } = req.body;
        await pool.query(
            'INSERT INTO bookings (excursion_id, user_id, user_name, answers, created_at) VALUES ($1, $2, $3, $4, $5)',
            [excursionId, userId || 'anonymous', userName, JSON.stringify(answers || []), new Date().toISOString()]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Отменить заявку (только свою)
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ error: 'userId required' });
        
        await pool.query('DELETE FROM bookings WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Проверка админа
app.post('/api/admin/check', (req, res) => {
    const ADMIN_ID = 123456789;
    res.json({ admin: req.body.userId === ADMIN_ID });
});

// Главная страница
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDatabase().then(() => {
    app.listen(PORT, () => console.log(`Сервер: http://localhost:${PORT}`));
});