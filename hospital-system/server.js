const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(express.static('public'));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ward TEXT,
    bed TEXT,
    disease TEXT,
    nurse TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    respiration_rate INTEGER,
    pulse_rate INTEGER,
    status TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  )`);
}

// Authentication
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Patients API
app.get('/patients', (req, res) => {
  db.all('SELECT * FROM patients ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/patients/:id', (req, res) => {
  db.get('SELECT * FROM patients WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || {});
  });
});

app.post('/patients', (req, res) => {
  const { name, ward, bed, disease, nurse } = req.body;
  db.run(
    'INSERT INTO patients (name, ward, bed, disease, nurse) VALUES (?, ?, ?, ?, ?)',
    [name, ward, bed, disease, nurse],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/patients/:id', (req, res) => {
  const { name, ward, bed, disease, nurse } = req.body;
  db.run(
    'UPDATE patients SET name = ?, ward = ?, bed = ?, disease = ?, nurse = ? WHERE id = ?',
    [name, ward, bed, disease, nurse, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/patients/:id', (req, res) => {
  db.run('DELETE FROM patients WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// Vitals API
app.get('/vitals', (req, res) => {
  const query = req.query.patientId 
    ? 'SELECT * FROM vitals WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 10'
    : 'SELECT * FROM vitals ORDER BY timestamp DESC LIMIT 10';
  
  const params = req.query.patientId ? [req.query.patientId] : [];

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/vitals', (req, res) => {
  const { patient_id, respiration_rate, pulse_rate } = req.body;
  let status = 'normal';
  
  // Check for abnormal vitals
  if (respiration_rate < 10 || respiration_rate > 30 || 
      pulse_rate < 50 || pulse_rate > 120) {
    status = 'critical';
  }

  db.run(
    'INSERT INTO vitals (patient_id, respiration_rate, pulse_rate, status) VALUES (?, ?, ?, ?)',
    [patient_id, respiration_rate, pulse_rate, status],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, status });
    }
  );
});

// Get critical vitals
app.get('/vitals/critical', (req, res) => {
  db.all('SELECT * FROM vitals WHERE status = "critical" ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});