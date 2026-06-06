const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function initDatabase() {
    try {
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
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                answers TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            )
        `);

        console.log('✅ База данных готова');
    } catch (err) {
        console.error('❌ Database initialization error:', err.message);
        throw err;
    }
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
        const result = await pool.query(
            'INSERT INTO excursions (name, description, date, time, price, deadline, max_people) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [name, description || '', date, time, price, deadline, maxPeople || '0']
        );
        const excursionId = result.rows[0].id;

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

app.delete('/api/excursions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM excursions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { excursionId, userId, userName, answers } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        await pool.query(
            'INSERT INTO bookings (excursion_id, user_id, user_name, answers, created_at) VALUES ($1, $2, $3, $4, $5)',
            [excursionId, userId, userName || 'Гость', JSON.stringify(answers || []), new Date().toISOString()]
        );
        res.json({ success: true });
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

app.get('/api/bookings/all', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json(rows.map(r => ({
            id: r.id,
            excursionId: r.excursion_id,
            userId: r.user_id,
            userName: r.user_name,
            answers: JSON.parse(r.answers || '[]'),
            createdAt: r.created_at
        })));
    } catch (err) {
        console.error('❌ /api/bookings/all error:', err.message, err.code);
        res.status(500).json({ error: err.message, code: err.code });
    }
});

app.get('/api/bookings/test', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const bookingsTable = result.rows.find(t => t.table_name === 'bookings');
        
        if (!bookingsTable) {
            return res.status(500).json({
                error: 'Table bookings does not exist',
                tables: result.rows.map(t => t.table_name)
            });
        }

        const bookings = await pool.query('SELECT COUNT(*) as count FROM bookings');
        res.json({
            status: 'ok',
            bookingsCount: bookings.rows[0].count,
            allTables: result.rows.map(t => t.table_name)
        });
    } catch (err) {
        console.error('❌ Bookings test error:', err);
        res.status(500).json({
            error: err.message,
            code: err.code
        });
    }
});

app.get('/api/bookings/:excursionId', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM bookings WHERE excursion_id = $1 ORDER BY created_at DESC',
            [req.params.excursionId]
        );
        res.json(rows.map(r => ({
            id: r.id,
            excursionId: r.excursion_id,
            userId: r.user_id,
            userName: r.user_name,
            answers: JSON.parse(r.answers || '[]'),
            createdAt: r.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/check', (req, res) => {
    res.json({ admin: req.body.userId === 123456789 });
});

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            status: 'ok',
            time: result.rows[0],
            message: '✅ База данных доступна'
        });
    } catch (err) {
        console.error('❌ Health check error:', err);
        res.status(500).json({
            status: 'error',
            error: err.message,
            code: err.code
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDatabase().then(() => {
    app.listen(PORT, () => console.log(`✅ Сервер запущен: http://localhost:${PORT}`));
}).catch((err) => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
});
