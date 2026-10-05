const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const db = new sqlite3.Database('./poker.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        chips INTEGER DEFAULT 10000
    )`);
});

const JWT_SECRET = 'your-secret-key-here-dev';

// Auth Routes
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
        if (err) return res.status(400).json({ error: 'Username taken' });
        res.json({ success: true });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.json({ token, chips: user.chips, username: user.username });
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
