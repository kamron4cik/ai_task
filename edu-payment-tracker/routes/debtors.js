const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /debtors?month=YYYY-MM
router.get('/', (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month param required in format YYYY-MM' });
  }

  const monthPrefix = `${month}-%`;

  // Sum payments per student for the given month
  const rows = db.prepare(`
    SELECT
      s.id,
      s.name,
      s.phone,
      s.group_name,
      s.monthly_amount,
      COALESCE(SUM(p.amount), 0) AS paid
    FROM students s
    LEFT JOIN payments p
      ON p.student_id = s.id
      AND p.date LIKE ?
    GROUP BY s.id
    HAVING paid < s.monthly_amount
    ORDER BY (s.monthly_amount - paid) DESC
  `).all(monthPrefix);

  const debtors = rows.map(r => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    group_name: r.group_name,
    monthly_amount: r.monthly_amount,
    paid: r.paid,
    debt: parseFloat((r.monthly_amount - r.paid).toFixed(2))
  }));

  res.json(debtors);
});

module.exports = router;
