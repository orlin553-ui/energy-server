const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;
const db = new Database('energy.db');

app.use(cors());
app.use(express.json());

function addColumnIfNotExists(tableName, columnName, columnSql) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`).run();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS garages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL,
    fullName TEXT NOT NULL,
    phone TEXT NOT NULL,
    meterNumber TEXT,
    registrationDate TEXT
  );

  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    garageId INTEGER NOT NULL,
    garageNumber TEXT NOT NULL,
    fullName TEXT NOT NULL,
    month TEXT NOT NULL,
    previousReading REAL NOT NULL,
    currentReading REAL NOT NULL,
    tariff REAL NOT NULL,
    serviceFee REAL NOT NULL,
    kwh REAL NOT NULL,
    energyAmount REAL NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    garageId INTEGER NOT NULL,
    garageNumber TEXT NOT NULL,
    fullName TEXT NOT NULL,
    month TEXT NOT NULL,
    amount REAL NOT NULL,
    comment TEXT,
    date TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT UNIQUE NOT NULL,
    tariff REAL NOT NULL,
    serviceFee REAL NOT NULL
  );
`);

addColumnIfNotExists('garages', 'meterNumber', 'meterNumber TEXT');
addColumnIfNotExists('garages', 'registrationDate', 'registrationDate TEXT');

app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  if (login === 'admin' && password === '1234') return res.json({ success: true });
  return res.status(401).json({ message: 'Неверный логин или пароль' });
});

app.get('/api/garages', (req, res) => {
  res.json(db.prepare('SELECT * FROM garages ORDER BY id DESC').all());
});

app.post('/api/garages', (req, res) => {
  const { number, fullName, phone, meterNumber, registrationDate } = req.body;
  if (!number || !fullName || !phone) return res.status(400).json({ message: 'Заполните номер гаража, ФИО и телефон' });
  const result = db.prepare(`
    INSERT INTO garages (number, fullName, phone, meterNumber, registrationDate)
    VALUES (?, ?, ?, ?, ?)
  `).run(number, fullName, phone, meterNumber || '', registrationDate || '');
  res.json(db.prepare('SELECT * FROM garages WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/garages/:id', (req, res) => {
  const { id } = req.params;
  const { number, fullName, phone, meterNumber, registrationDate } = req.body;
  db.prepare(`
    UPDATE garages
    SET number = ?, fullName = ?, phone = ?, meterNumber = ?, registrationDate = ?
    WHERE id = ?
  `).run(number, fullName, phone, meterNumber || '', registrationDate || '', id);
  res.json(db.prepare('SELECT * FROM garages WHERE id = ?').get(id));
});

app.delete('/api/garages/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM readings WHERE garageId = ?').run(id);
  db.prepare('DELETE FROM payments WHERE garageId = ?').run(id);
  db.prepare('DELETE FROM garages WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/readings', (req, res) => {
  res.json(db.prepare('SELECT * FROM readings ORDER BY createdAt DESC').all());
});

app.post('/api/readings', (req, res) => {
  const item = req.body;
  const result = db.prepare(`
    INSERT INTO readings (
      garageId, garageNumber, fullName, month,
      previousReading, currentReading, tariff, serviceFee,
      kwh, energyAmount, amount, date, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.garageId, item.garageNumber, item.fullName, item.month,
    item.previousReading, item.currentReading, item.tariff, item.serviceFee,
    item.kwh, item.energyAmount, item.amount,
    new Date().toLocaleDateString('ru-RU'), Date.now()
  );
  res.json(db.prepare('SELECT * FROM readings WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/readings/:id', (req, res) => {
  const { id } = req.params;
  const item = req.body;
  db.prepare(`
    UPDATE readings SET
      garageId = ?, garageNumber = ?, fullName = ?, month = ?,
      previousReading = ?, currentReading = ?, tariff = ?, serviceFee = ?,
      kwh = ?, energyAmount = ?, amount = ?
    WHERE id = ?
  `).run(
    item.garageId, item.garageNumber, item.fullName, item.month,
    item.previousReading, item.currentReading, item.tariff, item.serviceFee,
    item.kwh, item.energyAmount, item.amount, id
  );
  res.json(db.prepare('SELECT * FROM readings WHERE id = ?').get(id));
});

app.delete('/api/readings/:id', (req, res) => {
  db.prepare('DELETE FROM readings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/payments', (req, res) => {
  res.json(db.prepare('SELECT * FROM payments ORDER BY createdAt DESC').all());
});

app.post('/api/payments', (req, res) => {
  const item = req.body;
  const result = db.prepare(`
    INSERT INTO payments (garageId, garageNumber, fullName, month, amount, comment, date, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.garageId, item.garageNumber, item.fullName, item.month, item.amount, item.comment || '', new Date().toLocaleDateString('ru-RU'), Date.now());
  res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/payments/:id', (req, res) => {
  const { id } = req.params;
  const item = req.body;
  db.prepare(`
    UPDATE payments SET garageId = ?, garageNumber = ?, fullName = ?, month = ?, amount = ?, comment = ?
    WHERE id = ?
  `).run(item.garageId, item.garageNumber, item.fullName, item.month, item.amount, item.comment || '', id);
  res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(id));
});

app.delete('/api/payments/:id', (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/tariffs', (req, res) => {
  res.json(db.prepare('SELECT * FROM tariffs').all());
});

app.put('/api/tariffs', (req, res) => {
  const { month, tariff, serviceFee } = req.body;
  if (!month) return res.status(400).json({ message: 'Не указан месяц тарифа' });
  db.prepare(`
    INSERT INTO tariffs (month, tariff, serviceFee)
    VALUES (?, ?, ?)
    ON CONFLICT(month) DO UPDATE SET tariff = excluded.tariff, serviceFee = excluded.serviceFee
  `).run(month, Number(tariff), Number(serviceFee));
  res.json(db.prepare('SELECT * FROM tariffs WHERE month = ?').get(month));
});

app.delete('/api/tariffs/:month', (req, res) => {
  db.prepare('DELETE FROM tariffs WHERE month = ?').run(decodeURIComponent(req.params.month));
  res.json({ success: true });
});

app.delete('/api/all-data', (req, res) => {
  db.prepare('DELETE FROM payments').run();
  db.prepare('DELETE FROM readings').run();
  db.prepare('DELETE FROM garages').run();
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started: http://localhost:${PORT}`);
  console.log(`For phone use your PC IP, for example: http://192.168.1.195:${PORT}`);
});
