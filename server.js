const express = require('express');
const cors = require('cors');
const initSQL = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.db');

app.use(cors());
app.use(express.json());

let db;

// Инициализация базы данных
async function initDatabase() {
    const SQL = await initSQL();
    
    if (fs.existsSync(DB_FILE)) {
        const buffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS excursions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            price INTEGER NOT NULL,
            deadline TEXT NOT NULL,
            max_people TEXT DEFAULT '0'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            excursion_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'text',
            options TEXT DEFAULT '[]',
            FOREIGN KEY (excursion_id) REFERENCES excursions(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            excursion_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            answers TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY (excursion_id) REFERENCES excursions(id)
        )
    `);

    saveDatabase();
    console.log('База данных готова');
}

function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
}

// === API ===

// Получить все экскурсии
app.get('/api/excursions', (req, res) => {
    const excursions = db.exec('SELECT * FROM excursions ORDER BY date ASC');
    const result = excursions.length > 0 ? excursions[0].values.map(row => ({
        id: row[0], name: row[1], description: row[2], date: row[3],
        time: row[4], price: row[5], deadline: row[6], maxPeople: row[7]
    })) : [];
    
    // Добавляем вопросы к каждой экскурсии
    const fullResult = result.map(exc => {
        const questions = db.exec('SELECT * FROM questions WHERE excursion_id = ?', [exc.id]);
        exc.questions = questions.length > 0 ? questions[0].values.map(q => ({
            id: q[0], text: q[2], type: q[3], options: JSON.parse(q[4] || '[]')
        })) : [];
        return exc;
    });
    
    res.json(fullResult);
});

// Создать экскурсию
app.post('/api/excursions', (req, res) => {
    const { name, description, date, time, price, deadline, maxPeople, questions } = req.body;
    
    db.run(
        'INSERT INTO excursions (name, description, date, time, price, deadline, max_people) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, description || '', date, time, price, deadline, maxPeople || '0']
    );
    
    const excursionId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    
    if (questions && questions.length > 0) {
        questions.forEach(q => {
            db.run(
                'INSERT INTO questions (excursion_id, text, type, options) VALUES (?, ?, ?, ?)',
                [excursionId, q.text, q.type, JSON.stringify(q.options || [])]
            );
        });
    }
    
    saveDatabase();
    res.json({ success: true, id: excursionId });
});

// Отправить заявку
app.post('/api/bookings', (req, res) => {
    const { excursionId, userName, answers } = req.body;
    
    db.run(
        'INSERT INTO bookings (excursion_id, user_name, answers, created_at) VALUES (?, ?, ?, ?)',
        [excursionId, userName, JSON.stringify(answers || []), new Date().toISOString()]
    );
    
    saveDatabase();
    res.json({ success: true });
});

// Получить заявки по экскурсии (админ)
app.get('/api/bookings/:excursionId', (req, res) => {
    const { excursionId } = req.params;
    const bookings = db.exec('SELECT * FROM bookings WHERE excursion_id = ? ORDER BY created_at DESC', [excursionId]);
    const result = bookings.length > 0 ? bookings[0].values.map(row => ({
        id: row[0], excursionId: row[1], userName: row[2],
        answers: JSON.parse(row[3] || '[]'), createdAt: row[4]
    })) : [];
    res.json(result);
});

// Отменить заявку
app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM bookings WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
});

// Проверка админа
app.post('/api/admin/check', (req, res) => {
    const ADMIN_ID = 123456789; // Замени на ID тёти
    const { userId } = req.body;
    res.json({ admin: userId === ADMIN_ID });
});

// Запуск
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
});