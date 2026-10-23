const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /students — list all
router.get('/', (req, res) => {
  const students = db.prepare('SELECT * FROM students ORDER BY name').all();
  res.json(students);
});

// POST /students — create
router.post('/', (req, res) => {
  const { name, phone, group_name, monthly_amount } = req.body;
  if (!name || !phone || !group_name || monthly_amount == null) {
    return res.status(400).json({ error: 'name, phone, group_name and monthly_amount are required' });
  }
  const stmt = db.prepare(
    'INSERT INTO students (name, phone, group_name, monthly_amount) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name, phone, group_name, Number(monthly_amount));
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(student);
});

// PUT /students/:id — update
router.put('/:id', (req, res) => {
  const { name, phone, group_name, monthly_amount } = req.body;
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Student not found' });

  db.prepare(
    'UPDATE students SET name=?, phone=?, group_name=?, monthly_amount=? WHERE id=?'
  ).run(
    name ?? existing.name,
    phone ?? existing.phone,
    group_name ?? existing.group_name,
    monthly_amount != null ? Number(monthly_amount) : existing.monthly_amount,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /students/:id — delete
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Student not found' });
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ message: 'Student deleted' });
});

module.exports = router;
