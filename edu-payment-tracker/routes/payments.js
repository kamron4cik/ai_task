const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /payments — add a payment
router.post('/', (req, res) => {
  const { student_id, amount, date } = req.body;
  if (!student_id || amount == null || !date) {
    return res.status(400).json({ error: 'student_id, amount and date are required' });
  }
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const result = db.prepare(
    'INSERT INTO payments (student_id, amount, date) VALUES (?, ?, ?)'
  ).run(student_id, Number(amount), date);

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(payment);
});

// GET /payments?student_id=X — list payments for a student
router.get('/', (req, res) => {
  const { student_id } = req.query;
  if (!student_id) {
    return res.status(400).json({ error: 'student_id query param is required' });
  }
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const payments = db.prepare(
    'SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC'
  ).all(student_id);
  res.json(payments);
});

module.exports = router;
