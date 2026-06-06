const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

app.use(cors());
app.use(express.json());

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
            excursion_id INTEGER REFERENCES excursions(id),
            text TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'text',
            options TEXT DEFAULT '[]'
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            excursion_id INTEGER REFERENCES excursions(id),
            user_name TEXT NOT NULL,
            answers TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL
        )
    `);

    console.log('База данных готова');
}

// === API ===

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

app.post('/api/bookings', async (req, res) => {
    try {
        const { excursionId, userName, answers } = req.body;
        await pool.query(
            'INSERT INTO bookings (excursion_id, user_name, answers, created_at) VALUES ($1, $2, $3, $4)',
            [excursionId, userName, JSON.stringify(answers || []), new Date().toISOString()]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bookings/:excursionId', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM bookings WHERE excursion_id = $1 ORDER BY created_at DESC', [req.params.excursionId]);
        res.json(rows.map(r => ({
            id: r.id, excursionId: r.excursion_id, userName: r.user_name,
            answers: JSON.parse(r.answers || '[]'), createdAt: r.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/check', (req, res) => {
    const ADMIN_ID = 123456789;
    res.json({ admin: req.body.userId === ADMIN_ID });
});

initDatabase().then(() => {
    app.listen(PORT, () => console.log(`Сервер: http://localhost:${PORT}`));
});